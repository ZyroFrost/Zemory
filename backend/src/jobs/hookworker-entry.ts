// The body of a hook worker thread (jobs/hookpool.ts): it answers hook events with the same relayHook the daemon used to run
// on its own event loop. Each message is { id, event, payload, map }; each answer is { id, answer } or { id, error }.
import { parentPort } from "node:worker_threads";
import { deferHarnessCheck } from "../memory/capture-hook.js";
import { relayHook, type PathPair } from "../memory/hook-relay.js";
import { harnessNoteInWorker } from "./harnessworker.js";

// the harness check walks a repo tree for minutes on a big repo: even here it must not hold this worker's next hook
deferHarnessCheck((here, notePath) => void harnessNoteInWorker(here, notePath));

parentPort?.on("message", (m: { id: number; event: string; payload: Record<string, unknown>; map: PathPair[] }) => {
  try {
    parentPort!.postMessage({ id: m.id, answer: relayHook(m.event, m.payload, m.map) });
  } catch (e) {
    parentPort!.postMessage({ id: m.id, error: String((e as Error)?.message ?? e) });
  }
});
