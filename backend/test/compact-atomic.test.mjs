// GỘP KHO CHUNG KHÔNG ĐƯỢC ĐỂ KÊNH MẤT KHÚC 1 — kể cả khi bước cuối trượt.
//
// Sự cố THẬT (audit 2026-09-03, đo trên kênh đang chạy): một lượt `memory sync --compact`
// để lại `global_memory.enc` **0 byte / 0 khối** và toàn bộ 48 khối / 2,22 GB lịch sử chỉ còn
// ở `global_memory.bak.enc` — file mà lượt gộp KẾ TIẾP sẽ `rmSync` ngay dòng đầu. Mọi lượt sync
// từ đó trả `"Invalid zemory memory bundle header."` cho khúc 1 mà log vẫn in `auto-sync: OK`.
//
// Gốc: bản cũ dựng khúc tươi ở `os.tmpdir()` (ổ C:) rồi `renameSync` sang thư mục Drive (ổ G:,
// filesystem khác) ⇒ EXDEV, đích không tồn tại — trong khi mọi bước PHÁ (xoá bản lùi · dời khúc 1
// sang bản lùi · xoá khúc ≥2) đã chạy TRƯỚC đó, và không có try/catch nào.
//
// Vì sao cổng cũ không nổ được: ca `--compact` trong `memory-share.test.mjs` đặt `driveDir` ngay
// trong `tempDir()` ⇒ CÙNG volume ⇒ nhánh EXDEV không tồn tại trong test. Fixture khác production
// đúng ở chiều duy nhất có ý nghĩa. Nên ở đây ca hỏng được TIÊM bằng `ZEMORY_COMPACT_FAULT`.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { openMemory } from "../../dist/memory/db.js";
import { writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

/** Cùng khuôn `sandboxHome` của `memory-share.test.mjs`: trỏ HOME sang thư mục tạm để kho/config
 *  của test không bao giờ đụng kho THẬT của máy (HP điều 11 — một kẻ ghi cho một kho). */
function sandboxHome(t) {
  const home = tempDir(t, "zemory-compact-home-");
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

/** Đếm khối của một container ZCHUNK bằng tiền tố ĐỘ DÀI — không mượn hàm nội bộ của share.ts,
 *  để phép đo của cổng độc lập với thứ nó đang canh. */
function countChunks(path) {
  const MAGIC = "ZEMORY-MEMORY-CHUNKS v1\n";
  const buf = readFileSync(path);
  if (buf.length === 0) return 0;
  if (buf.toString("latin1", 0, MAGIC.length) !== MAGIC) return -1; // không phải container
  let off = MAGIC.length;
  let n = 0;
  while (off < buf.length) {
    const head = buf.toString("latin1", off, Math.min(off + 64, buf.length));
    const m = /^ZCHUNK (\d+)\n/.exec(head);
    if (!m) return -1; // rác ở đuôi
    off += m[0].length + Number(m[1]);
    n++;
  }
  return off === buf.length ? n : -1;
}

async function seed(t, label) {
  sandboxHome(t);
  const { syncDrive } = await import("../../dist/memory/share.js");
  const root = tempDir(t, label);
  const dbPath = join(root, "memory.db");
  const driveDir = join(root, "drive");
  const keyPath = join(root, "share.key");
  mkdirSync(driveDir, { recursive: true });

  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  ins.run("s1", "m1", "user", "tin mot", "2026-01-01T00:00:00Z");
  ins.run("s1", "m2", "user", "tin hai", "2026-01-01T00:01:00Z");
  db.close();

  writeMemoryShareKey(keyPath);
  process.env.ZEMORY_SHARE_KEY = readFileSync(keyPath, "utf8").trim();
  t.after(() => delete process.env.ZEMORY_SHARE_KEY);
  return { syncDrive, driveDir, dbPath, keyPath, main: join(driveDir, "global_memory.enc"), bak: join(driveDir, "global_memory.bak.enc") };
}

test("CA HỎNG: bước cuối của gộp trượt ⇒ kênh phải TRỞ LẠI đọc được, không mất khúc 1", async (t) => {
  const s = await seed(t, "zemory-compact-fault-");

  await s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false });
  const before = countChunks(s.main);
  assert.ok(before >= 1, `kênh phải có khối trước khi gộp (thấy ${before})`);

  process.env.ZEMORY_COMPACT_FAULT = "rename";
  t.after(() => delete process.env.ZEMORY_COMPACT_FAULT);

  await assert.rejects(
    () => s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false, compact: true }),
    /EXDEV|tiêm lỗi/,
    "lượt gộp trượt thì phải NÉM lỗi, không được báo thành công",
  );

  // Đây là bất biến chịu lực: kênh không được ở trạng thái "khúc 1 mất/không đọc được".
  assert.ok(existsSync(s.main), "khúc 1 phải còn — mất nó là máy mới nhận kênh RỖNG (HP điều 16)");
  assert.notEqual(statSync(s.main).size, 0, "khúc 1 0 byte chính là hiện trạng đã hỏng ngoài thực địa");
  assert.equal(countChunks(s.main), before, `khúc 1 phải đọc được và đủ ${before} khối như trước lượt gộp`);
});

test("CA HỎNG: trượt rồi thì KHÔNG được để lại file tạm nào trên kênh", async (t) => {
  const s = await seed(t, "zemory-compact-litter-");
  await s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false });

  process.env.ZEMORY_COMPACT_FAULT = "rename";
  t.after(() => delete process.env.ZEMORY_COMPACT_FAULT);
  await assert.rejects(() => s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false, compact: true }));

  // `listChunks` DỪNG khi gặp byte lạ, nên rác trong thư mục kênh là thứ mọi máy phải đọc qua.
  const litter = readdirSync(s.driveDir).filter((f) => f.includes(".staged-"));
  assert.deepEqual(litter, [], `không được để lại bản chép dở: ${litter.join(", ")}`);
});

test("CA ÂM: không tiêm lỗi ⇒ gộp vẫn phải chạy đúng như cũ (một khối, có bản lùi)", async (t) => {
  const s = await seed(t, "zemory-compact-ok-");
  await s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false });

  delete process.env.ZEMORY_COMPACT_FAULT; // nói rõ: ca này KHÔNG có mối nối nào bật
  const r = await s.syncDrive({ driveDir: s.driveDir, keyFile: s.keyPath, dbPath: s.dbPath, embed: false, compact: true });

  assert.equal(r.push.kind, "compact", "có cờ ⇒ phải gộp thật");
  assert.equal(countChunks(s.main), 1, "gộp xong khúc 1 phải là container MỘT khối, đọc được");
  assert.ok(existsSync(s.bak), "phải giữ đúng một thế hệ bản lùi");
  assert.ok(countChunks(s.bak) >= 1, "bản lùi cũng phải là container đọc được, không phải file rác");
  assert.deepEqual(
    readdirSync(s.driveDir).filter((f) => f.includes(".staged-")),
    [],
    "lượt THÀNH CÔNG cũng không được để lại file tạm",
  );
});
