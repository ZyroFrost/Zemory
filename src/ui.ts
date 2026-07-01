// `zemory ui` - live memory cockpit. The page stays code-native and polls the
// local data layer so new captured messages appear while the user keeps chatting.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { isAbsolute, join, relative, resolve } from "node:path";
import { ensureHarness, freshHarness } from "./adopt.js";
import { brainInfo, brainSummary, scan } from "./brain/ingest.js";
import { BRAIN_DIR, openBrain } from "./brain/db.js";
import { getMessageContext, getSessionThread, recall } from "./brain/search.js";
import { resolveShareKey, syncDrive } from "./brain/share.js";
import { vectorCount, vectorRemaining } from "./brain/vectors.js";
import { runCheck } from "./checks.js";
import { findProjectRoot } from "./core/config.js";
import { analyzeMigration } from "./migrate.js";
import { gatherStatus } from "./status.js";
import {
  getDriveDir,
  getHybridSetting,
  getRerankSetting,
  getScopeSetting,
  setDriveDir,
  setHybridSetting,
  setRerankSetting,
  setScopeSetting,
} from "./settings.js";
import { PAGE } from "./ui-page.js";
import { onPath } from "./util.js";

interface FileSummary {
  exists: boolean;
  path: string;
  sizeKB: number;
  mtime: string | null;
}

function fileSummary(path: string): FileSummary {
  try {
    const s = statSync(path);
    return { exists: true, path, sizeKB: Math.round(s.size / 1024), mtime: s.mtime.toISOString() };
  } catch {
    return { exists: false, path, sizeKB: 0, mtime: null };
  }
}

function shareSummary(projectRoot: string): {
  bundle: FileSummary;
  key: FileSummary;
  lfs: boolean;
} {
  return {
    bundle: fileSummary(join(projectRoot, "share", "global_memory.zemory.enc")),
    key: fileSummary(join(projectRoot, "share", "share.key")),
    lfs: existsSync(join(projectRoot, ".gitattributes")),
  };
}

interface DriveSummary {
  path: string;
  linked: boolean;
  exists: boolean;
  writable: boolean;
  bundles: number;
  error: string | null;
}

/** Probe a Drive sync folder: exists? writable? how many bundles inside? */
function probeDrive(dir: string): DriveSummary {
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
  return probeDrive(getDriveDir());
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

function recentActivity(limit = 8): {
  sessions: { id: string; source: string; project: string | null; title: string | null; timestamp: string | null; messages: number }[];
  messages: { id: number; source: string; project: string | null; role: string | null; timestamp: string | null; snippet: string }[];
} {
  const db = openBrain();
  try {
    const sessions = db
      .prepare(
        `SELECT id, source, project_root AS project, title,
                COALESCE(ended_at, started_at) AS timestamp,
                message_count AS messages
           FROM sessions
          ORDER BY COALESCE(ended_at, started_at, '') DESC
          LIMIT ?`,
      )
      .all(limit) as ReturnType<typeof recentActivity>["sessions"];
    const messages = db
      .prepare(
        `SELECT m.id, s.source, s.project_root AS project, m.role, m.timestamp,
                substr(replace(COALESCE(m.content,''), char(10), ' '), 1, 220) AS snippet
           FROM messages m
           JOIN sessions s ON s.id = m.session_id
          ORDER BY m.id DESC
          LIMIT ?`,
      )
      .all(limit) as ReturnType<typeof recentActivity>["messages"];
    return { sessions, messages };
  } finally {
    db.close();
  }
}

function captureCoverage(limit = 10): {
  stores: { source: string; root: string; foundAt: string | null }[];
  projects: { path: string; sessions: number; messages: number; agents: number; last: string | null }[];
  totals: { stores: number; projectFolders: number };
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
    const projects = db
      .prepare(
        `SELECT project_root AS path,
                COUNT(*) AS sessions,
                COALESCE(SUM(message_count), 0) AS messages,
                COUNT(DISTINCT source) AS agents,
                MAX(COALESCE(ended_at, started_at, '')) AS last
           FROM sessions
          WHERE project_root IS NOT NULL AND project_root <> ''
          GROUP BY project_root
          ORDER BY last DESC
          LIMIT ?`,
      )
      .all(limit) as ReturnType<typeof captureCoverage>["projects"];
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM known_stores) AS stores,
           (SELECT COUNT(DISTINCT project_root)
              FROM sessions
             WHERE project_root IS NOT NULL AND project_root <> '') AS projectFolders`,
      )
      .get() as ReturnType<typeof captureCoverage>["totals"];
    return { stores, projects, totals };
  } finally {
    db.close();
  }
}

function dashboardBrain(projectRoot: string): unknown {
  const summary = brainSummary();
  const info = brainInfo();
  let vectors: { count: number; remaining: number; coverage: number | null; dims: string; error?: string };
  try {
    const count = vectorCount();
    const remaining = vectorRemaining();
    const messages = Number(summary.totals.messages || 0);
    vectors = {
      count,
      remaining,
      coverage: messages ? Number(((count / messages) * 100).toFixed(1)) : null,
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

  return {
    ...summary,
    info,
    sizeKB: info.sizeKB,
    vectors,
    coverage: captureCoverage(),
    share: shareSummary(projectRoot),
    activity: recentActivity(),
    hybrid: getHybridSetting(),
    rerank: getRerankSetting(),
    scope: getScopeSetting(),
    drive: driveSummary(),
    generatedAt: new Date().toISOString(),
  };
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

function openWindow(url: string): void {
  const browser = resolveBrowser();
  if (!browser) {
    console.log(`  (no Chrome/Edge found - open ${url} manually)`);
    return;
  }
  // A dedicated profile dir forces a SEPARATE browser instance so the --app
  // window actually opens even when Edge/Chrome is already running. Without it,
  // `msedge --app=URL` is swallowed by the existing browser and no window shows.
  const profileDir = join(BRAIN_DIR, "cockpit", "browser");
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
  child.unref();
}

export async function startUi(): Promise<void> {
  const root = () => findProjectRoot() ?? process.cwd();
  const json = (res: ServerResponse, obj: unknown) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  const server = createServer(async (req, res) => {
    const u = new URL(req.url ?? "/", "http://x");
    const p = u.pathname;
    const rootP = u.searchParams.get("root") || undefined;
    const target = rootP ?? root();
    if (req.method === "POST" && p === "/sync") return json(res, ensureHarness(target));
    if (req.method === "POST" && p === "/init-fresh") return json(res, freshHarness(target));
    if (p === "/migrate") return json(res, analyzeMigration(target) ?? { error: "no docs dir" });
    if (p === "/check") return json(res, await runCheck(u.searchParams.get("feature") ?? "", rootP));
    if (p === "/status") return json(res, await gatherStatus(rootP));
    if (p === "/brain-status") return json(res, dashboardBrain(target));
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
    if (p === "/set-drive") {
      const path = (u.searchParams.get("path") ?? "").trim();
      setDriveDir(path);
      return json(res, probeDrive(path));
    }
    if (p === "/doc") {
      return json(res, readDoc(target, u.searchParams.get("file") ?? ""));
    }
    if (req.method === "POST" && p === "/brain-scan") {
      return json(res, scan({ deep: u.searchParams.get("deep") === "1" }));
    }
    if (p === "/brain-search") {
      const days = Number(u.searchParams.get("days") || 0);
      return json(
        res,
        await recall(u.searchParams.get("q") ?? "", {
          project: target,
          all: u.searchParams.get("all") === "1",
          source: u.searchParams.get("agent") || undefined,
          role: u.searchParams.get("role") || undefined,
          sinceMs: days > 0 ? Date.now() - days * 86400000 : undefined,
          log: true,
        }),
      );
    }
    if (p === "/brain-context") return json(res, getMessageContext(Number(u.searchParams.get("id")), 3) ?? {});
    if (p === "/brain-session") return json(res, getSessionThread(u.searchParams.get("id") ?? "") ?? {});
    if (req.method === "POST" && p === "/drive-sync") {
      const dir = getDriveDir();
      try {
        const r = await syncDrive({ driveDir: dir, keyFile: resolveShareKey(target) });
        return json(res, { ok: true, ...r });
      } catch (error) {
        return json(res, { ok: false, error: error instanceof Error ? error.message : "sync failed" });
      }
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const url = `http://127.0.0.1:${port}`;
  console.log(`zemory ui -> ${url}  (Ctrl+C to stop)`);
  openWindow(url);
}
