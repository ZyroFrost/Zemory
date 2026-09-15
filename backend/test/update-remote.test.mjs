// PHÉP "CÓ BẢN MỚI KHÔNG" — đo từ git, và không bao giờ bị một nguồn CŨ kéo xuống.
//
// Ca thật đã đẻ ra cổng này (2026-09-15): máy thứ hai báo bản mới nhất là **2.18.0** trong khi
// máy này đã phát hành 3.0.0 rồi 3.1.0. Không máy nào hỏng — nguồn hỏng: số đó đọc từ tem
// `<Drive>/version.json`, mà tem chỉ được đóng ở cuối một lượt `syncDrive` trót lọt, và lượt
// gần nhất chạy TRƯỚC cả hai lần bump. Bệnh im lặng tuyệt đối: máy kia thấy "đã mới nhất".
//
// Bất biến phải giữ, theo đúng thứ tự quan trọng:
//   ① nguồn CŨ không bao giờ che được nguồn MỚI (lấy max, không lấy theo thứ tự ưu tiên);
//   ② đo hỏng ⇒ IM, không ném — đây là lớp nhắc, không được làm chết đường chính;
//   ③ cache có hạn, và lượt HỎNG hết hạn nhanh hơn lượt tốt.

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ERR_TTL_MS,
  OK_TTL_MS,
  cacheDue,
  pickUpdate,
  readUpdateCache,
  shaFromLsRemote,
  versionFromPackageJson,
  writeUpdateCache,
} from "../../dist/update/remote-version.js";
import { tempDir } from "./helpers.mjs";

const SHA = "a3968b0c1d2e3f405162738495a6b7c8d9e0f1a2";

test("đọc sha của HEAD từ output ls-remote, bỏ qua ref khác", () => {
  assert.equal(shaFromLsRemote(`${SHA}\tHEAD`), SHA);
  assert.equal(shaFromLsRemote(`ffffffffffffffffffffffffffffffffffffffff\trefs/heads/main\n${SHA}\tHEAD`), SHA);
  assert.equal(shaFromLsRemote(""), "", "không có dòng HEAD ⇒ rỗng, không đoán");
  assert.equal(shaFromLsRemote("fatal: could not read Username"), "", "thông báo lỗi KHÔNG được đọc thành sha");
});

test("đọc version từ package.json, và chịu được rác", () => {
  assert.equal(versionFromPackageJson('{"version":"3.1.0"}'), "3.1.0");
  assert.equal(versionFromPackageJson('{"name":"zemory"}'), "", "thiếu version ⇒ rỗng");
  assert.equal(versionFromPackageJson('{"version":3}'), "", "version không phải chuỗi ⇒ rỗng");
  assert.equal(versionFromPackageJson("không phải JSON"), "", "JSON hỏng ⇒ rỗng, KHÔNG ném");
});

test("🔴 tem kênh chung CŨ không được che bản mới đo từ git", () => {
  // Đây LÀ ca đã xảy ra: tem 2.18.0 (14/09) vs git 3.1.0. Bản cũ trả về tem ⇒ máy kia im.
  const u = pickUpdate("2.18.0", { ok: true, latest: "3.1.0", commit: "a3968b0", at: "2026-09-15T19:24:30+07:00" }, { latest: "2.18.0", host: "MAY-A", at: "2026-09-14T02:56:22Z" });
  assert.equal(u.latest, "3.1.0");
  assert.equal(u.source, "git");
  assert.equal(u.from, "a3968b0");
});

test("tem kênh vẫn dùng được khi git KHÔNG đo được — nguồn phụ không bị bỏ", () => {
  const u = pickUpdate("2.17.0", { ok: false, error: "git ls-remote: no network" }, { latest: "2.18.0", host: "MAY-A", at: "x" });
  assert.equal(u.latest, "2.18.0");
  assert.equal(u.source, "channel");
  assert.equal(u.from, "MAY-A");
});

test("tem MỚI HƠN git thì tem thắng — lấy max, không phải 'git luôn đúng'", () => {
  // Ca thật: máy kia vừa build xong bản chưa push. Chọn theo ưu tiên nguồn sẽ giấu mất nó.
  const u = pickUpdate("3.0.0", { ok: true, latest: "3.1.0", commit: "abc1234", at: "" }, { latest: "3.2.0", host: "MAY-B", at: "" });
  assert.equal(u.latest, "3.2.0");
  assert.equal(u.source, "channel");
});

test("đã là bản mới nhất (hoặc mới hơn) ⇒ undefined, chip im", () => {
  assert.equal(pickUpdate("3.1.0", { ok: true, latest: "3.1.0" }, { latest: "3.1.0", host: "A" }), undefined);
  assert.equal(pickUpdate("3.2.0", { ok: true, latest: "3.1.0" }, { latest: "2.18.0", host: "A" }), undefined, "máy đang chạy bản cao hơn cả hai nguồn ⇒ không nhắc");
  assert.equal(pickUpdate("", { ok: true, latest: "3.1.0" }, null), undefined, "không biết mình đang chạy gì ⇒ không đoán");
  assert.equal(pickUpdate("2.0.0", null, null), undefined, "không nguồn nào trả lời ⇒ im");
  assert.equal(pickUpdate("2.0.0", { ok: false, latest: "9.9.9" }, null), undefined, "lượt đo HỎNG không được dùng số của nó");
});

test("so theo từng nấc, không so chuỗi", () => {
  const u = pickUpdate("2.9.0", { ok: true, latest: "2.10.0", commit: "c" }, null);
  assert.equal(u.latest, "2.10.0", "10 > 9 — so chuỗi sẽ ra NGƯỢC, đây là bẫy kinh điển");
});

test("cache: chưa đo bao giờ ⇒ tới hạn; lượt HỎNG hết hạn nhanh hơn lượt tốt", () => {
  const now = Date.UTC(2026, 8, 15, 12, 0, 0);
  const at = (msAgo) => new Date(now - msAgo).toISOString();
  assert.equal(cacheDue(null, now), true);
  assert.equal(cacheDue({ checkedAt: "không phải ngày", ok: true }, now), true, "ngày hỏng ⇒ đo lại, không tin bừa");
  assert.equal(cacheDue({ checkedAt: at(OK_TTL_MS - 60_000), ok: true, latest: "3.1.0" }, now), false);
  assert.equal(cacheDue({ checkedAt: at(OK_TTL_MS + 1), ok: true, latest: "3.1.0" }, now), true);
  assert.equal(cacheDue({ checkedAt: at(ERR_TTL_MS + 1), ok: false, error: "x" }, now), true);
  assert.equal(cacheDue({ checkedAt: at(ERR_TTL_MS - 60_000), ok: false, error: "x" }, now), false, "mạng chập chờn: thử lại sớm, nhưng KHÔNG mỗi lượt render");
  assert.ok(ERR_TTL_MS < OK_TTL_MS, "lượt hỏng phải hết hạn sớm hơn lượt tốt");
});

test("cache đọc/ghi được, và file hỏng ⇒ coi như chưa đo (fail-open)", (t) => {
  const dir = tempDir(t, "zemory-upd-");
  const f = join(dir, "update-check.json");
  assert.equal(readUpdateCache(f), null, "chưa có file ⇒ null, không ném");
  writeUpdateCache({ ok: true, latest: "3.1.0", commit: "a3968b0", at: "2026-09-15T19:24:30+07:00", checkedAt: new Date().toISOString() }, f);
  assert.equal(readUpdateCache(f).latest, "3.1.0");
  assert.equal(JSON.parse(readFileSync(f, "utf8")).commit, "a3968b0");
  writeFileSync(f, "{ hỏng");
  assert.equal(readUpdateCache(f), null, "JSON hỏng ⇒ null");
  writeFileSync(f, JSON.stringify({ ok: true, latest: "3.1.0" }));
  assert.equal(readUpdateCache(f), null, "thiếu checkedAt ⇒ không biết cũ hay mới, phải đo lại");
  writeUpdateCache({ ok: true, checkedAt: "x" }, join(dir, "khong-co-thu-muc-nay", "sub", "a.json"));
  assert.equal(existsSync(join(dir, "khong-co-thu-muc-nay", "sub", "a.json")), true, "ghi tạo được thư mục; và có hỏng cũng không được ném");
});
