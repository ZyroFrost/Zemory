// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ---- Harness: docs viewer = REAL /standard-doc (overrides mock stdRender) ----
  var stdReal={};
  function stdRenderReal(){
    var tt=zid('stdTitle');if(!tt)return;stdReal=stdReal||{};
    tt.textContent=stdFile.replace('agent/','').replace('plan/','plan / ');
    zid('stdProfTag').textContent=t('hn.profile').replace('{p}',stdProf==='app'?'APP':'NON-APP');
    document.querySelectorAll('#stdTree .ti').forEach(function(x){x.classList.toggle('on',x.dataset.f===stdFile);});
    zid('stdApp').classList.toggle('on',stdProf==='app');zid('stdNon').classList.toggle('on',stdProf==='nonapp');
    var prof=stdProf==='app'?'app':'non-app',key=prof+':'+stdFile;
    if(stdReal[key]){zid('stdBody').innerHTML=stdMd(stdReal[key]);return;}
    zid('stdBody').innerHTML='<div class="muted">'+t('st.loadingDoc')+stdEsc(stdFile)+'…</div>';
    zGet('/standard-doc?profile='+prof+'&file='+encodeURIComponent(stdFile)).then(function(r){var c=(r&&r.content)||t('st.empty');stdReal[key]=c;zid('stdBody').innerHTML=stdMd(c);}).catch(function(){zid('stdBody').innerHTML='<div class="muted">'+t('st.docErr')+'</div>';});
  }
  // GỠ 2026-09-16 (user chốt): trình xem docs theo project (`phTree`/`phOpen`/`phValidate`, đọc
  // `/harness-files` + `/doc`). Bấm vào một dự án rồi bị đưa vào đọc `AGENTS.md` với `docs/agent/*`
  // là việc KHÔNG liên quan tới thứ người ta vừa bấm. Chi tiết dự án nay chỉ còn Graph.
  // Endpoint `/harness-files` phía backend GIỮ NGUYÊN (không tự xoá — `02_RULES §Hành xử`); nó nay
  // không còn người gọi trong FE, nêu ra để user quyết bỏ hay để.
