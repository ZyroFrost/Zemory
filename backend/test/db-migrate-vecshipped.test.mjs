// v22→v23 (2026-08-27): sổ `vec_shipped` phải được GIEO bằng mọi vector chính đang có.
//
// Vì sao gieo: không gieo thì lượt sync đầu sau nâng cấp coi ~290k vector là "chưa chở" và nối
// một khối ~900 MB rác. Vì sao chỉ hàng chính (rowid < 2^40): cửa sổ phụ (`vec_map`) đi theo tin
// của nó, không có sổ riêng. Ca âm: kho chưa từng nhúng ⇒ bảng rỗng, migration KHÔNG được ném.
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

const SYNTH_BASE = 2 ** 40;

/** Kho v23 chuẩn → HẠ về v22 (xoá sổ) để lối 22→23 chạy thật, không phải khởi tạo mới. */
function buildV22WithVectors(dbPath, n) {
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "H");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 0; i < n; i++) ins.run("s1", `u${i}`, "user", `tin ${i}`, "2026-01-01T00:00:00Z");
  const ids = db.prepare("SELECT id FROM messages ORDER BY id").all().map((r) => r.id);
  db.exec("DROP TABLE IF EXISTS vec_shipped");
  db.prepare("UPDATE schema_version SET version=22").run();
  db.close();

  const raw = new Database(dbPath);
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  raw.exec("CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[4])");
  const put = raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  for (const id of ids) put.run(BigInt(id), Buffer.from(new Float32Array([1, 0, 0, 0]).buffer));
  // một cửa sổ phụ (rowid tổng hợp) — KHÔNG được vào sổ
  put.run(BigInt(SYNTH_BASE + 7), Buffer.from(new Float32Array([0, 1, 0, 0]).buffer));
  raw.close();
  return ids;
}

test("v22→v23: gieo vec_shipped bằng đúng các vector CHÍNH đang có, bỏ cửa sổ phụ", (t) => {
  const dir = tempDir(t, "zemory-mig23-");
  const dbPath = join(dir, "m.db");
  const ids = buildV22WithVectors(dbPath, 5);

  const db = openMemory(dbPath); // chạy migrate 22→23
  assert.equal(db.prepare("SELECT version FROM schema_version LIMIT 1").get().version, 23);
  const seeded = db.prepare("SELECT message_id FROM vec_shipped ORDER BY message_id").all().map((r) => r.message_id);
  assert.deepEqual(seeded, ids, "sổ phải chứa đúng 5 id tin có vector chính");
  assert.ok(!seeded.some((x) => x >= SYNTH_BASE), "cửa sổ phụ KHÔNG được vào sổ");
  db.close();
});

test("CA ÂM: kho v22 CHƯA từng nhúng ⇒ migrate không ném, sổ rỗng", (t) => {
  const dir = tempDir(t, "zemory-mig23-novec-");
  const dbPath = join(dir, "m.db");
  const db0 = openMemory(dbPath);
  db0.exec("DROP TABLE IF EXISTS vec_shipped");
  db0.prepare("UPDATE schema_version SET version=22").run();
  db0.close();

  const db = openMemory(dbPath);
  assert.equal(db.prepare("SELECT version FROM schema_version LIMIT 1").get().version, 23);
  assert.equal(db.prepare("SELECT count(*) c FROM vec_shipped").get().c, 0, "không có vector thì sổ rỗng — không được bịa");
  db.close();
});
