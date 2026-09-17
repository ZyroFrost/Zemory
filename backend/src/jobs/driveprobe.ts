// Drive folder probe — runs in a CHILD process so a hung cloud drive can never freeze the daemon.
//
// Why this exists (measured 2026-08-30, twice in one hour): Google Drive File Stream hung at the
// OS level — syscalls on G: neither returned nor threw, `ls` sat through a 20s timeout wrapper.
// The daemon used to call this logic synchronously on its event loop for every /memory-status
// poll, so the moment G: hung the whole HTTP surface froze: heartbeat stopped, /ping went dark,
// and the dashboard turned into a stale screenshot with no red anywhere — the exact "empty shell"
// failure 02_RULES bans. A stuck syscall cannot be interrupted in-process, but a stuck CHILD can
// be killed (execFile timeout → TerminateProcess, verified working on the real hang today).
import { readdirSync, rmSync, statSync, statfsSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";

export interface DriveProbe {
  path: string;
  linked: boolean;
  exists: boolean;
  writable: boolean;
  bundles: number;
  error: string | null;
  /** Sức chứa của Ổ ĐĨA chứa thư mục này — KHÔNG phải hạn mức đám mây.
   *
   *  Google Drive Desktop gắn một ổ ảo và báo lại thông số của ĐĨA LOCAL: đo 2026-09-17 trên máy
   *  này, `G:` và `C:` có Size TRÙNG KHÍT tới từng byte (300.596.076.544). Muốn biết quota
   *  Google thì phải hỏi API của họ bằng tài khoản đã đăng nhập, mà zemory không bao giờ cầm mật
   *  khẩu/2FA — nên con số đó nằm ngoài tầm với, và BỀ MẶT PHẢI GỌI ĐÚNG TÊN thứ nó đang đo
   *  (§F4: không bịa, không để người đọc hiểu nhầm thành dung lượng Drive còn lại). */
  volume: { total: number; free: number; root: string } | null;
  /** Tổng byte các khúc `.enc` — phần kho chung của zemory chiếm trong thư mục đó. */
  storeBytes: number;
}

export function probeDriveFs(dir: string): DriveProbe {
  const path = dir.trim();
  if (!path) return { path: "", linked: false, exists: false, writable: false, bundles: 0, error: null, volume: null, storeBytes: 0 };
  if (/^https?:\/\//i.test(path)) {
    return { path, linked: true, exists: false, writable: false, bundles: 0, volume: null, storeBytes: 0, error: "web URL — use the LOCAL synced folder (Google Drive Desktop), e.g. G:\\My Drive\\zemory" };
  }
  try {
    if (!statSync(path).isDirectory()) return { path, linked: true, exists: true, writable: false, bundles: 0, error: "not a folder", volume: null, storeBytes: 0 };
  } catch {
    return { path, linked: true, exists: false, writable: false, bundles: 0, error: "folder not found", volume: null, storeBytes: 0 };
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
  let storeBytes = 0;
  try {
    // ĐẾM MỌI `.enc`, KHÔNG chỉ hậu tố đời cũ `.zemory.enc`.
    //
    // Bug đo được 2026-08-09: Drive có 3 bundle thật (634 MB) mà ô này hiện **0**. Hậu tố
    // `.zemory.enc` chính là thứ `share.ts:714` tự gọi là `legacyName`; bộ ghi/đọc series
    // hiện tại sinh `global_memory.<host>.<seq>.enc` và khớp bằng `.enc` (`share.ts:721`,
    // `:894`). Nên máy nào đã lên định dạng series thì ô đếm **vĩnh viễn ra 0** — sai lệch
    // im lặng, không cổng nào đỏ, và nó khiến người dùng tưởng chưa từng sync (đúng ca
    // user báo hôm đó). Chỉ sai HIỂN THỊ: merge và ghi series vốn khớp đúng.
    const encs = readdirSync(path).filter((f) => f.endsWith(".enc"));
    bundles = encs.length;
    for (const f of encs) {
      // Một khúc hỏng/biến mất giữa chừng KHÔNG được làm rơi cả phép đo: cộng thiếu một khúc vẫn
      // hơn là mất trắng cả ô số liệu (fail-open, HP điều 9).
      try { storeBytes += statSync(join(path, f)).size; } catch { /* khúc lỗi — bỏ qua */ }
    }
  } catch {
    /* ignore */
  }
  // statfs trên ổ đám mây cũng có thể treo — nhưng cả hàm này đã chạy trong TIẾN TRÌNH CON có trần
  // giờ, nên treo thì bị giết cùng, không đụng tới daemon.
  let volume: DriveProbe["volume"] = null;
  try {
    const s = statfsSync(path);
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bavail) * Number(s.bsize);
    if (total > 0) volume = { total, free, root: parse(path).root || path };
  } catch {
    /* ổ không trả lời thông số — để null, bề mặt tự biết là KHÔNG ĐO ĐƯỢC */
  }
  return { path, linked: true, exists: true, writable, bundles, error: writable ? null : "not writable", volume, storeBytes };
}

// Child entry: `node dist/jobs/driveprobe.js <dir>` → one JSON line on stdout.
// Kept in the SAME module as the logic so there is exactly one implementation to drift.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("jobs/driveprobe.js")) {
  process.stdout.write(JSON.stringify(probeDriveFs(process.argv[2] ?? "")));
}
