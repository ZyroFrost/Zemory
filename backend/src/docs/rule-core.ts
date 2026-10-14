// The rule CORE (plan/27 §3): the rules no machine gate holds. They sit in ONE section at the top of 02_RULES, bounded by
// markers, and that section is the only part of the rule set read-first forces and the SessionStart(compact) hook
// re-injects. Every other rule `02-N` carries a gate mark `<!-- gate: <kind>[:<ref>] -->` in its own block. One reader
// for three users: `zemory gates` (the holes), the compaction hook (the text), tests.
//
// The read-first latch is a generated stdlib script and cannot import this; it carries its own small marker reader —
// both sides key on the SAME markers (CORE_START / CORE_END / the no-gate block), and rule-core.test pins them together.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { guardMatcherGaps, precommitState } from "./guard-gen.js";
import { NO_GATE_END, NO_GATE_START } from "./no-gate.js";
import { READ_FIRST_FILE } from "./read-first-src.js";
import { RULE_HOOKS } from "./rule-hooks-src.js";
import { SQL_GATE_FILE } from "./sql-gate-src.js";

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
  /** `<!-- gate-todo: … -->`: registered as gateable, the hook is not built yet (it stays in the core until it is). */
  todo: string | null;
}
// A rule registers what it is (plan/27 §3): `gate:` = has a machine gate · `gate-todo:` = gateable, gate not built ·
// neither, inside the core = a judgement rule, registered as NOT gateable — never reported as a gap.

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
    const todo = /<!-- gate-todo: ([^>]*?) -->/.exec(body);
    out.push({ id: cur.id, line: cur.line, text: body, inCore: cur.inCore, gate: g ? g[1].trim() : null, todo: todo ? todo[1].trim() : null });
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

export interface RuleCoverage {
  noCore: boolean;
  /** Rules registered as gateable (a `gate:` mark that applies here + every `gate-todo:`). */
  gateable: number;
  /** Of those, the ones whose gate is really in place in THIS repo. */
  hooked: number;
  /** Judgement rules — registered as not gateable, never a gap. */
  judgement: number;
  /** Registered gateable, no working gate found: `{ id, why }`. */
  missing: Array<{ id: string; why: string }>;
}

/** What is really in place in a repo, read once: the inputs every gate mark is checked against. */
interface GateFacts {
  root: string;
  hooksDir: string;
  policy: { rule_hooks?: Array<{ file: string }>; sql?: unknown; read_first?: unknown } | null;
  guardWired: boolean;
  precommit: ReturnType<typeof precommitState>;
  userHooks: string;
}
/** The value of a read, or the fallback when it throws (fail-open). */
function readOr<T>(read: () => T, fallback: T): T {
  try { return read(); } catch { return fallback; }
}
function gateFacts(root: string, agentDir: string): GateFacts {
  const hooksDir = join(agentDir, "..", "hooks");
  const policy = readOr<GateFacts["policy"]>(() => JSON.parse(readFileSync(join(hooksDir, "policy.json"), "utf8")), null);
  const settings = join(root, ".claude", "settings.json");
  const gaps = guardMatcherGaps(existsSync(settings) ? readFileSync(settings, "utf8") : null);
  const userHooks = readOr(() => readFileSync(join(homedir(), ".claude", "settings.json"), "utf8"), "");
  return { root, hooksDir, policy, guardWired: existsSync(join(hooksDir, "guard.cjs")) && gaps !== null && gaps.length === 0, precommit: precommitState(root), userHooks };
}
/** One mark against the facts: "ok" · "na" (the rule's gate does not apply here) · a reason it is missing. */
function resolveGate(id: string, mark: string, f: GateFacts): "ok" | "na" | string {
  const [kind, ref] = mark.split(":");
  if (kind === "guard") {
    if (!f.guardWired) return "guard not wired";
    const own = RULE_HOOKS.find((h) => h.file.startsWith(`${id}_`));
    if (own) {
      if (!existsSync(join(f.hooksDir, own.file))) return `${own.file} missing`;
      if (!(f.policy?.rule_hooks ?? []).some((h) => h.file === own.file)) return `${own.file} not in policy.rule_hooks`;
    }
    if (id === "02-25") {
      if (!f.policy?.sql) return "na"; // no named-SQL store in this repo: the hook switches on with the first one
      if (!existsSync(join(f.hooksDir, SQL_GATE_FILE))) return `${SQL_GATE_FILE} missing`;
    }
    return "ok";
  }
  if (kind === "read-first") return existsSync(join(f.hooksDir, READ_FIRST_FILE)) && f.guardWired && f.policy?.read_first ? "ok" : "read-first latch not in place";
  if (kind === "hook") {
    if (ref === "precommit-guard") return f.precommit === "guard" ? "ok" : f.precommit === "no-git" ? "na" : "pre-commit not wired";
    if (ref === "rule-reminders") return /zemory(\.cmd)? hook prompt/.test(f.userHooks) ? "ok" : "prompt hook not installed (zemory hook install)";
    if (ref === "send-guard") return /zemory(\.cmd)? hook send-guard/.test(f.userHooks) ? "ok" : "send-guard hook not installed";
    return `unknown hook ${ref}`;
  }
  if (kind === "test") return existsSync(join(f.root, "backend", "test", `${ref}.test.mjs`)) ? "ok" : `test ${ref} missing`;
  if (["validate", "conform", "doctor", "gates", "peers"].includes(kind)) return "ok"; // the CLI itself — present wherever this runs
  return `unknown gate ${mark}`;
}

/** For every rule registered as gateable, is its gate really in place in this repo? Judgement rules are not counted. */
export function ruleCoverage(root: string, agentDir: string): RuleCoverage {
  const text = readOr(() => readFileSync(join(agentDir, "02_RULES.md"), "utf8"), "");
  const out: RuleCoverage = { noCore: coreSection(text) === null, gateable: 0, hooked: 0, judgement: 0, missing: [] };
  if (!text) return out;
  const facts = gateFacts(root, agentDir);
  const seen = new Set<string>();
  for (const b of ruleBlocks(text)) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    if (b.gate) {
      const r = resolveGate(b.id, b.gate, facts);
      if (r === "na") continue;
      out.gateable++;
      if (r === "ok") out.hooked++;
      else out.missing.push({ id: b.id, why: r });
    } else if (b.todo) {
      out.gateable++;
      out.missing.push({ id: b.id, why: `gate not built yet (${b.todo})` });
    } else if (b.inCore) {
      out.judgement++;
    }
  }
  return out;
}

export function ruleCoverageLines(c: RuleCoverage): string[] {
  if (!c.missing.length) return [];
  return [`${c.missing.length} rule(s) registered as gateable with no working gate (${c.hooked}/${c.gateable}): ` +
    c.missing.map((m) => `${m.id} ${m.why}`).join(" · ")];
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
