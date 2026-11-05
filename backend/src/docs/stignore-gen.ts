// The allow list of a repo's .stignore (slot Root_141_Stignore) — machine-made by `zemory sync`, never written by hand.
//
// A repo synced to the machine that runs tasks (Syncthing, work PC → VM) carries ONLY what automation there uses: the
// folders and root files named by the vm_deploy.json manifests (`files` · `needs` · `wrapper` · `check` · `build`), the
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

const posix = (p: string): string => p.replace(/\\/g, "/").replace(/^\.\//, "");

/** Every path a manifest names that may travel, posix, relative to the repo the manifest lives in (secrets never: see below). */
export function manifestPaths(m: Record<string, unknown>): string[] {
  const out = PATH_KEYS.flatMap((k) => strings(m[k]));
  for (const s of Array.isArray(m.schedule) ? m.schedule : []) {
    const l = (s as { launcher?: unknown } | null)?.launcher;
    if (typeof l === "string") out.push(l);
  }
  const secret = new Set(manifestSecrets(m));
  return out.map(posix).filter((p) => p && !isEnvFile(p) && !secret.has(p));
}

/**
 * The secret files a manifest names (the keys of `secrets`). A secret never travels by Syncthing, `.env` included: it reaches
 * the VM by scp (plan/32 §0, user 2026-11-01 — Syncthing runs through outside relays). Listed in `files` too, it still stays.
 */
export function manifestSecrets(m: Record<string, unknown>): string[] {
  const sec = m.secrets;
  const keys = sec && typeof sec === "object" && !Array.isArray(sec) ? Object.keys(sec) : [];
  return keys.map(posix).filter(Boolean);
}

/** `.env` or `.env.<anything>` at any depth: a repo's private secret home, never carried. */
const isEnvFile = (p: string): boolean => /(^|\/)\.env(\.[^/]*)?$/.test(p);

/** The top entry (`tasks` · `.env`) a repo path travels under. */
const topOf = (path: string): string => path.split("/")[0];

interface NamedPaths {
  travel: string[];
  secret: string[];
  homes: string[];
}

/** Own manifests and siblings' `../<this repo>/…` needs, as [paths that travel, secret paths], relative to this repo.
 *  Reads every sibling folder (a repo under TEMP: 6,695 of them, 2026-11-05), so a caller computes it once and passes it on. */
function namedPaths(root: string): NamedPaths {
  const travel: string[] = [];
  const secret: string[] = [];
  const homes: string[] = [];
  for (const man of manifests(root)) {
    homes.push(topOf(man));
    const m = readJson(join(root, man));
    if (!m) continue;
    travel.push(...manifestPaths(m).filter((p) => !p.startsWith("../")));
    secret.push(...manifestSecrets(m).filter((p) => !p.startsWith("../")));
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
      for (const p of manifestPaths(m)) if (p.startsWith(prefix) && p.length > prefix.length) travel.push(p.slice(prefix.length));
      for (const p of manifestSecrets(m)) if (p.startsWith(prefix) && p.length > prefix.length) secret.push(p.slice(prefix.length));
    }
  }
  return { travel, secret, homes };
}

/**
 * The entries a repo must carry, sorted: its own manifest homes and the tops of the paths its manifests name, plus the tops of
 * `../<this repo>/…` paths that sibling repos' manifests need from it. A secret never opens an entry of its own.
 */
export function stignoreAllowEntries(root: string, named: NamedPaths = namedPaths(root)): string[] {
  const { travel, secret, homes } = named;
  const secrets = new Set(secret);
  const keep = new Set<string>(homes);
  for (const p of travel) if (!secrets.has(p)) keep.add(topOf(p));
  for (const s of secret) if (s === topOf(s)) keep.delete(s); // a secret at the root is never an entry, even when `files` names it
  keep.delete("");
  keep.delete("..");
  keep.delete(".");
  return [...keep].sort((a, b) => a.localeCompare(b));
}

/**
 * The deny lines above the allow list (Syncthing takes the FIRST match): `.env` and `.env.*` at any depth, and every secret a
 * manifest names below an allowed folder (`/config/tls/private.key` while `config` travels). Sorted, no duplicates.
 */
export function stignoreSecretDenies(root: string, named: NamedPaths = namedPaths(root)): string[] {
  const allowed = new Set(stignoreAllowEntries(root, named));
  const deny = new Set<string>();
  for (const s of named.secret) if (!isEnvFile(s) && s !== topOf(s) && allowed.has(topOf(s))) deny.add(`/${s}`);
  return [".env", ".env.*", ...[...deny].sort((a, b) => a.localeCompare(b))];
}

/** The machine-made block: the secret denies, one `!/<entry>` line per entry, then `*` for everything else. */
export function stignoreAllowBlock(entries: string[], denies: string[] = [".env", ".env.*"]): string {
  return [
    `${STIGNORE_ALLOW_START} · written by \`zemory sync\` from every vm_deploy.json (slot Root_141_Stignore) — do not edit by hand`,
    "// secrets never travel by Syncthing (.env and every manifest secret go to the VM by scp)",
    ...denies,
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
export function rewriteInPlace(p: string, text: string): void {
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
  const named = namedPaths(root);
  const entries = stignoreAllowEntries(root, named);
  const text = readFileSync(p, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const s = lines.findIndex((l) => l.startsWith(STIGNORE_ALLOW_START));
  const e = s >= 0 ? lines.findIndex((l, i) => i > s && l.startsWith(STIGNORE_ALLOW_END)) : -1;
  const head = (s >= 0 && e > s ? [...lines.slice(0, s), ...lines.slice(e + 1)] : lines).join("\n").replace(/\s+$/, "");
  const next = `${head}\n\n${stignoreAllowBlock(entries, stignoreSecretDenies(root, named))}\n`.replace(/\n/g, eol);
  if (next === text) return { state: "unchanged", entries };
  if (apply) rewriteInPlace(p, next);
  return { state: "written", entries };
}
