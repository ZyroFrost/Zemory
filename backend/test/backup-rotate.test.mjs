// Sao lưu định kỳ + dọn bản cũ.
//
// Bối cảnh (sự cố thật 2026-08-03): DB 1 GB hỏng giữa ngày, bản sao lưu gần nhất **cũ 8 ngày**
// vì `memory backup` là lệnh chạy tay. Bài học không phải "nhớ gõ lệnh" mà là khoảng hở phải
// do MÁY giữ.
//
// Ba bất biến phải giữ — mỗi cái đều PHẢI đỏ được nếu code sai:
//   ① chưa tới hạn thì KHÔNG chép (nếu không: 1,1 GB mỗi 30 phút, mòn ổ và vô nghĩa);
//   ② dọn xong vẫn còn đúng `keep` bản, và bản MỚI NHẤT không bao giờ bị xoá;
//   ③ file KHÔNG khớp khuôn tên backup thì KHÔNG BAO GIỜ bị đụng tới — xoá là phá huỷ,
//      quét bừa cả thư mục là cách làm mất dữ liệu của người khác.

import assert from "node:assert/strict";
import { existsSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { listBackups, rotateBackup } from "../../dist/memory/backup-rotate.js";
import { tempDir } from "./helpers.mjs";

const DAY = 24 * 60 * 60_000;

/** Một DB SQLite thật, nhỏ — `db.backup()` cần file hợp lệ chứ không nhận file rỗng. */
async function makeDb(dir) {
  const { default: Database } = await import("better-sqlite3");
  const p = join(dir, "global_memory.db");
  const d = new Database(p);
  d.exec("CREATE TABLE t(x)");
  d.prepare("INSERT INTO t VALUES (?)").run("dữ liệu phải sống sót");
  d.close();
  return p;
}

/** Đặt tuổi cho file để mô phỏng bản sao lưu cũ mà không phải chờ thật. */
function ageFile(p, ms) {
  const t = (Date.now() - ms) / 1000;
  utimesSync(p, t, t);
}

test("chưa tới hạn thì KHÔNG chép thêm bản nào", async (t) => {
  const dir = tempDir(t, "zemory-bak-");
  const db = await makeDb(dir);

  const first = await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 5 } });
  assert.equal(first.wrote, true, "lần đầu chưa có bản nào ⇒ phải chép");
  assert.equal(first.ageMs, null);

  const second = await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 5 } });
  assert.equal(second.wrote, false, "vừa chép xong ⇒ phải bỏ qua");
  assert.equal(listBackups(join(dir, "backups")).length, 1, "vẫn đúng 1 bản");
});

test("quá hạn thì chép bản mới", async (t) => {
  const dir = tempDir(t, "zemory-bak-");
  const db = await makeDb(dir);
  await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 5 } });

  const bak = listBackups(join(dir, "backups"))[0];
  ageFile(bak.path, 2 * DAY); // giả vờ bản cũ đã 2 ngày tuổi

  const r = await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 5 } });
  assert.equal(r.wrote, true, "bản mới nhất đã quá hạn ⇒ phải chép");
  assert.ok(r.ageMs > DAY, `tuổi phải > 1 ngày, thấy ${r.ageMs}`);
  assert.equal(listBackups(join(dir, "backups")).length, 2);
});

test("dọn về đúng keep bản, giữ lại bản MỚI NHẤT", async (t) => {
  const dir = tempDir(t, "zemory-bak-");
  const db = await makeDb(dir);
  const dirB = join(dir, "backups");

  // Chép 4 lần, mỗi lần đẩy bản trước thành cũ để lượt sau chịu chép.
  for (let i = 0; i < 4; i++) {
    await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 2 } });
    for (const b of listBackups(dirB)) ageFile(b.path, (4 - i) * DAY);
  }

  const left = listBackups(dirB);
  assert.equal(left.length, 2, `keep=2 ⇒ phải còn đúng 2 bản, thấy ${left.length}`);
  // Bản mới nhất phải là bản còn mtime trẻ nhất — nghĩa là dọn không cắt nhầm đầu danh sách.
  assert.ok(left[0].mtimeMs >= left[1].mtimeMs);
});

test("file lạ trong thư mục backups KHÔNG bao giờ bị xoá", async (t) => {
  const dir = tempDir(t, "zemory-bak-");
  const db = await makeDb(dir);
  const dirB = join(dir, "backups");

  await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 1 } });
  const stranger = join(dirB, "ghi-chu-cua-toi.txt");
  const alsoDb = join(dirB, "ban-tay-toi-chep.db"); // .db nhưng KHÔNG theo khuôn tên
  writeFileSync(stranger, "không được mất");
  writeFileSync(alsoDb, "cũng không được mất");
  ageFile(stranger, 99 * DAY);
  ageFile(alsoDb, 99 * DAY);

  for (let i = 0; i < 3; i++) {
    for (const b of listBackups(dirB)) ageFile(b.path, 2 * DAY);
    await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 1 } });
  }

  assert.ok(existsSync(stranger), "file .txt lạ bị xoá — dọn đang quét bừa cả thư mục");
  assert.ok(existsSync(alsoDb), "file .db không khớp khuôn bị xoá — dọn đang quét bừa");
  assert.equal(listBackups(dirB).length, 1, "bản backup thật vẫn phải dọn về keep=1");
  // Và những file lạ đó KHÔNG được đếm là backup.
  assert.ok(!listBackups(dirB).some((b) => b.path.endsWith("ghi-chu-cua-toi.txt")));
});

test("bản sao lưu đọc được và giữ đúng dữ liệu (chụp nhất quán, không phải chép byte)", async (t) => {
  const dir = tempDir(t, "zemory-bak-");
  const db = await makeDb(dir);
  const r = await rotateBackup({ dbPath: db, policy: { everyMs: DAY, keep: 5 } });

  const { default: Database } = await import("better-sqlite3");
  const b = new Database(r.outPath, { readonly: true });
  assert.equal(b.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(b.prepare("SELECT x FROM t").get().x, "dữ liệu phải sống sót");
  b.close();
  assert.ok(readdirSync(join(dir, "backups")).length >= 1);
});
