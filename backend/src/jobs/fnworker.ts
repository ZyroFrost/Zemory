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
import { spawn } from "node:child_process";
import { Worker } from "node:worker_threads";

// `__workerStep(name)`: the function names the step it enters, so a run cut at its ceiling says WHERE it was (a stop hook
// ended at 50 s nine times 24-26/11 and no single step was slow when measured alone).
const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
globalThis.__workerStep = (s) => parentPort.postMessage({ step: String(s) });
import(workerData.mod)
  .then((m) => Promise.resolve(m[workerData.fn](...workerData.args)))
  .then((value) => parentPort.postMessage({ ok: true, value }))
  .catch((e) => parentPort.postMessage({ ok: false, error: String((e && e.message) || e) }));
`;

// The same, in a CHILD PROCESS (isolate: "process"): the job arrives over IPC, the result goes back the same way.
const CHILD_SRC = `
process.once("message", (job) => {
  import(job.mod)
    .then((m) => Promise.resolve(m[job.fn](...job.args)))
    .then((value) => process.send({ ok: true, value }, () => process.exit(0)))
    .catch((e) => process.send({ ok: false, error: String((e && e.message) || e) }, () => process.exit(0)));
});
`;

// `timedOut`: the work ran past its limit. A caller must NOT then run it on the event loop: work too slow for a worker
// (a repo walk through a Docker mount) freezes the daemon there - measured 2026-10-22, /ping silent for 30 s at a time.
export type WorkerResult<T> = { ok: true; value: T } | { ok: false; error: string; timedOut?: boolean; step?: string };

/**
 * `modFromDist` is the path under `dist/`, e.g. `"platform/browsersweep.js"`.
 * Default ceiling 2 minutes: enough for a large sweep, and an outside command (WMI/PowerShell) that hangs is cut instead
 * of holding the worker for ever - the daemon never waits for it.
 * `unref`: the worker does not keep the process alive - a background refresh a short-lived CLI or test need not wait for.
 * `heapMb`: the worker's own old-generation ceiling. Without one a worker shares the process limit, and a worker that
 * runs out of heap is a FATAL V8 error for the whole process - measured 2026-11-17: the repo sweep read 342 MB of JSON
 * data and took the daemon down 154 times since 14/11. With a ceiling the worker alone ends (ERR_WORKER_OUT_OF_MEMORY,
 * reported as `{ ok: false }`) and the daemon keeps running.
 */
export const WORKER_HEAP_MB = 512;
export function runInWorker<T>(
  modFromDist: string,
  fn: string,
  args: unknown[] = [],
  timeoutMs = 120_000,
  opts: { unref?: boolean; heapMb?: number; isolate?: "thread" | "process" } = {},
): Promise<WorkerResult<T>> {
  if (opts.isolate === "process") return runInChild<T>(modFromDist, fn, args, timeoutMs, opts);
  return new Promise((resolve) => {
    let w: Worker;
    try {
      const mod = new URL(`../${modFromDist}`, import.meta.url).href;
      w = new Worker(WORKER_SRC, { eval: true, workerData: { mod, fn, args }, resourceLimits: { maxOldGenerationSizeMb: opts.heapMb ?? WORKER_HEAP_MB } });
      if (opts.unref) w.unref();
    } catch (e) {
      return resolve({ ok: false, error: `could not start the worker: ${e instanceof Error ? e.message : String(e)}` });
    }
    let done = false;
    let step = "";
    const finish = (r: WorkerResult<T>): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void w.terminate().catch(() => {});
      resolve(!r.ok && step ? { ...r, step } : r);
    };
    const timer = setTimeout(() => finish({ ok: false, error: `over ${Math.round(timeoutMs / 1000)} s`, timedOut: true }), timeoutMs);
    timer.unref?.();
    w.on("message", (m: WorkerResult<T> | { step: string }) => {
      if (m && typeof m === "object" && "step" in m && !("ok" in m)) step = m.step;
      else finish(m as WorkerResult<T>);
    });
    w.once("error", (e) => finish({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    w.once("exit", (code) => finish({ ok: false, error: `worker exited (code ${code}) before returning a result` }));
  });
}

/**
 * `isolate: "process"` - for a job that may read a huge input in one piece. A worker's heap ceiling holds for small
 * steps, but one allocation far past it (a 342 MB JSON.parse, 2026-11-17) can still be a FATAL V8 error before the
 * worker is stopped, and a fatal error in a worker thread ends the whole daemon. In a child process the same fatal
 * error ends the child only. Costs one Node start (~0.1 s), so it is for rare heavy sweeps, not for hot paths.
 */
function runInChild<T>(
  modFromDist: string,
  fn: string,
  args: unknown[],
  timeoutMs: number,
  opts: { unref?: boolean; heapMb?: number },
): Promise<WorkerResult<T>> {
  return new Promise((resolve) => {
    let c: ReturnType<typeof spawn>;
    try {
      const mod = new URL(`../${modFromDist}`, import.meta.url).href;
      c = spawn(process.execPath, [`--max-old-space-size=${opts.heapMb ?? WORKER_HEAP_MB}`, "-e", CHILD_SRC], {
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        serialization: "advanced",
        windowsHide: true,
      });
      c.send({ mod, fn, args });
      if (opts.unref) {
        c.unref();
        (c.channel as { unref?: () => void } | undefined)?.unref?.();
      }
    } catch (e) {
      return resolve({ ok: false, error: `could not start the worker: ${e instanceof Error ? e.message : String(e)}` });
    }
    let err = "";
    c.stderr?.on("data", (d: Buffer) => {
      if (err.length < 4000) err += d.toString();
    });
    let done = false;
    const finish = (r: WorkerResult<T>): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (c.exitCode === null) c.kill();
      resolve(r);
    };
    const timer = setTimeout(() => finish({ ok: false, error: `over ${Math.round(timeoutMs / 1000)} s`, timedOut: true }), timeoutMs);
    timer.unref?.();
    c.once("message", (m) => finish(m as WorkerResult<T>));
    c.once("error", (e) => finish({ ok: false, error: e.message }));
    c.once("exit", (code, sig) => {
      const oom = /heap out of memory|Reached heap limit/i.test(err);
      finish({ ok: false, error: `worker process exited (${sig ?? code}) before returning a result${oom ? ": out of memory" : ""}` });
    });
  });
}
