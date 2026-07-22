// `zemory graph <impact|callers|fitness|docs|export>` — the derived code/docs
// graph (HP điều 13). Advisory, 0 LLM except the opt-in --semantic overlay.
import { writeFileSync } from "node:fs";
import { findProjectRoot } from "../core/config.js";
import { buildCodeGraph, fileImpact, graphFitness, HUB_FANIN } from "../memory/graph/graph.js";
import { enrichGraphSymbols, resolveCalls } from "../memory/graph/graph-symbols.js";
import { buildTouchIndex, touchesFor } from "../memory/graph/graph-memory.js";
import { buildDocsGraph } from "../memory/graph/graph-docs.js";
import { semanticEdges } from "../memory/graph/graph-semantic.js";
import { listKnownProjects } from "../projects.js";
import { flagValue } from "./_shared.js";

export async function cmdGraph(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "impact") {
    const query = args[1];
    if (!query) {
      console.log("usage: zemory graph impact <file>");
      console.log("  Who imports this file (direct + transitive) + what it imports — data to weigh");
      console.log("  BEFORE editing a hot file. Advisory only; nothing is ever blocked.");
      return;
    }
    const g = buildCodeGraph(root);
    await enrichGraphSymbols(g); // AST names + lines when available (fail-open)
    const r = fileImpact(g, query);
    if (!r.file && r.candidates.length) {
      console.log(`zemory graph impact — "${query}" is ambiguous, pick one:`);
      for (const c of r.candidates) console.log(`  ${c}`);
      process.exitCode = 1;
      return;
    }
    if (!r.file) {
      console.log(`zemory graph impact — no source file matches "${query}" under ${root}`);
      process.exitCode = 1;
      return;
    }
    console.log(`zemory graph impact — ${r.file}  (${r.loc} loc · ${r.symbols.length} symbol(s))`);
    console.log(`  fan-in ${r.fanIn} · fan-out ${r.fanOut}${r.isHub ? `  ⚠ HUB (fan-in >= ${HUB_FANIN}) — a change here fans wide` : ""}`);
    if (r.symbolsDetail?.length) {
      // Phase C: per-symbol caller counts from name-match call edges.
      const edges = resolveCalls(g);
      const callers = new Map<string, number>();
      for (const e of edges) if (e.toFile === r.file) callers.set(e.toSymbol, (callers.get(e.toSymbol) ?? 0) + e.count);
      const top = r.symbolsDetail
        .slice(0, 10)
        .map((s) => `${s.name} (${s.kind}, L${s.line}${callers.has(s.name) ? `, ←${callers.get(s.name)}` : ""})`)
        .join(" · ");
      console.log(`  defines: ${top}${r.symbolsDetail.length > 10 ? " · …" : ""}`);
    }
    if (r.importers.length) {
      console.log(`  imported by (${r.importers.length}):`);
      for (const f of r.importers) console.log(`    ← ${f}`);
    } else {
      console.log("  imported by: nobody (entry or isolated file)");
    }
    if (r.transitiveImporters.length) {
      console.log(`  reaches transitively (${r.transitiveImporters.length}): ${r.transitiveImporters.slice(0, 8).join(", ")}${r.transitiveImporters.length > 8 ? ", …" : ""}`);
    }
    if (r.imports.length) console.log(`  imports (${r.imports.length}): ${r.imports.join(", ")}`);
    // Graph ↔ MEMORY (plan 13 §4 `touches`): which past sessions worked on this file.
    // This is the part a code-only tool cannot answer.
    const touch = touchesFor(buildTouchIndex(root), r.file);
    if (touch.count) {
      console.log(`  touched by ${touch.count} past session(s): ${touch.sessions.slice(0, 3).join(" · ")}${touch.count > 3 ? " · …" : ""}`);
      console.log(`    → \`zemory memory digest <session>\` to see what was decided there`);
    }
    return;
  }
  if (sub === "callers") {
    const query = args[1];
    if (!query) {
      console.log("usage: zemory graph callers <symbol>   (a function name, or Class.method)");
      console.log("  Every call site that name-matches the symbol, with its enclosing function and an");
      console.log("  HONEST confidence label: inferred = only one definition matches · textual = the");
      console.log("  name is defined in several places (each listed). Compiler-verified comes later.");
      return;
    }
    const g = buildCodeGraph(root);
    const n = await enrichGraphSymbols(g);
    if (n === 0) {
      console.log("zemory graph callers — tree-sitter unavailable (AST layer off); no call edges to search.");
      process.exitCode = 1;
      return;
    }
    // Where is it defined? (exact symbol, or short method name → Class.method)
    const defs: { file: string; name: string; kind: string; line: number }[] = [];
    for (const node of g.nodes) {
      for (const d of node.symbolsDetail ?? []) {
        if (d.name === query || d.name.endsWith("." + query)) defs.push({ file: node.id, name: d.name, kind: d.kind, line: d.line });
      }
    }
    if (!defs.length) {
      console.log(`zemory graph callers — no project symbol named "${query}".`);
      process.exitCode = 1;
      return;
    }
    const wanted = new Set(defs.map((d) => `${d.file}|${d.name}`));
    const hits = resolveCalls(g).filter((e) => wanted.has(`${e.toFile}|${e.toSymbol}`));
    console.log(`zemory graph callers — ${query}`);
    for (const d of defs) console.log(`  defined: ${d.file} :: ${d.name} (${d.kind}, L${d.line})`);
    if (!hits.length) {
      console.log("  no project call sites found (entry-only, dynamic, or called from outside).");
      return;
    }
    for (const e of hits.sort((a, b) => a.fromFile.localeCompare(b.fromFile))) {
      console.log(`  ← ${e.fromFile} :: ${e.fromSymbol ?? "(module)"} (L${e.line}) [${e.confidence}]${e.count > 1 ? ` ×${e.count}` : ""}`);
    }
    return;
  }
  if (sub === "fitness") {
    const g = buildCodeGraph(root);
    const f = graphFitness(g);
    console.log(`zemory graph fitness — ${root}  (${g.stats.files} file(s) · ${g.stats.edges} import edge(s))`);
    for (const m of f.metrics) {
      console.log(`  ${m.passed ? "✓" : "✗"} ${m.metric} = ${m.value}${m.metric.endsWith("pct") ? "%" : ""} (max ${m.threshold}${m.metric.endsWith("pct") ? "%" : ""}) — ${m.detail}`);
    }
    if (f.hubs.length) {
      console.log(`  hubs: ${f.hubs.slice(0, 5).map((h) => `${h.id} (${h.fanIn})`).join(" · ")}${f.hubs.length > 5 ? " · …" : ""}`);
    }
    console.log(f.passed ? "  PASS" : "  FAIL");
    if (args.includes("--gate") && !f.passed) process.exitCode = 1;
    return;
  }
  if (sub === "export") {
    // CONTRACT seam (plan 13 §5): one versioned JSON any consumer can read —
    // code nodes + DECLARED edges (imports) + INFERRED edges (name-match calls,
    // optional semantic neighbours) + fitness + the memory `touches` layer + the
    // docs graph (references + supersede). `--all` walks EVERY known project
    // (registry) into one { projects: [...] } bundle (cross-project).
    const buildOne = async (r: string, semantic: boolean) => {
      const g = buildCodeGraph(r);
      await enrichGraphSymbols(g);
      const calls = resolveCalls(g);
      const touch = buildTouchIndex(r);
      const docs = buildDocsGraph(r);
      // Inferred overlay (opt-in): ONNX embedding runs HERE in the CLI process,
      // never on the daemon (HP điều 9 fail-open · edges labeled inferred, HP điều 13).
      const sem = semantic ? await semanticEdges(g) : [];
      return {
        version: 2,
        root: r,
        generatedAt: new Date().toISOString(),
        stats: { ...g.stats, calls: calls.length, digests: touch.digests, docs: docs.stats.docs, semantic: sem.length },
        nodes: g.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          dir: n.dir,
          slot: n.slot,
          loc: n.loc,
          fanIn: n.fanIn,
          fanOut: n.fanOut,
          symbols: n.symbolsDetail ?? n.symbols.map((s) => ({ name: s, kind: "function", line: 0, endLine: 0 })),
          touchedBy: touchesFor(touch, n.id).sessions,
        })),
        edges: [
          ...g.edges.map((e) => ({ from: e.from, to: e.to, type: "imports", kind: "declared" as const })),
          // Name-match calls are GUESSES with a confidence label — điều 13 puts
          // that ladder INSIDE the inferred class; exporting them as "declared"
          // was exactly the masquerade it forbids (audit 2026-07-21).
          ...calls.map((c) => ({
            from: c.fromFile,
            to: c.toFile,
            type: "calls",
            kind: "inferred" as const,
            fromSymbol: c.fromSymbol,
            toSymbol: c.toSymbol,
            confidence: c.confidence,
            count: c.count,
          })),
          ...sem,
        ],
        orphans: g.orphans,
        fitness: graphFitness(g),
        docs,
      };
    };
    const semantic = args.includes("--semantic");
    let out: unknown;
    if (args.includes("--all")) {
      const projects: Awaited<ReturnType<typeof buildOne>>[] = [];
      for (const p of listKnownProjects()) {
        try {
          const e = await buildOne(p.root, semantic);
          if (e.stats.files || e.docs.stats.docs) projects.push(e); // skip empty/dead roots
        } catch {
          /* skip a project that fails to build */
        }
      }
      out = { version: 2, generatedAt: new Date().toISOString(), projects };
    } else {
      out = await buildOne(root, semantic);
    }
    const outPath = flagValue(args, "--out");
    const jsonOut = JSON.stringify(out, null, 2);
    if (outPath) {
      writeFileSync(outPath, jsonOut);
      const o = out as { projects?: unknown[]; nodes?: unknown[]; edges?: unknown[] };
      const summary = o.projects ? `${o.projects.length} project(s)` : `${o.nodes?.length} node · ${o.edges?.length} edge`;
      console.log(`zemory graph export — wrote ${outPath} (${summary} · schema v2)`);
    } else {
      console.log(jsonOut);
    }
    return;
  }
  if (sub === "docs") {
    // The docs graph (plan 13 §4 — the "phụ" companion to the code graph):
    // which harness docs reference which. 0 LLM, parsed from the markdown links.
    const dg = buildDocsGraph(root);
    const short = (id: string) => id.replace(/^docs\/(agent|plan)\//, "");
    console.log(`zemory graph docs — ${root}  (${dg.stats.docs} doc · ${dg.stats.references} reference · ${dg.stats.supersede} supersede)`);
    const byFrom = new Map<string, Set<string>>();
    for (const e of dg.edges) {
      if (e.kind !== "references") continue;
      let s = byFrom.get(e.from);
      if (!s) {
        s = new Set();
        byFrom.set(e.from, s);
      }
      s.add(e.to);
    }
    for (const from of [...byFrom.keys()].sort()) {
      const tos = [...byFrom.get(from)!].map(short).sort();
      console.log(`  ${short(from)} → ${tos.join(", ")}`);
    }
    return;
  }
  console.log("usage: zemory graph <impact <file> | callers <symbol> | fitness [--gate] | docs | export [--all] [--out <file.json>]>");
  console.log("  impact  — advisory blast-radius for one file (importers, transitive reach, hub flag, past sessions)");
  console.log("  callers — who calls this function/method (name-match, confidence-labeled)");
  console.log("  fitness — file-graph health metrics with gates (hub% · isolated% · util purity)");
  console.log("  docs    — declared references between harness docs (+ supersede)");
  console.log("  export  — versioned graph.json contract; --all cross-project · --semantic adds inferred neighbour edges");
}
