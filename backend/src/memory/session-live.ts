// Which agent sessions are working RIGHT NOW (plan/41 §6b): the project chat spins while one is. The person sent a
// prompt (UserPromptSubmit hook) => busy; the agent answered (Stop hook) => idle. Per machine on purpose - it is this
// machine's sessions, read by this machine's interface. A mark older than LIVE_STALE_MS counts as idle: a session killed
// mid-turn never reaches its Stop hook, and a spinner that never stops is a lie (app-design §F3).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
    // the transcript too: while the turn runs the daemon ingests what it grows by (live-ingest.ts), so the chat on the
    // phone shows each step within seconds instead of the whole turn at its end
    const transcript = String(payload.transcript_path ?? payload.transcriptPath ?? "");
    writeFileSync(join(dir, `${sid}.json`), JSON.stringify({ since: new Date().toISOString(), cwd: String(payload.cwd ?? ""), ...(transcript ? { transcript } : {}) }));
    // remembered past the turn: a letter that wakes this session later has no prompt hook to name it (markSessionBusy)
    if (transcript) writeFileSync(join(dir, `${sid}${KNOWN_EXT}`), transcript);
  } catch {
    /* fail-open */
  }
}

/** The stop hook: the turn ended. The transcript stays known (KNOWN_EXT) for a letter that wakes the session later. */
export function markIdle(payload: Record<string, unknown>, dir = liveDir()): void {
  const sid = String(payload.session_id ?? "");
  if (!ID_RE.test(sid)) return;
  try {
    rmSync(join(dir, `${sid}.json`), { force: true });
    const transcript = String(payload.transcript_path ?? payload.transcriptPath ?? "");
    if (transcript) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${sid}${KNOWN_EXT}`), transcript);
    }
    pruneKnown(dir);
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

/**
 * A letter for ONE session reached this machine (mail.ts receiveMail, `to.session`): that session's waiter wakes it
 * with no prompt hook, so nothing named its transcript and the turn reached Global Memory only at its end (4.19.12 gap).
 * Its transcript is known from the session's last hook; mark it working with it, so live-ingest follows the turn.
 * Returns whether a mark was written (false: an unknown session - the repo mark still spins the chat).
 */
export function markSessionBusy(session: string, dir = liveDir()): boolean {
  if (!ID_RE.test(session)) return false;
  try {
    const transcript = readFileSync(join(dir, `${session}${KNOWN_EXT}`), "utf8").trim();
    if (!transcript || !existsSync(transcript)) return false;
    writeFileSync(join(dir, `${session}.json`), JSON.stringify({ since: new Date().toISOString(), transcript, by: "letter" }));
    return true;
  } catch {
    return false;
  }
}

/** A session's transcript as its hooks last named it - kept across turns, one small text file per session. */
const KNOWN_EXT = ".transcript";
/** A known transcript unused this long is forgotten: a letter for so old a session wakes nothing live anyway. */
const KNOWN_KEEP_MS = 14 * 24 * 3600_000;

function pruneKnown(dir: string, now = Date.now()): void {
  try {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(KNOWN_EXT)) continue;
      const fp = join(dir, f);
      if (now - statSync(fp).mtimeMs > KNOWN_KEEP_MS) rmSync(fp, { force: true });
    }
  } catch {
    /* fail-open */
  }
}

/**
 * When a mark last showed life: its start, or - for a turn whose transcript is known - the last time that transcript
 * grew. A turn past LIVE_STALE_MS that still writes is still working (4.19.12 dropped it from live-ingest after 30 min);
 * a killed one stops writing and goes stale as before.
 */
function lastLife(since: string, transcript: unknown): number {
  let t = Date.parse(since);
  if (typeof transcript === "string" && transcript) {
    try {
      const m = statSync(transcript).mtimeMs;
      if (!Number.isFinite(t) || m > t) t = m;
    } catch {
      /* transcript gone: the start alone decides */
    }
  }
  return t;
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

/** Sessions working now whose prompt hook named their transcript: what live-ingest.ts follows. */
export function busyTranscripts(dir = liveDir(), now = Date.now()): { session: string; transcript: string }[] {
  const out: { session: string; transcript: string }[] = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith("repo~")) continue;
    try {
      const m = JSON.parse(readFileSync(join(dir, f), "utf8")) as { since?: unknown; transcript?: unknown };
      const t = lastLife(String(m.since ?? ""), m.transcript);
      if (Number.isFinite(t) && now - t < LIVE_STALE_MS && typeof m.transcript === "string" && m.transcript)
        out.push({ session: f.slice(0, -5), transcript: m.transcript });
    } catch {
      /* a mark being written: next look */
    }
  }
  return out;
}

function busyMarks(dir: string, now: number): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const m = JSON.parse(readFileSync(join(dir, f), "utf8")) as { since?: unknown; transcript?: unknown };
      const since = String(m.since ?? "");
      const t = lastLife(since, m.transcript);
      if (Number.isFinite(t) && now - t < LIVE_STALE_MS) out.set(f.slice(0, -5), since);
    } catch {
      /* a mark being written: next look */
    }
  }
  return out;
}
