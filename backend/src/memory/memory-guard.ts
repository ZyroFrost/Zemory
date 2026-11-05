// Rule_Gate_94_NoAgentMemory: no write into a coding agent's own memory folder (Claude Code: ~/.claude/projects/<p>/memory/).
// That memory is text an agent may or may not read, with no gate behind it; what has to hold lives in the harness - a law
// with its hook in HS, or the repo's own docs. One implementation, wired per machine as a PreToolUse hook on every session
// (`zemory hook memory-guard` natively, `host-hook.mjs memory-guard` on a Docker machine, which runs it on the host without
// the daemon). Node built-ins only. Reading and deleting pass: the move into HS reads them, deleting is Rule_Gate_10's.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** A path inside an agent memory folder, any spelling: C:\Users\x\.claude\projects\p\memory\a.md · ~/.claude/projects/p/memory */
export const MEMORY_PATH = /[\\/]\.claude[\\/]+projects[\\/]+[^\\/"'\s]+[\\/]+memory(?:[\\/]|["'\s]|$)/i;

/** A shell command that writes (redirect · copy/move · write cmdlets · in-place edit · an interpreter writing a file). */
const SHELL_WRITE = new RegExp(
  [
    String.raw`(^|[^<>&|2])>{1,2}(?!&)`,
    String.raw`\btee\b`,
    String.raw`\b(cp|mv|install|rsync|touch|dd)\b`,
    String.raw`\bsed\s+-i\b`,
    String.raw`\b(Set-Content|Add-Content|Out-File|New-Item|Copy-Item|Move-Item|Rename-Item)\b`,
    String.raw`\b(sc|ac|ni|cpi|mi|copy|move|ren)\s`,
    String.raw`writeFile|appendFile|createWriteStream|WriteAllText|AppendAllText`,
    String.raw`open\([^)]*['"][wa]\+?['"]`,
  ].join("|"),
  "i",
);

const FILE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
/** The PreToolUse matcher both installs wire the hook with (native capture-hook.ts, Docker host-hook.mjs). */
export const MEMORY_GUARD_MATCHER = [...FILE_TOOLS, ...SHELL_TOOLS].join("|");

/** The memory path a call writes to, or null when the call does not write into an agent memory folder. */
export function memoryWrite(payload: unknown): string | null {
  const p = (payload ?? {}) as { tool_name?: string; tool_input?: Record<string, unknown> };
  const tool = String(p.tool_name ?? "");
  const ti = p.tool_input ?? {};
  if (FILE_TOOLS.has(tool)) {
    const f = String(ti.file_path ?? ti.notebook_path ?? "");
    return MEMORY_PATH.test(f) ? f : null;
  }
  if (SHELL_TOOLS.has(tool)) {
    const cmd = String(ti.command ?? "");
    const m = MEMORY_PATH.exec(cmd);
    return m && SHELL_WRITE.test(cmd) ? m[0].trim() : null;
  }
  return null;
}

/** The rule's English text from HS (the header file of the part), capped; empty when HS is not beside this build. */
function ruleText(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const self = process.env.ZEMORY_SELF?.trim() || join(here, "..", "..");
    const name = "Rule_Gate_94_NoAgentMemory";
    const f = join(self, "docs_template", "_Store", "01_LAW", "_Rule", "01_Harness", name, `${name}.md`);
    if (!existsSync(f)) return "";
    let lines = readFileSync(f, "utf8").split(/\r?\n/);
    if (lines[0] === "---") lines = lines.slice(lines.indexOf("---", 1) + 1);
    return lines.filter((l, i) => i > 0 || l.trim()).slice(0, 24).join("\n").trim();
  } catch {
    return "";
  }
}

/** The block message (stderr, exit 2), or null to let the call through. Any error lets it through (fail-open). */
export function memoryGuard(payload: unknown): string | null {
  try {
    const where = memoryWrite(payload);
    if (!where) return null;
    const text = ruleText();
    return (
      `BLOCKED: Rule_Gate_94_NoAgentMemory - this writes into the agent's own memory (${where}). Nothing is written there: ` +
      "a lesson, a rule or a preference goes into the harness - a law in HS (docs_template/_Store/01_LAW) with its hook, or " +
      "the repo's own docs (01_CONSTITUTION · 05_TODO · 06_CHANGES · docs/plan). Tell the person where it was written." +
      (text ? `\n\nThe rule:\n${text}` : "")
    );
  } catch {
    return null;
  }
}
