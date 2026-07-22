  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  // Layout is persisted SERVER-SIDE (~/.zemory/config.json) so a reopen restores
  // it exactly — localStorage is keyed by origin and the UI binds a random
  // port every launch, which is why drags used to reset. localStorage is kept as
  // a same-port fast cache; the server is the durable source of truth.
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
  async function loadLayoutFromServer(){
    try {
      const s = await (await fetch('/ui-state')).json();
      if(s && s.layout && Object.keys(s.layout).length){
        layoutCache = s.layout;
        try { localStorage.setItem(layoutKey, JSON.stringify(s.layout)); } catch(e){}
        applyStoredLayout();
        applyStoredGrows();
      }
    } catch(e){}
  }
  function setLayoutVar(name, value){
    document.documentElement.style.setProperty(name, value);
  }
  function applyStoredLayout(){
    const l = readLayout();
    if(l.railW) setLayoutVar('--rail-w', l.railW);
    if(l.inspectorW) setLayoutVar('--inspector-w', l.inspectorW);
    if(l.gmRightW) setLayoutVar('--gm-right-w', l.gmRightW);
    if(l.bottomH) setLayoutVar('--bottom-h', l.bottomH);
    if(l.recallLeft) setLayoutVar('--recall-left', l.recallLeft);
  }
  function resetResize(type){
    const patch = {};
    if(type === 'rail') { setLayoutVar('--rail-w', layoutDefaults.railW); patch.railW = null; }
    if(type === 'inspector' && memPane()) { setLayoutVar('--gm-right-w', layoutDefaults.gmRightW); patch.gmRightW = null; }
    else if(type === 'inspector') { setLayoutVar('--inspector-w', layoutDefaults.inspectorW); patch.inspectorW = null; }
    if(type === 'bottom') { setLayoutVar('--bottom-h', layoutDefaults.bottomH); patch.bottomH = null; }
    if(type === 'recall') { setLayoutVar('--recall-left', layoutDefaults.recallLeft); patch.recallLeft = null; }
    writeLayout(patch);
  }
  function applyStoredGrows(){
    const g = (readLayout().grows) || {};
    document.querySelectorAll('[data-grow]').forEach(p => {
      const v = g[p.dataset.grow];
      if(v != null) p.style.flexGrow = v;
    });
  }
  function initPanelSplits(){
    document.querySelectorAll('.panel-split').forEach(h => {
      let drag = null;
      h.addEventListener('pointerdown', e => {
        if(window.matchMedia('(max-width: 760px)').matches) return;
        const prev = h.previousElementSibling, next = h.nextElementSibling;
        if(!prev || !next) return;
        const pH = prev.getBoundingClientRect().height, nH = next.getBoundingClientRect().height;
        const pG = parseFloat(getComputedStyle(prev).flexGrow) || 1;
        const nG = parseFloat(getComputedStyle(next).flexGrow) || 1;
        drag = { prev, next, startY: e.clientY, pH, nH, totalH: pH + nH, totalG: pG + nG };
        try { h.setPointerCapture(e.pointerId); } catch(_){}
        h.classList.add('active');
        document.body.classList.add('resizing', 'resizing-row');
        e.preventDefault();
      });
      h.addEventListener('pointermove', e => {
        if(!drag) return;
        const min = 70;
        const npH = clamp(drag.pH + (e.clientY - drag.startY), min, drag.totalH - min);
        const pg = drag.totalG * (npH / drag.totalH);
        drag.prev.style.flexGrow = pg.toFixed(3);
        drag.next.style.flexGrow = (drag.totalG - pg).toFixed(3);
        e.preventDefault();
      });
      const end = () => {
        if(!drag) return;
        const g = (readLayout().grows) || {};
        if(drag.prev.dataset.grow) g[drag.prev.dataset.grow] = drag.prev.style.flexGrow;
        if(drag.next.dataset.grow) g[drag.next.dataset.grow] = drag.next.style.flexGrow;
        writeLayout({ grows: g });
        h.classList.remove('active');
        document.body.classList.remove('resizing', 'resizing-row');
        drag = null;
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      h.addEventListener('dblclick', () => {
        const prev = h.previousElementSibling, next = h.nextElementSibling, g = (readLayout().grows) || {};
        [prev, next].forEach(p => { if(p && p.dataset.growDefault){ p.style.flexGrow = p.dataset.growDefault; delete g[p.dataset.grow]; } });
        writeLayout({ grows: g });
      });
    });
  }
  function initResizers(){
    const handles = Array.from(document.querySelectorAll('.resize-handle:not(.panel-split)'));
    let active = null;
    const cssNum = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const canResize = (type) => {
      if(window.matchMedia('(max-width: 760px)').matches) return false;
      if((type === 'rail' || type === 'inspector') && window.matchMedia('(max-width: 1180px)').matches) return false;
      return true;
    };
    const update = (type, clientX, clientY, base) => {
      let out = null;
      if(type === 'rail') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        const px = Math.round(clamp(clientX - r.left - 10, 150, 340));
        setLayoutVar('--rail-w', px + 'px');
        out = { railW: px + 'px' };
      }
      if(type === 'inspector') {
        const r = document.querySelector('.shell').getBoundingClientRect();
        if(memPane()){
          // Two panels live on this side, so it needs a far wider range than the
          // single-panel seam; leave at least 320px for Bộ nhớ on the left.
          const px = Math.round(clamp(r.right - clientX - 10, 420, Math.max(440, r.width - 320)));
          setLayoutVar('--gm-right-w', px + 'px');
          out = { gmRightW: px + 'px' };
        } else {
          const px = Math.round(clamp(r.right - clientX - 10, 230, 460));
          setLayoutVar('--inspector-w', px + 'px');
          out = { inspectorW: px + 'px' };
        }
      }
      if(type === 'recall') {
        const r = document.querySelector('.recall-workbench').getBoundingClientRect();
        const pct = clamp(((clientX - r.left) / Math.max(1, r.width)) * 100, 36, 76);
        const val = pct.toFixed(1) + '%';
        setLayoutVar('--recall-left', val);
        out = { recallLeft: val };
      }
      if(type === 'bottom') {
        const ws = document.querySelector('.workspace').getBoundingClientRect();
        const max = Math.max(150, Math.round(ws.height * .46));
        const px = Math.round(clamp(base.bottomStart - (clientY - base.startY), 112, max));
        setLayoutVar('--bottom-h', px + 'px');
        out = { bottomH: px + 'px' };
      }
      if(out) active.pending = out;
    };
    const stop = () => {
      if(!active) return;
      if(active.pending) writeLayout(active.pending);
      try { active.handle.releasePointerCapture(active.pointerId); } catch(e){}
      active.handle.classList.remove('active');
      document.body.classList.remove('resizing', 'resizing-col', 'resizing-row');
      active = null;
    };
    window.addEventListener('pointermove', e => {
      if(!active) return;
      e.preventDefault();
      update(active.type, e.clientX, e.clientY, active);
    });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    handles.forEach(handle => {
      const type = handle.dataset.resize;
      handle.addEventListener('pointerdown', e => {
        if(!canResize(type)) return;
        const bottom = document.querySelector('.grid-bottom');
        active = {
          type,
          handle,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          bottomStart: bottom ? bottom.getBoundingClientRect().height : cssNum('--bottom-h', 210),
          pending: null,
        };
        try { handle.setPointerCapture(e.pointerId); } catch(e){}
        handle.classList.add('active');
        document.body.classList.add('resizing', handle.classList.contains('horizontal') ? 'resizing-row' : 'resizing-col');
        e.preventDefault();
      });
      handle.addEventListener('dblclick', () => resetResize(type));
      handle.addEventListener('keydown', e => {
        if(!canResize(type)) return;
        const big = e.shiftKey ? 32 : 16;
        const layout = readLayout();
        const setAndSave = (name, value) => { setLayoutVar(name, value); writeLayout(name === '--rail-w' ? {railW:value} : name === '--inspector-w' ? {inspectorW:value} : name === '--gm-right-w' ? {gmRightW:value} : name === '--bottom-h' ? {bottomH:value} : {recallLeft:value}); };
        if(type === 'rail' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.railW || getComputedStyle(document.documentElement).getPropertyValue('--rail-w')) || 205;
          setAndSave('--rail-w', Math.round(clamp(cur + (e.key === 'ArrowRight' ? big : -big), 150, 340)) + 'px');
        }
        if(type === 'inspector' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          if(memPane()){
            const shell = document.querySelector('.shell').getBoundingClientRect();
            const cur = parseFloat(layout.gmRightW || getComputedStyle(document.documentElement).getPropertyValue('--gm-right-w')) || 980;
            setAndSave('--gm-right-w', Math.round(clamp(cur + (e.key === 'ArrowLeft' ? big : -big), 420, Math.max(440, shell.width - 320))) + 'px');
          } else {
            const cur = parseFloat(layout.inspectorW || getComputedStyle(document.documentElement).getPropertyValue('--inspector-w')) || 295;
            setAndSave('--inspector-w', Math.round(clamp(cur + (e.key === 'ArrowLeft' ? big : -big), 230, 460)) + 'px');
          }
        }
        if(type === 'bottom' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const cur = parseFloat(layout.bottomH || getComputedStyle(document.documentElement).getPropertyValue('--bottom-h')) || 210;
          setAndSave('--bottom-h', Math.round(clamp(cur + (e.key === 'ArrowUp' ? big : -big), 112, 380)) + 'px');
        }
        if(type === 'recall' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          const cur = parseFloat(layout.recallLeft || getComputedStyle(document.documentElement).getPropertyValue('--recall-left')) || 64;
          setAndSave('--recall-left', clamp(cur + (e.key === 'ArrowRight' ? 3 : -3), 36, 76).toFixed(1) + '%');
        }
      });
    });
  }
  applyStoredLayout();
  applyStoredGrows();

