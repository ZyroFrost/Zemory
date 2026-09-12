// Adapter KHAI DANH cho nền web hạng CHỈ-NỐI — một khuôn dùng chung, không phải sáu bản chép tay.
//
// Vì sao một adapter chưa đọc được gì vẫn phải tồn tại: cây Nguồn và hộp **＋ Thêm nguồn** dựng danh
// sách nền từ `allAdapters()`, nên một nguồn chưa đăng ký là VÔ HÌNH — người dùng không có chỗ nào
// để bấm nối, kể cả khi họ có tài khoản. Đó đúng vòng luẩn quẩn user chỉ ra 2026-09-10:
// *"chỉ nối vào endpoint để nó nối vào mà, đâu cần có data"*.
//
// Vì sao nó KHÔNG parse: `plan/07 §1` cấm viết parser trước khi có mẫu thật. Máy dựng các nền này
// không có tài khoản nào (user 2026-09-12: *"chỉ tạo đường nối chứ ko nối sẵn, t ko có tk, chỉ tạo
// để user có thì nối thôi"*), nên `listExpr`/`convExpr` chưa đo được và `parseFileMulti` trả `null`
// = "không đọc được file này". `ingestFile` hiểu đúng nghĩa đó: bỏ qua và KHÔNG ghi `ingest_state`,
// nên tới ngày parser thật xong thì lượt quét sau nạp lại đủ, không mất gì.
//
// Nói cách khác: khuôn này mua ĐƯỜNG NỐI (mở cửa sổ · kiểm phiên · hiện trên bề mặt) mà không mua
// một lời hứa nào về việc kéo. Hai thứ đó độc lập, và trộn chúng là cách bề mặt bắt đầu nói dối.

import { basename, join } from "node:path";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedSessionMulti, TranscriptFile } from "./types.js";

/**
 * Dựng một adapter web mới có mặt trên bề mặt nhưng chưa đọc được nội dung.
 *
 * @param key    khoá nền, PHẢI khớp `PLATFORMS[key].key` — `discovery` lấy đoạn cuối của
 *               `signature` làm tên thư mục trong `imports/`, nên lệch một chữ là kho nằm ở chỗ
 *               không ai nhìn (đúng lỗi đã trả giá 2026-07-28 khi `relocate` làm lệch đường import).
 * @param source giá trị ghi vào `sessions.source`, PHẢI khớp `PLATFORMS[key].source`.
 */
export function declaredWebAdapter(key: string, source: string): Adapter {
  return {
    source,
    origin: "web",
    mode: "whole",
    signature: join(".zemory", "imports", key),

    enumerate(storeRoot: string): TranscriptFile[] {
      const out: TranscriptFile[] = [];
      for (const f of safeReaddir(storeRoot)) {
        if (!f.endsWith(".json")) continue;
        if (f.startsWith("_")) continue; // sidecar (`_pulled.json`…), không phải transcript
        const t = toTranscript(source, join(storeRoot, f));
        if (t) out.push(t);
      }
      return out;
    },

    /** Khoá phiên theo TÊN FILE — ổn định, không cần parse (cùng lối `gemini`/`cowork`). */
    sessionId(filePath: string): string {
      return `${key}-file-` + basename(filePath).replace(/\.[^.]+$/u, "");
    },

    /** Chưa đo được hình dạng nào ⇒ nói KHÔNG ĐỌC ĐƯỢC, không đoán. */
    parseFileMulti(): ParsedSessionMulti[] | null {
      return null;
    },
  };
}
