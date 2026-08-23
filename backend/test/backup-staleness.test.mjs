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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupStale, DEFAULT_BACKUP_POLICY, BACKUP_STALE_FACTOR } from "../../dist/memory/backup-rotate.js";

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

test("chu kỳ mặc định là 24 giờ và trần hỏng là 2 chu kỳ — mốc của cả ba mức", () => {
  assert.equal(DEFAULT_BACKUP_POLICY.everyMs, 24 * HOUR);
  assert.equal(BACKUP_STALE_FACTOR, 2);
});

test("ba mức phân biệt đúng: trong chu kỳ ✓ · quá 1 chu kỳ ○ · quá 2 chu kỳ ✗", () => {
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

test("CHƯA có bản nào ⇒ ĐỎ, không phải 'chậm nhịp'", () => {
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

test("bề mặt trả đủ MỐC để người đọc khỏi đoán (everyMs + limitMs)", () => {
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

test("fail-open: thư mục kho không đọc được ⇒ KHÔNG phán bừa là hỏng", () => {
  const r = backupStale(join(tmpdir(), "zbak-khong-ton-tai-" + Date.now(), "x.db"));
  assert.equal(r.stale, true, "không có thư mục backups = không có bản nào = đáng báo");
  assert.equal(r.late, false);
});
