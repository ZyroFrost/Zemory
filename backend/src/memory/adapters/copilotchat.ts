// GitHub Copilot Chat inside VS Code — LOCAL adapter, lane `copilot-chat`, origin=local.
//
// Not to be confused with `copilot.ts` (`copilot-web`): that one reads github.com/copilot, a
// DIFFERENT store which measured empty on this account. This adapter reads the panel history
// VS Code writes to disk, which is the better source when it exists: 0 tokens, no login, no
// browser (`plan/07 §17.3` ranks it first, `§17.6` holds the measurements).
//
// Store (Windows): %APPDATA%/Code/User/
//   workspaceStorage/<hash>/chatSessions/<sessionId>.jsonl   — chat with a folder open
//   globalStorage/emptyWindowChatSessions/<sessionId>.jsonl  — chat with no folder open
// The signature is `Code/User` because those two live in sibling trees; `enumerate` narrows
// it back down to exactly those two shapes so a deep scan cannot drag in unrelated files.
//
// FORMAT — jsonl, but NOT one message per line. Each line is a PATCH against the state built
// so far (measured 2026-09-12 on a real one-turn session, `plan/07 §17.6`):
//   {"kind":0,"v":{…}}                  full initial state, holds `requests[]`
//   {"kind":1,"k":[…path…],"v":X}       SET X at that path
//   {"kind":2,"k":[…path…],"v":[X,…]}   APPEND to the array at that path
// The assistant's prose arrives as a kind-2 append to `requests[i].response`, so an adapter
// that read only line 0 would store the question and lose the answer. Hence mode `whole`:
// replay every line, then read the final state.
//
// LIMITS, stated rather than guessed: one session with one turn was measured — no tool calls,
// no images. Response parts that carry no `value` string (`mcpServersStarting`,
// `autoModeResolution`, and whatever tool calls turn out to look like) are SKIPPED, not
// invented. Same boundary as `copilot.ts`: a parser that guesses a shape poisons the store
// (HP điều 15), while skipping costs one scan.

import { basename, dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { decodeFileUri, isDir, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSession, TranscriptFile } from "./types.js";

const SOURCE = "copilot-chat";

/** One request/response pair in the reconstructed state. Only fields we measured. */
interface ChatRequest {
  requestId?: string;
  responseId?: string;
  timestamp?: number;
  responseTimestamp?: number;
  hiddenFromTranscript?: boolean;
  message?: { text?: string; parts?: { text?: string }[] };
  response?: { value?: string }[];
}

interface ChatState {
  customTitle?: string;
  requests?: ChatRequest[];
}

/** Walk a patch path, creating nothing: a patch for a path that does not exist is dropped. */
function containerAt(root: unknown, path: (string | number)[]): { parent: any; key: string | number } | null {
  let cur: any = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[path[i] as any];
  }
  if (cur == null || typeof cur !== "object") return null;
  return { parent: cur, key: path[path.length - 1] };
}

/** Replay one patch line onto the state built so far. Unknown `kind` → ignored. */
function applyPatch(state: ChatState, kind: number, path: unknown, value: unknown): void {
  if (!Array.isArray(path) || path.length === 0) return;
  const at = containerAt(state, path as (string | number)[]);
  if (!at) return;
  if (kind === 1) {
    at.parent[at.key] = value;
  } else if (kind === 2) {
    const cur = at.parent[at.key];
    if (Array.isArray(cur) && Array.isArray(value)) cur.push(...value);
    else if (Array.isArray(value)) at.parent[at.key] = [...value];
  }
}

/** The user's prompt: a plain string when present, else the measured `parts[].text` shape. */
function userText(m: ChatRequest["message"]): string {
  if (!m) return "";
  if (typeof m.text === "string") return m.text.trim();
  if (Array.isArray(m.parts)) {
    return m.parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
  }
  return "";
}

/** The assistant's prose: only parts carrying a `value` string; everything else is skipped. */
function assistantText(resp: ChatRequest["response"]): string {
  if (!Array.isArray(resp)) return "";
  return resp
    .map((p) => (p && typeof p.value === "string" ? p.value : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isoOf(ms: unknown): string | null {
  return typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

/**
 * The folder this chat belonged to. `workspaceStorage/<hash>/workspace.json` sits two levels
 * above the transcript and holds `{"folder":"file:///d%3A/…"}`. Multi-root windows write a
 * `workspace` key pointing at a `.code-workspace` FILE instead — not a folder, shape not
 * measured, so it is left alone rather than turned into a bogus project root.
 */
function workspaceFolder(filePath: string): string | undefined {
  const meta = join(dirname(dirname(filePath)), "workspace.json");
  if (!existsSync(meta)) return undefined;
  try {
    const o = JSON.parse(readFileSync(meta, "utf8")) as { folder?: string };
    return typeof o.folder === "string" ? decodeFileUri(o.folder) : undefined;
  } catch {
    return undefined;
  }
}

export const copilotChatAdapter: Adapter = {
  source: SOURCE,
  // origin intentionally NOT declared → `ingest.ts` stamps 'local' (see plan/07 §17.6).
  mode: "whole",
  signature: join("Code", "User"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    const take = (dir: string): void => {
      for (const f of safeReaddir(dir)) {
        if (!f.endsWith(".jsonl")) continue;
        const t = toTranscript(SOURCE, join(dir, f));
        if (t) out.push(t);
      }
    };

    // One chat store per workspace hash.
    const ws = join(storeRoot, "workspaceStorage");
    if (isDir(ws)) {
      for (const hash of safeReaddir(ws)) {
        const dir = join(ws, hash, "chatSessions");
        if (isDir(dir)) take(dir);
      }
    }
    // Chats started with no folder open.
    const empty = join(storeRoot, "globalStorage", "emptyWindowChatSessions");
    if (isDir(empty)) take(empty);

    return out;
  },

  sessionId(filePath: string): string {
    // Prefixed on purpose: the bare name is a uuid, and `claude-code` already uses bare uuids
    // as session ids — `sessions.id` is the primary key, so a collision would merge two chats.
    return SOURCE + "-" + basename(filePath).replace(/\.[^.]+$/u, "");
  },

  parseFile(filePath: string): ParsedSession | null {
    let raw: string;
    try {
      raw = readFileSync(filePath, "utf8");
    } catch {
      return null;
    }

    let state: ChatState | null = null;
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      let o: { kind?: number; k?: unknown; v?: unknown };
      try {
        o = JSON.parse(t);
      } catch {
        continue; // a half-written tail line while the chat is live
      }
      if (o.kind === 0) {
        state = (o.v ?? {}) as ChatState;
      } else if (state && typeof o.kind === "number") {
        applyPatch(state, o.kind, o.k, o.v);
      }
    }
    if (!state || !Array.isArray(state.requests) || state.requests.length === 0) return null;

    const messages: ParsedMessage[] = [];
    for (const [i, r] of state.requests.entries()) {
      if (!r || r.hiddenFromTranscript === true) continue;
      const ask = userText(r.message);
      const answer = assistantText(r.response);
      const askAt = isoOf(r.timestamp);
      if (ask) {
        messages.push({
          uuid: r.requestId ?? `${i}-q`,
          role: "user",
          content: ask,
          toolName: null,
          timestamp: askAt,
        });
      }
      if (answer) {
        messages.push({
          uuid: r.responseId ?? `${i}-a`,
          role: "assistant",
          content: answer,
          toolName: null,
          timestamp: isoOf(r.responseTimestamp) ?? askAt,
        });
      }
    }
    if (messages.length === 0) return null;

    const cwd = workspaceFolder(filePath);
    return {
      cwd,
      title: typeof state.customTitle === "string" ? state.customTitle : undefined,
      messages,
    };
  },
};
