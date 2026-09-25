// Chìa share CHÍNH LÀ danh tính, và nó phải do NGƯỜI mang vào từng máy.
//
// zemory local-only (điều 7 — không transmit gì ngoài bundle mã hoá do user chủ động sync)
// ⇒ không có server nào chứng thực "cùng một user". Mọi cơ chế enrollment tự động đều cần
// một bên thứ ba làm chứng; không có bên đó thì chìa phải đi qua tay người. Nếu máy mới tự
// lấy được chìa từ chỗ nào công khai thì kẻ khác cũng lấy được.
//
// Trước 2026-07-29 chỉ có `keygen` (sinh chìa MỚI) — KHÔNG có đường nhập chìa ĐANG CÓ, nên
// ở máy thứ hai người dùng phải tự đoán đường dẫn rồi tạo file bằng editor, và không có
// cách nào kiểm mình gõ đúng chưa. Lỗi thật của luồng mang-chìa-bằng-tay là GÕ SAI, mà gõ
// sai chỉ lộ ra dưới dạng "unable to authenticate data" sau khi import xong 254 MB.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setShareKey, shareKeyFingerprint, shareKeyPath } from "../../dist/memory/share.js";

const GOOD = "ngua-troi-banh-mi-ca-phe-sua-da-7";

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "zemory-key-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("shareKeyPath returns a path NEXT TO the DB, not inside the repo", () => {
  // "chìa ở data/" là câu nói SAI trên máy chưa relocate DB — ở đó DB nằm ~/.zemory/.
  const s = scratch();
  try {
    assert.equal(shareKeyPath(s.dir), join(s.dir, "share.key"));
  } finally {
    s.cleanup();
  }
});

test("fingerprint: the same key yields the same fingerprint, one character apart yields a completely different one", () => {
  assert.equal(shareKeyFingerprint(GOOD), shareKeyFingerprint(GOOD));
  assert.equal(shareKeyFingerprint(GOOD), shareKeyFingerprint(`  ${GOOD}\n`), "phải trim trước khi băm");
  assert.notEqual(shareKeyFingerprint(GOOD), shareKeyFingerprint(`${GOOD}8`));
  assert.match(shareKeyFingerprint(GOOD), /^[0-9a-f]{8}$/);
});

test("the fingerprint must NOT contain the key (it is for comparing, not a secret)", () => {
  const fp = shareKeyFingerprint(GOOD);
  assert.ok(!GOOD.includes(fp) && !fp.includes(GOOD.slice(0, 8)), "dấu tay không được là tiền tố của chìa");
});

test("key set writes the key to the standard path with mode 0600 and returns a matching fingerprint", () => {
  const s = scratch();
  try {
    const r = setShareKey(GOOD, { dbDir: s.dir });
    assert.equal(r.path, join(s.dir, "share.key"));
    assert.equal(r.fingerprint, shareKeyFingerprint(GOOD));
    assert.equal(r.replaced, false);
    assert.equal(readFileSync(r.path, "utf8").trim(), GOOD, "ghi nguyên văn (trim newline)");
    if (process.platform !== "win32") {
      assert.equal(statSync(r.path).mode & 0o777, 0o600, "chỉ chủ sở hữu đọc được");
    }
  } finally {
    s.cleanup();
  }
});

test("an EXISTING key must NOT be overwritten without --force", () => {
  // Đè chìa là làm mọi bundle cũ không giải được nữa — phải là hành động có ý thức.
  const s = scratch();
  try {
    setShareKey(GOOD, { dbDir: s.dir });
    assert.throws(() => setShareKey("chia-khac-hoan-toan-dai-du-16", { dbDir: s.dir }), /Đã có chìa/u);
    assert.equal(readFileSync(shareKeyPath(s.dir), "utf8").trim(), GOOD, "chìa cũ còn nguyên");
    // --force mới thay
    const r = setShareKey("chia-khac-hoan-toan-dai-du-16", { dbDir: s.dir, force: true });
    assert.equal(r.replaced, true);
    assert.equal(readFileSync(r.path, "utf8").trim(), "chia-khac-hoan-toan-dai-du-16");
  } finally {
    s.cleanup();
  }
});

test("it rejects an empty key, one that is too short, and one containing whitespace", () => {
  const s = scratch();
  try {
    assert.throws(() => setShareKey("", { dbDir: s.dir }), /rỗng/u);
    assert.throws(() => setShareKey("   \n ", { dbDir: s.dir }), /rỗng/u);
    assert.throws(() => setShareKey("ngan-qua", { dbDir: s.dir }), /quá ngắn/u);
    assert.throws(() => setShareKey("co khoang trang trong chia", { dbDir: s.dir }), /khoảng trắng/u);
    assert.equal(existsSync(shareKeyPath(s.dir)), false, "ca lỗi KHÔNG được để lại file");
  } finally {
    s.cleanup();
  }
});

test("a key entered on machine A and machine B with matching fingerprints can decrypt each other's bundles", () => {
  // Đây là bất biến của toàn bộ luồng đa máy: THỨ DUY NHẤT phải giống nhau là chuỗi chìa.
  // (zemory lưu salt TRONG bundle, nên không cần salt cố định như DuAnA phải làm.)
  const a = scratch();
  const b = scratch();
  try {
    const ra = setShareKey(GOOD, { dbDir: a.dir });
    const rb = setShareKey(`${GOOD}\n`, { dbDir: b.dir }); // gõ lại, có newline
    assert.equal(ra.fingerprint, rb.fingerprint, "cùng chìa ⇒ cùng dấu tay dù khác whitespace");
    assert.equal(readFileSync(ra.path, "utf8"), readFileSync(rb.path, "utf8"), "file ghi ra giống nhau");
  } finally {
    a.cleanup();
    b.cleanup();
  }
});

test("the 'no key yet' error must POINT THE WAY, not merely name a flag", () => {
  // Câu cũ: "Missing share key. Use --key-file <path> or set ZEMORY_SHARE_KEY." — kể 2 cờ mà
  // không nói chìa nằm ở đâu, nên ở máy thứ hai không ai biết bước kế tiếp.
  const src = readFileSync(new URL("../src/memory/share.ts", import.meta.url), "utf8");
  const i = src.indexOf("Chưa có chìa share.");
  assert.ok(i > 0, "share.ts phải có câu lỗi tiếng Việt chỉ đường");
  const block = src.slice(i, i + 500);
  assert.match(block, /memory keygen/u, "phải nhắc lệnh sinh chìa cho máy đầu");
  assert.match(block, /memory key set/u, "phải nhắc lệnh nhập chìa cho máy thứ hai");
  assert.match(block, /shareKeyPath\(\)/u, "phải in ĐƯỜNG chuẩn, không để người dùng đoán");
});

test("the CLI does not accept the key as an ARGUMENT (arguments land in history and in the transcript)", () => {
  const cli = readFileSync(new URL("../src/commands/memory.ts", import.meta.url), "utf8");
  const i = cli.indexOf('if (action === "set")');
  assert.ok(i > 0, "phải có nhánh `key set`");
  const block = cli.slice(i, i + 700);
  assert.match(block, /readFileSync\(0/u, "phải đọc STDIN (fd 0)");
  assert.ok(
    !/positionalArgs\(args\.slice\(1\)\)\[1\]/.test(block),
    "KHÔNG được lấy chìa từ đối số dòng lệnh",
  );
});

test("`key show` prints only the fingerprint - the source must never print the key value", () => {
  const cli = readFileSync(new URL("../src/commands/memory.ts", import.meta.url), "utf8");
  const i = cli.indexOf('if (action === "show"');
  const block = cli.slice(i, cli.indexOf('if (action === "path")'));
  assert.match(block, /st\.fingerprint/u, "phải in dấu tay");
  assert.ok(!/readFileSync\([^)]*share\.key/.test(block), "không được đọc rồi in nội dung chìa");
});

test("every rejection carries a machine-readable code, so the UI never parses the message text", () => {
  const s = scratch();
  try {
    const codeOf = (fn) => { try { fn(); return "none"; } catch (e) { return e.code; } };
    assert.equal(codeOf(() => setShareKey("   ", { dbDir: s.dir })), "empty");
    assert.equal(codeOf(() => setShareKey("short-key", { dbDir: s.dir })), "short");
    assert.equal(codeOf(() => setShareKey("has a space in it ok ok", { dbDir: s.dir })), "space");
    setShareKey(GOOD, { dbDir: s.dir });
    assert.equal(codeOf(() => setShareKey(GOOD + "x", { dbDir: s.dir })), "exists");
    assert.equal(codeOf(() => setShareKey(GOOD + "x", { dbDir: s.dir, force: true })), "none", "force still replaces");
  } finally {
    s.cleanup();
  }
});

test("UI key entry: POST body, one write path, fingerprint only, row stays live when the channel is off", () => {
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const ep = ui.slice(ui.indexOf('p === "/share-key"'), ui.indexOf('p === "/channel-pair"'));
  assert.ok(ep.length > 0, "endpoint /share-key missing");
  assert.match(ui, /req\.method === "POST" && p === "\/share-key"/, "key entry must be POST only");
  assert.match(ep, /for await \(const c of req\)/, "the key travels in the BODY, not the query string");
  assert.doesNotMatch(ep, /searchParams\.get\("key"\)/, "negative: the key must never be read from the URL");
  assert.match(ep, /setShareKey\(/, "same write path as `zemory memory key set`");
  assert.doesNotMatch(ep, /json\(res, \{[^}]*\bkey\b\s*:/, "negative: the response must never echo the key");
  assert.match(ui, /shareKey: await[\s\S]{0,200}fingerprint/, "status reports the fingerprint");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  assert.match(gm, /fetch\('\/share-key'.{0,60}\{method:'POST',body:inp\.value\}/, "UI posts the key in the body");
  assert.match(gm, /type="password"/, "the key input hides what is typed");
  assert.match(gm, /ch\.classList\.toggle\('frozen',!p2pOn&&!ch\.hasAttribute\('data-live'\)\)/, "the key row is exempt from the channel-off freeze");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  assert.match(html, /id="p2pKeyRow" data-live/, "key row is marked live");
});
