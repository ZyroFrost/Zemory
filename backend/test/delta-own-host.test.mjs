// A DELTA SHIPS ONLY WHAT THIS MACHINE ORIGINATED (user ruling 2026-10-07: "1 máy gửi, máy kia đồng ý thì ngưng… lỡ mà
// nối 3-4 máy vào group nó sẽ loop lên kinh khủng là ko dc").
// Measured that day: 29 of 377 deltas this machine exported re-shipped 2,242 messages that had come FROM the other
// machine — merged rows get fresh local ids, so `id > since` picked them up again. With three machines that is an echo.
// Here: three stores A → B → C → A, each delta built with its own `ownHost`; a message travels away from its origin
// exactly once and never comes back in anybody's delta.

import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";

import { openMemory } from "../../dist/memory/db.js";
import { exportMemoryBundle, mergeMemoryBundle, writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

function seed(dbPath, host, id, uuids) {
  const db = openMemory(dbPath);
  try {
    db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?, 'claude-code', 'local', 'C:\\p', ?, 0)").run(id, host);
    const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, 'user', ?, '2026-10-07T00:00:00Z')");
    for (const u of uuids) ins.run(id, u, `text ${u}`);
  } finally {
    db.close();
  }
}
const maxId = (dbPath) => {
  const db = openMemory(dbPath);
  try {
    return db.prepare("SELECT COALESCE(MAX(id),0) m FROM messages").get().m;
  } finally {
    db.close();
  }
};
const hostsIn = async (bundle, key, root, name) => {
  const probe = join(root, `${name}.probe.db`);
  await mergeMemoryBundle({ bundlePath: bundle, dbPath: probe, keyFile: key });
  const db = openMemory(probe);
  try {
    return db.prepare("SELECT s.host h, COUNT(m.id) n FROM messages m JOIN sessions s ON s.id = m.session_id GROUP BY 1 ORDER BY 1").all();
  } finally {
    db.close();
  }
};

test("a delta carries only the exporting machine's own sessions — merged ones never travel again", async (t) => {
  const root = tempDir(t, "zemory-delta-own-");
  const key = join(root, "share.key");
  writeMemoryShareKey(key);
  const A = join(root, "a.db"), B = join(root, "b.db");
  seed(A, "PC-A", "sa", ["a1", "a2"]);
  seed(B, "PC-B", "sb", ["b1"]);
  const wmB = maxId(B);
  // A's rows reach B by merge (they get NEW local ids on B, above B's watermark — the measured trap)
  const fromA = join(root, "a.enc");
  await exportMemoryBundle({ dbPath: A, outPath: fromA, keyFile: key, sinceMessageId: 0 });
  await mergeMemoryBundle({ bundlePath: fromA, dbPath: B, keyFile: key });
  seed(B, "PC-B", "sb2", ["b2"]); // B's own new message after the merge
  const out = join(root, "b-delta.enc");
  const d = await exportMemoryBundle({ dbPath: B, outPath: out, keyFile: key, sinceMessageId: wmB, ownHost: "PC-B" });
  assert.equal(d.rows.messages, 1, "only B's new message b2 — not A's a1/a2 that merged in above the watermark");
  assert.deepEqual(await hostsIn(out, key, root, "b"), [{ h: "PC-B", n: 1 }]);
});

test("three machines in a ring: after rounds A→B→C→A no delta re-ships anything (no echo)", async (t) => {
  const root = tempDir(t, "zemory-delta-ring-");
  const key = join(root, "share.key");
  writeMemoryShareKey(key);
  const db = { A: join(root, "a.db"), B: join(root, "b.db"), C: join(root, "c.db") };
  // each machine already holds an old row (its baseline went out long ago) ⇒ the ring runs on DELTAS, as in real life
  for (const m of ["A", "B", "C"]) seed(db[m], `PC-${m}`, `old${m}`, [`old-${m}`]);
  const wm = { A: maxId(db.A), B: maxId(db.B), C: maxId(db.C) };
  seed(db.A, "PC-A", "sa", ["a1"]);
  seed(db.B, "PC-B", "sb", ["b1"]);
  seed(db.C, "PC-C", "sc", ["c1"]);
  const ring = [["A", "B"], ["B", "C"], ["C", "A"]];
  let round = 0;
  const shipRound = async () => {
    const shipped = [];
    for (const [from, to] of ring) {
      const f = join(root, `r${round}-${from}.enc`);
      const r = await exportMemoryBundle({ dbPath: db[from], outPath: f, keyFile: key, sinceMessageId: wm[from], ownHost: `PC-${from}` });
      wm[from] = r.rows?.maxMessageId ?? wm[from];
      if (r.rows?.messages) await mergeMemoryBundle({ bundlePath: f, dbPath: db[to], keyFile: key });
      shipped.push(r.rows?.messages ?? 0);
    }
    round++;
    return shipped;
  };
  const first = await shipRound();
  assert.deepEqual(first, [1, 1, 1], "round 1: every machine ships its own one message");
  const second = await shipRound();
  assert.deepEqual(second, [0, 0, 0], "round 2: NOTHING travels — merged messages are not re-shipped (the echo is gone)");
  // and without the rule the same ring echoes: B would re-ship A's a1 to C, C would re-ship it back to A …
});

test("NEGATIVE: a store with no session under this machine's name is not filtered (copied store / fixture)", async (t) => {
  const root = tempDir(t, "zemory-delta-nofilter-");
  const key = join(root, "share.key");
  writeMemoryShareKey(key);
  const A = join(root, "a.db");
  seed(A, "SOME-OTHER-PC", "s1", ["m1"]);
  const wm = maxId(A);
  seed(A, "SOME-OTHER-PC", "s2", ["m2"]);
  const r = await exportMemoryBundle({ dbPath: A, outPath: join(root, "d.enc"), keyFile: key, sinceMessageId: wm });
  assert.equal(r.rows.messages, 1, "no session of this machine ⇒ ship as before, nothing silently dropped");
});
