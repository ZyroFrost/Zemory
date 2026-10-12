// DEFERRED CAPTURE (plan/24 §12.6). The Stop hook ingests the current transcript after every answer — unless the daemon
// holds its job slot, then it must not wait (measured 2026-08-02: ~125 s per answer behind a long embed). Before this it
// just SKIPPED and left the transcript to the scheduler's catch-up scan (30′, or never while the scheduler is off). With
// the fast lane holding the slot almost continuously (12/10: a 213 s vector round, a 67 s merge), a whole hour of one
// machine's chat never reached the store, so the fast lane had nothing to send.
//
// Now the hook leaves a small note here (one file per transcript, sub-ms) and returns at once; the daemon's fast lane
// drains the notes through the SAME job slot as soon as it frees (`fastrun.js ingest`), ahead of merges and vectors.
// One writer still (HP art. 11): the hook never writes the store while the slot is held.
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";
import { scanOneFile } from "../memory/ingest.js";
import { writeJsonAtomic } from "../util/fs-atomic.js";

export interface QueuedIngest {
  /** the note file */
  file: string;
  /** the transcript to ingest */
  path: string;
  /** a fresh token per write — a note re-written while it is being ingested must survive the drain */
  id: string;
}

export function ingestQueueDir(): string {
  return join(currentMemoryDir(), "ingest-queue");
}

/** One note per transcript: re-queueing the same transcript overwrites its note, never stacks them. */
function noteFor(transcriptPath: string): string {
  return join(ingestQueueDir(), `${createHash("sha1").update(transcriptPath).digest("hex").slice(0, 16)}.json`);
}

/** Hook side: remember a transcript the store was too busy to take. Never throws (a hook must not break the session). */
export function deferIngest(transcriptPath: string): boolean {
  try {
    mkdirSync(ingestQueueDir(), { recursive: true });
    writeJsonAtomic(noteFor(transcriptPath), { path: transcriptPath, id: randomUUID(), at: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

/** Cheap check for the daemon's 2 s tick: a directory listing, no parsing. */
export function hasQueuedIngest(): boolean {
  try {
    return readdirSync(ingestQueueDir()).some((f) => f.endsWith(".json"));
  } catch {
    return false;
  }
}

export function queuedIngests(): QueuedIngest[] {
  let names: string[];
  try {
    names = readdirSync(ingestQueueDir()).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: QueuedIngest[] = [];
  for (const n of names) {
    const file = join(ingestQueueDir(), n);
    try {
      const j = JSON.parse(readFileSync(file, "utf8"));
      if (typeof j?.path === "string" && typeof j?.id === "string") out.push({ file, path: j.path, id: j.id });
      else rmSync(file, { force: true }); // unreadable shape: nothing could ever ingest it
    } catch {
      /* half-written or gone: the next drain sees it again */
    }
  }
  return out;
}

/** Remove a note only if nobody re-queued its transcript meanwhile (the hook may fire again during the scan). */
function settle(e: QueuedIngest): void {
  try {
    const j = JSON.parse(readFileSync(e.file, "utf8"));
    if (j?.id === e.id) rmSync(e.file, { force: true });
  } catch {
    /* already gone */
  }
}

export interface DrainResult {
  files: number;
  newMessages: number;
  /** transcripts that no longer exist (note dropped) */
  missing: number;
}

/** Child side (`fastrun.js ingest`): ingest every queued transcript, incrementally, then drop its note. */
export function drainIngestQueue(scan: (p: string) => { newMessages: number } = (p) => scanOneFile(p)): DrainResult {
  const r: DrainResult = { files: 0, newMessages: 0, missing: 0 };
  for (const e of queuedIngests()) {
    if (!existsSync(e.path)) {
      r.missing++;
      settle(e);
      continue;
    }
    const s = scan(e.path); // throws ⇒ the note stays and the lane retries after its rest
    r.files++;
    r.newMessages += s.newMessages ?? 0;
    settle(e);
  }
  return r;
}
