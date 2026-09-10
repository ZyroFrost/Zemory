import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Chạy một đoạn mã ESM trong TIẾN TRÌNH CON, với kho (và do đó `config.json`) trỏ vào `<root>/data`.
 *
 * 🔴 Vì sao phải là con, không phải import động: `ENV_DB` ở `memory/db.ts` là HẰNG MODULE — nó đọc
 * `GLOBAL_MEMORY_DB` LÚC NẠP. Set env rồi cache-bust riêng `settings.js` KHÔNG đủ, vì `settings` import
 * `db` và `db` giữ giá trị cũ ⇒ mọi hàm đọc/ghi settings đi vào kho THẬT của người dùng. Đã trả giá 2026-09-10:
 * một ca test ghi `pathsWatch=false` vào `data/config.json` thật, làm bẩn máy và làm ĐỎ một test khác.
 * Con nhận env trước khi nạp bất cứ module nào, nên cô lập là thật.
 *
 * `body` là mã ESM, được nối vào sau hai biến sẵn có: `runCheck` (từ `dist/checks.js`) và `S`
 * (`dist/config/settings.js`), cùng mảng `out` — đẩy gì vào `out` thì hàm này trả về cái đó.
 * Đường kho ở `process.env.Z_ROOT`.
 */
export function runInMemoryChild(root, body) {
  // Nối chuỗi, KHÔNG template literal: một `${…}` trong template sẽ nội suy ở tiến trình TEST (nơi
  // biến chưa tồn tại) chứ không phải trong con — bản đầu dính đúng lỗi đó.
  const code =
    'const { runCheck } = await import("file://" + process.env.Z_DIST + "/checks.js");\n' +
    'const S = await import("file://" + process.env.Z_DIST + "/config/settings.js");\n' +
    "const out = [];\n" +
    body +
    "\nprocess.stdout.write(JSON.stringify(out));\n";
  const dist = new URL("../../dist", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: { ...process.env, GLOBAL_MEMORY_DB: join(root, "data", "global_memory.db"), Z_DIST: dist, Z_ROOT: root },
  });
  if (r.status !== 0) throw new Error("con lỗi: " + String(r.stderr).slice(0, 700));
  return JSON.parse(r.stdout);
}

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

// ── Máy có đang BẬN không? ────────────────────────────────────────────────────
// Test nào chạy embed THẬT (nạp model ONNX) đều tranh CPU/I-O với job nền của daemon.
// Khi tranh, chúng đỏ với thông báo VÔ NGHĨA (`remaining 1 !== 0`, `SQLITE_ERROR`) — không
// phân biệt được "embed hỏng" với "máy đang bận". Đo 2026-08-13: bộ đầy đủ cho 7 đỏ trong lúc
// daemon merge gói sync 1,36 GB; chạy lại đúng file đó lúc rảnh thì 13/13 XANH.
//
// Cái giá KHÔNG phải là một lượt chạy hỏng, mà là NIỀM TIN vào gate: một lượt đỏ không nói được
// lý do thì mỗi lần gặp lại đều tốn đúng chừng ấy công để loại trừ (lần này: 22 phút chạy lại).
// Và nguy hiểm hơn — đỏ-giả lặp vài lần là người ta bắt đầu bỏ qua màu đỏ.
//
// Nên: hỏi daemon TRƯỚC. Bận thì bỏ qua CÓ LÝ DO (hiện ra ở dòng `skipped`), rảnh mà đỏ thì
// đó là đỏ THẬT. Không daemon / không trả lời ⇒ coi như rảnh (fail-open, HP điều 9) — máy CI
// không có daemon vẫn phải chạy đủ test.
export async function machineBusyReason(port = Number(process.env.ZEMORY_UI_PORT || 4444)) {
  const ask = async (path) => {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(1500) });
      return res.ok ? await res.json() : null;
    } catch {
      return null; // không có daemon, hoặc nó đang quá bận để trả lời — xem ghi chú dưới
    }
  };
  const [auto, sync] = await Promise.all([ask("/automation"), ask("/sync-status")]);
  if (auto?.embedRunning) return "daemon đang chạy job embed";
  if (sync?.running) return "daemon đang chạy job sync";
  return null;
}

/**
 * Bỏ qua ca test nặng khi máy đang bận, kèm lý do đo được.
 * Dùng ở ĐẦU ca: `if (await skipIfBusy(t)) return;`
 */
export async function skipIfBusy(t) {
  const why = await machineBusyReason();
  if (why) t.skip(`máy đang bận (${why}) — số đo sẽ sai, xem helpers.mjs §Máy có đang BẬN không`);
  return Boolean(why);
}
