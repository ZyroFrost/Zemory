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
  const chFile = join(agentDir, "03_CHANGES.md");
  const chMax = ctx.config.thresholds?.changes_lines ?? 400;
  if (existsSync(chFile)) {
    const n = lineCount(chFile);
    if (n > chMax) {
      issues.push({ level: "info", msg: `03_CHANGES.md is ${n} lines (> ${chMax}) — run \`zemory archive\`` });
    }
    const sup = (readFileSync(chFile, "utf8").match(/🔄\s*\*\*Supersede/gu) ?? []).length;
    issues.push({ level: "info", msg: `${sup} supersede marker(s) in changelog` });
  }

  // 3. Repo structure vs the standard (01_RULES §Cấu trúc repo). ADVISORY only —
  //    reconciling is agent-assisted (AGENTS.md §7); zemory never moves files.
  for (const i of checkStructure(projectRoot)) issues.push(i);

  return { issues, ok: !issues.some((i) => i.level === "error") };
}

/**
 * Report how the repo lines up with the standard layout: own code under
 * `backend/` (or `src/`), optional `frontend/` `infra/` `vendor/` `.venv/`, and
 * the `docs/` + `AGENTS.md` harness. Only backend + docs are required; the rest
 * exist only when they have content. Warn on drift, never fix (agent does that).
 */
function checkStructure(root: string): ValidateIssue[] {
  const out: ValidateIssue[] = [];
  const has = (p: string) => existsSync(join(root, p));
  const ownCode = has("backend") ? "backend/" : has("src") ? "src/" : null;
  if (!ownCode) {
    out.push({
      level: "warn",
      msg: "structure: own code not under `backend/` (or `src/`) — see 01_RULES §Cấu trúc repo; reconcile via AGENTS.md §7",
    });
  }
  if (!has("AGENTS.md")) {
    out.push({ level: "warn", msg: "structure: missing root `AGENTS.md` (harness entry)" });
  }
  const present = [ownCode, has("frontend") && "frontend/", has("infra") && "infra/", has("vendor") && "vendor/", has("docs") && "docs/", has(".venv") && ".venv/"].filter(Boolean);
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
