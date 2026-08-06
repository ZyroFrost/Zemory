// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ---- Harness: docs viewer = REAL /standard-doc (overrides mock stdRender) ----
  var stdReal={};
  function stdRenderReal(){
    var tt=zid('stdTitle');if(!tt)return;stdReal=stdReal||{};
    tt.textContent=stdFile.replace('agent/','').replace('plan/','plan / ');
    zid('stdProfTag').textContent='hệ '+(stdProf==='app'?'APP':'NON-APP');
    document.querySelectorAll('#stdTree .ti').forEach(function(x){x.classList.toggle('on',x.dataset.f===stdFile);});
    zid('stdApp').classList.toggle('on',stdProf==='app');zid('stdNon').classList.toggle('on',stdProf==='nonapp');
    var prof=stdProf==='app'?'app':'non-app',key=prof+':'+stdFile;
    if(stdReal[key]){zid('stdBody').innerHTML=stdMd(stdReal[key]);return;}
    zid('stdBody').innerHTML='<div class="muted">đang tải '+stdEsc(stdFile)+'…</div>';
    zGet('/standard-doc?profile='+prof+'&file='+encodeURIComponent(stdFile)).then(function(r){var c=(r&&r.content)||'(trống)';stdReal[key]=c;zid('stdBody').innerHTML=stdMd(c);}).catch(function(){zid('stdBody').innerHTML='<div class="muted">lỗi tải doc</div>';});
  }
  // ── Per-project Harness: real docs viewer (this project's docs/agent + plan +
  //    AGENTS.md) · click file → /doc?root=&file= · reuse stdMd markdown renderer.
  var phFile='',phDoc={},phRoot='';
  function phRow(rel,label){return '<div class="ti ind" data-f="'+stdEsc(rel)+'">📄 '+stdEsc(label)+'</div>';}
  function loadProjHarness(root){
    phRoot=root||'';var tr=zid('phTree');if(!tr)return;
    tr.innerHTML='<div class="muted" style="font-size:11.5px">…</div>';
    zGet('/harness-files?root='+encodeURIComponent(phRoot)).then(function(d){
      d=d||{};var h='';
      if(d.hasAgents)h+=phRow('AGENTS.md','AGENTS.md');
      if((d.agent||[]).length){h+='<div class="section-t">docs/agent/</div>';(d.agent||[]).forEach(function(f){h+=phRow(f,f);});}
      if((d.plan||[]).length){h+='<div class="section-t">docs/plan/</div>';(d.plan||[]).forEach(function(f){h+=phRow('plan/'+f,f);});}
      tr.innerHTML=h||'<div class="muted" style="font-size:11.5px">'+t('ph.none')+'</div>';
      var first=tr.querySelector('.ti[data-f]');
      if(first)phOpen(first.dataset.f);
      else{zid('phTitle').textContent='—';zid('phBody').innerHTML='<div class="muted">'+t('ph.none')+'</div>';}
    }).catch(function(){tr.innerHTML='<div class="muted" style="font-size:11.5px">'+t('ph.err')+'</div>';});
  }
  function phOpen(rel){
    phFile=rel;var body=zid('phBody'),tt=zid('phTitle');if(!body)return;
    if(tt)tt.textContent=rel.replace('plan/','plan / ');
    document.querySelectorAll('#phTree .ti').forEach(function(x){x.classList.toggle('on',x.dataset.f===rel);});
    var key=phRoot+'|'+rel;
    if(phDoc[key]){body.innerHTML=stdMd(phDoc[key]);return;}
    body.innerHTML='<div class="muted">…</div>';
    zGet('/doc?root='+encodeURIComponent(phRoot)+'&file='+encodeURIComponent(rel)).then(function(r){var c=(r&&r.content)||'(trống)';phDoc[key]=c;if(phFile===rel)body.innerHTML=stdMd(c);}).catch(function(){body.innerHTML='<div class="muted">'+t('ph.err')+'</div>';});
  }
  document.addEventListener('click',function(e){
    if(!e.target.closest)return;
    var ti=e.target.closest('#phTree .ti[data-f]');if(ti){phOpen(ti.dataset.f);return;}
    if(e.target.id==='phValidate'){var pv=e.target;pv.textContent='…';zGet('/check?feature=validate&root='+encodeURIComponent(phRoot)).then(function(r){zToast(r&&r.ok?t('ph.valOk'):t('ph.valBad'));pv.textContent='validate';}).catch(function(){pv.textContent='validate';});}
  });
