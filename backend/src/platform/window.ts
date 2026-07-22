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
}

main().catch((error) => {
  console.error("[zemory window] native webview unavailable:", error instanceof Error ? error.message : error);
  process.exit(3);
});
