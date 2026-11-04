// sneat_glass_check - the measurable rules of skill app-sneat-glass, run on a live page by the repo's browser test.
//
// Each rule is a browser expression that returns true, or a sentence saying what broke; evaluate it once the page and its
// opening transitions have settled (a dialog springs in, a button fades its fill). The repo's browser test (a CDP or
// Playwright script) imports RULES and evaluates every rule on every page it opens, at a desktop and a phone width, in both
// themes, and fails on any sentence. A rule added to the skill adds its entry here in the same change.
//
//   import {RULES, failures} from '../scripts/sneat_glass_check.mjs';
//   for (const rule of RULES) { const r = await evaluate(rule.check); if (r !== true) fail(rule.id + ': ' + r); }
//   node scripts/sneat_glass_check.mjs --list      prints the rules
//
// The rules read only the DOM and computed styles, so they hold for any app of the kind, whatever its framework.

/** Rules on the page as it stands (no dialog needed). */
export const RULES = [
  {
    id: 'toolbar',
    rule: 'every page card carries one toolbar of one design: filter box · filter button · view switch (same height, radius, fill), the chosen view lit, the box text clear of its icon',
    check: `(() => {
      const cards = [...document.querySelectorAll('.page-card')];
      for (const card of cards) {
        // the card's toolbar stands in the top bar's second row (the page bar), or at the head of the card
        const bar = document.querySelector('#layout-navbar #page-bar > .page-toolbar') || card.querySelector(':scope > .page-toolbar');
        const box = bar && bar.querySelector('.page-search .form-control'), filter = bar && bar.querySelector('.page-filter > .btn');
        const views = bar ? [...bar.querySelectorAll('.view-switch > .btn')] : [];
        if (!box || !filter || views.length < 2) return 'a page card lacks ' + [!box && 'the filter box', !filter && 'the filter button', views.length < 2 && 'the view switch'].filter(Boolean).join(', ');
        const look = e => { const c = getComputedStyle(e); return [Math.round(e.getBoundingClientRect().height), c.borderTopLeftRadius, c.backgroundColor].join(' '); };
        const fill = e => look(e).replace(/ [^ ]+px /, ' ');
        const plain = views.find(b => !b.classList.contains('active')) || views[0];
        // the filter button is lit while its filters show (it is the switch that opens them): then only its shape is compared
        const lit = filter.getAttribute('aria-expanded') === 'true';
        const shape = e => look(e).split(' ').slice(0, 2).join(' ');
        if ((lit ? shape(box) !== shape(filter) : look(box) !== look(filter)) || (!lit && fill(filter) !== fill(plain)))
          return 'the toolbar mixes designs: ' + [look(box), look(filter), look(plain)].join(' | ');
        const icon = box.parentElement.querySelector('i, svg');
        if (icon && parseFloat(getComputedStyle(box).paddingInlineStart) < icon.getBoundingClientRect().width + 8) return 'the filter box text runs under its icon';
        const active = views.find(b => b.classList.contains('active'));
        if (!views.some(b => b.disabled) && (!active || getComputedStyle(active).backgroundColor === getComputedStyle(plain).backgroundColor)) return 'the chosen view is not lit';
      }
      return true;
    })()`,
  },
  {
    id: 'one-fact',
    rule: 'a card line or a table cell holds one fact: a list of things shows as a count that opens their table',
    check: `(() => {
      const cells = [...document.querySelectorAll('.page-card tbody td, .card .card-body li, .card dd')];
      const bad = cells.find(c => / · |, .*, /.test(c.textContent.trim()) || c.querySelectorAll('.badge').length > 1);
      return bad ? 'a list inside one cell: "' + bad.textContent.trim().slice(0, 60) + '"' : true;
    })()`,
  },
  {
    id: 'frame',
    rule: 'from a tablet up the window does not scroll: the page column scrolls under the glass top bar (nothing above it), a page card scrolls inside with its toolbar and header row pinned',
    check: `(() => {
      if (innerWidth < 768) return true;
      const page = document.scrollingElement;
      if (page.scrollHeight > innerHeight + 1) return 'the window scrolls (' + page.scrollHeight + ' > ' + innerHeight + ')';
      const bar = document.querySelector('#layout-navbar'), col = document.querySelector('.layout-page');
      if (bar && col) {
        // The column starts where the bar starts (no gap above it) and the bar lies over what scrolls under it.
        const b = bar.getBoundingClientRect();
        if (Math.abs(col.getBoundingClientRect().top - b.top) > 1) return 'the page column does not start at the top bar: content shows above it';
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!top || !top.closest('#layout-navbar')) return 'the top bar does not lie over the content';
        if (!document.querySelector('.page-card.fill') && !/auto|scroll/.test(getComputedStyle(col).overflowY)) return 'a page of several cards: the page column is not the scroll box (cards are cut at the bar instead of passing under it)';
      }
      for (const body of document.querySelectorAll('.page-card.fill > .page-card-body')) {
        // The body scrolls, or one frame inside it does (a matrix whose first column pins sideways).
        const scrolls = e => /auto|scroll/.test(getComputedStyle(e).overflowY);
        if (!scrolls(body) && ![...body.children].some(scrolls)) return 'a page card body has no scroll box';
        const frame = body.querySelector(':scope > .table-responsive');
        if (frame && /auto|scroll|hidden/.test(getComputedStyle(frame).overflowY)) return 'a table frame inside the card body is a scroll box: its header row stops pinning';
        const th = body.querySelector('thead th');
        if (th && getComputedStyle(th).position !== 'sticky') return 'a table header row is not pinned';
      }
      return true;
    })()`,
  },
  {
    id: 'wide',
    rule: 'wide content (the default) fills the frame; compact keeps the kit container width',
    check: `(() => {
      const area = document.querySelector('.content-wrapper'), box = area && area.querySelector('.container-xxl, .container-fluid');
      if (!box || document.documentElement.classList.contains('content-compact')) return true;
      return area.clientWidth - box.getBoundingClientRect().width < 60 ? true : 'the content does not fill the frame (' + Math.round(box.getBoundingClientRect().width) + ' of ' + area.clientWidth + ')';
    })()`,
  },
  {
    id: 'card-hover',
    rule: 'in card view a card is one panel: no cell paints its own hover square',
    check: `(() => {
      const td = [...document.querySelectorAll('.view-grid tbody td')].find(c => getComputedStyle(c).boxShadow !== 'none');
      return td ? 'a card cell paints a square: ' + getComputedStyle(td).boxShadow.slice(0, 40) : true;
    })()`,
  },
  {
    id: 'vi-case',
    rule: 'Vietnamese keeps its own case: no text-transform capitalize',
    check: `(() => {
      const el = [...document.querySelectorAll('body *')].find(e => getComputedStyle(e).textTransform === 'capitalize' && e.textContent.trim());
      return el ? 'capitalized: "' + el.textContent.trim().slice(0, 40) + '"' : true;
    })()`,
  },
  {
    id: 'scrollbar',
    rule: 'every scroll box shows the Glass template scrollbar (12 px), never the browser default; no rule sets scrollbar-color or scrollbar-width',
    check: `(() => {
      for (const el of [document.documentElement, ...document.querySelectorAll('*')]) {
        const c = getComputedStyle(el);
        if (!/auto|scroll/.test(c.overflowY) || el.scrollHeight <= el.clientHeight + 1 || !el.getClientRects().length) continue;
        const bar = el.offsetWidth - el.clientWidth - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth);
        if (bar !== 12 && bar !== 0) return 'a default scrollbar (' + bar + ' px) on ' + (el.id || el.className).toString().slice(0, 40);
        if (c.scrollbarColor !== 'auto' || c.scrollbarWidth !== 'auto') return 'scrollbar-color / scrollbar-width set on ' + (el.id || el.className).toString().slice(0, 40);
      }
      return true;
    })()`,
  },
  {
    id: 'kit-controls',
    rule: 'every control and dialog label comes from the kit (form-control · form-select · form-check-input · form-label), one font everywhere (svg text and numbers too), the token font really loaded, no class of a former kind',
    check: `(() => {
      const shown = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const field = [...document.querySelectorAll('input, select, textarea')].filter(shown).find(e => !(e.type === 'hidden' ||
        (e.matches('input[type=checkbox], input[type=radio]') ? e.matches('.form-check-input, .btn-check') : e.matches('.form-control, .form-select, .form-range'))));
      if (field) return 'a control off the kit: ' + field.outerHTML.slice(0, 70);
      const label = [...document.querySelectorAll('.modal-body label')].filter(shown).find(l => !l.matches('.form-label, .form-check-label, .btn, .page-search, .form-check'));
      if (label) return 'a dialog label off the kit: ' + label.textContent.trim().slice(0, 30);
      const font = getComputedStyle(document.body).fontFamily;
      const other = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, label, input, select, button, td, th, p, b, small, span, svg text')]
        .filter(e => shown(e) && e.textContent.trim()).find(e => getComputedStyle(e).fontFamily !== font);
      if (other) return 'another font on ' + other.tagName;
      // The token font is LOADED, not only named: a named font the machine lacks falls back to the system font unseen.
      const family = font.split(',')[0].trim().replace(/["']/g, '');
      return [...document.fonts].some(f => f.family.replace(/["']/g, '') === family && f.status === 'loaded') ? true : 'the token font ' + family + ' is not loaded';
    })()`,
  },
  {
    id: 'switch-gap',
    rule: 'a switch keeps a gap (6 px or more) to its label',
    check: `(() => {
      for (const sw of document.querySelectorAll('.form-switch')) {
        const i = sw.querySelector('.form-check-input'), l = sw.querySelector('.form-check-label');
        if (i && l && sw.getClientRects().length && l.getBoundingClientRect().left - i.getBoundingClientRect().right < 6) return 'a switch touches its label: ' + l.textContent.trim();
      }
      return true;
    })()`,
  },
  {
    id: 'pin-cover',
    rule: 'a pinned header row or column is the card glass, clear through: with glass on it paints nothing of its own - no fill, no blur layer (a layer inside a glass card only blurs the card white: a white band) - and the rows that scroll under a pinned header are cut at its lower edge (the table body clipped from the scroll offset), so nothing reads through its titles; with glass off (solid) a pinned cell carries the solid fill',
    check: `(() => {
      const alpha = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 1; const v = m[1].split(/[ ,/]+/).filter(Boolean); return v.length > 3 ? parseFloat(v[3]) : 1; };
      const name = e => e.textContent.trim().slice(0, 30);
      const pinned = [...document.querySelectorAll('th, td')].filter(e => e.getClientRects().length && getComputedStyle(e).position === 'sticky');
      if (document.documentElement.classList.contains('solid')) {
        const clear = pinned.find(e => alpha(getComputedStyle(e).backgroundColor) < .95);
        return clear ? 'with glass off a pinned cell is not solid: ' + name(clear) : true;
      }
      for (const e of pinned) {
        const c = getComputedStyle(e), layer = getComputedStyle(e, '::before');
        if (alpha(c.backgroundColor) > .05) return 'a pinned cell paints a band over the card glass: ' + name(e);
        if ((c.backdropFilter || 'none') !== 'none' || (layer.content !== 'none' && ((layer.backdropFilter || 'none') !== 'none' || alpha(layer.backgroundColor) > .05)))
          return 'a pinned cell carries a blur layer of its own (it blurs the card white - a white band): ' + name(e);
      }
      // the rows under a pinned header are cut at its lower edge
      for (const head of new Set(pinned.filter(e => e.closest('thead')).map(e => e.closest('table')))) {
        const body = head.tBodies[0], th = head.tHead;
        if (!body || !body.rows.length) continue;
        const clip = getComputedStyle(body).clipPath;
        const m = /^inset\\(([\\d.]+)px/.exec(clip || '');
        if (!m) return 'the rows that scroll under a pinned header are not cut at its edge (no clip on the table body): ' + name(th.rows[0].cells[0]);
        const under = th.getBoundingClientRect().bottom - body.getBoundingClientRect().top;
        if (under > 1 && parseFloat(m[1]) < under - 2) return 'the rows read through the pinned header: cut ' + Math.round(parseFloat(m[1])) + ' px of ' + Math.round(under) + ' px under it';
      }
      return true;
    })()`,
  },
  {
    id: 'bar-switches',
    rule: 'the top bar carries the glass switch beside light / dark, lit while glass is on',
    check: `(() => {
      const g = document.querySelector('#layout-navbar [role=switch]#glass-toggle, #layout-navbar #glass-toggle');
      if (!g) return 'no glass switch in the top bar';
      const on = !document.documentElement.classList.contains('solid');
      return g.classList.contains('active') === on ? true : 'the glass switch is not lit as glass is ' + (on ? 'on' : 'off');
    })()`,
  },
  {
    id: 'resize',
    rule: 'every data table in list view lets each column be resized both ways (a visible col-resize handle per header cell; widths are a setting of the person): a resizable table lays out by its set widths (table-layout fixed), so a column narrows as well as it widens, and each column is drawn at the width set for it',
    check: `(() => {
      if (innerWidth <= 768) return true;
      for (const t of document.querySelectorAll('.page-card:not(.view-grid) table[data-resize-id]')) {
        const bad = [...t.querySelectorAll('thead th')].find(h => { const g = h.querySelector('.column-resize-handle');
          return !g || g.getBoundingClientRect().width < 8 || getComputedStyle(g).cursor !== 'col-resize'; });
        if (bad) return 'a column without its resize handle: ' + bad.textContent.trim();
        if (!t.dataset.resizeReady) continue;
        if (getComputedStyle(t).tableLayout !== 'fixed') return 'a resizable table lays out automatically - a column then never narrows past its text';
        const cols = [...t.querySelectorAll(':scope > colgroup > col')], heads = [...t.querySelectorAll('thead tr:first-child > th')];
        const off = heads.find((h, i) => cols[i] && cols[i].style.width && Math.abs(h.offsetWidth - parseFloat(cols[i].style.width)) > 2);
        if (off) return 'a column is not drawn at the width set for it: ' + off.textContent.trim();
      }
      return true;
    })()`,
  },
  {
    id: 'scroll-under-head',
    rule: 'a scroll box with a pinned header row carries the header height as --th, the top margin of its scrollbar track, so the vertical scrollbar starts under the header (the pixels are the browser test probe)',
    check: `(() => {
      for (const box of document.querySelectorAll('.page-card-body, .matrix-frame')) {
        const head = box.querySelector(':scope thead');
        if (!head || !box.getClientRects().length || box.scrollHeight <= box.clientHeight + 4) continue;
        const cell = head.querySelector('th');
        if (!cell || getComputedStyle(cell).position !== 'sticky') continue;
        const th = parseFloat(getComputedStyle(box).getPropertyValue('--th')) || 0;
        if (Math.abs(th - head.offsetHeight) > 2) return 'the scroll box does not carry its header height (--th ' + th + ', header ' + head.offsetHeight + ') - its scrollbar runs up beside the titles';
      }
      return true;
    })()`,
  },
  {
    id: 'chart-labels',
    rule: 'every chart shows its numbers, as a report does: a value on each bar, data labels on a line, the share of each donut part',
    check: `(() => {
      const bars = document.querySelectorAll('.bars .bar').length;
      if (bars && document.querySelectorAll('.bars .bar .bar-value').length !== bars) return 'a bar without its value';
      if (document.querySelector('.legend') && !document.querySelector('.legend .legend-pct')) return 'a donut legend without shares';
      if (document.querySelector('.trend-chart') && !document.querySelector('.trend-chart .lc-label')) return 'a line without data labels';
      return true;
    })()`,
  },
  {
    id: 'color-scheme',
    rule: 'the page declares its colour scheme (meta light dark, html color-scheme = the theme), so the forced dark mode of a phone browser leaves the theme alone',
    check: `(() => {
      if (document.querySelector('meta[name=color-scheme]')?.content !== 'light dark') return 'no <meta name=color-scheme content="light dark">';
      const theme = document.documentElement.dataset.theme;
      return !theme || getComputedStyle(document.documentElement).colorScheme === theme ? true : 'html color-scheme does not follow the theme';
    })()`,
  },
  {
    id: 'list-rows',
    rule: 'a list that scrolls (a dropdown, a dialog list) never squeezes its rows: every row keeps its height, none overlaps the next',
    check: `(() => {
      for (const l of document.querySelectorAll('.list-group, .notif-scroll')) {
        if (!l.getClientRects().length || l.scrollHeight <= l.clientHeight + 1) continue;
        const rows = [...l.children].filter(r => r.getClientRects().length);
        const bad = rows.find((r, i) => r.scrollHeight > r.clientHeight + 1 || (i > 0 && r.getBoundingClientRect().top < rows[i - 1].getBoundingClientRect().bottom - 1));
        if (bad) return 'a squeezed or overlapping row: ' + bad.textContent.trim().slice(0, 40);
      }
      return true;
    })()`,
  },
  {
    id: 'folded-centre',
    rule: 'the folded menu sets the badge and every icon on the rail centre line',
    check: `(() => {
      const html = document.documentElement;
      if (!html.classList.contains('layout-menu-collapsed') || html.classList.contains('layout-menu-hover') || innerWidth < 1200) return true;
      const m = document.getElementById('layout-menu').getBoundingClientRect(), c = (m.left + m.right) / 2;
      const bad = [document.querySelector('#layout-menu .app-brand-logo'), ...document.querySelectorAll('#layout-menu .menu-icon')]
        .find(e => e && Math.abs((e.getBoundingClientRect().left + e.getBoundingClientRect().right) / 2 - c) > 2);
      return bad ? 'off the rail centre: ' + (bad.className || bad.tagName) : true;
    })()`,
  },
  {
    id: 'real-actions',
    rule: 'no fake button: a button-styled link never points at the page already open',
    check: `(() => {
      const fake = [...document.querySelectorAll('a.btn[href], a.list-group-item[href]')].find(a => a.getClientRects().length &&
        !a.closest('#layout-menu') && new URL(a.href, location.href).pathname === location.pathname && !a.getAttribute('href').startsWith('#'));
      return fake ? 'a button to the page already open: ' + fake.textContent.trim().slice(0, 30) : true;
    })()`,
  },
  {
    id: 'kpi-pct',
    rule: 'every figure card shows a percentage: the change against the period before (WoW / MoM / QoQ) or the share it holds',
    check: `(() => {
      const bare = [...document.querySelectorAll('.kpi-card')].find(c => c.getClientRects().length && !c.textContent.includes('%'));
      return bare ? 'a figure card with no percentage: ' + bare.textContent.trim().slice(0, 30) : true;
    })()`,
  },
  {
    id: 'insights-kpis',
    rule: 'an Insights overview has four distinct figures: the account figure splits its main line into a User half and an Agent half, each with its count and share, and the fourth figure reports apps in use instead of repeating sign-ins',
    check: `(() => {
      const row = document.querySelector('#kpi-row');
      if (!row) return true;
      const cards = [...row.querySelectorAll(':scope > [data-kpi]')].filter(c => c.getClientRects().length);
      if (cards.length !== 4) return 'the Insights overview does not have exactly four figure cards';
      const accounts = row.querySelector('[data-kpi="activeUsers"]'), lines = [...(accounts?.querySelectorAll('.kpi-kind-split > [data-kind]') || [])];
      if (lines.length !== 2) return 'the account figure does not split into a User half and an Agent half';
      const labels = lines.map(line => line.querySelector('.kpi-main span')?.textContent.trim() || '');
      if (!/(user|người)/i.test(labels[0]) || !/agent/i.test(labels[1]) || new Set(labels).size !== 2)
        return 'the two account halves are not User and Agent';
      if (lines.some(line => !/\\d/.test(line.querySelector('.kpi-main b')?.textContent || '') || !/%/.test(line.querySelector('.kpi-percentage')?.textContent || '')))
        return 'a User or Agent half has no count and percentage';
      const shares = lines.map(line => Number.parseFloat((line.querySelector('.kpi-percentage')?.textContent || '').replace(',', '.')));
      if (shares.some(Number.isNaN) || Math.abs(shares[0] + shares[1] - 100) > .2)
        return 'the User and Agent percentages are not shares of the same active-account total';
      const apps = row.querySelector('[data-kpi="previous"]'), title = apps?.querySelector('p')?.textContent || '';
      const folded = (title + ' ' + (apps?.textContent || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!apps || !/(app|ung dung)/.test(folded)) return 'the fourth figure is not apps in use';
      if (/(so voi ky truoc|previous period)/.test(folded)) return 'the fourth figure still repeats the sign-in comparison';
      if (!/\\d/.test(apps.querySelector('h4.big')?.textContent || '') || !/%/.test(apps.querySelector('.kpi-delta')?.textContent || '') || !apps.querySelector('.kpi-extra'))
        return 'the apps-in-use figure has no count, share and enabled-app total';
      return true;
    })()`,
  },
  {
    id: 'kpi-type',
    rule: 'every Insights figure uses four fixed typography roles: title, main content, percentage and secondary content; the count of each account half is main content and its label takes the secondary typography, so a half never outgrows its card',
    check: `(() => {
      const row = document.querySelector('#kpi-row');
      if (!row) return true;
      const cards = [...row.querySelectorAll('.kpi-card')].filter(card => card.getClientRects().length);
      const num = value => Number.parseFloat(value) || 0;
      for (const card of cards) {
        const title = card.querySelector('.kpi-title'), main = card.querySelector('.kpi-main');
        const percentage = card.querySelector('.kpi-percentage'), secondary = card.querySelector('.kpi-secondary');
        if (!title || !main || !percentage || !secondary) return 'a figure card is missing a title, main, percentage or secondary typography role';
        const t = getComputedStyle(title), m = getComputedStyle(main), p = getComputedStyle(percentage), s = getComputedStyle(secondary);
        if (t.fontFamily !== m.fontFamily || t.fontFamily !== p.fontFamily || t.fontFamily !== s.fontFamily)
          return 'the four figure typography roles do not use one font family';
        if (num(m.fontSize) <= num(t.fontSize) || num(p.fontSize) > num(t.fontSize) || num(s.fontSize) > num(t.fontSize))
          return 'the figure typography size hierarchy is title < main and percentage/secondary <= title';
        if (num(p.fontWeight) <= num(s.fontWeight) || p.color === s.color)
          return 'percentage and secondary content are not visually distinct';
      }
      const accountMain = [...row.querySelectorAll('[data-kpi="activeUsers"] .kpi-kind-split .kpi-main')];
      if (accountMain.length !== 2) return 'the User and Agent halves do not each have one main line';
      const sign = node => { const s = getComputedStyle(node); return s.fontFamily + '|' + s.fontSize + '|' + s.fontWeight; };
      const total = row.querySelector('[data-kpi="activeUsers"] .kpi-extra');
      if (!total) return 'the account figure has no secondary line under its halves';
      for (const node of accountMain) {
        const count = node.querySelector('b'), label = node.querySelector('span');
        if (!count || !label) return 'an account half has no count or no label on its main line';
        if (sign(count) !== sign(node)) return 'an account count is not in the main-content typography';
        if (sign(label) !== sign(total)) return 'an account label is not in the secondary typography';
      }
      return true;
    })()`,
  },
  {
    id: 'control-name',
    rule: 'every control that shows no text of its own (an icon button, a switch, an icon link) carries its name - data-tip, aria-label or title - and that name is what pointing at it shows',
    check: `(() => {
      const bare = [...document.querySelectorAll('button, a[href], [role="switch"], [role="button"]')].filter(el => el.getClientRects().length &&
        !el.closest('dialog:not([open]), [hidden], .dropdown-menu:not(.show)') && !(el.textContent || '').trim() &&
        !(el.getAttribute('data-tip') || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim());
      return bare.length ? bare.length + ' icon control(s) without a name: ' + bare.slice(0, 3).map(el => el.id || el.className).join(' · ') : true;
    })()`,
  },
  {
    id: 'date-format',
    rule: 'every date the surface shows or takes follows the person date format of the family settings (dd/mm/yyyy or mm/dd/yyyy) and the app language - never the browser own date input, which follows the browser locale',
    check: `(() => {
      const native = [...document.querySelectorAll('input[type="date"], input[type="datetime-local"], input[type="month"]')].find(e => e.getClientRects().length || e.closest('.filter-pop, .slicer-menu'));
      if (native) return 'a browser date input (it shows the browser locale, not the person date format): ' + (native.id || native.getAttribute('aria-label'));
      const bad = [...document.querySelectorAll('.date-field input')].find(e => e.value && !/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(e.value));
      return bad ? 'a date field not in the day/month/year shape: ' + bad.value : true;
    })()`,
  },
  {
    id: 'bar-anchor',
    rule: 'the page bar holds two groups that never meet: the seek group - pinned filters, filter button, filter box, view switch, always side by side in that order - stands at its right end; the page own tools (its main action, what it shows beside its name) stand from its left, after the crumbs when the bar has them; pinning filters never moves the left group, and the filters shrink before they reach it',
    check: `(() => {
      const shown = e => e && e.getClientRects().length > 0;
      for (const bar of document.querySelectorAll('.page-toolbar')) {
        const tools = bar.querySelector(':scope > .card-tools');
        if (!tools || !shown(bar)) continue;
        const s = getComputedStyle(bar), b = bar.getBoundingClientRect();
        const left = b.left + parseFloat(s.paddingLeft), right = b.right - parseFloat(s.paddingRight);
        const filter = tools.querySelector(':scope > .page-filter'), box = tools.querySelector(':scope > .page-search');
        if (!filter || !box) return 'the seek group lacks ' + (filter ? 'the filter box' : 'the filter button');
        // side by side, in order: [pinned filters] [filter button] [filter box] [view switch], the last ending the bar
        const views = tools.querySelector(':scope > .page-views');
        if (!views && bar.querySelector('.page-views, .view-switch')) return 'the view switch stands outside the seek group - it ends the bar at the right';
        if (filter.nextElementSibling !== box || box.nextElementSibling !== views) return 'the seek group is not [filters] filter button · filter box · view switch, side by side in that order';
        if (views && views.nextElementSibling) return 'something stands after the view switch at the right end';
        const row = tools.querySelector(':scope > #filter-row');
        if (row && row.nextElementSibling !== filter) return 'the pinned filters do not stand against the filter button';
        const f = filter.getBoundingClientRect(), x = box.getBoundingClientRect(), end = (views || box).getBoundingClientRect();
        if (x.left - f.right > 12) return 'a gap of ' + Math.round(x.left - f.right) + ' px parts the filter button from the filter box';
        if (views && end.left - x.right > 12) return 'a gap of ' + Math.round(end.left - x.right) + ' px parts the filter box from the view switch';
        if (Math.abs(end.right - right) > 2) return 'the seek group does not end at the right end of the bar';
        // nothing of the page's own tools inside the seek group
        const stray = tools.querySelector('.page-actions, .add-btn');
        if (stray) return 'a page tool (' + (stray.id || stray.className.split(' ')[0]) + ') stands in the seek group - it belongs at the left';
        const lead = bar.querySelector(':scope > .card-lead'), start = bar.querySelector(':scope > .card-start');
        if (shown(lead) && lead.getBoundingClientRect().left - left > 2) return 'what leads the bar does not start at its left';
        if (shown(start)) {
          const from = shown(lead) ? lead.getBoundingClientRect().right : left;
          if (start.getBoundingClientRect().left - from > 20) return 'the page tools do not stand from the left of the bar';
          // the two groups never meet: on one line (a phone wraps them onto two), the first thing shown in the seek group
          // starts after the page tools end
          const p = start.getBoundingClientRect(), t = tools.getBoundingClientRect();
          const first = Math.min(...[...tools.querySelectorAll(':scope > *, :scope > #filter-row > *')].filter(shown).map(e => e.getBoundingClientRect().left));
          if (t.top < p.bottom - 2 && first < p.right + 4) return 'the seek group runs into the page tools at the left';
        }
        if (bar.querySelector(':scope > .page-actions, :scope > .page-views')) return 'a page tool stands loose on the bar, outside the left group';
      }
      return true;
    })()`,
  },
  {
    id: 'radius-kit',
    rule: 'corners are rounded lightly, as the Sneat kit has them (user 04/11): cards, fields, buttons, menus .375rem, dialogs and large frames .5rem - never more, except a shape that is round on purpose (a pill or a circle: its radius reaches half its height)',
    check: `(() => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize), most = .5 * rem + .5;
      const sel = '.card, .btn, .form-control, .form-select, .dropdown-menu, .modal-content, .layout-navbar, .page-search .form-control, .alert, .list-group, .nav-pills .nav-link';
      for (const e of document.querySelectorAll(sel)) {
        if (!e.getClientRects().length) continue;
        const c = getComputedStyle(e), r = Math.max(...['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map(k => parseFloat(c['border' + k + 'Radius']) || 0));
        const b = e.getBoundingClientRect();
        if (r > most && r < Math.min(b.width, b.height) / 2 - 1)
          return 'a corner rounded past the kit (' + Math.round(r) + ' px, the kit at most ' + Math.round(most) + '): ' + (e.id ? '#' + e.id : e.className.toString().split(' ').slice(0, 2).join('.'));
      }
      return true;
    })()`,
  },
  {
    id: 'no-raw-code',
    rule: 'a person reads names, never codes: a pick list, a filter, a badge or an action name shows the name of a value (from the dictionaries), never its stored code (data_query, login_ok) - a code outside the list reads as "other"',
    check: `(() => {
      const code = /^[a-z]+(_[a-z]+)+$/;
      const spots = '.slicer-item .form-check-label, .filter-field select option, .filter-row .slicer-btn, .badge, .log-action > b, td[data-label] > .badge, .g-select-menu .dropdown-item';
      const raw = [...document.querySelectorAll(spots)].find(e => code.test((e.textContent || '').replace(/^[^:]*:\\s*/, '').trim()));
      if (raw) return 'a stored code shows where a person reads a name: ' + raw.textContent.trim();
      // the action column of a log table
      for (const t of document.querySelectorAll('table')) {
        const at = [...t.querySelectorAll('thead th')].findIndex(h => /^(hành động|action)$/i.test(h.textContent.trim()));
        if (at < 0) continue;
        const cell = [...t.querySelectorAll('tbody tr')].map(r => r.cells[at]).find(c => c && code.test(c.textContent.trim()));
        if (cell) return 'a stored action code shows in the log: ' + cell.textContent.trim();
      }
      return true;
    })()`,
  },
  {
    id: 'search-steady',
    rule: 'a filter box keeps its width when it takes the focus - the focus lights its border, never grows it (growing pushed it out of its panel) - and stays whole inside its bar',
    check: `(() => {
      for (const box of document.querySelectorAll('.page-toolbar .page-search .form-control')) {
        if (!box.getClientRects().length || box.disabled) continue;
        const moves = getComputedStyle(box).transitionProperty.split(',').map(s => s.trim());
        if (moves.includes('width') || moves.includes('all') || moves.includes('max-width') || moves.includes('flex-basis'))
          return 'the filter box animates its width (' + moves.join(', ') + ') - focus lights the border only';
        const before = box.getBoundingClientRect().width, had = document.activeElement, rest = getComputedStyle(box).borderColor;
        box.style.setProperty('transition', 'none', 'important');   // the focus look itself, not the first frame of its fade
        box.focus();
        const after = box.getBoundingClientRect(), c = getComputedStyle(box);
        const bar = box.closest('.page-toolbar'), s = getComputedStyle(bar), b = bar.getBoundingClientRect();
        const lit = c.boxShadow !== 'none' || c.outlineStyle !== 'none' || c.borderColor !== rest;
        box.blur(); box.style.removeProperty('transition'); if (had && had !== document.body) had.focus?.();
        if (Math.abs(after.width - before) > 1) return 'the filter box grows on focus: ' + Math.round(before) + ' -> ' + Math.round(after.width) + ' px';
        if (after.right > b.right - parseFloat(s.paddingRight) + 1) return 'the filter box runs out of its bar';
        if (!lit) return 'the focused filter box does not light its border';
      }
      return true;
    })()`,
  },
  {
    id: 'dot-whole',
    rule: 'an online avatar shows its status dot whole: no box around the avatar clips the dot that sits on its edge',
    check: `(() => {
      for (const avatar of document.querySelectorAll('.avatar.avatar-online')) {
        if (!avatar.getClientRects().length) continue;
        const a = avatar.getBoundingClientRect(), need = {l: a.left - 3, t: a.top - 3, r: a.right + 3, b: a.bottom + 3};
        for (let box = avatar.parentElement; box && box !== document.body; box = box.parentElement) {
          if (getComputedStyle(box).overflow === 'visible') continue;
          const r = box.getBoundingClientRect();
          if (need.l < r.left || need.t < r.top || need.r > r.right || need.b > r.bottom)
            return 'an online dot is clipped by ' + (box.id ? '#' + box.id : box.className.toString().split(' ')[0]);
          break;   // the first box that clips and holds the avatar with its dot is the one that counts
        }
      }
      return true;
    })()`,
  },
  {
    id: 'kit-icons',
    rule: 'every icon of the shell - top bar, menu, command palette, page bar, menus - comes from the kit icon set; no emoji or typed sign stands in for an icon',
    check: `(() => {
      const zones = document.querySelectorAll('#layout-navbar, #layout-menu, #palette, .page-toolbar, .dropdown-menu.show, .modal-header');
      const emoji = /\\p{Extended_Pictographic}/u;
      for (const zone of zones) {
        const walk = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (emoji.test(n.nodeValue) && n.parentElement?.getClientRects().length) return 'an emoji stands in for an icon: "' + n.nodeValue.trim().slice(0, 20) + '"';
        }
      }
      const blank = [...document.querySelectorAll('#palette .pal-icon, #layout-menu .menu-icon')].find(i => i.getClientRects().length
        && !getComputedStyle(i).getPropertyValue('--svg').includes('svg') && !getComputedStyle(i, '::before').content.replace(/none|normal|"/g, ''));
      return blank ? 'an icon slot shows no kit icon' : true;
    })()`,
  },
  {
    id: 'filter-set',
    rule: 'a page card whose filter button is on offers labelled filters for fields of few values only: a pick list holds 10 values at most - the main records of the page are found with the search box, never listed in a filter',
    check: `(() => {
      const button = document.querySelector('.page-toolbar #filter-toggle');
      if (!button || button.disabled) return true;
      const box = document.querySelector('#filter-pop, #filter-row');
      if (!box) return button.getAttribute('aria-expanded') === 'true' ? 'the filter button is open but shows no filter set' : true;   // folded away
      const fields = [...box.querySelectorAll('.filter-field')];
      if (!fields.length) return 'the filter set is empty';
      if (fields.some(f => !f.querySelector('.filter-label')?.textContent.trim())) return 'a filter without its label';
      const long = [...box.querySelectorAll('.slicer')].find(s => Number(s.dataset.options) > 10)
        || [...box.querySelectorAll('select')].find(s => s.options.length > 11);
      return long ? 'a pick list of ' + (long.dataset?.options || long.options.length - 1) + ' values - a field of many values is searched, not listed' : true;
    })()`,
  },
  {
    id: 'filter-count',
    rule: 'the filter button counts the filters that are set (applied, not a draft), and the X that clears them stands on the page bar beside it exactly while one is set - whether the filters are pinned on the bar or all in the popover; in the popover Clear filters stands beside Apply in its foot',
    check: `(() => {
      const bar = document.querySelector('.page-toolbar');
      const button = bar && bar.querySelector('#filter-toggle');
      if (!button || button.disabled) return true;
      const set = document.querySelectorAll('#filter-pop .filter-field.on, #filter-row .filter-field.on').length;
      const shown = Number(button.querySelector('.filter-count')?.textContent || 0);
      if (set !== shown) return 'the filter button says ' + shown + ' but ' + set + ' filters are set';
      const x = bar.querySelector('#filter-clear');
      if (Boolean(x && x.getClientRects().length) !== set > 0) return 'the X on the bar ' + (set ? 'is missing while filters are set' : 'shows with no filter set');
      const pop = document.getElementById('filter-pop'), foot = pop && pop.querySelector('.filter-pop-foot');
      if (pop && !pop.hidden && set && !(foot && foot.querySelector('#filter-clear-pop') && foot.querySelector('#filter-apply')))
        return 'Clear filters does not stand beside Apply in the popover foot';
      return true;
    })()`,
  },
  {
    id: 'filter-pop',
    rule: 'the open filter popover fits the window - it never runs off the screen: its filters scroll inside it, and its foot (Clear filters beside Apply) stays in sight at its bottom; a filter changed in the popover is a draft - the rows change on Apply, all at once',
    check: `(() => {
      for (const pop of document.querySelectorAll('.filter-pop')) {
        if (pop.hidden || !pop.getClientRects().length) continue;
        const r = pop.getBoundingClientRect();
        if (r.bottom > innerHeight + 1) return 'the filter popover runs ' + Math.round(r.bottom - innerHeight) + ' px off the window';
        const body = pop.querySelector(':scope > .filter-pop-body'), foot = pop.querySelector(':scope > .filter-pop-foot');
        if (!body || !foot) return 'the filter popover has no scrolling body and foot';
        if (!/(auto|scroll)/.test(getComputedStyle(body).overflowY)) return 'the popover body does not scroll';
        if (pop.lastElementChild !== foot || foot.getBoundingClientRect().bottom > r.bottom + 1) return 'the popover foot is not in sight at its bottom';
        if (!foot.querySelector('#filter-apply')) return 'the popover foot has no Apply';
      }
      return true;
    })()`,
  },
  {
    id: 'filter-row',
    rule: 'the filters pinned on the page bar stand in the seek group against the filter button, on the bar one line, label beside control; each takes its standard width (12rem) at most and they shrink together, never pushed out, never a second line, and the bar keeps its height',
    check: `(() => {
      const row = document.querySelector('#filter-row');
      if (!row || !row.getClientRects().length) return true;
      const bar = row.closest('.page-toolbar');
      if (!bar || !row.parentElement.matches('.card-tools') || !row.nextElementSibling?.matches('.page-filter'))
        return 'the pinned filters do not stand in the seek group against the filter button';
      const mid = e => { const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2); };
      const fields = [...row.querySelectorAll('.filter-field')];
      const lead = [...bar.querySelectorAll(':scope > .card-lead, :scope > .card-start')].find(e => e.getClientRects().length);
      const mids = [...(lead ? [lead] : []), row.nextElementSibling, ...fields].map(mid);
      if (Math.max(...mids) - Math.min(...mids) > 2) return 'the page bar falls onto more than one line';
      // every filter whole inside the row: the filters share the room, none is pushed out or cut off
      const box = row.getBoundingClientRect();
      if (fields.some(f => { const r = f.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.width < 40; }))
        return 'a filter is pushed out of the row or squeezed under 40 px';
      // anchored right: a filter never grows past its standard width (12rem), the last one stands against the tools
      const most = parseFloat(getComputedStyle(document.documentElement).fontSize) * 12 + 2;
      if (fields.some(f => f.getBoundingClientRect().width > most)) return 'a filter stretches past its standard width (12rem)';
      const end = Math.max(...[...row.children].map(c => c.getBoundingClientRect().right));
      if (fields.length && box.right - end > 2) return 'the filters do not stand against the tools at the right';
      const s = getComputedStyle(bar), inner = bar.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
      return inner <= 44 ? true : 'the page bar line grew to ' + Math.round(inner) + ' px';
    })()`,
  },
  {
    id: 'kpi-align',
    rule: 'figure cards on one row keep their lines level: the main line, the percentage line and the secondary line start at the same height in every card, and no part of a card is cut',
    check: `(() => {
      const row = document.querySelector('#kpi-row');
      if (!row) return true;
      const cards = [...row.querySelectorAll('.kpi-card')].filter(card => card.getClientRects().length);
      const top = node => node ? Math.round(node.getBoundingClientRect().top) : NaN;
      // Layout positions, not painted ones: a card rising in (reveal) or leaning under the pointer (tilt) is transformed, which
      // moves its painted lines but not its layout. Rows group by the card's grid cell; a line is measured from its card.
      const inCard = (node, card) => {
        if (!node) return NaN;
        let y = 0;
        for (let n = node; n && n !== card && card.contains(n); n = n.offsetParent) y += n.offsetTop;
        return y;
      };
      const rows = new Map();
      for (const card of cards) { const y = top(card.parentElement); rows.set(y, [...(rows.get(y) || []), card]); }
      for (const group of rows.values()) {
        if (group.length < 2) continue;
        for (const role of ['.kpi-main', '.kpi-percentage', '.kpi-secondary']) {
          // the secondary line is the card's last one (an account half's label also wears the secondary role)
          const tops = group.map(card => inCard(role === '.kpi-secondary' ? [...card.querySelectorAll(role)].pop() : card.querySelector(role), card));
          if (tops.some(Number.isNaN)) return 'a figure card has no ' + role.slice(1) + ' line';
          if (Math.max(...tops) - Math.min(...tops) > 2) return 'the ' + role.slice(1) + ' lines of the figure cards on one row are not level (tops ' + tops.join(' / ') + ')';
        }
      }
      const cut = [...row.querySelectorAll('.kpi-card .card-body, .kpi-card .kpi-main')].find(node => node.scrollWidth > node.clientWidth + 1);
      return cut ? 'a figure line is wider than its card: ' + cut.textContent.trim().slice(0, 30) : true;
    })()`,
  },
  {
    id: 'crumbs',
    rule: 'the top bar is one glass head of two rows: row 1 = the crumbs at its start, the search at its centre, the day and time before the actions; the greeting lives in the account menu; row 2 = the page bar (its filters and tools); the crumbs are family / app / [group] / page (a small app: SasinONE / its name / its page; the hub: SasinONE / Hub / ...), every layer before the current page a link to that layer home, only the current page plain text',
    check: `(() => {
      const head = document.querySelector('#layout-navbar');
      if (!head) return 'no top bar';
      const row1 = head.querySelector(':scope > .nav-row1'), row2 = head.querySelector(':scope > #page-bar');
      if (!row1 || !row2) return 'the top bar is not one head of two rows (row 1 and the page bar)';
      if (document.querySelector('.page-toolbar .page-crumbs')) return 'the crumbs still sit in the page bar - they start row 1';
      if ([...row1.querySelectorAll('.navbar-hello, #greeting')].some(e => !e.closest('#account-menu')))
        return 'the greeting still takes row 1 - it belongs in the account menu';
      if (!document.querySelector('#account-menu .account-greeting')) return 'the account menu does not greet the person';
      const crumbs = row1.querySelector('.page-crumbs');
      if (innerWidth >= 768) {
        if (!crumbs || !crumbs.getClientRects().length) return 'no crumbs at the start of row 1';
        const search = row1.querySelector('.navbar-search'), actions = row1.querySelector('.navbar-actions');
        const c = crumbs.getBoundingClientRect(), s = search.getBoundingClientRect(), a = actions.getBoundingClientRect();
        if (c.right > s.left + 1 || s.right > a.left + 1) return 'row 1 is not crumbs · search · actions in that order';
        const r = row1.getBoundingClientRect();
        if (innerWidth >= 1200 && Math.abs((s.left + s.right) / 2 - (r.left + r.right) / 2) > 12) return 'the search is not at the centre of row 1';
        if (innerWidth >= 1200) {
          const day = row1.querySelector('#today');
          if (!day || !day.getClientRects().length) return 'no day and time in row 1';
          const d = day.getBoundingClientRect();
          if (d.right > a.left + 1 || d.left < s.right - 1) return 'the day and time do not stand between the search and the actions (they overlap one)';
        }
      }
      const tools = row2.querySelector(':scope > .page-toolbar > .card-tools');
      if (document.querySelector('.page-card, .insights-page') && !tools) return 'the page bar (row 2) holds no page tools';
      if (document.querySelector('.insights-page')) {
        if (!tools.querySelector('input[type="search"]')) return 'the overview page bar has no app search';
        if (!row2.querySelector('#insight-range, #insight-days')) return 'the overview page bar has no period filter';
      }
      if (!crumbs) return true;
      // family / app / [group] / page (user 04/11): a small app is SasinONE / its name / its page, the hub SasinONE / Hub / ...
      const items = [...crumbs.querySelectorAll('.breadcrumb-item')].filter(i => !i.hidden);
      if (items.length < 3) return 'fewer than three crumbs - family / app / page: the app layer is missing';
      const area = document.querySelector('#brand-area');
      if (area && items[1].textContent.trim() !== area.textContent.trim())
        return 'the second crumb is not the open app (' + area.textContent.trim() + '): ' + items[1].textContent.trim();
      const last = items.at(-1);
      if (last.querySelector('a') || last.getAttribute('aria-current') !== 'page') return 'the last crumb is not the page on screen (a link, or no aria-current)';
      const repeated = [...row2.querySelectorAll('.card-title, h1, h2, h3, h4, h5, h6')]
        .find(title => title.textContent.trim() === last.textContent.trim());
      if (repeated) return 'the page name is repeated as a title in the page bar';
      // every layer before the current one links to that layer's home - even when that home is the page on screen
      const plain = items.slice(0, -1).find(i => !i.querySelector('a[href]'));
      return plain ? 'an earlier layer is plain text - every layer before the page links to its home: ' + plain.textContent.trim() : true;
    })()`,
  },
  {
    id: 'brand-area',
    rule: 'under the family name, the small line names the open app and stays the same on every page of that app',
    check: `(() => {
      const menu = document.querySelector('#layout-menu'), text = menu?.querySelector('.app-brand-text');
      if (!text || !text.getClientRects().length) return true;
      const area = text.querySelector('.app-brand-area');
      const name = menu.dataset.appName?.trim();
      return area && name && area.textContent.trim() === name ? true : 'the brand area must equal the fixed app name';
    })()`,
  },
  {
    id: 'brand-one-red',
    rule: 'the accent part that ends the app name in the menu brand has the shared brand colour token --g-brand',
    check: `(() => {
      const brand = document.querySelector('#layout-menu .app-brand-name');
      if (!brand || !brand.getClientRects().length) return true;
      const accent = brand.querySelector('.text-primary');
      const name = brand.textContent.trim(), part = accent ? accent.textContent.trim() : '';
      if (!part || name === part || !name.endsWith(part)) return 'the menu brand has no accent part ending the app name';
      if (!getComputedStyle(document.documentElement).getPropertyValue('--g-brand').trim()) return 'the brand colour token --g-brand is not defined';
      const probe = document.createElement('span');
      probe.style.color = 'var(--g-brand)'; document.body.append(probe);
      const want = getComputedStyle(probe).color, got = getComputedStyle(accent).color;
      probe.remove();
      return got === want ? true : 'the accent part of the app name is not the brand colour --g-brand';
    })()`,
  },
  {
    id: 'menu-header-gap',
    rule: 'a group label in the open menu has at least 8 px between the short divider line and the first letter',
    check: `(() => {
      for (const header of document.querySelectorAll('#layout-menu .menu-header')) {
        const label = header.querySelector('.menu-header-text');
        if (!label?.getClientRects().length || getComputedStyle(label).opacity === '0') continue;
        const line = getComputedStyle(header, '::before');
        if (line.content === 'none' || line.display === 'none') continue;
        const end = header.getBoundingClientRect().left + (parseFloat(line.left) || 0) + (parseFloat(line.width) || 0);
        if (label.getBoundingClientRect().left - end < 8) return 'group label touches the divider line';
      }
      return true;
    })()`,
  },
];

/** Rules on an open dialog. */
export const DIALOG_RULES = [
  {
    id: 'dialog-size',
    rule: 'a dialog is S / M / L = 40 / 60 / 90 % of the frame in both directions at 16:9, whatever it holds; full screen on a phone',
    check: `(() => {
      const d = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (!d) return true;
      const r = d.getBoundingClientRect();
      if (innerWidth <= 768) return Math.abs(r.width - innerWidth) <= 2 ? true : 'a phone dialog is not full screen';
      const size = [...d.classList].find(c => /^sz-[sml]$/.test(c));
      if (!size) return 'a dialog has no size class sz-s / sz-m / sz-l';
      const p = {s: 40, m: 60, l: 90}[size.slice(3)], w = Math.min(p * innerWidth / 100, p * innerHeight / 100 * 16 / 9);
      return Math.abs(r.width - w) <= 2 && Math.abs(r.height - w * 9 / 16) <= 2 ? true
        : 'dialog ' + Math.round(r.width) + 'x' + Math.round(r.height) + ', want ' + Math.round(w) + 'x' + Math.round(w * 9 / 16);
    })()`,
  },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()) && process.argv.includes('--list')) {
  for (const r of [...RULES, ...DIALOG_RULES]) console.log(`${r.id.padEnd(12)} ${r.rule}`);
}
