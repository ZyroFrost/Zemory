// Docs graph (plan 13 §4 — DECLARED edges, 0 LLM). The "phụ" companion to the
// code graph: how the harness docs point at each other.
//   • references — a markdown link from one doc to another (RULES → 03_STRUCTURE,
//     a plan → 01_CONSTITUTION, etc.). Parsed from the link syntax, deterministic.
//   • supersede  — a changelog entry that reverses an earlier decision, marked
//     `> 🔄 Supersede: … "(YYYY-MM-DD)"`. Edge new-entry → superseded-entry.
//
// Derived + fail-open (HP điều 3/9): rebuilt from the .md files; a missing docs/
// dir just yields an empty graph. No DB, no LLM.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

export interface DocNode {
  /** repo-relative posix id, e.g. "docs/agent/02_RULES.md" or "changelog:2026-07-21#0" */
  id: string;
  label: string;
  type: "doc" | "changelog";
}
export interface DocEdge {
  from: string;
  to: string;
  kind: "references" | "supersede";
}
export interface DocsGraph {
  nodes: DocNode[];
  edges: DocEdge[];
  stats: { docs: number; references: number; supersede: number };
}

const MD_LINK = /\[[^\]]*\]\(([^)\s]+)/g; // capture the target of a []() link

/** List *.md under a docs subdir as posix repo-relative ids. */
function docFiles(root: string, sub: string): string[] {
  const abs = join(root, "docs", sub);
  if (!existsSync(abs)) return [];
  try {
    return readdirSync(abs)
      .filter((f) => f.endsWith(".md"))
      .map((f) => posix.join("docs", sub, f));
  } catch {
    return [];
  }
}

/** Resolve a markdown link target (relative to the linking file) to a doc id. */
function resolveDocLink(fromId: string, target: string, ids: Set<string>): string | null {
  // Drop any #anchor / trailing §-fragment; keep the path part.
  const path = target.split("#")[0].trim();
  if (!path || !path.includes(".md")) return null;
  const fromDir = posix.dirname(fromId);
  // posix.normalize handles ../ and ./ against the linking file's directory.
  const resolved = posix.normalize(posix.join(fromDir, path));
  return ids.has(resolved) ? resolved : null;
}

export function buildDocsGraph(root: string): DocsGraph {
  const files = [...docFiles(root, "agent"), ...docFiles(root, "plan")];
  const ids = new Set(files);
  const nodes: DocNode[] = files.map((id) => ({ id, label: posix.basename(id), type: "doc" }));
  const edges: DocEdge[] = [];
  const seen = new Set<string>();

  // ── references ──
  for (const id of files) {
    let text: string;
    try {
      text = readFileSync(join(root, id), "utf8");
    } catch {
      continue; // fail-open
    }
    for (const m of text.matchAll(MD_LINK)) {
      const to = resolveDocLink(id, m[1], ids);
      if (!to || to === id) continue;
      const key = `${id}->${to}:references`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: id, to, kind: "references" });
    }
  }

  // ── supersede (from 06_CHANGES.md) ──
  const changelogId = files.find((f) => f.endsWith("06_CHANGES.md"));
  let supersede = 0;
  if (changelogId) {
    try {
      const text = readFileSync(join(root, changelogId), "utf8").replace(/\r\n/g, "\n");
      // Split into entries at "## " headers; keep each header + body together.
      const parts = text.split(/\n(?=## )/);
      // date (per entry) → the node ids that carry that date (a date can repeat).
      const byDate = new Map<string, string[]>();
      const entries: { nodeId: string; body: string; date: string }[] = [];
      for (const part of parts) {
        const h = part.match(/^##\s*\[?(\d{4}-\d{2}-\d{2})\]?\s*[—-]?\s*(.*)/);
        if (!h) continue;
        const date = h[1];
        const seq = (byDate.get(date) ?? []).length;
        const nodeId = `changelog:${date}#${seq}`;
        const title = h[2].trim().slice(0, 60);
        nodes.push({ id: nodeId, label: `${date} ${title}`.trim(), type: "changelog" });
        byDate.set(date, [...(byDate.get(date) ?? []), nodeId]);
        entries.push({ nodeId, body: part, date });
      }
      for (const e of entries) {
        // Only the EXPLICIT marker counts: `> 🔄 **Supersede:** …`. Matching any
        // prose line containing "supersede" + fanning to every same-date entry
        // produced ~33/34 false edges on real data (2026-07-16 alone has 12
        // entries) — measured in the 2026-07-21 audit. Declared edges must be
        // "luôn đúng" (điều 13), so: anchored marker + UNIQUE date target only.
        const line = e.body.split("\n").find((l) => /^>\s*(?:🔄\s*)?\*{0,2}supersede/i.test(l.trim()));
        if (!line) continue;
        for (const dm of line.matchAll(/(\d{4}-\d{2}-\d{2})/g)) {
          const targets = (byDate.get(dm[1]) ?? []).filter((id) => id !== e.nodeId);
          if (targets.length !== 1) continue; // ambiguous (or absent) date — no guess
          const targetId = targets[0];
          const key = `${e.nodeId}->${targetId}:supersede`;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({ from: e.nodeId, to: targetId, kind: "supersede" });
          supersede++;
        }
      }
    } catch {
      /* fail-open — no supersede edges */
    }
  }

  return {
    nodes,
    edges,
    stats: { docs: files.length, references: edges.filter((e) => e.kind === "references").length, supersede },
  };
}
