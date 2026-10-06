// GUARD LỚP ①: CHẶN LÀM VIỆC NGOÀI PROJECT (2026-10-06).
//
// Sự cố gốc (phiên `db-datawarehouse-15`): agent ở repo kho dữ liệu tạo DB + linked server, đổi
// `max server memory` trên SQL Server local, và ghi file ra một ổ ngoài repo. `02_RULES §Phạm vi project`
// đã cấm bằng CHỮ; không có chốt máy. Ba nhánh, MỘT cờ `.allow-outside`:
//   ① ghi ra đường TUYỆT ĐỐI ngoài repo · ② SQL bắt máy chủ ghi file · ③ SQL đổi cấu hình máy chủ
//   (+ máy chủ ngoài `allowedSqlServers` khi marker có khai).
//
// Nửa sau của file là ca ÂM — những lệnh PHẢI ĐƯỢC CHO QUA. Cổng chặn nhầm thì thành nhiễu, mà
// cổng nhiễu là cổng bị gỡ (luật 7, `.claude/skills/audit`).
//
// Toàn bộ chạy guard SINH THẬT trên REPO TẠM — không đụng `docs/hooks/` của repo đang làm việc
// (cùng lý do `guard-flag-retry`: `node --test` chạy song song, cờ thật làm đỏ file khác).

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { generateGuards } from "../../dist/docs/guard-gen.js";
import { tempDir } from "./helpers.mjs";

const WIN = process.platform === "win32";
// Một chỗ chắc chắn NGOÀI repo tạm, ngoài thư mục tạm của OS và ngoài ~/.claude.
const OUTDIR = WIN ? "C:/zemory-outside-probe" : "/opt/zemory-outside-probe";
const OUT = OUTDIR + "/a.txt";

// Ghép từ mảnh: chuỗi SQL nguyên vẹn trong lệnh agent gõ sẽ bị chính guard chặn.
const BACKUP = "BACK" + "UP DATABASE dw TO DISK = 'E:\\dw.bak'";
const RESTORE = "RESTO" + "RE DATABASE dw FROM DISK = 'E:\\dw.bak' WITH MOVE 'dw' TO 'E:\\dw.mdf'";
const CREATE_FILE = "CREATE DATA" + "BASE dw2 ON (NAME = dw2, FILENAME = 'E:\\dw2.mdf')";
const CONFIGURE = "EXEC sp_" + "configure 'max server memory', 4096; RECON" + "FIGURE";
const LINKED = "EXEC sp_" + "addlinkedserver 'OTHER'";
const CREATE_DB = "CREATE DATA" + "BASE dw3";

function repo(t, marker = {}) {
  const root = tempDir(t, "zemory-outside-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent", ...marker }));
  return { ...generateGuards(root), root };
}
// cwd = gốc repo tạm (xem chú thích `blocked` ở guard-flag-retry: cwd sai làm ca đường dẫn lọt oan).
const run = (r, tool_name, tool_input) =>
  spawnSync(process.execPath, [join(r.hooksDir, "guard.cjs")], {
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: "utf8",
    cwd: r.root,
  });
const sh = (r, command, tool = "Bash") => run(r, tool, { command }).status === 2;
const wr = (r, file_path, tool = "Write") => run(r, tool, { file_path, content: "x", old_string: "a", new_string: "b" }).status === 2;
const giveFlag = (r) => writeFileSync(join(r.hooksDir, ".allow-outside"), "user dong y (test)\n");

const collect = (r, cases, check) => cases.filter(([, c]) => !check(r, c)).map(([label]) => label);

// ── ① ghi ra ngoài ─────────────────────────────────────────────────────────────────

test("① the file tools: Write/Edit to an absolute path OUTSIDE the repo is blocked", (t) => {
  const r = repo(t);
  assert.ok(wr(r, OUT), "Write ra ngoài repo ⇒ chặn");
  assert.ok(wr(r, OUT, "Edit"), "Edit ra ngoài repo ⇒ chặn");
  assert.ok(wr(r, OUTDIR + "\\b.txt", "MultiEdit"), "MultiEdit, đường dấu \\ ⇒ chặn");
});

test("① shell redirection into an outside path is blocked", (t) => {
  const r = repo(t);
  assert.ok(sh(r, "echo x > " + OUT), "> ra ngoài ⇒ chặn");
  assert.ok(sh(r, "echo x >> '" + OUTDIR + "/log.txt'"), ">> có nháy ⇒ chặn");
});

test("① move/copy: an outside TARGET is blocked, and so is an outside SOURCE for mv-type", (t) => {
  const r = repo(t);
  const leaked = collect(
    r,
    [
      ["cp vào ngoài", "cp README.md " + OUT],
      ["Copy-Item vào ngoài", "Copy-Item README.md -Destination " + OUT],
      ["mv: nguồn ngoài", "mv " + OUT + " ./here.txt"],
      ["robocopy: đích ngoài (đối số 2)", "robocopy src " + OUTDIR + " /E"],
    ],
    sh,
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

test("① writer commands (mkdir · New-Item · Set-Content · Out-File · tee · touch) to an outside path are blocked", (t) => {
  const r = repo(t);
  const leaked = collect(
    r,
    [
      ["mkdir -p", "mkdir -p " + OUTDIR + "/dir"],
      ["New-Item -Path", "New-Item -ItemType Directory -Force -Path " + OUTDIR + "/dir"],
      ["New-Item -Path:x", "New-Item -Path:" + OUTDIR + "/dir -ItemType Directory"],
      ["Set-Content vị trí đầu", "Set-Content " + OUT + " -Value x"],
      ["Set-Content sau một switch", "Set-Content -NoNewline " + OUT + " x"],
      ["Set-Content đường có dấu cách", 'Set-Content "' + OUTDIR + '/with space/a.txt" x'],
      ["Out-File sau pipe", "'x' | Out-File -FilePath " + OUT],
      ["tee", "echo x | tee " + OUT],
      ["touch", "touch " + OUT],
    ],
    (rr, c) => sh(rr, c, "PowerShell"),
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

test("① Git Bash `/c/...` spelling is the same drive path (Windows)", { skip: !WIN }, (t) => {
  const r = repo(t);
  assert.ok(sh(r, "echo x > /c/zemory-outside-probe/a.txt"), "/c/… ⇒ C:/… ⇒ ngoài ⇒ chặn");
});

test("① interpreter payloads that write outside are blocked — inline and heredoc", (t) => {
  const r = repo(t);
  assert.ok(sh(r, `python -c "open('${OUT}', 'w').write('x')"`), "python -c ghi ra ngoài ⇒ chặn");
  assert.ok(sh(r, `node -e "require('fs').writeFileSync('${OUT}', 'x')"`), "node -e ghi ra ngoài ⇒ chặn");
  assert.ok(sh(r, `python - <<'EOF'\nopen('${OUT}', 'w').write('x')\nEOF`), "python heredoc ghi ra ngoài ⇒ chặn");
});

// ── ② SQL bắt máy chủ ghi file ─────────────────────────────────────────────────────

test("② SQL that makes the server write files is blocked (sqlcmd · Invoke-Sqlcmd · heredoc fed to python)", (t) => {
  const r = repo(t);
  const leaked = collect(
    r,
    [
      ["sqlcmd BACKUP TO DISK", `sqlcmd -Q "${BACKUP}"`],
      ["sqlcmd RESTORE FROM DISK + MOVE", `sqlcmd -Q "${RESTORE}"`],
      ["Invoke-Sqlcmd CREATE DATABASE FILENAME", `Invoke-Sqlcmd -Query "${CREATE_FILE}"`],
      ["python heredoc BACKUP", `python - <<'EOF'\ncur.execute("${BACKUP}")\nEOF`],
    ],
    sh,
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

// ── ③ đổi cấu hình máy chủ ──────────────────────────────────────────────────────────

test("③ SQL that changes the server configuration is blocked", (t) => {
  const r = repo(t);
  const leaked = collect(
    r,
    [
      ["sp_configure + RECONFIGURE", `sqlcmd -S localhost -Q "${CONFIGURE}"`],
      ["linked server", `Invoke-Sqlcmd -Query "${LINKED}"`],
      ["CREATE DATABASE qua python heredoc", `python - <<'EOF'\ncur.execute("${CREATE_DB}")\nEOF`],
      ["DROP DATABASE qua osql", `osql -Q "DROP DATA` + `BASE dw3"`],
    ],
    sh,
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

test("③ with `allowedSqlServers` declared, a server NOT on the list is blocked", (t) => {
  const r = repo(t, { allowedSqlServers: ["localhost"] });
  const leaked = collect(
    r,
    [
      ["sqlcmd -S x", `sqlcmd -S prod-db -Q "SELECT 1"`],
      ["sqlcmd -Sx dính liền + cổng", `sqlcmd -Sprod-db,1433 -Q "SELECT 1"`],
      ["Invoke-Sqlcmd -ServerInstance", `Invoke-Sqlcmd -ServerInstance prod-db -Query "SELECT 1"`],
      ["chuỗi kết nối Server=", `python -c "pyodbc.connect('DRIVER={x};Server=prod-db;Database=dw')"`],
      ["chuỗi kết nối Data Source=", `python -c "connect('Data Source=prod-db;Initial Catalog=dw')"`],
    ],
    sh,
  );
  assert.deepEqual(leaked, [], "lọt: " + leaked.join(", "));
});

// ── CA ÂM: phải cho qua ────────────────────────────────────────────────────────────

test("NEGATIVE: writes inside the repo pass (relative and absolute)", (t) => {
  const r = repo(t);
  assert.ok(!wr(r, join(r.root, "out", "a.txt")), "Write tuyệt đối TRONG repo ⇒ qua");
  assert.ok(!sh(r, "echo x > out/a.txt"), "> tương đối ⇒ qua");
  assert.ok(!sh(r, "mkdir -p build/x"), "mkdir tương đối ⇒ qua");
  assert.ok(!sh(r, "echo x > " + join(r.root, "a.txt").replace(/\\/g, "/")), "> tuyệt đối trong repo ⇒ qua");
});

test("NEGATIVE: the OS temp folder passes in BOTH 8.3 short and long spelling (scratchpads live there)", (t) => {
  const r = repo(t);
  const short = tmpdir();
  const long = realpathSync.native(short);
  // Trên máy này tmpdir() là tên 8.3 (`HUY~1.NGU`) — ca dài chỉ CHỨNG MINH được realpath khi hai bản khác nhau.
  if (short === long) t.diagnostic("tmpdir() đã là tên dài trên máy này — ca 8.3 không phân biệt được");
  for (const base of [short, long]) {
    assert.ok(!wr(r, join(base, "claude", "scratch-not-yet", "x.txt")), "Write vào tạm (" + base + ") ⇒ qua");
    assert.ok(!sh(r, "echo x > " + join(base, "z.txt").replace(/\\/g, "/")), "> vào tạm (" + base + ") ⇒ qua");
  }
  if (WIN) {
    const bash = long.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => "/" + d.toLowerCase());
    assert.ok(!sh(r, "echo x > " + bash + "/z.txt"), "Git Bash /c/… của thư mục tạm ⇒ qua");
  }
});

test("NEGATIVE: ~/.claude, /dev/null and /tmp pass", (t) => {
  const r = repo(t);
  assert.ok(!wr(r, join(homedir(), ".claude", "projects", "x", "memory", "m.md")), "~/.claude (tuyệt đối) ⇒ qua");
  assert.ok(!sh(r, "echo x > ~/.claude/notes.md"), "~/.claude qua dấu ~ ⇒ qua");
  assert.ok(!sh(r, "ls > /dev/null"), "> /dev/null ⇒ qua");
  assert.ok(!sh(r, "mkdir -p /tmp/zemory-x"), "/tmp ⇒ qua");
});

test("NEGATIVE: READING outside, and commands that only MENTION SQL words, pass", (t) => {
  const r = repo(t);
  const wrong = [
    ["cat file ngoài", "cat C:/x/y.sql"],
    ["cp TỪ ngoài VÀO repo", "cp " + OUT + " ./local.txt"],
    ["grep sp_configure", "grep -r sp_" + "configure ."],
    ["git commit nhắc BACKUP", `git commit -m "${BACKUP}"`],
    ["git log", "git log --oneline -5"],
    ["Set-Content: -Value không phải đường", "Set-Content -Path a.txt -Value /usr/bin/x"],
    // (`/MIR` thì nhánh xoá-hàng-loạt chặn — đúng, không phải việc của nhánh này)
    ["robocopy tương đối với switch", "robocopy src dst /E /XO"],
    ["copy của cmd với switch /Y", "copy a.txt b.txt /Y"],
    ["script NGOÀI repo chạy được (đọc, không ghi)", "python " + OUTDIR + "/job.py --save out.csv"],
    ["node -e có regex /…/", `node -e "fs.writeFileSync('a.txt', s.replace(/\\r/g, ''))"`],
  ].filter(([, c]) => sh(r, c)).map(([l]) => l);
  assert.deepEqual(wrong, [], "chặn nhầm: " + wrong.join(", "));
});

test("NEGATIVE: sqlcmd to an ALLOWED server with a plain SELECT passes (all spellings of local)", (t) => {
  const r = repo(t, { allowedSqlServers: ["localhost", "dw-test\\SQL2022"] });
  const wrong = [
    `sqlcmd -S localhost -Q "SELECT 1"`,
    `sqlcmd -S . -Q "SELECT 1"`,
    `sqlcmd -S "(local)" -Q "SELECT 1"`,
    `sqlcmd -S tcp:127.0.0.1,1433 -Q "SELECT 1"`,
    `sqlcmd -S DW-TEST\\sql2022 -Q "SELECT 1"`,
    `Invoke-Sqlcmd -ServerInstance . -Query "SELECT 1"`,
    `python -c "pyodbc.connect('Server=localhost;Database=dw')"`,
  ].filter((c) => sh(r, c));
  assert.deepEqual(wrong, [], "chặn nhầm: " + wrong.join(" | "));
  // Không khai danh sách ⇒ nhánh máy chủ KHÔNG áp.
  assert.ok(!sh(repo(t), `sqlcmd -S prod-db -Q "SELECT 1"`), "không khai allowedSqlServers ⇒ không soi máy chủ");
});

test("NEGATIVE: a marker `allowedRoots` entry is allowed", (t) => {
  const r = repo(t, { allowedRoots: [OUTDIR] });
  assert.ok(!wr(r, OUT), "Write vào allowedRoots ⇒ qua");
  assert.ok(!sh(r, "mkdir -p " + OUTDIR + "/dir"), "mkdir vào allowedRoots ⇒ qua");
  assert.ok(wr(r, "C:/zemory-other-probe/a.txt"), "chỗ khác vẫn chặn");
});

// ── CỜ ──────────────────────────────────────────────────────────────────────────────

test("FLAG: with `.allow-outside` the same command passes once; a different job is revoked", (t) => {
  const r = repo(t);
  const CMD = "echo x > " + OUT;
  assert.ok(sh(r, CMD), "không cờ ⇒ chặn");
  giveFlag(r);
  assert.ok(!sh(r, CMD), "có cờ ⇒ qua");
  assert.ok(sh(r, "echo y > " + OUTDIR + "/other.txt"), "việc khác mượn cờ ⇒ chặn");
  assert.ok(sh(r, CMD), "cờ đã bị thu hồi ⇒ lệnh cũ cũng phải xin lại");
});

test("FLAG: the same flag opens the file tools and the SQL branches (fingerprint = path / command)", (t) => {
  const r = repo(t);
  giveFlag(r);
  assert.ok(!wr(r, OUT), "Write ra ngoài có cờ ⇒ qua");
  const r2 = repo(t);
  giveFlag(r2);
  assert.ok(!sh(r2, `sqlcmd -Q "${CONFIGURE}"`), "đổi cấu hình máy chủ có cờ ⇒ qua");
});
