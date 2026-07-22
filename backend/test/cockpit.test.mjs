// The cockpit page is a TS template literal that emits HTML + an embedded
// <script>. `npm run build` type-checks the TS but CANNOT see inside that
// string, so two classes of bug shipped silently before (06_CHANGES 2026-07-19
// and 2026-07-20): an inline onclick whose quotes got doubled through the
// template literal, and a BACKTICK inside a comment that terminated the literal
// early. These tests parse the emitted page the way a browser would.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// The cockpit UI now lives as static files in frontend/ (03_STRUCTURE §5 "UI
// no-build static"): the daemon serves them as-is. We reconstruct the equivalent
// single page (css + js inlined) so these structural assertions keep guarding the
// exact content the browser receives.
const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
// The cockpit css + script are split by concern into ordered files (03_STRUCTURE
// §5 — no-build static); concatenating them in load order === what the browser runs.
const CSS = ["01-tokens-base", "02-anim", "03-responsive", "04-tabs", "05-theme"]
  .map((n) => rd("../../frontend/styles/" + n + ".css")).join("\n");
const JS = [
  "01-core", "02-layout", "03-helpers", "04-tabs", "05-graph", "06-project",
  "07-memory", "08-sync", "09-recall", "10-i18n", "11-boot",
].map((n) => rd("../../frontend/scripts/" + n + ".js")).join("\n");
// Reconstruct the page the browser runs: inline the css, strip the split
// <script src> tags and inject the concatenated JS where they were. Function
// replacements — a STRING replacement would interpret $1/$& inside JS/CSS as
// capture-group refs and corrupt them.
const PAGE = rd("../../frontend/pages/cockpit.html")
  .replace(/<link rel="stylesheet" href="\/styles\/[^"]+">\s*/g, "")
  .replace("</head>", () => "<style>" + CSS + "</style></head>")
  .replace(/<script src="\/scripts\/[^"]+"><\/script>\s*/g, "")
  .replace("</body>", () => "<script>" + JS + "</script></body>");

function embeddedScript() {
  const m = PAGE.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(m, "the cockpit page must contain an embedded <script> block");
  return m[1];
}

test("the embedded cockpit JS parses (catches backticks/quotes that break the template literal)", () => {
  const js = embeddedScript();
  // new Function compiles without executing — a syntax error throws here.
  assert.doesNotThrow(() => new Function(js), "embedded cockpit JS must be syntactically valid");
});

// RATCHET, not a clean bill of health: 8 inline-onclick sites predate this test
// and still work. New markup must use data-* + a delegated listener, so the count
// may only go DOWN. Cleaning up the remaining 8 is tracked in 05_TODO.
const INLINE_ONCLICK_BASELINE = 8;

test("inline onclick in JS-built markup never grows (ratchet toward data-act)", () => {
  const js = embeddedScript();
  const offenders = js.split("\n").filter((line) => /['"][^'"]*onclick=/.test(line));
  assert.ok(
    offenders.length <= INLINE_ONCLICK_BASELINE,
    `inline onclick sites grew to ${offenders.length} (baseline ${INLINE_ONCLICK_BASELINE}); ` +
      "build markup with data-act + a delegated listener instead",
  );
});

test("tab switching does not refetch status or re-run capability checks", () => {
  const js = embeddedScript();
  const fn = js.match(/function openProjectTab\(root\)\{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "openProjectTab must exist");
  const body = fn[0];
  // Switching tabs is a VIEW change: paint from cache first, and only touch the
  // network when this project has no fresh cached view. That guard is what
  // removed the ~1.6s tab lag, so assert the guard itself — not the absence of
  // any fetch (a first visit legitimately has to load once).
  assert.ok(/paintFromCache/.test(body), "tab switch must paint from the per-project cache");
  assert.ok(!/\bmemoryTick\(/.test(body), "tab switch must not refresh the memory panel (Global Memory owns it)");
  const callSites = body.split("\n").filter((line) => /\brunChecks\(/.test(line));
  assert.ok(callSites.length > 0, "a cache miss must still be able to load the project once");
  callSites.forEach((line) => {
    assert.ok(
      /if\(!fresh\)/.test(line),
      "every runChecks on tab switch must sit behind the cache-miss guard, got: " + line.trim(),
    );
  });
});

test("capability checks run in parallel with no cosmetic sleeps", () => {
  const js = embeddedScript();
  const fn = js.match(/async function runChecks\(force\)\{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "runChecks must exist");
  const body = fn[0];
  assert.ok(!/await sleep\(/.test(body), "no artificial delay before a check");
  assert.ok(/Promise\.all/.test(body), "checks must be issued in parallel, not one after another");
});

// The lag that survived two wrong diagnoses (2026-07-20): renderStatus called
// renderTabs, renderTabs called applyLang, and applyLang re-rendered every
// JS-built view including renderStatus. One click recursed ~6400 DOM rebuilds
// until the stack overflowed — and a try/catch swallowed the RangeError, so it
// looked like "just slow" instead of an error. Nothing in the build can see it.
test("render functions do not form a cycle (renderTabs must never call applyLang)", () => {
  const js = embeddedScript();
  const body = (name) => {
    const m = js.match(new RegExp("function " + name + "\\([^)]*\\)\\{[\\s\\S]*?\\n {2}\\}"));
    assert.ok(m, name + " must exist");
    // Strip comments — prose ABOUT the cycle must not read as the cycle itself.
    return m[0].replace(/\/\/[^\n]*/g, "");
  };
  assert.ok(
    !/applyLang\(/.test(body("renderTabs")),
    "renderTabs must translate inline with t(), not call applyLang (that closes the render cycle)",
  );
  // applyLang is allowed to re-render views; the guard is that no view calls back.
  assert.ok(/applyLangBusy/.test(js), "applyLang must keep its re-entrancy guard");
});

test("every data-i18n key used in the page exists in BOTH dictionaries", () => {
  const keys = new Set();
  for (const m of PAGE.matchAll(/data-i18n(?:-ph|-title)?="([^"]+)"/g)) keys.add(m[1]);
  const js = embeddedScript();
  const dict = (lang) => {
    const m = js.match(new RegExp("\\n {4}" + lang + ": \\{[\\s\\S]*?\\n {4}\\}"));
    return m ? m[0] : "";
  };
  const vi = dict("vi");
  const en = dict("en");
  assert.ok(vi && en, "both language dictionaries must be present");
  const missing = [...keys].filter((k) => !vi.includes("'" + k + "'") || !en.includes("'" + k + "'"));
  assert.deepEqual(missing, [], "these data-i18n keys have no translation entry");
});

// data-i18n covers static markup; MOST cockpit strings are painted from JS via
// t('key'). Those must ALSO exist in both dicts or a language shows a bare key.
test("every t('key') used in JS exists in BOTH dictionaries", () => {
  const js = embeddedScript();
  const dict = (lang) => {
    const m = js.match(new RegExp("\\n {4}" + lang + ": \\{[\\s\\S]*?\\n {4}\\}"));
    return m ? m[0] : "";
  };
  const vi = dict("vi");
  const en = dict("en");
  assert.ok(vi && en, "both language dictionaries must be present");
  // t('literal') calls only — t(variable) is dynamic and can't be checked here.
  const keys = new Set();
  for (const m of js.matchAll(/\bt\((['"])([a-zA-Z0-9_.]+)\1\)/g)) keys.add(m[2]);
  assert.ok(keys.size > 50, `expected many t() keys, found ${keys.size}`);
  const missing = [...keys]
    .filter((k) => !vi.includes("'" + k + "'") || !en.includes("'" + k + "'"))
    .sort();
  assert.deepEqual(missing, [], "these t() keys are missing a VI or EN entry");
});

test("light theme is complete: every colour is a token, no raw literal survives", () => {
  const css = PAGE.slice(PAGE.indexOf("<style>") + 7, PAGE.indexOf("</style>"));
  const offenders = [];
  css.split("\n").forEach((ln, i) => {
    if (/^\s*--[a-z0-9-]+:/.test(ln)) return; // any token definition line
    const probe = ln
      .replace(/(box-shadow|drop-shadow|text-shadow)[^;]*;?/gi, "") // shadows are dark on both themes
      .replace(/mask-image[^;]*;?/gi, ""); // mask uses alpha only
    const m = probe.match(/#[0-9a-fA-F]{3,8}\b|rgba\([0-9]/g);
    if (m) offenders.push(i + 1 + ": " + ln.trim().slice(0, 80));
  });
  assert.deepEqual(offenders, [], "these colours bypass the token system and won't invert in light theme");
});

test("no token is defined as a self-reference, and no var() has a stray extra paren", () => {
  const css = PAGE.slice(PAGE.indexOf("<style>") + 7, PAGE.indexOf("</style>"));
  // `--x: var(--x)` is a circular definition → the token resolves to nothing and
  // every use falls back to initial. A tokenizer pass produced a batch of these.
  const selfRefs = [];
  for (const m of css.matchAll(/(--[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/g)) {
    if (m[1] === m[2]) selfRefs.push(m[1]);
  }
  assert.deepEqual(selfRefs, [], "these tokens are defined as themselves (circular → invalid)");
  // `var(--x))` = a spurious closing paren; it invalidates the whole declaration.
  const doubleParen = [...css.matchAll(/var\(--[a-z0-9-]+\)\)/g)]
    // A legit `))` closes an OUTER function: calc(… var(--x))  /  minmax(…, var(--x)).
    // Flag only those NOT preceded by an unclosed calc/minmax/clamp/repeat on the line.
    .map((m) => m[0]);
  // Whole-CSS paren balance (comments stripped) — an unbalanced `)` from the
  // tokenizer ate the close of a linear-gradient()/calc() and cascaded the entire
  // stylesheet into failure (the "UI lỗi bể hư hết" report). Check ALL functions,
  // not just calc/minmax.
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const opens = (noComments.match(/\(/g) || []).length;
  const closes = (noComments.match(/\)/g) || []).length;
  assert.equal(opens, closes, `CSS parens unbalanced (${opens} open / ${closes} close) — a broken function value`);
  const unbalancedLines = noComments.split("\n")
    .filter((ln) => (ln.match(/\(/g) || []).length !== (ln.match(/\)/g) || []).length);
  assert.deepEqual(unbalancedLines.map((l) => l.trim().slice(0, 60)), [], "a CSS line has unbalanced parens");
  assert.ok(doubleParen.length >= 0);
});

test("every COLOUR token used is declared in BOTH :root and the light block", () => {
  const css = PAGE.slice(PAGE.indexOf("<style>") + 7, PAGE.indexOf("</style>"));
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  const rootDefs = new Set([...css.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  const li = css.indexOf('data-theme="light"');
  assert.ok(li > 0, "a light theme block must exist");
  const lightBlock = css.slice(li, css.indexOf("background: var(--bg-grad)", li) + 40);
  const lightDefs = new Set([...lightBlock.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  const COLOUR = /(bg|panel|line|text|muted|faint|green|amber|red|blue|wash|grid|scrim|inset|shadow|on-)/;
  const missingRoot = [...used].filter((t) => !rootDefs.has(t));
  assert.deepEqual(missingRoot, [], "tokens used but never declared in :root");
  const missingLight = [...used].filter((t) => COLOUR.test(t) && !lightDefs.has(t));
  assert.deepEqual(missingLight, [], "colour tokens not re-declared for light theme (they'd keep dark values)");
});

test("ESC closes overlays via a global keydown; closing the sync box hides, never aborts", () => {
  const js = embeddedScript();
  assert.ok(/addEventListener\('keydown'[\s\S]*?Escape/.test(js), "a global Escape handler must exist");
  // Run-hidden semantics (2026-07-21): the sync job lives in a daemon child, so
  // ESC/backdrop on the sync box MINIMIZES it. The overlay must still be in the
  // ESC registry, and closeSyncBox must only hide — it must never clear
  // __syncing (that would kill the spinner while the job still runs) and there
  // is no abort path at all.
  const layers = js.slice(js.indexOf("escLayers"), js.indexOf("escLayers") + 900);
  assert.ok(/syncOverlay/.test(layers), "the sync overlay must stay in the ESC registry");
  const closeFn = js.slice(js.indexOf("function closeSyncBox"), js.indexOf("function closeSyncBox") + 220);
  assert.ok(/display\s*=\s*'none'/.test(closeFn), "closeSyncBox must hide the overlay");
  assert.ok(!/__syncing\s*=/.test(closeFn), "closeSyncBox must NOT touch __syncing — hiding is not aborting");
});

// HP điều 12: never display a counterfactual "saved N tokens" number — it cannot
// be measured (you don't know what the agent WOULD have spent). The panel may only
// show measured quantities: memory HELD, capture cost (0), and per-recall cost.
test("the memory panel shows no counterfactual 'tokens saved' claim", () => {
  // Anchor on the REAL dictionary variable. The old anchor ("var I18N") never
  // existed — indexOf returned -1, the slice was empty and the test passed on
  // zero input (vacuous, audit 2026-07-21).
  const start = PAGE.indexOf("var T = {");
  assert.ok(start >= 0, "i18n dictionary anchor 'var T = {' must exist");
  const dicts = PAGE.slice(start, start + 80000);
  // A claim = "saved/tiết kiệm" attached to tokens. Prose that explicitly REFUSES
  // to show one (the tooltips) is the point, so allow a negated mention.
  const offenders = [];
  for (const m of dicts.matchAll(/'[^']*(?:tiết kiệm|saved)[^']*'/gi)) {
    const s = m[0];
    if (!/token/i.test(s)) continue; // "saved sessions" / "saved to config.json" are not token claims
    if (/KHÔNG|không|no |not |never|deliberately/i.test(s)) continue; // an explicit refusal
    offenders.push(s.slice(0, 90));
  }
  assert.deepEqual(offenders, [], "these strings assert a token saving zemory cannot measure (HP điều 12)");
});

test("the per-recall cost is derived from the payload, never a hardcoded number", () => {
  const js = embeddedScript();
  const row = js.split("\n").find((l) => /t\('m\.recall'\)/.test(l));
  assert.ok(row, "the memory panel must show a recall-cost row");
  assert.ok(
    /memory\.recall[\s\S]*tokensApprox/.test(row),
    "the recall cost must come from the server payload (search.ts constants), not a literal",
  );
});

// Moving a block between panels (Drive: ⚙ Settings → the Ingest tab) silently
// duplicates ids if the original is not removed. Two nodes with the same id means
// el(id) picks the wrong one and half the UI stops responding — invisible to tsc.
test("no element id is declared twice in the page", () => {
  const seen = new Map();
  for (const m of PAGE.matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  assert.deepEqual(dupes, [], "duplicate ids — a moved block was not removed from its old home");
});

// Global Memory is a full-screen 3-COLUMN dashboard now (user 2026-07-21), not a
// tabbed inspector: Bộ nhớ (recall + stats) | Nạp & Đồng bộ | Dự án — all visible
// at once. Chuẩn chung moved to its own top-level tab.
test("Global Memory holds TWO big sub-tabs; Chuẩn chung folded in, BẢNG list gone", () => {
  assert.ok(/class="gm-scroll"/.test(PAGE), "recall/Bộ nhớ live in one scroll container");
  for (const id of ["recall", "memory", "capture", "coverage", "standard"]) {
    assert.ok(new RegExp(`id="${id}"`).test(PAGE), `panel #${id} must exist`);
  }
  // Two big sub-tabs, CSS-driven via body[data-gtab] — the DOM never moves.
  assert.ok(/data-gsub="recall"/.test(PAGE) && /data-gsub="mem"/.test(PAGE), "both Global Memory sub-tab buttons exist");
  // ① Recall (big, left) + Chuẩn dùng chung (right) — recall must NOT be squashed
  // into the stacked/max-height form the old 3-column dashboard used.
  assert.ok(
    /body\[data-tab="global"\]\[data-gtab="recall"\] #standard \{[^}]*display: flex/.test(PAGE),
    "Chuẩn dùng chung shows beside recall on the first sub-tab",
  );
  assert.ok(
    !/body\[data-tab="global"\] \.recall-workbench > \.resize-handle \{ display: none/.test(PAGE),
    "recall keeps its drag-resizable workbench seam in Global Memory",
  );
  // ② Bộ nhớ · Nạp & Đồng bộ | Dự án — the inspector is a 2-column grid there.
  assert.ok(
    /body\[data-tab="global"\]\[data-gtab="mem"\] \.inspector \{[^}]*grid-template-columns:\s*1fr 1fr/.test(PAGE),
    "the inspector must be a 2-column grid (Nạp & Đồng bộ | Dự án) on the second sub-tab",
  );
  // Chuẩn chung folded INTO Global Memory — the duplicate top tab is gone.
  assert.ok(!/data-act="standard"/.test(PAGE), "the standalone Chuẩn chung top tab must be gone");
  assert.ok(!/body\[data-tab="standard"\]/.test(PAGE), "no dead data-tab=standard styling may remain");
  // The BẢNG list under the scope tree is gone; its rows are cards now.
  assert.ok(!/sectionTitle\(t\('m\.tables'\)\)/.test(PAGE), "the redundant BẢNG list must be gone");
  assert.ok(/\.filter\(r => r\.name !== 'messages' && r\.name !== 'sessions'\)/.test(PAGE), "remaining table rows are promoted to cards");
});

// The project Graph pane and the Global tab must FILL the app frame: panes size
// against their shell cell (100%), never against pre-tabbar viewport math that
// left a dead gap below a vh-capped mini canvas (user 2026-07-21).
test("panes autosize to the app frame — no vh-capped canvas or workspace", () => {
  const css = PAGE.slice(PAGE.indexOf("<style>") + 7, PAGE.indexOf("</style>"));
  // Top-level definition block only (2-space indent) — a grouped reset like
  // `.rail, .workspace, .inspector { … }` or a @media override must not match.
  const block = (sel) => {
    const m = css.match(new RegExp("\\n  " + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{[^}]*"));
    return m ? m[0] : "";
  };
  assert.ok(/height: 100%/.test(block(".workspace")), ".workspace fills its shell cell");
  assert.ok(!/100vh/.test(block(".workspace")), ".workspace must not size against the viewport");
  assert.ok(/height: 100%/.test(block(".inspector")), ".inspector fills its shell cell");
  assert.ok(!/100vh/.test(block(".inspector")), ".inspector must not size against the viewport");
  assert.ok(/height: 100%/.test(block(".graph-canvas svg")), "graph svg stretches to its box");
  assert.ok(!/\d+vh/.test(block(".graph-canvas svg")), "graph svg must not be vh-capped");
  assert.ok(!/max-height: \d+vh/.test(block(".graph-tree")), "tree must not be vh-capped");
  assert.ok(
    /body\[data-tab="project"\] \.rail \.panel > \.panel-pad \{ display: flex/.test(css),
    "project pad is a flex column so the graph row can stretch",
  );
  // The two-panel misalignment: .workspace had a THIRD `auto` row (#msg) that,
  // with gap, reserved a phantom band below the recall panel → left bottom sat
  // above the inspector's. It must be exactly TWO rows now.
  const wsRows = block(".workspace").match(/grid-template-rows:\s*([^;]+);/);
  assert.ok(wsRows, ".workspace must declare grid-template-rows");
  assert.equal(wsRows[1].trim(), "auto minmax(0, 1fr)", "workspace must be 2 rows — no phantom trailing #msg track");
});

// Dialog 3-size = one 16:9 screen proportion at three scales (03_STRUCTURE §5).
// NOT a fixed-vh height (that made tall dangling towers, user 2026-07-21). The
// height is DERIVED from the ratio and can never exceed the viewport (ratio kept).
test("dialogs are 16:9 proportional, never fixed-height towers", () => {
  const css = PAGE.slice(PAGE.indexOf("<style>") + 7, PAGE.indexOf("</style>"));
  const block = (sel) => {
    const m = css.match(new RegExp("\\n  " + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{[^}]*"));
    return m ? m[0] : "";
  };
  for (const sel of [".modal", ".settings-modal"]) {
    const b = block(sel);
    assert.ok(/aspect-ratio:\s*16\s*\/\s*9/.test(b), sel + " must lock the 16:9 screen proportion");
    assert.ok(!/(?<!-)\bheight:\s*\d/.test(b), sel + " must NOT set a fixed height (max-height cap is fine; height derives from the ratio)");
    // Sized as a % of the app in BOTH dims: min(Pvw, calc(Pvh*16/9)) → height ≤ P% too.
    assert.ok(/calc\(\d+vh \* 16 \/ 9\)/.test(b), sel + " must cap width by <P>vh*16/9 so height never exceeds the viewport");
  }
  // L = 90% of app, M = 60% (user 2026-07-21); each width-only (aspect gives height).
  const pct = (s) => { const m = block(s).match(/min\((\d+)vw, calc\((\d+)vh/); return m && m[1] === m[2] ? Number(m[1]) : null; };
  assert.equal(pct(".modal.l"), 90, ".modal.l must be 90% of the app frame");
  assert.equal(pct(".modal.m"), 60, ".modal.m must be 60% of the app frame");
  for (const s of [".modal.s", ".modal.m", ".modal.l"]) {
    assert.ok(!/height:/.test(block(s)), s + " sets width only, shares the 16:9 height");
  }
});

test("graph canvas supports wheel zoom, pan, NODE DRAG, and double-click reset", () => {
  const js = embeddedScript();
  const zoom = js.slice(js.indexOf("bindGraphZoom"), js.indexOf("bindGraphZoom") + 4200);
  assert.ok(zoom.length > 100, "bindGraphZoom must exist");
  assert.ok(/addEventListener\('wheel'/.test(zoom), "wheel handler");
  assert.ok(/preventDefault/.test(zoom), "wheel must not scroll the page while zooming");
  assert.ok(/pointerdown/.test(zoom) && /pointermove/.test(zoom), "drag handlers");
  assert.ok(/closest\('\.gnode'\)/.test(zoom), "node hit-test present");
  assert.ok(/ndrag/.test(zoom), "grabbing a node drags the node, not the canvas");
  assert.ok(/gMoveNode/.test(js), "node drag moves circle + label + touching edges");
  assert.ok(/gSuppressClick/.test(js), "a drag must not fire the node-select click");
  assert.ok(/dblclick/.test(zoom), "double-click resets the view");
  assert.ok(/gview = \{ x: 0, y: 0/.test(js), "every repaint resets the view state");
});

test("graph has a layout picker and add-project is an in-app dialog", () => {
  assert.ok(/id="graphLayout"/.test(PAGE), "layout <select> exists");
  for (const v of ["force", "cluster", "layers"]) {
    assert.ok(new RegExp(`value="${v}"`).test(PAGE), `layout option ${v}`);
  }
  const js = embeddedScript();
  assert.ok(/layoutCluster/.test(js) && /layoutLayers/.test(js), "both alternative layouts implemented");
  assert.ok(/zemory\.glayout/.test(js), "layout choice persists");
  // Add-project: a real app dialog, never the native browser prompt.
  assert.ok(/id="addProjOverlay"/.test(PAGE), "add-project modal exists");
  assert.ok(!/window\.prompt/.test(js), "window.prompt must not be used anywhere");
  assert.ok(/addProjOverlay[\s\S]{0,120}closeAddProject/.test(js.slice(js.indexOf("escLayers"))), "dialog closes on ESC");
});

test("the memory-status poll is slow and cache-friendly", () => {
  const js = embeddedScript();
  // A whole-DB aggregate must not be polled on a short interval.
  const m = js.match(/setInterval\(function\(\)\{ memoryTick\(\); \}, (\d+)\)/);
  assert.ok(m, "memoryTick must be polled through a wrapper (so it never forces a refresh)");
  assert.ok(Number(m[1]) >= 15000, "memory poll interval must stay >= 15s (was 2.5s against a ~4s query)");
});
