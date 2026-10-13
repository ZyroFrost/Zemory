// p2p FAST LANE (plan/24 §12 — user 2026-10-12: "nó phải sync liền như zalo là dc"). Before it, a block was sealed only by
// the 30′ auto-sync and a received block reached the store only through a whole sync round that gave up on a busy store:
// a message took up to ~60′ to show on the other machine (measured 11/10). Each case is one link of the new chain.
import assert from "node:assert/strict";
import test from "node:test";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// The job slot writes `daemon-job.lock` next to the store: point the store at a temp dir BEFORE any module loads.
const STORE = mkdtempSync(join(tmpdir(), "zemory-fastlane-store-"));
process.env.GLOBAL_MEMORY_DB = join(STORE, "global_memory.db");

const { openMemory } = await import("../../dist/memory/db.js");
const { pushChannelFast, writeMemoryShareKey } = await import("../../dist/memory/share.js");
const { inventoryIds } = await import("../../dist/memory/channel/blocks.js");
const { FastLane, fastSendDecide, freshSendState, ownPendingMax, FAST_QUIET_MS, FAST_MAX_WAIT_MS } = await import("../../dist/jobs/fastlane.js");
const { tempDir } = await import("./helpers.mjs");
const { deferIngest, drainIngestQueue, hasQueuedIngest, queuedIngests, ingestQueueDir } = await import("../../dist/jobs/ingestqueue.js");
const { claimDaemonJob, releaseDaemonJob } = await import("../../dist/jobs/writegate.js");
const { handleHook } = await import("../../dist/memory/capture-hook.js");

const ME = hostname();

function seed(dbPath, host, sid, uuids) {
  const db = openMemory(dbPath);
  try {
    db.prepare("INSERT OR IGNORE INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?, 'claude-code', 'local', 'C:\\p', ?, 0)").run(sid, host);
    const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, 'user', ?, ?)");
    for (const u of uuids) ins.run(sid, u, `text ${u}`, new Date().toISOString());
  } finally {
    db.close();
  }
}

test("decide: nothing pending never fires; a quiet spell or a long streak does", () => {
  let s = freshSendState();
  assert.equal(fastSendDecide(s, 0, 1_000).fire, false, "nothing pending");
  let r = fastSendDecide(s, 10, 1_000);
  assert.equal(r.fire, false, "first sight of a message waits for the quiet spell (several messages ⇒ one block)");
  s = r.state;
  r = fastSendDecide(s, 10, 1_000 + FAST_QUIET_MS - 1);
  assert.equal(r.fire, false, "still inside the quiet spell");
  r = fastSendDecide(r.state, 10, 1_000 + FAST_QUIET_MS);
  assert.equal(r.fire, true, "quiet for FAST_QUIET_MS ⇒ seal now");
  // a streak that never goes quiet still ships by FAST_MAX_WAIT_MS
  s = freshSendState();
  let id = 1;
  let fired = false;
  for (let t = 0; t <= FAST_MAX_WAIT_MS; t += 1_000) {
    r = fastSendDecide(s, id++, t);
    s = r.state;
    if (r.fire) {
      fired = true;
      assert.ok(t >= FAST_MAX_WAIT_MS, `a growing streak fires at the cap, not before (fired at ${t})`);
      break;
    }
  }
  assert.ok(fired, "a streak of messages must not wait forever");
});

test("poll: counts only THIS machine's messages above the p2p watermark — the other machine's never trigger a block", (t) => {
  const root = tempDir(t, "zemory-fl-poll-");
  const db = join(root, "m.db");
  seed(db, "OTHER-PC", "so", ["o1", "o2"]);
  assert.equal(ownPendingMax(db, ME), 0, "only the other machine's messages ⇒ nothing to seal");
  seed(db, ME, "sm", ["m1"]);
  const mine = ownPendingMax(db, ME);
  assert.ok(mine > 0, "a message of this machine above the watermark");
  const conn = openMemory(db);
  try {
    const wmHost = ME.replace(/[^A-Za-z0-9._-]/g, "_");
    conn.prepare("INSERT OR REPLACE INTO sync_state (bundle, last_message_id, updated_at) VALUES (?, ?, ?)").run(`p2p:${wmHost}`, mine, new Date().toISOString());
  } finally {
    conn.close();
  }
  assert.equal(ownPendingMax(db, ME), 0, "at the watermark ⇒ nothing pending");
  seed(db, "OTHER-PC", "so", ["o3"]);
  assert.equal(ownPendingMax(db, ME), 0, "a merged message above the watermark is still not a reason to seal");
  assert.equal(ownPendingMax(join(root, "missing.db"), ME), 0, "no store ⇒ 0, never a throw (fail-open)");
});

test("push: new messages of this machine ⇒ exactly ONE block; nothing new or only the other machine's ⇒ none", async (t) => {
  const root = tempDir(t, "zemory-fl-push-");
  const db = join(root, "m.db");
  const key = join(root, "share.key");
  writeMemoryShareKey(key);
  const chan = join(root, "channel");
  mkdirSync(chan, { recursive: true });
  seed(db, ME, "s1", ["a1", "a2"]);
  const first = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.notEqual(first.push.kind, "none", "an empty channel gets its first block");
  assert.equal(inventoryIds(chan).length, 1);
  const again = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.equal(again.push.kind, "none", "nothing new ⇒ no block");
  assert.equal(inventoryIds(chan).length, 1);
  seed(db, ME, "s1", ["a3"]);
  const delta = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.equal(delta.push.kind, "delta");
  assert.equal(delta.push.messages, 1, "only the one new message travels");
  assert.equal(inventoryIds(chan).length, 2, "one new block");
  seed(db, "OTHER-PC", "so", ["o1"]);
  const other = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.equal(other.push.kind, "none", "a message merged from the other machine is never re-shipped");
  assert.equal(inventoryIds(chan).length, 2);
  // The fast lane moves the P2P watermark ONLY. Moving `drive:<host>` would make the Drive channel skip these messages
  // for good — each channel keeps its own delta mark (`wmKeyFor`, user 2026-09-16).
  const conn = openMemory(db);
  try {
    const keys = conn.prepare("SELECT bundle FROM sync_state").all().map((r) => r.bundle);
    assert.ok(keys.some((k) => k.startsWith("p2p:")), "the p2p watermark moved");
    assert.ok(!keys.some((k) => k.startsWith("drive:")), "the Drive watermark is untouched");
  } finally {
    conn.close();
  }
});

test("push: messages go NOW even while the embed frontier blocks them; the vector job keeps the old rule (user 12/10)", async (t) => {
  const root = tempDir(t, "zemory-fl-later-");
  const db = join(root, "m.db");
  const key = join(root, "share.key");
  writeMemoryShareKey(key);
  const chan = join(root, "channel");
  mkdirSync(chan, { recursive: true });
  seed(db, ME, "s1", ["old"]);
  const first = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.notEqual(first.push.kind, "none", "baseline block");
  // A vector index with one vector ⇒ the embed frontier is live; the next message has NO vector.
  const sqliteVec = await import("sqlite-vec");
  const conn = openMemory(db);
  try {
    sqliteVec.load(conn);
    conn.exec("CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[4])");
    const oldId = conn.prepare("SELECT id FROM messages WHERE uuid = 'old'").get().id;
    conn.prepare("INSERT INTO vec_chunks(rowid, embedding) VALUES (?, ?)").run(BigInt(oldId), Buffer.from(new Float32Array([1, 0, 0, 0]).buffer));
  } finally {
    conn.close();
  }
  seed(db, ME, "s1", ["fresh"]);
  const { pushChannelVectors } = await import("../../dist/memory/share.js");
  const held = await pushChannelVectors({ dir: chan, keyFile: key, dbPath: db, embed: false });
  assert.equal(held.push.messages ?? 0, 0, "the vector job keeps the frontier rule: a message without its vector waits");
  const now = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.equal(now.push.kind, "delta");
  assert.equal(now.push.messages, 1, "the fast push ships it at once — its vector follows in a later block");
  // The frontier (the fresh message, still without a vector) now sits BELOW the watermark. A delta cut at it must never
  // report a high-water mark under `since` — measured 12/10: that wrote the p2p watermark BACK and the next push re-shipped
  // the same 129 messages.
  const { exportMemoryBundle } = await import("../../dist/memory/share.js");
  const c2 = openMemory(db);
  const freshId = c2.prepare("SELECT id FROM messages WHERE uuid = 'fresh'").get().id;
  c2.close();
  const r = await exportMemoryBundle({ outPath: join(root, "probe.enc"), dbPath: db, keyFile: key, force: true, sinceMessageId: freshId });
  assert.ok(r.rows.maxMessageId >= freshId, `high-water mark ${r.rows.maxMessageId} fell below since ${freshId}`);
  const again = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db });
  assert.equal(again.push.kind, "none", "nothing is shipped twice");
});

// A fake child: prints the result line the real `fastrun.js` would, per mode (env FAKE_PUSH_KIND chooses the push result).
function fakeRunner(root) {
  const f = join(root, "fake-fastrun.mjs");
  writeFileSync(
    f,
    `const mode = process.argv[2];
     if (mode === "push") console.log(JSON.stringify({ ok: true, mode, kind: process.env.FAKE_PUSH_KIND || "delta", messages: 2 }));
     else if (mode === "vectors") {
       const out = () => console.log(JSON.stringify({ ok: true, mode, kind: process.env.FAKE_VEC_KIND || "delta", messages: 0, embedded: 2, embedMs: 5 }));
       const ms = Number(process.env.FAKE_VEC_MS || 0);
       if (ms) setTimeout(out, ms); else out();
     }
     else console.log(JSON.stringify({ ok: true, mode, blocks: 1, messagesAdded: 3 }));`,
  );
  return f;
}

function setP2pWatermark(db, id) {
  const conn = openMemory(db);
  try {
    conn.prepare("INSERT OR REPLACE INTO sync_state (bundle, last_message_id, updated_at) VALUES (?, ?, ?)").run(`p2p:${ME.replace(/[^A-Za-z0-9._-]/g, "_")}`, id, new Date().toISOString());
  } finally {
    conn.close();
  }
}

const waitFor = (ok, ms) =>
  new Promise((res) => {
    const t0 = Date.now();
    (function s() {
      if (ok() || Date.now() - t0 > ms) return res();
      setTimeout(s, 20);
    })();
  });

test("lane: a received block is merged at once; a busy sync round keeps it QUEUED, never dropped to the 30′ round", async (t) => {
  const root = tempDir(t, "zemory-fl-lane-");
  process.env.ZEMORY_FASTLANE_RUNNER = fakeRunner(root);
  t.after(() => delete process.env.ZEMORY_FASTLANE_RUNNER);
  let syncing = true;
  let merged = 0;
  const lane = new FastLane({
    dbPath: () => join(root, "none.db"),
    host: () => ME,
    enabled: () => true,
    syncRunning: () => syncing,
    kickLinks: () => {},
    log: () => {},
    onMerged: () => merged++,
  });
  lane.requestMerge();
  assert.equal(lane.tick(), null, "a sync round is running ⇒ wait (it merges the channel itself)");
  assert.equal(lane.status().mergeQueued, true, "…and the request is still queued, not lost");
  syncing = false;
  assert.equal(lane.tick(), "merge", "slot free ⇒ the merge starts on the very next tick");
  await waitFor(() => merged > 0, 10_000);
  assert.equal(merged, 1);
  assert.equal(lane.status().lastMerge?.messagesAdded, 3);
  assert.equal(lane.status().mergeQueued, false);
});

test("lanes: the EMBED lane runs BESIDE the write lane — a merge lands while vectors are still being computed (§12.7)", async (t) => {
  const root = tempDir(t, "zemory-fl-vec-");
  process.env.ZEMORY_FASTLANE_RUNNER = fakeRunner(root);
  process.env.FAKE_VEC_MS = "1500"; // a vector round that takes a while
  t.after(() => {
    delete process.env.ZEMORY_FASTLANE_RUNNER;
    delete process.env.FAKE_VEC_MS;
  });
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const db = join(root, "m.db");
  seed(db, ME, "s1", ["v1"]);
  let kicks = 0;
  const lines = [];
  const lane = new FastLane({ dbPath: () => db, host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => kicks++, log: (m) => lines.push(m) });
  const t0 = Date.now();
  lane.tick(t0);
  assert.equal(lane.tick(t0 + FAST_QUIET_MS), "push");
  await waitFor(() => lane.status().lastPush, 10_000);
  assert.equal(lane.status().vectorsQueued, true, "messages went without vectors ⇒ the vector block is owed");
  const conn = openMemory(db);
  const max = conn.prepare("SELECT MAX(id) m FROM messages").get().m;
  conn.close();
  setP2pWatermark(db, max);
  assert.equal(lane.tick(Date.now()), "vectors", "the embed lane starts");
  assert.equal(lane.status().embedding, true);
  lane.requestMerge();
  assert.equal(lane.tick(Date.now()), "merge", "a received block does NOT wait for the embedder — it merges in parallel");
  await waitFor(() => lane.status().lastMerge, 10_000);
  assert.ok(lane.status().lastMerge, "merged");
  assert.equal(lane.status().embedding, true, "…while the vector round is still running");
  await waitFor(() => !lane.status().embedding, 10_000);
  assert.equal(kicks, 2, "the message block and the vector block are both offered at once");
  assert.ok(lines.some((l) => l.includes("vectors followed")), lines.join("\n"));
  assert.equal(lane.tick(Date.now()), null, "owed once, run once");
});

test("lanes: the embed lane never overlaps a job that writes WITHOUT the turn — and never starves it", async (t) => {
  const { claimDaemonJob, releaseDaemonJob, startEmbedLane, endEmbedLane } = await import("../../dist/jobs/writegate.js");
  const root = tempDir(t, "zemory-fl-gate-");
  process.env.ZEMORY_FASTLANE_RUNNER = fakeRunner(root);
  t.after(() => {
    delete process.env.ZEMORY_FASTLANE_RUNNER;
    releaseDaemonJob();
    endEmbedLane();
  });
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const lane = new FastLane({ dbPath: () => join(root, "none.db"), host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  // ① the maintenance chain holds the slot ⇒ the embed lane stays off
  assert.equal(claimDaemonJob("maintain"), true);
  lane.vectorsQueued = true;
  assert.equal(lane.tick(), null, "a job writing without the turn holds the slot ⇒ no embed lane");
  assert.equal(lane.status().embedding, false);
  releaseDaemonJob();
  // ② the lane runs ⇒ a non-fast-lane claim is refused…
  assert.equal(startEmbedLane("probe"), true);
  assert.equal(claimDaemonJob("sync"), false, "the 30′ round cannot start under a running embed lane");
  assert.equal(claimDaemonJob("fastlane-merge"), true, "…the fast lane's own writers can (they take the turn)");
  releaseDaemonJob();
  endEmbedLane();
  // ③ …and the refused job gets the next turn: the lane yields its next start to it
  assert.equal(startEmbedLane("probe"), false, "a refused job waits ⇒ the lane does not start again first");
  assert.equal(claimDaemonJob("sync"), true, "the refused job claims");
  releaseDaemonJob();
  assert.equal(startEmbedLane("probe"), true, "once it ran, the lane may start again");
  endEmbedLane();
});

test("lanes: the embed lane probes the frontier on its own — and never respawns on a message it cannot embed", async (t) => {
  const root = tempDir(t, "zemory-fl-probe-");
  const f = join(root, "fake-stuck.mjs");
  writeFileSync(f, `console.log(JSON.stringify({ ok: true, mode: process.argv[2], kind: "none", messages: 0, embedded: 0, embedMs: 1, more: false, stuckAt: 4242 }));`);
  process.env.ZEMORY_FASTLANE_RUNNER = f;
  t.after(() => delete process.env.ZEMORY_FASTLANE_RUNNER);
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const { FAST_FRONTIER_PROBE_MS } = await import("../../dist/jobs/fastlane.js");
  let frontier = 4242;
  const lane = new FastLane({ dbPath: () => join(root, "none.db"), host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => {}, log: () => {}, frontier: () => frontier });
  const t0 = Date.now();
  assert.equal(lane.tick(t0), "vectors", "nothing queued it, but the frontier is behind ⇒ embed");
  await waitFor(() => !lane.status().embedding, 10_000);
  assert.equal(lane.tick(t0 + FAST_FRONTIER_PROBE_MS), null, "the same frontier could not be moved ⇒ no respawn on it");
  frontier = 4300;
  assert.equal(lane.tick(t0 + 2 * FAST_FRONTIER_PROBE_MS), "vectors", "a NEW frontier ⇒ embed again");
  await waitFor(() => !lane.status().embedding, 10_000);
});

test("write turn: FIFO across writers; a dead writer's ticket never jams; the hook's wait gives up, never hangs", async (t) => {
  const { acquireWriteTurn, tryWriteTurnSync } = await import("../../dist/jobs/writeturn.js");
  const dir = tempDir(t, "zemory-turn-");
  const order = [];
  const first = await acquireWriteTurn({ dir });
  const second = acquireWriteTurn({ dir }).then((rel) => {
    order.push("second");
    return rel;
  });
  const third = acquireWriteTurn({ dir }).then((rel) => {
    order.push("third");
    return rel;
  });
  await new Promise((r) => setTimeout(r, 120));
  assert.deepEqual(order, [], "nobody writes while the first holds the turn");
  assert.equal(tryWriteTurnSync(80, { dir }), null, "the hook gives up after its wait — it defers, never hangs the answer");
  first();
  (await second)();
  (await third)();
  assert.deepEqual(order, ["second", "third"], "first come, first served");
  // a ticket of a process that no longer exists is skipped and removed
  writeFileSync(join(dir, `${String(Date.now() - 1000).padStart(15, "0")}-999999999-000000.t`), "");
  const rel = tryWriteTurnSync(500, { dir });
  assert.ok(rel, "a dead writer's ticket does not block the queue");
  rel();
});

test("write turn: the time spent QUEUED is counted, and every fast-lane result line reports it", async (t) => {
  const { acquireWriteTurn, turnWaitTotalMs } = await import("../../dist/jobs/writeturn.js");
  const dir = tempDir(t, "zemory-turnwait-");
  const before = turnWaitTotalMs();
  const holder = await acquireWriteTurn({ dir });
  const waiter = acquireWriteTurn({ dir });
  await new Promise((r) => setTimeout(r, 300));
  holder();
  (await waiter)();
  assert.ok(turnWaitTotalMs() - before >= 250, "the second writer's wait behind the first is counted");
  const { readFileSync } = await import("node:fs");
  const FR = readFileSync(new URL("../src/jobs/fastrun.ts", import.meta.url), "utf8");
  assert.equal((FR.match(/turnWaitMs: turnWaitTotalMs\(\)/g) ?? []).length, 4, "ingest · push · vectors · merge all report it");
  const FL = readFileSync(new URL("../src/jobs/fastlane.ts", import.meta.url), "utf8");
  assert.equal((FL.match(/\$\{this\.waited\(res\)\}/g) ?? []).length, 4, "…and the lane names it on every slow line (13/10: the log could not tell why)");
});

test("wiring: every fast-lane writer takes the turn; the hook takes it; the 30′ round skips its embed under the lane", async () => {
  const { readFileSync } = await import("node:fs");
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
  const FR = src("jobs/fastrun.ts");
  assert.match(FR, /withWriteTurn\(\(\) => drainIngestQueue\(\)\)/, "ingest in a turn");
  assert.match(FR, /withWriteTurn\(\(\) => mergeChannelDir\(/, "merge in a turn");
  assert.match(FR, /pushChannelFast\(\{[^}]*writeTurn \}\)/, "push in a turn");
  assert.match(FR, /pushChannelVectors\(\{[^}]*writeTurn \}\)/, "the embed lane writes in turns");
  const VEC = src("memory/vectors.ts");
  assert.match(VEC, /const vectors = await embedDocBatch\([\s\S]{0,80}\);\s*await takeTurn\(\);/, "the model runs OUTSIDE the turn, the batch write inside");
  const SH = src("memory/share.ts");
  assert.match(SH, /const releaseTurn = o\.writeTurn \? await o\.writeTurn\(\) : null;\s*try \{\s*const release = await acquireChannelWriteLock/, "turn outside, channel lock inside — one fixed order");
  const HOOK = src("memory/capture-hook.ts");
  assert.match(HOOK, /const release = tryWriteTurnSync\(HOOK_TURN_WAIT_MS\);\s*if \(!release\) \{\s*deferIngest\(path\);/, "the hook takes the turn, or defers");
  assert.match(src("jobs/syncjob.ts"), /if \(embedLaneOn\(\)\) env\.ZEMORY_EMBED_LANE = "1";/, "the daemon tells the round the lane is on");
  assert.match(src("jobs/syncrun.ts"), /process\.env\.ZEMORY_EMBED_LANE === "1" \? false : undefined/, "…and the round then skips its embed step");
  assert.match(src("ui.ts"), /setEmbedLaneProbe\(laneOn\);/, "wired in the daemon");
});

test("lane: a sealed block kicks the live links; a push that sealed nothing does not", async (t) => {
  const root = tempDir(t, "zemory-fl-kick-");
  process.env.ZEMORY_FASTLANE_RUNNER = fakeRunner(root);
  process.env.FAKE_VEC_KIND = "none"; // count the message blocks only — the embed lane runs beside them
  t.after(() => {
    delete process.env.ZEMORY_FASTLANE_RUNNER;
    delete process.env.FAKE_PUSH_KIND;
    delete process.env.FAKE_VEC_KIND;
  });
  const db = join(root, "m.db");
  seed(db, ME, "s1", ["x1"]);
  let kicks = 0;
  const lane = new FastLane({ dbPath: () => db, host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => kicks++, log: () => {} });
  const t0 = Date.now();
  assert.equal(lane.tick(t0), null, "first sight waits for the quiet spell");
  assert.equal(lane.tick(t0 + FAST_QUIET_MS), "push", "quiet ⇒ seal");
  await waitFor(() => lane.status().lastPush, 10_000);
  assert.equal(kicks, 1, "a block was sealed ⇒ offer it on every live link now");
  process.env.FAKE_PUSH_KIND = "none";
  const t1 = Date.now();
  lane.tick(t1);
  assert.equal(lane.tick(t1 + FAST_QUIET_MS), "push");
  await waitFor(() => lane.status().lastPush?.kind === "none", 10_000);
  assert.equal(kicks, 1, "nothing sealed ⇒ no kick");
});

test("lane: a push that moved NO message rests FAST_REST_MS — no back-to-back empty rounds (measured 12/10: 19.8 s each)", async (t) => {
  const root = tempDir(t, "zemory-fl-rest-");
  const f = join(root, "fake-zero.mjs");
  writeFileSync(f, `console.log(JSON.stringify({ ok: true, mode: process.argv[2], kind: "delta", messages: 0 }));`);
  process.env.ZEMORY_FASTLANE_RUNNER = f;
  t.after(() => delete process.env.ZEMORY_FASTLANE_RUNNER);
  const db = join(root, "m.db");
  seed(db, ME, "s1", ["x1"]);
  const { FAST_REST_MS } = await import("../../dist/jobs/fastlane.js");
  const lane = new FastLane({ dbPath: () => db, host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  const t0 = Date.now();
  lane.tick(t0);
  assert.equal(lane.tick(t0 + FAST_QUIET_MS), "push");
  await waitFor(() => lane.status().lastPush, 10_000);
  const t1 = Date.now();
  assert.equal(lane.tick(t1), null, "right after an empty push: rest");
  assert.equal(lane.tick(t1 + FAST_QUIET_MS), null, "still resting even though the message still waits");
  lane.tick(t1 + FAST_REST_MS + 1);
  assert.equal(lane.tick(t1 + FAST_REST_MS + 1 + FAST_QUIET_MS), "push", "after the rest it tries again");
  await waitFor(() => !lane.status().running, 10_000);
});

test("embed: from the frontier the LONG message that blocks the export goes first, not shorter ones elsewhere (12/10)", async (t) => {
  const { pendingOrderSql } = await import("../../dist/memory/vectors.js");
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(":memory:");
  t.after(() => db.close());
  db.exec("CREATE TABLE messages (id INTEGER PRIMARY KEY, content TEXT)");
  const ins = db.prepare("INSERT INTO messages (id, content) VALUES (?, ?)");
  for (const id of [1, 2, 3]) ins.run(id, "short");
  ins.run(10, "x".repeat(2130)); // the frontier: a long tool result
  ins.run(11, "short");
  const pick = (fromId) => {
    const o = pendingOrderSql(fromId);
    return db.prepare(`SELECT id FROM messages WHERE 1=1${o.where} ORDER BY ${o.orderBy} LIMIT 2`).all().map((r) => r.id);
  };
  assert.deepEqual(pick(10), [10, 11], "fast lane: the frontier first, then in id order");
  assert.deepEqual(pick(undefined), [1, 2], "backfill: shortest first, as before");
  const { readFileSync } = await import("node:fs");
  const SH = readFileSync(new URL("../src/memory/share.ts", import.meta.url), "utf8");
  assert.match(SH, /embedPending\(\{\s*dbPath: o\.dbPath,\s*limit: o\.embedLimit \?\? 256,\s*fromId: frontier,\s*countRemaining: false,/, "the vector job embeds FROM the frontier and skips the store-wide count");
});

test("wiring: EVERY receiving path queues a merge through the lane; none merges on the daemon's event loop", async () => {
  const { readFileSync } = await import("node:fs");
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  // the outbound link used to only COUNT received blocks (they waited for the 30′ round — plan/24 §12.1)
  assert.match(UI, /if \(r\.receivedBlocks > 0\) onBlocksReceived\(r\.receivedBlocks, "outbound link"\);/, "outbound links land what they receive");
  assert.match(UI, /onBlocksReceived\(blocks, "inbound link"\);/, "inbound links land what they receive");
  assert.match(UI, /onReceived: \(blocks: number\): void => onBlocksReceived\(blocks, "waiting session"\)/, "the waiting session too");
  assert.doesNotMatch(UI, /void mergeChannelDir\(/, "no in-process merge on the daemon's event loop (froze TLS + heartbeats, 24/09)");
  assert.match(UI, /fastLane\.requestMerge\(\);/, "received blocks go through the lane's queue");
  assert.match(UI, /setInterval\(\(\) => fastLane\?\.tick\(\), 2_000\)/, "the lane polls every 2 s");
  assert.match(UI, /n \+= ch\.kickInboundLinks\(\);/, "a sealed block is offered on inbound links too");
  const IDX = readFileSync(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  assert.match(IDX, /onKick: \(k: \(\) => boolean\) => \{\s*inboundKicks\.add\(k\);/, "the listening side hands its kicks to the lane");
  // EVERY persistent listening door — direct AND relay. Measured 12/10: the relay door did not, the home machine dialled in
  // over the relay, and every sealed block waited for the 30 s round ("no live link right now").
  const persistent = (IDX.match(/persistent: true,/g) || []).length;
  const handed = (IDX.match(/inboundKicks\.add\(k\);/g) || []).length;
  assert.ok(persistent >= 2, "the direct and the relay listening doors are both persistent");
  assert.equal(handed, persistent, "every persistent listening door hands its kick to the lane");
});

test("card: 'latest message N ago' is the newest session end of the paired machine IN THIS STORE", async (t) => {
  const { peerLatestAt } = await import("../../dist/memory/channel/index.js");
  const root = tempDir(t, "zemory-fl-latest-");
  const db = join(root, "m.db");
  const conn = openMemory(db);
  try {
    const ins = conn.prepare("INSERT INTO sessions (id, source, origin, project_root, host, ended_at, message_count) VALUES (?, 'claude-code', 'local', 'C:\\p', ?, ?, 1)");
    ins.run("h1", "HOME-PC", "2026-10-11T17:00:00.000Z");
    ins.run("h2", "HOME-PC", "2026-10-11T17:43:32.104Z");
    ins.run("w1", ME, "2026-10-12T09:00:00.000Z");
  } finally {
    conn.close();
  }
  assert.deepEqual(peerLatestAt({ "DEV-1": "HOME-PC", "DEV-2": "NOBODY" }, db), { "DEV-1": "2026-10-11T17:43:32.104Z" }, "newest of THAT machine; unknown name ⇒ absent");
  assert.deepEqual(peerLatestAt({ "DEV-1": "HOME-PC" }, join(root, "missing.db")), {}, "no store ⇒ {} — the status never fails over it");
  const { readFileSync } = await import("node:fs");
  const GM = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  assert.match(GM, /if\(!m\.me&&m\.lat\)state\+=' · '\+t\('p2p\.latestFrom'\)/, "shown on the status line of the OTHER machine's card only");
  const CH = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  assert.equal((CH.match(/'p2p\.latestFrom':/g) || []).length, 2, "both dictionaries carry the key");
});

// ── DEFERRED CAPTURE (plan/24 §12.6) ─────────────────────────────────────────
// Measured 12/10: the Stop hook skipped every answer while the fast lane held the job slot (a 213 s vector round, a
// 67 s merge) and the scheduler was off ⇒ an hour of this machine's chat never reached the store, so nothing was sent.

/** A minimal Claude Code transcript where the adapter looks (`.claude/projects/...`). */
function transcript(t, sid, uuids) {
  const dir = join(tempDir(t, "zemory-fl-tr-"), ".claude", "projects", "d--proj");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${sid}.jsonl`);
  const lines = uuids.map((u, i) => ({
    type: i % 2 ? "assistant" : "user",
    uuid: u,
    timestamp: "2026-10-12T08:00:00.000Z",
    cwd: "D:\\proj",
    message: i % 2 ? { role: "assistant", content: [{ type: "text", text: `answer ${u}` }] } : { role: "user", content: `question ${u}` },
  }));
  writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return file;
}

function storeCount(uuids) {
  const db = openMemory(process.env.GLOBAL_MEMORY_DB);
  try {
    return db.prepare(`SELECT COUNT(*) c FROM messages WHERE uuid IN (${uuids.map(() => "?").join(",")})`).get(...uuids).c;
  } finally {
    db.close();
  }
}

test("hook: a busy job slot DEFERS the transcript — never drops it, never writes the store meanwhile", (t) => {
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const file = transcript(t, "sess-defer", ["d-u1", "d-a1"]);
  assert.ok(claimDaemonJob("test-busy"), "the slot is ours for this case");
  try {
    handleHook("stop", { transcript_path: file, session_id: "sess-defer" });
  } finally {
    releaseDaemonJob();
  }
  const q = queuedIngests();
  assert.equal(q.length, 1, "the skipped answer left exactly one note");
  assert.equal(q[0].path, file);
  assert.equal(storeCount(["d-u1", "d-a1"]), 0, "one writer: nothing written while the slot was held");
  const r = drainIngestQueue();
  assert.equal(r.newMessages, 2, "the drain lands the deferred chat");
  assert.equal(storeCount(["d-u1", "d-a1"]), 2);
  assert.equal(hasQueuedIngest(), false, "and drops the note");
  // slot free ⇒ the hook ingests directly, no note
  writeFileSync(file, readFileSync(file, "utf8") + JSON.stringify({ type: "user", uuid: "d-u2", timestamp: "2026-10-12T08:00:02.000Z", cwd: "D:\\proj", message: { role: "user", content: "again" } }) + "\n");
  handleHook("stop", { transcript_path: file, session_id: "sess-defer" });
  assert.equal(hasQueuedIngest(), false, "a free slot needs no note");
  assert.equal(storeCount(["d-u2"]), 1);
});

test("drain: a note re-written DURING the scan survives (the hook fired again); a vanished transcript's note is dropped", (t) => {
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const file = transcript(t, "sess-race", ["r-u1"]);
  deferIngest(file);
  deferIngest(file);
  assert.equal(queuedIngests().length, 1, "one note per transcript, never stacked");
  const r = drainIngestQueue((p) => {
    deferIngest(p); // the hook fires mid-drain: that answer is not in this scan
    return { newMessages: 0 };
  });
  assert.equal(r.files, 1);
  assert.equal(queuedIngests().length, 1, "re-queued mid-drain ⇒ the note stays for the next round");
  drainIngestQueue(() => ({ newMessages: 0 }));
  assert.equal(hasQueuedIngest(), false);
  deferIngest(join(tempDir(t, "zemory-fl-gone-"), "gone.jsonl"));
  const m = drainIngestQueue();
  assert.equal(m.missing, 1);
  assert.equal(hasQueuedIngest(), false, "a transcript that no longer exists leaves no note behind");
});

function ingestRunner(root, ok) {
  const f = join(root, `fake-ingest-${ok ? "ok" : "fail"}.mjs`);
  writeFileSync(
    f,
    `import { rmSync } from "node:fs"; import { dirname, join } from "node:path";
     const mode = process.argv[2];
     if (mode === "ingest") {
       ${ok ? `rmSync(join(dirname(process.env.GLOBAL_MEMORY_DB), "ingest-queue"), { recursive: true, force: true });` : ""}
       console.log(JSON.stringify(${ok ? `{ ok: true, mode, files: 1, newMessages: 2 }` : `{ ok: false, mode, error: "boom" }`}));
     } else console.log(JSON.stringify({ ok: true, mode, blocks: 1, messagesAdded: 3 }));`,
  );
  return f;
}

test("lane: a deferred ingest runs FIRST — before a queued merge, and with p2p OFF too", async (t) => {
  const root = tempDir(t, "zemory-fl-ingest-");
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  process.env.ZEMORY_FASTLANE_RUNNER = ingestRunner(root, true);
  t.after(() => delete process.env.ZEMORY_FASTLANE_RUNNER);
  let enabled = false;
  const lines = [];
  const lane = new FastLane({ dbPath: () => join(root, "none.db"), host: () => ME, enabled: () => enabled, syncRunning: () => false, kickLinks: () => {}, log: (m) => lines.push(m) });
  deferIngest(join(root, "a.jsonl"));
  lane.requestMerge();
  assert.equal(lane.tick(), "ingest", "p2p off: capture is this machine's own business, it still runs");
  await waitFor(() => lane.status().lastIngest, 10_000);
  assert.equal(lane.tick(), null, "p2p off ⇒ no merge");
  enabled = true;
  deferIngest(join(root, "b.jsonl"));
  assert.equal(lane.tick(), "ingest", "a deferred ingest goes before the queued merge");
  await waitFor(() => !lane.status().running, 10_000);
  assert.equal(lane.tick(), "merge", "then the merge");
  await waitFor(() => lane.status().lastMerge, 10_000);
  assert.ok(lines.some((l) => l.includes("capture hook deferred")), lines.join("\n"));
});

test("lane: a FAILED ingest rests FAST_REST_MS — never a failing child every 2 s tick", async (t) => {
  const root = tempDir(t, "zemory-fl-ingest-fail-");
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  t.after(() => rmSync(ingestQueueDir(), { recursive: true, force: true }));
  process.env.ZEMORY_FASTLANE_RUNNER = ingestRunner(root, false);
  t.after(() => delete process.env.ZEMORY_FASTLANE_RUNNER);
  const { FAST_REST_MS } = await import("../../dist/jobs/fastlane.js");
  const lane = new FastLane({ dbPath: () => join(root, "none.db"), host: () => ME, enabled: () => false, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  deferIngest(join(root, "a.jsonl"));
  assert.equal(lane.tick(), "ingest");
  await waitFor(() => lane.status().lastIngest, 10_000);
  assert.equal(lane.status().lastIngest.ok, false);
  const t1 = Date.now();
  assert.equal(lane.tick(t1), null, "failed ⇒ rest; the note is still queued");
  assert.equal(hasQueuedIngest(), true, "nothing lost while resting");
  assert.equal(lane.tick(t1 + FAST_REST_MS + 1), "ingest", "after the rest it tries again");
  await waitFor(() => !lane.status().running, 10_000);
});

// ── VECTOR ROUND BUDGET (plan/24 §12.7) ─────────────────────────────────────
// Measured 12/10 on DESKTOP-PFB157K: 50 vectors in 411 s; a block from the laptop waited ~5.5 min behind the round.

test("lane: a vector round that spent its budget is OWED again; one that finished is not; the child passes the budget", async (t) => {
  const root = tempDir(t, "zemory-fl-vecmore-");
  const f = join(root, "fake-vec.mjs");
  writeFileSync(f, `console.log(JSON.stringify({ ok: true, mode: process.argv[2], kind: "delta", messages: 0, embedded: 4, embedMs: 30000, more: process.env.FAKE_VEC_MORE === "1" }));`);
  process.env.ZEMORY_FASTLANE_RUNNER = f;
  t.after(() => {
    delete process.env.ZEMORY_FASTLANE_RUNNER;
    delete process.env.FAKE_VEC_MORE;
  });
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const lane = new FastLane({ dbPath: () => join(root, "none.db"), host: () => ME, enabled: () => true, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  lane.vectorsQueued = true; // a push just moved messages
  process.env.FAKE_VEC_MORE = "1";
  assert.equal(lane.tick(), "vectors");
  await waitFor(() => lane.status().lastVectors, 10_000);
  assert.equal(lane.status().vectorsQueued, true, "budget spent with vectors left ⇒ another round is owed");
  lane.requestMerge();
  assert.equal(lane.tick(), "merge", "a received block takes the write lane (the embed lane may run beside it)");
  await waitFor(() => lane.status().lastMerge && !lane.status().embedding, 10_000);
  process.env.FAKE_VEC_MORE = "0";
  assert.equal(lane.status().vectorsQueued, true, "the round beside the merge spent its budget too ⇒ still owed");
  assert.equal(lane.tick(), "vectors", "then the owed round");
  await waitFor(() => !lane.status().embedding, 10_000);
  assert.equal(lane.status().vectorsQueued, false, "a round that finished owes nothing");
  const FR = readFileSync(new URL("../src/jobs/fastrun.ts", import.meta.url), "utf8");
  assert.match(FR, /embedBudgetMs: FAST_VECTOR_BUDGET_MS, embedBatch: FAST_VECTOR_BATCH/, "the vector child runs under the budget");
});

test("NEGATIVE: the lane is OFF without p2p / a paired machine — no poll, no child", (t) => {
  rmSync(ingestQueueDir(), { recursive: true, force: true });
  const root = tempDir(t, "zemory-fl-off-");
  const db = join(root, "m.db");
  seed(db, ME, "s1", ["x1"]);
  const lane = new FastLane({ dbPath: () => db, host: () => ME, enabled: () => false, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  lane.requestMerge();
  assert.equal(lane.tick(0), null);
  assert.equal(lane.tick(FAST_MAX_WAIT_MS * 2), null);
});
