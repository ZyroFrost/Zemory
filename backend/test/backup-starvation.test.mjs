// Cổng chống BỎ ĐÓI BACKUP — sinh từ audit 2026-08-21.
//
// Bệnh đo được ngày đó: khoá ghi CLI là MỘT file cho cả thư mục `data/`
// (`cli-write.lock`, nội dung chỉ `{pid,label,at}`), nên job re-embed kho SONG SONG
// (`global_memory.bgem3.db`, plan 19) giữ khoá 44 giờ đã làm `backupTick` của kho THẬT
// nhường liên tục — hai file KHÁC NHAU, không hề tranh nhau. Giá: **27,0 giờ** không có bản
// sao lưu, **1.946 tin** nằm đúng một bản, và **không một dòng log nào** (nhánh nhường nằm
// TRƯỚC `try`). Đây là cửa thứ BA của cùng một bệnh: trước đó backup chết 4 ngày vì treo vào
// công tắc `scheduler`, và autosync từng bị bỏ đói y hệt.
//
// Ba bất biến, và ca ÂM là ca quan trọng nhất (luật 7 của skill audit — cổng chỉ chạy ca
// "phải chặn" thì không biết nó có CHẶN NHẦM không, mà chặn nhầm ở đây = bỏ đói lưới đỡ cuối):
//   ① kẻ ghi ở kho KHÁC ⇒ KHÔNG xung đột (ca ÂM — chính là bug vừa vá);
//   ② kẻ ghi ở CÙNG kho ⇒ xung đột (giữ nguyên lý do khoá tồn tại: không chép khi đang bị ghi);
//   ③ khoá đời CŨ (không khai kho) ⇒ coi là xung đột (an toàn, tự lành khi mã mới chạy);
//   ④ tuổi bản sao lưu quá 2 chu kỳ ⇒ `backupStale` báo — thứ để `doctor` đỏ được.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// `GLOBAL_MEMORY_DB` bị CHỐT lúc nạp module (`const ENV_DB = …` trong db.ts) ⇒ phải đặt TRƯỚC
// import, và vì thế dùng import ĐỘNG. Không làm vậy thì khoá rơi vào `data/` THẬT của máy —
// test sẽ đọc đúng cái khoá mà job embed THẬT đang giữ, và mọi phép kiểm dưới đây thành vô
// nghĩa (bài học "test không được đụng tài nguyên thật của repo", 2026-08-20).
const DIR = mkdtempSync(join(tmpdir(), "zemory-starve-"));
process.env.GLOBAL_MEMORY_DB = join(DIR, "global_memory.db");
const REAL = process.env.GLOBAL_MEMORY_DB;
const PARALLEL = join(DIR, "global_memory.bgem3.db");
const LOCK = join(DIR, "cli-write.lock");
// pid NGOẠI còn sống chắc chắn. KHÔNG dùng pid 1: trên Windows nó không tồn tại (ESRCH) nên
// khoá bị coi là mồ côi và mọi phép kiểm "phải nhường" đều xanh giả.
const OTHER_PID = process.ppid;

const { cliHoldsWriteOn, cliWriteHolder } = await import("../../dist/jobs/writegate.js");
const { backupStale, BACKUP_STALE_FACTOR } = await import("../../dist/memory/backup-rotate.js");

const DAY = 24 * 60 * 60_000;

/** Đặt khoá ghi bằng TAY — mô phỏng một tiến trình KHÁC đang giữ, rồi dọn sau mỗi ca. */
function putLock(t, lock) {
  writeFileSync(LOCK, JSON.stringify({ pid: OTHER_PID, at: Date.now(), ...lock }));
  t.after(() => rmSync(LOCK, { force: true }));
}

test("1 NEGATIVE CASE - a writer on a DIFFERENT store does not block the real store's backup", (t) => {
  putLock(t, { label: "embed", db: PARALLEL });
  assert.equal(cliWriteHolder()?.label, "embed", "khoá phải đọc được, không thì ca này vô nghĩa");
  assert.equal(
    cliHoldsWriteOn(REAL),
    false,
    "job ghi kho SONG SONG không được làm backup kho THẬT phải nhường — đây đúng là bug 27 giờ",
  );
});

test("2 a writer on the SAME store still has to yield", (t) => {
  putLock(t, { label: "embed", db: REAL });
  assert.equal(cliHoldsWriteOn(REAL), true, "chép kho đang bị ghi là đúng kiểu tranh chấp đã hỏng DB 03/08");
});

test("2b the store path comparison ignores case and forward vs back slashes (Windows)", (t) => {
  putLock(t, { label: "embed", db: REAL.replace(/\\/g, "/").toUpperCase() });
  assert.equal(cliHoldsWriteOn(REAL), true, "cùng một file viết khác kiểu vẫn là cùng một file");
});

test("3 an OLD-generation lock (no store declared) counts as a conflict, never guessed idle", (t) => {
  putLock(t, { label: "embed" }); // khuôn trước 2026-08-21
  assert.equal(cliHoldsWriteOn(REAL), true, "không biết nó ghi kho nào ⇒ thà chờ hơn là chép giữa lúc bị ghi");
});

test("3b no lock at all means NO conflict (do not block when nobody is there)", () => {
  rmSync(LOCK, { force: true });
  assert.equal(cliHoldsWriteOn(REAL), false);
});

test("3c the IN-MEMORY flag must carry the store identity too - and the FILE lock decides first", async (t) => {
  // Bản vá đầu chỉ dạy khoá FILE khai kho; cờ `holdUntil` (CLI báo qua `/gate-acquire`) thì không,
  // mà nó lại được xét TRƯỚC ⇒ phủ quyết ngược và backup vẫn nhường **24 lượt liên tiếp** (đo
  // 2026-08-22 trên log daemon thật). Ca này khoá cả hai vế của bản vá đó.
  const { acquireCliWrite, releaseCliWrite } = await import("../../dist/jobs/writegate.js");
  t.after(() => releaseCliWrite());

  rmSync(LOCK, { force: true });
  acquireCliWrite(PARALLEL);
  assert.equal(cliHoldsWriteOn(REAL), false, "CLI khai ghi kho song song ⇒ kho thật KHÔNG bị chặn");
  assert.equal(cliHoldsWriteOn(PARALLEL), true, "chính kho nó khai thì phải chặn");

  releaseCliWrite();
  acquireCliWrite(undefined); // CLI đời cũ: không khai kho
  assert.equal(cliHoldsWriteOn(REAL), true, "không khai kho ⇒ coi là xung đột (an toàn)");

  // Khoá FILE (có danh tính) phải THẮNG cờ bộ nhớ (không danh tính).
  putLock(t, { label: "embed", db: PARALLEL });
  assert.equal(cliHoldsWriteOn(REAL), false, "khoá file khai kho khác ⇒ quyết trước, không để cờ phủ ngược");
});

test("4 a backup older than 2 cycles makes backupStale REPORT (the path for doctor to go red)", () => {
  const bak = join(DIR, "backups");
  mkdirSync(bak, { recursive: true });
  const p = join(bak, "global_memory-2026-08-20T12-32-45-260Z.db");
  writeFileSync(p, "x");
  const age = (ms) => {
    const s = (Date.now() - ms) / 1000;
    utimesSync(p, s, s);
  };

  age(3 * 60 * 60_000);
  assert.equal(backupStale(REAL).stale, false, "3 giờ tuổi là bình thường; báo là gate nhiễu");

  age(BACKUP_STALE_FACTOR * DAY + 60_000);
  const st = backupStale(REAL);
  assert.equal(st.stale, true, "quá 2 ngày là HỎNG, không phải chậm nhịp");
  assert.ok(st.ageMs > BACKUP_STALE_FACTOR * DAY, "phải trả tuổi THẬT để bề mặt in được số");
  rmSync(p, { force: true });
});

test("4b having NO copy at all is also overdue (a running store with no safety net)", () => {
  const st = backupStale(join(DIR, "khong-co-o-dau", "global_memory.db"));
  assert.equal(st.stale, true);
  assert.equal(st.ageMs, null, "không có bản thì tuổi là null, KHÔNG được bịa số 0");
});
