// Rule 11 at the end of a turn (plan/28 §0o): a turn that changed code must have run a check AFTER the last change before
// it ends. "Done" without a measurement is the failure this rule exists for; a reminder about it is ignorable, evidence in
// the transcript is not. The check is the transcript itself: the tool calls since the person last spoke.
//
// Edits = Write / Edit / MultiEdit / NotebookEdit on a code file OF THE REPO (inside the session's cwd; a scratch file in the
// host's temp folder or a file of another repo is not this repo's code). Checks = a shell command that runs the repo's gate,
// tests, type check or lint (or a command the repo declares in its marker as one of its own gates), or that runs the changed
// script itself - a changed SQL file fed to its client too. The verdict blocks once per turn: the host marks a Stop that
// follows our own block with `stop_hook_active`, and that one always passes.
import { closeSync, fstatSync, openSync, readSync } from "node:fs";

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|ps1|psm1|sh|sql|cs|go|rs|java|kt|rb|php|vue|svelte)$/i;
const CHECK = /\b(npm\s+(run\s+)?(test|check|lint|build|typecheck)|pnpm\s+(test|check|lint)|yarn\s+(test|check|lint)|node\s+--test|npx\s+(tsc|eslint|vitest|jest|mocha|playwright)|tsc\b|eslint\b|pytest|python\d?\s+-m\s+(pytest|unittest)|py\s+-m\s+(pytest|unittest)|dotnet\s+test|go\s+test|cargo\s+test|zemory\s+(gates|conform|validate|doctor))/i;

interface Call { name: string; input: Record<string, unknown> }

// A command that only shows a file names it without running it.
const SHOWS = /^(cat|type|more|less|head|tail|grep|egrep|rg|findstr|select-string|sls|get-content|gc|ls|dir|wc|diff|git|code|notepad|echo)$/i;
/** Running a script changed this turn is a measurement of that change (a department repo 2026-11-16: `cmd /c "bin\_python.cmd
 *  tasks\...\08_check_output.py"` read 66,240 cells with 0 gaps right after the last edit, and the turn was still held). */
function runsChanged(cmd: string, changed: string[]): boolean {
  if (!changed.length) return false;
  const first = (cmd.trim().match(/^[^\s"'|;&<>]+/) ?? [""])[0];
  if (SHOWS.test(first)) return false;
  const norm = cmd.replace(/\\/g, "/").toLowerCase();
  return changed.some((f) => {
    const name = f.split("/").pop()!.toLowerCase();
    // a SQL file runs through its client (psql -f x.sql · psql < x.sql · sqlcmd -i x.sql): the warehouse repo, 2026-11-23,
    // changed a read-only query, ran it at once, and every later turn was still held for it
    return /\.(py|ps1|psm1|sh|js|mjs|cjs|ts|sql)$/.test(name) && new RegExp(`(^|[\\s"'/])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s"']|$)`).test(norm);
  });
}

/** Is the file inside the repo (the session's cwd)? Relative paths are; no root known ⇒ every file counts (the old rule).
 *  Compared case-blind with `/` separators: a Windows path and its root differ only in case and slashes. */
function insideRoot(file: string, root: string): boolean {
  if (!root) return true;
  const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const f = norm(file);
  if (!/^([a-z]:\/|\/)/.test(f)) return true;
  const r = norm(root);
  return f === r || f.startsWith(r + "/");
}

/** The tool calls the agent made since the last thing the person typed (oldest first). */
export function callsThisTurn(transcriptText: string): Call[] {
  let calls: Call[] = [];
  for (const line of transcriptText.split("\n")) {
    if (!line.trim()) continue;
    let j: { type?: string; message?: { role?: string; content?: unknown }; isMeta?: boolean };
    try { j = JSON.parse(line); } catch { continue; }
    const content = j.message?.content;
    if (j.type === "user" && !j.isMeta) {
      // a person's turn: text, not only tool results (a tool result also arrives as a "user" record)
      const typed = typeof content === "string" ? content.trim() !== "" && !/^<(task-notification|system-reminder)/.test(content.trim())
        : Array.isArray(content) && content.some((c: { type?: string; text?: string }) => c?.type === "text" && !/^\s*<(task-notification|system-reminder)/.test(c.text ?? ""));
      if (typed) calls = [];
      continue;
    }
    if (j.type === "assistant" && Array.isArray(content)) {
      for (const c of content as Array<{ type?: string; name?: string; input?: Record<string, unknown> }>) {
        if (c?.type === "tool_use" && c.name) calls.push({ name: c.name, input: c.input ?? {} });
      }
    }
  }
  return calls;
}

/** null = the turn may end · string = why it may not (the code files changed after the last check).
 *  root = the repo (the session's cwd): a file outside it is not the repo's code - 2026-11-23 a read-only query in the host's
 *  scratch folder held every turn of a warehouse session for hours, the repo's gate green each time. */
export function turnEvidence(transcriptText: string, ownGates: string[] = [], root = ""): string | null {
  const calls = callsThisTurn(transcriptText);
  let changed: string[] = [];
  for (const c of calls) {
    const file = String(c.input.file_path ?? c.input.notebook_path ?? "");
    if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(c.name) && CODE.test(file)) {
      if (insideRoot(file, root)) changed.push(file.replace(/\\/g, "/").split("/").slice(-2).join("/"));
      continue;
    }
    const cmd = typeof c.input.command === "string" ? c.input.command : "";
    if (cmd && (CHECK.test(cmd) || ownGates.some((g) => g && cmd.includes(g)) || runsChanged(cmd, changed))) changed = [];
  }
  if (!changed.length) return null;
  const list = [...new Set(changed)];
  return `Rule_Gate_01_DoneMeansRun: this turn changed code (${list.slice(0, 5).join(" · ")}${list.length > 5 ? ` +${list.length - 5}` : ""}) ` +
    "and ran no check after the last change. Run the repo's check (its gate, tests, type check or lint) and report the result " +
    "with its numbers — or say plainly that it was not run and why.";
}

// Rule 27's vocabulary in what the agent SAYS (2026-10-19: the file hook held the shelves and the prose files, and the sessions
// kept saying "kho" to the user and to each other). The same pattern as hook 02-27 (rule-hooks-src.ts — a parity test holds the
// two equal): "kho" alone names two things, the data warehouse (DW) and the harness store (HS).
export const KHO_WORD = /(^|[^\p{L}])[Kk]ho(?![\p{L}])(?!\s+(?:dữ\s+liệu|hàng))/u;
const KHO_STOCK = /(tồn|nhập|xuất|kiểm)\s+kho(?![\p{L}])/giu;
const KHO_QUOTED = /"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/g;

/**
 * What the agent wrote since the last Stop (its text blocks after the last typed line or the last `stop_hook_summary`),
 * oldest first. Text before an earlier Stop was already checked there: a turn woken by another session's message (a META
 * user record, so no typed line) kept a blocked line from the person's last prompt in "this turn" and re-blocked every
 * reply with it (a department repo, 2026-11-12).
 */
export function replyThisTurn(transcriptText: string): string {
  let parts: string[] = [];
  for (const line of transcriptText.split("\n")) {
    if (!line.trim()) continue;
    let j: { type?: string; subtype?: string; message?: { content?: unknown }; isMeta?: boolean };
    try { j = JSON.parse(line); } catch { continue; }
    if (j.type === "system" && j.subtype === "stop_hook_summary") { parts = []; continue; }
    const content = j.message?.content;
    if (j.type === "user" && !j.isMeta) {
      const typed = typeof content === "string" ? content.trim() !== "" && !/^<(task-notification|system-reminder)/.test(content.trim())
        : Array.isArray(content) && content.some((c: { type?: string; text?: string }) => c?.type === "text" && !/^\s*<(task-notification|system-reminder)/.test(c.text ?? ""));
      if (typed) parts = [];
      continue;
    }
    if (j.type === "assistant" && Array.isArray(content)) {
      for (const c of content as Array<{ type?: string; text?: string }>) if (c?.type === "text" && c.text) parts.push(c.text);
    }
  }
  return parts.join("\n");
}

/** null = the reply keeps the vocabulary · string = the lines that say "kho" alone (code and quotes are mentions, not uses). */
export function replyVocab(text: string): string | null {
  const prose = text.replace(/```[\s\S]*?```/g, "");
  const bad = prose.split("\n").filter((l) => KHO_WORD.test(l.replace(KHO_QUOTED, "").replace(KHO_STOCK, "")));
  if (!bad.length) return null;
  return "Rule_Gate_27_HarnessLanguage: this reply says \"kho\" alone, which names two different things — write DW (the data " +
    "warehouse) or HS (the harness store) and send it again:\n" + bad.slice(0, 3).map((l) => "  " + l.trim().slice(0, 110)).join("\n");
}

/** Is this transcript line something the person typed (not a tool result, a meta record or a host notice)? */
function typedLine(line: string): boolean {
  if (!line.includes('"user"')) return false;
  let j: { type?: string; message?: { content?: unknown }; isMeta?: boolean };
  try { j = JSON.parse(line); } catch { return false; }
  if (j.type !== "user" || j.isMeta) return false;
  const content = j.message?.content;
  return typeof content === "string" ? content.trim() !== "" && !/^<(task-notification|system-reminder)/.test(content.trim())
    : Array.isArray(content) && content.some((c: { type?: string; text?: string }) => c?.type === "text" && !/^\s*<(task-notification|system-reminder)/.test(c.text ?? ""));
}

/**
 * The current turn of a transcript: its lines from the last thing the person typed to the end, read BACKWARDS in chunks.
 * The Stop hook read and parsed the whole file on every turn end; a long session's transcript is tens of MB on the
 * container's 9p mount, and that held the daemon's event loop for 20-50 s (measured through the inspector, 2026-11-09).
 * Equal for callsThisTurn/replyThisTurn: both reset at the last typed line anyway. No typed line ⇒ the whole file.
 */
export function readTurn(path: string, chunk = 256 * 1024): string {
  const fd = openSync(path, "r");
  try {
    let pos = fstatSync(fd).size;
    let tail = Buffer.alloc(0);
    while (pos > 0) {
      const n = Math.min(chunk, pos);
      pos -= n;
      const buf = Buffer.alloc(n);
      readSync(fd, buf, 0, n, pos);
      tail = Buffer.concat([buf, tail]);
      // the first line may be cut by the chunk edge: a cut piece never parses as a record (quotes inside a JSON string are
      // escaped), so it can never pass for a typed line; the next chunk completes it
      const lines = tail.toString("utf8").split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        if (typedLine(lines[i])) return lines.slice(i).join("\n");
      }
    }
    return tail.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

/** The Stop hook's answer: a block decision once per turn, nothing otherwise (fail-open on any error). */
export function stopDecision(
  payload: { transcript_path?: unknown; stop_hook_active?: unknown; cwd?: unknown },
  ownGates: string[] = [],
  checks: { evidence?: boolean; vocab?: boolean } = { evidence: true },
): string {
  if (payload.stop_hook_active === true) return "";
  const p = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  if (!p) return "";
  try {
    const text = readTurn(p);
    const root = typeof payload.cwd === "string" ? payload.cwd : "";
    const why = [checks.evidence ? turnEvidence(text, ownGates, root) : null, checks.vocab ? replyVocab(replyThisTurn(text)) : null]
      .filter((x): x is string => Boolean(x));
    return why.length ? JSON.stringify({ decision: "block", reason: why.join("\n\n") }) : "";
  } catch {
    return "";
  }
}
