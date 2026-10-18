// plan/29 §14c · Rule_Gate_85_ProposeChecked for slots: a new slot is proposed only after the slots already there were
// weighed BY PATH and BY KIND OF FILE, not by name. The machine finds the existing slots a new one overlaps — a path equal to
// one, a path inside one's folder, a file of the same kind (a dependency manifest …) — and each must be named in the new
// slot's `checked:` and in its text with what makes the new one different. Runs in the gate, so a slot written by a script
// is caught as surely as one written by hand (the 02-85 hook sees the Write tool only).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { leafOf, listParts, mainOf, mainPath, STORE_DIR, type Part } from "./store.js";
import { SHELF } from "./harness-names.js";

/** Files that play the same part under different names: one slot for the kind, its path lists the names. */
export const FILE_KINDS: Record<string, string[]> = {
  "dependency manifest": ["package.json", "pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile", "environment.yml", "go.mod", "Cargo.toml", "pom.xml", "build.gradle"],
};

const pathsOf = (p: Part): string[] => String(p.meta.path ?? "").split(/\s*[·|]\s*/).map((x) => x.trim()).filter(Boolean);
const kindOf = (path: string): string | null => {
  const name = path.replace(/\/+$/, "").split("/").pop() ?? "";
  return Object.entries(FILE_KINDS).find(([, names]) => names.includes(name))?.[0] ?? null;
};

/** How slot `a` overlaps slot `b`, or null: the same path, a path inside b's folder, or a file of the same kind. */
export function overlap(a: Part, b: Part): string | null {
  for (const pa of pathsOf(a)) {
    for (const pb of pathsOf(b)) {
      const x = pa.replace(/\/+$/, "");
      const y = pb.replace(/\/+$/, "");
      if (!x || !y || y === ".") continue;
      if (x === y) return `the same path ${pb}`;
      if (pb.endsWith("/") && x.startsWith(y + "/")) return `${pa} lies inside ${pb}`;
      const k = kindOf(pa);
      if (k && k === kindOf(pb)) return `${pa} and ${pb} are both a ${k}`;
    }
  }
  return null;
}

/** The slot folders HEAD of the store's git repository already has; null when there is no git history to ask. */
function slotsInHead(storeDir: string): Set<string> | null {
  const slotDir = `${storeDir}/02_STRUCTURE/_Slot`;
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: storeDir, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim();
    const rel = relative(top, slotDir).replace(/\\/g, "/");
    const out = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", rel], { cwd: top, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return new Set(out.split("\n").filter(Boolean).map((f) => f.slice(rel.length + 1).split("/")[0]));
  } catch {
    return null;
  }
}

/**
 * Every new slot (not in HEAD) that overlaps an existing slot without having weighed it: "<new>: overlaps <old> (<how>) —
 * <what is missing>". `isNew` overrides the git question (tests).
 */
export function slotOverlapFindings(storeDir = STORE_DIR, isNew?: (leaf: string) => boolean): string[] {
  const slots = listParts(storeDir, SHELF.structure).filter((p) => p.folder.startsWith("_Slot/"));
  const head = isNew ? null : slotsInHead(storeDir);
  const fresh = (leaf: string): boolean => (isNew ? isNew(leaf) : head !== null && !head.has(leaf));
  const out: string[] = [];
  for (const a of slots) {
    const la = leafOf(a.folder);
    if (!fresh(la)) continue;
    const checked = new Set((Array.isArray(a.meta.checked) ? a.meta.checked : String(a.meta.checked ?? "").replace(/^\[|\]$/g, "").split(",")).map((x) => String(x).trim()).filter(Boolean));
    const f = mainPath(a.dir, mainOf(a));
    const body = existsSync(f) ? readFileSync(f, "utf8").replace(/^---[\s\S]*?\n---\n/, "") : "";
    for (const b of slots) {
      if (a === b || fresh(leafOf(b.folder))) continue;
      const how = overlap(a, b);
      if (!how) continue;
      const lb = leafOf(b.folder);
      const missing = [!checked.has(lb) ? "not in checked:" : "", !body.includes(lb) ? "its text never says how it differs from " + lb : ""].filter(Boolean);
      if (missing.length) out.push(`${la}: overlaps ${lb} (${how}) — ${missing.join("; ")}. Extend ${lb} instead, or say what rule of its own the new slot has`);
    }
  }
  return out;
}

