// `zemory run <cmd>` — run a shell command and compress its combined output
// before it reaches the agent. Preserves the command's exit code so the agent
// still sees pass/fail. The compression footer goes to stderr so stdout stays
// the clean (compressed) result.

import { spawnSync } from "node:child_process";
import { basename } from "node:path";
import { type CompressResult, compress } from "./compress.js";

export interface RunResult extends CompressResult {
  code: number;
  cmd: string;
  rawChars: number; // original combined output length (for the savings ledger)
}

// Guess a command family from the argv[0] for command-aware compression.
function cmdFamily(cmd: string): string | undefined {
  const head = basename((cmd.trim().split(/\s+/)[0] ?? "").toLowerCase());
  if (head === "git") return "git";
  if (["npm", "pnpm", "yarn", "bun", "pip", "cargo"].includes(head)) return "install";
  if (["pytest", "jest", "vitest", "mocha", "go"].includes(head)) return "test";
  return undefined;
}

/** Run `cmd` via the shell, compress stdout+stderr together, keep exit code. */
export function runCompressed(cmd: string): RunResult {
  const r = spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const raw = (r.stdout ?? "") + (r.stderr ?? "");
  const compressed = compress(raw, { cmd: cmdFamily(cmd) });
  return { ...compressed, code: r.status ?? 0, cmd, rawChars: raw.length };
}
