/**
 * KIỂM KÊ KHỐI của một thư mục kênh (plan/24 §7c ①).
 *
 * Trả lời đúng một câu: *"máy này đang có những khối nào"* — bằng **TẬP DANH TÍNH**,
 * không bao giờ bằng `khúc#chỉ số`. Đó là bất biến mà HP điều 16 (sửa đổi
 * 2026-09-13) chuyển sang: hai máy phải có CÙNG TẬP KHỐI, thứ tự byte thì cục bộ.
 *
 * Đọc rẻ: mỗi khối chỉ chạm 64 KB đầu để lấy `kdf.salt` trong header plaintext —
 * KHÔNG giải mã. Đo (plan/24 §6b): 50 khối ⇒ danh sách 2,0 KB.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_FRAME_BYTES } from "./wire.js";
import {
  chunkBlockId,
  listChannelSegments,
  listContainerChunks,
  extractContainerChunk,
  activeChannelSegment,
  appendChunkVerified,
  isContainer,
  type ContainerChunk,
} from "../share.js";

export interface BlockRef {
  /** `kdf.salt` — bền xuyên máy, độc lập vị trí. */
  id: string;
  segment: string;
  chunk: ContainerChunk;
}

/**
 * Mọi khối trong thư mục kênh, kèm danh tính.
 * Khối không đọc được salt bị BỎ QUA khỏi kiểm kê — ta không khai thứ mình không
 * định danh được, vì khai bừa là nói với máy kia "tôi đã có" cho một thứ ta không
 * nhận ra (fail-open đúng chiều: thà nhận lại một khối còn hơn mất nó).
 */
/**
 * Đệm kiểm kê theo TỪNG khúc, khoá bằng (kích thước, mtime). Kiểm kê chạy ĐỒNG BỘ trên event loop mỗi
 * lần hỏi trạng thái kênh (15 s một lần) và mỗi lượt đồng bộ; nó đọc 64 KB đầu của MỌI khối — đo
 * 25/09: 163 khối ≈ 109 ms mỗi lần. Khúc chỉ NỐI THÊM (HP điều 16) nên (kích thước, mtime) không đổi
 * nghĩa là danh sách khối của khúc không đổi.
 */
const segCache = new Map<string, { size: number; mtimeMs: number; refs: BlockRef[] }>();

export function inventory(channelDir: string): BlockRef[] {
  const out: BlockRef[] = [];
  for (const seg of listChannelSegments(channelDir)) {
    if (!isContainer(seg.path)) continue;
    let st: { size: number; mtimeMs: number } | null;
    try {
      st = statSync(seg.path);
    } catch {
      st = null;
    }
    const hit = st ? segCache.get(seg.path) : undefined;
    if (st && hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs) {
      out.push(...hit.refs);
      continue;
    }
    const refs: BlockRef[] = [];
    for (const chunk of listContainerChunks(seg.path)) {
      // 🔴 KHÔNG khai khối lớn hơn một khung. Cùng nguyên tắc với dòng trên: **đừng khai thứ mình
      // không giao được**. Khối vượt `MAX_FRAME_BYTES` thì không khung nào chứa nổi, nên khai nó
      // là nói với máy kia *"tôi có"* cho một thứ ta vĩnh viễn không gửi được — và tệ hơn, máy kia
      // đọc `have` của ta rồi **thôi không gửi khối đó cho ta nữa**, nên hai bên cùng nghĩ bên kia
      // đã có. Ca thật: baseline đời cũ 2,4–2,5 GB nằm trong ngăn kênh (đo 23/09).
      if (chunk.len > MAX_FRAME_BYTES) continue;
      const id = chunkBlockId(seg.path, chunk);
      if (id) refs.push({ id, segment: seg.path, chunk });
    }
    if (st) segCache.set(seg.path, { size: st.size, mtimeMs: st.mtimeMs, refs });
    out.push(...refs);
  }
  return out;
}

/** Tập danh tính — thứ đi trên dây trong tin `have`. */
export function inventoryIds(channelDir: string): string[] {
  return [...new Set(inventory(channelDir).map((b) => b.id))];
}

/** Khối mình có mà bên kia KHÔNG khai ⇒ phần phải chở. */
export function missingOnPeer(channelDir: string, peerIds: Iterable<string>): BlockRef[] {
  const theirs = new Set(peerIds);
  const seen = new Set<string>();
  const out: BlockRef[] = [];
  for (const b of inventory(channelDir)) {
    if (theirs.has(b.id) || seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  return out;
}

/** Đọc trọn byte của một khối để chở đi. */
export async function readBlockBytes(block: BlockRef): Promise<Buffer> {
  const tmp = mkdtempSync(join(tmpdir(), "zemory-tx-"));
  const part = join(tmp, "block.enc");
  try {
    await extractContainerChunk(block.segment, block.chunk, part);
    const { readFileSync } = await import("node:fs");
    return readFileSync(part);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Nối một khối NHẬN ĐƯỢC vào khúc đang mở của MÁY NÀY.
 * Đi qua `appendChunkVerified` của `share.ts` để thừa hưởng nguyên lớp
 * đo-lại-sau-khi-ghi + cắt-đuôi-khi-trượt (plan/08 §8d) — không tự chế đường ghi.
 */
export async function appendReceivedBlock(channelDir: string, bytes: Buffer): Promise<{ segment: string; chunks: number }> {
  const tmp = mkdtempSync(join(tmpdir(), "zemory-rx-"));
  const part = join(tmp, "block.enc");
  try {
    writeFileSync(part, bytes);
    mkdirSync(channelDir, { recursive: true }); // chỗ GHI mới tạo thư mục (xem `channelDir()`)
    const target = activeChannelSegment(channelDir).path;
    const before = isContainer(target) ? listContainerChunks(target).length : 0;
    const after = appendChunkVerified(target, part, before + 1);
    return { segment: target, chunks: after };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
