// Hooks for the common rules that left the rule core (plan/27 §3): each is checked from both sides — the violation is
// blocked FOR ITS RULE (the message names it), and the look-alike next to it passes. Run as the real generated guard.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateGuards } from "../../dist/docs/guard-gen.js";
import { changelogOrderBreaks } from "../../dist/docs/validate.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const root = tempDir(t, "zemory-rh-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(root, "docs", "agent", "02_RULES.md"), "- `02-24` **EOL.** keep it\n- `02-30` **ASCII.** names\n- `02-26` **Dấu.** docs\n- `02-27` **Voice.** spec\n- `02-38` **Ledger.** ask\n");
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# TODO\n- [ ] one\n- [ ] two\n");
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q"); git("config", "user.email", "t@t"); git("config", "user.name", "t");
  const { hooksDir } = generateGuards(root);
  const fire = (tool_name, tool_input) => {
    const r = spawnSync(process.execPath, [join(hooksDir, "guard.cjs")], { input: JSON.stringify({ tool_name, tool_input }), encoding: "utf8" });
    return { blocked: r.status === 2, say: `${r.stdout}${r.stderr}` };
  };
  const flag = (name) => writeFileSync(join(hooksDir, `.allow-${name}`), "");
  return { root, git, hooksDir, fire, flag };
}
const W = (root, rel, content) => ["Write", { file_path: join(root, rel), content }];
const E = (root, rel, old_string, new_string) => ["Edit", { file_path: join(root, rel), old_string, new_string }];

test("02-24: a Write that turns a CRLF file into LF is blocked; same EOL, a new file, or a repo with an EOL lock pass", (t) => {
  const s = repo(t);
  writeFileSync(join(s.root, "a.md"), "x\r\ny\r\n");
  s.flag("overwrite");
  const r = s.fire(...W(s.root, "a.md", "x\ny\nz\n"));
  assert.equal(r.blocked, true); assert.match(r.say, /rule 02-24/);
  s.flag("overwrite");
  assert.doesNotMatch(s.fire(...W(s.root, "a.md", "x\r\ny\r\nz\r\n")).say, /02-24/, "same EOL passes");
  assert.equal(s.fire(...W(s.root, "new.md", "x\ny\n")).blocked, false, "a new file passes");
  writeFileSync(join(s.root, ".gitattributes"), "* text=auto eol=lf\n");
  s.flag("overwrite");
  assert.doesNotMatch(s.fire(...W(s.root, "a.md", "x\ny\n")).say, /02-24/, "git normalises in a locked repo");
});

test("02-30: a new non-ASCII file/folder name or Vietnamese identifier is blocked; comments, strings, existing files pass", (t) => {
  const s = repo(t);
  const r = s.fire(...W(s.root, "báo-cáo.md", "x\n"));
  assert.equal(r.blocked, true); assert.match(r.say, /rule 02-30/);
  assert.match(s.fire("Bash", { command: "mkdir thư-mục" }).say, /rule 02-30/);
  assert.equal(s.fire("Bash", { command: "mkdir reports" }).blocked, false);
  assert.match(s.fire(...W(s.root, "src/a.ts", "const ketQua = 1;\n")).say, /rule 02-30[\s\S]*ketQua/);
  assert.match(s.fire(...W(s.root, "src/b.ts", "function tínhTổng() {}\n")).say, /non-ASCII/);
  assert.equal(s.fire(...W(s.root, "src/c.ts", "// kết quả của phép đo\nconst label = \"ketQua\";\nconst result = 1;\n")).blocked, false,
    "a Vietnamese comment and a string are data, not identifiers");
  writeFileSync(join(s.root, "cũ.md"), "x\n");
  assert.doesNotMatch(s.fire(...E(s.root, "cũ.md", "x", "y")).say, /02-30/, "editing a file that already has its name is not creating one");
});

test("02-26: new Vietnamese without diacritics in docs, comments or a commit message is blocked; data and English pass", (t) => {
  const s = repo(t);
  const r = s.fire(...W(s.root, "notes.md", "Viec nay khong duoc lam truoc khi kiem tra.\n"));
  assert.equal(r.blocked, true); assert.match(r.say, /rule 02-26/);
  assert.match(s.fire(...W(s.root, "src/a.ts", "// khong duoc goi ham nay\nconst x = 1;\n")).say, /rule 02-26/);
  assert.match(s.fire("Bash", { command: 'git commit -m "sua loi khong chay duoc"' }).say, /rule 02-26/);
  for (const [rel, body] of [
    ["ok1.md", "Việc này không được làm trước khi kiểm tra.\n"],
    ["ok2.md", "Do so can ten ban van no to in on at be me we he con as is it an the.\n"],
    ["ok3.md", "Tên cột giữ nguyên: `Kich thuoc khu dat` và \"So luong nhap\".\n"],
    ["ok4.md", "Cửa hàng An Duong Vuong mở lúc 8 giờ.\n"],
    ["src/ok5.ts", "const label = 'khong duoc';\nconst url = \"http://x.vn//khong duoc lam viec nay\";\n"],
  ]) assert.doesNotMatch(s.fire(...W(s.root, rel, body)).say, /02-26/, `blocked wrongly: ${rel}`);
  assert.doesNotMatch(s.fire("Bash", { command: 'git commit -m "fix: keep the line endings"' }).say, /02-26/);
  writeFileSync(join(s.root, "old.md"), "khong duoc lam\n");
  assert.doesNotMatch(s.fire(...E(s.root, "old.md", "khong duoc lam", "khong duoc lam\nDòng mới có dấu.")).say, /02-26/,
    "a line already in the file is not new");
});

test("02-27: a new line in the rule set that quotes the user or dates a decision is blocked; other files and old lines pass", (t) => {
  const s = repo(t);
  const rules = "docs/agent/02_RULES.md";
  const r = s.fire(...E(s.root, rules, "- `02-38` **Ledger.** ask", "- `02-38` **Ledger.** ask *(user chốt 2026-10-14)*"));
  assert.equal(r.blocked, true); assert.match(r.say, /rule 02-27/);
  assert.match(s.fire(...E(s.root, rules, "- `02-38` **Ledger.** ask", "- `02-38` **Ledger.** ask — user: *\"cứ làm đi\"*")).say, /rule 02-27/);
  assert.doesNotMatch(s.fire(...E(s.root, rules, "- `02-38` **Ledger.** ask", "- `02-38` **Ledger.** ask one question first")).say, /02-27/);
  assert.doesNotMatch(s.fire(...W(s.root, "notes.md", "User chốt 2026-10-14: làm luôn.\n")).say, /02-27/, "only the harness rule files");
});

test("02-38: a new open item in 05_TODO is blocked until the one-use flag; rewording or closing an item passes", (t) => {
  const s = repo(t);
  const todo = "docs/agent/05_TODO.md";
  const r = s.fire(...E(s.root, todo, "- [ ] two", "- [ ] two\n- [ ] three"));
  assert.equal(r.blocked, true); assert.match(r.say, /rule 02-38[\s\S]*\.allow-todo/);
  assert.equal(s.fire(...E(s.root, todo, "- [ ] two", "- [ ] two, reworded")).blocked, false, "rewording is not a new item");
  assert.equal(s.fire(...E(s.root, todo, "- [ ] two", "- [x] two")).blocked, false, "closing is not a new item");
  s.flag("todo");
  assert.equal(s.fire(...E(s.root, todo, "- [ ] two", "- [ ] two\n- [ ] three")).blocked, false, "the user said yes ⇒ the flag lets it in");
});

test("02-5: a scratch file in staging stops the commit; a normal file passes", (t) => {
  const s = repo(t);
  const run = () => spawnSync(process.execPath, [join(s.hooksDir, "precommit-guard.cjs")], { cwd: s.root, encoding: "utf8" });
  writeFileSync(join(s.root, "app.ts"), "export {};\n");
  s.git("add", "app.ts");
  assert.equal(run().status, 0);
  for (const f of ["_scratch_probe.mjs", "src/.tmp_dump.json"]) {
    mkdirSync(join(s.root, f, ".."), { recursive: true });
    writeFileSync(join(s.root, f), "x");
    s.git("add", "-f", f);
    const out = run();
    assert.equal(out.status, 1, `slipped through: ${f}`);
    assert.match(out.stderr, /rule 02-5/);
    s.git("rm", "-q", "--cached", f);
  }
});

test("02-41: changelog entries out of order are found; newest-on-top with suffixes is clean", () => {
  assert.deepEqual(changelogOrderBreaks("## [2026-10-14b] — x\n## [2026-10-14] — y\n## [2026-10-13d] — z\n## [2026-10-13] — w\n"), []);
  assert.deepEqual(changelogOrderBreaks("## [2026-10-13] — old\n## [2026-10-14] — new\n"), ["[2026-10-13] above [2026-10-14]"]);
  assert.deepEqual(changelogOrderBreaks("## [2026-10-14] — x\n## [2026-10-14a] — y\n"), ["[2026-10-14] above [2026-10-14a]"]);
});
