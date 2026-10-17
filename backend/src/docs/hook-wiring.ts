// The hook commands a repo wires in .claude/settings.json, and the files they run (plan/28 §0q). One reader for three users:
// the move to the folder harness (never archive a file the host still calls), a part that takes over a repo's own hook
// (replaces_hooks), and conform (a command whose file is gone = a gate that silently stopped).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface WiredHook {
  event: string;
  command: string;
  /** the repo-relative file the command runs (`docs/hooks/mail-gate.cjs`), or "" when it names none */
  file: string;
}

const SETTINGS = [".claude", "settings.json"];

type Settings = { hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>> };

function readSettings(root: string): Settings | null {
  const p = join(root, ...SETTINGS);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")) as Settings; } catch { return null; }
}

/** The script file a hook command runs, repo-relative: `node docs/hooks/x.cjs` · `python tools/y.py` ·
 *  `node -e "require((process.env.CLAUDE_PROJECT_DIR||'.')+'/docs/…/guard.cjs')"`. */
export function commandFile(command: string): string {
  const req = /CLAUDE_PROJECT_DIR.*?\+\s*['"]\/?([^'"]+\.(?:cjs|mjs|js|py|ps1))['"]/.exec(command);
  if (req) return req[1].replace(/\\/g, "/");
  const m = /(?:^|\s)(?:node|python3?|pwsh|powershell(?:\.exe)?\s+-File)\s+["']?((?:\.\/)?[\w./\\-]+\.(?:cjs|mjs|js|py|ps1))/i.exec(command);
  return m ? m[1].replace(/\\/g, "/").replace(/^\.\//, "") : "";
}

export function wiredHooks(root: string): WiredHook[] {
  const s = readSettings(root);
  const out: WiredHook[] = [];
  for (const [event, groups] of Object.entries(s?.hooks ?? {})) {
    for (const g of groups ?? []) for (const h of g.hooks ?? []) {
      if (typeof h.command === "string") out.push({ event, command: h.command, file: commandFile(h.command) });
    }
  }
  return out;
}

/** Drop every hook command that runs one of `files` (repo-relative); an emptied group goes too. Returns the commands dropped. */
export function unwireHooks(root: string, files: string[], apply: boolean): string[] {
  const s = readSettings(root);
  if (!s?.hooks) return [];
  const dropped: string[] = [];
  for (const event of Object.keys(s.hooks)) {
    s.hooks[event] = (s.hooks[event] ?? [])
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => {
        const hit = typeof h.command === "string" && files.includes(commandFile(h.command));
        if (hit) dropped.push(String(h.command));
        return !hit;
      }) }))
      .filter((g) => (g.hooks ?? []).length > 0);
    if (!s.hooks[event].length) delete s.hooks[event];
  }
  if (dropped.length && apply) writeFileSync(join(root, ...SETTINGS), JSON.stringify(s, null, 2) + "\n");
  return dropped;
}
