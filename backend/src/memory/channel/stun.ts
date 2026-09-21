/**
 * ĐO KIỂU NAT qua STUN công khai — bước ĐO của plan/24 §7 ⑩ (đục lỗ NAT).
 *
 * Vì sao lớp này tồn tại: `§7 ⑩` cấm chọn đường đục lỗ **trên giấy** — phải đo tỉ lệ
 * thành công thật giữa hai mạng TRƯỚC. Mà không đo được nếu không có dụng cụ chạy
 * được ở CẢ HAI máy. Đây là dụng cụ đó, và nó cũng chính là thứ lớp đục lỗ sau này
 * dùng để biết địa chỉ ngoài của chính mình.
 *
 * **Thoả phép thử `§1a-0`:** STUN công khai — không tài khoản, không đăng ký, không
 * máy chủ của user. Server chỉ trả lời *"tôi thấy bạn ở địa chỉ nào"*, giữ **0 byte
 * dữ liệu** ⇒ không đụng HP điều 7 (cùng lý lẽ đã chốt cho dò toàn cầu ở `§1c-a`).
 *
 * **0 dependency mới** (HP điều 2): `node:dgram` · `node:net` · `node:dns` ·
 * `node:crypto`. STUN Binding Request là 20 byte, không cần thư viện nào.
 *
 * **Fail-open tuyệt đối** (HP điều 9): mạng chặn STUN, DNS trượt, server im — lớp này
 * trả `unknown` và KHÔNG BAO GIỜ ném. Nó là thước, không phải cửa chặn.
 *
 * 🔴 **Điều 13 — kết luận và không-kết-luận không được lẫn.** Phân loại NAT chỉ hợp lệ
 * khi có **≥ 2 IP server KHÁC NHAU** trả lời: một server trả lời thì không thể phân biệt
 * *cone* với *đối xứng*, và đoán theo hướng dễ chịu là đúng lỗi điều 12 cấm. Ca đó trả
 * `unknown`, không trả `endpoint-independent`.
 *
 * 🔴 **Bẫy đã trả giá khi đo lần đầu 2026-09-21 — vì sao mã này DEDUP THEO IP và GIÃN NHỊP:**
 * `stun.l.google.com` và `stun1.l.google.com` giải ra **CÙNG một địa chỉ**
 * (`74.125.250.129`), nên lượt đo đầu nện nó hai lượt rồi năm phép sau đó **hết giờ sạch**.
 * Đọc thành *"mạng chặn"* thì sai hoàn toàn: hỏi lại chính IP đó bằng một socket mới sau
 * 5 giây thì nó trả lời trong **107 ms** — đó là **giới hạn nhịp của server**, không phải
 * của mạng. Năm phép cùng trượt về một hướng ⇒ nghi cái THƯỚC (`02_RULES §BA LUẬT ĐO ②`).
 */
import dgram from "node:dgram";
import net from "node:net";
import dns from "node:dns/promises";
import { randomBytes } from "node:crypto";

/** Magic cookie của RFC 5389 — có nó mới phân biệt được STUN mới với RFC 3489 cũ. */
const MAGIC_COOKIE = 0x2112a442;
const TYPE_BINDING_REQUEST = 0x0001;
const TYPE_BINDING_SUCCESS = 0x0101;
const ATTR_MAPPED_ADDRESS = 0x0001;
const ATTR_XOR_MAPPED_ADDRESS = 0x0020;
const FAMILY_IPV4 = 0x01;

/**
 * Server STUN công khai mặc định. Cố tình nhiều nhà khác nhau: phân loại NAT đòi
 * **≥ 2 IP khác nhau** trả lời, nên một nhà duy nhất là không đủ dù nó có bao nhiêu tên.
 *
 * Đo 2026-09-21 trên mạng của máy này: UDP **5/6 trả lời**; TCP chỉ **2/7**
 * (`stun.nextcloud.com:443` · `stun.antisip.com:3478`) — phần lớn server đơn giản là
 * KHÔNG phục vụ STUN trên TCP, đó không phải dấu hiệu mạng chặn.
 */
export const PUBLIC_STUN_SERVERS = [
  "stun.cloudflare.com:3478",
  "stun.nextcloud.com:443",
  "stun.l.google.com:19302",
  "stun.antisip.com:3478",
  "stun.ekiga.net:3478",
  "stun.sipgate.net:3478",
] as const;

export interface StunServer {
  host: string;
  ip: string;
  port: number;
}

export interface MappedAddress {
  ip: string;
  port: number;
}

/** Một yêu cầu Binding kèm mã giao dịch để đối chiếu câu trả lời. */
export function buildBindingRequest(): { request: Buffer; txid: Buffer } {
  const request = Buffer.alloc(20);
  request.writeUInt16BE(TYPE_BINDING_REQUEST, 0);
  request.writeUInt16BE(0, 2); // không thuộc tính
  request.writeUInt32BE(MAGIC_COOKIE, 4);
  const txid = randomBytes(12);
  txid.copy(request, 8);
  return { request, txid };
}

/**
 * Bóc địa chỉ server thấy được. Ưu tiên `XOR-MAPPED-ADDRESS`, rơi về `MAPPED-ADDRESS`
 * cho server đời cũ (đo được: `stun.ekiga.net` chỉ trả bản KHÔNG xor).
 *
 * Trả `null` cho mọi thứ không đọc được — kể cả khi mã giao dịch lệch. Bỏ phép kiểm đó
 * là nhận câu trả lời của một yêu cầu KHÁC, tức đọc sai cổng ngoài của chính mình.
 */
export function parseMappedAddress(msg: Buffer, txid: Buffer): MappedAddress | null {
  if (msg.length < 20) return null;
  if (msg.readUInt16BE(0) !== TYPE_BINDING_SUCCESS) return null;
  if (msg.readUInt32BE(4) !== MAGIC_COOKIE) return null;
  if (!msg.subarray(8, 20).equals(txid)) return null;

  const end = Math.min(msg.length, 20 + msg.readUInt16BE(2));
  let offset = 20;
  let plain: MappedAddress | null = null;
  while (offset + 4 <= end) {
    const type = msg.readUInt16BE(offset);
    const length = msg.readUInt16BE(offset + 2);
    const value = msg.subarray(offset + 4, offset + 4 + length);
    if (type === ATTR_XOR_MAPPED_ADDRESS && value.length >= 8 && value[1] === FAMILY_IPV4) {
      const port = value.readUInt16BE(2) ^ (MAGIC_COOKIE >>> 16);
      const octets: number[] = [];
      for (let i = 0; i < 4; i++) octets.push(value[4 + i] ^ msg[4 + i]);
      return { ip: octets.join("."), port };
    }
    if (type === ATTR_MAPPED_ADDRESS && value.length >= 8 && value[1] === FAMILY_IPV4) {
      plain = { ip: Array.from(value.subarray(4, 8)).join("."), port: value.readUInt16BE(2) };
    }
    offset += 4 + length + ((4 - (length % 4)) % 4); // thuộc tính đệm về bội số 4
  }
  return plain;
}

/**
 * Giải tên server rồi **khử trùng THEO IP**. Hai tên trỏ cùng một máy đếm là MỘT —
 * xem bẫy nhịp ở đầu file: trùng IP vừa làm phân loại vô nghĩa, vừa tự gây hết giờ.
 */
export async function resolveStunServers(hostports: readonly string[] = PUBLIC_STUN_SERVERS): Promise<StunServer[]> {
  const out: StunServer[] = [];
  for (const hostport of hostports) {
    const [host, portText] = hostport.split(":");
    const port = Number(portText);
    if (!host || !Number.isInteger(port) || port <= 0) continue;
    const ips = await dns.resolve4(host).catch(() => [] as string[]);
    const ip = ips[0];
    if (!ip) continue;
    if (out.some((s) => s.ip === ip)) continue;
    out.push({ host, ip, port });
  }
  return out;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Một lượt hỏi qua UDP trên socket ĐÃ MỞ — giữ nguyên socket là điều kiện để đo ánh xạ. */
export function stunQueryUdp(
  socket: dgram.Socket,
  server: { ip: string; port: number },
  timeoutMs = 3000,
): Promise<MappedAddress | null> {
  return new Promise((resolve) => {
    const { request, txid } = buildBindingRequest();
    let settled = false;
    const finish = (r: MappedAddress | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(r);
    };
    const onMessage = (msg: Buffer, from: dgram.RemoteInfo): void => {
      if (from.address !== server.ip) return;
      const mapped = parseMappedAddress(msg, txid);
      if (mapped) finish(mapped);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.on("message", onMessage);
    try {
      socket.send(request, server.port, server.ip, (err) => {
        if (err) finish(null);
      });
    } catch {
      finish(null);
    }
  });
}

/**
 * Một lượt hỏi qua TCP (RFC 5389 cho phép Binding Request trên TCP 3478).
 *
 * Đây là nửa QUYẾT ĐỊNH của `§7 ⑩`: lớp kênh nói **TCP + TLS 1.3**. Nếu NAT ánh xạ TCP
 * y như UDP thì đục lỗ TCP dùng lại `runSession` **không sửa một dòng**, khỏi phải viết
 * lớp tin cậy trên UDP — đúng khoản đắt nhất mà plan cảnh báo trước.
 */
export function stunQueryTcp(
  server: { ip: string; port: number },
  o: { localPort?: number; timeoutMs?: number } = {},
): Promise<MappedAddress | null> {
  return new Promise((resolve) => {
    const { request, txid } = buildBindingRequest();
    let settled = false;
    let buf = Buffer.alloc(0);
    let socket: net.Socket;
    const finish = (r: MappedAddress | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* đóng được thì tốt */
      }
      resolve(r);
    };
    const timer = setTimeout(() => finish(null), o.timeoutMs ?? 5000);
    try {
      socket = net.connect({ host: server.ip, port: server.port, family: 4, localPort: o.localPort });
    } catch {
      clearTimeout(timer);
      resolve(null);
      return;
    }
    socket.on("connect", () => socket.write(request));
    socket.on("data", (chunk: Buffer) => {
      buf = buf.length === 0 ? Buffer.from(chunk) : Buffer.concat([buf, chunk]);
      const mapped = parseMappedAddress(buf, txid);
      if (mapped) finish(mapped);
    });
    socket.on("error", () => finish(null));
    socket.on("close", () => finish(null));
  });
}

/** Kiểu ánh xạ của NAT — thứ quyết định đục lỗ có khả thi hay không. */
export type NatMapping =
  /** Cùng cổng ngoài tới mọi đích ⇒ cone, đục lỗ có cửa. */
  | "endpoint-independent"
  /** Cổng ngoài đổi theo đích ⇒ NAT đối xứng, đục lỗ chết từ phía này. */
  | "address-dependent"
  /** Chưa đủ dữ kiện để phán — KHÔNG được đọc thành một trong hai vế trên. */
  | "unknown";

export interface NatSide {
  asked: number;
  answered: number;
  /** Số IP server KHÁC NHAU đã trả lời — dưới 2 thì không phân loại được. */
  distinctServers: number;
  mapping: NatMapping;
  /** Cổng ngoài có bằng cổng nội hay không; `null` = chưa đo được. */
  portPreserved: boolean | null;
  /** Địa chỉ ngoài server thấy được — dùng cho điểm hẹn của lớp đục lỗ. */
  externalAddress?: string;
  externalPorts: number[];
}

export interface NatMeasurement {
  udp: NatSide;
  tcp: NatSide;
  /** Ánh xạ có bền qua nhiều lượt cách nhau hay không; `null` = chưa đo được. */
  stable: boolean | null;
}

const emptySide = (asked: number): NatSide => ({
  asked,
  answered: 0,
  distinctServers: 0,
  mapping: "unknown",
  portPreserved: null,
  externalPorts: [],
});

/**
 * Phán kiểu ánh xạ từ tập cổng ngoài đã thấy.
 *
 * Tách thành hàm THUẦN để cổng test soi được luật mà không cần mạng — và để đột biến
 * bỏ phép kiểm `< 2 server` chứng minh được là ĐỎ.
 */
export function classifyMapping(externalPorts: readonly number[], distinctServers: number): NatMapping {
  if (distinctServers < 2 || externalPorts.length < 2) return "unknown";
  return new Set(externalPorts).size === 1 ? "endpoint-independent" : "address-dependent";
}

function openUdp(localPort: number): Promise<dgram.Socket> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    socket.once("error", reject);
    socket.bind(localPort, "0.0.0.0", () => resolve(socket));
  });
}

const closeQuietly = (socket: dgram.Socket): void => {
  try {
    socket.close();
  } catch {
    /* đã đóng thì thôi */
  }
};

/**
 * Đo cả hai nửa UDP và TCP.
 *
 * `localPort` là cổng nghe của kênh: đo bằng CHÍNH cổng đó mới trả lời được câu thật
 * sự cần — *"cổng ngoài của máy này có đoán được từ cổng nghe không"*. Đoán được thì
 * điểm hẹn chỉ phải trao ĐỊA CHỈ, không phải thương lượng cổng.
 *
 * Nhịp giãn `spacingMs` không phải thứ trang trí: xem bẫy giới hạn nhịp ở đầu file.
 */
export async function measureNat(
  o: { localPort: number; servers?: readonly string[]; timeoutMs?: number; spacingMs?: number } = { localPort: 0 },
): Promise<NatMeasurement> {
  const timeoutMs = o.timeoutMs ?? 3000;
  const spacingMs = o.spacingMs ?? 400;
  const servers = await resolveStunServers(o.servers);
  if (!servers.length) return { udp: emptySide(0), tcp: emptySide(0), stable: null };

  // ── UDP: MỘT socket hỏi mọi server. Giữ nguyên socket là toàn bộ phép thử —
  // đổi socket giữa các lượt thì cổng ngoài đổi vì lý do khác, và phân loại thành vô nghĩa.
  const udp: NatSide = emptySide(servers.length);
  // Cổng nghe bị chiếm ⇒ rơi về cổng tuỳ ý. Vẫn đo được KIỂU ánh xạ, chỉ mất vế
  // "cổng ngoài có bằng cổng nghe không" — nên đo tiếp chứ không bỏ cuộc (điều 9).
  const socket: dgram.Socket | null = await openUdp(o.localPort).catch(() => openUdp(0).catch(() => null));
  const udpLocalPort = socket?.address().port ?? 0;
  if (socket) {
    for (const server of servers) {
      const mapped = await stunQueryUdp(socket, server, timeoutMs);
      if (mapped) {
        udp.answered += 1;
        udp.distinctServers += 1;
        udp.externalPorts.push(mapped.port);
        udp.externalAddress = mapped.ip;
      }
      await sleep(spacingMs);
    }
  }
  udp.mapping = classifyMapping(udp.externalPorts, udp.distinctServers);
  udp.portPreserved = udp.externalPorts.length && udpLocalPort ? udp.externalPorts.every((p) => p === udpLocalPort) : null;

  // ── Bền theo thời gian: cùng socket, XOAY server để không server nào bị nện.
  // Ánh xạ nhảy cổng giữa hai lượt là giết cả sơ đồ "hai bên cùng gọi vào cổng đã đoán".
  let stable: boolean | null = null;
  if (socket && servers.length) {
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) {
      const mapped = await stunQueryUdp(socket, servers[i % servers.length], timeoutMs);
      if (mapped) seen.push(mapped.port);
      if (i < 2) await sleep(spacingMs * 2);
    }
    if (seen.length >= 2) stable = new Set(seen).size === 1;
  }
  if (socket) closeQuietly(socket);

  // ── TCP: mỗi server một cổng nội RIÊNG. Dùng lại một cổng nội cho lượt thứ hai thì
  // Windows để nó trong TIME_WAIT và phép đo tự trượt — đó là cái thước, không phải NAT.
  const tcp: NatSide = emptySide(servers.length);
  let tcpIndex = 0;
  for (const server of servers) {
    const localPort = o.localPort ? o.localPort + 1 + tcpIndex : 0;
    const mapped = await stunQueryTcp(server, { localPort, timeoutMs: timeoutMs + 2000 });
    if (mapped) {
      tcp.answered += 1;
      tcp.distinctServers += 1;
      tcp.externalPorts.push(mapped.port);
      tcp.externalAddress = mapped.ip;
      if (localPort) tcp.portPreserved = (tcp.portPreserved ?? true) && mapped.port === localPort;
    }
    tcpIndex += 1;
    await sleep(spacingMs);
  }
  // Cổng nội khác nhau mỗi lượt ⇒ tập cổng ngoài không so được trực tiếp. Khi cổng được
  // GIỮ NGUYÊN thì chính điều đó đã là bằng chứng ánh xạ không phụ thuộc đích.
  tcp.mapping =
    tcp.distinctServers >= 2 && tcp.portPreserved === true
      ? "endpoint-independent"
      : classifyMapping(tcp.externalPorts, tcp.distinctServers);

  return { udp, tcp, stable };
}

/**
 * Đục lỗ có cửa hay không, nói bằng một câu.
 *
 * Trả `null` khi CHƯA ĐỦ DỮ KIỆN — gọi là "không được" cũng sai như gọi là "được"
 * (điều 12: không đo được thì ghi *chưa đo*, đừng ghi *sạch*).
 */
export function holePunchViable(m: NatMeasurement): boolean | null {
  const sides = [m.udp, m.tcp];
  if (sides.some((s) => s.mapping === "endpoint-independent")) return true;
  if (sides.every((s) => s.mapping === "address-dependent")) return false;
  return null;
}
