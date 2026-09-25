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
import { hostname, networkInterfaces } from "node:os";
import { sameDeviceId } from "./identity.js";

/** Magic riêng của zemory — gói của app khác rơi vào đây bị bỏ ngay. */
const MAGIC = "ZMCH1";
export const DEFAULT_DISCOVERY_PORT = 21037;
const DEFAULT_BEAT_MS = 30_000;
/** Nhóm multicast link-local Syncthing dùng cho local discovery IPv6 (localdisco v4). Cổng vẫn là
 *  cổng RIÊNG của zemory (21037), KHÔNG phải 21027 — nên không đụng Syncthing thật, magic vẫn lọc. */
const MULTICAST6_GROUP = "ff12::8384";

/** Địa chỉ broadcast SUBNET của một card từ (địa chỉ, mask): `addr | ~mask`. */
export function subnetBroadcast(addr: string, mask: string): string | null {
  const a = addr.split(".").map(Number);
  const m = mask.split(".").map(Number);
  if (a.length !== 4 || m.length !== 4 || a.some(Number.isNaN) || m.some(Number.isNaN)) return null;
  return a.map((oct, i) => (oct & m[i]) | (~m[i] & 255)).join(".");
}

/**
 * ĐÍCH broadcast — một cho MỖI card LAN thật, KHÔNG chỉ `255.255.255.255`.
 *
 * 🔴 Vì sao: `255.255.255.255` đi ra ĐÚNG MỘT card do bảng định tuyến OS chọn. Máy có card ảo
 * (WSL/Hyper-V, ở một dải riêng khác hẳn LAN) thì gói rất dễ ra nhầm card ảo ⇒ máy cùng LAN không bao giờ
 * nhận được, `seen` rỗng dù hai máy chung router (đo 2026-09-22). Bắn thẳng broadcast SUBNET của
 * từng card (`<mạng của card>.255`) buộc gói ra ĐÚNG card LAN — đúng cách local discovery của
 * Syncthing. ⚠ Địa chỉ THẬT không viết vào đây: cổng `no-data-in-git` cấm IP dải riêng trong file
 * được track, và chính chú thích này đã làm nó đỏ một lần.
 * Giữ `255.255.255.255` làm phòng hờ cho môi trường không liệt kê được card.
 */
export function broadcastTargets(): string[] {
  const out = new Set<string>(["255.255.255.255"]);
  try {
    for (const list of Object.values(networkInterfaces())) {
      for (const ni of list ?? []) {
        // Node 18+ trả `family: "IPv4"`; bản cũ trả số `4` — nhận cả hai. Bỏ card nội bộ (loopback).
        if ((ni.family !== "IPv4" && (ni.family as unknown) !== 4) || ni.internal) continue;
        const b = subnetBroadcast(ni.address, ni.netmask);
        if (b) out.add(b);
      }
    }
  } catch {
    /* không liệt kê được card ⇒ chỉ còn đường 255.255.255.255 */
  }
  return [...out];
}

/**
 * Card IPv6 thật (bỏ loopback), kèm địa chỉ có SCOPE để multicast link-local ra ĐÚNG card.
 * `ff12::` là link-local, nên phải chỉ card qua scope id — thiếu nó thì OS lại tự chọn một card,
 * đúng cái bẫy multihomed mà chân IPv4 vừa vá.
 */
function ipv6Interfaces(): { address: string; scoped: string }[] {
  const out: { address: string; scoped: string }[] = [];
  try {
    for (const list of Object.values(networkInterfaces())) {
      for (const ni of list ?? []) {
        if ((ni.family !== "IPv6" && (ni.family as unknown) !== 6) || ni.internal) continue;
        out.push({ address: ni.address, scoped: ni.scopeid ? `${ni.address}%${ni.scopeid}` : ni.address });
      }
    }
  } catch {
    /* không liệt kê được ⇒ bỏ chân IPv6, chân IPv4 vẫn chạy */
  }
  return out;
}

/**
 * Địa chỉ NGUỒN của một gói, nắn về dạng dùng lại được ở tầng nối.
 *
 * Hai thứ phải cắt, và cả hai đều là hiện vật của tầng socket chứ không phải địa chỉ thật:
 * · **scope của IPv6 link-local** (`fe80::1%12`) — số scope chỉ có nghĩa trên máy sinh ra nó;
 * · **IPv4 ánh xạ vào IPv6** (`::ffff:203.0.113.29`) — Node trả dạng này khi socket chạy hai tầng.
 *
 * 🔴 Vì sao dạng thứ hai đắt, đo tại trận 2026-09-24: hai máy CÙNG Wi-Fi, dò LAN thấy nhau đều đặn
 * 30 giây một lần, mà **không lần nào gọi thẳng được**. Ứng viên dựng ra là
 * `::ffff:203.0.113.29:21038`, và `parsePeerAddress` trả `null` cho nó — đúng luật, vì nhiều dấu
 * `:` mà không có ngoặc thì KHÔNG được cắt khúc cuối làm cổng (luật đó chặn một bug khác). Nên
 * ứng viên LAN bị bỏ qua **im lặng**, cả cụm rơi xuống địa chỉ cũ rồi relay, và thẻ máy hiện
 * *"đang nối lại"* mãi mãi trong khi hai máy nằm cách nhau một cái router.
 *
 * Nắn ở ĐÂY chứ không ở nơi tiêu thụ: đây là chỗ duy nhất dạng đó ra đời. Dạy từng nơi đọc về một
 * dạng lẽ ra không nên tồn tại là để lại đúng cái bẫy cho nơi thứ ba quên.
 */
export function normalizeSourceHost(addr: string): string {
  return stripMappedV4((addr ?? "").replace(/%.*$/, ""));
}

/** Một octet IPv4 THẬT: 0–255. `\d{1,3}` nuốt cả `300`, và ca âm của cổng bắt đúng chỗ đó. */
const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
/**
 * Bỏ tiền tố `::ffff:` của một IPv4 ánh xạ — MỘT bản luật, dùng cho cả địa chỉ trần lẫn `host:cổng`.
 *
 * Chỉ ăn khi phần sau là IPv4 HỢP LỆ và kết thúc ở cuối chuỗi hoặc ngay trước dấu `:` của cổng.
 * Không hợp lệ ⇒ **trả nguyên**, không đoán: một địa chỉ hỏng phải ở nguyên dạng hỏng để nơi gọi
 * từ chối nó, chứ không được nắn thành thứ trông giống hợp lệ (`::ffff:203.0.113.300` là ca đó).
 */
export function stripMappedV4(s: string): string {
  return (s ?? "").replace(new RegExp(`^::ffff:((?:${OCTET}\\.){3}${OCTET})(?=$|:)`, "i"), "$1");
}

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
  let sock: dgram.Socket | null = null; // chân IPv4 (broadcast)
  let sock6: dgram.Socket | null = null; // chân IPv6 (multicast ff12::8384)
  let stopped = false;

  const stop = (): void => {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
    for (const s of [sock, sock6]) {
      try {
        s?.close();
      } catch {
        /* đóng được thì tốt */
      }
    }
    sock = null;
    sock6 = null;
  };

  // MỘT handler cho CẢ HAI chân: gói giống hệt nhau (magic + JSON), chỉ khác đường tới.
  const onMessage = (buf: Buffer, rinfo: dgram.RemoteInfo): void => {
    try {
      const text = buf.toString("utf8");
      if (!text.startsWith(`${MAGIC}{`)) return;
      const m = JSON.parse(text.slice(MAGIC.length)) as { id?: string; port?: number; name?: string };
      if (!m.id || typeof m.port !== "number") return;
      if (sameDeviceId(m.id, o.deviceId)) return; // gói của chính mình
      if (o.allowedPeers?.length && !o.allowedPeers.some((a) => sameDeviceId(a, m.id as string))) return;
      // Địa chỉ lấy từ NGUỒN gói, không tin địa chỉ bên kia tự khai. IPv6 link-local kèm scope
      // (`fe80::…%12`) — cắt scope đi để địa chỉ dùng lại được ở tầng nối.
      const host = normalizeSourceHost(rinfo.address);
      const p: PeerSighting = {
        deviceId: m.id,
        host,
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
  };

  const payload = (): Buffer =>
    Buffer.from(`${MAGIC}${JSON.stringify({ id: o.deviceId, port: o.channelPort, name: hostname() })}`, "utf8");

  // ── Chân IPv4: broadcast ra MỖI card LAN thật.
  try {
    sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
    sock.on("error", () => {
      /* lỗi chân IPv4 ⇒ bỏ chân này, KHÔNG kéo cả vòng dò (chân IPv6 vẫn có thể chạy). */
      try {
        sock?.close();
      } catch {
        /* đóng được thì tốt */
      }
      sock = null;
    });
    sock.on("message", onMessage);
    sock.bind(port, () => {
      try {
        sock?.setBroadcast(true);
      } catch {
        /* vài môi trường cấm broadcast — chân này thành vô hiệu, không sao */
      }
    });
  } catch {
    sock = null;
  }

  // ── Chân IPv6: multicast link-local ff12::8384, join trên MỖI card IPv6 thật.
  try {
    sock6 = dgram.createSocket({ type: "udp6", reuseAddr: true });
    sock6.on("error", () => {
      try {
        sock6?.close();
      } catch {
        /* đóng được thì tốt */
      }
      sock6 = null;
    });
    sock6.on("message", onMessage);
    sock6.bind(port, () => {
      for (const ni of ipv6Interfaces()) {
        try {
          sock6?.addMembership(MULTICAST6_GROUP, ni.scoped);
        } catch {
          /* card này join không được (không có route IPv6…) — card khác vẫn thử */
        }
      }
    });
  } catch {
    sock6 = null;
  }

  const beat = (): void => {
    if (stopped) return;
    const buf = payload();
    // IPv4: ĐÚNG MỌI card LAN thật, không phó mặc OS chọn một card (xem `broadcastTargets`).
    if (sock) {
      for (const dest of broadcastTargets()) {
        try {
          sock.send(buf, 0, buf.length, port, dest);
        } catch {
          /* card này không gửi được — card khác vẫn đi, nhịp sau thử lại */
        }
      }
    }
    // IPv6: multicast tới ff12::8384 trên TỪNG card (đặt card ra trước mỗi lượt gửi vì link-local
    // đòi chỉ đúng card — cùng lý do multihomed như IPv4).
    if (sock6) {
      for (const ni of ipv6Interfaces()) {
        try {
          sock6.setMulticastInterface(ni.scoped);
          sock6.send(buf, 0, buf.length, port, MULTICAST6_GROUP);
        } catch {
          /* card này gửi không được — card khác vẫn đi */
        }
      }
    }
  };

  if (sock || sock6) {
    timer = setInterval(beat, o.beatMs ?? DEFAULT_BEAT_MS);
    if (typeof timer.unref === "function") timer.unref();
    beat();
  }

  return { stop, seen: () => [...sightings.values()] };
}
