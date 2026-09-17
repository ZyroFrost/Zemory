// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
  // ── SESSION VIEWER: full session list (left) + thread + info + export (right).
  //    /sessions (list) + /memory-session (thread). Export = client-side .md download.
  var svList=[],svCur=null,svThread=null;
  // Bộ lọc tab Phiên — ĐỐI XỨNG với `recallParams()` của tab Tìm kiếm, và cũng đi xuống
  // SERVER: lọc phía client chỉ soi 120 phiên vừa tải trong khi DB có 1.206 ⇒ số đếm hiện
  // ra sẽ là số dối.
  function sessParams(){
    var p='',f;
    if((f=zid('sessSearch'))&&f.value.trim())p+='&q='+encodeURIComponent(f.value.trim());
    if((f=zid('fSTime'))&&f.value!=='0')p+='&days='+f.value;
    if((f=zid('fSOrigin'))&&f.value)p+='&origin='+encodeURIComponent(f.value);
    if((f=zid('fSAgent'))&&f.value)p+='&agent='+encodeURIComponent(f.value);
    if((f=zid('fSHost'))&&f.value)p+='&host='+encodeURIComponent(f.value);
    if((f=zid('sImg'))&&f.classList.contains('on'))p+='&withAtt=1';
    return p;
  }
  var svTotal=0;
  function loadSessions(){
    var box=zid('sessList');if(!box)return;box.innerHTML='<div class="muted" style="font-size:12px">…</div>';
    // fresh=1 → backend làm tươi TÊN phiên từ đuôi transcript trước khi trả list, nên phiên
    // vừa đổi tên bằng `/title` hiện tên MỚI ngay, không phải chờ scan (user 2026-07-26).
    zGet('/sessions?limit=120&fresh=1'+sessParams()).then(function(r){
      svList=(r&&r.items)||[];svTotal=(r&&r.total)||0;renderSessList();
    }).catch(function(){box.innerHTML='<div class="muted" style="font-size:12px">'+t('ph.err')+'</div>';});
  }
  /** Nạp option cho 2 select chỉ có ở tab Phiên, từ payload /memory-status đã có sẵn. */
  function fillSessFilters(m){
    if(!m)return;
    var fa=zid('fSAgent');
    if(fa){var av=fa.value;fa.innerHTML='<option value="">'+t('f.agentAny')+'</option>'+((m.agents||[]).map(function(a){return '<option value="'+stdEsc(a.source)+'">'+stdEsc(a.source)+'</option>';}).join(''));fa.value=av;}
    var fh=zid('fSHost');
    if(fh){var hv=fh.value;fh.innerHTML='<option value="">'+t('f.hostAny')+'</option>'+((m.hosts||[]).map(function(h){return '<option value="'+stdEsc(h.host)+'">'+stdEsc(h.host)+'</option>';}).join(''));fh.value=hv;}
  }
  function renderSessList(){
    var box=zid('sessList');if(!box)return;
    var rows=svList;
    // "N phiên" là số KHỚP THẬT trên toàn bộ DB; nếu danh sách bị cắt ở 120 thì nói rõ
    // đang hiện bao nhiêu — thà thừa một con số còn hơn để người đọc tưởng đã thấy hết.
    zset('sCount',rows.length<svTotal?zN(rows.length)+'/'+zN(svTotal)+' '+t('f.sessions'):zN(svTotal)+' '+t('f.sessions'));
    box.innerHTML=rows.length?rows.map(function(s){var ti=(s.title&&String(s.title).trim())||t('sess.untitled');return '<div class="sys-li'+(svCur===s.sessionId?' on':'')+'" data-sess="'+stdEsc(s.sessionId)+'" style="align-items:flex-start"><span class="sxn" style="white-space:normal">'+stdEsc(String(ti).slice(0,64))+'<div class="muted" style="font-size:10.5px;margin-top:1px">'+stdEsc(zProjName(s.project))+' · '+stdEsc(s.source||'')+' · '+zN(s.messages)+' msg'+(s.atts?' · '+zN(s.atts)+' '+stdEsc(t('files.unit')):'')+'</div></span><span style="font-size:10px;color:var(--text-faint);flex:0 0 auto;margin-left:6px;text-align:right">'+relTime(s.endedAt).big+'<span class="ctx-b" data-ctxfor="'+stdEsc(s.sessionId)+'" style="display:block;margin-top:2px"></span></span></div>';}).join(''):'<div class="muted" style="font-size:12px">'+t('sess.none')+'</div>';
    fillCtxBadges(rows);
  }
  // ── Badge CONTEXT ─────────────────────────────────
  // Filled in on a SECOND PASS so the render is not blocked: the measured cost is 141 ms for 80 sessions (token
  // estimate) plus about 11.5 ms per session for the part that reads the transcript. Making the user wait 1.4 s before
  // seeing the list just for one secondary number is the wrong trade.
  var svCtx={},svWarnPct=null;
  function ctxBadge(c,warnPct){
    if(!c)return '';
    // TWO KINDS OF NUMBER, NEVER MIXED. A measured one has a denominator declared by the host => report a %; an estimate has only a numerator
    // => report tokens with a "~". Turning an estimate into a % invents the denominator (user ruling 2026-09-02).
    if(c.kind==='estimate')return '<span title="'+stdEsc(t('ctx.estimateT'))+'" style="color:var(--text-faint)">~'+zN(c.tokens)+'</span>';
    if(typeof c.percent!=='number')return '';
    var pct=Math.round(c.percent);
    var w=(typeof warnPct==='number'?warnPct:c.threshold)||90;
    var nc=c.compactions||0;
    var tot=c.totalTokens||c.tokens;
    // A CUMULATIVE % over the window: going PAST 100% is precisely the sign of a compaction (user ruling 2026-09-02 — "the point
    // is how far past 100% it went, so you know it compacted"). One single number, comparable down the column,
    // and it speaks for itself: 136% = compacted once · 352% = compacted three times. In a session that has NOT compacted,
    // totalTokens == tokens, so this number MATCHES the current % — the badge does not change at all.
    var totalPct=c.window?Math.round(100*tot/c.window):pct;
    // The colour follows EXACTLY the threshold the user set — no second threshold, so the badge and the hook always tell
    // the same story. Grey is invisible on a dark background (user ruling) => GREEN for the safe level.
    // 100% AND ABOVE IS ALWAYS RED (user ruling 2026-09-02: "past 100% has to be red to be right"):
    // passing a whole window means the session HAS BEEN COMPACTED at least once — that truth outweighs every
    // threshold, and it must be readable from the COLOUR rather than forcing anyone to read the number.
    var col=(totalPct>=100||pct>=w)?'var(--danger)':(pct>=w-10?'var(--warn)':'var(--success)');
    // A session still writing within the last 15 minutes is RUNNING (solid dot, "it is at this much right now"); older is
    // CLOSED (hollow dot, "it ended at this much"). Two different meanings, and they must not look the same.
    var live=c.at&&(Date.now()-Date.parse(c.at))<15*60*1000;
    var tip=t('ctx.measuredT')+' — '+(live?t('ctx.liveT'):t('ctx.doneT'))+(pct>=w?' '+t('ctx.overT'):'');
    if(nc>0){
      // The tooltip carries the TOTAL plus the compaction count; the badge carries only the cumulative % to stay compact.
      tip=t('ctx.compactT').replace('{n}',nc).replace('{tot}',zN(tot)).replace('{pct}',pct)+' — '+tip;
      return '<span title="'+stdEsc(tip)+'" style="color:'+col+'">'+(live?'●':'◐')+' '+totalPct+'% ⟳'+nc+'</span>';
    }
    return '<span title="'+stdEsc(tip)+'" style="color:'+col+'">'+(live?'●':'◐')+' '+totalPct+'%</span>';
  }
  function paintCtxBadges(warnPct){
    var els=document.querySelectorAll('[data-ctxfor]');
    for(var i=0;i<els.length;i++)els[i].innerHTML=ctxBadge(svCtx[els[i].getAttribute('data-ctxfor')],warnPct);
  }
  function fillCtxBadges(rows){
    if(!rows||!rows.length)return;
    var need=[];
    for(var i=0;i<rows.length;i++){var id=rows[i].sessionId;if(id&&!(id in svCtx))need.push(id);}
    if(!need.length){paintCtxBadges(svWarnPct);return;}
    // BATCHES OF 40, called SEQUENTIALLY. The endpoint reads transcripts with synchronous I/O (~11.5 ms per session) on
    // the daemon event loop; firing 120 ids in parallel locks every other endpoint for seconds — a mistake
    // already paid for 2026-08-23. Sequentially each round is about 460 ms and the badges appear top-down.
    var CHUNK=40;
    function next(from){
      if(from>=need.length)return;
      var lot=need.slice(from,from+CHUNK);
      zGet('/session-context?ids='+encodeURIComponent(lot.join(','))).then(function(r){
        if(r){
          if(typeof r.warnPercent==='number')svWarnPct=r.warnPercent;
          // Record even the cases with NO number (null), so the same id is not asked about forever.
          for(var k=0;k<lot.length;k++)svCtx[lot[k]]=(r.items&&r.items[lot[k]])||null;
          paintCtxBadges(svWarnPct);
          if(svCur)svCtxInfo(svCur);
        }
        next(from+CHUNK);
      }).catch(function(){next(from+CHUNK);});
    }
    next(0);
  }
  // The meta line of the detail panel: context is appended AFTER svInfo has set the base text.
  function svCtxInfo(sid){
    var el=zid('sessVInfo');if(!el)return;
    var c=svCtx[sid];if(!c)return;
    var base=el.getAttribute('data-base');
    if(base===null){base=el.textContent||'';el.setAttribute('data-base',base);}
    var add='';
    if(c.kind==='estimate')add='~'+zN(c.tokens)+' token ('+t('ctx.label')+', est.)';
    else if(typeof c.percent==='number'){
      add=Math.round(c.percent)+'% '+t('ctx.label')+' ('+zN(c.tokens)+' / '+zN(c.window)+')';
      // Compacted => state the TOTAL consumed, because the % above covers only the current cycle.
      if(c.compactions>0)add+=' · '+t('ctx.compactShort').replace('{n}',c.compactions).replace('{tot}',zN(c.totalTokens||c.tokens));
    }
    el.textContent=add?base+' · '+add:base;
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
  function attSize(n){n=Number(n||0);return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';}
  // Đính kèm của một message. Payload chỉ mang METADATA; bytes lấy riêng qua
  // /attachment?sha= để JSON không phình theo kích thước ảnh.
  function attHtml(atts){
    if(!atts||!atts.length)return '';
    return '<div class="atts">'+atts.map(function(a){
      // Có TÊN GỐC thì hiện tên (ảnh do tool Read đọc từ file trên đĩa); ảnh dán/chụp màn
      // hình thì transcript không ghi tên nào cả ⇒ hiện kiểu ảnh cho gọn.
      var cap=stdEsc(a.name?String(a.name):String(a.mime||'?').replace('image/',''))+' · '+attSize(a.bytes);
      // kind='ref' = CỐ Ý không lưu nội dung (vượt ngưỡng lúc nạp) ⇒ nói rõ, đừng dựng
      // khung ảnh rỗng: một ô vỡ trông như lỗi trong khi đó là hành vi đã thiết kế.
      if(a.kind!=='blob'||String(a.mime||'').indexOf('image/')!==0)
        return '<div class="att noimg">'+t('att.noBody')+' · '+cap+'</div>';
      return '<div class="att" data-img="'+stdEsc(a.sha256||'')+'" data-cap="'+cap+'" title="'+cap+'"><img loading="lazy" alt="" src="/attachment?sha='+encodeURIComponent(a.sha256||'')+'"><div class="cap">'+cap+'</div></div>';
    }).join('')+'</div>';
  }
  // Nhãn một dòng adapter để lại trong content (`[image:image/png 46KB <sha12>]`) — nó
  // tồn tại để FTS còn tìm được và để người đọc text thuần vẫn biết có ảnh. Khi đã vẽ
  // được thumbnail thì bỏ dòng nhãn đi, không hiện cùng một thông tin hai lần.
  var IMG_LABEL=/^\[image:[^\]\n]*\]$/;
  function msgHtml(raw,atts){
    var s=String(raw||'');
    // Việc bỏ nhãn `[image:…]` nằm ở msgBlock (chỗ gọi DUY NHẤT), CỐ Ý không lặp lại ở đây:
    // nó phải chạy TRƯỚC khi cắt chuỗi, còn tới đây thì đã muộn — nhãn bị cắt đôi sẽ lọt ra
    // màn hình. Lặp ở hai nơi còn CHE MẤT lỗi: đột biến 2026-07-28 phá đúng chỗ kia mà gate
    // vẫn xanh, vì bản sao ở đây gánh thay.
    if(!s)return attHtml(atts);
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
    }).join('')+attHtml(atts);
  }
  /**
   * MỘT bộ vẽ message dùng chung cho CẢ HAI chỗ: thread trong tab Phiên và ô Xem trước
   * của tab Tìm kiếm. Trước đây mỗi nơi một kiểu (user 2026-07-28: "giao diện của phiên
   * khác bên tìm"): Xem trước dán thẳng text đã escape nên còn nguyên dòng nhãn
   * `[image:…]` ngay cạnh thumbnail (một thông tin hiện hai lần), không thu gọn khối
   * code/tool, và dán nhãn "user" cho cả output tool. Hai bộ vẽ = chắc chắn lệch nhau.
   * `cap` = số ký tự tối đa (Xem trước cắt cho nhẹ; tab Phiên truyền rỗng = full).
   */
  function msgBlock(m,cap){
    var rl=msgRole(m),s=String(m.content||'');
    // Bỏ nhãn TRƯỚC khi cắt, để không bao giờ còn lại một nhãn đứt nửa chừng.
    if(m.atts&&m.atts.length)s=s.split('\n').filter(function(l){return !IMG_LABEL.test(l.trim());}).join('\n').trim();
    if(cap&&s.length>cap)s=s.slice(0,cap)+'…';
    return '<div class="msg" data-role="'+stdEsc(rl)+'"><div class="who"><span class="tag '+stdEsc(rl)+'">'+
      stdEsc(rl==='tool'?t('sess.roleTool'):rl)+'</span>'+
      (m.timestamp?' · '+String(m.timestamp).slice(0,16).replace('T',' '):'')+
      (m.id?' · #'+m.id:'')+'</div><div class="body">'+msgHtml(s,m.atts)+'</div></div>';
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
    // data-base must be set AGAIN on every session change, otherwise the previous session's context sticks
    // to the next session's meta line.
    el.removeAttribute('data-base');
    if(svCur)svCtxInfo(svCur);
  }
  function openSess(sid){
    svCur=sid;renderSessList();
    // Panel tệp của phiên (plan/25 §5 ②) — fail-open: chưa nạp xong gm.js thì bỏ qua,
    // hội thoại vẫn mở bình thường. Một panel phụ không được phép chặn màn chính.
    if(window.zSessionFiles)window.zSessionFiles(sid);
    var meta=svList.filter(function(s){return s.sessionId===sid;})[0]||{};
    var body=zid('sessVBody');if(!body)return;
    svInfo(meta,null);body.innerHTML='<div class="muted">…</div>';
    zGet('/memory-session?id='+encodeURIComponent(sid)).then(function(s){
      if(!s||!s.messages){body.innerHTML='<div class="muted">'+t('sess.notFound')+'</div>';svThread=null;return;}
      svInfo(meta,s);
      svThread={title:svTitle,messages:s.messages};
      body.innerHTML='<div class="thread">'+s.messages.map(function(m){return msgBlock(m,0);}).join('')+'</div>';
      body.scrollTop=0;
    }).catch(function(){body.innerHTML='<div class="muted">'+t('ph.err')+'</div>';});
  }
  function svExport(){
    if(!svThread){zToast(t('sess.pickFirst'));return;}
    var md='# '+svThread.title+'\n\n'+svThread.messages.map(function(m){return '## '+(m.role||'')+' · '+String(m.timestamp||'').slice(0,16).replace('T',' ')+'\n\n'+String(m.content||'');}).join('\n\n---\n\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([md],{type:'text/markdown'}));a.download='session-'+(svCur||'export')+'.md';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  }
  // Seam công khai để màn khác mở một phiên (màn Tệp bấm một tấm ảnh ⇒ về đúng hội thoại).
  // MỘT hàm dùng chung thay vì mỗi màn tự dựng lại đường mở phiên — bài học `zemory sweep`
  // 12/09: hai bề mặt của cùng một chức năng phải đi qua cùng một cửa.
  window.zOpenSession=function(sid){if(sid)openSess(sid);};
  document.addEventListener('click',function(e){
    if(!e.target.closest)return;
    var li=e.target.closest('#sessList [data-sess]');if(li){openSess(li.dataset.sess);return;}
    if(e.target.id==='sessExport'){svExport();return;}
  });
  // Gõ → hỏi lại SERVER (lọc trên cả 1.206 phiên, không phải 120 phiên đã tải). Chờ 250ms
  // để không bắn một truy vấn cho mỗi phím.
  var sessQT=null;
  document.addEventListener('input',function(e){
    if(!e.target||e.target.id!=='sessSearch')return;
    clearTimeout(sessQT);sessQT=setTimeout(loadSessions,250);
  });
