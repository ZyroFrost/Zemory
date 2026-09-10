// GitHub Copilot (github.com/copilot) web adapter — lane `copilot-web`, origin=web. **KHAI DANH, CHƯA PARSE.**
//
// Vì sao một adapter chưa đọc được gì vẫn đáng tồn tại: cây Nguồn dựng danh sách nền từ
// `allAdapters()` (xem `memory/scope.ts` khối "BỘ CHUẨN"), nên một nguồn chưa đăng ký là VÔ HÌNH
// trên UI — kể cả sau khi người dùng đã đăng nhập xong. Đó đúng là vòng luẩn quẩn mà khối đó ghi:
// muốn có dữ liệu thì phải quét, muốn quét thì phải thấy nền tồn tại đã.
//
// Đo 2026-09-10: chưa dò được API lịch sử vì profile dò chưa có phiên GitHub. Nguồn LOCAL cũng chưa
// dùng được — Copilot Chat của VS Code có 46 phiên \`.jsonl\` trên máy này nhưng \`requests[]\` RỖNG cả 46
// (58 KB toàn metadata). Nếu một máy có chat thật thì đường ĐĨA đó tốt hơn cả web: xem \`plan/07 §17.3\`.
//
// Khi đường kéo mở (dò `listExpr`/`convExpr` trên một phiên đã đăng nhập — `plan/07 §17.5`), chỉ
// việc điền `parseFileMulti` ở đây theo hình dạng ĐO ĐƯỢC. Tới lúc đó nó trả `null`: không có
// định dạng nào được đo thì đoán một hình dạng là tự dựng một parser nói dối.

import { basename, join } from "node:path";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedSessionMulti, TranscriptFile } from "./types.js";

export const copilotAdapter: Adapter = {
  source: "copilot-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "copilot"),

  enumerate(storeRoot: string): TranscriptFile[] {
    return safeReaddir(storeRoot)
      .filter((n) => n.endsWith(".json"))
      .map((n) => toTranscript("copilot-web", join(storeRoot, n)))
      .filter((t): t is TranscriptFile => !!t);
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối `cowork`). */
  sessionId(filePath: string): string {
    return "copilot-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  // Hợp đồng: `whole` + `parseFileMulti` (một file nhiều phiên — `plan/07 §9`), y như hai adapter
  // web kia. Trả `null` = "không đọc được file này", và `ingestFile` xử đúng nghĩa đó: bỏ qua, không
  // ghi `ingest_state`, nên khi parser thật xong thì lượt quét sau nạp lại đủ, không mất gì.
  // Tiền tố phiên của nền này là `copilotweb-` — khai sẵn ở `PLATFORMS.copilot.sessionPrefix`, và
  // `scanweb-platforms.test` so hai giá trị đó nên chúng không thể lệch nhau.
  parseFileMulti(): ParsedSessionMulti[] | null {
    return null;
  },
};
