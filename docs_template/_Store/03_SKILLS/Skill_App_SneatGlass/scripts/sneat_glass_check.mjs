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
        const bar = card.querySelector(':scope > .page-toolbar');
        const box = bar && bar.querySelector('.page-search .form-control'), filter = bar && bar.querySelector('.page-filter > .btn');
        const views = bar ? [...bar.querySelectorAll('.view-switch > .btn')] : [];
        if (!box || !filter || views.length < 2) return 'a page card lacks ' + [!box && 'the filter box', !filter && 'the filter button', views.length < 2 && 'the view switch'].filter(Boolean).join(', ');
        const look = e => { const c = getComputedStyle(e); return [Math.round(e.getBoundingClientRect().height), c.borderTopLeftRadius, c.backgroundColor].join(' '); };
        const fill = e => look(e).replace(/ [^ ]+px /, ' ');
        const plain = views.find(b => !b.classList.contains('active')) || views[0];
        if (look(box) !== look(filter) || fill(filter) !== fill(plain)) return 'the toolbar mixes designs: ' + [look(box), look(filter), look(plain)].join(' | ');
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
    id: 'see-through',
    rule: 'with glass on, a pinned header row or column is as clear as the cells beside it (alpha 0.25 at most) and blurred, in both themes - never a band',
    check: `(() => {
      if (document.documentElement.classList.contains('solid')) return true;
      const alpha = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const v = m[1].split(/[ ,/]+/).filter(Boolean); return v.length > 3 ? parseFloat(v[3]) : 1; };
      const band = [...document.querySelectorAll('th, td')].filter(e => e.getClientRects().length && getComputedStyle(e).position === 'sticky')
        .find(e => alpha(getComputedStyle(e).backgroundColor) > .25 || !getComputedStyle(e).backdropFilter.includes('blur'));
      return band ? 'a pinned cell that is not glass: ' + band.textContent.trim().slice(0, 30) : true;
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
    rule: 'every data table in list view lets each column be resized (a visible col-resize handle per header cell; widths are a setting of the person)',
    check: `(() => {
      if (innerWidth <= 768) return true;
      for (const t of document.querySelectorAll('.page-card:not(.view-grid) table[data-resize-id]')) {
        const bad = [...t.querySelectorAll('thead th')].find(h => { const g = h.querySelector('.column-resize-handle');
          return !g || g.getBoundingClientRect().width < 8 || getComputedStyle(g).cursor !== 'col-resize'; });
        if (bad) return 'a column without its resize handle: ' + bad.textContent.trim();
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
    id: 'kpi-align',
    rule: 'figure cards on one row keep their lines level: the main line, the percentage line and the secondary line start at the same height in every card, and no part of a card is cut',
    check: `(() => {
      const row = document.querySelector('#kpi-row');
      if (!row) return true;
      const cards = [...row.querySelectorAll('.kpi-card')].filter(card => card.getClientRects().length);
      const top = node => node ? Math.round(node.getBoundingClientRect().top) : NaN;
      const rows = new Map();
      for (const card of cards) { const y = top(card); rows.set(y, [...(rows.get(y) || []), card]); }
      for (const group of rows.values()) {
        if (group.length < 2) continue;
        for (const role of ['.kpi-main', '.kpi-percentage', '.kpi-secondary']) {
          // the secondary line is the card's last one (an account half's label also wears the secondary role)
          const tops = group.map(card => top(role === '.kpi-secondary' ? [...card.querySelectorAll(role)].pop() : card.querySelector(role)));
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
    rule: 'the greeting starts the top bar with readable width; the crumbs start the page panel below it and end at the current page',
    check: `(() => {
      const panelCrumbs = document.querySelector('.page-toolbar .page-crumbs');
      if (!panelCrumbs) return 'no crumbs at the start of the page panel';
      if (document.querySelector('#layout-navbar .breadcrumb')) return 'the crumbs still occupy the top bar';
      const toolbar = panelCrumbs.closest('.page-toolbar'), tools = toolbar.querySelector(':scope > .card-tools');
      if (!tools) return 'the page header panel has no search and filter toolbar beside the crumbs';
      if (innerWidth >= 768) {
        const c = panelCrumbs.getBoundingClientRect(), x = tools.getBoundingClientRect();
        if (Math.abs((c.top + c.bottom) / 2 - (x.top + x.bottom) / 2) > Math.max(c.height, x.height) / 2)
          return 'the crumbs and page tools are not on the same line';
      }
      const overview = toolbar.closest('.insights-page-toolbar');
      if (overview) {
        if (!tools.querySelector('input[type="search"]')) return 'the overview panel has no app search beside its crumbs';
        if (!tools.querySelector('#insight-range, .page-filter button')) return 'the overview panel has no period filter beside its crumbs';
        if (innerWidth >= 768 && getComputedStyle(overview).position !== 'sticky') return 'the overview header panel is not pinned while its cards scroll';
      }
      const items = [...panelCrumbs.querySelectorAll('.breadcrumb-item')];
      if (items.length < 2) return 'the page panel has fewer than two crumbs';
      const last = items.at(-1);
      if (last.querySelector('a') || last.getAttribute('aria-current') !== 'page') return 'the last crumb is not the page on screen (a link, or no aria-current)';
      const repeated = [...toolbar.querySelectorAll('.card-title, h1, h2, h3, h4, h5, h6')]
        .find(title => title.textContent.trim() === last.textContent.trim());
      if (repeated) return 'the page name is repeated as a title below the final crumb';
      if (location.pathname !== '/' && !items[0].querySelector('a')) return 'the first crumb (the family) does not go back to it';
      const self = items.slice(0, -1).find(i => { const a = i.querySelector('a'); return a && new URL(a.href, location.href).pathname === location.pathname; });
      if (self) return 'a crumb links to the page already open: ' + self.textContent.trim();
      const hello = document.querySelector('.navbar-hello'), search = document.querySelector('.navbar-search');
      if (innerWidth >= 1200 && (!hello || !hello.getClientRects().length)) return 'no greeting at the start of the top bar';
      if (hello && search && hello.getClientRects().length) {
        const h = hello.getBoundingClientRect(), s = search.getBoundingClientRect();
        if (h.right > s.left + 1) return 'the greeting does not stand before the search';
        if (h.width < 160) return 'the greeting is squeezed too narrow to read';
        if (hello.scrollWidth > hello.clientWidth + 1) return 'the greeting is clipped';
      }
      return true;
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
