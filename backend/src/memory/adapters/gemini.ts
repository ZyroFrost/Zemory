// Gemini (gemini.google.com) web adapter — lane `gemini-web`, origin=web. **ĐÃ MỞ ĐƯỜNG KÉO 2026-09-11.**
//
// Nền này KHÔNG có REST cho lịch sử (đo 2026-09-10): mọi thứ đi qua RPC nội bộ
// `POST /_/BardChatUi/data/batchexecute`. Đợt 09-11 dò được cả hai đầu trên phiên ĐÃ ĐĂNG NHẬP —
// `MaZiqc` (danh sách) và `hNvQHb` (chi tiết); đường đi, tham số và các phép đo phụ nằm ở khối
// `GEMINI_CALL` trong `memory/scanweb.ts` và `plan/07 §17.2`.
//
// `scanweb` đã bóc giúp phần nặng nhất (khung batchexecute + mảng lồng theo VỊ TRÍ), nên file này
// chỉ nhận một hình dạng phẳng, ổn định:
//   { conversationId, title?, turns:[ { rid, at, user, model } ] }
//
// HAI RÀNG BUỘC không được quên — cả hai đều là cách hỏng câm:
//  ① **Lượt trả về MỚI NHẤT TRƯỚC** (epoch giảm dần). Không đảo lại thì recall đọc ngược hội thoại,
//     và `started_at`/`ended_at` của phiên cũng lộn đầu.
//  ② **Khoá dedup là `rid` (`r_<hex>`) của chính nền, KHÔNG phải chỉ số thứ tự.** Đánh số theo thứ
//     tự thì thêm một lượt mới là mọi id lệch một bậc ⇒ lần quét sau nạp lại cả hội thoại thành tin
//     TRÙNG (dedup là `UNIQUE(session_id, uuid)`).

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

interface GeminiTurn {
  rid?: string | null;
  at?: number | null;
  user?: string | null;
  model?: string | null;
}
interface GeminiConv {
  conversationId?: string;
  title?: string | null;
  turns?: GeminiTurn[];
}

/** epoch GIÂY → ISO. Trả `null` khi nền không kèm mốc (đo: 1/30 mục trong danh sách thiếu). */
function tsOf(at: number | null | undefined): string | null {
  return typeof at === "number" && at > 0 ? new Date(at * 1000).toISOString() : null;
}

export const geminiAdapter: Adapter = {
  source: "gemini-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "gemini"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      if (f.startsWith("_")) continue; // sidecar (`_pulled.json`…), không phải transcript
      const t = toTranscript("gemini-web", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối `cowork`). */
  sessionId(filePath: string): string {
    return "gemini-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  // Hợp đồng: `whole` + `parseFileMulti` (một file nhiều phiên — `plan/07 §9`), y như hai adapter
  // web kia. Trả `null` = "không đọc được file này", và `ingestFile` xử đúng nghĩa đó: bỏ qua, không
  // ghi `ingest_state`, nên lượt quét sau nạp lại đủ, không mất gì.
  // Tiền tố phiên của nền này là `geminiweb-` — khai sẵn ở `PLATFORMS.gemini.sessionPrefix`, và
  // `scanweb-platforms.test` so hai giá trị đó nên chúng không thể lệch nhau.
  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    const convs: GeminiConv[] = Array.isArray(data)
      ? (data as GeminiConv[])
      : Array.isArray((data as { conversations?: unknown })?.conversations)
        ? (data as { conversations: GeminiConv[] }).conversations
        : [];

    const out: ParsedSessionMulti[] = [];
    for (const conv of convs) {
      if (!conv || typeof conv !== "object") continue;
      const turns = Array.isArray(conv.turns) ? conv.turns : [];
      // ĐẢO LẠI THỨ TỰ: nền trả mới-nhất-trước (ràng buộc ① ở đầu file).
      const chrono = [...turns].reverse();
      const messages: ParsedMessage[] = [];
      for (let i = 0; i < chrono.length; i++) {
        const t = chrono[i];
        if (!t || typeof t !== "object") continue;
        // Khoá bền của nền; thiếu (nền đổi khuôn) thì lùi về vị trí trong DÃY ĐÃ ĐẢO — vẫn ổn định
        // khi hội thoại chỉ MỌC THÊM ở cuối, đúng cách một hội thoại lớn lên.
        const rid = typeof t.rid === "string" && t.rid ? t.rid : `t${i}`;
        const ts = tsOf(t.at);
        const user = typeof t.user === "string" ? t.user.trim() : "";
        const model = typeof t.model === "string" ? t.model.trim() : "";
        if (user) messages.push({ uuid: `${rid}#u`, role: "user", content: user, toolName: null, timestamp: ts });
        if (model) messages.push({ uuid: `${rid}#a`, role: "assistant", content: model, toolName: null, timestamp: ts });
      }
      if (!messages.length) continue;
      const cid = typeof conv.conversationId === "string" && conv.conversationId ? conv.conversationId : String(out.length);
      out.push({
        sessionId: `geminiweb-${cid}`,
        title: conv.title?.trim() || undefined,
        messages,
      });
    }
    return out.length ? out : null;
  },
};
