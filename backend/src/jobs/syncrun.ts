// Child entry for one Drive sync (plan 14 §3b, run-hidden 2026-07-21). The
// daemon spawns `node dist/jobs/syncrun.js` so the heavy work — scan, encrypt,
// merge, EMBED (ONNX) — happens in THIS process, never on the daemon's event
// loop (the same isolation the scheduler uses for embed passes). The result is
// printed as one JSON line on stdout; the daemon parses it for /sync-status.

import { resolveShareKey, syncDrive } from "../brain/share.js";
import { getDriveDir } from "../settings.js";

(async () => {
  try {
    const driveDir = getDriveDir();
    if (!driveDir) {
      console.log(JSON.stringify({ ok: false, error: "no Drive folder linked" }));
      process.exitCode = 1;
      return;
    }
    const r = await syncDrive({ driveDir, keyFile: resolveShareKey(process.cwd()) });
    console.log(JSON.stringify({ ok: true, ...r }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  }
})();
