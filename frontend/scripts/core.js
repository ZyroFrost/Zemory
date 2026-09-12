// TÁCH TỪ app.js 2026-08-06 — global scope (không IIFE), thứ tự nạp khai ở app.html.
// Cắt CƠ HỌC giữ hành vi; dời hàm giữa file là việc của đợt sau. Xem 06_CHANGES.
// Hộp đồ nghề dùng chung MỌI màn: zid/zset/zGet/zPost · toast/dialog · stdMd · Z state.
// Trước nằm rải ở dòng 142-166 + 713-757 GIỮA vùng graph — mọi cụm tưởng phụ thuộc graph
// hoá ra chỉ phụ thuộc hộp này. PHẢI NẠP ĐẦU TIÊN.
  // ---- Reusable dialog (confirm + input) — replaces browser prompt()/confirm() ----
  // o:{icon,title,bodyHtml,okLabel,cancelLabel,danger,onOk,focus}. onOk() runs on
  // OK; return true to KEEP the dialog open (validation error / async in progress),
  // otherwise it closes. Async flows show progress via zDlgMsg() then zDlgClose().
  var zToastT=null;
  // TOAST góc phải, XẾP CHỒNG, sống ~5 s, có nút tắt — kiểu thẻ thông báo của Streamlit (user chốt 2026-08-29:
  // *"mọi hoạt động đều có popup thông báo nhảy ra bên phải"*). Bản cũ: một dòng ở đáy giữa, 2,6 s, không tắt được,
  // thông báo sau ĐÈ thông báo trước ⇒ hành động chậm (ignore · prune · scan) nhìn như không có gì xảy ra.
  // `kind`: '' | 'ok' | 'warn' | 'err' — chỉ đổi viền/icon; chữ là nội dung.
  function zToast(x,kind,ms){var box=zid('zToasts');if(!box)return;
    var el=document.createElement('div');el.className='ztoast'+(kind?' '+kind:'');el.setAttribute('role','status');
    el.innerHTML='<span class="zt-msg"></span><button type="button" class="zt-x" aria-label="close" title="×">×</button>';
    el.querySelector('.zt-msg').textContent=x||'';
    var kill=function(){el.classList.add('out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},220);};
    el.querySelector('.zt-x').addEventListener('click',kill);
    box.appendChild(el);requestAnimationFrame(function(){el.classList.add('on');});
    var t=setTimeout(kill,ms||5000);el.addEventListener('mouseenter',function(){clearTimeout(t);});el.addEventListener('mouseleave',function(){t=setTimeout(kill,2000);});
    while(box.children.length>5)box.removeChild(box.firstChild); // không để thác thông báo phủ màn
    return el;}
  var zDlgOnOk=null;
  function zDlgMsg(x){zset('zDlgMsg',x||'');}
  function zDlgClose(){var d=zid('zDlg');if(d)d.classList.remove('on');zDlgOnOk=null;}
  // ── Icon nhận diện — MỘT nguồn, dùng cho chip ở rail lẫn tiêu đề hộp thoại ──────────────────
  // SVG nét đơn sắc, KHÔNG emoji: emoji có màu CỐ ĐỊNH (📘 không nhận `color`) nên chip không tô
  // được theo trạng thái, mỗi nền lại vẽ một kiểu, và ở cỡ nhỏ trông như dán tạm — user gọi đúng
  // tên là "không chuyên nghiệp" (2026-09-09). SVG ăn theo `currentColor`, sắc ở mọi cỡ.
  var ZICON={
    app:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.8v7"/><path d="M5.2 5.6 8 2.8l2.8 2.8"/><path d="M3.2 11.2v1.4c0 .5.4.9.9.9h7.8c.5 0 .9-.4.9-.9v-1.4"/></svg>',
    std:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.6h5.2L12 5.4v8H4z"/><path d="M9.2 2.6v2.8H12"/><path d="M6 9.6l1.3 1.3 2.7-2.9"/></svg>',
    health:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.9"/><path d="M5.4 8.2l1.9 1.9 3.4-3.9"/></svg>',
    expand:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 2.6h3.8v3.8"/><path d="M13.4 2.6 9.2 6.8"/><path d="M6.4 13.4H2.6V9.6"/><path d="M2.6 13.4l4.2-4.2"/></svg>'
  };
  /** MỞ FULL một panel: bê CHÍNH nội dung đã render sang hộp lớn — KHÔNG gọi lại API, KHÔNG dựng
   *  viewer thứ hai. Repo đã một lần gỡ `#sessDlg` vì nó render lại y hệt viewer chính (recall.js
   *  §đầu file): hai bộ dựng cho một nội dung thì sớm muộn cũng lệch, và người đọc không biết bản
   *  nào mới hơn. Ở đây hộp chỉ là một KHUNG TO HƠN cho cùng một DOM. */
  function zExpandPanel(bodyId,title){
    var b=zid(bodyId);if(!b)return;
    var html=b.innerHTML;
    if(!html||!html.trim()){zToast(t('panel.expandEmpty'),'warn');return;}
    zDialog({iconHtml:ZICON.expand,title:title||'',size:'lg',bodyHtml:'<div class="zexpand">'+html+'</div>',
      okLabel:t('scope.detClose'),onOk:null});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('[data-expand]'):null;if(!b)return;
    e.stopPropagation();
    // Tiêu đề hộp lấy từ CHÍNH tiêu đề panel (`data-expand-from`) nên hai chỗ không bao giờ lệch
    // tên; không có thì để trống chứ không bịa.
    var src=zid(b.getAttribute('data-expand-from')||'');
    zExpandPanel(b.getAttribute('data-expand'),src?src.textContent:'');
  });
  // Đổ vào mọi chỗ KHAI `data-icon` — markup chỉ nói "chỗ này icon gì", không chứa bản vẽ.
  document.querySelectorAll('[data-icon]').forEach(function(el){var k=el.getAttribute('data-icon');if(ZICON[k])el.innerHTML=ZICON[k];});
  function zDialog(o){var d=zid('zDlg');if(!d)return;o=o||{};
    // KÍCH THƯỚC theo đúng ba nấc đã chốt (`03_STRUCTURE §5`: S 40% · M 60% · L 90%, CÙNG tỉ lệ
    // 16:9). Mặc định giữ nguyên nấc S của hộp dùng chung; `size:'lg'` cho nội dung dài như một
    // hội thoại đầy đủ — S không đủ thì CHỌN NẤC TO HƠN, không kéo méo khung.
    var box=d.querySelector('.dlg');
    if(box){box.classList.toggle('lg',o.size==='lg');box.classList.toggle('sm',o.size!=='lg'&&o.size!=='md');} // 'md' = nấc gốc .dlg (60%)
    // `iconHtml` cho hộp thoại dùng CÙNG bộ icon với chip — hai chỗ nói về một việc thì phải cùng
    // một hình. Không có thì vẫn nhận ký tự như cũ (tương thích ngược, mọi lời gọi cũ giữ nguyên).
    var ic=zid('zDlgIcon');if(ic){if(o.iconHtml)ic.innerHTML=o.iconHtml;else ic.textContent=o.icon||'?';}
    zset('zDlgTitle',o.title||'');
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
  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — REAL BACKEND WIRING. Elements marked .demo are MOCK (no real
  // backend) and left in place ON PURPOSE for review. Everything here is live.
  // ══════════════════════════════════════════════════════════════════════════
  function zid(id){return document.getElementById(id);}
  function zset(id,v){var e=zid(id);if(e)e.textContent=v;}
  function zN(n){return Number(n||0).toLocaleString();}
  function zBytes(kb){var n=Number(kb||0);if(!n)return '0';if(n>1048576)return (n/1048576).toFixed(1)+' GB';if(n>1024)return (n/1024).toFixed(0)+' MB';return n+' KB';}
  function zProjName(p){return String(p||'').split(/[\\/]/).filter(Boolean).pop()||'(unknown)';}
  // Mọi mảnh chữ ở đây đi qua i18n: ô này hiện ngay trang chủ nên nó là chỗ tiếng Việt lọt ra
  // rõ nhất khi bật `lang=en` (đo 2026-08-12 lúc chụp ảnh README bằng UI tiếng Anh).
  function relTime(iso){
    if(!iso)return {big:t('st.notSynced'),sub:'—'};
    var ts=new Date(iso).getTime();if(isNaN(ts))return {big:'—',sub:'—'};
    var s=Math.max(0,Math.floor((Date.now()-ts)/1000));
    var big=s<60?s+' '+t('rel.sec'):s<3600?Math.floor(s/60)+' '+t('rel.min'):s<86400?Math.floor(s/3600)+' '+t('rel.hour'):Math.floor(s/86400)+' '+t('rel.day');
    return {big:t('rel.ago').replace('{v}',big),sub:String(iso).slice(0,16).replace('T',' ')};
  }
  function pillFor(st){return st==='on'?'ok':st==='warn'?'warn':st==='off'?'warn':'dim';}
  function pillTxt(st){return st==='on'?'Healthy':st==='warn'?'Warning':st==='off'?'Off':'—';}
  function zGet(u){return fetch(u).then(function(r){return r.json();});}
  function zPost(u){return fetch(u,{method:'POST'}).then(function(r){return r.json();});}
  /**
   * LƯU MỘT THIẾT LẬP — gạt nút là một lời hứa "đã lưu"; không lưu được thì phải RÚT LỜI, không im.
   *
   * 🔴 Vì sao (user báo 2026-09-10: *"tui tắt rồi bạn mở lại nó vẫn y như cũ, setting tính năng ko
   * bao giờ dc lưu"*): mọi công tắc đều lật nút TRƯỚC rồi mới gửi, và cả ba đường gạt đều kết bằng
   * `.catch(function(){})` — nuốt sạch. Nền đang tắt/bận ⇒ nút sáng lên, không có gì được ghi, và
   * không ai báo. Mở lại thì nó về như cũ ⇒ người dùng đọc thành "app không bao giờ lưu". Đúng thứ
   * `02_RULES §Bề mặt CHẾT THEO nền` cấm: **vỏ rỗng trông như đang sống là kiểu hỏng TỆ NHẤT, vì nó
   * không báo lỗi, nó NÓI DỐI.**
   *
   * Ba kiểu "không lưu được" phải bị bắt như nhau — thiếu kiểu nào là còn một đường nói dối:
   *   ① gọi hỏng / không parse được (nền chết, mất kết nối)
   *   ② HTTP ngoài 2xx
   *   ③ nền trả `{ok:false}` — nhận request nhưng TỪ CHỐI ghi (vd `/set-realtime` khi không cắm
   *      được hook vào host). Đây là kiểu êm nhất và cũ nhất: `zPost` cũ coi nó là thành công.
   *
   * Trả về promise **luôn resolve**: payload khi lưu THẬT, `null` khi không (đã báo + đã hoàn nguyên).
   * Không ném, để chỗ gọi khỏi phải bọc `catch` — chính thói quen bọc `catch` rỗng đẻ ra lỗi này.
   */
  function zSave(url,revert){
    return fetch(url,{method:'POST'})
      .then(function(r){return r.json().catch(function(){return null;}).then(function(j){
        if(!r.ok)throw new Error('HTTP '+r.status);
        if(j&&j.ok===false)throw new Error(j.error||'refused');
        return j;
      });})
      .catch(function(e){
        try{if(typeof revert==='function')revert();}catch(_){}
        zToast(t('save.failed')+(e&&e.message?' ('+e.message+')':''),'warn');
        return null;
      });
  }
  var Z={status:null,mem:null,auto:null,checks:{}};
