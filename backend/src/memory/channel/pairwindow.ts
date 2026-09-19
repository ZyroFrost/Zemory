/**
 * CỬA SỔ GHÉP — mã một lần, có hạn, đổi được (plan/24 §5).
 *
 * Vì sao có: hai máy khác mạng thì địa chỉ phải do người đưa, nhưng ĐỊA CHỈ không nói ai được phép.
 * Bản trước bắt chép mã 9 số theo CẢ HAI chiều. Với cửa sổ ghép, máy A mở cửa và đọc mã; máy B gõ địa
 * chỉ của A kèm mã; bắt tay xong hai bên tự ghi vân tay của nhau — chép MỘT chiều, một lần
 * (user chốt 2026-09-19: *"quay lại gửi ip"* + mã ghép, khuôn UltraViewer).
 *
 * Ba ràng buộc, đúng như spec: **dùng MỘT lần · có HẠN · đổi được**. Giữ trong BỘ NHỚ tiến trình, cố ý
 * không ghi xuống đĩa: daemon tắt là cửa đóng — một mã còn sống sau khi người dùng đã đóng app là thứ
 * không ai ngờ tới. Mã KHÔNG thay chìa share: máy lạ vẫn phải chứng minh cùng chìa trước khi được hỏi
 * tới mã (`peer.ts`), nên đoán mã suông không mở được gì.
 */
import { randomInt } from "node:crypto";

export interface PairWindow {
  code: string;
  /** Hết hạn lúc nào (ms epoch). */
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60_000;

let current: PairWindow | null = null;

/** Sinh mã 6 chữ số. Ngẫu nhiên MẬT MÃ (`randomInt`), không phải `Math.random`. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Mở (hoặc thay) cửa sổ ghép. Gọi lại là ĐỔI mã — mã cũ chết ngay. */
export function armPairing(ttlMs = DEFAULT_TTL_MS, now = Date.now()): PairWindow {
  current = { code: newCode(), expiresAt: now + Math.max(1_000, ttlMs) };
  return { ...current };
}

/** Đóng cửa sổ ghép (người dùng bấm huỷ, hoặc vừa ghép xong). */
export function disarmPairing(): void {
  current = null;
}

/** Cửa sổ đang mở, hoặc `null` khi chưa mở/đã hết hạn. Đọc là tự dọn mã đã hết hạn. */
export function pairingWindow(now = Date.now()): PairWindow | null {
  if (current && current.expiresAt <= now) current = null;
  return current ? { ...current } : null;
}

/**
 * Xét một mã do máy kia gửi tới. Đúng ⇒ `true` và cửa sổ ĐÓNG NGAY (dùng một lần).
 * So sánh theo THỜI GIAN HẰNG ĐỊNH: mã chỉ 6 chữ số, để rò thời gian là tặng thêm một đường dò.
 */
export function consumePairCode(code: string, now = Date.now()): boolean {
  const w = pairingWindow(now);
  if (!w) return false;
  const a = Buffer.from(w.code, "utf8");
  const b = Buffer.from(String(code ?? ""), "utf8");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return false;
  disarmPairing();
  return true;
}
