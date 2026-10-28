// `zemory project move <from> <to> [--apply] [--claude-config <file>]...` — move a project folder and everything that
// remembers it by path (memory/projectmove.ts). Without --apply it only prints what would change.
// --claude-config: another Claude Code settings file carrying the same "projects" map (a claude-swap slot copy).
import { projectMove, renameClaudeProjectKey } from "../memory/projectmove.js";
import { RUNTIME } from "../util/runtime.js";

async function daemonAlive(): Promise<boolean> {
  const port = Number(process.env.ZEMORY_UI_PORT || 4444);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function cmdProject(args: string[]): Promise<void> {
  const [verb, from, to] = args;
  const apply = args.includes("--apply");
  const extra: string[] = [];
  for (let i = 0; i < args.length; i++) if (args[i] === "--claude-config" && args[i + 1]) extra.push(args[i + 1]);
  const known = new Set(["--apply", "--claude-config"]);
  const unknown = args.filter((a, i) => a.startsWith("-") && !known.has(a) && args[i - 1] !== "--claude-config");
  if (verb !== "move" || !from || !to || from.startsWith("-") || to.startsWith("-") || unknown.length) {
    console.log(unknown.length ? `zemory project: unknown flag: ${unknown.join(" ")}` : "zemory project: usage");
    console.log("  usage: zemory project move <from> <to> [--apply] [--claude-config <file>]...");
    process.exitCode = 1;
    return;
  }
  // A scan running between the steps would read the renamed session folder as new files.
  if (apply && (await daemonAlive())) {
    // In the container the daemon is the container's own process, so it can never be stopped from here (measured 28/10):
    // the host's zemory command stops the container and runs the move in a one-off container beside it.
    console.log(RUNTIME === "docker"
      ? "zemory project move: this runs inside the daemon's container — run it from the host's zemory command, which stops the container, moves in a one-off container with ~/.claude writable, and starts it again. Nothing was changed."
      : "zemory project move: the daemon is running — stop it first (tray ▸ Quit), then run again. Nothing was changed.");
    process.exitCode = 1;
    return;
  }
  let r: ReturnType<typeof projectMove>;
  try {
    r = projectMove(from, to, { apply });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "";
    if (!/^(EACCES|EPERM|EBUSY)$/.test(code)) throw e;
    // Windows refuses to rename a folder while any program holds a file or a folder inside it (measured 28/10: a closed VS
    // Code window left two helper processes on .git and the root, Explorer kept a subfolder) - the error names none of them
    console.log(`zemory project move: ${code} — a program holds a file or folder inside ${from} (an editor window, Explorer, a terminal standing in it, a file watcher).`);
    console.log("  Close it and run again: every step looks at the current state first, so a run stopped here simply continues.");
    process.exitCode = 1;
    return;
  }
  if (r.blockers.length) {
    console.log(`zemory project move: cannot move — nothing was changed:`);
    for (const b of r.blockers) console.log(`  ✗ ${b}`);
    process.exitCode = 1;
    return;
  }
  console.log(`zemory project move${apply ? "" : " (dry run)"}: ${r.from} → ${r.to}`);
  for (const s of r.steps) console.log(`  ${s.n ? (apply ? "✓" : "→") : "·"} ${s.what.padEnd(48)} ${String(s.n).padStart(5)}${s.note ? "   " + s.note : ""}`);
  for (const f of extra) {
    const n = renameClaudeProjectKey(f, r.from, r.to, apply);
    console.log(`  ${n ? (apply ? "✓" : "→") : "·"} ${("claude config " + f).padEnd(48)} ${String(n).padStart(5)}`);
  }
  if (!apply) {
    console.log("  Add --apply to write.");
    return;
  }
  // The move renames the session folder only; the skill's steps 2-3 are still to do (Skill_Harness_RepoMove), and no other
  // place says so at the moment it matters (28/10: the SasinHub move ran without the skill being opened).
  console.log("  Done. Next, by skill harness-repo-move (Skill_Harness_RepoMove):");
  console.log("  2. point the old sessions at the new path: in ~/.claude/projects/<new session folder>/*.jsonl, back up first, then edit");
  console.log("     cwd · trackingPath (paths) and customTitle · agentName (<Repo>_<Model>_<d-m-yyyy>) value by JSON value, never a line-wide replace;");
  console.log("  3. accept with the whole table: folder · git log -1 and status unchanged · `zemory conform --gate` in the new folder ·");
  console.log("     0 old names in those fields · `zemory peers --all --check` · an old session reopened; then list what still points at the old path.");
}
