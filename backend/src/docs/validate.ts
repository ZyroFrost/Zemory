// `harness` validate — health checks on the docs harness itself (the part
// agentmemory/lean-ctx don't have): broken internal links, a changelog due for
// DB-backed archiving, and supersede bookkeeping.
// Read-only, deterministic, no LLM.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Context } from "../core/types.js";
import { foreignLayout } from "./conform.js";
import { isClosedItemLine } from "./archive.js";
import { pathsCheck, pathsSummary, type PathsReport } from "./paths.js";
import { noGateIssues } from "./no-gate.js";

export interface ValidateIssue {
  level: "error" | "warn" | "info";
  msg: string;
}
export interface ValidateReport {
  issues: ValidateIssue[];
  ok: boolean;
  /** plan/21 — dead-path check, ADVISORY. Optional so every existing consumer keeps its shape. */
  paths?: PathsReport;
}

/** Plan size caps (02_RULES §Tài liệu — "plan phải gọn"). One message per breach; empty = within the caps. */
export function planSizeIssues(planDir: string, specMax: number, planMax: number): string[] {
  if (!existsSync(planDir)) return [];
  const out: string[] = [];
  let total = 0;
  const big: string[] = [];
  for (const f of readdirSync(planDir).filter((x) => x.toLowerCase().endsWith(".md")).sort()) {
    const txt = readFileSync(join(planDir, f), "utf8");
    const n = txt.split("\n").length - (txt.endsWith("\n") ? 1 : 0); // `wc -l` count — the number a reader sees
    total += n;
    if (n > specMax) big.push(`${f} (${n})`);
  }
  if (big.length) out.push(`plan: ${big.length} spec(s) over ${specMax} lines: ${big.join(" · ")} — keep the CURRENT direction + open points; history goes to 06_CHANGES`);
  if (total > planMax) out.push(`plan: docs/plan is ${total} lines (> ${planMax}) — every session must read it in full; trim it`);
  return out;
}

export function validate(ctx: Context): ValidateReport {
  const issues: ValidateIssue[] = [];
  const projectRoot = ctx.projectRoot;
  const agentDir = ctx.docsDir; // docs/agent
  const docsDir = join(projectRoot, "docs");

  // 1. Broken internal links across every .md under docs/.
  for (const f of walkMd(docsDir)) {
    const text = readFileSync(f, "utf8");
    for (const link of extractLinks(text)) {
      if (/^(https?:|#|mailto:|<)/.test(link)) continue;
      const target = resolve(dirname(f), link.split("#")[0]);
      if (!existsSync(target)) {
        issues.push({ level: "warn", msg: `broken link: ${rel(projectRoot, f)} → ${link}` });
      }
    }
  }

  // 1b. A plan holds SPEC, never open work (02_RULES §Tài liệu). A `- [ ]` in docs/plan is a task living outside the
  // ledger, where `todo verify` and the hand-off never see it (rule audit 2026-10-07; zemory itself carried 5).
  const planHits = planOpenItems(join(agentDir, "..", "plan"));
  if (planHits.length) {
    issues.push({
      level: "error",
      msg: `plan: ${planHits.length} open checkbox(es) in docs/plan — a plan holds spec, open work goes to 05_TODO: ${planHits.slice(0, 4).join(" · ")}`,
    });
  }

  // 1b'. Plans must stay SMALL (user 2026-10-08, from _DB_DataWarehouse: 12.800 plan lines — an agent read them all, the
  // context compacted, re-reading did not fit). The read-everything rule stays; the plans shrink. WARN, not error, while repos
  // trim (user chose "áp từng bước"): a spec over the cap, or the whole plan folder over the total.
  const autogen = planAutogenHits(join(agentDir, "..", "plan"));
  if (autogen.length) {
    issues.push({
      level: "error",
      msg: `plan: ${autogen.length} machine-generated block marker(s) in docs/plan — a plan is text a person writes; write generated tables next to their source and link them: ${autogen.slice(0, 4).join(" · ")}`,
    });
  }
  // Spec cap 500 (user 2026-10-08: "nâng trần 500 luôn đi cho chẳn" — the trimmed specs sat at 330–410 without losing ideas).
  for (const msg of planSizeIssues(join(agentDir, "..", "plan"), ctx.config.thresholds?.plan_spec_lines ?? 500, ctx.config.thresholds?.plan_total_lines ?? 4000)) {
    issues.push({ level: "warn", msg });
  }

  // 1c. Every constitution article must name its machine gate (user 2026-10-07: "mỗi repo nếu có HP riêng phải tự tạo
  // hook cho chính mình… tụi agent quên luật quá nhiều"). The mapping lives in 02_RULES `## Cổng cho hiến pháp` — NOT in
  // the constitution, which only the user edits. A missing row is a warn; a repo agent closes it by building the gate
  // or writing why the article is words-only.
  const hpGap = hpGateGaps(agentDir);
  if (hpGap) issues.push({ level: "warn", msg: hpGap });
  // 1d. Ungated rules stand FIRST so they are not skimmed (user 2026-10-07) — see docs/no-gate.ts.
  for (const m of noGateIssues(agentDir)) issues.push({ level: "warn", msg: `ungated-first: ${m} — run \`zemory gates --write-top\`` });

  // 2. Changelog length (suggest archive).
  const chFile = join(agentDir, "06_CHANGES.md");
  const chMax = ctx.config.thresholds?.changes_lines ?? 400;
  if (existsSync(chFile)) {
    const n = lineCount(chFile);
    if (n > chMax) {
      issues.push({ level: "info", msg: `06_CHANGES.md is ${n} lines (> ${chMax}) — run \`zemory archive\`` });
    }
    const sup = (readFileSync(chFile, "utf8").match(/🔄\s*\*\*Supersede/gu) ?? []).length;
    issues.push({ level: "info", msg: `${sup} supersede marker(s) in changelog` });

    // Entry keys must be unique across BOTH tiers: a supersede clause names a key, and with two
    // entries under one key it links to whichever the parser meets first. Nothing checked this —
    // _DB_DataWarehouse (2026-10-04) carried two `## [2026-10-01a]` and validate reported clean.
    const archFile = join(agentDir, "archive", "06_CHANGES.md");
    // Bare-date keys repeated (`[2026-07-16]`×12) are how entries were written before suffixes, not
    // an error: only a suffixed key (meant to be unique) or a key a supersede clause names is a warn.
    const tiers = [readFileSync(chFile, "utf8"), existsSync(archFile) ? readFileSync(archFile, "utf8") : ""];
    const dups = duplicateKeys(tiers);
    const named = supersededKeys(tiers);
    const hard = dups.filter((d) => /\d[a-z]+$/i.test(d.key) || named.has(d.key));
    const legacy = dups.length - hard.length;
    if (hard.length > 0) {
      issues.push({
        level: "warn",
        msg: `changelog: ${hard.length} duplicate entry key(s): ${hard.map((d) => `[${d.key}]×${d.count}`).join(" · ")} — a supersede clause naming such a key links to the wrong entry; give each entry its own suffix`,
      });
    }
    if (legacy > 0) {
      issues.push({ level: "info", msg: `changelog: ${legacy} bare-date key(s) shared by several older entries — harmless unless a supersede clause names one` });
    }
    // A supersede clause with NO key, or naming a key no entry carries, links to nothing: the old decision keeps reading
    // as live (02_RULES §Changelog). It was only words until 2026-10-07 — the rule audit listed it as machine-checkable.
    // ACTIVE tier only is an error: the archive holds clauses written before this rule (prose, plan sections, a "vế" of
    // an entry) — history, not a defect to fix; it is counted at info level.
    const dangling = danglingSupersedes([tiers[0]], tiers);
    if (dangling.length) {
      issues.push({
        level: "error",
        msg: `changelog: ${dangling.length} supersede clause(s) name no existing entry key: ${dangling.slice(0, 4).join(" · ")} — write the exact key, e.g. \`2026-07-29l\``,
      });
    }
    const oldDangling = tiers[1] ? danglingSupersedes([tiers[1]], tiers).length : 0;
    if (oldDangling) issues.push({ level: "info", msg: `changelog archive: ${oldDangling} older supersede clause(s) without an entry key (written before the rule)` });

    // Per-ENTRY length. The file-level threshold above only says "time to archive";
    // it says nothing about entries that are individually bloated, and those are what
    // make archiving pointless — at keep=180 lines, four 50-line entries fill the whole
    // active window. Measured over 76 real entries (2026-07-29): p50 19 · p75 28 ·
    // p90 40 · max 53, so the median is already fine and the problem is the tail.
    // 30 sits between p75 and p90: it disciplines the tail without fighting a normal
    // entry. ADVISORY on purpose — a hard failure on prose length would block real work,
    // and `validate` runs at every chốt phiên anyway (04_SKILLS §chốt phiên, bước cuối).
    const entryMax = ctx.config.thresholds?.changes_entry_lines ?? 30;
    const long = longEntries(readFileSync(chFile, "utf8"), entryMax);
    if (long.length > 0) {
      const worst = long.slice(0, 3).map((e) => `${e.tag} (${e.lines})`).join(" · ");
      issues.push({
        level: "info",
        msg: `${long.length} changelog entr(ies) > ${entryMax} lines: ${worst}${long.length > 3 ? " …" : ""} — giữ số đo + nguyên nhân, chi tiết thiết kế sang docs/plan/`,
      });
    }
  }

  // 2b. Closed items still sitting in the backlog. The standard is explicit in the
  //     file's own header — "xong → ghi sang 06_CHANGES.md và xoá khỏi đây" — so the
  //     correct count is ZERO. Nothing checked it, and by 2026-07-29 it had reached
  //     107 items = 49.6 KB = 46% of 05_TODO, read into context every session. They
  //     are not a new mechanism's job: a done item belongs in the changelog, and the
  //     archive is only the net that catches what already piled up.
  const todoFile = join(agentDir, "05_TODO.md");
  if (existsSync(todoFile)) {
    const done = closedItems(readFileSync(todoFile, "utf8"));
    if (done > 0) {
      issues.push({
        level: "info",
        msg: `${done} mục ĐÃ XONG (\`[x]\` hoặc \`✅\`) còn trong 05_TODO.md — chuẩn: xong thì ghi sang 06_CHANGES.md rồi xoá khỏi đây (\`zemory archive\` dọn phần đã dồn)`,
      });
    }
  }

  // 3. Repo structure vs the standard (docs/agent/03_STRUCTURE.md). TWO standards:
  //    profile "app" (docs_template/05_app) vs "non-app" (its OWN 03_STRUCTURE —
//    BI/data/docs/design). "§7" used to mean "the non-app standard" back when it
//    was a section inside the app file; it is a separate file now, and each file
//    numbers its own sections, so messages below name the section per profile.
  //    chosen by `profile` in docs/.harness.json. ADVISORY only — reconciling is
  //    agent-assisted (docs/agent/03_STRUCTURE.md §8); zemory never moves files.
  for (const i of checkStructure(projectRoot, ctx.config.profile ?? "app")) issues.push(i);

  // 4. Dead paths (plan/21) — exactly ONE issue, and only ever at level "info". That level is the
  //    contract with the three consumers of this report: checks.ts colours the Features pill from
  //    `issues.filter(level !== "info")`, harness-docs.check() counts the same way, and the CLI
  //    exits non-zero only on `ok === false` (errors). Anything above "info" here would turn the
  //    Features screen amber on every repo with one stale path — the exact regression this check
  //    must not cause. Details live in `zemory paths check`; `--gate` is opt-in there.
  //    Fail-open (điều 9): a failing scan becomes an info line, never a thrown validate().
  let paths: PathsReport | undefined;
  try {
    paths = pathsCheck(ctx);
    issues.push({ level: "info", msg: `${pathsSummary(paths)} — \`zemory paths check\` for the list` });
  } catch (e) {
    issues.push({ level: "info", msg: `paths: check did not run (${(e as Error)?.message ?? String(e)})` });
  }

  return { issues, ok: !issues.some((i) => i.level === "error"), ...(paths ? { paths } : {}) };
}

/** The deliverable folders that satisfy the non-app standard (its 03_STRUCTURE §1). */
const DELIVERABLES = ["reports", "models", "content", "design"];

/**
 * Report how the repo lines up with the standard layout for its profile.
 * APP (§1–6): required = backend/(code) · frontend/ · docs/ · AGENTS.md.
 * NON-APP (its 03 §1): required = docs/ · AGENTS.md · ≥1 deliverable (reports/models/
 * content/design) — no backend/frontend expected. Everything else optional.
 * Build output + secret + .env are gitignored, so not checked. Warn on drift,
 * never fix (docs/agent/03_STRUCTURE.md §8).
 */
function checkStructure(root: string, profile: "app" | "non-app"): ValidateIssue[] {
  const out: ValidateIssue[] = [];
  const has = (p: string) => existsSync(join(root, p));
  /** Repo có dòng code nào chưa — để phân biệt "code đặt sai chỗ" với "chưa có code". */
  const hasAnyCode = (r: string): boolean => {
    const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|php|cs|cpp|c|swift|kt)$/i;
    const SKIP = new Set(["node_modules", ".git", "docs", "docs_template", "dist", "build", ".claude", "attic", "data"]);
    const walk = (dir: string, depth: number): boolean => {
      if (depth > 3) return false;
      let items: { name: string; isDirectory(): boolean }[];
      try {
        items = readdirSync(dir, { withFileTypes: true });
      } catch {
        return false;
      }
      for (const it of items) {
        if (it.isDirectory()) {
          if (SKIP.has(it.name) || it.name.startsWith(".")) continue;
          if (walk(join(dir, it.name), depth + 1)) return true;
        } else if (CODE.test(it.name)) return true;
      }
      return false;
    };
    return walk(r, 0);
  };
  const deliverables = DELIVERABLES.filter((d) => has(d)).map((d) => `${d}/`);

  // ADAPT v2 · N8 — APP/NON-APP chỉ là PRESET, KHÔNG phải chuẩn ép.
  //
  // Repo đã khai bảng ánh xạ riêng (`layout: adapt|foreign`) thì thước đo của nó là CHÍNH
  // BẢNG ĐÓ, không phải `backend/`·`frontend/`. Bản trước không có nhánh này nên mọi repo
  // ngoài đều bị đo bằng chuẩn APP rồi lĩnh cảnh báo "own code not under backend/" — cảnh
  // báo mà người nhận không có cách nào sửa đúng, vì cấu trúc của họ là cố ý.
  // `conform` mới là chỗ so thực tế với bản khoá; `validate` ở đây chỉ nói repo đang ở hệ nào.
  const adapt = foreignLayout(root);
  if (adapt) {
    const slots = Object.keys(adapt.slots).length;
    out.push({
      level: "info",
      msg:
        `structure[adapt]: ${slots} slot + ${adapt.extra.length} extra đã khai trong .harness.json` +
        ` — đo theo BẢNG ĐÃ KHAI, không áp chuẩn APP/NON-APP. Lệch bảng ⇒ \`zemory conform\`.`,
    });
    if (!has("AGENTS.md")) {
      out.push({ level: "warn", msg: "structure: missing root `AGENTS.md` (harness entry)" });
    }
    return out;
  }

  if (!has("docs")) out.push({ level: "warn", msg: "structure: missing `docs/` (harness)" });
  if (!has("AGENTS.md")) out.push({ level: "warn", msg: "structure: missing root `AGENTS.md` (harness entry)" });

  if (profile === "non-app") {
    // non-app: a deliverable-asset project (BI/data/docs/design) — no app code expected.
    if (!deliverables.length) {
      out.push({
        level: "warn",
        msg: "structure[non-app]: no deliverable folder (`reports/`|`models/`|`content/`|`design/`) — see docs/agent/03_STRUCTURE.md §1 (3 vai trò bắt buộc)",
      });
    }
    const present = [
      ...deliverables,
      has("sources") && "sources/",
      has("measures") && "measures/",
      has("queries") && "queries/",
      has("fixtures") && "fixtures/",
      has("scripts") && "scripts/",
      has("docs") && "docs/",
      has("attic") && "attic/",
      has("data") && "data/",
    ].filter(Boolean);
    out.push({ level: "info", msg: `structure[non-app]: slots present — ${present.join(" · ") || "(none)"}` });
    return out;
  }

  // Default: APP standard (§1–6).
  const ownCode = has("backend") ? "backend/" : has("src") ? "src/" : null;
  if (!ownCode) {
    // No app code but deliverable folders exist → this is probably a non-app project
    // validated under the wrong profile; point at the switch instead of nagging.
    if (deliverables.length) {
      out.push({
        level: "info",
        msg: `structure: no app code but ${deliverables.join("/")} present — if this is a BI/data/docs/design project, set \`"profile": "non-app"\` in docs/.harness.json (áp chuẩn 03_STRUCTURE hệ non-app)`,
      });
    } else if (hasAnyCode(root)) {
      out.push({
        level: "warn",
        msg: "structure: own code not under `backend/` (or `src/`) — see docs/agent/03_STRUCTURE.md; reconcile via docs/agent/03_STRUCTURE.md §8",
      });
    } else {
      // DỰ ÁN TRẮNG — vừa `zemory init`, CHƯA có dòng code nào. Không có code thì không thể
      // "để code sai chỗ", nên cảnh báo ở đây là báo oan đúng phút đầu tiên người dùng mới gặp
      // công cụ: `doctor` in "1 lỗi cần sửa" trong khi họ chưa làm gì sai.
      // (Cùng lớp lỗi với `verify` báo máy cài mới là kho hỏng — xem 06_CHANGES [2026-08-03j]:
      // phép kiểm viết cho trạng thái ĐÃ CÓ NỘI DUNG, nổ oan ở trạng thái TRẮNG.)
      out.push({
        level: "info",
        msg: "structure: chưa có code nào — dự án mới dựng. Khi thêm code, đặt dưới `backend/` (hoặc `src/`) theo 03_STRUCTURE §3.",
      });
    }
  }
  if (!has("frontend") && ownCode) {
    out.push({ level: "warn", msg: "structure: missing `frontend/` (apps ship a UI) — see docs/agent/03_STRUCTURE.md" });
  }
  const present = [
    ownCode,
    has("frontend") && "frontend/",
    has("docs") && "docs/",
    has("external") && "external/",
    has("attic") && "attic/",
    has("data") && "data/",
  ].filter(Boolean);
  out.push({ level: "info", msg: `structure: layers present — ${present.join(" · ") || "(none)"}` });
  return out;
}

function walkMd(dir: string, depth = 5): string[] {
  const out: string[] = [];
  const rec = (d: string, left: number) => {
    let names: string[];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === "archive" || name === "node_modules") continue;
      const p = join(d, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (left > 0) rec(p, left - 1);
      } else if (name.endsWith(".md")) out.push(p);
    }
  };
  rec(dir, depth);
  return out;
}

function extractLinks(md: string): string[] {
  const out: string[] = [];
  const re = /\[[^\]]*\]\(([^)\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) out.push(m[1]);
  return out;
}

/** Count of CLOSED backlog items — `- [x]` **or** `- ✅`. The marker semantics live in
 *  `archive.ts` (`isClosedItemLine`) and are shared, not re-implemented: keeping a second
 *  pattern here is exactly what made this nudge silent for months (see that function's note). */
export function closedItems(text: string): number {
  let inFence = false;
  let n = 0;
  for (const l of text.split("\n")) {
    if (/^[ \t]*(```|~~~)/.test(l)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && isClosedItemLine(l)) n++;
  }
  return n;
}

/** Entry keys (`## [key]`) that occur more than once across the given changelog texts. Fence-aware. */
export function duplicateKeys(texts: string[]): Array<{ key: string; count: number }> {
  const seen = new Map<string, number>();
  for (const text of texts) {
    let inFence = false;
    for (const l of text.split("\n")) {
      if (/^[ \t]*(```|~~~)/.test(l)) {
        inFence = !inFence;
        continue;
      }
      const m = !inFence && /^## \[([^\]]+)\]/.exec(l);
      if (m) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
    }
  }
  return [...seen].filter(([, n]) => n > 1).map(([key, count]) => ({ key, count }));
}

/**
 * Constitution articles (`N. **…**` lines of 01_CONSTITUTION, an emoji marker allowed before the bold — `4. 🔒 **…**`)
 * with no row in 02_RULES `## Cổng cho hiến pháp` (`| N | … |`). The template placeholder `N. **(chưa chốt)**` is
 * not an article. null = nothing to say (no constitution, or every article covered).
 */
export function hpGateGaps(agentDir: string): string | null {
  const c = hpGateCoverage(agentDir);
  if (!c) return null;
  if (!c.table) return `constitution: ${c.articles} article(s) but 02_RULES has no "## Cổng cho hiến pháp" table — map each article to its hook/test, or say why it is words-only`;
  return c.missing.length ? `constitution: article(s) ${c.missing.join(", ")} have no row in "## Cổng cho hiến pháp" — build the gate or say why it is words-only` : null;
}

/** The measurement behind `hpGateGaps`, as data (the rail's repo-gates chip reads it). null = no constitution / no article. */
export function hpGateCoverage(agentDir: string): { articles: number; missing: number[]; table: boolean } | null {
  const con = join(agentDir, "01_CONSTITUTION.md");
  if (!existsSync(con)) return null;
  const all = constitutionArticles(readFileSync(con, "utf8")).map((a) => a.n);
  if (!all.length) return null;
  const rows = hpGateRows(agentDir);
  if (!rows) return { articles: all.length, missing: all, table: false };
  const covered = new Set(rows.map((r) => r.n));
  return { articles: all.length, missing: all.filter((n) => !covered.has(n)), table: true };
}

/** Articles of a constitution text: `N. **title…**` (an emoji marker allowed before the bold), numbers unique, ascending. */
export function constitutionArticles(text: string): { n: number; title: string }[] {
  // 8 Dept repos mark articles 4+ with 🔒/🔴 before the bold; the old `N. **` shape saw 3 of their 16-19 (07/10).
  const ARTICLE = /^(\d+)\.\s+(?:[\p{Extended_Pictographic}️‍]+\s*)*\*\*(?!\(chưa chốt)(.*?)\*\*/gmu;
  const seen = new Map<number, string>();
  for (const m of text.matchAll(ARTICLE)) if (!seen.has(Number(m[1]))) seen.set(Number(m[1]), m[2].trim());
  return [...seen].map(([n, title]) => ({ n, title })).sort((a, b) => a.n - b.n);
}

/** Rows of 02_RULES `## Cổng cho hiến pháp` (`| N | title | kind | gate |`), or null when the section is absent. */
export function hpGateRows(agentDir: string): { n: number; title: string; kind: string; gate: string }[] | null {
  const rules = join(agentDir, "02_RULES.md");
  const text = existsSync(rules) ? readFileSync(rules, "utf8") : "";
  const at = text.search(/^##\s+Cổng cho hiến pháp/m);
  if (at < 0) return null;
  const rest = text.slice(at);
  const end = rest.slice(3).search(/^##\s/m);
  const section = end < 0 ? rest : rest.slice(0, end + 3);
  // Lenient on purpose: a row with fewer cells still COVERS its article (coverage only needs the number).
  return [...section.matchAll(/^\|\s*(\d+)\s*\|(.*)$/gm)].map((m) => {
    const cells = m[2].replace(/\|\s*$/, "").split("|").map((c) => c.trim());
    return { n: Number(m[1]), title: cells[0] ?? "", kind: cells[1] ?? "", gate: cells.slice(2).join(" | ") };
  });
}

/** `file:line` of every open checkbox (`- [ ]` / `- [~]`) in the plan folder's *.md, code fences skipped. */
export function planOpenItems(planDir: string): string[] {
  const out: string[] = [];
  if (!existsSync(planDir)) return out;
  for (const name of readdirSync(planDir).filter((n) => n.endsWith(".md")).sort()) {
    let fence = false;
    readFileSync(join(planDir, name), "utf8").split("\n").forEach((l, i) => {
      if (/^\s*```/.test(l)) fence = !fence;
      else if (!fence && /^\s*[-*]\s*\[[ ~]\]/.test(l)) out.push(`${name}:${i + 1}`);
    });
  }
  return out;
}

/**
 * Machine-generated blocks inside docs/plan (user 2026-10-08, from _DB_DataWarehouse: "plan đúng là phải full text… plan là bàn
 * và chốt thiết kế mà"). A plan is text a PERSON writes; a generator writes next to its own source and the plan links to it.
 * Matches the MARKERS of a generated block only — plain prose ("hai máy sinh khối") never matches; fenced code is skipped.
 */
const AUTOGEN_MARKERS = [/<!--\s*AUTOGEN/i, /\bAUTOGEN:/, /^#{1,6}\s.*SINH TỰ ĐỘNG/u, /MÁY SINH.{0,60}ĐỪNG SỬA TAY/u];
export function planAutogenHits(planDir: string): string[] {
  const out: string[] = [];
  if (!existsSync(planDir)) return out;
  for (const name of readdirSync(planDir).filter((n) => n.endsWith(".md")).sort()) {
    let fence = false;
    readFileSync(join(planDir, name), "utf8").split("\n").forEach((l, i) => {
      if (/^\s*```/.test(l)) fence = !fence;
      else if (!fence && AUTOGEN_MARKERS.some((re) => re.test(l))) out.push(`${name}:${i + 1}`);
    });
  }
  return out;
}

/**
 * Supersede clauses that point at nothing: no date key at all, or keys of which NONE is an entry heading in either tier.
 * Returned as short labels (`"no key"` or the keys named) for the validate message.
 */
export function danglingSupersedes(texts: string[], keyTexts: string[] = texts): string[] {
  const keys = new Set<string>();
  // `## [2026-09-18c]` and `## [2026-09-18 (c)]` are the SAME key — Dept repos write the suffix in brackets, and their
  // clauses (correctly, per 02_RULES) name `2026-09-18c`; reading only the first shape flagged them (Dept_FA 07/10).
  for (const t of keyTexts)
    for (const m of t.matchAll(/^##\s*\[(\d{4}-\d{2}-\d{2})\s*(?:\(([a-z]+)\)|([a-z]*))\]/gim)) keys.add((m[1] + (m[2] ?? m[3] ?? "")).toLowerCase());
  const out: string[] = [];
  for (const t of texts) {
    let fence = false;
    let entries = false;
    for (const l of t.split("\n")) {
      if (/^\s*```/.test(l)) fence = !fence;
      if (!fence && /^##\s*\[\d{4}-\d{2}-\d{2}/.test(l)) entries = true;
      // The file's own intro (before the first entry) and an inline-code mention (`> 🔄 **Supersede:** …` as the
      // template's how-to line) describe the clause — they are not one (Dept_FA 07/10: the template line read as "no key").
      if (fence || !entries || !/🔄\s*\*\*Supersede/u.test(l.replace(/`[^`]*`/g, ""))) continue;
      const named = [...l.matchAll(/\d{4}-\d{2}-\d{2}[a-z]*/gi)].map((m) => m[0].toLowerCase());
      if (!named.length) out.push("no key");
      else if (!named.some((k) => keys.has(k))) out.push(named.join("/"));
    }
  }
  return out;
}

/** Keys named by supersede clauses (`> 🔄 **Supersede:** … 2026-07-29l …`). */
export function supersededKeys(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    for (const l of text.split("\n")) {
      if (!/🔄\s*\*\*Supersede/u.test(l)) continue;
      for (const m of l.matchAll(/\d{4}-\d{2}-\d{2}[a-z]*/gi)) out.add(m[0]);
    }
  }
  return out;
}

/** Dated changelog entries longer than `max` lines, longest first. Fence-aware so a
 *  `## [x]` inside a code block is text, not an entry heading. */
export function longEntries(text: string, max: number): Array<{ tag: string; lines: number }> {
  // Deliberately no CRLF normalisation: nothing below is anchored to end-of-line and no
  // byte offsets are used, so a stray carriage return changes no result. parseChangelog
  // in changelog.ts DOES need one — it slices by offset, and a Windows-written file once
  // parsed there as zero entries. Mutation testing (2026-07-29) proved the guard here was
  // dead code: deleting it kept every test green, because it never changed an outcome.
  const lines = text.split("\n");
  const heads: Array<{ i: number; tag: string }> = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^[ \t]*(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^## \[([^\]]+)\]/.exec(lines[i]);
    if (m) heads.push({ i, tag: m[1] });
  }
  const out: Array<{ tag: string; lines: number }> = [];
  for (let k = 0; k < heads.length; k++) {
    const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
    const n = end - heads[k].i;
    if (n > max) out.push({ tag: heads[k].tag, lines: n });
  }
  return out.sort((a, b) => b.lines - a.lines);
}

function lineCount(file: string): number {
  return readFileSync(file, "utf8").split("\n").length;
}

function rel(root: string, p: string): string {
  return p.startsWith(root) ? p.slice(root.length + 1).replace(/\\/g, "/") : p;
}
