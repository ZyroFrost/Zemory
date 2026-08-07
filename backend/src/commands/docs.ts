// `zemory plan|docs|changelog <ls|search|show>` — read-only search over the
// derived docs index (.md is the source, DB is the index — HP điều 3).
import { join, relative } from "node:path";
import { currentProjectRoot, harnessPathsAt } from "../core/config.js";
import { listDocs, listToc, searchSections, showSection } from "../docs/plan.js";
import { listEntries, searchChangelog } from "../docs/changelog.js";
import { flagValue, positionalArgs } from "./_shared.js";

/** Tách truy vấn khỏi cờ — GIÁ TRỊ của cờ phải bị loại, không được rơi vào truy vấn.
 *
 *  Lỗi đã sống thật (bắt 2026-08-02 ngay khi tra sổ): `changelog search "x" --limit 3` đi tìm
 *  chuỗi `"x 3"`. Tệ hơn việc bỏ qua cờ, vì kết quả vẫn trông như một câu trả lời bình thường
 *  — cùng họ với lỗi đã vá cho `memory search` sáng cùng ngày, chỉ khác bề mặt. */
function searchArgs(rest: string[]): { q: string; limit?: number } {
  const q = positionalArgs(rest, new Set(["--limit"])).join(" ");
  const raw = Number(flagValue(rest, "--limit"));
  return { q, limit: Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : undefined };
}

export async function cmdPlan(args: string[]): Promise<void> {
  const sub = args[0];
  const root = currentProjectRoot();

  if (sub === "ls") {
    // Mặc định lấy theo MARKER (N2): `plan ls` không có đối số trên repo đặt harness ở
    // `harness/` từng tra `docs/plan/00_overview.md` — một đường không tồn tại, rồi in
    // "index rỗng, chạy reindex" nên trông như lỗi chỉ mục thay vì lỗi tra sai chỗ.
    // Ghép bằng `join` (separator của OS) để KHỚP dạng đường index đang lưu — đo 2026-08-07:
    // index của repo này lưu `docs\plan\…`, nên chuẩn hoá sang `/` ở đây làm lệnh im lặng
    // in "index rỗng, chạy reindex" trong khi chỉ mục vẫn đủ. Xem `cmdReindex`.
    const docPath = args[1] ? args[1] : join(relative(root, harnessPathsAt(root).plan), "00_overview.md");
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
    const { q, limit } = searchArgs(rest);
    if (!q) {
      console.log("usage: zemory plan search <query> [--all] [--limit N]");
      return;
    }
    const hits = searchSections(q, { project: all ? undefined : root, limit });
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
  const root = currentProjectRoot();
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
  const root = currentProjectRoot();
  if (sub === "ls") {
    const rows = listEntries(root);
    console.log(`zemory changelog — ${rows.length} entr(ies)`);
    for (const r of rows) {
      const relation = r.supersedes_id ? ` → thay #${r.supersedes_id}` : "";
      console.log(`  #${r.id} [${r.date ?? "—"}] ${r.title}${r.archived ? " (archived)" : ""}${relation}`);
    }
    return;
  }
  if (sub === "search") {
    const rest = args.slice(1);
    const all = rest.includes("--all");
    const { q, limit } = searchArgs(rest);
    if (!q) {
      console.log("usage: zemory changelog search <query> [--all] [--limit N]");
      return;
    }
    const hits = searchChangelog(q, { project: all ? undefined : root, limit });
    console.log(`zemory changelog search — "${q}"`);
    for (const h of hits) {
      // Một quyết định đã bị đảo phải NÓI RA ngay ở dòng kết quả. Trước 2026-08-02 nó im
      // lặng: search trả phán quyết 29/07 ("chuẩn mới cho cowork thôi") y như luật còn
      // sống, trong khi 31/07 đã lật — phiên sau đọc trúng dòng đó là làm sai.
      const dead = h.supersededBy
        ? `\n     ⚠ ĐÃ BỊ THAY bởi #${h.supersededBy}${h.supersededDate ? ` (${h.supersededDate})` : ""} — đọc bản đó trước khi tin dòng này.`
        : "";
      console.log(`  #${h.id} [${h.date ?? "—"}] ${h.title}\n     ${h.snippet}${dead}`);
    }
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
