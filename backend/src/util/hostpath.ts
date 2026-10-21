// The host's view of paths, for the Docker path (docs/plan/30 §3 a). Everything zemory WRITES into the store names a
// path the way the host machine writes it (C:\Users\<u>\.claude\…, D:\Workspace\…): project roots, ingest keys, cwd.
// Inside the container the same files sit under mounts (/home/node/.claude, /host/workspace), so a path is translated
// only at the moment a file is opened, and translated back before it is stored or compared with the store.
//
// ZEMORY_PATH_MAP = `<host prefix>=><container prefix>` pairs, `;`-separated, set by docker-compose.yml. Without it (the
// native install) both directions are the identity: a native path IS the host path.

export interface PathPair {
  host: string;
  inner: string;
}

const slash = (p: string): string => p.replace(/\\/g, "/").replace(/\/+$/, "");

/** `C:\Users\u\.claude=>/home/node/.claude;…` ⇒ pairs; a malformed entry is skipped. */
export function parsePathMap(raw: string | undefined): PathPair[] {
  return String(raw ?? "")
    .split(";")
    .map((e) => e.split("=>"))
    .filter((kv) => kv.length === 2 && kv[0].trim() && kv[1].trim())
    .map(([h, i]) => ({ host: slash(h.trim()), inner: slash(i.trim()) }));
}

/** A host path under a mapped prefix ⇒ the container path (separators made `/`); anything else is returned as given. A
 *  prefix matches whole segments only, case-insensitively (Windows paths). */
export function mapHostPath(p: string, map: PathPair[]): string {
  if (!p) return p;
  const s = slash(p);
  const lower = s.toLowerCase();
  for (const m of map) {
    const pre = m.host.toLowerCase();
    if (lower === pre || lower.startsWith(pre + "/")) return m.inner + s.slice(m.host.length);
  }
  return p;
}

/** A container path under a mapped prefix ⇒ the host path, written with the host's separator (`\` for a drive-letter
 *  host); anything else is returned as given. Inverse of `mapHostPath`. */
export function unmapToHost(p: string, map: PathPair[]): string {
  if (!p) return p;
  const s = slash(p);
  for (const m of map) {
    if (s === m.inner || s.startsWith(m.inner + "/")) {
      const rest = s.slice(m.inner.length);
      const windows = /^[A-Za-z]:/.test(m.host);
      return windows ? (m.host + rest).replace(/\//g, "\\") : m.host + rest;
    }
  }
  return p;
}

let cached: { raw: string | undefined; map: PathPair[] } | null = null;
function envMap(): PathPair[] {
  const raw = process.env.ZEMORY_PATH_MAP;
  if (!cached || cached.raw !== raw) cached = { raw, map: parsePathMap(raw) };
  return cached.map;
}

/** Host path ⇒ the path to open here (identity on a native install). */
export function toLocalPath(hostPath: string): string {
  return mapHostPath(hostPath, envMap());
}

/** Path opened here ⇒ the host path to store (identity on a native install). */
export function toHostPath(localPath: string): string {
  return unmapToHost(localPath, envMap());
}
