// Tìm-sâu chạy ở TIẾN TRÌNH CON.
//
// Vì sao (đo 2026-08-02 trên kho thật 196.894 tin): FTS 360ms · hybrid **20,5s** ·
// hybrid+rerank **63,6s** — và cả ba đang chạy ngay trên event loop của daemon. Node một
// luồng, ONNX inference không nhường được, nên mỗi lần người dùng gõ Tìm là TOÀN BỘ giao
// diện đứng hình: đo `/memory-status` (vốn 4ms) nhảy lên 48s trong lúc đó.
//
// Luật đã có từ 2026-07-21 — *"việc nặng không được lên event loop của daemon"* — mới chỉ áp
// cho scan/embed/digest/sync. Đây là chỗ còn sót. Cùng khuôn với `scheduler.runStep`: spawn
// `zemory memory search --json`, đọc stdout, không bao giờ khoá cửa daemon.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SearchHit, SearchOptions } from "../memory/search.js";

/** dist/jobs/searchjob.js → dist/cli.js. */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

const TIMEOUT_MS = 120_000; // rerank nguội có thể mất ~60s; quá mức đó là hỏng, không phải chậm

export type DeepSearchResult = { ok: true; hits: SearchHit[] } | { ok: false; error: string };

export function deepSearchChild(
  query: string,
  opts: SearchOptions = {},
  /** Cách diễn đạt KHÁC của cùng câu hỏi — đa-truy-vấn RRF (plan 17 §1.1). Đo: `@10` 39% →
   *  48%, `prose@40` 68% → 94%. Mỗi lối nói thêm là một lượt tìm nữa trong CÙNG tiến trình
   *  con, nên model ONNX chỉ nạp một lần cho cả chùm. */
  also: string[] = [],
): Promise<DeepSearchResult> {
  const q = query.trim();
  if (!q) return Promise.resolve({ ok: true, hits: [] });
  const args = [cliEntry(), "memory", "search", q, "--json", "--hybrid"];
  for (const a of also) {
    const t = a.trim();
    if (t) args.push("--also", t);
  }
  if (opts.all) args.push("--all");
  if (opts.origin) args.push("--origin", opts.origin);
  if (opts.limit) args.push("--limit", String(opts.limit));

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(process.execPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        // Con KHÔNG xin write-gate: đây là việc CHỈ ĐỌC. Xin gate ở đây sẽ bắt người dùng
        // xếp hàng sau một chuỗi embed dài chỉ để... tìm kiếm.
        env: { ...process.env, ZEMORY_DAEMON_CHILD: "1" },
      });
    } catch (e) {
      return resolve({ ok: false, error: e instanceof Error ? e.message : "cannot spawn search" });
    }
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* đã chết */
      }
      resolve({ ok: false, error: `deep search timed out after ${TIMEOUT_MS / 1000}s` });
    }, TIMEOUT_MS);
    timer.unref?.();
    child.stdout?.on("data", (c) => (out += c));
    child.stderr?.on("data", (c) => (err += c));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, error: e.message });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve({ ok: false, error: err.trim().slice(0, 200) || `search exited ${code}` });
      try {
        resolve({ ok: true, hits: JSON.parse(out) as SearchHit[] });
      } catch {
        resolve({ ok: false, error: "search returned unparseable output" });
      }
    });
  });
}
