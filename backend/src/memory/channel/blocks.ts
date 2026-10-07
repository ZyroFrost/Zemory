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
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { MAX_FRAME_BYTES } from "./wire.js";
import {
  acquireChannelWriteLock,
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

/** Block id of a bare bundle (not yet inside a container): the same `kdf.salt` `chunkBlockId` reads. */
function bundleBlockId(bytes: Buffer): string | null {
  const firstNl = bytes.indexOf(10, 0);
  const secondNl = firstNl >= 0 ? bytes.indexOf(10, firstNl + 1) : -1;
  if (firstNl < 0 || secondNl < 0 || secondNl - firstNl > 64 * 1024) return null;
  try {
    const salt = (JSON.parse(bytes.subarray(firstNl + 1, secondNl).toString("utf8")) as { kdf?: { salt?: unknown } })?.kdf?.salt;
    return typeof salt === "string" && salt.length > 0 ? salt : null;
  } catch {
    return null;
  }
}

/** Ids already in the channel ROOT — the one container (legacy pens excluded on purpose). */
function rootIds(channelDir: string): Set<string> {
  const ids = new Set<string>();
  const root = resolve(channelDir);
  for (const b of inventory(channelDir)) if (resolve(dirname(b.segment)) === root) ids.add(b.id);
  return ids;
}

/** Append one bundle file to the root's open segment. Caller holds the channel write lock. */
function appendToRoot(channelDir: string, part: string): { segment: string; chunks: number } {
  mkdirSync(channelDir, { recursive: true }); // only a WRITE creates the folder (see `channelDir()`)
  const target = activeChannelSegment(channelDir).path;
  const before = isContainer(target) ? listContainerChunks(target).length : 0;
  return { segment: target, chunks: appendChunkVerified(target, part, before + 1) };
}

/**
 * Append a block RECEIVED from another machine to the ONE container at the channel root.
 *
 * Goes through `acquireChannelWriteLock` — the same queue our own export uses (plan/24 §4). Without it
 * the daemon (receiving) and the sync child (exporting) appended to the same segment at the same time,
 * and `appendChunkVerified` of one side truncated the other side's block away. Then through
 * `appendChunkVerified` for the measure-after-write + cut-the-tail layer (plan/08 §8d).
 *
 * A block the root already holds is skipped: waiting in the queue can let the same block arrive twice.
 */
export async function appendReceivedBlock(
  channelDir: string,
  bytes: Buffer,
): Promise<{ segment: string; chunks: number; skipped?: boolean }> {
  const tmp = mkdtempSync(join(tmpdir(), "zemory-rx-"));
  const part = join(tmp, "block.enc");
  try {
    writeFileSync(part, bytes);
    // A real write ⇒ the folder may be created now — and must be BEFORE the lock, whose file lives in it
    // (the first block a fresh machine ever receives otherwise dies with ENOENT on the lock file).
    mkdirSync(channelDir, { recursive: true });
    const release = await acquireChannelWriteLock(channelDir);
    try {
      const id = bundleBlockId(bytes);
      if (id && rootIds(channelDir).has(id)) return { segment: "", chunks: 0, skipped: true };
      return appendToRoot(channelDir, part);
    } finally {
      release();
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export interface AbsorbPensResult {
  /** Blocks only a legacy pen held, now appended to the root (or that WOULD be, on a dry run). */
  copied: number;
  bytes: number;
  /** Pen blocks the root already had — nothing to do. */
  present: number;
  /** Blocks too large for one frame (old whole-store baselines). Not copied: the root already carries
   *  that content as its own baseline, and copying would put the same store into the channel twice. */
  oversize: { segment: string; bytes: number }[];
  pens: string[];
}

/**
 * Step ④ of plan/24 §4: move what only a legacy pen holds INTO the root container.
 *
 * Additive only — appends, never deletes. Pens are left in place (removing them is step ⑤: both
 * machines on the new version, rehearsal proves root ⊇ pen, the user confirms). The block keeps its id,
 * so the other machine sees no new block and transfers nothing: only the local layout changes.
 * Idempotent: a second run finds every pen block present and copies 0.
 */
export async function absorbLegacyPens(channelDir: string, o: { dryRun?: boolean } = {}): Promise<AbsorbPensResult> {
  const out: AbsorbPensResult = { copied: 0, bytes: 0, present: 0, oversize: [], pens: [] };
  let pens: string[];
  try {
    pens = readdirSync(channelDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(channelDir, d.name));
  } catch {
    return out; // no channel yet ⇒ nothing to absorb
  }
  if (pens.length === 0) return out;
  out.pens = pens;
  const release = o.dryRun ? () => {} : await acquireChannelWriteLock(channelDir);
  try {
    const have = rootIds(channelDir);
    for (const pen of pens) {
      for (const seg of listChannelSegments(pen)) {
        if (!isContainer(seg.path)) continue;
        for (const chunk of listContainerChunks(seg.path)) {
          const id = chunkBlockId(seg.path, chunk);
          if (!id) continue; // cannot name it ⇒ do not guess; the pen still serves it
          if (have.has(id)) {
            out.present++;
            continue;
          }
          if (chunk.len > MAX_FRAME_BYTES) {
            out.oversize.push({ segment: seg.path, bytes: chunk.len });
            continue;
          }
          have.add(id);
          out.copied++;
          out.bytes += chunk.len;
          if (o.dryRun) continue;
          const tmp = mkdtempSync(join(tmpdir(), "zemory-absorb-"));
          try {
            const part = join(tmp, "block.enc");
            await extractContainerChunk(seg.path, chunk, part);
            appendToRoot(channelDir, part);
          } finally {
            rmSync(tmp, { recursive: true, force: true });
          }
        }
      }
    }
  } finally {
    release();
  }
  return out;
}
