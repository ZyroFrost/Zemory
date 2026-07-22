// Daemon-side sync job (run-hidden, user 2026-07-21). The old /drive-sync
// endpoint ran `await syncDrive(...)` INLINE on the daemon's event loop — the
// modal blocked for 5+ minutes and so did every other request (same bug class
// as the scheduler's in-process embed, fixed the same way): the work now runs
// in a child process (jobs/syncrun.ts) and this module only tracks its state.
// One job at a time, shared with the scheduler through the write-gate's
// daemon-job token; the UI polls /sync-status.

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { claimDaemonJob, releaseDaemonJob } from "./writegate.js";

export interface SyncJobStatus {
  running: boolean;
  startedAt: number;
  /** set when the last run finished */
  ok?: boolean;
  error?: string;
  /** the syncDrive result object (parsed from the child's JSON line) */
  result?: unknown;
}

let status: SyncJobStatus = { running: false, startedAt: 0 };
let child: ChildProcess | null = null;

export function syncJobRunning(): boolean {
  return status.running;
}

export function syncJobStatus(): SyncJobStatus {
  return status;
}

/** dist/jobs/syncjob.js → sibling dist/jobs/syncrun.js. */
function runnerEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "syncrun.js");
}

/**
 * Start a sync child unless one (or another daemon job) already runs.
 * Returns the current status either way — the caller treats "already running"
 * as success (the UI just attaches to the ongoing job).
 */
export function startSyncJob(onDone?: () => void): SyncJobStatus {
  if (status.running) return status;
  if (!claimDaemonJob("sync")) {
    // Scheduler embed pass in flight — report as an error the UI can show;
    // the user can simply retry when the spinner clears.
    return { running: false, startedAt: 0, ok: false, error: "another background job is writing the memory — try again shortly" };
  }
  status = { running: true, startedAt: Date.now() };
  let out = "";
  let c: ChildProcess;
  try {
    c = spawn(process.execPath, [runnerEntry()], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  } catch (e) {
    releaseDaemonJob();
    status = { running: false, startedAt: status.startedAt, ok: false, error: e instanceof Error ? e.message : String(e) };
    return status;
  }
  child = c;
  c.stdout?.on("data", (d: Buffer) => {
    out += String(d);
    if (out.length > 262144) out = out.slice(-262144); // keep the tail — the JSON line is last
  });
  const finish = (ok: boolean, error?: string) => {
    if (child === c) child = null;
    releaseDaemonJob();
    // The child prints its result as the LAST JSON line on stdout.
    let parsed: { ok?: boolean; error?: string } | null = null;
    const lines = out.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        parsed = JSON.parse(lines[i]) as { ok?: boolean; error?: string };
        break;
      } catch {
        /* not the JSON line */
      }
    }
    status = {
      running: false,
      startedAt: status.startedAt,
      ok: parsed ? parsed.ok !== false && ok : ok,
      ...(parsed ? { result: parsed } : {}),
      ...(parsed && parsed.ok === false ? { error: parsed.error } : !ok && error ? { error } : {}),
    };
    onDone?.();
  };
  c.on("exit", (code) => finish(code === 0, code === 0 ? undefined : `sync exited ${code ?? "?"}`));
  c.on("error", (e) => finish(false, e instanceof Error ? e.message : String(e)));
  return status;
}

/** Kill a running sync child (daemon shutdown). */
export function stopSyncJob(): void {
  if (child) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    child = null;
  }
}
