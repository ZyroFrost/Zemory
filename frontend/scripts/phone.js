// Phones paired with this machine (plan/41): Sync › Machine-to-machine lists them and pairs a new one with a QR - the
// phone's camera reads a zemory:// link and the app opens on it, so no code is typed or copied anywhere.
var zPhone = (function () {
  function el(id) { return document.getElementById(id); }
  function esc(s) { return stdEsc(String(s == null ? '' : s)); }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function list() {
    var box = el('phoneList');
    if (!box) return;
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
  function open() {
    el('phoneQr').innerHTML = '';
    el('phonePairMsg').textContent = t('ph.howto');
    el('phonePairDlg').classList.add('on');
  }
  function close() { el('phonePairDlg').classList.remove('on'); el('phoneQr').innerHTML = ''; list(); }
  function make() {
    var name = el('phoneNameIn').value.trim().toLowerCase();
    if (!name) return;
    fetch('/phone/pair?name=' + encodeURIComponent(name), { method: 'POST' }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) { el('phonePairMsg').textContent = r.error || ''; return; }
      // the SVG comes from our own daemon (qrcode library), never from the network
      el('phoneQr').innerHTML = r.svg;
      el('phonePairMsg').textContent = t('ph.scan');
      list();
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-act]');
    var act = a && a.getAttribute('data-act');
    if (act === 'phone-pair-open') return open();
    if (act === 'phone-pair-make') return make();
    if (act === 'phone-revoke') {
      var n = a.getAttribute('data-name');
      if (!window.confirm(t('ph.revokeQ').replace('{n}', n))) return;
      fetch('/phone/revoke?name=' + encodeURIComponent(n), { method: 'POST' }).then(list);
      return;
    }
    if (e.target.closest && (e.target.closest('#phonePairClose') || e.target.id === 'phonePairDlg')) close();
    // the list fills when its tab opens
    if (e.target.closest && e.target.closest('.tabs button[data-sy="p2p"]')) list();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el('phonePairDlg') && el('phonePairDlg').classList.contains('on')) close();
    if (e.target && e.target.id === 'phoneNameIn' && e.key === 'Enter') make();
  });
  // the Sync screen may open straight on its machine-to-machine tab
  setTimeout(list, 1500);
  return { list: list };
})();
