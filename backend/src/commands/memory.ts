// `zemory memory <scan|scan-web|search|embed|scope|hosts|digest|sync|export|
//  import|forget|redact|backup|restore|relocate|vacuum|bench>` — the global
// Memory: ingest, hybrid recall, vectors, provenance scope, sync, privacy.
import { basename, resolve } from "node:path";
import { findProjectRoot } from "../core/config.js";
import { uiPort } from "../ui.js";
import { type ScanReport, memoryHostTree, memoryInfo, scan } from "../memory/ingest.js";
import { type Digest, digestBackfill, getDigest, searchDigests } from "../memory/digest.js";
import { dropVectorIndex, embedPending, vectorCount, vectorIndexInfo, vectorRemaining } from "../memory/vectors.js";
import { runRagBench } from "../evals/ragbench.js";
import { scanWeb } from "../memory/scanweb.js";
import { relocateMemory, storageInfo } from "../memory/relocate.js";
import { type SearchHit, getMessage, hybridEnabled, rerankEnabled, search, searchHybrid } from "../memory/search.js";
import {
  exportMemoryBundle,
  importMemoryBundle,
  mergeMemoryBundle,
  readExportWatermark,
  resolveShareKey,
  syncDrive,
  writeMemoryShareKey,
  writeExportWatermark,
} from "../memory/share.js";
import { type ScopeNode, scopeTree, toggleLane } from "../memory/scope.js";
import { getDriveDir, getScopeExclude, setScopeExclude, type ScopeLane } from "../config/settings.js";
import { backupMemory, forgetMemory, reRedactMemory, restoreMemoryBackup, vacuumMemory } from "../memory/privacy.js";
import { flagValue, positionalArgs } from "./_shared.js";

function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
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
    await cmdMemoryInner(args);
    return;
  }
  let gated = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let port: number | null = null;
  if (HEAVY_WRITES.has(sub)) {
    port = await daemonPort();
    if (port) {
      const acquire = async (): Promise<{ busy?: boolean }> => {
        const r = await fetch(`http://127.0.0.1:${port}/gate-acquire`, { method: "POST", signal: AbortSignal.timeout(400) });
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
        heartbeat = setInterval(() => void acquire().catch(() => {}), 120_000);
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
    const r = await scanWeb({ platform, refresh, limit, delayMs }, (m) => console.log("  " + m));
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
      console.log(`  → A dedicated browser window is open at ${r.url}. Log in to YOUR account there (one time — password stays in the browser, never touches zemory), then re-run \`zemory memory scan-web\`.`);
      return;
    }
    console.log(`  ✓ signed in as ${r.email ?? "?"} · ${r.total} conversation(s) on the account`);
    console.log(`  ↓ pulled ${r.pulled} new · skipped ${r.skipped} (already ingested) · failed ${r.failed}`);
    if (r.scan) {
      const web = r.scan.agents.find((a) => a.source.endsWith("-web"));
      if (web) console.log(`  ⤷ memory now holds ${web.source}: ${web.sessions} session(s), ${web.messages} message(s)`);
      console.log("  → vectorize the new ones: `zemory memory embed --all`");
    }
    if (r.interrupted) console.log("  ⚠ connection dropped mid-run — pulled batches are saved. Re-run `zemory memory scan-web` to resume the rest.");
    if (r.failed) console.log("  note: some failed (rate-limit?) — just re-run to resume; it skips what's already in.");
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
    // Drop --flags AND the value token that follows --origin so it never leaks into the query.
    const query = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--origin").join(" ");
    if (!query) {
      console.log(
        "usage: zemory memory search <query> [--all] [--origin local|web] [--digest] [--hybrid|--fts] [--rerank|--no-rerank] [--no-recency]   (default mode: ZEMORY_HYBRID / ZEMORY_RERANK; recency blend on)",
      );
      return;
    }
    const recencyOpt = rest.includes("--no-recency") ? false : undefined;
    if (rest.includes("--digest")) {
      // Recall "digest lane": session-level hits (read the thin digest first,
      // drill into messages via `memory digest <session>` / `memory show <#id>`).
      const proj = all ? undefined : (findProjectRoot() ?? process.cwd());
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
    const project = findProjectRoot() ?? process.cwd();
    const useHybrid = forceHybrid || (!forceFts && hybridEnabled());
    const rerankOpt = forceRerank ? true : forceNoRerank ? false : undefined;
    // Rerank rides the hybrid pipeline; on the plain FTS path it has no effect.
    const useRerank = useHybrid && rerankEnabled(rerankOpt);
    const hits = useHybrid
      ? await searchHybrid(query, { project, all, origin: originOpt, rerank: rerankOpt, recency: recencyOpt })
      : search(query, { project, all, origin: originOpt, recency: recencyOpt });
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
    const out = positionalArgs(args.slice(1))[0];
    if (!out) {
      console.log("usage: zemory memory keygen <key-file> [--force]");
      console.log("  Keep this file OUT of git. Share it out-of-band with trusted machines only.");
      return;
    }
    writeMemoryShareKey(out, { force: args.includes("--force") });
    console.log(`zemory memory keygen — wrote ${out}`);
    console.log("  Keep this key file out of git; encrypted bundles are useless without it.");
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
    const r = await exportMemoryBundle({
      outPath: out,
      dbPath,
      keyFile: flagValue(args, "--key-file"),
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
        keyFile: flagValue(args, "--key-file"),
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
      keyFile: flagValue(args, "--key-file"),
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
      console.log("  Push this machine's bundle to the synced Drive FOLDER + merge every other machine's bundle there.");
      console.log("  Depth: LEAN by default (source rows; the sync-level setting picks it). --full ships a whole-DB snapshot.");
      console.log("  Link the folder once in `zemory ui`, or pass --dir. Needs the share key (--key-file / ZEMORY_SHARE_KEY / share/share.key).");
      return;
    }
    const root = findProjectRoot() ?? process.cwd();
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
    console.log(`zemory memory embed — building the vector index (EmbeddingGemma, local, profile ${idx.profile} · ${idx.dims}d)…`);
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
      console.log(
        `  ${(r.movedBytes / 1048576).toFixed(1)} MB · ${r.messages} message(s) verified · settings ${r.configMoved ? "moved" : "not found"}`,
      );
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
      "                    global memory (~/.zemory/global_memory.db) — fast, incremental.",
      "  scan --deep       walk the whole machine to find agents ANYWHERE.",
      "  scan-web [--platform chatgpt] [--limit N] [--refresh]",
      "                    capture web-chat (ChatGPT) via a login-once browser window",
      "                    (origin=web). Ingests in batches + resumes; --limit N pulls",
      "                    the N newest for a quick verify.",
      "  search <q> [--all] recall across the memory (scope: current project; --all = everywhere).",
      "  embed [--limit N] [--all] [--rebuild]",
      "                    build the semantic vector index (RAG, local EmbeddingGemma).",
      "                    Default: one 500-message batch with progress; --all catches up the corpus.",
      "                    --rebuild drops + re-embeds everything under the current embed profile",
      "                    (asymmetric Gemma query/document prompts; long messages chunked).",
      "  vacuum            reclaim freed pages (rewrites the whole DB file — run after structural surgery).",
      "  keygen <key-file> create a local share key (keep OUT of git).",
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


