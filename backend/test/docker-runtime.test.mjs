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

test("the store is the host's Linux folder mounted at /home/node/zemory; the pointer names both roles", () => {
  const c = read("../../docker-compose.yml");
  assert.match(c, /-\s*\$\{ZEMORY_STORE:\?[^}]*\}:\/home\/node\/zemory\b/);
  assert.match(c, /\/\.claude:\/home\/node\/\.claude:ro/);
  assert.doesNotMatch(c, /zemory-data:/, "NEGATIVE: the store is not a Docker volume hidden in the VM (plan/30 §3c)");
  const d = read("../../Dockerfile");
  assert.match(d, /"dataDir":"\/home\/node\/zemory\/data","memoryRoot":"\/home\/node\/zemory\/global-memory"/);
});

test("compose tells the daemon where the host's transcripts are mounted (hook payloads name host paths)", () => {
  // the map's host side is the path the agent writes (Windows C:\Users\…), not the mount source compose sees from Ubuntu
  const c = read("../../docker-compose.yml");
  assert.match(c, /ZEMORY_PATH_MAP: "[^"]*;\$\{HOST_HOME_NATIVE:-\$\{HOST_HOME\}\}\/\.claude=>\/home\/node\/\.claude;/);
  // project roots are host paths too: the repos folder is mapped and mounted read-only
  assert.match(c, /;\$\{HOST_WORKSPACE_NATIVE:-\$\{HOST_WORKSPACE\}\}=>\/host\/workspace;/);
  // the Drive folder is the third pair, and mounted writable (the channel appends blocks); an empty host side drops out
  assert.match(c, /;\$\{HOST_DRIVE_NATIVE:-\}=>\/host\/drive"/);
  assert.match(c, /-\s*\$\{HOST_DRIVE:-\$\{ZEMORY_STORE\}\/no-drive\}:\/host\/drive$/m);
  // writable: sync / init / archive / paths fix write into a repo as the native CLI does
  assert.match(c, /\$\{HOST_WORKSPACE:\?[^}]*\}:\/host\/workspace$/m);
});

test("the dependency layer is built from the manifests alone, before the sources are copied", () => {
  const d = read("../../Dockerfile");
  assert.ok(d.indexOf("npm ci --ignore-scripts") < d.indexOf("COPY . ."), "deps first, so a code change reuses the layer");
});

// 2026-10-22, the Docker trial: the workspace graph got the host root (D:\Workspace\...), listed its siblings on a
// disk that does not exist in the container, fell back to the install and drew the nine sets as "repos".
test("the cockpit's project root is opened where the daemon sees it; the store keys stay host paths", () => {
  const ui = read("../src/ui.ts");
  assert.match(ui, /const targetLocal = toLocalPath\(target\);/);
  for (const call of ['"buildWorkspaceGraph", [targetLocal]', "codeGraphParts(targetLocal)", '"buildFolderTree", [targetLocal]', "listHarnessFiles(targetLocal)"]) {
    assert.ok(ui.includes(call), `disk readers take the local path: ${call}`);
  }
  assert.match(ui, /root: toHostPath\(n\.root\)/, "repos go back to the cockpit as host paths");
  for (const call of ["buildTouchIndex(target)", "fitnessHistory(target)"]) assert.ok(ui.includes(call), `store lookups keep the host path: ${call}`);
});

test("the image listens on every interface inside the container; the native default stays 127.0.0.1", () => {
  assert.match(read("../../Dockerfile"), /ENV ZEMORY_UI_HOST=0\.0\.0\.0/);
  assert.match(read("../src/ui.ts"), /server\.listen\(port, process\.env\.ZEMORY_UI_HOST\?\.trim\(\) \|\| "127\.0\.0\.1"\)/);
});

// Web capture in the container (plan/30 §3h), measured 2026-10-22: a headless Chromium gets Cloudflare's "Just a moment..."
// on chatgpt.com and claude.ai; a windowed one on a virtual display gets the real pages. The user signs in through noVNC.
test("the image draws the capture browser on a virtual display and shows it through noVNC", () => {
  const d = read("../../Dockerfile");
  for (const pkg of ["chromium", "xvfb", "x11vnc", "novnc", "websockify", "procps"]) assert.ok(d.split(/\s+/).includes(pkg), pkg);
  assert.match(d, /ENV [^\n]*ZEMORY_BROWSER=\/usr\/bin\/chromium[^\n]*DISPLAY=:99/);
  assert.match(d, /ENTRYPOINT \["\/usr\/local\/bin\/zemory-entrypoint"\]/);
  const e = read("../scripts/docker-entrypoint.sh");
  assert.ok(!e.includes("\r"), "LF only: a CR breaks sh in the container");
  assert.match(e, /Xvfb "\$DISPLAY"/);
  // a restart keeps /tmp: the old lock must go first, or Xvfb exits at once and the browser has no display
  assert.ok(e.indexOf('rm -f "/tmp/.X${n}-lock"') >= 0 && e.indexOf('rm -f "/tmp/.X${n}-lock"') < e.indexOf('Xvfb "$DISPLAY"'));
  assert.match(read("../../docker-compose.yml"), /^\s*init: true$/m);
  assert.match(e, /x11vnc [^\n]*-localhost/, "VNC itself stays on the container's loopback");
  assert.match(e, /websockify --web \/usr\/share\/novnc 0\.0\.0\.0:6080 127\.0\.0\.1:5900/);
  assert.match(e, /exec "\$@"$/m, "the daemon is the container's main process");
  assert.match(read("../../.gitattributes"), /^\*\.sh text eol=lf$/m);
});

test("compose publishes the sign-in view on the host's loopback only and gives Chromium its shared memory", () => {
  const c = read("../../docker-compose.yml");
  assert.match(c, /"127\.0\.0\.1:\$\{ZEMORY_VIEW_PORT:-6080\}:6080"/);
  assert.doesNotMatch(c, /^\s*-\s*"?6080:6080/m, "NEGATIVE: a password-less VNC view on every interface");
  assert.match(c, /shm_size: "1gb"/);
  // zemory's own repo is the mounted clone: HS is read there (not the image's frozen copy) and its .git gives the history
  // a three-way sync reads (store.ts baseFiles); its pair leads the path map so the longer prefix wins
  assert.match(c, /-\s*\.:\/host\/zemory$/m);
  const ign = read("../../.dockerignore");
  assert.match(ign, /^docs_template$/m, "HS comes from the mounted clone, not the image");
  assert.match(ign, /^attic$/m);
  assert.match(ign, /^!attic\/legacy-templates$/m, "adopt still reads the legacy templates");
  assert.match(c, /ZEMORY_SELF: \/host\/zemory/);
  assert.match(c, /ZEMORY_PATH_MAP: "\$\{ZEMORY_SELF_NATIVE:-\}=>\/host\/zemory;/);
  assert.doesNotMatch(c, /\.git:\/app\/\.git/, "NEGATIVE: one way to reach the history, not two");
  assert.match(read("../src/docs/store.ts"), /process\.env\.ZEMORY_SELF\?\.trim\(\)/);
  for (const inst of ["../scripts/install-docker.ps1", "../scripts/install-docker.sh"]) assert.match(read(inst), /ZEMORY_SELF_NATIVE=/, inst);
  assert.match(read("../../Dockerfile"), /git config --system --add safe\.directory '\*'/);
  // the p2p channel listens where the native daemon does (getP2pPort's default)
  assert.match(c, /"\$\{ZEMORY_P2P_PORT:-21038\}:21038"/);
  assert.match(read("../src/config/settings.ts"), /: 21038;/);
  assert.match(c, /ZEMORY_VIEW_PORT: "\$\{ZEMORY_VIEW_PORT:-6080\}"/);
});

test("in the container the browser runs without the sandbox and /dev/shm; natively it does not", async () => {
  const { browserArgs } = await import("../../dist/memory/scanweb.js");
  const dk = browserArgs("/p", 9333, "https://x", true, "docker");
  assert.ok(dk.includes("--no-sandbox") && dk.includes("--disable-dev-shm-usage"));
  const nv = browserArgs("/p", 9333, "https://x", true, "native");
  assert.ok(!nv.includes("--no-sandbox"), "NEGATIVE: the native browser keeps its sandbox");
});

test("the daemon names the sign-in view only when the window is on the container's display", async () => {
  const { loginViewUrl } = await import("../../dist/util/runtime.js");
  assert.equal(loginViewUrl("native"), null);
  assert.equal(loginViewUrl("docker", {}), "http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale&reconnect=1");
  assert.match(loginViewUrl("docker", { ZEMORY_VIEW_PORT: "6090" }), /^http:\/\/127\.0\.0\.1:6090\//);
  const ui = read("../src/ui.ts");
  assert.equal((ui.match(/loginView: signInView\(/g) || []).length, 3, "/connect (twice) and /add-account");
  const fe = read("../../frontend/scripts/sources.js");
  assert.equal((fe.match(/openSignInView\(r\);/g) || []).length, 3, "every sign-in flow opens it");
  assert.match(fe, /a\.target='zemory-signin'/, "a blocked popup falls back to a link the user clicks");
});

// 2026-10-22: through the Docker mount the synchronous repo walks held the daemon's event loop for minutes and the
// cockpit would not load (/ping silent, the main thread in p9_client_rpc). The heavy disk halves run in worker threads.
test("the cockpit's repo-walking surfaces run in worker threads, not on the daemon's event loop", () => {
  const ui = read("../src/ui.ts");
  for (const call of ['runInWorker<FolderTree>("docs/structure-tree.js", "buildFolderTree"', 'runInWorker<WorkspaceGraph>("memory/graph/graph-standard.js", "buildWorkspaceGraph"',
    '"memory/graph/graph-disk.js", "codeGraphDisk"', 'runInWorker<HarnessStaleRow[]>("docs/harness-updates.js", "harnessStaleRows"']) {
    assert.ok(ui.includes(call), call);
  }
  for (const direct of ["buildFolderTree(", "buildWorkspaceGraph(", "getCodeGraph(", "resolveCalls(", "kitBehind("]) {
    assert.ok(!ui.includes(direct), `NEGATIVE: ${direct} called on the event loop`);
  }
  assert.match(read("../scripts/docker-parity.mjs"), /PING_LIMIT_MS = 3000/, "the parity run measures the cockpit's answers too");
});
