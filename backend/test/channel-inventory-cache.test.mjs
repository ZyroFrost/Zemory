// The channel's block inventory survives a daemon restart (memory/channel/blocks.ts). Rebuilt from nothing at every start
// it read 64 KB of each of 4,243 blocks on the event loop - 11.6 s with the cockpit silent (profiled 2026-10-22). The cache
// is keyed by (size, mtime) per container and lives in the machine dir; a temporary channel folder never touches it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

const DIST = new URL("../../dist/", import.meta.url).href;
function child(store, body) {
  const code = `const { appendReceivedBlock, inventoryIds } = await import(${JSON.stringify(DIST + "memory/channel/blocks.js")});\n${body}`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    env: { ...process.env, GLOBAL_MEMORY_DB: join(store, "global_memory.db") }, encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
const bundle = (id) => `Buffer.concat([Buffer.from("ZEMORY-TEST-BUNDLE\\n" + JSON.stringify({ kdf: { salt: "${id}" } }) + "\\n"), Buffer.alloc(2048, 7)])`;

test("the inventory of this store's channel is read back from disk after a restart", (t) => {
  const store = tempDir(t, "zemory-invcache-");
  const channel = join(store, "channel");
  assert.equal(child(store, `await appendReceivedBlock(${JSON.stringify(channel)}, ${bundle("aaaa")}); console.log(JSON.stringify(inventoryIds(${JSON.stringify(channel)})));`), '["aaaa"]');
  const cache = join(store, "channel-inventory.json");
  assert.ok(existsSync(cache), "written to the machine dir");
  // the block untouched, only the cache file changed: a restart that answers "zzzz" read the cache from disk (no block
  // holds that id); one that rebuilt would say "aaaa"
  writeFileSync(cache, readFileSync(cache, "utf8").replace('"id": "aaaa"', '"id": "zzzz"'));
  assert.equal(child(store, `console.log(JSON.stringify(inventoryIds(${JSON.stringify(channel)})));`), '["zzzz"]', "the restart reused the disk cache");
  // a container that grew is re-read: the cache only stands while (size, mtime) do
  assert.equal(child(store, `await appendReceivedBlock(${JSON.stringify(channel)}, ${bundle("dddd")}); console.log(JSON.stringify(inventoryIds(${JSON.stringify(channel)}).sort()));`), '["aaaa","dddd"]');
});

test("NEGATIVE: a channel folder that is not this store's leaves no cache behind", (t) => {
  const store = tempDir(t, "zemory-invcache-");
  const other = join(tempDir(t, "zemory-invother-"), "channel");
  assert.equal(child(store, `await appendReceivedBlock(${JSON.stringify(other)}, ${bundle("cccc")}); console.log(JSON.stringify(inventoryIds(${JSON.stringify(other)})));`), '["cccc"]');
  assert.ok(!existsSync(join(store, "channel-inventory.json")));
});
