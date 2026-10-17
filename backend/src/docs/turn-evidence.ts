// Rule 11 at the end of a turn (plan/28 §0o): a turn that changed code must have run a check AFTER the last change before
// it ends. "Done" without a measurement is the failure this rule exists for; a reminder about it is ignorable, evidence in
// the transcript is not. The check is the transcript itself: the tool calls since the person last spoke.
//
// Edits = Write / Edit / MultiEdit / NotebookEdit on a code file. Checks = a shell command that runs the repo's gate, tests,
// type check or lint (or a command the repo declares in its marker as one of its own gates). The verdict blocks once per
// turn: the host marks a Stop that follows our own block with `stop_hook_active`, and that one always passes.
import { readFileSync } from "node:fs";

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|ps1|psm1|sh|sql|cs|go|rs|java|kt|rb|php|vue|svelte)$/i;
const CHECK = /\b(npm\s+(run\s+)?(test|check|lint|build|typecheck)|pnpm\s+(test|check|lint)|yarn\s+(test|check|lint)|node\s+--test|npx\s+(tsc|eslint|vitest|jest|mocha|playwright)|tsc\b|eslint\b|pytest|python\d?\s+-m\s+(pytest|unittest)|py\s+-m\s+(pytest|unittest)|dotnet\s+test|go\s+test|cargo\s+test|zemory\s+(gates|conform|validate|doctor))/i;

interface Call { name: string; input: Record<string, unknown> }

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

/** null = the turn may end · string = why it may not (the code files changed after the last check). */
export function turnEvidence(transcriptText: string, ownGates: string[] = []): string | null {
  const calls = callsThisTurn(transcriptText);
  let changed: string[] = [];
  for (const c of calls) {
    const file = String(c.input.file_path ?? c.input.notebook_path ?? "");
    if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(c.name) && CODE.test(file)) {
      changed.push(file.replace(/\\/g, "/").split("/").slice(-2).join("/"));
      continue;
    }
    const cmd = typeof c.input.command === "string" ? c.input.command : "";
    if (cmd && (CHECK.test(cmd) || ownGates.some((g) => g && cmd.includes(g)))) changed = [];
  }
  if (!changed.length) return null;
  const list = [...new Set(changed)];
  return `Rule_Gate_01_DoneMeansRun: this turn changed code (${list.slice(0, 5).join(" · ")}${list.length > 5 ? ` +${list.length - 5}` : ""}) ` +
    "and ran no check after the last change. Run the repo's check (its gate, tests, type check or lint) and report the result " +
    "with its numbers — or say plainly that it was not run and why.";
}

/** The Stop hook's answer: a block decision once per turn, nothing otherwise (fail-open on any error). */
export function stopDecision(payload: { transcript_path?: unknown; stop_hook_active?: unknown }, ownGates: string[] = []): string {
  if (payload.stop_hook_active === true) return "";
  const p = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  if (!p) return "";
  try {
    const why = turnEvidence(readFileSync(p, "utf8"), ownGates);
    return why ? JSON.stringify({ decision: "block", reason: why }) : "";
  } catch {
    return "";
  }
}
