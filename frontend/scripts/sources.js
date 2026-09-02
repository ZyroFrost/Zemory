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
  /** Nền của một nguồn web: `chatgpt-web`→`chatgpt`, `claude-cowork`→`claude`. */
  function webPlat(src){return String(src||'').replace(/-(web|cowork)$/,'');}

  // Hàng đã vẽ, tra theo khoá lane — hộp chi tiết cần dữ liệu của ĐÚNG hàng vừa bấm mà
  // không phải gọi lại máy chủ (một cú bấm xem không đáng một vòng mạng).
  var NODE_BY_KEY={};

  /** Một dòng "nhãn: giá trị" trong hộp chi tiết. Bỏ qua khi không có giá trị — dòng trống
   *  chỉ làm hộp dài ra mà không nói gì. */
  function detRow(k,v){return v==null||v===''?'':'<div style="display:flex;gap:8px;padding:3px 0"><span class="muted" style="min-width:120px">'+stdEsc(k)+'</span><span>'+stdEsc(String(v))+'</span></div>';}

  /**
   * CHI TIẾT LIÊN KẾT của một nguồn — mở khi bấm badge.
   *
   * Đây là chỗ chứa thứ trước kia phơi thẳng ra hàng (và làm vỡ dòng): trạng thái, lý do,
   * lần kiểm cuối, đường kho. Hành động (nối lại / mượn phiên) nằm Ở ĐÂY chứ không phải trên
   * hàng — bấm badge là để XEM, còn LÀM là một quyết định riêng, có bối cảnh trước mắt.
   */
  function openSrcDetail(key){
    var n=NODE_BY_KEY[key];if(!n||!n.conn)return;
    var c=n.conn,web=c.kind==='web';
    var stateTxt=c.linked===false?t('scope.detNotLinked'):(c.linked===null?t('scope.detUnchecked'):t('scope.detLinked'));
    var pullTxt=c.state==='ok'?t('scope.detPullOk'):(c.state==='fail'?t('scope.detPullFail').replace('{s}',c.status||''):t('scope.webNever'));
    var body='<div style="font-size:12.5px;line-height:1.6">'
      +detRow(t('scope.detSource'),n.label)
      +detRow(t('scope.detKind'),t(web?'scope.detKindWeb':'scope.detKindLocal'))
      +(web&&c.who?detRow(t('scope.detWho'),c.who):'')
      +(web&&c.account?detRow(t('scope.detAccount'),c.account):'')
      +detRow(t('scope.detState'),stateTxt)
      +(web?detRow(t('scope.detPull'),pullTxt):'')
      +(c.at?detRow(t('scope.detLastPull'),String(c.at).slice(0,16).replace('T',' ')):'')
      +(c.staleDays!=null?detRow(t('scope.detStale'),c.staleDays):'')
      +(c.detail?detRow(t('scope.detWhere'),c.detail):'')
      +detRow(t('scope.detMessages'),zN(n.messages||0))
      +'</div>';
    // Chỉ mời hành động khi CÓ việc để làm: nguồn đang nối tốt thì hộp này thuần thông tin.
    var act=web&&c.linked===false;
    zDialog({icon:c.linked===false?'⚠':'🔗',title:t('scope.detTitle'),bodyHtml:body,
      okLabel:act?t(c.canBorrow?'conn.borrow':'conn.link'):t('scope.detClose'),
      onOk:act?function(){
        // Hộp giữ mở trong lúc chờ ⇒ nút OK bấm được lần hai = một `/connect` thứ hai chạy
        // chồng lượt đầu. Khoá nút cho tới khi có kết quả.
        var okb=zid('zDlgOk');if(okb)okb.disabled=true;
        zDlgMsg(t('conn.linking'));
        // Đường này TRƯỚC ĐÂY vẽ lại đúng MỘT lần rồi thôi ⇒ người dùng đăng nhập xong (daemon đã
        // nhận, kho đã đổi) mà cây vẫn ⚠ — "app đơ" (user 2026-08-29). Nay: đăng ký chờ y như
        // đường nút "Đăng nhập" (`connPoll`): vẽ lại mỗi 5 s tới 15 phút, nối xong thì toast.
        var plat=c.platform||'';
        connPending[plat]=true;
        zPost('/connect?platform='+encodeURIComponent(plat)+'&account='+encodeURIComponent(c.account||'main'))
          .then(function(r){
            zDlgClose();CONN_ROWS=(r&&r.rows)||CONN_ROWS;
            zGet('/memory-status?fresh=1').then(renderMem);
            var row=(r&&r.rows||[]).filter(function(x){return x.platform===plat&&x.connected&&(!c.who||x.detail&&x.detail.indexOf(c.who)>=0);})[0];
            if(row){delete connPending[plat];zToast(t('conn.done').replace('{p}',plat));}
            else connPoll(180);
          })
          .catch(function(){zDlgMsg(t('scope.detLinkFailed'));if(okb)okb.disabled=false;});
        return true; // giữ hộp mở: đăng nhập là việc của NGƯỜI, đóng ngay là cắt ngang họ
      }:null});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('[data-srcdet]'):null;if(!b)return;
    e.preventDefault();e.stopPropagation(); // đừng để cú bấm lọt xuống ô tick của hàng
    openSrcDetail(b.getAttribute('data-srcdet'));
  });
  /**
   * MỘT badge duy nhất cho một hàng nguồn — user chốt 2026-08-28: *"nó chỉ hiện badge thôi
   * ko dc full chữ, chữ là pop hiện text ra phụ… khi bấm vào nó phải ra chi tiết liên kết"*.
   *
   * Ba luật rút từ đúng ba lỗi bản trước:
   *  · **MỘT ký hiệu, không phải câu.** Bản trước phơi cả `⚠ mất phiên — bấm để nối lại` +
   *    `chưa kéo lần nào` + `chưa có dữ liệu` lên một hàng ⇒ nhãn "tài khoản 2" bị đẩy vỡ
   *    thành hai dòng. Chữ chuyển hết vào `title` (tooltip).
   *  · **KHÔNG có ✓ "cho vui".** ✓ đứng cạnh "chưa kéo lần nào" đọc thành *"ổn cả"* trong
   *    khi thực ra chưa có gì về — user bắt đúng chỗ này. Nay ✓ CHỈ hiện khi đã nối VÀ đã
   *    kéo được ít nhất một lần; nối-mà-chưa-kéo là dấu `•` trung tính.
   *  · **Bấm là XEM, không phải LÀM.** Badge mở hộp chi tiết; hành động nằm trong hộp.
   */
  function srcBadge(n){
    var c=n.conn;if(!c)return '';
    // Hàng "(không rõ)" là RỔ chứa phiên cũ chưa đóng dấu, KHÔNG phải một tài khoản nối được
    // ⇒ không gắn trạng thái liên kết cho nó (gắn vào là bịa cho nó một danh tính không có).
    if((n.lane||{}).account==='')return '';
    // HAI HỆ DẤU (user chốt 2026-08-29), không dùng chung thang:
    //  · WEB — nhị phân: ✓ xanh còn liên kết · ⚠ đỏ mất liên kết (bấm nối lại). KHÔNG có "cam".
    //  · LOCAL máy này: ✓ kho còn trên đĩa · ⚠ kho từng có mà mất.
    //  · LOCAL máy khác (`remote`): không soi đĩa được, chấm theo "còn đổ dữ liệu về không" —
    //    ✓ xanh có tin ≤30 ngày · ✓ XÁM máy đã ngưng/đã dời (kho lưu trữ, không cần làm gì).
    //  · Hàng CHA (nguồn · máy) gộp từ con: `bad/kids` con đang ⚠ ⇒ cha ⚠.
    var mark,cls,tip,RETIRED=30;
    if(c.kids&&c.bad){ mark='⚠'; cls='scope-bad'; tip=t('scope.tipAggBad').replace('{n}',c.bad).replace('{m}',c.kids); }
    else if(c.linked===false){ mark='⚠'; cls='scope-bad'; tip=t(c.kind==='web'?'scope.tipNeedLogin':'scope.tipStoreGone'); }
    else if(c.linked===null){ mark='•'; cls='scope-dim'; tip=t('scope.tipNeverChecked'); }
    else if(c.remote){
      if(c.staleDays!=null&&c.staleDays>=RETIRED){ mark='✓'; cls='scope-dim'; tip=t('scope.tipRemoteRetired').replace('{d}',c.staleDays); }
      else { mark='✓'; cls='conn-ok'; tip=t('scope.tipRemoteFresh').replace('{d}',c.staleDays==null?'?':c.staleDays); }
    }
    else if(c.kind==='local'){ mark='✓'; cls='conn-ok'; tip=t(c.kids?'scope.tipAggOk':'scope.tipStoreOk'); }
    else if(c.state==='fail'){ mark='⚠'; cls='scope-bad'; tip=t('scope.tipPullFailed').replace('{s}',c.status||''); }
    else { mark='✓'; cls='conn-ok'; tip=t(c.kids?'scope.tipAggOk':'scope.tipOk'); }
    return '<button class="zbadge '+cls+'" data-srcdet="'+stdEsc(n.key)+'" title="'+stdEsc(tip)+'">'+mark+'</button> ';
  }
  // Nhánh Web của cây lần vẽ gần nhất — hộp "Thêm nguồn" đọc từ đây để khỏi gọi lại máy chủ.
  var WEB_TREE=null;

  /**
   * HỘP "THÊM NGUỒN" — nút ＋ dưới panel Sources (user chốt 2026-08-28: đặt dưới panel,
   * không phải Settings — nguồn sống ở đây thì thêm nguồn cũng ở đây).
   *
   * Mỗi nền web một hàng: đã nối ⇒ email + "＋ tài khoản nữa" (mở profile MỚI, không đụng
   * phiên đang có) · chưa nối ⇒ "Đăng nhập". Nút dùng đúng hai data-attr sẵn có
   * (`data-addacct` / `data-conn`) nên toàn bộ luồng gọi + chờ đăng nhập (`connPoll`) chạy
   * y như cũ — hộp chỉ là chỗ ĐẶT nút, không phải một luồng mới.
   *
   * Nguồn LOCAL cố ý KHÔNG có trong hộp: chúng được Quét sâu tự tìm — bày ô "thêm Codex"
   * ở đây là hứa một việc tay mà máy đã tự làm.
   */
  // Hàng `/connections` lần đọc gần nhất — hộp "Thêm nguồn" đọc cờ `watching` (daemon đang canh
  // cửa sổ đăng nhập) từ đây, và vẽ lại khi hàng đổi (đăng nhập xong ⇒ email + "＋ tài khoản nữa").
  var CONN_ROWS=[];
  function connWatching(p){return CONN_ROWS.some(function(x){return x.kind==='web'&&x.platform===p&&(x.account||'main')==='main'&&x.watching;});}
  function refreshAddSource(){var d=zid('zDlg');if(d&&d.classList.contains('on')&&zid('zDlgTitle')&&zid('zDlgTitle').textContent===t('src.addTitle'))openAddSource();}
  function openAddSource(){
    var NAME={chatgpt:'ChatGPT',claude:'Claude.ai'};
    var plats={};
    ((WEB_TREE&&WEB_TREE.children)||[]).forEach(function(n){
      var c=n.conn,p=webPlat((n.lane||{}).source||'');if(!p)return;
      var cur=plats[p]||{linked:null,who:''};
      // Một nền có thể đẻ nhiều nguồn (claude → claude-web + claude-cowork): giữ bản "tốt nhất".
      if(c){if(c.linked===true)cur.linked=true;else if(c.linked===false&&cur.linked!==true)cur.linked=false;if(c.who)cur.who=c.who;}
      plats[p]=cur;
    });
    var rows=Object.keys(plats).map(function(p){
      var v=plats[p];
      var st=v.who?'<span class="muted" style="font-size:11px">'+stdEsc(v.who)+'</span>'
                  :'<span class="muted" style="font-size:11px">'+stdEsc(t('src.addNotLinked'))+'</span>';
      var btn=v.linked===true
        ? '<button class="btn sm" data-addacct="'+stdEsc(p)+'">'+stdEsc(t('src.addMore'))+'</button>'
        : connWatching(p)
          ? '<button class="btn sm primary" disabled>'+stdEsc(t('conn.waiting'))+'</button>'
          : '<button class="btn sm primary" data-conn="'+stdEsc(p)+'" data-acct="main">'+stdEsc(t('src.addLogin'))+'</button>';
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)"><span style="min-width:80px;font-weight:600">'+stdEsc(NAME[p]||p)+'</span>'+st+'<span style="flex:1"></span>'+btn+'</div>';
    }).join('');
    var body='<div style="font-size:12.5px">'+rows
      +'<div style="display:flex;align-items:center;gap:10px;padding:7px 0"><span style="min-width:80px;font-weight:600">Gemini</span><span class="muted" style="font-size:11px">'+stdEsc(t('src.addSoon'))+'</span></div>'
      +'<div class="muted" style="font-size:11px;margin-top:8px">'+stdEsc(t('src.addLocalHint'))+'</div></div>';
    zDialog({icon:'＋',title:t('src.addTitle'),bodyHtml:body,okLabel:t('scope.detClose')});
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='mAddSrc')openAddSource();});

  // Popover chú giải dấu (nút ? cạnh tiêu đề panel). Bấm ? mở/đóng; bấm ra ngoài hoặc ESC đóng.
  function legendSet(on){var p=zid('srcLegend'),b=zid('srcLegendBtn');if(!p||!b)return;p.hidden=!on;b.setAttribute('aria-expanded',on?'true':'false');}
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('#srcLegendBtn'):null;
    if(b){legendSet(zid('srcLegend').hidden);return;}
    var inside=e.target.closest?e.target.closest('#srcLegend'):null;
    if(!inside)legendSet(false);
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var p=zid('srcLegend');if(p&&!p.hidden){legendSet(false);e.stopPropagation();}}},true);

  // Nhóm đang thu gọn: {laneKey:1}. Nhớ qua phiên; sai khuôn thì coi như không thu gì.
  var FOLD={};try{FOLD=JSON.parse(localStorage.getItem('zemory.scopeFold')||'{}')||{};}catch(x){FOLD={};}
  function foldSet(key,on){if(on)FOLD[key]=1;else delete FOLD[key];try{localStorage.setItem('zemory.scopeFold',JSON.stringify(FOLD));}catch(x){}}
  document.addEventListener('click',function(e){
    var f=e.target.closest?e.target.closest('[data-fold]'):null;if(!f)return;
    if(e.target.closest('.zscope')||e.target.closest('.zbadge'))return; // tick/badge có việc riêng
    var key=f.getAttribute('data-fold'),kids=document.querySelector('.scope-kids[data-kids="'+key.replace(/"/g,'\\"')+'"]');if(!kids)return;
    var fold=!kids.hidden;kids.hidden=fold;foldSet(key,fold);
    var btn=document.querySelector('.zcaret[data-fold="'+key.replace(/"/g,'\\"')+'"]');
    if(btn){btn.textContent=fold?'▸':'▾';btn.setAttribute('aria-expanded',fold?'false':'true');btn.title=t(fold?'scope.expand':'scope.collapse');}
  });
  function renderScope(nodes){
    if(!nodes||!nodes.length)return '<div class="muted">none</div>';
    WEB_TREE=(nodes||[]).find(function(n){return (n.lane||{}).origin==='web';})||null;
    var dl=scopeDiff(nodes);
    function walk(n,dep){
      var checked=!n.effectiveExcluded,dis=n.effectiveExcluded&&!n.excluded;
      var dv=dl[scopeKey(n)],badge=dv?'<span class="scope-d" title="'+stdEsc(t('scope.justScanned'))+'">+'+zN(dv)+'</span>':'';
      // Nguồn zemory HỖ TRỢ nhưng chưa nạp gì: vẫn hiện, nói rõ là chưa có dữ liệu và
      // chỉ luôn lệnh nạp. Ẩn đi thì thành vòng luẩn quẩn — muốn có dữ liệu phải tick,
      // muốn tick phải có dữ liệu (user 2026-07-27).
      // KHÔNG còn badge chữ "chưa có dữ liệu" (user 2026-08-28: *"nhìn 0 là biết rồi cần
      // chó gì hiện chữ"*). Con số 0 đã nói điều đó; lời hướng dẫn nạp chuyển vào tooltip
      // của chính con số — chữ là lớp phụ, hiện khi rê chuột, không chiếm chỗ trên hàng.
      var cntTip=n.empty?' title="'+stdEsc(t('scope.noData')+' — '+t('scope.howTo'))+'"':'';
      // SỨC KHOẺ nguồn web đã tick. Trước đây hàng này chỉ có ô tick + số tin, nên một nguồn
      // ngừng về 24 ngày trông y hệt nguồn đang chạy — user bắt đúng chỗ này ("luôn xanh mà
      // ko báo gì"). Luật: đã tick mà không kéo được thì PHẢI báo, và bấm được để nối lại.
      if(n.conn)badge=srcBadge(n)+badge;
      NODE_BY_KEY[n.key]=n; // để hộp chi tiết tra lại hàng vừa bấm mà khỏi hỏi máy chủ
      // TÊN TÀI KHOẢN đã nối ghi THẲNG sau nhãn (user chốt 2026-08-28: *"cái nào liên kết tk
      // web thì ghi luôn tk đó"*) — định danh thì hiện, chỉ TRẠNG THÁI mới thu vào badge/tooltip.
      // Hàng tài khoản đã LẤY tên làm nhãn ⇒ không lặp lại tên sau dấu chấm nữa.
      var who=(n.conn&&n.conn.who&&n.conn.who!==n.label)?' <span class="muted" style="font-size:10.5px">· '+stdEsc(n.conn.who)+'</span>':'';
      // THU GỌN THEO NHÓM (user 2026-08-29): hàng có con mang mũi tên ▾/▸; bấm mũi tên hoặc
      // tên hàng để thu/bung; ô tick vẫn là ô tick. Trạng thái nhớ qua phiên (localStorage).
      var hasKids=!!(n.children&&n.children.length),folded=hasKids&&FOLD[n.key]===1;
      var caret=hasKids
        ?'<button type="button" class="zcaret" data-fold="'+stdEsc(n.key)+'" aria-expanded="'+(folded?'false':'true')+'" title="'+stdEsc(t(folded?'scope.expand':'scope.collapse'))+'">'+(folded?'▸':'▾')+'</button>'
        :'<span class="zcaret zcaret-empty"></span>';
      var nameAttr=hasKids?' data-fold="'+stdEsc(n.key)+'" style="cursor:pointer"':'';
      var h='<div class="set-row" style="padding:5px 0 5px '+(dep*14+2)+'px;border:0"><span class="nm" style="font-size:12px">'+caret+'<input type="checkbox" class="zscope"'+(checked?' checked':'')+(dis?' disabled':'')+' data-lane="'+stdEsc(JSON.stringify(n.lane||{}))+'" style="margin-right:7px;vertical-align:-2px"> <span'+nameAttr+'>'+stdEsc(n.label)+'</span>'+who+'</span><span class="scope-n">'+badge+'<span class="muted"'+cntTip+'>'+zN(n.messages)+'</span></span></div>';
      if(hasKids){h+='<div class="scope-kids"'+(folded?' hidden':'')+' data-kids="'+stdEsc(n.key)+'">';(n.children||[]).forEach(function(c){h+=walk(c,dep+1);});h+='</div>';}
      return h;
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
      // Dấu "chuẩn cũ" trên ĐÚNG thẻ — cùng nguồn với chấm cam ở rail (`/harness-updates`, lưu ở Z.updStale).
      var us=(Z.updStale||[]).find(function(x){return String(x.root||'').toLowerCase()===String(root).toLowerCase();});
      var old=us?'<span class="ptype is-old" title="'+stdEsc(t('proj.stdOldTip').replace('{m}',us.missing||0).replace('{g}',us.guardStale||0))+'">'+stdEsc(t('proj.stdOld'))+'</span>':'';
      return '<div class="proj-card'+(pinned?' pinned':'')+(us?' is-old':'')+'" draggable="'+(so==='manual'?'true':'false')+'" data-prof="'+(p.profile||'')+'" data-open-proj="'+stdEsc(p.path)+'">'
        +'<div class="ph"><div class="pi">'+stdEsc((((zProjName(p.path)||'?')+'').charAt(0)||'?').toUpperCase())+'</div>'
        +'<div style="flex:1;min-width:0"><div class="nm">'+stdEsc(zProjName(p.path))+'</div><div class="muted" style="font-size:11px">'+zN(p.sessions)+' sessions</div></div>'
        +old+(p.profile?'<span class="ptype '+(pbi?'is-non':'is-app')+'">'+(pbi?'NON-APP':'APP')+'</span>':'')
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
    // MAT KET NOI: noi thang viec phai lam. Vong tu keo da thoi dung khe nay (may khong duoc tu
    // bat khung dang nhap — user chot 2026-09-02), nen chi con duong NGUOI bam.
    if(r.detailCode==='needLogin')return t('conn.needLogin').replace('{ago}',a.at?relTime(a.at).big:'');
    if(r.detailCode==='lastChecked'){
      // Dùng chính relTime() của trang chủ ⇒ "7 giờ trước"/"7 h ago" đổi theo ngôn ngữ, và
      // KHÔNG đẻ thêm một cách tính thời gian tương đối thứ hai.
      var when=a.at?relTime(a.at).big:'';
      return t('conn.lastChecked').replace('{ago}',when)+(a.who?' · '+a.who:'');
    }
    return r.detail||'';
  }
  /**
   * Khối "Liên kết" ĐÃ GỠ 2026-08-28 — trạng thái nay là badge trên CHÍNH hàng nguồn
   * (`srcBadge`), bấm ra hộp chi tiết. Hàm này KHÔNG bị xoá vì bốn luồng vẫn gọi nó sau khi
   * trạng thái đổi (nối lại · mượn phiên · thêm tài khoản · quét xong); biến nó thành hàm câm
   * là để badge đứng im sau mỗi thao tác — đúng kiểu hỏng lặng mà `02_RULES` cấm.
   *
   * Nay nó LÀM TƯƠI CÂY: một lượt `/memory-status?fresh=1` dựng lại scopeTree kèm trạng thái
   * liên kết mới. Vẫn nhận `d` để `connPoll` dùng `d.rows` phán "ai còn đang chờ đăng nhập".
   */
  function renderConn(){ return zGet('/memory-status?fresh=1').then(renderMem).then(refreshAddSource).catch(function(){}); }
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
        // Đăng nhập xong: DAEMON đã nhận và đang kéo (nó canh khe này sau `need-login`) — UI chỉ
        // báo + vẽ lại. Bản trước UI tự bắn `/connect` để kéo: chạy chồng lượt của daemon, và
        // chỉ chạy khi cửa sổ app còn mở.
        fresh.forEach(function(x){
          delete connPending[x.platform];
          zToast(t('conn.done').replace('{p}',x.platform));
        });
        CONN_ROWS=(d&&d.rows)||CONN_ROWS;refreshAddSource();
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
    connPending[p]=true; // để lúc daemon báo đã nối, UI có toast — bản trước quên đặt ở đường này
    zPost('/connect?platform='+encodeURIComponent(p)+'&account='+encodeURIComponent(acct)).then(function(r){
      CONN_ROWS=(r&&r.rows)||CONN_ROWS;
      renderConn(r);
      if(r&&r.ok===false)zToast('✗ '+(r.error||''));
      zGet('/memory-status?fresh=1').then(renderMem);
      var row=(r&&r.rows||[]).filter(function(x){return x.platform===p&&(x.account||'main')===acct;})[0];
      if(row&&row.connected)delete connPending[p];
      if(row&&!row.connected){
        // Vẫn chưa vào được ⇒ cửa sổ đăng nhập đang mở, bắt đầu chờ.
        var b=document.querySelector('[data-conn="'+p+'"]');
        if(b){b.textContent=t('conn.waiting');b.disabled=true;}
        // Bản trước gọi `connPoll(p,36)`: tham số đầu là CHUỖI ⇒ `left-1` = NaN ⇒ `NaN<=0`
        // sai mãi ⇒ hỏi `/connections` 5 s/lượt VĨNH VIỄN, mỗi lượt là một probe CDP.
        connPoll(180); // 15 phút — khớp thời gian daemon canh khe (LOGIN_WATCH_MS)
      }
    }).catch(function(){loadConn();});
  });
  function setTog(name,on){document.querySelectorAll('[data-auto="'+name+'"]').forEach(function(t){t.classList.toggle('on',!!on);});}
  // `realtime` hiện theo SỰ THẬT (`realtimeWired` = hook có trong settings của host) chứ không
  // theo cờ config: hai thứ lệch được (user sửa tay settings.json, hoặc máy chưa cài Claude
  // Code), và một công tắc sáng đèn trong khi không có gì chạy là lời hứa suông.
  // Tóm tắt lịch tự sync cạnh công tắc ("mỗi 30 phút" · "lúc 12:00 · 18:00").
  function asFmt(m){return m%60===0?t('as.hour').replace('{n}',m/60):t('as.min').replace('{n}',m);}
  function asSummary(s){s=s||{};if(s.mode==='times')return (s.times&&s.times.length)?t('as.sumTimes').replace('{t}',s.times.join(' · ')):t('as.sumNone');return t('as.sumInterval').replace('{t}',asFmt(s.everyMin||30));}
  function openAsDialog(){
    var s=(Z.auto&&Z.auto.autosyncSchedule)||{mode:'interval',everyMin:30,times:[]};
    var evs=[15,30,60,120,180,360,720],hours=[];for(var h=0;h<24;h++)hours.push((h<10?'0':'')+h+':00');
    var body='<div style="font-size:13px;display:flex;flex-direction:column;gap:10px">'
      +'<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="radio" name="asMode" value="interval"'+(s.mode!=='times'?' checked':'')+'> '+stdEsc(t('as.modeInterval'))+' <select id="asEvery" class="rsel">'+evs.map(function(m){return '<option value="'+m+'"'+(m===(s.everyMin||30)?' selected':'')+'>'+stdEsc(asFmt(m))+'</option>';}).join('')+'</select></label>'
      +'<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="radio" name="asMode" value="times"'+(s.mode==='times'?' checked':'')+'> '+stdEsc(t('as.modeTimes'))+'</label>'
      +'<div id="asTimes" style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px 10px;padding-left:24px;font-size:12px">'+hours.map(function(hh){return '<label style="display:flex;gap:4px;align-items:center;cursor:pointer"><input type="checkbox" class="asT" value="'+hh+'"'+((s.times||[]).indexOf(hh)>=0?' checked':'')+'>'+hh+'</label>';}).join('')+'</div>'
      +'<div class="muted" style="font-size:11px">'+stdEsc(t('as.note'))+'</div></div>';
    zDialog({icon:'⏱',title:t('as.title'),bodyHtml:body,okLabel:t('as.save'),onOk:function(){
      var mode=(document.querySelector('input[name=asMode]:checked')||{}).value||'interval';
      var every=(zid('asEvery')||{}).value||'30';
      var times=Array.prototype.slice.call(document.querySelectorAll('.asT:checked')).map(function(c){return c.value;});
      zPost('/set-autosync-schedule?mode='+mode+'&every='+encodeURIComponent(every)+'&times='+encodeURIComponent(times.join(','))).then(function(){return zGet('/automation');}).then(renderAuto);
    }});
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='asGear')openAsDialog();});
  function renderAuto(a){Z.auto=a=a||{};zset('asSummary',asSummary(a.autosyncSchedule));setTog('scheduler',a.scheduler);setTog('realtime',a.realtime&&a.realtimeWired!==false);setTog('autostart',a.autostart);setTog('autosync',a.autosync);setTog('shortcut',a.shortcut&&a.shortcut.exists);
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
    else if(act==='scanproj'||act==='deepscanproj'){zset('scanProjMsg',t('st.scanning'));var sm2=zid('scanMsg');if(sm2){sm2.className='scanmsg run';sm2.textContent=t('scan.running');}zPost('/memory-scan'+(act==='deepscanproj'?'?deep=1':'')).then(function(r){zset('scanProjMsg','+'+zN(r&&r.totals&&r.totals.newMessages)+' msg · '+((r&&r.changedFiles)||0)+t('src.newFiles'));return zGet('/status');}).then(function(s){if(s)Z.status=s;return zGet('/memory-status?fresh=1').then(renderMem);}).catch(function(){zset('scanProjMsg',t('st.scanErr'));});}
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
      // Hộp xác nhận in TỪNG DÒNG sẽ làm (dry-run trước) — nút "dọn" mà không nói dọn gì là nút im lặng.
      zset('scanProjMsg',t('prune.running'));
      zPost('/prune-projects?dry=1').then(function(d){
        d=d||{};var lines=[];
        if(d.removeReg)lines.push(t('prune.reg').replace('{n}',zN(d.removeReg)));
        (d.merges||[]).forEach(function(m){lines.push(t('prune.merge').replace('{from}',m.from).replace('{to}',zProjName(m.to)).replace('{n}',zN(m.n)));});
        (d.gone||[]).forEach(function(g){lines.push(t('prune.group').replace('{root}',g.root).replace('{n}',zN(g.n)));});
        if(!lines.length){zset('scanProjMsg',t('prune.nothing'));return;}
        zset('scanProjMsg','');
        zConfirm({title:t('prune.title'),body:t('prune.dry')+'\n• '+lines.join('\n• '),okLabel:t('prune.ok'),onOk:function(){
          zset('scanProjMsg',t('prune.running'));
          zPost('/prune-projects').then(function(r){
            r=r||{};zset('scanProjMsg',t('prune.done2').replace('{r}',zN(r.removed||0)).replace('{m}',zN(r.mergedRoots||0)).replace('{g}',zN(r.grouped||0)));
            zToast(t('toast.pruned').replace('{r}',zN(r.removed||0)).replace('{m}',zN(r.mergedRoots||0)).replace('{g}',zN(r.grouped||0)),'ok');
            if(r.knownProjects&&Z.status)Z.status.knownProjects=r.knownProjects;
            return zGet('/status').then(function(s){if(s)Z.status=s;return zGet('/memory-status?fresh=1').then(renderMem);});
          }).catch(function(){zset('scanProjMsg','✗ '+t('q.err'));});
        }});
      }).catch(function(){zset('scanProjMsg','✗ '+t('q.err'));});
    }
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
  // BƯỚC → chữ hiện — mã từ backend (`share.ts::onProgress`), FE tự dịch qua i18n (user 2026-08-30:
  // "phải hiện tiến trình sync đang bước nào"). `lock-wait:<ai>` mang theo tên máy giữ khoá.
  function phaseText(ph){if(!ph)return t('drv.syncing');
    if(ph.indexOf('lock-wait:')===0)return t('drv.phase.lock-wait').replace('{h}',ph.slice(10));
    return t('drv.phase.'+ph)||t('drv.syncing');}
  function pollSync(){zGet('/sync-status').then(function(st){
    if(st&&st.running){zrun('driveState',true);zset('driveState',phaseText(st.phase));setTimeout(pollSync,1500);return;}
    // KHÔNG còn suy "hết running ⇒ xong tốt" (user 2026-08-30: "xoay xong sync ko có gì thay đổi
    // là ko đúng" — lượt 29/08 chết vì Drive chập, `ok:false`, mà UI cũ vẫn báo "✓ sync xong").
    // Lỗi thì BÁO LỖI, đứng yên cho người đọc thấy — không tự tắt sau vài giây rồi im.
    if(st&&st.ok===false){zrun('driveState',false);var m=zid('driveState');if(m)m.classList.add('err');
      zset('driveState','✗ '+(st.error||t('drv.err')));zToast(t('toast.syncFail').replace('{e}',st.error||''),'err');return;}
    // THÀNH: vẫn XOAY tiếp trong lúc chờ số thật về — dừng xoay mà số cũ còn nguyên là đúng lỗi
    // user vừa bắt. `syncPulse` (rẻ) trước, `/memory-status?fresh=1` (số Drive thật) sau; hết cả
    // hai mới tắt xoay + báo xong.
    zset('driveState',t('drv.finishing'));
    syncPulse();
    zGet('/memory-status?fresh=1').then(function(m){renderMem(m);zrun('driveState',false);var el=zid('driveState');if(el)el.classList.remove('err');zset('driveState','✓ '+t('drv.syncDone'));zToast(t('drv.syncDone'),'ok');});
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
    // Folder đã mất (chỉ đo được cho máy này): gom xuống nhóm thu gọn cuối danh sách — phiên vẫn trong kho,
    // nhưng không bày lẫn với repo đang sống (user 2026-08-29).
    // "Bỏ qua" (user chốt 2026-08-29): root bị bỏ qua RỜI danh sách sống, xuống nhóm thu gọn "Đã bỏ qua (N)" có nút
    // Khôi phục — danh sách đó chính là undo, và là câu trả lời "repo nào đang không được track". Chỉ là bộ lọc của
    // danh sách chọn: phiên vẫn trong kho, vẫn recall/sync.
    var all0=(byHost[discTab]||[]),ign=all0.filter(function(p){return p.ignored;}),all=all0.filter(function(p){return !p.ignored;});
    // Nút "Đã bỏ qua (N)" neo PHẢI, cùng hàng tab máy (user 2026-08-29) — mở hộp danh sách có Khôi phục. Đếm mọi máy.
    IGN_ALL=(cap.projects||[]).filter(function(p){return p.ignored;});
    tabs=tabs.replace(/<\/div>\s*$/,'<span style="flex:1"></span><button type="button" class="btn sm" id="ignList" style="align-self:center;margin:2px 0" title="'+stdEsc(t('src.ignoredTip'))+'">'+stdEsc(t('src.ignoredBtn').replace('{n}',IGN_ALL.length))+'</button></div>');
    var live=all.filter(function(p){return !p.gone;}),gone=all.filter(function(p){return p.gone;});
    var goneHtml=gone.length?'<details class="disc-gone" style="margin-top:10px"><summary class="muted" style="font-size:11.5px;cursor:pointer">'+stdEsc(t('src.goneHdr').replace('{n}',gone.length))+'</summary>'+gone.map(function(p){return '<div class="disc-row muted" style="font-size:11.5px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+stdEsc(p.path)+'</span><span>'+zN(p.sessions)+' sess</span><button class="btn sm" data-ignore-proj="'+stdEsc(p.path)+'" data-on="1" title="'+stdEsc(t('src.ignoreTip'))+'">'+stdEsc(t('src.ignore'))+'</button></div>';}).join('')+'</details>':'';
    var ignHtml='';
    var rows=live.slice(0,80).map(function(p){var pbi=p.profile==='non-app';
      var act=isLocalTab
        ? '<button class="btn sm" data-add-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto">＋ Add</button><button class="btn sm" data-merge-proj="'+stdEsc(p.path)+'" style="flex:0 0 auto" title="'+t('src.mergeTip')+'">'+t('src.merge')+'</button>'
        : '<span class="muted" style="font-size:11px;flex:0 0 auto">'+t('src.from')+stdEsc(discTab)+'</span>';
      // NGUỒN của từng root (user 2026-08-29: "hiện nguồn của nó để biết có nên add không"): chip theo nguồn góp phiên.
      // Root không phải đường dẫn đĩa = TÊN PROJECT trên web (ChatGPT/Claude project) ⇒ không có folder để Add — ẩn nút Add,
      // giữ Merge (gộp vào một dự án đã liên kết vẫn có nghĩa).
      var srcs=String(p.sources||'').split(',').filter(Boolean);
      var isPath=/^[A-Za-z]:[\\/]|^\//.test(String(p.path));
      var chips=srcs.map(function(s){return '<span class="srcchip'+(/-web$|-cowork$/.test(s)?' is-web':'')+'">'+stdEsc(s)+'</span>';}).join('');
      var rowAct=isPath?act:(isLocalTab?act.replace(/<button class="btn sm" data-add-proj="[^"]*"[^>]*>＋ Add<\/button>/,'<span class="muted" style="font-size:10.5px;flex:0 0 auto" title="'+stdEsc(t('src.webProjTip'))+'">'+stdEsc(t('src.webProj'))+'</span>'):act);
      rowAct+='<button class="btn sm" data-ignore-proj="'+stdEsc(p.path)+'" data-on="1" style="flex:0 0 auto" title="'+stdEsc(t('src.ignoreTip'))+'">'+stdEsc(t('src.ignore'))+'</button>';
      return '<div class="disc-row"><div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="nm">'+stdEsc(zProjName(p.path))+'</span>'+(p.profile?'<span class="ptype '+(pbi?'is-non':'is-app')+'">'+(pbi?'NON-APP':'APP')+'</span>':'')+chips+'</div><div class="muted" style="font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+stdEsc(p.path)+' · '+zN(p.sessions)+' sess · '+zN(p.messages)+' msg</div></div><div class="sxa">'+rowAct+'</div></div>';
    }).join('');
    box.innerHTML='<div class="sys-grp" style="margin-top:16px;color:var(--warn)">'+t('src.unlinkedHdr')+'</div>'+tabs+'<div style="margin-top:8px">'+rows+'</div>'+goneHtml+ignHtml;
  }
  var IGN_ALL=[];
  function openIgnoredList(){
    var rows=IGN_ALL.length?IGN_ALL.map(function(p){return '<div class="disc-row" style="font-size:12px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis" title="'+stdEsc(p.path)+'">'+stdEsc(p.path)+'</span><span class="muted" style="flex:0 0 auto">'+stdEsc(p.host||'')+' · '+zN(p.sessions)+' sess</span><button class="btn sm" data-ignore-proj="'+stdEsc(p.path)+'" data-on="0" style="flex:0 0 auto">'+stdEsc(t('src.restore'))+'</button></div>';}).join(''):'<div class="muted">'+stdEsc(t('src.ignoredNone'))+'</div>';
    zDialog({icon:'🚫',title:t('src.ignoredTitle').replace('{n}',IGN_ALL.length),bodyHtml:'<div class="muted" style="font-size:11.5px;margin-bottom:8px">'+stdEsc(t('src.ignoreTip'))+'</div>'+rows,okLabel:t('scope.detClose')});
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='ignList')openIgnoredList();});
  document.addEventListener('click',function(e){var b=e.target.closest?e.target.closest('[data-ignore-proj]'):null;if(!b)return;
    e.stopPropagation();b.disabled=true;var on=b.dataset.on!=='0',path=b.dataset.ignoreProj,name=zProjName(path);
    // Báo NGAY (toast) rồi mới vẽ lại: /memory-status có thể mất vài giây, im lặng lúc đó là "bấm không thấy gì".
    zToast(t(on?'toast.ignoring':'toast.restoring').replace('{p}',name));
    zPost('/set-project-ignore?root='+encodeURIComponent(path)+'&on='+(on?'1':'0')).then(function(){return zGet('/memory-status');}).then(function(m){renderMem(m);zToast(t(on?'toast.ignored':'toast.restored').replace('{p}',name),'ok');
      var d=zid('zDlg');if(d&&d.classList.contains('on')&&zid('zDlgTitle')&&/🚫|Đã bỏ qua|Ignored/.test(zid('zDlgIcon').textContent+zid('zDlgTitle').textContent))openIgnoredList();
    }).catch(function(){b.disabled=false;zToast(t('q.err'),'err');});});
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
