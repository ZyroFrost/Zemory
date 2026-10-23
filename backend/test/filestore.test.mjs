// Attachment bytes live in the GM db (HP 18, plan/25). What is guarded here, most important first:
//  ① No byte lost: the legacy files/ folder moves back into the db with every sha256 checked.
//  ② A re-run adds nothing (a migration gets interrupted and typed again).
//  ③ A file whose content does not match its sha256 is NOT taken in - stamping a wrong byte into the db breaks it for real.
//  ④ The lanes that take files in (`created`, `picked`) write the bytes into the db, never to a folder beside it.
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { categoryOf, listFiles, collectCreated, isScratchPath, addPickedFiles, inlineFiles, openCopy, PICKED_SESSION } from "../../dist/memory/filestore.js";
import { tempDir } from "./helpers.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** A store whose attachments sit in a legacy files/ folder (blob NULL, src_path = the path there), as before HP 18. */
function seedLegacy(t, items) {
  const dir = tempDir(t, "zfs-db-");
  const root = tempDir(t, "zfs-files-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const insMsg = db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  const insAtt = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
     VALUES (?,?,?,?,?,?,'blob',?,?)`,
  );
  const insLink = db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)");
  items.forEach((it, i) => {
    const body = Buffer.from(it.body);
    const rel = `images/2026-09/${i}_${it.name}`;
    mkdirSync(join(root, "images", "2026-09"), { recursive: true });
    writeFileSync(join(root, ...rel.split("/")), it.onDisk ?? body);
    const mid = Number(insMsg.run("u" + i, "user", `[image] message ${i}`).lastInsertRowid);
    const aid = Number(insAtt.run(mid, "s1", it.name, it.mime, body.length, sha(body), rel, "2026-09-14T10:00:00Z").lastInsertRowid);
    insLink.run(mid, aid);
  });
  return { db, root };
}

test("category comes from mime, not from the name", () => {
  assert.equal(categoryOf("image/png"), "images");
  assert.equal(categoryOf("application/pdf"), "documents");
  assert.equal(categoryOf("application/zip"), "archives");
  assert.equal(categoryOf("video/mp4"), "media");
  assert.equal(categoryOf(null), "other");
});

test("inline: the legacy folder's bytes come back into the db, sha checked, src_path cleared", (t) => {
  const { db, root } = seedLegacy(t, [
    { body: "picture-one", mime: "image/png", name: "a.png" },
    { body: "a-document", mime: "application/pdf", name: "b.pdf" },
  ]);
  const r = inlineFiles({ db, root });
  assert.equal(r.moved, 2);
  assert.equal(r.failed.length, 0);
  for (const row of db.prepare("SELECT blob, src_path, sha256 FROM attachment").all()) {
    assert.ok(row.blob, "the bytes are in the db");
    assert.equal(sha(row.blob), row.sha256);
    assert.equal(row.src_path, null, "no row points into a folder any more");
  }
  db.close();
});

test("NEGATIVE: inline run twice moves nothing the second time; a dry run writes nothing", (t) => {
  const { db, root } = seedLegacy(t, [{ body: "x", mime: "image/png", name: "a.png" }]);
  assert.equal(inlineFiles({ db, root, dryRun: true }).moved, 1, "a dry run still COUNTS");
  assert.equal(db.prepare("SELECT blob FROM attachment").get().blob, null, "…and writes nothing");
  assert.equal(inlineFiles({ db, root }).moved, 1);
  const again = inlineFiles({ db, root });
  assert.equal(again.moved, 0);
  assert.equal(again.failed.length, 0, "and it is not an error");
  db.close();
});

test("NEGATIVE: a file whose content does not match its sha256 stays out, and is said", (t) => {
  const { db, root } = seedLegacy(t, [{ body: "the-real-content", onDisk: "something-else", mime: "image/png", name: "a.png" }]);
  const r = inlineFiles({ db, root });
  assert.equal(r.moved, 0);
  assert.equal(r.failed.length, 1);
  assert.match(r.failed[0].reason, /sha mismatch/);
  assert.equal(db.prepare("SELECT blob FROM attachment").get().blob, null);
  db.close();
});

test("NEGATIVE: a `ref` row keeps its source URL and counts as not fetched", (t) => {
  const dir = tempDir(t, "zfs-ref-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const mid = Number(db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1','u1','user','x')").run().lastInsertRowid);
  const aid = Number(
    db
      .prepare(
        `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
         VALUES (?,?,?,?,?,?,'ref',?,?)`,
      )
      .run(mid, "s1", null, "image/png", 444078, "a".repeat(64), "sediment://file_0000000011", "2026-09-14T10:00:00Z").lastInsertRowid,
  );
  db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)").run(mid, aid);
  assert.equal(inlineFiles({ db, root: tempDir(t, "zfs-refroot-") }).moved, 0, "a URL is not a path in the folder");
  const r = listFiles({ db });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].fetched, false);
  assert.ok(!("rel" in r.items[0]), "no file path is exposed - the bytes are in the db or nowhere");
  db.close();
});

test("open copy: the bytes are written out under the machine's folder once, then reused", (t) => {
  const { db, root } = seedLegacy(t, [{ body: "picture", mime: "image/png", name: "shot.png" }]);
  inlineFiles({ db, root });
  const row = db.prepare("SELECT sha256 FROM attachment").get();
  const dir = tempDir(t, "zfs-open-");
  const p = openCopy({ sha256: row.sha256, name: "shot.png", mime: "image/png" }, { db, dir });
  assert.ok(p && existsSync(p));
  assert.equal(readFileSync(p).toString(), "picture");
  assert.equal(openCopy({ sha256: row.sha256, name: "shot.png", mime: "image/png" }, { db, dir }), p, "the same copy next time");
  assert.equal(openCopy({ sha256: "b".repeat(64), name: null, mime: null }, { db, dir }), null, "NEGATIVE: no bytes ⇒ no path");
  db.close();
});

test("`created` lane: the file the agent WROTE goes into the db; scratch and deleted files do not", (t) => {
  const dir = tempDir(t, "zfs-cr-");
  const work = tempDir(t, "zfs-work-");
  const keep = join(work, "report.md");
  writeFileSync(keep, "# real content", "utf8");
  mkdirSync(join(work, "dist"), { recursive: true });
  const junk = join(work, "dist", "bundle.js");
  writeFileSync(junk, "build output", "utf8");
  const gone = join(work, "deleted.py");

  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','claude-code','local')").run();
  const ins = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s1',?,'assistant',?,'Write','2026-09-15T01:00:00Z')",
  );
  [keep, junk, gone].forEach((p, i) => ins.run("w" + i, JSON.stringify({ file_path: p, content: "x" })));

  // String.raw: a backslash written straight into a regex literal through a tool or shell lost its escape three times
  const sepClass = String.raw`[\\/]`;
  const onlyBuild = (x) => new RegExp(`${sepClass}(dist|node_modules)${sepClass}`, "i").test(x);
  const r = collectCreated({ db, isScratch: onlyBuild });

  assert.equal(r.added, 1, "only the real file is taken in");
  assert.equal(r.excluded, 1, "the file under dist/ is left out");
  assert.equal(r.gone, 1, "the deleted file is not taken in");
  const row = db.prepare("SELECT name, mime, src_path, blob FROM attachment").get();
  assert.equal(row.name, "report.md");
  assert.equal(row.mime, "text/markdown");
  assert.equal(row.src_path, null, "no path beside the db");
  assert.equal(row.blob.toString("utf8"), "# real content", "the bytes are in the db");
  db.close();
});

test("NEGATIVE: the `created` lane run again adds no duplicate row", (t) => {
  const dir = tempDir(t, "zfs-cr2-");
  const work = tempDir(t, "zfs-work2-");
  const f = join(work, "note.md");
  writeFileSync(f, "content", "utf8");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','claude-code','local')").run();
  db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s1','w0','assistant',?,'Write','2026-09-15T01:00:00Z')",
  ).run(JSON.stringify({ file_path: f }));
  const noScratch = () => false;
  assert.equal(collectCreated({ db, isScratch: noScratch }).added, 1);
  const second = collectCreated({ db, isScratch: noScratch });
  assert.equal(second.added, 0);
  assert.equal(second.already, 1);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM attachment").get().c, 1);
  db.close();
});

test("NEGATIVE: the scratch rule catches Windows paths (backslashes) too", () => {
  const win = ["D:", "repo", "node_modules", "pkg", "index.js"].join(String.fromCharCode(92));
  assert.equal(isScratchPath(win), true);
  assert.equal(isScratchPath("/home/u/repo/dist/bundle.js"), true);
  assert.equal(isScratchPath(["D:", "repo", "src", "app.ts"].join(String.fromCharCode(92))), false, "real source is not left out");
});

test("`picked` lane: the user's file goes into the db - no source message, dedup by sha256", (t) => {
  const dir = tempDir(t, "zpick-db-");
  const src = tempDir(t, "zpick-src-");
  const db = openMemory(join(dir, "global_memory.db"));
  const body = Buffer.from("content-the-user-added");
  const p1 = join(src, "report.pdf");
  writeFileSync(p1, body);

  const r = addPickedFiles([{ path: p1 }], { db });
  assert.equal(r.added, 1);
  assert.equal(r.bytes, body.length);
  assert.deepEqual(r.shas, [sha(body)]);

  const row = db.prepare("SELECT message_id, session_id, kind, name, mime, sha256, src_path, blob FROM attachment").get();
  assert.equal(row.message_id, 0, "the picked lane comes from no message");
  assert.equal(row.session_id, PICKED_SESSION);
  assert.equal(row.kind, "blob");
  assert.equal(row.mime, "application/pdf");
  assert.equal(row.src_path, null);
  assert.equal(row.blob.toString(), body.toString(), "the bytes are in the db");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment_link").get().n, 0);

  const listed = listFiles({ db });
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0].messageId, null);
  assert.equal(listed.items[0].fetched, true);

  const p2 = join(src, "copy.pdf");
  writeFileSync(p2, body);
  const again = addPickedFiles([{ path: p2 }], { db });
  assert.equal(again.added, 0);
  assert.equal(again.already, 1);

  writeFileSync(join(src, "empty.txt"), "");
  const bad = addPickedFiles([{ path: join(src, "missing.png") }, { path: join(src, "empty.txt") }], { db });
  assert.equal(bad.added, 0);
  assert.equal(bad.failed.length, 2);
  assert.match(bad.failed[1].reason, /empty/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment").get().n, 1);
  db.close();
});

test("NEGATIVE: the orphan sweep does not delete the `picked` lane (it never has a link)", async (t) => {
  const { pruneOrphanAttachments } = await import("../../dist/memory/attachments.js");
  const dir = tempDir(t, "zpick2-db-");
  const src = tempDir(t, "zpick2-src-");
  const dbPath = join(dir, "global_memory.db");
  const db = openMemory(dbPath);
  const p = join(src, "mine.png");
  writeFileSync(p, Buffer.from("picture-the-user-added"));
  addPickedFiles([{ path: p }], { db });
  db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, blob, created_at)
     VALUES (999, 's-dead', 'orphan.png', 'image/png', 3, 'f'||substr(hex(randomblob(32)),1,63), 'blob', x'000102', '2026-09-15T00:00:00Z')`,
  ).run();
  db.close();
  const r = pruneOrphanAttachments(dbPath, { dropUnlinked: true });
  const db2 = openMemory(dbPath);
  assert.equal(r.rows, 1);
  assert.deepEqual(db2.prepare("SELECT session_id FROM attachment").all().map((x) => x.session_id), [PICKED_SESSION]);
  db2.close();
});
