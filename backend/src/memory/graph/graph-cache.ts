// Per-project code graph, kept on disk and rebuilt in the background (plan 13/14). An agent asking graph_impact reads the
// last build at once; it never waits for the walk.
//
// Why on disk and not a signature check per call: through the Docker mount of a Windows drive every directory read is a 9p
// round trip, and the cheapest "did anything change" answer is the walk itself. Measured 2026-11-10 on this repo in the
// container: the walk 17 s (2,366 folders, most of them docs_template), a stat of the 892 sources 4 s, `git ls-files` 12 s,
// a full build 57 s - and every new Claude session starts a new MCP process with an empty memory, so each session's first
// call paid it all. Natively the same build is ~11 s.
//
// So the graph is part of every repo: one JSON per repo under ~/zemory/cache/graph (the container's own Linux disk), kept
// current by rebuilds in a worker thread - after an agent turn that wrote a source file (capture-hook) and whenever a graph
// tool is asked (at most every KICK_EVERY_MS, which catches a pull or an edit made outside any agent). Only a repo with no
// build yet waits for one.
//
// Read-only towards the memory store, on purpose. The first version called recordFitness() in here and wrote a row into
// the user's REAL global_memory.db each time a test built a temporary repo. The fitness log is written by the daemon's
// /code-graph endpoint; `sig` is returned so that place can dedupe. The cache file is a derived layer: delete it and the
// next call rebuilds it.

import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { buildCodeGraph, graphFitness, isSourceLeaf, sourceSignature, type CodeGraph, type GraphFitness } from "./graph.js";
import { enrichGraphSymbols } from "./graph-symbols.js";
import { indexKey } from "../../core/config.js";
import { toLocalPath } from "../../util/hostpath.js";
import { runInWorker } from "../../jobs/fnworker.js";

interface Entry {
  sig: string;
  graph: CodeGraph;
  fitness: GraphFitness;
  /** ISO time this graph was actually parsed: the UI shows it, so nobody reads an old build as a new one. */
  builtAt: string;
}

interface Saved extends Entry {
  root: string;
}

/** A background rebuild is started at most this often per repo and process; a turn that wrote a source file starts one at once. */
export const KICK_EVERY_MS = 30_000;
/** A lock older than this belongs to a build that died (a killed process, a container restart). */
const LOCK_STALE_MS = 15 * 60_000;
/** A cached graph nobody refreshed for this long is dropped (temporary repos of tests, repos since deleted). */
const PRUNE_AFTER_MS = 14 * 24 * 3_600_000;
/** A worker build through the 9p mount takes about a minute; this is the ceiling, not the expectation. */
const BUILD_LIMIT_MS = 10 * 60_000;

export function graphCacheDir(): string {
  return process.env.ZEMORY_GRAPH_CACHE?.trim() || join(homedir(), "zemory", "cache", "graph");
}

/** The cache file of a repo; the key is the host spelling, so the container and the host name one repo the same way. */
export function graphCacheFile(root: string): string {
  return join(graphCacheDir(), `${createHash("sha1").update(indexKey(root)).digest("hex").slice(0, 16)}.json`);
}

const mem = new Map<string, Entry & { mtime: number }>();
const inflight = new Map<string, Promise<void>>();
const lastKick = new Map<string, number>();

function mtimeOf(file: string): number | null {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

function readSaved(file: string): Saved | null {
  try {
    const s = JSON.parse(readFileSync(file, "utf8")) as Saved;
    return s && s.graph && Array.isArray(s.graph.nodes) ? s : null;
  } catch {
    return null; // half a file, an old shape: rebuilt on the next refresh
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** One builder per repo across processes (the MCP server, the daemon's hook lanes): `wx` creates the lock or fails. */
function takeLock(lock: string): boolean {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lock, "wx");
      writeSync(fd, JSON.stringify({ pid: process.pid, host: hostname() }));
      closeSync(fd);
      return true;
    } catch {
      let stale = (mtimeOf(lock) ?? 0) < Date.now() - LOCK_STALE_MS;
      if (!stale) {
        try {
          const o = JSON.parse(readFileSync(lock, "utf8")) as { pid: number; host: string };
          stale = o.host === hostname() && !pidAlive(o.pid);
        } catch {
          /* a lock being written this instant: not stale */
        }
      }
      if (!stale) return false;
      rmSync(lock, { force: true });
    }
  }
  return false;
}

function prune(dir: string): void {
  try {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if ((mtimeOf(f) ?? Date.now()) < Date.now() - PRUNE_AFTER_MS) rmSync(f, { force: true });
    }
  } catch {
    /* pruning is housekeeping */
  }
}

/** One build: skipped when the source signature still matches the saved graph. The walk is the cost, so it runs once. */
async function buildOnce(local: string, file: string): Promise<boolean> {
  let sig: string;
  try {
    sig = sourceSignature(local);
  } catch {
    sig = ""; // no signature: always rebuild (never keep a stale graph)
  }
  const prev = readSaved(file);
  if (sig && prev && prev.sig === sig) return false;
  const graph = buildCodeGraph(local);
  await enrichGraphSymbols(graph);
  const fitness = graphFitness(graph);
  // call sites are raw material for the call lane, never read by impact/neighbors, and they are most of the bytes
  const lean: CodeGraph = { ...graph, nodes: graph.nodes.map(({ callSites: _cs, ...n }) => n as CodeGraph["nodes"][number]) };
  const saved: Saved = { root: indexKey(local), sig, graph: lean, fitness, builtAt: new Date().toISOString() };
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(saved));
  renameSync(tmp, file);
  return true;
}

/**
 * Bring a repo's saved graph up to date. Runs in a worker thread (also callable inline). Another builder holding the lock
 * gets a `.dirty` mark instead, and runs again when it finishes: a change made during a build is never lost.
 */
export async function rebuildGraphCache(root: string): Promise<{ built: boolean; busy: boolean }> {
  const local = toLocalPath(root);
  const file = graphCacheFile(local);
  const dir = graphCacheDir();
  mkdirSync(dir, { recursive: true });
  const lock = `${file}.lock`;
  const dirty = `${file}.dirty`;
  if (!takeLock(lock)) {
    writeFileSync(dirty, "");
    return { built: false, busy: true };
  }
  let built = false;
  try {
    do {
      rmSync(dirty, { force: true });
      if (await buildOnce(local, file)) built = true;
    } while (existsSync(dirty));
  } finally {
    rmSync(lock, { force: true });
  }
  if (built) prune(dir);
  return { built, busy: false };
}

/** Rebuild through a worker; `wait` = the caller needs the result (no build yet, or asked fresh). */
function refresh(root: string, wait: boolean): Promise<void> {
  const key = graphCacheFile(root);
  const running = inflight.get(key);
  if (running) return running;
  lastKick.set(key, Date.now());
  const p = runInWorker<{ built: boolean; busy: boolean }>("memory/graph/graph-cache.js", "rebuildGraphCache", [root], BUILD_LIMIT_MS, { unref: !wait })
    .then(async (r) => {
      // a worker that could not start builds here; one that timed out does NOT - work too slow for a worker freezes
      // whatever event loop runs it
      if (!r.ok && !r.timedOut && wait) await rebuildGraphCache(root);
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Start a background rebuild of a repo's graph now (end of an agent turn that wrote a source file). Never throws. */
export function kickGraphRebuild(root: string): void {
  try {
    void refresh(root, false).catch(() => {});
  } catch {
    /* advisory */
  }
}

/**
 * The code graph + fitness of a project: the last saved build, at once. A background rebuild is started when the last one
 * began more than KICK_EVERY_MS ago. `fresh` waits for a rebuild first (tests, a caller that just wrote a file).
 */
export async function getCodeGraph(root: string, opts: { fresh?: boolean } = {}): Promise<{ graph: CodeGraph; fitness: GraphFitness; builtAt: string; sig: string }> {
  const file = graphCacheFile(root);
  if (opts.fresh) await refresh(root, true);
  let mtime = mtimeOf(file);
  if (mtime === null) {
    await refresh(root, true);
    mtime = mtimeOf(file);
    if (mtime === null) throw new Error("the graph could not be built");
  } else if (!opts.fresh && Date.now() - (lastKick.get(file) ?? 0) > KICK_EVERY_MS) {
    kickGraphRebuild(root);
  }
  const hit = mem.get(file);
  if (hit && hit.mtime === mtime) return { graph: hit.graph, fitness: hit.fitness, builtAt: hit.builtAt, sig: hit.sig };
  const s = readSaved(file);
  if (!s) {
    rmSync(file, { force: true });
    if (opts.fresh) throw new Error("the saved graph is unreadable");
    return getCodeGraph(root, { fresh: true });
  }
  mem.set(file, { sig: s.sig, graph: s.graph, fitness: s.fitness, builtAt: s.builtAt, mtime });
  return { graph: s.graph, fitness: s.fitness, builtAt: s.builtAt, sig: s.sig };
}

/** Drop the in-memory copies (tests / explicit rebuild); the saved files stay. */
export function clearCodeGraphCache(): void {
  mem.clear();
  lastKick.clear();
}

const turnSeen = new Map<string, string>();

/**
 * End of an agent turn: start a rebuild when a source file the session wrote is newer than at the last turn (or one is
 * gone). `written` are the session's own files; a turn that touched only docs costs a few stats and nothing else.
 */
export function kickGraphAfterTurn(root: string, written: string[]): boolean {
  const key = graphCacheFile(root);
  // a repo with no saved graph gets one after its first turn, whatever the turn wrote: the agent's first graph_impact
  // then never waits the minute a cold build takes through the Docker mount (measured 63.7 s on this repo)
  if (mtimeOf(key) === null && !inflight.has(key)) {
    kickGraphRebuild(root);
    return true;
  }
  const src = written.filter((f) => isSourceLeaf(f));
  if (!src.length) return false;
  let newest = 0;
  let present = 0;
  for (const f of src) {
    const m = mtimeOf(toLocalPath(f));
    if (m === null) continue;
    present++;
    if (m > newest) newest = m;
  }
  const mark = `${present}:${Math.round(newest)}`;
  if (turnSeen.get(key) === mark) return false;
  turnSeen.set(key, mark);
  kickGraphRebuild(root);
  return true;
}
