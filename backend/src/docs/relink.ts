// Relative links in markdown that moves from one folder to another (plan/28 §0q).
import { isAbsolute, relative, resolve } from "node:path";

/**
 * Markdown moved from `fromDir` to `toDir` keeps every relative link pointing at the same file: each target is resolved
 * where the text was and written again relative to where it goes. Measured 2026-08-13: 26 of 26 internal links of a
 * changelog archive were broken after a verbatim move — the file still renders, the link is still blue, and it leads
 * nowhere.
 *
 * Left alone: absolute paths, anchors, external URLs, and template placeholders (`<…>`/`{…}`).
 */
export function relinkFrom(markdown: string, fromDir: string, toDir: string, moved?: { from: string; to: string }): string {
  return markdown.replace(/\]\(([^)\s]+)\)/g, (whole, target: string) => {
    if (/^(https?:|mailto:|#|\/)/.test(target) || isAbsolute(target)) return whole;
    if (target.includes("<") || target.includes("{")) return whole;
    const [path, hash] = target.split(/(?=#)/);
    let abs = resolve(fromDir, path);
    // a target that moves together with the text (a sibling in the same moved folder) is where it lands, not where it was
    if (moved) {
      const rel = relative(resolve(moved.from), abs);
      if (!rel.startsWith("..") && !isAbsolute(rel)) abs = resolve(moved.to, rel);
    }
    const out = relative(toDir, abs).replace(/\\/g, "/") || ".";
    return `](${out}${hash ?? ""})`;
  });
}
