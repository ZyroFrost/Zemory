// `zemory peers [--repo <name>] [--json]` — which local session to message for each repo (user ruling 2026-10-07).
// ListAgents prints only MESSAGING names (`dept-biz-b2`); the user's session TITLE (`Dept_BIZ_Claude_6-10-2026`) lives
// in the session jsonl. This prints both side by side, ★ = the session the send guard lets a message through to.
import { listPeers } from "../memory/send-guard.js";

export function cmdPeers(args: string[]): void {
  const known = new Set(["--json", "--repo", "--check"]);
  const unknown = args.filter((a, i) => a.startsWith("-") && !known.has(a) && args[i - 1] !== "--repo");
  if (unknown.length) {
    console.log(`zemory peers: unknown flag: ${unknown.join(" ")}`);
    console.log("  usage: zemory peers [--repo <folder name>] [--json] [--check]");
    process.exitCode = 1;
    return;
  }
  const at = args.indexOf("--repo");
  const repo = at >= 0 ? (args[at + 1] ?? "").toLowerCase() : "";
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
