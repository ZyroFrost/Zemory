// DỌN TIẾN TRÌNH TRÌNH DUYỆT MỒ CÔI — mảnh còn thiếu của vòng tự dọn.
//
// Vòng dọn đã có (`jobs/scheduler.scratchTick`, mỗi 6 giờ) quét **THƯ MỤC**: `sweepScratchpads`
// (nháp của phiên agent) và `sweepBrowserProfiles` (profile bị dời sang bên). Không ai quét
// **TIẾN TRÌNH**. Đo 2026-09-12: **75 tiến trình Edge headless** còn sống từ 10:17 sáng — 9 cửa sổ
// dò + con của chúng, mỗi cửa sổ giữ một profile tạm `%TEMP%\zemory-peek-*`. Chúng không hiện trong
// `git status`, không cổng nào soi, và người dùng chỉ thấy Task Manager đầy tiến trình lạ
// (user: *"cái này phải tự dọn chứ, sao để nó đẻ ra quài dc"*).
//
// 🔴 BỐN RÀNG BUỘC AN TOÀN — giết nhầm trình duyệt của người dùng là hỏng nặng hơn cả cái đang chữa:
//  ① chỉ tiến trình có `--user-data-dir` trỏ vào profile CỦA ZEMORY: `<kho>/data/browser/…` hoặc một
//     thư mục tạm tên `zemory-*`. Trình duyệt thường của người dùng không bao giờ mang cờ đó.
//  ② **CHỈ HEADLESS.** Cửa sổ THẤY ĐƯỢC là cửa sổ đăng nhập đang chờ NGƯỜI (`startLoginWatch` canh
//     tới 15 phút, và người dùng có quyền để đó đăng nhập sau) — tự đóng nó là cướp việc của họ.
//     Headless thì ngược lại: không ai nhìn thấy, sống sót chỉ có thể là rác.
//  ③ **QUÁ TUỔI** (mặc định 30 phút): một lượt quét web thật kéo dài vài phút; cắt ngang nó là làm
//     hỏng đúng việc đang chạy.
//  ④ **CÓ JOB ĐANG CHẠY THÌ KHÔNG ĐỤNG GÌ** — người gọi truyền `busy` vào; đây là chốt cuối, vì ①–③
//     đều là suy đoán gián tiếp còn cái này là sự thật trực tiếp.
// Cố ý KHÔNG đụng `<kho>/cockpit/browser` (bản lùi `msedge --app` của chính cửa sổ app) — đó là
// giao diện người dùng đang mở, không phải rác.
//
// Fail-open toàn phần (HP điều 9): không liệt kê được tiến trình thì bỏ lượt, không bao giờ ném.

import { execFileSync } from "node:child_process";
import { platform, tmpdir } from "node:os";
import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Hai ngưỡng tuổi, KHÁC NHAU có chủ đích:
 *  · `BG_SWEEP_MIN_AGE_MS` (30 phút) — vòng dọn NỀN, chạy khi không ai nhìn ⇒ dè dặt.
 *  · `UI_SWEEP_MIN_AGE_MS` (5 phút) — hàng kiểm + nút *Dọn ngay*: người đang ngồi đó nói "dọn đi",
 *    bắt họ chờ nửa tiếng để dọn thứ đang thấy trước mắt là vô lý; 5 phút vẫn đủ để không cắt ngang
 *    một lượt dò vừa mở.
 * Con số nằm CẠNH NHAU ở đây để lần sau ai đổi thì thấy ngay cả hai, thay vì sửa một chỗ rồi lệch.
 */
export const BG_SWEEP_MIN_AGE_MS = 30 * 60_000;
export const UI_SWEEP_MIN_AGE_MS = 5 * 60_000;

export interface BrowserSweepResult {
  /** pid đã đóng. */ killed: number[];
  /** thư mục profile tạm đã xoá kèm. */ dirs: string[];
  /** pid ĐỦ ĐIỀU KIỆN dọn — bằng `killed` ở lượt thật, và là thứ DUY NHẤT có ở lượt dò.
   *  Tách riêng để hàng kiểm trên UI đếm được mà KHÔNG phải giết gì (cùng doctrine `paths check`:
   *  đo trước, ghi sau). */
  candidates: number[];
  /** vì sao không làm gì (nếu không làm gì). */ skipped?: string;
}

interface Proc {
  pid: number;
  cmd: string;
  ageMs: number;
}

/** Liệt kê tiến trình Chromium kèm dòng lệnh + tuổi. Windows dùng CIM; POSIX dùng `ps`. */
function listChromium(): Proc[] {
  if (platform() === "win32") {
    // `CreationDate` về dạng CIM_DATETIME (yyyyMMddHHmmss.ffffff±UTCoffset) — đổi sang epoch bằng
    // chính PowerShell để Node khỏi phải parse khuôn đó.
    const ps = String.raw`
$ErrorActionPreference='SilentlyContinue'
Get-CimInstance Win32_Process -Filter "Name='msedge.exe' or Name='chrome.exe' or Name='brave.exe'" |
  ForEach-Object {
    $t = 0
    try { $t = [int]((Get-Date) - $_.CreationDate).TotalMilliseconds } catch {}
    '{0}|{1}|{2}' -f $_.ProcessId, $t, ($_.CommandLine -replace '\r|\n',' ')
  }`;
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      encoding: "utf8",
      timeout: 20_000,
      windowsHide: true,
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf("|");
        const j = l.indexOf("|", i + 1);
        return { pid: Number(l.slice(0, i)), ageMs: Number(l.slice(i + 1, j)), cmd: l.slice(j + 1) };
      })
      .filter((p) => Number.isInteger(p.pid) && p.pid > 0);
  }
  const out = execFileSync("ps", ["-eo", "pid=,etimes=,args="], { encoding: "utf8", timeout: 20_000 });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(\d+)\s+(\d+)\s+(.*)$/u.exec(l);
      return m ? { pid: Number(m[1]), ageMs: Number(m[2]) * 1000, cmd: m[3] } : null;
    })
    .filter((p): p is Proc => !!p && /chrome|chromium|msedge|brave/iu.test(p.cmd));
}

function killPid(pid: number): boolean {
  try {
    if (platform() === "win32") {
      // `/T` để đóng cả cây render/gpu — giết mỗi tiến trình cha thì con thành mồ côi lần hai.
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { timeout: 15_000, windowsHide: true, stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
    return true;
  } catch {
    return false; // đã tự thoát, hoặc không đủ quyền — lượt sau thử lại
  }
}

/** Thư mục tạm `zemory-*` mà tiến trình đang giữ (nếu có) — xoá kèm sau khi đóng. */
function tempProfileOf(cmd: string): string | null {
  const m = /--user-data-dir="?([^"\s]+)"?/u.exec(cmd);
  if (!m) return null;
  const dir = m[1];
  const tmp = tmpdir().replace(/\\/gu, "/").toLowerCase();
  const norm = dir.replace(/\\/gu, "/").toLowerCase();
  return norm.startsWith(tmp) && /[/\\]zemory-/u.test(norm) ? dir : null;
}

/**
 * @param opts.profileRoot `<kho>/data/browser` — profile khe của zemory.
 * @param opts.busy        có job web đang chạy không (đúng thì KHÔNG đụng gì).
 * @param opts.minAgeMs    tuổi tối thiểu mới coi là mồ côi.
 * @param opts.dryRun      chỉ ĐẾM, không đóng gì (hàng kiểm trên UI và `--dry-run` của CLI).
 */
export function sweepOrphanBrowsers(opts: { profileRoot: string; busy?: boolean; minAgeMs?: number; dryRun?: boolean }): BrowserSweepResult {
  const res: BrowserSweepResult = { killed: [], dirs: [], candidates: [] };
  if (opts.busy) return { ...res, skipped: "đang có job web chạy" };
  const minAge = opts.minAgeMs ?? BG_SWEEP_MIN_AGE_MS;
  const root = opts.profileRoot.replace(/\\/gu, "/").toLowerCase();
  let procs: Proc[];
  try {
    procs = listChromium();
  } catch {
    return { ...res, skipped: "không liệt kê được tiến trình" };
  }
  for (const p of procs) {
    const cmd = p.cmd ?? "";
    // ② chỉ headless — cửa sổ thấy được là cửa sổ đăng nhập của người dùng
    if (!/--headless/u.test(cmd)) continue;
    // ③ quá tuổi
    if (!(p.ageMs >= minAge)) continue;
    const norm = cmd.replace(/\\/gu, "/").toLowerCase();
    // ① của zemory: profile khe, hoặc profile tạm `zemory-*`
    const mine = norm.includes(root) || /--user-data-dir="?[^"]*[/\\]zemory-/u.test(norm);
    if (!mine) continue;
    // Không bao giờ đụng bản lùi `--app` của chính cửa sổ cockpit.
    if (norm.includes("/cockpit/browser")) continue;
    res.candidates.push(p.pid);
    if (opts.dryRun) continue; // lượt DÒ: đếm xong là thôi, không đụng vào tiến trình nào
    const tmpDir = tempProfileOf(cmd);
    if (killPid(p.pid)) {
      res.killed.push(p.pid);
      if (tmpDir) {
        try {
          rmSync(tmpDir, { recursive: true, force: true });
          res.dirs.push(tmpDir);
        } catch {
          /* trình duyệt vừa chết còn giữ khoá — lượt sau xoá */
        }
      }
    }
  }
  return res;
}

/**
 * Thư mục tạm `zemory-*` còn sót mà KHÔNG tiến trình nào giữ (chủ đã chết trước khi kịp dọn).
 *
 * Vì sao cần lượt RIÊNG chứ không xoá ngay lúc giết tiến trình: đo 2026-09-12 — `rmSync` ngay sau
 * `taskkill` **trượt** vì cây trình duyệt vừa chết còn giữ khoá file (lượt thử: đóng 2 tiến trình,
 * xoá được 0 thư mục). Nên đường xoá thật là lượt sau, khi khoá đã nhả.
 * Ngưỡng 1 giờ: một lượt dò chỉ sống vài phút, nên thư mục không ai chạm trong một giờ là rác.
 */
export function sweepOrphanTempProfiles(minAgeMs = 3_600_000): string[] {
  const gone: string[] = [];
  try {
    const base = tmpdir();
    for (const name of readdirSync(base)) {
      if (!/^zemory-/u.test(name)) continue;
      const dir = join(base, name);
      try {
        if (Date.now() - statSync(dir).mtimeMs < minAgeMs) continue;
        rmSync(dir, { recursive: true, force: true });
        gone.push(dir);
      } catch {
        /* đang bị giữ — lượt sau */
      }
    }
  } catch {
    /* không đọc được temp — bỏ lượt */
  }
  return gone;
}
