#!/usr/bin/env node
// The host half of a hook in the Docker path (docs/plan/30 §5 ②). Claude Code runs hooks on the host; this client
// forwards the payload it was handed to the daemon in the container and replays the answer: stdout, stderr, exit code.
// Node built-ins only, so a lone runtime binary runs it - no npm, no native module on the host.
//
//   node host-hook.mjs <event>          event: stop · prompt · pre-compact · session-start · session-end · send-guard
//   ZEMORY_PORT (default 4444)          the port compose publishes on 127.0.0.1
//
// The daemon unreachable ⇒ exit 0 and say nothing: a capture hook never blocks the agent's turn (fail-open, as the
// stdin hook). The send guard only narrows who may be messaged, so it fails open too.
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

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

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let text = raw.replace(BOM, "") || "{}";
  if (event === "send-guard") {
    try {
      text = JSON.stringify({ ...JSON.parse(text), live_pids: livePids() });
    } catch {
      // unreadable payload: forward it as it came, the daemon lets it through
    }
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
