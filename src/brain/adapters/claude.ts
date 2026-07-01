// Claude Code adapter. Transcripts: ~/.claude/projects/<proj>/<id>.jsonl
// (append-mode jsonl). Each line is one record; user/assistant carry messages.

import { basename, join } from "node:path";
import { clip, isDir, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedLine, TranscriptFile } from "./types.js";

export const claudeAdapter: Adapter = {
  source: "claude-code",
  mode: "append",
  signature: join(".claude", "projects"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const proj of safeReaddir(storeRoot)) {
      const projPath = join(storeRoot, proj);
      if (!isDir(projPath)) continue;
      for (const f of safeReaddir(projPath)) {
        if (!f.endsWith(".jsonl")) continue;
        const t = toTranscript("claude-code", join(projPath, f));
        if (t) out.push(t);
      }
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

    if (o.type === "ai-title" && typeof o.aiTitle === "string") {
      return { kind: "title", title: o.aiTitle };
    }
    if (o.type === "user" || o.type === "assistant") {
      const m = o.message ?? {};
      const content = flatten(m.content);
      if (!content) return o.cwd ? { kind: "meta", cwd: o.cwd } : { kind: "skip" };
      return {
        kind: "message",
        msg: {
          uuid: o.uuid ?? null,
          role: m.role ?? o.type,
          content,
          toolName: firstTool(m.content),
          timestamp: o.timestamp ?? null,
        },
      };
    }
    if (o.cwd) return { kind: "meta", cwd: o.cwd };
    return { kind: "skip" };
  },
};

function flatten(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const block = b as any;
    switch (block.type) {
      case "text":
        if (typeof block.text === "string") parts.push(block.text);
        break;
      case "tool_use":
        parts.push(`[tool_use:${block.name}] ${clip(JSON.stringify(block.input ?? {}))}`);
        break;
      case "tool_result":
        parts.push(`[tool_result] ${clip(resultText(block.content))}`);
        break;
      // 'thinking' intentionally skipped: large, internal, noisy.
    }
  }
  return parts.join("\n").trim();
}

function firstTool(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  for (const b of content) {
    if (b && typeof b === "object" && (b as any).type === "tool_use") return (b as any).name ?? null;
  }
  return null;
}

function resultText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((b) => (b && typeof b === "object" && (b as any).type === "text" ? (b as any).text : ""))
      .join("\n");
  }
  return c == null ? "" : JSON.stringify(c);
}
