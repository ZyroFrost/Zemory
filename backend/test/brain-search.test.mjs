import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openBrain } from "../../dist/brain/db.js";
import { search } from "../../dist/brain/search.js";
import { tempDir } from "./helpers.mjs";

test("project search applies scope before the global candidate limit", (t) => {
  const root = tempDir(t, "zemory-search-");
  const dbPath = join(root, "brain.db");
  const db = openBrain(dbPath);
  try {
    const addSession = db.prepare(
      "INSERT INTO sessions (id, source, project_root, message_count) VALUES (?, 'test', ?, 1)",
    );
    const addMessage = db.prepare(
      "INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, 'user', ?, ?)",
    );
    for (let i = 0; i < 70; i++) {
      addSession.run(`other-${i}`, "C:\\other");
      addMessage.run(`other-${i}`, `other-message-${i}`, "shared needle", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`);
    }
    addSession.run("target", "C:\\target");
    addMessage.run("target", "target-message", "shared needle target", "2026-01-02T00:00:00Z");
  } finally {
    db.close();
  }

  const hits = search("shared needle", { project: "C:/target", dbPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "target");
});
