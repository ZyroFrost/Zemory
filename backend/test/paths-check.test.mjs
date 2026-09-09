// CỔNG cho plan/21 — phép kiểm đường dẫn chết. Mỗi ca ghim một luật trong plan; ca nào cũng phải ĐỎ
// được khi luật đó bị phá (đột biến hoá ở changelog). Ba ràng buộc không được nới:
//   ① chỉ chuỗi CÓ PHÂN CÁCH mới bị phán — chuỗi trần là `undelimited`, kể cả khi nó không tồn tại;
//   ② ngoài `roots` / root vắng trên máy ⇒ KHÔNG KẾT LUẬN, không bao giờ là `dead`;
//   ③ `validate()` chỉ nhận đúng MỘT dòng mức `info` — đó là hợp đồng để pill Tính năng không đổi màu.
// Bẫy đã trả giá khi viết bộ này: khai root `Z:\vanished` để thử "root vắng" ⇒ `existsSync` chờ SMB
// timeout **63 giây** vì Z: là ổ MẠNG đã ánh xạ trên máy này. Root vắng trong test phải nằm trên ổ cục bộ.
// Và: `docs/agent/01–04` là file TỪ ĐIỂN (chuỗi tương đối không bị phán) ⇒ chuỗi cần PHÁN đặt ở `docs/plan/`.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { classify, extractCandidates, isDictionaryFile, isHistoryFile, isHistoryLine, loadPathsState, monitorPaths, pathsCheck } from "../../dist/docs/paths.js";
import { rmSync } from "node:fs";
import { validate } from "../../dist/docs/validate.js";
import { tempDir } from "./helpers.mjs";

const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

/** Repo giả: có docs/agent + một file thật để trỏ tới, KHÔNG có git ⇒ đi nhánh walk. */
function repo(t) {
  const root = tempDir(t, "zemory-paths-");
  mkdirSync(join(root, "docs", "agent", "archive"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  mkdirSync(join(root, "backend", "src", "memory"), { recursive: true });
  writeFileSync(join(root, "backend", "src", "real.ts"), "export const x = 1;\n");
  writeFileSync(join(root, "backend", "src", "memory", "share.ts"), "export const y = 1;\n");
  mkdirSync(join(root, "dir with space"), { recursive: true });
  writeFileSync(join(root, "dir with space", "ok.txt"), "x");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) {
    writeFileSync(join(root, "docs", "agent", `${f}.md`), `# ${f}\n`);
  }
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  return root;
}
const ctxOf = (root, pathCheck) => ({
  projectRoot: root,
  docsDir: join(root, "docs", "agent"),
  config: { docs: "docs/agent", adapters: {}, thresholds: {}, ...(pathCheck ? { pathCheck } : {}) },
  log() {},
});
const md = (root, rel, body) => writeFileSync(join(root, rel), body);
/** `docs/plan/*` KHÔNG phải từ điển — đây là nơi đặt các chuỗi cần được PHÁN trong test. */
const plan = (root, body) => md(root, "docs/plan/10_x.md", body);

// ── ① bóc chuỗi ───────────────────────────────────────────────────────────────
test("bóc: có phân cách ⇒ đúng biên KỂ CẢ khi có dấu cách; trần ⇒ undelimited", () => {
  const c = extractCandidates("xem `C:\\Program Files\\App\\x.exe` và C:\\Program Files\\App\\y.exe rồi", { linkTargets: true });
  const del = c.find((x) => x.delimited);
  const bare = c.find((x) => !x.delimited);
  assert.equal(del?.text, "C:\\Program Files\\App\\x.exe", "chuỗi trong backtick phải giữ trọn dấu cách");
  assert.ok(bare && bare.text.startsWith("C:\\Program") && !bare.text.includes(" "), "chuỗi trần bị cắt ở dấu cách — nên KHÔNG được phán");
  const j = { root: "D:\\r", roots: { declared: ["D:\\r"], present: ["D:\\r"] } };
  assert.deepEqual(classify(bare, "D:\\r\\a.md", j), { kind: "unresolved", reason: "undelimited" });
});

test("bóc: escape · placeholder · registry/scheme đi thẳng vào KHÔNG KẾT LUẬN với lý do đúng", () => {
  const j = { root: "D:\\r", roots: { declared: ["D:\\r"], present: ["D:\\r"] } };
  const k = (s) => classify({ text: s, delimited: true }, "D:\\r\\a.md", j);
  assert.deepEqual(k("d:\\n"), { kind: "unresolved", reason: "escape" }, "d:\\n là escape trong f-string, không phải ổ D");
  assert.deepEqual(k("D:\\r\\<PHÒNG>\\x.md"), { kind: "unresolved", reason: "placeholder" });
  assert.deepEqual(k("D:\\r\\NN_ten.md"), { kind: "unresolved", reason: "placeholder" });
  assert.deepEqual(k("HKLM:\\Software\\Zemory"), { kind: "unresolved", reason: "not-a-path" });
  assert.deepEqual(k("file-service://abc"), { kind: "unresolved", reason: "not-a-path" });
  assert.deepEqual(k(".go/.java/.sh"), { kind: "unresolved", reason: "shape-ambiguous" }, "toàn đoạn bắt đầu bằng dấu chấm = danh sách đuôi");
});

// ── ② roots ───────────────────────────────────────────────────────────────────
test("roots: ngoài root ⇒ outside-roots · root vắng (CỤC BỘ) ⇒ root-absent · khoá vắng ⇒ roots = gốc repo", (t) => {
  const root = repo(t);
  const absentLocal = join(root, "..", `zemory-absent-${process.pid}`); // cùng ổ, chắc chắn không tồn tại, KHÔNG đụng ổ mạng
  plan(root, [
    "# p",
    "xem `E:\\Apps\\Server\\bin` (máy khác)",
    `và \`${join(absentLocal, "x.md")}\` (root khai nhưng không có)`,
    "và `backend/src/real.ts` (có thật)",
    "và `backend/src/gone.ts` (chết thật)",
  ].join("\n"));
  const r1 = pathsCheck(ctxOf(root));
  assert.deepEqual(r1.roots.declared, [root], "khoá vắng ⇒ root duy nhất là gốc repo");
  assert.equal(r1.unresolved.filter((h) => h.reason === "outside-roots").length, 2, "E:\\ và root-lạ đều ngoài root");
  assert.deepEqual(r1.dead.map((h) => h.text), ["backend/src/gone.ts"]);

  const r2 = pathsCheck(ctxOf(root, { roots: [root, absentLocal] }));
  assert.equal(r2.roots.absent.length, 1);
  assert.equal(r2.unresolved.filter((h) => h.reason === "root-absent").length, 1, "dưới root vắng ⇒ không kết luận, KHÔNG dead");
  assert.equal(r2.dead.length, 1, "vế chết thật vẫn chết");
});

test("ca ÂM: đường CÓ THẬT với dấu cách trong backtick ⇒ 0 dead · `~/` nở về home · `%VAR%` là placeholder (luật 7 skill audit)", (t) => {
  const root = repo(t);
  plan(root, `# p\nmở \`${join(root, "dir with space", "ok.txt")}\` và \`dir with space/ok.txt\`\n`);
  const r = pathsCheck(ctxOf(root));
  assert.equal(r.dead.length, 0, JSON.stringify(r.dead));
  // `~` qua classify trực tiếp — KHÔNG khai home làm root: pathsCheck sẽ ĐI BỘ cả home (AppData, OneDrive…),
  // và đó chính là thứ làm lượt test đầu chạy quá 300 s. Root là cây project, không phải home.
  const home = homedir();
  const j = { root, roots: { declared: [root, home], present: [root, home] } };
  assert.deepEqual(classify({ text: "~/", delimited: true }, join(root, "a.md"), j), { kind: "ok" }, "`~/` phải nở về home rồi thấy nó tồn tại");
  assert.deepEqual(classify({ text: "%APPDATA%\\Claude\\x.json", delimited: true }, join(root, "a.md"), j), { kind: "unresolved", reason: "placeholder" });
  assert.deepEqual(classify({ text: "$HOME/.zemory/x", delimited: true }, join(root, "a.md"), j), { kind: "unresolved", reason: "placeholder" });
});

// ── ③ ba rổ ───────────────────────────────────────────────────────────────────
test("rổ: file archive/attic/06_CHANGES/có-ngày và DÒNG có ngày/🔄 ⇒ lịch sử, không dead", (t) => {
  const root = repo(t);
  md(root, "docs/agent/archive/05_TODO.md", "`backend/src/old1.ts`\n");
  md(root, "docs/agent/06_CHANGES.md", "# c\n`backend/src/old2.ts`\n");
  md(root, "docs/agent/note-2026-07-01.md", "`backend/src/old3.ts`\n");
  plan(root, [
    "# p",
    "kho từng ở `backend/src/old4.ts` (đo 2026-07-29)",
    "> 🔄 Supersede — trước là `backend/src/old5.ts`",
    "chỉ dẫn SỐNG: mở `backend/src/old6.ts`",
  ].join("\n"));
  const r = pathsCheck(ctxOf(root));
  assert.deepEqual(r.dead.map((h) => h.text), ["backend/src/old6.ts"], "đúng MỘT chỗ chết thật");
  assert.equal(r.history.length, 5, JSON.stringify(r.history.map((h) => h.text)));
  assert.ok(isHistoryFile("attic/x/y.md") && isHistoryFile("docs/plan/13_graph_2026-08-01.md"));
  assert.ok(!isHistoryLine("làm từng bước, sửa code cũ"), "từ tiếng Việt KHÔNG được coi là dấu lịch sử (báo oan ngược chiều)");
});

test("rổ: file TỪ ĐIỂN (01–04 · docs_template · skills) ⇒ chuỗi tương đối là `dictionary`, tuyệt đối vẫn bị phán", (t) => {
  const root = repo(t);
  md(root, "docs/agent/03_STRUCTURE.md", "# s\n│   ├── `backend/src/api/` [opt]\n`backend/src/nothere/`\n");
  mkdirSync(join(root, "docs_template", "05_app", "agent"), { recursive: true });
  md(root, "docs_template/05_app/agent/02_RULES.md", `# r\n\`backend/src/gone.ts\` và \`${join(root, "backend", "src", "gone-abs.ts")}\`\n`);
  const r = pathsCheck(ctxOf(root));
  assert.equal(r.dead.length, 1, JSON.stringify(r.dead));
  assert.ok(r.dead[0].text.endsWith("gone-abs.ts"), "chuỗi TUYỆT ĐỐI trong template vẫn bị phán — đó là mùi thật");
  assert.ok(r.unresolved.filter((h) => h.reason === "dictionary").length >= 3);
  assert.ok(isDictionaryFile("docs/agent/04_SKILLS.md") && isDictionaryFile(".claude/skills/audit/SKILL.md"));
  assert.ok(isDictionaryFile("AGENTS.md"), "AGENTS.md là router chuẩn ship từ template — nêu slot có SAU (Dept_IC: 2 báo oan đều từ đây)");
  assert.ok(!isDictionaryFile("docs/agent/05_TODO.md") && !isDictionaryFile("docs/plan/08_x.md"), "sổ và spec KHÔNG phải từ điển — chúng trỏ thật");
});

test("rổ: kiểu viết tắt `memory/share.ts` khớp ĐUÔI file có thật ⇒ ok; file đã DỜI ⇒ vẫn dead", (t) => {
  const root = repo(t);
  plan(root, "# p\nsửa `memory/share.ts` · và `backend/src/settings.ts` (đã dời vào config/)\n");
  mkdirSync(join(root, "backend", "src", "config"), { recursive: true });
  writeFileSync(join(root, "backend", "src", "config", "settings.ts"), "x");
  const r = pathsCheck(ctxOf(root));
  assert.deepEqual(r.dead.map((h) => h.text), ["backend/src/settings.ts"], "khớp đuôi KHÔNG được cứu file đã dời — đuôi `src/settings.ts` không còn");
});

test("rổ: chuỗi tương đối MƠ HỒ (vi/en · 16/9 · a/b không đuôi) không bị phán; lockfile không được quét", (t) => {
  const root = repo(t);
  // `backend/docs/` = gạch chéo nghĩa "HOẶC" trong văn xuôi (plan/09:52 thật: "KHÔNG backend/frontend/") —
  // cả hai đoạn đều là thư mục gốc có thật ⇒ mơ hồ, không phải đường lồng nhau đã chết.
  plan(root, "# p\nsong ngữ `vi/en` · tỉ lệ `16/9` · thư mục `docs/agent/` · KHÔNG `backend/docs/`\n");
  md(root, "package-lock.json", JSON.stringify({ packages: { "node_modules/ghost-pkg/lib/x.js": {} } }));
  const r = pathsCheck(ctxOf(root));
  assert.equal(r.dead.length, 0, JSON.stringify(r.dead));
  assert.ok(r.unresolved.filter((h) => h.reason === "shape-ambiguous").length >= 2, "vi/en và backend/docs/ đều phải mơ hồ");
  assert.ok(r.unresolved.some((h) => h.text === "backend/docs/" && h.reason === "shape-ambiguous"), "gạch chéo-nghĩa-hoặc phải là mơ hồ, không dead");
  assert.ok(!r.unresolved.some((h) => h.file === "package-lock.json") && !r.dead.some((h) => h.file === "package-lock.json"));
});

// ── validate: hợp đồng mức info ──────────────────────────────────────────────
test("validate(): đúng MỘT issue `paths:` và nó ở mức info — kể cả khi có đường chết", (t) => {
  const root = repo(t);
  plan(root, "# p\nmở `backend/src/gone.ts`\n");
  const rep = validate(ctxOf(root));
  const mine = rep.issues.filter((i) => i.msg.startsWith("paths:"));
  assert.equal(mine.length, 1, "đúng một dòng");
  assert.equal(mine[0].level, "info", "mức khác info là pill Tính năng ⚠ trên mọi repo — hợp đồng bị phá");
  assert.equal(rep.paths?.dead.length, 1);
  // ok của validate KHÔNG phụ thuộc phép kiểm này.
  assert.equal(rep.ok, !rep.issues.some((i) => i.level === "error"));
});

// ── CLI: dispatch · help · --gate chỉ đỏ vì dead ─────────────────────────────
test("CLI: `paths check --strict` exit≠0 khi có dead tuyệt đối; exit 0 khi CHỈ có lịch sử; help có lệnh", (t) => {
  // `--strict` = cổng theo CHẾT tuyệt đối (ý gốc của ca này). `--gate` nay theo MỚI CHẾT — ca riêng bên dưới.
  // Cô lập trạng thái vào thư mục tạm: thiếu dòng này, ca test ghi root tạm vào data/paths-state.json THẬT.
  const env = { ...process.env, GLOBAL_MEMORY_DB: join(tempDir(t, "zemory-pdata-"), "global_memory.db") };
  const root = repo(t);
  plan(root, "# p\nmở `backend/src/gone.ts`\n");
  const red = spawnSync(process.execPath, [CLI, "paths", "check", "--strict", "--json"], { cwd: root, encoding: "utf8", env });
  assert.equal(red.status, 1, red.stdout.slice(0, 300));
  const j = JSON.parse(red.stdout);
  assert.equal(j.dead.length, 1);

  const root2 = repo(t);
  md(root2, "docs/agent/06_CHANGES.md", "# c\n`backend/src/old.ts`\n");
  const green = spawnSync(process.execPath, [CLI, "paths", "check", "--strict", "--json"], { cwd: root2, encoding: "utf8", env });
  assert.equal(green.status, 0, green.stdout.slice(0, 300));
  assert.equal(JSON.parse(green.stdout).history.length, 1);

  const help = spawnSync(process.execPath, [CLI, "help"], { encoding: "utf8" });
  assert.match(help.stdout, /^\s+paths\s+paths check/m, "help phải liệt kê lệnh mới (cổng help-đủ-lệnh)");
});

// ── MONITOR: baseline + MỚI CHẾT dính (plan/21 §2.3) — thứ duy nhất được đổi màu ───────
test("monitor: lần đầu = baseline (0 mới) · file mất SAU baseline ⇒ 1 mới chết · DÍNH qua lượt sau · hồi lại ⇒ 0", (t) => {
  const root = repo(t);
  const state = join(tempDir(t, "zemory-pstate-"), "paths-state.json");
  // Một đường chết SẴN (văn xuôi/di sản) và một đường đang SỐNG mà lát nữa sẽ mất.
  plan(root, "# p\ndi sản: `backend/src/gone-forever.ts` · đang sống: `backend/src/real.ts`\n");
  const r1 = monitorPaths(ctxOf(root), { stateFile: state });
  assert.equal(r1.monitor.baselined, true);
  assert.equal(r1.monitor.newlyDead.length, 0, "baseline không được báo gì — chết sẵn là di sản");
  assert.equal(r1.dead.length, 1, "rổ CHẾT tuyệt đối vẫn đếm đủ");
  assert.ok(loadPathsState(state).projects && Object.keys(loadPathsState(state).projects).length === 1, "trạng thái phải được LƯU");

  rmSync(join(root, "backend", "src", "real.ts")); // ← đổi tên/dời folder trong đời thật
  const r2 = monitorPaths(ctxOf(root), { stateFile: state });
  assert.equal(r2.monitor.baselined, false);
  assert.deepEqual(r2.monitor.newlyDead.map((h) => h.text), ["backend/src/real.ts"], "đúng MỘT đường mới chết, di sản không lẫn vào");

  const r3 = monitorPaths(ctxOf(root), { stateFile: state });
  assert.equal(r3.monitor.newlyDead.length, 1, "DÍNH: chưa sửa thì lượt sau vẫn báo, không được loé một lần rồi tắt");

  writeFileSync(join(root, "backend", "src", "real.ts"), "back");
  const r4 = monitorPaths(ctxOf(root), { stateFile: state });
  assert.equal(r4.monitor.newlyDead.length, 0, "hồi lại là hết báo");
});

test("monitor: trạng thái TỰ DỌN entry của root không còn trên đĩa (data/ là protected — không ai phải xoá tay)", (t) => {
  const root = repo(t);
  const state = join(tempDir(t, "zemory-pstate-"), "paths-state.json");
  const ghost = join(root, "..", `zemory-ghost-${process.pid}`); // root không tồn tại
  writeFileSync(state, JSON.stringify({ version: 1, projects: { [ghost.toLowerCase()]: { baselineAt: "x", baseline: [], lastAt: "x", lastDead: [], firstSeen: {} } } }));
  monitorPaths(ctxOf(root), { stateFile: state });
  const keys = Object.keys(loadPathsState(state).projects);
  assert.equal(keys.length, 1, `chỉ còn repo thật, entry ma phải rơi — thấy ${keys.join(" | ")}`);
});

test("REPO CÓ GIT THẬT: file đổi tên trên đĩa còn trong index ⇒ vẫn phải là MỚI CHẾT (bug bắt được khi thử thật)", (t) => {
  // Mọi fixture trên đây KHÔNG có git ⇒ đi nhánh đi-bộ-cây, nên nhánh production (`git ls-files`) chưa từng
  // được thử — và đó đúng là nhánh có bug: index liệt file đã mất khỏi đĩa, khớp đuôi thấy nó ⇒ `ok`.
  // Thử thật 2026-09-09 trên zemory: đổi tên file mà `newlyDead = 0`. Ca này giữ nhánh git có cổng.
  const root = repo(t);
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "fixture");
  assert.match(git("ls-files").stdout, /backend\/src\/real\.ts/, "tiền đề: file nằm trong index");
  const state = join(tempDir(t, "zemory-pstate-"), "paths-state.json");
  plan(root, "# p\n`backend/src/real.ts`\n");
  monitorPaths(ctxOf(root), { stateFile: state }); // baseline (plan chưa commit — nhưng paths.ts đi bộ? KHÔNG: repo có git ⇒ ls-files)
  // plan/10_x.md chưa được add ⇒ không nằm trong `git ls-files` ⇒ phải add để nó được quét.
  git("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
  monitorPaths(ctxOf(root), { stateFile: state, resetBaseline: true });
  rmSync(join(root, "backend", "src", "real.ts")); // đổi tên/xoá trên đĩa, index vẫn còn
  assert.match(git("ls-files").stdout, /backend\/src\/real\.ts/, "tiền đề: index VẪN liệt file đã mất");
  const r = monitorPaths(ctxOf(root), { stateFile: state });
  assert.deepEqual(r.monitor.newlyDead.map((h) => h.text), ["backend/src/real.ts"], "index nói còn, đĩa nói mất ⇒ đĩa thắng");
});

test("monitor: `--reset-baseline` nhận hết cái đang chết làm di sản ⇒ 0 mới", (t) => {
  const root = repo(t);
  const state = join(tempDir(t, "zemory-pstate-"), "paths-state.json");
  plan(root, "# p\n`backend/src/real.ts`\n");
  monitorPaths(ctxOf(root), { stateFile: state });
  rmSync(join(root, "backend", "src", "real.ts"));
  assert.equal(monitorPaths(ctxOf(root), { stateFile: state }).monitor.newlyDead.length, 1);
  assert.equal(monitorPaths(ctxOf(root), { stateFile: state, resetBaseline: true }).monitor.newlyDead.length, 0);
});

test("CLI: `paths check --gate` đỏ theo MỚI chết, `--strict` đỏ theo mọi chết; `paths sweep --root` quét nhiều repo, không bao giờ exit≠0", (t) => {
  // Trạng thái đi qua GLOBAL_MEMORY_DB của tiến trình con ⇒ trỏ vào thư mục tạm, KHÔNG đụng data/ thật.
  const dataDir = tempDir(t, "zemory-pdata-");
  const env = { ...process.env, GLOBAL_MEMORY_DB: join(dataDir, "global_memory.db") };
  const root = repo(t);
  plan(root, "# p\n`backend/src/real.ts` · di sản `backend/src/never.ts`\n");
  const run = (...a) => spawnSync(process.execPath, [CLI, "paths", ...a], { cwd: root, encoding: "utf8", env });
  assert.equal(run("check", "--gate", "--json").status, 0, "lượt baseline: --gate không đỏ dù có 1 chết sẵn");
  assert.equal(run("check", "--strict", "--json").status, 1, "--strict thì đỏ vì có chết tuyệt đối");
  rmSync(join(root, "backend", "src", "real.ts"));
  const red = run("check", "--gate", "--json");
  assert.equal(red.status, 1, "sau khi một đường sống chết đi, --gate phải đỏ");
  assert.equal(JSON.parse(red.stdout).monitor.newlyDead.length, 1);

  const root2 = repo(t);
  const sw = spawnSync(process.execPath, [CLI, "paths", "sweep", "--root", root, "--root", root2, "--json"], { encoding: "utf8", env });
  assert.equal(sw.status, 0, "sweep là theo dõi — không bao giờ đỏ");
  const rows = JSON.parse(sw.stdout);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((x) => x.root === root).newlyDead, 1);
  assert.equal(rows.find((x) => x.root === root2).baselined, true, "repo chưa có baseline thì sweep ghi baseline cho nó");
});

test("check 'paths' (hàng CHÍNH THỨC): baseline ⇒ on · có mới chết ⇒ warn · ok luôn true (không phải lỗi hệ)", async (t) => {
  const dataDir = tempDir(t, "zemory-pdata-");
  const prev = process.env.GLOBAL_MEMORY_DB;
  process.env.GLOBAL_MEMORY_DB = join(dataDir, "global_memory.db");
  try {
    const { runCheck } = await import(`../../dist/checks.js?t=${Date.now()}`);
    const root = repo(t);
    plan(root, "# p\n`backend/src/real.ts`\n");
    const c1 = await runCheck("paths", root);
    assert.equal(c1.state, "on");
    assert.equal(c1.ok, true);
    rmSync(join(root, "backend", "src", "real.ts"));
    const c2 = await runCheck("paths", root);
    assert.equal(c2.state, "warn", "một đường vừa chết ⇒ pill Warning");
    assert.equal(c2.ok, true, "warn nhưng KHÔNG off — phép kiểm chạy được, chỉ là có mục ruỗng");
    assert.match(c2.detail, /1 (mới chết|newly dead)/);
  } finally {
    if (prev === undefined) delete process.env.GLOBAL_MEMORY_DB;
    else process.env.GLOBAL_MEMORY_DB = prev;
  }
});

test("FE: hàng `paths` nằm ở HARNESS (DOCS), là kind check, và có trong danh sách SYS_CHECKS", async () => {
  const { readFileSync } = await import("node:fs");
  const sys = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  assert.match(sys, /\{k:'paths',grp:'f\.grpHarness',n:'f\.paths',kind:'check',feat:'paths'/, "hàng chính thức phải là check trong nhóm harness");
  assert.match(sys, /SYS_CHECKS=\['memory','validate','grill','paths'\]/, "nút Kiểm lại tất cả + nhịp tự kiểm phải bao gồm paths");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["f.paths", "f.doc.paths"]) assert.equal((chrome.match(new RegExp(`'${k.replace(".", "\\.")}':`, "g")) || []).length, 2, `${k} phải có ở CẢ HAI từ điển`);
});
