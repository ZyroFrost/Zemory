// The set of agents the brain knows how to ingest. Add an agent by writing an
// adapter and listing it here. DEFERRED (binary/sqlite formats, not yet wired):
//   - Gemini / Antigravity (~/.gemini/antigravity/conversations) — protobuf .pb + sqlite .db
//   - Cursor (workspaceStorage state.vscdb) — sqlite
//   - GitHub Copilot Chat (VSCode globalStorage) — sqlite/state
// These need format-specific decoders; tracked for a later pass.

import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { continueAdapter } from "./continue.js";
import { lmstudioAdapter } from "./lmstudio.js";
import type { Adapter } from "./types.js";

export function allAdapters(): Adapter[] {
  return [claudeAdapter, codexAdapter, continueAdapter, lmstudioAdapter];
}

export type { Adapter, ParsedLine, ParsedMessage, ParsedSession, TranscriptFile } from "./types.js";
