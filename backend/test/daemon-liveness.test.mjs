// "KHÔNG TRẢ LỜI" ≠ "ĐÃ CHẾT" — doctor không được phán daemon chết rồi khuyên bật lại nó.
//
// Quan sát 2026-09-02: `zemory doctor` in *"daemon KHÔNG chạy … Bật `zemory ui`"* trong khi
// `/ping` trả `{"app":"zemory","pid":9144}` ngay trước VÀ ngay sau lượt doctor đó. Gốc: phép dò
// dùng trần **600 ms** rồi gộp mọi lỗi thành "không sống", mà `plan/14 §8` đã ĐO `/ping` lượt lạnh
// **12.347 ms**. Lời khuyên sai còn tệ hơn im lặng — nó dạy người đọc thôi tin doctor.
//
// Nghịch lý trong cùng repo: `ui.ts probeZemoryUi` VỐN làm đúng (trần 2.500 ms, BA trạng thái, chú
// thích ghi thẳng *"Timeout ≠ absent"*) — vì ở đó đoán sai nghĩa là dựng daemon thứ hai và hỏng
// kho. Cùng một sự thật thì hai bề mặt phải nói cùng một câu.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const H = readFileSync(new URL("../src/commands/harness.ts", import.meta.url), "utf8");
const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

test("phép dò của doctor trả BA trạng thái, không phải boolean", () => {
  assert.match(H, /type DaemonLiveness = "alive" \| "absent" \| "unknown"/, "phải có hạng 'unknown' riêng");
  assert.ok(!/async function daemonAlive\(\): Promise<boolean>/.test(H), "boolean gộp mất trạng thái 'không biết'");
  // Chỉ CHỐI KẾT NỐI mới được kết luận vắng mặt.
  assert.match(H, /ECONNREFUSED"\s*\?\s*"absent"\s*:\s*"unknown"/, "hết giờ phải là 'unknown', không phải 'absent'");
});

test("trần chờ phải đủ cho lượt LẠNH đã đo (12,3s) — 600ms là chắc chắn trượt", () => {
  const ms = Number(/const PING_TIMEOUT_MS = ([\d_]+)/.exec(H)?.[1]?.replace(/_/g, ""));
  assert.ok(Number.isFinite(ms), "phải đọc được PING_TIMEOUT_MS");
  assert.ok(ms >= 2_500, `trần ${ms}ms phải >= trần 2.500ms mà probeZemoryUi đã dùng cho cùng phép dò`);
});

test("BA câu khác nhau — nếu 'không biết' dùng chung câu với 'đã chết' thì hạng đó là trang trí", () => {
  const absent = /live === "absent"/.test(H);
  const unknown = /live === "unknown"/.test(H);
  assert.ok(absent && unknown, "cả hai nhánh phải được xử lý riêng");
  // Câu của nhánh unknown KHÔNG được khuyên bật daemon (nó đang chạy), và PHẢI nói là có thể bận.
  const i = H.indexOf('live === "unknown"');
  const branch = H.slice(i, i + 500);
  assert.ok(!/Bật `zemory ui`/.test(branch), "đang bận thì khuyên 'bật lại' là sai việc");
  assert.match(branch, /BẬN|bận/, "phải nói rõ có thể đang bận");
});

test("hai bề mặt cùng luật: ui.ts vẫn giữ 'timeout ≠ absent'", () => {
  assert.match(UI, /Timeout ≠ absent/, "chú thích nguồn của luật phải còn đó");
  assert.match(UI, /"busy"/, "probeZemoryUi vẫn phải có trạng thái thứ ba");
});
