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
    zid('gmStats').innerHTML='<div class="tile-strip">'
      +tiles.map(function(s){return '<div class="tile"><div style="font-size:19px;font-weight:700">'+s[2]+'</div><div class="muted" style="font-size:11.5px">'+s[0]+' '+s[1]+'<span class="qh" data-hint="'+stdEsc(t(s[3]))+'">?</span></div>'+(s[4]?'<div class="muted" style="font-size:10.5px;margin-top:2px">'+stdEsc(s[4])+'</div>':'')+'</div>';}).join('')+'</div>';
    fitTiles();
  }

  // ── SỐ CỘT TÍNH THEO BỀ RỘNG THẬT, KHÔNG THEO BREAKPOINT CỨNG ─────────────────
  //
  // User chốt (nhắc tới lần thứ BA, 2026-09-18): *"khi full size nó là 1 hàng 8 card; khi kéo nhỏ
  // màn hình, khi có card nào bị nhỏ tới mức bị đè mất nội dung của chính nó thì mới xuống dòng,
  // nhưng nhảy theo kiểu CHIA ĐÔI"*.
  //
  // Vì sao KHÔNG làm được bằng CSS thuần — hai hướng đều hỏng, đã thử cả hai:
  //  · `flex-wrap` xếp THAM (nhét được bao nhiêu thì nhét) ⇒ 8 thẻ ra 7+1, một thẻ lẻ chơ vơ;
  //  · breakpoint cứng (`max-width:1500px` ⇒ 4 cột) ĐOÁN bề rộng khung từ bề rộng CỬA SỔ. Khung
  //    này nằm trong panel có thanh kéo, nên hai thứ đó không bằng nhau: cửa sổ 1600px mà khung
  //    chỉ ~1230px thì nó cắt xuống 4 cột trong khi 8 thẻ vẫn vừa.
  // ⇒ Đo bề rộng THẬT của khung, rồi chọn ƯỚC LỚN NHẤT của số thẻ mà mỗi thẻ vẫn đủ rộng. Ước nên
  //   mọi hàng luôn đầy: 8 → 4 → 2 → 1, không bao giờ có thẻ lẻ.
  var TILE_MIN=150;   // bề rộng tối thiểu để nội dung thẻ không bị đè (số + nhãn + dòng phụ)
  function fitTiles(){
    var strip=document.querySelector('#gmStats .tile-strip');if(!strip)return;
    var n=strip.children.length;if(!n)return;
    var gap=parseFloat(getComputedStyle(strip).columnGap)||10;
    var w=strip.clientWidth;if(!w)return;
    var cols=1;
    for(var d=n;d>=1;d--){
      if(n%d)continue;                                  // chỉ nhận ƯỚC ⇒ không hàng nào lẻ
      if((w-(d-1)*gap)/d>=TILE_MIN){cols=d;break;}
    }
    strip.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';
  }
  // Theo BỀ RỘNG KHUNG, không theo `window.resize`: người dùng kéo thanh chia panel thì cửa sổ
  // không đổi mà khung thì đổi — nghe nhầm sự kiện là bỏ sót đúng thao tác hay dùng nhất.
  if(window.ResizeObserver){
    var tileRO=new ResizeObserver(function(){fitTiles();});
    var tileHost=zid('gmStats');if(tileHost)tileRO.observe(tileHost);
  }else{window.addEventListener('resize',fitTiles);}
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
    // Công tắc phản ánh KÊNH CÓ BẬT KHÔNG, không phải 'đường có dùng được không'. Hai thứ khác nhau:
    // đường vẫn đó mà người dùng tắt kênh là chuyện bình thường, và lúc đó công tắc phải ở vị trí tắt.
    var dtg=zid('driveToggle'); if(dtg)dtg.classList.toggle('on',!!d.on);
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
    // KÊNH TẮT ⇒ ĐÓNG BĂNG, không phải ẩn (user 2026-09-17: *"tắt thì phải đóng băng luôn và xám
    // hết các panel trong đây"*). Vẫn thấy có gì ở đó, nhưng xám và không bấm được — người dùng
    // biết tính năng tồn tại và đang tắt, thay vì thấy một khoảng trống không giải thích.
    //
    // ⚠ Chừa ĐÚNG hai thứ: công tắc (nằm ngoài thân thẻ) và ô "Thư mục dùng chung" — đó là đường
    // DUY NHẤT để nối lại. Xám luôn cả hai là tắt xong thì kẹt, không còn chỗ nào bật lại được.
    var on=!!(d&&d.on), body=arc.closest('.card-b'), btn=document.querySelector('[data-act="drivesync"]');
    if(btn){btn.classList.toggle('frozen',!on);btn.disabled=!on;}
    if(body)body.classList.toggle('frozen',!on);
    document.querySelectorAll('[data-needs-drive]').forEach(function(el){el.classList.toggle('frozen',!on);});
    if(!on)return;
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
  /** Dòng trạng thái NGAY DƯỚI hàng nút. `kind`: run (đang chạy, có chấm xoay) · hit · err · none. */
  function p2pMsg(s,kind){
    var el=zid('p2pMsg'); if(!el)return;
    el.textContent=s||'';
    el.className='scanmsg'+(kind?' '+kind:'');
  }
  /**
   * Máy nào đang có cú *Thử lại* chạy dở. Nút nằm TRONG thẻ, mà thẻ được dựng lại mỗi 15 s và mỗi bước
   * theo dõi — nên trạng thái xoay không được sống trên phần tử DOM (nó bị thay ngay sau cú bấm: user
   * 25/09 *"thử lại chưa"*), mà phải sống ở đây rồi thẻ đọc lại lúc vẽ.
   */
  var p2pBusyIds={};
  /** Khoá một nút + chấm xoay trong lúc việc của nó chạy. Bấm dồn thì bỏ qua (`data-busy`). */
  function btnBusy(b,on){
    if(!b)return;
    if(on){b.dataset.busy='1';b.disabled=true;b.classList.add('busy');}
    else{delete b.dataset.busy;b.disabled=false;b.classList.remove('busy');}
  }
  /**
   * Theo dõi một cú *Đồng bộ ngay* / *Thử lại* tới khi nó THẬT SỰ xong — không phải tới khi HTTP trả.
   *
   * Endpoint trả lời tức thì (đá một lượt trên liên kết đang có, hoặc đánh thức vòng nối lại). "Xong"
   * nghĩa là: lượt đồng bộ đóng sổ SAU mốc bấm (`lastRound.at >= at`), hoặc liên kết đã `up`. Hỏi
   * mỗi 2 giây, TỐI ĐA 20 lần và CHỈ trong lúc có người vừa bấm — không phải nhịp nền. Quá hạn thì
   * nói thật là chưa xong, vẫn chạy nền; không giả vờ ✓.
   */
  function kickDone(btn){
    for(var k in p2pBusyIds)delete p2pBusyIds[k];
    btnBusy(btn,false);
    var rb=document.querySelectorAll('[data-act="p2p-retry"].busy');
    for(var i=0;i<rb.length;i++)btnBusy(rb[i],false);
  }
  function watchKick(r,btn){
    var ids=Object.keys(r.actions||{}); var at=r.at||Date.now(); var tries=0;
    var anyKick=ids.some(function(id){return r.actions[id]==='kicked';});
    p2pMsg(anyKick?t('p2p.kickRun'):t('p2p.redialRun'),'run');
    (function step(){
      zGet('/channel-status').then(function(c){
        renderChannel(c);
        var L=(c&&c.links)||{}; var done=[]; var pend=0;
        ids.forEach(function(id){
          var k=L[id]||{};
          if(r.actions[id]==='kicked'){ if(k.lastRound&&k.lastRound.at>=at)done.push(k.lastRound); else pend++; }
          else if(k.state==='up')done.push(null); else pend++;
        });
        if(!pend){
          kickDone(btn);
          var lr=done.filter(Boolean)[0];
          p2pMsg('✓ '+(lr?syncResultText(Object.assign({peerDeviceId:ids[0]},lr)):t('p2p.redialDone')),'hit');
          loadQueue();
          return;
        }
        if(++tries>=20){kickDone(btn);p2pMsg(anyKick?t('p2p.kickSlow'):t('p2p.redialSlow'),'none');return;}
        setTimeout(step,2000);
      }).catch(function(){kickDone(btn);p2pMsg(t('p2p.logErr'),'err');});
    })();
  }
  /** Một cửa cho hai nút (*Đồng bộ ngay* · *Thử lại*): khác nhau đúng ở `host`. */
  function p2pKick(btn,host){
    if(btn&&btn.dataset.busy)return;
    if(host)p2pBusyIds[host]=1;
    btnBusy(btn,true);
    p2pMsg(t('p2p.syncing'),'run');
    zPost('/channel-sync'+(host?'?host='+encodeURIComponent(host):'')).then(function(r){
      if(r&&r.ok&&r.actions){watchKick(r,btn);return;}
      kickDone(btn);
      if(!r||r.ok===false){p2pMsg('✗ '+p2pWhy((r&&r.error)||''),'err');loadChannel();return;}
      if(r.waiting){p2pMsg(t('p2p.waiting').replace('{a}',r.addr||''),'none');loadChannel();return;}
      p2pMsg('✓ '+syncResultText(r),'hit');
      loadChannel();
    }).catch(function(){kickDone(btn);p2pMsg(t('p2p.logErr'),'err');});
  }
  // `ETIMEDOUT` không nói được phải đi soi đâu. Ba nhóm dưới là ba CHẨN ĐOÁN KHÁC NHAU, gộp thành
  // một chữ "lỗi" là bắt người dùng đoán. Mã lạ thì trả NGUYÊN VĂN — đừng nuốt thứ mình chưa biết.
  function p2pWhy(e){
    var s=String(e||'');
    if(/ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/.test(s))return t('p2p.errRoute');
    if(/ECONNREFUSED/.test(s))return t('p2p.errRefused');
    return s;
  }
  // SỐ MÁY nhóm ba cho dễ đọc/gõ lại. Không phải số 9 chữ ⇒ trả nguyên, không bịa dạng.
  // Một hàng nhãn↔giá trị trong khung `.drv-facts` — CÙNG khung với ba hàng số ngay phía trên
  // (app-design §F0b: một chức năng thì một khung, không đẻ kiểu trình bày thứ hai). Dựng bằng
  // DOM chứ không ghép chuỗi HTML: giá trị là dữ liệu máy trả về, ghép chuỗi là mở đường lỗi escape.
  /**
   * Một MỤC thông tin = một khối có đường kẻ trên, lưới BỐN cột cố định:
   * ① tên dòng · ② chú thích · ③ giá trị · ④ nút Copy. Chú thích nằm cột riêng NGAY SAU tên dòng,
   * không dính đuôi giá trị (user 25/09: *"chú thích phải ở cột 2 phía sau tên dòng"*). Tên dòng và
   * cột Copy cố định bề rộng ⇒ mọi chú thích thẳng một cột, mọi nút Copy thẳng một cột.
   * Một mục có thể nhiều dòng (hai địa chỉ) — tên dòng viết MỘT lần, kéo dọc cả khối.
   * `wide`: giá trị dài (mã máy) xuống dòng dưới tên dòng, trải ngang, Copy vẫn ở cột ④.
   * rows: [{v, hint, copy}] — copy=false khi giá trị là câu trạng thái, không phải thứ để chép.
   */
  function p2pFact(label,rows,wide){
    var box=document.createElement('div');box.className='p2p-fact'+(wide?' wide':'');
    var s=document.createElement('span');s.className='p2p-fact-lbl';s.textContent=label;
    if(!wide&&rows.length>1)s.style.gridRow='1 / span '+rows.length;
    box.appendChild(s);
    rows.forEach(function(r){
      var h=document.createElement('span');h.className='p2p-fact-hint';h.textContent=r.hint||'';
      var b=document.createElement('b');b.textContent=r.v;
      var cell=document.createElement('span');cell.className='p2p-fact-act';
      if(r.act){var ab=document.createElement('button');ab.className='btn xs';ab.textContent=r.act.label;ab.setAttribute('data-act',r.act.act);cell.appendChild(ab);}
      else if(r.copy!==false&&r.v)cell.appendChild(p2pCopyBtn(r.v));
      box.appendChild(h);box.appendChild(b);box.appendChild(cell);
    });
    return box;
  }
  function p2pCopyBtn(value){
    var c=document.createElement('button');
    c.className='btn xs';c.textContent=t('p2p.copy');
    c.setAttribute('data-copy',value);c.setAttribute('title',t('p2p.copyHint'));
    return c;
  }
  function renderChannel(c){
    if(!c)return;
    zset('p2pBlocks',zN(c.blocks||0));
    // Nói cổng ĐANG NGHE, không nói cổng đã khai: bật mà không nghe được (cổng bận, chưa ghép
    // đôi ai) là ca có thật, và bề mặt phải phân biệt được hai thứ đó.
    zset('p2pPort', c.listening ? String(c.listening) : (c.enabled ? t('p2p.notListening') : String(c.port||'—')));
    // Ô này có sẵn trong markup từ đầu mà KHÔNG nơi nào điền ⇒ mục "Chỗ lưu của kênh này" hiện
    // ra như một tiêu đề rỗng. Đường thật nằm sẵn trong payload.
    var de=zid('p2pDir'),dc=zid('p2pDirCopy');
    if(de){de.textContent=c.dir||'—';de.setAttribute('title',c.dir||'');}
    if(dc){dc.style.display=c.dir?'':'none';dc.setAttribute('data-copy',c.dir||'');dc.setAttribute('title',t('p2p.copyHint'));}
    // ĐỊA CHỈ là thuộc tính của MÁY, không phải sản phẩm của một cú bấm ⇒ nó ở đây, cạnh cổng nghe,
    // hiện thường trực. Kèm nhãn "cố định" cho địa chỉ khai tĩnh: đo 2026-09-20 thì địa chỉ Wi-Fi
    // đổi .90 → .81 trong một buổi, nên người đưa địa chỉ cần biết cái nào dùng lại được.
    var ab=zid('p2pAddrs');
    if(ab){
      while(ab.firstChild)ab.removeChild(ab.firstChild);
      var prt=c.listening||c.port;
      var ar=(c.addrs||[]).map(function(a){return {v:a.addr+':'+prt,hint:a.iface+(a.fixed?' · '+t('p2p.fixed'):'')};});
      if(ar.length)ab.appendChild(p2pFact(t('p2p.addrH'),ar));
      // CHỖ CHỜ đục lỗ — hiện CHỈ khi có (§F0: mặc định của mọi phần tử là KHÔNG CÓ NÓ).
      // Nó là trạng thái nền sống tới hàng phút, nên một dòng thoáng qua trong hộp thoại là
      // không đủ: đóng hộp rồi mở lại vẫn phải biết đang chờ ai, và đã chờ bao lâu.
      var w=c.punchWait;
      if(w){
        var sub=w.outcome?t('p2p.waitClosed').replace('{r}',w.outcome.error||''):t('p2p.waitRounds').replace('{n}',zN(w.rounds||0));
        // `addr` rỗng = đang giữ lỗ mở, không nhắm máy nào. Chữ lấy từ i18n, không lấy từ payload.
        if(!(w.outcome&&w.outcome.won))ab.appendChild(p2pFact(t('p2p.waitH'),[{v:w.addr||t('p2p.waitHold'),hint:sub,copy:!!w.addr}]));
      }
    }
    // MỘT chuỗi để đưa máy kia — gom vân tay + relay + địa chỉ. Người dùng chép ĐÚNG thứ này,
    // không phải chọn giữa hai địa chỉ (app-design §F0).
    var cb=zid('p2pCodeRow');
    if(cb){
      while(cb.firstChild)cb.removeChild(cb.firstChild);
      // MÃ NÓI RÕ NÓ DÙNG ĐƯỢC TỚI ĐÂU — BỐN trạng thái, mỗi cái dẫn tới một việc khác nhau:
      // có địa chỉ ⇒ dùng được · đang đo ⇒ CHỜ rồi hãy chép · DNS hỏng ⇒ sửa máy · không ai trả
      // lời ⇒ mạng chặn. Mã thiếu địa chỉ trông y hệt mã đủ, chỉ ngắn hơn 9 ký tự, nên gộp bất kỳ
      // hai trạng thái nào là bắt người dùng đoán — họ đưa mã đi rồi máy kia báo "không thấy máy
      // đó" mà không ai lần ra là thiếu ĐỊA CHỈ (user hỏi đúng chỗ này 22/09).
      // `externalAddrWhy` rỗng mà cũng chưa có địa chỉ = **chưa đo xong lần nào**: daemon làm tươi
      // địa chỉ kiểu bắn-rồi-quên, nên lượt hỏi ĐẦU sau khi bật app luôn trả mã TRẦN.
      var why=c.externalAddr?'p2p.codeWan'
        :c.externalAddrWhy==='dns'?'p2p.codeLanDns'
        :c.externalAddrWhy==='no-answer'?'p2p.codeLanNet'
        :'p2p.codeMeasuring';
      if(c.machineCode)cb.appendChild(p2pFact(t('p2p.codeH'),[{v:c.machineCode,hint:t(why)}],true));
    }
    // CHÌA SHARE — dùng chung cho Drive và máy-tới-máy. Chỉ hiện DẤU TAY (plan/16 §4); không Copy.
    var kr=zid('p2pKeyRow');
    if(kr){
      while(kr.firstChild)kr.removeChild(kr.firstChild);
      var sk=c.shareKey||{};
      kr.appendChild(p2pFact(t('p2p.keyH'),[{v:sk.found?(sk.fingerprint||''):t('p2p.keyNone'),hint:t('p2p.keyD'),act:{act:'p2p-key-open',label:t(sk.found?'p2p.keyChange':'p2p.keySet')}}]));
    }
    var seen=(c.seen||[]);
    // Số máy 9 chữ số là MÃ DUY NHẤT. Backend băm ra số; bề mặt chỉ hiển thị — không hai nơi cùng tính.
    var tg=zid('p2pToggle');if(tg)tg.classList.toggle('on',!!c.enabled);
    // ĐÓNG BĂNG cả tab khi kênh tắt (user 2026-09-17: *"bên máy-tới-máy cũng vậy luôn đúng không?"*).
    // Thân của CẢ BA thẻ (máy này · cụm máy · nhật ký) — chừa thanh đầu thẻ vì công tắc nằm ở đó.
    var p2pOn=!!c.enabled, sub=document.querySelector('.sub[data-sy="p2p"]');
    if(sub)sub.querySelectorAll('.card-b').forEach(function(b){
      if(!b.querySelector('[data-live]')){b.classList.toggle('frozen',!p2pOn);return;}
      b.classList.remove('frozen');
      Array.prototype.forEach.call(b.children,function(ch){ch.classList.toggle('frozen',!p2pOn&&!ch.hasAttribute('data-live'));});
    });
    // RELAY không có hàng riêng: nó là HẠ TẦNG, nằm sẵn trong mã máy. Người dùng không khai, không
    // đọc, không chọn — chỉ chép một mã. Khai relay là việc một lần của người CHẠY relay, ở CLI.
    // CỤM MÁY — mỗi máy MỘT THẺ, máy này đứng đầu. Bản cũ là một danh sách chuỗi 52 ký tự trần:
    // không nói được máy nào đang thấy được, địa chỉ bao nhiêu, gặp lần cuối lúc nào.
    var cl=zid('p2pCluster');
    if(cl){
      var seenBy={};
      seen.forEach(function(sp){ seenBy[sp.deviceId]=sp; });
      var cards=[];
      cards.push({me:true,name:c.hostName||'',id:c.deviceId||'',addr:(c.addrs||[]).map(function(a){return a.addr;}).join(' · '),port:c.listening||c.port,on:!!c.listening,code:c.machineCode||''});
      var pstate=c.peerState||{};
      // Trạng thái LIÊN KẾT SỐNG. Nó đứng trên mọi nguồn khác vì nó trả lời đúng câu người dùng
      // hỏi — *"đang nối hay không"* — chứ không phải *"lượt thử gần nhất ra sao"*.
      var plinks=c.links||{};
      (c.peers||[]).forEach(function(id,i){
        var sp=seenBy[id];
        // 🔴 Thẻ đọc HAI nguồn, không phải một. Bản trước chỉ đọc tầng dò LAN, nên hai máy khác
        // mạng thì nó vĩnh viễn hiện "chưa phát hiện" — kể cả đang chở file qua relay ngay lúc đó.
        // Dò LAN trả lời *"có thấy trên mạng nội bộ không"*; lượt nối gần nhất trả lời *"có nối
        // được không"*. Hai câu khác nhau, và câu thứ hai mới là thứ người dùng đang hỏi.
        // Tên: LAN nếu đang thấy, không thì sổ tên của backend (dò LAN cũ + `hello`) — một nguồn, không nhớ phía trình duyệt.
        cards.push({me:false,name:sp&&sp.name?sp.name:((c.peerNames||{})[id]||''),code:id,id:id,addr:sp?sp.host:'',port:sp?sp.port:'',at:sp?sp.seenAt:'',st:pstate[id]||null,lk:plinks[id]||null});
      });
      zset('p2pClusterN', t('p2p.clusterN').replace('{n}', String(cards.length)));
      cl.innerHTML='';
      cards.forEach(function(m){
        var d=document.createElement('div');
        // MỘT khuôn cho mọi thẻ (user 25/09): ① tên · ② trạng thái · ③ IP · ④ hàng nút dính đáy — hai thẻ cao bằng nhau.
        d.style.cssText='border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface-2);display:flex;flex-direction:column';
        // TÊN MÁY trước, trạng thái sau. Chưa biết tên (bản dò đời cũ không gửi) ⇒ '?' — từ 2026-09-19
        // bề mặt chỉ còn MỘT mã, nên con số 9 chữ số không còn là thứ người dùng nhìn tới.
        var label=m.name||(m.me?'?':(m.id||'').split('-').slice(0,2).join('-')+'…');
        // BA trạng thái, không phải hai — và thứ tự này là thứ tự ĐỘ TƯƠI của bằng chứng:
        //   thấy trên LAN  > đã nối được lúc nào đó  > lần thử gần nhất HỎNG  > chưa thử lần nào
        // Gộp ba cái cuối thành "chưa phát hiện" chính là câu nói dối user bắt được.
        // VẼ theo trạng thái backend đã tính (`peerCardState`), KHÔNG tự ghép hai nguồn thô —
        // đó là cách thẻ và dòng trạng thái trôi lệch nhau, và là chỗ cổng không với tới.
        var ps=m.st||{kind:'never'};
        var lk=m.lk||null;
        var state, dot;
        // Chấm của "máy này" là TRẠNG THÁI (kênh đang nghe hay không), không phải màu thương hiệu.
        // Bản trước gán cứng `--primary` (vàng) — đứng cạnh thẻ máy kia xanh thì đọc thành cảnh báo
        // (user 25/09: *"máy này sao cứ màu vàng là sai"*). Cùng một bảng màu với thẻ máy kia:
        // xanh = đang sống, xám = tắt.
        if(m.me){state=t('p2p.thisMachine');dot=m.on?'var(--success)':'var(--text-faint)';}
        // LIÊN KẾT SỐNG thắng mọi nguồn khác: ghép một lần là nối mãi, nên câu đúng là trạng thái
        // NGAY BÂY GIỜ, không phải dấu vết của lượt trước.
        else if(lk&&lk.state==='up'){state=t('p2p.linkUp').replace('{t}',zAgo(lk.since));dot='var(--success)';}
        else if(lk&&lk.state==='connecting'){state=t('p2p.linkConnecting');dot='var(--warn)';}
        else if(ps.kind==='lan'){state=t('p2p.online');dot='var(--success)';}
        else if(ps.kind==='synced'){state=t('p2p.syncedAgo').replace('{t}',zAgo(ps.at))+(ps.via?' · '+ps.via:'');dot='var(--success)';}
        else if(ps.kind==='failed'){state=t('p2p.lastFail').replace('{t}',zAgo(ps.at));dot='var(--warn)';}
        else {state=t('p2p.never');dot='var(--text-faint)';}
        // Hàng trên: CHỈ chấm + tên, tên được trọn chiều ngang. Trạng thái xuống hàng riêng ngay dưới.
        d.innerHTML='<div style="display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;min-width:0">'
          +'<span style="width:7px;height:7px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>'
          +'<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+stdEsc(label)+'">'+stdEsc(label)+'</span></div>'
          +'<div class="muted'+(lk&&lk.state==='connecting'?' zspin-lbl':'')+'" style="font-size:10.5px;margin-top:4px">'+stdEsc(state)+'</div>'
          // Dòng dưới nói ĐƯỜNG đang đi, không phải "có thấy trên LAN không": liên kết đang sống qua
          // relay mà in "chưa có địa chỉ" là cả thẻ đọc như đang chờ (user 25/09: *"màu xanh rồi mà
          // vẫn báo chờ"*). "Chưa có địa chỉ" chỉ đúng khi KHÔNG có liên kết nào.
          +'<div class="muted" style="font-size:10.5px;margin-top:4px">'+stdEsc(
            m.addr?(m.addr+(m.port?(':'+m.port):''))
            :(lk&&lk.state==='up'?(lk.via==='relay'?t('p2p.viaRelay'):t('p2p.viaDirect').replace(' {a}','').replace('{a}','')):t('p2p.noAddr')))+'</div>';
        var bar=document.createElement('div');
        bar.style.cssText='display:flex;gap:6px;margin-top:auto;padding-top:8px;flex-wrap:wrap';
        if(!m.me){
          // THỬ LẠI trên chính thẻ của máy đó: nút *Đồng bộ ngay* chung thử lần lượt mọi máy,
          // còn ở đây người dùng đang hỏi về MỘT máy cụ thể và muốn câu trả lời về đúng nó.
          var rt=document.createElement('button');rt.className='btn xs';
          rt.textContent=t('p2p.retry');rt.setAttribute('data-act','p2p-retry');rt.setAttribute('data-id',m.id);
          if(p2pBusyIds[m.id])btnBusy(rt,true);
          bar.appendChild(rt);
          var x=document.createElement('button');x.className='btn xs';
          x.textContent=t('p2p.unpair');x.setAttribute('data-act','p2p-unpair');x.setAttribute('data-id',m.id);
          bar.appendChild(x);
        }
        // Mã máy: máy này = mã để máy khác dán vào; máy kia = vân tay của nó (dán vào ô kết nối là đủ).
        if(m.code){
          var cbt=document.createElement('button');cbt.className='btn xs';
          cbt.textContent=t('p2p.codeBtn');cbt.setAttribute('data-act','p2p-code');cbt.setAttribute('data-code',m.code);
          bar.appendChild(cbt);
        }
        d.appendChild(bar);
        cl.appendChild(d);
      });
    }
  }
  // ── HÀNG ĐỢI DUYỆT của lớp mirror thư mục (plan/24 §9.6) ────────────────────
  //
  // Luật user chốt: thay đổi từ máy kia KHÔNG tự áp — *"bên đây phải confirm chấp nhận sửa đó
  // thì sẽ tự động lên"*. Khối này là chỗ DUY NHẤT trên bề mặt làm được việc đó; thiếu nó thì
  // các thay đổi nằm im trong kho và người dùng không có cách nào biết có gì đang chờ.
  //
  // Rỗng ⇒ biến mất HẲN, kể cả tiêu đề (§F0: mặc định của mọi phần tử là KHÔNG CÓ NÓ).
  function renderQueue(r){
    var box=zid('p2pQueue'), badge=zid('p2pQBadge');
    if(!box)return;
    var rows=(r&&r.rows)||[];
    // HAI nhóm: đang CHỜ NGƯỜI, và "để sau". Nhóm sau vẫn nằm trong hàng đợi (để máy kia thôi
    // gửi lại) nhưng không được đếm lên nhãn và không được bật lại lên mặt — người dùng đã nói
    // "để sau" thì mặt trước phải im cho tới khi máy kia có cái MỚI.
    var active=rows.filter(function(x){return !x.dismissedAt;});
    var later=rows.filter(function(x){return !!x.dismissedAt;});
    if(badge)badge.textContent=active.length?String(active.length):'';
    box.innerHTML='';
    if(!rows.length)return;
    function card(q){
      var blocked=q.verdict==='block';
      var d=document.createElement('div');
      d.style.cssText='border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;background:var(--surface-2)';
      var why=blocked?t('mir.block'):(q.verdict==='merge'?t('mir.merge'):t('mir.take'));
      d.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap">'
        +'<span style="font-size:11.5px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        +stdEsc(q.area+'/'+q.rel)+'</span>'
        +'<span class="muted" style="font-size:10.5px;margin-left:auto;flex:0 0 auto">'+stdEsc(why)+'</span></div>';
      var bar=document.createElement('div');
      bar.style.cssText='display:flex;gap:6px;margin-top:7px;flex-wrap:wrap';
      function mk(label,choice){
        var b=document.createElement('button');
        b.className='btn xs';b.textContent=label;
        b.setAttribute('data-act','mir-apply');b.setAttribute('data-id',String(q.id));b.setAttribute('data-choice',choice);
        // Verdict ĐANG VẼ đi kèm cú bấm: đĩa đổi sau khi màn hình vẽ thì kho từ chối, không đè.
        b.setAttribute('data-seen',q.verdict);
        return b;
      }
      // "Giữ bản máy này" ở MỌI verdict, không chỉ khi bị chặn. Bản trước `take` chỉ có [Nhận]/[Để
      // sau] — người dùng KHÔNG có cách nào nói "bản của tôi đúng, thôi hỏi", và hai máy mà mỗi bên
      // đều bấm Nhận bản kia là hoán đổi tệp cho nhau mãi mãi (đo thật 25/09: `06_CHANGES` mất một
      // mục vì đúng vòng đó).
      if(blocked){
        bar.appendChild(mk(t('mir.keepMine'),'mine'));
        bar.appendChild(mk(t('mir.useTheirs'),'theirs'));
      }else{
        bar.appendChild(mk(t('mir.accept'),q.verdict==='merge'?'merged':'theirs'));
        bar.appendChild(mk(t('mir.keepMine'),'mine'));
      }
      if(!q.dismissedAt)bar.appendChild(mk(t('mir.later'),'dismiss'));
      var dv=document.createElement('button');
      dv.className='btn xs';dv.textContent=t('mir.diff');
      dv.setAttribute('data-act','mir-diff');dv.setAttribute('data-id',String(q.id));
      bar.appendChild(dv);
      d.appendChild(bar);
      var pre=document.createElement('pre');
      pre.id='mirD'+q.id;
      pre.style.cssText='display:none;max-height:220px;overflow:auto;margin:8px 0 0;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:7px 9px;font-size:10.5px;line-height:1.5;white-space:pre-wrap;word-break:break-all;color:var(--text-dim)';
      d.appendChild(pre);
      return d;
    }
    if(active.length){
      var mergeable=active.filter(function(x){return x.verdict!=='block';});
      var h=document.createElement('div');
      h.className='section-t';h.style.marginTop='0';
      h.textContent=t('mir.h');
      box.appendChild(h);
      // Duyệt CẢ NHÓM chỉ cho nhóm KHÔNG trùng đoạn. Dòng bị chặn cố ý không có nút tự động —
      // user chốt: *"phải block lại và hỏi xài bên máy nào"*.
      if(mergeable.length>1){
        var all=document.createElement('button');
        all.className='btn sm';all.style.margin='0 0 8px';
        all.textContent=t('mir.acceptAll').replace('{n}',String(mergeable.length));
        all.setAttribute('data-act','mir-all');
        box.appendChild(all);
      }
      active.forEach(function(q){box.appendChild(card(q));});
    }
    if(later.length){
      // Gập lại một dòng, không phải biến mất hẳn: "để sau" vẫn phải tìm lại được.
      var lt=document.createElement('button');
      lt.className='btn xs';lt.style.margin='2px 0 6px';
      lt.textContent=t('mir.laterN').replace('{n}',String(later.length));
      var wrap=document.createElement('div');wrap.style.display='none';
      later.forEach(function(q){wrap.appendChild(card(q));});
      lt.onclick=function(){wrap.style.display=wrap.style.display==='none'?'':'none';};
      box.appendChild(lt);box.appendChild(wrap);
    }
  }
  function loadQueue(){return zGet('/mirror-queue').then(renderQueue).catch(function(){});}
  window.zLoadMirrorQueue=loadQueue;

  document.addEventListener('click',function(e){
    // Bộ chọn phải liệt kê ĐỦ mọi nhánh `act===` bên dưới. Thiếu một tên là nhánh đó chết im lặng:
    // Thử lại · Mã máy · chìa từng nằm dưới đây mà bộ chọn chỉ có ba nút hàng đợi (đo 25/09).
    var el=e.target&&e.target.closest?e.target.closest('[data-act="mir-apply"],[data-act="mir-diff"],[data-act="mir-all"],[data-act="p2p-retry"],[data-act="p2p-code"],[data-act="p2p-code-copy"],[data-act="p2p-key-open"],[data-act="p2p-key-save"]'):null;
    if(!el)return;
    var act=el.getAttribute('data-act');
    if(act==='mir-diff'){
      var id=el.getAttribute('data-id'), pre=zid('mirD'+id);
      if(!pre)return;
      if(pre.style.display!=='none'){pre.style.display='none';return;}
      pre.style.display='';
      pre.textContent='…';
      zGet('/mirror-diff?id='+encodeURIComponent(id)).then(function(r){
        if(!r||!r.ok){pre.textContent=(r&&r.error)||t('mir.err');return;}
        // Nhị phân thì NÓI THẲNG là không so được, đừng trưng byte — người đọc không quyết
        // được bằng thứ đó, và một bức tường ký tự lạ đọc ra như lỗi.
        var parts=[];
        parts.push(t('mir.colMine')+':\n'+(r.mineBinary?t('mir.binary'):(r.mine===null?t('mir.missing'):r.mine)));
        parts.push(t('mir.colTheirs')+':\n'+(r.theirsBinary?t('mir.binary'):(r.theirs===null?t('mir.binary'):r.theirs)));
        if(r.merged)parts.push(t('mir.colMerged')+':\n'+r.merged);
        pre.textContent=parts.join('\n\n———\n\n');
      }).catch(function(){pre.textContent=t('mir.err');});
      return;
    }
    if(act==='mir-all'){
      if(el.dataset.busy)return;
      btnBusy(el,true);
      // Chỉ nhóm KHÔNG trùng đoạn. Lấy lại danh sách từ server thay vì tin DOM: DOM có thể cũ
      // hơn kho nếu vừa có một lượt đồng bộ chạy nền.
      zGet('/mirror-queue').then(function(r){
        // Bỏ cả mục "để sau": người dùng đã gạt nó ra, "duyệt cả nhóm" không được lôi lại.
        var rows=((r&&r.rows)||[]).filter(function(x){return x.verdict!=='block'&&!x.dismissedAt;});
        var chain=Promise.resolve();
        rows.forEach(function(q){
          chain=chain.then(function(){
            return zPost('/mirror-apply?id='+q.id+'&choice='+(q.verdict==='merge'?'merged':'theirs'));
          });
        });
        return chain;
      }).then(loadQueue).catch(loadQueue).then(function(){btnBusy(el,false);});
      return;
    }
    // Nhánh TƯỜNG MINH, không dùng đường rơi-xuống: một hành động mới lọt vào bộ chọn ở trên
    // mà không ai để ý sẽ được gửi đi như một lượt duyệt. Cổng `data-act` của repo soi đúng
    // chữ `act==='…'` chính vì lý do đó.
    if(act==='p2p-key-open'){
      var kp=zid('p2pKeyPop');
      if(!kp){
        kp=document.createElement('div');kp.id='p2pKeyPop';kp.className='p2p-pop';
        kp.innerHTML='<input class="tin" type="password" autocomplete="off" spellcheck="false"><div class="p2p-pop-msg muted"></div><button class="btn xs primary" data-act="p2p-key-save"></button>';
        document.body.appendChild(kp);
        kp.querySelector('input').addEventListener('keydown',function(ev){if(ev.key==='Enter')kp.querySelector('[data-act="p2p-key-save"]').click();});
        document.addEventListener('keydown',function(ev){if(ev.key==='Escape')kp.classList.remove('on');});
        document.addEventListener('click',function(ev){if(kp.classList.contains('on')&&!kp.contains(ev.target)&&!(ev.target.closest&&ev.target.closest('[data-act="p2p-key-open"]')))kp.classList.remove('on');});
      }
      var ki=kp.querySelector('input'),kb=kp.querySelector('[data-act="p2p-key-save"]');
      ki.value='';ki.setAttribute('placeholder',t('p2p.keyPh'));ki.setAttribute('aria-label',t('p2p.keyH'));
      kp.querySelector('.p2p-pop-msg').textContent='';
      kb.textContent=t('p2p.keySave');kb.removeAttribute('data-force');
      var r1=el.getBoundingClientRect();
      kp.style.left=Math.max(8,Math.min(r1.left,window.innerWidth-340))+'px';kp.style.top=(r1.bottom+6)+'px';
      kp.classList.add('on');ki.focus();
      return;
    }
    if(act==='p2p-key-save'){
      var pop2=zid('p2pKeyPop'),inp=pop2.querySelector('input'),msg=pop2.querySelector('.p2p-pop-msg');
      var force=el.getAttribute('data-force')==='1';
      btnBusy(el,true);
      fetch('/share-key'+(force?'?force=1':''),{method:'POST',body:inp.value}).then(function(r){return r.json();}).then(function(r){
        btnBusy(el,false);
        if(r.ok){
          inp.value='';msg.textContent=t('p2p.keySaved').replace('{f}',r.fingerprint||'');
          loadChannel();setTimeout(function(){pop2.classList.remove('on');},1500);
          return;
        }
        // Đã có chìa ⇒ nói rõ cái giá rồi mới cho ghi đè, bằng chính nút này (bấm lần hai).
        if(r.code==='exists'){msg.textContent=t('p2p.keyExists');el.textContent=t('p2p.keyReplace');el.setAttribute('data-force','1');return;}
        msg.textContent=t('p2p.keyBad');
      }).catch(function(){btnBusy(el,false);msg.textContent=t('p2p.keyErr');});
      return;
    }
    if(act==='p2p-code'){
      var pop=zid('p2pCodePop');
      if(!pop){
        pop=document.createElement('div');pop.id='p2pCodePop';pop.className='p2p-pop';
        pop.innerHTML='<div class="p2p-pop-code mono"></div><button class="btn xs" data-act="p2p-code-copy"></button>';
        document.body.appendChild(pop);
        document.addEventListener('keydown',function(ev){if(ev.key==='Escape')pop.classList.remove('on');});
        document.addEventListener('click',function(ev){if(pop.classList.contains('on')&&!pop.contains(ev.target)&&!(ev.target.closest&&ev.target.closest('[data-act="p2p-code"]')))pop.classList.remove('on');});
      }
      var code=el.getAttribute('data-code')||'';
      pop.querySelector('.p2p-pop-code').textContent=code;
      var cp=pop.querySelector('[data-act="p2p-code-copy"]');cp.textContent=t('p2p.copy');cp.setAttribute('data-code',code);
      var r0=el.getBoundingClientRect();
      pop.style.left=Math.max(8,Math.min(r0.left,window.innerWidth-340))+'px';pop.style.top=(r0.bottom+6)+'px';
      pop.classList.add('on');
      return;
    }
    if(act==='p2p-code-copy'){
      var cd=el.getAttribute('data-code')||'';
      (navigator.clipboard?navigator.clipboard.writeText(cd):Promise.reject()).then(function(){el.textContent=t('p2p.copied2');setTimeout(function(){el.textContent=t('p2p.copy');},1200);}).catch(function(){el.textContent='✗';});
      return;
    }
    if(act==='p2p-retry'){
      // Thử lại với ĐÚNG máy này. Truyền ID làm `host` — `channelSyncOnce` nhận cả ID lẫn địa
      // chỉ, và ID mở được cả cụm dò toàn cầu lẫn relay (địa chỉ trần thì không).
      p2pKick(el,el.getAttribute('data-id')||'');
      return;
    }
    if(act==='mir-apply'){
      if(el.dataset.busy)return;
      btnBusy(el,true);
      zPost('/mirror-apply?id='+encodeURIComponent(el.getAttribute('data-id'))+'&choice='+encodeURIComponent(el.getAttribute('data-choice'))+'&seen='+encodeURIComponent(el.getAttribute('data-seen')||''))
        .then(function(r){
          // Bị TỪ CHỐI (tệp đã đổi từ lúc nhận) thì phải nói ra — im lặng rồi vẽ lại là người dùng
          // tưởng nút không ăn, bấm tiếp, và lần thứ hai có thể ăn thật lên bản mới nhất.
          if(r&&r.ok===false)p2pMsg('✗ '+(r.error||t('mir.err')),'err');
          return loadQueue();
        }).catch(loadQueue).then(function(){btnBusy(el,false);});
    }
  });

  function loadChannel(){return zGet('/channel-status').then(renderChannel).then(loadQueue).catch(function(){});}
  window.zLoadChannel=loadChannel;
  // Mở ⚙ ⇒ nạp luôn, để số trong đó không bao giờ là số cũ của lần mở trước.
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#topSettings'))setTimeout(loadChannel,60);});

  // ── NHẬT KÝ KÊNH TRONG APP (`plan/24 §10.2` ③) ─────────────────────────────
  // Bắt buộc phải có vì cửa sổ console của daemon nay bị giấu (`§10.1`): không có khung này thì
  // câu hỏi "vì sao không nối được" mất luôn chỗ trả lời.
  var LOG_ONLY_CHANNEL=true, LOG_HOLD=false, logTimer=null;
  function loadLog(){
    var box=zid('p2pLog');
    if(!box)return Promise.resolve();
    return zGet('/daemon-log?tail=300'+(LOG_ONLY_CHANNEL?'&filter=%5Bchannel%5D':'')).then(function(r){
      if(!box)return;
      var lines=(r&&r.lines)||[];
      // Rỗng thì NÓI RA. Vùng trắng trông y như đang tải, và người đọc sẽ ngồi chờ một thứ đã xong.
      box.textContent=lines.length?lines.join('\n'):t('p2p.logEmpty');
      if(!LOG_HOLD)box.scrollTop=box.scrollHeight;
      // Nói RA file log nằm đâu, và bấm vào là chép — thay cho một nút mở thư mục, thứ đòi
      // thêm một đường chạy lệnh ra ngoài app đúng lúc vừa cấm cửa sổ console.
      var pe=zid('p2pLogPath');
      if(pe&&r&&r.file){pe.textContent=r.file;pe.setAttribute('data-copy',r.file);pe.setAttribute('title',t('p2p.copyHint'));pe.classList.add('fchip');pe.style.cursor='pointer';}
    }).catch(function(){ if(box)box.textContent=t('p2p.logErr'); });
  }
  // Chỉ chạy nhịp khi tab p2p ĐANG MỞ — hỏi log mỗi 5 giây trong lúc không ai nhìn là đốt I/O suông.
  function logTick(on){
    if(logTimer){clearInterval(logTimer);logTimer=null;}
    // 15s, KHÔNG ngắn hơn: cổng `no short-interval polling` chốt sàn đó. Không mất gì thật —
    // nhịp dò LAN vốn 30s/lần, nên log không có gì mới để hiện nhanh hơn thế.
    // 🔴 THẺ MÁY đi CÙNG nhịp này, không chỉ nhật ký. Trước đây `loadChannel()` chỉ chạy lúc mở tab và
    // sau một cú bấm — nên thẻ là ẢNH CHỤP: liên kết lên lúc 01:59 mà thẻ vẫn "đang nối lại" tới khi
    // người dùng mở lại tab (đo 25/09, user: *"vẫn kẹt quài nè"* trong khi backend đã `up`). Cùng một
    // đồng hồ, cùng một công tắc "tab đang mở" — không đẻ đồng hồ thứ hai.
    if(on){loadLog();loadChannel();logTimer=setInterval(function(){loadLog();loadChannel();},15000);}
  }
  window.zP2pLogTick=logTick;

  /** "vừa xong" / "N phút" / "N giờ" / "N ngày" — mốc thô không đọc được bằng mắt. */
  function zAgo(iso){
    var ms=Date.now()-new Date(iso||0).getTime();
    if(!isFinite(ms)||ms<0)return t('p2p.agoNow');
    var m=Math.floor(ms/60000);
    if(m<1)return t('p2p.agoNow');
    if(m<60)return t('p2p.agoMin').replace('{n}',String(m));
    var h=Math.floor(m/60);
    if(h<24)return t('p2p.agoHour').replace('{n}',String(h));
    return t('p2p.agoDay').replace('{n}',String(Math.floor(h/24)));
  }

  // KẾT QUẢ MỘT LƯỢT NỐI — phải nói được CÓ NỐI ĐƯỢC HAY KHÔNG, không chỉ đếm khối.
  //
  // 🔴 Ca thật user báo 2026-09-24: bấm Kết nối, màn hình hiện `✓ đã gửi 0 khối · đã nhận 0 khối`.
  // Endpoint chỉ trả `ok:true` khi một phiên đã chạy XONG không lỗi, nên đó LÀ nối thành công —
  // nhưng bề mặt không nói câu đó, chỉ trưng hai số 0. Người dùng đọc thành "không nối được", và
  // họ đọc đúng theo thứ nhìn thấy. Nguyên văn: *"phải thông báo có nối dc hay ko chứ"*.
  //
  // Nên dòng kết quả nay có ba phần, theo đúng thứ tự người cần: ① nối được với MÁY NÀO, qua
  // ĐƯỜNG nào · ② khối · ③ thư mục. Và 0/0 được nói thẳng là **hai máy đã khớp**, chứ không để
  // một con số 0 tự nói hộ — 0 vì đã đủ và 0 vì không có gì đi qua trông giống hệt nhau.
  function syncResultText(r){
    var who=(r.peerDeviceId||'').slice(0,11);
    var head=t('p2p.okConn').replace('{m}', who?who+'…':t('p2p.unknownPeer'));
    var via=r.via==='relay'?t('p2p.viaRelay'):(r.addr?t('p2p.viaDirect').replace('{a}',r.addr):'');
    var sb=r.sentBlocks||0, rb=r.receivedBlocks||0;
    var sf=r.sentFiles||0, rf=r.receivedFiles||0, af=r.appliedFiles||0, qf=r.queuedFiles||0;
    var parts=[head+(via?' · '+via:'')];
    if(sb||rb)parts.push(t('p2p.resBlocks').replace('{s}',zN(sb)).replace('{r}',zN(rb)));
    if(sf||rf)parts.push(t('p2p.resFiles').replace('{s}',zN(sf)).replace('{r}',zN(rf)).replace('{a}',zN(af)).replace('{q}',zN(qf)));
    if(!sb&&!rb&&!sf&&!rf)parts.push(t('p2p.nothingNew'));
    // CÒN LẠI phải nói ra: một lượt chở có ngân sách thời gian, nên "xong" ở đây nghĩa là
    // "xong phần của lượt này". Im lặng thì người dùng thấy ✓ rồi lượt sau vẫn còn việc.
    if(r.filesLeft)parts.push(t('p2p.filesLeft').replace('{n}',zN(r.filesLeft)));
    return parts.join(' · ');
  }

  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-act],[data-tr],[data-copy],#p2pLogOnly,#p2pLogHold,#driveToggle'):null;
    if(!el)return;
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
    // Chép một địa chỉ: đỡ phải đọc số qua điện thoại rồi gõ nhầm một chữ.
    var cp=el.getAttribute('data-copy');
    if(cp){
      try{
        navigator.clipboard.writeText(cp);
        // Báo ngay TRÊN NÚT vừa bấm. Bản cũ đẩy câu này xuống `p2pMsg` nằm ở THẺ NHẬT KÝ phía
        // dưới — bấm ở panel trái, chữ hiện ở panel khác thì coi như không báo.
        if(el.tagName==='BUTTON'){
          var old=el.textContent;el.textContent=t('p2p.copied2');el.disabled=true;
          setTimeout(function(){el.textContent=old;el.disabled=false;},1200);
        } else p2pMsg(t('p2p.copied2'));
      }catch(_){}
      return;
    }
    var act=el.getAttribute('data-act');
    if(el.id==='p2pLogOnly'){
      LOG_ONLY_CHANNEL=!LOG_ONLY_CHANNEL;
      el.classList.toggle('on',LOG_ONLY_CHANNEL);
      loadLog();
      return;
    }
    if(el.id==='p2pLogHold'){
      LOG_HOLD=!LOG_HOLD;
      el.classList.toggle('on',LOG_HOLD);
      return;
    }
    // Công tắc kênh Drive = BẬT/TẮT KÊNH, KHÔNG phải xoá liên kết.
    //
    // ⚠ Bản cũ dùng chính ĐƯỜNG DẪN làm công tắc: gạt tắt là gọi `/set-drive?path=` — tức xoá đường
    // khỏi config, rồi cố cứu bằng cách giữ chuỗi trong ô nhập. Nạp lại trang là mất luôn, và thẻ
    // hiện "chưa link" (đo 2026-09-17: `drive` trong config về chuỗi rỗng đúng sau một cú gạt).
    // Tắt một tính năng không được phép làm mất cấu hình của nó — bật lại phải là chạy tiếp, không
    // phải đi tìm lại thư mục mà chính app vừa quên.
    if(el.id==='driveToggle'){
      var linked=!!(Z.mem&&Z.mem.drive&&Z.mem.drive.path);
      if(!el.classList.contains('on')&&linked){
        // Đã có đường rồi thì bật lại chỉ là gạt cờ.
        zSave('/set-drive-on?on=1').then(function(){el.classList.add('on');return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){});
        return;
      }
      if(!el.classList.contains('on')){
        // BẬT LẠI. Bản cũ chỉ `focus()` vào ô nhập rồi `return` — không bật, không báo, nên cú bấm
        // đọc ra thành "nút hỏng" (user 2026-09-16: *"bấm bật lại drive ko dc"*). Cùng họ với lỗi
        // `.chip` và nút *Dọn ngay*: một nút không ăn mà không nói lý do thì người dùng đọc là hỏng.
        var di=zid('driveInput'), want=(di&&di.value.trim())||'';
        if(!want){
          if(di)di.focus();
          zset('driveState',t('drv.needPath'));   // nói RA điều kiện còn thiếu
          return;
        }
        zSave('/set-drive?path='+encodeURIComponent(want)).then(function(j){
          if(!j)return;
          el.classList.toggle('on',!!j.linked);
          zset('driveState',driveMsg(j));
          zGet('/memory-status?fresh=1').then(renderMem).catch(function(){});
        });
        return;
      }
      // TẮT KÊNH — đường dẫn GIỮ NGUYÊN trong config.
      zSave('/set-drive-on?on=0').then(function(){
        el.classList.remove('on');
        return zGet('/memory-status?fresh=1').then(renderMem);
      }).catch(function(){});
      return;
    }
    if(act==='p2p-add-open'){ var ap=zid('addPeerDlg'); if(ap)ap.classList.add('on'); loadChannel(); return; }
    if(act==='p2p-unpair'){
      // 🔴 Nhánh này TỪNG THIẾU HẲN: nút gắn `data-act="p2p-unpair"` mà không ai bắt, nên bấm
      // không xảy ra gì và thẻ máy ở nguyên đó — người dùng đọc thành "kẹt". Bốn hành động p2p
      // khác đều có nhánh; riêng nó rơi ra lúc dựng bề mặt cụm máy.
      var uid=el.getAttribute('data-id')||'';
      if(!uid)return;
      // Khoá nút ngay: một lượt xoá là lời gọi mạng, và bấm hai lần là hai lượt ghi vào cùng sổ.
      if(el.dataset.busy)return;
      btnBusy(el,true);
      zPost('/channel-pair?drop=1&id='+encodeURIComponent(uid)).then(function(r){
        // Hỏng thì MỞ LẠI nút và nói ra — không để một nút chết im lặng (`save-never-silent`).
        if(!r||r.ok===false){btnBusy(el,false);p2pMsg('✗ '+((r&&r.error)||t('q.err')));return;}
        // Thẻ máy dựng từ SỔ, nên nạp lại là nó biến mất — không tự gỡ node bằng tay, tránh
        // để màn hình và sổ nói hai chuyện khác nhau.
        loadChannel();
      }).catch(function(){btnBusy(el,false);p2pMsg('✗ '+t('q.err'));});
      return;
    }
    if(act==='p2p-toggle'){
      // zSave, KHÔNG zPost: cổng `save-never-silent` (2026-09-12) cấm công tắc tự xử lời
      // hứa lưu. Ba kiểu hỏng (gọi hỏng · HTTP≠2xx · {ok:false}) đều phải HOÀN NGUYÊN + báo.
      var wasOn=el.classList.contains('on');
      el.classList.toggle('on',!wasOn); // lạc quan, để nút phản hồi ngay
      zSave('/set-p2p?on='+(wasOn?'0':'1'),function(){el.classList.toggle('on',wasOn);})
        .then(function(j){if(j)loadChannel();});
    }
    else if(act==='p2p-sync-addr'){
      // Nối bằng địa chỉ. Kết quả phải hiện TRONG hộp thoại đang mở: bản trước đẩy sang `p2pMsg`
      // nằm ở thẻ nhật ký phía sau, nên bấm xong không thấy gì và người dùng đọc thành "nút chết"
      // (user báo 2026-09-20 — lúc đó endpoint đang trả ETIMEDOUT đều đặn).
      var ad=((zid('p2pAddrIn')||{}).value||'').trim();
      if(!ad){zset('addPeerMsg',t('p2p.byAddrNeed'));return;}
      if(el.dataset.busy)return;
      btnBusy(el,true);
      zset('addPeerMsg',t('p2p.syncing'));
      zPost('/channel-sync?host='+encodeURIComponent(ad)).then(function(r){
        btnBusy(el,false);
        if(!r||r.ok===false){zset('addPeerMsg','✗ '+p2pWhy((r&&r.error)||''));loadChannel();return;}
        // CHỖ CHỜ: `ok:true` mà 0 khối KHÔNG phải "đã xong". Thiếu nhánh này thì bề mặt in
        // "✓ gửi 0 · nhận 0" cho một việc chưa xảy ra — đúng kiểu nói dối §F3 cấm.
        if(r.waiting){zset('addPeerMsg',t('p2p.waiting').replace('{a}',r.addr||''));loadChannel();return;}
        zset('addPeerMsg','✓ '+syncResultText(r));
        loadChannel();
      }).catch(function(){btnBusy(el,false);zset('addPeerMsg',t('p2p.logErr'));});
    }
    else if(act==='p2p-sync'){
      p2pKick(el,'');
    }
  });

// ── TỆP (plan/25 §5 ①) ───────────────────────────────────────────────────────
// Lưới theo tháng, giống album của một app chat. Một NGUỒN duy nhất `/attachments`
// dùng chung với panel "Tệp của phiên" — không con số nào sống hai chỗ.
(function () {
  var state = { kind: 'all', q: '', loaded: false, items: [] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function month(at) { return at && at.length >= 7 ? at.slice(0, 7) : t('files.noDate'); }

  function tile(f) {
    // Tệp làn `picked` (người tự thêm) không tới từ hội thoại nào ⇒ KHÔNG gắn nút nhảy,
    // thay vì trưng một nút bấm vào không có gì (plan/25 §5).
    // Mở dialog xem tệp; nhảy về phiên là nút RIÊNG trong dialog, không phải cú bấm này —
    // bấm một tấm ảnh mà bị ném sang màn khác là hành vi người dùng không lường được.
    var jump = ' data-fopen="' + f.idx + '"';
    // `ref` chưa tải thì KHÔNG trưng ô trống giả vờ có ảnh — nói thẳng là chưa có byte.
    if (!f.fetched) {
      return '<div class="ftile fmissing" title="' + esc(f.name || f.sha256.slice(0, 8)) + '"' + jump + '>' +
        '<div class="fph">⧗</div><div class="fcap">' + t('files.notFetched') + '</div></div>';
    }
    if (f.category === 'images') {
      return '<div class="ftile" title="' + esc(f.name || '') + ' · ' + kb(f.bytes) + '"' + jump + '>' +
        '<img loading="lazy" src="/attachment?sha=' + f.sha256 + '" alt="' + esc(f.name || t('files.image')) + '">' +
        '</div>';
    }
    var icon = f.category === 'documents' ? '📄' : f.category === 'archives' ? '🗜' : f.category === 'media' ? '🎬' : '📎';
    return '<div class="ftile ffile" title="' + esc(f.name || '') + '"' + jump + '>' +
      '<div class="fph">' + icon + '</div>' +
      '<div class="fcap">' + esc((f.name || f.sha256.slice(0, 8)).slice(0, 22)) + '<br>' + kb(f.bytes) + '</div></div>';
  }

  function render(data) {
    var box = zid('filesGrid'); if (!box) return;
    // Giữ NGUYÊN danh sách đang hiện để dialog lùi/tới đi đúng thứ tự người dùng đang nhìn,
    // và đánh chỉ số vào từng mục — `data-fopen` trỏ vào chỉ số này.
    state.items = data.items || [];
    state.items.forEach(function (f, i) { f.idx = i; });
    zset('filesCount', String(data.total) + ' ' + t('files.unit'));
    if (!data.items.length) { zset('filesMonth', ''); box.innerHTML = '<div class="muted" style="padding:14px">' + t('files.empty') + '</div>'; return; }
    // Nhãn tháng KHÔNG còn chiếm một hàng riêng trong lưới (user 2026-09-18: *"tự nhiên có cái
    // năm bị nằm 1 hàng 1 mình… để nó lên hàng search luôn"*). Một dòng chữ ăn trọn chiều ngang
    // chỉ để nói "2026-09" là đổi một hàng lưới lấy sáu chữ. Nay khoảng tháng nằm ở CUỐI hàng
    // search — đúng thứ tự search → filter → thông tin.
    var months = [];
    data.items.forEach(function (f) { var m = month(f.at); if (months.indexOf(m) < 0) months.push(m); });
    var span = months.length ? (months.length === 1 ? months[0] : months[months.length - 1] + ' → ' + months[0]) : '';
    zset('filesMonth', span);
    box.innerHTML = '<div class="fgrid">' + data.items.map(tile).join('') + '</div>';
  }

  function load() {
    var box = zid('filesGrid'); if (!box) return;
    box.innerHTML = '<div class="muted" style="padding:14px">' + t('files.loading') + '</div>';
    var qs = '/attachments?pageSize=300&kind=' + encodeURIComponent(state.kind) +
      (state.q ? '&q=' + encodeURIComponent(state.q) : '');
    zGet(qs).then(render).catch(function () {
      box.innerHTML = '<div class="muted" style="padding:14px">' + t('files.err') + '</div>';
    });
  }

  // Nạp LƯỜI: chỉ khi người dùng thật sự mở tab Tệp. Kho ảnh có thể vài nghìn mục nên
  // kéo sẵn lúc mở app là trả tiền cho thứ chưa ai xem.
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-gm="files"]') : null;
    if (b && b.tagName === 'BUTTON' && !state.loaded) { state.loaded = true; load(); }
    var chip = e.target.closest ? e.target.closest('[data-fkind]') : null;
    if (chip) {
      state.kind = chip.getAttribute('data-fkind');
      var wrap = zid('filesKind');
      if (wrap) Array.prototype.forEach.call(wrap.children, function (c) { c.classList.toggle('on', c === chip); });
      load();
    }
    var act = e.target.closest ? e.target.closest('[data-act="files-reload"]') : null;
    if (act) load();
    var tileEl = e.target.closest ? e.target.closest('#filesGrid [data-fopen]') : null;
    if (tileEl) window.zFileView.open(state.items, Number(tileEl.getAttribute('data-fopen')));
    var add = e.target.closest ? e.target.closest('[data-act="files-add"]') : null;
    if (add) pickAndAdd();
  });

  // ── Làn `picked` (plan/25 §1b): NGƯỜI đưa tệp vào kho ────────────────────────
  // Hai đường vì trình duyệt cố ý không cho trang biết đường dẫn thật của tệp được THẢ:
  //  · nút  → hộp thoại của HỆ trả về đường dẫn → gửi đường dẫn, không gửi byte;
  //  · thả  → chỉ có nội dung → gửi byte.
  function say(msg) {
    var el = zid('filesAddMsg'); if (!el) return;
    el.textContent = msg;
    setTimeout(function () { if (el.textContent === msg) el.textContent = ''; }, 6000);
  }
  function after(r) {
    if (r && r.ok) {
      say(r.added ? t('files.added') : t('files.dupe'));
      state.loaded = true; load();
    } else say((r && r.error) || t('files.addErr'));
  }
  function pickAndAdd() {
    say(t('files.picking'));
    zPost('/pick-file?filter=' + encodeURIComponent('All files (*.*)|*.*')).then(function (r) {
      if (!r || !r.ok || !r.path) { say(''); return; }
      return zPost('/attachments-add?path=' + encodeURIComponent(r.path)).then(after);
    }).catch(function () { say(t('files.addErr')); });
  }
  var grid = zid('filesGrid');
  if (grid) {
    ['dragenter', 'dragover'].forEach(function (ev) {
      grid.addEventListener(ev, function (e) { e.preventDefault(); grid.classList.add('fdrop'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      grid.addEventListener(ev, function (e) { e.preventDefault(); grid.classList.remove('fdrop'); });
    });
    grid.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files ? Array.prototype.slice.call(e.dataTransfer.files) : [];
      if (!files.length) return;
      say(t('files.adding'));
      // Gửi TUẦN TỰ: mỗi tệp một lời cho phép, và một lượt thả 30 tệp không mở 30 kết nối.
      var i = 0, added = 0;
      (function next() {
        if (i >= files.length) { say(added ? t('files.added') : t('files.dupe')); state.loaded = true; load(); return; }
        var f = files[i++];
        fetch('/attachments-add?name=' + encodeURIComponent(f.name), { method: 'POST', body: f })
          .then(function (r) { return r.json(); })
          .then(function (r) { if (r && r.added) added += r.added; next(); })
          .catch(function () { next(); });
      })();
    });
  }
  var q = zid('filesQ');
  if (q) {
    var timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = q.value.trim(); load(); }, 250);
    });
  }
})();

// Panel "Tệp của phiên" (plan/25 §5 ②) — lăng kính thứ hai của CÙNG endpoint `/attachments`.
// Cố ý KHÔNG dựng truy vấn riêng: hai bề mặt của cùng một chức năng phải đi qua cùng một cửa,
// nếu không chúng lệch số rồi không ai biết bên nào đúng (bài học `zemory sweep` 12/09).
var sessItems = [];
document.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('#sessFiles [data-sfopen]') : null;
  if (el) window.zFileView.open(sessItems, Number(el.getAttribute('data-sfopen')));
});
window.zSessionFiles = function (sid) {
  var box = document.getElementById('sessFiles');
  var cnt = document.getElementById('sessFCount');
  if (!box) return;
  if (!sid) { box.innerHTML = '<div class="muted" style="font-size:12px">' + t('files.pickSess') + '</div>'; if (cnt) cnt.textContent = '—'; return; }
  box.innerHTML = '<div class="muted" style="font-size:12px">' + t('files.loading') + '</div>';
  zGet('/attachments?pageSize=200&session=' + encodeURIComponent(sid)).then(function (d) {
    if (cnt) cnt.textContent = String(d.total) + ' ' + t('files.unit');
    if (!d.items.length) { box.innerHTML = '<div class="muted" style="font-size:12px">' + t('files.empty') + '</div>'; return; }
    sessItems = d.items;
    box.innerHTML = '<div class="fgrid">' + d.items.map(function (f, i) {
      if (f.category === 'images' && f.fetched) {
        return '<div class="ftile" data-sfopen="' + i + '" title="' + String(f.bytes) + ' B"><img loading="lazy" src="/attachment?sha=' + f.sha256 + '" alt=""></div>';
      }
      var icon = f.category === 'documents' ? '📄' : f.category === 'archives' ? '🗜' : f.category === 'media' ? '🎬' : '📎';
      var cls = f.fetched ? 'ftile ffile' : 'ftile fmissing';
      var cap = f.fetched ? String(Math.max(1, Math.round(f.bytes / 1024))) + ' KB' : t('files.notFetched');
      return '<div class="' + cls + '" data-sfopen="' + i + '"><div class="fph">' + icon + '</div><div class="fcap">' + cap + '</div></div>';
    }).join('') + '</div>';
  }).catch(function () { box.innerHTML = '<div class="muted" style="font-size:12px">' + t('files.err') + '</div>'; });
};

// ── Dialog XEM TỆP (plan/25 §5) ──────────────────────────────────────────────
// Một dialog dùng CHUNG cho cả màn Tệp lẫn panel Tệp-của-phiên: hai bề mặt, một cửa.
// Giữ nguyên DANH SÁCH đang xem để nút lùi/tới đi đúng thứ tự người dùng đang nhìn —
// nếu hỏi lại server thì thứ tự có thể khác và người dùng "mất chỗ".
window.zFileView = (function () {
  var list = [];
  var idx = 0;

  function human(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  function paint() {
    var f = list[idx];
    if (!f) return;
    zset('fileDlgTitle', f.name || f.sha256.slice(0, 12));
    zset('fileDlgMeta', (f.mime || '?') + ' · ' + human(f.bytes) + (f.at ? ' · ' + f.at.slice(0, 10) : ''));
    zset('fileDlgPos', list.length > 1 ? (idx + 1) + '/' + list.length : '');
    var dl = document.getElementById('fileDlgDl');
    var body = document.getElementById('fileDlgBody');
    var nav = list.length > 1;
    var sb = document.getElementById('fileDlgSess');
    if (sb) sb.style.display = f.sessionId ? '' : 'none';
    ['fileDlgPrev', 'fileDlgNext'].forEach(function (id) {
      var b = document.getElementById(id); if (b) b.style.display = nav ? '' : 'none';
    });
    if (!f.fetched) {
      // Chưa có byte ⇒ nói thẳng, KHÔNG trưng thẻ ảnh rỗng rồi để trình duyệt hiện icon vỡ.
      if (dl) { dl.style.display = 'none'; }
      body.innerHTML = '<div class="muted" style="text-align:center">' + t('files.notFetchedLong') + '</div>';
      return;
    }
    var url = '/attachment?sha=' + f.sha256;
    if (dl) { dl.style.display = ''; dl.href = url; dl.setAttribute('download', f.name || (f.sha256.slice(0, 8) + '.bin')); }
    if (f.category === 'images') {
      body.innerHTML = '<img alt="" src="' + url + '" style="max-width:100%;max-height:100%;object-fit:contain">';
      return;
    }
    // TỆP CHỮ: đọc rồi tự vẽ, KHÔNG nhúng iframe.
    //
    // Hai lý do đo được (2026-09-15): ① iframe dùng bảng màu MẶC ĐỊNH của trình duyệt —
    // nền tối của app + chữ đen mặc định ⇒ "đen thui không thấy gì"; token của app không
    // với tới bên trong iframe. ② tự `fetch` rồi `response.text()` thì bản giải mã là
    // UTF-8 theo chuẩn fetch, không phụ thuộc trình duyệt đoán bảng mã.
    var isText = /^text\/|^application\/(json|sql|xml|javascript|x-sh)\b/.test(f.mime || '');
    if (isText) {
      body.innerHTML = '<div class="muted">' + t('files.loading') + '</div>';
      fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
        if (list[idx] !== f) return; // người dùng đã bấm sang tệp khác trong lúc chờ
        body.innerHTML = '<pre class="fpre"></pre>';
        body.firstChild.textContent = txt; // textContent ⇒ không diễn giải HTML trong tệp
      }).catch(function () {
        body.innerHTML = '<div class="muted">' + t('files.err') + '</div>';
      });
      return;
    }
    if (/^application\/pdf/.test(f.mime || '')) {
      body.innerHTML = '<iframe src="' + url + '" style="width:100%;height:100%;border:0;background:var(--surface-2)"></iframe>';
      return;
    }
    body.innerHTML = '<div style="text-align:center"><div style="font-size:52px;opacity:.7">📎</div><div class="muted" style="margin-top:8px">' +
      t('files.noPreview') + '</div></div>';
  }

  function open(items, at) {
    list = items || [];
    idx = Math.max(0, Math.min(at || 0, list.length - 1));
    var d = document.getElementById('fileDlg');
    if (!d || !list.length) return;
    paint();
    d.classList.add('on');
  }
  function step(n) {
    if (list.length < 2) return;
    idx = (idx + n + list.length) % list.length; // vòng lại, không kẹt ở hai đầu
    paint();
  }
  function close() { var d = document.getElementById('fileDlg'); if (d) d.classList.remove('on'); }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    if (e.target.id === 'fileDlg' || e.target.id === 'fileDlgX') { close(); return; }
    if (e.target.closest('#fileDlgPrev')) { step(-1); return; }
    if (e.target.closest('#fileDlgNext')) { step(1); return; }
    if (e.target.closest('#fileDlgSess')) {
      // Nhảy về hội thoại gốc — nút RIÊNG, không phải cú bấm vào tấm ảnh. Tệp làn tự-thêm
      // không có phiên nào ⇒ nút ẩn, không trưng nút chết (plan/25 §5).
      var f = list[idx];
      if (f && f.sessionId) {
        close();
        var nav = document.querySelector('[data-goto="recall:sess"]');
        if (nav) nav.click();
        if (window.zOpenSession) window.zOpenSession(f.sessionId);
      }
      return;
    }
  });
  // Mũi tên trái/phải chỉ ăn KHI dialog đang mở, và không cướp phím của ô nhập.
  document.addEventListener('keydown', function (e) {
    var d = document.getElementById('fileDlg');
    if (!d || !d.classList.contains('on')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
  });

  return { open: open, step: step, close: close };
})();

  // ── MÀN ĐỒNG BỘ ────────────────────────────────────────────────────────────
  // Vào màn thì nạp + bật nhịp nhật ký; rời màn thì TẮT nhịp. Hỏi log mỗi 15s trong lúc không ai
  // nhìn là đốt I/O suông, và đó đúng là thứ `no short-interval polling` dựng ra để chặn.
  // `onP2pTab` = tab máy-tới-máy có đang mở không. Trạng thái kênh nạp cho CẢ HAI tab (tab Drive
  // cũng cần biết đã link chưa); riêng nhịp nhật ký chỉ chạy ở tab p2p.
  // TỈ TRỌNG THEO NGUỒN — biểu đồ thứ hai của bảng đo Drive.
  // Dùng CHÍNH số của `/insights` (nguồn mà màn Xu hướng đang vẽ), không đẻ endpoint mới và không
  // đẻ con số thứ hai cho cùng một sự thật — `plan/15` cấm nhân đôi số liệu.
  // Một hàm vẽ CHUNG cho cả hai thanh tỉ trọng — cùng khuôn, cùng phép gộp đuôi. Hai bản chép
  // là hai chỗ để lệch (§F6), mà đây đúng là loại lệch không ai thấy: hai biểu đồ cạnh nhau tính
  // phần trăm theo hai kiểu.
  function mixBars(box,rows,nameOf){
    if(!rows.length){box.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('ins.noData'))+'</div>';return;}
    var tot=rows.reduce(function(a,x){return a+(x.messages||0);},0)||1;
    // Gộp đuôi thành "khác": 12 thanh dài 1px không nói được gì, mà lại đẩy nút xuống dưới màn.
    var top=rows.slice(0,5), rest=rows.slice(5);
    if(rest.length)top.push({_other:1,messages:rest.reduce(function(a,x){return a+(x.messages||0);},0)});
    box.innerHTML=top.map(function(r){
      var pc=Math.round((r.messages||0)/tot*1000)/10;
      return '<div class="drvmix-row"><div class="drvmix-top"><span>'+stdEsc(r._other?t('drv.mixOther'):(nameOf(r)||'—'))+'</span>'
        +'<span class="muted">'+pc+'% · '+zN(r.messages)+'</span></div>'
        +'<div class="drvmix-bar"><div class="drvmix-fill" style="width:'+Math.max(1,pc)+'%"></div></div></div>';
    }).join('');
  }
  // ── MÁY NÀY: ổ đĩa + nơi nguồn quét được nằm ─────────────────────────────
  //
  // User 2026-09-17: *"bên chỗ máy này bên chart panel phải mấy dòng bar chart hiển thị dung lượng ổ
  // đĩa đang có, và hiển thị luôn chỗ quét được từ máy là nằm ở đâu link nào"*.
  //
  // Hai số này đều là SỰ THẬT CỦA MÁY, không phải của kho: dung lượng ổ đọc từ hệ điều hành (qua tiến
  // trình con, vì ổ mây treo thì syscall nằm im), còn đường dẫn đọc thẳng sổ `known_stores` — chính
  // chỗ bộ quét ghi lại từng gốc store nó tìm ra, nên không đẻ con số thứ hai lệch với cây Nguồn.
  var mInfoTimer=null, mInfoTries=0;
  // Quét lại = ÉP DÒ TƯƠI. Bản đệm sống 10 phút, nên cắm thêm ổ xong mà bấm nút vẫn ra số cũ thì
  // nút đọc ra là hỏng — nút phải làm đúng việc nó hứa.
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('[data-act="rescan-disks"]'):null;if(!b||b.dataset.busy)return;
    b.dataset.busy='1';var old=b.textContent;b.textContent=t('mem.disksScanning');
    renderMachineInfo(true).then(function(){b.textContent=old;delete b.dataset.busy;});
  });
  function renderMachineInfo(fresh){
    var bd=zid('mDisks'), bs=zid('mStores');
    if(!bd&&!bs)return Promise.resolve();
    return zGet('/machine-info'+(fresh?'?fresh=1':'')).then(function(d){
      var disks=(d&&d.disks)||[], stores=(d&&d.stores)||[];
      var gb=function(n){n=Number(n||0);return n>=1073741824?(n/1073741824).toFixed(1)+' GB':Math.round(n/1048576)+' MB';};
      if(bd){
        if(!disks.length){
          // Lượt dò ĐẦU ngay sau khi daemon lên có thể trượt (đo 2026-09-17: con bị "Command failed"
          // một lần rồi lượt sau chạy). Nói "chưa đọc được" rồi HỎI LẠI — đứng im ở một ô trống là
          // bề mặt chết trông như đang sống (§F3).
          bd.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('mem.disksNone'))+'</div>';
          if(mInfoTries<6){mInfoTries++;if(mInfoTimer)clearTimeout(mInfoTimer);mInfoTimer=setTimeout(renderMachineInfo,4000);}
        } else {
          mInfoTries=0;if(mInfoTimer){clearTimeout(mInfoTimer);mInfoTimer=null;}
          bd.innerHTML=disks.map(function(k){
            var used=Math.max(0,k.total-k.free), pc=k.total?Math.round(used/k.total*1000)/10:0;
            return '<div class="mdisk"><div class="mdisk-top"><b>'+stdEsc(k.root)+'</b>'
              +'<span class="muted">'+stdEsc(t('mem.diskFree').replace('{v}',gb(k.free)))+' · '+gb(used)+' / '+gb(k.total)+'</span></div>'
              +'<div class="drvmix-bar"><div class="drvmix-fill" style="width:'+Math.max(1,pc)+'%"></div></div></div>';
          }).join('');
        }
      }
      if(bs){
        bs.innerHTML=stores.length
          ? stores.map(function(x){
              // Dòng GỘP của cụm web nói rõ nó gộp bao nhiêu nền — nếu không, một dòng "imports" trông
              // như một nguồn lẻ, và người đọc mất luôn thông tin "web nằm chung một chỗ".
              var lbl=x.kind==='import'?t('mem.storeImports').replace('{n}',x.platforms||0):(x.source||'—');
              return '<div class="mstore">'
                +'<span class="src">'+stdEsc(lbl)+'</span><span class="pth">'+stdEsc(x.root||'')+'</span>'
                +'<button class="btn xs mstore-cp" data-copypath="'+stdEsc(x.root)+'" title="'+stdEsc(t('mem.storeCopy'))+'" aria-label="'+stdEsc(t('mem.storeCopy'))+'">'+stdEsc(t('p2p.copy'))+'</button></div>';
            }).join('')
          : '<div class="muted" style="font-size:11.5px">'+stdEsc(t('mem.storesNone'))+'</div>';
      }
    }).catch(function(){
      if(bd)bd.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('ph.err'))+'</div>';
    });
  }
  // NÚT chép riêng, và báo kết quả NGAY TRÊN NÚT. Bản đầu biến cả hàng thành vùng bấm rồi ghi
  // "đã chép" đè lên NHÃN NGUỒN — tức là nuốt mất thông tin của hàng, và hàng nào đã bấm thì nằm
  // đó mãi với chữ sai (user 2026-09-17: *"mắc gì copy rồi đổi tên title người ta"*). Phản hồi phải
  // rơi vào chính thứ vừa bấm, không rơi vào dữ liệu.
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('.mstore-cp[data-copypath]'):null;if(!b)return;
    var p=b.getAttribute('data-copypath')||'';
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(p);
    if(b.dataset.busy)return;                      // bấm dồn thì đừng chồng nhãn lên nhau
    b.dataset.busy='1';
    var old=b.textContent;
    b.textContent=t('mem.copied');
    setTimeout(function(){b.textContent=old;delete b.dataset.busy;},1200);
  });
  function renderDriveMix(){
    var box=zid('drvMix'), boxP=zid('drvMixProj'); if(!box&&!boxP)return;
    // MỘT lượt gọi cho CẢ HAI biểu đồ — cùng một câu trả lời thì hai con số không thể lệch nhau,
    // và cũng không tốn lượt thứ hai.
    zGet('/insights?days=30').then(function(d){
      if(box)mixBars(box,((d&&d.agents)||[]).filter(function(a){return (a.messages||0)>0;}),function(r){return r.source;});
      if(boxP){
        // Xếp lại theo số tin: /insights không hứa thứ tự, mà biểu đồ tỉ trọng đọc từ trên xuống thì
        // thanh dài nhất phải đứng đầu. Chỉ lấy tên cuối đường cho gọn.
        var pr=((d&&d.projects)||[]).filter(function(x){return (x.messages||0)>0;})
          .slice().sort(function(a,b){return (b.messages||0)-(a.messages||0);});
        // Trường là `project` (đường dẫn gốc repo), KHÔNG phải `path` — hàng của /insights chỉ có
        // {project, sessions, messages}. Đọc nhầm tên thì `nameOf` trả rỗng và mọi thanh mang nhãn
        // "—", tức biểu đồ vẫn vẽ nhưng không nói được gì (đo 2026-09-17, user báo "không có tên").
        mixBars(boxP,pr,function(r){return String(r.project||'').split(/[\\/]/).filter(Boolean).pop();});
      }
    }).catch(function(){ [box,boxP].forEach(function(b){if(b)b.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('ph.err'))+'</div>';}); });
  }
  // SỨC CHỨA Ổ — và gọi ĐÚNG TÊN thứ đang đo. Google Drive Desktop gắn ổ ảo rồi báo lại thông số
  // của ĐĨA LOCAL (đo 2026-09-17: G: và C: trùng Size tới từng byte), nên nhãn không được viết là
  // "dung lượng Drive còn lại" — đó sẽ là một con số dối. Hạn mức đám mây phải hỏi API Google bằng
  // tài khoản đã đăng nhập, mà zemory không bao giờ cầm mật khẩu/2FA.
  // Probe ổ chạy trong TIẾN TRÌNH CON và có cache riêng, nên vài lượt đầu sau khi mở app nó trả
  // `volume:null` ("đang dò"). Vẽ MỘT LẦN rồi thôi là đứng vĩnh viễn ở câu "chưa đo được" dù số
  // đã về ngay sau đó — đúng kiểu bề mặt chết mà trông như đang sống (§F3). Nên: còn "đang dò" thì
  // hẹn đo lại, có TRẦN số lần để không thành vòng hỏi vô tận, và huỷ hẹn khi rời tab.
  var spaceTimer=null, spaceTries=0;
  function stopDriveSpace(){ if(spaceTimer){clearTimeout(spaceTimer);spaceTimer=null;} spaceTries=0; }
  function renderDriveSpace(){
    var box=zid('drvSpace'); if(!box)return;
    zGet('/memory-status').then(function(m){
      var dv=(m&&m.drive)||{}, v=dv.volume;
      if(!v||!v.total){
        // Chưa đo được thì VÀNH PHẢI RỖNG và số là "—". Để nguyên cung cũ (hoặc để CSS vẽ sẵn một
        // vành) là bịa ra một biểu đồ cho dữ liệu chưa có — đúng thứ user gọi là "chart giả".
        var a0=zid('capArc');if(a0)a0.setAttribute('stroke-dasharray','0 '+DONUT_C.toFixed(1));
        zset('capPct','—');zset('capTxt','—');zset('capSub','');
        box.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(dv.linked?t('drv.spaceProbing'):t('drv.spaceNone'))+'</div>';
        // Đã link mà chưa có số ⇒ probe đang chạy, hỏi lại. Chưa link thì KHÔNG hỏi lại: không có
        // gì để đo, hẹn nữa chỉ là gõ cửa một căn phòng trống.
        // HỎI NHANH lúc đầu rồi CHẬM MÃI — KHÔNG bỏ cuộc. Bản cũ dừng sau 8 lượt (40 s) rồi đứng
        // vĩnh viễn ở "chưa đo được", trong khi lượt dò ổ đầu tiên sau khi daemon lên hay trượt một
        // lần nên số thật chỉ về sau đó (đo 2026-09-17: endpoint đã có đủ số mà panel vẫn báo chưa
        // đo được). Một bề mặt bỏ cuộc rồi nằm im là bề mặt nói sai (§F3).
        if(dv.linked){
          spaceTries++;
          if(spaceTimer)clearTimeout(spaceTimer);
          spaceTimer=setTimeout(renderDriveSpace,spaceTries<8?5000:30000);
        }
        return;
      }
      stopDriveSpace();
      var store=Math.max(0,dv.storeBytes||0), used=Math.max(0,v.total-v.free), other=Math.max(0,used-store);
      var pc=function(n){return Math.max(0,Math.min(100,n/v.total*100));};
      // KHÔNG dùng zBytes ở đây: nó nhận KILOBYTE (core.js), còn probe trả BYTE — lẫn một nhịp là
      // sai đúng 1024 lần mà nhìn vẫn "có vẻ hợp lý".
      var gb=function(n){n=Number(n||0);return n>=1073741824?(n/1073741824).toFixed(1)+' GB':n>=1048576?(n/1048576).toFixed(0)+' MB':Math.round(n/1024)+' KB';};
      // VÒNG = phần CÒN TRỐNG, không phải phần đã dùng: câu người dùng hỏi là "còn bao nhiêu chỗ để
      // đẩy tiếp". Vòng bên trái đọc là "đã đẩy được bao nhiêu %", vòng này đọc là "còn trống bao
      // nhiêu %" — hai vòng cùng cỡ, cùng chỗ, nên mỗi vòng phải tự nói nó đo gì.
      var freePct=Math.round(pc(v.free));
      var cArc=zid('capArc'),cLbl=zid('capPct');
      if(cArc){
        if(freePct>=100)cArc.removeAttribute('stroke-dasharray');
        else cArc.setAttribute('stroke-dasharray',(freePct/100*DONUT_C).toFixed(1)+' '+DONUT_C.toFixed(1));
        // Sắp hết chỗ thì đổi màu, cùng bậc đọc với vòng bên trái để mắt quen một kiểu.
        cArc.style.stroke=freePct<10?'var(--danger)':(freePct<25?'var(--warn)':'var(--success)');
      }
      if(cLbl)cLbl.textContent=freePct+'%';
      zset('capTxt',t('drv.spaceFreeN').replace('{v}',gb(v.free)));
      // Phụ đề mang Ý NGHĨA của vòng (tiêu đề cũ nằm trên donut làm panel phải lệch 17px so với
      // panel trái — user muốn hai vòng ngang nhau). Số 'đã dùng/tổng' đã có ở khối dưới, không lặp.
      zset('capSub',t('drv.spaceH')+' · '+(v.root||''));
      var seg=function(w,cls,lbl,val){return '<div class="cap-seg '+cls+'" style="width:'+w+'%" title="'+stdEsc(lbl+': '+val)+'"></div>';};
      box.innerHTML='<div class="cap-bar">'+seg(pc(store),'is-store',t('drv.spaceStore'),gb(store))
        +seg(pc(other),'is-other',t('drv.spaceOther'),gb(other))
        +seg(pc(v.free),'is-free',t('drv.spaceFree'),gb(v.free))+'</div>'
        +'<div class="cap-leg">'
        +'<span><i class="is-store"></i>'+stdEsc(t('drv.spaceStore'))+' <b>'+gb(store)+'</b></span>'
        +'<span><i class="is-other"></i>'+stdEsc(t('drv.spaceOther'))+' <b>'+gb(other)+'</b></span>'
        +'<span><i class="is-free"></i>'+stdEsc(t('drv.spaceFree'))+' <b>'+gb(v.free)+'</b></span>'
        +'</div>'
        +'<div class="muted" style="font-size:11px;margin-top:5px">'+stdEsc(v.root||'')+' · '+stdEsc(t('drv.spaceUsed'))+' '+gb(used)+' / '+gb(v.total)+'</div>'
        +'<div class="muted" style="font-size:11px;margin-top:2px">'+stdEsc(t('drv.spaceNote'))+'</div>';
    }).catch(function(){ box.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('ph.err'))+'</div>'; });
  }

  function syncScreen(onP2pTab){
    logTick(!!onP2pTab);
    loadChannel();
    if(onP2pTab)stopDriveSpace();   // rời tab Drive thì thôi hỏi lại
    else {renderDriveMix();renderDriveSpace();}   // chỉ vẽ khi tab Drive đang mở
  }
  window.zSyncScreen=syncScreen;

  // Đóng hộp Thêm máy: nút ✕ hoặc bấm nền. ESC đã do handler chung lo (đóng đúng lớp trên cùng).
  document.addEventListener('click',function(e){
    var t0=e.target; if(!t0||!t0.closest)return;
    if(t0.closest('#addPeerClose')||t0.id==='addPeerDlg'){var d=zid('addPeerDlg');if(d)d.classList.remove('on');}
  });
