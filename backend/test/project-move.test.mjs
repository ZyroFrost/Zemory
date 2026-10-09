// `zemory project move` (user 2026-10-09: eight repos into Project\Company\Sasin\ — "phải dời toàn bộ và có đầy đủ có
// luôn session chat cũ, ko được thiếu sót gì"). Each case is one thing that would silently be lost or duplicated:
// the session folder Claude Code keys by an encoded path, the ingest ledger keyed by that folder (or every transcript is
// re-read), curated-memory note ids built from it (or every note is ingested twice), the per-folder Claude settings.
// The negatives keep a sibling repo, another machine's sessions and the historical cwd untouched.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { projectMove } from "../../dist/memory/projectmove.js";
import { encodeProjectDir } from "../../dist/memory/adapters/claudemem.js";
import { tempDir } from "./helpers.mjs";

const H = "TESTHOST";

function setup(t) {
  const base = tempDir(t, "zemory-pm-");
  const from = join(base, "Company", "Hub");
  const sibling = join(base, "Company", "Hub2"); // shares the prefix "Hub" — must never move
  const to = join(base, "Company", "Sasin", "Hub");
  mkdirSync(join(from, "docs"), { recursive: true });
  writeFileSync(join(from, "docs", "x.md"), "x\n");
  mkdirSync(sibling, { recursive: true });
  const claudeHome = join(base, "claude");
  // Claude Code spells the folder from the cwd it saw: lower-case drive letter
  const enc = encodeProjectDir(from);
  const oldEnc = enc[0].toLowerCase() + enc.slice(1);
  const slug = join(claudeHome, "projects", oldEnc);
  mkdirSync(join(slug, "memory"), { recursive: true });
  writeFileSync(join(slug, "s1.jsonl"), "{}\n");
  writeFileSync(join(slug, "memory", "note-a.md"), "a\n");
  const claudeJson = join(base, "claude.json");
  const fwd = (p) => p.replace(/\\/g, "/").replace(/^([A-Z]):/, (m, d) => d.toLowerCase() + ":");
  writeFileSync(claudeJson, JSON.stringify({ projects: { [fwd(from)]: { trust: true }, [fwd(sibling)]: { trust: true } } }, null, 2) + "\n");
  const statePath = join(base, "paths-state.json");
  writeFileSync(statePath, JSON.stringify({ version: 1, projects: { [from.toLowerCase()]: { baseline: ["a"] }, [sibling.toLowerCase()]: { baseline: [] } } }));
  const reg = join(base, "projects.json");
  writeFileSync(reg, JSON.stringify({ version: 2, projects: [{ root: from, pinned: true }, { root: sibling }] }));
  process.env.ZEMORY_REGISTRY_FILE = reg;
  t.after(() => delete process.env.ZEMORY_REGISTRY_FILE);

  const dbPath = join(base, "m.db");
  const db = openMemory(dbPath);
  const ins = db.prepare("INSERT INTO sessions (id, source, project_root, project_pinned, cwd, host, message_count) VALUES (?, ?, ?, 0, ?, ?, 1)");
  ins.run("s-own", "claude-code", from, from, H);
  ins.run("s-other-host", "claude-code", from, from, "OTHER");
  ins.run("s-sibling", "claude-code", sibling, sibling, H);
  const noteId = `claude-memory-${H}-${oldEnc}-note-a`;
  ins.run(noteId, "claude-code-memory", from, null, H);
  db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES (?, 'note-a', 'memory', 'a')").run(noteId);
  db.prepare("INSERT INTO session_digest (session_id, meta) VALUES (?, ?)").run("s-own", JSON.stringify({ project_root: from, host: H }));
  db.prepare("INSERT INTO session_digest (session_id, meta) VALUES (?, ?)").run(noteId, JSON.stringify({ project_root: from }));
  db.prepare("INSERT INTO doc (project_root, path) VALUES (?, 'docs/x.md')").run(from);
  db.prepare("INSERT INTO doc (project_root, path) VALUES (?, 'docs/x.md')").run(sibling);
  db.prepare("INSERT INTO changelog (project_root, title) VALUES (?, 't')").run(from);
  db.prepare("INSERT INTO attachment (message_id, session_id, sha256, src_path) VALUES (1, 's-own', 'h', ?)").run(join(from, "docs", "shot.png"));
  db.prepare("INSERT INTO attachment (message_id, session_id, sha256, src_path) VALUES (1, 's-sibling', 'h2', ?)").run(join(sibling, "a.png"));
  const st = db.prepare("INSERT INTO ingest_state (file_path, source, session_id, size, mtime_ms, last_line) VALUES (?, ?, ?, 1, 1, 9)");
  st.run(join(slug, "s1.jsonl"), "claude-code", "s1");
  st.run(join(slug, "memory", "note-a.md"), "claude-code-memory", "multi:1");
  db.close();
  return { base, from, to, sibling, claudeHome, claudeJson, statePath, reg, dbPath, oldEnc, noteId, fwd,
    opts: (apply) => ({ apply, dbPath, host: H, claudeHome, claudeJson, pathsStateFile: statePath }) };
}

const q = (dbPath, sql, ...a) => {
  const db = openMemory(dbPath);
  try { return db.prepare(sql).all(...a); } finally { db.close(); }
};

test("the move carries the folder, the Claude session folder, the store, the registry and the settings — and only them", (t) => {
  const s = setup(t);
  const r = projectMove(s.from, s.to, s.opts(true));
  assert.deepEqual(r.blockers, []);
  assert.ok(!existsSync(s.from) && existsSync(join(s.to, "docs", "x.md")), "the folder itself");
  const expectedEnc = encodeProjectDir(s.to)[0].toLowerCase() + encodeProjectDir(s.to).slice(1); // same lower-case drive style
  assert.ok(existsSync(join(s.claudeHome, "projects", expectedEnc, "s1.jsonl")), "Claude Code's session folder");

  const rows = Object.fromEntries(q(s.dbPath, "SELECT id, project_root, project_pinned, cwd FROM sessions").map((x) => [x.id, x]));
  assert.equal(rows["s-own"].project_root, s.to);
  assert.equal(rows["s-own"].project_pinned, 1, "pinned, or the next scan puts it back from cwd");
  assert.equal(rows["s-own"].cwd, s.from, "cwd is history — untouched");
  assert.equal(rows["s-other-host"].project_root, s.from, "another machine keeps its own folders");
  assert.equal(rows["s-sibling"].project_root, s.sibling, "a sibling sharing the prefix never moves");

  const noteNew = `claude-memory-${H}-${expectedEnc}-note-a`;
  assert.ok(rows[noteNew] && !rows[s.noteId], "a curated-memory note keeps ONE id — the one the next scan computes");
  assert.equal(q(s.dbPath, "SELECT COUNT(*) AS n FROM messages WHERE session_id = ?", noteNew)[0].n, 1, "its message follows");
  assert.equal(q(s.dbPath, "SELECT COUNT(*) AS n FROM session_digest WHERE session_id = ?", noteNew)[0].n, 1, "its digest follows");
  assert.match(q(s.dbPath, "SELECT meta FROM session_digest WHERE session_id = 's-own'")[0].meta, new RegExp(JSON.stringify(s.to).slice(1, -1).replace(/\\/g, "\\\\")));

  assert.deepEqual(q(s.dbPath, "SELECT project_root AS r FROM doc ORDER BY r").map((x) => x.r).sort(), [s.sibling, s.to].sort());
  assert.equal(q(s.dbPath, "SELECT project_root AS r FROM changelog")[0].r, s.to);
  const att = q(s.dbPath, "SELECT session_id, src_path FROM attachment ORDER BY id");
  assert.equal(att[0].src_path, join(s.to, "docs", "shot.png"));
  assert.equal(att[1].src_path, join(s.sibling, "a.png"));
  const states = q(s.dbPath, "SELECT file_path FROM ingest_state ORDER BY file_path").map((x) => x.file_path);
  assert.ok(states.every((p) => p.startsWith(join(s.claudeHome, "projects", expectedEnc) + "\\")), "the ingest ledger follows, or every transcript is re-read: " + states.join(" · "));

  const cj = JSON.parse(readFileSync(s.claudeJson, "utf8")).projects;
  assert.ok(cj[s.fwd(s.to)] && !cj[s.fwd(s.from)] && cj[s.fwd(s.sibling)], "Claude settings key renamed in its own spelling; the sibling's kept");
  const reg = JSON.parse(readFileSync(s.reg, "utf8")).projects;
  assert.deepEqual(reg.map((e) => [e.root, !!e.pinned]), [[s.to, true], [s.sibling, false]], "registry entry follows, pin kept");
  const ps = JSON.parse(readFileSync(s.statePath, "utf8")).projects;
  assert.ok(ps[s.to.toLowerCase()] && !ps[s.from.toLowerCase()] && ps[s.sibling.toLowerCase()]);
});

test("a dry run counts and changes NOTHING", (t) => {
  const s = setup(t);
  const before = q(s.dbPath, "SELECT id, project_root FROM sessions ORDER BY id");
  const r = projectMove(s.from, s.to, s.opts(false));
  const n = Object.fromEntries(r.steps.map((x) => [x.what, x.n]));
  assert.equal(n["sessions.project_root (this host, pinned)"], 2, "own session + the note");
  assert.equal(n["ingest_state.file_path (claude session folder)"], 2);
  assert.equal(n["curated-memory note ids"], 1);
  assert.equal(n["~/.claude.json projects"], 1);
  assert.ok(existsSync(s.from) && !existsSync(s.to));
  assert.deepEqual(q(s.dbPath, "SELECT id, project_root FROM sessions ORDER BY id"), before);
  assert.ok(JSON.parse(readFileSync(s.claudeJson, "utf8")).projects[s.fwd(s.from)]);
});

test("a run stopped half way can be run again — and a finished one finds nothing left", (t) => {
  const s = setup(t);
  projectMove(s.from, s.to, s.opts(true));
  const again = projectMove(s.from, s.to, s.opts(true));
  assert.deepEqual(again.blockers, [], "source gone + target there = already moved, not an error");
  assert.deepEqual(again.steps.filter((x) => x.n).map((x) => x.what), [], "nothing left to change");
});

test("NEGATIVE: an existing target blocks the move and nothing is written", (t) => {
  const s = setup(t);
  mkdirSync(s.to, { recursive: true });
  const r = projectMove(s.from, s.to, s.opts(true));
  assert.match(r.blockers.join(" "), /target already exists/);
  assert.equal(q(s.dbPath, "SELECT project_root AS r FROM sessions WHERE id = 's-own'")[0].r, s.from);
  assert.ok(existsSync(join(s.claudeHome, "projects", s.oldEnc)));
});
