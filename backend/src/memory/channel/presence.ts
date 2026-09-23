/**
 * BẢNG ĐỊA CHỈ — mảnh làm cho ca KHÁC MẠNG chạy được (plan/24 §11).
 *
 * 🔴 **Vì sao lane này tồn tại, đọc trước khi ai định gỡ nó lần nữa.** Đục lỗ đòi HAI điều:
 * mỗi bên biết địa chỉ **HIỆN TẠI** của bên kia, và **cả hai** cùng bắn về phía nhau. Thiết kế
 * trước đó hỏng ở cả hai: địa chỉ đi trong **mã đã chép** nên nó là một **ảnh chụp** (đo trên máy
 * này: địa chỉ ngoài đổi BA lần trong ~17 giờ, và máy kia dán vào đúng địa chỉ đã chết), còn chỗ
 * chờ thì bắn vào một hố đen chứ không bắn về phía máy kia — tức đánh cược vào NAT full-cone, thứ
 * `§6g` đã đo là **không chứng minh được**.
 *
 * ⚠ **Thứ này TỪNG CÓ và bị gỡ nhầm.** `presence.ts` đời đầu (19/09) làm đúng việc này và commit
 * của nó ghi *"pairing by number now works across networks"*; commit gỡ (20/09) nói lý do là **gọn
 * bề mặt** — nó nằm cạnh ô địa chỉ nên cho màn hình hai cách làm một việc. Đúng cho bề mặt, nhưng
 * thứ giữ lại (*dán một địa chỉ*) là thứ **hết hạn**. Bài học: khi cắt cho gọn, phải hỏi *cái bị
 * cắt đang GÁNH điều kiện nào* — ở đây nó gánh **tính TƯƠI của địa chỉ**, thứ không nhìn thấy trên
 * màn hình nên cắt xong không ai thấy mất gì.
 *
 * ⛔ **Bản này KHÔNG phải một bề mặt ghép đôi** (đó mới là thứ 20/09 gỡ đúng). Ghép đôi giữ nguyên;
 * đây là đường ống **vô hình**, không có nút nào, chỉ giữ cho địa chỉ luôn tươi.
 *
 * **Thoả `§1a-0`:** dùng chính thư mục chung user đã có — không tài khoản mới, không dịch vụ lạ,
 * không máy chủ user phải nuôi. Và nó **không phải "chở dữ liệu qua Drive"**: thứ đi qua là ĐỊA CHỈ
 * (vài trăm byte); khối bộ nhớ vẫn đi thẳng máy-tới-máy.
 *
 * **Fail-open tuyệt đối** (HP điều 9): không có thư mục chung, không ghi được, đọc phải rác — lane
 * này im và mọi đường cũ chạy y nguyên. Nó THÊM một đường, không thay đường nào.
 */
import { join } from "node:path";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { normalizeDeviceId, sameDeviceId } from "./identity.js";

/** Thư mục con trong thư mục chung. Tên rõ nghĩa để người mở Drive ra hiểu ngay nó là gì. */
export const PRESENCE_DIR = "presence";

/**
 * Mục quá tuổi này coi như hết hạn.
 *
 * 10 phút = đúng trần một chỗ chờ đục lỗ (`§6f`), nên một mục còn hạn luôn đi kèm khả năng bên kia
 * còn đang giữ lỗ. Dài hơn là mời người ta bắn vào một địa chỉ đã đổi chủ.
 */
export const PRESENCE_STALE_MS = 10 * 60_000;

export interface PresenceEntry {
  /** Vân tay chứng chỉ — in ra được, là băm của khoá CÔNG KHAI (`§5`). */
  fp: string;
  /** Địa chỉ NGOÀI máy đó tự đo. Dải riêng KHÔNG bao giờ được ghi vào đây. */
  host: string;
  /** Cổng kênh của nó. Cổng đục lỗ suy ra tất định (`punchPortOf`), không cần chở. */
  port: number;
  /** Mốc ISO lúc ghi — thứ duy nhất cho phép phán một mục đã hết hạn. */
  at: string;
  /**
   * Địa chỉ RELAY máy đó đang chờ (`relay://host:port/?id=…`), rỗng nếu chưa vào được relay nào.
   *
   * 🔴 **Thiếu trường này là tầng 4 chết trên đúng những máy cần nó nhất.** Địa chỉ relay vốn đi
   * qua cụm dò toàn cầu, nhưng máy nào ĐĂNG KÝ thất bại (mạng chặn, cụm từ chối) thì lane đó
   * rỗng — và lúc ấy bảng chung là kênh ĐỘNG duy nhất còn lại. Đo 23/09 trên hai máy thật khác
   * mạng: cả hai vào được relay, cả hai thấy nhau trong bảng chung, mà không bên nào gọi được
   * bên nào — vì bảng chỉ chở địa chỉ gọi thẳng.
   *
   * Mã máy KHÔNG thay được chỗ này: nó tĩnh, còn relay thì xoay mỗi lượt bật.
   */
  relay?: string;
}

/**
 * Dải KHÔNG được đăng lên bảng chung.
 *
 * Một địa chỉ LAN ở bảng chung vô dụng với máy khác mạng **và** làm người đọc tin là dùng được —
 * bề mặt nói dối bằng DỮ LIỆU, khó thấy hơn nói dối bằng chữ. Cùng phép lọc `publicIpv4Bytes` của
 * lớp mã máy; giữ riêng ở đây để lane này không phụ thuộc lớp đó.
 */
export function isPublicIpv4(host: string): boolean {
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false; // link-local
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a >= 224) return false; // multicast + dành riêng
  return true;
}

/** Tên file của một máy — chỉ ký tự an toàn, lấy từ vân tay đã chuẩn hoá. */
function fileFor(deviceId: string): string {
  return `${normalizeDeviceId(deviceId).slice(0, 32)}.json`;
}

/**
 * Đăng địa chỉ của máy này lên bảng chung. Trả `false` khi KHÔNG đăng (và đó là chuyện bình
 * thường, không phải lỗi): chưa có thư mục chung, hoặc chưa đo được địa chỉ ngoài.
 */
export function publishPresence(
  sharedDir: string | null,
  o: { deviceId: string; host: string | null; port: number; relay?: string | null },
): boolean {
  // 🔴 CÒN ĐĂNG khi chưa đo được địa chỉ ngoài, MIỄN LÀ có relay: một máy STUN câm vẫn kết nối
  // được qua relay, nên bắt nó im là cắt đúng đường duy nhất nó còn.
  const host = o.host && isPublicIpv4(o.host) ? o.host : null;
  const relay = o.relay && o.relay.startsWith("relay://") ? o.relay : undefined;
  if (!sharedDir || (!host && !relay)) return false;
  try {
    const dir = join(sharedDir, PRESENCE_DIR);
    mkdirSync(dir, { recursive: true });
    const entry: PresenceEntry = { fp: o.deviceId, host: host ?? "", port: o.port, at: new Date().toISOString(), relay };
    writeFileSync(join(dir, fileFor(o.deviceId)), JSON.stringify(entry), "utf8");
    return true;
  } catch {
    return false; // ổ chung chập/chỉ đọc — lane này im, đường cũ không bị đụng
  }
}

/** Gỡ mục của máy này. Tắt kênh mà để mục ở lại là mời máy kia bắn vào một cổng đã đóng. */
export function withdrawPresence(sharedDir: string | null, deviceId: string): void {
  if (!sharedDir) return;
  try {
    rmSync(join(sharedDir, PRESENCE_DIR, fileFor(deviceId)), { force: true });
  } catch {
    /* gỡ được thì tốt; không thì mục tự hết hạn sau PRESENCE_STALE_MS */
  }
}

/**
 * Đọc bảng — CHỈ trả mục còn hạn, của máy ĐÃ có trong sổ, và không phải chính mình.
 *
 * Lọc theo sổ ngay ở đây (không để người gọi tự nhớ): bảng nằm trong thư mục chung, nên về nguyên
 * tắc ai ghi vào cũng được. Chìa chung vẫn là thứ gác cửa thật ở tầng phiên, nhưng không có lý do
 * gì đi bắn vào một máy ta chưa từng ghép.
 */
export function readPresence(
  sharedDir: string | null,
  o: { selfDeviceId: string; allowedPeers: readonly string[]; now?: number },
): PresenceEntry[] {
  if (!sharedDir) return [];
  const dir = join(sharedDir, PRESENCE_DIR);
  if (!existsSync(dir)) return [];
  const now = o.now ?? Date.now();
  const out: PresenceEntry[] = [];
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  for (const name of names) {
    try {
      const e = JSON.parse(readFileSync(join(dir, name), "utf8")) as Partial<PresenceEntry>;
      if (!e.fp || typeof e.port !== "number" || !e.at) continue;
      const relay = typeof e.relay === "string" && e.relay.startsWith("relay://") ? e.relay : undefined;
      // Mục chỉ có relay (máy chưa đo được địa chỉ ngoài) VẪN dùng được — đó đúng là ca tầng 4 sinh
      // ra để cứu. Bỏ nó là quay lại đúng bệnh vừa vá.
      if (!e.host && !relay) continue;
      if (sameDeviceId(e.fp, o.selfDeviceId)) continue; // mục của chính mình
      if (!o.allowedPeers.some((a) => sameDeviceId(a, e.fp as string))) continue;
      if (e.host && !isPublicIpv4(e.host)) continue; // ai đó đăng địa chỉ LAN — bỏ, đừng bắn vào đó
      const at = Date.parse(e.at);
      if (!Number.isFinite(at) || now - at > PRESENCE_STALE_MS) continue; // hết hạn
      out.push({ fp: e.fp, host: e.host ?? "", port: e.port, at: e.at, relay });
    } catch {
      /* file rác hoặc đang được ghi dở — bỏ qua, nhịp sau đọc lại */
    }
  }
  // Mới nhất trước: nếu một máy có nhiều mục (đổi vân tay), cái tươi hơn đáng tin hơn.
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
