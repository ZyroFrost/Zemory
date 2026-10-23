// Child entry of the p2p FAST LANE (plan/24 §12, §13): `node dist/jobs/fastrun.js ingest|vectors|merge`. The daemon spawns it
// so the work — embed (ONNX), decrypt, SQLite writes — never runs on the daemon's event loop (measured 24/09: a merge on the
// event loop froze TLS handshakes and heartbeats for tens of minutes). One JSON line on stdout is the result.
//   vectors — embed from the frontier (`embedFastLane`); the links then offer the new vectors from the db.
//   merge   — merge the blocks a peer session put in the inbox (`mergeInbox`), each thrown away after; the daemon answers
//             each sender's block with `ack` from the ids in the result line.
//   ingest  — ingest the transcripts the Stop hook deferred while the slot was busy (`drainIngestQueue`, plan/24 §12.6).
// Nothing here seals a block: the channel makes blocks from the db per receiving machine (HP 18).
import { mergeInbox } from "../memory/channel/p2pdb.js";
import { embedFastLane, resolveShareKey } from "../memory/share.js";
import { drainIngestQueue } from "./ingestqueue.js";
import { FAST_VECTOR_BATCH, FAST_VECTOR_BUDGET_MS } from "./fastlane.js";
import { acquireWriteTurn, turnWaitTotalMs, withWriteTurn } from "./writeturn.js";

// Every job here writes the store while the EMBED LANE (`vectors`) may be running in parallel (plan/24 §12.7): each takes
// the store's write turn — ingest / merge for the whole job (seconds), vectors per batch write (ms).
(async () => {
  const mode = process.argv[2];
  try {
    if (mode === "ingest") {
      // No share key needed: this only reads transcripts into the local store.
      const r = await withWriteTurn(() => drainIngestQueue());
      console.log(JSON.stringify({ ok: true, mode, files: r.files, newMessages: r.newMessages, missing: r.missing, turnWaitMs: turnWaitTotalMs() }));
      return;
    }
    if (mode === "vectors") {
      const writeTurn = (): Promise<() => void> => acquireWriteTurn();
      const r = await embedFastLane({ embedBudgetMs: FAST_VECTOR_BUDGET_MS, embedBatch: FAST_VECTOR_BATCH, writeTurn });
      console.log(JSON.stringify({ ok: true, mode, embedded: r.embedded, embedMs: r.embedMs, more: r.more, stuckAt: r.stuckAt, turnWaitMs: turnWaitTotalMs() }));
    } else if (mode === "merge") {
      const keyFile = resolveShareKey(process.cwd()) ?? undefined;
      const r = await withWriteTurn(() => mergeInbox({ keyFile }));
      const added = r.reduce((n, e) => n + e.messagesAdded, 0);
      const errors = r.filter((e) => e.error).map((e) => `${e.id.slice(0, 8)}: ${e.error}`);
      // a block that failed is answered `nack` from its id, so the job itself still succeeded
      console.log(JSON.stringify({ ok: true, mode, blocks: r.length, messagesAdded: added, merged: r, turnWaitMs: turnWaitTotalMs(), ...(errors.length ? { warning: errors.slice(0, 3).join(" · ") } : {}) }));
    } else {
      console.log(JSON.stringify({ ok: false, error: `unknown mode "${mode ?? ""}" (ingest | vectors | merge)` }));
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    console.log(JSON.stringify({ ok: false, mode, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  }
})();
