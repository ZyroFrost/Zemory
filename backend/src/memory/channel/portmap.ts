/**
 * MỞ CỔNG TỰ ĐỘNG — tầng 2 của chồng kết nối (plan/24 §1c · §7c ③).
 *
 * Đây là mảnh trả lời câu *"cài app là chạy, không VPN, không phải vào router"*:
 * app tự xin router mở một cổng cho kết nối vào, rồi tự gia hạn.
 *
 * Làm **NAT-PMP/PCP trước** (RFC 6886): gói yêu cầu 12 byte qua UDP cổng 5351,
 * tự viết bằng `node:dgram` ⇒ giữ được vế **0 dependency**. UPnP-IGD (SSDP + SOAP +
 * XML) nặng hơn hẳn và CHỈ làm nếu đo thấy router không nói NAT-PMP — dựng trước là
 * xây cho một ca chưa biết có tồn tại không (plan/24 §7c ③).
 *
 * **Fail-open tuyệt đối** (HP điều 9): không mở được cổng thì máy này **vẫn gọi RA
 * được**, và chỉ cần ĐẦU KIA mở được là đồng bộ vẫn chạy. Lớp này không bao giờ
 * được phép chặn đường đồng bộ.
 */
import dgram from "node:dgram";
import { networkInterfaces } from "node:os";

const NAT_PMP_PORT = 5351;
const OP_MAP_TCP = 2;
const DEFAULT_LIFETIME_S = 3600;

export interface PortMapping {
  externalPort: number;
  lifetimeSeconds: number;
  gateway: string;
  /** Địa chỉ công khai router tự khai — có thể vắng; ĐỪNG coi là chân lý. */
  externalAddress?: string;
}

/**
 * Đoán gateway: `.1` của mỗi mạng IPv4 riêng đang có.
 * ⚠ Đây là PHỎNG ĐOÁN, không phải bảng định tuyến thật — phần lớn router gia đình
 * đúng, một số mạng thì không. Đoán sai chỉ tốn một gói UDP hết giờ, nên chấp nhận
 * được; đọc bảng route thật là việc của bản sau nếu đo thấy cần.
 */
export function guessGateways(): string[] {
  const out = new Set<string>();
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family !== "IPv4" || ni.internal) continue;
      const parts = ni.address.split(".");
      if (parts.length !== 4) continue;
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      const isPrivate = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
      if (!isPrivate) continue;
      out.add(`${parts[0]}.${parts[1]}.${parts[2]}.1`);
    }
  }
  return [...out];
}

/** Gói yêu cầu NAT-PMP map cổng: version 0, op 2 (TCP), 12 byte. */
export function buildMapRequest(internalPort: number, externalPort: number, lifetimeSeconds: number): Buffer {
  const b = Buffer.alloc(12);
  b.writeUInt8(0, 0);              // version
  b.writeUInt8(OP_MAP_TCP, 1);     // opcode: map TCP
  b.writeUInt16BE(0, 2);           // dự trữ
  b.writeUInt16BE(internalPort, 4);
  b.writeUInt16BE(externalPort, 6);
  b.writeUInt32BE(lifetimeSeconds, 8);
  return b;
}

export interface MapReply {
  ok: boolean;
  resultCode: number;
  externalPort: number;
  lifetimeSeconds: number;
}

/** Đọc trả lời NAT-PMP (16 byte). `resultCode` khác 0 là router từ chối. */
export function parseMapReply(buf: Buffer): MapReply | null {
  if (buf.length < 16) return null;
  if (buf.readUInt8(1) !== OP_MAP_TCP + 128) return null; // op trả lời = op + 128
  const resultCode = buf.readUInt16BE(2);
  return {
    ok: resultCode === 0,
    resultCode,
    externalPort: buf.readUInt16BE(10),
    lifetimeSeconds: buf.readUInt32BE(12),
  };
}

function askGateway(gateway: string, req: Buffer, timeoutMs: number): Promise<MapReply | null> {
  return new Promise((resolve) => {
    let done = false;
    const sock = dgram.createSocket("udp4");
    const finish = (r: MapReply | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sock.close();
      } catch {
        /* đóng được thì tốt */
      }
      resolve(r);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    sock.on("error", () => finish(null));
    sock.on("message", (buf) => finish(parseMapReply(buf)));
    try {
      sock.send(req, 0, req.length, NAT_PMP_PORT, gateway);
    } catch {
      finish(null);
    }
  });
}

/**
 * Xin router mở cổng. Trả `null` khi không router nào trả lời — đó là câu trả lời
 * HỢP LỆ, không phải lỗi: nghĩa là máy này không gọi-vào-được, và đầu kia phải là
 * bên mở cổng.
 */
export async function mapPort(
  internalPort: number,
  o: { externalPort?: number; lifetimeSeconds?: number; timeoutMs?: number; gateways?: string[] } = {},
): Promise<PortMapping | null> {
  const lifetime = o.lifetimeSeconds ?? DEFAULT_LIFETIME_S;
  const req = buildMapRequest(internalPort, o.externalPort ?? internalPort, lifetime);
  for (const gw of o.gateways ?? guessGateways()) {
    const reply = await askGateway(gw, req, o.timeoutMs ?? 1500);
    if (reply?.ok) {
      return { externalPort: reply.externalPort, lifetimeSeconds: reply.lifetimeSeconds, gateway: gw };
    }
  }
  return null;
}

