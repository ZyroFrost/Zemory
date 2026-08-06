// Một bất biến an toàn đường dẫn, MỘT bản.
//
// Bối cảnh (audit 2026-07-27): có HAI guard chống thoát thư mục — `resolveDocPath`
// (`docs/plan.ts`) và một đoạn nội tuyến trong `readDoc` (`ui.ts`). Chúng bị coi là trùng
// nhau và suýt bị gộp làm một, nhưng gộp thẳng thì SAI: hai bên resolve khác nhau
// (`resolveDocPath` tính từ gốc project, `readDoc` tính từ `docs/agent` trừ nhánh `plan/`),
// nên ép chung một hàm sẽ đổi ngữ nghĩa của ít nhất một bên.
//
// Thứ THẬT SỰ trùng chỉ là câu hỏi cuối: *"đường vừa resolve có còn nằm trong thư mục nền
// không?"*. Đó là phần mang tính an toàn, và đó là phần được rút ra đây. Mỗi bên giữ nguyên
// cách resolve của mình rồi gọi CÙNG một phép kiểm — hết cảnh hai bản logic bảo mật trôi
// lệch nhau mà không ai biết bản nào mới đúng.

import { isAbsolute, relative, resolve } from "node:path";

/**
 * `abs` có nằm trong `base` (hoặc chính là `base`) không?
 *
 * Dùng `relative()` chứ KHÔNG dùng so chuỗi tiền tố: `startsWith` cho `"/a/bc"` khớp nhầm
 * `"/a/b"`, và không xử được `..` đã chuẩn hoá. Kết quả rỗng nghĩa là trùng khớp chính nó.
 *
 * CỐ Ý phân biệt hoa/thường: đây là guard bảo mật, mà trên Linux `Docs` và `docs` là hai thư
 * mục khác nhau thật. (Khác `isInside` của `cloudguard.ts` — bên đó so đường dẫn Windows để
 * đoán phạm vi đồng bộ nên gấp hoa/thường mới đúng.)
 */
export function isWithinBase(base: string, abs: string): boolean {
  const rel = relative(resolve(base), resolve(abs));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
