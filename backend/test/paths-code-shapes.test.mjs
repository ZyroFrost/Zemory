// `paths check` TRONG CODE — năm hình dạng bị đọc nhầm thành "đường chết" (đợt sửa đường chết 2026-10-07: 16 dòng ở
// Dept_OPS · SasinFlow · SasinTask không về 0 được bằng sửa docs, vì chúng không phải con trỏ hỏng):
//   ① biểu thức sed `s/^x=0$/x=1/` · ② chuỗi ghép sau một BIẾN (`Join-Path $Root "X\…"`) · ③ lệnh trong `jobs.yaml`
//   giải theo `cwd:` của CHÍNH job đó (khoá `cwd` đứng SAU `command`) · ④ tệp sinh của Power BI (`*.Report/definition/`)
//   · ⑤ dòng chỉ KIỂM file có không (`if exist …`). Và repo anh em gọi theo tên thư mục (`SasinFlow/…`).
// Nửa sau là ca ÂM: cùng các hình dạng đó mà đích THẬT SỰ mất thì vẫn phải chết — luật miễn không được nuốt rot thật.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isExistenceTest, isSubstitution, isVarJoined, pathsCheck, yamlItemCwds } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const parent = tempDir(t, "zemory-pcs-");
  const root = join(parent, "RepoA");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "bin"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) writeFileSync(join(root, "docs", "agent", `${f}.md`), `# ${f}\n`);
  // a sibling repo and a job workdir outside RepoA, both real
  mkdirSync(join(parent, "SiblingB", "scripts"), { recursive: true });
  writeFileSync(join(parent, "SiblingB", "scripts", "watch.ps1"), "#\n");
  mkdirSync(join(parent, "Work", "scripts"), { recursive: true });
  writeFileSync(join(parent, "Work", "scripts", "run.py"), "#\n");
  return { root, parent };
}
const ctxOf = (root) => ({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: { docs: "docs/agent", adapters: {}, thresholds: {} }, log() {} });
const deadTexts = (root) => pathsCheck(ctxOf(root)).dead.map((h) => `${h.file}:${h.text}`);

test("unit: sed substitution · var-joined argument · existence test", () => {
  assert.ok(isSubstitution("s/^SASINFLOW_MIRROR_SQL=0$/SASINFLOW_MIRROR_SQL=1/"));
  assert.ok(isSubstitution("s/^subject=//"));
  assert.ok(isSubstitution("s|a|b|g"));
  assert.ok(!isSubstitution("scripts/run/x.py"), "đường thật bắt đầu bằng s không phải sed");
  assert.ok(isVarJoined(`$p = Join-Path $Root "SasinTask\\backend\\x.ps1"`, "SasinTask\\backend\\x.ps1"));
  assert.ok(isVarJoined(`Join-Path $env:SystemRoot 'System32\\ie4uinit.exe'`, "System32\\ie4uinit.exe"));
  assert.ok(isVarJoined(`p = os.path.join(base, 'data/x.csv')`, "data/x.csv"));
  assert.ok(!isVarJoined(`Copy-Item "docs/x.md" $dest`, "docs/x.md"), "biến đứng SAU không làm đổi gốc");
  assert.ok(isExistenceTest(`if exist "%~dp0..\\run_config.cmd" call "%~dp0..\\run_config.cmd"`, "%~dp0..\\run_config.cmd"));
  assert.ok(isExistenceTest(`if (Test-Path 'config/local.json') { }`, "config/local.json"));
  assert.ok(!isExistenceTest(`call "config/local.cmd"`, "config/local.cmd"));
});

test("unit: a YAML item's cwd applies to the whole item, even when `cwd:` comes after `command:`", () => {
  const lines = [
    "jobs:",
    "  - id: a",
    '    command: ["python", "scripts/run.py"]',
    '    cwd: "D:/w/Work"',
    "  - id: b",
    '    command: ["x"]',
  ];
  const c = yamlItemCwds(lines, "D:/r/config");
  assert.equal(c[2], "D:/w/Work", "dòng command đứng TRƯỚC cwd vẫn nhận cwd");
  assert.equal(c[5], undefined, "job không khai cwd ⇒ không có gốc phụ");
});

test("the five measured shapes are no longer dead, end to end", (t) => {
  const { root, parent } = repo(t);
  const work = join(parent, "Work").replace(/\\/g, "/");
  writeFileSync(join(root, "bin", "setup.sh"), "sed -i 's/^MIRROR_SQL=0$/MIRROR_SQL=1/' x.env\n");
  writeFileSync(join(root, "bin", "update.ps1"), '$p = Join-Path $Root "OtherRepo\\backend\\gone.ps1"\n');
  writeFileSync(join(root, "config", "jobs.yaml"), `jobs:\n  - id: a\n    command: ["python", "scripts/run.py"]\n    cwd: "${work}"\n`);
  mkdirSync(join(root, "reports", "X.Report", "definition"), { recursive: true });
  writeFileSync(join(root, "reports", "X.Report", "definition", "visual.json"), '{ "queryRef": "Grow_Revenue_Forcast/Re.LM" }\n');
  writeFileSync(join(root, "bin", "run.cmd"), 'if exist "%~dp0..\\run_config.cmd" call "%~dp0..\\run_config.cmd"\n');
  writeFileSync(join(root, "bin", "watch.ps1"), "# runs SiblingB/scripts/watch.ps1 on the VM\n$x = 'SiblingB/scripts/watch.ps1'\n");
  assert.deepEqual(deadTexts(root), []);
});

test("NEGATIVE: the same shapes with a target that is REALLY gone stay dead", (t) => {
  const { root, parent } = repo(t);
  const work = join(parent, "Work").replace(/\\/g, "/");
  // job cwd exists but the script under it does not (the real SasinTask `excel_loader` case)
  writeFileSync(join(root, "config", "jobs.yaml"), `jobs:\n  - id: a\n    command: ["python", "pipelines/gone/load.py"]\n    cwd: "${work}"\n`);
  // a plain call (not an existence test) of a missing file
  writeFileSync(join(root, "bin", "run.cmd"), 'call "config/missing.cmd"\n');
  // sibling-looking path that does not exist next door either
  writeFileSync(join(root, "bin", "watch.ps1"), "$x = 'SiblingB/scripts/nothere.ps1'\n");
  const dead = deadTexts(root);
  assert.ok(dead.some((d) => d.includes("pipelines/gone/load.py")), "script mất dưới cwd của job ⇒ vẫn chết: " + dead.join(" | "));
  assert.ok(dead.some((d) => d.includes("config/missing.cmd")), "gọi thẳng file mất ⇒ vẫn chết");
  assert.ok(dead.some((d) => d.includes("SiblingB/scripts/nothere.ps1")), "repo anh em mà file không có ⇒ vẫn chết");
});
