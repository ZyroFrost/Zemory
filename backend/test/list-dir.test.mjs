// listDir takes each entry's kind from readdir instead of one stat per entry (a Docker mount of a Windows drive pays a
// round trip per stat: 66.6 s -> 4.8 s on one repo). It must answer exactly what the stat walk answered.
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tempDir } from "./helpers.mjs";

const { listDir } = await import("../../dist/util/list-dir.js");
const HERE = dirname(fileURLToPath(import.meta.url));

test("a folder, a file, a link to a folder (followed) and a broken link (left out)", (t) => {
  const root = tempDir(t, "zemory-listdir-");
  mkdirSync(join(root, "sub"));
  writeFileSync(join(root, "a.ts"), "x");
  symlinkSync(join(root, "sub"), join(root, "linked"), "junction");
  symlinkSync(join(root, "gone"), join(root, "broken"), "junction");
  const got = Object.fromEntries(listDir(root).map((e) => [e.name, e.isDir]));
  assert.deepEqual(got, { "a.ts": false, linked: true, sub: true });
  assert.equal(listDir(join(root, "missing")), null);
});

test("the same kinds as one stat per entry, over the whole backend tree", () => {
  const bad = [];
  let n = 0;
  const walk = (dir) => {
    const mine = listDir(dir);
    const names = readdirSync(dir);
    assert.deepEqual(mine.map((e) => e.name), names, `${dir}: same entries in the same order`);
    for (const e of mine) {
      n++;
      if (statSync(e.abs).isDirectory() !== e.isDir) bad.push(e.abs);
      if (e.isDir && e.name !== "node_modules") walk(e.abs);
    }
  };
  walk(join(HERE, ".."));
  assert.ok(n > 300, `walked ${n} entries`);
  assert.deepEqual(bad, []);
});
