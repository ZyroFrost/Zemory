#!/usr/bin/env node
// fx_check - a Glass app ports EVERY effect of its approved template (skill app-glass §3); none goes missing unseen.
//
// The template names each effect with an `FX: <name>` marker (CSS comment or JS comment); the port keeps the same marker
// next to the code that carries the effect. This check lists the template's markers and the app's markers and reports every
// template effect the app does not carry.
//
// Config: frontend/config/ui.json of the repo
//   { "style": "Glass",
//     "template": "<path to the approved template, relative to ui.json>",
//     "fx_dropped": { "<effect>": "<why it is not ported, and who approved it>" } }   (optional; every entry needs a reason)
//
// Run from the repo root:  node scripts/fx_check.mjs [--config frontend/config/ui.json] [--src frontend/src]
//                          node scripts/fx_check.mjs --self-test
// Exit codes: 0 green · 1 an effect is missing or a dropped entry is wrong · 3 not checked (config or template not found).
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

const arg = (key, fallback) => {
  const i = process.argv.indexOf(key);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const SOURCE = /\.(css|scss|ts|tsx|js|jsx|mjs|vue|svelte|html)$/;
const marks = text => new Set([...text.matchAll(/FX:\s*([a-z][a-z0-9-]*)/g)].map(m => m[1]));

// The judgement, kept apart from files so the self-test can feed it strings.
export function judge(templateText, sourceTexts, dropped = {}) {
  const want = marks(templateText);
  const have = new Set();
  for (const text of sourceTexts) for (const name of marks(text)) have.add(name);
  const findings = [];
  for (const name of [...want].sort()) {
    if (have.has(name)) continue;
    if (name in dropped) continue;
    findings.push(`missing effect "${name}": the template has FX: ${name}, the app carries no FX: ${name} marker`);
  }
  for (const [name, why] of Object.entries(dropped)) {
    if (typeof why !== 'string' || why.trim().length < 10) findings.push(`dropped "${name}" has no reason (write why and who approved it)`);
    if (!want.has(name)) findings.push(`dropped "${name}" is not an effect of the template (stale entry)`);
    else if (have.has(name)) findings.push(`dropped "${name}" is ported after all (remove the entry)`);
  }
  return {want: want.size, have: [...have].filter(n => want.has(n)).length, findings};
}

function selfTest() {
  const tpl = '/* FX: glass */ /* ---------- FX: card-flip ---------- */ // FX: lens';
  const cases = [
    ['every effect ported', [tpl], {}, 0],
    ['one effect missing', ['/* FX: glass */ // FX: lens'], {}, 1],
    ['missing but dropped with a reason', ['/* FX: glass */ // FX: lens'], {'card-flip': 'removed on member cards, user approved'}, 0],
    ['dropped without a reason', ['/* FX: glass */ // FX: lens'], {'card-flip': ''}, 1],
    ['dropped but ported', [tpl], {'lens': 'not needed here, user approved'}, 1],
    ['dropped name not in the template', [tpl], {'confetti': 'not needed here, user approved'}, 1],
  ];
  let bad = 0;
  for (const [label, src, dropped, expected] of cases) {
    const got = judge(tpl, src, dropped).findings.length;
    const ok = expected === 0 ? got === 0 : got >= expected;
    if (!ok) bad++;
    console.log(`  ${ok ? 'OK ' : 'BAD'} ${label} (${got} finding(s))`);
  }
  console.log(`\n[fx-check] self-test: ${bad ? 'FAILED' : 'OK - every case judged right'}`);
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

const root = process.cwd();
const cfgPath = path.resolve(root, arg('--config', 'frontend/config/ui.json'));
const srcDir = path.resolve(root, arg('--src', 'frontend/src'));
const stop = (code, msg) => {
  console.log(`[fx-check] ${msg}`);
  process.exit(code);
};
if (!existsSync(cfgPath)) stop(3, `NOT CHECKED (3): no ${path.relative(root, cfgPath)} - declare {"style": "Glass", "template": "<path>"}`);
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
if (cfg.style !== 'Glass') stop(0, `GREEN: not a Glass app (style ${cfg.style ?? 'none'}) - nothing to compare`);
const tplPath = cfg.template ? path.resolve(path.dirname(cfgPath), cfg.template) : '';
if (!tplPath || !existsSync(tplPath)) stop(3, `NOT CHECKED (3): template not found (${cfg.template ?? 'no "template" key'})`);
if (!existsSync(srcDir)) stop(3, `NOT CHECKED (3): no source folder ${path.relative(root, srcDir)}`);

const texts = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (SOURCE.test(name)) texts.push(readFileSync(p, 'utf8'));
  }
};
walk(srcDir);

const {want, have, findings} = judge(readFileSync(tplPath, 'utf8'), texts, cfg.fx_dropped || {});
for (const f of findings) console.log(`  [FX] ${f}`);
console.log(`\n[fx-check] ${findings.length ? 'RED' : 'GREEN'}: ${have} of ${want} template effects ported` +
  `${findings.length ? ` - ${findings.length} finding(s)` : ''}`);
process.exit(findings.length ? 1 : 0);
