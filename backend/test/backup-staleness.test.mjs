// `doctor` không được chấm ✓ cho một kho cả ngày không có bản sao lưu.
//
// Lỗ đo được 2026-08-23: ngưỡng đỏ duy nhất là 2× chu kỳ (2 ngày), nên bản mới nhất **27,9 giờ
// tuổi** vẫn hiện ✓ — đúng kiểu "bề mặt nói dối" mà `02_RULES` cấm. Nay ba mức:
//   ✓ trong chu kỳ · ○ quá 1 chu kỳ (chậm nhịp, thấy được, KHÔNG đỏ) · ✗ quá 2 (hỏng, đỏ).
//
// Mức giữa cố ý KHÔNG làm đỏ gate: chậm nhịp là chuyện thường (có kẻ giữ khoá, daemon vừa
// restart), và gate đỏ triền miên là gate bị bỏ qua — cùng lý lẽ đã dùng cho trần i18n.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupStale, listBackups, rotateBackup, DEFAULT_BACKUP_POLICY, BACKUP_STALE_FACTOR } from "../../dist/memory/backup-rotate.js";

const HOUR = 3_600_000;

/** Kho tạm + một bản backup có tuổi ĐẶT SẴN (đặt mtime, không chờ đồng hồ thật). */
function storeWithBackup(ageHours) {
  const root = mkdtempSync(join(tmpdir(), "zbak-"));
  const dataDir = join(root, "data");
  mkdirSync(join(dataDir, "backups"), { recursive: true });
  const dbPath = join(dataDir, "global_memory.db");
  writeFileSync(dbPath, "");
  if (ageHours !== null) {
    const b = join(dataDir, "backups", "global_memory-2026-01-01T00-00-00-000Z.db");
    writeFileSync(b, "");
    const t = (Date.now() - ageHours * HOUR) / 1000;
    utimesSync(b, t, t);
  }
  return { dbPath, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("the default cycle is 24 hours and the broken threshold is 2 cycles - the marks for all three levels", () => {
  assert.equal(DEFAULT_BACKUP_POLICY.everyMs, 24 * HOUR);
  assert.equal(BACKUP_STALE_FACTOR, 2);
});

// `keep` là hằng số NHÂN VỚI KÍCH THƯỚC KHO, nên nó âm thầm đắt lên theo thời gian: số 5 chọn hồi
// kho 595 MB, tới 2026-09-02 kho **2.738 MB** ⇒ `data/backups` đo được **18,5 GB**, trong đó 13,3 GB
// là 5 bản luân phiên (đúng chính sách, không phải bug — nhưng nằm dưới đường gitignore nên không
// cổng nào thấy nó lớn lên). User chốt **giữ 3 bản** ⇒ ~8,2 GB.
// Chốt số này vì trước đó KHÔNG cổng nào neo `keep` (chỉ neo `everyMs`) — một mặc định không ai canh
// là mặc định sẽ trôi, đúng ca `getRerankSetting()` từng bật lại và làm recall chậm 6,3×.
test("it keeps EXACTLY 3 copies - the default needs a keeper, otherwise it drifts back", () => {
  assert.equal(DEFAULT_BACKUP_POLICY.keep, 3, "user chốt 2026-09-02: giữ 3 bản");
  // Ràng buộc bản chất: phải ≥2 để luôn còn một thế hệ để lùi khi bản mới nhất hỏng, và đủ nhỏ để
  // không nhân với kho lớn thành hàng chục GB.
  assert.ok(DEFAULT_BACKUP_POLICY.keep >= 2, "1 bản là không có đường lùi nào khi bản đó hỏng");
  assert.ok(DEFAULT_BACKUP_POLICY.keep <= 3, "kho 2,7 GB thì mỗi bản thêm là +2,7 GB — đừng nới im lặng");
});

test("the three levels separate correctly: inside the cycle - past 1 cycle - past 2 cycles", () => {
  const cases = [
    // tuổi(giờ), stale, late, vì sao
    [1, false, false, "vừa chép xong"],
    [23, false, false, "còn trong chu kỳ"],
    [27.9, false, true, "ĐÚNG CA ĐÃ TRẢ GIÁ — trước bản vá chỗ này chấm ✓"],
    [47, false, true, "chậm nhịp nhưng chưa tới trần hỏng"],
    [49, true, false, "quá 2 chu kỳ ⇒ hỏng"],
  ];
  for (const [age, stale, late, why] of cases) {
    const s = storeWithBackup(age);
    try {
      const r = backupStale(s.dbPath);
      assert.equal(r.stale, stale, `${age} giờ (${why}): stale`);
      assert.equal(r.late, late, `${age} giờ (${why}): late`);
      // stale và late loại trừ nhau — hai cờ cùng bật thì bề mặt in hai dòng mâu thuẫn.
      assert.ok(!(r.stale && r.late), `${age} giờ: stale và late không được cùng bật`);
    } finally {
      s.cleanup();
    }
  }
});

test("NO copy at all means RED, not 'behind schedule'", () => {
  const s = storeWithBackup(null);
  try {
    const r = backupStale(s.dbPath);
    assert.equal(r.stale, true, "kho chạy mà không có lưới đỡ nào là tin đáng báo");
    assert.equal(r.late, false, "không có bản nào thì không phải chuyện trượt nhịp");
    assert.equal(r.ageMs, null);
  } finally {
    s.cleanup();
  }
});

test("the surface returns the full THRESHOLDS so the reader need not guess (everyMs + limitMs)", () => {
  // Thiếu hai số này thì dòng in ra chỉ có tuổi, và không ai biết trần là bao nhiêu —
  // đúng thứ làm ca 27,9 giờ trôi qua mà không ai thấy bất thường.
  const s = storeWithBackup(5);
  try {
    const r = backupStale(s.dbPath);
    assert.equal(r.everyMs, 24 * HOUR);
    assert.equal(r.limitMs, 48 * HOUR);
  } finally {
    s.cleanup();
  }
});

test("fail-open: an unreadable store folder must NOT be declared broken", () => {
  const r = backupStale(join(tmpdir(), "zbak-does-not-exist-" + Date.now(), "x.db"));
  assert.equal(r.stale, true, "không có thư mục backups = không có bản nào = đáng báo");
  assert.equal(r.late, false);
});

// ROTATION must delete the `-shm`/`-wal` sidecars too, not only the `.db`.
//
// Measured 2026-08-25 on the real store: 6 ORPHANED sidecar files from 3 copies rotated away on 26/07, 03/08 and
// 04/08 were still sitting in `data/backups/`. Every rotation leaves another pair behind => junk accumulates FOREVER,
// and the backup folder no longer shows which copy is still alive. The NEGATIVE case matters as much: the sidecars of a copy that is
// STILL ALIVE must not be touched.
test("backup rotation: deleting a .db deletes ITS -shm/-wal too, and never touches a living copy's sidecars", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "zbak-rot-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dataDir = join(root, "data");
  const bk = join(dataDir, "backups");
  mkdirSync(bk, { recursive: true });
  const dbPath = join(dataDir, "global_memory.db");
  writeFileSync(dbPath, "");

  // 3 old copies plus each one's sidecars; keep=1 => the 2 oldest must be rotated away
  const stamps = ["2026-01-01T00-00-00-000Z", "2026-01-02T00-00-00-000Z", "2026-01-03T00-00-00-000Z"];
  stamps.forEach((st, i) => {
    const f = join(bk, `global_memory-${st}.db`);
    writeFileSync(f, "");
    writeFileSync(f + "-shm", "");
    writeFileSync(f + "-wal", "");
    const t0 = (Date.now() - (10 - i) * HOUR) / 1000;
    utimesSync(f, t0, t0);
  });

  await rotateBackup({ dbPath, policy: { everyMs: 0, keep: 1 } });

  const left = listBackups(bk).map((x) => x.path);
  assert.ok(left.length <= 2, `keep=1 (plus the copy just written) yet ${left.length} copies remain`);
  for (const st of stamps) {
    const f = join(bk, `global_memory-${st}.db`);
    if (existsSync(f)) {
      // negative case: a copy STILL ALIVE must keep its sidecars
      assert.ok(existsSync(f + "-shm"), `a LIVING copy's sidecar was deleted wrongly: ${st}`);
      continue;
    }
    // a rotated-away copy => its sidecars must NOT remain
    assert.ok(!existsSync(f + "-shm"), `an orphaned -shm remained after rotation: ${st}`);
    assert.ok(!existsSync(f + "-wal"), `an orphaned -wal remained after rotation: ${st}`);
  }
});
