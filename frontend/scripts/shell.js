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
    harness:['Harness','ttl.harness'],
    sync:['nav.sync','ttl.sync']};
  // screen → attribute của sub-tab trong màn đó (cho data-goto="screen:sub")
  var SUBATTR={recall:'data-rc',gmem:'data-gm',harness:'data-ht',projects:'data-pj',sync:'data-sy'};
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
  // ── SUB-TAB (data-ht harness · data-rc recall · data-gm gmem · data-pj · data-sy)
  //    subApply = chỉ lật class (dùng lúc restore) · subSet = lật + nhớ + nạp dữ liệu.
  function subApply(attr,v){
    var b=document.querySelector('.tabs button['+attr+'="'+v+'"]');if(!b)return null;
    var scope=b.closest('.screen, #projDetail');if(!scope)return null;
    scope.querySelectorAll('.tabs button['+attr+']').forEach(function(x){x.classList.toggle('on',x===b);});
    scope.querySelectorAll('.sub['+attr+']').forEach(function(x){x.classList.toggle('on',x.getAttribute(attr)===v);});
    return b;
  }
  function subLoad(attr,v){
    if(attr==='data-rc'&&v==='sess')loadSessions();
    else if(attr==='data-gm'&&v==='mem')renderInsights();
    // Tab Đồng bộ & Sao lưu: ổ đĩa + nơi nguồn quét được nằm. Nạp ĐÚNG LÚC VÀO — hỏi sẵn lúc
    // không ai mở là dò ổ đĩa suông, mà dò ổ phải phóng một tiến trình con.
    else if(attr==='data-gm'&&v==='sync'&&typeof renderMachineInfo==='function')renderMachineInfo();
    // Màn Đồng bộ: nhịp nhật ký CHỈ chạy khi tab máy-tới-máy đang mở — hỏi log mỗi 15s trong lúc
    // không ai nhìn là đốt I/O suông.
    else if(attr==='data-sy'&&window.zSyncScreen)window.zSyncScreen(v==='p2p');
  }
  function subOf(screen){var a=SUBATTR[screen];if(!a)return null;
    var b=document.querySelector('.screen[data-s="'+screen+'"] .tabs button['+a+'].on');return b?b.getAttribute(a):null;}
  // Nhóm data-pt đã gỡ 2026-09-16 cùng khối "Tài liệu dự án" — chi tiết dự án chỉ còn Graph.
  var PERSIST={'data-rc':'recall','data-gm':'gmem','data-ht':'harness','data-pj':'projects','data-sy':'sync'};
  function subSet(attr,v){if(!subApply(attr,v))return;
    var k=PERSIST[attr];if(k){try{localStorage.setItem('zemory.sub.'+k,v);}catch(_){}}
    subLoad(attr,v);
  }
  // Vào 1 màn thì chỉ nạp đúng sub-tab đang mở (không fetch cho sub đang ẩn).
  function ensureScreen(s){
    if(s==='system'){renderSystem();return;}   // màn phẳng, không sub-tab
    // Màn Đồng bộ cũng phẳng. Nạp ĐÚNG LÚC VÀO: số kênh/đường dẫn/nhật ký cũ là số sai, mà
    // đây là màn người ta tới để SỬA. Rời màn thì `zSyncScreen(false)` tắt nhịp log.
    var a=SUBATTR[s],v=subOf(s);if(a&&v)subLoad(a,v);
  }
  function subtabs(attr){
    document.addEventListener('click',function(e){
      var b=e.target.closest('.tabs button['+attr+']');if(!b)return;
      subSet(attr,b.getAttribute(attr));
    });
  }
  subtabs('data-ht');subtabs('data-rc');subtabs('data-gm');subtabs('data-pj');subtabs('data-sy'); // data-pj: Projects → Dự án | Thêm dự án (user 2026-08-29)
  // Cây Nguồn TỰ TƯƠI khi đang mở Global Memory: nhịp nền/watcher kéo xong là daemon xoá cache, nhưng FE
  // trước đây chỉ vẽ lại theo cú bấm ⇒ user thấy ⚠ + số cũ 10 phút sau khi kho đã đổi (2026-08-29, ảnh
  // "linked rồi mà vẫn chấm đỏ"). Đọc bản cache (~40 ms) mỗi 60 s, chỉ khi màn đó đang hiện.
  setInterval(function(){
    if(document.hidden)return;
    if(!document.querySelector('.screen.on[data-s="gmem"]'))return;
    zGet('/memory-status').then(function(m){if(typeof renderMem==='function')renderMem(m);if(typeof gmPollOk==='function')gmPollOk();})
      .catch(function(){if(typeof gmPollFailed==='function')gmPollFailed();}); // two silent polls in a row -> red stale-data light
  },60000);
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
    // Chi tiết dự án chỉ còn Graph — khối "Tài liệu dự án" gỡ 2026-09-16 (user chốt), và cùng lượt
    // đó thanh sub-tab hết lý do tồn tại: một nhóm tab còn đúng một nút là thanh tab giả.
    gApplyLayout();loadProjGraph(curProjRoot);
  }
  // Project-card → detail (works for real cards too; pin/forget + hit-select are
  // handled by the Phase-2 wiring block below, not here, to avoid double firing).
  document.addEventListener('click',function(e){
    var pc=e.target.closest('.proj-card');
    // BẤM THẺ = CHỌN, KHÔNG mở (user chốt 2026-09-16). Mở chi tiết phải bấm nút ↗ riêng.
    // Vì sao: mở ngay khi bấm làm người dùng đọc thành "bị nhảy sang màn khác" — khung chi tiết
    // trông giống màn Harness, mà thao tác thì không hề có ý định rời danh sách.
    if(pc&&!e.target.closest('.acts')){
      document.querySelectorAll('.proj-card.sel').forEach(function(x){x.classList.remove('sel');});
      pc.classList.add('sel');
    }
    var od=e.target.closest('[data-open-detail]');
    if(od){
      var card=od.closest('.proj-card');
      if(card)document.getElementById('projName').textContent=card.querySelector('.nm').textContent;
      showProjDetail(od.getAttribute('data-prof')||'app',od.getAttribute('data-root'));
    }
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
  }
  function closeSettings(){var d=document.getElementById('settingsDlg');if(d)d.classList.remove('on');}
  document.addEventListener('click',function(e){
    if(e.target.id==='topSettings'){openSettings();return;}
    if(e.target.id==='settingsClose'||e.target.id==='settingsDlg')closeSettings();
  });
  // ESC đóng ĐÚNG MỘT LỚP — lớp trên cùng, theo `02_RULES §Dialog`.
  //
  // Bản cũ đóng SẠCH mọi `.dlg-back.on` trong một nhịp. Nó chưa lộ ra khi app gần như không bao giờ
  // chồng dialog, nhưng từ lúc có hộp lớp hai (Dữ liệu & Đồng bộ mở TỪ trong ⚙) thì một phím ESC
  // thổi bay cả hộp con LẪN ⚙ — người dùng chỉ định lùi một bước và mất luôn chỗ đang đứng.
  //
  // "Trên cùng" = z-index lớn nhất; bằng nhau thì lớp KHAI SAU trong DOM nằm trên (đúng quy tắc xếp
  // chồng của CSS). Đo bằng `getComputedStyle` chứ không đoán theo thứ tự mở, vì `.on` được bật ở
  // rất nhiều nơi và không nơi nào ghi lại thứ tự.
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=Array.prototype.slice.call(document.querySelectorAll('.dlg-back.on'));
    if(!open.length)return;
    var zi=function(el){var v=parseInt(getComputedStyle(el).zIndex,10);return isNaN(v)?0:v;};
    var top=open[0];
    for(var i=1;i<open.length;i++) if(zi(open[i])>=zi(top)) top=open[i];
    top.classList.remove('on');
  });
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
      closeAddProjDlg();zToast(t('toast.added').replace('{p}',zProjName(p)),'ok');
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
  // ── Màn Harness: MỘT bộ mẫu đang xem, chọn bằng chip. Trước đây khoá là stdProf chỉ nhận
  // 'app'|'nonapp' nên 3/5 bộ trên đĩa không có đường nào mở ra (user 2026-09-17: "UI vẫn chưa
  // hiện tab của các bộ template"). Nay khoá là TÊN THƯ MỤC thật (05_app…) — đúng cái tên mà
  // docs, CLI và sổ việc đang dùng, nên không đẻ từ vựng thứ hai cho cùng một thứ.
  var stdBundle='05_app',stdFile='AGENTS.md',stdBundles=null;
  function stdCur(){if(!stdBundles)return null;for(var i=0;i<stdBundles.length;i++)if(stdBundles[i].dir===stdBundle)return stdBundles[i];return null;}
  function stdFiles(){var c=stdCur();return (c&&c.files)||[];}
  // NGUỒN của hai bảng dưới = /standard-spec, đọc thẳng từ 03_STRUCTURE.md.
  // Trước 2026-07-27 chúng là hai mảng hardcode TAY trong file này, và đã lệch nặng:
  // cây 35/90 hàng · routing 26/66 dòng, chữ lại viết tắt khác nguồn. Màn này là màn TRA
  // CỨU — hiện thiếu 60% mà không báo gì là kiểu hỏng tệ nhất.
  // FAIL-OPEN: fetch/parse hỏng ⇒ rơi về STRUCT/ROUTE cũ để UI không bao giờ trắng.
  var specCache={};
  // Bộ dự phòng chỉ có HAI bản (app · nonapp) vì nó là bản chép tay đời cũ. Bộ nào không có
  // bản dự phòng thì KHÔNG mượn bản của bộ khác — trưng cây của 05_app dưới nhãn một bộ khác
  // là nói dối về thứ người đọc đang xem. Không có thì nói không có.
  function stdFallbackKey(){var c=stdCur();if(!c||c.kind!=='harness')return null;return c.profile==='non-app'?'nonapp':(c.profile==='app'?'app':null);}
  function specRows(){
    var sp=specCache[stdBundle];
    if(!sp||!sp.tree||!sp.tree.length){
      var fk=stdFallbackKey();
      if(!fk)return {tree:[],routing:[],fallback:false};
      return {tree:(STRUCT[fk]||[]).map(function(s){return {depth:s[0],name:s[1],marker:s[2],note:s[3]};}),
              routing:(ROUTE[fk]||[]).map(function(r){return {concern:r[0],where:r[1]};}),fallback:true};
    }
    return sp;
  }
  function loadSpec(){
    var c=stdCur();
    if(!c||!c.hasStructure)return Promise.resolve();
    if(specCache[stdBundle])return Promise.resolve();
    var key=stdBundle;
    return zGet('/standard-spec?bundle='+encodeURIComponent(key)).then(function(d){if(d&&d.tree&&d.tree.length)specCache[key]=d;}).catch(function(){});
  }
  function structRender(){
    var st=document.getElementById('structTree');if(!st)return;
    var c=stdCur(),sp=specRows();
    var tag=document.getElementById('structProf');
    if(tag)tag.textContent=c?(c.dir+(sp.fallback?' · '+t('harness.specFallback'):'')):'';
    if(!sp.tree.length){
      // HAI trạng thái khác nhau, và gộp chúng là NÓI SAI với người đọc:
      //  · bộ phân phối KHÔNG có agent/03_STRUCTURE.md;
      //  · bộ ADAPT CÓ file đó, nhưng §3 của nó là bảng ánh xạ cố ý để TRỐNG — điền lúc nhận
      //    repo. Bảo nó "không có 03_STRUCTURE.md" là một câu sai kiểm được ngay trên đĩa.
      var why=t(c&&c.hasStructure?'harness.emptyStruct':'harness.noStruct');
      st.innerHTML='<div class="muted">'+why+'</div>';
      // Panel Routing cũng phải NÓI, đừng để trống: một khung rỗng không chữ đọc ra là "đang tải"
      // hoặc "hỏng" (§F3). Nó rỗng vì CÙNG một lý do, nên dùng lại đúng câu đó.
      var rt0=document.getElementById('routeTable');if(rt0)rt0.innerHTML='<div class="muted">'+why+'</div>';
      return;
    }
    st.innerHTML=sp.tree.map(function(n){
      var s=[n.depth,n.name,n.marker,n.note];
      var dir=/[\/·|]/.test(s[1]);
      var tg=s[2]==='req'?'<span class="stag req">★</span>':s[2]==='opt'?'<span class="stag">opt</span>':s[2]==='gi'?'<span class="stag gi">gitignore</span>':'';
      return '<div class="strow" style="padding-left:'+(s[0]*15+2)+'px"><span class="sic">'+(dir?'📁':'📄')+'</span><span class="sname">'+stdEsc(s[1])+'</span>'+tg+'<span class="snote">'+stdEsc(s[3])+'</span></div>';
    }).join('');
    var rt=document.getElementById('routeTable');
    if(rt)rt.innerHTML=sp.routing.map(function(r){
      return '<div class="rrow"><span class="rneed">'+stdEsc(r.concern)+'</span><span class="rslot">'+stdEsc(r.where)+'</span></div>';
    }).join('');
  }
  // Chip chỉ mang TÊN BỘ. Dán thêm nhãn hạng lên từng chip là lặp một thông tin năm lần và làm
  // rối hàng chọn (user 2026-09-18: *"chú thích mấy cái gói phát này kia làm gì… làm rối thiết
  // kế thêm"*). Hạng nói ĐÚNG MỘT LẦN, ở dòng mô tả của bộ đang chọn.
  function stdChips(){
    var box=document.getElementById('stdBundles');if(!box)return;
    if(!stdBundles||!stdBundles.length){box.innerHTML='<span class="muted">'+t('harness.noBundle')+'</span>';return;}
    box.innerHTML=stdBundles.map(function(b){
      return '<button class="fchip'+(b.dir===stdBundle?' on':'')+'" data-bundle="'+stdEsc(b.dir)+'">'+stdEsc(b.dir)+'</button>';
    }).join('');
    var note=document.getElementById('stdBundleNote'),c=stdCur();
    // Gói phát có HAI kiểu, và gộp chúng làm một khiến người đọc tưởng bộ ít file bị hụt
    // (user hỏi đúng chỗ này 2026-09-18: *"tại sao bộ harness của 02 không có đủ?"*):
    //  · gói CHỞ SẴN harness (01) — không gọi được `zemory` nên phải chép tay, và bản chép bị CẮT;
    //  · gói RÓT QUA `init` (02) — chỉ cần 2 file hướng dẫn, rồi nhận bản ĐẦY ĐỦ từ 03_nonapp.
    // Phân biệt bằng chính cây file của bộ đó, không gõ tay tên bộ nào.
    var kitCarries=!!(c&&c.kind==='kit'&&(c.files||[]).some(function(f){return /(^|\/)agent\/0\d_/.test(f)}));
    if(note)note.textContent=c?(c.kind==='kit'?t(kitCarries?'harness.noteKitCarry':'harness.noteKitInit')
      :c.reference?t('harness.noteRef')
      :t('harness.noteInit').replace('{cmd}','zemory init'+(c.profile==='non-app'?' --non-app':''))):'';
  }
  function stdTreeRender(){
    var box=document.getElementById('stdTree');if(!box)return;
    var files=stdFiles(),c=stdCur();
    // Tiêu đề card theo HẠNG. Gọi 2 file của một gói phát là "Bộ chuẩn" thì người đọc tưởng bộ
    // chuẩn bị thiếu — trong khi 02_cowork_memory cố ý KHÔNG chở harness: nó bảo agent cài zemory
    // rồi `init` rót ra từ 03_nonapp/05_app (user hỏi đúng chỗ này 2026-09-18).
    var hd=document.getElementById('stdSetLabel');
    if(hd)hd.textContent=t(c&&c.kind==='kit'?'harness.kitSet':'harness.stdSet');
    if(!files.length){box.innerHTML='<div class="muted">'+t('harness.noFile')+'</div>';return;}
    // Gom theo HAI đoạn đầu của đường, không theo thư mục cha trực tiếp. Theo cha trực tiếp thì
    // .claude/skills/<x>/SKILL.md đẻ MỘT tiêu đề nhóm cho MỖI skill (đo: 10 tiêu đề, mỗi cái đúng
    // một hàng) — cây dài gấp đôi mà không thêm thông tin nào. Gom hai đoạn ⇒ một nhóm
    // ".claude/skills/" với các lá "adopt/SKILL.md", đọc ra ngay skill nào.
    var groups=[],seen={};
    files.forEach(function(f){
      var parts=f.split('/');
      var dir=parts.length<2?'':parts.slice(0,Math.min(2,parts.length-1)).join('/');
      var leaf=dir?f.slice(dir.length+1):f;
      if(!(dir in seen)){seen[dir]=groups.length;groups.push({dir:dir,files:[]});}
      groups[seen[dir]].files.push({path:f,leaf:leaf});
    });
    groups.sort(function(a,b){return a.dir===''?-1:b.dir===''?1:(a.dir<b.dir?-1:1);});
    box.innerHTML=groups.map(function(g){
      var head=g.dir?'<div class="section-t">'+stdEsc(g.dir)+'/</div>':'';
      return head+g.files.map(function(f){
        return '<div class="ti'+(g.dir?' ind':'')+(f.path===stdFile?' on':'')+'" data-f="'+stdEsc(f.path)+'">📄 '+stdEsc(f.leaf)+'</div>';
      }).join('');
    }).join('');
  }
  function loadBundles(){
    if(stdBundles)return Promise.resolve();
    return zGet('/standard-bundles').then(function(d){
      var list=(d&&d.bundles)||[];
      if(!list.length)return;
      stdBundles=list;
      // Bộ mở sẵn = bộ APP nếu còn, không thì bộ đầu. KHÔNG ghim cứng '05_app': đổi tên thư
      // mục trên đĩa là màn này trắng, mà không lỗi nào nổ.
      var pick=null;
      list.forEach(function(b){if(!pick&&b.profile==='app')pick=b.dir;});
      stdBundle=pick||list[0].dir;
      if(stdFiles().indexOf(stdFile)<0)stdFile=stdFiles()[0]||stdFile;
    }).catch(function(){});
  }
  // renderHarness: MỌI bảng đọc từ nguồn thật — danh sách bộ qua /standard-bundles, docs qua
  // /standard-doc, cây + routing qua /standard-spec (parse từ 03_STRUCTURE.md).
  function renderHarness(){
    loadBundles().then(function(){
      stdChips();stdTreeRender();stdRenderReal();structRender();
      return loadSpec();
    }).then(structRender);
  }
  document.addEventListener('click',function(e){
    var chip=e.target.closest&&e.target.closest('#stdBundles [data-bundle]');
    if(chip){
      var d=chip.getAttribute('data-bundle');
      if(d!==stdBundle){
        stdBundle=d;
        // Giữ nguyên file đang xem nếu bộ mới cũng có nó — so cùng một file giữa hai bộ là
        // lối dùng chính của màn này. Không có thì rơi về file đầu.
        if(stdFiles().indexOf(stdFile)<0)stdFile=stdFiles()[0]||stdFile;
        stdChips();stdTreeRender();stdRenderReal();structRender();loadSpec().then(structRender);
      }
      return;
    }
    var ti=e.target.closest('#stdTree .ti');if(ti&&ti.dataset.f){stdFile=ti.dataset.f;stdTreeRender();stdRenderReal();}
  });
  // fake graph

  // ── DỜI TỪ graph.js 2026-08-07: màn Home, không phải graph
  function loadRecentSessions(){
    var box=zid('homeSessions');if(!box)return;
    // 20 = the ceiling `/recent-sessions` enforces, and the query returns at most one session per
    // project (17 linked here), so this asks for everything there is. The card scrolls, so the rows
    // on screen follow the window height instead of a fixed count — same fix as Recent Projects.
    zGet('/recent-sessions?limit=20').then(function(list){
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

/* ── KHAI "ĐANG PHÓNG TO HAY KHÔNG" CHO CỬA SỔ ──────────────────────────────────
 *
 * Cửa sổ native tự đo được vị trí và kích thước của nó, nhưng KHÔNG biết màn hình rộng bao nhiêu
 * nên không tự suy ra được là đang phóng to hay chỉ đang to. Trang thì biết (`screen.availWidth`).
 * Nên phân vai: trang khai đúng MỘT boolean, mọi toạ độ vẫn do cửa sổ tự đo — tránh hẳn cái bẫy
 * toạ độ nội dung ≠ toạ độ cửa sổ (lấy nhầm là mỗi lần mở cửa sổ lại tụt xuống một thanh tiêu đề).
 *
 * Chỉ chạy dưới cửa sổ native; mở bằng trình duyệt thì không có kênh này và cũng không cần.
 */
(function(){
  var ch=window.chrome&&window.chrome.webview; if(!ch||!ch.postMessage)return;
  var last=null,timer=null;
  function tell(){
    var max=(outerWidth>=screen.availWidth-24)&&(outerHeight>=screen.availHeight-24);
    if(max===last)return; last=max;
    // Gửi kèm VÙNG LÀM VIỆC của màn hình: cửa sổ cần nó để tự nhận ra "cỡ này là cỡ phóng to"
    // mà không phải đoán theo thứ tự sự kiện — thứ tự đó đo ra là không tin được.
    try{ch.postMessage(JSON.stringify({t:'winmax',v:max,aw:screen.availWidth,ah:screen.availHeight}));}catch(_){}
  }
  addEventListener('resize',function(){clearTimeout(timer);timer=setTimeout(tell,150);});
  tell();
})();
