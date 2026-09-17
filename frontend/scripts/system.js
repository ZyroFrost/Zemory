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
    {k:'harness',grp:'f.grpHarness',n:'Harness files',kind:'stat',doc:'f.doc.harness'},
    // plan/21 — hàng CHÍNH THỨC từ 2026-09-09. Màu theo "MỚI chết kể từ baseline", không theo tổng
    // số chết: prose kể về thiết kế đã bác chết từ lúc sinh, không phải mục ruỗng. Warning = có đường
    // vừa chết sau baseline = có folder vừa bị dời/đổi tên mà docs còn trỏ tên cũ.
    // `watch`: công tắc theo dõi (user 2026-09-10: "thêm nút toggle bật tắt cho toàn bộ tính năng dò này") — tắt ⇒ hàng
    // Off, ra khỏi Health, chip/badge im, daemon bỏ sweep; CLI gõ tay vẫn chạy. Mẫu chung cho hàng kiểm có công tắc.
    {k:'paths',grp:'f.grpHarness',n:'f.paths',kind:'check',feat:'paths',watch:{ep:'/set-paths-watch',key:'pathsWatch'},doc:'f.doc.paths'},
    // 2026-09-12 (user: *"thêm chức năng dọn tiến trình thừa đi"*). Rác dạng TIẾN TRÌNH không nằm
    // trong `git status`, không chiếm chỗ thấy được — người dùng chỉ phát hiện khi mở Task Manager
    // thấy đầy tiến trình lạ (đo hôm đó: 75 tiến trình Edge headless sống từ sáng). Vòng dọn nền 6
    // giờ đã có, nhưng thứ không ai NHÌN THẤY thì không ai biết nó có chạy hay không ⇒ cho nó một
    // hàng: số đếm + nút dọn ngay. Hàng CHỈ ĐẾM, đóng là do cú bấm (hoặc vòng nền).
    {k:'procs',grp:'f.grpSync',n:'f.procs',kind:'check',feat:'procs',act:'sweep',doc:'f.doc.procs'}
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
    if(f.kind==='check'){if(f.watch&&m[f.watch.key]===false)return {on:'dim',txt:t('sys.off')};var c=(Z.checks||{})[f.feat];return c?{on:c.state,txt:pillTxt(c.state)}:{on:'dim',txt:'…'};}
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
    // Công tắc KHÔNG còn ở đây (user 2026-09-10: *"mấy cái toggle sẽ hiện thẳng luôn lề phải của panel list… thay luôn nút on
    // ở panel chi tiết"*) — xem `sysSwitch()`. Hai nơi cùng điều khiển một trạng thái là hai nơi để lệch.
    if(f.kind==='toggle'||f.kind==='auto')return '';
    if(f.kind==='check'){var w=f.watch?((Z.mem||{})[f.watch.key]!==false):null;
      if(w===false)return '';
      var re='<button class="btn sm" data-sys-check="'+f.feat+'">↻ '+t('sys.recheck')+'</button>';
      // Hàng có việc để LÀM (không chỉ để xem) thì có thêm nút làm. Nút dọn đứng TRƯỚC nút kiểm lại
      // vì nó là việc chính của hàng; kiểm lại chỉ là cách xem số mới.
      return f.act==='sweep'?'<button class="btn primary sm" data-sys-sweep="1">🧹 '+t('sys.sweepNow')+'</button> '+re:re;}
    // `probe`: feature có PHÉP KIỂM THẬT ở backend nhưng hành động chính là toggle/stat.
    // Không có nhánh này thì `/check?feature=vector|rerank` chỉ gọi được bằng curl —
    // tức vẫn mồ côi, chỉ đổi chỗ (tự bắt 2026-07-28 ngay sau khi nối backend).
    if(f.probe)return '<button class="btn sm" data-sys-check="'+f.probe+'">↻ '+t('sys.recheck')+'</button>';
    if(f.kind==='nav')return '<button class="btn sm" data-sys-nav="'+f.to+'">'+t('sys.goto')+'</button>';
    return '';
  }
  /** Công tắc ở MÉP PHẢI hàng — cùng khuôn `.toggle` của Settings (một hình cho một việc). Chỉ hàng có gì để bật/tắt:
   *  `toggle` (hybrid…) · `auto` (scheduler/autostart/autosync) · `check` có `watch` (dead paths). Hàng lõi (kiểm/số) không có.
   *  Mang đúng data-attr mà handler cũ đã hiểu (`data-sys-toggle`/`data-sys-auto` + `data-on` = trạng thái ĐÍCH). */
  function sysSwitch(f){
    var on,attr;
    if(f.kind==='toggle'){on=!!f.get(Z.mem||{});attr='data-sys-toggle="'+f.ep+'"';}
    else if(f.kind==='auto'){on=!!(Z.auto||{})[f.auto];attr='data-sys-auto="'+f.auto+'"';}
    else if(f.kind==='check'&&f.watch){on=(Z.mem||{})[f.watch.key]!==false;attr='data-sys-toggle="'+f.watch.ep+'"';}
    else return '';
    return '<span class="toggle sys-sw'+(on?' on':'')+'" role="switch" aria-checked="'+(on?'true':'false')+'" aria-label="'+stdEsc(t(f.n))+' · '+(on?t('sys.on'):t('sys.off'))+'" title="'+(on?t('sys.on'):t('sys.off'))+'" '+attr+' data-on="'+(on?'0':'1')+'" style="margin-left:auto;transform:scale(.85)"></span>';
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
        return '<div class="sys-li'+(f.k===sysSel?' on':'')+'" data-sysfeat="'+f.k+'"><span class="pill '+pillFor(s.on)+'" style="flex:0 0 auto;min-width:56px;text-align:center">'+stdEsc(word)+'</span><span class="sxn">'+stdEsc(t(f.n))+info+'</span>'+sysSwitch(f)+'</div>';
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
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.sys-sw'))return;var li=e.target.closest?e.target.closest('#sysList [data-sysfeat]'):null;if(li){sysSel=li.dataset.sysfeat;renderSystem();}});
  document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-sys-digest]'):null;if(!b)return;var o=b.textContent;b.textContent=t('st.buildingDigest');b.disabled=true;
    zPost('/memory-digest').then(function(r){return zGet('/memory-status?fresh=1').then(function(m){renderMem(m);renderSystem();});}).catch(function(){b.textContent=o;b.disabled=false;});});
  // 🧹 Dọn tiến trình thừa (2026-09-12). Cú bấm = lời cho phép ĐÓNG; máy tự quyết "đang bận thì thôi"
  // (xem `/sweep-procs`), bề mặt KHÔNG được truyền `busy` xuống — để bề mặt quyết là mở đường cho một
  // cú bấm cắt ngang lượt quét web đang chạy. Kết quả nói NGAY trên nút: đóng mấy cái, hay vì sao không.
  document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-sys-sweep]'):null;if(!b)return;
    var o=b.textContent;b.textContent=t('sys.sweeping');b.disabled=true;
    zPost('/sweep-procs').then(function(r){
      b.textContent=r&&r.skipped?t('sys.sweepBusy'):(t('sys.sweepDone').replace('{n}',(r&&r.killed)||0));
      return zGet('/check?feature=procs&fresh=1').then(function(c){if(c&&c.feature){Z.checks=Z.checks||{};Z.checks.procs=c;renderSystem();}});
    }).catch(function(){b.textContent=o;}).then(function(){setTimeout(function(){b.textContent=o;b.disabled=false;},2500);});});
  document.addEventListener('click',function(e){var a=e.target.closest?e.target.closest('[data-add-proj]'):null;if(!a)return;var p=a.dataset.addProj;a.textContent='…';zPost('/add-project?root='+encodeURIComponent(p)).then(function(r){if(r&&r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){});});
  document.addEventListener('click',function(e){
    var tg=e.target.closest?e.target.closest('[data-sys-toggle]'):null;
    var au=e.target.closest?e.target.closest('[data-sys-auto]'):null;
    var ck=e.target.closest?e.target.closest('[data-sys-check]'):null;
    var nv=e.target.closest?e.target.closest('[data-sys-nav]'):null;
    if(tg){var ep=tg.dataset.sysToggle,on=tg.dataset.on==='1';
      // Tên khoá trong Z.mem của công tắc này — MỘT phép ánh xạ, dùng cho cả lật, đóng dấu và HOÀN NGUYÊN.
      // Trước đây cùng chuỗi `if/else` này được chép ra hai chỗ; thêm chỗ thứ ba để hoàn nguyên là mời lệch.
      var mk=/hybrid/.test(ep)?'hybrid':/rerank/.test(ep)?'rerank':/scope/.test(ep)?'scope':/paths-watch/.test(ep)?'pathsWatch':null;
      // Optimistic: flip local state + re-render NOW so the button always toggles
      // back (fixed "tắt rồi không bật lại" — was reading a cached /memory-status).
      var prev=mk&&Z.mem?Z.mem[mk]:undefined;
      if(Z.mem&&mk)Z.mem[mk]=on;
      // Đóng dấu cú bấm — renderMem dùng mốc này để payload memory-status GIÀ (bắn trước lúc
      // bấm, về sau vì lượt lạnh) không vẽ đè trạng thái cũ lên nút vừa gạt.
      Z.flagsAt=Z.flagsAt||{};if(mk)Z.flagsAt[mk]=Date.now();
      // Lưu HỎNG ⇒ trả nút về đúng sự thật + gỡ dấu (giữ dấu là để payload thật bị chặn 90 s bởi một
      // giá trị chưa bao giờ được ghi). Xem `zSave` ở core.js để biết vì sao không được nuốt lỗi.
      var undo=function(){if(Z.mem&&mk)Z.mem[mk]=prev;if(mk&&Z.flagsAt)delete Z.flagsAt[mk];renderSystem();
        var h=zid('rHybrid'),k=zid('rRerank');if(h&&Z.mem)h.classList.toggle('on',!!Z.mem.hybrid);if(k&&Z.mem)k.classList.toggle('on',!!Z.mem.rerank);};
      // Công tắc theo dõi đường dẫn: chip rail + badge thẻ đọc /harness-updates ⇒ hỏi lại ngay sau khi gạt, đừng chờ 10′.
      if(/paths-watch/.test(ep)){renderSystem();zSave(ep+'?on='+tg.dataset.on,undo).then(function(j){if(!j)return;return zGet('/harness-updates?fresh=1').then(function(){refreshHarnessUpdates();});}).catch(function(){});return;}
      renderSystem();
      var rh=zid('rHybrid'),rr=zid('rRerank');if(rh&&Z.mem)rh.classList.toggle('on',!!Z.mem.hybrid);if(rr&&Z.mem)rr.classList.toggle('on',!!Z.mem.rerank);
      zSave(ep+'?on='+tg.dataset.on,undo);return;}
    if(au){var nm=au.dataset.sysAuto,ao=au.dataset.on==='1';
      var aprev=!!(Z.auto||{})[nm];
      if(Z.auto)Z.auto[nm]=ao;renderSystem();
      zSave('/set-'+nm+'?on='+au.dataset.on,function(){if(Z.auto)Z.auto[nm]=aprev;renderSystem();})
        .then(function(j){if(!j)return;return zGet('/automation').then(function(a){renderAuto(a);renderSystem();});}).catch(function(){});return;}
    if(ck){var f=ck.dataset.sysCheck;ck.textContent='…';zGet('/check?feature='+f+'&fresh=1').then(function(r){Z.checks[f]=r;renderSystem();}).catch(function(){renderSystem();});return;}
    if(nv){if(nv.dataset.sysNav==='__settings')openSettings();else go(nv.dataset.sysNav);return;}
    var rc=e.target.closest&&e.target.closest('[data-act="sysrecheck"]');
    if(rc){
      var ro=rc.innerHTML;rc.disabled=true;rc.innerHTML='⏳ '+t('sys.rechecking');
      sysRecheckAll().then(function(){
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
        // Chieu keo khai bang DU LIEU (`data-seam-dir="row"`), khong phai nhanh-theo-loai:
        // app-design F1(3) doi MOT engine dung chung, them seam = them khai bao.
        var row=sm.dataset.seamDir==='row';
        var ref=after?sm.nextElementSibling:sm.previousElementSibling;if(!ref)return;
        var cr=cont.getBoundingClientRect(),rr=ref.getBoundingClientRect();
        var span=row?cr.height:cr.width,start=row?rr.top:rr.left,end=row?cr.bottom:cr.right;
        var min=row?90:180,keep=row?140:240;
        function mv(ev){var at=row?ev.clientY:ev.clientX;var px=after?(end-at):(at-start);px=Math.max(min,Math.min(px,span-keep));cont.style.setProperty(cvar,px+'px');}
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
  // MỘT danh sách phép kiểm cho MỌI đường làm tươi (lúc nạp · nút "Kiểm lại tất cả" · nhịp tự động).
  // Chép danh sách này ra nhiều chỗ thì sớm muộn cũng lệch — một bên thêm phép kiểm mới, bên kia
  // quên, và người đọc không có cách nào biết bảng đang xem tươi tới đâu.
  var SYS_CHECKS=['memory','validate','grill','paths','procs'];
  /** Nạp các check thật (/check) rồi vẽ lại inventory. `fresh` = bỏ qua cache 10′ của daemon —
   *  đúng nghĩa nút ↻; đường nạp thường vẫn ăn cache để mở cửa sổ không phải đo lại từ đầu. */
  function refreshChecks(fresh){
    return Promise.all(SYS_CHECKS.map(function(f){
      return zGet('/check?feature='+f+(fresh?'&fresh=1':'')).then(function(r){Z.checks[f]=r;})
        // Lỗi mạng/daemon bận: chỉ đánh dấu khi CHƯA có kết quả nào. Đè 'off' lên một kết quả đang
        // đúng sẽ biến một cú trượt tạm thời thành đèn đỏ sai — đúng kiểu bề mặt nói dối mà
        // `02_RULES §Bề mặt CHẾT THEO nền` cấm; giữ số cũ rồi để lượt sau sửa là trung thực hơn.
        .catch(function(){if(!Z.checks[f])Z.checks[f]={state:'off',detail:'err'};});
    })).then(function(){renderSystem();});
  }

  // ── Chấm than UPDATE ở rail (2026-08-21, user chốt): repo trong registry CŨ so với bộ chuẩn
  //    hiện hành ⇒ chip hiện ngay TRÊN chip sức khoẻ, bấm sang màn Dự án. Mọi repo khớp ⇒ ẨN
  //    HẲN (một chip xanh thường trực chỉ thêm nhiễu). Poll thưa: /harness-updates đã cache 5'
  //    phía daemon, đây chỉ hỏi lại mỗi 10' + một lần lúc mở app. Fail-open: lỗi ⇒ giữ ẩn.
  function refreshHarnessUpdates(){
    return zGet('/harness-updates').then(function(r){
      var appChip=zid('railApp'),appN=zid('railAppN'),appSub=zid('railAppSub');
      var stdChip=zid('railStd'),stdN=zid('railStdN'),stdSub=zid('railStdSub');
      if(!appChip||!stdChip)return;
      var stale=(r&&r.stale)||[];
      // Lưu để màn Dự án gắn dấu lên ĐÚNG thẻ repo cũ chuẩn — chấm cam ở rail mà bấm sang không thấy
      // thẻ nào khác thẻ nào là "nhảy vào mà không báo gì" (user 2026-08-29).
      Z.updStale=stale;
      // Đường dẫn MỚI CHẾT theo repo (plan/21 §2.3) — cùng nguồn /harness-updates, cùng chip này (user chốt 2026-09-10:
      // "có badge check repo theo chuẩn rồi, xài cái đó luôn"). Sweep canh 17 repo nhưng hàng Tính năng chỉ nói về
      // project của daemon — Dept_OPS mới chết mà UI im (đo 2026-09-10). Lưu để hộp thoại + thẻ Dự án dùng chung.
      var dead=(r&&r.deadPaths)||[];Z.updDead=dead;
      var app=r&&r.appUpdate;UPD_APP=app||null;UPD_CHECK=!(r&&r.repoStdCheck===false);
      // HAI SỰ THẬT ĐỘC LẬP, HAI CHIP — không `return` sớm nữa. Bản cũ ưu tiên "bản zemory mới" rồi
      // thoát, nên khi vừa có bản mới VỪA có repo cũ chuẩn thì vế repo BIẾN MẤT khỏi rail; user gặp
      // đúng ca đó trên máy PC và không biết mình đang cần cập nhật cái nào (2026-09-09). Cả hai chip
      // LUÔN hiện (user 2026-08-29: *"nó phải xanh khi không còn bị gì"*), cam khi có việc.
      function paint(chip,nEl,subEl,warn,title,sub){
        chip.style.display='';
        chip.classList.toggle('warn',!!warn); // icon đổi màu theo — rail thu gọn chỉ còn icon
        var d=chip.querySelector('.dot');if(d)d.className=warn?'dot warn':'dot';
        if(nEl)nEl.textContent=title+(warn?' ⚠':'');
        if(subEl)subEl.textContent=sub;
      }
      // ① BẢN ZEMORY (cấp máy) — chỉ nói về công cụ đang chạy.
      paint(appChip,appN,appSub,!!app,
        app?t('rail.updApp').replace('{v}',app.latest):t('rail.appOk'),
        app?t('rail.updAppSub').replace('{have}',app.have).replace('{from}',app.from)
           :((zid('topVersion')||{}).textContent||''));
      // ② CHUẨN REPO (cấp project) — nói về các repo trong registry, KHÔNG dính gì tới bản app.
      // Tắt công tắc kiểm repo ⇒ nói thẳng "không kiểm", không giả vờ xanh vì không đo (điều 12).
      // Chip cam khi có repo CŨ CHUẨN hoặc có repo MỚI CHẾT đường dẫn; tiêu đề ưu tiên vế chuẩn, dòng phụ nói cả hai.
      var deadSub=dead.length?t('rail.deadSub').replace('{name}',dead[0].name).replace('{n}',dead[0].newlyDead)+(dead.length>1?' +'+(dead.length-1):''):'';
      paint(stdChip,stdN,stdSub,!!(stale.length||dead.length),
        stale.length?t('rail.updOld').replace('{n}',stale.length)
          :dead.length?t('rail.deadOld').replace('{n}',dead.length)
          :!UPD_CHECK?t('rail.stdOff'):t('rail.stdOk'),
        stale.length?stale[0].name+(stale.length>1?' +'+(stale.length-1):'')+(deadSub?' · '+deadSub:'')
          :dead.length?deadSub
          :!UPD_CHECK?'':t('rail.stdOkSub').replace('{n}',((Z.status&&Z.status.knownProjects)||[]).length));
    }).catch(function(){});
  }
  // Lượt ĐẦU do zboot gọi SAU khi /ping về (ngôn ngữ + version thật). Gọi ở đây lúc nạp script thì chip
  // vẽ với LANG mặc định 'vi' và đọc #topVersion còn là placeholder "v1.0.0" — ảnh headless 2026-09-07:
  // "Đã cập nhật · v1.0.0 · repo khớp chuẩn" trên màn EN của bản 2.15.0. Nhịp 10′ giữ nguyên.
  setInterval(refreshHarnessUpdates,600000);
  /** MỘT đường chạy lại mọi phép kiểm của màn Tính năng — nút "Kiểm lại tất cả" và nhịp tự động
   *  cùng gọi hàm này. Tách ra vì hai đường chép cùng logic thì sớm muộn cũng lệch: một bên thêm
   *  nguồn mới, bên kia quên, và người đọc không có cách nào biết bảng nào tươi hơn.
   *  Kéo lại ĐỦ mọi nguồn danh sách này đọc — kể cả `/status` (harness files + knownProjects). */
  function sysRecheckAll(){
    return Promise.all([
      zGet('/status').then(renderStatus).catch(function(){}),
      zGet('/memory-status?fresh=1').then(renderMem).catch(function(){}),
      zGet('/automation').then(renderAuto).catch(function(){}),
      refreshChecks(true)
    ]).then(function(){renderSystem();});
  }
  // TỰ KIỂM ĐỊNH KỲ (user 2026-09-09). Nhịp canh 60 s, còn chu kỳ THẬT là `checksAuto.everyMin` —
  // đổi chu kỳ trong ⚙ là ăn ngay, không phải mở lại cửa sổ. Ba chốt có chủ đích:
  //  · `document.hidden` ⇒ BỎ QUA, không phải hoãn: cửa sổ khuất thì không ai đọc bảng, mà mỗi lượt
  //    là 3 endpoint + 3 phép kiểm `fresh=1` (bỏ qua cache 10′ của daemon) — đúng loại việc nền lặng
  //    lẽ mà `02_RULES` gọi là tự thêm một chỗ hỏng.
  //  · chỉ chạy khi CÔNG TẮC bật; mặc định TẮT, cùng lý lẽ autostart/autosync.
  //  · một lượt đang chạy thì không phóng lượt thứ hai (`ckBusy`) — daemon đã có write-gate, nhưng
  //    xếp chồng lượt đo lên nhau chỉ làm số về sau đè số về trước.
  var ckAt=0,ckBusy=false;
  setInterval(function(){
    if(document.hidden||ckBusy)return;
    var c=(Z.auto||{}).checksAuto;if(!c||!c.on)return;
    var every=Math.max(5,Number(c.everyMin)||30)*60000;
    if(Date.now()-ckAt<every)return;
    ckBusy=true;ckAt=Date.now();
    sysRecheckAll().then(function(){ckBusy=false;}).catch(function(){ckBusy=false;});
  },60000);
  // Bấm chấm cập nhật ⇒ HỘP tại chỗ (không nhảy màn — mục đích gốc 23/08 là "có bản mới → bấm cập nhật", kiểu VS Code):
  // trên = bản zemory (đang chạy / mới trên kênh chung / nút Cập nhật); dưới = repo cũ chuẩn (liệt kê + cách áp).
  var UPD_APP=null,UPD_CHECK=true;
  // Đếm lại nhãn nút theo số ô đang tick.
  document.addEventListener('change',function(e){
    if(e.target&&e.target.classList&&e.target.classList.contains('upd-pick')){var n=document.querySelectorAll('.upd-pick:checked').length,b=zid('updApplySel');if(b){b.textContent=t('upd.applySel').replace('{n}',n);b.disabled=!n;}return;}
    if(e.target&&e.target.id==='updCheckRepos'){var on=e.target.checked,box=e.target;
      // Ô tick cũng là một thiết lập được LƯU ⇒ hỏng thì bỏ tick về chỗ cũ + báo, đừng để nó đứng
      // đó như đã lưu (cùng luật với mọi công tắc — xem `zSave` ở core.js).
      zSave('/set-repo-std-check?on='+(on?'1':'0'),function(){box.checked=!on;}).then(function(j){if(!j)return;UPD_CHECK=on;return zGet('/harness-updates?fresh=1').then(function(){refreshHarnessUpdates().then(function(){zDlgClose();var c=zid('railStd');if(c&&c.style.display!=='none')c.click();});});});}
  });
  // "Cập nhật đã chọn": áp tuần tự từng repo đã tick (mỗi cú bấm của người dùng = lời cho phép cho ĐÚNG các repo đó).
  // Hai nút của khối "giao cho agent": chép lời nhắn · mở Graph của repo đầu tiên trong danh sách.
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('[data-act="dead-prompt-copy"],[data-act="dead-graph"]'):null;
    if(!b)return;
    if(b.getAttribute('data-act')==='dead-prompt-copy'){
      var pre=zid('deadPrompt');if(!pre)return;
      var txt=pre.textContent||'';
      // Cùng khuôn nút Chép của p2p: báo NGAY tại nút, đừng để cú bấm im lặng.
      var done=function(){var o=b.textContent;b.textContent=t('p2p.copied');setTimeout(function(){b.textContent=o;},1400);};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done).catch(function(){});
      else{try{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(_){}}
      return;
    }
    // Mở Graph: đóng hộp rồi sang màn Dự án. KHÔNG tự mở chi tiết một repo — chọn repo nào là
    // việc của người dùng, và `showProjDetail` cần cả `profile` mà danh sách đường chết không giữ.
    var dlg=document.querySelector('.dlg-back.on');if(dlg)dlg.classList.remove('on');
    if(typeof go==='function')go('projects');
  });
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
  // HAI hộp thoại RIÊNG cho hai việc riêng (user 2026-09-09: *"cái thông báo repo đã theo chuẩn là
  // khác mà"*). Gộp chung thì hộp phải kể hai câu chuyện khác cấp trong một khung, và người đọc
  // không biết nút "Cập nhật ngay" đang cập nhật CÁI GÌ — công cụ hay các repo.
  /** ① Bản zemory trên MÁY này: đang chạy gì · kênh chung có gì mới · nút tự cập nhật. */
  function updDialogApp(){
    var app=UPD_APP;
    // Nguồn đo hiện THẲNG trên hộp: 'git' = hỏi remote của repo công cụ (nguồn chính từ 2026-09-15),
    // 'channel' = tem trên kênh chung (nguồn phụ, chỉ còn dùng khi máy không hỏi được git).
    var fromGit=app&&app.source==='git';
    var body=app
      ?'<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="muted">'+stdEsc(t('upd.appHave'))+'</span><b>'+stdEsc(app.have)+'</b><span class="muted">→ '+stdEsc(t(fromGit?'upd.appLatestGit':'upd.appLatest'))+'</span><b>'+stdEsc(app.latest)+'</b></div>'
        +'<div class="muted" style="font-size:11px;margin-top:4px">'+stdEsc(t(fromGit?'upd.appFromGit':'upd.appFrom').replace('{from}',app.from||'?').replace('{at}',String(app.at||'').slice(0,16).replace('T',' ')))+'</div>'
      :'<div>'+stdEsc(t('upd.appOk').replace('{v}',((zid('topVersion')||{}).textContent||'').replace(/^v/,'')))+'</div>';
    zDialog({iconHtml:ZICON.app,title:t('upd.appTitle'),bodyHtml:'<div style="font-size:13px">'+body+'</div>',
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
  }
  /** ② Chuẩn harness của CÁC REPO: repo nào còn cũ, tick để áp, và công tắc có kiểm vòng repo không. */
  function updDialogStd(){
    // LẤY SỐ TƯƠI trước khi vẽ (user 2026-09-17: *"fix rồi, app phải tự cập nhật lại mới đúng"*). Bản cũ vẽ
    // từ `Z.updDead` của lượt poll trước — nhịp poll là 10′, nên sửa xong bằng CLI rồi mở hộp vẫn thấy số cũ.
    // `/harness-updates` đọc `deadPaths` thẳng từ state, không cache ⇒ một lượt gọi là đủ. Trượt mạng thì
    // vẽ bằng số đang có (fail-open), không để hộp trống.
    function draw(){
      var st=Z.updStale||[];
      var body=buildRepoBlock(st);
      // Nấc M (user 2026-09-10): hộp S bóp dòng "cũ → mới" của đề xuất sửa thành 3 dòng chữ dính nhau.
      zDialog({iconHtml:ZICON.std,size:'md',title:t('upd.stdTitle'),bodyHtml:'<div style="font-size:13px">'+body+'</div>',
        okLabel:t('scope.detClose'),onOk:null});
      loadFixProposals();
    }
    refreshHarnessUpdates().then(draw,draw);
  }
  // ĐỀ XUẤT SỬA đường dẫn chết (plan/21 §5.6, user 2026-09-10: "đề xuất + tick + Áp dụng"): mỗi hộp .fixbox hỏi
  // /paths-fix?root= (chạy monitor ~0,5 s/repo, nên chỉ hỏi khi mở hộp thoại, chỉ repo đang có mới chết). Đích duy nhất
  // ⇒ dòng "cũ → mới" + ô tick (mặc định tick); không có ⇒ nói thẳng "sửa tay". Cú bấm Áp dụng = lời cho phép ghi.
  function loadFixProposals(){
    Array.prototype.slice.call(document.querySelectorAll('.fixbox[data-fixroot]')).forEach(function(box){
      var root=decodeURIComponent(box.getAttribute('data-fixroot')||'');
      zGet('/paths-fix?root='+encodeURIComponent(root)).then(function(r){
        var ps=(r&&r.ok&&r.proposals)||[];
        if(!ps.length){box.textContent=r&&r.ok?t('fix.noneRows'):t('fix.fail');return;}
        var n=0;
        box.innerHTML=ps.map(function(p){
          var loc=stdEsc(p.file+':'+p.line);
          if(!p.to){return '<div class="fix-row" style="padding:2px 0">· '+loc+' <code>'+stdEsc(p.from)+'</code> — '+stdEsc(t('fix.noCand'))+((p.candidates&&p.candidates.length)?' · '+stdEsc(t('fix.ambiguous').replace('{n}',p.candidates.length)):'')+'</div>';}
          n++;
          // Hai path RÕ hai dòng "cũ:" / "mới:" (user 2026-09-10) — một dòng "cũ → mới" gãy chữ thì không đọc ra được đang đổi gì.
          return '<label class="fix-row" style="display:flex;gap:6px;align-items:flex-start;padding:3px 0;cursor:pointer"><input type="checkbox" class="fix-pick" checked style="margin-top:2px" data-fix="'+encodeURIComponent(JSON.stringify({file:p.file,line:p.line,from:p.from,to:p.to}))+'"> <span class="fix-st" style="display:grid;grid-template-columns:auto 1fr;gap:1px 8px;word-break:break-all;min-width:0"><span style="grid-column:1/3">'+loc+'</span><span class="muted">'+stdEsc(t('fix.old'))+'</span><code>'+stdEsc(p.from)+'</code><span class="muted">'+stdEsc(t('fix.new'))+'</span><code>'+stdEsc(p.to)+'</code></span></label>';
        }).join('')+(n?'<div style="display:flex;gap:8px;align-items:center;margin-top:4px"><button class="btn sm primary fix-apply" data-fixroot="'+encodeURIComponent(root)+'">'+stdEsc(t('fix.apply').replace('{n}',n))+'</button><span class="muted">'+stdEsc(t('fix.consent'))+'</span></div>':'');
        box.classList.remove('muted');
      }).catch(function(){box.textContent=t('fix.fail');});
    });
  }
  document.addEventListener('change',function(e){
    if(!(e.target&&e.target.classList&&e.target.classList.contains('fix-pick')))return;
    var box=e.target.closest('.fixbox');if(!box)return;
    var n=box.querySelectorAll('.fix-pick:checked').length,b=box.querySelector('.fix-apply');
    if(b){b.textContent=t('fix.apply').replace('{n}',n);b.disabled=!n;}
  });
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('.fix-apply'):null;if(!btn)return;
    var box=btn.closest('.fixbox'),root=decodeURIComponent(btn.getAttribute('data-fixroot')||'');
    var picks=Array.prototype.slice.call(box.querySelectorAll('.fix-pick:checked'));
    var fixes=picks.map(function(c){return JSON.parse(decodeURIComponent(c.getAttribute('data-fix')));});
    if(!fixes.length)return;
    btn.disabled=true;btn.textContent='…';
    zPost('/paths-fix-apply?root='+encodeURIComponent(root)+'&fixes='+encodeURIComponent(JSON.stringify(fixes))).then(function(r){
      r=r||{};var rs=r.results||[];var ok=rs.filter(function(x){return x.ok;}).length;
      picks.forEach(function(c,i){var res=rs[i]||{};var st=c.parentNode.querySelector('.fix-st');c.disabled=true;if(res.ok){c.checked=false;if(st)st.innerHTML='✓ '+st.innerHTML;}else if(st){st.innerHTML=st.innerHTML+' <span class="muted">✗ '+stdEsc(res.error||t('fix.fail'))+'</span>';}});
      btn.textContent=t('fix.applied').replace('{n}',ok).replace('{m}',rs.length);
      zGet('/harness-updates?fresh=1').then(function(){refreshHarnessUpdates();});
    }).catch(function(){btn.textContent=t('fix.fail');btn.disabled=false;});
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest)return;
    if(e.target.closest('#railApp')){updDialogApp();return;}
    if(e.target.closest('#railStd')){updDialogStd();return;}
  });
  /** Thân hộp ② — chỉ nói về CÁC REPO. Không chèn một chữ nào về bản zemory: đó là hộp ①. */
  function buildRepoBlock(st){
    // Mỗi repo một nút "Cập nhật repo": cú bấm của người dùng LÀ lời cho phép ghi vào repo đó (02_RULES
    // §Phạm vi cấm ghi chéo KHI CHƯA ĐƯỢC PHÉP). Làm đúng việc `zemory sync` + `hook guard` làm, không hơn.
    // Repo cũ chuẩn: ô TICK từng repo (mặc định tick) + một nút "Cập nhật đã chọn (n)"; công tắc "Kiểm các repo khác
    // dùng chuẩn" ở đáy hộp (user 2026-08-29) — tắt thì chip chỉ còn báo bản zemory.
    // HAI MỤC TÁCH RỜI, mỗi mục một tiêu đề + một dòng trạng thái (user 2026-09-10: khối trên không tiêu đề, khối dưới có,
    // hàng repo chỉ một con số trơ ⇒ "báo cáo không rõ"). Mục ① chuẩn harness · mục ② đường dẫn mới chết; kẻ ngăn giữa.
    var known=((Z.status&&Z.status.knownProjects)||[]).length;
    var hdr=function(key,n,first){return '<div class="sys-grp" style="margin-top:'+(first?'0':'14px')+(first?'':';padding-top:10px;border-top:1px solid var(--border)')+'">'+stdEsc(t(key).replace('{n}',n))+'</div>';};
    var line=function(txt,cls){return '<div class="'+(cls||'muted')+'" style="margin-top:2px;font-size:12px">'+stdEsc(txt)+'</div>';};
    // ① CHUẨN HARNESS
    var repos=hdr('upd.stdHdr',known,true);
    repos+=!UPD_CHECK
      ?line(t('upd.stdOff'))
      :st.length
      ?line(t('upd.repoHdr').replace('{n}',st.length))+'<div style="font-size:12.5px">'+st.map(function(x){return '<label class="upd-row" data-root="'+stdEsc(x.root)+'" style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer"><input type="checkbox" class="upd-pick" data-root="'+stdEsc(x.root)+'" checked> ⚠ <b>'+stdEsc(x.name)+'</b> <span class="muted upd-st" style="font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+stdEsc(x.root)+'</span></label>';}).join('')+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button class="btn sm primary" id="updApplySel">'+stdEsc(t('upd.applySel').replace('{n}',st.length))+'</button><span class="muted" style="font-size:11px">'+stdEsc(t('upd.repoHint'))+'</span></div>'
      :line('✓ '+t('upd.repoNone'));
    // ② ĐƯỜNG DẪN MỚI CHẾT (đọc từ state của sweep — không quét). Chỉ liệt kê + chỉ đường xem dòng cụ thể; sửa nguồn là việc
    // của agent/user bên repo đó (plan/21 §8). Hàng nói đủ: tên repo · N đường mới chết · mẫu · từ ngày.
    //
    /** Lời nhắn dán thẳng cho agent của repo đó. Nêu SỐ ĐO thật + lệnh tự kiểm, và nói rõ hai
     *  ràng buộc dễ bị phá nhất khi sửa hàng loạt: giữ EOL, và đường trong file TỪ ĐIỂN thì
     *  không phải con trỏ (`plan/21 §2.2` — đó là nguồn báo oan lớn nhất của phép kiểm này). */
    function deadPrompt(list){
      var head=t('fix.promptBody').replace('{n}',list.length);
      var lines=list.map(function(x){
        var smp=(x.sample||[]).slice(0,3).join(' · ');
        return '- ' + (x.root||'') + '  (' + (x.newlyDead||0) + ')' + (smp?('  ⟵ '+smp):'');
      }).join('\n');
      return head+'\n'+lines+'\n\n'+t('fix.promptSteps');
    }
    var dd=Z.updDead||[];
    repos+=hdr('upd.deadHdr',dd.length,false);
    repos+=dd.length
      ?line(t('upd.deadStatus').replace('{n}',dd.length),'')+'<div style="font-size:12.5px">'+dd.map(function(x){var smp=(x.sample||[]).join(' · ');return '<div class="upd-row" data-root="'+stdEsc(x.root)+'" style="padding:3px 0"><div style="display:flex;align-items:center;gap:8px">⚠ <b>'+stdEsc(x.name)+'</b> <span style="font-size:12px">'+stdEsc(t('upd.deadRow').replace('{n}',x.newlyDead))+(x.since?' · '+stdEsc(t('upd.deadSince').replace('{d}',String(x.since).slice(0,10))):'')+'</span></div><div class="muted" style="font-size:11px;padding-left:22px;word-break:break-all">'+stdEsc(smp)+'</div><div class="fixbox muted" data-fixroot="'+encodeURIComponent(x.root)+'" style="font-size:11px;padding-left:22px;margin-top:3px">'+stdEsc(t('fix.loading'))+'</div></div>';}).join('')+'</div>'
        +'<div class="muted" style="font-size:11px;margin-top:4px">'+stdEsc(t('upd.deadHint'))+'</div>'
        // GIAO CHO AGENT: hộp vốn chỉ nói "sửa tay hoặc giao A.I sửa" mà không đưa gì để giao.
        // Một lời mời không kèm thứ dán được thì người dùng vẫn phải tự ngồi soạn (user 2026-09-16).
        // Prompt dựng từ CHÍNH số vừa đo, không phải mẫu chung: repo nào · bao nhiêu đường · mẫu nào.
        +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">'
        +'<b style="font-size:12px">'+stdEsc(t('fix.promptH'))+'</b>'
        +'<button class="btn sm" data-act="dead-prompt-copy">'+stdEsc(t('p2p.copy'))+'</button>'
        +'<button class="btn sm" data-act="dead-graph">'+stdEsc(t('fix.openGraph'))+'</button>'
        +'</div>'
        +'<pre id="deadPrompt" style="margin:0;background:var(--surface-3);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:11px;line-height:1.6;white-space:pre-wrap;color:var(--text)">'+stdEsc(deadPrompt(dd))+'</pre>'
        +'<div class="muted" style="font-size:11px;margin-top:4px">'+stdEsc(t('fix.promptHint'))+'</div>'
        +'</div>'
      :line('✓ '+t('upd.deadNone'));
    repos+='<label style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;cursor:pointer"><input type="checkbox" id="updCheckRepos"'+(UPD_CHECK?' checked':'')+'> '+stdEsc(t('upd.checkRepos'))+'</label>';
    return repos;
  }
