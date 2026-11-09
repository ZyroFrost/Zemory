// The once-per-session "harness behind" check of the prompt hook, in a WORKER THREAD — never on the daemon's event loop.
//
// Measured 2026-11-09 (stack taken through the inspector): handleHook → kitBehind → guardDrift → buildPolicy →
// findSqlStores walked a whole repo tree with readdirSync over the container's 9p mount, and the daemon answered nothing —
// not /ping, not the next hook — for minutes after a restart. The note is a reminder: it may arrive one prompt late.
import { Worker } from "node:worker_threads";
import { writeFileAtomic } from "../util/fs-atomic.js";

const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
import(workerData.mod)
  .then((m) => parentPort.postMessage({ ok: true, note: m.harnessNote(workerData.here) }))
  .catch((e) => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
`;

/** Past this the check is broken, not slow: the worker is dropped and the session simply gets no note (HP article 9). */
const TIMEOUT_MS = 30 * 60_000;

/** Repos with a check running: two sessions opening in one repo share one walk. */
const running = new Set<string>();

/** Run harnessNote(here) in a worker; a non-empty answer is written to `notePath` for the session's next prompt. */
export function harnessNoteInWorker(here: string, notePath: string): Promise<void> {
  return new Promise((resolve) => {
    if (running.has(here)) return resolve();
    let w: Worker;
    try {
      const mod = new URL("../memory/capture-hook.js", import.meta.url).href;
      w = new Worker(WORKER_SRC, { eval: true, workerData: { mod, here } });
    } catch {
      return resolve();
    }
    running.add(here);
    let done = false;
    const finish = (note: string): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      running.delete(here);
      void w.terminate().catch(() => {});
      try {
        if (note) writeFileAtomic(notePath, note);
      } catch {
        /* fail-open: no note */
      }
      resolve();
    };
    const timer = setTimeout(() => finish(""), TIMEOUT_MS);
    timer.unref?.();
    w.once("message", (m: { ok: boolean; note?: string }) => finish(m.ok && typeof m.note === "string" ? m.note : ""));
    w.once("error", () => finish(""));
    w.once("exit", () => finish(""));
  });
}
