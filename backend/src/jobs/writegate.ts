// Write gate (plan 14 §C). The root cause of "database is locked" (plan 12) is
// two processes writing the memory at once — typically the daemon's idle scheduler
// AND a CLI `memory embed`/`scan`. This is the daemon-side coordination flag:
// a CLI announces "I'm about to write" and the scheduler yields until it's done.
//
// It is a lightweight ADVISORY hold, not a distributed lock: bounded by an
// auto-expiry so a crashed CLI can never wedge the scheduler forever, and the
// engine's own retry-with-backoff stays as the last line of defence.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDb, currentMemoryDir } from "../memory/db.js";

const HOLD_MS = 5 * 60_000; // a CLI hold self-expires after 5 min

let holdUntil = 0;
/**
 * KHO mà CLI vừa báo là nó sắp ghi (nếu CLI có nói). Thêm 2026-08-21 sau khi đo được bản vá
 * "khoá mang danh tính kho" chỉ ăn MỘT NỬA: khoá FILE đã khai kho, nhưng cờ này thì không, nên
 * `backupTick` vẫn nhường **24 lượt liên tiếp** cho một job đang ghi kho KHÁC (log đã phơi ra —
 * và đó đúng là công dụng của việc thôi im lặng). `undefined` = CLI đời cũ không nói ⇒ coi như
 * xung đột với mọi kho (an toàn).
 */
let holdDb: string | undefined;

/** Called by the daemon when a CLI announces a write. `db` = kho nó sắp ghi, nếu biết. */
export function acquireCliWrite(db?: string): void {
  holdUntil = Date.now() + HOLD_MS;
  holdDb = db;
}

/** Called by the daemon when the CLI finishes (or gives up). */
export function releaseCliWrite(): void {
  holdUntil = 0;
  holdDb = undefined;
}

/**
 * True while a CLI holds the write gate. Nhìn CẢ HAI nguồn: cờ trong bộ nhớ daemon (CLI báo
 * qua HTTP) VÀ khoá file (CLI nào cũng đặt được, kể cả khi daemon chết).
 */
export function cliHoldsWrite(): boolean {
  return Date.now() < holdUntil || cliWriteHolder() !== null;
}

// ── Khoá ghi XUYÊN TIẾN TRÌNH ────────────────────────────────────────────────
// Vì sao phải viết lại (soi code sau sự cố hỏng DB 2026-08-03): `acquireCliWrite` ở trên
// **KHÔNG BAO GIỜ TỪ CHỐI** — nó chỉ đặt một mốc thời gian, nên hai CLI cùng gọi thì cả hai
// đều nhận `{ok:true}`. Cổng cũ là MỘT CHIỀU: nó bảo *scheduler của daemon* nhường, chứ không
// hề loại trừ CLI↔CLI. Tệ hơn, CLI hỏi cổng qua HTTP nên **daemon chết ⇒ không có cổng nào**.
// Đúng ngày hỏng: daemon khởi động 8 lần gần như không lần nào tắt sạch, hook chạy `scan` mỗi
// lượt trả lời, và có `memory embed` gõ tay — nhiều tiến trình ghi, không ai chặn ai.
//
// Nên khoá phải nằm ở FILE, không ở bộ nhớ daemon: mọi tiến trình đều thấy, và nó sống sót
// qua việc daemon chết. Vẫn là khoá CỐ VẤN có hạn (điều 9: không được kẹt vĩnh viễn) —
// pid chết hoặc quá hạn thì bị chiếm lại.

const CLI_LOCK_STALE_MS = 15 * 60_000; // giữ quá lâu ⇒ coi như tiến trình đã chết mà chưa dọn

interface CliLock {
  pid: number;
  label: string;
  at: number;
  /**
   * KHO mà tiến trình này đang ghi (đường tuyệt đối). Thêm 2026-08-21 sau khi audit đo được:
   * khoá là MỘT file cho cả thư mục `data/`, nên một job ghi kho SONG SONG
   * (`global_memory.bgem3.db`, plan 19) làm mọi việc ghi của kho THẬT phải nhường — kể cả
   * `backupTick`, thứ chỉ ĐỌC kho thật. Hậu quả đo được: 27,0 giờ không có bản sao lưu,
   * 1.946 tin nằm đúng một bản, và không một dòng log nào.
   * Khoá đời cũ KHÔNG có trường này ⇒ đọc là "không biết kho nào" và bị coi là XUNG ĐỘT
   * (thà chờ hơn là chép trong lúc ai đó ghi) — tự lành ngay khi tiến trình ghi kế tiếp
   * chạy mã mới.
   */
  db?: string;
}

function cliLockPath(): string {
  return join(currentMemoryDir(), "cli-write.lock");
}

/** So hai đường kho — Windows không phân biệt hoa/thường, và `/` lẫn `\` cùng chỉ một chỗ. */
function sameStore(a: string, b: string): boolean {
  const norm = (p: string): string => p.replace(/\\/g, "/").toLowerCase();
  return norm(a) === norm(b);
}

/** Tiến trình còn sống không. Không có quyền hỏi ⇒ coi là CÒN (thà chờ hơn là ghi đè). */
function pidAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Ai đang giữ khoá, hay null. Khoá của pid đã chết / quá hạn KHÔNG tính. */
export function cliWriteHolder(): CliLock | null {
  try {
    const l = JSON.parse(readFileSync(cliLockPath(), "utf8")) as CliLock;
    if (!Number.isFinite(l?.pid) || !Number.isFinite(l?.at)) return null;
    if (Date.now() - l.at > CLI_LOCK_STALE_MS) return null; // quá hạn
    if (!pidAlive(l.pid)) return null; // chủ khoá đã chết
    return l;
  } catch {
    return null; // không có file = rảnh
  }
}

/**
 * Có kẻ nào đang ghi ĐÚNG kho này không (thay cho `cliHoldsWrite()` khi người gọi chỉ quan tâm
 * MỘT kho — vd `backupTick` chép `global_memory.db`).
 *
 * Ba nhánh, và nhánh giữa mới là lý do hàm này tồn tại:
 *  · chủ khoá ghi **cùng** kho ⇒ XUNG ĐỘT (nhường, như cũ);
 *  · chủ khoá ghi kho **KHÁC** ⇒ **KHÔNG xung đột** — trước đây vẫn bị coi là xung đột và đó
 *    chính là đường bỏ đói backup 44 giờ của đợt plan 19;
 *  · khoá đời cũ không khai kho ⇒ coi là xung đột (an toàn, tự lành khi mã mới chạy).
 *
 * THỨ TỰ XÉT có chủ đích: khoá FILE trước, cờ trong bộ nhớ (`holdUntil`) sau. Lý do đo được
 * 2026-08-22: bản vá đầu chỉ dạy khoá FILE khai kho, còn cờ bộ nhớ thì không — mà `holdUntil`
 * lại được xét TRƯỚC, nên nó phủ quyết ngược và backup vẫn nhường **24 lượt liên tiếp** cho job
 * ghi kho KHÁC. Nay cờ cũng mang `holdDb` (CLI khai qua `/gate-acquire?db=`), và khoá file —
 * nguồn có danh tính chắc nhất — được quyền quyết trước.
 */
export function cliHoldsWriteOn(dbPath: string): boolean {
  // Khoá FILE xét TRƯỚC vì nó là nguồn có danh tính chắc chắn nhất (chủ khoá tự ghi đường kho
  // của chính nó). Có khoá thì nó QUYẾT — không để cờ trong bộ nhớ (thô hơn) phủ quyết ngược.
  const held = cliWriteHolder();
  if (held) return held.db ? sameStore(held.db, dbPath) : true;
  if (Date.now() < holdUntil) return holdDb ? sameStore(holdDb, dbPath) : true;
  return false;
}

export interface CliLockResult {
  ok: boolean;
  /** Khi `ok:false` — ai đang giữ, để người gọi in ra và chờ thay vì đâm vào. */
  heldBy?: CliLock;
}

/**
 * Giành quyền ghi. TỪ CHỐI khi tiến trình KHÁC đang giữ — đây là khác biệt cốt lõi so với
 * `acquireCliWrite` cũ. Gọi lại khi CHÍNH MÌNH đang giữ thì chỉ gia hạn (dùng cho heartbeat
 * của job dài nhiều giờ).
 */
export function acquireCliWriteLock(label: string): CliLockResult {
  const held = cliWriteHolder();
  if (held && held.pid !== process.pid) return { ok: false, heldBy: held };
  try {
    const p = cliLockPath();
    mkdirSync(dirname(p), { recursive: true });
    // Đóng dấu KHO đang ghi: `currentMemoryDb()` đã tính cả `GLOBAL_MEMORY_DB`, nên job trỏ
    // kho song song tự khai đúng kho song song.
    writeFileSync(
      p,
      JSON.stringify({ pid: process.pid, label, at: Date.now(), db: currentMemoryDb() } satisfies CliLock),
    );
    return { ok: true };
  } catch {
    return { ok: true }; // điều 9: không đặt được khoá thì CHẠY, đừng chặn việc của người dùng
  }
}

/** Nhả khoá — CHỈ khi mình là chủ. Không bao giờ giật khoá của tiến trình khác. */
export function releaseCliWriteLock(): void {
  try {
    const l = JSON.parse(readFileSync(cliLockPath(), "utf8")) as CliLock;
    if (l?.pid !== process.pid) return;
    rmSync(cliLockPath(), { force: true });
  } catch {
    /* không có khoá để nhả */
  }
}

// ── Daemon-side job token ────────────────────────────────────────────────────
// The daemon itself runs heavy children (scheduler embed pass, sync job). They
// must not overlap each other, and a CLI should know one is running: the gate
// was one-directional before — a CLI acquire told the scheduler to yield, but
// nothing told the CLI a daemon child was ALREADY writing (audit 2026-07-21).

let daemonJob: string | null = null;

// Cờ XUYÊN TIẾN TRÌNH cho cùng một sự thật. Biến `daemonJob` ở trên chỉ sống trong tiến
// trình daemon, nhưng hook realtime chạy như một tiến trình RIÊNG, ngắn hạn — nó phải biết
// "daemon đang ghi" để bỏ qua ngay thay vì xếp hàng sau một chuỗi embed dài (đo 2026-08-02:
// chờ = ~125s mỗi lượt trả lời). Dùng file thay vì hỏi HTTP: một lần `statSync` là sub-ms,
// còn một vòng fetch cộng vào MỌI lượt chat thì không đáng.
const JOB_STALE_MS = 6 * 60 * 60_000; // daemon chết giữa chừng ⇒ marker cũ không được kẹt vĩnh viễn

function jobMarkerPath(): string {
  return join(currentMemoryDir(), "daemon-job.lock");
}

/** Claim the single daemon-job slot. Returns false when something already runs. */
export function claimDaemonJob(label: string): boolean {
  if (daemonJob) return false;
  daemonJob = label;
  try {
    const p = jobMarkerPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ label, at: Date.now(), pid: process.pid }));
  } catch {
    /* marker là lớp tiện ích: mất nó thì hook chỉ mất tối ưu, không sai kết quả (điều 9) */
  }
  return true;
}

export function releaseDaemonJob(): void {
  daemonJob = null;
  try {
    rmSync(jobMarkerPath(), { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Daemon có đang chạy job nặng không — ĐỌC ĐƯỢC TỪ TIẾN TRÌNH KHÁC.
 * Marker quá hạn ⇒ coi như rảnh (daemon chết mà chưa kịp dọn).
 */
export function daemonJobBusyExternal(): boolean {
  try {
    const raw = readFileSync(jobMarkerPath(), "utf8");
    const at = Number(JSON.parse(raw)?.at ?? 0);
    return Number.isFinite(at) && Date.now() - at < JOB_STALE_MS;
  } catch {
    return false; // không có marker = rảnh
  }
}

/** What the daemon is running right now, or null. */
export function daemonJobBusy(): string | null {
  return daemonJob;
}
