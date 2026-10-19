// plan/29 §14b (user 2026-10-19): the workspace is the cluster; a repo's role belongs to the template it is assembled from
// (structure.json › role: name · manages · managed_by · owner rule · provides). The marker names only WHICH repo is the owner
// (the solid line) and whose services it uses by kind (the dotted lines). This reads those and checks them against the roles
// of the templates on both ends.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { readMarker } from "../core/config.js";
import { findKit, kitStructure, STORE_DIR } from "./store.js";

export interface TemplateRole {
  name: string;
  manages: string[];
  managed_by: string[];
  /** required · optional · none */
  owner: string;
  provides: string[];
  /** "local": git is the repo's backup on this machine — no remote, never pushed (Struc_Repo_Dept, user 2026-10-19) */
  git?: string;
}

/** The role of a template (`structure.json › role` of a repo structure), or null when the template declares none. */
export function templateRole(structureDir: string): TemplateRole | null {
  try {
    const r = (JSON.parse(readFileSync(join(structureDir, "structure.json"), "utf8")) as { role?: Partial<TemplateRole> }).role;
    if (!r || typeof r.name !== "string") return null;
    const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return { name: r.name, manages: list(r.manages), managed_by: list(r.managed_by), owner: String(r.owner ?? "optional"), provides: list(r.provides),
      ...(typeof r.git === "string" ? { git: r.git } : {}) };
  } catch {
    return null;
  }
}

/** The role of the repo at `root`: the role of the template of the set its marker names; null when it has no set. */
export function repoRole(root: string, storeDir = STORE_DIR): TemplateRole | null {
  const kitName = readMarker(root)?.data.kit;
  if (typeof kitName !== "string" || !kitName) return null;
  const kit = findKit(kitName, storeDir);
  const struc = kit ? kitStructure(kit, storeDir) : null;
  return struc ? templateRole(struc.dir) : null;
}

const isRepo = (d: string): boolean => existsSync(join(d, "docs", ".harness.json")) || existsSync(join(d, ".git"));

/** A repo of the workspace by folder name: up to three levels above `from`, and up to two levels below each of those. */
export function findRegionRepo(name: string, from: string): string | null {
  let up = dirname(from);
  for (let level = 0; level < 3; level++) {
    const hit = (function seek(d: string, depth: number): string | null {
      let ents: string[];
      try { ents = readdirSync(d); } catch { return null; }
      for (const e of ents) {
        if (e.startsWith(".") || e === "node_modules") continue;
        const p = join(d, e);
        try { if (!statSync(p).isDirectory()) continue; } catch { continue; }
        if (e === name && isRepo(p)) return p;
        if (depth < 2 && !isRepo(p)) { const deeper = seek(p, depth + 1); if (deeper) return deeper; }
      }
      return null;
    })(up, 0);
    if (hit) return hit;
    const next = dirname(up);
    if (next === up) break;
    up = next;
  }
  return null;
}

/** Every repo of the workspace `root` sits in: under the folder above it, and up to two levels below (the reach of findRegionRepo's first level). */
export function regionRepos(root: string): string[] {
  const out: string[] = [];
  (function seek(d: string, depth: number): void {
    let ents: string[];
    try { ents = readdirSync(d); } catch { return; }
    for (const e of ents) {
      if (e.startsWith(".") || e === "node_modules") continue;
      const p = join(d, e);
      try { if (!statSync(p).isDirectory()) continue; } catch { continue; }
      if (isRepo(p)) out.push(p);
      else if (depth < 2) seek(p, depth + 1);
    }
  })(dirname(root), 0);
  return out;
}

/**
 * The workspace declarations of the repo at `root`: `wrong` (blocking) — the owner rule of its template broken, an owner whose
 * template does not manage this one, a service from a repo whose template does not provide it, a name that is no repo, the old
 * marker key `role`; `pending` (advisory) — a repo named whose template is not assembled yet, so it cannot be judged.
 * A repo assembled from no set is not judged.
 */
export function regionLinkFindings(root: string, storeDir = STORE_DIR): { wrong: string[]; pending: string[] } {
  const wrong: string[] = [];
  const pending: string[] = [];
  const m = readMarker(root)?.data ?? {};
  if (typeof m.role === "string") wrong.push(`the marker key "role" is gone — the role comes from the template (drop the key; sync does it)`);
  const role = repoRole(root, storeDir);
  if (!role) return { wrong, pending };
  const owner = m.owner;
  const uses = (m.uses && typeof m.uses === "object" ? m.uses : {}) as Record<string, unknown>;
  const label = (at: string): string => repoRole(at, storeDir)?.name ?? "no template";
  if (Array.isArray(owner)) wrong.push("one owner only — owner is a single repo name");
  else if (typeof owner === "string" && owner) {
    if (role.owner === "none") wrong.push(`a ${role.name} has no owner (its template says owner: none)`);
    const at = findRegionRepo(owner, root);
    if (!at) wrong.push(`owner "${owner}" is no repo of this workspace`);
    else {
      const theirs = repoRole(at, storeDir);
      if (!theirs) pending.push(`owner "${owner}" is assembled from no template yet — checked once it is`);
      else if (!theirs.manages.includes(role.name)) wrong.push(`owner "${owner}" (${theirs.name}) does not manage a ${role.name}`);
    }
  } else if (role.owner === "required") {
    // no repo of the workspace holds a template that manages this role yet ⇒ the owner cannot be named: advisory until one does
    // (2026-10-19: _DB_AppCore is app-data, and no system-manager repo exists)
    const manager = regionRepos(root).some((at) => repoRole(at, storeDir)?.manages.includes(role.name));
    if (manager) wrong.push(`a ${role.name} must name its owner (a ${role.managed_by.join(" · ") || "manager"})`);
    else pending.push(`a ${role.name} names no owner — no repo of the workspace is a ${role.managed_by.join(" · ") || "manager"} yet`);
  }
  for (const [kind, target] of Object.entries(uses)) {
    if (typeof target !== "string" || !target) { wrong.push(`uses.${kind}: one repo name`); continue; }
    const at = findRegionRepo(target, root);
    if (!at) { wrong.push(`uses.${kind} "${target}" is no repo of this workspace`); continue; }
    const theirs = repoRole(at, storeDir);
    if (!theirs) pending.push(`uses.${kind} "${target}" is assembled from no template yet — checked once it is`);
    else if (!theirs.provides.includes(kind)) wrong.push(`uses.${kind} "${target}" (${label(at)}) does not provide ${kind}`);
  }
  return { wrong, pending };
}

