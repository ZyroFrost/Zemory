// Codex CLI adapter. Transcripts: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
// (append-mode jsonl). Lines: session_meta (cwd/id), response_item (messages),
// event_msg / turn_context (skipped).

import { basename, join } from "node:path";
import { clip, toTranscript, walkFiles } from "./_shared.js";
import type { Adapter, ParsedLine, TranscriptFile } from "./types.js";

export const codexAdapter: Adapter = {
  source: "codex",
  mode: "append",
  signature: join(".codex", "sessions"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of walkFiles(storeRoot, "jsonl")) {
      const t = toTranscript("codex", f);
      if (t) out.push(t);
    }
    return out;
  },

  sessionId(filePath: string): string {
    return basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseLine(line: string): ParsedLine {
    const trimmed = line.trim();
    if (!trimmed) return { kind: "skip" };
    let o: any;
    try {
      o = JSON.parse(trimmed);
    } catch {
      return { kind: "skip" };
    }
    const p = o.payload ?? {};

    if (o.type === "session_meta" && p.cwd) return { kind: "meta", cwd: p.cwd };

    if (o.type === "response_item" && p.type === "message") {
      // Keep real conversation only; 'developer'/'system' = instructions noise.
      const role = p.role;
      if (role !== "user" && role !== "assistant") return { kind: "skip" };
      const content = flatten(p.content);
      if (!content) return { kind: "skip" };
      return {
        kind: "message",
        msg: { uuid: p.id ?? null, role, content, toolName: null, timestamp: o.timestamp ?? null },
      };
    }
    return { kind: "skip" };
  },
};

// Codex content blocks: { type: 'input_text'|'output_text'|'text', text }
function flatten(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const block = b as any;
    if (typeof block.text === "string") parts.push(block.text);
    else if (block.type && block.type !== "text") parts.push(`[${block.type}]`);
  }
  return clip(parts.join("\n").trim());
}
