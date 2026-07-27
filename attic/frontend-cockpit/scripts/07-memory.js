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
    // Canonical registry entry per project (case-folded) — carries the exact root
    // and pin state, so the pin/forget buttons below send the registry's own root.
    const linkedMap = {};
    for(const k of ((last && last.knownProjects) || [])) linkedMap[String(k.root || '').toLowerCase()] = k;
    let covState = {};
    try { covState = JSON.parse(localStorage.getItem('zemory.covm') || '{}') || {}; } catch(e){}
    const covHosts = Object.keys(byHost).sort((a, b) => a === localHost ? -1 : b === localHost ? 1 : a.localeCompare(b));
    const covRow = (p, linked) => {
      const meta = fmtN(p.sessions) + ' ' + t('cov.sess') + ' / ' + fmtN(p.messages) + ' ' + t('cov.msg') + ' / ' + fmtN(p.agents) + ' ' + t('cov.agent') + (p.last ? ' · ' + fmtDateTime(p.last) : '');
      const open = '<div class="folder-item cov-open" data-open-proj="' + esc(p.path) + '" title="' + esc(t('cov.openTip')) + '">'
        + '<div class="mini-row"><b>' + esc(projName(p.path)) + '</b><span class="muted">' + meta + '</span></div>'
        + '<div class="path">' + esc(p.path) + '</div></div>';
      if(!linked) return '<div class="cov-line">' + open + '</div>';
      // Linked projects (in the registry) can be pinned to the tab bar or dropped
      // from the picker right here — this list is the ONLY surface for it (the old
      // ☰ tab menu was removed). ✕ edits zemory's list only; folder/docs/memory kept.
      const km = linkedMap[String(p.path).toLowerCase()];
      const pinned = !!(km && km.pinned);
      const root = (km && km.root) || p.path;
      const acts = '<div class="cov-acts">'
        + '<button class="cov-act' + (pinned ? ' on' : '') + '" data-cov-pin data-root="' + esc(root) + '" data-on="' + (pinned ? '0' : '1') + '" title="' + esc(t(pinned ? 'tab.unpin' : 'tab.pin')) + '" aria-label="' + esc(t(pinned ? 'tab.unpin' : 'tab.pin')) + '">📌</button>'
        + '<button class="cov-act danger" data-cov-forget data-root="' + esc(root) + '" title="' + esc(t('tab.forget')) + '" aria-label="' + esc(t('tab.forget')) + '">✕</button>'
        + '</div>';
      return '<div class="cov-line">' + open + acts + '</div>';
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
            body += linked.map(p => covRow(p, true)).join('');
            if(found.length){
              body += '<div class="cov-sub" data-cov-found="' + esc(h) + '">' + (fOpen ? '▾ ' : '▸ ') + esc(t('cov.found')) + ' (' + found.length + ')</div>';
              if(fOpen) body += found.map(p => covRow(p, false)).join('');
            }
            // Prune sits under the local machine group — it drops registry entries
            // whose folder is gone / no longer set up / a scratch dir.
            if(isLocal) body += '<div class="cov-foot"><button class="ghost" data-cov-prune>' + esc(t('tab.prune')) + '</button><span class="tiny">' + esc(t('tab.forgetNote')) + '</span></div>';
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
  // Pin / forget / prune a linked project straight from the Projects list. These
  // buttons sit OUTSIDE .cov-open, so opening the project tab and managing it never
  // collide; stopPropagation guards against a future nesting change. projectAction
  // (04-tabs.js) refreshes last.knownProjects; we then repaint tabs + this list.
  document.addEventListener('click', async function(ev){
    if(!ev.target.closest) return;
    const pin = ev.target.closest('#coveragePanel [data-cov-pin]');
    const fg  = ev.target.closest('#coveragePanel [data-cov-forget]');
    const pr  = ev.target.closest('#coveragePanel [data-cov-prune]');
    if(!pin && !fg && !pr) return;
    ev.stopPropagation();
    if(pin){
      await projectAction('/pin-project', pin.dataset.root, '&on=' + pin.dataset.on);
    } else if(fg){
      if(!confirm(t('tab.forgetConfirm') + '\n\n' + fg.dataset.root)) return;
      await projectAction('/forget-project', fg.dataset.root);
      if(el('proj') && el('proj').value === fg.dataset.root){ curRoot = ''; setTab('global'); }
    } else if(pr){
      const r = await (await fetch('/prune-projects', { method: 'POST' })).json();
      if(r && r.knownProjects && last) last.knownProjects = r.knownProjects;
      if(el('msg')) el('msg').textContent = t('tab.pruned').replace('{n}', String((r && r.removed) || 0));
    }
    if(el('proj')) el('proj').innerHTML = projOpts();
    renderTabs();
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
