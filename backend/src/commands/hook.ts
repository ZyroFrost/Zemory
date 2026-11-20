// `zemory hook <install|stop|...>` — the 0-token capture hook wiring (HP điều 10).
import { appendFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
// capture-hook is loaded only where used: the hook itself runs it in a worker, and a static import loaded it twice
// (+0.5 s on every hook, measured 2026-11-20)
const hooks = (): Promise<typeof import("../memory/capture-hook.js")> => import("../memory/capture-hook.js");
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
    const root = (await import("../core/config.js")).currentProjectRoot();
    const where = scoped ? "project" : "global";
    if (host === "all" || host === "claude") {
      const path = scoped ? join(root, ".claude", "settings.json") : undefined;
      const result = (await hooks()).installHooks(path);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Claude Stop ${state} (${where}) → ${result.path}`);
    }
    if (host === "all" || host === "codex") {
      const hooksPath = scoped ? join(root, ".codex", "hooks.json") : undefined;
      const configPath = scoped ? join(root, ".codex", "config.toml") : undefined;
      const result = (await hooks()).installCodexHooks(hooksPath, configPath);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Codex Stop ${state} (${where}) → ${result.path}`);
      console.log(`  codex_hooks ${result.featureEnabled ? "enabled" : "already enabled"} → ${result.configPath}`);
    }
    console.log("  Stop → ingests the session into memory after EVERY reply (~0.3s, never blocks your typing).");
    console.log("  UserPromptSubmit → silent until context reaches 95%, then closes the ledger + warns ONCE.");
    console.log("  PreCompact → ingests the rest right before context is compacted · SessionStart → reminds only AFTER a compaction.");
    console.log("  Recall is still called by the agent itself (article 8). Remove: `zemory hook uninstall` (or turn the switch off in the UI).");
    return;
  }
  if (sub === "guard") {
    // ADAPT v2 · §4b — sinh chốt chặn lớp ① từ marker. CHỈ SINH FILE trong nhà harness;
    // việc cắm con trỏ runtime (.claude/settings.json · pre-commit) in ra cho user quyết —
    // tự cắm hook vào cấu hình đang chạy của người ta là đúng loại hành vi N1 cấm.
    // Unknown flags are refused, not ignored (same shape as `archive`): measured 2026-10-06, `hook guard --help`
    // REWROTE the repo's guard.cjs instead of printing help — harmless that time only because it was already current.
    const extra = args.slice(1);
    if (extra.length) {
      console.log(`zemory hook guard: unknown argument: ${extra.join(" ")}`);
      console.log("  usage: zemory hook guard   (no options — regenerates docs/hooks/ from the marker)");
      process.exitCode = 1;
      return;
    }
    const { currentProjectRoot } = await import("../core/config.js");
    const { generateGuards, GUARD_MATCHER, guardCommand } = await import("../docs/guard-gen.js");
    const root = currentProjectRoot();
    const r = generateGuards(root);
    const rel = (p: string): string => relative(root, p).replace(/\\/g, "/");
    console.log(`zemory hook guard — ${rel(r.hooksDir)}/`);
    if (r.added.length) console.log(`  + ${r.added.join(" · ")}`);
    if (r.kept.length) console.log(`  · kept as is: ${r.kept.join(" · ")}`);
    console.log(
      r.protectedWrite.length
        ? `  write-protected paths (marker \`protected\`): ${r.protectedWrite.join(" · ")}`
        : "  no write-protected paths declared — add a `protected: [\"...\"]` key to .harness.json and run again (secret patterns are still guarded).",
    );
    console.log("  Runtime wiring (Claude Code is wired by this command since 3.7.5 — the guard is the standard, not an option):");
    // Print the matcher TOO: the guard is only invoked for tools named in the matcher, so a missing name
    // is an open door — measured 2026-08-20: one repo declared a matcher without `PowerShell`, and every dangerous
    // command going through that tool never reached the guard. Say it out loud rather than leaving it to be guessed.
    console.log(
      `    · Claude Code (.claude/settings.json): PreToolUse matcher ${GUARD_MATCHER} → ${guardCommand(`${rel(r.hooksDir)}/guard.cjs`)}`,
    );
    console.log(`    · pre-commit: a local hook running node ${rel(r.hooksDir)}/precommit-guard.cjs`);
    console.log("  One-time flags (.allow-*) live in the hooks folder, already .gitignore'd — create one only when the user says so explicitly.");
    return;
  }
  if (sub === "uninstall") {
    const scoped = args.includes("--project");
    const path = scoped ? join((await import("../core/config.js")).currentProjectRoot(), ".claude", "settings.json") : undefined;
    const r = (await hooks()).uninstallHooks(path);
    console.log(
      r.removed.length
        ? `zemory hook: removed ${r.removed.join(" · ")} from ${r.path}`
        : `zemory hook: no zemory hooks in ${r.path}`,
    );
    return;
  }
  if (sub === "send-guard") {
    // PreToolUse on SendMessage (wired at user level by `zemory hook install`). exit 2 = block, stderr goes to the agent.
    let payload: { tool_input?: { to?: unknown; message?: unknown }; transcript_path?: unknown } = {};
    try {
      // Strip a BOM: a PowerShell 5.1 pipe prepends U+FEFF to stdin (same fix as guard.cjs).
      payload = JSON.parse((await readStdin()).replace(new RegExp("^" + String.fromCharCode(0xfeff)), "") || "{}");
    } catch {
      // unreadable payload => nothing to judge, let it through (the host decides; this latch only narrows)
    }
    const { judgeSendPurpose, judgeSendTarget, judgeSendUpward } = await import("../memory/send-guard.js");
    const why = judgeSendTarget(payload.tool_input?.to) ?? judgeSendUpward(payload.tool_input ?? {}) ??
      judgeSendPurpose(payload.tool_input ?? {}, typeof payload.transcript_path === "string" ? payload.transcript_path : "");
    if (why) {
      // Both channels: without Git the host drops the exit code, the JSON decision still blocks (plan/28 §0m).
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } }),
      );
      process.stderr.write(why + "\n");
      process.exitCode = 2;
    }
    return;
  }
  if (sub === "permission") {
    // PermissionRequest (plan/41 §6e): ask the paired phone through the local daemon and replay its decision. Any failure
    // (daemon down, no phone, no answer) prints nothing, and Claude Code shows its own dialog - never a silent allow.
    const raw = (await readStdin()).replace(new RegExp("^" + String.fromCharCode(0xfeff)), "");
    const { uiPort } = await import("../core/config.js");
    const http = await import("node:http");
    const out = await new Promise<string>((resolve) => {
      const body = Buffer.from(raw || "{}", "utf8");
      const req = http.request(
        { host: "127.0.0.1", port: uiPort(), path: "/approval/ask", method: "POST", timeout: 125_000,
          headers: { host: `127.0.0.1:${uiPort()}`, "content-type": "application/json", "content-length": body.length } },
        (res) => {
          let s = "";
          res.setEncoding("utf8");
          res.on("data", (c) => (s += c));
          res.on("end", () => {
            try {
              resolve(String((JSON.parse(s) as { stdout?: unknown }).stdout ?? ""));
            } catch {
              resolve("");
            }
          });
        },
      );
      req.on("timeout", () => req.destroy());
      req.on("error", () => resolve(""));
      req.end(body);
    });
    if (out) process.stdout.write(out);
    return;
  }
  if (sub === "memory-guard") {
    // PreToolUse on every writing tool (Rule_Gate_94, plan/39 §3): no write into the agent's own memory folder
    let payload: unknown = {};
    try {
      payload = JSON.parse((await readStdin()).replace(new RegExp("^" + String.fromCharCode(0xfeff)), "") || "{}");
    } catch {
      // unreadable payload => let it through (fail-open)
    }
    const { memoryGuard } = await import("../memory/memory-guard.js");
    const why = memoryGuard(payload);
    if (why) {
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } }),
      );
      process.stderr.write(why + "\n");
      process.exitCode = 2;
    }
    return;
  }
  const EVENTS = ["session-start", "stop", "session-end", "prompt", "pre-compact"];
  if (!EVENTS.includes(sub ?? "")) {
    console.log(`usage: zemory hook <${EVENTS.join("|")}|install|uninstall|guard|send-guard|memory-guard>`);
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
  // Run in a worker with a heap and a time ceiling (measured 2026-11-20 on the laptop, native install: one
  // `zemory hook stop` ran 8 min, 486 s of CPU, 2.3 GB, and starved the machine - Claude Code had ended its shell, the
  // node process lived on). Over a ceiling the worker alone ends, the hook says nothing (fail-open, HP article 9), and
  // a line in logs/hook-guard.log names the event, session, repo and how long it ran - the evidence for the next fix.
  const { runInWorker } = await import("../jobs/fnworker.js");
  const t0 = Date.now();
  const r = await runInWorker<string>("memory/capture-hook.js", "handleHook", [sub, payload], HOOK_LIMIT_MS, { heapMb: HOOK_HEAP_MB });
  if (r.ok) {
    if (r.value) process.stdout.write(r.value);
    return;
  }
  if (r.error.startsWith("could not start the worker")) {
    // no worker on this host: the hook runs here as before
    const { handleHook } = await hooks();
    const out = handleHook(sub as Parameters<typeof handleHook>[0], payload);
    if (out) process.stdout.write(out);
    return;
  }
  await hookGuardLog(sub ?? "", payload, Date.now() - t0, r.error);
}

/** A hook's time ceiling: under Claude Code's own 60 s, so the hook ends before the host gives up on it. */
const HOOK_LIMIT_MS = Number(process.env.ZEMORY_HOOK_LIMIT_MS) || 50_000;
/** A hook's heap ceiling: an ingest of the largest transcript measured 130 MB. */
const HOOK_HEAP_MB = Number(process.env.ZEMORY_HOOK_HEAP_MB) || 512;

/** One line per hook the guard ended (logs are kept for good, 02-97). Never throws. */
async function hookGuardLog(event: string, payload: Record<string, unknown>, ms: number, why: string): Promise<void> {
  try {
    const tp = String(payload.transcript_path ?? "");
    let size = -1;
    try {
      size = tp ? statSync(tp).size : -1;
    } catch {
      size = -1;
    }
    const line = JSON.stringify({
      at: new Date().toISOString(),
      event,
      session: String(payload.session_id ?? ""),
      cwd: String(payload.cwd ?? ""),
      transcriptBytes: size,
      ms,
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
      why,
    });
    const { currentMemoryDir } = await import("../memory/db.js");
    const dir = join(currentMemoryDir(), "logs");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "hook-guard.log"), line + "\n");
  } catch {
    /* the guard never fails the hook */
  }
}
