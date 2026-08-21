// `zemory graph <impact|callers|fitness|docs|export>` — the derived code/docs
// graph (HP điều 13). Advisory, 0 LLM except the opt-in --semantic overlay.
import { writeFileSync } from "node:fs";
import { currentProjectRoot } from "../core/config.js";
import { buildCodeGraph, fileImpact, graphFitness, matchFileId, shortestPathEdges, stampEdgeIds, topHubs, HUB_FANIN } from "../memory/graph/graph.js";
import { enrichGraphSymbols, resolveCalls } from "../memory/graph/graph-symbols.js";
import { buildTouchIndex, touchesFor } from "../memory/graph/graph-memory.js";
import { buildSeamEdges } from "../memory/graph/graph-seam.js";
import { buildDocsGraph } from "../memory/graph/graph-docs.js";
import { semanticEdges } from "../memory/graph/graph-semantic.js";
import { listKnownProjects } from "../projects.js";
import { flagValue } from "./_shared.js";

export async function cmdGraph(args: string[]): Promise<void> {
  const sub = args[0];
  const root = currentProjectRoot();
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
    // api seam (plan 13 §4): FE↔BE talk over HTTP, so the import graph has NO edge between
    // the two shores — this is the blast radius imports cannot see. Labeled [textual]:
    // it is a route-string match, not a typed contract (điều 13).
    try {
      const seams = buildSeamEdges(root, g.nodes);
      const callsOut = seams.filter((s) => s.from === r.file);
      const calledBy = seams.filter((s) => s.to === r.file);
      if (callsOut.length) {
        console.log(`  calls backend over HTTP (${callsOut.length}) [api · textual]:`);
        for (const s of callsOut) console.log(`    → ${s.to}  (${s.routes.join(" · ")})`);
      }
      if (calledBy.length) {
        console.log(`  called from the frontend over HTTP (${calledBy.length}) [api · textual] — a route change here breaks these:`);
        for (const s of calledBy) console.log(`    ← ${s.from}  (${s.routes.join(" · ")})`);
      }
    } catch {
      /* fail-open: seam hỏng thì impact vẫn đủ dùng bằng imports */
    }
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
    // "God node" theo TỔNG BẬC (fan-in + fan-out) — hấp thụ từ khảo sát Graphify 2026-08-21:
    // hubs ở trên chỉ xếp theo fan-in (ai bị import nhiều), còn node vừa bị gọi nhiều vừa gọi
    // nhiều mới là chỗ mọi thứ đi QUA. Số per-node vốn có sẵn; đây chỉ là bản in xếp hạng.
    const gods = topHubs(g, 5).filter((h) => h.fanIn + h.fanOut > 0);
    if (gods.length) {
      console.log(`  god-nodes (tổng bậc): ${gods.map((h) => `${h.id} (${h.fanIn}↓/${h.fanOut}↑)`).join(" · ")}`);
    }
    console.log(f.passed ? "  PASS" : "  FAIL");
    if (args.includes("--gate") && !f.passed) process.exitCode = 1;
    return;
  }
  if (sub === "path") {
    // Hấp thụ từ Graphify (user chốt 2026-08-21): "X liên quan Y qua đường nào" — lỗ
    // traceability đa-hop plan 13 §1 tự nhận. BFS trên đúng 3 lớp cạnh file-level đang có
    // (imports khai báo · calls suy luận · api seam FE↔BE); mỗi bước in LOẠI + HẠNG cạnh —
    // giữ luật điều 13: suy luận không bao giờ giả dạng khai báo, kể cả trong một đường đi.
    const qa = args[1];
    const qb = args[2];
    if (!qa || !qb) {
      console.log("usage: zemory graph path <fileA> <fileB>");
      console.log("  Đường NGẮN NHẤT nối hai file qua imports · calls · api seam (không hướng, in chiều thật).");
      return;
    }
    const g = buildCodeGraph(root);
    await enrichGraphSymbols(g);
    const pick = (q: string): string | null => {
      const m = matchFileId(g, q);
      if (m.id) return m.id;
      if (m.candidates.length) {
        console.log(`zemory graph path — "${q}" is ambiguous, pick one:`);
        for (const c of m.candidates) console.log(`  ${c}`);
      } else {
        console.log(`zemory graph path — no source file matches "${q}" under ${root}`);
      }
      process.exitCode = 1;
      return null;
    };
    const a = pick(qa);
    if (!a) return;
    const b = pick(qb);
    if (!b) return;
    const calls = resolveCalls(g);
    const seams = buildSeamEdges(root, g.nodes);
    const edges = [
      ...g.edges.map((e) => ({ from: e.from, to: e.to, type: "imports", kind: "declared" as const })),
      ...calls.map((c) => ({ from: c.fromFile, to: c.toFile, type: "calls", kind: "inferred" as const })),
      ...seams.map((se) => ({ from: se.from, to: se.to, type: "api", kind: "inferred" as const })),
    ];
    const path = shortestPathEdges(edges, a, b);
    if (path === null) {
      console.log(`zemory graph path — ${a} và ${b} KHÔNG nối được qua 3 lớp cạnh hiện có (imports · calls · api).`);
      console.log("  Không nối ≠ không liên quan: quan hệ ngữ nghĩa/route viết động nằm ngoài tầm graph (điều 13).");
      process.exitCode = 1;
      return;
    }
    console.log(`zemory graph path — ${a} → ${b}  (${path.length} bước)`);
    for (const s of path) {
      const arrow = s.forward ? "→" : "←";
      console.log(`  ${s.from} ${arrow} (${s.type}${s.kind === "inferred" ? " · inferred" : ""}) ${arrow} ${s.to}`);
    }
    return;
  }
  // ── PHÍA TIÊU THỤ của edge id (plan 13 §4) ─────────────────────────────────
  //
  // `eid` sinh ra để một khẳng định DẪN ĐƯỢC NGUỒN ("A gọi B — edge:9f2c…"), nhưng suốt
  // từ 07-27 mới chỉ có phía PHÁT: không ai kiểm lại được cạnh được dẫn có thật không, nên
  // trên thực tế nó chưa mua được gì. Lệnh này đóng vòng: dán id vào, máy nói cạnh đó có
  // thật không, thuộc HẠNG nào (khai báo hay suy luận — điều 13 cấm trộn), và nối ai với ai.
  //
  // Đây cũng là *cited-edge validity*: đưa N id thì in luôn tỉ lệ hợp lệ, để đo được một
  // agent dẫn nguồn thật hay dẫn bừa (điều 12 — số phải đo được, không counterfactual).
  if (sub === "edge") {
    const ids = args.slice(1).filter((a) => !a.startsWith("--"));
    if (!ids.length) {
      console.log("usage: zemory graph edge <eid> [<eid>…]");
      console.log("  Kiểm một (hoặc nhiều) edge id được TRÍCH DẪN: có thật không · hạng gì · nối ai với ai.");
      console.log("  Id lấy từ `zemory graph export` (trường `eid`) hoặc payload /code-graph của UI.");
      process.exitCode = 1;
      return;
    }
    const g = buildCodeGraph(root);
    await enrichGraphSymbols(g);
    const calls = resolveCalls(g);
    const edges = stampEdgeIds([
      ...g.edges.map((e) => ({ from: e.from, to: e.to, type: "imports", kind: "declared" as const })),
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
      ...buildSeamEdges(root, g.nodes).map((se) => ({
        from: se.from,
        to: se.to,
        type: "api",
        kind: "inferred" as const,
        confidence: se.confidence,
        toSymbol: se.routes.join(","),
      })),
    ]);
    const byId = new Map(edges.map((e) => [e.eid, e]));
    let valid = 0;
    console.log(`zemory graph edge — ${root} (${edges.length} cạnh trong graph)`);
    for (const raw of ids) {
      const id = raw.replace(/^edge:/, "").trim().toLowerCase();
      const e = byId.get(id);
      if (!e) {
        console.log(`  ✗ ${id} — KHÔNG có cạnh nào mang id này`);
        continue;
      }
      valid++;
      const hang = e.kind === "declared" ? "KHAI BÁO" : `SUY LUẬN${"confidence" in e ? ` (${(e as { confidence?: string }).confidence})` : ""}`;
      console.log(`  ✓ ${id} — [${e.type} · ${hang}] ${e.from} → ${e.to}`);
    }
    if (ids.length > 1) {
      const pct = ((valid / ids.length) * 100).toFixed(0);
      console.log(`  cited-edge validity: ${valid}/${ids.length} (${pct}%)`);
    }
    if (valid !== ids.length) process.exitCode = 1;
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
      const seams = buildSeamEdges(r, g.nodes);
      const touch = buildTouchIndex(r);
      const docs = buildDocsGraph(r);
      // Inferred overlay (opt-in): ONNX embedding runs HERE in the CLI process,
      // never on the daemon (HP điều 9 fail-open · edges labeled inferred, HP điều 13).
      const sem = semantic ? await semanticEdges(g) : [];
      return {
        version: 2,
        root: r,
        generatedAt: new Date().toISOString(),
        stats: { ...g.stats, calls: calls.length, api: seams.length, digests: touch.digests, docs: docs.stats.docs, semantic: sem.length },
        nodes: g.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          dir: n.dir,
          slot: n.slot,
          loc: n.loc,
          fanIn: n.fanIn,
          fanOut: n.fanOut,
          symbols: n.symbolsDetail ?? n.symbols.map((s) => ({ name: s, kind: "function", line: 0, endLine: 0 })),
          // Ngôn ngữ mở rộng CHƯA có lớp cạnh import (2026-08-21): phải phơi ra contract, không
          // thì consumer thấy fan-in 0 rồi đọc thành "mồ côi" — trong khi sự thật là "chưa đo
          // được". Đúng loại nói-dối-lặng điều 13 cấm; `orphans` bên dưới cũng loại chúng.
          ...(n.noImportLayer ? { noImportLayer: true } : {}),
          touchedBy: touchesFor(touch, n.id).sessions,
        })),
        // `eid` đóng dấu SAU khi đã gộp đủ ba lớp (imports · calls · semantic) — đóng ở
        // từng lớp thì chắc chắn sót một lớp, mà sót cạnh nào thì cạnh đó không dẫn nguồn
        // được (plan 13 §4). Trước bản này CHỈ payload UI (`/code-graph`) có eid, còn
        // `graph export` — tức chính CONTRACT mà consumer đọc — thì không: nên "trích dẫn
        // cạnh" là chuyện không ai làm nổi từ ngoài. Kiểm lại bằng `zemory graph edge <eid>`.
        edges: stampEdgeIds([
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
          // api seam (plan 13 §4): FE↔BE qua HTTP — import-graph mù hoàn toàn giữa hai bờ.
          // routes[] đưa vào toSymbol để eid phân biệt được các cặp có nhiều nhóm route.
          ...seams.map((se) => ({
            from: se.from,
            to: se.to,
            type: "api",
            kind: "inferred" as const,
            confidence: se.confidence,
            routes: se.routes,
            count: se.count,
            toSymbol: se.routes.join(","),
          })),
          ...sem,
        ]),
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
  console.log("usage: zemory graph <impact <file> | path <fileA> <fileB> | callers <symbol> | fitness [--gate] | docs | export [--all] [--out <file.json>]>");
  console.log("  impact  — advisory blast-radius for one file (importers, transitive reach, hub flag, past sessions)");
  console.log("  callers — who calls this function/method (name-match, confidence-labeled)");
  console.log("  fitness — file-graph health metrics with gates (hub% · isolated% · util purity)");
  console.log("  docs    — declared references between harness docs (+ supersede)");
  console.log("  export  — versioned graph.json contract; --all cross-project · --semantic adds inferred neighbour edges");
}
