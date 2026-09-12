// CÂY NGUỒN KHÔNG ĐƯỢC VU CHO NGƯỜI DÙNG LÀ "CHƯA NỐI" KHI HỌ VỪA ĐĂNG NHẬP XONG.
//
// User báo 2026-09-10 (ảnh): đăng nhập Gemini bằng tai.khoan@canhan.example, cây hiện **hai** con —
// một "(chưa gắn tài khoản)" 0 tin và một `tai.khoan@canhan.example` mang ⚠ — rồi hỏi *"nó bị sai
// slot à?"*. Đo ra **slot ĐÚNG** (`accountsOf('gemini')=["main"]` · `slotOfIdentity→"main"` ·
// `webAuth.gemini {ok:true, who:tai.khoan@canhan.example}`). Sai ở chỗ cây ĐỌC nó, hai gốc riêng biệt:
//
//  ① Khối §BỘ CHUẨN đẩy `{account:"", sessions:0}` cho mọi adapter chưa có tin (để nguồn MỚI không
//    vô hình). Đúng ở tầng NGUỒN, nhưng nó rơi xuống tầng TÀI KHOẢN thành một hàng ảo
//    "(chưa gắn tài khoản)" mang `linked:false` ⇒ ⚠ vĩnh viễn. Nhãn đó nghĩa là *có phiên cũ chưa
//    đóng dấu danh tính* — ở đây không có phiên nào.
//  ② `webPull` ghi `{ok:false, status:'login-only'}` cho nền hạng CHỈ-NỐI, và `webHealth` chấm
//    `ok===false ⇒ fail` ⇒ ⚠. Nhưng `login-only` là kết cục ĐÚNG THIẾT KẾ (`plan/07 §17`). Đây
//    đúng bệnh `[2026-09-10h]` đã vá ở sổ `webAuth` mà bỏ sót ở sổ `webPull`.
//
// Cộng lại: hàng cha gộp `bad:2/kids:2` ⇒ cả nhánh đỏ. Ba dấu ⚠ cho một lượt đăng nhập THÀNH CÔNG.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const SCOPE = SRC("backend/src/memory/scope.ts");

test("1 a placeholder row for a source with NO MESSAGES must not become an 'account'", () => {
  assert.match(SCOPE, /if \(slots\.get\(""\)\?\.sessions === 0\) slots\.delete\(""\);/,
    "phải bỏ khoá rỗng KHI VÀ CHỈ KHI nó 0 phiên");
  // Ràng buộc ngược, quan trọng ngang: phiên đời cũ CHƯA đóng dấu danh tính (account rỗng nhưng
  // CÓ phiên) vẫn phải giữ hàng "(chưa gắn tài khoản)" — đó là đường để người dùng gắn lại chúng.
  assert.match(SCOPE, /"\(chưa gắn tài khoản\)"/, "nhãn cho phiên chưa gắn danh tính phải còn nguyên");
});

test("1b IDENTITY is not necessarily an EMAIL - GitHub returns a USERNAME", () => {
  // User báo 2026-09-11: đăng nhập GitHub Copilot xong hàng vẫn "(chưa gắn tài khoản)" + ⚠, dù
  // kho ghi `webAuth.copilot {ok:true, who:"ZyroFrost"}` và daemon log *"copilot: đã nối (ZyroFrost)"*.
  // `isEmail` viết hồi chỉ có ChatGPT/Claude ⇒ mọi danh tính không-phải-email rơi vào nhánh
  // "chưa biết là ai", tức bề mặt nói ngược chính cái kho vừa ghi.
  assert.match(SCOPE, /const slotWho = isEmail\(account\)\s*\n\s*\? account\s*\n\s*: fromAuth\.has\(account\)/,
    "tên hiển thị phải TRA SỔ theo khe, không suy từ hình dạng chuỗi");
  // 🔴 Và chỉ tra cho hàng do LƯỢT ĐĂNG NHẬP đẻ ra. Bản đầu của bản vá này bỏ vế đó nên hàng của
  // PHIÊN ĐỜI CŨ (khoá cũng là tên khe) bị dán email của người đang đăng nhập — cổng
  // `scope-account` bắt được, đúng luật user chốt 2026-08-28 *"đéo phải lấy lại cái cũ đã chế bị sai"*.
  assert.match(SCOPE, /const fromAuth = new Set<string>\(\);/, "phải NHỚ khoá nào do đăng nhập đẻ ra");
  assert.match(SCOPE, /fromAuth\.add\(key\);/, "đánh dấu ngay chỗ thêm hàng");
  assert.match(SCOPE, /const known = isEmail\(account\) \|\| !!slotWho;/, "có tên web trả về ⇒ coi là ĐÃ biết là ai");
  // BA trạng thái, BA câu: biết là ai · ĐÃ NỐI mà chưa rõ ai · chưa nối. Gộp hai cái sau là dán
  // "chưa gắn tài khoản" lên một khe đang nối — đúng ca M365 Copilot (`token:true` chắc chắn,
  // nhưng nhãn nút tài khoản render thất thường: một lượt thấy, ba lượt sau rỗng).
  assert.match(SCOPE, /const label = slotWho \?\? \(fromAuth\.has\(account\) \? "\(đã nối · chưa rõ tài khoản\)" : "\(chưa gắn tài khoản\)"\);/,
    "phải phân biệt 'đã nối mà chưa rõ ai' với 'chưa gắn tài khoản'");
  // Vế NGƯỢC, quan trọng ngang: KHÔNG được nới `isEmail` cho nhận chuỗi thường — khoá hàng có thể
  // là TÊN KHE (`main`·`2`), mà `main` trông y hệt một tên đăng nhập hợp lệ. Nới ra là biến khe
  // thành danh tính, và hàng sẽ mang nhãn "main".
  const we = /export function isEmail[\s\S]*?\n\}/.exec(readFileSync(new URL("../../backend/src/memory/webslots.ts", import.meta.url), "utf8"));
  assert.ok(we && /@/.test(we[0]), "isEmail phải VẪN chỉ nhận email — nới nó là biến tên khe thành danh tính");
});

test("1c A SUCCESSFUL PULL MUST NOT FLIP THE ROW TO A WARNING (platforms with non-email identity)", () => {
  // User nhìn ra bằng mắt 2026-09-11: `m365copilot-web` **6 phiên · 116 tin** mà mang ⚠ và nhãn
  // *"(chưa gắn tài khoản)"*, trong khi kho ghi `webAuth.m365copilot={ok:true,who:"Nguyễn Đức Huy
  // - CNTT"}`. Cơ chế: danh tính không phải email ⇒ `accountKey` lùi về TÊN KHE ⇒ phiên đóng dấu
  // `account='main'` ⇒ vòng auth thấy `slots.has("main")` nên BỎ QUA ⇒ `fromAuth` rỗng ⇒ nhãn rơi
  // vào ô "chưa biết là ai" ⇒ `linked:false` ⇒ ⚠. Tức càng kéo được nhiều, bề mặt càng báo động.
  // Neo MỘT DÒNG, không cửa sổ N ký tự: bản đầu của ca này neo `else if …[\s\S]{0,400}…add(a)` và
  // đỏ ngay khi khối chú thích dài ra — đúng bẫy `05_TODO` 2026-09-11 đã ghi ("cổng soi CHỮ theo
  // cửa sổ N ký tự vỡ khi thêm chú thích"). Phần HÀNH VI do `scope-slot-identity.test.mjs` đo thật.
  assert.match(SCOPE, /fromAuth\.add\(a\);/, "phải đánh dấu nguồn gốc cho hàng khoá-theo-khe đã có sẵn");
  // Ca ÂM — ranh giới không được nới: nền trả EMAIL thì hàng còn sót dưới khoá tên-khe là phiên
  // KHÔNG được nền liệt kê (đã xoá / của tài khoản trước). `restampAccount` đã dời phần của tài
  // khoản hiện tại sang hàng email, nên dán tên người đang đăng nhập lên phần còn lại là bịa danh
  // tính — đúng thứ user cấm 2026-08-28 (*"đéo phải lấy lại cái cũ đã chế bị sai"*).
  assert.match(SCOPE, /!isEmail\(rec\.who\) && slots\.has\(a\)/, "điều kiện phải có vế !isEmail — thiếu nó là nới sang nền email");
});

test("2 `login-only` is its OWN CLASS, not a failed pull", () => {
  assert.match(SCOPE, /state: "ok" \| "fail" \| "never" \| "loginOnly"/, "kiểu phải khai hạng mới");
  assert.match(SCOPE, /if \(!last\.ok && last\.status === "login-only"\) return \{ \.\.\.base, state: "loginOnly" as const/,
    "phải chặn TRƯỚC phép chấm ok/fail");
  // Không được gộp vào `ok`: nói "đã kéo xong" cho một nền chưa kéo được gì là lời hứa suông
  // theo chiều ngược lại. Hai lỗi đối xứng, cổng phải chặn cả hai.
  assert.doesNotMatch(SCOPE, /status === "login-only"\) return \{ \.\.\.base, state: "ok"/, "cũng KHÔNG được gộp vào ok");
});

test("3 the PARENT row goes red only when a child really failed - `loginOnly` does not count as failed", () => {
  const agg = /function aggregateConn\(children: ScopeNode\[\]\)[\s\S]*?\n\}/.exec(SCOPE);
  assert.ok(agg, "phải tìm được aggregateConn");
  assert.match(agg[0], /c\.linked === false \|\| c\.state === "fail"/, "phép đếm 'con xấu' chỉ nhận linked:false hoặc state fail");
  assert.doesNotMatch(agg[0], /loginOnly/, "loginOnly không được lọt vào phép đếm con xấu");
});

test("4 the UI draws a tick for `loginOnly` but SAYS CLEARLY that nothing was pulled yet", () => {
  const fe = SRC("frontend/scripts/sources.js");
  const branch = /else if\(c\.state==='loginOnly'\)\{([^}]*)\}/.exec(fe);
  assert.ok(branch, "phải có nhánh vẽ riêng cho loginOnly");
  assert.match(branch[1], /mark='✓'/, "đã nối thì phải là ✓ — ⚠ là vu oan");
  assert.match(branch[1], /tip=t\('scope\.tipLoginOnly'\)/, "nhưng tooltip phải nói chưa có đường kéo");
  // Thứ tự nhánh là một phần của phép đo: `state==='fail'` mà đứng trước thì nhánh mới không bao
  // giờ chạy. Đo TRONG hàm vẽ badge, không đo cả file — `c.state==='fail'` còn xuất hiện ở hộp chi
  // tiết phía trên, nên `indexOf` cả file so nhầm hai chỗ khác nhau (bản đầu của cổng này dính đúng vậy).
  const badge = fe.slice(fe.indexOf("var mark,cls,tip,RETIRED"));
  assert.ok(badge.indexOf("c.state==='loginOnly'") < badge.indexOf("c.state==='fail'"), "nhánh loginOnly phải đứng TRƯỚC nhánh fail");
  assert.equal((SRC("frontend/scripts/chrome.js").match(/'scope\.tipLoginOnly':/g) || []).length, 2, "nhãn phải có ở CẢ HAI từ điển");
});

test("5 the DETAIL BOX tells the same story as the badge - two surfaces, one truth", () => {
  // Bài học đã trả giá 2026-09-02: `/connections` và `scope.ts` cùng trả lời *"khe còn nối không"*,
  // vá một bên thì hộp hiện `Link: linked` ngay trên `need-login`. Cùng cái bẫy ở đây: badge có
  // nhánh riêng cho loginOnly mà hộp chi tiết thì không ⇒ bấm vào ✓ lại đọc "chưa kéo lần nào".
  const fe = SRC("frontend/scripts/sources.js");
  assert.match(fe, /var pullTxt=c\.state==='loginOnly'\?t\('scope\.tipLoginOnly'\)/,
    "hộp chi tiết phải xử loginOnly TRƯỚC, không để nó rơi vào ô 'chưa kéo lần nào'");
});
