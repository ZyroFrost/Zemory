// KHAI MỘT NỀN LÀ SỬA SÁU CHỖ — và sáu chỗ đó phải do MÁY canh, không phải do ai nhớ.
//
// `plan/07 §17.4` liệt kê đúng sáu nơi phải sửa khi thêm một nền web. Nó là một DANH SÁCH TRONG
// TÀI LIỆU, nên nó hỏng đúng kiểu tài liệu hỏng: hôm 2026-09-10 thêm `copilot` mà **quên
// `WEB_LABEL`** ⇒ `/connections` trả 11 hàng, không hàng nào là copilot — lane vô hình suốt một
// ngày, không cổng nào kêu. Ca này biến danh sách đó thành phép đo.
//
// Bối cảnh 2026-09-11 (user: *"phải tách 3 cái riêng"*): **ba** sản phẩm mang tên Copilot là **ba
// hệ khác nhau** — GitHub Copilot (tài khoản GitHub) · Microsoft Copilot (tài khoản MSA) ·
// Microsoft 365 Copilot (tài khoản công ty, Entra ID). Khác tài khoản, khác miền, khác chỗ lưu.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PLATFORMS } from "../../dist/memory/scanweb.js";
import { WEB_PLATFORMS } from "../../dist/memory/webslots.js";
import { allAdapters } from "../../dist/memory/adapters/index.js";

const SRC = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const CONN = SRC("backend/src/memory/connections.ts");
const BORROW = SRC("backend/src/memory/borrowcookies.ts");
const FE = SRC("frontend/scripts/sources.js");
const keys = Object.keys(PLATFORMS);

test("S17.4 - EVERY platform declared in PLATFORMS is wired into all six places", () => {
  const sources = new Set(allAdapters().map((a) => a.source));
  const missing = [];
  for (const k of keys) {
    const p = PLATFORMS[k];
    if (!WEB_PLATFORMS.includes(k)) missing.push(`${k}: thiếu trong WEB_PLATFORMS (nút Quét + cây Nguồn không biết nền này)`);
    if (!sources.has(p.source)) missing.push(`${k}: chưa có adapter cho source '${p.source}' (nguồn chưa đăng ký là VÔ HÌNH trên cây)`);
    if (!CONN.includes(`"${p.source}"`)) missing.push(`${k}: thiếu WEB_LABEL cho '${p.source}' — đúng lỗi làm copilot vắng mặt khỏi /connections`);
    if (!new RegExp(`^\\s{2}${k}: \\[`, "mu").test(BORROW)) missing.push(`${k}: thiếu PLATFORM_HOSTS (đường Mượn không gieo được phiên)`);
    // `null` = khai TƯỜNG MINH "chưa đo tên cookie phiên" (nền hạng CHỈ-NỐI dựng khi không có tài
    // khoản nào để dò). Vẫn BẮT BUỘC có dòng: bỏ trống thì không ai biết là chưa đo hay quên, còn
    // đoán một cái tên thì đã trả giá thật ở `m365copilot` (`%ESTSAUTH%` sai ⇒ khe đang đăng nhập
    // bị báo mất phiên). `jarHasSession` xử `null` bằng nhánh "không kết luận được" sẵn có.
    if (!new RegExp(`^\\s{2}${k}: ("|null,)`, "mu").test(BORROW)) missing.push(`${k}: thiếu SESSION_COOKIE_LIKE (dùng \`null\` nếu CHƯA ĐO — đừng bỏ trống, đừng đoán)`);
    // `\s*` sau dấu mở/phẩy: bảng tên dài ra thì nó xuống dòng, mà khoảng trắng không mang nghĩa
    // trong JS. Bản cũ khớp cứng một dòng nên nền ĐẦU TIÊN của dòng mới bị báo thiếu dù có tên —
    // cổng đo sai thứ nó khai là đang đo (đo ĐỊNH DẠNG thay vì đo SỰ CÓ MẶT).
    if (!new RegExp(`[{,]\\s*${k}:'`, "u").test(FE)) missing.push(`${k}: thiếu TÊN bày ra ⇒ hàng hiện khoá thô`);
  }
  assert.deepEqual(missing, [], "nền khai nửa vời:\n  " + missing.join("\n  "));
});

test("each platform has its own PORT and its own SESSION PREFIX - sharing them mixes two platforms into one slot", () => {
  const ports = keys.map((k) => PLATFORMS[k].port);
  assert.equal(new Set(ports).size, ports.length, `cổng CDP bị trùng: ${ports.join(", ")}`);
  const pre = keys.map((k) => PLATFORMS[k].sessionPrefix);
  assert.equal(new Set(pre).size, pre.length, `tiền tố phiên bị trùng: ${pre.join(", ")}`);
  for (const k of keys) assert.ok(PLATFORMS[k].tabRe instanceof RegExp, `${k}: thiếu tabRe ⇒ eval có thể chạy nhầm tab`);
});

test("the THREE Copilots are THREE separate platforms - none may swallow another", () => {
  for (const k of ["copilot", "mscopilot", "m365copilot"]) assert.ok(PLATFORMS[k], `thiếu nền '${k}'`);
  // Khoá `copilot` PHẢI giữ nghĩa GitHub — đổi nó là làm mất phiên đang có trong `webAuth.copilot`
  // và thư mục `data/browser/copilot` (user đã đăng nhập ZyroFrost ở đó 2026-09-11).
  assert.match(PLATFORMS.copilot.url, /github\.com\/copilot/, "'copilot' phải vẫn là GitHub Copilot");
  assert.match(PLATFORMS.mscopilot.url, /copilot\.microsoft\.com/);
  assert.match(PLATFORMS.m365copilot.url, /m365\.cloud\.microsoft|copilot\.cloud\.microsoft/);
  // `tabRe` không được nới rộng tới cả tên miền mẹ: lỏng là chạy eval trên một tab bất kỳ đang mở.
  assert.doesNotMatch("https://github.com/settings", PLATFORMS.copilot.tabRe, "tabRe GitHub quá lỏng");
  assert.doesNotMatch("https://www.microsoft.com/", PLATFORMS.mscopilot.tabRe, "tabRe Microsoft quá lỏng");
  // Và ba nhãn người đọc phải PHÂN BIỆT được, không để trơ chữ "copilot".
  for (const n of ["GitHub Copilot", "Microsoft Copilot", "Microsoft 365 Copilot"]) {
    assert.ok(FE.includes(n), `thiếu nhãn '${n}'`);
    assert.ok(CONN.includes(n), `thiếu nhãn '${n}' ở WEB_LABEL`);
  }
});

test("the `loginOnly` flag must MATCH the real pull paths - inferred from CODE, not from a list of platform names", () => {
  // Vòng tự kéo bỏ qua nền `loginOnly` (user chốt 2026-09-10: *"chỉ khi t bấm mới nối vào"*).
  // Thiếu cờ ⇒ nhịp nền mở một cửa sổ đăng nhập người dùng không hề yêu cầu. Thừa cờ ⇒ nền ĐÃ dò
  // được đường kéo vẫn dừng sau xác thực, và không ai báo — lỗi câm.
  //
  // 🔄 **Bản trước ghim DANH SÁCH TÊN** (`gemini · copilot · mscopilot · m365copilot` phải
  // `loginOnly`). Nó thối đúng ngày `m365copilot` mở được đường kéo (2026-09-11): cổng bắt đỏ một
  // việc ĐÚNG, và người sửa phải đi sửa cổng — tức cổng đang canh trí nhớ của tác giả, không canh
  // bất biến. Nay đo bằng thứ KHÔNG thể nói dối: nền có `listExpr` là biểu thức GIẢ của hạng
  // chỉ-nối thì phải mang cờ, và ngược lại.
  const STUB = "(async()=>[])()"; // = LOGIN_ONLY_LIST trong scanweb.ts
  const wrong = [];
  for (const k of keys) {
    const p = PLATFORMS[k];
    const stub = p.listExpr === STUB;
    if (stub && p.loginOnly !== true) wrong.push(`${k}: listExpr rỗng mà KHÔNG có cờ loginOnly ⇒ vòng tự kéo sẽ mở cửa sổ vô ích`);
    if (!stub && p.loginOnly) wrong.push(`${k}: đã có listExpr THẬT mà vẫn mang cờ loginOnly ⇒ lượt quét dừng trước khi kéo`);
    // Và `convExpr` phải đi cùng hạng với `listExpr` — một nửa đường kéo là nửa không chạy được.
    if (!stub && p.convExpr("x") === "(async()=>null)()") wrong.push(`${k}: có listExpr thật nhưng convExpr vẫn là bản giả`);
  }
  assert.deepEqual(wrong, [], "cờ loginOnly lệch với đường kéo:\n  " + wrong.join("\n  "));
  // Neo hai đầu để cổng không rỗng nghĩa nếu một ngày mọi nền cùng hạng.
  assert.ok(!PLATFORMS.chatgpt.loginOnly && !PLATFORMS.claude.loginOnly, "chatgpt/claude kéo được từ lâu");
  assert.equal(PLATFORMS.mscopilot.loginOnly, true, "mscopilot chưa ai đăng nhập ⇒ chưa dò được đường kéo");
});

test("M365 Copilot - the pull path must be the MEASURED one, not a guessed one", () => {
  // Ba dữ kiện đo 2026-09-11 trên phiên công ty thật; mỗi cái từng là một cách hỏng im lặng:
  const list = PLATFORMS.m365copilot.listExpr;
  const conv = PLATFORMS.m365copilot.convExpr("ID");
  // ① `Accept: application/json` ở đường CHI TIẾT — thiếu nó, CÙNG URL trả HTML 549 KB và parser
  //    kết luận "hội thoại không có tin nào".
  assert.match(conv, /'Accept':'application\/json'/, "thiếu Accept:json ⇒ nhận HTML thay vì JSON");
  assert.match(conv, /\/chat\/conversation\/ID/, "đường chi tiết phải là /chat/conversation/<id>");
  assert.match(conv, /rawConversationResponse/, "tin nằm ở store.rawConversationResponse.messages");
  // ② Danh sách là HỢP của hai đường (nav pane + trang /chat/all) — mỗi đường một mình đều thiếu.
  assert.match(list, /RefreshNavPane/, "thiếu lời gọi POST /chat action=RefreshNavPane");
  assert.match(list, /\/chat\/all/, "thiếu GET /chat/all");
  // `/chat/all` cũng phải xin JSON: thiếu Accept, nó trả HTML và bộ dò không thấy hội thoại nào —
  // mất một nửa đường liệt kê mà KHÔNG có lỗi nào nổ. (Lỗ này lộ ra lúc chạy đột biến, không phải
  // lúc viết cổng: bản đầu của cổng chỉ canh đường CHI TIẾT.)
  assert.match(list, /'\/chat\/all',\s*\{headers:\{'Accept':'application\/json'\}\}/, "GET /chat/all phải kèm Accept: application/json");
  // ③ Mốc thời gian trả về phải là CHUỖI ISO. `asItem` nhân 1000 cho mọi SỐ (hợp đồng cũ theo
  //    ChatGPT vốn trả giây), mà M365 trả MILI-giây ⇒ trả số thô là đẩy mốc đi ~56.000 năm, và
  //    mọi hội thoại luôn "mới hơn bản đang giữ" ⇒ kéo lại toàn bộ kho mỗi lượt quét.
  assert.match(list, /toISOString\(\)/, "mốc phải là chuỗi ISO, không phải số mili-giây thô");
});

test("M365 - the SIGN-IN check rests on a DATA CALL rather than waiting for the interface to paint", () => {
  // Đo 2026-09-11, lượt chạy THẬT: bản cũ chấm bằng `[role="textbox"]` báo "chưa đăng nhập" trên
  // profile CÓ ĐỦ cookie phiên — SPA của Microsoft cần ~30 s mới dựng ô soạn tin, còn `checkAuth`
  // eval ngay khi trang về đúng origin. **Chưa vẽ ≠ chưa đăng nhập**, nhưng hậu quả giống hệt:
  // lượt kéo dừng và đòi đăng nhập lại một tài khoản đang đăng nhập.
  const auth = PLATFORMS.m365copilot.authExpr;
  assert.match(auth, /RefreshNavPane/, "bằng chứng phiên phải là lời gọi dữ liệu thật");
  // Neo vào phép kiểm PHẢN HỒI, không phải header gửi đi. Bản đầu của cổng này khớp `/content-type/i`
  // và vì vậy **vẫn xanh** khi đột biến thay cả phép kiểm bằng một cú dò DOM — chuỗi `Content-Type`
  // của header POST đủ làm nó hài lòng. Đúng kiểu "cổng phát ra lời bảo đảm mà không canh gì".
  assert.match(auth, /r\.ok && \/json\/i\.test\(r\.headers\.get\('content-type'\)/,
    "phải xét CONTENT-TYPE CỦA PHẢN HỒI — trang đăng nhập trả HTML 200 sẽ lọt nếu chỉ xét status");
  assert.match(auth, /role="textbox"/, "giữ ô soạn tin làm ĐƯỜNG LUI khi khuôn lời gọi đổi");
  // Thứ tự LOAD-BEARING: lời gọi dữ liệu phải đứng TRƯỚC đường lui, không thì ta lại chờ DOM.
  assert.ok(auth.indexOf("RefreshNavPane") < auth.indexOf('role="textbox"'), "lời gọi dữ liệu phải đi trước");
  // Và mã tới trang phải PARSE ĐƯỢC. Bẫy đã trả giá hai lần ở chính file này (regex trong template
  // literal bị JS ăn backslash ⇒ mã tới trang là LỖI CÚ PHÁP ⇒ luôn trả token:false, im lặng).
  assert.doesNotThrow(() => new Function("return " + auth), "authExpr phải là biểu thức hợp lệ");
  for (const k of Object.keys(PLATFORMS)) {
    assert.doesNotThrow(() => new Function("return " + PLATFORMS[k].authExpr), `${k}: authExpr lỗi cú pháp`);
  }
});
