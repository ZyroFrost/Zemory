// CHỨC NĂNG "DỌN TIẾN TRÌNH THỪA" — nối đủ BA bề mặt, đúng luật đã có của repo.
//
// User giao 2026-09-12: *"thêm chức năng dọn tiến trình thừa đi"*. Một chức năng ở repo này nghĩa là
// ba thứ đi cùng nhau, thiếu một cái là nó vẫn mồ côi như trước:
//   ① hàng trên màn Tính năng (đếm, có nút) · ② endpoint để cú bấm gọi · ③ CLI cho lúc daemon chết.
// Đây đúng bài học `WEB_LABEL` 2026-09-10: backend làm xong mà quên nối một chỗ ⇒ tính năng vô hình
// cả ngày, không cổng nào kêu. Ca này biến "đã nối đủ chưa" thành phép đo.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const CHECKS = SRC("backend/src/checks.ts");
const UI = SRC("backend/src/ui.ts");
const FE = SRC("frontend/scripts/system.js");
const I18N = SRC("frontend/scripts/chrome.js");
const CLI = SRC("backend/src/cli.ts");
const HELP = SRC("backend/src/commands/help.ts");
const SWEEP = SRC("backend/src/commands/sweep.ts");

test("① hàng kiểm `procs` có thật và CHỈ ĐẾM (không tự giết)", () => {
  assert.match(CHECKS, /case "procs": \{/u);
  assert.match(CHECKS, /sweepOrphanBrowsers\(\{[^}]*dryRun: true/su, "hàng kiểm phải chạy ở chế độ DÒ — một cổng tự ý giết tiến trình là cổng vượt quyền");
  // Màu theo SỐ THẬT, không hardcode xanh (bài học `validate` từng luôn xanh dù có lỗi bên dưới).
  assert.match(CHECKS, /state: n > 0 \? "warn" : "on"/u);
});

test("② endpoint `/sweep-procs` — cú bấm mới đóng, và máy tự quyết 'đang bận'", () => {
  assert.match(UI, /if \(p === "\/sweep-procs"\) \{/u);
  // `busy` KHÔNG được nhận từ query: bề mặt quyết là mở đường cho một cú bấm cắt ngang lượt quét web.
  const raw = UI.slice(UI.indexOf('if (p === "/sweep-procs")'), UI.indexOf('if (p === "/set-repo-std-check")'));
  // BỎ CHÚ THÍCH TRƯỚC KHI SOI — bẫy đã dính bốn lần ở repo này (`05_TODO` 02/09 · 11/09), và dính
  // lại ngay trong chính ca này: câu chú thích giải thích *bản cũ sai thế nào* có chứa đúng chuỗi bị
  // cấm, nên cổng bắt oan bản đã sửa.
  const body = raw.replace(/\/\/.*$/gmu, "");
  assert.doesNotMatch(body, /searchParams\.get\("busy"\)/u, "bận hay không là sự thật của máy, không phải tham số");
  assert.match(body, /job === "web-pull" \|\| job === "scan" \|\| cliHoldsWrite\(\)/u, "chặn ĐÚNG job có thể đang giữ trình duyệt");
  // Ca ÂM: KHÔNG được chặn theo "có job nào đó" — bản đầu chặn theo mọi job nên nút thành vô hiệu
  // khi daemon đang nhúng vector, và người dùng đọc một nút không ăn thành nút hỏng.
  assert.doesNotMatch(body, /daemonJobBusy\(\) !== null/u);
});

test("③ CLI `zemory sweep` — đường dùng được khi daemon đã chết", () => {
  assert.match(CLI, /case "sweep":/u);
  assert.match(HELP, /^\s+" {2}sweep /mu, "verb mới phải có trong help (cổng help-đủ-lệnh)");
  assert.match(SWEEP, /--dry-run/u);
  // Mặc định LÀM THẬT: gõ lệnh dọn là đã nói rõ ý. (Khác `paths fix` — cái đó GHI vào file nguồn.)
  assert.match(SWEEP, /const dry = args\.includes\("--dry-run"\);/u);
});

test("④ hàng hiện trên UI + nút Dọn ngay + vào vòng tự kiểm", () => {
  assert.match(FE, /\{k:'procs',grp:'f\.grpSync',n:'f\.procs',kind:'check',feat:'procs',act:'sweep'/u);
  assert.match(FE, /data-sys-sweep/u, "phải có nút");
  assert.match(FE, /zPost\('\/sweep-procs'\)/u, "nút phải gọi đúng endpoint");
  assert.match(FE, /var SYS_CHECKS=\[[^\]]*'procs'\]/u, "phải nằm trong danh sách kiểm lại tất cả + nhịp tự kiểm");
});

test("⑤ i18n đủ HAI từ điển — thiếu một đầu là đổi ngôn ngữ xong vẫn thấy tiếng cũ", () => {
  for (const k of ["f.procs", "f.doc.procs", "sys.sweepNow", "sys.sweeping", "sys.sweepDone", "sys.sweepBusy"]) {
    const n = (I18N.match(new RegExp(`'${k.replace(/\./gu, "\\.")}':`, "gu")) || []).length;
    assert.equal(n, 2, `khoá ${k} phải có ở CẢ HAI từ điển (đang có ${n})`);
  }
});

test("⑥ hai ngưỡng tuổi khai CẠNH NHAU và dùng đúng chỗ", () => {
  const SW = SRC("backend/src/platform/browsersweep.ts");
  assert.match(SW, /export const BG_SWEEP_MIN_AGE_MS = 30 \* 60_000;/u, "vòng nền: dè dặt vì không ai nhìn");
  assert.match(SW, /export const UI_SWEEP_MIN_AGE_MS = 5 \* 60_000;/u, "người bấm: không bắt chờ nửa tiếng");
  assert.match(CHECKS, /minAgeMs: UI_SWEEP_MIN_AGE_MS/u, "hàng kiểm phải đếm CÙNG ngưỡng với nút — lệch là hàng báo 0 mà nút đóng 3");
  assert.match(UI, /minAgeMs: UI_SWEEP_MIN_AGE_MS/u);
  // CLI cũng là hành động của NGƯỜI ⇒ cùng ngưỡng. Đo được lúc thử: CLI để mặc định 30 phút trong
  // khi app dùng 5 phút, nên app báo "2 tiến trình thừa" còn `zemory sweep` nói "không có gì" —
  // hai bề mặt của cùng một chức năng nói hai con số, bất kể mỗi bên đều đúng theo tham số của mình.
  assert.match(SWEEP, /minAgeMs: all \? 0 : UI_SWEEP_MIN_AGE_MS/u, "CLI phải dùng ngưỡng người-bấm, không phải ngưỡng vòng nền");
});
