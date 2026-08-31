// Idle background scheduler (plan 14 §6.B) — runs INSIDE the `zemory ui` daemon
// so the memory keeps itself current without the user asking:
//   • maintain chain — scan → embed → digest (opt-OUT: `scheduler`, default ON)
//   • auto-sync      — when data drifts, push/pull the encrypted Drive bundle (opt-in: autosync)
//
// BUG 2026-07-30: this file only had embed + sync, while the UI has always
// promised "daemon tự chạy scan → embed → digest". So NOTHING ingested new
// transcripts automatically — a machine sat at +2.722 unscanned messages with the
// daemon running and healthy, and `memory digest <session>` answered "no digest"
// because digest never ran either. The user read that as "web scan is broken";
// the real hole was the missing scan/digest steps here. Gate:
// backend/test/scheduler-contract.test.mjs now fails if the UI promises a step
// this file does not run.
//
// CRITICAL (bug 2026-07-21): the heavy work — ONNX embedding, Drive sync — must
// NOT run on the daemon's event loop. A synchronous embed pass froze /ping for
// ~28s (Node is single-threaded; native ONNX inference cannot yield). So each
// heavy pass runs in a SEPARATE PROCESS: embed via `zemory memory embed --all`,
// sync via the shared sync job (jobs/syncjob.ts — same child the UI button uses).
// The daemon only COUNTS the backlog (cheap-ish SQLite) and spawns. Exclusive
// access is coordinated through the write-gate's daemon-job token, so the
// scheduler, the UI sync button and a CLI writer never overlap.

import { spawn, type ChildProcess } from "node:child_process";

/** Đuôi stdout/stderr giữ lại của mỗi con maintain — cùng cỡ với `syncjob.ts`. */
const CHILD_TAIL = 8192;
import { constants, setPriority } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { type AutosyncSchedule, getAutosync, getAutosyncLastAt, getAutosyncRunAt, getAutosyncSchedule, getDriveDir, getScheduler, getScopeExclude, getWebPull, setAutosyncLastAt, setAutosyncLastResult, setAutosyncRunAt, setWebPull } from "../config/settings.js";

/**
 * LỊCH tự sync — hàm THUẦN để cổng đo (user chốt 2026-08-29: chọn "sau mỗi N phút/giờ" hoặc "theo khung giờ trong ngày").
 *  · `interval`: tới hạn khi đã qua `everyMin` phút kể từ lượt tự sync trước (chưa có lượt nào ⇒ tới hạn ngay).
 *  · `times`: tới hạn khi giờ máy HH:MM trùng một mốc và mốc đó CHƯA bắn hôm nay (`fired` giữ khoá `YYYY-MM-DD HH:MM`).
 * Trả khoá mốc đã bắn (để người gọi ghi vào `fired`) hoặc `null` khi chưa tới hạn. Nhịp gọi 60 s ⇒ không lỡ mốc phút.
 */
export function autosyncDue(s: AutosyncSchedule, lastAt: number | null, now: number, fired: Set<string>): string | null {
  if (s.mode === "interval") return lastAt === null || now - lastAt >= s.everyMin * 60_000 ? "interval" : null;
  const d = new Date(now);
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (!s.times.includes(hhmm)) return null;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${hhmm}`;
  return fired.has(key) ? null : key;
}
const firedTimes = new Set<string>();
/** Export để cổng gõ đúng cửa mà lỗ ② từng nằm — mốc bị tiêu Ở ĐÂY hay không. */
export function syncGate(): void {
  // Watchdog chạy TRƯỚC cả lịch: một lượt kẹt (Drive treo — 2 ca thật 30/08) chặn mọi lượt sau
  // vô hạn nếu không ai giết nó. Kết cục "watchdog killed" đi qua đúng đường onDone ⇒ vào sổ
  // bền ⇒ đèn đỏ trên card; lượt kế tự thử lại — mọi bước ghi idempotent nên giết là an toàn.
  if (watchdogSyncJob()) log("🔴 auto-sync watchdog: lượt sync kẹt quá trần — đã dừng con để nhịp kế tự chạy lại (nghi Drive treo)");
  // Mốc lượt trước đọc từ CONFIG (bền qua restart) — không phải biến tiến trình. Đo 2026-08-29: 28 lần restart trong
  // ngày, mỗi lần đồng hồ về 0 rồi nhường embed 30′ ⇒ 8 giờ không lượt tự sync nào dù công tắc bật và lịch "mỗi 30′".
  const key = autosyncDue(getAutosyncSchedule(), getAutosyncLastAt(), Date.now(), firedTimes);
  if (!key) return;
  if (key !== "interval") firedTimes.add(key);
  if (firedTimes.size > 64) firedTimes.clear(); // sổ nhỏ, chỉ cần nhớ hôm nay
  // Mốc KHÔNG ghi ở đây nữa (vá 2026-08-30) — `syncTick` ghi khi lượt thật sự khởi động. Ghi ở
  // đây thì một lượt bị chặn cũng tiêu mất suất 30′, mà hẹn-lại-3-phút không sống qua restart.
  syncTick();
}
import { PLATFORMS, platformsInUse, pullableAccountsOf, scanWeb } from "../memory/scanweb.js";
import { isExcluded } from "../memory/scope.js";
import { backupAgeMs, backupStale, rotateBackup } from "../memory/backup-rotate.js";
import { currentMemoryDb } from "../memory/db.js";
import { daemonLog } from "../logging/daemon-log.js";
import { sweepScratchpads } from "./scratchpad.js";
import { verifyMemory } from "../memory/salvage.js";
import { vectorRemaining } from "../memory/vectors.js";
import { claimDaemonJob, cliHoldsWrite, cliHoldsWriteOn, cliWriteHolder, daemonJobBusy, registerJobYielder, releaseDaemonJob } from "./writegate.js";
import { startSyncJob, type SyncJobStatus, syncJobRunning, watchdogSyncJob } from "./syncjob.js";

// 2026-08-02 — VAI ĐỔI: nạp GM giờ là việc của Stop hook (per-message, <1s, đúng lúc có tin
// thật). Vòng này TEO thành LƯỚI BÙ cho ba thứ per-message không làm được:
//   ① embed — mỗi lần nạp model ONNX mất vài giây, không thể chạy mỗi tin;
//   ② digest sweep + scan vét — nguồn không có hook (web, máy khác), hoặc hook trượt vì
//      write-gate đang bận (đo: chờ = ~125s/lượt nên hook bỏ qua, để lưới bù lượm);
//   ③ chiều IMPORT của Drive — bundle máy khác rơi xuống không phát sự kiện gì, phải poll.
// Vì vậy nhịp giãn 10' → 30': trả tiền theo thời gian ít lại, phần tươi đã có hook lo.
const MAINTAIN_EVERY_MS = 30 * 60_000; // lưới bù: scan vét → embed → digest
const SYNC_EVERY_MS = 30 * 60_000; // check Drive drift every 30 min
// The backlog count is a full anti-join (messages NOT IN vec_chunks) run
// synchronously on the event loop — hundreds of ms on a 595MB memory. When the
// backlog was last seen EMPTY, back off to the sync cadence instead of paying
// that scan every 5 minutes (audit 2026-07-21).
const IDLE_BACKOFF_MS = 30 * 60_000;
/** Backup tự kiểm hạn (1 bản/ngày) nên nhịp này chỉ là "có cơ hội để hỏi", rẻ như một readdir. */
const BACKUP_EVERY_MS = 30 * 60_000;
// Rác nháp lớn dần theo GIỜ chứ không theo phút — 6 tiếng một lượt là đủ dày mà gần như
// không tốn gì (một lượt `readdir` + `stat`).
const SCRATCH_EVERY_MS = 6 * 60 * 60_000;

let maintainTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let backupTimer: ReturnType<typeof setInterval> | null = null;
let scratchTimer: ReturnType<typeof setInterval> | null = null;
let webTimer: ReturnType<typeof setInterval> | null = null;
/** Nhịp HỎI "lane nào tới lượt" — rẻ (đọc settings). Việc tới lượt hay chưa do `webDue` phán,
 *  nên đồng hồ này dày hơn chu kỳ kéo mà không làm tăng số lần mở trình duyệt. */
const WEB_TICK_EVERY_MS = 20 * 60_000;
let child: ChildProcess | null = null;
let chainRunning = false; // a maintain chain is between claim and release
let lastEmptyAt = 0; // when vectorRemaining() last returned 0
/**
 * Cờ NHƯỜNG: một việc do NGƯỜI bấm cần kho, chuỗi bảo trì phải rút lui.
 *
 * Vì sao cần cờ chứ không chỉ `child.kill()`: token job được giữ cho CẢ chuỗi
 * (scan→embed→digest→backup), nên giết mỗi con đang chạy chỉ làm chuỗi bước sang bước KẾ —
 * token vẫn bị giữ, và kẻ bấm nút vẫn bị từ chối. Phải có chỗ cho chuỗi biết đường dừng hẳn.
 */
let chainAbort = false;

function log(msg: string): void {
  // 🔴 GHI RA ĐĨA, không chỉ stderr (2026-08-12).
  // Bản cũ chỉ `console.error`, mà daemon được phóng TÁCH KHỎI console (autostart `.vbs`,
  // `WshShell.Run(cmd,0,False)`) nên stderr không đi đâu cả — **không một dòng nào tới đĩa**.
  // Cái giá đo được: lỗi bỏ đói autosync sống im lặng **2 giờ 34 phút**; nó CÓ in
  // "auto-sync — starting background sync job", chỉ là không ai đọc được. Một lớp nền không
  // để lại dấu vết thì mọi lỗi của nó đều là lỗi câm — đúng thứ `02_RULES §Bề mặt CHẾT THEO
  // nền` cấm. `daemonLog` ghi `<thư mục kho>/logs/daemon.log` và vẫn mirror ra stderr.
  daemonLog(`[scheduler] ${msg}`);
}

/** dist/jobs/scheduler.js → its sibling dist/cli.js. */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/** True while THIS module's maintain child is alive. */
export function schedulerChildRunning(): boolean {
  return child !== null;
}

/**
 * NHƯỜNG chuỗi bảo trì cho một việc NGƯỜI vừa bấm (user chốt 2026-08-28: *"muốn schedule với
 * cả bấm sync now"*).
 *
 * Vì sao ĐƯỢC PHÉP cắt ngang — ba căn cứ, không phải cảm giác:
 *  · **Luật đã có**: `plan/14 §3` chốt *"chỉ hạ việc do MÁY tự chạy; việc NGƯỜI DÙNG bấm giữ
 *    Normal, vì lúc đó người dùng đang ngồi chờ kết quả"*. Ở đây chỉ là mở rộng cùng thứ tự ưu
 *    tiên từ CPU sang quyền vào kho.
 *  · **Embed dựng lại được**: nó ghi theo transaction TỪNG TIN (`vectors.ts insTx`), và
 *    `embedPending` luôn chọn phần CÒN THIẾU ⇒ cắt ngang mất nhiều nhất một tin, lượt sau nhúng lại.
 *  · **Đã đo thực địa, không phải suy luận**: log daemon 80 lượt embed khởi động / 48 lượt có
 *    dòng `finished` ⇒ **32 lượt đã bị giết giữa chừng** bởi các lần restart daemon, mà
 *    `verifyMemory` đầu mỗi chuỗi chưa lần nào báo `⛔ KHO HỎNG`.
 *
 * KHÔNG cắt `scan`: nó là bước DUY NHẤT đưa tin mới vào, và nó ngắn (đo: 50–90 s). Cắt nó để
 * tiết kiệm một phút là đổi lấy nguy cơ đẩy một gói THIẾU tin lên kênh chung — sai đúng thứ
 * HP điều 16 canh.
 *
 * @returns `true` nếu thật sự có chuỗi để nhường (người gọi phải CHỜ nó nhả token).
 */
export function yieldMaintainFor(reason: string): boolean {
  if (!chainRunning) return false;
  chainAbort = true;
  const c = child;
  if (c) {
    log(`nhường cho ${reason} — dừng con đang chạy (embed/digest nhúng lại được ở nhịp sau)`);
    try {
      c.kill();
    } catch {
      /* con đã tự thoát — cờ abort vẫn làm chuỗi dừng ở chốt kế tiếp */
    }
  } else {
    log(`nhường cho ${reason} — chuỗi đang giữa hai bước, dừng ở chốt kế tiếp`);
  }
  return true;
}

/**
 * Run ONE maintenance command in a separate process and wait for it.
 * Heavy work must never touch the daemon's event loop (see header), and the
 * chain must be sequential — scan feeds embed, embed feeds digest.
 */
function runStep(label: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    let c: ChildProcess;
    try {
      // ZEMORY_DAEMON_CHILD: the child skips the CLI write-gate — THIS daemon
      // already holds the job token for it (gating made it wait on itself).
      // stdout/stderr là "pipe", KHÔNG "ignore". Đo 2026-08-27: con `embed --all` chạy 20 phút
      // (730 s CPU) không ghi một hàng nào, và từ ngoài KHÔNG CÁCH NÀO biết nó đang khởi động
      // chậm hay kẹt — mọi lời nó in đều rơi vào hư không, `daemon.log` chỉ có "running embed".
      // Sync đã được vá đúng lỗ này ngày 26/08 (`syncjob.ts`), scan/embed/digest thì chưa.
      // Chỉ giữ ĐUÔI (8 KB) — phần đáng đọc là chỗ ném hoặc dòng tiến độ cuối.
      c = spawn(process.execPath, [cliEntry(), ...args], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        // ZEMORY_DAEMON_PID: để con phân biệt khoá CỦA MÌNH (daemon giữ hộ) với khoá của
        // một CLI NGOÀI đang ghi. Thiếu nó thì con không có cách nào biết, và sẽ ghi đè —
        // đúng ca 2026-08-08 (hai `embed --all` cùng kho).
        env: { ...process.env, ZEMORY_DAEMON_CHILD: "1", ZEMORY_DAEMON_PID: String(process.pid) },
      });
    } catch (e) {
      log(`${label}: could not spawn (${e instanceof Error ? e.message : e})`);
      resolve(-1);
      return;
    }
    child = c;
    // NHƯỜNG CPU CHO NGƯỜI DÙNG. Việc nền (embed ONNX · scan · digest) chạy ở ưu tiên THẤP HƠN
    // bình thường: máy rảnh thì nó vẫn ăn trọn 12 core, còn lúc người dùng đang gõ / chạy test
    // thì hệ điều hành cắt nhịp cho việc trước mặt. Tốt hơn ghim cứng số core — ghim cứng thì
    // lúc máy rảnh cũng chỉ dùng được phần đã ghim.
    //
    // Vì sao cần (đo 2026-08-13): hook capture ghi ~23 tin/phút trong lúc làm việc, nên backlog
    // embed gần như LUÔN dương và job nền gần như LUÔN chạy — ở ưu tiên Normal, nó tranh CPU
    // ngang hàng với chính việc người dùng đang làm.
    // Fail-open: thiếu quyền đổi ưu tiên thì chạy tiếp như cũ, không được giết job vì chuyện này.
    try {
      if (c.pid) setPriority(c.pid, constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {
      /* không đổi được ưu tiên — vẫn chạy, chỉ là không nhường */
    }
    // PHẢI hút cả hai ống, không chỉ mở: ống không ai đọc thì đầy 64 KB là con TREO ở `write` —
    // biến một lớp chẩn đoán thành một kiểu hỏng mới.
    let out = "";
    let err = "";
    c.stdout?.on("data", (d: Buffer) => {
      out += String(d);
      if (out.length > CHILD_TAIL) out = out.slice(-CHILD_TAIL);
    });
    c.stderr?.on("data", (d: Buffer) => {
      err += String(d);
      if (err.length > CHILD_TAIL) err = err.slice(-CHILD_TAIL);
    });
    const done = (code: number): void => {
      if (child === c) child = null;
      resolve(code);
    };
    c.on("exit", (code, signal) => {
      // Dòng tiến độ cuối của con (CLI in `\r` để ghi đè tại chỗ ⇒ tách cả `\r`).
      const last = out.split(/[\r\n]+/u).map((l) => l.trim()).filter(Boolean).pop();
      // Bị GIẾT khác CHẾT VÌ LỖI. Từ 2026-08-28 việc nhường cho nút người dùng bấm là đường
      // BÌNH THƯỜNG, nên in `exit ?` cho nó là dạy người đọc log nghi ngờ một thứ đang chạy
      // đúng — và làm loãng đúng dấu hiệu họ cần thấy khi có lỗi thật.
      const how = code === null ? `bị dừng${signal ? ` (${signal})` : ""}` : `exit ${code}`;
      log(`${label}: finished (${how})${last ? " · " + last : ""}`);
      // Lỗi thì nói RA lỗi gì — không để lại bốn chữ "exit 1" như ca sync 26/08.
      // Con BỊ GIẾT thì stderr của nó không phải lỗi của nó ⇒ không đổ ra (nhiễu).
      if (code !== null && code !== 0 && err.trim()) {
        for (const line of err.trim().split(/\r?\n/u).slice(-20)) log(`${label}: stderr · ${line}`);
      }
      done(code ?? -1);
    });
    c.on("error", (e) => {
      log(`${label}: child error ${e instanceof Error ? e.message : e}`);
      done(-1);
    });
  });
}

/**
 * The chain the UI promises: scan → embed → digest.
 * ONE job token for the whole chain so a CLI writer never lands mid-sequence.
 */
async function maintainTick(): Promise<void> {
  if (chainRunning || child || syncJobRunning() || cliHoldsWrite() || !getScheduler()) return; // yield to any other writer
  if (!claimDaemonJob("maintain")) return;
  chainRunning = true;
  try {
    // 0. KHO CÓ LÀNH KHÔNG — hỏi TRƯỚC khi ghi thêm gì.
    //    Sự cố 2026-08-03: kho hỏng lúc nào không ai biết, chỉ lộ ra vì tình cờ chạy bench.
    //    Mỗi ngày chậm phát hiện là bản sao lưu gần nhất càng cũ. Hỏng thì DỪNG cả chuỗi:
    //    ghi tiếp vào một file đã hỏng chỉ làm hỏng thêm và đè lên bản sao lưu còn tốt.
    const health = verifyMemory(currentMemoryDb());
    if (!health.ok) {
      log(`⛔ KHO HỎNG (${health.detail}) — dừng chuỗi bảo trì. Chạy \`zemory memory salvage\` rồi \`memory reopen\` + \`memory scan\`.`);
      return;
    }
    // 1. scan — ingest new/changed transcripts. Incremental (dedup by uuid), and
    //    it is the ONLY step that brings new messages in, so it never backs off.
    //    KHÔNG có chốt nhường trước bước này: xem `yieldMaintainFor` — scan ngắn, và bỏ nó
    //    làm gói sync sau đó THIẾU tin.
    await runStep("scan", ["memory", "scan"]);
    if (chainAbort) return; // `finally` nhả token cho việc người dùng vừa bấm

    // 2. embed — only when there is a vector backlog. Counting is a full
    //    anti-join (hundreds of ms on a 595MB memory), so when the backlog was
    //    last seen EMPTY, skip the count for a while (audit 2026-07-21).
    const skipCount = lastEmptyAt !== 0 && Date.now() - lastEmptyAt < IDLE_BACKOFF_MS;
    if (!skipCount) {
      let remaining = 0;
      try {
        remaining = vectorRemaining();
      } catch {
        remaining = 0; // vector lane unavailable → fail-open, try next tick
      }
      if (remaining > 0) {
        lastEmptyAt = 0;
        log(`embed backlog ${remaining} — running embed (--all)`);
        await runStep("embed", ["memory", "embed", "--all"]);
        if (chainAbort) return;
      } else {
        lastEmptyAt = Date.now();
      }
    }
    if (chainAbort) return;

    // 3. digest — cheap when nothing changed (content-hash guard skips sessions
    //    already summarised), so it can run every chain.
    await runStep("digest", ["memory", "digest", "--all"]);
    if (chainAbort) return;

    // 4. backup — đã DỜI sang `backupTick()` (nhịp riêng). Xem chú thích ở đó: gọi từ trong
    //    chuỗi này làm backup chết theo công tắc `scheduler`.
    await backupTick("sau chuỗi bảo trì");
  } finally {
    // Nhả TRƯỚC khi hạ cờ: kẻ đang chờ token phải thấy nó trống, và một lượt `maintainTick`
    // mới không được vào lại giữa hai câu lệnh này rồi ăn mất lượt của người dùng.
    chainRunning = false;
    releaseDaemonJob();
    if (chainAbort) {
      chainAbort = false;
      log("đã nhường xong — chuỗi bảo trì sẽ chạy lại ở nhịp sau");
    }
  }
}

/**
 * 🔴 BACKUP KHÔNG ĐƯỢC TREO VÀO CÔNG TẮC CỦA MỘT TÍNH NĂNG KHÁC.
 *
 * Bản cũ đặt `rotateBackup()` làm bước 4 của `maintainTick`, và `maintainTick` return ngay ở
 * dòng đầu khi `getScheduler()` tắt ⇒ **tắt scheduler là tắt luôn backup**, không một dòng log,
 * không cổng nào thấy. Đó là lý do THẬT của "4 ngày không có bản sao lưu" (08/08 → 12/08) —
 * job không hỏng, nó chỉ không bao giờ được gọi. Cùng họ với lỗi bỏ đói autosync: **một công
 * tắc gánh ba việc**, người bật tưởng mình chỉ đang đổi một thứ.
 *
 * Backup là LƯỚI ĐỠ CUỐI CÙNG của kho (nó đã cứu kho thật ngày 04/08), nên nó phải sống độc
 * lập với mọi tính năng khác. Nhưng vẫn giữ hai ràng buộc cũ, vì cả hai đều có lý do:
 *  · nằm TRONG token job — chép 1,1 GB trong lúc scan/embed đang ghi đúng là kiểu tranh chấp
 *    mà sự cố 2026-08-03 nghi là nguyên nhân;
 *  · fail-open — backup hỏng không được giết thứ đang gọi nó (HP điều 9).
 * `rotateBackup` tự kiểm hạn (một bản/ngày, giữ 5) nên gọi mỗi 30 phút vẫn rẻ: một `readdir`.
 */
/**
 * Đếm số nhịp backup bị nhường LIÊN TIẾP. Tồn tại vì audit 2026-08-21 đo được: nhánh nhường
 * nằm TRƯỚC `try` nên nó **không nói gì** — 54 nhịp im lặng trong 27 giờ nhìn y như "mọi thứ ổn".
 * Một lần nhường là bình thường; nhường mãi là một kiểu HỎNG, và kiểu hỏng đó phải thấy được.
 */
let backupYields = 0;
const BACKUP_YIELD_LOG_EVERY = 8; // ~4 giờ ở nhịp 30 phút — thấy được mà không thành nhiễu

async function backupTick(why: string): Promise<void> {
  const holdsToken = chainRunning; // gọi từ trong chuỗi ⇒ token đã ở trong tay
  if (!holdsToken) {
    // Nhường theo ĐÚNG KHO mình sắp chép, không phải "có ai đang ghi trong thư mục này".
    // Trước 2026-08-21 chỗ này gọi `cliHoldsWrite()` — mà khoá là MỘT file cho cả `data/` nên
    // job re-embed kho SONG SONG (plan 19) giữ khoá 44 giờ đã bỏ đói backup của kho THẬT: hai
    // file khác nhau, không hề tranh nhau. Xem `writegate.cliHoldsWriteOn`.
    const target = currentMemoryDb();
    const blocker = child ? "daemon child" : syncJobRunning() ? "sync job" : cliHoldsWriteOn(target) ? (cliWriteHolder()?.label ?? "CLI") : null;
    if (blocker) {
      backupYields++;
      // Nói ở lượt ĐẦU (để biết vì sao im) rồi định kỳ (để biết nó vẫn đang im).
      if (backupYields === 1 || backupYields % BACKUP_YIELD_LOG_EVERY === 0) {
        const age = backupAgeMs(target);
        log(
          `backup nhường ${blocker} — lượt thứ ${backupYields} liên tiếp` +
            (age === null ? " · CHƯA có bản nào" : ` · bản mới nhất ${(age / 3_600_000).toFixed(1)} giờ tuổi`) +
            (backupStale(target).stale ? " · ⚠ QUÁ HẠN (doctor sẽ báo đỏ)" : ""),
        );
      }
      return;
    }
    if (!claimDaemonJob("backup")) return;
  }
  try {
    const b = await rotateBackup();
    if (b.wrote) {
      log(`backup (${why}) → ${b.outPath} (${b.bytes} byte)${b.pruned.length ? ` · dọn ${b.pruned.length} bản cũ` : ""}`);
      backupYields = 0;
    }
  } catch (e) {
    log(`backup bỏ qua: ${(e as Error).message}`); // điều 9: hỏng backup KHÔNG được giết ai
  } finally {
    if (!holdsToken) releaseDaemonJob();
  }
}

/**
 * Dọn thư mục nháp của host (`<temp>/claude/<project>/<session>/scratchpad`).
 *
 * Vì sao là JOB chứ không phải một dòng luật: đo 2026-08-20 trên đúng MỘT phiên làm việc nặng —
 * **3,97 GB** nằm im ở đó (model ONNX tải để đo, cache HuggingFace, profile trình duyệt). Không
 * ai dọn, không cổng nào kêu, và người dùng chỉ biết khi đĩa đầy. Nguyên văn user: *"đợi t kiểm
 * thì t ko nhớ và cũng lâu mới làm"*.
 *
 * KHÔNG nằm trong token job và KHÔNG hỏi công tắc nào: nó không đụng kho, không tranh ghi với ai
 * (chỉ đọc/xoá trong thư mục tạm của host), nên treo nó vào công tắc tính năng khác là tái diễn
 * đúng lỗi đã làm backup chết lặng 4 ngày. Fail-open như mọi lớp phụ (HP điều 9).
 */
function scratchTick(): void {
  try {
    const r = sweepScratchpads({ keepSession: process.env.CLAUDE_SESSION_ID });
    if (r.removed.length) {
      const mb = (n: number): string => (n / 1024 / 1024).toFixed(0);
      log(
        `dọn nháp: bỏ ${r.removed.length} phiên (${mb(r.removed.reduce((a, x) => a + x.bytes, 0))} MB) — ` +
          r.removed.map((x) => `${x.why} ${x.ageDays}d`).join(" · ") +
          ` · còn ${mb(r.keptBytes)} MB`,
      );
    }
  } catch (e) {
    log(`dọn nháp bỏ qua: ${(e as Error).message}`);
  }
}

// ── Tự kéo NỀN WEB ───────────────────────────────────────────────────────────
// 🔄 ĐẢO luật cũ *"scheduler nền KHÔNG được tự kéo web"* (cổng `scanweb-platforms.test.mjs`,
// lý do khi đó: *"10 phút một lần tự mở trình duyệt là sai"*).
//
// **User chốt 2026-08-28, và lý lẽ là của BỀ MẶT, không phải của code:** panel trái tab
// *Sync & Backup* bày `Web chat` thành các ô TICK, ngay cạnh khối *"AUTOMATION — what the
// daemon does when on"*. Đã tick mà 24 ngày không về thì bề mặt đang hứa một đằng làm một nẻo
// — đúng thứ `02_RULES §Bề mặt CHẾT THEO nền` gọi là NÓI DỐI. Nguyên văn: *"mọi source đã
// check là nó phải tự động vào kho chạy hết, ko dc thiếu mới đúng"*.
//
// Lý do CŨ không sai — nó chỉ hết đúng: cái sai là *cửa sổ nhảy vào mặt người dùng*, và điều
// đó nay giải được bằng `hidden` (Chrome thật, đẩy ra ngoài màn hình; đo 2026-08-28: kéo
// thành công 914 hội thoại được liệt kê, `status:done`, không cửa sổ nào hiện).
//
// Hai ràng buộc KHÔNG được bỏ:
//  · **ô KHÔNG tick ⇒ không đụng tới** — `scanWeb` tự trả `excluded`, và ở đây lọc TRƯỚC để
//    không tốn một lần mở trình duyệt cho lane người ta đã tắt;
//  · **hỏng là phải BÁO** (user: *"bất cứ source nào check vào mà nó lỗi ko kéo dc là phải
//    báo"*) ⇒ mọi kết cục ghi vào `setWebPull`, kể cả kết cục hỏng.

/** Phiên hết hạn thì lùi HẲN, đừng thử lại mỗi nhịp: kéo web cần NGƯỜI đăng nhập, nên thử
 *  lại dày chỉ tốn máy và đẻ cửa sổ ngầm, không bao giờ tự khỏi. */
const WEB_RETRY_AFTER_FAIL_MS = 6 * 60 * 60_000;
/** Lane đang khoẻ vẫn phải hỏi lại theo nhịp — nhưng thưa hơn maintain, vì mỗi lượt là một
 *  lần mở trình duyệt thật (đo: ~1 phút chỉ để khởi động + liệt kê). */
const WEB_EVERY_MS = 3 * 60 * 60_000;
let webRunning = false;

export function webLaneKey(platform: string, account: string): string {
  return account === "main" ? platform : `${platform}#${account}`;
}

/**
 * Khe `main` CHẾT VĨNH VIỄN — dừng tự thử, KHÔNG phải "lùi lâu hơn" (vá 2026-08-31).
 *
 * Vì sao khe `main` cần luật riêng: `accountsOf()` (webslots.ts) CỐ TÌNH luôn liệt kê `main`
 * dù thư mục profile của nó có tồn tại hay không — mọi khe KHÁC chỉ được kéo sau khi từng
 * đăng nhập thành công (`pullableAccountsOf`), riêng `main` thì không, vì nó là khe MẶC ĐỊNH
 * đầu tiên trước khi user biết tới khe số. Hệ quả đo được: khe `chatgpt` (main) hỏng từ
 * 2026-08-29, **0/0 lần kéo thành công** trong suốt log, và cứ mỗi ~6 giờ lại tự mở một cửa sổ
 * Brave (ẩn ngoài màn hình) rồi thất bại — mãi mãi, vì không dòng luật nào cho nó DỪNG.
 *
 * Điều kiện dừng, cả hai PHẢI đúng — hẹp có chủ đích, để không đụng khe `main` đang sống
 * (ví dụ `claude` main vẫn kéo được bình thường, KHÔNG được vá này chạm tới):
 *  ① kết cục GẦN NHẤT của `main` là `need-login` — tín hiệu DỨT KHOÁT "cần NGƯỜI đăng nhập lại",
 *    khác hẳn lỗi thoáng qua (`no-tab`/CDP rớt) mà lượt sau có thể tự qua;
 *  ② một khe SỐ của CÙNG nền đang có kết cục `ok:true` — chứng minh nền đó ĐÃ được phủ, `main`
 *    là bản trùng chết, không phải "chưa ai đăng nhập bao giờ".
 *
 * KHÔNG khoá vĩnh viễn theo nghĩa tuyệt đối: bấm Link/+ Thêm nguồn trên UI vẫn gọi thẳng
 * `scanWeb` (đường `probeOnly`/`/connect`), không đi qua `webPullTargets` — user tự tay đăng
 * nhập lại lúc nào cũng được, cái bị tắt chỉ là VÒNG TỰ THỬ NGẦM.
 */
export function deadMainLane(platform: string, pulled: Record<string, { ok: boolean; status: string }>): boolean {
  const own = pulled[platform];
  if (!own || own.status !== "need-login") return false;
  const prefix = `${platform}#`;
  return Object.entries(pulled).some(([lane, r]) => lane.startsWith(prefix) && r.ok === true);
}

/** Lane này tới lượt chưa? Hỏng gần đây ⇒ lùi; vừa chạy xong ⇒ chờ. */
export function webDue(prev: { at: string; ok: boolean } | undefined, now = Date.now()): boolean {
  if (!prev) return true; // chưa chạy lần nào
  const age = now - Date.parse(prev.at);
  if (!Number.isFinite(age)) return true; // dấu thời gian hỏng ⇒ coi như tới lượt, đừng kẹt vĩnh viễn
  return age >= (prev.ok ? WEB_EVERY_MS : WEB_RETRY_AFTER_FAIL_MS);
}

/**
 * Lane web nào ĐÁNG kéo lượt này — hàm THUẦN, để cổng đo được HÀNH VI.
 *
 * Tách ra vì bản đầu để logic này nằm trong `webTick` và cổng chỉ còn cách grep chữ trong
 * `scheduler.ts`. Chạy đột biến thì lộ ngay: sửa `dist` mà cổng vẫn xanh — nó soi FILE NGUỒN
 * chứ không soi hành vi, tức đúng loại "cổng trang trí" mà `02_RULES` bắt phải chứng minh
 * đỏ-được. Hàm thuần thì một đột biến vào chính nó làm cổng đỏ thật.
 *
 * Ba luật, mỗi luật trị một kiểu sai:
 *  · **ô KHÔNG tick ⇒ loại NGAY, trước cả khi hỏi tới lượt chưa** — `scanWeb` cũng tự loại,
 *    nhưng tới đó thì đã tốn một lần mở trình duyệt cho lane người ta đã tắt;
 *  · **hỏng thì lùi lâu hơn** — kéo web cần NGƯỜI đăng nhập, thử lại dày không bao giờ tự khỏi;
 *  · **`main` chết hẳn khi khe số đã phủ (`deadMainLane`) ⇒ loại KHỎI vòng tự thử ngầm** — lùi
 *    6 giờ vẫn là lùi, không phải dừng; khe này sẽ tự thử tới vô tận nếu không có luật riêng.
 */
export function webPullTargets(
  platforms: string[],
  accountsFor: (p: string) => string[],
  sourceOf: (p: string) => string | undefined,
  host: string,
  excludes: Parameters<typeof isExcluded>[1],
  pulled: Record<string, { at: string; ok: boolean; status: string }>,
  now = Date.now(),
): { platform: string; account: string; lane: string }[] {
  const out: { platform: string; account: string; lane: string }[] = [];
  for (const platform of platforms) {
    const source = sourceOf(platform);
    if (source && isExcluded({ origin: "web", host, source }, excludes)) continue;
    for (const account of accountsFor(platform)) {
      if (account === "main" && deadMainLane(platform, pulled)) continue;
      const lane = webLaneKey(platform, account);
      if (webDue(pulled[lane], now)) out.push({ platform, account, lane });
    }
  }
  return out;
}

/**
 * 🔴 NHƯỜNG THÌ PHẢI HẸN QUAY LẠI — lần thứ BA repo này trả giá cho cùng một hình dạng lỗi.
 *
 * Bản đầu của `webTick` (viết 2026-08-28) chỉ `return` khi gặp kẻ ghi khác, đợi hết chu kỳ
 * 20 phút. Bắt được NGAY trong lượt nghiệm thu đầu tiên: daemon khởi động → chuỗi bảo trì
 * chạy embed (30 phút → 3 giờ) → `webTick` bắn ở phút thứ 3, thấy `child`, bỏ lượt. Với nhịp
 * 20 phút và embed dài hàng giờ thì nó **không bao giờ tới lượt** — đúng thứ vừa làm auto-sync
 * đứng 19 giờ, và trước đó làm nó đứng 2,5 giờ hồi 12/08.
 *
 * Ghi ra đây vì bài học không phải "nhớ thêm retry": nó là **mọi việc nền phải giả định kẻ
 * chặn KHÔNG có lúc nghỉ**. Chống bỏ đói bằng "đợi chu kỳ sau" chỉ ăn khi máy có lúc rảnh —
 * mà đo thật thì backlog embed gần như không bao giờ về 0 (`plan/14 §3`).
 */
const WEB_RETRY_MS = 4 * 60_000;
let webRetry: ReturnType<typeof setTimeout> | null = null;

async function webTick(): Promise<void> {
  if (!getScheduler()) return;
  if (webRunning || chainRunning || child || syncJobRunning() || cliHoldsWrite()) {
    if (!webRetry) {
      webRetry = setTimeout(() => {
        webRetry = null;
        void webTick();
      }, WEB_RETRY_MS);
      webRetry.unref?.();
    }
    return;
  }
  // Danh sách việc dựng TRƯỚC khi giành token: nếu chẳng có lane nào tới lượt thì đừng đụng
  // vào cổng ghi — một lượt claim/release rỗng vẫn làm `memory_jobs` báo "đang bận".
  const todo = webPullTargets(
    platformsInUse(),
    pullableAccountsOf,
    (p) => PLATFORMS[p]?.source,
    hostname() || "unknown",
    getScopeExclude(),
    getWebPull(),
  );
  if (!todo.length) return;
  if (!claimDaemonJob("web-pull")) return;
  webRunning = true;
  try {
    for (const j of todo) {
      if (chainAbort) break; // nút người dùng bấm — nhường ngay, phần còn lại để nhịp sau
      try {
        const r = await scanWeb({ platform: j.platform, account: j.account, hidden: true }, (m) => log(`web ${j.lane}: ${m}`));
        const ok = r.status === "done";
        setWebPull(j.lane, { ok, status: r.status, pulled: r.pulled });
        log(
          ok
            ? `web ${j.lane}: kéo xong · +${r.pulled ?? 0} hội thoại (bỏ qua ${r.skipped ?? 0} · lỗi ${r.failed ?? 0})`
            : `🔴 web ${j.lane}: KHÔNG kéo được — ${r.status}${r.status === "need-login" ? " (cần đăng nhập lại; bảng Nguồn sẽ hiện ⚠)" : ""}`,
        );
      } catch (e) {
        const error = e instanceof Error ? e.message.slice(0, 200) : String(e);
        setWebPull(j.lane, { ok: false, status: "error", error });
        log(`🔴 web ${j.lane}: lỗi — ${error}`);
      }
    }
  } finally {
    webRunning = false;
    releaseDaemonJob();
    if (chainAbort) chainAbort = false;
  }
}

/**
 * 🔴 NHƯỜNG THÌ PHẢI QUAY LẠI — nếu không, nhường một lần là nhường mãi mãi.
 *
 * Bản cũ: bị chặn ⇒ `return`, đợi hết chu kỳ 30 phút. Nghe vô hại, nhưng ghép với việc hai
 * đồng hồ CÙNG chu kỳ và được tạo CÙNG một khoảnh khắc thì thành **bỏ đói vĩnh viễn**:
 * `maintainTick` đăng ký TRƯỚC nên tới hạn nó chạy trước, và nó chạy đồng bộ tới tận lúc
 * `spawn` (gán `child`) rồi mới nhả event loop — `syncTick` chạy ngay sau, thấy `child` ⇒ bỏ
 * lượt. Cứ thế mỗi 30 phút.
 *
 * Đo được 2026-08-12: bật scheduler lúc trưa ⇒ **2,5 giờ không một lượt sync nào**, Drive
 * trống trơn, không lỗi, không log. Trước đó autosync chạy đều **chỉ vì scheduler đang TẮT**
 * (maintainTick return sớm ⇒ không có `child` ⇒ sync thông đường). Tức bật một công tắc làm
 * chết một công tắc khác, và không cổng nào thấy.
 */
const SYNC_RETRY_MS = 3 * 60_000;
let syncRetry: ReturnType<typeof setTimeout> | null = null;

/**
 * Một dòng tóm tắt lượt sync THÀNH CÔNG, đọc từ JSON con in ra.
 *
 * Cần vì "OK" trơ trọi không phân biệt được *"đẩy 3.812 tin"* với *"không có gì để đẩy"* — và
 * chính ca 26/08 là một chuỗi lượt tưởng-như-xong. Đọc mềm (`unknown` → thu hẹp) vì đây là JSON
 * qua ống giữa hai tiến trình, không phải giá trị trong cùng process.
 */
export function describePush(result: unknown): string {
  const r = result as { push?: { kind?: string; messages?: number; bytes?: number }; embedded?: number } | undefined;
  if (!r?.push) return "";
  const { kind, messages = 0, bytes = 0 } = r.push;
  if (kind === "none") return " · không có gì để đẩy";
  return ` · ${kind} ${messages} tin / ${bytes} byte${r.embedded ? ` · nhúng thêm ${r.embedded}` : ""}`;
}

/**
 * AI đang giữ kho — hàm THUẦN để cổng đo được, và để câu báo gọi ĐÚNG TÊN kẻ chặn.
 *
 * Thứ tự xét giữ nguyên ngữ nghĩa cũ (`child || syncJobRunning() || cliHoldsWrite()`); phần
 * thêm chỉ là *nói ra* kẻ nào. Một câu "đang chờ" không kèm tên thì người đọc vẫn phải đi mò
 * log của ba thứ khác nhau — tức vẫn là im lặng, chỉ dài hơn.
 */
export function syncBlockedBy(s: {
  maintainChain: boolean;
  syncRunning: boolean;
  cliHolder: string | null;
  /**
   * Nhãn của kẻ đang giữ khe job DAEMON (`claimDaemonJob`), nếu có — `null` là rảnh.
   *
   * 🔴 Vì sao phải có chiều này (bug đo 2026-08-31): ba chiều trên KHÔNG phủ hết kẻ giữ token.
   * `web-pull` (scheduler §web) cũng `claimDaemonJob`, nhưng nó không phải `child` của chuỗi bảo
   * trì, không phải sync, không phải CLI ⇒ cổng này trả `null` = "rảnh" trong khi token đã bị
   * giữ. Hậu quả đo được trên log thật: 08:24:56 cổng cho "vào lượt" → scheduler tiêu mốc lịch,
   * mở sổ `autosyncRunAt`, in "starting background sync job" → rồi `claimDaemonJob("sync")` mới
   * thất bại vì `web-pull` đang giữ. Hai lượt (08:24:56 · 08:25:56) "starting" mà KHÔNG lượt nào
   * chạy, không kết cục nào được ghi, sổ kẹt mở ⇒ card Drive Sync báo đỏ "bị cắt giữa lượt" cho
   * một lượt CHƯA TỪNG khởi động. Đèn đỏ nói dối là đèn đỏ mất giá.
   */
  jobHolder?: string | null;
}): string | null {
  if (s.maintainChain) return "chuỗi bảo trì (scan/embed/digest)";
  if (s.syncRunning) return "một lượt sync đang chạy";
  // `"?"` = biết CÓ kẻ giữ nhưng không biết tên: cờ hold trong bộ nhớ daemon không mang nhãn, chỉ
  // khoá FILE mới có. Nói "không rõ tên" thật thà hơn là bịa một cái tên nghe cho gọn.
  if (s.cliHolder) return s.cliHolder === "?" ? "một lệnh CLI đang ghi kho (không rõ tên)" : `lệnh CLI ${s.cliHolder}`;
  // Xét CUỐI: ba chiều trên nói được câu CỤ THỂ hơn cho cùng một kẻ giữ (vd `sync` đã thành "một
  // lượt sync đang chạy"), nên chỉ khi không chiều nào nhận mới rơi về nhãn thô của token.
  if (s.jobHolder && s.jobHolder !== "sync") return `job ${s.jobHolder} đang giữ kho`;
  return null;
}

/** Đang trong một đợt chờ (đã in câu "đang chờ") — để không in lại câu đó mỗi 3 phút. */
let waitingSince = 0;

/**
 * 🔴 NHƯỜNG PHẢI NÓI RA, VÀ NHƯỜNG KHÔNG ĐƯỢC TIÊU MẤT SUẤT (vá 2026-08-30).
 *
 * Hai lỗ đo được cùng lượt, cùng một họ *"lùi trong im lặng"*:
 *  ① nhánh nhường `return` CÂM — không một dòng nào. Bằng chứng: `autosyncLastAt` chỉ tới
 *    06:00:50Z mà `daemon.log` KHÔNG có dòng `starting` nào ở mốc đó ⇒ cổng đã bắn, đã nhường,
 *    và người dùng đọc log thì thấy y như *"auto-sync không hề chạy"* (nguyên văn user:
 *    *"giờ tui chỉ thấy sync tay thôi"*).
 *  ② `syncGate` ghi mốc TRƯỚC khi biết lượt có chạy được không ⇒ nhường một cái là **ăn mất
 *    một suất 30′**. Cái cứu là `syncRetry` 3 phút, nhưng nó là biến TRONG TIẾN TRÌNH: daemon
 *    khởi động lại là mất hẹn, trong khi mốc thì đã bền hoá. Nay mốc chỉ tiêu khi lượt THẬT SỰ
 *    khởi động (hoặc khi không còn gì để làm), nên nhường bao lâu cũng không mất lượt.
 *
 * Trả verdict để `syncGate` và cổng test đọc được HÀNH VI, không phải đọc chữ trong log.
 */
type SyncTickVerdict = "started" | "blocked" | "off";

function syncTick(): SyncTickVerdict {
  // "off" cũng TIÊU suất, khác hẳn "blocked": công tắc tắt / chưa nối Drive là sự thật BỀN —
  // hỏi lại sau 60 s chỉ tốn một lượt đọc config mà không đổi được gì. Không tiêu ở đây thì
  // cổng 60 s quay vòng vô hạn. Kẻ chặn thì ngược lại: nó SẼ xong, nên suất phải giữ nguyên.
  if (!getAutosync() || !getDriveDir()) {
    setAutosyncLastAt(Date.now());
    return "off"; // no Drive folder linked → nothing to sync
  }
  const holder = syncBlockedBy({
    maintainChain: !!child,
    syncRunning: syncJobRunning(),
    cliHolder: cliWriteHolder()?.label ?? (cliHoldsWrite() ? "?" : null),
    jobHolder: daemonJobBusy(),
  });
  if (holder) {
    // Nhường kẻ đang ghi, nhưng HẸN QUAY LẠI sớm thay vì đợi hết chu kỳ.
    if (!syncRetry) {
      syncRetry = setTimeout(() => {
        syncRetry = null;
        syncTick();
      }, SYNC_RETRY_MS);
      syncRetry.unref?.();
    }
    // In MỘT lần cho mỗi đợt chờ, không phải mỗi 3 phút — tiếng ồn làm người ta bỏ qua log,
    // mà bỏ qua log đúng là cách ca 26/08 trôi 20 giờ.
    if (!waitingSince) {
      waitingSince = Date.now();
      log(`auto-sync — đang chờ ${holder}; thử lại mỗi ${Math.round(SYNC_RETRY_MS / 60_000)}′ (không mất lượt)`);
    }
    return "blocked";
  }
  if (waitingSince) {
    log(`auto-sync — kẻ chặn đã xong sau ${Math.round((Date.now() - waitingSince) / 60_000)}′, vào lượt`);
    waitingSince = 0;
  }
  // 🔴 KHÔNG tiêu mốc / KHÔNG mở sổ / KHÔNG in "starting" TRƯỚC KHI BIẾT LƯỢT CÓ CHẠY (vá 2026-08-31).
  //
  // Bản cũ làm cả ba việc đó ở đây rồi mới gọi `startSyncJob`, mà hàm đó còn một cửa thất bại NỮA
  // sau cổng trên: `claimDaemonJob("sync")` có thể trượt vì một job daemon khác đang giữ token —
  // và ở nhánh không-preempt nó THOÁT SỚM, **không gọi `onDone`**, tức `setAutosyncRunAt(null)`
  // không bao giờ chạy. Ba hậu quả cùng lúc, đo trên log thật 2026-08-31:
  //   ① sổ `autosyncRunAt` KẸT MỞ ⇒ lần daemon lên sau in 🔴 "bị cắt giữa lượt" cho một lượt CHƯA
  //      TỪNG khởi động, và card Drive Sync báo đỏ oan (chính cái làm user phải hỏi "lỗi này là sao");
  //   ② `autosyncLastAt` bị tiêu ⇒ MẤT SUẤT: đúng lỗi ② mà đợt 2026-08-30 đã vá cho nhánh `holder`,
  //      còn nhánh này bị bỏ sót — cùng một bug, hai đường vào, chỉ một đường được bịt;
  //   ③ log in "starting background sync job" hai lần (08:24:56 · 08:25:56) cho hai lượt KHÔNG chạy
  //      ⇒ dòng log đó nói dối, và nó là dòng người ta dựa vào để tin auto-sync còn sống.
  // Nay: gọi trước, chỉ ghi sổ khi `running` là THẬT. Callback của `startSyncJob` chạy từ event
  // 'exit'/'close' của con, tức KHÔNG THỂ bắn trước khi lời gọi này trả về, nên không có cửa sổ
  // đua nào mà callback đóng sổ rồi ta mở lại.
  const started = startSyncJob(onSyncOutcome, { lowPriority: true });
  if (!started.running) {
    // Không phải LỖI — là nhường. Nói ra (im lặng đúng là cách ca 26/08 trôi 20 giờ) và GIỮ suất:
    // `syncTick` hẹn lại, mốc lịch chưa tiêu nên lượt kế vẫn tới.
    if (!syncRetry) {
      syncRetry = setTimeout(() => {
        syncRetry = null;
        void syncTick();
      }, SYNC_RETRY_MS);
      syncRetry.unref?.();
    }
    if (!waitingSince) {
      waitingSince = Date.now();
      log(`auto-sync — chưa giành được kho (${started.error ?? "không rõ"}); thử lại mỗi ${Math.round(SYNC_RETRY_MS / 60_000)}′ (không mất lượt)`);
    }
    return "blocked";
  }
  // Mốc tiêu Ở ĐÂY, không ở `syncGate` — xem ② trên.
  setAutosyncLastAt(Date.now());
  // Sổ "đang chạy": còn sót lúc daemon lên = lượt này đã chết mà không kịp báo (xem `startScheduler`).
  setAutosyncRunAt(Date.now());
  log("auto-sync — starting background sync job");
  // lowPriority: lượt này do MÁY tự chạy. Nút "Đồng bộ ngay" gọi cùng hàm nhưng KHÔNG truyền cờ
  // — lúc đó người dùng đang ngồi chờ.
  // 🔴 LOG KẾT CỤC, không log "đã chạy xong" (2026-08-26). Câu cũ `auto-sync: job finished` in
  // ra Y HỆT nhau cho lượt đẩy được và lượt hỏng — nên khi lượt 26/08 chết với `UNKNOWN: unknown
  // error, write`, `daemon.log` vẫn chỉ nói "finished" và không ai biết có gì sai suốt 20 giờ
  // (watermark đứng, kênh chung phình bằng khối trùng). Một dòng log không phân biệt được
  // thành/bại thì nó không phải lớp quan sát, nó là tiếng ồn.
  return "started";
}

/** Kết cục một lượt tự sync — tách khỏi `syncTick` để lời gọi `startSyncJob` đứng TRƯỚC phần ghi sổ. */
function onSyncOutcome(s: SyncJobStatus): void {
  setAutosyncRunAt(null); // có kết cục ⇒ đóng sổ "đang chạy"
  // Kết cục vào SỔ BỀN cho card Drive Sync đọc — log là cho người đi soi, sổ là cho
  // dashboard: user chỉ nhìn dashboard, gãy tầng nào cũng phải hiện ở ĐÓ (user 2026-08-30).
  if (s.ok) setAutosyncLastResult({ ok: true, detail: describePush(s.result).replace(/^ · /, "") });
  else setAutosyncLastResult({ ok: false, kind: "fail", detail: s.error ?? "unknown" });
  if (s.ok) log(`auto-sync: OK${describePush(s.result)}`);
  else log(`🔴 auto-sync THẤT BẠI: ${s.error ?? "không rõ lý do"}`);
  // In ở CẢ HAI kết cục. Lượt THÀNH CÔNG cũng có thể mang cảnh báo đáng đọc — ví dụ
  // "Drive ném lỗi giả nhưng đếm lại thấy khối vẫn đủ"; nếu chỉ in khi hỏng thì đúng sự kiện
  // hiếm và đáng giá nhất lại là sự kiện bị nuốt.
  if (s.stderr) log(`auto-sync — chi tiết:\n${s.stderr}`);
}

/** Start the background loops. Idempotent — a second call is a no-op. */
export function startScheduler(): void {
  if (maintainTimer || syncTimer || backupTimer) return;
  // Khai với write-gate rằng chuỗi bảo trì NHƯỜNG được, để nút "Đồng bộ ngay" cắt vào giữa
  // một lượt embed dài thay vì bị từ chối. Đăng ký qua write-gate (không gọi thẳng) vì
  // `scheduler → syncjob` đã có sẵn, chiều ngược lại là import vòng tròn.
  registerJobYielder(yieldMaintainFor);
  maintainTimer = setInterval(() => void maintainTick(), MAINTAIN_EVERY_MS);
  // Nhịp kéo web: lệch pha để không tới hạn cùng lúc với maintain (cùng bài học bỏ đói ở
  // `syncTick`). Mồi một lượt sau 3 phút để máy vừa bật là nguồn web đã bắt đầu về, chứ
  // không phải chờ hết chu kỳ đầu.
  webTimer = setInterval(() => void webTick(), WEB_TICK_EVERY_MS);
  setTimeout(() => void webTick(), 3 * 60_000).unref?.();
  // Backup có ĐỒNG HỒ RIÊNG, KHÔNG hỏi `getScheduler()` — xem chú thích ở `backupTick()`.
  // Lệch pha 1/4 chu kỳ để không tới hạn cùng lúc với hai đồng hồ kia (cùng bài học bỏ đói).
  backupTimer = setInterval(() => void backupTick("nhịp riêng"), BACKUP_EVERY_MS);
  scratchTimer = setInterval(scratchTick, SCRATCH_EVERY_MS);
  setTimeout(scratchTick, 90_000).unref?.(); // mồi một lượt sau khi daemon ổn định
  // LỆCH PHA nửa chu kỳ: hai đồng hồ cùng chu kỳ mà tạo cùng lúc thì tới hạn CÙNG một khoảnh
  // khắc, và cái đăng ký trước luôn giành được lượt (xem chú thích ở syncTick). Đặt sync vào
  // giữa hai nhịp bảo trì để lúc nó tới hạn thì chuỗi kia đã xong từ lâu.
  // Đồng hồ sync nay là CỔNG 60 s hỏi lịch (`autosyncDue`): mặc định `interval 30′` = đúng nhịp cũ, tính từ mốc BỀN
  // trong config — restart không làm đồng hồ về 0. Tới hạn mà máy đang bận (scan/embed) thì `syncTick` tự hẹn lại 3′.
  syncTimer = setInterval(syncGate, 60_000);
  void SYNC_EVERY_MS;
  const backupStagger = setTimeout(() => void backupTick("nhịp riêng"), BACKUP_EVERY_MS / 4);
  backupStagger.unref?.();
  // The HTTP server keeps the process alive; don't let these timers do it.
  maintainTimer.unref?.();
  syncTimer.unref?.();
  backupTimer.unref?.();
  scratchTimer?.unref?.();
  // Kick the chain shortly after boot, then on the interval.
  setTimeout(() => void maintainTick(), 15_000).unref?.();
  // Backup được mồi RIÊNG — chuỗi trên có thể không bao giờ chạy (scheduler tắt), mà một máy
  // vừa khởi động lại sau nhiều ngày thì đó đúng là lúc cần hỏi "bản gần nhất cũ chưa?".
  setTimeout(() => void backupTick("mồi sau khởi động"), 60_000).unref?.();
  log(`started (maintain ${getScheduler() ? "on" : "off"}, auto-sync ${getAutosync() ? "on" : "off"}, backup luôn bật)`);
  // 🔴 Lượt trước chết mà không kịp báo thì PHẢI nói ra ở đây — đây là chỗ DUY NHẤT còn nói được.
  const note = interruptedRunNote(getAutosyncRunAt(), Date.now());
  if (note) {
    log(note);
    // Lượt bị cắt cũng là một KẾT CỤC — vào sổ bền cho dashboard, không chỉ vào log.
    setAutosyncLastResult({ ok: false, kind: "interrupted" });
    setAutosyncRunAt(null); // báo xong thì đóng sổ, không để nó kêu lại mỗi lần khởi động
  }
}

/**
 * Câu báo cho một lượt tự sync KHÔNG có kết cục — hàm THUẦN để cổng đo.
 *
 * Kết cục của lượt sync nằm trong callback của `startSyncJob`, tức sống trong tiến trình daemon.
 * Daemon bị giết giữa chừng ⇒ callback không bao giờ chạy ⇒ `daemon.log` chỉ còn một dòng
 * "starting" rồi im. Đo 2026-08-30 trên log thật: **7/11 lượt câm đúng kiểu đó**, và mỗi lượt câm
 * đọc y hệt một lượt chưa từng chạy. Sổ bền `autosyncRunAt` là thứ duy nhất bắc được cầu qua
 * ranh giới tiến trình để lần khởi động sau nói được câu này.
 */
export function interruptedRunNote(runAt: number | null, now: number): string | null {
  if (runAt === null) return null;
  const mins = Math.max(0, Math.round((now - runAt) / 60_000));
  return `🔴 auto-sync: lượt bắt đầu ${new Date(runAt).toISOString()} (${mins}′ trước) KHÔNG để lại kết cục — gần như chắc chắn bị cắt bởi lần khởi động lại này. Lượt kế sẽ đẩy bù phần còn thiếu.`;
}

/** Stop the loops and any running child (tests / shutdown). */
export function stopScheduler(): void {
  if (maintainTimer) clearInterval(maintainTimer);
  if (syncTimer) clearInterval(syncTimer);
  if (backupTimer) clearInterval(backupTimer);
  if (scratchTimer) clearInterval(scratchTimer);
  if (webTimer) clearInterval(webTimer);
  maintainTimer = syncTimer = backupTimer = scratchTimer = webTimer = null;
  chainRunning = false;
  if (child) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    child = null;
    releaseDaemonJob();
  }
}
