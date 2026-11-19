// Which agent sessions are working RIGHT NOW (plan/41 §6b): the project chat spins while one is. The person sent a
// prompt (UserPromptSubmit hook) => busy; the agent answered (Stop hook) => idle. Per machine on purpose - it is this
// machine's sessions, read by this machine's interface. A mark older than LIVE_STALE_MS counts as idle: a session killed
// mid-turn never reaches its Stop hook, and a spinner that never stops is a lie (app-design §F3).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "./db.js";

export const LIVE_STALE_MS = 30 * 60_000;
const ID_RE = /^[A-Za-z0-9-]{1,80}$/;

export function liveDir(machineDir = currentMemoryDir()): string {
  return join(machineDir, "live");
}

/** The prompt hook: this session has started a turn. Fail-open: a mark that cannot be written only hides the spinner. */
export function markBusy(payload: Record<string, unknown>, dir = liveDir()): void {
  const sid = String(payload.session_id ?? "");
  if (!ID_RE.test(sid)) return;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${sid}.json`), JSON.stringify({ since: new Date().toISOString(), cwd: String(payload.cwd ?? "") }));
  } catch {
    /* fail-open */
  }
}

/** The stop hook: the turn ended. */
export function markIdle(payload: Record<string, unknown>, dir = liveDir()): void {
  const sid = String(payload.session_id ?? "");
  if (!ID_RE.test(sid)) return;
  try {
    rmSync(join(dir, `${sid}.json`), { force: true });
  } catch {
    /* fail-open */
  }
}

/** Sessions working now -> since when. */
export function busySessions(dir = liveDir(), now = Date.now()): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const since = String((JSON.parse(readFileSync(join(dir, f), "utf8")) as { since?: unknown }).since ?? "");
      const t = Date.parse(since);
      if (Number.isFinite(t) && now - t < LIVE_STALE_MS) out.set(f.slice(0, -5), since);
    } catch {
      /* a mark being written: next look */
    }
  }
  return out;
}
