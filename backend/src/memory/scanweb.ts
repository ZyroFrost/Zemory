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

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { basename, join } from "node:path";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./db.js";
import { type ScanReport, scan } from "./ingest.js";

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
const CLAUDE_ORG_JS =
  "const _r=await fetch('/api/organizations');" +
  "if(!_r.ok) return _no('HTTP '+_r.status);" +
  "const _o=await _r.json(); const _l=Array.isArray(_o)?_o:[];" +
  "const _caps=_l.some(function(x){return x&&Array.isArray(x.capabilities);});" +
  "const _org=_l.find(function(x){return x&&Array.isArray(x.capabilities)&&x.capabilities.indexOf('chat')>=0;})||(_caps?null:(_l[0]||null));" +
  "if(!_org||!_org.uuid) return _no(_caps?'no organization with the chat capability':'no organization');" +
  "const org=_org.uuid;";

const CLAUDE_AUTH = `(async()=>{const _no=function(m){return {token:false,err:m};};
  try{
    ${CLAUDE_ORG_JS}
    return {token:true, email:(_org.name||null)};
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
    const ids=[]; let off=0;
    for(let p=0;p<300;p++){
      const r = await fetch('/api/organizations/'+org+'/chat_conversations?limit=100&offset='+off);
      if(!r.ok) break;
      const j = await r.json();
      const items = Array.isArray(j) ? j : ((j && j.data) || []);
      for(const c of items){ if(c && c.uuid) ids.push({id:c.uuid, updated:c.updated_at}); }
      off += items.length;
      if(items.length < 100) break;
      await new Promise(res=>setTimeout(res,200));
    }
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
    const map={}; let off=0;
    for(let p=0;p<50;p++){
      const r = await fetch('/api/organizations/'+org+'/projects?limit=100&offset='+off);
      if(!r.ok) break;
      const j = await r.json();
      const items = Array.isArray(j) ? j : ((j && j.data) || []);
      let fresh=0;
      for(const it of items){ if(it && it.uuid && !(it.uuid in map)){ map[it.uuid]=(it.name||it.uuid); fresh++; } }
      off += items.length;
      if(items.length < 100 || !fresh) break;
      await new Promise(res=>setTimeout(res,200));
    }
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
    const H=${COWORK_HEADERS};
    const r=await fetch('/v1/code/sessions?tags=cowork-remote&limit=100&include_trigger_sessions=true',{headers:H});
    if(!r.ok) return [];
    const j=await r.json(); const items=(j&&j.data)||[];
    const out=[];
    for(const s of items){ if(s&&s.id) out.push({id:s.id, updated:(s.last_event_at||s.updated_at||s.created_at), title:(s.title||s.name||null)}); }
    return out;
  }catch(e){ return []; }
})()`;

// Một phiên Cowork = metadata + toàn bộ event. Gộp sẵn ở đây để adapter chỉ việc đọc
// một object duy nhất, đúng khuôn "một file → nhiều phiên" như hai adapter web kia.
const coworkConv = (id: string): string =>
  `(async()=>{const _no=function(m){throw new Error(m);};` +
  CLAUDE_ORG_JS +
  `const H=${COWORK_HEADERS};` +
  `const m=await fetch('/v1/code/sessions/${id}',{headers:H});` +
  `const meta=m.ok?await m.json():{};` +
  // Cũng MỘT lời gọi: `resume_cursor` là con trỏ của luồng theo dõi, không phải trang kế
  // — dùng nó để phân trang là rơi vào cùng cái bẫy long-poll của danh sách phiên.
  `const r=await fetch('/v1/code/sessions/${id}/events?limit=500',{headers:H});` +
  `if(!r.ok) throw new Error('HTTP '+r.status);` +
  `const j=await r.json(); const out=(j&&j.data)||[];` +
  `return {id:'${id}', title:(meta&&(meta.title||meta.name))||null, created_at:(meta&&meta.created_at)||null, last_event_at:(meta&&meta.last_event_at)||null, events:out};})()`;

const claudeConv = (id: string): string =>
  // MỘT DÒNG, như bản chatgpt. Bản đầu tôi viết nhiều dòng và pull fail 2/2 — cùng URL,
  // dò riêng qua CDP thì cả 4 biến thể đều trả 200. Khác biệt duy nhất là xuống dòng.
  // `_no` NÉM ở đây (khác các expr trên): fetchConv dựa vào exception để retry/backoff.
  `(async()=>{const _no=function(m){throw new Error(m);};` +
  CLAUDE_ORG_JS +
  `const r=await fetch('/api/organizations/'+org+'/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true');` +
  `if(!r.ok) throw new Error('HTTP '+r.status); return r.json();})()`;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

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
export function orderByProgId(progId: string | null | undefined): string[] {
  const id = (progId ?? "").toLowerCase();
  if (id.includes("chrome")) return [...CHROME_PATHS, ...EDGE_PATHS];
  if (id.includes("edge") || id.includes("msedge")) return [...EDGE_PATHS, ...CHROME_PATHS];
  return [...EDGE_PATHS, ...CHROME_PATHS];
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
function profileBrowser(profileDir: string, override?: string): string | null {
  const exe = override && existsSync(override) ? override : findBrowser(override);
  if (!exe) return null;
  const marker = join(profileDir, BRAND_FILE);
  let built: string | null = null;
  try {
    built = readFileSync(marker, "utf8").trim() || null;
  } catch {
    // Không có dấu mà thư mục đã có nội dung ⇒ profile dựng từ trước khi có cơ chế này,
    // và thời đó thứ tự là Edge-first ⇒ coi như Edge.
    try {
      if (readdirSync(profileDir).some((f) => f !== BRAND_FILE)) built = EDGE_PATHS.find((x) => existsSync(x)) ?? null;
    } catch {
      /* thư mục chưa tồn tại — profile mới tinh */
    }
  }
  // Trình duyệt của MÁY thắng (user chốt 2026-07-30: máy mặc định Chrome thì đừng bật
  // Edge). Nhưng KHÔNG mở profile của hãng khác — hai profile Chromium không thay thế
  // được cho nhau, mở chéo là hỏng profile. Dời bản cũ sang một bên (giữ lại, không
  // xoá) rồi dựng profile mới cho đúng hãng.
  if (built && basename(built).toLowerCase() !== basename(exe).toLowerCase()) {
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

function launchBrowser(exe: string, profileDir: string, port: number, url: string): void {
  const child = spawn(
    exe,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--no-default-browser-check", "--new-window", url],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

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
   * `huy.nguyen@sasin.vn` chỉ có 1 phiên Cowork, còn 3 phiên user cần (*Harness AI
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
  status: "need-login" | "done" | "no-browser" | "no-tab";
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
async function reconnect(port: number, tabRe: RegExp, log: (m: string) => void, relaunch?: () => void): Promise<Cdp | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s, 8s
    log(`  CDP dropped — reconnecting (attempt ${attempt + 1}/4)…`);
    if (relaunch && !(await portUp(port))) {
      log("  browser gone — relaunching window…");
      relaunch();
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
export async function scanWeb(
  opts: ScanWebOptions = {},
  log: (msg: string) => void = () => {},
): Promise<ScanWebResult> {
  const p = PLATFORMS[opts.platform ?? "chatgpt"];
  if (!p) return { status: "no-browser", platform: opts.platform ?? "?" };
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
  mkdirSync(profileDir, { recursive: true });
  mkdirSync(importDir, { recursive: true });

  // Reopen the window on a browser crash/close mid-run (persistent profile stays
  // logged in) so a long backfill self-heals instead of aborting at the socket.
  const relaunch = () => {
    const exe = profileBrowser(profileDir, opts.browser);
    if (exe) launchBrowser(exe, profileDir, port, p.url);
  };

  if (!(await portUp(port))) {
    // Vòng chờ đăng nhập hỏi lại liên tục — cửa sổ chưa sống thì trả lời "chưa" chứ
    // KHÔNG mở thêm cửa sổ, không thì mỗi nhịp hỏi lại bật một cửa sổ mới.
    if (opts.probeOnly) return { status: "need-login", platform: p.key, source: p.source, url: p.url };
    const exe = profileBrowser(profileDir, opts.browser);
    if (!exe) return { status: "no-browser", platform: p.key, source: p.source, url: p.url };
    // Name the browser: on a machine whose default is Chrome, an unexplained Edge
    // window reads as "the tool is doing something odd" (reported 2026-07-30).
    log(`opening ${p.key} window in ${basename(exe)} (log in there once)…`);
    relaunch();
    await sleep(6000);
  }

  // Only ever attach to a tab of THIS platform. The port can be up while holding some
  // other window (a stale run, the other platform); reusing it drives the wrong site.
  let first = await Cdp.connect(port, p.tabRe);
  if (!first && !opts.probeOnly) {
    log(`  no ${p.key} tab on port ${port} — opening one…`);
    relaunch();
    await sleep(6000);
    first = await Cdp.connect(port, p.tabRe);
  }
  if (!first) return { status: "no-tab", platform: p.key, source: p.source, url: p.url };
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
    const openLogin = async (): Promise<void> => {
      relaunch();
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
      } catch {
        /* transient (execution context destroyed / socket blip) — retry */
      }
      log(`  conversation list not ready — retrying (${attempt + 1}/5)…`);
      await sleep(2500 * (attempt + 1));
    }
    if (!ids) return { status: "no-tab", platform: p.key, source: p.source, url: p.url };
    log(`enumerated ${ids.length} loose conversation(s)`);

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
