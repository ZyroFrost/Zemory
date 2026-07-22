// `zemory ui` - live memory UI. The page stays code-native and polls the
// local data layer so new captured messages appear while the user keeps chatting.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { hostname } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { TEMPLATE_DIR, ensureHarness, freshHarness } from "./docs/adopt.js";
import { brainInfo, brainSummary, scan } from "./brain/ingest.js";
import { currentBrainDir, openBrain } from "./brain/db.js";
import { DEFAULT_SEARCH_LIMIT, SNIPPET_MAX_CHARS, getMessageContext, getSessionThread, recall } from "./brain/search.js";
import { relocateBrain, storageInfo } from "./brain/relocate.js";
import { vectorCount, vectorRemaining } from "./brain/vectors.js";
import { runCheck } from "./checks.js";
import { findProjectRoot } from "./core/config.js";
import { analyzeMigration } from "./docs/migrate.js";
import { forgetProject, listKnownProjects, pinProject, pruneDeadProjects } from "./registry.js";
import { gatherStatus } from "./status.js";
import { buildFolderTree } from "./docs/structure-tree.js";
import { getCodeGraph } from "./brain/graph/graph-cache.js";
import { buildNavCost } from "./brain/graph/nav-cost.js";
import { autostartStatus, desktopShortcutStatus, reconcileAutostart, setAutostart, setDesktopShortcut } from "./platform/autostart.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { startSyncJob, stopSyncJob, syncJobStatus } from "./jobs/syncjob.js";
import { cliHoldsWrite, daemonJobBusy } from "./jobs/writegate.js";
import { startTray, stopTray } from "./platform/tray.js";
import { acquireCliWrite, releaseCliWrite } from "./jobs/writegate.js";
import {
  getAutostart,
  getAutosync,
  getDriveDir,
  getHybridSetting,
  getRerankSetting,
  getLang,
  getScheduler,
  getScopeExclude,
  getScopeSetting,
  getSyncLevel,
  getUiState,
  setAutostartSetting,
  setAutosyncSetting,
  setDriveDir,
  setHybridSetting,
  setLang,
  setRerankSetting,
  setSchedulerSetting,
  setScopeExclude,
  setScopeSetting,
  setSyncLevel,
  setUiState,
} from "./settings.js";
import { type ScopeLane, scopeTree, toggleLane } from "./brain/scope.js";
import { PAGE } from "./ui-page.js";
import { onPath } from "./util.js";

interface DriveSummary {
  path: string;
  linked: boolean;
  exists: boolean;
  writable: boolean;
  bundles: number;
  error: string | null;
  /** Sync depth (plan 08 §7): "lean" rows bundle (default) | "full" snapshot. */
  level: "lean" | "full";
}

/** Probe a Drive sync folder: exists? writable? how many bundles inside? */
function probeDrive(dir: string): Omit<DriveSummary, "level"> {
  const path = dir.trim();
  if (!path) return { path: "", linked: false, exists: false, writable: false, bundles: 0, error: null };
  if (/^https?:\/\//i.test(path)) {
    return { path, linked: true, exists: false, writable: false, bundles: 0, error: "web URL — use the LOCAL synced folder (Google Drive Desktop), e.g. G:\\My Drive\\zemory" };
  }
  try {
    if (!statSync(path).isDirectory()) return { path, linked: true, exists: true, writable: false, bundles: 0, error: "not a folder" };
  } catch {
    return { path, linked: true, exists: false, writable: false, bundles: 0, error: "folder not found" };
  }
  let writable = false;
  const probe = join(path, ".zemory-write-probe");
  try {
    writeFileSync(probe, "ok");
    rmSync(probe, { force: true });
    writable = true;
  } catch {
    /* not writable */
  }
  let bundles = 0;
  try {
    bundles = readdirSync(path).filter((f) => f.endsWith(".zemory.enc")).length;
  } catch {
    /* ignore */
  }
  return { path, linked: true, exists: true, writable, bundles, error: writable ? null : "not writable" };
}

function driveSummary(): DriveSummary {
  return { ...probeDrive(getDriveDir()), level: getSyncLevel() };
}

/** Read one harness doc (under <root>/docs) for the file dialog — path-guarded. */
function readDoc(projectRoot: string, rel: string): { ok: boolean; file: string; content: string } {
  const base = resolve(projectRoot, "docs");
  const target = resolve(base, "agent", rel);
  const rl = relative(base, target);
  if (rl.startsWith("..") || isAbsolute(rl)) return { ok: false, file: rel, content: "invalid path" };
  try {
    return { ok: true, file: rel, content: readFileSync(target, "utf8") };
  } catch {
    return { ok: false, file: rel, content: "(file not found — run zemory init/sync to create it)" };
  }
}

/** Read a file from the SHARED STANDARD (docs_template/) — path-guarded. This is
 *  the canonical harness, not any project's docs; the UI loads it read-only. */
function readStandardDoc(rel: string): { ok: boolean; file: string; content: string } {
  const target = resolve(TEMPLATE_DIR, rel);
  const rl = relative(TEMPLATE_DIR, target);
  if (rl.startsWith("..") || isAbsolute(rl)) return { ok: false, file: rel, content: "invalid path" };
  try {
    return { ok: true, file: rel, content: readFileSync(target, "utf8") };
  } catch {
    return { ok: false, file: rel, content: "(standard template file not found)" };
  }
}


// Same folder captured with a different drive-letter case (d:\ vs D:\) is ONE
// project — Windows paths are case-insensitive. recall already matches
// case-insensitively (search.ts), but the coverage view grouped by the RAW
// project_root and so split the same repo into two rows (user 2026-07-21). Group
// by a canonical form (uppercased drive letter) instead. This is a READ-time
// normalization — the stored session rows keep their captured cwd (HP điều 3).
const CANON_ROOT =
  "CASE WHEN substr(project_root,2,1)=':' THEN upper(substr(project_root,1,1))||substr(project_root,2) ELSE project_root END";

function captureCoverage(limit = 10): {
  stores: { source: string; root: string; foundAt: string | null }[];
  projects: { host: string; path: string; sessions: number; messages: number; agents: number; last: string | null }[];
  totals: { stores: number; projectFolders: number };
  /** THIS machine's hostname — lets the UI mark the local group and split
   *  linked (registry) projects from merely-scanned ones (user 2026-07-21). */
  localHost: string;
} {
  const db = openBrain();
  try {
    const stores = db
      .prepare(
        `SELECT source, store_root AS root, found_at AS foundAt
           FROM known_stores
          ORDER BY COALESCE(found_at, '') DESC, source ASC, store_root ASC
          LIMIT ?`,
      )
      .all(limit) as ReturnType<typeof captureCoverage>["stores"];
    // One layer up: group by MACHINE (host) as well as canonical project, so the
    // Projects tab shows each machine and the repos worked on it (user 2026-07-21).
    const projects = db
      .prepare(
        `SELECT COALESCE(host, '(unknown)') AS host,
                ${CANON_ROOT} AS path,
                COUNT(*) AS sessions,
                COALESCE(SUM(message_count), 0) AS messages,
                COUNT(DISTINCT source) AS agents,
                MAX(COALESCE(ended_at, started_at, '')) AS last
           FROM sessions
          WHERE project_root IS NOT NULL AND project_root <> ''
          GROUP BY host, ${CANON_ROOT}
          ORDER BY host ASC, last DESC
          LIMIT 400`,
      )
      .all() as ReturnType<typeof captureCoverage>["projects"];
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM known_stores) AS stores,
           (SELECT COUNT(DISTINCT ${CANON_ROOT})
              FROM sessions
             WHERE project_root IS NOT NULL AND project_root <> '') AS projectFolders`,
      )
      .get() as ReturnType<typeof captureCoverage>["totals"];
    return { stores, projects, totals, localHost: hostname() };
  } finally {
    db.close();
  }
}

// ── Dashboard caching ────────────────────────────────────────────────────────
// The UI polls /brain-status, but every field it shows is a whole-DB
// aggregate: on a 595MB brain one pass costs ~4s of SYNCHRONOUS SQLite work, and
// Node is single-threaded — while it runs, every click, tab switch and search
// waits behind it. Polled every 2.5s that meant the server never caught up (the
// "app rất lag" report, 2026-07-20). Two TTLs, because the numbers move at very
// different speeds; a scan/sync/relocate busts the cache explicitly.
// Must exceed the client poll period (30s) so consecutive polls HIT the cache
// instead of each one triggering a recompute (poll 30s > old TTL 15s meant the
// cache was always expired at poll time — it never protected the poll it existed
// for). Staleness is bounded and safe: scan/sync/relocate invalidate explicitly,
// and the refresh button forces ?fresh=1.
const DASH_TTL_MS = 60_000;
/** Full-table scans (token sum, embed backlog) — barely move between scans. */
const HEAVY_TTL_MS = 300_000;

let dashCache: { at: number; value: Record<string, unknown> } | null = null;
let heavyCache: { at: number; value: { tokensEst: number; count: number; remaining: number } } | null = null;

/** Drop cached stats after anything that actually changes the brain. */
function invalidateDashboard(): void {
  dashCache = null;
  heavyCache = null;
}

/**
 * Drop ONLY the light snapshot, keeping the expensive full-table scans (heavyCache).
 * Use after a change that alters cheap fields (scope tree / exclude rules) but not
 * message/vector counts — the next /brain-status reflects it in ~40ms instead of
 * paying the ~1s heavy recompute.
 */
function invalidateDashboardSoft(): void {
  dashCache = null;
}

/** The expensive aggregates, behind their own long TTL. */
function heavyStats(): { tokensEst: number; count: number; remaining: number } {
  const now = Date.now();
  if (heavyCache && now - heavyCache.at < HEAVY_TTL_MS) return heavyCache.value;
  // Honest token stat: total captured content ≈ chars/4. A REAL number (how much
  // context the brain holds), NOT a "saved" claim — capture itself costs 0 extra
  // tokens (hooks read transcript files, no model call).
  let tokensEst = 0;
  try {
    const db = openBrain();
    try {
      tokensEst = Math.round(
        Number((db.prepare("SELECT COALESCE(SUM(LENGTH(content)),0) AS c FROM messages").get() as { c: number }).c) / 4,
      );
    } finally {
      db.close();
    }
  } catch {
    /* best-effort */
  }
  let count = 0;
  let remaining = 0;
  try {
    count = vectorCount();
    remaining = vectorRemaining();
  } catch {
    /* vector lane is optional — fail open (HP điều 9) */
  }
  const value = { tokensEst, count, remaining };
  heavyCache = { at: now, value };
  return value;
}

function dashboardBrain(opts: { fresh?: boolean } = {}): unknown {
  const now = Date.now();
  if (!opts.fresh && dashCache && now - dashCache.at < DASH_TTL_MS) {
    return { ...dashCache.value, cached: true, cachedAgeMs: now - dashCache.at };
  }
  if (opts.fresh) invalidateDashboard();
  const summary = brainSummary();
  const info = brainInfo();
  const heavy = heavyStats();
  let vectors: { count: number; remaining: number; coverage: number | null; dims: string; error?: string };
  try {
    const messages = Number(summary.totals.messages || 0);
    vectors = {
      count: heavy.count,
      remaining: heavy.remaining,
      coverage: messages ? Number(((heavy.count / messages) * 100).toFixed(1)) : null,
      dims: "768d",
    };
  } catch (error) {
    vectors = {
      count: 0,
      remaining: 0,
      coverage: null,
      dims: "unknown",
      error: error instanceof Error ? error.message : "vector status unavailable",
    };
  }
  const tokensEst = heavy.tokensEst;

  const payload = {
    ...summary,
    info,
    sizeKB: info.sizeKB,
    vectors,
    tokensEst,
    coverage: captureCoverage(),
    // The MEASURED cost of USING the brain (not a counterfactual "saved" number,
    // which HP điều 12 forbids): a default recall injects at most
    // DEFAULT_SEARCH_LIMIT hits × SNIPPET_MAX_CHARS chars of snippet ≈ tokens/4.
    // Full message text is opened on demand (progressive disclosure, HP điều 8).
    recall: {
      hits: DEFAULT_SEARCH_LIMIT,
      snippetChars: SNIPPET_MAX_CHARS,
      tokensApprox: Math.round((DEFAULT_SEARCH_LIMIT * SNIPPET_MAX_CHARS) / 4),
    },
    hybrid: getHybridSetting(),
    rerank: getRerankSetting(),
    scope: getScopeSetting(),
    scopeTree: safeScopeTree(),
    scopeExcluded: getScopeExclude().length,
    scopeRules: getScopeExclude(),
    drive: driveSummary(),
    storage: safeStorage(),
    lang: getLang(),
    generatedAt: new Date().toISOString(),
  };
  dashCache = { at: now, value: payload };
  return { ...payload, cached: false, cachedAgeMs: 0 };
}

/** Provenance tree for the Global-memory panel; fail-open to empty on any error. */
function safeScopeTree(): unknown {
  try {
    return scopeTree();
  } catch {
    return [];
  }
}

/** Where the brain DB lives (for the UI "storage folder" control). */
function safeStorage(): unknown {
  try {
    return storageInfo();
  } catch {
    return null;
  }
}

function resolveBrowser(): string | null {
  if (process.platform === "win32") {
    const fixed = [
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ];
    return onPath("msedge") ?? onPath("chrome") ?? fixed.find(existsSync) ?? null;
  }
  if (process.platform === "darwin") {
    const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return existsSync(mac) ? mac : null;
  }
  return onPath("google-chrome") ?? onPath("chromium") ?? onPath("microsoft-edge");
}

/** File recording the cockpit browser window's pid — one window per machine. */
function windowPidFile(): string {
  return join(currentBrainDir(), "cockpit", "window.pid");
}

/**
 * Close the window a PREVIOUS `zemory ui` opened, so a new open REPLACES it
 * instead of piling up (user: "mở mới phải tắt cũ, đừng đẻ một đống icon ma").
 * The pid file records `pid|imageName`; the kill is FILTERED by that image so a
 * REUSED pid (the file survives manual window closes and reboots) can never
 * take down an unrelated process (audit 2026-07-21).
 */
function closePrevWindow(): void {
  try {
    const f = windowPidFile();
    if (!existsSync(f)) return;
    const [pidRaw, image = ""] = readFileSync(f, "utf8").trim().split("|");
    const pid = Number(pidRaw);
    rmSync(f, { force: true });
    if (!Number.isInteger(pid) || pid <= 0) return;
    if (process.platform === "win32") {
      // /T also ends the render/gpu children; the IMAGENAME filter makes a
      // reused pid a no-op instead of a kill.
      const args = ["/F", "/T", "/FI", `PID eq ${pid}`];
      if (image) args.push("/FI", `IMAGENAME eq ${image}`);
      try {
        spawn("taskkill", args, { stdio: "ignore" }).unref();
      } catch {
        /* already gone */
      }
    } else {
      // POSIX: verify the process name still matches before signalling.
      try {
        const comm = execFileSync("ps", ["-o", "comm=", "-p", String(pid)], { encoding: "utf8" }).trim();
        if (!image || comm.includes(image.replace(/\.exe$/i, ""))) process.kill(pid);
      } catch {
        /* already gone / ps unavailable */
      }
    }
  } catch {
    /* best-effort — never block opening the new window */
  }
}

function openWindow(url: string): void {
  const browser = resolveBrowser();
  if (!browser) {
    console.log(`  (no Chrome/Edge found - open ${url} manually)`);
    return;
  }
  closePrevWindow();
  // A dedicated profile dir forces a SEPARATE browser instance so the --app
  // window actually opens even when Edge/Chrome is already running. Without it,
  // `msedge --app=URL` is swallowed by the existing browser and no window shows.
  const profileDir = join(currentBrainDir(), "cockpit", "browser");
  try {
    mkdirSync(profileDir, { recursive: true });
  } catch {
    /* ignore */
  }
  const child = spawn(
    browser,
    [
      `--app=${url}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1320,920",
    ],
    { detached: true, stdio: "ignore" },
  );
  child.on("error", () => console.log(`  (couldn't launch window - open ${url} manually)`));
  // Remember pid + image so the NEXT open closes exactly this window and a
  // reused pid can never match (single-window, no pile-up, no stray kills).
  try {
    writeFileSync(windowPidFile(), `${child.pid ?? ""}|${basename(browser)}`);
  } catch {
    /* ignore */
  }
  child.unref();
}

/** The UI home address. One fixed port so it is bookmarkable and the
 *  browser keeps per-origin state; override with ZEMORY_UI_PORT when 4444 clashes. */
export const DEFAULT_UI_PORT = 4444;

export function uiPort(): number {
  const raw = Number(process.env.ZEMORY_UI_PORT);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : DEFAULT_UI_PORT;
}

function listenOn(server: ReturnType<typeof createServer>, port: number): Promise<void> {
  return new Promise((ok, fail) => {
    const onError = (e: Error) => {
      server.removeListener("listening", onOk);
      fail(e);
    };
    const onOk = () => {
      server.removeListener("error", onError);
      ok();
    };
    server.once("error", onError);
    server.once("listening", onOk);
    server.listen(port, "127.0.0.1");
  });
}

/** Is OUR UI already serving this port? Returns its pid, or null for
 *  "free" / "someone else's server". Short timeout so startup never hangs. */
/**
 * Is our UI already on this port?
 *  • `{pid}`  — yes, it answered /ping.
 *  • `null`   — the port is FREE (connection refused).
 *  • `"busy"` — someone IS listening but didn't answer in time. Treating this as
 *    "free" was a real bug: a daemon saturated by a synchronous embed pass can't
 *    answer /ping for ~28s, so a second `zemory ui` concluded "nobody home",
 *    hit EADDRINUSE, fell back to a random port — TWO daemons writing one DB,
 *    exactly what the write gate exists to prevent (measured 2026-07-21).
 *    Timeout ≠ absent: back off instead of starting a rival.
 */
async function probeZemoryUi(port: number): Promise<{ pid: number } | null | "busy"> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return "busy"; // something is there, just not healthy
    const body = (await res.json()) as { app?: string; pid?: number };
    return body?.app === "zemory" ? { pid: body.pid ?? 0 } : "busy";
  } catch (error) {
    // AbortError/TimeoutError = someone listening but slow. ECONNREFUSED = free.
    const name = error instanceof Error ? error.name : "";
    const msg = error instanceof Error ? error.message : "";
    if (name === "TimeoutError" || name === "AbortError" || /timeout/i.test(msg)) return "busy";
    return null; // genuinely nothing listening
  }
}

export async function startUi(): Promise<void> {
  const root = () => findProjectRoot() ?? process.cwd();
  const json = (res: ServerResponse, obj: unknown) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  // Loopback-only guard. (a) Host must be a loopback name — a DNS-rebinding page
  // (evil.com resolving to 127.0.0.1) sends its own hostname and is rejected.
  // (b) State-changing cross-site requests carry an Origin header; anything not
  // our own loopback origin is rejected (the UI page itself is same-origin,
  // so its fetches either omit Origin or match).
  const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
  const guard = (req: IncomingMessage, res: ServerResponse): boolean => {
    const host = req.headers.host ?? "";
    const origin = req.headers.origin ?? "";
    const originHost = origin.replace(/^https?:\/\//i, "");
    if (LOOPBACK.test(host) && (!origin || LOOPBACK.test(originHost))) return true;
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden (zemory ui only serves the local page)");
    return false;
  };

  const server = createServer(async (req, res) => {
    if (!guard(req, res)) return;
    const u = new URL(req.url ?? "/", "http://x");
    const p = u.pathname;
    const rootP = u.searchParams.get("root") || undefined;
    const target = rootP ?? root();
    // Identity probe: lets a second `zemory ui` tell "our UI already owns
    // this port" from "some other app grabbed 4444" — cheap, no work done.
    if (p === "/ping") return json(res, { app: "zemory", ui: true, pid: process.pid });
    if (req.method === "POST" && p === "/gate-acquire") {
      // A CLI is about to write the brain — pause the scheduler so they don't
      // collide on SQLite (plan 14 §C write gate). Auto-expires; see writegate.ts.
      // `busy` tells the CLI a daemon child (embed/sync) is ALREADY writing, so
      // it can wait instead of colliding (the gate was one-directional before).
      acquireCliWrite();
      return json(res, { ok: true, held: true, busy: daemonJobBusy() !== null });
    }
    if (req.method === "POST" && p === "/gate-release") {
      releaseCliWrite();
      return json(res, { ok: true, held: false });
    }
    if (req.method === "POST" && p === "/sync") return json(res, ensureHarness(target));
    if (req.method === "POST" && p === "/init-fresh") return json(res, freshHarness(target));
    if (p === "/migrate") return json(res, analyzeMigration(target) ?? { error: "no docs dir" });
    if (p === "/check") return json(res, await runCheck(u.searchParams.get("feature") ?? "", rootP));
    if (p === "/status") return json(res, await gatherStatus(rootP));
    // `fresh=1` = the user pressed refresh; the poll takes whatever is cached.
    if (p === "/brain-status") return json(res, dashboardBrain({ fresh: u.searchParams.get("fresh") === "1" }));
    if (p === "/set-lang") {
      // Do NOT invalidate the dashboard cache here. tr() (server-side i18n) is used
      // only by status.ts and checks.ts — NOTHING in the /brain-status payload is
      // server-localized, so the cached brain snapshot stays valid across a language
      // change. Busting it forced every language click through the two full-table
      // scans (the reported multi-second delay). /status and /check ARE localized,
      // and the client refetches those (not brain) after a language change.
      setLang(u.searchParams.get("lang") ?? "vi");
      return json(res, { ok: true, lang: getLang() });
    }
    if (p === "/set-hybrid") {
      setHybridSetting(u.searchParams.get("on") === "1");
      return json(res, { ok: true, hybrid: getHybridSetting() });
    }
    if (p === "/set-rerank") {
      setRerankSetting(u.searchParams.get("on") === "1");
      return json(res, { ok: true, rerank: getRerankSetting() });
    }
    if (p === "/set-scope") {
      setScopeSetting(u.searchParams.get("on") === "1");
      return json(res, { ok: true, scope: getScopeSetting() });
    }
    if (p === "/ui-state") {
      return json(res, { layout: getUiState() });
    }
    if (p === "/set-ui-state") {
      // Persist the UI layout the user dragged, so a reopen restores it
      // (localStorage is keyed by origin and the UI binds a random port each run).
      const raw = u.searchParams.get("state") ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setUiState(parsed as Record<string, unknown>);
      } catch {
        /* ignore malformed layout */
      }
      return json(res, { ok: true });
    }
    if (p === "/set-scope-exclude") {
      // Toggle one provenance lane in/out of the exclude list (sync + recall).
      const lane: ScopeLane = {};
      const o = u.searchParams.get("origin");
      const h = u.searchParams.get("host");
      const s = u.searchParams.get("source");
      if (o) lane.origin = o;
      if (h) lane.host = h;
      if (s) lane.source = s;
      const exclude = u.searchParams.get("on") === "1";
      if (lane.origin || lane.host || lane.source) {
        setScopeExclude(toggleLane(getScopeExclude(), lane, exclude));
        // scopeTree/scopeExcluded/scopeRules in the snapshot are now stale, but
        // message/vector counts are not — soft-invalidate so the next poll shows
        // the change cheaply without re-running the full-table scans.
        invalidateDashboardSoft();
      }
      return json(res, { ok: true, scopeExcluded: getScopeExclude().length });
    }
    if (p === "/set-drive") {
      const path = (u.searchParams.get("path") ?? "").trim();
      setDriveDir(path);
      return json(res, probeDrive(path));
    }
    if (p === "/doc") {
      return json(res, readDoc(target, u.searchParams.get("file") ?? ""));
    }
    if (p === "/standard-doc") {
      return json(res, readStandardDoc(u.searchParams.get("file") ?? ""));
    }
    if (p === "/folder-tree") {
      // Annotated folder tree for the project's Graph sub-tab (structure view).
      return json(res, buildFolderTree(target));
    }
    if (p === "/code-graph") {
      // Derived import graph (nodes=files, edges=imports) + fitness (plan 13 §9
      // Phase A) + AST symbols (Phase B, fail-open). Cached per project + source
      // signature so a graph-tab open doesn't re-parse every file each poll.
      const { graph: g, fitness } = await getCodeGraph(target);
      // callSites are Phase-C raw material for the CLI (impact/callers) — heavy
      // and unrendered in the page, so they stay out of the payload.
      return json(res, { ...g, nodes: g.nodes.map(({ callSites: _cs, ...n }) => n), fitness });
    }
    if (p === "/nav-cost") {
      // What the harness index + graph + brain buy, in tokens: sweep vs routed.
      // Shares the cached graph with /code-graph (no second full build).
      return json(res, buildNavCost(target, { graph: (await getCodeGraph(target)).graph }));
    }
    if (req.method === "POST" && p === "/pin-project") {
      // Pin keeps a project on the tab bar; unpinned ones fall back to recency.
      const ok = pinProject(u.searchParams.get("root") ?? "", u.searchParams.get("on") === "1");
      return json(res, { ok, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/forget-project") {
      // Removes the project from zemory's picker ONLY — the folder, its docs and
      // its brain data are untouched (use `brain forget` to drop memory).
      const ok = forgetProject(u.searchParams.get("root") ?? "");
      return json(res, { ok, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/prune-projects") {
      const removed = pruneDeadProjects();
      return json(res, { ok: true, removed, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/brain-scan") {
      const r = scan({ deep: u.searchParams.get("deep") === "1" });
      invalidateDashboard();
      return json(res, r);
    }
    if (p === "/brain-search") {
      const days = Number(u.searchParams.get("days") || 0);
      const hits = await recall(u.searchParams.get("q") ?? "", {
        project: target,
        all: u.searchParams.get("all") === "1",
        source: u.searchParams.get("agent") || undefined,
        origin: u.searchParams.get("origin") || undefined,
        role: u.searchParams.get("role") || undefined,
        sinceMs: days > 0 ? Date.now() - days * 86400000 : undefined,
      });
      return json(res, hits);
    }
    if (p === "/brain-context") {
      // Drill-down WITHIN a recall already counted by /brain-search; not logged
      // separately (same 'recall' feature) to avoid double-counting.
      const ctx = getMessageContext(Number(u.searchParams.get("id")), 3);
      return json(res, ctx ?? {});
    }
    if (p === "/brain-session") return json(res, getSessionThread(u.searchParams.get("id") ?? "") ?? {});
    if (req.method === "POST" && p === "/relocate") {
      // Move the brain DB off the system drive to a plain local folder. Safe:
      // relocateBrain verifies the copy and keeps the old DB as a .bak.
      const path = (u.searchParams.get("path") ?? "").trim();
      const force = u.searchParams.get("force") === "1";
      try {
        const r = relocateBrain(path, { force });
        invalidateDashboard();
        return json(res, { ok: true, ...r });
      } catch (error) {
        return json(res, { ok: false, error: error instanceof Error ? error.message : "relocate failed" });
      }
    }
    if (p === "/set-autostart") {
      // Flip the config flag AND the real OS hook (Startup/launchd/xdg).
      const on = u.searchParams.get("on") === "1";
      setAutostartSetting(on);
      const st = setAutostart(on);
      return json(res, { ok: true, autostart: st });
    }
    if (p === "/set-autosync") {
      setAutosyncSetting(u.searchParams.get("on") === "1");
      return json(res, { ok: true, autosync: getAutosync() });
    }
    if (p === "/set-scheduler") {
      setSchedulerSetting(u.searchParams.get("on") === "1");
      return json(res, { ok: true, scheduler: getScheduler() });
    }
    if (p === "/set-sync-level") {
      setSyncLevel(u.searchParams.get("level") === "full" ? "full" : "lean");
      return json(res, { ok: true, level: getSyncLevel() });
    }
    if (p === "/automation") {
      // State for the ⚙ automation panel: config flags + real autostart status.
      return json(res, {
        autostart: getAutostart(), autosync: getAutosync(), scheduler: getScheduler(),
        os: autostartStatus(), shortcut: desktopShortcutStatus(),
      });
    }
    if (p === "/set-shortcut") {
      const st = setDesktopShortcut(u.searchParams.get("on") === "1");
      return json(res, { ok: true, shortcut: st });
    }
    if (req.method === "POST" && p === "/drive-sync") {
      // Run-hidden sync (user 2026-07-21): the old handler awaited syncDrive
      // INLINE — scan + encrypt + merge + ONNX embed all on this single-threaded
      // event loop, so the whole daemon froze for the duration (same bug class
      // as the scheduler's in-process embed). Now: start the child job and
      // return immediately; the page polls /sync-status.
      if (!getDriveDir()) return json(res, { ok: false, error: "no Drive folder linked" });
      if (cliHoldsWrite()) return json(res, { ok: false, error: "a CLI write is running — try again shortly" });
      const st = startSyncJob(() => invalidateDashboard());
      if (!st.running && st.ok === false) return json(res, { ok: false, error: st.error ?? "could not start sync" });
      return json(res, { ok: true, running: true, startedAt: st.startedAt });
    }
    if (p === "/sync-status") {
      // Progress probe for the run-hidden sync dialog / Global-tab spinner.
      return json(res, syncJobStatus());
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });

  // FIXED port so the UI always lives at one address (bookmarkable, and the
  // browser keeps its localStorage — a random port lost it every run). If it is
  // already taken by OUR UI, don't start a rival: just open that one.
  const wanted = uiPort();
  const running = await probeZemoryUi(wanted);
  if (running) {
    const url = `http://127.0.0.1:${wanted}`;
    if (running === "busy") {
      // Someone holds the port but is too busy to answer. Do NOT start a second
      // daemon on a fallback port — that is how two writers on one DB happened.
      console.log(`zemory ui — port ${wanted} is held and not responding (busy daemon?).`);
      console.log(`  Not starting a rival instance. Open ${url}, or stop that process and retry.`);
      openWindow(url);
      server.close();
      return;
    }
    console.log(`zemory ui — already running (pid ${running.pid}) -> ${url}`);
    openWindow(url);
    server.close();
    return;
  }
  let port = wanted;
  try {
    await listenOn(server, wanted);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
    // Port held by a NON-zemory process — fall back to an ephemeral one rather
    // than refusing to start, and say why the address is unusual.
    await listenOn(server, 0);
    const addr = server.address();
    port = typeof addr === "object" && addr ? addr.port : 0;
    console.log(`zemory ui — port ${wanted} is taken by another app; using ${port} for this run.`);
  }
  const url = `http://127.0.0.1:${port}`;
  console.log(`zemory ui -> ${url}  (Ctrl+C to stop)`);
  // This process IS the daemon now (it won the port). Reconcile the OS autostart
  // hook with the saved flag, and start the idle background scheduler (plan 14 §B).
  reconcileAutostart(getAutostart());
  startScheduler();
  openWindow(url);
  // System-tray presence (fail-open, HP điều 9): Open re-focuses the window, Quit
  // stops the daemon. Only the instance that WON the port reaches here — the
  // attach paths above already returned — so there is never a second icon.
  startTray(url, {
    onOpen: () => openWindow(url),
    onQuit: () => shutdown("tray quit"),
  });
  // A hard daemon exit used to ORPHAN the embed/sync child (it kept writing the
  // DB; the next boot spawned a second writer). Clean up on the signals we can
  // catch; taskkill /F still can't be caught — the write-gate busy check plus
  // retry-with-backoff stay as the net for that case (audit 2026-07-21).
  let shuttingDown = false;
  function shutdown(reason: string): void {
    if (shuttingDown) return; // a second signal must not race the tray handshake
    shuttingDown = true;
    console.error(`[zemory] shutting down (${reason})`);
    stopScheduler();
    stopSyncJob();
    closePrevWindow();
    // The tray helper needs a moment to tell Windows to REMOVE its icon; exiting
    // synchronously here is what left the ghost icon behind (user 2026-07-21).
    // Hard backstop so a wedged helper can never block the exit.
    const bail = setTimeout(() => process.exit(0), 1500);
    bail.unref();
    void stopTray().finally(() => {
      clearTimeout(bail);
      process.exit(0);
    });
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  // Black box: a daemon must never die silently. Whatever path ends the process
  // (signal, tray quit, drained loop, crash) leaves a line saying so.
  process.on("exit", (code) => console.error(`[zemory] process exit code=${code}`));
  process.on("uncaughtException", (e) => {
    console.error(`[zemory] uncaughtException: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (e) => {
    console.error(`[zemory] unhandledRejection: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
  });
}
