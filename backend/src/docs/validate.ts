// `harness` validate — health checks on the docs harness itself (the part
// agentmemory/lean-ctx don't have): broken internal links, a changelog due for
// DB-backed archiving, and supersede bookkeeping.
// Read-only, deterministic, no LLM.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Context } from "../core/types.js";
import { foreignLayout } from "./conform.js";

export interface ValidateIssue {
  level: "error" | "warn" | "info";
  msg: string;
}
export interface ValidateReport {
  issues: ValidateIssue[];
  ok: boolean;
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
        msg: `${done} mục [x] còn trong 05_TODO.md — chuẩn: xong thì ghi sang 06_CHANGES.md rồi xoá khỏi đây (\`zemory archive\` dọn phần đã dồn)`,
      });
    }
  }

  // 3. Repo structure vs the standard (docs/agent/03_STRUCTURE.md). TWO standards:
  //    profile "app" (docs_template/app) vs "non-app" (its OWN 03_STRUCTURE —
//    BI/data/docs/design). "§7" used to mean "the non-app standard" back when it
//    was a section inside the app file; it is a separate file now, and each file
//    numbers its own sections, so messages below name the section per profile.
  //    chosen by `profile` in docs/.harness.json. ADVISORY only — reconciling is
  //    agent-assisted (docs/agent/03_STRUCTURE.md §8); zemory never moves files.
  for (const i of checkStructure(projectRoot, ctx.config.profile ?? "app")) issues.push(i);

  return { issues, ok: !issues.some((i) => i.level === "error") };
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

/** Count of `- [x]` backlog items. Fence-aware: a checked box inside a code block is
 *  an example, not a real item. */
export function closedItems(text: string): number {
  let inFence = false;
  let n = 0;
  for (const l of text.split("\n")) {
    if (/^[ \t]*(```|~~~)/.test(l)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^\s*-\s*\[x\]/.test(l)) n++;
  }
  return n;
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
