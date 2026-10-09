// `zemory project move <from> <to> [--apply] [--claude-config <file>]...` — move a project folder and everything that
// remembers it by path (memory/projectmove.ts). Without --apply it only prints what would change.
// --claude-config: another Claude Code settings file carrying the same "projects" map (a claude-swap slot copy).
import { projectMove, renameClaudeProjectKey } from "../memory/projectmove.js";

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
    console.log("zemory project move: the daemon is running — stop it first (tray ▸ Quit), then run again. Nothing was changed.");
    process.exitCode = 1;
    return;
  }
  const r = projectMove(from, to, { apply });
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
  console.log(apply ? "  Done. Run `zemory doctor` in the new folder." : "  Add --apply to write.");
}
