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
    box.innerHTML=rows.length?rows.map(function(s){var ti=(s.title&&String(s.title).trim())||t('sess.untitled');return '<div class="sys-li'+(svCur===s.sessionId?' on':'')+'" data-sess="'+stdEsc(s.sessionId)+'" style="align-items:flex-start"><span class="sxn" style="white-space:normal">'+stdEsc(String(ti).slice(0,64))+(s.atts?' <span class="att-n">🖼'+s.atts+'</span>':'')+'<div class="muted" style="font-size:10.5px;margin-top:1px">'+stdEsc(zProjName(s.project))+' · '+stdEsc(s.source||'')+' · '+zN(s.messages)+' msg</div></span><span style="font-size:10px;color:var(--text-faint);flex:0 0 auto;margin-left:6px;text-align:right">'+relTime(s.endedAt).big+'<span class="ctx-b" data-ctxfor="'+stdEsc(s.sessionId)+'" style="display:block;margin-top:2px"></span></span></div>';}).join(''):'<div class="muted" style="font-size:12px">'+t('sess.none')+'</div>';
    fillCtxBadges(rows);
  }
  // ── Badge CONTEXT ─────────────────────────────────
  // Dien o LUOT THU HAI, khong chan render: gia do duoc la 141 ms cho 80 phien (uoc tinh
  // token) + ~11,5 ms/phien cho phan doc duoi transcript. Bat nguoi dung cho 1,4 s truoc khi
  // thay danh sach chi vi mot con so phu la sai danh doi.
  var svCtx={},svWarnPct=null;
  function ctxBadge(c,warnPct){
    if(!c)return '';
    // HAI LOAI SO, KHONG TRON. measured co mau so do host khai => noi %; estimate chi co tu so
    // => noi token kem "~". Quy estimate ra % la bia mau so (user chot 2026-09-02).
    if(c.kind==='estimate')return '<span title="'+stdEsc(t('ctx.estimateT'))+'" style="color:var(--text-faint)">~'+zN(c.tokens)+'</span>';
    if(typeof c.percent!=='number')return '';
    var pct=Math.round(c.percent);
    var w=(typeof warnPct==='number'?warnPct:c.threshold)||90;
    // Mau lay DUNG nguong nguoi dung dat — khong de nguong thu hai, de badge va hook luon
    // noi cung mot cau.
    // Xam khong thay gi tren nen toi (user chot 2026-09-02) => dung XANH cho muc an toan.
    // Cam va do giu NGUYEN.
    var col=pct>=w?'var(--danger)':(pct>=w-10?'var(--warn)':'var(--success)');
    // Phien con ghi so trong 15 phut = DANG CHAY (dot dac, "dang la bay nhieu"); cu hon = DA
    // DONG (dot rong, "ket thuc o muc do"). Hai thu khac nghia, khong duoc hien giong nhau.
    var live=c.at&&(Date.now()-Date.parse(c.at))<15*60*1000;
    var tip=t('ctx.measuredT')+' — '+(live?t('ctx.liveT'):t('ctx.doneT'))+(pct>=w?' '+t('ctx.overT'):'');
    // DA NEN => % chi noi ve CHU KY hien tai, khong noi duoc do lon phien. Nen phan chinh doi
    // sang TONG da tieu + so lan nen; % van con trong tooltip. Chua nen thi giu nguyen % (ca
    // pho bien: do 40 phien that, chi 2 tung nen).
    var nc=c.compactions||0;
    if(nc>0){
      var tot=c.totalTokens||c.tokens;
      tip=t('ctx.compactT').replace('{n}',nc).replace('{tot}',zN(tot)).replace('{pct}',pct)+' — '+tip;
      return '<span title="'+stdEsc(tip)+'" style="color:'+col+'">'+(live?'●':'◐')+' '+zN(tot)+' ⟳'+nc+'</span>';
    }
    return '<span title="'+stdEsc(tip)+'" style="color:'+col+'">'+(live?'●':'◐')+' '+pct+'%</span>';
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
    // CHIA LO 40 va goi TUAN TU. Endpoint doc transcript bang I/O dong bo (~11,5 ms/phien) tren
    // event loop cua daemon; ban song song 120 id la khoa moi endpoint khac vai giay — dung loi
    // da tra gia 2026-08-23. Tuan tu thi moi luot ~460 ms va badge hien dan tu tren xuong.
    var CHUNK=40;
    function next(from){
      if(from>=need.length)return;
      var lot=need.slice(from,from+CHUNK);
      zGet('/session-context?ids='+encodeURIComponent(lot.join(','))).then(function(r){
        if(r){
          if(typeof r.warnPercent==='number')svWarnPct=r.warnPercent;
          // Ghi ca ca KHONG co so (null) de khong hoi lai mai cung mot id.
          for(var k=0;k<lot.length;k++)svCtx[lot[k]]=(r.items&&r.items[lot[k]])||null;
          paintCtxBadges(svWarnPct);
          if(svCur)svCtxInfo(svCur);
        }
        next(from+CHUNK);
      }).catch(function(){next(from+CHUNK);});
    }
    next(0);
  }
  // Dong meta cua panel chi tiet: them context SAU khi svInfo da dat text co ban.
  function svCtxInfo(sid){
    var el=zid('sessVInfo');if(!el)return;
    var c=svCtx[sid];if(!c)return;
    var base=el.getAttribute('data-base');
    if(base===null){base=el.textContent||'';el.setAttribute('data-base',base);}
    var add='';
    if(c.kind==='estimate')add='~'+zN(c.tokens)+' token ('+t('ctx.label')+', est.)';
    else if(typeof c.percent==='number'){
      add=Math.round(c.percent)+'% '+t('ctx.label')+' ('+zN(c.tokens)+' / '+zN(c.window)+')';
      // Da nen => noi ro TONG da tieu, vi % o tren chi la chu ky hien tai.
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
    // data-base phai duoc dat LAI moi lan doi phien, khong thi context cua phien truoc dinh
    // vao dong meta cua phien sau.
    el.removeAttribute('data-base');
    if(svCur)svCtxInfo(svCur);
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
      body.innerHTML='<div class="thread">'+s.messages.map(function(m){return msgBlock(m,0);}).join('')+'</div>';
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
  // Gõ → hỏi lại SERVER (lọc trên cả 1.206 phiên, không phải 120 phiên đã tải). Chờ 250ms
  // để không bắn một truy vấn cho mỗi phím.
  var sessQT=null;
  document.addEventListener('input',function(e){
    if(!e.target||e.target.id!=='sessSearch')return;
    clearTimeout(sessQT);sessQT=setTimeout(loadSessions,250);
  });
