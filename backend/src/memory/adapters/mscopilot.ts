// Microsoft Copilot (copilot.microsoft.com) web adapter — lane `mscopilot-web`, origin=web.
// **KHAI DANH, CHƯA PARSE.**
//
// 🔴 ĐÂY KHÔNG PHẢI GitHub Copilot. Ba sản phẩm trùng tên, ba kho khác nhau (`plan/07 §17.3`):
//   · `copilot`      — GitHub Copilot, tài khoản GitHub, API `api.individual.githubcopilot.com`
//   · `mscopilot`    — cái này: Copilot cá nhân, tài khoản Microsoft (MSA), hạ tầng họ Sydney
//   · `m365copilot`  — Microsoft 365 Copilot, tài khoản CÔNG TY (Entra ID), lịch sử ở Substrate
// Gộp chúng một chữ "copilot" là trộn ba tài khoản của ba hệ vào một lane — user chỉ ra đúng chỗ
// này 2026-09-11: *"vậy cái này phải tách 3 cái riêng"*.
//
// Vì sao một adapter chưa đọc được gì vẫn đáng tồn tại: cây Nguồn dựng danh sách nền từ
// `allAdapters()` (`memory/scope.ts`, khối "BỘ CHUẨN"), nên nguồn chưa đăng ký là VÔ HÌNH trên UI
// — kể cả sau khi người dùng đã đăng nhập. Khai danh là điều kiện để có cái mà bấm.
//
// Đường KÉO chưa mở: chưa có phiên thật nào để dò, và `plan/07 §1` cấm viết parser bằng phỏng đoán.
// Khi có phiên, dò `listExpr`/`convExpr` theo `plan/07 §17.5` rồi mới điền `parseFileMulti`.

import { basename, join } from "node:path";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedSessionMulti, TranscriptFile } from "./types.js";

export const msCopilotAdapter: Adapter = {
  source: "mscopilot-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "mscopilot"),

  enumerate(storeRoot: string): TranscriptFile[] {
    return safeReaddir(storeRoot)
      .filter((n) => n.endsWith(".json"))
      .map((n) => toTranscript("mscopilot-web", join(storeRoot, n)))
      .filter((t): t is TranscriptFile => !!t);
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối `copilot`/`cowork`). */
  sessionId(filePath: string): string {
    return "mscopilot-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  // Trả `null` = "không đọc được file này"; `ingestFile` KHÔNG ghi `ingest_state` cho ca đó, nên
  // khi parser thật xong thì lượt quét sau nạp lại đủ. Tiền tố phiên khai ở
  // `PLATFORMS.mscopilot.sessionPrefix`; `scanweb-platforms.test` so hai giá trị nên không lệch được.
  parseFileMulti(): ParsedSessionMulti[] | null {
    return null;
  },
};
