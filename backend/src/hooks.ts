// Runtime hooks layer — the bridge from passive store to live agent.
//
// Design mirrors agentmemory's TRIGGER model (verified from its source):
//   - CAPTURE is automatic via a write-only hook (Stop → auto-ingest). 0 tokens,
//     no context change — just keeps the memory fresh.
//   - RECALL is NOT auto-pushed every prompt (that bloats tokens / pollutes
//     context — agentmemory tried it and defaulted it OFF). Recall happens on
//     the AGENT's judgment: it runs `zemory memory search` when the user's prompt
//     references past work (advertised via the project's AGENTS.md).
//
// So `hook install` installs ONLY the Stop capture hook. SessionStart injection
// stays available as an opt-in handler but is NOT installed by default.
// Handlers MUST be fail-safe: a hook error must never break the host session.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { scan } from "./memory/ingest.js";
import { recallCard } from "./memory/recall.js";

export type HookEventName = "session-start" | "stop" | "session-end";

/** Run a hook handler. Returns text to write to stdout (may be ""). */
export function handleHook(event: HookEventName, payload: any): string {
  try {
    const cwd: string | undefined = payload?.cwd;
    if (event === "session-start") {
      const card = cwd ? recallCard(cwd) : "";
      if (!card) return "";
      // Claude Code injects `additionalContext` from a SessionStart hook.
      return JSON.stringify({
        hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: card },
      });
    }
    if (event === "stop" || event === "session-end") {
      scan(); // fast, incremental — ingest whatever the session just appended
      return "";
    }
    return "";
  } catch {
    return ""; // never break the host
  }
}

// ---- Installer: merge zemory hooks into Claude Code settings (non-destructive) ----

interface HookCmd {
  hooks: { type: "command"; command: string }[];
}

const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
const CODEX_HOOKS = join(homedir(), ".codex", "hooks.json");
const CODEX_CONFIG = join(homedir(), ".codex", "config.toml");

// Only the write-only capture hook is installed by default (agentmemory model:
// auto-capture, recall on demand). SessionStart injection is intentionally NOT
// here — recall is agent-judgment via AGENTS.md, not auto-pushed.
const ZEMORY_HOOKS: { event: string; command: string }[] = [
  { event: "Stop", command: "zemory hook stop" },
];

export interface InstallResult {
  path: string;
  added: string[];
  present: string[];
}

export interface CodexInstallResult extends InstallResult {
  configPath: string;
  featureEnabled: boolean;
}

function readJsonObject(path: string): Record<string, any> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Cannot update ${path}: ${error instanceof Error ? error.message : "invalid JSON"}`,
      { cause: error },
    );
  }
}

function mergeCommandHook(
  path: string,
  rootKey: string | null,
  event: string,
  command: string,
): InstallResult {
  const document = readJsonObject(path);
  const settings = rootKey
    ? ((document[rootKey] ??= {}) as Record<string, HookCmd[]>)
    : (document as Record<string, HookCmd[]>);
  const groups = Array.isArray(settings[event]) ? settings[event] : [];
  const already = groups.some((group) =>
    (group.hooks ?? []).some((hook) => hook.type === "command" && hook.command === command),
  );
  if (!already) {
    groups.push({ hooks: [{ type: "command", command }] });
    settings[event] = groups;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(document, null, 2) + "\n");
  }
  return {
    path,
    added: already ? [] : [event],
    present: already ? [event] : [],
  };
}

/** Add zemory's hooks to Claude Code settings.json, merging (never overwriting). */
export function installHooks(settingsPath: string = CLAUDE_SETTINGS): InstallResult {
  const added: string[] = [];
  const present: string[] = [];
  for (const { event, command } of ZEMORY_HOOKS) {
    const result = mergeCommandHook(settingsPath, "hooks", event, command);
    added.push(...result.added);
    present.push(...result.present);
  }
  return { path: settingsPath, added, present };
}

function enableCodexHooks(configPath: string): boolean {
  const original = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const lines = original.split(/\r?\n/);
  const section = lines.findIndex((line) => line.trim() === "[features]");
  if (section < 0) {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push("[features]", "codex_hooks = true", "");
  } else {
    let end = lines.length;
    for (let i = section + 1; i < lines.length; i++) {
      if (/^\s*\[[^\]]+\]\s*$/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const setting = lines.findIndex(
      (line, index) => index > section && index < end && /^\s*codex_hooks\s*=/.test(line),
    );
    if (setting >= 0) lines[setting] = "codex_hooks = true";
    else lines.splice(section + 1, 0, "codex_hooks = true");
  }
  const next = lines.join("\n").replace(/\n*$/, "\n");
  if (next === original) return false;
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, next);
  return true;
}

/** Install Codex Stop capture and enable its hook runtime. */
export function installCodexHooks(
  hooksPath: string = CODEX_HOOKS,
  configPath: string = CODEX_CONFIG,
): CodexInstallResult {
  const result = mergeCommandHook(hooksPath, "hooks", "Stop", "zemory hook stop");
  return {
    ...result,
    configPath,
    featureEnabled: enableCodexHooks(configPath),
  };
}
