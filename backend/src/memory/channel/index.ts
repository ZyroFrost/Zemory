/**
 * Cửa vào của lớp kênh máy-tới-máy (plan/24).
 *
 * Gom đường dẫn + cấu hình lại một chỗ để CLI, daemon và bề mặt UI cùng gọi MỘT
 * hàm — không nơi nào tự ghép đường hay tự đọc setting lần nữa (đó là cách hai bề
 * mặt của cùng một chức năng lệch nhau, bài học `zemory sweep` 12/09).
 */
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { currentMemoryDir } from "../db.js";
import { getP2pEnabled, getP2pPeers, getP2pPort, getSyncTransport } from "../../config/settings.js";
import { loadOrCreateIdentity, type ChannelIdentity } from "./identity.js";

export * from "./identity.js";
export * from "./wire.js";
export * from "./blocks.js";
export * from "./peer.js";
export * from "./discovery.js";
export * from "./portmap.js";

/** Thư mục KHÚC của kênh p2p — trong cây repo (HP điều 14), gitignore theo `data/`. */
export function channelDir(memoryDir = currentMemoryDir()): string {
  const dir = join(memoryDir, "channel");
  mkdirSync(dir, { recursive: true });
  return dir;
}
/** Nhà của chứng chỉ + khoá riêng của máy. Nằm cạnh khúc, đi theo kho khi `relocate`. */
export function identityDir(memoryDir = currentMemoryDir()): string {
  const dir = join(channelDir(memoryDir), "identity");
  mkdirSync(dir, { recursive: true });
  return dir;
}
export function channelIdentity(memoryDir = currentMemoryDir()): ChannelIdentity {
  return loadOrCreateIdentity(identityDir(memoryDir));
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

export function channelStatus(memoryDir = currentMemoryDir()): ChannelStatus {
  return {
    enabled: getP2pEnabled(),
    transport: getSyncTransport(),
    deviceId: channelIdentity(memoryDir).deviceId,
    port: getP2pPort(),
    peers: getP2pPeers(),
    dir: channelDir(memoryDir),
  };
}
