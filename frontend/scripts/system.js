// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ── SYSTEM screen: full capability inventory + per-feature check/enable ──
  var FEATURES=[
    {k:'memory',grp:'f.grpCore',n:'Memory & recall (FTS5)',kind:'check',feat:'memory',doc:'f.doc.memory'},
    {k:'vector',grp:'f.grpCore',n:'Vector index (semantic)',kind:'stat',probe:'vector',doc:'f.doc.vector'},
    {k:'hybrid',grp:'f.grpCore',n:'Hybrid search',kind:'toggle',ep:'/set-hybrid',get:function(m){return !!m.hybrid;},doc:'f.doc.hybrid'},
    // `hidden`: engine còn (CLI/MCP/env ZEMORY_RERANK vẫn bật được) nhưng KHÔNG bày trên UI — user 2026-08-29:
    // *"rerank ko xài, ẩn nó luôn"*. Giữ entry để cổng `checks-probes` và `/check?feature=rerank` còn nguyên.
    {k:'rerank',grp:'f.grpCore',n:'Rerank (cross-encoder)',kind:'toggle',ep:'/set-rerank',get:function(m){return !!m.rerank;},probe:'rerank',doc:'f.doc.rerank',hidden:true},
    {k:'digest',grp:'f.grpCore',n:'Session digest',kind:'stat',doc:'f.doc.digest'},
    {k:'graph',grp:'f.grpCore',n:'Graph (code · docs)',kind:'nav',to:'projects',doc:'f.doc.graph'},
    {k:'drive',grp:'f.grpSync',n:'f.drive',kind:'nav',to:'memory',doc:'f.doc.drive'},
    {k:'scheduler',grp:'f.grpSync',n:'f.sched',kind:'auto',auto:'scheduler',doc:'f.doc.scheduler'},
    {k:'autostart',grp:'f.grpSync',n:'f.autostart',kind:'auto',auto:'autostart',doc:'f.doc.autostart'},
    {k:'autosync',grp:'f.grpSync',n:'f.autosync',kind:'auto',auto:'autosync',doc:'f.doc.autosync'},
    {k:'storage',grp:'f.grpSync',n:'f.dbloc',kind:'nav',to:'__settings',doc:'f.doc.storage'},
    {k:'validate',grp:'f.grpHarness',n:'Docs harness (validate)',kind:'check',feat:'validate',doc:'f.doc.validate'},
    {k:'grill',grp:'f.grpHarness',n:'Grill',kind:'check',feat:'grill',doc:'f.doc.grill'},
    {k:'harness',grp:'f.grpHarness',n:'Harness files',kind:'stat',doc:'f.doc.harness'}
  ];
  /** Từ trên badge — MỘT bộ từ vựng: công tắc/tự động ⇒ On/Off · còn lại ⇒ Healthy/Warning/Off (pillTxt của core). */
  function badgeWord(state,f){
    if(f.kind==='toggle'||f.kind==='auto')return state==='on'?t('sys.on'):t('sys.off');
    if(state==='dim')return t('sys.off');
    return pillTxt(state);
  }
  function sysStatus(f){
    var m=Z.mem||{},a=Z.auto||{},vec=m.vectors||{},drive=m.drive||{},st=m.storage||{},s=Z.status||{};
    if(f.kind==='toggle')return {on:f.get(m)?'on':'dim',txt:f.get(m)?t('sys.on'):t('sys.off')};
    if(f.kind==='auto')return {on:a[f.auto]?'on':'dim',txt:a[f.auto]?t('sys.on'):t('sys.off')};
    if(f.kind==='check'){var c=(Z.checks||{})[f.feat];return c?{on:c.state,txt:pillTxt(c.state)}:{on:'dim',txt:'…'};}
    // SỨC KHOẺ vector = "có gì tự nhúng backlog không", KHÔNG phải "backlog = 0" (user 2026-08-29: kho nhận
    // tin liên tục nên backlog không bao giờ về 0 — đo là đèn ⚠ vĩnh viễn, và đèn luôn đỏ thì không ai nhìn nữa).
    // ⚠ CHỈ khi còn tin chờ mà scheduler (maintain) đang TẮT — lúc đó không ai sẽ nhúng chúng.
    if(f.k==='vector'){var rem=vec.remaining,autoOn=!!a.scheduler;
      return {on:rem===0?'on':(rem>0?(autoOn?'on':'warn'):'dim'),
        txt:rem===0?(t('st.enough')+zN(vec.count)):(zN(rem)+t('st.pending')+(autoOn?t('st.pendingAuto'):t('st.pendingOff')))};}
    if(f.k==='digest'){var d=((m.info&&m.info.tables)||[]).find(function(x){return x.name==='session_digest';});return {on:d&&d.rows>0?'on':'dim',txt:d&&d.rows>0?(zN(d.rows)+t('st.sessions')):t('st.notBuilt')};}
    if(f.k==='graph')return {on:'on',txt:t('st.ready')};
    if(f.k==='drive')return {on:drive.linked?'on':'dim',txt:drive.linked?t('st.linked'):t('st.notLinked')};
    if(f.k==='storage')return {on:st&&st.onCloud?'warn':'on',txt:st&&st.onCloud?'⚠ cloud':'local'};
    if(f.k==='harness'){var docs=s.docs||[],n=docs.filter(function(x){return x.ok;}).length;return {on:docs.length&&n===docs.length?'on':'warn',txt:n+'/'+(docs.length||0)};}
    return {on:'dim',txt:'—'};
  }
  function sysAction(f){
    if(f.k==='digest'){var m=Z.mem||{},d=((m.info&&m.info.tables)||[]).find(function(x){return x.name==='session_digest';}),has=d&&d.rows>0;
      return '<button class="btn '+(has?'sm':'primary sm')+'" data-sys-digest="1">'+(has?'↻ '+t('sys.buildMissing'):'⚙ '+t('sys.buildNow'))+'</button>';}
    if(f.kind==='toggle'){var on=f.get(Z.mem||{});return '<button class="btn sm" data-sys-toggle="'+f.ep+'" data-on="'+(on?'0':'1')+'">'+(on?t('sys.off'):t('sys.on'))+'</button>';}
    if(f.kind==='auto'){var o2=(Z.auto||{})[f.auto];return '<button class="btn sm" data-sys-auto="'+f.auto+'" data-on="'+(o2?'0':'1')+'">'+(o2?t('sys.off'):t('sys.on'))+'</button>';}
    if(f.kind==='check')return '<button class="btn sm" data-sys-check="'+f.feat+'">↻ '+t('sys.recheck')+'</button>';
    // `probe`: feature có PHÉP KIỂM THẬT ở backend nhưng hành động chính là toggle/stat.
    // Không có nhánh này thì `/check?feature=vector|rerank` chỉ gọi được bằng curl —
    // tức vẫn mồ côi, chỉ đổi chỗ (tự bắt 2026-07-28 ngay sau khi nối backend).
    if(f.probe)return '<button class="btn sm" data-sys-check="'+f.probe+'">↻ '+t('sys.recheck')+'</button>';
    if(f.kind==='nav')return '<button class="btn sm" data-sys-nav="'+f.to+'">'+t('sys.goto')+'</button>';
    return '';
  }
  var sysSel=null;
  function renderSystem(){
    var box=zid('sysList');if(!box)return;
    if(!sysSel)sysSel=FEATURES[0].k;
    var groups={},order=[];
    FEATURES.forEach(function(f){if(f.hidden)return;if(!groups[f.grp]){groups[f.grp]=[];order.push(f.grp);}groups[f.grp].push(f);});
    // `warnNames` gom TÊN tính năng đang cảnh báo, không chỉ đếm số. Chip ở rail trước đây chỉ
    // nói "1 ⚠ · needs attention" — báo có chuyện mà không nói chuyện ở đâu, nên người dùng vẫn
    // phải vào đây dò 14 dòng. Có tên thì chip trả lời được câu "cái gì đang lỗi".
    var okN=0,warnN=0,tot=0,warnNames=[];
    box.innerHTML=order.map(function(g){
      return '<div class="sys-grp">'+stdEsc(t(g))+'</div>'+groups[g].map(function(f){
        var s=sysStatus(f);tot++;if(s.on==='on')okN++;else if(s.on==='warn'||s.on==='off'){warnN++;warnNames.push(t(f.n));}
        // BADGE = MỘT từ vựng trạng thái (Healthy · On · Off · ⚠), đồng nhất mọi hàng (user 2026-08-29:
        // *"on với healthy thôi, số vector hay embed là thông tin phụ"*). Số liệu/chi tiết (pending · sessions ·
        // linked · 6/6) chuyển thành chữ xám nhỏ SAU tên — thông tin phụ đứng ở chỗ phụ.
        var word=badgeWord(s.on,f),info=(s.txt&&s.txt!==word)?'<span class="sxi">'+stdEsc(s.txt)+'</span>':'';
        return '<div class="sys-li'+(f.k===sysSel?' on':'')+'" data-sysfeat="'+f.k+'"><span class="pill '+pillFor(s.on)+'" style="flex:0 0 auto;min-width:56px;text-align:center">'+stdEsc(word)+'</span><span class="sxn">'+stdEsc(t(f.n))+info+'</span></div>';
      }).join('');
    }).join('');
    setHealthChip(okN,warnN,tot,warnNames); // pill trong màn + chip ở chân rail = CÙNG một roll-up
    renderSysDetail();
  }
  /** Một dòng kết quả probe cho feature có `probe` (vector/rerank). Rỗng khi chưa bấm. */
  function probeLine(f){
    if(!f.probe)return '';
    var c=(Z.checks||{})[f.probe];
    if(!c)return '<div class="muted" style="font-size:11.5px;margin-bottom:12px">'+t('sys.probeHint')+'</div>';
    return '<div style="font-size:11.5px;margin-bottom:12px;display:flex;gap:8px;align-items:center">'
      +'<span class="pill '+pillFor(c.state)+'">'+stdEsc(pillTxt(c.state))+'</span>'
      +'<span class="muted">'+stdEsc(String(c.detail||''))+'</span></div>';
  }
  function renderSysDetail(){
    var box=zid('sysDetail');if(!box)return;
    var f=FEATURES.filter(function(x){return x.k===sysSel;})[0];if(!f){box.innerHTML='';return;}
    var s=sysStatus(f);
    box.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span class="pill '+pillFor(s.on)+'">'+stdEsc(s.txt)+'</span><b style="font-size:15px">'+stdEsc(t(f.n))+'</b></div>'
      // t(f.grp) chứ KHÔNG phải f.grp: `grp` là KHOÁ i18n (đã chuẩn hoá 2026-08-13), in thẳng
      // là hiện chữ thô `f.grpCore` ra màn hình.
      +'<div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">'+stdEsc(t(f.grp))+'</div>'
      +'<div class="sxa" style="margin-bottom:14px">'+sysAction(f)+'</div>'
      // Kết quả PHÉP KIỂM THẬT (probe model). Không có khối này thì bấm "Kiểm" xong kết quả
      // nằm im trong Z.checks mà không ai thấy — nửa vời đúng nghĩa. `sysStatus` chỉ đọc
      // Z.checks cho kind='check', nên feature kind stat/toggle phải hiện ở đây.
      +probeLine(f)
      +'<div class="mdview">'+stdMd(t(f.doc||f.d||''))+'</div>';
  }
  document.addEventListener('click',function(e){var li=e.target.closest?e.target.closest('#sysList [data-sysfeat]'):null;if(li){sysSel=li.dataset.sysfeat;renderSystem();}});
  document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-sys-digest]'):null;if(!b)return;var o=b.textContent;b.textContent=t('st.buildingDigest');b.disabled=true;
    zPost('/memory-digest').then(function(r){return zGet('/memory-status?fresh=1').then(function(m){renderMem(m);renderSystem();});}).catch(function(){b.textContent=o;b.disabled=false;});});
  document.addEventListener('click',function(e){var a=e.target.closest?e.target.closest('[data-add-proj]'):null;if(!a)return;var p=a.dataset.addProj;a.textContent='…';zPost('/add-project?root='+encodeURIComponent(p)).then(function(r){if(r&&r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){});});
  document.addEventListener('click',function(e){
    var tg=e.target.closest?e.target.closest('[data-sys-toggle]'):null;
    var au=e.target.closest?e.target.closest('[data-sys-auto]'):null;
    var ck=e.target.closest?e.target.closest('[data-sys-check]'):null;
    var nv=e.target.closest?e.target.closest('[data-sys-nav]'):null;
    if(tg){var ep=tg.dataset.sysToggle,on=tg.dataset.on==='1';
      // Optimistic: flip local state + re-render NOW so the button always toggles
      // back (fixed "tắt rồi không bật lại" — was reading a cached /memory-status).
      if(Z.mem){if(/hybrid/.test(ep))Z.mem.hybrid=on;else if(/rerank/.test(ep))Z.mem.rerank=on;else if(/scope/.test(ep))Z.mem.scope=on;}
      // Đóng dấu cú bấm — renderMem dùng mốc này để payload memory-status GIÀ (bắn trước lúc
      // bấm, về sau vì lượt lạnh) không vẽ đè trạng thái cũ lên nút vừa gạt.
      Z.flagsAt=Z.flagsAt||{};if(/hybrid/.test(ep))Z.flagsAt.hybrid=Date.now();else if(/rerank/.test(ep))Z.flagsAt.rerank=Date.now();else if(/scope/.test(ep))Z.flagsAt.scope=Date.now();
      renderSystem();
      var rh=zid('rHybrid'),rr=zid('rRerank');if(rh&&Z.mem)rh.classList.toggle('on',!!Z.mem.hybrid);if(rr&&Z.mem)rr.classList.toggle('on',!!Z.mem.rerank);
      zPost(ep+'?on='+tg.dataset.on).catch(function(){});return;}
    if(au){var nm=au.dataset.sysAuto,ao=au.dataset.on==='1';
      if(Z.auto)Z.auto[nm]=ao;renderSystem();
      zPost('/set-'+nm+'?on='+au.dataset.on).then(function(){return zGet('/automation');}).then(function(a){renderAuto(a);renderSystem();}).catch(function(){});return;}
    if(ck){var f=ck.dataset.sysCheck;ck.textContent='…';zGet('/check?feature='+f+'&fresh=1').then(function(r){Z.checks[f]=r;renderSystem();}).catch(function(){renderSystem();});return;}
    if(nv){if(nv.dataset.sysNav==='__settings')openSettings();else go(nv.dataset.sysNav);return;}
    var rc=e.target.closest&&e.target.closest('[data-act="sysrecheck"]');
    if(rc){
      var ro=rc.innerHTML;rc.disabled=true;rc.innerHTML='⏳ '+t('sys.rechecking');
      // Re-pull EVERY source the System list reads from — incl. /status (harness
      // files + knownProjects), which the old recheck skipped so those rows never
      // refreshed. Visible feedback so it never reads as a dead button.
      Promise.all([
        zGet('/status').then(renderStatus).catch(function(){}),
        zGet('/memory-status?fresh=1').then(renderMem).catch(function(){}),
        zGet('/automation').then(renderAuto).catch(function(){}),
        Promise.all(['memory','validate','grill'].map(function(f){return zGet('/check?feature='+f+'&fresh=1').then(function(r){Z.checks[f]=r;}).catch(function(){});}))
      ]).then(function(){
        renderSystem();
        rc.innerHTML='✓ '+t('sys.rechecked');
        setTimeout(function(){rc.disabled=false;rc.innerHTML=ro;},1600);
      });
      return;
    }
  });
  // Resize seams (§5): drag a .seam[data-seam] to size the column BEFORE it (a
  // CSS var on the grid). Persist per key; double-click resets to default.
  function initSeams(){
    document.querySelectorAll('.seam[data-seam]').forEach(function(sm){
      if(sm.__wired)return;sm.__wired=1;
      var key=sm.dataset.seam,cvar='--'+key,cont=sm.parentElement;
      try{var v=localStorage.getItem('zemory.seam.'+key);if(v)cont.style.setProperty(cvar,v);}catch(e){}
      sm.addEventListener('mousedown',function(e){
        e.preventDefault();sm.classList.add('drag');
        var after=sm.dataset.seamSide==='after';
        var ref=after?sm.nextElementSibling:sm.previousElementSibling;if(!ref)return;
        var cr=cont.getBoundingClientRect(),cw=cr.width,refLeft=ref.getBoundingClientRect().left;
        function mv(ev){var px=after?(cr.right-ev.clientX):(ev.clientX-refLeft);px=Math.max(180,Math.min(px,cw-240));cont.style.setProperty(cvar,px+'px');}
        function up(){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);sm.classList.remove('drag');try{localStorage.setItem('zemory.seam.'+key,cont.style.getPropertyValue(cvar));}catch(e){}}
        document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
      });
      sm.addEventListener('dblclick',function(){cont.style.removeProperty(cvar);try{localStorage.removeItem('zemory.seam.'+key);}catch(e){}});
    });
  }

  // ── DỜI TỪ graph.js 2026-08-07: sức khoẻ + check, không phải graph
  function setHealthChip(okN,warnN,tot,warnNames){
    var el=zid('sysSummary');
    if(el){el.className='pill '+(warnN?'warn':'ok');el.textContent=t('sys.health').replace('{ok}',okN).replace('{n}',tot)+(warnN?' · '+warnN+' ⚠':'');}
    var rh=zid('railHealth'),rd=zid('railDot'),rs=zid('railHealthSub');
    if(rh)rh.textContent=warnN?(warnN+' ⚠'):(okN+' OK');
    if(rd)rd.classList.toggle('warn',warnN>0);
    // Dòng phụ nói TÊN tính năng đang cảnh báo thay vì câu chung "needs attention" — chip mà chỉ
    // báo "có chuyện" thì người dùng vẫn phải tự đi dò. Nhiều cái cùng cảnh báo thì nêu cái đầu
    // + "+N" để không kéo dài rail (chip hẹp, tràn chữ còn khó đọc hơn).
    if(rs){
      rs.removeAttribute('data-i18n');
      var names=warnNames||[];
      rs.textContent=warnN
        ? (names.length ? names[0]+(names.length>1?' +'+(names.length-1):'') : t('rail.needAttn'))
        : t('rail.allGreen');
    }
  }
  // Nạp 3 check thật (/check) rồi vẽ lại inventory — đường duy nhất làm tươi roll-up.
  function refreshChecks(){
    return Promise.all(['memory','validate','grill'].map(function(f){
      return zGet('/check?feature='+f).then(function(r){Z.checks[f]=r;}).catch(function(){Z.checks[f]={state:'off',detail:'err'};});
    })).then(function(){renderSystem();});
  }

  // ── Chấm than UPDATE ở rail (2026-08-21, user chốt): repo trong registry CŨ so với bộ chuẩn
  //    hiện hành ⇒ chip hiện ngay TRÊN chip sức khoẻ, bấm sang màn Dự án. Mọi repo khớp ⇒ ẨN
  //    HẲN (một chip xanh thường trực chỉ thêm nhiễu). Poll thưa: /harness-updates đã cache 5'
  //    phía daemon, đây chỉ hỏi lại mỗi 10' + một lần lúc mở app. Fail-open: lỗi ⇒ giữ ẩn.
  function refreshHarnessUpdates(){
    return zGet('/harness-updates').then(function(r){
      var chip=zid('railUpd'),n=zid('railUpdN'),sub=zid('railUpdSub');
      if(!chip)return;
      var stale=(r&&r.stale)||[];
      // Lưu để màn Dự án gắn dấu lên ĐÚNG thẻ repo cũ chuẩn — chấm cam ở rail mà bấm sang không thấy
      // thẻ nào khác thẻ nào là "nhảy vào mà không báo gì" (user 2026-08-29).
      Z.updStale=stale;
      var app=r&&r.appUpdate;UPD_APP=app||null;UPD_CHECK=!(r&&r.repoStdCheck===false);
      // Hai loại CŨ khác cấp, ưu tiên loại cấp MÁY: `zemory sync` gap-fill từ template của
      // bản đang cài, nên áp chuẩn bằng một bản cũ là chép lại cái cũ. Báo công cụ trước.
      // Chip LUÔN hiện (user 2026-08-29: *"ai nói là ẩn, nó phải xanh khi không còn bị gì"*): cam khi có việc
      // (bản zemory mới · repo cũ chuẩn), XANH khi tất cả khớp — bấm vẫn mở hộp Cập nhật để xem chi tiết.
      chip.style.display='';
      var dot=chip.querySelector('.dot');
      if(app){
        if(dot)dot.className='dot warn';
        if(n)n.textContent=t('rail.updApp').replace('{v}',app.latest)+' ⚠';
        if(sub)sub.textContent=t('rail.updAppSub').replace('{have}',app.have).replace('{from}',app.from);
        return;
      }
      if(!stale.length){
        if(dot)dot.className='dot';
        if(n)n.textContent=t('rail.updOk');
        if(sub)sub.textContent=((zid('topVersion')||{}).textContent||'')+(UPD_CHECK?t('rail.updOkSub'):t('rail.updOkSubNoRepo'));
        return;
      }
      if(dot)dot.className='dot warn';
      if(n)n.textContent=t('rail.updOld').replace('{n}',stale.length)+' ⚠';
      if(sub)sub.textContent=stale[0].name+(stale.length>1?' +'+(stale.length-1):'');
    }).catch(function(){});
  }
  refreshHarnessUpdates();
  setInterval(refreshHarnessUpdates,600000);
  // Bấm chấm cập nhật ⇒ HỘP tại chỗ (không nhảy màn — mục đích gốc 23/08 là "có bản mới → bấm cập nhật", kiểu VS Code):
  // trên = bản zemory (đang chạy / mới trên kênh chung / nút Cập nhật); dưới = repo cũ chuẩn (liệt kê + cách áp).
  var UPD_APP=null,UPD_CHECK=true;
  // Đếm lại nhãn nút theo số ô đang tick.
  document.addEventListener('change',function(e){
    if(e.target&&e.target.classList&&e.target.classList.contains('upd-pick')){var n=document.querySelectorAll('.upd-pick:checked').length,b=zid('updApplySel');if(b){b.textContent=t('upd.applySel').replace('{n}',n);b.disabled=!n;}return;}
    if(e.target&&e.target.id==='updCheckRepos'){var on=e.target.checked;zPost('/set-repo-std-check?on='+(on?'1':'0')).then(function(){UPD_CHECK=on;return zGet('/harness-updates?fresh=1');}).then(function(){refreshHarnessUpdates().then(function(){zDlgClose();var c=zid('railUpd');if(c&&c.style.display!=='none')c.click();});});}
  });
  // "Cập nhật đã chọn": áp tuần tự từng repo đã tick (mỗi cú bấm của người dùng = lời cho phép cho ĐÚNG các repo đó).
  document.addEventListener('click',function(e){
    if(!(e.target&&e.target.id==='updApplySel'))return;
    var picks=Array.prototype.slice.call(document.querySelectorAll('.upd-pick:checked')).map(function(c){return c.getAttribute('data-root');});
    if(!picks.length)return;
    var btn=e.target;btn.disabled=true;btn.textContent='…';
    var i=0,okN=0;
    function next(){
      if(i>=picks.length){btn.textContent=t('upd.applied2').replace('{n}',okN).replace('{m}',picks.length);zGet('/harness-updates?fresh=1').then(function(){refreshHarnessUpdates();});return;}
      // Tìm hàng bằng so sánh dataset, KHÔNG bằng selector CSS: đường dẫn Windows có `\` làm selector hỏng ⇒ bản
      // đầu áp THẬT (log + file guard ghi lại) nhưng hàng không vẽ lại — user đọc thành "apply giả" (2026-08-29).
      var root=picks[i++],row=Array.prototype.slice.call(document.querySelectorAll('.upd-row')).filter(function(x){return x.getAttribute('data-root')===root;})[0],stEl=row&&row.querySelector('.upd-st');
      if(stEl)stEl.textContent='…';
      zPost('/harness-apply?root='+encodeURIComponent(root)).then(function(r){
        r=r||{};
        if(stEl)stEl.textContent=r.ok?t('upd.applied').replace('{n}',(r.added||[]).length).replace('{g}',r.guard?'✓':'—'):(t('upd.applyFail')+(r.error?' · '+r.error:''));
        if(r.ok){okN++;var cb=row&&row.querySelector('.upd-pick');if(cb){cb.checked=false;cb.disabled=true;}
          if(row){row.innerHTML=row.innerHTML.replace('⚠','✓');}}
        next();
      }).catch(function(){if(stEl)stEl.textContent=t('upd.applyFail');next();});
    }
    next();
  });
  document.addEventListener('click',function(e){
    if(!(e.target.closest&&e.target.closest('#railUpd')))return;
    var st=Z.updStale||[],app=UPD_APP;
    var top=app
      ?'<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="muted">'+stdEsc(t('upd.appHave'))+'</span><b>'+stdEsc(app.have)+'</b><span class="muted">→ '+stdEsc(t('upd.appLatest'))+'</span><b>'+stdEsc(app.latest)+'</b></div>'
        +'<div class="muted" style="font-size:11px;margin-top:4px">'+stdEsc(t('upd.appFrom').replace('{from}',app.from||'?').replace('{at}',String(app.at||'').slice(0,16).replace('T',' ')))+'</div>'
      :'<div>'+stdEsc(t('upd.appOk').replace('{v}',((zid('topVersion')||{}).textContent||'').replace(/^v/,'')))+'</div>';
    // Mỗi repo một nút "Cập nhật repo": cú bấm của người dùng LÀ lời cho phép ghi vào repo đó (02_RULES
    // §Phạm vi cấm ghi chéo KHI CHƯA ĐƯỢC PHÉP). Làm đúng việc `zemory sync` + `hook guard` làm, không hơn.
    // Repo cũ chuẩn: ô TICK từng repo (mặc định tick) + một nút "Cập nhật đã chọn (n)"; công tắc "Kiểm các repo khác
    // dùng chuẩn" ở đáy hộp (user 2026-08-29) — tắt thì chip chỉ còn báo bản zemory.
    var repos=!UPD_CHECK
      ?''
      :st.length
      ?'<div class="sys-grp" style="margin-top:14px">'+stdEsc(t('upd.repoHdr').replace('{n}',st.length))+'</div><div style="font-size:12.5px">'+st.map(function(x){return '<label class="upd-row" data-root="'+stdEsc(x.root)+'" style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer"><input type="checkbox" class="upd-pick" data-root="'+stdEsc(x.root)+'" checked> ⚠ <b>'+stdEsc(x.name)+'</b> <span class="muted upd-st" style="font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+stdEsc(x.root)+'</span></label>';}).join('')+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button class="btn sm primary" id="updApplySel">'+stdEsc(t('upd.applySel').replace('{n}',st.length))+'</button><span class="muted" style="font-size:11px">'+stdEsc(t('upd.repoHint'))+'</span></div>'
      :'<div class="muted" style="margin-top:14px;font-size:12px">'+stdEsc(t('upd.repoNone'))+'</div>';
    repos+='<label style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;cursor:pointer"><input type="checkbox" id="updCheckRepos"'+(UPD_CHECK?' checked':'')+'> '+stdEsc(t('upd.checkRepos'))+'</label>';
    zDialog({icon:'⬆',title:t('upd.title'),bodyHtml:'<div style="font-size:13px">'+top+repos+'</div>',
      okLabel:app?t('upd.btn'):t('scope.detClose'),
      onOk:app?function(){
        var okb=zid('zDlgOk');if(okb)okb.disabled=true;zDlgMsg(t('upd.running'));
        zPost('/selfupdate').then(function(r){
          r=r||{};
          if(r.dirty){zDlgMsg(t('upd.dirty'));if(okb)okb.disabled=false;return;}
          if(!r.ok){zDlgMsg(t('upd.fail').replace('{e}',r.error||''));if(okb)okb.disabled=false;return;}
          zDlgMsg(t('upd.done').replace('{have}',r.have||'').replace('{latest}',r.latest||''));
        }).catch(function(){zDlgMsg(t('upd.done').replace('{have}',app.have).replace('{latest}',app.latest));}); // daemon thoát giữa response = đã đi dựng lại
        return true;
      }:null});
  });
