// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ── GLOBAL MEMORY dashboard: health donut · top sources · vector index · stats.
  //    Everything from Z.mem (/memory-status) — 0 new endpoint, 0 fabricated numbers.
  function renderGmem(){
    var m=Z.mem||{},vec=m.vectors||{},tot=m.totals||{},info=m.info||{},tbl=info.tables||[];
    if(!zid('gmStats'))return;
    var cov=vec.coverage==null?null:vec.coverage;
    // Bảng số = NHÀ DUY NHẤT của mấy con số này. Donut "Sức khoẻ" + card "Vector Index"
    // riêng đã BỎ (2026-07-26): donut chiếm cả 1 card chỉ để nói 1 con số %, còn Vector
    // Index là 4 dòng — cả hai thành tile ở đây, cùng khuôn, đỡ 2 card.
    function T(nm){var r=tbl.find(function(x){return x.name===nm;});return r?r.rows:0;}
    var digN=T('session_digest'),sessN=T('sessions');
    // KHÔNG lặp lại Messages/Sessions/Vector-coverage/Storage — Trang chủ đã sở hữu 6 ô
    // at-a-glance đó (user 2026-07-26: "nhiều card quá dư"). Ở đây chỉ những số Trang chủ
    // KHÔNG có; riêng "Chờ embed" giữ vì nó là việc-cần-làm, khác con số coverage.
    var tiles=[['⏳',t('st.waitEmbed'),zN(vec.remaining||0),'hint.pending',vec.remaining?t('gm.pendingHint'):t('gm.pendingNone')],
      ['⬢','Vector dims',stdEsc(vec.dims||'—'),'hint.dims',''],
      ['📝','Digest',zN(digN),'hint.digest',sessN?(digN>=sessN?t('gm.digestFull'):t('gm.digestLeft').replace('{n}',zN(sessN-digN))):''],
      ['≈','Tokens (~)','~'+zN(m.tokensEst),'hint.tok',t('st.estimate')],
      ['§','Section',zN(T('section')),'hint.section',''],
      ['⟳','Changelog',zN(T('changelog')),'hint.changelog',''],
      ['📄','Doc',zN(T('doc')),'hint.doc',''],
      ['🗄','Known stores',zN(T('known_stores')),'hint.stores','']];
    zid('gmStats').innerHTML='<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">'
      +tiles.map(function(s){return '<div style="border:1px solid var(--border);border-radius:10px;padding:11px 13px"><div style="font-size:19px;font-weight:700">'+s[2]+'</div><div class="muted" style="font-size:11.5px">'+s[0]+' '+s[1]+'<span class="qh" data-hint="'+stdEsc(t(s[3]))+'">?</span></div>'+(s[4]?'<div class="muted" style="font-size:10.5px;margin-top:2px">'+stdEsc(s[4])+'</div>':'')+'</div>';}).join('')+'</div>';
  }
  // ── INSIGHTS: deterministic only — daily activity · agent mix · growth · health.
  //    /insights (time-series COUNT/SUM from DB) + Z.mem (vector coverage). 0 AI, 0 forecast.
  var insData=null;
  function renderInsights(){
    var w=zid('insDaily');if(!w)return;
    zGet('/insights?days=30').then(function(d){insData=d||{};insDraw();}).catch(function(){w.innerHTML='<div class="muted" style="font-size:12px">'+t('ph.err')+'</div>';});
  }
  // Trục thời gian: lấy ~4 mốc rải đều từ mảng nhãn. Render bằng HTML (xem CSS .xaxis —
  // chữ trong SVG bị bóp méo vì preserveAspectRatio="none").
  function xAxis(labels,fmt){
    if(!labels.length)return '';
    var n=Math.min(4,labels.length),out=[];
    for(var i=0;i<n;i++){
      var idx=n===1?0:Math.round(i*(labels.length-1)/(n-1));
      out.push('<span>'+stdEsc(fmt?fmt(labels[idx]):labels[idx])+'</span>');
    }
    return '<div class="xaxis">'+out.join('')+'</div>';
  }
  function dayShort(s){var p=String(s||'').split('-');return p.length>=3?(p[2]+'/'+p[1]):String(s||'');}
  // Bar ngang dùng chung cho 2 chart hạng mục (Top Sources · Bộ nhớ theo dự án)
  function barRows(rows){
    if(!rows.length)return '<div class="muted" style="font-size:12px">'+t('ins.noData')+'</div>';
    var mx=rows.reduce(function(a,x){return Math.max(a,x.v||0);},1);
    return rows.map(function(r){var pc=Math.max(3,Math.round((r.v||0)/mx*100));
      return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:3px"><span class="nm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+stdEsc(r.full||r.k)+'">'+stdEsc(r.k)+'</span><span class="muted" style="flex:0 0 auto">'+r.sub+'</span></div><div style="height:5px;background:var(--surface-3);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pc+'%;background:var(--primary);border-radius:3px"></div></div></div>';
    }).join('');
  }
  function insDraw(){
    var d=insData||{},daily=d.daily||[],agents=d.agents||[],monthly=d.monthly||[],projects=d.projects||[];
    // ① Hoạt động theo ngày — bar + TRỤC NGÀY
    var mx=daily.reduce(function(a,x){return Math.max(a,x.messages||0);},1),bw=daily.length?100/daily.length:100;
    zid('insDaily').innerHTML=daily.length?('<svg viewBox="0 0 100 40" preserveAspectRatio="none">'+daily.map(function(x,i){var h=Math.max(0.5,(x.messages||0)/mx*38);return '<rect x="'+(i*bw+bw*0.12).toFixed(2)+'" y="'+(40-h).toFixed(2)+'" width="'+(bw*0.76).toFixed(2)+'" height="'+h.toFixed(2)+'" fill="var(--primary)"><title>'+x.day+': '+x.messages+'</title></rect>';}).join('')+'</svg>'
      +xAxis(daily.map(function(x){return x.day;}),dayShort)
      +'<div class="chart-note">'+daily.length+' '+t('ins.days')+' · '+t('ins.peak')+' '+zN(mx)+' msg</div>'):'<div class="muted" style="font-size:12px">'+t('ins.noData')+'</div>';
    // ② Tăng trưởng (cộng dồn) — line + TRỤC THÁNG
    var cum=0,pts=monthly.map(function(x){cum+=(x.messages||0);return cum;}),gmx=cum||1;
    if(pts.length>1){var step=100/(pts.length-1),line=pts.map(function(c,i){return (i*step).toFixed(2)+','+(40-(c/gmx*40)).toFixed(2);}).join(' ');
      zid('insGrowth').innerHTML='<svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="0,40 '+line+' 100,40" fill="var(--wash)" stroke="none"></polyline><polyline points="'+line+'" fill="none" stroke="var(--primary)" stroke-width="1"></polyline></svg>'
        +xAxis(monthly.map(function(x){return x.month;}))
        +'<div class="chart-note">'+pts.length+' '+t('ins.months')+' · '+t('ins.total')+' '+zN(cum)+' msg</div>';
    } else zid('insGrowth').innerHTML='<div class="muted" style="font-size:12px">'+t('ins.noData')+'</div>';
    // ③ Top Sources (agent nào) · ④ Bộ nhớ theo dự án — hạng mục, không có trục thời gian
    zid('insAgents').innerHTML=barRows(agents.map(function(a){
      return {k:a.source||'—',v:a.messages,sub:zN(a.messages)+' · '+zN(a.sessions)+' '+t('ins.sess')};}));
    var pj=zid('insProjects');
    if(pj)pj.innerHTML=barRows(projects.map(function(x){
      return {k:zProjName(x.project)||x.project,full:x.project,v:x.messages,sub:zN(x.messages)+' · '+zN(x.sessions)+' '+t('ins.sess')};}));
    // (Đã gỡ 4 ô "Sức khoẻ" ở đây — Vector coverage/Digest/Sessions/Messages đã có ở
    //  sub-tab Tổng quan ngay cạnh. Xu hướng chỉ vẽ thứ THEO THỜI GIAN.)
  }

  // ── DỜI TỪ graph.js 2026-08-07: số liệu Global Memory, không phải graph
  function renderMem(m){
    m=m||{};
    // Chống ĐUA vẽ-đè (2026-08-21, user báo "công tắc tự bật tắt hoài"): một /memory-status
    // BẮN TRƯỚC lúc bấm toggle có thể VỀ SAU (lượt lạnh đo >30s khi máy bận) và vẽ đè trạng
    // thái CŨ lên nút vừa bật — nhìn y như nó tự tắt, vòng poll sau lại tự bật. Trong 90s sau
    // cú bấm, giá trị LOCAL thắng; hết cửa sổ thì server là sự thật (POST hỏng thật thì sau
    // 90s nút tự quay về đúng trạng thái server — không giấu lỗi vĩnh viễn).
    try{var fa=Z.flagsAt||{};['hybrid','rerank','scope','pathsWatch','lang'].forEach(function(k){
      if(fa[k]&&Date.now()-fa[k]<90000&&Z.mem&&m[k]!==Z.mem[k])m[k]=Z.mem[k];
    });}catch(_){}
    Z.mem=m;
    var tot=m.totals||{},vec=m.vectors||{},cap=m.coverage||{};
    // Trang chủ = 6 ô "at a glance" DUY NHẤT. Bảng số chi tiết (Sections/Digest/Changelog/
    // Doc/Known stores/Tokens) sống ở Global Memory › Tổng quan — trước đây màn Nạp&Đồng bộ
    // có thêm 10 stat card lặp lại y hệt, đã gỡ.
    zset('stMsg',zN(tot.messages));zset('stSess',zN(tot.sessions));
    zset('stVec',vec.coverage==null?'—':vec.coverage+'%');zset('stVecSub',zN(vec.count)+' vec'+(vec.remaining?' · '+zN(vec.remaining)+t('st.pending'):''));
    zset('stStore',zBytes(m.sizeKB));
    var ls=relTime(m.lastSync);zset('stSync',ls.big);zset('stSyncSub',ls.sub);
    if(zid('mScope'))zid('mScope').innerHTML=renderScope(m.scopeTree||[]);
    var rh=zid('rHybrid'),rr=zid('rRerank');if(rh)rh.classList.toggle('on',!!m.hybrid);if(rr)rr.classList.toggle('on',!!m.rerank);
    var d=m.drive||{};zset('driveBundles',d.linked?(d.error?'—':(zN(d.bundles)+' bundle')):t('drv.notLinkedShort'));
    if(zid('driveInput')&&document.activeElement!==zid('driveInput'))zid('driveInput').value=d.path||'';
    zset('driveState',driveMsg(d));setLvl(d.level||'lean');var la=zid('lvAtt');if(la)la.classList.toggle('on',!!d.atts);
    renderDriveDonut(d);
    applyI18n(m.lang||'vi'); // nút VI/EN tô trong applyI18n; `lang` được lưới flagsAt 90 s che khỏi payload cũ (ở trên)
    var fa=zid('fAgent');if(fa){var fac=fa.value;fa.innerHTML='<option value="" data-i18n="f.agentAny">'+t('f.agentAny')+'</option>'+((m.agents||[]).map(function(a){return '<option value="'+stdEsc(a.source)+'">'+stdEsc(a.source)+'</option>';}).join(''));fa.value=fac;}
    fillSessFilters(m); // 2 select riêng của tab Phiên, cùng nguồn dữ liệu — không endpoint mới
    renderHomeProjects(cap);renderProjGrid(cap);renderDiscovered(cap);renderGmem();
    zset('stProjects',zN((Z.status&&Z.status.knownProjects||[]).length));
  }
  // #5: discovered (chưa liên kết) projects grouped by machine + Add per project.

  // ── DỜI TỪ graph.js 2026-08-07: Drive sync (IA: sync đi với Global Memory)
  // `error` TRƯỚC `exists`: probe Drive chạy trong con có trần 8 s — Drive bận (đang upload lại một khúc
  // lớn) thì probe trượt và trả exists:false + error "not responding". Đọc `exists` trước biến "không trả
  // lời" thành "✗ folder does not exist · 0 bundle" trên một thư mục có thật (ảnh headless 2026-09-07,
  // đo probe trực tiếp 313 ms exists:true ngay sau đó) — vỏ rỗng nói dối, đúng thứ 02_RULES cấm.
  function driveMsg(d){if(!d||!d.linked)return t('drv.notLinked');if(d.error==='probing…')return '… '+t('drv.probing');if(d.error)return '⚠ '+t('drv.probeErr');if(!d.exists)return '✗ '+t('drv.noFolder');if(!d.writable)return '✗ '+t('drv.readOnly');return '✓ '+t('drv.linked').replace('{n}',zN(d.bundles));}
  // Làm tươi TỨC THÌ hai thứ mà một lần quét vừa làm đổi: Drive còn thiếu bao nhiêu, và
  // cây Sources. Đường riêng, rẻ — không đi qua gói /memory-status nặng.
  function syncPulse(){
    return zGet('/sync-pulse').then(function(d){
      if(!d)return;
      if(d.drive)renderDriveDonut(d.drive);
      var sc=zid('mScope');if(sc&&d.scopeTree)sc.innerHTML=renderScope(d.scopeTree);
    }).catch(function(){});
  }
  // ── ĐÈN SỨC KHOẺ SYNC (user chốt 2026-08-30: "nó gãy ở drive thì cũng phải báo sync vấn đề,
  //    user chỉ nhìn dashboard") — backend gộp mọi tầng thành {level, code, mins, detail};
  //    FE chỉ dịch code qua i18n. Level ok + code 'ok' ⇒ ẩn dòng (không chiếm chỗ khi lành).
  function renderDrvHealth(h){
    var el=zid('drvHealth');if(!el)return;
    if(!h||h.code==='ok'){el.hidden=true;el.className='drv-health';return;}
    var msg=t('drv.h.'+h.code)||h.code;
    msg=msg.replace('{m}',h.mins!=null?zN(h.mins):'?').replace('{d}',h.detail||'').replace('{p}',h.code==='running'&&h.detail?(' · '+h.detail):'');
    el.textContent=msg;el.hidden=false;
    el.className='drv-health'+(h.level==='error'?' err':h.level==='warn'?' warn':'');
  }
  // Daemon CÂM cũng là một trạng thái phải hiện — không được để dashboard thành ảnh tĩnh
  // (đo 2026-08-30: ổ G: đơ kéo daemon đông cứng 2 giờ, UI hiện số cũ như thể mọi thứ ổn).
  // 2 lượt /memory-status hỏng LIÊN TIẾP mới báo (một lượt lạnh >30s là bình thường).
  var memFails=0;
  function gmPollFailed(){if(++memFails>=2)renderDrvHealth({level:'error',code:'noData'});}
  function gmPollOk(){memFails=0;}
  var DONUT_C=2*Math.PI*16;
  function renderDriveDonut(d){
    var arc=zid('driveArc'),lbl=zid('driveDonutPct');if(!arc||!lbl)return;
    var pct=Math.max(0,Math.min(100,(d&&d.syncPercent!=null)?d.syncPercent:0));
    if(pct>=100)arc.removeAttribute('stroke-dasharray'); // solid ring — no dash seam, no track sliver
    else arc.setAttribute('stroke-dasharray',(pct/100*DONUT_C).toFixed(1)+' '+DONUT_C.toFixed(1));
    arc.style.stroke=pct>=100?'var(--success)':(pct<50?'var(--warn)':'var(--primary)');
    lbl.textContent=pct+'%';
    var txt=zid('driveSyncedTxt'),sub=zid('driveSyncedSub'),pend=(d&&d.pendingMessages)||0;
    if(txt)txt.textContent=pend?(t('drv.pendN').replace('{n}',zN(pend))):t('drv.upToDate');
    if(sub)sub.textContent=pend?t('drv.pendSub'):t('drv.upToDateSub');
    renderDrvHealth(d&&d.health);
    // Mốc kiểm chứng: "đủ" chỉ đáng tin khi lần đẩy KHÔNG cũ hơn tin mới nhất. Nếu cũ hơn
    // thì có tin mới chưa nạp vào DB ⇒ nói thẳng, đừng để card báo an toàn giả.
    var nw=d&&d.newestAt,lp=d&&d.lastPushAt;
    // relTime trả về OBJECT {big,sub} chứ không phải chuỗi — dùng thẳng ra "[object Object]".
    zset('drvNewest',nw?relTime(nw).big:'—');
    zset('drvLastPush',lp?relTime(lp).big:t('drv.never'));
    zset('drvCount',zN((d&&d.syncedMessages)||0)+' / '+zN((d&&d.totalMessages)||0));
    var stale=!pend&&nw&&lp&&(new Date(nw)>new Date(lp));
    if(stale&&sub)sub.textContent=t('drv.staleSub');
    var fx=document.querySelector('.drv-facts');
    if(fx)fx.classList.toggle('stale',!!stale||pend>0);
  }
  function setLvl(l){var a=zid('lvLean'),b=zid('lvFull');if(a)a.classList.toggle('on',l!=='full');if(b)b.classList.toggle('on',l==='full');}

  // ── KÊNH MÁY-TỚI-MÁY (plan/24 §5) ────────────────────────────────────────
  // Tab Drive ở trên giữ NGUYÊN TRẠNG — khối này chỉ THÊM một pane.
  // 🔴 Hai khái niệm tách đôi, và bề mặt phải nói ra điều đó:
  //    công tắc = có NHẬN không (bật cùng lúc với Drive được)
  //    ô chọn   = GỬI đi đâu, ĐÚNG MỘT (hai kẻ cùng ghi đã hỏng kho HAI LẦN — HP điều 11).
  function p2pMsg(s){zset('p2pMsg',s||'');}
  function renderChannel(c){
    if(!c)return;
    zset('p2pBlocks',zN(c.blocks||0));zset('p2pPort',String(c.port||'—'));
    var idIn=zid('p2pMyId');if(idIn&&document.activeElement!==idIn)idIn.value=c.deviceId||'';
    var tg=zid('p2pToggle');if(tg)tg.classList.toggle('on',!!c.enabled);
    var a=zid('trDrive'),b=zid('trP2p');
    if(a)a.classList.toggle('on',c.transport!=='p2p');
    if(b)b.classList.toggle('on',c.transport==='p2p');
    var box=zid('p2pPeers');
    if(box){
      var ps=c.peers||[];
      if(!ps.length){box.textContent=t('p2p.none');}
      else{
        box.innerHTML='';
        ps.forEach(function(id){
          var row=document.createElement('div');
          row.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:3px';
          var s=document.createElement('span');s.style.cssText='flex:1;font-family:var(--mono,monospace);font-size:10.5px';s.textContent=id;
          var x=document.createElement('button');x.className='btn sm';x.textContent=t('p2p.unpair');
          x.setAttribute('data-act','p2p-unpair');x.setAttribute('data-id',id);
          row.appendChild(s);row.appendChild(x);box.appendChild(row);
        });
      }
    }
  }
  function loadChannel(){return zGet('/channel-status').then(renderChannel).catch(function(){});}
  window.zLoadChannel=loadChannel;
  // Mở ⚙ ⇒ nạp luôn, để số trong đó không bao giờ là số cũ của lần mở trước.
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#topSettings'))setTimeout(loadChannel,60);});

  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-synctab],[data-act],[data-tr]'):null;
    if(!el)return;
    var tab=el.getAttribute('data-synctab');
    if(tab){
      // Hai loại sync sống trong ⚙ (user chốt: "nhét phần liên kết này vào setting").
      var dr=tab==='drive',pd=zid('syncPaneDrive'),pp=zid('syncPaneP2p');
      if(pd)pd.style.display=dr?'':'none';
      if(pp)pp.style.display=dr?'none':'';
      zid('syncTabDrive').classList.toggle('on',dr);
      zid('syncTabP2p').classList.toggle('on',!dr);
      if(!dr)loadChannel();
      return;
    }
    var tr=el.getAttribute('data-tr');
    if(tr){
      // Đi qua zSave: đổi ĐÍCH GHI là thao tác lưu, hỏng mà im lặng thì người dùng tưởng
      // đã đổi kênh trong khi vẫn ghi chỗ cũ — đúng kiểu vỏ-rỗng mà 02_RULES cấm.
      var was=zid('trP2p')&&zid('trP2p').classList.contains('on')?'p2p':'drive';
      zSave('/set-p2p?transport='+encodeURIComponent(tr),function(){
        var a=zid('trDrive'),b=zid('trP2p');
        if(a)a.classList.toggle('on',was!=='p2p');
        if(b)b.classList.toggle('on',was==='p2p');
      }).then(function(j){if(j)loadChannel();});
      return;
    }
    var act=el.getAttribute('data-act');
    if(act==='p2p-toggle'){
      // zSave, KHÔNG zPost: cổng `save-never-silent` (2026-09-12) cấm công tắc tự xử lời
      // hứa lưu. Ba kiểu hỏng (gọi hỏng · HTTP≠2xx · {ok:false}) đều phải HOÀN NGUYÊN + báo.
      var wasOn=el.classList.contains('on');
      el.classList.toggle('on',!wasOn); // lạc quan, để nút phản hồi ngay
      zSave('/set-p2p?on='+(wasOn?'0':'1'),function(){el.classList.toggle('on',wasOn);})
        .then(function(j){if(j)loadChannel();});
    }
    else if(act==='p2p-copy'){
      var v=(zid('p2pMyId')||{}).value||'';
      if(v&&navigator.clipboard)navigator.clipboard.writeText(v);
      p2pMsg(t('p2p.copied'));
    }
    else if(act==='p2p-pair'){
      var id=(zid('p2pPeerIn')||{}).value||'';
      if(!id.trim()){p2pMsg(t('p2p.needId'));return;}
      zPost('/channel-pair?id='+encodeURIComponent(id.trim())).then(function(r){
        if(r&&r.ok===false){p2pMsg('✗ '+(r.error||''));return;}
        zid('p2pPeerIn').value='';p2pMsg(t('p2p.paired'));loadChannel();
      });
    }
    else if(act==='p2p-unpair'){
      zPost('/channel-pair?drop=1&id='+encodeURIComponent(el.getAttribute('data-id')||'')).then(loadChannel);
    }
    else if(act==='p2p-sync'){
      var h=((zid('p2pHost')||{}).value||'').trim(),pt=((zid('p2pPortIn')||{}).value||'').trim();
      if(!h||!pt){p2pMsg(t('p2p.needAddr'));return;}
      p2pMsg(t('p2p.syncing'));
      zPost('/channel-sync?host='+encodeURIComponent(h)+'&port='+encodeURIComponent(pt)).then(function(r){
        // Lỗi trả NGUYÊN VĂN: "khác chìa" và "máy lạ" là hai chuyện khác nhau, gộp thành
        // một chữ "lỗi" là bắt người dùng đoán (cùng doctrine `save-never-silent`).
        if(!r||r.ok===false){p2pMsg('✗ '+((r&&r.error)||''));loadChannel();return;}
        p2pMsg('✓ '+t('p2p.result').replace('{s}',zN(r.sentBlocks||0)).replace('{r}',zN(r.receivedBlocks||0)));
        loadChannel();
      });
    }
    else if(act==='p2p-probe'){
      p2pMsg(t('p2p.probing'));
      zPost('/channel-probe').then(function(r){
        p2pMsg(r&&r.mapped?t('p2p.mapped').replace('{n}',String(r.externalPort)):t('p2p.notMapped'));
      });
    }
  });
