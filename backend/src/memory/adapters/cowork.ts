// Cowork (claude.ai) web adapter — lane `claude-cowork`, origin=web.
//
// Cowork là phiên AGENT chạy trên claude.ai, KHÔNG phải chat thường: nó không nằm trong
// `chat_conversations` mà ở `/v1/code/sessions`, nên trước đây cả lane này rơi ngoài bộ
// nhớ và sổ ghi *"mọi quyết định bàn trong Cowork là không tra lại được"*.
//
// Hình dạng (đo 2026-07-31 trên phiên thật, 218 event):
//   · `user`      → `payload.message.content` là **CHUỖI**
//   · `assistant` → `payload.message.content` là **MẢNG block** `{type:'text',text}`
//   · còn lại (`system` · `control_request/response` · `env_manager_log` · `result` ·
//     `active_goal` · `prompt_suggestion` · `rate_limit_event`) là điều khiển/log — BỎ.
//     Đây là lọc theo VAI, không phải cắt nội dung: hai loại trên mới là hội thoại.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

interface CoworkEvent {
  event_id?: string;
  event_type?: string;
  created_at?: string;
  sequence_num?: number;
  payload?: { message?: { content?: unknown; role?: string }; uuid?: string };
}
interface CoworkSession {
  id?: string;
  title?: string;
  created_at?: string;
  last_event_at?: string;
  events?: CoworkEvent[];
}

/** Nội dung một event → text. Hai vai có hai hình dạng khác nhau (xem đầu file). */
function eventText(e: CoworkEvent): string {
  const c = e.payload?.message?.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  const parts: string[] = [];
  for (const b of c as { type?: string; text?: string; name?: string; input?: unknown; content?: unknown }[]) {
    if (!b || typeof b !== "object") continue;
    const kind = String(b.type ?? "");
    if (kind === "text" && typeof b.text === "string") parts.push(b.text);
    // Giữ khối tool, gắn nhãn đúng quy ước các adapter Claude khác — lớp FULL (điều 3).
    else if (kind === "tool_use") parts.push(`[tool_use:${b.name ?? "?"}]\n${JSON.stringify(b.input ?? null)}`);
    else if (kind === "tool_result") parts.push(`[tool_result]\n${typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? null)}`);
    else if (kind === "thinking" && typeof b.text === "string") parts.push(`[thinking]\n${b.text}`);
  }
  return parts.join("\n").trim();
}

export const coworkAdapter: Adapter = {
  source: "claude-cowork",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "cowork"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json") || f.startsWith("_")) continue;
      const t = toTranscript("claude-cowork", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  sessionId(filePath: string): string {
    return "cowork-file-" + basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    const sessions: CoworkSession[] = Array.isArray(data) ? (data as CoworkSession[]) : [];
    const out: ParsedSessionMulti[] = [];
    for (const s of sessions) {
      if (!s || typeof s !== "object") continue;
      const events = Array.isArray(s.events) ? s.events : [];
      const messages: ParsedMessage[] = [];
      for (const e of events) {
        const role = e?.event_type === "assistant" ? "assistant" : e?.event_type === "user" ? "user" : null;
        if (!role) continue; // control/log — không phải hội thoại
        const content = eventText(e);
        if (!content.trim()) continue;
        messages.push({
          uuid: e.event_id ?? e.payload?.uuid ?? null,
          role,
          content,
          toolName: null,
          timestamp: e.created_at ?? null,
        });
      }
      if (!messages.length) continue;
      out.push({
        sessionId: `coworkweb-${s.id ?? out.length}`,
        title: s.title?.trim() || undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};
