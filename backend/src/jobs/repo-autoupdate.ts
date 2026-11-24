// Repo auto-update (user 24/11: "cứ làm tí nó lại vàng, ko có cái nào tự động bảo đảm nó tự chạy xanh dc hả"). Every HS
// change leaves every linked repo behind its set (parts · guard) until someone presses "Cập nhật repo" in each. The daemon
// now runs that same pass itself: `zemory sync` inside each repo the measure (docs/harness-updates.ts) finds behind - one
// repo at a time, each in a child process so the daemon's loop never waits on it (the button runs it on the loop).
//
// What it never does:
//   · a repo whose only gap is files edited by hand (`locked`) - a sync cannot settle them, a person does;
//   · the same repo again for the same gap within RETRY_MS - a repo a sync leaves behind (a conflict) is not hammered
//     every measure; the gap stays visible on the chip, which is the honest state;
//   · anything while switched off (`autoRepoUpdate: false` in config.json).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAutoRepoUpdate } from "../config/settings.js";
import { daemonLog } from "../logging/daemon-log.js";

export interface StaleRepo {
  root: string;
  name: string;
  missing: number;
  guardStale: number;
  drift?: number;
  manual?: number;
  locked?: boolean;
}

/** A gap a sync left in place is tried again after this long (a newer HS change shows as a new gap at once). */
export const RETRY_MS = 6 * 60 * 60_000;
/** One repo's sync may not hold the queue longer than this. */
const CHILD_TIMEOUT_MS = 5 * 60_000;

const gapOf = (r: StaleRepo): string => `${r.missing}|${r.guardStale}|${r.drift ?? 0}|${r.manual ?? 0}`;

/** Pure: the repos to sync now - behind (a locked repo is not), and not already tried for this very gap within RETRY_MS. */
export function autoUpdateTargets(stale: StaleRepo[], tried: Map<string, { gap: string; at: number }>, now: number): StaleRepo[] {
  return stale.filter((r) => {
    // a sync has work only where a part is missing or behind, or the guard is: a repo whose gap is only hand-edited
    // files (`locked`) has none of the three, so it is left here
    if (!(r.missing || r.guardStale || r.drift)) return false;
    const t = tried.get(r.root.toLowerCase());
    return !(t && t.gap === gapOf(r) && now - t.at < RETRY_MS);
  });
}

const tried = new Map<string, { gap: string; at: number }>();
let running = false;

function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

function syncOne(r: StaleRepo): Promise<number> {
  return new Promise((done) => {
    const child = spawn(process.execPath, [cliEntry(), "sync"], { cwd: r.root, stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* gone */ }
    }, CHILD_TIMEOUT_MS);
    child.on("exit", (code) => { clearTimeout(timer); done(code ?? -1); });
    child.on("error", () => { clearTimeout(timer); done(-1); });
  });
}

/** Sync every repo `autoUpdateTargets` picks, one after another; `onDone` once at the end when any ran (re-measure). */
export function autoUpdateRepos(stale: StaleRepo[], onDone: () => void): void {
  if (running || !getAutoRepoUpdate()) return;
  const now = Date.now();
  const targets = autoUpdateTargets(stale, tried, now);
  if (!targets.length) return;
  running = true;
  for (const r of targets) tried.set(r.root.toLowerCase(), { gap: gapOf(r), at: now });
  daemonLog(`[repo-autoupdate] ${targets.length} repo(s) behind HS — syncing: ${targets.map((r) => r.name).join(" · ")}`);
  void (async () => {
    const t0 = Date.now();
    const failed: string[] = [];
    for (const r of targets) {
      const code = await syncOne(r);
      if (code !== 0) failed.push(`${r.name} (exit ${code})`);
    }
    daemonLog(`[repo-autoupdate] done in ${((Date.now() - t0) / 1000).toFixed(0)} s · ${targets.length - failed.length} ok${failed.length ? ` · not clean: ${failed.join(" · ")}` : ""}`);
    running = false;
    onDone();
  })();
}
