#!/usr/bin/env node
// The host's `zemory` command in the Docker path (docs/plan/30 §5 ⑥). Agents run `zemory sync`, `zemory conform`,
// `zemory memory search` inside a repo; on a machine that runs zemory in Docker there is no native CLI, so this forwards
// the command into the container, in the container's view of the current folder, and replays its output and exit code.
// Node built-ins only, as host-hook.mjs.
//
//   node host-cli.mjs <zemory args...>
//   .env beside docker-compose.yml (written by the installer) names the workspace: HOST_WORKSPACE_NATIVE (Windows,
//   D:\Workspace) or HOST_WORKSPACE (Linux); ZEMORY_CONTAINER overrides the container name (default zemory).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSE_DIR = resolve(HERE, "..", "..");
const WORKSPACE_IN = "/host/workspace";

/** KEY=value lines of the installer's .env (no expansion, quotes stripped). */
export function readEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** The container's path for a host folder under the workspace, or null outside it. Windows paths compare
 *  case-insensitively and whole segments only. */
export function containerDir(cwd, workspace) {
  if (!workspace) return null;
  const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "");
  const c = norm(cwd);
  const w = norm(workspace);
  const win = /^[A-Za-z]:/.test(w);
  const cc = win ? c.toLowerCase() : c;
  const ww = win ? w.toLowerCase() : w;
  if (cc === ww) return WORKSPACE_IN;
  if (cc.startsWith(ww + "/")) return WORKSPACE_IN + c.slice(w.length);
  return null;
}

function main() {
  const env = { ...readEnv(join(COMPOSE_DIR, ".env")), ...process.env };
  const workspace = env.HOST_WORKSPACE_NATIVE || env.HOST_WORKSPACE || "";
  const container = env.ZEMORY_CONTAINER || "zemory";
  const dir = containerDir(process.cwd(), workspace);
  if (!dir) {
    process.stderr.write(`zemory (docker): ${process.cwd()} is outside the mounted workspace (${workspace || "not set"}); ` +
      "the command runs in the container's own folder, so a command that works on the current repo will not see it.\n");
  }
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const args = ["exec", "-i", ...(tty ? ["-t"] : []), ...(dir ? ["-w", dir] : []), container, "zemory", ...process.argv.slice(2)];
  const r = spawnSync(env.DOCKER_BIN || "docker", args, { stdio: "inherit", windowsHide: true });
  if (r.error) {
    process.stderr.write(`zemory (docker): could not run docker (${r.error.message}). Is Docker running and the zemory container up?\n`);
    process.exit(127);
  }
  process.exit(r.status ?? 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
