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
export function channelDir(storeRoot = currentStoreRoot()): string {
  const dir = join(storeRoot, "channel");
  mkdirSync(dir, { recursive: true });
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
