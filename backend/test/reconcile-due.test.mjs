// NHỊP ĐỐI CHIẾU KÊNH — 7 ngày, và cái trần đó là RÀNG BUỘC VẬT LÝ, không phải sở thích.
//
// Vì sao có bước đối chiếu: đường sync chở vector theo cuốn sổ `vec_shipped`, mà sổ đó được GIEO
// bằng toàn bộ vector đang có lúc nâng schema v23 ⇒ mù cấu trúc với phần hụt có TRƯỚC mốc đó
// (`plan/08 §8b`). Đo 2026-09-03: sổ báo thiếu 497, dựng lại kênh thật ra thiếu **6.310**. Chỉ
// phép dựng-lại-rồi-so nhìn ra được, và không lượt sync nào tự phát hiện.
//
// Vì sao KHÔNG được siết nhịp xuống: phép này giải mã cả kênh (~2,3 GB, 6 phút). Ở nhịp 30 phút
// nó đọc 2,3 GB × 48 lượt/ngày qua ổ ảo Drive — đúng tải đã làm DriveFS treo cứng hai lần trong
// một giờ ngày 30/08 và là lý do `plan/08 §8e` phải chia khúc. Nên cổng này ghim nhịp bằng HÀNH VI
// (gọi hàm với các mốc thời gian thật), không bằng regex trên chữ — một cổng đọc chữ sẽ xanh y
// nguyên khi có người đổi hằng số mà giữ tên.
import assert from "node:assert/strict";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

const DAY = 24 * 60 * 60_000;

/** HOME tạm: `reconcileDue` đọc `getDriveDir()` từ config, nên không sandbox là test ăn vào
 *  config THẬT của máy (và tệ hơn: đổi nó). */
function sandboxHome(t) {
  const home = tempDir(t, "zemory-reconcile-home-");
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

test("CA ÂM: chưa nối kênh ⇒ KHÔNG bao giờ đối chiếu, kể cả khi chưa chạy lần nào", async (t) => {
  sandboxHome(t);
  const { reconcileDue } = await import("../../dist/jobs/scheduler.js");
  const { setDriveDir } = await import("../../dist/config/settings.js");
  setDriveDir("");
  assert.equal(reconcileDue(null), false, "không có kênh thì không có gì để dựng lại — đừng đốt 6 phút mỗi tuần");
  assert.equal(reconcileDue(Date.now() - 400 * DAY), false, "kể cả 'quá hạn' cả năm: vẫn không có kênh");
});

test("chưa chạy lần nào ⇒ chạy lượt đầu; vừa chạy ⇒ nghỉ", async (t) => {
  const home = sandboxHome(t);
  const { reconcileDue } = await import("../../dist/jobs/scheduler.js");
  const { setDriveDir } = await import("../../dist/config/settings.js");
  setDriveDir(home); // chỉ cần MỘT đường khác rỗng — hàm chỉ hỏi "có nối kênh không"

  const now = Date.now();
  assert.equal(reconcileDue(null, now), true, "kho chung chưa từng được đối chiếu ⇒ phải đo một lượt");
  assert.equal(reconcileDue(now, now), false, "vừa chạy xong thì nghỉ");
  assert.equal(reconcileDue(now - 60_000, now), false, "một phút trước ⇒ nghỉ");
});

test("nhịp ghim ở ~7 NGÀY: 6 ngày chưa tới lượt, 8 ngày thì tới", async (t) => {
  const home = sandboxHome(t);
  const { reconcileDue } = await import("../../dist/jobs/scheduler.js");
  const { setDriveDir } = await import("../../dist/config/settings.js");
  setDriveDir(home);
  const now = Date.now();

  // Đây là phép ghim TRẦN DƯỚI: ai siết nhịp về 30 phút / 1 giờ / 1 ngày là ca này ĐỎ.
  assert.equal(reconcileDue(now - 6 * DAY, now), false, "6 ngày CHƯA tới lượt — siết nhịp là tái tạo đúng tải làm DriveFS treo");
  // Và phép ghim TRẦN TRÊN: ai nới lên 30 ngày thì một lượt bàn giao máy mới có thể cũ cả tháng.
  assert.equal(reconcileDue(now - 8 * DAY, now), true, "8 ngày thì PHẢI tới lượt — nới nhịp là để kênh lệch âm thầm lâu hơn");
});
