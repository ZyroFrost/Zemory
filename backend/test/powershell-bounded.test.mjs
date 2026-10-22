// 2026-10-22: after the machine ran out of RAM, PowerShell/WMI hung for minutes; the daemon's start-up shortcut check
// called it synchronously with no timeout and froze the whole daemon (no request answered, connections in CLOSE_WAIT).
// Every PowerShell call in the source is bounded, and the daemon's start-up check does not block.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
function files(d) {
  return readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });
}

test("every PowerShell call in the source carries a timeout", () => {
  const unbounded = [];
  for (const f of files(SRC)) {
    const text = readFileSync(f, "utf8");
    const re = /(execFileSync|execFileP|spawnSync)\(\s*"powershell(?:\.exe)?"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      // the call's argument list: up to the closing of the options object (generous window)
      const call = text.slice(m.index, m.index + 600);
      if (!/timeout:/.test(call)) unbounded.push(`${f.slice(SRC.length)}:${text.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(unbounded, [], "a PowerShell call with no timeout can freeze the daemon");
});

test("the start-up shortcut check does not block the daemon", () => {
  const a = readFileSync(join(SRC, "platform", "autostart.ts"), "utf8");
  assert.match(a, /export async function reconcileShortcuts\(\): Promise<string\[\]>/);
  assert.match(a, /await winShortcutFactsAsync\(\)/);
});
