// `zemory peers [--repo <name>] [--json] [--check] [--all] [--fix [--apply]]` — which local session to message for each
// repo, and the session-title gate (user rulings 2026-10-07).
// ListAgents prints only MESSAGING names (`dept-biz-b2`); the user's session TITLE (`Dept_BIZ_Claude_6-10-2026`) lives
// in the session jsonl. This prints both side by side, ★ = the session the send guard lets a message through to.
//
// `--all` = EVERY session on disk, closed ones too. The first `--check` looked only at LIVE sessions and reported
// "2 wrong" while the user's session list showed four more broken Dept_FA titles (closed sessions) — the list the user
// reads is the whole history, so the gate must read it too.
// `--fix` prints the retitle plan; `--apply` writes it: one `custom-title` line appended per session — exactly what
// Claude Code writes when the user renames a session. A title that cannot be derived safely is listed, never guessed.
import { appendFileSync, readFileSync } from "node:fs";
import { listPeers, listStoredSessions, suggestTitle } from "../memory/send-guard.js";
import { listKnownProjects } from "../projects.js";

/** The repo folders a project folder can map back to: every linked repo + every live session's cwd. */
const knownRoots = (): string[] => [...listKnownProjects().map((k) => k.root), ...listPeers().map((p) => p.cwd)];

function fixTitles(repo: string, apply: boolean): void {
  const stored = listStoredSessions(knownRoots()).filter((s) => s.title && s.problem && (!repo || s.repo.toLowerCase() === repo));
  if (!stored.length) {
    console.log("zemory peers --fix: ✓ no session title breaks the rule.");
    return;
  }
  let done = 0;
  let left = 0;
  for (const s of stored) {
    const next = suggestTitle(s.title, s.repo, s.startDay);
    if (!next) {
      left++;
      console.log(`  ? ${s.repo}  "${s.title}" — ${s.problem} — cannot derive a safe title, retitle by hand`);
      continue;
    }
    console.log(`  ${apply ? "✓" : "→"} ${s.repo}  "${s.title}"  →  "${next}"`);
    if (apply) {
      const text = readFileSync(s.file, "utf8");
      appendFileSync(s.file, (text.endsWith("\n") ? "" : "\n") + JSON.stringify({ type: "custom-title", customTitle: next, sessionId: s.sessionId }) + "\n");
      done++;
    }
  }
  console.log(
    apply
      ? `zemory peers --fix --apply: ${done} session(s) retitled, ${left} left for the user. A VS Code tab may show the new title only after a reload.`
      : `zemory peers --fix: ${stored.length - left} retitle(s) planned, ${left} left for the user — add --apply to write.`,
  );
}

export function cmdPeers(args: string[]): void {
  const known = new Set(["--json", "--repo", "--check", "--all", "--fix", "--apply"]);
  const unknown = args.filter((a, i) => a.startsWith("-") && !known.has(a) && args[i - 1] !== "--repo");
  if (unknown.length || (args.includes("--apply") && !args.includes("--fix"))) {
    console.log(`zemory peers: unknown flag: ${unknown.join(" ") || "--apply without --fix"}`);
    console.log("  usage: zemory peers [--repo <folder name>] [--json] [--check] [--all] [--fix [--apply]]");
    process.exitCode = 1;
    return;
  }
  const at = args.indexOf("--repo");
  const repo = at >= 0 ? (args[at + 1] ?? "").toLowerCase() : "";
  if (args.includes("--fix")) {
    fixTitles(repo, args.includes("--apply"));
    return;
  }
  if (args.includes("--all")) {
    // every session on disk: the title gate over the WHOLE session list
    const stored = listStoredSessions(knownRoots()).filter((s) => !repo || s.repo.toLowerCase() === repo);
    const bad = stored.filter((s) => s.title && s.problem);
    if (!args.includes("--check")) {
      for (const s of stored) console.log(`  ${s.problem ? "✗" : " "} ${s.repo}  ${s.title ?? "(untitled)"}${s.problem ? "  — " + s.problem : ""}`);
    } else {
      for (const s of bad) console.log(`  ✗ ${s.repo}  "${s.title}" — ${s.problem}`);
    }
    console.log(
      bad.length
        ? `zemory peers --all: ${bad.length} of ${stored.length} stored session title(s) break the rule — \`zemory peers --fix\` shows the retitle plan.`
        : `zemory peers --all: ✓ every titled session on disk follows the rule (${stored.length} sessions).`,
    );
    if (bad.length && args.includes("--check")) process.exitCode = 1;
    return;
  }
  const peers = listPeers().filter((p) => !repo || p.repo.toLowerCase() === repo);
  if (args.includes("--check")) {
    // The session-title gate: exit 1 when a TITLED live session breaks the rule. Untitled sessions are not a breach
    // (unused is allowed) — they are only listed, because the send guard already refuses to message them.
    const bad = peers.filter((p) => p.title && p.problem);
    for (const p of bad) console.log(`  ✗ ${p.repo}  ${p.name}  "${p.title}" — ${p.problem}`);
    const unused = peers.filter((p) => !p.title).length;
    console.log(
      bad.length
        ? `zemory peers --check: ${bad.length} session title(s) break the rule (<Repo>_<Model>_<d-m-yyyy>) — retitle the session in the session list (rename).`
        : `zemory peers --check: ✓ every titled live session follows the rule (${unused} untitled = unused).`,
    );
    if (bad.length) process.exitCode = 1;
    return;
  }
  if (args.includes("--json")) {
    console.log(JSON.stringify(peers, null, 2));
    return;
  }
  if (!peers.length) {
    console.log(repo ? `zemory peers: no live session in ${repo}.` : "zemory peers: no live local session.");
    return;
  }
  console.log("zemory peers — live local sessions (★ = send here; address = what SendMessage takes)");
  const w = Math.max(...peers.map((p) => p.repo.length), 4);
  const a = Math.max(...peers.map((p) => p.name.length), 7);
  for (const p of peers) {
    const title = p.title
      ? p.title + (p.problem ? `   ⚠ ${p.problem}` : "")
      : "(no title — unused, do not message)";
    console.log(`  ${p.chosen ? "★" : " "} ${p.repo.padEnd(w)}  ${p.name.padEnd(a)}  ${p.status.padEnd(4)}  ${title}`);
  }
  console.log("  Replying to a message? Use its `from` address (uds:…), not this table.");
  if (peers.some((p) => p.problem)) {
    console.log("  ⚠ = the title breaks the session-title rule (02_RULES §Phạm vi project); retitle it in the session list (rename).");
  }
}
