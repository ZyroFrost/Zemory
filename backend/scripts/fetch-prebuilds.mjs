#!/usr/bin/env node
// Pre-seed the prebuild-install disk cache so `npm install` never has to reach github.com.
//
// Why this exists: better-sqlite3 ships prebuilt binaries for every Node ABI, but its install
// script fetches them from `github.com/<repo>/releases/download/...`. On networks that block that
// host (measured 2026-08-13: `api.github.com` and git-over-https pass, release downloads are cut
// after ~0.15s) prebuild-install falls back to `node-gyp rebuild`, which needs a C++ toolchain —
// so a clean clone cannot be built at all.
//
// prebuild-install resolves a binary in this order (see prebuild-install/download.js):
//   1. local prebuilds dir   2. disk cache   3. network download
// This script fills (2) using the GitHub asset API, which is a different host and stays reachable.
// It runs on plain Node with no dependencies, so it works BEFORE `npm install`.
//
// Run it BEFORE `npm install` — npm executes a dependency's own install script before the root
// package's `preinstall`, so there is no lifecycle hook early enough to do this automatically.
//
// Usage:  node backend/scripts/fetch-prebuilds.mjs [--force]
// Exit code is always 0: a failure here only means `npm install` falls back to its normal path.

import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, rename, unlink } from "node:fs/promises";
import { get } from "node:https";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Packages installed through prebuild-install. Extend here if another native dep is added.
const PREBUILD_PACKAGES = [{ name: "better-sqlite3", repo: "WiseLibs/better-sqlite3" }];

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const force = process.argv.includes("--force");

/** Mirrors prebuild-install/util.js npmCache() + prebuildCache(). */
function prebuildCacheDir() {
  const env = process.env;
  const npmCache =
    env.npm_config_cache ||
    (env.APPDATA ? join(env.APPDATA, "npm-cache") : join(homedir(), ".npm"));
  return join(npmCache, "_prebuilds");
}

/** Mirrors prebuild-install/util.js cachedPrebuild() — the exact filename it will look for. */
function cachedPrebuildPath(url) {
  const digest = createHash("sha512").update(url).digest("hex").slice(0, 6);
  return join(prebuildCacheDir(), digest + "-" + basename(url).replace(/[^a-zA-Z0-9.]+/g, "-"));
}

/** Mirrors prebuild-install/util.js urlTemplate() for the default GitHub releases layout. */
function downloadUrlFor(pkg, version) {
  const file = `${pkg.name}-v${version}-node-v${process.versions.modules}-${process.platform}-${process.arch}.tar.gz`;
  return `https://github.com/${pkg.repo}/releases/download/v${version}/${file}`;
}

/** Resolve the version npm will actually install: lockfile first, manifest range as fallback. */
async function resolveVersion(name) {
  try {
    const lock = JSON.parse(await readFile(join(repoRoot, "package-lock.json"), "utf8"));
    const entry = lock.packages?.[`node_modules/${name}`];
    if (entry?.version) return entry.version;
  } catch {
    // no lockfile — fall through to the manifest
  }
  const pkgJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const range = pkgJson.dependencies?.[name] || pkgJson.devDependencies?.[name];
  const exact = range && /^[\^~]?(\d+\.\d+\.\d+)$/.exec(range);
  return exact ? exact[1] : null;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "User-Agent": "zemory-fetch-prebuilds" } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${new URL(url).host}`));
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

function requestStream(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("too many redirects"));
    const headers = { "User-Agent": "zemory-fetch-prebuilds", Accept: "application/octet-stream" };
    get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(requestStream(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${new URL(url).host}`));
      }
      resolve(res);
    }).on("error", reject);
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function seedOne(pkg) {
  const version = await resolveVersion(pkg.name);
  if (!version) {
    console.log(`[prebuilds] ${pkg.name}: cannot resolve version — skipped`);
    return false;
  }

  const url = downloadUrlFor(pkg, version);
  const assetName = basename(url);
  const cachePath = cachedPrebuildPath(url);

  if (!force && (await exists(cachePath))) {
    console.log(`[prebuilds] ${pkg.name} ${version}: already cached (${assetName})`);
    return true;
  }

  // Same asset, different host: the release API stays reachable where the download host does not.
  const release = await requestJson(
    `https://api.github.com/repos/${pkg.repo}/releases/tags/v${version}`,
  );
  const asset = release.assets?.find((a) => a.name === assetName);
  if (!asset) {
    console.log(
      `[prebuilds] ${pkg.name} ${version}: no prebuilt binary named ${assetName} — this Node (ABI ${process.versions.modules}) needs a compiler`,
    );
    return false;
  }

  await mkdir(prebuildCacheDir(), { recursive: true });
  const tempPath = `${cachePath}.${process.pid}.tmp`;
  const stream = await requestStream(
    `https://api.github.com/repos/${pkg.repo}/releases/assets/${asset.id}`,
  );
  try {
    await pipeline(stream, createWriteStream(tempPath));
    await rename(tempPath, cachePath);
  } catch (err) {
    await unlink(tempPath).catch(() => {});
    throw err;
  }

  console.log(`[prebuilds] ${pkg.name} ${version}: cached ${asset.size} bytes -> ${cachePath}`);
  return true;
}

async function main() {
  let seeded = 0;
  for (const pkg of PREBUILD_PACKAGES) {
    try {
      if (await seedOne(pkg)) seeded++;
    } catch (err) {
      // Fail-open, but never silently: a miss here surfaces later as a confusing node-gyp failure.
      console.log(`[prebuilds] ${pkg.name}: ${err.message}`);
    }
  }

  if (seeded < PREBUILD_PACKAGES.length) {
    console.log(
      "[prebuilds] not every binary was cached. `npm install` will try github.com directly; " +
        "if that host is blocked it falls back to node-gyp and needs Visual Studio Build Tools " +
        '(winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools").',
    );
  }
}

// Only act when invoked directly, so tests can import the pure helpers without touching the network.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export { PREBUILD_PACKAGES, cachedPrebuildPath, downloadUrlFor, prebuildCacheDir };
