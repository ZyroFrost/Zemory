// Điều khiển cửa sổ Edge (debug 9222) mà BẠN đã tự đăng nhập ChatGPT,
// để kéo toàn bộ lịch sử về. KHÔNG đụng cookie máy — chạy trong tab bạn đã login.
import { writeFileSync } from "node:fs";

const PORT = 9222;
const OUT = process.argv[2] || "chatgpt-conversations.json";
const httpJSON = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await httpJSON("/json");
const page = targets.find((t) => t.type === "page" && /chatgpt\.com|openai\.com/.test(t.url));
if (!page) { console.error("Không thấy tab ChatGPT trong cửa sổ zemory."); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let idc = 0; const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise((r) => ws.addEventListener("open", r));
const send = (method, params = {}) =>
  new Promise((res) => { const id = ++idc; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evalExpr = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  const d = r.result;
  if (d?.exceptionDetails) throw new Error(JSON.stringify(d.exceptionDetails).slice(0, 300));
  return d?.result?.value;
};
await send("Runtime.enable");

// 1) kiểm tra đã đăng nhập chưa
const sess = await evalExpr(
  `fetch('/api/auth/session').then(r=>r.json()).then(j=>({token:!!j.accessToken,email:j.user?.email||null})).catch(e=>({err:String(e)}))`
);
console.log("auth:", JSON.stringify(sess));
if (!sess?.token) { console.error("CHƯA login trong cửa sổ zemory — đăng nhập ChatGPT ở cửa sổ đó rồi chạy lại."); process.exit(2); }

// 2) liệt kê toàn bộ id (paged, chạy trong page)
const listed = await evalExpr(`(async()=>{
  const t=(await (await fetch('/api/auth/session')).json()).accessToken, H={Authorization:'Bearer '+t};
  const ids=[]; let off=0,total=Infinity;
  while(off<total){ const j=await (await fetch('/backend-api/conversations?offset='+off+'&limit=100&order=updated',{headers:H})).json();
    total=j.total??j.items.length; (j.items||[]).forEach(i=>ids.push({id:i.id,title:i.title})); off+=(j.items||[]).length;
    if(!(j.items||[]).length)break; await new Promise(r=>setTimeout(r,300)); }
  return {ids,total};
})()`);
console.log(`list: ${listed.ids.length}/${listed.total} hội thoại (từ list API)`);

// 3) tải từng hội thoại (mỗi eval 1 cái — payload nhỏ, ổn định)
const out = [], failed = [];
for (let i = 0; i < listed.ids.length; i++) {
  try {
    const c = await evalExpr(`(async()=>{ const t=(await (await fetch('/api/auth/session')).json()).accessToken;
      const r=await fetch('/backend-api/conversation/${listed.ids[i].id}',{headers:{Authorization:'Bearer '+t}});
      if(!r.ok) throw new Error(r.status); return r.json(); })()`);
    out.push(c);
  } catch (e) { failed.push(listed.ids[i].id); }
  if ((i + 1) % 10 === 0 || i === listed.ids.length - 1) console.log(`  tải ${i + 1}/${listed.ids.length} (lỗi ${failed.length})`);
  await nap(300);
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`XONG: ${out.length} hội thoại → ${OUT} (lỗi ${failed.length})`);
ws.close();
