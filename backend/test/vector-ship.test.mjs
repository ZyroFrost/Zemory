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

// ─────────────────────────────────────────────────────────────────────────────
// RANH GIỚI ĐÃ NHÚNG — tin và vector phải đi CÙNG CHUYẾN (HP điều 16).
//
// Lỗ đã đo 2026-08-25 bằng diễn tập phục hồi: gói chở vector KÈM đợt tin mới (cùng dải
// `id > watermark`), mà nhúng chạy SAU tin ~30 phút ⇒ lúc gói đi tin chưa có vector, khi
// vector có thì id đã nằm dưới watermark và KHÔNG lượt nào quay lại chở. Kho dựng từ kênh
// chung thiếu **~22.000 vector** so với kho gốc ⇒ máy nhận phải nhúng lại 27.035 tin (~12
// giờ). Bệnh từng cắn thật: 13/08 máy kia merge xong còn 137.063 tin cần nhúng.
//
// Vá: gói DỪNG ngay trước tin đầu tiên chưa nhúng. Hai ca ÂM ở dưới quan trọng ngang ca
// dương — chặn nhầm ở đây làm đường sync ĐỨNG HẲN, tệ hơn cả lỗi đang vá.

/** Kho có `n` tin với dấu thời gian tự chọn; nhúng đúng những tin trong `embed`. */
function seedPartial(path, msgs, meta = { dims: DIMS, profile: "gemma-prompt-v1", dtype: "fp32" }) {
  const db = openMemory(path);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (const m of msgs) ins.run("s1", m.uuid, "user", m.text, m.ts);
  const ids = db.prepare("SELECT id, uuid FROM messages ORDER BY id").all();
  db.close();

  const raw = new Database(path);
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  raw.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${meta.dims}])`);
  raw.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER, profile TEXT, dtype TEXT)");
  raw.prepare("INSERT INTO vec_config (dims, profile, dtype) VALUES (?,?,?)").run(meta.dims, meta.profile, meta.dtype);
  const put = raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  for (const [i, r] of ids.entries()) {
    if (!msgs[i].embedded) continue;
    const v = new Float32Array(meta.dims).fill(0);
    v[i % meta.dims] = 1;
    put.run(BigInt(r.id), Buffer.from(v.buffer));
  }
  raw.close();
  return ids;
}

const nowIso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();

test("tin MỚI chưa nhúng thì gói DỪNG lại trước nó — không gửi chữ bỏ rơi vector", async (t) => {
  const root = tempDir(t, "zemory-vecship-frontier-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedPartial(A, [
    { uuid: "u1", text: "tin mot da nhung", ts: nowIso(3000), embedded: true },
    { uuid: "u2", text: "tin hai da nhung", ts: nowIso(2000), embedded: true },
    { uuid: "u3", text: "tin ba CHUA nhung", ts: nowIso(1000), embedded: false },
  ]);

  // DELTA (`sinceMessageId > 0`) — đây là đường sync thường ngày, và là chỗ DUY NHẤT chặn-trên
  // được phép áp. Gói THAY THẾ (`since = 0`) có ca riêng bên dưới: nó phải chở ĐỦ.
  const bundle = join(root, "b1.enc");
  const e = await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true, sinceMessageId: 1 });
  assert.equal(e.rows?.messages, 1, "chỉ tin #2 (đã nhúng) được đi; tin #3 phải chờ vector của nó");
  assert.equal(e.rows?.maxMessageId, 2, "watermark chỉ được nhảy tới ID ĐÃ GỬI — nhảy quá là bỏ rơi tin #3 vĩnh viễn");

  const r = await mergeMemoryBundle({ bundlePath: bundle, dbPath: B, keyFile: keyPath });
  assert.equal(r.messagesAdded, 1);
  assert.equal(r.vectorsApplied, 1, "tin đi kèm đúng vector của mình");
});

test("CA ÂM: tin CŨ chưa nhúng KHÔNG được chặn — chặn là đường sync đứng vĩnh viễn", async (t) => {
  const root = tempDir(t, "zemory-vecship-stale-");
  const A = join(root, "a.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedPartial(A, [
    { uuid: "u1", text: "tin cu KHONG nhung noi", ts: "2026-01-01T00:00:00Z", embedded: false },
    { uuid: "u2", text: "tin moi da nhung", ts: nowIso(1000), embedded: true },
  ]);

  const bundle = join(root, "b1.enc");
  const e = await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  assert.equal(e.rows?.messages, 2, "tin cũ quá cửa sổ phải cho đi, không được giam cả gói vì nó");
});

test("CA ÂM: kho chưa từng nhúng thì KHÔNG chặn gì (máy không chạy embed vẫn gửi được)", async (t) => {
  const root = tempDir(t, "zemory-vecship-novec-");
  const A = join(root, "a.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedPartial(A, [
    { uuid: "u1", text: "tin mot", ts: nowIso(2000), embedded: false },
    { uuid: "u2", text: "tin hai", ts: nowIso(1000), embedded: false },
  ]);

  const bundle = join(root, "b1.enc");
  const e = await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  assert.equal(e.rows?.messages, 2, "0 vector trong kho ⇒ chờ cũng vô ích, phải gửi bình thường");
});

// BÙ VECTOR CHO KHO CHUNG (`memory vectors-catchup`) — NỐI THÊM, không ghi đè.
//
// Tình huống thật đang tái hiện: tin được gửi lên kho chung TRƯỚC khi kịp nhúng (đúng thứ mà
// van 24 giờ của `embedFrontierId` cố ý cho qua để sync không đứng), nên khối đó chở chữ mà
// không chở vector. Máy nhận vì thế phải tự nhúng lại — đo trên kho thật 2026-08-25: thiếu
// ~22.000 vector ⇒ ~12 giờ máy. Lệnh bù phải vá được đúng phần đó mà KHÔNG đụng byte cũ.
test("bù vector cho kho chung: nối thêm một khối, máy nhận nhận đủ vector (không ghi đè)", async (t) => {
  sandboxHome(t);
  const { syncDrive, vectorCatchUp } = await import("../../dist/memory/share.js");
  const { openMemory: open } = await import("../../dist/memory/db.js");
  const root = tempDir(t, "zemory-catchup-");
  const A = join(root, "a.db");
  const B = join(root, "b.db");
  const drive = join(root, "drive");
  const keyPath = join(root, "share.key");
  const { mkdirSync, statSync } = await import("node:fs");
  mkdirSync(drive, { recursive: true });
  writeMemoryShareKey(keyPath);

  // ① Kho A có tin nhưng CHƯA nhúng → đẩy lên kho chung: khối này chở chữ, 0 vector.
  const db = open(A);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  ins.run("s1", "u1", "user", "tin mot", "2026-01-01T00:00:00Z");
  ins.run("s1", "u2", "user", "tin hai", "2026-01-01T00:01:00Z");
  db.close();
  const push = await syncDrive({ driveDir: drive, keyFile: keyPath, dbPath: A, embed: false });
  assert.equal(push.push.messages, 2, "khối đầu chở đủ chữ");

  const containerBefore = statSync(join(drive, "global_memory.enc")).size;

  // ② Máy A nhúng SAU (đúng nhịp thật: scheduler chạy sau lượt sync).
  seedVectorsFor(A);

  // ③ Bù: phải thấy đúng 2 vector thiếu và NỐI THÊM chứ không ghi đè.
  const r = await vectorCatchUp({ driveDir: drive, keyFile: keyPath, dbPath: A });
  assert.equal(r.missing, 2, "phải dò ra đúng phần kho chung còn thiếu");
  assert.equal(r.shipped, 2, "và chở đúng ngần ấy vector");
  const containerAfter = statSync(join(drive, "global_memory.enc")).size;
  assert.ok(containerAfter > containerBefore, "container phải DÀI RA (nối thêm), không co lại");

  // ④ Máy mới dựng từ kho chung: phải có đủ cả chữ lẫn vector.
  const merged = await mergeMemoryBundle({ bundlePath: join(drive, "global_memory.enc"), dbPath: B, keyFile: keyPath });
  assert.equal(merged.messagesAdded, 2, "chữ vẫn đủ");
  assert.equal(merged.vectorsApplied, 2, "vector nay cũng đủ — đây là cả mục đích của lệnh bù");
  for (const uuid of ["u1", "u2"]) assert.deepEqual(vectorOf(B, uuid), vectorOf(A, uuid), `vector ${uuid} phải khớp máy nguồn`);
});

test("CA ÂM: kho chung đã đủ vector ⇒ KHÔNG nối khối rác", async (t) => {
  sandboxHome(t);
  const { syncDrive, vectorCatchUp } = await import("../../dist/memory/share.js");
  const root = tempDir(t, "zemory-catchup-noop-");
  const A = join(root, "a.db");
  const drive = join(root, "drive");
  const keyPath = join(root, "share.key");
  const { mkdirSync, statSync } = await import("node:fs");
  mkdirSync(drive, { recursive: true });
  writeMemoryShareKey(keyPath);

  seedStore(A, [{ uuid: "u1", text: "tin mot" }, { uuid: "u2", text: "tin hai" }]);
  await syncDrive({ driveDir: drive, keyFile: keyPath, dbPath: A, embed: false });
  const before = statSync(join(drive, "global_memory.enc")).size;

  const r = await vectorCatchUp({ driveDir: drive, keyFile: keyPath, dbPath: A });
  assert.equal(r.missing, 0, "không thiếu gì thì phải báo 0");
  assert.equal(r.pushed, false, "và TUYỆT ĐỐI không nối khối nào — kho chung không được phình vì lệnh chạy không");
  assert.equal(statSync(join(drive, "global_memory.enc")).size, before, "kích thước container phải y nguyên");
});

/** Nhúng vector cho kho ĐÃ CÓ TIN (tái hiện nhịp thật: tin đi trước, nhúng chạy sau). */
function seedVectorsFor(path, meta = { dims: DIMS, profile: "gemma-prompt-v1", dtype: "fp32" }) {
  const db = openMemory(path);
  const ids = db.prepare("SELECT id FROM messages ORDER BY id").all();
  db.close();
  const raw = new Database(path);
  sqliteVec.load(raw);
  raw.defaultSafeIntegers(true);
  raw.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${meta.dims}])`);
  raw.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER, profile TEXT, dtype TEXT)");
  if (!raw.prepare("SELECT count(*) c FROM vec_config").get().c) {
    raw.prepare("INSERT INTO vec_config (dims, profile, dtype) VALUES (?,?,?)").run(meta.dims, meta.profile, meta.dtype);
  }
  const put = raw.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
  for (const [i, r] of ids.entries()) {
    const v = new Float32Array(meta.dims).fill(0);
    v[i % meta.dims] = 1;
    put.run(BigInt(r.id), Buffer.from(v.buffer));
  }
  raw.close();
}

/** Cô lập HOME: `syncDrive` có gọi `scan()`, không cô lập là nó đi quét transcript THẬT của máy
 *  (đo: một lượt test treo hơn 8 phút vì lý do đó). Chép khuôn từ `memory-share.test.mjs`. */
function sandboxHome(t) {
  const home = tempDir(t, "zemory-vecship-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.XDG_CONFIG_HOME = home;
  delete process.env.GLOBAL_MEMORY_DB;
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });
  return home;
}

// 🔴 CA MẤT DỮ LIỆU — chặn-trên KHÔNG được áp cho gói THAY THẾ (`since = 0`).
//
// Lỗi tôi tự đẻ ra khi vá chặn-trên, bắt được lúc soi lại diff: gộp container đặt `since = 0`
// và GHI ĐÈ kho chung. Nếu chặn-trên cắt ở ranh giới đã nhúng thì container mới THIẾU những tin
// nằm trên ranh giới mà container cũ đang có ⇒ kênh hụt tin cho tới lượt sync sau, máy nào merge
// trúng cửa sổ đó thì nhận thiếu. Giữa "kênh thiếu VECTOR" và "kênh thiếu TIN": thiếu tin nặng
// hơn — vector bù được bằng `vectors-catchup`, tin thì không.
test("CA MẤT DỮ LIỆU: gói THAY THẾ (since=0) phải chở ĐỦ tin, kể cả tin chưa nhúng", async (t) => {
  const root = tempDir(t, "zemory-vecship-baseline-");
  const A = join(root, "a.db");
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);

  seedPartial(A, [
    { uuid: "u1", text: "tin mot da nhung", ts: nowIso(3000), embedded: true },
    { uuid: "u2", text: "tin hai CHUA nhung", ts: nowIso(1000), embedded: false },
  ]);

  const bundle = join(root, "b1.enc");
  const e = await exportMemoryBundle({ outPath: bundle, dbPath: A, keyFile: keyPath, force: true });
  assert.equal(e.rows?.messages, 2, "gói thay thế KHÔNG được cắt bớt — thiếu tin ở đây là mất dữ liệu trên kênh");
  assert.equal(e.rows?.maxMessageId, 2, "watermark của gói thay thế phải phủ hết kho");
});
