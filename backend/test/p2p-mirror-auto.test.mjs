// AUTO-SETTLE of the two-way review queue (plan/24 §9.6b). The queue stays the only door; a machine's policy decides
// in place of the click:
//   · ask    — every item waits (the old behaviour);
//   · author — the other side's change is taken, different lines merge, the SAME lines: the earlier edit wins and the
//              later one is stashed on the machine that wrote it (nothing is lost); no way to tell which came first ⇒ ask;
//   · fixed  — the chosen machine's version wins.
// Driven through the real receive door of mirrorHooks on a fake machine (no network), plus the pure choice table.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { openMemory } from "../../dist/memory/db.js";
import { autoChoice, listQueue, mirrorHooks, writeBase } from "../../dist/memory/channel/mirrorstate.js";
import { tempDir } from "./helpers.mjs";

const PEER = "PEERAAA-BBBBBBB-CCCCCCC-DDDDDDD-EEEEEEE-FFFFFFF-GGGGGGG-HHHHHHH";
const SELF = "SELFAAA-BBBBBBB-CCCCCCC-DDDDDDD-EEEEEEE-FFFFFFF-GGGGGGG-HHHHHHH";
const sha = (s) => createHash("sha256").update(s).digest("hex");

function machine(t, policy) {
  const base = tempDir(t, "zemory-mauto-");
  const repoRoot = join(base, "repo");
  mkdirSync(join(repoRoot, "docs"), { recursive: true });
  const dbDir = mkdtempSync(join(tmpdir(), "zemory-mautodb-"));
  const db = openMemory(join(dbDir, "gm.db"));
  t.after(() => { try { db.close(); } catch { /* closed */ } rmSync(dbDir, { recursive: true, force: true }); });
  const hooks = mirrorHooks({ repoRoot, db, peerSync: () => ({ direction: "two-way" }), mirrorAuto: () => policy, selfId: () => SELF });
  const file = (rel) => join(repoRoot, "docs", rel);
  return { repoRoot, db, hooks, file };
}
/** A file both machines agreed on (base), then edited locally at `mineAt`, with the peer having edited it at `theirsAt`. */
function conflict(m, rel, mineAt, theirsAt) {
  const baseText = "a\nb\nc\n";
  writeFileSync(m.file(rel), "a\nB-mine\nc\n");
  utimesSync(m.file(rel), new Date(mineAt), new Date(mineAt));
  writeBase(m.db, PEER, "docs", rel, sha(baseText), Buffer.from(baseText));
  m.hooks.declared(PEER, [{ area: "docs", rel, size: 12, mtimeMs: theirsAt, hash: sha("a\nB-theirs\nc\n") }]);
  return m.hooks.receive(PEER, "docs", rel, Buffer.from("a\nB-theirs\nc\n"));
}

test("the choice table: ask never decides; author takes, merges, keeps the side that only adds, ASKS a true conflict; fixed follows the chosen machine", () => {
  const ask = { mode: "ask" }, author = { mode: "author" };
  for (const v of ["take", "merge", "block"]) assert.equal(autoChoice({ peerId: PEER, verdict: v }, ask, SELF, { mine: 1, theirs: 2 }), null);
  assert.equal(autoChoice({ peerId: PEER, verdict: "take" }, author, SELF, { mine: null, theirs: null }).choice, "theirs");
  assert.equal(autoChoice({ peerId: PEER, verdict: "merge" }, author, SELF, { mine: null, theirs: null }).choice, "merged");
  // File times never decide: a machine that RECEIVED a copy stamps the time of receipt (2026-10-14, twice).
  for (const when of [{ mine: 200, theirs: 100 }, { mine: 100, theirs: 200 }, { mine: 100, theirs: 100 }, { mine: 100, theirs: null }]) {
    assert.equal(autoChoice({ peerId: PEER, verdict: "block" }, author, SELF, when), null, `a true two-sided edit is asked (${JSON.stringify(when)})`);
  }
  assert.equal(autoChoice({ peerId: PEER, verdict: "block" }, author, SELF, { mine: 1, theirs: 2, grown: "mine" }).choice, "mine");
  assert.equal(autoChoice({ peerId: PEER, verdict: "block" }, author, SELF, { mine: 2, theirs: 1, grown: "theirs" }).choice, "theirs");
  const peerFixed = { mode: "fixed", machine: PEER }, selfFixed = { mode: "fixed", machine: SELF };
  assert.equal(autoChoice({ peerId: PEER, verdict: "block" }, peerFixed, SELF, { mine: 1, theirs: 2 }).choice, "theirs");
  assert.equal(autoChoice({ peerId: PEER, verdict: "take" }, selfFixed, SELF, { mine: 1, theirs: 2 }).choice, "mine");
  assert.equal(autoChoice({ peerId: PEER, verdict: "merge" }, selfFixed, SELF, { mine: 1, theirs: 2 }).choice, "merged");
  assert.equal(autoChoice({ peerId: PEER, verdict: "take" }, { mode: "fixed", machine: "OTHER" }, SELF, { mine: 1, theirs: 2 }), null,
    "a third machine is the chosen one ⇒ this pair asks");
});

test("ask (the default) keeps the old behaviour: a new file from the other machine waits in the queue", (t) => {
  const m = machine(t, { mode: "ask" });
  const r = m.hooks.receive(PEER, "docs", "new.md", Buffer.from("x\n"));
  assert.equal(r.queued, true);
  assert.equal(listQueue(m.db, PEER).length, 1);
  assert.equal(existsSync(m.file("new.md")), false);
});

test("author: a new file is taken at once, nothing left waiting, and the decision is logged", (t) => {
  const m = machine(t, { mode: "author" });
  m.hooks.receive(PEER, "docs", "new.md", Buffer.from("x\n"));
  assert.equal(readFileSync(m.file("new.md"), "utf8"), "x\n");
  assert.equal(listQueue(m.db, PEER).length, 0);
  const log = JSON.parse(readFileSync(join(m.repoRoot, "mirror-auto-log.json"), "utf8"));
  assert.equal(log[0].rel, "new.md"); assert.equal(log[0].choice, "theirs");
});

test("author, same lines edited on both machines ⇒ asked, whichever file time looks earlier — nothing overwritten", (t) => {
  for (const [mineAt, theirsAt] of [[2_000_000, 1_000_000], [1_000_000, 2_000_000]]) {
    const m = machine(t, { mode: "author" });
    conflict(m, "x.md", mineAt, theirsAt);
    assert.equal(listQueue(m.db, PEER).length, 1, "the item waits for a hand");
    assert.equal(readFileSync(m.file("x.md"), "utf8"), "a\nB-mine\nc\n", "nothing overwritten");
  }
});

// The root of both incidents: the "this is a copy I sent" memory was lost on every daemon restart, so an old copy of this
// machine's own file coming back read as "both edited". It is persisted now — pinned across a real process restart.
test("an old copy of this machine's own file coming back after a RESTART is recognised: kept, not queued, not taken", (t) => {
  const m = machine(t, { mode: "author" });
  const oldText = "v1\n", newText = "v1-edited-on-this-machine\n";
  writeFileSync(m.file("own.md"), newText);
  writeBase(m.db, PEER, "docs", "own.md", sha("v0\n"), Buffer.from("v0\n"));
  m.hooks.sent(PEER, "docs", "own.md", sha(oldText)); // this machine had sent v1 earlier
  const script = join(m.repoRoot, "..", "restart.mjs");
  writeFileSync(script, [
    'import { openMemory } from ' + JSON.stringify(new URL("../../dist/memory/db.js", import.meta.url).href) + ';',
    'import { mirrorHooks, listQueue } from ' + JSON.stringify(new URL("../../dist/memory/channel/mirrorstate.js", import.meta.url).href) + ';',
    'const [repoRoot, dbPath, peer] = process.argv.slice(2);',
    'const db = openMemory(dbPath);',
    'const h = mirrorHooks({ repoRoot, db, peerSync: () => ({ direction: "two-way" }), mirrorAuto: () => ({ mode: "author" }), selfId: () => "SELF" });',
    'const r = h.receive(peer, "docs", "own.md", Buffer.from("v1\\n"));',
    'console.log(JSON.stringify({ r, queued: listQueue(db, peer).length }));',
    'db.close();',
  ].join("\n"));
  const dbPath = m.db.name;
  const out = spawnSync(process.execPath, [script, m.repoRoot, dbPath, PEER], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  const res = JSON.parse(out.stdout.trim().split("\n").pop());
  assert.equal(res.queued, 0, "the returning old copy is not a conflict");
  assert.equal(readFileSync(m.file("own.md"), "utf8"), newText, "this machine's newer version stays");
});

// The incident of 2026-10-14: the peer held an OLD copy of this machine's own file (it had received it); its file time was
// the time it RECEIVED the copy, which read as "edited first", so the old copy won and the day's additions were reverted
// (stashed, then restored). A version that only ADDS lines to the other carried on from it and wins, whatever the clocks say.
test("author: a version that only adds lines to the other wins over the clocks — this machine's longer copy is kept", (t) => {
  const m = machine(t, { mode: "author" });
  const baseText = "# Log\n\n## old\nx\n";
  const theirsText = "# Log\n\n## mid\ny\n\n## old\nx\n"; // the copy the peer got earlier
  const mineText = "# Log\n\n## new\nz\n\n## mid\ny\n\n## old\nx\n"; // this machine carried on from it
  writeFileSync(m.file("log.md"), mineText);
  utimesSync(m.file("log.md"), new Date(9_000_000), new Date(9_000_000));
  writeBase(m.db, PEER, "docs", "log.md", sha(baseText), Buffer.from(baseText));
  m.hooks.declared(PEER, [{ area: "docs", rel: "log.md", size: 1, mtimeMs: 1_000_000, hash: sha(theirsText) }]); // "earlier"
  m.hooks.receive(PEER, "docs", "log.md", Buffer.from(theirsText));
  assert.equal(readFileSync(m.file("log.md"), "utf8"), mineText, "the longer copy that carried on is kept");
  assert.equal(listQueue(m.db, PEER).length, 0);
  assert.equal(existsSync(join(m.repoRoot, "mirror-stash")), false, "nothing had to be stashed");
});

test("author: the other version only adds lines to this machine's ⇒ it is taken, even when it looks later", (t) => {
  const m = machine(t, { mode: "author" });
  const baseText = "a\n";
  const mineText = "a\nb\n";
  const theirsText = "a\nb\nc\n";
  writeFileSync(m.file("g.md"), mineText);
  utimesSync(m.file("g.md"), new Date(1_000_000), new Date(1_000_000));
  writeBase(m.db, PEER, "docs", "g.md", sha(baseText), Buffer.from(baseText));
  m.hooks.declared(PEER, [{ area: "docs", rel: "g.md", size: 1, mtimeMs: 9_000_000, hash: sha(theirsText) }]);
  m.hooks.receive(PEER, "docs", "g.md", Buffer.from(theirsText));
  assert.equal(readFileSync(m.file("g.md"), "utf8"), theirsText);
});

test("fixed on the other machine: its version wins even on the same lines, with this machine's edit stashed", (t) => {
  const m = machine(t, { mode: "fixed", machine: PEER });
  conflict(m, "f.md", 1_000_000, 2_000_000);
  assert.equal(readFileSync(m.file("f.md"), "utf8"), "a\nB-theirs\nc\n");
  assert.equal(readdirSync(join(m.repoRoot, "mirror-stash", "docs")).length, 1);
  assert.equal(listQueue(m.db, PEER).length, 0);
});
