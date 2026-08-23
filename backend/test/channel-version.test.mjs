// Tem phiên bản trên kênh chung — thứ cho máy B biết máy A đã có bản mới.
//
// Bài toán gốc: `syncCheck` (2026-08-21) so repo với bản zemory ĐANG CÀI TRÊN MÁY NÀY, nên
// máy A pull+build thì repo trên máy A được nhắc, còn **máy B mù hoàn toàn**. Tem này lấp
// đúng vế đó, và đi qua kênh Drive sẵn có (mọi máy đã poll 30′/lần) thay vì hỏi GitHub —
// không thêm lớp mạng, không thêm đồng hồ.
//
// Bất biến quan trọng nhất được khoá ở đây: **tem CHỈ ĐI LÊN**. Một máy còn chạy bản cũ mà
// ghi đè tem sẽ kéo lùi cảnh báo của MỌI máy khác, và bệnh đó im lặng — ai cũng thấy
// "đã mới nhất". Cùng doctrine ADDITIVE của HP điều 11.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cmpSemver, publishChannelVersion, readChannelVersion } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

// `tempDir` của helpers: tự dọn ở t.after.
function scratch(t) {
  return { dir: tempDir(t, "zver-"), cleanup: () => {} };
}

test("cmpSemver so đúng theo từng bậc, không so chuỗi", () => {
  assert.ok(cmpSemver("2.4.0", "2.3.0") > 0);
  assert.ok(cmpSemver("2.10.0", "2.9.0") > 0, "10 > 9 — so chuỗi sẽ ra NGƯỢC, đây là bẫy kinh điển");
  assert.ok(cmpSemver("2.3.1", "2.3.0") > 0);
  assert.equal(cmpSemver("2.3.0", "2.3.0"), 0);
  assert.ok(cmpSemver("2.3.0", "2.4.0") < 0);
  // Fail-open: rác không được ném, chỉ coi phần không đọc được là 0.
  assert.equal(cmpSemver("", ""), 0);
  assert.ok(cmpSemver("1.0.0", "abc") > 0);
});

test("chưa có tem ⇒ đóng dấu mới; đọc lại ra đúng thứ vừa ghi", (t) => {
  const s = scratch(t);
  try {
    assert.equal(readChannelVersion(s.dir), null, "kênh trắng ⇒ null, không được ném");
    const w = publishChannelVersion(s.dir, "2.3.0", "MAY-A", "abc1234");
    assert.equal(w?.latest, "2.3.0");
    const r = readChannelVersion(s.dir);
    assert.equal(r.latest, "2.3.0");
    assert.equal(r.host, "MAY-A");
    assert.equal(r.commit, "abc1234");
    assert.ok(r.at, "phải có mốc thời gian — không có thì người đọc không biết tem cũ hay mới");
  } finally {
    s.cleanup();
  }
});

test("TEM CHỈ ĐI LÊN — máy chạy bản CŨ không được kéo lùi tem của kênh", (t) => {
  const s = scratch(t);
  try {
    publishChannelVersion(s.dir, "2.4.0", "MAY-A");
    // Máy B còn 2.3.0 chạy sync: nó KHÔNG được ghi đè.
    const back = publishChannelVersion(s.dir, "2.3.0", "MAY-B");
    assert.equal(back.latest, "2.4.0", "bản cũ ghi đè = mọi máy khác thôi được cảnh báo, im lặng");
    assert.equal(readChannelVersion(s.dir).host, "MAY-A", "chủ tem phải vẫn là máy đã build bản mới");
    // Bằng nhau cũng không ghi lại (khỏi đánh thức thư mục đồng bộ vô cớ mỗi 30 phút).
    const same = publishChannelVersion(s.dir, "2.4.0", "MAY-C");
    assert.equal(same.host, "MAY-A");
    // Nhưng MỚI HƠN thì phải lên.
    assert.equal(publishChannelVersion(s.dir, "2.5.0", "MAY-C").latest, "2.5.0");
    assert.equal(readChannelVersion(s.dir).host, "MAY-C");
  } finally {
    s.cleanup();
  }
});

test("fail-open: thư mục không tồn tại · JSON hỏng · tem thiếu trường ⇒ null, KHÔNG ném", (t) => {
  const s = scratch(t);
  try {
    assert.equal(readChannelVersion(join(s.dir, "khong-co")), null);
    assert.equal(publishChannelVersion(join(s.dir, "khong-co"), "2.3.0", "X"), null, "ghi hỏng không được làm chết lượt sync");

    writeFileSync(join(s.dir, "version.json"), "{ khong phai json", "utf8");
    assert.equal(readChannelVersion(s.dir), null, "JSON hỏng ⇒ coi như chưa có tem");

    writeFileSync(join(s.dir, "version.json"), JSON.stringify({ host: "X" }), "utf8");
    assert.equal(readChannelVersion(s.dir), null, "thiếu `latest` ⇒ vô nghĩa, phải trả null");
  } finally {
    s.cleanup();
  }
});

test("CA ÂM: version rỗng không được đóng dấu (không đẻ tem rác lên kênh dùng chung)", (t) => {
  const s = scratch(t);
  try {
    assert.equal(publishChannelVersion(s.dir, "", "MAY-A"), null);
    assert.ok(!existsSync(join(s.dir, "version.json")), "không được tạo file nào");
  } finally {
    s.cleanup();
  }
});

test("tem là JSON đọc được bằng mắt (người phải soi được kênh khi nghi ngờ)", (t) => {
  const s = scratch(t);
  try {
    publishChannelVersion(s.dir, "2.4.0", "MAY-A", "deadbee");
    const raw = readFileSync(join(s.dir, "version.json"), "utf8");
    assert.match(raw, /\n/, "phải xuống dòng — một dòng dài là thứ không ai đọc nổi trên Drive");
    const o = JSON.parse(raw);
    assert.deepEqual(Object.keys(o).sort(), ["at", "commit", "host", "latest"]);
  } finally {
    s.cleanup();
  }
});
