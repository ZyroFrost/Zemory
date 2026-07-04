// Browser-connector: capture web-chat (ChatGPT today) into the brain WITHOUT
// an OAuth/API that doesn't exist and WITHOUT harvesting cookies. It opens a
// dedicated browser window (persistent profile under ~/.zemory/browser/<platform>)
// with a remote-debugging port; the USER logs in there once (password never
// touches zemory), then this drives that logged-in tab over CDP to read the
// site's own conversation API. Pulled conversations are written to the platform
// import folder and ingested by the normal scan() → chatgptAdapter (origin=web).
//
// Runs the fetches INSIDE the real browser tab (via Runtime.evaluate), so they
// carry the live session and pass Cloudflare — a plain Node fetch is blocked.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BRAIN_DB, BRAIN_DIR, openBrain } from "./db.js";
import { type ScanReport, scan } from "./ingest.js";

const g = globalThis as unknown as { fetch: (u: string, o?: unknown) => Promise<any>; WebSocket: any };

interface Platform {
  key: string;
  url: string;
  source: string;
  /** JS (run in-page) returning {token, email}. */
  authExpr: string;
  /** JS (run in-page) returning [{id}] for ALL conversations (paged). */
  listExpr: string;
  /** JS template (run in-page) returning one full conversation by id. */
  convExpr: (id: string) => string;
}

const CHATGPT_LIST = `(async()=>{
  const t=(await (await fetch('/api/auth/session')).json()).accessToken, H={Authorization:'Bearer '+t};
  const ids=[]; let off=0,total=Infinity;
  while(off<total){ const j=await (await fetch('/backend-api/conversations?offset='+off+'&limit=100&order=updated',{headers:H})).json();
    total=j.total??j.items.length; (j.items||[]).forEach(i=>ids.push(i.id)); off+=(j.items||[]).length; if(!(j.items||[]).length)break;
    await new Promise(r=>setTimeout(r,300)); }
  return ids;
})()`;

const PLATFORMS: Record<string, Platform> = {
  chatgpt: {
    key: "chatgpt",
    url: "https://chatgpt.com",
    source: "chatgpt-web",
    authExpr: `fetch('/api/auth/session').then(r=>r.json()).then(j=>({token:!!j.accessToken,email:j.user?.email||null})).catch(e=>({token:false,err:String(e)}))`,
    listExpr: CHATGPT_LIST,
    convExpr: (id: string) =>
      `(async()=>{const t=(await (await fetch('/api/auth/session')).json()).accessToken;` +
      `const r=await fetch('/backend-api/conversation/${id}',{headers:{Authorization:'Bearer '+t}});` +
      `if(!r.ok) throw new Error('HTTP '+r.status); return r.json();})()`,
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

function findBrowser(override?: string): string | null {
  if (override && existsSync(override)) return override;
  const env = process.env.ZEMORY_BROWSER?.trim();
  if (env && existsSync(env)) return env;
  return [...EDGE_PATHS, ...CHROME_PATHS].find((p) => existsSync(p)) ?? null;
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

function launchBrowser(exe: string, profileDir: string, port: number, url: string): void {
  const child = spawn(
    exe,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--no-default-browser-check", "--new-window", url],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

/** Which browser tabs count as a supported web-chat surface. */
const TAB_RE = /chatgpt\.com|openai\.com|gemini\.google|claude\.ai/;

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

  async evaluate<T = unknown>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
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
  /** Delay between per-conversation fetches (rate-limit friendly). */
  delayMs?: number;
  /** Re-pull conversations already in the brain (default false = resume/skip). */
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
  url?: string;
  email?: string | null;
  total?: number;
  pulled?: number;
  skipped?: number;
  failed?: number;
  /** True if the CDP link dropped and could not be recovered — re-run to resume. */
  interrupted?: boolean;
  scan?: ScanReport;
  onProgress?: never;
}

/** Fetch one conversation with a small backoff on transient failures (429/5xx).
 *  Short-circuits when the CDP socket has died so the caller can reconnect
 *  instead of wasting the full backoff on a dead connection. */
async function fetchConv(cdp: Cdp, p: Platform, id: string): Promise<any | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (cdp.dead) return null;
    try {
      return await cdp.evaluate(p.convExpr(id));
    } catch {
      if (cdp.dead) return null;
      await sleep(1500 * (attempt + 1)); // 1.5s, 3s, 4.5s, 6s
    }
  }
  return null;
}

/** Reconnect to the (still-alive, detached) browser after a CDP drop (B1). */
async function reconnect(port: number, log: (m: string) => void): Promise<Cdp | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s
    log(`  CDP dropped — reconnecting (attempt ${attempt + 1}/3)…`);
    const c = await Cdp.connect(port, TAB_RE);
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
 * pulls + ingests. Resumes by skipping conversations already in the brain.
 */
export async function scanWeb(
  opts: ScanWebOptions = {},
  log: (msg: string) => void = () => {},
): Promise<ScanWebResult> {
  const p = PLATFORMS[opts.platform ?? "chatgpt"];
  if (!p) return { status: "no-browser", platform: opts.platform ?? "?" };
  const port = opts.port ?? 9222;
  const delayMs = opts.delayMs ?? 1500; // ~1 req / 1.5s eases the ~200-req 429 wall
  const limit = opts.limit && opts.limit > 0 ? opts.limit : Infinity;
  const batchSize = opts.batchSize && opts.batchSize > 0 ? opts.batchSize : 25;
  const dbPath = opts.dbPath ?? BRAIN_DB;
  const profileDir = join(BRAIN_DIR, "browser", p.key);
  const importDir = join(BRAIN_DIR, "imports", p.key);
  mkdirSync(profileDir, { recursive: true });
  mkdirSync(importDir, { recursive: true });

  if (!(await portUp(port))) {
    const exe = findBrowser(opts.browser);
    if (!exe) return { status: "no-browser", platform: p.key, url: p.url };
    log(`opening ${p.key} window (log in there once)…`);
    launchBrowser(exe, profileDir, port, p.url);
    await sleep(6000);
  }

  let cdp = await Cdp.connect(port, TAB_RE);
  if (!cdp) return { status: "no-tab", platform: p.key, url: p.url };

  try {
    const auth = await cdp.evaluate<{ token: boolean; email: string | null }>(p.authExpr);
    if (!auth?.token) return { status: "need-login", platform: p.key, url: p.url };

    // Resume: skip conversations already ingested (unless --refresh).
    const have = new Set<string>();
    if (!opts.refresh) {
      const db = openBrain(dbPath);
      try {
        for (const r of db.prepare("SELECT id FROM sessions WHERE source = ?").all(p.source) as { id: string }[]) have.add(r.id);
      } finally {
        db.close();
      }
    }

    const ids = await cdp.evaluate<string[]>(p.listExpr);
    log(`enumerated ${ids.length} conversation(s)`);

    // B2: ingest in batches so a mid-run crash never loses what was pulled. Each
    // batch (current batch only) is written to one reused file and ingested via
    // the normal scan() → chatgptAdapter (origin=web). Resume skips by brain
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
      ingested += batch.length;
      log(`  ingested ${ingested} conversation(s) so far (batch of ${batch.length})`);
      batch = [];
    };

    let interrupted = false;
    for (let i = 0; i < ids.length; i++) {
      if (pulled >= limit) break;
      if (have.has(`chatgpt-${ids[i]}`)) {
        skipped++;
        continue;
      }
      let c = await fetchConv(cdp, p, ids[i]);
      if (!c && cdp.dead) {
        // Persist progress, then try to recover the (still-alive) browser.
        flush();
        const fresh = await reconnect(port, log);
        if (fresh) {
          cdp = fresh;
          c = await fetchConv(cdp, p, ids[i]);
        }
      }
      if (c) {
        batch.push(c);
        pulled++;
      } else {
        failed++;
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

    return { status: "done", platform: p.key, email: auth.email, total: ids.length, pulled, skipped, failed, interrupted, scan: lastScan };
  } finally {
    cdp.close();
  }
}
