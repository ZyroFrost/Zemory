// Start-with-OS integration (plan 14 §B). We can only safely exercise the
// current platform's path; the test points HOME/APPDATA at a temp dir so it never
// touches the real Startup folder / LaunchAgents / autostart.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import test from "node:test";
import { tempDir } from "./helpers.mjs";

/** Thân của một hàm trong file FE, cắt theo RANH GIỚI HÀM kế tiếp — không phải theo số ký tự.
 *  Bản đầu của hai ca dưới cắt cứng 1600/2200 ký tự: thân `offerShortcut` dài 2.323, nên cửa sổ
 *  hụt đúng 123 ký tự cuối và ca "không được return true" **không bắt được đột biến**. Một cổng
 *  soi chữ mà cắt hụt vùng soi là cổng XANH GIẢ — tệ hơn không có cổng. */
function feFunctionBody(src, name) {
  const i = src.indexOf(`function ${name}`);
  assert.ok(i >= 0, `phải tìm được ${name} trong file FE`);
  const next = src.indexOf("\n  function ", i + 1);
  return src.slice(i, next > 0 ? next : src.length);
}

function sandboxHome(t) {
  const home = tempDir(t, "zemory-autostart-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.XDG_CONFIG_HOME = home;
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });
  return home;
}

test("enable creates an OS autostart entry; disable removes it; status tracks it", async (t) => {
  sandboxHome(t);
  const { autostartStatus, setAutostart } = await import("../../dist/platform/autostart.js");
  const before = autostartStatus();
  if (!before.supported) {
    // Unknown OS — just assert it fails open, don't force a mechanism.
    assert.equal(before.enabled, false);
    return;
  }
  assert.equal(before.enabled, false, "starts disabled");

  const on = setAutostart(true);
  assert.equal(on.enabled, true, "enabled after setAutostart(true)");
  assert.ok(on.path && existsSync(on.path), "the OS entry file exists on disk");

  assert.equal(autostartStatus().enabled, true, "status reflects enabled");

  const off = setAutostart(false);
  assert.equal(off.enabled, false, "disabled after setAutostart(false)");
  assert.ok(!on.path || !existsSync(on.path), "the OS entry file is gone");
});

// Regression 2026-08-05: `desktopDir()` hardcoded <home>\Desktop, but company
// Windows REDIRECTS Desktop into OneDrive and then <home>\Desktop does not exist —
// writing the .lnk threw DirectoryNotFoundException, and because Desktop was written
// FIRST the Start Menu entry was never attempted either. Read-only on purpose: it
// resolves the path, it must not create anything.
test("the Desktop shortcut resolves to a folder that actually EXISTS", async () => {
  if (platform() !== "win32") return;
  const { desktopShortcutStatus } = await import("../../dist/platform/autostart.js");
  const { dirname } = await import("node:path");
  const st = desktopShortcutStatus();
  assert.ok(st.path, "a shortcut path is resolved");
  assert.ok(existsSync(dirname(st.path)), `Desktop folder must exist, got ${dirname(st.path)}`);
});

// Neo vào `.vbs`, KHÔNG phải `.cmd`. Đổi từ 2026-08-10 và là bản vá GỐC của vụ "daemon chết
// không lời trăng trối": `start "" /b` trong .cmd KHÔNG tách tiến trình — daemon chạy trong
// cùng console nên console đóng là bị `TerminateProcess`, không handler nào kịp chạy. Bản .vbs
// dùng `WshShell.Run(cmd, 0, False)` sinh tiến trình MỒ CÔI, sống độc lập.
//
// Test này neo `.cmd` tới tận 11/08 mới lộ, vì gate không chạy được từ ~05/08 (hook bật chặn).
// Bài học: ĐỔI CÁCH LÀM thì phải ĐỔI NEO TEST trong cùng thay đổi — không thì cổng canh một
// bản đã chết, và nó sẽ đỏ oan đúng lúc người ta cần nó nói thật.
test("the Windows entry, when on this OS, is a Startup .vbs that launches `ui` detached", async (t) => {
  if (platform() !== "win32") return;
  sandboxHome(t);
  const { setAutostart } = await import("../../dist/platform/autostart.js");
  const { readFileSync } = await import("node:fs");
  const st = setAutostart(true);
  assert.match(st.path, /Startup[\\/]zemory\.vbs$/, "entry is a Startup .vbs");
  assert.equal(st.method, "startup-vbs", "method phải nói đúng cơ chế đang dùng");
  const body = readFileSync(st.path, "utf8");
  // Nháy ĐÔI-ĐÔI: trong VBS mỗi `"` của lệnh phải viết thành `""`, nên chuỗi thật là
  // `…cli.js"" ui`. Mẫu cũ (`cli\.js" ui`) hợp với .cmd chứ không hợp .vbs.
  assert.match(body, /cli\.js"{1,2} ui/, "the .vbs launches the zemory UI daemon");
  // Neo vào THỨ QUYẾT ĐỊNH, không neo vào tên biến (bản thật đặt là `sh`): phải gọi qua
  // WScript.Shell và tham số cuối phải là `False` — đó chính là chỗ KHÔNG chờ tiến trình con,
  // tức thứ làm daemon sống mồ côi. Đổi `False` thành `True` là quay lại đúng con bug cũ.
  assert.match(body, /WScript\.Shell/i, "phải dùng WScript.Shell");
  assert.match(body, /\.Run\b[^\n]*,\s*0,\s*False/i, "phải Run(..., 0, False) — cửa TÁCH tiến trình");
  setAutostart(false);
});

// ── LỐI TẮT LÚC CÀI (user chốt 2026-09-15: "khi cài phải hỏi luôn") ──────────
//
// Vì sao có cổng này: chức năng tạo mục Start Menu ĐÃ TỒN TẠI từ lâu và chạy đúng, nhưng bề
// mặt duy nhất nói về nó là nhãn *"Lối tắt Desktop"* — không chỗ nào nhắc Start Menu. User đọc
// thành "zemory chưa có chức năng này". Một năng lực không ai biết thì bằng không có, nên thứ
// phải canh ở đây là **bề mặt có KỂ ĐỦ hai đích không**, không phải "code có chạy không".
test("trạng thái lối tắt kể RIÊNG từng đích — không gộp thành một chữ 'đã có'", async () => {
  if (platform() !== "win32") return;
  const { desktopShortcutStatus } = await import("../../dist/platform/autostart.js");
  const st = desktopShortcutStatus();
  for (const [name, tgt] of [["startMenu", st.startMenu], ["desktop", st.desktop]]) {
    assert.ok(tgt && typeof tgt.path === "string" && tgt.path, `${name} phải khai đường đích của nó`);
    assert.equal(typeof tgt.exists, "boolean", `${name} phải tự khai có hay không`);
    assert.equal(tgt.exists, existsSync(tgt.path), `${name}: lời khai phải khớp ĐĨA, không phải đích kia`);
  }
  // `exists` tổng chỉ là tiện ích "có ít nhất một" — nó KHÔNG được dùng để nói về một đích cụ thể.
  assert.equal(st.exists, st.startMenu.exists || st.desktop.exists);
});

test("lời mời lúc cài phải nêu ĐÍCH DANH cả hai đích, ở CẢ HAI ngôn ngữ", async () => {
  const { readFileSync } = await import("node:fs");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  // Đủ cặp khoá ở cả hai từ điển — thiếu một đầu thì người đổi ngôn ngữ vẫn thấy tiếng cũ mà
  // không lỗi nào nổ (`02_RULES` §Song ngữ ĐỦ HAI ĐẦU).
  for (const key of ["sc.title", "sc.intro", "sc.menu", "sc.desk", "sc.note", "sc.create", "sc.skip", "sc.have"]) {
    const n = chrome.split(`'${key}':`).length - 1;
    assert.equal(n, 2, `khoá ${key} phải có ở ĐÚNG hai từ điển, đếm được ${n}`);
  }
  // Nhãn công tắc phải nói ra Start Menu — đây chính là chữ đã làm user tưởng chức năng không tồn tại.
  assert.ok(/'set\.shortcut':'[^']*Start Menu/.test(chrome), "nhãn công tắc (vi) phải nêu Start Menu");
  assert.equal((chrome.match(/'set\.shortcut':'[^']*Start Menu/g) || []).length, 2, "cả hai từ điển đều phải nêu Start Menu");
});

test("hộp mời chỉ hiện khi CHƯA hỏi, và đóng dấu 'đã hỏi' ngay lúc hiện", async () => {
  const { readFileSync } = await import("node:fs");
  const js = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  assert.ok(/a\.shortcutPrompted/.test(js), "phải đọc cờ đã-hỏi từ server, không tự đoán");
  // 🔴 Đóng dấu lúc HIỆN, không phải lúc đóng: `zDialog` không có móc onCancel, nên đóng bằng
  // X/nền/ESC sẽ không chạy gì ⇒ hộp mời lại MỖI LẦN mở app. Neo vào đúng chỗ đó.
  const body = feFunctionBody(js, "offerShortcut");
  assert.ok(body.indexOf("/shortcut-asked") < body.indexOf("zDialog("), "phải POST /shortcut-asked TRƯỚC khi mở hộp");
  // Neo vào KHOÁ tuỳ chọn `onCancel:`, không phải chữ "onCancel" — chú thích ngay trên cũng
  // nhắc tên đó, mà bắt cả chú thích là cổng báo oan ngay trên file dạy về chính nó.
  assert.equal(/onCancel\s*:/.test(body), false, "đừng dựa vào onCancel — zDialog không gọi nó");
});

test("nút hộp mời phải ĐÓNG hộp — `onOk` trả true là giữ hộp mở, trông y như treo", async () => {
  const { readFileSync } = await import("node:fs");
  const js = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const body = feFunctionBody(js, "offerShortcut");
  // Ca thật 2026-09-15: bản đầu chép khuôn `return true` từ hộp cập nhật (hộp đó CỐ Ý ở lại để
  // in tiến độ). Ở đây việc chạy ở nền, nên hộp phải đóng ngay — user báo đúng triệu chứng:
  // *"có kẹt gì ko bấm ko dc?"*. Không cổng nào nổ, không lỗi nào hiện: chỉ người dùng thấy.
  assert.equal(/return true;/.test(body), false, "onOk KHÔNG được trả true — hộp phải đóng sau cú bấm");
});
