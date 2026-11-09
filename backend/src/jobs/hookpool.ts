// Hook events off the daemon's event loop: a small pool of worker threads runs relayHook, the main thread only receives the
// request and sends the answer.
//
// Why (measured 2026-11-09 through the inspector): every hook read files synchronously, and on the container's 9p mount one
// slow read held the whole daemon — /ping, the UI, every other session's hook — for 20-50 s. Four of those reads were fixed
// one by one; a fifth still held /ping ~30 s inside a native call no inspector could pause. Moving the hooks off the loop
// ends that class of stall rather than chasing the next read.
//
// Rules:
//   · an answer comes within HOOK_ANSWER_MS: the host client gives up at 15 s anyway (backend/scripts/host-hook.mjs), so a
//     late hook answers "nothing" (fail-open, code 0) — its work still runs to the end and the worker is reused after;
//   · a worker that dies or throws answers "nothing" for its hook and is replaced;
//   · no worker can be started ⇒ the hook runs inline, as before (HP article 9: never lose the hook).
import { Worker } from "node:worker_threads";
import { relayHook, type HookAnswer, type PathPair } from "../memory/hook-relay.js";

export const HOOK_ANSWER_MS = 14_000;
const NOTHING: HookAnswer = { stdout: "", stderr: "", code: 0, known: true };

interface Job { id: number; event: string; payload: Record<string, unknown>; map: PathPair[]; done: (a: HookAnswer) => void }
interface Slot { w: Worker; job: Job | null }

export class HookPool {
  private slots: Slot[] = [];
  private queue: Job[] = [];
  private next = 1;
  private readonly size: number;
  private readonly entry: URL;
  private readonly answerMs: number;
  private broken = false;
  /** workers in a row that died before answering anything: a worker that cannot even start must not be respawned forever */
  private failures = 0;

  constructor(o: { size?: number; entry?: URL; answerMs?: number } = {}) {
    this.size = Math.max(1, o.size ?? 2);
    this.entry = o.entry ?? new URL("./hookworker-entry.js", import.meta.url);
    this.answerMs = o.answerMs ?? HOOK_ANSWER_MS;
  }

  /** Workers alive now (for tests and the status line). */
  get alive(): number {
    return this.slots.length;
  }

  /** Start every worker now, so the first hook does not pay the ~1 s start of a worker (measured 2026-11-09). */
  warm(): void {
    while (!this.broken && this.slots.length < this.size) if (!this.startWorker()) break;
  }

  run(event: string, payload: Record<string, unknown>, map: PathPair[]): Promise<HookAnswer> {
    if (this.broken) return Promise.resolve(relayHook(event, payload, map));
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => settle(NOTHING), this.answerMs);
      timer.unref?.();
      const settle = (a: HookAnswer): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(a);
      };
      this.queue.push({ id: this.next++, event, payload, map, done: settle });
      this.pump();
    });
  }

  close(): Promise<unknown> {
    const all = this.slots.map((s) => s.w.terminate());
    this.slots = [];
    for (const j of this.queue.splice(0)) j.done(NOTHING);
    return Promise.all(all);
  }

  private pump(): void {
    while (this.queue.length) {
      let slot = this.slots.find((s) => !s.job);
      if (!slot && this.slots.length < this.size) slot = this.startWorker() ?? undefined;
      if (!slot) {
        if (this.broken) for (const j of this.queue.splice(0)) j.done(relayHook(j.event, j.payload, j.map));
        return;
      }
      const job = this.queue.shift()!;
      slot.job = job;
      slot.w.postMessage({ id: job.id, event: job.event, payload: job.payload, map: job.map });
    }
  }

  private startWorker(): Slot | null {
    let w: Worker;
    try {
      w = new Worker(this.entry);
    } catch {
      this.broken = this.slots.length === 0; // not one worker can start: run inline from now on
      return null;
    }
    w.unref();
    const slot: Slot = { w, job: null };
    this.slots.push(slot);
    w.on("message", (m: { id: number; answer?: HookAnswer; error?: string }) => {
      const job = slot.job;
      if (!job || job.id !== m.id) return;
      this.failures = 0;
      slot.job = null;
      job.done(m.answer ?? NOTHING);
      this.pump();
    });
    let gone = false;
    const lost = (): void => {
      if (gone) return;
      gone = true;
      if (++this.failures >= 3) this.broken = true;
      const job = slot.job;
      slot.job = null;
      this.slots = this.slots.filter((s) => s !== slot);
      job?.done(NOTHING);
      if (this.broken) for (const j of this.queue.splice(0)) j.done(relayHook(j.event, j.payload, j.map));
      else this.pump();
    };
    w.on("error", lost);
    w.on("exit", lost);
    return slot;
  }
}

/** The hooks that may be slow (ingesting the session, the auto-commit's git, reading a long transcript). */
const SLOW_EVENTS = new Set(["stop", "session-end"]);

/**
 * Two lanes, so a prompt never queues behind a stop: the stop hook of a long session took over 14 s in the container (its
 * auto-commit reads the whole 18 MB transcript and runs git over the 9p mount), and with one shared pool the prompts behind
 * two such stops hit the deadline and answered nothing — their reminders lost (measured 2026-11-09). A prompt, a session
 * start, a compaction and the send guard run in the fast lane; stop and session end in the slow one.
 */
export class HookLanes {
  private readonly fast: HookPool;
  private readonly slow: HookPool;

  constructor(o: { fast?: number; slow?: number; entry?: URL; answerMs?: number } = {}) {
    this.fast = new HookPool({ size: o.fast ?? 1, entry: o.entry, answerMs: o.answerMs });
    this.slow = new HookPool({ size: o.slow ?? 1, entry: o.entry, answerMs: o.answerMs });
  }

  warm(): void {
    this.fast.warm();
    this.slow.warm();
  }

  run(event: string, payload: Record<string, unknown>, map: PathPair[]): Promise<HookAnswer> {
    return (SLOW_EVENTS.has(event) ? this.slow : this.fast).run(event, payload, map);
  }

  close(): Promise<unknown> {
    return Promise.all([this.fast.close(), this.slow.close()]);
  }
}
