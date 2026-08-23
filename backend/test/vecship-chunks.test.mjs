// VÒNG KHÉP KÍN: cửa sổ phụ của tin dài phải SANG ĐƯỢC máy nhận.
//
// Sự cố thật (audit 2026-08-12): phía nhận thiếu **đúng 717 cửa sổ phụ**, đo hai lần cách nhau
// 30 phút đều ra cùng số. Gốc là agent tự thêm ràng buộc user không đặt — `plan/08 §8.0` ghi tên
// nó là một trong BỐN lần đi sai của phiên đó: *"bỏ 7.381 cửa sổ phụ vì chỉ 2,6%, không đáng"*.
// Hậu quả: trên máy kia, ĐUÔI của tin dài không tìm được, mà **không lỗi nào nổ** — recall chỉ
// âm thầm tệ đi. Vá 2026-08-13 (`vector_ship_chunk`, release 1.5.0).
//
// Vì sao cần cổng này (đo 2026-08-23): sau bản vá, **0 file test nào nhắc `vector_ship_chunk`**.
// Một đường đã hỏng im lặng một lần, được vá, rồi không ai canh — đó đúng là chỗ nó hỏng lần hai.
// HP điều 16: máy nhận KHÔNG BAO GIỜ phải nhúng lại gì.

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { embedPending } from "../../dist/memory/vectors.js";
import { receiveVectorsFrom, shipVectorsInto } from "../../dist/memory/vecship.js";
import { skipIfBusy } from "./helpers.mjs";

const tmp = (tag) => join(mkdtempSync(join(tmpdir(), "zship-" + tag + "-")), "db.sqlite");

/** Kho mang ĐÚNG các tin dưới đây. `long` > 6000 ký tự ⇒ chắc chắn bị cắt thành cửa sổ phụ. */
function seed(path) {
  const db = openMemory(path);
  db.prepare("INSERT INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run("s1", "claude-code", "C:\\demo", 2);
  const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  ins.run("s1", "u-short", "user", "mot cau ngan binh thuong de doi chieu", "2026-06-26T00:00:00Z");
  // Nội dung PHẢI đa dạng: chuỗi lặp một từ có thể bị lớp dedup gộp thành một vector.
  let long = "";
  for (let i = 0; long.length < 14000; i++) long += `doan ${i} noi ve cau hinh migration va chi muc vector cua kho bo nho; `;
  ins.run("s1", "u-long", "assistant", long, "2026-06-26T00:01:00Z");
  db.close();
}

/** Số cửa sổ phụ trong một kho. Kho chưa từng nhúng thì `vec_map` CHƯA tồn tại (nó do
 *  `vectors.ts` tạo lúc chunk đầu tiên) — đó là 0 cửa sổ, không phải lỗi. */
const chunkRows = (path) => {
  const db = openMemory(path);
  try {
    const has = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_map'").get();
    return has ? db.prepare("SELECT COUNT(*) c FROM vec_map").get().c : 0;
  } finally {
    db.close();
  }
};

test("cửa sổ phụ đi TRỌN qua bundle: máy nhận có đúng số cửa như máy gửi", async (t) => {
  if (await skipIfBusy(t)) return;
  const src = tmp("src");
  seed(src);
  await embedPending({ dbPath: src });

  const nSrc = chunkRows(src);
  // TỰ KIỂM: không có cửa sổ phụ nào thì mọi assert bên dưới đều "xanh" một cách vô nghĩa.
  assert.ok(nSrc > 0, `fixture phải sinh cửa sổ phụ, đang có ${nSrc} — nếu 0 thì cổng này không soi gì`);

  // Snapshot = phần `rows` của bundle: cùng tin, CHƯA có vector.
  const snap = tmp("snap");
  seed(snap);
  const shipped = shipVectorsInto(snap, src);
  assert.equal(shipped.rejected, 0, "không hàng nào được phép bị SQLite từ chối im lặng");

  // Máy nhận: cùng tin, kho trắng vector.
  const dst = tmp("dst");
  seed(dst);
  const got = receiveVectorsFrom(snap, dst);
  assert.ok(got.applied > 0, "phải nhận được vector, nếu 0 thì gói rỗng");

  assert.equal(
    chunkRows(dst),
    nSrc,
    "máy nhận PHẢI có đủ cửa sổ phụ — thiếu là đuôi tin dài không tìm được, và không lỗi nào nổ (ca 717)",
  );
});

test("bundle đời CŨ (không có bảng chunk) vẫn merge được — fail-open, không ném", async (t) => {
  if (await skipIfBusy(t)) return;
  // Máy gửi cũ chỉ chở vector chính. Máy nhận mới không được chết vì thiếu bảng — nó phải nhận
  // phần có và bỏ qua phần không, đúng HP điều 9.
  const src = tmp("old-src");
  seed(src);
  await embedPending({ dbPath: src });
  const snap = tmp("old-snap");
  seed(snap);
  shipVectorsInto(snap, src);

  const s = openMemory(snap);
  s.exec("DROP TABLE IF EXISTS vector_ship_chunk");
  s.close();

  const dst = tmp("old-dst");
  seed(dst);
  const got = receiveVectorsFrom(snap, dst);
  assert.ok(got.applied > 0, "vector CHÍNH vẫn phải sang đủ");
  assert.equal(chunkRows(dst), 0, "không có bảng chunk ⇒ 0 cửa sổ phụ, nhưng KHÔNG được ném lỗi");
});
