// Browser-connector: capture web-chat (ChatGPT today) into the memory WITHOUT
// an OAuth/API that doesn't exist and WITHOUT harvesting cookies. It opens a
// dedicated browser window (persistent profile under ~/.zemory/browser/<platform>)
// with a remote-debugging port; the USER logs in there once (password never
// touches zemory), then this drives that logged-in tab over CDP to read the
// site's own conversation API. Pulled conversations are written to the platform
// import folder and ingested by the normal scan() → chatgptAdapter (origin=web).
//
// Runs the fetches INSIDE the real browser tab (via Runtime.evaluate), so they
// carry the live session and pass Cloudflare — a plain Node fetch is blocked.

import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./db.js";
import { type ScanReport, restampAccount, scan, stampAccount } from "./ingest.js";
import { isExcluded } from "./scope.js";
import { WEB_PLATFORMS, accountKey, accountsOf, isEmail, platformsInUse, pullableAccountsOf } from "./webslots.js";
import { findBorrowSource, jarHasSession } from "./borrowcookies.js";
import { getScopeExclude, getWebAuth, setWebAuth, setWebPull } from "../config/settings.js";
import { daemonLog } from "../logging/daemon-log.js";

const g = globalThis as unknown as { fetch: (u: string, o?: unknown) => Promise<any>; WebSocket: any };

interface Platform {
  key: string;
  url: string;
  source: string;
  /** JS (run in-page) returning {token, email}. */
  authExpr: string;
  /** JS (run in-page) trả MẢNG CHUỖI id cho MỌI hội thoại (đã phân trang).
   *  (Comment cũ ghi "[{id}]" là SAI — đã làm provider claude fail 2/2 vì tin theo nó.) */
  listExpr: string;
  /** JS (run in-page) returning {projectId: projectName} so pulled conversations can
   *  be labelled with their Project ("folder"). On ChatGPT it ALSO drives per-project
   *  enumeration (see projectConvsExpr); on claude.ai it is labels only — measured
   *  2026-07-30, its flat list already contains project chats. Optional per platform. */
  projectsExpr?: string;
  /** JS template (run in-page) returning {ids, cursor} for ONE page of a
   *  Project's conversations. Node drives cursor paging. Optional per platform. */
  projectConvsExpr?: (gizmoId: string, cursor: string | null) => string;
  /** JS template (run in-page) returning one full conversation by id. */
  convExpr: (id: string) => string;
  /** Session-id prefix the platform's ADAPTER produces. Resume matches rows already
   *  in the memory against `<sessionPrefix><conversation id>`, so a wrong value
   *  silently disables resume (it re-pulls everything, every run). It was hardcoded
   *  `chatgpt-` here, which is exactly what happened to claude. Kept honest by
   *  scanweb-platforms.test.mjs: it runs each adapter and compares the real ids. */
  sessionPrefix: string;
  /** Which field carries the conversation's Project ("folder") key on this platform
   *  (ChatGPT: `gizmo_id` · claude.ai: `project_uuid`). Used with the projects map to
   *  stamp a readable `project_root`. */
  projectKeyOf?: (conv: unknown) => string | undefined;
  /** Tabs that belong to THIS platform. Must never match another platform's site: the
   *  in-page eval runs against whatever tab we attach to, so a loose pattern fires the
   *  claude API at chatgpt.com — HTTP 404 — which reads as "you are signed out".
   *  Measured 2026-07-30: that is exactly what produced a bogus login prompt (and a
   *  real Google password page) on an account that was signed in the whole time. */
  tabRe: RegExp;
  /** Debug port for this platform's browser window. ONE PORT PER PLATFORM: two windows
   *  cannot bind the same port, so the second one silently comes up with no CDP while
   *  the first one answers — that is how a run ends up driving the wrong site. */
  port: number;
  /** Nền **CHỈ NỐI ĐƯỢC** — đăng nhập/kiểm phiên chạy đủ, nhưng đường KÉO hội thoại chưa mở.
   *
   *  Vì sao có hạng này (user chỉ ra 2026-09-10: *"chỉ nối vào endpoint để nó nối vào mà, đâu cần có data"*):
   *  hai việc độc lập nhau. **Nối** cần đúng ba thứ — URL, một cửa sổ, và một phép kiểm "đã đăng nhập chưa,
   *  là ai" — mà phép kiểm đó đọc DOM/meta của chính trang, không cần biết API nội bộ. **Kéo** thì cần
   *  `listExpr`/`convExpr` thật, và viết chúng khi chưa có phiên đăng nhập để dò thì chỉ là phỏng đoán
   *  (`plan/07 §1` cấm). Nên nền mới vào ở hạng này: đăng nhập được ngay, kéo mở sau khi dò.
   *
   *  Hệ quả bắt buộc, để bề mặt KHÔNG nói dối: lượt quét dừng NGAY sau khi xác thực và trả `login-only`
   *  — không phải `done · 0 hội thoại` (đọc thành "đã kéo, không có gì" là sai sự thật). Nền hạng này cũng
   *  RA KHỎI vòng tự kéo của scheduler: mở cửa sổ mỗi 20 phút cho một nền chưa kéo được là phiền vô ích. */
  loginOnly?: true;
  /** LANE PHỤ trên CÙNG một trang. claude.ai chở hai thứ khác nhau: chat thường
   *  (`chat_conversations`) và phiên Cowork (`/v1/code/sessions`). Đó là hai bộ sưu tập,
   *  KHÔNG phải hai nền — nên chúng dùng chung cửa sổ, chung cổng, chung phiên đăng nhập;
   *  tách thành `PLATFORMS` thứ ba thì `tabRe` đụng nhau và mở thừa một cửa sổ cùng site. */
  sub?: {
    key: string;
    source: string;
    sessionPrefix: string;
    /** Thư mục con trong `imports/` — adapter của lane phụ nhặt file ở đó. */
    importKey: string;
    listExpr: string;
    convExpr: (id: string) => string;
  };
}

// Enumerate LOOSE conversation ids (chats not filed under a Project). Defensive:
// always resolves to an ARRAY (never undefined/throws) so a transient blip
// degrades to a short list the caller retries, instead of crashing on `.length`.
// Pages until a short/empty page — the `total` field is unreliable and can
// under-report, stopping enumeration early (the old cause of missing chats).
// Project chats are NOT in this list; they come from a separate, Node-driven
// pass (projectsExpr + projectConvsExpr) so each in-page eval stays short.
const CHATGPT_LIST = `(async()=>{
  try{
    const s=await (await fetch('/api/auth/session')).json(); const t=s&&s.accessToken;
    if(!t) return [];
    const H={Authorization:'Bearer '+t};
    const ids=[]; let off=0;
    for(let p=0;p<300;p++){
      const r=await fetch('/backend-api/conversations?offset='+off+'&limit=100&order=updated',{headers:H});
      if(!r.ok) break;
      const j=await r.json(); const items=(j&&j.items)||[];
      for(const c of items){ if(c&&c.id) ids.push({id:c.id, updated:c.update_time}); }
      off+=items.length;
      if(items.length<100) break;
      await new Promise(res=>setTimeout(res,200));
    }
    return ids;
  }catch(e){ return []; }
})()`;

// One page of a Project's conversation ids, cursor-paged (a `limit` param 422s).
// Node drives the paging (see scanWeb) so each eval is short — a socket blip
// costs one page (reconnect + retry), not the whole enumeration. Always resolves
// to {ids:[], cursor:string|null}.
const chatgptProjectConvs = (gizmoId: string, cursor: string | null): string => {
  const path =
    "/backend-api/gizmos/" + gizmoId + "/conversations" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
  return (
    "(async()=>{try{" +
    "var t=(await (await fetch('/api/auth/session')).json()).accessToken; var H={Authorization:'Bearer '+t};" +
    "var r=await fetch(" + JSON.stringify(path) + ",{headers:H}); if(!r.ok) return {ids:[],cursor:null};" +
    "var j=await r.json(); var items=(j&&j.items)||[];" +
    "return {ids:items.map(function(i){return i&&i.id;}).filter(Boolean), cursor:(j&&j.cursor)||null};" +
    "}catch(e){return {ids:[],cursor:null};}})()"
  );
};

// Map every Project (gizmo) id → its display name, so pulled conversations can be
// labelled with the Project ("folder") they live in. Same cursor paging as the
// enumeration; always resolves to an object (empty on any blip = no labels).
const CHATGPT_PROJECTS = `(async()=>{
  try{
    const s=await (await fetch('/api/auth/session')).json(); const t=s&&s.accessToken;
    if(!t) return {};
    const H={Authorization:'Bearer '+t};
    const map={}; let cur=null;
    for(let p=0;p<100;p++){
      const url='/backend-api/gizmos/snorlax/sidebar?conversations_per_gizmo=1'+(cur?('&cursor='+encodeURIComponent(cur)):'');
      const r=await fetch(url,{headers:H});
      if(!r.ok) break;
      const j=await r.json();
      for(const it of ((j&&j.items)||[])){ const g=it&&it.gizmo&&it.gizmo.gizmo; if(g&&g.id) map[g.id]=(g.display&&g.display.name)||g.id; }
      cur=j&&j.cursor; if(!cur) break;
      await new Promise(res=>setTimeout(res,200));
    }
    return map;
  }catch(e){ return {}; }
})()`;

// ── Claude.ai ────────────────────────────────────────────────────────────────
// Khác ChatGPT ở phần XÁC THỰC: claude.ai dùng COOKIE phiên, không có bearer token
// như /api/auth/session của ChatGPT. Chạy in-page nên cookie tự đi kèm — không cần
// (và không được) đọc/lưu cookie ở phía Node. Mọi lời gọi đều phải kèm org id.
//
// ORG PHẢI CHỌN THEO CAPABILITY, KHÔNG theo thứ tự mảng. Đo 2026-07-30: tài khoản
// này có HAI org — `fd5ef0f8…` caps ['chat','claude_max'] (nơi chứa hội thoại) và
// `446e19e3…` caps ['api','api_individual'] (không có hội thoại nào). `o[0]` tình
// cờ trả đúng org trên máy này; đúng nhờ may thì máy sau là sai, và biểu hiện sẽ
// là "0 hội thoại" — trông y như chưa đăng nhập.
// Đường lui: nếu KHÔNG org nào khai `capabilities` (shape API khác/cũ) thì mới lấy
// phần tử đầu; có `capabilities` mà không org nào có 'chat' thì báo LỖI RÕ, không
// lặng lẽ dùng org sai rồi đổ vỏ cho "chưa đăng nhập".
// 🔴 MỘT TÀI KHOẢN CÓ THỂ CÓ NHIỀU ORG 'chat' (đo 2026-08-28 trên tài khoản công ty): `Global`
// (caps chat·raven, **0 hội thoại**) đứng TRƯỚC `tai.khoan@congty.example's Organization` (nơi có
// hội thoại). Bản cũ lấy org chat ĐẦU TIÊN ⇒ liệt kê ra rỗng ⇒ "conversation list not ready ×5"
// ⇒ báo `no-tab` — trong khi người dùng vừa đăng nhập xong và tab đang mở ngay đó. Cùng họ với
// lỗi `o[0]` ở trên, chỉ dịch đi một bậc: chọn theo capability đúng, nhưng vẫn chọn MỘT.
// Nay: `orgs` = MỌI org có 'chat'; `org` = cái đầu (tương thích chỗ chỉ cần một); sổ `_bag`
// (globalThis, sống theo tab) ghi "hội thoại X thuộc org nào" để lời gọi chi tiết đi đúng org.
const CLAUDE_ORG_JS =
  "const _r=await fetch('/api/organizations');" +
  "if(!_r.ok) return _no('HTTP '+_r.status);" +
  "const _o=await _r.json(); const _l=Array.isArray(_o)?_o:[];" +
  "const _caps=_l.some(function(x){return x&&Array.isArray(x.capabilities);});" +
  "const _chat=_l.filter(function(x){return x&&x.uuid&&Array.isArray(x.capabilities)&&x.capabilities.indexOf('chat')>=0;});" +
  "const _all=_chat.length?_chat:(_caps?[]:(_l[0]&&_l[0].uuid?[_l[0]]:[]));" +
  "if(!_all.length) return _no(_caps?'no organization with the chat capability':'no organization');" +
  "const orgs=_all.map(function(x){return x.uuid;}); const _org=_all[0]; const org=_org.uuid;" +
  "const _bag=(globalThis.__zmOrgOf=globalThis.__zmOrgOf||{});" +
  "const _cands=function(k){return [_bag[k]].concat(orgs).filter(function(x,i,a){return x&&a.indexOf(x)===i;});};";

const CLAUDE_AUTH = `(async()=>{const _no=function(m){return {token:false,err:m};};
  try{
    ${CLAUDE_ORG_JS}
    // TÀI KHOẢN (email), KHÔNG phải TÊN ORG. Bản cũ trả \`_org.name\` nên hàng nguồn ghi
    // "tai.khoan@canhan.example's Organization" / "Global" — user 2026-08-28: *"ko ghi nguồn với
    // tên tk"*. Thử hai endpoint account của claude.ai; không có thì rơi về tên org và NÓI RÕ
    // đó là org (tiền tố), không giả dạng email.
    let _who=null;
    for (const _u of ['/api/account','/api/bootstrap','/api/auth/current_account']) {
      try { const _a=await fetch(_u); if(!_a.ok) continue; const _j=await _a.json();
        // Dò SÂU: email nằm ở nhiều hình dạng tuỳ endpoint (email_address ·
        // account.email_address · data.email…). Quét cây JSON tìm khoá nào chứa email —
        // rẻ (payload nhỏ) và không phải đoán trước shape của từng endpoint.
        // (KHÔNG dùng dấu backtick trong chú thích ở đây: cả khối này nằm TRONG một template
        //  literal, một backtick lẻ là kết thúc chuỗi — đã dính đúng lỗi đó lượt trước.)
        const _seek=function(o,d){ if(!o||d>4) return null;
          if(typeof o==='string') return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(o)?o:null;
          if(typeof o!=='object') return null;
          for(const _k of Object.keys(o)){ if(!/mail/i.test(_k)) continue; const _v=_seek(o[_k],d+1); if(_v) return _v; }
          for(const _k of Object.keys(o)){ const _v=_seek(o[_k],d+1); if(_v) return _v; }
          return null; };
        _who=_seek(_j,0); if(_who) break; } catch(_e){}
    }
    // Đường lùi: EMAIL ĐÃ NẰM TRONG tên org của tài khoản cá nhân — Claude đặt
    // "<email>'s Organization". Rút ra thay vì bày cả câu đó lên hàng nguồn.
    if(!_who && _org.name){ const _m=/^([^\\s@]+@[^\\s@]+\\.[^\\s@]+)/.exec(String(_org.name)); if(_m) _who=_m[1]; }
    return {token:true, email:(_who||(_org.name?('org: '+_org.name):null))};
  }catch(e){ return {token:false, err:String(e)}; }
})()`;

// Liệt kê id hội thoại. Phân trang bằng offset/limit; dừng khi trang ngắn — KHÔNG tin
// trường tổng (bài học từ ChatGPT: total báo thiếu làm dừng sớm, mất chat).
//
// ĐO 2026-07-30 — KHÁC ChatGPT ở điểm then chốt: danh sách này CHỞ LUÔN chat nằm
// trong Project. Kiểm hai đường: (a) item có `project_uuid`/`project:{name}` không
// null; (b) so TẬP id với `…/projects/<pid>/conversations` → mọi id của project đều
// nằm trong danh sách này (`projectIdsMissingFromLoose: []`). Nên claude KHÔNG cần
// `projectConvsExpr` như ChatGPT (ở ChatGPT chat trong Project thật sự nằm ngoài
// danh sách phẳng). Đừng "vá" bằng cách thêm vòng enumerate project — nó chỉ lấy về
// đúng những id đã có.
const CLAUDE_LIST = `(async()=>{const _no=function(){return [];};
  try{
    ${CLAUDE_ORG_JS}
    const ids=[];
    for(const _g of orgs){ let off=0;
    for(let p=0;p<300;p++){
      const r = await fetch('/api/organizations/'+_g+'/chat_conversations?limit=100&offset='+off);
      if(!r.ok) break;
      const j = await r.json();
      const items = Array.isArray(j) ? j : ((j && j.data) || []);
      for(const c of items){ if(c && c.uuid){ ids.push({id:c.uuid, updated:c.updated_at}); _bag[c.uuid]=_g; } }
      off += items.length;
      if(items.length < 100) break;
      await new Promise(res=>setTimeout(res,200));
    } }
    // Trả MẢNG CHUỖI, không phải mảng object — hợp đồng THẬT là mảng chuỗi (xem
    // CHATGPT_LIST: ids.push(c.id)), dù comment của interface Platform ghi ngược lại.
    // Bản đầu tôi tin comment nên URL thành .../[object Object] và HTTP 400, fail 2/2.
    return ids;
  }catch(e){ return []; }
})()`;

// Map project uuid → tên, để `project_root` là TÊN thay vì uuid thô. Cần thiết vì
// payload CHI TIẾT của một hội thoại (`?tree=True…`) chỉ có `project_uuid`, còn
// `project` thì NULL — đo 2026-07-30; danh sách phẳng thì lại có `project:{name}`.
// Adapter đọc từ payload chi tiết, nên không có map này thì nhãn là uuid.
// Phân trang: `?limit=100` đã kiểm (200); `offset` CHƯA kiểm được (tài khoản đo chỉ
// có 1 project). Guard `!fresh` xử ca server bỏ qua offset — trả lại cùng trang thì
// không có key mới ⇒ dừng, không quay vô hạn.
const CLAUDE_PROJECTS = `(async()=>{const _no=function(){return {};};
  try{
    ${CLAUDE_ORG_JS}
    const map={};
    for(const _g of orgs){ let off=0;
    for(let p=0;p<50;p++){
      const r = await fetch('/api/organizations/'+_g+'/projects?limit=100&offset='+off);
      if(!r.ok) break;
      const j = await r.json();
      const items = Array.isArray(j) ? j : ((j && j.data) || []);
      let fresh=0;
      for(const it of items){ if(it && it.uuid && !(it.uuid in map)){ map[it.uuid]=(it.name||it.uuid); fresh++; } }
      off += items.length;
      if(items.length < 100 || !fresh) break;
      await new Promise(res=>setTimeout(res,200));
    } }
    return map;
  }catch(e){ return {}; }
})()`;

// ── Cowork (claude.ai) ───────────────────────────────────────────────────────
// Phiên Cowork KHÔNG nằm trong `chat_conversations`; nó ở `/v1/code/sessions` — một
// namespace hoàn toàn khác. Đo 2026-07-31: sáu đường đoán dưới `/api/organizations/…`
// đều 404; tìm ra bằng cách cắm móc vào `fetch` của trang rồi mở thật một phiên.
//
// NĂM HEADER NÀY LÀ BẮT BUỘC — thiếu bất kỳ cái nào là **400**, kể cả khi cookie phiên
// hoàn toàn hợp lệ. Đó là lý do lần gọi trần đầu tiên của tôi thất bại và suýt kết luận
// nhầm là "không đọc được".
const COWORK_HEADERS =
  "{'anthropic-version':'2023-06-01','anthropic-beta':'ccr-byoc-2025-07-29'," +
  "'anthropic-client-feature':'ccr','anthropic-client-platform':'web_claude_ai'," +
  "'x-organization-uuid':org}";

// MỘT lời gọi, KHÔNG phân trang bằng `resume_token`. Đo 2026-07-31: token đó KHÔNG phải
// con trỏ trang — truyền lại vào `/v1/code/sessions` thì endpoint chuyển sang chế độ CHỜ
// (long-poll, họ hàng với `/sessions/watch`) và **không bao giờ trả về**. Vòng lặp "phân
// trang" của bản đầu treo nguyên lần chạy 25 phút mà CPU chỉ 10 giây — treo, không phải chậm.
const COWORK_LIST = `(async()=>{const _no=function(){return [];};
  try{
    ${CLAUDE_ORG_JS}
    const _H=function(org){return ${COWORK_HEADERS};};
    const out=[];
    for(const _g of orgs){
    const r=await fetch('/v1/code/sessions?tags=cowork-remote&limit=100&include_trigger_sessions=true',{headers:_H(_g)});
    if(!r.ok) continue;
    const j=await r.json(); const items=(j&&j.data)||[];
    for(const s of items){ if(s&&s.id){ out.push({id:s.id, updated:(s.last_event_at||s.updated_at||s.created_at), title:(s.title||s.name||null)}); _bag['cw:'+s.id]=_g; } }
    }
    return out;
  }catch(e){ return []; }
})()`;

// Một phiên Cowork = metadata + toàn bộ event. Gộp sẵn ở đây để adapter chỉ việc đọc
// một object duy nhất, đúng khuôn "một file → nhiều phiên" như hai adapter web kia.
const coworkConv = (id: string): string =>
  `(async()=>{const _no=function(m){throw new Error(m);};` +
  CLAUDE_ORG_JS +
  `const _H=function(org){return ${COWORK_HEADERS};};` +
  // Đúng org của phiên (sổ `_bag` do COWORK_LIST ghi); không có trong sổ thì thử lần lượt mọi org chat.
  `let H=null, r=null; for(const _g of _cands('cw:${id}')){ H=_H(_g); r=await fetch('/v1/code/sessions/${id}/events?limit=500',{headers:H}); if(r.ok) break; }` +
  `if(!r||!r.ok) throw new Error('HTTP '+(r?r.status:0));` +
  `const m=await fetch('/v1/code/sessions/${id}',{headers:H});` +
  `const meta=m.ok?await m.json():{};` +
  // Cũng MỘT lời gọi: `resume_cursor` là con trỏ của luồng theo dõi, không phải trang kế
  // — dùng nó để phân trang là rơi vào cùng cái bẫy long-poll của danh sách phiên.
  `const j=await r.json(); const out=(j&&j.data)||[];` +
  `return {id:'${id}', title:(meta&&(meta.title||meta.name))||null, created_at:(meta&&meta.created_at)||null, last_event_at:(meta&&meta.last_event_at)||null, events:out};})()`;

const claudeConv = (id: string): string =>
  // MỘT DÒNG, như bản chatgpt. Bản đầu tôi viết nhiều dòng và pull fail 2/2 — cùng URL,
  // dò riêng qua CDP thì cả 4 biến thể đều trả 200. Khác biệt duy nhất là xuống dòng.
  // `_no` NÉM ở đây (khác các expr trên): fetchConv dựa vào exception để retry/backoff.
  `(async()=>{const _no=function(m){throw new Error(m);};` +
  CLAUDE_ORG_JS +
  // Org của CHÍNH hội thoại này (sổ `_bag` do CLAUDE_LIST ghi) đi trước; thiếu sổ thì thử lần lượt.
  `let r=null; for(const _g of _cands('${id}')){ r=await fetch('/api/organizations/'+_g+'/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true'); if(r.ok) break; }` +
  `if(!r||!r.ok) throw new Error('HTTP '+(r?r.status:0)); return r.json();})()`;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

// ── Gemini (gemini.google.com) ────────────────────────────────────────────────
// Kiểm đăng nhập KHÔNG qua API nội bộ. Đo 2026-09-10 (cửa sổ dò 300 s): Gemini không có REST nào cho
// lịch sử — mọi thứ đi qua `POST /_/BardChatUi/data/batchexecute`, và `rpcid` của nó đổi theo bản
// deploy. Nhưng câu "đã đăng nhập chưa" thì trang tự trả lời được: chưa đăng nhập ⇒ Google đưa sang
// `accounts.google.com` (hoặc hiện nút Sign in); đã đăng nhập ⇒ có ô nhập prompt và menu tài khoản.
// Email: quét `WIZ_global_data` tìm chuỗi hình dạng email (cùng lối "dò sâu" của CLAUDE_AUTH), không
// ghim khoá — khoá trong WIZ là số, đổi theo build.
const GEMINI_AUTH = `(async()=>{try{
  if(/accounts\\.google\\.com|ServiceLogin/.test(location.href)) return {token:false};
  // 🔴 DẤU ĐĂNG NHẬP và DANH TÍNH là HAI câu hỏi — đừng suy cái này từ cái kia. Lượt chạy THẬT đầu
  // (2026-09-10) báo "đã nối" trên một profile chưa ai đăng nhập, chỉ vì bộ dò email bắt được một
  // chuỗi HÌNH email trong WIZ_global_data. Nay token CHỈ dựa vào bằng chứng giao diện của một phiên
  // đang sống (menu tài khoản Google, hoặc ô nhập prompt), và email là thông tin PHỤ đọc SAU đó.
  var EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$/;
  var acct = document.querySelector('a[href*="SignOutOptions"],a[aria-label*="Google Account"],a[aria-label*="Tài khoản Google"]');
  var box = document.querySelector('rich-textarea,[contenteditable="true"][role="textbox"]');
  var askLogin = /\\b(sign in|log in|đăng nhập)\\b/i.test((document.body.innerText||'').slice(0,3000));
  if(!((!!acct || !!box) && !askLogin)) return {token:false};
  // Bộ lọc NGHIÊM: lớp [^\\s@]+ cũ nhận cả nháy, phẩy, ngoặc và gạch chéo — đó là cách một URL nội bộ
  // của Google (default-bard-run-dev.corp.goog) lọt vào và trở thành danh tính đóng dấu lên phiên.
  var email=null, w=(window.WIZ_global_data||{});
  for (var k in w) { var v=w[k]; if (typeof v==='string' && v.length<255 && EMAIL.test(v)) { email=v; break; } }
  if(!email){ var el=document.querySelector('a[aria-label*="@"],[data-email]');
    if(el){ var t=(el.getAttribute('data-email')||el.getAttribute('aria-label')||'');
      var mm=/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}/.exec(t); if(mm) email=mm[0]; } }
  return {token:true, email: email};
}catch(e){ return {token:false, err:String(e)}; }})()`;

// ── Gemini (gemini.google.com) — ĐƯỜNG KÉO, đo 2026-09-11 trên phiên đã đăng nhập ────────────
//
// `plan/07 §17.2` đã đo đúng phần khó: Gemini KHÔNG có REST cho lịch sử, mọi thứ đi qua một RPC
// nội bộ `POST /_/BardChatUi/data/batchexecute`, và **`rpcid` đổi theo bản deploy** nên ghim nó là
// dựng một parser sẽ vỡ IM LẶNG. Đợt này dò được cả hai đầu trên phiên thật:
//   · danh sách  `MaZiqc`  args `[<giới hạn>,null,[0,null,1]]` → 101 hội thoại (id `c_…` · tiêu đề · epoch)
//   · chi tiết   `hNvQHb`  args `[<id>,100,null,1,[0],[4],null,1]` → các LƯỢT, mỗi lượt:
//        `t[0][1]`          = id bền của lượt (`r_…`) — khoá dedup
//        `t[2][0][0]`       = chữ NGƯỜI hỏi
//        `t[3][0][0][1][0]` = câu trả lời ĐẦY ĐỦ của Gemini
//        (`t[3][12]…` chỉ là bản dựng lại của chính câu đó theo khối — KHÔNG lấy, sẽ thành trùng)
//     Xác nhận 8/8 lượt trên 3 hội thoại có đủ cả hai đầu.
//
// Ba phép đo phụ, ghi ra để phiên sau khỏi dò lại: tham số đầu của `MaZiqc` là **giới hạn**, không
// phải số trang (`29→30` · `100→101` · `500→101` ⇒ hết kho ở 101) · `hNvQHb` với limit 10 và 100 ra
// **cùng 6 lượt** ⇒ 100 là đủ rộng · **29/30** mục trong danh sách có mốc epoch (mục thiếu ⇒ `at=0`,
// rơi về hành vi cũ "đã có thì bỏ qua").
//
// 🔴 LƯỢT TRẢ VỀ THEO THỨ TỰ MỚI NHẤT TRƯỚC (epoch giảm dần) và adapter phải đảo lại. Đây là lý do
// khoá dedup KHÔNG được dùng chỉ số thứ tự: thêm một lượt mới là mọi chỉ số lệch một bậc ⇒ nạp lại
// toàn bộ hội thoại thành tin trùng. Dùng `r_…` của chính nền.
const GEMINI_CALL = `const _zc=async function(rpc,args){
    const w=window.WIZ_global_data||{};
    const b=new URLSearchParams();
    b.set('f.req', JSON.stringify([[[rpc, JSON.stringify(args), null, 'generic']]]));
    if(w.SNlM0e) b.set('at', w.SNlM0e);
    const u='/_/BardChatUi/data/batchexecute?rpcids='+rpc+'&source-path=%2Fapp&bl='+(w.cfb2h||'')+
      '&f.sid='+(w.FdrFJe||'')+'&hl=vi&_reqid='+Math.floor(Math.random()*900000)+'&rt=c';
    const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:b.toString()});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.text();
  };
  // Bóc khung batchexecute: bỏ tiền tố chống-XSSI rồi lấy các khối ["wrb.fr","<rpc>","<json chuỗi>"].
  // Đọc theo DÒNG + JSON.parse thay vì regex: bản mã có cả ký tự xuống dòng escape, regex cắt nhầm.
  const _zu=function(txt,rpc){
    const out=[];
    const body=String(txt).replace(/^\\)\\]\\}'\\s*/,'');
    for(const line of body.split('\\n')){
      const s=line.trim(); if(s.charAt(0)!=='[') continue;
      let a; try{ a=JSON.parse(s); }catch(e){ continue; }
      (function walk(x){ if(!Array.isArray(x)) return;
        if(x[0]==='wrb.fr' && x[1]===rpc && typeof x[2]==='string'){ try{ out.push(JSON.parse(x[2])); }catch(e){} }
        for(const y of x) walk(y); })(a);
    }
    return out;
  };`;

const GEMINI_LIST = `(async()=>{
  try{
    ${GEMINI_CALL}
    const blocks=_zu(await _zc('MaZiqc',[300,null,[0,null,1]]),'MaZiqc');
    const seen={}, out=[];
    (function walk(x,d){
      if(!Array.isArray(x)||d>8) return;
      if(typeof x[0]==='string' && /^c_[0-9a-f]{6,}/.test(x[0]) && !seen[x[0]]){
        seen[x[0]]=1;
        const strs=x.filter(function(y){ return typeof y==='string' && y!==x[0] && !/^rc?_[0-9a-f]{6,}$/.test(y); });
        const eps=[]; (function n(y,dd){ if(typeof y==='number'&&y>1600000000&&y<2000000000) eps.push(y);
          if(Array.isArray(y)&&dd<5) for(const z of y) n(z,dd+1); })(x,0);
        // Mốc trả về dạng CHUỖI ISO: \`asItem\` nhân 1000 cho mọi SỐ (hợp đồng theo ChatGPT vốn trả
        // giây) — trả epoch giây thô vẫn đúng, nhưng ISO thì không phụ thuộc hợp đồng đó.
        out.push({id:x[0], title:(strs[0]||null), updated:(eps.length?new Date(eps[0]*1000).toISOString():null)});
      }
      for(const y of x) walk(y,d+1);
    })(blocks,0);
    return out;
  }catch(e){ return []; }
})()`;

const geminiConv = (id: string): string => `(async()=>{
  ${GEMINI_CALL}
  const blocks=_zu(await _zc('hNvQHb',[${JSON.stringify(id)},100,null,1,[0],[4],null,1]),'hNvQHb');
  const turns=(blocks[0]&&blocks[0][0])||[];
  const out=[];
  for(const t of turns){
    const rid=(t&&t[0]&&t[0][1])||null;
    const user=(t&&t[2]&&t[2][0]&&t[2][0][0])||null;
    const model=(t&&t[3]&&t[3][0]&&t[3][0][0]&&t[3][0][0][1]&&t[3][0][0][1][0])||null;
    const eps=[]; (function n(y,dd){ if(typeof y==='number'&&y>1600000000&&y<2000000000) eps.push(y);
      if(Array.isArray(y)&&dd<5) for(const z of y) n(z,dd+1); })(t,0);
    if(user||model) out.push({rid:rid, at:(eps.length?eps[0]:null), user:user, model:model});
  }
  if(!out.length) throw new Error('khong doc duoc luot nao');
  return {conversationId:${JSON.stringify(id)}, turns:out};
})()`;

// ── GitHub Copilot (github.com/copilot) ──────────────────────────────────────
// `meta[name="user-login"]` là dấu đăng nhập RẺ NHẤT và bền nhất của github.com — có mặt trên mọi
// trang khi còn phiên, mất khi hết phiên. Không có email (GitHub không phơi email lên trang), nên
// danh tính ở đây là **tên đăng nhập**; `accountKey()` thấy không phải email thì tự dùng tên khe,
// còn hàng nguồn vẫn hiện được "ai" — cùng cách CLAUDE_AUTH xử ca chỉ biết tên org.
const COPILOT_AUTH = `(async()=>{try{
  var m = document.querySelector('meta[name="user-login"]');
  var who = m && m.content ? m.content : null;
  if (who) return {token:true, email:who};
  if (/^\\/(login|session|sessions)/.test(location.pathname)) return {token:false};
  return {token:false};
}catch(e){ return {token:false, err:String(e)}; }})()`;

/**
 * GitHub Copilot — ĐƯỜNG KÉO, đo 2026-09-11 trên phiên `ZyroFrost`.
 *
 * Ba dữ kiện, mỗi cái là một cách hỏng nếu không biết:
 *  ① Token: `POST github.com/github-copilot/chat/token` cần **CẢ HAI** header `GitHub-Verified-Fetch:
 *    true` và `Accept: application/json` — đo được: thiếu cả hai ⇒ **422**, chỉ có verified ⇒ **400**,
 *    đủ hai ⇒ **200** `{token, expiration, ssoOrgIDs}`.
 *  ② Scheme là **`GitHub-Bearer`**, KHÔNG phải `Bearer` — nền nói thẳng khi sai:
 *    `400 bad request: Authorization header is badly formatted`. Tìm ra bằng phép đo số học chứ
 *    không phải đoán: header trang gửi dài 122 ký tự, token 108, chênh đúng 14 = `"GitHub-Bearer "`.
 *  ③ Kèm `copilot-integration-id: copilot-chat` và `X-GitHub-Api-Version: 2025-05-01`.
 *
 * 🔴 **HÌNH DẠNG MỘT HỘI THOẠI CHƯA ĐO ĐƯỢC — và đó là lý do `copilotConv` KHÔNG đoán.** Tài khoản
 * này trả `{threads: []}` (đo lại hai lần, 09-11 và 09-12: rỗng thật, `orgs_failed_to_load:false`),
 * nên không có mẫu nào để dựng parser; `plan/07 §1` cấm viết bằng phỏng đoán. Lane vẫn MỞ vì mở thì
 * bề mặt mới nói đúng sự thật *"đã kéo, kho nền rỗng"* thay vì *"chưa có đường kéo"*; và ngày người
 * dùng chat câu đầu tiên, lượt kéo sẽ **báo lỗi rõ ràng** (xem `copilotConv`) chứ không nhét dữ liệu
 * méo vào kho. Lỗi đó chính là tín hiệu để đi đo — không phải sự cố.
 */
const COPILOT_TOKEN = `const _tok=async function(){
    const r=await fetch('/github-copilot/chat/token',{method:'POST',headers:{'GitHub-Verified-Fetch':'true','Accept':'application/json'}});
    if(!r.ok) throw new Error('token HTTP '+r.status);
    const j=await r.json();
    if(!j || !j.token) throw new Error('token rong');
    return j.token;
  };
  const _api='https://api.individual.githubcopilot.com';
  const _H=function(t){ return {Authorization:'GitHub-Bearer '+t,'copilot-integration-id':'copilot-chat','X-GitHub-Api-Version':'2025-05-01'}; };`;

const COPILOT_LIST = `(async()=>{
  try{
    ${COPILOT_TOKEN}
    const t=await _tok();
    const r=await fetch(_api+'/github/chat/threads',{headers:_H(t)});
    if(!r.ok) return [];
    const j=await r.json();
    const arr=Array.isArray(j)?j:((j&&(j.threads||j.data||j.items))||[]);
    return arr.map(function(x){
      if(!x||!x.id) return null;
      const u=x.updated_at||x.last_updated_at||x.created_at||null;
      return {id:String(x.id), title:(x.name||x.title||null), updated:u};
    }).filter(Boolean);
  }catch(e){ return []; }
})()`;

const copilotConv = (id: string): string => `(async()=>{
  ${COPILOT_TOKEN}
  const t=await _tok();
  // Hai đường ứng viên; lấy cái nào trả JSON. KHÔNG đoán hình dạng bên trong — trả NGUYÊN payload
  // kèm nhãn đường đã dùng, để lượt đo đầu tiên có vật thật mà xem.
  const tried=[];
  for(const p of ['/github/chat/threads/${id}/messages','/github/chat/threads/${id}']){
    try{
      const r=await fetch(_api+p,{headers:_H(t)});
      tried.push(p+' → '+r.status);
      if(!r.ok) continue;
      const j=await r.json();
      return {threadId:'${id}', from:p, raw:j};
    }catch(e){ tried.push(p+' → '+String(e)); }
  }
  throw new Error('chua doc duoc hoi thoai GitHub Copilot: '+tried.join(' | '));
})()`;

/**
 * Phép kiểm đăng nhập cho hai nền Copilot của MICROSOFT (khác hẳn GitHub Copilot — `plan/07 §17.3`).
 *
 * 🔴 Viết THẬN TRỌNG theo đúng bài học `[2026-09-10h]`: bản đầu của Gemini suy `token` từ *"tìm thấy
 * một chuỗi hình email"*, và một URL nội bộ của Google đã thành danh tính đóng dấu lên phiên. Nên ở
 * đây `token` CHỈ dựa vào bằng chứng phiên SỐNG (có ô soạn tin trên trang, và không đang ở trang đăng
 * nhập), còn danh tính thì tìm TRONG ĐÚNG vùng điều khiển tài khoản — không quét cả trang.
 *
 * ⚠ Selector chưa đo được trên phiên thật (chưa ai đăng nhập). Đây là hạng `loginOnly`, nên cái giá
 * của việc đoán sai là *"báo chưa đăng nhập dù đã đăng nhập"* — nhìn thấy ngay và sửa bằng một lượt
 * dò, chứ không phải ghi bậy vào kho. Thà vậy còn hơn đòi có phiên trước khi dựng thứ cho phép
 * đăng nhập — đúng vòng luẩn quẩn user đã chỉ ra hôm 2026-09-10.
 */
// 🔴 Nhận CHUỖI mẫu rồi dựng regex TRONG trang bằng `new RegExp`, KHÔNG nội suy `source` trần.
// Bản đầu viết `if (${re.source}.test(...))` ⇒ mã tới trang là `if (login\.live\.com|... .test(…))`
// — không phải regex, mà là LỖI CÚ PHÁP, nên cả biểu thức ném và luôn trả "chưa đăng nhập". Đo
// 2026-09-11: user đăng nhập M365 xong, trang có đủ ô soạn tin, zemory vẫn báo chưa nối. Đây đúng
// họ bẫy "regex trong template literal" mà `05_TODO` đã ghi hai lần (`\s` bị JS ăn backslash).
const msAuth = (loginHostPattern: string): string => `(async()=>{try{
  if (new RegExp(${JSON.stringify(loginHostPattern)}, 'i').test(location.hostname)) return {token:false};
  if (/^\\/(login|signin|oauth2|common)/i.test(location.pathname)) return {token:false};
  // Bằng chứng phiên SỐNG: ô soạn tin dựng được. Đo trên phiên thật của M365 (2026-09-11):
  // 1 phần tử [role="textbox"], 0 textarea — nên thứ tự chọn đặt role lên trước.
  if (!document.querySelector('[role="textbox"], [contenteditable="true"], textarea')) return {token:false};
  // DANH TÍNH: Microsoft không phơi email trên trang (đo được: 0 chuỗi email trong body). Thứ có
  // thật là nhãn của nút tài khoản — đo được "Nguyễn Đức Huy - CNTT, Work account". Lấy ĐÚNG nhãn
  // đó rồi cắt đuôi "…, Work/Personal account"; KHÔNG quét email cả trang (bẫy 2026-09-10: một URL
  // nội bộ lọt qua lớp email và thành danh tính đóng dấu lên phiên).
  var who = null;
  var lab = [].slice.call(document.querySelectorAll('[aria-label]'))
    .map(function(x){ return x.getAttribute('aria-label') || ''; })
    .filter(function(s){ return /\\baccount\\b/i.test(s) && s.length < 120; })[0];
  if (lab) who = lab.replace(/,?\\s*(work|personal|school)\\s+account\\s*$/i, '').trim() || null;
  return who ? {token:true, email:who} : {token:true};
}catch(e){ return {token:false, err:String(e)}; }})()`;

const MSCOPILOT_AUTH = msAuth("login\\.live\\.com|login\\.microsoftonline\\.com");

/**
 * M365 Copilot: bằng chứng phiên là **LỜI GỌI DỮ LIỆU**, không phải giao diện đã vẽ xong.
 *
 * 🔴 Vì sao đổi khỏi `msAuth` (đo 2026-09-11, lượt chạy THẬT): bản dựa vào `[role="textbox"]` báo
 * *"chưa đăng nhập"* trên một profile CÓ ĐỦ cookie phiên — `checkAuth` eval ngay sau khi trang về
 * đúng origin, mà SPA của Microsoft cần ~30 giây mới dựng xong ô soạn tin. **Chưa vẽ ≠ chưa đăng
 * nhập**, nhưng hậu quả thì y như nhau: lượt kéo dừng và đòi người dùng đăng nhập lại một tài khoản
 * đang đăng nhập. Cùng họ với bẫy `awaitOrigin` đã vá 2026-08-28 — chỉ khác là chờ DOM thay vì chờ URL.
 *
 * Nay hỏi đúng thứ lượt kéo sẽ dùng: `POST /chat` (RefreshNavPane). Còn phiên ⇒ 200 + JSON, tức
 * KHÔNG phải suy đoán mà là chính năng lực ta cần. Mất phiên ⇒ Microsoft đưa về `login.*` (chặn ở
 * dòng đầu) hoặc trả HTML/4xx ⇒ không qua cửa `content-type: json`.
 * Ô soạn tin GIỮ LÀM ĐƯỜNG LUI cho ngày Microsoft đổi khuôn lời gọi — mất một lớp thì còn lớp kia.
 * Danh tính đọc SAU và được phép rỗng: `{token:true}` không kèm email vẫn là "đã nối", bề mặt có
 * nhãn riêng cho ca đó (*"đã nối · chưa rõ tài khoản"*, cổng `scope-loginonly-row` ①b).
 */
const M365COPILOT_AUTH = `(async()=>{try{
  if (new RegExp('login\\\\.microsoftonline\\\\.com|login\\\\.live\\\\.com', 'i').test(location.hostname)) return {token:false};
  if (/^\\/(login|signin|oauth2|common)/i.test(location.pathname)) return {token:false};
  var live = false;
  try{
    var r = await fetch('/chat', {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({action:'RefreshNavPane',conversationHistoryFilter:null,skipNotebooks:false,skipAgentListCache:true,enableLastMessage:false})});
    live = r.ok && /json/i.test(r.headers.get('content-type') || '');
  }catch(e){}
  if (!live) live = !!document.querySelector('[role="textbox"], [contenteditable="true"], textarea');
  if (!live) return {token:false};
  var who = null;
  var lab = [].slice.call(document.querySelectorAll('[aria-label]'))
    .map(function(x){ return x.getAttribute('aria-label') || ''; })
    .filter(function(s){ return /\\baccount\\b/i.test(s) && s.length < 120; })[0];
  if (lab) who = lab.replace(/,?\\s*(work|personal|school)\\s+account\\s*$/i, '').trim() || null;
  return who ? {token:true, email:who} : {token:true};
}catch(e){ return {token:false, err:String(e)}; }})()`;

/** Nền hạng CHỈ-NỐI chưa có đường kéo: hai biểu thức này KHÔNG BAO GIỜ được gọi (nhánh `loginOnly`
 *  thoát trước). Đặt giá trị vô hại + tên nói rõ, để nếu một ngày ai đó gọi tới thì nó trả rỗng
 *  chứ không ném — và cổng `scanweb-loginonly.test` canh đúng việc "không bao giờ tới đây". */
const LOGIN_ONLY_LIST = "(async()=>[])()";
const loginOnlyConv = (): string => "(async()=>null)()";

/**
 * Phép kiểm đăng nhập DÙNG CHUNG cho nền hạng CHỈ-NỐI mới (2026-09-12).
 *
 * Ràng buộc của user khi giao việc: *"chỉ tạo đường nối chứ ko nối sẵn, vì t ko có tk, chỉ tạo để
 * user có thì nối thôi"*. Nên cả sáu nền dưới đây được dựng mà KHÔNG có một phiên nào để dò — và
 * điều đó quyết định hình dạng hàm này:
 *
 * · **KHÔNG đọc danh tính.** Trả `{token:true}` trơn. Đây là chỗ đã trả giá 2026-09-10: bản Gemini
 *   đầu suy danh tính từ *"tìm thấy một chuỗi hình email"* và một URL nội bộ của Google thành danh
 *   tính đóng dấu lên phiên. Một biểu thức chung chạy trên sáu trang lạ mà đi mò nhãn tài khoản thì
 *   chắc chắn tái diễn — `msAuth` lấy `aria-label` chứa chữ *account* là hợp lý cho Microsoft, còn
 *   ở trang khác nó sẽ nhặt đúng chuỗi *"Your account settings"* làm tên người. Bề mặt đã có nhãn
 *   cho ca này (*"đã nối · chưa rõ tài khoản"*), nên im lặng về danh tính là đáp án ĐÚNG, không
 *   phải thiếu sót.
 * · **Bằng chứng phiên = ô soạn tin dựng được**, sau khi loại trang đăng nhập. Chiều sai duy nhất
 *   có thể xảy ra là *"báo chưa đăng nhập dù đã đăng nhập"* (SPA dựng chậm — bài học M365
 *   2026-09-11). Với hạng CHỈ-NỐI cái giá đó THẤY ĐƯỢC NGAY và sửa bằng một lượt dò trên phiên
 *   thật; chiều ngược lại (báo đã nối khi chưa) mới là thứ ghi bậy vào sổ.
 *
 * 🔴 Regex dựng TRONG trang bằng `new RegExp` trên một chuỗi, KHÔNG nội suy `.source` trần — nội suy
 * đẻ ra lỗi cú pháp im lặng khiến biểu thức luôn trả "chưa đăng nhập" (đo 2026-09-11 trên M365).
 */
const loginOnlyAuth = (loginHostPattern?: string): string => `(async()=>{try{
  ${loginHostPattern ? `if (new RegExp(${JSON.stringify(loginHostPattern)}, 'i').test(location.hostname)) return {token:false};` : "/* đăng nhập nằm CÙNG miền — không có host riêng để loại */"}
  if (/^\\/(login|signin|sign-in|signup|auth|oauth|account\\/login)/i.test(location.pathname)) return {token:false};
  if (!document.querySelector('[role="textbox"], [contenteditable="true"], textarea')) return {token:false};
  return {token:true};
}catch(e){ return {token:false, err:String(e)}; }})()`;

// ── Microsoft 365 Copilot (m365.cloud.microsoft) ─────────────────────────────
// ĐO 2026-09-11 trên phiên công ty đã đăng nhập (`plan/07 §17.5` — dò TRƯỚC, viết SAU).
// Kết quả trái với dự đoán bi quan của `plan/07 §17.3` ③ (*"lịch sử ở Substrate, phải qua Graph +
// admin consent"*): bề mặt web đọc lịch sử bằng ĐÚNG hai lời gọi CÙNG ORIGIN, xác thực bằng
// COOKIE của chính trang — không cần token MSAL, không cần quyền quản trị.
//
//   liệt kê  POST /chat            body {action:"RefreshNavPane", …}  → store.conversationPageHistoryList.chats
//            GET  /chat/all        Accept: application/json          → store.chatLandingPageHistoryList.chats
//   chi tiết GET  /chat/conversation/<id>  Accept: application/json  → store.rawConversationResponse.messages[]
//
// 🔴 `Accept: application/json` là BẮT BUỘC ở đường chi tiết: thiếu nó cùng URL trả HTML **549 KB**
// (đo: `json=false`), tức parser sẽ nhận một trang web và kết luận "không có tin".
//
// Hai vế đã đo và KHÔNG có, ghi ra để phiên sau khỏi dò lại: **không có phân trang** (thử
// `count=200` · `top=200` · `page=2` · `conversationHistoryFilter:'all'` — cả bốn trả y hệt 6 mục)
// và `action:'GetChatHistory'` trả rỗng. Danh sách vì vậy là HỢP của hai đường trên, dedup theo
// `conversationId`; nền trả gì thì lấy đó, không bịa thêm vòng lặp trang.
const M365_LIST = `(async()=>{
  try{
    const seen={}, out=[];
    // Tin dùng được là tin có id VÀ có khoá 'chatName' — đó là dấu phân biệt một mục HỘI THOẠI
    // với các object khác cũng mang 'conversationId' rải trong payload (vd trạng thái panel).
    const add=function(c){ if(!c||!c.conversationId||seen[c.conversationId]) return; seen[c.conversationId]=1;
      var ms=Number(c.updateTimeUtc||c.createTimeUtc||0);
      // 🔴 MỐC LÀ MILI-GIÂY, và \`asItem\` nhân 1000 cho mọi số (hợp đồng cũ theo ChatGPT vốn trả
      // GIÂY). Trả số thô ở đây là đẩy mốc đi ~56.000 năm ⇒ mọi hội thoại luôn "mới hơn bản đang
      // giữ" ⇒ kéo lại toàn bộ mỗi lượt quét. Nên trả CHUỖI ISO: \`asItem\` đọc chuỗi bằng Date.parse.
      out.push({id:c.conversationId, updated:(ms>0?new Date(ms).toISOString():null), title:(c.chatName||null)}); };
    const dig=function(j){ (function walk(x,d){ if(!x||d>8) return;
      if(Array.isArray(x)){ for(var i=0;i<x.length;i++) walk(x[i],d+1); return; }
      if(typeof x==='object'){ if(x.conversationId && x.chatName!==undefined) add(x);
        for(var k in x){ if(Object.prototype.hasOwnProperty.call(x,k)) walk(x[k],d+1); } } })(j,0); };
    try{
      const r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({action:'RefreshNavPane',conversationHistoryFilter:null,skipNotebooks:false,skipAgentListCache:true,enableLastMessage:false})});
      if(r.ok) dig(await r.json());
    }catch(e){}
    try{ const r2=await fetch('/chat/all',{headers:{'Accept':'application/json'}}); if(r2.ok) dig(await r2.json()); }catch(e){}
    return out;
  }catch(e){ return []; }
})()`;

// MỘT DÒNG như \`claudeConv\` (bài học cùng file: bản nhiều dòng của claude fail 2/2 trong khi cùng
// URL dò tay thì 200). Ném khi không 2xx — \`fetchConv\` dựa vào exception để retry/backoff.
const m365Conv = (id: string): string =>
  `(async()=>{const r=await fetch('/chat/conversation/${id}',{headers:{'Accept':'application/json'}});` +
  `if(!r.ok) throw new Error('HTTP '+r.status);` +
  `const j=await r.json(); const rc=j&&j.store&&j.store.rawConversationResponse;` +
  `if(!rc) throw new Error('khong co rawConversationResponse');` +
  `return {conversationId:(rc.conversationId||'${id}'), chatName:(rc.chatName||null), createTimeUtc:(rc.createTimeUtc||null), updateTimeUtc:(rc.updateTimeUtc||null), messages:(rc.messages||[])};})()`;

export const PLATFORMS: Record<string, Platform> = {
  chatgpt: {
    key: "chatgpt",
    url: "https://chatgpt.com",
    source: "chatgpt-web",
    authExpr: `fetch('/api/auth/session').then(r=>r.json()).then(j=>({token:!!j.accessToken,email:j.user?.email||null})).catch(e=>({token:false,err:String(e)}))`,
    listExpr: CHATGPT_LIST,
    projectsExpr: CHATGPT_PROJECTS,
    projectConvsExpr: chatgptProjectConvs,
    convExpr: (id: string) =>
      `(async()=>{const t=(await (await fetch('/api/auth/session')).json()).accessToken;` +
      `const r=await fetch('/backend-api/conversation/${id}',{headers:{Authorization:'Bearer '+t}});` +
      `if(!r.ok) throw new Error('HTTP '+r.status); return r.json();})()`,
    sessionPrefix: "chatgpt-",
    tabRe: /chatgpt.com|openai.com/,
    port: 9222,
    projectKeyOf: (c) =>
      str((c as { gizmo_id?: unknown }).gizmo_id) ?? str((c as { conversation_template_id?: unknown }).conversation_template_id),
  },
  claude: {
    key: "claude",
    url: "https://claude.ai",
    source: "claude-web",
    authExpr: CLAUDE_AUTH,
    listExpr: CLAUDE_LIST,
    // Chỉ có projectsExpr (map tên) — CỐ Ý KHÔNG có projectConvsExpr: đo được là
    // danh sách phẳng của claude.ai đã chứa cả chat trong Project (xem CLAUDE_LIST).
    projectsExpr: CLAUDE_PROJECTS,
    convExpr: claudeConv,
    sessionPrefix: "claudeweb-",
    tabRe: /claude.ai/,
    port: 9223,
    projectKeyOf: (c) => str((c as { project_uuid?: unknown }).project_uuid),
    // Cowork đi CÙNG cửa sổ claude.ai (cùng phiên đăng nhập), chỉ khác bộ sưu tập.
    sub: {
      key: "cowork",
      source: "claude-cowork",
      sessionPrefix: "coworkweb-",
      importKey: "cowork",
      listExpr: COWORK_LIST,
      convExpr: coworkConv,
    },
  },
  // ── Hai nền hạng CHỈ-NỐI (user giao 2026-09-10) ──────────────────────────────
  // Cổng riêng: 9224 · 9225 — mỗi nền một cổng, không dùng chung (xem chú thích `port`).
  // ĐƯỜNG KÉO MỞ 2026-09-11 (đo trên phiên thật — xem khối `GEMINI_CALL`): nền này KHÔNG còn
  // `loginOnly`, nó có `listExpr`/`convExpr` đo được như chatgpt/claude.
  gemini: {
    key: "gemini",
    url: "https://gemini.google.com/app",
    source: "gemini-web",
    authExpr: GEMINI_AUTH,
    listExpr: GEMINI_LIST,
    convExpr: geminiConv,
    sessionPrefix: "geminiweb-",
    tabRe: /gemini\.google\.com/,
    port: 9224,
  },
  // ĐƯỜNG KÉO MỞ 2026-09-12 (user: *"mọi kết nối phải lấy data thật, không có đăng nhập xong để 0"*).
  // Tài khoản này đang **0 hội thoại** (đo hai lần), nên lane sẽ báo `done · 0` — đó là sự thật của
  // NỀN, khác hẳn `login-only` (sự thật của zemory). Xem khối `COPILOT_TOKEN` cho phần chưa đo được.
  copilot: {
    key: "copilot",
    url: "https://github.com/copilot",
    source: "copilot-web",
    authExpr: COPILOT_AUTH,
    listExpr: COPILOT_LIST,
    convExpr: copilotConv,
    sessionPrefix: "copilotweb-",
    // CHỈ trang copilot của github.com — `tabRe` lỏng (cả github.com) sẽ bắt bất kỳ tab GitHub nào
    // đang mở và chạy eval ở đó, đúng lỗi mà chú thích `tabRe` cảnh báo.
    tabRe: /github\.com\/copilot/,
    port: 9225,
  },
  // ── BA nền tên Copilot, BA hệ khác nhau (user chốt 2026-09-11: *"phải tách 3 cái riêng"*) ──
  // Khoá `copilot` GIỮ NGUYÊN nghĩa GitHub Copilot — đổi tên khoá là mất phiên đăng nhập đang có
  // (`webAuth.copilot` + `data/browser/copilot`). Hai nền Microsoft mang khoá RIÊNG, cổng riêng.
  mscopilot: {
    key: "mscopilot",
    url: "https://copilot.microsoft.com",
    source: "mscopilot-web",
    authExpr: MSCOPILOT_AUTH,
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "mscopilotweb-",
    tabRe: /copilot\.microsoft\.com/,
    port: 9226,
    loginOnly: true,
  },
  // ĐƯỜNG KÉO ĐÃ MỞ 2026-09-11 (đo trên phiên thật — xem khối `M365_LIST`). Nền này KHÔNG còn
  // `loginOnly`: nó có `listExpr`/`convExpr` đo được, nên vào vòng kéo như chatgpt/claude.
  m365copilot: {
    key: "m365copilot",
    // Cổng vào của M365 Copilot; nó tự đưa sang trang đăng nhập của tổ chức khi chưa có phiên.
    url: "https://m365.cloud.microsoft/chat",
    source: "m365copilot-web",
    authExpr: M365COPILOT_AUTH,
    listExpr: M365_LIST,
    convExpr: m365Conv,
    sessionPrefix: "m365copilotweb-",
    // Hai tên miền cùng phục vụ bề mặt này; `tabRe` phải nhận cả hai, nhưng KHÔNG được nới tới
    // `*.microsoft.com` — lỏng là chạy eval nhầm trên một tab Microsoft bất kỳ đang mở.
    tabRe: /m365\.cloud\.microsoft|copilot\.cloud\.microsoft/,
    port: 9227,
  },

  // ── NỀN HẠNG CHỈ-NỐI thêm 2026-09-12 ──────────────────────────────────────────────────────
  // User giao: *"thêm vào các nguồn đầy đủ của các con AI người ta hay xài, cả web lẫn local"*, và
  // chốt ngay phạm vi: *"chỉ tạo đường nối chứ ko nối sẵn, vì t ko có tk, chỉ tạo để user có thì
  // nối thôi"*. Sáu nền dưới đây vì vậy dừng ở đúng vế NỐI: có URL, có cửa sổ, có phép kiểm phiên.
  // Đường KÉO chưa đo được (không có tài khoản để dò `listExpr`/`convExpr`) ⇒ `loginOnly: true`,
  // và hạng đó tự lo hai việc: lượt quét trả `login-only` chứ KHÔNG phải `done · 0` (hai câu khác
  // nghĩa hẳn), và nền RA KHỎI vòng tự kéo nên không có cửa sổ nào tự bật.
  // ⚠ Nền nào cũng chỉ vào lượt quét khi được GỌI TÊN (`only`) — luật 2026-09-10h, chính là thứ
  // bảo đảm "ko nối sẵn": nút Quét chung và nhịp nền bỏ qua hết.
  grok: {
    key: "grok",
    url: "https://grok.com",
    source: "grok-web",
    authExpr: loginOnlyAuth("accounts\\.x\\.com|x\\.com/i/flow"),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "grokweb-",
    tabRe: /grok\.com/,
    port: 9228,
    loginOnly: true,
  },
  deepseek: {
    key: "deepseek",
    url: "https://chat.deepseek.com",
    source: "deepseek-web",
    authExpr: loginOnlyAuth(),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "deepseekweb-",
    tabRe: /chat\.deepseek\.com/,
    port: 9229,
    loginOnly: true,
  },
  perplexity: {
    key: "perplexity",
    url: "https://www.perplexity.ai",
    source: "perplexity-web",
    authExpr: loginOnlyAuth(),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "perplexityweb-",
    tabRe: /perplexity\.ai/,
    port: 9230,
    loginOnly: true,
  },
  mistral: {
    key: "mistral",
    url: "https://chat.mistral.ai",
    source: "mistral-web",
    authExpr: loginOnlyAuth("auth\\.mistral\\.ai"),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "mistralweb-",
    tabRe: /chat\.mistral\.ai/,
    port: 9231,
    loginOnly: true,
  },
  qwen: {
    key: "qwen",
    url: "https://chat.qwen.ai",
    source: "qwen-web",
    authExpr: loginOnlyAuth(),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "qwenweb-",
    tabRe: /chat\.qwen\.ai/,
    port: 9232,
    loginOnly: true,
  },
  kimi: {
    key: "kimi",
    url: "https://www.kimi.com",
    source: "kimi-web",
    authExpr: loginOnlyAuth(),
    listExpr: LOGIN_ONLY_LIST,
    convExpr: loginOnlyConv,
    sessionPrefix: "kimiweb-",
    tabRe: /kimi\.com/,
    port: 9233,
    loginOnly: true,
  },
};

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

/**
 * Order the candidate browsers by the machine's DEFAULT browser.
 *
 * The list used to be Edge-first, hardcoded. On a machine whose default is Chrome that
 * pops an Edge window the user does not recognise — reported 2026-07-30: *"toàn mở app
 * edge ra hỏi, trong khi cookie lưu trong google chrome"*. It never affected which
 * cookies are available (scanWeb always uses its OWN profile under data/browser/), but
 * opening a browser the user does not use is its own kind of wrong.
 *
 * Firefox is deliberately NOT a candidate: this drives the window over CDP, which
 * Firefox does not speak the same way. A Firefox default falls back to the normal order.
 */
// Brave — Chromium, nói CDP y như Chrome/Edge. Thêm 2026-08-28: máy user mặc định Brave
// (`BraveHTML`) mà bộ dò chỉ biết hai hãng kia ⇒ rơi về Edge, và Edge với profile mới tinh
// bật ngay hộp "syncing your browsing data" của tài khoản Microsoft — đúng thứ user vừa chụp.
// Nguyên văn: *"m phải mở tk ng ta đã cài mặc định… m đi mở mặc định edge là rất ngu"*.
const BRAVE_PATHS = [
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  join(process.env.LOCALAPPDATA ?? "", "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
];

export function orderByProgId(progId: string | null | undefined): string[] {
  const id = (progId ?? "").toLowerCase();
  if (id.includes("brave")) return [...BRAVE_PATHS, ...CHROME_PATHS, ...EDGE_PATHS];
  if (id.includes("chrome")) return [...CHROME_PATHS, ...EDGE_PATHS, ...BRAVE_PATHS];
  if (id.includes("edge") || id.includes("msedge")) return [...EDGE_PATHS, ...CHROME_PATHS, ...BRAVE_PATHS];
  return [...EDGE_PATHS, ...CHROME_PATHS, ...BRAVE_PATHS];
}

/** The default-browser ProgId from the user's URL association, or null off-Windows. */
function defaultBrowserProgId(): string | null {
  if (process.platform !== "win32") return null;
  try {
    const out = execFileSync(
      "reg",
      ["query", "HKCU\\SOFTWARE\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice", "/v", "ProgId"],
      { encoding: "utf8", timeout: 3000, windowsHide: true },
    );
    return /ProgId\s+REG_SZ\s+(\S+)/.exec(out)?.[1] ?? null;
  } catch {
    return null; // no registry / denied → fall back to the static order
  }
}

function findBrowser(override?: string): string | null {
  if (override && existsSync(override)) return override;
  const env = process.env.ZEMORY_BROWSER?.trim();
  if (env && existsSync(env)) return env;
  return orderByProgId(defaultBrowserProgId()).find((p) => existsSync(p)) ?? null;
}

/** Marker recording which browser BUILT a profile (see profileBrowser). */
const BRAND_FILE = ".zemory-browser";

/** Khe tài khoản → tên thư mục profile. `main` giữ ĐÚNG tên cũ để profile đang đăng nhập
 *  không bị coi là khe mới (đổi tên = mất phiên, đúng thứ tính năng này tránh). */
export function accountSlot(platformKey: string, account?: string): string {
  const a = (account ?? "main").trim();
  return !a || a === "main" ? platformKey : `${platformKey}-${a.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** Cổng riêng cho từng khe: hai tài khoản mở hai cửa sổ, chung cổng là mất CDP một cái. */
export function accountPort(base: number, account?: string): number {
  const a = (account ?? "main").trim();
  if (!a || a === "main") return base;
  const n = Number(a);
  return base + (Number.isFinite(n) && n > 0 ? n * 10 : 10);
}

/**
 * Which browser to open THIS profile with.
 *
 * A profile belongs to the browser that created it. Chrome and Edge are both Chromium
 * but their profile stores are not interchangeable, so pointing the other one at an
 * existing profile risks resetting it — and a reset profile means the signed-in session
 * is gone, i.e. exactly the "log in again" the default-browser fix was meant to avoid.
 *
 * So: an EXISTING profile keeps its browser (marker file), and only a NEW profile picks
 * the machine's default. Switching on purpose = delete the profile dir (and log in once).
 */
/**
 * TRẢ PHIÊN TỪ BẢN DỜI-SANG-BÊN — đối xứng còn thiếu của cú `renameSync … -bak-` bên dưới.
 *
 * Vì sao (user chốt 2026-09-02, *"phải mở lên nhận được dù có đang mở brave"*): luật "máy mặc
 * định THẮNG" dời profile sang bên mỗi khi Windows đổi trình duyệt mặc định — nhưng không có
 * đường NGƯỢC LẠI, nên một cú đổi khứ-hồi (đo 01–02/09: Brave → Edge → Brave trong MỘT ngày)
 * giết phiên của mọi khe hai lần dù bản dời nào cũng còn nguyên trên đĩa. App giữ phiên chuẩn
 * (Electron/Playwright) không bao giờ vứt profile của chính nó; đây là đưa zemory về chuẩn đó.
 *
 * Ba điều kiện, mỗi cái một lý do:
 *  · chỉ bản bak CÙNG HÃNG với exe sắp mở — cookie hãng khác không giải mã được (App-Bound
 *    Encryption), trả về chỉ đổi vỏ lấy vỏ;
 *  · chỉ khi profile sống KHÔNG có phiên (`jarHasSession === false`) — có phiên, hoặc KHÔNG
 *    ĐỌC ĐƯỢC (cửa sổ đang mở giữ khoá ⇒ `null`), đều không đụng;
 *  · chỉ bản bak CÓ phiên — bản mới nhất trước, vỏ rỗng bị bỏ qua.
 * Fail-open toàn phần: khôi phục là tối ưu hoá, không bao giờ được chặn việc mở cửa sổ.
 */
export function restoreShelvedSession(profileDir: string, exe: string, platformKey: string, log: (m: string) => void = () => {}): boolean {
  try {
    if (jarHasSession(join(profileDir, "Default", "Network", "Cookies"), platformKey) !== false) return false;
    const brand = basename(exe).replace(/\.exe$/i, "").toLowerCase();
    const base = basename(profileDir);
    const pref = `${base}.${brand}-bak-`.toLowerCase();
    const stamp = (n: string) => Number(/-bak-(\d+)$/.exec(n)?.[1] ?? 0);
    const cands = readdirSync(dirname(profileDir))
      .filter((n) => n.toLowerCase().startsWith(pref))
      .sort((a, b) => stamp(b) - stamp(a));
    for (const name of cands) {
      const bak = join(dirname(profileDir), name);
      if (jarHasSession(join(bak, "Default", "Network", "Cookies"), platformKey) !== true) continue;
      try {
        if (existsSync(profileDir)) renameSync(profileDir, `${profileDir}.${brand}-bak-${Date.now()}`);
        renameSync(bak, profileDir);
      } catch {
        return false; // một trong hai dir đang bị giữ — để nguyên, lượt sau thử lại
      }
      log(`  restored ${platformKey} session from set-aside profile ${name} — no re-login needed`);
      return true;
    }
  } catch {
    /* fail-open — see the doc block */
  }
  return false;
}

/** @param keepSession profile này có phiên đăng nhập đáng giữ không (xem chú thích trong thân). */
function profileBrowser(profileDir: string, override?: string, keepSession = false, log: (m: string) => void = () => {}): string | null {
  const exe = override && existsSync(override) ? override : findBrowser(override);
  if (!exe) return null;
  const marker = join(profileDir, BRAND_FILE);
  let built: string | null = null;
  try {
    built = readFileSync(marker, "utf8").trim() || null;
  } catch {
    // Không có dấu mà thư mục đã có nội dung ⇒ profile dựng từ trước khi có cơ chế này,
    // và thời đó thứ tự là Edge-first ⇒ coi như Edge.
    //
    // 🔴 TRỪ KHI KHE ĐANG CÓ PHIÊN (vá 2026-09-11, sau khi lỗi này cắn HAI LẦN trong một buổi —
    // M365 rồi Gemini, mỗi lần dời nguyên một phiên đang sống sang `…-bak-` rồi báo "chưa đăng nhập").
    //
    // **Thiếu dấu là thiếu BẰNG CHỨNG, không phải bằng chứng đã đổi hãng.** Suy đoán "chắc là Edge"
    // vốn chỉ nhằm đoán đúng cho profile đời cũ; nhưng khi đoán SAI thì cái giá rơi đúng vào thứ
    // người dùng quý nhất ở đây — phiên đăng nhập (đo trên máy này: profile do Brave dựng, không có
    // dấu, và bị xử như profile Edge). Đổi hãng là việc CÓ THẬT và vẫn được phép; nó chỉ cần một
    // bằng chứng thật: cái dấu do chính zemory ghi.
    //
    // Sai theo hướng nào cũng chỉ mất một lượt: nếu profile thật sự của hãng khác, trình duyệt mặc
    // định mở nó ra không giải mã được cookie ⇒ trang báo chưa đăng nhập ⇒ người dùng đăng nhập một
    // lần — ĐÚNG BẰNG cái giá của nhánh cũ, nhưng không phá một profile đang chạy được.
    try {
      const coNoiDung = readdirSync(profileDir).some((f) => f !== BRAND_FILE);
      if (coNoiDung && !keepSession) built = EDGE_PATHS.find((x) => existsSync(x)) ?? null;
    } catch {
      /* thư mục chưa tồn tại — profile mới tinh */
    }
  }
  // 🔴 MÁY MẶC ĐỊNH THẮNG — kể cả khi profile cũ đang có phiên (chốt lại 2026-08-28 sau khi
  // thử cả hai chiều trong một buổi).
  //
  // Lượt trước tôi đảo thành "profile có phiên thắng" để cứu cookie. Sai ở chỗ nó **khoá
  // người dùng vào hãng cũ vĩnh viễn**: khe `claude` main có phiên ⇒ mãi mãi mở Edge, dù máy
  // mặc định Brave — user: *"nó vẫn mở edge chứ ra chrome đâu"*. Đổi hãng là việc MỘT LẦN,
  // giá là đăng nhập lại một lượt; khoá vĩnh viễn thì không có đường ra.
  //
  // Cái sai THẬT của lần đầu không phải luật này, mà là làm nó **im lặng giữa một việc khác**
  // (thêm Brave vào bộ dò ⇒ mất phiên Claude, không ai được báo). Nên hai ràng buộc ở đây:
  //  · profile cũ **dời sang bên, KHÔNG xoá** — luôn lùi lại được;
  //  · **NÓI RA** rằng khe này phải đăng nhập lại một lần, đừng để người dùng tự đoán.
  if (built && basename(built).toLowerCase() !== basename(exe).toLowerCase()) {
    if (keepSession) {
      log(
        `  đổi trình duyệt cho profile này: ${basename(built)} → ${basename(exe)} (mặc định của máy). ` +
          `Phiên đăng nhập cũ được GIỮ trong bản dời sang bên, nhưng khe này cần ĐĂNG NHẬP LẠI một lần.`,
      );
    }
    try {
      renameSync(profileDir, `${profileDir}.${basename(built).replace(/\.exe$/i, "")}-bak-${Date.now()}`);
    } catch {
      /* đang bị khoá — cứ dùng profile cũ với trình duyệt cũ còn hơn làm hỏng nó */
      return built;
    }
  }
  try {
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(marker, exe, "utf8");
  } catch {
    /* non-fatal: without the marker we just re-resolve next time */
  }
  return exe;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function portUp(port: number): Promise<boolean> {
  try {
    const r = await g.fetch(`http://127.0.0.1:${port}/json/version`);
    return r.ok;
  } catch {
    return false;
  }
}

/** Is the TCP port taken (by anything, CDP or not)? */
function tcpBusy(port: number): Promise<boolean> {
  return new Promise((res) => {
    const srv = createNetServer();
    srv.once("error", () => res(true));
    srv.listen(port, "127.0.0.1", () => srv.close(() => res(false)));
  });
}

/** Ask the OS for a free ephemeral port. */
function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createNetServer();
    srv.once("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const a = srv.address();
      const p = typeof a === "object" && a ? a.port : 0;
      srv.close(() => res(p));
    });
  });
}

/**
 * Tham số dòng lệnh mở trình duyệt. Tách thành hàm THUẦN để cổng kiểm đo được HÀNH VI
 * (mảng tham số thật) thay vì soi CHỮ trong file — bản đầu của cổng grep `--headless` trên
 * cả nguồn và báo oan chính đoạn chú thích giải thích *vì sao không dùng headless*.
 *
 * **KÉO NGẦM đẩy cửa sổ ra ngoài màn hình, KHÔNG chạy chế độ không-giao-diện.** Cả năng lực
 * này sống được là nhờ chạy trong trình duyệt THẬT — `plan/07 §5` đo rõ *"fetch backend-api
 * từ Node thuần: Cloudflare chặn 403"*. Chế độ không-giao-diện là đúng thứ các lớp
 * chống-tự-động-hoá soi đầu tiên, nên đổi lấy nó là đem chính cái đang chạy được ra đánh cược.
 * Toạ độ âm giữ nguyên một Chrome bình thường, chỉ là bạn không thấy nó.
 */
/** Đóng dấu khe tài khoản lên các phiên vừa nạp — xem `ingest.stampAccount`. Im lặng bỏ qua
 *  khi lượt nạp không đẻ phiên nào (fail-open: thiếu dấu không được làm hỏng lượt kéo). */
function stampWebAccount(dbPath: string, report: ScanReport | undefined, account: string, sources: (string | undefined)[]): void {
  const ids = webSessionIds(report, sources);
  if (ids.length) stampAccount(dbPath, ids, account);
}

/**
 * CHỈ phiên của chính nguồn web vừa kéo. `scan()` là lượt nạp TOÀN kho: transcript Claude Code
 * mới nằm trên đĩa cũng nạp cùng lượt và cũng có trong `report.sessions`. Bản cũ đóng dấu
 * hết ⇒ 9 phiên LOCAL trên máy này mang `main`/email ⇒ cây Local tách `claude-code` thành
 * BA hàng (user 2026-08-28: *"éo gì 3 cái claude code khác nhau vậy"*). Phiên local không có
 * tài khoản web — dấu đó là sai dữ liệu, không phải thừa.
 */
export function webSessionIds(report: ScanReport | undefined, sources: (string | undefined)[]): string[] {
  const ok = new Set(sources.filter((s): s is string => !!s));
  return (report?.sessions ?? []).filter((s) => ok.has(s.source)).map((s) => s.id);
}

/**
 * Chờ tab về ĐÚNG nguồn gốc của nền trước khi chạy lời gọi dùng URL tương đối.
 *
 * `false` = quá hạn (tab vẫn không tới được site) — người gọi coi như "chưa xác minh được",
 * KHÔNG được đọc thành "chưa đăng nhập": hai câu đó dẫn tới hai hành động khác nhau, và đọc
 * lẫn chính là lỗi vừa vá (mở cửa sổ đăng nhập cho tài khoản đang đăng nhập).
 */
/**
 * Nối CDP khi tab của nền đã SẴN SÀNG — hỏi lại mỗi giây, tối đa `secs`.
 *
 * Thay cho khuôn "ngủ N giây rồi thử một lần": trình duyệt lạnh dựng cổng CDP chậm hơn mọi
 * con số cố định ta dám đặt, và cái giá của việc đoán sai là **mở thêm một cửa sổ nữa**.
 * Chờ theo trạng thái thì chậm cũng chỉ là chậm, không đẻ ra cửa sổ thừa.
 */
async function connectWhenReady(port: number, tabRe: RegExp, secs: number): Promise<Cdp | null> {
  for (let i = 0; i < secs; i++) {
    const c = await Cdp.connect(port, tabRe);
    if (c) return c;
    await sleep(1000);
  }
  return null;
}

async function awaitOrigin(cdp: Cdp, siteUrl: string, log: (m: string) => void, tries = 20): Promise<boolean> {
  const want = new URL(siteUrl).origin;
  for (let i = 0; i < tries; i++) {
    let here: string | null = null;
    try {
      here = await cdp.evaluate<string>("location.origin");
    } catch {
      /* context đang đổi — thử lại nhịp sau */
    }
    if (here === want) return true;
    await sleep(1000);
  }
  log(`  trang chưa về ${want} sau ${tries}s — KHÔNG kết luận là chưa đăng nhập`);
  return false;
}

export function browserArgs(profileDir: string, port: number, url: string, hidden = false): string[] {
  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    // Chặn hộp "…closed unexpectedly / Restore". Nó nổ mỗi khi lượt trước KHÔNG thoát sạch —
    // mà zemory đóng cửa sổ ngầm bằng `taskkill /T /F`, tức lần nào cũng là "crash" dưới mắt
    // Chromium. Hộp đó CHE trang đăng nhập, nên nó không phải phiền vặt: nó chặn đúng việc
    // duy nhất người dùng cần làm ở cửa sổ này (đo 2026-08-28, user chụp màn hình).
    "--hide-crash-restore-bubble",
    "--disable-session-crashed-bubble",
    // KÍCH THƯỚC cửa sổ. Lượt HIỆN (người đăng nhập) phải đủ RỘNG để thấy trọn form — user chụp
    // 2026-09-02: cửa sổ ra bé xíu vì profile mới tinh không có kích thước đã nhớ, Chromium mở
    // mặc định hẹp. Ép 1200×900 + căn ~góc trên trái có lề, đủ cho account chooser của Google.
    // Lượt NGẦM thì đẩy khuất + thu nhỏ (không ai nhìn, càng nhỏ càng ít tốn vẽ).
    ...(hidden ? ["--window-position=-32000,-32000", "--window-size=1,1"] : ["--window-size=1200,900", "--window-position=120,80"]),
    "--new-window",
    url,
  ];
}


function launchBrowser(exe: string, profileDir: string, port: number, url: string, hidden = false): number | undefined {
  const child = spawn(exe, browserArgs(profileDir, port, url, hidden), { detached: true, stdio: "ignore" });
  child.unref();
  return child.pid;
}

// ── MỘT KHE = MỘT CỬA SỔ ──────────────────────────────────────────────────────────────────
//
// Đo 2026-08-28 (user chụp hai cửa sổ "Sign in - Claude", CDP liệt kê **3** tab `/login` trong
// CÙNG một tiến trình Brave): Chromium là single-instance theo profile — `spawn` lần hai vào
// profile đang chạy KHÔNG dựng tiến trình mới, nó **chuyển giao URL cho tiến trình cũ và mở
// thêm một cửa sổ**. Nên mọi nhánh "mở lại" (chưa thấy tab · cần đăng nhập · CDP rớt) mà gọi
// spawn trong khi trình duyệt còn sống đều đẻ cửa sổ thừa, bất kể nhánh đó cẩn thận tới đâu.
//
// Luật rút ra, làm thành CODE chứ không thành chú thích ở từng nhánh:
//   ① trình duyệt còn sống ⇒ KHÔNG spawn. Thiếu tab thì mở TAB (`/json/new`), không mở cửa sổ.
//   ② sau khi nối được CDP ⇒ nếu có >1 tab cùng nền, ĐÓNG tab thừa (`/json/close`). Lưới này
//      bắt cả ca không kiểm soát được từ trong tiến trình: CLI + daemon cùng spawn, hai request
//      HTTP tới cùng lúc, người dùng bấm hai lần.
//   ③ hai lượt không-probe cho CÙNG khe chạy đồng thời ⇒ dùng chung một lượt (`coalesceByKey`).

/** Tab đang mở trên cổng CDP, chỉ giữ hai trường cần cho phép quyết. */
export interface CdpPage {
  id: string;
  url: string;
  type?: string;
}

async function listPages(port: number): Promise<CdpPage[]> {
  try {
    const t = (await (await g.fetch(`http://127.0.0.1:${port}/json`)).json()) as CdpPage[];
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}

/** Tab THỪA của một nền: mọi tab khớp `tabRe` trừ tab đầu danh sách (DevTools xếp tab đang
 *  hoạt động lên đầu). Tab của nền khác/không phải page thì không đụng — hàm THUẦN để cổng đo. */
export function extraPageIds(pages: CdpPage[], tabRe: RegExp): string[] {
  const mine = pages.filter((t) => (t.type ?? "page") === "page" && tabRe.test(t.url || ""));
  return mine.slice(1).map((t) => t.id);
}

/**
 * Quyết định mở cửa sổ — hàm THUẦN.
 *   `spawn` : trình duyệt chưa chạy ⇒ mở tiến trình mới (cửa sổ đầu tiên, hợp lệ);
 *   `tab`   : đang chạy nhưng không có tab của nền ⇒ mở TAB trong cửa sổ có sẵn;
 *   `none`  : đang chạy và đã có tab ⇒ không làm gì (spawn ở đây = cửa sổ trùng).
 */
export function launchPlan(alive: boolean, hasTab: boolean): "spawn" | "tab" | "none" {
  if (!alive) return "spawn";
  return hasTab ? "none" : "tab";
}

async function openTab(port: number, url: string): Promise<boolean> {
  try {
    const r = await g.fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
    return r.ok;
  } catch {
    return false;
  }
}

/** Đóng tab trùng của nền này; trả số tab đã đóng. Fail-open: đóng không được thì thôi. */
async function closeExtraPages(port: number, tabRe: RegExp, log: (m: string) => void): Promise<number> {
  const ids = extraPageIds(await listPages(port), tabRe);
  let closed = 0;
  for (const id of ids) {
    try {
      const r = await g.fetch(`http://127.0.0.1:${port}/json/close/${id}`);
      if (r.ok) closed++;
    } catch {
      /* tab đã tự đóng — không sao */
    }
  }
  if (closed) log(`  đóng ${closed} tab trùng (một khe chỉ giữ MỘT cửa sổ đăng nhập)`);
  return closed;
}

/**
 * Gộp lượt theo khoá: lời gọi thứ hai tới khi lượt đầu chưa xong thì DÙNG CHUNG promise của
 * lượt đầu, không chạy song song. Dọn khoá khi settle để lượt kế chạy thật. Hàm THUẦN về mặt
 * I/O để cổng đo được (chạy đúng một lần cho N lời gọi đồng thời).
 */
export function coalesceByKey<T>(bag: Map<string, Promise<T>>, key: string, run: () => Promise<T>): { p: Promise<T>; shared: boolean } {
  const have = bag.get(key);
  if (have) return { p: have, shared: true };
  const p = run().finally(() => {
    if (bag.get(key) === p) bag.delete(key);
  });
  bag.set(key, p);
  return { p, shared: false };
}

const inflight = new Map<string, Promise<ScanWebResult>>();

// Không còn một TAB_RE dùng chung: mỗi nền tự khai `tabRe` (xem interface Platform).
// Bản dùng chung khớp MỌI trang web-chat, nên nền này bám nhầm cửa sổ nền kia — đo
// 2026-07-30: quét claude bám vào tab chatgpt.com rồi bắn `/api/organizations` vào đó,
// nhận 404 và báo "chưa đăng nhập" trên một tài khoản đang đăng nhập bình thường.

/** Minimal CDP client over the DevTools WebSocket (Runtime.evaluate only). */
class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (m: any) => void; reject: (e: Error) => void }>();
  private _dead = false;
  private constructor(private ws: any) {
    ws.addEventListener("message", (ev: any) => {
      let m: any;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      const cb = m.id ? this.pending.get(m.id) : undefined;
      if (cb) {
        this.pending.delete(m.id);
        cb.resolve(m);
      }
    });
    // If the socket drops mid-run, every in-flight evaluate() would otherwise
    // await forever → Node exits 13 on the unsettled top-level await (B1).
    // Reject all pending on close/error and mark the client dead so the caller
    // can reconnect instead of hanging.
    const die = (why: string) => {
      if (this._dead) return;
      this._dead = true;
      const err = new Error(`CDP socket ${why}`);
      for (const cb of this.pending.values()) cb.reject(err);
      this.pending.clear();
    };
    ws.addEventListener("close", () => die("closed"));
    ws.addEventListener("error", () => die("error"));
  }

  get dead(): boolean {
    return this._dead;
  }

  /**
   * KÉO CỬA SỔ RA TRƯỚC MẶT — cho lượt do NGƯỜI bấm.
   *
   * 🔴 User bắt 2026-09-02: *"bấm vào link nó mở web mà nó ko tự bung ra trước mặt thì sao mà
   * thấy"*. Đúng: cửa sổ mở sau lưng app thì việc "mở cửa sổ để bạn đăng nhập" coi như không
   * xảy ra.
   *
   * Bản đầu tôi thử `WScript.Shell.AppActivate(pid)` — **đo ra KHÔNG ĂN**: Chromium tự sinh cây
   * tiến trình, nên **pid ta `spawn` thường KHÔNG phải pid sở hữu cửa sổ**; vòng chờ 6 giây không
   * bao giờ thấy `MainWindowHandle`. Đường đúng là bảo CHÍNH trình duyệt tự nâng mình lên:
   * `Page.bringToFront` của CDP nâng cả tab lẫn cửa sổ chứa nó, không phụ thuộc pid, không đụng
   * khoá tiền cảnh của Windows. Và ta ĐÃ nối CDP sẵn ở đây — không thêm hạ tầng nào.
   *
   * Fail-open (điều 9): nâng không được thì cửa sổ vẫn mở, người dùng vẫn bấm vào taskbar được.
   */
  async bringToFront(): Promise<boolean> {
    try {
      await this.send("Page.bringToFront");
      return true;
    } catch {
      return false;
    }
  }

  /** Điều hướng tab sang URL khác (trang "✓ Đã liên kết" sau đăng nhập). Fail-open: lỗi thì thôi. */
  async navigate(url: string): Promise<boolean> {
    try {
      await this.send("Page.navigate", { url });
      return true;
    } catch {
      return false;
    }
  }

  static async connect(port: number, urlRe: RegExp): Promise<Cdp | null> {
    let targets: any[];
    try {
      targets = await (await g.fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      return null;
    }
    const page = targets.find((t) => t.type === "page" && urlRe.test(t.url || ""));
    if (!page?.webSocketDebuggerUrl) return null;
    let ws: any;
    try {
      ws = new g.WebSocket(page.webSocketDebuggerUrl);
      await new Promise<void>((res, rej) => {
        ws.addEventListener("open", () => res());
        ws.addEventListener("error", () => rej(new Error("CDP socket error")));
      });
    } catch {
      return null;
    }
    const cdp = new Cdp(ws);
    try {
      await cdp.send("Runtime.enable");
    } catch {
      cdp.close();
      return null;
    }
    return cdp;
  }

  private send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    if (this._dead) return Promise.reject(new Error("CDP socket dead"));
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (e) {
        this.pending.delete(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  /**
   * Chạy một expr trong trang.
   *
   * CÓ HẠN GIỜ, và đó là điểm chính: `awaitPromise` chờ promise của trang settle, nên một
   * endpoint kiểu long-poll (đo 2026-07-31: `/v1/code/sessions` khi kèm `resume_token`)
   * làm lời gọi này treo VĨNH VIỄN — cả lần chạy đứng im, CPU 0, không lỗi, không log.
   * Hết giờ thì NÉM, để các lớp trên xử như một lần thất bại bình thường (retry/bỏ qua)
   * thay vì cả tiến trình chết cứng.
   */
  async evaluate<T = unknown>(expression: string, timeoutMs = 90_000): Promise<T> {
    const r = (await Promise.race([
      this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`CDP evaluate timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs).unref?.()),
    ])) as any;
    const d = r.result;
    if (d?.exceptionDetails) throw new Error(String(d.exceptionDetails.exception?.description ?? "eval error").slice(0, 200));
    return d?.result?.value as T;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

export interface ScanWebOptions {
  platform?: string;
  port?: number;
  browser?: string;
  /** Asked when the site needs a (re-)login. The login window has ALREADY been
   *  opened/focused when this runs; return true once the user says they are signed
   *  in (auth is then re-checked), false to stop. Omit it for a non-interactive run
   *  (daemon child, piped CLI) — scanWeb then returns status 'need-login' instead of
   *  blocking on a prompt nobody can answer. */
  onNeedLogin?: (ctx: { platform: string; url: string; expired: boolean }) => Promise<boolean>;
  /**
   * NHIỀU TÀI KHOẢN cho cùng một nền. Mặc định `"main"`.
   *
   * Vì sao cần: hội thoại nằm theo TÀI KHOẢN, không theo nền. Đo 2026-07-31 — tài khoản
   * `tai.khoan@congty.example` chỉ có 1 phiên Cowork, còn 3 phiên user cần (*Harness AI
   * frameworks comparison* · *Bootstrap setup* · *Vietnam 34 provinces GRDP dashboard*)
   * nằm ở một tài khoản Claude khác. Không có khe tài khoản thì muốn lấy chúng phải ĐĂNG
   * XUẤT cái đang dùng — mất phiên đã có để lấy phiên khác, rồi lặp lại mãi.
   *
   * Mỗi khe = một profile trình duyệt riêng + một cổng riêng, nên hai tài khoản chạy song
   * song không đụng nhau. Dữ liệu vẫn về CHUNG lane (`claude-web`/`claude-cowork`) và gộp
   * theo session id — hai tài khoản không đẻ hai kho.
   */
  account?: string;
  /** CHỈ hỏi "còn đăng nhập không" rồi trả lời ngay: không mở cửa sổ, không kéo gì.
   *  Dùng cho vòng chờ sau khi người dùng bấm Liên kết — hỏi lại mỗi vài giây thì tuyệt
   *  đối không được đẻ thêm cửa sổ mỗi lần hỏi. */
  probeOnly?: boolean;
  /**
   * KÉO NGẦM: mở cửa sổ ra NGOÀI màn hình thay vì bật vào mặt người dùng.
   *
   * Dành cho nhịp tự động của daemon (user chốt 2026-08-28: *"mọi source đã check là nó phải
   * tự động vào kho"*). Không có nó thì tự-động-kéo = cứ 30 phút bật một cửa sổ Chrome —
   * đúng lý do trước đây năng lực này bị cấm chạy nền.
   *
   * KHÔNG dùng `--headless`: xem chú thích ở `launchBrowser`.
   */
  hidden?: boolean;
  /** Delay between per-conversation fetches (rate-limit friendly). */
  delayMs?: number;
  /** Re-pull conversations already in the memory (default false = resume/skip). */
  refresh?: boolean;
  /** Pull at most N new conversations (newest first) — for quick verify. */
  limit?: number;
  /** Ingest every N pulled conversations so a mid-run crash keeps progress. */
  batchSize?: number;
  dbPath?: string;
}

export interface ScanWebResult {
  status: "need-login" | "done" | "login-only" | "no-browser" | "no-tab" | "excluded";
  platform: string;
  /** The memory lane this platform ingests into (`claude-web`, `chatgpt-web`). Reported
   *  so the caller quotes THIS lane's totals: it used to print the first `*-web` agent
   *  in the scan report, i.e. a claude pull ended with ChatGPT's 859 sessions. */
  source?: string;
  url?: string;
  email?: string | null;
  total?: number;
  pulled?: number;
  skipped?: number;
  failed?: number;
  /** True if the CDP link dropped and could not be recovered — re-run to resume. */
  interrupted?: boolean;
  /** status 'need-login' happened MID-RUN (the session expired while pulling), not
   *  at the start. Distinguishes "never signed in" from "was signed in, then lost
   *  it" — the second one carries partial pulled/failed counts worth reporting. */
  authExpired?: boolean;
  scan?: ScanReport;
  onProgress?: never;
}

/**
 * Wait for the user to (re-)authenticate on the site.
 *
 * The window is opened/focused FIRST, then the caller's `ask` runs — the old code
 * only opened a window when the debug port was down, so a run against an already
 * running browser with an expired session printed "a browser window is open at …"
 * when nothing had been opened. Auth is re-checked after each answer, so claiming
 * "done" without logging in loops instead of failing the run.
 *
 * Without `ask` (non-TTY / daemon child) it opens the window and returns false at
 * once: a background job must never hang on a prompt.
 */
export async function awaitLogin(io: {
  checkAuth: () => Promise<boolean>;
  openWindow: () => void | Promise<void>;
  ask?: () => Promise<boolean>;
  log?: (m: string) => void;
  maxRounds?: number;
}): Promise<boolean> {
  const { checkAuth, openWindow, ask, log = () => {}, maxRounds = 5 } = io;
  await openWindow();
  if (!ask) return false;
  for (let round = 1; round <= maxRounds; round++) {
    if (!(await ask())) return false;
    if (await checkAuth()) return true;
    log(`  still not signed in — check the browser window (attempt ${round}/${maxRounds})`);
  }
  return false;
}

/** Fetch one conversation with a small backoff on transient failures (429/5xx).
 *  Short-circuits when the CDP socket has died so the caller can reconnect
 *  instead of wasting the full backoff on a dead connection. */
async function fetchConv(cdp: Cdp, p: Platform, id: string): Promise<any | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (cdp.dead) return null;
    try {
      return await cdp.evaluate(p.convExpr(id));
    } catch (e) {
      if (process.env.ZEMORY_WEB_DEBUG === "1") console.error(`    [debug] ${id}: ${e instanceof Error ? e.message : String(e)}`);
      if (cdp.dead) return null;
      await sleep(1500 * (attempt + 1)); // 1.5s, 3s, 4.5s, 6s
    }
  }
  return null;
}

/** Reconnect after a CDP drop (B1). If the browser PROCESS is gone (port down,
 *  not just a socket blip), relaunch it — the persistent profile stays logged in
 *  — so a long backfill survives a browser crash/close, not only a dropped
 *  socket. `relaunch` reopens the window; omit it to only re-attach. */
async function reconnect(port: number, tabRe: RegExp, log: (m: string) => void, relaunch?: () => void | Promise<void>): Promise<Cdp | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s, 8s
    log(`  CDP dropped — reconnecting (attempt ${attempt + 1}/4)…`);
    if (relaunch && !(await portUp(port))) {
      log("  browser gone — relaunching window…");
      await relaunch();
      await sleep(6000);
    }
    const c = await Cdp.connect(port, tabRe);
    if (c) {
      log("  reconnected.");
      return c;
    }
  }
  return null;
}

/**
 * Capture web-chat for one platform. Two-step by design: the first run launches
 * the login window (returns 'need-login'); after the user signs in, re-running
 * pulls + ingests. Resumes by skipping conversations already in the memory.
 */
/**
 * Vỏ bọc: chạy lượt quét, và ở chế độ NGẦM thì ĐÓNG cửa sổ mình đã mở — trên MỌI đường thoát.
 *
 * Vì sao là vỏ bọc chứ không nhét vào thân hàm: thân có **tám** điểm `return` khác nhau
 * (`no-browser` · `no-tab` · `need-login` · `done` …). Rải lệnh đóng vào từng chỗ thì chỉ cần
 * thêm một nhánh thoát mới là rò một tiến trình Chrome ẩn — thứ không ai nhìn thấy để mà báo.
 * `finally` ở một chỗ là bất biến giữ được khi code lớn lên.
 *
 * Chỉ đóng cửa sổ do CHÍNH lượt này mở (`owned.pid`): cửa sổ người dùng đang tự đăng nhập
 * KHÔNG được đụng tới.
 */
export async function scanWeb(
  opts: ScanWebOptions = {},
  log: (msg: string) => void = () => {},
): Promise<ScanWebResult> {
  // Hai lượt KHÔNG-probe cho cùng khe chạy chồng nhau là đúng cách đẻ hai cửa sổ (cả hai
  // thấy cổng chưa lên ⇒ cả hai spawn). Probe không mở gì nên không cần xếp hàng.
  if (opts.probeOnly) return scanWebOnce(opts, log);
  const key = accountSlot(opts.platform ?? "chatgpt", opts.account);
  const { p, shared } = coalesceByKey(inflight, key, () => scanWebOnce(opts, log));
  if (shared) log(`  khe ${key} đang có một lượt khác chạy — dùng chung kết quả, không mở thêm cửa sổ`);
  return p;
}

async function scanWebOnce(opts: ScanWebOptions, log: (msg: string) => void): Promise<ScanWebResult> {
  const owned: { pid?: number } = {};
  try {
    return await scanWebInner(opts, log, owned);
  } finally {
    if (opts.hidden && owned.pid) await closeBrowserTree(owned.pid, log);
  }
}

/**
 * Đóng cây tiến trình trình duyệt đã mở ngầm. Fail-open: đóng không được thì chỉ ghi log.
 *
 * 🔴 CỬA SỔ BỎ LẠI LÀ RÁC NGƯỜI DÙNG NHÌN THẤY (bug user bắt 2026-09-02, kèm ảnh thanh taskbar
 * có 3 icon Edge). Bản cũ dùng `execFileSync` với trần **8 giây** và nó ETIMEDOUT thật: đo trên
 * máy này `taskkill /T /F` phải dọn cây Edge **34 tiến trình**, 8 s không đủ. Log chứng minh —
 * 3 lần liên tiếp `spawnSync taskkill ETIMEDOUT` ở 02:15 · 02:18 · 02:23, đúng 3 cửa sổ còn nằm
 * lại. Mỗi lượt web gặp `need-login` là bỏ lại thêm một cửa sổ, không có gì dọn.
 *
 * Ba thay đổi, mỗi cái trị một vế:
 *  ① **BẤT ĐỒNG BỘ** (`execFile` thay `execFileSync`) — bản cũ chặn event loop của daemon suốt
 *     8 giây mỗi lần; nới trần mà vẫn đồng bộ là biến một lỗi rác thành một lỗi treo.
 *  ② **Trần 30 s** thay 8 s — đủ cho cây tiến trình lớn.
 *  ③ **THỬ LẠI một lần** rồi mới chịu thua: `taskkill` trượt lần đầu lúc trình duyệt đang bận
 *     ghi profile là chuyện thường, và lần hai gần như luôn ăn.
 * Vẫn fail-open: hết cách thì ghi log rõ ràng chứ không ném — đóng cửa sổ là việc dọn dẹp, không
 * được phép làm hỏng lượt kéo đã thành công.
 */
async function closeBrowserTree(pid: number, log: (msg: string) => void): Promise<void> {
  const kill = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (process.platform !== "win32") {
        try {
          process.kill(-pid, "SIGTERM");
          resolve();
        } catch (e) {
          reject(e);
        }
        return;
      }
      // Chrome đẻ một cây tiến trình con (renderer/gpu/utility) — giết mỗi tiến trình cha
      // để lại cả đàn con mồ côi. `/T` mới dọn hết.
      execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { timeout: 30_000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  try {
    await kill();
  } catch {
    try {
      await kill(); // lần hai: trượt lần đầu lúc trình duyệt đang bận ghi profile là chuyện thường
    } catch (e) {
      log(`  không đóng được cửa sổ ngầm (pid ${pid}): ${e instanceof Error ? e.message.slice(0, 80) : e}`);
    }
  }
}

async function scanWebInner(
  opts: ScanWebOptions,
  log: (msg: string) => void,
  owned: { pid?: number },
): Promise<ScanWebResult> {
  const p = PLATFORMS[opts.platform ?? "chatgpt"];
  if (!p) return { status: "no-browser", platform: opts.platform ?? "?" };
  // Scope áp NGAY LÚC NẠP (plan 08 §4). Kéo về rồi mới lọc ở recall là vẫn để dữ liệu của
  // một lane đã bị loại nằm trong kho — chưa kể ở đây còn tốn cả một phiên trình duyệt và
  // hàng trăm request. Chặn TRƯỚC khi mở cửa sổ là rẻ nhất và đúng ý "không lấy lane này".
  const lanes = getScopeExclude();
  // Cả hàng NGUỒN lẫn hàng TÀI KHOẢN (khoá = email đã ghi ở `webAuth` của khe này): bỏ tick một tài khoản
  // là tài khoản đó KHÔNG được kéo/nạp/embed (user chốt 2026-08-29: *"cái nào check tức là source đó được
  // phép lên GM và được embed"*). Khe chưa có email ⇒ chỉ xét được cấp nguồn.
  const slot0 = accountSlot(p.key, opts.account);
  const who0 = getWebAuth()[slot0 === p.key ? p.key : slot0.replace(`${p.key}-`, `${p.key}#`)]?.who;
  const laneHere = { origin: "web", host: hostname() || "unknown", source: p.source, ...(isEmail(who0) ? { account: who0 } : {}) };
  if (lanes.length && (isExcluded({ origin: "web", host: laneHere.host, source: p.source }, lanes) || isExcluded(laneHere, lanes))) {
    log(`lane ${p.source}${who0 ? ` · ${who0}` : ""} đang bị loại khỏi phạm vi (memory scope) — bỏ qua, không mở trình duyệt.`);
    return { status: "excluded", platform: p.key, source: p.source, url: p.url };
  }
  // Khe này có PHIÊN ĐÁNG GIỮ không — đọc từ chính sổ `webAuth` mà bảng trạng thái đọc, nên
  // hai bề mặt không thể nói khác nhau. Quyết định nó chi phối: có phiên ⇒ giữ nguyên hãng
  // trình duyệt đã dựng profile (cookie là toàn bộ giá trị của thư mục đó); không có phiên ⇒
  // dựng lại theo trình duyệt MẶC ĐỊNH của máy.
  const authSlot = !opts.account || opts.account === "main" ? p.key : `${p.key}#${opts.account}`;
  const hasSession = getWebAuth()[authSlot]?.ok === true;

  // Per-platform default port so a rerun reuses THIS platform's window. Sharing one
  // port across platforms was the bug: the second window cannot bind it, so the first
  // one answers and the run drives the wrong site. When no CDP answers there AND
  // something else holds the TCP port, launching would silently fail to bind — pick a
  // free ephemeral port instead.
  const slot = accountSlot(p.key, opts.account);
  let port = opts.port ?? accountPort(p.port, opts.account);
  if (opts.port == null && !(await portUp(port)) && (await tcpBusy(port))) {
    const busy = port;
    port = await freePort();
    log(`port ${busy} is taken by another process — using ${port} for this run`);
  }
  const delayMs = opts.delayMs ?? 1500; // ~1 req / 1.5s eases the ~200-req 429 wall
  const limit = opts.limit && opts.limit > 0 ? opts.limit : Infinity;
  const batchSize = opts.batchSize && opts.batchSize > 0 ? opts.batchSize : 25;
  const dbPath = opts.dbPath ?? currentMemoryDb();
  const profileDir = join(currentMemoryDir(), "browser", slot);
  const importDir = join(currentMemoryDir(), "imports", p.key);
  // 🔴 LƯỢT DÒ KHÔNG ĐƯỢC ĐỂ LẠI DẤU CHÂN (user 2026-09-11: *"sao cứ tự nối quài vậy"*).
  // Hai `mkdirSync` này vốn chạy vô điều kiện ở dòng đầu, kể cả khi `probeOnly` chỉ định hỏi
  // *"khe này còn đăng nhập không"* rồi thoát. Nhưng thư mục profile KHÔNG phải rác vô hại:
  // `platformsInUse()` định nghĩa "nền đang dùng" = **có thư mục** ⇒ một lượt dò tự phong cho
  // nền đó tư cách đang-dùng, và các lượt quét GỘP sau nhận nó vào. Đo được: hai nền Microsoft
  // vừa khai xong, mở app một lần là có ngay `browser/mscopilot` · `browser/m365copilot` ·
  // hai thư mục `imports/` — không ai bấm gì.
  // Dò thì CHỈ ĐỌC; chỉ lượt làm việc thật mới được tạo thư mục.
  if (!opts.probeOnly) {
    mkdirSync(profileDir, { recursive: true });
    mkdirSync(importDir, { recursive: true });
  }

  // Reopen the window on a browser crash/close mid-run (persistent profile stays
  // logged in) so a long backfill self-heals instead of aborting at the socket.
  // Cửa sổ do CHÍNH lượt này mở — nhịp nền phải đóng lại khi xong, không thì mỗi lượt để
  // lại một Chrome ẩn và sau một ngày là hàng chục tiến trình không ai thấy.
  // MỘT KHE = MỘT CỬA SỔ (xem khối chú thích trên `extraPageIds`): đây là ĐƯỜNG DUY NHẤT
  // được spawn, và nó chỉ spawn khi trình duyệt của khe CHƯA chạy. Còn chạy mà thiếu tab thì
  // mở TAB; đã có tab thì không làm gì. Mọi nhánh "mở lại" bên dưới đều đi qua đây.
  const relaunch = async (): Promise<void> => {
    const alive = await portUp(port);
    const hasTab = alive && extraPageIds([{ id: "x", url: "" }, ...(await listPages(port))], p.tabRe).length > 0;
    // `hasTab` đọc bằng chính hàm đếm tab thừa với một tab giả chèn đầu: có ≥1 tab thật
    // khớp ⇒ nó bị đếm là "thừa" ⇒ có tab. Một thước cho hai câu hỏi, không lệch nhau được.
    switch (launchPlan(alive, hasTab)) {
      case "spawn": {
        const exe = profileBrowser(profileDir, opts.browser, hasSession, log);
        if (exe) {
          restoreShelvedSession(profileDir, exe, p.key, log);
          owned.pid = launchBrowser(exe, profileDir, port, p.url, opts.hidden) ?? owned.pid;
        }
        return;
      }
      case "tab":
        log(`  trình duyệt của khe đang chạy — mở TAB ${p.url} trong cửa sổ sẵn có, không mở cửa sổ mới`);
        if (!(await openTab(port, p.url))) log("  không mở được tab qua CDP — giữ nguyên, không spawn (spawn lúc này là cửa sổ trùng)");
        return;
      case "none":
        return;
    }
  };

  if (!(await portUp(port))) {
    // Vòng chờ đăng nhập hỏi lại liên tục — cửa sổ chưa sống thì trả lời "chưa" chứ
    // KHÔNG mở thêm cửa sổ, không thì mỗi nhịp hỏi lại bật một cửa sổ mới.
    if (opts.probeOnly) return { status: "need-login", platform: p.key, source: p.source, url: p.url };
    const exe = profileBrowser(profileDir, opts.browser, hasSession, log);
    if (!exe) return { status: "no-browser", platform: p.key, source: p.source, url: p.url };
    restoreShelvedSession(profileDir, exe, p.key, log);
    // Name the browser: on a machine whose default is Chrome, an unexplained Edge
    // window reads as "the tool is doing something odd" (reported 2026-07-30).
    log(`opening ${p.key} window in ${basename(exe)} (log in there once)…`);
    await relaunch();
  }

  // Only ever attach to a tab of THIS platform. The port can be up while holding some
  // other window (a stale run, the other platform); reusing it drives the wrong site.
  //
  // 🔴 CHỜ TAB XUẤT HIỆN, đừng ngủ rồi mở thêm (vá 2026-08-28). Bản cũ: `sleep(6000)` → thử
  // nối → hụt → **`relaunch()` lần nữa**. Trình duyệt lạnh mất hơn 6 giây để dựng xong cổng
  // CDP, nên lượt nào cũng rơi vào nhánh đó và bật **HAI cửa sổ** cho cùng một khe — user
  // chụp đúng hai cửa sổ "Sign in - Claude - Brave". Chờ theo trạng thái thì cửa sổ thứ hai
  // không còn lý do tồn tại; và nếu 25 s vẫn không có tab thì mới đáng mở lại một lần.
  let first = await connectWhenReady(port, p.tabRe, 25);
  if (!first && !opts.probeOnly) {
    log(`  ${p.key}: chưa thấy tab sau 25s — mở lại một lần nữa`);
    await relaunch();
    first = await connectWhenReady(port, p.tabRe, 25);
  }
  if (!first) return { status: "no-tab", platform: p.key, source: p.source, url: p.url };
  // KÉO RA TRƯỚC MẶT — chỉ khi cửa sổ này DÀNH CHO NGƯỜI (`!opts.hidden`). Lượt ngầm mà nhảy ra
  // trước mặt là đúng thứ vừa bị bắt lỗi ở lượt trước: máy không được tự đòi sự chú ý.
  // Đặt SAU khi CDP nối được, vì lúc đó cửa sổ chắc chắn đã tồn tại — nâng sớm hơn là nâng vào
  // hư không (đúng lý do `AppActivate` theo pid không ăn: pid ta spawn không sở hữu cửa sổ).
  if (!opts.hidden) await first.bringToFront();
  // Lưới tự lành: dù ai spawn trùng (CLI + daemon · hai request tới cùng lúc · bấm hai lần),
  // tới đây một khe chỉ còn ĐÚNG MỘT tab của nền.
  // 🔴 PROBE KHÔNG ĐƯỢC ĐÓNG GÌ (đảo vế cũ *"Probe cũng dọn — nó là lượt chạy dày nhất"*, 2026-08-29).
  // Probe chạy 5 s/lượt suốt lúc người dùng ĐANG đăng nhập; Google OAuth của Claude mở thêm một
  // trang claude.ai ⇒ probe thấy "2 tab" ⇒ đóng một — trúng tab duy nhất của cửa sổ chính ⇒ cả
  // trình duyệt thoát ĐÚNG lúc đăng nhập vừa xong. Đo: 4 profile (khe 2·4·5·main) đều chết kiểu
  // `exit_type: Normal` trong 1–3 phút sau khi mở, sổ chưa lần nào thấy đăng nhập; user: *"đăng
  // nhập xong nó xoay xong app ko thấy thay đổi gì"*. Một lượt chỉ-đọc mà ghi/đóng là bề mặt
  // tự phá thứ nó đang đo — dọn tab là việc của lượt KÉO, sau khi đã đăng nhập.
  if (!opts.probeOnly) await closeExtraPages(port, p.tabRe, log);
  // Typed non-nullable on purpose: the reconnect paths below reassign it, and a
  // `Cdp | null` would widen back to nullable inside the closures that use it.
  let cdp: Cdp = first;

  try {
    // Auth is re-checkable at any point, not just at the start: a session can expire
    // in the middle of a long backfill, and before this every such conversation just
    // counted as `failed` — a rate-limit-shaped log for an auth problem.
    let email: string | null = null;
    const checkAuth = async (): Promise<boolean> => {
      if (cdp.dead) {
        const rc = await reconnect(port, p.tabRe, log, relaunch);
        if (!rc) return false;
        cdp = rc;
      }
      // 🔴 CHỜ TRANG VỀ ĐÚNG NGUỒN GỐC, đừng chờ đồng hồ (vá 2026-08-28).
      //
      // `authExpr` gọi bằng URL TƯƠNG ĐỐI (`/api/organizations`), nên nó chỉ đúng khi tab đã
      // ở trên chính site đó. Trước đây sau khi mở cửa sổ chỉ `sleep(6000)` rồi eval — với
      // Edge lạnh / profile vừa dựng lại thì 6 s KHÔNG đủ, tab còn `about:blank` và lỗi ra là
      // `Failed to parse URL from /api/organizations`, mà lỗi đó bị đọc thành **"chưa đăng
      // nhập"** ⇒ mở thêm cửa sổ đăng nhập cho một tài khoản ĐANG đăng nhập. Đo được đúng ca
      // này trên khe `claude#3` (tài khoản công ty): hai lượt liên tiếp báo need-login sai.
      //
      // Chờ theo TRẠNG THÁI (đã tới origin chưa) thay vì theo THỜI GIAN — cùng doctrine với
      // `02_RULES §Hành xử`: đo cái mình cần biết, đừng đoán bằng một con số thời gian.
      if (!(await awaitOrigin(cdp, p.url, log))) return false;
      try {
        const a = await cdp.evaluate<{ token: boolean; email: string | null; err?: string }>(p.authExpr);
        if (a?.token) {
          email = a.email ?? null;
          return true;
        }
        if (a?.err) log(`  auth check: ${a.err}`);
      } catch {
        /* transient (socket blip / context destroyed) — treated as "not now" */
      }
      return false;
    };
    /** Open the login window. Measured 2026-07-30: spawning the same profile while the
     *  browser is ALREADY running hands the URL to the running instance (the second
     *  process exits code 0 in ~70ms) and a new window appears — CDP on the port stays
     *  intact. Whether the OS raises that window to the front was not measured, so the
     *  wording to the user stays "a window is open at …", not "in front of you". */
    // 🔴 KHÔNG mở cửa sổ thứ hai khi cửa sổ ĐẦU đã ở trên site (vá 2026-08-28).
    //
    // Đường thường: `scanWeb` vừa mở một cửa sổ trỏ `p.url`, auth trả 403 (chưa đăng nhập) ⇒
    // trang đang hiện CHÍNH form đăng nhập. `relaunch()` ở đây bật thêm một cửa sổ nữa cho
    // đúng thứ đã có — user chụp được hai cửa sổ "Sign in - Claude - Brave" cạnh nhau. Hai
    // cửa sổ giống hệt còn tệ hơn phiền: người dùng không biết phải gõ vào cái nào.
    //
    // Chỉ mở khi thật sự KHÔNG có cửa sổ thấy được: chế độ NGẦM (cửa sổ ở ngoài màn hình,
    // người dùng không tới được) hoặc CDP đã chết (cửa sổ đã bị đóng).
    // 🔄 2026-08-28 (tối): cờ `loginShown` bản trước chỉ chặn lần gọi ĐẦU — lần hai (phiên hết
    // hạn GIỮA lúc kéo) rơi thẳng xuống spawn ⇒ cửa sổ trùng. Nay không cần cờ: `relaunch()` tự
    // biết trình duyệt còn sống thì không spawn (luật ① ở `extraPageIds`).
    const openLogin = async (): Promise<void> => {
      if (!opts.hidden && !cdp.dead) {
        log("  cửa sổ đăng nhập ĐANG MỞ sẵn — đăng nhập vào đó, không mở thêm cửa sổ");
        return;
      }
      await relaunch();
      await sleep(4000);
    };
    const askLogin = (expired: boolean) =>
      opts.onNeedLogin ? () => opts.onNeedLogin!({ platform: p.key, url: p.url, expired }) : undefined;

    if (opts.probeOnly) {
      const ok = await checkAuth();
      return { status: ok ? "done" : "need-login", platform: p.key, source: p.source, url: p.url, email, pulled: 0, skipped: 0, failed: 0 };
    }
    if (!(await checkAuth())) {
      log(`not signed in to ${p.url} (or the session expired) — opening the login window`);
      const ok = await awaitLogin({ checkAuth, openWindow: openLogin, ask: askLogin(false), log });
      if (!ok) return { status: "need-login", platform: p.key, source: p.source, url: p.url };
    }

    // Nền hạng CHỈ-NỐI: xác thực xong là HẾT việc của lượt này. Dừng ở đây thay vì đi tiếp và trả
    // `done · 0` — "đã kéo, không có gì" và "chưa mở được đường kéo" là hai sự thật khác nhau, và
    // bề mặt không được phép nói cái sai (`02_RULES §Bề mặt CHẾT THEO nền`).
    if (p.loginOnly) {
      log(`${p.key}: đã nối${email ? ` (${email})` : ""} — nền này chưa mở đường KÉO hội thoại (xem plan/07 §17)`);
      return { status: "login-only", platform: p.key, source: p.source, url: p.url, email, total: 0, pulled: 0, skipped: 0, failed: 0 };
    }

    // Resume. TRƯỚC ĐÂY: "id đã có trong bộ nhớ ⇒ bỏ qua" — nên một hội thoại CŨ mà bạn
    // chat thêm thì KHÔNG BAO GIỜ được kéo lại, và mọi lần quét đều báo "+0 tin mới".
    // Đo 2026-07-30: 5/25 hội thoại mới nhất của tài khoản có `update_time` mới hơn tin
    // cuối đang lưu, và cả 5 đều bị bỏ qua. Nay so THỜI ĐIỂM: chỉ bỏ qua khi bản trên nền
    // không mới hơn bản mình đang giữ.
    const have = new Map<string, number>(); // session id → mốc thời gian đang giữ (ms)
    const pulledFile = join(importDir, "_pulled.json");
    let pulledAt: Record<string, number> = {};
    if (!opts.refresh) {
      const db = openMemory(dbPath);
      try {
        for (const r of db.prepare("SELECT id, ended_at FROM sessions WHERE source = ?").all(p.source) as { id: string; ended_at: string | null }[]) {
          have.set(r.id, r.ended_at ? Date.parse(r.ended_at) : 0);
        }
      } finally {
        db.close();
      }
      // Mốc `update_time` của lần kéo trước, nếu có. Chính xác hơn `ended_at` (vốn là giờ
      // của TIN cuối, luôn sớm hơn giờ hội thoại được cập nhật) — thiếu nó thì 5 hội thoại
      // kia sẽ kéo lại mỗi lần quét dù không có gì mới.
      try {
        const m = JSON.parse(readFileSync(pulledFile, "utf8"));
        if (m && typeof m === "object") pulledAt = m as Record<string, number>;
      } catch {
        /* chưa có sổ — lần đầu sau khi nâng cấp, rơi về so với ended_at */
      }
    }

    // The list eval can return empty/undefined (or throw) if the page is still
    // warming up right after launch, or if the socket blips — retry with backoff
    // (reconnecting a dead socket) before giving up, so a slow first paint no
    // longer crashes the run. A logged-in account always has ≥1 conversation, so
    // an empty result means "not ready yet", not "nothing to do".
    // Mỗi mục: id + mốc cập nhật trên nền. Chấp nhận CẢ chuỗi trần (hợp đồng cũ) lẫn
    // {id, updated} — không có mốc thì coi như "không biết", và quyết theo `ended_at`.
    let ids: { id: string; at: number; title?: string }[] | undefined;
    const asItem = (x: unknown): { id: string; at: number; title?: string } | null => {
      if (typeof x === "string") return { id: x, at: 0 };
      const o = x as { id?: unknown; updated?: unknown; title?: unknown };
      if (typeof o?.id !== "string") return null;
      const u = o.updated;
      const at = typeof u === "number" ? u * 1000 : typeof u === "string" ? Date.parse(u) : 0;
      return { id: o.id, at: Number.isFinite(at) ? at : 0, ...(typeof o.title === "string" && o.title.trim() ? { title: o.title } : {}) };
    };
    for (let attempt = 0; attempt < 5; attempt++) {
      if (cdp.dead) {
        const rc = await reconnect(port, p.tabRe, log, relaunch);
        if (!rc) return { status: "no-tab", platform: p.key, source: p.source, url: p.url, interrupted: true };
        cdp = rc;
      }
      try {
        const raw = await cdp.evaluate<unknown>(p.listExpr);
        if (Array.isArray(raw) && raw.length) {
          ids = raw.map(asItem).filter((x): x is { id: string; at: number; title?: string } => x !== null);
          break;
        }
        // Mảng RỖNG thật ở lượt cuối = tài khoản không có hội thoại nào (đo 2026-08-28: org
        // `Global` 0 hội thoại). Đó là kết quả, KHÔNG phải "tab chưa sẵn sàng" — báo `no-tab`
        // ở đây là bề mặt nói dối về một cửa sổ đang mở ngay trước mặt người dùng.
        if (Array.isArray(raw) && attempt === 4) ids = [];
      } catch {
        /* transient (execution context destroyed / socket blip) — retry */
      }
      if (ids) break;
      log(`  conversation list not ready — retrying (${attempt + 1}/5)…`);
      await sleep(2500 * (attempt + 1));
    }
    if (!ids) return { status: "no-tab", platform: p.key, source: p.source, url: p.url };
    log(`enumerated ${ids.length} loose conversation(s)`);
    // Phiên nào nền LIỆT KÊ ra là của tài khoản ĐANG đăng nhập — đóng dấu danh tính lên cả
    // phiên đã có trong kho (sẽ bị bỏ qua lúc kéo). Phiên khe này từng kéo cho tài khoản KHÁC
    // thì không nằm trong danh sách ⇒ giữ nguyên, không bị "đổi chủ" (xem `webslots.accountKey`).
    if (isEmail(email)) {
      const n = restampAccount(dbPath, ids.map((x) => `${p.sessionPrefix}${x.id}`), email);
      if (n) log(`  gắn ${n} phiên đã có vào tài khoản ${email}`);
    }

    // Project ("folder") map: gizmo id → name. Used both to LABEL pulled chats
    // (→ project_root) and to enumerate each project's chats below. Non-fatal —
    // if it can't be fetched, loose chats still ingest, just without labels.
    let projects: Record<string, string> = {};
    if (p.projectsExpr) {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cdp.dead) {
          const rc = await reconnect(port, p.tabRe, log, relaunch);
          if (!rc) break;
          cdp = rc;
        }
        try {
          const m = await cdp.evaluate<Record<string, string>>(p.projectsExpr);
          if (m && typeof m === "object") {
            projects = m;
            break;
          }
        } catch {
          /* transient — retry */
        }
        await sleep(1500 * (attempt + 1));
      }
      log(`  mapped ${Object.keys(projects).length} project(s)`);
      // Persist the id→name map next to the transcripts so a later bulk "Export
      // data" import (which carries only gizmo ids) can still resolve names.
      if (Object.keys(projects).length) {
        try {
          writeFileSync(join(importDir, "_projects.json"), JSON.stringify(projects), "utf8");
        } catch {
          /* non-fatal */
        }
      }
    }

    // A Project's chats are NOT in the loose list — enumerate each project's
    // conversations here, ONE short eval per page (Node drives the cursor). A
    // socket blip only costs the current page (reconnect + retry the project),
    // never the whole run. Merge + dedupe into ids so the pull loop covers all.
    if (p.projectConvsExpr && Object.keys(projects).length) {
      const seen = new Set(ids.map((x) => x.id));
      let added = 0;
      for (const gid of Object.keys(projects)) {
        let cursor: string | null = null;
        for (let pg = 0; pg < 300; pg++) {
          if (cdp.dead) {
            const rc = await reconnect(port, p.tabRe, log, relaunch);
            if (!rc) break;
            cdp = rc;
          }
          let res: { ids?: unknown; cursor?: unknown } | undefined;
          try {
            res = await cdp.evaluate<{ ids?: unknown; cursor?: unknown }>(p.projectConvsExpr(gid, cursor));
          } catch {
            break; // give up on this project; others still run
          }
          const pageIds = Array.isArray(res?.ids) ? (res!.ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
          for (const cid of pageIds) {
            if (!seen.has(cid)) {
              seen.add(cid);
              ids.push({ id: cid, at: 0 });
              added++;
            }
          }
          cursor = typeof res?.cursor === "string" ? res!.cursor : null;
          if (!cursor) break;
          await sleep(200);
        }
      }
      log(`  + ${added} conversation(s) across ${Object.keys(projects).length} project(s) → ${ids.length} total`);
    }

    // B2: ingest in batches so a mid-run crash never loses what was pulled. Each
    // batch (current batch only) is written to one reused file and ingested via
    // the normal scan() → chatgptAdapter (origin=web). Resume skips by memory
    // content, not by file, so a leftover file is harmless.
    const partFile = join(importDir, "scan-web-part.json");
    let batch: unknown[] = [];
    let pulled = 0;
    let skipped = 0;
    let failed = 0;
    let ingested = 0;
    let lastScan: ScanReport | undefined;

    const flush = () => {
      if (!batch.length) return;
      writeFileSync(partFile, JSON.stringify(batch), "utf8");
      lastScan = scan({ dbPath });
      stampWebAccount(dbPath, lastScan, accountKey(email, opts.account ?? "main"), [p.source, p.sub?.source]);
      // Sổ mốc đi cùng nhịp ingest: crash giữa chừng thì phần đã nạp không bị kéo lại.
      try {
        writeFileSync(pulledFile, JSON.stringify(pulledAt), "utf8");
      } catch {
        /* non-fatal — mất sổ chỉ tốn một lần kéo thừa */
      }
      ingested += batch.length;
      log(`  ingested ${ingested} conversation(s) so far (batch of ${batch.length})`);
      batch = [];
    };

    let interrupted = false;
    let consecFail = 0;
    for (let i = 0; i < ids.length; i++) {
      if (pulled >= limit) break;
      // Resume key = what the ADAPTER stores, per platform. This was hardcoded
      // `chatgpt-` while the claude adapter writes `claudeweb-<uuid>`, so nothing
      // ever matched on claude and every run re-pulled the whole account.
      const sid = `${p.sessionPrefix}${ids[i].id}`;
      // Bỏ qua CHỈ KHI bản trên nền không mới hơn bản mình giữ. Mốc so sánh: `update_time`
      // của lần kéo trước (chính xác), thiếu thì lấy giờ tin cuối trong bộ nhớ.
      const held = Math.max(pulledAt[ids[i].id] ?? 0, have.get(sid) ?? 0);
      if (have.has(sid) && held > 0 && ids[i].at > 0 && ids[i].at <= held) {
        skipped++;
        continue;
      }
      if (have.has(sid) && ids[i].at === 0) {
        skipped++; // nền không cho biết mốc ⇒ giữ nguyên hành vi cũ, đừng kéo lại cả kho
        continue;
      }
      let c = await fetchConv(cdp, p, ids[i].id);
      if (!c && cdp.dead) {
        // Persist progress, then try to recover the (still-alive) browser.
        flush();
        const fresh = await reconnect(port, p.tabRe, log, relaunch);
        if (fresh) {
          cdp = fresh;
          c = await fetchConv(cdp, p, ids[i].id);
        }
      }
      if (c) {
        // Stamp the Project ("folder") NAME so the adapter labels project_root with
        // something readable. Per-platform key: ChatGPT hides it in `gizmo_id`,
        // claude.ai in `project_uuid` — and claude's detail payload has `project:null`,
        // so without this map the label is a raw uuid.
        const pkey = p.projectKeyOf?.(c);
        if (pkey && projects[pkey]) (c as { __zemory_project?: string }).__zemory_project = projects[pkey];
        // TIÊU ĐỀ chỉ có ở DANH SÁCH trên một số nền — payload chi tiết không mang nó (đo 2026-09-11
        // trên Gemini: `hNvQHb` trả các lượt, không trả tên hội thoại). Dập vào đây, đúng khuôn lane
        // phụ Cowork đã dùng từ 07-31; phiên không tên thì recall khó dùng.
        if (ids[i].title && !(c as { title?: unknown }).title) (c as { title?: string }).title = ids[i].title;
        batch.push(c);
        pulled++;
        consecFail = 0;
        // Ghi mốc đã kéo: lần sau so bằng chính con số nền dùng, khỏi kéo lại vì lệch
        // vài phút giữa "giờ tin cuối" và "giờ hội thoại được cập nhật".
        if (ids[i].at > 0) pulledAt[ids[i].id] = ids[i].at;
      } else {
        failed++;
        consecFail++;
        // A run of failures means either rate limiting or an EXPIRED session. Tell
        // them apart by asking the site who we are, instead of marking hundreds of
        // conversations 'failed' under a log that looks like throttling.
        if (consecFail >= 3) {
          if (!(await checkAuth())) {
            flush();
            log("the site session expired mid-run — a re-login is needed to continue");
            const back = await awaitLogin({ checkAuth, openWindow: openLogin, ask: askLogin(true), log });
            if (!back) {
              return {
                status: "need-login",
                platform: p.key,
                source: p.source,
                url: p.url,
                authExpired: true,
                email,
                total: ids.length,
                pulled,
                skipped,
                failed,
                scan: lastScan,
              };
            }
            consecFail = 0;
            i--; // retry the conversation the expiry ate
            continue;
          }
          consecFail = 0; // signed in but failing → rate limit; keep going with backoff
        }
      }
      if (batch.length >= batchSize) flush();
      if (cdp.dead) {
        interrupted = true; // couldn't recover — bail; re-run resumes
        break;
      }
      if ((i + 1) % 20 === 0 || i === ids.length - 1) log(`  pulled ${pulled} · skipped ${skipped} · failed ${failed} (${i + 1}/${ids.length})`);
      await sleep(delayMs);
    }
    flush();

    // ── LANE PHỤ (Cowork trên claude.ai) ────────────────────────────────────────
    // Cùng cửa sổ, cùng phiên đăng nhập, chỉ khác bộ sưu tập — nên chạy nối đuôi ở đây
    // thay vì mở một nền thứ ba. Hỏng ở đây KHÔNG được kéo kết quả lane chính xuống
    // (fail-open, điều 9): phần chat đã ingest xong rồi.
    let subPulled = 0;
    if (p.sub && !interrupted && !cdp.dead) {
      const sub = p.sub;
      const subDir = join(currentMemoryDir(), "imports", sub.importKey);
      mkdirSync(subDir, { recursive: true });
      try {
        const rawSub = await cdp.evaluate<unknown>(sub.listExpr);
        const subIds = Array.isArray(rawSub) ? rawSub.map(asItem).filter((x): x is { id: string; at: number; title?: string } => x !== null) : [];
        log(`  ${sub.key}: enumerated ${subIds.length} session(s)`);
        if (isEmail(email)) restampAccount(dbPath, subIds.map((x) => `${sub.sessionPrefix}${x.id}`), email);
        const subHave = new Map<string, number>();
        if (!opts.refresh) {
          const db = openMemory(dbPath);
          try {
            for (const r of db.prepare("SELECT id, ended_at FROM sessions WHERE source = ?").all(sub.source) as { id: string; ended_at: string | null }[]) {
              subHave.set(r.id, r.ended_at ? Date.parse(r.ended_at) : 0);
            }
          } finally {
            db.close();
          }
        }
        const subBatch: unknown[] = [];
        for (const it of subIds) {
          if (subPulled >= limit) break;
          const sid = `${sub.sessionPrefix}${it.id}`;
          const held = subHave.get(sid) ?? 0;
          if (subHave.has(sid) && (it.at === 0 || (held > 0 && it.at <= held))) continue;
          try {
            const one = await cdp.evaluate<unknown>(sub.convExpr(it.id));
            if (one) {
              // Tiêu đề CHỈ có ở danh sách — GET một phiên không trả nó (đo 2026-07-31),
              // và phiên không tên thì recall khó dùng.
              if (it.title && !(one as { title?: unknown }).title) (one as { title?: string }).title = it.title;
              subBatch.push(one);
              subPulled++;
            }
          } catch (e) {
            log(`  ${sub.key}: ${it.id} failed (${e instanceof Error ? e.message.slice(0, 60) : e})`);
          }
          await sleep(delayMs);
        }
        if (subBatch.length) {
          writeFileSync(join(subDir, "scan-web-part.json"), JSON.stringify(subBatch), "utf8");
          lastScan = scan({ dbPath });
      stampWebAccount(dbPath, lastScan, accountKey(email, opts.account ?? "main"), [p.source, p.sub?.source]);
          log(`  ${sub.key}: ingested ${subBatch.length} session(s)`);
        }
      } catch (e) {
        log(`  ${sub.key}: lane failed, phần chat vẫn giữ nguyên (${e instanceof Error ? e.message.slice(0, 80) : e})`);
      }
    }

    return { status: "done", platform: p.key, source: p.source, email, total: ids.length, pulled: pulled + subPulled, skipped, failed, interrupted, scan: lastScan };
  } finally {
    cdp.close();
  }
}

// ── Quét MỌI nền/tài khoản web đang dùng trên máy ────────────────────────────
// Dời từ `ui.ts` xuống đây 2026-08-28. Vì sao: đây là NGHIỆP VỤ (nền nào đang dùng, khe
// tài khoản nào, ghi lại kết quả xác thực), mà `03_STRUCTURE §4` nói daemon/`ui.ts` là
// "surface mỏng… nghiệp vụ vẫn ở domain" và `tools/` "CHỈ khai báo + nối, thực thi
// delegate slot sẵn có". Để nguyên trong surface thì tool MCP muốn quét web phải kéo cả
// máy chủ HTTP vào tiến trình của nó — nhân cái lệch chuẩn lên thay vì nắn nó.

/** Một dòng kết quả kéo web cho MỘT nền, đủ để bề mặt quyết định có phải hỏi đăng nhập không. */
export interface WebScanRow {
  platform: string;
  /** Khe tài khoản ("main", "2", …) — cùng một nền có thể có nhiều tài khoản, và hội
   *  thoại nằm theo TÀI KHOẢN chứ không theo nền. */
  account?: string;
  status: string;
  url?: string;
  pulled?: number;
  skipped?: number;
  failed?: number;
  /** Mất phiên GIỮA lúc kéo (khác "chưa đăng nhập bao giờ") — phần đã kéo vẫn được lưu. */
  authExpired?: boolean;
  /** Có phiên ĐANG đăng nhập sẵn trong trình duyệt thật ⇒ mượn được, khỏi gõ mật khẩu.
   *  Chỉ gắn khi thật sự có cookie: mời mượn rồi báo "trình duyệt cũng đăng xuất" thì
   *  tệ hơn là không mời. */
  canBorrow?: { from: string; label: string; profile: string; cookies: number } | null;
  error?: string;
}

// `WEB_PLATFORMS` · `platformsInUse` · `accountsOf` đã DỜI sang `webslots.ts` (2026-08-28):
// bốn nơi cần chúng (scanweb · connections · scheduler · scope), mà `scanweb → scope` đã có
// sẵn nên `scope → scanweb` là import VÒNG TRÒN. Re-export để nơi gọi cũ không phải đổi.
export { WEB_PLATFORMS, accountsOf, platformsInUse, pullableAccountsOf };

/**
 * Kết vòng đăng nhập 2 bước (user chốt 2026-08-29): sau khi daemon xác nhận đăng nhập + kéo xong,
 * điều hướng CHÍNH tab đăng nhập sang trang "✓ Đã liên kết" của zemory — người dùng có tín hiệu rõ
 * ngay trong cửa sổ vừa dùng, thay vì bị Claude/ChatGPT trả về trang chủ như chưa có gì xảy ra.
 * Lượt kéo kế tiếp tự mở lại tab nền (`launchPlan` → "tab") nên tab này không cản gì. Fail-open.
 */
export async function showLinkedPage(platform: string, account: string | undefined, url: string): Promise<boolean> {
  const p = PLATFORMS[platform];
  if (!p) return false;
  const cdp = await Cdp.connect(accountPort(p.port, account), p.tabRe);
  if (!cdp) return false;
  try {
    return await cdp.navigate(url);
  } finally {
    cdp.close();
  }
}

/**
 * `opts.hidden`: kéo NGẦM (cửa sổ ngoài màn hình, đóng khi xong) — cho mọi đường KHÔNG phải người dùng
 * bấm "Liên kết": nút Quét, nhịp nền. Đo 2026-08-29 (user: *"tui ko bấm gì để mở đăng nhập mà sao nó
 * cứ tự mở trang brave của claude"*): `/memory-scan` gọi hàm này KHÔNG ẩn ⇒ mỗi lần Quét là một cửa sổ
 * Brave HIỆN cho từng khe (`browser gone — relaunching window` trong log lúc 04:10), và khe mất phiên
 * còn mở luôn form đăng nhập không ai xin. Cửa sổ hiện chỉ được mở khi người dùng bấm nối (`/connect`).
 */
/**
 * Nền nào được vào một lượt quét — 🔴 **CHỈ NỐI KHI ĐƯỢC GỌI TÊN** (user chốt 2026-09-10:
 * *"chưa nối vào thật nha, chỉ khi t bấm mới nối vào"*; nhắc lại 2026-09-12 khi giao thêm sáu nền:
 * *"chỉ tạo đường nối chứ ko nối sẵn"*).
 *
 * Nền hạng `loginOnly` chưa mở đường kéo, nên đưa nó vào một lượt quét GỘP thì không được gì mà lại
 * bật một cửa sổ đăng nhập người dùng không yêu cầu — cùng doctrine với khe `need-login` bị loại
 * khỏi vòng tự kéo (2026-09-02: *"chỉ bật đăng nhập khi user chọn thôi"*). `only` nêu tên = cú
 * bấm/lệnh tường minh cho ĐÚNG nền đó ⇒ chạy; `only` rỗng (nút Quét chung, nhịp nền) ⇒ bỏ qua. Một
 * profile trống do lượt dò để lại KHÔNG được biến thành lời mời đăng nhập.
 *
 * Hàm THUẦN và tách riêng có chủ đích: luật này là thứ giữ lời hứa "không tự nối", nên nó phải đo
 * được bằng HÀNH VI. Bản trước nằm inline trong một hàm async mở trình duyệt ⇒ cổng chỉ soi được
 * CHỮ trong mã nguồn, mà chính repo này đã ghi điểm yếu đó: *"nó đỏ vì code DỜI NHÀ, không vì hành
 * vi sai"* (`scanweb-platforms.test`).
 */
export function platformsForScan(only: string[] | undefined, inUse: string[]): string[] {
  const named = new Set(only ?? []);
  return (only ?? inUse)
    .filter((k) => WEB_PLATFORMS.includes(k))
    .filter((k) => named.has(k) || !PLATFORMS[k]?.loginOnly);
}

export async function scanWebPlatforms(only?: string[], account?: string, opts: { hidden?: boolean } = {}): Promise<WebScanRow[]> {
  const list = platformsForScan(only, platformsInUse());
  const out: WebScanRow[] = [];
  for (const platform of list) {
    // Không truyền khe cụ thể ⇒ quét MỌI tài khoản của nền đó. Bỏ sót khe nào là hội
    // thoại của tài khoản đó không bao giờ vào bộ nhớ.
    // Khe ĐÁNG KÉO thôi — xem `pullableAccountsOf`. Lặp mọi thư mục profile là mở một cửa
    // sổ đăng nhập cho mỗi khe đã mất phiên, thứ người dùng không hề yêu cầu.
    for (const acct of account ? [account] : pullableAccountsOf(platform)) {
      try {
        // Log về `daemon.log`: đường này chạy trong daemon (nút Liên kết · watcher · webTick),
        // bản trước nuốt log ⇒ cửa sổ mở cổng nào, vì sao "need-login" — không ai biết (28/08).
        const r = await scanWeb({ platform, account: acct, hidden: opts.hidden }, (m) => daemonLog(`[web ${platform}#${acct}${opts.hidden ? " ngầm" : ""}] ${m.trim()}`));
        // Ghi lại kết quả kiểm để bảng "Liên kết" có cái THẬT mà hiện — nó không tự mở
        // trình duyệt đi kiểm mỗi lần vẽ được.
        const laneKey = acct === "main" ? platform : `${platform}#${acct}`;
        // `login-only` = ĐÃ NỐI (chỉ chưa mở đường kéo). Ghi false ở đây là hàng nguồn báo mất phiên oan.
        setWebAuth(laneKey, r.status === "done" || r.status === "login-only", r.email ?? undefined);
        // Sổ KÉO ghi ở MỌI đường kéo, không riêng nhịp nền. Trước đây chỉ `webTick`/watcher ghi
        // ⇒ lane kéo bằng nút/CLI mang dấu "•  chưa kéo lần nào" vĩnh viễn dù đã có 31.803 tin
        // (user 2026-08-29: *"mấy cái ko check là sao"*). Chỉ ghi khi lượt này THỰC SỰ kéo
        // (done/hỏng lúc kéo) — `need-login`/`no-browser` là chuyện nối, đã có `webAuth` nói.
        if (r.status === "done") setWebPull(laneKey, { ok: true, status: r.status, pulled: r.pulled });
        out.push({
          platform,
          account: acct,
          status: r.status,
          url: r.url,
          pulled: r.pulled,
          skipped: r.skipped,
          failed: r.failed,
          authExpired: r.authExpired,
          canBorrow: r.status === "need-login" ? findBorrowSource(platform) : undefined,
        });
      } catch (e) {
        out.push({ platform, account: acct, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return out;
}
