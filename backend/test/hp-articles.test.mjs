// Constitution articles whose bold WRAPS onto the next line (reported from _DB_AppCore 2026-10-10: articles 1 and 6 were
// invisible to `constitutionArticles` — `.` stops at a newline — so `zemory gates` read 0 gaps while two words-only
// articles were missing from the "ĐỌC KỸ" block). One parser for validate, the no-gate block and the standard graph.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { constitutionArticles } from "../../dist/docs/validate.js";
import { noGateArticles } from "../../dist/docs/no-gate.js";
import { buildStandardGraph } from "../../dist/memory/graph/graph-standard.js";
import { tempDir } from "./helpers.mjs";

// The shapes of _DB_AppCore 232f07e, CRLF as the repos write them.
const CON = [
  "# HP", "", "## Điều khoản",
  "1. **SQL GHI lên DB chỉ đi từng lượt một,", "   qua đường chính thức** — chi tiết.",
  "2. **Hai**", "3. **Ba**", "4. **Bốn** — chỉ chữ.", "5. **Năm**",
  "6. **🔴 BẢNG NGUYÊN TẮC — rà toàn DB + dò", "   luật này TRƯỚC khi tạo.** Thân điều.",
  "",
].join("\r\n");

test("an article whose bold wraps onto the next line is an article, its title on one line", () => {
  const arts = constitutionArticles(CON);
  assert.deepEqual(arts.map((a) => a.n), [1, 2, 3, 4, 5, 6]);
  assert.equal(arts[0].title, "SQL GHI lên DB chỉ đi từng lượt một, qua đường chính thức");
  assert.equal(arts[5].title, "🔴 BẢNG NGUYÊN TẮC — rà toàn DB + dò luật này TRƯỚC khi tạo.");
});

test("an emoji marker BEFORE a wrapped bold still counts (the Dept shape `6. 🔴 **…`)", () => {
  const arts = constitutionArticles("## Điều khoản\n6. 🔴 **Một tiêu đề\n   hai dòng** thân\n7. 🔒 **Bảy**\n");
  assert.deepEqual(arts.map((a) => [a.n, a.title]), [[6, "Một tiêu đề hai dòng"], [7, "Bảy"]]);
});

test("NEGATIVE: an unclosed bold never swallows the next article, nor crosses a blank line", () => {
  const arts = constitutionArticles("1. **chưa đóng\n2. **Hai**\n\n3. **Ba mở\n\n4. **Bốn**\n");
  assert.deepEqual(arts.map((a) => [a.n, a.title]), [[2, "Hai"], [4, "Bốn"]], "1 and 3 are malformed, 2 and 4 keep their own titles");
  assert.deepEqual(constitutionArticles("1. **(chưa chốt) nháp**\n2. **Thật**\n").map((a) => a.n), [2], "a draft marker is not an article");
});

test("end to end: the 'read carefully' block lists the wrapped words-only articles (1 · 4 · 6), and the graph sees all six", (t) => {
  const root = tempDir(t, "zemory-hp-");
  const agent = join(root, "docs", "agent");
  mkdirSync(agent, { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(agent, "01_CONSTITUTION.md"), CON);
  const rows = [1, 2, 3, 4, 5, 6].map((n) => `| ${n} | x | ${[1, 4, 6].includes(n) ? "CHỮ | phán đoán" : "CHẶN | `x.test`"} |`).join("\n");
  writeFileSync(join(agent, "02_RULES.md"), `# R\n\n## Hành xử\n- x\n\n## Cổng cho hiến pháp\n| # | Điều | Loại | Cổng |\n|---|---|---|---|\n${rows}\n`);
  assert.deepEqual(noGateArticles(agent).map((a) => [a.n, a.why]), [[1, "words"], [4, "words"], [6, "words"]]);
  const g = buildStandardGraph(root, []);
  assert.equal(g.stats.hpDieu, 6, "conform's article count comes from the same parser");
});
