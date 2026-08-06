// Persistent global settings (~/.zemory/config.json) — small toggles the UI can
// flip and that every fresh CLI process reads. Local-only JSON; fail-open to
// defaults if missing/corrupt. The env var still wins as an explicit override.

import { mkdirSync, readFileSync } from "node:fs";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import { dirname, join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

// Resolved per call (not a module const) so a `memory relocate` mid-process makes
// every subsequent read/write hit the config.json that moved with the data dir.
function configPath(): string {
  return join(currentMemoryDir(), "config.json");
}

/** A provenance lane selector. Fields left undefined act as wildcards, so
 *  `{origin:'web'}` matches every web session and `{origin:'local',host:'X',
 *  source:'codex'}` matches exactly one agent on one machine. Used to EXCLUDE
 *  "shared" lanes from sync/recall without deleting anything. */
export interface ScopeLane {
  origin?: string;
  host?: string;
  source?: string;
}

interface ZConfig {
  hybrid?: boolean;
  rerank?: boolean;
  scope?: boolean;
  drive?: string;
  /** UI language: 'vi' (default) | 'en'. */
  lang?: string;
  scopeExclude?: ScopeLane[];
  /** UI UI layout (panel sizes / resize positions) — persisted so a reopen
   *  restores exactly what the user dragged (localStorage resets per random port). */
  ui?: Record<string, unknown>;
  /** Start zemory when the OS starts (plan 14 §6.B). Default false. */
  autostart?: boolean;
  /** Auto-sync the memory via the Drive bundle when data drifts (plan 14 §3b).
   *  Default false — it moves data off the machine, so it stays opt-in. */
  autosync?: boolean;
  /** Idle background scheduler (scan → embed → digest) while the daemon runs
   *  (plan 14 §6.B). Default true — this is the "it just keeps itself current" bit. */
  scheduler?: boolean;
  /** % cửa sổ context mà hook nhắc chốt sổ. Mặc định 95, kẹp [50,99]. */
  contextWarnPercent?: number;
  /** Realtime capture: nạp phiên vào GM sau MỖI lượt trả lời (Stop hook của host).
   *  Default true — đây là đường nạp CHÍNH; scheduler chỉ còn là lưới bù. */
  realtime?: boolean;
  /** How DEEP a cross-machine sync carries (plan 08 §7). "lean" = source rows
   *  only (default, ~74% smaller); "full" = whole-DB snapshot incl. derived
   *  layers (disaster-restore copy). */
  syncLevel?: SyncLevel;
  /** L3: chở blob đính kèm trong bundle sync (mặc định TẮT — xem getSyncAttachments). */
  syncAttachments?: boolean;
  /** Kết quả kiểm đăng nhập gần nhất của từng nền web — xem getWebAuth. */
  webAuth?: Record<string, { ok: boolean; at: string; who?: string }>;
}

/** Cross-machine sync depth (plan 08 §7).
 *  • "lean" — source rows only (sessions/messages/known_stores); the receiver
 *    rebuilds FTS + re-embeds. This is the default and the lean bundle (~74%
 *    smaller). Maps to the "rows" bundle payload.
 *  • "full" — a byte-for-byte snapshot of the whole DB (ships every derived
 *    layer). A disaster-restore copy; much larger. Maps to the "full" payload. */
export type SyncLevel = "lean" | "full";

function read(): ZConfig {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as ZConfig;
  } catch {
    return {};
  }
}

function write(c: ZConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeJsonAtomic(path, c);
}

/** Hybrid recall on? Default true (benchmark gate passed). */
export function getHybridSetting(): boolean {
  return read().hybrid ?? true;
}

export function setHybridSetting(on: boolean): void {
  const c = read();
  c.hybrid = on;
  write(c);
}

/**
 * Cross-encoder rerank on? **MẶC ĐỊNH TẮT** — `plan/05 §4.E` chốt rerank là *opt-in*, bật
 * qua nút UI / `ZEMORY_RERANK=1` / `--rerank`; và HP điều 12 cấm bật mặc định một lớp chưa
 * qua gate thắng net.
 *
 * Trước đây hàm này trả `?? true` với lý do "UI defaults all filters on" — cái giá đo được
 * 2026-07-28 trên corpus thật: **rerank=false 4.616 ms · rerank=true 29.304 ms (6,3×)**.
 * Đợt 07-26 đã bắt đúng triệu chứng nhưng chỉ vá GIÁ TRỊ trong `config.json`; khi file đó
 * rỗng thì mặc định lại bật lên và recall lại 23–29 s. Sửa đúng chỗ là ở đây.
 */
export function getRerankSetting(): boolean {
  return read().rerank === true;
}

export function setRerankSetting(on: boolean): void {
  const c = read();
  c.rerank = on;
  write(c);
}

/** Recall scope = all projects? Default true (memory is global); persisted. */
export function getScopeSetting(): boolean {
  return read().scope ?? true;
}

export function setScopeSetting(on: boolean): void {
  const c = read();
  c.scope = on;
  write(c);
}

/** Start-with-OS toggle (the config flag; the actual OS hook is in autostart.ts). */
export function getAutostart(): boolean {
  return read().autostart ?? false;
}
export function setAutostartSetting(on: boolean): void {
  const c = read();
  c.autostart = on;
  write(c);
}

/** Auto-sync the memory via Drive when data drifts (plan 14 §3b). Opt-in. */
export function getAutosync(): boolean {
  return read().autosync ?? false;
}
export function setAutosyncSetting(on: boolean): void {
  const c = read();
  c.autosync = on;
  write(c);
}

/**
 * Realtime capture — nạp phiên vào GM sau MỖI lượt trả lời (Stop hook), thay vì chờ nhịp nền.
 *
 * Mặc định BẬT (user chốt 2026-08-02: *"mỗi 1 mes phải tự đưa lên luôn mới đúng"*). Rẻ hơn
 * poll chứ không đắt hơn: hook trả chi phí theo CÔNG VIỆC (không tin = 0 chạy, có tin = <1s
 * cho MỘT file), còn nhịp 10' trả theo THỜI GIAN (6 lần scan/giờ kể cả máy rảnh, 1,8–7s/lần).
 * Cờ này chỉ là Ý ĐỊNH của user; thứ thực sự làm việc là hook trong settings của host, nên
 * `setRealtimeSetting` phải kéo theo install/uninstall (xem ui.ts `/set-realtime`).
 */
export function getRealtime(): boolean {
  return read().realtime ?? true;
}
export function setRealtimeSetting(on: boolean): void {
  const c = read();
  c.realtime = on;
  write(c);
}

/** Idle background scheduler (scan/embed/digest). Default ON. */
export function getScheduler(): boolean {
  return read().scheduler ?? true;
}
export function setSchedulerSetting(on: boolean): void {
  const c = read();
  c.scheduler = on;
  write(c);
}

/** Mặc định ngưỡng cảnh báo context (%). Xem `getContextWarnPercent`. */
export const CONTEXT_WARN_PERCENT_DEFAULT = 95;

/**
 * Ngưỡng % cửa sổ context mà hook `UserPromptSubmit` chốt sổ + nhắc MỘT lần.
 *
 * Trước đây là hằng `WARN_AT_PERCENT` chôn trong `capture-hook.ts` với lý do "chưa ai xin
 * thì đừng phơi ra". Nay phơi vì cùng một ngưỡng KHÔNG hợp cho mọi cửa sổ: ở 200k thì 95%
 * còn chừa ~10k token để chốt việc, ở 1M thì 95% chừa 50k — mà ở 200k, 95% có khi đã trễ.
 * Kẹp trong [50, 99]: dưới 50 là nhắc suốt ngày (thành tiếng ồn, rồi bị bỏ qua), từ 100 trở
 * lên là không bao giờ kịp nhắc.
 */
export function getContextWarnPercent(): number {
  const raw = read().contextWarnPercent;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return CONTEXT_WARN_PERCENT_DEFAULT;
  return Math.min(99, Math.max(50, Math.round(raw)));
}
export function setContextWarnPercent(percent: number): void {
  const c = read();
  c.contextWarnPercent = Math.min(99, Math.max(50, Math.round(percent)));
  write(c);
}

/** Cross-machine sync depth (plan 08 §7). Default "lean" (the ~74%-smaller
 *  rows bundle); "full" ships the whole-DB snapshot for disaster restore. */
export function getSyncLevel(): SyncLevel {
  return read().syncLevel === "full" ? "full" : "lean";
}
export function setSyncLevel(level: SyncLevel): void {
  const c = read();
  c.syncLevel = level === "full" ? "full" : "lean";
  write(c);
}

/**
 * L3 (plan 08 §7 bước ③) — có chở ẢNH/FILE đính kèm trong bundle sync không.
 *
 * MẶC ĐỊNH TẮT, và cố ý: bundle lean vừa cắt được −74%, thả 54 MB blob vào là xoá phần
 * lớn lợi ích đó. Nên đây là CÔNG TẮC theo máy (user chốt 2026-07-28: *"dạng check có lấy
 * hay không, giống setting đang có"*) — máy nào cần ảnh xuyên máy thì tự bật.
 */
export function getSyncAttachments(): boolean {
  return read().syncAttachments === true;
}
export function setSyncAttachments(on: boolean): void {
  const c = read();
  c.syncAttachments = on;
  write(c);
}

/**
 * Kết quả kiểm đăng nhập GẦN NHẤT của từng nền web.
 *
 * Kiểm thật thì phải mở trình duyệt, nên bảng "Liên kết" không thể tự kiểm mỗi lần vẽ.
 * Nó hiện kết quả lần cuối KÈM thời điểm — nói rõ mình đang trưng số cũ, thay vì đoán
 * "chắc còn nối" (điều 12). Không có bản ghi ⇒ hiện "chưa kiểm lần nào", khác hẳn "đứt".
 */
export function getWebAuth(): Record<string, { ok: boolean; at: string; who?: string }> {
  const v = read().webAuth;
  return v && typeof v === "object" ? v : {};
}
export function setWebAuth(platform: string, ok: boolean, who?: string): void {
  const c = read();
  c.webAuth = { ...(c.webAuth ?? {}), [platform]: { ok, at: new Date().toISOString(), ...(who ? { who } : {}) } };
  write(c);
}

/** Drive sync folder (where encrypted bundles live). Empty = not linked. */
export function getDriveDir(): string {
  return read().drive ?? "";
}

export function setDriveDir(path: string): void {
  const c = read();
  c.drive = path;
  write(c);
}

/** UI language. Default Vietnamese (the tool's primary audience); 'en' available. */
export function getLang(): string {
  return read().lang === "en" ? "en" : "vi";
}

export function setLang(lang: string): void {
  const c = read();
  c.lang = lang === "en" ? "en" : "vi";
  write(c);
}

/** Lanes EXCLUDED from sync + recall (default none). A filter, never a delete. */
export function getScopeExclude(): ScopeLane[] {
  const v = read().scopeExclude;
  return Array.isArray(v) ? v : [];
}

export function setScopeExclude(lanes: ScopeLane[]): void {
  const c = read();
  c.scopeExclude = lanes;
  write(c);
}

// getUiState/setUiState đã gỡ 2026-07-27 cùng cockpit cũ. Chúng tồn tại vì cockpit
// bind cổng ngẫu nhiên mỗi lần chạy nên localStorage (khoá theo origin) mất layout;
// app hiện chốt cổng 4444 nên seam tự lưu qua localStorage. Khoá `ui` trong
// config.json của máy cũ trở thành mồ côi — vô hại, không cần migration để xoá.
