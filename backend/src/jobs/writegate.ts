// Write gate (plan 14 §C). The root cause of "database is locked" (plan 12) is
// two processes writing the memory at once — typically the daemon's idle scheduler
// AND a CLI `memory embed`/`scan`. This is the daemon-side coordination flag:
// a CLI announces "I'm about to write" and the scheduler yields until it's done.
//
// It is a lightweight ADVISORY hold, not a distributed lock: bounded by an
// auto-expiry so a crashed CLI can never wedge the scheduler forever, and the
// engine's own retry-with-backoff stays as the last line of defence.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

const HOLD_MS = 5 * 60_000; // a CLI hold self-expires after 5 min

let holdUntil = 0;

/** Called by the daemon when a CLI announces a write. */
export function acquireCliWrite(): void {
  holdUntil = Date.now() + HOLD_MS;
}

/** Called by the daemon when the CLI finishes (or gives up). */
export function releaseCliWrite(): void {
  holdUntil = 0;
}

/** True while a CLI holds the write gate (and the hold hasn't expired). */
export function cliHoldsWrite(): boolean {
  return Date.now() < holdUntil;
}

// ── Daemon-side job token ────────────────────────────────────────────────────
// The daemon itself runs heavy children (scheduler embed pass, sync job). They
// must not overlap each other, and a CLI should know one is running: the gate
// was one-directional before — a CLI acquire told the scheduler to yield, but
// nothing told the CLI a daemon child was ALREADY writing (audit 2026-07-21).

let daemonJob: string | null = null;

// Cờ XUYÊN TIẾN TRÌNH cho cùng một sự thật. Biến `daemonJob` ở trên chỉ sống trong tiến
// trình daemon, nhưng hook realtime chạy như một tiến trình RIÊNG, ngắn hạn — nó phải biết
// "daemon đang ghi" để bỏ qua ngay thay vì xếp hàng sau một chuỗi embed dài (đo 2026-08-02:
// chờ = ~125s mỗi lượt trả lời). Dùng file thay vì hỏi HTTP: một lần `statSync` là sub-ms,
// còn một vòng fetch cộng vào MỌI lượt chat thì không đáng.
const JOB_STALE_MS = 6 * 60 * 60_000; // daemon chết giữa chừng ⇒ marker cũ không được kẹt vĩnh viễn

function jobMarkerPath(): string {
  return join(currentMemoryDir(), "daemon-job.lock");
}

/** Claim the single daemon-job slot. Returns false when something already runs. */
export function claimDaemonJob(label: string): boolean {
  if (daemonJob) return false;
  daemonJob = label;
  try {
    const p = jobMarkerPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ label, at: Date.now(), pid: process.pid }));
  } catch {
    /* marker là lớp tiện ích: mất nó thì hook chỉ mất tối ưu, không sai kết quả (điều 9) */
  }
  return true;
}

export function releaseDaemonJob(): void {
  daemonJob = null;
  try {
    rmSync(jobMarkerPath(), { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Daemon có đang chạy job nặng không — ĐỌC ĐƯỢC TỪ TIẾN TRÌNH KHÁC.
 * Marker quá hạn ⇒ coi như rảnh (daemon chết mà chưa kịp dọn).
 */
export function daemonJobBusyExternal(): boolean {
  try {
    const raw = readFileSync(jobMarkerPath(), "utf8");
    const at = Number(JSON.parse(raw)?.at ?? 0);
    return Number.isFinite(at) && Date.now() - at < JOB_STALE_MS;
  } catch {
    return false; // không có marker = rảnh
  }
}

/** What the daemon is running right now, or null. */
export function daemonJobBusy(): string | null {
  return daemonJob;
}
