// Watch toggle for the dead-path feature (plan/21 §5.7, user 2026-09-10): OFF must make EVERY surface quiet — the
// Features row (Off, out of Health), the rail chip + Projects badge (/harness-updates carries no deadPaths), the daemon
// sweep (skipped). Default ON. The CLI is deliberately NOT gated (typing the command is intent).
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runInMemoryChild, tempDir } from "./helpers.mjs";

const SRC = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

function repo(t) {
  const root = tempDir(t, "zemory-watch-");
  for (const d of ["docs/agent/archive", "docs/plan", "backend/src", "data"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "backend", "src", "real.ts"), "export const x = 1;\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const n of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) writeFileSync(join(root, "docs", "agent", n + ".md"), "# " + n + "\n");
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  writeFileSync(join(root, "docs", "plan", "10_x.md"), "# p\n`backend/src/real.ts`\n");
  return root;
}

test("check 'paths': watch OFF ⇒ state off · ok true · KHÔNG chạy monitor (không ghi state); ON lại ⇒ on như cũ; mặc định là ON", (t) => {
  const root = repo(t);
  const steps = runInMemoryChild(root, `
    out.push({ step: "default", watch: S.getPathsWatch() });
    S.setPathsWatch(false);
    out.push({ step: "off", check: await runCheck("paths", process.env.Z_ROOT) });
    S.setPathsWatch(true);
    out.push({ step: "on", check: await runCheck("paths", process.env.Z_ROOT) });
  `);
  const byStep = Object.fromEntries(steps.map((s) => [s.step, s]));
  assert.equal(byStep.default.watch, true, "mặc định BẬT — không ai cài xong mà bị tắt sẵn");
  assert.equal(byStep.off.check.state, "off");
  assert.equal(byStep.off.check.ok, true, "tắt là lựa chọn, không phải lỗi hệ");
  assert.match(byStep.off.check.detail, /OFF|TẮT/);
  assert.equal(byStep.on.check.state, "on");
  assert.equal(existsSync(join(root, "data", "paths-state.json")), true, "bật lại ⇒ monitor chạy, baseline ghi");
  // Cô lập THẬT: cấu hình của kho thật không được đụng tới bởi ca này.
  assert.equal(existsSync(join(root, "data", "config.json")), true, "con phải ghi settings vào kho FIXTURE, không phải kho thật");
});

test("mọi bề mặt đều đi qua công tắc: scheduler bỏ sweep · /harness-updates không trả deadPaths · FE có nút + guard payload cũ · chữ 'sửa tay HOẶC giao A.I'", () => {
  const sched = SRC("backend/src/jobs/scheduler.ts");
  assert.match(sched, /if \(getPathsWatch\(\)\) \{\s*\n\s*await runStep\("paths", \["paths", "sweep"\]\);/, "daemon phải bỏ bước paths khi tắt");
  const ui = SRC("backend/src/ui.ts");
  assert.match(ui, /if \(getPathsWatch\(\)\) deadPaths = deadPathsSummary\(/, "chip + badge đọc deadPaths ⇒ tắt thì phải rỗng");
  assert.match(ui, /p === "\/set-paths-watch"/, "phải có endpoint gạt");
  assert.match(ui, /pathsWatch: getPathsWatch\(\),/, "/memory-status phải mang trạng thái để FE vẽ nút");
  const sys = SRC("frontend/scripts/system.js");
  assert.match(sys, /feat:'paths',watch:\{ep:'\/set-paths-watch',key:'pathsWatch'\}/, "hàng paths phải khai công tắc");
  assert.match(sys, /if\(f\.watch&&m\[f\.watch\.key\]===false\)return \{on:'dim'/, "tắt ⇒ hàng dim, ra khỏi Health");
  // Công tắc ở MÉP PHẢI hàng, panel chi tiết KHÔNG còn nút On/Off (user 2026-09-10) — hai nơi cùng gạt một thứ là hai nơi để lệch.
  assert.match(sys, /'<\/span>'\+sysSwitch\(f\)\+'<\/div>'/, "mỗi hàng phải nối switch vào cuối");
  assert.match(sys, /class="toggle sys-sw[^"]*" role="switch" aria-checked=/, "switch phải là .toggle có role/aria (nhãn máy đọc được)");
  assert.doesNotMatch(sys, /return '<button class="btn sm" data-sys-toggle=/, "panel chi tiết không còn nút On/Off cho toggle");
  assert.doesNotMatch(sys, /return '<button class="btn sm" data-sys-auto=/, "panel chi tiết không còn nút On/Off cho auto");
  assert.match(sys, /closest\('\.sys-sw'\)\)return;var li=/, "bấm switch không được chọn hàng");
  assert.match(sys, /paths-watch\/\.test\(ep\)\)Z\.flagsAt\.pathsWatch=Date\.now\(\)/, "cú gạt phải được đóng dấu để payload cũ không đè");
  assert.match(SRC("frontend/scripts/gm.js"), /\['hybrid','rerank','scope','pathsWatch'(,'[a-zA-Z]+')*\]/, "renderMem phải giữ giá trị local trong 90 s cho pathsWatch");
  const chrome = SRC("frontend/scripts/chrome.js");
  assert.match(chrome, /'fix\.noCand':'không có đích duy nhất — sửa tay hoặc giao A\.I sửa'/);
  assert.match(chrome, /'fix\.noCand':'no unique target — fix by hand or let the A\.I do it'/);
});
