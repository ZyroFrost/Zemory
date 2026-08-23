// Bốn phép quét TOÀN BẢNG của bảng số, chạy ở TIẾN TRÌNH CON.
//
// Vì sao (đo 2026-08-23 trên kho 284k tin): `/memory-status` lượt LẠNH **16,7 giây**, lượt ấm
// **0,06 giây**. better-sqlite3 chạy ĐỒNG BỘ, nên 16,7 giây đó là event loop của daemon bị khoá
// cứng — MỌI endpoint khác đứng hình cùng lúc, và chip ở rail treo "…" nhìn y như đã tắt. Đây
// đúng triệu chứng user báo hai lần ("heal mở lại là tắt", "chỗ đó chưa hoàn chỉnh").
//
// Cùng khuôn `deepSearchChild` (2026-08-02) và cùng luật đã có từ 2026-07-21: *việc nặng không
// được lên event loop của daemon*. Chỗ này là phần còn sót của luật đó.
//
// Con CHỈ ĐỌC ⇒ KHÔNG xin write-gate: bắt bảng số xếp hàng sau một chuỗi embed dài là biến một
// phép đọc thành hàng giờ chờ.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** dist/jobs/statsjob.js → dist/cli.js. */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/** Quá mức này là HỎNG, không phải chậm — kho lớn nhất đo được mất ~17 s. */
const TIMEOUT_MS = 180_000;

export interface HeavyStats {
  tokensEst: number;
  count: number;
  remaining: number;
  covered: number;
  embeddable: number;
}

/** Tính bốn số nặng ở tiến trình con. Fail-open: lỗi/timeout ⇒ `null`, người gọi giữ số cũ. */
export function heavyStatsChild(): Promise<HeavyStats | null> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(process.execPath, [cliEntry(), "memory", "stats"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: { ...process.env, ZEMORY_DAEMON_CHILD: "1" },
      });
    } catch {
      return resolve(null);
    }
    let out = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* đã chết rồi thì thôi */
      }
      resolve(null);
    }, TIMEOUT_MS);
    timer.unref?.();
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString();
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        // Con có thể in thêm dòng lạ (cảnh báo của Node…) ⇒ lấy DÒNG JSON cuối, đừng parse cả
        // stdout. Không có dòng nào hợp lệ ⇒ null, giữ số cũ còn hơn vẽ số bịa.
        const line = out
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.startsWith("{") && l.endsWith("}"))
          .pop();
        if (!line) return resolve(null);
        const v = JSON.parse(line) as Partial<HeavyStats>;
        if (typeof v.count !== "number" || typeof v.tokensEst !== "number") return resolve(null);
        resolve({
          tokensEst: v.tokensEst,
          count: v.count,
          remaining: v.remaining ?? 0,
          covered: v.covered ?? 0,
          embeddable: v.embeddable ?? 0,
        });
      } catch {
        resolve(null);
      }
    });
  });
}
