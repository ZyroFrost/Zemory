// `validate.closedItems()` và `archive` phải hiểu CÙNG MỘT định nghĩa "mục đã đóng".
//
// Vì sao có cổng này: bản vá 2026-08-21 dạy `archive` nhận `✅` ngang `[x]`, nhưng để
// `validate.closedItems()` ở lại với mẫu chỉ-`[x]`. Không lỗi nào nổ — lời nhắc archive chỉ
// **im lặng**. Đo 2026-08-23 trên `05_TODO` thật: **7 mục `✅` / 0 mục `[x]`**, `closedItems()`
// trả **0**, nên `zemory validate` không in một chữ nào trong khi sổ đang phình. Đúng họ hỏng
// mà `02_RULES §Hành xử` gọi là **hỏng lặng**: bề mặt vẫn xanh, cơ chế thì đã chết.
//
// Cổng đo CẢ HAI CHIỀU (luật 7 của skill audit): dấu đóng phải ĐƯỢC đếm, và dấu CHƯA đóng
// phải KHÔNG được đếm — thiếu vế sau thì một phép đếm "mọi dòng bắt đầu bằng -" cũng qua.
import { test } from "node:test";
import assert from "node:assert/strict";
import { closedItems } from "../../dist/docs/validate.js";
import { isClosedItemLine } from "../../dist/docs/archive.js";

test("closedItems đếm CẢ `[x]` lẫn `✅` (ca đã làm im lặng suốt: repo viết `✅`)", () => {
  assert.equal(closedItems("- [x] xong kiểu cũ"), 1, "`- [x]` phải được đếm");
  assert.equal(closedItems("- ✅ **xong kiểu repo này viết**"), 1, "`- ✅` phải được đếm");
  assert.equal(closedItems("- [x] a\n- ✅ b\n- [x] c"), 3, "đếm lẫn hai dấu");
});

test("CA ÂM — dấu CHƯA đóng không được đếm (thiếu vế này thì phép đếm nào cũng 'qua')", () => {
  assert.equal(closedItems("- [ ] chưa làm"), 0, "`[ ]` KHÔNG phải đã đóng");
  assert.equal(closedItems("- [~] đang làm"), 0, "`[~]` KHÔNG phải đã đóng");
  assert.equal(closedItems("## ✅ tiêu đề khối, không phải mục"), 0, "heading không phải mục backlog");
  assert.equal(closedItems("text ✅ giữa câu"), 0, "dấu giữa câu không phải mục");
});

test("fence-aware: ví dụ trong khối mã KHÔNG phải mục thật", () => {
  const md = ["- ✅ mục thật", "```", "- [x] ví dụ trong fence", "- ✅ ví dụ trong fence", "```", "- [x] mục thật 2"].join("\n");
  assert.equal(closedItems(md), 2, "chỉ đếm 2 mục ngoài fence");
});

test("MỘT NGUỒN: `closedItems` và `isClosedItemLine` không được nói khác nhau", () => {
  // Hai bên trôi lệch chính là bug gốc, nên đối chiếu trực tiếp trên cùng tập dòng.
  const lines = ["- [x] a", "- ✅ b", "- [ ] c", "- [~] d", "  - ✅ e (thụt lề)", "## ✅ f", "- ✅", "khong phai muc"];
  for (const l of lines) {
    assert.equal(
      closedItems(l),
      isClosedItemLine(l) ? 1 : 0,
      `hai phép nói khác nhau ở dòng: ${JSON.stringify(l)} — đó đúng là bug đã làm lời nhắc im lặng`,
    );
  }
});
