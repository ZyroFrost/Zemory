/**
 * DÒ LAN — tầng 1 của chồng kết nối (plan/24 §1c).
 *
 * Bắn một gói UDP broadcast theo nhịp, mang `{id, port}`; bên nhận lấy **IP NGUỒN
 * của chính gói** nên không máy nào phải khai IP tay. Lấy ý từ local discovery của
 * Syncthing, đổi số.
 *
 * ⚠ **KHÔNG dùng cổng 21027** — máy này có thể đang chạy Syncthing thật (plan/24 §0);
 * nghe chung cổng là hai app cãi nhau. Cổng riêng, magic riêng.
 */
import dgram from "node:dgram";
import { hostname } from "node:os";
import { sameDeviceId } from "./identity.js";

/** Magic riêng của zemory — gói của app khác rơi vào đây bị bỏ ngay. */
const MAGIC = "ZMCH1";
export const DEFAULT_DISCOVERY_PORT = 21037;
const DEFAULT_BEAT_MS = 30_000;

export interface PeerSighting {
  deviceId: string;
  host: string;
  port: number;
  seenAt: string;
  /** Tên máy bên kia tự khai. Có thể thiếu (bản cũ không gửi) ⇒ bề mặt rơi về ID.
   *  KHÔNG dùng để nhận dạng — danh tính vẫn là `deviceId`; đây chỉ là nhãn cho người đọc,
   *  vì một cụm máy toàn chuỗi 52 ký tự thì không ai phân biệt được máy nào với máy nào. */
  name?: string;
}

export interface DiscoveryHandle {
  stop: () => void;
  /** Máy đã thấy, mới nhất cho mỗi ID. */
  seen: () => PeerSighting[];
}

export interface DiscoveryOptions {
  deviceId: string;
  /** Cổng lớp kênh đang nghe — thứ bên kia sẽ gọi vào. */
  channelPort: number;
  discoveryPort?: number;
  beatMs?: number;
  /** Chỉ nhận máy đã ghép đôi; rỗng ⇒ ghi nhận hết nhưng KHÔNG ai dùng để nối. */
  allowedPeers?: string[];
  onPeer?: (p: PeerSighting) => void;
}

/**
 * Mở một vòng dò. **Fail-open** (HP điều 9): mọi lỗi socket chỉ tắt vòng dò, không
 * ném lên trên — kênh vẫn dùng được bằng địa chỉ khai tay.
 */
export function startDiscovery(o: DiscoveryOptions): DiscoveryHandle {
  const port = o.discoveryPort ?? DEFAULT_DISCOVERY_PORT;
  const sightings = new Map<string, PeerSighting>();
  let timer: NodeJS.Timeout | null = null;
  let sock: dgram.Socket | null = null;
  let stopped = false;

  const stop = (): void => {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
    try {
      sock?.close();
    } catch {
      /* đóng được thì tốt */
    }
    sock = null;
  };

  try {
    sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    sock.on("error", stop);
    sock.on("message", (buf, rinfo) => {
      try {
        const text = buf.toString("utf8");
        if (!text.startsWith(`${MAGIC}{`)) return;
        const m = JSON.parse(text.slice(MAGIC.length)) as { id?: string; port?: number; name?: string };
        if (!m.id || typeof m.port !== "number") return;
        if (sameDeviceId(m.id, o.deviceId)) return; // gói của chính mình
        if (o.allowedPeers?.length && !o.allowedPeers.some((a) => sameDeviceId(a, m.id as string))) return;
        // Địa chỉ lấy từ NGUỒN gói, không tin địa chỉ bên kia tự khai.
        const p: PeerSighting = {
          deviceId: m.id,
          host: rinfo.address,
          port: m.port,
          seenAt: new Date().toISOString(),
          // Cắt ngắn + lọc: đây là chuỗi do MÁY KHÁC gửi, nó đi thẳng ra bề mặt.
          ...(typeof m.name === "string" && m.name ? { name: m.name.replace(/[^\w.-]/g, "").slice(0, 40) } : {}),
        };
        sightings.set(m.id, p);
        o.onPeer?.(p);
      } catch {
        /* gói rác — bỏ, không bao giờ ném */
      }
    });
    sock.bind(port, () => {
      try {
        sock?.setBroadcast(true);
      } catch {
        /* vài môi trường cấm broadcast — vòng dò thành vô hiệu, không sao */
      }
    });

    const beat = (): void => {
      if (stopped || !sock) return;
      const payload = Buffer.from(`${MAGIC}${JSON.stringify({ id: o.deviceId, port: o.channelPort, name: hostname() })}`, "utf8");
      try {
        sock.send(payload, 0, payload.length, port, "255.255.255.255");
      } catch {
        /* mạng chưa sẵn sàng — nhịp sau thử lại */
      }
    };
    timer = setInterval(beat, o.beatMs ?? DEFAULT_BEAT_MS);
    if (typeof timer.unref === "function") timer.unref();
    beat();
  } catch {
    stop();
  }

  return { stop, seen: () => [...sightings.values()] };
}
