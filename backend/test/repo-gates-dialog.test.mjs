// The "Repo gates" dialog (rail chip ④). User 2026-10-07: "bấm đang kiểm xong nó chạy cái ngưng, ko báo gì".
// Three ways the surface lied, one case each:
//   ① a re-check the user asked for swallowed its own failure (`.catch(function(){})`) ⇒ looked finished;
//   ② a re-check that changed nothing cleared the status line ⇒ "did it run?" had no answer;
//   ③ gap lines were the backend's English CLI text ⇒ a Vietnamese UI showed English.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SYS = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
const CHROME = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
const fn = (name) => {
  const at = SYS.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `anchor: function ${name}`);
  return SYS.slice(at, SYS.indexOf("\n  function ", at + 10) > 0 ? SYS.indexOf("\n  function ", at + 10) : at + 4000);
};

test("① a user-requested re-check surfaces its failure instead of swallowing it", () => {
  const body = fn("refreshRepoGates");
  assert.match(body, /\.catch\(function\(e\)\{if\(fresh\)throw e;\}\)/, "fresh refresh must rethrow");
  assert.doesNotMatch(body, /\.catch\(function\(\)\{\}\)/, "an empty catch makes a failed check look done");
});

test("② a re-check always says it ran — when, and how many repos still have gaps", () => {
  const body = fn("gatesDialog");
  assert.match(body, /refreshRepoGates\(true\)\.then\(function\(r\)\{draw\(checkedNote\(r\)\);\}\)/);
  assert.match(body, /if\(note\)zDlgMsg\(note\);/, "the note must reach the status line after the redraw");
  assert.doesNotMatch(body, /zDlgMsg\(''\);draw\(\)/, "clearing the line then redrawing = the silent re-check");
});

test("④ the shared dialog keeps its status line and buttons OUTSIDE the scroll area", () => {
  // Measured 2026-10-07 in headless Edge at 1600×900: inside `.dlg-b` the status line sat at 800 px in an 807 px
  // window, below a long list — the re-check result existed but could not be seen.
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const at = html.indexOf('id="zDlg"');
  const dlg = html.slice(at, html.indexOf('id="zToasts"', at));
  const body = dlg.slice(dlg.indexOf('class="dlg-b"'), dlg.indexOf('class="dlg-f"'));
  assert.ok(dlg.includes('class="dlg-f"'), "footer container must exist");
  assert.ok(!/id="zDlgMsg"|id="zDlgOk"/.test(body), "status line / OK button must not live inside the scrolling body");
  assert.match(readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8"), /\.dlg-f\{flex:0 0 auto/);
});

test("⑤ a CHECKLIST: every repo is a row with its four checks, not only the repos with gaps (user 2026-10-07)", () => {
  const body = fn("gatesDialog");
  assert.match(body, /var rows=\(GATES\|\|\[\]\)\.slice\(\)\.sort\(/, "all repos, gaps first");
  assert.doesNotMatch(body, /filter\(function\(g\)\{return g\.gaps>0;\}\);\s*var body/, "listing only the bad repos = the old list");
  assert.match(fn("gateCells"), /return \[guard,pre,hp,top,rf\];/, "five checks per repo (read-before-write added 2026-10-08)");
});

test("⑥ the repo-update button counts a repo as done only when NOTHING was left for a hand fix (user 2026-10-08)", () => {
  // "đã áp 3/3" while every repo answered stdSkipped=1 ⇒ 0 bytes carried, badge never green, button lied.
  const at = SYS.indexOf("zPost('/harness-apply?root='");
  const body = SYS.slice(at, at + 1200);
  assert.match(body, /if\(r\.ok&&!r\.stdSkipped\)\{okN\+\+/, "a skipped file must not count as applied");
  assert.doesNotMatch(body, /if\(r\.ok\)\{okN\+\+/, "r.ok alone = the old lie");
});

test("③ gap lines go through i18n in BOTH dictionaries, never the backend's English `lines`", () => {
  assert.doesNotMatch(fn("gatesDialog"), /g\.lines/, "rendering g.lines puts English CLI text in the UI");
  const keys = ["gates.colRf", "gates.noReadFirst", "gates.colRepo", "gates.colGuard", "gates.colPre", "gates.colHp", "gates.colTop", "gates.cellNo", "gates.cellTools", "gates.cellOwn", "gates.cellNoTable", "gates.cellStale", "gates.checkedBad", "gates.checkedOk", "gates.noGuard", "gates.matcher", "gates.noPrecommit", "gates.ownPrecommit", "gates.noTable", "gates.noRow", "gates.top"];
  for (const k of keys) assert.equal(CHROME.split(`'${k}':`).length - 1, 2, `${k} must exist in the VI and the EN dictionary`);
});
