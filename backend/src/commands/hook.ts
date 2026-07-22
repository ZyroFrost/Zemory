// `zemory hook <install|stop|...>` — the 0-token capture hook wiring (HP điều 10).
import { join } from "node:path";
import { findProjectRoot } from "../core/config.js";
import { handleHook, installCodexHooks, installHooks } from "../memory/capture-hook.js";
import { readStdin } from "./_shared.js";

export async function cmdHook(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === "install") {
    const scoped = args.includes("--project");
    const hi = args.indexOf("--host");
    const host = hi >= 0 ? args[hi + 1] : "all";
    if (!host || !["all", "claude", "codex"].includes(host)) {
      console.log("usage: zemory hook install [--host all|claude|codex] [--project]");
      process.exitCode = 1;
      return;
    }
    const root = findProjectRoot() ?? process.cwd();
    const where = scoped ? "project" : "global";
    if (host === "all" || host === "claude") {
      const path = scoped ? join(root, ".claude", "settings.json") : undefined;
      const result = installHooks(path);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Claude Stop ${state} (${where}) → ${result.path}`);
    }
    if (host === "all" || host === "codex") {
      const hooksPath = scoped ? join(root, ".codex", "hooks.json") : undefined;
      const configPath = scoped ? join(root, ".codex", "config.toml") : undefined;
      const result = installCodexHooks(hooksPath, configPath);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Codex Stop ${state} (${where}) → ${result.path}`);
      console.log(`  codex_hooks ${result.featureEnabled ? "enabled" : "already enabled"} → ${result.configPath}`);
    }
    console.log("  (capture only — auto-ingest on session end; recall stays agent-driven. Remove the entry to undo.)");
    return;
  }
  if (sub !== "session-start" && sub !== "stop" && sub !== "session-end") {
    console.log("usage: zemory hook <session-start|stop|install>");
    return;
  }
  const raw = await readStdin();
  let payload: Record<string, unknown>;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!payload.cwd) payload.cwd = process.cwd();
  const out = handleHook(sub, payload);
  if (out) process.stdout.write(out);
}

