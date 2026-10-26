#!/usr/bin/env node
// Copies of the organisation's shared design in this repo (slot Design_172 · skill dev-assets-pull).
//
//   node scripts/assets_pull.mjs                     update every copy from the source
//   node scripts/assets_pull.mjs --check             exit 1 when a copy differs from the source (wire into npm run check)
//   node scripts/assets_pull.mjs --add Logo/Acme.png take one more file from the source
//   --source <dir>  the _Design folder (default: ZEMORY_DESIGN_DIR, else the first `_Design` found above the repo)
//   --dest <dir>    the repo's asset folder (default: frontend/assets)
//
// A copy is a file under <dest>/<kind>/ whose path also exists under <source>/Assets/<Kind>/. Files the source does not
// hold are the repo's own and are never touched; no list of copies is kept. The repo stays whole on its own: it commits
// its copies and never points outside itself at build or run time.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const KINDS = { Logo: "logo", Icon: "icons", Background: "backgrounds", Image: "images", Font: "fonts", Color: "color" };

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const check = args.includes("--check");
const add = flag("--add");

function repoRoot(start) {
  let cur = resolve(start);
  for (;;) {
    if (existsSync(join(cur, "docs", ".harness.json")) || existsSync(join(cur, ".git"))) return cur;
    const up = dirname(cur);
    if (up === cur) return resolve(start);
    cur = up;
  }
}

function findSource(root) {
  const given = flag("--source") ?? process.env.ZEMORY_DESIGN_DIR;
  if (given) return resolve(given);
  let cur = dirname(root);
  for (;;) {
    const cand = join(cur, "_Design");
    if (existsSync(join(cand, "Assets"))) return cand;
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  if (existsSync(dir) && statSync(dir).isDirectory()) walk(dir);
  return out;
}

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const root = repoRoot(process.cwd());
const dest = resolve(root, flag("--dest") ?? join("frontend", "assets"));
const source = findSource(root);
if (!source || !existsSync(join(source, "Assets"))) {
  console.log("assets-pull: no _Design\\Assets found above this repo (set --source or ZEMORY_DESIGN_DIR) - nothing checked");
  process.exit(0);
}

if (add) {
  const [kind, ...rest] = add.replace(/\\/g, "/").split("/");
  const sub = KINDS[kind];
  const from = join(source, "Assets", kind, ...rest);
  if (!sub || !rest.length || !existsSync(from)) {
    console.error(`assets-pull: ${add} is not a file of ${join(source, "Assets")} (kinds: ${Object.keys(KINDS).join(", ")})`);
    process.exit(2);
  }
  const to = join(dest, sub, ...rest);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`assets-pull: added ${relative(root, to).split(sep).join("/")}`);
  process.exit(0);
}

let differ = 0;
let same = 0;
for (const [kind, sub] of Object.entries(KINDS)) {
  const srcDir = join(source, "Assets", kind);
  for (const rel of filesUnder(join(dest, sub))) {
    const from = join(srcDir, ...rel.split("/"));
    if (!existsSync(from)) continue; // the repo's own file
    const to = join(dest, sub, ...rel.split("/"));
    if (sha(from) === sha(to)) {
      same++;
      continue;
    }
    differ++;
    if (check) console.log(`  differs from the source: ${sub}/${rel}`);
    else copyFileSync(from, to);
  }
}
if (check) {
  console.log(`assets-pull --check: ${same} copy(ies) match, ${differ} differ${differ ? " - run node scripts/assets_pull.mjs" : ""}`);
  process.exit(differ ? 1 : 0);
}
console.log(`assets-pull: ${differ} copy(ies) updated, ${same} already current`);
