// CLIENT KHAY CỦA MÌNH — để tiến trình khay mang TÊN CỦA APP.
//
// 🔴 Vì sao không dùng thẳng `systray2` nữa (user chốt 2026-09-16, `app-design` §B1): thư viện đó
// **khoá cứng tên nhị phân** — `getTrayBinPath()` ghép tên `tray_windows_release.exe` rồi tìm ở
// `./traybin/` hoặc trong chính package, không có tuỳ chọn đổi. Hệ quả: trên bảng tiến trình của
// Windows (tab Details, danh sách phẳng) app hiện ra một dòng mang tên của THƯ VIỆN, trong khi
// `node.exe` đã được đổi thành `zemory.exe` ngay từ đầu. Đổi một nửa còn tệ hơn không đổi: người
// đọc tưởng đã gom đủ. Đo 2026-09-16: nó KHÔNG mồ côi (là con của daemon), nhưng tên thì lộ.
//
// Thứ ta thay chỉ là **cách phóng**: nhị phân Go vẫn là của `systray2` (MIT), chỉ được chép sang
// `dist/zemory-tray[.exe]` lúc build (`scripts/make-exe.mjs`) — cùng thủ thuật đã dùng cho
// `zemory.exe`. KHÔNG chép mã nguồn của họ vào `backend/` (HP điều 2); phần dưới đây là client của
// mình, viết theo giao thức quan sát được:
//   ① phóng nhị phân, không tham số, `windowsHide`;
//   ② đọc stdout theo DÒNG, mỗi dòng là một JSON;
//   ③ nhận `{type:"ready"}` ⇒ ghi MỘT dòng JSON mô tả menu vào stdin;
//   ④ nhận `{type:"clicked", __id}` ⇒ tra `__id` ra mục đã khai.
// `__id` do phía ta đánh số 1..n theo thứ tự duyệt (đúng như `addInternalId` của họ).
//
// Fail-open (điều 9): mọi trục trặc ⇒ không có icon khay, daemon chạy y như cũ.

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { platform } from "node:os";
import { fileURLToPath } from "node:url";

export interface TrayMenuItem {
  title: string;
  tooltip?: string;
  enabled?: boolean;
  /** Bấm vào thì chạy gì. Mục ngăn cách không có. */
  onClick?: () => void;
}

export interface TrayMenu {
  /** Ảnh icon dạng base64 — ICO cho Windows, PNG cho macOS/Linux. */
  icon: string;
  title: string;
  tooltip: string;
  isTemplateIcon?: boolean;
  items: TrayMenuItem[];
}

/** Mục ngăn cách — đúng chuỗi mà nhị phân Go hiểu. */
export const TRAY_SEPARATOR: TrayMenuItem = { title: "<SEPARATOR>", enabled: true };

/**
 * Nhị phân khay, ưu tiên BẢN ĐÃ ĐẶT TÊN LẠI.
 *
 * Thiếu bản đổi tên (cây chưa build lại) ⇒ rơi về bản gốc trong `node_modules` để khay vẫn chạy —
 * mất cái tên đẹp còn hơn mất cái khay. Đường `node_modules` chỉ dùng làm lối lùi, không phải
 * đường chính.
 */
export function trayBinary(): string | null {
  const here = dirname(fileURLToPath(import.meta.url)); // dist/platform
  const dist = join(here, "..");
  const branded = join(dist, platform() === "win32" ? "zemory-tray.exe" : "zemory-tray");
  if (existsSync(branded)) return branded;
  const name =
    platform() === "win32" ? "tray_windows_release.exe" : platform() === "darwin" ? "tray_darwin_release" : "tray_linux_release";
  const vendor = join(dist, "..", "node_modules", "systray2", "traybin", name);
  return existsSync(vendor) ? vendor : null;
}

export interface TrayHandle {
  kill: () => void;
}

/**
 * Mở khay. Trả `null` nếu không phóng được — người gọi chỉ việc chạy tiếp.
 *
 * `onGone` bắn khi tiến trình khay chết (người dùng tắt, hoặc nó tự lỗi) để người gọi bỏ tham
 * chiếu — không có nó thì daemon giữ một cái xác và lần bật sau tưởng khay đang sống.
 */
export function openTray(menu: TrayMenu, onGone?: () => void): TrayHandle | null {
  const bin = trayBinary();
  if (!bin) return null;
  let child: ChildProcess;
  try {
    child = spawn(bin, [], { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    return null;
  }

  // Đánh số 1..n theo thứ tự duyệt — cùng quy ước với nhị phân, và là thứ `clicked.__id` trỏ về.
  const byId = new Map<number, TrayMenuItem>();
  const wire = menu.items.map((it, i) => {
    byId.set(i + 1, it);
    return {
      title: it.title,
      tooltip: it.tooltip ?? "",
      checked: false,
      enabled: it.enabled !== false,
      hidden: false,
      __id: i + 1,
    };
  });
  const payload = JSON.stringify({
    icon: menu.icon,
    title: menu.title,
    tooltip: menu.tooltip,
    isTemplateIcon: menu.isTemplateIcon === true,
    items: wire,
  });

  let done = false;
  const gone = (): void => {
    if (done) return;
    done = true;
    onGone?.();
  };
  child.on("error", gone);
  child.on("exit", gone);

  if (child.stdout) {
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      let msg: { type?: string; __id?: number };
      try {
        msg = JSON.parse(line) as { type?: string; __id?: number };
      } catch {
        return; // dòng rác — bỏ, không bao giờ ném
      }
      if (msg.type === "ready") {
        try {
          child.stdin?.write(payload + "\n");
        } catch {
          gone();
        }
        return;
      }
      if (msg.type === "clicked" && typeof msg.__id === "number") {
        try {
          byId.get(msg.__id)?.onClick?.();
        } catch {
          /* lỗi trong handler của người gọi không được giết khay */
        }
      }
    });
  }

  return {
    kill: () => {
      done = true; // tự tắt thì đừng bắn `onGone`
      try {
        child.kill();
      } catch {
        /* đã chết rồi */
      }
    },
  };
}
