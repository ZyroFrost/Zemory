// The other machine's repos on the gates chip (user 2026-11-26: "gộp cả repo PC" - the chip counts the PC's repos too,
// saying which machine). Each daemon publishes its own `/repo-gates` rows as ONE file named after its host, in the tool
// repo's state folder; the machine-to-machine mirror carries `docs/` (consent flags excluded, channel/mirror.ts), so the
// other machine reads it with no new channel. One writer per file => nothing to merge. A machine whose file stops coming
// keeps its last rows, shown with their time, never as clean.
// Kept apart from repo-sweep.ts on purpose: the daemon's main thread reads this, and must not load conform/validate.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { selfRepoRoot } from "../projects.js";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import type { RepoGateRow } from "./repo-sweep.js";

export const MACHINE_GATES_VERSION = 1;

export interface MachineGates {
  version: number;
  host: string;
  /** when that machine measured (ISO) */
  at: string;
  repos: RepoGateRow[];
}

export function machineGatesDir(root: string | null = selfRepoRoot()): string | null {
  return root ? join(root, "docs", ".harness-state", "repo-gates") : null;
}

/** Write this machine's rows for the other machine to read. Fail-open: a reminder surface never dies on a write. */
export function publishRepoGates(rows: RepoGateRow[], dir = machineGatesDir(), host = hostname()): boolean {
  if (!dir) return false;
  try {
    const v: MachineGates = { version: MACHINE_GATES_VERSION, host, at: new Date().toISOString(), repos: rows };
    writeJsonAtomic(join(dir, `${host}.json`), v);
    return true;
  } catch {
    return false;
  }
}

/** Every OTHER machine's last published rows; an unreadable or foreign-version file is skipped. */
export function otherMachineGates(dir = machineGatesDir(), host = hostname()): MachineGates[] {
  if (!dir || !existsSync(dir)) return [];
  const out: MachineGates[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.slice(0, -5).toLowerCase() === host.toLowerCase()) continue;
    try {
      const v = JSON.parse(readFileSync(join(dir, f), "utf8")) as Partial<MachineGates>;
      if (v.version === MACHINE_GATES_VERSION && typeof v.host === "string" && typeof v.at === "string" && Array.isArray(v.repos))
        out.push(v as MachineGates);
    } catch {
      /* half-carried or foreign file: skip it */
    }
  }
  return out.sort((a, b) => a.host.localeCompare(b.host));
}
