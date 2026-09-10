// `paths fix` — repair PROPOSALS for dead paths, applied only on an explicit --apply / click (plan/21 §5.6).
// Guards: unique-basename proposal · attic/excluded never proposed · ambiguous stays a report · relative pointers stay
// relative to their file · applyFix keeps CRLF, touches one line, inserts literally, refuses stale · CLI dry-run writes nothing.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, pathsFixProposals, proposeFixes } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const FE = (f) => readFileSync(new URL(`../../frontend/scripts/${f}`, import.meta.url), "utf8");

test("proposeFixes: tên duy nhất ⇒ đích · attic/ và exclude không bao giờ là đích · 2 bản cùng tên ⇒ ambiguous · ../ giữ tương đối theo FILE · thư mục ⇒ thư mục", () => {
  const files = ["backend/src/config/settings.ts", "docs/plan/10_x.md", "content/README.md", "attic/frontend-cockpit/pages/cockpit.html",
    "docs_template/a/agent/03_STRUCTURE.md", "docs_template/b/agent/03_STRUCTURE.md", "tasks/IC_Case/spec.md", "tasks/IC_Case/notes.md", "dist/App/sync/x.js"];
  const hit = (file, text, line = 3) => ({ file, line, text });
  const r = proposeFixes([
    hit("docs/plan/10_x.md", "backend/src/settings.ts"),
    hit("docs/plan/10_x.md", "frontend/pages/cockpit.html"),
    hit("docs/plan/10_x.md", "docs_template/agent/03_STRUCTURE.md"),
    hit("content/README.md", "../tasks/IC_old/spec.md"),
    hit("docs/plan/10_x.md", "old_place/IC_Case/"),
    hit("docs/plan/10_x.md", "build\\out\\x.js"),
    hit("docs/plan/10_x.md", "D:\\somewhere\\x.md"),
  ], files, ["dist/"]); // exclude KHÔNG có attic/ — attic phải bị chặn bởi luật riêng, kể cả khi repo tự khai exclude thiếu nó
  assert.equal(r[0].to, "backend/src/config/settings.ts", "tên duy nhất ⇒ đề xuất đích mới");
  assert.equal(r[1].to, null);
  assert.equal(r[1].reason, "no-candidate", "bản còn lại chỉ nằm trong attic/ ⇒ KHÔNG đề xuất");
  assert.equal(r[2].to, null);
  assert.equal(r[2].reason, "ambiguous");
  assert.equal(r[2].candidates.length, 2);
  assert.equal(r[3].to, "../tasks/IC_Case/spec.md", "con trỏ ../ giữ tương đối theo file chứa nó");
  assert.equal(r[4].to, "tasks/IC_Case/", "thư mục bị DỜI (cùng tên, khác cha) ⇒ đích là thư mục, giữ dấu / cuối — folder ĐỔI TÊN thì không tìm được bằng tên cũ, đúng thiết kế");
  assert.equal(r[5].to, null, "x.js chỉ có dưới dist/ (exclude) ⇒ không đề xuất");
  assert.equal(r[6].reason, "absolute");
});

test("applyFix: giữ CRLF · chỉ đúng dòng · chèn NGUYÊN VĂN ($& không nở) · chuỗi đã đổi ⇒ từ chối · ngoài root ⇒ từ chối", (t) => {
  const root = tempDir(t, "zemory-fix-");
  mkdirSync(join(root, "docs"));
  const f = join(root, "docs", "a.md");
  writeFileSync(f, "l1 `x/settings.ts`\r\nl2 `backend/src/settings.ts` and `backend/src/settings.ts`\r\nl3\r\n");
  const r = applyFix(root, { file: "docs/a.md", line: 2, from: "backend/src/settings.ts", to: "backend/src/config/$&.ts" });
  assert.equal(r.ok, true, JSON.stringify(r));
  const after = readFileSync(f, "utf8");
  assert.equal(after, "l1 `x/settings.ts`\r\nl2 `backend/src/config/$&.ts` and `backend/src/settings.ts`\r\nl3\r\n", "CRLF giữ nguyên · chỉ lần xuất hiện ĐẦU trên dòng 2 · $& là chữ, không phải mẫu");
  assert.equal(applyFix(root, { file: "docs/a.md", line: 1, from: "backend/src/settings.ts", to: "y" }).ok, false, "chuỗi không ở dòng đó ⇒ từ chối, không ghi");
  assert.equal(applyFix(root, { file: "../evil.md", line: 1, from: "a", to: "b" }).ok, false, "ngoài root ⇒ từ chối");
  assert.equal(readFileSync(f, "utf8"), after, "hai lượt từ chối không đụng file");
});

function repo(t) {
  const root = tempDir(t, "zemory-fixrepo-");
  for (const d of ["docs/agent/archive", "docs/plan", "backend/src/config"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "backend", "src", "config", "settings.ts"), "export const x = 1;\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const n of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) writeFileSync(join(root, "docs", "agent", n + ".md"), "# " + n + "\n");
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  writeFileSync(join(root, "docs", "plan", "10_x.md"), "# p\nsửa `backend/src/settings.ts` rồi `docs/nowhere/ghost.md`\n");
  return root;
}
const ctxOf = (root) => ({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: { docs: "docs/agent", adapters: {}, thresholds: {} }, log() {} });

test("pathsFixProposals: --all lấy mọi dead · newlyOnly theo baseline · CLI `paths fix` mặc định KHÔNG ghi, --apply mới ghi · help nêu verb", (t) => {
  const root = repo(t);
  // State + kho phải nằm dưới data/ như máy thật: data/ là exclude nên file state KHÔNG bị quét. Bản đầu để ở gốc ⇒ chính
  // paths-state.json bị coi là file cấu hình chứa đường chết và --apply SỬA LUÔN file state (bắt được 2026-09-10).
  mkdirSync(join(root, "data"));
  const state = join(root, "data", "state.json");
  const all = pathsFixProposals(ctxOf(root), { newlyOnly: false, stateFile: state });
  assert.deepEqual(all.proposals.map((p) => [p.from, p.to]), [["backend/src/settings.ts", "backend/src/config/settings.ts"], ["docs/nowhere/ghost.md", null]]);
  const fresh = pathsFixProposals(ctxOf(root), { newlyOnly: true, stateFile: state });
  assert.equal(fresh.proposals.length, 0, "lượt baseline: 2 dead là di sản ⇒ không có mới chết ⇒ không đề xuất");
  const env = { ...process.env, GLOBAL_MEMORY_DB: join(root, "data", "gm.db") };
  const doc = join(root, "docs", "plan", "10_x.md");
  const before = readFileSync(doc, "utf8");
  const dry = spawnSync(process.execPath, [CLI, "paths", "fix", "--root", root, "--all"], { encoding: "utf8", env });
  assert.equal(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /dry-run/);
  assert.match(dry.stdout, /backend\/src\/settings\.ts\s+→\s+backend\/src\/config\/settings\.ts/);
  assert.equal(readFileSync(doc, "utf8"), before, "dry-run KHÔNG ghi");
  const ap = spawnSync(process.execPath, [CLI, "paths", "fix", "--root", root, "--all", "--apply"], { encoding: "utf8", env });
  assert.equal(ap.status, 0, ap.stdout + ap.stderr);
  assert.match(ap.stdout, /applied 1\/1/);
  assert.match(readFileSync(doc, "utf8"), /`backend\/src\/config\/settings\.ts` rồi `docs\/nowhere\/ghost\.md`/, "chỉ con trỏ có đích được thay; ghost giữ nguyên");
  const help = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8", env });
  assert.match(help.stdout + help.stderr, /paths fix/, "help phải nêu verb mới");
});

test("FE: hộp thoại hỏi /paths-fix, nút .fix-apply gọi /paths-fix-apply, i18n đủ hai dict", () => {
  const sys = FE("system.js"), chrome = FE("chrome.js");
  assert.match(sys, /\/paths-fix\?root=/);
  assert.match(sys, /\/paths-fix-apply\?root=/);
  assert.match(sys, /fix-pick/);
  assert.match(sys, /ZICON\.std,size:'md'/, "hộp Repo standard ở nấc M (user 2026-09-10)");
  assert.match(sys, /t\('fix\.old'\)[\s\S]{0,200}t\('fix\.new'\)/, "đề xuất phải ghi rõ hai path cũ/mới ở hai dòng có nhãn");
  assert.match(FE("core.js"), /o\.size!=='lg'&&o\.size!=='md'/, "zDialog phải biết nấc md, không rơi về sm");
  const cut = chrome.indexOf("},en:{");
  const vi = chrome.slice(0, cut), en = chrome.slice(cut);
  for (const k of ["fix.loading", "fix.noneRows", "fix.noCand", "fix.ambiguous", "fix.apply", "fix.consent", "fix.applied", "fix.fail", "fix.old", "fix.new"]) {
    assert.ok(vi.includes(`'${k}':`), "vi thiếu " + k);
    assert.ok(en.includes(`'${k}':`), "en thiếu " + k);
  }
});
