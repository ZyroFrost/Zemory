// The host's view of paths (util/hostpath.ts, plan/30 §3 a). Measured 2026-10-22 on the Docker trial: the container
// looked ingest records up by its mount path (/home/node/.claude/...), found none of the host-path records the native
// install had written, re-read every transcript and made 91 duplicate memory-file sessions of repos moved earlier.
// The store must key everything by the host path; only opening a file uses the mount.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { mapHostPath, parsePathMap, toHostPath, toLocalPath, unmapToHost } from "../../dist/util/hostpath.js";
import { tempDir } from "./helpers.mjs";

const MAP = parsePathMap("C:\\Users\\u\\.claude=>/home/node/.claude;D:\\Workspace=>/host/workspace;/home/u/repos=>/host/repos");

test("a container path maps back to the host path with the host's separator", () => {
  assert.equal(unmapToHost("/home/node/.claude/projects/p/s.jsonl", MAP), "C:\\Users\\u\\.claude\\projects\\p\\s.jsonl");
  assert.equal(unmapToHost("/host/workspace/Company/X", MAP), "D:\\Workspace\\Company\\X");
  assert.equal(unmapToHost("/host/repos/a/b", MAP), "/home/u/repos/a/b", "a Linux host keeps '/'");
  assert.equal(unmapToHost("/home/node/.claude-x/f", MAP), "/home/node/.claude-x/f", "NEGATIVE: not under the prefix");
  assert.equal(unmapToHost("/tmp/other", MAP), "/tmp/other", "NEGATIVE: unmapped stays as given");
});

test("both directions round-trip", () => {
  for (const h of ["C:\\Users\\u\\.claude\\projects\\p\\s.jsonl", "D:\\Workspace\\Personal\\Zemory"]) {
    assert.equal(unmapToHost(mapHostPath(h, MAP), MAP), h);
  }
});

test("without a map (the native install) both directions are the identity", () => {
  const prev = process.env.ZEMORY_PATH_MAP;
  delete process.env.ZEMORY_PATH_MAP;
  try {
    assert.equal(toHostPath("D:\\Workspace\\x"), "D:\\Workspace\\x");
    assert.equal(toLocalPath("D:\\Workspace\\x"), "D:\\Workspace\\x");
  } finally {
    if (prev !== undefined) process.env.ZEMORY_PATH_MAP = prev;
  }
});

test("a project root stored as a host path is found connected under its mount (Projects, decodeProjectDir)", async (t) => {
  const mount = tempDir(t, "zhp-ws-");
  mkdirSync(join(mount, "Company", "Repo", "docs"), { recursive: true });
  writeFileSync(join(mount, "Company", "Repo", "docs", ".harness.json"), "{}");
  const prev = process.env.ZEMORY_PATH_MAP;
  process.env.ZEMORY_PATH_MAP = `D:\\Workspace=>${mount}`;
  t.after(() => {
    if (prev === undefined) delete process.env.ZEMORY_PATH_MAP;
    else process.env.ZEMORY_PATH_MAP = prev;
  });
  const { isConnected } = await import("../../dist/core/config.js");
  assert.equal(isConnected("D:\\Workspace\\Company\\Repo"), true);
  assert.equal(isConnected("D:\\Workspace\\Company\\Gone"), false, "NEGATIVE: a root with no marker under the mount");
});

test("ingest keys a transcript by its HOST path, so a native record is found and nothing is re-read", async (t) => {
  const mount = tempDir(t, "zhp-mount-");
  const dir = join(mount, ".claude", "projects", "d--proj");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "s1.jsonl");
  const line = (uuid, role, text) => JSON.stringify({ type: role, uuid, timestamp: "2026-10-22T00:00:00.000Z", cwd: "D:\\proj", message: { role, content: text } });
  writeFileSync(file, [line("u1", "user", "hello"), line("a1", "assistant", "hi")].join("\n") + "\n");
  const prev = process.env.ZEMORY_PATH_MAP;
  process.env.ZEMORY_PATH_MAP = `C:\\Users\\u\\.claude=>${join(mount, ".claude")}`;
  t.after(() => {
    if (prev === undefined) delete process.env.ZEMORY_PATH_MAP;
    else process.env.ZEMORY_PATH_MAP = prev;
  });
  const { scanOneFile } = await import("../../dist/memory/ingest.js");
  const { openMemory } = await import("../../dist/memory/db.js");
  const dbPath = join(tempDir(t, "zhp-db-"), "m.db");
  const keys = () => {
    const db = openMemory(dbPath);
    try {
      return db.prepare("SELECT file_path FROM ingest_state").all().map((r) => r.file_path);
    } finally {
      db.close();
    }
  };
  assert.equal(scanOneFile(file, { dbPath }).newMessages, 2);
  assert.deepEqual(keys(), ["C:\\Users\\u\\.claude\\projects\\d--proj\\s1.jsonl"], "the record names the host path");
  assert.equal(scanOneFile(file, { dbPath }).newMessages, 0);
  // a lookup by the mount path would miss the host-path record and write a second one beside it
  assert.deepEqual(keys(), ["C:\\Users\\u\\.claude\\projects\\d--proj\\s1.jsonl"], "still ONE record: found by its host path");
});

// The Drive sync folder (plan/30 §3e): the config keeps the host's path, a folder name with spaces on a drive letter; the
// container opens it under /host/drive. getDriveDir is the one door every Drive reader and writer goes through.
test("the Drive folder maps to its mount and back, spaces and all; getDriveDir translates at the door", async () => {
  const { readFileSync } = await import("node:fs");
  const map = parsePathMap(String.raw`X:\Cloud Drive\Global Memory=>/host/drive;=>/nothing`);
  assert.equal(map.length, 1, "an empty host side (no Drive on this machine) drops out");
  assert.equal(mapHostPath(String.raw`X:\Cloud Drive\Global Memory\channel\a.blk`, map), "/host/drive/channel/a.blk");
  assert.equal(unmapToHost("/host/drive", map), String.raw`X:\Cloud Drive\Global Memory`);
  const src = readFileSync(new URL("../src/config/settings.ts", import.meta.url), "utf8");
  assert.match(src, /export function getDriveDir\(\): string \{\n\s+return toLocalPath\(read\(\)\.drive \?\? ""\);/);
  const ui = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /path: toHostPath\(probe\.path\)/, "the cockpit shows the host's name of the folder");
});
