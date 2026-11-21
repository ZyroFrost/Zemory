import { closeSync, existsSync, openSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = new URL("../../dist", import.meta.url);

/** How long a build waits for Windows to release a file a just-stopped process still holds. */
export const LOCK_WAIT_MS = 20_000;
const LOCK_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

/**
 * Run `op` and retry while it fails on a file lock. Measured 2026-11 (laptop twice, PC once): the first build after
 * stopping the daemon failed with EPERM because zemory.exe had not fully exited yet - Windows keeps a loaded image
 * locked for a moment after the process is told to stop. `clean` had then emptied dist/ and the daemon could not
 * start. Waiting for the lock to go away makes that first build succeed; a lock that outlives the wait is a process
 * that really is still running, and the error is thrown as before.
 */
export function retryOnLock(op, { waitMs = LOCK_WAIT_MS, stepMs = 250, sleep = sleepSync } = {}) {
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      return op();
    } catch (e) {
      if (!e || !LOCK_CODES.has(e.code) || Date.now() >= until) throw e;
      sleep(stepMs);
    }
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Throws EBUSY/EPERM while a process runs from `exe`: Windows refuses to open a loaded image for writing. Asked BEFORE
 * anything is deleted - a recursive delete removes every other file first and only then trips on the exe, so a build
 * started beside a running daemon left dist/ holding nothing but zemory.exe and zemory broken until a rebuild
 * (PC 2026-11-22, a vectors job running from dist/ at the time).
 */
export function assertNotRunning(exe) {
  if (existsSync(exe)) closeSync(openSync(exe, "r+"));
}

function main() {
  try {
    retryOnLock(() => assertNotRunning(fileURLToPath(new URL("zemory.exe", dist + "/"))));
    retryOnLock(() => rmSync(dist, { recursive: true, force: true }));
  } catch (e) {
    // EPERM/EBUSY past the wait is almost always one cause: the daemon still runs from dist/zemory.exe and Windows
    // locks a loaded image. The bare `rm` error does not say so, and the reader suspects folder permissions instead.
    // Measured 2026-09-18: deleting the running 89 MB exe returns `EPERM, Permission denied ... dist\zemory.exe`.
    if (e && LOCK_CODES.has(e.code)) {
      console.error(`clean: không xoá được ${fileURLToPath(dist)} (đã đợi ${LOCK_WAIT_MS / 1000} s cho khoá nhả)`);
      console.error(`  ${e.code}: có tiến trình đang GIỮ tệp trong dist/ — gần như chắc chắn là daemon`);
      console.error("  chạy dưới dist/zemory.exe (Windows khoá ảnh đang nạp).");
      console.error("  → tắt daemon rồi dựng lại. Cập nhật một-nút thì dùng `zemory selfupdate` hoặc");
      console.error("    nút “Cập nhật ngay” — cả hai tự tiễn daemon trước khi dựng.");
      process.exit(1);
    }
    throw e;
  }
}

const isMain = (p) => !!p && resolve(p).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain(process.argv[1])) main();
