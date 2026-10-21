// The Docker path (docs/plan/30), step 1 - what the real run of 2026-10-22 taught, held so a later edit cannot undo it:
// the container names the MACHINE as the host (a container id was written as `host` on the first run), the cockpit is
// published on the host's 127.0.0.1 only, the store is a named volume (never a bind mount from NTFS), and the daemon
// listens on ZEMORY_UI_HOST so the native install keeps 127.0.0.1.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("compose stamps sessions with the machine's name, not the container's", () => {
  assert.match(read("../../docker-compose.yml"), /^\s*hostname:\s*\$\{ZEMORY_HOSTNAME:\?/m);
});

test("compose publishes the cockpit on the host's loopback only", () => {
  const c = read("../../docker-compose.yml");
  assert.match(c, /"127\.0\.0\.1:\$\{ZEMORY_PORT:-4444\}:4444"/);
  assert.doesNotMatch(c, /^\s*-\s*"?4444:4444/m, "NEGATIVE: a port published on every interface");
});

test("the store is the named volume; transcripts are mounted read-only", () => {
  const c = read("../../docker-compose.yml");
  assert.match(c, /-\s*zemory-data:\/home\/node\/\.zemory\b/);
  assert.match(c, /\/\.claude:\/home\/node\/\.claude:ro/);
});

test("compose tells the daemon where the host's transcripts are mounted (hook payloads name host paths)", () => {
  assert.match(read("../../docker-compose.yml"), /ZEMORY_PATH_MAP: "\$\{HOST_HOME\}\/\.claude=>\/home\/node\/\.claude"/);
});

test("the dependency layer is built from the manifests alone, before the sources are copied", () => {
  const d = read("../../Dockerfile");
  assert.ok(d.indexOf("npm ci --ignore-scripts") < d.indexOf("COPY . ."), "deps first, so a code change reuses the layer");
});

test("the image listens on every interface inside the container; the native default stays 127.0.0.1", () => {
  assert.match(read("../../Dockerfile"), /ENV ZEMORY_UI_HOST=0\.0\.0\.0/);
  assert.match(read("../src/ui.ts"), /server\.listen\(port, process\.env\.ZEMORY_UI_HOST\?\.trim\(\) \|\| "127\.0\.0\.1"\)/);
});
