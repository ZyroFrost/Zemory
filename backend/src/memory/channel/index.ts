/**
 * Cửa vào của lớp kênh máy-tới-máy (plan/24).
 *
 * Gom đường dẫn + cấu hình lại một chỗ để CLI, daemon và bề mặt UI cùng gọi MỘT
 * hàm — không nơi nào tự ghép đường hay tự đọc setting lần nữa (đó là cách hai bề
 * mặt của cùng một chức năng lệch nhau, bài học `zemory sweep` 12/09).
 */
import { join } from "node:path";
import { hostname } from "node:os";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { currentMemoryDir, currentStoreRoot } from "../db.js";
import { getDriveDir, getP2pEnabled, getP2pPeers, getP2pPort, getSyncTransport } from "../../config/settings.js";
import { base32, unbase32, loadOrCreateIdentity, deviceIdBytes, deviceIdFromBytes, type ChannelIdentity } from "./identity.js";
import { serveChannel, type ChannelServer, type SyncOutcome } from "./peer.js";
import { startDiscovery, type DiscoveryHandle, type PeerSighting } from "./discovery.js";

export * from "./identity.js";
export * from "./wire.js";
export * from "./blocks.js";
export * from "./peer.js";
export * from "./discovery.js";
export * from "./portmap.js";

/**
 * NGĂN của máy này trong thư mục kênh — `channel/<device-id>/`.
 *
 * 🔴 Vì sao phải có, và vì sao mọi lượt GHI đi vào đây chứ không vào gốc: thư mục này do **Syncthing**
 * chở (user chốt 2026-09-21), mà Syncthing chở **FILE**. Hai máy cùng nối khối vào
 * `channel/global_memory.007.enc` là hai bản khác nhau của CÙNG một đường dẫn ⇒ nó đẻ
 * `.sync-conflict-…` và một bên mất phần vừa ghi. Mỗi máy một ngăn thì **không đường dẫn nào có hai
 * người ghi** — hết xung đột, không cần khoá, không cần hàng đợi.
 *
 * Đây KHÔNG phải "series theo máy" mà HP điều 16 cấm: vế đó cấm nhiều BẢN SAO của cùng một kho nằm
 * cạnh nhau; các ngăn ở đây là những PHẦN khác nhau của cùng một kho. Chiều ĐỌC quét mọi ngăn
 * (`listChannelSegments`) nên hai máy vẫn hội tụ về cùng một TẬP KHỐI — đúng bất biến bản 13/09.
 */
export function channelPen(storeRoot = currentStoreRoot(), ensure = false): string {
  const dir = join(channelDir(storeRoot, ensure), channelIdentity().deviceId.replace(/[^A-Za-z0-9]/g, "").slice(0, 16));
  if (ensure) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Thư mục KHÚC của kênh p2p — nằm trong GỐC KHO, vì khúc là nội dung bộ nhớ và nó
 * đi sang máy kia cùng kho (plan/25 §1).
 */
export function channelDir(storeRoot = currentStoreRoot(), ensure = false): string {
  const dir = join(storeRoot, "channel");
  // CHỈ tạo khi sắp GHI. Bản trước `mkdirSync` ngay trong hàm đọc, nên mỗi lượt hỏi trạng
  // thái lại đẻ một thư mục RỖNG và `conform` kêu "folder rỗng" — một cổng kêu suốt là cổng
  // sắp bị bỏ qua (`02_RULES §Guardrail`). Đường đọc không được để lại dấu chân.
  if (ensure) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Nhà của chứng chỉ + KHOÁ RIÊNG của máy — ở lại THƯ MỤC MÁY NÀY, KHÔNG nằm trong
 * gốc kho.
 *
 * Vì sao tách khỏi `channelDir()`: `device.key` là danh tính TRANSPORT của máy này
 * (plan/24 §1b ①). Để nó trong thư mục đi sang máy khác thì máy đó giả danh được —
 * cùng hạng với `share.key`, nên nó về đúng nhà của bí mật: `secrets/` (HP điều 14).
 */
export function identityDir(machineDir = currentMemoryDir()): string {
  const dir = join(machineDir, "secrets", "channel");
  mkdirSync(dir, { recursive: true });
  // Bản trước để danh tính ở `<machineDir>/channel/identity`. DỜI, không sinh lại:
  // deviceId là vân tay của chứng chỉ, sinh lại là đổi danh tính và cắt mọi cặp đã ghép.
  const legacy = join(machineDir, "channel", "identity");
  if (!existsSync(join(dir, "device.key")) && existsSync(join(legacy, "device.key"))) {
    for (const f of ["device.key", "device.crt"]) {
      try {
        copyFileSync(join(legacy, f), join(dir, f));
      } catch {
        /* thiếu một file ⇒ để loadOrCreateIdentity xử như chưa có, không đoán */
      }
    }
  }
  return dir;
}

export function channelIdentity(machineDir = currentMemoryDir()): ChannelIdentity {
  return loadOrCreateIdentity(identityDir(machineDir));
}

export interface ChannelStatus {
  /** Có NHẬN qua kênh p2p không. */
  enabled: boolean;
  /** Đích GHI hiện hành — đúng MỘT (HP điều 11). */
  transport: "drive" | "p2p";
  deviceId: string;
  port: number;
  peers: string[];
  dir: string;
  /** Tên máy NÀY — nhãn cho thẻ trong cụm máy; không phải danh tính (danh tính là `deviceId`). */
  hostName: string;
}

/** Hai gốc đi vào hai chỗ khác nhau — danh tính ở MÁY NÀY, khúc ở GỐC KHO. Nhận
 *  riêng từng đường để không ai truyền một đường rồi tưởng phủ cả hai. */
export function channelStatus(machineDir = currentMemoryDir(), storeRoot = currentStoreRoot()): ChannelStatus {
  return {
    enabled: getP2pEnabled(),
    transport: getSyncTransport(),
    deviceId: channelIdentity(machineDir).deviceId,
    port: getP2pPort(),
    peers: getP2pPeers(),
    dir: channelDir(storeRoot),
    hostName: hostname(),
  };
}

/**
 * ĐÍCH GHI của một lượt đồng bộ — đúng MỘT, theo `syncTransport` (HP điều 11).
 *
 * Trả `null` khi đích là Drive: người gọi giữ nguyên đường Drive sẵn có, KHÔNG có nhánh nào
 * đổi hành vi. Chỉ khi người dùng cố ý chuyển đích sang `p2p` thì hàm này mới trả một thư mục,
 * và nó **tạo thư mục** vì lúc đó ta sắp ghi thật (`channelDir(ensure)` — hàm ĐỌC không được
 * để lại dấu chân, bài học 15/09).
 */
export function syncWriteDir(storeRoot = currentStoreRoot()): string | null {
  return getSyncTransport() === "p2p" ? channelPen(storeRoot, true) : null;
}

/** Một đích ghi: kênh nào, và thư mục của nó. */
export interface SyncTarget {
  channel: "drive" | "p2p";
  dir: string;
}

/**
 * MỌI kênh đang bật đều là một đích ghi — không còn chuyện chọn một.
 *
 * 🔴 Vì sao đảo (user chốt 2026-09-16: *"ko có vụ chọn bên nào hết, vì nó có đụng nhau đâu, xài
 * nhiều cái dc mà"*). User đúng: Drive và kênh máy-tới-máy là HAI đích khác nhau, ghi cả hai không
 * làm hỏng nhau — điều 11 cấm **hai kẻ ghi cùng MỘT kho**, không cấm một kẻ ghi vào hai kho.
 *
 * Thứ thật sự chặn điều đó là cuốn SỔ DELTA dùng chung một khoá (`drive:<host>` cho mọi đích):
 * đẩy sang Drive xong là mốc nhảy lên, kênh kia không bao giờ còn thấy đám tin đó. Đã tách bằng
 * `wmKeyFor` (`share.ts`) — mỗi kênh một mốc — nên đây mới an toàn.
 *
 * 🔄 `syncWriteDir` GIỮ LẠI cho nơi gọi cũ và cho cổng đang neo vào nó, nhưng đường chạy thật của
 * lượt sync nay đi qua hàm này.
 */
export function syncTargets(storeRoot = currentStoreRoot()): SyncTarget[] {
  const out: SyncTarget[] = [];
  const drive = getDriveDir();
  if (drive) out.push({ channel: "drive", dir: drive });
  if (getP2pEnabled()) out.push({ channel: "p2p", dir: channelPen(storeRoot, true) });
  return out;
}

/** Bản ghi một máy chủ kênh đang chạy trong tiến trình này. */
let running: { server: ChannelServer; port: number; discovery?: DiscoveryHandle } | null = null;

/** Tiền tố mã máy. Đổi bản là đổi tiền tố — máy cũ nhận ra ngay là không đọc được, không đoán. */
const CODE_PREFIX = "ZM1.";
export interface MachineCode {
  fingerprint: string;
}
/**
 * MỘT chuỗi để đưa cho máy kia: **vân tay + relay**. Dán một lần là máy kia biết mình LÀ AI và GẶP Ở
 * ĐÂU — không hỏi thêm gì (app-design §F0).
 *
 * 🔴 **KHÔNG mang địa chỉ LAN**, dù trước đó có. Hai lý do, lý do sau nặng hơn: nó chiếm hơn nửa chuỗi,
 * và nó **hết hạn** — đo 2026-09-21 trên chính máy này, địa chỉ Wi-Fi đổi **ba lần trong một ngày**
 * (`.90 → .81 → .6`). Một mã người ta chép đi rồi dán lại sau vài hôm mà mang địa chỉ chết thì chỉ
 * làm máy kia gọi vào chỗ không còn ai. Ca cùng mạng do tầng dò LAN lo (nó thấy địa chỉ HIỆN TẠI);
 * ai cần khai tay thì ô nhập vẫn nhận `host:port` như cũ.
 *
 * Khuôn nhị phân, không JSON: `[ver 1][vân tay 32 byte][phần mở rộng 1 byte = 0]` rồi base32 — cùng
 * bảng chữ với device ID nên mã đọc và gõ lại được. Byte cuối để dành cho lớp ĐỤC LỖ NAT (`§7 ⑩`)
 * mang thêm dữ kiện điểm hẹn; bản nay luôn là 0.
 */
export function encodeMachineCode(m: MachineCode): string {
  const fp = deviceIdBytes(m.fingerprint);
  if (!fp) return "";
  return CODE_PREFIX + base32(Buffer.concat([Buffer.from([1]), fp, Buffer.from([0])]));
}
/** Đọc mã máy. Không phải mã ⇒ `null` (để nơi gọi rơi về nhánh địa chỉ trần), KHÔNG ném. */
export function parseMachineCode(raw: string): MachineCode | null {
  const s = raw.trim();
  if (!s.startsWith(CODE_PREFIX)) return null;
  const buf = unbase32(s.slice(CODE_PREFIX.length).replace(/[^A-Za-z0-9]/g, "").toUpperCase());
  if (!buf || buf.length < 34 || buf.readUInt8(0) !== 1) return null;
  return { fingerprint: deviceIdFromBytes(buf.subarray(1, 33)) };
}

export interface ChannelServeResult {
  listening: boolean;
  port?: number;
  reason?: string;
}

/**
 * NGHE kết nối từ máy đã ghép đôi — mảnh cuối để hai máy nói chuyện được.
 *
 * 🔴 Không có hàm này thì cả lớp kênh là một cánh cửa KHÔNG AI MỞ: `serveChannel` đã viết xong
 * từ 13/09 nhưng **không nơi nào gọi**, nên máy kia dù cài đúng bản vẫn không nối vào được, và
 * bề mặt thì vẫn khoe "kênh đã sẵn sàng". Đo 2026-09-15: `grep serveChannel` toàn `backend/src`
 * chỉ ra đúng một dòng — chính chỗ khai nó.
 *
 * HAI CỬA TỪ CHỐI, và mỗi cửa nói rõ lý do thay vì im lặng không nghe:
 *  ① `p2pEnabled` tắt ⇒ không nghe (mặc định của mọi máy);
 *  ② chưa có chìa chung ⇒ không nghe, vì phép chứng minh cùng chìa (`plan/24 §7c ②`) là thứ chặn
 *    hai kho LẠ chở khối cho nhau — và từ 2026-09-20 nó là thứ DUY NHẤT gác cửa.
 *
 * 🔄 Cửa "chưa ghép đôi máy nào" ĐÃ BỎ cùng mã kết nối (user chốt 2026-09-20). Nó tồn tại vì hồi đó
 * máy lạ còn phải đọc một mã 6 số, nên mở cổng khi chưa ghép ai là mở vô ích. Nay máy nào chứng minh
 * được cùng chìa là vào được, nên bật kênh = nghe ngay — đúng điều 16 mục 9 (*tự động, người dùng
 * không phải nhớ bấm gì*).
 *
 * Gọi lại khi đang chạy ⇒ đóng bản cũ rồi mở lại theo cấu hình mới (người dùng vừa đổi cổng
 * hoặc vừa ghép thêm máy). Fail-open (điều 9): cổng bận/đang bị chiếm ⇒ trả `reason`, KHÔNG
 * ném — một lỗi ở lớp phụ không được phép làm chết daemon.
 */
export async function startChannelServer(o: {
  shareKey?: string | null;
  appVersion: string;
  /** Máy vừa chứng minh cùng chìa xin vào sổ ⇒ hàm này ghi vân tay nó lại và trả `true`. */
  acceptPeer?: (peerDeviceId: string) => boolean;
  onReceived?: (blocks: number) => void;
  log?: (msg: string) => void;
} ): Promise<ChannelServeResult> {
  const log = o.log ?? (() => {});
  stopChannelServer();
  if (!getP2pEnabled()) return { listening: false, reason: "kênh đang TẮT" };
  const peers = getP2pPeers();
  const key = (o.shareKey ?? "").trim();
  if (!key) return { listening: false, reason: "chưa có chìa share" };
  const port = getP2pPort();
  try {
    const server = await serveChannel(
      {
        port,
        // KHÔNG `ensure`: bật kênh chưa phải là ghi. Lớp nhận khối (`blocks.ts`) tự tạo thư mục
        // đúng lúc có khối thật. Tạo sẵn ở đây đẻ một folder RỖNG mà `conform` kêu mỗi lượt —
        // đúng dấu chân đã phải vá hôm 15/09, và một cổng kêu suốt là cổng sắp bị bỏ qua.
        channelDir: channelPen(currentStoreRoot()),
        identity: channelIdentity(),
        shareKey: key,
        appVersion: o.appVersion,
        allowedPeers: peers,
        acceptPeer: o.acceptPeer,
      },
      (r: SyncOutcome) => {
        // Nói ra MỌI phiên, kể cả phiên 0 khối: im lặng thì không phân biệt được "chưa ai gọi"
        // với "có gọi mà hỏng" — đúng kiểu vỏ rỗng mà `02_RULES §Bề mặt CHẾT THEO nền` cấm.
        log(
          `[channel] phiên với ${r.peerDeviceId ?? "(không rõ)"} — nhận ${r.receivedBlocks} khối · gửi ${r.sentBlocks}` +
            (r.error ? ` · ✗ ${r.error}` : ""),
        );
        if (r.receivedBlocks > 0) o.onReceived?.(r.receivedBlocks);
      },
    );
    // TẦNG 1 — DÒ LAN (plan/24 §1c). Cùng lỗi với `serveChannel`: `startDiscovery` viết xong
    // 13/09 mà KHÔNG nơi nào gọi, nên hai máy cùng mạng vẫn phải khai IP tay. Bật cùng lúc với
    // bên nghe vì nó quảng bá đúng cái cổng đó; fail-open (điều 9) — dò hỏng thì kênh vẫn dùng
    // được bằng địa chỉ khai tay, nên nó KHÔNG được phép làm hỏng lượt bật.
    let discovery: DiscoveryHandle | undefined;
    try {
      discovery = startDiscovery({
        deviceId: channelIdentity().deviceId,
        channelPort: server.port,
        allowedPeers: peers,
        onPeer: (p) => log(`[channel] thấy máy ${p.deviceId.slice(0, 11)}… ở ${p.host}:${p.port} (cùng mạng)`),
      });
    } catch (e) {
      log(`[channel] dò LAN không bật được: ${e instanceof Error ? e.message.slice(0, 90) : e}`);
    }
    running = { server, port: server.port, discovery };
    log(`[channel] đang nghe cổng ${server.port} · nhận từ ${peers.length} máy đã ghép đôi${discovery ? " · dò LAN BẬT" : ""}`);
    return { listening: true, port: server.port };
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 120) : "không mở được cổng";
    log(`[channel] KHÔNG nghe được cổng ${port}: ${reason}`);
    return { listening: false, reason };
  }
}

/** Đóng máy chủ kênh nếu đang chạy. An toàn khi gọi lúc không có gì chạy. */
export function stopChannelServer(): void {
  if (!running) return;
  try {
    running.discovery?.stop();
  } catch {
    /* vòng dò đã tắt */
  }
  try {
    running.server.close();
  } catch {
    /* đóng được thì tốt */
  }
  running = null;
}

/** Máy cùng mạng đã thấy qua tầng 1 — rỗng khi kênh tắt hoặc chưa ai quảng bá. */
export function seenPeers(): PeerSighting[] {
  try {
    return running?.discovery?.seen() ?? [];
  } catch {
    return [];
  }
}

/** Cổng đang nghe, `null` nếu không nghe — cho bề mặt nói đúng trạng thái THẬT. */
export function channelServingPort(): number | null {
  return running?.port ?? null;
}

/**
 * Tách "địa chỉ máy cần nối" mà NGƯỜI dán vào — chấp nhận đúng cái bề mặt in ra.
 *
 * Bề mặt in địa chỉ của máy thành MỘT chuỗi `10.101.1.2:21038`, nên bắt người ta cắt đôi rồi gõ vào
 * hai ô là tự đẻ một bước thừa (user 2026-09-19: *"mắc gì bắt người ta phải nhập"*). Cổng là của
 * RIÊNG từng máy nên vẫn phải nhập được — nhưng nó đi kèm trong chính chuỗi đó, và vắng thì rơi về
 * cổng mặc định của sản phẩm.
 *
 * Nhận: `host` · `host:port` · `[::1]:port` (IPv6 trong ngoặc) · có/không có `tcp://` dán kèm.
 * Trả `null` khi không có host, hoặc cổng nằm ngoài 1–65535 — người dán sai phải được BÁO, không
 * được lặng lẽ nối sang cổng khác.
 */
export function parsePeerAddress(raw: string, fallbackPort = 21038): { host: string; port: number } | null {
  const s = (raw ?? "").trim().replace(/^[a-z]+:\/\//i, "");
  if (!s) return null;
  let host = s;
  let port = fallbackPort;
  const v6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(s);
  if (v6) {
    host = v6[1];
    if (v6[2]) port = Number(v6[2]);
  } else {
    const i = s.lastIndexOf(":");
    // Nhiều dấu `:` mà không có ngoặc ⇒ IPv6 trần, KHÔNG được cắt khúc cuối làm cổng.
    if (i > 0 && s.indexOf(":") === i) {
      host = s.slice(0, i);
      const tail = s.slice(i + 1);
      if (!/^\d+$/.test(tail)) return null;
      port = Number(tail);
    }
  }
  host = host.trim();
  // Dấu `:` mồ côi ở đầu/cuối = người dán hụt một vế (`:21038`) — báo, đừng nhận bừa.
  if (!host || /^:|:$/.test(host)) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

