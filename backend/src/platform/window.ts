// Native desktop window (§4 native desktop · plan 14 §6.E) — hosts the cockpit UI
// in a webview window that OWNS the Z icon, so the taskbar shows Zemory instead of
// the browser's own icon (msedge --app cannot override its taskbar icon). Uses
// @nativewindow/webview (MIT, wry+tao — WebView2 on Windows) as an OPTIONAL dep.
//
// Standalone entry: the daemon spawns `node dist/platform/window.js <url> <icon>`.
// FAIL-OPEN (HP điều 9): ANY failure exits non-zero and ui.ts falls back to
// `msedge --app`, so a missing prebuilt binary / no WebView2 never breaks "open
// the UI" — it just loses the custom icon.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * MỘT APP = MỘT CỬA SỔ (user chốt 2026-09-12: *"mở app lại mà app UI cũ vẫn còn, không biết cái nào
 * mới đúng"*).
 *
 * Sổ đăng ký là MỘT file `<kho>/cockpit/window.pid`. Trước đây **chỉ `ui.ts` ghi** nó lúc spawn, nên
 * cửa sổ mở bằng đường khác (lối tắt, tray, gõ tay) KHÔNG được ghi sổ ⇒ lượt mở sau không biết mà
 * đóng. Nay CHÍNH CỬA SỔ tự ghi sổ: nó đóng cửa sổ cũ còn ghi trong sổ rồi mới ghi tên mình vào.
 * Ai mở cũng vậy, không phụ thuộc người gọi nhớ làm đúng.
 *
 * Đường sổ: đối số thứ 4 → env `ZEMORY_WINDOW_PID` → suy từ `WEBVIEW2_USER_DATA_FOLDER`
 * (`ui.ts` trỏ nó vào `<kho>/cockpit/webview`, nên thư mục cha chính là `<kho>/cockpit`).
 */
function pidFilePath(): string | null {
  const fromArg = process.argv[4];
  if (fromArg) return fromArg;
  const fromEnv = process.env.ZEMORY_WINDOW_PID;
  if (fromEnv) return fromEnv;
  const wv = process.env.WEBVIEW2_USER_DATA_FOLDER;
  return wv ? join(dirname(wv), "window.pid") : null;
}

/** Đóng cửa sổ đang ghi trong sổ (nếu có) rồi ghi tên mình vào. Best-effort — không bao giờ
 *  chặn việc mở cửa sổ mới (fail-open, HP điều 9). */
function claimSingleWindow(file: string): void {
  try {
    if (existsSync(file)) {
      const [pidRaw, image = ""] = readFileSync(file, "utf8").trim().split("|");
      const prev = Number(pidRaw);
      if (Number.isInteger(prev) && prev > 0 && prev !== process.pid) {
        if (process.platform === "win32") {
          const args = ["/F", "/T", "/FI", `PID eq ${prev}`];
          // Lọc theo TÊN ẢNH để một pid đã được hệ dùng lại thành vô hại thay vì bị giết oan.
          if (image) args.push("/FI", `IMAGENAME eq ${image}`);
          try { spawn("taskkill", args, { stdio: "ignore" }).unref(); } catch { /* đã tắt */ }
        } else {
          try { process.kill(prev); } catch { /* đã tắt */ }
        }
      }
    }
  } catch {
    /* sổ hỏng/không đọc được — cứ mở cửa sổ mới */
  }
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${process.pid}|${basename(process.execPath)}|Zemory`);
  } catch {
    /* không ghi được sổ thì lượt sau không đóng được — vẫn hơn là không mở nổi cửa sổ */
  }
}

/** Xoá tên mình khỏi sổ khi đóng — để lượt mở sau không đi giết một pid đã chết (hoặc pid được
 *  hệ dùng lại cho tiến trình khác). */
function releaseWindow(file: string | null): void {
  if (!file) return;
  try {
    if (!existsSync(file)) return;
    const [pidRaw] = readFileSync(file, "utf8").trim().split("|");
    if (Number(pidRaw) === process.pid) rmSync(file, { force: true });
  } catch {
    /* ignore */
  }
}

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
  // Ghi sổ SAU khi cửa sổ dựng được: hỏng trước đó thì `ui.ts` rơi về `msedge --app`, và một cái
  // sổ trỏ tới tiến trình vừa chết chỉ làm lượt mở sau đi giết nhầm.
  const pidFile = pidFilePath();
  if (pidFile) claimSingleWindow(pidFile);
  win.onClose(() => {
    releaseWindow(pidFile);
    process.exit(0);
  });
  const bye = (): void => {
    releaseWindow(pidFile);
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
  // 🔴 BÁM THEO ĐÚNG TIẾN TRÌNH DAEMON, KHÔNG PHẢI CỔNG (vá 2026-09-12).
  //
  // Nhịp tim cũ chỉ hỏi *"cổng 4444 còn trả lời không"* — mà một daemon MỚI cũng nghe đúng cổng đó.
  // Nên khi daemon bị tắt rồi bật lại (mỗi lần build là một lần như vậy), cửa sổ CŨ thấy ping vẫn
  // OK ⇒ sống tiếp, trong khi daemon mới mở thêm cửa sổ của nó. Kết quả: HAI cửa sổ cùng "chạy
  // được", người dùng không biết cái nào là bản mới — user báo đúng ca này 2026-09-12.
  // `/ping` vốn đã trả `pid` của daemon, nên chỉ cần nhớ nó: pid đổi = nền đã bị thay ⇒ cửa sổ này
  // là vỏ của một nền không còn tồn tại ⇒ tự đóng. Đây cũng chính là luật §Bề mặt CHẾT THEO nền,
  // chỉ là đo cho đúng thứ cần đo.
  let daemonPid: number | null = null;
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
        if (alive) {
          const body = (await res.json().catch(() => null)) as { pid?: unknown } | null;
          const pid = typeof body?.pid === "number" ? body.pid : null;
          if (pid !== null) {
            if (daemonPid === null) daemonPid = pid;
            else if (pid !== daemonPid) {
              console.error(`[zemory window] daemon đã được thay (pid ${daemonPid} → ${pid}) — cửa sổ này thuộc bản cũ, tự đóng`);
              clearInterval(beat);
              bye();
              return;
            }
          }
        }
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
