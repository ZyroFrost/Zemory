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

test("ĐƯỜNG DẪN chứa `.git/` KHÔNG phải lệnh git — phải được cho qua (vá 2026-08-20)", () => {
  // Báo oan thật, từ repo PBI + tái lập tại đây: `cat .git/hooks/pre-push` bị đọc thành
  // "git … push" ⇒ CHẶN — đúng lúc người ta cắm pre-commit THEO hướng dẫn của `hook guard`,
  // tức ai làm theo tài liệu cũng gặp. `git` đi sau dấu chấm / dính `/` `\` là ĐƯỜNG DẪN.
  const paths = [
    ["đọc hook pre-push", "cat ." + "git/hooks/pre-push"],
    ["đọc hook pre-push (backslash)", "cat ." + "git\\hooks\\pre-push"],
    ["cấp quyền chạy pre-commit", "chmod +x ." + "git/hooks/pre-commit"],
    ["liệt kê hooks", "ls -l ." + "git/hooks/pre-commit"],
    ["clone url .git rồi nhắc push ở câu khác", "git clone https://x/y." + "git; echo push done"],
  ];
  const chặnNhầm = [];
  for (const tool of COMMAND_TOOLS) {
    for (const [nhãn, command] of paths) {
      if (ask({ tool_name: tool, tool_input: { command } })) chặnNhầm.push(`${tool} + ${nhãn}`);
    }
  }
  assert.deepEqual(chặnNhầm, [], "Đường dẫn bị đọc thành lệnh git:\n  " + chặnNhầm.join("\n  "));
  // Vế ngược — lý do KHÔNG vá bằng "token đầu câu": ba đường gọi git thật này sẽ lọt nếu
  // chỉ nhận git ở đầu segment (đo ma trận 8 ca 2026-08-20 trước khi chọn cách vá).
  for (const command of ["sudo " + PUSH, "/usr/bin/" + PUSH, "env A=1 " + PUSH]) {
    assert.ok(ask({ tool_name: "Bash", tool_input: { command } }), `phải chặn: ${command}`);
  }
});

test("TÊN FILE chứa chữ `push` KHÔNG phải lệnh push — phải được cho qua (vá 2026-08-22)", () => {
  // Báo oan tự dính trong phiên 2026-08-22: `\bpush\b` khớp cả token nằm TRONG tên file, vì `-`
  // và `.` là ký tự không-phải-từ. Hậu quả trớ trêu: đúng cái lệnh để SOI CỜ
  // (`docs/hooks/.allow-push`) bị chặn như một lệnh push thật, nên không ai kiểm được cờ nếu
  // trong câu có chữ `git`. Cùng họ báo oan `.git/hooks/pre-push` đã vá 20/08 — chỉ khác vế.
  const tênFile = [
    ["soi cờ push", "git check-ignore -v docs/hooks/.allow-" + "push"],
    ["xoá cờ sau khi dùng", "git status --short docs/hooks/.allow-" + "push"],
    ["liệt kê thư mục hooks", "ls -la docs/hooks/.allow-" + "push"],
    ["nhắc tên cờ trong echo cạnh lệnh git", "git status; echo tao docs/hooks/.allow-" + "push"],
  ];
  const chặnNhầm = [];
  for (const tool of COMMAND_TOOLS) {
    for (const [nhãn, command] of tênFile) {
      if (ask({ tool_name: tool, tool_input: { command } })) chặnNhầm.push(`${tool} + ${nhãn}`);
    }
  }
  assert.deepEqual(chặnNhầm, [], "Tên file bị đọc thành lệnh push:\n  " + chặnNhầm.join("\n  "));
  // VẾ NGƯỢC — bản vá không được làm hở đường push thật, kể cả các dạng dễ lọt.
  for (const command of [PUSH, "cd x && " + PUSH, "sudo " + PUSH, "git push --force origin main", "git push -u origin HEAD"]) {
    assert.ok(ask({ tool_name: "Bash", tool_input: { command } }), `phải chặn: ${command}`);
  }
});

test("SECRET `*.env`: tên <x>.env trong lệnh git phải bị CHẶN; tên mẫu + tên ở segment khác phải QUA", () => {
  // Lỗ đo được 2026-08-20: bộ mẫu cũ chỉ có `.env`/`.env.*` nên `git add ipos_loader.env`
  // LỌT SẠCH — trong khi comment trong guard tự nhận "app/x.env vẫn bị bắt". Đây là đường
  // bất khả đảo (secret lên git) nên khoá bằng gate, không bằng lời.
  const block = [
    ["thêm file .env theo tên", "git " + "add config/ipos_loader" + ".env"],
    ["đổi chỗ file .env", "cd a && git " + "mv prod" + ".env b/"],
    ["app/x.env — đúng ca comment cũ hứa", 'git ' + 'add "app/x' + '.env"'],
  ];
  for (const [nhãn, command] of block) {
    assert.ok(ask({ tool_name: "Bash", tool_input: { command } }), `phải chặn (${nhãn}): ${command}`);
  }
  const pass = [
    ["tên mẫu example.env", "git " + "add example" + ".env"],
    ["tên mẫu .env.example", "git " + "add ." + "env.example"],
    ["tên .env chỉ NHẮC trong echo ở segment khác", "git " + 'add docs && echo "prod' + '.env staged: 3"'],
  ];
  for (const [nhãn, command] of pass) {
    assert.ok(!ask({ tool_name: "Bash", tool_input: { command } }), `chặn nhầm (${nhãn}): ${command}`);
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
