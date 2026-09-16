// make-exe.mjs — build dist/zemory.exe: a copy of the running node.exe with Zemory's version
// resource and icon (rcedit). Windows only; anywhere else this is a no-op that exits 0.
//
// Why (user, 2026-09-07): Task Manager names a process by the .exe's FileDescription, shows the
// .exe's icon, and GROUPS processes by .exe — so six zemory processes (daemon · window · sync
// child · embed child · scan · digest) showed as "Node.js JavaScript Runtime (6)" with the Node
// logo, in the same bucket as any other node tool on the machine. Nothing at the JS level can
// change that. A branded exe fixes all three at once: the launchers (autostart.ts) start it,
// and every child is spawned via `process.execPath`, so they inherit it for free.
//
// The exe is a build artifact (dist/, gitignored), ~80 MB, rebuilt only when the Node version,
// the app version or the icon changes (see the stamp). Re-signing is not attempted: the copy
// loses node.exe's Authenticode signature, which does not matter for a local Startup launch.
import { chmodSync, copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, "..", "..");
export const EXE = join(ROOT, "dist", "zemory.exe");
export const STAMP = `${EXE}.stamp.json`;
export const ICON = join(ROOT, "backend", "resources", "packaging", "zemory.ico");

/** Version-resource fields from package.json — pure, so the gate can pin them without rcedit. */
export function exeMetadata(pkg) {
  const version = String(pkg.version ?? "0.0.0");
  // Strip any pre-release tag first: "3.0.0-beta.1" must become 3.0.0.0, not 3.0.0.1.
  const four = version.split("-")[0].split(".").map((n) => String(Number.parseInt(n, 10) || 0));
  while (four.length < 4) four.push("0");
  return {
    "version-string": {
      FileDescription: "Zemory",
      ProductName: "Zemory",
      CompanyName: "Zemory",
      OriginalFilename: "zemory.exe",
      InternalName: "zemory",
      LegalCopyright: `Zemory ${version} · runtime Node.js (MIT)`,
    },
    "file-version": four.slice(0, 4).join("."),
    "product-version": version,
  };
}

/** What the exe was built from; a change in any field means rebuild. */
export function stampFor(pkg) {
  return { node: process.version, app: String(pkg.version), icon: existsSync(ICON) ? statSync(ICON).mtimeMs : null };
}

export async function main() {
  if (process.platform !== "win32") {
    console.log("make-exe: not Windows — nothing to do");
    return 0;
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const want = stampFor(pkg);
  if (existsSync(EXE) && existsSync(STAMP)) {
    try {
      const have = JSON.parse(readFileSync(STAMP, "utf8"));
      if (JSON.stringify(have) === JSON.stringify(want)) {
        brandTrayBinary();
        console.log(`make-exe: dist/zemory.exe up to date (node ${want.node} · app ${want.app})`);
        return 0;
      }
    } catch {
      /* unreadable stamp ⇒ rebuild */
    }
  }
  // Write to a temp name and move into place: a half-copied exe must never sit at the final
  // path (a launcher could pick it up mid-build).
  const tmp = `${EXE}.building`;
  copyFileSync(process.execPath, tmp);
  const { rcedit } = await import("rcedit");
  const meta = exeMetadata(pkg);
  await rcedit(tmp, { ...meta, ...(existsSync(ICON) ? { icon: ICON } : {}) });
  const { renameSync, rmSync } = await import("node:fs");
  rmSync(EXE, { force: true });
  renameSync(tmp, EXE);
  writeFileSync(STAMP, JSON.stringify(want) + "\n");
  console.log(`make-exe: dist/zemory.exe built from ${process.execPath} (node ${process.version} · app ${pkg.version}${existsSync(ICON) ? " · icon" : " · NO icon"})`);
  return 0;
}


/**
 * Chép nhị phân khay của `systray2` sang TÊN CỦA APP (`app-design` §B1).
 *
 * Thư viện khoá cứng tên `tray_windows_release.exe`, nên trên bảng tiến trình app hiện ra một dòng
 * mang tên thư viện trong khi `node.exe` đã thành `zemory.exe`. Đổi một nửa còn tệ hơn không đổi.
 * Ta chỉ CHÉP nhị phân (MIT, không sửa gì) — client phóng nó là mã của mình (`platform/tray-client.ts`).
 * Thiếu nguồn ⇒ bỏ qua, client tự rơi về bản gốc: mất cái tên đẹp còn hơn mất cái khay.
 */
export function brandTrayBinary() {
  const src = {
    win32: "tray_windows_release.exe",
    darwin: "tray_darwin_release",
    linux: "tray_linux_release",
  }[process.platform];
  if (!src) return null;
  const from = join(ROOT, "node_modules", "systray2", "traybin", src);
  const to = join(ROOT, "dist", process.platform === "win32" ? "zemory-tray.exe" : "zemory-tray");
  if (!existsSync(from)) return null;
  try {
    copyFileSync(from, to);
    if (process.platform !== "win32") chmodSync(to, 0o755);
    return to;
  } catch {
    return null;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c), (e) => { console.error(`make-exe: ${e instanceof Error ? e.stack ?? e.message : e}`); process.exit(1); });
}
