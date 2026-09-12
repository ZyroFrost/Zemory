// Audit 2026-09-07, faces 6/11 — three findings that all share one shape: the machine was
// correct and the PERSON saw the wrong thing.
//   #2 Vietnamese on an English screen at every cold start (language applied too late);
//   #3 the backend composing Vietnamese sentences for the UI;
//   #4 /connections taking 29–30 s because every panel load probed every disconnected lane.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { probeDue } from "../../dist/memory/connections.js";

const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
const CHROME = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
const CONN = readFileSync(new URL("../src/memory/connections.ts", import.meta.url), "utf8");
const SOURCES = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");

test("#2 /ping carries lang — the cheapest call is the one the shell must learn the language from", () => {
  const ping = UI.slice(UI.indexOf('p === "/ping"'), UI.indexOf('p === "/ping"') + 400);
  // `lang` moved INTO `liveFlags()` on 2026-09-10 when three more user toggles joined it for the
  // same reason (they were riding /memory-status: 152–181 s cold, so the switches painted OFF while
  // config said ON). The invariant is unchanged — /ping must carry it — so this anchor follows the
  // rewrite instead of going red on it. Asserted in two halves so it cannot pass on a `liveFlags()`
  // that has quietly dropped `lang`: the handler spreads it, AND the helper still reads getLang().
  assert.match(ping, /\.\.\.liveFlags\(\)|lang:\s*getLang\(\)/, "measured: lang used to arrive only with /memory-status (7–74 s cold)");
  const flags = /function liveFlags\(\): Record<string, unknown> \{([\s\S]*?)\n\}/.exec(UI);
  if (flags) assert.match(flags[1], /lang:\s*getLang\(\)/, "liveFlags() must still be the thing that carries lang");
});

test("#2 shell applies lang from /ping BEFORE it fires the fetches whose widgets render through t()", () => {
  const boot = CHROME.slice(CHROME.indexOf("function zboot()"), CHROME.indexOf("function zboot()") + 3000);
  const iPing = boot.indexOf("zGet('/ping')");
  const iApply = boot.indexOf("applyI18n(p.lang)");
  const iChecks = boot.indexOf("refreshChecks()");
  const iStatus = boot.indexOf("zGet('/status')");
  const iAuto = boot.indexOf("zGet('/automation')");
  assert.ok(iPing >= 0 && iApply > iPing, "lang must be applied inside the /ping handler");
  for (const [name, i] of [["refreshChecks", iChecks], ["/status", iStatus], ["/automation", iAuto]]) {
    assert.ok(i > iApply, `${name} must be dispatched AFTER the language is known — it was parallel to it, and its widgets painted in 'vi'`);
  }
  // The gate is a chained .then after the ping promise, not a mere textual reordering.
  const between = boot.slice(iApply, iChecks);
  assert.match(between, /\.catch\(function\(\)\{\}\)\.then\(function\(\)\{/, "the remaining fetches must wait on the ping promise (fail-open when /ping fails)");
});

test("#2b rail update chip is rendered from zboot AFTER /ping — not at script load with a placeholder version", () => {
  const SYSTEM = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  // Measured 2026-09-07 (cold headless): "Đã cập nhật · v1.0.0 · repo khớp chuẩn" on an EN screen of
  // 2.15.0 — rendered at load with LANG='vi' and #topVersion still the HTML placeholder.
  assert.doesNotMatch(SYSTEM, /^\s*refreshHarnessUpdates\(\);\s*$/m, "no load-time call in system.js");
  const boot = CHROME.slice(CHROME.indexOf("function zboot()"), CHROME.indexOf("function zboot()") + 3000);
  const iApply = boot.indexOf("applyI18n(p.lang)");
  const iChip = boot.indexOf("refreshHarnessUpdates()");
  assert.ok(iChip > iApply && iApply >= 0, "the chip renders after the language and the real version are known");
});

test("#6b Drive card: a probe ERROR must read as 'not responding', never as 'folder does not exist'", () => {
  const GM = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  const fn = GM.slice(GM.indexOf("function driveMsg("), GM.indexOf("function driveMsg(") + 400);
  const iErr = fn.indexOf("if(d.error)return");
  const iExists = fn.indexOf("!d.exists");
  assert.ok(iErr >= 0 && iErr < iExists, "error is checked BEFORE exists — a timed-out probe returns exists:false too (2026-09-07: real folder shown as missing)");
  assert.match(fn, /t\('drv\.probeErr'\)/);
  // "probing…" (no result yet) is a third state, not a failure: the backend already distinguishes it.
  const iProbing = fn.indexOf("d.error==='probing…'");
  assert.ok(iProbing >= 0 && iProbing < iErr, "'probing…' is checked before the generic error branch");
  assert.match(fn, /t\('drv\.probing'\)/);
  for (const dict of [CHROME.slice(CHROME.indexOf("vi:{"), CHROME.indexOf("en:{")), CHROME.slice(CHROME.indexOf("en:{"))]) assert.match(dict, /'drv\.probing':'[^']+'/);
  assert.match(GM, /d\.error\?'—':\(zN\(d\.bundles\)/, "bundle count is unknown while the probe is failing — show —, not 0");
  // Both dictionaries carry the key (02_RULES §Ngôn ngữ: two-sided i18n).
  const vi = CHROME.slice(CHROME.indexOf("vi:{"), CHROME.indexOf("en:{"));
  const en = CHROME.slice(CHROME.indexOf("en:{"));
  assert.match(vi, /'drv\.probeErr':'[^']+'/);
  assert.match(en, /'drv\.probeErr':'[^']+'/);
});

test("#3 backend sends codes + args for web lanes, never a composed Vietnamese sentence", () => {
  assert.doesNotMatch(CONN, /bấm để đăng nhập lại|kiểm lần cuối \$\{|chưa kiểm lần nào/, "UI text belongs to the FE dicts (02_RULES §Ngôn ngữ: 0 hardcode)");
  assert.doesNotMatch(CONN, /phút trước|giờ trước|ngày trước/, "relative time is formatted by the FE (relTime), in the user's language");
  assert.match(CONN, /detailCode: lost \? "needLogin" : st \? "lastChecked" : "neverChecked"/);
  // FE must not depend on the removed sentence to match a lane by account.
  assert.match(SOURCES, /x\.detailArgs&&x\.detailArgs\.who===c\.who/, "match by detailArgs.who, not by searching the sentence");
  assert.doesNotMatch(SOURCES, /x\.detail\.indexOf\(c\.who\)/);
});

test("#4 probeDue: first time yes, inside the TTL no, after the TTL yes", () => {
  const TTL = 10 * 60_000;
  assert.equal(probeDue(undefined, 1_000, TTL), true, "never probed ⇒ probe");
  assert.equal(probeDue(1_000, 1_000 + 5 * 60_000, TTL), false, "5 minutes later ⇒ reuse — this is what turns 30 s per panel load into 30 s per 10 minutes");
  assert.equal(probeDue(1_000, 1_000 + TTL, TTL), true);
});

test("#4 liveConnections consults the memo and stamps it before probing", () => {
  // Bỏ chú thích TRƯỚC khi soi, và cắt theo HÀM chứ không theo số ký tự cố định: một khối giải
  // thích thêm vào là đẩy `probeOnly` ra ngoài cửa sổ 1800 ký tự và cổng đỏ vì code DỜI CHỖ,
  // không vì thứ tự sai (dính 2026-09-11). Cùng cách đã chốt cho `scanweb-platforms`.
  const noCmt = UI.replace(/^\s*\/\/.*$/gmu, "");
  const from = noCmt.indexOf("async function liveConnections");
  const live = noCmt.slice(from, noCmt.indexOf("\n}", from));
  const iDue = live.indexOf("probeDue(lastProbeAt.get(laneKey)");
  const iStamp = live.indexOf("lastProbeAt.set(laneKey, Date.now())");
  const iProbe = live.indexOf("probeOnly: true");
  assert.ok(iDue >= 0 && iStamp > iDue && iProbe > iStamp, "order: due? → stamp → probe (stamp before the await, so a slow probe is not re-entered)");
});
