// ONE CONTAINER + ONE WRITE QUEUE for the p2p channel (plan/24 §4, user 2026-10-07: "2 máy đều chỉ dc ghi
// vào 1 file 1 db thôi, và phải có hàng đợi, máy nào gửi trước thì vào trước, xong tới máy kia").
//
// The real second writer is on the SAME machine: the daemon appends blocks it receives, the sync child appends
// our own export. Both carry one host name. Measured on the code: two unqueued appends make
// `appendChunkVerified` of one side count `before + 2`, call it a failed write and truncate the tail — the
// other side's block is gone. Each case below is one way the queue can fail.
import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { tempDir } from "./helpers.mjs";
import { acquireChannelWriteLock, listContainerChunks, chunkBlockId } from "../../dist/memory/share.js";
import { appendReceivedBlock, absorbLegacyPens, inventoryIds } from "../../dist/memory/channel/blocks.js";

const DIST = new URL("../../dist/", import.meta.url).href;
const HOST = (hostname() || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
const LOCK = "global_memory.sync.lock";

/** A bundle-shaped buffer: magic line, header line carrying `kdf.salt` (the block id), payload. */
function fakeBundle(id, payloadBytes = 4096) {
  return Buffer.concat([Buffer.from(`ZEMORY-TEST-BUNDLE\n${JSON.stringify({ kdf: { salt: id } })}\n`), randomBytes(payloadBytes)]);
}
function rootIds(dir) {
  const out = [];
  for (const f of ["global_memory.enc", "global_memory.002.enc"]) {
    const p = join(dir, f);
    try {
      statSync(p);
    } catch {
      continue;
    }
    for (const c of listContainerChunks(p)) out.push(chunkBlockId(p, c));
  }
  return out;
}
test("two PROCESSES appending to one root container at the same time lose no block", { timeout: 120_000 }, async (t) => {
  const base = tempDir(t, "zemory-one-");
  const dir = join(base, "channel");
  mkdirSync(dir, { recursive: true });
  const go = Date.now() + 1500; // both start on the same tick: the race is forced, not hoped for
  const N = 6;
  const script = join(base, "writer.mjs");
  writeFileSync(
    script,
    [
      `import { randomBytes } from "node:crypto";`,
      `const { appendReceivedBlock } = await import(${JSON.stringify(DIST + "memory/channel/blocks.js")});`,
      `const [dir, tag, go, n] = process.argv.slice(2);`,
      `while (Date.now() < Number(go)) await new Promise((r) => setTimeout(r, 5));`,
      `for (let i = 0; i < Number(n); i++) {`,
      `  const b = Buffer.concat([Buffer.from("ZEMORY-TEST-BUNDLE\\n" + JSON.stringify({ kdf: { salt: tag + "-" + i } }) + "\\n"), randomBytes(2 * 1024 * 1024)]);`,
      `  await appendReceivedBlock(dir, b);`,
      `}`,
    ].join("\n"),
  );
  const run = (tag) =>
    new Promise((resolve, reject) => {
      const c = spawn(process.execPath, [script, dir, tag, String(go), String(N)], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
      let err = "";
      c.stderr.on("data", (d) => (err += d));
      c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`writer ${tag} exit ${code}: ${err.slice(0, 400)}`))));
    });
  await Promise.all([run("A"), run("B")]);
  const ids = rootIds(dir);
  const want = [...Array(N).keys()].flatMap((i) => [`A-${i}`, `B-${i}`]).sort();
  assert.deepEqual([...ids].sort(), want, "every block of BOTH writers must be in the one container, exactly once");
});

test("NEGATIVE: a lock held by a LIVE process of THIS machine is not stolen — you queue", { timeout: 30_000 }, async (t) => {
  const dir = tempDir(t, "zemory-one-live-");
  // A real, live process of this machine that is not us.
  const sleeper = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)"], { stdio: "ignore", windowsHide: true });
  t.after(() => sleeper.kill());
  const lockPath = join(dir, LOCK);
  writeFileSync(lockPath, JSON.stringify({ host: HOST, pid: sleeper.pid, at: new Date().toISOString(), beat: true }));
  const ac = { aborted: false };
  const p = acquireChannelWriteLock(dir, { signal: ac });
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(JSON.parse(readFileSync(lockPath, "utf8")).pid, sleeper.pid, "same host is not ownership: a live holder keeps the lock");
  ac.aborted = true;
  await assert.rejects(() => p, /huỷ khi đang chờ/);
});

test("a lock left by a DEAD process of this machine does not jam the queue", { timeout: 30_000 }, async (t) => {
  const dir = tempDir(t, "zemory-one-dead-");
  const gone = spawn(process.execPath, ["-e", "0"], { stdio: "ignore", windowsHide: true });
  await new Promise((r) => gone.on("exit", r));
  writeFileSync(join(dir, LOCK), JSON.stringify({ host: HOST, pid: gone.pid, at: new Date().toISOString(), beat: true }));
  const t0 = Date.now();
  const release = await acquireChannelWriteLock(dir);
  release();
  assert.ok(Date.now() - t0 < 1000, "a crashed run's lock must be taken over at once, not after the heartbeat timeout");
});

test("inside ONE process, writers take turns (the daemon runs several peer sessions with one pid)", async (t) => {
  const dir = tempDir(t, "zemory-one-inproc-");
  const order = [];
  const first = await acquireChannelWriteLock(dir);
  const second = acquireChannelWriteLock(dir).then((rel) => {
    order.push("second-in");
    rel();
  });
  await new Promise((r) => setTimeout(r, 300));
  order.push("first-out");
  first();
  await second;
  assert.deepEqual(order, ["first-out", "second-in"], "the second writer must wait until the first releases");
});

test("a block the root already holds is not appended twice", async (t) => {
  const dir = join(tempDir(t, "zemory-one-dup-"), "channel");
  const b = fakeBundle("same-id");
  await appendReceivedBlock(dir, b);
  const r = await appendReceivedBlock(dir, b);
  assert.equal(r.skipped, true);
  assert.deepEqual(rootIds(dir), ["same-id"]);
});

test("absorbLegacyPens moves ONLY what the root lacks, writes nothing on a dry run, and is idempotent", async (t) => {
  const dir = join(tempDir(t, "zemory-one-absorb-"), "channel");
  const pen = join(dir, "HMVEQRS7IJADAN5J");
  mkdirSync(pen, { recursive: true });
  await appendReceivedBlock(dir, fakeBundle("shared"));
  for (const id of ["shared", "pen-1", "pen-2"]) await appendReceivedBlock(pen, fakeBundle(id));

  const dry = await absorbLegacyPens(dir, { dryRun: true });
  assert.equal(dry.copied, 2);
  assert.equal(dry.present, 1);
  assert.deepEqual(rootIds(dir), ["shared"], "a dry run must not write a byte");

  const real = await absorbLegacyPens(dir);
  assert.equal(real.copied, 2);
  assert.deepEqual(rootIds(dir).sort(), ["pen-1", "pen-2", "shared"], "root ⊇ pen by block id");
  assert.equal(new Set(inventoryIds(dir)).size, 3, "the pen copies are duplicates by id, not new blocks");
  assert.equal(rootIds(pen).length, 3, "the move is additive: the pen is left untouched (removal is step ⑤)");

  const again = await absorbLegacyPens(dir);
  assert.equal(again.copied, 0, "a second run copies nothing");
});
