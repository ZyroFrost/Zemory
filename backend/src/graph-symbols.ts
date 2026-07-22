// Tree-sitter symbol enrichment (plan 13 §9 Phase B — absorbed from CALM).
//
// UPGRADE LAYER, not a replacement: buildCodeGraph() stays sync with its regex
// symbol scan as the always-working baseline; enrichGraphSymbols() then swaps in
// AST-accurate symbols (function/class/method + line spans) where tree-sitter
// can parse. Fail-open at every level (HP điều 9): a missing wasm, an ABI
// mismatch, or one unparsable file degrades to the regex names — never throws.
//
// Runtime: web-tree-sitter (MIT) + prebuilt grammars from tree-sitter-wasms
// (Unlicense). Both land via npm into node_modules — nothing committed (điều 2).

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { CodeGraph } from "./graph.js";

export interface SymbolDetail {
  name: string;
  kind: "function" | "class" | "method";
  line: number;
  endLine: number;
}

// Lazy singletons — init once per process, reuse across enrich calls.
let ready: Promise<Map<string, unknown> | null> | null = null;

/* The runtime is PINNED to web-tree-sitter@0.20.8: the prebuilt grammars in
 * tree-sitter-wasms 0.1.x are compiled with tree-sitter-cli 0.20.8, and a newer
 * runtime rejects their (older) language ABI — measured 2026-07-20: 0.26 failed
 * with an empty Error on every grammar; 0.20.8 loads all four. Upgrade the PAIR
 * together or not at all. 0.20 exposes Parser as the default export with
 * Parser.Language.load; the loader below also accepts the newer named shape. */
interface ParserCtor {
  init(): Promise<void>;
  new (): unknown;
  Language?: { load(path: string): Promise<unknown> };
}

async function loadLanguages(): Promise<Map<string, unknown> | null> {
  try {
    const mod = (await import("web-tree-sitter")) as unknown as { default?: ParserCtor; Parser?: ParserCtor; Language?: { load(path: string): Promise<unknown> } };
    const Parser = mod.default ?? mod.Parser;
    if (!Parser) return null;
    await Parser.init();
    const Language = Parser.Language ?? mod.Language;
    if (!Language) return null;
    // Resolve the grammar dir through the package itself, not a hardcoded path.
    const req = createRequire(import.meta.url);
    const out = join(dirname(req.resolve("tree-sitter-wasms/package.json")), "out");
    const langs = new Map<string, unknown>();
    for (const [key, file] of [
      ["ts", "tree-sitter-typescript.wasm"],
      ["tsx", "tree-sitter-tsx.wasm"],
      ["js", "tree-sitter-javascript.wasm"],
      ["py", "tree-sitter-python.wasm"],
    ] as const) {
      const wasm = join(out, file);
      if (existsSync(wasm)) langs.set(key, await Language.load(wasm));
    }
    if (!langs.size) return null;
    langs.set("__parser", new Parser());
    return langs;
  } catch {
    return null; // wasm unavailable → callers keep regex symbols
  }
}

function langKey(id: string): string | null {
  if (/\.tsx$/.test(id)) return "tsx";
  if (/\.ts$/.test(id)) return "ts";
  if (/\.(js|jsx|mjs|cjs)$/.test(id)) return "js";
  if (/\.py$/.test(id)) return "py";
  return null;
}

/* Minimal structural typing over web-tree-sitter nodes — enough for the walk
   without binding to the lib's full (and shifting) type surface. */
interface TNode {
  type: string;
  text: string;
  namedChildren: TNode[];
  childForFieldName(name: string): TNode | null;
  startPosition: { row: number };
  endPosition: { row: number };
}

const span = (n: TNode) => ({ line: n.startPosition.row + 1, endLine: n.endPosition.row + 1 });
const FN_VALUE = new Set(["arrow_function", "function_expression", "function", "generator_function"]);

export interface CallSite {
  name: string;
  /** x.foo() / attribute call — only ever matched against METHOD definitions. */
  member: boolean;
  line: number;
  /** nearest recorded enclosing def, null at module level */
  enclosing: string | null;
}

/**
 * One walk collecting BOTH:
 *  • defs — top-level functions/classes/consts + class methods (nested helper
 *    functions are noise at graph level and stay excluded), and
 *  • call sites (Phase C) — every call/new expression, tagged with its nearest
 *    recorded enclosing def. Bodies ARE descended for calls. String/template
 *    content never yields call nodes, so SQL-in-literal cannot fabricate edges
 *    (the exact failure measured in CALM's dependency scan, plan 13 §9).
 */
function collect(root: TNode, isPy: boolean): { defs: SymbolDetail[]; calls: CallSite[] } {
  const defs: SymbolDetail[] = [];
  const calls: CallSite[] = [];
  const push = (name: string | undefined, kind: SymbolDetail["kind"], n: TNode): string | null => {
    if (!name || defs.length >= 80) return null;
    defs.push({ name, kind, ...span(n) });
    return name;
  };
  const callee = (c: TNode): { name: string; member: boolean } | null => {
    const fn = c.childForFieldName(c.type === "new_expression" ? "constructor" : "function");
    if (!fn) return null;
    if (fn.type === "identifier") return { name: fn.text, member: false };
    if (fn.type === "member_expression") {
      const p = fn.childForFieldName("property");
      return p ? { name: p.text, member: true } : null;
    }
    if (fn.type === "attribute") {
      const a = fn.childForFieldName("attribute");
      return a ? { name: a.text, member: true } : null;
    }
    return null;
  };

  // cls = enclosing class name (records methods) · encl = nearest recorded def
  // (tags call sites; a def is only RECORDED at module level or as a method).
  const walk = (n: TNode, cls: string | null, encl: string | null): void => {
    for (const c of n.namedChildren) {
      const t = c.type;
      if (t === "call_expression" || t === "new_expression" || t === "call") {
        const ce = callee(c);
        if (ce && calls.length < 2000) calls.push({ ...ce, line: c.startPosition.row + 1, enclosing: encl });
        walk(c, cls, encl); // arguments may hold nested calls / arrow fns
        continue;
      }
      if (t === "function_declaration" || t === "generator_function_declaration" || t === "function_definition") {
        const name = c.childForFieldName("name")?.text;
        let rec: string | null = null;
        if (cls) rec = push(name ? `${cls}.${name}` : undefined, "method", c);
        else if (!encl) rec = push(name, "function", c); // nested defs are not symbols
        walk(c, null, rec ?? encl);
        continue;
      }
      if (t === "class_declaration" || t === "class_definition") {
        const name = c.childForFieldName("name")?.text;
        if (!encl) push(name, "class", c);
        const body = c.childForFieldName("body");
        if (body && name) walk(body, name, encl);
        continue;
      }
      if (t === "method_definition") {
        const name = c.childForFieldName("name")?.text;
        const rec = push(cls && name ? `${cls}.${name}` : name, "method", c);
        walk(c, null, rec ?? encl);
        continue;
      }
      if (t === "variable_declarator" && !isPy) {
        const value = c.childForFieldName("value");
        if (value && FN_VALUE.has(value.type) && !encl) {
          const rec = push(c.childForFieldName("name")?.text, "function", c);
          walk(value, null, rec ?? encl);
          continue;
        }
        walk(c, cls, encl);
        continue;
      }
      walk(c, cls, encl); // descend everything else (statements, blocks, exports)
    }
  };
  walk(root, null, null);
  return { defs, calls };
}

/**
 * Upgrade a built graph's symbols to AST accuracy in place. Returns how many
 * files were enriched (0 = tree-sitter unavailable → regex names remain).
 */
export async function enrichGraphSymbols(g: CodeGraph): Promise<number> {
  ready ??= loadLanguages();
  const langs = await ready;
  if (!langs) return 0;
  const parser = langs.get("__parser") as { setLanguage(l: unknown): void; parse(s: string): { rootNode: TNode } | null };
  let enriched = 0;
  for (const node of g.nodes) {
    const key = langKey(node.id);
    if (!key || !langs.has(key)) continue;
    try {
      parser.setLanguage(langs.get(key));
      const tree = parser.parse(readFileSync(join(g.root, node.id), "utf8"));
      if (!tree) continue;
      const { defs, calls } = collect(tree.rootNode, key === "py");
      if (!defs.length && !calls.length) continue;
      if (defs.length) {
        node.symbolsDetail = defs;
        node.symbols = defs.map((d) => d.name).slice(0, 40);
      }
      node.callSites = calls;
      enriched++;
    } catch {
      /* this one file keeps its regex symbols — fail-open per file */
    }
  }
  return enriched;
}

// ── Phase C: name-match call edges with HONEST confidence labels ─────────────
// The layer CALM measurably wins at (plan 13 §9) — rebuilt on our rules:
//  • bare foo()      → matched against project FUNCTION + CLASS defs named foo
//  • member x.foo()  → matched ONLY against METHOD defs `*.foo` (a bare function
//    would be a receiver guess — that is how console.log→ourLog noise happens)
//  • 1 candidate → "inferred" · 2..4 → "textual" (one edge each) · >4 → skipped
//    (a name that common carries no signal). Never "resolved" — that tier needs
//    a compiler (Phase D). Self-edges (recursion) are dropped as noise.

export interface CallEdge {
  fromFile: string;
  /** enclosing def at the call site, null = module level */
  fromSymbol: string | null;
  toFile: string;
  toSymbol: string;
  line: number;
  confidence: "textual" | "inferred";
  /** identical from→to pairs merged; count keeps the true call-site tally */
  count: number;
}

const MAX_CANDIDATES = 4;

/** Resolve every collected call site against the project's defs. Pure. */
export function resolveCalls(g: CodeGraph): CallEdge[] {
  type Def = { file: string; symbol: string };
  const bare = new Map<string, Def[]>(); // functions + classes by name
  const methods = new Map<string, Def[]>(); // methods by short name (after "Class.")
  for (const n of g.nodes) {
    for (const d of n.symbolsDetail ?? []) {
      if (d.kind === "method") {
        const short = d.name.split(".").pop() as string;
        methods.set(short, [...(methods.get(short) ?? []), { file: n.id, symbol: d.name }]);
      } else {
        bare.set(d.name, [...(bare.get(d.name) ?? []), { file: n.id, symbol: d.name }]);
      }
    }
  }
  const merged = new Map<string, CallEdge>();
  for (const n of g.nodes) {
    for (const c of n.callSites ?? []) {
      const pool = (c.member ? methods : bare).get(c.name);
      if (!pool || pool.length > MAX_CANDIDATES) continue;
      const confidence: CallEdge["confidence"] = pool.length === 1 ? "inferred" : "textual";
      for (const d of pool) {
        if (d.file === n.id && d.symbol === (c.enclosing ?? "")) continue; // recursion
        const key = `${n.id}|${c.enclosing ?? ""}|${d.file}|${d.symbol}`;
        const prev = merged.get(key);
        if (prev) prev.count++;
        else merged.set(key, { fromFile: n.id, fromSymbol: c.enclosing, toFile: d.file, toSymbol: d.symbol, line: c.line, confidence, count: 1 });
      }
    }
  }
  return [...merged.values()];
}
