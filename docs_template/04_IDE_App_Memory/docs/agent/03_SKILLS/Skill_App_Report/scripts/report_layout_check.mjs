// report_layout_check - the measurable rules of skill app-report, run on a live report page by the repo's browser test.
//
// RULES are browser expressions that return true or a sentence saying what broke (evaluate once the page has settled).
// SELF_TEST holds a good page and a faulty page: the good one passes every rule, the faulty one fails each, which proves
// the check can go red. The rules read only the DOM and the markup contract of the skill (§9), so they hold for any framework.
//
//   import {RULES, SELF_TEST} from '../scripts/report_layout_check.mjs';
//   for (const r of RULES) { const v = await evaluate(r.check); if (v !== true) fail(r.id + ': ' + v); }
//   node scripts/report_layout_check.mjs --list      prints the rules
//
// A page with no report visual and no cross-filter point is not a report page: every rule passes there.

// Shared helpers, pasted at the start of every check (each check is evaluated alone).
const H = `
  const vis = () => [...document.querySelectorAll('[data-rp-visual]')].filter(e => e.getClientRects().length);
  const box = e => e.getBoundingClientRect();
  const txt = e => (e.innerText || e.textContent || '').trim();
  const num = s => { const m = String(s).replace(/\\s/g, '').replace('−', '-').match(/[-+]?\\d+([.,]\\d+)?/); return m ? Number(m[0].replace(',', '.')) : NaN; };
  const rgb = c => (c.match(/[\\d.]+/g) || []).slice(0, 4).map(Number);
  const clear = c => c === 'transparent' || (rgb(c).length === 4 && rgb(c)[3] === 0);
  const probe = cls => { const p = document.createElement('span'); p.className = cls; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  const sat = c => { const [r, g, b] = rgb(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const paint = m => { const st = getComputedStyle(m); return st.backgroundImage !== 'none' ? st.backgroundImage : m instanceof SVGElement ? st.fill : st.backgroundColor; };
  const name = v => txt(v.querySelector('[data-rp-title]') || v).slice(0, 30);
  const tabs = () => [...document.querySelectorAll('[role=tab], .board-tabs .nav-link')].filter(e => e.getClientRects().length);
`;
const rule = (id, text, body) => ({id, rule: text, check: `(() => {${H}${body}})()`});

// The words that name a comparison period or a base, in the app's two languages.
const PERIOD = String.raw`(MoM|WoW|QoQ|YoY|DoD|LMTD|LM|LY|LW|pp|vs\.?|of|so với|của|trên|tháng trước|tuần trước|kỳ trước|năm trước|chỉ tiêu|target|mục tiêu)`;

export const RULES = [
  rule('rp-marked', 'every visual of a report page declares data-rp-visual (chart · table · donut · cards) so the rules can read it', `
    if (!document.querySelector('[data-cf-dim], [data-rp-visual]')) return true;
    const scope = document.querySelector('[data-rp-page]');
    if (!scope) return 'a report page without data-rp-page on its root';
    for (const card of scope.querySelectorAll('.card')) {
      if (card.closest('[data-rp-visual]') || card.querySelector('[data-rp-visual]') || !card.getClientRects().length) continue;
      const drawing = [...card.querySelectorAll('svg')].some(s => box(s).width >= 40 && box(s).height >= 40);
      if (drawing || card.querySelector('table, [data-cf-dim]')) return 'a visual without data-rp-visual: ' + txt(card).slice(0, 40);
    }
    return true;`),

  // A. Percentages (§1)
  rule('rp-pct-declared', 'every % on a report page declares data-rp-pct: up (rising is good) · down (rising is bad) · share (no direction)', `
    for (const e of document.querySelectorAll('[data-rp-visual] .kpi-percentage, [data-rp-visual] [data-rp-label], [data-rp-visual] td')) {
      if (!e.getClientRects().length || !/\\d\\s*(%|pp)/.test(txt(e))) continue;
      if (!['up', 'down', 'share'].includes(e.closest('[data-rp-pct]')?.dataset.rpPct)) return 'a % without data-rp-pct: ' + txt(e).slice(0, 30);
    }
    return true;`),
  rule('rp-pct-period', 'a % names its comparison period or its base (MoM · vs chỉ tiêu · của tổng …), never a bare figure', `
    const re = new RegExp(${JSON.stringify(PERIOD)}, 'i');
    for (const e of document.querySelectorAll('[data-rp-pct]')) {
      if (!e.getClientRects().length || e.closest('td, th, [data-rp-label]')) continue;
      const head = e.closest('[data-rp-visual]')?.querySelector('[data-rp-title]');
      if (!re.test(txt(e)) && !(e.dataset.rpPct === 'share' && head && re.test(txt(head)))) return 'a % without its period or base: ' + txt(e).slice(0, 30);
    }
    return true;`),
  rule('rp-pct-color', 'a directional % is green when it is good and red when it is bad (inverted for down); a share % takes neither colour', `
    const good = probe('text-success'), bad = probe('text-danger');
    for (const e of document.querySelectorAll('[data-rp-pct]')) {
      if (!e.getClientRects().length) continue;
      const v = num(txt(e)), c = getComputedStyle(e).color, kind = e.dataset.rpPct;
      if (kind === 'share') { if (c === good || c === bad) return 'a share % is coloured as up/down: ' + txt(e).slice(0, 30); continue; }
      if (!['up', 'down'].includes(kind) || !Number.isFinite(v) || v === 0) continue;
      const want = (v > 0) === (kind === 'up') ? good : bad;
      if (c !== want) return 'a ' + kind + ' % of ' + v + ' is not ' + (want === good ? 'green' : 'red') + ': ' + txt(e).slice(0, 30);
    }
    return true;`),
  rule('rp-pct-pp', 'a card whose figure is itself a ratio shows its change in percentage points (pp), never a second %', `
    for (const card of document.querySelectorAll('[data-rp-visual=cards] .kpi-card')) {
      const main = card.querySelector('.kpi-main'), pct = card.querySelector('[data-rp-pct]');
      if (!main || !pct || !/%\\s*$/.test(txt(main))) continue;
      if (pct.dataset.rpPct !== 'share' && /%/.test(txt(pct)) && !/pp/.test(txt(pct))) return 'a ratio card shows its change as %: ' + txt(card).slice(0, 40);
    }
    return true;`),

  // B. Cards (§2)
  rule('rp-cards', 'a card row holds only cards, at least four of them, every one with its % line', `
    for (const row of document.querySelectorAll('[data-rp-visual=cards]')) {
      if (!row.getClientRects().length) continue;
      if ([...row.querySelectorAll('svg, table')].some(e => !e.closest('.kpi-card'))) return 'a chart or a table inside the card row';
      const cards = [...row.querySelectorAll('.kpi-card')].filter(c => c.getClientRects().length && !c.parentElement.closest('.kpi-card'));
      if (cards.length < 4) return 'a card row of ' + cards.length + ' card(s): keep at least four, or drop the row';
      const bare = cards.find(c => !c.querySelector('[data-rp-pct]'));
      if (bare) return 'a card without its % line: ' + txt(bare).slice(0, 30);
    }
    return true;`),
  rule('rp-cards-apart', 'a card row stands alone on its line: no chart, donut or table beside it in the same row of the grid (v10, user 08/11: "nó không được nằm trong chỗ card, nó phải nằm riêng ra")', `
    for (const row of document.querySelectorAll('[data-rp-visual=cards]')) {
      if (!row.getClientRects().length) continue;
      const r = box(row);
      const beside = vis().find(v => v !== row && v.dataset.rpVisual !== 'cards' && !row.contains(v) && !v.contains(row) && !v.closest('[data-rp-visual=cards]') &&
        Math.min(box(v).bottom, r.bottom) - Math.max(box(v).top, r.top) > Math.min(box(v).height, r.height) / 2);
      if (beside) return 'a ' + beside.dataset.rpVisual + ' stands beside the card row: ' + name(beside);
    }
    return true;`),
  rule('rp-cards-wrap', 'a card row too long for one line splits into even lines, top and bottom, the cards keeping their size: no card squeezed under 140 px, the lines differ by one card at most, no card alone on a line (v11, user 08/11: "quá nhiều card thì phải chia hàng ra, ko dc cả nùi", "chia trên dưới làm đôi, giữ đúng size và thiết kế card")', `
    if (innerWidth < 768) return true;   // a phone stacks the cards
    for (const row of document.querySelectorAll('[data-rp-visual=cards]')) {
      if (!row.getClientRects().length) continue;
      const cards = [...row.querySelectorAll('.kpi-card')].filter(c => c.getClientRects().length && !c.parentElement.closest('.kpi-card'));
      const narrow = cards.find(c => box(c).width < 140);
      if (narrow) return 'a card squeezed to ' + Math.round(box(narrow).width) + ' px (split the row into lines): ' + txt(narrow).slice(0, 30);
      const lines = new Map();
      for (const c of cards) { const k = Math.round(box(c).top / 4); lines.set(k, (lines.get(k) || 0) + 1); }
      const n = [...lines.values()];
      if (n.length > 1 && (Math.max(...n) - Math.min(...n) > 1 || Math.min(...n) === 1)) return 'card lines of uneven length: ' + n.join(' + ');
    }
    return true;`),
  rule('rp-card-fit', 'a figure card is as tall as what it holds: never more than 1.6 times its lines and padding (v10, user 08/11: "card dài sọc" - a card pulled to the height of a chart beside it)', `
    for (const c of document.querySelectorAll('[data-rp-visual=cards] .kpi-card')) {
      if (!c.getClientRects().length || c.parentElement.closest('.kpi-card')) continue;
      // (v11, Dashboard 08/11) what the card DRAWS - its text and pictures at any depth: a Sneat card is .kpi-card > .card-body,
      // and the body stretches with the card, so its direct children always look as tall as the card
      const ink = [...c.querySelectorAll('*')].filter(e => e.getClientRects().length &&
        (e.matches('img, svg, canvas, input') || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())));
      if (!ink.length) continue;
      const r = box(c), top = Math.min(...ink.map(e => box(e).top)), bottom = Math.max(...ink.map(e => box(e).bottom));
      // the lines from the card's top edge, and the same room again below them (the padding of the card and its body)
      const need = (bottom - r.top) + (top - r.top), h = r.height;
      if (h > need * 1.6 && h - need > 24) return 'a card ' + Math.round(h) + ' px tall for ' + Math.round(need) + ' px of content: ' + txt(c).slice(0, 30);
    }
    return true;`),
  rule('rp-figure-scale', 'a figure is never rounded to 0 with a unit (0 k · 0 tr · 0 tỷ): a value below the unit shows in a smaller unit or in full (v10, user 08/11: Group Size 1,75 read "0 k")', `
    const zero = /^[-+−]?0([.,]0+)?\\s?(k|K|nghìn|ngàn|tr|tr\\.|triệu|tỷ|ty|M|Mn|B|bn)$/;
    for (const v of vis()) for (const e of v.querySelectorAll('*')) {
      if (e.children.length || !e.getClientRects().length) continue;
      const t = txt(e);
      if (zero.test(t)) return 'a figure rounded to 0 with its unit: "' + t + '" in ' + name(v);
    }
    return true;`),
  rule('rp-card-label', 'a card title fits its card and every title of a card row has one size (abbreviate, never shrink one card)', `
    for (const row of document.querySelectorAll('[data-rp-visual=cards]')) {
      const titles = [...row.querySelectorAll('.kpi-title')].filter(t => t.getClientRects().length);
      const cut = titles.find(t => t.scrollWidth > t.clientWidth + 1);
      if (cut) return 'a card title wider than its card: ' + txt(cut);
      if (new Set(titles.map(t => getComputedStyle(t).fontSize)).size > 1) return 'the card titles of one row differ in size';
    }
    return true;`),

  // C. Chart colours and labels (§3)
  rule('rp-chart-colour', 'every chart marks its series (data-rp-mark); no two charts of one view share the main colour; comparison series are grey', `
    const seen = new Map();
    for (const c of vis().filter(v => ['chart', 'donut'].includes(v.dataset.rpVisual))) {
      const mark = c.querySelector('[data-rp-mark]:not([data-rp-compare])');
      if (!mark && c.querySelector('[data-rp-empty]')) continue;   // an empty state: nothing to colour
      if (!mark) return 'a chart without data-rp-mark: ' + name(c);
      if (c.dataset.rpVisual === 'chart') {
        const col = paint(mark);
        if (seen.has(col)) return 'two charts of one view share the main colour: ' + seen.get(col) + ' · ' + name(c);
        seen.set(col, name(c));
      }
      for (const m of c.querySelectorAll('[data-rp-compare]')) if (sat(paint(m)) > 0.15) return 'a comparison series is not grey: ' + name(c);
    }
    return true;`),
  rule('rp-label', 'chart data labels have no box behind them and every % label is bold', `
    for (const l of document.querySelectorAll('[data-rp-label]')) {
      if (!l.getClientRects().length) continue;
      const st = getComputedStyle(l);
      if (!(l instanceof SVGElement) && !clear(st.backgroundColor)) return 'a data label with a box: ' + txt(l);
      if (/%/.test(txt(l)) && Number(st.fontWeight) < 600) return 'a % label not bold: ' + txt(l);
    }
    return true;`),

  // D. Tables (§4)
  rule('rp-table-style', 'every report table has a bold filled header, alternating rows, a bold total row and horizontal lines only', `
    for (const v of vis().filter(v => v.dataset.rpVisual === 'table')) {
      const t = v.querySelector('table'); if (!t) return 'a table visual without a table: ' + name(v);
      const th = t.querySelector('thead th'); if (!th) return 'a table without a header row: ' + name(v);
      const hs = getComputedStyle(th);
      if (Number(hs.fontWeight) < 600) return 'a table header not bold: ' + name(v);
      // (v8) a header pinned on glass is the card glass itself, clear through (app-sneat-glass pin-cover): no fill asked there
      const onGlass = hs.position === 'sticky' && !document.documentElement.classList.contains('solid');
      if (!onGlass && clear(hs.backgroundColor) && hs.backgroundImage === 'none') return 'a table header without its fill: ' + name(v);
      const rows = [...t.querySelectorAll('tbody tr')].filter(r => r.getClientRects().length && !r.hasAttribute('data-rp-total'));
      const look = r => { const a = getComputedStyle(r), b = getComputedStyle(r.cells[0] || r); return a.backgroundColor + b.backgroundColor + b.backgroundImage + b.boxShadow; };
      if (rows.length >= 3 && look(rows[0]) === look(rows[1])) return 'table rows do not alternate: ' + name(v);
      const total = t.querySelector('[data-rp-total]');
      if (total && Number(getComputedStyle(total.cells[0] || total).fontWeight) < 600) return 'a total row not bold: ' + name(v);
      for (const cell of [...t.querySelectorAll('tbody td')].slice(0, 30)) {
        const cs = getComputedStyle(cell);
        if (parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0) return 'a table with vertical lines: ' + name(v);
      }
    }
    return true;`),
  rule('rp-table-few', 'a table is not used for little information: one row ⇒ a card; one dimension with six values or fewer ⇒ a chart', `
    for (const v of vis().filter(v => v.dataset.rpVisual === 'table' && !v.hasAttribute('data-rp-detail'))) {
      const rows = [...v.querySelectorAll('tbody tr')].filter(r => r.getClientRects().length && !r.hasAttribute('data-rp-total'));
      const dims = Number(v.dataset.rpDims || 1), cap = Number(v.dataset.rpRows || rows.length);
      if (cap === 1) return 'a one-row table (use a card): ' + name(v);
      if (dims === 1 && cap <= 6) return 'a table of ' + cap + ' groups (use a chart): ' + name(v);
    }
    return true;`),
  rule('rp-no-side-scroll', 'no table or chart scrolls sideways inside its frame (show the latest periods, fit the columns, switch to millions); a phone scrolls a data grid inside its frame (app-base M5)', `
    if (innerWidth < 768) return true;
    for (const v of vis()) {
      // A table may also spill out of its panel without a scroll box: as wrong as scrolling.
      const t = v.querySelector('table'), body = v.querySelector('[data-rp-body]') || v;
      // Column widths are whole pixels (the column resize rounds each), so a sum may pass by half a pixel a column.
      if (t && box(t).width > body.clientWidth + Math.max(1, t.querySelectorAll('thead th').length / 2)) return 'a table wider than its panel: ' + name(v);
    }
    for (const v of vis()) for (const f of [v, ...v.querySelectorAll('*')]) {
      if (/(auto|scroll)/.test(getComputedStyle(f).overflowX) && f.scrollWidth > f.clientWidth + 1) return 'scrolls sideways: ' + name(v);
    }
    return true;`),
  // (v7, user 06/11: "mỗi dashboard dạng list nên có giới hạn bao nhiêu dòng, rồi phần còn lại cho scrollbar tự động trong
  // chính dashboard đó, chứ không có dài cả đống ra") - replaces rp-scroll-alone: a long table stays on the page with the others
  rule('rp-table-rows-cap', 'a table of a report page shows ten rows at most and scrolls the rest inside its own frame - never a page-long list, and it stays on the page beside the other visuals', `
    for (const table of document.querySelectorAll('[data-rp-page] table')) {
      const rows = [...(table.tBodies[0]?.rows || [])].filter(r => r.getClientRects().length);
      if (rows.length <= 10) continue;
      let frame = table.parentElement;
      while (frame && !frame.matches('[data-rp-page]') && !/(auto|scroll)/.test(getComputedStyle(frame).overflowY)) frame = frame.parentElement;
      const what = name(table.closest('[data-rp-visual]') || table);
      if (!frame || frame.matches('[data-rp-page]')) return what + ': ' + rows.length + ' rows and no scroll of its own';
      const row = rows[0].getBoundingClientRect().height || 40, head = table.tHead ? table.tHead.getBoundingClientRect().height : 0;
      if (frame.clientHeight > head + row * 11 + 2) return what + ': shows ' + Math.round((frame.clientHeight - head) / row) + ' rows, the cap is 10';
    }
    return true;`),

  // E. Layout (§5)
  rule('rp-same-row', 'visuals of the same kind and fields sit in one row, with the same height and an even split of the width (a phone stacks them)', `
    if (innerWidth < 768) return true;   // (v8) a phone stacks the visuals of a row
    const groups = new Map();
    for (const v of vis()) { if (!v.dataset.rpFields) continue; const k = v.dataset.rpVisual + '|' + v.dataset.rpFields; groups.set(k, [...(groups.get(k) || []), v]); }
    for (const [k, list] of groups) {
      if (list.length < 2) continue;
      const spread = f => { const xs = list.map(f); return Math.max(...xs) - Math.min(...xs); };
      if (spread(v => box(v).top) > 1) return 'visuals of one kind on different rows: ' + k;
      if (spread(v => box(v).height) > 1) return 'visuals of one kind with different heights: ' + k;
      if (spread(v => box(v).width) > 1) return 'visuals of one kind with an uneven split: ' + k;
    }
    return true;`),
  rule('rp-even-split', 'blocks sharing one row that are meant to be equal are absolutely equal (never 325 + 330)', `
    const rows = new Map();
    for (const v of vis()) { if (v.parentElement.closest('[data-rp-visual]')) continue; const r = box(v), k = Math.round(r.top); rows.set(k, [...(rows.get(k) || []), r.width]); }
    for (const ws of rows.values()) for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
      const d = Math.abs(ws[i] - ws[j]);
      if (d > 1 && d <= 5) return 'two blocks of one row differ by ' + d.toFixed(1) + ' px: split evenly';
    }
    return true;`),
  rule('rp-topn', 'a Top / Bottom N visual shows exactly N items (or every item when fewer exist)', `
    for (const v of vis().filter(v => v.dataset.rpTopn)) {
      const n = Number(v.dataset.rpTopn), items = v.querySelectorAll('[data-rp-item]').length, total = Number(v.dataset.rpRows || n);
      if (items !== Math.min(n, total)) return 'a Top ' + n + ' shows ' + items + ': ' + name(v);
    }
    return true;`),
  rule('rp-no-negative-bars', 'no column or bar of an amount points below its axis (draw the loss as a positive figure, keep the sign in the label)', `
    for (const m of document.querySelectorAll('[data-rp-mark][data-rp-value]')) {
      if (Number(m.dataset.rpValue) < 0 && !m.closest('[data-rp-pct]')) return 'a bar of ' + m.dataset.rpValue + ' points down: ' + name(m.closest('[data-rp-visual]') || m);
    }
    return true;`),
  rule('rp-baseline', 'the columns of the column charts of one row stand on one line', `
    const rows = new Map();
    for (const v of vis().filter(v => v.dataset.rpVisual === 'chart' && v.dataset.rpAxis === 'column')) {
      const bars = [...v.querySelectorAll('[data-rp-mark]')].filter(b => b.getClientRects().length && box(b).height > 0);
      if (!bars.length) continue;
      const k = Math.round(box(v).top);
      rows.set(k, [...(rows.get(k) || []), Math.max(...bars.map(b => box(b).bottom))]);
    }
    for (const b of rows.values()) if (Math.max(...b) - Math.min(...b) > 3) return 'the column bottoms of one row differ by ' + (Math.max(...b) - Math.min(...b)).toFixed(0) + ' px';
    return true;`),
  rule('rp-fill', 'no column chart leaves more than 30 % of its width empty once full of data (its columns span at least 70 % of the plot)', `
    for (const v of vis().filter(v => v.dataset.rpVisual === 'chart' && v.dataset.rpAxis === 'column')) {
      const body = v.querySelector('[data-rp-body]') || v;
      const marks = [...body.querySelectorAll('[data-rp-mark]')].filter(m => m.getClientRects().length);
      if (marks.length < 2) continue;
      const b = box(body), l = Math.min(...marks.map(m => box(m).left)), r = Math.max(...marks.map(m => box(m).right));
      if (b.width > 0 && (r - l) / b.width < 0.7) return 'a chart uses ' + Math.round((r - l) / b.width * 100) + ' % of its width: ' + name(v);
    }
    return true;`),

  // F. Tabs, page names, titles (§6)
  rule('rp-tab-label', 'a page tab label is at most 10 characters and shows in full', `
    for (const t of tabs()) {
      const s = txt(t);
      if (s.length > 10) return 'a tab label of ' + s.length + ' characters: ' + s;
      if (t.scrollWidth > t.clientWidth + 1) return 'a tab label cut: ' + s;
    }
    return true;`),
  rule('rp-page-name', 'page and tab names carry no department code and no word Report / Dashboard / Báo cáo', `
    const code = (document.querySelector('[data-rp-page]')?.dataset.rpDept || '').toUpperCase();
    for (const t of [...tabs(), ...document.querySelectorAll('[data-rp-page-name]')]) {
      const s = txt(t);
      if (/\\b(report|dashboard)\\b|báo cáo/i.test(s)) return 'a page name says Report/Dashboard: ' + s;
      if (code && s.toUpperCase().split(/[^A-Z0-9]+/).includes(code)) return 'a page name carries the department code: ' + s;
    }
    return true;`),
  rule('rp-title', 'every visual has a title, aligned left, all titles of a page the same size', `
    const sizes = new Set();
    for (const v of vis().filter(v => v.dataset.rpVisual !== 'cards')) {
      const t = v.querySelector('[data-rp-title]');
      if (!t || !txt(t)) return 'a visual without a title';
      if (/(center|right|end)/.test(getComputedStyle(t).textAlign)) return 'a title not aligned left: ' + txt(t).slice(0, 30);
      sizes.add(getComputedStyle(t).fontSize);
    }
    return sizes.size > 1 ? 'visual titles of one page differ in size: ' + [...sizes].join(' / ') : true;`),

  // G. Glossary (§7)
  rule('rp-glossary', 'a report page has its own glossary that spells out every abbreviation shown on the page, one definition per line', `
    if (!vis().length) return true;
    const g = document.querySelector('[data-rp-glossary]');
    if (!g) return 'a report page without its glossary (data-rp-glossary)';
    const terms = [...g.querySelectorAll('[data-rp-term]')];
    if (!terms.length) return 'an empty glossary';
    const multi = terms.find(e => (txt(e).match(/(^|[\\s·;])[^\\s:=·;]{1,40}\\s*[:=]\\s/g) || []).length > 1);
    if (multi) return 'two definitions on one glossary line: ' + txt(multi).slice(0, 40);
    const known = new Set(terms.map(e => e.dataset.rpTerm)), common = new Set((g.dataset.rpCommon || '').split(',').filter(Boolean));
    // textContent, not innerText: a header shown in capitals by CSS is still the word written (TỔNG is not T + NG).
    const shown = [...document.querySelectorAll('[data-rp-title], [data-rp-visual] th, .kpi-title, [role=tab]')].map(e => (e.textContent || '').trim()).join(' ');
    for (const w of new Set(shown.match(/\\b[A-Z][A-Z0-9]+\\b/g) || [])) if (!known.has(w) && !common.has(w)) return 'an abbreviation the glossary does not spell out: ' + w;
    return true;`),

  // H. One view (§8, user 06/11: "dashboard hầu như dùng được tính năng grid list đâu, bỏ hẳn đi")
  rule('rp-no-view-switch', 'a report page shows no list / grid switch: a report has one view, and a switch only takes room on the bar', `
    if (!document.querySelector('[data-rp-page]') || !vis().length) return true;
    const sw = [...document.querySelectorAll('#view-list, #view-grid, .view-switch > .btn')].filter(e => e.getClientRects().length && !e.disabled);
    return sw.length ? 'a report page with a list / grid switch: ' + sw.map(e => e.id || e.className).join(', ') : true;`),

  // I. Tooltips (§3, user 05/11: "mọi chỗ khi trỏ vào đều phải ra thông tin nhỏ… giống pbi")
  rule('rp-tooltip', 'every data mark a person can point at outside a table (a bar, a stacked part, a dot, a slice) names what it stands for with its value, through the frame\'s tooltip (data-tip), never the browser\'s plain title', `
    // (v8) the data marks, and a point that shows no words of its own; an axis tick or a key entry names itself on screen
    const marks = [...document.querySelectorAll('[data-rp-page] [data-rp-mark], [data-rp-page] [data-cf-value]')].filter(m => m.getClientRects().length && !m.closest('table')
      && (m.matches('[data-rp-mark]') || !(m.innerText || '').trim()));
    const bad = marks.find(m => !/\\d/.test(m.getAttribute('data-tip') || ''));
    return bad ? 'a data mark without its tooltip: ' + (bad.getAttribute('title') || bad.getAttribute('data-cf-value') || bad.className || bad.tagName).toString().slice(0, 50) : true;`),

  // J. The report cards of a catalog page (§9, user 06/11)
  rule('rp-card-pages-even', 'a report card on a catalog page lists its pages in two even columns, so a long list never stretches it past its neighbour', `
    for (const list of document.querySelectorAll('[data-rp-card] [data-rp-card-pages], .board-card .board-tabs')) {
      if (!list.getClientRects().length || list.children.length < 2) continue;
      const cols = getComputedStyle(list).gridTemplateColumns.split(' ').filter(c => c && c !== 'none');
      if (cols.length !== 2) return 'the pages of a report card in ' + cols.length + ' column(s), two wanted';
    }
    return true;`),
  rule('rp-card-status', 'a built report card turns, by a button at its top right, to the state of its numbers: normal, a period with no numbers yet, a read that failed (with the last good read), not read yet; the time of the update, the period, how long it read, how often it refreshes', `
    for (const card of document.querySelectorAll('[data-rp-card][data-built], .board-card[data-built]')) {
      const button = card.querySelector('[data-rp-card-flip], [data-board-flip]'), back = card.querySelector('[data-rp-card-status], [data-board-status]');
      if (!button || !back) return 'a built report card with no state of its numbers behind it';
      const c = card.getBoundingClientRect(), b = button.getBoundingClientRect();
      if (b.top - c.top > 40 || c.right - b.right > 40) return 'the button that turns a report card is not at its top right';
    }
    return true;`),

  // K. The person's number format (v9, user 06/11: "setting 1 lần sẽ cho hiện ở cái báo cáo dashboard hết, chỉ lấy của table")
  rule('rp-num-format', 'every number of a report table shows in the person\'s number format (Settings > Numbers, on <html data-num-format>): its cell says what it is (data-rp-num = money | count | pct) and its value (data-rp-raw), and shows exactly the format of that value - a negative in red carries text-danger; a number with no data-rp-num is outside the person\'s format', `
    let f = {money_unit: 'auto', money_dp: 1, money_round: 1, count_dp: 0, sep: 'dot', pct_dp: 1, neg: 'minus'};
    try { f = {...f, ...JSON.parse(document.documentElement.dataset.numFormat || '{}')}; } catch {}
    const words = document.documentElement.lang === 'en' ? {k: 'K', m: 'M', bn: 'B'} : {k: ' N', m: ' tr', bn: ' tỷ'};
    const fmt = (raw, kind) => {
      const negative = raw < 0, abs = Math.abs(raw); let value = abs, dp = 0, suffix = '';
      if (kind === 'pct') { value = abs * 100; dp = f.pct_dp; suffix = '%'; }
      else if (kind === 'count') dp = f.count_dp;
      else { const unit = f.money_unit === 'auto' ? (abs >= 1e9 ? 'bn' : abs >= 1e6 ? 'm' : 'vnd') : f.money_unit;
        if (unit === 'vnd') { value = Math.round(abs / f.money_round) * f.money_round; dp = 0; }
        else { value = abs / (unit === 'k' ? 1e3 : unit === 'm' ? 1e6 : 1e9); dp = f.money_dp; suffix = words[unit]; } }
      const fixed = value.toFixed(dp), [int, frac] = fixed.split('.');
      const group = f.sep === 'comma' ? ',' : f.sep === 'space' ? ' ' : '.', point = f.sep === 'comma' ? '.' : ',';
      const body = int.replace(/\\B(?=(\\d{3})+(?!\\d))/g, group) + (frac ? point + frac : '') + suffix;
      const neg = negative && Number(fixed) !== 0;
      return {text: neg ? (f.neg === 'paren' ? '(' + body + ')' : '-' + body) : body, neg};
    };
    const looks = /^[-(]?\\d[\\d.,\\s]*(%|K|M|B| N| tr| tỷ)?\\)?$/;
    for (const cell of document.querySelectorAll('[data-rp-page] [data-rp-visual="table"] td')) {
      if (!cell.getClientRects().length) continue;
      const shown = (cell.textContent || '').replace(/\\s+/g, ' ').trim();
      if (!cell.dataset.rpNum) { if (looks.test(shown)) return 'a number outside the format of the person (no data-rp-num): ' + shown; continue; }
      const raw = Number(cell.dataset.rpRaw);
      if (!Number.isFinite(raw)) return 'a number cell without its value (data-rp-raw): ' + shown;
      const want = fmt(raw, cell.dataset.rpNum);
      if (shown !== want.text) return 'a number not in the format of the person: ' + shown + ' (want ' + want.text + ')';
      if (want.neg && f.neg === 'red' && !cell.closest('.text-danger') && !cell.querySelector('.text-danger')) return 'a negative not in red: ' + shown;
    }
    return true;`),
];

const SHELL = body => `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font:14px sans-serif;margin:0;width:1200px}.row{display:flex;gap:10px;margin:10px}.card{background:#fff;border-radius:8px;padding:8px;box-sizing:border-box}
  .text-success{color:rgb(0,122,54)}.text-danger{color:rgb(197,30,36)}.kpi-title{font-size:14px;white-space:nowrap;overflow:hidden}.kpi-main{font-size:22px}
  .bars{display:flex;align-items:flex-end;height:120px;gap:4px}.bars i{display:block;flex:1}h6{font-size:14px;margin:0 0 4px;text-align:left}
  table{border-collapse:collapse;width:100%}th{font-weight:700;background:#44546a;color:#fff}td{border-bottom:1px solid #e3e3e3}
  tbody tr:nth-child(even){background:#f4f6f8}.wrap{overflow:auto}
</style></head><body><div data-rp-page data-rp-dept="IC">${body}</div></body></html>`;
const card = (title, main, pct, kind, cls) => `<div class="card kpi-card" style="flex:1"><p class="kpi-title">${title}</p><div class="kpi-main">${main}</div>` +
  `<small class="kpi-percentage ${cls}"${kind ? ` data-rp-pct="${kind}"` : ''}>${pct}</small></div>`;
// a card of the Sneat kit: its lines in a .card-body that stretches with the card
const cardB = (...a) => card(...a).replace('<p class="kpi-title">', '<div class="card-body" style="height:100%;box-sizing:border-box"><p class="kpi-title">').replace(/<\/div>$/, '</div></div>');
const bars = (n, colour, extra = '') => Array.from({length: n}, (_, i) => `<i data-rp-mark data-rp-item data-tip="${i}h: ${20 + i * 8}" style="height:${20 + i * 8}px;background:${colour}"></i>`).join('') + extra;
const chart = (title, colour, n, fields) => `<div class="card" data-rp-visual="chart" data-rp-axis="column" data-rp-fields="${fields}" style="flex:1">` +
  `<h6 data-rp-title>${title}</h6><div class="bars" data-rp-body>${bars(n, colour)}</div></div>`;
const rowsOf = n => Array.from({length: n}, (_, i) => `<tr><td>N${i}</td><td data-rp-num="count" data-rp-raw="${i}">${i}</td></tr>`).join('');

export const SELF_TEST = {
  good: SHELL(`<div class="row" data-rp-visual="cards">${card('Doanh thu', '1.200', '+5,2% MoM', 'up', 'text-success')}` +
    `${card('Huỷ món', '35', '+3,0% MoM', 'down', 'text-danger')}${card('Bill', '420', '-1,0% MoM', 'up', 'text-danger')}` +
    `${card('Tỷ trọng', '40%', '+2,0 pp MoM', 'up', 'text-success')}</div>` +
    `<div class="row">${chart('Theo giờ', 'rgb(61, 126, 191)', 12, 'hour')}${chart('Theo ngày', 'rgb(46, 156, 122)', 12, 'day')}</div>` +
    `<div class="row"><div class="card" data-rp-visual="table" data-rp-detail style="flex:1"><h6 data-rp-title>Chi tiết</h6><table><thead><tr><th>Nhà</th><th>Số</th></tr></thead>` +
    `<tbody>${rowsOf(8)}<tr data-rp-total style="font-weight:700"><td>Tổng</td><td data-rp-num="money" data-rp-raw="1234567890">1,2 tỷ</td></tr></tbody></table></div></div>` +
    `<nav><a role="tab">Tổng quan</a><a role="tab">Huỷ món</a></nav>` +
    `<div data-rp-glossary hidden><p data-rp-term="TC">TC (Transaction Count): số hoá đơn</p></div>` +
    `<div data-rp-card data-built style="position:relative;width:300px"><button data-rp-card-flip style="position:absolute;top:4px;right:4px">i</button>` +
    `<ul data-rp-card-pages style="display:grid;grid-template-columns:1fr 1fr;margin-top:30px"><li>A</li><li>B</li><li>C</li></ul><div data-rp-card-status hidden>ok</div></div>`),
  faulty: SHELL(`<div class="row" style="align-items:stretch"><div class="row" data-rp-visual="cards" style="flex:2;margin:0">${cardB('Group Size', '0 k', '+1,0% MoM', 'up', 'text-success')}${cardB('B', '2', '+1,0% MoM', 'up', 'text-success')}` +
    `${cardB('C', '3', '+1,0% MoM', 'up', 'text-success')}${cardB('D', '4', '+1,0% MoM', 'up', 'text-success')}</div>` +
    `<div class="row" data-rp-visual="cards" style="flex-wrap:nowrap">${Array.from({length: 9}, (_, i) => card('K' + i, String(i + 1), '+1,0% MoM', 'up', 'text-success')).join('')}</div>` +
    `<div class="card" data-rp-visual="donut" style="flex:1;height:320px"><h6 data-rp-title>Tỷ trọng</h6><svg width="60" height="60"></svg></div></div>` +
    `<div class="row" data-rp-visual="cards">${card('Doanh thu cả tháng gồm tất cả các kênh bán hàng của nhà hàng', '1.200', '+5,2%', 'up', '').replace('flex:1', 'flex:0 0 150px;min-width:0')}` +
    `${card('Tỷ lệ', '40%', '+3,0% MoM', 'up', 'text-danger')}<svg width="5" height="5"></svg></div>` +
    `<div class="row"><div class="card" data-rp-visual="chart" data-rp-axis="column" data-rp-fields="hour" style="width:500px"><h6 data-rp-title>Theo giờ</h6>` +
    `<div class="bars" data-rp-body>${bars(2, 'rgb(61, 126, 191)', '<i data-rp-mark data-rp-value="-5" style="height:5px;flex:0 0 10px"></i>')}<span style="flex:1"></span></div></div>` +
    `<div class="card" data-rp-visual="chart" data-rp-axis="column" data-rp-fields="hour" data-rp-topn="5" style="width:200px">` +
    `<h6 data-rp-title style="font-size:18px;text-align:center">TC theo giờ</h6><div class="bars" data-rp-body style="overflow-x:auto;justify-content:flex-start">` +
    `<div style="min-width:900px;display:flex;align-items:flex-end;height:100px;padding-bottom:20px"><i data-rp-mark data-rp-item style="height:40px;width:20px;background:rgb(61, 126, 191)"></i>` +
    `<i data-rp-mark data-rp-compare style="height:30px;width:20px;background:rgb(255, 0, 0)"></i><span data-rp-label style="background:#fff">12%</span></div></div></div></div>` +
    `<div class="row"><div class="card" data-rp-visual="table" data-rp-dims="1" style="width:400px"><h6 data-rp-title>Một dòng</h6><table><thead><tr><th style="font-weight:400;background:none">a</th></tr></thead>` +
    `<tbody><tr><td style="border-left:1px solid #000">1</td></tr></tbody></table></div><div class="card" style="width:200px"><svg width="60" height="60"></svg></div></div>` +
    `<div class="row"><div class="card" data-rp-visual="table" data-rp-detail style="width:403px"><h6 data-rp-title>Dài</h6><div class="wrap" style="max-height:60px">` +
    `<table><thead><tr><th>a</th></tr></thead><tbody>${Array.from({length: 20}, (_, i) => `<tr><td>${i}</td></tr>`).join('')}</tbody></table></div></div>` +
    `<div class="card" data-rp-visual="table" data-rp-detail style="width:400px"><h6>x</h6><table><thead><tr><th>b</th></tr></thead><tbody>${rowsOf(4).replace(/<tr>/g, '<tr style="background:#fff">')}` +
    `<tr data-rp-total><td>Tổng</td><td>1</td></tr></tbody></table></div></div>` +
    `<nav><a role="tab">Báo cáo huỷ món IC</a></nav><div data-rp-glossary hidden><p data-rp-term="X">X: một · Y: hai</p></div>` +
    `<div class="view-switch"><button class="btn" id="view-list">L</button><button class="btn" id="view-grid">G</button></div>` +
    `<div class="row"><div data-rp-visual="table" style="flex:1"><table><thead><tr><th>Long</th></tr></thead><tbody>${Array.from({length: 12}, (_, i) => `<tr><td>${i}</td></tr>`).join('')}</tbody></table></div></div>` +
    `<div data-rp-card data-built style="width:300px"><ul data-rp-card-pages style="display:grid;grid-template-columns:1fr"><li>A</li><li>B</li></ul></div>`),
};

if (process.argv.includes('--list')) for (const r of RULES) console.log(r.id.padEnd(22) + r.rule);
