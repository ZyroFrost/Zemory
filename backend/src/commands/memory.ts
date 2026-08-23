// `zemory memory <scan|scan-web|search|embed|scope|hosts|digest|sync|export|
//  import|forget|redact|backup|restore|relocate|vacuum|bench>` — the global
// Memory: ingest, hybrid recall, vectors, provenance scope, sync, privacy.
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { basename, dirname, join, resolve } from "node:path";
import { rebuildFts, reconcileCounts, reopenIngest, salvageMemory, salvageVectors, vectorDimsOf, verifyMemory } from "../memory/salvage.js";
import { currentMemoryDb, openMemory } from "../memory/db.js";
import { scanHiddenChars } from "../memory/redact.js";
import { currentProjectRoot } from "../core/config.js";
import { uiPort } from "../ui.js";
import { type ScanReport, memoryHostTree, memoryInfo, scan } from "../memory/ingest.js";
import { type Digest, digestBackfill, getDigest, searchDigests } from "../memory/digest.js";
import { embedConfig, embedProfileSpec } from "../memory/embed.js";
import { dropVectorIndex, embedPending, vectorCount, vectorCoverage, vectorIndexInfo, vectorRemaining } from "../memory/vectors.js";
import { runRagBench } from "../evals/ragbench.js";
import { formatRecallBench, runRecallBench } from "../evals/recallbench.js";
import { scanWeb } from "../memory/scanweb.js";
import { borrowCookies, cookieSources, listSourceProfiles } from "../memory/borrowcookies.js";
import { relocateMemory, storageInfo } from "../memory/relocate.js";
import { type SearchHit, getMessage, hybridEnabled, rerankEnabled, search, searchHybrid, searchMulti } from "../memory/search.js";
import {
  exportMemoryBundle,
  importMemoryBundle,
  mergeMemoryBundle,
  pruneDriveHost,
  readExportWatermark,
  resolveShareKey,
  setShareKey,
  shareKeyFingerprint,
  shareKeyPath,
  shareKeyStatus,
  syncDrive,
  writeMemoryShareKey,
  writeExportWatermark,
} from "../memory/share.js";
import { type ScopeNode, scopeTree, toggleLane } from "../memory/scope.js";
import { getDriveDir, getScopeExclude, setScopeExclude, type ScopeLane } from "../config/settings.js";
import { backupMemory, forgetMemory, reRedactMemory, restoreMemoryBackup, vacuumMemory } from "../memory/privacy.js";
import { acquireCliWriteLock, cliWriteHolder, releaseCliWriteLock } from "../jobs/writegate.js";
import { flagValue, positionalArgs } from "./_shared.js";

function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

/**
 * The "log in / log in AGAIN" prompt for `scan-web`.
 *
 * A web session expires or gets signed out, and the old flow just stopped with a
 * message telling the user to re-run — including when the browser was already open
 * (so the message claimed a window had been opened when none had). Now scanWeb opens
 * and focuses the window, then asks here, then re-checks — the run continues in place.
 *
 * Returns undefined when stdin is NOT a TTY: a daemon child or a piped run must never
 * block on a question nobody can answer, so it falls back to reporting 'need-login'.
 */
function loginPrompt(): ((ctx: { platform: string; url: string; expired: boolean }) => Promise<boolean>) | undefined {
  if (!process.stdin.isTTY) return undefined;
  return async ({ platform, url, expired }) => {
    console.log("");
    console.log(
      expired
        ? `  ⚠ The ${platform} session EXPIRED mid-run — everything pulled so far is already saved.`
        : `  → Not signed in to ${platform} (or the session expired).`,
    );
    console.log(`     A browser window is open at ${url}. Sign in there — the password stays in the browser and never touches zemory.`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const a = await rl.question("     Press Enter when you are signed in, or type s to stop: ");
      return a.trim().toLowerCase() !== "s";
    } finally {
      rl.close();
    }
  };
}

function printDigest(d: Digest): void {
  const n = (v: number) => v.toLocaleString();
  console.log(`session ${d.session_id}  [${d.meta.source} · ${d.meta.host}] · ${d.kind}`);
  console.log(
    `  project: ${d.meta.project_root ?? "(unknown)"} · ${n(d.meta.messages)} msg · ${fmtDate(d.meta.from)} → ${fmtDate(d.meta.to)}`,
  );
  const block = (label: string, items: { text: string; id: number }[]) => {
    if (!items.length) return;
    console.log(`  ${label}:`);
    for (const it of items) console.log(`    · ${it.text}  (#${it.id})`);
  };
  block("tasks", d.tasks);
  block("decisions", d.decisions);
  block("errors", d.errors);
  if (d.paths.length) console.log(`  paths touched: ${d.paths.join(" · ")}`);
  if (d.outcome) console.log(`  outcome: ${d.outcome}`);
}

function printScanReport(r: ScanReport): void {
  console.log(`zemory memory scan — global memory at ${r.dbPath}`);
  console.log(
    `  mode: ${r.deep ? `deep (walked ${r.roots.length} root(s))` : "fast (known locations)"}`,
  );
  console.log(`  scanned ${r.scannedFiles} file(s), ${r.changedFiles} with new data`);
  // Lane bị loại phải HIỆN RA. Cắt âm thầm là cách người dùng ngồi tự hỏi vì sao thiếu
  // dữ liệu mà không có chỗ nào nói — cùng nguyên tắc `memory scope ls` đánh dấu ✗ EXCLUDED.
  for (const s of r.skippedLanes) {
    console.log(`  ✗ bỏ qua ${s.files} file của lane ${s.lane} (đang bị loại — \`zemory memory scope ls\`)`);
  }
  console.log("");
  console.log(`  agents (${r.agents.length}):`);
  for (const a of r.agents) {
    console.log(
      `    · ${a.source} — ${a.sessions} session(s), ${a.messages} message(s), ${fmtDate(a.from)} → ${fmtDate(a.to)}`,
    );
  }
  console.log("");
  console.log(`  changed sessions (${r.sessions.length}):`);
  for (const s of r.sessions) {
    const label = (s.id.length > 12 ? s.id.slice(0, 8) : s.id).padEnd(8);
    const proj = s.project.replace(/\\/g, "/").split("/").slice(-2).join("/");
    const added = s.newMessages > 0 ? ` (+${s.newMessages} new)` : "";
    console.log(
      `    · ${label} [${s.source}] ${fmtDate(s.from)}→${fmtDate(s.to)} · ${s.messages} lines${added} · ${proj}`,
    );
  }
  console.log("");
  const t = r.totals;
  console.log(
    `  ✓ loaded into global memory: +${t.newMessages} message(s) across ${r.changedFiles} session(s) this scan`,
  );
  console.log(
    `    total now: ${t.sessions} session(s) · ${t.messages} message(s) · ${t.agents} agent(s) · ${fmtDate(t.from)} → ${fmtDate(t.to)}`,
  );
  if (r.unknown.length) {
    console.log("");
    console.log(`  ⚠ ${r.unknown.length} unrecognized transcript store(s) — no adapter yet:`);
    for (const u of r.unknown.slice(0, 20)) {
      console.log(`    · ${u.path} (${u.files} file(s), e.g. ${u.sample})`);
    }
    console.log("    → add an adapter to ingest these agents.");
  }
}

function printHits(query: string, scopeLabel: string, hits: SearchHit[]): void {
  console.log(`zemory memory search — "${query}"  (${scopeLabel})`);
  if (!hits.length) {
    console.log("  no matches.");
    return;
  }
  for (const h of hits) {
    const proj = h.project.replace(/\\/g, "/").split("/").slice(-1)[0];
    console.log(
      `  #${h.id} [${h.source}] ${proj} · ${fmtDate(h.timestamp)} · ${h.role}`,
    );
    console.log(`     ${h.snippet}`);
  }
  console.log("");
  console.log(`  ${hits.length} hit(s) — \`zemory memory show <#id>\` for full message.`);
}


// Heavy-write memory subcommands route through the daemon's write gate (plan 14
// §C): if the `zemory ui` daemon is alive, tell it to pause its idle scheduler
// while we write, so the two processes never collide on SQLite. Daemon dead →
// run directly (fallback). Auto-expiring hold + the engine's own retry are the
// safety nets. Kept advisory (no delegation) so a multi-hour `embed --all` never
// hits an HTTP timeout.
const HEAVY_WRITES = new Set(["scan", "scan-web", "embed", "digest", "sync"]);

/**
 * CỜ LẠ BỊ TỪ CHỐI — không "bỏ qua âm thầm rồi chạy thật".
 *
 * Ba lệnh dưới đều GHI vào kho và không lệnh nào có `--help`, nên gõ sai một cờ là chạy
 * job thật thay vì in trợ giúp. Đã dính đúng hai lần ngày 2026-08-22: `memory embed --help`
 * khởi động job nhúng (giữ `cli-write.lock` hàng giờ, bỏ đói backup) và `memory scan --help`
 * quét + nạp thật. Nặng hơn ca `zemory archive` đã vá `[2026-08-22b]` vì cùng bề mặt còn có
 * `--rebuild` — lệnh XOÁ nguyên chỉ mục véc-tơ, mà cờ lạ được cho qua thì không còn đường
 * "xem thử" nào an toàn.
 *
 * Chốt đặt TRƯỚC write-gate có chủ đích: từ chối phải xảy ra khi chưa ghi byte nào và chưa
 * giữ khoá. Đặt sau đó thì lệnh vẫn chiếm khoá rồi mới báo lỗi.
 */
const HEAVY_FLAGS: Record<string, { allow: Set<string>; usage: string }> = {
  scan: { allow: new Set(["--deep"]), usage: "zemory memory scan [--deep]" },
  embed: {
    allow: new Set(["--all", "--rebuild", "--limit"]),
    usage: "zemory memory embed [--all] [--rebuild] [--limit <n>]",
  },
  digest: { allow: new Set(["--all"]), usage: "zemory memory digest [<session-id>] [--all]" },
};

/** true ⇒ đã in usage + đặt exit code; NGƯỜI GỌI PHẢI DỪNG, không chạy gì. */
export function rejectUnknownFlags(sub: string, args: string[]): boolean {
  const spec = HEAVY_FLAGS[sub];
  if (!spec) return false;
  const bad = args.slice(1).filter((a) => a.startsWith("--") && !spec.allow.has(a));
  if (bad.length === 0) return false;
  console.log(`zemory memory ${sub}: unknown flag ${bad.join(" ")}`);
  console.log(`  usage: ${spec.usage}`);
  console.log("  (lệnh này GHI vào kho nên cờ lạ bị TỪ CHỐI — không chạy gì, không giữ khoá.)");
  process.exitCode = 1;
  return true;
}
async function daemonPort(): Promise<number | null> {
  const port = uiPort();
  try {
    const r = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(400) });
    const b = (await r.json()) as { app?: string };
    return b?.app === "zemory" ? port : null;
  } catch {
    return null;
  }
}
export async function cmdMemory(args: string[]): Promise<void> {
  const sub = args[0];
  // Cờ lạ ⇒ dừng NGAY, trước cả write-gate (xem `rejectUnknownFlags`).
  if (rejectUnknownFlags(sub, args)) return;
  // Write gate: hold the daemon's scheduler off while a heavy write runs here.
  // Shape matters (audit 2026-07-21): the old version wrapped the RUN in the
  // same try as the acquire, so an inner error was swallowed and the whole
  // heavy command ran a SECOND time gate-less (embed --rebuild would drop the
  // index twice). Now: (a) gating is best-effort around the run, the run itself
  // executes exactly ONCE and its errors propagate; (b) a heartbeat renews the
  // 5-min hold so multi-hour jobs don't silently lose it; (c) if the daemon
  // reports its own child writing (busy), wait briefly instead of colliding.
  // A child the DAEMON itself spawned (scheduler embed pass) must skip the gate:
  // the daemon already serialized it via its job token — gating here made the
  // child wait on ITSELF and its hold blocked the sync button for the whole run.
  if (process.env.ZEMORY_DAEMON_CHILD === "1") {
    // Con của daemon bỏ qua cổng HTTP + khoá file CỦA CHÍNH NÓ — daemon đã giữ job token,
    // gating ở đây từng làm nó chờ chính mình. NHƯNG token đó chỉ điều phối giữa các job
    // CỦA DAEMON; nó mù với CLI chạy tay bên ngoài.
    //
    // 🔴 Đây là nguyên nhân GỐC của ca 2026-08-08 (hai `embed --all` cùng ghi một kho): khi
    // user bật app, scheduler sinh con với cờ này, con bỏ qua sạch write-gate và ghi đè lên
    // một backfill đang chạy — trong khi `cli-write.lock` ghi rõ pid khác đang giữ. Bỏ qua
    // khoá CỦA MÌNH là đúng; bỏ qua khoá của NGƯỜI KHÁC là đúng tổ hợp đã hỏng kho 03/08.
    if (HEAVY_WRITES.has(sub)) {
      const held = cliWriteHolder();
      if (held && held.pid !== process.pid && held.pid !== Number(process.env.ZEMORY_DAEMON_PID)) {
        console.error(
          `zemory memory ${sub} (job nền): BỎ QUA — CLI khác đang ghi kho (pid ${held.pid}, ${held.label}).`,
        );
        return; // lượt nền bỏ qua là chuyện thường; lượt sau sẽ lượm lại
      }
    }
    await cmdMemoryInner(args);
    return;
  }
  let gated = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let port: number | null = null;
  let locked = false;
  if (HEAVY_WRITES.has(sub)) {
    // KHOÁ FILE trước, độc lập với daemon. Cổng HTTP bên dưới chỉ để bảo scheduler nhường;
    // nó KHÔNG loại trừ CLI↔CLI và biến mất khi daemon chết (xem `writegate.ts`).
    //
    // 🔴 SỬA 2026-08-08 — bản trước chờ 2 phút rồi CHẠY LUÔN, và điều đó biến khoá thành vô
    // nghĩa cho đúng loại việc cần nó nhất. Bắt được ĐANG XẢY RA: hai `memory embed --all`
    // cùng ghi một kho (pid 15640 + pid 11092 do daemon sinh khi vừa bật app) — đúng tổ hợp
    // đã hỏng kho 03/08. `cli-write.lock` lúc đó ghi rõ pid 15640 đang giữ, tức khoá ĐÃ từ
    // chối đúng; chỉ là NGƯỜI GỌI bỏ qua lời từ chối. Với job embed dài hàng giờ thì nhánh
    // "chạy luôn" là nhánh LUÔN LUÔN được chọn.
    //
    // Nay phân biệt khoá TƯƠI với khoá MỒ CÔI thay vì đếm thời gian chờ. Ý định gốc của
    // "chờ rồi chạy" là chống kẹt vĩnh viễn (điều 9) — nhưng `cliWriteHolder()` ĐÃ tự loại
    // khoá của pid chết và khoá quá `CLI_LOCK_STALE_MS`. Nên khoá còn sống = chủ nó còn sống
    // THẬT ⇒ phải DỪNG, không ghi đè. Muốn ép thì có `--force`, và đó là lựa chọn có ý thức.
    // Chờ NGẮN (30 s), không phải 2 phút: đủ cho một job ngắn (digest/scan nhỏ) chạy xong và
    // nhường, nhưng không bắt người gõ lệnh ngồi đợi 2 phút chỉ để nhận lời từ chối. Job dài
    // hàng giờ thì chờ bao lâu cũng vô ích — trả lời sớm mới đúng.
    const forced = args.includes("--force");
    for (let i = 0; i < (forced ? 1 : 6); i++) {
      const g = acquireCliWriteLock(sub);
      if (g.ok) {
        locked = true;
        break;
      }
      if (forced) break;
      if (i === 0) console.log(`  tiến trình khác đang ghi kho (pid ${g.heldBy?.pid}, ${g.heldBy?.label}) — chờ…`);
      await new Promise((r) => setTimeout(r, 5000));
    }
    if (!locked) {
      const held = cliWriteHolder();
      if (held && !forced) {
        const mins = Math.round((Date.now() - held.at) / 60_000);
        console.error(
          `zemory memory ${sub}: DỪNG — tiến trình khác đang ghi kho (pid ${held.pid}, ${held.label}, đã ${mins} phút).\n` +
            "  Hai tiến trình cùng ghi vector là đúng tổ hợp đã hỏng kho 2026-08-03, nên lệnh này KHÔNG chạy đè.\n" +
            "  → chờ nó xong rồi chạy lại; hoặc `--force` nếu bạn chắc tiến trình kia không còn ghi.",
        );
        process.exitCode = 1;
        return;
      }
      // Khoá đã mồ côi (chủ chết / quá hạn) — hoặc user ép bằng --force.
      console.log(`  khoá ghi ${held ? "bị ép bỏ qua (--force)" : "đã mồ côi"} — chạy tiếp.`);
    }
    port = await daemonPort();
    if (port) {
      const acquire = async (): Promise<{ busy?: boolean }> => {
        // Khai luôn KHO mình sắp ghi: daemon cần biết để không bắt việc trên kho KHÁC nhường oan
        // (vd `backupTick` chép kho thật trong khi job này ghi kho song song).
        const r = await fetch(
          `http://127.0.0.1:${port}/gate-acquire?db=${encodeURIComponent(currentMemoryDb())}`,
          { method: "POST", signal: AbortSignal.timeout(400) },
        );
        return (await r.json()) as { busy?: boolean };
      };
      try {
        for (let i = 0; i < 24; i++) {
          const g = await acquire();
          gated = true;
          if (!g.busy) break;
          if (i === 0) console.log("  daemon background job is writing the memory — waiting for it to yield…");
          await new Promise((r) => setTimeout(r, 5000));
        }
        // Nhịp tim gia hạn CẢ HAI: cờ 5 phút của daemon và khoá file 15 phút.
        heartbeat = setInterval(() => {
          if (locked) acquireCliWriteLock(sub);
          void acquire().catch(() => {});
        }, 120_000);
        heartbeat.unref?.();
      } catch {
        gated = false; // gate unreachable — run anyway (retry-backoff is the net)
      }
    }
  }
  try {
    await cmdMemoryInner(args);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (locked) releaseCliWriteLock();
    if (gated && port) {
      try {
        await fetch(`http://127.0.0.1:${port}/gate-release`, { method: "POST", signal: AbortSignal.timeout(400) });
      } catch {
        /* release is best-effort; the hold auto-expires anyway */
      }
    }
  }
}

async function cmdMemoryInner(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === "scan") {
    const deep = args.includes("--deep");
    printScanReport(scan({ deep }));
    return;
  }
  if (sub === "scan-web") {
    const platform = flagValue(args, "--platform") ?? "chatgpt";
    const refresh = args.includes("--refresh");
    const limitRaw = flagValue(args, "--limit");
    const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
    if (limitRaw !== undefined && (!Number.isFinite(limit) || (limit as number) <= 0)) {
      console.log("  ✗ --limit expects a positive number.");
      process.exitCode = 1;
      return;
    }
    // --delay <seconds> between per-conversation fetches. Higher = stays under
    // ChatGPT's 429 window (default 1.5s is fine for small pulls; use 30–60s for
    // a big unattended backfill so it never trips the rate limit).
    const delayRaw = flagValue(args, "--delay");
    const delayMs = delayRaw !== undefined ? Math.round(Number(delayRaw) * 1000) : undefined;
    if (delayRaw !== undefined && (!Number.isFinite(delayMs) || (delayMs as number) < 0)) {
      console.log("  ✗ --delay expects a non-negative number of seconds.");
      process.exitCode = 1;
      return;
    }
    console.log(`zemory memory scan-web — ${platform} (web-chat capture, origin=web)`);
    const r = await scanWeb({ platform, refresh, limit, delayMs, onNeedLogin: loginPrompt() }, (m) => console.log("  " + m));
    if (r.status === "no-browser") {
      console.log("  ✗ no Edge/Chrome found. Set ZEMORY_BROWSER=<path to msedge.exe/chrome.exe> and retry.");
      process.exitCode = 1;
      return;
    }
    if (r.status === "no-tab") {
      console.log(`  ✗ window opened but no ${platform} tab reachable on the debug port yet — wait for it to load, then re-run.`);
      process.exitCode = 1;
      return;
    }
    if (r.status === "need-login") {
      // Two shapes: never signed in, or the session died mid-backfill. The second
      // one already pulled something, so say what survived instead of implying the
      // run did nothing.
      if (r.authExpired) {
        console.log(`  ⚠ the ${platform} session expired mid-run and was not restored.`);
        console.log(`     saved so far: pulled ${r.pulled} · skipped ${r.skipped} · failed ${r.failed} (already ingested — nothing lost).`);
        console.log(`     Log in at ${r.url} in the open window, then re-run \`zemory memory scan-web --platform ${platform}\` to resume.`);
      } else {
        console.log(`  → A dedicated browser window is open at ${r.url}. Log in to YOUR account there (one time — password stays in the browser, never touches zemory), then re-run \`zemory memory scan-web --platform ${platform}\`.`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`  ✓ signed in as ${r.email ?? "?"} · ${r.total} conversation(s) on the account`);
    console.log(`  ↓ pulled ${r.pulled} new · skipped ${r.skipped} (already ingested) · failed ${r.failed}`);
    if (r.scan) {
      // THIS platform's lane, not "the first web-looking one": a claude pull used to
      // sign off with ChatGPT's 859 sessions, which reads as if it captured them.
      const web = r.scan.agents.find((a) => a.source === r.source);
      if (web) console.log(`  ⤷ memory now holds ${web.source}: ${web.sessions} session(s), ${web.messages} message(s)`);
      console.log("  → vectorize the new ones: `zemory memory embed --all`");
    }
    if (r.interrupted) console.log("  ⚠ connection dropped mid-run — pulled batches are saved. Re-run `zemory memory scan-web` to resume the rest.");
    if (r.failed) console.log("  note: some failed (rate-limit?) — just re-run to resume; it skips what's already in.");
    return;
  }
  if (sub === "borrow-cookies") {
    // Mượn phiên ĐÃ đăng nhập từ trình duyệt thật, để không ai phải gõ mật khẩu vào
    // cửa sổ do zemory mở. Chỉ chở cookie của ĐÚNG một nền; giá trị cookie không bao
    // giờ được đọc, chỉ xoá dòng không thuộc nền đó.
    const platform = flagValue(args, "--platform") ?? "chatgpt";
    const from = flagValue(args, "--from");
    const profile = flagValue(args, "--profile");
    const replace = args.includes("--replace");
    if (args.includes("--list")) {
      const srcs = cookieSources();
      if (!srcs.length) console.log("  no Chrome/Edge profile store found on this machine.");
      for (const s of srcs) console.log(`  ${s.key.padEnd(7)} ${s.label} — profiles: ${listSourceProfiles(s).join(" · ") || "(none)"}`);
      return;
    }
    const r = borrowCookies({ platform, from, profile, replace });
    if (!r.ok) {
      console.log(`  ✗ ${r.error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`  ✓ borrowed the ${platform} session from ${r.source} profile '${r.sourceProfile}'`);
    console.log(`     kept ${r.kept} cookie(s) for this site · dropped ${r.dropped} belonging to everything else (never read, just deleted)`);
    console.log(`     that profile will open in ${basename(r.browser ?? "?")} — the key only unwraps in the browser it came from.`);
    console.log(`  → now run: zemory memory scan-web --platform ${platform}`);
    return;
  }
  if (sub === "scope") {
    // Provenance tree + exclude lanes from sync/recall (spec: plan 08). A filter,
    // never a delete — excluded lanes stay in the local DB, just hidden/unsynced.
    const action = args[1];
    const laneFromFlags = (): ScopeLane => {
      const l: ScopeLane = {};
      const o = flagValue(args, "--origin");
      const h = flagValue(args, "--host");
      const s = flagValue(args, "--source");
      if (o !== undefined) l.origin = o;
      if (h !== undefined) l.host = h;
      if (s !== undefined) l.source = s;
      return l;
    };
    if (action === "exclude" || action === "include") {
      const lane = laneFromFlags();
      if (lane.origin === undefined && lane.host === undefined && lane.source === undefined) {
        console.log("usage: zemory memory scope exclude|include [--origin local|web] [--host <machine>] [--source <agent>]");
        process.exitCode = 1;
        return;
      }
      setScopeExclude(toggleLane(getScopeExclude(), lane, action === "exclude"));
      console.log(`zemory memory scope — ${action}d ${JSON.stringify(lane)}`);
      // fall through to print the tree
    } else if (action === "clear") {
      setScopeExclude([]);
      console.log("zemory memory scope — cleared all exclusions");
    } else if (action && action !== "ls") {
      console.log("usage: zemory memory scope [ls] | exclude <sel> | include <sel> | clear");
      console.log("  selector flags: --origin local|web  --host <machine>  --source <agent>");
      return;
    }
    const tree = scopeTree();
    const excluded = getScopeExclude();
    console.log(`zemory memory scope — Local/Web × machine × agent (${excluded.length} lane(s) excluded)`);
    const printNode = (n: ScopeNode, depth: number) => {
      const pad = "  ".repeat(depth + 1);
      const mark = n.excluded ? " ✗ EXCLUDED" : n.effectiveExcluded ? " ✗ excluded (covered by a broader rule)" : "";
      console.log(`${pad}${n.label} — ${n.sessions} session(s), ${n.messages} msg${mark}`);
      for (const c of n.children ?? []) printNode(c, depth + 1);
    };
    for (const n of tree) printNode(n, 0);
    if (!tree.length) console.log("  (memory empty — run `zemory memory scan` first)");
    console.log("  toggle: `zemory memory scope exclude --source codex` · `… include …` · `… clear`");
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const forceFts = rest.includes("--fts");
    const forceHybrid = rest.includes("--hybrid");
    const forceRerank = rest.includes("--rerank");
    const forceNoRerank = rest.includes("--no-rerank");
    const originOpt = flagValue(rest, "--origin"); // 'local' | 'web' | undefined
    const limitRaw = flagValue(rest, "--limit");
    const limit = limitRaw !== undefined ? Math.min(Math.max(1, Number(limitRaw) || 0), 50) : undefined;
    // Drop --flags AND the value token of EVERY value-taking flag. Listing only --origin
    // (as this did until 2026-08-02) meant `search foo --limit 3` searched for "foo 3":
    // the stray token silently changed the ranking, which is worse than ignoring the flag
    // because the output still looks like a normal answer.
    // `--also` LẶP ĐƯỢC: cách diễn đạt KHÁC của cùng câu hỏi (plan 17 §1.1 — đa-truy-vấn RRF).
    // Agent gửi 2–3 lối nói trong MỘT lời gọi; đo được `@10` 39% → 50%, `prose@40` 68% → 94%.
    const alsoQueries = rest.flatMap((a, i) => (rest[i - 1] === "--also" && !a.startsWith("--") ? [a] : []));
    const VALUE_FLAGS = new Set(["--origin", "--limit", "--also"]);
    const query = rest.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(rest[i - 1] ?? "")).join(" ");
    if (!query) {
      console.log(
        "usage: zemory memory search <query> [--also <cách nói khác>]… [--all] [--limit N] [--origin local|web] [--digest] [--hybrid|--fts] [--rerank|--no-rerank] [--no-recency] [--json]   (default mode: ZEMORY_HYBRID / ZEMORY_RERANK; recency blend on)",
      );
      return;
    }
    const recencyOpt = rest.includes("--no-recency") ? false : undefined;
    if (rest.includes("--digest")) {
      // Recall "digest lane": session-level hits (read the thin digest first,
      // drill into messages via `memory digest <session>` / `memory show <#id>`).
      const proj = all ? undefined : (currentProjectRoot());
      const dhits = searchDigests(query, { project: proj, recency: recencyOpt });
      console.log(`zemory memory search — "${query}" · digest lane (${all ? "whole memory" : "this project"})`);
      if (!dhits.length) {
        console.log("  no session digests match. (Run `zemory memory digest --all` if you haven't built them.)");
        return;
      }
      for (const h of dhits) {
        console.log(`  ▪ ${h.session_id}  [${h.meta.source} · ${h.meta.host}]  ${fmtDate(h.meta.to)}`);
        console.log(`     ${h.snippet}`);
      }
      console.log("  → open one: `zemory memory digest <session_id>`");
      return;
    }
    const project = currentProjectRoot();
    const useHybrid = forceHybrid || (!forceFts && hybridEnabled());
    const rerankOpt = forceRerank ? true : forceNoRerank ? false : undefined;
    // Rerank rides the hybrid pipeline; on the plain FTS path it has no effect.
    const useRerank = useHybrid && rerankEnabled(rerankOpt);
    const sOpts = { project, all, origin: originOpt, rerank: rerankOpt, recency: recencyOpt, limit };
    const hits = alsoQueries.length
      ? await searchMulti([query, ...alsoQueries], sOpts)
      : useHybrid
        ? await searchHybrid(query, sOpts)
        : search(query, { project, all, origin: originOpt, recency: recencyOpt, limit });
    // `--json`: đường máy-đọc, cho daemon gọi tìm-sâu ở TIẾN TRÌNH CON thay vì tự chạy ONNX
    // trên event loop của mình (xem jobs/searchjob.ts). In THUẦN JSON, không thêm chữ nào.
    if (rest.includes("--json")) {
      console.log(JSON.stringify(hits));
      return;
    }
    printHits(
      query,
      (all ? "whole memory" : `project: ${project}`) +
        (originOpt ? ` · origin=${originOpt}` : "") +
        (useHybrid ? " · hybrid (FTS+vector)" : " · FTS") +
        (useRerank ? " · rerank (cross-encoder)" : "") +
        (recencyOpt === false ? "" : " · recency"),
      hits,
    );
    return;
  }
  if (sub === "keygen") {
    // Không có đối số ⇒ ghi vào ĐƯỜNG CHUẨN (cạnh DB) thay vì in usage rồi bỏ đi. Trước
    // đây bắt buộc truyền đường dẫn, nên người dùng phải tự đoán chỗ đặt — đoán sai thì
    // `resolveShareKey` không thấy và sync báo "Missing share key" trong khi chìa CÓ, chỉ
    // nằm sai chỗ.
    const out = positionalArgs(args.slice(1))[0] ?? shareKeyPath();
    writeMemoryShareKey(out, { force: args.includes("--force") });
    console.log(`zemory memory keygen — đã ghi ${out}`);
    console.log(`  dấu tay: ${shareKeyFingerprint(readFileSync(out, "utf8"))}   (đối chiếu khi nhập chìa này ở máy khác)`);
    console.log("  Chìa KHÔNG được vào git. Bundle mã hoá là vô dụng nếu thiếu chìa —");
    console.log("  giữ một bản ở note riêng: profile Windows hỏng là mất chìa, không còn đường phục hồi nào.");
    return;
  }
  if (sub === "key") {
    // `key set` = nhập chìa ĐANG CÓ (thêm máy thứ hai) · `keygen` = sinh chìa MỚI (máy đầu).
    // Chìa CHÍNH LÀ danh tính: zemory local-only (điều 7), không có server nào chứng thực
    // "cùng một user", nên danh tính phải do NGƯỜI mang vào từng máy. Đây là ô nhập đó.
    const action = positionalArgs(args.slice(1))[0] ?? "show";
    if (action === "show" || action === "status") {
      const st = shareKeyStatus(currentProjectRoot());
      if (!st.found) {
        console.log("zemory memory key — CHƯA có chìa.");
        console.log(`  máy đầu tiên : zemory memory keygen      (sinh chìa mới → ${st.path})`);
        console.log("  máy thứ hai  : zemory memory key set     (nhập chìa từ máy đầu)");
        return;
      }
      console.log(`zemory memory key — dấu tay ${st.fingerprint} · nguồn: ${st.source}`);
      if (st.path) console.log(`  ${st.path}`);
      console.log("  (chỉ in DẤU TAY. Không in chìa: phiên agent bị ingest vào chính DB mà chìa bảo vệ.)");
      return;
    }
    if (action === "path") {
      console.log(shareKeyPath());
      return;
    }
    if (action === "set") {
      // Đọc từ STDIN (dán rồi Ctrl+Z trên Windows, hoặc pipe từ file). KHÔNG nhận chìa qua
      // đối số dòng lệnh: đối số đi vào history của shell VÀ vào transcript của agent, tức
      // rò đúng kiểu vừa đi vá.
      try {
        const r = setShareKey(readFileSync(0, "utf8"), { force: args.includes("--force") });
        console.log(`zemory memory key set — đã ${r.replaced ? "THAY" : "ghi"} ${r.path}`);
        console.log(`  dấu tay: ${r.fingerprint}`);
        console.log("  So dấu tay này với máy nguồn (`zemory memory key show`) — khác nhau là gõ sai.");
      } catch (error) {
        console.log(`zemory memory key set — ${error instanceof Error ? error.message : "lỗi"}`);
        process.exitCode = 1;
      }
      return;
    }
    console.log("usage: zemory memory key [show|set|path] [--force]");
    console.log("  show  dấu tay + đường dẫn chìa đang dùng (KHÔNG in chìa)");
    console.log("  set   nhập chìa đang có, ĐỌC TỪ STDIN (dán rồi Ctrl+Z, hoặc pipe từ file)");
    console.log("  path  in đường chuẩn của chìa (cạnh DB, KHÔNG phải trong repo)");
    return;
  }
  if (sub === "export") {
    const out = positionalArgs(args.slice(1))[0];
    if (!out) {
      console.log("usage: zemory memory export <out.zemory.enc> [--delta] [--full] [--key-file <path>] [--db <path>] [--force]");
      console.log("  default: LEAN bundle — source rows only (sessions/messages); the receiver rebuilds");
      console.log("           FTS and re-embeds locally. Derived layers are ~87% of the DB and never merge.");
      console.log("  --delta: only messages added since this bundle's last export (watermark per bundle name).");
      console.log("  --full : byte-for-byte snapshot of the whole DB (disaster restore; much larger).");
      console.log("  Key source: --key-file <path> or env ZEMORY_SHARE_KEY. Raw DB is never written to the repo.");
      return;
    }
    const dbPath = flagValue(args, "--db");
    const delta = args.includes("--delta");
    const bundleKey = basename(out);
    const since = delta ? readExportWatermark(bundleKey, dbPath) : undefined;
    // Chìa phải TỰ DÒ, như `sync` vẫn làm — `readShareSecret` chỉ đọc `--key-file`/env, nên
    // trước 2026-08-11 ba lệnh này báo "Chưa có chìa share" trong khi chìa nằm NGAY CẠNH kho
    // (`data/share.key`). Hậu quả không phải bất tiện mà là ĐỨT ĐƯỜNG ĐỒNG BỘ: người bàn giao
    // máy mới gõ đúng lệnh trong tài liệu vẫn thất bại, rồi đi tìm cách vòng. Một đường sync
    // cố định thì mọi cửa vào nó phải dò chìa GIỐNG NHAU.
    const r = await exportMemoryBundle({
      outPath: out,
      dbPath,
      keyFile: resolveShareKey(currentProjectRoot(), flagValue(args, "--key-file")),
      force: args.includes("--force"),
      payload: args.includes("--full") ? "full" : "rows",
      sinceMessageId: since,
    });
    const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
    console.log(`zemory memory export — wrote ${r.outPath}`);
    if (r.rows) {
      const span = r.rows.since > 0 ? `delta since message #${r.rows.since}` : "full row set";
      console.log(`  ${span}: ${r.rows.sessions} session(s) · ${r.rows.messages} message(s) → ${mb(r.bundleBytes)}`);
      // Only advance the watermark once the bundle is safely on disk.
      writeExportWatermark(bundleKey, r.rows.maxMessageId, dbPath);
    } else {
      console.log(`  full DB snapshot ${mb(r.sourceBytes)} → ${mb(r.bundleBytes)} bundle`);
    }
    return;
  }
  if (sub === "import") {
    const bundle = positionalArgs(args.slice(1))[0];
    if (!bundle) {
      console.log("usage: zemory memory import <in.zemory.enc> [--merge] [--key-file <path>] [--db <path>] [--force]");
      console.log("  default: REPLACE the DB (refuses without --force; old DB renamed to .bak-*).");
      console.log("  --merge: ADD sessions/messages into the existing DB (INSERT OR IGNORE; nothing overwritten).");
      return;
    }
    if (args.includes("--merge")) {
      const r = await mergeMemoryBundle({
        bundlePath: bundle,
        dbPath: flagValue(args, "--db"),
        keyFile: resolveShareKey(currentProjectRoot(), flagValue(args, "--key-file")),
      });
      console.log(`zemory memory import --merge — ${r.dbPath}`);
      console.log(
        `  +${r.sessionsAdded} session(s) · +${r.messagesAdded} message(s)  (now ${r.sessionsAfter} sessions · ${r.messagesAfter} messages)`,
      );
      const remaining = vectorRemaining(r.dbPath);
      if (remaining) console.log(`  ${remaining} message(s) need embedding → run \`zemory memory embed --all\` to vectorize the new ones.`);
      return;
    }
    const r = await importMemoryBundle({
      bundlePath: bundle,
      dbPath: flagValue(args, "--db"),
      keyFile: resolveShareKey(currentProjectRoot(), flagValue(args, "--key-file")),
      force: args.includes("--force"),
    });
    console.log(`zemory memory import — restored ${r.dbPath}`);
    console.log(`  decrypted ${r.bytes} byte(s) from ${r.bundlePath}`);
    if (r.backupPath) console.log(`  previous DB backup: ${r.backupPath}`);
    return;
  }
  if (sub === "sync") {
    const driveDir = (flagValue(args, "--dir") ?? getDriveDir()).trim();
    if (!driveDir) {
      console.log("usage: zemory memory sync [--dir <folder>] [--key-file <path>] [--full]");
      console.log("         zemory memory sync --prune-host <host> [--apply]   (dọn series của máy đã bỏ)");
      console.log("  Push this machine's bundle to the synced Drive FOLDER + merge every other machine's bundle there.");
      console.log("  Depth: LEAN by default (source rows; the sync-level setting picks it). --full ships a whole-DB snapshot.");
      console.log("  Link the folder once in `zemory ui`, or pass --dir. Needs the share key (--key-file / ZEMORY_SHARE_KEY / share/share.key).");
      return;
    }

    // Dọn series của HOST ĐÃ CHẾT. Tách khỏi đường sync thường vì nó XOÁ file của máy
    // khác — mặc định DRY-RUN, và chỉ chạy khi tự chứng minh được là không mất gì.
    const pruneHost = flagValue(args, "--prune-host");
    if (pruneHost !== undefined) {
      const apply = args.includes("--apply");
      try {
        const r = pruneDriveHost({ dir: driveDir, host: pruneHost, apply });
        const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
        console.log(`zemory memory sync --prune-host ${r.host} — ${r.files.length} file · ${mb(r.bytes)}${apply ? "" : "  (DRY-RUN)"}`);
        for (const f of r.files) console.log(`  ${f.merged ? "✓ đã merge" : "✗ CHƯA merge"}  ${f.file}  ${mb(f.bytes)}`);
        if (!r.safe) {
          console.log("  ⛔ CHƯA an toàn để xoá:");
          for (const b of r.blockers) console.log(`     · ${b}`);
          process.exitCode = 1;
          return;
        }
        if (!apply) {
          console.log(`  ✅ An toàn: mọi bundle đã nằm trong kho máy này, và series của máy này đã phủ đủ để máy thứ ba lấy tiếp.`);
          console.log(`     Chạy lại kèm --apply để xoá thật.`);
          return;
        }
        console.log(`  🗑 đã xoá ${r.removed.length} file, giải phóng ${mb(r.bytes)}`);
      } catch (error) {
        console.log(`zemory memory sync --prune-host: ${error instanceof Error ? error.message : "failed"}`);
        process.exitCode = 1;
      }
      return;
    }
    const root = currentProjectRoot();
    const keyFile = resolveShareKey(root, flagValue(args, "--key-file"));
    console.log(`zemory memory sync — ${driveDir}`);
    try {
      const r = await syncDrive({ driveDir, keyFile, level: args.includes("--full") ? "full" : undefined });
      const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
      console.log(`  ↻ scanned this machine — +${r.scanned.newMessages} new message(s) captured before export`);
      if (r.push.kind === "none") {
        console.log("  ↑ nothing new to push (delta empty).");
      } else {
        const tag =
          r.push.kind === "delta" ? "delta" : r.push.kind === "compact" ? "compacted baseline" : r.push.kind === "full" ? "full snapshot" : "baseline";
        console.log(`  ↑ pushed ${tag} ${r.push.file} — ${r.push.messages} message(s), ${mb(r.push.bytes)}` + (r.push.removed ? ` (folded ${r.push.removed} old file(s))` : ""));
      }
      const pulled = r.merged.filter((m) => !m.skipped);
      const skipped = r.merged.filter((m) => m.skipped).length;
      if (!pulled.length) console.log(`  · no new remote bundles to merge${skipped ? ` (${skipped} already up to date)` : ""}.`);
      for (const m of pulled) {
        console.log(m.error ? `  ⚠ ${m.file}: ${m.error}` : `  ↓ merged ${m.file}: +${m.sessionsAdded} session(s) · +${m.messagesAdded} message(s)`);
      }
      console.log(`  ⚙ embedded ${r.embedded} new vector(s) (semantic index)`);
      if (r.vectorRemaining) {
        // Sync embeds a capped batch (embedPending default limit) — a remaining
        // backlog is NORMAL, not a model failure. Only flag the model when this
        // pass embedded NOTHING (embedded === 0 → model likely down; FTS still works).
        const why = r.embedded === 0 ? " (model unavailable? — recall vẫn chạy qua FTS)" : "";
        console.log(`  ${r.vectorRemaining} message(s) chưa embed → chạy \`zemory memory embed --all\` để vector hoá nốt${why}`);
      }
    } catch (error) {
      console.log(`  error: ${error instanceof Error ? error.message : "sync failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  if (sub === "backup") {
    const out = positionalArgs(args.slice(1))[0];
    const r = await backupMemory({
      dbPath: flagValue(args, "--db"),
      outPath: out,
      force: args.includes("--force"),
    });
    console.log(`zemory memory backup — wrote ${r.outPath}`);
    console.log(`  copied ${r.bytes} byte(s) from ${r.dbPath}`);
    console.log("  note: this is a raw local SQLite backup. Use `memory export` for encrypted sharing.");
    return;
  }
  // `salvage` — đường sống khi DB đã hỏng (`database disk image is malformed`). Sinh từ sự cố
  // thật 2026-08-03. Nó cho lại NHIỀU hơn `restore` một bản backup cũ, và đi cặp với
  // `memory scan`: cứu xong thì đặt lại `ingest_state.last_line = 0` cho phiên bị thủng rồi
  // quét lại — transcript gốc còn trên đĩa nên tin nằm trên trang hỏng về đủ.
  // KHÔNG đụng file gốc; ghi sang đường mới rồi người dùng tự đổi chỗ khi yên tâm.
  // `verify` — kho có lành không. Rẻ, chạy đều được; trước 2026-08-03 KHÔNG AI HỎI câu này
  // nên hỏng lúc nào không rõ, chỉ lộ ra khi tình cờ chạy bench.
  if (sub === "verify") {
    const db = flagValue(args, "--db") ?? currentMemoryDb();
    const r = verifyMemory(db);
    console.log(`zemory memory verify — ${db}\n  ${r.ok ? (r.fresh ? `· ${r.detail}` : "✓ lành") : `✗ HỎNG: ${r.detail}`}`);
    if (!r.ok) {
      console.log("  → cứu: `zemory memory salvage` rồi `memory reopen` + `memory scan` (nguồn thật là transcript trên đĩa).");
      process.exitCode = 1;
    }
    return;
  }
  // `reopen` — mở lại đường nạp cho phiên bị thủng để `scan` kéo lại từ transcript GỐC.
  if (sub === "reopen") {
    const db = flagValue(args, "--db") ?? currentMemoryDb();
    const all = args.includes("--all");
    const r = reopenIngest(db, { all });
    console.log(`zemory memory reopen — ${db}`);
    console.log(`  ${r.missing ? `thiếu ${r.missing} tin so với bộ đếm` : "không phiên nào thiếu tin"} · mở lại ${r.sessions} file transcript`);
    console.log(r.sessions ? "  → chạy `zemory memory scan` để nạp lại phần thiếu (tin đã có sẽ tự bỏ qua)." : "  → không có gì để nạp lại.");
    if (args.includes("--reconcile")) console.log(`  chỉnh bộ đếm: ${reconcileCounts(db)} phiên`);
    return;
  }
  if (sub === "salvage") {
    const src = flagValue(args, "--db") ?? currentMemoryDb();
    const out = positionalArgs(args.slice(1))[0] ?? join(dirname(src), "salvaged.db");
    if (existsSync(out) && !args.includes("--force")) {
      console.log(`zemory memory salvage: ${out} đã tồn tại — dùng --force để ghi đè, hoặc nêu đường khác.`);
      process.exitCode = 1;
      return;
    }
    console.log(`zemory memory salvage — vét dữ liệu còn đọc được\n  từ: ${src}\n  sang: ${out}`);
    const r = salvageMemory(src, out);
    for (const t of r.tables) {
      if (t.copied || t.lost) console.log(`  ${t.lost ? "⚠" : "✓"} ${t.table.padEnd(18)} ${t.copied}${t.lost ? ` · MẤT ${t.lost}` : ""}`);
    }
    console.log(`  tổng: chép ${r.copied} dòng · mất ${r.lost}`);
    console.log("  dựng lại chỉ mục FTS…");
    for (const f of rebuildFts(out)) if (!f.ok) console.log(`  ✗ ${f.table}`);

    // CỨU LUÔN CHỈ MỤC VECTOR — nửa sau của đường cứu hộ, trước 2026-08-11 KHÔNG AI GỌI.
    //
    // `salvageMemory` cố ý chỉ chép bảng NGUỒN (chú thích của chính nó: "KHÔNG dựng lại
    // FTS/vector ở đây — gọi …"), còn `salvageVectors` được tách riêng vì nó cần extension
    // vec0. Nhưng lệnh này chỉ gọi vế đầu rồi dừng, và câu dặn cuối bảo người dùng đi
    // `memory embed --all` — tức chấp nhận đốt lại TOÀN BỘ công nhúng. Đo 2026-08-11: chỗ đó
    // là **~55 giờ máy** (43 giờ đợt 768 chiều + 12–16 giờ lớp tool). FTS dựng lại rẻ nên
    // dựng; vector thì chép được bao nhiêu hay bấy nhiêu — vẫn hơn dựng lại từ đầu.
    //
    // Fail-open (HP điều 9): kho nguồn chưa từng có vector, hoặc vùng hỏng nuốt luôn
    // `vec_config` ⇒ BỎ QUA và nói ra, tuyệt đối không làm hỏng lượt cứu hộ đang chạy.
    const dims = vectorDimsOf(src);
    if (dims > 0) {
      console.log(`  cứu chỉ mục vector (${dims} chiều)…`);
      try {
        const v = salvageVectors(src, out, dims);
        console.log(`  ${v.lost ? "⚠" : "✓"} vector: chép ${v.copied}${v.lost ? ` · MẤT ${v.lost}` : ""}`);
      } catch (e) {
        console.log(`  ⚠ không cứu được vector (${(e as Error).message}) — kho vẫn cứu xong, chạy \`memory embed --all\` để dựng lại.`);
      }
    } else {
      console.log("  · bỏ qua vector: kho nguồn không có `vec_config` (chưa từng nhúng, hoặc vùng hỏng nuốt mất).");
    }

    console.log("  → bước tiếp: kiểm `PRAGMA integrity_check`, đổi chỗ, rồi `zemory reindex`");
    console.log("    + `memory digest --all` + `memory embed --all` để vá phần vector còn thiếu.");
    return;
  }
  if (sub === "vacuum") {
    console.log("zemory memory vacuum — reclaiming freed pages (this rewrites the whole DB file, may take a while)…");
    const r = vacuumMemory();
    const beforeMB = (r.bytesBefore / 1024 / 1024).toFixed(1);
    const afterMB = (r.bytesAfter / 1024 / 1024).toFixed(1);
    const savedMB = ((r.bytesBefore - r.bytesAfter) / 1024 / 1024).toFixed(1);
    console.log(`zemory memory vacuum — ${beforeMB}MB → ${afterMB}MB (freed ${savedMB}MB)`);
    return;
  }
  if (sub === "restore") {
    const backup = positionalArgs(args.slice(1))[0];
    if (!backup) {
      console.log("usage: zemory memory restore <backup.db> [--db <path>] [--force]");
      console.log("  Refuses to overwrite an existing DB unless --force is present; existing DB is renamed to .bak-*.");
      return;
    }
    const r = await restoreMemoryBackup({
      backupPath: backup,
      dbPath: flagValue(args, "--db"),
      force: args.includes("--force"),
    });
    console.log(`zemory memory restore — restored ${r.dbPath}`);
    console.log(`  copied ${r.bytes} byte(s) from ${r.backupPath}`);
    if (r.previousBackupPath) console.log(`  previous DB backup: ${r.previousBackupPath}`);
    return;
  }
  if (sub === "forget") {
    const hasSelector = ["--session", "--project", "--source", "--agent", "--before", "--message"].some((flag) => args.includes(flag));
    if (!hasSelector) {
      console.log("usage: zemory memory forget [--session <id>] [--project <path>] [--source <agent>] [--before <date>] [--message <#id>] [--force]");
      console.log("  Dry-run by default. Re-run with --force to delete matched memory DB rows.");
      console.log("  Deletion creates a local backup unless --no-backup is present.");
      return;
    }
    const project = flagValue(args, "--project");
    const message = flagValue(args, "--message");
    const r = await forgetMemory({
      dbPath: flagValue(args, "--db"),
      session: flagValue(args, "--session"),
      project: project ? resolve(project) : undefined,
      source: flagValue(args, "--source") ?? flagValue(args, "--agent"),
      before: flagValue(args, "--before"),
      message: message ? Number(message) : undefined,
      force: args.includes("--force"),
      skipBackup: args.includes("--no-backup"),
      backupPath: flagValue(args, "--backup"),
    });
    console.log(
      `zemory memory forget — ${r.dryRun ? "dry-run" : "deleted"} ${r.messages} message(s), ${r.sessions} session(s), ${r.vectors} vector row(s), ${r.digests} session digest(s)`,
    );
    console.log(`  selectors: ${r.selectors.join(" · ")}`);
    if (r.sampleSessions.length) console.log(`  sessions: ${r.sampleSessions.join(", ")}${r.sessions > r.sampleSessions.length ? " ..." : ""}`);
    if (r.backupPath) console.log(`  backup: ${r.backupPath}`);
    if (r.dryRun) console.log("  re-run with --force to delete these rows.");
    console.log("  note: agent transcript source files are not deleted. If a whole-file transcript changes later, it can be re-ingested.");
    return;
  }
  if (sub === "audit") {
    // Chiều VÀO của redact: soi ký tự điều hướng ẩn (memory poisoning). THUẦN ĐỌC —
    // không sửa, không xoá, không chặn; người quyết định là user, không phải zemory.
    const hits = scanHiddenChars(flagValue(args, "--db"));
    if (!hits.length) {
      console.log("zemory memory audit — ✓ không thấy ký tự điều hướng ẩn nào.");
      return;
    }
    console.log(`zemory memory audit — ${hits.length} tin có ký tự điều hướng ẩn:`);
    for (const h of hits.slice(0, 20)) console.log(`  #${h.id}  ${h.chars.join(" · ")}   (phiên ${h.sessionId})`);
    console.log("  Xem toàn văn: `zemory memory show <#id>`. Bỏ tin: `zemory memory forget --message <#id>`.");
    return;
  }
  if (sub === "redact") {
    const r = await reRedactMemory({
      dbPath: flagValue(args, "--db"),
      force: args.includes("--force"),
      skipBackup: args.includes("--no-backup"),
      backupPath: flagValue(args, "--backup"),
    });
    console.log(
      `zemory memory redact — ${r.dryRun ? "dry-run" : "updated"} ` +
        `${r.changed.messages} message(s), ${r.changed.artifactCommands} artifact command(s), ${r.changed.artifactIndex} artifact index row(s), ${r.changed.sessionDigests} session digest(s)`,
    );
    console.log(
      `  scanned: ${r.scanned.messages} message(s), ${r.scanned.artifactCommands} artifact command(s), ${r.scanned.artifactIndex} artifact index row(s), ${r.scanned.sessionDigests} session digest(s)`,
    );
    if (r.backupPath) console.log(`  backup: ${r.backupPath}`);
    if (r.dryRun) console.log("  re-run with --force to apply redactions.");
    return;
  }
  if (sub === "embed") {
    // Incremental semantic backfill: embed messages with no vector yet.
    // Plain `embed` does one batch; `--all` loops until the corpus is caught up.
    // `--rebuild` drops the whole derived index first — the only way to switch
    // embed profile (e.g. adopting the EmbeddingGemma query/document prompts).
    const li = args.indexOf("--limit");
    const limit = li >= 0 ? Number(args[li + 1]) : undefined;
    const rebuild = args.includes("--rebuild");
    const all = args.includes("--all") || rebuild;
    if (rebuild) {
      dropVectorIndex();
      console.log("zemory memory embed --rebuild — vector index dropped; re-embedding the whole corpus…");
    }
    const idx = vectorIndexInfo();
    // Name the model the RUN actually uses, not a hardcoded one. With two profiles in play
    // (Gemma live, BGE parallel — plan 19) a fixed name turns this line into a lie: it printed
    // "EmbeddingGemma" while embedding 1024d BGE vectors, which is exactly how a wrong run
    // gets mistaken for a right one at a glance.
    // Ask the STORE's profile, not the ambient config: at this point nothing has pinned the
    // profile yet (that happens inside embedPending), so embedConfig() would still answer with
    // the default model and print the wrong name for a parallel-store run.
    const profileModel = embedProfileSpec(idx.profile).model ?? embedConfig().model;
    const modelName = profileModel.split("/").pop() ?? profileModel;
    console.log(
      `zemory memory embed — building the vector index (${modelName}, local, profile ${idx.profile} · ${idx.dims}d · ${idx.dtype})…`,
    );
    let total = 0;
    // A long `--all` run shares the DB with other zemory processes (Stop-hook
    // auto-capture, `zemory ui`, another shell). Each vector write auto-commits
    // individually (no long-held transaction), so a SQLITE_BUSY mid-pass costs
    // at most the in-flight message, not the run — but left uncaught it kills
    // an unattended multi-hour job. Retry the pass with backoff instead of dying.
    const isBusy = (e: unknown): boolean => e instanceof Error && /database is locked|SQLITE_BUSY/i.test(e.message);
    const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    for (let pass = 0; pass < 100000; pass++) {
      let lastProgress = 0;
      let r: Awaited<ReturnType<typeof embedPending>> | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          r = await embedPending({
            limit,
            onProgress: (p) => {
              if (p.done === p.total || p.done - lastProgress >= 25) {
                lastProgress = p.done;
                process.stdout.write(`  pass ${pass + 1}: ${p.done}/${p.total} scanned · ${p.embedded} embedded\r`);
                if (p.done === p.total) process.stdout.write("\n");
              }
            },
          });
          break;
        } catch (error) {
          if (!isBusy(error) || attempt >= 8) throw error;
          const backoffMs = Math.min(2000 * 2 ** attempt, 60000);
          process.stdout.write(`\n  ⚠ database busy (another zemory process is writing) — retry ${attempt + 1}/8 in ${Math.round(backoffMs / 1000)}s…\n`);
          await sleep(backoffMs);
        }
      }
      total += r.embedded;
      process.stdout.write(`  +${r.embedded} embedded · remaining ${r.remaining}${r.dims ? ` · ${r.dims}d` : ""}\n`);
      if (!all || r.embedded === 0 || r.remaining === 0) break;
    }
    console.log(`zemory memory embed — done: +${total} this run · ${vectorCount()} vector(s) in index.`);
    if (total === 0) console.log("  (nothing embedded — model unavailable? recall still works via FTS.)");
    return;
  }
  if (sub === "bench") {
    // `--recall`: cổng ĐO TRÊN KHO THẬT (corpus có nhãn, mồi nhiễu gần chủ đề). Khác hẳn
    // bench mặc định bên dưới — bench đó chạy corpus 8 tài liệu rời chủ đề, đủ để gác hybrid
    // nhưng KHÔNG đủ để phán về rerank (pool rerank 40 > cả corpus). Xem evals/recallbench.ts.
    if (args.includes("--recall")) {
      const limRaw = flagValue(args, "--limit");
      const opts = {
        limit: limRaw ? Number(limRaw) : undefined,
        skipRerank: args.includes("--no-rerank"),
      };
      console.log("zemory memory bench --recall — FTS vs hybrid vs hybrid+rerank trên kho THẬT…");
      const rr = await runRecallBench(opts);
      for (const line of formatRecallBench(rr)) console.log(line);
      return;
    }
    const withRerank = args.includes("--rerank");
    console.log(
      `zemory memory bench — RAG gate: FTS-only vs hybrid (FTS+vector)${withRerank ? " vs hybrid+rerank" : ""} on a labeled paraphrase corpus…`,
    );
    const r = await runRagBench({ rerank: withRerank });
    if (r.embedded === 0 && r.hybridHit === 0) {
      console.log("  (embed model unavailable — cannot benchmark hybrid; FTS-only still works.)");
      return;
    }
    for (const p of r.perQuery) {
      const rerCol = r.rerankRan ? ` R${p.rerankFound ? "✓" : "✗"}` : "";
      const rerTop = r.rerankRan ? ` rr#${p.rerankTop ?? "-"}` : "";
      console.log(
        `  H${p.hybridFound ? "✓" : "✗"} F${p.ftsFound ? "✓" : "✗"}${rerCol}  want#${p.expect}  fts#${p.ftsTop ?? "-"} hyb#${p.hybridTop ?? "-"}${rerTop}  "${p.q.slice(0, 42)}"`,
      );
    }
    const pct = (x: number): string => `${(x * 100).toFixed(0)}%`;
    console.log("");
    console.log(`  FTS    recall@3 = ${pct(r.ftsRecall)} (${r.ftsHit}/${r.n}) · ${r.ftsMsAvg.toFixed(0)} ms/q`);
    console.log(`  Hybrid recall@3 = ${pct(r.hybridRecall)} (${r.hybridHit}/${r.n}) · ${r.hybridMsAvg.toFixed(0)} ms/q`);
    if (r.rerankRan) {
      console.log(`  Rerank recall@3 = ${pct(r.rerankRecall)} (${r.rerankHit}/${r.n}) · ${r.rerankMsAvg.toFixed(0)} ms/q`);
      if (r.rerankHit === r.hybridHit && r.rerankMsAvg === 0) {
        console.log("  (rerank model unavailable — fell back to hybrid order.)");
      }
    }
    const verdict = r.hybridRecall > r.ftsRecall ? "HYBRID WINS" : r.hybridRecall === r.ftsRecall ? "TIE" : "FTS WINS";
    console.log(`  → ${verdict}. Gate: chỉ bật hybrid mặc định khi thắng net (giờ vẫn opt-in qua --hybrid).`);
    if (!withRerank) console.log("  tip: add --rerank to measure the cross-encoder lane (downloads the reranker once).");
    return;
  }
  if (sub === "hosts") {
    const tree = memoryHostTree();
    if (!tree.length) {
      console.log("zemory memory hosts — no sessions captured yet. Run `zemory memory scan`.");
      return;
    }
    const n = (v: number) => v.toLocaleString();
    const projName = (p: string) => (p === "(unknown)" ? p : p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p);
    console.log("zemory memory hosts — sessions by PC → source → project");
    for (const h of tree) {
      console.log(`\n● ${h.host}   ${n(h.sessions)} sess · ${n(h.messages)} msg`);
      for (const s of h.sources) {
        console.log(`  ├─ ${s.source.padEnd(14)} ${n(s.sessions)} sess · ${n(s.messages)} msg`);
        for (const p of s.projects) {
          console.log(`  │    · ${projName(p.project).padEnd(22)} ${n(p.sessions)} sess · ${n(p.messages)} msg`);
        }
      }
    }
    return;
  }
  if (sub === "digest") {
    const rest = args.slice(1);
    const sid = rest.find((a) => !a.startsWith("--"));
    if (sid) {
      const d = getDigest(undefined, sid);
      if (!d) {
        console.log(`zemory memory digest: no digest for session "${sid}". Build with \`zemory memory digest --all\`.`);
        return;
      }
      printDigest(d);
      return;
    }
    // No session id → (re)build digests (hash-guarded; unchanged are skipped).
    const r = digestBackfill();
    console.log(`zemory memory digest — built/updated ${r.built} of ${r.scanned} session(s) [extractive]`);
    return;
  }
  if (sub === "stats") {
    // Bốn phép quét TOÀN BẢNG của bảng số — tách thành lệnh riêng để daemon gọi ở TIẾN TRÌNH
    // CON. better-sqlite3 chạy đồng bộ, nên gọi thẳng trong daemon là khoá event loop: đo
    // 2026-08-23 lượt LẠNH **16,7 giây** (ấm 0,06 s), và trong 16,7 s đó MỌI endpoint khác
    // đứng hình ⇒ chip ở rail treo "…" nhìn như đã tắt. Chỉ ĐỌC, không xin write-gate.
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
    let count = 0, remaining = 0, covered = 0, embeddable = 0;
    try {
      count = vectorCount();
      remaining = vectorRemaining();
      const cov = vectorCoverage();
      covered = cov.covered;
      embeddable = cov.embeddable;
    } catch {
      /* lane vector là tuỳ chọn — fail open (HP điều 9) */
    }
    console.log(JSON.stringify({ tokensEst, count, remaining, covered, embeddable }));
    return;
  }
  if (sub === "info") {
    const info = memoryInfo();
    console.log(`zemory memory — ${info.dbPath} (${info.sizeKB} KB)`);
    for (const t of info.tables) {
      console.log(`  ${t.name.padEnd(13)} ${String(t.rows).padStart(7)}${t.detail ? "   · " + t.detail : ""}`);
    }
    const remaining = vectorRemaining();
    console.log(
      `  ${"vec_chunks".padEnd(13)} ${String(vectorCount()).padStart(7)}   · semantic embeddings (RAG)${remaining ? ` · ${remaining} remaining` : ""}`,
    );
    return;
  }
  if (sub === "show") {
    const id = Number(args[1]);
    if (!id) {
      console.log("usage: zemory memory show <#id>");
      return;
    }
    const m = getMessage(id) as
      | { source: string; project_root: string | null; role: string; timestamp: string | null; content: string; title: string | null }
      | undefined;
    if (!m) {
      console.log(`zemory memory: no message #${id}.`);
      return;
    }
    console.log(`#${id} [${m.source}] ${m.project_root ?? "(unknown)"} · ${fmtDate(m.timestamp)} · ${m.role}`);
    if (m.title) console.log(`session: ${m.title}`);
    console.log("---");
    console.log(m.content);
    return;
  }
  if (sub === "where") {
    const s = storageInfo();
    console.log(`zemory memory where — ${s.dbPath}`);
    console.log(
      `  folder: ${s.dir}  (${s.source === "env" ? "GLOBAL_MEMORY_DB env" : s.source === "pointer" ? "saved pointer" : "default ~/.zemory"})`,
    );
    console.log(`  size: ${s.exists ? `${(s.sizeKB / 1024).toFixed(1)} MB` : "(no DB yet)"}  ·  pointer: ${s.pointer}`);
    if (s.onCloud) console.log("  ⚠ this folder looks cloud-synced — a live DB here can corrupt. Prefer a plain local folder.");
    if (s.pinnedByEnv) console.log("  note: GLOBAL_MEMORY_DB pins the location; `memory relocate` is disabled until you unset it.");
    return;
  }
  if (sub === "relocate") {
    const dir = positionalArgs(args.slice(1))[0];
    if (!dir) {
      console.log("usage: zemory memory relocate <folder> [--force]");
      console.log("  Move the memory DB (+ settings) to <folder>, off the system drive. Keeps a .bak of the old DB.");
      console.log("  --force: allow a cloud-synced / already-occupied target (risky).");
      return;
    }
    try {
      const r = relocateMemory(dir, { force: args.includes("--force") });
      if (r.pointerOnly) {
        console.log(`zemory memory relocate — storage folder set → ${r.to} (no DB to move yet; it will be created there).`);
        return;
      }
      console.log(`zemory memory relocate — moved memory → ${r.dbPath}`);
      console.log(`  ${(r.movedBytes / 1048576).toFixed(1)} MB · ${r.messages} message(s) verified`);
      // Nói THẲNG cụm nào đi theo. Bản cũ chỉ in "settings moved" trong khi bỏ lại chìa +
      // két + 8 thư mục khác — câu đúng-một-nửa đó khiến không ai biết mình còn hở.
      if (r.cluster.moved.length) console.log(`  carried along: ${r.cluster.moved.join(" · ")}`);
      if (r.cluster.left.length) console.log(`  left in place (backups / corrupt evidence / stale locks): ${r.cluster.left.join(" · ")}`);
      if (r.cluster.conflict.length) console.log(`  ⚠ already existed at the target, source KEPT: ${r.cluster.conflict.join(" · ")}`);
      if (r.cluster.failed.length) console.log(`  ⚠ could NOT copy: ${r.cluster.failed.join(" · ")} — move these by hand`);
      if (r.backup) console.log(`  old DB kept as backup: ${r.backup}\n  (delete it once you've confirmed everything works — frees the old drive)`);
    } catch (error) {
      console.log(`zemory memory relocate: ${error instanceof Error ? error.message : "failed"}`);
      process.exitCode = 1;
    }
    return;
  }
  console.log(
    [
      "zemory memory <subcommand>",
      "",
      "  scan              ingest agent transcripts from known locations into the",
      "                    global memory (<repo>/data/global_memory.db) — fast, incremental.",
      "  scan --deep       walk the whole machine to find agents ANYWHERE.",
      "  scan-web [--platform chatgpt|claude] [--limit N] [--refresh]",
      "                    capture web-chat (ChatGPT · claude.ai) via a login-once browser",
      "                    window (origin=web). Ingests in batches + resumes; --limit N pulls",
      "                    the N newest for a quick verify. Session expired or signed out →",
      "                    it opens the window and ASKS, then continues in place.",
      "  borrow-cookies --platform <chatgpt|claude> [--from chrome|edge] [--profile Default] [--replace]",
      "                    reuse the session ALREADY signed in in your own browser, so no",
      "                    password is typed anywhere. Copies ONE site's cookies, deletes",
      "                    every other row, never reads a cookie value. --list shows sources.",
      "  search <q> [--all] recall across the memory (scope: current project; --all = everywhere).",
      "  embed [--limit N] [--all] [--rebuild]",
      "                    build the semantic vector index (RAG, local EmbeddingGemma).",
      "                    Default: one 500-message batch with progress; --all catches up the corpus.",
      "                    --rebuild drops + re-embeds everything under the current embed profile",
      "                    (asymmetric Gemma query/document prompts; long messages chunked).",
      "  vacuum            reclaim freed pages (rewrites the whole DB file — run after structural surgery).",
      "  keygen [key-file] sinh chìa share MỚI — máy ĐẦU TIÊN. Không truyền đường dẫn thì ghi",
      "                    vào đường chuẩn (cạnh DB). Chìa KHÔNG được vào git.",
      "  key [show|set|path]",
      "                    show = dấu tay + đường dẫn (KHÔNG in chìa) · set = nhập chìa ĐANG CÓ",
      "                    từ stdin (máy THỨ HAI) · path = đường chuẩn. Chìa là DANH TÍNH:",
      "                    zemory local-only nên không có server nhận diện — người mang chìa vào.",
      "  backup [out.db]    raw local SQLite backup (use export for encrypted sharing).",
      "  restore <backup.db> [--force]",
      "                    restore a raw local SQLite backup; renames the previous DB aside.",
      "  export <out.zemory.enc> [--key-file <path>]",
      "                    encrypt global_memory.db into a shareable bundle.",
      "  import <in.zemory.enc> [--key-file <path>] [--force]",
      "                    decrypt a shared bundle into the local memory DB.",
      "  forget [selectors] [--force]",
      "                    dry-run/delete memory rows by --session, --project, --source, --before, or --message.",
      "  redact [--force]   re-apply secret redaction to already ingested memory rows.",
      "  audit             soi ký tự điều hướng ẩn trong nội dung đã lưu (chỉ đọc, không sửa).",
      "  bench             RAG gate benchmark: FTS-only vs hybrid recall on a labeled corpus.",
      "  show <#id>        print the full message for a search hit.",
      "  info              table row-counts of global_memory.db.",
      "  where             show where the memory DB lives (folder + size + pointer).",
      "  relocate <dir>    move the memory DB off C:\\ into <dir> (verified; keeps a .bak).",
      "  hosts             sessions by PC → source → project (per-machine provenance).",
      "  scope [ls|exclude|include|clear]",
      "                    provenance tree (Local/Web × machine × agent); exclude a lane",
      "                    from sync + recall (a filter, never a delete). Flags: --origin",
      "                    local|web  --host <machine>  --source <agent>.",
      "  digest [--all]     (re)build per-session summary digests (cheap-token recall lens).",
      "  digest <session>   show one session's digest (drill to messages via #id).",
      "  search <q> --digest  recall the DIGEST lane (session-level hits) instead of messages.",
      "",
      "  Local-only: transcripts are read and stored locally, never transmitted.",
    ].join("\n"),
  );
}


