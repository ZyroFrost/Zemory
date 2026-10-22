// The gate's preflight and the Docker install (plan/30): an idle Docker daemon runs its own dist/ and store, so the gate
// runs beside it; an idle native daemon still blocks (it shares dist/ and RAM); a job in flight blocks either way.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PRE = fileURLToPath(new URL("../scripts/preflight-gate.mjs", import.meta.url));

async function preflight(t, answers) {
  const srv = http.createServer((req, res) => res.end(JSON.stringify(answers[req.url] ?? {})));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  const env = { ...process.env, ZEMORY_UI_PORT: String(srv.address().port) };
  delete env.ZEMORY_GATE_FORCE;
  const p = spawn(process.execPath, [PRE], { env });
  let out = "";
  p.stdout.on("data", (c) => (out += c));
  p.stderr.on("data", (c) => (out += c));
  const code = await new Promise((r) => p.on("close", r));
  return { code, out };
}

test("an idle Docker daemon lets the gate run", async (t) => {
  const r = await preflight(t, { "/ping": { app: "zemory", runtime: "docker" }, "/automation": { embedRunning: false }, "/sync-status": { running: false } });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Docker zemory is up and idle/);
});

test("NEGATIVE: an idle native daemon still blocks the gate", async (t) => {
  const r = await preflight(t, { "/ping": { app: "zemory", runtime: "native" }, "/automation": { embedRunning: false }, "/sync-status": { running: false } });
  assert.equal(r.code, 1);
});

test("a Docker daemon in the middle of a sync blocks, and names how to stop it", async (t) => {
  const r = await preflight(t, { "/ping": { app: "zemory", runtime: "docker" }, "/automation": { embedRunning: false }, "/sync-status": { running: true } });
  assert.equal(r.code, 1);
  assert.match(r.out, /docker compose stop/);
});
