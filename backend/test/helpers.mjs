import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function tempDir(t, prefix) {
  const path = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

// ── Toàn bộ JS của UI, ghép theo đúng thứ tự nạp của app.html ────────────────
// app.js tách thành 11 file 2026-08-06 (xem 06_CHANGES). Các assertion nội dung
// ("UI có chuỗi X", "handler Y tồn tại") soi TOÀN BỘ JS của UI — trước là một file,
// nay là phép ghép này. Đọc theo thứ tự nạp để chỗ nào assert THỨ TỰ vẫn đúng nghĩa.
import { readFileSync, readdirSync } from "node:fs";

export const APP_SCRIPT_ORDER = [
  "core.js", "shell.js", "graph-render.js", "graph-panel.js", "gm.js", "session.js", "sources.js",
  "recall.js", "harness.js", "system.js", "chrome.js", "boot.js",
];

export function readAppJs() {
  const dir = new URL("../../frontend/scripts/", import.meta.url);
  // Canh drift: file mới thêm vào scripts/ mà quên khai vào ORDER (và app.html) thì
  // phép ghép này thiếu nó — báo ngay thay vì để assertion soi thiếu bề mặt.
  const onDisk = readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
  const known = [...APP_SCRIPT_ORDER].sort();
  if (JSON.stringify(onDisk) !== JSON.stringify(known)) {
    throw new Error(`frontend/scripts lệch danh sách nạp: đĩa=[${onDisk}] vs khai=[${known}] — cập nhật APP_SCRIPT_ORDER + app.html`);
  }
  return APP_SCRIPT_ORDER.map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
}
