// Struc_Region_Workspace (user 2026-10-18): every repo of a workspace says in its marker which role it holds, who its one
// owner is (the solid line) and whose services it uses by kind (the dotted lines). HS keeps the roles; the repo names stay
// in the markers. This reads those declarations and checks them against the roles HS declares.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { readMarker } from "../core/config.js";
import { STORE_DIR } from "./store.js";

export interface RegionRole { manages: string[]; provides: string[] }

/** The roles HS declares (Struc_Region_Workspace/structure.json › roles); empty when the store has none. */
export function regionRoles(storeDir = STORE_DIR): Record<string, RegionRole> {
  try {
    const j = JSON.parse(readFileSync(join(storeDir, "02_STRUCTURE", "Struc_Region_Workspace", "structure.json"), "utf8")) as { roles?: Record<string, RegionRole> };
    return j.roles ?? {};
  } catch {
    return {};
  }
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

const roleOf = (root: string): string => String(readMarker(root)?.data.role ?? "");

/** Wrong region declarations of the repo at `root` (blocking) and a missing role (advisory). */
export function regionLinkFindings(root: string, storeDir = STORE_DIR): { wrong: string[]; missing: string[] } {
  const roles = regionRoles(storeDir);
  const m = readMarker(root)?.data ?? {};
  const wrong: string[] = [];
  const role = typeof m.role === "string" ? m.role : "";
  if (!role) return { wrong, missing: Object.keys(roles).length ? [`${basename(root)}: no role in the marker (Struc_Region_Workspace)`] : [] };
  if (!roles[role]) { wrong.push(`role "${role}" is not a role of Struc_Region_Workspace (${Object.keys(roles).join(" · ")})`); return { wrong, missing: [] }; }
  const owner = m.owner;
  const uses = (m.uses && typeof m.uses === "object" ? m.uses : {}) as Record<string, unknown>;
  if (role === "guest") {
    if (owner || Object.keys(uses).length) wrong.push("a guest belongs to no one: no owner, no uses");
    return { wrong, missing: [] };
  }
  if (Array.isArray(owner)) wrong.push("one owner only — owner is a single repo name");
  else if (typeof owner === "string" && owner) {
    const at = findRegionRepo(owner, root);
    if (!at) wrong.push(`owner "${owner}" is no repo of this workspace`);
    else if (!(roles[roleOf(at)]?.manages ?? []).includes(role)) wrong.push(`owner "${owner}" (role ${roleOf(at) || "none"}) does not manage a ${role}`);
  }
  for (const [kind, target] of Object.entries(uses)) {
    if (typeof target !== "string" || !target) { wrong.push(`uses.${kind}: one repo name`); continue; }
    const at = findRegionRepo(target, root);
    if (!at) wrong.push(`uses.${kind} "${target}" is no repo of this workspace`);
    else if (!(roles[roleOf(at)]?.provides ?? []).includes(kind)) wrong.push(`uses.${kind} "${target}" (role ${roleOf(at) || "none"}) does not provide ${kind}`);
  }
  return { wrong, missing: [] };
}
