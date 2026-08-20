#!/usr/bin/env node
// Build zemory from a CLEAN clone — the machine gate for audit face ⑧ ("does anyone else
// get a working build, or only machines that already have everything?").
//
// Why this exists (all three already happened in this repo):
//   1. A 294.6 MB model weight slipped into a commit and blocked every push — nothing that runs
//      on an already-provisioned machine would ever notice a broken-from-scratch state.
//   2. A clean clone could not build for DAYS because `better-sqlite3` downloads its prebuilt
//      binary from `github.com`, and that host passes ~1/10 requests on this network
//      (api.github.com: 10/10). Fixed by `fetch-prebuilds.mjs`, which MUST run before
//      `npm install` — this script proves that order keeps working.
//   3. A previous "clean clone builds fine" verdict was FALSE: the probe piped through
//      `| tail -3`, which replaced the build's exit code with tail's. This script never pipes;
//      each step's exit code is checked directly.
//
// NOT part of `npm run check`: it needs the network and takes minutes, and a slow/flaky gate is
// a gate people learn to skip. Run it via `npm run check:clone` — before releases, after
// dependency changes, or when the audit's face ⑧ comes up.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "zemory-clone-check-"));
const clone = join(work, "zemory");

const steps = [
  // --local clone: proves the TRACKED tree is self-sufficient (untracked files stay behind)
  // without depending on the flaky path to github.com for the repo itself.
  ["git clone", "git", ["clone", "--local", "--no-hardlinks", REPO, clone], work],
  // Order is load-bearing: npm runs dependency install scripts BEFORE any lifecycle hook of the
  // root package, so the prebuilt cache must exist before `npm install` starts.
  ["fetch prebuilds", "node", [join("backend", "scripts", "fetch-prebuilds.mjs")], clone],
  ["npm install", "npm", ["install", "--no-audit", "--no-fund"], clone],
  ["build", "npm", ["run", "build"], clone],
];

let failed = null;
for (const [label, cmd, args, cwd] of steps) {
  const t0 = Date.now();
  process.stdout.write(`→ ${label} ... `);
  const r = spawnSync(cmd, args, { cwd, shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status === 0) {
    console.log(`ok (${secs}s)`);
  } else {
    console.log(`FAILED (${secs}s, exit ${r.status})`);
    console.log(String(r.stdout).slice(-2000));
    console.log(String(r.stderr).slice(-2000));
    failed = label;
    break;
  }
}

if (!failed) {
  // Smoke: the built CLI must actually answer, not merely compile.
  const r = spawnSync("node", [join("dist", "cli.js"), "--version"], { cwd: clone, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  const version = String(r.stdout).trim();
  if (r.status === 0 && version) console.log(`→ smoke: dist/cli.js --version → ${version}`);
  else { failed = "smoke"; console.log(`→ smoke FAILED (exit ${r.status}): ${String(r.stderr).slice(-500)}`); }
}

// Best-effort cleanup; node_modules removal on Windows can be slow but must not flip the verdict.
try { rmSync(work, { recursive: true, force: true, maxRetries: 3 }); } catch { /* leave temp behind */ }
if (existsSync(work)) console.log(`(cleanup incomplete — leftover at ${work})`);

if (failed) { console.log(`CLONE CHECK: FAILED at "${failed}"`); process.exit(1); }
console.log("CLONE CHECK: OK — a fresh machine can build this repo");
