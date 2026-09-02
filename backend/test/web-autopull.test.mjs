// TỰ KÉO NỀN WEB — "đã tick = phải vào kho, không vào được = phải BÁO" (user chốt 2026-08-28).
//
// Ba lời hứa, và cả ba đều là thứ hỏng-mà-không-ai-thấy nếu mất:
//   ① Khe tài khoản phải là khe THẬT. Thư mục sao lưu lọt vào danh sách khe ⇒ mỗi lượt kéo mở
//      thêm cửa sổ trình duyệt trỏ vào profile rác. Đo thật 2026-08-28: `accountsOf("claude")`
//      trả 4 khe, hai cái là `…-bak-…`.
//   ② Kéo NGẦM phải thật sự ngầm (cờ dòng lệnh đẩy cửa sổ ra ngoài màn hình) — và KHÔNG được
//      là `--headless`: cả năng lực này sống được nhờ chạy trong trình duyệt THẬT (Cloudflare
//      chặn fetch trần, `plan/07 §5`).
//   ③ Kết cục lượt kéo phải GHI SỔ **kể cả khi hỏng**. Chỉ ghi lúc thành công thì một nguồn
//      chết trông y hệt một nguồn chưa tới lượt — đúng "vỏ rỗng" mà `02_RULES` cấm.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOME = mkdtempSync(join(tmpdir(), "zemory-webpull-"));
process.env.GLOBAL_MEMORY_DB = join(HOME, "global_memory.db");

const { accountsOf, browserArgs } = await import("../../dist/memory/scanweb.js");
const { getWebPull, setWebPull } = await import("../../dist/config/settings.js");
const { deadMainLane, webDue, webPullTargets } = await import("../../dist/jobs/scheduler.js");

// ── ① khe THẬT vs thư mục sao lưu ───────────────────────────────────────────

test("accountsOf: thư mục SAO LƯU không được tính là tài khoản", () => {
  const root = join(HOME, "browser");
  for (const d of [
    "claude",                                 // khe main
    "claude-2",                               // khe thật
    "claude-2.chrome-bak-1786354307845",      // sao lưu (có dấu chấm)
    "claude-2chrome-bak-1786354307845",       // sao lưu MẤT dấu chấm — dạng đã thấy trên đĩa
    "claude-3.msedge-bak-999",                // sao lưu đời cũ
  ]) mkdirSync(join(root, d), { recursive: true });

  const got = accountsOf("claude");
  assert.deepEqual(got.sort(), ["2", "main"], `chỉ khe thật mới được kéo — nhận: ${got.join(" | ")}`);
  // Nói thẳng điều đang canh: mỗi khe thừa = MỘT cửa sổ trình duyệt mở ra vô ích mỗi lượt.
  assert.ok(!got.some((a) => /bak-/i.test(a)), "khe chứa 'bak-' là bản sao lưu, không phải tài khoản");
  assert.ok(!got.some((a) => a.includes(".")), "accountSlot lọc tên còn [A-Za-z0-9_-] ⇒ khe thật không có dấu chấm");
});

// ── ② ngầm là ngầm, và KHÔNG headless ───────────────────────────────────────

test("kéo ngầm: đẩy cửa sổ khuất, và KHÔNG chạy chế độ không-giao-diện", () => {
  // Đo MẢNG THAM SỐ THẬT, không grep file. Bản đầu của ca này soi chữ trên cả nguồn nên
  // báo oan chính đoạn chú thích giải thích vì sao không dùng chế độ đó — đúng bẫy
  // `06_CHANGES [2026-08-27b]` đã ghi ("cổng partition soi CHỮ bắt oan 11 file").
  const hid = browserArgs("/p", 9333, "https://x", true);
  const vis = browserArgs("/p", 9333, "https://x", false);

  assert.ok(hid.includes("--window-position=-32000,-32000"), "ngầm phải đẩy cửa sổ khuất");
  assert.ok(!vis.includes("--window-position=-32000,-32000"), "lượt người dùng bấm thì cửa sổ PHẢI hiện ra để họ đăng nhập");
  assert.ok(
    !hid.some((a) => a.startsWith("--headless")),
    "chế độ không-giao-diện là thứ lớp chống-tự-động-hoá soi đầu tiên; plan/07 đo fetch trần bị chặn 403",
  );
  assert.ok(hid.includes("--new-window") && hid.at(-1) === "https://x", "vẫn là một cửa sổ thật, mở đúng trang");

  // Lượt HIỆN phải mở ĐỦ RỘNG để thấy trọn form đăng nhập (user chụp 2026-09-02: cửa sổ bé xíu).
  assert.ok(vis.includes("--window-size=1200,900"), "cửa sổ đăng nhập phải đủ rộng, không bé xíu");
  assert.ok(!vis.includes("--window-size=1,1"), "kích thước 1×1 chỉ dành cho lượt ngầm");
  assert.ok(hid.includes("--window-size=1,1") && !hid.includes("--window-size=1200,900"), "lượt ngầm thu nhỏ, không mở to");

  const src = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  // Cửa sổ do lượt nền mở PHẢI được đóng — mỗi lượt rò một Chrome ẩn thì sau một ngày là
  // hàng chục tiến trình không ai nhìn thấy để mà báo.
  assert.ok(/closeBrowserTree\(/.test(src), "phải đóng cửa sổ ngầm khi xong");
  assert.ok(/finally\s*\{[\s\S]{0,200}closeBrowserTree/.test(src), "đóng ở `finally` — thân hàm có 8 đường thoát");
});

// ── ③ hỏng là phải BÁO ──────────────────────────────────────────────────────

test("setWebPull ghi sổ CẢ lượt hỏng — không phân biệt được 'chưa chạy' với 'chạy rồi hỏng' là lỗi", () => {
  setWebPull("chatgpt", { ok: true, status: "done", pulled: 12 });
  setWebPull("claude#2", { ok: false, status: "need-login" });

  const all = getWebPull();
  assert.equal(all["chatgpt"].ok, true);
  assert.equal(all["chatgpt"].pulled, 12);
  assert.equal(all["claude#2"].ok, false, "lượt HỎNG phải có mặt trong sổ");
  assert.equal(all["claude#2"].status, "need-login", "phải giữ LÝ DO, không chỉ cờ hỏng");
  assert.ok(Date.parse(all["claude#2"].at) > 0, "phải có dấu thời gian để biết nó cũ tới đâu");

  // Lane chưa chạy lần nào ⇒ VẮNG MẶT, khác hẳn lane đã chạy và hỏng. Đây là phân biệt mà
  // bề mặt cần để nói đúng câu: "chưa tới lượt" vs "đã thử và trượt".
  assert.equal(all["gemini"], undefined);
});

// ── ④ CHỌN LANE: đo HÀNH VI, không grep chữ ─────────────────────────────────
// Bản đầu của bốn ca dưới là grep `scheduler.ts`. Chạy đột biến thì lộ: sửa `dist` mà cổng
// vẫn xanh — nó soi FILE NGUỒN chứ không soi hành vi. Nay đo qua hàm thuần `webPullTargets`.

const SRC = { chatgpt: "chatgpt-web", claude: "claude-web" };
const targets = (excl, pulled, now = Date.parse("2026-08-28T00:00:00Z")) =>
  webPullTargets(["chatgpt", "claude"], () => ["main"], (p) => SRC[p], "MAY-A", excl, pulled, now).map((t) => t.lane);

test("ô KHÔNG tick ⇒ lane đó không được đụng tới (không tốn cả một lần mở trình duyệt)", () => {
  assert.deepEqual(targets([], {}), ["chatgpt", "claude"], "chưa loại gì thì cả hai đều tới lượt");
  assert.deepEqual(targets([{ origin: "web", host: "MAY-A", source: "claude-web" }], {}), ["chatgpt"], "lane bị bỏ tick phải biến mất");
  assert.deepEqual(targets([{ origin: "web" }], {}), [], "bỏ tick cả nhánh Web chat ⇒ không lane nào");
});

test("hỏng thì LÙI LÂU, khoẻ thì hỏi lại thưa — thử lại dày cho thứ cần NGƯỜI đăng nhập là đốt máy", () => {
  const now = Date.parse("2026-08-28T00:00:00Z");
  const at = (h) => new Date(now - h * 3600_000).toISOString();

  // Vừa kéo xong 1 giờ trước ⇒ chưa tới lượt. Mỗi lượt là một lần mở trình duyệt thật.
  assert.deepEqual(targets([], { chatgpt: { at: at(1), ok: true }, claude: { at: at(1), ok: true } }, now), []);
  // Khoẻ nhưng đã lâu ⇒ tới lượt.
  assert.deepEqual(targets([], { chatgpt: { at: at(4), ok: true }, claude: { at: at(1), ok: true } }, now), ["chatgpt"]);
  // HỎNG 1 giờ trước ⇒ vẫn phải lùi, KHÔNG được thử lại theo nhịp của lane khoẻ.
  assert.deepEqual(targets([], { chatgpt: { at: at(4), ok: false }, claude: { at: at(1), ok: true } }, now), [],
    "hỏng thì ngưỡng lùi phải DÀI hơn ngưỡng của lane khoẻ");
  // Lùi đủ lâu ⇒ thử lại (không được bỏ luôn: người dùng có thể đã đăng nhập lại).
  assert.deepEqual(targets([], { chatgpt: { at: at(7), ok: false }, claude: { at: at(1), ok: true } }, now), ["chatgpt"]);
});

test("webDue: chưa chạy lần nào ⇒ tới lượt · dấu thời gian hỏng ⇒ tới lượt (không kẹt vĩnh viễn)", () => {
  assert.equal(webDue(undefined), true);
  assert.equal(webDue({ at: "không-phải-ngày", ok: true }), true, "sổ hỏng không được làm lane câm mãi mãi");
});

// ── ⑤ KHE `main` CHẾT HẲN — dừng vòng tự thử, KHÔNG chỉ lùi (vá 2026-08-31) ─────────────────
// Ca thật: khe `chatgpt` (main) hỏng từ 2026-08-29, 0/0 lần kéo thành công trong suốt log, tự
// mở Brave ẩn mỗi ~6 giờ mãi mãi vì `accountsOf()` CỐ TÌNH luôn liệt kê `main` bất kể lịch sử.
// User: *"app lại tự động gọi browser đăng nhập liên tục là bị gì"*.

test("deadMainLane: need-login + khe SỐ đã phủ (ok:true) ⇒ main coi là CHẾT", () => {
  assert.equal(
    deadMainLane("chatgpt", { chatgpt: { ok: false, status: "need-login" }, "chatgpt#2": { ok: true, status: "done" } }),
    true,
  );
});

test("deadMainLane: BỐN CA ÂM — main còn sống hoặc chưa đủ bằng chứng thì KHÔNG được tắt", () => {
  // main đang khoẻ (đúng ca `claude` thật: cả main lẫn #2 cùng kéo tốt) ⇒ không được đụng.
  assert.equal(deadMainLane("claude", { claude: { ok: true, status: "done" }, "claude#2": { ok: true, status: "done" } }), false);
  // main hỏng nhưng KHÔNG có khe số nào phủ ⇒ vẫn phải tự thử (đây có thể là tài khoản DUY NHẤT).
  assert.equal(deadMainLane("chatgpt", { chatgpt: { ok: false, status: "need-login" } }), false);
  // main hỏng vì lý do THOÁNG QUA (CDP rớt/không thấy tab) — KHÔNG phải "cần người đăng nhập"
  // — lượt sau có thể tự qua, không được quy là chết.
  assert.equal(
    deadMainLane("chatgpt", { chatgpt: { ok: false, status: "no-tab" }, "chatgpt#2": { ok: true, status: "done" } }),
    false,
  );
  // main CHƯA TỪNG chạy (vắng mặt trong sổ) ⇒ chưa có bằng chứng gì để kết luận chết.
  assert.equal(deadMainLane("chatgpt", { "chatgpt#2": { ok: true, status: "done" } }), false);
  // KHÔNG được lẫn NỀN KHÁC: "gpt" hỏng, không có khe số riêng của NÓ — dù trong cùng sổ có
  // một khe SỐ của nền HOÀN TOÀN KHÁC ("other#2") đang khoẻ, đó KHÔNG phải bằng chứng gpt được phủ.
  assert.equal(
    deadMainLane("gpt", { gpt: { ok: false, status: "need-login" }, "other#2": { ok: true, status: "done" } }),
    false,
    "khớp tiền tố lỏng lẻo sẽ đè nhầm khe main của một nền hoàn toàn khác",
  );
});

test("webPullTargets: main CHẾT ⇒ vắng mặt DÙ hỏng rất lâu rồi (nếu còn sống thì chắc chắn tới lượt)", () => {
  const now = Date.parse("2026-08-31T00:00:00Z");
  const at = (h) => new Date(now - h * 3600_000).toISOString();
  const got = webPullTargets(
    ["chatgpt"],
    () => ["main", "2"],
    (p) => SRC[p],
    "MAY-A",
    [],
    {
      chatgpt: { at: at(1000), ok: false, status: "need-login" }, // hỏng 1000h rồi — sống thì CHẮC CHẮN tới lượt
      "chatgpt#2": { at: at(1), ok: true, status: "done" }, // #2 mới kéo 1h trước ⇒ CHƯA tới lượt của riêng nó
    },
    now,
  ).map((t) => t.lane);
  assert.deepEqual(got, [], "main không được lọt qua dù đủ điều kiện thời gian — nó bị loại TRƯỚC bước hỏi webDue");
});

test("webPullTargets: main CHẾT nhưng khe số ĐÃ tới lượt riêng của nó ⇒ khe số vẫn được kéo", () => {
  const now = Date.parse("2026-08-31T00:00:00Z");
  const at = (h) => new Date(now - h * 3600_000).toISOString();
  const got = webPullTargets(
    ["chatgpt"],
    () => ["main", "2"],
    (p) => SRC[p],
    "MAY-A",
    [],
    { chatgpt: { at: at(100), ok: false, status: "need-login" }, "chatgpt#2": { at: at(4), ok: true, status: "done" } },
    now,
  ).map((t) => t.lane);
  assert.deepEqual(got, ["chatgpt#2"], "main không được lẫn vào — CHỈ khe số hợp lệ mới xuất hiện");
});

test("NHƯỜNG THÌ PHẢI HẸN QUAY LẠI — nhịp kéo web không được đợi hết chu kỳ", () => {
  // Lần thứ BA repo trả giá cho hình dạng này (autosync 2,5 giờ 12/08 · sync 19 giờ 28/08 ·
  // và chính `webTick` bản đầu, bắt được trong lượt nghiệm thu đầu tiên). Kẻ chặn ở đây là
  // embed — thứ chạy 30 phút đến 3 giờ và gần như không bao giờ hết backlog.
  const sched = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8");
  const body = sched.slice(sched.indexOf("async function webTick"), sched.indexOf("async function webTick") + 900);
  assert.ok(/webRetry\s*=\s*setTimeout/.test(body), "gặp kẻ ghi khác thì phải HẸN LẠI, không được chỉ `return`");
  const ms = /const WEB_RETRY_MS = (\d+) \* 60_000/.exec(sched);
  assert.ok(ms, "phải khai nhịp hẹn lại");
  const tick = /const WEB_TICK_EVERY_MS = (\d+) \* 60_000/.exec(sched);
  assert.ok(Number(ms[1]) < Number(tick[1]), "hẹn lại phải NGẮN HƠN chu kỳ, không thì hẹn lại vô nghĩa");
});

// ── ④ MÁY KHÔNG ĐƯỢC TỰ BẬT KHUNG ĐĂNG NHẬP (user chốt 2026-09-02) ───────────────────────
// Nguyên văn: *"t đâu có cho phép UI tự động bật đăng nhập đâu… chỉ bật đăng nhập khi user chọn
// thôi chứ ai cho phép tự mở khung đăng nhập"*. Kéo NGẦM là việc máy tự làm được; **bật một khung
// đăng nhập là đòi sự chú ý của người**, và không ai cho phép máy tự làm việc đó.
//
// Cái giá đo được: máy đổi trình duyệt mặc định Brave → Edge ⇒ `borrowCookies` dời cả 4 profile
// sang bên ⇒ **cả 4 khe `need-login` cùng lúc**. Với `WEB_RETRY_AFTER_FAIL_MS` = 6 giờ, mỗi khe
// mở MỘT CỬA SỔ THẬT mỗi 6 tiếng ⇒ 4 cửa sổ / 6 giờ, vô hạn. Log có đúng dấu vết đó (15:58 · 16:01
// · 16:01 · 02:14 · 02:16 · 02:19 · 04:03) và user chụp 3 icon Edge trên taskbar. `deadMainLane`
// không cứu được: nó chỉ dập `main` KHI khe số cùng nền còn sống — ở đây không khe nào sống.
const { needsLoginLane, webPullTargets: wpt2 } = await import("../../dist/jobs/scheduler.js");

test("needsLoginLane: CHỈ đúng khi lượt kéo cuối nói need-login", () => {
  assert.equal(needsLoginLane(undefined), false, "chưa kéo lần nào ⇒ phải được thử");
  assert.equal(needsLoginLane({ ok: true, status: "ok" }), false);
  assert.equal(needsLoginLane({ ok: false, status: "no-browser" }), false, "hỏng vì lý do KHÁC vẫn nên thử lại");
  assert.equal(needsLoginLane({ ok: false, status: "need-login" }), true);
});

test("webPullTargets: khe need-login BỊ LOẠI — máy thôi tự mở cửa sổ đăng nhập", () => {
  const now = Date.parse("2026-09-02T12:00:00Z");
  const old = "2026-09-01T00:00:00Z"; // quá 6 giờ ⇒ `webDue` nói TỚI LƯỢT
  const pulled = {
    claude: { at: old, ok: false, status: "need-login" },
    "claude#2": { at: old, ok: false, status: "need-login" },
  };
  const targets = wpt2(["claude"], () => ["main", "2"], () => "claude-web", "H", [], pulled, now);
  assert.deepEqual(targets, [], "cả hai khe cần đăng nhập ⇒ KHÔNG khe nào được kéo");
});

test("webPullTargets: khe hỏng vì lý do KHÁC vẫn được thử lại (không chặn oan)", () => {
  const now = Date.parse("2026-09-02T12:00:00Z");
  const pulled = { claude: { at: "2026-09-01T00:00:00Z", ok: false, status: "no-browser" } };
  const targets = wpt2(["claude"], () => ["main"], () => "claude-web", "H", [], pulled, now);
  assert.equal(targets.length, 1, "`no-browser` có thể tự khỏi (cài lại trình duyệt) ⇒ vẫn thử");
});

test("webPullTargets: khe LÀNH vẫn kéo bình thường — không chặn cả làng", () => {
  const now = Date.parse("2026-09-02T12:00:00Z");
  const pulled = {
    claude: { at: "2026-09-01T00:00:00Z", ok: false, status: "need-login" },
    "claude#2": { at: "2026-09-01T00:00:00Z", ok: true, status: "ok" },
  };
  const targets = wpt2(["claude"], () => ["main", "2"], () => "claude-web", "H", [], pulled, now);
  assert.deepEqual(targets.map((x) => x.account), ["2"], "chỉ khe cần đăng nhập bị loại");
});

// ── ⑤ BỀ MẶT PHẢI NÓI THẬT: mất kết nối thì hiện MẤT KẾT NỐI ─────────────────────────────
// Nếu chỉ dừng vòng tự kéo (④) mà không sửa chỗ này thì khe CHẾT IM LẶNG: `/connections` đọc
// `webAuth` (kết quả lần KIỂM cuối, có thể nhiều ngày tuổi) chứ không đọc `webPull` (kết quả lần
// KÉO cuối). Đo 2026-09-02: `webAuth` còn `ok:true` từ 29/08 trong khi cả 4 khe `need-login` từ
// 02/09 ⇒ UI báo "đã nối" cho khe đã chết. Đúng thứ `02_RULES` gọi là bề mặt NÓI DỐI — và nguy
// hơn hẳn từ khi máy thôi tự mở cửa sổ, vì không còn gì nhắc người dùng.
const CONN = readFileSync(new URL("../src/memory/connections.ts", import.meta.url), "utf8");

test("/connections: đọc CẢ `webPull`, không chỉ `webAuth`", () => {
  assert.match(CONN, /getWebPull\(\)/, "phải đọc kết quả lần KÉO cuối");
  assert.match(CONN, /getWebAuth\(\)/, "vẫn đọc lần KIỂM cuối");
});

test("/connections: KHÔNG tự phán — uỷ cho hàm chung `webLaneLinked`", () => {
  // Luật "bằng chứng mới nhất thắng" đã dời vào `webLaneLinked` (xem ca ⑥). Cổng này canh phần
  // còn lại của hợp đồng: `connections.ts` phải UỶ chứ không giữ bản sao — giữ bản sao là đúng
  // cách hai bề mặt lệch nhau lần trước.
  assert.match(CONN, /webLaneLinked\(st, pl\)/, "phải uỷ cho hàm chung, truyền cả hai nguồn");
  assert.match(CONN, /connected: !lost && st\?\.ok === true/, "mất kết nối ⇒ connected phải là false");
  assert.ok(!/lostAt > checkedAt/.test(CONN), "không được giữ bản sao của luật so mốc");
});
test("/connections: mất kết nối phải NÓI VIỆC PHẢI LÀM, không bắt đoán", () => {
  assert.match(CONN, /detailCode: lost \? "needLogin"/, "phải có mã riêng để UI dịch được");
  const FE = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  assert.match(FE, /detailCode==='needLogin'/, "UI phải xử mã đó, không rơi về chuỗi thô");
  const DICT = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  const hits = DICT.match(/'conn\.needLogin':/g) || [];
  assert.equal(hits.length, 2, "khoá i18n phải có ĐỦ HAI dict");
});

// ── ⑥ MỘT NGUỒN SỰ THẬT cho "khe này còn nối không" ──────────────────────────────────────
// Trả giá 2026-09-02: hai bề mặt (bảng Liên kết + cây Nguồn) mỗi bên tự đọc `webAuth`. Vá một
// bên, quên bên kia ⇒ hộp chi tiết hiện `Link: linked` NGAY TRÊN `Last pull: need-login`. Chính
// `scope.ts` có sẵn comment *"để hai bề mặt KHÔNG BAO GIỜ nói khác nhau"* — nguồn TRÙNG thì sớm
// muộn cũng lệch, một hàm thì không.
const { webLaneLinked } = await import("../../dist/memory/webslots.js");

test("webLaneLinked: BẰNG CHỨNG MỚI NHẤT thắng, cả hai chiều", () => {
  const older = "2026-09-01T00:00:00Z";
  const newer = "2026-09-02T00:00:00Z";
  assert.equal(webLaneLinked(undefined, undefined), null, "chưa biết gì ⇒ null, KHÁC 'biết là đứt'");
  assert.equal(webLaneLinked({ ok: true, at: newer }, undefined), true);
  // Kéo hỏng MỚI HƠN lượt kiểm ⇒ đứt.
  assert.equal(webLaneLinked({ ok: true, at: older }, { ok: false, status: "need-login", at: newer }), false);
  // Lượt kiểm MỚI HƠN kéo hỏng ⇒ vẫn nối (user vừa đăng nhập lại xong).
  assert.equal(webLaneLinked({ ok: true, at: newer }, { ok: false, status: "need-login", at: older }), true);
  // Hỏng vì lý do KHÁC không phải bằng chứng đứt liên kết.
  assert.equal(webLaneLinked({ ok: true, at: older }, { ok: false, status: "no-browser", at: newer }), true);
});

test("hai bề mặt phải gọi CÙNG hàm — không bên nào tự đọc `webAuth` rồi tự phán", () => {
  const scope = readFileSync(new URL("../src/memory/scope.ts", import.meta.url), "utf8");
  const conn = readFileSync(new URL("../src/memory/connections.ts", import.meta.url), "utf8");
  assert.match(scope, /webLaneLinked\(/, "cây Nguồn phải dùng hàm chung");
  assert.match(conn, /webLaneLinked\(/, "bảng Liên kết phải dùng hàm chung");
  assert.ok(!/const linked = auth \? auth\.ok === true : null;/.test(scope), "scope.ts không được tự phán lại");
  assert.ok(!/lostAt > checkedAt/.test(conn), "connections.ts không được giữ bản sao của luật so mốc");
});

test("nút nối lại KHÔNG hiện trên hàng gộp — hàng cha không biết nối vào khe nào", () => {
  // User: *"link ở đây rồi nó biết link vào đâu"*. Hàng cha gộp nhiều khe con nên `account` của
  // nó rơi về 'main' theo mặc định ⇒ bấm Link ở đó là ÂM THẦM nối khe main dù khe hỏng là khe 2.
  const FE = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const i = FE.indexOf("var act=web&&c.linked===false");
  assert.ok(i > 0, "phải có điều kiện bày hành động");
  const line = FE.slice(i, FE.indexOf("\n", i));
  assert.match(line, /!c\.kids/, "hàng gộp (có kids) KHÔNG được bày nút nối lại");
  // Và phải chỉ đường: mở nhóm ra, bấm đúng tài khoản hỏng.
  assert.match(FE, /scope\.detPickAcct/, "hàng cha phải nói rõ phải bấm vào đâu");
  const DICT = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  assert.equal((DICT.match(/'scope\.detPickAcct':/g) || []).length, 2, "khoá i18n đủ HAI dict");
});

// ── ⑦ CỬA SỔ NGƯỜI CẦN THẤY PHẢI BUNG RA TRƯỚC MẶT ───────────────────────────────────────
// User bắt 2026-09-02: *"bấm vào link nó mở web mà nó ko tự bung ra trước mặt thì sao mà thấy"*.
// Cửa sổ mở sau lưng app thì việc "mở cửa sổ để bạn đăng nhập" coi như không xảy ra.
//
// ⚠ Bản đầu tôi dùng `WScript.Shell.AppActivate(pid)` và **đo ra KHÔNG ĂN**: Chromium tự sinh cây
// tiến trình nên pid ta `spawn` thường KHÔNG sở hữu cửa sổ — vòng chờ 6 giây không bao giờ thấy
// `MainWindowHandle`. Đường đúng là bảo CHÍNH trình duyệt tự nâng: `Page.bringToFront` của CDP
// nâng cả tab lẫn cửa sổ, không phụ thuộc pid, không đụng khoá tiền cảnh của Windows.
const SW2 = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");

test("bringToFront đi qua CDP `Page.bringToFront`, KHÔNG qua pid", () => {
  assert.match(SW2, /Page\.bringToFront/, "phải dùng lệnh CDP");
  // Bỏ COMMENT trước khi soi: chữ `AppActivate` vẫn còn trong chú thích giải thích VÌ SAO nó
  // không ăn — cấm cả chú thích là bắt oan, và là đúng bẫy "soi CHỮ" mà `audit` đã ghi.
  const code = SW2.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/AppActivate/.test(code), "AppActivate theo pid đã đo là KHÔNG ăn — không được quay lại");
});

test("chỉ nâng cửa sổ cho lượt NGƯỜI bấm, tuyệt đối không cho lượt ngầm", () => {
  const i = SW2.indexOf("await first.bringToFront()");
  assert.ok(i > 0, "phải gọi sau khi CDP nối được");
  const line = SW2.slice(SW2.lastIndexOf("\n", i - 1), i + 40);
  assert.match(line, /!opts\.hidden/, "lượt ngầm mà nhảy ra trước mặt là đúng lỗi vừa sửa ở ④");
});

test("nâng SAU khi CDP nối được — nâng sớm là nâng vào hư không", () => {
  const iConn = SW2.indexOf('if (!first) return { status: "no-tab"');
  const iFront = SW2.indexOf("await first.bringToFront()");
  assert.ok(iConn > 0 && iFront > iConn, "phải nằm sau chốt `!first` (lúc đó cửa sổ chắc chắn có thật)");
});

// ── ⑧ MƯỢN COOKIE: Brave phải nằm trong nguồn, và KHOÁ ≠ KHÔNG CÓ ────────────────────────
// User bắt 2026-09-02: *"vẫn chưa fix được việc mở browser đó thì lấy chính cookie web đã có"*.
// Đo ra hai lỗ: ① `cookieSources()` chỉ có Chrome + Edge trong khi **trình duyệt mặc định của máy
// là Brave** — và chính zemory cũng mở Brave (log `opening … in brave.exe`) ⇒ phiên thật nằm ở
// Brave mà bộ mượn không bao giờ nhìn tới · ② Chromium giữ khoá độc quyền kho cookie khi đang
// chạy (đo: đọc thẳng ném `unable to open database file`, `copyFileSync` ném **EBUSY**) và bản cũ
// NUỐT lỗi đó rồi báo "không có trình duyệt nào còn phiên" — sai, và không chỉ được việc phải làm.
const BC = readFileSync(new URL("../src/memory/borrowcookies.ts", import.meta.url), "utf8");

test("cookieSources: có Brave — trình duyệt mặc định của máy và là thứ zemory tự mở", () => {
  assert.match(BC, /key: "brave"/, "thiếu Brave thì phiên thật không bao giờ mượn được");
  assert.match(BC, /BraveSoftware/, "phải trỏ đúng thư mục User Data của Brave");
  for (const k of ["chrome", "edge"]) assert.match(BC, new RegExp(`key: "${k}"`), `không được bỏ ${k}`);
});

test("KHOÁ ≠ KHÔNG CÓ: hai câu hỏi ⇒ hai hàm, không nhồi cờ ngầm vào một kiểu trả về", () => {
  assert.match(BC, /export function borrowBlockedBy/, "phải có hàm trả lời 'đang bị khoá bởi ai'");
  // `findBorrowSource` bị nhồi một object 'khoá' sẽ lặng lẽ thành `canBorrow: true` ở nơi gọi
  // (`Boolean(findBorrowSource(...))`) ⇒ UI mời "Mượn" rồi thất bại.
  // ⚠ Bỏ COMMENT trước khi soi. Đây là LẦN THỨ HAI trong cùng phiên tôi mắc lỗi này (lần đầu:
  // cấm chuỗi `AppActivate`): phép soi CHỮ trên cả file luôn bắt oan chính chú thích giải thích
  // VÌ SAO không dùng thứ đó. Chú thích là nơi ĐÚNG để giữ lý do; cấm nó là phạt việc ghi lại.
  const bcCode = BC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\*.*$/gm, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/cookies: -1/.test(bcCode), "không được dùng giá trị đặc biệt làm cờ ngầm");
  const i = BC.indexOf("export function findBorrowSource");
  const fn = BC.slice(i, BC.indexOf("\n}", i));
  assert.ok(!/label: locked/.test(fn), "findBorrowSource chỉ trả nguồn ĐỌC ĐƯỢC");
});

test("bị khoá thì phải NÓI VIỆC PHẢI LÀM, không im", () => {
  const CONN = readFileSync(new URL("../src/memory/connections.ts", import.meta.url), "utf8");
  assert.match(CONN, /borrowBlocked: borrowBlockedBy\(/, "server phải bày lý do ra hàng");
  const FE = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  assert.match(FE, /c\.borrowBlocked/, "UI phải hiện nó");
  const DICT = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  assert.equal((DICT.match(/'conn\.borrowBlocked':/g) || []).length, 2, "khoá i18n đủ HAI dict");
});

// ── ⑨ "CÓ COOKIE" ≠ "CÓ PHIÊN" — mượn phải nhìn TOKEN PHIÊN, không đếm cookie ────────────
// User dính 2026-09-02: Chrome còn ĐÚNG MỘT cookie chatgpt.com lạc lại ⇒ UI mời "Mượn từ
// Chrome" trong khi phiên thật nằm ở Brave đang khoá — mượn xong profile vẫn chưa đăng nhập,
// ChatGPT đá sang Google OAuth và người dùng nhìn một form trắng trơn hỏi "tài khoản cũ đâu".
// Luật mới: nguồn chỉ được MỜI khi jar có cookie PHIÊN (soi TÊN — `__Secure-next-auth.
// session-token*` · `sessionKey` — không bao giờ đọc giá trị). Ca chạy THẬT trên jar giả,
// không soi chữ.
const { borrowCookies, findBorrowSource } = await import("../../dist/memory/borrowcookies.js");
const Database = (await import("better-sqlite3")).default;
const onWin = process.platform === "win32";

/** Một "trình duyệt" giả: User Data + Local State + jar cookie với đúng các hàng cho trước. */
function fakeSource(root, key, rows) {
  const userData = join(root, key, "User Data");
  mkdirSync(join(userData, "Default", "Network"), { recursive: true });
  writeFileSync(join(userData, "Local State"), "{}", "utf8");
  const db = new Database(join(userData, "Default", "Network", "Cookies"));
  db.exec("CREATE TABLE cookies (host_key TEXT, name TEXT, value TEXT)");
  const ins = db.prepare("INSERT INTO cookies (host_key, name, value) VALUES (?,?,?)");
  for (const [host, name] of rows) ins.run(host, name, "x");
  db.close();
  return { key, label: key, userData, exe: join(root, `${key}.exe`) };
}

test("findBorrowSource: nguồn chỉ có cookie RÁC bị NHẢY QUA; nguồn có token phiên mới được mời", { skip: !onWin }, () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-jar-"));
  const junk = fakeSource(root, "chromejunk", [["chatgpt.com", "oai-did"]]);
  const live = fakeSource(root, "bravelive", [
    ["chatgpt.com", "oai-did"],
    ["chatgpt.com", "__Secure-next-auth.session-token"],
  ]);
  const got = findBorrowSource("chatgpt", [junk, live]);
  assert.ok(got, "nguồn có token phiên phải được mời");
  assert.equal(got.from, "bravelive", "nguồn rác đứng TRƯỚC không được thắng chỉ vì đứng trước — đúng ca Chrome-1-cookie");
  assert.equal(findBorrowSource("chatgpt", [junk]), null, "chỉ còn nguồn rác ⇒ KHÔNG mời — mời là đưa người dùng vào form đăng nhập trắng");
});

test("token phiên CHUNKED (…session-token.0) và sessionKey của claude đều được nhận", { skip: !onWin }, () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-jar-"));
  const chunked = fakeSource(root, "edgechunk", [["chatgpt.com", "__Secure-next-auth.session-token.0"]]);
  assert.equal(findBorrowSource("chatgpt", [chunked])?.from, "edgechunk", "NextAuth cắt token dài thành .0/.1 — vẫn là phiên");
  const claudeJunk = fakeSource(root, "cjunk", [["claude.ai", "cf_clearance"]]);
  const claudeLive = fakeSource(root, "clive", [["claude.ai", "sessionKey"]]);
  assert.equal(findBorrowSource("claude", [claudeJunk]), null, "cf_clearance là cookie Cloudflare, không phải phiên");
  assert.equal(findBorrowSource("claude", [claudeJunk, claudeLive])?.from, "clive");
});

test("borrowCookies: nguồn không có phiên ⇒ TỪ CHỐI kèm lý do thật; nguồn có phiên ⇒ mượn + prune đúng host", { skip: !onWin }, () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-jar-"));
  const junk = fakeSource(root, "chromejunk", [["chatgpt.com", "oai-did"]]);
  const no = borrowCookies({ platform: "chatgpt", from: "chromejunk", sources: [junk], browserRoot: join(root, "zb1") });
  assert.equal(no.ok, false, "mượn jar không phiên là mượn về một profile chưa-đăng-nhập");
  assert.match(no.error, /no live session/, "câu lỗi phải nói thẳng 'chưa có phiên', không phải một lỗi mơ hồ về sau");

  const live = fakeSource(root, "bravelive", [
    ["chatgpt.com", "__Secure-next-auth.session-token"],
    ["chatgpt.com", "oai-did"],
    ["example.com", "tracker"],
  ]);
  const ok = borrowCookies({ platform: "chatgpt", from: "bravelive", sources: [live], browserRoot: join(root, "zb2") });
  assert.equal(ok.ok, true, ok.error ?? "");
  assert.equal(ok.kept, 2, "giữ đúng cookie của nền");
  assert.equal(ok.dropped, 1, "cookie site khác phải bị vứt — mượn MỘT site, không mượn cả jar");
});

test("SSO-only: nền hết phiên nhưng CÒN đăng nhập Google ⇒ vẫn mượn được để login hiện account chooser", { skip: !onWin }, () => {
  // User chốt 2026-09-02 ("Có — chép cả phiên SSO"). Chatgpt.com hết phiên, nhưng Google còn
  // ⇒ mượn để OAuth hiện sẵn tài khoản, một cú bấm thay vì gõ email.
  const root = mkdtempSync(join(tmpdir(), "zemory-sso-"));
  const ssoOnly = fakeSource(root, "bravesso", [
    ["chatgpt.com", "oai-did"], // KHÔNG có token phiên chatgpt
    ["accounts.google.com", "__Secure-1PSID"], // nhưng CÓ phiên Google
  ]);
  assert.equal(findBorrowSource("chatgpt", [ssoOnly])?.from, "bravesso", "còn Google là còn mượn được");
  const r = borrowCookies({ platform: "chatgpt", from: "bravesso", sources: [ssoOnly], browserRoot: join(root, "zb3") });
  assert.equal(r.ok, true, r.error ?? "");
  const db = new Database(join(root, "zb3", "chatgpt", "Default", "Network", "Cookies"), { readonly: true });
  const hosts = db.prepare("SELECT DISTINCT host_key FROM cookies").all().map((x) => x.host_key).sort();
  db.close();
  assert.ok(hosts.includes("accounts.google.com"), "cookie Google phải theo về để account chooser hiện");

  // Không phiên NÀO (chatgpt lẫn Google đều rác) ⇒ vẫn từ chối, không đẻ profile chết.
  const dead = fakeSource(root, "bravedead", [["chatgpt.com", "oai-did"], ["accounts.google.com", "NID"]]);
  assert.equal(findBorrowSource("chatgpt", [dead]), null, "cookie Google rác (không phải __Secure-1PSID) không tính là phiên");
});

// ── ⑪ PHIÊN NỀN phải THẮNG phiên SSO, và câu "đóng trình duyệt" không được bị che ────────
// Đo trên máy thật 2026-09-02 NGAY SAU khi ship vế SSO: `chrome` chỉ có phiên Google (0 phiên
// ChatGPT) mà vẫn THẮNG `brave` đang giữ phiên nền thật, vì vòng quét trả về nguồn qualify ĐẦU
// TIÊN và thứ tự cứng là chrome→edge→brave. Hệ quả kép: bề mặt mời đường YẾU HƠN (còn phải bấm
// qua trang OAuth) VÀ `borrowBlocked` bị che nên mất luôn câu chỉ việc "đóng Brave để vào thẳng".
test("findBorrowSource: nguồn có PHIÊN NỀN thắng nguồn chỉ có SSO, dù SSO đứng TRƯỚC trong danh sách", { skip: !onWin }, () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-rank-"));
  const ssoFirst = fakeSource(root, "chromesso", [["accounts.google.com", "__Secure-1PSID"]]);
  const platLater = fakeSource(root, "bravereal", [["chatgpt.com", "__Secure-next-auth.session-token"]]);

  const got = findBorrowSource("chatgpt", [ssoFirst, platLater]);
  assert.equal(got.from, "bravereal", "phiên nền cho đăng nhập THẲNG — phải thắng dù đứng sau");
  assert.equal(got.via, "platform", "và phải tự khai là đường mạnh");

  // Ca ÂM: không có nguồn nền nào ⇒ mới được rơi về SSO, và phải tự khai là đường yếu.
  const only = findBorrowSource("chatgpt", [ssoFirst]);
  assert.equal(only.from, "chromesso");
  assert.equal(only.via, "sso", "đường lùi phải nói rõ nó chỉ là SSO — nơi gọi dựa vào đó để chọn câu");
});

test("/connections: đường mượn chỉ-SSO KHÔNG được che câu 'đóng trình duyệt'; đường phiên nền thì được", () => {
  const CONN = readFileSync(new URL("../src/memory/connections.ts", import.meta.url), "utf8");
  // Chốt canh ĐÚNG cơ chế: chỉ `via === "platform"` mới được phép che hint.
  assert.match(CONN, /borrow\?\.via !== "platform"/, "chỉ đường mượn MẠNH mới được che chỉ dẫn đóng trình duyệt");
  // Và chỉ gọi findBorrowSource MỘT lần cho mỗi hàng (hai lời gọi có thể trả khác nhau ⇒ hàng tự mâu thuẫn).
  const body = CONN.slice(CONN.indexOf("for (const acct of browserAccounts("), CONN.indexOf("// Local: nối ="));
  assert.equal((body.match(/findBorrowSource\(/g) || []).length, 1, "một hàng = một lời gọi dò nguồn");
});

test("chữ người dùng đọc: {b} phải được thay HẾT, và có câu riêng cho ca chỉ-SSO (đủ hai dict)", () => {
  const FE = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  // `.replace('{b}', x)` của JS chỉ thay chỗ ĐẦU — mà câu này có {b} hai lần ⇒ lòi placeholder ra UI.
  assert.ok(!/t\('conn\.borrowBlocked'\)\.replace\('\{b\}'/.test(FE), "thay-một-lần là bug: câu có {b} hai lần");
  assert.match(FE, /replace\(\/\\\{b\\\}\/g/, "phải thay TOÀN BỘ chỗ giữ chỗ");
  assert.match(FE, /c\.canBorrow\?'conn\.borrowSsoOnly':'conn\.borrowBlocked'/, "còn nút Mượn thì phải dùng câu chỉ-SSO");

  const DICT = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["conn.borrowBlocked", "conn.borrowSsoOnly"]) {
    assert.equal((DICT.match(new RegExp("'" + k.replace(".", "\\.") + "':", "g")) || []).length, 2, `${k} phải có ĐỦ HAI dict`);
  }
  // Không chuỗi nào được để lại {b} chưa thay vì thiếu đối số — cả hai câu đều PHẢI mang {b}.
  for (const m of DICT.matchAll(/'conn\.borrowSsoOnly':'([^']*)'/g)) {
    assert.ok(m[1].includes("{b}"), "câu chỉ-SSO phải nêu TÊN trình duyệt đang khoá, không nói chung chung");
  }
});

// ── ⑩ ĐỔI HÃNG KHỨ HỒI: bản dời-sang-bên phải TRẢ VỀ được ────────────────────────────────
// User chốt 2026-09-02 (*"phải mở lên nhận được dù có đang mở brave"*). Đo 01–02/09: Windows đổi
// mặc định Brave → Edge → Brave trong MỘT ngày; mỗi cú đổi, luật "máy mặc định thắng" dời profile
// sang bên và tạo mới tinh ⇒ 4 khe mất phiên hai lần dù MỌI bản dời còn nguyên trên đĩa. Đối xứng
// còn thiếu: quay về hãng cũ thì trả bản bak mới nhất CÓ PHIÊN của đúng hãng đó về làm profile sống.
const { restoreShelvedSession } = await import("../../dist/memory/scanweb.js");
const { jarHasSession } = await import("../../dist/memory/borrowcookies.js");

/** Profile zemory giả: jar cookie với đúng các hàng cho trước. */
function profileJar(dir, rows) {
  mkdirSync(join(dir, "Default", "Network"), { recursive: true });
  const db = new Database(join(dir, "Default", "Network", "Cookies"));
  db.exec("CREATE TABLE cookies (host_key TEXT, name TEXT, value TEXT)");
  const ins = db.prepare("INSERT INTO cookies (host_key, name, value) VALUES (?,?,'x')");
  for (const [host, name] of rows) ins.run(host, name);
  db.close();
}
const jarOf = (dir) => join(dir, "Default", "Network", "Cookies");

test("khôi phục: bản bak CÙNG HÃNG mới nhất CÓ PHIÊN được trả về; vỏ rỗng mới hơn bị bỏ qua", () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-restore-"));
  const live = join(root, "chatgpt");
  profileJar(live, [["chatgpt.com", "oai-did"]]); // vỏ: có cookie rác, KHÔNG có phiên
  profileJar(join(root, "chatgpt.brave-bak-111"), [["chatgpt.com", "__Secure-next-auth.session-token"]]);
  profileJar(join(root, "chatgpt.brave-bak-222"), [["chatgpt.com", "oai-did"]]); // vỏ MỚI HƠN — bẫy

  assert.equal(restoreShelvedSession(live, "C:\\x\\brave.exe", "chatgpt"), true);
  assert.equal(jarHasSession(jarOf(live), "chatgpt"), true, "profile sống phải mang phiên từ bản bak về");
  const baks = readdirSync(root).filter((n) => /brave-bak-/.test(n));
  assert.equal(baks.length, 2, `vỏ 222 giữ nguyên + vỏ sống cũ được dời sang bên (không xoá gì): ${baks.join(" | ")}`);
  assert.ok(baks.includes("chatgpt.brave-bak-222"), "vỏ rỗng không được lấy làm phiên — đổi vỏ lấy vỏ là vô nghĩa");
});

test("khôi phục KHÔNG nổ khi: profile sống ĐANG có phiên · bak khác hãng (ABE) · không có bak", () => {
  const root = mkdtempSync(join(tmpdir(), "zemory-restore-"));
  const live = join(root, "chatgpt");
  profileJar(live, [["chatgpt.com", "__Secure-next-auth.session-token"], ["chatgpt.com", "keep-me"]]);
  profileJar(join(root, "chatgpt.brave-bak-111"), [["chatgpt.com", "__Secure-next-auth.session-token"]]);
  assert.equal(restoreShelvedSession(live, "C:\\x\\brave.exe", "chatgpt"), false, "có phiên rồi thì TUYỆT ĐỐI không đụng");
  const db = new Database(jarOf(live), { readonly: true });
  const n = db.prepare("SELECT COUNT(1) n FROM cookies WHERE name='keep-me'").get().n;
  db.close();
  assert.equal(n, 1, "jar sống phải còn nguyên");

  const live2 = join(root, "claude");
  profileJar(live2, [["claude.ai", "cf_clearance"]]);
  profileJar(join(root, "claude.msedge-bak-111"), [["claude.ai", "sessionKey"]]);
  assert.equal(restoreShelvedSession(live2, "C:\\x\\brave.exe", "claude"), false, "cookie hãng khác không giải mã được (ABE) — không trả về");

  const live3 = join(root, "chatgpt-2");
  profileJar(live3, [["chatgpt.com", "oai-did"]]);
  assert.equal(restoreShelvedSession(live3, "C:\\x\\brave.exe", "chatgpt"), false, "không có bak thì thôi, không ném");
});

test("khôi phục được NỐI vào cả hai đường spawn — thiếu một đường là lỗ đúng nửa số lượt mở", () => {
  const sw = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  const wired = (sw.match(/restoreShelvedSession\(profileDir, exe, p\.key/g) || []).length;
  assert.equal(wired, 2, "cả nhánh relaunch lẫn nhánh mở-lạnh đều phải gọi khôi phục");
});
