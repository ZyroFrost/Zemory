// The CLI over HTTP (Docker path): `POST /cli` runs `zemory <argv>` in the daemon's own container and streams its output
// back, for the host's `zemory` command when wsl.exe cannot reach the distro. Measured 2026-11-16: after a network / VPN
// change every wsl.exe call hung 77-90 s and failed (Wsl/Service/WSAETIMEDOUT) while the daemon answered /ping over the
// published port in 0.09 s - the VM was fine, only the Windows-side WSL control channel was stuck. The hooks already
// reach the daemon this way (/hook/); the typed and agent-run commands had no way but wsl.exe.
//
// Who may call it: the port is published on the host's loopback only, and a request must carry the token the daemon
// writes into the clone's data/ folder (a bind mount of the host's clone, git-ignored), which a web page cannot read; a
// request with an Origin header (a browser) is refused outright. Only zemory runs: argv goes to the CLI as arguments,
// never through a shell.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");

/** Where the token lives: the clone's data/ folder (ZEMORY_SELF, the clone mounted into the container), or null. */
export function cliTokenFile(env: NodeJS.ProcessEnv = process.env): string | null {
  const self = env.ZEMORY_SELF?.trim();
  return self ? join(self, "data", ".cli-token") : null;
}

/** The token, created once (kept across restarts so a host command racing a restart still matches). */
export function ensureCliToken(file = cliTokenFile()): string | null {
  if (!file) return null;
  try {
    const have = existsSync(file) ? readFileSync(file, "utf8").trim() : "";
    if (/^[0-9a-f]{64}$/.test(have)) return have;
    mkdirSync(dirname(file), { recursive: true });
    const token = randomBytes(32).toString("hex");
    writeFileSync(file, token + "\n", { mode: 0o600 });
    return token;
  } catch {
    return null;
  }
}

/** Why a /cli request is refused, or null when it may run. */
export function cliRefusal(headers: IncomingMessage["headers"], token: string | null, body: unknown): string | null {
  if (!token) return "no CLI token on this daemon (ZEMORY_SELF unset)";
  if (headers.origin) return "a browser request is never run";
  if (headers["x-zemory-cli-token"] !== token) return "wrong or missing token";
  const b = body as { argv?: unknown; cwd?: unknown } | null;
  if (!b || !Array.isArray(b.argv) || !b.argv.every((a) => typeof a === "string")) return "argv must be a list of strings";
  if (b.cwd != null && typeof b.cwd !== "string") return "cwd must be a string";
  return null;
}

/**
 * Run the CLI and stream NDJSON lines: {"o": text} stdout · {"e": text} stderr · last {"exit": code}. No stdin (the
 * host's wsl.exe path keeps that). The child ends when the caller hangs up, as a docker exec ends with its client.
 */
export function runCliRelay(res: ServerResponse, argv: string[], cwd: string | null): void {
  const dir = cwd && existsSync(cwd) ? cwd : undefined;
  const child = spawn(process.execPath, [CLI, ...argv], { cwd: dir, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" });
  const send = (o: Record<string, unknown>) => { if (!res.writableEnded) res.write(JSON.stringify(o) + "\n"); };
  child.stdout.setEncoding("utf8").on("data", (t: string) => send({ o: t }));
  child.stderr.setEncoding("utf8").on("data", (t: string) => send({ e: t }));
  let done = false;
  const finish = (code: number) => {
    if (done) return;
    done = true;
    send({ exit: code });
    res.end();
  };
  child.on("error", (e) => { send({ e: `zemory (relay): could not start the CLI: ${e.message}\n` }); finish(127); });
  child.on("close", (code, signal) => finish(code ?? (signal ? 128 : 1)));
  res.on("close", () => { if (!done) child.kill(); });
}
