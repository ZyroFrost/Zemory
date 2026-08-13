// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ── Sources: DELTA sau mỗi lần quét ────────────────────────────────────────
  // Ba panel Máy này · Sources · Drive nằm cạnh nhau vì chúng LIÊN QUAN NHAU (user
  // 2026-07-27). Chỉ hiện tổng mới thì không đối chiếu được: "+20 tin mới" ở panel quét
  // phải BẰNG tổng các +N ở đây, và bằng số Drive đang thiếu. Có +N trên từng lane thì
  // user tự kiểm chéo được ba panel bằng mắt, không phải tin lời app.
  // Khoá lane = origin/host/source (không dùng nhãn — nhãn có thể trùng giữa hai máy).
  var zScopeCount={},zScopeDelta={};
  function scopeKey(n){var l=n.lane||{};return [l.origin||'',l.host||'',l.source||''].join('|')||('#'+(n.label||''));}
  function scopeSnapshot(nodes){
    var m={};(function walk(list){(list||[]).forEach(function(n){m[scopeKey(n)]=Number(n.messages)||0;walk(n.children);});})(nodes);
    return m;
  }
  /** Chốt mốc TRƯỚC khi quét; delta tính khi cây mới về. */
  function scopeMark(){zScopeDelta={};}
  function scopeDiff(nodes){
    var now=scopeSnapshot(nodes),d={};
    for(var k in now){var was=zScopeCount[k];if(was!=null&&now[k]>was)d[k]=now[k]-was;}
    zScopeCount=now;
    // Giữ delta cũ nếu lần này không đổi gì — để user còn kịp nhìn con số vừa quét.
    if(Object.keys(d).length)zScopeDelta=d;
    return zScopeDelta;
  }
  function renderScope(nodes){
    if(!nodes||!nodes.length)return '<div class="muted">none</div>';
    var dl=scopeDiff(nodes);
    function walk(n,dep){
      var checked=!n.effectiveExcluded,dis=n.effectiveExcluded&&!n.excluded;
      var dv=dl[scopeKey(n)],badge=dv?'<span class="scope-d" title="'+stdEsc(t('scope.justScanned'))+'">+'+zN(dv)+'</span>':'';
      // Nguồn zemory HỖ TRỢ nhưng chưa nạp gì: vẫn hiện, nói rõ là chưa có dữ liệu và
      // chỉ luôn lệnh nạp. Ẩn đi thì thành vòng luẩn quẩn — muốn có dữ liệu phải tick,
      // muốn tick phải có dữ liệu (user 2026-07-27).
      if(n.empty)badge='<span class="scope-e" title="'+stdEsc(t('scope.howTo'))+'">'+stdEsc(t('scope.noData'))+'</span>';
      var h='<div class="set-row" style="padding:5px 0 5px '+(dep*14+2)+'px;border:0"><span class="nm" style="font-size:12px"><input type="checkbox" class="zscope"'+(checked?' checked':'')+(dis?' disabled':'')+' data-lane="'+stdEsc(JSON.stringify(n.lane||{}))+'" style="margin-right:7px;vertical-align:-2px"> '+stdEsc(n.label)+'</span><span class="scope-n">'+badge+'<span class="muted">'+zN(n.messages)+'</span></span></div>';
      (n.children||[]).forEach(function(c){h+=walk(c,dep+1);});return h;
    }
    return nodes.map(function(n){return walk(n,0);}).join('');
  }
  document.addEventListener('change',function(e){
    var c=e.target.closest?e.target.closest('.zscope'):null;if(!c)return;
    var lane={};try{lane=JSON.parse(c.getAttribute('data-lane')||'{}');}catch(x){}
    var q=new URLSearchParams();if(lane.origin)q.set('origin',lane.origin);if(lane.host)q.set('host',lane.host);if(lane.source)q.set('source',lane.source);q.set('on',c.checked?'0':'1');
    fetch('/set-scope-exclude?'+q.toString(),{method:'POST'}).then(function(){zGet('/memory-status?fresh=1').then(renderMem);});
  });
  function renderHomeProjects(cap){
    var box=zid('homeProjects');if(!box)return;
    var linked=new Set(((Z.status&&Z.status.knownProjects)||[]).map(function(k){return String(k.root||'').toLowerCase();}));
    var ps=(cap.projects||[]).filter(function(p){return p.host===cap.localHost&&linked.has(String(p.path).toLowerCase());}).slice(0,6);
    if(!ps.length){box.innerHTML='<div class="muted">'+t('home.noProjects')+'</div>';return;}
    box.innerHTML=ps.map(function(p){var pbi=p.profile==='non-app';return '<div class="row" data-open-proj="'+stdEsc(p.path)+'" style="cursor:pointer"><div class="l"><div class="ico">'+stdEsc((((zProjName(p.path)||'?')+'').charAt(0)||'?').toUpperCase())+'</div><div><div class="nm">'+stdEsc(zProjName(p.path))+'</div><div class="meta">'+(pbi?'Non-app':'App')+' · '+zN(p.sessions)+' sessions · '+zN(p.messages)+' msg</div></div></div><span class="meta">'+(p.last?String(p.last).slice(0,10):'')+'</span></div>';}).join('');
  }
  function renderProjGrid(cap){
    var box=zid('projGrid');if(!box)return;
    var linked=new Set(((Z.status&&Z.status.knownProjects)||[]).map(function(k){return String(k.root||'').toLowerCase();}));
    var pinMap={};((Z.status&&Z.status.knownProjects)||[]).forEach(function(k){pinMap[String(k.root||'').toLowerCase()]=k;});
    var all=(cap.projects||[]).filter(function(p){return p.host===cap.localHost&&linked.has(String(p.path).toLowerCase());});
    var appN=all.filter(function(p){return p.profile!=='non-app';}).length,nonN=all.length-appN;
    // Filter: search text (name OR path) + type (App/Non-app). Sort picker below.
    var q=(zid('pjSearch')&&zid('pjSearch').value.trim().toLowerCase())||'';
    var ty=(zid('pjType')&&zid('pjType').value)||'';
    var so=(zid('pjSort')&&zid('pjSort').value)||'manual';
    var ps=all.filter(function(p){var pbi=p.profile==='non-app';
      if(ty==='app'&&pbi)return false;if(ty==='non'&&!pbi)return false;
      if(q&&zProjName(p.path).toLowerCase().indexOf(q)<0&&String(p.path).toLowerCase().indexOf(q)<0)return false;
      return true;});
    zset('projCount',((q||ty)?(ps.length+'/'+all.length):all.length)+' '+t('proj.count')+' · '+appN+' App · '+nonN+' Non-app ('+t('proj.thisMachine')+')');
    if(!all.length){box.innerHTML='<div class="muted">'+t('proj.noneLinked')+'</div>';return;}
    if(!ps.length){box.innerHTML='<div class="muted">'+t('proj.noMatch')+'</div>';return;}
    // Đã ghim luôn lên đầu; trong nhóm: 'manual' = thứ tự kéo-thả (localStorage),
    // còn lại theo tiêu chí đã chọn (tên · nhiều phiên · mới cập nhật).
    var ord=[];try{ord=JSON.parse(localStorage.getItem('zProjOrder')||'[]');}catch(_){}
    function oi(p){var i=ord.indexOf(String(p.path).toLowerCase());return i<0?1e9:i;}
    ps.sort(function(a,b){var pa=!!(pinMap[String(a.path).toLowerCase()]||{}).pinned,pb=!!(pinMap[String(b.path).toLowerCase()]||{}).pinned;if(pa!==pb)return pa?-1:1;
      if(so==='name')return zProjName(a.path).localeCompare(zProjName(b.path));
      if(so==='sessions')return (b.sessions||0)-(a.sessions||0);
      if(so==='recent')return String(b.last||'').localeCompare(String(a.last||''));
      return oi(a)-oi(b);});
    box.innerHTML=ps.map(function(p){
      var km=pinMap[String(p.path).toLowerCase()]||{},pinned=!!km.pinned,root=km.root||p.path,pbi=p.profile==='non-app';
      return '<div class="proj-card'+(pinned?' pinned':'')+'" draggable="'+(so==='manual'?'true':'false')+'" data-prof="'+(p.profile||'')+'" data-open-proj="'+stdEsc(p.path)+'">'
        +'<div class="ph"><div class="pi">'+stdEsc((((zProjName(p.path)||'?')+'').charAt(0)||'?').toUpperCase())+'</div>'
        +'<div style="flex:1;min-width:0"><div class="nm">'+stdEsc(zProjName(p.path))+'</div><div class="muted" style="font-size:11px">'+zN(p.sessions)+' sessions</div></div>'
        +(p.profile?'<span class="ptype '+(pbi?'is-non':'is-app')+'">'+(pbi?'NON-APP':'APP')+'</span>':'')
        +'<div class="acts"><button class="'+(pinned?'on':'')+'" data-pin data-root="'+stdEsc(root)+'" data-on="'+(pinned?'0':'1')+'" title="'+t('src.pin')+'">📌</button><button data-forget data-root="'+stdEsc(root)+'" title="'+t('src.remove')+'">✕</button></div></div>'
        +'<div class="pmeta"><span>'+zN(p.messages)+' msg</span><span>'+zN(p.agents)+' agents</span><span>'+t('src.updated')+(p.last?String(p.last).slice(0,10):'—')+'</span></div></div>';
    }).join('');
  }
  document.addEventListener('click',function(e){
    if(!e.target.closest)return;
    var pin=e.target.closest('[data-pin]'),fg=e.target.closest('[data-forget]');
    if(pin){e.stopPropagation();zPost('/pin-project?root='+encodeURIComponent(pin.dataset.root)+'&on='+pin.dataset.on).then(function(r){if(r&&r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;zGet('/memory-status').then(renderMem);});return;}
    if(fg){e.stopPropagation();var fr=fg.dataset.root;zConfirm({title:t('rm.title'),body:t('rm.body')+'\n'+fr,okLabel:t('rm.ok'),danger:true,onOk:function(){zPost('/forget-project?root='+encodeURIComponent(fr)).then(function(r){if(r&&r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;zGet('/memory-status').then(renderMem);});}});return;}
    var op=e.target.closest('[data-open-proj]');if(op&&!op.closest('.proj-card')){go('projects');}
  });
  // Kéo-thả đổi thứ tự card project (trong nhóm; card đã ghim luôn đứng trước).
  var zdrag=null;
  function pcard(e){return e.target.closest?e.target.closest('#projGrid .proj-card'):null;}
  document.addEventListener('dragstart',function(e){var c=pcard(e);if(!c)return;zdrag=String(c.dataset.openProj);c.classList.add('dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',zdrag);}catch(_){}});
  document.addEventListener('dragend',function(){zdrag=null;document.querySelectorAll('#projGrid .proj-card').forEach(function(x){x.classList.remove('dragging','dropzone');});});
  document.addEventListener('dragover',function(e){if(!zdrag)return;var c=pcard(e);if(!c)return;e.preventDefault();});
  document.addEventListener('dragenter',function(e){if(!zdrag)return;var c=pcard(e);if(c&&String(c.dataset.openProj)!==zdrag)c.classList.add('dropzone');});
  document.addEventListener('dragleave',function(e){var c=pcard(e);if(c)c.classList.remove('dropzone');});
  document.addEventListener('drop',function(e){if(!zdrag)return;var c=pcard(e);if(!c)return;e.preventDefault();var tgt=String(c.dataset.openProj),src=zdrag;zdrag=null;if(tgt===src)return;
    var seq=[].slice.call(document.querySelectorAll('#projGrid .proj-card')).map(function(x){return String(x.dataset.openProj);}).filter(function(x){return x!==src;});
    seq.splice(seq.indexOf(tgt),0,src);
    localStorage.setItem('zProjOrder',JSON.stringify(seq.map(function(x){return x.toLowerCase();})));
    renderProjGrid((Z.mem&&Z.mem.coverage)||{});
  });
  // Projects filter/search/sort — re-render the grid live; type+sort persisted.
  function pjRerender(){renderProjGrid((Z.mem&&Z.mem.coverage)||{});}
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='pjSearch')pjRerender();});
  document.addEventListener('change',function(e){if(e.target&&(e.target.id==='pjType'||e.target.id==='pjSort')){try{localStorage.setItem('zemory.'+e.target.id,e.target.value);}catch(_){}pjRerender();}});
  (function(){try{var pt=localStorage.getItem('zemory.pjType');if(pt&&zid('pjType'))zid('pjType').value=pt;var pss=localStorage.getItem('zemory.pjSort');if(pss&&zid('pjSort'))zid('pjSort').value=pss;}catch(_){}})();
  /** Bật/tắt trạng thái ĐANG CHẠY (chấm xoay) cho một dòng trạng thái — dùng chung cho
   *  cả Quét lẫn Đồng bộ, một cơ chế, không mỗi chỗ một kiểu. */
  function zrun(id,on){var e=zid(id);if(e)e.classList.toggle('run',!!on);}
  function renderStatus(s){Z.status=s||{};}
  // ── Kèm web chat: tóm tắt + HỎI ĐĂNG NHẬP ──────────────────────────────────
  // Quét web chạy KHÔNG tương tác ở phía server (giữ request HTTP mở để chờ người dùng
  // đăng nhập là treo daemon), nên server chỉ MỞ cửa sổ đăng nhập rồi trả 'need-login'.
  // Nền nào đứt thì hiện ở bảng LIÊN KẾT bên dưới Sources, KHÔNG nhảy hộp thoại ra hỏi.
  function webTail(rows){
    if(!rows||!rows.length)return '';
    var got=0;
    rows.forEach(function(w){got+=(w.pulled||0);});
    return ' · '+t('scan.web').replace('{n}',zN(got));
  }
  /**
   * Câu giải thích của một dòng Liên kết, ghép TẠI ĐÂY theo ngôn ngữ đang bật.
   *
   * Backend gửi kèm `detailCode`+`detailArgs` (mã + tham số) BÊN CẠNH `detail` — vì `detail` là
   * câu tiếng Việt đã ghép sẵn ở server, bật `lang=en` thì bảng này vẫn ra tiếng Việt. Có mã thì
   * dùng mã; không có (server cũ) thì rơi về `detail` y như trước, nên không vỡ gì.
   */
  function connDetail(r){
    if(!r||!r.detailCode)return r&&r.detail||'';
    var a=r.detailArgs||{};
    if(r.detailCode==='neverChecked')return t('conn.unknown');
    if(r.detailCode==='storePath')return a.path||'';
    if(r.detailCode==='storeGone')return t('conn.storeGone').replace('{path}',a.path||'');
    if(r.detailCode==='noStore')return t('conn.noStore');
    if(r.detailCode==='lastChecked'){
      // Dùng chính relTime() của trang chủ ⇒ "7 giờ trước"/"7 h ago" đổi theo ngôn ngữ, và
      // KHÔNG đẻ thêm một cách tính thời gian tương đối thứ hai.
      var when=a.at?relTime(a.at).big:'';
      return t('conn.lastChecked').replace('{ago}',when)+(a.who?' · '+a.who:'');
    }
    return r.detail||'';
  }
  /** Bảng LIÊN KẾT dưới Sources. Thay cho hộp thoại tự nhảy giữa lúc quét — trạng thái
   *  được TRƯNG ra để nhìn, và người dùng bấm nối lại khi họ muốn, không bị hỏi ngang. */
  function renderConn(d){
    var el=zid('mConn');if(!el)return;
    var rows=(d&&d.rows)||[];
    if(!rows.length){el.innerHTML='<div class="muted">'+t('conn.none')+'</div>';return;}
    el.innerHTML=rows.map(function(r){
      var mark=r.connected?'<span class="conn-ok">✓</span>':(r.unknown?'<span class="conn-unk">•</span>':'<span class="conn-bad">⚠</span>');
      var note=r.connected?t('conn.on'):(r.unknown?t('conn.unknown'):t('conn.off'));
      var btn=(!r.connected&&r.kind==='web')
        ? '<button class="btn sm" data-conn="'+stdEsc(r.platform||'')+'" data-acct="'+stdEsc(r.account||'main')+'">'+t(r.canBorrow?'conn.borrow':'conn.link')+'</button>'
        : '';
      var add=(r.kind==='web'&&(r.account||'main')==='main')?'<button class="btn sm" data-addacct="'+stdEsc(r.platform||'')+'" title="'+t('conn.addAcctTip')+'">＋</button>':'';
      return '<div class="set-row" style="padding:6px 0;border:0"><span class="nm" style="font-size:12px">'+mark+' '+stdEsc(r.label)
        +'<small class="muted" style="display:block">'+stdEsc(note+(connDetail(r)?' · '+connDetail(r):''))+'</small></span>'
        +'<span class="scope-n"><span class="muted">'+zN(r.messages||0)+'</span> '+btn+'</span></div>';
    }).join('');
  }
  function loadConn(){return zGet('/connections').then(renderConn).catch(function(){});}
  // Sau khi bấm Liên kết, cửa sổ đăng nhập mở ra — và người dùng đăng nhập xong thì
  // KHÔNG có ai kiểm lại, bảng đứng nguyên ở ⚠. Nên ở đây CHỜ: hỏi lại mỗi 5s (phép hỏi
  // rẻ, không mở thêm cửa sổ) tối đa 3 phút, thấy đăng nhập được là tự kéo luôn.
  var connWait=null;
  /** Chờ MỌI nền còn đứt, không riêng nền vừa bấm: người dùng có thể đăng nhập ở cửa sổ
   *  nền khác đang mở sẵn — trước đây hàng đó đứng nguyên ⚠ dù đã đăng nhập xong. */
  function connPoll(left){
    if(left<=0)return;
    connWait=setTimeout(function(){
      zGet('/connections').then(function(d){
        renderConn(d);
        var pend=(d&&d.rows||[]).filter(function(x){return x.kind==='web'&&!x.connected;});
        var fresh=(d&&d.rows||[]).filter(function(x){return x.kind==='web'&&x.connected&&connPending[x.platform];});
        fresh.forEach(function(x){
          delete connPending[x.platform];
          zPost('/connect?platform='+encodeURIComponent(x.platform)).then(function(r){
            renderConn(r);zGet('/memory-status?fresh=1').then(renderMem);zToast(t('conn.done').replace('{p}',x.platform));});
        });
        if(pend.length)connPoll(left-1);
      }).catch(function(){connPoll(left-1);});
    },5000);
  }
  var connPending={};
  // Thêm TÀI KHOẢN cho một nền: mở profile mới để đăng nhập tài khoản khác, KHÔNG đụng
  // tài khoản đang có. Hội thoại nằm theo tài khoản, nên đây là đường duy nhất lấy được
  // hội thoại của tài khoản thứ hai mà không phải đăng xuất cái thứ nhất.
  document.addEventListener('click',function(e){
    var a=e.target.closest?e.target.closest('[data-addacct]'):null;if(!a)return;
    var p=a.dataset.addacct,o=a.textContent;
    a.textContent='…';a.disabled=true;
    zPost('/add-account?platform='+encodeURIComponent(p)).then(function(r){
      renderConn(r);
      if(r&&r.ok===false){zToast('✗ '+(r.error||''));return;}
      zToast(t('conn.acctAdded').replace('{n}',(r&&r.account)||'?'));
      connPending[p]=true;connPoll(36);
    }).catch(function(){a.textContent=o;a.disabled=false;});
  });
  document.addEventListener('click',function(e){
    var c=e.target.closest?e.target.closest('[data-conn]'):null;if(!c)return;
    var p=c.dataset.conn,acct=c.dataset.acct||'main';
    if(connWait)clearTimeout(connWait);
    c.textContent=t('conn.linking');c.disabled=true;
    zPost('/connect?platform='+encodeURIComponent(p)+'&account='+encodeURIComponent(acct)).then(function(r){
      renderConn(r);
      if(r&&r.ok===false)zToast('✗ '+(r.error||''));
      zGet('/memory-status?fresh=1').then(renderMem);
      var row=(r&&r.rows||[]).filter(function(x){return x.platform===p;})[0];
      if(row&&!row.connected){
        // Vẫn chưa vào được ⇒ cửa sổ đăng nhập đang mở, bắt đầu chờ.
        var b=document.querySelector('[data-conn="'+p+'"]');
        if(b){b.textContent=t('conn.waiting');b.disabled=true;}
        connPoll(p,36);
      }
    }).catch(function(){loadConn();});
  });
  function setTog(name,on){document.querySelectorAll('[data-auto="'+name+'"]').forEach(function(t){t.classList.toggle('on',!!on);});}
  // `realtime` hiện theo SỰ THẬT (`realtimeWired` = hook có trong settings của host) chứ không
  // theo cờ config: hai thứ lệch được (user sửa tay settings.json, hoặc máy chưa cài Claude
  // Code), và một công tắc sáng đèn trong khi không có gì chạy là lời hứa suông.
  function renderAuto(a){Z.auto=a=a||{};setTog('scheduler',a.scheduler);setTog('realtime',a.realtime&&a.realtimeWired!==false);setTog('autostart',a.autostart);setTog('autosync',a.autosync);setTog('shortcut',a.shortcut&&a.shortcut.exists);
    // Ngưỡng nhắc context — chỉ đổ giá trị khi user KHÔNG đang gõ dở (renderAuto chạy lại
    // sau mỗi lần bật/tắt công tắc khác; đè lên ô đang focus là nuốt mất số người ta gõ).
    var cw=zid('ctxWarnPct');if(cw&&document.activeElement!==cw&&a.contextWarnPercent)cw.value=a.contextWarnPercent;}
  // Đổi ngưỡng: gửi khi rời ô/Enter (change), KHÔNG gửi từng phím. Server kẹp [50,99] và
  // trả giá trị đã kẹp — đổ ngược lại ô để user thấy số THẬT được lưu, không phải số vừa gõ.
  document.addEventListener('change',function(e){
    if(!e.target||e.target.id!=='ctxWarnPct')return;
    var v=parseInt(e.target.value,10);if(isNaN(v)){zGet('/automation').then(renderAuto);return;}
    zPost('/set-context-warn?percent='+v).then(function(r){if(r&&r.contextWarnPercent)e.target.value=r.contextWarnPercent;zToast(t('mem.ctxWarnSaved'));}).catch(function(){});
  });
  // Một BẢNG, không phải chuỗi if lồng nhau: thêm công tắc mới = thêm một dòng dữ liệu.
  var AUTO_URL={scheduler:'/set-scheduler',realtime:'/set-realtime',autostart:'/set-autostart',autosync:'/set-autosync',shortcut:'/set-shortcut'};
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('[data-auto]'):null;if(!t)return;
    var name=t.dataset.auto,on=!t.classList.contains('on');
    var url=AUTO_URL[name];
    if(!url)return;setTog(name,on);zPost(url+'?on='+(on?1:0)).then(function(){zGet('/automation').then(renderAuto);});
  });
  document.addEventListener('click',function(e){
    var lg=e.target.closest?e.target.closest('[data-lang]'):null;
    if(lg){applyI18n(lg.dataset.lang);zPost('/set-lang?lang='+lg.dataset.lang).then(function(){zGet('/memory-status?fresh=1').then(renderMem);});return;}
    var lv=e.target.closest?e.target.closest('[data-lvl]'):null;
    if(lv){
      // 'att' là CÔNG TẮC độc lập (bật/tắt kèm ảnh), không phải mức thứ ba của Gọn/Đầy đủ.
      if(lv.dataset.lvl==='att'){var on=!lv.classList.contains('on');lv.classList.toggle('on',on);zPost('/set-sync-attachments?on='+(on?1:0));return;}
      setLvl(lv.dataset.lvl);zPost('/set-sync-level?level='+lv.dataset.lvl);return;
    }
    var a=e.target.closest?e.target.closest('[data-act]'):null;if(!a)return;
    var act=a.dataset.act;
    if(act==='scan'||act==='deepscan'){
      var sm=zid('scanMsg');if(sm){sm.className='scanmsg run';sm.textContent=t('scan.running');}
      scopeMark();
      zPost('/memory-scan'+(act==='deepscan'?'?deep=1':'')).then(function(r){
        var n=(r&&r.totals&&r.totals.newMessages)||0,f=(r&&r.changedFiles)||0;
        // Màu theo KẾT QUẢ (user 2026-07-27: chữ xám nhạt nhìn không ra): có tin mới = nổi
        // bật, không có = im lặng. Số 0 mà tô nổi thì lần sau không ai để ý nữa.
        if(sm){sm.className='scanmsg '+(n?'hit':'none');
          sm.textContent=(n?t('scan.found').replace('{n}',zN(n)).replace('{f}',zN(f)):t('scan.none'))+webTail(r&&r.web);}
        // NHỊP NHANH trước: Drive + Sources phải nhảy số NGAY khi quét xong (3 panel này
        // nằm cạnh nhau vì liên quan nhau). Gói /memory-status nặng hơn nhiều nên chạy sau
        // và chỉ để làm tươi phần còn lại — không bắt user chờ nó mới thấy Drive thiếu.
        syncPulse();
        zGet('/memory-status?fresh=1').then(renderMem);
        loadConn(); // trạng thái liên kết đổi sau mỗi lần quét — làm tươi bảng, KHÔNG hỏi ngang
      });}
    else if(act==='drivelink'){var p=zid('driveInput').value.trim();zset('driveState','…');zPost('/set-drive?path='+encodeURIComponent(p)).then(function(d){zset('driveState',driveMsg(d));setLvl(d.level||'lean');var la=zid('lvAtt');if(la)la.classList.toggle('on',!!d.atts);});}
    else if(act==='drivesync'){zrun('driveState',true);zset('driveState',t('drv.syncingBg'));zPost('/drive-sync').then(function(r){if(r&&r.ok===false){zrun('driveState',false);zset('driveState','✗ '+(r.error||t('drv.err')));return;}pollSync();});}
    else if(act==='scanproj'||act==='deepscanproj'){zset('scanProjMsg',t('st.scanning'));zPost('/memory-scan'+(act==='deepscanproj'?'?deep=1':'')).then(function(r){zset('scanProjMsg','+'+zN(r&&r.totals&&r.totals.newMessages)+' msg · '+((r&&r.changedFiles)||0)+t('src.newFiles'));return zGet('/status');}).then(function(s){if(s)Z.status=s;return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){zset('scanProjMsg',t('st.scanErr'));});}
    // Tên phiên: backend ĐÃ đúng (custom-title của `/title` thắng + khoá, ai-title sau
    // không ghi đè — claude.ts / ingest.ts titleLocked). Thiếu là chỗ LÀM TƯƠI: app chỉ
    // thấy tên mới sau lần scan kế tiếp. Nút này quét lại rồi nạp lại danh sách ngay.
    else if(act==='sessrescan'){var sb=a,so=sb.textContent;sb.textContent='⏳';sb.disabled=true;
      zPost('/memory-scan').then(function(){return zGet('/memory-status?fresh=1').then(renderMem);})
        .then(function(){loadSessions();zToast(t('sess.rescanned'));})
        .catch(function(){zToast(t('q.err'));})
        .then(function(){sb.textContent=so;sb.disabled=false;});}
    // Dọn project mà folder không còn tồn tại. Thao tác GỠ khỏi danh sách ⇒ phải hỏi
    // trước (02_RULES: xoá/thu hẹp luôn cần xác nhận). Folder/docs/memory KHÔNG bị đụng.
    else if(act==='pruneproj'){
      zConfirm({title:t('prune.title'),body:t('prune.body'),okLabel:t('prune.ok'),onOk:function(){
        zset('scanProjMsg',t('prune.running'));
        zPost('/prune-projects').then(function(r){
          var n=(r&&(r.removed!=null?r.removed:(r.pruned!=null?r.pruned:0)))||0;
          zset('scanProjMsg',t('prune.done').replace('{n}',zN(n)));
          if(r&&r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;
          return zGet('/status').then(function(s){if(s)Z.status=s;return zGet('/memory-status?fresh=1').then(renderMem);});
        }).catch(function(){zset('scanProjMsg','✗ '+t('q.err'));});
      }});}
    else if(act==='addproj'){openAddProjDlg();}
    else if(act==='browse-drive'){gPickFolder('driveInput');}
    else if(act==='browse-reloc'){gPickFolder('relocInput');}
    else if(act==='relocate'){var rp=zid('relocInput').value.trim();if(!rp){zset('setMsg',t('reloc.needPath'));return;}
      zConfirm({title:t('reloc.title'),body:t('reloc.body')+'\n'+rp,okLabel:t('reloc.ok'),onOk:function(){zset('setMsg',t('reloc.moving'));zPost('/relocate?path='+encodeURIComponent(rp)).then(function(r){zset('setMsg',r&&r.ok?('✓ '+t('reloc.done')+(r.movedBytes?' · '+(r.movedBytes/1048576).toFixed(0)+' MB':'')):('✗ '+((r&&r.error)||t('q.err'))));zGet('/memory-status?fresh=1').then(renderMem);});}});}
    else if(act==='mbackup'){zset('drvMsg',t('bk.running'));zPost('/memory-backup').then(function(r){zset('drvMsg',r&&r.ok?('✓ '+t('bk.done')+' · '+((r.bytes/1048576).toFixed(1))+' MB → '+r.outPath):('✗ '+((r&&r.error)||t('q.err'))));});}
    else if(act==='mrestore'){zDialog({icon:'⬆',title:t('rs.title'),okLabel:t('rs.ok'),danger:true,focus:'#rsPath',
        bodyHtml:'<div class="muted" style="font-size:12px;margin-bottom:8px">'+t('rs.desc')+'</div><div style="display:flex;gap:6px"><input id="rsPath" class="zdi" placeholder="'+t('rs.ph')+'"><button class="btn sm" id="rsBrowse" style="flex:0 0 auto">📁</button></div>',
        onOk:function(){var bp=(zid('rsPath')&&zid('rsPath').value.trim())||'';if(!bp){zDlgMsg(t('rs.needPath'));return true;}
          zDlgMsg(t('rs.restoring'));zid('zDlgOk').disabled=true;
          zPost('/memory-restore?path='+encodeURIComponent(bp)).then(function(r){if(!r||r.ok===false){zDlgMsg('✗ '+((r&&r.error)||t('q.err')));zid('zDlgOk').disabled=false;return;}zDlgClose();zset('drvMsg','✓ '+t('rs.done')+' · '+(r.previousBackupPath||'—'));zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){zDlgMsg('✗ '+t('q.err'));zid('zDlgOk').disabled=false;});
          return true;}});}
    else if(act==='mforget'){var ksf=(Z.status&&Z.status.knownProjects)||[];
      if(!ksf.length){zConfirm({title:t('fg.title'),body:t('fg.noProj'),okLabel:'OK',onOk:function(){}});return;}
      var fo=ksf.map(function(k){return '<option value="'+stdEsc(k.root)+'">'+stdEsc(zProjName(k.root))+'</option>';}).join('');
      zDialog({icon:'🗑',title:t('fg.title'),okLabel:t('fg.preview'),danger:true,focus:'#fgSel',
        bodyHtml:'<div class="muted" style="font-size:12px;margin-bottom:8px">'+t('fg.desc')+'</div><select id="fgSel" class="zdi">'+fo+'</select>',
        onOk:function(){var proj=zid('fgSel')&&zid('fgSel').value;if(!proj)return true;zDlgMsg(t('fg.previewing'));zid('zDlgOk').disabled=true;
          zPost('/memory-forget?project='+encodeURIComponent(proj)).then(function(r){
            if(!r||r.ok===false){zDlgMsg('✗ '+((r&&r.error)||t('q.err')));zid('zDlgOk').disabled=false;return;}
            if(!r.messages){zDlgMsg(t('fg.noMatch'));zid('zDlgOk').disabled=false;return;}
            zDlgClose();
            zConfirm({title:t('fg.confirmTitle'),danger:true,okLabel:t('fg.deleteOk'),body:t('fg.willDelete').replace('{s}',zN(r.sessions)).replace('{m}',zN(r.messages)).replace('{d}',zN(r.digests))+'\n'+zProjName(proj)+'\n\n'+t('fg.autoBackup'),onOk:function(){
              zset('drvMsg',t('fg.deleting'));zPost('/memory-forget?force=1&project='+encodeURIComponent(proj)).then(function(r2){zset('drvMsg',r2&&r2.ok?('✓ '+t('fg.deleted').replace('{m}',zN(r2.messages))+' · backup: '+(r2.backupPath||'—')):('✗ '+((r2&&r2.error)||t('q.err'))));zGet('/memory-status?fresh=1').then(renderMem);});}});
          }).catch(function(){zDlgMsg('✗ '+t('q.err'));zid('zDlgOk').disabled=false;});
          return true;}});}
    else if(act==='mredact'){zConfirm({title:t('rd.title'),body:t('rd.body'),okLabel:t('rd.ok'),onOk:function(){zset('drvMsg',t('rd.running'));zPost('/memory-redact').then(function(r){zset('drvMsg',r&&r.ok?'✓ '+t('rd.done'):('✗ '+((r&&r.error)||t('q.err'))));});}});}
  });
  function pollSync(){zGet('/sync-status').then(function(st){
    if(st&&st.running){zrun('driveState',true);zset('driveState',t('drv.syncing'));setTimeout(pollSync,2000);return;}
    zrun('driveState',false);zset('driveState','✓ '+t('drv.syncDone'));
    syncPulse();                                   // số Drive về đúng NGAY khi đẩy xong
    zGet('/memory-status?fresh=1').then(renderMem); // phần nặng làm tươi sau
  }).catch(function(){setTimeout(pollSync,2000);});}

  // ── DỜI TỪ graph.js 2026-08-07: nguồn đã dò, không phải graph
  var discTab=null;
  function renderDiscovered(cap){
    var box=zid('projDiscovered');if(!box)return;cap=cap||{};
    var linked=new Set(((Z.status&&Z.status.knownProjects)||[]).map(function(k){return String(k.root||'').toLowerCase();}));
    var localHost=cap.localHost||'';
    var byHost={};
    (cap.projects||[]).forEach(function(p){
      if(String(p.host||'')===localHost&&linked.has(String(p.path).toLowerCase()))return; // đã liên kết → không hiện lại
      var h=p.host||t('src.unknownHost');(byHost[h]=byHost[h]||[]).push(p);
    });
    var hosts=Object.keys(byHost).sort(function(a,b){return a===localHost?-1:b===localHost?1:String(a).localeCompare(b);});
    if(!hosts.length){box.innerHTML='';return;}
    if(!discTab||hosts.indexOf(discTab)<0)discTab=hosts[0];
    var tabs='<div class="tabs" style="margin-top:6px;flex-wrap:wrap">'+hosts.map(function(h){return '<button class="'+(h===discTab?'on':'')+'" data-disc-tab="'+stdEsc(h)+'">🖥 '+stdEsc(h===localHost?(h+t('src.thisHost')):h)+' ('+byHost[h].length+')</button>';}).join('')+'</div>';
    var isLocalTab=discTab===localHost;
    var rows=(byHost[discTab]||[]).slice(0,80).map(function(p){var pbi=p.profile==='non-app';
      var act=isLocalTab
        ? '<button class="btn sm" data-add-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto">＋ Add</button><button class="btn sm" data-merge-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto" title="'+t('src.mergeTip')+'">'+t('src.merge')+'</button>'
        : '<span class="muted" style="font-size:11px;flex:0 0 auto">'+t('src.from')+stdEsc(discTab)+'</span>';
      return '<div class="disc-row"><div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:6px"><span class="nm">'+stdEsc(zProjName(p.path))+'</span>'+(p.profile?'<span class="ptype '+(pbi?'is-non':'is-app')+'">'+(pbi?'NON-APP':'APP')+'</span>':'')+'</div><div class="muted" style="font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+stdEsc(p.path)+' · '+zN(p.sessions)+' sess · '+zN(p.messages)+' msg</div></div><div class="sxa">'+act+'</div></div>';
    }).join('');
    box.innerHTML='<div class="sys-grp" style="margin-top:16px;color:var(--warn)">'+t('src.unlinkedHdr')+'</div>'+tabs+'<div style="margin-top:8px">'+rows+'</div>';
  }
  document.addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-disc-tab]'):null;if(t){discTab=t.dataset.discTab;renderDiscovered((Z.mem&&Z.mem.coverage)||{});}});
  document.addEventListener('click',function(e){var mg=e.target.closest?e.target.closest('[data-merge-proj]'):null;if(!mg)return;
    var from=mg.dataset.mergeProj,ks=(Z.status&&Z.status.knownProjects)||[];
    if(!ks.length){zConfirm({title:t('mg.title'),body:t('mg.noTarget'),okLabel:'OK',onOk:function(){}});return;}
    var opts=ks.map(function(k){return '<option value="'+stdEsc(k.root)+'">'+stdEsc(zProjName(k.root))+'</option>';}).join('');
    zDialog({icon:'⇢',title:t('mg.title'),okLabel:t('mg.ok'),focus:'#mgSel',
      bodyHtml:'<div style="font-size:13px;margin-bottom:8px">'+t('mg.from')+' <b>'+stdEsc(zProjName(from))+'</b></div>'
        +'<label style="font-size:12px;color:var(--text-dim)">'+t('mg.into')+'</label><select id="mgSel" class="zdi" style="margin-top:4px">'+opts+'</select>'
        +'<div class="muted" style="font-size:11px;margin-top:8px">'+t('mg.note')+'</div>',
      onOk:function(){var sel=zid('mgSel');var to=sel&&sel.value;if(!to)return true;
        zDlgMsg(t('mg.merging'));zid('zDlgOk').disabled=true;
        zPost('/merge-project?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)).then(function(){zDlgClose();return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){zDlgMsg('✗ '+t('q.err'));zid('zDlgOk').disabled=false;});
        return true;}});
  });
