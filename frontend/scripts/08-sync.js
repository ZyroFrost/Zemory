  async function memoryTick(fresh){
    // Skeleton only on the FIRST load (empty panel) — the 30s poll repaints from
    // cached data, so showing it every tick would just flicker.
    var mp = el('memoryPanel');
    if(mp && !mp.innerHTML.trim()) mp.innerHTML = skStatCards(6);
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
