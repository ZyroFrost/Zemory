// Hooks over HTTP for the Docker path (docs/plan/30 §5 ②). Claude Code calls its hooks on the HOST; in the Docker path
// the engine lives in the container, so a small host client (backend/scripts/host-hook.mjs, Node built-ins only) posts
// the hook payload to the daemon, which runs the same handler as `zemory hook <event>` and answers stdout · stderr · code.
//
// The payload names host paths (`transcript_path` = C:\Users\<u>\.claude\projects\…\<sid>.jsonl). The container sees
// them under its mounts, so they are translated by ZEMORY_PATH_MAP (`<host prefix>=><container prefix>`, `;`-separated,
// set by docker-compose.yml). `cwd` is NOT translated: it is the project's identity, and the store keys projects by the
// host path (plan/30 §3 a).

import { handleHook, type HookEventName } from "./capture-hook.js";
import { judgeSendPurpose, judgeSendTarget, listPeers } from "./send-guard.js";
import { mapHostPath, type PathPair } from "../util/hostpath.js";

export { mapHostPath, parsePathMap, type PathPair } from "../util/hostpath.js";

const EVENTS: readonly string[] = ["session-start", "stop", "session-end", "prompt", "pre-compact", "send-guard"];

export interface HookAnswer {
  stdout: string;
  stderr: string;
  code: number;
  /** false = an event this relay does not run (said nothing, let through) */
  known: boolean;
}

/** The payload as the container must read it: `transcript_path` under the mounts; everything else as posted. */
export function mapPayload(payload: Record<string, unknown>, map: PathPair[]): Record<string, unknown> {
  const tp = payload.transcript_path;
  return typeof tp === "string" ? { ...payload, transcript_path: mapHostPath(tp, map) } : { ...payload };
}

/** Run one hook event for a payload posted by the host client. Unknown event ⇒ code 0, nothing said (fail-open). */
export function relayHook(event: string, payload: Record<string, unknown>, map: PathPair[]): HookAnswer {
  if (!EVENTS.includes(event)) return { stdout: "", stderr: "", code: 0, known: false };
  const p = mapPayload(payload, map);
  const tp = p.transcript_path;
  if (event === "send-guard") {
    const input = (p.tool_input ?? {}) as { to?: unknown; message?: unknown };
    // the container cannot probe host pids: the host client sends the live ones (`live_pids`); without them the
    // sessions are probed here, as the stdin hook does
    const live = Array.isArray(p.live_pids) ? new Set((p.live_pids as unknown[]).map(Number)) : null;
    const peers = live ? listPeers((pid) => live.has(pid)) : listPeers();
    const why = judgeSendTarget(input.to, peers) ?? judgeSendPurpose(input, typeof tp === "string" ? tp : "", peers);
    if (!why) return { stdout: "", stderr: "", code: 0, known: true };
    return {
      stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } }),
      stderr: why + "\n",
      code: 2,
      known: true,
    };
  }
  return { stdout: handleHook(event as HookEventName, p), stderr: "", code: 0, known: true };
}
