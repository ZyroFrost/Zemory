// CÂY NGUỒN PHẢI NÓI ĐÚNG THỨ KHO ĐANG GIỮ — đo HÀNH VI, không soi chuỗi source.
//
// Ca thật (user nhìn ra bằng mắt 2026-09-11, ảnh chụp cây Nguồn): `m365copilot-web` **6 phiên ·
// 116 tin** mà mang ⚠ và nhãn *"(chưa gắn tài khoản)"*, trong khi kho ghi
// `webAuth.m365copilot = {ok:true, who:"Nguyễn Đức Huy - CNTT"}`. Cơ chế: danh tính của nền này
// KHÔNG PHẢI email nên `accountKey` lùi về TÊN KHE ⇒ phiên đóng dấu `account='main'`; vòng auth
// gặp hàng `main` đã tồn tại thì bỏ qua ⇒ không đánh dấu nguồn gốc ⇒ nhãn rơi vào ô "chưa biết là
// ai" ⇒ `linked:false` ⇒ ⚠. Nghịch lý: **càng kéo được dữ liệu, bề mặt càng báo động.**
//
// Chạy trong TIẾN TRÌNH CON có kho + config RIÊNG: `scopeTree` đọc `webAuth` của MÁY THẬT, nên một
// ca in-process sẽ xanh/đỏ theo việc máy người chạy đã nối gì (bẫy đã ghi `05_TODO` 2026-09-10).
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const DIST = new URL("../../dist", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

/** Kho tạm + config tạm; trả về cây Nguồn do chính `scopeTree()` dựng. */
function treeFor({ source, account, who, sessions = 2 }) {
  const root = mkdtempSync(join(tmpdir(), "zm-scope-"));
  const data = join(root, "data");
  mkdirSync(data, { recursive: true });
  const dbPath = join(data, "global_memory.db");

  // Kho: dựng bằng CHÍNH schema của repo (migration thật), rồi chèn phiên + tin.
  const boot = spawnSync(process.execPath, ["--input-type=module", "-e",
    'const { openMemory } = await import("file://" + process.env.Z_DIST + "/memory/db.js");\n' +
    'const db = openMemory(process.env.GLOBAL_MEMORY_DB); db.close();'],
    { encoding: "utf8", env: { ...process.env, Z_DIST: DIST, GLOBAL_MEMORY_DB: dbPath } });
  if (boot.status !== 0) throw new Error("khong dung duoc kho tam: " + String(boot.stderr).slice(0, 500));

  const db = new Database(dbPath);
  const ins = db.prepare(
    "INSERT INTO sessions (id, source, origin, host, account, title, started_at, ended_at, message_count) VALUES (?,?,?,?,?,?,?,?,?)",
  );
  const insM = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 0; i < sessions; i++) {
    const sid = `${source}-s${i}`;
    ins.run(sid, source, "web", "TESTHOST", account, `phiên ${i}`, "2026-09-01T00:00:00Z", "2026-09-01T01:00:00Z", 2);
    insM.run(sid, `u${i}a`, "user", "hỏi", "2026-09-01T00:00:00Z");
    insM.run(sid, `u${i}b`, "assistant", "đáp", "2026-09-01T00:30:00Z");
  }
  db.close();

  // Config: khe đã đăng nhập, danh tính đúng như nền trả về.
  const plat = source.replace(/-(web|cowork)$/u, "");
  writeFileSync(join(data, "config.json"), JSON.stringify({
    webAuth: { [plat]: { ok: true, at: "2026-09-11T09:26:29.956Z", who } },
    webPull: { [plat]: { at: "2026-09-11T09:26:29.960Z", ok: true, status: "done", pulled: sessions } },
  }), "utf8");
  // Khe trình duyệt `main` phải TỒN TẠI — `webSlotsOf` đọc thư mục, không đọc config.
  mkdirSync(join(data, "browser", plat), { recursive: true });

  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    'const { scopeTree } = await import("file://" + process.env.Z_DIST + "/memory/scope.js");\n' +
    "process.stdout.write(JSON.stringify(scopeTree()));"],
    { encoding: "utf8", env: { ...process.env, Z_DIST: DIST, GLOBAL_MEMORY_DB: dbPath, ZEMORY_HOME: root } });
  if (r.status !== 0) throw new Error("con lỗi: " + String(r.stderr).slice(0, 700));
  return JSON.parse(r.stdout);
}

/** Tìm hàng TÀI KHOẢN của một nguồn trong cây (bất kể cây lồng mấy tầng). */
function accountRows(tree, source) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n.key && n.key.includes(`s=${source}`) && !n.key.endsWith("a=*")) out.push(n);
    for (const c of n.children || []) walk(c);
  };
  for (const n of Array.isArray(tree) ? tree : [tree]) walk(n);
  return out;
}

test("a non-email identity (M365, GitHub): a row with a session must carry the NAME and no warning", () => {
  const tree = treeFor({ source: "m365copilot-web", account: "main", who: "Nguyễn Đức Huy - CNTT", sessions: 2 });
  const rows = accountRows(tree, "m365copilot-web");
  assert.ok(rows.length, "phải có hàng tài khoản");
  const withData = rows.find((r) => (r.sessions ?? 0) > 0);
  assert.ok(withData, "phải có hàng mang phiên");
  assert.equal(withData.label, "Nguyễn Đức Huy - CNTT", "hàng có dữ liệu phải mang danh tính nền trả về");
  assert.notEqual(withData.label, "(chưa gắn tài khoản)");
  assert.notEqual(withData.linked, false, "khe đang nối mà báo linked:false là dấu ⚠ oan");
});

test("NEGATIVE CASE - a platform returning an EMAIL: sessions left under the SLOT NAME key still read as 'no account attached'", () => {
  // Ở nền email, `restampAccount` đã dời phiên của tài khoản hiện tại sang hàng email; phần còn
  // lại dưới `main` là phiên nền KHÔNG liệt kê (đã xoá / của tài khoản trước). Dán email người
  // đang đăng nhập lên đó là bịa danh tính — user cấm 2026-08-28.
  const tree = treeFor({ source: "chatgpt-web", account: "main", who: "ai-do@example.com", sessions: 2 });
  const rows = accountRows(tree, "chatgpt-web");
  const withData = rows.find((r) => (r.sessions ?? 0) > 0);
  assert.ok(withData, "phải có hàng mang phiên");
  assert.notEqual(withData.label, "ai-do@example.com", "KHÔNG được dán email hiện tại lên phiên không rõ chủ");
});
