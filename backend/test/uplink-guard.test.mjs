// Cổng "bundle ĐÃ RỜI KHỎI MÁY chưa" (uplinkguard) — sự cố gốc 2026-08-11: client Drive kẹt
// hàng đợi, gói 317 MB + bản bàn giao 1,63 GB nằm im 3 NGÀY trong khi `memory sync` vẫn báo
// "đã xuất" thành công. Cổng đọc SỔ của client: định danh còn `local-` = chưa lên mây.
//
// Ca ÂM ở đây quan trọng ngang ca dương (plan/18 luật 7): sổ thật giữ 17 hàng `local-` của
// file `.zemory-write-probe` ĐÃ XOÁ KHỎI ĐĨA từ lâu — cổng nào chỉ đọc sổ mà không đối chiếu
// đĩa là báo oan ngay ca đầu, và cảnh báo kêu nhầm thì không ai đọc nữa.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { uplinkReport, uplinkStaleMs, isLocalOnlyId, driveFsJournals } from "../../dist/memory/uplinkguard.js";

const HOUR = 3_600_000;
const STALE = 60 * 60_000; // ngưỡng mặc định 60 phút — khoá bằng test riêng bên dưới

/** Dựng sổ DriveFS giả (đúng các cột mà cổng tra) + thư mục Drive giả. */
function rig() {
  const root = mkdtempSync(join(tmpdir(), "zuplink-"));
  const driveDir = join(root, "Global Memory");
  mkdirSync(driveDir, { recursive: true });
  const base = join(root, "DriveFS");
  mkdirSync(join(base, "12345"), { recursive: true });
  const db = new Database(join(base, "12345", "metadata_sqlite_db"));
  db.exec(`
    CREATE TABLE items(stable_id INTEGER PRIMARY KEY, id TEXT, local_title TEXT,
      file_size INTEGER, is_tombstone INTEGER DEFAULT 0, trashed INTEGER DEFAULT 0,
      is_folder INTEGER DEFAULT 0, modified_date INTEGER);
    CREATE TABLE stable_parents(item_stable_id INTEGER, parent_stable_id INTEGER);
    INSERT INTO items(stable_id, id, local_title, is_folder) VALUES (1, 'cloud-folder', 'Global Memory', 1);
  `);
  let nextId = 100;
  /** Thêm một hàng file vào sổ dưới thư mục Global Memory. */
  const addRow = (title, cloudId, extra = {}) => {
    const sid = extra.stableId ?? nextId++;
    db.prepare(
      "INSERT INTO items(stable_id, id, local_title, file_size, is_tombstone, trashed) VALUES (?,?,?,?,?,?)",
    ).run(sid, cloudId, title, extra.size ?? 1000, extra.tombstone ?? 0, extra.trashed ?? 0);
    db.prepare("INSERT INTO stable_parents(item_stable_id, parent_stable_id) VALUES (?, 1)").run(sid);
    return sid;
  };
  /** Ghi file thật lên đĩa Drive giả với tuổi đặt sẵn. */
  const addFile = (title, ageMs) => {
    const p = join(driveDir, title);
    writeFileSync(p, "x".repeat(16));
    const t = (Date.now() - ageMs) / 1000;
    utimesSync(p, t, t);
  };
  return {
    driveDir,
    base,
    addRow,
    addFile,
    done: () => db.close(),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("ca ĐỎ: bundle trên đĩa mang định danh local- già hơn ngưỡng ⇒ stuck, cũ nhất xếp đầu", () => {
  const r = rig();
  try {
    r.addRow("global_memory.enc", "local-777");
    r.addFile("global_memory.enc", 3 * 24 * HOUR); // đúng hình dạng sự cố: 3 ngày
    r.addRow("handover.enc", "local-778");
    r.addFile("handover.enc", 2 * HOUR);
    r.done();
    const rep = uplinkReport(r.driveDir, { driveFsBase: r.base, staleMs: STALE });
    assert.equal(rep.journalFound, true);
    assert.equal(rep.stuck.length, 2);
    assert.equal(rep.stuck[0].file, "global_memory.enc", "cũ nhất phải đứng đầu — dòng báo chỉ nêu được một tên");
    assert.ok(rep.stuck[0].ageMs > 71 * HOUR);
  } finally {
    r.cleanup();
  }
});

test("ca ÂM báo-oan (đo thật trên sổ sống): hàng local- của file ĐÃ RỜI ĐĨA không được tính", () => {
  const r = rig();
  try {
    // 17 hàng .zemory-write-probe của sổ thật: local-, size 0, KHÔNG còn trên đĩa.
    for (let i = 0; i < 17; i++) r.addRow(".zemory-write-probe", `local-${248369 + i}`, { size: 0, trashed: 1 });
    r.addRow("global_memory.enc", "cloud-abc123");
    r.addFile("global_memory.enc", 5 * HOUR);
    r.done();
    const rep = uplinkReport(r.driveDir, { driveFsBase: r.base, staleMs: STALE });
    assert.equal(rep.stuck.length, 0, "hàng sổ của file đã xoá mà kêu đỏ = cổng tự phá uy tín mình");
    assert.equal(rep.pending.length, 0);
    assert.equal(rep.departed, 1);
  } finally {
    r.cleanup();
  }
});

test("ca ÂM: cloud id = đã rời máy · local- còn TRẺ = pending, không đỏ", () => {
  const r = rig();
  try {
    r.addRow("old.enc", "cloud-ok");
    r.addFile("old.enc", 10 * HOUR);
    r.addRow("fresh.enc", "local-1");
    r.addFile("fresh.enc", 2 * 60_000); // 2 phút — đang lên, chuyện thường
    r.done();
    const rep = uplinkReport(r.driveDir, { driveFsBase: r.base, staleMs: STALE });
    assert.equal(rep.departed, 1);
    assert.equal(rep.stuck.length, 0);
    assert.equal(rep.pending.length, 1);
    assert.equal(rep.pending[0].file, "fresh.enc");
  } finally {
    r.cleanup();
  }
});

test("thế hệ cũ trashed=1 không che hàng sống: lấy hàng stable_id LỚN NHẤT trong các hàng sống", () => {
  const r = rig();
  try {
    // Đo thật 2026-08-24: 5/6 hàng `global_memory.enc` là thế hệ cũ trashed=1 (compact đè tên).
    r.addRow("global_memory.enc", "local-1", { stableId: 200, trashed: 1 });
    r.addRow("global_memory.enc", "cloud-old", { stableId: 300, trashed: 1 });
    r.addRow("global_memory.enc", "cloud-current", { stableId: 400 });
    r.addFile("global_memory.enc", 20 * HOUR);
    r.done();
    const rep = uplinkReport(r.driveDir, { driveFsBase: r.base, staleMs: STALE });
    assert.equal(rep.departed, 1, "hàng sống mới nhất mang cloud id ⇒ đã rời máy, các xác cũ không được tính");
    assert.equal(rep.stuck.length, 0);
  } finally {
    r.cleanup();
  }
});

test("fail-open ①: không có sổ nào ⇒ journalFound=false + nói ra, KHÔNG đoán, KHÔNG ném", () => {
  const r = rig();
  try {
    r.addFile("global_memory.enc", 90 * 24 * HOUR);
    r.done();
    const rep = uplinkReport(r.driveDir, { driveFsBase: join(r.base, "khong-ton-tai"), staleMs: STALE });
    assert.equal(rep.journalFound, false);
    assert.equal(rep.stuck.length, 0, "không đọc được sổ thì 'chưa kiểm được', không phải 'kẹt'");
    assert.ok(rep.inconclusive.length >= 1);
  } finally {
    r.cleanup();
  }
});

test("fail-open ②: file trên đĩa mà sổ chưa có hàng ⇒ inconclusive, không xếp vào đâu", () => {
  const r = rig();
  try {
    r.done();
    r.addFile("brand-new.enc", 5 * 60_000);
    const rep = uplinkReport(r.driveDir, { driveFsBase: r.base, staleMs: STALE });
    assert.equal(rep.stuck.length + rep.pending.length + rep.departed, 0);
    assert.ok(rep.inconclusive.some((s) => s.includes("brand-new.enc")));
  } finally {
    r.cleanup();
  }
});

test("fail-open ③: thư mục Drive không đọc được ⇒ inconclusive, không ném", () => {
  const rep = uplinkReport(join(tmpdir(), "zuplink-khong-co-" + Date.now()), { staleMs: STALE });
  assert.equal(rep.stuck.length, 0);
  assert.ok(rep.inconclusive.length >= 1);
});

test("ngưỡng mặc định 60 phút, đổi được qua ZEMORY_UPLINK_STALE_MIN", () => {
  const prev = process.env.ZEMORY_UPLINK_STALE_MIN;
  try {
    delete process.env.ZEMORY_UPLINK_STALE_MIN;
    assert.equal(uplinkStaleMs(), 60 * 60_000);
    process.env.ZEMORY_UPLINK_STALE_MIN = "15";
    assert.equal(uplinkStaleMs(), 15 * 60_000);
    process.env.ZEMORY_UPLINK_STALE_MIN = "rác";
    assert.equal(uplinkStaleMs(), 60 * 60_000, "giá trị hỏng rơi về mặc định, không thành NaN");
  } finally {
    if (prev === undefined) delete process.env.ZEMORY_UPLINK_STALE_MIN;
    else process.env.ZEMORY_UPLINK_STALE_MIN = prev;
  }
});

test("phụ tùng: isLocalOnlyId + driveFsJournals chỉ nhận thư mục toàn chữ số có sổ", () => {
  assert.equal(isLocalOnlyId("local-248369"), true);
  assert.equal(isLocalOnlyId("1W8P9I5H8UnHdDZYJDj"), false);
  assert.equal(isLocalOnlyId(null), false);
  const root = mkdtempSync(join(tmpdir(), "zuplink-j-"));
  try {
    mkdirSync(join(root, "12345"), { recursive: true });
    writeFileSync(join(root, "12345", "metadata_sqlite_db"), "");
    mkdirSync(join(root, "Crashpad"), { recursive: true }); // thư mục thật của client, KHÔNG phải account
    mkdirSync(join(root, "67890"), { recursive: true }); // account nhưng chưa có sổ
    const js = driveFsJournals(root);
    assert.equal(js.length, 1);
    assert.ok(js[0].endsWith(join("12345", "metadata_sqlite_db")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
