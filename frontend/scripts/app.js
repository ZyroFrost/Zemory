(function(){
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
  var scroll=document.getElementById('scroll');
  function go(s){
    document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.dataset.s===s);});
    document.querySelectorAll('.screen').forEach(function(el){el.classList.toggle('on',el.dataset.s===s);});
    var ti=TITLES[s]||['',''];
    // t() trả về chính key khi không có bản dịch ⇒ 'Home'/'Recall' giữ nguyên, an toàn.
    document.getElementById('topTitle').innerHTML='<h1>'+stdEsc(t(ti[0]))+'</h1><p>'+stdEsc(t(ti[1]))+'</p>';
    if(scroll)scroll.scrollTop=0;try{localStorage.setItem('zemory.app.screen',s);}catch(e){}
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
  // ---- Reusable dialog (confirm + input) — replaces browser prompt()/confirm() ----
  // o:{icon,title,bodyHtml,okLabel,cancelLabel,danger,onOk,focus}. onOk() runs on
  // OK; return true to KEEP the dialog open (validation error / async in progress),
  // otherwise it closes. Async flows show progress via zDlgMsg() then zDlgClose().
  var zToastT=null;
  function zToast(x){var el=zid('zToast');if(!el)return;el.textContent=x||'';el.classList.add('on');clearTimeout(zToastT);zToastT=setTimeout(function(){el.classList.remove('on');},2600);}
  var zDlgOnOk=null;
  function zDlgMsg(x){zset('zDlgMsg',x||'');}
  function zDlgClose(){var d=zid('zDlg');if(d)d.classList.remove('on');zDlgOnOk=null;}
  function zDialog(o){var d=zid('zDlg');if(!d)return;o=o||{};
    zset('zDlgIcon',o.icon||'?');zset('zDlgTitle',o.title||'');
    zid('zDlgBody').innerHTML=o.bodyHtml||'';zset('zDlgMsg','');
    var ok=zid('zDlgOk');ok.textContent=o.okLabel||'OK';ok.className='btn sm '+(o.danger?'danger':'primary');ok.disabled=false;
    zset('zDlgCancel',o.cancelLabel||t('addp.cancel'));
    zDlgOnOk=o.onOk||null;d.classList.add('on');
    if(o.focus){var f=d.querySelector(o.focus);if(f)setTimeout(function(){f.focus();},30);}
  }
  function zConfirm(o){zDialog({icon:o.danger?'⚠':'?',title:o.title,bodyHtml:'<div style="font-size:13px;line-height:1.6;white-space:pre-line">'+stdEsc(o.body||'')+'</div>',okLabel:o.okLabel,danger:o.danger,onOk:o.onOk});}
  document.addEventListener('click',function(e){
    if(e.target.id==='zDlgX'||e.target.id==='zDlg'||e.target.id==='zDlgCancel'){zDlgClose();return;}
    if(e.target.id==='zDlgOk'){if(zDlgOnOk){if(zDlgOnOk()!==true)zDlgClose();}else zDlgClose();return;}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Enter'){var d=zid('zDlg');if(d&&d.classList.contains('on')){var tg=e.target&&e.target.tagName;if(tg!=='TEXTAREA'){e.preventDefault();if(zDlgOnOk){if(zDlgOnOk()!==true)zDlgClose();}else zDlgClose();}}}});
  // stdMd/stdEsc below: shared markdown renderer for harness + standard doc viewers (real .md fetched live).
  function stdEsc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function stdMd(txt){return txt.split('\n').map(function(l){
    if(l.slice(0,3)==='## ')return '<div class="h h2">'+stdEsc(l.slice(3))+'</div>';
    if(l.charAt(0)==='#')return '<div class="h h1">'+stdEsc(l.replace(/^#+\s*/,''))+'</div>';
    if(l.charAt(0)==='>')return '<div class="q">'+stdEsc(l.replace(/^>\s?/,''))+'</div>';
    if(l.slice(0,2)==='- ')return '<div class="li">• '+stdEsc(l.slice(2))+'</div>';
    if(l.trim()==='')return '<div class="sp"></div>';
    return '<div>'+stdEsc(l)+'</div>';
  }).join('');}
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
  renderHarness();
  // fake graph

  // ── Per-project code graph + folder tree beside it (nodes=files, label=file name,
  //    edges=imports). Structure ↔ graph sync · zoom/pan · kéo node · Ctrl+Z · layouts.
  // gSelIds = NGUỒN SỰ THẬT của lựa chọn trên graph (1 hoặc nhiều node) — xem gPaintSel().
  var curProjRoot='',gData=null,gLoadedRoot=null,gState=null,gview=null,gUndo=[],gRedo=[],gSuppressClick=false,gSelIds=[];
  var gTreeCache=null,gCollapsed={},gTreeRoot='';
  var GCOLORS=['var(--success)','#7fb2e8','var(--primary)','var(--warn)','#b08fe8','#8fd3d3','#c9c98f'];
  function gSlotColor(slot){if(!slot)return 'var(--text-faint)';var h=0;for(var i=0;i<slot.length;i++)h=(h*31+slot.charCodeAt(i))&0xffff;return GCOLORS[h%GCOLORS.length];}
  // ---- folder tree (structure beside graph) ----
  function gCollKey(r){return 'zemory.ptree:'+r;}
  function gLoadColl(r){try{return JSON.parse(localStorage.getItem(gCollKey(r))||'{}')||{};}catch(e){return {};}}
  function gSaveColl(){try{localStorage.setItem(gCollKey(gTreeRoot),JSON.stringify(gCollapsed));}catch(e){}}
  function gTreeNodeHtml(n){
    if(n.isFile)return '<div class="tnode"><div class="trow file" data-path="'+stdEsc(n.path)+'" data-file="1" title="'+stdEsc(n.path)+'"><span class="ttw leaf">▾</span><span class="tfi">📄</span><span class="tname">'+stdEsc(n.name)+'</span></div></div>';
    var kids=n.children&&n.children.length,coll=!!gCollapsed[n.path];
    var role=n.role?'<span class="trole">'+stdEsc(n.role)+'</span>':(n.known?'':'<span class="trole">ngoài chuẩn</span>');
    var tw=kids?'<span class="ttw'+(coll?' collapsed':'')+'" data-tw="'+stdEsc(n.path)+'">▾</span>':'<span class="ttw leaf">▾</span>';
    var h='<div class="tnode'+(coll?' collapsed':'')+'"><div class="trow'+(n.known?'':' unknown')+'" data-path="'+stdEsc(n.path)+'" title="'+stdEsc(n.path)+'">'+tw+'<span class="tname">'+stdEsc(n.name)+'/</span>'+role+'</div>';
    if(kids)h+='<div class="tchildren">'+n.children.map(gTreeNodeHtml).join('')+'</div>';
    return h+'</div>';}
  function gPaintTree(data){var box=zid('pgTree');if(!box)return;var tree=(data&&data.tree)||[];
    if(!tree.length){box.innerHTML='<div class="muted" style="font-size:11.5px">Không có thư mục.</div>';return;}
    var used=(data.usedSlots||[]).length,unk=(data.unknownDirs||[]).length;
    box.innerHTML='<div class="tree-bar"><button class="btn sm" data-tact="collapse" title="Thu gọn hết">⊟</button><button class="btn sm" data-tact="expand" title="Mở hết">⊞</button></div>'+tree.map(gTreeNodeHtml).join('')+'<div class="tree-legend">'+used+' slot chuẩn'+(unk?' · '+unk+' ngoài chuẩn':'')+'</div>';}
  function gSetAllColl(on){var d=gTreeCache;if(!d)return;gCollapsed={};if(on){(function walk(ns){ns.forEach(function(n){if(n.children&&n.children.length){gCollapsed[n.path]=true;walk(n.children);}});})(d.tree||[]);}gSaveColl();gPaintTree(d);}
  function gLoadTree(root){var box=zid('pgTree');if(!box)return;gTreeRoot=root;gCollapsed=gLoadColl(root);
    box.innerHTML='<div class="muted" style="font-size:11.5px">Đang đọc cây thư mục…</div>';
    zGet('/folder-tree?root='+encodeURIComponent(root)).then(function(d){gTreeCache=d;gPaintTree(d);}).catch(function(){box.innerHTML='<div class="muted" style="font-size:11.5px">Lỗi đọc cây.</div>';});}
  // ---- layouts (force · cluster · layers) ----
  function gRnd(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  // Node spacing (user setting): scales the layout's virtual canvas — node/label
  // size stay fixed in viewBox units, so a bigger canvas = more visible gap
  // between nodes (all 3 layouts normalize/fit into this box, so it's a reliable
  // single lever regardless of layout mode).
  function gSpacingK(){var s=zid('gSpacing'),v=s?parseFloat(s.value):1;return (v>0?v:1);}
  function gLayoutCluster(nodes){var sp=gSpacingK(),W=900*sp,H=600*sp,m=30,groups={};nodes.forEach(function(nd){(groups[nd.dir||'(root)']=groups[nd.dir||'(root)']||[]).push(nd);});
    var names=Object.keys(groups).sort(),cols=Math.max(1,Math.ceil(Math.sqrt(names.length*(W/H)))),rows=Math.ceil(names.length/cols),cw=(W-2*m)/cols,ch=(H-2*m)/rows,pos={};
    names.forEach(function(name,gi){var gx=m+(gi%cols)*cw,gy=m+Math.floor(gi/cols)*ch,mem=groups[name].slice().sort(function(a,b){return a.label.localeCompare(b.label);}),gc=Math.max(1,Math.ceil(Math.sqrt(mem.length)));
      mem.forEach(function(nd,i){pos[nd.id]={x:gx+cw*.14+(i%gc)*(cw*.72/gc)+cw*.36/gc,y:gy+ch*.2+Math.floor(i/gc)*(ch*.66/Math.ceil(mem.length/gc))+ch*.12};});});
    return {pos:pos,W:W,H:H};}
  function gLayoutLayers(nodes,edges){var sp=gSpacingK(),W=900*sp,H=600*sp,m=30,depth={};nodes.forEach(function(nd){depth[nd.id]=0;});
    for(var pass=0;pass<Math.min(nodes.length,60);pass++){var chg=false;edges.forEach(function(e){if(depth[e.from]==null||depth[e.to]==null)return;if(depth[e.to]<depth[e.from]+1&&depth[e.from]+1<=nodes.length){depth[e.to]=depth[e.from]+1;chg=true;}});if(!chg)break;}
    var byCol={};nodes.forEach(function(nd){(byCol[depth[nd.id]]=byCol[depth[nd.id]]||[]).push(nd);});
    var keys=Object.keys(byCol).map(Number).sort(function(a,b){return a-b;}),pos={};
    keys.forEach(function(ck,ci){var col=byCol[ck].slice().sort(function(a,b){return (a.dir+a.label).localeCompare(b.dir+b.label);}),x=keys.length===1?W/2:m+ci*((W-2*m)/(keys.length-1));
      col.forEach(function(nd,i){pos[nd.id]={x:x,y:col.length===1?H/2:m+i*((H-2*m)/(col.length-1))};});});
    return {pos:pos,W:W,H:H};}
  function gLayoutForce(nodes,edges){var sp=gSpacingK(),W=900*sp,H=600*sp,n=nodes.length,rnd=gRnd(1337+n),pos={};
    nodes.forEach(function(nd){pos[nd.id]={x:W/2+(rnd()-.5)*W*.8,y:H/2+(rnd()-.5)*H*.8,vx:0,vy:0};});
    var links=edges.filter(function(e){return pos[e.from]&&pos[e.to];}),iters=n>140?160:240;
    for(var it=0;it<iters;it++){var k=1-it/iters;
      for(var i=0;i<n;i++){var a=pos[nodes[i].id];for(var j=i+1;j<n;j++){var b=pos[nodes[j].id];var dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01,f=900/d2;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}
      links.forEach(function(e){var a=pos[e.from],b=pos[e.to];var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-70)*.02;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;});
      nodes.forEach(function(nd){var p=pos[nd.id];p.vx+=(W/2-p.x)*.005;p.vy+=(H/2-p.y)*.005;p.x+=p.vx*k*.5;p.y+=p.vy*k*.5;p.vx*=.82;p.vy*=.82;});}
    var mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;nodes.forEach(function(nd){var p=pos[nd.id];mnx=Math.min(mnx,p.x);mny=Math.min(mny,p.y);mxx=Math.max(mxx,p.x);mxy=Math.max(mxy,p.y);});
    var m=34,sx=(W-2*m)/((mxx-mnx)||1),sy=(H-2*m)/((mxy-mny)||1);nodes.forEach(function(nd){var p=pos[nd.id];p.x=m+(p.x-mnx)*sx;p.y=m+(p.y-mny)*sy;});
    return {pos:pos,W:W,H:H};}
  function gMode(){var s=zid('gLayout');return (s&&s.value)||'force';}
  function gLayout(nodes,edges){var mode=gMode();if(mode==='cluster')return gLayoutCluster(nodes);if(mode==='layers')return gLayoutLayers(nodes,edges);return gLayoutForce(nodes,edges);}
  // ---- paint graph ----
  function paintProjGraph(data){var box=zid('gcanvas');if(!box)return;var nodes=(data&&data.nodes)||[],edges=(data&&data.edges)||[];gData=data;gState={nodes:nodes,edges:edges};
    if(!nodes.length){box.innerHTML='<div class="muted" style="padding:20px;max-width:420px">Chưa dựng được graph: code của project này không nằm trên máy này (bộ nhớ xuyên-máy) hoặc không có file nguồn. Graph dựng từ code cục bộ theo đường dẫn project.</div>';gStats(data);return;}
    var orphanOnly=zid('gOrphans')&&zid('gOrphans').checked,orph={};(data.orphans||[]).forEach(function(o){orph[o]=1;});
    gRenderEdgeFilter(data);gRenderLegend(data);
    // Bộ lọc ẩn HẲN khỏi bản vẽ (khác `dim` — dim vẫn chiếm chỗ và vẫn bấm được).
    var hid={};nodes.forEach(function(n){if(gNodeHidden(n))hid[n.id]=1;});
    var L=gLayout(nodes,edges);gState.pos=L.pos;var maxDeg=Math.max(1,Math.max.apply(null,nodes.map(function(n){return n.fanIn+n.fanOut;})));
    var svg='<svg viewBox="0 0 '+L.W+' '+L.H+'" preserveAspectRatio="xMidYMid meet">';
    edges.forEach(function(e){if(gEdgeHidden(e,hid))return;var a=L.pos[e.from],b=L.pos[e.to];if(!a||!b)return;
      svg+='<line class="gedge'+((e.kind&&e.kind!=='imports')?' inferred':'')+'" data-from="'+stdEsc(e.from)+'" data-to="'+stdEsc(e.to)+'" data-kind="'+stdEsc(e.kind||'imports')+'" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'"/>';});
    nodes.forEach(function(nd){if(hid[nd.id])return;var p=L.pos[nd.id];if(!p)return;var deg=nd.fanIn+nd.fanOut,r=3+Math.sqrt(deg/maxDeg)*9,isO=orph[nd.id],cls='gnode'+(isO?' orphan':'')+(orphanOnly&&!isO?' dim':'');
      svg+='<g class="'+cls+'" data-id="'+stdEsc(nd.id)+'" data-dir="'+stdEsc(nd.dir||'')+'"><circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+gSlotColor(nd.slot)+'"><title>'+stdEsc(nd.id)+'</title></circle>'+(r>=7?'<text x="'+p.x.toFixed(1)+'" y="'+(p.y-r-2).toFixed(1)+'" text-anchor="middle">'+stdEsc(nd.label)+'</text>':'')+'</g>';});
    svg+='</svg>';box.innerHTML=svg;
    gview={x:0,y:0,w:L.W,h:L.H,W:L.W,H:L.H};gUndo=[];gRedo=[];
    gStats(data);}
  function gMetricName(m){return t(m==='hub_pct'?'graph.mHub':m==='isolated_pct'?'graph.mIso':m==='util_violations'?'graph.mUtil':m);}
  // ── XU HƯỚNG FITNESS ─────────────────────────────────────────────────────────
  // Một mốc = một lần code THẬT SỰ đổi (server chỉ ghi khi chữ ký nguồn khác), nên
  // trục X là nhịp thay đổi của code chứ không phải nhịp mở tab. Cần ≥2 mốc mới có
  // "xu hướng" — 1 mốc thì nói thẳng là chưa đủ, không vẽ đường giả.
  function gTrendLine(vals,mx){
    if(vals.length<2)return '';
    // Trần = mx*1.15 chứ KHÔNG phải mx: chuỗi phẳng (mọi mốc bằng nhau) mà chia cho mx
    // sẽ bị ghim sát mép trên, đọc như "kịch trần" trong khi thực tế là không đổi.
    var top=(mx||1)*1.15,step=100/(vals.length-1);
    return vals.map(function(v,i){return (i*step).toFixed(2)+','+(30-(v/top*28)).toFixed(2);}).join(' ');
  }
  function gRenderTrend(points){
    var box=zid('gTrend');if(!box)return;
    if(!points||!points.length){box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendNone')+'</div>';return;}
    if(points.length<2){
      box.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendOne')+'</div>';return;}
    var names={};points.forEach(function(p){Object.keys(p.values||{}).forEach(function(k){names[k]=1;});});
    var html=Object.keys(names).map(function(k){
      var vals=points.map(function(p){return Number((p.values||{})[k]||0);});
      var mx=vals.reduce(function(a,b){return Math.max(a,b);},0);
      var first=vals[0],last=vals[vals.length-1],dl=last-first;
      // Mọi metric ở đây "thấp hơn = tốt hơn" (hub%, isolated%, số vi phạm).
      var cls=dl>0?'bad':dl<0?'good':'flat',sign=dl>0?'▲ +':dl<0?'▼ ':'= ';
      return '<div style="margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px;margin-bottom:3px">'
        +'<span>'+stdEsc(gMetricName(k))+'</span>'
        +'<span class="trend-d '+cls+'">'+sign+(dl===0?'0':Math.abs(dl).toFixed(1))+' · '+last.toFixed(1)+'</span></div>'
        +'<svg class="trendsvg" viewBox="0 0 100 30" preserveAspectRatio="none">'
        +'<polyline points="'+gTrendLine(vals,mx)+'" fill="none" stroke="var(--primary)" stroke-width="1"></polyline></svg></div>';
    }).join('');
    var lbl=points.map(function(p){return String(p.builtAt||'').slice(0,10);});
    box.innerHTML=html+xAxis(lbl,dayShort)
      +'<div class="chart-note">'+points.length+' '+t('graph.trendBuilds')+' · '+t('graph.trendLower')+'</div>';
  }
  function gLoadTrend(root){
    if(!root)return;
    zGet('/graph-fitness-history?root='+encodeURIComponent(root))
      .then(function(d){gRenderTrend((d&&d.points)||[]);})
      .catch(function(){var b=zid('gTrend');if(b)b.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.trendNone')+'</div>';});
  }
  // ── Bộ lọc HẠNG CẠNH + legend slot + đếm "đang lọc / tổng" (mượn ý Knowledge Graph
  //    Viewer, user duyệt 2026-07-26). gEdgeOff/gSlotOff = những thứ đang bị TẮT.
  // `slot_unused` (slot chuẩn có khai mà repo chưa dùng) ẩn MẶC ĐỊNH: hữu ích khi cần soi
  // độ phủ chuẩn, nhưng bật sẵn thì ~48 node treo lơ lửng làm rối graph. Bấm legend là hiện.
  var gEdgeOff={},gSlotOff={slot_unused:1};
  function gEdgeKinds(data){var m={};((data&&data.edges)||[]).forEach(function(e){
    var k=e.kind||'imports';(m[k]=m[k]||{n:0,rel:e.rel||'declared'}).n++;});return m;}
  function gRenderEdgeFilter(data){
    var box=zid('gEdgeFilter');if(!box)return;var kinds=gEdgeKinds(data),keys=Object.keys(kinds);
    if(keys.length<2){box.innerHTML='';return;} // 1 hạng thì bộ lọc vô nghĩa
    box.innerHTML=keys.map(function(k){var v=kinds[k];
      return '<label title="'+stdEsc(v.rel==='declared'?t('graph.relDeclared'):t('graph.relInferred'))+'">'
        +'<input type="checkbox" data-ekind="'+stdEsc(k)+'"'+(gEdgeOff[k]?'':' checked')+'> '
        +stdEsc(k)+' <span class="rel">'+stdEsc(v.rel)+'</span> <span class="muted">'+zN(v.n)+'</span></label>';}).join('');
  }
  function gRenderLegend(data){
    var box=zid('gLegend');if(!box)return;var cnt={};
    ((data&&data.nodes)||[]).forEach(function(n){var s=n.type||n.slot||'(ngoài chuẩn)';cnt[s]=(cnt[s]||0)+1;});
    var keys=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]||a.localeCompare(b);});
    box.innerHTML=keys.map(function(s){
      return '<span class="lg'+(gSlotOff[s]?' off':'')+'" data-slot="'+stdEsc(s)+'" title="'+t('graph.legendTip')+'">'
        +'<span class="dot" style="background:'+gSlotColor(s==='(ngoài chuẩn)'?'':s)+'"></span>'
        +stdEsc(s)+' <span class="n">'+cnt[s]+'</span></span>';}).join('');
  }
  /** Node/cạnh có đang bị bộ lọc ẩn không (dùng chung cho vẽ + đếm). */
  function gNodeHidden(n){return !!gSlotOff[n.type||n.slot||'(ngoài chuẩn)'];}
  function gEdgeHidden(e,hid){return !!gEdgeOff[e.kind||'imports']||hid[e.from]||hid[e.to];}
  document.addEventListener('change',function(ev){var c=ev.target.closest?ev.target.closest('[data-ekind]'):null;if(!c)return;
    var k=c.dataset.ekind;if(c.checked)delete gEdgeOff[k];else gEdgeOff[k]=1;if(gData)paintProjGraph(gData);});
  document.addEventListener('click',function(ev){var l=ev.target.closest?ev.target.closest('#gLegend .lg'):null;if(!l)return;
    var s=l.dataset.slot;if(gSlotOff[s])delete gSlotOff[s];else gSlotOff[s]=1;if(gData)paintProjGraph(gData);});
  function gStats(data){var el=zid('gStats');if(el){var s=data.stats||{};
    // Đếm ĐANG LỌC / TỔNG — thấy ngay bộ lọc đang giấu bao nhiêu (đo trung thực, điều 12).
    var hid={},nShown=0;((data.nodes)||[]).forEach(function(n){if(gNodeHidden(n))hid[n.id]=1;else nShown++;});
    var eAll=(data.edges||[]).length,eShown=(data.edges||[]).filter(function(e){return !gEdgeHidden(e,hid);}).length;
    var nAll=(data.nodes||[]).length;
    var built=data.builtAt?(' · '+t('graph.builtAt')+' '+String(data.builtAt).slice(11,16)):'';
    el.textContent=(nShown===nAll?zN(nAll):zN(nShown)+'/'+zN(nAll))+' node · '
      +(eShown===eAll?zN(eAll):zN(eShown)+'/'+zN(eAll))+' cạnh · '+zN(s.slots||0)+' slot · '
      +((data.orphans||[]).length)+' orphan'+built;}
    var ins=zid('gInspect');if(ins){var f=data.fitness||{},ms=(f.metrics||[]);
      var chips=ms.map(function(m){var pc=m.metric.indexOf('pct')>=0?'%':'';return '<span class="pill '+(m.passed?'ok':'warn')+'" style="margin:0 4px 4px 0" title="'+stdEsc(m.detail||'')+'">'+(m.passed?'✓':'⚠')+' '+stdEsc(gMetricName(m.metric))+' '+m.value+pc+'</span>';}).join('');
      var pass=ms.filter(function(m){return m.passed;}).length;
      ins.innerHTML='<b style="font-size:13px">'+t('graph.overview')+'</b>'
        +'<div class="row" style="margin-top:6px"><span class="nm">Code fitness</span><b style="color:var(--'+(ms.length&&pass===ms.length?'success':'warn')+')">'+pass+'/'+ms.length+' OK</b></div>'
        +(chips?'<div style="margin-top:8px">'+chips+'</div>':'')
        +'<div class="muted" style="font-size:11px;margin-top:8px">'+t('graph.pickNode')+'</div>';}
    gRenderChecks(data);}
  // Checks card = REAL graph-derived (orphan count + fitness metrics with pass/fail
  // + threshold), not the old hardcoded 5/8/OK/OK.
  function gRenderChecks(data){var el=zid('gChecks');if(!el)return;var f=data.fitness||{},ms=(f.metrics||[]),orph=(data.orphans||[]).length;
    var rows='<div class="row"><div class="l"><span class="pill '+(orph?'warn':'ok')+'">'+zN(orph)+'</span><span class="nm">'+t('graph.ckOrphan')+'</span></div><a class="muted">'+t('graph.ckOrphanHint')+'</a></div>';
    ms.forEach(function(m,i){var last=i===ms.length-1,pc=m.metric.indexOf('pct')>=0?'%':'';
      rows+='<div class="row"'+(last?' style="border:0"':'')+'><div class="l"><span class="pill '+(m.passed?'ok':'warn')+'">'+(m.passed?'OK':'⚠')+'</span><span class="nm">'+stdEsc(gMetricName(m.metric))+' '+m.value+pc+'</span></div><a class="muted" title="'+stdEsc(m.detail||'')+'">'+t('graph.ckThreshold')+' '+m.threshold+pc+'</a></div>';});
    el.innerHTML=rows;}
  // ---- zoom/pan/drag node ----
  function gApply(){var svg=document.querySelector('#gcanvas svg');if(svg&&gview)svg.setAttribute('viewBox',gview.x+' '+gview.y+' '+gview.w+' '+gview.h);}
  function gMap(svg,cx,cy){var r=svg.getBoundingClientRect(),s=Math.min(r.width/gview.w,r.height/gview.h),ox=(r.width-gview.w*s)/2,oy=(r.height-gview.h*s)/2;return {x:gview.x+(cx-r.left-ox)/s,y:gview.y+(cy-r.top-oy)/s,s:s};}
  function gMoveNode(id,x,y){var g=document.querySelector('#gcanvas .gnode[data-id="'+id.replace(/"/g,'\\"')+'"]');if(!g)return;var c=g.querySelector('circle');if(!c)return;var r=parseFloat(c.getAttribute('r'))||5;
    c.setAttribute('cx',x.toFixed(1));c.setAttribute('cy',y.toFixed(1));var tx=g.querySelector('text');if(tx){tx.setAttribute('x',x.toFixed(1));tx.setAttribute('y',(y-r-2).toFixed(1));}
    document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){if(ln.dataset.from===id){ln.setAttribute('x1',x.toFixed(1));ln.setAttribute('y1',y.toFixed(1));}if(ln.dataset.to===id){ln.setAttribute('x2',x.toFixed(1));ln.setAttribute('y2',y.toFixed(1));}});
    if(gState&&gState.pos&&gState.pos[id]){gState.pos[id].x=x;gState.pos[id].y=y;}}
  (function(){var box=zid('gcanvas');if(!box)return;
    box.addEventListener('wheel',function(ev){var svg=box.querySelector('svg');if(!svg||!gview)return;ev.preventDefault();var m=gMap(svg,ev.clientX,ev.clientY),k=ev.deltaY>0?1.2:1/1.2,w=Math.min(gview.W*4,Math.max(gview.W/10,gview.w*k)),h=w*gview.H/gview.W;gview.x=m.x-(m.x-gview.x)*(w/gview.w);gview.y=m.y-(m.y-gview.y)*(h/gview.h);gview.w=w;gview.h=h;gApply();},{passive:false});
    var pan=null,ndrag=null,marq=null;
    box.addEventListener('pointerdown',function(ev){var svg=box.querySelector('svg');if(!svg||!gview)return;
      var node=ev.target.closest&&ev.target.closest('.gnode');
      var sc=gMap(svg,ev.clientX,ev.clientY).s;
      if(node){var id=node.dataset.id,p=gState&&gState.pos&&gState.pos[id];if(!p)return;
        // Kéo một node ĐANG nằm trong lựa chọn nhiều ⇒ kéo CẢ NHÓM; ngoài ra kéo một mình.
        var ids=(gSelIds.length>1&&gSelIds.indexOf(id)>=0)?gSelIds.slice():[id];
        var group=ids.map(function(nid){var q=gState.pos[nid];return q?{id:nid,x:q.x,y:q.y}:null;}).filter(Boolean);
        ndrag={id:id,cx:ev.clientX,cy:ev.clientY,s:sc,moved:false,group:group,add:!!(ev.ctrlKey||ev.metaKey)};}
      else if(ev.shiftKey){
        // Shift+kéo nền = BÔI CHỌN nhiều node. Kéo nền TRẦN vẫn là pan (giữ thói quen cũ).
        marq={cx:ev.clientX,cy:ev.clientY,add:!!(ev.ctrlKey||ev.metaKey),el:null,moved:false};}
      else{pan={cx:ev.clientX,cy:ev.clientY,x:gview.x,y:gview.y,s:sc,moved:false};}
      if(box.setPointerCapture)box.setPointerCapture(ev.pointerId);});
    box.addEventListener('pointermove',function(ev){
      if(ndrag){var dx=(ev.clientX-ndrag.cx)/ndrag.s,dy=(ev.clientY-ndrag.cy)/ndrag.s;
        if(!ndrag.moved&&Math.abs(ev.clientX-ndrag.cx)+Math.abs(ev.clientY-ndrag.cy)>4)ndrag.moved=true;
        if(ndrag.moved)ndrag.group.forEach(function(m){gMoveNode(m.id,m.x+dx,m.y+dy);});
        return;}
      if(marq){
        if(!marq.moved&&Math.abs(ev.clientX-marq.cx)+Math.abs(ev.clientY-marq.cy)>3)marq.moved=true;
        if(!marq.moved)return;
        if(!marq.el){marq.el=document.createElement('div');marq.el.className='gmarquee';box.appendChild(marq.el);}
        var r=box.getBoundingClientRect();
        var x1=Math.min(marq.cx,ev.clientX),y1=Math.min(marq.cy,ev.clientY);
        marq.el.style.left=(x1-r.left)+'px';marq.el.style.top=(y1-r.top)+'px';
        marq.el.style.width=Math.abs(ev.clientX-marq.cx)+'px';marq.el.style.height=Math.abs(ev.clientY-marq.cy)+'px';
        marq.lastX=ev.clientX;marq.lastY=ev.clientY;
        return;}
      if(!pan||!gview)return;if(!pan.moved&&Math.abs(ev.clientX-pan.cx)+Math.abs(ev.clientY-pan.cy)>4)pan.moved=true;gview.x=pan.x-(ev.clientX-pan.cx)/pan.s;gview.y=pan.y-(ev.clientY-pan.cy)/pan.s;gApply();});
    // A real drag (node move · marquee · background pan) must not ALSO fire the click-based
    // select/deselect behind it — every path sets gSuppressClick so the click handler below
    // ignores that one click, then clears the flag for next time.
    var endPan=function(){
      if(ndrag&&ndrag.moved){gSuppressClick=true;
        // Một bước undo = CẢ nhóm vừa kéo (không phải mỗi node một bước).
        var moves=ndrag.group.map(function(m){var cur=gState&&gState.pos&&gState.pos[m.id];
          return cur?{id:m.id,from:{x:m.x,y:m.y},to:{x:cur.x,y:cur.y}}:null;}).filter(Boolean);
        if(moves.length){gUndo.push({moves:moves});gRedo=[];}}
      // BẤM (không kéo) một node ⇒ CHỌN ngay tại pointerup, dùng id đã bắt được ở
      // pointerdown. KHÔNG dựa vào event `click`: `setPointerCapture` bên dưới bắt con trỏ
      // về #gcanvas nên click bị đổi target sang canvas, `closest('.gnode')` trả null và
      // handler rơi vào nhánh gDeselectAll ⇒ bấm node KHÔNG chọn được gì (user báo 2026-07-26).
      else if(ndrag&&!ndrag.moved){gSuppressClick=true;if(gState)gSelectNode(ndrag.id,ndrag.add);}
      else if(marq){
        if(marq.moved){gSuppressClick=true;gSelectInRect(marq.cx,marq.cy,marq.lastX,marq.lastY,marq.add);}
        if(marq.el&&marq.el.parentNode)marq.el.parentNode.removeChild(marq.el);}
      else if(pan&&pan.moved){gSuppressClick=true;}
      pan=null;ndrag=null;marq=null;};
    box.addEventListener('pointerup',endPan);box.addEventListener('pointercancel',endPan);
    box.addEventListener('dblclick',function(ev){if(ev.target.closest&&ev.target.closest('.gnode'))return;if(!gview)return;gview.x=0;gview.y=0;gview.w=gview.W;gview.h=gview.H;gApply();});
  })();
  document.addEventListener('keydown',function(ev){if(!(ev.ctrlKey||ev.metaKey))return;var k=(ev.key||'').toLowerCase(),undo=k==='z'&&!ev.shiftKey,redo=k==='y'||(k==='z'&&ev.shiftKey);if(!undo&&!redo)return;
    if(!document.querySelector('.screen[data-s="projects"].on')||!document.querySelector('#projDetail .sub[data-pt="graph"].on'))return;
    if(!gState||!gState.pos)return;var tag=(ev.target&&ev.target.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea')return;
    // Mỗi bước undo là CẢ nhóm vừa kéo (kéo 5 node = 1 lần Ctrl+Z, không phải 5 lần).
    if(undo&&gUndo.length){ev.preventDefault();var c=gUndo.pop();c.moves.forEach(function(m){gMoveNode(m.id,m.from.x,m.from.y);});gRedo.push(c);}
    else if(redo&&gRedo.length){ev.preventDefault();var c2=gRedo.pop();c2.moves.forEach(function(m){gMoveNode(m.id,m.to.x,m.to.y);});gUndo.push(c2);}});
  // ---- node click → select + highlight neighbours + sync tree + inspector ----
  function gHiTreeFolder(dir){document.querySelectorAll('#pgTree .trow').forEach(function(r){r.classList.toggle('active',r.dataset.path===dir);});}
  // Bấm node trên canvas → làm HIỆN dòng file đó trong cây: mở mọi folder cha đang thu
  // gọn, đánh dấu active, rồi cuộn tới. Trị bug user báo 2026-07-25 "bấm node không
  // hiện lên tree": ① `gHiTreeFolder(nd.dir)` bị chính dòng ngay sau ghi đè sạch class
  // active ⇒ highlight chết · ② file nằm trong folder đang collapsed thì có set class
  // cũng KHÔNG ai thấy (không mở cha, không cuộn tới).
  function gRevealTreeFile(id){
    var sel='#pgTree .trow[data-path="'+String(id).replace(/"/g,'\\"')+'"]';
    document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.toggle('active',x.dataset.path===id);});
    var row=document.querySelector(sel);if(!row)return;
    var changed=false,p=row.parentElement;
    while(p&&p.id!=='pgTree'){
      if(p.classList&&p.classList.contains('tnode')&&p.classList.contains('collapsed')){
        p.classList.remove('collapsed');
        var head=p.firstElementChild,tw=head&&head.querySelector?head.querySelector('.ttw'):null;
        if(tw){tw.classList.remove('collapsed');if(tw.dataset.tw&&gCollapsed[tw.dataset.tw]){delete gCollapsed[tw.dataset.tw];changed=true;}}
      }
      p=p.parentElement;
    }
    if(changed)gSaveColl();
    // Cuộn TRONG panel cây thôi (scrollIntoView sẽ cuộn cả trang vì .scroll cũng scrollable).
    var host=zid('pgTree');
    if(host){
      var hr=host.getBoundingClientRect(),rr=row.getBoundingClientRect();
      if(rr.top<hr.top+4||rr.bottom>hr.bottom-4)
        host.scrollTop+=(rr.top-hr.top)-(host.clientHeight/2-rr.height/2);
    }
  }
  // Lọc theo folder ⇒ xoá luôn lựa chọn node để không có 2 nguồn sự thật.
  function gHiDir(dir){if(!gState)return;gSelIds=[];document.querySelectorAll('#gcanvas .gnode').forEach(function(x){var under=x.dataset.dir===dir||(x.dataset.dir+'/').indexOf(dir+'/')===0;x.classList.toggle('dim',!under);x.classList.remove('sel');});document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){ln.classList.remove('hot');});}
  // ── LỰA CHỌN: `gSelIds` là NGUỒN SỰ THẬT (1 hoặc nhiều node); mọi cách chọn (bấm node ·
  //    Ctrl+bấm · Shift+bôi · bấm file trong cây) chỉ sửa mảng này rồi gọi gPaintSel().
  //    Nhờ vậy graph ↔ cây ↔ inspector luôn đồng nhất, không nơi nào tự vẽ riêng.
  function gNodeById(id){return gState?gState.nodes.filter(function(x){return x.id===id;})[0]:null;}
  function gPaintSel(){
    var sel={},n=gSelIds.length;gSelIds.forEach(function(id){sel[id]=1;});
    if(!n){
      document.querySelectorAll('#gcanvas .gnode').forEach(function(x){x.classList.remove('sel','dim');});
      document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){ln.classList.remove('hot');});
      document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.remove('active');});
      var i0=zid('gInspect');if(i0)i0.innerHTML='<div class="muted" style="font-size:11.5px">'+t('graph.pickNode')+'</div>';
      return;
    }
    // 1 node: làm nổi cả LÁNG GIỀNG (blast-radius, UX cũ). Nhiều node: chỉ làm nổi đúng nhóm
    // đã chọn — kéo theo láng giềng của N node thì sáng gần hết graph, vô nghĩa.
    var keep={};gSelIds.forEach(function(id){keep[id]=1;});
    document.querySelectorAll('#gcanvas .gedge').forEach(function(ln){
      var hot=n===1?(ln.dataset.from===gSelIds[0]||ln.dataset.to===gSelIds[0])
                   :(sel[ln.dataset.from]&&sel[ln.dataset.to]);
      ln.classList.toggle('hot',!!hot);
      if(hot&&n===1){keep[ln.dataset.from]=1;keep[ln.dataset.to]=1;}
    });
    document.querySelectorAll('#gcanvas .gnode').forEach(function(x){
      x.classList.toggle('sel',!!sel[x.dataset.id]);x.classList.toggle('dim',!keep[x.dataset.id]);});
    if(n===1)gRevealTreeFile(gSelIds[0]);
    else document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.toggle('active',!!sel[x.dataset.path]);});
    gRenderInspect();
  }
  // Danh sách cạnh ĐI RA / ĐI VÀO có KIỂU, bấm nhảy sang node đó (ý hay nhất mượn được
  // từ Knowledge Graph Viewer). Trước đây inspector chỉ hiện CON SỐ fan-in/out — biết
  // "5 file import mình" mà không biết file nào thì không dùng để tra blast-radius được.
  function gEdgeListHtml(id){
    if(!gState)return '';
    var out=[],inn=[];
    gState.edges.forEach(function(e){
      if(e.from===id)out.push(e);
      else if(e.to===id)inn.push(e);
    });
    function sec(title,rows,otherKey){
      if(!rows.length)return '';
      return '<div class="section-t">'+stdEsc(title)+' ('+rows.length+')</div><div class="eglist">'
        +rows.slice(0,40).map(function(e){var other=e[otherKey];
          return '<div class="eg" data-goto-node="'+stdEsc(other)+'" title="'+stdEsc(other)+'">'
            +'<span class="k">'+stdEsc(e.kind||'imports')+'</span>'
            +'<span class="t">'+stdEsc(other.split('/').pop())+'</span>'
            +'<span class="c">'+(e.count?zN(e.count)+'×':'')+(e.rel==='inferred'?' ~':'')+'</span></div>';}).join('')
        +(rows.length>40?'<div class="muted" style="font-size:10.5px;padding-top:4px">+'+(rows.length-40)+'…</div>':'')
        +'</div>';
    }
    return sec(t('graph.edgeOut'),out,'to')+sec(t('graph.edgeIn'),inn,'from');
  }
  // Bấm một dòng trong danh sách cạnh → chọn node đó (graph + cây + inspector cùng nhảy)
  document.addEventListener('click',function(ev){
    var g=ev.target.closest?ev.target.closest('[data-goto-node]'):null;if(!g)return;
    if(gState)gSelectNode(g.dataset.gotoNode,false);
  });
  function gRenderInspect(){
    var ins=zid('gInspect');if(!ins)return;
    if(gSelIds.length===1){
      var nd=gNodeById(gSelIds[0]);if(!nd){ins.innerHTML='';return;}
      var syms=(nd.symbolsDetail||[]).length?'<div class="muted" style="font-size:10.5px;margin-top:6px;word-break:break-word">'+nd.symbolsDetail.map(function(s){return stdEsc(s.name)+' ('+stdEsc(s.kind)+' L'+s.line+')';}).join(' · ')+'</div>':((nd.symbols||[]).length?'<div class="muted" style="font-size:10.5px;margin-top:6px;word-break:break-word">'+nd.symbols.map(stdEsc).join(' · ')+'</div>':'');
      // Node của LỚP CHUẨN (hp_dieu · skill · plan_spec · slot · concern) không phải file:
      // không có số dòng/symbol, nhưng có `src` = chỗ nó được KHAI BÁO trong docs.
      ins.innerHTML='<b style="font-size:14px">'+stdEsc(nd.label)+'</b><div class="muted" style="font-size:11px;margin-bottom:8px">'
        +'<span class="tagx">'+stdEsc(nd.type||'file')+'</span> '+stdEsc(nd.src||nd.dir||'(root)')+'</div>'
        +'<div class="row"><span class="nm">Fan-in</span><b>'+nd.fanIn+'</b></div><div class="row"><span class="nm">Fan-out</span><b>'+nd.fanOut+'</b></div>'+(nd.loc?'<div class="row"><span class="nm">Dòng</span><b>'+zN(nd.loc)+'</b></div>':'')
        +(nd.touchedBy?'<div class="row"><span class="nm">'+t('graph.touchedBy')+'</span><b>'+zN(nd.touchedBy)+'</b></div>':'')
        +'<div class="row" style="border:0"><span class="nm">'+(nd.loc?'File':'ID')+'</span><span class="muted" style="font-size:10.5px;word-break:break-all">'+stdEsc(nd.id)+'</span></div>'+syms
        +gEdgeListHtml(nd.id);
      return;
    }
    // Nhiều node: tổng hợp ĐO ĐƯỢC (đếm/cộng thẳng từ graph), không suy diễn gì thêm.
    var nds=gSelIds.map(gNodeById).filter(Boolean);
    var loc=nds.reduce(function(a,x){return a+(x.loc||0);},0);
    var inner=0;
    if(gState)gState.edges.forEach(function(e){if(gSelIds.indexOf(e.from)>=0&&gSelIds.indexOf(e.to)>=0)inner++;});
    ins.innerHTML='<b style="font-size:14px">'+nds.length+' '+t('graph.selN')+'</b>'
      +'<div class="muted" style="font-size:11px;margin-bottom:8px">'+t('graph.selHint')+'</div>'
      +'<div class="row"><span class="nm">'+t('graph.selEdges')+'</span><b>'+inner+'</b></div>'
      +'<div class="row"><span class="nm">Fan-in</span><b>'+nds.reduce(function(a,x){return a+(x.fanIn||0);},0)+'</b></div>'
      +'<div class="row"><span class="nm">Fan-out</span><b>'+nds.reduce(function(a,x){return a+(x.fanOut||0);},0)+'</b></div>'
      +'<div class="row" style="border:0"><span class="nm">'+t('graph.selLoc')+'</span><b>'+zN(loc)+'</b></div>'
      +'<div class="muted" style="font-size:10.5px;margin-top:8px;word-break:break-all;max-height:180px;overflow:auto">'
      +nds.map(function(x){return stdEsc(x.id);}).join('<br>')+'</div>';
  }
  /** Chọn/bỏ-chọn 1 node. `additive` (Ctrl/Cmd) = thêm-bớt vào nhóm đang chọn. */
  function gSelectNode(id,additive){
    if(!gState||!gNodeById(id))return;
    if(additive){var i=gSelIds.indexOf(id);if(i>=0)gSelIds.splice(i,1);else gSelIds.push(id);}
    else gSelIds=[id];
    gPaintSel();
  }
  /** BÔI CHỌN: mọi node có tâm nằm trong hình chữ nhật vừa kéo (toạ độ MÀN HÌNH → graph). */
  function gSelectInRect(sx0,sy0,sx1,sy1,additive){
    var box=zid('gcanvas'),svg=box&&box.querySelector('svg');
    if(!svg||!gState||!gState.pos)return;
    var a=gMap(svg,Math.min(sx0,sx1),Math.min(sy0,sy1)),b=gMap(svg,Math.max(sx0,sx1),Math.max(sy0,sy1));
    var hit=gState.nodes.filter(function(nd){var p=gState.pos[nd.id];
      return p&&p.x>=a.x&&p.x<=b.x&&p.y>=a.y&&p.y<=b.y;}).map(function(nd){return nd.id;});
    if(additive)hit.forEach(function(id){if(gSelIds.indexOf(id)<0)gSelIds.push(id);});
    else gSelIds=hit;
    gPaintSel();
  }
  // Cancel any selection — graph (sel/dim/hot) AND tree (active) always move
  // together, never one without the other (user 2026-07-23: "phải luôn đồng
  // nhất với nhau"). Fires on: click empty canvas · click empty tree area.
  function gDeselectAll(){gSelIds=[];gPaintSel();}
  document.addEventListener('click',function(ev){
    var box=zid('gcanvas');if(!box||!ev.target.closest||!box.contains(ev.target))return;
    if(gSuppressClick){gSuppressClick=false;return;} // that click was actually a node-drag or a background pan
    var g=ev.target.closest('.gnode');
    if(g&&gState)gSelectNode(g.dataset.id,!!(ev.ctrlKey||ev.metaKey)); // Ctrl/Cmd = thêm/bớt
    else gDeselectAll(); // clicked empty canvas space → cancel selection, both sides
  });
  // ---- tree interactions (collapse · click folder → dim non-members · click file → select its graph node · click empty area → deselect) ----
  document.addEventListener('click',function(ev){if(!ev.target.closest)return;
    var tree=ev.target.closest('#pgTree');if(!tree)return;
    var tact=ev.target.closest('#pgTree .tree-bar [data-tact]');if(tact){gSetAllColl(tact.dataset.tact==='collapse');return;}
    var tw=ev.target.closest('#pgTree .ttw');if(tw&&!tw.classList.contains('leaf')){var path=tw.dataset.tw;gCollapsed[path]=!gCollapsed[path];gSaveColl();var node=tw.closest('.tnode');if(node)node.classList.toggle('collapsed',!!gCollapsed[path]);tw.classList.toggle('collapsed',!!gCollapsed[path]);return;}
    var r=ev.target.closest('#pgTree .trow');
    if(!r){gDeselectAll();return;} // clicked empty tree space → cancel selection, both sides
    if(r.dataset.file==='1'){gSelectNode(r.dataset.path);return;}
    gHiDir(r.dataset.path);document.querySelectorAll('#pgTree .trow').forEach(function(x){x.classList.remove('active');});r.classList.add('active');});
  // ---- toolbar (layout picker · orphan · giãn cách · tự xếp lại) ----
  document.addEventListener('change',function(e){if(!e.target)return;
    if(e.target.id==='gLayout'){try{localStorage.setItem('zemory.pglayout',e.target.value);}catch(_){}if(gData)paintProjGraph(gData);}
    else if(e.target.id==='gOrphans'){if(gData)paintProjGraph(gData);}
    else if(e.target.id==='gSpacing'){try{localStorage.setItem('zemory.pgspacing',e.target.value);}catch(_){}if(gData)paintProjGraph(gData);}});
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='gSpacing'){var lv=zid('gSpacingVal');if(lv)lv.textContent=parseFloat(e.target.value).toFixed(1)+'×';}});
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#gRebuild')){gLoadedRoot=null;loadProjGraph(curProjRoot,true);}});
  // ── Graph panel layout: collapse folder tree / info panel · 3-way resize
  //    (tree | canvas | panel via 2 seams) · move the info panel between the RIGHT
  //    column and a TOP full-width bar. State persisted in localStorage.
  var gTreeOpen=true,gPanelOpen=true,gPanelPos='right';
  try{gTreeOpen=localStorage.getItem('zemory.g.tree')!=='0';gPanelOpen=localStorage.getItem('zemory.g.panel')!=='0';gPanelPos=(localStorage.getItem('zemory.g.pos')==='top')?'top':'right';}catch(e){}
  function gApplyLayout(){
    var grid=zid('pgGrid');if(!grid)return;
    var top=zid('gPanelTop'),right=zid('gPanelRight'),panel=zid('gPanel'),tree=zid('pgTree');
    var sTree=grid.querySelector('.seam[data-seam="pgtree"]'),sRight=grid.querySelector('.seam[data-seam="pgright"]');
    var toTop=(gPanelPos==='top'&&gPanelOpen);
    if(panel){var host=toTop?top:right;if(host&&panel.parentNode!==host)host.appendChild(panel);
      panel.style.flexDirection=toTop?'row':'column';panel.style.width=toTop?'100%':'';
      for(var i=0;i<panel.children.length;i++)panel.children[i].style.flex=toTop?'1 1 0':'0 0 auto';}
    if(top)top.style.display=toTop?'flex':'none';
    var tw=gTreeOpen?'var(--pgtree,240px) 8px':'0px 0px';
    var rw=(gPanelOpen&&gPanelPos==='right')?'8px var(--pgright,300px)':'0px 0px';
    grid.style.gridTemplateColumns=tw+' minmax(0,1fr) '+rw;
    if(tree)tree.style.display=gTreeOpen?'':'none';
    if(sTree)sTree.style.display=gTreeOpen?'':'none';
    if(right)right.style.display=(gPanelOpen&&gPanelPos==='right')?'':'none';
    if(sRight)sRight.style.display=(gPanelOpen&&gPanelPos==='right')?'':'none';
    var bt=zid('gTreeToggle'),bp=zid('gPanelToggle');if(bt)bt.textContent=gTreeOpen?'◀':'▶';if(bp)bp.textContent=gPanelOpen?'▶':'◀';
    if(gData&&typeof paintProjGraph==='function')paintProjGraph(gData);
  }
  document.addEventListener('click',function(e){
    if(e.target.id==='gTreeToggle'){gTreeOpen=!gTreeOpen;try{localStorage.setItem('zemory.g.tree',gTreeOpen?'1':'0');}catch(x){}gApplyLayout();return;}
    if(e.target.id==='gPanelToggle'){gPanelOpen=!gPanelOpen;try{localStorage.setItem('zemory.g.panel',gPanelOpen?'1':'0');}catch(x){}gApplyLayout();return;}
    if(e.target.id==='gPanelPos'){gPanelPos=(gPanelPos==='top')?'right':'top';try{localStorage.setItem('zemory.g.pos',gPanelPos);}catch(x){}gApplyLayout();return;}
  });
  function loadProjGraph(root,force){var box=zid('gcanvas');if(!box)return;
    if(!root){box.innerHTML='<div class="muted" style="padding:20px">Chọn 1 project để dựng graph.</div>';var pt0=zid('pgTree');if(pt0)pt0.innerHTML='';return;}
    try{var sv=localStorage.getItem('zemory.pglayout');if(sv&&zid('gLayout'))zid('gLayout').value=sv;}catch(_){}
    try{var ss=localStorage.getItem('zemory.pgspacing');if(ss&&zid('gSpacing')){zid('gSpacing').value=ss;var lv=zid('gSpacingVal');if(lv)lv.textContent=parseFloat(ss).toFixed(1)+'×';}}catch(_){}
    if(!force&&gLoadedRoot===root&&gData){paintProjGraph(gData);gPaintTree(gTreeCache);return;}
    box.innerHTML='<div class="muted" style="padding:20px">Đang dựng graph từ code thật…</div>';
    gLoadTree(root);gLoadTrend(root);
    zGet('/code-graph?root='+encodeURIComponent(root)).then(function(d){gLoadedRoot=root;paintProjGraph(d);}).catch(function(){box.innerHTML='<div class="muted" style="padding:20px">Lỗi dựng graph.</div>';});}
  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — REAL BACKEND WIRING. Elements marked .demo are MOCK (no real
  // backend) and left in place ON PURPOSE for review. Everything here is live.
  // ══════════════════════════════════════════════════════════════════════════
  function zid(id){return document.getElementById(id);}
  function zset(id,v){var e=zid(id);if(e)e.textContent=v;}
  function zN(n){return Number(n||0).toLocaleString();}
  function zBytes(kb){var n=Number(kb||0);if(!n)return '0';if(n>1048576)return (n/1048576).toFixed(1)+' GB';if(n>1024)return (n/1024).toFixed(0)+' MB';return n+' KB';}
  function zProjName(p){return String(p||'').split(/[\\/]/).filter(Boolean).pop()||'(unknown)';}
  function relTime(iso){
    if(!iso)return {big:'chưa sync',sub:'—'};
    var t=new Date(iso).getTime();if(isNaN(t))return {big:'—',sub:'—'};
    var s=Math.max(0,Math.floor((Date.now()-t)/1000));
    var big=s<60?s+' giây':s<3600?Math.floor(s/60)+' phút':s<86400?Math.floor(s/3600)+' giờ':Math.floor(s/86400)+' ngày';
    return {big:big+' trước',sub:String(iso).slice(0,16).replace('T',' ')};
  }
  function pillFor(st){return st==='on'?'ok':st==='warn'?'warn':st==='off'?'warn':'dim';}
  function pillTxt(st){return st==='on'?'Healthy':st==='warn'?'Warning':st==='off'?'Off':'—';}
  function loadRecentSessions(){
    var box=zid('homeSessions');if(!box)return;
    zGet('/recent-sessions?limit=6').then(function(list){
      if(!list||!list.length){box.innerHTML='<div class="muted">'+t('home.noSessions')+'</div>';return;}
      box.innerHTML=list.map(function(s){var pbi=/PBI|powerbi/i.test(s.project||'');var title=(s.title&&String(s.title).trim())||'(phiên chưa đặt tên)';return '<div class="row" data-open-proj="'+stdEsc(s.project||'')+'" style="cursor:pointer"><div class="l"><div class="ico">◆</div><div><div class="nm">'+stdEsc(String(title).slice(0,50))+'</div><div class="meta">'+stdEsc(zProjName(s.project))+' · '+(pbi?'Non-app':'App')+' · '+stdEsc(s.source||'')+'</div></div></div><span class="meta">'+relTime(s.endedAt).big+'</span></div>';}).join('');
    }).catch(function(){});
  }
  // Roll-up sức khoẻ — đếm TRUNG THỰC (không trọng số bịa, điều 12): 'on'=OK ·
  // 'warn'/'off'=cảnh báo · 'dim'=tắt-có-chủ-đích, KHÔNG tính là lỗi.
  // MỘT nguồn duy nhất = FEATURES + sysStatus() (trước 2026-07-25 còn một list check
  // thứ hai hardcode ở Home — 2 chỗ phải sửa song song, tất yếu lệch nhau).
  function setHealthChip(okN,warnN,tot){
    var el=zid('sysSummary');
    if(el){el.className='pill '+(warnN?'warn':'ok');el.textContent=t('sys.health').replace('{ok}',okN).replace('{n}',tot)+(warnN?' · '+warnN+' ⚠':'');}
    var rh=zid('railHealth'),rd=zid('railDot'),rs=zid('railHealthSub');
    if(rh)rh.textContent=warnN?(warnN+' ⚠'):(okN+' OK');
    if(rd)rd.classList.toggle('warn',warnN>0);
    if(rs){rs.removeAttribute('data-i18n');rs.textContent=warnN?t('rail.needAttn'):t('rail.allGreen');}
  }
  // Nạp 3 check thật (/check) rồi vẽ lại inventory — đường duy nhất làm tươi roll-up.
  function refreshChecks(){
    return Promise.all(['memory','validate','grill'].map(function(f){
      return zGet('/check?feature='+f).then(function(r){Z.checks[f]=r;}).catch(function(){Z.checks[f]={state:'off',detail:'err'};});
    })).then(function(){renderSystem();});
  }
  function zGet(u){return fetch(u).then(function(r){return r.json();});}
  function zPost(u){return fetch(u,{method:'POST'}).then(function(r){return r.json();});}
  var Z={status:null,mem:null,auto:null,checks:{}};

  function renderMem(m){
    Z.mem=m||{};
    var tot=m.totals||{},vec=m.vectors||{},cap=m.coverage||{};
    // Trang chủ = 6 ô "at a glance" DUY NHẤT. Bảng số chi tiết (Sections/Digest/Changelog/
    // Doc/Known stores/Tokens) sống ở Global Memory › Tổng quan — trước đây màn Nạp&Đồng bộ
    // có thêm 10 stat card lặp lại y hệt, đã gỡ.
    zset('stMsg',zN(tot.messages));zset('stSess',zN(tot.sessions));
    zset('stVec',vec.coverage==null?'—':vec.coverage+'%');zset('stVecSub',zN(vec.count)+' vec'+(vec.remaining?' · '+zN(vec.remaining)+' chờ':''));
    zset('stStore',zBytes(m.sizeKB));
    var ls=relTime(m.lastSync);zset('stSync',ls.big);zset('stSyncSub',ls.sub);
    if(zid('mScope'))zid('mScope').innerHTML=renderScope(m.scopeTree||[]);
    var rh=zid('rHybrid'),rr=zid('rRerank');if(rh)rh.classList.toggle('on',!!m.hybrid);if(rr)rr.classList.toggle('on',!!m.rerank);
    var d=m.drive||{};zset('driveBundles',d.linked?(zN(d.bundles)+' bundle'):t('drv.notLinkedShort'));
    if(zid('driveInput')&&document.activeElement!==zid('driveInput'))zid('driveInput').value=d.path||'';
    zset('driveState',driveMsg(d));setLvl(d.level||'lean');
    renderDriveDonut(d);
    var lv=zid('langVi'),le=zid('langEn');if(lv)lv.classList.toggle('on',(m.lang||'vi')==='vi');if(le)le.classList.toggle('on',m.lang==='en');
    applyI18n(m.lang||'vi');
    var fa=zid('fAgent');if(fa){var fac=fa.value;fa.innerHTML='<option value="" data-i18n="f.agentAny">'+t('f.agentAny')+'</option>'+((m.agents||[]).map(function(a){return '<option value="'+stdEsc(a.source)+'">'+stdEsc(a.source)+'</option>';}).join(''));fa.value=fac;}
    renderHomeProjects(cap);renderProjGrid(cap);renderDiscovered(cap);renderGmem();
    zset('stProjects',zN((Z.status&&Z.status.knownProjects||[]).length));
  }
  // #5: discovered (chưa liên kết) projects grouped by machine + Add per project.
  var discTab=null;
  function renderDiscovered(cap){
    var box=zid('projDiscovered');if(!box)return;cap=cap||{};
    var linked=new Set(((Z.status&&Z.status.knownProjects)||[]).map(function(k){return String(k.root||'').toLowerCase();}));
    var localHost=cap.localHost||'';
    var byHost={};
    (cap.projects||[]).forEach(function(p){
      if(String(p.host||'')===localHost&&linked.has(String(p.path).toLowerCase()))return; // đã liên kết → không hiện lại
      var h=p.host||'(không rõ máy)';(byHost[h]=byHost[h]||[]).push(p);
    });
    var hosts=Object.keys(byHost).sort(function(a,b){return a===localHost?-1:b===localHost?1:String(a).localeCompare(b);});
    if(!hosts.length){box.innerHTML='';return;}
    if(!discTab||hosts.indexOf(discTab)<0)discTab=hosts[0];
    var tabs='<div class="tabs" style="margin-top:6px;flex-wrap:wrap">'+hosts.map(function(h){return '<button class="'+(h===discTab?'on':'')+'" data-disc-tab="'+stdEsc(h)+'">🖥 '+stdEsc(h===localHost?(h+' · máy này'):h)+' ('+byHost[h].length+')</button>';}).join('')+'</div>';
    var isLocalTab=discTab===localHost;
    var rows=(byHost[discTab]||[]).slice(0,80).map(function(p){var pbi=p.profile==='non-app';
      var act=isLocalTab
        ? '<button class="btn sm" data-add-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto">＋ Add</button><button class="btn sm" data-merge-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto" title="Gộp session folder này vào 1 project đã liên kết">⇢ Gộp</button>'
        : '<span class="muted" style="font-size:11px;flex:0 0 auto">từ '+stdEsc(discTab)+'</span>';
      return '<div class="disc-row"><div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:6px"><span class="nm">'+stdEsc(zProjName(p.path))+'</span>'+(p.profile?'<span class="ptype '+(pbi?'is-non':'is-app')+'">'+(pbi?'NON-APP':'APP')+'</span>':'')+'</div><div class="muted" style="font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+stdEsc(p.path)+' · '+zN(p.sessions)+' sess · '+zN(p.messages)+' msg</div></div><div class="sxa">'+act+'</div></div>';
    }).join('');
    box.innerHTML='<div class="sys-grp" style="margin-top:16px;color:var(--warn)">CHƯA LIÊN KẾT — phân theo máy (tab). Add = zemory quản lý · Gộp = nhập session vào project khác</div>'+tabs+'<div style="margin-top:8px">'+rows+'</div>';
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
  function driveMsg(d){if(!d||!d.linked)return t('drv.notLinked');if(!d.exists)return '✗ '+t('drv.noFolder');if(!d.writable)return '✗ '+t('drv.readOnly');return '✓ '+t('drv.linked').replace('{n}',zN(d.bundles));}
  // Làm tươi TỨC THÌ hai thứ mà một lần quét vừa làm đổi: Drive còn thiếu bao nhiêu, và
  // cây Sources. Đường riêng, rẻ — không đi qua gói /memory-status nặng.
  function syncPulse(){
    return zGet('/sync-pulse').then(function(d){
      if(!d)return;
      if(d.drive)renderDriveDonut(d.drive);
      var sc=zid('mScope');if(sc&&d.scopeTree)sc.innerHTML=renderScope(d.scopeTree);
    }).catch(function(){});
  }
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
    var tiles=[['⏳','Chờ embed',zN(vec.remaining||0),'hint.pending',vec.remaining?t('gm.pendingHint'):t('gm.pendingNone')],
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
  // ── SESSION VIEWER: full session list (left) + thread + info + export (right).
  //    /sessions (list) + /memory-session (thread). Export = client-side .md download.
  var svList=[],svCur=null,svThread=null;
  function loadSessions(){
    var box=zid('sessList');if(!box)return;box.innerHTML='<div class="muted" style="font-size:12px">…</div>';
    // fresh=1 → backend làm tươi TÊN phiên từ đuôi transcript trước khi trả list, nên phiên
    // vừa đổi tên bằng `/title` hiện tên MỚI ngay, không phải chờ scan (user 2026-07-26).
    zGet('/sessions?limit=120&fresh=1').then(function(list){svList=list||[];renderSessList();}).catch(function(){box.innerHTML='<div class="muted" style="font-size:12px">'+t('ph.err')+'</div>';});
  }
  function renderSessList(){
    var box=zid('sessList');if(!box)return;
    var q=(((zid('sessSearch')||{}).value)||'').trim().toLowerCase();
    var rows=svList.filter(function(s){return !q||((String(s.title||'')+' '+String(s.project||'')+' '+String(s.source||'')).toLowerCase().indexOf(q)>=0);});
    box.innerHTML=rows.length?rows.map(function(s){var ti=(s.title&&String(s.title).trim())||t('sess.untitled');return '<div class="sys-li'+(svCur===s.sessionId?' on':'')+'" data-sess="'+stdEsc(s.sessionId)+'" style="align-items:flex-start"><span class="sxn" style="white-space:normal">'+stdEsc(String(ti).slice(0,64))+'<div class="muted" style="font-size:10.5px;margin-top:1px">'+stdEsc(zProjName(s.project))+' · '+stdEsc(s.source||'')+' · '+zN(s.messages)+' msg</div></span><span style="font-size:10px;color:var(--text-faint);flex:0 0 auto;margin-left:6px">'+relTime(s.endedAt).big+'</span></div>';}).join(''):'<div class="muted" style="font-size:12px">'+t('sess.none')+'</div>';
  }
  // ── Render MỘT message trong viewer (user chốt 2026-07-26): prose hiện FULL TEXT y như
  //    lúc chat (pre-wrap, KHÔNG cắt chữ), còn KHỐI CODE và tool_use/tool_result thì THU
  //    LẠI, bấm mới mở — "ko dc mở hết".
  //    Đo trước khi làm (2026-07-26, 167.738 tin): 52,5% tin có tool_use/tool_result ⇒ đây
  //    mới là thứ làm viewer khó đọc, KHÔNG phải THREAD_CAP (0 session vượt 5000 tin).
  // Nhãn vai THẬT của một message. API Anthropic trả `tool_result` TRONG LƯỢT `user`, nên
  // transcript (và `messages.role`) ghi 'user' cho cả output của máy — đúng với nguồn nhưng
  // SAI với người đọc: viewer hiện "USER" rồi dán cả trang docs vào (user báo 2026-07-26
  // "session user mà lại chat docs lên là sao?").
  // Đo 2026-07-26: 44.102/69.324 tin role=user (63,6%) là tool_result, chỉ 36,4% do người gõ;
  // `tool_name` ở role=user = 0 nên phải xét nội dung. Mọi tin có tool_result đều BẮT ĐẦU
  // bằng nó (44.102 = 44.102) ⇒ luật tất định, không đoán.
  function msgRole(m){
    var c=String(m.content||'');
    if(m.role==='user'&&c.indexOf('[tool_result]')===0)return 'tool';
    return m.role||'';
  }
  function foldSize(n){return n>1024?(n/1024).toFixed(1)+' KB':n+' '+t('sess.chars');}
  function fold(label,body){
    return '<details class="fold"><summary>'+stdEsc(label)+'</summary><pre class="code">'+stdEsc(body)+'</pre></details>';
  }
  function msgHtml(raw){
    var s=String(raw||'');if(!s)return '';
    // Một message có thể vừa có prose vừa có tool (adapter join các part bằng '\n')
    // → cắt tại mốc tool ở ĐẦU DÒNG, không dùng regex neo ^ cho cả message.
    return s.split(/\n(?=\[tool_use:|\[tool_result\])/).map(function(seg){
      var mu=seg.match(/^\[tool_use:([^\]]*)\]\s*([\s\S]*)$/);
      if(mu)return fold('🔧 tool_use: '+(mu[1]||'?')+' · '+foldSize(mu[2].length),mu[2]);
      var mr=seg.match(/^\[tool_result\]\s*([\s\S]*)$/);
      if(mr)return fold('📤 tool_result · '+foldSize(mr[1].length),mr[1]);
      // File người dùng kéo vào chat (adapter nạp thành `[file:<tên>]\n<nội dung>`)
      var mf=seg.match(/^\[file:([^\]]*)\]\n([\s\S]*)$/);
      if(mf)return fold('📎 '+(mf[1]||'file')+' · '+foldSize(mf[2].length),mf[2]);
      // prose + fenced code: prose để nguyên văn, mỗi khối ``` thu lại
      var parts=seg.split('```'),h='';
      for(var i=0;i<parts.length;i++){
        if(i%2===0){if(parts[i])h+='<div class="prose">'+stdEsc(parts[i])+'</div>';}
        else{var b=parts[i],nl=b.indexOf('\n'),lang=nl>0?b.slice(0,nl).trim():'',body=nl>0?b.slice(nl+1):b;
          h+=fold('‹/› '+(lang||'code')+' · '+foldSize(body.length),body);}
      }
      return h;
    }).join('');
  }
  // Tiêu đề + dòng info. Phiên mở từ Recall (⤢) có thể CHƯA nằm trong svList → lấy
  // meta từ chính response /memory-session; bỏ field rỗng để hết chuỗi " ·  · ".
  var svTitle='';
  function svInfo(meta,s){
    meta=meta||{};s=s||{};
    var ti=(meta.title&&String(meta.title).trim())||(s.title&&String(s.title).trim())||t('sess.untitled');
    svTitle=ti;zset('sessVTitle',String(ti).slice(0,72));
    var el=zid('sessVInfo');if(!el)return;
    var n=meta.messages!=null?meta.messages:(s.messages?s.messages.length:null);
    el.textContent=[zProjName(meta.project||s.project||'')||'',meta.source||s.source||'',meta.origin||'',meta.host||'',
      n==null?'':zN(n)+' messages',String(meta.startedAt||'').slice(0,16).replace('T',' ')].filter(Boolean).join(' · ');
  }
  function openSess(sid){
    svCur=sid;renderSessList();
    var meta=svList.filter(function(s){return s.sessionId===sid;})[0]||{};
    var body=zid('sessVBody');if(!body)return;
    svInfo(meta,null);body.innerHTML='<div class="muted">…</div>';
    zGet('/memory-session?id='+encodeURIComponent(sid)).then(function(s){
      if(!s||!s.messages){body.innerHTML='<div class="muted">'+t('sess.notFound')+'</div>';svThread=null;return;}
      svInfo(meta,s);
      svThread={title:svTitle,messages:s.messages};
      body.innerHTML='<div class="thread">'+s.messages.map(function(m){var rl=msgRole(m);
        return '<div class="msg" data-role="'+stdEsc(rl)+'"><div class="who"><span class="tag '+stdEsc(rl)+'">'+stdEsc(rl==='tool'?t('sess.roleTool'):rl)+'</span> · '+String(m.timestamp||'').slice(0,16).replace('T',' ')+' · #'+m.id+'</div><div class="body">'+msgHtml(m.content)+'</div></div>';}).join('')+'</div>';
      body.scrollTop=0;
    }).catch(function(){body.innerHTML='<div class="muted">'+t('ph.err')+'</div>';});
  }
  function svExport(){
    if(!svThread){zToast(t('sess.pickFirst'));return;}
    var md='# '+svThread.title+'\n\n'+svThread.messages.map(function(m){return '## '+(m.role||'')+' · '+String(m.timestamp||'').slice(0,16).replace('T',' ')+'\n\n'+String(m.content||'');}).join('\n\n---\n\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([md],{type:'text/markdown'}));a.download='session-'+(svCur||'export')+'.md';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  }
  document.addEventListener('click',function(e){
    if(!e.target.closest)return;
    var li=e.target.closest('#sessList [data-sess]');if(li){openSess(li.dataset.sess);return;}
    if(e.target.id==='sessExport'){svExport();return;}
  });
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='sessSearch')renderSessList();});
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
        +'<div class="acts"><button class="'+(pinned?'on':'')+'" data-pin data-root="'+stdEsc(root)+'" data-on="'+(pinned?'0':'1')+'" title="Ghim">📌</button><button data-forget data-root="'+stdEsc(root)+'" title="Gỡ">✕</button></div></div>'
        +'<div class="pmeta"><span>'+zN(p.messages)+' msg</span><span>'+zN(p.agents)+' agents</span><span>Cập nhật '+(p.last?String(p.last).slice(0,10):'—')+'</span></div></div>';
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
  function renderStatus(s){Z.status=s||{};}
  function setTog(name,on){document.querySelectorAll('[data-auto="'+name+'"]').forEach(function(t){t.classList.toggle('on',!!on);});}
  function renderAuto(a){Z.auto=a=a||{};setTog('scheduler',a.scheduler);setTog('autostart',a.autostart);setTog('autosync',a.autosync);setTog('shortcut',a.shortcut&&a.shortcut.exists);}
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target.closest('[data-auto]'):null;if(!t)return;
    var name=t.dataset.auto,on=!t.classList.contains('on');
    var url=name==='scheduler'?'/set-scheduler?on='+(on?1:0):name==='autostart'?'/set-autostart?on='+(on?1:0):name==='autosync'?'/set-autosync?on='+(on?1:0):name==='shortcut'?'/set-shortcut?on='+(on?1:0):null;
    if(!url)return;setTog(name,on);zPost(url).then(function(){zGet('/automation').then(renderAuto);});
  });
  document.addEventListener('click',function(e){
    var lg=e.target.closest?e.target.closest('[data-lang]'):null;
    if(lg){applyI18n(lg.dataset.lang);zPost('/set-lang?lang='+lg.dataset.lang).then(function(){zGet('/memory-status?fresh=1').then(renderMem);});return;}
    var lv=e.target.closest?e.target.closest('[data-lvl]'):null;
    if(lv){setLvl(lv.dataset.lvl);zPost('/set-sync-level?level='+lv.dataset.lvl);return;}
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
          sm.textContent=n?t('scan.found').replace('{n}',zN(n)).replace('{f}',zN(f)):t('scan.none');}
        // NHỊP NHANH trước: Drive + Sources phải nhảy số NGAY khi quét xong (3 panel này
        // nằm cạnh nhau vì liên quan nhau). Gói /memory-status nặng hơn nhiều nên chạy sau
        // và chỉ để làm tươi phần còn lại — không bắt user chờ nó mới thấy Drive thiếu.
        syncPulse();
        zGet('/memory-status?fresh=1').then(renderMem);
      });}
    else if(act==='drivelink'){var p=zid('driveInput').value.trim();zset('driveState','…');zPost('/set-drive?path='+encodeURIComponent(p)).then(function(d){zset('driveState',driveMsg(d));setLvl(d.level||'lean');});}
    else if(act==='drivesync'){zset('driveState',t('drv.syncingBg'));zPost('/drive-sync').then(function(r){if(r&&r.ok===false){zset('driveState','✗ '+(r.error||t('drv.err')));return;}pollSync();});}
    else if(act==='scanproj'||act==='deepscanproj'){zset('scanProjMsg','đang quét…');zPost('/memory-scan'+(act==='deepscanproj'?'?deep=1':'')).then(function(r){zset('scanProjMsg','+'+zN(r&&r.totals&&r.totals.newMessages)+' msg · '+((r&&r.changedFiles)||0)+' file mới');return zGet('/status');}).then(function(s){if(s)Z.status=s;return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){zset('scanProjMsg','lỗi quét');});}
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
    if(st&&st.running){zset('driveState',t('drv.syncing'));setTimeout(pollSync,2000);return;}
    zset('driveState','✓ '+t('drv.syncDone'));
    syncPulse();                                   // số Drive về đúng NGAY khi đẩy xong
    zGet('/memory-status?fresh=1').then(renderMem); // phần nặng làm tươi sau
  }).catch(function(){setTimeout(pollSync,2000);});}

  // ---- Recall: real search + preview ----
  var rHits=[],rSel=null;
  // Real relevance score only — NO fabricated fallback (recent-messages mode has
  // no score, so show nothing rather than an invented number).
  function rScore(h){var n=Number(h.score||h.rank||h.similarity||0);if(n>0&&n<=1)return n.toFixed(2);if(n>1)return Math.min(0.99,n/100).toFixed(2);return '';}
  function recallRow(h,i){var sc=rScore(h);return '<div class="hit'+(h.id===rSel?' sel':'')+'" data-hit="'+h.id+'" data-sess="'+stdEsc(h.sessionId||'')+'"><div class="top">'+(sc?'<span class="score">'+sc+'</span> ':'')+stdEsc(h.role||'msg')+' · '+stdEsc(zProjName(h.project))+' <span class="tagx">'+stdEsc(h.source||'session')+'</span><span class="openfull" data-openfull="'+stdEsc(h.sessionId||'')+'" title="Mở full session">⤢</span></div><div class="txt">'+stdEsc(String(h.snippet||'').slice(0,170))+'</div><div class="dt">'+String(h.timestamp||'').slice(0,10)+' · #'+h.id+'</div></div>';}
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
  function recallParams(){
    var p='all='+(zid('rAll').classList.contains('on')?1:0),f;
    if((f=zid('fTime'))&&f.value!=='0')p+='&days='+f.value;
    if((f=zid('fType'))&&f.value)p+='&role='+f.value;
    if((f=zid('fOrigin'))&&f.value)p+='&origin='+encodeURIComponent(f.value);
    if((f=zid('fAgent'))&&f.value)p+='&agent='+encodeURIComponent(f.value);
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
    zset('rCount',t('q.searching'));
    zGet('/memory-search?q='+encodeURIComponent(q)+'&'+recallParams()).then(function(h){renderHits(h);}).catch(function(){zset('rCount',t('q.err'));});
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
      zid('rPreview').innerHTML='<button class="btn sm" data-openfull="'+stdEsc(ctx.sessionId||'')+'" style="margin-bottom:10px">⤢ '+t('recall.openFull')+'</button><div class="thread">'+ctx.messages.map(function(m){return '<div class="msg"><div class="who"><span class="tag">'+stdEsc(m.role||'')+'</span></div><div class="body">'+stdEsc(String(m.content||'').slice(0,m.isHit?1200:390))+'</div></div>';}).join('')+'</div>';
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
    var rf=e.target.closest?e.target.closest('[data-rf]'):null;
    if(rf){var k=rf.dataset.rf;
      if(k==='all'){rf.classList.toggle('on');doRecall();}
      else if(k==='hybrid'){var on=!rf.classList.contains('on');rf.classList.toggle('on',on);zPost('/set-hybrid?on='+(on?1:0)).then(function(){if(zid('rq').value.trim().length>=2)doRecall();});}
      else if(k==='rerank'){var o2=!rf.classList.contains('on');rf.classList.toggle('on',o2);zPost('/set-rerank?on='+(o2?1:0)).then(function(){if(zid('rq').value.trim().length>=2)doRecall();});}
      return;
    }
    if(e.target.closest('[data-act="recall"]'))doRecall();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id==='rq')doRecall();});
  document.addEventListener('change',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('rsel'))doRecall();});

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

  // ── SYSTEM screen: full capability inventory + per-feature check/enable ──
  var FEATURES=[
    {k:'memory',grp:'f.grpCore',n:'Memory & recall (FTS5)',kind:'check',feat:'memory',doc:'f.doc.memory'},
    {k:'vector',grp:'Lõi nhớ & tìm',n:'Vector index (semantic)',kind:'stat',doc:'f.doc.vector'},
    {k:'hybrid',grp:'Lõi nhớ & tìm',n:'Hybrid search',kind:'toggle',ep:'/set-hybrid',get:function(m){return !!m.hybrid;},doc:'f.doc.hybrid'},
    {k:'rerank',grp:'Lõi nhớ & tìm',n:'Rerank (cross-encoder)',kind:'toggle',ep:'/set-rerank',get:function(m){return !!m.rerank;},doc:'f.doc.rerank'},
    {k:'digest',grp:'Lõi nhớ & tìm',n:'Session digest',kind:'stat',doc:'f.doc.digest'},
    {k:'graph',grp:'Lõi nhớ & tìm',n:'Graph (code · docs)',kind:'nav',to:'projects',doc:'f.doc.graph'},
    {k:'drive',grp:'f.grpSync',n:'f.drive',kind:'nav',to:'memory',doc:'f.doc.drive'},
    {k:'scheduler',grp:'Đồng bộ & lưu',n:'f.sched',kind:'auto',auto:'scheduler',doc:'f.doc.scheduler'},
    {k:'autostart',grp:'Đồng bộ & lưu',n:'f.autostart',kind:'auto',auto:'autostart',doc:'f.doc.autostart'},
    {k:'autosync',grp:'Đồng bộ & lưu',n:'f.autosync',kind:'auto',auto:'autosync',doc:'f.doc.autosync'},
    {k:'storage',grp:'Đồng bộ & lưu',n:'f.dbloc',kind:'nav',to:'__settings',doc:'f.doc.storage'},
    {k:'validate',grp:'f.grpHarness',n:'Docs harness (validate)',kind:'check',feat:'validate',doc:'f.doc.validate'},
    {k:'grill',grp:'Harness (docs)',n:'Grill',kind:'check',feat:'grill',doc:'f.doc.grill'},
    {k:'harness',grp:'Harness (docs)',n:'Harness files',kind:'stat',doc:'f.doc.harness'}
  ];
  function sysStatus(f){
    var m=Z.mem||{},a=Z.auto||{},vec=m.vectors||{},drive=m.drive||{},st=m.storage||{},s=Z.status||{};
    if(f.kind==='toggle')return {on:f.get(m)?'on':'dim',txt:f.get(m)?t('sys.on'):t('sys.off')};
    if(f.kind==='auto')return {on:a[f.auto]?'on':'dim',txt:a[f.auto]?t('sys.on'):t('sys.off')};
    if(f.kind==='check'){var c=(Z.checks||{})[f.feat];return c?{on:c.state,txt:pillTxt(c.state)}:{on:'dim',txt:'…'};}
    if(f.k==='vector')return {on:vec.remaining===0?'on':(vec.remaining>0?'warn':'dim'),txt:vec.remaining===0?('đủ '+zN(vec.count)):(zN(vec.remaining)+' chờ')};
    if(f.k==='digest'){var d=((m.info&&m.info.tables)||[]).find(function(x){return x.name==='session_digest';});return {on:d&&d.rows>0?'on':'dim',txt:d&&d.rows>0?(zN(d.rows)+' phiên'):'chưa build'};}
    if(f.k==='graph')return {on:'on',txt:'sẵn sàng'};
    if(f.k==='drive')return {on:drive.linked?'on':'dim',txt:drive.linked?'đã link':'chưa link'};
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
    if(f.kind==='nav')return '<button class="btn sm" data-sys-nav="'+f.to+'">Đi tới</button>';
    return '';
  }
  var sysSel=null;
  function renderSystem(){
    var box=zid('sysList');if(!box)return;
    if(!sysSel)sysSel=FEATURES[0].k;
    var groups={},order=[];
    FEATURES.forEach(function(f){if(!groups[f.grp]){groups[f.grp]=[];order.push(f.grp);}groups[f.grp].push(f);});
    var okN=0,warnN=0,tot=0;
    box.innerHTML=order.map(function(g){
      return '<div class="sys-grp">'+stdEsc(t(g))+'</div>'+groups[g].map(function(f){
        var s=sysStatus(f);tot++;if(s.on==='on')okN++;else if(s.on==='warn'||s.on==='off')warnN++;
        return '<div class="sys-li'+(f.k===sysSel?' on':'')+'" data-sysfeat="'+f.k+'"><span class="pill '+pillFor(s.on)+'" style="flex:0 0 auto;min-width:56px;text-align:center">'+stdEsc(s.txt)+'</span><span class="sxn">'+stdEsc(t(f.n))+'</span></div>';
      }).join('');
    }).join('');
    setHealthChip(okN,warnN,tot); // pill trong màn + chip ở chân rail = CÙNG một roll-up
    renderSysDetail();
  }
  function renderSysDetail(){
    var box=zid('sysDetail');if(!box)return;
    var f=FEATURES.filter(function(x){return x.k===sysSel;})[0];if(!f){box.innerHTML='';return;}
    var s=sysStatus(f);
    box.innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span class="pill '+pillFor(s.on)+'">'+stdEsc(s.txt)+'</span><b style="font-size:15px">'+stdEsc(t(f.n))+'</b></div>'
      +'<div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">'+stdEsc(f.grp)+'</div>'
      +'<div class="sxa" style="margin-bottom:14px">'+sysAction(f)+'</div>'
      +'<div class="mdview">'+stdMd(t(f.doc||f.d||''))+'</div>';
  }
  document.addEventListener('click',function(e){var li=e.target.closest?e.target.closest('#sysList [data-sysfeat]'):null;if(li){sysSel=li.dataset.sysfeat;renderSystem();}});
  document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-sys-digest]'):null;if(!b)return;var o=b.textContent;b.textContent='⏳ Đang build digest… (có thể mất chút)';b.disabled=true;
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
      renderSystem();
      var rh=zid('rHybrid'),rr=zid('rRerank');if(rh&&Z.mem)rh.classList.toggle('on',!!Z.mem.hybrid);if(rr&&Z.mem)rr.classList.toggle('on',!!Z.mem.rerank);
      zPost(ep+'?on='+tg.dataset.on).catch(function(){});return;}
    if(au){var nm=au.dataset.sysAuto,ao=au.dataset.on==='1';
      if(Z.auto)Z.auto[nm]=ao;renderSystem();
      zPost('/set-'+nm+'?on='+au.dataset.on).then(function(){return zGet('/automation');}).then(function(a){renderAuto(a);renderSystem();}).catch(function(){});return;}
    if(ck){var f=ck.dataset.sysCheck;ck.textContent='…';zGet('/check?feature='+f).then(function(r){Z.checks[f]=r;renderSystem();}).catch(function(){renderSystem();});return;}
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
        Promise.all(['memory','validate','grill'].map(function(f){return zGet('/check?feature='+f).then(function(r){Z.checks[f]=r;}).catch(function(){});}))
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
  // ---- i18n (chuẩn 02_RULES §16: 2 dict vi/en, mặc định VI, GIỮ thuật ngữ kỹ thuật) ----
  var LANG='vi';
  var I18N={vi:{
    'f.doc.memory':'## Định nghĩa\nBộ nhớ toàn cục cấp MÁY: một SQLite local (~/.zemory/global_memory.db) gom transcript của MỌI phiên agent (Claude Code · Codex · Continue · LM Studio) + web-chat (ChatGPT) vào một chỗ, tìm lại được xuyên project và xuyên máy.\n## Cách hoạt động\n- Hook Stop của host ghi transcript ra đĩa; adapter đọc incremental → ingest vào bảng sessions/messages. Cơ học, 0 token, KHÔNG gọi model.\n- Dedup theo UNIQUE(session_id, uuid) nên re-scan không nhân đôi; redact secret (sk-…, token AWS/GCP/GitHub, JWT) NGAY lúc ingest.\n- Tìm bằng FTS5: 2 lane word + trigram (tiếng Việt), lọc project TRƯỚC rồi mới giới hạn kết quả.\n- Recall ON-DEMAND: agent tự gọi khi prompt liên quan việc/lỗi cũ; KHÔNG auto-inject cả memory vào mỗi prompt.\n## Chi tiết\n- Nguồn THẬT = transcript của host; sessions/messages là index DẪN XUẤT, vứt/dựng lại được bất cứ lúc nào (KHÔNG bao giờ xoá/sửa message gốc).\n- Đây là chỗ token tiết kiệm thật: agent nhớ việc phiên trước thay vì bắt bạn kể lại.\n- Lệnh: zemory memory search "<q>" [--all].','f.doc.vector':'## Định nghĩa\nLớp tìm theo NGHĨA: mỗi message được embed thành vector rồi lưu cạnh FTS, cho phép tìm ý tương đồng dù dùng từ khác.\n## Cách hoạt động\n- Model EmbeddingGemma-300M chạy LOCAL qua Transformers.js (ONNX, không Python/GPU) — model nhỏ chỉ ĐO nghĩa, KHÔNG sinh văn bản (vẫn đúng luật "0 LLM").\n- Vector 256d (Matryoshka: cắt từ 768d + renormalize) lưu bằng sqlite-vec TRONG chính global_memory.db — không tạo DB thứ hai.\n- Embed incremental (zemory memory embed) hoặc lúc scan idle; message dài chunk cửa sổ chồng lấn.\n## Chi tiết\n- Là index DẪN XUẤT — rebuild được (memory embed --rebuild).\n- Fail-open (điều 9): model lỗi/thiếu vector → recall tự rơi về FTS, không bao giờ chết theo.\n- Coverage = số vector / số message; "chờ" = backlog chưa embed.','f.doc.hybrid':'## Định nghĩa\nChế độ tìm kết hợp: trộn kết quả BM25 (khớp chính xác từ khoá) với vector (ngữ nghĩa) thành một danh sách xếp hạng.\n## Cách hoạt động\n- Chạy song song 2 luồng (FTS + vector), mỗi luồng ra một bảng xếp hạng.\n- Hợp nhất bằng RRF (Reciprocal Rank Fusion) — không cần chỉnh trọng số tay.\n- Bật/tắt tức thì, chỉ đổi CÁCH xếp hạng, KHÔNG đụng dữ liệu; tắt = FTS thuần.\n## Chi tiết\n- Lợi nhất với câu hỏi diễn đạt khác chữ so với nội dung gốc.\n- Bench gate: hybrid recall@3 ≥ FTS mới được coi là thắng.','f.doc.rerank':'## Định nghĩa\nBước tinh chỉnh thứ hạng: sau khi hybrid trả top-N ứng viên, một cross-encoder chấm lại độ liên quan của từng cặp (query, ứng viên) rồi sắp xếp lại.\n## Cách hoạt động\n- Model bge-reranker-base (ONNX, dùng chung lớp inference + cache với embedder).\n- Chỉ rescore top-N (không quét cả corpus) nên chi phí giới hạn.\n## Chi tiết\n- OPT-IN (mặc định tắt) vì chậm hơn; đáng bật khi corpus lớn/nhiễu, câu hỏi khó.\n- Fail-open: model lỗi → giữ nguyên thứ tự RRF, không vỡ.','f.doc.digest':'## Định nghĩa\nBản tóm tắt NGẮN, đã lọc của MỖI phiên (việc đã làm · file đụng · quyết định · lỗi · kết quả) để recall đọc rẻ token, đào xuống message gốc khi cần kiểm.\n## Cách hoạt động\n- Extractive, 0 LLM: trích câu "đắt" từ transcript (có thể dùng vector sẵn để CHỌN câu, không SINH câu).\n- Mỗi mục kèm ANCHOR (message id) → drill xuống tin thật verbatim.\n- Regen theo nhịp scan, guard bằng content-hash (phiên mọc thêm tin thì digest tự cập nhật).\n## Chi tiết\n- 1 digest ↔ ĐÚNG 1 phiên (cấu trúc chặn trộn phiên).\n- Lớp DẪN XUẤT — dựng lại bằng memory digest --all.','f.doc.graph':'## Định nghĩa\nĐồ thị quan hệ DẪN XUẤT từ code + docs + memory, trả lời "X liên quan / ảnh hưởng gì" mà routing/recall không trả được.\n## Cách hoạt động\n- Build TẤT ĐỊNH, 0 LLM: import-graph (TS/JS/Python) + symbol qua tree-sitter + cạnh khai báo (routing · references · supersede · touches từ digest).\n- Cạnh 2 hạng: KHAI BÁO (baseline luôn đúng) vs SUY LUẬN (semantic_neighbor từ vector, gắn nhãn, fail-open).\n- Metrics: fan-in/out · orphan/dead · fitness · blast-radius "sửa file X đụng ai".\n## Chi tiết\n- Xem trực quan ở tab Graph TRONG từng project; app ngoài đọc qua graph export (contract có version).\n- Engine nội bộ của memory, KHÔNG phải capability thứ 5.','f.doc.drive':'## Định nghĩa\nĐồng bộ bộ nhớ giữa nhiều máy qua một bundle MÃ HOÁ (.enc) đặt trong folder Drive dùng chung.\n## Cách hoạt động\n- Export: gói sessions/messages/known_stores → mã hoá → ghi .enc ra Drive. Import: giải mã → merge.\n- Merge ADDITIVE: chỉ THÊM, giữ nguyên provenance (host/origin/source) mỗi phiên, KHÔNG ghi đè.\n- Bundle "lean" chỉ chở 3 bảng nguồn (−74% dung lượng); delta theo watermark chỉ chở phần mới.\n## Chi tiết\n- Password/2FA KHÔNG bao giờ vào zemory; DB sống KHÔNG đặt trong folder cloud-sync (WAL corrupt) — chỉ bundle .enc đi qua Drive.\n- Link/sync ở màn Memory & Sync.','f.doc.scheduler':'## Định nghĩa\nBộ hẹn giờ trong daemon tự làm việc bảo trì bộ nhớ lúc máy rảnh, để bạn không phải gõ lệnh tay.\n## Cách hoạt động\n- Khi idle + có backlog: chạy chuỗi scan → embed → digest, throttle CPU.\n- Nhường WRITE-GATE khi CLI đang ghi DB (trị gốc lỗi "database is locked" do 2 tiến trình ghi cùng lúc).\n## Chi tiết\n- Mặc định BẬT. Không rebuild nặng mỗi thay đổi nhỏ (debounce theo mtime).','f.doc.autostart':'## Định nghĩa\nTự khởi động daemon zemory khi bạn đăng nhập máy.\n## Cách hoạt động\n- Ghi/gỡ mục khởi động theo OS: Windows Startup shortcut (.cmd) · macOS launchd · Linux xdg-autostart. Reconcile lúc daemon bind.\n## Chi tiết\n- Mặc định TẮT. Bật = mở PC là zemory đã chạy nền sẵn ở port 4444.','f.doc.autosync':'## Định nghĩa\nTự động chạy Drive sync khi phát hiện dữ liệu lệch giữa máy này và bundle chung.\n## Cách hoạt động\n- Daemon check định kỳ + lúc idle: local có tin mới chưa export → tự export; bundle máy khác mới hơn lần merge cuối → tự import --merge.\n- Chỉ dùng đúng đường Drive sync (bundle .enc), không thêm kênh nào khác.\n## Chi tiết\n- Mặc định TẮT (opt-in) — bật = consent bền cho sync tự động. Guard: không export khi đang write nặng; lỗi → báo, không retry điên.','f.doc.storage':'## Định nghĩa\nVị trí file global_memory.db trên máy, và cơ chế dời nó an toàn.\n## Cách hoạt động\n- Con trỏ cố định ~/.zemory/location.json quyết định vị trí (env override > pointer > mặc định).\n- Dời (Settings → Relocate): checkpoint WAL → copy → verify (integrity + đếm dòng) → đổi con trỏ → GIỮ bản .bak.\n## Chi tiết\n- Nên dời KHỎI ổ hệ thống khi DB lớn dần.\n- TUYỆT ĐỐI không để trong folder Drive/cloud-sync (WAL corrupt) — cảnh báo "⚠ cloud" nếu phát hiện.','f.doc.validate':'## Định nghĩa\nCổng kiểm tra bộ docs harness của project có đúng chuẩn không.\n## Cách hoạt động\n- Kiểm: link nội bộ trong docs/ (không gãy), độ dài changelog vs ngưỡng, sổ supersede, và cấu trúc repo theo 03_STRUCTURE.\n- ADVISORY: chỉ CHỈ RA chỗ lệch, KHÔNG tự sửa/di chuyển file.\n## Chi tiết\n- Lệnh: zemory validate. Báo đỏ khi lệch → agent tự nắn (git mv), hỏi trước khi đập lớn.','f.doc.grill':'## Định nghĩa\nCơ chế bắt agent LÀM RÕ yêu cầu trước khi bắt tay, chống hiểu sai / làm rộng quá.\n## Cách hoạt động\n- Kích hoạt tự động khi: yêu cầu đa nghĩa · thiếu dữ kiện · phạm vi không rõ · giả định ngầm · mâu thuẫn · trước thao tác khó đảo.\n- Quy trình: dừng → cái nào đọc code/docs ra được thì đọc → hỏi mỗi lần MỘT câu kèm đề xuất → chốt đủ rõ mới build.\n## Chi tiết\n- Gõ "grill" = ép chạy thủ công. Playbook đầy đủ: 04_SKILLS §grill.','f.doc.harness':'## Định nghĩa\nBộ khung docs/quy-tắc chuẩn của project để agent bám MỘT chuẩn thống nhất mọi repo.\n## Cách hoạt động\n- 6 file: 01_CONSTITUTION (bất biến) · 02_RULES (luật làm việc) · 03_STRUCTURE (cấu trúc folder) · 04_SKILLS (playbook) · 05_TODO · 06_CHANGES + AGENTS.md (cửa vào).\n- FILE .md là NGUỒN (file wins); DB chỉ index dẫn xuất cho search.\n## Chi tiết\n- Trạng thái ở đây = đủ 6 file + AGENTS trong project đang chọn chưa. Thiếu → zemory sync gap-fill.',
    'f.grpCore':'Lõi nhớ & tìm','f.grpSync':'Đồng bộ & lưu','f.grpHarness':'Harness (docs)','f.drive':'Drive sync (xuyên máy)','f.sched':'Scheduler nền','f.autostart':'Autostart (mở cùng PC)','f.autosync':'Tự sync memory','f.dbloc':'Nơi lưu DB','st.waitEmbed':'Chờ embed','st.scanning':'đang quét…','st.scanErr':'lỗi quét','st.notSynced':'chưa sync','st.enough':'đủ ','st.pending':' chờ','st.sessions':' phiên','st.notBuilt':'chưa build','st.linked':'đã link','st.notLinked':'chưa link','st.loadingDoc':'đang tải ','st.docErr':'lỗi tải doc','st.empty':'(trống)','st.buildingDigest':'⏳ Đang build digest… (có thể mất chút)','st.collapseMenu':'Thu gọn menu',
    'ttl.home':'Liếc nhanh bộ nhớ AI trên máy này','ttl.system':'Máy này làm được gì · trạng thái từng tính năng · Kiểm / Bật','ttl.recall':'Tìm lại phiên cũ (keyword + ngữ nghĩa) · xem lại hội thoại','ttl.projects':'Dự án · Harness · Graph','ttl.gmem':'Số liệu bộ nhớ · nguồn · quét · đồng bộ Drive · sao lưu','ttl.harness':'Chuẩn dùng chung (docs_template) · App | Non-app',
    'scope.justScanned':'vừa thêm ở lần quét gần nhất',
    'drv.syncing':'đang sync…','drv.syncingBg':'đang sync (chạy ẩn)…','drv.syncDone':'sync xong','drv.err':'lỗi',
    'drv.notLinked':'chưa link Drive','drv.notLinkedShort':'chưa link','drv.noFolder':'folder không tồn tại','drv.readOnly':'chỉ đọc','drv.linked':'đã link · {n} bundle',
    'pj.back':'Danh sách','drv.newest':'Tin mới nhất','drv.lastPush':'Đẩy lần cuối','drv.counted':'Đã đẩy / tổng','drv.never':'chưa từng','drv.pendN':'Còn {n} tin mới chưa đẩy lên Drive','drv.pendSub':'theo watermark máy này · bấm Đồng bộ ngay để đẩy nốt','drv.upToDate':'Đã đồng bộ đủ lên Drive','drv.upToDateSub':'lần đẩy mới hơn tin mới nhất — không còn gì chờ','drv.staleSub':'⚠ có tin mới hơn lần đẩy — chạy Quét nguồn rồi Đồng bộ ngay','scan.running':'đang quét…','scan.found':'+{n} tin mới · {f} file đổi','scan.none':'không có tin mới',
    'graph.trend':'Xu hướng graph','graph.trendNone':'Chưa có mốc nào — xu hướng bắt đầu từ lần graph được dựng lại kế tiếp.','graph.trendOne':'Mới 1 mốc. Cần ≥2 lần code đổi mới có xu hướng để so.','graph.trendBuilds':'lần dựng','graph.trendLower':'thấp hơn = tốt hơn',
    'nav.home':'Trang chủ','nav.recall':'Recall','nav.projects':'Dự án','nav.harness':'Harness',
    'nav.system':'Tính năng','rc.find':'Tìm kiếm','rc.sess':'Phiên',
    'qa.recallD':'tìm lại việc phiên trước','qa.syncD':'quét nguồn · đẩy lên Drive','qa.harnessD':'chuẩn & docs',
    'home.recentProj':'Dự án gần đây','home.allSess':'Tất cả phiên →','home.openHarness':'Mở Harness','home.memEngine':'Lõi bộ nhớ','home.docsHarness':'Docs Harness',
    'mem.thisMachine':'Máy này','mem.driveSync':'Đồng bộ Drive','mem.syncMode':'Chế độ đồng bộ',
    'act.scanKnown':'Quét nguồn đã biết','act.prune':'Dọn dự án đã mất','act.pruneTip':'Gỡ khỏi danh sách những project mà folder không còn tồn tại','prune.title':'Dọn dự án đã mất','prune.body':'Gỡ khỏi danh sách zemory những project mà folder không còn trên máy này? Folder · docs · bộ nhớ đều GIỮ NGUYÊN — chỉ bỏ khỏi danh sách.','prune.ok':'Dọn','prune.running':'đang dọn…','prune.done':'✓ đã gỡ {n} project khỏi danh sách','act.deepScan':'Quét sâu','act.syncNow':'Đồng bộ ngay','act.addProject':'Thêm dự án','act.run':'Chạy','act.pick':'Chọn…',
    'st.operational':'Hoạt động tốt','st.op':'ổn',
    'drv.privH':'Sao lưu & Riêng tư','drv.backup':'Sao lưu','drv.backupD':'Xuất toàn bộ DB nhớ ra 1 file snapshot để cất giữ.','drv.restore':'Phục hồi','drv.restoreD':'Nạp lại từ file snapshot, ghi đè DB hiện tại (giữ bản cũ .bak).','drv.forget':'Xoá nhớ','drv.forgetD':'Xoá vĩnh viễn session/message của 1 project — xem trước rồi mới xoá, tự backup.','drv.redact':'Che secret','drv.redactD':'Quét lại tin đã lưu, che token/key/PII lọt vào (đây là "privacy").',
    'home.all':'Tất cả →','home.recentSess':'Phiên gần đây','home.noSessions':'Chưa có phiên nào.','home.noProjects':'Chưa có project nào.',
    'st.loading':'…','st.global':'toàn cục','st.stored':'đã lưu','st.estimate':'ước tính','rail.needAttn':'cần chú ý','rail.allGreen':'Hoạt động tốt',
    'f.timeAny':'Thời gian: mọi lúc','f.time1':'24 giờ','f.time7':'7 ngày','f.time30':'30 ngày','f.time90':'90 ngày','f.typeAny':'Loại: mọi','f.originAny':'Nguồn: mọi','f.agentAny':'Agent: mọi','f.noResultYet':'— kết quả',
    'q.zero':'0 kết quả','q.noResults':'không có kết quả','q.results':'kết quả','q.searching':'đang tìm…','q.err':'lỗi',
    'recall.loadingRecent':'đang tải tin gần nhất…','recall.recentLabel':'gần nhất · ','recall.preview':'Xem trước','recall.copy':'Sao chép','recall.copied':'đã chép','recall.previewEmpty':'Chọn một kết quả để xem các message lân cận ngay tại đây.','recall.loadingCtx':'đang tải…','recall.noCtx':'không có ngữ cảnh','recall.ctxErr':'lỗi tải ngữ cảnh','recall.openFull':'Mở full session',
    'proj.linkedHere':'Đã liên kết · máy này','proj.count':'dự án','proj.thisMachine':'máy này','proj.noneLinked':'Chưa có project nào liên kết trên máy này.','proj.noMatch':'Không có project khớp bộ lọc.','proj.searchPh':'Tìm project…','proj.typeAll':'Loại: mọi','proj.sortManual':'Thứ tự tự sắp','proj.sortRecent':'Mới cập nhật','proj.sortName':'Tên A→Z','proj.sortSessions':'Nhiều phiên',
    'glay.force':'Xếp: lực hút','glay.cluster':'Xếp: theo folder','glay.layers':'Xếp: theo tầng import',
    'graph.orphans':'Chỉ orphan','graph.spacing':'Giãn cách','graph.relayout':'Tự xếp lại','graph.hint2':'Kéo node · Shift+kéo nền = bôi chọn nhiều · Ctrl+bấm = thêm/bớt · kéo 1 node đã chọn = kéo cả nhóm · lăn = zoom · kéo nền = di chuyển · Ctrl+Z hoàn tác · bấm đúp nền = 1:1','graph.selN':'node đã chọn','graph.selHint':'Kéo một node trong nhóm = kéo cả nhóm · Ctrl+Z hoàn tác cả nhóm','graph.selEdges':'Import trong nhóm','graph.selLoc':'Tổng số dòng','graph.edgeOut':'Cạnh đi ra','graph.edgeIn':'Cạnh đi vào','graph.touchedBy':'Phiên từng đụng','graph.builtAt':'dựng lúc','graph.legendTip':'Bấm để ẩn/hiện nhóm slot này','graph.relDeclared':'Cạnh KHAI BÁO — tất định, luôn đúng','graph.relInferred':'Cạnh SUY LUẬN — khớp theo tên, vẽ nét đứt, có thể sai','graph.treeLoading':'Cấu trúc folder…','graph.inspector':'Node Inspector','graph.pickNode':'Bấm 1 node để xem chi tiết.','graph.checks':'Kiểm tra (từ graph)','graph.brokenDocs':'tài liệu gãy link','graph.brokenDocsHint':'link/reference gãy','graph.orphanFiles':'file orphan','graph.orphanHint':'từ graph — không ai import','graph.neverModified':'file chưa từng sửa','graph.neverModifiedHint':'cân nhắc dọn','graph.harnessOk':'harness đủ 6 file + AGENTS','graph.validateOk':'validate xanh','graph.overview':'Tổng quan','graph.mHub':'Hub quá tải','graph.mIso':'File cô lập/orphan','graph.mUtil':'util lẫn nghiệp vụ','graph.ckOrphan':'file orphan (không ai import)','graph.ckOrphanHint':'từ graph','graph.ckThreshold':'ngưỡng',
    'mem.sources':'Sources — bao gồm / loại trừ','mem.sourcesD':'Bỏ tick lane để loại khỏi sync + recall (bộ lọc, không xoá).','mem.scanHint':'<b>Quét nguồn đã biết</b>: quét lại các store agent đã biết (nhanh). · <b>Quét sâu</b>: dò toàn ổ tìm agent/máy mới.','mem.autoH':'Tự động — daemon tự làm gì khi BẬT','mem.scheduler':'Scheduler nền','mem.schedulerD':'Bật: khi máy rảnh, daemon tự chạy scan → embed → digest; nhường quyền ghi cho CLI.','mem.autostart':'Mở cùng PC','mem.autostartD':'BẬT: đăng nhập máy là daemon đã chạy nền sẵn ở port 4444 (không phải mở tay).','mem.autosync':'Tự sync memory','mem.autosyncD':'BẬT: có tin mới → tự export bundle; bundle máy khác mới hơn → tự import --merge. Chỉ đi qua Drive (.enc), không thêm kênh nào.',
    'drv.chooseFolder':'Chọn folder Drive dùng chung: mỗi máy xuất bundle mã hoá (.enc) vào đây, máy khác merge về. Dán đường dẫn rồi bấm Link.','drv.ph':'vd G:\\My Drive\\zemory','drv.lean':'Gọn (−74%)','drv.full':'Đầy đủ (khôi phục)',
    'harness.descA':'Bản mẫu TRẮNG mọi project copy về · 5 shell chung khoá byte-identical ·','harness.descB':'khác theo profile.','harness.docsTab':'Docs harness','harness.structTab':'Cấu trúc folder','harness.stdSet':'Bộ chuẩn','harness.tree':'Cây thư mục chuẩn —','harness.required':'★ = bắt buộc','harness.opt':'opt = tạo khi có concern','harness.routing':'Routing — sửa gì → vào đâu','ph.pick':'Chọn một file bên trái để xem nội dung.','ph.none':'Project này chưa có docs harness.','ph.err':'Lỗi tải.','ph.valOk':'Docs hợp lệ ✓','ph.valBad':'Docs có vấn đề — chạy zemory validate xem chi tiết.','nav.gmem':'Global Memory','gm.sources':'Top Sources','gm.stats':'Thống kê bộ nhớ','gm.tabMem':'Bộ nhớ','gm.tabSync':'Đồng bộ & Sao lưu','gm.pendingHint':'tin chờ nhúng vector','gm.pendingNone':'đã embed đủ','hint.pending':'Số tin còn chờ nhúng vector (embed). >0 nghĩa là lane semantic chưa phủ hết — recall vẫn chạy bằng FTS (fail-open).','gm.pending':'chờ','gm.digestFull':'đủ mọi phiên','gm.digestLeft':'{n} phiên chưa build','sess.export':'Xuất .md','sess.pick':'Chọn một phiên bên trái để xem toàn bộ hội thoại.','sess.none':'Không có phiên nào.','sess.notFound':'Không tìm thấy phiên.','sess.pickFirst':'Chọn một phiên trước đã.','sess.untitled':'(chưa đặt tên)','sess.searchPh':'Tìm phiên…','sess.rescan':'Quét lại để lấy tên phiên mới nhất','sess.rescanned':'đã quét lại','sess.chars':'ký tự','sess.roleTool':'tool','f.typeUser':'user (người gõ)','f.typeTool':'tool (output)','ins.usage':'Hoạt động theo ngày','ins.projects':'Bộ nhớ theo dự án','ins.growth':'Tăng trưởng bộ nhớ','ins.noData':'Chưa đủ dữ liệu.','ins.days':'ngày','ins.peak':'đỉnh','ins.sess':'phiên','ins.months':'tháng','ins.total':'tổng','graph.collapseTree':'Thu gọn cây folder','graph.collapsePanel':'Thu gọn bảng thông tin','graph.panelPos':'Đổi vị trí bảng: phải ⇄ trên',
    'sys.health':'Sức khoẻ {ok}/{n} OK','sys.hint':'Bấm 1 tính năng bên trái → mô tả + Kiểm / Bật bên phải','sys.recheckAll':'Kiểm lại tất cả','sys.rechecking':'đang kiểm…','sys.rechecked':'đã kiểm','sys.pick':'Chọn 1 tính năng bên trái.','sys.on':'Bật','sys.off':'Tắt','sys.buildMissing':'Build digest còn thiếu','sys.buildNow':'Build digest ngay','sys.recheck':'Kiểm',
    'set.title':'Cài đặt','set.theme':'Giao diện','set.lang':'Ngôn ngữ','set.langD':'ngôn ngữ giao diện','set.dbLoc':'Nơi lưu DB','set.dbLocD':'dời khỏi ổ hệ thống (WAL an toàn) · giữ bản cũ .bak','set.relocate':'Dời…','set.shortcut':'Lối tắt Desktop','set.shortcutD':'tạo/gỡ shortcut ngoài desktop','set.about':'Giới thiệu','set.version':'Phiên bản','set.machine':'Máy này','set.dbPath':'Nơi lưu DB','set.engine':'Engine','set.engineV':'Local-first · 0 model API · Apache-2.0','set.updateHint':'Cập nhật bản cài local: git pull → npm run build.',
    'addp.title':'Thêm dự án','addp.desc':'Dán đường dẫn folder của dự án, hoặc bấm Chọn folder… để mở hộp thoại hệ điều hành.','addp.ph':'vd D:\\Zyro\\App\\MyProject','addp.browse':'Chọn folder…','addp.cancel':'Huỷ','addp.ok':'Thêm','addp.noPicker':'Máy này không hỗ trợ hộp thoại chọn folder — nhập tay đường dẫn.','addp.needPath':'Nhập đường dẫn trước.','addp.adding':'đang thêm…',
    'mg.title':'Gộp session vào project','mg.noTarget':'Chưa có project đã liên kết nào để gộp vào. Thêm 1 project trước.','mg.ok':'Gộp','mg.from':'Gộp session của folder:','mg.into':'Vào project:','mg.note':'Đổi project_root của các session sang project đích (không tự đảo được).','mg.merging':'đang gộp…',
    'rm.title':'Gỡ project khỏi zemory','rm.body':'Gỡ khỏi danh sách zemory? (folder/docs/memory GIỮ nguyên)','rm.ok':'Gỡ',
    'reloc.needPath':'nhập đường dẫn trước','reloc.title':'Dời nơi lưu DB','reloc.body':'Dời DB sang đây? Giữ bản cũ .bak.','reloc.ok':'Dời','reloc.moving':'đang dời…','reloc.done':'đã dời',
    'bk.running':'đang sao lưu…','bk.done':'đã lưu',
    'rs.title':'Phục hồi từ snapshot','rs.ok':'Phục hồi','rs.desc':'GHI ĐÈ DB nhớ hiện tại bằng file snapshot. Bản hiện tại được giữ .bak.','rs.ph':'Đường dẫn file snapshot (.db)','rs.needPath':'Chọn hoặc nhập file snapshot trước.','rs.restoring':'đang phục hồi…','rs.done':'đã phục hồi · bản cũ giữ ở',
    'fg.title':'Xoá nhớ 1 project','fg.noProj':'Chưa có project đã liên kết nào. Thêm 1 project trước.','fg.desc':'Chọn project để xoá vĩnh viễn session/message của nó (xem trước rồi mới xoá, tự backup).','fg.preview':'Xem trước','fg.previewing':'đang xem trước…','fg.noMatch':'không có tin nào khớp project này','fg.confirmTitle':'Xác nhận xoá nhớ','fg.willDelete':'Sẽ xoá VĨNH VIỄN {s} phiên · {m} tin (+{d} digest) của:','fg.autoBackup':'Tự backup trước khi xoá.','fg.deleteOk':'Xoá vĩnh viễn','fg.deleting':'đang xoá…','fg.deleted':'đã xoá {m} tin',
    'rd.title':'Che secret trên tin đã lưu','rd.body':'Quét lại toàn bộ tin đã lưu và che secret/PII lọt vào? (Chỉ che, không xoá tin.)','rd.ok':'Che secret','rd.running':'đang che secret…','rd.done':'đã che secret trên nội dung đã lưu',
    'hint.msg':'Tổng số tin (message) đã lưu trong DB — mọi phiên · mọi agent · mọi máy đã đồng bộ. Nguồn: bảng messages.','hint.tok':'Ước tính tổng token của toàn bộ nội dung đã lưu (xấp xỉ ký-tự ÷ 4). Chỉ để hình dung quy mô, KHÔNG phải số đo chính xác.','hint.vec':'% tin đã được nhúng vector (embed) để tìm theo ngữ nghĩa. 100% = mọi tin có vector; <100% = còn tin đang chờ embed.','hint.dims':'Số chiều của mỗi vector (256d = Matryoshka cắt từ 768d rồi chuẩn hoá lại). Lưu trong vec_config.dims — index đã build theo số nào thì query đi theo số đó.','hint.store':'Kích thước file DB global_memory.db trên đĩa (đổi nơi lưu ở Cài đặt).','hint.sess':'Số phiên hội thoại đã lưu (mỗi transcript của agent = 1 phiên). Nguồn: bảng sessions.','hint.section':'Số mục (section) tài liệu đã tách & index để tìm. Nguồn: bảng section.','hint.digest':'Số phiên đã có bản tóm tắt (digest) — giúp recall rẻ token. Nguồn: bảng session_digest.','hint.changelog':'Số mục changelog đã index từ 06_CHANGES.md của các project. Nguồn: bảng changelog.','hint.doc':'Số tài liệu .md đã nạp làm index tìm kiếm (nguồn thật là file .md — file wins). Nguồn: bảng doc.','hint.stores':'Số "kho" transcript agent zemory đã phát hiện & theo dõi (vd ~/.claude, ~/.codex…). Nguồn: bảng known_stores.','hint.projects':'Số project đã liên kết (zemory quản lý) trên máy này. Bấm để mở màn Dự án.','hint.lastsync':'Lần gần nhất đồng bộ Drive thành công (max sync_state.updated_at). "—" = chưa từng sync.'
  },en:{
    'f.doc.memory':'## Definition\nMACHINE-level global memory: one local SQLite (~/.zemory/global_memory.db) that gathers transcripts from EVERY agent session (Claude Code · Codex · Continue · LM Studio) plus web chat (ChatGPT) into one place, searchable across projects and across machines.\n## How it works\n- The host\'s Stop hook writes the transcript to disk; adapters read it incrementally → ingest into the sessions/messages tables. Mechanical, 0 tokens, NO model call.\n- Dedupe on UNIQUE(session_id, uuid) so a re-scan never doubles up; secrets (sk-…, AWS/GCP/GitHub tokens, JWT) are redacted AT ingest time.\n- Search via FTS5: two lanes, word + trigram (Vietnamese), filtering by project FIRST and only then limiting results.\n- Recall is ON-DEMAND: the agent calls it when the prompt touches past work or errors; the whole memory is NEVER auto-injected into every prompt.\n## Details\n- The REAL source is the host\'s transcript; sessions/messages are a DERIVED index, safe to drop and rebuild at any time (original messages are never deleted or edited).\n- This is where tokens are genuinely saved: the agent remembers the previous session instead of making you retell it.\n- Command: zemory memory search \\"<q>\\" [--all].','f.doc.vector':'## Definition\nThe MEANING layer: every message is embedded into a vector stored alongside FTS, so similar ideas are found even when the words differ.\n## How it works\n- EmbeddingGemma-300M runs LOCALLY via Transformers.js (ONNX, no Python/GPU) — a small model that only MEASURES meaning, it does NOT generate text (so the \\"0 LLM\\" rule still holds).\n- 256d vectors (Matryoshka: sliced from 768d + renormalised) stored via sqlite-vec INSIDE global_memory.db — no second database.\n- Embedding is incremental (zemory memory embed) or runs while idle during a scan; long messages are split into overlapping windows.\n## Details\n- A DERIVED index — rebuildable (memory embed --rebuild).\n- Fail-open (article 9): if the model errors or a vector is missing, recall falls back to FTS and never dies with it.\n- Coverage = vectors / messages; \\"pending\\" is the backlog not embedded yet.','f.doc.hybrid':'## Definition\nCombined search: blends BM25 (exact keyword match) with vectors (semantic) into a single ranked list.\n## How it works\n- Two streams run in parallel (FTS + vector), each producing its own ranking.\n- Merged with RRF (Reciprocal Rank Fusion) — no hand-tuned weights needed.\n- Toggles instantly and only changes HOW results rank; it never touches the data. Off = pure FTS.\n## Details\n- Wins most on questions phrased differently from the original wording.\n- Bench gate: hybrid only counts as a win when recall@3 ≥ FTS.','f.doc.rerank':'## Definition\nA rank-refinement step: after hybrid returns the top-N candidates, a cross-encoder rescores each (query, candidate) pair and reorders them.\n## How it works\n- Model bge-reranker-base (ONNX, sharing the inference layer and cache with the embedder).\n- Only the top-N are rescored (never the whole corpus), so the cost stays bounded.\n## Details\n- OPT-IN (off by default) because it is slower; worth turning on for a large or noisy corpus and hard questions.\n- Fail-open: if the model errors, the RRF order is kept and nothing breaks.','f.doc.digest':'## Definition\nA SHORT, filtered summary of EACH session (work done · files touched · decisions · errors · outcome) so recall reads cheaply in tokens, with a path down to the original messages when you need to verify.\n## How it works\n- Extractive, 0 LLM: it pulls the \\"expensive\\" sentences out of the transcript (existing vectors may help CHOOSE sentences, never GENERATE them).\n- Every item carries an ANCHOR (message id) → drill down to the real message verbatim.\n- Regenerated on the scan cadence, guarded by a content hash (a session that grows gets its digest refreshed).\n## Details\n- One digest ↔ EXACTLY one session (the structure prevents mixing sessions).\n- A DERIVED layer — rebuild with memory digest --all.','f.doc.graph':'## Definition\nA relationship graph DERIVED from code + docs + memory, answering \\"what relates to / what does X affect\\" — questions routing and recall cannot answer.\n## How it works\n- Built DETERMINISTICALLY, 0 LLM: import graph (TS/JS/Python) + symbols via tree-sitter + declared edges (routing · references · supersede · touches from digests).\n- Two edge classes: DECLARED (a baseline that is always correct) vs INFERRED (semantic_neighbor from vectors, labelled as such, fail-open).\n- Metrics: fan-in/out · orphan/dead · fitness · blast radius for \\"who does editing file X touch\\".\n## Details\n- Viewed on the Graph tab INSIDE each project; external apps read it via graph export (a versioned contract).\n- An internal engine of memory, NOT a fifth capability.','f.doc.drive':'## Definition\nSyncs memory between machines through an ENCRYPTED bundle (.enc) placed in a shared Drive folder.\n## How it works\n- Export: pack sessions/messages/known_stores → encrypt → write the .enc to Drive. Import: decrypt → merge.\n- The merge is ADDITIVE: it only ADDS, keeps each session\'s provenance (host/origin/source) intact, and never overwrites.\n- A \\"lean\\" bundle carries only the 3 source tables (−74% size); delta mode uses a watermark to carry only what is new.\n## Details\n- Passwords and 2FA NEVER enter zemory; the live DB is NEVER placed in a cloud-synced folder (WAL corruption) — only the .enc bundle travels through Drive.\n- Link and sync from the Memory & Sync screen.','f.doc.scheduler':'## Definition\nA timer inside the daemon that performs memory maintenance while the machine is idle, so you never have to type the commands.\n## How it works\n- When idle and there is a backlog: runs scan → embed → digest in sequence, throttling CPU.\n- Yields the WRITE GATE while the CLI is writing to the DB (this is the root fix for \\"database is locked\\" caused by two processes writing at once).\n## Details\n- ON by default. It does not run a heavy rebuild for every small change (debounced on mtime).','f.doc.autostart':'## Definition\nStarts the zemory daemon automatically when you log in to the machine.\n## How it works\n- Writes or removes the OS startup entry: Windows Startup shortcut (.cmd) · macOS launchd · Linux xdg-autostart. Reconciled when the daemon binds.\n## Details\n- OFF by default. Turning it on means zemory is already running in the background on port 4444 the moment you boot.','f.doc.autosync':'## Definition\nRuns Drive sync automatically when it detects a divergence between this machine and the shared bundle.\n## How it works\n- The daemon checks periodically and while idle: new local messages not yet exported → auto export; another machine\'s bundle newer than the last merge → auto import --merge.\n- Uses only the Drive sync path (.enc bundle); it adds no other channel.\n## Details\n- OFF by default (opt-in) — enabling it is durable consent for automatic sync. Guards: no export during a heavy write; on error it reports instead of retrying wildly.','f.doc.storage':'## Definition\nWhere global_memory.db lives on the machine, and how to move it safely.\n## How it works\n- A fixed pointer at ~/.zemory/location.json decides the location (env override > pointer > default).\n- Moving it (Settings → Relocate): checkpoint the WAL → copy → verify (integrity + row count) → flip the pointer → KEEP a .bak.\n## Details\n- Worth moving OFF the system drive as the DB grows.\n- NEVER put it in a Drive/cloud-synced folder (WAL corruption) — a \\"⚠ cloud\\" warning appears if one is detected.','f.doc.validate':'## Definition\nThe gate that checks whether a project\'s harness docs follow the standard.\n## How it works\n- Checks: internal links inside docs/ (not broken), changelog length against the threshold, the supersede ledger, and repo structure against 03_STRUCTURE.\n- ADVISORY: it only POINTS OUT drift, it never edits or moves files itself.\n## Details\n- Command: zemory validate. A red report means the agent straightens things out (git mv), asking first before any large move.','f.doc.grill':'## Definition\nThe mechanism that forces the agent to CLARIFY a request before starting, guarding against misreading it or building far too much.\n## How it works\n- Triggers automatically on: an ambiguous request · missing facts · unclear scope · hidden assumptions · contradictions · before any hard-to-reverse operation.\n- Procedure: stop → read code/docs for anything answerable that way → ask ONE question at a time, each with a proposal → only build once it is clear enough.\n## Details\n- Typing \\"grill\\" forces a manual run. Full playbook: 04_SKILLS §grill.','f.doc.harness':'## Definition\nThe project\'s standard docs and rules skeleton, so the agent follows ONE consistent standard across every repo.\n## How it works\n- Six files: 01_CONSTITUTION (invariants) · 02_RULES (working rules) · 03_STRUCTURE (folder layout) · 04_SKILLS (playbooks) · 05_TODO · 06_CHANGES, plus AGENTS.md (the entry point).\n- The .md FILE is the SOURCE (file wins); the DB is only a derived index for search.\n## Details\n- The status here means whether the selected project has all 6 files plus AGENTS. Missing → zemory sync gap-fills them.',
    'f.grpCore':'Memory & search core','f.grpSync':'Sync & storage','f.grpHarness':'Harness (docs)','f.drive':'Drive sync (cross-machine)','f.sched':'Background scheduler','f.autostart':'Autostart (with PC)','f.autosync':'Auto-sync memory','f.dbloc':'DB location','st.waitEmbed':'Pending embed','st.scanning':'scanning…','st.scanErr':'scan error','st.notSynced':'never synced','st.enough':'all ','st.pending':' pending','st.sessions':' sessions','st.notBuilt':'not built','st.linked':'linked','st.notLinked':'not linked','st.loadingDoc':'loading ','st.docErr':'failed to load doc','st.empty':'(empty)','st.buildingDigest':'⏳ Building digests… (may take a while)','st.collapseMenu':'Collapse menu',
    'ttl.home':'AI memory on this machine at a glance','ttl.system':'What this machine can do · per-feature status · Check / Enable','ttl.recall':'Find past sessions (keyword + semantic) · reread conversations','ttl.projects':'Projects · Harness · Graph','ttl.gmem':'Memory stats · sources · scan · Drive sync · backup','ttl.harness':'Shared standard (docs_template) · App | Non-app',
    'scope.justScanned':'added by the latest scan',
    'drv.syncing':'syncing…','drv.syncingBg':'syncing (in background)…','drv.syncDone':'sync complete','drv.err':'error',
    'drv.notLinked':'Drive not linked','drv.notLinkedShort':'not linked','drv.noFolder':'folder does not exist','drv.readOnly':'read-only','drv.linked':'linked · {n} bundle',
    'pj.back':'All projects','drv.newest':'Newest message','drv.lastPush':'Last push','drv.counted':'Pushed / total','drv.never':'never','drv.pendN':'{n} new messages not pushed to Drive yet','drv.pendSub':'per this machine watermark · hit Sync now to push them','drv.upToDate':'Fully synced to Drive','drv.upToDateSub':'last push is newer than the newest message — nothing waiting','drv.staleSub':'⚠ messages newer than the last push — run Scan sources, then Sync now','scan.running':'scanning…','scan.found':'+{n} new messages · {f} files changed','scan.none':'no new messages',
    'graph.trend':'Graph trend','graph.trendNone':'No data points yet — the trend starts at the next graph rebuild.','graph.trendOne':'Only 1 data point. A trend needs ≥2 code changes to compare.','graph.trendBuilds':'builds','graph.trendLower':'lower is better',
    'nav.home':'Home','nav.recall':'Recall','nav.projects':'Projects','nav.harness':'Harness',
    'nav.system':'Features','rc.find':'Search','rc.sess':'Sessions',
    'qa.recallD':'find what earlier sessions did','qa.syncD':'scan sources · push to Drive','qa.harnessD':'standards & docs',
    'home.recentProj':'Recent Projects','home.allSess':'All sessions →','home.openHarness':'Open Harness','home.memEngine':'Memory Engine','home.docsHarness':'Docs Harness',
    'mem.thisMachine':'This Machine','mem.driveSync':'Drive Sync','mem.syncMode':'Sync Mode',
    'act.scanKnown':'Scan Known','act.prune':'Prune missing','act.pruneTip':'Remove projects whose folder no longer exists from the list','prune.title':'Prune missing projects','prune.body':'Remove projects whose folder is gone from the list? The folder, docs and memory are all KEPT — only the list entry goes.','prune.ok':'Prune','prune.running':'pruning…','prune.done':'✓ removed {n} project(s) from the list','act.deepScan':'Deep Scan','act.syncNow':'Sync Now','act.addProject':'Add Project','act.run':'Run','act.pick':'Pick…',
    'st.operational':'All systems operational','st.op':'ok',
    'drv.privH':'Backup & Privacy','drv.backup':'Backup','drv.backupD':'Export the whole memory DB to a snapshot file to keep.','drv.restore':'Restore','drv.restoreD':'Load from a snapshot file, overwriting the current DB (keeps a .bak).','drv.forget':'Forget','drv.forgetD':'Permanently delete a project\'s sessions/messages — preview first, auto-backup.','drv.redact':'Redact','drv.redactD':'Re-scan stored messages and mask tokens/keys/PII that slipped in (this is "privacy").',
    'home.all':'See all →','home.recentSess':'Recent Sessions','home.noSessions':'No sessions yet.','home.noProjects':'No projects yet.',
    'st.loading':'…','st.global':'global','st.stored':'stored','st.estimate':'estimate','rail.needAttn':'needs attention','rail.allGreen':'All systems operational',
    'f.timeAny':'Time: any time','f.time1':'24h','f.time7':'7 days','f.time30':'30 days','f.time90':'90 days','f.typeAny':'Type: any','f.originAny':'Origin: any','f.agentAny':'Agent: any','f.noResultYet':'— results',
    'q.zero':'0 results','q.noResults':'no results','q.results':'results','q.searching':'searching…','q.err':'error',
    'recall.loadingRecent':'loading recent messages…','recall.recentLabel':'recent · ','recall.preview':'Preview','recall.copy':'Copy','recall.copied':'copied','recall.previewEmpty':'Select a result to preview its nearby messages here.','recall.loadingCtx':'loading…','recall.noCtx':'no context','recall.ctxErr':'context load error','recall.openFull':'Open full session',
    'proj.linkedHere':'Linked · this machine','proj.count':'projects','proj.thisMachine':'this machine','proj.noneLinked':'No projects linked on this machine yet.','proj.noMatch':'No projects match the filter.','proj.searchPh':'Search projects…','proj.typeAll':'Type: any','proj.sortManual':'Manual order','proj.sortRecent':'Recently updated','proj.sortName':'Name A→Z','proj.sortSessions':'Most sessions',
    'glay.force':'Layout: force','glay.cluster':'Layout: by folder','glay.layers':'Layout: import layers',
    'graph.orphans':'Orphans only','graph.spacing':'Spacing','graph.relayout':'Re-layout','graph.hint2':'Drag a node · Shift+drag background = marquee select · Ctrl+click = add/remove · drag a selected node = move the whole group · scroll = zoom · drag background = pan · Ctrl+Z undo · double-click background = reset','graph.selN':'nodes selected','graph.selHint':'Drag any node in the group to move them all · Ctrl+Z undoes the whole group','graph.selEdges':'Imports within group','graph.selLoc':'Total lines','graph.edgeOut':'Outgoing edges','graph.edgeIn':'Incoming edges','graph.touchedBy':'Sessions that touched it','graph.builtAt':'built at','graph.legendTip':'Click to show/hide this slot group','graph.relDeclared':'DECLARED edge — deterministic, always true','graph.relInferred':'INFERRED edge — name match, dashed, can be wrong','graph.treeLoading':'Folder structure…','graph.inspector':'Node Inspector','graph.pickNode':'Click a node to see details.','graph.checks':'Checks (from graph)','graph.brokenDocs':'broken documents','graph.brokenDocsHint':'broken link/reference','graph.orphanFiles':'orphan files','graph.orphanHint':'from the graph — nothing imports it','graph.neverModified':'files never modified','graph.neverModifiedHint':'worth cleaning up','graph.harnessOk':'harness has all 6 files + AGENTS','graph.validateOk':'validate passes','graph.overview':'Overview','graph.mHub':'Overloaded hubs','graph.mIso':'Isolated/orphan files','graph.mUtil':'util impurity','graph.ckOrphan':'orphan files (nothing imports)','graph.ckOrphanHint':'from the graph','graph.ckThreshold':'threshold',
    'mem.sources':'Sources — include / exclude','mem.sourcesD':'Untick a lane to exclude it from sync + recall (a filter, not a delete).','mem.scanHint':'<b>Scan Known</b>: re-scan known agent stores (fast). · <b>Deep Scan</b>: sweep the whole disk for new agents/machines.','mem.autoH':'Automation — what the daemon does when ON','mem.scheduler':'Background scheduler','mem.schedulerD':'On: when the machine is idle, the daemon runs scan → embed → digest; yields write access to the CLI.','mem.autostart':'Launch with PC','mem.autostartD':'ON: the daemon is already running on port 4444 by the time you log in (no manual start).','mem.autosync':'Auto-sync memory','mem.autosyncD':'ON: new messages → auto-export a bundle; a newer bundle on another machine → auto import --merge. Only travels via Drive (.enc), no other channel.',
    'drv.chooseFolder':'Pick a shared Drive folder: each machine exports an encrypted bundle (.enc) here, other machines merge it in. Paste the path then click Link.','drv.ph':'e.g. G:\\My Drive\\zemory','drv.lean':'Lean (−74%)','drv.full':'Full (restore)',
    'harness.descA':'The BLANK template every project copies · 5 shared shells locked byte-identical ·','harness.descB':'differ per profile.','harness.docsTab':'Docs harness','harness.structTab':'Folder structure','harness.stdSet':'Standard set','harness.tree':'Standard folder tree —','harness.required':'★ = required','harness.opt':'opt = created when there\'s a real concern','harness.routing':'Routing — what to change → where it lives','ph.pick':'Pick a file on the left to view it.','ph.none':'This project has no harness docs yet.','ph.err':'Load error.','ph.valOk':'Docs valid ✓','ph.valBad':'Docs have issues — run zemory validate for details.','nav.gmem':'Global Memory','gm.sources':'Top Sources','gm.stats':'Memory Statistics','gm.tabMem':'Memory','gm.tabSync':'Sync & Backup','gm.pendingHint':'messages waiting to be embedded','gm.pendingNone':'fully embedded','hint.pending':'Messages still waiting to be embedded as vectors. >0 means the semantic lane is incomplete — recall still works via FTS (fail-open).','gm.pending':'pending','gm.digestFull':'covers every session','gm.digestLeft':'{n} sessions not built','sess.export':'Export .md','sess.pick':'Pick a session on the left to view the full conversation.','sess.none':'No sessions.','sess.notFound':'Session not found.','sess.pickFirst':'Pick a session first.','sess.untitled':'(untitled)','sess.searchPh':'Search sessions…','sess.rescan':'Rescan to pick up the newest session names','sess.rescanned':'rescanned','sess.chars':'chars','sess.roleTool':'tool','f.typeUser':'user (typed)','f.typeTool':'tool (output)','ins.usage':'Daily activity','ins.projects':'Memory by project','ins.growth':'Memory growth','ins.noData':'Not enough data.','ins.days':'days','ins.peak':'peak','ins.sess':'sessions','ins.months':'months','ins.total':'total','graph.collapseTree':'Collapse folder tree','graph.collapsePanel':'Collapse info panel','graph.panelPos':'Panel position: right ⇄ top',
    'sys.health':'Health {ok}/{n} OK','sys.hint':'Click a feature on the left → description + Check / Toggle on the right','sys.recheckAll':'Recheck all','sys.rechecking':'checking…','sys.rechecked':'done','sys.pick':'Select a feature on the left.','sys.on':'On','sys.off':'Off','sys.buildMissing':'Build missing digests','sys.buildNow':'Build digest now','sys.recheck':'Recheck',
    'set.title':'Settings','set.theme':'Theme','set.lang':'Language','set.langD':'UI language','set.dbLoc':'DB location','set.dbLocD':'move off the system drive (WAL-safe) · keeps the old copy as .bak','set.relocate':'Relocate…','set.shortcut':'Desktop shortcut','set.shortcutD':'create/remove an outside-desktop shortcut','set.about':'About','set.version':'Version','set.machine':'This machine','set.dbPath':'DB location','set.engine':'Engine','set.engineV':'Local-first · 0 model API · Apache-2.0','set.updateHint':'Update the local install: git pull → npm run build.',
    'addp.title':'Add Project','addp.desc':'Paste the project\'s folder path, or click Browse… to open the OS folder picker.','addp.ph':'e.g. D:\\Zyro\\App\\MyProject','addp.browse':'Browse…','addp.cancel':'Cancel','addp.ok':'Add','addp.noPicker':'This machine doesn\'t support the folder picker — type the path manually.','addp.needPath':'Enter a path first.','addp.adding':'adding…',
    'mg.title':'Merge sessions into a project','mg.noTarget':'No linked project to merge into. Add a project first.','mg.ok':'Merge','mg.from':'Merge sessions of folder:','mg.into':'Into project:','mg.note':'Repoints the sessions\' project_root to the target (not auto-reversible).','mg.merging':'merging…',
    'rm.title':'Remove project from zemory','rm.body':'Remove from zemory\'s list? (folder/docs/memory are KEPT)','rm.ok':'Remove',
    'reloc.needPath':'enter a path first','reloc.title':'Relocate DB','reloc.body':'Move the DB here? The old copy is kept as .bak.','reloc.ok':'Move','reloc.moving':'moving…','reloc.done':'moved',
    'bk.running':'backing up…','bk.done':'saved',
    'rs.title':'Restore from snapshot','rs.ok':'Restore','rs.desc':'OVERWRITE the current memory DB with a snapshot file. The current one is kept as .bak.','rs.ph':'Snapshot file path (.db)','rs.needPath':'Pick or enter a snapshot file first.','rs.restoring':'restoring…','rs.done':'restored · old copy kept at',
    'fg.title':'Forget a project\'s memory','fg.noProj':'No linked project yet. Add a project first.','fg.desc':'Pick a project to permanently delete its sessions/messages (preview first, auto-backup).','fg.preview':'Preview','fg.previewing':'previewing…','fg.noMatch':'no messages match this project','fg.confirmTitle':'Confirm forget','fg.willDelete':'Will PERMANENTLY delete {s} sessions · {m} messages (+{d} digests) of:','fg.autoBackup':'Auto-backup before deleting.','fg.deleteOk':'Delete permanently','fg.deleting':'deleting…','fg.deleted':'deleted {m} messages',
    'rd.title':'Redact secrets in stored messages','rd.body':'Re-scan all stored messages and mask secrets/PII that slipped in? (Masks only, no delete.)','rd.ok':'Redact','rd.running':'redacting…','rd.done':'redacted stored content',
    'hint.msg':'Total messages stored in the DB — all sessions · all agents · all synced machines. Source: messages table.','hint.tok':'Rough token estimate of all stored content (~ chars ÷ 4). For scale only, NOT an exact measure.','hint.vec':'% of messages embedded as vectors for semantic search. 100% = all embedded; <100% = some still pending.','hint.dims':'Dimensions per vector (256d = Matryoshka slice of 768d, re-normalised). Stored in vec_config.dims — queries follow whatever the built index uses.','hint.store':'Size of the global_memory.db file on disk (change location under Settings).','hint.sess':'Conversation sessions stored (one agent transcript = one session). Source: sessions table.','hint.section':'Doc sections split & indexed for search. Source: section table.','hint.digest':'Sessions that have a summary (digest) — makes recall cheaper on tokens. Source: session_digest table.','hint.changelog':'Changelog entries indexed from each project 06_CHANGES.md file. Source: changelog table.','hint.doc':'Markdown docs loaded as a search index (the .md files are the real source — file wins). Source: doc table.','hint.stores':'Agent transcript "stores" zemory discovered & tracks (e.g. ~/.claude, ~/.codex…). Source: known_stores table.','hint.projects':'Projects linked (managed by zemory) on this machine. Click to open the Projects screen.','hint.lastsync':'Last successful Drive sync (max sync_state.updated_at). "—" = never synced.'
  }};
  function t(k){var d=I18N[LANG]||I18N.vi;return (d&&d[k]!=null)?d[k]:(I18N.vi[k]!=null?I18N.vi[k]:k);}
  function applyI18n(lang){if(lang)LANG=(lang==='en'?'en':'vi');
    document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');var v=t(k);if(v!=null)el.innerHTML=v;});
    document.querySelectorAll('[data-i18n-title]').forEach(function(el){var k=el.getAttribute('data-i18n-title');el.title=t(k);});
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){var k=el.getAttribute('data-i18n-ph');el.placeholder=t(k);});
    document.querySelectorAll('[data-i18n-hint]').forEach(function(el){var k=el.getAttribute('data-i18n-hint');el.setAttribute('data-hint',t(k));});
  }
  // ---- "?" hint tooltip: fixed-position popup on body (never clipped by cards) ----
  (function(){var qt=zid('qtip');if(!qt)return;
    function show(el){var h=el.getAttribute('data-hint');if(!h)return;qt.textContent=h;qt.classList.add('on');
      var r=el.getBoundingClientRect(),tw=qt.offsetWidth,th=qt.offsetHeight;
      var x=Math.max(8,Math.min(r.left+r.width/2-tw/2,window.innerWidth-tw-8));
      var y=r.bottom+8;if(y+th>window.innerHeight-8)y=Math.max(8,r.top-th-8);
      qt.style.left=x+'px';qt.style.top=y+'px';}
    function hide(){qt.classList.remove('on');}
    document.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('[data-hint]');if(el)show(el);});
    document.addEventListener('mouseout',function(e){var el=e.target.closest&&e.target.closest('[data-hint]');if(el)hide();});
    document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.qh[data-hint]');if(el){e.stopPropagation();if(qt.classList.contains('on'))hide();else show(el);}});
  })();
  // ---- Nav rail collapse (icons-only) — persisted, no server round-trip ----
  function railSetCollapsed(on){
    var app=document.querySelector('.app'),btn=zid('railToggle');
    if(app)app.classList.toggle('railcoll',on);
    if(btn){btn.textContent=on?'›':'‹';btn.title=on?'Mở rộng menu':'Thu gọn menu';}
    try{localStorage.setItem('zemory.railCollapsed',on?'1':'0');}catch(_){}
  }
  (function(){var btn=zid('railToggle');if(btn)btn.addEventListener('click',function(){railSetCollapsed(!document.querySelector('.app').classList.contains('railcoll'));});
    var saved='0';try{saved=localStorage.getItem('zemory.railCollapsed')||'0';}catch(_){}
    if(saved==='1')railSetCollapsed(true);
  })();
  function zboot(){
    initSeams();
    // Real version + host from the daemon (was hardcoded v1.0.0 / "local · memory only").
    zGet('/ping').then(function(p){
      if(p&&p.version){var vs='v'+p.version;var tv=zid('topVersion');if(tv)tv.textContent=vs;var dv=zid('dlgVer');if(dv)dv.textContent=vs;}
      var rm=zid('railMachine');if(rm)rm.textContent=(p&&p.host?p.host:'local')+' · memory only';
      var rav=zid('railAv');if(rav)rav.textContent=((((p&&p.host)||'?')+'').charAt(0)||'?').toUpperCase();
    }).catch(function(){});
    zGet('/status').then(renderStatus).catch(function(){}).then(function(){
      return zGet('/memory-status').then(function(m){renderMem(m);return refreshChecks();}).catch(function(){});
    });
    zGet('/automation').then(function(a){renderAuto(a);renderSystem();}).catch(function(){});
    loadRecentSessions();
    loadRecent();
  }
  zboot();

  // ── restore: theme → sub-tab của từng màn → màn đang mở (go() nạp đúng sub đó)
  try{var st=localStorage.getItem('zemory.app.theme');if(st)setTheme(st);}catch(e){}
  Object.keys(PERSIST).forEach(function(a){try{var v=localStorage.getItem('zemory.sub.'+PERSIST[a]);if(v)subApply(a,v);}catch(_){}});
  // Màn cũ (Sessions · Insights · System · Settings) đã gộp → map sang màn+sub-tab mới,
  // để ai còn lưu tên cũ trong localStorage không mở lên thấy trắng trang.
  var LEGACY={sessions:['recall','sess'],insights:['gmem','mem'],memory:['gmem','sync'],settings:['home',null]};
  try{
    var sc=localStorage.getItem('zemory.app.screen')||'home',lg=LEGACY[sc];
    if(lg){go(lg[0]);if(lg[1])subSet(SUBATTR[lg[0]],lg[1]);}
    else go(TITLES[sc]?sc:'home');
  }catch(e){go('home');}
})();
