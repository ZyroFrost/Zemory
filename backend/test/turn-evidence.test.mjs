// Rule_Gate_01_DoneMeansRun at the end of a turn (plan/28 §0q): code changed after the last check ⇒ the turn may not end.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callsThisTurn, KHO_WORD, replyThisTurn, replyVocab, stopDecision, turnEvidence } from "../../dist/docs/turn-evidence.js";
import { RULE_HOOKS } from "../../dist/docs/rule-hooks-src.js";
import { endOfTurnVerdict } from "../../dist/memory/capture-hook.js";
import { tempDir } from "./helpers.mjs";

const user = (text) => ({ type: "user", message: { role: "user", content: text } });
const tool = (name, input) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name, input }] } });
const result = () => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
const jsonl = (recs) => recs.map((r) => JSON.stringify(r)).join("\n") + "\n";

test("code changed and no check after it: blocked, naming the files", () => {
  const why = turnEvidence(jsonl([user("sửa lỗi đăng nhập"), tool("Edit", { file_path: "D:/r/backend/src/login.ts" }), result()]));
  assert.match(why ?? "", /Rule_Gate_01_DoneMeansRun[\s\S]*src\/login\.ts/);
});

test("a check after the last change lets the turn end; a change after the check blocks again", () => {
  const edit = tool("Write", { file_path: "D:/r/backend/src/a.ts" });
  assert.equal(turnEvidence(jsonl([user("x"), edit, result(), tool("Bash", { command: "npm run check > out.log 2>&1" }), result()])), null);
  assert.equal(turnEvidence(jsonl([user("x"), edit, tool("PowerShell", { command: "node --test backend/test/a.test.mjs" })])), null);
  assert.match(turnEvidence(jsonl([user("x"), edit, tool("Bash", { command: "npx tsc --noEmit" }), tool("Edit", { file_path: "D:/r/backend/src/b.ts" })])) ?? "", /src\/b\.ts/);
});

test("docs-only turns, a repo's own gate command, and a new turn after the person speaks", () => {
  assert.equal(turnEvidence(jsonl([user("x"), tool("Edit", { file_path: "D:/r/docs/plan/a.md" })])), null, "no code changed");
  assert.equal(turnEvidence(jsonl([user("x"), tool("Edit", { file_path: "D:/r/src/a.py" }), tool("Bash", { command: "python scripts/check_report.py" })]),
    ["scripts/check_report.py"]), null, "a gate the repo declares is a check");
  const recs = [user("first"), tool("Edit", { file_path: "D:/r/a.ts" }), user("second, unrelated"), tool("Read", { file_path: "D:/r/a.ts" })];
  assert.equal(callsThisTurn(jsonl(recs)).length, 1, "the turn starts where the person last typed");
  assert.equal(turnEvidence(jsonl(recs)), null);
  const notice = { type: "user", message: { role: "user", content: "<task-notification>done</task-notification>" } };
  assert.match(turnEvidence(jsonl([user("x"), tool("Edit", { file_path: "D:/r/a.ts" }), notice])) ?? "", /a\.ts/, "a host notice is not the person speaking");
});

test("the hook asks only where the repo carries rule 11 as a part; elsewhere it stays silent", (t) => {
  const tx = (dir) => { const p = join(dir, "t.jsonl"); writeFileSync(p, jsonl([user("x"), tool("Edit", { file_path: join(dir, "src", "a.ts") })])); return p; };
  const withRule = tempDir(t, "zemory-turn-r11-");
  mkdirSync(join(withRule, "docs", "agent", "01_LAW", "_Rule", "Rule_Keys_11_VerifyClaims"), { recursive: true });
  writeFileSync(join(withRule, "docs", "agent", "01_LAW", "_Rule", "Rule_Keys_11_VerifyClaims", "RULE.md"), "---\nid: Rule_11\nname: verify-claims\nversion: 1\n---\nx\n");
  writeFileSync(join(withRule, "docs", ".harness.json"), "{}\n");
  assert.match(endOfTurnVerdict({ cwd: withRule, transcript_path: tx(withRule) }), /"decision":"block"/);
  const without = tempDir(t, "zemory-turn-none-");
  mkdirSync(join(without, "docs", "agent", "01_RULES", "Rule_Core_05_X"), { recursive: true });
  writeFileSync(join(without, "docs", "agent", "01_RULES", "Rule_Core_05_X", "RULE.md"), "---\nid: Rule_5\nname: x\nversion: 1\n---\nx\n");
  writeFileSync(join(without, "docs", ".harness.json"), "{}\n");
  assert.equal(endOfTurnVerdict({ cwd: without, transcript_path: tx(without) }), "", "no rule 11, no question");
});

test("the Stop hook answers with a block decision once; the Stop that follows its own block passes", (t) => {
  const dir = tempDir(t, "zemory-turn-");
  const p = join(dir, "t.jsonl");
  writeFileSync(p, jsonl([user("x"), tool("Edit", { file_path: "D:/r/a.ts" })]));
  const d = JSON.parse(stopDecision({ transcript_path: p }));
  assert.equal(d.decision, "block");
  assert.match(d.reason, /Rule_Gate_01_DoneMeansRun/);
  assert.equal(stopDecision({ transcript_path: p, stop_hook_active: true }), "", "never loops");
  assert.equal(stopDecision({ transcript_path: join(dir, "missing.jsonl") }), "", "fail-open");
});

// Rule 27's vocabulary in the reply (2026-10-19): "kho" alone names the data warehouse and the harness store at once.
const say = (text) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } });

test("a reply that says \"kho\" alone is blocked once; DW / HS, stock words, code and quotes pass", () => {
  assert.match(replyVocab("Đã sửa ở kho, rồi sync xuống.") ?? "", /Rule_Gate_27_HarnessLanguage[\s\S]*Đã sửa ở kho/);
  assert.match(replyVocab("Kho đã đối chiếu và commit.") ?? "", /Rule_Gate_27/, "at the start of a line, capitalised");
  for (const ok of ["Đã sửa ở HS, đọc từ DW.", "Tồn kho cuối ngày lấy từ DW.", "kho dữ liệu của vùng", "Chữ `kho` bị cấm.",
    "Hook chặn chữ \"kho\" đứng một mình.", "```\nkho\n```", "khoá két", "kho hàng"]) {
    assert.equal(replyVocab(ok), null, `NEGATIVE: must pass — ${ok}`);
  }
});

test("the reply checked is this turn's text only: what the agent said before the person last spoke is not judged again", () => {
  const recs = [user("x"), say("Đã sửa ở kho."), user("ok, tiếp đi"), tool("Read", { file_path: "a.md" }), say("Đã sửa ở HS.")];
  assert.equal(replyThisTurn(jsonl(recs)), "Đã sửa ở HS.");
  assert.equal(replyVocab(replyThisTurn(jsonl(recs))), null);
});

test("PARITY: the reply check and hook 02-27 use the same \"kho\" pattern (one rule, two places it is checked)", () => {
  const hook = RULE_HOOKS.find((h) => h.file.startsWith("02-27_")).source;
  assert.ok(hook.includes(`const KHO = ${KHO_WORD.toString()};`), "hook 02-27 declares exactly the pattern of turn-evidence.ts");
});

test("the Stop hook checks the reply only where the repo's set carries rule 27; both reasons arrive in one block", (t) => {
  const make = (rules) => {
    const dir = tempDir(t, "zemory-turn-r27-");
    for (const [folder, id] of rules) {
      mkdirSync(join(dir, "docs", "agent", "01_LAW", "_Rule", folder), { recursive: true });
      writeFileSync(join(dir, "docs", "agent", "01_LAW", "_Rule", folder, "RULE.md"), `---\nid: ${id}\nname: x\nversion: 1\n---\nx\n`);
    }
    writeFileSync(join(dir, "docs", ".harness.json"), "{}\n");
    return dir;
  };
  const tx = (dir, recs) => { const p = join(dir, "t.jsonl"); writeFileSync(p, jsonl(recs)); return p; };
  const r27 = make([["Rule_Gate_27_HarnessLanguage", "Rule_27"]]);
  assert.match(endOfTurnVerdict({ cwd: r27, transcript_path: tx(r27, [user("x"), say("Sửa ở kho xong.")]) }), /Rule_Gate_27/);
  assert.equal(endOfTurnVerdict({ cwd: r27, transcript_path: tx(r27, [user("x"), tool("Edit", { file_path: join(r27, "a.ts") }), say("Sửa ở HS.")]) }), "",
    "NEGATIVE: rule 27 alone does not ask for the evidence of rule 1");
  const none = make([["Rule_Core_05_X", "Rule_5"]]);
  assert.equal(endOfTurnVerdict({ cwd: none, transcript_path: tx(none, [user("x"), say("Sửa ở kho xong.")]) }), "", "NEGATIVE: no rule 27, no question");
  const both = make([["Rule_Gate_27_HarnessLanguage", "Rule_27"], ["Rule_Gate_01_DoneMeansRun", "Rule_1"]]);
  const d = JSON.parse(endOfTurnVerdict({ cwd: both, transcript_path: tx(both, [user("x"), tool("Edit", { file_path: join(both, "a.ts") }), say("Sửa ở kho.")]) }));
  assert.match(d.reason, /Rule_Gate_01_DoneMeansRun[\s\S]*Rule_Gate_27/, "one block carries both reasons");
});
