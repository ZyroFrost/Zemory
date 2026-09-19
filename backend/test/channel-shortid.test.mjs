// SỐ MÁY 9 chữ số — thứ NGƯỜI gõ, KHÔNG phải danh tính.
//
// Vì sao có lớp này (user chốt 2026-09-17: *"cụm id dài quá, rút lại dãy 9 số thôi… để nhập tay
// được, ai dài vậy sao người ta nhập tay"*): vân tay 52 ký tự vừa là TÊN vừa là BẰNG CHỨNG, nên
// không rút ngắn được — rút là phá phần bằng chứng (30 bit thì sinh chứng chỉ trùng được trong
// vài giây). Đường đúng là tách hai vai: số máy để TRA, vân tay để TIN.
//
// Và cố ý KHÔNG có hạn dùng (user bác đề xuất TTL 10 phút của agent): hạn chỉ có nghĩa nếu con số
// là bí mật, mà nó không phải — thứ gác cửa là `share.key` (bước chứng minh cùng chìa ở `wire.ts`)
// cộng vân tay đầy đủ mà TLS so. Đoán trúng số vẫn không ghép được nếu không có chìa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  shortIdFromDeviceId,
  formatShortId,
  looksShortId,
  normalizeDeviceId,
} from "../../dist/memory/channel/identity.js";

const A = "HMVEQRS7-IJADAN5J-JLKQQUD2-Q32CWNBK-S6N4WZF5-B3JBFHCI-EV4WLIQ5-XXA2";
const B = "SGEKJ2R3-A6KS7XNZ-753MRCJV-LLMQJSAE-YMRM4CI7-PEUB6466-7BFZFPPV-CLAI";

test("số máy: đúng 9 chữ số, TẤT ĐỊNH, và hai máy khác nhau ra số khác nhau", () => {
  const a = shortIdFromDeviceId(A);
  assert.match(a, /^[0-9]{9}$/, "phải đúng 9 chữ số — đây là thứ người ta gõ lại bằng tay");
  assert.equal(a, shortIdFromDeviceId(A), "cùng vân tay phải luôn ra cùng số");
  assert.notEqual(a, shortIdFromDeviceId(B), "hai máy khác nhau mà cùng số là ghép nhầm máy");
  // Dấu gạch và chữ thường chỉ là cách VIẾT — không được đổi số, nếu không thì chép từ chỗ này
  // sang chỗ kia là ra một máy khác.
  assert.equal(shortIdFromDeviceId(A.toLowerCase()), a, "hoa/thường không được đổi số");
  assert.equal(shortIdFromDeviceId(A.replace(/-/g, "")), a, "bỏ gạch không được đổi số");
});

test("số máy dựa trên VÂN TAY ĐÃ CHUẨN HOÁ — ID đời cũ (không chữ số kiểm) vẫn ra cùng số", () => {
  // `normalizeDeviceId` bóc chữ số kiểm để cặp đã ghép từ bản cũ không bị cắt (identity.ts).
  // Số máy phải đi theo cùng một chuẩn hoá đó, nếu không bản nâng cấp sẽ đổi số của chính mình.
  assert.equal(shortIdFromDeviceId(A), shortIdFromDeviceId(normalizeDeviceId(A)));
});

test("định dạng nhóm ba, và chỉ nhận đúng dạng 9 chữ số", () => {
  assert.equal(formatShortId("418902577"), "418 902 577");
  assert.equal(formatShortId("abc"), "abc", "không phải 9 chữ số ⇒ trả nguyên, không bịa dạng");
  assert.ok(looksShortId("418902577"));
  assert.ok(looksShortId("418 902 577"), "người ta sẽ gõ có khoảng trắng");
  assert.ok(looksShortId("418-902-577"), "…và có gạch");
  // CA ÂM: vân tay KHÔNG được nhận nhầm là số máy, nếu không đường tra sẽ nuốt luôn ca ghép
  // bằng vân tay (đường DUY NHẤT dùng được khi khác mạng).
  assert.equal(looksShortId(A), false, "vân tay không phải số máy");
  assert.equal(looksShortId("41890257"), false, "8 chữ số không phải số máy");
  assert.equal(looksShortId("4189025770"), false, "10 chữ số cũng không");
});

test("SỐ MÁY KHÔNG phải danh tính — thứ ghi vào sổ ghép đôi vẫn là VÂN TAY", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const pane = ui.slice(ui.indexOf('if (p === "/channel-pair")'), ui.indexOf('if (p === "/channel-sync")'));
  assert.match(pane, /looksShortId/, "phải nhận được số máy người dùng gõ");
  assert.match(pane, /hits\[0\]\.deviceId/, "tra xong phải ghi VÂN TAY, không ghi con số");
  // CA ÂM BẮT BUỘC — hai vế này là thứ chặn "ghép nhầm máy người khác".
  // 🔄 Nhánh "không thấy trên mạng" nay KHÔNG dừng ngay mà TRA BẢNG trên thư mục dùng chung
  // (2026-09-19) — đó là thứ làm số máy dùng được khi hai máy khác mạng. Luật vẫn nguyên: tra không
  // ra thì NÓI, không ghi bừa.
  assert.match(pane, /findPresence/, "không thấy trên mạng ⇒ phải TRA BẢNG, không bỏ cuộc sớm");
  assert.match(pane, /if \(!found\) return json\(res, \{ ok: false, error: "not-seen" \}\);/,
    "tra không ra ⇒ phải NÓI, không ghi bừa");
  assert.match(pane, /hits\.length > 1/, "trùng số ⇒ phải HỎI, không được đoán");
});

test("số máy KHÔNG có hạn dùng — không nơi nào gắn hết-hạn cho nó", () => {
  const idt = readFileSync(new URL("../src/memory/channel/identity.ts", import.meta.url), "utf8");
  const body = idt.slice(idt.indexOf("export function shortIdFromDeviceId"));
  assert.doesNotMatch(body.slice(0, 400), /expire|ttl|Date\.now/i,
    "gắn hạn cho con số này là coi nó như bí mật — nó không phải, và user đã bác");
});
