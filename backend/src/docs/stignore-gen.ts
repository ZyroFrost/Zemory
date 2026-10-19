// The allow list of a repo's .stignore (slot Root_141_Stignore) — machine-made by `zemory sync`, never written by hand.
//
// A repo synced to the machine that runs tasks (Syncthing, work PC → VM) carries ONLY what automation there uses: the
// folders and root files named by the vm_deploy.json manifests (`files` · `needs` · `secrets` · `wrapper` · `check`), the
// manifest folders themselves (the deploy tool scans them), and whatever a sibling repo's manifest asks for with `../<repo>/…`.
// Everything else stays on the work PC (2026-10-19, measured on a VM while whole repos travelled: reports 10.5 GB + 24.9 GB
// of Syncthing versions of them, its drive down to 27.8 GB).
//
// The block sits at the END of .stignore: Syncthing takes the FIRST pattern that matches, so the never-carry lines above it
// (data · exports · .vault · *.local.* · docs/.harness-state) still win inside an allowed folder, and the closing `*` drops
// the rest. A repo with no .stignore is not synced and gets nothing.

import { closeSync, existsSync, ftruncateSync, openSync, readdirSync, readFileSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const STIGNORE_ALLOW_START = "// zemory:stignore-allow:start";
export const STIGNORE_ALLOW_END = "// zemory:stignore-allow:end";

const MANIFEST_HOMES = ["tasks", "pipelines"];
// every key vm_deploy.ps1 resolves to a repo path; `schedule[].launcher` is read separately (its siblings are names and times)
const PATH_KEYS = ["files", "needs", "wrapper", "check", "build"];

function readJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Every vm_deploy.json of a repo: tasks/<task>/ and pipelines/<lane>/. */
export function manifests(root: string): string[] {
  const out: string[] = [];
  for (const home of MANIFEST_HOMES) {
    let ents: string[];
    try {
      ents = readdirSync(join(root, home), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      continue;
    }
    for (const d of ents) {
      if (existsSync(join(root, home, d, "vm_deploy.json"))) out.push(`${home}/${d}/vm_deploy.json`);
    }
  }
  return out;
}

function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  return [];
}

/** Every path a manifest names, posix, relative to the repo the manifest lives in. */
export function manifestPaths(m: Record<string, unknown>): string[] {
  const out = PATH_KEYS.flatMap((k) => strings(m[k]));
  const sec = m.secrets;
  if (sec && typeof sec === "object" && !Array.isArray(sec)) out.push(...Object.keys(sec));
  for (const s of Array.isArray(m.schedule) ? m.schedule : []) {
    const l = (s as { launcher?: unknown } | null)?.launcher;
    if (typeof l === "string") out.push(l);
  }
  return out.map((p) => p.replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean);
}

/** The top entry (`tasks` · `.env`) a repo path travels under. */
const topOf = (path: string): string => path.split("/")[0];

/**
 * The entries a repo must carry, sorted: its own manifest homes and the tops of the paths its manifests name, plus the tops of
 * `../<this repo>/…` paths that sibling repos' manifests need from it.
 */
export function stignoreAllowEntries(root: string): string[] {
  const keep = new Set<string>();
  for (const man of manifests(root)) {
    keep.add(topOf(man));
    const m = readJson(join(root, man));
    if (m) for (const p of manifestPaths(m)) if (!p.startsWith("../")) keep.add(topOf(p));
  }
  const me = basename(root);
  const prefix = `../${me}/`;
  let siblings: string[] = [];
  try {
    siblings = readdirSync(dirname(root), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== me).map((e) => join(dirname(root), e.name));
  } catch {
    /* no parent listing: own manifests only */
  }
  for (const sib of siblings) {
    for (const man of manifests(sib)) {
      const m = readJson(join(sib, man));
      if (!m) continue;
      for (const p of manifestPaths(m)) if (p.startsWith(prefix) && p.length > prefix.length) keep.add(topOf(p.slice(prefix.length)));
    }
  }
  keep.delete("");
  keep.delete("..");
  keep.delete(".");
  return [...keep].sort((a, b) => a.localeCompare(b));
}

/** The machine-made block for these entries: one `!/<entry>` line each, then `*` for everything else. */
export function stignoreAllowBlock(entries: string[]): string {
  return [
    `${STIGNORE_ALLOW_START} · written by \`zemory sync\` from every vm_deploy.json (slot Root_141_Stignore) — do not edit by hand`,
    "// only what automation on the VM uses travels; everything else stays on the work PC",
    ...entries.map((e) => `!/${e}`),
    "*",
    STIGNORE_ALLOW_END,
  ].join("\n");
}

export interface StignoreAllowResult {
  state: "none" | "unchanged" | "written";
  entries: string[];
}

/**
 * Rewrite an existing file through a handle opened for update. Windows refuses to open a Hidden file for writing with
 * truncation (writeFileSync: EPERM), and Syncthing setups often mark .stignore Hidden (2026-10-19: BIZ · HR · IC · MKT ·
 * OPS); opening the existing file `r+`, truncating and writing is allowed and keeps its attributes.
 */
function rewriteInPlace(p: string, text: string): void {
  const fd = openSync(p, "r+");
  try {
    ftruncateSync(fd, 0);
    writeSync(fd, text, 0, "utf8");
  } finally {
    closeSync(fd);
  }
}

/** Put the block at the end of .stignore (replacing the previous one). No .stignore = the repo is not synced: nothing done. */
export function writeStignoreAllow(root: string, apply: boolean): StignoreAllowResult {
  const p = join(root, ".stignore");
  if (!existsSync(p)) return { state: "none", entries: [] };
  const entries = stignoreAllowEntries(root);
  const text = readFileSync(p, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const s = lines.findIndex((l) => l.startsWith(STIGNORE_ALLOW_START));
  const e = s >= 0 ? lines.findIndex((l, i) => i > s && l.startsWith(STIGNORE_ALLOW_END)) : -1;
  const head = (s >= 0 && e > s ? [...lines.slice(0, s), ...lines.slice(e + 1)] : lines).join("\n").replace(/\s+$/, "");
  const next = `${head}\n\n${stignoreAllowBlock(entries)}\n`.replace(/\n/g, eol);
  if (next === text) return { state: "unchanged", entries };
  if (apply) rewriteInPlace(p, next);
  return { state: "written", entries };
}
