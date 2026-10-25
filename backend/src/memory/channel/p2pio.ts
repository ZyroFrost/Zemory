// The daemon's `BlockIO` (plan/24 §13, HP 18): what a peer session needs from the db, run off the event loop.
//   outgoing - `buildOutgoing` in a worker thread (an export of a large delta takes seconds of SQLite and crypto);
//   acked    - `ackOutgoing` in a worker thread (the mark moves under the store's write turn);
//   incoming - the block goes to the inbox, the FAST LANE merges it through the write queue (`fastrun.js merge`), and the
//              promise settles when the lane reports that block - only then does the session send `ack`.
// One instance per process: every session with every peer shares the waiters, so the lane's report reaches the right one.

import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { hostname } from "node:os";
import { runInWorker } from "../../jobs/fnworker.js";
import { withWriteTurn } from "../../jobs/writeturn.js";
import { resolveShareKey } from "../share.js";
import type { BlockIO } from "./peer.js";
import { inboxPut, mergeInboxFile, type MergedBlock, type OutBlock } from "./p2pdb.js";

/** A received block not merged after this long is answered `nack` - the sender makes it again next round. */
export const MERGE_WAIT_MS = 30 * 60_000;
/** Building the outgoing blocks of one round (a first round can export a large delta). */
const BUILD_TIMEOUT_MS = 10 * 60_000;
/**
 * A block offered and not answered before its link ended stays IN FLIGHT this long: the next round offers the same block, so
 * an ack the receiver gives later still lands, and a slow receiver is not handed the same range again under a new id
 * (2026-10-25: on a spinning disk merges outlived the links, and every round rebuilt and re-sent what was still merging).
 * Under the 60-minute sweep of `data/p2p/out`.
 */
const IN_FLIGHT_MS = 50 * 60_000;
/** How long a merged block's id is remembered: the same block offered again is acked at once, not merged again. */
const MERGED_MEMORY_MS = 2 * 60 * 60_000;

export interface P2pBlockIO extends BlockIO {
  /** The fast lane merged the inbox: settle the sessions waiting on those blocks. */
  merged: (results: MergedBlock[]) => void;
}

let current: P2pBlockIO | null = null;

/**
 * This process's `BlockIO`. Without a fast lane (a CLI `channel sync`) a received block is merged right here, under the
 * write turn; the daemon calls `useFastLaneMerge` at start so its merges run in the lane's child instead.
 */
export function blockIO(): P2pBlockIO {
  return (current ??= createBlockIO({ host: () => hostname() }));
}

/** The daemon: merges go through the fast lane, which calls `merged` with the ids it landed. */
export function useFastLaneMerge(requestMerge: () => void): P2pBlockIO {
  current = createBlockIO({ host: () => hostname(), requestMerge });
  return current;
}

export function createBlockIO(d: { host: () => string; requestMerge?: () => void }): P2pBlockIO {
  const sent = new Map<string, OutBlock>();
  const waiters = new Map<string, { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  /** One build per peer at a time: two links to the same machine would otherwise export the same range twice. */
  const building = new Map<string, Promise<OutBlock[]>>();
  const key = (peer: string, id: string): string => `${peer}\u0000${id}`;
  /** Blocks being taken in now, by id: a block arriving on a second link waits on the first one's merge. */
  const incomingNow = new Map<string, Promise<void>>();
  /** Ids merged here lately, with when: the same block offered again is acked without a second merge. */
  const mergedAt = new Map<string, number>();
  /** Per peer: the blocks offered and not answered yet, with when they were made. */
  const inFlight = new Map<string, Array<{ block: OutBlock; at: number }>>();
  const flying = (peer: string): OutBlock[] => {
    const now = Date.now();
    const list = (inFlight.get(peer) ?? []).filter((e) => now - e.at < IN_FLIGHT_MS && existsSync(e.block.file));
    inFlight.set(peer, list);
    return list.map((e) => e.block);
  };
  const land = (peer: string, id: string): void => {
    inFlight.set(peer, (inFlight.get(peer) ?? []).filter((e) => e.block.id !== id));
  };
  const asOffer = (b: OutBlock) => ({ id: b.id, bytes: b.bytes, read: () => readFile(b.file) });

  /** Put a block in the inbox and wait until it is merged (the fast lane's report), or merge it here without a lane. */
  const takeIn = async (peer: string, id: string, bytes: Buffer): Promise<void> => {
    const file = await inboxPut(peer, id, bytes);
    const requestMerge = d.requestMerge;
    if (!requestMerge) {
      const keyFile = resolveShareKey(process.cwd()) ?? undefined;
      await withWriteTurn(() => mergeInboxFile(file, { keyFile }));
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`not merged within ${MERGE_WAIT_MS / 60_000} min`));
      }, MERGE_WAIT_MS);
      timer.unref?.();
      waiters.set(id, { resolve, reject, timer });
      requestMerge();
    });
  };

  const build = async (peer: string): Promise<OutBlock[]> => {
    const r = await runInWorker<OutBlock[]>(
      "memory/channel/p2pdb.js",
      "buildOutgoing",
      [peer, d.host(), { keyFile: resolveShareKey(process.cwd()) }],
      BUILD_TIMEOUT_MS,
    );
    if (!r.ok) throw new Error(`could not make the blocks for the other machine: ${r.error}`);
    return r.value;
  };

  return {
    outgoing: async (peer) => {
      // blocks still in flight go again, under the same ids - the receiver may be merging them right now
      const again = flying(peer);
      if (again.length) return again.map(asOffer);
      const running = building.get(peer);
      if (running) {
        // The link that started this build may be gone (a relay drops while a large first round builds): this link sends
        // the same blocks. Both links alive ⇒ the receiver waits on one merge for both.
        const blocks = await running.catch(() => [] as OutBlock[]);
        return blocks.filter((b) => existsSync(b.file)).map(asOffer);
      }
      const p = build(peer);
      building.set(peer, p);
      try {
        const blocks = await p;
        const at = Date.now();
        for (const b of blocks) sent.set(key(peer, b.id), b);
        inFlight.set(peer, blocks.map((block) => ({ block, at })));
        return blocks.map(asOffer);
      } finally {
        building.delete(peer);
      }
    },
    acked: async (peer, id) => {
      const b = sent.get(key(peer, id));
      if (!b) return;
      sent.delete(key(peer, id));
      land(peer, id);
      const r = await runInWorker<void>("memory/channel/p2pdb.js", "ackOutgoing", [peer, { upto: b.upto, vecIds: b.vecIds, file: b.file }], 120_000);
      if (!r.ok) throw new Error(r.error);
    },
    dropped: (peer, id, why = "refused") => {
      if (why === "link") return; // still in flight: the next round offers it again
      const b = sent.get(key(peer, id));
      sent.delete(key(peer, id));
      land(peer, id);
      if (b) void rm(b.file, { force: true }).catch(() => {});
    },
    incoming: async (peer, id, bytes) => {
      // The same block on two links at once waits on ONE merge: a second waiter under the same id replaced the first, which
      // then never heard back and timed out (2026-10-25).
      const seen = mergedAt.get(id);
      if (seen !== undefined && Date.now() - seen < MERGED_MEMORY_MS) return; // merged already: ack it again
      const pending = incomingNow.get(id);
      if (pending) return pending;
      const p = takeIn(peer, id, bytes);
      incomingNow.set(id, p);
      try {
        await p;
        mergedAt.set(id, Date.now());
        if (mergedAt.size > 5000) for (const [k, t] of mergedAt) if (Date.now() - t >= MERGED_MEMORY_MS) mergedAt.delete(k);
      } finally {
        incomingNow.delete(id);
      }
    },
    merged: (results) => {
      for (const r of results) {
        const w = waiters.get(r.id);
        if (!w) continue;
        waiters.delete(r.id);
        clearTimeout(w.timer);
        if (r.error) w.reject(new Error(r.error));
        else w.resolve();
      }
    },
  };
}
