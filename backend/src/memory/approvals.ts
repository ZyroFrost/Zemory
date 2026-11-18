// Remote approval of an agent's permission prompts (plan/41 §6e). Claude Code is about to ask "allow this?" on a machine
// nobody sits at: its PermissionRequest hook hands the question to the daemon, a paired phone sees it and answers, the
// hook replays the answer. No answer within the wait = no decision, and the normal dialog shows on the machine - the
// phone stands in for a click at the keyboard, never for the repo's guards (those run before any prompt and still block).
//
// Held in the daemon's memory on purpose: a question lives two minutes; one that outlives a restart has nobody waiting.
import { randomUUID } from "node:crypto";
import { repoKey } from "./mail.js";
import { listPhones } from "./phone.js";
import { redact } from "./redact.js";

/** How long the hook waits for the phone before the dialog shows on the machine (user ruling 18/11: two minutes). */
export const APPROVAL_WAIT_MS = 115_000;

export interface Approval {
  id: string;
  /** The repo's folder name, as mail addresses it. */
  repo: string;
  session: string;
  tool: string;
  /** What the agent wants to run, in one readable piece (command, file, url), redacted. */
  summary: string;
  askedAt: string;
}
export interface Decision {
  allow: boolean;
  /** Said back to the agent (a reason to deny, or how to go on). */
  note?: string;
}

const pending = new Map<string, { a: Approval; done: (d: Decision | null) => void }>();

/** One readable line of what a tool call would do - what a person decides on. */
export function summarize(tool: string, input: unknown): string {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  let s = "";
  if (/^(Bash|PowerShell)$/.test(tool)) s = str(i.command);
  else if (/^(Edit|Write|MultiEdit|NotebookEdit|Read)$/.test(tool)) s = str(i.file_path ?? i.notebook_path);
  else if (/^(WebFetch|WebSearch)$/.test(tool)) s = str(i.url ?? i.query);
  if (!s) s = JSON.stringify(i);
  return redact(s).slice(0, 2000);
}

/**
 * Ask the paired phones. Resolves with their answer, or `null` (no phone paired, or nobody answered in time) - the
 * caller then gives no decision and the machine shows its own dialog.
 */
export function askApproval(
  payload: Record<string, unknown>,
  o: { waitMs?: number; phonesFile?: string } = {},
): Promise<Decision | null> {
  const waitMs = o.waitMs ?? APPROVAL_WAIT_MS;
  if (!listPhones(o.phonesFile).length) return Promise.resolve(null);
  const tool = String(payload.tool_name ?? "?").slice(0, 80);
  const dir = String(payload.project_dir ?? payload.cwd ?? "");
  const a: Approval = {
    id: randomUUID(),
    repo: dir ? repoKey(dir) : "?",
    session: String(payload.session_id ?? "").slice(0, 64),
    tool,
    summary: summarize(tool, payload.tool_input),
    askedAt: new Date().toISOString(),
  };
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(null), waitMs);
    timer.unref?.();
    const finish = (d: Decision | null): void => {
      if (!pending.has(a.id)) return;
      pending.delete(a.id);
      clearTimeout(timer);
      resolve(d);
    };
    pending.set(a.id, { a, done: finish });
  });
}

/** The questions waiting for an answer, oldest first. */
export function pendingApprovals(): Approval[] {
  return [...pending.values()].map((p) => p.a).sort((x, y) => x.askedAt.localeCompare(y.askedAt));
}

/** Answer one question; `false` when it is no longer waiting (answered, or the dialog already took over). */
export function answerApproval(id: string, allow: boolean, note?: string): boolean {
  const p = pending.get(id);
  if (!p) return false;
  const n = note?.trim().slice(0, 2000);
  p.done({ allow, ...(n ? { note: n } : {}) });
  return true;
}

/** What the PermissionRequest hook prints for a decision (code.claude.com/docs/en/hooks, PermissionRequest). */
export function permissionOutput(d: Decision): string {
  const decision = d.allow
    ? { behavior: "allow" }
    : { behavior: "deny", message: d.note ? `Denied from the phone: ${d.note}` : "Denied from the phone.", interrupt: false };
  return JSON.stringify({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision } });
}
