// Child entry of the p2p FAST LANE (plan/24 §12): `node dist/jobs/fastrun.js push|vectors|merge`. The daemon spawns it so
// the work — embed (ONNX), encrypt, SQLite writes — never runs on the daemon's event loop (measured 24/09: a merge on the
// event loop froze TLS handshakes and heartbeats for tens of minutes). One JSON line on stdout is the result.
//   push    — seal THIS machine's new messages into the channel now, vectors not awaited (`pushChannelFast`).
//   vectors — embed what was just shipped, then seal a block carrying those vectors (`pushChannelVectors`).
//   merge   — merge the channel folder into the store (`mergeChannelDir`): blocks just received from another machine.
import { channelDir } from "../memory/channel/index.js";
import { mergeChannelDir, pushChannelFast, pushChannelVectors, resolveShareKey } from "../memory/share.js";

(async () => {
  const mode = process.argv[2];
  try {
    const keyFile = resolveShareKey(process.cwd()) ?? undefined;
    const onProgress = (p: string): void => console.error(`[phase] ${p}`);
    if (mode === "push") {
      const r = await pushChannelFast({ dir: channelDir(undefined, true), keyFile, onProgress });
      console.log(JSON.stringify({ ok: true, mode, kind: r.push.kind, messages: r.push.messages, bytes: r.push.bytes, pushMs: r.pushMs }));
    } else if (mode === "vectors") {
      const r = await pushChannelVectors({ dir: channelDir(undefined, true), keyFile, onProgress });
      console.log(JSON.stringify({ ok: true, mode, kind: r.push.kind, messages: r.push.messages, bytes: r.push.bytes, embedded: r.embedded, embedMs: r.embedMs, pushMs: r.pushMs }));
    } else if (mode === "merge") {
      const r = await mergeChannelDir(channelDir(), { keyFile });
      const added = r.reduce((n, e) => n + (e.messagesAdded ?? 0), 0);
      const errors = r.filter((e) => e.error).map((e) => `${e.file}: ${e.error}`);
      console.log(JSON.stringify({ ok: errors.length === 0, mode, blocks: r.filter((e) => !e.skipped).length, messagesAdded: added, ...(errors.length ? { error: errors.slice(0, 3).join(" · ") } : {}) }));
    } else {
      console.log(JSON.stringify({ ok: false, error: `unknown mode "${mode ?? ""}" (push | vectors | merge)` }));
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    console.log(JSON.stringify({ ok: false, mode, error: e instanceof Error ? e.message : String(e) }));
    process.exitCode = 1;
  }
})();
