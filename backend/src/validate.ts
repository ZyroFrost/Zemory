// `harness` validate — health checks on the docs harness itself (the part
// agentmemory/lean-ctx don't have): broken internal links, a changelog due for
// DB-backed archiving, and supersede bookkeeping.
// Read-only, deterministic, no LLM.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Context } from "./core/types.js";

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
  const chFile = join(agentDir, "05_CHANGES.md");
  const chMax = ctx.config.thresholds?.changes_lines ?? 400;
  if (existsSync(chFile)) {
    const n = lineCount(chFile);
    if (n > chMax) {
      issues.push({ level: "info", msg: `05_CHANGES.md is ${n} lines (> ${chMax}) — run \`zemory archive\`` });
    }
    const sup = (readFileSync(chFile, "utf8").match(/🔄\s*\*\*Supersede/gu) ?? []).length;
    issues.push({ level: "info", msg: `${sup} supersede marker(s) in changelog` });
  }

  // 3. Repo structure vs the standard (docs/agent/03_STRUCTURE.md). TWO standards:
  //    profile "app" (§1–6, default) vs "non-app" (§7 — BI/data/docs/design),
  //    chosen by `profile` in docs/.harness.json. ADVISORY only — reconciling is
  //    agent-assisted (AGENTS.md §7); zemory never moves files.
  for (const i of checkStructure(projectRoot, ctx.config.profile ?? "app")) issues.push(i);

  return { issues, ok: !issues.some((i) => i.level === "error") };
}

/** The deliverable folders that satisfy the non-app standard (03_STRUCTURE §7). */
const DELIVERABLES = ["reports", "models", "content", "design"];

/**
 * Report how the repo lines up with the standard layout for its profile.
 * APP (§1–6): required = backend/(code) · frontend/ · docs/ · AGENTS.md.
 * NON-APP (§7): required = docs/ · AGENTS.md · ≥1 deliverable (reports/models/
 * content/design) — no backend/frontend expected. Everything else optional.
 * Build output + secret + .env are gitignored, so not checked. Warn on drift,
 * never fix (AGENTS.md §7).
 */
function checkStructure(root: string, profile: "app" | "non-app"): ValidateIssue[] {
  const out: ValidateIssue[] = [];
  const has = (p: string) => existsSync(join(root, p));
  const deliverables = DELIVERABLES.filter((d) => has(d)).map((d) => `${d}/`);

  if (!has("docs")) out.push({ level: "warn", msg: "structure: missing `docs/` (harness)" });
  if (!has("AGENTS.md")) out.push({ level: "warn", msg: "structure: missing root `AGENTS.md` (harness entry)" });

  if (profile === "non-app") {
    // §7: a deliverable-asset project (BI/data/docs/design) — no app code expected.
    if (!deliverables.length) {
      out.push({
        level: "warn",
        msg: "structure[non-app]: no deliverable folder (`reports/`|`models/`|`content/`|`design/`) — see docs/agent/03_STRUCTURE.md §7",
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
    out.push({ level: "info", msg: `structure[non-app §7]: slots present — ${present.join(" · ") || "(none)"}` });
    return out;
  }

  // Default: APP standard (§1–6).
  const ownCode = has("backend") ? "backend/" : has("src") ? "src/" : null;
  if (!ownCode) {
    // No app code but deliverable folders exist → this is probably a §7 project
    // validated under the wrong profile; point at the switch instead of nagging.
    if (deliverables.length) {
      out.push({
        level: "info",
        msg: `structure: no app code but ${deliverables.join("/")} present — if this is a BI/data/docs/design project, set \`"profile": "non-app"\` in docs/.harness.json (03_STRUCTURE §7)`,
      });
    } else {
      out.push({
        level: "warn",
        msg: "structure: own code not under `backend/` (or `src/`) — see docs/agent/03_STRUCTURE.md; reconcile via AGENTS.md §7",
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

function lineCount(file: string): number {
  return readFileSync(file, "utf8").split("\n").length;
}

function rel(root: string, p: string): string {
  return p.startsWith(root) ? p.slice(root.length + 1).replace(/\\/g, "/") : p;
}
