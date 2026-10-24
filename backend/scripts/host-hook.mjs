#!/usr/bin/env node
// The host half of a hook in the Docker path (docs/plan/30 §5 ②). Claude Code runs hooks on the host; this client
// forwards the payload it was handed to the daemon in the container and replays the answer: stdout, stderr, exit code.
// Node built-ins only, so a lone runtime binary runs it - no npm, no native module on the host.
//
//   node host-hook.mjs <event>          event: stop · prompt · pre-compact · session-start · session-end · send-guard
//   node host-hook.mjs install | uninstall   write (or remove) these hooks in ~/.claude/settings.json
//   ZEMORY_PORT (default 4444)          the port compose publishes on 127.0.0.1
//
// The daemon unreachable ⇒ exit 0 and say nothing: a capture hook never blocks the agent's turn (fail-open, as the
// stdin hook). The send guard only narrows who may be messaged, so it fails open too.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const event = String(process.argv[2] || "");

/** The pids of the Claude Code sessions alive on THIS machine: the container cannot probe host processes, and the send
 *  guard needs them to know which sessions exist (memory/send-guard.ts listPeers). */
function livePids() {
  const dir = join(process.env.ZEMORY_CLAUDE_HOME || join(homedir(), ".claude"), "sessions");
  const out = [];
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const f of files) {
    let pid;
    try {
      pid = Number(JSON.parse(readFileSync(join(dir, f), "utf8")).pid) || Number(f.replace(/\.json$/, ""));
    } catch {
      continue;
    }
    try {
      process.kill(pid, 0);
      out.push(pid);
    } catch {
      // gone
    }
  }
  return out;
}
const port = Number(process.env.ZEMORY_PORT || 4444);
// a PowerShell 5.1 pipe prepends a BOM to stdin
const BOM = new RegExp("^" + String.fromCharCode(0xfeff));

// ── install / uninstall: the hook entries of Claude Code's settings.json, on the host ─────────────────────────────────
// The same events and matcher as the native `zemory hook install` (memory/capture-hook.ts ZEMORY_HOOKS), each command
// pointing here. A machine runs ONE install (plan/30 §0): installing these removes the native `zemory hook <event>`
// entries, and the native installer removes these. Merged, never overwritten; written through a temp file + rename.
export const HOOKS = [
  { event: "Stop", arg: "stop" },
  { event: "UserPromptSubmit", arg: "prompt" },
  { event: "PreCompact", arg: "pre-compact" },
  { event: "SessionStart", arg: "session-start" },
  { event: "PreToolUse", arg: "send-guard", matcher: "SendMessage" },
];
const NATIVE = new Set(HOOKS.map((h) => `zemory hook ${h.arg}`));

/** the command Claude Code runs for one event: node + this file, both quoted (paths with spaces) */
export function hookCommand(arg, script = fileURLToPath(import.meta.url), node = process.execPath) {
  return `"${node}" "${script}" ${arg}`;
}
const isOurs = (cmd) => typeof cmd === "string" && /host-hook\.mjs"?\s+[a-z-]+$/.test(cmd);

/** settings.json with the host hooks added (or removed); the native entries always go. Pure: object in, object out. */
export function withHostHooks(doc, add, cmdFor = hookCommand) {
  const out = JSON.parse(JSON.stringify(doc ?? {}));
  const hooks = out.hooks && typeof out.hooks === "object" ? out.hooks : {};
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !NATIVE.has(h.command) && !isOurs(h.command)) }))
      .filter((g) => g.hooks.length > 0);
    if (kept.length) hooks[event] = kept;
    else delete hooks[event];
  }
  if (add) {
    for (const h of HOOKS) {
      const entry = { type: "command", command: cmdFor(h.arg) };
      (hooks[h.event] ??= []).push(h.matcher ? { matcher: h.matcher, hooks: [entry] } : { hooks: [entry] });
    }
  }
  if (Object.keys(hooks).length) out.hooks = hooks;
  else delete out.hooks;
  return out;
}

function manage(add) {
  const file = join(process.env.ZEMORY_CLAUDE_HOME || join(homedir(), ".claude"), "settings.json");
  let doc = {};
  if (existsSync(file)) {
    try {
      doc = JSON.parse(readFileSync(file, "utf8").replace(BOM, ""));
    } catch (e) {
      // a settings file we cannot read is the user's tool config: never overwrite it
      process.stderr.write(`host-hook: ${file} is not valid JSON (${e.message}); nothing was changed.\n`);
      process.exit(1);
    }
  }
  const next = withHostHooks(doc, add);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.zemory-tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n");
  renameSync(tmp, file);
  console.log(`host-hook: ${add ? "installed" : "removed"} the zemory hooks in ${file}`);
}

function relay() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    let text = raw.replace(BOM, "") || "{}";
    try {
      // the host names the session's project in CLAUDE_PROJECT_DIR; the daemon in the container cannot read the host's env
      const extra = { ...(process.env.CLAUDE_PROJECT_DIR ? { project_dir: process.env.CLAUDE_PROJECT_DIR } : {}), ...(event === "send-guard" ? { live_pids: livePids() } : {}) };
      if (Object.keys(extra).length) text = JSON.stringify({ ...JSON.parse(text), ...extra });
    } catch {
      // unreadable payload: forward it as it came, the daemon lets it through
    }
    const body = Buffer.from(text, "utf8");
    const req = http.request(
      { host: "127.0.0.1", port, path: "/hook/" + encodeURIComponent(event), method: "POST",
        headers: { "content-type": "application/json", "content-length": body.length }, timeout: 15000 },
      (res) => {
        let out = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (out += c));
        res.on("end", () => {
          let a = { stdout: "", stderr: "", code: 0 };
          try {
            a = JSON.parse(out);
          } catch {
            // not our daemon: nothing to replay
          }
          if (a.stdout) process.stdout.write(a.stdout);
          if (a.stderr) process.stderr.write(a.stderr);
          process.exitCode = Number.isInteger(a.code) ? a.code : 0;
        });
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => {
      process.exitCode = 0;
    });
    req.end(body);
  });
}

// imported by a test: run nothing
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (event === "install" || event === "uninstall") manage(event === "install");
  else relay();
}
