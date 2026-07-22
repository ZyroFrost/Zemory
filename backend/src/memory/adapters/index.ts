// The set of agents the memory knows how to ingest. Add an agent by writing an
// adapter and listing it here.
//   - origin='local' adapters read agent transcript files on disk.
//   - origin='web' adapters read web-chat exports/dumps (e.g. chatgpt-web reads
//     ~/.zemory/imports/chatgpt/*.json; fed by export or `memory scan-web`).
// DEFERRED (binary/sqlite formats, not yet wired):
//   - Gemini / Antigravity (~/.gemini/antigravity/conversations) — protobuf .pb + sqlite .db
//   - Cursor (workspaceStorage state.vscdb) — sqlite
//   - GitHub Copilot Chat (VSCode globalStorage) — sqlite/state
// These need format-specific decoders; tracked for a later pass.

import { chatgptAdapter } from "./chatgpt.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { continueAdapter } from "./continue.js";
import { lmstudioAdapter } from "./lmstudio.js";
import type { Adapter } from "./types.js";

export function allAdapters(): Adapter[] {
  return [claudeAdapter, codexAdapter, continueAdapter, lmstudioAdapter, chatgptAdapter];
}

export type { Adapter, ParsedLine, ParsedMessage, ParsedSession, ParsedSessionMulti, TranscriptFile } from "./types.js";
