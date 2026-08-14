// Phát hiện kho bộ nhớ đang nằm trong vùng một trình đồng bộ đám mây ĐỤNG TỚI.
//
// Vì sao cần một module riêng thay vì giữ mỗi `looksLikeCloudSync` (regex trên tên đường
// dẫn): kho THẬT đã hỏng HAI LẦN (2026-08-03 và 04-08) và cả hai lần regex đó đều IM,
// vì đường dẫn là `D:\huy.nguyen\...` — không chứa chữ "Drive"/"OneDrive" nào. Thứ cuốn
// nó đi là kênh **backup máy** của Google Drive (Computers), khai ở một chỗ hoàn toàn
// khác: `%LOCALAPPDATA%\Google\DriveFS\root_preference_sqlite.db`. Tên thư mục KHÔNG
// phải bằng chứng; thứ quyết định là phạm vi đồng bộ đã khai ở đâu đó (HP điều 14).
//
// Nguyên tắc: mỗi phép kiểm trả về BẰNG CHỨNG cụ thể (đọc được ở đâu, thấy gì) chứ không
// trả một chữ "unsafe" — người đọc phải kiểm lại được, và phép đo nào không chạy được thì
// nói là không chạy được, KHÔNG im lặng thành "sạch" (điều 9 fail-open, nhưng fail-open
// phải NÓI, vì "fail-open đúng thiết kế chính là lớp giấu lỗi giỏi nhất" — bài học 05/08).

import Database from "better-sqlite3";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

export interface CloudEvidence {
  /** Phép kiểm nào bắt được. */
  kind: "path-name" | "drivefs-root" | "onedrive-env" | "marker" | "hardlink";
  /** Câu người đọc kiểm lại được: thấy gì, ở đâu. */
  detail: string;
}

export interface CloudReport {
  dir: string;
  /** Có bằng chứng THẨM QUYỀN ⇒ kho đang ở vùng nguy hiểm cho SQLite WAL. */
  atRisk: boolean;
  /**
   * Bằng chứng THẨM QUYỀN — nói về phạm vi đồng bộ ĐANG hiệu lực: sổ root của DriveFS,
   * biến môi trường OneDrive, tên thư mục của chính client, liên kết cứng.
   */
  evidence: CloudEvidence[];
  /**
   * DẤU VẾT — rác client để lại. Sống DAI HƠN việc gỡ đồng bộ, nên KHÔNG tự nó kết tội.
   * Đo 2026-08-06: sau khi user gỡ `D:\huy.nguyen` khỏi backup máy, một thư mục rỗng
   * `.tmp.driveupload` vẫn nằm đó — bản đầu của phép kiểm này kêu ĐỎ vì nó, tức báo oan
   * ngay ca đầu tiên. Cảnh báo kêu nhầm thì lần sau không ai đọc, mà "không ai đọc" chính
   * là cách hai vụ hỏng kho lọt lưới. Dấu vết chỉ NÂNG thành bằng chứng khi nguồn thẩm
   * quyền không đọc được (lúc đó nó là thứ tốt nhất ta có).
   */
  residue: CloudEvidence[];
  /** Phép kiểm KHÔNG chạy được (thiếu file, đọc lỗi) — nói ra, không nuốt thành "sạch". */
  inconclusive: string[];
}

/** Heuristic cũ: tên thư mục tự khai. Giữ vì rẻ và vẫn bắt được ca hiển nhiên. */
export function looksLikeCloudSyncName(dir: string): boolean {
  return /(google drive|[\\/]my drive|onedrive|dropbox|icloud|creative cloud)/i.test(dir);
}

/** `child` nằm trong `parent` (hoặc chính nó)? So sau khi chuẩn hoá, không phân biệt hoa/thường
 *  (Windows), và chặn ca "C:\a" khớp nhầm "C:\ab" bằng cách ép ranh giới là dấu phân cách. */
export function isInside(child: string, parent: string): boolean {
  const c = resolve(child).toLowerCase();
  const p = resolve(parent).toLowerCase().replace(new RegExp(`\\${sep}+$`), "");
  return c === p || c.startsWith(p + sep);
}

/** Đường tới sổ khai root của Google DriveFS (Windows). Tách hàm để test trỏ chỗ khác. */
function driveFsPrefsPath(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local");
  return join(localAppData, "Google", "DriveFS", "root_preference_sqlite.db");
}

/**
 * Đọc các root mà Google Drive đang đồng bộ — GỒM CẢ kênh backup máy (Computers), là
 * kênh đã cuốn cả `global_memory.db` lẫn `share.key` lên mây dạng TRẦN hôm 05/08 mà không
 * lệnh nào của zemory nhìn thấy.
 *
 * Schema đo thật trên DriveFS ngày 2026-08-06 (KHÔNG đoán):
 *   roots(root_id, metadata, media_id, title, root_path, account_token, sync_type,
 *         destination, medium, state, one_shot, is_my_drive, doc_id, last_seen_absolute_path)
 * `last_seen_absolute_path` là đường tuyệt đối lần cuối nhìn thấy; `root_path` là bản
 * ghi gốc. Lấy CẢ HAI vì máy đổi ký tự ổ thì hai cột lệch nhau.
 */
export function driveFsRoots(prefsPath = driveFsPrefsPath()): { paths: string[]; error: string | null } {
  if (!existsSync(prefsPath)) return { paths: [], error: `not found: ${prefsPath}` };
  let db: Database.Database | null = null;
  try {
    // readonly + immutable KHÔNG dùng: DriveFS đang chạy thì file có WAL, immutable sẽ đọc
    // ra bản cũ. readonly thường là đủ và không cản trình đồng bộ.
    db = new Database(prefsPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare("SELECT root_path, last_seen_absolute_path, title FROM roots").all() as {
      root_path: string | null;
      last_seen_absolute_path: string | null;
      title: string | null;
    }[];
    const paths: string[] = [];
    for (const r of rows) {
      for (const p of [r.last_seen_absolute_path, r.root_path]) {
        if (p && p.trim() && /^[a-z]:[\\/]/i.test(p.trim())) paths.push(p.trim());
      }
    }
    return { paths: [...new Set(paths)], error: null };
  } catch (error) {
    return { paths: [], error: error instanceof Error ? error.message : "read failed" };
  } finally {
    db?.close();
  }
}

/** Marker do chính client đồng bộ rải ra, tìm ở thư mục kho VÀ mọi thư mục cha. */
const MARKERS = [".dropbox", ".dropbox.cache", ".dropbox.attr"];

function markerEvidence(dir: string): CloudEvidence[] {
  const out: CloudEvidence[] = [];
  let cur = resolve(dir);
  for (let hops = 0; hops < 12; hops++) {
    for (const m of MARKERS) {
      if (existsSync(join(cur, m))) out.push({ kind: "marker", detail: `${m} ở ${cur}` });
    }
    // Rác tải-lên dở dang của Drive: bằng chứng MẠNH vì nó chỉ sinh ra khi client thật sự
    // đang đẩy file trong đúng thư mục này.
    try {
      if (readdirSync(cur).some((f) => f.includes(".tmp.driveupload"))) {
        out.push({ kind: "marker", detail: `tệp *.tmp.driveupload trong ${cur}` });
      }
    } catch {
      /* không đọc được thư mục thì thôi, không phải bằng chứng */
    }
    const up = dirname(cur);
    if (up === cur) break;
    cur = up;
  }
  return out;
}

function oneDriveEvidence(dir: string): CloudEvidence[] {
  const out: CloudEvidence[] = [];
  for (const key of ["OneDrive", "OneDriveCommercial", "OneDriveConsumer"]) {
    const root = process.env[key]?.trim();
    if (root && isInside(dir, root)) out.push({ kind: "onedrive-env", detail: `%${key}% = ${root}` });
  }
  return out;
}

/**
 * Chấm một thư mục kho. `dbPath` (nếu truyền) được kiểm thêm số liên kết cứng: >1 nghĩa là
 * file còn tên thứ hai ở chỗ khác — một số client đồng bộ dựng bản sao kiểu đó, và với
 * SQLite thì đây là dấu hiệu có kẻ khác đang cầm cùng khối dữ liệu.
 */
export function cloudSyncReport(
  dir: string,
  opts: { dbPath?: string; prefsPath?: string } = {},
): CloudReport {
  const evidence: CloudEvidence[] = [];
  const inconclusive: string[] = [];

  if (looksLikeCloudSyncName(dir)) {
    evidence.push({ kind: "path-name", detail: `tên thư mục tự khai: ${dir}` });
  }

  const roots = driveFsRoots(opts.prefsPath);
  if (roots.error) {
    inconclusive.push(`Google DriveFS: ${roots.error}`);
  } else {
    for (const r of roots.paths) {
      if (isInside(dir, r)) {
        evidence.push({
          kind: "drivefs-root",
          detail: `Google Drive đang đồng bộ "${r}" — kho nằm BÊN TRONG (gồm cả kênh backup máy)`,
        });
      }
    }
  }

  evidence.push(...oneDriveEvidence(dir));

  if (opts.dbPath) {
    try {
      const n = statSync(opts.dbPath).nlink;
      if (n > 1) evidence.push({ kind: "hardlink", detail: `${opts.dbPath} có ${n} liên kết cứng (bình thường là 1)` });
    } catch {
      inconclusive.push(`không đọc được số liên kết cứng của ${opts.dbPath}`);
    }
  }

  // Dấu vết: chỉ có sức nặng khi nguồn thẩm quyền câm. Sổ root đọc được và nói "không
  // đồng bộ thư mục này" thì rác cũ KHÔNG lật ngược được kết luận đó.
  const residue = markerEvidence(dir);
  const authoritativeBlind = inconclusive.length > 0;
  if (authoritativeBlind) evidence.push(...residue);

  return { dir, atRisk: evidence.length > 0, evidence, residue, inconclusive };
}

/**
 * Bản in cho CLI/UI. Rỗng khi vừa sạch vừa không còn gì đáng nói.
 *
 * ⚠ CHƯA ĐƯỢC NỐI VÀO ĐÂU (đo 2026-08-15: 0 lời gọi trong toàn repo). Giữ `export` CÓ CHỦ ĐÍCH —
 * đây KHÔNG phải rác: nó là bản in của lưới đỡ cho sự cố ĐÃ XẢY RA THẬT (04/08, Google Drive
 * cuốn cả `global_memory.db` lên mây, HP điều 11/14). Thứ còn thiếu là chỗ GỌI nó, không phải
 * bản thân nó. Xoá đi là vứt hiểu biết rồi ngày nào đó viết lại từ đầu — xem `05_TODO`.
 */
export function formatCloudReport(r: CloudReport): string {
  const lines: string[] = [];
  if (r.atRisk) {
    lines.push(`⚠ Kho bộ nhớ đang nằm trong vùng đồng bộ đám mây — SQLite WAL ở đó SẼ hỏng (HP điều 11/14).`);
    lines.push(...r.evidence.map((e) => `    · [${e.kind}] ${e.detail}`));
    lines.push(`    → Gỡ thư mục này khỏi phạm vi đồng bộ/backup, hoặc \`zemory memory relocate <thư mục khác>\`.`);
    lines.push(`      Đồng bộ xuyên máy đi bằng bundle mã hoá (\`memory sync\`), KHÔNG bằng cách để cả kho trên mây.`);
  }
  if (r.inconclusive.length) {
    lines.push(`ℹ Chưa kiểm hết: ${r.inconclusive.join(" · ")}`);
  }
  if (!r.atRisk && r.residue.length) {
    // Nói ra chứ không nuốt: rác cũ không phải nguy hiểm, nhưng người dùng nên biết nó còn đó.
    lines.push(`ℹ Còn dấu vết đồng bộ CŨ (không phải nguy hiểm — sổ root nói thư mục này không được đồng bộ):`);
    lines.push(...r.residue.map((e) => `    · ${e.detail}`));
  }
  return lines.join("\n");
}
