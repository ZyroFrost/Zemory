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
  {
    id: 'filter-one',
    rule: 'a report page has ONE filter: each field a visual filters on is a filter of the page bar (data-filter-id = the field) that a click on a point sets - no second row of chips or filters beside it (v3, user 06/11)',
    check: `(() => {
      const dims = [...new Set([...document.querySelectorAll('[data-cf-dim]')].flatMap(p => p.dataset.cfDim.split('|')))];
      if (!dims.length) return true;
      if (document.querySelector('#cf-chips')) return 'a second row of chips (#cf-chips) beside the page filter';
      const missing = dims.filter(d => !document.querySelector('[data-filter-id="' + CSS.escape(d) + '"]'));
      return missing.length ? 'a field with no filter on the page bar: ' + missing.join(', ') : true;
    })()`,
  },
  {
    id: 'cf-every-mark',
    rule: 'every part of a visual is a cross-filter point, as in Power BI (v3, user 06/11): a stacked part, a line dot, a bar, a column, a slice, a key entry - the mark itself or what holds it carries data-cf-value with role=button and tabindex 0; a visual of measures side by side (data-rp-free) has no field and is left out',
    check: `(() => {
      const live = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const marks = [...document.querySelectorAll('[data-rp-visual]:not([data-rp-visual="cards"]) [data-rp-mark]')].filter(m => live(m) && !m.closest('table') && !m.closest('[data-rp-free]'));
      const keys = [...document.querySelectorAll('[data-rp-legend] > *:not([data-rp-free])')].filter(live);
      const ok = e => { const p = e.closest('[data-cf-value]'); return p && (p.getAttribute('role') === 'button' || p.tagName === 'TR') && p.tabIndex === 0; };
      const bad = [...marks, ...keys].filter(e => !ok(e));
      return bad.length ? bad.length + '/' + (marks.length + keys.length) + ' parts of the visuals cannot be clicked' : true;
    })()`,
  },
  {
    id: 'cf-legend-filter',
    rule: 'every legend entry is a real filter of the page bar (v4, the user 09/11: "mọi legend đều phải là 1 filter thật nối dc vào bộ khung filter ở trên"): each entry of a [data-rp-legend] is a point on a field (data-cf-dim; a legend of measures is the field measure) and that field has its filter on the page bar (data-filter-id or the id of the field); (v5) a line of the whole series is a legend entry too, picked on the measure filter',
    check: `(() => {
      const live = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const entries = [...document.querySelectorAll('[data-rp-legend] > *')].filter(live);
      if (!entries.length) return true;
      const dimOf = e => (e.closest('[data-cf-dim]') || e.querySelector('[data-cf-dim]'))?.dataset.cfDim;
      const loose = entries.find(e => !dimOf(e));
      if (loose) return 'a legend entry that is no filter (no data-cf-dim): ' + (loose.textContent || '').trim().slice(0, 30);
      const bar = '.page-toolbar, #page-bar, #filter-pop, #filter-row, #filter-lead';
      const has = d => [...document.querySelectorAll(bar)].some(b => b.querySelector('[data-filter-id="' + CSS.escape(d) + '"], #' + CSS.escape(d)))
        || Boolean(document.querySelector('[data-filter-id="' + CSS.escape(d) + '"]'));
      const missing = [...new Set(entries.flatMap(e => dimOf(e).split('|')))].filter(d => !has(d));
      return missing.length ? 'a legend of a field with no filter on the page bar: ' + missing.join(', ') : true;
    })()`,
  },
  {
    id: 'cf-legend-one-line',
    rule: 'a chip legend stands on one line (v5, the user 09/11: "legend ko dc xuống hàng ntn, đây là luật, nếu quá dài thì phải là chart dài", "kể cả là trong 1 tag"): its chips share one top, the legend never runs past its box, and the text of a chip never wraps; the vertical key of a donut (.legend) is no chip legend',
    check: `(() => {
      for (const lg of document.querySelectorAll('[data-rp-legend]')) {
        if (!lg.getClientRects().length || lg.matches('.legend') || lg.closest('[data-rp-visual="donut"]')) continue;
        const chips = [...lg.children].filter(c => c.getClientRects().length);
        if (!chips.length) continue;
        const tops = new Set(chips.map(c => Math.round(c.getBoundingClientRect().top / 3)));
        if (tops.size > 1) return 'a legend on ' + tops.size + ' lines (a long legend makes the chart take the whole row): ' + (chips[0].textContent || '').trim().slice(0, 20);
        if (lg.scrollWidth > lg.clientWidth + 1) return 'a legend runs past its box: ' + (chips[0].textContent || '').trim().slice(0, 20);
        for (const c of chips) {
          const r = document.createRange(); r.selectNodeContents(c);
          const lines = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top / 3))).size;
          if (lines > 1) return 'a legend chip wraps its words: ' + (c.textContent || '').trim().slice(0, 30);
        }
      }
      return true;
    })()`,
  },
];

/** (v4) A click on the first legend entry sets its field's filter on the page bar to that entry and the filter button counts one
 *  more; a second click takes it off (skill app-cross-filter §1, cf-legend-click). Async: awaitPromise. */
export const LEGEND_CLICK = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const live = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const first = [...document.querySelectorAll('[data-rp-legend] > *')].find(live);
  if (!first) return true;
  const point = first.closest('[data-cf-value]') || first.querySelector('[data-cf-value]');
  if (!point) return 'a legend entry that is no filter (no data-cf-value): ' + (first.textContent || '').trim().slice(0, 30);
  const dim = point.dataset.cfDim.split('|')[0], value = point.dataset.cfValue.split('|')[0];
  const count = () => Number(document.querySelector('#filter-toggle .filter-count')?.textContent || 0);
  const field = () => document.querySelector('[data-filter-id="' + CSS.escape(dim) + '"]') || document.getElementById(dim);
  const again = () => document.querySelector('[data-rp-legend] [data-cf-dim="' + CSS.escape(point.dataset.cfDim) + '"][data-cf-value="' + CSS.escape(point.dataset.cfValue) + '"]')
    || document.querySelector('[data-cf-dim="' + CSS.escape(point.dataset.cfDim) + '"][data-cf-value="' + CSS.escape(point.dataset.cfValue) + '"]');
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await wait(300);
  const counted = count();
  point.click(); await wait(500);
  if (!field()) return 'the legend of ' + dim + ' has no filter on the page bar';
  if (count() !== counted + 1) return 'a click on the legend entry ' + value + ' is not counted by the filter button (' + counted + ' -> ' + count() + ')';
  const shown = (field().textContent || '') + ' ' + (field().value || '') + ' ' + (field().getAttribute('data-value') || '') + ' ' + (field().getAttribute('aria-label') || '');
  const name = (point.getAttribute('title') || point.getAttribute('aria-label') || point.textContent || '').trim();
  if (!shown.includes(value) && !(name && shown.includes(name.split(':')[0].trim()))) return 'the filter ' + dim + ' does not show the legend entry ' + value + ' it was set to';
  // (v5) the series of that entry is lit and the rest dimmed, in the chart of the legend
  const chart = point.closest('[data-rp-visual], .card');
  const dimmed = chart ? chart.querySelectorAll('.cf-dim').length : 0;
  again()?.click(); await wait(500);
  if (count() !== counted) return 'a second click on the legend entry does not take the filter off';
  if (chart && !dimmed) return 'a click on the legend entry ' + value + ' dims nothing in its chart - the series is not lit against the rest';
  return true;
})()`;

/** (v5) The other way: setting a field's slicer on the page bar lights the matching points and dims the others (the bar and the
 *  picks are one). Opens the frame slicer of the first field with points, ticks the value of a point, applies, measures, unticks.
 *  Async: awaitPromise. */
export const FILTER_TO_CHART = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const points = [...document.querySelectorAll('[data-cf-dim][data-cf-value]')].filter(p => p.getClientRects().length);
  const point = points.find(p => document.querySelector('[data-filter-id="' + CSS.escape(p.dataset.cfDim.split('|')[0]) + '"] .slicer-btn'));
  if (!point) return points.length && points.some(p => !document.querySelector('[data-filter-id="' + CSS.escape(p.dataset.cfDim.split('|')[0]) + '"]'))
    ? 'a field of the page has no slicer on the bar: ' + points[0].dataset.cfDim : true;
  const dim = point.dataset.cfDim.split('|')[0], value = point.dataset.cfValue.split('|')[0];
  const name = (point.getAttribute('title') || point.getAttribute('aria-label') || point.textContent || '').split(':')[0].trim();
  const tick = async () => {
    // the page draws itself again after a pick: the slicer is found afresh each time
    const place = [...document.querySelectorAll('[data-filter-id="' + CSS.escape(dim) + '"]')].find(p => p.querySelector('.slicer-btn'));
    if (!place) return false;
    const pop = document.getElementById('filter-pop');
    if (pop && pop.contains(place) && pop.hidden) { document.getElementById('filter-toggle')?.click(); await wait(300); }
    place.querySelector('.slicer-btn').click(); await wait(300);
    const menu = document.getElementById(dim + '-menu') || place.querySelector('.slicer-menu');
    const item = menu && [...menu.querySelectorAll('.slicer-item')].find(i => { const t = (i.textContent || '').trim(); return t === value || t === name; });
    if (!item) return false;
    item.querySelector('input').click(); await wait(200);
    document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); await wait(150);
    const apply = document.getElementById('filter-apply');
    if (apply && !apply.disabled && apply.getClientRects().length) { apply.click(); await wait(400); }
    return true;
  };
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await wait(300);
  if (!(await tick())) return 'the slicer of ' + dim + ' does not offer the value of its point: ' + value;
  await wait(400);
  const same = [...document.querySelectorAll('[data-cf-dim="' + CSS.escape(point.dataset.cfDim) + '"]')].filter(p => p.getClientRects().length);
  const lit = same.some(p => p.dataset.cfValue === point.dataset.cfValue && (p.getAttribute('aria-pressed') === 'true' || p.classList.contains('cf-picked')));
  const dimmed = same.some(p => p.classList.contains('cf-dim'));
  await tick(); await wait(300);
  return lit || dimmed || 'the slicer of ' + dim + ' set to ' + value + ' lights nothing on the charts (the bar and the picks are not one)';
})()`;

/** Click a point of a visual with two or more points; the page must answer as skill app-cross-filter §1-2 says. */
export const INTERACTION = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const points = [...document.querySelectorAll('[data-cf-dim]')];
  if (!points.length) return true;
  const visualOf = p => p.closest('.card, section, figure') || p.parentElement;
  const target = points.find(p => points.some(q => q !== p && visualOf(q) === visualOf(p) && q.dataset.cfDim === p.dataset.cfDim));
  if (!target) return 'no visual has two points of one field to pick from';
  if (!target.dataset.cfValue) return 'a point of ' + target.dataset.cfDim + ' carries no data-cf-value to pick';
  const dim = target.dataset.cfDim, value = target.dataset.cfValue;
  // The page may draw itself again after a click: every measure reads the DOM afresh.
  const find = () => document.querySelector('[data-cf-dim="' + CSS.escape(dim) + '"][data-cf-value="' + CSS.escape(value) + '"]');
  const others = () => {
    const home = find() && visualOf(find());
    return [...new Set([...document.querySelectorAll('[data-cf-dim]')].map(visualOf))].filter(v => v && v !== home).map(v => v.innerText).join('|');
  };
  const kpis = () => [...document.querySelectorAll('.kpi-card, [data-kpi]')].map(k => k.innerText).join('|');
  // (v3) the pick shows on the page's ONE filter: the field's filter on the page bar, counted by the filter button
  const count = () => Number(document.querySelector('#filter-toggle .filter-count')?.textContent || 0);
  const field = () => document.querySelector('[data-filter-id="' + CSS.escape(dim.split('|')[0]) + '"]');
  const before = others() + '#' + kpis(), counted = count();
  find().click();
  await wait(500);
  const picked = find();
  if (!picked || picked.getAttribute('aria-pressed') !== 'true') return 'the clicked point is not marked picked (aria-pressed)';
  const siblings = [...document.querySelectorAll('[data-cf-dim="' + CSS.escape(dim) + '"]')].filter(p => p !== picked && visualOf(p) === visualOf(picked));
  if (siblings.length && !siblings.some(p => p.classList.contains('cf-dim'))) return 'the other points of the clicked visual are not dimmed (cf-dim)';
  if (!field()) return 'the field ' + dim + ' has no filter on the page bar to hold the pick';
  if (count() <= counted) return 'the filter button does not count the pick (' + counted + ' -> ' + count() + ')';
  if (document.querySelector('#cf-chips')) return 'a second row of chips (#cf-chips) beside the page filter';
  if (others() + '#' + kpis() === before) return 'nothing else on the page changed after the click';
  find().click();
  await wait(500);
  if (find().getAttribute('aria-pressed') === 'true' || count() !== counted) return 'a second click on the only picked point does not clear';
  find().click();
  await wait(400);
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  await wait(500);
  if (count() !== counted) return 'Escape does not clear the selection';
  return true;
})()`;

/** (v3) Every kind of point filters: in each visual, a click on one point changes another visual of the page and a second click
 *  brings the page back (a point that is clickable but filters nothing is no cross-filter point). Async: awaitPromise. */
export const EVERY_CLICK = `(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const visuals = () => [...document.querySelectorAll('[data-rp-visual], .card')].filter(v => v.querySelector('[data-cf-value]'));
  const sig = except => visuals().filter(v => !except || !v.contains(except)).map(v => v.innerText).join('#');
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await wait(300);
  const out = [];
  for (const v of visuals()) {
    const p = [...v.querySelectorAll('[data-cf-value]')].find(e => e.getClientRects().length);
    if (!p) continue;
    const dim = p.dataset.cfDim, value = p.dataset.cfValue, whole = sig(null), others = sig(p);
    p.click(); await wait(400);
    const again = document.querySelector('[data-cf-dim="' + CSS.escape(dim) + '"][data-cf-value="' + CSS.escape(value) + '"]');
    const changed = sig(again) !== others;
    again?.click(); await wait(400);
    if (!changed) out.push('a point of ' + dim + ' (' + value + ') filters nothing');
    else if (sig(null) !== whole) out.push('a point of ' + dim + ': a second click does not bring the page back');
  }
  return out.length ? out.join('; ') : true;
})()`;

/** Two pages for the repo's test to load before the real ones: GOOD passes everything, FAULTY fails every rule and the interaction. */
const PAGE = (body, script) => `<!doctype html><html><head><meta charset="utf-8"><style>.cf-dim{opacity:.3}</style></head><body>${body}<script>${script}</script></body></html>`;
export const SELF_TEST = {
  good: PAGE(`<div id="lead"></div><div class="card" data-rp-visual="chart" id="a"></div><div class="card" data-rp-visual="chart" id="b"></div><div class="kpi-card" id="k"></div>`, `
    const rows = [{s: 'A', h: '1'}, {s: 'A', h: '2'}, {s: 'B', h: '2'}];
    let sel = {};
    const pick = (d, v, add) => { const cur = sel[d] || []; if (add) { sel = {...sel, [d]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]}; if (!sel[d].length) delete sel[d]; }
      else sel = cur.length === 1 && cur[0] === v && Object.keys(sel).length === 1 ? {} : {[d]: [v]}; draw(); };
    const keep = except => rows.filter(r => Object.entries(sel).every(([d, vs]) => d === except || vs.includes(d === 's' ? r.s : r.h)));
    const visual = (id, d, key) => { const counts = {}; for (const r of keep(d)) counts[key(r)] = (counts[key(r)] || 0) + 1;
      document.getElementById(id).innerHTML = Object.entries(counts).map(([v, n]) => { const on = (sel[d] || []).includes(v), dim = sel[d] && !on;
        return '<span role="button" tabindex="0" data-rp-mark title="' + v + '" data-cf-dim="' + d + '" data-cf-value="' + v + '" aria-pressed="' + on + '" class="' + (dim ? 'cf-dim' : '') + '">' + v + ':' + n + '</span>'; }).join(' '); };
    const draw = () => { visual('a', 's', r => r.s); visual('b', 'h', r => r.h);
      document.getElementById('a').insertAdjacentHTML('beforeend', '<div data-rp-legend style="display:flex;gap:6px;white-space:nowrap">' + ['A', 'B'].map(v => '<span role="button" tabindex="0" title="' + v + '" data-cf-dim="s" data-cf-value="' + v + '" aria-pressed="' + (sel.s || []).includes(v) + '"' + (sel.s && !sel.s.includes(v) ? ' class="cf-dim"' : '') + '>' + v + '</span>').join('') + '</div>'); document.getElementById('k').textContent = 'rows ' + keep().length;
      const n = Object.keys(sel).length; document.getElementById('lead').innerHTML = '<button id="filter-toggle">F' + (n ? '<span class="filter-count">' + n + '</span>' : '') + '</button><div class="filter-field" data-filter-id="s">' + (sel.s || []).join(',') + '</div><div class="filter-field" data-filter-id="h">' + (sel.h || []).join(',') + '</div>';
      document.querySelectorAll('[data-cf-dim]').forEach(p => p.onclick = e => pick(p.dataset.cfDim, p.dataset.cfValue, e.ctrlKey));
      document.getElementById('lead').insertAdjacentHTML('beforeend', '<div class="filter-place" data-filter-id="s" id="pl-s"><div class="filter-field slicer"><button class="slicer-btn" type="button">S</button></div></div>');
      document.querySelector('#pl-s .slicer-btn').onclick = () => { document.getElementById('s-menu')?.remove(); document.body.insertAdjacentHTML('beforeend', '<div id="s-menu" class="slicer-menu">' + ['A', 'B'].map(v => '<label class="slicer-item"><input type="checkbox"' + ((sel.s || []).includes(v) ? ' checked' : '') + ' data-v="' + v + '">' + v + '</label>').join('') + '</div>');
        document.querySelectorAll('#s-menu input').forEach(i => i.onchange = () => { pick('s', i.dataset.v, true); document.getElementById('s-menu')?.remove(); }); }; };
    addEventListener('keydown', e => { if (e.key === 'Escape') { sel = {}; draw(); } });
    draw();`),
  faulty: PAGE(`<div id="cf-chips"></div><div class="card" data-rp-visual="chart"><span data-cf-dim="s" data-rp-mark>A</span><span data-cf-dim="s" data-rp-mark>B</span><i data-rp-mark style="display:inline-block;width:8px;height:8px"></i><span role="button" tabindex="0" data-rp-mark data-cf-dim="h" data-cf-value="1">1</span><span role="button" tabindex="0" data-cf-dim="h" data-cf-value="2">2</span><div data-rp-legend style="width:60px"><span style="display:block">Year 2025 and more</span><span style="display:block">B</span></div><div class="filter-place" data-filter-id="h"><div class="filter-field slicer"><button class="slicer-btn" type="button" onclick="document.body.insertAdjacentHTML('beforeend','<div id=&quot;h-menu&quot; class=&quot;slicer-menu&quot;><label class=&quot;slicer-item&quot;><input type=&quot;checkbox&quot;>1</label></div>')">H</button></div></div></div>`, `
    document.querySelectorAll('[data-cf-dim]').forEach(p => p.onclick = () => {});`),
};

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()) && process.argv.includes('--list')) {
  for (const r of RULES) console.log(`${r.id.padEnd(15)} ${r.rule}`);
  console.log(`${'cf-interaction'.padEnd(15)} a click picks the point, dims its siblings, shows chips, changes another visual; a second click and Escape clear`);
}
