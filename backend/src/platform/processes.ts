// SỔ TIẾN TRÌNH — mọi tiến trình app này sinh ra, khai một chỗ.
//
// Vì sao là MÃ chứ không phải một trang docs (`app-design` §B1 đòi "phải có sổ liệt kê"): sổ viết
// tay trôi khỏi thực tế ngay lượt ai đó thêm một `spawn` mà quên ghi — và không gì kêu. Ở đây nó
// là dữ liệu, nên cổng `process-ledger` đối chiếu được **sổ** với **số nơi spawn thật trong mã**;
// thêm tiến trình mà không khai ⇒ gate ĐỎ.
//
// Ca thật đẻ ra sổ này (user báo 2026-09-16): `tray_windows_release.exe` đứng lẻ trên Task Manager
// suốt gần hai tháng. Đo lại thì nó KHÔNG mồ côi — nó là con của daemon, nên tab Processes đã gom
// đúng; thứ lộ ra là **cái tên của thư viện** ở tab Details. Không ai biết vì không có chỗ nào khai
// "app này sinh ra những tiến trình nào".

/** Một tiến trình app có thể sinh ra. */
export interface AppProcess {
  /** Tên HIỆN RA trên bảng tiến trình của HĐH. */
  shownAs: string;
  /** File mã phóng nó. */
  spawnedBy: string;
  /** Sống bao lâu: cùng daemon · một lượt việc · cho tới khi người dùng đóng. */
  lifetime: "daemon" | "job" | "window" | "oneshot";
  /** Ẩn cửa sổ console chưa (`app-design` §B2). */
  hidden: boolean;
  note: string;
}

/**
 * ⚠ THÊM MỘT `spawn` MỚI LÀ PHẢI THÊM MỘT DÒNG Ở ĐÂY. Cổng đối chiếu số nơi spawn trong
 * `backend/src/` với `spawnSites` bên dưới — lệch là đỏ, kể cả khi tiến trình mới chạy đúng.
 */
export const APP_PROCESSES: AppProcess[] = [
  {
    shownAs: "zemory.exe",
    spawnedBy: "platform/autostart.ts · launch.vbs",
    lifetime: "daemon",
    hidden: true,
    note: "Chính daemon. Là `node.exe` đã đổi tên lúc build (`scripts/make-exe.mjs`) để Task Manager không gộp vào 'Node.js'.",
  },
  {
    shownAs: "zemory.exe (con)",
    spawnedBy: "jobs/scheduler.ts · jobs/searchjob.ts · jobs/statsjob.ts · jobs/syncjob.ts · tools/index.ts",
    lifetime: "job",
    hidden: true,
    note: "Việc nặng (scan · embed · digest · sync · stats) chạy ở tiến trình con ưu tiên thấp — không bao giờ trên vòng lặp sự kiện của daemon.",
  },
  {
    shownAs: "msedgewebview2.exe / <trình duyệt>",
    spawnedBy: "ui.ts · platform/window.ts",
    lifetime: "window",
    hidden: true,
    note: "Cửa sổ app. `windowsHide` chỉ chặn console của Node; cửa sổ GUI là thứ người dùng cần thấy.",
  },
  {
    shownAs: "zemory-tray.exe",
    spawnedBy: "platform/tray-client.ts",
    lifetime: "daemon",
    hidden: true,
    note:
      "Icon khay. Nhị phân Go của `systray2` (MIT, không sửa) được CHÉP sang tên của app lúc build " +
      "(`scripts/make-exe.mjs › brandTrayBinary`), còn phần phóng + nói giao thức là mã của mình — vì " +
      "thư viện khoá cứng tên `tray_windows_release.exe`. Thiếu bản đổi tên ⇒ rơi về nhị phân gốc.",
  },
  {
    shownAs: "<trình duyệt> (brave/chrome)",
    spawnedBy: "memory/scanweb.ts",
    lifetime: "oneshot",
    hidden: true,
    note: "Cửa sổ khe đăng nhập để kéo hội thoại web. Người dùng đăng nhập trên trang thật; zemory chỉ mượn phiên.",
  },
  {
    shownAs: "taskkill.exe",
    spawnedBy: "ui.ts · platform/window.ts",
    lifetime: "oneshot",
    hidden: true,
    note: "Đóng cửa sổ app còn sót. Chớp tắt ngay; `windowsHide` để nó không nháy một console đen.",
  },
  {
    shownAs: "zemory-updater-<pid>.exe (thư mục tạm)",
    spawnedBy: "ui.ts → backend/scripts/selfupdate-run.mjs",
    lifetime: "oneshot",
    hidden: true,
    note: "Người thợ dựng lại bản cài khi bấm “Cập nhật ngay”. Là BẢN CHÉP của daemon đặt ngoài `dist/` — chạy thẳng từ `dist/` thì nó tự khoá đúng thư mục nó sắp xoá (EPERM, đo 2026-09-18). Sống lâu hơn daemon đúng một lượt: daemon thoát để nhả khoá, nó dựng xong rồi phóng daemon mới và tự xoá bản chép.",
  },
];

/**
 * Số nơi gọi `spawn(` trong `backend/src/` mà sổ trên đã phủ.
 *
 * Con số này là DÂY NỐI giữa sổ và mã: cổng đếm số nơi spawn thật rồi so với đây. Thêm một nơi
 * spawn mà không cập nhật cả hai ⇒ đỏ. Cố tình để là SỐ chứ không phải danh sách đường dẫn —
 * đường dẫn đổi theo mỗi lần dời file, còn "có bao nhiêu chỗ phóng tiến trình" thì không.
 */
export const spawnSites = 14;
