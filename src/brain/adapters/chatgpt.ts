// ChatGPT web adapter (origin=web). Ingests an OpenAI "Export data" /
// browser-connector dump: conversations.json = an ARRAY of conversations, each
// with a `mapping` node-tree keyed by node id ({message, parent, children[]})
// plus `current_node`. ONE file → MANY sessions, so this uses parseFileMulti.
//
// Drop the file into ~/.zemory/imports/chatgpt/ (or let `brain scan-web` write
// it) and `brain scan` picks it up. Flatten = walk current_node → parent → root
// then reverse, so only the active branch (not abandoned edits/regens) is kept.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { clip, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

export const chatgptAdapter: Adapter = {
  source: "chatgpt-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "chatgpt"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      const t = toTranscript("chatgpt-web", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  // File-level id (sentinel; the real ids are per-conversation in parseFileMulti).
  sessionId(filePath: string): string {
    return "chatgpt-file-" + basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    const convs = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.conversations)
        ? (data as any).conversations
        : [];
    const out: ParsedSessionMulti[] = [];
    for (const conv of convs) {
      if (!conv || typeof conv !== "object") continue;
      const messages = flattenConversation(conv as any);
      if (!messages.length) continue;
      const c = conv as any;
      const cid = c.conversation_id ?? c.id ?? c.uuid ?? String(c.create_time ?? out.length);
      out.push({
        sessionId: "chatgpt-" + cid,
        cwd: undefined,
        title: typeof c.title === "string" && c.title.trim() ? c.title : undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};

/** Walk the active branch (current_node → parent → root), reverse to
 *  chronological, and emit user/assistant messages with real text. */
function flattenConversation(conv: any): ParsedMessage[] {
  const mapping = conv?.mapping;
  if (!mapping || typeof mapping !== "object") return [];

  // Prefer the active leaf→root path so abandoned edit/regen branches are dropped.
  const order: string[] = [];
  const seen = new Set<string>();
  let nodeId: string | undefined = typeof conv.current_node === "string" ? conv.current_node : undefined;
  while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
    seen.add(nodeId);
    order.push(nodeId);
    nodeId = mapping[nodeId].parent;
  }
  order.reverse();
  // Fallback: no usable current_node → take every node (order best-effort).
  const ids = order.length ? order : Object.keys(mapping);

  const msgs: ParsedMessage[] = [];
  for (const id of ids) {
    const m = mapping[id]?.message;
    if (!m || !m.author) continue;
    const role = m.author.role;
    if (role !== "user" && role !== "assistant") continue; // skip system / tool
    if (m.metadata?.is_visually_hidden_from_conversation) continue;
    const content = flattenParts(m.content);
    if (!content) continue;
    const ts = typeof m.create_time === "number" ? new Date(m.create_time * 1000).toISOString() : null;
    msgs.push({ uuid: id, role, content, toolName: null, timestamp: ts });
  }
  return msgs;
}

function flattenParts(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return clip(content.trim());
  const parts = content.parts;
  if (Array.isArray(parts)) {
    return clip(parts.filter((p: unknown) => typeof p === "string" && p.trim()).join("\n").trim());
  }
  return "";
}
