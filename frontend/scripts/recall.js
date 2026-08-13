// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ---- Recall: real search + preview ----
  var rHits=[],rSel=null;
  // Real relevance score only — NO fabricated fallback (recent-messages mode has
  // no score, so show nothing rather than an invented number).
  function rScore(h){var n=Number(h.score||h.rank||h.similarity||0);if(n>0&&n<=1)return n.toFixed(2);if(n>1)return Math.min(0.99,n/100).toFixed(2);return '';}
  function recallRow(h,i){var sc=rScore(h),na=h.atts?h.atts.length:0;return '<div class="hit'+(h.id===rSel?' sel':'')+'" data-hit="'+h.id+'" data-sess="'+stdEsc(h.sessionId||'')+'"><div class="top">'+(sc?'<span class="score">'+sc+'</span> ':'')+stdEsc(h.role||'msg')+' · '+stdEsc(zProjName(h.project))+' <span class="tagx">'+stdEsc(h.source||'session')+'</span>'+(na?'<span class="att-n">🖼'+na+'</span>':'')+'<span class="openfull" data-openfull="'+stdEsc(h.sessionId||'')+'" title="'+t('recall.openFull')+'">⤢</span></div><div class="txt">'+stdEsc(String(h.snippet||'').slice(0,170))+'</div><div class="dt">'+String(h.timestamp||'').slice(0,10)+' · #'+h.id+'</div></div>';}
  // ⤢ "Mở full session" — nhảy sang sub-tab Recall › Phiên và mở phiên đó ở ĐÚNG MỘT
  // viewer. Trước đây mở dialog #sessDlg = viewer thứ hai render lại y hệt (đã gỡ).
  function openFullSession(sid){
    if(!sid)return;
    subSet('data-rc','sess'); // subLoad() gọi loadSessions(); openSess giữ được highlight
    openSess(sid);
  }
  document.addEventListener('click',function(e){
    var of=e.target.closest?e.target.closest('[data-openfull]'):null;
    if(of){e.stopPropagation();openFullSession(of.dataset.openfull);}
  });
  // `deep` là lựa chọn CỦA TỪNG LƯỢT TÌM, cố ý KHÔNG lưu và KHÔNG lấy từ setting máy: mặc
  // định mỗi lần mở là lớp rẻ (FTS + bộ lọc, ~0,4s). Lớp ngữ nghĩa 20–60s nên phải là thứ
  // người dùng chủ động xin, không phải thứ họ vô tình để bật từ hôm trước.
  function deepOn(){var d=zid('rDeep');return !!(d&&d.classList.contains('on'));}
  function recallParams(){
    var p='all='+(zid('rAll').classList.contains('on')?1:0),f;
    if(deepOn())p+='&deep=1';
    if((f=zid('fTime'))&&f.value!=='0')p+='&days='+f.value;
    if((f=zid('fType'))&&f.value)p+='&role='+f.value;
    if((f=zid('fOrigin'))&&f.value)p+='&origin='+encodeURIComponent(f.value);
    if((f=zid('fAgent'))&&f.value)p+='&agent='+encodeURIComponent(f.value);
    if((f=zid('rImg'))&&f.classList.contains('on'))p+='&withAtt=1';
    return p;
  }
  function renderHits(hits,label){
    rHits=hits||[];
    if(!zid('hits'))return;
    if(!rHits.length){zset('rCount',t('q.zero'));zid('hits').innerHTML='<div class="muted" style="padding:12px">'+t('q.noResults')+'</div>';return;}
    zset('rCount',(label||'')+rHits.length+' '+t('q.results'));
    zid('hits').innerHTML=rHits.map(function(h,i){return recallRow(h,i);}).join('');
    selRecall(rHits[0].id);
  }
  function doRecall(){
    var q=zid('rq')?zid('rq').value.trim():'';
    if(q.length<2){loadRecent();return;}
    // Lượt sâu mất 20–60s (chạy ở tiến trình con, cửa sổ vẫn dùng được) — phải nói rõ đang
    // chờ, không thì trông như treo.
    zset('rCount',t(deepOn()?'q.searchingDeep':'q.searching'));
    zGet('/memory-search?q='+encodeURIComponent(q)+'&'+recallParams()).then(function(h){
      // Đường sâu trả `{error,hits}` khi tiến trình con hỏng/quá giờ — nói thẳng, đừng hiện
      // "0 kết quả" (0 kết quả và tìm-hỏng trông y hệt nhau, đó là kiểu nói dối tệ nhất).
      if(h&&h.error){zset('rCount',t('q.deepErr')+' — '+h.error);renderHits([]);return;}
      renderHits(h);
    }).catch(function(){zset('rCount',t('q.err'));});
  }
  function loadRecent(){
    if(!zid('hits'))return;
    zset('rCount',t('recall.loadingRecent'));
    zGet('/recent-messages?limit=25&'+recallParams()).then(function(h){renderHits(h,t('recall.recentLabel'));}).catch(function(){zset('rCount','—');});
  }
  function selRecall(id){
    rSel=id;document.querySelectorAll('#hits .hit').forEach(function(x){x.classList.toggle('sel',Number(x.dataset.hit)===id);});
    zset('rPreviewTitle',t('recall.preview')+' #'+id);if(zid('rPreview'))zid('rPreview').innerHTML='<div class="muted">'+t('recall.loadingCtx')+'</div>';
    zGet('/memory-context?id='+id).then(function(ctx){
      if(!ctx||!ctx.messages){zid('rPreview').innerHTML='<div class="muted">'+t('recall.noCtx')+'</div>';return;}
      zid('rPreview').innerHTML='<button class="btn sm" data-openfull="'+stdEsc(ctx.sessionId||'')+'" style="margin-bottom:10px">⤢ '+t('recall.openFull')+'</button><div class="thread">'+ctx.messages.map(function(m){return msgBlock(m,m.isHit?1200:390);}).join('')+'</div>';
    }).catch(function(){zid('rPreview').innerHTML='<div class="muted">'+t('recall.ctxErr')+'</div>';});
  }
  // Copy the preview thread text to clipboard (was a dead link before).
  document.addEventListener('click',function(e){if(!e.target||e.target.id!=='rCopy')return;var pv=zid('rPreview');if(!pv)return;
    var txt=(pv.innerText||pv.textContent||'').trim();if(!txt)return;
    var a=e.target,o=a.textContent;
    var done=function(){a.textContent='✓ '+t('recall.copied');setTimeout(function(){a.textContent=o;},1400);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done).catch(function(){done();});
    else done();
  });
  document.addEventListener('click',function(e){
    var hit=e.target.closest?e.target.closest('#hits .hit'):null;if(hit){selRecall(Number(hit.dataset.hit));return;}
    var sf=e.target.closest?e.target.closest('[data-sf]'):null;
    if(sf){sf.classList.toggle('on');loadSessions();return;}
    var rf=e.target.closest?e.target.closest('[data-rf]'):null;
    if(rf){var k=rf.dataset.rf;
      if(k==='all'){rf.classList.toggle('on');doRecall();}
      // `deep` KHÔNG gửi setting nào lên server — nó chỉ đổi lớp cho lượt tìm này.
      else if(k==='deep'){rf.classList.toggle('on');doRecall();}
      // Lọc thuần phía truy vấn (`withAtt=1`), KHÔNG phải setting lưu ở server như
      // hybrid/rerank — nên chỉ bật/tắt tại chỗ rồi chạy lại.
      else if(k==='img'){rf.classList.toggle('on');doRecall();}
      else if(k==='hybrid'){var on=!rf.classList.contains('on');rf.classList.toggle('on',on);zPost('/set-hybrid?on='+(on?1:0)).then(function(){if(zid('rq').value.trim().length>=2)doRecall();});}
      else if(k==='rerank'){var o2=!rf.classList.contains('on');rf.classList.toggle('on',o2);zPost('/set-rerank?on='+(o2?1:0)).then(function(){if(zid('rq').value.trim().length>=2)doRecall();});}
      return;
    }
    if(e.target.closest('[data-act="recall"]'))doRecall();
  });
  // Xem ảnh full. Ảnh nạp LẠI từ cùng URL content-addressed nên trình duyệt lấy từ
  // cache (immutable), không tải lần hai.
  function openImg(sha,cap){
    var d=zid('imgDlg');if(!d||!sha)return;
    zset('imgDlgTitle',cap||'');
    zid('imgDlgBody').innerHTML='<img alt="" src="/attachment?sha='+encodeURIComponent(sha)+'">';
    d.classList.add('on');
  }
  document.addEventListener('click',function(e){
    if(e.target.id==='imgDlg'||e.target.id==='imgDlgX'){var d=zid('imgDlg');if(d)d.classList.remove('on');return;}
    var th=e.target.closest?e.target.closest('[data-img]'):null;
    if(th)openImg(th.dataset.img,th.dataset.cap);
  });
  document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id==='rq')doRecall();});
  // `.ssel` = select của tab Phiên. Phải tách khỏi `.rsel` chung, nếu không đổi bộ lọc
  // phiên lại bắn một lượt recall (sai bề mặt, và tốn một truy vấn hybrid vô ích).
  document.addEventListener('change',function(e){
    var el=e.target;if(!el||!el.classList)return;
    if(el.classList.contains('ssel'))loadSessions();
    else if(el.classList.contains('rsel'))doRecall();
  });
