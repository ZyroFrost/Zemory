// Claude.ai web adapter (origin=web) — song sinh với `chatgpt.ts`, khác ở HÌNH DẠNG
// dữ liệu chứ không khác cơ chế: `memory scan-web --platform claude` ghi một file JSON
// vào ~/.zemory/imports/claude/, `memory scan` nhặt lên. MỘT file → NHIỀU phiên nên
// dùng parseFileMulti giống chatgpt.
//
// Khác biệt so với ChatGPT — đây là lý do không dùng chung adapter được:
//   · ChatGPT trả `mapping` là CÂY node (phải đi current_node → parent → root rồi đảo
//     ngược để lấy đúng nhánh đang hoạt động, bỏ các lần sửa/regen đã bỏ).
//   · Claude.ai trả `chat_messages` là MẢNG PHẲNG đã đúng thứ tự — không có nhánh chết,
//     nên chỉ cần đọc tuần tự. Đơn giản hơn hẳn.
//   · Vai: `sender` là 'human' | 'assistant' (ChatGPT dùng `message.author.role`).
//   · Nội dung: `content[]` gồm nhiều khối {type:'text'|'tool_use'|'tool_result'|…};
//     `text` ở cấp trên là bản phẳng sẵn có, dùng làm đường lui.
//
// Giữ nguyên lớp FULL (điều 3 + quyết định 2026-07-26): KHÔNG cắt, KHÔNG tóm tắt.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { imageAttachment, imageLabel, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedAttachment, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

interface ClaudeBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}
interface ClaudeMsg {
  uuid?: string;
  text?: string;
  sender?: string;
  created_at?: string;
  content?: ClaudeBlock[];
}
interface ClaudeConv {
  uuid?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ClaudeMsg[];
  project_uuid?: string;
  project?: { name?: string; uuid?: string };
}

/** Một message → text đầy đủ. Khối tool được GIỮ, gắn nhãn như adapter Claude Code
 *  để `roleMatches()`/`msgRole()` nhận ra và xếp đúng hạng khi recall. */
function flattenMessage(m: ClaudeMsg, atts?: ParsedAttachment[]): string {
  const blocks = Array.isArray(m.content) ? m.content : [];
  if (!blocks.length) return String(m.text ?? "");
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const kind = String(b.type ?? "");
    // Ảnh: cùng hình dạng base64 với adapter Claude Code (chung một API Anthropic) —
    // tách blob ra `attachments`, chỉ để lại NHÃN trong text. Base64 mà vào `content`
    // là thổi FTS5 lên mà không tìm được gì (bài học v16/v17).
    if (kind === "image" || kind === "image_url") {
      const a = imageAttachment(b);
      if (a) {
        atts?.push(a);
        parts.push(imageLabel(a));
        continue;
      }
    }
    if (kind === "text" && typeof b.text === "string") parts.push(b.text);
    else if (kind === "tool_use") parts.push(`[tool_use:${b.name ?? "?"}]\n${JSON.stringify(b.input ?? null)}`);
    else if (kind === "tool_result") parts.push(`[tool_result]\n${typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? null)}`);
    else if (kind === "thinking" && typeof b.text === "string") parts.push(`[thinking]\n${b.text}`);
  }
  const joined = parts.join("\n").trim();
  // Đường lui: khối lạ (loại mới Anthropic thêm sau này) thì vẫn còn `text` phẳng —
  // thà lưu bản phẳng còn hơn mất nguyên message.
  return joined || String(m.text ?? "");
}

export const claudeWebAdapter: Adapter = {
  source: "claude-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "claude"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      if (f.startsWith("_")) continue; // sidecar (vd _projects.json), không phải transcript
      const t = toTranscript("claude-web", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  sessionId(filePath: string): string {
    return "claudeweb-file-" + basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    // Chấp nhận cả mảng trần lẫn {conversations:[…]} — hai dạng dump đã gặp.
    const convs: ClaudeConv[] = Array.isArray(data)
      ? (data as ClaudeConv[])
      : Array.isArray((data as { conversations?: unknown }).conversations)
        ? ((data as { conversations: ClaudeConv[] }).conversations)
        : [];

    const out: ParsedSessionMulti[] = [];
    for (const conv of convs) {
      if (!conv || typeof conv !== "object") continue;
      const raw = Array.isArray(conv.chat_messages) ? conv.chat_messages : [];
      const messages: ParsedMessage[] = [];
      for (const m of raw) {
        const atts: ParsedAttachment[] = [];
        const content = flattenMessage(m, atts);
        if (!content.trim()) continue;
        messages.push({
          uuid: m.uuid ?? null,
          // 'human' là cách Claude.ai gọi người dùng — quy về 'user' cho khớp mọi
          // adapter khác, nếu không bộ lọc role sẽ bỏ sót cả một nguồn.
          role: m.sender === "assistant" ? "assistant" : "user",
          content,
          toolName: null,
          timestamp: m.created_at ?? null,
          ...(atts.length ? { attachments: atts } : {}),
        });
      }
      if (!messages.length) continue;
      const cid = conv.uuid ?? String(out.length);
      out.push({
        sessionId: `claudeweb-${cid}`,
        title: conv.name?.trim() || undefined,
        // Project ("folder") của claude.ai → dùng làm project_root để recall lọc được.
        project: conv.project?.name?.trim() || conv.project_uuid || undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};
