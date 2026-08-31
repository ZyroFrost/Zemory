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
// THIRD THING, added 2026-08-31: THE GATE MANUFACTURES A RED LIGHT ON THE DASHBOARD.
// The documented procedure is "kill the daemon, run the gate, start it again". If an auto-sync run
// happens to be in flight at that moment, killing the daemon cuts it, and the next daemon start
// reports `auto-sync: ... KHONG de lai ket cuc` on the Drive Sync card. That red is CORRECT (the
// run really was cut) and HARMLESS (the next run pushes the remainder, no message is lost) — but
// its cause is a maintenance action, not an incident. Happened for real 2026-08-31: the run started
// 07:37:04Z, the daemon was killed ~07:44Z to run the gate, and the user saw "986 new messages not
// pushed · push incomplete" and had to ask whether something was broken. A red that gets explained
// only after it scares someone costs the same trust reason (1) above exists to protect. So:
//   · daemon ALIVE → name the in-flight run and say that killing it now produces that red;
//   · daemon DEAD but the ledger still holds a run → say the red is already coming, and why.
// The persistent ledger (`autosyncRunAt` in `config.json`) is the only thing that survives the
// process boundary — which is exactly why it exists (see `scheduler.interruptedRunNote`).
//
// Escape hatch: ZEMORY_GATE_FORCE=1 (say so out loud when you use it).

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * Where `config.json` lives. Mirrors `memory/db.resolveMemoryDir` by hand on purpose instead of
 * importing it: this script runs BEFORE `npm run build`, so `dist/` may be stale or absent, and a
 * preflight that needs a build to run is useless as a preflight. Fail-open everywhere — a missing
 * or unreadable config must never become the reason the gate refuses to start.
 */
function configPath() {
  const envDb = process.env.GLOBAL_MEMORY_DB?.trim();
  if (envDb) return join(dirname(envDb), "config.json");
  const home = join(homedir(), ".zemory");
  try {
    const parsed = JSON.parse(readFileSync(join(home, "location.json"), "utf8"));
    if (typeof parsed?.dataDir === "string" && parsed.dataDir.trim()) {
      return join(parsed.dataDir.trim(), "config.json");
    }
  } catch {
    /* no pointer (or unreadable) → home default */
  }
  return join(home, "config.json");
}

/** Epoch ms of an auto-sync run the scheduler opened and never closed, else null. Fail-open. */
export function readAutosyncRunAt() {
  try {
    const p = configPath();
    if (!existsSync(p)) return null;
    const v = JSON.parse(readFileSync(p, "utf8"))?.autosyncRunAt;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * What to say about an auto-sync run the ledger still holds open — PURE, so the gate can test it.
 * Returns null when there is nothing to say, so a caller never prints an empty warning.
 *
 * `daemonAlive` splits two states that read IDENTICALLY in the ledger but need opposite advice:
 * alive means the run is probably still going and the reader is about to cut it (prevention);
 * dead means it was already cut and the reader is about to meet a red they did not mean to cause
 * (explanation). Clock skew is clamped the way `interruptedRunNote` clamps it — a machine whose
 * clock stepped backwards must not print "-40′ ago".
 */
export function syncCutNote(runAt, now, daemonAlive) {
  if (runAt === null || runAt === undefined) return null;
  const mins = Math.max(0, Math.round((now - runAt) / 60_000));
  const when = `bắt đầu ${new Date(runAt).toISOString()}, ${mins}′ trước`;
  if (daemonAlive) {
    return [
      `  ⚠ Đang có MỘT LƯỢT AUTO-SYNC chưa đóng sổ (${when}).`,
      '    Tắt daemon BÂY GIỜ là cắt nó ⇒ card Drive Sync sẽ hiện đèn đỏ "push incomplete".',
      "    Vô hại — không mất tin nào, lượt kế tự đẩy bù — nhưng muốn khỏi thấy đỏ thì chờ nó xong.",
    ].join("\n");
  }
  return [
    `  ⚠ Sổ bền còn MỘT LƯỢT AUTO-SYNC chưa có kết cục (${when}) — nó đã bị cắt lúc daemon tắt.`,
    '    Card Drive Sync SẼ báo đỏ "push incomplete": đó là hệ quả của việc tắt daemon để chạy gate,',
    "    KHÔNG phải lỗi mới. Lượt kế tự đẩy bù — không cần bấm Sync Now.",
  ].join("\n");
}

// Wrapped in a function (it used to be top-level await) so a test can import `syncCutNote` without
// the import itself probing the daemon and setting `process.exitCode = 1` — which would turn every
// test file that imports this into a spurious red on any machine where the daemon happens to be up.
async function main() {
const [auto, sync] = await Promise.all([ask("/automation"), ask("/sync-status")]);
const busy = [];
if (auto?.embedRunning) busy.push("embed");
if (sync?.running) busy.push("sync");
// Daemon SỐNG (dù rảnh) cũng chặn — không riêng lúc nó chạy job. Đo 2026-08-27: gate chạy 4 worker,
// nhóm test nhúng mỗi worker nạp model ONNX ~1 GB, cộng daemon + con embed giữ ~4 GB (tắt xong
// RAM trống nhảy 352 → 4.414 MB) ⇒ máy 16 GB tràn, phiên agent chết giữa gate — lần thứ hai. Và
// scheduler của daemon có thể phóng job GIỮA lúc gate đang chạy, tức "rảnh lúc kiểm" không bảo đảm
// "rảnh suốt gate". Tắt daemon trước, chạy gate, bật lại — hoặc ZEMORY_GATE_FORCE=1 nếu chấp nhận.
if (auto && !busy.length) busy.push("daemon sống (rảnh, nhưng giữ RAM và có thể phóng job giữa gate)");

// Đọc SỔ BỀN, không hỏi daemon: câu này phải nói được ĐÚNG LÚC daemon đã tắt (xem khối THIRD THING).
const cutNote = syncCutNote(readAutosyncRunAt(), Date.now(), Boolean(auto));

// exitCode (không phải process.exit): gọi exit trong lúc undici còn đang đóng socket làm Node
// trên Windows chết bằng assertion của libuv và trả 127 — tức chính phép kiểm canh gate lại là
// thứ làm gate đỏ. Đặt mã thoát rồi để tiến trình tự kết thúc.
if (!busy.length) {
  console.log("[preflight] máy rảnh — chạy gate.");
  if (cutNote) console.log(cutNote);
  process.exitCode = 0;
} else if (process.env.ZEMORY_GATE_FORCE === "1") {
  console.log(`[preflight] ⚠ daemon đang chạy: ${busy.join(" + ")} — BỎ QUA vì ZEMORY_GATE_FORCE=1.`);
  console.log("[preflight] ⚠ Kết quả có thể ĐỎ GIẢ, và `clean` có thể xoá dist/ dưới chân job.");
  if (cutNote) console.log(cutNote);
  process.exitCode = 0;
} else {
  console.error(`[preflight] ⛔ KHÔNG chạy gate: daemon đang chạy job ${busy.join(" + ")}.`);
  console.error("");
  console.error("  Vì sao chặn (cả hai đều đã xảy ra thật):");
  console.error("   · test embed nạp model ONNX ⇒ tranh CPU/I-O ⇒ ĐỎ GIẢ với thông báo vô nghĩa");
  console.error("     (đo 2026-08-13: 7 đỏ khi daemon merge 1,36 GB · chạy lại lúc rảnh 13/13 xanh);");
  console.error("   · `npm test` gọi `build` = `clean && tsc` ⇒ xoá `dist/` NGAY DƯỚI CHÂN job đang chạy.");
  if (cutNote) {
    console.error("");
    console.error(cutNote);
  }
  console.error("");
  console.error("  Cách đi tiếp:");
  console.error("   · chờ job xong — xem `curl 127.0.0.1:4444/sync-status` và `/automation`;");
  console.error("   · hoặc chạy phần KHÔNG đụng dist: `npx tsc && npx eslint …` rồi `node --test <file>`;");
  console.error("   · thật sự muốn chạy đè: ZEMORY_GATE_FORCE=1 (và nói rõ là đã đè).");
  process.exitCode = 1;
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
