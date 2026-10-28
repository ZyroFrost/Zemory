#!/usr/bin/env node
// ui_check.mjs - the machine check of the measurable surface rules of Skill_Dev_AppDesign (installed by Skill_Dev_AppDesign).
//
// Opens every page of the app at every width in a real browser (Edge/Chrome through the DevTools protocol) and measures the
// rendered page - never a screenshot by eye. Config: ui_check.json at the repo root (or --config <file>):
//   { "url": "http://127.0.0.1:5173/" | "file:///.../page.html",
//     "pages": [ { "name": "users", "hash": "users" } | { "name": "access", "click": "#nav [data-to=access]" } ],
//     "widths": [1920, 1440, 1100, 900, 390],      // optional; <= 768 is measured as a phone
//     "settle_ms": 900,                              // optional: wait after each navigation (animations)
//     "ignore": [".carousel *", "#confetti"],         // optional: selectors never judged
//     "codes": { "U4": { "min_fill": 0.6 } }          // optional: per-code options; "off": true turns one off (say why in the repo)
//   }
// Exit: 0 green · 1 errors (each printed with page, width, element) · 3 not fully checked (no browser / a page did not load).
// Codes (Skill_Dev_AppDesign › THE CHECKER):
//   U1 page scrolls sideways / a phone widens the layout     U2 an element sticks out of the window (clipped)
//   U3 controls on one row differ in height (> 0.6 px)       U4 dead space: a table or block fills too little of its frame
//   U5 text overlaps text or a chart inside one card          U6 a chart frame is empty (nothing drawn)
//   U7 a scroll area without scrollbar-gutter: stable        U8 a control without a readable label
//   U9 Vietnamese broken into '?' (encoding)
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
// --self-test: a page that breaks every rule once; the check must catch EVERY code (proves the measure can go red).
const SELF = args.includes("--self-test");
const FAULTY = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>body{margin:0;font:14px system-ui}.wide{width:calc(100vw + 40px);height:10px}.row button{height:36px}.row select{height:28px}
.frame{width:900px}.frame table{width:200px}.card{position:relative;width:300px}.chart{width:200px;height:80px}
.scroll{height:60px;overflow-y:auto}.card p{margin:0;line-height:20px}.card p.over{margin-top:-14px}</style></head><body>
<div class="wide">U1+U2</div><div class="row"><button>Lưu</button><select><option>a</option></select></div>
<div class="frame"><table><tr><td>U4</td></tr></table></div>
<div class="card"><p>Dòng một chữ dài</p><p class="over">Dòng hai đè lên</p></div>
<div class="chart"></div><div class="scroll">${"x<br>".repeat(20)}</div><button></button><p>Th?ng k?</p></body></html>`;
let cfgPath = opt("--config") || "ui_check.json";
if (SELF) { const d = mkdtempSync(path.join(tmpdir(), "_scratch_uicheck-self-")); writeFileSync(path.join(d, "f.html"), FAULTY);
  cfgPath = path.join(d, "c.json"); writeFileSync(cfgPath, JSON.stringify({ url: "file:///" + path.join(d, "f.html").replace(/\\/g, "/"),
    pages: [{ name: "faulty" }], widths: [1100], settle_ms: 100 })); process.on("exit", () => { try { rmSync(d, { recursive: true, force: true }); } catch {} }); }
if (!existsSync(cfgPath)) { console.error(`[ui-check] no ${cfgPath} - see Skill_Dev_AppDesign › THE CHECKER`); process.exit(3); }
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const WIDTHS = (opt("--widths") || "").split(",").filter(Boolean).map(Number).length
  ? opt("--widths").split(",").map(Number) : (cfg.widths || [1920, 1440, 1100, 900, 390]);
const SETTLE = cfg.settle_ms ?? 900;
const ONLY = opt("--page");
const codeOpt = c => (cfg.codes || {})[c] || {};

function findBrowser() {
  const c = [process.env.UI_CHECK_BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return c.find(p => p && existsSync(p));
}
const BROWSER = findBrowser();
if (!BROWSER) { console.error("[ui-check] no Edge/Chrome found (set UI_CHECK_BROWSER) - NOT checked"); process.exit(3); }

const PORT = 9300 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(path.join(tmpdir(), "_scratch_uicheck-"));
// No --hide-scrollbars: a real window has a vertical scrollbar, and `100vw` overflowing by its width is a bug to catch.
const proc = spawn(BROWSER, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0; const waiting = new Map();
const cmd = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; waiting.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || "evaluate failed"); return r.result.value; };

// One function runs inside the page and returns every finding for the current page + width.
const MEASURE = (ignore, o) => `(() => {
  const IGN = ${JSON.stringify(ignore)}, O = ${JSON.stringify(o)};
  const W = window.innerWidth, H = window.innerHeight, set = ${"${W_SET}"};
  const out = [], seen = new Set();
  const ign = e => IGN.some(s => { try { return e.closest(s); } catch { return false; } });
  const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '');
  const add = (code, e, msg) => { const k = code + name(e) + msg; if (seen.has(k)) return; seen.add(k); out.push({ code, el: e ? name(e) : '', msg }); };
  const doc = document.documentElement;
  // U1 - sideways scroll, and a phone that widened its layout to fit something too wide.
  if (doc.scrollWidth - doc.clientWidth > 0) add('U1', doc, 'page scrolls sideways by ' + (doc.scrollWidth - doc.clientWidth) + 'px');
  if (W > set + 0.5) add('U1', doc, 'layout widened to ' + W + 'px on a ' + set + 'px screen');
  const all = [...document.querySelectorAll('body *')].filter(e => !ign(e) && vis(e));
  const scrollParent = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
    const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return p; } return null; };
  const fixedOverlay = e => { const s = getComputedStyle(e); return (s.position === 'fixed' || s.position === 'absolute') && s.pointerEvents === 'none'; };
  // U2 - clipped at the window edge (not inside a frame that scrolls or clips it on purpose).
  for (const e of all) { if (fixedOverlay(e)) continue; const b = e.getBoundingClientRect();
    if ((b.right > set + 1 || b.left < -1) && !scrollParent(e)) {
      const p = e.parentElement && e.parentElement.getBoundingClientRect();
      if (!(p && (p.right > set + 1 || p.left < -1) && e.parentElement !== document.body && !scrollParent(e.parentElement)))
        add('U2', e, 'sticks out of the window: left ' + Math.round(b.left) + ' right ' + Math.round(b.right) + ' (window ' + set + ')'); } }
  // U3 - controls on one row: same height.
  const ctl = all.filter(e => e.matches('button,select,input:not([type=checkbox]):not([type=radio]):not([type=range]),[role=button],.btn'))
    .filter(e => !e.closest('[role=dialog]:not([open]), dialog:not([open])'));
  const rows = new Map();
  for (const e of ctl) { const b = e.getBoundingClientRect(); const row = e.parentElement;
    const k = row; if (!rows.has(k)) rows.set(k, []); rows.get(k).push({ e, h: b.height, mid: b.top + b.height / 2 }); }
  for (const [row, list] of rows) { if (list.length < 2) continue;
    const line = list.filter(x => Math.abs(x.mid - list[0].mid) < 12); if (line.length < 2) continue;
    const hs = line.map(x => x.h), d = Math.max(...hs) - Math.min(...hs);
    if (d > 0.6) add('U3', row, 'controls on one row: heights ' + hs.map(h => Math.round(h * 10) / 10).join(' / ')); }
  // U4 - dead space: a table, or the only block of a frame, filling too little of its frame's width.
  const minFill = O.U4?.min_fill ?? 0.6;
  for (const t of all.filter(e => e.tagName === 'TABLE')) { const f = t.parentElement; if (!f) continue;
    const fw = f.clientWidth - parseFloat(getComputedStyle(f).paddingLeft) - parseFloat(getComputedStyle(f).paddingRight);
    const tw = t.getBoundingClientRect().width; if (fw > 200 && tw / fw < minFill)
      add('U4', t, 'table fills ' + Math.round(100 * tw / fw) + '% of its frame (' + Math.round(tw) + ' of ' + Math.round(fw) + 'px)'); }
  // U5 - text over text, or text over a drawing (chart >= 60x30), inside the page flow. Not judged: icons (small svg), a label
  // placed on a chart on purpose (position absolute/fixed - the centre of a ring), the two parts of one control.
  const textLeaf = e => e.childElementCount === 0 && e.textContent.trim().length > 1 && !e.closest('svg');
  const drawing = e => e.matches('svg,canvas') && (r => r.width >= 60 && r.height >= 30)(e.getBoundingClientRect());
  // placed on purpose: the element, or a wrapper of it below the box both share, is absolute/fixed (a label in a ring's centre)
  const placed = (e, other) => { for (let p = e; p && p !== document.body && !p.contains(other); p = p.parentElement)
    if (/^(absolute|fixed)$/.test(getComputedStyle(p).position)) return true; return false; };
  const leaves = all.filter(e => textLeaf(e) || drawing(e));  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], b = leaves[j]; if (a.contains(b) || b.contains(a)) continue;
    if (drawing(a) && drawing(b)) continue;
    if (placed(a, b) || placed(b, a)) continue;
    if (a.closest('button,label,select,a') && a.closest('button,label,select,a') === b.closest('button,label,select,a')) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (x > 4 && y > 4 && x * y > 0.15 * Math.min(ra.width * ra.height, rb.width * rb.height)) add('U5', a, 'overlaps ' + name(b)); }
  // U6 - an empty chart: a chart frame with nothing drawn in it.
  for (const c of all.filter(e => /chart|bars|spark|donut|ring|graph/.test(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className))) {
    const b = c.getBoundingClientRect(); if (b.height < 40 || b.width < 80) continue;
    const drawn = [...c.querySelectorAll('rect,path,circle,polyline,line,i,span,div,canvas')].filter(x => { const r = x.getBoundingClientRect();
      return r.height > 2 && r.width > 1 && !/^\\s*\\d*\\s*[a-zA-Z]*\\s*$/.test(x.textContent || '') || x.tagName !== 'SPAN'; })
      .filter(x => { const r = x.getBoundingClientRect(); return r.height > 2 && r.width > 1; });
    if (drawn.length === 0) add('U6', c, 'chart frame ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' has nothing drawn'); }
  // U7 - scroll areas keep a stable scrollbar gutter.
  for (const e of all) { const s = getComputedStyle(e); if (!/(auto|scroll)/.test(s.overflowY) || e.scrollHeight <= e.clientHeight + 1) continue;
    if (s.scrollbarGutter !== 'stable' && s.scrollbarGutter !== 'stable both-edges') add('U7', e, 'scroll area without scrollbar-gutter: stable'); }
  // U8 - every control has a readable label.
  for (const e of ctl.concat(all.filter(e => e.matches('a[href]')))) {
    const label = (e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || e.textContent || '').trim()
      || (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || (e.querySelector('img[alt]') || {}).alt;
    if (!label) add('U8', e, 'control without a readable label'); }
  // U9 - Vietnamese broken into '?': a '?' inside a word, or a '?' shown alone as a value.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) { const t = n.nodeValue; const p = n.parentElement; if (!p || !vis(p) || ign(p)) continue;
    if (/[A-Za-zÀ-ỹ]\\?[A-Za-zÀ-ỹ]/.test(t) || /^\\s*\\?\\s*$/.test(t)) add('U9', p, 'broken text: "' + t.trim().slice(0, 30) + '"'); }
  return out;
})()`;

let code = 0;
const findings = [];
try {
  let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); } }
  if (!tabs) throw Object.assign(Error("browser did not open its DevTools port"), { notChecked: true });
  ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id);
    m.error ? p.rej(Error(JSON.stringify(m.error))) : p.res(m.result); } };
  await cmd("Page.enable"); await cmd("Runtime.enable");
  const pages = (cfg.pages || [{ name: "start" }]).filter(p => !ONLY || p.name === ONLY);
  for (const w of WIDTHS) {
    const phone = w <= 768;
    await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
    await cmd("Page.navigate", { url: cfg.url }); await sleep(SETTLE + 600);
    for (const p of pages) {
      if (p.hash !== undefined) await ev(`location.hash = ${JSON.stringify(p.hash)}`);
      if (p.click) await ev(`(document.querySelector(${JSON.stringify(p.click)}) || {click(){ throw Error('no ' + ${JSON.stringify(p.click)}) }}).click()`);
      await sleep(SETTLE);
      const list = await ev(MEASURE(cfg.ignore || [], cfg.codes || {}).replace("${W_SET}", String(w)));
      for (const f of list) { if (codeOpt(f.code).off) continue; findings.push({ page: p.name, width: w, ...f }); }
    }
  }
} catch (e) { console.error("[ui-check] NOT fully checked:", e.message); code = 3; }
finally { try { ws && ws.close(); } catch {} proc.kill(); await sleep(300); try { rmSync(profile, { recursive: true, force: true }); } catch {} }

const byCode = {};
for (const f of findings) { (byCode[f.code] = byCode[f.code] || []).push(f); console.log(`  [${f.code}] ${f.page} @${f.width}  ${f.el}  ${f.msg}`); }
const summary = Object.entries(byCode).map(([c, l]) => `${c}:${l.length}`).join(" ");
if (SELF && code !== 3) {
  const want = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9"], missed = want.filter(c => !byCode[c]);
  console.log(`\n[ui-check] self-test: ${missed.length ? "BROKEN - not caught: " + missed.join(" ") : "OK - every code caught on the faulty page"}`);
  process.exit(missed.length ? 1 : 0);
}
if (code !== 3) code = findings.length ? 1 : 0;
console.log(`\n[ui-check] ${code === 0 ? "GREEN" : code === 3 ? "NOT CHECKED (3)" : "RED"}: ${findings.length} finding(s)${summary ? " - " + summary : ""}`);
process.exit(code);
