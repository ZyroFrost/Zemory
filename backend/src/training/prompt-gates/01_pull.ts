// Step 01 of the prompt-gates model (plan/38 §4 ①, HS slot Backend_174_Training): pull what people typed to their agents
// out of the GM into data/training/prompt-gates/01_raw/. Only a person's own words: no tool output, no host event delivered
// in the user role, no pasted machine text. Deduplicated on the normalised text, and capped per project so one busy repo
// does not become the corpus. 01_raw is read-only once written: every pull is a new file, never an overwrite.
// Second machine (02-1): the pull stays on the training machine on purpose (the user's own words, plan/38 §3); a machine
// without it rebuilds it from its own GM with the same command.

import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentMemoryDb, openMemory } from "../../memory/db.js";
import { Q } from "../../memory/store/queries.js";

export const MODEL = "prompt-gates";

/** data/training/prompt-gates/ of zemory's own clone (the container sees the clone at ZEMORY_SELF). */
export function trainingDir(): string {
  const self = process.env.ZEMORY_SELF?.trim() || join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  return join(self, "data", "training", MODEL);
}

/** Blocks a host wraps around what a person typed (the IDE's open file and selection, a reminder, Codex's environment,
 *  an attached image's marker): removed, the person's own words after them are kept. */
const WRAPPERS: RegExp[] = [
  /<ide_opened_file>[\s\S]*?<\/ide_opened_file>/gi,
  /<ide_selection>[\s\S]*?<\/ide_selection>/gi,
  /<system-reminder>[\s\S]*?<\/system-reminder>/gi,
  /<environment_context>[\s\S]*?<\/environment_context>/gi,
  /\[image:[^\]]*\]/gi,
  /<image>[\s\S]*?<\/image>/gi,
  /\[input_image\]/gi,
  /<pasted_content[^>]*>[\s\S]*?<\/pasted_content[^>]*>/gi,
];

/** Codex sends the IDE context first and the person's words after this heading. */
const CODEX_REQUEST = /##\s*My request for Codex:/i;

/** What a person typed, with the host's wrappers removed. */
export function clean(text: string | null | undefined): string {
  let s = String(text ?? "");
  const at = s.search(CODEX_REQUEST);
  if (at >= 0) s = s.slice(at).replace(CODEX_REQUEST, " ");
  for (const re of WRAPPERS) s = s.replace(re, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Text that arrives in the user role but is not a person speaking: host events, harness injections, tool output. */
const NOT_SPOKEN: RegExp[] = [
  /^\s*\[tool_result\]/i,
  /<local-command-caveat>/i,
  /^\s*Stop hook feedback/i,
  /^\s*\[Cross-session/i,
  /^\s*# (Context from my IDE setup|Files mentioned by the user)/i,
  /<task-notification>/i,
  /\[SYSTEM NOTIFICATION/i,
  /<command-(name|message|args)>/i,
  /<local-command-(stdout|stderr)>/i,
  /<cross-session-message/i,
  /This session is being continued from a previous conversation/i,
  /^\s*Base directory for this skill:/i,
  /^\s*Caveat: The messages below were generated/i,
  /^\s*\[?\{\s*"(type|tool_use_id|role)"\s*:/,
  /^\s*\[Request interrupted by user/i,
  // the instructions of a labelling agent (step 02, plan/38 §8), should one of its sessions reach the GM
  /^\s*\[zemory-annotator\]/,
  /^\s*You are (an annotator|a dispatcher)\b/i,
];

/** Shorter is not a request; longer is a pasted document, not a message the door reads. */
export const MIN_CHARS = 4;
export const MAX_CHARS = 800;

/** Judged on the raw text (a tool result or a caveat is dropped whole), measured on the cleaned one. */
export function spoken(text: string | null | undefined): boolean {
  const raw = String(text ?? "");
  // a Codex message opens with its IDE context; the request heading marks the person's words inside it
  if (!CODEX_REQUEST.test(raw) && NOT_SPOKEN.some((re) => re.test(raw))) return false;
  const s = clean(raw);
  return s.length >= MIN_CHARS && s.length <= MAX_CHARS;
}

/** The key two copies of one message share: case, spacing and punctuation runs do not make a new example. */
export function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?…]+$/u, "").trim();
}

export interface PulledMessage {
  id: number;
  session: string;
  uuid: string | null;
  project: string;
  ts: string | null;
  text: string;
}

export interface PullResult {
  read: number;
  spoken: number;
  unique: number;
  kept: number;
  projects: number;
  rows: PulledMessage[];
}

/** Every spoken message, deduplicated, then at most `perProject` per project, spread evenly over its history. */
export function pull(opts: { perProject?: number; dbPath?: string } = {}): PullResult {
  const perProject = opts.perProject ?? 150;
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  // Streamed row by row, kept only when spoken: the user role also carries tool output, and loading every row at once ran
  // the heap out of memory (~950 MB) on an 8 GB GM (2026-11-13).
  let read = 0;
  const said: PulledMessage[] = [];
  try {
    for (const m of db.prepare(Q.trainingUserMessages).iterate() as IterableIterator<PulledMessage>) {
      read++;
      if (spoken(m.text)) said.push(m);
    }
  } finally {
    db.close();
  }
  const seen = new Set<string>();
  const unique: PulledMessage[] = [];
  for (const m of said) {
    const text = clean(m.text);
    const k = normalise(text);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push({ ...m, project: m.project || "(none)", text });
  }
  const byProject = new Map<string, PulledMessage[]>();
  for (const m of unique) {
    const list = byProject.get(m.project) ?? [];
    list.push(m);
    byProject.set(m.project, list);
  }
  const rows: PulledMessage[] = [];
  for (const list of byProject.values()) {
    if (list.length <= perProject) {
      rows.push(...list);
      continue;
    }
    const step = list.length / perProject;
    for (let i = 0; i < perProject; i++) rows.push(list[Math.floor(i * step)]);
  }
  rows.sort((a, b) => a.id - b.id);
  return { read, spoken: said.length, unique: unique.length, kept: rows.length, projects: byProject.size, rows };
}

/**
 * A copy of the GM to pull from (the training never reads the live GM, plan/38 header): the live file opened read-only and
 * copied with SQLite's online backup into 02_processing/gm-snapshot-<time>.db, consistent even while the daemon writes.
 * Second machine (02-1): a throwaway copy, never synced; each machine makes its own from its own GM.
 */
export async function snapshotGm(dir = trainingDir(), live = currentMemoryDb()): Promise<string> {
  const proc = join(dir, "02_processing");
  mkdirSync(proc, { recursive: true });
  const out = join(proc, `gm-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  const db = new Database(live, { readonly: true, fileMustExist: true });
  try {
    await db.backup(out);
  } finally {
    db.close();
  }
  return out;
}

/** One JSON line per message into a NEW file of 01_raw; returns its path and the hash of its content. */
export function writePull(rows: PulledMessage[], dir = trainingDir()): { path: string; hash: string } {
  const raw = join(dir, "01_raw");
  mkdirSync(raw, { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 12);
  const path = join(raw, `pull-${new Date().toISOString().replace(/[:.]/g, "-")}-${hash}.jsonl`);
  if (existsSync(path)) throw new Error(`01_raw is read-only once written: ${path} exists`);
  writeFileSync(path, body, "utf8");
  return { path, hash };
}
