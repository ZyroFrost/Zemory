// The daemon's `BlockIO` (plan/24 §13, HP 18): what a peer session needs from the db, run off the event loop.
//   outgoing - `buildOutgoing` in a worker thread (an export of a large delta takes seconds of SQLite and crypto);
//   acked    - `ackOutgoing` in a worker thread (the mark moves under the store's write turn);
//   incoming - the block goes to the inbox, the FAST LANE merges it through the write queue (`fastrun.js merge`), and the
//              promise settles when the lane reports that block - only then does the session send `ack`.
// One instance per process: every session with every peer shares the waiters, so the lane's report reaches the right one.

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
      const running = building.get(peer);
      if (running) {
        await running.catch(() => []);
        return []; // the other link with this machine is sending this range
      }
      const p = build(peer);
      building.set(peer, p);
      try {
        const blocks = await p;
        for (const b of blocks) sent.set(key(peer, b.id), b);
        return blocks.map((b) => ({ id: b.id, bytes: b.bytes, read: () => readFile(b.file) }));
      } finally {
        building.delete(peer);
      }
    },
    acked: async (peer, id) => {
      const b = sent.get(key(peer, id));
      if (!b) return;
      sent.delete(key(peer, id));
      const r = await runInWorker<void>("memory/channel/p2pdb.js", "ackOutgoing", [peer, { upto: b.upto, vecIds: b.vecIds, file: b.file }], 120_000);
      if (!r.ok) throw new Error(r.error);
    },
    dropped: (peer, id) => {
      const b = sent.get(key(peer, id));
      sent.delete(key(peer, id));
      if (b) void rm(b.file, { force: true }).catch(() => {});
    },
    incoming: async (peer, id, bytes) => {
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
