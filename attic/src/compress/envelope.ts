// The compact envelope that replaces a large tool output in the transcript
// (plan 03 §6). It is short but ALWAYS recoverable: it carries the artifact
// handle plus the exact commands to recover the full output or search within it.
// The command is redacted because the envelope enters the model context.

import { redact } from "../brain/redact.js";

export interface EnvelopeInput {
  id: string;
  command?: string;
  exitCode?: number;
  beforeChars: number;
  afterChars: number;
  beforeLines: number;
  afterLines: number;
  /** Human summary of what was preserved (e.g. "3 failing suites, summary"). */
  kept?: string;
  /** A useful default search term to suggest. */
  searchTerm?: string;
  /** The compacted signal body shown inline. */
  signal: string;
}

const thousands = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Build the stable envelope card. */
export function buildEnvelope(e: EnvelopeInput): string {
  const lines: string[] = [`[zemory output ${e.id}]`];
  if (e.command) lines.push(`command: ${redact(e.command)}`);
  if (e.exitCode !== undefined) lines.push(`exit: ${e.exitCode}`);
  lines.push(
    `size: ${thousands(e.beforeChars)} -> ${thousands(e.afterChars)} chars (${e.beforeLines} -> ${e.afterLines} lines)`,
  );
  if (e.kept) lines.push(`kept: ${e.kept}`);
  lines.push(`full: zemory output show ${e.id}`);
  lines.push(`search: zemory output search ${e.id} "${e.searchTerm ?? "<term>"}"`);
  lines.push("---");
  lines.push(e.signal);
  return lines.join("\n");
}
