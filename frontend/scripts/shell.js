// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // 6 màn nav (gộp 2026-07-25 từ 9 — Sessions→Recall›Phiên · Insights→Global Memory›Xu hướng
  // · System→Trang chủ›Tính năng). Mỗi màn nhiều việc thì tách SUB-TAB, không đẻ tab nav mới.
  // 5 màn nav. Gộp 2026-07-25/26 từ 9: Sessions→Recall›Phiên · Insights+Nạp&Đồng bộ→Global
  // Memory · System→Trang chủ›Tính năng. Màn nào nhiều việc thì tách SUB-TAB, KHÔNG đẻ tab nav.
  // Tiêu đề + phụ đề từng màn. Giữ dạng KEY chứ không phải chữ cứng: `go()` gọi t() lúc
  // vẽ nên đổi ngôn ngữ là đổi luôn, không cần dựng lại bảng.
  var TITLES={home:['Home','ttl.home'],
    system:['nav.system','ttl.system'],
    recall:['Recall','ttl.recall'],
    projects:['Projects','ttl.projects'],
    gmem:['Global Memory','ttl.gmem'],
    harness:['Harness','ttl.harness']};
  // screen → attribute của sub-tab trong màn đó (cho data-goto="screen:sub")
  var SUBATTR={recall:'data-rc',gmem:'data-gm',harness:'data-ht'};
  var scrollEl=document.getElementById('scroll'); // đổi tên: window.scroll là hàm builtin, de-IIFE mà giữ tên cũ là ghi đè nó
  function go(s){
    document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.dataset.s===s);});
    document.querySelectorAll('.screen').forEach(function(el){el.classList.toggle('on',el.dataset.s===s);});
    var ti=TITLES[s]||['',''];
    // t() trả về chính key khi không có bản dịch ⇒ 'Home'/'Recall' giữ nguyên, an toàn.
    document.getElementById('topTitle').innerHTML='<h1>'+stdEsc(t(ti[0]))+'</h1><p>'+stdEsc(t(ti[1]))+'</p>';
    if(scrollEl)scrollEl.scrollTop=0;try{localStorage.setItem('zemory.app.screen',s);}catch(e){}
    if(s==='projects')showProjList();
    ensureScreen(s);
  }
  document.getElementById('nav').addEventListener('click',function(e){var a=e.target.closest('a[data-s]');if(a)go(a.dataset.s);});
  // ── SUB-TAB (data-pt project · data-ht harness · data-rc recall · data-gm gmem)
  //    subApply = chỉ lật class (dùng lúc restore) · subSet = lật + nhớ + nạp dữ liệu.
  function subApply(attr,v){
    var b=document.querySelector('.tabs button['+attr+'="'+v+'"]');if(!b)return null;
    var scope=b.closest('.screen, #projDetail');if(!scope)return null;
    scope.querySelectorAll('.tabs button['+attr+']').forEach(function(x){x.classList.toggle('on',x===b);});
    scope.querySelectorAll('.sub['+attr+']').forEach(function(x){x.classList.toggle('on',x.getAttribute(attr)===v);});
    return b;
  }
  function subLoad(attr,v){
    if(attr==='data-pt'){if(v==='graph'){gApplyLayout();loadProjGraph(curProjRoot);}else if(v==='harness')loadProjHarness(curProjRoot);return;}
    if(attr==='data-rc'&&v==='sess')loadSessions();
    else if(attr==='data-gm'&&v==='mem')renderInsights();
  }
  function subOf(screen){var a=SUBATTR[screen];if(!a)return null;
    var b=document.querySelector('.screen[data-s="'+screen+'"] .tabs button['+a+'].on');return b?b.getAttribute(a):null;}
  // data-pt KHÔNG persist: mở 1 project luôn về sub-tab Harness (showProjDetail reset).
  var PERSIST={'data-rc':'recall','data-gm':'gmem','data-ht':'harness'};
  function subSet(attr,v){if(!subApply(attr,v))return;
    var k=PERSIST[attr];if(k){try{localStorage.setItem('zemory.sub.'+k,v);}catch(_){}}
    subLoad(attr,v);
  }
  // Vào 1 màn thì chỉ nạp đúng sub-tab đang mở (không fetch cho sub đang ẩn).
  function ensureScreen(s){
    if(s==='system'){renderSystem();return;}   // màn phẳng, không sub-tab
    var a=SUBATTR[s],v=subOf(s);if(a&&v)subLoad(a,v);
  }
  function subtabs(attr){
    document.addEventListener('click',function(e){
      var b=e.target.closest('.tabs button['+attr+']');if(!b)return;
      subSet(attr,b.getAttribute(attr));
    });
  }
  subtabs('data-pt');subtabs('data-ht');subtabs('data-rc');subtabs('data-gm');
  // data-goto="screen:sub" — nhảy màn + mở đúng sub-tab (thay cho việc đẻ tab nav mới)
  document.addEventListener('click',function(e){
    var g=e.target.closest&&e.target.closest('[data-goto]');if(!g)return;
    var p=String(g.dataset.goto).split(':');go(p[0]);if(p[1]&&SUBATTR[p[0]])subSet(SUBATTR[p[0]],p[1]);
  });
  // projects list <-> detail
  function showProjList(){document.getElementById('projList').style.display='flex';document.getElementById('projDetail').style.display='none';}
  function showProjDetail(prof,root){
    curProjRoot=root||'';gLoadedRoot=null;gData=null;
    document.getElementById('projList').style.display='none';
    var d=document.getElementById('projDetail');d.style.display='flex';
    document.getElementById('projProf').textContent=prof==='non-app'?'NON-APP':'APP';
    // reset to harness sub-tab
    d.querySelectorAll('.tabs button[data-pt]').forEach(function(x,i){x.classList.toggle('on',i===0);});
    d.querySelectorAll('.sub[data-pt]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-pt')==='harness');});
    loadProjHarness(curProjRoot);
  }
  // Project-card → detail (works for real cards too; pin/forget + hit-select are
  // handled by the Phase-2 wiring block below, not here, to avoid double firing).
  document.addEventListener('click',function(e){
    var pc=e.target.closest('.proj-card');
    if(pc&&!e.target.closest('.acts')){document.getElementById('projName').textContent=pc.querySelector('.nm').textContent;showProjDetail(pc.dataset.prof||'app',pc.dataset.openProj);}
    if(e.target.id==='projBack')showProjList();
    var nv=e.target.closest('[data-nav]');if(nv)go(nv.dataset.nav);
  });
  // theme
  function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('zemory.app.theme',t);}catch(e){}
    var d=document.getElementById('setDark'),l=document.getElementById('setLight');if(d&&l){d.classList.toggle('on',t==='dark');l.classList.toggle('on',t==='light');}}
  document.addEventListener('click',function(e){if(e.target.id==='setLight')setTheme('light');if(e.target.id==='setDark')setTheme('dark');});
  // Settings dialog (M) — opened by the ⚙ in the top-right; ESC / backdrop / ✕ close.
  function openSettings(){var d=document.getElementById('settingsDlg');if(d)d.classList.add('on');
    // About: fill from data already fetched (version/host from /ping, DB dir from /memory-status).
    zset('aboutVer',((zid('dlgVer')||{}).textContent||'—'));
    zset('aboutHost',((zid('railMachine')||{}).textContent||'—'));
    var st=(Z.mem&&Z.mem.storage)||{};zset('aboutDb',st.dbPath||st.dir||'—');
  }
  function closeSettings(){var d=document.getElementById('settingsDlg');if(d)d.classList.remove('on');}
  document.addEventListener('click',function(e){
    if(e.target.id==='topSettings'){openSettings();return;}
    if(e.target.id==='settingsClose'||e.target.id==='settingsDlg')closeSettings();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var open=document.querySelectorAll('.dlg-back.on');if(open.length)open.forEach(function(d){d.classList.remove('on');});}});
  // ---- Native OS folder picker (shared by Add-Project dialog · Drive link · DB relocate) ----
  function gPickFolder(inputId,cb){
    var inp=zid(inputId);
    var start=(inp&&inp.value.trim())||'';
    zPost('/pick-folder?start='+encodeURIComponent(start)).then(function(r){
      if(r&&r.ok&&r.path){if(inp)inp.value=r.path;}
      else if(r&&r.unsupported){zToast(t('addp.noPicker'));}
      if(cb)cb(r);
    }).catch(function(){});
  }
  function gPickFile(inputId,filter){
    var inp=zid(inputId);var start=(inp&&inp.value.trim())||'';
    zPost('/pick-file?filter='+encodeURIComponent(filter||'')+'&start='+encodeURIComponent(start)).then(function(r){
      if(r&&r.ok&&r.path){if(inp)inp.value=r.path;}
      else if(r&&r.unsupported){zDlgMsg(t('addp.noPicker'));}
    }).catch(function(){});
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#rsBrowse')){gPickFile('rsPath','SQLite DB (*.db)|*.db|All files (*.*)|*.*');}});
  // ---- Add Project dialog (S) — real dialog + native folder picker, not prompt() ----
  function openAddProjDlg(){var d=zid('addProjDlg');if(!d)return;d.classList.add('on');zset('addProjMsg','');var i=zid('addProjPath');if(i){i.value='';setTimeout(function(){i.focus();},30);}}
  function closeAddProjDlg(){var d=zid('addProjDlg');if(d)d.classList.remove('on');}
  function confirmAddProj(){
    var p=(zid('addProjPath')&&zid('addProjPath').value.trim())||'';
    if(!p){zset('addProjMsg',t('addp.needPath'));return;}
    zset('addProjMsg',t('addp.adding'));
    zPost('/add-project?root='+encodeURIComponent(p)).then(function(r){
      if(!r||r.ok===false){zset('addProjMsg','✗ '+((r&&r.error)||t('q.err')));return;}
      if(r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;
      closeAddProjDlg();
      zGet('/memory-status?fresh=1').then(renderMem);
    }).catch(function(){zset('addProjMsg','✗ '+t('q.err'));});
  }
  document.addEventListener('click',function(e){
    if(e.target.id==='addProjClose'||e.target.id==='addProjDlg'||e.target.id==='addProjCancel'){closeAddProjDlg();return;}
    if(e.target.id==='addProjOk'){confirmAddProj();return;}
    if(e.target.closest&&e.target.closest('#addProjBrowse')){gPickFolder('addProjPath');return;}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='addProjPath'){confirmAddProj();}});
  // full folder-structure standard (03_STRUCTURE §3) + routing (§4) — per profile.
  // rows: [depth, name, marker(req|opt|gi|''), note]
  var STRUCT={app:[
    [0,'App/','req','1 app = cây này (monorepo → apps/<app>/)'],
    [1,'backend/','req','server-side: code mình + entry (100% của mình)'],
    [2,'src/','req','nơi CHỨA code — layer-first (phẳng) / domain-first (src/<domain>/)'],
    [3,'api/','opt','endpoint app MÌNH mở (REST/route + health-check)'],
    [3,'integrations/','opt','client gọi SERVICE ngoài (Stripe/Slack/S3…)'],
    [3,'store/','opt','data-access: driver + schema (+ queries.* gom SQL)'],
    [3,'services/','opt','business logic (nghiệp vụ cốt lõi)'],
    [3,'ai/','opt','provider LLM: interface + adapter (local/OpenAI/Anthropic)'],
    [3,'agents/','opt','vòng lặp agent: planning / state-machine'],
    [3,'tools/','opt','định nghĩa tool cho LLM gọi (schema + binding)'],
    [3,'search/','opt','index & retrieval (FTS / vector / Elastic)'],
    [3,'jobs/','opt','job nền / cron / queue / scheduled'],
    [3,'core/','opt','composition root: DI / registry / router / lifecycle'],
    [3,'auth·vault·config·logging·i18n·migrations','opt','cross-cutting — LUÔN ở src/ gốc'],
    [3,'shared/','opt','type + runtime dùng chung BE↔FE (zod/hằng/pure)'],
    [3,'util/','opt','helper thuần (format/date/string)'],
    [2,'test/·scripts/·resources/','opt','test · dev/build/ops · resource đóng gói tracked'],
    [2,'run.* | package.json','req','entry chạy HOẶC manifest (bin/main)'],
    [1,'frontend/','req','UI (mọi app đều có, kể cả tool ít UI)'],
    [2,'assets·components·styles·pages','opt','media · component (Dialog/seam) · token/theme · route'],
    [2,'state·hooks·api·locales','opt','state client · hook · gọi BE · i18n UI'],
    [1,'docs/','req','harness: agent/ 01→06 · plan/ · .harness.json'],
    [1,'AGENTS.md','req','cửa vào harness (router thuần, 0 luật)'],
    [1,'config·external·attic·share','opt','operator · code ngoài clone · backup · bundle sync .enc'],
    [1,'data/','gi','runtime: state/cache/logs/models/secrets/uploads'],
  ],nonapp:[
    [0,'Project/','req','sản phẩm/tài sản (BI/report · data · docs · design)'],
    [1,'docs/','req','harness: agent/ · plan/ · .harness.json (+ dictionary.md opt)'],
    [1,'AGENTS.md','req','cửa vào harness'],
    [1,'reports | models | content | design','req','≥1 DELIVERABLE (sản phẩm giao)'],
    [1,'tasks/','opt','NN_<cadence>/ đơn vị việc định kỳ (mirror data/<task>/)'],
    [1,'templates/','opt','file chờ ĐIỀN (khác fixtures/)'],
    [1,'sources·measures·queries','opt','nguồn · DAX/metric · SQL/M đặt tên'],
    [1,'pipelines·notebooks·scripts','opt','ETL · phân tích · automation thin (agent lái)'],
    [1,'fixtures·assets·config·attic','opt','mẫu nhỏ tracked · media · operator · backup'],
    [1,'data/','gi','extract/ · adhoc/ · <task>/ (adhoc ≠ task) · exports/ · .env'],
  ]};
  var ROUTE={app:[
    ['endpoint mình mở','backend/src/api/'],['gọi SaaS ngoài','integrations/'],
    ['nối DATABASE','store/ (+ queries.*)'],['business logic','services/'],
    ['model AI / LLM','ai/ + resources/prompts/'],['vòng lặp agent','agents/'],
    ['search / index','search/'],['job nền / cron','jobs/'],
    ['wiring / DI / registry','core/'],['auth / login','auth/ (+ middleware/)'],
    ['mã hoá / key','vault/ (+ store/ at-rest)'],['dùng chung BE↔FE','shared/'],
    ['UI component / trang','frontend/components · pages'],['token / CSS / 3-size','frontend/styles/'],
    ['panel resize seam (§5)','frontend/components + styles'],['tài liệu / rule / plan','docs/ (sửa .md trực tiếp)'],
  ],nonapp:[
    ['sản phẩm giao','reports | models | content'],['việc định kỳ (tuần/tháng)','tasks/NN_<cadence>/'],
    ['file chờ điền','templates/'],['metric / DAX','measures/'],
    ['câu SQL / M query','queries/'],['ETL / pipeline','pipelines/'],
    ['dữ liệu kéo về (thô)','data/extract/'],['việc lẻ 1 lần','data/adhoc/ (≠ task)'],
    ['tự động KÉO/ĐIỀN/UPLOAD','scripts/ + playbook 04_SKILLS'],['tài liệu / chuẩn','docs/ (+ dictionary.md)'],
  ]};
  var stdProf='app',stdFile='AGENTS.md';
  // NGUỒN của hai bảng dưới = `/standard-spec`, đọc thẳng từ `03_STRUCTURE.md`.
  // Trước 2026-07-27 chúng là hai mảng hardcode TAY trong file này, và đã lệch nặng:
  // cây 35/90 hàng · routing 26/66 dòng, chữ lại viết tắt khác nguồn. Màn này là màn TRA
  // CỨU — hiện thiếu 60% mà không báo gì là kiểu hỏng tệ nhất.
  // FAIL-OPEN: fetch/parse hỏng ⇒ rơi về STRUCT/ROUTE cũ để UI không bao giờ trắng.
  var specCache={};
  function specRows(){
    var sp=specCache[stdProf];
    if(!sp||!sp.tree||!sp.tree.length)
      return {tree:(STRUCT[stdProf]||[]).map(function(s){return {depth:s[0],name:s[1],marker:s[2],note:s[3]};}),
              routing:(ROUTE[stdProf]||[]).map(function(r){return {concern:r[0],where:r[1]};}),fallback:true};
    return sp;
  }
  function loadSpec(){
    var pr=stdProf==='app'?'app':'non-app';
    if(specCache[stdProf])return Promise.resolve();
    return zGet('/standard-spec?profile='+pr).then(function(d){if(d&&d.tree)specCache[stdProf]=d;}).catch(function(){});
  }
  function structRender(){
    var st=document.getElementById('structTree');if(!st)return;
    var sp=specRows();
    document.getElementById('structProf').textContent='hệ '+(stdProf==='app'?'APP':'NON-APP')+(sp.fallback?' · bản dự phòng':'');
    st.innerHTML=sp.tree.map(function(n){
      var s=[n.depth,n.name,n.marker,n.note];
      var dir=/[\/·|]/.test(s[1]);
      var tag=s[2]==='req'?'<span class="stag req">★</span>':s[2]==='opt'?'<span class="stag">opt</span>':s[2]==='gi'?'<span class="stag gi">gitignore</span>':'';
      return '<div class="strow" style="padding-left:'+(s[0]*15+2)+'px"><span class="sic">'+(dir?'📁':'📄')+'</span><span class="sname">'+stdEsc(s[1])+'</span>'+tag+'<span class="snote">'+stdEsc(s[3])+'</span></div>';
    }).join('');
    document.getElementById('routeTable').innerHTML=sp.routing.map(function(r){
      return '<div class="rrow"><span class="rneed">'+stdEsc(r.concern)+'</span><span class="rslot">'+stdEsc(r.where)+'</span></div>';
    }).join('');
  }
  // renderHarness: cả HAI bảng đều đọc từ nguồn thật — docs qua /standard-doc,
  // cây + routing qua /standard-spec (parse từ 03_STRUCTURE.md).
  function renderHarness(){stdRenderReal();structRender();loadSpec().then(structRender);}
  document.addEventListener('click',function(e){
    if(e.target.id==='stdApp'){stdProf='app';renderHarness();return;}
    if(e.target.id==='stdNon'){stdProf='nonapp';renderHarness();return;}
    var ti=e.target.closest('#stdTree .ti');if(ti&&ti.dataset.f){stdFile=ti.dataset.f;stdRenderReal();}
  });
  // fake graph

  // ── DỜI TỪ graph.js 2026-08-07: màn Home, không phải graph
  function loadRecentSessions(){
    var box=zid('homeSessions');if(!box)return;
    zGet('/recent-sessions?limit=6').then(function(list){
      if(!list||!list.length){box.innerHTML='<div class="muted">'+t('home.noSessions')+'</div>';return;}
      // KHÔNG đoán App/Non-app từ TÊN project ở đây. Bản cũ dùng regex /PBI|powerbi/ —
      // đúng cái "badge đoán bừa" đã bị gỡ khỏi card project (changelog 2026-07-25), nhưng
      // còn sót lại ở hàng này. Payload /recent-sessions không mang `profile`, và một nhãn
      // ĐOÁN thì tệ hơn không có nhãn: người đọc tưởng đó là sự thật đọc từ .harness.json.
      box.innerHTML=list.map(function(s){var title=(s.title&&String(s.title).trim())||t('sess.untitled');return '<div class="row" data-open-proj="'+stdEsc(s.project||'')+'" style="cursor:pointer"><div class="l"><div class="ico">◆</div><div><div class="nm">'+stdEsc(String(title).slice(0,50))+'</div><div class="meta">'+stdEsc(zProjName(s.project))+' · '+stdEsc(s.source||'')+'</div></div></div><span class="meta">'+relTime(s.endedAt).big+'</span></div>';}).join('');
    }).catch(function(){});
  }
  // Roll-up sức khoẻ — đếm TRUNG THỰC (không trọng số bịa, điều 12): 'on'=OK ·
  // 'warn'/'off'=cảnh báo · 'dim'=tắt-có-chủ-đích, KHÔNG tính là lỗi.
  // MỘT nguồn duy nhất = FEATURES + sysStatus() (trước 2026-07-25 còn một list check
  // thứ hai hardcode ở Home — 2 chỗ phải sửa song song, tất yếu lệch nhau).
