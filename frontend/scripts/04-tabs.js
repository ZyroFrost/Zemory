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
