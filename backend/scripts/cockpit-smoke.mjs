#!/usr/bin/env node
// Does the cockpit actually load in a real browser? (docs/plan/30 §1 - "open the cockpit" is an acceptance step.)
// A test of the answers is not a test of the app: on 2026-10-22 every parity cell was right while the cockpit, opened in
// a browser, stayed on "—" because the daemon's event loop was held by a repo walk. This opens the page in a headless
// Edge/Chrome over CDP, waits until the home cards hold numbers, saves a screenshot, and pings the daemon meanwhile.
//
//   node backend/scripts/cockpit-smoke.mjs [--port 4444] [--shot <file.png>] [--timeout 120] [--browser <exe>]
// Exit 0 = the cards filled and /ping answered within 3 s throughout; 1 = not; 2 = could not run.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const PORT = Number(arg("--port", 4444));
const SHOT = arg("--shot", "");
const TIMEOUT_S = Number(arg("--timeout", 120));
const CARDS = ["stMsg", "stSess", "stProjects", "stSync"];
const CANDIDATES = [
  arg("--browser", ""),
  process.env.ZEMORY_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].filter(Boolean);
const exe = CANDIDATES.find((p) => existsSync(p));
if (!exe) {
  console.error("cockpit-smoke: no Edge/Chrome/Chromium found (pass --browser <exe>)");
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ping all along: a cockpit that answers late is a cockpit that does not load
const pings = { n: 0, worst: 0, slow: 0, failed: 0 };
let pinging = true;
const pinger = (async () => {
  while (pinging) {
    const t0 = Date.now();
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/ping`, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) pings.failed++;
    } catch {
      pings.failed++;
    }
    const ms = Date.now() - t0;
    pings.n++;
    pings.worst = Math.max(pings.worst, ms);
    if (ms > 3000) pings.slow++;
    await sleep(1000);
  }
})();

const profile = mkdtempSync(join(tmpdir(), "zemory-smoke-"));
const cdpPort = 9300 + Math.floor(Math.random() * 500);
const browser = spawn(exe, [`--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--headless=new", "--no-first-run",
  "--no-default-browser-check", "--window-size=1440,960", ...(process.platform === "linux" ? ["--no-sandbox"] : []), "about:blank"],
  { stdio: "ignore", windowsHide: true });

let result = { cards: {}, filled: false, error: "" };
try {
  let tab = null;
  for (let i = 0; i < 40 && !tab; i++) {
    try {
      tab = (await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json()).find((t) => t.type === "page");
    } catch {
      await sleep(250);
    }
  }
  if (!tab) throw new Error("the browser did not open a tab");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("CDP socket")); });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
  };
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  const until = Date.now() + TIMEOUT_S * 1000;
  const expr = `JSON.stringify(Object.fromEntries(${JSON.stringify(CARDS)}.map((k) => [k, (document.getElementById(k)?.textContent || "").trim()])))`;
  while (Date.now() < until) {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    try { result.cards = JSON.parse(r.result?.result?.value ?? "{}"); } catch { /* page not ready */ }
    result.filled = CARDS.slice(0, 3).every((k) => result.cards[k] && result.cards[k] !== "—");
    if (result.filled) break;
    await sleep(1000);
  }
  if (SHOT) {
    const s = await send("Page.captureScreenshot", { format: "png" });
    if (s.result?.data) writeFileSync(SHOT, Buffer.from(s.result.data, "base64"));
  }
  ws.close();
} catch (e) {
  result.error = e.message;
} finally {
  browser.kill();
  pinging = false;
  await pinger;
  // Edge's child processes outlive the kill by a few seconds and hold the profile: a single try failed silently and left
  // 0.66 GB of profiles in TEMP (measured 2026-10-29, 7 folders). Retry for up to ~10 s, and say so when it still fails.
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
  } catch (e) {
    console.error(`cockpit-smoke: could not remove the browser profile ${profile} (${e?.code ?? e}) - delete it by hand`);
  }
}

const answered = pings.slow + pings.failed === 0;
console.log(`cockpit-smoke http://127.0.0.1:${PORT}/ — cards ${JSON.stringify(result.cards)}${result.error ? ` · error: ${result.error}` : ""}`);
console.log(`  ping: ${pings.n} · worst ${pings.worst} ms · ${pings.slow} over 3000 ms · ${pings.failed} failed${SHOT ? ` · screenshot ${SHOT}` : ""}`);
console.log(result.filled && answered ? "  ✓ the cockpit loaded and kept answering" : "  ✗ the cockpit did not load (or stopped answering)");
process.exitCode = result.filled && answered ? 0 : 1;
