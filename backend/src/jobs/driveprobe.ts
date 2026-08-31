// Drive folder probe — runs in a CHILD process so a hung cloud drive can never freeze the daemon.
//
// Why this exists (measured 2026-08-30, twice in one hour): Google Drive File Stream hung at the
// OS level — syscalls on G: neither returned nor threw, `ls` sat through a 20s timeout wrapper.
// The daemon used to call this logic synchronously on its event loop for every /memory-status
// poll, so the moment G: hung the whole HTTP surface froze: heartbeat stopped, /ping went dark,
// and the dashboard turned into a stale screenshot with no red anywhere — the exact "empty shell"
// failure 02_RULES bans. A stuck syscall cannot be interrupted in-process, but a stuck CHILD can
// be killed (execFile timeout → TerminateProcess, verified working on the real hang today).
import { readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface DriveProbe {
  path: string;
  linked: boolean;
  exists: boolean;
  writable: boolean;
  bundles: number;
  error: string | null;
}

export function probeDriveFs(dir: string): DriveProbe {
  const path = dir.trim();
  if (!path) return { path: "", linked: false, exists: false, writable: false, bundles: 0, error: null };
  if (/^https?:\/\//i.test(path)) {
    return { path, linked: true, exists: false, writable: false, bundles: 0, error: "web URL — use the LOCAL synced folder (Google Drive Desktop), e.g. G:\\My Drive\\zemory" };
  }
  try {
    if (!statSync(path).isDirectory()) return { path, linked: true, exists: true, writable: false, bundles: 0, error: "not a folder" };
  } catch {
    return { path, linked: true, exists: false, writable: false, bundles: 0, error: "folder not found" };
  }
  let writable = false;
  const probe = join(path, ".zemory-write-probe");
  try {
    writeFileSync(probe, "ok");
    rmSync(probe, { force: true });
    writable = true;
  } catch {
    /* not writable */
  }
  let bundles = 0;
  try {
    // ĐẾM MỌI `.enc`, KHÔNG chỉ hậu tố đời cũ `.zemory.enc`.
    //
    // Bug đo được 2026-08-09: Drive có 3 bundle thật (634 MB) mà ô này hiện **0**. Hậu tố
    // `.zemory.enc` chính là thứ `share.ts:714` tự gọi là `legacyName`; bộ ghi/đọc series
    // hiện tại sinh `global_memory.<host>.<seq>.enc` và khớp bằng `.enc` (`share.ts:721`,
    // `:894`). Nên máy nào đã lên định dạng series thì ô đếm **vĩnh viễn ra 0** — sai lệch
    // im lặng, không cổng nào đỏ, và nó khiến người dùng tưởng chưa từng sync (đúng ca
    // user báo hôm đó). Chỉ sai HIỂN THỊ: merge và ghi series vốn khớp đúng.
    bundles = readdirSync(path).filter((f) => f.endsWith(".enc")).length;
  } catch {
    /* ignore */
  }
  return { path, linked: true, exists: true, writable, bundles, error: writable ? null : "not writable" };
}

// Child entry: `node dist/jobs/driveprobe.js <dir>` → one JSON line on stdout.
// Kept in the SAME module as the logic so there is exactly one implementation to drift.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("jobs/driveprobe.js")) {
  process.stdout.write(JSON.stringify(probeDriveFs(process.argv[2] ?? "")));
}
