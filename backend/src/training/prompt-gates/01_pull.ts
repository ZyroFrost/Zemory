// Step 01 of the prompt-gates model (plan/38 §4 ①, HS slot Backend_174_Training): pull what people typed to their agents
// out of the GM into data/training/prompt-gates/01_raw/. Only a person's own words: no tool output, no host event delivered
// in the user role, no pasted machine text. Deduplicated on the normalised text, and capped per project so one busy repo
// does not become the corpus. 01_raw is read-only once written: every pull is a new file, never an overwrite.
// Second machine (02-1): the pull stays on the training machine on purpose (the user's own words, plan/38 §3); a machine
// without it rebuilds it from its own GM with the same command.

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

/** Text that arrives in the user role but is not a person speaking: host events, harness injections, pasted tool JSON. */
const NOT_SPOKEN: RegExp[] = [
  /<task-notification>/i,
  /\[SYSTEM NOTIFICATION/i,
  /^\s*<system-reminder>/i,
  /<command-(name|message|args)>/i,
  /<local-command-(stdout|stderr)>/i,
  /<cross-session-message/i,
  /This session is being continued from a previous conversation/i,
  /^\s*Base directory for this skill:/i,
  /^\s*Caveat: The messages below were generated/i,
  /^\s*\[?\{\s*"(type|tool_use_id|role)"\s*:/,
  /^\s*\[Request interrupted by user/i,
];

/** Shorter is not a request; longer is a pasted document, not a message the door reads. */
export const MIN_CHARS = 4;
export const MAX_CHARS = 800;

export function spoken(text: string | null | undefined): boolean {
  const s = String(text ?? "").trim();
  if (s.length < MIN_CHARS || s.length > MAX_CHARS) return false;
  return !NOT_SPOKEN.some((re) => re.test(s));
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
  let all: PulledMessage[];
  try {
    all = db.prepare(Q.trainingUserMessages).all() as PulledMessage[];
  } finally {
    db.close();
  }
  const said = all.filter((m) => spoken(m.text));
  const seen = new Set<string>();
  const unique: PulledMessage[] = [];
  for (const m of said) {
    const k = normalise(m.text);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push({ ...m, project: m.project || "(none)", text: m.text.trim() });
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
  return { read: all.length, spoken: said.length, unique: unique.length, kept: rows.length, projects: byProject.size, rows };
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
