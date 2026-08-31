// Cổng cho câu cảnh báo "lượt auto-sync đang bay / đã bị cắt" của `preflight-gate.mjs`.
//
// Vì sao mặt này cần cổng riêng: quy trình chạy gate là "tắt daemon → chạy gate → bật lại", và nếu
// đúng lúc đó có lượt auto-sync chưa đóng sổ thì việc tắt daemon CẮT nó ⇒ card Drive Sync hiện đèn
// đỏ "push incomplete". Đèn đó ĐÚNG và vô hại, nhưng nguyên nhân là thao tác bảo trì, không phải sự
// cố — xảy ra thật 2026-08-31 và user phải hỏi "lỗi này là sao". Câu cảnh báo tồn tại để đèn đỏ
// được giải thích TRƯỚC khi nó làm ai đó lo; một câu như thế mà sai thì tệ hơn không có, nên nó
// phải bị đo.
//
// Hàm được test là HÀM THUẦN (`syncCutNote`) — không hỏi daemon, không đọc đĩa. Import file script
// ở đây an toàn vì `main()` đã bị chốt sau `import.meta.url === argv[1]`; trước bản 2026-08-31 nó
// là top-level await, và chỉ IMPORT thôi đã đủ dò daemon rồi đặt `process.exitCode = 1` ⇒ đỏ oan.

import test from "node:test";
import assert from "node:assert/strict";
import { syncCutNote } from "../scripts/preflight-gate.mjs";

const T0 = Date.parse("2026-08-31T07:37:04.073Z");
const at = (min) => T0 + min * 60_000;

test("không có lượt treo trong sổ ⇒ IM, không được cảnh báo oan", () => {
  assert.equal(syncCutNote(null, at(30), true), null, "null ⇒ không nói gì");
  assert.equal(syncCutNote(null, at(30), false), null, "null ⇒ không nói gì (daemon tắt)");
  assert.equal(syncCutNote(undefined, at(30), false), null, "undefined ⇒ không nói gì");
});

test("daemon SỐNG ⇒ cảnh báo PHÒNG NGỪA: tắt bây giờ là cắt nó", () => {
  const note = syncCutNote(T0, at(21), true);
  assert.ok(note, "phải có câu");
  assert.match(note, /21′ trước/, "phải nói lượt đó chạy bao lâu rồi");
  assert.match(note, /2026-08-31T07:37:04\.073Z/, "phải nêu đúng mốc bắt đầu, không nói chung chung");
  assert.match(note, /Tắt daemon BÂY GIỜ/, "vế phòng ngừa: nói rõ hành động nào gây ra đèn đỏ");
  assert.match(note, /push incomplete/, "phải gọi đúng tên thứ user sẽ thấy trên card");
  assert.match(note, /Vô hại/, "phải nói rõ là vô hại — nếu không thì chính câu cảnh báo làm người ta lo");
  // Vế PHÒNG NGỪA không được nói "đã bị cắt": lượt đó còn đang chạy.
  assert.doesNotMatch(note, /đã bị cắt/, "daemon còn sống ⇒ KHÔNG được khẳng định lượt đã bị cắt");
});

test("daemon TẮT ⇒ cảnh báo GIẢI THÍCH: đèn đỏ đang tới và vì sao", () => {
  const note = syncCutNote(T0, at(21), false);
  assert.ok(note, "phải có câu");
  assert.match(note, /đã bị cắt lúc daemon tắt/, "vế giải thích: nói thẳng nguyên nhân");
  assert.match(note, /KHÔNG phải lỗi mới/, "phải nói rõ đây không phải sự cố mới — đó là cả mục đích của câu này");
  assert.match(note, /Lượt kế tự đẩy bù/, "phải nói việc tự lành, để user không đi bấm Sync Now");
  assert.doesNotMatch(note, /Tắt daemon BÂY GIỜ/, "daemon đã tắt ⇒ khuyên 'đừng tắt' là vô nghĩa");
});

test("hai vế PHẢI khác nhau — nếu giống thì cờ daemonAlive là trang trí", () => {
  const alive = syncCutNote(T0, at(21), true);
  const dead = syncCutNote(T0, at(21), false);
  assert.notEqual(alive, dead, "sống và tắt cần lời khuyên NGƯỢC nhau, không được trả cùng một câu");
});

test("đồng hồ chạy lùi KHÔNG được in số phút âm", () => {
  // Cùng ràng buộc mà `interruptedRunNote` đã chịu: máy lệch giờ / vừa đổi timezone thì `now` có thể
  // nhỏ hơn `runAt`, và "-40′ trước" là câu vô nghĩa đủ để người đọc mất tin vào cả cái đèn.
  const note = syncCutNote(T0, at(-40), false);
  assert.ok(note, "vẫn phải nói, chỉ là không được nói số âm");
  assert.doesNotMatch(note, /-\d+′/, "không được có phút âm");
  assert.match(note, /0′ trước/, "kẹp về 0 thay vì âm");
});
