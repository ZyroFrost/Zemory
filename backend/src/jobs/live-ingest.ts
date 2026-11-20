// Live capture of a running turn (user 2026-11-20: the phone's chat should show the agent's steps as they happen).
// Measured that day: a session's messages reached the GM only when its turn ended (the Stop hook ingests), so a
// 20-minute turn showed nothing on the phone for 20 minutes, then all of it at once.
//
// While a session is marked working (session-live.ts, set by the prompt hook with its transcript path), the daemon
// looks every few seconds at how long its transcript is; one that grew is queued for ingest (ingestqueue.ts), and the
// fast lane lands it in the GM in a child process - the same incremental read the Stop hook does (HP article 10: read
// the transcript incrementally, no model, nothing rewritten). Nothing new for a session = a stat call, nothing more.
import { statSync } from "node:fs";
import { busyTranscripts } from "../memory/session-live.js";
import { deferIngest } from "./ingestqueue.js";

/** How often the daemon looks at the running sessions' transcripts. */
export const LIVE_INGEST_EVERY_MS = 3_000;

/**
 * One look: queue every working session's transcript that grew since the last look. `seen` carries the sizes between
 * looks (the daemon keeps one map); a transcript seen for the first time is queued once. Returns the paths queued.
 */
export function liveIngestTick(
  seen: Map<string, number>,
  o: { list?: () => { transcript: string }[]; queue?: (p: string) => boolean } = {},
): string[] {
  const list = o.list ?? (() => busyTranscripts());
  const queue = o.queue ?? deferIngest;
  const queued: string[] = [];
  const live = new Set<string>();
  for (const { transcript } of list()) {
    live.add(transcript);
    let size: number;
    try {
      size = statSync(transcript).size;
    } catch {
      continue; // gone, or not readable from here
    }
    if (seen.get(transcript) === size) continue;
    seen.set(transcript, size);
    if (queue(transcript)) queued.push(transcript);
  }
  for (const k of [...seen.keys()]) if (!live.has(k)) seen.delete(k); // the turn ended: forget it
  return queued;
}
