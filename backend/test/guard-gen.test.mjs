// Thang cưỡng chế (ADAPT v2 · §4b) — ma trận CHẶN/CHO-QUA chạy guard như TIẾN TRÌNH THẬT.
//
// Vì sao phải spawn chứ không import: guard chạy đời thật là một process nhận JSON qua
// stdin và nói chuyện bằng exit code — test import hàm sẽ xanh cả khi file sinh ra có
// lỗi cú pháp hay đường policy sai. Điều kiện nghiệm thu §5.6 của spec: Write vào đường
// cấm ⇒ exit 2 và file KHÔNG được tạo; `git push` không flag ⇒ chặn; secret trong
// `git add` ⇒ chặn KHÔNG đường vượt; flag một-lần đúng chu trình tạo→qua→tự xoá→chặn lại.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

/** Repo giả kiểu adapt: harness ở harness/, docs/ là của team (protected). */
function repo(t) {
  const root = tempDir(t, "zemory-guard-");
  mkdirSync(join(root, "harness", "agent"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "harness", ".harness.json"),
    JSON.stringify({ layout: "adapt", docs: "harness/agent", slots: { backend: "src" }, extra: ["docs"], protected: ["docs/"] }),
  );
  return root;
}

/** Bơm một tool-call vào guard.cjs y như Claude Code làm. */
function fire(hooksDir, toolName, toolInput) {
  return spawnSync(process.execPath, [join(hooksDir, "guard.cjs")], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    encoding: "utf8",
  });
}

test("sinh đủ bộ 4 file, policy mang dấu zemory + đường cấm từ marker", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  for (const f of ["policy.json", "guard.cjs", "precommit-guard.cjs", ".gitignore"]) {
    assert.ok(existsSync(join(r.hooksDir, f)), `thiếu ${f}`);
  }
  const policy = JSON.parse(readFileSync(join(r.hooksDir, "policy.json"), "utf8"));
  assert.equal(policy.generator, "zemory");
  assert.deepEqual(policy.protected_write, ["docs/"], "đường cấm phải lấy từ khoá `protected` của marker");
  assert.ok(policy.secret_names.includes(".env"), "bộ mẫu secret mặc định phải có mặt");
});

test("Write vào đường cấm ⇒ exit 2; flag một-lần: tạo→qua→TỰ XOÁ→chặn lại (§5.6)", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  const target = join(root, "docs", "report.md");

  // ① chặn khi không flag — và câu chặn phải CHỈ ĐƯỜNG (nêu tên flag).
  let out = fire(r.hooksDir, "Write", { file_path: target });
  assert.equal(out.status, 2, "ghi vào docs/ (protected) phải bị chặn");
  assert.match(out.stderr, /\.allow-docs-write/, "câu chặn phải nói cách vượt hợp lệ");

  // ② user duyệt → tạo flag → qua cho ĐÚNG VIỆC ĐÓ.
  //
  // Neo cũ ở đây là "flag phải TỰ XOÁ ngay sau một lần dùng" — đã đổi có chủ đích 2026-08-20:
  // hook PreToolUse không biết lệnh có THỰC SỰ chạy hay không, nên xoá ngay nghĩa là một lần bị
  // tầng khác của host chặn là user phải duyệt lại cùng một việc. Nay flag đóng dấu vân tay VIỆC
  // và sống một cửa sổ ngắn: cùng việc ⇒ thử lại được · việc khác ⇒ thu hồi ngay (kiểm ở ③).
  const flag = join(r.hooksDir, ".allow-docs-write");
  writeFileSync(flag, "");
  out = fire(r.hooksDir, "Write", { file_path: target });
  assert.equal(out.status, 0, "có flag phải cho qua");

  // ③ flag KHÔNG được thành cửa mở cho việc khác: ghi sang file khác trong đường cấm ⇒ chặn,
  //    và flag bị thu hồi khỏi đĩa.
  out = fire(r.hooksDir, "Write", { file_path: join(root, "docs", "other.md") });
  assert.equal(out.status, 2, "việc KHÁC mượn flag ⇒ phải chặn");
  assert.ok(!existsSync(flag), "và flag bị thu hồi, không để lại cửa hé");

  // ④ sau khi thu hồi, chính việc cũ cũng phải xin lại.
  out = fire(r.hooksDir, "Write", { file_path: target });
  assert.equal(out.status, 2, "flag đã thu hồi thì lần sau phải chặn lại");

  // Ghi NGOÀI đường cấm thì không ai đụng tới.
  out = fire(r.hooksDir, "Write", { file_path: join(root, "src", "main.py") });
  assert.equal(out.status, 0, "đường không cấm phải đi qua êm");
});

test("git push: chặn không flag · qua với flag · flag chỉ mở cho ĐÚNG lệnh đã xin", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  assert.equal(fire(r.hooksDir, "Bash", { command: "git push origin main" }).status, 2);
  writeFileSync(join(r.hooksDir, ".allow-push"), "");
  assert.equal(fire(r.hooksDir, "Bash", { command: "git push origin main" }).status, 0);
  // Thử lại ĐÚNG lệnh đó vẫn qua — hook không biết lượt trước có chạy thật hay bị chặn ở tầng khác.
  assert.equal(fire(r.hooksDir, "Bash", { command: "git push origin main" }).status, 0, "thử lại cùng lệnh");
  // Nhưng đẩy nhánh KHÁC thì không được mượn: đó là một quyết định khác, phải xin riêng.
  assert.equal(fire(r.hooksDir, "Bash", { command: "git push origin release" }).status, 2, "lệnh khác ⇒ chặn");
  assert.equal(fire(r.hooksDir, "Bash", { command: "git push origin main" }).status, 2, "flag đã thu hồi");
});

test("secret vào git add ⇒ chặn KHÔNG đường vượt; .env.example được tha; tên secret trong -m KHÔNG chặn oan", (t) => {
  const root = repo(t);
  const r = generateGuards(root);

  assert.equal(fire(r.hooksDir, "Bash", { command: "git add .env" }).status, 2, ".env phải bị chặn");
  assert.equal(fire(r.hooksDir, "Bash", { command: 'git add "config/server.key"' }).status, 2, "*.key trong nháy vẫn phải bắt");
  assert.equal(fire(r.hooksDir, "Bash", { command: "git add .env.example" }).status, 0, "allowlist phải được tha");
  // Báo oan giết lòng tin vào cổng: commit NHẮC TÊN file secret trong message thì không sao.
  assert.equal(
    fire(r.hooksDir, "Bash", { command: 'git commit -m "docs: giai thich vi sao .env khong duoc commit"' }).status,
    0,
    "tên secret nằm trong message -m không phải là secret trong staging",
  );

  assert.equal(fire(r.hooksDir, "Bash", { command: "git commit --no-verify -m x" }).status, 2, "--no-verify không có đường vượt");
  assert.equal(fire(r.hooksDir, "Bash", { command: "git add -A" }).status, 2, "git add -A bị chặn (lệnh đã gây sự cố 04/08)");
});

test("đọc file key: chặn qua Read lẫn qua shell; guard hỏng input thì KHÔNG chặn bừa", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  assert.equal(fire(r.hooksDir, "Read", { file_path: join(root, "id_rsa") }).status, 2);
  assert.equal(fire(r.hooksDir, "Bash", { command: "cat secrets/deploy.pem" }).status, 2);
  assert.equal(fire(r.hooksDir, "Read", { file_path: join(root, "notes.md") }).status, 0);
  // stdin rác ⇒ exit 0 — guard hỏng không được phép khoá cả phiên làm việc.
  const junk = spawnSync(process.execPath, [join(r.hooksDir, "guard.cjs")], { input: "not-json", encoding: "utf8" });
  assert.equal(junk.status, 0, "guard không parse được input thì phải đứng sang một bên");
});

test("precommit-guard: secret trong staging ⇒ exit 1 nêu tên; staging sạch ⇒ exit 0", (t) => {
  const root = repo(t);
  const r = generateGuards(root);
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(root, "app.py"), "x = 1\n");
  writeFileSync(join(root, ".env"), "TOKEN=abc\n");
  git("add", "app.py");
  let out = spawnSync(process.execPath, [join(r.hooksDir, "precommit-guard.cjs")], { cwd: root, encoding: "utf8" });
  assert.equal(out.status, 0, "staging sạch phải qua");
  git("add", "-f", ".env");
  out = spawnSync(process.execPath, [join(r.hooksDir, "precommit-guard.cjs")], { cwd: root, encoding: "utf8" });
  assert.equal(out.status, 1, "secret trong staging phải chặn");
  assert.match(out.stderr, /\.env/, "phải nêu tên file phạm luật");
});

test("sinh lại: file của mình làm tươi khi lệch, file KHÔNG mang dấu thì giữ nguyên (N1)", (t) => {
  const root = repo(t);
  const r1 = generateGuards(root);
  assert.equal(r1.added.length, 4);
  // Chạy lại y nguyên ⇒ không có gì mới.
  const r2 = generateGuards(root);
  assert.equal(r2.added.length, 0, `chạy lại phải im: ${r2.added.join(", ")}`);
  // User thay guard bằng bản RIÊNG (không mang dấu) ⇒ không được ghi đè.
  writeFileSync(join(r1.hooksDir, "guard.cjs"), "// ban rieng cua repo\n");
  const r3 = generateGuards(root);
  assert.ok(r3.kept.includes("guard.cjs"), "bản riêng của repo phải được giữ nguyên");
  assert.equal(readFileSync(join(r1.hooksDir, "guard.cjs"), "utf8"), "// ban rieng cua repo\n");
});
