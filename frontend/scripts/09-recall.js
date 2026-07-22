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
    // Skeleton while fetching (keeps the list height ~ what came back last time).
    el('memoryhits').innerHTML = skResultRows(lastHits && lastHits.length ? Math.min(lastHits.length, 6) : 5);
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
      '<div class="open-arrow" onclick="event.stopPropagation();openSession(\'' + esc(h.sessionId) + '\')" title="' + t('q.openfull') + '" aria-label="' + t('q.openfull') + '" role="button" tabindex="0">⤢</div></div>';
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
