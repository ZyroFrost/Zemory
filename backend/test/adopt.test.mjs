import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { ensureHarness, freshHarness } from "../../dist/docs/adopt.js";
import { loadContext } from "../../dist/core/config.js";
import { validate } from "../../dist/docs/validate.js";
import { tempDir } from "./helpers.mjs";

test("ensureHarness honors a custom docs path inside docs", (t) => {
  const root = tempDir(t, "zemory-adopt-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "docs", ".harness.json"),
    JSON.stringify({ docs: "docs/custom-agent", adapters: {}, thresholds: {} }),
  );

  ensureHarness(root);

  assert.equal(existsSync(join(root, "docs", "custom-agent", "02_RULES.md")), true);
  assert.equal(existsSync(join(root, "docs", "custom-agent", "01_CONSTITUTION.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_overview.md")), true);
});

test("ensureHarness(root, 'non-app') scaffolds the NON-APP tree (its own 03 + profile in config)", (t) => {
  const root = tempDir(t, "zemory-nonapp-scaffold-");
  const r = ensureHarness(root, "non-app");
  // The whole standard set lands (this regressed once: profile "non-app" mapped to
  // a folder that did not exist, so ZERO docs were copied).
  assert.ok(r.added.includes("03_STRUCTURE.md"), "the standard docs are scaffolded, not silently skipped");
  const struct = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), "utf8");
  assert.match(struct, /hệ NON-APP/, "scaffolds the NON-APP structure standard, not the app one");
  assert.match(struct, /KÉO \/ ĐIỀN \/ UPLOAD/, "carries the non-app file-automation model");
  // Phase 3 (2026-07-31): playbooks are skill FILES, and scaffolding them is part of
  // init — 04_SKILLS only NAMES them now, so a scaffold that skipped .claude/skills/
  // would hand the project a registry pointing at files that do not exist.
  const skills = readFileSync(join(root, "docs", "agent", "04_SKILLS.md"), "utf8");
  for (const s of ["pull", "fill", "upload"]) {
    assert.ok(skills.includes(`\`${s}/\``), `04_SKILLS must register the ${s} skill`);
    assert.equal(
      existsSync(join(root, ".claude", "skills", s, "SKILL.md")),
      true,
      `.claude/skills/${s}/SKILL.md must be scaffolded, not just registered`,
    );
  }
  // The profile is persisted so validate/scaffold agree on later runs.
  const cfg = JSON.parse(readFileSync(join(root, "docs", ".harness.json"), "utf8"));
  assert.equal(cfg.profile, "non-app");
});

test("ensureHarness() with no profile scaffolds the APP tree (unchanged default)", (t) => {
  const root = tempDir(t, "zemory-app-scaffold-");
  ensureHarness(root);
  const struct = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), "utf8");
  assert.match(struct, /hệ APP/, "default scaffold is the app standard");
  // App stays the IMPLICIT default — no profile key written (validate's non-app hint depends on this).
  const cfg = JSON.parse(readFileSync(join(root, "docs", ".harness.json"), "utf8"));
  assert.equal(cfg.profile, undefined, "app profile is implicit — no profile key");
});

test("ensureHarness renames every older-generation doc to the current numbering (legacy chains)", (t) => {
  const root = tempDir(t, "zemory-legacy-");
  const agentDir = join(root, "docs", "agent");
  mkdirSync(agentDir, { recursive: true });
  // gen-2 folder (pre-constitution): 01_RULES/02_STRUCTURE/03_TODO/04_CHANGES
  writeFileSync(join(agentDir, "01_RULES.md"), "# old rules\n");
  writeFileSync(join(agentDir, "02_STRUCTURE.md"), "# old structure\n");
  writeFileSync(join(agentDir, "03_TODO.md"), "# old todo\n");
  writeFileSync(join(agentDir, "04_CHANGES.md"), "# old changes\n");

  ensureHarness(root);

  // Renamed in place (content preserved), then missing constitution + skills gap-fill.
  assert.equal(readFileSync(join(agentDir, "02_RULES.md"), "utf8"), "# old rules\n");
  assert.equal(readFileSync(join(agentDir, "03_STRUCTURE.md"), "utf8"), "# old structure\n");
  assert.equal(readFileSync(join(agentDir, "05_TODO.md"), "utf8"), "# old todo\n");
  assert.equal(readFileSync(join(agentDir, "06_CHANGES.md"), "utf8"), "# old changes\n");
  assert.equal(existsSync(join(agentDir, "01_CONSTITUTION.md")), true, "constitution gap-filled from template");
  assert.equal(existsSync(join(agentDir, "04_SKILLS.md")), true, "skills gap-filled from template");
  for (const gone of ["01_RULES.md", "02_STRUCTURE.md", "03_TODO.md", "04_CHANGES.md"]) {
    assert.equal(existsSync(join(agentDir, gone)), false, `${gone} no longer present under its old name`);
  }
});

test("ensureHarness renames a gen-3 folder (04_TODO/05_CHANGES) to the current numbering", (t) => {
  const root = tempDir(t, "zemory-gen3-");
  const agentDir = join(root, "docs", "agent");
  mkdirSync(agentDir, { recursive: true });
  // gen-3 folder (pre-skills, 2026-07-14..18): full set minus 04_SKILLS.
  writeFileSync(join(agentDir, "01_CONSTITUTION.md"), "# c\n");
  writeFileSync(join(agentDir, "02_RULES.md"), "# r\n");
  writeFileSync(join(agentDir, "03_STRUCTURE.md"), "# s\n");
  writeFileSync(join(agentDir, "04_TODO.md"), "# gen3 todo\n");
  writeFileSync(join(agentDir, "05_CHANGES.md"), "# gen3 changes\n");

  ensureHarness(root);

  assert.equal(readFileSync(join(agentDir, "05_TODO.md"), "utf8"), "# gen3 todo\n");
  assert.equal(readFileSync(join(agentDir, "06_CHANGES.md"), "utf8"), "# gen3 changes\n");
  assert.equal(existsSync(join(agentDir, "04_SKILLS.md")), true, "skills gap-filled from template");
  assert.equal(existsSync(join(agentDir, "04_TODO.md")), false, "old 04_TODO renamed away");
  assert.equal(existsSync(join(agentDir, "05_CHANGES.md")), false, "old 05_CHANGES renamed away");
});

// ── ADAPT v2 · N1 (chủ quyền): harness KHÔNG dời đồ của repo ────────────────────
//
// Ca thật: repo OpenRCA_3BoysAI trỏ zemory vào `harness/` vì `docs/` là bài nộp của team.
// Bản trước, `init`/`sync` gặp `plan/` hay `planning/` ở gốc repo là `renameSync` từng file
// vào `docs/plan` — tool tự ý dời thư mục của người ta, và im lặng. Đo trên 23 repo lớn:
// `plan/`·`planning/` cấp 1 = 0/23 ⇒ hành vi này gần như không giúp ai, nhưng khi nổ thì nổ
// vào dữ liệu không dựng lại được. Hai khẳng định dưới đây là hai NỬA của cùng một luật:
// không dời (①) VÀ phải nói ra là mình thấy (②) — im lặng bỏ qua cũng là một dạng hỏng.
test("ensureHarness KHÔNG dời plan/ · planning/ của repo, chỉ BÁO (ADAPT v2 · N1)", (t) => {
  const root = tempDir(t, "zemory-adapt-sovereign-");
  for (const dir of ["plan", "planning"]) {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, "repo-owned.md"), `# ${dir} của repo\n`);
  }

  const r = ensureHarness(root);

  // ① Đồ của repo còn nguyên TẠI CHỖ, nội dung không suy suyển.
  for (const dir of ["plan", "planning"]) {
    assert.equal(
      existsSync(join(root, dir, "repo-owned.md")),
      true,
      `${dir}/repo-owned.md phải Ở NGUYÊN chỗ cũ — harness không được dời đồ của repo`,
    );
    assert.equal(readFileSync(join(root, dir, "repo-owned.md"), "utf8"), `# ${dir} của repo\n`);
  }
  // ...và KHÔNG bị lén chép sang nhà của harness.
  assert.equal(
    existsSync(join(root, "docs", "plan", "repo-owned.md")),
    false,
    "file của repo không được xuất hiện trong docs/plan",
  );

  // ② Thấy thì phải BÁO — người quyết có gộp hay không, không phải tool.
  assert.deepEqual(
    [...r.untouchedLegacyPlan].sort(),
    ["plan", "planning"],
    "hai thư mục có sẵn phải được nêu tên trong kết quả adopt",
  );

  // Harness vẫn dựng đủ nhà RIÊNG của nó (không dời ≠ không làm gì).
  assert.equal(existsSync(join(root, "docs", "plan", "00_overview.md")), true);
});

test("repo không có plan/ sẵn ⇒ untouchedLegacyPlan rỗng (không báo oan)", (t) => {
  const root = tempDir(t, "zemory-adapt-clean-");
  const r = ensureHarness(root);
  assert.deepEqual(r.untouchedLegacyPlan, [], "trường hợp thường phải im lặng");
});

// ── ADAPT v2 · 4.2: entry ba trạng thái — "chưa nối" phải nhìn thấy được ─────────
//
// 43% repo lớn đã có AGENTS.md riêng. Bản trước gộp ca đó im lặng vào "kept existing":
// harness trông như "đã nhận" mà không bao giờ được nạp, và không gì báo cho ai biết.
test("entry là bản riêng của repo, KHÔNG nhắc harness ⇒ báo 'chưa nối' kèm dòng con trỏ", (t) => {
  const root = tempDir(t, "zemory-entry-unlinked-");
  writeFileSync(join(root, "AGENTS.md"), "# Quy ước nội bộ của team\nĐây là file của repo.\n");
  writeFileSync(join(root, "CLAUDE.md"), "# Ghi chú riêng\n");

  const r = ensureHarness(root);

  assert.equal(r.entriesUnlinked.length, 2, "cả hai entry đều là bản riêng chưa nhắc harness");
  const files = r.entriesUnlinked.map((e) => e.file).sort();
  assert.deepEqual(files, ["AGENTS.md", "CLAUDE.md"]);
  for (const e of r.entriesUnlinked) {
    assert.match(e.pointer, /docs\/agent/, "dòng con trỏ phải chỉ đúng nhà harness đã khai");
  }
  // Và tuyệt đối KHÔNG được sửa file của repo — chỉ đề xuất.
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "# Quy ước nội bộ của team\nĐây là file của repo.\n");
});

test("entry bản riêng NHƯNG đã nhắc tới nhà harness ⇒ coi là nối rồi, không báo", (t) => {
  const root = tempDir(t, "zemory-entry-linked-");
  writeFileSync(join(root, "AGENTS.md"), "# Team\n> Harness: đọc docs/agent/ trước khi làm.\n");

  const r = ensureHarness(root);

  assert.ok(
    !r.entriesUnlinked.some((e) => e.file === "AGENTS.md"),
    "đã trỏ tới harness rồi mà vẫn báo 'chưa nối' là báo oan",
  );
  // CLAUDE.md chưa tồn tại ⇒ được scaffold từ template (mang dấu zemory) ⇒ cũng không báo.
  assert.ok(!r.entriesUnlinked.length, `không được báo gì thêm: ${JSON.stringify(r.entriesUnlinked)}`);
});

test("nối GIÁN TIẾP: CLAUDE.md chỉ chứa @AGENTS.md, AGENTS.md đã trỏ harness ⇒ cả hai nối", (t) => {
  // Ca thật đã báo oan trên repo tham chiếu: khuôn "một nguồn, hai cửa" là thiết kế
  // của CHÍNH template zemory — CLAUDE.md import AGENTS.md thay vì lặp nội dung.
  const root = tempDir(t, "zemory-entry-transitive-");
  writeFileSync(join(root, "AGENTS.md"), "# Team\n> Harness: đọc docs/agent/ trước.\n");
  writeFileSync(join(root, "CLAUDE.md"), "<!-- entry -->\n@AGENTS.md\n");

  const r = ensureHarness(root);

  assert.equal(
    r.entriesUnlinked.length,
    0,
    `CLAUDE.md nối qua AGENTS.md mà vẫn báo: ${JSON.stringify(r.entriesUnlinked)}`,
  );
});

test("entry do template sinh (mang dấu zemory) ⇒ không bao giờ bị báo 'chưa nối'", (t) => {
  const root = tempDir(t, "zemory-entry-generated-");
  ensureHarness(root); // lần 1: scaffold cả hai entry từ template
  const r = ensureHarness(root); // lần 2: chạy lại trên chính kết quả của mình
  assert.equal(r.entriesUnlinked.length, 0, "file của chính tool sinh ra mà báo 'chưa nối' ⇒ phép thử sai");
});

test("freshHarness backs up both agent docs and plan", (t) => {
  const root = tempDir(t, "zemory-fresh-");
  ensureHarness(root);
  writeFileSync(join(root, "docs", "plan", "custom.md"), "# Keep me\n");

  const result = freshHarness(root);

  assert.ok(result.renamedTo);
  assert.ok(result.renamedPlanTo);
  assert.equal(existsSync(join(result.renamedPlanTo, "custom.md")), true);
  assert.equal(existsSync(join(root, "docs", "plan", "00_overview.md")), true);
});

test("validate enforces the APP standard by default (warns on missing backend/frontend)", (t) => {
  const root = tempDir(t, "zemory-profile-app-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# app\n");
  // PHẢI có code đặt SAI CHỖ thì cảnh báo mới đúng. Trước đây kho giả này TRỐNG RỖNG, nên nó
  // vô tình kiểm "dự án trắng cũng bị cảnh báo" — mà đó chính là hành vi đã sửa (2026-08-03:
  // người mới `init` xong thấy ngay "1 lỗi cần sửa" dù chưa làm gì sai). Ý ĐỊNH của phép kiểm
  // là "chuẩn APP có được áp không", nên sửa KHO GIẢ cho khớp ý định, KHÔNG nới khẳng định.
  mkdirSync(join(root, "lib"), { recursive: true });
  writeFileSync(join(root, "lib", "thing.ts"), "export const x = 1;\n");
  const rep = validate(loadContext(root));
  const msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /own code not under/);
  assert.doesNotMatch(msgs, /non-app/i);
});

test("dự án TRẮNG (vừa init, chưa có code) KHÔNG bị cảnh báo đặt code sai chỗ", (t) => {
  // Chặn hồi quy cho đúng lỗi vừa sửa: `doctor` báo "1 lỗi cần sửa" ngay phút đầu người mới
  // dùng công cụ, trong khi họ chưa viết dòng nào. Không có code thì không thể để code sai chỗ.
  const root = tempDir(t, "zemory-profile-blank-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# app\n");
  const rep = validate(loadContext(root));
  assert.doesNotMatch(rep.issues.map((i) => i.msg).join("\n"), /own code not under/);
  assert.equal(
    rep.issues.filter((i) => i.level === "warn" && /structure/.test(i.msg)).length,
    0,
    "dự án trắng không được có cảnh báo cấu trúc nào",
  );
});

test("validate with profile non-app checks deliverables, never asks for backend/frontend", (t) => {
  const root = tempDir(t, "zemory-profile-nonapp-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# powerbi project\n");
  const cfgPath = join(root, "docs", ".harness.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.profile = "non-app";
  writeFileSync(cfgPath, JSON.stringify(cfg));

  // No deliverable yet → warn about that (and ONLY that kind of structure issue).
  let rep = validate(loadContext(root));
  let msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /no deliverable folder/);
  assert.doesNotMatch(msgs, /backend|frontend/);

  // With reports/ the non-app requirement is satisfied.
  mkdirSync(join(root, "reports"));
  rep = validate(loadContext(root));
  msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.doesNotMatch(msgs, /no deliverable folder/);
  // "§7" dropped from the message on 2026-07-31: the non-app standard is its OWN file
  // now, and §7 THERE is the data dictionary — pointing a deliverable warning at it sent
  // the reader to the wrong section. The profile tag is what matters, not a section number.
  assert.match(msgs, /structure\[non-app\].*reports\//);
});

test("validate hints at the non-app profile when there is no code but a deliverable exists", (t) => {
  const root = tempDir(t, "zemory-profile-hint-");
  ensureHarness(root);
  writeFileSync(join(root, "AGENTS.md"), "# bi\n");
  mkdirSync(join(root, "reports"));
  const rep = validate(loadContext(root));
  const msgs = rep.issues.map((i) => i.msg).join("\n");
  assert.match(msgs, /"profile": "non-app"/);
});
