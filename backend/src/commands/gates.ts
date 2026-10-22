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
import { partImpact } from "../docs/law-sync.js";
import { partLinks } from "../docs/law-links.js";
import { leafOf } from "../docs/store.js";

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
    ? listKnownProjects().filter((p) => existsSync(p.local)).map((p) => ({ root: p.local, name: p.name }))
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
    console.log(`  ${lines.length ? "✗" : "✓"} ${g.name}  (forced reading: ${g.forced.toLocaleString("en-US")} chars)`);
    for (const l of lines) console.log(`      · ${l}`);
  }
}

/** `zemory impact <part>` — before a store part (law · slot · skill) is edited or retired (Rule_Gate_83_HarnessFromStore):
 *  every registered repo with a folder harness and the state of its copy. Read-only; exit 1 while a copy is edited here. */
export function cmdImpact(args: string[]): void {
  const [ref, ...rest] = args;
  if (!ref || rest.length) {
    console.log("  usage: zemory impact <part>   (folder Skill_PBI_Mix · Rule_Gate_83_HarnessFromStore · id Rule_83 · law number 83)");
    process.exitCode = 1;
    return;
  }
  const repos = listKnownProjects().filter((p) => existsSync(p.local)).map((p) => ({ name: p.name, root: p.local, agent: harnessPathsAt(p.local).agent }));
  const r = partImpact(ref, repos);
  if (!r.part) {
    console.log(`zemory impact: no store part answers to "${ref}"`);
    process.exitCode = 1;
    return;
  }
  const carry = r.repos.filter((x) => x.state !== "absent");
  console.log(`zemory impact ${r.part.folder} — carried by ${carry.length} of ${r.repos.length} folder-harness repo(s)`);
  for (const x of r.repos) console.log(`  ${x.state.padEnd(7)} ${x.name}${x.folder && x.folder !== r.part.folder ? `  (as ${x.folder})` : ""}`);
  // Rule_Gate_86_LawLayersAgree: the layers tied to this part are checked with it
  const links = partLinks(leafOf(r.part.folder));
  if (links.to.length || links.from.length) {
    console.log("  tied to it (check these with the change):");
    for (const l of links.to) console.log(`    → ${l.kind.padEnd(10)} ${l.name}`);
    for (const l of links.from) console.log(`    ← ${l.kind.padEnd(10)} ${l.name}`);
  }
  if (r.repos.some((x) => x.state === "edited")) {
    console.log("  edited = the repo changed its copy: bring that change up first, or the repo proposes a part of its own");
    process.exitCode = 1;
  }
}
