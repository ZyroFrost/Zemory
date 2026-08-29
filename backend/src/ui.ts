// `zemory ui` - live memory UI. The page stays code-native and polls the
// local data layer so new captured messages appear while the user keeps chatting.

import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { hostname } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
const execFileP = promisify(execFile);
import { templateDir, channelUpdate, ensureHarness, syncCheck } from "./docs/adopt.js";
import { generateGuards } from "./docs/guard-gen.js";
import type { StructureProfile } from "./core/types.js";
import { memoryInfo, memorySummary, refreshSessionTitles, scan } from "./memory/ingest.js";
import { WEB_PLATFORMS, accountsOf, scanWeb, scanWebPlatforms, showLinkedPage } from "./memory/scanweb.js";
import { borrowCookies, dropBackup, findBorrowSource, restoreProfile } from "./memory/borrowcookies.js";
import { listConnections, webProfileDir } from "./memory/connections.js";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./memory/db.js";
import { attachmentBlob, attachmentsFor } from "./memory/attachments.js";
import type { AttachmentMeta } from "./memory/attachments.js";
// `recall` (hybrid+rerank) KHÔNG còn được gọi từ daemon nữa — nó là lớp đắt, nay chạy ở
// tiến trình con qua `deepSearchChild`. Bề mặt này chỉ giữ đường RẺ (`search` = FTS + lọc).
import { DEFAULT_SEARCH_LIMIT, SNIPPET_MAX_CHARS, getMessageContext, getSessionThread, search } from "./memory/search.js";
import { digestBackfill } from "./memory/digest.js";
import { backupMemory, forgetMemory, reRedactMemory, restoreMemoryBackup } from "./memory/privacy.js";
import { relocateMemory, storageInfo } from "./memory/relocate.js";
import { setContextWarnPercent } from "./config/settings.js";
import { isWithinBase } from "./util/safe-path.js";
import { vectorCount, vectorCoverage, vectorIndexInfo, vectorRemaining } from "./memory/vectors.js";
import { runCheck } from "./checks.js";
import { appVersion, currentProjectRoot, harnessPathsAt, isConnected, uiPort } from "./core/config.js";
import { analyzeMigration } from "./docs/migrate.js";
import { forgetProject, listKnownProjects, pinProject, projectProfile, pruneDeadProjects, rememberProject } from "./projects.js";
import { gatherStatus } from "./status.js";
import { buildFolderTree } from "./docs/structure-tree.js";
import { readStandardSpec } from "./docs/standard-spec.js";
import { TEMPLATE_DIR } from "./docs/adopt.js";

// Cache của /harness-updates — phép đo rẻ nhưng chạy trên MỌI project trong registry.
let harnessUpdCache: { at: number; stale: Array<{ root: string; name: string; missing: number; guardStale: number }> } | null = null;
// Cache của /check — pill Healthy phải có sẵn khi cửa sổ mở, không bắt user bấm Recheck oan.
const checkCache = new Map<string, { at: number; r: unknown }>();
import { getCodeGraph } from "./memory/graph/graph-cache.js";
import { fitnessHistory, recordFitness } from "./memory/graph/fitness-log.js";
import { buildTouchIndex, touchesFor } from "./memory/graph/graph-memory.js";
import { buildStandardGraph } from "./memory/graph/graph-standard.js";
import { buildSeamEdges } from "./memory/graph/graph-seam.js";
import { resolveCalls } from "./memory/graph/graph-symbols.js";
import { edgeId } from "./memory/graph/graph.js";
import { buildNavCost } from "./memory/graph/nav-cost.js";
import { autostartStatus, desktopShortcutStatus, reconcileAutostart, setAutostart, setDesktopShortcut } from "./platform/autostart.js";
import { schedulerChildRunning, startScheduler, stopScheduler, webLaneKey } from "./jobs/scheduler.js";
import { startSyncJob, stopSyncJob, syncJobStatus } from "./jobs/syncjob.js";
import { cliHoldsWrite, daemonJobBusy } from "./jobs/writegate.js";
import { startTray, stopTray } from "./platform/tray.js";
import { sweepDeadTrayIcons } from "./platform/traysweep.js";
import { acquireCliWrite, releaseCliWrite } from "./jobs/writegate.js";
import { armCrashReport, daemonHeartbeat, daemonLog } from "./logging/daemon-log.js";
import {
  getAutostart,
  getAutosync,
  getContextWarnPercent,
  getDriveDir,
  getHybridSetting,
  getRerankSetting,
  getLang,
  getRealtime,
  getScheduler,
  getScopeExclude,
  getScopeSetting,
  getSyncLevel,
  setAutostartSetting,
  setAutosyncSetting,
  setDriveDir,
  setHybridSetting,
  setLang,
  setRealtimeSetting,
  setRerankSetting,
  setSchedulerSetting,
  setScopeExclude,
  setScopeSetting,
  setSyncLevel,
  getSyncAttachments,
  setSyncAttachments,
  getRepoStdCheck,
  setRepoStdCheck,
  getWebAuth,
  setWebAuth,
  setWebPull,
} from "./config/settings.js";
import { slotOfIdentity } from "./memory/webslots.js";
import { type ScopeLane, scopeTree, toggleLane } from "./memory/scope.js";
import { hooksInstalled, installHooks, uninstallHooks } from "./memory/capture-hook.js";
import { deepSearchChild } from "./jobs/searchjob.js";
import { heavyStatsChild, type HeavyStats } from "./jobs/statsjob.js";
// The cockpit UI lives in frontend/ (03_STRUCTURE §5 "UI no-build static"): the
// daemon serves those files as-is — no bundler, no TS template. Read per request
// so editing a .css/.js + reloading shows it with no rebuild.
const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend");
/** Serve a file from frontend/<sub>/ by basename, path-guarded (no traversal). */
function serveFrontend(res: ServerResponse, sub: string, file: string, type: string): void {
  const dir = resolve(FRONTEND_DIR, sub);
  const target = resolve(dir, file);
  const rel = relative(dir, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden");
    return;
  }
  // ĐỌC XONG RỒI MỚI cam kết header. Thứ tự ngược lại (writeHead 200 trước, readFileSync
  // sau) là một bẫy TREO chứ không phải 404: file thiếu ⇒ readFileSync ném, nhưng header
  // 200 đã gửi rồi nên writeHead(404) trong catch lại ném ERR_HTTP_HEADERS_SENT ⇒ res.end()
  // không bao giờ chạy ⇒ client chờ mãi, không timeout, không lỗi. Đo được 2026-07-27 khi
  // xin một file của cockpit cũ vừa nghỉ hưu: curl treo hẳn, còn app.js thì 200 bình thường.
  let body: string;
  try {
    body = readFileSync(target, "utf8");
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  // KHÔNG có header cache thì trình duyệt áp cache PHỎNG ĐOÁN: sửa xong app.js/app.css
  // mà cửa sổ đang mở vẫn chạy bản cũ, và không có cách nào biết ngoài việc nhìn thấy
  // tính năng "không có". Vỏ HTML đã `no-store` từ trước; script/style thì bị bỏ sót nên
  // vỏ mới đi kèm script cũ. Đây là file đọc thẳng từ đĩa của một daemon cục bộ ⇒ không
  // cache là đúng, chi phí bằng không.
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}
const ASSET_MIME: Record<string, string> = {
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};
/** Serve a BINARY asset (icon/manifest) from frontend/<sub>/, path-guarded. Sends
 *  no-cache so Edge re-fetches the favicon instead of reusing a stale window icon. */
function serveBinary(res: ServerResponse, sub: string, file: string): void {
  const dir = resolve(FRONTEND_DIR, sub);
  const target = resolve(dir, file);
  const rel = relative(dir, target);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden");
    return;
  }
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  // Cùng bẫy treo như serveFrontend — đọc trước, cam kết header sau.
  let body: Buffer;
  try {
    body = readFileSync(target);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": ASSET_MIME[ext] ?? "application/octet-stream", "cache-control": "no-cache" });
  res.end(body);
}
import { onPath } from "./util.js";
import { checkLoopback } from "./util/loopback.js";

/** Read the package version once (same source the CLI uses). Powers the UI's
 *  version label — was hardcoded "v1.0.0" in the page. */
const APP_VERSION: string = (() => {
  try {
    return (JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")) as { version?: string }).version ?? "";
  } catch {
    return "";
  }
})();

interface DriveSummary {
  path: string;
  linked: boolean;
  exists: boolean;
  writable: boolean;
  bundles: number;
  error: string | null;
  /** Sync depth (plan 08 §7): "lean" rows bundle (default) | "full" snapshot. */
  level: "lean" | "full";
  /** L3 (§7 bước ③): có chở ảnh/file đính kèm trong bundle không. Độc lập với `level`. */
  atts: boolean;
  /** % tin đã đẩy lên Drive, ĐẾM THEO HÀNG (không phải theo id). 100 khi bộ nhớ rỗng. */
  syncPercent: number;
  syncedMessages: number;
  totalMessages: number;
  pendingMessages: number;
  /** Lần đẩy Drive gần nhất của máy này (sync_state.updated_at) — null = chưa từng. */
  lastPushAt: string | null;
  /** Thời điểm của tin MỚI NHẤT trong bộ nhớ — để đối chiếu "đã đủ" có thật là mới nhất không. */
  newestAt: string | null;
}

/**
 * Watermark đẩy Drive của MÁY NÀY so với số tin nó đang giữ.
 *
 * ĐẾM THEO HÀNG, KHÔNG theo id. Bản cũ lấy `MAX(id)` làm "tổng số tin" và
 * `MAX(id) − watermark` làm "số tin chờ" — sai vì id là AUTOINCREMENT CÓ LỖ HỔNG
 * (forget, whole-replace re-ingest). Đo trên DB thật 2026-07-27: MAX(id) = 1.836.847
 * nhưng COUNT(*) chỉ 172.333 — lệch **10,7×**. Với một watermark trễ thật
 * (1.127.371) công thức cũ báo **709.476 tin chờ** trong khi sự thật là **70.247**:
 * bịa ra 639.229 tin không tồn tại (điều 12 cấm số phản-thực).
 *
 * Kèm `lastPushAt` + `newestAt` để UI nói được VÌ SAO đang "đủ" — user báo card này
 * "luôn kêu đã đủ" trong khi panel quét bảo có tin mới; hai panel trả lời hai câu
 * khác nhau (nạp vào DB ≠ đẩy lên Drive) nên phải hiện mốc thời gian mới đối chiếu được.
 */
function driveSyncProgress(): {
  syncPercent: number;
  syncedMessages: number;
  totalMessages: number;
  pendingMessages: number;
  lastPushAt: string | null;
  newestAt: string | null;
} {
  const db = openMemory();
  try {
    const bundle = `drive:${hostname()}`;
    const row = db.prepare("SELECT last_message_id AS id, updated_at AS at FROM sync_state WHERE bundle = ?").get(bundle) as
      | { id: number; at: string | null }
      | undefined;
    const wm = row?.id ?? 0;
    const total = (db.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;
    const synced = (db.prepare("SELECT COUNT(*) c FROM messages WHERE id <= ?").get(wm) as { c: number }).c;
    const pending = Math.max(0, total - synced);
    const percent = total > 0 ? Math.round((synced / total) * 100) : 100;
    const newest = db.prepare("SELECT MAX(timestamp) t FROM messages").get() as { t: string | null };
    return {
      syncPercent: percent,
      syncedMessages: synced,
      totalMessages: total,
      pendingMessages: pending,
      lastPushAt: row?.at ?? null,
      newestAt: newest?.t ?? null,
    };
  } finally {
    db.close();
  }
}

/** Probe a Drive sync folder: exists? writable? how many bundles inside? */
function probeDrive(dir: string): Omit<DriveSummary, "level" | "atts" | "syncPercent" | "syncedMessages" | "totalMessages" | "pendingMessages" | "lastPushAt" | "newestAt"> {
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
    // ĐẾM MỌI `.enc`, KHÔNG chỉ hậu tố đời cũ `.zemory.enc`.
    //
    // Bug đo được 2026-08-09: Drive có 3 bundle thật (634 MB) mà ô này hiện **0**. Hậu tố
    // `.zemory.enc` chính là thứ `share.ts:714` tự gọi là `legacyName`; bộ ghi/đọc series
    // hiện tại sinh `global_memory.<host>.<seq>.enc` và khớp bằng `.enc` (`share.ts:721`,
    // `:894`). Nên máy nào đã lên định dạng series thì ô đếm **vĩnh viễn ra 0** — sai lệch
    // im lặng, không cổng nào đỏ, và nó khiến người dùng tưởng chưa từng sync (đúng ca
    // user báo hôm đó). Chỉ sai HIỂN THỊ: merge và ghi series vốn khớp đúng.
    bundles = readdirSync(path).filter((f) => f.endsWith(".enc")).length;
  } catch {
    /* ignore */
  }
  return { path, linked: true, exists: true, writable, bundles, error: writable ? null : "not writable" };
}

function driveSummary(): DriveSummary {
  return { ...probeDrive(getDriveDir()), level: getSyncLevel(), atts: getSyncAttachments(), ...driveSyncProgress() };
}

// `WebScanRow` · `WEB_PLATFORMS` · `platformsInUse` · `accountsOf` · `scanWebPlatforms`
// đã DỜI xuống `memory/scanweb.ts` (2026-08-28) — nghiệp vụ thuộc domain, surface chỉ
// wire (`03_STRUCTURE §4`). Chúng được import ở đầu file; ở đây chỉ còn phần thuộc UI.

/** Khe trống kế tiếp — nút "thêm tài khoản" không bắt người dùng tự đặt tên. */
function nextAccountSlot(platform: string): string {
  const have = new Set(accountsOf(platform));
  for (let i = 2; i < 20; i++) if (!have.has(String(i))) return String(i);
  return "20";
}

/**
 * Khe để đăng nhập MỘT tài khoản chưa có khe: dùng lại khe phụ đang TRỐNG (chưa từng nối được)
 * trước, hết mới đẻ khe mới. Đo 2026-08-28: mỗi lần bấm hàng "chưa nối" là một khe mới (2·3·4·5)
 * — bốn thư mục profile, bốn cổng CDP, không cái nào đăng nhập được; người dùng bấm lại vì
 * lần trước chưa xong, không phải vì muốn thêm tài khoản.
 */
function freeAccountSlot(platform: string): string {
  const auth = getWebAuth();
  for (const a of accountsOf(platform)) {
    if (a === "main") continue;
    if (auth[`${platform}#${a}`]?.ok !== true) return a;
  }
  return nextAccountSlot(platform);
}

/**
 * Kéo web chat cho từng nền, KHÔNG tương tác.
 *
 * Vì sao không tương tác: `scanWeb` nhận `onNeedLogin` để HỎI rồi chạy tiếp — hợp với CLI
 * (có TTY), nhưng qua HTTP thì giữ request mở chờ người dùng đăng nhập là treo daemon.
 * Nên ở đây bỏ callback: `scanWeb` vẫn MỞ cửa sổ đăng nhập rồi trả 'need-login', UI đọc
 * dòng đó, hiện dialog, và bấm "chạy tiếp" là gọi `/memory-scan-web?platform=…`.
 *
 * Một nền hỏng KHÔNG được kéo nền kia theo (fail-open, HP điều 9) — lỗi ghi vào dòng của
 * chính nền đó.
 */
/**
 * Bảng Liên kết + kiểm LẠI mọi nền web đang có cửa sổ mở.
 *
 * Vì sao phải kiểm ở đây: user đăng nhập trong cửa sổ claude, nhưng app lúc đó chỉ đang
 * theo dõi nền vừa được BẤM (chatgpt) ⇒ hàng claude đứng nguyên ở ⚠ dù đã đăng nhập
 * xong (*"vào web xong nhưng app ko hề nhận dc đăng nhập"*). Nay mỗi lần đọc bảng là
 * hỏi lại tất cả — `probeOnly` nên nó KHÔNG mở cửa sổ và không kéo gì; cửa sổ nào không
 * sống thì giữ nguyên kết quả lần kiểm trước.
 */
/**
 * CANH ĐĂNG NHẬP — daemon là người nhận, không phải UI (user 2026-08-28: *"đăng nhập xong web
 * claude nó phải trả lại đăng nhập xong… rồi app nhận đăng nhập mới đúng"*).
 *
 * Đo ca hỏng: `/connect` mở cửa sổ, trả `need-login` sau ~73 s rồi BUÔNG. Người dùng đăng nhập
 * xong (backend probe sau đó thấy `connected=true`), nhưng không ai KÉO và không ai BÁO — kho vẫn
 * 0 phiên claude-web mới từ 16/07, hộp "Thêm nguồn" đứng ở "đang chờ…". Trước đây phần canh nằm ở
 * UI (`connPoll`), tức chỉ chạy khi cửa sổ app còn mở và chỉ 3 phút; cờ `connPending` lại không
 * được đặt ở đường nút "Đăng nhập" nên có thấy cũng không kéo.
 *
 * Nay: sau mỗi `need-login`, daemon probe khe đó 5 s/lượt tới 15 phút; thấy đăng nhập ⇒ ghi
 * `webAuth`, KÉO ngay qua chính cửa sổ đang mở (`scanWebPlatforms` — attach, không mở thêm cửa sổ
 * nhờ luật MỘT KHE = MỘT CỬA SỔ), ghi `webPull`, làm tươi dashboard. UI chỉ vẽ lại theo `/connections`.
 */
const loginWatch = new Map<string, { since: number }>();
const LOGIN_WATCH_MS = 15 * 60_000;
const LOGIN_WATCH_EVERY_MS = 5_000;
function startLoginWatch(platform: string, account: string | undefined): void {
  const acct = account ?? "main";
  const lane = webLaneKey(platform, acct);
  if (loginWatch.has(lane)) return; // một khe một người canh
  loginWatch.set(lane, { since: Date.now() });
  const tick = async (): Promise<void> => {
    if (Date.now() - (loginWatch.get(lane)?.since ?? 0) > LOGIN_WATCH_MS) {
      loginWatch.delete(lane);
      return;
    }
    try {
      const probe = await scanWeb({ platform, account: acct, probeOnly: true });
      if (probe.status === "done") {
        setWebAuth(lane, true, probe.email ?? undefined);
        invalidateDashboard();
        loginWatch.delete(lane);
        const web = await scanWebPlatforms([platform], acct);
        const r = web[0];
        if (r) setWebPull(lane, { ok: r.status === "done", status: r.status, pulled: r.pulled, error: r.error });
        invalidateDashboard();
        // Bước 2 của vòng đăng nhập: trang "✓ Đã liên kết" ngay trong cửa sổ vừa đăng nhập.
        const q = new URLSearchParams({ platform, who: probe.email ?? "", pulled: String(r?.pulled ?? 0), total: String((r?.pulled ?? 0) + (r?.skipped ?? 0)) });
        void showLinkedPage(platform, acct, `http://127.0.0.1:${uiPort()}/linked?${q.toString()}`);
        return;
      }
    } catch {
      /* fail-open: lượt probe hỏng thì thử lại nhịp sau */
    }
    setTimeout(() => void tick(), LOGIN_WATCH_EVERY_MS).unref?.();
  };
  setTimeout(() => void tick(), LOGIN_WATCH_EVERY_MS).unref?.();
}

async function liveConnections(): Promise<ReturnType<typeof listConnections>> {
  const rows = listConnections();
  for (const r of rows) if (r.kind === "web" && r.platform) r.watching = loginWatch.has(webLaneKey(r.platform, r.account ?? "main"));
  await Promise.all(
    rows.map(async (r) => {
      if (r.kind !== "web" || !r.platform || r.connected) return;
      try {
        const probe = await scanWeb({ platform: r.platform, account: r.account, probeOnly: true });
        if (probe.status === "done") {
          setWebAuth(r.account && r.account !== "main" ? r.platform + "#" + r.account : r.platform, true, probe.email ?? undefined);
          r.connected = true;
          r.unknown = false;
          r.detail = "vừa kiểm xong";
          r.canBorrow = undefined;
        }
      } catch {
        /* fail-open: giữ trạng thái đã lưu */
      }
    }),
  );
  return rows;
}

/**
 * Latest sync timestamp (max sync_state.updated_at) — Home "Last Sync". null if nothing has
 * synced yet or the table predates schema v13 (fail-open).
 *
 * 🔴 `updated_at` is TEXT holding an ISO string, NOT an epoch number. The old code read it as
 * `new Date(Number(r.t))` → `Number("2026-08-13T06:59:26.646Z")` is NaN → `.toISOString()` throws
 * → the catch swallowed it → null → the card read "never synced" while the very same payload
 * carried `drive.lastPushAt` from a minute earlier (measured 2026-08-13, reported by the user).
 *
 * Two things made it survive: the mismatch is invisible without looking at the schema, and the
 * fail-open catch — meant for "table doesn't exist yet" — quietly absorbed a plain type bug too.
 * A catch that cannot tell "nothing to report" from "I just crashed" turns a bug into a lie.
 *
 * MAX() over ISO-8601 text is still correct ordering (lexical = chronological). Numbers are
 * accepted too so a store written by an older build keeps working.
 */
export function parseSyncTimestamp(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const d = typeof raw === "number" || /^\d+$/.test(String(raw)) ? new Date(Number(raw)) : new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// "Last Sync" đọc đúng MỘT nguồn: hàng `drive:<host>` mà `driveSyncProgress()` vốn đã dùng —
// tức lượt đồng bộ THẬT của máy này. Xem chỗ gọi trong `dashboardMemory()`.
//
// Bản cũ tự đẻ một truy vấn riêng `SELECT MAX(updated_at) FROM sync_state` — MAX trên TOÀN bảng,
// nên nó nhặt cả những hàng KHÔNG phải đồng bộ thật. Đo 2026-08-13: trong 11 hàng có 6 hàng
// `.tmp` do phép thử để lại (`timed.tmp` · `probe5.tmp` · `probe4.tmp` …) cộng `keytest.enc`,
// `test.zemory.enc`, `cli-lean.enc`. Hôm nay hàng `drive:` tình cờ mới nhất nên số nhìn có vẻ
// đúng — chỉ cần một phép thử chạy sau lượt sync là ô này hiện giờ của MỘT LƯỢT TEST.
//
// Đây là cùng một bệnh với ô "đã đủ" hồi trước: HAI truy vấn trả lời HAI câu khác nhau rồi cùng
// đổ vào một ô. Cách chữa không phải sửa truy vấn thứ hai cho khéo hơn, mà là BỎ nó đi.

/**
 * Gắn metadata đính kèm vào từng hàng có `id` — MỘT lượt truy vấn cho cả lô, không
 * phải mỗi hàng một lần. Chỉ metadata (sha/mime/bytes), KHÔNG kèm bytes: bytes đi
 * riêng qua `/attachment?sha=` để payload JSON không phình theo kích thước ảnh.
 * Hàng không có đính kèm thì KHÔNG mọc thêm khoá `atts` (giữ payload cũ y nguyên).
 */
function withAttachments<T extends { id: number }>(rows: T[]): Array<T | (T & { atts: AttachmentMeta[] })> {
  if (!rows.length) return rows;
  const map = attachmentsFor(rows.map((r) => r.id));
  return rows.map((r) => (map[r.id]?.length ? { ...r, atts: map[r.id] } : r));
}

/** Recent messages (newest first), scoped like recall — feeds the Recall default
 *  list so the panel is never empty (user 2026-07-23). Same row shape as recall. */
function queryRecentMessages(
  limit: number,
  o: { all?: boolean; project?: string; days?: number; role?: string; origin?: string; agent?: string; withAtt?: boolean },
): Array<{ id: number; role: unknown; project: unknown; source: unknown; sessionId: unknown; timestamp: unknown; snippet: string }> {
  const db = openMemory();
  try {
    const cond: string[] = [];
    const args: unknown[] = [];
    if (!o.all && o.project) {
      cond.push("lower(s.project_root) = lower(?)");
      args.push(o.project);
    }
    if (o.days && o.days > 0) {
      cond.push("m.timestamp >= ?");
      args.push(new Date(Date.now() - o.days * 86400000).toISOString());
    }
    if (o.role) {
      cond.push("m.role = ?");
      args.push(o.role);
    }
    if (o.origin) {
      cond.push("s.origin = ?");
      args.push(o.origin);
    }
    if (o.agent) {
      cond.push("s.source = ?");
      args.push(o.agent);
    }
    if (o.withAtt) cond.push("EXISTS (SELECT 1 FROM attachment_link al WHERE al.message_id = m.id)");
    const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const rows = db
      .prepare(
        `SELECT m.id AS id, m.role AS role, m.content AS content, m.timestamp AS timestamp,
                s.project_root AS project, s.source AS source, s.id AS sessionId
           FROM messages m JOIN sessions s ON s.id = m.session_id
           ${where} ORDER BY m.id DESC LIMIT ?`,
      )
      .all(...args, limit) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      role: r.role,
      project: r.project,
      source: r.source,
      sessionId: r.sessionId,
      timestamp: r.timestamp,
      snippet: String(r.content ?? "").replace(/\s+/g, " ").slice(0, 220),
    }));
  } finally {
    db.close();
  }
}

/** Last session per project (newest first) — Home "Recent Sessions". */
/** Deterministic insights (NO forecast/AI): daily message activity, agent mix,
 *  monthly growth, totals. All straight COUNT/SUM from the DB. */
function insightsData(days: number): unknown {
  const db = openMemory();
  try {
    const daily = db
      .prepare(
        `SELECT substr(timestamp, 1, 10) AS day, COUNT(*) AS messages
           FROM messages
          WHERE timestamp >= date('now', ?)
          GROUP BY day ORDER BY day`,
      )
      .all(`-${days} days`);
    const agents = db
      .prepare(
        `SELECT COALESCE(source, '(unknown)') AS source, COUNT(*) AS sessions,
                COALESCE(SUM(message_count), 0) AS messages
           FROM sessions GROUP BY source ORDER BY messages DESC LIMIT 12`,
      )
      .all();
    const monthly = db
      .prepare(
        `SELECT substr(COALESCE(ended_at, started_at), 1, 7) AS month,
                COUNT(*) AS sessions, COALESCE(SUM(message_count), 0) AS messages
           FROM sessions
          WHERE COALESCE(ended_at, started_at) <> ''
          GROUP BY month ORDER BY month`,
      )
      .all();
    // Project nào đang chiếm bộ nhớ nhiều nhất — COUNT/SUM thẳng, 0 suy diễn (điều 12).
    const projects = db
      .prepare(
        `SELECT COALESCE(NULLIF(project_root, ''), '(không rõ)') AS project,
                COUNT(*) AS sessions, COALESCE(SUM(message_count), 0) AS messages
           FROM sessions GROUP BY project ORDER BY messages DESC LIMIT 8`,
      )
      .all();
    const totals = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM sessions) AS sessions,
                (SELECT COUNT(*) FROM messages) AS messages,
                (SELECT COUNT(*) FROM session_digest) AS digests`,
      )
      .get();
    return { daily, agents, monthly, projects, totals };
  } finally {
    db.close();
  }
}

/** List sessions (NOT project-deduped) for the Session Viewer screen, newest first. */
/**
 * Danh sách phiên cho tab Recall › Phiên, LỌC Ở SERVER.
 *
 * Vì sao không lọc ở client: danh sách chỉ tải 120 phiên đầu trong khi DB có 1.206 —
 * lọc phía client là tìm trong 120/1.206 mà giao diện vẫn nói như thể đã tìm hết. Cùng
 * họ "bề mặt chỉ-đọc nói sai" đã trị ở F1. Nên trả kèm `total` = số phiên KHỚP THẬT,
 * không phải số hàng vừa trả về.
 */
function querySessions(
  limit: number,
  offset = 0,
  o: { q?: string; days?: number; origin?: string; agent?: string; host?: string; withAtt?: boolean } = {},
): { items: unknown[]; total: number } {
  const db = openMemory();
  try {
    // Số ảnh THEO PHIÊN, tính một lần: đi qua `attachment_link` (ánh xạ đầy đủ) rồi quy về
    // session của message, KHÔNG dùng `attachment.session_id` — cột đó chỉ ghi phiên của tin
    // ĐẦU TIÊN mang nội dung ấy, nên một ảnh dùng lại ở phiên khác sẽ đếm thiếu.
    const attRows = db
      .prepare(
        `SELECT m.session_id AS sid, count(DISTINCT al.attachment_id) AS n
           FROM attachment_link al JOIN messages m ON m.id = al.message_id
          GROUP BY m.session_id`,
      )
      .all() as { sid: string; n: number }[];
    const attBySession = new Map(attRows.map((r) => [r.sid, r.n]));

    const cond: string[] = [];
    const args: unknown[] = [];
    if (o.q) {
      cond.push("(lower(COALESCE(s.title,'')) LIKE ? OR lower(COALESCE(s.project_root,'')) LIKE ? OR lower(s.source) LIKE ?)");
      const like = `%${o.q.toLowerCase()}%`;
      args.push(like, like, like);
    }
    if (o.days && o.days > 0) {
      cond.push("COALESCE(s.ended_at, s.started_at, '') >= ?");
      args.push(new Date(Date.now() - o.days * 86400000).toISOString());
    }
    if (o.origin) {
      cond.push("COALESCE(s.origin, 'local') = ?");
      args.push(o.origin);
    }
    if (o.agent) {
      cond.push("s.source = ?");
      args.push(o.agent);
    }
    if (o.host) {
      cond.push("s.host = ?");
      args.push(o.host);
    }
    if (o.withAtt) {
      // Danh sách phiên-có-ảnh nhỏ (đo thật: 73/1.206) ⇒ đưa thẳng vào IN rẻ hơn nhiều so
      // với EXISTS chạy lại cho từng phiên.
      const ids = [...attBySession.keys()];
      if (!ids.length) return { items: [], total: 0 };
      cond.push(`s.id IN (${ids.map(() => "?").join(",")})`);
      args.push(...ids);
    }
    const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const total = (db.prepare(`SELECT count(*) AS n FROM sessions s ${where}`).get(...args) as { n: number }).n;
    const rows = db
      .prepare(
        `SELECT s.id AS sessionId, s.source AS source, s.origin AS origin, s.project_root AS project,
                s.title AS title, s.host AS host, s.message_count AS messages,
                s.started_at AS startedAt, s.ended_at AS endedAt
           FROM sessions s
           ${where}
          ORDER BY COALESCE(s.ended_at, s.started_at, '') DESC
          LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset) as Array<Record<string, unknown>>;
    const items = rows.map((r) => {
      const n = attBySession.get(String(r.sessionId));
      return n ? { ...r, atts: n } : r;
    });
    return { items, total };
  } finally {
    db.close();
  }
}

function queryRecentSessions(limit: number): unknown[] {
  const db = openMemory();
  try {
    return db
      .prepare(
        `SELECT s.id AS sessionId, s.source AS source, s.project_root AS project,
                s.title AS title, s.ended_at AS endedAt
           FROM sessions s
           JOIN (SELECT project_root, MAX(ended_at) AS m FROM sessions
                  WHERE project_root IS NOT NULL GROUP BY project_root) x
             ON s.project_root = x.project_root AND s.ended_at = x.m
          ORDER BY s.ended_at DESC LIMIT ?`,
      )
      .all(limit) as unknown[];
  } finally {
    db.close();
  }
}

/** Read one harness doc for the viewer — AGENTS.md (root), docs/agent/* or
 *  docs/plan/* — path-guarded so a request can't escape the project docs. */
/** Export để test soi ĐÚNG hàm đang chạy — hai bề mặt này hỏng ở tầng TRÌNH BÀY (cây file
 *  rỗng, mọi file "not found") nên không cổng nào bắt được, mà test chép lại logic thì canh
 *  bản sao chứ không canh bản thật (bài học audit: bộ test từng neo vào bản đã bị thay). */
export { listHarnessFiles as listHarnessFilesForTest, probeDrive as probeDriveForTest, readDoc as readProjectDocForTest };

function readDoc(projectRoot: string, rel: string): { ok: boolean; file: string; content: string } {
  const root = resolve(projectRoot);
  const notFound = { ok: false, file: rel, content: "(file not found — run zemory init/sync to create it)" };
  if (rel === "AGENTS.md") {
    try {
      return { ok: true, file: rel, content: readFileSync(resolve(root, "AGENTS.md"), "utf8") };
    } catch {
      return notFound;
    }
  }
  // ADAPT v2 · N2 — nhà harness lấy từ MARKER, không phải hằng `docs/`. Trước đó bề mặt này
  // đọc cứng `docs/agent`, nên với project đặt harness ở `harness/` thì tab Harness của UI
  // trả "(file not found — run zemory init/sync)" cho MỌI file, tức mời người ta chạy đúng
  // lệnh sẽ scaffold vào `docs/` của team.
  const hp = harnessPathsAt(root);
  // `base` = cha của agent-dir: nhánh `plan/` tính từ đó (nếp `docs/agent` ↔ `docs/plan`,
  // `harness/agent` ↔ `harness/plan`). Phép kiểm thoát-thư-mục vẫn dùng CHUNG với
  // `resolveDocPath` — xem `util/safe-path.ts` để biết vì sao không gộp thẳng hai hàm.
  const base = resolve(hp.agent, "..");
  const target = rel.startsWith("plan/") ? resolve(hp.plan, rel.slice("plan/".length)) : resolve(hp.agent, rel);
  if (!isWithinBase(base, target)) return { ok: false, file: rel, content: "invalid path" };
  try {
    return { ok: true, file: rel, content: readFileSync(target, "utf8") };
  } catch {
    return notFound;
  }
}

/** List a project's own harness docs (docs/agent/*.md · docs/plan/*.md) + whether
 *  a root AGENTS.md exists — feeds the per-project Harness tab's file tree. */
function listHarnessFiles(projectRoot: string): { hasAgents: boolean; agent: string[]; plan: string[] } {
  const root = resolve(projectRoot);
  const md = (dir: string): string[] => {
    try {
      return readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort();
    } catch {
      return [];
    }
  };
  const hp = harnessPathsAt(root);
  return {
    hasAgents: existsSync(resolve(root, "AGENTS.md")),
    agent: md(hp.agent),
    plan: md(hp.plan),
  };
}

/** Read a file from the SHARED STANDARD (docs_template/<profile>/) — path-guarded.
 *  This is the canonical harness, not any project's docs; the UI loads it
 *  read-only. Defaults to the APP tree; pass profile="non-app" for that standard. */
function readStandardDoc(rel: string, profile: StructureProfile = "app"): { ok: boolean; file: string; content: string } {
  const base = templateDir(profile);
  const target = resolve(base, rel);
  const rl = relative(base, target);
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
  projects: { host: string; path: string; sessions: number; messages: number; agents: number; last: string | null; profile: "app" | "non-app" | null }[];
  totals: { stores: number; projectFolders: number };
  /** THIS machine's hostname — lets the UI mark the local group and split
   *  linked (registry) projects from merely-scanned ones (user 2026-07-21). */
  localHost: string;
} {
  const db = openMemory();
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
    const localHost = hostname();
    const projects = (
      db
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
        .all() as Omit<ReturnType<typeof captureCoverage>["projects"][number], "profile">[]
    ).map((p) => ({
      // Real profile only when the repo is on THIS machine and actually has a
      // harness to read — otherwise null (cross-machine / not-set-up projects
      // are genuinely unknowable; the UI hides the badge instead of guessing).
      ...p,
      profile: p.host === localHost && isConnected(p.path) ? projectProfile(p.path) : null,
      // `gone` = folder không còn trên MÁY NÀY (chỉ đo được cho host local). UI gom các root này vào
      // nhóm "folder đã mất" thay vì bày lẫn với repo đang sống (user 2026-08-29: nút Dọn "không làm gì").
      ...(p.host === localHost && /^[A-Za-z]:[\\/]/.test(String(p.path)) ? { gone: !existsSync(String(p.path)) } : {}),
    }));
    const totals = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM known_stores) AS stores,
           (SELECT COUNT(DISTINCT ${CANON_ROOT})
              FROM sessions
             WHERE project_root IS NOT NULL AND project_root <> '') AS projectFolders`,
      )
      .get() as ReturnType<typeof captureCoverage>["totals"];
    return { stores, projects, totals, localHost };
  } finally {
    db.close();
  }
}

// ── Dashboard caching ────────────────────────────────────────────────────────
// The UI polls /memory-status, but every field it shows is a whole-DB
// aggregate: on a 595MB memory one pass costs ~4s of SYNCHRONOUS SQLite work, and
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
let heavyCache: {
  at: number;
  value: { tokensEst: number; count: number; remaining: number; covered: number; embeddable: number };
} | null = null;

/** Drop cached stats after anything that actually changes the memory. */
function invalidateDashboard(): void {
  dashCache = null;
  heavyCache = null;
}

/**
 * Drop ONLY the light snapshot, keeping the expensive full-table scans (heavyCache).
 * Use after a change that alters cheap fields (scope tree / exclude rules) but not
 * message/vector counts — the next /memory-status reflects it in ~40ms instead of
 * paying the ~1s heavy recompute.
 */
function invalidateDashboardSoft(): void {
  dashCache = null;
}

/**
 * The expensive aggregates, behind their own long TTL.
 *
 * `vectorCoverage()` belongs HERE, not in the caller: measured 2026-08-13 it costs ~1.4s (same
 * order as the other two full scans) but used to run on every `dashCache` miss — i.e. every 60s
 * instead of every 300s, for a number that moves just as slowly as its neighbours. That was most
 * of the "/memory-status takes seconds" report: one uncached scan hidden among cached ones.
 */
function heavyStatsSync(): {
  tokensEst: number;
  count: number;
  remaining: number;
  covered: number;
  embeddable: number;
} {
  const now = Date.now();
  if (heavyCache && now - heavyCache.at < HEAVY_TTL_MS) return heavyCache.value;
  // Honest token stat: total captured content ≈ chars/4. A REAL number (how much
  // context the memory holds), NOT a "saved" claim — capture itself costs 0 extra
  // tokens (hooks read transcript files, no model call).
  let tokensEst = 0;
  try {
    const db = openMemory();
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
  let covered = 0;
  let embeddable = 0;
  try {
    count = vectorCount();
    remaining = vectorRemaining();
    const cov = vectorCoverage();
    covered = cov.covered;
    embeddable = cov.embeddable;
  } catch {
    /* vector lane is optional — fail open (HP điều 9) */
  }
  const value = { tokensEst, count, remaining, covered, embeddable };
  heavyCache = { at: now, value };
  return value;
}

/**
 * Lấy bốn số nặng mà KHÔNG khoá event loop của daemon.
 *
 * Bản đồng bộ ở trên mất **16,7 giây** lượt lạnh (đo 2026-08-23, kho 284k tin) — và trong 16,7
 * giây đó mọi endpoint khác đứng hình, nên chip ở rail treo "…" nhìn như đã tắt. Nay:
 *   · còn hạn TTL ⇒ trả cache, y như cũ;
 *   · hết hạn mà ĐÃ có số cũ ⇒ **trả số cũ NGAY**, tính lại ở tiến trình con phía sau;
 *   · chưa có số nào (lượt lạnh đầu tiên) ⇒ chờ con, nhưng event loop vẫn rảnh cho request khác.
 * Đúng một lượt tính chạy tại một thời điểm (`heavyInFlight`) — hai request cùng lúc không được
 * đẻ hai lượt quét toàn bảng.
 *
 * `dashCache` (60 s) vẫn nằm trên, nên đường thường ngày không đụng tới đây.
 */
let heavyInFlight: Promise<HeavyStats | null> | null = null;
async function heavyStatsAsync(): Promise<{ tokensEst: number; count: number; remaining: number; covered: number; embeddable: number }> {
  const now = Date.now();
  if (heavyCache && now - heavyCache.at < HEAVY_TTL_MS) return heavyCache.value;
  if (!heavyInFlight) {
    heavyInFlight = heavyStatsChild().finally(() => {
      heavyInFlight = null;
    });
  }
  const pending = heavyInFlight;
  // Có số cũ thì KHÔNG chờ: số nặng đổi rất chậm, và một bảng hơi cũ tốt hơn một giao diện đứng.
  if (heavyCache) {
    void pending.then((v) => {
      if (v) heavyCache = { at: Date.now(), value: v };
    });
    return heavyCache.value;
  }
  const v = await pending;
  if (v) {
    heavyCache = { at: Date.now(), value: v };
    return v;
  }
  // Con hỏng ⇒ rơi về đường đồng bộ (fail-open, HP điều 9): thà chậm một lượt còn hơn trả rỗng.
  return heavyStatsSync();
}

async function dashboardMemory(opts: { fresh?: boolean } = {}): Promise<unknown> {
  const now = Date.now();
  if (!opts.fresh && dashCache && now - dashCache.at < DASH_TTL_MS) {
    return { ...dashCache.value, cached: true, cachedAgeMs: now - dashCache.at };
  }
  if (opts.fresh) invalidateDashboard();
  const summary = memorySummary();
  const info = memoryInfo();
  const heavy = await heavyStatsAsync();
  let vectors: { count: number; remaining: number; coverage: number | null; dims: string; error?: string };
  try {
    let dimsLabel = "";
    try {
      dimsLabel = vectorIndexInfo().dims + "d"; // REAL index dim (256d after plan-12 rebuild), not a hardcode
    } catch {
      /* vec module not loadable → leave blank */
    }
    // COVERAGE lấy từ `vectorCoverage()` — message-CÓ-vector / message-embed-được.
    // Công thức cũ `vectorCount / messages` cho ra **114,6%** trên DB thật (trái điều 12):
    // tử số đếm cả CHUNK của message dài, mẫu số lại gồm cả tool-message vốn không nằm
    // trong diện embed. Xem ghi chú đầy đủ ở `vectors.ts vectorCoverage()`.
    // Con số y hệt như trước, chỉ đổi chỗ TÍNH: nay nằm trong `heavyStats()` (TTL 300s).
    vectors = {
      count: heavy.count,
      remaining: heavy.remaining,
      coverage: heavy.embeddable ? Number(((heavy.covered / heavy.embeddable) * 100).toFixed(1)) : null,
      dims: dimsLabel,
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
  // MỘT lời gọi, dùng cho CẢ hai ô: panel Drive và ô "Last Sync". Trước đây `lastSync` đi qua
  // một truy vấn riêng (MAX toàn bảng `sync_state`) nên hai ô có thể nói hai mốc khác nhau về
  // cùng một sự việc — xem chú thích ở `parseSyncTimestamp()`.
  const drive = driveSummary();

  const payload = {
    ...summary,
    info,
    sizeKB: info.sizeKB,
    vectors,
    tokensEst,
    coverage: captureCoverage(),
    // The MEASURED cost of USING the memory (not a counterfactual "saved" number,
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
    drive,
    // Thời điểm ĐỒNG BỘ THẬT của máy này (hàng `drive:<host>`), chuẩn hoá về ISO.
    lastSync: parseSyncTimestamp(drive.lastPushAt),
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

/** Where the memory DB lives (for the UI "storage folder" control). */
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
  return join(currentMemoryDir(), "cockpit", "window.pid");
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
    const [pidRaw, image = "", title = ""] = readFileSync(f, "utf8").trim().split("|");
    const pid = Number(pidRaw);
    rmSync(f, { force: true });
    if (!Number.isInteger(pid) || pid <= 0) return;
    if (process.platform === "win32") {
      // /T also ends the render/gpu children; the IMAGENAME filter makes a
      // reused pid a no-op instead of a kill.
      const args = ["/F", "/T", "/FI", `PID eq ${pid}`];
      if (image) args.push("/FI", `IMAGENAME eq ${image}`);
      // A node.exe native-window helper shares the daemon's image; the window TITLE
      // makes a reused pid a no-op instead of killing the daemon (it has no window).
      if (title) args.push("/FI", `WINDOWTITLE eq ${title}`);
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

/** Fallback: open the cockpit in an msedge/chrome --app window (browser icon). */
function openWindowMsedge(url: string): void {
  const browser = resolveBrowser();
  if (!browser) {
    console.log(`  (no Chrome/Edge found - open ${url} manually)`);
    return;
  }
  // A dedicated profile dir forces a SEPARATE browser instance so the --app window
  // actually opens even when Edge/Chrome is already running.
  const profileDir = join(currentMemoryDir(), "cockpit", "browser");
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
  try {
    writeFileSync(windowPidFile(), `${child.pid ?? ""}|${basename(browser)}`);
  } catch {
    /* ignore */
  }
  child.unref();
}

/** Compiled native-window helper (dist/platform/window.js) + its app icon. */
function nativeWindowScript(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "platform", "window.js");
}
function appIcon(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "backend", "resources", "packaging", "zemory.ico");
}

/**
 * Open the cockpit window. Prefers a NATIVE webview window that owns the Zemory
 * icon (taskbar shows Z, not the browser); falls back to `msedge --app` if the
 * native helper can't start — no prebuilt binary / no WebView2 (HP điều 9).
 */
function openWindow(url: string): void {
  closePrevWindow();
  const script = nativeWindowScript();
  if (!existsSync(script)) {
    openWindowMsedge(url);
    return;
  }
  const child = spawn(process.execPath, [script, url, appIcon()], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, WEBVIEW2_USER_DATA_FOLDER: join(currentMemoryDir(), "cockpit", "webview") },
  });
  let settled = false;
  const fallback = (): void => {
    if (settled) return;
    settled = true;
    openWindowMsedge(url);
  };
  child.on("error", fallback);
  // The helper exits fast & non-zero when the native window can't be created; if it
  // survives the grace window, the window is up.
  const onExit = (code: number | null): void => {
    clearTimeout(grace);
    if (code !== 0) fallback();
  };
  const grace = setTimeout(() => {
    settled = true;
    child.removeListener("exit", onExit);
  }, 2500);
  child.once("exit", onExit);
  // Record pid + image + window TITLE so the next open closes exactly this window
  // (title spares the daemon, which shares node.exe's image but has no window).
  try {
    writeFileSync(windowPidFile(), `${child.pid ?? ""}|${basename(process.execPath)}|Zemory`);
  } catch {
    /* ignore */
  }
  child.unref();
}

/** The UI home address. One fixed port so it is bookmarkable and the
 *  browser keeps per-origin state; override with ZEMORY_UI_PORT when 4444 clashes. */
// `DEFAULT_UI_PORT` + `uiPort()` đã DỜI sang `core/config.ts` (2026-08-28) — cấu hình mọi
// bề mặt cần, không phải nghiệp vụ của máy chủ. Re-export để nơi gọi cũ không phải đổi.
export { DEFAULT_UI_PORT } from "./core/config.js";
export { uiPort };

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

/** `window: false` = dựng daemon + serve nhưng KHÔNG tự bật cửa sổ (cờ `--no-window`).
 *
 *  Vì sao (user chốt 2026-08-24): `zemory ui` luôn ném một cửa sổ thật lên desktop — đúng cho
 *  người dùng, sai cho smoke-test/tự động hoá (sự cố 3 cửa sổ rỗng đêm 06/08, và mỗi lần agent
 *  restart daemon là một cửa sổ nhảy vào mặt user). Cờ này chỉ tắt các lượt mở TỰ ĐỘNG; nút
 *  "Open" trên tray vẫn mở như thường — đó là hành động người dùng bấm, không phải máy tự tiện. */
export async function startUi(opts: { window?: boolean } = {}): Promise<void> {
  const showWindow = opts.window !== false;
  const autoOpen = (url: string): void => {
    if (showWindow) openWindow(url);
    else console.log(`zemory ui — --no-window: not opening a window (serve only) -> ${url}`);
  };
  const root = () => currentProjectRoot();
  const json = (res: ServerResponse, obj: unknown) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  // Guard loopback (Host + Origin + Sec-Fetch-Site) nay ở `util/loopback.ts` — dùng CHUNG
  // với MCP-over-HTTP. Trước đây nó nằm inline ngay đây; tách ra vì bề mặt HTTP thứ hai
  // cần đúng luật đó, mà chép sang bản thứ hai là tạo chỗ để vá sót về sau.

  // Endpoint LÀM ĐỔI TRẠNG THÁI ⇒ bắt buộc POST. Đây là mảnh còn thiếu của guard trên:
  // trình duyệt KHÔNG gửi `Origin` cho GET subresource, nên `<img src="http://127.0.0.1:
  // 4444/set-drive?path=…">` trên một trang bất kỳ vẫn lọt qua (ảnh không tải được,
  // nhưng REQUEST ĐÃ CHẠY — CORS chặn đọc kết quả, không chặn gửi đi). Cổng 4444 cố định
  // và có ghi trong README nên đoán được. Cross-site POST thì LUÔN kèm `Origin`, và
  // guard bên dưới đã chặn — nên chỉ cần ép POST là bịt cả họ.
  // Đo 2026-07-27: 24 endpoint đổi trạng thái, 14 trong số đó đang nhận GET.
  const MUTATING =
    /^\/(set-|drive-sync|forget-project|prune-projects|memory-(forget|redact|restore|scan|digest|embed)|relocate|sync$|migrate$|gate-(acquire|release))/;
  // `sync$`/`migrate$` neo cuối CÓ CHỦ Ý: bản đầu tôi viết `sync|migrate` trần và nó bắt
  // nhầm `/sync-pulse` + `/sync-status` — hai endpoint CHỈ ĐỌC mà UI gọi bằng GET liên
  // tục. Một luật bảo mật quá tay thì hỏng đúng thứ nó định bảo vệ.

  const guard = (req: IncomingMessage, res: ServerResponse): boolean => {
    const verdict = checkLoopback(req);
    if (!verdict.ok) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end(
        verdict.why === "cross-site request"
          ? "forbidden (cross-site request)"
          : "forbidden (zemory ui only serves the local page)",
      );
      return false;
    }
    const p = (req.url ?? "/").split("?")[0];
    if (MUTATING.test(p) && req.method !== "POST") {
      res.writeHead(405, { "content-type": "text/plain", allow: "POST" });
      res.end("method not allowed (state-changing endpoints require POST)");
      return false;
    }
    return true;
  };

  const server = createServer(async (req, res) => {
    if (!guard(req, res)) return;
    const u = new URL(req.url ?? "/", "http://x");
    const p = u.pathname;
    const rootP = u.searchParams.get("root") || undefined;
    const target = rootP ?? root();
    // Identity probe: lets a second `zemory ui` tell "our UI already owns
    // this port" from "some other app grabbed 4444" — cheap, no work done.
    if (p === "/ping") return json(res, { app: "zemory", ui: true, pid: process.pid, version: APP_VERSION, host: hostname() });
    if (req.method === "POST" && p === "/gate-acquire") {
      // A CLI is about to write the memory — pause the scheduler so they don't
      // collide on SQLite (plan 14 §C write gate). Auto-expires; see writegate.ts.
      // `busy` tells the CLI a daemon child (embed/sync) is ALREADY writing, so
      // it can wait instead of colliding (the gate was one-directional before).
      // `db` = kho CLI sắp ghi. Thiếu nó thì daemon chỉ biết "có ai đang ghi" mà không biết
      // GHI KHO NÀO, và mọi việc chỉ-đọc trên kho KHÁC (vd backup) phải nhường oan — đo
      // 2026-08-21: 24 lượt backup nhường liên tiếp cho job ghi kho song song.
      acquireCliWrite(u.searchParams.get("db") ?? undefined);
      return json(res, { ok: true, held: true, busy: daemonJobBusy() !== null });
    }
    if (req.method === "POST" && p === "/gate-release") {
      releaseCliWrite();
      return json(res, { ok: true, held: false });
    }
    if (req.method === "POST" && p === "/sync") return json(res, ensureHarness(target));
    // /init-fresh đã gỡ 2026-07-27 (audit F2): 0 người gọi ở cả FE lẫn CLI, mà nó là
    // thao tác DỜI docs cũ đi. Năng lực không mất — `zemory init --fresh` gọi thẳng
    // freshHarness(). Không nên mở một thao tác phá huỷ trên HTTP khi không ai dùng.
    if (p === "/migrate") return json(res, analyzeMigration(target) ?? { error: "no docs dir" });
    if (p === "/check") {
      // Cache 10' phía daemon (2026-08-21): trước đây MỖI cửa sổ mở đo lại từ đầu và pill
      // check treo "…" tới khi xong — user đọc thành "heal mở lại là tắt". Nay kết quả sống
      // theo daemon; `fresh=1` (nút ↻ Recheck) mới đo lại thật — nút giữ đúng nghĩa của nó.
      const feat = u.searchParams.get("feature") ?? "";
      const key = `${feat}|${rootP ?? ""}`;
      const hit = checkCache.get(key);
      if (u.searchParams.get("fresh") !== "1" && hit && Date.now() - hit.at < 600_000) return json(res, hit.r);
      const r = await runCheck(feat, rootP);
      checkCache.set(key, { at: Date.now(), r });
      return json(res, r);
    }
    if (p === "/status") return json(res, await gatherStatus(rootP));
    // `fresh=1` = the user pressed refresh; the poll takes whatever is cached.
    if (p === "/memory-status") return json(res, await dashboardMemory({ fresh: u.searchParams.get("fresh") === "1" }));
    if (p === "/sync-pulse") {
      // NHỊP NHANH: chỉ những con số mà một lần quét vừa làm đổi — Drive còn thiếu bao
      // nhiêu, và cây Sources. Toàn truy vấn rẻ (đo: ~0,2 s tổng), KHÔNG đụng gì tới
      // vector/token/kích-thước-file.
      //
      // Vì sao tách khỏi /memory-status: ba panel Máy này · Sources · Drive nằm cạnh nhau
      // vì chúng LIÊN QUAN NHAU (user 2026-07-27) — quét xong thì Drive phải hiện thiếu
      // NGAY. Nhưng /memory-status gói cả `vectorCoverage()` nên user phải chờ ~69 s mới
      // thấy số nhảy ("kẹt rất lâu mới lên"). Đã tối ưu coverage 38 s → 0,58 s, nhưng vẫn
      // KHÔNG nên bắt một cập nhật tức thời đi qua cả gói nặng: cái nào phải tức thời thì
      // phải có đường riêng, không phụ thuộc thứ nặng nhất trong gói.
      return json(res, { drive: driveSyncProgress(), scopeTree: safeScopeTree() });
    }
    if (p === "/set-lang") {
      // Do NOT invalidate the dashboard cache here. tr() (server-side i18n) is used
      // only by status.ts and checks.ts — NOTHING in the /memory-status payload is
      // server-localized, so the cached memory snapshot stays valid across a language
      // change. Busting it forced every language click through the two full-table
      // scans (the reported multi-second delay). /status and /check ARE localized,
      // and the client refetches those (not memory) after a language change.
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
    // /ui-state + /set-ui-state đã nghỉ hưu cùng cockpit cũ (2026-07-27). Chúng tồn
    // tại vì cockpit bind cổng ngẫu nhiên mỗi lần chạy nên localStorage (khoá theo
    // origin) mất layout. App hiện chốt cổng 4444 ⇒ localStorage giữ được, seam tự
    // lưu lấy. Nguồn cũ ở attic/frontend-cockpit/.
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
    if (p === "/harness-files") {
      return json(res, listHarnessFiles(target));
    }
    if (p === "/standard-spec") {
      // Bản chuẩn ĐỌC TỪ NGUỒN `03_STRUCTURE.md` (§3 cây + §4 routing) — thay cho hai
      // bảng hardcode tay trong app.js. Xem `standard-spec.ts` để biết vì sao: bản tay
      // đang thiếu 55/90 hàng cây và 40/66 dòng routing.
      const prof2: StructureProfile = u.searchParams.get("profile") === "non-app" ? "non-app" : "app";
      // Nguồn = docs của CHÍNH repo template tương ứng (bản mẫu trắng), không phải repo
      // đang mở — màn Harness hiển thị CHUẨN DÙNG CHUNG, không phải docs của project.
      const dir = join(TEMPLATE_DIR, prof2 === "non-app" ? "nonapp" : "app");
      return json(res, readStandardSpec(dir, join("agent", "03_STRUCTURE.md")));
    }
    if (p === "/standard-doc") {
      // Default to the APP standard; the future profile toggle passes ?profile=non-app.
      const prof: StructureProfile = u.searchParams.get("profile") === "non-app" ? "non-app" : "app";
      return json(res, readStandardDoc(u.searchParams.get("file") ?? "", prof));
    }
    if (p === "/folder-tree") {
      // Annotated folder tree for the project's Graph sub-tab (structure view).
      return json(res, buildFolderTree(target));
    }
    if (p === "/graph-fitness-history") {
      // Xu hướng fitness theo thời gian. Một hàng mỗi lần graph dựng lại thật, nên
      // trục X là nhịp THAY ĐỔI CODE, không phải nhịp mở tab. Rỗng ở project mới —
      // chuỗi bắt đầu từ lần dựng đầu tiên, quá khứ không bịa (điều 12).
      return json(res, { points: fitnessHistory(target) });
    }
    if (p === "/code-graph") {
      // Derived graph (nodes=files) + fitness (plan 13 §9 Phase A) + AST symbols
      // (Phase B, fail-open). Cached per project + source signature so a graph-tab
      // open doesn't re-parse every file each poll.
      const { graph: g, fitness, builtAt, sig } = await getCodeGraph(target);
      // Ghi mốc fitness Ở ĐÂY, không phải trong getCodeGraph: daemon phục vụ graph của
      // một project là chỗ duy nhất quan sát được "project này vừa đổi code". Đặt trong
      // getCodeGraph thì mọi test dựng repo tạm cũng ghi vào global_memory.db THẬT.
      // recordFitness tự bỏ qua khi chữ ký nguồn không đổi ⇒ cache-hit không đẻ hàng.
      recordFitness(target, fitness, { sig, builtAt, files: g.stats.files, edges: g.stats.edges });
      // HAI HẠNG CẠNH, GẮN NHÃN RÕ (HP điều 13 — cạnh suy luận KHÔNG được giả dạng
      // khai báo). Trước đây payload chỉ có `imports` và KHÔNG có nhãn nào, nên cạnh
      // `calls` (Phase C, đã build từ 07-21) chỉ dùng được qua CLI, UI không thấy.
      const edges: {
        from: string;
        to: string;
        kind: string;
        rel: "declared" | "inferred";
        count?: number;
        confidence?: string;
        /** cạnh `api`: các route FE→BE mà cạnh này đại diện (gộp về mức file) */
        routes?: string[];
        /** id ổn định để trích dẫn — đóng dấu sau khi gộp đủ 3 lớp cạnh */
        eid?: string;
      }[] = g.edges.map((e) => ({ ...e, kind: "imports", rel: "declared" as const }));
      try {
        // calls: gộp về mức FILE (nhiều call-site giữa 2 file = 1 cạnh, giữ count),
        // bỏ self-call, và bỏ cặp đã có cạnh import để không vẽ chồng hai lần.
        const seen = new Set(edges.map((e) => `${e.from}\u0000${e.to}`));
        const agg = new Map<string, { from: string; to: string; count: number; confidence: string }>();
        for (const c of resolveCalls(g)) {
          if (c.fromFile === c.toFile) continue;
          const key = `${c.fromFile}\u0000${c.toFile}`;
          if (seen.has(key)) continue;
          const cur = agg.get(key);
          if (cur) {
            cur.count += c.count;
            if (cur.confidence === "textual" && c.confidence === "inferred") cur.confidence = "inferred";
          } else agg.set(key, { from: c.fromFile, to: c.toFile, count: c.count, confidence: c.confidence });
        }
        for (const v of agg.values()) edges.push({ ...v, kind: "calls", rel: "inferred" });
        // api seam (plan 13 §4): FE gọi endpoint nào của BE — hai bờ nói chuyện qua HTTP
        // nên import-graph không có lấy một cạnh nào giữa chúng. Nhãn inferred/textual
        // (điều 13 — khớp chuỗi route, không phải contract). Fail-open cùng khối try này.
        for (const s of buildSeamEdges(target, g.nodes)) {
          edges.push({ from: s.from, to: s.to, kind: "api", rel: "inferred", confidence: s.confidence, count: s.count, routes: s.routes });
        }
      } catch {
        /* fail-open (điều 9): thiếu tree-sitter thì vẫn còn nguyên lane imports */
      }
      // touchedBy = số phiên agent từng đụng file (graph ↔ memory, 0 LLM). Là THUỘC
      // TÍNH của node, KHÔNG dựng thành cạnh: nối mọi cặp file cùng-một-phiên sẽ nổ N².
      let touched: Record<string, number> = {};
      let digests = 0;
      try {
        const idx = buildTouchIndex(target);
        digests = idx.digests;
        for (const n of g.nodes) {
          const c = touchesFor(idx, n.id).count;
          if (c) touched[n.id] = c;
        }
      } catch {
        touched = {};
      }
      // callSites are Phase-C raw material for the CLI (impact/callers) — heavy
      // and unrendered in the page, so they stay out of the payload.
      // `type` của node FILE = VAI TRÒ SLOT đã khai trong chuẩn (SLOT_ROLES, 68 slot).
      // Trước đây graph chỉ có đúng một loại node ("file") dù vai trò đã nằm sẵn đó.
      const nodes: Record<string, unknown>[] = g.nodes.map(({ callSites: _cs, ...n }) => ({
        ...n,
        type: n.slot ?? "(ngoài chuẩn)",
        touchedBy: touched[n.id] ?? 0,
      }));
      // Lớp TAXONOMY TỪ BẢN CHUẨN (plan 13 §4 đặc tả đã lâu, tới giờ mới nối vào UI):
      // hp_dieu · skill · plan_spec · harness_doc · slot · concern + cạnh routing/contains/
      // references. Toàn bộ hạng KHAI BÁO — parse tất định, 0 LLM (điều 6/13).
      let stdStats: unknown = null;
      try {
        const std = buildStandardGraph(target, g.nodes.map((n) => ({ id: n.id, slot: n.slot })));
        for (const n of std.nodes) nodes.push({ ...n, loc: 0, bytes: 0, symbols: [], fanIn: 0, fanOut: 0, touchedBy: 0 });
        for (const e of std.edges) edges.push({ from: e.from, to: e.to, kind: e.kind, rel: "declared" });
        stdStats = std.stats;
      } catch {
        /* fail-open (điều 9): hỏng lớp chuẩn thì code-graph vẫn nguyên vẹn */
      }
      // Bậc của node tính trên TOÀN BỘ cạnh (kể cả cạnh chuẩn) — nếu không, node
      // hp_dieu/skill/slot đều bậc 0 ⇒ vẽ ra chấm bé xíu, không có nhãn, coi như vô hình.
      const deg: Record<string, { i: number; o: number }> = {};
      for (const e of edges) {
        (deg[e.from] ??= { i: 0, o: 0 }).o++;
        (deg[e.to] ??= { i: 0, o: 0 }).i++;
      }
      for (const n of nodes) {
        const d = deg[n.id as string];
        if (d && !n.loc) {
          n.fanIn = d.i;
          n.fanOut = d.o;
        }
      }
      // Mọi cạnh nhận một id ỔN ĐỊNH để trích dẫn được (`edge:9f2c…`). Đóng dấu Ở ĐÂY,
      // sau khi cả BA lớp đã gộp (imports · calls · chuẩn) — làm ở từng lớp thì chắc
      // chắn sót một lớp, và sót thì đúng cạnh đó là cạnh không dẫn nguồn được.
      for (const e of edges) e.eid = edgeId(e.from, e.to, e.kind, e.rel);
      return json(res, {
        ...g,
        nodes,
        edges,
        fitness,
        builtAt,
        touchDigests: digests,
        standard: stdStats,
      });
    }
    if (p === "/nav-cost") {
      // What the harness index + graph + memory buy, in tokens: sweep vs routed.
      // Shares the cached graph with /code-graph (no second full build).
      return json(res, buildNavCost(target, { graph: (await getCodeGraph(target)).graph }));
    }
    if (req.method === "POST" && p === "/pick-folder") {
      // Native OS folder-browse dialog (Windows: WinForms FolderBrowserDialog via
      // PowerShell — no extra native dependency, runs on the same interactive
      // desktop session as the daemon). Script goes through -EncodedCommand
      // (base64 UTF-16LE): not subject to ExecutionPolicy (unlike a .ps1 file,
      // verified — Restricted policy blocks -File but not -Command/-EncodedCommand
      // on this machine) and side-steps all argv-quoting pitfalls. Fail-open:
      // unsupported OS or a cancelled picker both return ok:false so the UI falls
      // back to manual path entry.
      if (process.platform !== "win32") return json(res, { ok: false, unsupported: true });
      const start = u.searchParams.get("start") ?? "";
      const psQuote = (s: string): string => `'${s.replace(/'/g, "''")}'`;
      const startLine = start && existsSync(start) ? `$f.SelectedPath = ${psQuote(start)}` : "";
      const script = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$f = New-Object System.Windows.Forms.FolderBrowserDialog",
        `$f.Description = ${psQuote("Chọn folder project")}`,
        startLine,
        'if ($f.ShowDialog() -eq "OK") { Write-Output $f.SelectedPath }',
      ]
        .filter(Boolean)
        .join("\r\n");
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      try {
        const { stdout } = await execFileP("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded], {
          timeout: 120_000,
        });
        const picked = stdout.trim();
        return json(res, { ok: true, path: picked || null });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    if (req.method === "POST" && p === "/pick-file") {
      // Native OS file-open dialog (Windows: WinForms OpenFileDialog via PowerShell,
      // -EncodedCommand — same rationale as /pick-folder). `filter` is a WinForms
      // filter spec ("SQLite DB (*.db)|*.db"); `start` seeds the initial folder.
      // Fail-open: unsupported OS / cancel → ok:false, UI falls back to typing.
      if (process.platform !== "win32") return json(res, { ok: false, unsupported: true });
      const start = u.searchParams.get("start") ?? "";
      const filter = u.searchParams.get("filter") || "All files (*.*)|*.*";
      const psQuote = (s: string): string => `'${s.replace(/'/g, "''")}'`;
      const startDir = start && existsSync(start) ? (statSync(start).isDirectory() ? start : dirname(start)) : "";
      const startLine = startDir ? `$f.InitialDirectory = ${psQuote(startDir)}` : "";
      const script = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "$f = New-Object System.Windows.Forms.OpenFileDialog",
        `$f.Filter = ${psQuote(filter)}`,
        startLine,
        'if ($f.ShowDialog() -eq "OK") { Write-Output $f.FileName }',
      ]
        .filter(Boolean)
        .join("\r\n");
      const encoded = Buffer.from(script, "utf16le").toString("base64");
      try {
        const { stdout } = await execFileP("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded], {
          timeout: 120_000,
        });
        const picked = stdout.trim();
        return json(res, { ok: true, path: picked || null });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    if (req.method === "POST" && p === "/add-project") {
      // Link a DISCOVERED project (has sessions but not in the registry) into
      // zemory's managed list, and pin it. rememberProject skips scratch roots.
      const root = u.searchParams.get("root") ?? "";
      if (root) {
        rememberProject(root);
        pinProject(root, true);
      }
      return json(res, { ok: !!root, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/merge-project") {
      // Reassign a discovered folder's sessions into a target project (user-driven
      // merge, e.g. a subfolder into its parent). Repoints project_root AND pins it
      // (project_pinned=1) so the next scan's COALESCE upsert can't revert it to cwd.
      // The original folder stays intact in sessions.cwd — no source is destroyed.
      const from = u.searchParams.get("from") ?? "";
      const to = u.searchParams.get("to") ?? "";
      if (!from || !to) return json(res, { ok: false, error: "from/to required" });
      const db = openMemory();
      try {
        const moved = db.prepare("UPDATE sessions SET project_root = ?, project_pinned = 1 WHERE lower(project_root) = lower(?)").run(to, from).changes ?? 0;
        invalidateDashboard();
        return json(res, { ok: true, moved });
      } finally {
        db.close();
      }
    }
    if (req.method === "POST" && p === "/pin-project") {
      // Pin keeps a project on the tab bar; unpinned ones fall back to recency.
      const ok = pinProject(u.searchParams.get("root") ?? "", u.searchParams.get("on") === "1");
      return json(res, { ok, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/forget-project") {
      // Removes the project from zemory's picker ONLY — the folder, its docs and
      // its memory data are untouched (use `memory forget` to drop memory).
      const ok = forgetProject(u.searchParams.get("root") ?? "");
      return json(res, { ok, knownProjects: listKnownProjects() });
    }
    if (req.method === "POST" && p === "/harness-apply") {
      // Nút "Cập nhật repo" trong hộp cập nhật (user 2026-08-29: *"có cập nhật luôn được không"*). Ghi vào repo KHÁC —
      // được phép vì chính cú bấm của người dùng là lời cho phép, cho ĐÚNG repo đó, ĐÚNG lượt đó (02_RULES §Phạm vi).
      // Làm y hệt `zemory sync` + `zemory hook guard` chạy bên trong repo: bù file harness THIẾU (file có sẵn giữ nguyên —
      // file wins) + sinh lại bộ guard từ marker. Không sửa nội dung docs của họ, không cắm hook vào runtime của họ.
      const root = u.searchParams.get("root") ?? "";
      const known = listKnownProjects().find((k) => k.root.toLowerCase() === root.toLowerCase());
      if (!known) return json(res, { ok: false, error: "not a linked project" });
      if (!existsSync(known.root)) return json(res, { ok: false, error: "folder is gone" });
      try {
        const r = ensureHarness(known.root);
        let guard = false;
        try {
          generateGuards(known.root);
          guard = true;
        } catch (e) {
          daemonLog(`[harness-apply] guard ${known.root}: ${e instanceof Error ? e.message : e}`);
        }
        harnessUpdCache = null; // đo lại ngay ở lượt /harness-updates kế
        daemonLog(`[harness-apply] ${known.root}: +${r.added.length} file · guard ${guard ? "ok" : "skipped"}`);
        return json(res, { ok: true, added: r.added, kept: r.present.length, needsReconcile: r.needsReconcile, guard });
      } catch (e) {
        return json(res, { ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (req.method === "POST" && p === "/selfupdate") {
      // Nút "Cập nhật ngay" trong hộp cập nhật (user 2026-08-29: kiểu VS Code — có bản mới thì bấm, tự kéo về).
      // Cùng bốn bước và cùng CHỐT với `zemory selfupdate`: cây mã có sửa chưa commit ⇒ DỪNG, không đè.
      // Dựng xong thì tự phóng daemon mới (detached) rồi thoát — cửa sổ app nối lại theo nhịp tim.
      const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
      const run = (cmd: string, args: string[]): { ok: boolean; out: string } => {
        try {
          return { ok: true, out: String(execFileSync(cmd, args, { cwd: root, encoding: "utf8", stdio: "pipe", timeout: 15 * 60_000 })).trim() };
        } catch (e) {
          const err = e as { stdout?: string; stderr?: string; message?: string };
          return { ok: false, out: (String(err.stdout ?? "") + String(err.stderr ?? "")).trim() || (err.message ?? "failed") };
        }
      };
      if (!existsSync(join(root, ".git"))) return json(res, { ok: false, error: "not a source install (no .git)" });
      const st = run("git", ["status", "--porcelain"]);
      if (!st.ok) return json(res, { ok: false, error: `git status: ${st.out.slice(0, 200)}` });
      if (st.out.split(/\r?\n/).filter(Boolean).length) return json(res, { ok: false, dirty: true });
      const have = appVersion();
      const npm = process.platform === "win32" ? "npm.cmd" : "npm";
      for (const [cmd, a] of [["git", ["pull", "--ff-only"]], [npm, ["install"]], [npm, ["run", "build"]]] as [string, string[]][]) {
        const r = run(cmd, a);
        daemonLog(`[selfupdate] ${cmd} ${a.join(" ")} → ${r.ok ? "ok" : "FAIL"}`);
        if (!r.ok) return json(res, { ok: false, error: `${cmd} ${a.join(" ")}: ${r.out.split(/\r?\n/).slice(-6).join(" | ").slice(0, 400)}` });
      }
      const latest = channelUpdate()?.latest ?? have;
      json(res, { ok: true, have, latest });
      // Phóng daemon MỚI rồi thoát — không dùng autostart (chỉ chạy lúc đăng nhập).
      setTimeout(() => {
        try {
          spawn(process.execPath, [join(root, "dist", "cli.js"), "ui"], { detached: true, stdio: "ignore", cwd: root }).unref();
        } catch (e) {
          daemonLog(`[selfupdate] relaunch failed: ${e instanceof Error ? e.message : e}`);
        }
        shutdown("selfupdate");
      }, 800);
      return;
    }
    if (req.method === "POST" && p === "/prune-projects") {
      // "Dọn dự án đã mất" — HAI lớp (user chốt 2026-08-29): ① registry (dự án đã liên kết mà folder mất) như cũ;
      // ② root "chưa liên kết" của MÁY NÀY mà folder không còn: cùng TÊN folder với một dự án đang liên kết ⇒
      // GỘP (trỏ lại project_root + ghim, không xoá — cùng phép với project_merge); không có đích ⇒ để UI gom vào
      // nhóm "folder đã mất". `?dry=1` chỉ liệt kê để hộp xác nhận in từng dòng trước khi làm.
      const dry = u.searchParams.get("dry") === "1";
      const host = hostname();
      const linked = listKnownProjects().filter((k) => existsSync(k.root));
      const byName = new Map(linked.map((k) => [basename(k.root).toLowerCase(), k.root]));
      const linkedKeys = new Set(linked.map((k) => k.root.toLowerCase()));
      const db = openMemory(currentMemoryDb());
      const merges: { from: string; to: string; n: number }[] = [];
      const gone: { root: string; n: number }[] = [];
      try {
        const roots = db
          .prepare("SELECT project_root AS r, COUNT(*) AS n FROM sessions WHERE host = ? AND project_root IS NOT NULL AND project_root <> '' GROUP BY project_root")
          .all(host) as { r: string; n: number }[];
        for (const x of roots) {
          if (!/^[A-Za-z]:[\\/]/.test(x.r) || linkedKeys.has(x.r.toLowerCase()) || existsSync(x.r)) continue;
          const to = byName.get(basename(x.r).toLowerCase());
          if (to && to.toLowerCase() !== x.r.toLowerCase()) merges.push({ from: x.r, to, n: x.n });
          else gone.push({ root: x.r, n: x.n });
        }
        const regDead = listKnownProjects().filter((k) => !existsSync(k.root)).length;
        if (dry) return json(res, { ok: true, dry: true, removeReg: regDead, merges, gone });
        const upd = db.prepare("UPDATE sessions SET project_root = ?, project_pinned = 1 WHERE project_root = ? AND host = ?");
        let merged = 0;
        db.transaction(() => { for (const m of merges) merged += upd.run(m.to, m.from, host).changes; })();
        const removed = pruneDeadProjects();
        invalidateDashboard();
        daemonLog(`prune-projects: removed ${removed} · merged ${merged} session(s) across ${merges.length} root(s) · gone ${gone.length}`);
        return json(res, { ok: true, removed, merged, mergedRoots: merges.length, grouped: gone.length, knownProjects: listKnownProjects() });
      } finally {
        db.close();
      }
    }
    if (req.method === "POST" && p === "/memory-scan") {
      const r = scan({ deep: u.searchParams.get("deep") === "1" });
      // MỘT nút Quét làm cả hai: nguồn trên máy rồi web chat của những nền đang dùng.
      // Quét đĩa TRƯỚC, vì phần web mở trình duyệt và có thể dừng lại hỏi đăng nhập —
      // người dùng vẫn phải nhận được kết quả quét đĩa trong mọi trường hợp. Chạy KHÔNG
      // tương tác: `scanWeb` mở sẵn cửa sổ rồi trả 'need-login', UI hỏi bằng dialog (giữ
      // request HTTP mở để chờ người đăng nhập là treo cả daemon).
      // NGẦM: nút Quét không được bật cửa sổ trình duyệt vào mặt người dùng (user 2026-08-29). Khe mất
      // phiên ⇒ `need-login` ghi sổ, cây hiện ⚠, người dùng bấm nối mới có cửa sổ — không mở form ở đây.
      const webResults = u.searchParams.get("web") === "0" ? undefined : await scanWebPlatforms(undefined, undefined, { hidden: true });
      invalidateDashboard();
      return json(res, { ...r, web: webResults });
    }
    if (req.method === "POST" && p === "/add-account") {
      // THÊM TÀI KHOẢN cho một nền: mở một profile trình duyệt MỚI (khe trống kế tiếp) để
      // người dùng đăng nhập tài khoản khác, KHÔNG đụng tới tài khoản đang có. Hội thoại
      // nằm theo tài khoản — đo 2026-07-31: 3 phiên Cowork cần tra nằm ở tài khoản khác.
      const platform = u.searchParams.get("platform") ?? "";
      if (!WEB_PLATFORMS.includes(platform)) return json(res, { ok: false, error: `unknown platform '${platform}'` });
      const account = nextAccountSlot(platform);
      const web = await scanWebPlatforms([platform], account);
      invalidateDashboard();
      return json(res, { ok: true, account, web, rows: await liveConnections() });
    }
    if (p === "/linked") {
      // Trang tĩnh một màn, hiện trong CHÍNH cửa sổ đăng nhập sau khi daemon nhận + kéo xong
      // (user chốt 2026-08-29: vòng đăng nhập phải có bước "đã đăng nhập", không trả về trang chủ).
      // Song ngữ trên một trang (cửa sổ này không có công tắc ngôn ngữ của app); không nút bấm.
      const who = u.searchParams.get("who") ?? "";
      const plat = u.searchParams.get("platform") ?? "";
      const pulled = Number(u.searchParams.get("pulled") ?? 0);
      const total = Number(u.searchParams.get("total") ?? 0);
      const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
      const name = plat === "chatgpt" ? "ChatGPT" : plat === "claude" ? "Claude.ai" : esc(plat);
      const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Zemory — linked</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#e6e6e6;font:15px/1.6 system-ui,Segoe UI,sans-serif}
.card{max-width:520px;padding:32px 36px;border:1px solid #2a2f3a;border-radius:14px;background:#151922;text-align:center}
.ok{font-size:44px;color:#3ddc84;line-height:1}h1{font-size:20px;margin:14px 0 6px}.who{font-weight:700}.n{color:#9aa4b2;font-size:13.5px;margin-top:10px}.en{color:#8a93a0;font-size:13px;margin-top:18px;border-top:1px solid #2a2f3a;padding-top:12px}</style></head>
<body><div class="card"><div class="ok">✓</div><h1>Đã liên kết ${name}</h1><div class="who">${esc(who)}</div>
<div class="n">Đã kéo ${pulled} hội thoại mới · ${total} hội thoại trên tài khoản. Bạn có thể đóng cửa sổ này và quay lại Zemory.</div>
<div class="en">${name} linked as <b>${esc(who)}</b> — pulled ${pulled} new of ${total} conversations. You can close this window and return to Zemory.</div></div></body></html>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (p === "/connections") {
      // Bảng "Liên kết" cạnh Sources: nguồn nào đang nối, nguồn nào đứt + nút nối lại.
      return json(res, { ok: true, rows: await liveConnections() });
    }
    if (req.method === "POST" && p === "/connect") {
      // Nút "Liên kết" của một nguồn web: có phiên sẵn trong trình duyệt thật thì MƯỢN
      // (không gõ mật khẩu); không thì mở cửa sổ đăng nhập rồi kiểm lại.
      const platform = u.searchParams.get("platform") ?? "";
      // `account` có thể là DANH TÍNH (email của một hàng tài khoản trên cây): tra khe đang giữ
      // nó; không khe nào ⇒ mở KHE MỚI để đăng nhập tài khoản đó, không đè lên khe của người khác.
      const rawAccount = u.searchParams.get("account") ?? undefined;
      const account =
        rawAccount === "new"
          ? freeAccountSlot(platform) // hàng "chưa gắn tài khoản": đăng nhập tài khoản chủ vào khe trống
          : rawAccount && rawAccount.includes("@")
            ? (slotOfIdentity(getWebAuth(), platform, rawAccount) ?? freeAccountSlot(platform))
            : rawAccount;
      const src = account && account !== "main" ? null : findBorrowSource(platform);
      let backup: string | undefined;
      if (src) {
        const b = borrowCookies({ platform, from: src.from, profile: src.profile, replace: true });
        if (!b.ok) return json(res, { ok: false, error: b.error, rows: await liveConnections() });
        backup = b.backup;
      }
      const web = await scanWebPlatforms([platform], account);
      // LÙI LẠI nếu mượn không ăn. Đo 2026-07-30: cookie chép từ Chrome sang profile khác
      // KHÔNG mở được phiên (App-Bound Encryption) — mà profile vừa bị thay có thể đang
      // đăng nhập ngon. Không có bước này thì nút "thử mượn" là nút phá.
      if (backup) {
        if (web[0]?.status === "done") dropBackup(backup);
        else {
          restoreProfile(webProfileDir(platform, account), backup);
          const after = await scanWebPlatforms([platform], account);
          if (after[0]?.status === "need-login") startLoginWatch(platform, account);
          invalidateDashboard();
          return json(res, { ok: true, borrowed: null, borrowFailed: true, web: after, rows: await liveConnections() });
        }
      }
      // Cửa sổ đăng nhập đang mở ⇒ daemon canh tiếp; UI không phải giữ vòng hỏi nào.
      if (web[0]?.status === "need-login") startLoginWatch(platform, account);
      invalidateDashboard();
      return json(res, { ok: true, borrowed: src ? { ...src } : null, web, rows: await liveConnections() });
    }
    if (req.method === "POST" && p === "/memory-digest") {
      // Build the extractive digest for every session that lacks one (or whose
      // transcript grew since — digestBackfill is content-hash guarded, so already
      // fresh sessions are a no-op). Powers the System "Build digest" button.
      const r = digestBackfill();
      invalidateDashboard();
      return json(res, { ok: true, ...r });
    }
    if (req.method === "POST" && p === "/memory-backup") {
      // Snapshot the whole memory DB to a standalone .db file (safe SQLite online
      // backup). Non-destructive. Powers Drive Sync → Backup.
      try {
        const r = await backupMemory();
        return json(res, { ok: true, outPath: r.outPath, bytes: r.bytes });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    if (req.method === "POST" && p === "/memory-restore") {
      // Replace the live DB with a snapshot file (destructive — the caller must
      // confirm in the UI). Keeps the previous DB as a .bak. Powers Restore.
      const path = u.searchParams.get("path") ?? "";
      if (!path) return json(res, { ok: false, error: "path required" });
      try {
        const r = await restoreMemoryBackup({ backupPath: path, force: true });
        invalidateDashboard();
        return json(res, { ok: true, previousBackupPath: r.previousBackupPath, bytes: r.bytes });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    if (req.method === "POST" && p === "/memory-forget") {
      // Delete memory for a scope. Without force = DRY RUN (counts only). With
      // force = actually delete (auto-backup first). Scope is required so a blank
      // request can never wipe everything. Powers Drive Sync → Forget.
      const project = u.searchParams.get("project") ?? "";
      if (!project) return json(res, { ok: false, error: "project required" });
      const force = u.searchParams.get("force") === "1";
      try {
        const r = await forgetMemory({ project, force });
        if (force) invalidateDashboard();
        return json(res, { ok: true, dryRun: r.dryRun, sessions: r.sessions, messages: r.messages, digests: r.digests, backupPath: r.backupPath });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    if (req.method === "POST" && p === "/memory-redact") {
      // Re-run the secret/PII redactor over already-stored content (masks tokens,
      // keys, emails that slipped in). Powers Drive Sync → Redact.
      try {
        const r = await reRedactMemory();
        invalidateDashboard();
        return json(res, { ok: true, ...r });
      } catch (e) {
        return json(res, { ok: false, error: String((e as Error).message || e) });
      }
    }
    // TÌM: mặc định lớp RẺ (FTS + bộ lọc), lớp ngữ nghĩa chỉ chạy khi được XIN (`deep=1`).
    //
    // Đây là quay về đúng thiết kế gốc (HP điều 8 — progressive disclosure) mà bề mặt này đã
    // trôi khỏi: nó gọi thẳng `recall()` = hybrid + rerank cho MỌI lần gõ. Đo trên kho thật
    // 2026-08-02: **FTS 360ms · hybrid 20,5s · hybrid+rerank 63,6s** (51s cả khi model đã
    // ấm) — và vì chạy ngay trên event loop của daemon, mỗi lần tìm là cả giao diện đứng
    // hình, kể cả `/memory-status` vốn 4ms. Nay: gõ tìm = 360ms; muốn ngữ nghĩa thì bấm xin,
    // và lớp đó chạy ở TIẾN TRÌNH CON để daemon không nghẹt (cùng lý do embed/sync đã tách).
    if (p === "/memory-search") {
      const days = Number(u.searchParams.get("days") || 0);
      const opts = {
        project: target,
        all: u.searchParams.get("all") === "1",
        source: u.searchParams.get("agent") || undefined,
        origin: u.searchParams.get("origin") || undefined,
        role: u.searchParams.get("role") || undefined,
        sinceMs: days > 0 ? Date.now() - days * 86400000 : undefined,
        hasAttachment: u.searchParams.get("withAtt") === "1",
      };
      // `also` = cách diễn đạt KHÁC của cùng câu hỏi (đa-truy-vấn RRF, plan 17 §1.1). Nhận
      // nhiều tham số `also=` hoặc một chuỗi ngăn bằng `|`. Có `also` ⇒ BUỘC đi đường sâu:
      // gộp nhiều lối nói cần lớp vector, mà lớp đó chỉ sống ở tiến trình con (nạp ONNX trên
      // event loop của daemon là treo cả app — cùng lý do đường nhanh vẫn là FTS thuần).
      const also = [
        ...u.searchParams.getAll("also"),
        ...(u.searchParams.get("alsoList") ?? "").split("|"),
      ]
        .map((s) => s.trim())
        .filter(Boolean);
      const deep = u.searchParams.get("deep") === "1" || also.length > 0;
      if (!deep) return json(res, withAttachments(search(u.searchParams.get("q") ?? "", opts)));
      const r = await deepSearchChild(u.searchParams.get("q") ?? "", opts, also);
      if (!r.ok) return json(res, { error: r.error, hits: [] });
      return json(res, withAttachments(r.hits));
    }
    if (p === "/memory-context") {
      // Drill-down WITHIN a recall already counted by /memory-search; not logged
      // separately (same 'recall' feature) to avoid double-counting.
      const ctx = getMessageContext(Number(u.searchParams.get("id")), 3);
      if (!ctx) return json(res, {});
      return json(res, { ...ctx, messages: withAttachments(ctx.messages) });
    }
    if (p === "/attachment") {
      // Content-addressed ⇒ một sha luôn ra cùng bytes ⇒ cache vĩnh viễn được. `private`
      // vì đây là dữ liệu riêng của máy này. Đọc TRƯỚC rồi mới cam kết header — cùng bẫy
      // treo đã vá ở `serveFrontend`/`serveBinary` (writeHead(200) trước readFileSync).
      const a = attachmentBlob(u.searchParams.get("sha") ?? "");
      if (!a) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("not found");
      }
      res.writeHead(200, {
        "content-type": a.mime,
        "content-length": String(a.bytes.length),
        // `inline` = vẫn hiện trong trang, nhưng ĐẶT TÊN cho lúc "Save image as" — nếu
        // không, trình duyệt lấy đoạn cuối đường dẫn và mọi ảnh đều lưu thành "attachment".
        // Tên đã lọc ký tự cấm ở `downloadName()`, nên nhét vào header là an toàn.
        "content-disposition": `inline; filename="${a.name}"`,
        "cache-control": "private, max-age=31536000, immutable",
        // Ảnh do người khác gửi vào chat: chặn trình duyệt tự đoán kiểu và chặn nhúng
        // chéo trang, phòng ca một "ảnh" thật ra là HTML.
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      });
      return res.end(a.bytes);
    }
    if (p === "/memory-session") {
      const th = getSessionThread(u.searchParams.get("id") ?? "");
      if (!th) return json(res, {});
      return json(res, { ...th, messages: withAttachments(th.messages) });
    }
    if (p === "/recent-messages") {
      // Recall default list (never empty): newest messages, scoped like recall.
      const days = Number(u.searchParams.get("days") || 0);
      return json(res, withAttachments(queryRecentMessages(Math.min(50, Number(u.searchParams.get("limit") || 25)), {
        all: u.searchParams.get("all") === "1",
        project: target,
        days: days > 0 ? days : undefined,
        role: u.searchParams.get("role") || undefined,
        origin: u.searchParams.get("origin") || undefined,
        agent: u.searchParams.get("agent") || undefined,
        withAtt: u.searchParams.get("withAtt") === "1",
      })));
    }
    if (p === "/recent-sessions") {
      // Home "Recent Sessions": the last session of each project, newest first.
      return json(res, queryRecentSessions(Math.min(20, Number(u.searchParams.get("limit") || 8))));
    }
    if (p === "/sessions") {
      // Session Viewer: full session list (not deduped), newest first.
      // `fresh=1` first refreshes titles from each transcript's tail so a session the user
      // just renamed (`/title`) shows its NEW name without waiting for the next full scan
      // (user 2026-07-26: "tui đổi xong thì trên app phải lấy cái mới nhất tự đổi theo").
      // Cheap + fail-open: metadata only, never touches messages/ingest_state.
      if (u.searchParams.get("fresh") === "1") {
        try {
          refreshSessionTitles();
        } catch {
          /* fail-open (điều 9): danh sách vẫn trả được với tên đang có trong DB */
        }
      }
      const sDays = Number(u.searchParams.get("days") || 0);
      return json(
        res,
        querySessions(Math.min(300, Number(u.searchParams.get("limit") || 80)), Number(u.searchParams.get("offset") || 0), {
          q: (u.searchParams.get("q") || "").trim() || undefined,
          days: sDays > 0 ? sDays : undefined,
          origin: u.searchParams.get("origin") || undefined,
          agent: u.searchParams.get("agent") || undefined,
          host: u.searchParams.get("host") || undefined,
          withAtt: u.searchParams.get("withAtt") === "1",
        }),
      );
    }
    if (p === "/insights") {
      return json(res, insightsData(Math.min(120, Math.max(7, Number(u.searchParams.get("days") || 30)))));
    }
    if (req.method === "POST" && p === "/relocate") {
      // Move the memory DB off the system drive to a plain local folder. Safe:
      // relocateMemory verifies the copy and keeps the old DB as a .bak.
      const path = (u.searchParams.get("path") ?? "").trim();
      const force = u.searchParams.get("force") === "1";
      try {
        const r = relocateMemory(path, { force });
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
    if (p === "/set-context-warn") {
      // Ngưỡng % context mà hook nhắc chốt sổ. Giá trị lạ (chữ, rỗng, ngoài khoảng) KHÔNG
      // được làm hỏng cấu hình: `setContextWarnPercent` tự kẹp, còn NaN thì giữ nguyên bản cũ.
      const raw = Number(u.searchParams.get("percent"));
      if (Number.isFinite(raw)) setContextWarnPercent(raw);
      return json(res, { ok: Number.isFinite(raw), contextWarnPercent: getContextWarnPercent() });
    }
    // Realtime capture: cờ config CHỈ là ý định — thứ thật sự nạp là hook trong settings của
    // host. Nên công tắc phải kéo theo install/uninstall, không thì bật xong không có gì chạy
    // (và tắt xong hook vẫn còn) — đúng kiểu "sổ nói khác code" mà repo này ghét nhất.
    if (p === "/set-realtime") {
      const on = u.searchParams.get("on") === "1";
      setRealtimeSetting(on);
      let hook: { path: string; changed: string[] };
      try {
        hook = on
          ? (() => { const r = installHooks(); return { path: r.path, changed: r.added }; })()
          : (() => { const r = uninstallHooks(); return { path: r.path, changed: r.removed }; })();
      } catch (e) {
        return json(res, { ok: false, realtime: getRealtime(), error: e instanceof Error ? e.message : "hook write failed" });
      }
      return json(res, { ok: true, realtime: getRealtime(), hookPath: hook.path, changed: hook.changed });
    }
    if (p === "/set-sync-level") {
      setSyncLevel(u.searchParams.get("level") === "full" ? "full" : "lean");
      return json(res, { ok: true, level: getSyncLevel() });
    }
    // L3 (plan 08 §7 bước ③) — công tắc chở ảnh/file trong bundle sync. MẶC ĐỊNH TẮT:
    // bundle lean vừa cắt −74%, thả blob vào là xoá phần lớn lợi ích đó nên phải là
    // lựa chọn có ý thức của từng máy.
    if (p === "/set-sync-attachments") {
      setSyncAttachments(u.searchParams.get("on") === "1");
      return json(res, { ok: true, syncAttachments: getSyncAttachments() });
    }
    if (p === "/set-repo-std-check") {
      setRepoStdCheck(u.searchParams.get("on") === "1");
      harnessUpdCache = null;
      return json(res, { ok: true, repoStdCheck: getRepoStdCheck() });
    }
    if (p === "/harness-updates") {
      // "Chấm than update" (2026-08-21): repo nào trong registry đang CŨ so với bộ chuẩn
      // hiện hành (file template thiếu / guard lỗi thời). CHỈ ĐO — hành động áp là việc của
      // agent/user bên repo đó. Cache 5': phép đo là vài trăm existsSync, rẻ nhưng không free,
      // và độ tươi từng phút không có giá trị với thứ đổi vài lần một tuần.
      const now = Date.now();
      // `fresh=1` sau khi vừa áp chuẩn cho một repo: đo lại ngay, không đợi hết 5′ cache.
      if (!harnessUpdCache || now - harnessUpdCache.at > 300_000 || u.searchParams.get("fresh") === "1") {
        const stale: Array<{ root: string; name: string; missing: number; guardStale: number }> = [];
        try {
          // Công tắc "kiểm repo khác dùng chuẩn" tắt ⇒ không đo vòng repo, chip chỉ còn bản zemory.
          for (const proj of getRepoStdCheck() ? listKnownProjects() : []) {
            if (!existsSync(proj.root)) continue;
            const r = syncCheck(proj.root);
            if (r.connected && (r.missing.length || r.guardStale.length)) {
              stale.push({ root: proj.root, name: proj.name, missing: r.missing.length, guardStale: r.guardStale.length });
            }
          }
        } catch {
          /* fail-open — bề mặt nhắc, không được chết */
        }
        harnessUpdCache = { at: now, stale };
      }
      // `appUpdate` là sự thật cấp MÁY (bản zemory này cũ hơn kênh chung), KHÔNG cache theo
      // 5' của vòng repo: nó rẻ (đọc một file JSON nhỏ) và là thứ user cần thấy sớm nhất.
      return json(res, { checkedAt: new Date(harnessUpdCache.at).toISOString(), stale: harnessUpdCache.stale, appUpdate: channelUpdate(), repoStdCheck: getRepoStdCheck() });
    }
    if (p === "/automation") {
      // State for the ⚙ automation panel: config flags + real autostart status.
      return json(res, {
        autostart: getAutostart(), autosync: getAutosync(), scheduler: getScheduler(),
        // `realtime` = ý định; `realtimeWired` = SỰ THẬT (hook có trong settings của host
        // không). Phơi cả hai vì chúng lệch được: user sửa tay settings.json, hoặc cài trên
        // máy chưa có Claude Code. Chỉ hiện cờ config là hứa suông.
        realtime: getRealtime(), realtimeWired: hooksInstalled(),
        // Ngưỡng % context mà hook nhắc chốt sổ (kẹp [50,99] ở settings). Đi cùng công tắc
        // realtime vì lời nhắc là một phần của tính năng đó — UI chỉnh qua /set-context-warn.
        contextWarnPercent: getContextWarnPercent(),
        os: autostartStatus(), shortcut: desktopShortcutStatus(),
        // Có ĐANG chạy job nền không (embed/scan). Đo 2026-07-28: job embed nền ngốn
        // 4.592 s CPU làm MỌI endpoint chậm 2–9× mà giao diện không hề nói gì — phải mở
        // `Get-Process` mới thấy. Phơi ra đây để lần sau nhìn là biết.
        embedRunning: schedulerChildRunning(),
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
      // `preempt`: đây là NGƯỜI bấm, không phải máy tự chạy ⇒ chuỗi bảo trì phải nhường
      // (user chốt 2026-08-28). Auto-sync của scheduler KHÔNG truyền cờ này — nó xếp hàng.
      const st = startSyncJob(() => invalidateDashboard(), { preempt: true });
      if (!st.running && st.ok === false) {
        // `yielding…` KHÔNG phải lỗi: chuỗi bảo trì đang rút lui và sync sẽ tự khởi động sau
        // vài giây. Trả `ok:true` để bề mặt hiện "đang chờ tới lượt" thay vì một câu đỏ cụt —
        // báo hỏng cho một việc đang chạy đúng kế hoạch là cách nhanh nhất làm người dùng bấm loạn.
        if (st.error?.startsWith("yielding")) return json(res, { ok: true, running: false, pending: true, note: st.error });
        return json(res, { ok: false, error: st.error ?? "could not start sync" });
      }
      return json(res, { ok: true, running: true, startedAt: st.startedAt });
    }
    if (p === "/sync-status") {
      // Progress probe for the run-hidden sync dialog / Global-tab spinner.
      return json(res, syncJobStatus());
    }
    if (p.startsWith("/scripts/") && p.endsWith(".js")) return serveFrontend(res, "scripts", basename(p), "text/javascript; charset=utf-8");
    if (p.startsWith("/styles/") && p.endsWith(".css")) return serveFrontend(res, "styles", basename(p), "text/css; charset=utf-8");
    if (p === "/favicon.ico") return serveBinary(res, "assets", "favicon.ico");
    if (p === "/manifest.webmanifest") return serveBinary(res, "assets", "manifest.webmanifest");
    if (p.startsWith("/assets/")) return serveBinary(res, "assets", basename(p));
    // UI refactor (plan 15) — vỏ "AI Memory OS" 5 màn là app DUY NHẤT (phục vụ ở /
    // và /app). Cockpit cũ đã nghỉ hưu 2026-07-27: 18 file chuyển sang
    // attic/frontend-cockpit/, route /cockpit gỡ bỏ. Nó từng là đường lui trong lúc
    // chuyển đổi, nhưng giữ lâu thành nợ: cả bộ test UI vẫn neo vào nó nên UI thật
    // chạy nhiều vòng mà không có gate nào (nay là backend/test/app-ui.test.mjs).
    // Đường LẠ mà trông như API thì phải 404, KHÔNG rơi vào vỏ app.
    //
    // Trước đây mọi path không khớp đều trả 200 + HTML. Hệ quả đo được trong audit
    // 2026-08-02: phép quét bề mặt sống của tôi gọi `/scope-tree` (endpoint KHÔNG tồn tại —
    // dữ liệu đó nằm trong `/memory-status`) và nhận **200**, nên bảng kết quả báo "TẤT CẢ
    // 200" trong khi một mục là hư không. Client cũng chịu chung: gõ sai một chữ trong tên
    // endpoint thì nhận HTML rồi vỡ ở `JSON.parse`, với thông báo chẳng liên quan gì.
    // Chỉ hai đường được nhận vỏ app: `/` và `/app` — phần còn lại là thật hoặc là 404.
    if (p !== "/" && p !== "/app") {
      res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "not found", path: p }));
    }
    // no-store: vỏ đọc thẳng từ đĩa mỗi request; thiếu nó thì cửa sổ WebView2 có thể
    // hiện trang cũ đã cache sau khi sửa + khởi động lại.
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(readFileSync(join(FRONTEND_DIR, "pages", "app.html"), "utf8"));
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
      autoOpen(url);
      server.close();
      return;
    }
    console.log(`zemory ui — already running (pid ${running.pid}) -> ${url}`);
    autoOpen(url);
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
  // This process IS the daemon now (it won the port). Arm the crash black box
  // FIRST (a native segfault in a later step must still leave a report), then
  // reconcile the OS autostart hook and start the idle background scheduler.
  armCrashReport();
  daemonLog(`daemon up on ${url} pid=${process.pid}`);
  // Mồi 3 check RẺ (FTS query · đọc docs · đọc skill — <1s mỗi cái) để cửa sổ đầu tiên mở ra
  // là pill sáng liền. CỐ Ý không mồi probe sâu (vector/rerank nạp model 8s+ — giữ thủ công).
  setTimeout(() => {
    for (const f of ["memory", "validate", "grill"]) {
      void runCheck(f).then((r) => checkCache.set(`${f}|`, { at: Date.now(), r })).catch(() => {});
    }
  }, 1500);
  // Nhịp tim mỗi 30 s — thứ DUY NHẤT còn lại khi daemon bị giết cứng (xem daemon-log.ts).
  // `unref` để nó không giữ tiến trình sống thêm một nhịp nào.
  daemonHeartbeat();
  setInterval(daemonHeartbeat, 30_000).unref();
  reconcileAutostart(getAutostart());
  startScheduler();
  autoOpen(url);
  // System-tray presence (fail-open, HP điều 9): Open re-focuses the window, Quit
  // stops the daemon. Only the instance that WON the port reaches here — the
  // attach paths above already returned — so there is never a second icon.
  // Clear any GHOST tray icon a hard-killed / crashed prior instance left behind
  // (Windows keeps it until hover); then add ours. Ports SasinFlow's startup sweep.
  sweepDeadTrayIcons();
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
    daemonLog(`shutting down (${reason})`);
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
  process.on("exit", (code) => daemonLog(`process exit code=${code}`));
  process.on("uncaughtException", (e) => {
    daemonLog(`uncaughtException: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
    process.exit(1);
  });
  process.on("unhandledRejection", (e) => {
    daemonLog(`unhandledRejection: ${e instanceof Error ? (e.stack ?? e.message) : e}`);
  });
}
