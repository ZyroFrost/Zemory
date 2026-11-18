// Zemory phone bridge (plan/41 §6a): the interface is the machine's own, loaded through the link. Every same-origin
// fetch becomes a `req` on that link - Android's WebView cannot read POST bodies from an intercepted request, so the
// call is handed to the app (window.ZB) with its body, and the answer comes back through window.__zres.
(function () {
  var pend = {};
  var n = 0;
  window.__zres = function (id, status, type, b64) {
    var done = pend[id];
    if (!done) return;
    delete pend[id];
    var bin = atob(b64 || "");
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var s = status >= 200 && status <= 599 ? status : 502;
    done(new Response(s === 204 || s === 304 ? null : u, { status: s, headers: { "Content-Type": type || "application/octet-stream" } }));
  };
  function encode(body) {
    if (body == null) return Promise.resolve({ data: "", type: "" });
    if (typeof body === "string") return Promise.resolve({ data: btoa(unescape(encodeURIComponent(body))), type: "text/plain;charset=UTF-8" });
    if (body instanceof Blob)
      return new Promise(function (ok) {
        var fr = new FileReader();
        fr.onload = function () { ok({ data: String(fr.result).split(",")[1] || "", type: body.type || "application/octet-stream" }); };
        fr.readAsDataURL(body);
      });
    if (body instanceof URLSearchParams) return encode(body.toString());
    return encode(String(body));
  }
  function header(h, name) {
    if (!h) return "";
    if (typeof h.get === "function") return h.get(name) || "";
    for (var k in h) if (k.toLowerCase() === name) return h[k];
    return "";
  }
  var orig = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === "string" ? input : input.url;
    var u = new URL(url, location.href);
    if (u.origin !== location.origin) return orig(input, init);
    var method = String(init.method || (input && input.method) || "GET").toUpperCase();
    var id = "f" + ++n;
    return encode(init.body).then(function (b) {
      return new Promise(function (ok) {
        pend[id] = ok;
        window.ZB.req(id, method, u.pathname + u.search, b.data, header(init.headers, "content-type") || b.type);
      });
    });
  };
})();
