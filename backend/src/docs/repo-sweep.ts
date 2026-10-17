// Periodic repo sweep (plan/28 §0q): the daemon runs the read-only checks a session runs by hand — conform · validate ·
// todo verify — over every registered repo, and keeps the verdict in one state file. It reports, never fixes: the rail's
// gates chip (`/repo-gates`) adds these lines to each repo's gaps. `zemory gates --all` stays the live measurement of
// wiring; this sweep covers what that one does not run.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContext, readMarker } from "../core/config.js";
import { currentMemoryDir } from "../memory/db.js";
import { listKnownProjects } from "../projects.js";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import { conform } from "./conform.js";
import { verifyTodo } from "./todo-verify.js";
import { validate } from "./validate.js";

export interface SweepCheck {
  /** Count of red findings (conform blocking · validate errors · todo findings). */
  count: number;
  /** The first finding, so the chip can say what to look at without a second call. */
  first?: string;
}

export interface SweepRow {
  root: string;
  name: string;
  conform?: SweepCheck;
  validate?: SweepCheck;
  todo?: SweepCheck;
  /** A check that threw — reported as such, never read as "clean". */
  failed?: string[];
}

export interface SweepState {
  version: 1;
  at: string;
  rows: SweepRow[];
}

export function repoSweepFile(): string {
  return join(currentMemoryDir(), "repo-sweep.json");
}

export function loadRepoSweep(file = repoSweepFile()): SweepState | null {
  try {
    const v = JSON.parse(readFileSync(file, "utf8")) as Partial<SweepState>;
    return v && v.version === 1 && Array.isArray(v.rows) ? (v as SweepState) : null;
  } catch {
    return null;
  }
}

/** Sweep one repo. Every check runs on its own: one that throws is named in `failed`, the others still report. */
export function sweepRepo(root: string, name: string): SweepRow | null {
  if (!readMarker(root)) return null;
  const row: SweepRow = { root, name };
  const failed: string[] = [];
  try {
    const items = conform(root).items.filter((i) => i.level === "blocking");
    row.conform = { count: items.length, ...(items[0] ? { first: `${items[0].title} [${items[0].check}]` } : {}) };
  } catch (e) {
    failed.push(`conform: ${(e as Error).message}`);
  }
  try {
    const errs = validate(loadContext(root), { paths: false }).issues.filter((i) => i.level === "error");
    row.validate = { count: errs.length, ...(errs[0] ? { first: errs[0].msg } : {}) };
  } catch (e) {
    failed.push(`validate: ${(e as Error).message}`);
  }
  try {
    const f = verifyTodo(root).findings;
    row.todo = { count: f.length, ...(f[0] ? { first: `${f[0].title} — ${f[0].detail}` } : {}) };
  } catch (e) {
    failed.push(`todo verify: ${(e as Error).message}`);
  }
  if (failed.length) row.failed = failed;
  return row;
}

/** Sweep every registered repo and write the state file. Runs in a worker (jobs/fnworker): it reads many files. */
export function sweepRepos(file = repoSweepFile()): { repos: number; red: number } {
  const rows: SweepRow[] = [];
  for (const p of listKnownProjects()) {
    if (!existsSync(p.root)) continue;
    const r = sweepRepo(p.root, p.name);
    if (r) rows.push(r);
  }
  writeJsonAtomic(file, { version: 1, at: new Date().toISOString(), rows } satisfies SweepState);
  return { repos: rows.length, red: rows.filter((r) => sweepLines(r).length).length };
}

/** One line per red check, English (CLI output rule). Empty = the sweep found nothing. */
export function sweepLines(r: SweepRow): string[] {
  const out: string[] = [];
  const line = (c: SweepCheck | undefined, what: string, cmd: string): void => {
    if (c && c.count) out.push(`${what}: ${c.count}${c.first ? ` — ${c.first.slice(0, 140)}` : ""} (\`zemory ${cmd}\`)`);
  };
  line(r.conform, "conform blocking", "conform");
  line(r.validate, "validate error(s)", "validate");
  line(r.todo, "todo verify finding(s)", "todo verify");
  for (const f of r.failed ?? []) out.push(`sweep check did not run — ${f.slice(0, 160)}`);
  return out;
}
