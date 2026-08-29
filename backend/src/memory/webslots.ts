// Khe tài khoản của nguồn web — nguyên thuỷ DÙNG CHUNG.
//
// Tách ra module riêng 2026-08-28: bốn nơi cần nó (`scanweb` để kéo · `connections` để vẽ
// bảng · `scheduler` để chọn lane tự kéo · `scope` để dựng tầng tài khoản của cây), mà
// `scanweb` đã import `scope` nên chiều ngược lại là import vòng tròn. Trước đó logic này
// từng bị CHÉP ở hai chỗ (`scanweb.accountsOf` + `connections.browserAccounts`) và cái giá
// đo được ngay: bản vá lọc thư mục sao lưu chỉ áp một bản, bề mặt kia vẫn bày khe ma.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir } from "./db.js";
import { getWebAuth } from "../config/settings.js";

/** Các nền web-chat mà nút/lệnh Quét biết tới. */
export const WEB_PLATFORMS = ["chatgpt", "claude"];

/**
 * Nền nào ĐANG DÙNG trên máy này = đã có profile trình duyệt của zemory.
 *
 * Không có công tắc "kèm web chat" nữa (user chốt 2026-07-30: *"đéo cần phải nút check
 * scan web làm gì hết… 1 nút scan, tự động dò thằng nào thiếu rồi hiện ra đăng nhập"*).
 * Nhưng cũng KHÔNG quét mù mọi nền: máy chưa từng dùng ChatGPT mà bấm Quét lại bị bật
 * hai cửa sổ trình duyệt là một kiểu phiền khác. Đã dùng rồi ⇒ có profile ⇒ quét.
 */
export function platformsInUse(): string[] {
  const root = join(currentMemoryDir(), "browser");
  return WEB_PLATFORMS.filter((k) => existsSync(join(root, k)));
}

/**
 * Các KHE TÀI KHOẢN đang có của một nền: `main` + mọi `<platform>-<account>`.
 *
 * Hội thoại nằm theo TÀI KHOẢN chứ không theo nền — đo 2026-07-31: 3 phiên Cowork user
 * cần nằm ở một tài khoản Claude khác cái đang đăng nhập. Không có khe thì muốn lấy chúng
 * phải đăng xuất cái đang dùng.
 */
export function accountsOf(platform: string): string[] {
  const root = join(currentMemoryDir(), "browser");
  const out = existsSync(join(root, platform)) ? ["main"] : [];
  try {
    for (const d of readdirSync(root)) {
      const m = new RegExp(`^${platform}-(.+)$`).exec(d);
      if (m && isRealSlot(m[1])) out.push(m[1]);
    }
  } catch {
    /* chưa có thư mục nào */
  }
  return out.length ? out : ["main"];
}

/**
 * Tên khe THẬT hay thư mục SAO LƯU do `borrowCookies` để lại?
 *
 * Đo 2026-08-28 trên máy thật: `accountsOf("claude")` trả **4** khe —
 * `main · 2 · 2.chrome-bak-1786354307845 · 2chrome-bak-1786354307845` — hai cái cuối là bản
 * sao lưu profile, không phải tài khoản. Hậu quả: một lượt quét Claude mở **4 cửa sổ trình
 * duyệt**, hai cái trỏ vào profile rác. Nền `chatgpt` không dính chỉ vì bản sao lưu của nó
 * dùng dấu CHẤM (`chatgpt.chrome-bak-…`) nên không khớp `^chatgpt-(.+)$` — tức đây là lỗ do
 * MAY MẮN mà chưa nổ ở nền kia, không phải do thiết kế.
 *
 * Hai phép loại, mỗi phép trị một dạng đã thấy trên đĩa:
 *  · **có dấu chấm** ⇒ không thể là khe thật: `accountSlot()` lọc tên chỉ còn `[a-zA-Z0-9_-]`,
 *    nên khe do người dùng đặt KHÔNG BAO GIỜ chứa `.` (bắt `2.chrome-bak-…`);
 *  · **chứa `bak-`** ⇒ dấu hiệu bản sao lưu ở mọi thế hệ đặt tên (`.bak-` hiện nay, `.chrome-bak-`
 *    / `-msedge-bak-` đời cũ) — bắt cả `2chrome-bak-…`, cái mất dấu chấm nên phép trên không thấy.
 */
function isRealSlot(name: string): boolean {
  return !name.includes(".") && !/bak-/i.test(name);
}

/**
 * Khe ĐÁNG KÉO của một nền — khác `accountsOf` (liệt kê MỌI thư mục profile).
 *
 * Vì sao phải tách (đo 2026-08-28): `accountsOf('claude')` trả `main · 2 · 3`, nên một lượt
 * Quét lặp cả ba và **mở ba cửa sổ trình duyệt** — hai cái là khe KHÔNG còn phiên, tức bật
 * form đăng nhập mà người dùng không hề yêu cầu. User chụp đúng hai cửa sổ "Sign in - Claude"
 * cạnh nhau và gọi đó là lỗi. Đúng: kéo là việc của khe ĐANG NỐI; nối lại là việc người dùng
 * chủ động bấm trên hàng nguồn.
 *
 * `main` luôn có mặt: đó là khe mặc định, và nếu nó cũng mất phiên thì lượt kéo phải báo
 * `need-login` cho người ta biết — chứ không im lặng bỏ qua cả nền.
 */
export function pullableAccountsOf(platform: string): string[] {
  const auth = getWebAuth();
  return accountsOf(platform).filter((a) => a === "main" || auth[`${platform}#${a}`]?.ok === true);
}

// ── DANH TÍNH vs KHE ─────────────────────────────────────────────────────────────────────
//
// Đo 2026-08-28: khe `main` của claude từng đăng nhập `zyrofrost@gmail.com` (83 phiên, project
// cá nhân), rồi hôm nay đăng nhập lại bằng `huy.nguyen@sasin.vn`. Cây gán nhãn khe theo email
// ĐANG đăng nhập ⇒ 83 phiên cũ "đổi chủ" trên bề mặt — user: *"sao nó đá mất cái account cũ
// đã đăng nhập, nó phải hiện song song các tk chứ"*. Khe là THƯ MỤC profile; tài khoản là NGƯỜI.
// Từ nay `sessions.account` ghi DANH TÍNH (email) khi biết, khe chỉ là đường lùi khi chưa biết.

export function isEmail(s: string | undefined | null): s is string {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(s);
}

/** Khoá tài khoản để đóng dấu lên phiên: email nếu có, không thì khe. */
export function accountKey(email: string | null | undefined, slot: string): string {
  return isEmail(email) ? email : slot;
}

/** Khe ĐANG giữ danh tính này (theo sổ `webAuth`), hay `null` nếu không khe nào đăng nhập tài khoản đó. */
export function slotOfIdentity(
  auth: Record<string, { ok?: boolean; who?: string } | undefined>,
  platform: string,
  identity: string,
): string | null {
  // Ưu tiên khe ĐANG NỐI (`ok:true`): một email có thể nằm ở hai khe — khe cũ mất phiên và khe mới vừa
  // đăng nhập (đo 2026-08-29: `chatgpt` main ok:false + `chatgpt#2` ok:true, cùng zyrofrost). Trả khe
  // cũ là hàng báo ⚠ trong khi tài khoản đang nối tốt ở khe kia.
  let fallback: string | null = null;
  for (const [k, v] of Object.entries(auth)) {
    if (!v || v.who !== identity) continue;
    const slot = k === platform ? "main" : k.startsWith(platform + "#") ? k.slice(platform.length + 1) : null;
    if (!slot) continue;
    if (v.ok === true) return slot;
    fallback ??= slot;
  }
  return fallback;
}
