// Start-with-OS integration (plan 14 §6.B). Enables/disables launching the zemory
// daemon (`zemory ui`) at login, per-OS, in USER space (no admin):
//   Windows → a .cmd in the Startup folder
//   macOS   → a LaunchAgent plist
//   Linux   → an XDG autostart .desktop
// Everything is best-effort and reversible; failures fail-open with a reason so
// the UI can show "not supported here" instead of crashing.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface AutostartStatus {
  supported: boolean;
  enabled: boolean;
  /** os mechanism used (startup-cmd | launchd | xdg-desktop | none) */
  method: string;
  /** path of the entry file, when applicable */
  path?: string;
  detail?: string;
}

/** Absolute path to the zemory CLI entry (dist/cli.js), resolved from this module. */
function cliEntry(): string {
  // this file compiles to dist/platform/autostart.js; the CLI is dist/cli.js — one
  // level UP (autostart moved into platform/ but this path wasn't updated, so the
  // shortcut/autostart used to target a non-existent dist/platform/cli.js).
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "cli.js");
}

/** The command that should run at login: node <cli.js> ui. */
function launchParts(): { exe: string; args: string } {
  return { exe: process.execPath, args: `"${cliEntry()}" ui` };
}

/** Escape a value for a PowerShell single-quoted string (double the quotes) —
 *  a username like `O'Brien` puts a `'` in every path and broke the shortcut PS. */
function psq(s: string): string {
  return s.replace(/'/g, "''");
}

// ── Windows ──────────────────────────────────────────────────────────────────
function winStartupCmd(): string {
  return join(
    process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
    "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "zemory.cmd",
  );
}
function winStatus(): AutostartStatus {
  const path = winStartupCmd();
  return { supported: true, enabled: existsSync(path), method: "startup-cmd", path };
}
function winEnable(): AutostartStatus {
  const path = winStartupCmd();
  const { exe, args } = launchParts();
  mkdirSync(dirname(path), { recursive: true });
  // `start "" /b` launches without opening a console window; /min as a fallback.
  writeFileSync(path, `@echo off\r\nstart "" /b /min "${exe}" ${args}\r\n`);
  return { supported: true, enabled: true, method: "startup-cmd", path };
}
function winDisable(): AutostartStatus {
  const path = winStartupCmd();
  if (existsSync(path)) rmSync(path, { force: true });
  return { supported: true, enabled: false, method: "startup-cmd", path };
}

// ── macOS ────────────────────────────────────────────────────────────────────
function macPlistPath(): string {
  return join(homedir(), "Library", "LaunchAgents", "com.zemory.daemon.plist");
}
function macStatus(): AutostartStatus {
  const path = macPlistPath();
  return { supported: true, enabled: existsSync(path), method: "launchd", path };
}
function macEnable(): AutostartStatus {
  const path = macPlistPath();
  const { exe } = launchParts();
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.zemory.daemon</string>
  <key>ProgramArguments</key><array><string>${exe}</string><string>${cliEntry()}</string><string>ui</string></array>
  <key>RunAtLoad</key><true/>
</dict></plist>
`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, plist);
  return { supported: true, enabled: true, method: "launchd", path };
}
function macDisable(): AutostartStatus {
  const path = macPlistPath();
  if (existsSync(path)) rmSync(path, { force: true });
  return { supported: true, enabled: false, method: "launchd", path };
}

// ── Linux (XDG autostart) ─────────────────────────────────────────────────────
function xdgDesktopPath(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "autostart", "zemory.desktop");
}
function linuxStatus(): AutostartStatus {
  const path = xdgDesktopPath();
  return { supported: true, enabled: existsSync(path), method: "xdg-desktop", path };
}
function linuxEnable(): AutostartStatus {
  const path = xdgDesktopPath();
  const { exe } = launchParts();
  // Quote exe + script: a node path or install dir with a space would otherwise
  // split the Exec line into bogus args (freedesktop Exec allows double-quoting).
  const desktop = `[Desktop Entry]
Type=Application
Name=zemory
Exec="${exe}" "${cliEntry()}" ui
X-GNOME-Autostart-enabled=true
`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, desktop);
  return { supported: true, enabled: true, method: "xdg-desktop", path };
}
function linuxDisable(): AutostartStatus {
  const path = xdgDesktopPath();
  if (existsSync(path)) rmSync(path, { force: true });
  return { supported: true, enabled: false, method: "xdg-desktop", path };
}

function unsupported(): AutostartStatus {
  return { supported: false, enabled: false, method: "none", detail: `autostart not supported on ${platform()}` };
}

/** Current autostart state for this OS. */
export function autostartStatus(): AutostartStatus {
  try {
    switch (platform()) {
      case "win32": return winStatus();
      case "darwin": return macStatus();
      case "linux": return linuxStatus();
      default: return unsupported();
    }
  } catch (error) {
    return { supported: false, enabled: false, method: "none", detail: error instanceof Error ? error.message : "status failed" };
  }
}

/** Enable or disable start-with-OS. Returns the resulting status (fail-open). */
export function setAutostart(on: boolean): AutostartStatus {
  try {
    switch (platform()) {
      case "win32": return on ? winEnable() : winDisable();
      case "darwin": return on ? macEnable() : macDisable();
      case "linux": return on ? linuxEnable() : linuxDisable();
      default: return unsupported();
    }
  } catch (error) {
    return { supported: true, enabled: autostartStatus().enabled, method: "none", detail: error instanceof Error ? error.message : "toggle failed" };
  }
}

// ── Desktop shortcut (plan 14 §E packaging) ───────────────────────────────────
// A clickable "zemory" icon that launches the daemon. Together with autostart it
// gives the app-like install the user asked for, with no native dependency.
export interface ShortcutStatus { supported: boolean; exists: boolean; path?: string; detail?: string }

function desktopDir(): string {
  return join(homedir(), "Desktop");
}

/** Windows app icon (Start Menu / Desktop shortcut) — the Z logo. Resolved from the
 *  packaged resources beside dist/; null if absent so the shortcut still works. */
function winIconPath(): string | null {
  const here = dirname(fileURLToPath(import.meta.url)); // dist/platform
  const p = join(here, "..", "..", "backend", "resources", "packaging", "zemory.ico");
  return existsSync(p) ? p : null;
}

/** Start Menu entry (the "menubar" the user launches from). */
function winStartMenuLnk(): string {
  return join(
    process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
    "Microsoft", "Windows", "Start Menu", "Programs", "Zemory.lnk",
  );
}
function winDesktopLnk(): string {
  return join(desktopDir(), "Zemory.lnk");
}

/** A hidden VBScript launcher: opening from the Start Menu must NOT flash or keep a
 *  console window. It Run()s node with window-style 0 (hidden); the daemon lives in
 *  the background and is stopped from the tray. */
function winLauncherVbs(): string {
  return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "zemory", "launch.vbs");
}
function winWriteLauncher(): string {
  const vbs = winLauncherVbs();
  const { exe } = launchParts();
  mkdirSync(dirname(vbs), { recursive: true });
  writeFileSync(vbs, `CreateObject("WScript.Shell").Run """${exe}"" ""${cliEntry()}"" ui", 0, False\r\n`);
  return vbs;
}

/** Write one .lnk (WScript.Shell — on every Windows) that runs the hidden VBS
 *  launcher, with the Z app icon so the Start Menu / taskbar shows the logo. */
function winWriteShortcut(lnkPath: string, vbs: string): void {
  const icon = winIconPath();
  const ps = [
    "$w = New-Object -ComObject WScript.Shell;",
    `$s = $w.CreateShortcut('${psq(lnkPath)}');`,
    "$s.TargetPath = 'wscript.exe';",
    `$s.Arguments = '"${psq(vbs)}"';`,
    `$s.WorkingDirectory = '${psq(dirname(cliEntry()))}';`,
    `$s.Description = 'Zemory — memory & harness for coding agents';`,
    ...(icon ? [`$s.IconLocation = '${psq(icon)}';`] : []),
    "$s.Save()",
  ].join(" ");
  execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
}

export function desktopShortcutStatus(): ShortcutStatus {
  const os = platform();
  if (os === "win32") { const p = winDesktopLnk(); return { supported: true, exists: existsSync(p) || existsSync(winStartMenuLnk()), path: p }; }
  if (os === "linux") { const p = join(desktopDir(), "zemory.desktop"); return { supported: true, exists: existsSync(p), path: p }; }
  if (os === "darwin") { const p = join(desktopDir(), "zemory.command"); return { supported: true, exists: existsSync(p), path: p }; }
  return { supported: false, exists: false, detail: `no desktop shortcut on ${os}` };
}

/**
 * Install (on=true) or remove (on=false) the clickable "Zemory" shortcuts. On
 * Windows this creates BOTH a Desktop and a Start Menu entry (with the Z icon), so
 * the app opens from the menubar like an installed app. Fail-open.
 */
export function setDesktopShortcut(on: boolean): ShortcutStatus {
  const st = desktopShortcutStatus();
  if (!st.supported || !st.path) return st;
  try {
    if (platform() === "win32") {
      const desk = winDesktopLnk();
      const menu = winStartMenuLnk();
      if (!on) {
        for (const p of [desk, menu, winLauncherVbs()]) if (existsSync(p)) rmSync(p, { force: true });
        return { ...st, exists: false };
      }
      mkdirSync(dirname(menu), { recursive: true });
      const vbs = winWriteLauncher();
      winWriteShortcut(desk, vbs);
      winWriteShortcut(menu, vbs);
      return { ...st, exists: true };
    }
    if (!on) { if (existsSync(st.path)) rmSync(st.path, { force: true }); return { ...st, exists: false }; }
    const { exe } = launchParts();
    if (platform() === "linux") {
      writeFileSync(st.path, `[Desktop Entry]\nType=Application\nName=Zemory\nExec="${exe}" "${cliEntry()}" ui\nTerminal=false\n`);
    } else {
      writeFileSync(st.path, `#!/bin/sh\n"${exe}" "${cliEntry()}" ui\n`, { mode: 0o755 });
    }
    return { ...st, exists: true };
  } catch (error) {
    return { ...st, detail: error instanceof Error ? error.message : "shortcut failed" };
  }
}

/** Reconcile the OS hook with the saved config flag (called on daemon start). */
export function reconcileAutostart(wanted: boolean): void {
  try {
    if (autostartStatus().enabled !== wanted) setAutostart(wanted);
  } catch {
    /* best-effort */
  }
}
