// Web-capture platform contracts (`scanweb.ts`) + the re-login loop.
//
// Vì sao gate này tồn tại: ba lỗ của bản trước đều KHÔNG bị bất kỳ test nào chạm.
//   ① `o[0]` làm org — tài khoản này có HAI org (`chat` và `api`), lấy theo thứ tự thì
//      máy khác rơi vào org rỗng và biểu hiện y như "chưa đăng nhập".
//   ② khoá resume hardcode `chatgpt-` trong khi adapter claude ghi `claudeweb-…` ⇒
//      resume chết lặng, mỗi lần chạy kéo lại toàn bộ tài khoản.
//   ③ phiên hết hạn GIỮA run bị đếm thành `failed`, không ai hỏi lại người dùng.
//
// Cách kiểm: các expr là CHUỖI JS chạy trong trang, nên ở đây chạy THẬT chúng bằng
// `new Function` với `fetch` giả. Tức là test đúng đoạn mã sẽ ship, không phải grep chữ.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PLATFORMS, awaitLogin, orderByProgId } from "../../dist/memory/scanweb.js";
import { chatgptAdapter } from "../../dist/memory/adapters/chatgpt.js";
import { claudeWebAdapter } from "../../dist/memory/adapters/claudeweb.js";
import { tempDir, readAppJs } from "./helpers.mjs";

/** Chạy một expr in-page với fetch giả. Trả cả kết quả lẫn danh sách URL đã gọi. */
function runExpr(expr, routes) {
  const calls = [];
  const fetchStub = async (url) => {
    calls.push(url);
    for (const [re, handler] of routes) {
      if (re.test(url)) return handler(url);
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const value = new Function("fetch", `return (${expr});`)(fetchStub);
  return Promise.resolve(value).then((v) => ({ value: v, calls }));
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const httpErr = (status) => ({ ok: false, status, json: async () => ({}) });

// Hình dạng THẬT đo được 2026-07-30 — org chat ĐỨNG SAU org api để bắt lỗi `o[0]`.
const ORGS = [
  { uuid: "org-api", name: "Individual Org", capabilities: ["api", "api_individual"] },
  { uuid: "org-chat", name: "Work Org", capabilities: ["chat", "claude_max"] },
];
const orgRoute = (list = ORGS) => [/\/api\/organizations$/, () => ok(list)];

// ── ① chọn org theo CAPABILITY ────────────────────────────────────────────────

test("claude auth: chọn org theo caps 'chat', KHÔNG theo thứ tự mảng", async () => {
  const { value } = await runExpr(PLATFORMS.claude.authExpr, [orgRoute()]);
  assert.equal(value.token, true);
  // Không có endpoint account ⇒ rơi về tên org, và PHẢI nói rõ đó là org (tiền tố) — bản cũ trả
  // trần "Work Org" nên hàng nguồn ghi tên org như thể là tài khoản (user bắt 2026-08-28).
  assert.equal(value.email, "org: Work Org", "phải là org có caps 'chat', không phải org đầu tiên — và ghi rõ là org");
});

test("claude auth: có /api/account ⇒ TÀI KHOẢN (email) thắng tên org", async () => {
  // Đây là thứ hàng nguồn phải ghi: *"cái nào liên kết tk web thì ghi luôn tk đó"*. Tên org
  // ("zyrofrost@gmail.com's Organization" · "Global") không phải tài khoản.
  const { value, calls } = await runExpr(PLATFORMS.claude.authExpr, [
    orgRoute(),
    [/\/api\/account$/, () => ok({ email_address: "huy@example.com" })],
  ]);
  assert.equal(value.token, true);
  assert.equal(value.email, "huy@example.com");
  assert.ok(calls.some((u) => u.includes("/api/account")), "phải hỏi endpoint account");
  // Đường lùi thứ hai: `/api/bootstrap` bọc account trong `account`.
  const boot = await runExpr(PLATFORMS.claude.authExpr, [
    orgRoute(),
    [/\/api\/bootstrap$/, () => ok({ account: { email_address: "boot@example.com" } })],
  ]);
  assert.equal(boot.value.email, "boot@example.com");
});

test("claude list + conv: URL mang uuid của org 'chat'", async () => {
  const list = await runExpr(PLATFORMS.claude.listExpr, [
    orgRoute(),
    [/chat_conversations/, () => ok([{ uuid: "c1" }])],
  ]);
  assert.ok(
    list.calls.some((u) => u.includes("/org-chat/chat_conversations")),
    `phải gọi org-chat, đã gọi: ${list.calls.join(" · ")}`,
  );
  assert.ok(!list.calls.some((u) => u.includes("org-api")), "KHÔNG được gọi org caps 'api'");

  const conv = await runExpr(PLATFORMS.claude.convExpr("c1"), [
    orgRoute(),
    [/chat_conversations\/c1/, () => ok({ uuid: "c1", chat_messages: [] })],
  ]);
  assert.ok(conv.calls.some((u) => u.includes("/org-chat/chat_conversations/c1")));
  assert.ok(conv.calls.some((u) => u.includes("tree=True")), "phải giữ tham số tree=True");
});

test("claude auth: có caps mà KHÔNG org nào có 'chat' ⇒ báo lỗi rõ, không im lặng dùng org sai", async () => {
  const { value } = await runExpr(PLATFORMS.claude.authExpr, [orgRoute([ORGS[0]])]);
  assert.equal(value.token, false);
  assert.match(String(value.err), /chat capability/i, "câu lỗi phải chỉ ra vấn đề là capability");
});

test("claude auth: shape không khai capabilities ⇒ rơi về org đầu (không phá tài khoản lạ)", async () => {
  const { value } = await runExpr(PLATFORMS.claude.authExpr, [orgRoute([{ uuid: "solo", name: "Solo" }])]);
  assert.equal(value.token, true);
  assert.equal(value.email, "org: Solo", "không có account endpoint ⇒ tên org, ghi rõ là org");
});

test("claude auth: chưa đăng nhập (401) ⇒ token=false", async () => {
  const { value } = await runExpr(PLATFORMS.claude.authExpr, [[/\/api\/organizations$/, () => httpErr(401)]]);
  assert.equal(value.token, false);
  assert.match(String(value.err), /401/);
});

// ── danh sách phẳng của claude.ai CHỞ LUÔN chat trong Project ─────────────────
// Đo 2026-07-30 (hai đường: field `project_uuid` + so tập id với
// `…/projects/<pid>/conversations` ⇒ 0 id thiếu). Đây là lý do claude KHÔNG cần
// `projectConvsExpr`; test khoá lại để không ai "vá" bằng một vòng enumerate vô ích.

test("claude list: KHÔNG bỏ chat có project_uuid, và chở theo mốc cập nhật", async () => {
  const { value } = await runExpr(PLATFORMS.claude.listExpr, [
    orgRoute(),
    [
      /chat_conversations/,
      () => ok([{ uuid: "in-project", project_uuid: "p1", updated_at: "2026-07-30T10:00:00Z" }, { uuid: "loose", project_uuid: null, updated_at: "2026-07-29T10:00:00Z" }]),
    ],
  ]);
  assert.deepEqual(value.map((v) => v.id), ["in-project", "loose"]);
  // Mốc này là thứ quyết định "hội thoại cũ có tin mới thì kéo lại" — thiếu nó thì mọi
  // lần quét đều báo +0 dù người dùng vừa chat thêm (đo 2026-07-30: 5/25 hội thoại).
  assert.ok(value.every((v) => typeof v.updated === "string"), "mỗi mục phải mang mốc cập nhật của nền");
});

test("claude list: phân trang theo offset cho tới trang ngắn (không tin trường tổng)", async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ uuid: "a" + i }));
  const { value } = await runExpr(PLATFORMS.claude.listExpr, [
    orgRoute(),
    [
      /chat_conversations/,
      (url) => ok(/offset=0/.test(url) ? page1 : [{ uuid: "tail1" }, { uuid: "tail2" }]),
    ],
  ]);
  assert.equal(value.length, 102, "phải lấy hết cả trang 2, không dừng ở trang đầu");
  assert.equal(value.at(-1).id, "tail2");
});

// Bug đo 2026-07-30: resume bỏ qua theo "id đã biết" ⇒ hội thoại CŨ mà chat thêm thì
// không bao giờ được kéo lại, mọi lần quét đều "+0 tin mới". 5/25 hội thoại mới nhất của
// tài khoản thật đang ở tình trạng đó.
test("quyết định bỏ qua phải dựa trên MỐC CẬP NHẬT, không phải 'đã biết id'", () => {
  const src = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  assert.ok(!/if \(have\.has\(sid\)\) \{\s*\n\s*skipped\+\+;/.test(src), "không được bỏ qua chỉ vì đã biết id");
  assert.ok(/ids\[i\]\.at <= held/.test(src), "phải so mốc trên nền với mốc đang giữ");
  assert.ok(/_pulled\.json/.test(src), "và ghi lại mốc đã kéo, không thì lần nào cũng kéo thừa vì lệch vài phút");
  assert.ok(/pulledAt\[ids\[i\]\.id\] = ids\[i\]\.at/.test(src), "mốc phải được GHI sau khi kéo — khai tên file thôi thì sổ luôn rỗng");
  assert.ok(/writeFileSync\(pulledFile,/.test(src), "và sổ phải lưu xuống đĩa cùng nhịp ingest");
  for (const expr of [PLATFORMS.chatgpt.listExpr, PLATFORMS.claude.listExpr]) {
    assert.ok(/updated:/.test(expr), "mọi nền phải chở mốc cập nhật trong danh sách");
  }
});

// ── nhãn Project ─────────────────────────────────────────────────────────────

test("claude projects: map uuid→tên", async () => {
  const { value } = await runExpr(PLATFORMS.claude.projectsExpr, [
    orgRoute(),
    [/\/projects\?/, () => ok([{ uuid: "p1", name: "VU-Project" }])],
  ]);
  assert.deepEqual(value, { p1: "VU-Project" });
});

test("claude projects: server BỎ QUA offset ⇒ vẫn dừng, không quay vô hạn", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ uuid: "p" + i, name: "P" + i }));
  const { value, calls } = await runExpr(PLATFORMS.claude.projectsExpr, [
    orgRoute(),
    [/\/projects\?/, () => ok(full)], // luôn trả cùng một trang
  ]);
  assert.equal(Object.keys(value).length, 100);
  assert.ok(calls.filter((u) => u.includes("/projects?")).length <= 3, `phải dừng sớm, đã gọi ${calls.length} lần`);
});

test("projectKeyOf: chatgpt đọc gizmo_id · claude đọc project_uuid", () => {
  assert.equal(PLATFORMS.chatgpt.projectKeyOf({ gizmo_id: "g-p-1" }), "g-p-1");
  assert.equal(PLATFORMS.chatgpt.projectKeyOf({ conversation_template_id: "g-p-2" }), "g-p-2", "đường lui của ChatGPT");
  assert.equal(PLATFORMS.claude.projectKeyOf({ project_uuid: "p1" }), "p1");
  assert.equal(PLATFORMS.claude.projectKeyOf({ gizmo_id: "g-p-1" }), undefined, "claude KHÔNG có gizmo_id");
  assert.equal(PLATFORMS.claude.projectKeyOf({ project_uuid: "  " }), undefined, "chuỗi trắng không phải nhãn");
});

// ── ② khoá resume phải khớp id mà ADAPTER thật sinh ra ───────────────────────
// Đây là phép so PARITY (chạy adapter rồi đối chiếu), không phải chép lại hằng số —
// chép hằng số thì hai bên vẫn lệch được mà test vẫn xanh.

test("sessionPrefix khớp id thật của adapter (bug resume hardcode 'chatgpt-')", (t) => {
  const dir = tempDir(t, "zemory-swp-");
  mkdirSync(dir, { recursive: true });

  const cg = join(dir, "chatgpt.json");
  writeFileSync(
    cg,
    JSON.stringify([
      {
        conversation_id: "CID",
        title: "t",
        current_node: "n1",
        mapping: { n1: { message: { author: { role: "user" }, content: { content_type: "text", parts: ["xin chào"] } }, parent: null, children: [] } },
      },
    ]),
  );
  const cgOut = chatgptAdapter.parseFileMulti(cg);
  assert.equal(cgOut[0].sessionId, `${PLATFORMS.chatgpt.sessionPrefix}CID`);

  const cw = join(dir, "claude.json");
  writeFileSync(cw, JSON.stringify([{ uuid: "UID", chat_messages: [{ uuid: "m1", sender: "human", text: "xin chào" }] }]));
  const cwOut = claudeWebAdapter.parseFileMulti(cw);
  assert.equal(cwOut[0].sessionId, `${PLATFORMS.claude.sessionPrefix}UID`);
});

test("adapter claude: nhãn project theo thứ tự stamp → _projects.json → uuid", (t) => {
  const dir = tempDir(t, "zemory-swp-proj-");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "_projects.json"), JSON.stringify({ p1: "VU-Project" }));
  const f = join(dir, "claude.json");
  const msg = [{ uuid: "m1", sender: "human", text: "hi" }];
  writeFileSync(
    f,
    JSON.stringify([
      { uuid: "c1", project_uuid: "p1", chat_messages: msg },
      { uuid: "c2", project_uuid: "p-unknown", chat_messages: msg },
      { uuid: "c3", project_uuid: "p1", __zemory_project: "Tên do scan-web dập", chat_messages: msg },
      { uuid: "c4", chat_messages: msg },
    ]),
  );
  const out = claudeWebAdapter.parseFileMulti(f);
  const by = Object.fromEntries(out.map((s) => [s.sessionId, s.project]));
  assert.equal(by["claudeweb-c1"], "VU-Project", "payload chi tiết chỉ có project_uuid ⇒ phải tra map, không để uuid thô");
  assert.equal(by["claudeweb-c2"], "p-unknown", "không tra được thì vẫn gom theo uuid");
  assert.equal(by["claudeweb-c3"], "Tên do scan-web dập");
  assert.equal(by["claudeweb-c4"], undefined, "chat ngoài project ⇒ không nhãn");
});

// ── SEAM UI ↔ BE: nút hứa gì thì backend phải làm ────────────────────────────
// Cùng loại lỗ với `scheduler-contract`, và là ĐÚNG thứ user vấp 2026-07-30: bấm Quét
// thì ra tin mới nhưng KHÔNG hề lấy web và cũng không hỏi đăng nhập — vì UI chưa từng
// có đường quét web. Ở đây kiểm PARITY, không chép hằng số: mọi công tắc trong markup
// phải có URL trong app.js, và URL đó phải có handler thật trong ui.ts.

const FE_HTML = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
const FE_JS = readAppJs();
const UI_TS = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

test("mọi công tắc data-auto có URL trong app.js VÀ handler trong ui.ts (không công tắc chết)", () => {
  const toggles = [...new Set([...FE_HTML.matchAll(/data-auto="([a-zA-Z]+)"/g)].map((m) => m[1]))];
  const map = FE_JS.match(/var AUTO_URL\s*=\s*\{([^}]*)\}/);
  assert.ok(map, "AUTO_URL phải là MỘT bảng dùng chung, không phải chuỗi if lồng nhau");
  for (const name of toggles) {
    const hit = map[1].match(new RegExp(`${name}\\s*:\\s*'([^']+)'`));
    assert.ok(hit, `công tắc '${name}' không có URL trong AUTO_URL ⇒ bấm vào không làm gì`);
    assert.ok(UI_TS.includes(`p === "${hit[1]}"`), `ui.ts thiếu handler cho ${hit[1]} (công tắc '${name}')`);
  }
});

test("app.js gọi endpoint nào thì ui.ts phải có endpoint đó (bảng Liên kết + nút nối)", () => {
  for (const ep of ["/connections", "/connect"]) {
    assert.ok(FE_JS.includes(ep), `app.js phải dùng ${ep}`);
    assert.ok(UI_TS.includes(`p === "${ep}"`), `ui.ts thiếu handler ${ep}`);
  }
});

// User chốt 2026-07-30: MỘT nút Quét, tự dò nền nào thiếu đăng nhập — không công tắc,
// không bắt chọn. Ba luật dưới khoá đúng ba cách bản này có thể trượt về kiểu cũ.
test("MỘT nút Quét: luôn kéo web, không qua công tắc nào", () => {
  const scanBranch = UI_TS.slice(UI_TS.indexOf('p === "/memory-scan"'), UI_TS.indexOf('p === "/connections"'));
  // 2026-08-29: nút Quét kéo web NGẦM (`hidden: true`) — cửa sổ hiện chỉ khi người dùng bấm Liên kết.
  assert.ok(/await scanWebPlatforms\(undefined, undefined, \{ hidden: true \}\)/.test(scanBranch), "nút Quét phải tự kéo web, và kéo NGẦM");
  assert.ok(!/getScanWeb|scanWeb\(\)\s*\?/.test(scanBranch), "không được phụ thuộc công tắc nào nữa");
  assert.ok(!/data-auto="scanweb"/.test(FE_HTML), "công tắc 'kèm web chat' phải bị gỡ khỏi giao diện");
  assert.ok(!/set-scan-web|getScanWeb/.test(UI_TS + FE_JS), "và không để lại endpoint/hàm chết");
});

// User chốt 2026-07-30: bỏ hộp thoại nhảy giữa lúc quét, trạng thái liên kết phải
// TRƯNG ra cạnh Sources, đứt thì có nút nối lại.
// 🔄 ĐẢO ca cũ *"bảng Liên kết: có bề mặt thật"* (user chốt 2026-08-28: gộp trạng thái lên
// CHÍNH hàng nguồn — *"mấy cái check link phải nằm ngay sau mấy cái check source"*, và *"gộp
// lên thì ở dưới phải mất"*). Bảng `#mConn` bị gỡ CÓ CHỦ ĐÍCH; bất biến THẬT — trạng thái đo
// được + bấm nối lại được + không hộp thoại tự nhảy — nay sống ở badge trên hàng + hộp chi tiết.
test("trạng thái liên kết nằm TRÊN HÀNG nguồn: badge + hộp chi tiết + nút Thêm nguồn", () => {
  assert.ok(!/id="mConn"/.test(FE_HTML), "bảng Liên kết cũ phải mất hẳn — hai chỗ cùng nói một chuyện là chỗ đẻ lệch");
  assert.ok(UI_TS.includes('p === "/connections"') && UI_TS.includes('p === "/connect"'), "ui.ts vẫn phải có cả endpoint đọc lẫn endpoint nối lại (cây đọc qua scopeTree)");
  assert.ok(/function srcBadge\(/.test(FE_JS), "mỗi hàng nguồn phải có badge trạng thái");
  assert.ok(/data-srcdet=/.test(FE_JS) && /function openSrcDetail\(/.test(FE_JS), "bấm badge phải ra hộp chi tiết liên kết");
  assert.ok(/\/connect\?platform=/.test(FE_JS), "trong hộp phải bấm nối lại được");
  assert.ok(/id="mAddSrc"/.test(FE_HTML) && /function openAddSource\(/.test(FE_JS), "nút ＋ Thêm nguồn nằm dưới panel, mở hộp chọn nền");
  assert.ok(/data-addacct=/.test(FE_JS), "hộp Thêm nguồn phải có đường thêm tài khoản (đã từng bị làm rơi khi gỡ bảng cũ)");
  assert.ok(!/webLoginAsk/.test(FE_JS), "hộp thoại tự nhảy phải bị gỡ hẳn — nó hỏi đúng lúc không ai hỏi");
  assert.ok(/conn\.who/.test(FE_JS), "nguồn đã nối phải ghi TÊN tài khoản ngay trên hàng");
});

test("chỉ quét nền ĐANG DÙNG — máy chưa từng dùng nền nào thì không tự bật trình duyệt", () => {
  // Neo đã dời HAI lần trong một ngày: `ui.ts` → `scanweb.ts` (surface mỏng, nghiệp vụ ở
  // domain) → `webslots.ts` (bốn nơi cùng cần, tránh import vòng). Bất biến KHÔNG hề đổi —
  // và đó chính là điểm yếu của neo soi CHỮ: nó đỏ vì code DỜI NHÀ, không vì hành vi sai.
  const slots = readFileSync(new URL("../src/memory/webslots.ts", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  assert.ok(/export function platformsInUse\(\)/.test(slots), "phải có phép lọc nền đang dùng");
  assert.ok(/scanWebPlatforms\(only\?: string\[\], account\?: string, opts[^)]*\)[\s\S]{0,200}platformsInUse\(\)/.test(sw), "mặc định phải là nền đang dùng, không phải mọi nền");
});

// 🔄 ĐẢO ca cũ *"scheduler nền KHÔNG được tự kéo web"* (user chốt 2026-08-28).
//
// Ca cũ đúng với dữ kiện của nó: lúc đó kéo web = **bật một cửa sổ vào mặt người dùng**, nên
// chạy nền là sai. Nay có chế độ NGẦM (đo: kéo được, không cửa sổ nào hiện), và bề mặt thì
// bày `Web chat` thành ô TICK cạnh khối "AUTOMATION" ⇒ đã tick mà không về là bề mặt nói dối.
// Nguyên văn user: *"mọi source đã check là nó phải tự động vào kho chạy hết, ko dc thiếu"*.
//
// Ca MỚI canh đúng ba ràng buộc thay thế — mất ràng buộc nào cũng là quay lại một kiểu sai:
test("scheduler tự kéo web — nhưng NGẦM, theo ô tick, và hỏng thì GHI SỔ", () => {
  const sched = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8");
  assert.ok(/scanWeb\(/.test(sched), "nay scheduler PHẢI tự kéo web (ô đã tick = phải vào kho)");
  assert.ok(/hidden:\s*true/.test(sched), "phải kéo NGẦM — bật cửa sổ mỗi nhịp là lý do luật cũ tồn tại");
  assert.ok(/isExcluded\(/.test(sched), "ô KHÔNG tick thì tuyệt đối không đụng tới");
  assert.ok(/setWebPull\(/.test(sched), "mọi kết cục phải ghi sổ — hỏng mà im lặng là lỗi đang đi vá");
  // Hỏng thì phải LÙI: thử lại mỗi nhịp cho một thứ cần NGƯỜI đăng nhập là đốt máy vô ích.
  assert.ok(/WEB_RETRY_AFTER_FAIL_MS/.test(sched), "phiên hết hạn phải lùi nhịp, không thử lại dày");
});

// ── trình duyệt mở ra phải là trình duyệt user DÙNG ──────────────────────────

test("chọn trình duyệt theo mặc định của máy, không cứng Edge-first", () => {
  assert.ok(/chrome\.exe$/i.test(orderByProgId("ChromeHTML")[0]), "máy mặc định Chrome ⇒ dò Chrome trước");
  assert.ok(/msedge\.exe$/i.test(orderByProgId("MSEdgeHTM")[0]), "máy mặc định Edge ⇒ dò Edge trước");
  assert.ok(/msedge\.exe$/i.test(orderByProgId(null)[0]), "không đọc được registry ⇒ giữ thứ tự cũ, không rơi về rỗng");
  assert.ok(/msedge\.exe$/i.test(orderByProgId("FirefoxURL")[0]), "Firefox không nói CDP ⇒ KHÔNG được chọn, rơi về Chromium");
  // Brave (2026-08-28): máy user mặc định Brave mà bộ dò không biết ⇒ mở Edge, Edge profile
  // mới bật hộp Microsoft sync vào mặt người dùng. Brave là Chromium, nói CDP như hai hãng kia.
  assert.ok(/brave\.exe$/i.test(orderByProgId("BraveHTML")[0]), "máy mặc định Brave ⇒ dò Brave trước");
  assert.ok(orderByProgId("ChromeHTML").some((p) => /brave\.exe$/i.test(p)), "Brave phải nằm trong danh sách rơi về của mọi máy");
  for (const id of ["ChromeHTML", "MSEdgeHTM", null, "FirefoxURL"]) {
    const l = orderByProgId(id);
    assert.equal(new Set(l).size, l.length, "không được lặp đường dẫn");
    assert.ok(l.some((p) => /chrome\.exe$/i.test(p)) && l.some((p) => /msedge\.exe$/i.test(p)), "mọi ứng viên vẫn phải còn trong danh sách (chỉ đổi THỨ TỰ)");
  }
});

// Đo 2026-07-30: quét claude bám vào cửa sổ chatgpt (chung cổng 9222, bộ lọc tab khớp
// mọi nền) ⇒ bắn `/api/organizations` vào chatgpt.com ⇒ 404 ⇒ báo "chưa đăng nhập" và
// mở một trang nhập mật khẩu Google. Hai luật dưới đây chặn đúng chỗ đó.
test("mỗi nền một CỔNG riêng — hai cửa sổ không thể cùng bind một cổng", () => {
  const ports = Object.values(PLATFORMS).map((p) => p.port);
  assert.ok(ports.every((n) => Number.isInteger(n) && n > 1024), "mọi nền phải khai cổng");
  assert.equal(new Set(ports).size, ports.length, `cổng trùng nhau ⇒ nền sau mất CDP, bám nhầm cửa sổ nền trước: ${ports}`);
});

test("bộ lọc tab của một nền KHÔNG được khớp trang của nền khác", () => {
  const all = Object.values(PLATFORMS);
  for (const p of all) {
    assert.ok(p.tabRe instanceof RegExp, `${p.key} phải khai tabRe`);
    assert.ok(p.tabRe.test(p.url), `${p.key}: tabRe phải khớp chính trang của nó (${p.url})`);
    for (const other of all) {
      if (other.key === p.key) continue;
      assert.ok(!p.tabRe.test(other.url), `${p.key}.tabRe khớp nhầm ${other.url} ⇒ chạy API nền này trên trang nền kia`);
    }
  }
  const src = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  assert.ok(!/Cdp\.connect\([^,]+,\s*TAB_RE\)/.test(src), "không còn bộ lọc tab dùng chung");
  assert.ok(!/const TAB_RE\s*=/.test(src), "TAB_RE phải bị gỡ hẳn, không để ai vô tình dùng lại");
});

test("trình duyệt MẶC ĐỊNH của máy thắng; profile hãng khác được DỜI chứ không mở chéo", () => {
  const src = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  assert.ok(/function profileBrowser\(/.test(src), "phải có lớp quyết định browser THEO PROFILE");
  assert.ok(/\.zemory-browser/.test(src), "và phải ghi dấu lại, không đoán mỗi lần chạy");
  assert.ok(/writeFileSync\(marker,/.test(src), "dấu phải được GHI thật — khai tên hằng số thôi thì lần sau vẫn đoán lại");
  // Máy mặc định Chrome mà cứ bật Edge là lỗi user báo 2026-07-30. Nhưng mở Chrome trên
  // profile Edge thì hỏng profile ⇒ dời sang một bên, KHÔNG xoá, rồi dựng bản mới.
  assert.ok(/renameSync\(profileDir,/.test(src), "profile của hãng khác phải được DỜI (giữ lại), không mở chéo và cũng không xoá");
  assert.ok(!/existing \? \(\[\.\.\.EDGE_PATHS/.test(src), "không còn luật 'profile cũ thì cứ Edge' — máy mặc định thắng");
  // Đường mở cửa sổ KHÔNG được gọi thẳng findBrowser: làm vậy là hôm nay Edge, mai đổi
  // mặc định thành Chrome ⇒ mở Chrome trên profile Edge ⇒ phiên đăng nhập bay.
  const launchArea = src.slice(src.indexOf("const relaunch ="), src.indexOf("const first = await Cdp.connect"));
  assert.ok(!/findBrowser\(/.test(launchArea), "đường mở cửa sổ phải đi qua profileBrowser(), không phải findBrowser()");
  assert.equal((launchArea.match(/profileBrowser\(/g) ?? []).length, 2, "cả relaunch lẫn lần mở đầu đều qua profileBrowser()");
});

// ── ③ vòng ĐĂNG NHẬP LẠI ─────────────────────────────────────────────────────

test("awaitLogin: mở cửa sổ TRƯỚC khi hỏi, rồi kiểm lại auth", async () => {
  const order = [];
  let signedIn = false;
  const back = await awaitLogin({
    openWindow: () => {
      order.push("open");
      signedIn = true; // giả lập người dùng đăng nhập trong cửa sổ vừa mở
    },
    ask: async () => {
      order.push("ask");
      return true;
    },
    checkAuth: async () => {
      order.push("check");
      return signedIn;
    },
  });
  assert.equal(back, true);
  assert.deepEqual(order, ["open", "ask", "check"], "cửa sổ phải mở TRƯỚC câu hỏi — nếu không thì lời hứa 'window is open' là bịa");
});

test("awaitLogin: không có ask (không TTY / daemon) ⇒ mở cửa sổ rồi trả false NGAY, không treo", async () => {
  let opened = 0;
  const back = await awaitLogin({ openWindow: () => opened++, checkAuth: async () => assert.fail("không được kiểm auth khi không ai trả lời được") });
  assert.equal(back, false);
  assert.equal(opened, 1, "vẫn phải mở cửa sổ để lần chạy sau người dùng đã có chỗ đăng nhập");
});

test("awaitLogin: người dùng chọn DỪNG ⇒ false, không kiểm thêm", async () => {
  let checks = 0;
  const back = await awaitLogin({
    openWindow: () => {},
    ask: async () => false,
    checkAuth: async () => {
      checks++;
      return true;
    },
  });
  assert.equal(back, false);
  assert.equal(checks, 0);
});

test("awaitLogin: trả lời 'xong' mà vẫn chưa đăng nhập ⇒ dừng sau maxRounds, KHÔNG vòng vô hạn", async () => {
  let asked = 0;
  const back = await awaitLogin({
    openWindow: () => {},
    ask: async () => {
      asked++;
      return true;
    },
    checkAuth: async () => false,
    maxRounds: 3,
  });
  assert.equal(back, false);
  assert.equal(asked, 3, "phải hỏi đúng maxRounds lần rồi bỏ, không hỏi mãi");
});

// ── ⑤ MỘT tài khoản, NHIỀU org 'chat' (đo 2026-08-28 trên tài khoản công ty) ──────────────
// `Global` (chat, 0 hội thoại) đứng TRƯỚC org có hội thoại. Bản cũ lấy org chat đầu ⇒ danh sách
// rỗng ⇒ "not ready ×5" ⇒ `no-tab` — ngay sau khi người dùng đăng nhập xong. Hai bất biến:
// liệt kê phải là HỢP của mọi org chat, và lời gọi chi tiết phải đi đúng org của hội thoại đó.
const TWO_CHAT_ORGS = [
  { uuid: "org-global", name: "Global", capabilities: ["chat", "raven"] },
  { uuid: "org-work", name: "Work", capabilities: ["chat"] },
  { uuid: "org-api", name: "Individual Org", capabilities: ["api", "api_individual"] },
];

test("claude list: nhiều org 'chat' ⇒ HỢP hội thoại của mọi org, không dừng ở org đầu (dù nó rỗng)", async () => {
  delete globalThis.__zmOrgOf;
  const { value, calls } = await runExpr(PLATFORMS.claude.listExpr, [
    orgRoute(TWO_CHAT_ORGS),
    [/org-global\/chat_conversations/, () => ok([])],
    [/org-work\/chat_conversations/, () => ok([{ uuid: "w1" }, { uuid: "w2" }])],
  ]);
  assert.deepEqual(value.map((x) => x.id).sort(), ["w1", "w2"], "hội thoại nằm ở org thứ hai phải được thấy");
  assert.ok(calls.some((u) => u.includes("/org-work/chat_conversations")), "phải hỏi cả org thứ hai");
  assert.ok(!calls.some((u) => u.includes("org-api")), "org 'api' vẫn không được gọi");
});

test("claude conv: lời gọi chi tiết đi ĐÚNG org của hội thoại đó (sổ do list ghi), không phải org đầu", async () => {
  delete globalThis.__zmOrgOf;
  await runExpr(PLATFORMS.claude.listExpr, [
    orgRoute(TWO_CHAT_ORGS),
    [/org-global\/chat_conversations/, () => ok([])],
    [/org-work\/chat_conversations/, () => ok([{ uuid: "w1" }])],
  ]);
  const conv = await runExpr(PLATFORMS.claude.convExpr("w1"), [
    orgRoute(TWO_CHAT_ORGS),
    [/org-work\/chat_conversations\/w1/, () => ok({ uuid: "w1", chat_messages: [] })],
    [/org-global\/chat_conversations\/w1/, () => httpErr(404)],
  ]);
  assert.equal(conv.value.uuid, "w1");
  assert.ok(conv.calls.some((u) => u.includes("/org-work/chat_conversations/w1")), "phải lấy từ org-work");
  assert.ok(!conv.calls.some((u) => u.includes("/org-global/chat_conversations/w1")), "có sổ thì KHÔNG dò org đầu — mỗi lần dò sai là một request 404 vô ích");
});

test("claude conv: KHÔNG có sổ (tab mới, chưa list) ⇒ thử lần lượt mọi org chat cho tới khi 200", async () => {
  delete globalThis.__zmOrgOf;
  const conv = await runExpr(PLATFORMS.claude.convExpr("w9"), [
    orgRoute(TWO_CHAT_ORGS),
    [/org-global\/chat_conversations\/w9/, () => httpErr(404)],
    [/org-work\/chat_conversations\/w9/, () => ok({ uuid: "w9", chat_messages: [] })],
  ]);
  assert.equal(conv.value.uuid, "w9", "org đầu 404 thì phải sang org kế, không ném ngay");
});

test("claude projects: gom project của MỌI org chat", async () => {
  const { value } = await runExpr(PLATFORMS.claude.projectsExpr, [
    orgRoute(TWO_CHAT_ORGS),
    [/org-global\/projects/, () => ok([{ uuid: "pg", name: "G" }])],
    [/org-work\/projects/, () => ok([{ uuid: "pw", name: "W" }])],
  ]);
  assert.deepEqual(value, { pg: "G", pw: "W" });
});

// ── ⑥ Đóng dấu tài khoản CHỈ lên phiên của nguồn web vừa kéo ────────────────────────────
// `scan()` nạp toàn kho; transcript Claude Code mới trên đĩa cũng có trong report. Bản cũ đóng
// dấu hết ⇒ 9 phiên local mang `main`/email ⇒ cây Local tách claude-code thành BA hàng (28/08).
test("webSessionIds: phiên local trong cùng lượt scan KHÔNG được đóng dấu tài khoản web", async () => {
  const { webSessionIds } = await import("../../dist/memory/scanweb.js");
  const report = { sessions: [
    { id: "claudeweb-1", source: "claude-web" },
    { id: "cowork-1", source: "claude-cowork" },
    { id: "local-1", source: "claude-code" },
    { id: "gpt-1", source: "chatgpt-web" },
  ] };
  assert.deepEqual(webSessionIds(report, ["claude-web", "claude-cowork"]).sort(), ["claudeweb-1", "cowork-1"]);
  assert.deepEqual(webSessionIds(report, ["chatgpt-web", undefined]), ["gpt-1"], "sub không có (undefined) không được phá bộ lọc");
  assert.deepEqual(webSessionIds(undefined, ["claude-web"]), []);
});
