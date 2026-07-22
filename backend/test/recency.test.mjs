import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { recencyFactor, blendRecency } from "../../dist/memory/recency.js";
import { search } from "../../dist/memory/search.js";
import { tempDir } from "./helpers.mjs";

const NOW = Date.parse("2026-07-02T00:00:00Z");
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

test("recencyFactor: 1 now, ~0.5 at one half-life, floored for ancient, neutral for unknown", () => {
  assert.equal(recencyFactor(daysAgo(0), NOW), 1);
  const half = recencyFactor(daysAgo(30), NOW); // default half-life = 30d
  assert.ok(half > 0.45 && half < 0.55, `half-life ~0.5, got ${half}`);
  assert.equal(recencyFactor(daysAgo(2000), NOW), 0.15, "ancient hits the floor");
  assert.equal(recencyFactor(null, NOW), 0.5, "unknown age is neutral");
  assert.equal(recencyFactor(daysAgo(-10), NOW), 1, "future clamps to 1");
});

test("blendRecency: fresher item overtakes a more-relevant older one; disabled = untouched", () => {
  // items already in RELEVANCE order: old is #0 (more relevant), recent is #1.
  const items = [
    { id: "old", ts: daysAgo(120) },
    { id: "recent", ts: daysAgo(1) },
  ];
  const on = blendRecency(items, (x) => x.ts, true, NOW);
  assert.equal(on[0].id, "recent", "recent relevant item rises above stale one");
  const off = blendRecency(items, (x) => x.ts, false, NOW);
  assert.equal(off[0].id, "old", "disabled leaves relevance order intact");
});

test("blendRecency: a barely-relevant deep-tail recent item does NOT leap over the top hit", () => {
  const items = [{ id: "top", ts: daysAgo(120) }];
  for (let i = 1; i < 60; i++) items.push({ id: `mid${i}`, ts: daysAgo(200) });
  items.push({ id: "tailRecent", ts: daysAgo(0) }); // position 60, fresh
  const out = blendRecency(items, (x) => x.ts, true, NOW);
  assert.equal(out[0].id, "top", "top relevance (even if old) beats a fresh deep-tail item");
});

test("search(): recency default ON ranks the fresher relevant message first", (t) => {
  const root = tempDir(t, "zemory-recency-");
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  const ins = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)",
  );
  const mkSession = (id, ts) => {
    db.prepare("INSERT INTO sessions (id, source, project_root, host, message_count) VALUES (?,?,?,?,1)").run(id, "claude-code", "C:\\p", "PC");
    ins.run(id, `${id}-u`, "user", "zephyrx pipeline configuration detail", ts);
    db.prepare("UPDATE sessions SET started_at=?, ended_at=? WHERE id=?").run(ts, ts, id);
  };
  // Both messages are equally relevant (same term); only recency differs.
  mkSession("older", daysAgo(300));
  mkSession("fresher", daysAgo(1));
  db.close();

  const on = search("zephyrx", { dbPath, all: true });
  assert.equal(on[0].sessionId, "fresher", "recency-on surfaces the fresher session first");

  const off = search("zephyrx", { dbPath, all: true, recency: false });
  // With recency off it is pure relevance (a tie here) — just assert both still return the hits.
  assert.equal(on.length, 2);
  assert.equal(off.length, 2);
});
