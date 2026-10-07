// CỔNG CHO LUẬT (user 2026-10-07: "các bộ luật giờ cũng nên có cổng kiểm chứ agent quên quài"). Bảng rà 60 luật xếp
// các luật dưới đây vào lớp "kiểm được bằng máy mà CHƯA có cổng"; file này là cổng của chúng.
//   ① HP điều 3 — không xoá/sửa tin gốc: chỗ code xoá/sửa `messages`/`sessions` chỉ được nằm ở các chỗ ĐÃ DUYỆT (ratchet).
//   ② 02 §Ngôn ngữ — output CLI tiếng Anh: số dòng `console.*` mang chữ Việt không được TĂNG (ratchet).
//   ③ 02 §Guardrail — guard phải được CẮM đủ tool: `guardMatcherGaps` (ca thật: repo này thiếu PowerShell + MultiEdit).
//   ④ 02 §Changelog — Supersede phải nêu ĐÚNG khoá của một entry có thật: `danglingSupersedes`.
//   ⑤ HP §Sửa đổi — chỉ user sửa hiến pháp: marker của repo này khai `01_CONSTITUTION.md` là `protected`.
//   ⑥ `validate` nằm trong `npm run check` — trước đây mọi luật nó soi chỉ chạy khi có người gọi tay.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { GUARD_MATCHER, guardMatcherGaps } from "../../dist/docs/guard-gen.js";
import { danglingSupersedes } from "../../dist/docs/validate.js";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
function tsFiles(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) tsFiles(p, out);
    else if (n.endsWith(".ts")) out.push(p);
  }
  return out;
}
const rel = (p) => relative(SRC, p).replace(/\\/g, "/");
function countBy(re) {
  const out = {};
  for (const f of tsFiles(SRC)) {
    const n = (readFileSync(f, "utf8").match(re) ?? []).length;
    if (n) out[rel(f)] = n;
  }
  return out;
}
function ratchet(found, baseline, what) {
  const grew = Object.entries(found).filter(([f, n]) => n > (baseline[f] ?? 0)).map(([f, n]) => `${f}: ${n} (baseline ${baseline[f] ?? 0})`);
  assert.deepEqual(grew, [], `${what} GREW — review it, then (only if it is approved) raise the baseline here:\n  ${grew.join("\n  ")}`);
}

// ① Approved sites, each one a deliberate path: ingest whole-replace + empty-session cleanup · share's lane filter on a
// THROWAWAY snapshot + empty sessions after merge · privacy = the user's own `forget` / `redact` commands.
const SOURCE_WRITES = {
  "memory/ingest.ts": 5,
  "memory/share.ts": 3,
  "memory/privacy.ts": 3,
};
test("① HP 3: code that deletes/rewrites original messages or sessions stays at the approved sites", () => {
  ratchet(countBy(/\b(DELETE\s+FROM\s+(main\.)?(messages|sessions)|UPDATE\s+(main\.)?messages)\b/gi), SOURCE_WRITES, "deletes/rewrites of original rows");
});

// ② Lines measured 2026-10-07 (the 259-line sweep finished 2026-10-05); a new Vietnamese output line is a regression.
const VI_OUTPUT = {
  "cli.ts": 1,
  "platform/window.ts": 3,
  "memory/share.ts": 6,
  "jobs/syncrun.ts": 1,
  "commands/harness.ts": 1,
  "commands/peers.ts": 1,
  "commands/memory.ts": 1,
};
test("② CLI output in English: console lines carrying Vietnamese letters do not grow", () => {
  ratchet(countBy(/console\.(log|error|warn)\([^)\n]*[À-ỹĐđ]/g), VI_OUTPUT, "Vietnamese output lines");
});

test("③ guard wiring: every tool of GUARD_MATCHER must reach guard.cjs (the measured zemory hole)", () => {
  const wire = (matcher, args) =>
    JSON.stringify({ hooks: { PreToolUse: [{ matcher, hooks: [args ? { type: "command", command: "node", args: ["docs/hooks/guard.cjs"] } : { type: "command", command: "node docs/hooks/guard.cjs" }] }] } });
  assert.deepEqual(guardMatcherGaps(wire("Write|Edit|NotebookEdit|Read|Bash")), ["MultiEdit", "PowerShell"], "ca thật 07/10");
  assert.deepEqual(guardMatcherGaps(wire(GUARD_MATCHER)), []);
  assert.deepEqual(guardMatcherGaps(wire(GUARD_MATCHER, true)), [], "dạng command + args (Dept_OPS) vẫn là đã cắm");
  assert.equal(guardMatcherGaps(JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ command: "node other.cjs" }] }] } })), null, "không nhóm nào chạy guard ⇒ chưa cắm");
  assert.equal(guardMatcherGaps(null), null);
  // and THIS repo is wired in full
  assert.deepEqual(guardMatcherGaps(readFileSync(join(ROOT, ".claude", "settings.json"), "utf8")), [], "settings.json của chính repo này");
});

test("③b wireGuard: wires an unwired repo, widens a narrow matcher, keeps the repo's other hooks, is idempotent", async (t) => {
  const { wireGuard } = await import("../../dist/docs/guard-gen.js");
  const { tempDir } = await import("./helpers.mjs");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  // a repo with NO settings file (6 of 17 repos on 2026-10-07)
  const a = tempDir(t, "zemory-wire-a-");
  assert.equal(wireGuard(a, "docs/hooks/guard.cjs"), ".claude/settings.json (guard wired)");
  assert.deepEqual(guardMatcherGaps(readFileSync(join(a, ".claude", "settings.json"), "utf8")), []);
  assert.equal(wireGuard(a, "docs/hooks/guard.cjs"), null, "second run ⇒ nothing to do");
  // a repo with a narrow guard group + an unrelated hook (Dept_OPS shape)
  const b = tempDir(t, "zemory-wire-b-");
  mkdirSync(join(b, ".claude"), { recursive: true });
  const other = { matcher: "Bash|PowerShell", hooks: [{ type: "command", command: "node", args: ["docs/hooks/pbi-open-gate.cjs"] }] };
  writeFileSync(join(b, ".claude", "settings.json"), JSON.stringify({ env: { KEEP: "1" }, hooks: { PreToolUse: [{ matcher: "Write|Bash", hooks: [{ type: "command", command: "node", args: ["docs/hooks/guard.cjs"] }] }, other] } }, null, 2));
  assert.equal(wireGuard(b, "docs/hooks/guard.cjs"), ".claude/settings.json (guard matcher widened)");
  const after = JSON.parse(readFileSync(join(b, ".claude", "settings.json"), "utf8"));
  assert.equal(after.env.KEEP, "1", "unrelated settings kept");
  assert.equal(after.hooks.PreToolUse.length, 2, "no duplicate guard group");
  assert.deepEqual(after.hooks.PreToolUse[1], other, "the repo's own hook untouched");
  assert.equal(after.hooks.PreToolUse[0].matcher, GUARD_MATCHER);
});

test("④b a plan holds spec, not open work: open checkboxes in docs/plan are found (fences skipped)", async (t) => {
  const { planOpenItems } = await import("../../dist/docs/validate.js");
  const { tempDir } = await import("./helpers.mjs");
  const { writeFileSync } = await import("node:fs");
  const d = tempDir(t, "zemory-plan-");
  writeFileSync(join(d, "01_x.md"), ["# spec", "- [x] done", "- [ ] open", "```", "- [ ] inside a fence", "```", "- [~] doing"].join("\n"));
  assert.deepEqual(planOpenItems(d), ["01_x.md:3", "01_x.md:7"]);
  assert.deepEqual(planOpenItems(join(ROOT, "docs", "plan")), [], "this repo's plans carry no open work");
});

test("④ supersede clauses must name an existing entry key", () => {
  const log = ["## [2026-10-07b] — a", "> 🔄 **Supersede:** 2026-10-07b — ok", "## [2026-10-06] — b", "> 🔄 **Supersede:** thay [2026-09-01x] — gone", "> 🔄 **Supersede** the old way of doing it", "```", "> 🔄 **Supersede:** inside a fence", "```"].join("\n");
  assert.deepEqual(danglingSupersedes([log]), ["2026-09-01x", "no key"]);
});

test("⑤ the constitution is write-protected in this repo's marker", () => {
  const m = JSON.parse(readFileSync(join(ROOT, "docs", ".harness.json"), "utf8"));
  assert.ok((m.protected ?? []).includes("docs/agent/01_CONSTITUTION.md"), "HP §Sửa đổi: chỉ user sửa hiến pháp — guard phải chặn agent ghi vào nó");
});

test("⑦ doctor finds leftover `_scratch_*` / `.tmp_*` — untracked AND git-ignored", async (t) => {
  const { scratchLeftovers } = await import("../../dist/commands/harness.js");
  const { tempDir } = await import("./helpers.mjs");
  const { spawnSync } = await import("node:child_process");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const r = tempDir(t, "zemory-junk-");
  spawnSync("git", ["init", "-q"], { cwd: r });
  mkdirSync(join(r, "data"), { recursive: true });
  writeFileSync(join(r, ".gitignore"), "data/\n");
  writeFileSync(join(r, "_scratch_probe.py"), "x");
  writeFileSync(join(r, "data", ".tmp_big.bin"), "x"); // hidden by .gitignore — must still be found
  writeFileSync(join(r, "keep.txt"), "x");
  assert.deepEqual(scratchLeftovers(r).sort(), ["_scratch_probe.py", "data/.tmp_big.bin"]);
  assert.deepEqual(scratchLeftovers(null), []);
});

// 02 §Ngôn ngữ ①: no Vietnamese without diacritics anywhere; file names and identifiers are plain English ASCII.
// The audit's lang-scan measured 616 stripped lines / 28 files on 2026-09-12; the sweep left 0 — a gate keeps it at 0.
test("⑧ language: lang-scan finds 0 stripped-Vietnamese lines, 0 non-ASCII names, 0 non-ASCII identifiers", async () => {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [join(ROOT, ".claude", "skills", "audit", "scripts", "lang-scan.mjs"), ROOT], { encoding: "utf8", timeout: 240_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SCANNED\s+files=\d+/, "the probe must say what it scanned — a silent run is not a clean run");
  const count = (face) => Number(new RegExp(`=== ${face}: (\\d+) hits ===`).exec(r.stdout)?.[1] ?? NaN);
  assert.deepEqual({ names: count("names"), idents: count("idents"), noDiacritic: count("noDiacritic") }, { names: 0, idents: 0, noDiacritic: 0 }, r.stdout.slice(-1500));
});

test("⑥ `npm run check` runs validate", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.scripts.check, /npm run validate\b/);
  assert.match(pkg.scripts.validate, /cli\.js validate/);
});
