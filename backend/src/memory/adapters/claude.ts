// Claude Code adapter. Transcripts: ~/.claude/projects/<proj>/<id>.jsonl
// (append-mode jsonl). Each line is one record; user/assistant carry messages.

import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { isDir, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedAttachment, ParsedLine, TranscriptFile } from "./types.js";

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

    // User-set session name (Claude Code `/title`) — WINS over the AI-generated
    // title. Stored as its own record: {type:"custom-title", customTitle:"..."}.
    if (o.type === "custom-title" && typeof o.customTitle === "string" && o.customTitle.trim()) {
      return { kind: "title", title: o.customTitle.trim(), custom: true };
    }
    if (o.type === "ai-title" && typeof o.aiTitle === "string") {
      return { kind: "title", title: o.aiTitle };
    }
    // FILE NGƯỜI DÙNG KÉO VÀO CHAT — record riêng ở cấp dòng (KHÔNG nằm trong
    // `message.content`, nên `flatten()` không bao giờ thấy). Transcript chở luôn nội dung
    // đầy đủ ở `attachment.content.file.content`.
    //
    // Chỉ nhận `type:"file"`. Các loại `attachment` khác là metadata NỘI BỘ của Claude Code
    // (`todo_reminder` 3.838 · `queued_command` 520 · `deferred_tools_delta` · `skill_listing`…)
    // — nạp vào là rác. Cũng KHÔNG nạp `edited_text_file` (chỉ là snippet có đánh số dòng của
    // file đã nằm trong repo) và KHÔNG đụng `~/.claude/file-history/` (5.009 file · 211 MB
    // snapshot của chính code trong repo ⇒ dựng kho thứ hai, trái điều 3, phình DB +35,7%).
    // Đo 2026-07-26: loại này chỉ 62 file · 0,2 MB — rẻ, mà là dữ liệu KHÔNG có ở đâu khác.
    if (o.type === "attachment") {
      const a = o.attachment;
      const body = a?.type === "file" ? a?.content?.file?.content : undefined;
      if (typeof body !== "string" || !body.trim()) return { kind: "skip" };
      const name = typeof a.filename === "string" ? a.filename : (a?.content?.file?.filePath ?? "(file)");
      return {
        kind: "message",
        msg: {
          uuid: o.uuid ?? null,
          role: "user", // file do NGƯỜI dùng kéo vào — thuộc lượt user
          content: `[file:${name}]\n${body}`,
          toolName: "attachment",
          timestamp: o.timestamp ?? null,
        },
      };
    }
    if (o.type === "user" || o.type === "assistant") {
      const m = o.message ?? {};
      const { text, attachments } = flatten(m.content);
      if (!text) return o.cwd ? { kind: "meta", cwd: o.cwd } : { kind: "skip" };
      return {
        kind: "message",
        msg: {
          uuid: o.uuid ?? null,
          role: m.role ?? o.type,
          content: text,
          toolName: firstTool(m.content),
          timestamp: o.timestamp ?? null,
          ...(attachments.length ? { attachments } : {}),
        },
      };
    }
    if (o.cwd) return { kind: "meta", cwd: o.cwd };
    return { kind: "skip" };
  },
};

// Ngưỡng lưu nhị phân. Đo trên corpus thật 2026-07-28: 1.245 ảnh, p90 182 KB,
// max 1,28 MB, tổng 93 MB — nên 8 MB là trần rộng rãi, gần như không ai chạm. Vượt
// ngưỡng thì hạ xuống 'ref' (ghi nhận từng có, không lưu nội dung) chứ KHÔNG bỏ im lặng.
const MAX_BLOB_BYTES = 8 * 1024 * 1024;

/** Ảnh trong transcript Claude Code: {type:'image', source:{type:'base64', media_type, data}}. */
function imageAttachment(block: any): ParsedAttachment | null {
  const src = block?.source;
  if (!src || src.type !== "base64" || typeof src.data !== "string" || !src.data) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(src.data, "base64");
  } catch {
    return null;
  }
  if (!buf.length) return null;
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const mime = typeof src.media_type === "string" ? src.media_type : "application/octet-stream";
  if (buf.length > MAX_BLOB_BYTES) {
    return { mime, bytes: buf.length, sha256, kind: "ref" };
  }
  return { mime, bytes: buf.length, sha256, kind: "blob", blob: buf };
}

/** Nhãn một dòng để lại trong `content` — người đọc và FTS vẫn thấy có ảnh ở đây. */
function imageLabel(a: ParsedAttachment): string {
  return `[image:${a.mime ?? "?"} ${(a.bytes / 1024).toFixed(0)}KB ${a.sha256.slice(0, 12)}]`;
}

function flatten(content: unknown): { text: string; attachments: ParsedAttachment[] } {
  if (content == null) return { text: "", attachments: [] };
  if (typeof content === "string") return { text: content.trim(), attachments: [] };
  if (!Array.isArray(content)) return { text: "", attachments: [] };
  const parts: string[] = [];
  const attachments: ParsedAttachment[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const block = b as any;
    switch (block.type) {
      case "text":
        if (typeof block.text === "string") parts.push(block.text);
        break;
      case "tool_use":
        parts.push(`[tool_use:${block.name}] ${JSON.stringify(block.input ?? {})}`);
        break;
      case "tool_result":
        parts.push(`[tool_result] ${resultText(block.content)}`);
        break;
      case "image": {
        // Đo 2026-07-28: 1.245 block ảnh / 93 MB nằm trong transcript, và nhánh này
        // TRƯỚC ĐÂY KHÔNG TỒN TẠI ⇒ toàn bộ bị bỏ im lặng ở khâu nạp. Nay tách sang
        // `attachments`, chỉ để lại MỘT DÒNG NHÃN trong text: base64 mà vào `content`
        // là thổi FTS5 lên mà không tìm được gì (bài học v16/v17).
        const a = imageAttachment(block);
        if (a) {
          attachments.push(a);
          parts.push(imageLabel(a));
        }
        break;
      }
      // 'thinking' intentionally skipped: large, internal, noisy.
    }
  }
  return { text: parts.join("\n").trim(), attachments };
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
