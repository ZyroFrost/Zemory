// Step 02 of the self-trained prompt-gates model (plan/38 §8): the labels of a person's OWN messages, made by annotator agents
// and paid with that person's tokens. Three parts:
//   prepare  — a seeded random sample of the newest pull, cut into chunks of 300, with the rule texts of the doors and the
//              annotator's instructions; prints the token estimate.
//   annotate — one headless `claude -p` per chunk (at most `parallel` at once), ONLY after an explicit yes; a chunk that already
//              has its labels is skipped, so a rerun resumes. Without Claude Code it prints what an agent must do by hand.
//   merge    — checks every chunk (line count, keys, door names) and joins them into 01_raw/full-labels-<tag>.jsonl.
// The annotator sessions run in a folder of the OS temp directory with no settings of the user loaded and no session saved:
// they fire no hook and leave no transcript, so they never land in the GM and never come back as "what the person typed".

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { trainingDir, type PulledMessage } from "./01_pull.js";
import { doorsOf, latestPull, type Door } from "./02_label.js";

/** Messages per chunk: one annotator reads one chunk whole (the size measured on 2026-11-08: 72 chunks, 0 failed). */
export const CHUNK = 300;
/** Tokens one annotator spends on one chunk of 300 (measured 2026-11-08 on Opus: 77k–92k per chunk). */
export const TOKENS_PER_CHUNK = 85_000;
/** The doors a self-trained model decides: the judgement rules (plan/38 §7), each with a gate.json prompt. */
export const isModelDoor = (part: string): boolean => /^Rule_Keys_/.test(part);
/** A first line every annotator prompt starts with: the pull drops it, should a session of one ever reach the GM. */
export const ANNOTATOR_MARK = "[zemory-annotator]";

const readJsonl = <T>(f: string): T[] => readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as T);
const shuffle = <T>(a: T[], seed: number): T[] => {
  let s = seed;
  const r = (): number => (s = (s * 48271) % 2147483647) / 2147483647;
  return a.map((x) => [r(), x] as const).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
};

/** The rule text an annotator judges against: the English body of each door's rule file, frontmatter removed. */
export function rulesText(doors: Door[]): string {
  const parts: string[] = [];
  for (const d of doors) {
    const f = d.dir ? join(d.dir, `${d.part}.md`) : "";
    const body = f && existsSync(f) ? readFileSync(f, "utf8").replace(/^---[\s\S]*?\n---\r?\n/, "").trim() : `# ${d.part}`;
    parts.push(body);
  }
  return parts.join("\n\n---\n\n") + "\n";
}

/** The instructions of one annotator (the prompt the 2026-11-08 labelling used, kappa 0.71–0.86 between two annotators). */
export function annotatorPrompt(chunk: string, doorCount: number): string {
  return [
    ANNOTATOR_MARK,
    `You are an annotator for a multi-label text-classification dataset. Work only in the current folder.`,
    ``,
    `READ ONLY \`rules.md\` and \`items-${chunk}.jsonl\`. Do not open any other file. Do not touch any git repo.`,
    ``,
    `Each line of items-${chunk}.jsonl is {"key","text"}: a message a human user typed to an AI coding agent, drawn at random from all their messages, so many messages match no rule. rules.md holds ${doorCount} working rules (sections What / When / Do / Example), each headed \`# <door name> — <title>\`. A door is a reminder of that rule shown to the agent right before it answers the message.`,
    ``,
    `For each message decide, for EVERY one of the ${doorCount} doors, whether it applies:`,
    `- applies = the message asks for or creates the situation in the rule's "When", or the user points out / complains that the agent broke this rule, so reading the rule would change how the agent ought to reply.`,
    `- does not apply = irrelevant, only a matching keyword without the situation, or too short/ambiguous to show the situation.`,
    `Judge every message yourself, one by one, against all ${doorCount} rules. No keyword scripts or heuristics for labelling; scripts only to read/write files.`,
    ``,
    `Read rules.md fully first. Read items-${chunk}.jsonl in chunks of ~60 lines until all lines are judged.`,
    ``,
    `Output: write \`out-${chunk}.jsonl\` in this folder, one line per input line, {"key": <same key>, "doors": [<full door names that apply>]} ([] when none), every key exactly once. Check with a node one-liner: same line count and key set as the input, every door name one of the ${doorCount}. Report back ONE line only: "${chunk}: <lines> lines · <messages with ≥1 door> with a door · check ok/failed".`,
  ].join("\n");
}

export interface Prepared {
  tag: string;
  dir: string;
  messages: number;
  chunks: number;
  doors: string[];
  tokens: number;
}

/** The newest labelling folder of 02_processing (null when none was prepared). */
export function latestLabelDir(dir = trainingDir()): string | null {
  const proc = join(dir, "02_processing");
  if (!existsSync(proc)) return null;
  const f = readdirSync(proc).filter((n) => /^label-[0-9a-f]{12}$/.test(n)).sort((a, b) => {
    const t = (n: string): number => JSON.parse(readFileSync(join(proc, n, "manifest.json"), "utf8")).at ?? 0;
    return t(a) - t(b);
  }).pop();
  return f ? join(proc, f) : null;
}

/** Texts that already carry full labels (a new sample never pays for them twice). */
export function labelledTexts(dir = trainingDir()): Set<string> {
  const raw = join(dir, "01_raw");
  const out = new Set<string>();
  if (!existsSync(raw)) return out;
  for (const n of readdirSync(raw).filter((x) => /^(full-labels|testset)-.*\.jsonl$/.test(x))) for (const r of readJsonl<{ text: string }>(join(raw, n))) out.add(r.text);
  return out;
}

/** Sample `sample` messages of the newest pull that carry no label yet; cut them into chunks; write rules + instructions. */
export function prepare(opts: { dir?: string; sample?: number; seed?: number; doors?: Door[] } = {}): Prepared {
  const dir = opts.dir ?? trainingDir();
  const pull = latestPull(dir);
  if (!pull) throw new Error("no pull in 01_raw: run step 01 first (`zemory memory bench --prompts --train`)");
  const done = labelledTexts(dir);
  const pool = readJsonl<PulledMessage>(pull).filter((m) => !done.has(m.text));
  const picked = shuffle(pool, opts.seed ?? 20261109).slice(0, opts.sample ?? 3000);
  const doors = (opts.doors ?? doorsOf()).filter((d) => isModelDoor(d.part));
  if (!doors.length) throw new Error("no judgement-rule door (Rule_Keys_* with a gate.json prompt) in HS");
  const tag = createHash("sha1").update(picked.map((m) => m.text).join("\n")).update(doors.map((d) => d.part).join(",")).digest("hex").slice(0, 12);
  const out = join(dir, "02_processing", `label-${tag}`);
  mkdirSync(out, { recursive: true });
  const chunks = Math.ceil(picked.length / CHUNK);
  for (let c = 0; c < chunks; c++) {
    const rows = picked.slice(c * CHUNK, (c + 1) * CHUNK).map((m, i) => ({ key: String(c * CHUNK + i + 1), text: m.text, id: m.id }));
    writeFileSync(join(out, `items-${String(c + 1).padStart(3, "0")}.jsonl`), rows.map((r) => JSON.stringify({ key: r.key, text: r.text })).join("\n") + "\n", "utf8");
    writeFileSync(join(out, `ids-${String(c + 1).padStart(3, "0")}.json`), JSON.stringify(Object.fromEntries(rows.map((r) => [r.key, r.id]))), "utf8");
  }
  writeFileSync(join(out, "rules.md"), rulesText(doors), "utf8");
  // for a host without Claude Code: the same instructions, to hand each chunk to an agent by hand
  writeFileSync(join(out, "ANNOTATE.md"), `One annotator per chunk, in this folder. Replace NNN with the chunk number (${chunks} chunk(s)).\n\n${annotatorPrompt("NNN", doors.length)}\n`, "utf8");
  const manifest = { tag, pull, at: Date.now(), messages: picked.length, chunks, doors: doors.map((d) => d.part) };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n", "utf8");
  return { tag, dir: out, messages: picked.length, chunks, doors: manifest.doors, tokens: chunks * TOKENS_PER_CHUNK };
}

const chunkIds = (labelDir: string): string[] => readdirSync(labelDir).filter((n) => /^items-\d{3}\.jsonl$/.test(n)).map((n) => n.slice(6, 9)).sort();

/** Why a chunk's labels cannot be used, or null when they can (every key once, arrays of known door names only). */
export function chunkProblem(labelDir: string, c: string, doors: string[]): string | null {
  const out = join(labelDir, `out-${c}.jsonl`);
  if (!existsSync(out)) return "no labels yet";
  const items = readJsonl<{ key: string }>(join(labelDir, `items-${c}.jsonl`));
  let lab: { key: string; doors: unknown }[];
  try { lab = readJsonl(out); } catch { return "a line is not JSON"; }
  if (lab.length !== items.length) return `${lab.length} lines for ${items.length} messages`;
  const known = new Set(doors), keys = new Set(items.map((i) => String(i.key)));
  for (const r of lab) {
    if (!keys.delete(String(r.key))) return `unknown or repeated key ${r.key}`;
    if (!Array.isArray(r.doors)) return `key ${r.key}: doors is not a list`;
    const bad = r.doors.find((d) => !known.has(String(d)));
    if (bad !== undefined) return `key ${r.key}: unknown door ${bad}`;
  }
  return keys.size ? `${keys.size} key(s) without labels` : null;
}

export interface AnnotatePlan {
  labelDir: string;
  todo: string[];
  done: string[];
  tokens: number;
  host: "claude" | "none";
}

/** What `annotate` would do: the chunks still without usable labels and what they cost. */
export function annotatePlan(labelDir: string): AnnotatePlan {
  const doors: string[] = JSON.parse(readFileSync(join(labelDir, "manifest.json"), "utf8")).doors;
  const all = chunkIds(labelDir);
  const done = all.filter((c) => chunkProblem(labelDir, c, doors) === null);
  const todo = all.filter((c) => !done.includes(c));
  const host = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], { stdio: "ignore", windowsHide: true }).status === 0 ? "claude" : "none";
  return { labelDir, todo, done, tokens: todo.length * TOKENS_PER_CHUNK, host };
}

/** Run one annotator on one chunk in a temp folder (no user settings → no hook; no session saved → no transcript). */
function runAnnotator(labelDir: string, c: string, doors: string[], model: string): Promise<string> {
  const work = join(tmpdir(), `zemory-annotate-${labelDir.split(/[\\/]/).pop()}-${c}`);
  mkdirSync(work, { recursive: true });
  copyFileSync(join(labelDir, "rules.md"), join(work, "rules.md"));
  copyFileSync(join(labelDir, `items-${c}.jsonl`), join(work, `items-${c}.jsonl`));
  // acceptEdits: the annotator writes its out file in its own folder without asking (dontAsk refused the Write, measured
  // 2026-11-09); the prompt goes in on stdin, so no multi-line argument has to survive a shell
  const args = ["-p", "--model", model, "--no-session-persistence", "--setting-sources", "project",
    "--permission-mode", "acceptEdits", "--allowedTools", "Read", "Write", "Edit", "Glob", "Bash(node:*)"];
  const run = (shell: boolean): Promise<string> => new Promise((resolve, reject) => {
    const p = spawn("claude", args, { cwd: work, shell, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    p.on("error", reject);
    p.stdin.end(annotatorPrompt(c, doors.length));
    let said = "";
    p.stdout.on("data", (b) => (said += b));
    p.stderr.on("data", (b) => (said += b));
    p.on("close", () => resolve(said.trim().split(/\r?\n/).pop() ?? ""));
  });
  // claude.exe starts without a shell; an npm install has only claude.cmd, which needs one (its args hold no spaces)
  return run(false).catch(() => run(true)).then((line) => {
    const out = join(work, `out-${c}.jsonl`);
    if (existsSync(out)) copyFileSync(out, join(labelDir, `out-${c}.jsonl`));
    return line;
  });
}

/** Label every chunk still without usable labels, `parallel` annotators at once; a bad chunk is retried once. */
export async function annotate(labelDir: string, opts: { model?: string; parallel?: number; onChunk?: (c: string, line: string, problem: string | null) => void } = {}): Promise<AnnotatePlan> {
  const doors: string[] = JSON.parse(readFileSync(join(labelDir, "manifest.json"), "utf8")).doors;
  const plan = annotatePlan(labelDir);
  if (plan.host !== "claude") return plan;
  const queue = plan.todo.flatMap((c) => [c]);
  const tried = new Map<string, number>();
  const worker = async (): Promise<void> => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      tried.set(c, (tried.get(c) ?? 0) + 1);
      const line = await runAnnotator(labelDir, c, doors, opts.model ?? "opus");
      const problem = chunkProblem(labelDir, c, doors);
      opts.onChunk?.(c, line, problem);
      if (problem && (tried.get(c) ?? 0) < 2) queue.push(c);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.parallel ?? 4) }, worker));
  return annotatePlan(labelDir);
}

export interface Merged {
  file: string;
  rows: number;
  withDoor: number;
  bad: { chunk: string; problem: string }[];
}

/** Join every usable chunk into 01_raw/full-labels-<tag>.jsonl ({id, text, doors, by, chunk}); report the unusable ones. */
export function merge(labelDir: string, opts: { dir?: string } = {}): Merged {
  const dir = opts.dir ?? trainingDir();
  const m = JSON.parse(readFileSync(join(labelDir, "manifest.json"), "utf8")) as { tag: string; doors: string[] };
  const rows: { id: unknown; text: string; doors: string[]; by: string; chunk: string }[] = [];
  const bad: Merged["bad"] = [];
  for (const c of chunkIds(labelDir)) {
    const problem = chunkProblem(labelDir, c, m.doors);
    if (problem) { bad.push({ chunk: c, problem }); continue; }
    const ids = existsSync(join(labelDir, `ids-${c}.json`)) ? JSON.parse(readFileSync(join(labelDir, `ids-${c}.json`), "utf8")) : {};
    const lab = new Map(readJsonl<{ key: string; doors: string[] }>(join(labelDir, `out-${c}.jsonl`)).map((r) => [String(r.key), r.doors]));
    for (const it of readJsonl<{ key: string; text: string }>(join(labelDir, `items-${c}.jsonl`))) {
      rows.push({ id: ids[it.key] ?? it.key, text: it.text, doors: lab.get(String(it.key)) ?? [], by: "annotator", chunk: c });
    }
  }
  const raw = join(dir, "01_raw");
  mkdirSync(raw, { recursive: true });
  // the name must not start with "labels-": the cross-validation of train() reads those as per-door rows
  const file = join(raw, `full-labels-${m.tag}.jsonl`);
  if (rows.length) writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return { file, rows: rows.length, withDoor: rows.filter((r) => r.doors.length).length, bad };
}
