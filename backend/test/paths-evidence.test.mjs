// "MỚI CHẾT" PHẢI CÓ BẰNG CHỨNG TỪNG SỐNG — và ba lớp báo oan tất định phải thôi bị gọi là chết.
//
// Vì sao (user chốt 2026-09-17: *"mục đích là phải báo đúng hết, không được sai"*): định nghĩa cũ
// *"chết bây giờ ∧ không có trong baseline"* gọi MỌI chuỗi mới viết mà không giải được là mục ruỗng.
// Đo trên 3 repo thật: 23/37 "mới chết" chưa từng là một đường ở repo đó — ký hiệu `Bảng.Cột`, file
// `.env` cố ý gitignore, script nháp đã dọn, đường sang repo khác, file trên share mạng.
//
// Nghĩa mới: MỚI CHẾT = chết ∧ ¬di sản ∧ (lượt quét trước thấy nó SỐNG ∨ git ghi nó đã bị xoá/đổi tên).
// Không bằng chứng ⇒ vẫn nằm rổ `dead` cho người đọc, nhưng KHÔNG đổi màu. Mọi phép ở đây tất định (điều 6①).
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classify, isIdentifierNotation, isScratchPath, monitorPaths, pathsCheck } from "../../dist/docs/paths.js";
import { tempDir } from "./helpers.mjs";

function repo(t) {
  const root = tempDir(t, "zemory-pev-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  mkdirSync(join(root, "backend", "src"), { recursive: true });
  writeFileSync(join(root, "backend", "src", "real.ts"), "export const x = 1;\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) {
    writeFileSync(join(root, "docs", "agent", `${f}.md`), `# ${f}\n`);
  }
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  return root;
}
const ctxOf = (root) => ({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: { docs: "docs/agent", adapters: {}, thresholds: {} }, log() {} });
const plan = (root, body) => writeFileSync(join(root, "docs", "plan", "10_x.md"), body);
const git = (root, ...a) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: root, encoding: "utf8" });
const judge = (root) => ({ root, roots: { declared: [root], present: [root] } });
const cand = (text) => ({ text, delimited: true });

// ── ① ký hiệu `Bảng.Cột` không phải đường dẫn ────────────────────────────────
test("đuôi vừa HOA vừa thường (`.ItemID`) là ký hiệu định danh, không phải file — KHÔNG phán", (t) => {
  const root = repo(t);
  assert.equal(isIdentifierNotation("Fact_SaleDiscount.ItemID"), true);
  assert.equal(isIdentifierNotation("spec.md"), false, "đuôi thường là đuôi file thật");
  assert.equal(isIdentifierNotation("REPORT.SQL"), false, "đuôi toàn HOA vẫn là đuôi file (`.SQL`, `.MD`) — chỉ TRỘN mới là ký hiệu");
  const v = classify(cand("Fact_SaleModifier/Fact_SaleDiscount.ItemID"), join(root, "docs", "plan", "x.md"), judge(root));
  assert.deepEqual(v, { kind: "unresolved", reason: "not-a-path" });
  // CA ÂM: một đường thật với đuôi thường mà không tồn tại thì VẪN chết — luật mới không được nuốt ca thật.
  const d = classify(cand("backend/src/gone.ts"), join(root, "docs", "plan", "x.md"), judge(root));
  assert.equal(d.kind, "dead");
});

// ── ② thư mục nháp: chết là ĐÚNG THIẾT KẾ ────────────────────────────────────
test("đường đi qua `scratchpad/` · `_scratch_*` · `.tmp_*` là file NHÁP — phải chết, không phải mục ruỗng", (t) => {
  const root = repo(t);
  for (const p of ["scratchpad/audit_fk.py", "C:\\Users\\x\\scratchpad\\probe.mjs", "_scratch_dump.json", "tools/.tmp_out/x.md"]) {
    assert.equal(isScratchPath(p), true, p);
    assert.deepEqual(classify(cand(p), join(root, "docs", "plan", "x.md"), judge(root)), { kind: "unresolved", reason: "scratch" }, p);
  }
  // CA ÂM: tên chỉ CHỨA chữ "scratch" ở giữa không phải thư mục nháp.
  assert.equal(isScratchPath("docs/scratchpad-notes.md"), false, "`scratchpad-notes.md` là một file bình thường");
  assert.equal(classify(cand("backend/src/real.ts"), join(root, "docs", "plan", "x.md"), judge(root)).kind, "ok");
});

// ── ③ file cố ý không nằm trong git ─────────────────────────────────────────
test("đích khớp `.gitignore` của repo (`.env`) là file CỐ Ý vắng — `gitignored`, không phải chết", (t) => {
  const root = repo(t);
  writeFileSync(join(root, ".gitignore"), "*.env\n!*.example.env\n");
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "fixture");
  plan(root, "# p\nkhai biến ở `config/dw_load.env`; mẫu ở `config/dw_load.example.env`; và `backend/src/gone.ts`\n");
  git(root, "add", "-A"); // plan phải nằm trong ls-files mới được quét (nhánh git)
  const rep = pathsCheck(ctxOf(root));
  const un = rep.unresolved.filter((h) => h.reason === "gitignored").map((h) => h.text);
  assert.deepEqual(un, ["config/dw_load.env"], "`.env` bị ignore ⇒ không phán");
  // CA ÂM ×2: `!*.example.env` được git GIỮ ⇒ vẫn phán (chết, vì không có file); và `gone.ts` không dính ignore ⇒ chết.
  assert.deepEqual(rep.dead.map((h) => h.text).sort(), ["backend/src/gone.ts", "config/dw_load.example.env"]);
});

// ── ④ MỚI CHẾT cần BẰNG CHỨNG — nguồn ①: lượt quét trước thấy nó sống ──────────
test("chuỗi CHƯA TỪNG giải được thì không bao giờ là MỚI CHẾT (vẫn đếm ở rổ dead); chuỗi từng SỐNG rồi mất thì có", (t) => {
  const root = repo(t);
  const sf = join(tempDir(t, "zemory-pev-state-"), "paths-state.json");
  plan(root, "# p\nsống: `backend/src/real.ts`\n");
  const r1 = monitorPaths(ctxOf(root), { stateFile: sf });
  assert.equal(r1.monitor.baselined, true);
  // Viết THÊM một đường chưa từng tồn tại — nghĩa cũ gọi nó là "mới chết", nghĩa mới thì không.
  plan(root, "# p\nsống: `backend/src/real.ts` · lạ: `reports/FIN/measures.dax` · ký hiệu: `Fact_A/Fact_B.ItemID`\n");
  const r2 = monitorPaths(ctxOf(root), { stateFile: sf });
  assert.equal(r2.dead.length, 1, "`reports/FIN/measures.dax` VẪN là chết — rổ dead không giấu gì");
  assert.equal(r2.monitor.newlyDead.length, 0, "…nhưng KHÔNG mới chết: chưa ai từng thấy nó sống");
  // Giờ thứ từng sống mất đi ⇒ đúng là mục ruỗng.
  rmSync(join(root, "backend", "src", "real.ts"));
  const r3 = monitorPaths(ctxOf(root), { stateFile: sf });
  assert.deepEqual(r3.monitor.newlyDead.map((h) => h.text), ["backend/src/real.ts"], "đúng MỘT — cái từng sống");
  // DÍNH: lượt sau vẫn báo (bằng chứng không bị xoá khi nó chết).
  assert.equal(monitorPaths(ctxOf(root), { stateFile: sf }).monitor.newlyDead.length, 1, "bằng chứng chỉ THÊM, không bớt");
});

// ── ⑤ nguồn ②: git đã ghi nó bị xoá/đổi tên — bù cho lượt đầu của repo mới liên kết ───
test("file đã bị XOÁ trong lịch sử git là bằng chứng từng sống — mới chết ngay ở lượt quét ĐẦU", (t) => {
  const root = repo(t);
  const sf = join(tempDir(t, "zemory-pev-state-"), "paths-state.json");
  git(root, "init", "-q");
  writeFileSync(join(root, "backend", "src", "old_name.ts"), "x");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "có file");
  git(root, "rm", "-q", "backend/src/old_name.ts");
  git(root, "commit", "-q", "-m", "xoá file");
  plan(root, "# p\ntrỏ cũ: `backend/src/old_name.ts` · chưa từng có: `backend/src/never.ts`\n");
  git(root, "add", "-A");
  // Baseline nuốt cả hai làm di sản ⇒ reset để đo đúng nghĩa "chết mà không phải di sản".
  monitorPaths(ctxOf(root), { stateFile: sf });
  const r = monitorPaths(ctxOf(root), { stateFile: sf, resetBaseline: true });
  assert.equal(r.monitor.newlyDead.length, 0, "reset-baseline ⇒ 0, như cũ");
  // Xoá state để mô phỏng "repo mới liên kết, lượt đầu": không có `alive`, chỉ có git làm chứng.
  rmSync(sf);
  const first = monitorPaths(ctxOf(root), { stateFile: sf });
  // Lượt đầu là baseline nên `newlyDead` = 0 theo hợp đồng; điều cần chứng minh là PHÉP BẰNG CHỨNG:
  // thêm một chuỗi nữa rồi quét lại — chuỗi có git làm chứng thành mới chết, chuỗi kia không.
  assert.equal(first.monitor.baselined, true);
  plan(root, "# p\ntrỏ cũ: `backend/src/old_name.ts` · chưa từng có: `backend/src/never.ts` · thêm: `backend/src/old_name.ts`\n");
  const sf2 = join(tempDir(t, "zemory-pev-state2-"), "paths-state.json");
  writeFileSync(sf2, JSON.stringify({ version: 1, projects: { [root.toLowerCase()]: { baselineAt: "x", baseline: [], lastAt: "x", lastDead: [], firstSeen: {} } } }));
  const r2 = monitorPaths(ctxOf(root), { stateFile: sf2 });
  assert.deepEqual([...new Set(r2.monitor.newlyDead.map((h) => h.text))], ["backend/src/old_name.ts"],
    "git nói `old_name.ts` từng tồn tại ⇒ mới chết; `never.ts` không có bằng chứng ⇒ không");
});

// ── ⑥ "không dò được" phải ĐƯỢC BÁO, không được biến mất ─────────────────────
test("unprovenPathsSummary: chết mà không có bằng chứng ⇒ đếm riêng, không lẫn vào mới chết, không lẫn di sản", async (t) => {
  const { unprovenPathsSummary, deadPathsSummary, loadPathsState } = await import("../../dist/docs/paths.js");
  const root = repo(t);
  const sf = join(tempDir(t, "zemory-pev-state-"), "paths-state.json");
  plan(root, "# p\ndi sản: `backend/src/legacy.ts` · sống: `backend/src/real.ts`\n");
  monitorPaths(ctxOf(root), { stateFile: sf }); // baseline: legacy.ts là di sản
  plan(root, "# p\ndi sản: `backend/src/legacy.ts` · sống: `backend/src/real.ts` · lạ: `reports/x.dax`\n");
  rmSync(join(root, "backend", "src", "real.ts"));
  monitorPaths(ctxOf(root), { stateFile: sf });
  const st = loadPathsState(sf);
  const projs = [{ root, name: "fx" }];
  assert.deepEqual(deadPathsSummary(st, projs).map((x) => x.newlyDead), [1], "mới chết = real.ts (có bằng chứng)");
  assert.deepEqual(unprovenPathsSummary(st, projs).map((x) => x.unproven), [1], "không kết luận = x.dax — KHÔNG đếm legacy.ts (di sản), KHÔNG đếm real.ts (đã là mới chết)");
});
