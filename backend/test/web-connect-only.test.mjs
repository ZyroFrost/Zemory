// NỀN HẠNG CHỈ-NỐI — canh đúng HAI lời hứa, và chúng kéo ngược nhau.
//
// User giao 2026-09-12: *"thêm vào các nguồn đầy đủ của các con AI người ta hay xài, cả web lẫn
// local"*, rồi chốt ngay phạm vi: *"chỉ tạo đường nối chứ ko nối sẵn nha, vì t ko có tk, chỉ tạo để
// user có thì nối thôi"*. Hai vế đó là hai bất biến ngược chiều:
//   ① CÓ ĐƯỜNG NỐI  — nền phải hiện ra và bấm nối được, nếu không thì người có tài khoản cũng không
//      có chỗ nào để bấm (vòng luẩn quẩn user chỉ ra 2026-09-10).
//   ② KHÔNG TỰ NỐI — không lượt quét gộp nào, không nhịp nền nào được tự mở cửa sổ đăng nhập.
// Bỏ ① thì tính năng vô hình; bỏ ② thì máy tự bật cửa sổ đòi đăng nhập — đúng thứ user cấm.
//
// Bất biến thứ ba, học từ máu: **không đoán**. Không đường kéo giả, không danh tính suy diễn, không
// tên cookie bịa. Ca ③ và ④ canh đúng hai chỗ đã trả giá thật (`[2026-09-10h]` · `m365copilot`).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PLATFORMS, platformsForScan } from "../../dist/memory/scanweb.js";
import { WEB_PLATFORMS } from "../../dist/memory/webslots.js";
import { allAdapters } from "../../dist/memory/adapters/index.js";
import { jarHasSession } from "../../dist/memory/borrowcookies.js";

/** Sáu nền thêm 2026-09-12. Liệt kê TAY: suy từ cờ `loginOnly` thì ca ① tự đúng và không đo gì. */
const NEW = ["grok", "deepseek", "perplexity", "mistral", "qwen", "kimi"];

test("1 THERE IS A CONNECT PATH: each new platform has its URL, its own window, a session check and a registered adapter", () => {
  const sources = new Set(allAdapters().map((a) => a.source));
  for (const k of NEW) {
    const p = PLATFORMS[k];
    assert.ok(p, `${k}: chưa khai trong PLATFORMS`);
    assert.match(p.url, /^https:\/\//u, `${k}: phải có URL thật để mở cửa sổ`);
    assert.ok(p.tabRe instanceof RegExp && p.tabRe.test(p.url), `${k}: tabRe phải khớp chính URL của nó`);
    assert.ok(p.authExpr && p.authExpr.length > 40, `${k}: thiếu phép kiểm đăng nhập ⇒ nối xong không biết đã nối chưa`);
    assert.ok(WEB_PLATFORMS.includes(k), `${k}: không có trong WEB_PLATFORMS ⇒ hộp Thêm nguồn không thấy`);
    assert.ok(sources.has(p.source), `${k}: chưa có adapter cho '${p.source}' ⇒ nguồn VÔ HÌNH trên cây`);
  }
});

test("2 IT DOES NOT CONNECT BY ITSELF: a COMBINED scan skips it; it runs only when called BY NAME", () => {
  // Máy đã có profile của cả nền cũ lẫn nền mới (ca xấu nhất: người dùng từng bấm nối một lần).
  const inUse = ["chatgpt", "claude", ...NEW];

  // Nút Quét chung / nhịp nền: `only` rỗng ⇒ chỉ nền đã mở đường kéo.
  assert.deepEqual(platformsForScan(undefined, inUse), ["chatgpt", "claude"], "lượt gộp KHÔNG được đụng nền chỉ-nối");

  // Người dùng bấm đúng một nền ⇒ nền đó chạy.
  for (const k of NEW) assert.deepEqual(platformsForScan([k], inUse), [k], `${k}: gọi tên thì phải chạy`);

  // Và tên lạ vẫn bị loại — `only` không phải cửa hậu bỏ qua mọi phép lọc.
  assert.deepEqual(platformsForScan(["khong-ton-tai"], inUse), []);
});

test("3 NO FAKE PULL PATH: a connect-only platform must carry the flag and use the two empty expressions", () => {
  for (const k of NEW) {
    const p = PLATFORMS[k];
    assert.equal(p.loginOnly, true, `${k}: thiếu cờ ⇒ lượt quét sẽ báo 'done · 0' thay vì 'login-only'`);
    // "đã kéo, không có gì" và "chưa mở đường kéo" là HAI sự thật khác nhau; một cái nói dối.
    assert.match(p.listExpr, /^\(async\(\)=>\[\]\)\(\)$/u, `${k}: listExpr phải là biểu thức rỗng đã khai`);
    assert.match(p.convExpr("bat-ky"), /^\(async\(\)=>null\)\(\)$/u, `${k}: convExpr phải là biểu thức rỗng đã khai`);
  }
});

test("4 NO IDENTITY GUESSING: the check only says THERE IS A SESSION, it never invents who the user is", () => {
  // 🔴 Ca này sinh từ một lỗi thật (`06_CHANGES [2026-09-10h]`): bản Gemini đầu suy danh tính từ
  // "tìm thấy một chuỗi hình email", và một URL nội bộ của Google đã thành danh tính đóng dấu lên
  // phiên. Một biểu thức DÙNG CHUNG chạy trên sáu trang lạ mà đi mò nhãn tài khoản thì chắc chắn
  // tái diễn — vd `aria-label="Your account settings"` sẽ thành tên người.
  for (const k of NEW) {
    const a = PLATFORMS[k].authExpr;
    assert.doesNotMatch(a, /email/iu, `${k}: phép kiểm không được đụng tới danh tính khi chưa đo được`);
    assert.doesNotMatch(a, /aria-label/iu, `${k}: mò nhãn tài khoản trên trang lạ là cách bịa ra một cái tên`);
    assert.match(a, /token:true/u, `${k}: vẫn phải kết luận được "đã có phiên"`);
    // Loại trang đăng nhập TRƯỚC khi nhìn ô soạn tin — trang login cũng có ô nhập.
    assert.match(a, /location\.pathname/u, `${k}: phải loại trang đăng nhập, không thì ô nhập mật khẩu đọc thành "đã nối"`);
  }
});

test("5 NO COOKIE GUESSING: an unmeasured platform declares `null` and `jarHasSession` answers 'unknown'", () => {
  // `m365copilot` từng khai `%ESTSAUTH%` theo tài liệu công khai; tên đó SAI và hàm này trả `false`
  // cho một khe ĐANG đăng nhập. `null` = chưa đo ⇒ phải là "không kết luận được", KHÔNG phải "không
  // có phiên" — hai câu đó dẫn tới hai hành vi khác hẳn ở vòng tự kéo và ở `restoreShelvedSession`.
  const BORROW = readFileSync(new URL("../src/memory/borrowcookies.ts", import.meta.url), "utf8");
  for (const k of NEW) {
    assert.match(BORROW, new RegExp(`^\\s{2}${k}: null,`, "mu"), `${k}: phải khai null (chưa đo), không bỏ trống và không đoán`);
    assert.equal(jarHasSession("khong-ton-tai.db", k), null, `${k}: chưa đo tên cookie ⇒ phải trả null`);
  }
  // Ca ÂM: nền ĐÃ đo vẫn phải kết luận được, không bị vạ lây.
  assert.equal(jarHasSession("khong-ton-tai.db", "chatgpt"), false, "nền đã đo: file không có ⇒ chắc chắn không có phiên");
});
