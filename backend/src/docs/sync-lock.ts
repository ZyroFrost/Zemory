// plan/29 §14e ③ — two syncs at once never write the same folder at the same time. Since repos change HS themselves, two
// sessions can run `zemory sync` together: both rebuild the same set folder, or a manager and a repo both write that repo.
// Each such write runs under a lock file beside what it writes (runtime state, `.harness-state/`, never committed).
//
// Advisory and bounded, like the memory write lock (jobs/writegate.ts): a lock whose process is gone or that is older
// than STALE_MS is taken over, so a crashed sync never wedges the next one. Every zemory process of a machine runs in one
// place (the container, or the native install), so the holder's pid can be asked.

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";

const STALE_MS = 15 * 60_000;
const WAIT_MS = 120_000;
const POLL_MS = 250;

interface Holder {
  pid: number;
  label: string;
  at: number;
}

/** Locks this process holds, with how deep: a manager's sync takes the set lock once and its repos' syncs reenter it. */
const held = new Map<string, number>();

function alive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Who holds the lock, or null when it is free (no file, unreadable, its process gone, or stale). */
export function lockHolder(file: string, now = Date.now()): Holder | null {
  try {
    const h = JSON.parse(readFileSync(file, "utf8")) as Holder;
    if (!Number.isFinite(h?.pid) || !Number.isFinite(h?.at)) return null;
    if (now - h.at > STALE_MS || !alive(h.pid)) return null;
    return h;
  } catch {
    return null;
  }
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** `.harness-state/` keeps itself out of git, as in every repo: a folder made here gets the same ignore-all file. */
function ensureStateDir(dir: string): void {
  if (existsSync(dir)) return;
  mkdirSync(dir, { recursive: true });
  if (dir.endsWith(".harness-state")) writeFileSync(join(dir, ".gitignore"), "*\n");
}

/**
 * Run `fn` holding the lock `file`. Another live holder ⇒ wait up to `waitMs`, then give up with who holds it (the caller
 * prints it; nothing is written). The lock is created atomically (`wx`), so two processes never both believe they hold it.
 */
export function withLock<T>(file: string, label: string, fn: () => T, waitMs = WAIT_MS): T | { error: string } {
  const depth = held.get(file) ?? 0;
  if (depth) {
    held.set(file, depth + 1);
    try {
      return fn();
    } finally {
      held.set(file, depth);
    }
  }
  ensureStateDir(dirname(file));
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      const fd = openSync(file, "wx");
      try {
        writeSync(fd, JSON.stringify({ pid: process.pid, label, at: Date.now() } satisfies Holder));
      } finally {
        closeSync(fd);
      }
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const h = lockHolder(file);
      if (!h) {
        // its process is gone or it is stale: take it over (another waiter may win the next `wx`, which is fine)
        rmSync(file, { force: true });
        continue;
      }
      if (Date.now() >= until) return { error: `${label}: another sync is writing (pid ${h.pid}, ${h.label}, since ${new Date(h.at).toISOString()}) - run it again when that one ends` };
      sleep(POLL_MS);
    }
  }
  held.set(file, 1);
  try {
    return fn();
  } finally {
    held.delete(file);
    // only our own lock: one that went stale under us may already be another process's
    try {
      if ((JSON.parse(readFileSync(file, "utf8")) as Holder).pid === process.pid) rmSync(file, { force: true });
    } catch {
      /* already gone */
    }
  }
}
