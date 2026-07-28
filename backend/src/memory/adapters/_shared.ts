// Small filesystem + text helpers shared by adapters.

import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ParsedAttachment, TranscriptFile } from "./types.js";

// GỠ 2026-07-26: `clip()` từng cắt cụt mọi block > 4.000 ký tự.
//
// Vì sao gỡ: `plan/06 §6` khai lớp `messages` là lớp **ĐẦY** ("digest (mỏng) → anchor →
// messages (đầy)"), digest mới là lớp lọc. Nhưng clip() cắt thẳng vào lớp đầy, và cắt MÙ —
// không phân biệt trùng / rác / secret, chỉ xét độ dài. Bốn tầng lọc còn lại đều CÓ LÝ DO và
// được giữ: dedup `UNIQUE(session_id,uuid)` · `redact()` · bỏ dòng rỗng/không-parse-được ·
// bỏ `thinking` (nguồn vốn rỗng, xem 05_TODO).
//
// Đo trước khi gỡ (374 transcript · 83.337 block · 92,7 MB): **95,25% block < 4k**, chỉ
// **4,75% bị cắt**, block lớn nhất **1,30 MB** — không có ca bệnh lý nào ⇒ bỏ cap an toàn.
// Mất mát đang gánh: **16,8% khối lượng lớp full**.
//
// Rủi ro còn lại (ghi rõ, không giấu): giờ KHÔNG còn trần nào. Một lần paste/tool-dump khổng
// lồ sẽ vào DB nguyên vẹn. Chấp nhận có chủ đích — "đầy" là yêu cầu của chuẩn; muốn chặn ca
// bệnh lý thì thêm trần CAO (vd 8 MB) chứ đừng quay lại cắt ở 4k.

/** Trần blob một đính kèm. Vượt ⇒ hạ xuống `ref` (ghi nhận từng có), KHÔNG bỏ im lặng. */
export const MAX_BLOB_BYTES = 8 * 1024 * 1024;

/**
 * Một block nội dung → đính kèm, cho MỌI adapter (một định nghĩa duy nhất — trước đây
 * chỉ `claude.ts` biết đọc ảnh, và 4 adapter còn lại bỏ im lặng mọi block không phải text:
 * `chatgpt` lọc `typeof p === "string"`, `continue`/`lmstudio` chỉ lấy `.text`. Đó đúng là
 * họ lỗi đã làm mất 93 MB ảnh ở lớp Claude Code).
 *
 * Ba hình dạng ĐÃ ĐƯỢC KHAI trong hợp đồng công khai của nền:
 *  ① Anthropic  `{type:'image', source:{type:'base64', media_type, data}}` — đo thật, 678 ảnh.
 *  ② OpenAI     `{type:'image_url', image_url:{url:'data:<mime>;base64,<data>'}}`.
 *  ③ ChatGPT export `{content_type:'image_asset_pointer', asset_pointer:'file-service://…'}`
 *     — KHÔNG có bytes trong file export ⇒ `kind:'ref'`: thà ghi nhận "từng có ảnh ở đây"
 *     còn hơn để nó biến mất không dấu vết.
 * Hình dạng lạ ⇒ `null` (người gọi giữ nguyên hành vi cũ), KHÔNG đoán bừa.
 */
export function imageAttachment(block: unknown): ParsedAttachment | null {
  if (!block || typeof block !== "object") return null;
  const b = block as Record<string, any>;

  let b64: string | undefined;
  let mime = "application/octet-stream";

  const src = b.source;
  if (src && typeof src === "object" && src.type === "base64" && typeof src.data === "string" && src.data) {
    b64 = src.data;
    if (typeof src.media_type === "string") mime = src.media_type;
  } else if (b.type === "image_url" || b.image_url) {
    const url = typeof b.image_url === "string" ? b.image_url : b.image_url?.url;
    const m = typeof url === "string" ? url.match(/^data:([^;,]+);base64,(.+)$/s) : null;
    if (m) {
      mime = m[1];
      b64 = m[2];
    }
  } else if (b.content_type === "image_asset_pointer" || typeof b.asset_pointer === "string") {
    const ptr = typeof b.asset_pointer === "string" ? b.asset_pointer : "";
    if (!ptr) return null;
    const bytes = Number(b.size_bytes) || 0;
    return {
      mime: "image/*",
      bytes,
      // Không có nội dung ⇒ băm CON TRỎ để hai lần gặp cùng ảnh vẫn dedup về một hàng.
      sha256: createHash("sha256").update("asset:" + ptr).digest("hex"),
      kind: "ref",
      srcPath: ptr,
    };
  }
  if (!b64) return null;

  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  if (!buf.length) return null;
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (buf.length > MAX_BLOB_BYTES) return { mime, bytes: buf.length, sha256, kind: "ref" };
  return { mime, bytes: buf.length, sha256, kind: "blob", blob: buf };
}

/** Nhãn một dòng để lại trong `content` — người đọc và FTS vẫn thấy "có ảnh ở đây". */
export function imageLabel(a: ParsedAttachment): string {
  return `[image:${a.mime ?? "?"} ${(a.bytes / 1024).toFixed(0)}KB ${a.sha256.slice(0, 12)}]`;
}

export function safeReaddir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

export function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return undefined;
  }
}

export function isDir(p: string): boolean {
  return safeStat(p)?.isDirectory() ?? false;
}

export function toTranscript(source: string, path: string): TranscriptFile | null {
  const st = safeStat(path);
  if (!st || !st.isFile()) return null;
  return { source, path, size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
}

/** Recursively collect files matching `ext` (without dot), up to `depth` levels. */
export function walkFiles(root: string, ext: string, depth = 6): string[] {
  const out: string[] = [];
  const suffix = "." + ext;
  const rec = (dir: string, left: number): void => {
    for (const name of safeReaddir(dir)) {
      const p = join(dir, name);
      const st = safeStat(p);
      if (!st) continue;
      if (st.isDirectory()) {
        if (left > 0) rec(p, left - 1);
      } else if (name.endsWith(suffix)) {
        out.push(p);
      }
    }
  };
  rec(root, depth);
  return out;
}

/** Decode a file:// URI (Continue's workspaceDirectory) to a native path. */
export function decodeFileUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (!uri.startsWith("file://")) return uri;
  let p = decodeURIComponent(uri.replace(/^file:\/\//, ""));
  // "/d:/x" -> "d:\x" on Windows-style drive paths
  const m = p.match(/^\/([a-zA-Z]):\/(.*)$/);
  if (m) p = `${m[1]}:\\${m[2].replace(/\//g, "\\")}`;
  return p;
}
