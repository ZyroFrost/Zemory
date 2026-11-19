// Project chat (plan/41 §6b · §6e): the open project's agent SESSION, whole - the person's prompts and the agent's
// answers, as Recall › Sessions shows them (one message component, msgBlock) - with a spinner while it works, the
// permission prompts it waits on, and a line that writes into that very session (a letter its hooks wake it with).
// The same tab on the desktop and on the phone. Refreshes only while the tab is open.
var zChat = (function () {
  var repo = null, sess = null, list = [], timer = null, busy = false, lastSig = '';
  function el(id) { return document.getElementById(id); }
  function esc(s) { return stdEsc(String(s == null ? '' : s)); }
  function repoOf(root) { return String(root || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop().toLowerCase(); }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function cur() { return list.filter(function (s) { return s.sessionId === sess; })[0] || null; }

  function drawSessions() {
    var sel = el('chatSess');
    var opts = list.map(function (s) {
      var name = (s.title && String(s.title).trim()) || t('sess.untitled');
      return '<option value="' + esc(s.sessionId) + '">' + (s.busy ? '● ' : '') + esc(name) + (s.host ? ' · ' + esc(s.host) : '') + '</option>';
    }).join('');
    if (sel.innerHTML !== opts) { sel.innerHTML = opts; }
    if (sess) sel.value = sess;
    var c = cur();
    el('chatBusy').classList.toggle('on', !!(c && c.busy));
  }

  function drawAsks(q) {
    var mine = (q || []).filter(function (x) { return x.repo === repo; });
    el('chatAsk').innerHTML = mine.map(function (x) {
      return '<div class="chat-q" data-q="' + esc(x.id) + '">' +
        '<div class="chat-qh">⚠ ' + esc(t('chat.need')) + ' · ' + esc(x.tool) + ' · ' + esc(when(x.askedAt)) + '</div>' +
        '<pre class="chat-qs">' + esc(x.summary) + '</pre>' +
        '<div class="chat-qa"><input class="tin" data-note placeholder="' + esc(t('chat.note')) + '" aria-label="' + esc(t('chat.note')) + '">' +
        '<button class="btn sm" data-allow="1">' + esc(t('chat.allow')) + '</button>' +
        '<button class="btn sm" data-allow="0">' + esc(t('chat.deny')) + '</button></div></div>';
    }).join('');
  }

  function drawThread(s) {
    var box = el('chatList');
    var ms = (s && s.messages) || [];
    if (!ms.length) { box.innerHTML = '<div class="muted">' + esc(t('chat.empty')) + '</div>'; return; }
    var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = '<div class="thread">' + ms.map(function (m) { return msgBlock(m, 0); }).join('') + '</div>';
    if (atBottom || !box.dataset.seen) box.scrollTop = box.scrollHeight;
    box.dataset.seen = '1';
  }

  function refresh() {
    if (!repo || busy) return;
    busy = true;
    Promise.all([
      zGet('/chat/sessions?repo=' + encodeURIComponent(repo)).catch(function () { return null; }),
      zGet('/approvals').catch(function () { return null; }),
    ]).then(function (r) {
      list = (r[0] && r[0].sessions) || [];
      if (!sess || !cur()) sess = list.length ? list[0].sessionId : null;
      drawSessions();
      drawAsks(r[1] && r[1].pending);
      var c = cur();
      if (!c) { drawThread(null); return; }
      // the thread is fetched again only when the session moved on (a new message, or the spinner state changed)
      var sig = c.sessionId + '|' + c.messages + '|' + c.endedAt + '|' + c.busy;
      if (sig === lastSig) return;
      lastSig = sig;
      // the last part only: the full session is Recall › Sessions' job
      return zGet('/memory-session?id=' + encodeURIComponent(c.sessionId) + '&tail=120').then(drawThread);
    }).catch(function () {}).finally(function () { busy = false; });
  }

  function send() {
    var text = el('chatIn').value.trim();
    var c = cur();
    if (!text || !c) return;
    el('chatIn').value = '';
    // into THIS session: its machine and repo (the session's hooks wake it on the letter)
    var host = c.host || '';
    fetch('/mail/send?to=' + encodeURIComponent(host + '/' + repo), { method: 'POST', body: text })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok && typeof zToast === 'function') zToast(r.error || ''); lastSig = ''; refresh(); });
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'chatSess') { sess = e.target.value; lastSig = ''; el('chatList').dataset.seen = ''; refresh(); }
  });
  document.addEventListener('click', function (e) {
    if (e.target.id === 'chatGo') return send();
    var b = e.target.closest && e.target.closest('#chatAsk [data-allow]');
    if (!b) return;
    var card = b.closest('[data-q]');
    card.style.opacity = '0.5';
    fetch('/approval/answer?id=' + encodeURIComponent(card.getAttribute('data-q')) + '&allow=' + b.getAttribute('data-allow'), { method: 'POST', body: card.querySelector('[data-note]').value })
      .then(refresh);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.id === 'chatIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  return {
    /** The project opened (or the tab switched): `on` = the Chat tab is showing. */
    show: function (on) {
      clearInterval(timer);
      timer = null;
      var r = repoOf(typeof curProjRoot === 'string' ? curProjRoot : '');
      if (r !== repo) { repo = r; sess = null; list = []; lastSig = ''; el('chatList').dataset.seen = ''; }
      if (!on || !repo) return;
      refresh();
      timer = setInterval(function () {
        var d = el('projDetail');
        if (d && d.style.display !== 'none' && el('pjChat').classList.contains('on')) refresh();
        else { clearInterval(timer); timer = null; }
      }, 4000);
    },
  };
})();
