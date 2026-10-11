// p2p FAST LANE (plan/24 §12 — user 2026-10-12: "nó phải sync liền như zalo là dc"). Before it, a block was sealed only by
// the 30′ auto-sync and a received block reached the store only through a whole sync round that gave up on a busy store:
// a message took up to ~60′ to show on the other machine (measured 11/10). Each case is one link of the new chain.
import assert from "node:assert/strict";
import test from "node:test";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";

// The job slot writes `daemon-job.lock` next to the store: point the store at a temp dir BEFORE any module loads.
const STORE = mkdtempSync(join(tmpdir(), "zemory-fastlane-store-"));
process.env.GLOBAL_MEMORY_DB = join(STORE, "global_memory.db");

const { openMemory } = await import("../../dist/memory/db.js");
const { pushChannelFast, writeMemoryShareKey } = await import("../../dist/memory/share.js");
const { inventoryIds } = await import("../../dist/memory/channel/blocks.js");
const { FastLane, fastSendDecide, freshSendState, ownPendingMax, FAST_QUIET_MS, FAST_MAX_WAIT_MS } = await import("../../dist/jobs/fastlane.js");
const { tempDir } = await import("./helpers.mjs");

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
  const first = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db, embed: false });
  assert.notEqual(first.push.kind, "none", "an empty channel gets its first block");
  assert.equal(inventoryIds(chan).length, 1);
  const again = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db, embed: false });
  assert.equal(again.push.kind, "none", "nothing new ⇒ no block");
  assert.equal(inventoryIds(chan).length, 1);
  seed(db, ME, "s1", ["a3"]);
  const delta = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db, embed: false });
  assert.equal(delta.push.kind, "delta");
  assert.equal(delta.push.messages, 1, "only the one new message travels");
  assert.equal(inventoryIds(chan).length, 2, "one new block");
  seed(db, "OTHER-PC", "so", ["o1"]);
  const other = await pushChannelFast({ dir: chan, keyFile: key, dbPath: db, embed: false });
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

// A fake child: prints the result line the real `fastrun.js` would, per mode (env FAKE_PUSH_KIND chooses the push result).
function fakeRunner(root) {
  const f = join(root, "fake-fastrun.mjs");
  writeFileSync(
    f,
    `const mode = process.argv[2];
     if (mode === "push") console.log(JSON.stringify({ ok: true, mode, kind: process.env.FAKE_PUSH_KIND || "delta", messages: 2 }));
     else console.log(JSON.stringify({ ok: true, mode, blocks: 1, messagesAdded: 3 }));`,
  );
  return f;
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

test("lane: a sealed block kicks the live links; a push that sealed nothing does not", async (t) => {
  const root = tempDir(t, "zemory-fl-kick-");
  process.env.ZEMORY_FASTLANE_RUNNER = fakeRunner(root);
  t.after(() => {
    delete process.env.ZEMORY_FASTLANE_RUNNER;
    delete process.env.FAKE_PUSH_KIND;
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
  assert.match(SH, /embedPending\(\{ dbPath: o\.dbPath, limit: o\.embedLimit \?\? 64, fromId: frontier \}\)/, "the fast push embeds FROM the frontier");
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

test("NEGATIVE: the lane is OFF without p2p / a paired machine — no poll, no child", (t) => {
  const root = tempDir(t, "zemory-fl-off-");
  const db = join(root, "m.db");
  seed(db, ME, "s1", ["x1"]);
  const lane = new FastLane({ dbPath: () => db, host: () => ME, enabled: () => false, syncRunning: () => false, kickLinks: () => {}, log: () => {} });
  lane.requestMerge();
  assert.equal(lane.tick(0), null);
  assert.equal(lane.tick(FAST_MAX_WAIT_MS * 2), null);
});
