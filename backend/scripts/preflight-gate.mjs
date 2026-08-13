#!/usr/bin/env node
// Refuse to run the gate while the daemon has a background job in flight.
//
// Two separate things go wrong when the gate runs against a busy machine, and BOTH have already
// cost real time in this repo:
//
//   1. FALSE RED. The embed tests load a real ONNX model; when they compete with a background
//      embed/sync pass they fail with messages that say nothing about the real cause
//      (`remaining 1 !== 0`, `SQLITE_ERROR`). Measured 2026-08-13: the full suite reported
//      7 failures while the daemon merged a 1.36 GB sync bundle — re-running the same file on an
//      idle machine gave 13/13 green. Cost: 22 minutes to prove the red was fake. The deeper cost
//      is trust: a red that lies a few times teaches people to ignore red.
//
//   2. KILLING THE JOB. `npm test` runs `npm run build` = `clean && tsc`, and `clean` deletes
//      `dist/` out from under whatever is running from it. This repo has already killed a
//      long-running job exactly that way.
//
// The note "turn the daemon off before running the gate" has been written down twice and skipped
// twice — including once by the agent that wrote it. So it is a check now, not a note.
//
// Escape hatch: ZEMORY_GATE_FORCE=1 (say so out loud when you use it).

const PORT = Number(process.env.ZEMORY_UI_PORT || 4444);

async function ask(path) {
  // AbortController + an UNREF'd timer, not AbortSignal.timeout(): the latter leaves a live
  // handle behind, and calling process.exit() while it is pending aborts the process on Windows
  // ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)", exit 127) — which would have made
  // the very check that guards the gate the thing that breaks it.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 1500);
  timer.unref?.();
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { signal: ac.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null; // no daemon (or it cannot answer) → nothing to wait for
  } finally {
    clearTimeout(timer);
  }
}

const [auto, sync] = await Promise.all([ask("/automation"), ask("/sync-status")]);
const busy = [];
if (auto?.embedRunning) busy.push("embed");
if (sync?.running) busy.push("sync");

// exitCode (không phải process.exit): gọi exit trong lúc undici còn đang đóng socket làm Node
// trên Windows chết bằng assertion của libuv và trả 127 — tức chính phép kiểm canh gate lại là
// thứ làm gate đỏ. Đặt mã thoát rồi để tiến trình tự kết thúc.
if (!busy.length) {
  console.log("[preflight] máy rảnh — chạy gate.");
  process.exitCode = 0;
} else if (process.env.ZEMORY_GATE_FORCE === "1") {
  console.log(`[preflight] ⚠ daemon đang chạy: ${busy.join(" + ")} — BỎ QUA vì ZEMORY_GATE_FORCE=1.`);
  console.log("[preflight] ⚠ Kết quả có thể ĐỎ GIẢ, và `clean` có thể xoá dist/ dưới chân job.");
  process.exitCode = 0;
} else {
  console.error(`[preflight] ⛔ KHÔNG chạy gate: daemon đang chạy job ${busy.join(" + ")}.`);
  console.error("");
  console.error("  Vì sao chặn (cả hai đều đã xảy ra thật):");
  console.error("   · test embed nạp model ONNX ⇒ tranh CPU/I-O ⇒ ĐỎ GIẢ với thông báo vô nghĩa");
  console.error("     (đo 2026-08-13: 7 đỏ khi daemon merge 1,36 GB · chạy lại lúc rảnh 13/13 xanh);");
  console.error("   · `npm test` gọi `build` = `clean && tsc` ⇒ xoá `dist/` NGAY DƯỚI CHÂN job đang chạy.");
  console.error("");
  console.error("  Cách đi tiếp:");
  console.error("   · chờ job xong — xem `curl 127.0.0.1:4444/sync-status` và `/automation`;");
  console.error("   · hoặc chạy phần KHÔNG đụng dist: `npx tsc && npx eslint …` rồi `node --test <file>`;");
  console.error("   · thật sự muốn chạy đè: ZEMORY_GATE_FORCE=1 (và nói rõ là đã đè).");
  process.exitCode = 1;
}
