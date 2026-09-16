// Child entry for one Drive sync (plan 14 §3b, run-hidden 2026-07-21). The
// daemon spawns `node dist/jobs/syncrun.js` so the heavy work — scan, encrypt,
// merge, EMBED (ONNX) — happens in THIS process, never on the daemon's event
// loop (the same isolation the scheduler uses for embed passes). The result is
// printed as one JSON line on stdout; the daemon parses it for /sync-status.

import { mergeChannelDir, resolveShareKey, syncDrive } from "../memory/share.js";

import { channelDir, syncTargets } from "../memory/channel/index.js";

(async () => {
  try {
    // MỌI kênh đang bật đều được ghi — không còn chọn một (user chốt 2026-09-16).
    // An toàn được là nhờ `wmKeyFor`: mỗi kênh giữ MỐC DELTA RIÊNG. Dùng chung một mốc như bản
    // cũ thì kênh nào đẩy trước sẽ nuốt luôn phần của kênh kia, im lặng và vĩnh viễn.
    const targets = syncTargets();
    if (!targets.length) {
      console.log(JSON.stringify({ ok: false, error: "no sync channel enabled" }));
      process.exitCode = 1;
      return;
    }
    // MERGE thư mục kênh TRƯỚC mọi lượt đẩy (`plan/08 §8c` ⑤): khối máy kia vừa gửi phải vào kho
    // trước khi ta xuất delta, nếu không lượt đẩy này mang một bản THIẾU phần của họ.
    // Fail-open: merge hỏng thì lượt chính vẫn chạy.
    try {
      await mergeChannelDir(channelDir(), { keyFile: resolveShareKey(process.cwd()) ?? undefined });
    } catch (e) {
      console.error(`[phase] channel-merge lỗi: ${String(e).slice(0, 120)}`);
    }
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
    // Chạy TUẦN TỰ, không song song: hai lượt xuất cùng lúc là hai kẻ đọc-ghi cùng cuốn sổ delta
    // và cùng khoá ghi của kho — đúng thứ điều 11 cấm.
    let r = null;
    const channels = [];
    for (const tgt of targets) {
      const one = await syncDrive({ driveDir: tgt.dir, channel: tgt.channel, keyFile: resolveShareKey(process.cwd()), onProgress });
      channels.push({ channel: tgt.channel, dir: tgt.dir, push: one.push, exportedBytes: one.exportedBytes });
      // Kết quả CHÍNH giữ nguyên hình dạng cũ cho `/sync-status` (kênh đầu tiên = Drive khi có).
      if (!r) r = one;
    }
    phaseMs[curPhase] = (phaseMs[curPhase] ?? 0) + (Date.now() - curSince);
    const phases = Object.entries(phaseMs)
      .filter(([k, ms]) => k !== "done" && ms >= 1000)
      .map(([k, ms]) => `${k} ${Math.round(ms / 1000)}s`)
      .join(" · ");
    console.log(JSON.stringify({ ok: true, ...r, channels, phases }));
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
