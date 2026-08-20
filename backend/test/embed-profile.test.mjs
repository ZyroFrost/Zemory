// PROFILE = TOÀN BỘ HỢP ĐỒNG MÃ HOÁ CỦA MỘT KHO, không chỉ cái prompt.
//
// Đợt đổi embedder (plan 19: Gemma-768 → BGE-M3 int8-1024) chạy theo lối KHO SONG SONG: một
// binary phục vụ HAI kho, kho nào hành xử theo `vec_config` của kho đó. Muốn thế thì profile
// phải kéo theo đủ bốn thứ — model · pooling · dims · dtype — vì mỗi thứ lệch là một kiểu hỏng
// LẶNG: vector vẫn ra đúng hình dạng, không lỗi nào nổ, chỉ có thứ hạng âm thầm tệ đi.
//
// Ca đắt nhất trong file này là ca ĐỌC: một kho đóng dấu `bge-m3-v1` mà bộ đọc không biết tên
// đó sẽ đọc thành `raw` ⇒ mean-pooling một model cần CLS ⇒ đúng kiểu hỏng lặng vừa nói. Đo
// 2026-08-19 trên đường thật: mean-pool sai chỗ cho vector lệch tới cos 0.98 so với bản đúng.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

import { currentEmbedProfile, embedConfig, embedProfileSpec, targetEmbedDims, useEmbedProfile } from "../../dist/memory/embed.js";
import { vectorIndexInfo } from "../../dist/memory/vectors.js";

function stampedDb(profile, dims, dtype) {
  const dbPath = join(mkdtempSync(join(tmpdir(), "zemory-prof-")), "p.db");
  const db = new Database(dbPath);
  db.exec("CREATE TABLE vec_config (dims INTEGER NOT NULL, profile TEXT, dtype TEXT)");
  db.prepare("INSERT INTO vec_config(dims, profile, dtype) VALUES (?, ?, ?)").run(dims, profile, dtype);
  db.close();
  return dbPath;
}

test("profile quyết định CẢ BỐN: model · dims · dtype (và không rò sang profile kia)", () => {
  useEmbedProfile("bge-m3-v1");
  const bge = embedConfig();
  assert.match(bge.model, /bge-m3/i, "profile bge phải ghim model bge — không mượn model của gemma");
  assert.equal(bge.dtype, "int8", "int8: đo được 637 vs 1388 ms/tin mà chất lượng trong sai số");
  assert.equal(targetEmbedDims("bge-m3-v1"), 1024, "bề rộng gốc của bge; 768 sẽ cắt cụt kho bge");

  useEmbedProfile("gemma-prompt-v1");
  const gem = embedConfig();
  assert.match(gem.model, /embeddinggemma/i, "kho gemma vẫn phải chạy gemma — đây là vế 'song song'");
  assert.equal(gem.dtype, "fp32");
  assert.equal(targetEmbedDims("gemma-prompt-v1"), 768);

  // quay lại lần nữa: giá trị phải y hệt lần đầu (không có trạng thái dính lại giữa hai kho)
  useEmbedProfile("bge-m3-v1");
  assert.equal(embedConfig().dtype, "int8");
  assert.match(embedConfig().model, /bge-m3/i);
  useEmbedProfile(null);
});

test("POOLING bị khoá cứng theo model — đổi nó không nổ ra lỗi nào, chỉ dịch cả không gian vector", () => {
  // Ca này sinh ra từ một lượt đột biến hoá THẤT BẠI: lật BGE sang mean-pooling mà mọi khẳng
  // định hành vi ở file này VẪN XANH, trong khi vector thật rơi xuống cos 0.71–0.78 so với bản
  // đã benchmark (đo tay 2026-08-19). Không có gate nào bắt được ⇒ phải khoá thẳng hợp đồng.
  assert.equal(embedProfileSpec("bge-m3-v1").pooling, "cls", "BGE-M3 là model CLS — mean-pool nó = vector sai KHÔNG báo lỗi");
  assert.equal(embedProfileSpec("gemma-prompt-v1").pooling, "mean", "kho gemma ĐANG CHẠY được dựng bằng mean — đổi là làm hỏng nó");
  assert.equal(embedProfileSpec("raw").pooling, "mean");

  // Prompt: BGE KHÔNG dùng prefix. Nhét prompt của gemma vào BGE là bịa thêm chữ vào mọi tài liệu.
  assert.equal(embedProfileSpec("bge-m3-v1").prompted, false);
  assert.equal(embedProfileSpec("gemma-prompt-v1").prompted, true);

  // Tuần tự: BGE phải encode từng cái. Đo 2026-08-19: gọi theo lô vừa CHẬM HƠN 5,6× vừa dịch
  // vector (cos 0.982) khỏi đúng thứ đã benchmark. Gemma cố ý KHÔNG bật — kho nó đã dựng bằng
  // lối gọi theo lô, đổi giữa chừng là trộn hai biến thể trong cùng một chỉ mục.
  assert.equal(embedProfileSpec("bge-m3-v1").sequential, true);
  assert.notEqual(embedProfileSpec("gemma-prompt-v1").sequential, true);
});

test("kho đóng dấu bge-m3-v1 phải ĐỌC RA bge-m3-v1 (đọc nhầm thành raw = mean-pool một model CLS)", () => {
  const bgePath = stampedDb("bge-m3-v1", 1024, "int8");
  const info = vectorIndexInfo(bgePath);
  assert.equal(info.profile, "bge-m3-v1", "bộ đọc không biết tên profile ⇒ rơi về raw ⇒ hỏng LẶNG");
  assert.equal(info.dims, 1024);
  assert.equal(info.dtype, "int8");

  // kho gemma đang chạy đọc y như trước — đợt đổi này không được đụng vào nó
  const gemPath = stampedDb("gemma-prompt-v1", 768, "fp32");
  assert.deepEqual(vectorIndexInfo(gemPath), { profile: "gemma-prompt-v1", dims: 768, dtype: "fp32" });

  // kho đời cũ (chưa có cột profile) vẫn phải đọc là raw — đó mới là nghĩa thật của "raw"
  const legacyPath = stampedDb(null, 768, null);
  assert.equal(vectorIndexInfo(legacyPath).profile, "raw");
});

test("HỢP ĐỒNG đóng dấu TRƯỚC lần embed đầu phải được TÔN TRỌNG (kho chuẩn bị để đổi model)", async () => {
  // Đây là ca thật đã suýt đốt 44 giờ máy (2026-08-19). Khi đổi embedder, kho song song được
  // chuẩn bị theo plan 19 §3: bỏ chỉ mục cũ → ĐÓNG DẤU hợp đồng mới vào vec_config → rồi mới
  // embed. Ở trạng thái đó `vec_chunks` CHƯA tồn tại, và bản cũ lấy chính sự tồn tại của bảng
  // đó làm điều kiện đọc hợp đồng ⇒ bỏ qua vec_config, quay về cấu hình mặc định.
  // Triệu chứng đo được: vec_config nói {1024, bge-m3-v1, int8} mà lượt embed báo dims 768 và
  // chạy Gemma — không lỗi, không cảnh báo, chỉ là một chỉ mục sai từ đầu tới cuối.
  const dbPath = stampedDb("bge-m3-v1", 1024, "int8"); // đúng trạng thái "đã đóng dấu, chưa embed"
  const dbRaw = new Database(dbPath);
  dbRaw.exec("CREATE TABLE messages (id INTEGER PRIMARY KEY, content TEXT, tool_name TEXT)");
  dbRaw.prepare("INSERT INTO messages(id, content) VALUES (1, ?)").run("một tin ngắn để thử hợp đồng");
  dbRaw.close();

  const { embedPending } = await import("../../dist/memory/vectors.js");
  const r = await embedPending({ dbPath, limit: 1 });
  // Model có thể không nạp được ở máy trắng — nhưng dims ĐƯỢC CHỌN trước khi gọi model, nên
  // ngay cả lượt fail-open cũng phải cho thấy nó đã đọc hợp đồng (1024), không phải 768.
  if (r.dims !== null) {
    assert.equal(r.dims, 1024, `lượt embed phải theo hợp đồng 1024 của kho, nhận ${r.dims} (768 = đã bỏ qua vec_config)`);
  }
  assert.equal(vectorIndexInfo(dbPath).profile, "bge-m3-v1", "hợp đồng không được đổi sau lượt embed");
  assert.equal(vectorIndexInfo(dbPath).dims, 1024);
});

test("ZEMORY_EMBED_DIMS chỉ cắt XUỐNG, không nống LÊN quá bề rộng model", () => {
  // Cắt xuống là hợp lệ với model MRL; đòi NHIỀU hơn model sinh ra là lỗi cấu hình, và nếu
  // chiều theo nó thì vec0 dựng bảng rộng hơn vector thật ⇒ hỏng ngay lúc ghi.
  process.env.ZEMORY_EMBED_DIMS = "256";
  try {
    assert.equal(targetEmbedDims("bge-m3-v1"), 256, "cắt xuống: cho phép");
    assert.equal(targetEmbedDims("gemma-prompt-v1"), 256);
  } finally {
    delete process.env.ZEMORY_EMBED_DIMS;
  }
  process.env.ZEMORY_EMBED_DIMS = "1024";
  try {
    assert.equal(targetEmbedDims("gemma-prompt-v1"), 768, "gemma chỉ sinh 768 — đòi 1024 phải bị bỏ qua");
    assert.equal(targetEmbedDims("bge-m3-v1"), 1024);
  } finally {
    delete process.env.ZEMORY_EMBED_DIMS;
  }
});

test("chọn model bge qua env thì profile tự nhận ra (không phải nhớ set thêm biến thứ hai)", () => {
  useEmbedProfile(null);
  process.env.ZEMORY_EMBED_MODEL = "onnx-community/bge-m3-ONNX";
  try {
    assert.equal(currentEmbedProfile(), "bge-m3-v1", "đặt model bge mà vẫn pool kiểu gemma là hỏng lặng");
  } finally {
    delete process.env.ZEMORY_EMBED_MODEL;
  }
  assert.equal(currentEmbedProfile(), "gemma-prompt-v1", "env trống ⇒ vẫn là hệ đang chạy hôm nay");
});
