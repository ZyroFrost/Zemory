// Child entry for one Drive sync (plan 14 §3b, run-hidden 2026-07-21). The
// daemon spawns `node dist/jobs/syncrun.js` so the heavy work — scan, encrypt,
// merge, EMBED (ONNX) — happens in THIS process, never on the daemon's event
// loop (the same isolation the scheduler uses for embed passes). The result is
// printed as one JSON line on stdout; the daemon parses it for /sync-status.

import { resolveShareKey, syncDrive } from "../memory/share.js";
import { getDriveDir } from "../config/settings.js";

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
    // 🔴 STACK RA STDERR, không chỉ `message` vào JSON (2026-08-26). Lỗi thật của lượt sync
    // 26/08 để lại đúng bốn chữ `UNKNOWN: unknown error, write` — không đủ để biết phép ghi
    // NÀO ném, nên không vá được mù. `message` là thứ người dùng đọc trên UI; `stack` là thứ
    // phiên sau cần, và nó phải đi ra một kênh KHÁC để không nhét stack vào bề mặt.
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  }
})();
