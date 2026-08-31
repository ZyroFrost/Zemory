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
  var Z={status:null,mem:null,auto:null,checks:{}};
