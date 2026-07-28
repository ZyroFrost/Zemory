// LM Studio adapter. Local-LLM desktop chat app. Transcripts:
// ~/.lmstudio/conversations/<ts>.conversation.json (whole-mode). No project/cwd
// (standalone chat). Each message holds versions[]; the selected version has
// the role + content blocks. Empty/failed chats are dropped by the ingest
// engine's zero-message rule.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { imageAttachment, imageLabel, safeReaddir, safeStat, toTranscript } from "./_shared.js";
import type { Adapter, ParsedAttachment, ParsedMessage, ParsedSession, TranscriptFile } from "./types.js";

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
      const atts: ParsedAttachment[] = [];
      const content = v.content ? flatten(v.content, atts) : flattenSteps(v.steps, atts);
      if (!content) continue;
      messages.push({ uuid: `${idx}`, role, content, toolName: null, timestamp: ts, ...(atts.length ? { attachments: atts } : {}) });
      idx++;
    }
    return { cwd: undefined, title: o.name, messages };
  },
};

function flatten(content: unknown, atts?: ParsedAttachment[]): string {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    // Bản cũ CHỈ lấy `.text` ⇒ mọi block khác biến mất KHÔNG dấu vết (cùng họ lỗi làm mất
    // 93 MB ảnh ở lớp Claude Code). Ảnh nay thành đính kèm + để lại nhãn; block lạ vẫn bỏ
    // qua như cũ — KHÔNG đoán hình dạng chưa từng thấy.
    const a = imageAttachment(b);
    if (a) {
      atts?.push(a);
      parts.push(imageLabel(a));
      continue;
    }
    if (typeof (b as any).text === "string") parts.push((b as any).text);
  }
  return parts.join("\n").trim();
}

// Assistant turns are a list of steps; each contentBlock step has content[].
function flattenSteps(steps: unknown, atts?: ParsedAttachment[]): string {
  if (!Array.isArray(steps)) return "";
  const parts: string[] = [];
  for (const s of steps) {
    if (s && typeof s === "object" && Array.isArray((s as any).content)) {
      const t = flatten((s as any).content, atts);
      if (t) parts.push(t);
    }
  }
  return parts.join("\n").trim();
}
