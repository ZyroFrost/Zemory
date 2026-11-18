// Project chat (plan/41 §6b · §6e): the room of the open project's repo - its agents' letters on every machine, the
// person's own, and the permission prompts those agents wait on. The same room on the desktop and on the phone (the
// phone shows this interface through its link). Refreshes only while the tab is open.
var zChat = (function () {
  var repo = null, timer = null, busy = false;
  function el(id) { return document.getElementById(id); }
  function esc(s) { return stdEsc(String(s == null ? '' : s)); }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function repoOf(root) { return String(root || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop().toLowerCase(); }
  function who(a) { return a.repo === 'user' || /^phone-/.test(a.host) ? t('chat.you') : a.repo + '@' + a.host; }

  function drawAsks(list) {
    var box = el('chatAsk');
    var mine = (list || []).filter(function (q) { return q.repo === repo; });
    box.innerHTML = mine.map(function (q) {
      return '<div class="chat-q" data-q="' + esc(q.id) + '">' +
        '<div class="chat-qh">⚠ ' + esc(t('chat.need')) + ' · ' + esc(q.tool) + ' · ' + esc(when(q.askedAt)) + '</div>' +
        '<pre class="chat-qs">' + esc(q.summary) + '</pre>' +
        '<div class="chat-qa"><input class="tin" data-note placeholder="' + esc(t('chat.note')) + '" aria-label="' + esc(t('chat.note')) + '">' +
        '<button class="btn sm" data-allow="1">' + esc(t('chat.allow')) + '</button>' +
        '<button class="btn sm" data-allow="0">' + esc(t('chat.deny')) + '</button></div></div>';
    }).join('');
  }

  function drawLetters(th) {
    var list = el('chatList');
    var ls = (th && th.letters) || [];
    if (!ls.length) { list.innerHTML = '<div class="muted">' + esc(t('chat.empty')) + '</div>'; return; }
    var atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = ls.map(function (x) {
      var e = x.env, mine = e.from.repo === 'user' || /^phone-/.test(e.from.host);
      return '<div class="chat-m' + (mine ? ' mine' : '') + '">' +
        '<div class="chat-mh">' + esc(who(e.from)) + ' → ' + esc(e.to.repo + '@' + e.to.host) + ' · ' + esc(when(e.sentAt)) + '</div>' +
        '<div class="chat-mb">' + esc(e.body) + '</div></div>';
    }).join('');
    if (atBottom) list.scrollTop = list.scrollHeight;
  }

  function drawTargets(th) {
    var sel = el('chatTo');
    var hosts = (th && th.hosts) || [];
    var want = [''].concat(hosts);
    var have = Array.prototype.map.call(sel.options, function (o) { return o.value; });
    if (want.join('|') === have.join('|')) return;
    var cur = sel.value;
    sel.innerHTML = want.map(function (h) { return '<option value="' + esc(h) + '">' + esc(h ? h : t('chat.all')) + '</option>'; }).join('');
    if (want.indexOf(cur) >= 0) sel.value = cur;
  }

  function refresh() {
    if (!repo || busy) return;
    busy = true;
    Promise.all([
      zGet('/mail/thread?repo=' + encodeURIComponent(repo)).catch(function () { return null; }),
      zGet('/approvals').catch(function () { return null; }),
    ]).then(function (r) {
      if (r[0]) { drawTargets(r[0]); drawLetters(r[0]); }
      drawAsks(r[1] && r[1].pending);
    }).finally(function () { busy = false; });
  }

  function send() {
    var text = el('chatIn').value.trim();
    if (!text || !repo) return;
    var to = el('chatTo').value;
    var hosts = to ? [to] : Array.prototype.map.call(el('chatTo').options, function (o) { return o.value; }).filter(Boolean);
    el('chatIn').value = '';
    Promise.all(hosts.map(function (h) {
      return fetch('/mail/send?to=' + encodeURIComponent(h + '/' + repo), { method: 'POST', body: text }).then(function (r) { return r.json(); });
    })).then(refresh);
  }

  document.addEventListener('click', function (e) {
    if (e.target.id === 'chatGo') return send();
    var b = e.target.closest && e.target.closest('#chatAsk [data-allow]');
    if (!b) return;
    var card = b.closest('[data-q]');
    var note = card.querySelector('[data-note]').value;
    card.style.opacity = '0.5';
    fetch('/approval/answer?id=' + encodeURIComponent(card.getAttribute('data-q')) + '&allow=' + b.getAttribute('data-allow'), { method: 'POST', body: note })
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
      repo = repoOf(typeof curProjRoot === 'string' ? curProjRoot : '');
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
