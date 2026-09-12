// Capture the 6 cockpit screens for the README — BY MACHINE, so nobody has to shoot them by hand.
//
// Why this script exists: the README images are DOCUMENTATION, and documentation is only right while it keeps up with the
// interface. Hand-shot images never get retaken after a UI change, and the README starts LYING about the
// product — the same fault family as "the numbers say something different from the code". By machine, refreshing them is one command.
//
//   node backend/scripts/shoot-ui.mjs [--port 4444] [--out docs_visual/ui]
//
// It drives Edge/Chrome headless over CDP (the same path `memory scan-web` already uses), waits for the UI to load,
// then clicks each nav item. The app router keeps the current screen in localStorage rather than in the
// hash, so it must really CLICK - a URL cannot be loaded straight into a screen.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const PORT = Number(arg("port", "4444"));
const OUT = resolve(arg("out", "docs_visual/ui"));
const CDP_PORT = 9333;
const W = 1840;
const H = 1080;

/** Screens to capture: [file name, nav item, sub-tab (if any), extra wait in ms] */
// The LONG waits are deliberate. Measured 2026-08-11: `/memory-status` takes 18.5 s (other endpoints
// run 112-246 ms), so shooting early captures a page still LOADING — dashes in the number tiles, lists still showing
// "...". Such an image is worse than no image: it paints the product as half finished.
// [file name, nav item, [sub-attribute, value] or null, extra wait in ms]
// The attribute names are read FROM THE HTML (`data-rc` recall · `data-ht` harness · `data-gm` global memory) —
// the first build hardcoded "sessions"/"tree" and shot the WRONG tab while the script still reported green, because it only checked the
// clicked the NAV. This build adds a step confirming the sub-tab really is 'on'.
const SHOTS = [
  ["01-home", "home", null, 4000],
  ["02-recall", "recall", ["rc", "sess"], 5000],
  ["03-projects", "projects", null, 4000],
  ["04-global-memory-sync", "gmem", ["gm", "sync"], 9000],
  ["05-harness-docs", "harness", ["ht", "docs"], 5000],
  ["06-harness-structure", "harness", ["ht", "struct"], 5000],
  ["07-features", "system", null, 5000],
];

const BROWSERS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  return r.json();
}

async function main() {
  const ping = await fetch(`http://127.0.0.1:${PORT}/ping`).catch(() => null);
  if (!ping || !ping.ok) {
    console.error(`The daemon did not answer on port ${PORT} — run \`zemory ui\` first.`);
    process.exit(1);
  }
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) {
    console.error("No Edge or Chrome found — cannot capture.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const profile = join(tmpdir(), `zemory-shoot-${process.pid}`);

  const child = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${W},${H}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `http://127.0.0.1:${PORT}/`,
    ],
    { stdio: "ignore", detached: false },
  );

  let ws = null;
  for (let i = 0; i < 40 && !ws; i++) {
    await sleep(500);
    const list = await cdpTargets().catch(() => null);
    const page = list?.find((t) => t.type === "page");
    if (page) ws = page.webSocketDebuggerUrl;
  }
  if (!ws) {
    child.kill();
    console.error("The browser did not open the CDP port.");
    process.exit(1);
  }

  const { WebSocket } = await import("node:ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
  const sock = new WebSocket(ws);
  let id = 0;
  const waiting = new Map();
  sock.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  });
  await new Promise((r) => sock.addEventListener("open", r));
  const send = (method, params) =>
    new Promise((res) => {
      const n = ++id;
      waiting.set(n, res);
      sock.send(JSON.stringify({ id: n, method, params }));
    });

  await send("Page.enable", {});

  // NAVIGATE AGAIN to be sure. Edge on this machine is signed into a corporate account and injects an
  // advertising page ("we've signed you in / syncing your browsing data") OVER the first tab, so the URL passed
  // at launch is not what ends up displayed. Measured 2026-08-12: after 150 seconds it still showed
  // the ad page rather than the app. `Page.navigate` overrides it.
  // FORCE the size over CDP, do not trust `--window-size`: headless sometimes gives a real frame
  // of 500x450 (measured 2026-08-12) => the image is squashed, columns swap places, nothing is readable.
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  await sleep(2000);

  // WAIT ON A CONDITION, NOT ON THE CLOCK. Two failed capture runs both waited a fixed time then assumed it was
  // done: the first left dashes in the number tiles, the second left the interface in Vietnamese although it had been switched to en.
  // SAME root cause: the client applies both the numbers AND the language from the `/memory-status` payload, and that endpoint
  // takes about 18.5 s — before it lands, the page sits in its default state.
  console.log("  waiting for /memory-status (usually ~20 s, at most 150)…");
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    await sleep(1000);
    const r = await send("Runtime.evaluate", {
      // A comma in the number means the tile holds real data (e.g. "238,495") rather than a dash.
      expression: `/\\d,\\d{3}/.test(document.body.innerText)`,
      returnByValue: true,
    });
    ready = r?.result?.result?.value === true;
  }
  if (!ready) {
    // Print WHAT IT SAW instead of only "not ready" — one silent failure means one separate
    // script written later just to measure it again from scratch.
    const d = await send("Runtime.evaluate", {
      expression: `JSON.stringify({len:document.body.innerText.length, head:document.body.innerText.slice(0,200).replace(/\\s+/g,' ')})`,
      returnByValue: true,
    });
    console.log("  x the numbers did NOT arrive within 150 s — NOT capturing a loading page.");
    console.log("    the page currently holds:", d?.result?.result?.value ?? "(unreadable)");
    sock.close();
    child.kill();
    process.exit(1);
  }
  await sleep(1500); // let the rest of the page finish painting

  let bad = 0;
  for (const [name, nav, sub, wait] of SHOTS) {
    const sel = sub ? `.screen[data-s="${nav}"] [data-${sub[0]}="${sub[1]}"]` : null;
    const click = `(()=>{const a=document.querySelector('.nav a[data-s="${nav}"]');if(!a)return 'nav item not found';a.click();${
      sub ? `const b=document.querySelector('${sel}');if(!b)return 'sub-tab not found ${sub[0]}=${sub[1]}';b.click();` : ""
    }return 'ok';})()`;
    const r = await send("Runtime.evaluate", { expression: click, returnByValue: true });
    let state = r?.result?.result?.value;
    await sleep(wait);

    // CONFIRM after waiting: is the right screen up, and is the sub-tab really 'on'.
    // Without this step one missed click still produces a WRONG-TAB image while the script reports green.
    if (state === "ok") {
      const check = `(()=>{const s=document.querySelector('.screen[data-s="${nav}"]');if(!s||!s.classList.contains('on'))return 'man khong mo';${
        sub ? `const b=document.querySelector('${sel}');if(!b||!b.classList.contains('on'))return 'sub-tab khong an';` : ""
      }return 'ok';})()`;
      const v = await send("Runtime.evaluate", { expression: check, returnByValue: true });
      state = v?.result?.result?.value;
    }

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const data = shot?.result?.data;
    if (!data) {
      console.log(`  x ${name}: could not capture`);
      bad++;
      continue;
    }
    if (state !== "ok") {
      console.log(`  x ${name}: ${state} — NOT writing the file (the image would show the wrong tab)`);
      bad++;
      continue;
    }
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
    console.log(`  ✓ ${name}.png`);
  }
  if (bad) console.log(`\n⚠ ${bad}/${SHOTS.length} screens could NOT be captured — see the reasons above.`);

  sock.close();
  child.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* a throwaway profile - nothing to keep */
  }
  console.log(`\nXong. Anh o: ${OUT}`);
  console.log("Check them BY EYE before committing: any screen still loading should be recaptured with a longer wait.");
}

main();
