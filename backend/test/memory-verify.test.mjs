// Kho có lành không — và đường quét lại từ NGUỒN.
//
// Bối cảnh (sự cố thật 2026-08-03): kho 1 GB hỏng lúc nào KHÔNG AI BIẾT. Nó chỉ lộ ra vì tôi
// tình cờ chạy bench. Không ai từng hỏi "kho còn lành không" — mà mỗi ngày chậm phát hiện là
// bản sao lưu gần nhất càng cũ. Nay `verify` nằm đầu chuỗi bảo trì của daemon, và hỏng thì
// DỪNG chuỗi (ghi tiếp vào file hỏng chỉ hỏng thêm, còn đè lên bản sao lưu đang tốt).
//
// Và bài học lớn hơn: `salvage` KHÔNG phải bước cuối. Với dữ liệu nạp từ file, nguồn THẬT là
// transcript trên đĩa — `reopenIngest` mở lại đường nạp để `scan` kéo về phần thiếu.

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { reconcileCounts, reopenIngest, verifyMemory } from "../../dist/memory/salvage.js";

function seed(n = 5, counted = n) {
  const dir = mkdtempSync(join(tmpdir(), "zemory-verify-"));
  const p = join(dir, "global_memory.db");
  const db = openMemory(p);
  db.prepare("INSERT INTO sessions (id, source, title, started_at, ended_at, message_count) VALUES (?,?,?,?,?,?)").run(
    "s1",
    "claude-code",
    "phiên thử",
    "2026-01-01",
    "2026-01-01",
    counted, // bộ đếm CỐ Ý lệch được, để giả cảnh tin bị mất trên trang hỏng
  );
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 0; i < n; i++) ins.run("s1", `u${i}`, "user", `tin ${i}`, "2026-01-01T00:00:00Z");
  db.prepare("INSERT INTO ingest_state (file_path, source, session_id, size, mtime_ms, last_line) VALUES (?,?,?,?,?,?)").run(
    join(dir, "s1.jsonl"),
    "claude-code",
    "s1",
    999,
    1,
    n,
  );
  db.close();
  return p;
}

test("a healthy store means verify reports healthy", () => {
  const r = verifyMemory(seed());
  assert.equal(r.ok, true, `phải báo lành, thấy: ${r.detail}`);
});

test("a file that is NOT SQLite must be CAUGHT by verify", () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-verify-"));
  const p = join(dir, "global_memory.db");
  writeFileSync(p, "đây không phải cơ sở dữ liệu");
  const r = verifyMemory(p);
  assert.equal(r.ok, false, "file rác mà báo lành = phép kiểm vô dụng");
  assert.ok(r.detail.length > 0, "phải nói hỏng ra sao");
});

test("a file SMASHED mid-page must be CAUGHT by verify", async () => {
  const p = seed(200);
  const { readFileSync, writeFileSync: wf } = await import("node:fs");
  const buf = readFileSync(p);
  // Đập nát vùng giữa file (bỏ qua trang 1 = header, để nó vẫn "mở được" như DB hỏng thật).
  for (let i = 4096; i < Math.min(buf.length, 40960); i++) buf[i] = 0xff;
  wf(p, buf);
  const r = verifyMemory(p);
  assert.equal(r.ok, false, "trang bị đập nát mà vẫn báo lành = không bắt được đúng lớp lỗi đã gặp");
});

test("a session missing messages makes reopen reopen exactly that transcript file", () => {
  const p = seed(5, 8); // bộ đếm nói 8, thực có 5 ⇒ thủng 3
  const r = reopenIngest(p);
  assert.equal(r.missing, 3, `phải thấy thiếu 3 tin, thấy ${r.missing}`);
  assert.equal(r.sessions, 1, "phải mở lại đúng 1 file");

  const db = openMemory(p);
  assert.equal(db.prepare("SELECT last_line FROM ingest_state WHERE session_id='s1'").get().last_line, 0, "phải đặt lại về 0 để đọc lại từ đầu file");
  db.close();
});

test("with no session missing anything, reopen touches NOTHING (re-reading the whole store is very expensive)", () => {
  const p = seed(5, 5);
  const r = reopenIngest(p);
  assert.equal(r.missing, 0);
  assert.equal(r.sessions, 0, "không thiếu mà vẫn mở lại = bắt máy quét lại vô ích");

  const db = openMemory(p);
  assert.equal(db.prepare("SELECT last_line FROM ingest_state WHERE session_id='s1'").get().last_line, 5, "mốc đọc phải còn nguyên");
  db.close();
});

test("--all reopens EVERYTHING, including sessions missing nothing", () => {
  const p = seed(5, 5);
  assert.equal(reopenIngest(p, { all: true }).sessions, 1);
});

test("reconcileCounts corrects the counters to the REAL message count", () => {
  const p = seed(5, 8);
  reconcileCounts(p);
  const db = openMemory(p);
  assert.equal(db.prepare("SELECT message_count FROM sessions WHERE id='s1'").get().message_count, 5);
  db.close();
  assert.equal(reopenIngest(p).missing, 0, "chỉnh xong thì không còn báo thiếu");
});

test("a store that DOES NOT EXIST YET means 'no store', NOT corrupt", () => {
  // Máy cài mới chưa chạy lần nào thì chưa có file. Bản đầu mở read-only rồi nhận
  // `unable to open database file` ⇒ báo HỎNG và bảo user đi cứu dữ liệu — dọa oan.
  // Nặng hơn: `verify` nằm ở bước 0 chuỗi bảo trì và DỪNG chuỗi khi không ok ⇒ máy mới
  // cài sẽ không scan/embed/digest/backup được gì.
  const dir = mkdtempSync(join(tmpdir(), "zemory-fresh-"));
  const r = verifyMemory(join(dir, "global_memory.db"));
  assert.equal(r.ok, true, "kho chưa có mà báo hỏng = dọa oan máy cài mới");
  assert.equal(r.fresh, true, "phải phân biệt được 'chưa có' với 'lành'");
});
