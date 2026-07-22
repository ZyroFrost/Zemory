// System-tray icon (plan 14 §6.E) — the "app-like" presence the user asked for
// (like SasinFlow's tray): one icon with a menu to Open the cockpit or Quit the
// daemon. Uses systray2 (MIT), which ships a prebuilt Go helper binary per-OS —
// no node-gyp compile; license reviewed (HP điều 2). FAIL-OPEN (HP điều 9): if the
// tray can't start, the daemon runs exactly as before, just without an icon.
//
// One icon, NO "ghost" pile-up: the tray helper is a CHILD of the daemon, the
// daemon is single-instance (one per port 4444), and the helper is killed on quit
// / daemon exit — so a fresh `zemory ui` never stacks a second icon.

import { createRequire } from "node:module";
import { platform } from "node:os";

// systray2 is CJS (exports.default = the class). Under our NodeNext/ESM output a
// plain `import SysTray from "systray2"` TYPE-checks as the class but RESOLVES to
// the module namespace at runtime (the class hides behind `.default`), so
// `new SysTray()` would throw "not a constructor". Load it through createRequire
// and take `.default` — correct at both type and runtime (verified empirically).
const cjsRequire = createRequire(import.meta.url);
const SysTray = (cjsRequire("systray2") as typeof import("systray2")).default;

// zemory logo, 64px. Windows tray wants ICO; macOS/Linux want PNG. Both are the
// same glyph as the window favicon, generated from the packaging source asset.
const ICON_ICO_B64 =
  "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";
const ICON_PNG_B64 =
  "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";

export interface TrayHooks {
  /** Open (or re-open) the cockpit window. */
  onOpen: () => void;
  /** Shut the daemon down cleanly. */
  onQuit: () => void;
}

let tray: InstanceType<typeof SysTray> | null = null;

/** Start the tray. Best-effort: any failure leaves the daemon headless-but-fine. */
export function startTray(url: string, hooks: TrayHooks): void {
  if (tray) return;
  try {
    const os = platform();
    const t = new SysTray({
      menu: {
        icon: os === "win32" ? ICON_ICO_B64 : ICON_PNG_B64,
        isTemplateIcon: os === "darwin",
        title: "zemory",
        tooltip: `zemory — ${url}`,
        items: [
          { title: "Open zemory", tooltip: "Open the cockpit window", enabled: true },
          SysTray.separator,
          { title: "Quit zemory", tooltip: "Stop the background daemon", enabled: true },
        ],
      },
      debug: false,
    });
    // Everything on the instance goes through ready(): systray2 sets _process
    // only after its first await, so a synchronous onError() call here ALWAYS
    // threw (null deref) — the module ref was never stored and a helper-spawn
    // failure escaped as an unhandled rejection that KILLED the daemon, the
    // opposite of fail-open (audit 2026-07-21).
    t.ready()
      .then(() => {
        tray = t;
        try {
          t.onError(() => {
            tray = null; // helper died — drop the ref; the daemon is unaffected
          });
        } catch {
          /* keep the tray even if the error hook can't attach */
        }
      })
      .catch(() => {
        tray = null; // helper never started — headless daemon (HP điều 9)
      });
    t.onClick((action) => {
      const title = action.item.title;
      if (title === "Open zemory") {
        hooks.onOpen();
      } else if (title === "Quit zemory") {
        void t.kill(false).finally(() => hooks.onQuit());
      }
    }).catch(() => {
      /* onClick awaits ready() — a spawn failure lands here, not as a crash */
    });
  } catch {
    tray = null; // no tray — daemon still serves (HP điều 9)
  }
}

/**
 * Remove the tray icon (daemon shutdown / tests).
 *
 * AWAITABLE ON PURPOSE. Killing the tray is an IPC round-trip: we ask the helper
 * to quit, and only the helper can tell Windows to drop the icon (NIM_DELETE).
 * The old version fired the kill and returned, and `shutdown()` then called
 * `process.exit(0)` on the very next line — the helper died from stdin EOF before
 * it ever processed the quit, so the icon stayed behind as a GHOST until the user
 * happened to hover over it (user 2026-07-21: "tray vẫn kẹt icon ảo, ko tự mất").
 * Callers must await this before exiting. Bounded so a wedged helper can never
 * hang the daemon's shutdown.
 */
export async function stopTray(timeoutMs = 800): Promise<void> {
  const t = tray;
  if (!t) return;
  tray = null;
  try {
    await Promise.race([
      t.kill(false),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs).unref?.()),
    ]);
  } catch {
    /* already gone */
  }
}
