// Đọc file văn bản ĐẾN TỪ NGOÀI — một cửa duy nhất, lột BOM.
//
// Vì sao cần (đo 2026-08-07, cùng một lớp lỗi nổ BA lần trong một ngày):
//   · marker `.harness.json` do người dùng tạo bằng PowerShell 5.1 `Set-Content -Encoding utf8`
//     mang BOM ⇒ `JSON.parse` ném ngay ký tự đầu ⇒ 5 chỗ đọc marker cùng ngã, và ngã IM LẶNG
//     (policy mất khoá `protected`, harnessPathsAt rơi fallback rồi sinh guard nhầm thư mục);
//   · payload hook đi qua pipe PowerShell cũng dính BOM ⇒ guard fail-open = TẮT CẢ LUẬT;
//   · `graph-seam.ts` từng mang một byte NUL thật ⇒ grep coi cả file là nhị phân và bỏ qua.
//
// Ký tự vô hình không làm chương trình BÁO LỖI — nó làm chương trình TRẢ VỀ RỖNG rồi đi tiếp,
// nên không ai biết mình đang mất gì. Đó là lý do phải chặn ở CỬA ĐỌC chứ không vá từng chỗ.
//
// PHẠM VI (cố ý hẹp — đo được repo này hiện có 0 file BOM, nên đây là phòng ngừa cho file đến
// từ NGOÀI, không phải chữa lỗi đang có): dùng cho docs `.md` của project, marker/config JSON,
// và mọi thứ do người dùng hay repo khác soạn. KHÔNG cần cho file do chính zemory sinh ra.

import { readFileSync } from "node:fs";

/** U+FEFF ở đầu chuỗi — dấu thứ tự byte, vô hình, nhưng đủ làm `JSON.parse` và mọi phép so
 *  chuỗi neo-đầu-dòng (`startsWith`, regex `^`) sai. */
export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Đọc UTF-8 và lột BOM. Ném như `readFileSync` khi file không đọc được — chỗ gọi tự
 *  quyết fail-open hay không; nuốt lỗi ở đây là tái lập đúng kiểu hỏng-im-lặng nói trên. */
export function readTextFile(path: string): string {
  return stripBom(readFileSync(path, "utf8"));
}
