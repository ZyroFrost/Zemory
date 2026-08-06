// `touches` (plan 13 §4) — cạnh graph ↔ MEMORY: phiên nào từng đụng file nào.
//
// Đo 2026-08-06 trên repo thật: touch index 65 file · node graph 174 · **giao nhau 0**.
// Không phải index hỏng — digest ghi đường của BỐ CỤC CŨ (`src/` trước khi dời sang
// `backend/src/` ngày 08/07). Lịch sử phiên không viết lại được, nên phải khớp lại lúc ĐỌC.
// Test khoá hai điều: tầng khớp-lại có CHẠY, và nó KHÔNG giả dạng khớp chính xác (điều 13).

import assert from "node:assert/strict";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { buildTouchIndex, touchesFor } from "../../dist/memory/graph/graph-memory.js";
import { tempDir } from "./helpers.mjs";
import { join } from "node:path";

/** Một digest giả với project_root + danh sách path, đúng khuôn bảng thật. */
function seedDigest(dbPath, sessionId, projectRoot, paths) {
  const db = openMemory(dbPath);
  try {
    db.prepare("INSERT OR IGNORE INTO sessions (id, source, origin) VALUES (?,'claude-code','local')").run(sessionId);
    db.prepare(
      `INSERT INTO session_digest (session_id, tasks, paths, decisions, errors, outcome, meta, source_sig, kind, updated_at)
       VALUES (?, '[]', ?, '[]', '[]', '', ?, 'sig', 'extractive', '2026-08-06T00:00:00Z')
       ON CONFLICT(session_id) DO UPDATE SET paths=excluded.paths, meta=excluded.meta`,
    ).run(sessionId, JSON.stringify(paths), JSON.stringify({ project_root: projectRoot }));
  } finally {
    db.close();
  }
}

test("touches: khớp CHÍNH XÁC được gắn nhãn exact", (t) => {
  const dbPath = join(tempDir(t, "ztouch-"), "m.db");
  const root = "D:/proj/app";
  seedDigest(dbPath, "s-exact", root, [root, `${root}/backend/src/cli.ts`]);

  const idx = buildTouchIndex(root, dbPath);
  const hit = touchesFor(idx, "backend/src/cli.ts");
  assert.equal(hit.count, 1);
  assert.equal(hit.match, "exact");
});

test("touches: đường của BỐ CỤC CŨ vẫn nối được, nhưng nhãn phải là `moved`", (t) => {
  const dbPath = join(tempDir(t, "ztouch-"), "m.db");
  const root = "D:/proj/app";
  // Phiên cũ ghi `src/cli.ts` — repo nay đã dời sang `backend/src/cli.ts`.
  seedDigest(dbPath, "s-old", root, [root, `${root}/src/cli.ts`]);

  const idx = buildTouchIndex(root, dbPath);
  const hit = touchesFor(idx, "backend/src/cli.ts");
  assert.equal(hit.count, 1, "không nối được thì độ phủ đứng ở 0% vĩnh viễn");
  assert.equal(hit.match, "moved", "PHẢI gắn nhãn — suy luận không được giả dạng khai báo (điều 13)");

  // Người gọi chỉ muốn cạnh chắc chắn thì phải tắt được tầng suy luận.
  const strict = touchesFor(idx, "backend/src/cli.ts", { includeMoved: false });
  assert.equal(strict.count, 0);
  assert.equal(strict.match, "none");
});

test("touches: khớp đuôi phải cắt đúng ranh giới thư mục, không khớp bừa", (t) => {
  const dbPath = join(tempDir(t, "ztouch-"), "m.db");
  const root = "D:/proj/app";
  seedDigest(dbPath, "s-1", root, [root, `${root}/rc/cli.ts`]);

  const idx = buildTouchIndex(root, dbPath);
  // `rc/cli.ts` KHÔNG được coi là đuôi của `backend/src/cli.ts` (chuỗi thì trùng, thư mục thì không).
  assert.equal(touchesFor(idx, "backend/src/cli.ts").count, 0, "trùng ký tự cuối KHÔNG phải trùng đường");
});

test("touches: cùng repo trên máy KHÁC (đường tuyệt đối khác) vẫn khớp qua tên folder", (t) => {
  const dbPath = join(tempDir(t, "ztouch-"), "m.db");
  // Digest sinh ra ở máy cũ, đường hoàn toàn khác — chỉ tên folder cuối là chung.
  seedDigest(dbPath, "s-other", "D:/Zyro/Tool/app", ["D:/Zyro/Tool/app", "D:/Zyro/Tool/app/backend/src/cli.ts"]);

  const idx = buildTouchIndex("D:/huy.nguyen/Tool/app", dbPath);
  assert.equal(idx.digests, 1, "khớp xuyên máy bằng TÊN FOLDER — bỏ vế này là mất hết phiên máy cũ");
  assert.equal(touchesFor(idx, "backend/src/cli.ts").count, 1);
});
