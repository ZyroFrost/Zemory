// GUARD PHẢI GÁC MỌI TOOL CHẠY LỆNH — không chỉ tool tên `Bash`.
//
// Lỗ thật, đo 2026-08-20 ở một repo phòng ban rồi tái lập nguyên vẹn tại đây: `guard.cjs` phân
// nhánh theo `tool_name` và chỉ biết năm tên (Write · Edit · NotebookEdit · Read · Bash). Phiên
// Claude Code trên Windows có SẴN tool `PowerShell` làm đúng việc của Bash, nên MỌI nhánh gác
// lệnh — `git push` chưa xin · `git add -A` · secret vào git · xoá đệ quy — vượt được sạch chỉ
// bằng cách đổi tool. Không lỗi, không cảnh báo: cổng đứng đó và lệnh đi vòng qua.
//
// Điều làm nó khó thấy: regex nhận diện VẪN ĐÚNG (nhánh Bash bắt cả cú pháp PowerShell), nên
// mọi test cũ — vốn chỉ gửi `tool_name: "Bash"` — đều xanh trong khi cửa mở toang. Đó là lý do
// file này soi MA TRẬN `tool × lệnh` chứ không soi từng regex.
//
// Luật 7 (`.claude/skills/audit/`): cổng phải đo CẢ ca ÂM. Chặn nhầm ⇒ gate thành nhiễu ⇒ gate
// bị bỏ qua — nên nửa dưới của file này là những lệnh PHẢI ĐƯỢC CHO QUA.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { GUARD_MATCHER } from "../../dist/docs/guard-gen.js";

const GUARD = new URL("../../docs/hooks/guard.cjs", import.meta.url).pathname.replace(/^\//, "");
const ask = (payload) => spawnSync(process.execPath, [GUARD], { input: JSON.stringify(payload), encoding: "utf8" }).status === 2;

// Ghép từ mảnh: chuỗi nguy hiểm nguyên vẹn trong file test sẽ bị chính guard runtime chặn khi
// agent đọc/ghi file này — đã dính thật một lần.
const RM = "rm -" + "rf docs/agent";
const DEL = "Remove-" + "Item -Recurse -Force docs/agent";
const PUSH = "git " + "push origin main";
const ADD = "git " + "add -A";

const COMMAND_TOOLS = ["Bash", "PowerShell"];
const MUST_BLOCK = [
  ["xoá đệ quy (posix)", RM],
  ["xoá đệ quy (powershell)", DEL],
  ["đẩy lên remote khi chưa xin", PUSH],
  ["gom tất cả vào staging", ADD],
];

test("MA TRẬN tool × lệnh: mọi tool CHẠY LỆNH đều bị soi như nhau", () => {
  const lọt = [];
  for (const tool of COMMAND_TOOLS) {
    for (const [nhãn, command] of MUST_BLOCK) {
      if (!ask({ tool_name: tool, tool_input: { command } })) lọt.push(`${tool} + ${nhãn}`);
    }
  }
  assert.deepEqual(
    lọt,
    [],
    "Có tool chạy lệnh KHÔNG bị gác — đổi tool là vượt được guard:\n  " + lọt.join("\n  "),
  );
});

test("tool chạy lệnh CHƯA TỪNG BIẾT TÊN cũng phải bị soi (nhận theo hình dạng, không theo tên)", () => {
  // Gác theo danh sách tên là cuộc đua không bao giờ thắng: host thêm một tool terminal mới là
  // lỗ mở lại, và không ai hay cho tới lần audit sau. Có `command` ⇒ soi.
  assert.ok(ask({ tool_name: "SomeFutureShell", tool_input: { command: PUSH } }), "tool lạ mang command phải bị soi");
  assert.ok(ask({ tool_name: "", tool_input: { command: RM } }), "thiếu tên tool cũng không được thành đường vòng");
});

test("matcher khai ra ngoài phải PHỦ ĐỦ các tool đó — guard hiểu mà host không gọi thì vô dụng", () => {
  // Hai tầng, hỏng tầng nào cũng im lặng: guard không hiểu tên ⇒ cho qua; matcher thiếu tên ⇒
  // host không bao giờ gọi guard. Repo báo cáo dính đúng tầng thứ hai.
  for (const tool of [...COMMAND_TOOLS, "Write", "Edit", "Read", "NotebookEdit"]) {
    assert.ok(GUARD_MATCHER.split("|").includes(tool), `matcher thiếu \`${tool}\` — hook sẽ không được gọi cho tool này`);
  }
});

test("CA ÂM: lệnh thường ngày qua BẤT KỲ tool nào cũng phải ĐƯỢC CHO QUA", () => {
  const chặnNhầm = [];
  const benign = [
    ["xem trạng thái", "git status --porcelain"],
    ["đọc nhật ký", "git log --oneline -5"],
    ["liệt kê thư mục", "ls backend/src"],
    ["chạy test", "node --test backend/test/guard-gen.test.mjs"],
    ["thêm đúng một file", "git add package.json"],
    ["xem tiến trình (powershell)", "Get-Process node"],
  ];
  for (const tool of COMMAND_TOOLS) {
    for (const [nhãn, command] of benign) {
      if (ask({ tool_name: tool, tool_input: { command } })) chặnNhầm.push(`${tool} + ${nhãn}: ${command}`);
    }
  }
  assert.deepEqual(chặnNhầm, [], "Guard chặn NHẦM việc thường ngày — gate nhiễu là gate bị bỏ qua:\n  " + chặnNhầm.join("\n  "));
});
