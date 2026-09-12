// Claude Desktop bản MSIX (cài từ Microsoft Store) CHUYỂN HƯỚNG AppData.
//
// Sự cố (đo 2026-08-27): trên một máy ĐANG CHẠY Claude Desktop, `zemory setup mcp` báo
// "chưa cài claude-desktop". Tiến trình thật chạy từ
// `C:\Program Files\WindowsApps\Claude_1.37937.1.0_x64__pzs8sxrjxfjjc\app\Claude.exe`, còn config
// nằm ở `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\` — không phải
// `%APPDATA%\Claude\` như bảng đích đang ghim. Gói MSIX chạy trong container nên mọi phép ghi
// vào `%APPDATA%` bị lái sang `LocalCache\Roaming`.
//
// Cái giá KHÔNG phải một dòng báo sai: user kết luận "Desktop không đọc được kho" rồi đi dựng
// hẳn một bộ template riêng cho máy ảo. Một đường dẫn sai đẻ ra một kiến trúc thừa.
//
// Cổng này soi HÀNH VI của bảng đích (`agentTargets`) trên một HOME giả, không soi chữ trong mã.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tempDir } from "./helpers.mjs";

const { agentTargets } = await import("../../dist/mcpsetup.js");

/** Dựng một HOME giả có bản MSIX, rồi đọc bảng đích dưới HOME đó. */
function withFakeHome(t, { msixPkg = null, plainAppData = false } = {}) {
  const home = tempDir(t, "zemory-msix-");
  const save = { ...process.env };
  process.env.LOCALAPPDATA = join(home, "AppData", "Local");
  process.env.APPDATA = join(home, "AppData", "Roaming");
  process.env.USERPROFILE = home;
  process.env.HOME = home;
  t.after(() => {
    for (const k of ["LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME"]) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });

  if (msixPkg) {
    const dir = join(process.env.LOCALAPPDATA, "Packages", msixPkg, "LocalCache", "Roaming", "Claude");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "claude_desktop_config.json"), JSON.stringify({ preferences: {} }), "utf8");
  }
  if (plainAppData) mkdirSync(join(process.env.APPDATA, "Claude"), { recursive: true });

  return agentTargets(home).find((a) => a.id === "claude-desktop");
}

const isWin = process.platform === "win32";

test(
  "the MSIX build: the target table must POINT at LocalCache\\Roaming, not %APPDATA%",
  { skip: isWin ? false : "đường MSIX chỉ có trên Windows" },
  (t) => {
    const target = withFakeHome(t, { msixPkg: "Claude_pzs8sxrjxfjjc" });

    assert.ok(target.path, "máy có bản MSIX mà bảng đích trả null = đúng lỗi 27/08");
    assert.match(
      target.path.replace(/\\/g, "/"),
      /Packages\/Claude_pzs8sxrjxfjjc\/LocalCache\/Roaming\/Claude\/claude_desktop_config\.json$/,
      "phải chọn đúng file MSIX đang tồn tại",
    );
  },
);

test(
  "the PackageFamilyName suffix must NOT be hardcoded - a new release channel changes the publisher code",
  { skip: isWin ? false : "đường MSIX chỉ có trên Windows" },
  (t) => {
    // Mã khác hẳn máy đã đo. Ghim cứng `pzs8sxrjxfjjc` thì ca này trượt.
    const target = withFakeHome(t, { msixPkg: "Claude_9zz9zzz9zzz9z" });
    assert.ok(target.path, "dò theo tiền tố `Claude_` mới phủ được mọi kênh phát hành");
    assert.match(target.path.replace(/\\/g, "/"), /Packages\/Claude_9zz9zzz9zzz9z\//);
  },
);

test(
  "MSIX takes priority OVER %APPDATA% when a machine has both",
  { skip: isWin ? false : "đường MSIX chỉ có trên Windows" },
  (t) => {
    // Có cả hai ⇒ phải chọn MSIX: đó mới là chỗ app THẬT SỰ đọc. Ghi vào %APPDATA% là ghi vào
    // hư không — app không bao giờ nạp file đó, mà lệnh vẫn báo "đã ghi xong".
    const target = withFakeHome(t, { msixPkg: "Claude_pzs8sxrjxfjjc", plainAppData: true });
    assert.match(target.path.replace(/\\/g, "/"), /Packages\/Claude_pzs8sxrjxfjjc\//);
  },
);

test("a machine WITHOUT the MSIX build still falls back to the %APPDATA% path (the normal install is not broken)", (t) => {
  const target = withFakeHome(t, { plainAppData: true });
  assert.ok(target.path, "bản cài thường phải còn dùng được");
  assert.doesNotMatch(target.path.replace(/\\/g, "/"), /Packages\//);
});

test("with no Claude Desktop of any kind the path is null - never a guessed path", (t) => {
  const target = withFakeHome(t, {});
  assert.equal(target.path, null, "chưa cài mà trả đường dẫn là đẻ file cấu hình ma");
});
