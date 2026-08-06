// Scope áp NGAY LÚC NẠP (plan 08 §4 — điểm thứ ba, treo từ 2026-07-10).
//
// Trước bản này `scan`/`scan-web` nạp TOÀN BỘ rồi mới lọc ở recall/sync — nên "bỏ máy công
// ty ra khỏi bộ nhớ riêng" vẫn để nguyên dữ liệu đó nằm trong kho, chỉ là không hiện lên
// khi tìm. Test khoá đúng khác biệt đó: lane bị loại thì KHÔNG có hàng nào trong DB.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { scan, scanOneFile } from "../../dist/memory/ingest.js";
import { tempDir } from "./helpers.mjs";

/** Một store claude-code giả: `<home>/.claude/projects/<proj>/<id>.jsonl`. */
function seedTranscript(home, sessionId, lines) {
  const dir = join(home, ".claude", "projects", "D--proj");
  mkdirSync(dir, { recursive: true });
  const p = join(dir, `${sessionId}.jsonl`);
  writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return p;
}

const msg = (uuid, text) => ({
  type: "user",
  uuid,
  sessionId: "s",
  cwd: "D:\\proj",
  timestamp: "2026-08-01T00:00:00.000Z",
  message: { role: "user", content: text },
});

const countMessages = (dbPath) => {
  const db = openMemory(dbPath);
  try {
    return db.prepare("SELECT COUNT(*) c FROM messages").get().c;
  } finally {
    db.close();
  }
};

test("scan: lane bị loại thì KHÔNG có gì vào kho (không phải lọc-sau)", (t) => {
  const home = tempDir(t, "zscope-home-");
  const dbPath = join(tempDir(t, "zscope-db-"), "m.db");
  seedTranscript(home, "aaaaaaaa-1111-2222-3333-444444444444", [msg("u1", "xin chào"), msg("u2", "tin thứ hai")]);

  // Nạp bình thường trước — để chắc chắn fixture ĐÚNG (không thì test xanh vì lý do sai).
  const open = scan({ dbPath, home });
  assert.ok(countMessages(dbPath) > 0, "fixture phải nạp được khi không loại lane nào");
  assert.deepEqual(open.skippedLanes, []);

  // Kho mới, lần này loại lane claude-code.
  const dbPath2 = join(tempDir(t, "zscope-db2-"), "m.db");
  const r = scan({ dbPath: dbPath2, home, excludeLanes: [{ source: "claude-code" }] });
  assert.equal(countMessages(dbPath2), 0, "lane bị loại KHÔNG được để lại hàng nào trong kho");
  assert.equal(r.skippedLanes.length, 1, "và phải BÁO ra, không cắt âm thầm");
  assert.match(r.skippedLanes[0].lane, /claude-code/);
  assert.ok(r.skippedLanes[0].files > 0);
});

test("bỏ qua KHÔNG ghi ingest_state ⇒ lấy lại lane thì lần quét sau nạp đủ", (t) => {
  const home = tempDir(t, "zscope-home-");
  const dbPath = join(tempDir(t, "zscope-db-"), "m.db");
  seedTranscript(home, "bbbbbbbb-1111-2222-3333-444444444444", [msg("u1", "một"), msg("u2", "hai")]);

  scan({ dbPath, home, excludeLanes: [{ source: "claude-code" }] });
  assert.equal(countMessages(dbPath), 0);

  // Exclude là BỘ LỌC, không phải xoá (HP điều 11) — bỏ lọc ra thì dữ liệu phải quay lại đủ.
  const back = scan({ dbPath, home });
  assert.equal(countMessages(dbPath), 2, "không được kẹt vì con trỏ ingest_state đã bị đánh dấu");
  assert.deepEqual(back.skippedLanes, []);
});

test("scanOneFile (đường hook per-message) áp CÙNG bộ lọc — không thì cửa nóng nhất vẫn hở", (t) => {
  const home = tempDir(t, "zscope-home-");
  const dbPath = join(tempDir(t, "zscope-db-"), "m.db");
  const file = seedTranscript(home, "cccccccc-1111-2222-3333-444444444444", [msg("u1", "một")]);

  const blocked = scanOneFile(file, { dbPath, excludeLanes: [{ source: "claude-code" }] });
  assert.equal(blocked.ingested, false, "hook chạy mỗi lượt trả lời — hở đây là hở liên tục");
  assert.equal(countMessages(dbPath), 0);

  const allowed = scanOneFile(file, { dbPath });
  assert.equal(allowed.ingested, true, "không loại thì vẫn phải nạp bình thường");
  assert.equal(countMessages(dbPath), 1);
});

test("lane KHÁC không bị vạ lây", (t) => {
  const home = tempDir(t, "zscope-home-");
  const dbPath = join(tempDir(t, "zscope-db-"), "m.db");
  seedTranscript(home, "dddddddd-1111-2222-3333-444444444444", [msg("u1", "một")]);

  // Loại một lane KHÔNG tồn tại trong fixture ⇒ mọi thứ phải nạp như thường.
  const r = scan({ dbPath, home, excludeLanes: [{ source: "codex" }] });
  assert.equal(countMessages(dbPath), 1);
  assert.deepEqual(r.skippedLanes, [], "không có file nào của lane đó thì không có gì để báo");
});
