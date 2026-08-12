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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAutosync, getDriveDir, getScheduler } from "../config/settings.js";
import { rotateBackup } from "../memory/backup-rotate.js";
import { currentMemoryDb } from "../memory/db.js";
import { verifyMemory } from "../memory/salvage.js";
import { vectorRemaining } from "../memory/vectors.js";
import { claimDaemonJob, cliHoldsWrite, releaseDaemonJob } from "./writegate.js";
import { startSyncJob, syncJobRunning } from "./syncjob.js";

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

let maintainTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let child: ChildProcess | null = null;
let chainRunning = false; // a maintain chain is between claim and release
let lastEmptyAt = 0; // when vectorRemaining() last returned 0

function log(msg: string): void {
  // Daemon-side background log; the UI Drive panel surfaces sync results too.
  console.error(`[zemory scheduler] ${msg}`);
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
      c = spawn(process.execPath, [cliEntry(), ...args], {
        stdio: "ignore",
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
    const done = (code: number): void => {
      if (child === c) child = null;
      resolve(code);
    };
    c.on("exit", (code) => {
      log(`${label}: finished (exit ${code ?? "?"})`);
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
    await runStep("scan", ["memory", "scan"]);

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
      } else {
        lastEmptyAt = Date.now();
      }
    }

    // 3. digest — cheap when nothing changed (content-hash guard skips sessions
    //    already summarised), so it can run every chain.
    await runStep("digest", ["memory", "digest", "--all"]);

    // 4. backup — MỘT bản/ngày, giữ 5 bản. Chạy ở ĐÂY chứ không phải một timer riêng vì
    //    nó phải nằm TRONG token job: chép 1,1 GB trong lúc scan/embed đang ghi là chính
    //    cái kiểu tranh chấp mà sự cố 2026-08-03 nghi là nguyên nhân. `rotateBackup` tự
    //    kiểm hạn nên gọi mỗi vòng 30 phút vẫn rẻ (một lần `readdir`).
    try {
      const b = await rotateBackup();
      if (b.wrote) log(`backup → ${b.outPath} (${b.bytes} byte)${b.pruned.length ? ` · dọn ${b.pruned.length} bản cũ` : ""}`);
    } catch (e) {
      log(`backup bỏ qua: ${(e as Error).message}`); // điều 9: hỏng backup KHÔNG được giết chuỗi
    }
  } finally {
    chainRunning = false;
    releaseDaemonJob();
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

function syncTick(): void {
  if (!getAutosync()) return;
  if (!getDriveDir()) return; // no Drive folder linked → nothing to sync
  if (child || syncJobRunning() || cliHoldsWrite()) {
    // Nhường kẻ đang ghi, nhưng HẸN QUAY LẠI sớm thay vì đợi hết chu kỳ.
    if (!syncRetry) {
      syncRetry = setTimeout(() => {
        syncRetry = null;
        syncTick();
      }, SYNC_RETRY_MS);
      syncRetry.unref?.();
    }
    return;
  }
  log("auto-sync — starting background sync job");
  startSyncJob(() => log("auto-sync: job finished"));
}

/** Start the background loops. Idempotent — a second call is a no-op. */
export function startScheduler(): void {
  if (maintainTimer || syncTimer) return;
  maintainTimer = setInterval(() => void maintainTick(), MAINTAIN_EVERY_MS);
  // LỆCH PHA nửa chu kỳ: hai đồng hồ cùng chu kỳ mà tạo cùng lúc thì tới hạn CÙNG một khoảnh
  // khắc, và cái đăng ký trước luôn giành được lượt (xem chú thích ở syncTick). Đặt sync vào
  // giữa hai nhịp bảo trì để lúc nó tới hạn thì chuỗi kia đã xong từ lâu.
  syncTimer = setInterval(syncTick, SYNC_EVERY_MS);
  const stagger = setTimeout(syncTick, SYNC_EVERY_MS / 2);
  stagger.unref?.();
  // The HTTP server keeps the process alive; don't let these timers do it.
  maintainTimer.unref?.();
  syncTimer.unref?.();
  // Kick the chain shortly after boot, then on the interval.
  setTimeout(() => void maintainTick(), 15_000).unref?.();
  log(`started (maintain ${getScheduler() ? "on" : "off"}, auto-sync ${getAutosync() ? "on" : "off"})`);
}

/** Stop the loops and any running child (tests / shutdown). */
export function stopScheduler(): void {
  if (maintainTimer) clearInterval(maintainTimer);
  if (syncTimer) clearInterval(syncTimer);
  maintainTimer = syncTimer = null;
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
