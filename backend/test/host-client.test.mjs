// The host half of the Docker path (plan/30 §5 ⑥): the `zemory` command forwarded into the container, and the Claude Code
// hooks that post to it. A machine runs ONE install, so writing the host hooks takes the native ones out.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tempDir } from "./helpers.mjs";

const { HOOKS, hookCommand, withHostHooks } = await import("../scripts/host-hook.mjs");
const { containerDir, readEnv } = await import("../scripts/host-cli.mjs");
const HOST_HOOK = fileURLToPath(new URL("../scripts/host-hook.mjs", import.meta.url));

const cmd = (arg) => `"node" "/z/backend/scripts/host-hook.mjs" ${arg}`;
const commands = (doc) => Object.values(doc.hooks ?? {}).flat().flatMap((g) => g.hooks.map((h) => h.command));

test("install takes the native hooks out, adds the five host ones, keeps the user's own hooks, and is idempotent", () => {
  const before = {
    model: "x",
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "zemory hook stop" }, { type: "command", command: "my-own-stop" }] }],
      PreToolUse: [{ matcher: "SendMessage", hooks: [{ type: "command", command: "zemory hook send-guard" }] },
        { matcher: "Bash", hooks: [{ type: "command", command: "node docs/hooks/guard.cjs" }] }],
    },
  };
  const once = withHostHooks(before, true, cmd);
  assert.equal(once.model, "x");
  const all = commands(once);
  assert.ok(!all.some((c) => /^zemory hook /.test(c)), "NEGATIVE: a native hook left beside the Docker ones");
  assert.ok(all.includes("my-own-stop") && all.includes("node docs/hooks/guard.cjs"), "the user's own hooks stay");
  for (const h of HOOKS) assert.ok(all.includes(cmd(h.arg)), h.arg);
  assert.equal(once.hooks.PreToolUse.find((g) => g.hooks.some((x) => x.command === cmd("send-guard"))).matcher, "SendMessage");
  assert.deepEqual(withHostHooks(once, true, cmd), once, "a second install changes nothing");
  assert.deepEqual(before.hooks.Stop[0].hooks.length, 2, "the input is not mutated");
});

test("uninstall removes ours (and any native leftover), keeps the rest, drops an emptied event", () => {
  const installed = withHostHooks({ hooks: { Stop: [{ hooks: [{ type: "command", command: "my-own-stop" }] }] } }, true, cmd);
  const out = withHostHooks(installed, false, cmd);
  assert.deepEqual(commands(out), ["my-own-stop"]);
  assert.equal(out.hooks.UserPromptSubmit, undefined);
  assert.deepEqual(withHostHooks({}, false, cmd), {});
});

test("the hook command quotes node and the script (paths with spaces)", () => {
  assert.equal(hookCommand("stop", "C:\\Program Files\\z\\host-hook.mjs", "C:\\Program Files\\nodejs\\node.exe"),
    '"C:\\Program Files\\nodejs\\node.exe" "C:\\Program Files\\z\\host-hook.mjs" stop');
});

test("the current folder maps into the workspace mount; outside it there is no container folder", () => {
  assert.equal(containerDir("D:\\Workspace\\Company\\Sasin\\Dept_OPS", "D:\\Workspace"), "/host/workspace/Company/Sasin/Dept_OPS");
  assert.equal(containerDir("d:\\workspace", "D:\\Workspace\\"), "/host/workspace", "Windows: any case, trailing slash");
  assert.equal(containerDir("/home/u/work/repo", "/home/u/work"), "/host/workspace/repo");
  assert.equal(containerDir("/home/u/WORK/repo", "/home/u/work"), null, "Linux paths are case-sensitive");
  assert.equal(containerDir("D:\\WorkspaceOld\\x", "D:\\Workspace"), null, "NEGATIVE: a prefix that is not a whole segment");
  assert.equal(containerDir("D:\\x", ""), null);
});

test("readEnv reads the installer's .env: KEY=value, quotes stripped, no expansion", (t) => {
  const dir = tempDir(t, "zemory-hostenv-");
  writeFileSync(join(dir, ".env"), "# c\nHOST_WORKSPACE_NATIVE='D:\\Workspace'\r\nZEMORY_STORE=/home/u/zemory\nBAD LINE\n");
  assert.deepEqual(readEnv(join(dir, ".env")), { HOST_WORKSPACE_NATIVE: "D:\\Workspace", ZEMORY_STORE: "/home/u/zemory" });
  assert.deepEqual(readEnv(join(dir, "missing")), {});
});

test("a hook posts its payload to the daemon and replays stdout and the exit code", async (t) => {
  let got = null;
  const srv = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      got = { path: req.url, body: JSON.parse(b) };
      res.end(JSON.stringify({ stdout: "said", stderr: "", code: 2 }));
    });
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  const p = spawn(process.execPath, [HOST_HOOK, "stop"], { env: { ...process.env, ZEMORY_PORT: String(srv.address().port) } });
  let out = "";
  p.stdout.on("data", (c) => (out += c));
  p.stdin.end(String.fromCharCode(0xfeff) + JSON.stringify({ session_id: "s1" }));
  const code = await new Promise((r) => p.on("close", r));
  assert.deepEqual(got, { path: "/hook/stop", body: { session_id: "s1" } }, "the BOM is stripped");
  assert.equal(out, "said");
  assert.equal(code, 2);
});

test("the native install takes the Docker hooks out; hooksInstalled sees either install's Stop hook", async (t) => {
  const { installHooks, hooksInstalled } = await import("../../dist/memory/capture-hook.js");
  const { readFileSync } = await import("node:fs");
  const dir = tempDir(t, "zemory-hookswap-");
  const file = join(dir, "settings.json");
  const docker = withHostHooks({ hooks: { Stop: [{ hooks: [{ type: "command", command: "my-own-stop" }] }] } }, true, cmd);
  writeFileSync(file, JSON.stringify(docker));
  assert.equal(hooksInstalled(file), true, "the Docker install's Stop hook counts as wired");
  installHooks(file);
  const after = JSON.parse(readFileSync(file, "utf8"));
  const all = commands(after);
  assert.ok(!all.some((c) => c.includes("host-hook.mjs")), "NEGATIVE: Docker hooks left beside the native ones");
  assert.ok(all.includes("zemory hook stop") && all.includes("my-own-stop"));
  assert.equal(hooksInstalled(file), true);
});
