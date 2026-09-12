// MỘT LƯỢT QUÉT PHẢI RA ĐÚNG SỐ CỦA BỐN LƯỢT RỜI.
//
// Bối cảnh (đo 2026-09-10, kho 3.092 MB): `/memory-status` mất 137–164 s, trong đó bốn phép quét
// toàn bảng chiếm 94%. Gộp lại còn 45 s (3,7×) — nhưng gộp là chỗ RẤT dễ đổi ngầm ý nghĩa, vì bốn
// hàm cũ KHÔNG dùng chung một định nghĩa:
//   · `covered` tính cả tin chỉ có CỬA SỔ PHỤ (`vec_map`) — `remaining`/`outOfScope` thì không.
//     Trên kho thật hai định nghĩa lệch đúng 2 hàng; fixture dưới dựng lại đúng ca đó.
//   · bộ lọc lane bỏ-tick chỉ áp cho `remaining`.
// Nên cổng này KHÔNG chấm bằng số tuyệt đối (chúng đổi theo `embedTools` của từng máy) mà chấm
// bằng phép so NGANG: gộp phải bằng rời, trên cùng một kho.
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as sqliteVec from "sqlite-vec";
import { openMemory } from "../../dist/memory/db.js";
import { runInMemoryChild, tempDir } from "./helpers.mjs";
import {
  hasVectorSql,
  memoryStats,
  noVectorYetSql,
  vecConnect,
  vectorCoverage,
  vectorOutOfScope,
  vectorRemaining,
} from "../../dist/memory/vectors.js";

const DIMS = 4;
const vecOf = (n) => Buffer.from(new Float32Array(Array.from({ length: DIMS }, () => n)).buffer);
const SYNTH_BASE = 2 ** 40;

/** Kho giả có ĐỦ ca biên: trong/ngoài phạm vi · có/không vector · rỗng · chỉ-có-cửa-sổ-phụ. */
function seed({ withVectors = true } = {}) {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-stats-")), "test.db");
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("s1", "claude-code", "C:\\demo", 6);
  const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, tool_name, timestamp) VALUES (?,?,?,?,?,?)");
  ins.run("s1", "u1", "user", "văn xuôi đã nhúng", null, "2026-09-10T00:00:00Z");        // id 1 — trong phạm vi, CÓ vector
  ins.run("s1", "u2", "user", "văn xuôi chưa nhúng", null, "2026-09-10T00:01:00Z");      // id 2 — trong phạm vi, CHƯA
  ins.run("s1", "u3", "assistant", "đường/dẫn/nào/đó", "Read", "2026-09-10T00:02:00Z");  // id 3 — NGOÀI phạm vi mặc định
  ins.run("s1", "u4", "assistant", "code thật ở đây", "Edit", "2026-09-10T00:03:00Z");   // id 4 — TRONG phạm vi (Edit)
  ins.run("s1", "u5", "user", "", null, "2026-09-10T00:04:00Z");                          // id 5 — rỗng, không ai đếm
  ins.run("s1", "u6", "user", "tin dài chỉ còn cửa sổ phụ", null, "2026-09-10T00:05:00Z");// id 6 — CHỈ có vec_map
  db.close();
  if (!withVectors) return dbPath;

  const v = new Database(dbPath);
  sqliteVec.load(v);
  v.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${DIMS}])`);
  v.exec("CREATE TABLE IF NOT EXISTS vec_map (rowid INTEGER PRIMARY KEY, message_id INTEGER NOT NULL, seq INTEGER NOT NULL)");
  const iv = v.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  iv.run(BigInt(1), vecOf(0.1));
  iv.run(BigInt(4), vecOf(0.2));
  // Ca lệch định nghĩa: tin 6 có cửa sổ phụ (rowid tổng hợp) nhưng KHÔNG có hàng ở chính id nó.
  iv.run(BigInt(SYNTH_BASE + 1), vecOf(0.3));
  v.prepare("INSERT INTO vec_map(rowid, message_id, seq) VALUES (?,?,?)").run(BigInt(SYNTH_BASE + 1), 6, 1);
  v.close();
  return dbPath;
}

/** Bốn hàm CŨ, gọi rời — đây là định nghĩa tham chiếu. */
const oldWay = (dbPath) => {
  const cov = vectorCoverage(dbPath);
  const db = new Database(dbPath);
  let chars;
  try { chars = Number(db.prepare("SELECT COALESCE(SUM(LENGTH(content)),0) AS c FROM messages").get().c); } finally { db.close(); }
  return { chars, embeddable: cov.embeddable, covered: cov.covered, remaining: vectorRemaining(dbPath), outOfScope: vectorOutOfScope(dbPath) };
};

test("MERGED = SEPARATE on an embedded store, including messages that only have a SIDE WINDOW", () => {
  const dbPath = seed();
  assert.deepEqual(memoryStats(dbPath), oldWay(dbPath), "năm con số phải khớp tuyệt đối");
  // Neo ca lệch định nghĩa: nếu `covered` bị hạ xuống dùng chung phép với `remaining` thì tin 6
  // rơi khỏi tử số. Không có neo này thì đột biến đó lọt (deepEqual vẫn khớp vì cả hai cùng sai).
  const s = memoryStats(dbPath);
  assert.equal(s.covered, 3, "tin 1 · 4 (vector gốc) và tin 6 (chỉ cửa sổ phụ) đều tính là ĐÃ phủ");
  assert.equal(s.remaining, 2, "tin 2 và tin 6 chưa có vector ở chính id ⇒ vẫn nằm trong hàng đợi nhúng");
});

test("MERGED = SEPARATE on a store that NEVER embedded - fail-open must match the old build exactly (constitution 9)", () => {
  const dbPath = seed({ withVectors: false });
  assert.deepEqual(memoryStats(dbPath), oldWay(dbPath), "không có bảng vector ⇒ vẫn phải trả số, không ném");
  assert.equal(memoryStats(dbPath).covered, 0, "chưa nhúng gì thì tử số là 0");
});

test("`chars` counts ALL content, unfiltered by embed scope", () => {
  const dbPath = seed();
  const db = new Database(dbPath);
  const all = Number(db.prepare("SELECT COALESCE(SUM(LENGTH(content)),0) AS c FROM messages").get().c);
  db.close();
  assert.equal(memoryStats(dbPath).chars, all, "ô Tokens nói về cả kho, không riêng phần đáng nhúng");
});

// 🔴 Ca này sinh ra vì một ĐỘT BIẾN SỐNG SÓT: bỏ hẳn bộ lọc lane bỏ-tick khỏi `remaining` mà
// ba ca trên vẫn xanh — máy chạy test không có lane nào bị loại nên `notExcluded` luôn là `(1=1)`,
// tức nhánh đó chưa từng bị soi. Bộ lọc phải chạy trong TIẾN TRÌNH CON: `getScopeExclude()` đọc
// `config.json` cạnh kho, mà kho mặc định là kho THẬT của người dùng (bẫy đã ghi 2026-09-10).
test("`remaining` MUST subtract the un-ticked lane - `covered`/`outOfScope` must NOT (old behaviour preserved)", (t) => {
  const root = tempDir(t, "zemory-stats-scope-");
  mkdirSync(join(root, "data"), { recursive: true });
  const steps = runInMemoryChild(root, `
    const { openMemory } = await import("file://" + process.env.Z_DIST + "/memory/db.js");
    const V = await import("file://" + process.env.Z_DIST + "/memory/vectors.js");
    const db = openMemory();
    db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("keep", "claude-code", "C:\\\\demo", 1);
    db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("drop", "codex", "C:\\\\demo", 1);
    const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, tool_name, timestamp) VALUES (?,?,?,?,?,?)");
    ins.run("keep", "a", "user", "tin cua lane duoc giu", null, "2026-09-10T00:00:00Z");
    ins.run("drop", "b", "user", "tin cua lane bi bo tick", null, "2026-09-10T00:01:00Z");
    db.close();
    out.push({ step: "before", stats: V.memoryStats(), remaining: V.vectorRemaining() });
    S.setScopeExclude([{ origin: "local", source: "codex" }]);
    out.push({ step: "after", stats: V.memoryStats(), remaining: V.vectorRemaining(), outOfScope: V.vectorOutOfScope() });
  `);
  const by = Object.fromEntries(steps.map((s) => [s.step, s]));
  assert.equal(by.before.stats.remaining, 2, "chưa loại lane nào ⇒ cả hai tin đều nằm trong hàng đợi");
  assert.equal(by.after.stats.remaining, 1, "bỏ tick lane codex ⇒ tin của nó RA KHỎI hàng đợi nhúng");
  assert.equal(by.after.stats.remaining, by.after.remaining, "gộp phải bằng rời cả khi có lane bị loại");
  // Ranh giới phải giữ: bộ lọc lane CHỈ áp cho `remaining`. Nắn nó sang hai số kia là đổi ý nghĩa.
  assert.equal(by.after.stats.embeddable, by.before.stats.embeddable, "`embeddable` không đổi theo lane bỏ tick");
  assert.equal(by.after.stats.outOfScope, by.after.outOfScope, "`outOfScope` cũng không đụng bộ lọc lane");
});

test("the 'already has a vector' test asks the SHADOW TABLE, and the two predicates are negations of each other", () => {
  const dbPath = seed();
  const db = vecConnect(dbPath);
  try {
    const yes = hasVectorSql(db);
    // vec0 trả lời một phép tra bằng cách nạp cả khối ~3 MB — đó là gốc của 456 GB/346 s đo 07/09.
    assert.match(yes, /vec_chunks_rowids/, "có bảng bóng thì PHẢI hỏi bảng bóng, không hỏi bảng ảo");
    assert.equal(noVectorYetSql(db), ` AND NOT ${yes}`, "một nguồn, một phủ định — không chép hai câu SQL song song");
  } finally {
    db.close();
  }
});
