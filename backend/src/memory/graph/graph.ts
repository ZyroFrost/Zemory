// Code graph — a DERIVED, deterministic import graph of a project's source
// (0 LLM, HP điều 6). Nodes = source files; edges = intra-project imports. Each
// node carries the standard slot its folder maps to (03_STRUCTURE) and its
// top-level symbol names, so the cockpit can draw the graph AND light up the
// matching folder in the structure tree.
//
// Declared edges only (plan 13 §4): imports parsed statically. No AST library —
// a lightweight import/symbol scan is enough for a file-level graph and keeps the
// tool dependency-free. Fail-open: unreadable files are skipped, never fatal.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { SLOT_ROLES } from "../../docs/structure-tree.js";

/**
 * Định danh ỔN ĐỊNH cho một cạnh — để trích dẫn được.
 *
 * Vì sao: hiện agent chỉ nói được "A import B"; không có cách nào chỉ vào ĐÚNG cạnh
 * đó và cũng không có cách nào kiểm lại sau. Có id ổn định thì một khẳng định mới dẫn
 * được nguồn (`edge:9f2c…`) và ta mới ĐO được cạnh được dẫn có thật hay không — đúng
 * tinh thần điều 12 (đo thật, đừng tin lời).
 *
 * `rel` nằm TRONG hash một cách cố ý: cùng cặp (A,B) mà một cạnh khai báo và một cạnh
 * suy luận là HAI sự thật khác hạng (điều 13 cấm trộn) ⇒ phải khác id.
 * Tất định thuần: cùng đầu vào luôn ra cùng id, không phụ thuộc thứ tự dựng hay máy.
 */
/**
 * Đóng dấu `eid` cho một DANH SÁCH cạnh ĐÃ GỘP ĐỦ mọi lớp.
 *
 * Tách thành hàm dùng chung vì trước đây mỗi bề mặt tự đóng dấu một kiểu: payload UI có
 * `eid`, còn `graph export` (chính là CONTRACT) thì không — nên id không ổn định GIỮA CÁC
 * BỀ MẶT và việc trích dẫn cạnh trở nên vô nghĩa. Một hàm ⇒ cùng đầu vào, cùng id, ở mọi nơi.
 */
export function stampEdgeIds<
  T extends {
    from: string;
    to: string;
    type?: string;
    kind?: string;
    // `fromSymbol` là null khi lời gọi nằm ở mức module (không trong hàm nào) — nhận cả
    // null để cạnh đó vẫn băm được, thay vì bắt phía gọi tự nắn kiểu.
    fromSymbol?: string | null;
    toSymbol?: string | null;
  },
>(edges: T[]): (T & { eid: string })[] {
  return edges.map((e) => {
    // Cạnh CẤP HÀM phải băm CẢ hai symbol. Đo 2026-08-06 trên chính repo này: bỏ symbol ra
    // thì 2.526 cạnh `calls` co lại còn 949 id — có id gánh **157 cạnh khác nhau** (mọi lời
    // gọi từ `go` sang một file đều trùng id). Một id trỏ 157 chỗ thì không định danh được
    // gì, tức là hỏng đúng cái việc `eid` sinh ra để làm. Cạnh `imports` không có symbol nên
    // id của chúng KHÔNG đổi — giữ nguyên tương thích với id đã công bố.
    const sym = e.fromSymbol || e.toSymbol ? `${e.fromSymbol ?? ""}>${e.toSymbol ?? ""}` : "";
    return { ...e, eid: edgeId(e.from, e.to, `${e.type ?? "imports"}${sym ? `#${sym}` : ""}`, e.kind ?? "declared") };
  });
}

export function edgeId(from: string, to: string, kind: string, rel: string): string {
  return createHash("sha1").update(`${from}|${to}|${kind}|${rel}`).digest("hex").slice(0, 12);
}

// Exported so the folder-tree view (structure-tree.ts) walks the EXACT same file
// set as the graph — tree and graph must never drift (one is the "map", the
// other the "territory" of the same node set).
export const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);

/** Ngôn ngữ MỞ RỘNG — detect-then-load (user chốt 2026-08-21: zemory phục vụ cả user ngôn ngữ
 *  khác, nhưng "không phải kho nào cũng áp một đống ngôn ngữ" ⇒ kho nào tự nạp đúng thứ kho đó
 *  CÓ; repo thuần ts/js/py không tốn thêm một byte). Node của các ngôn ngữ này có symbol AST
 *  (grammar prebuilt sẵn trong tree-sitter-wasms, nạp LƯỜI theo nhu cầu) nhưng CHƯA có lớp cạnh
 *  import ⇒ mang cờ `noImportLayer` và không bị tính vào `isolated_pct` — đo được phép thử
 *  2026-08-21: isolated đang 29,4/30%, tính cả node chưa-đo-được-cạnh là gate đỏ oan tức thì. */
export const EXTRA_LANG_EXT: Record<string, string> = {
  ".sh": "bash",
  ".bash": "bash",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".cs": "c_sharp",
  ".rb": "ruby", // đo 2026-08-21: grammar ruby LOAD FAIL — giữ làm ca âm sống, fail-open về regex-rỗng
};
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
  /** true = ngôn ngữ mở rộng CHƯA có lớp cạnh import — loại khỏi isolated_pct (đừng phạt
   *  thứ chưa đo được); symbol đến từ AST nếu grammar nạp được, không thì rỗng (fail-open). */
  noImportLayer?: boolean;
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
    else if (SRC_EXT.has(extname(name)) || extname(name) in EXTRA_LANG_EXT) out.push(abs);
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
    // Ngôn ngữ mở rộng: regex import/symbol của js/py KHÔNG hiểu cú pháp họ — chạy lên chỉ
    // đẻ rác. Node vẫn vào graph (đếm được, AST enrich lấp symbol nếu grammar nạp được),
    // cạnh import để trống + cờ noImportLayer cho fitness biết đường mà không phạt oan.
    const extraLang = EXTRA_LANG_EXT[extname(id)];
    const { imports, symbols } = extraLang ? { imports: [] as RawImport[], symbols: [] as string[] } : parseFile(text, isPy);
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
      ...(extraLang ? { noImportLayer: true as const } : {}),
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
  // `orphans` = 0 cạnh VÀ đã đo được cạnh. Node ngôn ngữ mở rộng chưa có parser import thì
  // "0 cạnh" là giới hạn phép đo — gọi nó mồ côi là bề mặt nói dối (cùng lý do fitness loại
  // chúng khỏi isolated_pct; hai bề mặt phải nói MỘT câu, lệch nhau là đọc sai một chỗ).
  const orphans = nodes.filter((n) => !n.noImportLayer && n.fanIn === 0 && n.fanOut === 0).map((n) => n.id);
  const slots = new Set(nodes.map((n) => n.slot).filter(Boolean));
  const bytes = nodes.reduce((n, x) => n + x.bytes, 0);
  return { root, nodes, edges, orphans, stats: { files: nodes.length, edges: edges.length, slots: slots.size, bytes } };
}

/**
 * Cheap change-signature of a project's source (file count + newest mtime +
 * a hash of the file PATHS). Used to invalidate the daemon's graph cache:
 * re-parse only when a file actually changed, not on every request. Walk+stat is
 * far cheaper than the read+parse of a full buildCodeGraph.
 *
 * The path hash matters: `git mv a.ts b.ts` keeps the file COUNT the same and
 * preserves mtimes, so count+mtime alone would miss the rename and serve a stale
 * graph. Folding the paths in makes any add/remove/rename flip the signature.
 */
export function sourceSignature(root: string): string {
  if (!existsSync(root)) return "0:0";
  const files: string[] = [];
  collectFiles(root, root, files, 0);
  let newest = 0;
  let pathHash = 0; // FNV-1a over the sorted paths — order-independent set identity
  for (const f of files.slice().sort()) {
    try {
      const m = statSync(f).mtimeMs;
      if (m > newest) newest = m;
    } catch {
      /* skip unreadable */
    }
    for (let i = 0; i < f.length; i++) {
      // Math.imul: a plain `* 0x01000193` overflows 2^53 and loses the low bits
      // BEFORE >>> 0, so use a true 32-bit multiply for a proper FNV-1a.
      pathHash = Math.imul(pathHash ^ f.charCodeAt(i), 0x01000193) >>> 0;
    }
  }
  return `${files.length}:${Math.round(newest)}:${pathHash.toString(16)}`;
}

// ── Fitness (plan 13 §9 Phase A — idea absorbed from CALM's fitness_report) ──
// Deterministic health metrics over the file-level graph, each with a gate
// threshold like `memory bench`. HONEST NAMING: a file with no edges is
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
  // isolated_pct CHỈ tính trên node có LỚP CẠNH IMPORT (2026-08-21): ngôn ngữ mở rộng chưa có
  // parser import thì "0 cạnh" là giới hạn của phép đo, không phải bệnh của repo — tính cả
  // vào là mở thêm một ngôn ngữ đỏ oan một lần (đo: 29,4/30% trước khi mở).
  const eligible = g.nodes.filter((n) => !n.noImportLayer);
  const isolated = eligible.filter((n) => n.fanIn === 0 && n.fanOut === 0);
  const isolatedPct = eligible.length ? Math.round((isolated.length / eligible.length) * 1000) / 10 : 0;

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
      detail: `${isolated.length}/${eligible.length} file(s) with no intra-project edges (entries/scripts included; extra-language files without an import layer excluded)`,
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
  // Matcher dời ra `matchFileId` (2026-08-21) — `graph path` cần đúng cùng cách hiểu "khớp";
  // giữ hai bản là thế nào cũng lệch.
  const m = matchFileId(g, query);
  if (!m.id && m.candidates.length) return { ...empty, candidates: m.candidates };
  if (!m.id) return empty;

  const id = m.id;
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

// ── Hấp thụ từ khảo sát Graphify 2026-08-21 (user chốt "2 hệ hỗ trợ nhau, mượn cái nó thắng"):
//    `path A B` lấp đúng lỗ tự nhận ở §1 plan 13 — "graph chưa trả lời được traceability đa-hop".
//    Thuần BFS trên cạnh ĐÃ CÓ, 0 dependency, 0 LLM (điều 6/13); Leiden/wiki cố ý KHÔNG mang theo.

/** Matcher file-id dùng chung (exact → suffix → basename) — MỘT nguồn cho impact lẫn path;
 *  hai bản matcher là hai cách hiểu "khớp" rồi thế nào cũng lệch (bài học nguồn-trùng). */
export function matchFileId(g: CodeGraph, query: string): { id: string | null; candidates: string[] } {
  const q = query.replace(/\\/g, "/").replace(/^\.\//, "");
  const ids = g.nodes.map((n) => n.id);
  let matches = ids.filter((id) => id === q);
  if (!matches.length) matches = ids.filter((id) => id.endsWith("/" + q) || id.endsWith(q));
  if (!matches.length) {
    const base = q.split("/").pop() as string;
    matches = ids.filter((id) => id.split("/").pop() === base);
  }
  if (!matches.length) return { id: null, candidates: [] };
  if (matches.length > 1) return { id: null, candidates: matches.slice(0, 10) };
  return { id: matches[0], candidates: [] };
}

export interface PathStep {
  from: string;
  to: string;
  type: string;
  kind: "declared" | "inferred";
  /** false = cạnh gốc chiều ngược lại (BFS đi hai chiều — "liên quan" không có hướng, nhưng
   *  bước in ra phải nói thật cạnh thật trỏ chiều nào). */
  forward: boolean;
}

/** Đường NGẮN NHẤT giữa hai node qua bộ cạnh đã gộp (imports · calls · api …).
 *  BFS không hướng, tất định (cạnh duyệt theo thứ tự đầu vào); null = không nối được. */
export function shortestPathEdges(
  edges: Array<{ from: string; to: string; type: string; kind: "declared" | "inferred" }>,
  from: string,
  to: string,
): PathStep[] | null {
  if (from === to) return [];
  const adj = new Map<string, PathStep[]>();
  const add = (key: string, step: PathStep): void => {
    const arr = adj.get(key);
    if (arr) arr.push(step);
    else adj.set(key, [step]);
  };
  for (const e of edges) {
    add(e.from, { from: e.from, to: e.to, type: e.type, kind: e.kind, forward: true });
    add(e.to, { from: e.to, to: e.from, type: e.type, kind: e.kind, forward: false });
  }
  const prev = new Map<string, PathStep>();
  const queue: string[] = [from];
  const seen = new Set<string>([from]);
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const step of adj.get(cur) ?? []) {
      if (seen.has(step.to)) continue;
      seen.add(step.to);
      prev.set(step.to, step);
      if (step.to === to) {
        const path: PathStep[] = [];
        let at = to;
        while (at !== from) {
          const p = prev.get(at) as PathStep;
          path.unshift(p);
          at = p.from;
        }
        return path;
      }
      queue.push(step.to);
    }
  }
  return null;
}

/** Top "god node" theo tổng bậc (fan-in + fan-out) — bản xếp hạng cho fitness report;
 *  con số từng node vốn đã có, đây chỉ là BẢN IN người đọc nhanh được. */
export function topHubs(g: CodeGraph, n = 5): Array<{ id: string; fanIn: number; fanOut: number; slot?: string }> {
  return [...g.nodes]
    .sort((a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut))
    .slice(0, n)
    .map((x) => ({ id: x.id, fanIn: x.fanIn, fanOut: x.fanOut, slot: x.slot }));
}
