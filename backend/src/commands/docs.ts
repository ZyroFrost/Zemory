// `zemory plan|docs|changelog <ls|search|show>` — read-only search over the
// derived docs index (.md is the source, DB is the index — HP điều 3).
import { join } from "node:path";
import { findProjectRoot } from "../core/config.js";
import { listDocs, listToc, searchSections, showSection } from "../docs/plan.js";
import { listEntries, searchChangelog } from "../docs/changelog.js";

export async function cmdPlan(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();

  if (sub === "ls") {
    const docPath = args[1] ? args[1] : join("docs", "plan", "00_overview.md");
    const toc = listToc(docPath, root);
    if (!toc.length) {
      console.log(`zemory plan: no sections for ${docPath} (index rỗng — chạy \`zemory reindex\`; hoặc đọc thẳng file .md).`);
      return;
    }
    console.log(`zemory plan ls — ${docPath}`);
    for (const t of toc) console.log(`  ${"  ".repeat(t.level - 1)}#${t.id} ${t.heading}`);
    return;
  }
  if (sub === "show") {
    const m = showSection(Number(args[1])) as { path: string; level: number; heading: string | null; body: string } | undefined;
    if (!m) {
      console.log(`zemory plan: no section #${args[1]}`);
      return;
    }
    console.log(`#${args[1]} ${m.path} — ${"#".repeat(m.level)} ${m.heading ?? "(preamble)"}`);
    console.log("---");
    console.log(m.body);
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const q = rest.filter((a) => !a.startsWith("--")).join(" ");
    if (!q) {
      console.log("usage: zemory plan search <query> [--all]");
      return;
    }
    const hits = searchSections(q, { project: all ? undefined : root });
    console.log(`zemory plan search — "${q}" (${all ? "all projects" : "this project"})`);
    if (!hits.length) {
      console.log("  no matches.");
      return;
    }
    for (const h of hits) console.log(`  #${h.id} [${h.path}] ${h.heading ?? ""}\n     ${h.snippet}`);
    return;
  }
  console.log(
    [
      "zemory plan <subcommand>   (.md là NGUỒN; DB = index dẫn xuất — dựng lại bằng `zemory reindex`)",
      "",
      "  ls [doc]           table of contents (from the search index)",
      "  show <#id>         print a section's body",
      "  search <q> [--all] FTS over sections (heading-weighted)",
    ].join("\n"),
  );
}

export async function cmdDocs(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "ls") {
    const docs = listDocs(root);
    console.log(`zemory docs — ${docs.length} doc(s) trong search index`);
    for (const d of docs) console.log(`  #${d.id} [${d.kind}] ${d.path} (${d.sections} sections)`);
    return;
  }
  console.log(
    [
      "zemory docs <subcommand>   (.md là NGUỒN, file wins; DB = search index dẫn xuất)",
      "",
      "  ls       list docs currently in the search index (kind · sections)",
      "  (thêm/sửa/xoá docs = sửa file .md trực tiếp; `zemory reindex` dựng lại index)",
    ].join("\n"),
  );
}

export async function cmdChangelog(args: string[]): Promise<void> {
  const sub = args[0];
  const root = findProjectRoot() ?? process.cwd();
  if (sub === "ls") {
    const rows = listEntries(root);
    console.log(`zemory changelog — ${rows.length} entr(ies)`);
    for (const r of rows) {
      const relation = r.supersedes_id ? ` → supersedes #${r.supersedes_id}` : "";
      console.log(`  #${r.id} [${r.date ?? "—"}] ${r.title}${r.archived ? " (archived)" : ""}${relation}`);
    }
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const q = rest.filter((a) => !a.startsWith("--")).join(" ");
    if (!q) {
      console.log("usage: zemory changelog search <query> [--all]");
      return;
    }
    const hits = searchChangelog(q, { project: all ? undefined : root });
    console.log(`zemory changelog search — "${q}"`);
    for (const h of hits) console.log(`  #${h.id} [${h.date ?? "—"}] ${h.title}\n     ${h.snippet}`);
    if (!hits.length) console.log("  no matches.");
    return;
  }
  console.log(
    [
      "zemory changelog <subcommand>   (.md là NGUỒN; DB = search index dẫn xuất)",
      "",
      "  ls               list entries in the index (newest first)",
      "  search <q> [--all] FTS over entries",
      "  (thêm entry = sửa 06_CHANGES.md trực tiếp; `zemory reindex` dựng lại index)",
    ].join("\n"),
  );
}

/** Rebuild the docs search index from the .md files (FILE WINS — read-only,
 *  never writes .md). Indexes docs/plan/*.md sections + 06_CHANGES.md entries. */
