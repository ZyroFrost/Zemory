// KHO COOKIE MỞ KHÔNG ĐƯỢC CHỈ ĐƯỢC THỬ MỘT LẦN MỖI LƯỢT.
//
// Sinh từ audit 2026-09-12. `/connections` mất **10–12 giây** ở lượt ẤM; truy xuống thì chi phí
// không nằm ở việc đọc (ba kho cộng lại 0,6 MB) mà ở **một kho MỞ KHÔNG ĐƯỢC**: trình duyệt đang
// chạy giữ khoá, và một lượt `new Database()` trượt mất **1.448 ms** mới chịu ném — hai kho mở
// được chỉ tốn 0–1 ms. Code cũ thử lại đúng kho bị giữ đó cho TỪNG nền ⇒ 12 nền × 1,45 s ≈ 17 s.
// Sáu nền thêm cùng ngày không tạo ra chi phí này, chúng chỉ nhân đôi nó (6 nền: 7,3 s).
//
// 🔴 Vì sao cổng này đo BỘ ĐẾM chứ không đo THỜI GIAN: thứ bản vá hứa là **không làm một việc**, mà
// "không làm" thì không nhìn thấy ở kết quả trả về — bản có đệm và bản không trả y hệt nhau. Neo
// vào thời gian thì ca chập chờn theo máy; neo vào bộ đếm thì nó đo đúng cơ chế. Không có cổng
// nào, bản vá mục đi mà mọi thứ vẫn xanh — đúng cách 16 giây kia lọt qua tới tận lượt audit.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clearJarCache, findBorrowSource, jarProbeCounters } from "../../dist/memory/borrowcookies.js";
import { WEB_PLATFORMS } from "../../dist/memory/webslots.js";
import { tempDir } from "./helpers.mjs";

/** Một "trình duyệt" giả có đúng một profile, kho cookie KHÔNG phải SQLite ⇒ mở là ném. */
function brokenSource(root) {
  const userData = join(root, "User Data");
  mkdirSync(join(userData, "Default", "Network"), { recursive: true });
  writeFileSync(join(userData, "Default", "Network", "Cookies"), "đây không phải file SQLite");
  return [{ key: "gia", label: "Trình duyệt giả", userData, exe: process.execPath }];
}

test("a jar that CANNOT be opened is probed exactly ONCE, even when all 12 platforms ask", (t) => {
  const sources = brokenSource(tempDir(t, "zm-jar-"));
  clearJarCache();

  for (const k of WEB_PLATFORMS) {
    // Không được ném ra ngoài: người gọi vẫn phải nhận "không mượn được", không phải một lỗi.
    assert.doesNotThrow(() => findBorrowSource(k, sources), `nền ${k} không được làm vỡ lượt quét`);
  }

  const c = jarProbeCounters();
  assert.equal(c.opened, 1, `kho hỏng chỉ được chạm ĐÚNG MỘT lần — thấy ${c.opened} lượt (mỗi lượt trượt tốn ~1,4 s trên máy thật)`);
  assert.ok(c.skipped > 0, "các lượt sau phải được đệm cứu, không phải im lặng bỏ qua");
});

test("negative case: `clearJarCache` must REALLY clear - otherwise the cache becomes permanent", (t) => {
  const sources = brokenSource(tempDir(t, "zm-jar2-"));
  clearJarCache();
  findBorrowSource(WEB_PLATFORMS[0], sources);
  assert.equal(jarProbeCounters().opened, 1);

  clearJarCache();
  assert.deepEqual(jarProbeCounters(), { opened: 0, skipped: 0 }, "bộ đếm phải về 0");
  findBorrowSource(WEB_PLATFORMS[0], sources);
  assert.equal(jarProbeCounters().opened, 1, "sau khi xoá đệm thì kho phải được thử LẠI — nếu không, một lần trượt là mù vĩnh viễn");
});
