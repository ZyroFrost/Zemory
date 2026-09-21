/**
 * Cửa vào của lớp kênh máy-tới-máy (plan/24).
 *
 * Gom đường dẫn + cấu hình lại một chỗ để CLI, daemon và bề mặt UI cùng gọi MỘT
 * hàm — không nơi nào tự ghép đường hay tự đọc setting lần nữa (đó là cách hai bề
 * mặt của cùng một chức năng lệch nhau, bài học `zemory sweep` 12/09).
 */
import { join } from "node:path";
import { hostname } from "node:os";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { currentMemoryDir, currentStoreRoot } from "../db.js";
import { getDriveDir, getP2pEnabled, getP2pPeers, getP2pPort, getSyncTransport } from "../../config/settings.js";
import { base32, unbase32, loadOrCreateIdentity, deviceIdBytes, deviceIdFromBytes, type ChannelIdentity } from "./identity.js";
import { serveChannel, type ChannelServer, type SyncOutcome } from "./peer.js";
import { startDiscovery, type DiscoveryHandle, type PeerSighting } from "./discovery.js";
import { punchToPeer } from "./punch.js";
import { resolveStunServers, stunQueryTcp } from "./stun.js";

export * from "./identity.js";
export * from "./wire.js";
export * from "./blocks.js";
export * from "./peer.js";
export * from "./discovery.js";
export * from "./portmap.js";
export * from "./stun.js";
export * from "./punch.js";

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
// ── ĐỊA CHỈ NGOÀI CỦA MÁY NÀY — mảnh làm ca KHÁC MẠNG chạy bằng một mã ────────────────────────
/**
 * Khác mạng thì không tầng dò nào tìm ra máy kia, nên địa chỉ phải đi TRONG mã. Máy tự đo địa chỉ
 * ngoài của chính nó bằng STUN công khai (không tài khoản, không máy chủ của user — `§1a-0`), rồi
 * `encodeMachineCode` chở nó. Người dùng dán MỘT chuỗi và không bao giờ thấy một IP — đúng câu user
 * chốt 2026-09-13: *"ID chính là bộ khai báo IP, chỉ là IP không lộ ra bên ngoài thôi"*.
 *
 * 🔴 **Có ĐỆM, và đệm là bắt buộc chứ không phải tối ưu.** STUN công khai **giới hạn nhịp**: đo
 * 2026-09-21, nện cùng một IP server ba lượt liền là năm phép sau hết giờ sạch, và đọc thẳng thì ra
 * kết luận SAI *"mạng chặn"* (`§6e`). Bề mặt vẽ lại mã mỗi lần mở panel ⇒ hỏi STUN mỗi lượt vẽ là tự
 * bắn vào chân mình.
 *
 * TTL 5 phút: địa chỉ ngoài đổi chậm hơn địa chỉ LAN nhưng KHÔNG bất biến ⇒ mã phải tươi lúc người
 * dùng chép. Làm mới ở NỀN, nên không ai phải chờ một lời gọi mạng để thấy mã của mình.
 */
/**
 * Cổng ĐỤC LỖ = cổng kênh + 1, suy TẤT ĐỊNH ở cả hai máy.
 *
 * Vì sao phải lệch: daemon giữ cổng kênh để NGHE, và Node không cho chia một cổng TCP giữa lớp nghe
 * và lớp gọi (`EADDRINUSE`, đo ở `§6e`) ⇒ máy KHÔNG THỂ tự mở một lỗ trên chính cổng kênh. Cổng kề
 * bên thì mở được, và vì cả hai máy suy ra cùng một số nên mã chỉ cần chở **cổng kênh**.
 */
export const PUNCH_PORT_OFFSET = 1;
export function punchPortOf(channelPort: number): number {
  return channelPort + PUNCH_PORT_OFFSET;
}

const EXT_TTL_MS = 5 * 60_000;
let extAddr: { host: string; port: number; at: number } | null = null;
let extBusy = false;

/** Địa chỉ ngoài đã đo, ĐỌC THUẦN — không mở socket, không chờ mạng. `null` = chưa đo được. */
export function externalAddress(): { host: string; port: number } | null {
  return extAddr ? { host: extAddr.host, port: extAddr.port } : null;
}

/** Đệm đã quá tuổi chưa — người gọi tự quyết có làm mới không. */
export function externalAddressStale(): boolean {
  return !extAddr || Date.now() - extAddr.at > EXT_TTL_MS;
}

/**
 * Đo lại địa chỉ ngoài — MỘT lời hỏi, không phải cả bảng phân loại NAT.
 *
 * `measureNat` hỏi mọi server để phân loại ánh xạ; ở đây chỉ cần *"tôi ở địa chỉ nào"*, nên đi
 * server đầu tiên trả lời rồi dừng. Cổng NGOÀI lấy từ chính phép đo; NAT đo được là giữ nguyên cổng
 * nguồn (`§6e`) nên nó thường bằng cổng nghe, nhưng **đừng suy khi đã đo được**.
 *
 * **Fail-open** (điều 9): không đo được ⇒ giữ đệm cũ, mã rơi về bản KHÔNG mang địa chỉ và ca cùng
 * mạng chạy y nguyên. Chống gọi trùng: hai lượt cùng lúc thì lượt sau dùng đệm.
 */
export async function refreshExternalAddress(localPort = getP2pPort()): Promise<{ host: string; port: number } | null> {
  if (extBusy) return externalAddress();
  extBusy = true;
  try {
    for (const s of await resolveStunServers()) {
      const m = await stunQueryTcp(s, { timeoutMs: 3000 });
      if (!m) continue;
      // Cổng lấy từ CẤU HÌNH, không lấy từ phép đo: phép đo đi bằng một cổng tuỳ ý nên cổng nó
      // báo về là cổng của chính nó, vô dụng với máy kia. Thứ máy kia phải gọi vào là **cổng kênh**
      // của máy này — và nó đúng ở ngoài vì NAT đo được là GIỮ NGUYÊN cổng nguồn (`§6e`).
      extAddr = { host: m.ip, port: localPort, at: Date.now() };
      return externalAddress();
    }
    return externalAddress();
  } catch {
    return externalAddress();
  } finally {
    extBusy = false;
  }
}

// ── CHỖ CHỜ ĐỤC LỖ — "slot" mà bên dán mã trước mở ra để bên kia tới lúc nào cũng gặp ─────────
/**
 * 🔴 **Vì sao phải có, và vì sao nó là TRẠNG THÁI NỀN chứ không phải một cú bấm.**
 *
 * Bản đầu của lớp đục lỗ chạy ~20 giây rồi trả kết quả, nên hai máy phải bấm *gần như cùng lúc*.
 * User bác đúng chỗ đó: *"ai lại canh đi bấm cùng lúc"* · *"phải tạo sẵn slot chờ để bên kia
 * nhận chứ"*. Họ đúng, và đó là lỗ thiết kế, không phải cách dùng sai.
 *
 * Điều kiện vật lý không đổi được: NAT chỉ cho gói của máy kia vào **sau khi ta đã gửi ra** địa
 * chỉ của nó, nên phải bắn đều đặn để giữ lỗ mở. Thứ sai là **thời lượng**: giữ lỗ là việc của
 * daemon (tiến trình vốn đã sống), không phải của một lần bấm. Nên: bấm Kết nối = **mở một chỗ
 * chờ**; bên kia bấm lúc nào cũng gặp trong vòng một hai vòng.
 *
 * Hai máy đều mở chỗ chờ thì càng chắc — đồng hồ hai bên tự do nên hai nửa *bắn/nghe* trôi lệch
 * nhau và chắc chắn có lúc chồng lên nhau. Pha so le theo vân tay (`dialsFirst`) lo đúng một ca
 * còn lại: hai bên tình cờ khởi động cùng một khoảnh khắc.
 *
 * Nhịp CHỜ cố ý loãng hơn nhịp BẮN của lượt ngắn (`retryMs` ~300 ms thay vì 40 ms): giữ một cái
 * lỗ trong nhiều phút không cần bắn dồn dập, và nó phải rẻ đủ để nằm trong daemon.
 */
export interface PunchWaitInfo {
  /** Vân tay máy đang chờ — để bề mặt nói ĐANG chờ ai, không nói chung chung. */
  peerId: string;
  addr: string;
  since: string;
  /** Đã qua bao nhiêu vòng — con số DUY NHẤT chứng minh nó còn sống, không phải cờ `true`. */
  rounds: number;
  /** Có kết cục rồi thì giữ lại để bề mặt nói xong/hỏng, không im lặng biến mất. */
  outcome?: { won: "goi" | "nhan" | null; error?: string; at: string; received: number; sent: number };
}

let punchWait: { info: PunchWaitInfo; stopped: boolean } | null = null;

/** Chỗ chờ hiện tại (kể cả đã có kết cục), hoặc `null` khi chưa ai mở. */
export function punchWaitState(): PunchWaitInfo | null {
  return punchWait ? { ...punchWait.info } : null;
}

/** Đóng chỗ chờ. Rút lại được cú bấm của mình là điều kiện để nó không thành một cái bẫy. */
export function cancelPunchWait(): void {
  if (punchWait) punchWait.stopped = true;
  punchWait = null;
}

/**
 * Mở chỗ chờ tới một máy. Gọi lại ⇒ **thay** chỗ cũ (một lúc một chỗ chờ, không xếp hàng ngầm —
 * hai vòng đục lỗ cùng giữ một cổng là tự chặn nhau).
 *
 * Trả về NGAY: người bấm thấy *"đang chờ"*, không đứng nhìn một thanh chạy 20 giây rồi nhận lỗi.
 */
export function armPunchWait(o: {
  /**
   * Máy cần gặp. **`null` = GIỮ LỖ MỞ mà không biết máy kia ở đâu** — nửa *bắn* nhắm một server
   * công khai chỉ để tạo ánh xạ, nửa *nghe* vẫn bind đúng cổng đục lỗ.
   *
   * 🔴 Đây là đường **MỘT BÊN DÁN**: A giữ lỗ, B dán mã của A (mã mang địa chỉ ngoài của A) rồi gọi
   * vào. NAT của A lọc KHÔNG phụ thuộc đích ⇒ gói của B vào được và A không cần biết B là ai. Lọc
   * phụ thuộc địa chỉ ⇒ không vào được, và lúc đó mới cần dán cả hai bên.
   * ⚠ **Thuộc tính đó CHƯA ĐO ĐƯỢC từ một máy** (`§6e`: server 5780 duy nhất không tuân
   * CHANGE-REQUEST) ⇒ dựng đường này là để HAI MÁY THẬT trả lời, không phải để khẳng định nó chạy.
   */
  target: { host: string; port: number; deviceId?: string } | null;
  shareKey: string;
  appVersion: string;
  allowedPeers: string[];
  wantPair?: boolean;
  localPort: number;
  /** Trần thời gian chờ. Vô hạn là một cái bẫy: lỗ giữ mãi mà không ai nói cho người dùng biết. */
  waitMs?: number;
  roundMs?: number;
  retryMs?: number;
  onPaired?: (peerDeviceId: string) => void;
  onReceived?: (blocks: number) => void;
  log?: (msg: string) => void;
}): PunchWaitInfo {
  cancelPunchWait();
  const log = o.log ?? (() => {});
  const roundMs = o.roundMs ?? 2000;
  const waitMs = o.waitMs ?? 10 * 60_000;
  const info: PunchWaitInfo = {
    peerId: o.target?.deviceId ?? "",
    // RỖNG = không nhắm máy nào (đang giữ lỗ mở). Trường này là DỮ LIỆU, không phải một câu:
    // backend không soạn chữ tiếng Việt cho UI — chữ đi qua i18n (`§Ngôn ngữ`, audit 07/09 #3).
    addr: o.target ? `${o.target.host}:${o.target.port}` : "",
    since: new Date().toISOString(),
    rounds: 0,
  };
  const slot = { info, stopped: false };
  punchWait = slot;
  log(
    o.target
      ? `[channel] mở chỗ chờ đục lỗ tới ${info.addr} — bên kia bấm lúc nào cũng gặp, không cần cùng lúc`
      : `[channel] giữ lỗ mở ở cổng ${o.localPort} — máy nào có mã của máy này đều gọi vào được`,
  );

  // Không biết máy kia ⇒ bắn ra một đích CÔNG KHAI chỉ để tạo ánh xạ. Đích là gì không quan trọng;
  // thứ quan trọng là NAT thấy một gói ĐI RA từ cổng này. Địa chỉ tài liệu RFC 5737 thì không ai
  // trả lời (đủ để mở ánh xạ), nhưng dùng một server STUN THẬT thì gói còn được hồi đáp nên ánh xạ
  // sống lâu hơn — và nó vốn đã nằm trong danh sách công khai của `stun.ts`.
  const hold = { host: "203.0.113.1", port: 9, deviceId: o.target?.deviceId };

  void punchToPeer(o.target ?? hold, {
    channelDir: channelPen(currentStoreRoot()),
    identity: channelIdentity(),
    shareKey: o.shareKey,
    appVersion: o.appVersion,
    allowedPeers: o.allowedPeers,
    wantPair: o.wantPair,
    onPaired: o.onPaired,
    localPort: o.localPort,
    rounds: Math.max(1, Math.ceil(waitMs / roundMs)),
    roundMs,
    retryMs: o.retryMs ?? 300,
    // Chốt dừng gồm CẢ phép so danh tính chỗ chờ: mở chỗ mới thì vòng cũ phải tự rút, nếu không
    // hai vòng cùng giành một cổng và cả hai cùng trượt.
    shouldStop: () => slot.stopped || punchWait !== slot,
    onRound: ({ round }) => {
      slot.info.rounds = round;
    },
  })
    .then((r) => {
      slot.info.outcome = {
        won: r.won,
        error: r.error,
        at: new Date().toISOString(),
        received: r.receivedBlocks,
        sent: r.sentBlocks,
      };
      log(
        r.won
          ? `[channel] chỗ chờ GẶP máy ${r.peerDeviceId ?? "(không rõ)"} sau ${r.rounds} vòng — nhận ${r.receivedBlocks} khối · gửi ${r.sentBlocks}`
          : `[channel] chỗ chờ đóng sau ${r.rounds} vòng: ${r.error ?? "không rõ"}`,
      );
      if (r.receivedBlocks > 0) o.onReceived?.(r.receivedBlocks);
    })
    .catch((e) => {
      slot.info.outcome = { won: null, error: String(e).slice(0, 140), at: new Date().toISOString(), received: 0, sent: 0 };
      log(`[channel] chỗ chờ lỗi: ${String(e).slice(0, 140)}`);
    });

  return { ...info };
}


/** Tiền tố mã máy. Đổi bản là đổi tiền tố — máy cũ nhận ra ngay là không đọc được, không đoán. */
const CODE_PREFIX = "ZM1.";
export interface MachineCode {
  fingerprint: string;
  /**
   * Địa chỉ NGOÀI mà máy tự đo được bằng STUN. Vắng ⇒ mã chỉ dùng được khi hai máy CÙNG MẠNG.
   *
   * 🔴 **Vì sao mã mang địa chỉ LẠI, sau khi đã gỡ hôm `[2026-09-21c]`.** Vế bị gỡ là **địa chỉ
   * LAN**, và lý do là nó đổi (đo: `.90 → .81 → .6` trong một ngày) **và tầng dò LAN làm việc đó tốt
   * hơn** — nó thấy địa chỉ HIỆN TẠI. Lý do đó **không áp cho địa chỉ ngoài**: khác mạng thì không có
   * tầng dò nào thay được, nên mã là chỗ DUY NHẤT chở được nó.
   *
   * Đây đúng mô hình user chốt 2026-09-13: *"ID chính là bộ khai báo IP, chỉ là IP không lộ ra bên
   * ngoài thôi — vẫn liên kết trực tiếp được"*. Người dùng dán MỘT chuỗi, không bao giờ thấy một IP.
   *
   * ⚠ **Chỉ nhận địa chỉ CÔNG KHAI.** Nhét một địa chỉ dải riêng vào đây là tái tạo đúng cái bẫy
   * `[2026-09-21c]` vừa gỡ: nó vô dụng ở mạng khác và hết hạn nhanh. Có ca ÂM giữ.
   */
  external?: { host: string; port: number };
}

/** Kiểu địa chỉ trong mã. Byte này là byte `0` bỏ không từ thời relay — dùng lại, không nới khuôn. */
const CODE_ADDR_NONE = 0;
const CODE_ADDR_IPV4 = 1;

/**
 * Bốn byte của một địa chỉ IPv4 **CÔNG KHAI**, hoặc `null`.
 *
 * Loại thẳng loopback · dải riêng (10/8 · 172.16/12 · 192.168/16) · link-local (169.254/16) ·
 * CGNAT (100.64/10). Một địa chỉ như thế trong mã không giúp được ca khác mạng, mà lại làm người
 * dùng tin là giúp — bề mặt nói dối bằng dữ liệu thay vì bằng chữ.
 */
export function publicIpv4Bytes(host: string): Buffer | null {
  const parts = host.trim().split(".");
  if (parts.length !== 4) return null;
  const n = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
  if (n.some((x) => x < 0 || x > 255)) return null;
  const [a, b] = n;
  if (a === 0 || a === 127 || a === 10) return null;
  if (a === 172 && b >= 16 && b <= 31) return null;
  if (a === 192 && b === 168) return null;
  if (a === 169 && b === 254) return null;
  if (a === 100 && b >= 64 && b <= 127) return null;
  if (a >= 224) return null; // multicast + dự trữ
  return Buffer.from(n);
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
  const ip = m.external ? publicIpv4Bytes(m.external.host) : null;
  const port = m.external?.port ?? 0;
  if (!ip || !(port > 0 && port <= 65535)) {
    return CODE_PREFIX + base32(Buffer.concat([Buffer.from([1]), fp, Buffer.from([CODE_ADDR_NONE])]));
  }
  const tail = Buffer.alloc(7);
  tail.writeUInt8(CODE_ADDR_IPV4, 0);
  ip.copy(tail, 1);
  tail.writeUInt16BE(port, 5);
  return CODE_PREFIX + base32(Buffer.concat([Buffer.from([1]), fp, tail]));
}
/** Đọc mã máy. Không phải mã ⇒ `null` (để nơi gọi rơi về nhánh địa chỉ trần), KHÔNG ném. */
export function parseMachineCode(raw: string): MachineCode | null {
  const s = raw.trim();
  if (!s.startsWith(CODE_PREFIX)) return null;
  const buf = unbase32(s.slice(CODE_PREFIX.length).replace(/[^A-Za-z0-9]/g, "").toUpperCase());
  if (!buf || buf.length < 34 || buf.readUInt8(0) !== 1) return null;
  const out: MachineCode = { fingerprint: deviceIdFromBytes(buf.subarray(1, 33)) };
  // Mã KHÔNG mang địa chỉ vẫn hợp lệ — đó là mã của một máy chưa đo được địa chỉ ngoài, và ca
  // cùng mạng không cần nó. Đọc thêm CHỈ khi byte kiểu nói có, và chỉ khi địa chỉ là CÔNG KHAI.
  if (buf.readUInt8(33) === CODE_ADDR_IPV4 && buf.length >= 40) {
    const host = Array.from(buf.subarray(34, 38)).join(".");
    const port = buf.readUInt16BE(38);
    if (publicIpv4Bytes(host) && port > 0) out.external = { host, port };
  }
  return out;
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
  if (!getP2pEnabled()) {
    // Bất biến: TẮT kênh là tắt MỌI thứ của kênh. Để một chỗ chờ sống sau khi người dùng gạt tắt
    // là giữ lỗ NAT mở cho một kênh họ vừa tắt — đúng kiểu công tắc không tắt thật mà §F15 cấm.
    cancelPunchWait();
    return { listening: false, reason: "kênh đang TẮT" };
  }
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

    // Đo địa chỉ ngoài ở NỀN để mã máy mang được nó ngay từ lượt vẽ đầu (fail-open).
    void refreshExternalAddress(server.port);

    // GIỮ LỖ MỞ — đường MỘT BÊN DÁN. Bật kênh là máy này tự mở một lỗ trên cổng đục lỗ, nên máy nào
    // có mã của nó đều gọi vào được mà máy này không cần biết trước là ai. Không đè một chỗ chờ
    // người dùng đang nhắm tới một máy cụ thể — cái đó đang làm việc cụ thể hơn.
    const cur = punchWaitState();
    if (!cur || cur.outcome || !cur.peerId) {
      armPunchWait({
        target: null,
        shareKey: key,
        appVersion: o.appVersion,
        allowedPeers: peers,
        localPort: punchPortOf(server.port),
        log,
        onPaired: (peerId: string): void => {
          o.acceptPeer?.(peerId);
        },
        onReceived: o.onReceived,
      });
    }
    return { listening: true, port: server.port };
  } catch (e) {
    const reason = e instanceof Error ? e.message.slice(0, 120) : "không mở được cổng";
    log(`[channel] KHÔNG nghe được cổng ${port}: ${reason}`);
    return { listening: false, reason };
  }
}

/** Đóng máy chủ kênh nếu đang chạy. An toàn khi gọi lúc không có gì chạy. */
export function stopChannelServer(): void {
  // ĐÓNG là đóng MỌI thứ của kênh, kể cả chỗ chờ đang giữ lỗ. Thiếu dòng này thì một lượt bật-rồi-
  // tắt để lại một vòng đục lỗ chạy 10 phút: trong daemon là giữ lỗ NAT cho một kênh đã tắt, và
  // trong một TIẾN TRÌNH TEST thì bộ hẹn giờ của nó giữ event loop sống ⇒ **cổng treo 10 phút**.
  // Bắt được đúng như vậy khi lượt quét đầy đủ đứng im ở nhóm `p2p-channel`.
  cancelPunchWait();
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

