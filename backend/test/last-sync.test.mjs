// Ô "Last Sync" NÓI DỐI: báo "chưa sync" ngay sau một lượt sync thành công.
//
// Báo bởi người dùng 2026-08-13, đo lại thấy mâu thuẫn NGAY TRONG CÙNG một payload:
//   lastSync         : null                      ← UI đọc cái này ⇒ "never synced"
//   drive.lastPushAt : 2026-08-13T06:59:26.646Z  ← vừa đẩy một phút trước
//   drive.syncPercent: 100 · 241.011/241.011 · pending 0
//
// Nguyên nhân: `sync_state.updated_at` là **TEXT chứa chuỗi ISO**, còn code đọc nó như **số
// epoch**: `new Date(Number("2026-08-13T06:59:26.646Z"))` ⇒ `Number(...)` = NaN ⇒
// `.toISOString()` NÉM RangeError ⇒ `catch` nuốt ⇒ `null`.
//
// Hai thứ khiến nó sống lâu, và cả hai đáng nhớ hơn bản thân lỗi:
//  · lệch kiểu chỉ lộ ra khi mở schema ra xem — đọc code không thấy gì sai;
//  · `catch` vốn dựng cho ca "bảng chưa tồn tại" đã **âm thầm nuốt luôn một lỗi kiểu**. Một
//    catch không phân biệt được "không có gì để báo" với "tôi vừa vỡ" thì biến bug thành LỜI NÓI
//    DỐI — người dùng thấy một con số sai chứ không thấy lỗi.
//
// Cổng soi HÀNH VI của hàm phân giải, không soi chữ trong mã.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { parseSyncTimestamp, syncHealthOf, syncPercentOf } from "../../dist/ui.js";

test("Last Sync phải lấy từ lượt ĐỒNG BỘ THẬT, không phải hàng bất kỳ trong sync_state", () => {
  // User chốt 2026-08-13: *"sync phải luôn lấy từ thời gian tự động sync thực tế"*.
  //
  // `sync_state` chứa MỌI thứ từng ghi watermark, không riêng đồng bộ Drive. Đo cùng ngày: 11
  // hàng thì 6 hàng là `.tmp` do phép thử để lại (`timed.tmp` · `probe5.tmp` · `probe4.tmp` …)
  // cộng `keytest.enc` · `test.zemory.enc` · `cli-lean.enc`. Bản cũ lấy `MAX(updated_at)` trên
  // TOÀN bảng ⇒ chỉ cần một phép thử chạy sau lượt sync là ô này hiện giờ của MỘT LƯỢT TEST.
  // Hôm phát hiện, hàng `drive:` tình cờ mới nhất nên con số nhìn vẫn "đúng" — đúng kiểu bug
  // ngồi im chờ ngày thứ tự đảo lại.
  //
  // Bất biến: `lastSync` dùng CHUNG nguồn với panel Drive (`drive:<host>`), không đẻ truy vấn
  // thứ hai. Hai truy vấn trả lời hai câu khác nhau rồi cùng đổ vào một ô — đó là cách ô "đã
  // đủ" từng nói dối trước đây.
  // Bỏ chú thích TRƯỚC khi soi: chính chú thích giải thích bug lại chứa `MAX(updated_at)`, nên
  // soi thẳng cả file thì cổng đỏ vì đọc được lời kể về bug chứ không phải bản thân bug.
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.match(
    src,
    /lastSync: parseSyncTimestamp\(drive\.lastPushAt\)/u,
    "lastSync phải lấy từ drive.lastPushAt (lượt sync thật của máy này)",
  );
  assert.ok(
    !/MAX\(updated_at\)/u.test(src),
    "không được quay lại MAX(updated_at) trên toàn bảng sync_state — nó nhặt cả hàng .tmp của phép thử",
  );
});

test("chuỗi ISO trong cột TEXT phải đọc được — đây là dạng schema THẬT đang dùng", () => {
  assert.equal(parseSyncTimestamp("2026-08-13T06:59:26.646Z"), "2026-08-13T06:59:26.646Z");
  // Chính giá trị này từng làm cả ô hiển thị sập về "chưa sync".
  assert.notEqual(parseSyncTimestamp("2026-08-13T06:59:26.646Z"), null);
});

test("số epoch vẫn đọc được — kho do bản cũ ghi không được vỡ", () => {
  const ms = Date.UTC(2026, 7, 13, 6, 59, 26);
  assert.equal(parseSyncTimestamp(ms), new Date(ms).toISOString());
  assert.equal(parseSyncTimestamp(String(ms)), new Date(ms).toISOString());
});

test('"chưa có gì" thì trả null — và KHÔNG được ném', () => {
  for (const empty of [null, undefined, ""]) {
    assert.equal(parseSyncTimestamp(empty), null, `phải là null: ${JSON.stringify(empty)}`);
  }
});

test("giá trị RÁC trả null chứ không ném — fail-open, không kéo sập cả dashboard", () => {
  // `/memory-status` gói chung mọi số của trang chủ: một ô hỏng mà ném thì mất TOÀN BỘ payload.
  for (const junk of ["khong-phai-ngay", "----", "2026-13-45T99:99:99Z"]) {
    assert.equal(parseSyncTimestamp(junk), null, `phải là null: ${junk}`);
  }
});

// ── DONUT 100% NÓI DỐI (user bắt 2026-08-30) ────────────────────────────────────────────────
// "498 new messages not pushed" mà donut vẫn "100%" xanh đặc — vì `Math.round(321320/321818×100)`
// = 100. Trăm phần trăm là lời KHẲNG ĐỊNH ĐÃ ĐỦ, không phải phép làm tròn: hụt một tin cũng
// không được nói 100 (nguyên văn user: "hụt mấy trăm mess thì không bao giờ được tính là %").
test("syncPercentOf: hụt tin thì KHÔNG BAO GIỜ là 100 — kể cả hụt dưới nửa phần trăm", () => {
  // Chính bộ số của ca thật 30/08: thiếu 498/321.818 tin (99,845%) — bản cũ tròn thành 100.
  const p = syncPercentOf(321320, 321818);
  assert.ok(p < 100, `thiếu 498 tin mà báo ${p}% — donut xanh đặc là nói dối`);
  assert.equal(p, 99, "floor + trần 99: hụt ít vẫn phải thấy là CHƯA đủ");
  // Hụt đúng MỘT tin — ca sát mép nhất.
  assert.ok(syncPercentOf(999_999, 1_000_000) < 100, "hụt 1 tin cũng chưa phải 100");
});

test("syncPercentOf: đủ từng tin mới là 100; kho rỗng coi như đủ; số âm không phá", () => {
  assert.equal(syncPercentOf(321818, 321818), 100, "đủ thật ⇒ 100, donut được phép xanh đặc");
  assert.equal(syncPercentOf(0, 0), 100, "kho rỗng — không có gì để đẩy = đã đủ");
  assert.equal(syncPercentOf(-5, 100), 0, "watermark rác (âm) kẹp về 0, không ra số âm");
  assert.equal(syncPercentOf(0, 200), 0);
  assert.equal(syncPercentOf(100, 200), 50);
});

// ── ĐÈN SỨC KHOẺ SYNC (user chốt 2026-08-30: "nó gãy ở drive thì cũng phải báo sync vấn đề…
// user chỉ nhìn thông số và dashboard, chứ ai cần biết vấn đề nằm ở đâu") ────────────────────
// Ca thật cùng ngày: ổ G: đơ ⇒ con sync kẹt 70′ + daemon đông cứng, dashboard hiện số cũ và
// KHÔNG một dòng đỏ nào. `syncHealthOf` gộp mọi tầng thành một đèn; các ca dưới dựng lại đúng
// những kịch bản đã xảy ra.
const NOW = Date.parse("2026-08-30T11:00:00Z");
const iso = (minAgo) => new Date(NOW - minAgo * 60_000).toISOString();
const base = { pending: 0, lastPushAt: iso(10), now: NOW, autosyncOn: true, intervalMin: 30, lastResult: null, runningForMs: null };

test("syncHealth: lành thì im — mọi thứ tươi ⇒ ok, không chiếm chỗ trên card", () => {
  assert.deepEqual(syncHealthOf({ ...base }), { level: "ok", code: "ok" });
  // Tự sync TẮT = user chủ động sync tay; pending hiện sẵn ở dòng đếm, không báo động oan.
  assert.equal(syncHealthOf({ ...base, autosyncOn: false, pending: 500, lastPushAt: iso(600) }).code, "ok");
});

test("syncHealth: đang chạy phải NÓI đang chạy — chưa xong không được im như đã xong", () => {
  const h = syncHealthOf({ ...base, pending: 498, runningForMs: 26 * 60_000, phase: "embed" });
  assert.equal(h.code, "running");
  assert.equal(h.mins, 26, "phải nêu chạy được bao nhiêu phút");
  assert.equal(h.detail, "embed", "phải nêu đang ở bước nào");
});

test("syncHealth: chạy quá 45′ = nghi KẸT ⇒ đỏ (ca ổ G: đơ 30/08 — con sync 'chạy' mãi mãi)", () => {
  const h = syncHealthOf({ ...base, runningForMs: 70 * 60_000, phase: "write" });
  assert.equal(h.level, "error");
  assert.equal(h.code, "runStuck");
  assert.equal(h.mins, 70);
  // Ca ÂM sát ngưỡng: 44′ vẫn là đang-chạy bình thường — lượt đẩy bù nặng đo được ~40′.
  assert.equal(syncHealthOf({ ...base, runningForMs: 44 * 60_000, phase: "write" }).code, "running");
});

test("syncHealth: trần THEO BƯỚC — embed lâu là VÀNG 'lô lớn', không phải đỏ 'Drive hang' (báo oan 14:27 30/08)", () => {
  // Ca báo oan thật: embed phút 56, CPU đang cày 3.552 s — đèn cũ hô "likely stuck (Drive hang?)".
  const h = syncHealthOf({ ...base, runningForMs: 56 * 60_000, phase: "embed" });
  assert.equal(h.level, "warn", "embed là việc LOCAL — Drive không treo được nó, không được đỏ oan");
  assert.equal(h.code, "embedLong");
  assert.equal(h.mins, 56);
  // Nhưng embed cũng không được chạy VÔ HẠN — quá 180′ (model deadlock?) thì đỏ thật.
  assert.equal(syncHealthOf({ ...base, runningForMs: 181 * 60_000, phase: "embed" }).code, "runStuck");
  // Còn bước ĐỤNG DRIVE thì 46′ đã là đỏ — 45′ nghĩa là 45′, không nhân nhượng theo bước.
  assert.equal(syncHealthOf({ ...base, runningForMs: 46 * 60_000, phase: "verify" }).code, "runStuck");
});

test("syncHealth: lượt gần nhất HỎNG mà tin còn ứ ⇒ đỏ; đã có lượt đẩy MỚI HƠN chuộc lại ⇒ thôi", () => {
  const fail = { at: iso(30), ok: false, kind: "fail", detail: "sync exited 4294967295" };
  const h = syncHealthOf({ ...base, pending: 498, lastPushAt: iso(120), lastResult: fail });
  assert.equal(h.level, "error");
  assert.equal(h.code, "lastFail");
  assert.equal(h.detail, "sync exited 4294967295", "phải chở câu lỗi thật cho user thấy");
  // Chuộc lại: push thành công SAU lượt hỏng ⇒ không còn gì để báo đỏ.
  assert.equal(syncHealthOf({ ...base, pending: 3, lastPushAt: iso(5), lastResult: fail }).code, "ok");
  // pending=0 ⇒ hỏng cũ vô hại (đã không còn gì để đẩy).
  assert.equal(syncHealthOf({ ...base, pending: 0, lastPushAt: iso(120), lastResult: fail }).code, "ok");
});

test("syncHealth: lượt bị CẮT (daemon restart) mang mã riêng — nó khác 'chạy xong và hỏng'", () => {
  const cut = { at: iso(117), ok: false, kind: "interrupted" };
  const h = syncHealthOf({ ...base, pending: 498, lastPushAt: iso(240), lastResult: cut });
  assert.equal(h.level, "error");
  assert.equal(h.code, "interrupted");
});

test("syncHealth: tin ứ + lịch bật + lần đẩy cuối quá 3 chu kỳ ⇒ vàng 'tự sync không tới lượt'", () => {
  // interval 30′ ⇒ ngưỡng = max(90′, 90′); đẩy cuối 4 giờ trước — đúng ảnh chụp của user 30/08.
  const h = syncHealthOf({ ...base, pending: 498, lastPushAt: iso(240) });
  assert.equal(h.level, "warn");
  assert.equal(h.code, "pushStale");
  assert.equal(h.mins, 240);
  // Ca ÂM: đẩy cuối 60′ trước — trong ngưỡng, dù có tin ứ vẫn là nhịp bình thường.
  assert.equal(syncHealthOf({ ...base, pending: 50, lastPushAt: iso(60) }).code, "ok");
  // Chưa từng đẩy được lượt nào mà có tin ứ ⇒ vàng riêng.
  assert.equal(syncHealthOf({ ...base, pending: 50, lastPushAt: null }).code, "neverPushed");
});
