// THE WRITE QUEUE of the local store (plan/24 §12.7 — user 2026-10-12: "1 hàng đưa vào và 1 hàng nhúng").
//
// Two queues, one store. Heavy work that does NOT write — computing vectors with the ONNX model, ~2 s per text window — runs
// freely in parallel. Every WRITE to the store takes a turn here, first come first served, and holds it only for the
// write itself (ms for a vector batch, seconds for a merge). Before this, the daemon's one job slot covered whole jobs:
// a 30′ round held it 12′17″ while it embedded (measured 12/10), and nothing else could merge or send.
//
// Why not just let everyone write: the store was corrupted on 2026-08-03 with several processes writing at once
// (`writegate.ts`). The queue keeps exactly one writer; it only stops counting computing as writing.
//
// Mechanism: a ticket per writer in `<store dir>/write-turn/` named `<ms>-<pid>-<seq>` — the oldest ticket whose process
// is alive holds the turn. Cross-process (files), same-process too (each acquire is its own ticket, so order = order of
// asking). A ticket of a dead pid is skipped and removed; a ticket older than TURN_STALE_MS is treated as abandoned
// (fail-open, art. 9: the queue must never jam for good).

import { mkdirSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

/** Poll interval while waiting for the turn. Turns last ms–seconds, so waiting a full second (the channel lock's step) is waste. */
export const TURN_POLL_MS = 25;
/** A ticket this old is abandoned (a writer hung or killed without cleanup on another OS user) — never wait on it. */
export const TURN_STALE_MS = 10 * 60_000;

let seq = 0;

function turnDir(dir?: string): string {
  return dir ?? join(currentMemoryDir(), "write-turn");
}

function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

const pidOf = (ticket: string): number => Number(ticket.split("-")[1]);

/** The ticket holding the turn now, after dropping dead / abandoned ones. */
function head(dir: string): string | null {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".t"));
  } catch {
    return null;
  }
  names.sort();
  for (const n of names) {
    let old: boolean;
    try {
      old = Date.now() - statSync(join(dir, n)).mtimeMs > TURN_STALE_MS;
    } catch {
      continue; // released between list and stat
    }
    if (pidAlive(pidOf(n)) && !old) return n;
    rmSync(join(dir, n), { force: true }); // dead or abandoned — never let it jam the queue
  }
  return null;
}

function takeTicket(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const name = `${String(Date.now()).padStart(15, "0")}-${process.pid}-${String(seq++).padStart(6, "0")}.t`;
  writeFileSync(join(dir, name), "");
  return name;
}

/** While held, a turn beats (mtime) so a long write — the first merge of a big channel — is never read as abandoned. */
const TURN_BEAT_MS = 60_000;

const releaser = (dir: string, name: string, beat: boolean) => {
  let done = false;
  const t = beat
    ? setInterval(() => {
        try {
          const now = new Date();
          utimesSync(join(dir, name), now, now);
        } catch {
          /* a missed beat is not fatal — TURN_STALE_MS is ten of them */
        }
      }, TURN_BEAT_MS)
    : null;
  t?.unref?.();
  return (): void => {
    if (done) return;
    done = true;
    if (t) clearInterval(t);
    rmSync(join(dir, name), { force: true });
  };
};

/** Wait for the write turn. Returns the release function — call it in `finally`. */
export async function acquireWriteTurn(o: { dir?: string; signal?: { aborted: boolean } } = {}): Promise<() => void> {
  const dir = turnDir(o.dir);
  const name = takeTicket(dir);
  for (;;) {
    if (o.signal?.aborted) {
      rmSync(join(dir, name), { force: true });
      throw new Error("cancelled while waiting for the store write turn");
    }
    if (head(dir) === name) return releaser(dir, name, true);
    await new Promise((r) => setTimeout(r, TURN_POLL_MS));
  }
}

/**
 * Synchronous variant for a caller that cannot await (the capture hook ingests synchronously). Gives up after
 * `maxWaitMs` and returns null — the caller then defers instead of waiting (an answer must never hang on the queue).
 */
export function tryWriteTurnSync(maxWaitMs: number, o: { dir?: string } = {}): (() => void) | null {
  const dir = turnDir(o.dir);
  const name = takeTicket(dir);
  const until = Date.now() + Math.max(0, maxWaitMs);
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    if (head(dir) === name) return releaser(dir, name, false); // the hook's write is short and synchronous — no beat
    if (Date.now() >= until) {
      rmSync(join(dir, name), { force: true });
      return null;
    }
    Atomics.wait(nap, 0, 0, TURN_POLL_MS);
  }
}

/** Run `fn` inside one write turn. */
export async function withWriteTurn<T>(fn: () => Promise<T> | T, o: { dir?: string } = {}): Promise<T> {
  const release = await acquireWriteTurn(o);
  try {
    return await fn();
  } finally {
    release();
  }
}
