// The merged-block ledger is keyed by BLOCK ID, not by `<file>#<index>` (plan/24 §7c ①).
// Measured 2026-10-07: after the p2p channel moved to its root, `global_memory.005.enc#3` named a Drive block AND a
// different channel block. The two overwrote each other's ledger row, so every sync decrypted the whole channel again
// (one run: merge 2115 s to ship 70 messages). Each case below is one way the ledger can make us decrypt for nothing.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { exportMemoryBundle, appendChunkVerified, writeMemoryShareKey, mergeChannelDir, listContainerChunks, chunkBlockId } from "../../dist/memory/share.js";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

function seedDb(dbPath, tag) {
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, host, started_at) VALUES (?,?,?,?)").run(`s-${tag}`, "test", "h", new Date().toISOString());
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(`s-${tag}`, `u-${tag}`, "user", `content ${tag}`, new Date().toISOString());
  db.close();
}
async function containerWith(t, dir, keyPath, tag) {
  mkdirSync(dir, { recursive: true });
  const work = tempDir(t, "zemory-led-");
  seedDb(join(work, "s.db"), tag);
  await exportMemoryBundle({ dbPath: join(work, "s.db"), outPath: join(work, "b.enc"), keyFile: keyPath });
  appendChunkVerified(join(dir, "global_memory.enc"), join(work, "b.enc"), 1);
}
const decrypted = (rows) => rows.filter((r) => !r.skipped).length;

test("two channels with SAME-NAMED segments but different blocks: a second round decrypts nothing", async (t) => {
  const base = tempDir(t, "zemory-led-base-");
  const keyFile = join(base, "share.key");
  writeMemoryShareKey(keyFile);
  const a = join(base, "drive");
  const b = join(base, "channel");
  await containerWith(t, a, keyFile, "A");
  await containerWith(t, b, keyFile, "B");
  const dbPath = join(base, "recv.db");
  assert.equal(decrypted(await mergeChannelDir(a, { dbPath, keyFile })), 1);
  assert.equal(decrypted(await mergeChannelDir(b, { dbPath, keyFile })), 1);
  assert.equal(decrypted(await mergeChannelDir(a, { dbPath, keyFile })), 0, "position keys collide: B overwrote A's row and A is decrypted again");
  assert.equal(decrypted(await mergeChannelDir(b, { dbPath, keyFile })), 0);
});

test("the SAME block in two places (root + legacy pen, or Drive + channel) is merged once", async (t) => {
  const base = tempDir(t, "zemory-led-same-");
  const keyFile = join(base, "share.key");
  writeMemoryShareKey(keyFile);
  const root = join(base, "channel");
  await containerWith(t, root, keyFile, "X");
  mkdirSync(join(base, "other"), { recursive: true });
  copyFileSync(join(root, "global_memory.enc"), join(base, "other", "global_memory.002.enc"));
  const dbPath = join(base, "recv.db");
  assert.equal(decrypted(await mergeChannelDir(root, { dbPath, keyFile })), 1);
  assert.equal(decrypted(await mergeChannelDir(join(base, "other"), { dbPath, keyFile })), 0, "a known block id must be skipped wherever it sits");
});

test("upgrade carry-over: a block already recorded under the OLD position label is not decrypted again", async (t) => {
  const base = tempDir(t, "zemory-led-carry-");
  const keyFile = join(base, "share.key");
  writeMemoryShareKey(keyFile);
  const dir = join(base, "channel");
  await containerWith(t, dir, keyFile, "C");
  const dbPath = join(base, "recv.db");
  const seg = join(dir, "global_memory.enc");
  const chunk = listContainerChunks(seg)[0];
  // Ledger as an older version wrote it: label `<file>#<index>`, signature `<len>:<createdAt>`.
  const header = JSON.parse((await import("node:fs")).readFileSync(seg).subarray(chunk.offset).toString("utf8").split("\n")[1]);
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO merged_bundles (file, sig, merged_at) VALUES (?,?,?)").run("global_memory.enc#0", `${chunk.len}:${header.createdAt}`, new Date().toISOString());
  db.close();
  assert.equal(decrypted(await mergeChannelDir(dir, { dbPath, keyFile })), 0, "the old row proves it was merged");
  const d2 = openMemory(dbPath);
  const row = d2.prepare("SELECT file FROM merged_bundles WHERE file = ?").get(`blk:${chunkBlockId(seg, chunk)}`);
  d2.close();
  assert.ok(row, "and the id row is recorded, so the next round no longer needs the old label");
});
