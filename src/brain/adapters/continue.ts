// Continue (VSCode/JetBrains extension) adapter. Transcripts:
// ~/.continue/sessions/<id>.json — ONE JSON object per session (whole-mode):
// { sessionId, title, workspaceDirectory (file://), history: [{ message }] }.
// Continue rewrites the file as the chat grows, so we re-parse on change;
// message.id dedupes, and a wholesale delete+reinsert keeps edits consistent.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { clip, decodeFileUri, safeReaddir, safeStat, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSession, TranscriptFile } from "./types.js";

export const continueAdapter: Adapter = {
  source: "continue",
  mode: "whole",
  signature: join(".continue", "sessions"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json") || f === "sessions.json") continue; // sessions.json = index
      const t = toTranscript("continue", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  sessionId(filePath: string): string {
    return "continue-" + basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseFile(filePath: string): ParsedSession | null {
    let o: any;
    try {
      o = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    // No per-message timestamps in Continue → fall back to file mtime for dates.
    const ts = new Date(safeStat(filePath)?.mtimeMs ?? Date.now()).toISOString();
    const messages: ParsedMessage[] = [];
    let idx = 0;
    for (const h of o.history ?? []) {
      const m = h?.message;
      if (!m) continue;
      const role = m.role;
      if (role !== "user" && role !== "assistant") continue;
      const content = flatten(m.content);
      if (!content) continue;
      messages.push({
        uuid: m.id ?? `${idx}`,
        role,
        content,
        toolName: null,
        timestamp: ts,
      });
      idx++;
    }
    return { cwd: decodeFileUri(o.workspaceDirectory), title: o.title, messages };
  },
};

function flatten(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const b of content) {
    if (b && typeof b === "object" && typeof (b as any).text === "string") parts.push((b as any).text);
  }
  return clip(parts.join("\n").trim());
}
