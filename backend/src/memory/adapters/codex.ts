// Codex CLI adapter. Transcripts: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
// (append-mode jsonl). Lines: session_meta (cwd/id), response_item (messages),
// event_msg / turn_context (skipped).

import { basename, join } from "node:path";
import { imageAttachment, imageLabel, toTranscript, walkFiles } from "./_shared.js";
import type { Adapter, ParsedAttachment, ParsedLine, TranscriptFile } from "./types.js";

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
      const atts: ParsedAttachment[] = [];
      const content = flatten(p.content, atts);
      if (!content) return { kind: "skip" };
      return {
        kind: "message",
        msg: {
          uuid: p.id ?? null,
          role,
          content,
          toolName: null,
          timestamp: o.timestamp ?? null,
          ...(atts.length ? { attachments: atts } : {}),
        },
      };
    }
    return { kind: "skip" };
  },
};

// Codex content blocks: { type: 'input_text'|'output_text'|'text', text }
// Khác 3 adapter kia: chỗ này VỐN đã để lại dấu `[<type>]` cho block không phải text, nên
// ảnh không biến mất hoàn toàn — nhưng cũng chỉ còn cái tên, nội dung thì mất. Nay nếu
// block mang ảnh (base64 kiểu OpenAI `image_url`) thì tách ra đính kèm thật.
function flatten(content: unknown, atts?: ParsedAttachment[]): string {
  if (content == null) return "";
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const block = b as any;
    const a = imageAttachment(block);
    if (a) {
      atts?.push(a);
      parts.push(imageLabel(a));
      continue;
    }
    if (typeof block.text === "string") parts.push(block.text);
    else if (block.type && block.type !== "text") parts.push(`[${block.type}]`);
  }
  return parts.join("\n").trim();
}
