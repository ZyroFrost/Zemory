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

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

/** `<memory dir>/logs` — the data-dir logs folder (moves with `memory relocate`).
 *  NOT `~/.zemory/logs`: the comment used to say that, and a later session went
 *  looking there, found nothing, and concluded there were no logs at all. Home
 *  only ever holds `location.json`; everything else lives beside the store. */
function logsDir(): string {
  const dir = join(currentMemoryDir(), "logs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Append one ISO-timestamped line to daemon.log AND mirror it to stderr. */
/**
 * NHỊP TIM — dấu vết DUY NHẤT còn lại khi daemon bị GIẾT CỨNG.
 *
 * Đo 2026-08-10 trên một ca chết thật: KHÔNG có `shutting down`, KHÔNG có
 * `process exit code=`, KHÔNG có `report.*.json`, và Windows cũng không ghi
 * `Application Error` nào cho `node.exe`. Bốn nguồn cùng im lặng loại trừ hết các
 * đường thoát đi qua Node (tín hiệu · tray · uncaughtException · exit sạch) — còn
 * lại đúng một khả năng: **TerminateProcess từ bên ngoài**, và ca đó thì tiến trình
 * KHÔNG kịp chạy bất kỳ handler nào.
 *
 * ⇒ Hộp đen trong tiến trình về NGUYÊN TẮC không bắt được ca này. Thứ duy nhất còn
 * dùng được là dấu vết ghi TRƯỚC lúc chết: mỗi nhịp ghi đè một mốc thời gian, nên
 * lần sau ta biết nó chết trong PHÚT nào mà đối chiếu với nhật ký hệ thống, áp lực
 * RAM, hay việc người dùng vừa làm. Ghi đè (không nối) để file không phình.
 */
export function daemonHeartbeat(): void {
  try {
    mkdirSync(logsDir(), { recursive: true });
    writeFileSync(join(logsDir(), "daemon-heartbeat"), `${new Date().toISOString()} pid=${process.pid}\n`);
  } catch {
    /* nhịp tim là chẩn đoán, hỏng thì thôi — không được làm daemon chết theo */
  }
}

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
 *  into the same logs dir. This is the ONLY way to see where a native-addon crash
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
