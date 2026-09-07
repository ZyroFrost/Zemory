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
    // `[phase] <mã>` qua stderr — kênh RIÊNG với dòng JSON kết quả trên stdout, để daemon (đã hút
    // cả hai ống từ trước) đọc được BƯỚC ĐANG CHẠY theo thời gian thực (`syncjob.ts`), không phải
    // đợi tới khi con thoát mới biết. Mã ngắn ổn định, FE tự dịch — xem `share.ts::onProgress`.
    // Per-phase wall time, reported on the ONE result line the daemon already logs. Without it a
    // round that took 72 minutes to push nothing (2026-09-06 23:20) has no breakdown anywhere:
    // the `[phase]` lines carry no timestamps and stderr is only kept on failure. `lock-wait:<host>`
    // is folded into `lock-wait` so a slow neighbour reads as one bucket, not one per hostname.
    const phaseMs: Record<string, number> = {};
    let curPhase = "start";
    let curSince = Date.now();
    const onProgress = (phase: string): void => {
      const now = Date.now();
      phaseMs[curPhase] = (phaseMs[curPhase] ?? 0) + (now - curSince);
      curPhase = phase.startsWith("lock-wait:") ? "lock-wait" : phase;
      curSince = now;
      console.error(`[phase] ${phase}`);
    };
    const r = await syncDrive({ driveDir, keyFile: resolveShareKey(process.cwd()), onProgress });
    phaseMs[curPhase] = (phaseMs[curPhase] ?? 0) + (Date.now() - curSince);
    const phases = Object.entries(phaseMs)
      .filter(([k, ms]) => k !== "done" && ms >= 1000)
      .map(([k, ms]) => `${k} ${Math.round(ms / 1000)}s`)
      .join(" · ");
    console.log(JSON.stringify({ ok: true, ...r, phases }));
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
