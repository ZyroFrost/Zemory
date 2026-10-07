// `zemory gates --write-top` — the one write: put the ungated-articles block at the top of 01_CONSTITUTION/02_RULES.
// `zemory gates [--all] [--json]` — does this repo (or every registered repo) RUN its machine gates: guard wired with
// the full matcher · pre-commit calling precommit-guard · a gate row for every constitution article. Read-only; exit 1
// while a gap is open. Same measurement as the rail's repo-gates chip (`/repo-gates`) — see docs/repo-gates.ts.
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { currentProjectRoot, harnessPathsAt } from "../core/config.js";
import { writeNoGateTop } from "../docs/no-gate.js";
import { repoGateLines, repoGates, type RepoGates } from "../docs/repo-gates.js";
import { listKnownProjects } from "../projects.js";

export function cmdGates(args: string[]): void {
  const unknown = args.filter((a) => a !== "--all" && a !== "--json" && a !== "--write-top");
  if (unknown.length || (args.includes("--write-top") && args.length > 1)) {
    console.log(`zemory gates: unknown argument: ${unknown.join(" ") || "--write-top takes no other flag (it writes THIS repo only)"}`);
    console.log("  usage: zemory gates [--all] [--json]  ·  zemory gates --write-top");
    process.exitCode = 1;
    return;
  }
  if (args.includes("--write-top")) {
    // The one WRITE of this command, cwd repo only: the generated "read carefully" block at the top of 01_CONSTITUTION
    // and 02_RULES, and `## Hành xử` first — ungated rules must not be skimmed (user 2026-10-07).
    const changed = writeNoGateTop(harnessPathsAt(currentProjectRoot()).agent);
    console.log(changed.length ? `zemory gates --write-top: ${changed.join(" · ")}` : "zemory gates --write-top: already in place.");
    return;
  }
  const targets = args.includes("--all")
    ? listKnownProjects().filter((p) => existsSync(p.root)).map((p) => ({ root: p.root, name: p.name }))
    : [{ root: currentProjectRoot(), name: basename(currentProjectRoot()) }];
  const rows = targets.map((t) => repoGates(t.root, t.name)).filter((g): g is RepoGates => g !== null);
  const open = rows.filter((g) => g.gaps > 0);
  if (open.length) process.exitCode = 1;
  if (args.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (!rows.length) {
    console.log("zemory gates: no zemory repo here (no .harness.json).");
    return;
  }
  console.log(`zemory gates — ${rows.length} repo(s), ${open.length} with open gaps`);
  for (const g of rows) {
    const lines = repoGateLines(g);
    console.log(`  ${lines.length ? "✗" : "✓"} ${g.name}`);
    for (const l of lines) console.log(`      · ${l}`);
  }
}
