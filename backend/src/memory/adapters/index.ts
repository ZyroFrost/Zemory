// The set of agents the memory knows how to ingest. Add an agent by writing an
// adapter and listing it here.
//   - origin='local' adapters read agent transcript files on disk.
//   - origin='web' adapters read web-chat exports/dumps (e.g. chatgpt-web reads
//     ~/.zemory/imports/chatgpt/*.json; fed by export or `memory scan-web`).
// KHAI DANH, CHƯA PARSE (2026-09-10): `gemini-web` và `copilot-web` đã có adapter để nền HIỆN
// trên cây Nguồn và đăng nhập được; `parseFileMulti` của chúng trả null tới khi đường kéo được dò
// trên một phiên thật (`plan/07 §17`).
// CÒN HOÃN (định dạng nhị phân/sqlite, chưa nối):
//   - Gemini CLI / Antigravity (~/.gemini) — protobuf .pb + sqlite .db; máy này chưa cài
//   - Cursor (workspaceStorage state.vscdb) — sqlite
//   - Copilot Chat của VS Code — JSONL `chatSessions/*.jsonl`, hình dạng đã đo, nhưng 46/46 phiên
//     trên máy này RỖNG nên chưa có data thật để dựng parser (`plan/07 §17.1`)
// Mỗi cái cần một decoder riêng; ghi lại cho lượt sau.

import { chatgptAdapter } from "./chatgpt.js";
import { copilotAdapter } from "./copilot.js";
import { geminiAdapter } from "./gemini.js";
import { claudeWebAdapter } from "./claudeweb.js";
import { coworkAdapter } from "./cowork.js";
import { claudeAdapter } from "./claude.js";
import { claudeMemoryAdapter } from "./claudemem.js";
import { codexAdapter } from "./codex.js";
import { continueAdapter } from "./continue.js";
import { lmstudioAdapter } from "./lmstudio.js";
import type { Adapter } from "./types.js";

export function allAdapters(): Adapter[] {
  // claudeMemoryAdapter deliberately sits AFTER claudeAdapter: they share the
  // `.claude/projects` signature, and scanOneFile's per-file matcher takes the
  // first hit — transcripts (.jsonl, the only files hooks ever pass) must keep
  // routing to claude-code.
  return [claudeAdapter, claudeMemoryAdapter, codexAdapter, continueAdapter, lmstudioAdapter, chatgptAdapter, claudeWebAdapter, coworkAdapter, geminiAdapter, copilotAdapter];
}

export type { Adapter, ParsedLine, ParsedMessage, ParsedSession, ParsedSessionMulti, TranscriptFile } from "./types.js";
