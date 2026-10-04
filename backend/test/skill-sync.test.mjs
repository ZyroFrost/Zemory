// Skill CHUNG đi theo chuẩn tới repo đã init (2026-10-04).
//
// Đo trước khi có lớp này: `init` chép skill một lần rồi không bao giờ cập nhật — 6 phòng ban giữ
// `session-close` từ 24/08, thiếu cả "Bước 3b quét rác". Luật user: skill có CHUNG (do chuẩn quản) và
// RIÊNG (không được đụng). Repo đã sửa tay một skill chung ⇒ CHỈ BÁO, không ghi đè.
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { skillDiff, applySkills } from "../../dist/docs/standard.js";
import { tempDir } from "./helpers.mjs";

const ZEMORY = join(import.meta.dirname, "..", "..");
const TPL = join(ZEMORY, "docs_template", "03_nonapp", ".claude", "skills");

/** Bản CŨ NHẤT của một tệp mẫu trong lịch sử git — "bản chuẩn cũ mà repo chưa sửa". */
function oldestTemplate(rel) {
  const log = execFileSync("git", ["log", "--follow", "--name-only", "--format=@@%H", "--", rel], { cwd: ZEMORY, encoding: "utf8" });
  const blocks = log.split("@@").map((b) => b.trim().split(/\r?\n/)).filter((b) => b[0]);
  const last = blocks[blocks.length - 1];
  return execFileSync("git", ["show", `${last[0]}:${last[last.length - 1]}`], { cwd: ZEMORY, encoding: "utf8" });
}

function repo(t) {
  const root = tempDir(t, "zemory-skillsync-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "non-app" }));
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  return root;
}
const put = (root, rel, text) => {
  const p = join(root, ".claude", "skills", ...rel.split("/"));
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, text);
  return p;
};
const tpl = (rel) => readFileSync(join(TPL, ...rel.split("/")), "utf8");

test("skill chung: thiếu ⇒ thêm · bản mẫu cũ chưa sửa ⇒ thay · đã sửa tay ⇒ CHỈ BÁO · skill riêng ⇒ không đụng", (t) => {
  const root = repo(t);
  // current: đúng bản mẫu hiện tại (kể cả khác kiểu xuống dòng — không phải "sửa")
  put(root, "grill/SKILL.md", tpl("grill/SKILL.md").replace(/\r?\n/g, "\r\n"));
  // clean: bản cũ nhất của session-close trong lịch sử bộ mẫu
  const old = oldestTemplate("docs_template/03_nonapp/.claude/skills/session-close/SKILL.md");
  const sc = put(root, "session-close/SKILL.md", old);
  // local: bản mẫu hiện tại + một dòng repo tự thêm
  const audit = put(root, "audit/SKILL.md", tpl("audit/SKILL.md") + "\nDÒNG REPO TỰ THÊM\n");
  // riêng: không có trong bộ mẫu
  const mine = put(root, "pbi-main/SKILL.md", "skill riêng của repo\n");
  // read-office thiếu hẳn ⇒ absent

  const v = skillDiff(root);
  const of = (skill, file = "SKILL.md") => v.find((x) => x.skill === skill && x.file === file)?.verdict;
  assert.equal(of("grill"), "current", "khác kiểu xuống dòng không phải là sửa");
  assert.equal(of("session-close"), "clean", "bản mẫu cũ chưa sửa ⇒ thay được");
  assert.equal(of("audit"), "local", "đã sửa tay ⇒ local");
  assert.equal(of("read-office"), "absent");
  assert.equal(v.some((x) => x.skill === "pbi-main"), false, "skill RIÊNG không bao giờ có mặt trong phép so");

  const dry = applySkills(root, { apply: false });
  assert.equal(readFileSync(sc, "utf8"), old, "xem trước KHÔNG ghi");
  assert.ok(dry.some((x) => x.skill === "session-close" && x.action === "would-replace"));

  applySkills(root, { apply: true });
  assert.equal(readFileSync(sc, "utf8").replace(/\r\n/g, "\n"), tpl("session-close/SKILL.md").replace(/\r\n/g, "\n"), "clean ⇒ thay bằng bản mới");
  assert.match(readFileSync(audit, "utf8"), /DÒNG REPO TỰ THÊM/, "local ⇒ KHÔNG ghi đè");
  assert.equal(readFileSync(mine, "utf8"), "skill riêng của repo\n", "skill riêng nguyên vẹn");
  assert.ok(existsSync(join(root, ".claude", "skills", "read-office", "SKILL.md")), "absent ⇒ đã thêm");
  // lượt hai: chỉ còn phần sửa tay
  const again = applySkills(root, { apply: true });
  assert.deepEqual(again.map((x) => x.action), again.map(() => "kept-local"), JSON.stringify(again));
});

test("repo NGUỒN (chính zemory) ⇒ không so gì: chuẩn đi TỪ đây ra", () => {
  assert.deepEqual(skillDiff(ZEMORY), []);
});

test("thay bản mẫu cũ giữ kiểu xuống dòng của file ĐÍCH (02_RULES §EOL)", (t) => {
  const root = repo(t);
  const old = oldestTemplate("docs_template/03_nonapp/.claude/skills/session-close/SKILL.md").replace(/\r?\n/g, "\r\n");
  const sc = put(root, "session-close/SKILL.md", old);
  applySkills(root, { apply: true });
  const out = readFileSync(sc, "utf8");
  assert.ok(out.includes("\r\n") && !/[^\r]\n/.test(out), "file CRLF thì bản thay cũng CRLF");
});

test("🔴 trùng DẤU NGÀY mà bản mẫu đã sửa lại trong ngày ⇒ KHÔNG được báo 'current' (9 repo áp bản sáng 04/10)", async (t) => {
  const { standardDiff } = await import("../../dist/docs/standard.js");
  const root = repo(t);
  // Bản 02_RULES phiên kho phát sáng 04/10 (c7ea64f, dấu 2026-10-04); bản mẫu hiện tại sửa lại CÙNG ngày.
  const morning = execFileSync("git", ["show", "c7ea64f:docs_template/03_nonapp/agent/02_RULES.md"], { cwd: ZEMORY, encoding: "utf8" });
  const now = readFileSync(join(ZEMORY, "docs_template", "03_nonapp", "agent", "02_RULES.md"), "utf8");
  assert.notEqual(morning.replace(/\r\n/g, "\n"), now.replace(/\r\n/g, "\n"), "tiền đề: bản mẫu đã đổi sau bản sáng");
  assert.match(morning, /zemory-standard: 2026-10-04/, "tiền đề: bản sáng mang dấu 2026-10-04");
  // `init` thay `<PROJECT>` bằng tên repo — fixture phải làm y hệt, không thì mọi dòng có tên đọc thành "sửa tay".
  const { basename } = await import("node:path");
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), morning.replace(/<PROJECT>/g, basename(root)));
  const v = standardDiff(root).files.find((f) => f.file === "02_RULES.md");
  assert.notEqual(v.verdict, "current", "cùng dấu ngày nhưng dựng từ bản SỚM hơn ⇒ phải được áp bản mới");
  assert.equal(v.verdict, "clean", JSON.stringify(v));
});
