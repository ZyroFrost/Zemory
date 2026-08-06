// `memory borrow-cookies` — mượn phiên ĐÃ đăng nhập từ trình duyệt thật của user.
//
// Thứ phải khoá không phải "chép có chạy không", mà là RANH GIỚI: chép đúng một nền,
// xoá sạch phần còn lại, không bao giờ đọc giá trị cookie, và không âm thầm đè mất
// phiên đang có. Test dựng một cookie store GIẢ đúng schema Chromium nên chạy được ở
// mọi máy, không cần trình duyệt thật.

import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { borrowCookies, restoreProfile } from "../../dist/memory/borrowcookies.js";
import { tempDir, readAppJs } from "./helpers.mjs";

/** Cookie store giống Chromium: giá trị nằm ở cột BLOB đã mã hoá — không ai đọc nổi. */
function fakeStore(path, rows) {
  mkdirSync(join(path, "..").replace(/[\\/]$/, ""), { recursive: true });
  const db = new Database(path);
  db.exec("CREATE TABLE cookies (host_key TEXT, name TEXT, encrypted_value BLOB, path TEXT)");
  const ins = db.prepare("INSERT INTO cookies (host_key, name, encrypted_value, path) VALUES (?,?,?,'/')");
  for (const [host, name] of rows) ins.run(host, name, Buffer.from("v10SUPERSECRET"));
  db.close();
}

/** Dựng một "User Data" giả của trình duyệt trong thư mục tạm. */
function fakeBrowser(t, rows) {
  const root = tempDir(t, "zemory-bc-");
  const ud = join(root, "User Data");
  mkdirSync(join(ud, "Default", "Network"), { recursive: true });
  writeFileSync(join(ud, "Local State"), JSON.stringify({ os_crypt: { app_bound_encrypted_key: "fake" } }));
  fakeStore(join(ud, "Default", "Network", "Cookies"), rows);
  return { root, ud, browserRoot: join(root, "zbrowser") };
}

// Không chạy được trên máy không phải Windows (hàm tự chặn) — bỏ qua cho sạch.
const skip = process.platform !== "win32" ? { skip: "Windows-only path" } : {};

test("nền không khai ⇒ từ chối, không đụng gì", skip, () => {
  const r = borrowCookies({ platform: "gemini" });
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown platform/);
});

test("chỉ chở cookie của ĐÚNG nền — mọi dòng khác bị XOÁ, không nằm lại trong profile", skip, (t) => {
  const b = fakeBrowser(t, [
    [".chatgpt.com", "__Secure-next-auth.session-token"],
    [".openai.com", "oai-did"],
    [".mybank.example", "SESSION"],
    ["accounts.google.com", "SID"],
    [".claude.ai", "sessionKey"],
  ]);
  const r = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, sources: [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }] });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.kept, 2, "giữ đúng 2 dòng chatgpt.com + openai.com");
  assert.equal(r.dropped, 3, "3 dòng còn lại phải bị xoá");

  const db = new Database(join(b.browserRoot, "chatgpt", "Default", "Network", "Cookies"), { readonly: true });
  const hosts = db.prepare("SELECT DISTINCT host_key FROM cookies").all().map((x) => x.host_key);
  db.close();
  assert.deepEqual(hosts.sort(), [".chatgpt.com", ".openai.com"]);
  for (const bad of [".mybank.example", "accounts.google.com", ".claude.ai"]) {
    assert.ok(!hosts.includes(bad), `${bad} KHÔNG được nằm trong profile của zemory`);
  }
});

test("nguồn cũng chưa đăng nhập ⇒ nói thẳng, KHÔNG đẻ profile rỗng rồi báo lỗi mơ hồ sau", skip, (t) => {
  const b = fakeBrowser(t, [[".mybank.example", "SESSION"]]);
  const r = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, sources: [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /no chatgpt\.com cookies|sign in there first/i);
  assert.ok(!existsSync(join(b.browserRoot, "chatgpt")), "không được để lại profile nửa vời");
});

test("profile zemory đang có phiên ⇒ KHÔNG đè khi chưa --replace (xoá phiên là bất khả đảo)", skip, (t) => {
  const b = fakeBrowser(t, [[".chatgpt.com", "session"]]);
  const target = join(b.browserRoot, "chatgpt");
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "Local State"), "phiên đang sống");
  const src = [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }];

  const no = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, sources: src });
  assert.equal(no.ok, false);
  assert.match(no.error, /--replace/);
  assert.equal(readFileSync(join(target, "Local State"), "utf8"), "phiên đang sống", "phải còn NGUYÊN");

  const yes = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, replace: true, sources: src });
  assert.equal(yes.ok, true, yes.error);
});

test("ghi dấu trình duyệt NGUỒN — khoá app-bound chỉ mở được bằng chính trình duyệt đó", skip, (t) => {
  const b = fakeBrowser(t, [[".claude.ai", "sessionKey"]]);
  const r = borrowCookies({ platform: "claude", browserRoot: b.browserRoot, sources: [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }] });
  assert.equal(r.ok, true, r.error);
  assert.equal(readFileSync(join(b.browserRoot, "claude", ".zemory-browser"), "utf8"), process.execPath);
});

test("KHÔNG chở file mật khẩu — chỉ Local State + Cookies", skip, (t) => {
  const b = fakeBrowser(t, [[".chatgpt.com", "session"]]);
  writeFileSync(join(b.ud, "Default", "Login Data"), "mật khẩu đã lưu");
  writeFileSync(join(b.ud, "Default", "Web Data"), "thẻ thanh toán");
  const r = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, sources: [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }] });
  assert.equal(r.ok, true, r.error);
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [e.name]));
  const files = walk(join(b.browserRoot, "chatgpt"));
  for (const forbidden of ["Login Data", "Web Data"]) {
    assert.ok(!files.includes(forbidden), `${forbidden} tuyệt đối không được chép — mật khẩu/thẻ không phải việc của zemory`);
  }
  assert.deepEqual(files.sort(), [".zemory-browser", "Cookies", "Local State"], "đúng 3 thứ, không hơn");
});

// App phải TỰ làm, không bắt người dùng gõ lệnh (user 2026-07-30).
test("nút Liên kết làm TRỌN việc: tự dò nguồn → mượn → kéo, người dùng chỉ bấm một cái", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const branch = ui.slice(ui.indexOf('p === "/connect"'), ui.indexOf('p === "/set-sync-level"'));
  assert.ok(/findBorrowSource\(/.test(branch), "phải tự dò nguồn, không bắt người dùng chọn trình duyệt/profile");
  assert.ok(/borrowCookies\(/.test(branch) && /scanWebPlatforms\(/.test(branch), "một cú bấm = mượn RỒI kéo luôn");
  assert.ok(/replace: true/.test(branch), "profile cũ đã hết phiên thì phải cho đè, không thì nút bấm vô tác dụng");
  assert.ok(/liveConnections\(\)/.test(branch), "trả trạng thái MỚI (đã kiểm lại thật) để bảng tự cập nhật, khỏi bắt bấm lại");

  const js = readAppJs();
  assert.ok(/r\.canBorrow/.test(js), "bảng phải phân biệt 'mượn được' với 'phải đăng nhập'…");
  assert.ok(/\/connect\?platform=/.test(js), "…và bấm là gọi thẳng endpoint, không in ra lệnh cho người ta gõ");
  assert.ok(!/borrow-cookies --platform/.test(js), "UI KHÔNG được bảo người dùng chạy lệnh CLI");
});

// User báo 2026-07-30: *"đăng nhập xong rồi nhưng ko thấy mở lại"* — bấm Liên kết, cửa
// sổ mở, đăng nhập xong thì KHÔNG ai kiểm lại nên bảng đứng nguyên ở ⚠.
test("sau khi bấm Liên kết, app tự CHỜ đăng nhập rồi chạy tiếp — không bắt bấm lại", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.ok(ui.includes("async function liveConnections("), "đọc bảng là phải KIỂM LẠI, không trưng số cũ");
  assert.ok(/probeOnly: true/.test(ui), "và phải là phép hỏi RẺ — hỏi lại mỗi 5s mà mở cửa sổ mỗi lần thì loạn");

  const sw = readFileSync(new URL("../src/memory/scanweb.ts", import.meta.url), "utf8");
  assert.ok(/if \(opts\.probeOnly\) return \{ status: "need-login"/.test(sw), "probeOnly: cổng chết ⇒ trả lời ngay, KHÔNG mở cửa sổ");
  assert.ok(/!first && !opts\.probeOnly/.test(sw), "probeOnly: không có tab cũng KHÔNG được mở thêm cửa sổ");

  const js = readAppJs();
  assert.ok(/function connPoll\(/.test(js) && js.includes("zGet('/connections')"), "app phải tự chờ, và chờ CẢ BẢNG — user đăng nhập nền nào cũng phải nhận ra");
  assert.ok(/conn\.waiting/.test(js), "và nói cho người dùng biết là đang chờ, không đứng im");
});

test("chép cookie qua VACUUM INTO — copy file trần bỏ mất phần WAL (chính là cookie vừa đăng nhập)", () => {
  const src = readFileSync(new URL("../src/memory/borrowcookies.ts", import.meta.url), "utf8");
  assert.ok(/VACUUM INTO/.test(src), "phải dùng VACUUM INTO để gộp cả WAL");
  const copies = [...src.matchAll(/copyFileSync\(([^,]+),/g)].map((m) => m[1].trim());
  assert.ok(!copies.includes("srcCookies"), "cookie DB KHÔNG được chép bằng copyFileSync — bản chép sẽ cũ");
});

// Đo 2026-07-30 trên máy thật: cookie chép từ Chrome sang profile khác KHÔNG mở được
// phiên (App-Bound Encryption) — mà lần thử đó đã XOÁ profile claude đang đăng nhập tốt.
// Một nút "thử mượn" tuyệt đối không được để lại hậu quả khi nó thất bại.
test("mượn hụt phải LÙI ĐƯỢC: profile cũ được dời sang bên, không bị xoá", skip, (t) => {
  const b = fakeBrowser(t, [[".chatgpt.com", "session"]]);
  const target = join(b.browserRoot, "chatgpt");
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "Local State"), "phiên đang sống");
  const r = borrowCookies({ platform: "chatgpt", browserRoot: b.browserRoot, replace: true, sources: [{ key: "fake", label: "Fake", userData: b.ud, exe: process.execPath }] });
  assert.equal(r.ok, true, r.error);
  assert.ok(r.backup && existsSync(r.backup), "phải có bản lùi, không được xoá thẳng");
  assert.equal(readFileSync(join(r.backup, "Local State"), "utf8"), "phiên đang sống", "bản lùi phải còn nguyên nội dung");

  restoreProfile(target, r.backup);
  assert.equal(readFileSync(join(target, "Local State"), "utf8"), "phiên đang sống", "lùi xong phải về đúng trạng thái cũ");
  assert.ok(!existsSync(r.backup), "và bản lùi được dọn sau khi trả về chỗ cũ");
});

test("/connect tự lùi khi mượn không mở được phiên", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const branch = ui.slice(ui.indexOf('p === "/connect"'), ui.indexOf('p === "/set-sync-level"'));
  assert.ok(/restoreProfile\(/.test(branch), "mượn hụt ⇒ phải gọi restoreProfile");
  assert.ok(/dropBackup\(/.test(branch), "mượn được ⇒ dọn bản lùi, không để rác chất đống");
  assert.ok(/status === "done"/.test(branch), "và phải QUYẾT theo kết quả đăng nhập thật, không theo 'chép xong là xong'");
});

test("mã nguồn KHÔNG bao giờ đọc giá trị cookie (chỉ đếm và xoá)", () => {
  const src = readFileSync(new URL("../src/memory/borrowcookies.ts", import.meta.url), "utf8");
  const sql = [...src.matchAll(/`?(SELECT|DELETE)[^`"']*/gi)].map((m) => m[0]);
  for (const q of sql) {
    assert.ok(!/encrypted_value|\bvalue\b/i.test(q), `truy vấn chạm giá trị cookie: ${q}`);
  }
  assert.ok(/SELECT COUNT\(1\) n FROM cookies/.test(src), "chỉ được ĐẾM");
  // Bỏ comment rồi mới soi: phần chú thích ĐƯỢC phép nhắc "không chép Login Data" —
  // đó là tài liệu. Cấm là cấm CODE chạm vào.
  const code = src
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  assert.ok(!/Login Data|Web Data|Login Data For Account/.test(code), "code không được chạm file mật khẩu/thẻ");
  const copied = [...code.matchAll(/copyFileSync\(([^,]+),/g)].map((m) => m[1].trim());
  assert.deepEqual(copied, ["srcLocalState"], `chỉ Local State đi bằng copyFileSync (cookie đi qua VACUUM INTO), đang chép: ${copied}`);
});
