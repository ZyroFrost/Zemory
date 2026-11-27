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
  // (v102, the requester 27/11 through the system-manager repo: a row of a log table drew its figures bigger than its words -
  // "setting phải luôn đồng nhất số phải luôn bằng nhau") one row, one size: the person's size scales the whole table, never
  // the figures alone
  {
    id: 'row-one-size',
    rule: 'every cell of a table row is drawn at one font size, words and figures alike: no cell, and no figure (data-rp-num) inside a cell, bigger or smaller than the others of its row - a size setting scales the whole table',
    check: `(() => {
      const px = e => parseFloat(getComputedStyle(e).fontSize);
      for (const table of document.querySelectorAll('#page table')) {
        if (!table.getClientRects().length || !table.tBodies.length) continue;
        const rows = [...table.tBodies[0].rows].filter(r => r.getClientRects().length).slice(0, 20);
        for (const row of rows) {
          const cells = [...row.cells].filter(c => c.getClientRects().length && (c.textContent || '').trim());
          if (cells.length < 2) continue;
          const size = px(cells[0]);
          const odd = cells.find(c => Math.abs(px(c) - size) > .5);
          if (odd) return 'a row draws its cells at two sizes: ' + size + 'px and ' + px(odd) + 'px (' + (odd.textContent || '').trim().slice(0, 24) + ')';
          for (const c of cells) for (const n of c.querySelectorAll('[data-rp-num]')) {
            if (Math.abs(px(n) - px(c)) > .5) return 'a figure is drawn at another size than its row: ' + px(n) + 'px in a ' + px(c) + 'px row (' + (n.textContent || '').trim().slice(0, 24) + ')';
          }
        }
      }
      return true;
    })()`,
  },
  {
    id: 'toolbar',
    rule: 'every page card carries one toolbar of one design: filter box · filter button · view switch (same height, radius, fill), the chosen view lit, the box text clear of its icon; a page of one view only (every report) shows no switch at all (user 06/11)',
    check: `(() => {
      const cards = [...document.querySelectorAll('.page-card')];
      for (const card of cards) {
        // the card's toolbar stands in the top bar's second row (the page bar), or at the head of the card
        const bar = document.querySelector('#layout-navbar #page-bar > .page-toolbar') || card.querySelector(':scope > .page-toolbar');
        const box = bar && bar.querySelector('.page-search .form-control'), filter = bar && bar.querySelector('.page-filter > .btn');
        const views = bar ? [...bar.querySelectorAll('.view-switch > .btn')] : [];
        // no switch = a page of one view (user 06/11: a faded switch only took room); a switch has two views or more
        // (v72, the user 14/11 through Dashboard: "khung lọc là khung giả, ko nhập dc") a page with nothing to search draws no box at
        // all - a box that takes no typing is the fake; bar-works catches a box shown that filters nothing
        if (!filter || views.length === 1) return 'a page card lacks ' + [!filter && 'the filter button', views.length === 1 && 'a second view in its switch'].filter(Boolean).join(', ');
        const look = e => { const c = getComputedStyle(e); return [Math.round(e.getBoundingClientRect().height), c.borderTopLeftRadius, c.backgroundColor].join(' '); };
        const fill = e => look(e).replace(/ [^ ]+px /, ' ');
        const plain = views.find(b => !b.classList.contains('active')) || views[0] || filter;
        // the filter button is lit while its filters show (it is the switch that opens them): then only its shape is compared
        const lit = filter.getAttribute('aria-expanded') === 'true';
        const shape = e => look(e).split(' ').slice(0, 2).join(' ');
        if ((box && (lit ? shape(box) !== shape(filter) : look(box) !== look(filter))) || (!lit && fill(filter) !== fill(plain)))
          return 'the toolbar mixes designs: ' + [box && look(box), look(filter), look(plain)].filter(Boolean).join(' | ');
        const icon = box && box.parentElement.querySelector('i, svg');
        if (icon && parseFloat(getComputedStyle(box).paddingInlineStart) < icon.getBoundingClientRect().width + 8) return 'the filter box text runs under its icon';
        const active = views.find(b => b.classList.contains('active'));
        if (views.length && !views.some(b => b.disabled) && (!active || getComputedStyle(active).backgroundColor === getComputedStyle(plain).backgroundColor)) return 'the chosen view is not lit';
      }
      return true;
    })()`,
  },
  {
    id: 'one-fact',
    rule: 'a card line or a table cell holds one fact: a list of things shows as a count that opens their table',
    check: `(() => {
      // (v61, Dashboard 11/11: a P&L row named "Tiếp khách, quà tặng, giao tế, khác" read as a list) the label cell that opens a
      // row of a table of two columns or more is the row's name from the data - one fact; words in brackets are its gloss
      // (v77, Dashboard 15/11: a material's name from the DW holds commas - "Thớt nhựa (Màu xanh lá rau củ), 25cm, cái") a cell the
      // app marks data-rp-name is the name of one thing from the data
      const label = c => c.matches('[data-rp-name]') || c.matches('td') && !c.previousElementSibling && c.parentElement && c.parentElement.children.length >= 2;
      // (v70, Reconcile 13/11: the tables of a board were never read - a fold row of a branch, its name, count and sum parted
      // by " · " in a td, passed) a table on a board is read as one on a page card
      const cells = [...document.querySelectorAll('.page-card tbody td, .page-board tbody td, .card .card-body li, .card dd')].filter(c => !label(c));
      const bad = cells.find(c => / · |, .*, /.test(c.textContent.replace(/\\([^)]*\\)/g, '').trim()) || c.querySelectorAll('.badge').length > 1);
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
      // a pinned first column: a cell scrolled under it sideways is cut at its right edge
      const leftCut = cell => { const m = /^inset\\(([\\d.]+)px(?: ([\\d.]+)px)?(?: ([\\d.]+)px)?(?: ([\\d.]+)px)?\\)/.exec(getComputedStyle(cell).clipPath || '');
        return m ? parseFloat(m[4] ?? m[2] ?? m[1]) : 0; };
      for (const pin of pinned.filter(e => !e.closest('thead') && getComputedStyle(e).left !== 'auto')) {
        const p = pin.getBoundingClientRect();
        for (const cell of [...pin.parentElement.children].filter(c => c !== pin)) {
          const r = cell.getBoundingClientRect(), under = Math.min(r.right, p.right) - r.left;
          if (r.left < p.right - 1 && under > 1 && leftCut(cell) < under - 2)
            return 'a cell scrolled under the pinned column reads through it (cut ' + Math.round(leftCut(cell)) + ' px of ' + Math.round(under) + '): ' + name(pin);
        }
      }
      return true;
    })()`,
  },
  {
    id: 'bar-switches',
    rule: 'the account menu of the top bar carries the quick settings - language, light / dark and the glass switch (on while glass is on); row 1 keeps only the apps and the bell beside the account',
    check: `(() => {
      const menu = document.querySelector('#layout-navbar #account-menu');
      if (!menu) return 'no account menu in the top bar';
      const g = menu.querySelector('[role=switch]#glass-toggle');
      if (!g || !menu.querySelector('#theme-toggle') || !menu.querySelector('[data-lang]')) return 'the account menu lacks language, light / dark or the glass switch';
      const row1 = document.querySelector('#layout-navbar > .nav-row1');
      const outside = row1 && [...row1.querySelectorAll('#theme-toggle, #glass-toggle, [data-lang], #today, .navbar-today')].find(e => !e.closest('#account-menu'));
      if (outside) return 'a quick setting or the day and time still stands in row 1: ' + (outside.id || outside.className);
      const on = !document.documentElement.classList.contains('solid');
      return (g.getAttribute('aria-checked') === 'true') === on ? true : 'the glass switch is not on as glass is ' + (on ? 'on' : 'off');
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
    rule: '(v43, user 08/11: "sao logo vẫn chưa canh giữa lại" - the brand row kept the kit\'s 84 px on a narrower rail, the badge 6 px right of the icons) the folded menu sets the badge, its brand row and every icon on the rail centre line, within 1 px',
    check: `(() => {
      const html = document.documentElement;
      if (!html.classList.contains('layout-menu-collapsed') || html.classList.contains('layout-menu-hover') || innerWidth < 1200) return true;
      const m = document.getElementById('layout-menu').getBoundingClientRect(), c = (m.left + m.right) / 2;
      const bad = [document.querySelector('#layout-menu .app-brand-logo'), document.querySelector('#layout-menu .app-brand'), ...document.querySelectorAll('#layout-menu .menu-icon, #layout-menu .menu-inner > .menu-item > .menu-link > i')]
        .find(e => e && e.getClientRects().length && Math.abs((e.getBoundingClientRect().left + e.getBoundingClientRect().right) / 2 - c) > 1);
      if (bad) return 'off the rail centre: ' + (bad.className || bad.tagName);
      // (v44, user 08/11: "bóp khung menu lại thì cái ô vuông khi chọn cũng phải vuông lại theo") the lit pill of the folded menu is a square
      const pill = document.querySelector('#layout-menu .menu-inner > .g-pill');
      if (pill && getComputedStyle(pill).opacity !== '0' && pill.getClientRects().length) {
        const p = pill.getBoundingClientRect();
        if (Math.abs(p.width - p.height) > 1) return 'the lit pill of the folded menu is ' + Math.round(p.width) + ' x ' + Math.round(p.height) + ', not a square';
      }
      return true;
    })()`,
  },
  {
    id: 'rail-slim',
    rule: '(v41, user 07/11: "thu nhỏ menu bên trái lại 1 tí") (v43, user 08/11: "menu vẫn chưa làm mỏng lại") the folded menu is a slim rail of 64 px (4rem), not the kit\'s 84 px; and its badge stays whole - its own shape (never squeezed or stretched), 28 px at least, inside the rail',
    check: `(() => {
      const html = document.documentElement, menu = document.getElementById('layout-menu');
      if (!menu || !html.classList.contains('layout-menu-collapsed') || html.classList.contains('layout-menu-hover') || innerWidth < 1200) return true;
      const m = menu.getBoundingClientRect();
      if (Math.abs(m.width - 64) > 1) return 'the folded rail is ' + Math.round(m.width) + ' px, not 64';
      const img = menu.querySelector('.app-brand-logo img, .app-brand img');
      if (!img || !img.getClientRects().length) return true;
      const r = img.getBoundingClientRect(), c = getComputedStyle(img);
      if (r.width < 28 || r.height < 28) return 'the badge shrank to ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' px';
      if (r.left < m.left - .5 || r.right > m.right + .5) return 'the badge runs out of the rail';
      // the drawn picture keeps its own shape: a box of another shape is fine only when the picture is fitted into it
      const nat = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
      if (nat && Math.abs(r.width / r.height - nat) > .04 * nat && !/contain|scale-down|none/.test(c.objectFit)) return 'the badge is ' + (r.width / r.height > nat ? 'stretched' : 'squeezed') + ': its box ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' for a picture of ' + img.naturalWidth + 'x' + img.naturalHeight;
      for (let box = img.parentElement; box && box !== menu; box = box.parentElement) {
        if (getComputedStyle(box).overflow === 'visible') continue;
        const k = box.getBoundingClientRect();
        if (r.left < k.left - .5 || r.right > k.right + .5 || r.top < k.top - .5 || r.bottom > k.bottom + .5) return 'the badge is cut by ' + (box.id || box.className); }
      return true;
    })()`,
  },
  {
    id: 'wall-brand',
    rule: '(v43, user 08/11: "đỏ nhiều quá... nó là 3 màu đỏ trắng đen, trắng vẫn nhiều hơn") the family\'s brand wallpaper tone (the one the frame names in data-wall-brand on <html>) is white, black and the brand colour, white the most: the large blob a a white light, the large blob b black or charcoal, and the brand colour (--g-brand) only in the small blob c, in both themes',
    check: `(() => {
      const html = document.documentElement, brand = html.dataset.wallBrand;
      if (!brand || html.dataset.wall !== brand) return true;
      const s = getComputedStyle(html), rgb = (v) => { const p = document.createElement('i'); p.style.color = v; document.body.append(p); const c = getComputedStyle(p).color.match(/\\d+/g).map(Number); p.remove(); return c; };
      const lum = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255, grey = (c) => Math.max(...c) - Math.min(...c) <= 30;
      const a = rgb(s.getPropertyValue('--g-blob-a').trim()), b = rgb(s.getPropertyValue('--g-blob-b').trim()), c = rgb(s.getPropertyValue('--g-blob-c').trim()), k = rgb(s.getPropertyValue('--g-brand').trim());
      if (lum(a) < .8 || !grey(a)) return 'the large blob a of the brand tone is not a white light: rgb(' + a + ')';
      if (lum(b) > .3 || !grey(b)) return 'the large blob b of the brand tone is not black or charcoal: rgb(' + b + ')';
      if (c.some((v, i) => Math.abs(v - k[i]) > 24)) return 'the small blob c of the brand tone is not the brand colour: rgb(' + c + '), the brand rgb(' + k + ')';
      return true;
    })()`,
  },
  {
    id: 'bar-one-size',
    rule: '(v43, user 08/11: the "+" stood 38 px beside pinned filters of 34 px, "phải khóa lại chính xác size") every control of the page bar - the page\'s own tools and the "+", every pinned filter, the filter button, the filter box, the view switch - is drawn at the bar\'s one height --tool-h within 1 px, and a button carrying only an icon is a square of it (Rule_Gate_97_BarOneSize); (v63) a framed cluster of row 2 is drawn at --tool-h and the controls inside it 8 px shorter, like the tabs',
    check: `(() => {
      const bar = document.querySelector('#page-bar .page-toolbar, .page-toolbar');
      if (!bar || !bar.getClientRects().length) return true;
      const h = parseFloat(getComputedStyle(bar).getPropertyValue('--tool-h')) || 38;
      const sel = '.card-start button, .card-start a.btn, .filter-row .form-select, .filter-row .form-control, .page-filter > .btn, .page-search .form-control, .view-switch > .btn, .card-tools > .filter-clear';
      // (v63, the user 12/11) a framed cluster of row 2 is drawn at --tool-h like the tab cluster, and the controls inside it
      // stand 8 px shorter, like the tabs
      const framed = e => { const c = e.closest('.bar-cluster'); return c && parseFloat(getComputedStyle(c).borderTopWidth) >= 1 ? c : null; };
      for (const c of bar.querySelectorAll('.bar-cluster')) {
        if (!framed(c) || !c.getClientRects().length) continue;
        const ch = c.getBoundingClientRect().height;
        if (Math.abs(ch - h) > 1) return 'a cluster of the page bar is ' + Math.round(ch) + ' px tall, the bar is ' + Math.round(h) + ': ' + c.dataset.cluster;
      }
      for (const e of bar.querySelectorAll(sel)) {
        if (!e.getClientRects().length || e.closest('.dropdown-menu, .modal, .slicer-menu, .filter-pop') || e.matches('.bar-grip')) continue;
        const r = e.getBoundingClientRect(), name = (e.getAttribute('aria-label') || e.textContent || e.id || e.className).trim().slice(0, 30);
        const want = framed(e) ? h - 8 : h;
        if (Math.abs(r.height - want) > 1) return 'a control of the page bar is ' + Math.round(r.height) + ' px tall, the bar is ' + Math.round(h) + (want !== h ? ' (' + Math.round(want) + ' inside a cluster)' : '') + ': ' + name;
        const words = (e.innerText || '').split('+').join('').trim();
        if (e.matches('button, a.btn') && !words && Math.abs(r.width - r.height) > 1) return 'an icon button of the page bar is ' + Math.round(r.width) + ' x ' + Math.round(r.height) + ', not a square: ' + name;
      }
      return true;
    })()`,
  },
  {
    id: 'pins-slim',
    rule: '(v41, user 07/11: "cái track để ghim tốn 1 đống diện tích") while the filter popover is open its pin head is ONE line (no tick list, at most 48 px) and each filter\'s pin sits on its label\'s line, at its right end, never over its words',
    check: `(() => {
      const h = document.getElementById('filter-pins');
      if (!h || !h.getClientRects().length) return true;
      if (h.querySelector('input[type=checkbox]')) return 'a tick list of pins is back at the popover head';
      const r = h.getBoundingClientRect(); if (r.height > 48) return 'the pin head is ' + Math.round(r.height) + ' px tall';
      for (const f of document.querySelectorAll('#filter-pop .filter-place')) {
        const pin = f.querySelector(':scope > [data-pin]'), label = f.querySelector('.filter-label');
        if (!pin || !label) return 'no pin or label on ' + f.dataset.filterId;
        const b = pin.getBoundingClientRect(), l = label.getBoundingClientRect(), c = f.getBoundingClientRect();
        if (b.bottom > l.bottom + 6 || b.top < c.top - 6 || b.right > c.right + 1) return 'the pin of ' + f.dataset.filterId + ' leaves its label line';
        const words = document.createRange(); words.selectNodeContents(label);
        if (b.left < words.getBoundingClientRect().right - 1) return 'the pin of ' + f.dataset.filterId + ' lies over its label';
      }
      return true;
    })()`,
  },
  {
    id: 'table-edges',
    rule: '(v46, the user 09/11 through Reconcile; v78, the user 16/11) a table in a page card is level with the page bar: the framed box of the table starts where the tools of the page bar start (the frame\'s room from the card edge), and the text of its first column stands --table-pad (.75rem) inside the box, within 1 px',
    check: `(() => {
      const card = document.querySelector('#page > .page-card');
      // (v47, Dashboard 09/11) a table page only: a table straight in the body of a page card that fills the frame - a table in a
      // panel of a board, or in an inner card, keeps that card's 1rem inset (card-inset) and is not read here; nor while the
      // card still rises in (FX: reveal scales it a little, a few px off)
      if (!card || card.matches('.view-grid') || !card.classList.contains('fill') || card.getAnimations().length) return true;
      const body = card.querySelector(':scope > .page-card-body'), table = body && [...body.querySelectorAll('table.table')].find(t => t.parentElement.closest('.card') === card);
      const bar = document.querySelector('#page-bar .page-toolbar') || card.querySelector(':scope > .page-toolbar');
      if (!table || !bar || !table.getClientRects().length || !bar.getClientRects().length || body.scrollLeft > 0) return true;
      const th = [...table.querySelectorAll('thead tr:first-child > th')].find(e => e.getClientRects().length);
      if (!th) return true;
      const barIn = bar.getBoundingClientRect().left + parseFloat(getComputedStyle(bar).paddingLeft);
      const textIn = th.getBoundingClientRect().left + parseFloat(getComputedStyle(th).paddingLeft);
      // (v78) the table's own framed box: its wrapper (a scroll box) or the table itself
      const up = table.parentElement, box = up.matches(':is(.table-responsive, .table-window, .table-scroller, .list-window, .matrix-frame):not(.page-card-body)') || (up.matches('div:not(.page-card-body, [class*="dom-page"], .card, .row)') && up.parentElement.matches('.card-body, .page-card-body, [class*="dom-page"], .rp-body, [data-rp-body]')) ? up : table;
      const boxIn = box.getBoundingClientRect().left + parseFloat(getComputedStyle(box).borderLeftWidth);
      const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--table-pad, 12px)';
      document.body.append(probe); const pad = probe.getBoundingClientRect().width; probe.remove();
      const boxOut = box.getBoundingClientRect().left;
      if (Math.abs(boxOut - barIn) > 1) return 'the box of the table starts ' + Math.round(boxOut - barIn) + ' px off the tools of the page bar';
      return Math.abs(textIn - boxIn - pad) <= 1 || 'the first column of the table stands ' + Math.round(textIn - boxIn) + ' px inside its box, the frame keeps ' + Math.round(pad);
    })()`,
  },
  {
    id: 'page-tabs',
    rule: '(v46, Dashboard 08/11, the user 09/11) the tab panel of the sibling pages, where an app shows it, is a frame panel above the page and outside it, pinned at the top, its tabs on one row (the rest under more), the pill under the tab of the page on screen, one even space between the tabs equal to the strip room at its ends (v48)',
    check: `(() => {
      const t = document.getElementById('page-tabs');
      if (!t || !t.getClientRects().length) return true;
      if (t.closest('#page')) return 'the tab panel stands inside the page - it is a panel of the frame above it';
      // (v56) in row 2 the cluster is part of the bar, which is pinned itself
      if (!t.closest('#layout-navbar') && getComputedStyle(t).position !== 'sticky') return 'the tab panel is not pinned at the top';
      const list = t.querySelector('.page-tabs-list'), items = [...list.querySelectorAll(':scope > .nav-item')].filter(i => i.getClientRects().length);
      if (new Set(items.map(i => Math.round(i.getBoundingClientRect().top))).size > 1 || list.scrollWidth > list.clientWidth + 1) return 'the tabs run past one row - the rest belongs under more';
      const a = list.querySelector('.nav-link.active'), p = t.querySelector('.page-tabs-pill');
      if (a && p && !p.getAnimations().length) {
        const x = p.getBoundingClientRect(), y = a.getBoundingClientRect();
        if (Math.abs(x.left - y.left) > 1 || Math.abs(x.width - y.width) > 1) return 'the pill is not under the tab of the page on screen';
      }
      // (v48, the user 09/11: the spaces between tabs were uneven) one space: the first tab at the strip's own room from its left
      // edge, and every two tabs exactly that room apart, within 1 px
      // (v56) the cluster's grip leads it: the first tab stands that same room after the grip
      // (v63) and its short / long switch beside the grip: the first tab stands that room after the last of the two
      const pad = parseFloat(getComputedStyle(t).paddingLeft), rs = items.map(i => i.getBoundingClientRect());
      const heads = [...t.querySelectorAll(':scope > .page-tabs-grip, :scope > .page-tabs-style')].filter(e => e.getClientRects().length);
      const start = heads.length ? Math.max(...heads.map(e => e.getBoundingClientRect().right)) + pad : t.getBoundingClientRect().left + t.clientLeft + pad;
      if (rs.length && Math.abs(rs[0].left - start) > 1) return 'the first tab stands ' + Math.round(rs[0].left - start + pad) + ' px from the strip edge, the strip keeps ' + Math.round(pad);
      for (let i = 1; i < rs.length; i++) { const gap = rs[i].left - rs[i - 1].right; if (Math.abs(gap - pad) > 1) return 'two tabs stand ' + Math.round(gap) + ' px apart, the strip ends ' + Math.round(pad) + ' px - one even space'; }
      return true;
    })()`,
  },
  {
    id: 'tool-framed',
    rule: '(v41, user 07/11: "mọi chức năng riêng của app phải là 1 nút có khung vuông đúng template, có hiệu ứng bấm") every button of the page\'s own tools (the left group of the bar, #card-start) is a framed button of the toolbar\'s height: a fill or an edge, rounded corners - never a bare icon',
    check: `(() => {
      const start = document.querySelector('#page-bar #card-start, .page-toolbar #card-start, .page-toolbar .card-start');
      if (!start) return true;
      // (v42, user 07/11: "chiều cao của nút riêng phải luôn bằng chiều cao của nguyên bộ filter bên phải") the height is the
      // filter button's as drawn, within 1 px - the add button and every coloured one too
      const bar = start.closest('.page-toolbar') || start, filter = bar.querySelector('.page-filter > .btn');
      // (v64) a filter button inside the framed seek cluster stands 8 px shorter than the bar: the bar's height is its + 8
      const fc = filter && filter.closest('.bar-cluster'), inFrame = fc && parseFloat(getComputedStyle(fc).borderTopWidth) >= 1;
      const h = filter && filter.getClientRects().length ? filter.getBoundingClientRect().height + (inFrame ? 8 : 0) : parseFloat(getComputedStyle(bar).getPropertyValue('--tool-h')) || 38;
      // a fill or an edge under 4% opacity shows nothing (a fading fill is read as clear)
      const clear = v => { if (!v || v === 'transparent') return true; const a = /rgba\\([^)]*,\\s*([\\d.]+)\\)$/.exec(v); return Boolean(a) && parseFloat(a[1]) < .04; };
      for (const b of start.querySelectorAll('button, a.btn, a.nav-link, [role=button], [role=tab]')) {
        // (v62) the grip of a cluster of row 2 is the frame's handle, not a tool of the page
        if (!b.getClientRects().length || b.closest('.dropdown-menu, .modal, .slicer-menu') || b.matches('.bar-grip')) continue;
        const c = getComputedStyle(b), r = b.getBoundingClientRect(), name = (b.getAttribute('aria-label') || b.textContent || b.id || b.className).trim().slice(0, 30);
        const filled = !clear(c.backgroundColor) || c.backgroundImage !== 'none', edged = parseFloat(c.borderTopWidth) > 0 && !clear(c.borderTopColor);
        if (!filled && !edged) return 'a bare tool button with no frame: ' + name;
        if (parseFloat(c.borderTopLeftRadius) < 2) return 'a tool button with square corners: ' + name;
        // (v63) inside a framed cluster of row 2 the cluster's frame stands at the filters' height and the button 8 px shorter
        const cl = b.closest('.bar-cluster'), want = cl && parseFloat(getComputedStyle(cl).borderTopWidth) >= 1 ? h - 8 : h;
        if (Math.abs(r.height - want) > 1) return 'a tool button ' + Math.round(r.height) + ' px tall, the filters are ' + Math.round(h) + (want !== h ? ' (' + Math.round(want) + ' inside a cluster)' : '') + ': ' + name;
      }
      return true;
    })()`,
  },
  {
    id: 'bar-ends-even',
    rule: '(v42, user 07/11: "padding ở cả 2 đầu panel trên cùng phải bằng nhau") each row of the top block - row 1 and the page bar - keeps the same room at both ends: from its left edge to its first control as from its last control to its right edge, within 2 px',
    check: `(() => {
      if (innerWidth < 768) return true;
      const rows = [document.querySelector('#layout-navbar > .nav-row1'), document.querySelector('#page-bar > .page-toolbar')].filter(r => r && r.getClientRects().length && r.getBoundingClientRect().height > 8);
      for (const row of rows) {
        const b = row.getBoundingClientRect();
        // (v56) the tab cluster in row 2 is one control: its frame, not the grip and tabs inside it; (v62) so is every cluster of
        // row 2 (the page's buttons, its info)
        const kids = [...row.querySelectorAll('button, input, select, a, .breadcrumb, .avatar, .nav-pills, .page-tabs-panel, .bar-cluster')]
          .filter(e => e.getClientRects().length && !e.closest('.dropdown-menu, .slicer-menu, [hidden]') && !(e.parentElement && e.parentElement.closest('.page-tabs-panel, .bar-cluster')))
          .map(e => ({e, r: e.getBoundingClientRect()})).filter(({r}) => r.width > 0 && r.right > b.left && r.left < b.right);
        if (!kids.length) continue;
        const first = kids.reduce((a, k) => (k.r.left < a.r.left ? k : a));
        const left = first.r.left - b.left, right = b.right - Math.max(...kids.map(k => k.r.right));
        if (left > b.width / 2) continue;   // nothing stands at the left: no left end to compare
        if (Math.abs(left - right) > 2) return (row.id || row.className.split(' ')[0]) + ': ' + Math.round(left) + ' px at the left end (' + (first.e.id || String(first.e.className).split(' ')[0] || first.e.tagName) + '), ' + Math.round(right) + ' px at the right';
      }
      return true;
    })()`,
  },
  {
    id: 'head-framed',
    rule: '(v42, user 07/11: "2 nút app và chuông cũng phải khung luôn cho đồng bộ") every icon button of row 1 (the apps, the bell) is framed like the bar\'s buttons - a fill or an edge, the kit radius (a square, not a circle) - at the search box\'s height, within 1 px',
    check: `(() => {
      const row = document.querySelector('#layout-navbar .navbar-actions');
      if (!row) return true;
      const search = document.querySelector('#layout-navbar .navbar-search .form-control, #layout-navbar .navbar-search input');
      const h = search && search.getClientRects().length ? search.getBoundingClientRect().height : 38;
      const clear = v => { if (!v || v === 'transparent') return true; const a = /rgba\\([^)]*,\\s*([\\d.]+)\\)$/.exec(v); return Boolean(a) && parseFloat(a[1]) < .04; };
      for (const b of row.querySelectorAll(':scope > li > .btn-icon, :scope > li > button.nav-link:not(:has(.avatar))')) {
        if (!b.getClientRects().length) continue;
        const c = getComputedStyle(b), r = b.getBoundingClientRect(), name = b.id || b.getAttribute('aria-label') || b.className;
        if (clear(c.backgroundColor) && c.backgroundImage === 'none' && !(parseFloat(c.borderTopWidth) > 0 && !clear(c.borderTopColor))) return 'a bare button in row 1: ' + name;
        if (parseFloat(c.borderTopLeftRadius) >= r.height / 2 - 1) return 'a round button in row 1 (the bar\\'s buttons are squares): ' + name;
        if (Math.abs(r.height - h) > 1) return 'a row 1 button ' + Math.round(r.height) + ' px tall, the search box is ' + Math.round(h) + ': ' + name;
      }
      return true;
    })()`,
  },
  {
    id: 'chosen-lit',
    rule: '(v42, user 07/11: "khung đang mở là màu xám, bấm qua thì nhận màu sáng") what is chosen is lit and what is not wears the grey frame: in a row of tabs every tab is framed and the chosen one has another fill and other words than the rest; the chosen view of the switch the same; the menu row of the page on screen reads on a filled pill',
    check: `(() => {
      const clear = v => { if (!v || v === 'transparent') return true; const a = /rgba\\([^)]*,\\s*([\\d.]+)\\)$/.exec(v); return Boolean(a) && parseFloat(a[1]) < .04; };
      const fill = e => { const c = getComputedStyle(e); return c.backgroundImage !== 'none' ? c.backgroundImage : c.backgroundColor; };
      const framed = e => { const c = getComputedStyle(e); return !clear(c.backgroundColor) || c.backgroundImage !== 'none' || (parseFloat(c.borderTopWidth) > 0 && !clear(c.borderTopColor)); };
      const rows = [...document.querySelectorAll('.nav-pills, .page-toolbar .view-switch')].filter(r => r.getClientRects().length && !r.closest('.dropdown-menu, [hidden]'));
      for (const row of rows) {
        const items = [...row.querySelectorAll('.nav-link, :scope > .btn')].filter(e => e.getClientRects().length && !e.closest('.dropdown-menu'));
        const on = items.find(e => e.classList.contains('active') || e.getAttribute('aria-selected') === 'true' || e.getAttribute('aria-pressed') === 'true');
        const rest = items.filter(e => e !== on && !e.disabled);
        const bare = rest.find(e => !framed(e));
        if (bare) return 'a tab or view at rest with no frame: ' + bare.textContent.trim().slice(0, 30);
        if (on && rest.length && (rest.some(e => fill(e) === fill(on)) || getComputedStyle(rest[0]).color === getComputedStyle(on).color)) return 'the chosen one is not lit: ' + on.textContent.trim().slice(0, 30);
      }
      const menu = document.getElementById('layout-menu'), pill = menu && menu.querySelector('.menu-inner > .g-pill');
      // (a menu off the screen - a narrow window keeps it closed - is not read; nor while its colours still ease in)
      const shown = menu && menu.getBoundingClientRect().right > 8 && menu.getBoundingClientRect().left < innerWidth;
      if (shown && pill && pill.getClientRects().length && pill.getBoundingClientRect().height > 4 && !pill.getAnimations().length) {
        const c = getComputedStyle(pill);
        if (c.backgroundImage === 'none' && clear(c.backgroundColor)) return 'the menu row of the page on screen stands on no fill';
        // (v96) the row under the pointer is lit by its hover, never the idle row to compare with
        const leaf = menu.querySelector('.menu-item.active:not(:has(> .menu-sub)) > .menu-link'), idle = menu.querySelector('.menu-item:not(.active) > .menu-link:not(:hover)');
        if (leaf && idle && getComputedStyle(leaf).color === getComputedStyle(idle).color) return 'the menu row of the page on screen reads like the others';
      }
      return true;
    })()`,
  },
  {
    id: 'crumb-chevron',
    rule: '(v42, user 07/11: "cái path nên thành > cho đẹp") the crumbs are parted by a chevron (the kit\'s icon), never a typed "/"',
    check: `(() => {
      for (const item of document.querySelectorAll('.breadcrumb-item + .breadcrumb-item')) {
        if (!item.getClientRects().length) continue;
        const c = getComputedStyle(item, '::before');
        if (/[\\/|]/.test(c.content) || (c.content !== 'none' && c.content !== '""' && c.maskImage === 'none' && c.webkitMaskImage === 'none' && !/svg|chevron/.test(c.backgroundImage))) return 'a crumb parted by ' + c.content;
      }
      return true;
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
        // (v72) the filter box only where the page has something to search
        if (!filter) return 'the seek group lacks the filter button';
        // side by side, in order: [pinned filters] [filter button] [filter box] [view switch], the last ending the bar
        const views = tools.querySelector(':scope > .page-views');
        if (!views && bar.querySelector('.page-views, .view-switch')) return 'the view switch stands outside the seek group - it ends the bar at the right';
        if (box ? filter.nextElementSibling !== box || box.nextElementSibling !== views : filter.nextElementSibling !== views) return 'the seek group is not [filters] filter button · filter box · view switch, side by side in that order';
        if (views && views.nextElementSibling) return 'something stands after the view switch at the right end';
        const row = tools.querySelector(':scope > #filter-row');
        if (row && row.nextElementSibling !== filter) return 'the pinned filters do not stand against the filter button';
        const f = filter.getBoundingClientRect(), x = (box || filter).getBoundingClientRect(), end = (views || box || filter).getBoundingClientRect();
        if (x.left - f.right > 12) return 'a gap of ' + Math.round(x.left - f.right) + ' px parts the filter button from the filter box';
        if (views && end.left - x.right > 12) return 'a gap of ' + Math.round(end.left - x.right) + ' px parts the filter box from the view switch';
        // (v64, the user 12/11) the seek group is the fourth cluster: framed, it ends the bar by its frame; dragged by the person
        // before another cluster, it no longer ends the bar (nor do the page tools have to open it)
        const framedSeek = tools.matches('.bar-cluster') && parseFloat(getComputedStyle(tools).borderTopWidth) >= 1;
        const tr = tools.getBoundingClientRect();
        // moved = the person's order puts another cluster after it (read from the flex order, never from where things stand: a
        // seek group that runs over the page tools must still be caught)
        const ord = e => parseFloat(getComputedStyle(e).order) || 0;
        const moved = [...bar.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot')]
          .some(c => c !== tools && shown(c.matches('#page-tabs-slot') ? c.firstElementChild : c) && ord(c) > ord(tools));
        if (!moved && Math.abs((framedSeek ? tr.right : end.right) - right) > 2) return 'the seek group does not end at the right end of the bar';
        // nothing of the page's own tools inside the seek group
        const stray = tools.querySelector('.page-actions, .add-btn');
        if (stray) return 'a page tool (' + (stray.id || stray.className.split(' ')[0]) + ') stands in the seek group - it belongs at the left';
        const lead = bar.querySelector(':scope > .card-lead'), start = bar.querySelector(':scope > .card-start');
        if (shown(lead) && lead.getBoundingClientRect().left - left > 2) return 'what leads the bar does not start at its left';
        // (v63) a tools box drawn as its children (display: contents) is read by what it holds
        const kids = start ? [...start.children].filter(shown) : [];
        const flat = start && getComputedStyle(start).display === 'contents';
        const span = !flat ? (start && start.getBoundingClientRect()) : kids.length ? kids.map(k => k.getBoundingClientRect()).reduce((a, b) => ({left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom)})) : null;
        if (span && (flat || shown(start)) && !moved) {
          const from = shown(lead) ? lead.getBoundingClientRect().right : left;
          // (v64, the user 12/11: "mặc định… luôn là tab, nút trang, thông tin, filter") the tab cluster in row 2 opens the row by
          // default: the left group is whatever cluster stands first
          const tabsIn = bar.querySelector('#page-tabs-slot > .page-tabs-panel');
          const opens = shown(tabsIn) ? Math.min(span.left, tabsIn.getBoundingClientRect().left) : span.left;
          if (opens - from > 20) return 'the page tools do not stand from the left of the bar';
          // the two groups never meet: on one line (a phone wraps them onto two), the first thing shown in the seek group
          // starts after the page tools end
          const p = span, t = tools.getBoundingClientRect();
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
    rule: 'corners are rounded lightly, as the Sneat kit has them: cards, fields, buttons, menus .375rem, dialogs and large frames .5rem - never more, except a shape that is round on purpose (a pill or a circle: its radius reaches half its height)',
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
    rule: 'a person reads names, never codes: a pick list, a filter, a badge, an action name or a table column shows the name of a value (from the dictionaries), never its stored code - neither a code with an underscore (data_query, login_ok) nor a bare lowercase word (data, ops) - a code outside the list reads as "other"; a list drawn only while open is read by the probe names-in-lists',
    check: `(() => {
      // (v87, the user 25/11 through the system-manager repo: the Group filter of Apps listed "data" and "ops" - lowercase, not in
      // Vietnamese - and this rule passed them: it knew only codes with an underscore) a bare lowercase word is a code too
      const code = /^[a-z]+(_[a-z]+)*$/;
      const spots = '.slicer-item .form-check-label, .filter-field select option, .filter-row .slicer-btn, .badge, .log-action > b, td[data-label] > .badge, .g-select-menu .dropdown-item';
      const raw = [...document.querySelectorAll(spots)].find(e => code.test((e.textContent || '').replace(/^[^:]*:\\s*/, '').trim()));
      if (raw) return 'a stored code shows where a person reads a name: ' + raw.textContent.trim();
      for (const t of document.querySelectorAll('table')) {
        // (v98, Audit 27/11 through the system-manager repo) a table of raw evidence shows a log as stored: its codes are data
        if (t.closest('[data-raw-evidence]')) continue;
        const heads = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim());
        const rows = [...t.querySelectorAll('tbody tr')];
        // the action column of a log table: one code is enough
        const at = heads.findIndex(h => /^(hành động|action)$/i.test(h));
        const cell = at < 0 ? null : rows.map(r => r.cells[at]).find(c => c && code.test(c.textContent.trim()));
        if (cell) return 'a stored action code shows in the log: ' + cell.textContent.trim();
        // (v87) any other column whose every filled cell is a code, two at least (the Group column of Apps printed data, ops);
        // a column named as an identifier (Mã, Code, ID) shows codes on purpose
        for (let i = 0; i < heads.length; i++) {
          if (i === at || /^(mã|code|id)(?=\\s|$)/i.test(heads[i])) continue;
          const cells = rows.map(r => r.cells[i]).filter(c => c && c.textContent.trim());
          if (cells.length >= 2 && cells.every(c => code.test(c.textContent.trim())))
            return 'a column shows stored codes where a person reads names: ' + (heads[i] || 'column ' + (i + 1)) + ' (' + cells[0].textContent.trim() + ')';
        }
      }
      return true;
    })()`,
  },
  {
    id: 'view-real',
    rule: 'the view switch does what it says: with the list view chosen the page card shows rows (a table body or a list), with the grid view it shows cards - a switch that changes nothing is a fake button',
    check: `(() => {
      const shown = e => e.getClientRects().length > 0;
      for (const bar of document.querySelectorAll('.page-toolbar')) {
        const buttons = [...bar.querySelectorAll('.view-switch > .btn')];
        const on = buttons.find(b => b.classList.contains('active'));
        if (!on || buttons.some(b => b.disabled)) continue;
        const key = (on.id || '').replace(/^view-/, '');
        if (key !== 'list' && key !== 'grid') continue;
        const card = document.querySelector('.page-card'), body = card && card.querySelector(':scope > .page-card-body');
        if (!body) continue;
        const rows = [...body.querySelectorAll('tbody tr, [role=listitem]')].filter(shown).length;
        const cards = [...body.querySelectorAll('.card')].filter(shown).length;
        if (key === 'list' && !rows && cards) return 'the list view is chosen but the page shows cards, not rows';
        if (key === 'grid' && !card.classList.contains('view-grid') && !cards && rows) return 'the grid view is chosen but the page shows rows, not cards';
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
    rule: 'an online avatar shows its status dot whole, and a count on a button (the bell\'s unread) stands whole out of it: no box clips the dot or the count that sits on its edge (v33, user 06/11: the bell\'s count was cut inside its round button)',
    check: `(() => {
      // row 1 folded, or folding / unfolding (v42, Reconcile 07/11: read mid-flight its avatar stood above .layout-page and
      // read as clipped, now and then): not read
      const folded = e => { const row = e.closest('.nav-row1'); return Boolean(row) && (document.documentElement.classList.contains('head-folded') || row.getAnimations().length > 0); };
      for (const avatar of document.querySelectorAll('.avatar.avatar-online')) {
        if (!avatar.getClientRects().length || folded(avatar)) continue;
        const a = avatar.getBoundingClientRect(), need = {l: a.left - 3, t: a.top - 3, r: a.right + 3, b: a.bottom + 3};
        for (let box = avatar.parentElement; box && box !== document.body; box = box.parentElement) {
          if (getComputedStyle(box).overflow === 'visible') continue;
          const r = box.getBoundingClientRect();
          if (need.l < r.left || need.t < r.top || need.r > r.right || need.b > r.bottom)
            return 'an online dot is clipped by ' + (box.id ? '#' + box.id : box.className.toString().split(' ')[0]);
          break;   // the first box that clips and holds the avatar with its dot is the one that counts
        }
      }
      // (v33) a count badge on a button: the whole badge, no box around it clips it
      for (const badge of document.querySelectorAll('.badge-notifications, [data-count-badge]')) {
        if (!badge.getClientRects().length || folded(badge)) continue;
        const b = badge.getBoundingClientRect();
        for (let box = badge.parentElement; box && box !== document.body; box = box.parentElement) {
          if (getComputedStyle(box).overflow === 'visible') continue;
          const r = box.getBoundingClientRect();
          if (b.left < r.left - .5 || b.top < r.top - .5 || b.right > r.right + .5 || b.bottom > r.bottom + .5)
            return 'a count on a button is clipped by ' + (box.id ? '#' + box.id : box.className.toString().split(' ')[0]);
        }
      }
      return true;
    })()`,
  },
  {
    id: 'box-holds',
    rule: 'an avatar stands inside the box that holds it: no box sized smaller than its avatar lets the avatar run over into the name or the text beside it (v35, user 07/11: a 100 px box held a 120 px profile avatar, which ran over the gap into the name); an avatar stack, whose avatars overlap on purpose, is left out',
    check: `(() => {
      for (const avatar of document.querySelectorAll('.avatar')) {
        if (!avatar.getClientRects().length || avatar.closest('.avatar-stack, .avatar-group')) continue;
        const box = avatar.parentElement;
        if (!box || box === document.body) continue;
        const a = avatar.getBoundingClientRect(), b = box.getBoundingClientRect();
        if (a.width < 2 || b.width < 2) continue;
        if (a.right > b.right + 1 || a.bottom > b.bottom + 1 || a.left < b.left - 1)
          return 'an avatar runs out of the box that holds it by ' + Math.round(Math.max(a.right - b.right, a.bottom - b.bottom, b.left - a.left)) + ' px: ' + (box.id ? '#' + box.id : box.className.toString().split(' ').slice(0, 2).join('.'));
      }
      return true;
    })()`,
  },
  {
    id: 'page-bar',
    rule: 'every page has its row-2 panel - the page\'s own bar (page-toolbar) under the top bar: in the compact frame row 2 (#page-bar) holds it, in the classic frame it stands as the page\'s first card; a page that is not a page card fills it too (PageToolbar), never leaving row 2 empty (v36, user 07/11: "bộ khung chuẩn là panel hàng 2… mất toàn bộ panel hàng 2 mà ko hề nhận ra")',
    check: `(() => {
      if (!document.getElementById('page') || !document.getElementById('layout-navbar')) return true;
      const slot = document.getElementById('page-bar');
      const bar = slot ? slot.querySelector('.page-toolbar') : document.querySelector('#page .page-toolbar');
      if (!bar || !bar.getClientRects().length) return slot ? 'row 2 of the frame is empty: the page puts no bar in #page-bar' : 'the page has no bar of its own (page-toolbar) at its head';
      if (bar.getBoundingClientRect().height < 24) return 'the page bar is drawn ' + Math.round(bar.getBoundingClientRect().height) + ' px high';
      return true;
    })()`,
  },
  {
    id: 'bar-aligned',
    rule: 'the controls of one row stand on one line: every button, field, pick list, tab and search box side by side in one row - the page bar, a card or panel head, any row of the page, a dialog - share their vertical centre (within 3 px); an app\'s own CSS that pushes one down (a margin, a padding of an old card rule) shows (v37, Reconcile 07/11: an old .card button rule pushed buttons 16 px down and the check read green; v38: every row, not the page bar only - the fault sat in a panel head inside the page)',
    check: `(() => {
      const SEL = '.btn, button, .form-control, .form-select, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .nav-link, .page-search';
      const name = x => x.id ? '#' + x.id : (x.getAttribute('aria-label') || x.textContent.trim() || x.className.toString().split(' ')[0]).slice(0, 24);
      // the row of a control: its nearest flex box laid out as a row, widened to the outermost row it sits in - a head holds a
      // group of fields and a group of buttons, each its own flex box; they still form one row
      const flexRow = p => { const s = getComputedStyle(p); return /flex/.test(s.display) && /^row/.test(s.flexDirection); };
      const STOP = '#page, #page-bar, dialog, .modal-content, body';
      const rowOf = e => {
        let p = e.parentElement;
        while (p && !p.matches(STOP) && !/flex/.test(getComputedStyle(p).display)) p = p.parentElement;
        if (!p || p.matches(STOP) || !flexRow(p)) return null;
        while (p.parentElement && !p.parentElement.matches(STOP) && flexRow(p.parentElement)) p = p.parentElement;
        return p;
      };
      const rows = new Map();
      for (const e of document.querySelectorAll('#page-bar ' + SEL.split(', ').join(', #page-bar ') + ', #page ' + SEL.split(', ').join(', #page ') + ', dialog[open] ' + SEL.split(', ').join(', dialog[open] '))) {
        if (!e.getClientRects().length || e.getBoundingClientRect().height <= 8) continue;
        if (e.closest('.dropdown-menu, .filter-pop, [hidden], table') || (e.parentElement && e.parentElement.closest(SEL))) continue;
        const row = rowOf(e);
        if (!row) continue;
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row).push({e, r: e.getBoundingClientRect()});
      }
      for (const boxes of rows.values()) for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, b = boxes[j].r;
        if (Math.abs(a.height - b.height) > 8) continue;   // a tall field beside a button may stand at the top on purpose
        const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlap < Math.min(a.height, b.height) * .3) continue;   // wrapped to the next line: not the same row
        const off = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
        if (off > 3) return 'two controls of one row stand ' + Math.round(off) + ' px apart in height: ' + name(boxes[i].e) + ' / ' + name(boxes[j].e);
      }
      return true;
    })()`,
  },
  {
    id: 'help-in-menu',
    rule: 'help opens from one place: the Help page of the frame (the menu\'s Help; its two tabs General and the app\'s own guide, config.help) - the page bar carries no help or guide button of its own; a link inside a page may open a section with sasinShell.openHelp (v39, user 07/11: "2 tab trong cùng 1 trang trợ giúp")',
    check: `(() => {
      const WORDS = /^(\\?|trợ giúp|hướng dẫn|help|guide|user guide)$/i;
      for (const bar of document.querySelectorAll('#page-bar .page-toolbar, #page .page-toolbar')) {
        for (const b of bar.querySelectorAll('button, a, [role=button]')) {
          if (!b.getClientRects().length) continue;
          const said = [b.textContent, b.getAttribute('aria-label'), b.getAttribute('title'), b.dataset.tip].map(x => (x || '').trim()).filter(Boolean);
          if (b.querySelector('.bx-help-circle, .bx-question-mark, .bx-book-reader') || said.some(x => WORDS.test(x)))
            return 'the page bar carries a help button of its own (help opens from the menu\\'s Help page): ' + (b.id ? '#' + b.id : said[0] || 'a button');
        }
      }
      return true;
    })()`,
  },
  {
    id: 'tabs-in-panel',
    rule: 'a row of tabs never stands loose in the page: it is in row 2 of the frame (the page bar), in a card or in a dialog (v36, user 07/11: the profile settings tabs stood loose under the bar)',
    check: `(() => {
      for (const row of document.querySelectorAll('#page .nav-pills, #page [role=tablist], #page-bar .nav-pills, #page-bar [role=tablist]')) {
        if (!row.getClientRects().length) continue;
        if (row.closest('#page-bar, .page-toolbar, .card, dialog, .modal')) continue;
        return 'a row of tabs stands loose in the page, not in the page bar nor a card: ' + row.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40);
      }
      return true;
    })()`,
  },
  {
    id: 'tab-pill',
    rule: 'a row of tabs (nav-pills, a tablist) shows its chosen tab as Sneat does: a filled pill - its own fill or the sliding pill under it - never bare words standing loose on the page (v35, user 07/11: "cấu trúc skill sneat ko có nút nào nằm lẻ như chữ tài khoản với mk")',
    check: `(() => {
      const alpha = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 0; const v = m[1].split(/[ ,/]+/).filter(Boolean); return v.length > 3 ? parseFloat(v[3]) : 1; };
      const filled = e => { const s = getComputedStyle(e); return alpha(s.backgroundColor) > .04 || (s.backgroundImage || 'none') !== 'none'; };
      for (const row of document.querySelectorAll('.nav-pills, [role=tablist]')) {
        if (!row.getClientRects().length) continue;
        const tab = row.querySelector('.nav-link.active, [role=tab][aria-selected=true]');
        if (!tab || !tab.getClientRects().length) continue;
        if (filled(tab)) continue;
        const t = tab.getBoundingClientRect(), cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2;
        // (v46, Dashboard 09/11) the sliding pill may stand beside the row of tabs, in the panel holding both (the frame tab panel)
        const pill = [...(row.parentElement || row).querySelectorAll('.g-pill')].find(p => { const r = p.getBoundingClientRect(); return filled(p) && r.left <= cx && cx <= r.right && r.top <= cy && cy <= r.bottom; });
        if (!pill) return 'a chosen tab stands as bare words, no pill under it: ' + tab.textContent.trim().slice(0, 30);
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
    rule: 'a page card whose filter button is on offers labelled filters: a plain pick list holds 10 values at most; a field of many values (the stores of a report, its dishes, its staff) is a slicer with its find box (data-searchable, v31, user 06/11: cross-filtering needs those fields on the one filter of the page) - the main records of the page are still found with the search box; an ordered time axis (months, quarters - data-filter-kind="period") keeps all its values',
    check: `(() => {
      const button = document.querySelector('.page-toolbar #filter-toggle');
      if (!button || button.disabled) return true;
      const box = document.querySelector('#filter-pop, #filter-row');
      if (!box) return button.getAttribute('aria-expanded') === 'true' ? 'the filter button is open but shows no filter set' : true;   // folded away
      const fields = [...box.querySelectorAll('.filter-field')];
      if (!fields.length) return 'the filter set is empty';
      if (fields.some(f => !f.querySelector('.filter-label')?.textContent.trim())) return 'a filter without its label';
      const period = e => Boolean(e.closest('[data-filter-kind="period"]'));
      const long = [...box.querySelectorAll('.slicer:not([data-searchable])')].find(s => !period(s) && Number(s.dataset.options) > 10)
        || [...box.querySelectorAll('select')].find(s => !period(s) && s.options.length > 11);
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
    rule: 'the top bar is one glass head of two rows: row 1 = the crumbs taking its room from the start, then the search (from a desktop up the middle third of the bar, row1-thirds; below 1200 px right beside the actions) and the actions at its end, no day and time; the greeting lives in the account menu; row 2 = the page bar (its filters and tools); the crumbs are family / app / [group] / page (a small app: <family> / its name / its page; the hub: <family> / Hub / ...), every layer before the current page a link to that layer home, only the current page plain text',
    check: `(() => {
      const head = document.querySelector('#layout-navbar');
      if (!head) return 'no top bar';
      const row1 = head.querySelector(':scope > .nav-row1'), row2 = head.querySelector(':scope > #page-bar');
      if (!row1 || !row2) return 'the top bar is not one head of two rows (row 1 and the page bar)';
      if (document.querySelector('.page-toolbar .page-crumbs')) return 'the crumbs still sit in the page bar - they start row 1';
      // (v94, the user 26/11: "chào + tên sso ở ngoài luôn") the greeting with the name stands in row 1 right before the actions;
      // a frame before 1.47.4 still greets in the account menu - either place, never at the start of row 1 nor beside the crumbs
      if ([...row1.querySelectorAll('.navbar-hello, #greeting')].some(e => !e.closest('#account-menu, .navbar-end')))
        return 'the greeting stands in row 1 anywhere but right before the actions';
      const crumbs = row1.querySelector('.page-crumbs');
      if (innerWidth >= 768) {
        if (!crumbs || !crumbs.getClientRects().length) return 'no crumbs at the start of row 1';
        const search = row1.querySelector('.navbar-search'), actions = row1.querySelector('.navbar-actions');
        const c = crumbs.getBoundingClientRect(), s = search.getBoundingClientRect(), a = actions.getBoundingClientRect();
        if (c.right > s.left + 1 || s.right > a.left + 1) return 'row 1 is not crumbs · search · actions in that order';
        if (innerWidth < 1200 && a.left - s.right > 24) return 'the search does not stand beside the actions (' + Math.round(a.left - s.right) + ' px between)';
        if (row1.querySelector('#today, .navbar-today')) return 'the day and time still stand in row 1';
      }
      const tools = row2.querySelector(':scope > .page-toolbar > .card-tools');
      if (document.querySelector('.page-card, .insights-page') && !tools) return 'the page bar (row 2) holds no page tools';
      if (document.querySelector('.insights-page')) {
        if (!tools.querySelector('input[type="search"]')) return 'the overview page bar has no app search';
        if (!row2.querySelector('#insight-range, #insight-days')) return 'the overview page bar has no period filter';
      }
      if (!crumbs) return true;
      // family / app / [group] / page: a small app is <family> / its name / its page, the hub <family> / Hub / ...
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
  {
    id: 'group-in-crumbs',
    rule: 'a group of the menu (a department, an area) is a layer of the crumbs - family / app / [group...] / page, one layer per group - never a heading inside a page card; a page that belongs to a group shows the group in its crumbs',
    check: `(() => {
      const norm = s => (s || '').normalize('NFC').replace(/\\s+/g, ' ').trim().toLowerCase();
      const name = a => norm(a.getAttribute('title') || a.textContent);
      // A group is a folding entry (a.menu-toggle) or a header of the flat menu (.menu-header) with pages under it.
      const groups = [...document.querySelectorAll('#layout-menu a.menu-toggle'), ...document.querySelectorAll('#layout-menu .menu-header')].map(name).filter(Boolean);
      for (const h of document.querySelectorAll('#page h1, #page h2, #page h3, #page h4, #page h5, #page h6')) {
        const card = h.closest('.card');
        if (card && !card.classList.contains('page-card')) continue;   // the title of an inner card is that card's own name
        if (h.getClientRects().length && groups.includes(norm(h.textContent))) return 'a menu group stands as a heading in the page: ' + h.textContent.trim();
      }
      const active = document.querySelector('#layout-menu .menu-item.active');
      if (!active) return true;
      let group = active.closest('.menu-sub')?.closest('.menu-item')?.querySelector(':scope > a.menu-toggle') || null;
      if (!group) for (let e = active.previousElementSibling; e; e = e.previousElementSibling) if (e.classList.contains('menu-header')) { group = e; break; }
      if (!group) return true;
      const crumbs = [...document.querySelectorAll('#layout-navbar .breadcrumb-item')].map(i => norm(i.textContent));
      return crumbs.includes(name(group)) ? true : 'the crumbs lack the page group: ' + (group.getAttribute('title') || group.textContent).trim();
    })()`,
  },
  {
    id: 'crumbs-whole',
    rule: 'the crumbs read whole where it matters: the family, the app and the page on screen are never cut to "..."; when row 1 is short only the layers between them shrink (and show their whole name on hover)',
    check: `(() => {
      const items = [...document.querySelectorAll('#layout-navbar .breadcrumb-item')].filter(i => i.getClientRects().length);
      if (items.length < 2) return true;
      // Cut = its own text overflows it, or it runs past the crumbs' own frame (the row clips it without an ellipsis).
      const frame = items[0].closest('.breadcrumb, .page-crumbs')?.getBoundingClientRect();
      const out = e => { const r = e.getBoundingClientRect(); return frame && (r.right > frame.right + 1 || r.left < frame.left - 1); };
      const cut = e => out(e) || [e, ...e.querySelectorAll('*')].some(x => x.scrollWidth > x.clientWidth + 1 && /ellipsis|clip|hidden/.test(getComputedStyle(x).textOverflow + ' ' + getComputedStyle(x).overflow));
      const hit = [items[0], items[1], items.at(-1)].find(cut);
      return hit ? 'a crumb that must read whole is cut: ' + hit.textContent.trim() : true;
    })()`,
  },
  {
    id: 'card-inset',
    rule: 'what a page card holds keeps the kit inset from the card edges: the first inner card (a panel, a figure card, a tile) starts at least 1rem inside the page card body - below its top edge and within its sides - never flush against the card (a plain table may run edge to edge, as the kit has it)',
    check: `(() => {
      const body = document.querySelector('.page-card > .page-card-body');
      if (!body || !body.getClientRects().length || body.scrollTop > 0) return true;
      const first = [...body.querySelectorAll('.card')].find(e => e.getClientRects().length && !e.classList.contains('page-card'));
      if (!first) return true;
      const b = body.getBoundingClientRect(), r = first.getBoundingClientRect();
      const need = parseFloat(getComputedStyle(document.documentElement).fontSize) - 1;
      const gaps = {top: r.top - b.top, left: r.left - b.left, right: b.right - r.right};
      for (const [side, gap] of Object.entries(gaps)) if (gap < need) return 'the page content sits ' + Math.round(gap) + ' px from the card ' + side + ' edge (want 1rem at least)';
      return true;
    })()`,
  },
  {
    id: 'tabs-in-menu',
    rule: 'the pages of an app are found in the menu, never as tabs on the page bar: the page bar holds no link to a page the menu lists (its left group is the page tools - its main action, a switch, the cross-filter chips)',
    check: `(() => {
      const path = a => { try { let p = new URL(a.getAttribute('href'), location.href).pathname; while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1); return p; } catch { return ''; } };
      const menu = new Set([...document.querySelectorAll('#layout-menu a[href]')].map(path).filter(p => p && p !== '/'));
      // (v56) the frame's own tab cluster may stand in row 2 (tabs-cluster); an app's own tab there may not
      const tab = [...document.querySelectorAll('#page-bar a[href]')].find(a => a.getClientRects().length && !a.closest('#page-tabs') && menu.has(path(a)));
      return tab ? 'a page of the menu stands as a tab on the page bar: ' + tab.textContent.trim() : true;
    })()`,
  },
  {
    id: 'no-code-prefix',
    rule: 'a name a person reads carries no record code before it: the menu, the crumbs and the card titles say "Internal Control Report", never "IC_02 Internal Control Report" - the code is an identifier, the menu already places the thing',
    check: `(() => {
      const code = /^[A-Z]{2,6}_\\d{1,3}\\b/;
      const names = [...document.querySelectorAll('#layout-menu .menu-link, #layout-navbar .breadcrumb-item, #page h1, #page h2, #page h3, #page h4, #page h5, #page h6')];
      const hit = names.find(e => e.getClientRects().length && code.test((e.textContent || '').trim()));
      return hit ? 'a name carries its code: ' + hit.textContent.trim().slice(0, 60) : true;
    })()`,
  },
  {
    id: 'head-whole',
    rule: 'the glass head holds both its rows whole: row 1 and the page bar (row 2) end inside the head - it grows with them, never a fixed height they spill out of - nothing of it runs past its left or right edge, and the page starts below the head, nothing of it under the bar',
    check: `(() => {
      const head = document.querySelector('#layout-navbar');
      if (!head || !head.getClientRects().length) return true;
      const h = head.getBoundingClientRect();
      const name = e => e.id ? '#' + e.id : '.' + [...e.classList].join('.');
      for (const row of head.querySelectorAll(':scope > .nav-row1, :scope > #page-bar, :scope > #page-bar > *')) {
        if (!row.getClientRects().length) continue;
        const r = row.getBoundingClientRect();
        if (r.height && (r.bottom > h.bottom + 1 || r.top < h.top - 1)) return name(row) + ' spills out of the head by ' + Math.round(Math.max(r.bottom - h.bottom, h.top - r.top)) + ' px';
      }
      // (v29) and sideways: nothing of the head runs past its left or right edge (an app at 390 px: the filter button stood out)
      for (const e of head.querySelectorAll('*')) {
        const c = getComputedStyle(e); if (!e.getClientRects().length || c.visibility !== 'visible' || c.display === 'none') continue;
        const r = e.getBoundingClientRect(); if (r.width && (r.left < h.left - 1 || r.right > h.right + 1)) return name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' runs past the head ' + Math.round(h.left) + '..' + Math.round(h.right);
      }
      const page = document.querySelector('.content-wrapper .page-card, .content-wrapper .card');
      if (innerWidth >= 768 && page && page.getClientRects().length) {
        const p = page.getBoundingClientRect(), wrap = page.closest('.content-wrapper');
        if (!wrap || wrap.scrollTop < 1) { if (p.top < h.bottom - 1) return 'the page starts under the head (' + Math.round(h.bottom - p.top) + ' px behind it)'; }
      }
      return true;
    })()`,
  },
  {
    id: 'avatar-square',
    rule: 'a kit avatar keeps its square in any row (page, top bar, menu, dropdown): flex-shrink-0 beside text that may be long; the text block shrinks and ends in "..."',
    check: `(() => {
      for (const a of document.querySelectorAll('.avatar')) {
        if (!a.getClientRects().length || getComputedStyle(a).visibility === 'hidden') continue;
        // Layout sizes, not the drawn box: an effect that scales a card (rise-in, tilt) or a page zoomed to fit draws a smaller
        // square; what breaks the kit is a square lost - a flex row narrowing the avatar under a long name.
        const w = a.offsetWidth, h = a.offsetHeight;
        if (!w || !h) continue;
        if (Math.abs(w - h) > 1) return 'an avatar is squeezed: ' + w + 'x' + h + ' (a square of ' + h + ')';
      }
      return true;
    })()`,
  },
  // (v29, user 06/11) raised from an app of the family, each proven red / green there and in the system manager's checks
  {
    id: 'accordion-flat',
    rule: 'page card accordion rows are transparent, square, contiguous and separated',
    check: `(() => {
      for (const a of document.querySelectorAll('.page-card .accordion')) {
        const items = [...a.querySelectorAll(':scope > .accordion-item')];
        for (const [i, item] of items.entries()) {
          const c = getComputedStyle(item);
          const bg = c.backgroundColor.match(/rgba?\\(([^)]+)\\)/), parts = bg && bg[1].split(/[ ,/]+/).filter(Boolean);
          if (c.backgroundColor !== 'transparent' && (!parts || parts.length < 4 || parseFloat(parts[3]) !== 0)) return 'row background: ' + c.backgroundColor;
          if ([c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomLeftRadius, c.borderBottomRightRadius].some(v => parseFloat(v))) return 'row rounded';
          if ([c.marginTop, c.marginRight, c.marginBottom, c.marginLeft].some(v => parseFloat(v))) return 'row margin';
          if (i < items.length - 1 && (!parseFloat(c.borderBottomWidth) || c.borderBottomStyle === 'none')) return 'row lacks separator';
        }
      }
      return true;
    })()`,
  },
  {
    id: 'chevron-visible',
    rule: 'visible accordion chevrons contrast with the card background by at least 3:1',
    check: `(() => {
      const parse = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return p.length >= 3 && p.every(Number.isFinite) ? [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] : null; };
      const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
      for (const button of document.querySelectorAll('.accordion-button')) {
        const c = getComputedStyle(button); if (!button.getClientRects().length || c.visibility !== 'visible') continue;
        const pseudo = getComputedStyle(button, '::after'); let arrow = parse(pseudo.backgroundColor);
        if (!arrow || !arrow[3]) {
          let image = pseudo.backgroundImage; try { image = decodeURIComponent(image); } catch {}
          const fill = image.match(/fill=["']([^"']+)["']/i);
          if (fill) { const hex = fill[1].match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (hex) { const h = hex[1].length === 3 ? [...hex[1]].map(x => x + x).join('') : hex[1]; arrow = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); } else arrow = parse(fill[1]); }
        }
        let bg = null;
        for (let e = button.closest('.page-card') || button.parentElement; e; e = e.parentElement) { const v = parse(getComputedStyle(e).backgroundColor); if (v && v[3] >= .99) { bg = v; break; } }
        if (!bg) { const probe = document.createElement('span'); probe.style.color = 'var(--g-bg)'; button.appendChild(probe); bg = parse(getComputedStyle(probe).color); probe.remove(); }
        const text = parse(c.color);
        if (!arrow || !arrow[3]) return 'cannot measure chevron color';
        if (bg && contrast(arrow, bg) < 3) return 'chevron contrast ' + contrast(arrow, bg).toFixed(2) + ':1';
        if (!bg && (!text || Math.abs(lum(arrow) - lum(text)) > .1)) return 'chevron differs from text brightness';
      }
      return true;
    })()`,
  },
  {
    id: 'menu-fits',
    rule: 'every name in the menu stays inside the menu: a group label, a section header or a page name never runs past the menu edge over the page - a long name ends in "..." (and shows whole on hover), and a name is the name alone, no description joined to it',
    check: `(() => {
      const menu = document.querySelector('#layout-menu');
      if (!menu || !menu.getClientRects().length) return true;
      const m = menu.getBoundingClientRect();
      for (const e of menu.querySelectorAll('.menu-link, .menu-header, .menu-header-text, .menu-link > div')) {
        // a name is text: the kit's round collapse button sits on the menu edge on purpose (app-sneat) and holds none
        if (!e.getClientRects().length || !e.textContent.trim() || e.closest('.layout-menu-toggle, #collapse-btn')) continue;
        const r = e.getBoundingClientRect();
        const spills = r.right > m.right + 1 || (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis' && getComputedStyle(e).overflow === 'visible');
        if (spills) return 'a menu name runs past the menu: ' + e.textContent.trim().slice(0, 60);
      }
      return true;
    })()`,
  },
  {
    id: 'menu-icons-distinct',
    rule: 'each page of the menu wears its own icon, chosen for what the page shows: no two pages of one group share an icon, and the group does not reuse one icon for all its pages',
    check: `(() => {
      const icon = a => { const i = a.querySelector('i, svg'); return i ? [...i.classList].filter(c => /^bx[sl]?-/.test(c) && !/^bx-(xs|sm|md|lg)$/.test(c)).sort().join(' ') || i.outerHTML.slice(0, 80) : ''; };
      const groups = [...document.querySelectorAll('#layout-menu .menu-sub')];
      for (const g of groups) {
        const links = [...g.querySelectorAll(':scope > .menu-item > .menu-link')];
        const seen = new Map();
        for (const a of links) {
          const k = icon(a);
          if (!k) continue;
          if (seen.has(k)) return 'two pages of one menu group share the icon ' + k + ': ' + seen.get(k) + ' / ' + a.textContent.trim();
          seen.set(k, a.textContent.trim());
        }
      }
      return true;
    })()`,
  },
  {
    id: 'table-resize-every',
    rule: 'every data table of a page - a list, a report table, a matrix, a detail table - lets each column be resized: a table with a header row and at least one row of data carries the resize handles, whatever it is called (a help dialog of keys is exempt)',
    check: `(() => {
      if (innerWidth <= 768) return true;
      for (const t of document.querySelectorAll('#page table')) {
        if (!t.getClientRects().length || t.closest('dialog, .modal') || !t.querySelector('thead th') || !t.querySelector('tbody tr td')) continue;
        const heads = [...t.querySelectorAll('thead tr:first-child > th')];
        const bad = heads.find(h => !h.querySelector('.column-resize-handle'));
        if (bad) return 'a data table column has no resize handle: ' + (bad.textContent.trim() || '(empty)') + (t.dataset.resizeId ? '' : ' - the table is not given to the shell (no data-resize-id)');
      }
      return true;
    })()`,
  },
  {
    id: 'table-sort',
    rule: 'every header of a data table sorts its rows, as the former SasinFlow tables: a press sorts by that column ascending, a second press descending, the header shows the order (aria-sort ascending | descending, none until pressed) and its arrow; numbers sort as numbers, dates as dates, Vietnamese text by its collation',
    check: `(() => {
      if (innerWidth <= 768) return true;
      for (const t of document.querySelectorAll('#page table')) {
        // a table the page declares unsortable (data-sort="off", the frame's contract) is left out, as a header so marked
        if (!t.getClientRects().length || t.closest('dialog, .modal') || t.dataset.sort === 'off' || t.querySelectorAll('tbody tr').length < 2) continue;
        const bad = [...t.querySelectorAll('thead tr:first-child > th')].find(h => h.textContent.trim() && h.dataset.sort !== 'off' && !h.hasAttribute('aria-sort'));
        if (bad) return 'a table header does not sort: ' + bad.textContent.trim();
      }
      return true;
    })()`,
  },
  {
    id: 'menu-scroll',
    rule: 'the menu scrolls inside itself when its items are taller than the window: the list scrolls with the Glass scrollbar, the brand and the collapse button stay; no item is cut off out of reach',
    check: `(() => {
      const menu = document.querySelector('#layout-menu');
      if (!menu || !menu.getClientRects().length) return true;
      const inner = menu.querySelector('.menu-inner') || menu;
      const items = [...inner.querySelectorAll('.menu-item')].filter(i => i.getClientRects().length);
      const last = items.at(-1);
      if (!last) return true;
      const m = menu.getBoundingClientRect(), r = last.getBoundingClientRect();
      if (r.bottom <= Math.min(m.bottom, innerHeight) + 1) return true;
      const box = [inner, ...inner.querySelectorAll('*')].find(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1);
      return box ? true : 'the menu is taller than the window and does not scroll: ' + last.textContent.trim().slice(0, 40) + ' is out of reach';
    })()`,
  },
  {
    id: 'menu-fold',
    rule: 'every menu item with sub-items folds and unfolds by its chevron (a toggle with aria-expanded), the branch of the page on screen open, the others folded - as the Sneat kit menu',
    check: `(() => {
      const menu = document.querySelector('#layout-menu');
      if (!menu || !menu.getClientRects().length) return true;
      for (const item of menu.querySelectorAll('.menu-item')) {
        const sub = item.querySelector(':scope > .menu-sub');
        if (!sub) continue;
        const toggle = item.querySelector(':scope > .menu-link');
        const name = (toggle?.textContent || '').trim().slice(0, 40);
        if (!toggle || !toggle.classList.contains('menu-toggle') || !toggle.hasAttribute('aria-expanded')) return 'a menu item with sub-items does not fold: ' + name;
        const holds = Boolean(item.querySelector('.menu-item.active'));
        if (holds && toggle.getAttribute('aria-expanded') !== 'true') return 'the branch of the page on screen is folded: ' + name;
      }
      return true;
    })()`,
  },
  // (v30, user 06/11: "hiệu ứng kính không được áp dụng với dialog box" - app-base F18, now with its machine check)
  {
    id: 'surface-opaque',
    rule: 'a dialog, a menu and a popover are opaque in every theme, glass on or off: the page behind never reads through them (their shadow, radius and opening stay)',
    check: `(() => {
      const alpha = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
      const shown = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && parseFloat(getComputedStyle(e).opacity) > 0.5;
      const surfaces = [...document.querySelectorAll('dialog[open] .modal-content, .modal.show .modal-content, .dropdown-menu.show, .popover.show, .slicer-menu, .date-menu, .filter-pop:not([hidden])')].filter(shown);
      for (const s of surfaces) {
        const a = alpha(getComputedStyle(s).backgroundColor);
        if (a < 0.98) return 'a ' + (s.closest('dialog, .modal') ? 'dialog' : 'menu or popover') + ' lets the page read through it (background alpha ' + a.toFixed(2) + '): ' + (s.id || s.className).toString().slice(0, 50);
      }
      return true;
    })()`,
  },
  // (v30, user 06/11: "mọi chỗ thông báo phải có template nằm ngay ngắn và theo chuẩn thiết kế"; "loading không được để chữ,
  // nó phải là spinner lớn ở giữa")
  {
    id: 'state-template',
    rule: 'an empty place and a wait wear the one template: centred where they stand - an empty place a round icon, a title and a hint, a wait the kit\'s large spinner (its words for screen readers only); never a lone line of text such as "no matching rows" or "loading"',
    check: `(() => {
      const shown = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const roots = [...document.querySelectorAll('#page, dialog[open]')];
      for (const box of roots.flatMap(r => [...r.querySelectorAll('[data-empty], .empty-state, [data-loading]')]).filter(shown)) {
        const c = getComputedStyle(box), r = box.getBoundingClientRect(), p = (box.parentElement || box).getBoundingClientRect();
        if (Math.abs((r.left + r.right) / 2 - (p.left + p.right) / 2) > p.width * .1 || c.textAlign !== 'center') return 'a state not centred where it stands: ' + (box.textContent || '').trim().slice(0, 40);
        if (box.matches('[data-loading]')) {
          const s = box.querySelector('.spinner-border, .spinner-grow');
          if (!s || s.getBoundingClientRect().width < 40) return 'a wait without the large spinner';
          const said = [...box.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).length || [...box.children].some(e => !e.matches('.visually-hidden, .spinner-border, .spinner-grow') && (e.textContent || '').trim());
          if (said) return 'a wait shows words: ' + box.textContent.trim().slice(0, 40);
        } else {
          // the icon's round mark (its glyph is the rule kit-icons' to check)
          const i = box.querySelector('.state-icon, .avatar, i, svg, img');
          if (!i || i.getBoundingClientRect().width < 24) return 'an empty place without its icon: ' + (box.textContent || '').trim().slice(0, 40);
        }
      }
      const lone = /^(không có|chưa có|không tìm thấy|đang tải|no (data|match|matching|rows|results|records)|nothing (yet|to show|found)|loading)(?=\\s|$|[.,:;!…])/i;
      const skip = '[data-empty], .empty-state, [data-loading], .dropdown-menu, .slicer-menu, .filter-pop, select, option, button, .btn, .visually-hidden, [role=tooltip], label, .form-text, .set-hint';
      for (const e of roots.flatMap(r => [...r.querySelectorAll('p, span, div, td, li, small, h5, h6')])) {
        if (e.children.length || !shown(e) || e.closest(skip)) continue;
        const text = (e.textContent || '').trim();
        if (text.length < 80 && lone.test(text)) return 'a lone line of text instead of the template: ' + text.slice(0, 50);
      }
      return true;
    })()`,
  },
  // (v31, user 06/11: "filter có sẵn rồi, tự nhiên hiện text ngày chi nữa? không hiện mấy thông tin thừa này")
  {
    id: 'bar-no-extra-text',
    rule: 'the top bar holds its crumbs and its controls only: no loose line of dates or words beside them - a period the page holds is said by its filter, not repeated as text',
    check: `(() => {
      const bar = document.querySelector('#layout-navbar');
      if (!bar) return true;
      const loose = [...bar.querySelectorAll('span, small, p, div')].filter(e => e.children.length === 0 && e.getClientRects().length
        && getComputedStyle(e).visibility !== 'hidden' && /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/.test(e.textContent || '')
        // (v67, Audit 13/11, approved by the user) the info cluster (.page-info) is where a page says what it tells - "measured at ..."
        && !e.closest('button, .btn, .filter-field, .page-filter, .slicer, .dropdown-menu, [role=dialog], .breadcrumb, .visually-hidden, .page-info'));
      return loose.length ? 'a loose text in the top bar: ' + loose[0].textContent.trim().slice(0, 40) : true;
    })()`,
  },
  // (v69, Audit 13/11, approved by the user: Overview's "Đo lúc 13/11/2026 07:05:55" stood under the cards, outside every card,
  // and no rule caught it - bar-no-extra-text reads row 1 only)
  {
    id: 'info-in-bar',
    rule: 'words about the page (when it was measured or updated - a date or a time) stand in row 2\'s info cluster (.page-info), never loose in the page body outside every card, table and dialog',
    check: `(() => {
      const page = document.getElementById('page') || document.querySelector('.layout-page');
      if (!page) return true;
      const when = /\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\b\\d{1,2}:\\d{2}(:\\d{2})?\\b/;
      const loose = [...page.querySelectorAll('small, p, span, div')].find(e => e.children.length === 0 && e.getClientRects().length
        && when.test(e.textContent || '') && !e.closest('.card, table, dialog, [role=dialog], .page-toolbar, #page-bar, .page-info, .filter-pop, .toasts, .dropdown-menu, .visually-hidden'));
      return loose ? 'words about the page stand loose in its body, not in the info cluster: ' + loose.textContent.trim().slice(0, 40) : true;
    })()`,
  },
  // (v89, the user 25/11: "chỉnh lại cái search này vào giữa cho cân bằng" - over v51's one third at the end of row 1)
  {
    id: 'row1-thirds',
    rule: 'from a desktop up (1200 px), row 1 is three thirds of the top bar: the crumbs, the search in the middle with its centre on the centre of the bar, the actions ending at the end of the row, each apart from the next by the own gap of the page bar (the gap of its tools); the search fills the middle third, narrower only by what the crumbs need to read whole (from both ends, so it stays centred), never below 14rem; crumbs longer still push it right at 14rem',
    check: `(() => {
      const n = document.getElementById('layout-navbar'), row1 = n && n.querySelector(':scope > .nav-row1'), grid = row1 && row1.querySelector('#navbar-collapse');
      if (!row1 || !grid || !row1.getClientRects().length || innerWidth < 1200) return true;
      const s = row1.querySelector('.navbar-search'), a = row1.querySelector('.navbar-actions'), c = row1.querySelector('.navbar-crumbs');
      if (!s || !a || !s.getClientRects().length || !a.getClientRects().length) return 'row 1 has no search or no actions';
      const p = n.getBoundingClientRect(), r = s.getBoundingClientRect(), third = p.width / 3;
      // the crumbs read whole first, then the search keeps the centre, then it fills the third
      const trail = row1.querySelector('.navbar-crumbs .breadcrumb');
      let need = 0;
      if (trail && trail.getClientRects().length) { const was = trail.style.width; trail.style.width = 'max-content'; need = trail.getBoundingClientRect().width; trail.style.width = was; }
      const probe = document.createElement('div');
      probe.style.cssText = 'position: absolute; visibility: hidden; width: 14rem';
      grid.append(probe);
      const least = probe.getBoundingClientRect().width;
      probe.remove();
      const col = c && c.getClientRects().length ? c.getBoundingClientRect().width : 0, spare = col > need + 2, atLeast = r.width <= least + 2;
      const off = (r.left + r.right) / 2 - (p.left + p.right) / 2;
      if (r.width > third + 2) return 'the search is ' + Math.round(r.width) + ' px wide, more than the middle third of the bar (' + Math.round(third) + ')';
      if (col < need - 2 && !atLeast) return 'the crumbs are cut (' + Math.round(col) + ' px for ' + Math.round(need) + ') while the search could still give way (' + Math.round(r.width) + ' px, its least ' + Math.round(least) + ')';
      // (v95) crumbs push the search only when it stands right after them: squeezed elsewhere (by the greeting at the end of row 1,
      // or moved out of the middle cell) it is off the centre for no reason
      const pushed = Boolean(c && c.getClientRects().length) && r.left - c.getBoundingClientRect().right <= 40;
      if (Math.abs(off) > 2 && (spare || !atLeast || !pushed)) return 'the search stands ' + Math.round(off) + ' px off the centre of the bar (only crumbs that need the room may push it, at its least width)';
      if (r.width < third - 2 && spare) return 'the search is ' + Math.round(r.width) + ' px, narrower than the middle third (' + Math.round(third) + ') while the crumbs have room to spare (' + Math.round(col) + ' px for ' + Math.round(need) + ')';
      const ar = a.getBoundingClientRect(), stop = grid.getBoundingClientRect().right;
      if (Math.abs(ar.right - stop) > 2) return 'the actions end ' + Math.round(stop - ar.right) + ' px before the end of row 1';
      const tools = document.querySelector('.page-toolbar .card-tools');
      const gap = tools ? parseFloat(getComputedStyle(tools).columnGap) || 8 : 8;
      const parts = [...a.querySelectorAll(':scope > .nav-item')].filter(e => e.getClientRects().length);
      for (let i = 1; i < parts.length; i++) {
        const g = parts[i].getBoundingClientRect().left - parts[i - 1].getBoundingClientRect().right;
        if (Math.abs(g - gap) > 1) return 'row 1: ' + Math.round(g) + ' px before ' + (parts[i].querySelector('[id]')?.id || 'a part') + ' (the page bar gap: ' + gap + ' px)';
      }
      return true;
    })()`,
  },
  // (v53, the user 09/11: "mọi điểm dừng ở path đều cần có 1 trang danh sách chứa toàn bộ các chi tiết của trang sau")
  {
    id: 'nav-stops',
    rule: 'every stop of the path is a page: a menu row with sub-rows opens its list page (an href, never "#"), and a list page holds every page and branch its row holds',
    check: `(() => {
      const menu = document.getElementById('layout-menu');
      if (!menu) return true;
      const bare = [...menu.querySelectorAll('a.menu-toggle')].find(a => { const h = a.getAttribute('href') || ''; return !h || h === '#'; });
      if (bare) return 'a menu row with sub-rows opens no page (href ' + (bare.getAttribute('href') || 'none') + '): ' + (bare.textContent || '').trim().slice(0, 30);
      const index = document.querySelector('#page [data-nav-index]');
      if (!index) return true;
      const here = [...menu.querySelectorAll('a.menu-toggle')].find(a => a.getAttribute('href') === location.pathname);
      if (!here) return 'a list page that no menu row opens: ' + location.pathname;
      const links = new Set([...index.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
      const kids = [...here.parentElement.querySelectorAll(':scope > .menu-sub > .menu-item > a')].map(a => a.getAttribute('href'));
      const lost = kids.filter(h => !links.has(h));
      return lost.length ? 'the list page leaves out ' + lost.length + ' of what its row holds: ' + lost.slice(0, 3).join(', ') : true;
    })()`,
  },
  // (v52, the user 09/11 through an app of the family: "khung panel này đang bị thiếu viền cong ở dưới")
  {
    id: 'tabs-round',
    rule: 'the tab strip over a board ends the top bar\'s block with rounded lower corners; over a page card its lower corners join the card (v56: its upper corners are the bar\'s join, tabs-dock)',
    check: `(() => {
      const t = document.getElementById('page-tabs');
      if (!t || !t.getClientRects().length || t.closest('#layout-navbar')) return true;
      const page = t.nextElementSibling, card = page && page.firstElementChild && page.firstElementChild.matches('.page-card');
      const c = getComputedStyle(t), r = [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].map(parseFloat);
      return card || (r[2] >= 4 && r[3] >= 4) || 'the tab strip over a board has square lower corners (' + r.join(' / ') + ')';
    })()`,
  },
  // (v52, the user 09/11 through an app of the family: a fixed period counted as a filter)
  {
    id: 'filter-count-fixed',
    rule: 'the filter button counts only what the person set: a period or business day the page always holds (data-fixed) is never counted nor lit as set, and the count never exceeds the set filters',
    check: `(() => {
      const lit = document.querySelector('.filter-field[data-fixed].on');
      if (lit) return 'a fixed period is lit as a set filter: ' + (lit.querySelector('.filter-label')?.textContent || lit.id || '').trim().slice(0, 30);
      const btn = document.querySelector('.page-toolbar #filter-toggle');
      if (!btn || !document.querySelector('#filter-pop, #filter-row')) return true;
      const n = Number((btn.querySelector('.filter-count')?.textContent || '0').trim()) || 0;
      const set = new Set([...document.querySelectorAll('.filter-place')].filter(p => p.querySelector(':scope .filter-field.on:not([data-fixed])')).map(p => p.dataset.filterId));
      return n <= set.size || 'the filter button counts ' + n + ' with ' + set.size + ' filter(s) set (a fixed period counted?)';
    })()`,
  },
  // (v51, the user 09/11 through an app of the family: "1 dòng = 1 thông tin ko dc xuống dòng", "size chuẩn ko dc nhỏ")
  {
    id: 'tip-lines',
    rule: 'the frame tip (data-tip) shows each of its lines as ONE line - never wrapped, the box as wide as its longest line - at the size of the page words, never smaller',
    check: `(() => {
      const tip = document.getElementById('g-tip');
      if (!tip || getComputedStyle(tip).display === 'none') return true;
      const was = tip.textContent;
      tip.textContent = 'Doanh thu kỳ này 244.008.536.989 so với kỳ trước 231.774.002.115\\nSố bill 18';
      const range = document.createRange(); range.selectNodeContents(tip);
      const lines = new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size;
      const size = parseFloat(getComputedStyle(tip).fontSize), page = parseFloat(getComputedStyle(document.body).fontSize);
      tip.textContent = was;
      if (size < Math.min(13, page * .9)) return 'a tip is ' + size + ' px, smaller than the words of the page (' + page + ' px)';
      return lines === 2 || 'a tip of two lines drew ' + lines + ' lines (one line of the tip is one line, never wrapped)';
    })()`,
  },
  // (v51, the user 09/11: "filter nên có nút current month để mọi dashboard tự lấy tháng gần nhất")
  {
    id: 'date-relative',
    rule: 'a date range drawn with its two dates offers the relative periods as Power BI: This month, Last month, This year (three quick picks beside the dates)',
    check: `(() => {
      const ranges = [...document.querySelectorAll('.filter-field.date-range')].filter(r => r.getClientRects().length && r.querySelectorAll('.date-field').length === 2);
      const bare = ranges.find(r => r.querySelectorAll('.date-quick > button').length < 3);
      return bare ? 'a date range with no relative periods (this month, last month, this year): ' + (bare.querySelector('.filter-label')?.textContent || bare.id).trim().slice(0, 30) : true;
    })()`,
  },
  // (v50, a board lost its strip under the bar; v56, the gap over the strip and the gap under it were not the same - the strip
  // is always the bar's third row)
  {
    id: 'tabs-dock',
    rule: 'the tab strip of the sibling pages is the top bar\'s third row: docked on the bar with no gap whether row 1 shows or folds (one block, the bar\'s lower corners and the strip\'s upper ones square), and on screen with nothing over it',
    check: `(() => {
      const t = document.getElementById('page-tabs'), n = document.getElementById('layout-navbar');
      if (!t || !n || !t.getClientRects().length || innerWidth < 768 || n.contains(t)) return true;
      const a = t.getBoundingClientRect(), b = n.getBoundingClientRect(), g = a.top - b.bottom;
      const hit = document.elementFromPoint(a.left + Math.min(40, a.width / 2), a.top + a.height / 2);
      if (!hit || !t.contains(hit)) return 'the tab strip is covered by ' + (hit ? (hit.id || String(hit.className).slice(0, 40) || hit.tagName) : 'nothing');
      if (Math.abs(g) > 1) return 'the strip stands ' + Math.round(g) + ' px under the top bar (docked: 0)';
      const nc = getComputedStyle(n), tc = getComputedStyle(t);
      const r = [nc.borderBottomLeftRadius, nc.borderBottomRightRadius, tc.borderTopLeftRadius, tc.borderTopRightRadius].map(parseFloat);
      return r.every(x => x < 1) || 'docked, the joined corners are not square (bar lower / strip upper: ' + r.join(' / ') + ')';
    })()`,
  },
  // (v56, the user: the long page of a group and its tabs are one setting - a long page needs no tabs)
  {
    id: 'page-view-scroll',
    rule: 'the pages of a group seen as one long page (Settings > Layout, html[data-page-view="scroll"]) show no tab strip',
    check: `(() => {
      if (document.documentElement.dataset.pageView !== 'scroll') return true;
      const t = document.getElementById('page-tabs');
      return !(t && t.getClientRects().length) || 'the long page of the group still shows the tab strip';
    })()`,
  },
  // (v56, the user: a report of few pages lost a whole row to its strip; the tabs one cluster with a grip to drag it)
  {
    id: 'tabs-cluster',
    rule: 'the tabs of the sibling pages are one cluster led by a grip: in row 2 it is one framed group at the bar\'s one height, (v64) first of the row by default - tabs, page buttons, page info, seek group, until the person drags them - touching no other cluster, every tab on the row when it stands there on its own (automatic); left automatic, it never stands as row 3 when row 2 has room for it',
    check: `(() => {
      const t = document.getElementById('page-tabs');
      if (!t || !t.getClientRects().length || innerWidth < 768) return true;
      if (!t.querySelector('.page-tabs-grip')) return 'the tab cluster has no grip to drag it';
      const bar = document.querySelector('#page-bar .page-toolbar');
      const list = t.querySelector('.page-tabs-list');
      if (!bar || !list) return true;
      if (bar.contains(t)) {
        const h = parseFloat(getComputedStyle(bar).getPropertyValue('--tool-h')) || 38, r = t.getBoundingClientRect();
        if (Math.abs(r.height - h) > 1) return 'the tab cluster in row 2 is ' + Math.round(r.height) + ' px tall, the bar is ' + Math.round(h);
        for (const id of ['card-start', 'card-tools']) {
          const o = document.getElementById(id), q = o && o.getClientRects().length && o.getBoundingClientRect();
          if (q && q.width > 0 && r.left < q.right - 1 && r.right > q.left + 1) return 'the tab cluster in row 2 runs into #' + id;
        }
        // (v67, Dashboard 13/11, approved by the user) a short cluster shows the tab on screen and "more (n)" by design
        if (t.dataset.place === 'auto' && t.dataset.style !== 'short' && t.querySelector('#page-tabs-more')) return 'standing in row 2 on its own, the tab cluster hides tabs under more';
        return true;
      }
      if (t.dataset.place !== 'auto') return true;
      const bs = getComputedStyle(bar), gap = parseFloat(bs.columnGap) || 0;
      // the seek group grows to fill the row: what it holds is its width, not its box
      // (v59) every box that grows (the pinned filters' row too) is measured by what it holds
      const natural = c => { const s = getComputedStyle(c); if (c.id !== 'card-tools' && !(parseFloat(s.flexGrow) > 0)) return c.offsetWidth;
        const k = [...c.children].filter(x => x.getClientRects().length), g = parseFloat(s.columnGap) || 0;
        return k.reduce((a, x) => a + natural(x), 0) + Math.max(0, k.length - 1) * g + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight); };
      // (v70, Reconcile 13/11: /warehouse read 770 px free where 187 were - #card-start is drawn as its children, display:
      // contents, 0 px wide, and its 585 px of clusters went uncounted) the row's clusters are counted through a box drawn as its
      // children, and the spacer between the two ends is room, not a cluster - as the frame weighs them (layouts/PageTabs room())
      const flat = c => getComputedStyle(c).display === 'contents' ? [...c.children].flatMap(flat) : [c];
      const others = [...bar.children].flatMap(flat).filter(c => c.id !== 'page-tabs-slot' && !c.classList.contains('bar-spacer') && c.getClientRects().length);
      const used = others.reduce((a, c) => a + natural(c), 0) + Math.max(0, others.length - 1) * gap;
      const free = bar.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight) - used - gap;
      if (t.querySelector('#page-tabs-more')) return true;
      const items = [...list.children], tg = parseFloat(getComputedStyle(list).columnGap) || 0;
      const need = t.offsetWidth - list.clientWidth + items.reduce((a, li) => a + li.offsetWidth, 0) + tg * Math.max(0, items.length - 1);
      return need + 48 > free || 'automatic, the tab cluster (' + Math.round(need) + ' px) stands as row 3 while row 2 has ' + Math.round(free) + ' px free';
    })()`,
  },
  // (v58, the user 11/11: "khu vực nút riêng, khu vực thông tin riêng, và khu vực tab… riêng, để ko dính chùm", for every app)
  {
    id: 'bar-zones',
    rule: 'row 2 stands in zones - the page\'s buttons, its info (words and figures in .page-info) and the tab cluster; (v62, plan 06 §7: managed in clusters) the buttons stand side by side in ONE framed cluster led by its grip, the info in one framed cluster led by its grip with an edge that shortens it, the tab cluster framed with only the row\'s gap before it; (v63) every cluster at one height, the info framed like the buttons and the tabs, and two clusters side by side parted by the row\'s own padding at its ends; no words of the page stand loose among its buttons',
    check: `(() => {
      // (v65, the user 12/11: every new feature on the phone too) read on a phone as on a desktop
      const start = document.querySelector('#page-bar #card-start');
      if (!start) return true;
      const shown = e => e.getClientRects().length > 0;
      const walk = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const p = n.parentElement, words = n.textContent.trim();
        if (!words || !p || !shown(p)) continue;
        if (p.closest('.page-info, button, a, label, select, .dropdown-menu, [hidden], .visually-hidden, [class*="chip"], [role="button"]')) continue;
        return 'words beside the page buttons stand in no info zone (.page-info): ' + words.slice(0, 40);
      }
      const clusters = [...start.querySelectorAll('.bar-cluster[data-cluster]')].filter(shown);
      if (clusters.length) {
        // (v62) the frame's clusters: the buttons in one, the info in one, each framed and led by its grip; the info shortens
        const buttons = [...start.querySelectorAll('button, a.btn')].filter(b => shown(b) && !b.closest('.dropdown-menu, .modal, .slicer-menu, .page-info'));
        const homes = new Set(buttons.map(b => b.closest('.bar-cluster[data-cluster="tools"]')));
        if (homes.has(null)) return 'a page button stands outside the buttons cluster: ' + (buttons.find(b => !b.closest('.bar-cluster[data-cluster="tools"]')).textContent || '').trim().slice(0, 30);
        if (homes.size > 1) return 'the page buttons stand in ' + homes.size + ' clusters - one cluster, side by side';
        if (start.querySelectorAll('.bar-cluster[data-cluster="info"]').length > 1) return 'the page info stands in more than one cluster';
        for (const c of clusters) {
          const cs = getComputedStyle(c);
          if (!(parseFloat(cs.borderTopWidth) >= 1)) return 'the ' + c.dataset.cluster + ' cluster of row 2 has no frame';
          const grip = c.querySelector(':scope > .bar-grip'), edge = c.querySelector(':scope > .bar-resize');
          if (!grip || !shown(grip)) return 'the ' + c.dataset.cluster + ' cluster of row 2 has no grip to drag it';
          if (c.dataset.cluster === 'info' && (!edge || !shown(edge))) return 'the info cluster has no edge to shorten it';
        }
      } else {
        // an app that draws its own bar: (v63, the user 12/11) its info stands in a frame of its own, like the buttons and tabs
        const info = start.querySelector(':scope > .page-info');
        if (info && shown(info) && info.getBoundingClientRect().width > 0) {
          const cs = getComputedStyle(info);
          if (!['Top', 'Right', 'Bottom', 'Left'].every(s => parseFloat(cs['border' + s + 'Width']) >= 1)) return 'the info zone of row 2 stands in no frame of its own';
        }
      }
      // (v63, the user 12/11: the room between clusters equals the row's own room at its ends; the info framed like the buttons
      // and the tabs) the clusters of row 2 (the buttons, the info, the tabs) stand at one height, and two clusters side by side
      // are parted by the row's padding at its ends, within 1 px
      const t = document.getElementById('page-tabs'), slot = t && t.parentElement;
      if (t && slot && slot.id === 'page-tabs-slot' && [...start.children].some(c => c.getClientRects().length && c.getBoundingClientRect().width > 0)
        && !(parseFloat(getComputedStyle(t).borderInlineStartWidth) >= 1)) return 'the tab cluster in row 2 stands against the page zone with no frame of its own';
      // (v60, the user 11/11: "cái cục tab nên cho khít vào slot… nó bị cách tới 2 lần") the framed cluster needs no divider: only
      // the row's gap stands before it
      if (t && slot && slot.id === 'page-tabs-slot' && (parseFloat(getComputedStyle(slot).paddingInlineStart) > 1 || parseFloat(getComputedStyle(slot).borderInlineStartWidth) >= 1))
        return 'the tab cluster in row 2 stands behind a divider and room of its own besides its frame - parted twice';
      const row = document.querySelector('#page-bar > .page-toolbar');
      if (row) {
        const units =[...row.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot > .page-tabs-panel, :scope > .card-start > .page-info')]
          .filter(e => shown(e) && e.getBoundingClientRect().width > 0 && !(e.parentElement && e.parentElement.closest('.bar-cluster')))
          .map(e => ({e, r: e.getBoundingClientRect()})).sort((a, b) => a.r.left - b.r.left);
        const hs = units.map(u => u.r.height);
        if (units.length > 1 && Math.max(...hs) - Math.min(...hs) > 1) return 'the clusters of row 2 stand at different heights (' + hs.map(Math.round).join(' / ') + ' px)';
        const pad = parseFloat(getComputedStyle(row).paddingInlineStart) || 0;
        for (let i = 1; i < units.length; i++) {
          const a = units[i - 1].r, b = units[i].r;
          if (b.top >= a.bottom || a.top >= b.bottom) continue;   // on another line of the row
          const gap = b.left - a.right;
          // (v64) the seek cluster standing last keeps the row's right end: the room before it is what the row leaves, never less
          if (i === units.length - 1 && units[i].e.dataset.cluster === 'seek') { if (gap < pad - 1) return 'the seek cluster stands ' + Math.round(gap) + ' px from the cluster before it, the row keeps ' + Math.round(pad); continue; }
          // (v65, the user 12/11: two anchored ends) across the spacer between the left and the right group the room is what the
          // row leaves, never less than its padding
          const sp = row.querySelector(':scope > .bar-spacer'), spr = sp && sp.getBoundingClientRect();
          if (spr && spr.left >= a.right - 1 && spr.right <= b.left + 1) { if (gap < pad - 1) return 'the two ends of row 2 stand ' + Math.round(gap) + ' px apart, the row keeps ' + Math.round(pad); continue; }
          if (Math.abs(gap - pad) > 1) return 'two clusters of row 2 stand ' + Math.round(gap) + ' px apart, the row keeps ' + Math.round(pad) + ' px at its ends';
        }
      }
      return true;
    })()`,
  },
  // (v58, the user 11/11: "thêm tính năng user kéo đổi chỗ vị trí các tab")
  {
    id: 'tabs-reorder',
    rule: 'every tab of the cluster on a desktop can be dragged to reorder the group, the person\'s order kept',
    check: `(() => {
      const t = document.getElementById('page-tabs');
      if (!t || !t.getClientRects().length) return true;
      const fixed = [...t.querySelectorAll('.page-tabs-list > .nav-item[data-to]')].find(li => li.getAttribute('draggable') !== 'true');
      return !fixed || 'a tab cannot be dragged to reorder its group: ' + fixed.textContent.trim().slice(0, 30);
    })()`,
  },
  // (v63, the user 12/11: "thêm chức năng có thể tùy chỉnh dc tab dạng nén hay dạng dài ra… lỡ như ở trên hàng 2 đang kẹt filter
  // ghim mà bung ra nữa nếu dài sẽ đụng nhau")
  {
    id: 'tabs-style',
    rule: 'the tab cluster carries its short / long switch beside its grip (short: the tab on screen and "more (n)"; long: every tab), the person\'s choice kept per group and the same in Settings; in row 2 the cluster never runs over the seek group or its pinned filters - long only when every tab fits, else it stays short and offers row 3',
    check: `(() => {
      const t = document.getElementById('page-tabs');
      if (!t || !t.getClientRects().length) return true;
      const sw = t.querySelector('#page-tabs-style');
      if (!sw || !sw.getClientRects().length) return 'the tab cluster has no short / long switch';
      // (v64, the user 12/11: "lỗi tràn khung") every tab and "more (n)" stands inside the cluster's frame
      const fr = t.getBoundingClientRect();
      const out = [...t.querySelectorAll('.page-tabs-list > .nav-item')].find(li => li.getClientRects().length && (li.getBoundingClientRect().right > fr.right + 1 || li.getBoundingClientRect().left < fr.left - 1));
      if (out) return 'a tab runs past the frame of its cluster: ' + out.textContent.trim().slice(0, 30);
      if (t.parentElement && t.parentElement.id === 'page-tabs-slot') {
        const r = t.getBoundingClientRect();
        const hit = [...document.querySelectorAll('#card-tools button, #card-tools input, #card-tools select')]
          .filter(e => e.getClientRects().length && !e.closest('.dropdown-menu, .slicer-menu, [hidden]'))
          .find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.left < r.right - 1 && b.right > r.left + 1 && b.top < r.bottom && b.bottom > r.top; });
        if (hit) return 'the tab cluster in row 2 runs over the seek group: ' + (hit.id || hit.getAttribute('aria-label') || hit.className).slice(0, 30);
      }
      return true;
    })()`,
  },
  // (v64, the user 12/11: "khu vực filter search tính là 1 khu vực riêng thứ 4 và dời được… khu trải filter nó đang bị cấn vào chỗ tab
  // nén… chỉ lấy các filter ở đầu ra thôi… 1 khung filter nhỏ xíu cũng ko bấm vào dc")
  {
    id: 'seek-cluster',
    rule: 'the seek group (pinned filters, filter button, filter box, view switch) is the fourth cluster of row 2, framed and led by a grip like the others, anchored at the row\'s right end by default (the person drags it elsewhere, or drags one pinned filter onto another to reorder them); its pinned filters never run over another cluster, and each one on the bar keeps a width it can be pressed at (at least 6rem of the page) - the first pinned ones stand there, the ones that do not fit wait in the popover; measured in the page\'s own px, so every display size fits its own count',
    check: `(() => {
      const bar = document.querySelector('#page-bar > .page-toolbar'), tools = bar && bar.querySelector(':scope > .card-tools');
      if (!bar || !tools || !bar.getClientRects().length) return true;
      if (!tools.matches('.bar-cluster[data-cluster="seek"]') || !(parseFloat(getComputedStyle(tools).borderTopWidth) >= 1)) return 'the seek group is no framed cluster of row 2';
      // (the user 12/11: "filter… nắm kéo dc cả cụm như 3 cụm kia… mặc định nó dính vào đó… khi user kéo thì vẫn dc") led by its grip;
      // standing last (the default) it is anchored at the row's right end
      const grip = tools.querySelector(':scope > .bar-grip');
      if (!grip || !grip.getClientRects().length) return 'the seek cluster has no grip to drag it';
      const tr = tools.getBoundingClientRect(), bs = getComputedStyle(bar), right = bar.getBoundingClientRect().right - parseFloat(bs.paddingRight);
      const after = [...bar.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot > .page-tabs-panel')].find(c => c !== tools && c.getClientRects().length && c.getBoundingClientRect().left >= tr.right - 1 && c.getBoundingClientRect().top < tr.bottom && c.getBoundingClientRect().bottom > tr.top);
      // (v65) two anchored ends: no cluster may float in the middle - every cluster stands against its own end, the left group
      // packed from the left and the right group packed against the right (read by the spacer between them, when the frame
      // draws one); a seek cluster in the right group, last of it, ends the row
      const inLeft = (parseFloat(getComputedStyle(tools).order) || 0) < 500;
      if (!after && !inLeft && innerWidth >= 768 && Math.abs(tr.right - right) > 2) return 'the seek cluster, last of the row, is not anchored at its right end (' + Math.round(right - tr.right) + ' px short)';
      const sp = bar.querySelector(':scope > .bar-spacer');
      const oneLine = (() => { const tops = [...bar.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot > .page-tabs-panel')].filter(c => c.getClientRects().length).map(c => Math.round(c.getBoundingClientRect().top)); return Math.max(...tops) - Math.min(...tops) <= 2; })();
      if (sp && sp.getClientRects().length && oneLine) {
        const so = parseFloat(getComputedStyle(sp).order) || 500, gapX = parseFloat(bs.columnGap) || 0;
        const all = [...bar.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot > .page-tabs-panel')].filter(c => c.getClientRects().length && c.getBoundingClientRect().width > 0)
          .map(c => ({c, o: parseFloat(getComputedStyle(c.matches('.page-tabs-panel') ? c.parentElement : c).order) || 0, r: c.getBoundingClientRect()}));
        const lefts = all.filter(u => u.o < so).sort((x, y) => x.r.left - y.r.left), rights = all.filter(u => u.o > so).sort((x, y) => x.r.left - y.r.left);
        const pack = (list, from, dir) => { let at = from; for (const u of (dir > 0 ? list : [...list].reverse())) {
          const edge = dir > 0 ? u.r.left : u.r.right;
          if (Math.abs(edge - at) > 2) return u.c.dataset.cluster || 'tabs';
          at = dir > 0 ? u.r.right + gapX : u.r.left - gapX; } return null; };
        const leftEdge = bar.getBoundingClientRect().left + parseFloat(bs.paddingLeft), lead = bar.querySelector(':scope > .card-lead');
        const lf = pack(lefts, lead && lead.getClientRects().length ? lead.getBoundingClientRect().right + gapX : leftEdge, 1);
        if (lf) return 'a cluster of the left group floats away from the left end: ' + lf;
        const rf = pack(rights, right, -1);
        if (rf) return 'a cluster of the right group floats away from the right end: ' + rf;
      }
      // (the user 12/11: "khung filter phải theo size filter tổng chứ ko dc dài hơn") the frame is as wide as what it holds
      const ts = getComputedStyle(tools), kids = [...tools.children].filter(k => k.getClientRects().length && k.getBoundingClientRect().width > 0);
      const holds = kids.reduce((a, k) => a + k.getBoundingClientRect().width, 0) + Math.max(0, kids.length - 1) * (parseFloat(ts.columnGap) || 0)
        + parseFloat(ts.paddingLeft) + parseFloat(ts.paddingRight) + parseFloat(ts.borderLeftWidth) + parseFloat(ts.borderRightWidth);
      if (tr.width > holds + 4) return 'the seek frame is ' + Math.round(tr.width) + ' px, what it holds ' + Math.round(holds) + ' - wider than its filters';
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const places =[...tools.querySelectorAll('#filter-row > .filter-place')].filter(p => p.getClientRects().length);
      const thin = places.find(p => p.offsetWidth < 6 * rem - 1);
      if (thin) return 'a pinned filter on the bar is ' + thin.offsetWidth + ' px wide, too narrow to press (at least ' + Math.round(6 * rem) + '): ' + (thin.dataset.filterId || '');
      const row = tools.querySelector('#filter-row');
      if (row && row.scrollWidth > row.clientWidth + 1) return 'the pinned filters run past their row (' + row.scrollWidth + ' px in ' + row.clientWidth + ')';
      const others = [...bar.querySelectorAll('.bar-cluster[data-cluster], #page-tabs-slot > .page-tabs-panel')].filter(c => c !== tools && c.getClientRects().length).map(c => c.getBoundingClientRect());
      for (const p of places) {
        const r = p.getBoundingClientRect();
        if (others.some(o => r.left < o.right - 1 && r.right > o.left + 1 && r.top < o.bottom && r.bottom > o.top)) return 'a pinned filter runs over another cluster of row 2: ' + (p.dataset.filterId || '');
      }
      return true;
    })()`,
  },
  // (v63, the user 12/11: "khung chuẩn của nút riêng phải luôn có nút refresh với chú thích glossary đi kèm")
  {
    id: 'page-std-tools',
    rule: 'every page\'s buttons cluster opens with the frame\'s refresh button and its glossary button, and (v65) every page hands the words of what it shows - the glossary is never empty or turned off - an app hands its own loading (onRefresh) and its words (glossary), never a refresh or glossary button of its own beside them',
    check: `(() => {
      // (the tools box may be drawn as its children, display: contents - it has no rects of its own; the bar tells it is shown)
      const start = document.querySelector('#page-bar #card-start'), bar = start && start.closest('.page-toolbar');
      if (!start || !bar || !bar.getClientRects().length) return true;
      const shown = e => e && e.getClientRects().length > 0;
      const r = start.querySelector('.page-refresh'), g = start.querySelector('.page-glossary');
      if (!shown(r)) return 'the page buttons have no refresh button';
      if (!shown(g)) return 'the page buttons have no glossary button';
      if (r.closest('.bar-cluster') !== g.closest('.bar-cluster')) return 'refresh and glossary stand in different clusters';
      // (v65, the user 12/11: "nhiều trang đang ko có bảng mô tả ở nút mô tả, nút mô tả phải mô tả thông tin của trang") every
      // page hands the words of what it shows: a glossary turned off, or with no word, is red
      if (g.disabled || !(Number(g.dataset.count) > 0)) return 'the glossary of this page holds no words - hand the page\\'s terms (glossary) to its PageCard / PageToolbar / DomPage';
      const own = [...start.querySelectorAll('button, a.btn')].filter(b => shown(b) && b !== r && b !== g && /\\bbx-(refresh|book-open|list-ul)\\b/.test(b.innerHTML) && !b.closest('.dropdown-menu, .modal'));
      if (own.length) return 'a refresh or glossary button of the app stands beside the frame\\'s: ' + (own[0].id || own[0].getAttribute('aria-label') || '').slice(0, 30);
      return true;
    })()`,
  },
  // (v56, the user: the three quick periods did not wear the template and did not share the row)
  {
    id: 'date-quick-even',
    rule: 'the quick periods of a date range are one group of the frame\'s switch (grey glass at rest, never the outlined accent button) spanning the row of the two dates in equal parts',
    check: `(() => {
      for (const g of document.querySelectorAll('.date-quick')) {
        const bs = [...g.children].filter(b => b.matches('button') && b.getClientRects().length);
        if (bs.length < 2) continue;
        if (bs.some(b => b.matches('.btn-outline-primary'))) return 'a quick period wears the outlined accent button, not the frame\\'s switch';
        const w = bs.map(b => b.getBoundingClientRect().width);
        if (Math.max(...w) - Math.min(...w) > 2) return 'the quick periods are not equal (' + w.map(Math.round).join(' / ') + ' px)';
        const row = g.parentElement && g.parentElement.parentElement, dates = row && row.querySelector('.date-field')?.parentElement;
        const want = dates ? dates.getBoundingClientRect().width : g.parentElement.clientWidth;
        const have = g.getBoundingClientRect().width;
        if (have < want - 2) return 'the quick periods span ' + Math.round(have) + ' of the ' + Math.round(want) + ' px row of the dates';
      }
      return true;
    })()`,
  },
  // (v50, the user 09/11: "mẫu người ta là màu trắng")
  {
    id: 'menu-pill-glass',
    rule: 'the menu row of the page on screen keeps the template look: it stands on the white glass pill (no accent fill of its own), its words the text colour, its icon the accent',
    check: `(() => {
      const menu = document.getElementById('layout-menu'), pill = menu && menu.querySelector('.menu-inner > .g-pill');
      if (!pill || !pill.getClientRects().length || pill.getBoundingClientRect().height <= 4 || pill.getAnimations().length) return true;
      const m = menu.getBoundingClientRect();
      if (m.right <= 8 || m.left >= innerWidth) return true;
      const c = getComputedStyle(pill);
      if (c.backgroundImage !== 'none') return 'the menu pill wears an accent fill (' + c.backgroundImage.slice(0, 48) + ') - the template chooses on the white glass';
      const icon = menu.querySelector('.menu-item.active:not(:has(> .menu-sub)) > .menu-link .menu-icon');
      if (!icon || !icon.getClientRects().length) return true;
      const probe = document.createElement('span'); probe.style.color = 'var(--g-accent)'; menu.append(probe);
      const accent = getComputedStyle(probe).color; probe.remove();
      return getComputedStyle(icon).color === accent || 'the chosen row icon is ' + getComputedStyle(icon).color + ', not the accent ' + accent;
    })()`,
  },
  // (v50, the user 09/11: "tự scale 1 cấu trúc tỉ lệ thôi")
  {
    id: 'ui-scale',
    rule: 'zoomed to the window, the frame still fills it exactly: --app-h times the zoom is the window height (heights come from the frame, never from vh)',
    check: `(() => {
      const z = parseFloat(document.documentElement.style.zoom || '1');
      if (!(z > 0) || z === 1) return true;
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-h'));
      if (!h) return 'zoomed ' + z + ' with no --app-h: a height from vh runs past the window';
      return Math.abs(h * z - innerHeight) <= 2 || '--app-h ' + h + ' x zoom ' + z + ' is not the window height ' + innerHeight;
    })()`,
  },
  {
    // (v85, CRM 23/11, approved by the user: "làm luôn") a floating layer - an open drawer, an open dialog's body, an open menu -
    // is a surface over the page: its fill nearly opaque, or what is behind it blurred. CRM's member drawer read through to the
    // page on frame 1.43.2 (the glass theme's paper colour, 7 % white, without a blur), fixed in frame 1.43.4
    id: 'layer-solid',
    rule: 'a floating layer (.offcanvas.show, an open dialog\'s .modal-content, .dropdown-menu.show) is solid: its fill at least 85 % opaque, or a backdrop blur behind it',
    check: `(() => {
      const layers = [...document.querySelectorAll('.offcanvas.show, dialog[open] .modal-content, .dropdown-menu.show')]
        .filter(e => e.getClientRects().length);
      for (const e of layers) {
        const cs = getComputedStyle(e);
        const m = /rgba?\(([^)]*)\)/.exec(cs.backgroundColor);
        const parts = m ? m[1].split(/[\s,\/]+/).filter(Boolean) : [];
        const alpha = m ? (parts.length > 3 ? parseFloat(parts[3]) : 1) : 0;
        const blur = (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none';
        if (alpha < 0.85 && !blur) return 'a floating layer is see-through (' + String(e.className).split(' ').slice(0, 3).join('.') + ', fill ' + cs.backgroundColor + ')';
      }
      return true;
    })()`,
  },
  {
    // (v74, Reconcile 14/11, approved by the user) the bars of inner layers - a dialog, a card head - wear row 2's bar from the
    // frame (sasinShell.toolbar / InnerToolbar, frame 1.29.0): the same zones, read here on every inner bar shown
    id: 'inner-bar',
    rule: 'an inner bar (a dialog or a layer, .page-toolbar[data-inner-bar]) stands like row 2: its things only in its clusters - the buttons cluster from the left, the info cluster after it, the seek cluster anchored at the right end - one cluster of each kind, each framed, none running over another; words only in the info cluster; a filter box shown takes typing',
    check: `(() => {
      const shown = e => Boolean(e) && e.getClientRects().length > 0;
      for (const bar of document.querySelectorAll('.page-toolbar[data-inner-bar]')) {
        if (!shown(bar)) continue;
        const kids = [...bar.children].filter(shown);
        const loose = kids.find(k => !k.matches('.bar-cluster[data-cluster], .bar-spacer'));
        if (loose) return 'something stands loose on an inner bar, outside its clusters: ' + ((loose.textContent || '').trim() || loose.className || loose.tagName).toString().slice(0, 40);
        const one = k => [...bar.querySelectorAll(':scope > [data-cluster="' + k + '"]')].filter(shown);
        for (const k of ['tools', 'info', 'seek']) if (one(k).length > 1) return 'an inner bar has ' + one(k).length + ' ' + k + ' clusters - one of each kind';
        const [t] = one('tools'), [i] = one('info'), [s] = one('seek');
        for (const c of [t, i, s].filter(Boolean)) if (!(parseFloat(getComputedStyle(c).borderTopWidth) >= 1)) return 'the ' + c.dataset.cluster + ' cluster of an inner bar has no frame';
        // words only in the info cluster (a label, a pick, a chip or a button says its own)
        for (const c of [t, s].filter(Boolean)) {
          const walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const el = n.parentElement, words = n.textContent.trim();
            if (!words || !shown(el)) continue;
            if (el.closest('button, a, label, select, option, input, .dropdown-menu, [hidden], .visually-hidden, [class*="chip"], [role="button"], .bar-cluster[data-cluster="info"]')) continue;
            return 'words in the ' + c.dataset.cluster + ' cluster of an inner bar stand in no info cluster: ' + words.slice(0, 40);
          }
        }
        // anchors: the buttons from the left, the seek cluster at the right end (also on a line of its own on a phone)
        const r = bar.getBoundingClientRect(), cs = getComputedStyle(bar);
        const left = r.left + parseFloat(cs.paddingLeft), right = r.right - parseFloat(cs.paddingRight);
        if (t && Math.abs(t.getBoundingClientRect().left - left) > 2) return 'the buttons cluster of an inner bar does not start at its left (' + Math.round(t.getBoundingClientRect().left - left) + ' px)';
        if (s && Math.abs(s.getBoundingClientRect().right - right) > 2) return 'the seek cluster of an inner bar does not end at its right end (' + Math.round(right - s.getBoundingClientRect().right) + ' px short)';
        if (t && i) { const a = t.getBoundingClientRect(), b = i.getBoundingClientRect(); if (Math.abs(a.top - b.top) < 4 && b.left < a.right - 1) return 'the info cluster of an inner bar stands before or over its buttons'; }
        // no cluster runs over another on its line
        const boxes = [t, i, s].filter(Boolean).map(c => [c, c.getBoundingClientRect()]);
        for (const [a, ra] of boxes) for (const [b, rb] of boxes) {
          if (a === b) continue;
          if (ra.top < rb.bottom - 2 && rb.top < ra.bottom - 2 && ra.left < rb.right - 1 && rb.left < ra.right - 1) return 'the ' + a.dataset.cluster + ' and ' + b.dataset.cluster + ' clusters of an inner bar run over each other';
        }
        const box = bar.querySelector('.page-search input, .page-search .form-control');
        if (shown(box) && (box.disabled || box.readOnly)) return 'a filter box shown on an inner bar takes no typing - a fake box';
      }
      return true;
    })()`,
  },
  // (v75, the user 14/11: every panel and every other place keeps a padding, one and the same room from the top down; a table
  // header stood against its panel's edge) the frame's room (--frame-pad) is read, never written here, and every part is held to it
  {
    id: 'pad-even',
    rule: 'one room from the edge, from the top down: row 1 of the top bar, the clusters of row 2 and the content of every panel of the page (each part of a card - its header, body, table, footer) stand the frame\'s room (--frame-pad, 16 px) from their panel\'s edge - never against it, never off the line of the rest; a part centred on purpose (an empty state) and the right end of a part that scrolls sideways are not judged',
    check: `(() => {
      const shown = e => { if (!e || !e.getClientRects().length) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0; };
      const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--frame-pad, 16px)';
      document.body.append(probe); const P = probe.getBoundingClientRect().width; probe.remove();
      // a leaf is measured by its box (a control, an icon, a picture, a framed block); a large drawing is not a leaf: its words are
      const LEAF = 'img, canvas, svg, input, select, textarea, button, .btn, .badge, .form-check-input, .avatar, i.bx, i[class*="bx-"], .card, .alert, .bar-cluster, .page-tabs-panel';
      const isLeaf = el => el.matches(LEAF) && !(el.tagName.toLowerCase() === 'svg' && el.getBoundingClientRect().width > 64);
      const under = (el, root) => { if (el === root) return false; for (let a = el.parentElement; a && a !== root; a = a.parentElement) if (isLeaf(a)) return true; return false; };
      const tag = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
      const name = el => { const up = []; for (let e = el.parentElement; e && up.length < 5 && !e.matches('.card, body'); e = e.parentElement) up.unshift(tag(e));
        return (up.length ? up.join(' > ') + ' > ' : '') + tag(el) + ((el.textContent || '').trim() ? ' "' + el.textContent.trim().slice(0, 24) + '"' : ''); };
      const edges = (root, cut) => {
        let l = Infinity, r = -Infinity, who = '', rwho = '', lel = null; const boxes = new Map();
        const clips = new Map();
        const clipOf = el => {
          if (clips.has(el)) return clips.get(el);
          let c = {left: -Infinity, right: Infinity};
          for (let a = el; a && a !== root.parentElement; a = a.parentElement) {
            if (getComputedStyle(a).overflowX === 'visible') continue;
            const ar = a.getBoundingClientRect(); c = {left: Math.max(c.left, ar.left), right: Math.min(c.right, ar.right)};
          }
          clips.set(el, c); return c;
        };
        const take = (rc, el, clip = {left: -Infinity, right: Infinity}) => {
          if (rc.width <= 0 || rc.height <= 0) return;
          if ((rc.top < cut.top - 1 || rc.bottom > cut.bottom + 1) && rc.height <= cut.bottom - cut.top) return;
          const L = Math.max(rc.left, cut.left, clip.left), R = Math.min(rc.right, cut.right, clip.right);
          if (R <= L) return;
          if (L < l) { l = L; who = name(el); lel = el; }
          if (R > r) { r = R; rwho = name(el); }
        };
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const p = n.parentElement;
          if (!n.data.trim() || !p) continue;
          // a word whose box lies outside the part on screen is passed over before its glyphs are measured (a long table)
          let pr = boxes.get(p); if (!pr) boxes.set(p, pr = p.getBoundingClientRect());
          if (pr.bottom <= cut.top || pr.top >= cut.bottom || pr.right <= cut.left || pr.left >= cut.right) continue;
          if (!shown(p) || p.closest('.visually-hidden, [hidden]') || isLeaf(p) || under(p, root)) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const rc of rg.getClientRects()) take(rc, p, clipOf(p));
        }
        for (const el of root.querySelectorAll(LEAF)) if (isLeaf(el) && shown(el) && !under(el, root) && !el.closest('.visually-hidden')) take(el.getBoundingClientRect(), el);
        return {l, r, who, rwho, lel};
      };
      const scrollsX = x => x.clientWidth > 0 && x.scrollWidth > x.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(x).overflowX);
      const sideways = el => { for (let a = el.parentElement; a && !a.matches('.card, body'); a = a.parentElement) if (scrollsX(a)) return true; return [el, ...el.querySelectorAll('*')].some(x => scrollsX); };
      const judge = (where, part, inL, inR) => {
        const b = part.getBoundingClientRect();
        const cut = {left: Math.max(b.left, inL), right: Math.min(b.right, inR), top: Math.max(b.top, 0), bottom: Math.min(b.bottom, innerHeight)};
        if (cut.right <= cut.left || cut.bottom <= cut.top) return null;
        const e = edges(part, cut);
        if (e.l === Infinity) return null;
        const L = e.l - inL, R = inR - e.r, side = sideways(part);
        if (!side && Math.abs(L - R) <= 6 && L > P + 2) return null;
        if (L < P - 2) return where + ': content stands ' + Math.round(L) + ' px from the left edge of its panel (' + e.who + '), the frame keeps ' + Math.round(P);
        if (!side && R < P - 2) return where + ': content stands ' + Math.round(R) + ' px from the right edge of its panel (' + e.rwho + '), the frame keeps ' + Math.round(P);
        // off the line at the left: unless the part holds only a short thing anchored at its right end (a button in a card head)
        const wide = e.r - e.l > (inR - inL) / 2;
        const reads = e.lel && !e.lel.closest('svg') && !/center|right|end/.test(getComputedStyle(e.lel).textAlign) && (e.lel === part || e.lel.matches('th, td, h1, h2, h3, h4, h5, h6, .card-title, .card-header') || e.lel.closest('th, td'));
        // (Dashboard 15/11, fa05 South at 390: a head row whose first cell is blank, its body cut by the window's foot) a cell
        // past the first of its row stands where its column puts it: the row's line is its first cell's
        const cell = e.lel && e.lel.closest('th, td'), lead = cell && cell.cellIndex > 0 && cell.parentElement.cells[0];
        const ownLine = !lead || lead.getBoundingClientRect().width <= 0;
        if (reads && ownLine && L > P + 2 && (side || wide || R > P + 2)) return where + ': content stands ' + Math.round(L) + ' px in from its panel\\'s left edge (' + e.who + '), off the line of the rest (' + Math.round(P) + ' px)';
        return null;
      };
      const inner = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return [r.left + parseFloat(s.borderLeftWidth), r.right - parseFloat(s.borderRightWidth)]; };
      const nav = document.querySelector('#layout-navbar');
      if (shown(nav)) {
        const [l, r] = inner(nav), row1 = nav.querySelector(':scope > .nav-row1') || nav;
        const f = judge('row 1 of the top bar', row1, l, r); if (f) return f;
      }
      for (const bar of document.querySelectorAll('#page-bar > .page-toolbar, .page-card > .page-toolbar')) {
        if (!shown(bar)) continue;
        const [l, r] = inner(bar.closest('.page-card') || bar.closest('#layout-navbar') || bar);
        const f = judge('row 2 (the page bar)', bar, l, r); if (f) return f;
      }
      for (const card of document.querySelectorAll('#page .card')) {
        if (!shown(card) || card.closest('dialog, .modal, .dropdown-menu, .offcanvas, .popover, .toast')) continue;
        const [l, r] = inner(card);
        const title = (card.querySelector('.card-title, .card-header, h5, h6')?.textContent || '').trim().slice(0, 30);
        for (const part of card.children) {
          if (!shown(part) || part.matches('.page-toolbar, .bar-spacer, script, style') || isLeaf(part) || /absolute|fixed/.test(getComputedStyle(part).position)) continue;
          const where = 'a panel' + (title ? ' "' + title + '"' : '') + ', its ' + (String(part.className).trim().split(/\\s+/)[0] || part.tagName.toLowerCase());
          // a part of several blocks (a heading, a person's line, a table) is read block by block, through plain wrappers
          let blocks = [...part.children].filter(shown);
          while (blocks.length === 1 && !isLeaf(blocks[0]) && !blocks[0].matches('table, .table-responsive, .table-window, .table-scroller, .matrix-frame, svg') && blocks[0].children.length) blocks = [...blocks[0].children].filter(shown);
          // (v78, the user 16/11: "từ mép padding tới chữ và khung matrix luôn") a table stands in a framed box of its own: the box,
          // not its words, keeps the room from both edges of the panel (its words stand --table-pad inside it, table-edges)
          // (the page card's own body may carry .table-scroller: it is the panel's body, never a table's box)
          const TBOX = ':is(.table-responsive, .table-window, .table-scroller, .list-window, .matrix-frame):not(.page-card-body), :is(.card, .card-body, .page-card-body, [class*="dom-page"]) > :is(table, .table), :is(.card-body, .page-card-body, [class*="dom-page"]) > div:not(.page-card-body, [class*="dom-page"], .card, .row):has(> table), :is(.rp-body, [data-rp-body]) > div:not(.card, .row):has(> table)';
          // (v80, Dashboard 17/11: a bare panel - page-card-body > section > .rp-body > box - was read by its words, 29 px) a block
          // that only wraps one table box, through wrappers of one child, is read by that box
          const inner = b => { let x = b; for (let k = 0; k < 6 && x && !x.matches(TBOX) && !isLeaf(x); k++) { const kids = [...x.children].filter(shown); if (kids.length !== 1) return null; x = kids[0]; } return x && x.matches(TBOX) ? x : null; };
          const tpad = (() => { const q = document.createElement('div'); q.style.cssText = 'position:absolute;visibility:hidden;width:var(--table-pad, 12px)'; document.body.append(q); const w = q.getBoundingClientRect().width; q.remove(); return w; })();
          const boxed = b => { const x = b.getBoundingClientRect(), L = x.left - l, R = r - x.right;
            if (Math.abs(L - P) > 2) return where + ': the box of a table stands ' + Math.round(L) + ' px from the left edge of its panel, the frame keeps ' + Math.round(P) + ' (' + tag(b) + ')';
            if (!sideways(b) && Math.abs(R - P) > 2) return where + ': the box of a table stands ' + Math.round(R) + ' px from the right edge of its panel, the frame keeps ' + Math.round(P) + ' (' + tag(b) + ')';
            // its first column's words stand --table-pad inside the box, past the box's border
            const t = b.matches('table') ? b : b.querySelector('table'), c = t && [...t.querySelectorAll('tr:first-child > :first-child')].find(shown);
            if (c && !(b.scrollLeft > 0)) { const inL = x.left + parseFloat(getComputedStyle(b).borderLeftWidth), w = c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft) - inL;
              if (Math.abs(w - tpad) > 2) return where + ': the first column of a table stands ' + Math.round(w) + ' px inside its box, the frame keeps ' + Math.round(tpad) + ' (' + name(c) + ')'; }
            return null; };
          if (part.matches(TBOX)) { const f = boxed(part); if (f) return f; continue; }
          for (const b of blocks.length > 1 || (blocks.length === 1 && blocks[0].matches(TBOX)) ? blocks : [part]) {
            if (b !== part && (isLeaf(b) || b.matches('.bar-spacer, script, style') || /absolute|fixed/.test(getComputedStyle(b).position))) continue;
            const tb = b.matches(TBOX) ? b : inner(b);
            const f = tb ? boxed(tb) : judge(where + (b === part ? '' : ' (a block)'), b, l, r);
            if (f) return f;
          }
        }
      }
      return true;
    })()`,
  },
  // (v75, the user 14/11: a panel held to the screen showed two scroll bars side by side, very ugly) one box scrolls a column:
  // a box that scrolls up and down never stands inside another box that scrolls up and down
  {
    id: 'one-scroll',
    rule: 'one scroll bar per column of the page: a box that scrolls up and down (its content taller than it) never stands inside another box of the page that scrolls up and down - the panel scrolls its table, or the table scrolls in a panel that does not; two bars side by side is a fault',
    check: `(() => {
      const page = document.querySelector('#page');
      if (!page) return true;
      const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
      // the size test first (cheap once the page is laid out), the style only for what runs taller than its box
      const tall = [page, ...page.querySelectorAll('*')].filter(e => e.clientHeight > 0 && e.scrollHeight > e.clientHeight + 1
        && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.getClientRects().length && !e.closest('dialog, .modal, .dropdown-menu, .offcanvas, .popover'));
      for (const inner of tall) {
        const outer = tall.find(o => o !== inner && o.contains(inner));
        if (outer) return 'two scroll bars, one box inside another: ' + name(inner) + ' (' + inner.clientHeight + ' of ' + inner.scrollHeight + ' px) scrolls inside '
          + name(outer) + ' (' + outer.clientHeight + ' of ' + outer.scrollHeight + ' px) - one box scrolls the column';
      }
      return true;
    })()`,
  },
];

/** Rules on an open dialog. */
export const DIALOG_RULES = [
  // (v74) the inner bar of a dialog is read with the dialog open
  ...RULES.filter(r => r.id === 'inner-bar' || r.id === 'layer-solid'),
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
      // (v84, CRM 23/11: 1302x733 against 1296x729, red twice at a deploy, green the third run - the opening effect overshoots
      // past scale 1 by less than the .01 below) a dialog with a running animation is still opening, shrunk or grown: its size
      // is judged only once it stands still
      if (d.getAnimations({subtree: true}).some(a => a.playState === 'running')) return 'the dialog is still opening';
      // (v57, Reconcile 11/11: a third dialog stood still at 0.94 of its size, the opening scale) a dialog still opening is
      // waited for; one standing still while shrunk never got its opened state - named apart from a wrong size
      const shrunk = [d, ...d.querySelectorAll('.modal-dialog, .modal-content')].map(e => ({e, s: new DOMMatrixReadOnly(getComputedStyle(e).transform === 'none' ? undefined : getComputedStyle(e).transform).a}))
        .find(x => Math.abs(x.s - 1) > .01);
      if (shrunk) return 'a dialog stands shrunk at ' + shrunk.s.toFixed(2) + ' of its size (' + (shrunk.e.id || String(shrunk.e.className).split(' ')[0] || shrunk.e.tagName) + '): its opening effect never ended - the opened state is not applied';
      const p = {s: 40, m: 60, l: 90}[size.slice(3)], w = Math.min(p * innerWidth / 100, p * innerHeight / 100 * 16 / 9);
      return Math.abs(r.width - w) <= 2 && Math.abs(r.height - w * 9 / 16) <= 2 ? true
        : 'dialog ' + Math.round(r.width) + 'x' + Math.round(r.height) + ', want ' + Math.round(w) + 'x' + Math.round(w * 9 / 16);
    })()`,
  },
];

/** (v31) Probes: async browser expressions (evaluate with awaitPromise) that move the page and measure it, then put it back. */
export const PROBES = [
  // (v99, the requester 27/11 through the system-manager repo: "hiệu ứng ánh sáng theo con trỏ t vừa kiểm thì bị mất, cổng kiểm ko
  // thấy cái này à? mọi effect cũng cần cổng kiểm") the White tone set the light to transparent and a page's cards had lost the
  // class, and no rule ever moved the pointer: the probe moves it over each effect as a person does and measures what it does
  {
    id: 'fx-alive',
    rule: 'the pointer effects are alive and seen: over a .sheen panel the light spot follows the pointer (--mx moves) in a colour that shows in the tone on screen (--g-sheen not transparent), a .tilt panel leans towards the pointer, a .magnet button is pulled towards it - unless the person turned the effects off (html.fx-off); tilt and magnet rest under reduced motion',
    check: `(async () => {
      if (document.documentElement.classList.contains('fx-off')) return true;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const shown = e => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20 && r.bottom > 0 && r.top < innerHeight; };
      const name = e => e.id ? '#' + e.id : '.' + String(e.className).trim().split(/\\s+/).slice(0, 3).join('.');
      const move = (e, fx, fy) => { const r = e.getBoundingClientRect(); e.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy})); };
      const rest = () => document.dispatchEvent(new PointerEvent('pointerout', {bubbles: true, relatedTarget: null}));
      const alpha = c => { const p = c.replace(/^rgba?\\(|\\)$/g, '').split(/[\\s,\\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
      try {
        const sheen = [...document.querySelectorAll('.sheen')].find(shown);
        if (sheen) {
          move(sheen, .25, .3); await wait(40); const a = sheen.style.getPropertyValue('--mx');
          move(sheen, .75, .7); await wait(40); const b = sheen.style.getPropertyValue('--mx');
          if (!a || a === b) return 'the pointer light does not follow the pointer over ' + name(sheen) + ' (--mx ' + (b || 'never set') + '): the pointer effects of the frame do not run';
          const bg = getComputedStyle(sheen, '::after').backgroundImage || 'none';
          if (bg === 'none') return 'the pointer light of ' + name(sheen) + ' draws nothing: .sheen::after has no gradient';
          const first = (bg.match(/rgba?\\([^)]*\\)|transparent/) || ['transparent'])[0];
          if (first === 'transparent' || alpha(first) < .02) return 'the pointer light of ' + name(sheen) + ' is invisible in this tone: its colour (--g-sheen) is ' + first;
        }
        if (!still) {
          const tilt = [...document.querySelectorAll('.sheen.tilt')].find(shown);
          if (tilt) {
            move(tilt, .9, .9); await wait(40);
            if (!/rotate/.test(tilt.style.transform)) return 'the tilt of ' + name(tilt) + ' does not lean towards the pointer (transform ' + (tilt.style.transform || 'none') + ')';
          }
          const magnet = [...document.querySelectorAll('.magnet:not(:disabled)')].find(shown);
          if (magnet) {
            move(magnet, .95, .9); await wait(40);
            if (!/translate/.test(magnet.style.transform)) return 'the magnet button ' + name(magnet) + ' is not pulled towards the pointer (transform ' + (magnet.style.transform || 'none') + ')';
          }
        }
        return true;
      } finally { rest(); }
    })()`,
  },
  // (v91, the user 25/11 through Dashboard: "mấy cái popover và dialogbox phải luôn ở lớp cao nhất") the layers of the frame stand in
  // their order, and every menu or popover opened from the head is seen over anything of the page: a cover at the focus layer
  // (the highest a page may reach) laid over what an opener opens never hides it
  {
    id: 'float-on-top',
    rule: 'the layers stand in the order of the frame (--z-page < --z-bar < --z-ai < --z-focus < --z-offcanvas < --z-tip; the menus and popovers of the head, dialogs and toasts in the top layer), the AI chat under an enlarged visual, and every menu or popover opened from row 1 or the page bar stays seen under a cover at the focus layer laid over it: the point in its middle hits it',
    check: `(async () => {
      const css = getComputedStyle(document.documentElement), z = n => parseFloat(css.getPropertyValue('--z-' + n));
      // (v93) --z-modal (frame 1.47.0) between the drawers and the tips, asked only of a frame that names it
      const order = ['page', 'bar', 'ai', 'focus', 'offcanvas', 'modal', 'tip'].filter(n => n !== 'modal' || Number.isFinite(z(n)));
      if (order.some(n => !Number.isFinite(z(n)))) return 'the frame names no layers (--z-page … --z-tip): wear frame 1.43.6 or later';
      // a frame older than 1.45.0 (the focus still under the AI chat, the head's menus drawn in place) is not asked yet
      if (z('focus') < z('ai')) return true;
      for (let i = 1; i < order.length; i++) if (!(z(order[i - 1]) < z(order[i]))) return 'the layers are out of order: --z-' + order[i - 1] + ' is not under --z-' + order[i];
      for (const ai of document.querySelectorAll('.ai-chat, .ai-fab')) {
        const v = parseFloat(getComputedStyle(ai).zIndex);
        if (Number.isFinite(v) && v >= z('focus')) return 'the AI chat stands at ' + v + ', not under an enlarged visual (--z-focus ' + z('focus') + ')';
      }
      const head = document.getElementById('layout-navbar');
      if (!head) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const esc = () => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, {key: 'Escape', bubbles: true})); };
      const name = e => e.id ? '#' + e.id : (e.getAttribute('aria-label') || e.className && '.' + String(e.className).trim().split(/\\s+/)[0] || e.tagName.toLowerCase());
      const out = [];
      for (const b of [...head.querySelectorAll('[aria-expanded="false"]')].filter(e => e.getClientRects().length && !e.disabled)) {
        b.click();
        await wait(400);
        const id = b.getAttribute('aria-controls');
        let pop = id && document.getElementById(id);
        if (!pop || !pop.getClientRects().length) pop = b.closest('.dropdown, .sn-dd, .nav-item')?.querySelector('.dropdown-menu.show, [role="dialog"]:not([hidden]), [role="menu"]:not([hidden])');
        if (pop && pop.getClientRects().length) {
          const r = pop.getBoundingClientRect(), cover = document.createElement('div');
          cover.id = 'g-probe-cover';
          cover.style.cssText = 'position: fixed; left: 0; top: 0; width: 100px; height: 100px; z-index: var(--z-focus); background: transparent';
          document.body.append(cover);
          // a page drawn zoomed: the cover is placed in its own px (a rect is on screen)
          const k = cover.getBoundingClientRect().width / 100 || 1;
          Object.assign(cover.style, {left: r.left / k + 'px', top: r.top / k + 'px', width: r.width / k + 'px', height: r.height / k + 'px'});
          const x = Math.min(innerWidth - 2, Math.max(1, (r.left + r.right) / 2)), y = Math.min(innerHeight - 2, Math.max(1, (r.top + r.bottom) / 2));
          // (v96) a loaded machine lifts the menu into the top layer later than 400 ms: asked again for up to about 2 s first
          let hit = document.elementFromPoint(x, y);
          for (let n = 0; n < 8 && hit && !pop.contains(hit); n++) { await wait(200); hit = document.elementFromPoint(x, y); }
          cover.remove();
          if (hit && !pop.contains(hit)) out.push(name(b) + ': what it opens (' + name(pop) + ') is hidden by ' + (hit.id === 'g-probe-cover' ? 'anything of the page at the focus layer' : name(hit)));
        }
        if (b.getAttribute('aria-expanded') === 'true') b.click();
        esc();
        await wait(250);
      }
      return out.length ? out.join(' | ') : true;
    })()`,
  },
  // (v90, the user 25/11: "toàn bộ màu sắc của scroolbarr, nút khi bật, màu table … đều đang là màu cố định … chọn theme phải
  // đổi toàn bộ ko chỉ cái ảnh nền") the page is seen under two tones: every accent surface of the page shows a different colour
  // in each - one that keeps its colour is written as a literal (Rule_Gate_77_ColoursFromTheme). A frame older than 1.44.0, whose
  // tones change only the wallpaper, is not asked.
  {
    id: 'theme-follow',
    rule: 'choosing a tone changes the whole page, not only the wallpaper: seen under the Ocean tone and under the Sunset tone, every accent surface of the page (a primary button, a switch on, a chosen tab or view, an accent badge, the chosen item of a menu) shows a different colour in each; one that keeps its colour is a colour written as a literal',
    check: `(async () => {
      const html = document.documentElement, was = html.dataset.wall;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      // (v92, Dashboard 25/11: every page with page tabs read red) an accent surface is what PAINTS the accent: the chosen page
      // tab is clear over the pill that carries it, so the pill is read, and an element with no fill of its own is left out
      const painted = e => { const c = getComputedStyle(e); return c.backgroundImage !== 'none' || !['transparent', 'rgba(0, 0, 0, 0)'].includes(c.backgroundColor); };
      const els = [...document.querySelectorAll('.btn-primary, .form-check-input:checked, .nav-pills .nav-link.active, .view-switch > .btn.active, .bg-label-primary, .dropdown-item.active, .page-tabs-panel > .page-tabs-pill')]
        .filter(e => e.getClientRects().length && !e.closest('.sw, [data-theme-fixed]') && painted(e)).slice(0, 40);
      const look = e => { const c = getComputedStyle(e); return [c.backgroundColor, c.backgroundImage, c.color, c.borderTopColor].join('|'); };
      const seen = [], root = [];
      try {
        for (const tone of ['ocean', 'sunset']) {
          html.dataset.wall = tone;
          await wait(700);
          root.push(getComputedStyle(html).getPropertyValue('--g-accent').trim());
          seen.push(els.map(look));
        }
      } finally { html.dataset.wall = was; }
      if (root[0] === root[1]) return true;
      const still = els.filter((e, i) => seen[0][i] === seen[1][i]);
      const name = e => e.id ? '#' + e.id : (e.tagName.toLowerCase() + '.' + String(e.className).trim().split(/\\s+/).slice(0, 2).join('.'));
      return still.length ? 'these keep one colour whatever the tone (a colour written as a literal): ' + still.slice(0, 5).map(name).join(', ') : true;
    })()`,
  },
  // (v64, the user 12/11: "bộ kiểm phải kiểm luôn filter và search và mọi cụm chức năng đều phải hoạt động dc để các repo nó tự dò
  // và sửa") every control of row 2 is pressed as a person would and must do what it says; the page is left as it was
  {
    id: 'bar-works',
    rule: 'every cluster of row 2 works when pressed: refresh asks the server again (a request within 8 s); the glossary opens its dialog with its words and Escape closes it (or it stands turned off with no words); the filter button opens its popover, which holds filters, and Escape closes it; the filter box filters what the page shows (a text no row holds leaves no row or the empty state, clearing it gives every row back); the short / long switch of the tabs changes them or offers the ways out; the page is left as it was',
    check: `(async () => {
      const bar = document.querySelector('#page-bar > .page-toolbar, .page-toolbar');
      if (!bar || !bar.getClientRects().length) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const until = async (f, ms) => { for (let t = 0; t <= ms; t += 100) { try { if (f()) return true; } catch { /* drawing */ } await wait(100); } return false; };
      const shown = e => Boolean(e) && e.getClientRects().length > 0;
      const esc = () => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, {key: 'Escape', bubbles: true})); };
      const out = [];
      // refresh: one request to the server at least, counted on fetch and XMLHttpRequest
      const refresh = document.getElementById('page-refresh');
      if (shown(refresh) && !refresh.disabled) {
        // the frame's own rounds (who is signed in, health, notices, the person's settings) are not the page asking again
        let asked = 0;
        const own = u => /\\/(auth\\/me|auth\\/ui|health|notices|notifications)\\b/.test(String(u && (u.url || u)));
        const fetch0 = window.fetch, open0 = XMLHttpRequest.prototype.open;
        window.fetch = function (...a) { if (!own(a[0])) asked++; return fetch0.apply(this, a); };
        XMLHttpRequest.prototype.open = function (...a) { if (!own(a[1])) asked++; return open0.apply(this, a); };
        // a refresh still running (aria-busy) swallows a click by design: wait for it, and one still running after the wait
        // is a refresh that already asked the server
        const busy = () => refresh.getAttribute('aria-busy') === 'true';
        await until(() => !busy(), 60000);
        try { if (busy()) asked++; else refresh.click(); if (!(await until(() => asked > 0, 8000))) out.push('refresh asked the server nothing'); }
        finally { window.fetch = fetch0; XMLHttpRequest.prototype.open = open0; }
        await until(() => !document.querySelector('#page-refresh[aria-busy="true"]'), 15000);
        await wait(600);
      }
      // glossary: its dialog with its words, closed by Escape
      const gl = document.getElementById('page-glossary');
      if (shown(gl) && !gl.disabled) {
        gl.click();
        const d = () => document.querySelector('#page-glossary-dialog');
        if (!(await until(() => d() && d().open, 2000))) out.push('the glossary opened no dialog');
        else {
          if (!d().querySelector('dt')) out.push('the glossary dialog holds no words');
          esc();
          if (!(await until(() => !d() || !d().open, 2000))) out.push('Escape left the glossary open');
        }
      }
      // filter button: its popover, holding filters, closed by Escape
      const ft = document.getElementById('filter-toggle'), pop = document.getElementById('filter-pop');
      if (shown(ft) && !ft.disabled && pop) {
        ft.click();
        if (!(await until(() => !pop.hidden && shown(pop), 2000))) out.push('the filter button opened no popover');
        else {
          if (!pop.querySelector('.filter-place, .filter-field, select, input') && !document.querySelector('#filter-row .filter-place')) out.push('the filter popover holds no filter');
          esc();
          if (!(await until(() => pop.hidden || !shown(pop), 2000))) out.push('Escape left the filter popover open');
        }
      }
      // filter box: a text no row holds empties the list; clearing gives the rows back. (v71, the user 14/11: "rất nhiều trang
      // khung lọc là khung giả, ko nhập dc ... nút search phải bấm dc thật ko dc nút ảo") a box shown takes typing - a disabled
      // or read-only box is a fake - and typing changes what the page shows: its table rows or its chart items
      for (const b of document.querySelectorAll('#page-search input, .page-toolbar .page-search input')) {
        if (shown(b) && (b.disabled || b.readOnly)) out.push('the filter box "' + (b.placeholder || b.getAttribute('aria-label') || '') + '" takes no typing - a fake box: give the page a search or show no box');
      }
      const box = document.querySelector('#page-search input, .page-toolbar .page-search input');
      const rows = () => [...document.querySelectorAll('#page table tbody tr, #page .view-grid tbody tr')].filter(r => shown(r) && !r.querySelector('[data-empty], .empty-state')).length;
      // (v101, the system-manager repo 27/11: the Apps page in its grid view holds cards, not rows, and its filter box read as over
      // nothing) the cards of a list drawn as a grid are items too, marked data-item by the page
      const items = () => [...document.querySelectorAll('#page [data-rp-item], #page [data-rp-mark], #page [data-item]')].filter(shown).length;
      if (shown(box) && !box.disabled && !box.readOnly) {
        const n0 = rows(), m0 = items();
        // (Reconcile 15/11: the invoices of a day with none yet) a page that honestly has nothing today wears the empty template
        // of the frame; its box stays, since tomorrow it has rows - only a box over nothing and no empty template is red
        const honest = [...document.querySelectorAll('#page .state-box.empty-state, #page [data-empty]')].some(shown);
        if (n0 + m0 === 0) { if (!honest) out.push('the filter box stands on a page with no row and no chart item to filter'); }
        else {
          const put = v => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, v); box.dispatchEvent(new Event('input', {bubbles: true})); };
          put('zq\\u00a7xj~nothing');
          if (!(await until(() => rows() < n0 || items() < m0 || document.querySelector('#page [data-empty], #page .empty-state'), 3000))) out.push('the filter box filtered nothing (' + n0 + ' rows and ' + m0 + ' chart items stayed)');
          put('');
          if (!(await until(() => rows() >= n0 && items() >= m0, 3000))) out.push('clearing the filter box did not give the page back (' + rows() + ' of ' + n0 + ' rows, ' + items() + ' of ' + m0 + ' items)');
        }
      }
      // the short / long switch: the tabs change, or the ways out are offered; then back as it was
      const sw = document.getElementById('page-tabs-style');
      if (shown(sw)) {
        const s0 = sw.dataset.style;
        sw.click();
        const changed = await until(() => { const n = document.getElementById('page-tabs-style'); return (n && n.dataset.style !== s0) || shown(document.getElementById('page-tabs-offer')); }, 2500);
        if (!changed) out.push('the short / long switch of the tabs did nothing');
        else if (shown(document.getElementById('page-tabs-offer'))) { esc(); document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); }
        else { const n = document.getElementById('page-tabs-style'); if (n) n.click(); await until(() => document.getElementById('page-tabs-style')?.dataset.style === s0, 2500); }
      }
      // every grip and edge takes the pointer
      const dead = [...document.querySelectorAll('.bar-grip, #page-tabs-grip, .bar-resize')].find(g => shown(g) && getComputedStyle(g).pointerEvents === 'none');
      if (dead) out.push('a grip of row 2 does not take the pointer');
      return out.length ? out.join('; ') : true;
    })()`,
  },
  // (v87, the user 25/11 through the system-manager repo: the Group filter of Apps listed "data" and "ops" - untranslated, lowercase - and the
  // user asked for a gate that never lets such a list through) a multi-pick list is drawn only while it is open, so no-raw-code,
  // which reads what stands on the page, never saw its options: this probe opens each one as a person does and reads them
  {
    id: 'names-in-lists',
    rule: 'every pick list of the page - each filter on the page or row 2 and each in the filter popover - offers names, never stored codes: opened as a person opens it, no option reads as a bare lowercase word or a code with an underscore (data, ops, data_query); the page is left as it was',
    check: `(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const until = async (f, ms) => { for (let t = 0; t <= ms; t += 100) { try { if (f()) return true; } catch { /* drawing */ } await wait(100); } return false; };
      const shown = e => Boolean(e) && e.getClientRects().length > 0;
      const esc = () => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, {key: 'Escape', bubbles: true})); };
      const code = /^[a-z]+(_[a-z]+)*$/;
      const out = [];
      let read = 0;
      const look = async btn => {
        if (read++ >= 12) return;   // a page with many filters: the first twelve are enough to find a list of codes
        const menu = () => document.getElementById(btn.getAttribute('aria-controls'));
        btn.click();
        if (!(await until(() => menu(), 2000))) return;
        await wait(150);
        const name = (btn.getAttribute('aria-label') || '').split(':')[0].trim() || 'a filter';
        const hit = [...menu().querySelectorAll('.slicer-item .form-check-label, [role="option"]')].map(e => (e.textContent || '').trim()).find(t => code.test(t));
        if (hit) out.push('the filter ' + name + ' offers a stored code: ' + hit);
        btn.click();
        if (!(await until(() => !menu(), 1500))) { esc(); await until(() => !menu(), 1500); }
      };
      const lists = root => [...root.querySelectorAll('button.slicer-btn[aria-haspopup="listbox"][aria-controls]')].filter(b => shown(b) && !b.disabled);
      for (const b of lists(document).filter(b => !b.closest('#filter-pop'))) await look(b);
      const ft = document.getElementById('filter-toggle'), pop = document.getElementById('filter-pop');
      if (shown(ft) && !ft.disabled && pop) {
        ft.click();
        if (await until(() => !pop.hidden && shown(pop), 2000)) {
          for (const b of lists(pop)) await look(b);
          esc();
          if (!(await until(() => pop.hidden || !shown(pop), 2000))) ft.click();
        }
      }
      return out.length ? out.join('; ') : true;
    })()`,
  },
  // (v88, the user 25/11 through the system-manager repo: "is the English-Vietnamese gate missing?" - the dictionaries were only compared key
  // for key, and no check ever looked at a page in English) the page is switched to English with the frame's own language
  // buttons, its words are read, and it is switched back
  {
    id: 'lang-both',
    rule: 'the page speaks the language chosen: switched to English with the language buttons of the account menu, no word of the frame or of the app (buttons, labels, column headers, headings, tabs, dialog titles, box hints, tooltips of controls) shows Vietnamese; data keeps its own words (table rows, pick-list options, report content, the person\'s name, anything marked translate="no"); the page is switched back as it was',
    check: `(async () => {
      const en = document.querySelector('[data-lang="en"]'), vi = document.querySelector('[data-lang="vi"]');
      if (!en || !vi) return true;
      // one look per page and browser: the words do not change with the width or the theme
      const key = 'sgc-lang-both:' + location.pathname + location.hash;
      try { if (sessionStorage.getItem(key)) return true; } catch { /* no storage */ }
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const until = async (f, ms) => { for (let t = 0; t <= ms; t += 100) { try { if (f()) return true; } catch { /* drawing */ } await wait(100); } return false; };
      const shown = e => Boolean(e) && e.getClientRects().length > 0;
      const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
      const DATA = '[data-rp-page], tbody, .slicer-item, .slicer-menu, select, option, .avatar, [translate="no"], [data-raw], #greeting, .account-greeting, #account-menu h6, .toast, #layout-menu .menu-link, .breadcrumb, .slicer-btn';
      const WORDS = 'button, .btn, label, .form-label, thead th, .modal-title, .dropdown-header, .menu-header-text, .empty-state, [role="tab"], .nav-link, h1, h2, h3, h4, h5, h6, .card-title';
      const pressed = b => b.getAttribute('aria-pressed') === 'true';
      const was = pressed(en) ? 'en' : 'vi';
      const out = [];
      try {
        if (was !== 'en') {
          en.click();
          if (!(await until(() => pressed(document.querySelector('[data-lang="en"]')), 6000))) return 'the English button changed nothing';
          await wait(800);
        }
        const seen = new Set();
        const say = (where, text) => { const t = text.trim().replace(/\\s+/g, ' ').slice(0, 50); if (!seen.has(t) && out.length < 6) { seen.add(t); out.push(where + ' "' + t + '"'); } };
        for (const e of document.querySelectorAll(WORDS)) {
          if (!shown(e) || e.closest(DATA)) continue;
          const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) if (VI.test(n.nodeValue) && !n.parentElement.closest(DATA)) say(e.tagName.toLowerCase(), n.nodeValue);
        }
        // the label of a filter rides in its button; only the label is the app's word, the value after it is data
        for (const l of document.querySelectorAll('.filter-label')) if (shown(l) && !l.closest('[translate="no"]') && VI.test(l.textContent)) say('filter label', l.textContent);
        for (const e of document.querySelectorAll('[placeholder], [aria-label], [title], [data-tip]')) {
          if (!shown(e) || e.closest(DATA) || e.matches('svg *, path')) continue;
          for (const a of ['placeholder', 'aria-label', 'title', 'data-tip']) { const v = e.getAttribute(a); if (v && VI.test(v)) say(a, v); }
        }
      } finally {
        if (was !== 'en') { const back = document.querySelector('[data-lang="vi"]'); if (back) { back.click(); await until(() => pressed(document.querySelector('[data-lang="vi"]')), 6000); await wait(400); } }
        try { sessionStorage.setItem(key, '1'); } catch { /* no storage */ }
      }
      return out.length ? 'Vietnamese shows in the English page: ' + out.join('; ') : true;
    })()`,
  },
  // (v51, the user 09/11 through an app of the family: a widened column ran a table out of its panel. Async, Reconcile 09/11: a
  // page that draws its tables after it settles - a journal awaiting its API - passed a rule read at once on no table at all)
  {
    id: 'table-boxed',
    rule: 'every table of a page, a board card or a dialog stands in a sideways scroll box of its own inside its card (overflow-x auto or scroll), and that box never runs past the card: a column widened past the card scrolls, it never spills out - read once the page has drawn its tables (up to 8 s while it is still busy)',
    check: `(async () => {
      // a phone scrolls the window and shows a list's rows as cards: no sideways box there
      if (innerWidth < 768) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const busy = () => Boolean(document.querySelector('#page.g-loading, #page [aria-busy="true"], #page .spinner-border, #page .state-box[data-state="loading"], #page .placeholder-glow'));
      const tables = () => [...document.querySelectorAll('#page table, .modal-content table, dialog table')].filter(t => t.getClientRects().length && !t.closest('.dropdown-menu, .date-menu, .view-grid'));
      // wait while the page is busy, then 1.5 s calm more - a page that fetches its panels without a busy mark draws them by then
      // (a table already on the page is no sign the rest has come: a journal draws its panels one by one)
      // (v52, Reconcile 09/11: a page that settles at once let a table drawn 2 s later through) 2.5 s at least, whatever the page says
      for (let ms = 0, calm = 0; ms < 8000; ms += 250) {
        calm = busy() ? 0 : calm + 250;
        if (calm >= 1500 && ms >= 2500) break;
        await wait(250);
      }
      const out = [];
      for (const table of tables()) {
        const card = table.closest('.card, .page-card, .modal-content, dialog');
        if (!card) continue;
        let box = table.parentElement, boxed = false;
        while (box) {
          if (/(auto|scroll)/.test(getComputedStyle(box).overflowX)) { boxed = true; break; }
          if (box === card) break;
          box = box.parentElement;
        }
        const name = table.dataset.resizeId || table.id || String(table.className).split(' ').slice(0, 2).join('.') || 'a table';
        if (!boxed) { out.push(name + ' has no sideways scroll box of its own inside its card'); continue; }
        const b = box.getBoundingClientRect(), c = card.getBoundingClientRect();
        if (b.right > c.right + 1) out.push(name + ': its scroll box runs ' + Math.round(b.right - c.right) + ' px past its card');
      }
      return out.length ? out.slice(0, 4).join('; ') : true;
    })()`,
  },
  // (v55) every list longer than the screen stands in one screen and scrolls inside its own panel, in every app of the family
  // (measured on an app: two journal lists of 1274 and 1312 px in boxes as tall as themselves, room 759 px - red)
  {
    id: 'list-one-screen',
    rule: 'a table longer than the screen scrolls inside a box at most one screen tall (the room under the top bar, --table-room): the body of a page card that fills the frame, or a box of its own - on a page card and on every card of a board alike (v68) - never the page column scrolling a long list, never a box as tall as the whole list; its header row and its foot (the total row) both stay in sight in that box - read once the page has drawn its tables, however long it takes (up to 40 s)',
    check: `(async () => {
      // a phone scrolls the window and shows a list's rows as cards
      if (innerWidth < 768) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      // (v68, Reconcile 13/11: a journal draws in 25 s and the probe, calm after 8 s, passed on an empty page) busy also while the
      // page says it is loading, and calm only once nothing in the page has changed for 2 s - up to 40 s
      const busy = () => Boolean(document.querySelector('#page.g-loading, #page [aria-busy="true"], #page .spinner-border, #page .spinner-grow, #page .state-box[data-state="loading"], #page .placeholder-glow, #page .skeleton'))
        || /(Đang tải|Loading)/i.test((document.getElementById('page')?.innerText || '').slice(0, 4000));
      let changed = Date.now();
      const seen = new MutationObserver(() => { changed = Date.now(); });
      const pageEl = document.getElementById('page');
      if (pageEl) seen.observe(pageEl, {childList: true, subtree: true, characterData: true});
      for (let ms = 0; ms < 40000; ms += 250) {
        if (!busy() && Date.now() - changed >= 2000 && ms >= 2500) break;
        await wait(250);
      }
      seen.disconnect();
      const room = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--table-room')) || innerHeight;
      const page = '.layout-page, .content-wrapper, .container-p-y, #page, .page-card:not(.fill) > .page-card-body';
      const out = [];
      for (const table of document.querySelectorAll('#page table')) {
        if (!table.getClientRects().length || !table.tBodies[0]?.rows.length || table.closest('dialog, .dropdown-menu, .date-menu, .view-grid')) continue;
        let box = table.parentElement;
        while (box && box !== document.body && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
        const name = table.dataset.resizeId || table.id || 'a table', tall = table.getBoundingClientRect().height;
        if (!box || box === document.body || box.matches(page)) {
          if (tall > room + 2) out.push(name + ' (' + Math.round(tall) + ' px) scrolls with the page column - no box of its own one screen tall');
          continue;
        }
        if (box.clientHeight > room + 2) { out.push(name + ': its scroll box is ' + box.clientHeight + ' px, taller than the screen (' + Math.round(room) + ' px)'); continue; }
        // (v68) a list that scrolls in its box keeps its header and its total row in sight: both stand inside the box's view
        if (table.offsetHeight > box.clientHeight + 2) {
          const r = box.getBoundingClientRect(), th = table.tHead?.rows[0]?.cells[0], tf = table.tFoot?.rows[0]?.cells[0];
          const was = box.scrollTop; box.scrollTop = Math.round((box.scrollHeight - box.clientHeight) / 2);
          const h = th?.getBoundingClientRect(), f = tf?.getBoundingClientRect();
          box.scrollTop = was;
          if (h && (h.top < r.top - 1 || h.bottom > r.bottom + 1)) out.push(name + ': its header row scrolls out of its box');
          else if (f && (f.bottom > r.bottom + 1 || f.top < r.top - 1)) out.push(name + ': its total row is not in sight in its box');
        }
      }
      return out.length ? out.slice(0, 4).join('; ') : true;
    })()`,
  },
  {
    id: 'rows-painted',
    rule: 'every row of a table scrolled into view is drawn: a point in the middle of each row in view hits that row - rows under the table\'s own pinned header or behind its footer pinned at the bottom are left out, nothing else (user 06/11: a table mid-page lost its first rows)',
    check: `(async () => {
      const wait = () => new Promise(r => setTimeout(r, 120));
      const scroller = document.querySelector('.page-card-body');
      if (!scroller) return true;
      // (v34, Reconcile 06/11) every box the probe moves is put back: scrollIntoView also scrolls boxes that clip without a
      // scroll bar (.layout-page), and one left moved pushed the top bar's avatar out of its box (a false dot-whole)
      const moved = new Map();
      const keep = box => { if (box && !moved.has(box)) moved.set(box, [box.scrollTop, box.scrollLeft]); };
      const errors = [];
      keep(scroller); keep(document.scrollingElement);
      for (const table of document.querySelectorAll('#page table')) {
        if (!table.getClientRects().length || !table.tBodies.length || table.closest('dialog')) continue;
        for (let e = table.parentElement; e; e = e.parentElement) keep(e);
        // (v34, Reconcile 06/11) the table's own scrolling frame is the nearest box that scrolls it, not only its parent (a
        // grid in .pg-scroll inside the page body); its inner box is what shows rows - its scroll bars left out
        let own = null;
        for (let e = table.parentElement; e && e !== scroller; e = e.parentElement)
          if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) || /(auto|scroll)/.test(getComputedStyle(e).overflowX)) { own = e; break; }
        table.scrollIntoView({block: 'start'}); await wait();
        if (own && own.scrollHeight > own.clientHeight + 1) own.scrollTop += 180; else scroller.scrollTop += 180;
        await wait();
        const head = table.querySelector('thead th')?.getBoundingClientRect();
        const frame = own ? (b => ({top: b.top + own.clientTop, left: b.left + own.clientLeft,
          bottom: b.top + own.clientTop + own.clientHeight, right: b.left + own.clientLeft + own.clientWidth}))(own.getBoundingClientRect()) : null;
        const top = Math.max(document.querySelector('#layout-navbar')?.getBoundingClientRect().bottom || 0, head ? head.bottom : 0,
          scroller.getBoundingClientRect().top, frame ? frame.top : 0);
        // (v32) a footer pinned at the bottom (a TOTAL row, sticky) covers the rows under it on purpose, as the pinned head does
        // (v40, Reconcile 07/11) pinned on its cell, its row or the tfoot - the cell moves with whichever of them sticks
        const footCell = table.tFoot && table.tFoot.querySelector('td, th');
        const pinned = footCell && [footCell, footCell.parentElement, table.tFoot].some(e => getComputedStyle(e).position === 'sticky');
        const foot = pinned ? footCell.getBoundingClientRect().top : Infinity;   // the pinned cell, drawn where it sticks
        // (v100, Audit 27/11 through the system-manager repo: at 844 x 340 the page body was the table's scrolling frame too, and its
        // sideways scroll bar, 12 px, was counted as rows not drawn) the page body's bottom is its inner one, its scroll bar left out
        const inner = (bx => bx.top + scroller.clientTop + scroller.clientHeight)(scroller.getBoundingClientRect());
        const bottom = Math.min(innerHeight, inner, frame ? frame.bottom : innerHeight, foot);
        let bad = 0, checked = 0;
        for (const row of table.tBodies[0].rows) {
          const r = row.getBoundingClientRect();
          const left = Math.max(r.left, frame ? frame.left : 0), right = Math.min(r.right, frame ? frame.right : innerWidth, innerWidth);
          const x = (left + Math.min(right, left + 120)) / 2, y = (r.top + r.bottom) / 2;
          if (y < top + 2 || y >= bottom - 2 || right - left < 4) continue;
          checked++;
          if (document.elementFromPoint(x, y)?.closest('tr') !== row) bad++;
        }
        if (bad) errors.push((table.dataset.resizeId || table.id || 'a table') + ': ' + bad + '/' + checked + ' rows in view not drawn');
      }
      for (const [box, [top, left]] of moved) { box.scrollTop = top; box.scrollLeft = left; }
      await wait();
      return errors.length ? errors.join('; ') : true;
    })()`,
  },
  {
    id: 'head-clear',
    rule: 'the rows that scroll under a pinned header are cut at its lower edge - in the page body, in a panel and in a table\'s own scrolling frame (v32, Dashboard: the cut measured by the thead box, which scrolls with the body, stayed 0 and rows read through the clear header)',
    check: `(async () => {
      const wait = () => new Promise(r => setTimeout(r, 150)), out = [];
      for (const table of document.querySelectorAll('#page table')) {
        const th = table.tHead?.querySelector('th'), body = table.tBodies[0];
        if (!th || !body || !table.getClientRects().length || getComputedStyle(th).position !== 'sticky') continue;
        let box = table.parentElement;
        while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight + 1)) box = box.parentElement;
        if (!box) continue;
        const saved = box.scrollTop;
        box.scrollTop = Math.max(0, table.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop) + 200;
        box.dispatchEvent(new Event('scroll')); await wait();
        const under = th.getBoundingClientRect().bottom - body.getBoundingClientRect().top;
        const m = /inset\\((-?[\\d.]+)px/.exec(getComputedStyle(body).clipPath || ''), cut = m ? parseFloat(m[1]) : 0;
        if (under > 2 && cut < under - 2) out.push((table.dataset.resizeId || table.id || 'a table') + ': ' + Math.round(under) + ' px of rows under its head, cut ' + Math.round(cut) + ' px');
        box.scrollTop = saved; box.dispatchEvent(new Event('scroll')); await wait();
      }
      return out.length ? out.join('; ') : true;
    })()`,
  },
  {
    id: 'foot-clear',
    rule: 'the rows passing behind a footer pinned at the bottom (a TOTAL row) are cut at its upper edge, and the vertical scrollbar of the box runs between the pinned header and the pinned footer (--th / --tf on the box) - in any scrolling frame (v33, user 06/11: a row read through the TOTAL row)',
    check: `(async () => {
      const wait = () => new Promise(r => setTimeout(r, 150)), out = [];
      for (const table of document.querySelectorAll('#page table')) {
        const cellOf = g => { const c = g && g.querySelector('th, td'); return c && getComputedStyle(c).position === 'sticky' ? c : null; };
        const th = cellOf(table.tHead), tf = cellOf(table.tFoot), body = table.tBodies[0];
        if (!tf || !body || !table.getClientRects().length) continue;
        let box = table.parentElement;
        // (v77, Dashboard 15/11: a short table in its own sideways frame was judged against the page scroller) the box is the
        // sticky cells' scroll container - the first one up that a person can scroll, overflowing or not; one that does not
        // overflow covers no row
        while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
        if (!box || box.scrollHeight <= box.clientHeight + 1) continue;
        const saved = box.scrollTop;
        box.scrollTop = Math.max(0, table.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop) + 120;
        box.dispatchEvent(new Event('scroll')); await wait();
        const behind = body.getBoundingClientRect().bottom - tf.getBoundingClientRect().top;
        // (v86, Dashboard: a 121 px cut read as 0) the browser writes inset() short, as CSS does - inset(121px 0px 121px)
        // comes back inset(121px 0px) - so read one to four values: the bottom is the third, else the first
        const m = /inset\\(\\s*(-?[\\d.]+)px(?:\\s+(-?[\\d.]+)px)?(?:\\s+(-?[\\d.]+)px)?/.exec(getComputedStyle(body).clipPath || ''), cut = m ? parseFloat(m[3] ?? m[1]) : 0;
        if (behind > 2 && cut < behind - 2) out.push((table.dataset.resizeId || 'a table') + ': ' + Math.round(behind) + ' px of rows behind its pinned footer, cut ' + Math.round(cut) + ' px');
        const st = getComputedStyle(box), want = [th ? Math.round(th.getBoundingClientRect().height) : 0, Math.round(tf.getBoundingClientRect().height)];
        const have = [parseFloat(st.getPropertyValue('--th')) || 0, parseFloat(st.getPropertyValue('--tf')) || 0];
        if (!box.classList.contains('table-scroller') || Math.abs(have[0] - want[0]) > 1 || Math.abs(have[1] - want[1]) > 1)
          out.push((table.dataset.resizeId || 'a table') + ': the scrollbar does not run between header and footer (--th/--tf ' + have.join('/') + ', want ' + want.join('/') + ')');
        box.scrollTop = saved; box.dispatchEvent(new Event('scroll')); await wait();
      }
      return out.length ? out.join('; ') : true;
  })()`,
  },
  // (v75, the user 15/11: a setting of the person changed and nothing changed - the frame kept it, a report never read it; a
  // check run only at the setting as it stood could never see it) every choice of the person's number format is saved through
  // the frame's own path, the frame reads it back, and every number cell of the page's report tables must follow it; the
  // person's setting is put back after
  {
    id: 'num-format-works',
    rule: 'the person\'s number format works for real: each choice (money unit, money decimals, money rounding, count decimals, % decimals, separators, negatives) is saved as Settings saves it, and every number cell of a report table (td[data-rp-num][data-rp-raw]; a count whole by rule - people - carries data-rp-whole and keeps no decimals) shows the number in that choice within 15 s - a choice that changes nothing on the page is a fault; the setting is put back after',
    check: `(async () => {
      const cells = () => [...document.querySelectorAll('td[data-rp-num][data-rp-raw]')].filter(c => c.getClientRects().length && !c.closest('[data-rp-id]'));
      // a cell that reads as a report number (groups of thousands, a unit of money, a %) but is tied to no format is a number the
      // setting never reaches: named as such, never skipped (a page of such tables read as a page with nothing to change)
      const looks = /^\\(?-?\\d{1,3}([.,\\s]\\d{3})+([.,]\\d+)?([KMB]| (N|tr|tỷ))?\\)?$|^\\(?-?\\d+([.,]\\d+)?([KMB]| (N|tr|tỷ))\\)?$|^\\(?-?\\d+([.,]\\d+)? ?%\\)?$/;
      const loose = [...document.querySelectorAll('#page table tbody td, #page table tfoot td')].filter(c => !c.dataset.rpNum && !c.closest('[data-rp-id], dialog')
        && c.children.length === 0 && c.getClientRects().length && looks.test((c.textContent || '').replace(/\\s+/g, ' ').trim()));
      if (loose.length) return loose.length + ' number cell(s) of a table are tied to no format (no data-rp-num / data-rp-raw), so the person\\'s number setting never reaches them: ' + loose.slice(0, 3).map(c => c.textContent.trim()).join(', ');
      if (!cells().length) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const words = document.documentElement.lang === 'en' ? {k: 'K', m: 'M', bn: 'B'} : {k: ' N', m: ' tr', bn: ' tỷ'};
      // the same steps as the frame's fmtNum and the report rule rp-num-format
      // (v81, shell 1.33.6, the user 18/11) an amount under the chosen unit steps down to the unit it fills; the bracket form keeps its minus
      const fmt = (f, raw, kind, whole = false, col = '') => {
        const negative = raw < 0, abs = Math.abs(raw); let value = abs, dp = 0, suffix = '';
        if (kind === 'pct') { value = abs * 100; dp = f.pct_dp; suffix = '%'; }
        else if (kind === 'count') dp = whole ? 0 : f.count_dp;
        else { const below = {bn: 'm', m: 'k', k: 'vnd'}, size = {bn: 1e9, m: 1e6, k: 1e3};
          // (v33, Dashboard 20/11, its Cons_Gate_102 §10: one unit for a whole money column) a cell naming its column's unit
          // (data-rp-unit = bn | m | k) stands in it under 'auto', never stepping down (-770000 in m = -0,8 tr); a unit the person chose wins
          let unit = f.money_unit === 'auto' ? (size[col] ? col : abs >= 1e9 ? 'bn' : abs >= 1e6 ? 'm' : 'vnd') : f.money_unit;
          if (f.money_unit === 'auto' && size[col]) { value = abs / size[col]; dp = f.money_dp; suffix = words[col]; unit = null; }
          while (unit && abs > 0 && unit !== 'vnd' && abs < size[unit]) unit = below[unit];
          if (unit === 'vnd') { value = Math.round(abs / f.money_round) * f.money_round; dp = 0; }
          else if (unit) { value = abs / size[unit]; dp = f.money_dp; suffix = words[unit]; } }
        const fixed = value.toFixed(dp), [int, frac] = fixed.split('.');
        const group = f.sep === 'comma' ? ',' : f.sep === 'space' ? ' ' : '.', point = f.sep === 'comma' ? '.' : ',';
        const body = int.replace(/\\B(?=(\\d{3})+(?!\\d))/g, group) + (frac ? point + frac : '') + suffix;
        return negative && Number(fixed) !== 0 ? (f.neg === 'paren' ? '(-' + body + ')' : '-' + body) : body;
      };
      const base = {money_unit: 'auto', money_dp: 1, money_round: 1, count_dp: 0, sep: 'dot', pct_dp: 1, neg: 'minus'};
      // saved as Settings saves it; the frame reads the person again when the window takes the focus
      // the person's settings are saved and read with a clean fetch (a blank frame of the same origin): an app may wrap the page's
      // fetch and send /api/ calls that are not the frame's to its own server
      const pane = document.createElement('iframe'); pane.style.display = 'none'; document.body.append(pane);
      const cf = (u, o) => pane.contentWindow.fetch(location.origin + u, o);
      const save = async v => { const r = await cf('/api/auth/ui', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({num_format: v})});
        dispatchEvent(new Event('focus')); return r.ok; };
      let before = null;
      try { before = (await (await cf('/api/auth/me', {credentials: 'same-origin'})).json())?.ui?.num_format ?? null; } catch { /* read below */ }
      let start = base; try { start = {...base, ...JSON.parse(before || '{}')}; } catch { /* the default */ }
      const kinds = new Set(cells().map(c => c.dataset.rpNum));
      const tries = [];
      if (kinds.has('money')) tries.push({money_unit: 'vnd', money_round: 1000}, {money_unit: 'k', money_dp: 3}, {money_unit: 'm', money_dp: 0}, {money_unit: 'bn', money_dp: 2});
      if (kinds.has('count')) tries.push({count_dp: start.count_dp === 2 ? 0 : 2});
      if (kinds.has('pct')) tries.push({pct_dp: start.pct_dp === 2 ? 0 : 2});
      tries.push({sep: start.sep === 'comma' ? 'space' : 'comma', count_dp: 1, pct_dp: 1}, {neg: 'paren'});
      for (const c of cells().slice(0, 40)) {
        const shown = (c.textContent || '').replace(/\\s+/g, ' ').trim(), want = fmt(start, Number(c.dataset.rpRaw), c.dataset.rpNum, 'rpWhole' in c.dataset, c.dataset.rpUnit || '');
        if (shown !== want) return 'a number cell does not show its own value in the format the person has now: it shows ' + shown + ', its value ' + c.dataset.rpRaw + ' as ' + c.dataset.rpNum + ' reads ' + want + ' (a % is a share: 0.125 = 12,5 %)';
      }
      let fault = null;
      try {
        for (const t of tries) {
          const f = {...start, ...t}, said = JSON.stringify(t).replace(/[{}"]/g, '');
          if (!(await save(JSON.stringify(f)))) { fault = 'the number setting ' + said + ' could not be saved'; break; }
          let bad = null;
          for (let ms = 0; ms <= 15000; ms += 300) {
            await wait(300);
            bad = null;
            for (const c of cells().slice(0, 40)) {
              const shown = (c.textContent || '').replace(/\\s+/g, ' ').trim(), want = fmt(f, Number(c.dataset.rpRaw), c.dataset.rpNum, 'rpWhole' in c.dataset, c.dataset.rpUnit || '');
              if (shown !== want) { bad = shown + ' (want ' + want + ')'; break; }
            }
            if (!bad) break;
          }
          if (bad) { fault = 'the number setting ' + said + ' changed nothing it should on the page: a cell shows ' + bad; break; }
        }
      } finally {
        await save(before && before.trim() ? before : JSON.stringify(start));
        await wait(800);
        pane.remove();
      }
      return fault || true;
    })()`,
  },
  // (v75, the user 15/11: every setting works for real and is checked for real) the person's date format is saved through the
  // frame's own path and every date in a table of the page must turn with it (dd/mm/yyyy - mm/dd/yyyy); put back after
  {
    id: 'date-format-works',
    rule: 'the person\'s date format works for real: saved as Settings saves it (vn dd/mm/yyyy, us mm/dd/yyyy), every date shown in a table of the page turns to it within 15 s; the frame names it on <html data-date-format> for a page without React (sasinShell.fmtDate); the setting is put back after',
    check: `(async () => {
      const re = /^(\\d{2})\\/(\\d{2})\\/(\\d{4})(.*)$/;
      const dates = () => [...document.querySelectorAll('#page table tbody td, #page table tfoot td')].filter(c => c.getClientRects().length && !c.closest('dialog') && re.test((c.textContent || '').trim()));
      const first = dates().slice(0, 30).map(c => [c, (c.textContent || '').trim()]);
      if (!first.length) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      // the person's settings are saved and read with a clean fetch (a blank frame of the same origin): an app may wrap the page's
      // fetch and send /api/ calls that are not the frame's to its own server
      const pane = document.createElement('iframe'); pane.style.display = 'none'; document.body.append(pane);
      const cf = (u, o) => pane.contentWindow.fetch(location.origin + u, o);
      const save = async v => { const r = await cf('/api/auth/ui', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({date_format: v})});
        dispatchEvent(new Event('focus')); return r.ok; };
      let before = 'vn';
      try { before = (await (await cf('/api/auth/me', {credentials: 'same-origin'})).json())?.ui?.date_format === 'us' ? 'us' : 'vn'; } catch { /* vn */ }
      if (document.documentElement.dataset.dateFormat !== before) return 'the frame does not name the date format of the person on <html data-date-format> (' + (document.documentElement.dataset.dateFormat || 'none') + ', the person has ' + before + ')';
      const other = before === 'us' ? 'vn' : 'us';
      let fault = null;
      try {
        if (!(await save(other))) return 'the date format could not be saved';
        // the same cells, their day and month changed places (a cell drawn anew is found again by its row and column)
        const spot = c => { const tr = c.closest('tr'); return [tr ? [...tr.parentElement.children].indexOf(tr) : -1, c.cellIndex, tr?.parentElement?.tagName]; };
        const want = first.map(([c, text]) => { const m = re.exec(text); return [spot(c), m[2] + '/' + m[1] + '/' + m[3] + m[4]]; }).filter(([, w], i) => w !== first[i][1]);
        if (!want.length) return true;
        let bad = null;
        for (let ms = 0; ms <= 15000; ms += 300) {
          await wait(300);
          bad = null;
          for (const [[row, col, part], w] of want) {
            const body = [...document.querySelectorAll('#page table ' + (part || 'TBODY').toLowerCase())].find(b => b.children[row]?.children[col] && re.test((b.children[row].children[col].textContent || '').trim()));
            const now = (body?.children[row]?.children[col]?.textContent || '').trim();
            if (now !== w) { bad = now + ' (want ' + w + ')'; break; }
          }
          if (!bad) break;
        }
        if (bad) fault = 'the date format ' + other + ' changed nothing it should on the page: a date shows ' + bad;
      } finally {
        await save(before);
        await wait(800);
        pane.remove();
      }
      return fault || true;
    })()`,
  },
  // (v76, 15/11: in Reconcile every frame setting was dead - the app's fetch wrapper sent the frame's /api/auth/ui to the app's
  // own server, 405, and the frame put the old choice back) the frame's own Settings, used as a person uses it, must keep the
  // choice: the date format and a number choice are pressed in the dialog and still stand 3 s later, with no error; put back after
  {
    id: 'settings-save-works',
    rule: 'the frame\'s Settings keeps what the person chooses, in every app: Settings > Date format and Settings > Numbers pressed as a person presses them still stand 3 s later on <html data-date-format> / <html data-num-format>, with no error shown - an app that reroutes or blocks the frame\'s own calls (/api/auth/*) makes every setting dead; put back after',
    check: `(async () => {
      const opener = document.getElementById('header-settings');
      if (!opener) return true;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const html = document.documentElement.dataset;
      const errors = () => [...document.querySelectorAll('.toast, [role=alert]')].filter(t => t.getClientRects().length).map(t => (t.textContent || '').trim()).filter(Boolean);
      const seen = new Set(errors());
      opener.click();
      for (let t = 0; t < 30 && !document.getElementById('settingsDlg'); t++) await wait(100);
      if (!document.getElementById('settingsDlg')) return 'Settings did not open from #header-settings';
      const press = id => document.querySelector('#settingsDlg label[for="' + id + '"]')?.click();
      const tab = k => document.getElementById('set-tab-' + k)?.click();
      let fault = null;
      try {
        // the date format
        const d0 = html.dateFormat === 'us' ? 'us' : 'vn', d1 = d0 === 'us' ? 'vn' : 'us';
        tab('look'); await wait(400);
        if (!document.querySelector('#settingsDlg label[for="date-' + d1 + '"]')) fault = 'Settings has no date format choice';
        else {
          press('date-' + d1); await wait(3000);
          const fresh = errors().filter(e => !seen.has(e));
          if (html.dateFormat !== d1) fault = 'Settings > Date format ' + d1 + ' did not hold: <html data-date-format> is ' + (html.dateFormat || 'none') + (fresh.length ? ' - the frame said: ' + fresh.join(' | ').slice(0, 120) : '');
          press('date-' + d0); await wait(1200);
        }
        // a number choice
        if (!fault) {
          tab('numbers'); await wait(400);
          let n0 = 'dot'; try { n0 = JSON.parse(html.numFormat || '{}').sep || 'dot'; } catch { /* dot */ }
          const n1 = n0 === 'comma' ? 'dot' : 'comma';
          if (document.querySelector('#settingsDlg label[for="nf-sep-' + n1 + '"]')) {
            press('nf-sep-' + n1); await wait(3000);
            let now = ''; try { now = JSON.parse(html.numFormat || '{}').sep; } catch { /* none */ }
            const fresh = errors().filter(e => !seen.has(e));
            if (now !== n1) fault = 'Settings > Numbers separator ' + n1 + ' did not hold: <html data-num-format> sep is ' + (now || 'none') + (fresh.length ? ' - the frame said: ' + fresh.join(' | ').slice(0, 120) : '');
            press('nf-sep-' + n0); await wait(1200);
          }
        }
      } finally {
        document.querySelector('#settingsDlg .btn-close')?.click();
        await wait(500);
      }
      return fault || true;
    })()`,
  },
];
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()) && process.argv.includes('--list')) {
  for (const r of [...RULES, ...DIALOG_RULES]) console.log(`${r.id.padEnd(12)} ${r.rule}`);
}
