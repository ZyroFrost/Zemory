// Move a project folder WITH everything that remembers it by path (user 2026-10-09: eight repos into
// D:\user\Project\Company\Acme\ — "phải dời toàn bộ và có đầy đủ có luôn session chat cũ, ko được thiếu sót gì").
//
// What remembers a project by its PATH, measured on the live store that day:
//   · sessions.project_root (168 rows for the eight) — repointed AND pinned, so the next scan's COALESCE on cwd cannot
//     put it back. sessions.cwd is NOT touched: it is history (the folder the session really ran in), the same rule as
//     mergeprojects.ts and /merge-project. Only THIS host's sessions move — another machine keeps its own folders.
//   · doc / changelog / artifact project_root, graph_fitness.project — derived indexes keyed by the root.
//   · attachment.src_path under the old root.
//   · Claude Code keys its session store by an ENCODED cwd (~/.claude/projects/<enc>/). The folder is renamed, and the
//     two things that carry <enc>: ingest_state.file_path (without it every transcript is re-read from line 0) and the
//     ids of curated-memory notes ("claude-memory-<host>-<enc>-<stem>" — without it each note is ingested again as a
//     second session). A plain transcript session is keyed by its UUID and needs nothing.
//   · ~/.claude.json "projects" (trust + allowed tools per folder), the registry, paths-state.json.
// Nothing is deleted: every step renames or repoints (constitution art. 3).
//
// Every step looks at the current state first, so a run stopped half way can simply be run again.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { dirname, join, posix, resolve, win32 } from "node:path";
import { encodeProjectDir } from "./adapters/claudemem.js";
import { currentMemoryDb, currentMemoryDir, openMemory } from "./db.js";
import { renameProject } from "../projects.js";
import { toHostPath, toLocalPath } from "../util/hostpath.js";
import { Q } from "./store/queries.js";

export interface MoveStep {
  what: string;
  /** rows / files / keys this step changes (0 = nothing to do) */
  n: number;
  done?: boolean;
  note?: string;
}

export interface MoveReport {
  from: string;
  to: string;
  applied: boolean;
  /** why the move cannot run; non-empty ⇒ nothing was written */
  blockers: string[];
  steps: MoveStep[];
}

export interface MoveOptions {
  apply?: boolean;
  dbPath?: string;
  host?: string;
  /** the folder holding Claude Code's `projects/` (default ~/.claude) */
  claudeHome?: string;
  /** Claude Code's settings file with the "projects" map (default ~/.claude.json) */
  claudeJson?: string;
  pathsStateFile?: string;
}

const safeList = (d: string): string[] => {
  try {
    return readdirSync(d);
  } catch {
    return [];
  }
};
const low = (p: string): string => p.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
const under = (p: string | null, root: string): boolean => !!p && (low(p) === low(root) || low(p).startsWith(low(root) + "\\"));
const swapPrefix = (p: string, from: string, to: string): string => to + p.replace(/\//g, "\\").slice(from.replace(/\\+$/, "").length);

const WIN_ABS = /^([A-Za-z]:[\\/]|\\\\|\/\/)/;
/**
 * A path the way the HOST writes it - the form the store keys rows by. A Windows path (drive or UNC) is normalised as a
 * Windows path wherever zemory runs (in the Docker container node parses POSIX, and `resolve("D:\\x")` there glued the
 * cwd in front); a POSIX absolute path stays POSIX (a session recorded inside WSL); a relative path is taken from here.
 */
export function hostForm(p: string): string {
  if (WIN_ABS.test(p)) return win32.normalize(p.replace(/\//g, "\\")).replace(/(?<!^\\)\\+$/, "").replace(/^([A-Za-z]:)$/, "$1\\");
  if (p.startsWith("/")) return posix.normalize(p).replace(/(.)\/+$/, "$1");
  return toHostPath(resolve(p)).replace(/[\\/]+$/, "");
}
/** `\\wsl.localhost\<distro>\home\u\repo` (or `\\wsl$\…`) ⇒ `/home/u/repo`: the cwd a session run INSIDE the distro recorded. */
export function wslLinuxPath(p: string): string | null {
  const m = /^\\\\wsl(?:\.localhost|\$)\\[^\\]+(\\.*)?$/i.exec(p);
  return m ? (m[1] ?? "\\").replace(/\\/g, "/") : null;
}
/** The root a host path sits on: a drive, a UNC share (`\\server\share`), or `/`. */
const hostRoot = (p: string): string => (WIN_ABS.test(p) ? win32.parse(p).root : "/").replace(/\\+$/, "").toLowerCase();
/** Files and bytes under a folder: the measure a copy is verified by. */
function tally(dir: string): { files: number; bytes: number } {
  const out = { files: 0, bytes: 0 };
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        out.files++;
        out.bytes += statSync(p).size;
      }
    }
  };
  walk(dir);
  return out;
}

/** Copy a folder to a place that does not exist yet, then measure both: same files and same bytes, or not ok. */
export function copyFolderVerified(src: string, dst: string): { ok: boolean; source: { files: number; bytes: number }; copy: { files: number; bytes: number } } {
  cpSync(src, dst, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
  const source = tally(src);
  const copy = tally(dst);
  return { ok: source.files === copy.files && source.bytes === copy.bytes, source, copy };
}

export function projectMove(fromIn: string, toIn: string, opts: MoveOptions = {}): MoveReport {
  const from = hostForm(fromIn);
  const to = hostForm(toIn);
  // a repo inside a WSL distro was recorded by its Linux path; the store rows under it move too
  const fromAlias = wslLinuxPath(from);
  const fromLocal = toLocalPath(from);
  const toLocal = toLocalPath(to);
  const apply = !!opts.apply;
  const host = opts.host ?? hostname();
  const claudeHome = opts.claudeHome ?? join(homedir(), ".claude");
  const claudeJson = opts.claudeJson ?? join(homedir(), ".claude.json");
  const statePath = opts.pathsStateFile ?? join(currentMemoryDir(), "paths-state.json");
  const report: MoveReport = { from, to, applied: false, blockers: [], steps: [] };

  // ── preconditions ────────────────────────────────────────────────────────────────────────────────────────────────
  const fromThere = existsSync(fromLocal);
  const toThere = existsSync(toLocal);
  if (low(from) === low(to)) report.blockers.push("source and target are the same folder");
  if (under(to, from)) report.blockers.push("target is inside the source");
  if (!fromThere && !toThere) report.blockers.push(`neither ${from} nor ${to} exists`);
  if (fromThere && toThere) report.blockers.push(`target already exists: ${to}`);
  // Another drive (or a WSL distro): a rename cannot cross it, so the folder is copied and the copy verified; the source
  // stays where it is for the owner to delete once checked (nothing is deleted here, constitution art. 3).
  const copy = hostRoot(from) !== hostRoot(to);
  // The REAL folder name, as Claude Code spelled it (the cwd it saw: "d--…" from a lower-case drive). Note ids are built
  // from that name, so the new folder keeps the same spelling style.
  const projectsDir = join(claudeHome, "projects");
  const oldEnc = safeList(projectsDir).find((d) => d.toLowerCase() === encodeProjectDir(from).toLowerCase()) ?? encodeProjectDir(from);
  let newEnc = encodeProjectDir(to);
  if (/^[a-z]/.test(oldEnc) && /^[A-Z]/.test(newEnc)) newEnc = newEnc[0].toLowerCase() + newEnc.slice(1);
  const oldSlug = join(claudeHome, "projects", oldEnc);
  const newSlug = join(claudeHome, "projects", newEnc);
  const slugFrom = existsSync(oldSlug);
  if (slugFrom && existsSync(newSlug) && low(oldSlug) !== low(newSlug)) report.blockers.push(`Claude Code already has a session folder for the target: ${newSlug}`);
  if (report.blockers.length) return report;

  // ── 1. the folder itself (first: a locked folder fails here, before anything else changes) ─────────────────────────
  const folderNote = !fromThere ? "already moved" : copy ? `${from} → ${to} (another drive: copied and verified, the source is kept)` : `${from} → ${to}`;
  report.steps.push({ what: "folder", n: fromThere ? 1 : 0, note: folderNote });
  if (apply && fromThere) {
    mkdirSync(dirname(toLocal), { recursive: true });
    if (copy) {
      const c = copyFolderVerified(fromLocal, toLocal);
      if (!c.ok) {
        report.blockers.push(`the copy does not match its source (${c.source.files} files / ${c.source.bytes} B vs ${c.copy.files} / ${c.copy.bytes}) — nothing else was changed; check ${to} and run again`);
        return report;
      }
      report.steps[report.steps.length - 1].note += ` · ${c.source.files} files, ${c.source.bytes} B · delete ${from} by hand once checked`;
    } else renameSync(fromLocal, toLocal);
  }

  // ── 2. Claude Code's session folder ──────────────────────────────────────────────────────────────────────────────
  report.steps.push({ what: "claude session folder", n: slugFrom ? 1 : 0, note: slugFrom ? `${oldEnc} → ${newEnc}` : "none for this folder" });
  if (apply && slugFrom) renameSync(oldSlug, newSlug);

  // ── 3. the store, one transaction ────────────────────────────────────────────────────────────────────────────────
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const eq = "lower(replace(%c, '/', '\\'))";
    // every key the folder is stored under: its host path, and for a WSL repo the Linux path its sessions recorded
    const roots = [from, ...(fromAlias ? [fromAlias] : [])];
    const keys = roots.map(low);
    const isRoot = (c: string): string => `${eq.replace("%c", c)} IN (${keys.map(() => "?").join(", ")})`;
    const isUnder = (c: string): string => `(${eq.replace("%c", c)} = ? OR substr(${eq.replace("%c", c)}, 1, ?) = ?)`;
    const L = low(from);
    const underArgs = [L, L.length + 1, L + "\\"];
    const count = (sql: string, ...a: unknown[]): number => (db.prepare(sql).get(...a) as { n: number }).n;

    const sessions = count(`SELECT COUNT(*) AS n FROM sessions WHERE ${isRoot("project_root")} AND host = ?`, ...keys, host);
    const docs = count(`SELECT COUNT(*) AS n FROM doc WHERE ${isRoot("project_root")}`, ...keys);
    const changes = count(`SELECT COUNT(*) AS n FROM changelog WHERE ${isRoot("project_root")}`, ...keys);
    const artifacts = count(`SELECT COUNT(*) AS n FROM artifact WHERE ${isRoot("project_root")}`, ...keys);
    const fitness = count(`SELECT COUNT(*) AS n FROM graph_fitness WHERE ${isRoot("project")}`, ...keys);
    const attach = count(`SELECT COUNT(*) AS n FROM attachment WHERE ${isUnder("src_path")}`, ...underArgs);
    // ingest keys are written the way the host names the file (util/hostpath), not as the container opens it
    const oldSlugKey = toHostPath(oldSlug);
    const newSlugKey = toHostPath(newSlug);
    const S = low(oldSlugKey);
    const states = count(`SELECT COUNT(*) AS n FROM ingest_state WHERE ${isUnder("file_path")}`, S, S.length + 1, S + "\\");
    const notePrefix = `claude-memory-${host}-${oldEnc}-`;
    // notes of the old folder that have no alias for the new one yet (a second run finds none)
    const newPrefix = `claude-memory-${host}-${newEnc}-`;
    const notes = (db
      .prepare("SELECT id FROM sessions WHERE source = 'claude-code-memory' AND substr(lower(id), 1, ?) = lower(?)")
      .all(notePrefix.length, notePrefix) as { id: string }[]).filter(
      ({ id }) => newPrefix === notePrefix || !db.prepare(Q.sessionAliasOfAnyCase).get(newPrefix + id.slice(notePrefix.length)),
    );

    report.steps.push(
      { what: "sessions.project_root (this host, pinned)", n: sessions },
      { what: "doc.project_root", n: docs },
      { what: "changelog.project_root", n: changes },
      { what: "artifact.project_root", n: artifacts },
      { what: "graph_fitness.project", n: fitness },
      { what: "attachment.src_path", n: attach },
      { what: "ingest_state.file_path (claude session folder)", n: states },
      { what: "curated-memory note aliases (ids kept)", n: notes.length },
    );

    if (apply) {
      db.transaction(() => {
        db.prepare(`UPDATE sessions SET project_root = ?, project_pinned = 1 WHERE ${isRoot("project_root")} AND host = ?`).run(to, ...keys, host);
        // Derived indexes: a row already present under the target wins (it is the fresher index of the same doc).
        db.prepare(`UPDATE OR IGNORE doc SET project_root = ? WHERE ${isRoot("project_root")}`).run(to, ...keys);
        db.prepare(`UPDATE changelog SET project_root = ? WHERE ${isRoot("project_root")}`).run(to, ...keys);
        db.prepare(`UPDATE artifact SET project_root = ? WHERE ${isRoot("project_root")}`).run(to, ...keys);
        db.prepare(`UPDATE graph_fitness SET project = ? WHERE ${isRoot("project")}`).run(to, ...keys);
        for (const r of db.prepare(`SELECT id, src_path FROM attachment WHERE ${isUnder("src_path")}`).all(...underArgs) as { id: number; src_path: string }[]) {
          db.prepare("UPDATE attachment SET src_path = ? WHERE id = ?").run(swapPrefix(r.src_path, from, to), r.id);
        }
        const st = db.prepare(`SELECT file_path FROM ingest_state WHERE ${isUnder("file_path")}`).all(S, S.length + 1, S + "\\") as { file_path: string }[];
        for (const r of st) db.prepare("UPDATE OR IGNORE ingest_state SET file_path = ? WHERE file_path = ?").run(swapPrefix(r.file_path, oldSlugKey, newSlugKey), r.file_path);
        // A note KEEPS its id: the id the scan computes from the new folder is recorded as an alias of it. Renaming the session
        // instead sent the new id to the other machine as a new session while it kept the old one (25/10: 825 vs 568 notes).
        for (const { id } of notes) {
          const next = `claude-memory-${host}-${newEnc}-` + id.slice(notePrefix.length);
          if (next === id || count("SELECT COUNT(*) AS n FROM sessions WHERE id = ?", next)) continue; // already ingested under the new id
          db.prepare(Q.upsertSessionAlias).run(next, id);
        }
        // A digest's meta names the project it was built for.
        const jTo = JSON.stringify(to).slice(1, -1);
        for (const r of roots) {
          const jFrom = JSON.stringify(r).slice(1, -1);
          db.prepare("UPDATE session_digest SET meta = replace(meta, ?, ?) WHERE instr(meta, ?) > 0").run(`"project_root":"${jFrom}"`, `"project_root":"${jTo}"`, `"project_root":"${jFrom}"`);
        }
      })();
    }
  } finally {
    db.close();
  }

  // ── 4. registry + paths-state ────────────────────────────────────────────────────────────────────────────────────
  const reg = renameProject(from, to, apply);
  report.steps.push({ what: "registry (projects.json)", n: reg ? 1 : 0, note: reg ? undefined : "not in the registry" });
  let stateN = 0;
  try {
    const raw = readFileSync(statePath, "utf8");
    const j = JSON.parse(raw) as { projects?: Record<string, unknown> };
    const k = from.toLowerCase();
    if (j.projects && j.projects[k] !== undefined) {
      stateN = 1;
      if (apply) {
        j.projects[to.toLowerCase()] = j.projects[k];
        delete j.projects[k];
        writeFileSync(statePath, JSON.stringify(j, null, 2) + "\n");
      }
    }
  } catch {
    /* no paths-state yet — nothing remembers the old key */
  }
  report.steps.push({ what: "paths-state.json", n: stateN });

  // ── 5. Claude Code's per-folder settings (trust, allowed tools) ──────────────────────────────────────────────────
  report.steps.push({ what: "~/.claude.json projects", n: renameClaudeProjectKey(claudeJson, from, to, apply) });

  report.applied = apply;
  for (const s of report.steps) s.done = apply && s.n > 0;
  return report;
}

/**
 * Rename the "projects" key of a Claude Code settings file (~/.claude.json, or a claude-swap copy of it) from one folder
 * to another, keeping the spelling style of the key (Claude Code writes "d:/a/b"). Returns how many keys matched.
 */
export function renameClaudeProjectKey(file: string, from: string, to: string, apply: boolean): number {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return 0;
  }
  let j: { projects?: Record<string, unknown> };
  try {
    j = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!j.projects) return 0;
  let n = 0;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(j.projects)) {
    if (low(k) === low(from)) {
      n++;
      const slash = k.includes("/") && !k.includes("\\");
      const drive = k.slice(0, 1);
      let nk = to.replace(/\\/g, slash ? "/" : "\\");
      if (/^[a-z]:/i.test(nk) && /^[a-z]$/i.test(drive)) nk = drive + nk.slice(1); // keep the drive letter's case
      next[nk] = v;
    } else next[k] = v;
  }
  if (n && apply) {
    j.projects = next;
    const indent = /\n( +)"/.exec(raw)?.[1].length ?? 2;
    writeFileSync(file, JSON.stringify(j, null, indent) + (raw.endsWith("\n") ? "\n" : ""));
  }
  return n;
}
