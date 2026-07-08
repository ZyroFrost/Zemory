// LM Studio adapter. Local-LLM desktop chat app. Transcripts:
// ~/.lmstudio/conversations/<ts>.conversation.json (whole-mode). No project/cwd
// (standalone chat). Each message holds versions[]; the selected version has
// the role + content blocks. Empty/failed chats are dropped by the ingest
// engine's zero-message rule.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { clip, safeReaddir, safeStat, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSession, TranscriptFile } from "./types.js";

export const lmstudioAdapter: Adapter = {
  source: "lmstudio",
  mode: "whole",
  signature: join(".lmstudio", "conversations"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      const t = toTranscript("lmstudio", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  sessionId(filePath: string): string {
    return "lmstudio-" + basename(filePath).replace(/\.conversation\.json$|\.[^.]+$/, "");
  },

  parseFile(filePath: string): ParsedSession | null {
    let o: any;
    try {
      o = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    const base =
      typeof o.createdAt === "number" ? o.createdAt : (safeStat(filePath)?.mtimeMs ?? Date.now());
    const ts = new Date(base).toISOString();

    const messages: ParsedMessage[] = [];
    let idx = 0;
    for (const m of o.messages ?? []) {
      const v = m?.versions?.[m.currentlySelected ?? 0];
      if (!v) continue;
      const role = v.role;
      if (role !== "user" && role !== "assistant") continue;
      // user versions carry `content[]`; assistant versions carry `steps[]`
      // (each step a contentBlock with its own content[]).
      const content = v.content ? flatten(v.content) : flattenSteps(v.steps);
      if (!content) continue;
      messages.push({ uuid: `${idx}`, role, content, toolName: null, timestamp: ts });
      idx++;
    }
    return { cwd: undefined, title: o.name, messages };
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

// Assistant turns are a list of steps; each contentBlock step has content[].
function flattenSteps(steps: unknown): string {
  if (!Array.isArray(steps)) return "";
  const parts: string[] = [];
  for (const s of steps) {
    if (s && typeof s === "object" && Array.isArray((s as any).content)) {
      const t = flatten((s as any).content);
      if (t) parts.push(t);
    }
  }
  return clip(parts.join("\n").trim());
}
