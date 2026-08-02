// Giá trị của một cờ KHÔNG được rơi vào truy vấn.
//
// Lỗi thật, hai lần, hai bề mặt khác nhau: `memory search "x" --limit 3` đi tìm `"x 3"`
// (vá 2026-08-02 sáng), rồi `changelog search "x" --limit 3` **vẫn** đi tìm `"x 3"` (bắt
// chiều cùng ngày, lúc đang tra chính cuốn sổ vừa ghi). Đây là dạng lỗi nguy nhất trong họ
// "cờ hỏng": nó KHÔNG báo lỗi, chỉ âm thầm đổi thứ hạng, nên kết quả vẫn trông như một câu
// trả lời bình thường. Test này khoá CẢ HAI bề mặt docs để lần thứ ba không xảy ra.

import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const run = (args) =>
  execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd: fileURLToPath(new URL("../..", import.meta.url)) });

for (const surface of ["changelog", "plan"]) {
  test(`${surface} search: --limit KHÔNG lọt vào truy vấn`, () => {
    const out = run([surface, "search", "harness", "--limit", "3"]);
    const echoed = /—\s+"([^"]*)"/.exec(out)?.[1];
    assert.equal(echoed, "harness", `truy vấn phải là đúng chữ user gõ, nhận được: "${echoed}"`);
  });

  test(`${surface} search: --limit thật sự CẮT số kết quả`, () => {
    // Cờ không lọt vào truy vấn nhưng cũng không có tác dụng thì vẫn là nói dối người dùng.
    const count = (n) => (run([surface, "search", "zemory", "--limit", String(n)]).match(/^ {2}#\d+/gm) ?? []).length;
    const few = count(2);
    assert.ok(few <= 2, `--limit 2 phải trả tối đa 2 dòng, nhận ${few}`);
  });
}
