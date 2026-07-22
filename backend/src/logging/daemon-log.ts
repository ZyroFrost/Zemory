// Black-box logger for the long-running daemon.
//
// The daemon exited with code 1 once (2026-07-21) and left NOTHING in stderr —
// not even the lifecycle lines the JS black box prints. Two failure modes explain
// that, and this module closes both:
//   1. A NATIVE crash (a segfault inside better-sqlite3 / onnxruntime) tears the
//      process down before any JS handler — uncaughtException included — can run.
//      Node's diagnostic report is the only thing that captures WHERE a native
//      fatal happened, so we arm it to dump a JSON report (with a native stack)
//      next to the log.
//   2. When the daemon is detached (autostart / tray), its stderr is not attached
//      to any console, so console.error goes nowhere. Mirroring every lifecycle
//      line to a FILE means the next boot can always see how the last one died.
//
// Fail-open at every step (HP điều 9): logging must never be the thing that kills
// the process it exists to record.

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

/** ~/.zemory/logs — the data-dir logs folder (moves with `memory relocate`). */
function logsDir(): string {
  const dir = join(currentMemoryDir(), "logs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Append one ISO-timestamped line to daemon.log AND mirror it to stderr. */
export function daemonLog(line: string): void {
  const msg = `${new Date().toISOString()} ${line}`;
  console.error(msg);
  try {
    appendFileSync(join(logsDir(), "daemon.log"), msg + "\n");
  } catch {
    /* disk full / permission — never let logging crash the daemon */
  }
}

/** Arm Node's diagnostic report so a FATAL error (native segfault, OOM, or an
 *  uncaught JS exception) writes a report.*.json with a full native + JS stack
 *  into ~/.zemory/logs. This is the ONLY way to see where a native-addon crash
 *  occurred, because no JS handler ever runs for it. Fail-open on older runtimes
 *  where process.report is unavailable. */
export function armCrashReport(): void {
  try {
    const rep = process.report;
    if (!rep) return;
    rep.directory = logsDir();
    rep.reportOnFatalError = true;
    rep.reportOnUncaughtException = true;
    rep.reportOnSignal = false;
  } catch {
    /* process.report missing / not writable — fail-open */
  }
}
