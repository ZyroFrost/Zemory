// plan/26 — carry a standard REVISION into a repo that already has the file.
//
// The gap this fills: `zemory sync` gap-fills MISSING files and never overwrites an existing one
// (adopt.ts), and `/harness-updates` counts missing files rather than comparing content. So a repo
// that adopted the harness in July keeps July's text forever, and nothing ever says so. Measured
// 2026-09-18 across 18 linked repos: nine are SHORTER than the current template (one by 63 lines)
// and four are LONGER because someone added their own sections — which is exactly why a blind
// overwrite is not an option.
//
// This module only ever READS. Writing is a separate step with its own permission gate.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { templateDir } from "./adopt.js";
import { harnessPathsAt } from "../core/config.js";
import { projectProfile, selfRepoRoot } from "../projects.js";

/** Files the revision mechanism carries. `05_TODO`/`06_CHANGES` are the target repo's own CONTENT
 *  and are never touched (plan/26 §8); `CLAUDE.md` is a one-line import with nothing to revise. */
export const CARRIED = ["AGENTS.md", "01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"] as const;

const MARK = /<!--\s*zemory-standard:\s*(\d{4}-\d{2}-\d{2})\s*-->\s*$/;

/** The revision stamp a file carries, or null when it predates stamping. */
export function stampOf(text: string): string | null {
  const m = MARK.exec(text);
  return m ? m[1] : null;
}

export type FileVerdict = {
  file: string;
  /** current — repo already on the template's revision
   *  clean   — repo file matches the template AT ITS OWN STAMP, so replacing is lossless
   *  local   — repo edited the file; a merge is needed, not a replace
   *  unknown — no stamp, or the base cannot be recovered ⇒ propose only, never write
   *  absent  — the repo does not have this file at all (that is `sync`'s job, not this one) */
  verdict: "current" | "clean" | "local" | "unknown" | "absent";
  repoStamp: string | null;
  tplStamp: string | null;
  /** lines the repo changed away from its own base (only meaningful for `local`) */
  localLines?: number;
  /** lines the standard changed since the repo's base */
  standardLines?: number;
  reason?: string;
};

/** Where a carried file sits inside a harness. AGENTS.md is at the repo root; the rest under agent/. */
function repoPathOf(root: string, file: string): string {
  return file === "AGENTS.md" ? join(root, "AGENTS.md") : join(harnessPathsAt(root).agent, file);
}

function tplPathOf(profile: "app" | "non-app", file: string): string {
  const base = templateDir(profile);
  return file === "AGENTS.md" ? join(base, "AGENTS.md") : join(base, "agent", file);
}

/**
 * The template file as it stood on `date`, read out of zemory's OWN git history.
 *
 * This is the BASE of the three-way comparison, and it is the whole reason the stamp exists: without
 * it there is no way to tell "the repo edited this" from "the standard moved on". Returns null when
 * git cannot answer — no guessing (plan/26 §8).
 */
export function templateAt(profile: "app" | "non-app", file: string, date: string): string | null {
  const self = selfRepoRoot();
  if (!self) return null;
  const rel = (file === "AGENTS.md"
    ? join("docs_template", profile === "non-app" ? "03_nonapp" : "05_app", "AGENTS.md")
    : join("docs_template", profile === "non-app" ? "03_nonapp" : "05_app", "agent", file)
  ).replace(/\\/g, "/");
  try {
    const rev = execFileSync("git", ["rev-list", "-1", `--before=${date}T23:59:59`, "HEAD", "--", rel], {
      cwd: self,
      encoding: "utf8",
    }).trim();
    if (!rev) return null;
    return execFileSync("git", ["show", `${rev}:${rel}`], { cwd: self, encoding: "utf8", maxBuffer: 8 << 20 });
  } catch {
    return null;
  }
}

/**
 * Compare ignoring the stamp, the line endings, and trailing blank lines — none of the three is a
 * content difference.
 *
 * 🔴 The trailing-blank rule is not tidiness, it is the difference between the safe class being
 * reachable and not. The stamper appends `\n\n<!-- … -->\n`, and stripping that marker greedily eats
 * the file's own final newline too: measured on a file that was otherwise byte-identical to its base,
 * 321 lines against 322, one phantom line, so EVERY stamped file would have been read as "the repo
 * edited this" and `clean` — the one class safe to replace wholesale — could never occur.
 */
export function contentLines(text: string): string[] {
  const lines = text.replace(/(?:\r?\n)*<!--\s*zemory-standard:[^>]*-->\s*$/, "").split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** How many lines differ, counted as a plain set difference. Enough to size a change for a REPORT;
 *  the apply step needs real hunks, and that is built there rather than guessed here. */
function changedLines(a: string[], b: string[]): number {
  const bag = new Map<string, number>();
  for (const l of a) bag.set(l, (bag.get(l) ?? 0) + 1);
  let diff = 0;
  for (const l of b) {
    const n = bag.get(l) ?? 0;
    if (n > 0) bag.set(l, n - 1);
    else diff++;
  }
  for (const n of bag.values()) diff += n;
  return diff;
}

/** Read-only verdict for every carried file of one repo. */
export function standardDiff(root: string): { profile: "app" | "non-app"; files: FileVerdict[] } {
  const profile = projectProfile(root);
  const files: FileVerdict[] = [];

  for (const file of CARRIED) {
    const rp = repoPathOf(root, file);
    const tp = tplPathOf(profile, file);
    if (!existsSync(rp)) {
      files.push({ file, verdict: "absent", repoStamp: null, tplStamp: null, reason: "zemory sync sẽ bù file này" });
      continue;
    }
    const mine = readFileSync(rp, "utf8");
    const theirs = existsSync(tp) ? readFileSync(tp, "utf8") : null;
    const repoStamp = stampOf(mine);
    const tplStamp = theirs ? stampOf(theirs) : null;

    if (!theirs) {
      files.push({ file, verdict: "unknown", repoStamp, tplStamp: null, reason: "bộ mẫu không có file này" });
      continue;
    }
    if (repoStamp && tplStamp && repoStamp === tplStamp) {
      files.push({ file, verdict: "current", repoStamp, tplStamp });
      continue;
    }
    if (!repoStamp) {
      files.push({ file, verdict: "unknown", repoStamp: null, tplStamp, reason: "chưa có dấu bản chuẩn" });
      continue;
    }
    const base = templateAt(profile, file, repoStamp);
    if (base === null) {
      files.push({ file, verdict: "unknown", repoStamp, tplStamp, reason: `không lấy được bản gốc ${repoStamp} từ git` });
      continue;
    }
    const mineL = contentLines(mine);
    const baseL = contentLines(base);
    const theirsL = contentLines(theirs);
    const local = changedLines(baseL, mineL);
    const moved = changedLines(baseL, theirsL);
    files.push({
      file,
      verdict: local === 0 ? "clean" : "local",
      repoStamp,
      tplStamp,
      localLines: local,
      standardLines: moved,
    });
  }
  return { profile, files };
}
