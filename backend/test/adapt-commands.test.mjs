// ADAPT v2 · N2 — NHÓM LỆNH đọc/ghi docs phải đi theo MARKER, không theo hằng `docs/agent`.
//
// Các cổng (doctor · conform · validate) đã theo marker từ đợt trước, nhưng ba lệnh LÀM VIỆC
// với docs thì chưa: `reindex` đi tìm `docs/plan` nên repo đặt harness ở `harness/` nhận một
// chỉ mục RỖNG mà không báo lỗi gì; `todo verify` đi tìm `docs/agent/05_TODO.md` nên báo
// "0 mục" — một cổng KHÔNG BAO GIỜ ĐỎ ĐƯỢC, tệ hơn không có cổng; `archive` thì ghi archive
// vào `docs/agent/archive/` tức ĐẺ THÊM một cây docs thứ hai bên cạnh cây thật.
//
// Kèm ca BOM: file do người dùng Windows tạo (`Set-Content -Encoding utf8`) mang U+FEFF ở đầu.
// Lỗi này đã nổ ba lần trong một ngày và luôn nổ IM LẶNG, nên nó phải có test riêng.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { archiveTodo } from "../../dist/docs/archive.js";
import { loadContext } from "../../dist/core/config.js";
import { verifyTodo } from "../../dist/docs/todo-verify.js";
import { tempDir } from "./helpers.mjs";

/** Repo kiểu ADAPT: harness ở `harness/`, `docs/` là của team (không phải của tool). */
function adaptRepo(t, { bom = false } = {}) {
  const root = tempDir(t, "zemory-adapt-cmd-");
  mkdirSync(join(root, "harness", "agent"), { recursive: true });
  mkdirSync(join(root, "harness", "plan"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true }); // docs/ CỦA TEAM — tool không được đụng
  writeFileSync(join(root, "docs", "team-notes.md"), "# tài liệu của team\n");
  const marker = JSON.stringify({ layout: "adapt", docs: "harness/agent", adapters: {}, thresholds: {} });
  writeFileSync(join(root, "harness", ".harness.json"), (bom ? "﻿" : "") + marker);
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "06_CHANGES"]) {
    writeFileSync(join(root, "harness", "agent", `${f}.md`), `# ${f}\n`);
  }
  writeFileSync(join(root, "harness", "plan", "00_overview.md"), "# overview\n");
  return root;
}

test("archive đưa mục đã xong vào ARCHIVE CỦA HARNESS, không đẻ cây docs/ thứ hai", (t) => {
  const root = adaptRepo(t);
  writeFileSync(
    join(root, "harness", "agent", "05_TODO.md"),
    "# TODO\n\n- [x] việc đã xong, phải bị dời đi\n- [ ] việc còn mở, phải ở lại\n",
  );

  const r = archiveTodo(loadContext(root), ":memory:");

  assert.equal(r.moved, 1, "phải dời đúng mục đã đóng");
  assert.ok(
    r.archivePath.replace(/\\/g, "/").includes("harness/agent/archive"),
    `archive phải nằm trong nhà harness, nhận được: ${r.archivePath}`,
  );
  assert.equal(
    existsSync(join(root, "docs", "agent")),
    false,
    "TUYỆT ĐỐI không được đẻ docs/agent/ — đó là ghi vào thư mục của team",
  );
  // Sổ nguồn giữ lại đúng mục còn mở.
  const kept = readFileSync(join(root, "harness", "agent", "05_TODO.md"), "utf8");
  assert.ok(kept.includes("việc còn mở"));
  assert.ok(!kept.includes("việc đã xong"));
});

test("todo verify ĐỌC ĐƯỢC sổ ở harness/agent — cổng phải nhìn thấy mục, không báo 0", (t) => {
  const root = adaptRepo(t);
  writeFileSync(
    join(root, "harness", "agent", "05_TODO.md"),
    "# TODO\n\n- [ ] mục thứ nhất còn mở\n- [ ] mục thứ hai còn mở\n- [~] mục thứ ba đang làm\n",
  );

  const rep = verifyTodo(root);

  assert.equal(rep.items.length, 3, `gate phải thấy 3 mục trong harness/agent, nhận ${rep.items.length}`);
  assert.ok(
    rep.file.replace(/\\/g, "/").includes("harness/agent/05_TODO.md"),
    `phải đọc đúng sổ của harness, nhận: ${rep.file}`,
  );
});

test("marker mang BOM: cả hai lệnh vẫn tìm đúng nhà (không chết im lặng)", (t) => {
  const root = adaptRepo(t, { bom: true });
  writeFileSync(join(root, "harness", "agent", "05_TODO.md"), "# TODO\n\n- [x] xong rồi\n- [ ] còn mở\n");

  const rep = verifyTodo(root);
  assert.equal(rep.items.length, 2, `BOM làm gate mù: chỉ thấy ${rep.items.length} mục`);

  const r = archiveTodo(loadContext(root), ":memory:");
  assert.ok(
    r.archivePath.replace(/\\/g, "/").includes("harness/agent/archive"),
    `BOM làm archive ghi nhầm chỗ: ${r.archivePath}`,
  );
});

// Bề mặt UI: tab Harness của một project đọc docs qua hai hàm này. Trước khi vá, cả hai đọc
// cứng `docs/agent`·`docs/plan`, nên với repo đặt harness ở `harness/` thì cây file hiện RỖNG
// và mọi lần mở file trả "(file not found — run zemory init/sync to create it)" — tức mời
// người ta chạy đúng cái lệnh sẽ scaffold vào `docs/` của team. Hỏng ở tầng TRÌNH BÀY nên
// không cổng nào bắt được; phải có test riêng.
test("UI: cây file + đọc doc của project ADAPT phải thấy harness/ (không rỗng, không not-found)", async (t) => {
  const { listHarnessFilesForTest, readProjectDocForTest } = await import("../../dist/ui.js").then((m) => ({
    listHarnessFilesForTest: m.listHarnessFilesForTest,
    readProjectDocForTest: m.readProjectDocForTest,
  }));
  const root = adaptRepo(t);
  writeFileSync(join(root, "harness", "agent", "05_TODO.md"), "# TODO\n\n- [ ] còn mở\n");
  writeFileSync(join(root, "AGENTS.md"), "# repo\nHarness: harness/agent/\n");

  const tree = listHarnessFilesForTest(root);
  assert.ok(tree.agent.includes("05_TODO.md"), `cây file phải liệt kê docs của harness/, nhận: ${JSON.stringify(tree.agent)}`);
  assert.ok(tree.plan.includes("00_overview.md"), `phải liệt kê plan của harness/, nhận: ${JSON.stringify(tree.plan)}`);
  assert.equal(tree.hasAgents, true);

  const doc = readProjectDocForTest(root, "05_TODO.md");
  assert.equal(doc.ok, true, `đọc doc phải thành công, nhận: ${doc.content}`);
  assert.match(doc.content, /còn mở/);

  const plan = readProjectDocForTest(root, "plan/00_overview.md");
  assert.equal(plan.ok, true, `nhánh plan/ phải đọc được, nhận: ${plan.content}`);

  // Guard thoát-thư-mục vẫn phải chặn.
  assert.equal(readProjectDocForTest(root, "../../../etc/passwd").ok, false, "đường thoát ra ngoài phải bị chặn");
});

test("nếp cũ không gãy: repo chuẩn docs/ vẫn archive vào docs/agent/archive", (t) => {
  const root = tempDir(t, "zemory-legacy-cmd-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# TODO\n\n- [x] xong\n- [ ] mở\n");

  const r = archiveTodo(loadContext(root), ":memory:");

  assert.equal(r.moved, 1);
  assert.ok(r.archivePath.replace(/\\/g, "/").includes("docs/agent/archive"), r.archivePath);
});
