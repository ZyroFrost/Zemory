import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { storeArtifact } from "../dist/artifacts/store.js";
import { getArtifact, listArtifacts, searchArtifact, showArtifact } from "../dist/artifacts/search.js";
import { archiveCold, removeArtifact, storeStats } from "../dist/artifacts/retention.js";

const freshDb = () => join(mkdtempSync(join(tmpdir(), "zemory-art-")), "test.db");

const SAMPLE = ["line one", "line two: AuthError here", "line three", "line four"].join("\n");

test("store then show recovers the output byte-exact", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, command: "npm test", dbPath });
  const r = showArtifact(meta.id, { dbPath });
  assert.equal(r.found, true);
  assert.equal(r.available, true);
  assert.equal(r.text, SAMPLE, "full show is byte-identical to raw");
});

test("show with a line range returns just that 1-based window", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, dbPath });
  const r = showArtifact(meta.id, { offset: 1, limit: 2, dbPath });
  assert.equal(r.text, "line two: AuthError here\nline three");
  assert.equal(r.totalLines, 4);
});

test("search finds a line within one artifact and returns its line number", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, dbPath });
  const hits = searchArtifact(meta.id, "autherror", { dbPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ordinal, 2);
  assert.match(hits[0].text, /AuthError/);
});

test("secrets are redacted in the index + command, never surfaced by search", () => {
  const dbPath = freshDb();
  const secret = "sk-ant-api03-DEADBEEFdeadbeefDEADBEEFdeadbeef0123456789abcdefAA";
  const raw = `deploy start\nANTHROPIC_API_KEY=${secret}\ndeploy ok`;
  const meta = storeArtifact({ raw, command: `export KEY=${secret}`, dbPath });
  assert.equal(meta.hasSecret, true);

  // search by the secret returns nothing (index is redacted)
  assert.equal(searchArtifact(meta.id, secret, { dbPath }).length, 0);
  // a redacted hit on the same line shows [REDACTED], not the secret
  const hits = searchArtifact(meta.id, "REDACTED", { dbPath });
  assert.ok(hits.length >= 1);
  assert.ok(!hits.some((h) => h.text.includes(secret)), "secret never appears in a search hit");
  // command stored redacted
  const row = getArtifact(meta.id, dbPath);
  assert.ok(!row.command_redacted.includes(secret));
  // raw recovery is still byte-exact (the safe box keeps the original)
  assert.equal(showArtifact(meta.id, { dbPath }).text, raw);
});

test("no-store keeps a redacted searchable index but writes no raw file", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, retentionClass: "no-store", dbPath });
  assert.equal(meta.storagePath, null);
  const r = showArtifact(meta.id, { dbPath });
  assert.equal(r.found, true);
  assert.equal(r.available, false, "no raw file for no-store");
  assert.equal(searchArtifact(meta.id, "autherror", { dbPath }).length, 1, "index still searchable");
});

const DAY = 24 * 60 * 60 * 1000;

test("archiveCold gzips a cold artifact in place; show still recovers byte-exact", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, dbPath, now: 1000 });
  assert.ok(existsSync(meta.storagePath));
  const r = archiveCold({ dbPath, now: 1000 + 30 * DAY, olderThanMs: 14 * DAY });
  assert.equal(r.archived, 1, "one cold file compressed");
  const row = getArtifact(meta.id, dbPath);
  assert.ok(row.storage_path.endsWith(".gz"), "now points at the gz file");
  assert.equal(existsSync(meta.storagePath), false, "uncompressed file replaced");
  assert.equal(showArtifact(meta.id, { dbPath }).text, SAMPLE, "recovery still byte-exact after archive");
});

test("storeStats warns over the soft quota but deletes nothing", () => {
  const dbPath = freshDb();
  storeArtifact({ raw: "A".repeat(5000), dbPath });
  process.env.ZEMORY_ARTIFACT_QUOTA_GB = "0.000000001"; // ~1 byte → definitely over
  try {
    const s = storeStats({ dbPath });
    assert.equal(s.count, 1);
    assert.equal(s.overQuota, true, "flagged for a warning");
  } finally {
    delete process.env.ZEMORY_ARTIFACT_QUOTA_GB;
  }
  assert.equal(listArtifacts({ dbPath }).length, 1, "nothing deleted by stats");
});

test("pinned artifacts are never archived (stay hot)", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, retentionClass: "pin", dbPath, now: 1000 });
  assert.equal(meta.expiresAt, null, "permanent, no expiry");
  const r = archiveCold({ dbPath, now: 1000 + 365 * DAY, olderThanMs: 0 });
  assert.equal(r.archived, 0);
  assert.ok(!getArtifact(meta.id, dbPath).storage_path.endsWith(".gz"), "pinned stays uncompressed");
});

test("removeArtifact is explicit-only deletion and removes the file", () => {
  const dbPath = freshDb();
  const meta = storeArtifact({ raw: SAMPLE, dbPath });
  assert.ok(existsSync(meta.storagePath));
  assert.equal(removeArtifact(meta.id, { dbPath }), true);
  assert.equal(getArtifact(meta.id, dbPath), undefined);
  assert.equal(existsSync(meta.storagePath), false, "file removed on explicit rm");
  assert.equal(removeArtifact("zmo_nope", { dbPath }), false);
});
