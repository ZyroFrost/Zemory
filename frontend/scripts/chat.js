// Project chat (plan/41 §6b · §6e): the open project's agent SESSION, whole - the person's prompts and the agent's
// answers, as Recall › Sessions shows them (one message component, msgBlock) - with a spinner while it works, the
// permission prompts it waits on, and a line that writes into that very session (a letter its hooks wake it with).
// The same tab on the desktop and on the phone. Refreshes only while the tab is open.
var zChat = (function () {
  var repo = null, sess = null, list = [], sent = [], thread = null, timer = null, busy = false, lastSig = '', lastHtml = '';
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
  // until an answer came back the tab says it is loading, never "nothing here" (over the phone's link the first answer
  // can take seconds, and a failed call is retried on the next tick)
  function loading() { lastHtml = ''; el('chatList').innerHTML = '<div class="muted">' + esc(t('chat.loading')) + '</div>'; }

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

  // The thread as a chat, the way the agent's terminal shows it: what the person wrote and the agent's answers in full,
  // each tool call one short line with its result folded under it, a host notice one dim line. Recall › Sessions keeps
  // the raw record; this is the same messages, drawn for reading.
  var SYS_RE = /^\s*(<task-notification>|<system-reminder>|<local-command|<command-name>|Stop hook feedback:|\[SYSTEM NOTIFICATION)/;
  function toolLine(name, body) {
    var hint = '';
    try {
      var o = JSON.parse(body);
      hint = o.description || o.command || o.file_path || o.pattern || o.query || o.prompt || o.url || '';
    } catch (e) { hint = body; }
    hint = String(hint).replace(/\s+/g, ' ').trim();
    if (hint.length > 140) hint = hint.slice(0, 140) + '…';
    return '🔧 ' + (name || '?') + (hint ? ' — ' + hint : '');
  }
  function steps(ms) {
    var out = [];
    ms.forEach(function (m) {
      var c = String(m.content || '');
      if (m.role === 'user' && SYS_RE.test(c)) { out.push({ k: 'sys', body: c }); return; }
      c.split(/\n(?=\[tool_use:|\[tool_result\])/).forEach(function (seg) {
        var mu = seg.match(/^\[tool_use:([^\]]*)\]\s*([\s\S]*)$/);
        if (mu) { out.push({ k: 'use', name: mu[1], body: mu[2] }); return; }
        var mr = seg.match(/^\[tool_result\]\s*([\s\S]*)$/);
        if (mr) { out.push({ k: 'res', body: mr[1] }); return; }
        if (seg.trim()) out.push({ k: 'msg', m: { role: m.role, content: seg, timestamp: m.timestamp, atts: m.atts } });
      });
    });
    return out;
  }
  // the person's words and the agent's answers: the one message renderer of Recall (msgBlock), unchanged
  function textMsg(m) { return msgBlock(m, 0); }
  function drawSteps(ms) {
    var h = '', run = '';
    function flush() { if (run) { h += '<div class="chat-steps">' + run + '</div>'; run = ''; } }
    steps(ms).forEach(function (x) {
      if (x.k === 'msg') { flush(); h += textMsg(x.m); return; }
      if (x.k === 'use') run += fold(toolLine(x.name, x.body), x.body);
      else if (x.k === 'res') run += fold('⎿ ' + t('chat.result') + ' · ' + foldSize(x.body.length), x.body);
      else run += fold('ⓘ ' + t('chat.sys'), x.body);
    });
    flush();
    return h;
  }

  function drawThread(s) {
    thread = s;
    var box = el('chatList');
    var ms = (s && s.messages) || [];
    // what the person wrote that the session's record does not have yet (it lands there when the turn ends)
    var last = ms.length ? Date.parse(ms[ms.length - 1].timestamp || '') || 0 : 0;
    var c = cur();
    var waiting = sent.filter(function (x) { return Date.parse(x.sentAt) > last && (!c || !c.host || String(x.to).toLowerCase() === String(c.host).toLowerCase()); });
    if (!ms.length && !waiting.length) { lastHtml = ''; box.innerHTML = '<div class="muted">' + esc(t('chat.empty')) + '</div>'; return; }
    var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    var html = '<div class="thread">' + drawSteps(ms) +
      waiting.map(function (x) {
        return '<div class="msg chat-wait"><div class="who"><span class="tag user">' + esc(t('chat.you')) + '</span> · ' + esc(when(x.sentAt)) + ' · ' + esc(t('chat.waiting')) + '</div><div class="body">' + esc(x.body) + '</div></div>';
      }).join('') + '</div>';
    // redrawn every tick: an unchanged thread is left alone, and a fold the person opened stays open across a redraw
    if (html === lastHtml) return;
    var open = [].map.call(box.querySelectorAll('details'), function (d) { return d.open; });
    box.innerHTML = html;
    lastHtml = html;
    [].forEach.call(box.querySelectorAll('details'), function (d, i) { if (open[i]) d.open = true; });
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
      // no answer: keep what is on screen (the loading line, or the last thread) - an empty list is only an answer
      if (!r[0]) return;
      list = r[0].sessions || [];
      sent = (r[0] && r[0].sent) || [];
      if (!sess || !cur()) sess = list.length ? list[0].sessionId : null;
      drawSessions();
      drawAsks(r[1] && r[1].pending);
      var c = cur();
      if (!c) { drawThread(null); return; }
      // the thread is fetched again only when the session moved on (a new message, or the spinner state changed)
      var sig = c.sessionId + '|' + c.messages + '|' + c.endedAt + '|' + c.busy;
      if (sig === lastSig) {
        // the session did not move, but a letter of the person may have: redraw from what we hold
        if (thread) drawThread(thread);
        return;
      }
      // another session than the one on screen: say so while its messages come
      if (!thread || thread.sessionId !== c.sessionId) loading();
      // the last part only: the full session is Recall › Sessions' job; the signature sticks only once it arrived
      return zGet('/memory-session?id=' + encodeURIComponent(c.sessionId) + '&tail=120').then(function (s) {
        if (sess !== c.sessionId) return;
        lastSig = sig;
        drawThread(s);
      });
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
      if (r !== repo) { repo = r; sess = null; list = []; thread = null; lastSig = ''; el('chatList').dataset.seen = ''; loading(); }
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
