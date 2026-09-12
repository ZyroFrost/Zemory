// Microsoft 365 Copilot — lane `m365copilot-web`, origin=web. **ĐÃ MỞ ĐƯỜNG KÉO 2026-09-11.**
//
// 🔴 Nền này KHÁC HẲN hai Copilot kia, và khác ở chỗ ĐẮT nhất: **tài khoản CÔNG TY** (Entra ID),
// không phải tài khoản cá nhân. Ba hệ trùng tên — xem `plan/07 §17.3` và adapter `mscopilot`.
//
// 🔄 **Hai trong ba ràng buộc bi quan của bản KHAI DANH đã bị ĐO BÁC** (bản đó viết sáng cùng
// ngày, trước khi có phiên thật). Vế cũ nói *"lịch sử nằm trong Substrate, đường chính thống là
// Microsoft Graph + admin consent"* và suy ra *"hạng `loginOnly` có thể là TRẠM CUỐI"*. Đo trên
// phiên công ty đã đăng nhập: bề mặt web đọc lịch sử bằng đúng hai lời gọi **cùng origin, xác
// thực bằng cookie của chính trang** — không token MSAL, không quyền quản trị. Đường + số đo:
// khối `M365_LIST` trong `memory/scanweb.ts`.
//   ① **Chính sách tenant** VẪN đứng nguyên: tổ chức có quyền chặn tự động hoá / trình duyệt lạ,
//      và phiên công ty đòi MFA lại theo chu kỳ. Đó là điều kiện bên ngoài, không phải giới hạn
//      thiết kế — hỏng vì nó thì bề mặt báo `need-login`, đúng nghĩa.
//
// HÌNH DẠNG một hội thoại (đo trên 4 hội thoại THẬT — `plan/07 §1` cấm đoán):
//   { conversationId, chatName, createTimeUtc, updateTimeUtc, messages:[…] }
// và mỗi tin:
//   · `author`      'user' | 'bot'                     → role user | assistant
//   · `text`        chữ của NGƯỜI (đo 631 ký tự)       → dùng thẳng
//   · `adaptiveCards[0].body[].text`  chữ của BOT      → **đây mới là câu trả lời thật**
//        (đo 4 hội thoại: `text` của tin bot = 0 ký tự, thẻ = 4310 · 1756 · 978 · 2325)
//   · `messageType:'Progress'`  dòng tiến trình nội bộ → GIỮ nhưng hạ hạng, xem dưới
//   · `imageName`   tin kèm ảnh: chỉ có TÊN, KHÔNG có bytes (ảnh ở một CDN riêng,
//     `asyncMediaDistributionObjectsBaseUrl`) ⇒ để lại NHÃN, không bịa một đính kèm rỗng.
//
// Vì sao GIỮ tin `Progress` thay vì bỏ: lớp `messages` là lớp ĐẦY (`plan/06 §6`), cắt ở đây là cắt
// nguồn. Nhưng chúng là tiếng máy chứ không phải hội thoại ⇒ đóng dấu `toolName` để hệ xếp hạng hạ
// chúng xuống dưới văn xuôi (`TOOL_DEMOTE`, `plan/17 §1.4`) và để chúng nằm ngoài phạm vi nhúng
// (`EMBED_TOOLS_DEFAULT`). Giữ được sự thật mà không làm loãng recall.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

interface M365Card {
  body?: { type?: string; text?: string }[];
}
interface M365Msg {
  messageId?: string;
  author?: string;
  text?: string;
  createdAt?: string;
  timestamp?: string;
  messageType?: string;
  imageName?: string;
  spokenText?: string;
  adaptiveCards?: M365Card[];
}
interface M365Conv {
  conversationId?: string;
  chatName?: string | null;
  createTimeUtc?: number | null;
  updateTimeUtc?: number | null;
  messages?: M365Msg[];
}

/** Chữ của một tin. Thứ tự có chủ đích: `text` (người) → thẻ (bot) → `spokenText` (đường lui khi
 *  Microsoft đổi khuôn thẻ) → nhãn ảnh. Trả rỗng ⇒ người gọi bỏ tin đó, KHÔNG ghi hàng trống. */
function messageText(m: M365Msg): string {
  const direct = typeof m.text === "string" ? m.text.trim() : "";
  if (direct) return direct;
  const parts: string[] = [];
  for (const c of Array.isArray(m.adaptiveCards) ? m.adaptiveCards : []) {
    for (const b of Array.isArray(c?.body) ? c.body! : []) {
      if (b && typeof b.text === "string" && b.text.trim()) parts.push(b.text);
    }
  }
  const joined = parts.join("\n").trim();
  if (joined) return joined;
  const spoken = typeof m.spokenText === "string" ? m.spokenText.trim() : "";
  if (spoken) return spoken;
  // Tin CHỈ có ảnh: không có bytes để lưu, nhưng "từng có ảnh ở đây" là sự thật đáng giữ.
  const img = typeof m.imageName === "string" ? m.imageName.trim() : "";
  return img ? `[image:${img}]` : "";
}

export const m365CopilotAdapter: Adapter = {
  source: "m365copilot-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "m365copilot"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      if (f.startsWith("_")) continue; // sidecar (`_pulled.json`…), không phải transcript
      const t = toTranscript("m365copilot-web", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối các adapter web khác). */
  sessionId(filePath: string): string {
    return "m365copilot-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    // `scan-web` ghi một MẢNG hội thoại mỗi lô; chấp nhận cả `{conversations:[…]}` để một bản dump
    // tay cũng nạp được (cùng độ rộng với `claudeweb`).
    const convs: M365Conv[] = Array.isArray(data)
      ? (data as M365Conv[])
      : Array.isArray((data as { conversations?: unknown })?.conversations)
        ? (data as { conversations: M365Conv[] }).conversations
        : [];

    const out: ParsedSessionMulti[] = [];
    for (const conv of convs) {
      if (!conv || typeof conv !== "object") continue;
      const messages: ParsedMessage[] = [];
      for (const m of Array.isArray(conv.messages) ? conv.messages : []) {
        if (!m || typeof m !== "object") continue;
        const kind = typeof m.messageType === "string" && m.messageType.trim() ? m.messageType.trim() : null;
        const body = messageText(m);
        if (!body) continue;
        messages.push({
          uuid: typeof m.messageId === "string" && m.messageId ? m.messageId : null,
          // 'bot' là cách M365 gọi trợ lý — quy về 'assistant' cho khớp mọi adapter khác; không quy
          // thì bộ lọc role bỏ sót cả một nguồn (cùng bài học `sender:'human'` của claude.ai).
          role: m.author === "bot" ? "assistant" : "user",
          content: kind ? `[${kind}]\n${body}` : body,
          toolName: kind,
          timestamp: m.createdAt ?? m.timestamp ?? null,
        });
      }
      if (!messages.length) continue;
      const cid = typeof conv.conversationId === "string" && conv.conversationId ? conv.conversationId : String(out.length);
      out.push({
        sessionId: `m365copilotweb-${cid}`,
        title: conv.chatName?.trim() || undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};
