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
    var dtg=zid('driveToggle'); if(dtg)dtg.classList.toggle('on',!!d.linked);
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
  // SỐ MÁY nhóm ba cho dễ đọc/gõ lại. Không phải số 9 chữ ⇒ trả nguyên, không bịa dạng.
  function fmtNum(s){s=String(s||'');return /^[0-9]{9}$/.test(s)?(s.slice(0,3)+' '+s.slice(3,6)+' '+s.slice(6)):s;}
  function renderChannel(c){
    if(!c)return;
    zset('p2pBlocks',zN(c.blocks||0));
    // Nói cổng ĐANG NGHE, không nói cổng đã khai: bật mà không nghe được (cổng bận, chưa ghép
    // đôi ai) là ca có thật, và bề mặt phải phân biệt được hai thứ đó.
    zset('p2pPort', c.listening ? String(c.listening) : (c.enabled ? t('p2p.notListening') : String(c.port||'—')));
    var seen=(c.seen||[]);
    zset('p2pSeen', seen.length ? seen.map(function(s){return (s.deviceId||'').slice(0,11)+'… · '+s.host;}).join(' · ') : t('p2p.seenNone'));
    // MỘT CỤM, chép MỘT LẦN — user chốt 2026-09-16: *"chép thì để vào 1 cụm để chép chung chứ ai
    // tách ra ntn"*. Tách mỗi địa chỉ một ô thì người ta phải chép hai lần rồi tự ghép, mà thứ cần
    // gửi sang máy kia là CẢ DANH SÁCH (máy này có hai card, bên đó chỉ tới được một dải).
    var ab=zid('p2pAddrs');
    if(ab){
      var ads=c.addrs||[];
      var port=c.listening||c.port||'';
      var text=ads.map(function(a){return a.addr+':'+port+'  ·  '+a.iface;}).join(String.fromCharCode(10));
      ab.textContent=text||t('p2p.addrNone');
      if(text){ab.setAttribute('data-copy',text);ab.setAttribute('title',t('p2p.addrCopy'));ab.style.cursor='pointer';}
    }
    // Máy thấy trên cùng mạng: BẤM LÀ ĐIỀN cả ID lẫn địa chỉ vào ô ghép đôi/nối thử. Gõ tay một
    // chuỗi 52 ký tự là chỗ sinh lỗi, mà tầng dò đã biết sẵn cả hai giá trị.
    var sb=zid('addPeerSeen');
    if(sb){
      sb.innerHTML='';
      seen.forEach(function(sp){
        var el=document.createElement('div');el.className='fchip';
        el.textContent='↳ '+(sp.deviceId||'').slice(0,11)+'… @ '+sp.host+':'+sp.port;
        el.setAttribute('data-seenfill',(sp.deviceId||'')+'|'+sp.host+'|'+sp.port);
        el.setAttribute('title',t('p2p.seenFill'));
        sb.appendChild(el);
      });
    }
    var dv=zid('p2pDir'); if(dv&&c.dir){dv.textContent=c.dir;dv.setAttribute('data-copy',c.dir);dv.setAttribute('title',t('p2p.addrCopy'));dv.classList.add('fchip');dv.style.cursor='pointer';}
    // SỐ MÁY là thứ trưng ra; vân tay lùi vào mục nâng cao. Backend tính số (băm ở đó), bề mặt
    // chỉ hiển thị — không có chuyện hai nơi cùng tính rồi lệch nhau.
    var idIn=zid('p2pMyId');if(idIn&&document.activeElement!==idIn)idIn.value=fmtNum(c.shortId||'');
    var fid=zid('p2pFullId');
    if(fid&&c.deviceId){fid.textContent=c.deviceId;fid.setAttribute('data-copy',c.deviceId);fid.setAttribute('title',t('p2p.addrCopy'));fid.style.cursor='pointer';}
    var tg=zid('p2pToggle');if(tg)tg.classList.toggle('on',!!c.enabled);
    var a=zid('trDrive'),b=zid('trP2p');
    if(a)a.classList.toggle('on',c.transport!=='p2p');
    if(b)b.classList.toggle('on',c.transport==='p2p');
    // CỤM MÁY — mỗi máy MỘT THẺ, máy này đứng đầu. Bản cũ là một danh sách chuỗi 52 ký tự trần:
    // không nói được máy nào đang thấy được, địa chỉ bao nhiêu, gặp lần cuối lúc nào.
    var cl=zid('p2pCluster');
    if(cl){
      var seenBy={};
      seen.forEach(function(sp){ seenBy[sp.deviceId]=sp; });
      var cards=[];
      cards.push({me:true,name:c.hostName||'',id:c.deviceId||'',num:c.shortId||'',addr:(c.addrs||[]).map(function(a){return a.addr;}).join(' · '),port:c.listening||c.port});
      (c.peers||[]).forEach(function(id,i){
        var sp=seenBy[id];
        cards.push({me:false,name:sp&&sp.name?sp.name:'',id:id,num:(c.peersShort||[])[i]||'',addr:sp?sp.host:'',port:sp?sp.port:'',at:sp?sp.seenAt:''});
      });
      zset('p2pClusterN', t('p2p.clusterN').replace('{n}', String(cards.length)));
      cl.innerHTML='';
      cards.forEach(function(m){
        var d=document.createElement('div');
        d.style.cssText='border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface-2)';
        // TÊN MÁY trước, trạng thái sau. Chưa biết tên (bản dò đời cũ không gửi) ⇒ rơi về SỐ MÁY,
        // không phải một lát 11 ký tự của vân tay: lát đó vừa không đọc được vừa không gõ lại được.
        var label=m.name||(m.num?fmtNum(m.num):'?');
        var state=m.me?t('p2p.thisMachine'):(m.addr?t('p2p.online'):t('p2p.offline'));
        var dot=m.me?'var(--primary)':(m.addr?'var(--success)':'var(--text-faint)');
        d.innerHTML='<div style="display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700">'
          +'<span style="width:7px;height:7px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>'+stdEsc(label)
          +'<span class="muted" style="font-size:10.5px;font-weight:400;margin-left:auto">'+stdEsc(state)+'</span></div>'
          // Chưa biết tên thì NHÃN đã là số máy rồi — in lại lần nữa là một con số ở hai chỗ trên
          // cùng một thẻ, đọc ra như thẻ bị lỗi. Có tên mới cần dòng số bên dưới.
          +(m.name?'<div class="muted" style="font-size:11px;font-family:var(--mono,monospace);margin-top:5px;letter-spacing:1px" title="'+stdEsc(m.id)+'">'+stdEsc(fmtNum(m.num))+'</div>':'')
          +'<div class="muted" style="font-size:10.5px;margin-top:4px">'+stdEsc(m.addr?(m.addr+(m.port?(':'+m.port):'')):t('p2p.noAddr'))+'</div>';
        if(!m.me){
          var x=document.createElement('button');x.className='btn sm';x.style.marginTop='7px';
          x.textContent=t('p2p.unpair');x.setAttribute('data-act','p2p-unpair');x.setAttribute('data-id',m.id);
          d.appendChild(x);
        }
        cl.appendChild(d);
      });
    }
  }
  function loadChannel(){return zGet('/channel-status').then(renderChannel).catch(function(){});}
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
      if(pe&&r&&r.file){pe.textContent=r.file;pe.setAttribute('data-copy',r.file);pe.setAttribute('title',t('p2p.addrCopy'));pe.classList.add('fchip');pe.style.cursor='pointer';}
    }).catch(function(){ if(box)box.textContent=t('p2p.logErr'); });
  }
  // Chỉ chạy nhịp khi tab p2p ĐANG MỞ — hỏi log mỗi 5 giây trong lúc không ai nhìn là đốt I/O suông.
  function logTick(on){
    if(logTimer){clearInterval(logTimer);logTimer=null;}
    // 15s, KHÔNG ngắn hơn: cổng `no short-interval polling` chốt sàn đó. Không mất gì thật —
    // nhịp dò LAN vốn 30s/lần, nên log không có gì mới để hiện nhanh hơn thế.
    if(on){loadLog();logTimer=setInterval(loadLog,15000);}
  }
  window.zP2pLogTick=logTick;

  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-act],[data-tr],[data-copy],[data-seenfill],#p2pLogOnly,#p2pLogHold,#driveToggle'):null;
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
      try{navigator.clipboard.writeText(cp);p2pMsg(t('p2p.copiedAddr').replace('{a}',cp));}catch(_){}
      return;
    }
    // Bấm một máy đã thấy ⇒ điền sẵn ID + địa chỉ + cổng. Gõ tay chuỗi 52 ký tự là chỗ sinh lỗi.
    var sf=el.getAttribute('data-seenfill');
    if(sf){
      var parts=sf.split('|');
      var i1=zid('p2pPeerIn'),i2=zid('p2pHost'),i3=zid('p2pPortIn');
      if(i1)i1.value=parts[0]||'';
      if(i2)i2.value=parts[1]||'';
      if(i3)i3.value=parts[2]||'';
      p2pMsg(t('p2p.filled'));
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
    // Công tắc kênh Drive. TẮT = bỏ liên kết (kho trên máy không bị đụng). BẬT mà chưa có thư mục
    // thì KHÔNG đoán đường nào cả — đưa con trỏ vào ô thư mục, vì chọn sai chỗ là đẩy kho đi nơi khác.
    if(el.id==='driveToggle'){
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
      // GỠ LINK — giữ đường vừa gỡ lại trong ô nhập. Không giữ thì `/set-drive?path=` xoá sạch
      // đường trong config và người dùng phải đi tìm lại nó để bật lại: một cú bấm gỡ hoá ra
      // yêu cầu họ nhớ một đường dẫn mà chính app vừa quên.
      var keep=(Z.mem&&Z.mem.drive&&Z.mem.drive.path)||'';
      zSave('/set-drive?path=').then(function(j){
        if(!j)return;
        el.classList.remove('on');
        var di2=zid('driveInput'); if(di2&&keep&&!di2.value.trim())di2.value=keep;
        zset('driveState',driveMsg(j));
        zGet('/memory-status?fresh=1').then(renderMem).catch(function(){});
      });
      return;
    }
    if(act==='p2p-add-open'){ var ap=zid('addPeerDlg'); if(ap)ap.classList.add('on'); loadChannel(); return; }
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
        if(r&&r.ok===false){
          // Câu lỗi phải CHỈ ĐƯỜNG. "khong-thay" nghĩa là số đúng dạng nhưng chưa máy nào mang
          // số đó phát trên mạng này — người dùng cần biết đó là chuyện MẠNG, không phải gõ sai.
          var why=r.error==='khong-thay'?t('p2p.numNotSeen'):(r.error==='trung-so'?t('p2p.numDup'):('✗ '+(r.error||'')));
          p2pMsg(why);return;
        }
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
    if (!data.items.length) { box.innerHTML = '<div class="muted" style="padding:14px">' + t('files.empty') + '</div>'; return; }
    var html = '', cur = null;
    data.items.forEach(function (f) {
      var m = month(f.at);
      if (m !== cur) { if (cur !== null) html += '</div>'; html += '<div class="fmonth">' + esc(m) + '</div><div class="fgrid">'; cur = m; }
      html += tile(f);
    });
    html += '</div>';
    box.innerHTML = html;
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
  function renderMachineInfo(){
    var bd=zid('mDisks'), bs=zid('mStores');
    if(!bd&&!bs)return;
    zGet('/machine-info').then(function(d){
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
              return '<div class="mstore" data-copypath="'+stdEsc(x.root)+'" title="'+stdEsc(t('mem.storeCopy'))+'">'
                +'<span class="src">'+stdEsc(x.source||'—')+'</span><span class="pth">'+stdEsc(x.root||'')+'</span></div>';
            }).join('')
          : '<div class="muted" style="font-size:11.5px">'+stdEsc(t('mem.storesNone'))+'</div>';
      }
    }).catch(function(){
      if(bd)bd.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(t('ph.err'))+'</div>';
    });
  }
  // Bấm một đường dẫn = chép. Đường dẫn dài thì không ai gõ lại được, mà đây đúng là thứ người ta
  // cần dán sang Explorer hoặc terminal.
  document.addEventListener('click',function(e){
    var r=e.target.closest?e.target.closest('[data-copypath]'):null;if(!r)return;
    var p=r.getAttribute('data-copypath')||'';
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(p);
    var old=r.querySelector('.src').textContent;
    r.querySelector('.src').textContent=t('mem.copied');
    setTimeout(function(){r.querySelector('.src').textContent=old;},1200);
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
        box.innerHTML='<div class="muted" style="font-size:11.5px">'+stdEsc(dv.linked&&spaceTries<8?t('drv.spaceProbing'):t('drv.spaceNone'))+'</div>';
        // Đã link mà chưa có số ⇒ probe đang chạy, hỏi lại. Chưa link thì KHÔNG hỏi lại: không có
        // gì để đo, hẹn nữa chỉ là gõ cửa một căn phòng trống.
        if(dv.linked&&spaceTries<8){spaceTries++;if(spaceTimer)clearTimeout(spaceTimer);spaceTimer=setTimeout(renderDriveSpace,5000);}
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
      zset('capSub',t('drv.spaceUsedOf').replace('{u}',gb(used)).replace('{t}',gb(v.total)));
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
