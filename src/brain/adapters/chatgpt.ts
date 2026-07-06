// ChatGPT web adapter (origin=web). Ingests an OpenAI "Export data" /
// browser-connector dump: conversations.json = an ARRAY of conversations, each
// with a `mapping` node-tree keyed by node id ({message, parent, children[]})
// plus `current_node`. ONE file → MANY sessions, so this uses parseFileMulti.
//
// Drop the file into ~/.zemory/imports/chatgpt/ (or let `brain scan-web` write
// it) and `brain scan` picks it up. Flatten = walk current_node → parent → root
// then reverse, so only the active branch (not abandoned edits/regens) is kept.

import { basename, dirname, join } from "node:path";
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
      if (f.startsWith("_")) continue; // sidecar maps (e.g. _projects.json), not transcripts
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
    // Project ("folder") id → name map, dropped alongside the transcript as
    // `_projects.json` (written by scan-web, or seeded by hand). Lets a bulk
    // "Export data" dump — which carries only gizmo ids — still get friendly
    // project_root labels. Missing map → fall back to the raw gizmo id.
    const projectNames = readProjectMap(dirname(filePath));
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
      // Project ("folder") grouping → project_root. Prefer the name scan-web
      // stamped on __zemory_project; else resolve the gizmo id via the map;
      // else use the raw gizmo id so it still groups, just with a plain label.
      const gizmo =
        (typeof c.gizmo_id === "string" && c.gizmo_id.trim() && c.gizmo_id) ||
        (typeof c.conversation_template_id === "string" && c.conversation_template_id.trim() && c.conversation_template_id) ||
        null;
      const project =
        (typeof c.__zemory_project === "string" && c.__zemory_project.trim() && c.__zemory_project) ||
        (gizmo && (projectNames[gizmo] || gizmo)) ||
        undefined;
      out.push({
        sessionId: "chatgpt-" + cid,
        cwd: undefined,
        project,
        title: typeof c.title === "string" && c.title.trim() ? c.title : undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};

/** Load the gizmo-id → project-name map dropped next to the transcript as
 *  `_projects.json` ({"g-p-…":"Video-Music Maker", …}). Absent/bad → {}. */
function readProjectMap(dir: string): Record<string, string> {
  try {
    const m = JSON.parse(readFileSync(join(dir, "_projects.json"), "utf8"));
    return m && typeof m === "object" ? (m as Record<string, string>) : {};
  } catch {
    return {};
  }
}

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
