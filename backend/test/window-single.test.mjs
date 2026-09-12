// MỘT APP = MỘT CỬA SỔ, và cửa sổ phải chết theo ĐÚNG tiến trình daemon đã sinh ra nó.
//
// Ca thật (user 2026-09-12): *"mở app lại mà app UI cũ vẫn còn, không biết cái nào mới đúng"*.
// Hai gốc, cả hai đều là "đo sai thứ cần đo":
//   ① Nhịp tim cũ chỉ hỏi *"cổng 4444 còn ai trả lời không"* — mà daemon MỚI cũng nghe cổng đó.
//      Mỗi lần build là một lần tắt/bật daemon ⇒ cửa sổ CŨ thấy ping vẫn OK nên sống tiếp, còn
//      daemon mới lại mở cửa sổ của nó ⇒ hai vỏ cùng "chạy được".
//   ② Sổ đăng ký `window.pid` **chỉ do `ui.ts` ghi** lúc spawn ⇒ cửa sổ mở bằng đường khác (tray,
//      lối tắt, gõ tay) không có tên trong sổ ⇒ lượt mở sau không biết mà đóng.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const WIN = SRC("backend/src/platform/window.ts");
const UI = SRC("backend/src/ui.ts");

test("1 the window follows the daemon's PID, not the port", () => {
  assert.match(WIN, /let daemonPid: number \| null = null;/u, "phải nhớ pid daemon lần ping đầu");
  assert.match(WIN, /else if \(pid !== daemonPid\)/u, "pid đổi ⇒ nền đã bị thay");
  // Và khi phát hiện thì phải ĐÓNG, không chỉ ghi log. Cắt theo MỐC CODE THẬT (từ chỗ so pid tới
  // `} catch (e) {` của chính vòng ping), không cắt theo cửa sổ N ký tự — bản đầu của ca này neo
  // `[\s\S]*?\}` và dừng ngay ở dấu `}` của `${daemonPid}` trong chuỗi log.
  const from = WIN.indexOf("pid !== daemonPid");
  const to = WIN.indexOf("} catch (e) {", from);
  assert.ok(from > 0 && to > from, "không tìm được nhánh so pid");
  assert.match(WIN.slice(from, to), /bye\(\);/u, "phát hiện nền bị thay mà không đóng thì vẫn là vỏ rỗng");
  // Ca ÂM: KHÔNG được đóng chỉ vì một nhịp hết giờ — daemon bận ≠ daemon chết (bài học 2026-08-28,
  // `/ping` từng nghẽn 12,3 s ngay sau khởi động).
  assert.match(WIN, /const MAX_BUSY = 36;/u, "vẫn phải chịu ~3 phút bận trước khi kết luận kẹt");
  assert.match(WIN, /refused = code === "ECONNREFUSED"/u, "chỉ cổng bị TỪ CHỐI mới đếm là chết");
});

test("2 the window ITSELF records the ledger and closes the old window - it does not depend on the caller", () => {
  assert.match(WIN, /function claimSingleWindow\(file: string\): void/u);
  assert.match(WIN, /taskkill/u, "phải đóng được cửa sổ cũ trên Windows");
  assert.match(WIN, /IMAGENAME eq \$\{image\}/u, "lọc theo tên ảnh — pid được hệ dùng lại thì thành vô hại");
  assert.match(WIN, /function releaseWindow\(file: string \| null\)/u, "đóng thì phải xoá tên khỏi sổ");
  // Đường sổ phải có ba đường lấy, để mọi lối mở đều ghi được.
  assert.match(WIN, /process\.argv\[4\]/u);
  assert.match(WIN, /ZEMORY_WINDOW_PID/u);
  assert.match(WIN, /WEBVIEW2_USER_DATA_FOLDER/u);
});

test("3 `ui.ts` passes the ledger path down to the window (both as an argument and through env)", () => {
  assert.match(UI, /\[script, url, appIcon\(\), windowPidFile\(\)\]/u, "đối số thứ 4 = đường sổ");
  assert.match(UI, /ZEMORY_WINDOW_PID: windowPidFile\(\)/u, "và env cho đường lui");
  // Vế CŨ vẫn phải còn: daemon đóng cửa sổ trước khi mở cái mới (hai lớp, không bỏ lớp nào).
  assert.match(UI, /function openWindow\(url: string\): void \{\s*\n\s*closePrevWindow\(\);/u);
});

test("4 the ledger is written AFTER the window is up, not before", () => {
  // Dựng hỏng ⇒ `ui.ts` rơi về `msedge --app`; một cái sổ trỏ tới tiến trình vừa chết chỉ làm lượt
  // mở sau đi giết nhầm một pid đã được hệ dùng lại.
  const i = WIN.indexOf("win.loadUrl(url);");
  const j = WIN.indexOf("claimSingleWindow(pidFile)");
  assert.ok(i > 0 && j > i, "phải ghi sổ sau `win.loadUrl`");
});
