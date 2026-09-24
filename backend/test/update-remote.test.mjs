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
  aheadOfRepo,
  cacheDue,
  isPhantomStamp,
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

test("🔴 tem chỉ vào bản KHÔNG TỒN TẠI (git đã đi tiếp mà vẫn không có số đó) ⇒ bỏ tem", () => {
  // Ca thật 2026-09-24: tem `3.6.0` đóng dấu 22/09, rồi lượt đánh số lại lịch sử 23/09 xoá số đó
  // khỏi mọi commit/tag. Git đi tiếp tới 3.5.6 ngày 24/09. Lấy max thì bản ma thắng ⇒ bề mặt mời
  // cập nhật lên thứ không tải về được, và mời MÃI vì tem chỉ đi lên.
  const u = pickUpdate(
    "3.5.6",
    { ok: true, latest: "3.5.6", commit: "745b17a", at: "2026-09-24T15:42:53+07:00" },
    { latest: "3.6.0", host: "SS01-IT-12", at: "2026-09-22T19:34:09.417Z" },
  );
  assert.equal(u, undefined, "bản ma không được mời cập nhật");

  // CA ÂM — ĐÚNG ca mà luật lấy-max sinh ra, và nó phải SỐNG NGUYÊN: máy kia vừa build xong bản
  // chưa push ⇒ nó đóng dấu SAU commit cuối của git ⇒ tem còn nói điều git chưa biết.
  const v = pickUpdate(
    "3.0.0",
    { ok: true, latest: "3.1.0", commit: "abc1234", at: "2026-09-20T10:00:00Z" },
    { latest: "3.2.0", host: "MAY-B", at: "2026-09-21T10:00:00Z" },
  );
  assert.equal(v.latest, "3.2.0", "bản chưa push vẫn phải được nhắc — đừng giấu");
  assert.equal(v.source, "channel");

  // CA ÂM — THIẾU MỐC: không đủ căn cứ thì KHÔNG kết luận là ma. Im lặng nhầm còn hơn giấu bản thật.
  assert.equal(isPhantomStamp({ ok: true, latest: "3.1.0", at: "" }, { latest: "3.2.0", at: "" }), false);
  assert.equal(isPhantomStamp({ ok: true, latest: "3.1.0" }, { latest: "3.2.0", at: "2026-09-21T10:00:00Z" }), false);
  // CA ÂM — tem KHÔNG vượt git thì không có gì để nghi, bất kể mốc.
  assert.equal(isPhantomStamp({ ok: true, latest: "3.5.6", at: "2026-09-24T00:00:00Z" }, { latest: "3.5.0", at: "2026-09-01T00:00:00Z" }), false);
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

test("đệm hết hạn NGAY khi bản trên máy đổi — đừng nói dối suốt 6 tiếng", () => {
  // 🔴 Ca thật 23/09: sau một lượt hạ version (viết lại lịch sử git), app còn khoe "bản mới trên
  // git 3.6.0, commit f1cce93" — một bản VÀ một commit không còn tồn tại trên origin. Với TTL 6
  // giờ, nó sẽ nói dối suốt 6 tiếng và người dùng không có cách nào bảo nó đo lại ngoài chờ.
  const now = Date.parse("2026-09-23T10:00:00Z");
  const fresh = { ok: true, latest: "3.6.0", commit: "f1cce93", checkedAt: "2026-09-23T09:59:00Z", have: "3.6.0" };

  assert.equal(cacheDue(fresh, now, undefined, undefined, "3.6.0"), false, "cùng bản, còn hạn ⇒ giữ đệm");
  assert.equal(cacheDue(fresh, now, undefined, undefined, "3.4.5"), true, "ĐỔI bản ⇒ đo lại ngay");
  // Hạ version cũng phải bắt, không chỉ nâng — đây đúng là chiều đã xảy ra.
  assert.equal(cacheDue({ ...fresh, have: "3.4.5" }, now, undefined, undefined, "3.6.0"), true);

  // CA ÂM: đệm đời cũ chưa có `have` ⇒ KHÔNG được coi là hết hạn, nếu không mỗi nhịp lại đẻ một
  // tiến trình con đo git cho tới khi có lượt ghi mới.
  assert.equal(cacheDue({ ...fresh, have: undefined }, now, undefined, undefined, "3.4.5"), false);
  // CA ÂM: không truyền bản đang chạy ⇒ giữ nguyên hành vi cũ (nơi gọi cũ không bị đổi nghĩa).
  assert.equal(cacheDue(fresh, now), false);
  // Hết hạn theo thời gian vẫn phải chạy như trước.
  assert.equal(cacheDue(fresh, now + 7 * 60 * 60_000, undefined, undefined, "3.6.0"), true);
});

test("bản trên máy ĐI TRƯỚC repo phải nói ra, không được khoe 'đã mới nhất'", () => {
  // `pickUpdate` chỉ mời cập nhật khi remote MỚI hơn, nên ở ca ngược lại nó trả rỗng và bề mặt in
  // "Zemory đang là bản mới nhất" — SAI: máy đang chạy một bản không còn tồn tại trên repo.
  const git = { ok: true, latest: "3.4.5", commit: "992f3ec", at: "" };

  const ahead = aheadOfRepo("3.6.0", git);
  assert.ok(ahead, "cao hơn git ⇒ phải báo đi trước");
  assert.equal(ahead.have, "3.6.0");
  assert.equal(ahead.latest, "3.4.5");
  assert.equal(ahead.from, "992f3ec");
  // Và `pickUpdate` vẫn KHÔNG được mời cập nhật xuống — hai hàm nói hai chuyện khác nhau.
  assert.equal(pickUpdate("3.6.0", git, null), undefined, "không bao giờ mời 'cập nhật' xuống bản cũ hơn");

  // CA ÂM: bằng nhau hoặc thấp hơn ⇒ không phải đi trước.
  assert.equal(aheadOfRepo("3.4.5", git), undefined);
  assert.equal(aheadOfRepo("3.4.4", git), undefined);
  // CA ÂM: chỉ xét nguồn GIT. Tem kênh chung cũ là chuyện bình thường (máy lâu không sync), lấy nó
  // làm căn cứ "đi trước" là báo động giả.
  assert.equal(aheadOfRepo("3.6.0", null), undefined);
  assert.equal(aheadOfRepo("3.6.0", { ok: false, latest: "3.4.5" }), undefined);
  assert.equal(aheadOfRepo("", git), undefined);
});
