/**
 * Cửa vào của lớp kênh máy-tới-máy (plan/24).
 *
 * Gom đường dẫn + cấu hình lại một chỗ để CLI, daemon và bề mặt UI cùng gọi MỘT
 * hàm — không nơi nào tự ghép đường hay tự đọc setting lần nữa (đó là cách hai bề
 * mặt của cùng một chức năng lệch nhau, bài học `zemory sweep` 12/09).
 */
import { join } from "node:path";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { currentMemoryDir, currentStoreRoot } from "../db.js";
import { getP2pEnabled, getP2pPeers, getP2pPort, getSyncTransport } from "../../config/settings.js";
import { loadOrCreateIdentity, type ChannelIdentity } from "./identity.js";
import { serveChannel, type ChannelServer, type SyncOutcome } from "./peer.js";

export * from "./identity.js";
export * from "./wire.js";
export * from "./blocks.js";
export * from "./peer.js";
export * from "./discovery.js";
export * from "./portmap.js";

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
  return getSyncTransport() === "p2p" ? channelDir(storeRoot, true) : null;
}

/** Bản ghi một máy chủ kênh đang chạy trong tiến trình này. */
let running: { server: ChannelServer; port: number } | null = null;

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
 * BA CỬA TỪ CHỐI, theo thứ tự, và mỗi cửa nói rõ lý do thay vì im lặng không nghe:
 *  ① `p2pEnabled` tắt ⇒ không nghe (mặc định của mọi máy);
 *  ② chưa ghép đôi máy nào ⇒ không nghe — mở một cổng mà từ chối mọi người là mở vô ích, và nó
 *    làm bề mặt trông như đang sẵn sàng trong khi không ai vào được;
 *  ③ chưa có chìa share ⇒ không nghe, vì phép chứng minh cùng chìa (`plan/24 §7c ②`) là thứ
 *    chặn hai kho LẠ chở khối cho nhau.
 *
 * Gọi lại khi đang chạy ⇒ đóng bản cũ rồi mở lại theo cấu hình mới (người dùng vừa đổi cổng
 * hoặc vừa ghép thêm máy). Fail-open (điều 9): cổng bận/đang bị chiếm ⇒ trả `reason`, KHÔNG
 * ném — một lỗi ở lớp phụ không được phép làm chết daemon.
 */
export async function startChannelServer(o: {
  shareKey?: string | null;
  appVersion: string;
  onReceived?: (blocks: number) => void;
  log?: (msg: string) => void;
} ): Promise<ChannelServeResult> {
  const log = o.log ?? (() => {});
  stopChannelServer();
  if (!getP2pEnabled()) return { listening: false, reason: "kênh đang TẮT" };
  const peers = getP2pPeers();
  if (!peers.length) return { listening: false, reason: "chưa ghép đôi máy nào" };
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
        channelDir: channelDir(currentStoreRoot()),
        identity: channelIdentity(),
        shareKey: key,
        appVersion: o.appVersion,
        allowedPeers: peers,
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
    running = { server, port: server.port };
    log(`[channel] đang nghe cổng ${server.port} · nhận từ ${peers.length} máy đã ghép đôi`);
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
    running.server.close();
  } catch {
    /* đóng được thì tốt */
  }
  running = null;
}

/** Cổng đang nghe, `null` nếu không nghe — cho bề mặt nói đúng trạng thái THẬT. */
export function channelServingPort(): number | null {
  return running?.port ?? null;
}
