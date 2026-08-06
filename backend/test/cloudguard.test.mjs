// Cảnh báo sớm: kho nằm trong vùng đồng bộ đám mây.
// Ca trung tâm là ca ĐÃ HỎNG THẬT hai lần: đường dẫn `D:\huy.nguyen\...` không chứa chữ
// "Drive" nào, nên mọi heuristic soi TÊN đều im — thứ cuốn kho đi là kênh backup máy khai
// trong `root_preference_sqlite.db`. Test này khoá đúng chỗ đó.

import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cloudSyncReport, driveFsRoots, isInside, looksLikeCloudSyncName } from "../../dist/memory/cloudguard.js";
import { tempDir } from "./helpers.mjs";

/** Dựng một sổ DriveFS giả ĐÚNG schema đã đo trên máy thật 2026-08-06. */
function fakeDriveFs(t, rows) {
  const dir = tempDir(t, "zdrivefs-");
  const p = join(dir, "root_preference_sqlite.db");
  const db = new Database(p);
  db.exec(`CREATE TABLE roots (root_id INTEGER PRIMARY KEY, metadata BLOB, media_id TEXT NOT NULL,
    title TEXT NOT NULL, root_path TEXT NOT NULL, account_token TEXT NOT NULL, sync_type INTEGER NOT NULL,
    destination INTEGER NOT NULL, medium INTEGER NOT NULL, state INTEGER NOT NULL, one_shot BOOL NOT NULL,
    is_my_drive BOOL NOT NULL, doc_id TEXT NOT NULL, last_seen_absolute_path TEXT NOT NULL)`);
  const ins = db.prepare(`INSERT INTO roots (media_id,title,root_path,account_token,sync_type,destination,
    medium,state,one_shot,is_my_drive,doc_id,last_seen_absolute_path) VALUES (?,?,?,?,1,2,1,1,0,0,'d',?)`);
  for (const r of rows) ins.run("m1", r.title ?? "backup", r.root_path ?? "", "tok", r.abs ?? "");
  db.close();
  return p;
}

test("BẮT được kênh backup máy — ca đã hỏng kho thật 2 lần, tên thư mục hoàn toàn vô tội", (t) => {
  const store = tempDir(t, "zstore-");
  const prefs = fakeDriveFs(t, [{ title: "SS01-IT-12", abs: "D:\\huy.nguyen", root_path: "D:\\huy.nguyen" }]);

  // Tiền đề của cả bài: heuristic tên đường dẫn KHÔNG thấy gì.
  assert.equal(looksLikeCloudSyncName("D:\\huy.nguyen\\Tool\\Zemory\\data"), false);

  const r = cloudSyncReport("D:\\huy.nguyen\\Tool\\Zemory\\data", { prefsPath: prefs });
  assert.equal(r.atRisk, true, "phải kêu — đây đúng là ca đã cuốn cả kho + chìa lên mây");
  assert.ok(r.evidence.some((e) => e.kind === "drivefs-root"), "bằng chứng phải là root của DriveFS");
  assert.ok(r.evidence[0].detail.includes("D:\\huy.nguyen"), "phải chỉ ra root nào, để người đọc kiểm lại được");

  // Thư mục NGOÀI root đó thì im — không được kêu bừa.
  const clean = cloudSyncReport(store, { prefsPath: prefs });
  assert.equal(clean.atRisk, false);
});

test("sổ DriveFS rỗng / không có ⇒ nói KHÔNG KIỂM ĐƯỢC, không im lặng thành sạch", (t) => {
  const store = tempDir(t, "zstore-");
  const r = cloudSyncReport(store, { prefsPath: join(store, "khong-ton-tai.db") });
  assert.equal(r.atRisk, false);
  assert.ok(r.inconclusive.some((s) => s.includes("DriveFS")), "phép kiểm không chạy được thì phải NÓI");

  const empty = fakeDriveFs(t, []);
  assert.equal(driveFsRoots(empty).error, null, "đọc được sổ rỗng KHÔNG phải lỗi");
  assert.deepEqual(driveFsRoots(empty).paths, []);
});

test("KHÔNG báo oan: sổ root đọc được và nói 'không đồng bộ' ⇒ rác cũ không lật ngược được", (t) => {
  // Ca THẬT đo trên máy này 2026-08-06: user đã gỡ `D:\huy.nguyen` khỏi backup máy (roots
  // rỗng), nhưng một thư mục rỗng `.tmp.driveupload` từ 05/08 vẫn nằm đó. Bản đầu của phép
  // kiểm kêu ĐỎ vì nó — báo oan ngay ca đầu tiên. Cảnh báo kêu nhầm thì lần sau không ai đọc.
  const parent = tempDir(t, "zparent-");
  const store = join(parent, "data");
  mkdirSync(store, { recursive: true });
  writeFileSync(join(parent, "abc.tmp.driveupload"), "");
  const prefs = fakeDriveFs(t, []); // sổ đọc ĐƯỢC, và nó rỗng

  const r = cloudSyncReport(store, { prefsPath: prefs });
  assert.equal(r.atRisk, false, "rác cũ MỘT MÌNH không được kết tội");
  assert.ok(r.residue.some((e) => e.kind === "marker"), "nhưng vẫn phải NÊU ra, không nuốt");
  assert.equal(r.inconclusive.length, 0);
});

test("nguồn thẩm quyền CÂM thì rác cũ được NÂNG thành bằng chứng", (t) => {
  // Đọc không được sổ root ⇒ ta mù về phạm vi đồng bộ thật; lúc đó dấu vết là thứ tốt nhất
  // đang có, và im lặng mới là lựa chọn nguy hiểm.
  const parent = tempDir(t, "zparent-");
  const store = join(parent, "data");
  mkdirSync(store, { recursive: true });
  writeFileSync(join(parent, "abc.tmp.driveupload"), "");

  const r = cloudSyncReport(store, { prefsPath: join(parent, "khong-co.db") });
  assert.equal(r.atRisk, true);
  assert.ok(r.evidence.some((e) => e.kind === "marker"));
});

test("isInside không khớp nhầm thư mục chỉ TRÙNG TIỀN TỐ", () => {
  assert.equal(isInside("C:\\ab\\x", "C:\\a"), false, "C:\\ab KHÔNG nằm trong C:\\a");
  assert.equal(isInside("C:\\a\\x", "C:\\a"), true);
  assert.equal(isInside("C:\\a", "C:\\a"), true, "chính nó cũng tính");
  assert.equal(isInside("d:\\HUY.nguyen\\k", "D:\\huy.nguyen"), true, "Windows không phân biệt hoa thường");
});
