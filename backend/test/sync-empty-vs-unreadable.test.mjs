// "KÊNH TRỐNG" ≠ "KHÔNG ĐỌC ĐƯỢC KÊNH" — và nhầm hai thứ đó thì đẩy TRỌN kho.
//
// Sự cố thật (đo 2026-09-17, ba lượt auto-sync liên tiếp):
//   🔴 auto-sync THẤT BẠI: ... File size (2.487.460.255) is greater than 2 GiB
// Chuỗi nhân quả: `readdirSync` trên thư mục Drive trượt (nhóm mã CHẬP của `plan/08 §8d`)
//   → `listSegments` nuốt lỗi, trả RỖNG
//   → `since = segs.length === 0 ? 0 : watermark` chọn **0**
//   → xuất BASELINE cả kho (~2,4 GB) thay vì delta 309 tin / 0,3 MB
//   → `appendChunk` gọi `readFileSync` ⇒ chạm TRẦN CỨNG 2 GiB của Node.
//
// 🔴 Điều đáng sợ không phải lượt HỎNG mà là lượt SUÝT THÀNH: nếu không chạm trần, nó đã nối một
// khối 2,4 GB nhân bản cả kho lên kênh chung — đúng thứ chia khúc 256 MB (`§8e`) sinh ra để giết.
//
// Hai lớp được khoá ở đây, mỗi lớp một lỗ:
//   ① phép PHÂN ĐỊNH trống-vs-không-đọc-được;
//   ② bước NỐI không được có trần dung lượng.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { segmentsReadVerdict } from "../../dist/memory/share.js";

test("ENOENT là trống THẬT; mọi mã lỗi khác là KHÔNG ĐỌC ĐƯỢC", () => {
  // Lần đầu dùng: thư mục kênh chưa tồn tại ⇒ đúng là trống, baseline là hành vi ĐÚNG.
  assert.equal(segmentsReadVerdict("ENOENT"), "empty");
  assert.equal(segmentsReadVerdict(undefined), "empty");
  // CA ÂM — đây là nhóm mã mà ổ đám mây ném ra khi chập (`§8d` đã liệt kê chính nhóm này).
  // Coi bất kỳ mã nào trong đây là "trống" là tự cho phép mình đẩy lại cả kho.
  for (const code of ["UNKNOWN", "EBUSY", "EIO", "EPERM", "EAGAIN", "ETIMEDOUT", "EACCES", "EMFILE"]) {
    assert.equal(segmentsReadVerdict(code), "unreadable", `${code} KHÔNG được đọc là kênh trống`);
  }
});

test("đường GHI phải dùng thước NGHIÊM — không chỗ nào được đoán 'trống'", () => {
  const src = readFileSync(new URL("../src/memory/share.ts", import.meta.url), "utf8");
  // `activeSegment` quyết định GHI VÀO ĐÂU; `pushAppend` quyết định XUẤT BAO NHIÊU. Cả hai đoán
  // nhầm "trống" là một quyết định bất khả đảo trên kênh chung ⇒ cả hai phải nghiêm.
  // Đếm CHỖ DÙNG và cắt theo HÀM, đừng khớp dòng-kế-tiếp: neo theo dòng kế vỡ ngay khi ai đó
  // chèn một câu chú thích — bản đầu của chính cổng này đã vỡ đúng vậy.
  assert.equal((src.match(/listSegments\(dir, true\)/g) || []).length, 2, "đúng HAI đường ghi phải nghiêm");
  const at = src.indexOf("function activeSegment(");
  assert.match(src.slice(at, at + 400), /listSegments\(dir, true\)/, "activeSegment (GHI VÀO ĐÂU) phải nghiêm");
  // Cửa sổ HAI CHIỀU quanh chỗ quyết định `since`: lượt liệt kê nghiêm nằm TRƯỚC nó trong hàm,
  // nên tìm xuôi là trượt (đã dính). Thứ cần canh là "trong cùng một hàm", không phải thứ tự dòng.
  const ps = src.indexOf("const since = compacting");
  assert.match(src.slice(Math.max(0, ps - 2500), ps + 1500), /listSegments\(dir, true\)/,
    "đường đẩy (XUẤT BAO NHIÊU) phải nghiêm");
  // …và phép nghiêm phải THẬT SỰ ném, không chỉ nhận thêm một tham số rồi bỏ qua.
  assert.match(src, /if \(strict && segmentsReadVerdict\(code\) === "unreadable"\)/, "strict phải nổ khi không đọc được");
  assert.match(src, /KHÔNG coi là kênh trống/, "câu lỗi phải nói rõ vì sao dừng");
});

test("bước NỐI không được slurp cả gói — trần 2 GiB của Node là trần THẬT", () => {
  const src = readFileSync(new URL("../src/memory/share.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("function appendChunk("), src.indexOf("const APPEND_ATTEMPTS"));
  assert.doesNotMatch(fn, /readFileSync\(bundlePath\)/, "slurp cả gói ⇒ gói >2 GiB là không đẩy được");
  assert.match(fn, /readSync\(rfd/, "phải chép theo khối");
  assert.match(fn, /writeSync\(wfd/, "…và ghi theo khối");
  // Chép thiếu mà im lặng để lại ĐUÔI RÁC: `listChunks` gặp đuôi rác thì dừng, mọi khối nối sau
  // nó thành vô hình với MỌI máy (`§8d` luật ②). Phải ném để lớp trên cắt lại.
  assert.match(fn, /chép thiếu/, "chép thiếu phải NÉM, không được im lặng");
  assert.match(fn, /closeSync\(rfd\)[\s\S]{0,80}closeSync\(wfd\)/, "phải đóng cả hai fd trong finally");
});
