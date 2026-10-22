// The mirror inventory of THIS machine, kept fresh by one long-lived worker thread instead of a scan on the event loop.
// A peer session asks for it twice per round; scanMirror walks docs/, docs_visual/, attic/ and the store's files/ with a
// stat per file. Through a Docker mount of a Windows drive that held the daemon for 10-18 s every round and the cockpit
// stopped answering (profiled 2026-10-22: scanMirror → walk, 17.9 s of 45). The worker keeps its own hash and folder
// caches between scans, so after the first pass a scan re-stats but does not re-hash.
//
// Not ready yet (the first scan still running) ⇒ `null`: the caller must SKIP the mirror phase - an empty inventory would
// tell the peer this machine has no file at all, and it would ship every one of them again.
import { Worker } from "node:worker_threads";
import type { MirrorEntry } from "./mirror.js";

const EVERY_MS = 15_000;
const WORKER_SRC = `
const { parentPort, workerData } = require("node:worker_threads");
import(workerData.mod).then((m) => {
  const tick = () => {
    try {
      parentPort.postMessage({ ok: true, entries: m.scanMirror({}).entries });
    } catch (e) {
      parentPort.postMessage({ ok: false, error: String((e && e.message) || e) });
    }
    setTimeout(tick, workerData.everyMs);
  };
  tick();
});
`;

let worker: Worker | null = null;
let latest: { at: number; entries: MirrorEntry[] } | null = null;

function ensure(): void {
  if (worker) return;
  try {
    worker = new Worker(WORKER_SRC, { eval: true, workerData: { mod: new URL("./mirror.js", import.meta.url).href, everyMs: EVERY_MS } });
  } catch {
    worker = null;
    return;
  }
  worker.unref(); // a CLI that touched the channel must still exit
  worker.on("message", (m: { ok: boolean; entries?: MirrorEntry[] }) => {
    if (m.ok && m.entries) latest = { at: Date.now(), entries: m.entries };
  });
  const gone = (): void => {
    worker = null; // the next ask starts a new one
  };
  worker.on("error", gone);
  worker.on("exit", gone);
}

/** The latest inventory the worker produced, or null while the first scan is still running. */
export function mirrorInventoryCached(): MirrorEntry[] | null {
  ensure();
  return latest?.entries ?? null;
}
