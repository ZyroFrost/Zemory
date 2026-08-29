// CHIỀU TÀI KHOẢN của lane (schema v24, user chốt 2026-08-28: *"lỡ lấy từ nhiều tk thì sao?
// … có thể có 2 dòng claude khác nhau với 2 tên tk khác"*).
//
// Vì sao phải là một CỘT chứ không phải một nhãn trên UI: hội thoại của mọi tài khoản cùng
// nền đổ chung vào một `source` (`claude-web`). Trước v24 kho KHÔNG có chiều nào phân biệt
// chúng ⇒ bày ô tick theo tài khoản là bày một ô **không lọc được gì** — đúng loại "ô tick
// nói sai về chính nó" mà cả phiên 2026-08-28 dành để diệt.
//
// Bốn lời hứa canh ở đây, cái nào mất cũng đưa ô tick về lại trạng thái nói dối:
//   ① lane mang `account` phải khớp ĐÚNG phiên của khe đó (lọc recall);
//   ② `laneSqlClause` phải sinh điều kiện SQL tương ứng (lọc SYNC — hai chiều export/merge);
//   ③ phiên CŨ (`account` NULL) là nhóm **"(không rõ)"** riêng, KHÔNG được gộp vào 'main';
//   ④ cây phải đẻ một dòng cho mỗi khe.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-acct-")), "global_memory.db");

const { openMemory } = await import("../../dist/memory/db.js");
const { isExcluded, laneKey, laneMatches, laneSqlClause, scopeTree } = await import("../../dist/memory/scope.js");
const { stampAccount } = await import("../../dist/memory/ingest.js");

const DB = process.env.GLOBAL_MEMORY_DB;

function seed() {
  const db = openMemory(DB);
  try {
    const ins = db.prepare(
      "INSERT OR REPLACE INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)",
    );
    ins.run("s-main", "claude-web", "web", "MAY-A", "main", 10);
    ins.run("s-two", "claude-web", "web", "MAY-A", "2", 20);
    ins.run("s-old", "claude-web", "web", "MAY-A", null, 30); // phiên trước v24
  } finally {
    db.close();
  }
}

test("① lane có account khớp ĐÚNG khe đó — 'main' không được nuốt khe khác", () => {
  const s = (account) => ({ origin: "web", host: "MAY-A", source: "claude-web", account });
  const lane2 = { origin: "web", source: "claude-web", account: "2" };

  assert.equal(laneMatches(lane2, s("2")), true);
  assert.equal(laneMatches(lane2, s("main")), false, "bỏ tick tài khoản 2 KHÔNG được kéo theo main");
  assert.equal(laneMatches(lane2, s(null)), false, "phiên cũ chưa đóng dấu không thuộc khe nào cả");

  // Lane cấp NGUỒN (không nêu account) vẫn phủ mọi khe — quan hệ cha/con giữ nguyên.
  const laneSrc = { origin: "web", source: "claude-web" };
  for (const a of ["main", "2", null]) assert.equal(laneMatches(laneSrc, s(a)), true);
});

test("③ phiên CŨ (NULL) là nhóm '(không rõ)' RIÊNG — gộp vào main là gán bừa dữ liệu cũ", () => {
  const s = (account) => ({ origin: "web", host: "MAY-A", source: "claude-web", account });
  const laneUnknown = { origin: "web", source: "claude-web", account: "" };
  assert.equal(laneMatches(laneUnknown, s(null)), true, "lane rỗng khớp đúng hàng NULL");
  assert.equal(laneMatches(laneUnknown, s("main")), false, "và KHÔNG khớp main");
  assert.notEqual(laneKey({ account: "" }), laneKey({}), "khe '(không rõ)' phải là một lane RIÊNG, không trùng lane trống");
});

test("② laneSqlClause sinh điều kiện cho account — thiếu là ngừng KÉO mà không lọc SYNC", () => {
  const c = laneSqlClause("s", [{ origin: "web", source: "claude-web", account: "2" }]);
  assert.match(c.match, /COALESCE\(s\.account,''\)\s*=\s*\?/u, "phải có vế account trong SQL");
  assert.ok(c.params.includes("2"));
  // COALESCE là bắt buộc: thiếu nó thì lane "(không rõ)" so `NULL = ''` ⇒ SQLite trả NULL,
  // tức KHÔNG khớp hàng nào, và ô tick đó im lặng không làm gì.
  const u = laneSqlClause("s", [{ origin: "web", account: "" }]);
  assert.match(u.match, /COALESCE\(s\.account,''\)/u);
});

test("④ cây đẻ MỘT DÒNG cho mỗi khe, kèm số tin của đúng khe đó", () => {
  seed();
  const web = scopeTree(DB, []).find((n) => n.lane.origin === "web");
  const cw = (web.children || []).find((c) => c.lane.source === "claude-web");
  assert.ok(cw, "phải có nguồn claude-web");
  const kids = Object.fromEntries((cw.children || []).map((k) => [k.lane.account, k.messages]));
  assert.equal(kids["main"], 10);
  assert.equal(kids["2"], 20);
  assert.equal(kids[""], 30, "phiên cũ phải hiện ra, không bị nuốt");
  assert.equal(cw.messages, 60, "hàng cha vẫn là tổng của mọi khe");
  // Mỗi khe một khoá toggle riêng — trùng khoá là bấm một cái tắt cả hai.
  const keys = new Set((cw.children || []).map((k) => k.key));
  assert.equal(keys.size, (cw.children || []).length);
});

test("PROFILE RỖNG chưa từng đăng nhập KHÔNG được thành hàng — đó là rác, không phải cảnh báo", async () => {
  // User chốt 2026-08-28, nguyên văn: *"chưa liên kết thì sẽ ko hiện, đéo có chuyện mà nó
  // lưu thông tin nhảm tk2"*. Bối cảnh: bấm "＋ thêm tài khoản" tạo NGAY thư mục profile —
  // kể cả khi người dùng đóng cửa sổ mà không đăng nhập. Bản đầu dựng thư mục đó thành một
  // hàng ⚠ VĨNH VIỄN (0 tin · chưa từng nối · không tự mất) trên cây của user thật.
  const { mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  // Thư mục profile "claude-9" tồn tại nhưng webAuth KHÔNG có bản ghi ok cho nó.
  // `browser/` nằm cạnh kho (currentMemoryDir) — chính chỗ `accountsOf` liệt kê.
  mkdirSync(join(dirname(DB), "browser", "claude-9"), { recursive: true });
  seed(); // main=10 · 2=20 · NULL=30 — hai khe THẬT (có dữ liệu) + một rổ cũ
  const web = scopeTree(DB, []).find((n) => n.lane.origin === "web");
  const cw = (web.children || []).find((c) => c.lane.source === "claude-web");
  const names = (cw.children || []).map((k) => k.lane.account);
  assert.ok(!names.includes("9"), "khe chưa từng đăng nhập và 0 tin KHÔNG được hiện");
  assert.ok(names.includes("main") && names.includes("2"), "khe CÓ DỮ LIỆU vẫn phải hiện đủ");
});

test("MỘT KHUÔN: dù chỉ một tài khoản, hàng nguồn vẫn có hàng tài khoản bên dưới", () => {
  // 🔄 Đảo ca chiều 2026-08-28 ("một tài khoản ⇒ không bung"). Luật đó đẻ HAI kiểu hiển thị:
  // chatgpt dính email lên hàng nguồn, claude tách hàng — user: *"thằng gpt lại dính lên 1
  // dòng nữa chứ"*. Mọi nguồn web cùng một khuôn: nguồn → tài khoản. Chỉ không bung khi
  // KHÔNG có khe thật nào.
  const db = openMemory(DB);
  try {
    db.prepare("DELETE FROM sessions").run();
    db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)").run(
      "s-one", "chatgpt-web", "web", "MAY-A", "main", 99,
    );
  } finally {
    db.close();
  }
  const web = scopeTree(DB, []).find((n) => n.lane.origin === "web");
  const cg = (web.children || []).find((c) => c.lane.source === "chatgpt-web");
  assert.equal((cg.children || []).length, 1, "một tài khoản vẫn là một hàng con — cùng khuôn với nguồn nhiều tài khoản");
  assert.equal(cg.children[0].lane.account, "main");
  assert.equal(cg.children[0].messages, 99);
  assert.equal(cg.conn && cg.conn.who, undefined, "hàng NGUỒN không mang email — email nằm ở hàng tài khoản");
});

test("bỏ tick MỘT khe chỉ loại khe đó khỏi recall — hai khe kia còn nguyên", () => {
  seed();
  const excl = [{ origin: "web", source: "claude-web", account: "2" }];
  const s = (account) => ({ origin: "web", host: "MAY-A", source: "claude-web", account });
  assert.equal(isExcluded(s("2"), excl), true);
  assert.equal(isExcluded(s("main"), excl), false);
  assert.equal(isExcluded(s(null), excl), false);
});

test("v25: phiên WEB cũ (account NULL) ⇒ 'main' · phiên LOCAL giữ NULL", async () => {
  // Vì sao đây là GÁN chứ không phải ĐOÁN: trước v24 khe duy nhất từng đăng nhập được là
  // `main`; khe phụ có bản ghi đều `ok:false`. Tin NULL vì thế chỉ có thể do main kéo về. Để
  // NULL thì cây đẻ hàng "(không rõ)" lặp số của cha — user: *"tự nhiên có ko rõ… là vớ vẩn"*.
  const { mkdtempSync } = await import("node:fs");
  const p = join(mkdtempSync(join(tmpdir(), "zemory-v25-")), "global_memory.db");
  let db = openMemory(p);
  try {
    db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)").run("w", "claude-web", "web", "M", null, 3);
    db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)").run("w2", "chatgpt-web", "web", "M", "2", 1);
    db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)").run("l", "claude-code", "local", "M", null, 5);
    db.prepare("UPDATE schema_version SET version=24").run(); // giả lập kho đang ở v24
  } finally {
    db.close();
  }
  db = openMemory(p); // mở lại ⇒ migrate v24→v25 chạy
  try {
    const a = (id) => db.prepare("SELECT account a FROM sessions WHERE id=?").get(id).a;
    assert.equal(a("w"), "main", "web NULL ⇒ main");
    assert.equal(a("w2"), "2", "khe đã đóng dấu KHÔNG được đổi");
    assert.equal(a("l"), null, "local không có tài khoản — NULL là đúng, đừng gán");
    assert.equal(db.prepare("SELECT version v FROM schema_version").get().v, 25);
  } finally {
    db.close();
  }
});

test("stampAccount đóng dấu phiên chưa có, KHÔNG đè dấu đã có", () => {
  seed();
  assert.equal(stampAccount(DB, ["s-old"], "3"), 1, "phiên NULL phải được đóng dấu");
  assert.equal(stampAccount(DB, ["s-main"], "3"), 0, "phiên đã có dấu KHÔNG được đổi — kéo lại không được viết lại lịch sử");
  const db = openMemory(DB);
  try {
    assert.equal(db.prepare("SELECT account a FROM sessions WHERE id='s-old'").get().a, "3");
    assert.equal(db.prepare("SELECT account a FROM sessions WHERE id='s-main'").get().a, "main");
  } finally {
    db.close();
  }
  assert.equal(stampAccount(DB, [], "x"), 0, "danh sách rỗng ⇒ không đụng gì");
});

// ── ⑤ TÀI KHOẢN = DANH TÍNH, không phải KHE (user 2026-08-28: "sao nó đá mất cái account cũ
//    đã đăng nhập, nó phải hiện song song các tk chứ") ───────────────────────────────────────
// Đo thật: khe `main` từng đăng nhập zyrofrost (83 phiên), hôm nay đăng nhập lại bằng tài khoản
// công ty ⇒ 83 phiên "đổi chủ" trên cây. Bất biến: hàng theo email; email không còn khe nào đăng
// nhập vẫn có hàng riêng (chưa nối); khe đăng nhập email mới không nuốt hàng của email cũ.
const { accountKey, slotOfIdentity } = await import("../../dist/memory/webslots.js");
const { restampAccount } = await import("../../dist/memory/ingest.js");
const { setWebAuth } = await import("../../dist/config/settings.js");

test("accountKey/slotOfIdentity: email thắng khe; tra ngược khe từ sổ webAuth", () => {
  assert.equal(accountKey("a@x.com", "main"), "a@x.com");
  assert.equal(accountKey(null, "2"), "2", "chưa biết email thì mới rơi về khe");
  assert.equal(accountKey("org: Global", "main"), "main", "tên org KHÔNG phải danh tính");
  const auth = { claude: { ok: true, who: "b@x.com" }, "claude#2": { ok: true, who: "a@x.com" }, chatgpt: { ok: true, who: "a@x.com" } };
  assert.equal(slotOfIdentity(auth, "claude", "a@x.com"), "2");
  assert.equal(slotOfIdentity(auth, "claude", "b@x.com"), "main");
  assert.equal(slotOfIdentity(auth, "claude", "zzz@x.com"), null, "không khe nào giữ ⇒ null, không đoán");
});

test("restampAccount: chỉ đổi hàng còn mang KHE/NULL, hàng đã có email của người khác giữ nguyên", () => {
  const db = openMemory(DB);
  try {
    db.prepare("DELETE FROM sessions").run();
    const ins = db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)");
    ins.run("claudeweb-1", "claude-web", "web", "M", "main", 1);
    ins.run("claudeweb-2", "claude-web", "web", "M", null, 1);
    ins.run("claudeweb-3", "claude-web", "web", "M", "old@x.com", 1);
  } finally {
    db.close();
  }
  const n = restampAccount(DB, ["claudeweb-1", "claudeweb-2", "claudeweb-3", "claudeweb-404"], "new@x.com");
  assert.equal(n, 2, "đúng hai hàng khe/NULL được gắn; hàng đã có email và id không tồn tại không tính");
  const db2 = openMemory(DB);
  try {
    const rows = Object.fromEntries(db2.prepare("SELECT id, account FROM sessions").all().map((r) => [r.id, r.account]));
    assert.deepEqual(rows, { "claudeweb-1": "new@x.com", "claudeweb-2": "new@x.com", "claudeweb-3": "old@x.com" });
  } finally {
    db2.close();
  }
  assert.equal(restampAccount(DB, ["claudeweb-1"], "org: Global"), 0, "không phải email thì không đóng dấu gì");
});

test("cây: email cũ KHÔNG còn khe vẫn có hàng riêng (chưa nối); khe main đăng nhập email mới là hàng khác", async () => {
  const db = openMemory(DB);
  try {
    db.prepare("DELETE FROM sessions").run();
    const ins = db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)");
    ins.run("cw-old-1", "claude-web", "web", "M", "old@x.com", 80); // lịch sử của người cũ
    ins.run("cw-new-1", "claude-web", "web", "M", "new@x.com", 2); // người mới, cùng khe main
  } finally {
    db.close();
  }
  setWebAuth("claude", true, "new@x.com"); // khe main hiện đăng nhập người MỚI
  // Khe main phải TỒN TẠI trên đĩa (thư mục profile) thì vòng "khe đã đăng nhập" mới đi qua nó —
  // thiếu dòng này thì đột biến "khoá theo khe" sống sót vì nhánh đó không chạy (đo lúc viết ca).
  const { mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  mkdirSync(join(dirname(DB), "browser", "claude"), { recursive: true });
  const web = scopeTree(DB, []).find((n) => n.lane.origin === "web");
  const cw = (web.children || []).find((c) => c.lane.source === "claude-web");
  const byLabel = Object.fromEntries((cw.children || []).map((k) => [k.label, k]));
  assert.ok(byLabel["old@x.com"], `hàng của người cũ phải còn — có: ${Object.keys(byLabel).join(" | ")}`);
  assert.ok(byLabel["new@x.com"], "hàng của người mới phải có");
  assert.equal(byLabel["old@x.com"].messages, 80, "lịch sử đi theo email, không theo khe");
  assert.equal(byLabel["old@x.com"].conn.linked, false, "email không còn khe nào đăng nhập ⇒ chưa nối, không nói dối là đang nối");
  assert.equal(byLabel["new@x.com"].conn.linked, true);
  assert.equal(byLabel["new@x.com"].conn.account, "main", "nút nối lại của người mới trỏ đúng khe main");
  assert.equal((cw.children || []).length, 2, "khe main KHÔNG được đẻ thêm hàng thứ ba trùng với email mới");
});

test("phiên đời cũ chưa có danh tính ⇒ MỘT hàng '(chưa gắn tài khoản)' + nút mở khe MỚI; KHÔNG 'main', KHÔNG mượn email", async () => {
  // User chốt 2026-08-28: *"khi thông tin chính thức của web nhận về lưu thì lấy nó, đéo phải lấy
  // lại cái cũ đã chế bị sai"* — danh tính chỉ đến từ web lúc đăng nhập; không đoán chủ cũ.
  const db = openMemory(DB);
  try {
    db.prepare("DELETE FROM sessions").run();
    const ins = db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)");
    ins.run("cw-legacy", "claude-web", "web", "M", "main", 81);
    ins.run("cw-new", "claude-web", "web", "M", "new@x.com", 2);
  } finally {
    db.close();
  }
  setWebAuth("claude", true, "new@x.com");
  const web = scopeTree(DB, []).find((n) => n.lane.origin === "web");
  const cw = (web.children || []).find((c) => c.lane.source === "claude-web");
  const labels = (cw.children || []).map((k) => k.label);
  assert.ok(!labels.some((l) => /main/u.test(l)), `không được hiện 'main': ${labels.join(" | ")}`);
  const legacy = (cw.children || []).find((k) => k.lane.account === "main");
  assert.equal(legacy.label, "(chưa gắn tài khoản)");
  assert.equal(legacy.conn.linked, false, "hàng chưa gắn phải bày nút liên kết");
  assert.equal(legacy.conn.account, "new", "nút phải mở KHE MỚI, không đè lên khe đang đăng nhập người khác");
  assert.equal(legacy.conn.who, undefined, "không mượn email của khe làm danh tính");
});

test("slotOfIdentity: một email ở hai khe ⇒ trả khe ĐANG NỐI, không trả khe cũ mất phiên", () => {
  // Đo 2026-08-29: chatgpt main (ok:false, zyrofrost) + chatgpt#2 (ok:true, zyrofrost) ⇒ hàng phải ✓ theo khe 2.
  const auth = { chatgpt: { ok: false, who: "z@x.com" }, "chatgpt#2": { ok: true, who: "z@x.com" } };
  assert.equal(slotOfIdentity(auth, "chatgpt", "z@x.com"), "2");
  const onlyOld = { chatgpt: { ok: false, who: "z@x.com" } };
  assert.equal(slotOfIdentity(onlyOld, "chatgpt", "z@x.com"), "main", "không khe nào nối thì vẫn trả khe có danh tính (để nút nối lại đúng khe)");
});

test("bỏ tick một lane ⇒ tin của lane đó KHÔNG vào hàng đợi embed và không tính 'còn lại'", async () => {
  // User chốt 2026-08-29: check = được lên GM VÀ được embed. Trước đây bỏ tick chỉ ngăn nạp.
  const { vectorRemaining } = await import("../../dist/memory/vectors.js");
  const { setScopeExclude } = await import("../../dist/config/settings.js");
  const db = openMemory(DB);
  try {
    db.prepare("DELETE FROM messages").run();
    db.prepare("DELETE FROM sessions").run();
    const ins = db.prepare("INSERT INTO sessions(id, source, origin, host, account, message_count) VALUES (?,?,?,?,?,?)");
    ins.run("s-in", "claude-web", "web", "M", "a@x.com", 1);
    ins.run("s-out", "claude-web", "web", "M", "b@x.com", 1);
    const im = db.prepare("INSERT INTO messages(session_id, uuid, role, content) VALUES (?,?,?,?)");
    im.run("s-in", "u1", "user", "giữ lại tin này để nhúng");
    im.run("s-out", "u2", "user", "tin của tài khoản bị bỏ tick");
  } finally {
    db.close();
  }
  setScopeExclude([]);
  assert.equal(vectorRemaining(DB), 2, "chưa loại gì ⇒ cả hai tin chờ nhúng");
  setScopeExclude([{ origin: "web", source: "claude-web", account: "b@x.com" }]);
  assert.equal(vectorRemaining(DB), 1, "bỏ tick tài khoản b ⇒ tin của nó rời hàng đợi");
  setScopeExclude([]);
});
