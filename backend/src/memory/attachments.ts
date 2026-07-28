// Read side of the attachment layer: what the Recall surface needs to SHOW an image.
// Ingest side lives in `ingest.ts` (writeAttachments); the schema is in `db.ts` (v19).
import { currentMemoryDb, openMemory } from "./db.js";

/** One attachment WITHOUT its bytes — safe to embed in a JSON payload. */
export interface AttachmentMeta {
  id: number;
  sha256: string;
  mime: string | null;
  bytes: number;
  /** 'blob' = nội dung nhị phân có thật · 'text' · 'ref' = chỉ ghi nhận từng có. */
  kind: string;
  name: string | null;
}

/** Content-addressed lookup key. Anything else is rejected before touching SQL. */
const SHA_RE = /^[0-9a-f]{64}$/;

/**
 * Đính kèm của từng message, khoá theo message id.
 *
 * Ánh xạ tin ↔ đính kèm đọc từ **`attachment_link`**, KHÔNG từ `attachment.message_id`:
 * cột đó chỉ giữ tin ĐẦU TIÊN mang nội dung ấy (dedup theo `sha256` nên lần sau
 * `INSERT OR IGNORE` không ghi nữa). Đo trên DB thật 2026-07-28: `attachment.message_id`
 * phủ 566 tin, còn `attachment_link` phủ 724 — lấy nhầm cột là mất 22% số tin có ảnh.
 */
export function attachmentsFor(ids: number[], dbPath: string = currentMemoryDb()): Record<number, AttachmentMeta[]> {
  const out: Record<number, AttachmentMeta[]> = {};
  if (!ids.length) return out;
  const db = openMemory(dbPath);
  try {
    // Chia lô để không chạm trần SQLITE_MAX_VARIABLE_NUMBER khi thread dài.
    for (let i = 0; i < ids.length; i += 400) {
      const chunk = ids.slice(i, i + 400).filter((n) => Number.isInteger(n));
      if (!chunk.length) continue;
      const rows = db
        .prepare(
          `SELECT al.message_id AS mid, a.id AS id, a.sha256 AS sha256, a.mime AS mime,
                  a.bytes AS bytes, a.kind AS kind, COALESCE(al.name, a.name) AS name
             FROM attachment_link al JOIN attachment a ON a.id = al.attachment_id
            WHERE al.message_id IN (${chunk.map(() => "?").join(",")})
            ORDER BY al.message_id, a.id`,
        )
        .all(...chunk) as Array<AttachmentMeta & { mid: number }>;
      for (const r of rows) {
        const { mid, ...meta } = r;
        (out[mid] ??= []).push(meta);
      }
    }
    return out;
  } finally {
    db.close();
  }
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "text/plain": "txt",
};

/**
 * Tên file để tải về.
 *
 * TÊN GỐC hầu như KHÔNG tồn tại: đo 378 transcript thật / 889 block ảnh — không block nào
 * mang tên (Claude Code không ghi tên cho ảnh dán/chụp màn hình), 0/678 hàng có `name`.
 * Chỗ DUY NHẤT có tên thật là ảnh do tool `Read` đọc từ một file trên đĩa.
 *
 * Nên: có `name` thì dùng; KHÔNG có thì dựng tên của MÌNH — `zemory-<ngày>-<sha8>.<đuôi>` —
 * và gọi đúng tên nó là tên dự phòng, KHÔNG giả vờ đó là tên gốc. Ngày lấy từ tin ĐẦU TIÊN
 * mang đính kèm (mốc có nghĩa với người dùng), không phải lúc nạp.
 */
/** Ky tu cam trong ten file (Windows/POSIX) + moi ky tu DIEU KHIEN: ten nay di thang vao
 *  header `Content-Disposition`, mot byte dieu khien lot vao la che doi header. Duyet theo
 *  MA KY TU thay vi regex — viet dai dieu khien trong class regex vua kho doc vua de nuot
 *  nham (lint da bat dung ca do). */
const ILLEGAL_NAME_CHARS = new Set([...'\\/:*?"<>|']);

function safeFileName(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f || ILLEGAL_NAME_CHARS.has(ch) ? "_" : ch;
  }
  return out.trim();
}

function downloadName(name: string | null, mime: string, sha256: string, day: string | null): string {
  const clean = safeFileName(name ?? "");
  if (clean && clean !== "." && clean !== "..") return clean;
  const ext = MIME_EXT[mime.split(";")[0].trim()] ?? "bin";
  const d = day && /^\d{4}-\d{2}-\d{2}/.test(day) ? day.slice(0, 10) + "-" : "";
  return `zemory-${d}${sha256.slice(0, 8)}.${ext}`;
}

/** Bytes of ONE attachment, by content hash. `null` when unknown or body-less (`ref`). */
export function attachmentBlob(
  sha256: string,
  dbPath: string = currentMemoryDb(),
): { mime: string; bytes: Buffer; name: string } | null {
  if (!SHA_RE.test(sha256)) return null;
  const db = openMemory(dbPath);
  try {
    const r = db.prepare("SELECT id, name, mime, kind, blob, content FROM attachment WHERE sha256 = ?").get(sha256) as
      | { id: number; name: string | null; mime: string | null; kind: string; blob: Buffer | null; content: string | null }
      | undefined;
    if (!r) return null;
    // Ngày của tin SỚM NHẤT mang đính kèm này (dedup ⇒ có thể nhiều tin cùng trỏ tới).
    const day = db
      .prepare(
        `SELECT min(m.timestamp) AS ts FROM attachment_link al JOIN messages m ON m.id = al.message_id
          WHERE al.attachment_id = ?`,
      )
      .get(r.id) as { ts: string | null } | undefined;
    if (r.kind === "blob" && r.blob) {
      const mime = r.mime || "application/octet-stream";
      return { mime, bytes: r.blob, name: downloadName(r.name, mime, sha256, day?.ts ?? null) };
    }
    // `text` giữ nội dung ở cột chữ; `ref` cố ý KHÔNG có nội dung (chỉ ghi nhận từng có).
    if (r.kind === "text" && r.content != null) {
      const mime = r.mime || "text/plain; charset=utf-8";
      return {
        mime,
        bytes: Buffer.from(r.content, "utf8"),
        name: downloadName(r.name, mime, sha256, day?.ts ?? null),
      };
    }
    return null;
  } finally {
    db.close();
  }
}

/**
 * Đếm đính kèm còn SỐNG (message vẫn tồn tại) và số hàng MỒ CÔI.
 *
 * Mồ côi sinh ra khi `scan` chạy whole-replace: message cũ bị xoá rồi chèn lại với id
 * MỚI, còn hàng `attachment`/`attachment_link` cũ trỏ id cũ thì ở lại. Cùng họ với
 * vector mồ côi (đã có `pruneOrphanVectors`), nhưng lớp đính kèm CHƯA có bộ dọn —
 * hàm này chỉ ĐO, không xoá: xoá blob là thao tác huỷ dữ liệu, phải do user quyết.
 */
/**
 * Dọn LIÊN KẾT chết: `attachment_link` trỏ message không còn tồn tại (whole-replace xoá
 * tin cũ rồi chèn lại với id MỚI). Cùng họ `pruneOrphanVectors`.
 *
 * **CHỈ xoá LIÊN KẾT, KHÔNG xoá nội dung** — và đây là chỗ suýt sai: tiêu chí "hàng
 * `attachment` có `message_id` trỏ tin đã chết" nghe hợp lý nhưng SAI, vì `message_id` chỉ
 * ghi tin ĐẦU TIÊN mang nội dung ấy (dedup theo sha256). Đo trên DB thật 2026-07-28: 87
 * hàng "trông như mồ côi" thì **cả 87 vẫn còn liên kết SỐNG** — xoá theo tiêu chí đó là
 * mất 87 tấm ảnh đang dùng. Số hàng thật sự không còn ai trỏ tới: **0**.
 *
 * Nội dung chỉ bị xoá khi KHÔNG còn liên kết sống nào, và mặc định KHÔNG làm (`dropUnlinked`)
 * — xoá blob là huỷ dữ liệu, phải do người dùng quyết (`02_RULES §Hành xử`).
 */
export function pruneOrphanAttachments(
  dbPath: string = currentMemoryDb(),
  opts: { dropUnlinked?: boolean } = {},
): { links: number; rows: number } {
  const db = openMemory(dbPath);
  try {
    const links = db
      .prepare("DELETE FROM attachment_link WHERE message_id NOT IN (SELECT id FROM messages)")
      .run().changes;
    let rows = 0;
    if (opts.dropUnlinked) {
      rows = db
        .prepare("DELETE FROM attachment WHERE id NOT IN (SELECT attachment_id FROM attachment_link)")
        .run().changes;
    }
    return { links, rows };
  } finally {
    db.close();
  }
}

export function attachmentStats(dbPath: string = currentMemoryDb()): {
  live: number;
  liveBytes: number;
  /** Hàng nội dung KHÔNG còn liên kết sống nào — mới thật sự là mồ côi. */
  orphanRows: number;
  orphanLinks: number;
} {
  const db = openMemory(dbPath);
  try {
    const live = db
      .prepare(
        `SELECT count(DISTINCT a.id) AS n, COALESCE(sum(DISTINCT a.bytes), 0) AS b
           FROM attachment a JOIN attachment_link al ON al.attachment_id = a.id
           JOIN messages m ON m.id = al.message_id`,
      )
      .get() as { n: number; b: number };
    // Mồ côi THẬT = không còn liên kết nào tới một message đang sống. KHÔNG dùng
    // `a.message_id` làm tiêu chí (xem ghi chú ở `pruneOrphanAttachments`).
    const orphanRows = db
      .prepare(
        `SELECT count(*) AS n FROM attachment a
          WHERE NOT EXISTS (SELECT 1 FROM attachment_link al JOIN messages m ON m.id = al.message_id
                             WHERE al.attachment_id = a.id)`,
      )
      .get() as { n: number };
    const orphanLinks = db
      .prepare(
        "SELECT count(*) AS n FROM attachment_link al WHERE NOT EXISTS (SELECT 1 FROM messages m WHERE m.id = al.message_id)",
      )
      .get() as { n: number };
    return { live: live.n, liveBytes: live.b, orphanRows: orphanRows.n, orphanLinks: orphanLinks.n };
  } finally {
    db.close();
  }
}
