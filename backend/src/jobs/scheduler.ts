// Idle background scheduler (plan 14 §6.B) — runs INSIDE the `zemory ui` daemon
// so the memory keeps itself current without the user asking:
//   • embed loop  — clear the vector backlog (opt-OUT: `scheduler`, default ON)
//   • auto-sync   — when data drifts, push/pull the encrypted Drive bundle (opt-in: autosync)
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
import { getAutosync, getDriveDir, getScheduler } from "../settings.js";
import { vectorRemaining } from "../memory/vectors.js";
import { claimDaemonJob, cliHoldsWrite, releaseDaemonJob } from "./writegate.js";
import { startSyncJob, syncJobRunning } from "./syncjob.js";

const EMBED_EVERY_MS = 5 * 60_000; // check the vector backlog every 5 min
const SYNC_EVERY_MS = 30 * 60_000; // check Drive drift every 30 min
// The backlog count is a full anti-join (messages NOT IN vec_chunks) run
// synchronously on the event loop — hundreds of ms on a 595MB memory. When the
// backlog was last seen EMPTY, back off to the sync cadence instead of paying
// that scan every 5 minutes (audit 2026-07-21).
const IDLE_BACKOFF_MS = 30 * 60_000;

let embedTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let child: ChildProcess | null = null;
let lastEmptyAt = 0; // when vectorRemaining() last returned 0

function log(msg: string): void {
  // Daemon-side background log; the UI Drive panel surfaces sync results too.
  console.error(`[zemory scheduler] ${msg}`);
}

/** dist/jobs/scheduler.js → its sibling dist/cli.js. */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/** True while THIS module's embed child is alive. */
export function schedulerChildRunning(): boolean {
  return child !== null;
}

function embedTick(): void {
  if (child || syncJobRunning() || cliHoldsWrite() || !getScheduler()) return; // yield to any other writer
  if (lastEmptyAt && Date.now() - lastEmptyAt < IDLE_BACKOFF_MS) return; // backlog was empty — skip the scan
  let remaining: number;
  try {
    remaining = vectorRemaining();
  } catch {
    return; // vector lane unavailable → fail-open, try next tick
  }
  if (remaining <= 0) {
    lastEmptyAt = Date.now();
    return;
  }
  lastEmptyAt = 0;
  if (!claimDaemonJob("embed")) return;
  log(`embed backlog ${remaining} — spawning background embed (--all)`);
  let c: ChildProcess;
  try {
    // ZEMORY_DAEMON_CHILD: the child skips the CLI write-gate — THIS daemon
    // already holds the job token for it (gating made it wait on itself).
    c = spawn(process.execPath, [cliEntry(), "memory", "embed", "--all"], {
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, ZEMORY_DAEMON_CHILD: "1" },
    });
  } catch (e) {
    releaseDaemonJob();
    log(`embed: could not spawn (${e instanceof Error ? e.message : e})`);
    return;
  }
  child = c;
  c.on("exit", (code) => {
    log(`embed: background pass finished (exit ${code ?? "?"})`);
    if (child === c) child = null;
    releaseDaemonJob();
  });
  c.on("error", (e) => {
    log(`embed: child error ${e instanceof Error ? e.message : e}`);
    if (child === c) child = null;
    releaseDaemonJob();
  });
}

function syncTick(): void {
  if (child || syncJobRunning() || cliHoldsWrite() || !getAutosync()) return; // yield to any other writer
  if (!getDriveDir()) return; // no Drive folder linked → nothing to sync
  log("auto-sync — starting background sync job");
  startSyncJob(() => log("auto-sync: job finished"));
}

/** Start the background loops. Idempotent — a second call is a no-op. */
export function startScheduler(): void {
  if (embedTimer || syncTimer) return;
  embedTimer = setInterval(embedTick, EMBED_EVERY_MS);
  syncTimer = setInterval(syncTick, SYNC_EVERY_MS);
  // The HTTP server keeps the process alive; don't let these timers do it.
  embedTimer.unref?.();
  syncTimer.unref?.();
  // Kick an embed check shortly after boot, then on the interval.
  setTimeout(embedTick, 15_000).unref?.();
  log(`started (embed ${getScheduler() ? "on" : "off"}, auto-sync ${getAutosync() ? "on" : "off"})`);
}

/** Stop the loops and any running child (tests / shutdown). */
export function stopScheduler(): void {
  if (embedTimer) clearInterval(embedTimer);
  if (syncTimer) clearInterval(syncTimer);
  embedTimer = syncTimer = null;
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
