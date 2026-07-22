// Delta Drive sync (plan 08 §7 / plan 14 §3b). syncDrive writes a per-host DELTA
// SERIES into a shared folder — a baseline plus small per-sync deltas — instead of
// re-shipping the whole lean bundle every time. These tests lock the properties
// that make that safe: self-sufficiency (a machine that missed syncs still ends up
// complete), receiver-side dedup (unchanged files aren't re-merged), and
// compaction (folding deltas into a fresh baseline never loses a row).

import assert from "node:assert/strict";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { syncDrive, writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

// Each syncDrive call reads getSyncLevel() + the export watermark from config in
// ~/.zemory, and stamps sessions with THIS os.hostname(). We can't fake hostname,
// so every machine here uses its own DB file; the host is the same real hostname,
// which is fine — we assert on rows/files, not on the host string.
function sandboxHome(t) {
  const home = tempDir(t, "zemory-drivesync-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  for (const k of ["HOME", "USERPROFILE", "APPDATA", "XDG_CONFIG_HOME"]) process.env[k] = home;
  delete process.env.GLOBAL_MEMORY_DB;
  t.after(() => { for (const k of Object.keys(save)) { if (save[k] === undefined) delete process.env[k]; else process.env[k] = save[k]; } });
}

let msgSeq = 0;
function addMessages(dbPath, project, n) {
  const db = openMemory(dbPath);
  try {
    const sid = "s" + ++msgSeq;
    db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run(
      sid, "claude-code", "local", project, "PC",
    );
    const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
    for (let i = 0; i < n; i++) ins.run(sid, `${sid}-u${i}`, "user", `msg ${sid} ${i} ${"x".repeat(30)}`, "2026-01-01T00:00:00Z");
  } finally {
    db.close();
  }
}
const msgCount = (dbPath) => { const db = openMemory(dbPath); try { return db.prepare("SELECT COUNT(*) c FROM messages").get().c; } finally { db.close(); } };
const enc = (dir) => readdirSync(dir).filter((f) => f.endsWith(".enc"));

test("lean sync writes a baseline first, then only small deltas", async (t) => {
  sandboxHome(t);
  const root = tempDir(t, "zemory-ds-");
  const dir = join(root, "drive"); mkdirSync(dir);
  const dbPath = join(root, "memory.db");
  const keyPath = join(root, "share.key"); writeMemoryShareKey(keyPath);
  const project = "C:\\proj";

  addMessages(dbPath, project, 5);
  const r1 = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath });
  assert.equal(r1.push.kind, "baseline", "first push is a baseline");
  assert.equal(r1.push.messages, 5, "baseline carries every row");

  addMessages(dbPath, project, 3);
  const r2 = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath });
  assert.equal(r2.push.kind, "delta", "second push is a delta");
  assert.equal(r2.push.messages, 3, "delta carries ONLY the new rows");
  assert.ok(r2.push.bytes <= r1.push.bytes, "a delta is no larger than the baseline");

  const r3 = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath });
  assert.equal(r3.push.kind, "none", "nothing new → no file written");
  assert.equal(enc(dir).length, 2, "still just baseline + one delta (empty delta not written)");
});

test("a machine that missed syncs still ends up complete (self-sufficient series)", async (t) => {
  sandboxHome(t);
  const root = tempDir(t, "zemory-ds-");
  const dir = join(root, "drive"); mkdirSync(dir);
  const A = join(root, "a.db");   // producer
  const B = join(root, "b.db");   // consumer that syncs LATE
  const keyPath = join(root, "share.key"); writeMemoryShareKey(keyPath);

  // A publishes a baseline, then two more deltas — B is offline the whole time.
  addMessages(A, "C:\\a", 4); await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: A, host: "MACHINE-A" });
  addMessages(A, "C:\\a", 2); await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: A, host: "MACHINE-A" });
  addMessages(A, "C:\\a", 6); await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: A, host: "MACHINE-A" });

  // B comes online once and must absorb the baseline AND every delta it missed.
  const rb = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: B, host: "MACHINE-B" });
  const pulled = rb.merged.filter((m) => !m.skipped);
  assert.ok(pulled.length >= 3, "B merges the baseline + both missed deltas");
  assert.equal(msgCount(B), 12, "B holds every message A ever published");
});

test("receiver dedup: a second sync with no remote change merges nothing", async (t) => {
  sandboxHome(t);
  const root = tempDir(t, "zemory-ds-");
  const dir = join(root, "drive"); mkdirSync(dir);
  const A = join(root, "a.db"), B = join(root, "b.db");
  const keyPath = join(root, "share.key"); writeMemoryShareKey(keyPath);

  addMessages(A, "C:\\a", 5); await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: A, host: "MACHINE-A" });
  const first = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: B, host: "MACHINE-B" });
  assert.equal(first.merged.filter((m) => !m.skipped).length, 1, "first B sync merges A's baseline");

  const second = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: B, host: "MACHINE-B" });
  assert.equal(second.merged.filter((m) => !m.skipped).length, 0, "nothing new to merge");
  assert.ok(second.merged.some((m) => m.skipped), "A's unchanged bundle is skipped, not re-merged");
});

test("compaction folds many deltas into one baseline without losing a row", async (t) => {
  sandboxHome(t);
  const root = tempDir(t, "zemory-ds-");
  const dir = join(root, "drive"); mkdirSync(dir);
  const A = join(root, "a.db"), B = join(root, "b.db");
  const keyPath = join(root, "share.key"); writeMemoryShareKey(keyPath);

  // DRIVE_COMPACT_AT = 12: baseline + 11 deltas = 12 files, the 13th push compacts.
  let total = 0;
  for (let i = 0; i < 13; i++) { addMessages(A, "C:\\a", 2); total += 2; await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: A, host: "MACHINE-A" }); }
  const files = enc(dir);
  assert.ok(files.length < 13, `compaction pruned old files, ${files.length} remain`);

  // A fresh machine reading only the compacted folder still gets everything.
  const rb = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: B, host: "MACHINE-B" });
  assert.equal(msgCount(B), total, "compacted baseline is a complete superset");
  assert.ok(rb.push, "B also published its own (empty) push without error");
});

test("full depth writes one self-contained snapshot and clears the delta series", async (t) => {
  sandboxHome(t);
  const root = tempDir(t, "zemory-ds-");
  const dir = join(root, "drive"); mkdirSync(dir);
  const dbPath = join(root, "memory.db");
  const keyPath = join(root, "share.key"); writeMemoryShareKey(keyPath);

  addMessages(dbPath, "C:\\p", 4);
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath });                 // lean baseline
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath, level: "full" }); // switch to full
  const files = enc(dir);
  assert.ok(files.some((f) => f.endsWith(".zemory.enc")), "a full snapshot file exists");
  assert.ok(!files.some((f) => /\.\d+\.enc$/.test(f)), "the lean delta series was cleared");
});
