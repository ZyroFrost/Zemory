  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  // Layout is persisted SERVER-SIDE (~/.zemory/config.json) so a reopen restores it
  // exactly; localStorage is kept only as a same-port fast cache — the server is the
  // durable source of truth.
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
  function setLayoutVar(name, value){ document.documentElement.style.setProperty(name, value); }

  // §5 "Panel resize" — ONE data-driven engine. Every seam is a storage key mapped
  // to the CSS var it drives; adding a seam = adding a descriptor in seam() below,
  // never copying drag logic. applyStoredLayout replays them all in one loop.
  const STORE_VARS = {
    railW: '--rail-w', inspectorW: '--inspector-w', gmRightW: '--gm-right-w',
    recallLeft: '--recall-left', gmCovW: '--gm-cov-w', graphColW: '--graph-col-w', graphRowH: '--graph-row-h',
  };
  function applyStoredLayout(){
    const l = readLayout();
    for(const k in STORE_VARS){ if(l[k] != null) setLayoutVar(STORE_VARS[k], l[k]); }
  }
  async function loadLayoutFromServer(){
    try {
      const s = await (await fetch('/ui-state')).json();
      if(s && s.layout && Object.keys(s.layout).length){
        layoutCache = s.layout;
        try { localStorage.setItem(layoutKey, JSON.stringify(s.layout)); } catch(e){}
        applyStoredLayout();
      }
    } catch(e){}
  }

  function seamRect(sel){ const n = document.querySelector(sel); return n ? n.getBoundingClientRect() : null; }
  function cssVarNum(name){ return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); }
  // Return the LIVE spec for a seam type. The inspector seam swaps var/limits by
  // sub-tab, and every container-dependent max is measured fresh — seam() is re-read
  // on each pointerdown / key / dblclick, so a spec is never stale.
  //   axis     : 'x' (col-resize) | 'y' (row-resize)
  //   val(x,y) : pointer coordinate -> clamped numeric value in `unit`
  //   plusKey  : which arrow key INCREASES the value (seams grow in different directions)
  function seam(type){
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    const midNarrow = window.matchMedia('(max-width: 1180px)').matches;
    const mk = (o) => Object.assign({ unit: 'px', step: 16, axis: 'x' }, o);
    switch(type){
      case 'rail': return mk({
        varName: '--rail-w', key: 'railW', min: 150, max: 340, plusKey: 'ArrowRight', enabled: !narrow && !midNarrow,
        val: (x) => { const r = seamRect('.shell'); return Math.round(clamp(x - r.left - 10, 150, 340)); },
        cur: () => parseFloat(readLayout().railW) || cssVarNum('--rail-w') || 244,
      });
      case 'inspector': {
        const mem = memPane();
        const min = mem ? 420 : 230;
        const maxOf = () => { const r = seamRect('.shell'); return mem ? Math.max(440, (r ? r.width : 1280) - 320) : 460; };
        return mk({
          varName: mem ? '--gm-right-w' : '--inspector-w', key: mem ? 'gmRightW' : 'inspectorW',
          min, max: maxOf(), plusKey: 'ArrowLeft', enabled: !narrow && !midNarrow,
          val: (x) => { const r = seamRect('.shell'); return Math.round(clamp(r.right - x - 10, min, maxOf())); },
          cur: () => parseFloat(readLayout()[mem ? 'gmRightW' : 'inspectorW']) || cssVarNum(mem ? '--gm-right-w' : '--inspector-w') || (mem ? 980 : 366),
        });
      }
      case 'recall': return mk({
        varName: '--recall-left', key: 'recallLeft', unit: '%', step: 3, min: 36, max: 76, plusKey: 'ArrowRight', enabled: !narrow,
        val: (x) => { const r = seamRect('.recall-workbench'); return +clamp(((x - r.left) / Math.max(1, r.width)) * 100, 36, 76).toFixed(1); },
        cur: () => parseFloat(readLayout().recallLeft) || cssVarNum('--recall-left') || 64,
      });
      case 'gmSplit': {
        const min = 260;
        const maxOf = () => { const r = seamRect('.inspector'); return Math.max(min, (r ? r.width : 900) - min - 6); };
        return mk({
          varName: '--gm-cov-w', key: 'gmCovW', min, max: maxOf(), plusKey: 'ArrowRight', enabled: !narrow,
          val: (x) => { const r = seamRect('.inspector'); return Math.round(clamp(x - r.left, min, maxOf())); },
          cur: () => parseFloat(readLayout().gmCovW) || cssVarNum('--gm-cov-w') || Math.round(((seamRect('.inspector') || { width: 800 }).width) / 2),
        });
      }
      case 'graphCol': {
        const min = 180;
        const maxOf = () => { const r = seamRect('.graph-grid'); return Math.max(220, (r ? r.width : 800) * 0.6); };
        return mk({
          varName: '--graph-col-w', key: 'graphColW', min, max: maxOf(), plusKey: 'ArrowRight', enabled: !narrow,
          val: (x) => { const r = seamRect('.graph-grid'); return Math.round(clamp(x - r.left, min, maxOf())); },
          cur: () => parseFloat(readLayout().graphColW) || cssVarNum('--graph-col-w') || 260,
        });
      }
      case 'graphRow': {
        const min = 90;
        const maxOf = () => { const r = seamRect('.graph-grid'); return Math.max(120, (r ? r.height : 600) * 0.6); };
        return mk({
          varName: '--graph-row-h', key: 'graphRowH', axis: 'y', min, max: maxOf(), plusKey: 'ArrowDown', enabled: !narrow,
          val: (x, y) => { const r = seamRect('.graph-grid'); return Math.round(clamp(y - r.top, min, maxOf())); },
          cur: () => parseFloat(readLayout().graphRowH) || cssVarNum('--graph-row-h') || 120,
        });
      }
    }
    return null;
  }

  function resetResize(type){
    const s = seam(type); if(!s) return;
    // Original shell seams restore their explicit default; the newer split seams
    // just clear the override so the CSS fallback (1fr / minmax / auto) returns.
    if(layoutDefaults[s.key] != null) setLayoutVar(s.varName, layoutDefaults[s.key]);
    else document.documentElement.style.removeProperty(s.varName);
    writeLayout({ [s.key]: null });
  }

  function initResizers(){
    let active = null;
    const onMove = (e) => {
      if(!active) return;
      e.preventDefault();
      const s = active.spec;
      const v = s.val(e.clientX, e.clientY) + s.unit;
      setLayoutVar(s.varName, v);
      active.pending = { [s.key]: v };
    };
    const stop = () => {
      if(!active) return;
      if(active.pending) writeLayout(active.pending);
      try { active.handle.releasePointerCapture(active.pointerId); } catch(e){}
      active.handle.classList.remove('active');
      document.body.classList.remove('resizing', 'resizing-col', 'resizing-row');
      active = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    document.querySelectorAll('.resize-handle[data-resize]').forEach(handle => {
      const type = handle.dataset.resize;
      handle.addEventListener('pointerdown', e => {
        const s = seam(type); if(!s || !s.enabled) return;
        active = { spec: s, handle, pointerId: e.pointerId, pending: null };
        try { handle.setPointerCapture(e.pointerId); } catch(_){}
        handle.classList.add('active');
        document.body.classList.add('resizing', s.axis === 'y' ? 'resizing-row' : 'resizing-col');
        e.preventDefault();
      });
      handle.addEventListener('dblclick', () => resetResize(type));
      handle.addEventListener('keydown', e => {
        const s = seam(type); if(!s || !s.enabled) return;
        const keys = s.axis === 'y' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
        if(keys.indexOf(e.key) < 0) return;
        e.preventDefault();
        const step = (e.shiftKey ? 2 : 1) * s.step;
        const next = clamp(s.cur() + (e.key === s.plusKey ? step : -step), s.min, s.max);
        const v = (s.unit === '%' ? +next.toFixed(1) : Math.round(next)) + s.unit;
        setLayoutVar(s.varName, v);
        writeLayout({ [s.key]: v });
      });
    });
  }
  applyStoredLayout();
