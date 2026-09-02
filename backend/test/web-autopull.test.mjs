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
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
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

test("/connections: BẰNG CHỨNG MỚI NHẤT thắng — so MỐC, không ưu tiên cứng một nguồn", () => {
  const i = CONN.indexOf("const lostAt");
  assert.ok(i > 0, "phải có phép so mốc");
  const blk = CONN.slice(i, i + 600);
  assert.match(blk, /lostAt > checkedAt/, "kéo hỏng chỉ thắng khi nó MỚI HƠN lượt kiểm");
  // Không được ưu tiên cứng: một lượt kiểm vừa chạy xong PHẢI thắng một lượt kéo hỏng hôm kia.
  assert.ok(!/lost = .*pl\.ok === false;?\s*$/m.test(blk), "không được coi 'có pull hỏng' là mất kết nối bất kể mốc");
  assert.match(CONN, /connected: !lost && st\?\.ok === true/, "mất kết nối ⇒ connected phải là false");
});

test("/connections: mất kết nối phải NÓI VIỆC PHẢI LÀM, không bắt đoán", () => {
  assert.match(CONN, /detailCode: lost \? "needLogin"/, "phải có mã riêng để UI dịch được");
  const FE = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  assert.match(FE, /detailCode==='needLogin'/, "UI phải xử mã đó, không rơi về chuỗi thô");
  const DICT = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  const hits = DICT.match(/'conn\.needLogin':/g) || [];
  assert.equal(hits.length, 2, "khoá i18n phải có ĐỦ HAI dict");
});
