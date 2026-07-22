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
