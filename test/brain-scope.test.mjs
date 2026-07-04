import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { openBrain } from "../dist/brain/db.js";
import { isExcluded, laneMatches, laneKey, scopeTree, toggleLane } from "../dist/brain/scope.js";
import { search } from "../dist/brain/search.js";
import { exportBrainBundle, importBrainBundle, mergeBrainBundle, writeBrainShareKey } from "../dist/brain/share.js";
import { tempDir } from "./helpers.mjs";

// Seed a brain; message_count is set to the real count so scopeTree rolls up.
function seedBrain(dbPath, sessions) {
  const db = openBrain(dbPath);
  try {
    const insS = db.prepare(
      `INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insM = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, ?, ?, ?)");
    for (const s of sessions) {
      insS.run(s.id, s.source ?? "claude-code", s.origin ?? "local", s.project ?? "C:\\p", s.host ?? "PC", s.messages.length);
      for (const m of s.messages) insM.run(s.id, m.uuid ?? null, m.role ?? "user", m.content, m.ts ?? "2026-01-01T00:00:00Z");
    }
  } finally {
    db.close();
  }
}

test("laneMatches / isExcluded: origin/host/source, empty lane matches nothing", () => {
  const s = { origin: "web", host: "PC-A", source: "chatgpt-web" };
  assert.equal(laneMatches({ origin: "web" }, s), true);
  assert.equal(laneMatches({ origin: "local" }, s), false);
  assert.equal(laneMatches({ origin: "web", source: "chatgpt-web" }, s), true);
  assert.equal(laneMatches({ origin: "web", source: "gemini-web" }, s), false);
  assert.equal(laneMatches({ host: "PC-A" }, s), true);
  assert.equal(laneMatches({}, s), false, "an all-wildcard lane must NOT hide everything");
  assert.equal(isExcluded(s, [{ origin: "local" }, { source: "chatgpt-web" }]), true);
  assert.equal(isExcluded(s, [{ origin: "local" }]), false);
});

test("toggleLane adds then removes a lane by key (idempotent)", () => {
  let lanes = [];
  lanes = toggleLane(lanes, { source: "codex" }, true);
  assert.equal(lanes.length, 1);
  lanes = toggleLane(lanes, { source: "codex" }, true); // re-exclude same → no dup
  assert.equal(lanes.length, 1);
  lanes = toggleLane(lanes, { source: "codex" }, false); // include back
  assert.equal(lanes.length, 0);
});

test("scopeTree: Local → machine → agent, Web → platform, with counts + exclude flags", (t) => {
  const root = tempDir(t, "zemory-scope-tree-");
  const dbPath = join(root, "brain.db");
  seedBrain(dbPath, [
    { id: "a", origin: "local", host: "PC-A", source: "claude-code", messages: [{ uuid: "1", content: "x" }, { uuid: "2", content: "y" }] },
    { id: "b", origin: "local", host: "PC-A", source: "codex", messages: [{ uuid: "3", content: "z" }] },
    { id: "c", origin: "web", host: "PC-A", source: "chatgpt-web", messages: [{ uuid: "4", content: "w" }] },
  ]);

  const tree = scopeTree(dbPath, [{ origin: "local", host: "PC-A", source: "codex" }]);
  const local = tree.find((n) => n.lane.origin === "local" && n.lane.host === undefined);
  const web = tree.find((n) => n.lane.origin === "web");
  assert.ok(local && web, "both origin branches present");
  assert.equal(local.sessions, 2);
  assert.equal(local.messages, 3, "2 + 1 messages under local");
  const host = local.children.find((n) => n.label === "PC-A");
  const codex = host.children.find((n) => n.label === "codex");
  assert.equal(codex.excluded, true, "the exact excluded lane is flagged");
  assert.equal(host.children.find((n) => n.label === "claude-code").excluded, false);
  assert.equal(web.children[0].label, "chatgpt-web");
  assert.equal(web.children[0].messages, 1);
});

test("recall excludes a lane (hidden from search, still in the DB)", (t) => {
  const root = tempDir(t, "zemory-scope-recall-");
  const dbPath = join(root, "brain.db");
  seedBrain(dbPath, [
    { id: "cc", source: "claude-code", messages: [{ uuid: "1", content: "apple from claude" }] },
    { id: "cx", source: "codex", messages: [{ uuid: "2", content: "apple from codex" }] },
  ]);

  const all = search("apple", { dbPath, all: true, excludeLanes: [] });
  assert.equal(all.length, 2, "both sources hit with no exclusion");

  const scoped = search("apple", { dbPath, all: true, excludeLanes: [{ source: "codex" }] });
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].source, "claude-code", "codex lane hidden from recall");

  // Data is still physically present — exclusion is a filter, not a delete.
  const db = openBrain(dbPath);
  try {
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE content LIKE 'apple%'").get().c, 2);
  } finally {
    db.close();
  }
});

test("merge skips excluded lanes from the incoming bundle", async (t) => {
  const root = tempDir(t, "zemory-scope-merge-");
  const dbB = join(root, "b.db");
  const dbA = join(root, "a.db");
  const keyPath = join(root, "share.key");
  const bundle = join(root, "b.zemory.enc");

  seedBrain(dbB, [
    { id: "loc", origin: "local", host: "PC-B", source: "codex", messages: [{ uuid: "l1", content: "local one" }] },
    { id: "web", origin: "web", host: "PC-B", source: "chatgpt-web", messages: [{ uuid: "w1", content: "web one" }] },
  ]);
  openBrain(dbA).close(); // empty local brain
  writeBrainShareKey(keyPath);
  await exportBrainBundle({ dbPath: dbB, outPath: bundle, keyFile: keyPath });

  const r = await mergeBrainBundle({ bundlePath: bundle, dbPath: dbA, keyFile: keyPath, excludeLanes: [{ origin: "web" }] });
  assert.equal(r.sessionsAdded, 1, "only the local session merges; web lane skipped");

  const db = openBrain(dbA);
  try {
    assert.ok(db.prepare("SELECT 1 FROM sessions WHERE id='loc'").get(), "local session pulled");
    assert.equal(db.prepare("SELECT 1 FROM sessions WHERE id='web'").get(), undefined, "web session NOT pulled");
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE content='web one'").get().c, 0);
  } finally {
    db.close();
  }
});

test("export leaves excluded lanes out of the bundle", async (t) => {
  const root = tempDir(t, "zemory-scope-export-");
  const dbSrc = join(root, "src.db");
  const dbOut = join(root, "out.db");
  const keyPath = join(root, "share.key");
  const bundle = join(root, "src.zemory.enc");

  seedBrain(dbSrc, [
    { id: "loc", origin: "local", host: "PC", source: "codex", messages: [{ uuid: "l1", content: "keep me" }] },
    { id: "web", origin: "web", host: "PC", source: "chatgpt-web", messages: [{ uuid: "w1", content: "drop me" }] },
  ]);
  writeBrainShareKey(keyPath);
  await exportBrainBundle({ dbPath: dbSrc, outPath: bundle, keyFile: keyPath, excludeLanes: [{ origin: "web" }] });
  await importBrainBundle({ bundlePath: bundle, dbPath: dbOut, keyFile: keyPath });

  const db = openBrain(dbOut);
  try {
    assert.ok(db.prepare("SELECT 1 FROM sessions WHERE id='loc'").get(), "local lane exported");
    assert.equal(db.prepare("SELECT 1 FROM sessions WHERE id='web'").get(), undefined, "web lane left out of the bundle");
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE content='drop me'").get().c, 0);
    assert.equal(db.prepare("SELECT COUNT(*) c FROM messages WHERE content='keep me'").get().c, 1);
  } finally {
    db.close();
  }
});

test("laneKey is stable and field-order independent enough for toggles", () => {
  assert.equal(laneKey({ origin: "web" }), laneKey({ origin: "web" }));
  assert.notEqual(laneKey({ origin: "web" }), laneKey({ origin: "local" }));
  assert.notEqual(laneKey({ source: "codex" }), laneKey({ origin: "local", source: "codex" }));
});
