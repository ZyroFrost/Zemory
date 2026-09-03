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
  /** v24 — KHE TAI KHOAN cua nguon web. Hoi thoai nam theo TAI KHOAN chu khong theo nen, nen
   *  mot nen co the co nhieu lane con; thieu chieu nay thi o tick theo tai khoan khong loc
   *  duoc gi (user bat 2026-08-28). NULL trong kho (phien cu) => lane khong ro. */
  account?: string;
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
  /** Chip cập nhật có KIỂM các repo khác trong registry còn khớp chuẩn không (mặc định có). Tắt ⇒ chip chỉ báo
   *  bản zemory mới trên kênh chung — cho máy chỉ dùng zemory làm bộ nhớ, không quản chuẩn repo (user 2026-08-29). */
  repoStdCheck?: boolean;
  /** Lịch tự sync — xem getAutosyncSchedule. */
  autosyncSchedule?: { mode?: string; everyMin?: number; times?: string[] };
  /** Root "chưa liên kết" người dùng bảo BỎ QUA (không đưa lên danh sách chọn). Chỉ là bộ lọc của danh sách —
   *  phiên vẫn trong kho, vẫn recall/sync. Khôi phục được từ nhóm "Đã bỏ qua" (user chốt 2026-08-29). */
  ignoredRoots?: string[];
  /** Mốc tự sync gần nhất (ms epoch) — xem getAutosyncLastAt. */
  autosyncLastAt?: number;
  /** Mốc lượt ĐỐI CHIẾU KÊNH gần nhất (ms epoch) — xem getVecReconcileLastAt. */
  vecReconcileLastAt?: number;
  /** Mốc lượt tự sync ĐANG chạy (ms epoch), xoá khi có kết cục — xem getAutosyncRunAt. */
  autosyncRunAt?: number | null;
  /** Kết cục lượt tự sync GẦN NHẤT — xem getAutosyncLastResult. */
  autosyncLastResult?: { at: string; ok: boolean; kind?: string; detail?: string };
  /** Kết quả kiểm đăng nhập gần nhất của từng nền web — xem getWebAuth. */
  webAuth?: Record<string, { ok: boolean; at: string; who?: string }>;
  /**
   * Kết cục lượt KÉO gần nhất của từng lane web — xem getWebPull.
   *
   * Tách khỏi `webAuth` vì đây là hai sự thật khác nhau: *"đăng nhập còn sống không"* và
   * *"lượt kéo vừa rồi ra sao"*. Gộp lại thì không phân biệt nổi **chưa bao giờ chạy** với
   * **chạy rồi và hỏng** — mà đó đúng là hai thứ người dùng cần đọc khác nhau.
   */
  webPull?: Record<string, { at: string; ok: boolean; status: string; pulled?: number; error?: string }>;
  /** Tên các tool mà tin `tool_use` của chúng ĐƯỢC nhúng vector — xem getEmbedTools. */
  embedTools?: string[];
}

/**
 * Lớp tin TOOL nào được nhúng vector, MẶC ĐỊNH — phạm vi này là kết quả ĐO, không phải
 * phỏng đoán: nó phủ đủ 14/14 nhãn `tool_use` của corpus và đưa lớp đó từ **0% lên 21%@10**
 * (`06_CHANGES [2026-08-11f]`). Các tool còn lại (`Read` · `Grep` · `TodoWrite` · `Glob`…)
 * CỐ Ý đứng ngoài: 29% lớp này dưới 200 ký tự — đường dẫn, pattern, tham số — tức token
 * literal mà FTS word khớp tốt hơn, nhúng một đường dẫn thành 768 chiều gần như vô nghĩa
 * (`plan/17 §3.2`). Thêm chúng vào là ~19.600 tin ≈ nhiều giờ máy cho phần rẻ nhất.
 */
export const EMBED_TOOLS_DEFAULT = ["Edit", "Write", "Bash", "PowerShell", "Artifact"];

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

/**
 * Phạm vi nhúng lớp tool — LƯU TRONG CONFIG, không phải biến môi trường.
 *
 * 🔴 Vì sao phải đổi (đo 2026-08-12): phạm vi này từng CHỈ sống ở `ZEMORY_EMBED_TOOLS`, tức
 * nó chết theo cửa sổ terminal đã gõ lệnh. Job 11/08 chạy với biến đó và phủ 100%; nhưng
 * daemon + scheduler + hook chạy KHÔNG có biến ⇒ mọi tin tool sinh ra sau đó không ai nhặt.
 * Đo được nhịp rò: **72 tin lúc 10h → 146 tin lúc 11h30 ≈ 50 tin/giờ** trôi ra ngoài lớp
 * vector. Và vì `vectorRemaining()` đếm bằng CHÍNH bộ lọc này, chúng không xuất hiện trong
 * bất kỳ con số nào — `/memory-status` vẫn báo `remaining 0`. Một lớp tự teo, không cổng nào
 * kêu, đúng kiểu hỏng lặng mà `02_RULES` cấm.
 *
 * Nằm trong config thì MỌI tiến trình đọc được: một lần chỉnh là scheduler tự lo từ đó về sau.
 * Biến môi trường VẪN thắng khi có mặt (đường thử nghiệm một lần, không ghi vào config).
 */
export function getEmbedTools(): string[] {
  const v = read().embedTools;
  return Array.isArray(v) ? v : EMBED_TOOLS_DEFAULT;
}

export function setEmbedTools(names: string[]): void {
  const c = read();
  c.embedTools = names;
  write(c);
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
 * LỊCH tự sync (user chốt 2026-08-29: ⚙ ở panel Auto-sync → hộp chọn). Hai kiểu, một lúc một kiểu:
 *  · `interval` — sau mỗi `everyMin` phút (mặc định 30 = hành vi cũ, không đổi gì nếu chưa chỉnh);
 *  · `times` — vào các mốc giờ trong ngày (`"12:00"` · `"18:00"`, giờ máy), mỗi mốc bắn một lần/ngày.
 * Nút "Đồng bộ ngay" không bị lịch này ràng.
 */
export interface AutosyncSchedule {
  mode: "interval" | "times";
  everyMin: number;
  times: string[];
}
export function getAutosyncSchedule(): AutosyncSchedule {
  const s = read().autosyncSchedule;
  const everyMin = Number(s?.everyMin);
  return {
    mode: s?.mode === "times" ? "times" : "interval",
    everyMin: Number.isFinite(everyMin) && everyMin >= 5 ? Math.round(everyMin) : 30,
    times: Array.isArray(s?.times) ? s.times.filter((t) => /^\d{2}:\d{2}$/.test(String(t))).slice(0, 12) : [],
  };
}
export function setAutosyncSchedule(v: Partial<AutosyncSchedule>): void {
  const c = read();
  c.autosyncSchedule = { ...getAutosyncSchedule(), ...v };
  write(c);
}

/** Mốc lượt TỰ sync gần nhất — LƯU BỀN, không phải biến trong tiến trình (đo 2026-08-29: 28 lần daemon khởi động lại
 *  trong ngày, mỗi lần đồng hồ sync về 0 rồi nhường embed ⇒ 8 giờ không một lượt tự sync nào, 5.896 tin chưa đẩy). */
export function getAutosyncLastAt(): number | null {
  const v = read().autosyncLastAt;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
export function setAutosyncLastAt(ms: number): void {
  const c = read();
  c.autosyncLastAt = ms;
  write(c);
}

/**
 * Mốc lượt ĐỐI CHIẾU KÊNH gần nhất — dựng lại kho chung vào kho tạm rồi so vector (`vectors-catchup`).
 *
 * Vì sao phải có một mốc RIÊNG, không dùng chung với `autosyncLastAt`: hai việc trả lời hai câu
 * khác nhau. Lượt sync hỏi CUỐN SỔ (`vec_shipped`) *"tôi đã gửi cái này chưa"*; lượt đối chiếu hỏi
 * CHÍNH KÊNH *"cái này có thật sự nằm trên đó không"*. Sổ được **gieo** bằng toàn bộ vector đang có
 * lúc nâng schema v23, nên nó mù cấu trúc với phần hụt có TRƯỚC mốc đó (`plan/08 §8b`) — nghĩa là
 * đường sync sẽ KHÔNG BAO GIỜ tự phát hiện, dù chạy bao nhiêu lượt.
 * LƯU BỀN chứ không phải biến trong tiến trình: daemon khởi động lại hàng chục lần mỗi ngày (đo
 * 2026-08-29: 28 lần), mốc trong RAM sẽ về 0 mỗi lần và biến nhịp 7 ngày thành "mỗi lần khởi động".
 */
export function getVecReconcileLastAt(): number | null {
  const v = read().vecReconcileLastAt;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
export function setVecReconcileLastAt(ms: number): void {
  const c = read();
  c.vecReconcileLastAt = ms;
  write(c);
}

/**
 * Mốc lượt tự sync ĐANG chạy — đặt lúc phóng job, xoá lúc có kết cục.
 *
 * Còn sót lại lúc daemon khởi động = lượt đó chết mà KHÔNG kịp báo gì (callback kết cục sống
 * trong tiến trình daemon, daemon chết là nó chết theo). Đo 2026-08-30: 11 lượt tự sync kể từ
 * lúc có log kết cục (27/08) thì **7 lượt CÂM** — không OK, không FAIL, chỉ một dòng "starting"
 * rồi im, vì lần khởi động lại kế tiếp cắt ngang. Phải LƯU BỀN mới nói được câu đó ở phiên sau.
 */
export function getAutosyncRunAt(): number | null {
  const v = read().autosyncRunAt;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
export function setAutosyncRunAt(ms: number | null): void {
  const c = read();
  c.autosyncRunAt = ms;
  write(c);
}

/**
 * Kết cục lượt tự sync GẦN NHẤT — để UI đọc được, không riêng `daemon.log`.
 *
 * Vì sao phải LƯU BỀN (user chốt 2026-08-30, nguyên văn: *"nó gãy ở drive thì cũng phải báo
 * sync vấn đề… user chỉ nhìn thông số và dashboard"*): kết cục trước đây chỉ đi vào log, mà
 * người dùng không đọc log — họ nhìn card Drive Sync. Một lượt hỏng (Drive chập · bị restart
 * cắt) không được hiển thị ở đâu ⇒ dashboard hiện số CŨ như thể mọi thứ ổn. `kind`:
 * `"fail"` = chạy xong và hỏng · `"interrupted"` = chết không kịp báo (phát hiện lúc daemon lên).
 */
export function getAutosyncLastResult(): { at: string; ok: boolean; kind?: string; detail?: string } | null {
  const v = read().autosyncLastResult;
  return v && typeof v.at === "string" && typeof v.ok === "boolean" ? v : null;
}
export function setAutosyncLastResult(v: { ok: boolean; kind?: string; detail?: string }): void {
  const c = read();
  c.autosyncLastResult = { at: new Date().toISOString(), ...v };
  write(c);
}

export function getIgnoredRoots(): string[] {
  const v = read().ignoredRoots;
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : [];
}
/** Thêm/bỏ một root khỏi danh sách bỏ qua — so không phân biệt hoa/thường (đường Windows). */
export function setIgnoredRoot(root: string, on: boolean): string[] {
  const c = read();
  const cur = getIgnoredRoots().filter((r) => r.toLowerCase() !== root.toLowerCase());
  c.ignoredRoots = on ? [...cur, root] : cur;
  write(c);
  return c.ignoredRoots;
}

export function getRepoStdCheck(): boolean {
  return read().repoStdCheck !== false;
}
export function setRepoStdCheck(on: boolean): void {
  const c = read();
  c.repoStdCheck = on;
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
  // GIỮ danh tính cũ khi lượt kiểm không mang `who` (mất phiên ⇒ `ok:false` không biết email). Bản cũ xoá
  // `who` ⇒ email không tra ra khe nào ⇒ bấm "Liên kết" trên hàng zyrofrost mở KHE MỚI `chatgpt#2` thay vì
  // khe main đang giữ lịch sử (đo 2026-08-29 06:15Z). Mất phiên là đổi TRẠNG THÁI, không đổi NGƯỜI.
  const prev = c.webAuth?.[platform];
  const keep = who ?? prev?.who;
  c.webAuth = { ...(c.webAuth ?? {}), [platform]: { ok, at: new Date().toISOString(), ...(keep ? { who: keep } : {}) } };
  write(c);
}

export function getWebPull(): Record<string, { at: string; ok: boolean; status: string; pulled?: number; error?: string }> {
  return read().webPull ?? {};
}

/**
 * Ghi kết cục một lượt kéo. **Ghi CẢ khi hỏng** — đó là toàn bộ lý do bảng này tồn tại
 * (user chốt 2026-08-28: *"bất cứ source nào check vào mà nó lỗi ko kéo dc là phải báo"*).
 * Chỉ ghi lúc thành công thì một nguồn chết trông y hệt một nguồn chưa tới lượt.
 */
export function setWebPull(lane: string, v: { ok: boolean; status: string; pulled?: number; error?: string }): void {
  const c = read();
  c.webPull = { ...(c.webPull ?? {}), [lane]: { at: new Date().toISOString(), ...v } };
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
