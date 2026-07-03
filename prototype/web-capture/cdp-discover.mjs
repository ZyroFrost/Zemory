// Dò endpoint Projects/gizmos mà ChatGPT UI dùng (soi thật, không đoán).
const PORT = 9222;
const httpJSON = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();
const targets = await httpJSON("/json");
const page = targets.find((t) => t.type === "page" && /chatgpt\.com|openai\.com/.test(t.url));
if (!page) { console.log("NO_TAB"); process.exit(0); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let idc = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
await new Promise((r) => ws.addEventListener("open", r));
const send = (m, p = {}) => new Promise((res) => { const id = ++idc; pend.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
await send("Runtime.enable");

const seen = await ev(`[...new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(u=>/backend-api/.test(u)).map(u=>u.replace(location.origin,'').split('?')[0]))].slice(0,60)`);
console.log("== backend-api paths UI đã gọi ==");
(seen || []).forEach((u) => console.log("  " + u));

const probe = await ev(`(async()=>{
  const t=(await (await fetch('/api/auth/session')).json()).accessToken, H={Authorization:'Bearer '+t};
  const go=async u=>{try{const r=await fetch(u,{headers:H});let j=null;try{j=await r.json();}catch{}
    let n=null; if(Array.isArray(j?.items))n=j.items.length; else if(Array.isArray(j))n=j.length; else if(Array.isArray(j?.gizmos))n=j.gizmos.length;
    return {u,status:r.status,keys:j&&typeof j==='object'?Object.keys(j).slice(0,12):null,n,total:j?.total??null};}catch(e){return {u,err:String(e).slice(0,80)}}};
  const urls=[
    '/backend-api/gizmos/snorlax/sidebar',
    '/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=4',
    '/backend-api/gizmos/bootstrap',
    '/backend-api/me',
    '/backend-api/conversations?offset=0&limit=100&order=updated'
  ];
  const out=[]; for(const u of urls){out.push(await go(u)); await new Promise(r=>setTimeout(r,200));}
  return out;
})()`);
console.log("== probe endpoints ==");
console.log(JSON.stringify(probe, null, 1));
ws.close();
