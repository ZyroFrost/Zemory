// Stamp the standard-revision marker into every template harness file (plan/26 step ①).
//
// WHY this exists: `zemory sync` gap-fills MISSING files and never overwrites an existing one, so a
// REVISION to a standard file has no way of reaching a repo that already has it. Nothing in the
// template says which revision a file came from either, so "how far behind is this repo" is not a
// question anyone can answer today. The marker is the base a three-way merge needs.
//
//   node backend/scripts/stamp-standard.mjs [--apply]
//
// Dry-run by default: it prints what it would write and touches nothing.
//
// THE DATE IS READ FROM GIT, not from today's clock. Stamping everything with today's date would
// claim every file was revised today, which is false for all but the ones actually edited — and the
// marker is only useful if it names the revision the text really came from.
//
// 🔴 The marker carries the DATE ALONE, deliberately. `template-parity` asserts that CLAUDE.md,
// 01_CONSTITUTION, 05_TODO and 06_CHANGES are BYTE-IDENTICAL between the app and non-app trees;
// a marker carrying the bundle name would differ per tree and turn that gate red. Date-only keeps
// shared shells identical, because a shared file has one history and therefore one date.
//
// 🔴 And it goes at the END of the file, not the top. Measured before writing anything:
// 05_app/AGENTS.md last changed 2026-09-16 while 03_nonapp/AGENTS.md last changed 2026-08-31, and
// the same gate requires the ROUTER HALF of those two files — everything above the trigger table —
// to be byte-identical. A marker on line 1 lands inside that half and turns the gate red with two
// legitimately different dates. Appending keeps one rule for every file instead of an exception.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");

/** Files the revision mechanism will carry. 05_TODO and 06_CHANGES are deliberately absent:
 *  they are the target repo's own CONTENT, never overwritten (plan/26 §8). CLAUDE.md is a
 *  one-line `@AGENTS.md` import with nothing to revise. */
const FILES = ["AGENTS.md", "agent/01_CONSTITUTION.md", "agent/02_RULES.md", "agent/03_STRUCTURE.md", "agent/04_SKILLS.md"];

/** Bundle roots, including the two cowork sets that nest their harness under `nonapp/`. */
const BUNDLES = [
  "docs_template/01_cowork_basic/nonapp",
  "docs_template/02_cowork_memory/nonapp",
  "docs_template/03_nonapp",
  "docs_template/04_adapt",
  "docs_template/05_app",
];

const MARK = /<!--\s*zemory-standard:\s*(\d{4}-\d{2}-\d{2})\s*-->\s*$/;

/** Last date this file really changed, from git. Untracked or unknown ⇒ null, and we skip it
 *  rather than invent a date (plan/26 §8: no guessing a date for an unmarked file). */
function gitDate(rel) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ad", "--date=short", "--", rel], {
      cwd: REPO,
      encoding: "utf8",
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

let stamped = 0;
let already = 0;
let skipped = 0;

for (const bundle of BUNDLES) {
  for (const f of FILES) {
    const rel = `${bundle}/${f}`;
    const abs = join(REPO, rel);
    if (!existsSync(abs)) {
      console.log(`  -  missing      ${rel}`);
      skipped++;
      continue;
    }
    // Read as TEXT but detect the file's own line ending and reuse it — the repo ships both
    // (05_app is LF, 03_nonapp and 02_cowork_memory are CRLF). Writing one back as the other
    // turns a one-line insert into a whole-file diff (02_RULES §EOL).
    const raw = readFileSync(abs, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";

    const hit = MARK.exec(raw);
    const date = gitDate(rel);

    if (!date) {
      console.log(`  -  no git date ${rel}`);
      skipped++;
      continue;
    }
    // Strip any existing marker (and the blank line before it) so re-running is idempotent
    // rather than stacking a second marker under the first.
    const body = raw.replace(/(?:\r?\n)*<!--\s*zemory-standard:[^>]*-->\s*$/, "");
    if (hit && hit[1] === date) {
      already++;
      continue;
    }
    if (APPLY) writeFileSync(abs, `${body}${eol}${eol}<!-- zemory-standard: ${date} -->${eol}`);
    console.log(hit ? `  ~  ${hit[1]} -> ${date}  ${rel}` : `  +  ${date}  ${rel}`);
    stamped++;
  }
}

console.log(
  `\n${APPLY ? "stamped" : "would stamp"} ${stamped} · already current ${already} · skipped ${skipped}` +
    (APPLY ? "" : "\n(dry run — pass --apply to write)"),
);
