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

