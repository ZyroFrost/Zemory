// 02-23: the docs index stores paths with the OS separator (`docs\agent\05_TODO.md` on Windows) and every lookup joins with
// `join`. A "tidy-up" to posix once made `plan ls` report an empty index while the index was full, and the next reindex
// duplicated every doc row. This pins both halves through the real CLI on a temp repo with an isolated store: the rows
// carry path.sep, a second reindex adds no row, and `plan ls` finds the plans.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");

test("02-23: index rows use the OS separator, a second reindex duplicates nothing, and plan ls finds the plans", (t) => {
  const dir = tempDir(t, "zemory-sep-");
  const root = join(dir, "proj");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ layout: "app", docs: "docs/agent" }));
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# TODO\n\n## A\n- [ ] x\n");
  writeFileSync(join(root, "docs", "plan", "01_alpha.md"), "# Alpha\n\n## Goal\ntext\n");
  const db = join(dir, "store", "gm.db");
  const run = (...a) => spawnSync(process.execPath, [cli, ...a], { cwd: root, encoding: "utf8", env: { ...process.env, GLOBAL_MEMORY_DB: db }, timeout: 120_000 });
  assert.equal(run("reindex").status, 0);
  const rows = () => {
    const m = openMemory(db);
    try { return m.prepare("SELECT path FROM doc").all().map((r) => r.path); } finally { m.close(); }
  };
  const first = rows();
  const nested = first.filter((p) => p.includes("05_TODO") || p.includes("01_alpha"));
  assert.ok(nested.length >= 2, `indexed: ${first.join(" · ")}`);
  for (const p of nested) assert.ok(p.includes(sep), `${p} must carry the OS separator "${sep}"`);
  if (sep === "\\") for (const p of nested) assert.ok(!p.includes("/"), `${p} mixes in posix separators`);
  assert.equal(run("reindex").status, 0);
  assert.equal(rows().length, first.length, "a second reindex must not duplicate doc rows");
  assert.match(run("plan", "ls", join("docs", "plan", "01_alpha.md")).stdout, /Goal/, "plan ls must find the sections the index holds — the lookup joins with the OS separator");
});
