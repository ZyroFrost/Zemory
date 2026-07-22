// Code graph — a DERIVED, deterministic import graph of a project's source
// (0 LLM, HP điều 6). Nodes = source files; edges = intra-project imports. Each
// node carries the standard slot its folder maps to (03_STRUCTURE) and its
// top-level symbol names, so the cockpit can draw the graph AND light up the
// matching folder in the structure tree.
//
// Declared edges only (plan 13 §4): imports parsed statically. No AST library —
// a lightweight import/symbol scan is enough for a file-level graph and keeps the
// tool dependency-free. Fail-open: unreadable files are skipped, never fatal.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { SLOT_ROLES } from "./structure-tree.js";

const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);
const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".venv", "__pycache__",
  "data", "generated", ".turbo", ".next", ".cache", "models", "attic", "external",
]);

export interface GraphNode {
  /** repo-relative path with forward slashes (stable id) */
  id: string;
  /** file name */
  label: string;
  /** immediate folder (repo-relative) */
  dir: string;
  /** the standard slot this file's folder maps to, if recognized */
  slot?: string;
  /** lines of code (rough size signal) */
  loc: number;
  /** file size in chars — the real cost of READING this file (≈ bytes/4 tokens) */
  bytes: number;
  /** top-level symbol names (functions / classes / exported consts) */
  symbols: string[];
  /** Phase B (graph-symbols.ts): AST-accurate symbols with kind + line span.
   *  Absent when tree-sitter is unavailable — `symbols` (regex) still stands. */
  symbolsDetail?: { name: string; kind: "function" | "class" | "method"; line: number; endLine: number }[];
  /** Phase C internal: raw call sites collected during enrichment. `member` =
   *  x.foo() / attribute call (only ever matched against METHOD defs). Stripped
   *  from the UI payload — resolveCalls() turns these into edges on demand. */
  callSites?: { name: string; member: boolean; line: number; enclosing: string | null }[];
  /** how many files import this one (fan-in) */
  fanIn: number;
  /** how many files this one imports (fan-out) */
  fanOut: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface CodeGraph {
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** files no one imports and that import nothing intra-project (dead-ish / entry) */
  orphans: string[];
  stats: { files: number; edges: number; slots: number; bytes: number };
}

/** Collect every source file under a root (bounded, ignoring output/vendor dirs). */
function collectFiles(absRoot: string, absDir: string, out: string[], depth: number): void {
  if (depth > 8) return;
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name.startsWith(".") || IGNORE.has(name)) continue;
    const abs = join(absDir, name);
    let isDir: boolean;
    try {
      isDir = statSync(abs).isDirectory();
    } catch {
      continue;
    }
    if (isDir) collectFiles(absRoot, abs, out, depth + 1);
    else if (SRC_EXT.has(extname(name))) out.push(abs);
  }
}

// JS/TS: import … from "x" · import "x" · require("x")
const JS_IMPORT_RE = /(?:import[\s\S]*?from\s*|import\s*|export[\s\S]*?from\s*|require\s*\(\s*)["']([^"']+)["']/g;
const JS_SYMBOL_RE = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+([A-Za-z0-9_$]+)|class\s+([A-Za-z0-9_$]+)|(?:const|let)\s+([A-Za-z0-9_$]+)\s*=)/;
// Python: from a.b import c  ·  import a.b  ·  from . import x
const PY_FROM_RE = /^[ \t]*from[ \t]+([.\w]+)[ \t]+import\b/gm;
const PY_IMPORT_RE = /^[ \t]*import[ \t]+([.\w]+)/gm;
const PY_SYMBOL_RE = /^\s*(?:async[ \t]+)?(?:def[ \t]+([A-Za-z0-9_]+)|class[ \t]+([A-Za-z0-9_]+))/;

export interface RawImport {
  spec: string;
  py: boolean;
}

/** Extract import specifiers (tagged JS vs Python) + top-level symbols. */
function parseFile(text: string, isPy: boolean): { imports: RawImport[]; symbols: string[] } {
  const imports: RawImport[] = [];
  const symbols: string[] = [];
  if (isPy) {
    for (const m of text.matchAll(PY_FROM_RE)) imports.push({ spec: m[1], py: true });
    for (const m of text.matchAll(PY_IMPORT_RE)) imports.push({ spec: m[1], py: true });
    for (const line of text.split("\n")) {
      const m = PY_SYMBOL_RE.exec(line);
      if (m) {
        const name = m[1] || m[2];
        if (name && !symbols.includes(name)) symbols.push(name);
      }
    }
  } else {
    for (const m of text.matchAll(JS_IMPORT_RE)) imports.push({ spec: m[1], py: false });
    for (const line of text.split("\n")) {
      const m = JS_SYMBOL_RE.exec(line);
      if (m) {
        const name = m[1] || m[2] || m[3];
        if (name && !symbols.includes(name)) symbols.push(name);
      }
    }
  }
  return { imports, symbols };
}

/**
 * Resolve a Python dotted import to a project file. Package roots vary (some
 * projects import `services.x`, others `backend.services.x`), so we suffix-match
 * the dotted path against every .py file's path — preferring the longest match.
 * `from a.b import c` may mean module a/b/c OR name c in module a/b — try both.
 */
function resolvePy(spec: string, fromId: string, pyIndex: Map<string, string>): string | null {
  const relDots = spec.match(/^\.+/);
  let dotted = spec.replace(/^\.+/, "");
  if (relDots) {
    // relative import: anchor to the importing file's package dir
    const base = dirname(fromId).replace(/\\/g, "/");
    const up = relDots[0].length - 1; // one dot = same dir
    const baseSegs = base ? base.split("/") : [];
    const anchor = baseSegs.slice(0, baseSegs.length - up).join("/");
    dotted = (anchor ? anchor.replace(/\//g, ".") + "." : "") + dotted;
  }
  const slash = dotted.replace(/\./g, "/");
  const candidates = [slash, slash.split("/").slice(0, -1).join("/")].filter(Boolean);
  for (const cand of candidates) {
    if (pyIndex.has(cand)) return pyIndex.get(cand) as string;
  }
  // suffix match (longest key wins — handled by insertion of exact keys above)
  for (const cand of candidates) {
    for (const [key, id] of pyIndex) {
      if (key === cand || key.endsWith("/" + cand)) return id;
    }
  }
  return null;
}

/**
 * Resolve a relative import specifier to a real file id within the project.
 * Tries the literal path, common extensions, and /index.* — mirrors Node/TS
 * resolution enough for a file-level graph. Bare specifiers (packages) → null.
 */
function resolveImport(fromAbs: string, spec: string, fileSet: Set<string>, absRoot: string): string | null {
  if (!spec.startsWith(".")) return null; // external package
  const baseAbs = join(dirname(fromAbs), spec);
  const candidates: string[] = [];
  const rawExt = extname(baseAbs);
  if (rawExt && SRC_EXT.has(rawExt)) candidates.push(baseAbs);
  // TS emits ".js" specifiers that map to ".ts" sources — try sibling extensions.
  const noExt = rawExt ? baseAbs.slice(0, -rawExt.length) : baseAbs;
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) candidates.push(noExt + ext);
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) candidates.push(join(baseAbs, "index" + ext));
  for (const abs of candidates) {
    const id = relative(absRoot, abs).replace(/\\/g, "/");
    if (fileSet.has(id)) return id;
  }
  return null;
}

/** Build the code graph for a project root. */
export function buildCodeGraph(root: string): CodeGraph {
  const empty: CodeGraph = { root, nodes: [], edges: [], orphans: [], stats: { files: 0, edges: 0, slots: 0, bytes: 0 } };
  if (!existsSync(root)) return empty;
  const absFiles: string[] = [];
  collectFiles(root, root, absFiles, 0);
  const ids = absFiles.map((abs) => relative(root, abs).replace(/\\/g, "/"));
  const idSet = new Set(ids);
  const absById = new Map<string, string>();
  ids.forEach((id, i) => absById.set(id, absFiles[i]));

  // Python module index: dotted-module key (path minus .py / /__init__) → file id.
  const pyIndex = new Map<string, string>();
  for (const id of ids) {
    if (!id.endsWith(".py")) continue;
    const key = id.replace(/\.py$/, "").replace(/\/__init__$/, "");
    pyIndex.set(key, id);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  const seenEdge = new Set<string>();

  for (const id of ids) {
    const abs = absById.get(id) as string;
    const isPy = id.endsWith(".py");
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      continue; // fail-open
    }
    const { imports, symbols } = parseFile(text, isPy);
    const dir = dirname(id) === "." ? "" : dirname(id);
    const folderName = basename(dir || id);
    const slot = SLOT_ROLES[folderName] ? folderName : undefined;
    nodes.push({
      id,
      label: basename(id),
      dir,
      slot,
      loc: text.split("\n").length,
      bytes: text.length,
      symbols: symbols.slice(0, 40),
      fanIn: 0,
      fanOut: 0,
    });
    for (const imp of imports) {
      const to = imp.py ? resolvePy(imp.spec, id, pyIndex) : resolveImport(abs, imp.spec, idSet, root);
      if (!to || to === id) continue;
      const key = id + " -> " + to;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      edges.push({ from: id, to });
      fanOut.set(id, (fanOut.get(id) ?? 0) + 1);
      fanIn.set(to, (fanIn.get(to) ?? 0) + 1);
    }
  }

  for (const n of nodes) {
    n.fanIn = fanIn.get(n.id) ?? 0;
    n.fanOut = fanOut.get(n.id) ?? 0;
  }
  const orphans = nodes.filter((n) => n.fanIn === 0 && n.fanOut === 0).map((n) => n.id);
  const slots = new Set(nodes.map((n) => n.slot).filter(Boolean));
  const bytes = nodes.reduce((n, x) => n + x.bytes, 0);
  return { root, nodes, edges, orphans, stats: { files: nodes.length, edges: edges.length, slots: slots.size, bytes } };
}

/**
 * Cheap change-signature of a project's source (file count + newest mtime).
 * Used to invalidate the daemon's graph cache: re-parse only when a file
 * actually changed, not on every request. Walk+stat is far cheaper than the
 * read+parse of a full buildCodeGraph.
 */
export function sourceSignature(root: string): string {
  if (!existsSync(root)) return "0:0";
  const files: string[] = [];
  collectFiles(root, root, files, 0);
  let newest = 0;
  for (const f of files) {
    try {
      const m = statSync(f).mtimeMs;
      if (m > newest) newest = m;
    } catch {
      /* skip unreadable */
    }
  }
  return `${files.length}:${Math.round(newest)}`;
}

// ── Fitness (plan 13 §9 Phase A — idea absorbed from CALM's fitness_report) ──
// Deterministic health metrics over the file-level graph, each with a gate
// threshold like `brain bench`. HONEST NAMING: a file with no edges is
// "isolated", not "dead" — at file level entries/scripts legitimately have none.

/** A file is a HUB when this many files import it — a change there fans wide. */
export const HUB_FANIN = 8;
/** Gate thresholds (percentages). Deliberately loose to start; tighten with data. */
export const FITNESS_GATES = { hubPct: 20, isolatedPct: 30, utilViolations: 0 };

export interface FitnessMetric {
  metric: string;
  value: number;
  threshold: number;
  passed: boolean;
  detail: string;
}

export interface GraphFitness {
  passed: boolean;
  metrics: FitnessMetric[];
  hubs: { id: string; fanIn: number }[];
  /** util-slot files importing non-util project files (slot-boundary rule v1:
   *  03_STRUCTURE §5 — util is PURE helpers, it must not reach into logic). */
  utilViolations: { from: string; to: string }[];
}

/** Score a built graph against the gates. Pure function — no I/O. */
export function graphFitness(g: CodeGraph): GraphFitness {
  const files = g.nodes.length;
  const hubs = g.nodes
    .filter((n) => n.fanIn >= HUB_FANIN)
    .sort((a, b) => b.fanIn - a.fanIn)
    .map((n) => ({ id: n.id, fanIn: n.fanIn }));
  const hubPct = files ? Math.round((hubs.length / files) * 1000) / 10 : 0;
  const isolatedPct = files ? Math.round((g.orphans.length / files) * 1000) / 10 : 0;

  const isUtil = (id: string) => {
    const n = g.nodes.find((x) => x.id === id);
    return n?.slot === "util" || /(^|\/)util\.(ts|tsx|js|jsx|mjs|cjs|py)$/.test(id);
  };
  const utilViolations = g.edges.filter((e) => isUtil(e.from) && !isUtil(e.to)).map((e) => ({ from: e.from, to: e.to }));

  const metrics: FitnessMetric[] = [
    {
      metric: "hub_pct",
      value: hubPct,
      threshold: FITNESS_GATES.hubPct,
      passed: hubPct <= FITNESS_GATES.hubPct,
      detail: `${hubs.length}/${files} file(s) with fan-in >= ${HUB_FANIN}`,
    },
    {
      metric: "isolated_pct",
      value: isolatedPct,
      threshold: FITNESS_GATES.isolatedPct,
      passed: isolatedPct <= FITNESS_GATES.isolatedPct,
      detail: `${g.orphans.length}/${files} file(s) with no intra-project edges (entries/scripts included)`,
    },
    {
      metric: "util_violations",
      value: utilViolations.length,
      threshold: FITNESS_GATES.utilViolations,
      passed: utilViolations.length <= FITNESS_GATES.utilViolations,
      detail: utilViolations.length
        ? `util imports logic: ${utilViolations.slice(0, 3).map((v) => `${v.from} -> ${v.to}`).join(", ")}${utilViolations.length > 3 ? ", …" : ""}`
        : "util stays pure (imports nothing outside util)",
    },
  ];
  return { passed: metrics.every((m) => m.passed), metrics, hubs, utilViolations };
}

// ── Impact (plan 13 §9 Phase A — `zemory graph impact <file>`) ──────────────
// ADVISORY blast-radius: who imports this file (direct + transitive), what it
// imports, and a hub flag. Data only — the host's permission system governs
// edits (HP điều 10), zemory never blocks.

export interface FileImpact {
  /** resolved graph id, or null with `candidates` when the query is ambiguous */
  file: string | null;
  candidates: string[];
  fanIn: number;
  fanOut: number;
  isHub: boolean;
  importers: string[];
  imports: string[];
  /** files that reach this one through 2+ hops (change may still surface there) */
  transitiveImporters: string[];
  symbols: string[];
  /** AST symbols when enriched (Phase B) — kind + line span per symbol. */
  symbolsDetail?: GraphNode["symbolsDetail"];
  loc: number;
}

/** Resolve a user-supplied path (absolute, repo-relative, suffix, or bare name)
 *  against graph ids, then report its blast radius. */
export function fileImpact(g: CodeGraph, query: string): FileImpact {
  const empty: FileImpact = { file: null, candidates: [], fanIn: 0, fanOut: 0, isHub: false, importers: [], imports: [], transitiveImporters: [], symbols: [], loc: 0 };
  const q = query.replace(/\\/g, "/").replace(/^\.\//, "");
  const ids = g.nodes.map((n) => n.id);
  // exact → suffix → basename
  let matches = ids.filter((id) => id === q);
  if (!matches.length) matches = ids.filter((id) => id.endsWith("/" + q) || id.endsWith(q));
  if (!matches.length) {
    const base = q.split("/").pop() as string;
    matches = ids.filter((id) => id.split("/").pop() === base);
  }
  if (!matches.length) return empty;
  if (matches.length > 1) return { ...empty, candidates: matches.slice(0, 10) };

  const id = matches[0];
  const node = g.nodes.find((n) => n.id === id) as GraphNode;
  const importers = g.edges.filter((e) => e.to === id).map((e) => e.from).sort();
  const imports = g.edges.filter((e) => e.from === id).map((e) => e.to).sort();
  // Transitive fan-in via reverse BFS (who would feel a change here indirectly).
  const seen = new Set<string>([id, ...importers]);
  let frontier = importers;
  while (frontier.length) {
    const next: string[] = [];
    for (const f of frontier) {
      for (const e of g.edges) {
        if (e.to === f && !seen.has(e.from)) {
          seen.add(e.from);
          next.push(e.from);
        }
      }
    }
    frontier = next;
  }
  const transitiveImporters = [...seen].filter((x) => x !== id && !importers.includes(x)).sort();
  return {
    file: id,
    candidates: [],
    fanIn: node.fanIn,
    fanOut: node.fanOut,
    isHub: node.fanIn >= HUB_FANIN,
    importers,
    imports,
    transitiveImporters,
    symbols: node.symbols,
    ...(node.symbolsDetail ? { symbolsDetail: node.symbolsDetail } : {}),
    loc: node.loc,
  };
}
