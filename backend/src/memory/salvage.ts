// CỨU dữ liệu từ một `global_memory.db` đã hỏng sang một DB MỚI.
//
// Vì sao là năng lực chứ không phải script tạm (sự cố thật 2026-08-03): DB 1 GB báo
// `database disk image is malformed`; hỏng nằm ở bảng bóng FTS + chỉ mục vector, nhưng CHẠM
// cả bảng nguồn. Bản sao lưu gần nhất đã CŨ 8 NGÀY (thiếu ~28k tin) và bundle Drive chỉ là
// delta vài trăm KB — nên vét những gì còn đọc được là đường cho lại NHIỀU nhất, chứ không
// phải đường duy nhất. Kết hợp với `memory scan` (transcript gốc vẫn còn trên đĩa) thì lượt
// cứu này về đủ 100%: 144 tin nằm trên trang hỏng được nạp lại từ file `.jsonl`.
//
// Điểm mấu chốt về PHƯƠNG PHÁP, đã trả giá mới biết: một lượt `SELECT *` **DỪNG ở trang hỏng
// đầu tiên**, nên nó báo "đọc được 197.323/198.902" trong khi thực tế cứu được **198.758** —
// chênh hơn 1.400 dòng. Phải đọc theo LÔ rowid, lô nào lỗi thì CHIA ĐÔI xuống tới từng dòng;
// khi đó chỉ mất đúng những dòng nằm trên trang hỏng.
//
// KHÔNG đụng file gốc: mở read-only, ghi sang đường mới. Lớp dẫn xuất (FTS/vector) KHÔNG chép
// mù — FTS dựng lại từ nội dung nguồn (rẻ, không cần model), vector chép được thì chép, phần
// thiếu để `memory embed` vá sau (embed lại toàn bộ 198k tin là >50 giờ).

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { openMemory } from "./db.js";

export interface SalvageTable {
  table: string;
  copied: number;
  lost: number;
}

export interface SalvageReport {
  src: string;
  dst: string;
  tables: SalvageTable[];
  copied: number;
  lost: number;
}

/** Bảng NGUỒN + trạng thái. Cố ý KHÔNG có FTS/vector: chúng là dẫn xuất, dựng lại sạch hơn. */
const SOURCE_TABLES = [
  "sessions",
  "messages",
  "ingest_state",
  "known_stores",
  "doc",
  "section",
  "changelog",
  "session_digest",
  "attachment",
  "attachment_link",
  "sync_state",
  "merged_bundles",
  "graph_fitness",
];

type Db = InstanceType<typeof Database>;

/** Đọc một khoảng rowid; lỗi thì chia đôi tới mức từng dòng. */
function readRange(src: Db, table: string, lo: number, hi: number): { rows: Record<string, unknown>[]; lost: number } {
  try {
    return { rows: src.prepare(`SELECT * FROM "${table}" WHERE rowid BETWEEN ? AND ?`).all(lo, hi) as Record<string, unknown>[], lost: 0 };
  } catch {
    if (lo >= hi) return { rows: [], lost: 1 }; // đúng dòng này nằm trên trang hỏng
    const mid = Math.floor((lo + hi) / 2);
    const a = readRange(src, table, lo, mid);
    const b = readRange(src, table, mid + 1, hi);
    return { rows: [...a.rows, ...b.rows], lost: a.lost + b.lost };
  }
}

function copyTable(src: Db, dst: Db, table: string): SalvageTable {
  let cols: string[];
  let maxRow: number;
  try {
    cols = (src.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map((c) => c.name);
    maxRow = ((src.prepare(`SELECT MAX(rowid) m FROM "${table}"`).get() as { m: number | null }).m) ?? 0;
  } catch {
    return { table, copied: 0, lost: 0 }; // bảng không tồn tại ở đời DB này
  }
  if (!maxRow || !cols.length) return { table, copied: 0, lost: 0 };
  const ins = dst.prepare(
    `INSERT OR IGNORE INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
  );
  let copied = 0;
  let lost = 0;
  for (let lo = 1; lo <= maxRow; lo += 2000) {
    const r = readRange(src, table, lo, Math.min(lo + 1999, maxRow));
    lost += r.lost;
    dst.transaction((rows: Record<string, unknown>[]) => {
      for (const row of rows) {
        try {
          ins.run(cols.map((c) => row[c] ?? null));
          copied++;
        } catch {
          lost++; // hàng vi phạm ràng buộc ở DB mới — đếm là mất, không làm hỏng lượt cứu
        }
      }
    })(r.rows);
  }
  return { table, copied, lost };
}

/**
 * Vét mọi dòng còn đọc được sang `dstPath`. KHÔNG dựng lại FTS/vector ở đây — gọi
 * `zemory reindex` + `memory digest --all` + `memory embed --all` sau khi đổi chỗ.
 */
export function salvageMemory(srcPath: string, dstPath: string): SalvageReport {
  const src = new Database(srcPath, { readonly: true });
  const dst = openMemory(dstPath); // schema đầy đủ + FTS + trigger dựng đúng khuôn
  try {
    const tables = SOURCE_TABLES.map((t) => copyTable(src, dst, t));
    return {
      src: srcPath,
      dst: dstPath,
      tables,
      copied: tables.reduce((n, t) => n + t.copied, 0),
      lost: tables.reduce((n, t) => n + t.lost, 0),
    };
  } finally {
    src.close();
    dst.close();
  }
}

/**
 * Chép chỉ mục VECTOR sang DB đã cứu. Tách khỏi `salvageMemory` vì nó cần extension vec0.
 *
 * Ba cái bẫy đã trả giá mới biết (2026-08-03), ghi lại để không ai mò lại:
 *   ① Bảng ảo `vec0` KHÔNG nhận `WHERE rowid > ? ORDER BY rowid` — phải lấy danh sách rowid
 *      từ bảng bóng `vec_chunks_rowids` (bảng thường) rồi nạp vector bằng `rowid IN (…)`.
 *   ② rowid của chunk bắt đầu từ **2^40** (offset CÓ CHỦ ĐÍCH, không phải rowid hỏng), nên
 *      mọi vòng lặp kiểu `lo += n` là vô vọng — phải phân trang theo khoá.
 *   ③ better-sqlite3 mặc định trả integer dạng `number` (float64) ⇒ vec0 từ chối:
 *      *"Only integers are allowed for primary key values"*. Phải bật `safeIntegers` (BigInt).
 *
 * CỐ Ý cứu ĐƯỢC BAO NHIÊU HAY BẤY NHIÊU: đây là lớp DẪN XUẤT (HP điều 3). Khi vùng hỏng bắt
 * đầu, mọi lô sau đều ném lỗi và vòng lặp bò rất chậm mà không thêm được gì — sự cố thật:
 * 120.000 vector trong 50 giây rồi 7 phút không ghi thêm byte nào. Nên có `maxFailPages`:
 * chạm ngưỡng thì DỪNG và trả về `copied`; phần thiếu để `memory embed --all` dựng lại.
 */
export function salvageVectors(
  srcPath: string,
  dstPath: string,
  dims: number,
  maxFailPages = 200,
): { copied: number; lost: number } {
  const src = new Database(srcPath, { readonly: true });
  const dst = new Database(dstPath);
  try {
    sqliteVec.load(src);
    sqliteVec.load(dst);
    src.defaultSafeIntegers(true);
    dst.defaultSafeIntegers(true);
    dst.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${dims}])`);
    const ins = dst.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
    const put = dst.transaction((rows: { rowid: bigint; embedding: unknown }[]) => {
      for (const r of rows) ins.run(r.rowid, r.embedding);
    });
    let cursor = -1n;
    let copied = 0;
    let lost = 0;
    let failStreak = 0;
    let deadPages = 0;
    for (;;) {
      if (deadPages >= maxFailPages) break; // vào hẳn vùng hỏng — dừng, để `memory embed` vá
      let ids: bigint[];
      try {
        ids = (src.prepare("SELECT rowid FROM vec_chunks_rowids WHERE rowid > ? ORDER BY rowid LIMIT 500").all(cursor) as { rowid: bigint }[]).map((r) => r.rowid);
      } catch {
        if (++failStreak >= 3) break;
        cursor += 500n;
        continue;
      }
      if (!ids.length) break;
      failStreak = 0;
      cursor = ids[ids.length - 1];
      try {
        const rows = src.prepare(`SELECT rowid, embedding FROM vec_chunks WHERE rowid IN (${ids.join(",")})`).all() as { rowid: bigint; embedding: unknown }[];
        put(rows);
        copied += rows.length;
        lost += ids.length - rows.length;
        deadPages = 0; // lại đọc được ⇒ chưa vào vùng hỏng liên tục
      } catch {
        lost += ids.length; // lô nằm trên trang hỏng — `memory embed` vá lại sau
        deadPages++;
      }
    }
    return { copied, lost };
  } finally {
    src.close();
    dst.close();
  }
}

/** Dựng lại mọi chỉ mục FTS từ nội dung nguồn. Rẻ: không cần model, không cần mạng. */
export function rebuildFts(dbPath: string): { table: string; ok: boolean }[] {
  const db = openMemory(dbPath);
  const out: { table: string; ok: boolean }[] = [];
  try {
    for (const t of ["messages_fts", "messages_fts_tri", "section_fts", "section_fts_tri", "changelog_fts", "session_digest_fts", "session_digest_fts_tri"]) {
      try {
        db.prepare(`INSERT INTO ${t}(${t}) VALUES('rebuild')`).run();
        out.push({ table: t, ok: true });
      } catch {
        out.push({ table: t, ok: false });
      }
    }
  } finally {
    db.close();
  }
  return out;
}
