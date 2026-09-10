// Gemini (gemini.google.com) web adapter — lane `gemini-web`, origin=web. **KHAI DANH, CHƯA PARSE.**
//
// Vì sao một adapter chưa đọc được gì vẫn đáng tồn tại: cây Nguồn dựng danh sách nền từ
// `allAdapters()` (xem `memory/scope.ts` khối "BỘ CHUẨN"), nên một nguồn chưa đăng ký là VÔ HÌNH
// trên UI — kể cả sau khi người dùng đã đăng nhập xong. Đó đúng là vòng luẩn quẩn mà khối đó ghi:
// muốn có dữ liệu thì phải quét, muốn quét thì phải thấy nền tồn tại đã.
//
// Đo 2026-09-10: Gemini KHÔNG có REST cho lịch sử — mọi thứ qua \`POST /_/BardChatUi/data/batchexecute\`,
// và \`rpcid\` của nó đổi theo bản deploy nên không được ghim. Ba đường khả thi (DOM qua CDP · dò
// \`rpcid\` lúc chạy · Google Takeout) và đánh đổi từng đường: \`plan/07 §17.2\`.
//
// Khi đường kéo mở (dò `listExpr`/`convExpr` trên một phiên đã đăng nhập — `plan/07 §17.5`), chỉ
// việc điền `parseFileMulti` ở đây theo hình dạng ĐO ĐƯỢC. Tới lúc đó nó trả `null`: không có
// định dạng nào được đo thì đoán một hình dạng là tự dựng một parser nói dối.

import { basename, join } from "node:path";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedSessionMulti, TranscriptFile } from "./types.js";

export const geminiAdapter: Adapter = {
  source: "gemini-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "gemini"),

  enumerate(storeRoot: string): TranscriptFile[] {
    return safeReaddir(storeRoot)
      .filter((n) => n.endsWith(".json"))
      .map((n) => toTranscript("gemini-web", join(storeRoot, n)))
      .filter((t): t is TranscriptFile => !!t);
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối `cowork`). */
  sessionId(filePath: string): string {
    return "gemini-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  // Hợp đồng: `whole` + `parseFileMulti` (một file nhiều phiên — `plan/07 §9`), y như hai adapter
  // web kia. Trả `null` = "không đọc được file này", và `ingestFile` xử đúng nghĩa đó: bỏ qua, không
  // ghi `ingest_state`, nên khi parser thật xong thì lượt quét sau nạp lại đủ, không mất gì.
  // Tiền tố phiên của nền này là `geminiweb-` — khai sẵn ở `PLATFORMS.gemini.sessionPrefix`, và
  // `scanweb-platforms.test` so hai giá trị đó nên chúng không thể lệch nhau.
  parseFileMulti(): ParsedSessionMulti[] | null {
    return null;
  },
};
