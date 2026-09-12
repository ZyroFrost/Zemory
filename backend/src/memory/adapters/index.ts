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
// Mỗi cái cần một decoder riêng; ghi lại cho lượt sau.
// ✅ Copilot Chat của VS Code — ĐÃ NỐI 2026-09-12 (`copilotchat.ts`): máy này có phiên thật đầu
//    tiên nên hình dạng patch-jsonl đo được; số đo ở `plan/07 §17.6`.

import { chatgptAdapter } from "./chatgpt.js";
import { copilotAdapter } from "./copilot.js";
import { msCopilotAdapter } from "./mscopilot.js";
import { m365CopilotAdapter } from "./m365copilot.js";
import { geminiAdapter } from "./gemini.js";
import { claudeWebAdapter } from "./claudeweb.js";
import { coworkAdapter } from "./cowork.js";
import { claudeAdapter } from "./claude.js";
import { claudeMemoryAdapter } from "./claudemem.js";
import { codexAdapter } from "./codex.js";
import { copilotChatAdapter } from "./copilotchat.js";
import { declaredWebAdapter } from "./webdeclared.js";
import { continueAdapter } from "./continue.js";
import { lmstudioAdapter } from "./lmstudio.js";
import type { Adapter } from "./types.js";

/**
 * Nền web hạng CHỈ-NỐI thêm 2026-09-12 (user: *"thêm vào các nguồn đầy đủ của các con AI người ta
 * hay xài, cả web lẫn local… chỉ tạo đường nối chứ ko nối sẵn"*). Chúng có mặt để người dùng CÓ tài
 * khoản bấm nối được; máy này không có tài khoản nào nên đường KÉO chưa đo — xem `webdeclared.ts`.
 * Thứ tự khai ở đây không quan trọng (khớp theo `signature`), nhưng phải khớp `PLATFORMS` từng chữ:
 * cổng `web-platform-parity` so hai bên và đỏ nếu lệch.
 */
const DECLARED_WEB: Adapter[] = [
  declaredWebAdapter("grok", "grok-web"),
  declaredWebAdapter("deepseek", "deepseek-web"),
  declaredWebAdapter("perplexity", "perplexity-web"),
  declaredWebAdapter("mistral", "mistral-web"),
  declaredWebAdapter("qwen", "qwen-web"),
  declaredWebAdapter("kimi", "kimi-web"),
];

export function allAdapters(): Adapter[] {
  // claudeMemoryAdapter deliberately sits AFTER claudeAdapter: they share the
  // `.claude/projects` signature, and scanOneFile's per-file matcher takes the
  // first hit — transcripts (.jsonl, the only files hooks ever pass) must keep
  // routing to claude-code.
  return [claudeAdapter, claudeMemoryAdapter, codexAdapter, copilotChatAdapter, continueAdapter, lmstudioAdapter, chatgptAdapter, claudeWebAdapter, coworkAdapter, geminiAdapter, copilotAdapter, msCopilotAdapter, m365CopilotAdapter, ...DECLARED_WEB];
}

export type { Adapter, ParsedLine, ParsedMessage, ParsedSession, ParsedSessionMulti, TranscriptFile } from "./types.js";
