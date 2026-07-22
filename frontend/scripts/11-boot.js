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
