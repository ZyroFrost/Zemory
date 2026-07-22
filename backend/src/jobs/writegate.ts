// Write gate (plan 14 §C). The root cause of "database is locked" (plan 12) is
// two processes writing the brain at once — typically the daemon's idle scheduler
// AND a CLI `brain embed`/`scan`. This is the daemon-side coordination flag:
// a CLI announces "I'm about to write" and the scheduler yields until it's done.
//
// It is a lightweight ADVISORY hold, not a distributed lock: bounded by an
// auto-expiry so a crashed CLI can never wedge the scheduler forever, and the
// engine's own retry-with-backoff stays as the last line of defence.

const HOLD_MS = 5 * 60_000; // a CLI hold self-expires after 5 min

let holdUntil = 0;

/** Called by the daemon when a CLI announces a write. */
export function acquireCliWrite(): void {
  holdUntil = Date.now() + HOLD_MS;
}

/** Called by the daemon when the CLI finishes (or gives up). */
export function releaseCliWrite(): void {
  holdUntil = 0;
}

/** True while a CLI holds the write gate (and the hold hasn't expired). */
export function cliHoldsWrite(): boolean {
  return Date.now() < holdUntil;
}

// ── Daemon-side job token ────────────────────────────────────────────────────
// The daemon itself runs heavy children (scheduler embed pass, sync job). They
// must not overlap each other, and a CLI should know one is running: the gate
// was one-directional before — a CLI acquire told the scheduler to yield, but
// nothing told the CLI a daemon child was ALREADY writing (audit 2026-07-21).

let daemonJob: string | null = null;

/** Claim the single daemon-job slot. Returns false when something already runs. */
export function claimDaemonJob(label: string): boolean {
  if (daemonJob) return false;
  daemonJob = label;
  return true;
}

export function releaseDaemonJob(): void {
  daemonJob = null;
}

/** What the daemon is running right now, or null. */
export function daemonJobBusy(): string | null {
  return daemonJob;
}
