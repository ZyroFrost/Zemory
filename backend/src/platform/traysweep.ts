// Sweep "ghost" tray icons on startup (Windows). A daemon that dies HARD — a crash,
// or a -Force kill during a restart — never gets to tell Windows to remove its tray
// icon (Shell_NotifyIcon NIM_DELETE), so a dead icon lingers in the tray until the
// user happens to hover over it. This ports SasinFlow's fix: on startup, send
// WM_MOUSEMOVE across the tray toolbars (visible + overflow) so explorer re-validates
// every icon and drops the ones whose owning process is gone — the same thing hover
// does, without touching the real cursor. Best-effort, fire-and-forget (HP điều 9).
//
// The toolbar is found by ENUMERATING descendants for class ToolbarWindow32, not by
// the fixed Shell_TrayWnd→TrayNotifyWnd→SysPager→ToolbarWindow32 chain: on this
// Win10 build that chain's last hop returns 0 (toolbar isn't a direct child of
// SysPager) — a recursive EnumChildWindows finds it regardless of layout.

import { execFile } from "node:child_process";
import { platform } from "node:os";

const PS = String.raw`
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class ZTraySweep {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string w);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int m);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr wp, IntPtr lp);
  public struct RECT { public int l; public int t; public int r; public int b; }
  public static List<IntPtr> Toolbars(IntPtr root) {
    var found = new List<IntPtr>();
    if (root == IntPtr.Zero) return found;
    EnumChildWindows(root, delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(64); GetClassName(h, sb, 64);
      if (sb.ToString() == "ToolbarWindow32") found.Add(h);
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
$WM = 0x0200
$roots = @([ZTraySweep]::FindWindow("Shell_TrayWnd", $null), [ZTraySweep]::FindWindow("NotifyIconOverflowWindow", $null))
$bars = New-Object System.Collections.ArrayList
foreach ($r in $roots) { foreach ($tb in [ZTraySweep]::Toolbars($r)) { [void]$bars.Add($tb) } }
foreach ($tb in $bars) {
  $rc = New-Object ZTraySweep+RECT
  if ([ZTraySweep]::GetClientRect($tb, [ref]$rc)) {
    $yb = [Math]::Max($rc.b, 8); $xb = [Math]::Max($rc.r, 8)
    for ($y = 4; $y -lt $yb; $y += 8) {
      for ($x = 4; $x -lt $xb; $x += 8) {
        [void][ZTraySweep]::SendMessage($tb, $WM, [IntPtr]::Zero, [IntPtr](($y -shl 16) -bor ($x -band 0xFFFF)))
      }
    }
  }
}
`;

/** Clear stale tray icons left by a hard-killed / crashed prior instance. */
export function sweepDeadTrayIcons(): void {
  if (platform() !== "win32") return;
  try {
    // -EncodedCommand (base64 UTF-16LE): survives a Restricted ExecutionPolicy the
    // same way ui.ts's native pickers do, and dodges all quoting.
    const b64 = Buffer.from(PS, "utf16le").toString("base64");
    execFile(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", b64],
      { timeout: 5000, windowsHide: true },
      () => {
        /* fire-and-forget — a failed sweep just means no ghost cleanup this boot */
      },
    );
  } catch {
    /* best-effort; the daemon runs fine without a sweep */
  }
}
