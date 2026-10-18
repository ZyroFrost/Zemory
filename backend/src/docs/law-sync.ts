// Rule_Gate_83_HarnessFromStore (user 2026-10-18): a repo uses the harness, it does not own it — a law, a constitution frame,
// a slot or a skill changes in the zemory store and is synced down; a repo never edits its copy. Two readings for that: the
// copies a repo edited since they were assembled (conform `harness-edited-here`), and, before a store part is edited or
// retired, every repo that carries it and in what state (`zemory impact`).
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { isFolderHarness, frontMatter, hashFiles, listParts, mainOf, parseFrom, partHash, readPartFiles, SHELVES, STORE_DIR, type Part } from "./store.js";

/** The `from:` reference of a copy, and whether its content still equals what was assembled. */
function copyState(p: Part): { from: ReturnType<typeof parseFrom>; edited: boolean } {
  const main = mainOf(p);
  const files = readPartFiles(p.dir, main);
  const from = parseFrom(String(frontMatter(files.get(main) ?? "")?.meta.from ?? ""));
  return { from, edited: Boolean(from) && hashFiles(files, main) !== from!.hash };
}

/** Copies of store parts (every shelf, carrying a `from:` line) edited in this repo since they were assembled. */
export function editedHarnessCopies(agentDir: string): string[] {
  if (!isFolderHarness(agentDir)) return [];
  return SHELVES.flatMap((shelf) => listParts(agentDir, shelf).filter((p) => copyState(p).edited).map((p) => `${shelf}/${p.folder}`));
}

export type CopyState = "current" | "behind" | "edited" | "absent";

export interface PartImpact {
  /** the store part, or null when no store part answers to the reference */
  part: Part | null;
  repos: Array<{ name: string; root: string; state: CopyState; folder?: string }>;
}

/** A store part by folder (`Skill_PBI_Mix` · `Rule_Gate_83_HarnessFromStore`), id (`Rule_83`), or a law number (`83` · `02-83`). */
export function findStorePart(ref: string, storeDir = STORE_DIR): Part | null {
  const n = /^(?:02-|Rule_)?0*(\d+)$/i.exec(ref.trim())?.[1];
  for (const shelf of SHELVES) {
    const hit = listParts(storeDir, shelf).find((p) => p.folder === ref || p.id === ref
      || (n !== undefined && new RegExp(`^Rule_[A-Za-z]+_0*${n}_`).test(p.folder)));
    if (hit) return hit;
  }
  return null;
}

/** Every repo given (folder harness) and the state of its copy of the store part `ref`. */
export function partImpact(ref: string, repos: Array<{ name: string; root: string; agent: string }>, storeDir = STORE_DIR): PartImpact {
  const part = findStorePart(ref, storeDir);
  if (!part) return { part: null, repos: [] };
  const storeHash = partHash(part.dir, part.shelf, mainOf(part));
  const out: PartImpact["repos"] = [];
  for (const r of repos) {
    if (!existsSync(r.agent) || !isFolderHarness(r.agent)) continue;
    const copy = listParts(r.agent, part.shelf).find((p) => {
      const f = copyState(p).from;
      return f !== null && basename(f.folder) === part.folder;
    });
    if (!copy) { out.push({ name: r.name, root: r.root, state: "absent" }); continue; }
    const s = copyState(copy);
    out.push({ name: r.name, root: r.root, folder: copy.folder, state: s.edited ? "edited" : s.from!.hash === storeHash ? "current" : "behind" });
  }
  return { part, repos: out };
}
