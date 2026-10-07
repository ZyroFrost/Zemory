// Repo gates — does each repo actually RUN its machine gates, not just carry them? (user 2026-10-07: "chính bạn cũng
// cần có cổng kiểm các phòng ban đã có đủ hook hết chưa"). ONE measurement, three readers: `zemory gates` · `/repo-gates`
// (the rail's fourth chip) · tests. Read-only, no child process: the daemon runs it over every registered repo.
//
// What the "repo standard" chip does NOT see, and this does:
//   · guard wiring — a generated guard.cjs that `.claude/settings.json` never calls (6/17 repos, 2026-10-07)
//   · pre-commit — a generated precommit-guard.cjs that git never calls (6/18 repos, same day)
//   · constitution gates — articles with no row in 02_RULES `## Cổng cho hiến pháp`
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { guardMatcherGaps, precommitState } from "./guard-gen.js";
import { noGateIssues } from "./no-gate.js";
import { hpGateCoverage } from "./validate.js";

export interface RepoGates {
  root: string;
  name: string;
  /** null = guard not wired at all · [] = wired in full · else the tools the matcher skips. */
  wiring: string[] | null;
  precommit: ReturnType<typeof precommitState>;
  /** null = no constitution article to map. */
  hp: { articles: number; missing: number[]; table: boolean } | null;
  /** Problems with the "ungated rules first" layout (docs/no-gate.ts). Empty = in place and fresh. */
  top: string[];
  /** Count of open gaps (0 = the repo runs every gate it should). */
  gaps: number;
}

export function repoGates(root: string, name: string): RepoGates | null {
  if (!readMarker(root)) return null; // not a zemory repo — nothing to hold it to
  const settings = join(root, ".claude", "settings.json");
  const wiring = guardMatcherGaps(existsSync(settings) ? readFileSync(settings, "utf8") : null);
  const precommit = precommitState(root);
  const agentDir = harnessPathsAt(root).agent;
  const hp = hpGateCoverage(agentDir);
  const top = noGateIssues(agentDir);
  const gaps =
    (wiring === null ? 1 : wiring.length ? 1 : 0) +
    (precommit === "none" || precommit === "other" ? 1 : 0) +
    (hp && hp.missing.length ? 1 : 0) +
    (top.length ? 1 : 0);
  return { root, name, wiring, precommit, hp, top, gaps };
}

/** One line per open gap, English (CLI output rule). Empty = clean. */
export function repoGateLines(g: RepoGates): string[] {
  const out: string[] = [];
  if (g.wiring === null) out.push("guard not wired — .claude/settings.json does not run guard.cjs (`zemory hook guard`)");
  else if (g.wiring.length) out.push(`guard matcher skips ${g.wiring.join(" · ")} (\`zemory hook guard\`)`);
  if (g.precommit === "none") out.push("pre-commit not wired — git never runs precommit-guard.cjs (`zemory hook guard`)");
  if (g.precommit === "other") out.push("pre-commit is the repo's own and does not call precommit-guard.cjs — add it by hand");
  if (g.hp && !g.hp.table) out.push(`02_RULES has no "## Cổng cho hiến pháp" table (${g.hp.articles} article(s) to map)`);
  else if (g.hp && g.hp.missing.length) out.push(`constitution article(s) ${g.hp.missing.join(", ")} have no gate row (of ${g.hp.articles})`);
  for (const t of g.top) out.push(`${t} (\`zemory gates --write-top\`)`);
  return out;
}
