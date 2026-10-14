// The rule CORE (plan/27 §3): the rules no machine gate holds. They sit in ONE section at the top of 02_RULES, bounded by
// markers, and that section is the only part of the rule set read-first forces and the SessionStart(compact) hook
// re-injects. Every other rule `02-N` carries a gate mark `<!-- gate: <kind>[:<ref>] -->` in its own block. One reader
// for three users: `zemory gates` (the holes), the compaction hook (the text), tests.
//
// The read-first latch is a generated stdlib script and cannot import this; it carries its own small marker reader —
// both sides key on the SAME markers (CORE_START / CORE_END / the no-gate block), and rule-core.test pins them together.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NO_GATE_END, NO_GATE_START } from "./no-gate.js";

export const CORE_START = "<!-- zemory:core:start";
export const CORE_END = "<!-- zemory:core:end -->";
/** The core section may not grow past this (characters of the block, markers included). Ratchet: only ever lowered. */
export const CORE_MAX_CHARS = 11000;
/** Gate kinds a mark may name. `test:<name>` must resolve to backend/test/<name>.test.mjs where that folder exists. */
export const GATE_KINDS = ["guard", "hook", "test", "validate", "conform", "doctor", "gates", "peers", "read-first"] as const;

export interface RuleBlock {
  id: string; // "02-25"
  line: number; // 1-based line of the rule start
  text: string;
  inCore: boolean;
  gate: string | null; // "test:sql-one-way" · "guard" · null
}

const RULE_START = /^- (?:### )?`(0[12]-\d{1,3})`/;
const FENCE_RULE = /^(0[12]-\d{1,3}) /;

/** Every `02-N` rule block of a rule file, in file order. A bullet runs through its indented continuation lines; a rule
 *  line inside a code fence runs until the next rule line or the fence end. */
export function ruleBlocks(text: string): RuleBlock[] {
  const lines = text.split(/\r?\n/);
  const out: RuleBlock[] = [];
  let inFence = false;
  let inCore = false;
  let cur: { id: string; line: number; body: string[]; inCore: boolean } | null = null;
  const close = (): void => {
    if (!cur) return;
    const body = cur.body.join("\n");
    // The LAST mark of the block is the rule's own: a rule may quote the mark syntax as an example in its text (02-73).
    const marks = [...body.matchAll(/<!-- gate: ([^>]*?) -->/g)];
    const g = marks.length ? marks[marks.length - 1] : null;
    out.push({ id: cur.id, line: cur.line, text: body, inCore: cur.inCore, gate: g ? g[1].trim() : null });
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith(CORE_START)) { close(); inCore = true; continue; }
    if (l.startsWith(CORE_END)) { close(); inCore = false; continue; }
    if (/^```/.test(l)) { close(); inFence = !inFence; continue; }
    const m = inFence ? FENCE_RULE.exec(l) : RULE_START.exec(l);
    if (m) { close(); cur = { id: m[1], line: i + 1, body: [l], inCore }; continue; }
    if (!cur) continue;
    if (inFence) { cur.body.push(l); continue; }
    if (/^\s+\S/.test(l)) { cur.body.push(l); continue; }
    if (l.trim() === "") {
      // A blank line stays inside the bullet only when the bullet goes on (indented) after it.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && /^\s+\S/.test(lines[j]) && !RULE_START.test(lines[j].trim())) { cur.body.push(l); continue; }
    }
    close();
  }
  close();
  return out;
}

/** The core section text (markers included), or null when the file has none. */
export function coreSection(text: string): string | null {
  const a = text.indexOf(CORE_START);
  const b = text.indexOf(CORE_END);
  if (a < 0 || b < a) return null;
  return text.slice(a, b + CORE_END.length);
}

/** The forced part of 01_CONSTITUTION: the no-gate block, the full text of every article it lists, and `## Mục đích`. */
export function hpCoreText(text: string): string {
  const lines = text.split(/\r?\n/);
  const parts: string[] = [];
  const s = lines.findIndex((l) => l.startsWith(NO_GATE_START));
  const e = lines.findIndex((l) => l.startsWith(NO_GATE_END));
  const listed = new Set<string>();
  if (s >= 0 && e > s) {
    const block = lines.slice(s, e + 1);
    parts.push(block.join("\n"));
    for (const l of block) for (const m of l.matchAll(/\*\*Điều (\d{1,2})\*\*/g)) listed.add(m[1]);
  }
  const h = lines.findIndex((l) => /^## Mục đích\b/.test(l));
  if (h >= 0) {
    let k = h + 1;
    while (k < lines.length && !/^## /.test(lines[k])) k++;
    parts.push(lines.slice(h, k).join("\n").trimEnd());
  }
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\d{1,2})\. /.exec(lines[i]);
    if (!m || !listed.has(m[1])) continue;
    let k = i + 1;
    while (k < lines.length && !/^\d{1,2}\. /.test(lines[k]) && !/^#/.test(lines[k])) k++;
    parts.push(lines.slice(i, k).join("\n").trimEnd());
  }
  return parts.join("\n\n");
}

export interface CoreIssues {
  /** No core markers in 02_RULES — the repo has not taken the standard with a core yet. */
  noCore: boolean;
  /** Rules outside the core with no gate mark. */
  unmarked: string[];
  /** Rules inside the core that carry a gate mark (a gated rule leaves the core). */
  gatedInCore: string[];
  /** Gate marks that do not resolve ("test:x" with no test file, an unknown kind). */
  badGate: string[];
  /** Characters of the core section when over CORE_MAX_CHARS, else 0. */
  overCap: number;
}

/** The holes in a rule file's core layout. `root` resolves `test:<name>` marks (checked only where backend/test exists). */
export function coreIssues(text: string, root: string | null): CoreIssues {
  const core = coreSection(text);
  const blocks = ruleBlocks(text);
  const testDir = root ? join(root, "backend", "test") : null;
  const checkTests = Boolean(testDir && existsSync(testDir));
  const badGate: string[] = [];
  for (const b of blocks) {
    if (!b.gate) continue;
    const [kind, ref] = b.gate.split(":");
    if (!(GATE_KINDS as readonly string[]).includes(kind)) badGate.push(`${b.id} (${b.gate})`);
    else if (kind === "test" && checkTests && (!ref || !existsSync(join(testDir as string, `${ref}.test.mjs`)))) badGate.push(`${b.id} (${b.gate})`);
  }
  return {
    noCore: core === null,
    unmarked: core === null ? [] : uniq(blocks.filter((b) => !b.inCore && !b.gate).map((b) => b.id)),
    gatedInCore: uniq(blocks.filter((b) => b.inCore && b.gate).map((b) => b.id)),
    badGate,
    overCap: core !== null && core.length > CORE_MAX_CHARS ? core.length : 0,
  };
}

export function coreIssueLines(i: CoreIssues): string[] {
  const out: string[] = [];
  if (i.noCore) out.push("02_RULES has no core section (zemory:core markers) — take the current standard (`zemory sync --standard`)");
  if (i.unmarked.length) out.push(`rule(s) ${i.unmarked.join(", ")} outside the core carry no gate mark — build the gate and mark it (how: rule 02-73), or move them into the core`);
  if (i.gatedInCore.length) out.push(`rule(s) ${i.gatedInCore.join(", ")} in the core carry a gate mark — a gated rule leaves the core`);
  if (i.badGate.length) out.push(`gate mark(s) that do not resolve: ${i.badGate.join(" · ")}`);
  if (i.overCap) out.push(`the core section is ${i.overCap} characters, over the ${CORE_MAX_CHARS} cap — tighten it or gate a rule`);
  return out;
}

/** Characters a session must read before acting: 02 core + 01 forced part + 05_TODO (whole files where markers lack). */
export function forcedChars(agentDir: string): number {
  const read = (f: string): string => {
    try { return readFileSync(join(agentDir, f), "utf8"); } catch { return ""; }
  };
  const rules = read("02_RULES.md");
  const hp = read("01_CONSTITUTION.md");
  const hpPart = hpCoreText(hp);
  return (coreSection(rules) ?? rules).length + (hpPart || hp).length + read("05_TODO.md").length;
}

/** The rule core as text for re-injection after a context compaction; "" when the repo has no core. Capped. */
export function coreForCompaction(agentDir: string, cap = 22000): string {
  let rules = "";
  let hp = "";
  try { rules = readFileSync(join(agentDir, "02_RULES.md"), "utf8"); } catch { /* fail-open */ }
  try { hp = readFileSync(join(agentDir, "01_CONSTITUTION.md"), "utf8"); } catch { /* fail-open */ }
  const core = coreSection(rules);
  if (!core) return "";
  const hpPart = hpCoreText(hp);
  const all = [core, hpPart].filter(Boolean).join("\n\n");
  return all.length > cap ? `${all.slice(0, cap)}\n… (cut at ${cap} characters — read the rest in 02_RULES §Lõi)` : all;
}

function uniq(a: string[]): string[] {
  return [...new Set(a)];
}
