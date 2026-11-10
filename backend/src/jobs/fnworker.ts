// Run ONE heavy synchronous function of a module in a WORKER THREAD, so the daemon does not stall.
//
// Measured 2026-09-25 with a CPU profiler on the real daemon (pings interleaved, first 180 s after start): 11 stalls,
// 18.5 s in all. The culprit was a FAMILY of synchronous work run straight on the event loop - listing browsers with
// `execFileSync` (2.4 s), reading the presence table on the Drive (1.4 s), sweeping scratch/profile folders with
// `statSync`/`readdirSync` (~2.5 s)... Making each function async means changing many call sites (tests call them
// synchronously); the functions stay, only WHERE they run changes: the daemon calls them through here.
//
// The result must be plain data (structured clone). A failing / overdue function gives `{ ok: false, error }`, never a
// throw - the caller decides: skip the round (housekeeping) or use an empty value (fail-open, HP article 9).
import { Worker } from "node:worker_threads";

const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
import(workerData.mod)
  .then((m) => Promise.resolve(m[workerData.fn](...workerData.args)))
  .then((value) => parentPort.postMessage({ ok: true, value }))
  .catch((e) => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
`;

// `timedOut`: the work ran past its limit. A caller must NOT then run it on the event loop: work too slow for a worker
// (a repo walk through a Docker mount) freezes the daemon there - measured 2026-10-22, /ping silent for 30 s at a time.
export type WorkerResult<T> = { ok: true; value: T } | { ok: false; error: string; timedOut?: boolean };

/**
 * `modFromDist` is the path under `dist/`, e.g. `"platform/browsersweep.js"`.
 * Default ceiling 2 minutes: enough for a large sweep, and an outside command (WMI/PowerShell) that hangs is cut instead
 * of holding the worker for ever - the daemon never waits for it.
 * `unref`: the worker does not keep the process alive - a background refresh a short-lived CLI or test need not wait for.
 */
export function runInWorker<T>(modFromDist: string, fn: string, args: unknown[] = [], timeoutMs = 120_000, opts: { unref?: boolean } = {}): Promise<WorkerResult<T>> {
  return new Promise((resolve) => {
    let w: Worker;
    try {
      const mod = new URL(`../${modFromDist}`, import.meta.url).href;
      w = new Worker(WORKER_SRC, { eval: true, workerData: { mod, fn, args } });
      if (opts.unref) w.unref();
    } catch (e) {
      return resolve({ ok: false, error: `could not start the worker: ${e instanceof Error ? e.message : String(e)}` });
    }
    let done = false;
    const finish = (r: WorkerResult<T>): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void w.terminate().catch(() => {});
      resolve(r);
    };
    const timer = setTimeout(() => finish({ ok: false, error: `over ${Math.round(timeoutMs / 1000)} s`, timedOut: true }), timeoutMs);
    timer.unref?.();
    w.once("message", (m: WorkerResult<T>) => finish(m));
    w.once("error", (e) => finish({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    w.once("exit", (code) => finish({ ok: false, error: `worker exited (code ${code}) before returning a result` }));
  });
}
