// plan/24 §9.2 check ① — a pair may go ONE-WAY (or change source) only once both sides CONVERGED.
//
// Why it matters: flipping before convergence makes the new source's first push carry the
// INCOMPLETE copy over the complete one, and nothing errors. Until 2026-10-05 only the quick check
// existed (count of queued items = the divergence already KNOWN); the full one compares this
// machine's files with the peer's last declared inventory.
//
// Runs in a CHILD with a temp store: `setPeerDirection` writes the pair config, and an in-process
// test would write the REAL config.json of this machine.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { runInMemoryChild, tempDir } from "./helpers.mjs";

const PEER = "SGEKJ2R3-A6KSAAAA-BBBBCCCC-DDDDEEEE";
const SELF = "HMVEQRS7-IJADAN5J-JLKQQUD2-Q32CWNBK";

function run(t, body) {
  const root = tempDir(t, "zemory-dir-");
  mkdirSync(join(root, "data"), { recursive: true });
  return runInMemoryChild(
    root,
    'const M = await import("file://" + process.env.Z_DIST + "/memory/channel/mirrorstate.js");\n' +
      'const { join } = await import("node:path");\n' +
      'const inv = join(process.env.Z_ROOT, "inv.json");\n' +
      'const PEER = "' + PEER + '", SELF = "' + SELF + '";\n' +
      'S.setP2pPeers([PEER]);\n' +
      'const e = (rel, hash) => ({ area: "docs", rel, size: 1, mtimeMs: 0, hash });\n' +
      body,
  );
}

test("no inventory from the peer yet ⇒ REFUSE (convergence cannot be proven) and config unchanged", (t) => {
  const [r, cfg] = run(t, 'out.push(M.setPeerDirection(PEER, { direction: "one-way", source: SELF }, { mine: [e("a.md","1")], inventoryFile: inv }));\nout.push(S.getPeerSync(PEER));');
  assert.deepEqual(r, { ok: false, reason: "no-inventory" });
  assert.equal(cfg.direction, "two-way");
});

test("peer inventory DIFFERS ⇒ REFUSE with the count, config unchanged", (t) => {
  const [r, cfg] = run(
    t,
    'M.rememberPeerInventory(PEER, [e("a.md","1"), e("b.md","OLD")], inv);\n' +
      'out.push(M.setPeerDirection(PEER, { direction: "one-way", source: SELF }, { mine: [e("a.md","1"), e("b.md","NEW"), e("c.md","3")], inventoryFile: inv }));\n' +
      "out.push(S.getPeerSync(PEER));",
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, "diverged");
  assert.equal(r.count, 2, "b.md differs + c.md missing on the peer");
  assert.equal(cfg.direction, "two-way");
});

test("converged ⇒ one-way is SET with the chosen source", (t) => {
  const [r, cfg] = run(
    t,
    'M.rememberPeerInventory(PEER, [e("a.md","1"), { area: "files", rel: "x.png", size: 9, mtimeMs: 0 }], inv);\n' +
      'out.push(M.setPeerDirection(PEER, { direction: "one-way", source: SELF }, { mine: [e("a.md","1")], inventoryFile: inv }));\n' +
      "out.push(S.getPeerSync(PEER));",
  );
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(cfg.direction, "one-way");
  assert.equal(cfg.source, SELF);
});

test("items still waiting for review ⇒ REFUSE even if the inventory matches (quick check runs first)", (t) => {
  const [r] = run(
    t,
    'M.rememberPeerInventory(PEER, [e("a.md","1")], inv);\n' +
      'const db = M.mirrorDb();\n' +
      'M.enqueue(db, { peerId: PEER, area: "docs", rel: "q.md", verdict: "take", theirBody: Buffer.from("x"), theirHash: "h", mineHash: null, mergedBody: null });\n' +
      'out.push(M.setPeerDirection(PEER, { direction: "one-way", source: SELF }, { db, mine: [e("a.md","1")], inventoryFile: inv }));',
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, "pending");
  assert.equal(r.count, 1);
});

test("back to TWO-WAY is always allowed (nothing gets overwritten) — even with no inventory", (t) => {
  const [r, cfg] = run(
    t,
    'S.setPeerSync(PEER, { direction: "one-way", source: SELF });\n' +
      'out.push(M.setPeerDirection(PEER, { direction: "two-way" }, { mine: [], inventoryFile: inv }));\n' +
      "out.push(S.getPeerSync(PEER));",
  );
  assert.equal(r.ok, true);
  assert.equal(cfg.direction, "two-way");
});

test("two-way ORIGIN: set even with items waiting (it overwrites nothing), survives a peer-list rewrite, cleared by plain two-way", (t) => {
  // User 13/10: *"bên nào là gốc thì bên đó giữ"* — the origin only drives the recommendation + the keep-origin button.
  const [set, kept, cleared] = run(
    t,
    'const db = M.mirrorDb();\n' +
      'M.enqueue(db, { peerId: PEER, area: "docs", rel: "q.md", verdict: "block", theirBody: Buffer.from("x"), theirHash: "h", mineHash: "m", mergedBody: null });\n' +
      'out.push(M.setPeerDirection(PEER, { direction: "two-way", origin: PEER }, { db, mine: [], inventoryFile: inv }));\n' +
      "S.setP2pPeers([PEER]);\n" +
      "out.push(S.getPeerSync(PEER));\n" +
      'M.setPeerDirection(PEER, { direction: "two-way" }, { db, mine: [], inventoryFile: inv });\n' +
      "out.push(S.getPeerSync(PEER));",
  );
  assert.deepEqual(set, { ok: true, direction: "two-way", origin: PEER }, "no convergence check for an origin: a queued item does not refuse it");
  assert.deepEqual(kept, { direction: "two-way", origin: PEER }, "rewriting the peer list keeps the origin");
  assert.deepEqual(cleared, { direction: "two-way" }, "plain two-way = no origin");
});

test("surface: the queue names the sender, recommends the origin copy, and leads with keep-all-origin", async () => {
  const { readFileSync } = await import("node:fs");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /return \{ \.\.\.r, peerName: name, origin: !o \? null : norm\(o\) === norm\(self\) \? "me" : "peer" \};/, "/mirror-queue carries sender + origin");
  assert.match(gm, /var rec=q\.origin==='peer'\?\(q\.verdict==='merge'\?'merged':'theirs'\):\(q\.origin==='me'\?'mine':''\);/, "origin copy = the recommended button");
  assert.match(gm, /if\(q\.peerName\)why=t\('mir\.from'\)/, "each card says which machine it came from");
  assert.match(gm, /ob\.setAttribute\('data-act',og==='me'\?'mir-all-mine':'mir-all-theirs'\);/, "keep-all-origin reuses the bulk doors (theirs keeps its arm-twice)");
  assert.match(gm, /\['two-me','p2p\.dirTwoMe'\],\['two-peer','p2p\.dirTwoPeer'\]/, "origin is chosen in the existing direction select");
});

test("one surface, one implementation: CLI and HTTP both call setPeerDirection (HP điều 17)", async () => {
  const { readFileSync } = await import("node:fs");
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const cli = readFileSync(new URL("../src/commands/memory.ts", import.meta.url), "utf8");
  assert.match(ui, /if \(p === "\/set-peer-direction"\)[\s\S]{0,900}ms\.setPeerDirection\(/, "the HTTP door delegates");
  assert.match(cli, /setPeerDirection\(/, "the CLI door delegates");
  assert.doesNotMatch(cli, /setPeerSync\(peer, \{ direction: dir/, "a second implementation in the CLI = two doors drifting apart");
});
