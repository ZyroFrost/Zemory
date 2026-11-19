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

/**
 * A letter reached this repo (mail.ts receive/deliverHere): its session is about to be woken WITHOUT a prompt - the
 * host's UserPromptSubmit hook never runs for a turn a letter starts - so the repo itself is marked working until a turn
 * of that repo ends.
 */
export function markRepoBusy(repo: string, dir = liveDir()): void {
  const k = repo.trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,120}$/.test(k)) return;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `repo~${k}.json`), JSON.stringify({ since: new Date().toISOString() }));
  } catch {
    /* fail-open */
  }
}

/** A turn of this repo ended (the Stop hook, from its cwd). */
export function clearRepo(cwd: string, dir = liveDir()): void {
  const k = cwd.replace(/[\\/]+$/, "").split(/[\\/]/).pop()?.toLowerCase() ?? "";
  if (!k) return;
  try {
    rmSync(join(dir, `repo~${k}.json`), { force: true });
  } catch {
    /* fail-open */
  }
}

/** Repos a letter just woke -> since when (same stale line as sessions). */
export function busyRepos(dir = liveDir(), now = Date.now()): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of busyMarks(dir, now)) if (k.startsWith("repo~")) out.set(k.slice(5), v);
  return out;
}

/** Sessions working now -> since when. */
export function busySessions(dir = liveDir(), now = Date.now()): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of busyMarks(dir, now)) if (!k.startsWith("repo~")) out.set(k, v);
  return out;
}

function busyMarks(dir: string, now: number): Map<string, string> {
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
