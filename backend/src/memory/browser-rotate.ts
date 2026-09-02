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
//   ④ **ĐƯỜNG VỀ CUỐI CÙNG THÌ KHÔNG XOÁ, BẤT KỂ TUỔI** (thêm 2026-09-02). Cửa sổ ① tính bằng
//      TUỔI, mà tuổi là proxy tệ cho GIÁ TRỊ: audit đo được luật 7 ngày sắp xoá đúng hai bản đang
//      giữ phiên đăng nhập DUY NHẤT còn lưu của một khe — `chatgpt.msedge-bak-…` (103 MB, còn 64
//      giờ, trong khi khe `chatgpt` live đang `session=false`) và `claude-3.msedge-bak-…` (122 MB,
//      còn 45 giờ, khe live `claude-3` KHÔNG còn tồn tại nên `restoreShelvedSession` vĩnh viễn
//      không với tới). Mất chúng = người dùng phải đăng nhập tay lại, tức vòng dọn rác biến thành
//      vòng mất dữ liệu — đúng thứ `[2026-08-31d]` đã rút thành luật.
//      Phép bảo vệ: bản CÓ phiên (`jarHasSession === true`) mà khe SỐNG của nó KHÔNG chứng minh
//      được là đang có phiên ⇒ giữ. Hướng an toàn một chiều: nó chỉ GIỮ THÊM, không bao giờ xoá
//      thêm, nên không thể tự đẻ ra mất mát. Khe live đã đăng nhập lại ⇒ bản cũ thành dư ⇒ hết
//      được bảo vệ và rơi về cửa sổ ① như trước (đo: `claude.msedge-bak-…` 505 MB đúng ca này).

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "./db.js";
import { jarHasSession } from "./borrowcookies.js";
import { WEB_PLATFORMS } from "./webslots.js";

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

/**
 * Tên bản dời → tên KHE SỐNG của nó (`chatgpt-2.brave-bak-178…` → `chatgpt-2`), hoặc null khi
 * không suy được. Chỉ cắt ở dấu chấm ĐẦU; dạng MẤT dấu chấm đời cũ (`claude-2chrome-bak-…`) cố ý
 * trả null — đoán bừa ở đây là đoán sai khe rồi phán sai cả vế bảo vệ, mà null thì rơi về hướng
 * an toàn (coi như không chứng minh được khe còn phiên ⇒ GIỮ).
 */
export function slotOfSetAside(name: string): string | null {
  const dot = name.indexOf(".");
  if (dot <= 0) return null;
  const head = name.slice(0, dot);
  // Khe thật: chỉ `[A-Za-z0-9_-]` (theo `accountSlot`) và không bao giờ chứa `bak-`.
  if (!/^[A-Za-z0-9_-]+$/.test(head) || /bak-/i.test(head)) return null;
  return head;
}

/** Khe → nền (`chatgpt-2` → `chatgpt`). Khớp DÀI NHẤT, và phải đúng ranh giới `-`. */
export function platformOfSlot(slot: string): string | null {
  let best: string | null = null;
  for (const k of WEB_PLATFORMS) {
    if (slot === k || slot.startsWith(`${k}-`)) {
      if (!best || k.length > best.length) best = k;
    }
  }
  return best;
}

export interface SetAside {
  name: string;
  path: string;
  mtimeMs: number;
  /** Bản dời này có phiên đăng nhập không. `null` = không đọc được / không suy được nền. */
  session?: boolean | null;
  /** Khe SỐNG tương ứng có phiên không. `null` = không đọc được / không biết khe nào. */
  laneSession?: boolean | null;
}

/**
 * Bản dời này có phải ĐƯỜNG VỀ CUỐI CÙNG của khe (chính sách ④)?
 *
 * `session === true` nghiêm ngặt: `undefined` (chưa dò) và `null` (không đọc được) đều KHÔNG được
 * coi là có phiên — nếu không thì một bề mặt tương lai dựng `SetAside` bằng tay sẽ vô tình bật
 * chế độ bảo vệ cho mọi thứ. Còn `laneSession !== true` thì cố ý LỎNG: chỉ khi chứng minh được khe
 * sống đang có phiên mới thôi bảo vệ.
 */
export function isLastWayBack(e: SetAside): boolean {
  return e.session === true && e.laneSession !== true;
}

/**
 * Thư mục ĐÁNG thu hồi — hàm THUẦN trên danh sách đã đọc, để cổng đo được mà không cần đĩa thật.
 * Trả về CHỈ những bản đã quá cửa sổ lùi VÀ không phải đường về cuối cùng (chính sách ④).
 */
export function setAsideToReclaim(entries: SetAside[], now: number, keepMs = DEFAULT_BROWSER_KEEP_MS): SetAside[] {
  return entries.filter((e) => isSetAsideProfile(e.name) && !isLastWayBack(e) && now - e.mtimeMs > keepMs);
}

/** Kho cookie của một thư mục profile. Một chỗ đặt đường, để hai phép dò khỏi lệch nhau. */
function jarOf(profileDir: string): string {
  return join(profileDir, "Default", "Network", "Cookies");
}

/**
 * Dò phiên của một thư mục profile — CHỈ ĐỌC, không bao giờ chạm giá trị cookie.
 * Không suy được nền ⇒ `null` (không phải `false`): "không biết" và "biết là rỗng" là hai câu
 * khác nhau, và chính sách ④ chỉ được dựa vào câu thứ hai.
 */
function probeSession(profileDir: string, slot: string | null): boolean | null {
  const platform = slot ? platformOfSlot(slot) : null;
  if (!platform) return null;
  try {
    return jarHasSession(jarOf(profileDir), platform);
  } catch {
    return null;
  }
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
      // Dò phiên của CHÍNH bản dời và của KHE SỐNG tương ứng (chính sách ④). Giá đo được:
      // 27 ms cho 17 jar — rẻ so với một lượt quét 6 giờ, và đây là thứ duy nhất phân biệt được
      // "bản 122 MB đang giữ phiên cuối" với "bản 122 MB rỗng".
      const slot = slotOfSetAside(name);
      const live = slot ? join(dir, slot) : null;
      out.push({
        name,
        path: p,
        mtimeMs: st.mtimeMs,
        session: probeSession(p, slot),
        laneSession: live && existsSync(live) ? probeSession(live, slot) : null,
      });
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
  /**
   * Số bản được GIỮ LẠI vì là đường về cuối cùng (chính sách ④) — phải trưng ra, không được im.
   * Một bản quá hạn mà không bị xoá là chuyện người đọc log CẦN biết, không thì lần sau có ai
   * tưởng vòng dọn hỏng rồi đi "sửa" đúng thứ đang bảo vệ dữ liệu.
   */
  protected: number;
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
  // Đếm riêng phần được chính sách ④ giữ lại DÙ ĐÃ QUÁ HẠN — đó là con số duy nhất chứng minh
  // vế bảo vệ đang chạy thật, chứ không phải "hôm nay tình cờ chưa có gì tới hạn".
  const protectedCount = all.filter((e) => isLastWayBack(e) && now - e.mtimeMs > keepMs).length;
  return { reclaimed, kept: all.length - reclaimed.length, keepMs, protected: protectedCount };
}
