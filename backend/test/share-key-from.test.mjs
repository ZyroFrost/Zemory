// `zemory memory key set --from <file>`: the key of another install on this machine (native → Docker). zemory reads the
// file itself; the output carries the fingerprint, never the key.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tempDir } from "./helpers.mjs";

const CLI = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));

test("key set --from copies the key file into this install's store and prints only its fingerprint", (t) => {
  const store = tempDir(t, "zemory-keyfrom-");
  const src = join(tempDir(t, "zemory-keysrc-"), "share.key");
  const key = "test-share-key-0123456789abcdef0123456789abcdef";
  writeFileSync(src, key + "\n");
  const env = { ...process.env, GLOBAL_MEMORY_DB: join(store, "global_memory.db") };
  delete env.ZEMORY_SHARE_KEY;
  const r = spawnSync(process.execPath, [CLI, "memory", "key", "set", "--from", src], { env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /fingerprint: [0-9a-f]{8}/);
  assert.ok(!(r.stdout + r.stderr).includes(key), "NEGATIVE: the key itself in the output");
  assert.ok(existsSync(join(store, "share.key")));
  assert.equal(readFileSync(join(store, "share.key"), "utf8").trim(), key);
  const bad = spawnSync(process.execPath, [CLI, "memory", "key", "set", "--from", join(store, "missing.key")], { env, encoding: "utf8" });
  assert.equal(bad.status, 1, "a missing file fails, it does not wait on stdin");
});
