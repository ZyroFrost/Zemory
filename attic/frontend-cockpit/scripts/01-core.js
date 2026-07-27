
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

