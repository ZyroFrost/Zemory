// Dọn PROFILE TRÌNH DUYỆT bị dời sang bên — thứ không ai dọn từ 2026-08-04.
//
// Vì sao chúng tồn tại: khi máy đổi trình duyệt mặc định, `borrowCookies` (`scanweb.ts`) KHÔNG
// xoá profile cũ mà **dời sang bên** (`<khe>.<trình duyệt>-bak-<epoch>`), đúng một luật cố ý ghi
// ở đó: *"profile cũ dời sang bên, KHÔNG xoá — luôn lùi lại được"*. Luật đó đúng và không đổi.
//
// Lỗ là VẾ SAU của nó: không có cửa nào thu hồi lại. Đo 2026-08-31 trên máy thật: **14 thư mục
// bak/trống · 3.367 MB**, cũ nhất 04/08 (27 ngày), trong khi 4 khe đang sống chỉ chiếm 579 MB.
// Nó nằm dưới `data/` vốn đã gitignore nên KHÔNG cổng nào thấy nó lớn lên — đúng chỗ mà
// `02_RULES` gọi tên: *".gitignore là GIẤU, không phải DỌN"*, và đúng chỗ từng nuốt 3 GB trước đó.
//
// ⚠ CHỈ dọn thứ APP TỰ SINH (`-bak-` của `borrowCookies`). Bản do người/agent làm tay —
// `.trong-<epoch>` chẳng hạn — KHÔNG bao giờ bị đụng: xem ghi chú ở `isSetAsideProfile`.
//
// Chính sách, cố ý giữ tinh thần của luật gốc thay vì đảo nó:
//   ① CỬA SỔ LÙI — bản mới hơn `keepMs` (mặc định 7 ngày) KHÔNG bị đụng. Lùi được là mục đích
//      ban đầu; thu hồi ngay hôm sau là lấy mất chính thứ luật kia bảo vệ.
//   ② CHỈ ĐỤNG thư mục khớp khuôn bak/trống, và PHẢI nằm trực tiếp trong `data/browser/`. Một khe
//      ĐANG SỐNG không bao giờ khớp: `accountSlot()` lọc tên còn `[a-zA-Z0-9_-]` nên khe thật
//      không chứa dấu chấm, và không khe nào tên chứa `bak-` (cùng phép `isRealSlot` ở
//      `webslots.ts` đang dùng để khỏi mở cửa sổ trình duyệt vào profile rác).
//   ③ Xoá là PHÁ HUỶ ⇒ hàm quyết định là hàm THUẦN, đo được, và lỗi I/O của một thư mục không
//      được làm hỏng lượt dọn của các thư mục còn lại.

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "./db.js";

/** Cửa sổ lùi mặc định: 7 ngày. Đủ để phát hiện "khe này mất phiên" rồi lùi, không đủ để phình. */
export const DEFAULT_BROWSER_KEEP_MS = 7 * 24 * 60 * 60_000;

export function browserDir(): string {
  return join(currentMemoryDir(), "browser");
}

/**
 * Tên thư mục này có phải bản DỜI SANG BÊN **DO CHÍNH APP TẠO** (không phải khe đang sống)?
 *
 * 🔴 RANH GIỚI KHÔNG ĐƯỢC VƯỢT: chỉ nhận dạng thứ app tự sinh, tức `-bak-` do
 * `scanweb.borrowCookies` đặt (`renameSync(profileDir, ...-bak-${Date.now()})`, `scanweb.ts`).
 * Bắt cả dạng MẤT DẤU CHẤM đời cũ (`claude-2chrome-bak-1786354307845`) nên phép `bak-` đứng độc
 * lập với phép dấu chấm, y như `isRealSlot` đã phải học ở `webslots.ts`.
 *
 * ⚠ **`.trong-<epoch>` CỐ Ý KHÔNG nằm trong đây** (sửa 2026-08-31, cùng ngày với bản đầu). Bản
 * đầu của hàm này bắt cả `.trong-` vì tôi thấy nó trên đĩa và SUY RA từ cái tên rằng app tạo nó.
 * Tra lại: **không dòng code nào sinh `.trong-`** — hai hit `grep` duy nhất là chữ
 * "trong-tiến-trình" trong comment. Tức `claude.trong-1787902837` là bản một phiên agent LÀM TAY.
 * Tự động xoá thứ người ta chủ động đỗ lại là việc vòng dọn không được phép làm, dù tên nó trông
 * như rác. Ranh giới đúng là AI TẠO RA NÓ, không phải TÊN NÓ TRÔNG NHƯ GÌ.
 */
export function isSetAsideProfile(name: string): boolean {
  return /bak-/i.test(name);
}

export interface SetAside {
  name: string;
  path: string;
  mtimeMs: number;
}

/**
 * Thư mục ĐÁNG thu hồi — hàm THUẦN trên danh sách đã đọc, để cổng đo được mà không cần đĩa thật.
 * Trả về CHỈ những bản đã quá cửa sổ lùi; bản còn trong cửa sổ được giữ nguyên.
 */
export function setAsideToReclaim(entries: SetAside[], now: number, keepMs = DEFAULT_BROWSER_KEEP_MS): SetAside[] {
  return entries.filter((e) => isSetAsideProfile(e.name) && now - e.mtimeMs > keepMs);
}

/** Đọc thư mục `data/browser` ra danh sách bản dời-sang-bên. Không có thư mục ⇒ mảng rỗng. */
export function listSetAside(dir: string = browserDir()): SetAside[] {
  if (!existsSync(dir)) return [];
  const out: SetAside[] = [];
  for (const name of readdirSync(dir)) {
    if (!isSetAsideProfile(name)) continue;
    const p = join(dir, name);
    try {
      const st = statSync(p);
      if (!st.isDirectory()) continue;
      out.push({ name, path: p, mtimeMs: st.mtimeMs });
    } catch {
      /* biến mất giữa chừng — bỏ qua */
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export interface BrowserSweepResult {
  /** Đường dẫn đã xoá. */
  reclaimed: string[];
  /** Còn giữ vì chưa quá cửa sổ lùi. */
  kept: number;
  /** Ngưỡng đã dùng (ms) — in ra để người đọc khỏi phải đoán. */
  keepMs: number;
}

/** Dọn một lượt. Lỗi ở một thư mục KHÔNG dừng lượt (bị khoá ⇒ để lượt sau, giữ thừa không hại ai). */
export function sweepBrowserProfiles(
  opts: { dir?: string; now?: number; keepMs?: number } = {},
): BrowserSweepResult {
  const dir = opts.dir ?? browserDir();
  const now = opts.now ?? Date.now();
  const keepMs = opts.keepMs ?? DEFAULT_BROWSER_KEEP_MS;
  const all = listSetAside(dir);
  const doomed = setAsideToReclaim(all, now, keepMs);
  const reclaimed: string[] = [];
  for (const d of doomed) {
    try {
      rmSync(d.path, { recursive: true, force: true });
      reclaimed.push(d.path);
    } catch {
      /* đang bị trình duyệt giữ ⇒ lượt sau */
    }
  }
  return { reclaimed, kept: all.length - reclaimed.length, keepMs };
}
