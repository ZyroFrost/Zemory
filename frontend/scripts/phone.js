// Phones (plan/41), in Sync › Machine-to-machine. Two faces of one section:
//  · at a machine (PC / laptop): the phones paired with it, and "Pair a phone" - a QR the phone scans, or the same code
//    as text to paste;
//  · inside the phone app (window.ZB): the machines this phone holds, each with Open, plus Scan QR / Paste code - the
//    app has no bar of its own, machine switching lives here.
var zPhone = (function () {
  function el(id) { return document.getElementById(id); }
  function esc(s) { return stdEsc(String(s == null ? '' : s)); }
  function inApp() { return !!(window.ZB && typeof window.ZB.machines === 'function'); }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ── inside the app: the phone's own machines ──
  function listApp(box) {
    var m = {};
    try { m = JSON.parse(window.ZB.machines() || '{}'); } catch (_) {}
    var rows = (m.list || []).map(function (x) {
      var on = x.host === m.current;
      return '<div class="phone-row"><b>' + esc(x.label) + '</b><span class="muted">' + (on ? esc(t('ph.current')) : '') + '</span>' +
        (on ? '' : '<button class="btn sm" data-act="phone-app-open" data-host="' + esc(x.host) + '">' + esc(t('ph.open')) + '</button>') + '</div>';
    }).join('');
    box.innerHTML = '<div class="phone-mine"><div class="muted phone-none">' + esc(t('ph.mine')) + '</div>' + rows +
      '<div class="phone-mine-acts"><button class="btn sm" data-act="phone-app-scan">📷 ' + esc(t('ph.scanBtn')) + '</button>' +
      '<button class="btn sm" data-act="phone-app-paste">⌨ ' + esc(t('ph.pasteBtn')) + '</button></div></div>';
  }

  // ── at a machine: the phones paired with it ──
  function list() {
    var box = el('phoneList');
    if (!box) return;
    var pairBtn = document.querySelector('[data-act="phone-pair-open"]');
    if (inApp()) { if (pairBtn) pairBtn.style.display = 'none'; listApp(box); return; }
    zGet('/phone/list').then(function (r) {
      var ph = (r && r.phones) || [];
      box.innerHTML = ph.length
        ? ph.map(function (x) {
            return '<div class="phone-row"><b>' + esc(x.name) + '</b><span class="muted">' + esc(t('ph.paired')) + ' ' + esc(when(x.createdAt)) + '</span>' +
              '<button class="btn sm" data-act="phone-revoke" data-name="' + esc(x.name) + '">' + esc(t('ph.revoke')) + '</button></div>';
          }).join('')
        : '<div class="muted phone-none">' + esc(t('ph.none')) + '</div>';
    }).catch(function () {});
  }

  // one code per opening of the dialog: QR and text show the SAME code; pairing again would cut the phone it was made for
  var made = null;
  function open() {
    made = null;
    el('phoneQr').innerHTML = '';
    el('phoneCodeBox').classList.remove('on');
    el('phonePairMsg').textContent = t('ph.pick');
    el('phonePairDlg').classList.add('on');
  }
  function close() { el('phonePairDlg').classList.remove('on'); el('phoneQr').innerHTML = ''; el('phoneCode').value = ''; made = null; list(); }
  function make() {
    if (made) return Promise.resolve(made);
    var name = el('phoneNameIn').value.trim().toLowerCase();
    if (!name) return Promise.reject(new Error(''));
    return fetch('/phone/pair?name=' + encodeURIComponent(name), { method: 'POST' }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) { el('phonePairMsg').textContent = r.error || ''; throw new Error(r.error || ''); }
      made = r;
      list();
      return r;
    });
  }
  function showQr() {
    make().then(function (r) {
      // the SVG comes from our own daemon (qrcode library), never from the network
      el('phoneQr').innerHTML = r.svg;
      el('phoneCodeBox').classList.remove('on');
      el('phonePairMsg').textContent = t('ph.scan');
    }).catch(function () {});
  }
  function showText() {
    make().then(function (r) {
      el('phoneQr').innerHTML = '';
      el('phoneCode').value = r.code;
      el('phoneCodeBox').classList.add('on');
      el('phonePairMsg').textContent = t('ph.textHow');
    }).catch(function () {});
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-act]');
    var act = a && a.getAttribute('data-act');
    if (act === 'phone-pair-open') return open();
    if (act === 'phone-pair-qr') return showQr();
    if (act === 'phone-pair-text') return showText();
    if (act === 'phone-copy') {
      var ta = el('phoneCode');
      ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch (_) { document.execCommand('copy'); }
      a.textContent = t('ph.copied');
      return;
    }
    if (act === 'phone-app-open') return window.ZB.open(a.getAttribute('data-host'));
    if (act === 'phone-app-scan') return window.ZB.scan();
    if (act === 'phone-app-paste') return window.ZB.paste();
    if (act === 'phone-revoke') {
      var n = a.getAttribute('data-name');
      zConfirm({ title: t('ph.revoke'), body: t('ph.revokeQ').replace('{n}', n), okLabel: t('ph.revoke'), danger: true,
        onOk: function () { fetch('/phone/revoke?name=' + encodeURIComponent(n), { method: 'POST' }).then(list); } });
      return;
    }
    if (e.target.closest && (e.target.closest('#phonePairClose') || e.target.id === 'phonePairDlg')) close();
    // the list fills when its tab opens
    if (e.target.closest && e.target.closest('.tabs button[data-sy="p2p"]')) list();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el('phonePairDlg') && el('phonePairDlg').classList.contains('on')) close();
  });
  // the Sync screen may open straight on its machine-to-machine tab
  setTimeout(list, 1500);
  return { list: list };
})();
