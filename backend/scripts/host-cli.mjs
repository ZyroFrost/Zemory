#!/usr/bin/env node
// The host's `zemory` command in the Docker path (docs/plan/30 §5 ⑥). Agents run `zemory sync`, `zemory conform`,
// `zemory memory search` inside a repo; on a machine that runs zemory in Docker there is no native CLI, so this forwards
// the command into the container, in the container's view of the current folder, and replays its output and exit code.
// Node built-ins only, as host-hook.mjs.
//
//   node host-cli.mjs <zemory args...>
//   .env beside docker-compose.yml (written by the installer) names the workspace: HOST_WORKSPACE_NATIVE (Windows,
//   D:\Workspace) or HOST_WORKSPACE (Linux); ZEMORY_CONTAINER overrides the container name (default zemory).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
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

/** How this host reaches docker. On Windows the engine runs inside the WSL distro (plan/30 §3k), so the call goes
 *  through wsl.exe; DOCKER_BIN names another client; elsewhere it is the docker on PATH. */
export function dockerCall(env, args, platform = process.platform) {
  if (env.DOCKER_BIN) return [env.DOCKER_BIN, args];
  // `--exec`, not `--`: `--` hands the line to the distro's shell, which eats every backslash (`D:\Workspace` arrived as
  // `D:Workspace`); `--exec` runs docker with the arguments as given
  if (platform === "win32" && env.ZEMORY_WSL_DISTRO) return ["wsl.exe", ["-d", env.ZEMORY_WSL_DISTRO, "--exec", "docker", ...args]];
  return ["docker", args];
}

/**
 * WSL stops an idle distro - and the engine and the container with it - unless a process holds it. The installer starts one
 * hidden `wsl.exe … sleep infinity` from every sign-in; a `wsl --shutdown` kills it until the next sign-in, and the container
 * then stops every time the last call ends (measured 25/10: SIGTERM every 20-60 s). Each CLI call puts the holder back when
 * it is gone, looking at most every 10 minutes. `probe` counts holders; `start` launches one.
 */
export function ensureKeepAlive(env, o = {}) {
  const platform = o.platform ?? process.platform;
  if (platform !== "win32" || !env.ZEMORY_WSL_DISTRO) return "skipped";
  const stamp = o.stamp ?? join(COMPOSE_DIR, "data", ".wsl-keepalive");
  const now = o.now ?? Date.now();
  try {
    if (now - statSync(stamp).mtimeMs < 600_000) return "fresh";
  } catch {
    /* never looked yet */
  }
  const probe = o.probe ?? (() => {
    const q = "@(Get-CimInstance Win32_Process -Filter \"Name='wsl.exe'\" | Where-Object { $_.CommandLine -match 'sleep infinity' }).Count";
    const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", q], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
    return Number.parseInt(String(r.stdout ?? "").trim(), 10);
  });
  const start = o.start ?? ((distro) => {
    const conhost = join(env.SystemRoot || "C:\\Windows", "system32", "conhost.exe");
    spawn(conhost, ["--headless", "wsl.exe", "-d", distro, "--exec", "sleep", "infinity"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  });
  const n = probe();
  let out = "held";
  if (n === 0) {
    start(env.ZEMORY_WSL_DISTRO);
    out = "started";
  }
  try {
    ensureEngine(env, o);
  } catch {
    /* fail-open: the command itself still runs */
  }
  try {
    healDriveMount(env, o);
  } catch {
    /* fail-open: the command itself still runs */
  }
  try {
    mkdirSync(dirname(stamp), { recursive: true });
    writeFileSync(stamp, "");
  } catch {
    /* the next call looks again */
  }
  return out;
}

/**
 * The engine inside the distro must run whatever an optional mount does. Measured 2026-10-28: after a reboot the Drive letter
 * was missing, its fstab line (no nofail) failed local-fs.target, systemd cancelled docker.service and zemory was down 1 h 26
 * min. At the keep-alive look: a drive line in /etc/fstab without nofail gets it, and a stopped engine is started. Fail-open.
 */
export function ensureEngine(env, o = {}) {
  const platform = o.platform ?? process.platform;
  if (platform !== "win32" || !env.ZEMORY_WSL_DISTRO) return "skipped";
  const run = o.run ?? ((args) => spawnSync("wsl.exe", ["-d", env.ZEMORY_WSL_DISTRO, ...args], { encoding: "utf8", windowsHide: true, timeout: 120_000 }));
  run(["-u", "root", "--exec", "sh", "-c", "sed -i -E 's#^([A-Z]: /mnt/[a-z] drvfs metadata,noatime) 0 0$#\\1,nofail 0 0#' /etc/fstab"]);
  const state = String(run(["-u", "root", "--exec", "systemctl", "is-active", "docker"]).stdout ?? "").trim();
  if (state === "active") return "running";
  run(["-u", "root", "--exec", "sh", "-c", "systemctl reset-failed; systemctl start docker"]);
  const again = String(run(["-u", "root", "--exec", "systemctl", "is-active", "docker"]).stdout ?? "").trim();
  return again === "active" ? "started" : "failed";
}

/**
 * A Windows drive mounted into WSL (drvfs, e.g. Google Drive's G: for the Drive channel) goes stale when the program behind
 * the letter restarts: the mount is still listed, every read fails with "Invalid argument" (measured 2026-10-27: Google
 * Drive restarted at 03:30, the auto-sync failed every round for 9 hours). At the keep-alive look: a stale mount whose letter
 * still exists on Windows is mounted again and the container restarted so its bind mount sees it. Fail-open.
 * A healthy mount can still be invisible to the container: a container started while the letter was missing keeps an empty
 * bind mount (measured 2026-10-28, fixed by a hand `docker compose restart`). The folder has files in WSL and none in the
 * running container ⇒ the container is restarted ("rebound").
 */
export function healDriveMount(env, o = {}) {
  const platform = o.platform ?? process.platform;
  const drive = env.HOST_DRIVE ?? "";
  const m = drive.match(/^\/mnt\/([a-z])(\/|$)/i);
  if (platform !== "win32" || !env.ZEMORY_WSL_DISTRO || !m) return "skipped";
  const run = o.run ?? ((args) => spawnSync("wsl.exe", ["-d", env.ZEMORY_WSL_DISTRO, ...args], { encoding: "utf8", windowsHide: true, timeout: 60_000 }));
  const container = env.ZEMORY_CONTAINER || "zemory";
  const look = run(["--exec", "stat", "-c", "%F", drive]);
  if (look.status === 0) {
    const first = (r) => (r.status === 0 ? String(r.stdout ?? "").trim() : null);
    const inWsl = first(run(["--exec", "sh", "-c", 'ls -A "$1" | head -1', "sh", drive]));
    if (!inWsl) return "ok"; // nothing to see, or the look failed: no evidence the container is blind
    const inContainer = first(run(["--exec", "docker", "exec", container, "sh", "-c", "ls -A /host/drive | head -1"]));
    if (inContainer !== "") return "ok"; // it sees files, or it is not running (the engine look owns that)
    run(["--exec", "docker", "restart", container]);
    return "rebound";
  }
  if (!/invalid argument/i.test(String(look.stderr ?? ""))) return "absent"; // not mounted, or the folder is gone: nothing to heal
  const letter = m[1].toLowerCase();
  const exists = o.letterExists ?? ((l) => existsSync(`${l.toUpperCase()}:\\`));
  if (!exists(letter)) return "absent";
  run(["-u", "root", "--exec", "sh", "-c", `umount -l /mnt/${letter}; mount /mnt/${letter}`]);
  if (run(["--exec", "stat", "-c", "%F", drive]).status !== 0) return "failed";
  run(["--exec", "docker", "restart", container]);
  return "healed";
}

/** The file every installer writes the machine's choice to (backend/src/util/install-choice.ts reads the same one). */
export function installChoiceFile(env = process.env) {
  return join(env.USERPROFILE || env.HOME || homedir(), ".zemory", "install.json");
}

/** "docker" | "native" | null (no installer wrote it, or a broken file). */
export function readInstallChoice(file) {
  try {
    const r = JSON.parse(readFileSync(file, "utf8")).runtime;
    return r === "docker" || r === "native" ? r : null;
  } catch {
    return null;
  }
}

/** What this command says on a machine that went back to the native install: it is left over, and which way works. */
export function nativeMachineMessage(file) {
  return `zemory (docker): this machine runs the native zemory (${file}) - this Docker command is left over. ` +
    "The native install's own zemory command answers; run install.ps1 again to remove this one, or install-docker.ps1 to " +
    "switch the machine to Docker.\n";
}

/** A host path as the docker client sees it: on Windows the client runs in the WSL distro, so `D:\x` is `/mnt/d/x`. */
export function dockerSidePath(p, env, platform = process.platform) {
  if (platform !== "win32" || !env.ZEMORY_WSL_DISTRO || env.DOCKER_BIN) return p;
  const m = /^([A-Za-z]):[\\/]?(.*)$/.exec(p);
  return m ? `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, "/")}` : p;
}

/** `zemory project move <from> <to> --apply`: the one command the daemon's own container cannot run (its daemon is the
 *  container itself, and ~/.claude is mounted read-only there). */
export function isMoveApply(argv) {
  return argv[0] === "project" && argv[1] === "move" && argv.includes("--apply");
}

/** The three docker calls of a move: stop the daemon's container, run the move in a one-off container (~/.claude writable,
 *  docker-compose.move.yml), start the container again. */
export function moveCalls(env, argv, dir, platform = process.platform) {
  const container = env.ZEMORY_CONTAINER || "zemory";
  const f = (name) => dockerSidePath(join(COMPOSE_DIR, name), env, platform);
  const run = ["compose", "-f", f("docker-compose.yml"), "-f", f("docker-compose.move.yml"), "run", "--rm", "--no-deps", "-T",
    ...(dir ? ["-w", dir] : []), "zemory", "zemory", ...argv];
  return { stop: dockerCall(env, ["stop", container], platform), run: dockerCall(env, run, platform), start: dockerCall(env, ["start", container], platform) };
}

/** The processes holding a file or folder under `path` (Windows only: a rename refused with EACCES names none of them). */
function holders(path) {
  const script = join(HERE, "who-holds.ps1");
  if (process.platform !== "win32" || !existsSync(script)) return "";
  const r = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Path", path],
    { encoding: "utf8", windowsHide: true, timeout: 300_000 });
  return String(r.stdout ?? "").trim();
}

function runMove(env, argv, dir) {
  const calls = moveCalls(env, argv, dir);
  process.stderr.write("zemory (docker): project move --apply stops the zemory container, moves in a one-off container, then starts it again.\n");
  spawnSync(calls.stop[0], calls.stop[1], { stdio: "ignore", windowsHide: true });
  let status;
  try {
    const r = spawnSync(calls.run[0], calls.run[1], { encoding: "utf8", windowsHide: true, stdio: ["inherit", "pipe", "pipe"] });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.split(/\r?\n/).filter((l) => !/Processing \/etc\/fstab/.test(l)).join("\n");
    process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    status = r.status ?? 1;
    if (status !== 0 && /\b(EACCES|EPERM|EBUSY)\b/.test(out)) {
      const held = holders(resolve(argv[2]));
      process.stdout.write(held ? `  Holding it now:\n${held.split("\n").map((l) => `    ${l}`).join("\n")}\n` : "  No holder found from here (a service, or another user's process).\n");
    }
  } finally {
    spawnSync(calls.start[0], calls.start[1], { stdio: "ignore", windowsHide: true });
  }
  process.exit(status);
}

function main() {
  const env = { ...readEnv(join(COMPOSE_DIR, ".env")), ...process.env };
  // one install per machine: the choice the installers recorded decides which command answers
  const choiceFile = installChoiceFile(env);
  const chosen = readInstallChoice(choiceFile);
  if (chosen === "native") {
    process.stderr.write(nativeMachineMessage(choiceFile));
    process.exit(1);
  }
  try {
    ensureKeepAlive(env);
  } catch {
    /* fail-open: the command itself still runs */
  }
  const workspace = env.HOST_WORKSPACE_NATIVE || env.HOST_WORKSPACE || "";
  const container = env.ZEMORY_CONTAINER || "zemory";
  const dir = containerDir(process.cwd(), workspace);
  if (!dir) {
    process.stderr.write(`zemory (docker): ${process.cwd()} is outside the mounted workspace (${workspace || "not set"}); ` +
      "the command runs in the container's own folder, so a command that works on the current repo will not see it.\n");
  }
  if (isMoveApply(process.argv.slice(2))) runMove(env, process.argv.slice(2), dir);
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const args = ["exec", "-i", ...(tty ? ["-t"] : []), ...(dir ? ["-w", dir] : []), container, "zemory", ...process.argv.slice(2)];
  const [bin, argv] = dockerCall(env, args);
  const r = spawnSync(bin, argv, { stdio: "inherit", windowsHide: true });
  if (r.error) {
    process.stderr.write(`zemory (docker): could not run docker (${r.error.message}). Is Docker running and the zemory container up?\n`);
    process.exit(127);
  }
  // a machine installed before the choice file: the container answered, so this machine runs Docker - record it once,
  // so the native command finds the choice even while the container is down
  if (r.status === 0 && !chosen) {
    try {
      mkdirSync(dirname(choiceFile), { recursive: true });
      writeFileSync(choiceFile, JSON.stringify({ runtime: "docker", at: new Date().toISOString(), by: "host-cli" }, null, 2) + "\n");
    } catch {
      /* only a record: the command already ran */
    }
  }
  process.exit(r.status ?? 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
