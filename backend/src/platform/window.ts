// Native desktop window (§4 native desktop · plan 14 §6.E) — hosts the cockpit UI
// in a webview window that OWNS the Z icon, so the taskbar shows Zemory instead of
// the browser's own icon (msedge --app cannot override its taskbar icon). Uses
// @nativewindow/webview (MIT, wry+tao — WebView2 on Windows) as an OPTIONAL dep.
//
// Standalone entry: the daemon spawns `node dist/platform/window.js <url> <icon>`.
// FAIL-OPEN (HP điều 9): ANY failure exits non-zero and ui.ts falls back to
// `msedge --app`, so a missing prebuilt binary / no WebView2 never breaks "open
// the UI" — it just loses the custom icon.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const url = process.argv[2];
  const icon = process.argv[3];
  if (!url) {
    process.exit(2);
    return;
  }

  // Windows taskbar: without an explicit AppUserModelID the button shows node.exe's
  // icon (a green cube), NOT the window's — setIcon only fixes the title bar. Set one
  // BEFORE any window/COM call so the taskbar uses our Z icon. Best-effort: koffi is
  // an optional dep; if it (or the call) fails the window still opens.
  if (process.platform === "win32") {
    try {
      const koffi = (await import("koffi")).default;
      const shell32 = koffi.load("shell32.dll");
      const setAumid = shell32.func("SetCurrentProcessExplicitAppUserModelID", "long", ["str16"]);
      setAumid("Zemory.Cockpit");
    } catch {
      /* no koffi / call failed — the window still opens, just with the default icon */
    }
  }

  // WebView2's user-data folder defaults NEXT TO node.exe (Program Files →
  // read-only → "Access is denied"). Point it at a writable dir before the native
  // module initializes WebView2.
  if (!process.env.WEBVIEW2_USER_DATA_FOLDER) {
    process.env.WEBVIEW2_USER_DATA_FOLDER = join(
      process.env.LOCALAPPDATA ?? dirname(fileURLToPath(import.meta.url)),
      "zemory",
      "webview",
    );
  }
  try {
    mkdirSync(process.env.WEBVIEW2_USER_DATA_FOLDER, { recursive: true });
  } catch {
    /* WebView2 will create it if the parent is writable */
  }

  const { NativeWindow } = await import("@nativewindow/webview");
  // `new NativeWindow` auto-initializes the native subsystem and pumps events, so
  // the process stays alive until the window closes.
  const win = new NativeWindow({ title: "Zemory", width: 1320, height: 920, minWidth: 900, minHeight: 600 });
  if (icon) {
    try {
      win.setIcon(icon);
    } catch {
      /* icon is best-effort; the window still opens */
    }
  }
  win.loadUrl(url);
  win.onClose(() => process.exit(0));
  const bye = (): void => {
    try {
      win.close();
    } catch {
      /* already gone */
    }
    process.exit(0);
  };
  process.on("SIGTERM", bye);
  process.on("SIGINT", bye);

  // NHỊP TIM — cửa sổ KHÔNG được sống lâu hơn daemon (user chốt 2026-08-10).
  //
  // Ca thật: daemon chết lúc nào không rõ, cửa sổ vẫn mở nguyên và hiển thị ảnh chụp
  // cuối cùng. Mọi nút bấm từ đó gửi request vào chỗ trống ⇒ vòng xoay "đang sync…"
  // quay MÃI MÃI. User đọc thành "sync bị kẹt" và chờ hàng giờ — trong khi thực tế
  // không có gì đang chạy cả. Vỏ rỗng trông y như đang sống là kiểu hỏng TỆ NHẤT:
  // nó không báo lỗi, nó nói dối.
  //
  // Chịu lỗi có chủ đích: chỉ đếm SAU khi đã thấy daemon sống ít nhất một lần (đừng
  // giết cửa sổ lúc daemon còn đang khởi động), và phải trượt LIÊN TIẾP `MAX_MISS`
  // lần mới đóng — daemon bận một nhịp (quét/embed) không phải là chết.
  const HEARTBEAT_MS = 5000;
  const MAX_MISS = 3; // ~15 s cổng ĐÓNG liên tiếp mới coi là chết
  // 🔴 BẬN ≠ CHẾT (2026-08-28). Bản cũ gộp mọi lỗi thành một bộ đếm, nên daemon còn sống
  // nhưng đang nghẽn cũng bị tính là chết sau 15 s — mà đo được ngay sau khởi động `/ping`
  // nghẽn **12,3 s** (embed + `/memory-status` lượt lạnh khoá event loop), tức cửa sổ có thể
  // tự đóng đúng lúc daemon đang khởi động bận nhất. User: *"app UI lâu lâu cứ tự ẩn trong
  // khi t ko làm gì hết"*. Nay tách hai bộ đếm theo THỨ ĐO ĐƯỢC:
  //   · cổng bị TỪ CHỐI (ECONNREFUSED) ⇒ tiến trình không còn nghe ⇒ đếm CHẾT, 3 nhịp;
  //   · HẾT GIỜ (timeout) ⇒ tiến trình còn nghe nhưng bận ⇒ đếm BẬN, chịu tới ~3 phút.
  // 3 phút là mốc "kẹt thật" chứ không phải "đang bận": nghẽn dài nhất đo được là 12 s, còn
  // job nặng thì chạy ở tiến trình CON nên không khoá event loop của daemon.
  const MAX_BUSY = 36; // 36 × 5 s = 3 phút hết giờ liên tiếp
  let seenAlive = false;
  let miss = 0;
  let busy = 0;
  const beat = setInterval(() => {
    void (async () => {
      let alive = false;
      let refused = false;
      try {
        // 20 s chứ không phải 3 s (user 2026-08-30: *"đang sync mà sao UI tự tắt?"*): daemon gánh
        // sync+embed trả `/ping` trong **12–16 s** (đo cùng ngày) — chờ 3 s thì NHỊP NÀO CŨNG hết
        // giờ, 36 nhịp × 5 s = 3 phút là cửa sổ tự đóng giữa một lượt sync 40 phút, trong khi daemon
        // SỐNG và đang làm việc. BẬN ≠ CHẾT (02_RULES §Bề mặt chết theo nền): vỏ rỗng thật (treo
        // cứng, không trả nổi byte nào trong 20 s × 36 nhịp) vẫn bị giết như cũ.
        const res = await fetch(new URL("/ping", url), { signal: AbortSignal.timeout(20_000) });
        alive = res.ok;
      } catch (e) {
        // undici bọc lỗi socket trong `cause`; hết giờ là TimeoutError/AbortError không có cause.
        const code = (e as { cause?: { code?: string } })?.cause?.code ?? "";
        refused = code === "ECONNREFUSED" || code === "ECONNRESET";
      }
      if (alive) {
        seenAlive = true;
        miss = 0;
        busy = 0;
        return;
      }
      if (!seenAlive) return; // chưa từng thấy sống ⇒ đang khởi động, chờ tiếp
      if (refused) {
        if (++miss < MAX_MISS) return;
        console.error(`[zemory window] cổng daemon bị từ chối ${MAX_MISS} nhịp liên tiếp — daemon đã tắt, đóng cửa sổ`);
      } else {
        if (++busy < MAX_BUSY) return;
        console.error(`[zemory window] daemon không trả lời ${MAX_BUSY} nhịp liên tiếp (~3 phút) — coi là kẹt, đóng cửa sổ`);
      }
      clearInterval(beat);
      bye();
    })();
  }, HEARTBEAT_MS);
  beat.unref?.(); // đừng giữ tiến trình sống chỉ vì cái hẹn giờ này
}

main().catch((error) => {
  console.error("[zemory window] native webview unavailable:", error instanceof Error ? error.message : error);
  process.exit(3);
});
