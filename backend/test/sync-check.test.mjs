// "Chấm than update" (2026-08-21) — syncCheck là phép đo DÙNG CHUNG cho ba bề mặt
// (doctor · /harness-updates · hook mỗi-phiên). Nó CHỈ ĐO, không ghi: một hàm nhắc mà
// tự ý sync là vi phạm 02_RULES §Phạm vi ngay trong lõi. Test dựng repo thật trên đĩa
// tạm — không mock, vì tiêu chí "thiếu" phải bám đúng ngữ nghĩa gap-fill của ensureHarness.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { ensureHarness, syncCheck } from "../../dist/docs/adopt.js";
import { tempDir } from "./helpers.mjs";

test("repo KHÔNG marker ⇒ connected=false, không nhắc gì (đừng làm phiền repo thường)", (t) => {
  const root = tempDir(t, "zemory-synccheck-");
  writeFileSync(join(root, "README.md"), "# x\n");
  const r = syncCheck(root);
  assert.equal(r.connected, false);
  assert.deepEqual(r.missing, []);
});

test("repo vừa scaffold ⇒ khớp trọn (vừa sync xong mà đã kêu cũ = báo oan)", (t) => {
  const root = tempDir(t, "zemory-synccheck-");
  ensureHarness(root);
  const r = syncCheck(root);
  assert.equal(r.connected, true);
  assert.deepEqual(r.missing, [], `vừa scaffold mà thiếu: ${JSON.stringify(r.missing)}`);
});

test("template có file repo chưa nhận ⇒ NÊU TÊN đúng file đó; nhận rồi ⇒ hết kêu", (t) => {
  // Mô phỏng đúng ca thật 2026-08-21: skill `write-style` mới vào bộ chuẩn, repo cũ chưa có.
  const root = tempDir(t, "zemory-synccheck-");
  ensureHarness(root);
  const gone = join(root, ".claude", "skills", "write-style", "SKILL.md");
  const body = readFileSync(gone, "utf8");
  rmSync(gone);
  const r = syncCheck(root);
  assert.ok(
    r.missing.includes(".claude/skills/write-style/SKILL.md"),
    `phải nêu đúng file thiếu, nhận: ${JSON.stringify(r.missing)}`,
  );
  mkdirSync(join(root, ".claude", "skills", "write-style"), { recursive: true });
  writeFileSync(gone, body);
  assert.deepEqual(syncCheck(root).missing, [], "trả file lại rồi mà vẫn kêu = chấm than kẹt");
});

test("file ĐÃ có nội dung riêng ⇒ KHÔNG bị tính thiếu (file-wins — check không được xui ghi đè)", (t) => {
  const root = tempDir(t, "zemory-synccheck-");
  ensureHarness(root);
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), "# luật riêng của repo\n");
  const r = syncCheck(root);
  assert.ok(!r.missing.some((f) => f.includes("02_RULES")), "file tồn tại (dù khác nội dung) không phải 'thiếu'");
});
