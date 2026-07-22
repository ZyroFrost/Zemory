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
      + '<button class="mini-btn ghost" data-tact="collapse" title="' + esc(t('tree.collapseAll')) + '" aria-label="' + esc(t('tree.collapseAll')) + '">⊟</button>'
      + '<button class="mini-btn ghost" data-tact="expand" title="' + esc(t('tree.expandAll')) + '" aria-label="' + esc(t('tree.expandAll')) + '">⊞</button></div>'
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
