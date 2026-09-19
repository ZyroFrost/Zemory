// BẢNG TRA "số máy → máy đó ở đâu" trên thư mục dùng chung (Drive).
//
// Vì sao có: UltraViewer nối bằng một ID 9 số vì có máy chủ trung gian giữ bảng đó. Zemory không có
// máy chủ nào, nhưng hai máy của cùng một người đã dùng chung một thư mục Drive — nên chỗ đó đóng vai
// bảng tra. Không có nó thì số máy chỉ chạy trong cùng mạng, và người dùng lại phải cầm địa chỉ.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findPresence, listPresence, presenceDir, publishPresence } from "../../dist/memory/channel/index.js";

const ME = { shortId: "916306818", deviceId: "HMVEQRS7-IJADAN5J-JLKQQUD2", addrs: ["10.101.1.2:21038"], name: "MAY-A" };

function drive(t) {
  const d = mkdtempSync(join(tmpdir(), "zem-drive-"));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  return d;
}

test("đăng rồi tra ra đúng máy: số máy → vân tay + địa chỉ", (t) => {
  const d = drive(t);
  const file = publishPresence(d, ME);
  assert.ok(file && existsSync(file), "phải ghi ra một tệp");
  const got = findPresence(d, "916306818");
  assert.equal(got.deviceId, ME.deviceId);
  assert.deepEqual(got.addrs, ME.addrs);
  assert.ok(got.at, "phải có mốc đăng — người đọc cần biết nó cũ hay mới");
  assert.deepEqual(findPresence(d, "916 306 818").deviceId, ME.deviceId, "số có khoảng trắng vẫn tra được");
});

test("đăng lại thì ĐÈ lên chính tệp cũ, không đẻ tệp thứ hai", (t) => {
  const d = drive(t);
  publishPresence(d, ME);
  publishPresence(d, { ...ME, addrs: ["192.168.1.90:21038"] });
  assert.equal(listPresence(d).length, 1);
  assert.deepEqual(findPresence(d, ME.shortId).addrs, ["192.168.1.90:21038"], "địa chỉ mới thắng");
});

test("CA ÂM: không có số đó / thư mục chưa có bảng ⇒ null, KHÔNG đoán bừa một máy", (t) => {
  const d = drive(t);
  assert.equal(findPresence(d, "111222333"), null, "bảng còn rỗng");
  publishPresence(d, ME);
  assert.equal(findPresence(d, "111222333"), null, "số lạ");
  assert.equal(findPresence(d, "abc"), null, "không phải 9 chữ số");
  assert.equal(findPresence("", ME.shortId), null, "chưa link thư mục dùng chung");
});

test("CA ÂM: tệp đặt SAI TÊN so với nội dung ⇒ bỏ qua, vì ghép nhầm máy là thứ số máy sinh ra để tránh", (t) => {
  const d = drive(t);
  mkdirSync(presenceDir(d), { recursive: true });
  // tên tệp nói số này, nội dung lại là máy khác — chép tay hoặc đồng bộ lỗi đều ra ca này
  writeFileSync(join(presenceDir(d), "111222333.json"), JSON.stringify({ ...ME, at: new Date().toISOString() }));
  assert.equal(findPresence(d, "111222333"), null);
});

test("CA ÂM: tệp hỏng / thiếu vân tay ⇒ bỏ qua, không làm chết cả lượt tra (fail-open)", (t) => {
  const d = drive(t);
  mkdirSync(presenceDir(d), { recursive: true });
  writeFileSync(join(presenceDir(d), "222333444.json"), "{ đây không phải json");
  writeFileSync(join(presenceDir(d), "333444555.json"), JSON.stringify({ shortId: "333444555", addrs: [] }));
  publishPresence(d, ME);
  assert.equal(findPresence(d, "222333444"), null);
  assert.equal(findPresence(d, "333444555"), null);
  assert.equal(listPresence(d).length, 1, "tệp hỏng không được làm hỏng phần còn lại");
  assert.equal(findPresence(d, ME.shortId).deviceId, ME.deviceId);
});

test("CA ÂM: thư mục dùng chung không ghi được ⇒ trả null, KHÔNG ném (một bảng tra hỏng không được làm chết lượt ghép)", (t) => {
  assert.equal(publishPresence("", ME), null, "chưa link thì thôi");
  const d = drive(t);
  // đường dẫn có ký tự CẤM (NUL) ⇒ ghi trượt ở tầng hệ điều hành
  assert.equal(publishPresence(join(d, "kh\u0000ong-hop-le"), ME), null);
});

test("nội dung tệp đọc được bằng mắt — người dùng phải soi được chính thứ máy vừa đăng", (t) => {
  const d = drive(t);
  const file = publishPresence(d, ME);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(Object.keys(raw).sort(), ["addrs", "at", "deviceId", "name", "shortId"]);
});

test("CA ÂM: số máy là TÊN TỆP, nên nó không được phép leo ra ngoài thư mục bảng tra", (t) => {
  const d = drive(t);
  publishPresence(d, ME);
  // đặt một tệp NGOÀI thư mục bảng tra, đúng khuôn nội dung hợp lệ
  writeFileSync(join(d, "bimat.json"), JSON.stringify({ shortId: "../bimat", deviceId: "KE-GIA-MAO", addrs: [], name: "x", at: "" }));
  for (const bad of ["../bimat", "..\\bimat", "../../bimat", "peers/../bimat"]) {
    assert.equal(findPresence(d, bad), null, `"${bad}" không được tra ra gì`);
  }
});
