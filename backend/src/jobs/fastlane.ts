// p2p FAST LANE, daemon side (plan/24 §12 — user 2026-10-12: "nó phải sync liền như zalo là dc").
//
// Before this, a block was sealed only by the 30′ auto-sync, and a received block reached the store only through a whole
// sync round that gave up when the store was busy — so a message took up to ~60′ to show on the other machine.
//
// Here, on the daemon's timer (every few seconds, cheap):
//   ① SEND — is there a message of THIS machine above the p2p delta watermark? Wait for a short quiet spell (several
//      messages → one block, not one block each), then run `fastrun.js push` and, when a block was made, kick every live
//      link so the other machine is offered it in the same second.
//   ② RECEIVE — a block came in ⇒ `requestMerge()`; the next tick runs `fastrun.js merge` (merge only — no scan, embed or
//      export). Store busy ⇒ the request stays queued and runs as soon as the slot frees, never "the 30′ round will do it".
//   ③ VECTORS — the push in ① does not wait for the embedder (user 2026-10-12: "Tin trước, vector sau"; embedding first
//      made every block 17–75 s). `fastrun.js vectors` is the EMBED LANE (§12.7, user: "1 hàng đưa vào và 1 hàng nhúng"):
//      it runs IN PARALLEL with ⓪①②, outside the job slot — the model computes freely, every write takes the store's
//      write turn (`writeturn.ts`). Started after a push that moved messages, and whenever the embed frontier is behind.
//   ⓪ INGEST — the Stop hook found the slot busy and left a note (`ingestqueue.ts`, §12.6) ⇒ `fastrun.js ingest` lands
//      that chat FIRST: nothing else here has anything to send until it is in the store. Runs with p2p off too — capture
//      is this machine's own business, not the channel's.
// ⓪①② go through the daemon's ONE job slot AND take the write turn (the embed lane may be writing beside them). A sync
// round already running is never pre-empted (it exports this delta itself); the maintenance chain is asked to yield, as
// the "Sync now" button does — its work is restartable, a person is waiting on this.

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { constants, setPriority } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { claimDaemonJob, daemonJobBusy, endEmbedLane, releaseDaemonJob, startEmbedLane, yieldDaemonJob } from "./writegate.js";
import { backgroundChildEnv } from "./childenv.js";
import { hasQueuedIngest } from "./ingestqueue.js";
import { Q } from "../memory/store/queries.js";

/** Quiet spell after the last new message before a block is sealed. */
export const FAST_QUIET_MS = 3_000;
/** Longest a pending message waits while messages keep coming (a long streak still ships). */
export const FAST_MAX_WAIT_MS = 12_000;
/** Rest after a push that moved no message of ours (frontier blocked / failure) — no back-to-back empty rounds. */
export const FAST_REST_MS = 30_000;
/**
 * Embed budget of one vector round (§12.7). The round holds the ONE job slot; measured 12/10 on DESKTOP-PFB157K (~8 s per
 * vector) a full round took 299–411 s and a block received from the laptop waited ~5.5 min behind it. Past the budget the
 * round seals what it has and the lane queues another — ingest, merge and push are always picked before vectors, so they
 * get the slot between rounds.
 */
export const FAST_VECTOR_BUDGET_MS = 30_000;
/** Messages per model batch in a vector round: the budget is checked between batches (16 × ~8 s would be ~2 min). */
export const FAST_VECTOR_BATCH = 4;
/** How often the embed lane looks at the embed frontier when nothing queued it (one indexed query, ~90 ms). */
export const FAST_FRONTIER_PROBE_MS = 10_000;

export interface FastSendState {
  /** highest own message id seen on the last poll (0 = nothing pending) */
  seenMax: number;
  /** when `seenMax` last grew */
  lastGrowAt: number;
  /** when the current pending streak started */
  firstAt: number;
}

export const freshSendState = (): FastSendState => ({ seenMax: 0, lastGrowAt: 0, firstAt: 0 });

/**
 * Pure: given the poll result (`pendingMax` = highest own message id above the watermark, 0 = none), advance the state and
 * say whether to seal a block NOW. Quiet for `FAST_QUIET_MS`, or pending for `FAST_MAX_WAIT_MS` ⇒ fire.
 */
export function fastSendDecide(prev: FastSendState, pendingMax: number, now: number): { state: FastSendState; fire: boolean } {
  if (pendingMax <= 0) return { state: freshSendState(), fire: false };
  const grew = pendingMax > prev.seenMax;
  // "A streak is already open" is `prev.seenMax > 0`, never a timestamp used as a flag (a clock reading of 0 reset it).
  const state: FastSendState = {
    seenMax: pendingMax,
    lastGrowAt: grew ? now : prev.lastGrowAt,
    firstAt: prev.seenMax > 0 ? prev.firstAt : now,
  };
  const fire = now - state.lastGrowAt >= FAST_QUIET_MS || now - state.firstAt >= FAST_MAX_WAIT_MS;
  return { state, fire };
}

/**
 * Highest id of a message THIS machine originated above the p2p watermark (`sync_state` `p2p:<host>`), or 0. "Mine" uses
 * the same rule as the delta export (`buildRowsSnapshot`): `host` = this machine, or NULL / 'unknown' (pre-v4 rows) — a
 * message merged from the other machine is never a reason to seal a block. Read-only, one indexed range query.
 */
/** Per store + host: the watermark the scan started from, the highest id already looked at, the newest own id found. */
const pendingScan = new Map<string, { wm: number; scannedTo: number; best: number }>();

export function ownPendingMax(dbPath: string, host: string): number {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma("busy_timeout = 2000");
    // The watermark key uses the SANITISED name (`wmKeyFor` via `sanitizeHost`), `sessions.host` the raw one — as the export.
    const wmHost = (host || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
    const wm = (db.prepare("SELECT last_message_id AS v FROM sync_state WHERE bundle = ?").get(`p2p:${wmHost}`) as { v: number } | undefined)?.v ?? 0;
    // Each tick looks only at the ids that arrived since the last one. A walk of everything above the watermark took
    // 4-8 s on the event loop whenever many messages merged from the other machine sat above it (profiled 2026-10-23,
    // natively and in Docker). Ids only grow, so the newest own id seen so far stays the answer until the watermark moves.
    const top = (db.prepare(Q.maxMessageId).get() as { m: number }).m;
    const key = `${dbPath}\u0000${host}`;
    let c = pendingScan.get(key);
    if (!c || c.wm !== wm || top < c.scannedTo) c = { wm, scannedTo: wm, best: 0 };
    if (top > c.scannedTo) {
      const r = db.prepare(Q.ownMaxMessageBetween).get(c.scannedTo, top, host) as { m: number | null } | undefined;
      if (r?.m) c.best = Math.max(c.best, r.m);
      c.scannedTo = top;
    }
    pendingScan.set(key, c);
    return c.best > wm ? c.best : 0;
  } catch {
    return 0; // no store / locked / old schema ⇒ nothing to say (fail-open, art. 9)
  } finally {
    db?.close();
  }
}

/** dist/jobs/fastlane.js → dist/jobs/fastrun.js; `ZEMORY_FASTLANE_RUNNER` replaces it so the gate can drive a fake child. */
function runnerEntry(): string {
  return process.env.ZEMORY_FASTLANE_RUNNER || join(dirname(fileURLToPath(import.meta.url)), "fastrun.js");
}

export interface FastLaneDeps {
  dbPath: () => string;
  host: () => string;
  /** p2p on and at least one machine paired — otherwise the lane is off */
  enabled: () => boolean;
  /** the 30′ sync round is running (never pre-empted) */
  syncRunning: () => boolean;
  /** a block was sealed: offer it now on every live link */
  kickLinks: () => void;
  log: (m: string) => void;
  /** the store changed (merge added rows) */
  onMerged?: () => void;
  /** The embed frontier (`embedFrontierId`): a recent message still without its vector, or null. Omitted ⇒ never probed. */
  frontier?: () => number | null;
}

type FastMode = "ingest" | "push" | "vectors" | "merge";
type WriteMode = Exclude<FastMode, "vectors">;

export interface FastLaneStatus {
  /** the WRITE lane (job slot): ingest · push · merge */
  running: WriteMode | null;
  /** the EMBED lane runs beside it */
  embedding: boolean;
  mergeQueued: boolean;
  vectorsQueued: boolean;
  lastIngest?: { at: number; ms: number; ok: boolean; files?: number; newMessages?: number; error?: string };
  lastPush?: { at: number; ms: number; ok: boolean; kind?: string; messages?: number; error?: string };
  lastVectors?: { at: number; ms: number; ok: boolean; kind?: string; embedded?: number; error?: string };
  lastMerge?: { at: number; ms: number; ok: boolean; messagesAdded?: number; error?: string };
}

export class FastLane {
  private send = freshSendState();
  /** the WRITE lane's child (holds the job slot) */
  private child: ChildProcess | null = null;
  /** the EMBED lane's child (beside the slot, §12.7) */
  private embedChild: ChildProcess | null = null;
  private mergeQueued = false;
  /** A push moved messages without their vectors — ③ owes the block that carries them. */
  private vectorsQueued = false;
  /** Last time the embed lane looked at the frontier on its own. */
  private frontierProbedAt = 0;
  /** A frontier the embedder could not move (that message cannot be embedded) — never respawn on it. */
  private stuckAt: number | null = null;
  private st: FastLaneStatus = { running: null, embedding: false, mergeQueued: false, vectorsQueued: false };
  private yieldAsked = 0;
  /** A push that carried NO message while some wait (the frontier still blocks them) ⇒ rest instead of firing every few
   *  seconds (measured 12/10: 19.8 s rounds sealing 0 messages back to back). */
  private restUntil = 0;
  /** A failed ingest leaves its notes queued ⇒ rest, or the lane would spawn a failing child every tick. */
  private ingestRestUntil = 0;
  constructor(private d: FastLaneDeps) {}

  status(): FastLaneStatus {
    return { ...this.st, running: this.st.running, embedding: this.embedChild !== null, mergeQueued: this.mergeQueued, vectorsQueued: this.vectorsQueued };
  }

  /** A block arrived from another machine — merge it as soon as the slot is free. */
  requestMerge(): void {
    this.mergeQueued = true;
  }

  /** One timer tick. Returns what it started, for the gate (the write lane's job if both lanes started one). */
  tick(now = Date.now()): FastMode | null {
    const w = this.tickWrite(now);
    const e = this.tickEmbed(now);
    return w ?? e;
  }

  /** The WRITE lane: ⓪ ingest → ② merge → ① push, one at a time, in the job slot. */
  private tickWrite(now: number): WriteMode | null {
    if (this.child) return null;
    // ⓪ before the p2p switch on purpose: deferred chat must reach the store whether or not a machine is paired.
    if (now >= this.ingestRestUntil && hasQueuedIngest()) return this.startWrite("ingest", now) ? "ingest" : null;
    if (!this.d.enabled()) return null;
    // Receiving first: a block already here is cheaper to land than a new one to seal, and it is what the user is waiting on.
    if (this.mergeQueued) return this.startWrite("merge", now) ? "merge" : null;
    if (now < this.restUntil) return null;
    const r = fastSendDecide(this.send, ownPendingMax(this.d.dbPath(), this.d.host()), now);
    this.send = r.state;
    if (r.fire) return this.startWrite("push", now) ? "push" : null;
    return null;
  }

  /** The EMBED lane (§12.7): beside the write lane, never in the job slot. */
  private tickEmbed(now: number): "vectors" | null {
    if (this.embedChild || !this.d.enabled() || this.d.syncRunning()) return null;
    let owed = this.vectorsQueued;
    if (!owed && this.d.frontier && now - this.frontierProbedAt >= FAST_FRONTIER_PROBE_MS) {
      this.frontierProbedAt = now;
      const f = this.d.frontier();
      owed = f !== null && f !== this.stuckAt;
    }
    if (!owed) return null;
    // Refused while a job that writes WITHOUT the turn holds the slot, or one waits for its turn (writegate).
    if (!startEmbedLane("fastlane-vectors")) return null;
    this.vectorsQueued = false;
    const c = this.spawnJob("vectors", (code, res, ms, error) => {
      this.embedChild = null;
      endEmbedLane();
      const ok = code === 0 && res.ok !== false;
      this.st.lastVectors = { at: Date.now(), ms, ok, kind: res.kind, embedded: res.embedded, ...(error ? { error } : {}) };
      // Budget spent with vectors still owed ⇒ another round. A FAILED round is not retried: the 30′ round / the next
      // probe pick the vectors up (`vec_shipped`), and a retry loop on a broken embedder would spawn a child every tick.
      if (ok && res.more) this.vectorsQueued = true;
      this.stuckAt = ok && typeof res.stuckAt === "number" ? res.stuckAt : null;
      if (ok && res.kind && res.kind !== "none") {
        this.d.log(`[fastlane] vectors followed: ${res.embedded ?? "?"} embedded in ${((res.embedMs ?? 0) / 1000).toFixed(1)}s, block in ${(ms / 1000).toFixed(1)}s${this.waited(res)} — offering it now${res.more ? " (budget spent, more next round)" : ""}`);
        this.d.kickLinks();
      } else if (!ok) this.d.log(`[fastlane] vectors failed after ${(ms / 1000).toFixed(1)}s: ${error} — the 30′ round ships them`);
    });
    if (!c) {
      endEmbedLane();
      return null;
    }
    this.embedChild = c;
    return "vectors";
  }

  private startWrite(mode: WriteMode, now: number): boolean {
    if (this.d.syncRunning()) return false; // the round exports / merges this itself; stay queued
    if (!claimDaemonJob(`fastlane-${mode}`)) {
      // The maintenance chain holds the slot ⇒ ask it to yield once per few seconds (a sync job is never asked: see above).
      if (daemonJobBusy() !== "sync" && now - this.yieldAsked > 5_000) {
        this.yieldAsked = now;
        yieldDaemonJob(mode === "merge" ? "nhận liền" : mode === "ingest" ? "nạp liền" : "gửi liền");
      }
      return false;
    }
    if (mode === "merge") this.mergeQueued = false;
    const c = this.spawnJob(mode, (code, res, ms, error) => {
      this.child = null;
      this.st.running = null;
      releaseDaemonJob();
      this.onWriteDone(mode, code === 0 && res.ok !== false, res, ms, error);
    });
    if (!c) {
      releaseDaemonJob();
      if (mode === "merge") this.mergeQueued = true;
      return false;
    }
    this.child = c;
    this.st.running = mode;
    return true;
  }

  /** Spawn one `fastrun.js <mode>` child; `onDone` gets its result line. Null when it could not start. */
  private spawnJob(mode: FastMode, onDone: (code: number | null, res: JobResult, ms: number, error: string | undefined) => void): ChildProcess | null {
    let c: ChildProcess;
    try {
      c = spawn(process.execPath, [runnerEntry(), mode], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: backgroundChildEnv(process.env, false) });
      // The embed lane loads the model (~2 GB) and runs it flat out: below-normal priority yields the CPU to the daemon,
      // which answers the cockpit. Measured 2026-10-23 in the Docker VM: an embed round at normal priority and the daemon
      // shared 4 cores and /ping stalled 10-30 s. Push and merge keep normal priority (seconds between machines).
      if (mode === "vectors" && c.pid) {
        try {
          setPriority(c.pid, constants.priority.PRIORITY_BELOW_NORMAL);
        } catch {
          /* no right to lower it: it still runs, it only does not yield */
        }
      }
    } catch (e) {
      this.d.log(`[fastlane] ${mode}: could not start (${String(e).slice(0, 120)})`);
      return null;
    }
    const t0 = Date.now();
    let out = "";
    let err = "";
    let settled = false;
    c.stdout?.on("data", (b: Buffer) => {
      out = (out + String(b)).slice(-65536);
    });
    c.stderr?.on("data", (b: Buffer) => {
      err = (err + String(b)).slice(-8192); // drained so a full pipe never hangs the child
    });
    const done = (code: number | null): void => {
      if (settled) return;
      settled = true;
      let res: JobResult = {};
      for (const line of out.trim().split("\n").reverse()) {
        try {
          res = JSON.parse(line);
          break;
        } catch {
          /* not the result line */
        }
      }
      const ok = code === 0 && res.ok !== false;
      const error = ok ? undefined : res.error ?? (err.trim().split("\n").pop() || `exit ${code}`);
      onDone(code, res, Date.now() - t0, error);
    };
    c.on("exit", (code) => done(code));
    c.on("error", () => done(null));
    return c;
  }

  /** " (Xs of it waiting for the write turn)" when the wait is worth naming — a slow round then says WHY it was slow. */
  private waited(res: JobResult): string {
    const w = res.turnWaitMs ?? 0;
    return w >= 1000 ? ` (${(w / 1000).toFixed(1)}s of it waiting for the write turn)` : "";
  }

  private onWriteDone(mode: WriteMode, ok: boolean, res: JobResult, ms: number, error: string | undefined): void {
    if (mode === "ingest") {
        this.st.lastIngest = { at: Date.now(), ms, ok, files: res.files, newMessages: res.newMessages, ...(error ? { error } : {}) };
        if (!ok) {
          this.ingestRestUntil = Date.now() + FAST_REST_MS;
          this.d.log(`[fastlane] ingest failed after ${(ms / 1000).toFixed(1)}s: ${error} — the notes stay queued, retrying after a rest`);
        } else if ((res.newMessages ?? 0) > 0) {
          this.d.log(`[fastlane] ingested ${res.newMessages} message(s) the capture hook deferred (store was busy) in ${(ms / 1000).toFixed(1)}s${this.waited(res)}`);
          this.d.onMerged?.();
        }
      } else if (mode === "push") {
        this.st.lastPush = { at: Date.now(), ms, ok, kind: res.kind, messages: res.messages, ...(error ? { error } : {}) };
        this.send = freshSendState();
        // Nothing of ours travelled (or it failed) ⇒ rest before the next attempt; a block with messages ⇒ ready at once.
        if (!ok || !(res.messages && res.messages > 0)) this.restUntil = Date.now() + FAST_REST_MS;
        else this.vectorsQueued = true; // the messages went without their vectors — ③ owes the next block
        if (ok && res.kind && res.kind !== "none") {
          this.d.log(`[fastlane] sealed ${res.messages ?? "?"} message(s) into one block in ${(ms / 1000).toFixed(1)}s${this.waited(res)} — offering it now`);
          this.d.kickLinks();
        } else if (!ok) this.d.log(`[fastlane] push failed after ${(ms / 1000).toFixed(1)}s: ${error}`);
      } else {
        this.st.lastMerge = { at: Date.now(), ms, ok, messagesAdded: res.messagesAdded, ...(error ? { error } : {}) };
        if (ok) {
          if ((res.messagesAdded ?? 0) > 0) this.d.log(`[fastlane] merged ${res.messagesAdded} message(s) from the other machine in ${(ms / 1000).toFixed(1)}s${this.waited(res)}`);
          this.d.onMerged?.();
        } else {
          this.mergeQueued = true; // try again next tick — the block is safe in the channel folder
          this.d.log(`[fastlane] merge failed after ${(ms / 1000).toFixed(1)}s: ${error} — retrying`);
        }
      }
  }

  /** Daemon shutdown. */
  stop(): void {
    for (const c of [this.child, this.embedChild]) {
      try {
        c?.kill();
      } catch {
        /* gone */
      }
    }
  }
}

interface JobResult {
  ok?: boolean;
  /** Time the child spent queued for the store's write turn (`turnWaitTotalMs`). */
  turnWaitMs?: number;
  kind?: string;
  messages?: number;
  messagesAdded?: number;
  error?: string;
  embedded?: number;
  embedMs?: number;
  files?: number;
  newMessages?: number;
  more?: boolean;
  stuckAt?: number | null;
}
