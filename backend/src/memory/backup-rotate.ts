// Sao lưu ĐỊNH KỲ + tự dọn bản cũ.
//
// Vì sao tồn tại (sự cố thật 2026-08-03): DB 1 GB hỏng giữa ngày làm việc; bản sao lưu gần
// nhất đã **cũ 8 ngày** vì `memory backup` là lệnh chạy TAY và không ai nhớ gõ. Cứu được
// 99,93% rồi quét lại về đủ, nhưng đó là may — lần sau vùng hỏng có thể rơi đúng bảng nguồn.
// Khoảng hở phải do máy giữ, không do người nhớ.
//
// Ba luật, cố ý đơn giản để không bao giờ là thứ làm hỏng thêm:
//   ① MỘT bản/ngày là đủ — file 1,1 GB, chép mỗi 30 phút là vô nghĩa và mòn ổ.
//   ② Chép bằng API backup của SQLite (`db.backup()`) chứ không `copyFile`: nó chụp NHẤT QUÁN
//      trong khi vẫn có tiến trình khác đọc/ghi. Chép byte một file đang mở WAL cho ra bản
//      RÁCH — đúng cái bẫy làm nhiều người tưởng mình có backup mà không có.
//   ③ Giữ N bản mới nhất rồi xoá dần. Xoá là hành vi PHÁ HUỶ nên chỉ đụng đúng file khớp
//      khuôn tên do chính lệnh backup sinh ra, không bao giờ quét bừa cả thư mục.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDb } from "./db.js";
import { backupMemory } from "./privacy.js";

/** Khuôn tên do `memory backup` sinh: `global_memory-<ISO>.db`. Chỉ file khớp mới bị dọn. */
const BACKUP_RE = /^global_memory-[\dTZ:.-]+\.db$/;

const DAY_MS = 24 * 60 * 60_000;

export interface BackupPolicy {
  /** Cách nhau tối thiểu bao lâu mới chép bản mới. */
  everyMs: number;
  /** Giữ lại mấy bản mới nhất. */
  keep: number;
}

export const DEFAULT_BACKUP_POLICY: BackupPolicy = { everyMs: DAY_MS, keep: 5 };

export function backupDir(dbPath: string = currentMemoryDb()): string {
  return join(dbPath.replace(/[/\\][^/\\]+$/, ""), "backups");
}

interface Existing {
  path: string;
  mtimeMs: number;
}

/** Các bản sao lưu hiện có, MỚI trước. Thư mục chưa có ⇒ mảng rỗng, không ném lỗi. */
export function listBackups(dir: string): Existing[] {
  if (!existsSync(dir)) return [];
  const out: Existing[] = [];
  for (const name of readdirSync(dir)) {
    if (!BACKUP_RE.test(name)) continue; // file lạ trong thư mục ⇒ KHÔNG đụng tới
    const p = join(dir, name);
    try {
      out.push({ path: p, mtimeMs: statSync(p).mtimeMs });
    } catch {
      /* biến mất giữa chừng — bỏ qua */
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/**
 * Tuổi bản sao lưu MỚI NHẤT của một kho (ms), `null` = chưa có bản nào.
 * Tách ra thành hàm THUẦN vì hai bề mặt phải nói CÙNG một số: scheduler (để in lúc nhường) và
 * `doctor` (để báo đỏ). Trước 2026-08-21 không bề mặt nào biết con số này, nên 27 giờ không có
 * bản sao lưu vẫn hiện ra là "✓".
 */
export function backupAgeMs(dbPath: string = currentMemoryDb(), now: number = Date.now()): number | null {
  const list = listBackups(backupDir(dbPath));
  return list.length ? now - list[0].mtimeMs : null;
}

/** Hệ số "quá hạn": qua 2 chu kỳ mà chưa có bản mới ⇒ không còn là chậm nhịp, là HỎNG. */
export const BACKUP_STALE_FACTOR = 2;

export interface BackupStaleness {
  stale: boolean;
  ageMs: number | null;
  /** Ngưỡng đã dùng để phán (ms) — in ra để người đọc khỏi phải đoán. */
  limitMs: number;
  newest?: string;
}

/** Kho này có đang thiếu bản sao lưu quá lâu không (fail-open: đọc lỗi ⇒ coi như KHÔNG quá hạn). */
export function backupStale(
  dbPath: string = currentMemoryDb(),
  opts: { policy?: Partial<BackupPolicy>; now?: number } = {},
): BackupStaleness {
  const policy = { ...DEFAULT_BACKUP_POLICY, ...opts.policy };
  const limitMs = policy.everyMs * BACKUP_STALE_FACTOR;
  try {
    const list = listBackups(backupDir(dbPath));
    const ageMs = list.length ? (opts.now ?? Date.now()) - list[0].mtimeMs : null;
    // CHƯA có bản nào cũng là quá hạn — kho đang chạy mà không có lưới đỡ nào là tin đáng báo.
    return { stale: ageMs === null || ageMs > limitMs, ageMs, limitMs, newest: list[0]?.path };
  } catch {
    return { stale: false, ageMs: null, limitMs };
  }
}

export interface RotateResult {
  /** Có chép bản mới lần này không (false = chưa tới hạn). */
  wrote: boolean;
  outPath?: string;
  bytes?: number;
  /** Các bản cũ đã xoá vì vượt `keep`. */
  pruned: string[];
  /** Tuổi bản mới nhất TRƯỚC lượt này, tính bằng ms (null = chưa có bản nào). */
  ageMs: number | null;
}

/**
 * Chép một bản nếu bản mới nhất đã quá `everyMs`, rồi dọn cho còn `keep` bản.
 * Chưa tới hạn thì trả về `wrote: false` — rẻ, gọi mỗi vòng scheduler được.
 */
export async function rotateBackup(
  opts: { dbPath?: string; policy?: Partial<BackupPolicy>; now?: number } = {},
): Promise<RotateResult> {
  const dbPath = opts.dbPath ?? currentMemoryDb();
  const policy = { ...DEFAULT_BACKUP_POLICY, ...opts.policy };
  const now = opts.now ?? Date.now();
  const dir = backupDir(dbPath);
  const before = listBackups(dir);
  const ageMs = before.length ? now - before[0].mtimeMs : null;

  if (ageMs !== null && ageMs < policy.everyMs) return { wrote: false, pruned: [], ageMs };

  mkdirSync(dir, { recursive: true });
  const r = await backupMemory({ dbPath });

  // Dọn SAU khi bản mới đã ghi xong — không bao giờ có lúc tay trắng.
  const pruned: string[] = [];
  for (const old of listBackups(dir).slice(Math.max(1, policy.keep))) {
    try {
      rmSync(old.path, { force: true });
      pruned.push(old.path);
    } catch {
      /* đang bị giữ ⇒ để lượt sau; giữ thừa một bản không hại ai */
    }
  }
  return { wrote: true, outPath: r.outPath, bytes: r.bytes, pruned, ageMs };
}
