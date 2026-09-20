/**
 * KHUNG + TIN của giao thức kênh máy-tới-máy (plan/24 §7c ②).
 *
 * Khung: `<1 byte kiểu><4 byte độ dài, big-endian><thân>`.
 *   kiểu 0 = JSON điều khiển · kiểu 1 = BYTE THÔ của một khối.
 *
 * 🔴 Vì sao thân khối KHÔNG đi qua JSON: đo được base64-trong-JSON tốn **+33%**
 * (plan/24 §6b — thân 0,300 MB thành 0,400 MB trên dây). Khối là phần nặng nhất
 * của mọi lượt, nên một tầng mã hoá văn bản ở đây là thuế đánh vào đúng chỗ đắt.
 *
 * Khung chưa TRỌN thì chưa bao giờ chạm đĩa — đó là thứ làm phép ④ (đứt dây giữa
 * lúc chở) đạt: bộ đọc gom byte tới khi đủ độ dài mới giao một tin hoàn chỉnh.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const FRAME_JSON = 0;
export const FRAME_BLOCK = 1;
/** Trần một khung — chặn bên kia khai độ dài điên rồ làm ta cấp phát vô hạn. */
export const MAX_FRAME_BYTES = 512 * 1024 * 1024;

export interface HelloMessage {
  t: "hello";
  deviceId: string;
  appVersion: string;
  nonce: string;
  /** Bên gọi là `true`; quyết thứ tự ghép nonce khi tính bằng chứng. */
  initiator: boolean;
}
export interface ProofMessage {
  t: "proof";
  hmac: string;
}
export interface HaveMessage {
  t: "have";
  ids: string[];
  /** Còn trang nữa — dành cho kho rất nhiều khối. */
  more?: boolean;
}
export interface DoneMessage {
  t: "done";
  sent: number;
}
/**
 * Bên GỌI xin được nhận vào sổ. Chỉ gửi SAU khi đã chứng minh cùng chìa.
 *
 * 🔄 Trường `code` đã BỎ (user chốt 2026-09-20) — xem `peer.ts` `acceptPeer`. Tin này nay là một
 * lời xin TRẦN: thứ cho phép nó đi tiếp là bằng chứng cùng `share.key` ở bước trước, không phải
 * một con số người dùng phải đọc qua điện thoại.
 */
export interface PairMessage {
  t: "pair";
}
/** Bên NGHE nhận lời xin: khai vân tay của mình để bên gọi ghi lại, khỏi chép tay chiều ngược. */
export interface PairedMessage {
  t: "paired";
  id: string;
}
export type ControlMessage = HelloMessage | ProofMessage | HaveMessage | DoneMessage | PairMessage | PairedMessage;

export function encodeJson(msg: ControlMessage): Buffer {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  return frame(FRAME_JSON, body);
}
export function encodeBlock(bytes: Buffer): Buffer {
  return frame(FRAME_BLOCK, bytes);
}
function frame(kind: number, body: Buffer): Buffer {
  const head = Buffer.alloc(5);
  head.writeUInt8(kind, 0);
  head.writeUInt32BE(body.length, 1);
  return Buffer.concat([head, body]);
}

export interface DecodedFrame {
  kind: number;
  body: Buffer;
}

/**
 * Bộ gom khung. Trả về các khung ĐÃ TRỌN; phần dở giữ lại chờ byte kế.
 * Ném khi bên kia khai độ dài vượt trần — đóng kết nối là đúng, không đoán.
 */
export function createFrameReader(): (data: Buffer) => DecodedFrame[] {
  let buf: Buffer = Buffer.alloc(0);
  return (data: Buffer): DecodedFrame[] => {
    buf = buf.length === 0 ? Buffer.from(data) : Buffer.concat([buf, data]);
    const out: DecodedFrame[] = [];
    for (;;) {
      if (buf.length < 5) return out;
      const kind = buf.readUInt8(0);
      const len = buf.readUInt32BE(1);
      if (len > MAX_FRAME_BYTES) throw new Error(`khung quá lớn: ${len} byte`);
      if (buf.length < 5 + len) return out;
      out.push({ kind, body: buf.subarray(5, 5 + len) });
      buf = buf.subarray(5 + len);
    }
  };
}

export function parseControl(body: Buffer): ControlMessage | null {
  try {
    const m = JSON.parse(body.toString("utf8")) as ControlMessage;
    return m && typeof m.t === "string" ? m : null;
  } catch {
    return null;
  }
}

// ── Bằng chứng CÙNG CHÌA: hỏi–đáp có nonce ───────────────────────────────────
/**
 * 🔴 KHÔNG dùng một giá trị tĩnh dẫn xuất từ chìa (kiểu `sha256(nhãn ‖ chìa)`).
 * `memory key set` cho người dùng DÁN chìa tự chọn, nên một giá trị tĩnh là tính
 * trước được. Nonce tươi mỗi phiên ⇒ không dựng bảng tra, và phát lại bằng chứng
 * của phiên cũ cũng vô dụng. Cùng họ bài học salt-cố-định ở plan/16 §5.
 *
 * Không có bước này thì hai máy KHÁC chìa vẫn chở hết khối cho nhau rồi mới chết
 * lúc giải mã — tốn cả lượt truyền để nhận một lỗi lẽ ra biết từ giây đầu.
 */
export const newNonce = (): string => randomBytes(32).toString("base64");

export function computeProof(shareKey: string, initiatorNonce: string, responderNonce: string): string {
  return createHmac("sha256", shareKey).update(`${initiatorNonce}|${responderNonce}`).digest("base64");
}

/** So bằng chứng theo thời gian HẰNG — tránh rò rỉ qua thời gian so sánh. */
export function proofMatches(expected: string, got: string): boolean {
  const a = Buffer.from(expected, "base64");
  const b = Buffer.from(got, "base64");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
