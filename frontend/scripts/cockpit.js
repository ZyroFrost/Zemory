
  const el = (s) => document.getElementById(s);
  // Single quote included: server ids get interpolated into single-quoted inline
  // handlers (openSession('…')) — an id with ' broke out of the JS string (audit
  // 2026-07-21; ids can arrive from other machines via Drive bundles).
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let last = null, memory = null, checks = {}, curRoot = '', typer = null, selectedHit = null, lastHits = [], sortMode = 'rel';
  const layoutKey = 'zemory.ui.layout.v2';
  const layoutDefaults = { railW: '244px', inspectorW: '366px', bottomH: '210px', recallLeft: '64%', gmRightW: '980px' };
  // The Global Memory ② seam drives --gm-right-w; every other use of the same
  // physical handle drives --inspector-w (user 2026-07-21: the seam looked draggable
  // but the column was a fixed 2fr, so nothing ever moved).
  const memPane = () => document.body.dataset.tab === 'global' && document.body.dataset.gtab === 'mem';

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  // Layout is persisted SERVER-SIDE (~/.zemory/config.json) so a reopen restores
  // it exactly — localStorage is keyed by origin and the UI binds a random
  // port every launch, which is why drags used to reset. localStorage is kept as
  // a same-port fast cache; the server is the durable source of truth.
  let layoutCache = null;
  function readLayout(){
    if(layoutCache) return layoutCache;
    try { layoutCache = JSON.parse(localStorage.getItem(layoutKey) || '{}') || {}; }
    catch(e){ layoutCache = {}; }
    return layoutCache;
  }
  function writeLayout(patch){
    const next = readLayout();
    Object.keys(patch).forEach(k => patch[k] == null ? delete next[k] : next[k] = patch[k]);
    layoutCache = next;
    try { localStorage.setItem(layoutKey, JSON.stringify(next)); } catch(e){}
    try { fetch('/set-ui-state?state=' + encodeURIComponent(JSON.stringify(next)), { method: 'POST' }); } catch(e){}
  }
  async function loadLayoutFromServer(){
    try {
      const s = await (await fetch('/ui-state')).json();
      if(s && s.layout && Object.keys(s.layout).length){
        layoutCache = s.layout;
        try { localStorage.setItem(layoutKey, JSON.stringify(s.layout)); } catch(e){}
        applyStoredLayout();
        applyStoredGrows();
      }
    } catch(e){}
  }
  function setLayoutVar(name, value){
    document.documentElement.style.setProperty(name, value);
  }
  function applyStoredLayout(){
    const l = readLayout();
    if(l.railW) setLayoutVar('--rail-w', l.railW);
    if(l.inspectorW) setLayoutVar('--inspector-w', l.inspectorW);
    if(l.gmRightW) setLayoutVar('--gm-right-w', l.gmRightW);
    if(l.bottomH) setLayoutVar('--bottom-h', l.bottomH);
    if(l.recallLeft) setLayoutVar('--recall-left', l.recallLeft);
  }
  function resetResize(type){
    const patch = {};
    if(type === 'rail') { setLayoutVar('--rail-w', layoutDefaults.railW); patch.railW = null; }
    if(type === 'inspector' && memPane()) { setLayoutVar('--gm-right-w', layoutDefaults.gmRightW); patch.gmRightW = null; }
    else if(type === 'inspector') { setLayoutVar('--inspector-w', layoutDefaults.inspectorW); patch.inspectorW = null; }
    if(type === 'bottom') { setLayoutVar('--bottom-h', layoutDefaults.bottomH); patch.bottomH = null; }
    if(type === 'recall') { setLayoutVar('--recall-left', layoutDefaults.recallLeft); patch.recallLeft = null; }
    writeLayout(patch);
  }
  function applyStoredGrows(){
    const g = (readLayout().grows) || {};
    document.querySelectorAll('[data-grow]').forEach(p => {
      const v = g[p.dataset.grow];
      if(v != null) p.style.flexGrow = v;
    });
  }
  function initPanelSplits(){
    document.querySelectorAll('.panel-split').forEach(h => {
      let drag = null;
      h.addEventListener('pointerdown', e => {
        if(window.matchMedia('(max-width: 760px)').matches) return;
        const prev = h.previousElementSibling, next = h.nextElementSibling;
        if(!prev || !next) return;
        const pH = prev.getBoundingClientRect().height, nH = next.getBoundingClientRect().height;
        const pG = parseFloat(getComputedStyle(prev).flexGrow) || 1;
        const nG = parseFloat(getComputedStyle(next).flexGrow) || 1;
        drag = { prev, next, startY: e.clientY, pH, nH, totalH: pH + nH, totalG: pG + nG };
        try { h.setPointerCapture(e.pointerId); } catch(_){}
        h.classList.add('active');
        document.body.classList.add('resizing', 'resizing-row');
        e.preventDefault();
      });
      h.addEventListener('pointermove', e => {
        if(!drag) return;
        const min = 70;
        const npH = clamp(drag.pH + (e.clientY - drag.startY), min, drag.totalH - min);
        const pg = drag.totalG * (npH / drag.totalH);
        drag.prev.style.flexGrow = pg.toFixed(3);
        drag.next.style.flexGrow = (drag.totalG - pg).toFixed(3);
        e.preventDefault();
      });
      const end = () => {
        if(!drag) return;
        const g = (readLayout().grows) || {};
        if(drag.prev.dataset.grow) g[drag.prev.dataset.grow] = drag.prev.style.flexGrow;
        if(drag.next.dataset.grow) g[drag.next.dataset.grow] = drag.next.style.flexGrow;
        writeLayout({ grows: g });
        h.classList.remove('active');
        document.body.classList.remove('resizing', 'resizing-row');
        drag = null;
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      h.addEventListener('dblclick', () => {
        const prev = h.previousElementSibling, next = h.nextElementSibling, g = (readLayout().grows) || {};
        [prev, next].forEach(p => { if(p && p.dataset.growDefault){ p.style.flexGrow = p.dataset.growDefault; delete g[p.dataset.grow]; } });
        writeLayout({ grows: g });
      });
    });
  }
  function initResizers(){
    const handles = Array.from(document.querySelectorAll('.resize-handle:not(.panel-split)'));
    let active = null;
    const cssNum = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const canResize = (type) => {
      if(window.matchMedia('(max-width: 760px)').matches) return false;
      if((type === 'rail' || type === 'inspector') && window.matchMedia('(max-width: 1180px)').matches) return false;
      return true;
    };
    const update = (type, clientX, clientY, base) => {
      let out = null;
      if(type === 'rail') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        const px = Math.round(clamp(clientX - r.left - 10, 150, 340));
        setLayoutVar('--rail-w', px + 'px');
        out = { railW: px + 'px' };
      }
      if(type === 'inspector') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        if(memPane()){
          // Two panels live on this side, so it needs a far wider range than the
          // single-panel seam; leave at least 320px for Bộ nhớ on the left.
          const px = Math.round(clamp(r.right - clientX - 10, 420, Math.max(440, r.width - 320)));
          setLayoutVar('--gm-right-w', px + 'px');
          out = { gmRightW: px + 'px' };
        } else {
          const px = Math.round(clamp(r.right - clientX - 10, 230, 460));
          setLayoutVar('--inspector-w', px + 'px');
          out = { inspectorW: px + 'px' };
        }
      }
      if(type === 'recall') {
        const r = document.querySelector('.recall-workbench').getBoundingClientRect();
        const pct = clamp(((clientX - r.left) / Math.max(1, r.width)) * 100, 36, 76);
        const val = pct.toFixed(1) + '%';
        setLayoutVar('--recall-left', val);
        out = { recallLeft: val };
      }
      if(type === 'bottom') {
        const ws = document.querySelector('.workspace').getBoundingClientRect();
        const max = Math.max(150, Math.round(ws.height * .46));
        const px = Math.round(clamp(base.bottomStart - (clientY - base.startY), 112, max));
        setLayoutVar('--bottom-h', px + 'px');
        out = { bottomH: px + 'px' };
      }
      if(out) active.pending = out;
    };
    const stop = () => {
      if(!active) return;
      if(active.pending) writeLayout(active.pending);
      try { active.handle.releasePointerCapture(active.pointerId); } catch(e){}
      active.handle.classList.remove('active');
      document.body.classList.remove('resizing', 'resizing-col', 'resizing-row');
      active = null;
    };
    window.addEventListener('pointermove', e => {
      if(!active) return;
      e.preventDefault();
      update(active.type, e.clientX, e.clientY, active);
    });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    handles.forEach(handle => {
      const type = handle.dataset.resize;
      handle.addEventListener('pointerdown', e => {
        if(!canResize(type)) return;
        const bottom = document.querySelector('.grid-bottom');
        active = {
          type,
          handle,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          bottomStart: bottom ? bottom.getBoundingClientRect().height : cssNum('--bottom-h', 210),
          pending: null,
        };
        try { handle.setPointerCapture(e.pointerId); } catch(e){}
        handle.classList.add('active');
        document.body.classList.add('resizing', handle.classList.contains('horizontal') ? 'resizing-row' : 'resizing-col');
        e.preventDefault();
      });
      handle.addEventListener('dblclick', () => resetResize(type));
      handle.addEventListener('keydown', e => {
        if(!canResize(type)) return;
        const big = e.shiftKey ? 32 : 16;
        const layout = readLayout();
        const setAndSave = (name, value) => { setLayoutVar(name, value); writeLayout(name === '--rail-w' ? {railW:value} : name === '--inspector-w' ? {inspectorW:value} : name === '--gm-right-w' ? {gmRightW:value} : name === '--bottom-h' ? {bottomH:value} : {recallLeft:value}); };
        if(type === 'rail' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.railW || getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 205;
          setAndSave('--rail-w', Math.round(clamp(cur + (e.key === 'ArrowRight' ? big : -big), 150, 340)) + 'px');
        }
        if(type === 'inspector' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          if(memPane()){
            const shell = document.querySelector('.shell').getBoundingClientRect();
            const cur = parseFloat(layout.gmRightW || getComputedStyle(document.documentElement).getPropertyValue('--gm-right-w')) || 980;
            setAndSave('--gm-right-w', Math.round(clamp(cur + (e.key === 'ArrowLeft' ? big : -big), 420, Math.max(440, shell.width - 320))) + 'px');
          } else {
            const cur = parseFloat(layout.inspectorW || getComputedStyle(document.documentElement).getPropertyValue('--inspector-w')) || 295;
            setAndSave('--inspector-w', Math.round(clamp(cur + (e.key === 'ArrowLeft' ? big : -big), 230, 460)) + 'px');
          }
        }
        if(type === 'bottom' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const cur = parseFloat(layout.bottomH || getComputedStyle(document.documentElement).getPropertyValue('--bottom-h')) || 210;
          setAndSave('--bottom-h', Math.round(clamp(cur + (e.key === 'ArrowUp' ? big : -big), 112, 380)) + 'px');
        }
        if(type === 'recall' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.recallLeft || getComputedStyle(document.documentElement).getPropertyValue('--recall-left')) || 64;
          setAndSave('--recall-left', clamp(cur + (e.key === 'ArrowRight' ? 3 : -3), 36, 76).toFixed(1) + '%');
        }
      });
    });
  }
  applyStoredLayout();
  applyStoredGrows();

  function ru(extra){
    const p = new URLSearchParams();
    if(curRoot) p.set('root', curRoot);
    if(extra) Object.keys(extra).forEach(k => p.set(k, extra[k]));
    const s = p.toString();
    return s ? ('?' + s) : '';
  }
  function fmtN(n){ return Number(n || 0).toLocaleString(); }
  function fmtBytes(kb){
    const n = Number(kb || 0);
    if(!n) return '0 KB';
    if(n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' GB';
    if(n > 1024) return (n / 1024).toFixed(0) + ' MB';
    return n + ' KB';
  }
  function fmtDay(d){ return d ? String(d).slice(0, 10) : '-'; }
  function fmtTime(d){ return d ? new Date(d).toLocaleTimeString() : '-'; }
  // Full date+time for "last activity" stamps: a bare time-of-day was meaningless
  // on projects last touched weeks ago (user 2026-07-21).
  function fmtDateTime(d){
    if(!d) return '-';
    const x = new Date(d);
    if(isNaN(x)) return '-';
    const p = (n) => String(n).padStart(2, '0');
    return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()) + ' ' + p(x.getHours()) + ':' + p(x.getMinutes());
  }
  function clip(s, n){ s = String(s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '...' : s; }
  function projName(p){ return String(p || '').split(/[\\/]/).filter(Boolean).pop() || '(unknown)'; }
  function statusClass(state){ return state === 'on' ? 'on' : state === 'warn' ? 'warn' : state === 'off' ? 'off' : ''; }
  function chip(text, state){ return '<span class="chip ' + statusClass(state) + '">' + esc(text) + '</span>'; }
  function badge(text, state){ return '<span class="badge ' + statusClass(state) + '">' + esc(text) + '</span>'; }
  function escapeRegExp(t){
    const specials = ['\\','^','$','.','|','?','*','+','(',')','[',']','{','}'];
    let out = '';
    for (const ch of String(t)) out += specials.includes(ch) ? '\\' + ch : ch;
    return out;
  }
  function queryTerms(){ return el('bq').value.toLowerCase().split(/\s+/).filter(t => t.length >= 2); }
  function highlight(raw, terms){
    let s = esc(raw);
    for (const t of terms) s = s.replace(new RegExp('(' + escapeRegExp(t) + ')', 'gi'), '<mark>$1</mark>');
    return s;
  }
  function scoreValue(h, index){
    const n = Number(h.score || h.rank || h.similarity || 0);
    if(n > 0 && n <= 1) return n.toFixed(2);
    if(n > 1) return Math.min(0.99, n / 100).toFixed(2);
    return (0.89 - Math.min(index, 7) * 0.04).toFixed(2);
  }
  function bar(state) {
    if (state === 'checking') return '<div class="bar"><i class="ind" style="background:var(--amber)"></i></div>';
    const filled = state === 'on' || state === 'off' || state === 'warn';
    const col = state === 'on' ? 'var(--green)' : state === 'off' ? 'var(--red)' : state === 'warn' ? 'var(--amber)' : 'var(--wash-3)';
    return '<div class="bar"><i style="width:' + (filled ? '100%' : '0%') + ';background:' + col + '"></i></div>';
  }
  function row(name, state, detail, help) {
    const q = help ? '<span class="q" title="' + esc(help) + '">?</span>' : '';
    return '<div class="row2"><div class="row2-top"><span class="name">' + esc(name) + '</span>'
      + '<span style="flex:1 1 auto"></span>' + q + '</div>'
      + bar(state)
      + '<div class="d2">' + esc(detail) + '</div></div>';
  }
  function miniRow(a, b){ return '<div class="mini-row"><b>' + esc(a) + '</b><span class="muted">' + b + '</span></div>'; }
  // One stat card. Every headline number in a panel uses this, so cards never
  // drift into a second visual shape (mini-row) for the same class of fact.
  function statCard(value, label, tip){
    return '<div class="coverage-stat"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>'
      + '<b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }
  // Per-source breakdown that used to sit in the BẢNG list (e.g. sessions =
  // "chatgpt-web:859 claude-code:191 …"); it rides along as the card's tooltip
  // so promoting the counts to cards loses nothing.
  function tableDetail(info, name){
    const row = ((info && info.tables) || []).find(r => r.name === name);
    return (row && row.detail) || '';
  }
  function folderLine(label, path, meta){
    return '<div class="folder-item"><div class="mini-row"><b title="' + esc(path) + '">' + esc(label) + '</b><span class="muted">' + esc(meta || '') + '</span></div>' +
      '<div class="path">' + esc(path || '(unknown)') + '</div></div>';
  }
  function sectionTitle(text){
    return '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:10px 0 4px">' + esc(text) + '</div>';
  }
  function projOpts(){
    const cur = curRoot || (last && last.project && last.project.root) || '';
    const conn = last && last.project && last.project.connected;
    const seen = new Set();
    let o = '';
    (last && last.knownProjects || []).forEach(p => {
      seen.add(p.root);
      o += '<option value="' + esc(p.root) + '"' + (p.root === cur ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    });
    if(cur && !seen.has(cur)){
      const nm = ((last && last.project && last.project.name) || cur) + (conn ? '' : ' (not set up)');
      o = '<option value="' + esc(cur) + '" selected>' + esc(nm) + '</option>' + o;
    }
    return o || '<option value="">(none)</option>';
  }
  // Per-project view cache: re-opening a tab paints from memory INSTANTLY and
  // only refetches when stale. Before this, every tab click refetched /status
  // and re-ran the capability suite — that was the tab lag (user, 2026-07-20).
  const projCache = {};              // root -> { status, checks, at }
  const PROJ_STALE_MS = 60000;
  function cacheProject(){
    const root = curRoot || (last && last.project && last.project.root) || '';
    if(!root || !last) return;
    projCache[root] = { status: last, checks: Object.assign({}, checks), at: Date.now() };
  }
  /** Show a project from cache if we have it; return true when nothing to fetch. */
  function paintFromCache(root){
    const c = projCache[root];
    if(!c) return false;
    last = c.status;
    checks = Object.assign({}, c.checks);
    checksFor = root;
    renderStatus();
    return Date.now() - c.at < PROJ_STALE_MS;
  }
  function pick(){
    curRoot = el('proj').value;
    const fresh = paintFromCache(curRoot);
    renderTabs();
    if(document.body.dataset.ptab === 'graph'){ renderFolderTree(true); renderGraph(true); }  // project changed
    if(!fresh){ checks = {}; checksFor = null; tick().then(() => { runChecks(); cacheProject(); }); }
  }

  // ── Tab shell (plan 14 §4) ────────────────────────────────────────────────
  // GLOBAL MEMORY = machine-wide memory. Each project gets its own tab carrying
  // that project's harness (and later its graph). The tabs DRIVE the existing
  // #proj <select>, which stays the source of truth — no handler had to change.
  function setTab(which, root){
    if(root && root !== el('proj').value){ el('proj').value = root; pick(); return; }
    document.body.dataset.tab = which;
    try { localStorage.setItem('zemory.tab', which); } catch(e){}
    if(which === 'global') renderStandard();   // Chuẩn chung sits in sub-tab ①
    renderTabs();
  }
  // Buttons carry data-act/data-root and ONE delegated listener handles them —
  // no inline onclick, so no quote-escaping inside this generated markup.
  // How many UNPINNED projects stay on the bar; the rest move into the "…" menu.
  // The registry used to collect every folder an agent ever touched (test scratch
  // dirs included) and the overflowing bar made the whole UI lag.
  const TAB_RECENT = 5;
  function projectList(){
    const known = (last && last.knownProjects) || [];
    const cur = el('proj') ? el('proj').value : '';
    const out = known.map(p => ({ root: p.root, name: p.name, pinned: !!p.pinned }));
    if(cur && !out.some(p => p.root === cur)){
      const nm = (last && last.project && last.project.name) || cur;
      out.unshift({ root: cur, name: nm, pinned: false });
    }
    return out;
  }
  function splitTabs(){
    const all = projectList();
    const cur = el('proj') ? el('proj').value : '';
    const shown = [], hidden = [];
    let recent = 0;
    all.forEach(p => {
      if(p.pinned || p.root === cur) shown.push(p);
      else if(recent < TAB_RECENT){ recent++; shown.push(p); }
      else hidden.push(p);
    });
    return { shown: shown, hidden: hidden, all: all };
  }
  function renderTabs(){
    const bar = el('tabbar'); if(!bar) return;
    const active = document.body.dataset.tab || 'global';
    const cur = el('proj') ? el('proj').value : '';
    const split = splitTabs();
    // Translate inline with t() — do NOT call applyLang() from here. applyLang()
    // re-renders every JS-built view (renderStatus), and renderStatus() calls
    // renderTabs(), which closed a render cycle: one click recursed ~6400 DOM
    // rebuilds until the stack overflowed and a catch swallowed it. That was the
    // real UI lag (user, 2026-07-20) — not the DB, not the registry.
    // Two zones: a SCROLLING strip of tabs, and a PINNED action cluster on the
    // right (manage · theme · settings) that never scrolls out of view — ⚙ must
    // stay reachable top-right no matter how many project tabs are open.
    let strip = '<button class="tab tab-global" role="tab" data-act="global" aria-selected="' +
            (active === 'global') + '">🧠 <span>' + esc(t('tab.global')) + '</span>' +
            // Hidden-run sync indicator: the job lives in the daemon; this tab
            // spins while it runs so other tabs stay browsable (user 2026-07-21).
            (window.__syncing ? '<span class="tab-syncspin" title="' + esc(t('sy.syncingShort')) + '">⟳</span>' : '') +
            '</button>' +
            // Chuẩn chung has no top tab any more — it sits inside Global Memory
            // sub-tab ① next to recall (user 2026-07-21).
            '<span class="tab-sep"></span>';
    split.shown.forEach(p => {
      const on = active === 'project' && p.root === cur;
      strip += '<button class="tab" role="tab" data-act="open" data-root="' + esc(p.root) +
           '" aria-selected="' + on + '" title="' + esc(p.root) + '">' +
           (p.pinned ? '<span class="tab-pin">📌</span>' : '') + esc(p.name) + '</button>';
    });
    strip += '<button class="tab" data-act="add" title="' + esc(t('tab.addTitle')) + '">＋</button>';
    // The top project-MANAGEMENT menu (☰ / … overflow) is gone — it duplicated
    // the Projects tab list (user 2026-07-21). Tabs = quick nav to recent; the
    // Projects tab (grouped by machine) is the full list. Only theme + settings
    // stay in the pinned action cluster.
    const actions =
         '<button class="tab" data-act="theme" title="' + esc(t('tab.themeTitle')) + '">◐</button>' +
         '<button class="tab" data-act="settings" title="' + esc(t('tt.settings')) + '">⚙</button>';
    bar.innerHTML = '<div class="tab-strip">' + strip + '</div><div class="tab-actions">' + actions + '</div>';
    if(el('tabMenu') && el('tabMenu').classList.contains('on')) renderTabMenu();
  }
  // "…" / "☰" open the same panel: every known project with pin + remove, so a
  // project can always be reached AND dropped without hunting through the bar.
  function renderTabMenu(){
    const box = el('tabMenu'); if(!box) return;
    const list = projectList();
    const cur = el('proj') ? el('proj').value : '';
    let h = '<div class="tabmenu-head">' + esc(t('tab.menuHead')) + '</div>';
    if(!list.length) h += '<div class="tabmenu-empty">' + esc(t('tab.none')) + '</div>';
    list.forEach(p => {
      h += '<div class="tabmenu-row' + (p.root === cur ? ' cur' : '') + '">' +
        '<button class="tabmenu-open" data-mact="open" data-root="' + esc(p.root) + '" title="' + esc(p.root) + '">' +
          '<b>' + esc(p.name) + '</b><small>' + esc(p.root) + '</small></button>' +
        '<button class="tabmenu-btn' + (p.pinned ? ' on' : '') + '" data-mact="pin" data-root="' + esc(p.root) +
          '" data-on="' + (p.pinned ? '0' : '1') + '" title="' + esc(t(p.pinned ? 'tab.unpin' : 'tab.pin')) + '">📌</button>' +
        '<button class="tabmenu-btn danger" data-mact="forget" data-root="' + esc(p.root) +
          '" title="' + esc(t('tab.forget')) + '">✕</button>' +
      '</div>';
    });
    h += '<div class="tabmenu-foot"><button class="ghost" data-mact="prune">' + esc(t('tab.prune')) + '</button>' +
         '<span class="tiny">' + esc(t('tab.forgetNote')) + '</span></div>';
    box.innerHTML = h;
  }
  function toggleTabMenu(force){
    const box = el('tabMenu'); if(!box) return;
    const on = force === undefined ? !box.classList.contains('on') : force;
    box.classList.toggle('on', on);
    if(on) renderTabMenu();
  }
  async function projectAction(path, root, extra){
    const r = await (await fetch(path + '?root=' + encodeURIComponent(root) + (extra || ''), { method: 'POST' })).json();
    if(r && r.knownProjects && last) last.knownProjects = r.knownProjects;
    return r;
  }
  // ── Project sub-tabs: Harness+checks | Graph (plan 14 §4) ────────────────────
  function setProjectSubTab(which){
    document.body.dataset.ptab = which;
    try { localStorage.setItem('zemory.ptab', which); } catch(e){}
    document.querySelectorAll('.psubtab').forEach(function(b){ b.classList.toggle('on', b.dataset.psub === which); });
    if(which === 'graph'){ renderFolderTree(); renderGraph(); }   // lazy — only when opened
  }
  document.addEventListener('click', function(ev){
    const b = ev.target.closest ? ev.target.closest('.psubtab') : null;
    if(b) setProjectSubTab(b.dataset.psub);
  });
  // ── Global Memory sub-tabs: Recall + Chuẩn chung | Bộ nhớ & Đồng bộ ──────────
  // Same CSS-driven pattern (body[data-gtab]); the DOM is never moved.
  function setGlobalSubTab(which){
    document.body.dataset.gtab = which;
    try { localStorage.setItem('zemory.gtab', which); } catch(e){}
    document.querySelectorAll('.gsubtab').forEach(function(b){ b.classList.toggle('on', b.dataset.gsub === which); });
    if(which === 'recall') renderStandard();   // the shared standard shows in this pane
  }
  document.addEventListener('click', function(ev){
    const b = ev.target.closest ? ev.target.closest('.gsubtab') : null;
    if(b) setGlobalSubTab(b.dataset.gsub);
  });
  // ── Inspector tabs: Bộ nhớ | Quét | Dự án | Chuẩn chung ─────────────────────
  // Was a 4-panel vertical stack; each is now a tab so it gets the full column.
  function setInspectorTab(which){
    document.body.dataset.itab = which;
    try { localStorage.setItem('zemory.itab', which); } catch(e){}
    document.querySelectorAll('.itab').forEach(function(b){ b.classList.toggle('on', b.dataset.itab === which); });
  }
  document.addEventListener('click', function(ev){
    const b = ev.target.closest ? ev.target.closest('.itab') : null;
    if(b) setInspectorTab(b.dataset.itab);
  });
  // VSCode-like structure tree: real folders annotated with the standard slot
  // dictionary; unknown folders flagged (a folder-structure conformance check).
  // v1 is static; the graph engine (plan 13) that lights nodes up is a later step.
  let treeCache = {};   // root -> {at, data}
  let treeCollapsed = {};   // path -> true: folders collapsed for the CURRENT tree root
  let treeRoot = '';        // which root treeCollapsed belongs to
  function treeCollapseKey(root){ return 'zemory.tree:' + root; }
  function loadTreeCollapsed(root){
    try { return JSON.parse(localStorage.getItem(treeCollapseKey(root)) || '{}') || {}; } catch(e){ return {}; }
  }
  function saveTreeCollapsed(){
    try { localStorage.setItem(treeCollapseKey(treeRoot), JSON.stringify(treeCollapsed)); } catch(e){}
  }
  // Collapse/expand every folder at once (VSCode "collapse all").
  function setAllTreeCollapsed(on){
    const d = treeCache[treeRoot] && treeCache[treeRoot].data; if(!d) return;
    treeCollapsed = {};
    if(on){ (function walk(ns){ ns.forEach(function(n){ if(n.children && n.children.length){ treeCollapsed[n.path] = true; walk(n.children); } }); })(d.tree || []); }
    saveTreeCollapsed(); paintTree(d);
  }
  async function renderFolderTree(force){
    const box = el('graphTree'); if(!box) return;
    const root = curRoot || (last && last.project && last.project.root) || '';
    if(!root){ box.innerHTML = '<div class="muted">' + esc(t('tree.noproj')) + '</div>'; return; }
    treeRoot = root; treeCollapsed = loadTreeCollapsed(root);
    const cached = treeCache[root];
    if(!force && cached && Date.now() - cached.at < 60000){ paintTree(cached.data); return; }
    box.innerHTML = '<div class="muted">' + esc(t('tree.loading')) + '</div>';
    try {
      const data = await (await fetch('/folder-tree?root=' + encodeURIComponent(root))).json();
      treeCache[root] = { at: Date.now(), data: data };
      paintTree(data);
    } catch(e){ box.innerHTML = '<div class="muted">tree error: ' + esc(e) + '</div>'; }
  }
  function treeNodeHtml(n){
    const cls = 'trow' + (n.known ? '' : ' unknown');
    const role = n.role ? '<span class="trole">' + esc(n.role) + '</span>' : (n.known ? '' : '<span class="trole">' + esc(t('tree.nonstd')) + '</span>');
    const kids = n.children && n.children.length;
    const collapsed = !!treeCollapsed[n.path];
    // Chevron (VSCode-style twisty): folders toggle; leaves keep a hidden spacer
    // so names line up. Rotated -90° when collapsed (▾ → ▸).
    const tw = kids
      ? '<span class="ttw' + (collapsed ? ' collapsed' : '') + '" data-tw="' + esc(n.path) + '">▾</span>'
      : '<span class="ttw leaf">▾</span>';
    let h = '<div class="tnode' + (collapsed ? ' collapsed' : '') + '"><div class="' + cls + '" data-path="' + esc(n.path) + '" title="' + esc(n.path) + '">'
      + tw + '<span class="tname">' + esc(n.name) + '/</span>' + role + '</div>';
    if(kids){
      h += '<div class="tchildren">' + n.children.map(treeNodeHtml).join('') + '</div>';
    }
    return h + '</div>';
  }
  function paintTree(data){
    const box = el('graphTree'); if(!box) return;
    const tree = (data && data.tree) || [];
    if(!tree.length){ box.innerHTML = '<div class="muted">' + esc(t('tree.empty')) + '</div>'; return; }
    const used = (data.usedSlots || []).length;
    const unknown = (data.unknownDirs || []).length;
    box.innerHTML = '<div class="tree-bar">'
      + '<button class="mini-btn ghost" data-tact="collapse" title="' + esc(t('tree.collapseAll')) + '">⊟</button>'
      + '<button class="mini-btn ghost" data-tact="expand" title="' + esc(t('tree.expandAll')) + '">⊞</button></div>'
      + tree.map(treeNodeHtml).join('')
      + '<div class="tree-legend">' + used + ' ' + esc(t('tree.slots'))
      + (unknown ? ' · ' + unknown + ' ' + esc(t('tree.nonstdN')) : '') + '</div>';
  }
  // Click a folder in the tree → highlight every graph node under it (structure
  // ↔ graph sync, the point of putting them side by side).
  document.addEventListener('click', function(ev){
    if(!ev.target.closest) return;
    // Expand/collapse-all toolbar.
    const tact = ev.target.closest('#graphTree .tree-bar [data-tact]');
    if(tact){ setAllTreeCollapsed(tact.dataset.tact === 'collapse'); return; }
    // Chevron: toggle ONE folder (leaves have no data-tw).
    const tw = ev.target.closest('#graphTree .ttw');
    if(tw && !tw.classList.contains('leaf')){
      const path = tw.dataset.tw;
      treeCollapsed[path] = !treeCollapsed[path];
      saveTreeCollapsed();
      const node = tw.closest('.tnode');
      if(node) node.classList.toggle('collapsed', !!treeCollapsed[path]);
      tw.classList.toggle('collapsed', !!treeCollapsed[path]);
      return;
    }
    // Row body: highlight this folder's nodes in the graph (structure ↔ graph sync).
    const r = ev.target.closest('#graphTree .trow');
    if(!r) return;
    graphHighlightDir(r.dataset.path);
    document.querySelectorAll('#graphTree .trow').forEach(function(x){ x.classList.remove('active'); });
    r.classList.add('active');
  });

  // ── Code graph (plan 13): derived import graph, 0 LLM. Nodes=files, edges=imports.
  //    A tiny force layout in plain SVG (no libs — self-contained embed). Clicking a
  //    node lights up its folder in the tree; clicking a folder dims all but its nodes.
  let graphCache = {};   // root -> {at, data}
  let graphState = null; // {nodes, edges, sel}
  const GROUP_COLORS = ['var(--green)', 'var(--blue)', 'var(--amber)', 'var(--red)', 'var(--muted)', 'var(--faint)'];
  function slotColor(slot){
    if(!slot) return 'var(--faint)';
    let h = 0; for(let i=0;i<slot.length;i++) h = (h*31 + slot.charCodeAt(i)) & 0xffff;
    return GROUP_COLORS[h % GROUP_COLORS.length];
  }
  async function renderGraph(force){
    const box = el('graphCanvas'); if(!box) return;
    const root = curRoot || (last && last.project && last.project.root) || '';
    if(!root){ box.innerHTML = '<div class="soon">' + esc(t('tree.noproj')) + '</div>'; return; }
    const cached = graphCache[root];
    if(!force && cached && Date.now() - cached.at < 60000){ paintGraph(cached.data); return; }
    box.innerHTML = '<div class="soon">' + esc(t('graph.building')) + '</div>';
    try {
      const data = await (await fetch('/code-graph?root=' + encodeURIComponent(root))).json();
      graphCache[root] = { at: Date.now(), data: data };
      paintGraph(data);
    } catch(e){ box.innerHTML = '<div class="soon">graph error: ' + esc(e) + '</div>'; }
    renderNavCost(root, force);
  }
  // What the index/graph/memory BUY, in tokens. Both sides are measured (nav-cost.ts):
  // sweep = read everything to answer blind · routed = what zemory hands back.
  // Deliberately NOT a "tokens saved" claim — that is unmeasurable (HP điều 12).
  var navCostCache = {};
  async function renderNavCost(root, force){
    var box = el('navCost'); if(!box || !root) return;
    var c = navCostCache[root];
    if(!force && c && Date.now() - c.at < 60000){ paintNavCost(c.data); return; }
    try {
      var d = await (await fetch('/nav-cost?root=' + encodeURIComponent(root))).json();
      navCostCache[root] = { at: Date.now(), data: d };
      paintNavCost(d);
    } catch(e){ box.innerHTML = ''; }
  }
  function paintNavCost(d){
    var box = el('navCost'); if(!box) return;
    if(!d){ box.innerHTML = ''; return; }
    // key → [lane, localized how-it-was-measured tooltip]. Tooltips are built
    // CLIENT-side from i18n — the server detail string is EN-only (CLI).
    var rows = [
      ['nc.locate', d.locate, 'nc.tipLocate'],
      ['nc.impact', d.impact, 'nc.tipImpact'],
      ['nc.recall', d.recall, 'nc.tipRecall'],
    ];
    var html = '<div class="nc-h">' + esc(t('nc.h')) + '<span class="q" title="' + esc(t('tt.navcost')) + '">?</span></div>'
      + '<div class="nc-row nc-head"><span>' + esc(t('nc.colQ')) + '</span><span>' + esc(t('nc.colSweep')) + '</span><span>' + esc(t('nc.colRouted')) + '</span><span>' + esc(t('nc.colRatio')) + '</span></div>';
    var any = false;
    rows.forEach(function(r){
      var l = r[1]; if(!l || !l.available) return;
      any = true;
      html += '<div class="nc-row" title="' + esc(t(r[2])) + '">'
        + '<span class="nc-q">' + esc(t(r[0])) + '</span>'
        + '<span class="nc-sweep">' + fmtN(l.sweepTokens) + '</span>'
        + '<span class="nc-routed">→ ' + fmtN(l.routedTokens) + '</span>'
        + '<span class="nc-ratio' + (l.ratio < 1 ? ' nc-worse' : '') + '">' + fmtN(l.ratio) + '×</span>'
        + '</div>';
    });
    box.innerHTML = any ? html : '';
  }
  // Deterministic PRNG so the layout is stable across rebuilds (no jitter).
  function mulberry(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // ── Alternative layouts (user pick, persisted). All deterministic, 0 libs. ──
  // cluster: one box per folder, files gridded inside — "where does code LIVE".
  function layoutCluster(nodes){
    const W = 800, H = 560, m = 30;
    const groups = {};
    nodes.forEach(function(nd){ (groups[nd.dir || '(root)'] = groups[nd.dir || '(root)'] || []).push(nd); });
    const names = Object.keys(groups).sort();
    const cols = Math.max(1, Math.ceil(Math.sqrt(names.length * (W / H))));
    const rows = Math.ceil(names.length / cols);
    const cw = (W - 2 * m) / cols, ch = (H - 2 * m) / rows;
    const pos = {};
    names.forEach(function(name, gi){
      const gx = m + (gi % cols) * cw, gy = m + Math.floor(gi / cols) * ch;
      const members = groups[name].slice().sort(function(a, b){ return a.label.localeCompare(b.label); });
      const gc = Math.max(1, Math.ceil(Math.sqrt(members.length)));
      members.forEach(function(nd, i){
        pos[nd.id] = {
          x: gx + cw * .14 + (i % gc) * (cw * .72 / gc) + cw * .36 / gc,
          y: gy + ch * .2 + Math.floor(i / gc) * (ch * .66 / Math.ceil(members.length / gc)) + ch * .12,
        };
      });
    });
    return { pos, W, H };
  }
  // layers: entries left → deepest imports right (longest path from any entry),
  // so "what sits on top of what" reads left-to-right. Cycle-safe (n passes cap).
  function layoutLayers(nodes, edges){
    const W = 800, H = 560, m = 30;
    const depth = {};
    nodes.forEach(function(nd){ depth[nd.id] = 0; });
    for(let pass = 0; pass < Math.min(nodes.length, 60); pass++){
      let changed = false;
      for(const e of edges){
        if(depth[e.from] == null || depth[e.to] == null) continue;
        if(depth[e.to] < depth[e.from] + 1 && depth[e.from] + 1 <= nodes.length){
          depth[e.to] = depth[e.from] + 1; changed = true;
        }
      }
      if(!changed) break;
    }
    const byCol = {};
    nodes.forEach(function(nd){ (byCol[depth[nd.id]] = byCol[depth[nd.id]] || []).push(nd); });
    const colKeys = Object.keys(byCol).map(Number).sort(function(a, b){ return a - b; });
    const pos = {};
    colKeys.forEach(function(ck, ci){
      const col = byCol[ck].slice().sort(function(a, b){ return (a.dir + a.label).localeCompare(b.dir + b.label); });
      const x = colKeys.length === 1 ? W / 2 : m + ci * ((W - 2 * m) / (colKeys.length - 1));
      col.forEach(function(nd, i){
        pos[nd.id] = { x: x, y: col.length === 1 ? H / 2 : m + i * ((H - 2 * m) / (col.length - 1)) };
      });
    });
    return { pos, W, H };
  }
  function layoutGraph(nodes, edges, mode){
    if(mode === 'cluster') return layoutCluster(nodes);
    if(mode === 'layers') return layoutLayers(nodes, edges);
    const W = 800, H = 560, n = nodes.length;
    const rnd = mulberry(1337 + n);
    const pos = {}; const idx = {};
    nodes.forEach((nd, i) => { idx[nd.id] = i; pos[nd.id] = { x: W/2 + (rnd()-.5)*W*.8, y: H/2 + (rnd()-.5)*H*.8, vx: 0, vy: 0 }; });
    const links = edges.filter(e => pos[e.from] && pos[e.to]);
    const iters = n > 140 ? 160 : 240;
    for(let it=0; it<iters; it++){
      const k = 1 - it/iters;
      // repulsion (O(n²); n is small — a project's own source)
      for(let i=0;i<n;i++){ const a = pos[nodes[i].id];
        for(let j=i+1;j<n;j++){ const b = pos[nodes[j].id];
          let dx = a.x-b.x, dy = a.y-b.y, d2 = dx*dx+dy*dy+.01; const f = 900/d2;
          const fx = dx*f, fy = dy*f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; } }
      // springs along imports
      for(const e of links){ const a = pos[e.from], b = pos[e.to];
        let dx = b.x-a.x, dy = b.y-a.y, d = Math.sqrt(dx*dx+dy*dy)||1; const f = (d-70)*.02;
        const fx = dx/d*f, fy = dy/d*f; a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy; }
      // gravity to center + integrate
      for(const nd of nodes){ const p = pos[nd.id];
        p.vx += (W/2 - p.x)*.005; p.vy += (H/2 - p.y)*.005;
        p.x += p.vx*k*.5; p.y += p.vy*k*.5; p.vx *= .82; p.vy *= .82; }
    }
    // normalize into the viewBox with margin
    let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
    for(const nd of nodes){ const p = pos[nd.id]; minx=Math.min(minx,p.x); miny=Math.min(miny,p.y); maxx=Math.max(maxx,p.x); maxy=Math.max(maxy,p.y); }
    const m=30, sx=(W-2*m)/((maxx-minx)||1), sy=(H-2*m)/((maxy-miny)||1);
    for(const nd of nodes){ const p = pos[nd.id]; p.x=m+(p.x-minx)*sx; p.y=m+(p.y-miny)*sy; }
    return { pos, W, H };
  }
  function paintGraph(data){
    const box = el('graphCanvas'); if(!box) return;
    const nodes = (data && data.nodes) || [], edges = (data && data.edges) || [];
    graphState = { nodes: nodes, edges: edges, sel: null };
    if(!nodes.length){ box.innerHTML = '<div class="soon">' + esc(t('graph.empty')) + '</div>'; return; }
    const orphanOnly = el('graphOrphans') && el('graphOrphans').checked;
    const orphanSet = {}; (data.orphans||[]).forEach(o => orphanSet[o] = 1);
    const L = layoutGraph(nodes, edges, (el('graphLayout') || {}).value || 'force');
    graphState.pos = L.pos; // live positions — node drag updates these
    const maxDeg = Math.max(1, ...nodes.map(n => n.fanIn + n.fanOut));
    let svg = '<svg viewBox="0 0 ' + L.W + ' ' + L.H + '" preserveAspectRatio="xMidYMid meet">';
    // edges
    for(const e of edges){ const a = L.pos[e.from], b = L.pos[e.to]; if(!a||!b) continue;
      svg += '<line class="gedge" data-from="' + esc(e.from) + '" data-to="' + esc(e.to) + '" x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '"/>'; }
    // nodes
    for(const nd of nodes){ const p = L.pos[nd.id]; if(!p) continue;
      const deg = nd.fanIn + nd.fanOut; const r = 3 + Math.sqrt(deg/maxDeg)*9;
      const isOrph = orphanSet[nd.id];
      const cls = 'gnode' + (isOrph ? ' orphan' : '') + (orphanOnly && !isOrph ? ' dim' : '');
      svg += '<g class="' + cls + '" data-id="' + esc(nd.id) + '" data-dir="' + esc(nd.dir) + '">'
        + '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + slotColor(nd.slot) + '"><title>' + esc(nd.id) + '</title></circle>'
        + (r >= 7 ? '<text x="' + (p.x).toFixed(1) + '" y="' + (p.y - r - 2).toFixed(1) + '" text-anchor="middle">' + esc(nd.label) + '</text>' : '')
        + '</g>';
    }
    svg += '</svg>';
    box.innerHTML = svg;
    gview = { x: 0, y: 0, w: L.W, h: L.H, W: L.W, H: L.H }; // fresh paint = 1:1 view
    gUndo = []; gRedo = []; // positions recomputed → old move history is meaningless
    const st = el('graphStats'); if(st) st.textContent = data.stats.files + ' file · ' + data.stats.edges + ' import · ' + data.stats.slots + ' slot · ' + (data.orphans||[]).length + ' orphan';
    paintFitness(data.fitness, data.stats);
    el('graphInfo').innerHTML = '<span class="muted">' + esc(t('graph.hint')) + '</span>';
  }
  // ── Graph zoom/pan: wheel = zoom at cursor · drag empty canvas = pan ·
  // double-click background = reset. Listeners sit on the CONTAINER (#graphCanvas)
  // so a repaint (innerHTML swap) never detaches them; each paint resets gview.
  var gview = null; // { x,y,w,h, W,H } — current viewBox vs the base extent
  function gApply(){
    var svg = document.querySelector('#graphCanvas svg');
    if(svg && gview) svg.setAttribute('viewBox', gview.x + ' ' + gview.y + ' ' + gview.w + ' ' + gview.h);
  }
  // client px → viewBox coords under preserveAspectRatio "meet" (letterbox-aware).
  function gMap(svg, cx, cy){
    var r = svg.getBoundingClientRect();
    var s = Math.min(r.width / gview.w, r.height / gview.h);
    var ox = (r.width - gview.w * s) / 2, oy = (r.height - gview.h * s) / 2;
    return { x: gview.x + (cx - r.left - ox) / s, y: gview.y + (cy - r.top - oy) / s, s: s };
  }
  // Layout picker: persisted, repaints from cache (no refetch).
  function setGraphLayout(){
    try { localStorage.setItem('zemory.glayout', el('graphLayout').value); } catch(e){}
    renderGraph();
  }
  // Move one node live: circle + label + every edge endpoint touching it.
  function gMoveNode(id, x, y){
    var sel = '#graphCanvas .gnode[data-id="' + id.replace(/"/g, '\\"') + '"]';
    var gEl = document.querySelector(sel); if(!gEl) return;
    var c = gEl.querySelector('circle'); if(!c) return;
    var r = parseFloat(c.getAttribute('r')) || 5;
    c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
    var tx = gEl.querySelector('text');
    if(tx){ tx.setAttribute('x', x.toFixed(1)); tx.setAttribute('y', (y - r - 2).toFixed(1)); }
    document.querySelectorAll('#graphCanvas .gedge').forEach(function(ln){
      if(ln.dataset.from === id){ ln.setAttribute('x1', x.toFixed(1)); ln.setAttribute('y1', y.toFixed(1)); }
      if(ln.dataset.to === id){ ln.setAttribute('x2', x.toFixed(1)); ln.setAttribute('y2', y.toFixed(1)); }
    });
    if(graphState && graphState.pos && graphState.pos[id]){ graphState.pos[id].x = x; graphState.pos[id].y = y; }
  }
  var gSuppressClick = false; // a drag must not fire the node-select click behind it
  var gUndo = [], gRedo = []; // node-move history (Ctrl+Z / Ctrl+Y). Cleared on repaint.
  (function bindGraphZoom(){
    var box = el('graphCanvas'); if(!box) return;
    box.addEventListener('wheel', function(ev){
      var svg = box.querySelector('svg'); if(!svg || !gview) return;
      ev.preventDefault();
      var m = gMap(svg, ev.clientX, ev.clientY);
      var k = ev.deltaY > 0 ? 1.2 : 1 / 1.2;
      var w = Math.min(gview.W * 4, Math.max(gview.W / 10, gview.w * k));
      var h = w * gview.H / gview.W;
      gview.x = m.x - (m.x - gview.x) * (w / gview.w);
      gview.y = m.y - (m.y - gview.y) * (h / gview.h);
      gview.w = w; gview.h = h;
      gApply();
    }, { passive: false });
    var pan = null, ndrag = null;
    box.addEventListener('pointerdown', function(ev){
      var svg = box.querySelector('svg'); if(!svg || !gview) return;
      var node = ev.target.closest && ev.target.closest('.gnode');
      if(node){
        // Grab a node: drag repositions it (click-select still works if unmoved).
        var id = node.dataset.id;
        var p = graphState && graphState.pos && graphState.pos[id];
        if(!p) return;
        ndrag = { id: id, cx: ev.clientX, cy: ev.clientY, x: p.x, y: p.y, s: gMap(svg, ev.clientX, ev.clientY).s, moved: false };
      } else {
        pan = { cx: ev.clientX, cy: ev.clientY, x: gview.x, y: gview.y, s: gMap(svg, ev.clientX, ev.clientY).s };
      }
      if(box.setPointerCapture) box.setPointerCapture(ev.pointerId);
    });
    box.addEventListener('pointermove', function(ev){
      if(ndrag){
        var dx = (ev.clientX - ndrag.cx) / ndrag.s, dy = (ev.clientY - ndrag.cy) / ndrag.s;
        if(!ndrag.moved && Math.abs(ev.clientX - ndrag.cx) + Math.abs(ev.clientY - ndrag.cy) > 4) ndrag.moved = true;
        if(ndrag.moved) gMoveNode(ndrag.id, ndrag.x + dx, ndrag.y + dy);
        return;
      }
      if(!pan || !gview) return;
      gview.x = pan.x - (ev.clientX - pan.cx) / pan.s;
      gview.y = pan.y - (ev.clientY - pan.cy) / pan.s;
      gApply();
    });
    var endPan = function(){
      if(ndrag && ndrag.moved){
        gSuppressClick = true; // the click right after a drag is not a select
        var cur = graphState && graphState.pos && graphState.pos[ndrag.id];
        if(cur){ gUndo.push({ id: ndrag.id, from: { x: ndrag.x, y: ndrag.y }, to: { x: cur.x, y: cur.y } }); gRedo = []; }
      }
      pan = null; ndrag = null;
    };
    box.addEventListener('pointerup', endPan);
    box.addEventListener('pointercancel', endPan);
    box.addEventListener('dblclick', function(ev){
      if(ev.target.closest && ev.target.closest('.gnode')) return;
      if(!gview) return;
      gview.x = 0; gview.y = 0; gview.w = gview.W; gview.h = gview.H;
      gApply();
    });
  })();
  // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) undo/redo NODE MOVES — only while the
  // Graph sub-tab is open, and never when a text field owns the keystroke.
  document.addEventListener('keydown', function(ev){
    if(!(ev.ctrlKey || ev.metaKey)) return;
    var k = (ev.key || '').toLowerCase();
    var undo = k === 'z' && !ev.shiftKey, redo = k === 'y' || (k === 'z' && ev.shiftKey);
    if(!undo && !redo) return;
    if(document.body.dataset.tab !== 'project' || document.body.dataset.ptab !== 'graph') return;
    if(!graphState || !graphState.pos) return;
    var tag = (ev.target && ev.target.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || (ev.target && ev.target.isContentEditable)) return;
    if(undo && gUndo.length){ ev.preventDefault(); var c = gUndo.pop(); gMoveNode(c.id, c.from.x, c.from.y); gRedo.push(c); }
    else if(redo && gRedo.length){ ev.preventDefault(); var c2 = gRedo.pop(); gMoveNode(c2.id, c2.to.x, c2.to.y); gUndo.push(c2); }
  });
  // Fitness strip (plan 13 §9 Phase A): each metric a pass/fail chip; hover for
  // the detail. Data comes scored from the server — the page only paints it.
  function paintFitness(f, stats){
    var box = el('graphFit'); if(!box) return;
    if(!f || !f.metrics){ box.innerHTML = ''; return; }
    var files = (stats && stats.files) || 0;
    // Localized explanations built CLIENT-side from the structured numbers —
    // the server detail string is EN-only (it belongs to the CLI).
    var tip = function(m){
      var th = m.threshold + (m.metric.indexOf('pct') >= 0 ? '%' : '');
      if(m.metric === 'hub_pct') return t('fit.dHub').replace('{n}', String((f.hubs || []).length)).replace('{files}', String(files)).replace('{th}', th);
      if(m.metric === 'isolated_pct') return t('fit.dIso').replace('{files}', String(files)).replace('{th}', th);
      if(m.metric === 'util_violations') return t('fit.dUtil').replace('{n}', String((f.utilViolations || []).length)).replace('{th}', th);
      return th;
    };
    var chips = f.metrics.map(function(m){
      var pct = m.metric.indexOf('pct') >= 0 ? '%' : '';
      return '<span class="fit-chip' + (m.passed ? '' : ' bad') + '" title="' + esc(tip(m)) + '">'
        + (m.passed ? '✓' : '✗') + ' ' + esc(t('fit.' + m.metric)) + ' ' + m.value + pct + '</span>';
    }).join('');
    var hubs = (f.hubs || []).slice(0, 3).map(function(h){ return esc(h.id.split('/').pop()) + ' (' + h.fanIn + ')'; }).join(' · ');
    box.innerHTML = '<span class="fit-head">' + esc(t('fit.h')) + '<span class="q" title="' + esc(t('fit.help')) + '">?</span></span>'
      + '<span class="fit-chips">' + chips + '</span>'
      + (hubs ? '<span class="fit-hubs" title="' + esc(t('fit.hubsTip')) + '">' + hubs + '</span>' : '');
  }
  // Node click → select + highlight its edges/neighbours + light its folder in the tree.
  document.addEventListener('click', function(ev){
    const g = ev.target.closest ? ev.target.closest('.gnode') : null;
    if(!g || !graphState) return;
    if(gSuppressClick){ gSuppressClick = false; return; } // that "click" was a drag
    const id = g.dataset.id, dir = g.dataset.dir;
    const nd = graphState.nodes.find(x => x.id === id); if(!nd) return;
    const nbr = {}; nbr[id] = 1;
    document.querySelectorAll('#graphCanvas .gedge').forEach(function(ln){
      const hot = ln.dataset.from === id || ln.dataset.to === id;
      ln.classList.toggle('hot', hot);
      if(hot){ nbr[ln.dataset.from] = 1; nbr[ln.dataset.to] = 1; }
    });
    document.querySelectorAll('#graphCanvas .gnode').forEach(function(x){
      x.classList.toggle('sel', x.dataset.id === id);
      x.classList.toggle('dim', !nbr[x.dataset.id]);
    });
    graphHighlightTreeFolder(dir);
    // AST detail (Phase B) shows kind + line; regex fallback shows names only.
    const syms = (nd.symbolsDetail||[]).length
      ? '<div class="syms">' + nd.symbolsDetail.map(function(s){ return esc(s.name) + ' <i>(' + esc(s.kind) + ', L' + s.line + ')</i>'; }).join(' · ') + '</div>'
      : ((nd.symbols||[]).length ? '<div class="syms">' + nd.symbols.map(esc).join(' · ') + '</div>' : '');
    el('graphInfo').innerHTML = '<b>' + esc(nd.label) + '</b> · ' + esc(nd.dir || '(root)')
      + (nd.slot ? ' · <b>' + esc(nd.slot) + '</b>' : '')
      + ' · ' + nd.loc + ' ' + esc(t('graph.loc')) + ' · fan-in ' + nd.fanIn + ' / out ' + nd.fanOut + syms;
  });
  // Light up the tree row whose folder path matches a node's directory.
  function graphHighlightTreeFolder(dir){
    document.querySelectorAll('#graphTree .trow').forEach(function(r){
      r.classList.toggle('active', r.dataset.path === dir);
    });
  }
  // Reverse: click a tree folder → dim graph nodes not under it.
  function graphHighlightDir(dir){
    if(!graphState) return;
    document.querySelectorAll('#graphCanvas .gnode').forEach(function(x){
      const under = x.dataset.dir === dir || (x.dataset.dir + '/').indexOf(dir + '/') === 0;
      x.classList.toggle('dim', !under);
      x.classList.remove('sel');
    });
    document.querySelectorAll('#graphCanvas .gedge').forEach(function(ln){ ln.classList.remove('hot'); });
  }
  document.addEventListener('click', function(ev){
    const b = ev.target.closest ? ev.target.closest('.tabbar .tab') : null;
    if(!b){
      // Click outside closes the project menu.
      if(el('tabMenu') && !(ev.target.closest && ev.target.closest('#tabMenu'))) toggleTabMenu(false);
      return;
    }
    const act = b.dataset.act;
    if(act === 'global'){ toggleTabMenu(false); setTab('global'); }
    else if(act === 'open'){ toggleTabMenu(false); openProjectTab(b.dataset.root); }
    else if(act === 'more' || act === 'manage') toggleTabMenu();
    else if(act === 'add'){ toggleTabMenu(false); promptAddProject(); }
    else if(act === 'theme') toggleTheme();
    else if(act === 'settings') openSettings();
  });
  document.addEventListener('click', async function(ev){
    const b = ev.target.closest ? ev.target.closest('#tabMenu [data-mact]') : null;
    if(!b) return;
    const act = b.dataset.mact;
    const root = b.dataset.root || '';
    if(act === 'open'){ toggleTabMenu(false); openProjectTab(root); return; }
    if(act === 'pin'){ await projectAction('/pin-project', root, '&on=' + b.dataset.on); }
    else if(act === 'forget'){
      // Destructive-looking but scoped: this only edits zemory's picker list.
      if(!confirm(t('tab.forgetConfirm') + '\n\n' + root)) return;
      await projectAction('/forget-project', root);
      if(el('proj') && el('proj').value === root){ curRoot = ''; setTab('global'); }
    } else if(act === 'prune'){
      const r = await (await fetch('/prune-projects', { method: 'POST' })).json();
      if(r && r.knownProjects && last) last.knownProjects = r.knownProjects;
      el('msg').textContent = t('tab.pruned').replace('{n}', String((r && r.removed) || 0));
    }
    if(el('proj')) el('proj').innerHTML = projOpts();
    renderTabs();
    renderTabMenu();
  });
  // Switching tabs is a VIEW change: flip the CSS, paint from cache, and only
  // hit the network when this project's data is missing or stale. No memoryTick
  // here — the memory panel belongs to Global Memory, not to a project tab.
  function openProjectTab(root){
    const changed = el('proj').value !== root;
    document.body.dataset.tab = 'project';
    try { localStorage.setItem('zemory.tab', 'project'); } catch(e){}
    if(changed){
      cacheProject();                 // keep what the previous tab had
      el('proj').value = root;
      curRoot = root;
      const fresh = paintFromCache(root);
      renderTabs();
      if(document.body.dataset.ptab === 'graph'){ renderFolderTree(true); renderGraph(true); }
      if(!fresh){ checks = {}; checksFor = null; tick().then(() => { runChecks(); cacheProject(); }); }
      return;
    }
    renderTabs();
  }
  function toggleTheme(){
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    try { localStorage.setItem('zemory.theme', next); } catch(e){}
  }
  (function restoreShell(){
    try {
      const th = localStorage.getItem('zemory.theme'); if(th) document.body.dataset.theme = th;
      // 'standard' is a dead tab value now (it folded into Global Memory).
      const tb = localStorage.getItem('zemory.tab');
      if(tb) document.body.dataset.tab = (tb === 'standard') ? 'global' : tb;
      const pt = localStorage.getItem('zemory.ptab'); if(pt) document.body.dataset.ptab = pt;
      const gt = localStorage.getItem('zemory.gtab'); if(gt) document.body.dataset.gtab = gt;
      const it = localStorage.getItem('zemory.itab');
      if(it){
        document.body.dataset.itab = it;
        document.querySelectorAll('.itab').forEach(function(b){ b.classList.toggle('on', b.dataset.itab === it); });
      }
      const gl = localStorage.getItem('zemory.glayout');
      if(gl && el('graphLayout')) el('graphLayout').value = gl;
    } catch(e){}
  })();
  // (Run harness lives in ⚙ Settings → Docs harness now — no in-panel button.)
  // Add a project from the tab bar [＋]: ask for a folder path, then target it
  // (it shows as "not set up" until the user hits Run). Replaces the old in-panel
  // add box, which duplicated this.
  function promptAddProject(){
    el('addProjOverlay').style.display = 'flex';
    var i = el('addProjPath'); i.value = '';
    setTimeout(function(){ i.focus(); }, 30);
  }
  function closeAddProject(){ el('addProjOverlay').style.display = 'none'; }
  function confirmAddProject(){
    var p = el('addProjPath').value.trim();
    if(!p) return;
    closeAddProject();
    setTab('project');
    applyRoot(p);
  }
  function applyRoot(path){
    if(!path || !path.trim()) return;
    curRoot = path.trim();
    checks = {}; checksFor = null;
    el('msg').textContent = t('proj.target') + curRoot;
    tick().then(() => { runChecks(); cacheProject(); });
  }
  async function manualRefresh(){
    // Refresh button = the ONE place that forces a fresh recompute; run the
    // independent fetches concurrently instead of chaining three awaits.
    await Promise.all([tick().catch(function(){}), memoryTick(true).catch(function(){})]);
    if(el('bq').value.trim().length >= 2) await memorySearch();
  }

  function renderStatus(){
    if(!last) return;
    el('proj').innerHTML = projOpts();
    renderTabs();
    const docsOk = last.docs.filter(d => d.ok).length;
    let h = '';
    // NOTE: the shared standard (docs_template/) is NOT rendered here — it is a
    // machine-level asset and now lives on the Global Memory tab (renderStandard).
    h += row(last.project.name || t('r.noproj'), last.project.connected ? 'on' : 'off', last.project.root || t('r.runinit'), 'docs/.harness.json?');
    h += '<div class="tiny" style="margin:8px 0 4px">' + t('r.projdocs') + '</div>';
    h += '<div class="chips" style="margin-bottom:10px">' + (last.docs || []).map(d => '<span class="chip doc-link ' + (d.ok ? 'on' : 'off') + '" onclick="openDoc(\'' + esc(d.file) + '\')" title="' + esc(d.file) + '">' + esc(d.file) + '</span>').join('') + '</div>';
    if(last.setup) h += row(t('r.setup'), last.setup.complete ? 'on' : 'warn', last.setup.detail, '');
    if(last.plan) h += row(t('r.plan'), last.plan.needsReconcile ? 'warn' : (last.plan.exists ? 'on' : 'planned'), last.plan.detail, 'docs/plan ⟵ global_memory.db');
    h += '<div class="chips" style="margin-top:10px">' + chip(docsOk + '/' + (last.docs || []).length + ' ' + t('r.docs'), docsOk === (last.docs || []).length ? 'on' : 'off') + chip((last.knownProjects || []).length + ' ' + t('r.known'), 'on') + '</div>';
    el('app').innerHTML = h;
    renderStandard();
    renderChecks();
  }
  // Shared standard (docs_template/) — the canonical harness every project is
  // scaffolded from. Machine-level, read-only, so it belongs to Global Memory
  // and NOT to any project tab (plan 14 §4).
  // [name, template-relative path, purpose i18n key, summary i18n key].
  const STD = [
    ['AGENTS.md', 'AGENTS.md', 'std.agents.p', 'std.agents.s'],
    ['01_CONSTITUTION.md', 'agent/01_CONSTITUTION.md', 'std.const.p', 'std.const.s'],
    ['02_RULES.md', 'agent/02_RULES.md', 'std.rules.p', 'std.rules.s'],
    ['03_STRUCTURE.md', 'agent/03_STRUCTURE.md', 'std.struct.p', 'std.struct.s'],
    ['04_SKILLS.md', 'agent/04_SKILLS.md', 'std.skills.p', 'std.skills.s'],
    ['05_TODO.md', 'agent/05_TODO.md', 'std.todo.p', 'std.todo.s'],
    ['06_CHANGES.md', 'agent/06_CHANGES.md', 'std.chg.p', 'std.chg.s'],
  ];
  function renderStandard(){
    const box = el('standardPanel'); if(!box) return;
    const help = el('stdHelp'); if(help) help.title = t('tt.std');
    // One ROW per file — name + purpose + content summary — instead of a strip of
    // bare chips, so the shared harness reads as a documented set (user 2026-07-21).
    box.innerHTML = STD.map(s =>
      '<div class="std-file doc-link" data-std="' + esc(s[1]) + '" title="' + esc(s[1]) + '">'
      + '<div class="std-name">' + esc(s[0]) + '</div>'
      + '<div class="std-purpose">' + esc(t(s[2])) + '</div>'
      + '<div class="std-sum">' + esc(t(s[3])) + '</div>'
      + '</div>').join('');
  }
  document.addEventListener('click', function(ev){
    const c = ev.target.closest ? ev.target.closest('#standardPanel .doc-link') : null;
    if(c) openStandardDoc(c.dataset.std);
  });
  // Coverage row → open that project's tab. Coverage paths are CANONICALIZED
  // (drive letter uppercased) while the hidden #proj select holds registry-cased
  // values, and <select>.value assignment is case-SENSITIVE — a direct assign
  // reset the selection and the old setTab() path returned before switching the
  // tab (audit F1, 2026-07-21). Match case-insensitively; unknown roots (e.g.
  // another machine's projects) are targeted directly via applyRoot.
  function openProjectPath(p){
    const want = String(p || '').toLowerCase();
    if(!want) return;
    const sel = el('proj');
    let match = null;
    if(sel){ for(const o of sel.options){ if(o.value && o.value.toLowerCase() === want){ match = o.value; break; } } }
    if(match){ openProjectTab(match); return; }
    document.body.dataset.tab = 'project';
    try { localStorage.setItem('zemory.tab', 'project'); } catch(e){}
    applyRoot(p);
    renderTabs();
  }
  document.addEventListener('click', function(ev){
    const c = ev.target.closest ? ev.target.closest('#coveragePanel .cov-open') : null;
    if(c) openProjectPath(c.dataset.openProj);
  });
  function featState(key){ const c = checks[key]; return c ? c.state : 'idle'; }
  function featDetail(key){ const c = checks[key]; return c && c.detail ? c.detail : 'not tested'; }
  function renderChecks(){
    if(!last) return;
    let h = '';
    let pass = 0, total = 0;
    for (const group of [['token','chk.memory'], ['workflow','chk.workflow']]) {
      const feats = last.features.filter(f => f.group === group[0]);
      if(!feats.length) continue;
      h += '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:8px 0 4px">' + esc(t(group[1])) + '</div>';
      for (const f of feats) {
        total++;
        if(featState(f.key) === 'on') pass++;
        h += row(f.label, featState(f.key), featDetail(f.key), f.help);
      }
    }
    el('checksBody').innerHTML = h || '<div class="muted">No checks.</div>';
  }
  async function tick(){
    try {
      last = await (await fetch('/status' + ru())).json();
      renderStatus();
    } catch(e) {
      el('app').innerHTML = '<div class="muted">status error: ' + esc(e) + '</div>';
    }
  }
  // Capability checks. These used to run SEQUENTIALLY with cosmetic sleeps
  // (200ms + 120ms before each of 4 round trips) and fired on every tab switch —
  // ~1.6s of forced work just to look at another project. Now: no artificial
  // delay, all checks in parallel, and tab switching does not trigger them at all.
  let checksFor = null;      // which root the current checks belong to
  let checksBusy = false;
  async function runChecks(force){
    if(!last) return;
    const root = curRoot || (last.project && last.project.root) || '';
    if(checksBusy) return;
    if(!force && checksFor === root) return;   // already have them for this project
    checksBusy = true;
    checksFor = root;
    try {
      last.features.forEach(f => { checks[f.key] = { state: 'checking', detail: 'running...' }; });
      renderChecks();
      const results = await Promise.all(last.features.map(async f => {
        try { return [f.key, await (await fetch('/check' + ru({feature: f.key}))).json()]; }
        catch(e) { return [f.key, { state: 'off', detail: 'check error' }]; }
      }));
      // A tab switch during the run wins — do not paint stale results over it.
      if(checksFor !== root) return;
      results.forEach(r => { checks[r[0]] = r[1]; });
      renderChecks();
      if(projCache[root]) projCache[root].checks = Object.assign({}, checks);
    } finally {
      checksBusy = false;
    }
  }

  function renderMemorySummary(s){
    memory = s || {};
    const tot = memory.totals || {};
    const vectors = memory.vectors || {};
    const info = memory.info || {};
    const capture = memory.coverage || {};
    const projects = capture.projects || [];
    el('hybrid').checked = !!memory.hybrid;
    el('rerank').checked = !!memory.rerank;
    el('ball').checked = memory.scope !== false;
    if(!window.__langApplied){ window.__langApplied = true; applyLang(memory.lang || 'vi'); }
    if(el('settingsOverlay').style.display === 'flex') renderSettingsSearch();
    const fa = el('fAgent'); const faCur = fa.value;
    fa.innerHTML = '<option value="">' + t('f.agentAny') + '</option>' + (memory.agents || []).map(a => '<option value="' + esc(a.source) + '">' + esc(a.source) + '</option>').join('');
    fa.value = faCur;
    const drive = memory.drive || {};
    if(document.activeElement !== el('driveLink')) el('driveLink').value = drive.path || '';
    renderDriveState(drive);
    const storage = memory.storage || null;
    if(storage && document.activeElement !== el('storageLink')) el('storageLink').value = storage.dir || '';
    renderStorageState(storage);
    const vectorCoverage = vectors.coverage == null ? '-' : vectors.coverage + '%';
    el('memSub').textContent = (tot.sessions ? t('m.healthy') : t('m.empty')) + ' · ' + t('m.updated') + ' ' + fmtTime(memory.generatedAt);
    el('memoryPanel').innerHTML =
      // Six uniform cards: four "what the memory HOLDS" + two "what it COSTS".
      // The two cost figures used to be mini-rows, which read as a different
      // class of thing than the cards above them (user 2026-07-20).
      // Cards carry EVERYTHING now. The old "BẢNG" list under the scope tree was
      // a second rendering of the same rows (user 2026-07-21: "table thừa thải")
      // — its counts became cards, its per-source detail became card tooltips.
      '<div class="coverage-stats">' +
      statCard(fmtN(tot.messages), t('m.msgs'), tableDetail(info, 'messages')) +
      statCard(fmtN(tot.sessions), t('m.sess'), tableDetail(info, 'sessions')) +
      statCard('~' + fmtN(memory.tokensEst), t('m.tok'), t('tt.capcost')) +
      statCard(fmtBytes(memory.sizeKB), t('m.size')) +
      statCard('0', t('m.capcost'), t('tt.capcost')) +
      statCard('~' + fmtN(memory.recall ? memory.recall.tokensApprox : 0), t('m.recall'), t('tt.recall')) +
      // Every remaining table row, promoted to a card (doc · section · changelog
      // · known_stores …). Data-driven, so a new server table shows up by itself.
      (info.tables || [])
        .filter(r => r.name !== 'messages' && r.name !== 'sessions')
        .map(r => statCard(fmtN(r.rows), r.name, r.detail || '')).join('') +
      '</div>' +
      '<div class="mini-list" style="margin-top:8px">' +
      miniRow(t('m.search'), (memory.hybrid ? 'BM25 + Vector' : t('m.ftsonly')) + (memory.rerank ? ' + rerank' : '')) +
      miniRow('Vector index', fmtN(vectors.count) + ' vec · ' + vectorCoverage + (vectors.remaining ? (' · ' + fmtN(vectors.remaining) + ' ' + t('m.pending')) : '') + (vectors.error ? ' · ' + t('m.err') : '')) +
      '</div>' +
      '<div class="tiny" style="text-transform:uppercase;letter-spacing:.12em;margin:10px 0 4px">' + t('m.sources') + (memory.scopeExcluded ? ' · ' + t('m.excl') + ' ' + memory.scopeExcluded : '') + t('m.untick') + '<span class="q" title="' + esc(t('tt.scopeTree')) + '">?</span></div>' +
      renderScopeTree(memory.scopeTree || []) +
      renderScopeAdd(memory.scopeRules || []) +
      '<div class="path" style="margin-top:8px">' + esc(memory.dbPath || '') + '</div>';
    // Projects grouped by MACHINE, and inside each machine SPLIT (user
    // 2026-07-21): "linked" = added to zemory (registry) vs "discovered" = the
    // memory scan found sessions there but nobody linked it. Discovered lists are
    // junk-heavy, so they collapse by default; remote machines collapse whole.
    // Stamps are full date+time (a bare time-of-day said nothing).
    const byHost = {};
    for(const p of projects){ (byHost[p.host] = byHost[p.host] || []).push(p); }
    const localHost = capture.localHost || '';
    const linkedRoots = new Set(((last && last.knownProjects) || []).map(k => String(k.root || '').toLowerCase()));
    let covState = {};
    try { covState = JSON.parse(localStorage.getItem('zemory.covm') || '{}') || {}; } catch(e){}
    const covHosts = Object.keys(byHost).sort((a, b) => a === localHost ? -1 : b === localHost ? 1 : a.localeCompare(b));
    const covRow = p => {
      const meta = fmtN(p.sessions) + ' ' + t('cov.sess') + ' / ' + fmtN(p.messages) + ' ' + t('cov.msg') + ' / ' + fmtN(p.agents) + ' ' + t('cov.agent') + (p.last ? ' · ' + fmtDateTime(p.last) : '');
      return '<div class="folder-item cov-open" data-open-proj="' + esc(p.path) + '" title="' + esc(t('cov.openTip')) + '">'
        + '<div class="mini-row"><b>' + esc(projName(p.path)) + '</b><span class="muted">' + meta + '</span></div>'
        + '<div class="path">' + esc(p.path) + '</div></div>';
    };
    el('coveragePanel').innerHTML = projects.length
      ? covHosts.map(h => {
          const isLocal = h === localHost;
          const rows = byHost[h];
          const linked = isLocal ? rows.filter(p => linkedRoots.has(String(p.path).toLowerCase())) : [];
          const found = isLocal ? rows.filter(p => !linkedRoots.has(String(p.path).toLowerCase())) : rows;
          // machine group: local defaults OPEN, remote defaults CLOSED (persisted)
          const mOpen = covState['m:' + h] !== undefined ? !!covState['m:' + h] : isLocal;
          const fOpen = !!covState['f:' + h]; // discovered sublist defaults CLOSED
          let body = '';
          if(mOpen){
            body += linked.map(covRow).join('');
            if(found.length){
              body += '<div class="cov-sub" data-cov-found="' + esc(h) + '">' + (fOpen ? '▾ ' : '▸ ') + esc(t('cov.found')) + ' (' + found.length + ')</div>';
              if(fOpen) body += found.map(covRow).join('');
            }
          }
          return '<div class="cov-machine"><div class="cov-mhead" data-cov-host="' + esc(h) + '">'
            + (mOpen ? '▾ ' : '▸ ') + '🖥 ' + esc(h) + (isLocal ? ' <span class="cov-local">' + esc(t('cov.local')) + '</span>' : '')
            + ' <span class="cov-mcount">' + (isLocal && mOpen ? fmtN(linked.length) + ' ' + t('cov.linked') + ' · ' : '') + fmtN(rows.length) + '</span></div>'
            + body + '</div>';
        }).join('')
      : '<div class="muted">' + t('cov.none') + '</div>';
  }
  // Toggle a machine group / its discovered sublist; persist like the tree.
  document.addEventListener('click', function(ev){
    if(!ev.target.closest) return;
    const mh = ev.target.closest('#coveragePanel .cov-mhead');
    const fs = ev.target.closest('#coveragePanel .cov-sub');
    if(!mh && !fs) return;
    let st = {};
    try { st = JSON.parse(localStorage.getItem('zemory.covm') || '{}') || {}; } catch(e){}
    if(mh){ const k = 'm:' + mh.dataset.covHost; st[k] = st[k] === undefined ? (mh.textContent.indexOf('▾') < 0) : !st[k]; }
    else if(fs){ const k = 'f:' + fs.dataset.covFound; st[k] = !st[k]; }
    try { localStorage.setItem('zemory.covm', JSON.stringify(st)); } catch(e){}
    if(memory && Object.keys(memory).length) renderMemorySummary(memory);
  });
  // Provenance tree (Local/Web × machine × agent). A ticked box = the lane is
  // INCLUDED; untick to exclude it from sync + recall (a filter, never a delete).
  function renderScopeTree(nodes){
    if(!nodes || !nodes.length) return '<div class="muted">none</div>';
    const walk = (n, depth) => {
      const checked = !n.effectiveExcluded;
      const disabled = n.effectiveExcluded && !n.excluded; // an ancestor lane excludes it
      const cls = 'scope-label' + (n.effectiveExcluded ? ' ex' : '');
      let h = '<div class="scope-row" style="padding-left:' + (depth * 14) + 'px">'
        + '<input type="checkbox" class="scope-tick"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '')
        + ' title="Untick = leave this lane out of sync + recall"'
        + ' data-lane="' + esc(JSON.stringify(n.lane || {})) + '" onchange="scopeExcludeEl(this)">'
        + '<span class="' + cls + '">' + esc(n.label) + '</span>'
        + '<span class="scope-count">' + fmtN(n.sessions) + ' · ' + fmtN(n.messages) + ' msg</span>'
        + '</div>';
      for(const c of (n.children || [])) h += walk(c, depth + 1);
      return h;
    };
    return nodes.map(n => walk(n, 0)).join('');
  }
  async function scopeExcludeEl(elm){
    let lane = {};
    try { lane = JSON.parse(elm.getAttribute('data-lane') || '{}'); } catch(e){}
    await setScopeLane(lane, !elm.checked); // ticked = included = not excluded
  }
  async function setScopeLane(lane, exclude){
    const q = new URLSearchParams();
    if(lane.origin) q.set('origin', lane.origin);
    if(lane.host) q.set('host', lane.host);
    if(lane.source) q.set('source', lane.source);
    q.set('on', exclude ? '1' : '0');
    try {
      await fetch('/set-scope-exclude?' + q.toString(), { method: 'POST' });
      await memoryTick();
      if(el('bq').value.trim().length >= 2) memorySearch();
    } catch(e){}
  }
  // "+ Add rule": preset a blocklist lane even for a source not captured yet
  // (blank field = wildcard). Pairs with scan-level exclude so it can keep a
  // shared space out of the memory entirely (V2); today it hides from sync+recall.
  function renderScopeAdd(rules){
    const chips = (rules || []).map(r => {
      const parts = [r.origin || 'any', r.host || 'any', r.source || 'any'].join(' · ');
      return '<span class="scope-chip" title="' + t('sc.rm') + '" data-lane="' + esc(JSON.stringify(r)) + '" onclick="scopeRemoveRule(this)">' + esc(parts) + ' ✕</span>';
    }).join('');
    return '<div class="scope-add">'
      + '<select id="scOrigin" class="scope-in"><option value="">' + t('sc.origin') + '</option><option value="local">local</option><option value="web">web</option></select>'
      + '<input id="scHost" class="scope-in" placeholder="' + t('sc.host') + '">'
      + '<input id="scSource" class="scope-in" placeholder="' + t('sc.source') + '">'
      + '<button class="ghost" onclick="scopeAddRule()">' + t('sc.add') + '</button>'
      + '</div>'
      + (rules && rules.length ? '<div class="scope-chips">' + chips + '</div>' : '');
  }
  async function scopeAddRule(){
    const lane = {};
    const o = el('scOrigin').value.trim();
    const h = el('scHost').value.trim();
    const s = el('scSource').value.trim();
    if(o) lane.origin = o;
    if(h) lane.host = h;
    if(s) lane.source = s;
    if(!lane.origin && !lane.host && !lane.source){ el('scSource').focus(); return; }
    await setScopeLane(lane, true);
  }
  async function scopeRemoveRule(elm){
    let lane = {};
    try { lane = JSON.parse(elm.getAttribute('data-lane') || '{}'); } catch(e){}
    await setScopeLane(lane, false);
  }
  // fresh=true forces the server to recompute (user pressed the refresh button /
  // an action changed the memory). The background poll always takes the cached
  // snapshot — these are whole-DB aggregates that block the server for seconds.
  async function memoryTick(fresh){
    try { renderMemorySummary(await (await fetch('/memory-status' + ru(fresh ? { fresh: '1' } : undefined))).json()); }
    catch(e){ el('memoryPanel').innerHTML = '<div class="muted">memory status error: ' + esc(e) + '</div>'; }
  }
  // Hybrid/Rerank are client-known flags (the checkbox itself). They change no
  // memory DATA, so update the cached payload locally and repaint — do NOT refetch
  // /memory-status (that could hit an expired cache and pay the full recompute,
  // the same stall as the language toggle).
  async function setHybrid(){
    try {
      var on = el('hybrid').checked;
      if(memory) memory.hybrid = on;
      renderMemorySummary(memory);
      await fetch('/set-hybrid?on=' + (on ? 1 : 0), { method: 'POST' });
      if(el('bq').value.trim().length >= 2) memorySearch();
    } catch(e){}
  }
  async function setRerank(){
    try {
      var on = el('rerank').checked;
      if(memory) memory.rerank = on;
      renderMemorySummary(memory);
      await fetch('/set-rerank?on=' + (on ? 1 : 0), { method: 'POST' });
      if(el('bq').value.trim().length >= 2) memorySearch();
    } catch(e){}
  }
  async function setScope(){
    try {
      await fetch('/set-scope?on=' + (el('ball').checked ? 1 : 0), { method: 'POST' });
      if(el('bq').value.trim().length >= 2) memorySearch();
    } catch(e){}
  }
  function setPill(id, txt){ const p = el(id); if(p) p.textContent = txt; }
  // Sync depth (plan 08 §7): Lean = source rows only (default, ~74% smaller) ·
  // Full = whole-DB snapshot (disaster restore). Drive summary carries d.level.
  function renderSyncLevel(level){
    var lean = el('lvLean'), full = el('lvFull');
    if(!lean || !full) return;
    var isFull = level === 'full';
    lean.classList.toggle('on', !isFull);
    full.classList.toggle('on', isFull);
  }
  async function setSyncLevelUI(level){
    renderSyncLevel(level); // optimistic
    try { var r = await (await fetch('/set-sync-level?level=' + level, { method: 'POST' })).json(); renderSyncLevel(r.level); } catch(e){}
  }
  function renderDriveState(d){
    if(d) renderSyncLevel(d.level);
    const s = el('driveState');
    s.title = (d && d.error) ? d.error : '';
    if(!d || !d.linked){ s.className = 'drive-state'; s.textContent = t('d.notlinked'); setPill('drivePillTxt', t('d.notlinked')); return; }
    if(!d.exists){ s.className = 'drive-state bad'; s.textContent = '✗ ' + (/^https?:/i.test(d.path) ? t('d.pastelocal') : t('d.nofolder')); setPill('drivePillTxt', t('d.err')); return; }
    if(!d.writable){ s.className = 'drive-state bad'; s.textContent = t('d.readonly'); setPill('drivePillTxt', t('d.readonly')); return; }
    s.className = 'drive-state ok'; s.textContent = t('d.linked') + ' · ' + fmtN(d.bundles) + ' ' + t('d.bundle'); setPill('drivePillTxt','✓ ' + fmtN(d.bundles) + ' ' + t('d.bundle'));
  }
  function renderStorageState(s){
    const el0 = el('storageState');
    if(!s){ el0.className = 'drive-state'; el0.textContent = ''; setPill('storagePillTxt','—'); return; }
    const mb = s.exists ? (s.sizeKB/1024).toFixed(0) + ' MB' : t('s.empty');
    if(s.pinnedByEnv){ el0.className = 'drive-state'; el0.textContent = t('s.envpin'); el0.title = 'GLOBAL_MEMORY_DB'; setPill('storagePillTxt', t('s.envpin')); return; }
    if(s.onCloud){ el0.className = 'drive-state bad'; el0.textContent = t('s.oncloud'); el0.title = s.dir; setPill('storagePillTxt','⚠ Drive'); return; }
    el0.className = 'drive-state ok'; el0.textContent = '✓ ' + (s.source === 'default' ? t('s.defaultC') : t('s.moved')) + ' · ' + mb; el0.title = s.dbPath;
    setPill('storagePillTxt', (s.source === 'default' ? t('s.shortC') : t('s.moved')) + ' · ' + mb);
  }
  async function relocateStorage(){
    const path = el('storageLink').value.trim();
    if(!path){ alert(t('rel.needpath')); return; }
    if(!confirm(t('rel.confirm') + '\n' + path + '\n\n' + t('rel.confirm2'))) return;
    const ss = el('storageState'), rb = el('relocateBtn');
    ss.className = 'drive-state'; ss.textContent = t('s.moving'); if(rb) rb.disabled = true;
    try {
      const r = await (await fetch('/relocate?path=' + encodeURIComponent(path), { method: 'POST' })).json();
      if(!r.ok){ ss.className = 'drive-state bad'; ss.textContent = t('s.err') + ' ' + (r.error||''); ss.title = r.error||''; if(rb) rb.disabled = false; return; }
      if(r.pointerOnly){ ss.className = 'drive-state ok'; ss.textContent = t('s.setptr'); }
      else { ss.className = 'drive-state ok'; ss.textContent = t('s.movedOk') + ' · ' + (r.movedBytes/1048576).toFixed(0) + ' MB · ' + r.messages + ' msg'; ss.title = t('rel.bak') + (r.backup||'') + t('rel.bakhint'); }
      if(rb) rb.disabled = false;
      memoryTick();
    } catch(e){ ss.className = 'drive-state bad'; ss.textContent = t('s.err'); if(rb) rb.disabled = false; }
  }
  async function testDrive(){
    const path = el('driveLink').value.trim();
    el('driveState').className = 'drive-state'; el('driveState').textContent = '…';
    try {
      const d = await (await fetch('/set-drive?path=' + encodeURIComponent(path), { method: 'POST' })).json();
      renderDriveState(d);
    } catch(e){ el('driveState').className = 'drive-state bad'; el('driveState').textContent = t('d.err'); }
  }
  async function openDoc(file){
    el('docName').textContent = file;
    el('docBody').textContent = t('dv.loading');
    el('docOverlay').style.display = 'flex';
    try {
      const r = await (await fetch('/doc' + ru({file: file}))).json();
      el('docBody').textContent = r.content || t('dv.empty');
    } catch(e){ el('docBody').textContent = t('dv.err') + e; }
  }
  async function openStandardDoc(file){
    el('docName').textContent = 'STANDARD · ' + file;
    el('docBody').textContent = t('dv.loading');
    el('docOverlay').style.display = 'flex';
    try {
      const r = await (await fetch('/standard-doc?file=' + encodeURIComponent(file))).json();
      el('docBody').textContent = r.content || t('dv.empty');
    } catch(e){ el('docBody').textContent = t('dv.err') + e; }
  }
  function closeDoc(){ el('docOverlay').style.display = 'none'; }
  function clearFilters(){ el('fTime').value = '0'; el('fType').value = ''; el('fOrigin').value = ''; el('fAgent').value = ''; memorySearch(); }
  async function openSession(sid){
    el('sessName').textContent = 'Full session';
    el('sessMeta').textContent = '';
    el('sessBody').innerHTML = '<div class="muted">' + t('ss.loading') + '</div>';
    el('sessionOverlay').style.display = 'flex';
    try {
      const s = await (await fetch('/memory-session' + ru({id: sid}))).json();
      if(!s || !s.messages){ el('sessBody').innerHTML = '<div class="muted">' + t('ss.notfound') + '</div>'; return; }
      el('sessName').textContent = s.title || projName(s.project);
      el('sessMeta').textContent = esc(s.source) + ' · ' + esc(projName(s.project)) + ' · ' + s.messages.length + t('ss.msgs') + (s.truncated ? t('ss.trunc1') + s.messages.length + t('ss.trunc2') : '');
      el('sessBody').innerHTML = s.messages.map(m =>
        '<div class="smsg ' + esc(m.role || '') + '"><div class="role">' + esc(m.role || 'message') + ' · ' + fmtDay(m.timestamp) + ' · #' + m.id + '</div><div class="txt">' + esc(m.content || '') + '</div></div>'
      ).join('');
      el('sessBody').scrollTop = 0;
    } catch(e){ el('sessBody').innerHTML = '<div class="muted">' + t('ss.err') + esc(e) + '</div>'; }
  }
  function closeSession(){ el('sessionOverlay').style.display = 'none'; }
  // Closing the box only HIDES it (run-hidden, user 2026-07-21) — the sync job
  // itself runs in a daemon-side child process and keeps going; the Global tab
  // shows a spinner while window.__syncing and pollSyncStatus keeps tracking.
  function closeSyncBox(){ el('syncOverlay').style.display = 'none'; }
  var __syncTimer = null, __syncStartedAt = 0, __syncPolling = false;
  function startSyncElapsed(at){
    __syncStartedAt = at || Date.now();
    if(__syncTimer) clearInterval(__syncTimer);
    __syncTimer = setInterval(function(){ var s = Math.max(0, Math.floor((Date.now() - __syncStartedAt) / 1000)), e = document.getElementById('syncElapsed'); if(e) e.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 1000);
  }
  function stopSyncElapsed(){ if(__syncTimer){ clearInterval(__syncTimer); __syncTimer = null; } }
  function paintSyncProgress(){
    el('syncBox').innerHTML =
      '<div class="spinner"></div>' +
      '<div class="sync-step"><b>' + t('sy.syncing') + '</b><span id="syncElapsed" style="margin-left:auto;font-variant-numeric:tabular-nums;color:var(--text)">0:00</span></div>' +
      '<div class="sync-step">' + t('sy.s1') + '</div>' +
      '<div class="sync-step">' + t('sy.s2') + '</div>' +
      '<div class="sync-step">' + t('sy.s3') + '</div>' +
      '<div class="sync-step">' + t('sy.s4') + '</div>' +
      '<div class="sync-step tiny" style="margin-top:6px">' + t('sy.note') + '</div>' +
      syncCloseBtn(t('sy.hide'));
  }
  function finishSyncUi(st){
    stopSyncElapsed();
    window.__syncing = false;
    renderTabs();
    const ds = el('driveState'), sb = el('syncBtn');
    if(sb) sb.disabled = false;
    const r = (st && st.result) || {};
    if(!st || st.ok === false || r.ok === false){
      const msg = (st && st.error) || r.error || t('sy.unknown');
      if(ds){ ds.className = 'drive-state bad'; ds.textContent = t('sy.failShort'); ds.title = msg; }
      el('syncBox').innerHTML = '<div class="sync-step" style="color:var(--amber)"><b>' + t('sy.failed') + '</b></div><div class="sync-step">' + esc(msg) + '</div>' + syncCloseBtn();
      return;
    }
    const ms = (r.merged || []).filter(function(m){ return !m.skipped; });
    const added = ms.reduce((a, m) => a + (m.messagesAdded || 0), 0);
    const captured = (r.scanned && r.scanned.newMessages) || 0;
    // Push line reflects the DELTA series: baseline / delta / compact / nothing.
    var push = r.push || { kind: 'baseline', bytes: r.exportedBytes || 0, messages: 0 };
    var pushLbl = push.kind === 'none'
      ? t('sy.pushNone')
      : t('sy.push_' + push.kind) + ' · <b>' + fmtN(push.messages) + '</b> msg · <b>' + fmtBytes((push.bytes || 0) / 1024) + '</b>' + (push.removed ? ' (−' + push.removed + ' file)' : '');
    if(ds){ ds.className = 'drive-state ok'; ds.textContent = t('sy.okShort'); }
    el('syncBox').innerHTML =
      '<div class="sync-step sync-done"><b>' + t('sy.done') + '</b></div>' +
      '<div class="sync-step">' + t('sy.scanned') + '<b>+' + fmtN(captured) + '</b>' + t('sy.newmsg') + '</div>' +
      '<div class="sync-step">' + t('sy.exported') + pushLbl + '</div>' +
      '<div class="sync-step">' + t('sy.merged1') + '<b>' + ms.length + '</b>' + t('sy.merged2') + '<b>+' + fmtN(added) + '</b> msg</div>' +
      '<div class="sync-step">' + t('sy.embedded1') + '<b>' + fmtN(r.embedded || 0) + '</b>' + t('sy.embedded2') + (r.vectorRemaining ? ' · ⚠ ' + fmtN(r.vectorRemaining) + t('sy.pending') : '') + '</div>' +
      '<div class="sync-step tiny" style="margin-top:6px">' + t('sy.cloudnote') + '</div>' +
      syncCloseBtn();
    memoryTick();
  }
  async function pollSyncStatus(){
    if(__syncPolling) return;
    __syncPolling = true;
    try {
      for(;;){
        let st = null;
        try { st = await (await fetch('/sync-status')).json(); } catch(e){ /* daemon busy — keep polling */ }
        if(st && st.running){
          window.__syncing = true;
          if(st.startedAt && Math.abs(st.startedAt - __syncStartedAt) > 2000) startSyncElapsed(st.startedAt);
        } else if(st){
          finishSyncUi(st);
          return;
        }
        await new Promise(function(res){ setTimeout(res, 2000); });
      }
    } finally { __syncPolling = false; }
  }
  async function driveSync(){
    const ds = el('driveState'), sb = el('syncBtn');
    if(ds){ ds.className = 'drive-state'; ds.textContent = t('sy.syncingShort'); ds.title = ''; }
    if(sb) sb.disabled = true;
    window.__syncing = true;
    renderTabs();
    paintSyncProgress();
    el('syncOverlay').style.display = 'flex';
    startSyncElapsed(Date.now());
    try {
      // Starts the daemon-side child job and returns IMMEDIATELY (the old await
      // held this fetch — and the whole single-threaded daemon — for minutes).
      const r = await (await fetch('/drive-sync', { method: 'POST' })).json();
      if(r && r.ok === false){ finishSyncUi({ running: false, ok: false, error: r.error }); return; }
      if(r && r.startedAt) startSyncElapsed(r.startedAt);
    } catch(e){ finishSyncUi({ running: false, ok: false, error: String(e) }); return; }
    pollSyncStatus();
  }
  // Page (re)load while a sync runs in the daemon: resume the spinner + polling.
  (function resumeSyncState(){
    fetch('/sync-status').then(function(x){ return x.json(); }).then(function(st){
      if(st && st.running){ window.__syncing = true; renderTabs(); startSyncElapsed(st.startedAt || Date.now()); pollSyncStatus(); }
    }).catch(function(){});
  })();
  function syncCloseBtn(label){ return '<button class="ghost" style="margin-top:12px;width:100%" onclick="closeSyncBox()">' + (label || t('sy.close')) + '</button>'; }
  async function memoryScan(deep){
    el('memorymsg').textContent = deep ? t('sn.deep') : t('sn.known');
    el('memoryreport').innerHTML = '';
    try {
      const r = await (await fetch('/memory-scan' + (deep ? '?deep=1' : ''), { method: 'POST' })).json();
      el('memorymsg').textContent = t('sn.loaded') + fmtN(r.totals.newMessages) + t('sn.msg') + r.changedFiles + t('sn.changed') + r.scannedFiles + t('sn.file');
      let h = '';
      if(r.unknown && r.unknown.length) h += '<div class="chip warn">' + r.unknown.length + t('sn.strange') + '</div>';
      if(r.stores && r.stores.length) {
        h += sectionTitle(t('sn.stores'));
        h += r.stores.slice(0, 6).map(s => folderLine(s.source, s.root, 'transcripts')).join('');
      }
      if(r.sessions && r.sessions.length) h += sectionTitle(t('sn.changedS'));
      h += (r.sessions || []).slice(0, 8).map(s => miniRow(s.source + ' / ' + projName(s.project), '+' + fmtN(s.newMessages) + ' msg')).join('');
      el('memoryreport').innerHTML = h;
      await memoryTick();
      await tick();
    } catch(e){ el('memorymsg').textContent = t('sn.err') + e; }
  }
  function onType(){ clearTimeout(typer); typer = setTimeout(function(){ memorySearch(false); }, 220); }
  async function memorySearch(commit){
    const q = el('bq').value.trim();
    if(q.length < 2){
      el('resultCount').textContent = t('recall.hint');
      el('memoryhits').innerHTML = '<div class="empty">' + t('recall.empty') + '</div>';
      el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('recall.waiting') + '</span></div><div class="empty">' + t('recall.previewEmpty') + '</div>';
      return;
    }
    const all = el('ball').checked;
    const terms = queryTerms();
    el('resultCount').textContent = t('q.searching');
    el('memoryhits').innerHTML = '<div class="empty">' + t('q.searching') + '</div>';
    try {
      const hits = await (await fetch('/memory-search' + ru({q: q, all: all ? '1' : '0', days: el('fTime').value, agent: el('fAgent').value, role: el('fType').value, origin: el('fOrigin').value, commit: commit ? '1' : '0'}))).json();
      if(!hits.length){
        el('resultCount').textContent = t('q.0');
        el('memoryhits').innerHTML = '<div class="empty">' + t('q.nomatch') + (all ? t('q.nomatchdot') : t('q.nomatchproj')) + '</div>';
        el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.emptyState') + '</span></div><div class="empty">' + t('q.noSel') + '</div>';
        return;
      }
      el('resultCount').textContent = hits.length + t('q.results');
      lastHits = hits;
      selectedHit = hits[0].id;
      renderHits();
      await selectHit(selectedHit);
    } catch(e){
      el('resultCount').textContent = t('q.err');
      el('memoryhits').innerHTML = '<div class="empty">' + t('q.errbody') + esc(e) + '</div>';
    }
  }
  function renderHitRow(h, i, terms){
    const title = (h.role ? h.role + ' · ' : '') + projName(h.project);
    return '<div class="result-row ' + (h.id === selectedHit ? 'selected' : '') + '" id="hit' + h.id + '" onclick="selectHit(' + h.id + ')">' +
      '<div class="score">' + scoreValue(h, i) + '</div>' +
      '<div><div class="result-title"><span>' + esc(title) + '</span>' + badge(h.source || 'session', 'on') + badge(projName(h.project), '') + '</div>' +
      '<div class="result-snip">' + highlight(clip(h.snippet, 170), terms) + '</div>' +
      '<div class="result-foot"><span>' + fmtDay(h.timestamp) + '</span><span>#' + h.id + '</span><span>' + esc(h.role || 'message') + '</span></div></div>' +
      '<div class="open-arrow" onclick="event.stopPropagation();openSession(\'' + esc(h.sessionId) + '\')" title="' + t('q.openfull') + '">⤢</div></div>';
  }
  function renderHits(){
    const terms = queryTerms();
    const hits = lastHits.slice();
    if(sortMode === 'new') hits.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    else if(sortMode === 'old') hits.sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')));
    el('memoryhits').innerHTML = hits.map((h, i) => renderHitRow(h, i, terms)).join('');
  }
  function updateSortLabel(){
    var s = el('sortState'); if(!s) return;
    s.textContent = t(sortMode === 'rel' ? 'so.rel' : sortMode === 'new' ? 'so.new' : 'so.old') + ' ⇅';
  }
  function cycleSort(){
    sortMode = sortMode === 'rel' ? 'new' : sortMode === 'new' ? 'old' : 'rel';
    updateSortLabel();
    if(lastHits.length) renderHits();
  }
  async function selectHit(id){
    selectedHit = id;
    document.querySelectorAll('.result-row').forEach(n => n.classList.toggle('selected', n.id === 'hit' + id));
    el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.loadingS') + '</span></div><div class="empty">' + t('q.loadingctx') + '</div>';
    try {
      const ctx = await (await fetch('/memory-context' + ru({id: id}))).json();
      if(!ctx || !ctx.messages){
        el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('q.emptyState') + '</span></div><div class="empty">' + t('q.nocontext') + '</div>';
        return;
      }
      const terms = queryTerms();
      const thread = ctx.messages.map(m =>
        '<div class="tmsg ' + (m.isHit ? 'hit' : 'ctx') + '"><span class="who">' + esc(m.role) + '</span>' +
        (m.isHit ? highlight(clip(m.content, 1200), terms) : esc(clip(m.content, 390))) + '</div>'
      ).join('');
      el('threadPreview').innerHTML =
        '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + ctx.messages.length + t('q.nearby') + '</span>' +
        '<button class="ghost" style="padding:4px 9px;margin-left:auto" onclick="openSession(\'' + esc(ctx.sessionId) + '\')">' + t('q.fullsession') + '</button></div>' +
        '<div class="preview-meta">' + t('q.selmsg') + id + '</div>' +
        '<div class="thread">' + thread + '</div>';
    } catch(e){
      el('threadPreview').innerHTML = '<div class="preview-title"><b>' + t('recall.preview') + '</b><span>' + t('ctx.error') + '</span></div><div class="empty">' + t('ctx.err') + esc(e) + '</div>';
    }
  }
  // ---- Settings modal + i18n ----------------------------------------------
  var T = {
    vi: {
      'bar.env':'Máy: local','bar.settings':'Cài đặt','brand.tag':'Bộ nhớ & harness docs cho agent lập trình · v0.0.1',
      'proj.title':'Dự án','proj.sub':'Docs & quy tắc của dự án đang chọn.','proj.run':'Chạy','proj.add':'+ Thêm','proj.target':'Dự án đích: ',
      'recall.sub':'Tìm trong các phiên Codex, Claude, Continue, LM Studio đã lưu.','recall.search':'Tìm','recall.scope':'Mọi dự án','recall.clear':'Xoá lọc','recall.hint':'Gõ ít nhất 2 ký tự để tìm.','recall.empty':'Kết quả tìm sẽ hiện ở đây.','recall.preview':'Xem trước phiên','recall.waiting':'chờ','recall.previewEmpty':'Chọn một kết quả để xem các message lân cận ngay tại đây.',
      'mem.title':'Bộ nhớ toàn cục','scan.title':'Nạp & Đồng bộ','scan.sub':'Đưa ngữ cảnh vào memory: từ máy này, và từ máy khác qua Drive.','scan.known':'Quét nhanh','scan.deep':'Quét sâu','proj2.title':'Dự án','proj2.sub':'Chi tiết bộ nhớ từng dự án — bấm để mở tab.','cov.openTip':'Bấm để mở tab dự án này.',
      'set.title':'Cài đặt','set.lang':'Ngôn ngữ','set.storage':'Nơi lưu','set.auto':'Tự động','set.search':'Tìm kiếm','set.health':'Kiểm tra',
      'auto.h':'Tự động','auto.d':'zemory tự chạy nền: mở cùng máy, tự cập nhật vector, tự đồng bộ. Lưu vào config.json.',
      'lang.h':'Ngôn ngữ giao diện','lang.d':'Chọn một ngôn ngữ cho toàn bộ giao diện. Thuật ngữ kỹ thuật (Recall, Hybrid, FTS5…) giữ nguyên.','lang.row':'Ngôn ngữ','lang.note':'Áp dụng ngay, lưu vào config.json.',
      'storage.h':'Nơi lưu dữ liệu','storage.d':'DB memory nên nằm ngoài ổ C để ổ C không phình. Con trỏ ~/.zemory/location.json ghi nhớ chỗ này.','storage.folder':'Thư mục lưu memory','storage.move':'Dời','storage.warn':'⚠ Không chọn folder Google Drive / OneDrive đang sync — DB đang mở sẽ hỏng.',
      'drive.h':'Đồng bộ qua Drive','drive.d':'Mỗi máy xuất một bundle mã hoá vào folder Drive; máy khác merge vào. DB sống KHÔNG bị sync trực tiếp.','drive.folder':'Folder Drive',
      'synclv.row':'Mức độ đồng bộ','synclv.note':'Gọn: chỉ tin nhắn (nhẹ ~74%). Đầy đủ: cả DB (khôi phục thảm hoạ, nặng hơn nhiều).','synclv.lean':'Gọn','synclv.full':'Đầy đủ',
      'search.h':'Mặc định tìm kiếm','search.d':'Bật/tắt cũng đổi ngay trên thanh Recall. Lưu vào config.json.',
      'health.h':'Kiểm tra hệ thống','health.d':'Các tính năng lõi có chạy được trên máy này không (FTS5, recall, harness).','health.retest':'Kiểm tra lại',
      'docs.d':'Đồng bộ / dựng lại bộ docs chuẩn cho dự án. Không bao giờ ghi đè nguồn trong DB.','docs.sync':'Thêm docs còn thiếu, giữ nguyên nguồn DB.','docs.fresh':'Dựng mới','docs.freshD':'Giữ docs cũ sang bên, tạo bộ sạch.',
      'tab.global':'Global Memory','tab.graphSoon':'Graph của dự án này — sắp có (Code · Docs · soi lỗi)',
      'gsub.recall':'Recall & Chuẩn chung','gsub.mem':'Bộ nhớ & Đồng bộ',
      'psub.harness':'Harness','psub.graph':'Graph','psub.checks':'Kiểm tra chi tiết',
      'tree.noproj':'Chưa chọn dự án','tree.loading':'Đang đọc cây thư mục…','tree.empty':'Không có thư mục','tree.nonstd':'ngoài chuẩn','tree.slots':'slot chuẩn đã dùng','tree.nonstdN':'ngoài chuẩn','tree.collapseAll':'Thu gọn hết','tree.expandAll':'Mở hết',
      'graph.orphans':'Chỉ orphan','graph.rebuild':'Dựng lại','graph.building':'Đang dựng graph…','graph.empty':'Không có file nguồn','graph.hint':'Bấm node: soi import + sáng folder trong cây · lăn chuột: thu phóng · kéo nền: di chuyển · bấm đúp nền: về 1:1.','graph.loc':'dòng',
      'chk.memory':'Toàn vẹn memory','chk.workflow':'Quy trình',
      'std.title':'Chuẩn dùng chung','std.sub':'Bản mẫu áp cho mọi dự án — chỉ đọc.',
      'std.agents.p':'Cửa vào harness — router điều hướng thuần.','std.agents.s':'Banner ⛔ chỉ-đọc nếu ghé tham khảo · "project dùng zemory, mọi thứ ở docs/" · 3 bước vào việc. KHÔNG chứa luật.',
      'std.const.p':'Hiến pháp — bất biến KIẾN TRÚC riêng app, tầng tối cao, chỉ user chốt.','std.const.s':'Mục đích + phi-mục-tiêu + các điều khoản bất biến: token-first · 1 nguồn sự thật · không proxy LLM · local-only · fail-open · đo trung thực.',
      'std.rules.p':'Luật LÀM VIỆC chung mọi project (ship từ template).','std.rules.s':'Ngôn ngữ docs · FILE WINS · chốt phiên · git không tự push · phạm vi project · hỏi khi chưa rõ · không tự xóa · UI phải trình duyệt.',
      'std.struct.p':'Chuẩn cấu trúc folder + INDEX điều hướng "sửa gì → vào đâu".','std.struct.s':'2 chuẩn APP/NON-APP · 4 vai trò bắt buộc · từ điển ~40 slot + routing · layer/domain-first · convention (dialog 3-size, no-build, icon 3 vai trò).',
      'std.skills.p':'Kho skill — playbook thao tác.','std.skills.s':'grill · chốt phiên · reconcile (inline) + skill vendored (external/skills). Guardrail: file không phình.',
      'std.todo.p':'Backlog việc.','std.todo.s':'[ ] chưa làm · [~] đang làm · xong → CHANGES. Ưu tiên kế tiếp + quyết định mở.',
      'std.chg.p':'Changelog.','std.chg.s':'Mới nhất trên cùng · supersede khi đảo quyết định cũ · chỉ ghi sau khi user OK.',
      'tab.moreTitle':'Dự án khác','tab.addTitle':'Thêm dự án','tab.manageTitle':'Quản lý dự án','tab.themeTitle':'Đổi giao diện sáng/tối',
      'tab.menuHead':'Dự án đã biết','tab.none':'Chưa có dự án nào.','tab.pin':'Ghim lên thanh tab','tab.unpin':'Bỏ ghim','tab.forget':'Gỡ khỏi danh sách',
      'tab.forgetConfirm':'Gỡ dự án này khỏi danh sách của zemory? Folder, docs và dữ liệu memory KHÔNG bị đụng tới.',
      'tab.forgetNote':'Gỡ chỉ sửa danh sách của zemory — không xoá file.','tab.prune':'Dọn dự án đã mất','tab.pruned':'Đã dọn {n} mục.',
      'r.std':'Chuẩn dùng chung','r.noproj':'Chưa có dự án','r.runinit':'chạy zemory init','r.projdocs':'Docs dự án này (bấm để đọc)','r.setup':'Cài đặt / onboarding','r.plan':'Bản sao plan','r.docs':'docs','r.known':'dự án đã biết',
      'itab.memory':'Bộ nhớ','itab.capture':'Nạp & Đồng bộ','itab.coverage':'Dự án','itab.standard':'Chuẩn chung','scan.local':'Máy này',
      'addp.title':'Thêm dự án','addp.d':'Dán đường dẫn folder của dự án. Repo chưa có harness sẽ hiện là "chưa thiết lập" cho tới khi chạy Run.','addp.ph':'vd D:\\Zyro\\App\\MyProject','addp.ok':'Thêm','addp.cancel':'Huỷ',
      'glay.force':'Layout: force','glay.cluster':'Layout: cluster','glay.layers':'Layout: import layers','tt.glayout':'Cách xếp node: force (theo liên kết) · cluster (gom theo folder) · import layers (entry trái → bị import sâu nhất phải)',
      'nc.colQ':'câu hỏi của agent','nc.colSweep':'đọc mù','nc.colRouted':'qua zemory','nc.colRatio':'rẻ hơn',
      'nc.tipLocate':'Muốn biết sửa X ở đâu: đọc mù = đọc HẾT file nguồn của repo; qua zemory = tra bảng routing 03_STRUCTURE §4 (trỏ thẳng slot). Số = token ước tính từ byte thật.',
      'nc.tipImpact':'Muốn biết sửa file này đụng ai: đọc mù = mở mọi file để lần import; qua zemory = graph trả sẵn danh sách fan-in.',
      'nc.tipRecall':'Muốn biết phiên trước làm gì: đọc mù = đọc lại toàn bộ phiên cũ của dự án trong memory; qua zemory = 1 lần recall trả 12 snippet.',
      'nc.h':'Chi phí điều hướng — dò full → qua zemory','nc.locate':'"sửa X ở đâu?"','nc.impact':'"sửa file này đụng ai?"','nc.recall':'"phiên trước làm gì?"',
      'fit.h':'Code fitness','fit.hub_pct':'hub','fit.isolated_pct':'isolated','fit.util_violations':'util purity',
      'fit.help':'Chấm sức khoẻ CẤU TRÚC code từ import-graph — tất định, chạy lại được (CLI: zemory graph fitness). Xanh = trong ngưỡng; vàng = lệch chuẩn, rê chuột từng thẻ để xem vì sao.',
      'fit.dHub':'{n}/{files} file là HUB (≥8 file khác import nó). Hub càng nhiều, sửa đâu cũng lan rộng. Trần {th}.',
      'fit.dIso':'Tỷ lệ file KHÔNG nối import với ai trong {files} file (có thể là entry/script hợp lệ, hoặc code chết). Trần {th}.',
      'fit.dUtil':'util phải THUẦN helper: {n} file util đang import logic nghiệp vụ. Trần {th}.',
      'fit.hubsTip':'File nóng nhất (fan-in) — sửa là lan rộng; chạy zemory graph impact <file> trước khi đụng',
      'm.msgs':'tin nhắn','m.sess':'phiên','m.tok':'token bộ nhớ','m.size':'dung lượng DB','m.healthy':'Khoẻ','m.empty':'Trống','m.updated':'cập nhật','m.capcost':'token phí thu','m.recall':'token mỗi recall','m.search':'Tìm kiếm','m.ftsonly':'chỉ FTS','m.pending':'chờ','m.err':'lỗi','m.sources':'Nguồn','m.excl':'loại','m.untick':' — bỏ tick để loại khỏi sync + recall','m.tables':'Bảng','m.none':'không có',
      'sc.origin':'nguồn: mọi','sc.host':'máy (trống=mọi)','sc.source':'agent/nền tảng (trống=mọi)','sc.add':'+ Thêm','sc.rm':'Bỏ luật loại này',
      'cov.none':'Chưa có folder dự án nào được thu.','cov.sess':'phiên','cov.msg':'msg','cov.agent':'agent','cov.linked':'đã liên kết','cov.found':'Quét được (chưa liên kết)','cov.local':'máy này',
      'd.notlinked':'chưa liên kết','d.linked':'✓ đã liên kết','d.bundle':'bundle','d.readonly':'⚠ chỉ đọc','d.pastelocal':'dán folder local','d.nofolder':'không thấy folder','d.err':'✗ lỗi',
      's.defaultC':'ổ C (mặc định)','s.shortC':'ổ C','s.moved':'đã dời','s.empty':'trống','s.envpin':'ghim bởi env','s.oncloud':'⚠ trên Drive (rủi ro)','s.moving':'đang dời...','s.setptr':'✓ đã đặt nơi lưu','s.movedOk':'✓ đã dời','s.err':'✗ lỗi',
      'rel.needpath':'Nhập folder muốn lưu memory, vd D:\\\\Zyro\\\\Tool\\\\Zemory\\\\data','rel.confirm':'Dời DB memory sang:','rel.confirm2':'App sẽ checkpoint + copy + verify rồi đổi con trỏ. Bản cũ được GIỮ lại dạng .bak (không mất gì). Tiếp tục?','rel.bak':'Bản cũ giữ ở: ','rel.bakhint':' (xoá tay khi chắc chắn OK)',
      'sy.title':'Đồng bộ xuyên máy','sy.syncing':'Đang đồng bộ…','sy.s1':'1 · quét máy này tìm phiên mới','sy.s2':'2 · xuất phần MỚI thành bundle mã hoá (delta)','sy.s3':'3 · merge bundle của mọi máy khác','sy.s4':'4 · nhúng vector mới','sy.note':'Xuất phần mới (delta) đã mã hoá — thường chỉ vài KB. Đang chạy; cứ để mở.','sy.failed':'✗ Đồng bộ thất bại','sy.unknown':'lỗi không rõ','sy.done':'✓ Đồng bộ local xong','sy.scanned':'Đã quét máy này · ','sy.newmsg':' msg mới thu','sy.exported':'Đã đẩy · ','sy.pushNone':'không có gì mới','sy.push_baseline':'baseline','sy.push_delta':'delta','sy.push_compact':'gộp baseline','sy.push_full':'snapshot đầy đủ','sy.merged1':'Merge ','sy.merged2':' bundle khác · ','sy.embedded1':'Đã nhúng ','sy.embedded2':' vector mới','sy.pending':' chờ (chạy memory embed --all)','sy.cloudnote':'⏳ Google Drive vẫn đang tải lên cloud ở nền — máy khác nhận được khi Drive xong (xem icon khay Drive).','sy.errorT':'✗ Lỗi đồng bộ','sy.close':'Đóng','sy.hide':'Chạy ẩn','sy.syncingShort':'đang đồng bộ...','sy.okShort':'✓ đã đồng bộ','sy.failShort':'✗ đồng bộ lỗi','sy.errShort':'✗ lỗi',
      'sn.deep':'Đang quét sâu cả máy...','sn.known':'Đang quét các vị trí đã biết...','sn.loaded':'Nạp thêm +','sn.msg':' message · ','sn.changed':' phiên đổi · quét ','sn.file':' file.','sn.strange':' store lạ','sn.stores':'Store đã quét','sn.changedS':'Phiên đã đổi','sn.err':'lỗi quét: ',
      'q.searching':'Đang tìm...','q.0':'0 kết quả','q.nomatch':'Không khớp','q.nomatchdot':'.','q.nomatchproj':' trong dự án này. Thử mọi dự án.','q.results':' kết quả','q.err':'Lỗi tìm','q.errbody':'lỗi tìm: ','q.noSel':'Chưa chọn kết quả.','q.emptyState':'trống','q.loadingctx':'đang tải ngữ cảnh...','q.loadingS':'đang tải','q.nocontext':'(không có ngữ cảnh)','q.nearby':' lân cận','q.fullsession':'Phiên đầy đủ ⤢','q.selmsg':'Message đã chọn #','q.openfull':'Mở phiên đầy đủ',
      'ss.loading':'đang tải phiên...','ss.notfound':'(không thấy phiên)','ss.msgs':' messages','ss.trunc1':' (hiển thị ','ss.trunc2':' đầu — phiên còn dài hơn)','ss.err':'lỗi phiên: ',
      'so.rel':'Sắp theo liên quan','so.new':'Sắp mới nhất','so.old':'Sắp cũ nhất',
      'ph.search':'ví dụ: cách stream tool output cho agent','ph.addproj':'Thêm dự án bằng đường dẫn folder…','f.agentAny':'Agent: mọi','f.timeAny':'Thời gian: mọi lúc','f.time24':'24h qua','f.time7':'7 ngày','f.time30':'30 ngày','f.time90':'90 ngày','f.typeAny':'Loại: mọi','f.originAny':'Nguồn: mọi',
      'dv.loading':'đang tải...','dv.empty':'(trống)','dv.err':'lỗi: ','ctx.err':'lỗi ngữ cảnh: ','ctx.error':'lỗi',
      'act.working':'đang xử lý...','act.nonstd':'Docs chưa chuẩn — chạy zemory migrate, docs ls/rm/render.','act.added':'đã thêm ','act.nomiss':'không thiếu gì','act.renamed':'đã đổi tên cũ → ','act.created':'đã tạo .harness.json — ',
      'tt.runHarness':'Chạy harness: dựng docs của dự án theo chuẩn (bổ sung file thiếu, đánh số plan, không ghi đè nguồn DB)','tt.settings':'Cài đặt','tt.refresh':'Làm mới','tt.storage':'Nơi lưu DB memory','tt.drive':'Đồng bộ Drive','tt.scopeAll':'Tìm trong phiên của MỌI dự án (memory là toàn cục). Tắt = chỉ dự án đang chọn.','tt.hybrid':'Recall semantic: FTS + vector. Tắt = chỉ keyword FTS.','tt.rerank':'Cross-encoder rerank: xếp lại top ứng viên cho sắc nét hơn. Cần model reranker.','tt.fTime':'Lọc theo thời gian','tt.fType':'Lọc theo vai trò message','tt.fOrigin':'Local = transcript agent trên đĩa; Web = web-chat đã thu (ChatGPT/…)','tt.fAgent':'Lọc theo agent/nguồn','tt.sort':'Bấm để đổi cách sắp (liên quan / mới nhất / cũ nhất)','tt.resize':'Kéo để chỉnh cỡ. Bấm đúp để reset.','tt.scan':'Đọc transcript agent trên MÁY NÀY vào memory. "Quét nhanh" đọc lại store đã biết (nhanh); "Quét sâu" rà cả ổ đĩa tìm folder agent mới.','tt.projects':'Các folder dự án đã có phiên được thu, kèm số phiên / message / agent mỗi dự án.','tt.close':'Đóng','tt.std':'Harness chuẩn trong docs_template/ — đi kèm zemory, tách khỏi docs của dự án. Đây là thứ Run dựng ra và agent điều chỉnh cho từng dự án. Chỉ đọc (sửa chuẩn trong docs_template/).','tt.brand':'zemory · bộ nhớ & harness docs cho agent','tt.scopeTree':'Lane nguồn (máy/agent Local, nền tảng Web) nào feed vào sync + recall. Bỏ tick lane chung/nhiễu để loại — vừa sạch nguồn cho harness vừa ít token rác cho recall. Là bộ lọc, không xoá: dữ liệu vẫn trong DB local.','tt.capcost':'Thu thập là miễn phí: hook đọc FILE transcript của agent lúc kết thúc phiên — không gọi model, không tốn API. ~token bộ nhớ = SUM(len)/4, đo lượng ngữ cảnh memory ĐANG GIỮ (tài sản), KHÔNG phải token đã tiêu.','tt.navcost':'Đo cái cấu trúc zemory MUA được, bằng token. Cột trái = quét mù (đọc hết file nguồn / đọc lại phiên cũ); cột phải = thứ index-routing / graph / memory trả thẳng về. CẢ HAI VẾ đều tính từ byte thật trên đĩa + message thật trong memory — không ước lượng. Đây KHÔNG phải "hoá đơn giảm N token" (cái đó là counterfactual, điều 12 cấm): nó là so sánh 2 cách đọc cụ thể cho cùng một câu hỏi.','tt.recall':'Token THẬT mỗi lần recall bơm vào ngữ cảnh: memory trả các snippet ngắn, mở full message khi cần (progressive disclosure). Đây là chi phí ĐO ĐƯỢC của việc DÙNG memory. zemory cố tình KHÔNG trưng số "đã tiết kiệm" — đó là counterfactual không đo được (hiến pháp điều 12).'
    },
    en: {
      'bar.env':'Env: local','bar.settings':'Settings','brand.tag':'Memory & docs harness for coding agents · v0.0.1',
      'proj.title':'Project','proj.sub':'Docs & rules for the selected project.','proj.run':'Run','proj.add':'+ Add','proj.target':'Target project: ',
      'recall.sub':'Search saved Codex, Claude, Continue, LM Studio sessions.','recall.search':'Search','recall.scope':'All projects','recall.clear':'Clear','recall.hint':'Type at least 2 characters to search.','recall.empty':'Search results appear here.','recall.preview':'Thread preview','recall.waiting':'waiting','recall.previewEmpty':'Select a result to preview nearby messages right here.',
      'mem.title':'Global memory','scan.title':'Ingest & Sync','scan.sub':'Get context into the memory: from this machine, and from others via Drive.','scan.known':'Scan known','scan.deep':'Deep scan','proj2.title':'Projects','proj2.sub':'Per-project memory detail — click to open a tab.','cov.openTip':'Click to open this project tab.',
      'set.title':'Settings','set.lang':'Language','set.storage':'Storage','set.auto':'Automation','set.search':'Search','set.health':'Health',
      'auto.h':'Automation','auto.d':'zemory runs itself in the background: start with the PC, keep vectors current, auto-sync. Saved to config.json.',
      'lang.h':'Interface language','lang.d':'Pick one language for the whole UI. Technical terms (Recall, Hybrid, FTS5…) stay as-is.','lang.row':'Language','lang.note':'Applies instantly, saved to config.json.',
      'storage.h':'Data storage','storage.d':'Keep the memory DB off C: so it never bloats. The pointer at ~/.zemory/location.json remembers it.','storage.folder':'Memory folder','storage.move':'Move','storage.warn':'⚠ Do not pick a synced Google Drive / OneDrive folder — a live DB corrupts.',
      'drive.h':'Drive sync','drive.d':'Each machine exports an encrypted bundle to a Drive folder; others merge it. The live DB is NOT synced directly.','drive.folder':'Drive folder',
      'synclv.row':'Sync depth','synclv.note':'Lean: messages only (~74% smaller). Full: the whole DB (disaster restore, much larger).','synclv.lean':'Lean','synclv.full':'Full',
      'search.h':'Search defaults','search.d':'Toggling also flips it on the Recall bar. Saved to config.json.',
      'health.h':'Health checks','health.d':'Do the core features actually run on this machine (FTS5, recall, harness).','health.retest':'Re-test',
      'docs.d':'Sync / rebuild the standard docs set for the project. Never overwrites your existing files (file wins).','docs.sync':'Add missing docs, keep your existing files (file wins).','docs.fresh':'Fresh start','docs.freshD':'Keep old docs aside, create a clean set.',
      'tab.global':'Global Memory','tab.graphSoon':'Graph for this project — coming soon (Code · Docs · lint)',
      'gsub.recall':'Recall & Standard','gsub.mem':'Memory & Sync',
      'psub.harness':'Harness','psub.graph':'Graph','psub.checks':'Detailed checks',
      'tree.noproj':'No project selected','tree.loading':'Reading folder tree…','tree.empty':'No folders','tree.nonstd':'non-standard','tree.slots':'standard slots in use','tree.nonstdN':'non-standard','tree.collapseAll':'Collapse all','tree.expandAll':'Expand all',
      'graph.orphans':'Orphans only','graph.rebuild':'Rebuild','graph.building':'Building graph…','graph.empty':'No source files','graph.hint':'Click a node: imports + tree highlight · wheel: zoom · drag background: pan · double-click background: reset.','graph.loc':'lines',
      'chk.memory':'Memory integrity','chk.workflow':'Workflow',
      'std.title':'Shared standard','std.sub':'The template applied to every project — read-only.',
      'std.agents.p':'Harness entry — a pure navigation router.','std.agents.s':'⛔ read-only banner if you are just visiting · "this project uses zemory, everything is under docs/" · 3 steps to start. Holds NO rules.',
      'std.const.p':'Constitution — per-app ARCHITECTURAL invariants, top tier, user-only.','std.const.s':'Purpose + non-goals + invariant articles: token-first · one source of truth · no LLM proxy · local-only · fail-open · honest measurement.',
      'std.rules.p':'Shared WORKING rules for every project (shipped from template).','std.rules.s':'Docs language · FILE WINS · session close · git never auto-pushes · project scope · ask when unclear · never delete silently · UI must be approved.',
      'std.struct.p':'Folder-structure standard + a navigation INDEX ("change what → go where").','std.struct.s':'2 standards APP/NON-APP · 4 required roles · ~40-slot dictionary + routing · layer/domain-first · conventions (3-size dialog, no-build, 3-role icons).',
      'std.skills.p':'Skill store — operational playbooks.','std.skills.s':'grill · session-close · reconcile (inline) + vendored skills (external/skills). Guardrail: this file never bloats.',
      'std.todo.p':'Work backlog.','std.todo.s':'[ ] todo · [~] doing · done → CHANGES. Next priorities + open decisions.',
      'std.chg.p':'Changelog.','std.chg.s':'Newest on top · supersede when reversing an old decision · logged only after user OK.',
      'tab.moreTitle':'Other projects','tab.addTitle':'Add a project','tab.manageTitle':'Manage projects','tab.themeTitle':'Toggle light/dark',
      'tab.menuHead':'Known projects','tab.none':'No projects yet.','tab.pin':'Pin to the tab bar','tab.unpin':'Unpin','tab.forget':'Remove from the list',
      'tab.forgetConfirm':"Remove this project from zemory's list? The folder, its docs and its memory data are left untouched.",
      'tab.forgetNote':"Removing only edits zemory's list — no files are deleted.",'tab.prune':'Clean up missing projects','tab.pruned':'Cleaned up {n} entr(ies).',
      'r.std':'Shared standard','r.noproj':'No project','r.runinit':'run zemory init','r.projdocs':"This project's docs (click to read)",'r.setup':'Setup / onboarding','r.plan':'Plan mirror','r.docs':'docs','r.known':'known projects',
      'itab.memory':'Memory','itab.capture':'Ingest & Sync','itab.coverage':'Projects','itab.standard':'Standard','scan.local':'This machine',
      'addp.title':'Add project','addp.d':'Paste the project folder path. A repo without a harness shows as "not set up" until you hit Run.','addp.ph':'e.g. D:\\Zyro\\App\\MyProject','addp.ok':'Add','addp.cancel':'Cancel',
      'glay.force':'Layout: force','glay.cluster':'Layout: folder clusters','glay.layers':'Layout: import layers','tt.glayout':'How nodes are arranged: force (organic, by links) · folder clusters (files grouped by directory) · import layers (entries left → deepest-imported right)',
      'nc.colQ':'agent question','nc.colSweep':'blind sweep','nc.colRouted':'via zemory','nc.colRatio':'cheaper',
      'nc.tipLocate':'"Where do I change X?": blind = read EVERY source file; via zemory = the 03_STRUCTURE §4 routing table (points straight at the slot). Numbers = tokens estimated from real bytes.',
      'nc.tipImpact':'"What does editing this file hit?": blind = open every file to trace imports; via zemory = the graph already holds the fan-in list.',
      'nc.tipRecall':'"What happened in earlier sessions?": blind = re-read every prior session of this project in the memory; via zemory = one recall returning 12 snippets.',
      'nc.h':'Navigation cost — blind sweep → via zemory','nc.locate':'"where do I change X?"','nc.impact':'"what does this file hit?"','nc.recall':'"what happened before?"',
      'fit.h':'Code fitness','fit.hub_pct':'hubs','fit.isolated_pct':'isolated','fit.util_violations':'util purity',
      'fit.help':'Structural health scored from the import graph — deterministic, re-runnable (CLI: zemory graph fitness). Green = within threshold; amber = off-standard, hover each chip for why.',
      'fit.dHub':'{n}/{files} files are HUBS (≥8 other files import them). More hubs = every edit fans wider. Max {th}.',
      'fit.dIso':'Share of the {files} files with no import edges at all (legit entries/scripts, or dead code). Max {th}.',
      'fit.dUtil':'util must stay PURE helpers: {n} util file(s) import business logic. Max {th}.',
      'fit.hubsTip':'Hottest files (fan-in) — edits fan wide; run zemory graph impact <file> before touching',
      'm.msgs':'messages','m.sess':'sessions','m.tok':'tokens in memory','m.size':'DB size','m.healthy':'Healthy','m.empty':'Empty','m.updated':'updated','m.capcost':'tokens to capture','m.recall':'tokens per recall','m.search':'Search','m.ftsonly':'FTS only','m.pending':'pending','m.err':'error','m.sources':'Sources','m.excl':'excluded','m.untick':' — untick to leave out of sync + recall','m.tables':'Tables','m.none':'none',
      'sc.origin':'origin: any','sc.host':'machine (blank=any)','sc.source':'agent/platform (blank=any)','sc.add':'+ Add','sc.rm':'Remove this exclude rule',
      'cov.none':'No project folders captured yet.','cov.sess':'sess','cov.msg':'msg','cov.agent':'agent','cov.linked':'linked','cov.found':'Discovered (not linked)','cov.local':'this machine',
      'd.notlinked':'not linked','d.linked':'✓ linked','d.bundle':'bundle','d.readonly':'⚠ read-only','d.pastelocal':'paste a local folder','d.nofolder':'folder not found','d.err':'✗ error',
      's.defaultC':'C: (default)','s.shortC':'C:','s.moved':'moved','s.empty':'empty','s.envpin':'env-pinned','s.oncloud':'⚠ on Drive (risky)','s.moving':'moving...','s.setptr':'✓ storage location set','s.movedOk':'✓ moved','s.err':'✗ error',
      'rel.needpath':'Enter a folder for the memory, e.g. D:\\\\Zyro\\\\Tool\\\\Zemory\\\\data','rel.confirm':'Move the memory DB to:','rel.confirm2':'It will checkpoint + copy + verify, then flip the pointer. The old DB is KEPT as a .bak (nothing lost). Continue?','rel.bak':'Old kept at: ','rel.bakhint':' (delete manually once confirmed OK)',
      'sy.title':'Cross-machine sync','sy.syncing':'Syncing…','sy.s1':'1 · scanning this machine for new sessions','sy.s2':'2 · exporting only what is NEW as an encrypted bundle (delta)','sy.s3':"3 · merging every other machine's bundle",'sy.s4':'4 · embedding new vectors','sy.note':'Exports only the new delta, encrypted — usually a few KB. It is working; leave it open.','sy.failed':'✗ Sync failed','sy.unknown':'unknown error','sy.done':'✓ Local sync complete','sy.scanned':'Scanned this machine · ','sy.newmsg':' new msg captured','sy.exported':'Pushed · ','sy.pushNone':'nothing new','sy.push_baseline':'baseline','sy.push_delta':'delta','sy.push_compact':'compacted baseline','sy.push_full':'full snapshot','sy.merged1':'Merged ','sy.merged2':' other bundle(s) · ','sy.embedded1':'Embedded ','sy.embedded2':' new vector(s)','sy.pending':' pending (run memory embed --all)','sy.cloudnote':'⏳ Google Drive is still uploading to the cloud in the background — other machines receive it once Drive finishes (watch the Drive tray icon).','sy.errorT':'✗ Sync error','sy.close':'Close','sy.hide':'Run hidden','sy.syncingShort':'syncing...','sy.okShort':'✓ synced','sy.failShort':'✗ sync failed','sy.errShort':'✗ error',
      'sn.deep':'Deep scanning the whole machine...','sn.known':'Scanning known locations...','sn.loaded':'Loaded +','sn.msg':' message(s) · ','sn.changed':' session(s) changed · scanned ','sn.file':' file(s).','sn.strange':' unrecognized stores','sn.stores':'Stores scanned','sn.changedS':'Changed sessions','sn.err':'scan error: ',
      'q.searching':'Searching...','q.0':'0 results','q.nomatch':'No matches','q.nomatchdot':'.','q.nomatchproj':' in this project. Try all projects.','q.results':' results','q.err':'Search error','q.errbody':'search error: ','q.noSel':'No result selected.','q.emptyState':'empty','q.loadingctx':'loading context...','q.loadingS':'loading','q.nocontext':'(no context)','q.nearby':' nearby','q.fullsession':'Full session ⤢','q.selmsg':'Selected message #','q.openfull':'Open full session',
      'ss.loading':'loading full session...','ss.notfound':'(session not found)','ss.msgs':' messages','ss.trunc1':' (showing first ','ss.trunc2':' — session is longer)','ss.err':'session error: ',
      'so.rel':'Sorted by relevance','so.new':'Sorted newest','so.old':'Sorted oldest',
      'ph.search':'e.g. how we stream tool output for agents','ph.addproj':'Add a project by folder path…','f.agentAny':'Agent: any','f.timeAny':'Time: any','f.time24':'Last 24h','f.time7':'Last 7 days','f.time30':'Last 30 days','f.time90':'Last 90 days','f.typeAny':'Type: any','f.originAny':'Origin: any',
      'dv.loading':'loading...','dv.empty':'(empty)','dv.err':'error: ','ctx.err':'context error: ','ctx.error':'error',
      'act.working':'working...','act.nonstd':'Docs non-standard — run zemory migrate, docs ls/rm/render.','act.added':'added ','act.nomiss':'nothing missing','act.renamed':'renamed old → ','act.created':'created .harness.json — ',
      'tt.runHarness':'Run harness: scaffold the project docs to standard (add missing files, number plans, never overwrite existing files (file wins))','tt.settings':'Settings','tt.refresh':'Refresh','tt.storage':'Memory DB location','tt.drive':'Drive sync','tt.scopeAll':'Search sessions across ALL projects (the memory is global). Off = only the selected project.','tt.hybrid':'Semantic recall: FTS + vector. Off = keyword FTS only.','tt.rerank':'Cross-encoder rerank: reorder the top candidates for sharper results. Needs the reranker model.','tt.fTime':'Filter by time','tt.fType':'Filter by message role','tt.fOrigin':'Local = agent transcripts on disk; Web = captured web chats (ChatGPT/…)','tt.fAgent':'Filter by agent/source','tt.sort':'Click to change sort (relevance / newest / oldest)','tt.resize':'Drag to resize. Double-click to reset.','tt.scan':'Read agent transcripts on THIS machine into the memory. "Quick scan" re-reads known stores (fast); "Deep scan" sweeps the whole disk for new agent folders.','tt.projects':'Project folders with captured sessions, showing session / message / agent counts each.','tt.close':'Close','tt.std':'The standard harness in docs_template/ — shipped with zemory, separate from any project docs. This is what Run scaffolds and the agent adapts per project. Read-only (edit the standard in docs_template/).','tt.brand':'zemory · memory & harness docs for agents','tt.scopeTree':'Which source lanes (Local machine/agent, Web platform) feed sync + recall. Untick shared/noisy lanes to exclude them — cleaner harness sources, less token noise in recall. A filter, not a delete: data stays in the local DB.','tt.capcost':'Capture is free: the hook reads the agent transcript FILE at session end — no model call, no API cost. ~tokens in memory = SUM(len)/4, a measure of the context the memory HOLDS (an asset), NOT tokens spent.','tt.navcost':'What the zemory structure BUYS, measured in tokens. Left = a blind sweep (read every source file / re-read prior sessions); right = what the routing index / graph / memory hands back directly. BOTH sides are computed from real bytes on disk and real messages in the memory — nothing is estimated. This is NOT a "your bill dropped N tokens" claim (that is a counterfactual, forbidden by article 12): it compares two concrete reading strategies for the same question.','tt.recall':'The REAL tokens each recall injects into context: the memory returns short snippets, full messages open on demand (progressive disclosure). This is the MEASURED cost of USING the memory. zemory deliberately shows no "tokens saved" figure — that is an unmeasurable counterfactual (constitution article 12).'
    }
  };
  function t(k){ var d = T[window.__lang === 'en' ? 'en' : 'vi']; return (d && d[k] != null) ? d[k] : (T.vi[k] != null ? T.vi[k] : k); }
  // Re-entrancy guard. applyLang re-renders the JS-built views, and any view that
  // calls back into applyLang would recurse until the stack blew (see renderTabs).
  // Cheap insurance so a future edit cannot reopen that hole silently.
  var applyLangBusy = false;
  function applyLang(lang){
    if(applyLangBusy) return;
    if(lang !== 'en') lang = 'vi';
    window.__lang = lang;
    var dict = T[lang] || {};
    applyLangBusy = true;
    try { applyLangInner(lang, dict); } finally { applyLangBusy = false; }
  }
  function applyLangInner(lang, dict){
    document.querySelectorAll('[data-i18n]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n')];
      if(v != null) e.textContent = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n-ph')];
      if(v != null) e.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(e){
      var v = dict[e.getAttribute('data-i18n-title')];
      if(v != null) e.setAttribute('title', v);
    });
    var vi = el('langVi'), en = el('langEn');
    if(vi && en){ vi.classList.toggle('on', lang !== 'en'); en.classList.toggle('on', lang === 'en'); }
    // Re-render JS-built views so their strings flip too (they cache last data).
    try { if(last) renderStatus(); } catch(e){}
    try { if(memory && Object.keys(memory).length) renderMemorySummary(memory); } catch(e){}
    try { renderSettingsSearch(); } catch(e){}
    try { updateSortLabel(); } catch(e){}
    // Idle recall panels (no active query) → refresh their empty/hint text.
    if(!(lastHits && lastHits.length)){
      var rc = el('resultCount'); if(rc && (el('bq').value.trim().length < 2)) rc.textContent = t('recall.hint');
      var bh = el('memoryhits'); if(bh && el('bq').value.trim().length < 2) bh.innerHTML = '<div class="empty">' + t('recall.empty') + '</div>';
    } else { try { renderHits(); } catch(e){} }
  }
  async function setLangUI(lang){
    // Flip the client-side strings FIRST so the UI reacts instantly; the refetch
    // below only exists for strings the SERVER localizes (status.ts / checks.ts
    // call tr()). Previously this ran 3 fetches strictly one after another and
    // left every /check detail in the old language — the checks were never
    // refetched at all, despite the comment claiming they were.
    applyLang(lang);
    try { await fetch('/set-lang?lang=' + lang, { method: 'POST' }); } catch(e){}
    // Only /status and /check are server-localized (tr()). The memory panel is NOT —
    // applyLang already re-rendered it client-side from the cached payload — so we
    // must NOT force a fresh memory recompute here (that was the delay). Refresh the
    // two localized surfaces concurrently; leave memory alone.
    await Promise.all([
      tick().catch(function(){}),
      runChecks(true).catch(function(){}),
    ]);
    cacheProject();
  }
  function openSettings(pane){
    el('settingsOverlay').style.display = 'flex';
    renderSettingsSearch();
    loadAuto();
    if(pane){ var b = document.querySelector('.set-tab[data-pane="' + pane + '"]'); if(b) setSettingsTab(b); }
  }
  // ── Automation pane (plan 14 §B): start-with-OS · auto-sync · idle scheduler ──
  var autoState = { autostart:false, autosync:false, scheduler:true, os:{ supported:true } };
  async function loadAuto(){
    try { autoState = await (await fetch('/automation')).json(); } catch(e){}
    renderAutoPrefs();
  }
  function autoRow(which, on, label, note, disabled){
    return '<div class="set-row"><div class="set-lab">' + label + '<small>' + note + '</small></div>'
      + '<div class="sw' + (on ? ' on' : '') + (disabled ? ' sw-off' : '') + '"' + (disabled ? '' : ' data-auto="' + which + '"') + '></div></div>';
  }
  document.addEventListener('click', function(ev){
    var s = ev.target.closest ? ev.target.closest('.sw[data-auto]') : null;
    if(s) flipAuto(s.dataset.auto);
  });
  function renderAutoPrefs(){
    var box = el('autoPrefs'); if(!box) return;
    var en = window.__lang === 'en';
    var os = autoState.os || {};
    var L = en
      ? { as:['Start with the PC','Launch zemory automatically when you log in ('+(os.method||'')+').'], sy:['Auto-sync memory','When data drifts, push/pull the encrypted Drive bundle. Off by default.'], sc:['Idle indexing','Keep vectors current in the background while idle.'] }
      : { as:['Mở cùng PC','Tự chạy zemory khi đăng nhập máy ('+(os.method||'')+').'], sy:['Tự sync memory','Khi dữ liệu lệch, tự đẩy/kéo bundle mã hoá qua Drive. Mặc định tắt.'], sc:['Tự cập nhật lúc rảnh','Nền tự nhúng vector khi máy rảnh, giữ recall luôn tươi.'] };
    var noAuto = os.supported === false;
    var sc = autoState.shortcut || {};
    var scLabel = en ? ['Desktop shortcut','A clickable zemory icon on the desktop.'] : ['Lối tắt Desktop','Icon zemory bấm-là-mở trên Desktop.'];
    box.innerHTML = autoRow('autostart', autoState.autostart, L.as[0], L.as[1], noAuto)
      + autoRow('shortcut', !!sc.exists, scLabel[0], scLabel[1], sc.supported === false)
      + autoRow('autosync', autoState.autosync, L.sy[0], L.sy[1], false)
      + autoRow('scheduler', autoState.scheduler, L.sc[0], L.sc[1], false);
    var note = el('autoNote');
    if(note) note.textContent = noAuto ? (os.detail || '') : (autoState.autostart && os.path ? (en ? 'Startup entry: ' : 'File khởi động: ') + os.path : '');
  }
  async function flipAuto(which){
    if(which === 'shortcut'){
      var want = !(autoState.shortcut && autoState.shortcut.exists);
      try { var s = await (await fetch('/set-shortcut?on=' + (want ? 1 : 0), { method: 'POST' })).json(); autoState.shortcut = s.shortcut; } catch(e){}
      renderAutoPrefs(); return;
    }
    var on = !autoState[which];
    autoState[which] = on; renderAutoPrefs();
    try {
      var r = await (await fetch('/set-' + which + '?on=' + (on ? 1 : 0), { method: 'POST' })).json();
      if(which === 'autostart' && r && r.autostart){ autoState.os = r.autostart; autoState.autostart = !!r.autostart.enabled; }
      renderAutoPrefs();
    } catch(e){}
  }
  function closeSettings(){ el('settingsOverlay').style.display = 'none'; }
  // ── ESC closes the topmost open dialog (general rule, 03_STRUCTURE §5) ────────
  // Every overlay/popup registers here. syncOverlay is intentionally NOT ESC-
  // closable while a sync runs (window.__syncing) — same guard as its backdrop
  // click. Order = visually topmost first; ESC closes ONE layer per press.
  var escLayers = [
    { el: 'tabMenu', vis: function(){ return el('tabMenu') && el('tabMenu').classList.contains('on'); }, close: function(){ toggleTabMenu(false); } },
    { el: 'docOverlay', vis: function(){ return shown('docOverlay'); }, close: closeDoc },
    { el: 'sessionOverlay', vis: function(){ return shown('sessionOverlay'); }, close: closeSession },
    // ESC on the sync box = run hidden (closeSyncBox only hides; the daemon-side
    // job continues and the Global tab keeps its spinner) — never an abort.
    { el: 'syncOverlay', vis: function(){ return shown('syncOverlay'); }, close: closeSyncBox },
    { el: 'settingsOverlay', vis: function(){ return shown('settingsOverlay'); }, close: closeSettings },
    { el: 'addProjOverlay', vis: function(){ return shown('addProjOverlay'); }, close: closeAddProject },
  ];
  function shown(id){ var e = el(id); return e && getComputedStyle(e).display !== 'none'; }
  document.addEventListener('keydown', function(ev){
    if(ev.key !== 'Escape') return;
    for(var i = 0; i < escLayers.length; i++){
      if(escLayers[i].vis()){ ev.preventDefault(); escLayers[i].close(); return; }
    }
  });
  function setSettingsTab(btn){
    document.querySelectorAll('.set-tab').forEach(function(t){ t.classList.remove('on'); });
    document.querySelectorAll('.set-pane').forEach(function(p){ p.classList.remove('on'); });
    btn.classList.add('on');
    var pane = document.querySelector('.set-pane[data-pane="' + btn.getAttribute('data-pane') + '"]');
    if(pane) pane.classList.add('on');
  }
  function swRow(id, key, label, note){
    var on = el(id) && el(id).checked;
    return '<div class="set-row"><div class="set-lab">' + label + '<small>' + note + '</small></div>'
      + '<div class="sw' + (on ? ' on' : '') + '" onclick="flipPref(\'' + id + '\',\'' + key + '\')"></div></div>';
  }
  function renderSettingsSearch(){
    var box = el('searchPrefs'); if(!box) return;
    var lang = window.__lang === 'en' ? 'en' : 'vi';
    var L = lang === 'en'
      ? { hy:['Hybrid','FTS + vector (semantic). Off = keyword only.'], re:['Rerank','Cross-encoder rescoring. Needs the reranker model.'], sc:['Scope: all projects','The memory is global. Off = current project only.'] }
      : { hy:['Hybrid','FTS + vector (semantic). Tắt = chỉ keyword.'], re:['Rerank','Cross-encoder xếp lại top. Cần model reranker.'], sc:['Phạm vi: mọi dự án','Memory là toàn cục. Tắt = chỉ dự án đang chọn.'] };
    box.innerHTML = swRow('hybrid','hybrid',L.hy[0],L.hy[1]) + swRow('rerank','rerank',L.re[0],L.re[1]) + swRow('ball','scope',L.sc[0],L.sc[1]);
  }
  function flipPref(id, key){
    var c = el(id); if(!c) return;
    c.checked = !c.checked;
    if(key === 'hybrid') setHybrid(); else if(key === 'rerank') setRerank(); else setScope();
    renderSettingsSearch();
  }
  function summarize(r){
    if(r.needsReconcile) return t('act.nonstd');
    const a = r.added && r.added.length ? t('act.added') + r.added.join(', ') : t('act.nomiss');
    return (r.renamedTo ? t('act.renamed') + r.renamedTo + '\n' : '') + (r.createdConfig ? t('act.created') : '') + a;
  }
  async function act(ep){
    closeSettings();
    el('msg').textContent = t('act.working');
    try {
      const r = await (await fetch(ep + ru(), { method: 'POST' })).json();
      el('msg').textContent = 'OK · ' + summarize(r);
      await tick();
      await runChecks(true);   // the harness just changed — re-test for real
      cacheProject();
    } catch(e){ el('msg').textContent = t('dv.err') + e; }
  }
  function actConfirm(ep, q){ if(confirm(q)) act(ep); }

  (async () => {
    await loadLayoutFromServer();
    initResizers();
    initPanelSplits();
    await tick();
    if(!curRoot && last && last.project && last.project.root) curRoot = last.project.root;
    await memoryTick();
    runChecks().then(cacheProject);
    // Sync the project sub-tab buttons to the restored state; load the tree if
    // the user left off on the Graph sub-tab.
    setProjectSubTab(document.body.dataset.ptab === 'graph' ? 'graph' : 'harness');
    setGlobalSubTab(document.body.dataset.gtab === 'mem' ? 'mem' : 'recall');
    if(window.matchMedia('(min-width: 761px)').matches) el('bq').focus();
  })();
  // Poll rates: memory stats are whole-DB aggregates that only move on scan/sync,
  // so a slow poll over a CACHED snapshot is plenty. The old 2.5s poll of a ~4s
  // query kept the (single-threaded) server permanently saturated.
  setInterval(tick, 10000);
  setInterval(function(){ memoryTick(); }, 30000);
