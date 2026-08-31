// Daemon-side sync job (run-hidden, user 2026-07-21). The old /drive-sync
// endpoint ran `await syncDrive(...)` INLINE on the daemon's event loop — the
// modal blocked for 5+ minutes and so did every other request (same bug class
// as the scheduler's in-process embed, fixed the same way): the work now runs
// in a child process (jobs/syncrun.ts) and this module only tracks its state.
// One job at a time, shared with the scheduler through the write-gate's
// daemon-job token; the UI polls /sync-status.

import { spawn, type ChildProcess } from "node:child_process";
import { constants, setPriority } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { claimDaemonJob, releaseDaemonJob, yieldDaemonJob } from "./writegate.js";

export interface SyncJobStatus {
  running: boolean;
  startedAt: number;
  /** set when the last run finished */
  ok?: boolean;
  error?: string;
  /** the syncDrive result object (parsed from the child's JSON line) */
  result?: unknown;
  /**
   * Tail of the child's stderr, kept ONLY for a failed run.
   *
   * 🔴 Vì sao có (2026-08-26): bản cũ dùng `stdio: ["ignore","pipe","ignore"]` ⇒ stderr của con
   * bị **bỏ thẳng vào hư không**, và `daemon.log` chỉ ghi `auto-sync: job finished`. Lượt sync
   * 26/08 hỏng để lại đúng bốn chữ `UNKNOWN: unknown error, write`, không stack, không dòng nào
   * nói phép ghi nào ném — nên chẩn đoán phải suy từ trạng thái đĩa thay vì đọc lỗi. Đó đúng là
   * kiểu "làm sai trong im lặng" mà `02_RULES §Hành xử` cấm. Chỉ giữ ĐUÔI (8 KB) vì phần đáng
   * đọc là chỗ ném.
   *
   * Giữ khi lượt HỎNG, **hoặc** khi stderr có dòng đánh dấu `[sync]`. Vế thứ hai bắt được lúc
   * soi lại diff của chính lượt vá này: sự kiện đáng giá nhất — *"Drive ném lỗi giả, đếm lại
   * thấy khối vẫn đủ"* — chỉ xảy ra ở lượt **THÀNH CÔNG**, nên điều kiện "chỉ giữ khi hỏng" sẽ
   * vứt đúng thứ cần giữ. Tiến độ thường (`merging chunk 3/41`) không mang dấu này nên vẫn bị bỏ.
   */
  stderr?: string;
  /** BƯỚC đang chạy (mã ngắn: `scan` · `merge` · `lock-wait:<ai>` · `export` · `write` · `verify`
   *  · `embed` · `done`) — CHỈ có khi `running:true`. Xem `share.ts::onProgress`. */
  phase?: string;
}

/** Giữ đuôi stderr, không giữ đầu: chỗ ném nằm ở cuối. */
const STDERR_TAIL = 8192;
/** Dấu của một sự kiện ĐÁNG GIỮ do lớp sync tự in ra, kể cả khi lượt chạy thành công. */
const NOTABLE = /\[sync\]/;
/** Tiền tố dòng BƯỚC trên stderr con — xem `syncrun.ts`. */
const PHASE_PREFIX = "[phase] ";

/**
 * Trích BƯỚC mới nhất từ một khối stderr vừa tới. Hàm THUẦN để cổng đo (tách khỏi closure của
 * `startSyncJob`) — user 2026-08-30: *"phải hiện tiến trình sync đang bước nào"*.
 *
 * `data` event của Node cắt luồng byte tuỳ ý, KHÔNG theo ranh giới dòng — một dòng `[phase] write`
 * có thể tới làm hai lượt gọi (`"[phase] wr"` rồi `"ite\n"`). `prevBuf` giữ phần dở của lượt trước;
 * chỉ dòng ĐỦ `\n` mới được tính. Nhiều dòng `[phase]` trong cùng một khối ⇒ lấy dòng CUỐI (mới nhất).
 */
export function extractPhase(prevBuf: string, chunk: string, prevPhase: string): { phase: string; buf: string } {
  const lines = (prevBuf + chunk).split("\n");
  const buf = lines.pop() ?? "";
  let phase = prevPhase;
  for (const line of lines) if (line.startsWith(PHASE_PREFIX)) phase = line.slice(PHASE_PREFIX.length).trim();
  return { phase, buf };
}

let status: SyncJobStatus = { running: false, startedAt: 0 };
let child: ChildProcess | null = null;

// ── WATCHDOG — một lượt sync KHÔNG được phép kẹt vĩnh viễn (vá 2026-08-30) ──────────────────
// Ca thật cùng ngày, HAI lần: Google Drive File Stream đơ ở tầng OS ⇒ syscall của con sync treo
// không trả về cũng không ném ⇒ `status.running` đứng `true` MÃI MÃI ⇒ mọi lượt tự sync sau
// nhường vô hạn ("đang chờ một lượt sync đang chạy") — sync chết mà không ai biết, phải tay
// người giết. Mọi lớp retry (26/08) chỉ trị lỗi NÉM; đây là lỗi TREO, chỉ có giết-tiến-trình
// mới gỡ được (đã kiểm chứng trên chính cú treo thật: TerminateProcess ăn, syscall trong-tiến-
// trình thì không ngắt được).
//
// VÌ SAO GIẾT LÀ AN TOÀN (đo, không phải cảm giác): mọi bước ghi của lượt sync đều idempotent —
// watermark chỉ nhích khi khối CHỨNG MINH có mặt (`appendVerdict`), merge dedup theo chữ ký
// khối, embed ghi transaction từng tin. Giết oan một lượt dài hợp lệ chỉ tốn MỘT lượt làm lại
// ở nhịp kế; để kẹt thì mất sync VĨNH VIỄN. Trần 90′: lượt nặng nhất đo được ~40′ (đẩy bù ~500
// tin); baseline/gộp hiếm hoi có thể dài hơn — chấp nhận trả giá một lượt retry cho ca hiếm đó.
const SYNC_WATCHDOG_MS = 90 * 60_000;
/**
 * Trần RIÊNG cho bước `embed` — 180′. Vì sao phải tách theo BƯỚC (báo oan thật, đo 14:27 cùng
 * ngày): một lượt embed 56′ bị đèn gọi là "nghi kẹt (Drive hang?)" trong khi con đang cày
 * 3.552 s CPU — embed là việc LOCAL (Drive không treo được nó), trần 500 tin/lượt nhưng tin
 * tool-dump dài chunk thành nhiều cửa sổ nên 30–60′ là hợp lệ. Giết nó ở 90′ là giết oan việc
 * thật; các bước ĐỤNG DRIVE (scan/merge/export/write/verify/lock-wait) thì 45–90′ đã là chết chắc.
 */
/** Export cho `syncHealthOf` (ui.ts) — đèn đỏ "runStuck" của bước embed phải nổ ĐÚNG mốc
 *  watchdog giết, không được là một con số chép tay thứ hai để rồi trôi khỏi nhau. */
export const SYNC_WATCHDOG_EMBED_MS = 180 * 60_000;
/** Đặt NGAY TRƯỚC khi giết — để `finish()` gắn đúng lý do thay vì "sync exited null" vô hồn. */
let watchdogReason: string | null = null;

/** Hàm thuần cho cổng đo: lượt chạy từ `startedAt` tới `now` đã quá trần chưa — trần THEO BƯỚC. */
export function syncWatchdogDue(startedAt: number, now: number, curPhase: string = ""): boolean {
  const maxMs = curPhase === "embed" ? SYNC_WATCHDOG_EMBED_MS : SYNC_WATCHDOG_MS;
  return startedAt > 0 && now - startedAt > maxMs;
}

/** Giết lượt sync kẹt quá trần. Trả `true` nếu vừa giết — người gọi (scheduler) log một dòng. */
export function watchdogSyncJob(now: number = Date.now()): boolean {
  if (!status.running || !child) return false;
  if (!syncWatchdogDue(status.startedAt, now, phase)) return false;
  watchdogReason = `watchdog: run exceeded ${Math.round((now - status.startedAt) / 60_000)}′ (phase ${phase || "?"}) — likely a hung cloud drive; killed so the next cycle retries`;
  try {
    child.kill();
  } catch {
    /* already gone — exit handler sẽ dọn */
  }
  return true;
}
/** BƯỚC hiện tại, đọc theo thời gian thực từ dòng `[phase] ...` mới nhất trên stderr con. */
let phase = "";
/** Đuôi chưa xuống dòng của kênh phase — `data` event có thể cắt ngang một dòng. */
let phaseBuf = "";

export function syncJobRunning(): boolean {
  return status.running;
}

export function syncJobStatus(): SyncJobStatus {
  return { ...status, ...(status.running && phase ? { phase } : {}) };
}

/**
 * dist/jobs/syncjob.js → sibling dist/jobs/syncrun.js.
 *
 * `ZEMORY_SYNC_RUNNER` thay được đường này. Nó tồn tại để **cổng soi HÀNH VI thay vì soi chữ
 * trong mã**: thứ đáng canh ở đây là *"lượt hỏng có giữ được stderr không"* và *"ống stderr có
 * ai hút không"*, mà cả hai chỉ đo được bằng một tiến trình con thật. Chạy lượt sync THẬT trong
 * gate là không khả thi (cần kênh Drive + chìa + hàng chục phút), nên con giả là đường duy nhất.
 */
function runnerEntry(): string {
  const override = process.env.ZEMORY_SYNC_RUNNER;
  if (override) return override;
  return join(dirname(fileURLToPath(import.meta.url)), "syncrun.js");
}

/** Nhịp và số lượt thử lại sau khi đã bảo chuỗi bảo trì nhường. 8 × 750 ms = 6 giây —
 *  dư cho một tiến trình con chết và chuỗi chạy tới `finally`, mà vẫn đủ ngắn để người bấm
 *  nút thấy nó khởi động chứ không thấy im lặng. */
const PREEMPT_SETTLE_MS = 750;
const PREEMPT_TRIES = 8;

/**
 * Sau khi nhường: thử giành token theo nhịp, KHÔNG chờ bận.
 *
 * Hết lượt mà vẫn không vào được thì phải NÓI RA (`status`), vì đây là đường của một cú bấm
 * nút — im lặng ở đây là để người dùng nhìn một vòng xoay không bao giờ dừng, đúng thứ
 * `02_RULES §Bề mặt CHẾT THEO nền` gọi là kiểu hỏng tệ nhất.
 */
function scheduleClaimRetry(onDone: ((s: SyncJobStatus) => void) | undefined, opts: { lowPriority?: boolean }, left: number): void {
  setTimeout(() => {
    if (status.running) return; // ai đó đã khởi động rồi
    const s = startSyncJob(onDone, { ...opts, preempt: false });
    if (s.running) return;
    if (left > 1) return scheduleClaimRetry(onDone, opts, left - 1);
    status = { running: false, startedAt: 0, ok: false, error: "could not take the memory after yielding — something else grabbed it; try again" };
    onDone?.(status);
  }, PREEMPT_SETTLE_MS).unref?.();
}

/**
 * Start a sync child unless one (or another daemon job) already runs.
 * Returns the current status either way — the caller treats "already running"
 * as success (the UI just attaches to the ongoing job).
 */
export function startSyncJob(
  onDone?: (s: SyncJobStatus) => void,
  opts: { lowPriority?: boolean; preempt?: boolean } = {},
): SyncJobStatus {
  if (status.running) return status;
  if (!claimDaemonJob("sync")) {
    // 🔴 KHÔNG còn từ chối cụt (user chốt 2026-08-28: *"muốn schedule với cả bấm sync now"*).
    //
    // Câu cũ ở đây là *"the user can simply retry when the spinner clears"* — một giả định
    // SAI mà không ai kiểm: nó chỉ đúng nếu con kia chạy vài phút. Đo log thật 27–28/08:
    // embed chạy **30 phút → 3 tiếng** mỗi lượt, và daemon bị khởi động lại trước khi nó xong
    // ⇒ trong **19 giờ** auto-sync KHÔNG THỬ nổi một lần, watermark đứng, 5.266 tin ứ lại.
    // "Cứ bấm lại đi" là lời khuyên không dùng được, và cái nút thành cửa cụt.
    //
    // Nay tách theo NGƯỜI GỌI, đúng thứ tự ưu tiên `plan/14 §3` (người bấm > máy tự chạy):
    //  · `preempt` (nút Đồng bộ ngay) ⇒ bảo chuỗi bảo trì NHƯỜNG rồi vào — người đang ngồi chờ;
    //  · không cờ (auto-sync của scheduler) ⇒ nhường lượt, `syncTick` đã tự hẹn lại sau 3 phút.
    if (!opts.preempt) {
      return { running: false, startedAt: 0, ok: false, error: "another background job is writing the memory — queued, it will run on its own shortly" };
    }
    if (!yieldDaemonJob("Đồng bộ ngay")) {
      // Không phải chuỗi bảo trì đang giữ (vd một CLI ngoài) — thứ đó KHÔNG cắt được: nó là
      // tiến trình của người khác, và giết nó là thao tác bất khả đảo trên việc mình không sở hữu.
      return { running: false, startedAt: 0, ok: false, error: "another writer holds the memory (not the maintenance chain) — try again shortly" };
    }
    // Chuỗi nhả token ở `finally`, tức vài vòng event loop SAU khi con chết. KHÔNG chờ bận
    // trong handler HTTP — khoá event loop của daemon là đúng lỗi đã đo hôm nay (một lời gọi
    // nặng bỏ đói mọi lời gọi sau nó). Nên: trả "đang nhường" ngay, rồi thử lại theo nhịp.
    //
    // Phải thử NHIỀU lần: con embed chết không tức thời, và bản nháp đầu chỉ thử MỘT lần nên
    // trượt là hỏng hẳn — đúng kiểu lỗi câm mà cả trang này sinh ra để diệt.
    scheduleClaimRetry(onDone, opts, PREEMPT_TRIES);
    return { running: false, startedAt: 0, ok: false, error: "yielding the maintenance job — sync starts in a moment" };
  }
  status = { running: true, startedAt: Date.now() };
  phase = "";
  phaseBuf = "";
  let out = "";
  let err = "";
  let c: ChildProcess;
  try {
    // stderr là "pipe", KHÔNG "ignore" — xem chú thích ở `SyncJobStatus.stderr`.
    c = spawn(process.execPath, [runnerEntry()], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  } catch (e) {
    releaseDaemonJob();
    status = { running: false, startedAt: status.startedAt, ok: false, error: e instanceof Error ? e.message : String(e) };
    return status;
  }
  child = c;
  // Hạ ưu tiên CHỈ khi lượt sync này do MÁY tự chạy (scheduler). Cùng hàm này còn phục vụ nút
  // "Đồng bộ ngay" — lúc đó người dùng đang NGỒI CHỜ, hạ ưu tiên là bắt họ chờ lâu hơn.
  // Phân biệt "việc nền" với "việc người dùng xin" quan trọng hơn bản thân mức ưu tiên.
  if (opts.lowPriority && c.pid) {
    try {
      setPriority(c.pid, constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {
      /* thiếu quyền đổi ưu tiên — vẫn chạy, chỉ là không nhường */
    }
  }
  c.stdout?.on("data", (d: Buffer) => {
    out += String(d);
    if (out.length > 262144) out = out.slice(-262144); // keep the tail — the JSON line is last
  });
  // PHẢI hút stderr, không chỉ mở nó: ống không ai đọc thì đầy 64 KB là con TREO ở `write` —
  // biến một lớp chẩn đoán thành một kiểu hỏng mới (đúng luật "thêm một lớp là thêm một chỗ hỏng").
  c.stderr?.on("data", (d: Buffer) => {
    const s = String(d);
    err += s;
    if (err.length > STDERR_TAIL) err = err.slice(-STDERR_TAIL);
    // Kênh phase đọc RIÊNG khỏi đuôi `err` (đuôi đó bị CẮT ở 8 KB, phase có thể rơi ra ngoài).
    const r = extractPhase(phaseBuf, s, phase);
    phase = r.phase;
    phaseBuf = r.buf;
  });
  const finish = (ok: boolean, error?: string) => {
    if (child === c) child = null;
    releaseDaemonJob();
    // Bị watchdog giết ⇒ lý do thật là "kẹt quá trần", không phải mã thoát vô hồn của cú kill.
    if (watchdogReason) {
      ok = false;
      error = watchdogReason;
      watchdogReason = null;
    }
    // The child prints its result as the LAST JSON line on stdout.
    let parsed: { ok?: boolean; error?: string } | null = null;
    const lines = out.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        parsed = JSON.parse(lines[i]) as { ok?: boolean; error?: string };
        break;
      } catch {
        /* not the JSON line */
      }
    }
    const good = parsed ? parsed.ok !== false && ok : ok;
    status = {
      running: false,
      startedAt: status.startedAt,
      ok: good,
      ...(parsed ? { result: parsed } : {}),
      ...(parsed && parsed.ok === false ? { error: parsed.error } : !ok && error ? { error } : {}),
      // Lượt hỏng ⇒ giữ (cần stack). Lượt chạy được ⇒ chỉ giữ nếu có dấu `[sync]`, vì tiến độ
      // thường thì giữ lại chỉ làm log phình — xem chú thích ở `SyncJobStatus.stderr`.
      ...(err.trim() && (!good || NOTABLE.test(err)) ? { stderr: err.trim() } : {}),
    };
    onDone?.(status);
  };
  c.on("exit", (code) => finish(code === 0, code === 0 ? undefined : `sync exited ${code ?? "?"}`));
  c.on("error", (e) => finish(false, e instanceof Error ? e.message : String(e)));
  return status;
}

/** Kill a running sync child (daemon shutdown). */
export function stopSyncJob(): void {
  if (child) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    child = null;
  }
}
