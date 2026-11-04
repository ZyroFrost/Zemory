// crossfilter_check - the measurable rules of skill app-cross-filter, run on a live report page by the repo's browser test.
//
// RULES are browser expressions that return true or a sentence saying what broke (evaluate once the page has settled).
// INTERACTION is an async browser expression (evaluate with awaitPromise): it clicks a data point and measures the page.
// SELF_TEST holds a good page and a faulty page: the good one passes every rule and the interaction, the faulty one fails each,
// which proves the check can go red. The rules read only the DOM, so they hold for any framework.
//
//   import {RULES, INTERACTION, SELF_TEST} from '../scripts/crossfilter_check.mjs';
//   for (const r of RULES) { const v = await evaluate(r.check); if (v !== true) fail(r.id + ': ' + v); }
//   const v = await evaluate(INTERACTION, {awaitPromise: true}); if (v !== true) fail('cf-interaction: ' + v);
//   node scripts/crossfilter_check.mjs --list      prints the rules

/** Rules on a report page as it stands. A page without any data point is not a report page: every rule passes there. */
export const RULES = [
  {
    id: 'cf-points',
    rule: 'every data point carries data-cf-value, role=button, tabindex 0, aria-pressed and a readable name',
    check: `(() => {
      for (const p of document.querySelectorAll('[data-cf-dim]')) {
        const name = (p.getAttribute('title') || p.getAttribute('aria-label') || p.textContent || '').trim();
        const miss = [!p.hasAttribute('data-cf-value') && 'data-cf-value', p.getAttribute('role') !== 'button' && p.tagName !== 'TR' && 'role=button',
          p.tabIndex !== 0 && 'tabindex 0', !p.hasAttribute('aria-pressed') && 'aria-pressed', !name && 'a readable name'].filter(Boolean);
        if (miss.length) return 'a data point of ' + p.dataset.cfDim + ' lacks ' + miss.join(', ');
      }
      return true;
    })()`,
  },
  {
    id: 'cf-visuals',
    rule: 'a report page has data points in at least two visuals (one visual alone has nothing to filter)',
    check: `(() => {
      const points = [...document.querySelectorAll('[data-cf-dim]')];
      if (!points.length) return true;
      const visuals = new Set(points.map(p => p.closest('.card, section, figure') || p.parentElement));
      return visuals.size >= 2 ? true : 'data points in ' + visuals.size + ' visual only';
    })()`,
  },
];

/** Click a point of a visual with two or more points; the page must answer as skill app-cross-filter §1-2 says. */
export const INTERACTION = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const points = [...document.querySelectorAll('[data-cf-dim]')];
  if (!points.length) return true;
  const visualOf = p => p.closest('.card, section, figure') || p.parentElement;
  const target = points.find(p => points.some(q => q !== p && visualOf(q) === visualOf(p) && q.dataset.cfDim === p.dataset.cfDim));
  if (!target) return 'no visual has two points of one field to pick from';
  const dim = target.dataset.cfDim, value = target.dataset.cfValue;
  // The page may draw itself again after a click: every measure reads the DOM afresh.
  const find = () => document.querySelector('[data-cf-dim="' + CSS.escape(dim) + '"][data-cf-value="' + CSS.escape(value) + '"]');
  const others = () => {
    const home = find() && visualOf(find());
    return [...new Set([...document.querySelectorAll('[data-cf-dim]')].map(visualOf))].filter(v => v && v !== home).map(v => v.innerText).join('|');
  };
  const kpis = () => [...document.querySelectorAll('.kpi-card, [data-kpi]')].map(k => k.innerText).join('|');
  const before = others() + '#' + kpis();
  find().click();
  await wait(500);
  const picked = find();
  if (!picked || picked.getAttribute('aria-pressed') !== 'true') return 'the clicked point is not marked picked (aria-pressed)';
  const siblings = [...document.querySelectorAll('[data-cf-dim="' + CSS.escape(dim) + '"]')].filter(p => p !== picked && visualOf(p) === visualOf(picked));
  if (siblings.length && !siblings.some(p => p.classList.contains('cf-dim'))) return 'the other points of the clicked visual are not dimmed (cf-dim)';
  if (!document.querySelector('#cf-chips')) return 'no chips (#cf-chips) show the selection';
  if (!document.querySelector('#cf-clear')) return 'no clear button (#cf-clear)';
  if (others() + '#' + kpis() === before) return 'nothing else on the page changed after the click';
  find().click();
  await wait(500);
  if (find().getAttribute('aria-pressed') === 'true' || document.querySelector('#cf-chips')) return 'a second click on the only picked point does not clear';
  find().click();
  await wait(400);
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  await wait(500);
  if (document.querySelector('#cf-chips')) return 'Escape does not clear the selection';
  return true;
})()`;

/** Two pages for the repo's test to load before the real ones: GOOD passes everything, FAULTY fails every rule and the interaction. */
const PAGE = (body, script) => `<!doctype html><html><head><meta charset="utf-8"><style>.cf-dim{opacity:.3}</style></head><body>${body}<script>${script}</script></body></html>`;
export const SELF_TEST = {
  good: PAGE(`<div id="lead"></div><div class="card" id="a"></div><div class="card" id="b"></div><div class="kpi-card" id="k"></div>`, `
    const rows = [{s: 'A', h: '1'}, {s: 'A', h: '2'}, {s: 'B', h: '2'}];
    let sel = {};
    const pick = (d, v, add) => { const cur = sel[d] || []; if (add) { sel = {...sel, [d]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]}; if (!sel[d].length) delete sel[d]; }
      else sel = cur.length === 1 && cur[0] === v && Object.keys(sel).length === 1 ? {} : {[d]: [v]}; draw(); };
    const keep = except => rows.filter(r => Object.entries(sel).every(([d, vs]) => d === except || vs.includes(d === 's' ? r.s : r.h)));
    const visual = (id, d, key) => { const counts = {}; for (const r of keep(d)) counts[key(r)] = (counts[key(r)] || 0) + 1;
      document.getElementById(id).innerHTML = Object.entries(counts).map(([v, n]) => { const on = (sel[d] || []).includes(v), dim = sel[d] && !on;
        return '<span role="button" tabindex="0" title="' + v + '" data-cf-dim="' + d + '" data-cf-value="' + v + '" aria-pressed="' + on + '" class="' + (dim ? 'cf-dim' : '') + '">' + v + ':' + n + '</span>'; }).join(' '); };
    const draw = () => { visual('a', 's', r => r.s); visual('b', 'h', r => r.h); document.getElementById('k').textContent = 'rows ' + keep().length;
      document.getElementById('lead').innerHTML = Object.keys(sel).length ? '<div id="cf-chips">' + JSON.stringify(sel) + '<button id="cf-clear">x</button></div>' : '';
      document.querySelectorAll('[data-cf-dim]').forEach(p => p.onclick = e => pick(p.dataset.cfDim, p.dataset.cfValue, e.ctrlKey)); };
    addEventListener('keydown', e => { if (e.key === 'Escape') { sel = {}; draw(); } });
    draw();`),
  faulty: PAGE(`<div class="card"><span data-cf-dim="s">A</span><span data-cf-dim="s">B</span></div>`, `
    document.querySelectorAll('[data-cf-dim]').forEach(p => p.onclick = () => {});`),
};

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()) && process.argv.includes('--list')) {
  for (const r of RULES) console.log(`${r.id.padEnd(15)} ${r.rule}`);
  console.log(`${'cf-interaction'.padEnd(15)} a click picks the point, dims its siblings, shows chips, changes another visual; a second click and Escape clear`);
}
