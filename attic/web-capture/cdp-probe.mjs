// Probe nhanh: tab ChatGPT trong Edge debug 9222 đã login chưa + tổng số hội thoại.
const PORT = 9222;
const httpJSON = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();
let targets;
try { targets = await httpJSON("/json"); } catch (e) { console.log("NO_PORT", e.cause?.code || e.message); process.exit(0); }
const page = targets.find((t) => t.type === "page" && /chatgpt\.com|openai\.com/.test(t.url));
if (!page) { console.log("NO_TAB (mở chatgpt.com trong cửa sổ zemory)"); process.exit(0); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let idc = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const id = ++idc; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 200)); return r.result?.result?.value; };
await send("Runtime.enable");
const sess = await ev(`fetch('/api/auth/session').then(r=>r.json()).then(j=>({token:!!j.accessToken,email:j.user?.email||null})).catch(e=>({err:String(e)}))`);
console.log("AUTH", JSON.stringify(sess));
if (sess?.token) {
  const c = await ev(`(async()=>{const t=(await (await fetch('/api/auth/session')).json()).accessToken;const j=await (await fetch('/backend-api/conversations?offset=0&limit=1',{headers:{Authorization:'Bearer '+t}})).json();return {total:j.total,sample:(j.items||[])[0]?.title||null};})()`);
  console.log("COUNT", JSON.stringify(c));
}
ws.close();
