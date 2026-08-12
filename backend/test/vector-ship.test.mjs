// VECTOR ĐI CÙNG GÓI (user chốt 2026-08-12): *"sync qua máy khác mà máy khác không RAG được
// thì có tác dụng gì"*.
//
// Trước đó gói chỉ chở NGUỒN (sessions · messages · known_stores), nên máy nhận có đủ chữ mà
// recall rơi về FTS cho tới khi nhúng lại xong — đo trên kho thật: FTS-thuần @10 26% nghiêm /
// 50% tương đương, hybrid 38% / 71%. Mất hơn một nửa, đúng phần "hiểu ý câu hỏi".
//
// Vector không đi theo được bằng id vì `messages.id` là AUTOINCREMENT CỤC BỘ — cùng một tin ở
// hai máy mang hai id khác nhau. Nên nó đi theo (session_id, uuid) và bên nhận tra id của mình.
// Ba bất biến khoá ở đây:
//   ① vector tới được máy nhận và gắn ĐÚNG tin (không lệch hàng);
//   ② lệch cấu hình nhúng ⇒ TỪ CHỐI kèm lý do, không trộn hai không gian vector;
//   ③ gói không có vector ⇒ tin vẫn vào đủ (fail-open).

import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { openMemory } from "../../dist/memory/db.js";
import { exportMemoryBundle, mergeMemoryBundle, writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

const DIMS = 8; // vector giả, nhỏ — test này kiểm ĐƯỜNG ĐI của vector, không kiểm chất lượng nhúng

/** Dựng một kho có tin + vector, KHÔNG gọi model (model thật làm test chậm và giòn). */
function seedStore(path, msgs, meta = { dims: DIMS, profile: "gemma-prompt-v1", dtype: "fp32" }) {
  const db = openMemory(path);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:\\proj", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (const m of msgs) ins.run("s1", m.uuid, "user", m.text, "2026-01-01T00:00:00Z");
  const ids = db.prepare("SELECT id, uuid FROM messages ORDER BY id").all();
  db.close();

  const raw = new Database(path);
  sqliteVec.load(raw);
  // BẪY vec0 (đã trả giá ở `salvageVectors`, và tôi vẫn dẫm lại khi viết test này): nó TỪ CHỐI
  // số float64 làm khoá chính — "Only integers are allows for primary key values". better-sqlite3
  // bind JS number thành float64 trừ khi bật safeIntegers ⇒ phải bật + truyền BigInt.
  raw.defaultSafeIntegers(true);
  raw.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${meta.dims}])`);
  raw.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER, profile TEXT, dtype TEXT)");
  raw.prepare("INSERT INTO vec_config (dims, profile, dtype) VALUES (?,?,?)").run(meta.dims, meta.profile, meta.dtype);
  const put = raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  for (const [i, r] of ids.entries()) {
    const v = new Float32Array(meta.dims).fill(0);
    v[i % meta.dims] = 1; // mỗi tin một hướng riêng ⇒ gắn lệch hàng là lộ ngay
    put.run(BigInt(r.id), Buffer.from(v.buffer));
  }
  raw.close();
  return ids;
}

/** Vector đang gắn cho tin có uuid này, đọc từ kho — dạng mảng số để so trực tiếp. */
function vectorOf(path, uuid) {
  const raw = new Database(path, { readonly: true });
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  try {
    const row = raw.prepare("SELECT m.id AS id FROM messages m WHERE m.uuid = ?").get(uuid);
    if (!row) return null;
    const v = raw.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?").get(row.id);
    return v ? Array.from(new Float32Array(v.embedding.buffer, v.embedding.byteOffset, DIMS)) : null;
  } catch {
    return null;
  } finally {
    raw.close();
  }
}

test("vector đi cùng gói và gắn ĐÚNG tin ở máy nhận (id hai máy lệch nhau)", async (t) => {
  const root = tempDir(t, "zemory-vecship-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedStore(A, [
    { uuid: "u-alpha", text: "câu về mạng và cấu hình" },
    { uuid: "u-beta", text: "câu về vector và recall" },
    { uuid: "u-gamma", text: "câu về sao lưu" },
  ]);

  // Máy B đã có sẵn tin RIÊNG ⇒ id của nó lệch hẳn máy A. Đây là điều kiện làm lộ lỗi
  // "chở id sang máy khác": nếu chở id thì vector sẽ gắn nhầm vào mấy tin này.
  const bDb = openMemory(B);
  bDb.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("sB", "claude-code", "local", "C:\\other", "PC2");
  const insB = bDb.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 0; i < 17; i++) insB.run("sB", `b-${i}`, "user", `tin rieng cua B ${i}`, "2026-01-01T00:00:00Z");
  bDb.close();

  const bundle = join(root, "b1.enc");
  await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });

  assert.equal(r.messagesAdded, 3, "tin phải sang đủ");
  assert.equal(r.vectorsApplied, 3, "và vector phải sang cùng — đây là cả mục đích");

  // Gắn đúng hàng: mỗi tin có một hướng riêng, so nguyên vector giữa hai máy.
  for (const uuid of ["u-alpha", "u-beta", "u-gamma"]) {
    assert.deepEqual(vectorOf(B, uuid), vectorOf(A, uuid), `vector của ${uuid} phải khớp máy nguồn`);
  }
});

// 🔴 CA HỒI QUY QUAN TRỌNG NHẤT FILE NÀY — id trong gói là ID GIẢ.
// `buildRowsSnapshot` cố ý KHÔNG chép cột `id`, nên tin trong gói được đánh số lại TỪ 1. Bản
// đầu của `shipVectorsInto` lấy id snapshot đem tra `vec_chunks` của kho nguồn ⇒ trên kho thật
// chỉ chở **51.349/208.612 = 25%**, `rejected=0`, không log nào báo.
// Ba ca kia KHÔNG bắt được vì ở quy mô nhỏ id nguồn (1,2,3) TÌNH CỜ trùng id snapshot (1,2,3).
// Ca này phá đúng sự trùng hợp đó: ép id nguồn bắt đầu từ 5000.
test("id trong gói là ID GIẢ — vector vẫn phải sang đủ khi id nguồn KHÔNG trùng id gói", async (t) => {
  const root = tempDir(t, "zemory-vecship-id-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  const db = openMemory(A);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES ('s1','claude-code','local','C:\\\\p','PC',0)").run();
  const ins = db.prepare("INSERT INTO messages (id, session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?,?)");
  for (let i = 0; i < 3; i++) ins.run(5000 + i, "s1", `u-${i}`, "user", `tin so ${i}`, "2026-01-01T00:00:00Z");
  db.close();

  const raw = new Database(A);
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  raw.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${DIMS}])`);
  raw.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER, profile TEXT, dtype TEXT)");
  raw.prepare("INSERT INTO vec_config (dims, profile, dtype) VALUES (?,?,?)").run(DIMS, "gemma-prompt-v1", "fp32");
  const put = raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  for (let i = 0; i < 3; i++) {
    const v = new Float32Array(DIMS).fill(0);
    v[i] = 1;
    put.run(BigInt(5000 + i), Buffer.from(v.buffer));
  }
  raw.close();

  const bundle = join(root, "b1.enc");
  await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });
  assert.equal(r.messagesAdded, 3);
  assert.equal(r.vectorsApplied, 3, "id gói ≠ id nguồn thì vector VẪN phải sang đủ — đây là ca đã mất 75% trên kho thật");
  for (let i = 0; i < 3; i++) assert.deepEqual(vectorOf(B, `u-${i}`), vectorOf(A, `u-${i}`));
});

// 🔴 CA HỒI QUY — lỗi thật, đo trên kho thật trước khi vá: chở được **45.837/227.226 = 20%**
// vector mà không một dòng log nào báo. Nguyên nhân: 11.233 tin (4,7%) có `uuid = NULL`, bảng
// chở khai `msg_uuid NOT NULL`, mà lại ghi theo LÔ 500 trong MỘT giao dịch ⇒ đúng một tin NULL
// giết cả lô. Hai bài học nằm trong một ca: bỏ tin không định danh được, VÀ đừng để một hàng
// hỏng kéo cả lô đi.
test("một tin uuid=NULL KHÔNG được làm mất vector của những tin khác cùng lô", async (t) => {
  const root = tempDir(t, "zemory-vecship-null-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedStore(A, [
    { uuid: "u-truoc", text: "tin truoc tin hong" },
    { uuid: "u-sau", text: "tin sau tin hong" },
  ]);
  // Chen một tin uuid=NULL vào GIỮA, kèm vector — y như kho thật.
  const db = openMemory(A);
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES ('s1',NULL,'user','tin khong co uuid','2026-01-01T00:00:00Z')").run();
  const nullId = db.prepare("SELECT id FROM messages WHERE uuid IS NULL").get().id;
  db.close();
  const raw = new Database(A);
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  const v = new Float32Array(DIMS).fill(0);
  v[3] = 1;
  raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)").run(BigInt(nullId), Buffer.from(v.buffer));
  raw.close();

  const bundle = join(root, "b1.enc");
  await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });

  assert.equal(r.messagesAdded, 3, "cả ba tin vẫn phải sang");
  // 🔄 ĐỔI so với bản đầu (đòi 2): tin `uuid=NULL` nay ĐƯỢC chở, định danh bằng băm
  // (mốc thời gian + nội dung) — thứ giống nhau trên mọi máy. Bỏ chúng là đẩy ~3,9 giờ
  // nhúng lại sang mỗi máy mới, trái mục đích của cả lớp chở vector này.
  assert.equal(r.vectorsApplied, 3, "cả tin uuid=NULL cũng phải có vector — máy mới KHÔNG được nhúng lại gì");
  assert.deepEqual(vectorOf(B, "u-truoc"), vectorOf(A, "u-truoc"));
  assert.deepEqual(vectorOf(B, "u-sau"), vectorOf(A, "u-sau"));

  // Và tin NULL phải gắn ĐÚNG hàng — tra bằng nội dung, vì nó không có uuid để tra.
  const idOf = (p) => {
    const d = new Database(p, { readonly: true });
    try {
      return d.prepare("SELECT id FROM messages WHERE uuid IS NULL").get().id;
    } finally {
      d.close();
    }
  };
  const vecAt = (p, id) => {
    const d = new Database(p, { readonly: true });
    sqliteVec.load(d);
    d.defaultSafeIntegers(true);
    try {
      const v = d.prepare("SELECT embedding FROM vec_chunks WHERE rowid = ?").get(BigInt(id));
      return v ? Array.from(new Float32Array(v.embedding.buffer, v.embedding.byteOffset, DIMS)) : null;
    } finally {
      d.close();
    }
  };
  assert.deepEqual(vecAt(B, idOf(B)), vecAt(A, idOf(A)), "vector của tin không-uuid phải khớp, không được lệch hàng");
});

test("lệch cấu hình nhúng ⇒ TỪ CHỐI vector kèm lý do, tin vẫn vào đủ", async (t) => {
  const root = tempDir(t, "zemory-vecship-cfg-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedStore(A, [{ uuid: "u1", text: "tin nguon" }], { dims: DIMS, profile: "gemma-prompt-v1", dtype: "fp32" });
  seedStore(B, [{ uuid: "b1", text: "tin cua B" }], { dims: DIMS, profile: "gemma-prompt-v1", dtype: "q8" }); // KHÁC dtype

  const bundle = join(root, "b1.enc");
  await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });

  assert.equal(r.messagesAdded, 1, "tin vẫn phải vào — từ chối vector KHÔNG được chặn dữ liệu");
  assert.equal(r.vectorsApplied, 0, "không được nhận vector khác không gian");
  assert.match(r.vectorsSkippedReason ?? "", /cấu hình nhúng khác/, "phải NÓI RA vì sao, đừng bỏ im lặng");
  assert.equal(vectorOf(B, "u1"), null, "tin mới không được mang vector lạ");
});

test("kho nguồn chưa nhúng ⇒ gói không có vector, merge vẫn chạy đủ (fail-open)", async (t) => {
  const root = tempDir(t, "zemory-vecship-none-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  const db = openMemory(A);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:\\p", "PC");
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run("s1", "u1", "user", "tin khong vector", "2026-01-01T00:00:00Z");
  db.close();

  const bundle = join(root, "b1.enc");
  await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });
  assert.equal(r.messagesAdded, 1);
  assert.equal(r.vectorsApplied ?? 0, 0, "không có gì để chở thì thôi, không được vỡ");
});
