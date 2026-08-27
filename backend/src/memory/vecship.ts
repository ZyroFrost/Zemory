// CHỞ VECTOR QUA BUNDLE — để máy nhận dùng được hybrid NGAY, không phải nhúng lại hàng chục giờ.
//
// Vì sao trước đây vector không đi theo: nó khoá theo `messages.id`, mà id đó là AUTOINCREMENT
// CỤC BỘ — cùng một tin ở máy A là #2.955.631, ở máy B là số khác. Chở id sang là trỏ vào tin
// của người ta. Cách giải đã có sẵn trong repo (bảng `attachment_ship` cho ảnh): làm phẳng,
// mang `session_id` + `msg_uuid`, bên nhận tra id CỦA MÌNH rồi mới nối.
//
// Giá phải trả, tính theo tin: 768 chiều × 4 byte = **3 KB/tin**. Một lượt sync ~100 tin mới
// tốn thêm ~300 KB — không đáng kể. Con số ~700 MB chỉ xuất hiện khi đẩy nốt toàn bộ kho
// lịch sử (226k vector), và đó là việc MỘT LẦN lúc bàn giao máy, không phải việc hằng ngày.
//
// PHẠM VI: TRỌN BỘ — vector chính của mỗi tin, VÀ cửa sổ phụ của tin dài (`vec_map`).
//
// 🔄 Bản đầu cố ý bỏ cửa sổ phụ ("chỉ 2,6%, không đáng phức tạp"). User bác, và lý lẽ của
// user đúng hơn: cả gói đã mã hoá bằng chìa share rồi thì giữ lại phần nào cũng chỉ làm nghèo
// máy nhận. Tệ hơn, nhóm đó KHÔNG hiện ra trong "còn phải nhúng" nên mất mà không ai biết —
// kiểu hỏng khó phát hiện nhất. Nay chở hết (HP điều 16).

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

export interface ShipResult {
  /** Số vector đã nhét vào gói. */
  shipped: number;
  /** Số hàng bị chính SQLite từ chối. Trả RA NGOÀI chứ không nuốt: một con số đếm mà không
   *  ai đọc thì y như không đếm — đó là cách một lỗ rò 75% từng sống sót qua cả một phiên. */
  rejected: number;
  /** Id tin (kho NGUỒN) có vector CHÍNH đã vào gói — để bên gọi ghi sổ `vec_shipped`. */
  shippedIds: number[];
}

export interface VecMeta {
  dims: number;
  profile: string;
  dtype: string;
}

const SHIP_DDL = `
CREATE TABLE IF NOT EXISTS vector_ship (
  session_id TEXT NOT NULL,
  mkey       TEXT NOT NULL,
  embedding  BLOB NOT NULL,
  PRIMARY KEY (session_id, mkey)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS vector_ship_meta (dims INTEGER, profile TEXT, dtype TEXT);
-- CỬA SỔ PHỤ của tin dài (>6.000 ký tự được cắt thành nhiều cửa sổ chồng lấn).
-- Chúng nằm ở rowid TỔNG HỢP (gốc 2^40) chứ không phải id tin, nên phải chở kèm seq và để
-- bên nhận tự cấp rowid của MÌNH — chở rowid gốc sang là trỏ vào vùng số của máy khác.
-- Trước đây cố ý bỏ nhóm này (7.381 hàng) với lý lẽ "chỉ 2,6%, không đáng phức tạp"; nhưng nó
-- KHÔNG hiện trong "còn phải nhúng" nên máy nhận âm thầm mất phần ĐUÔI của tin dài — đúng thứ
-- khó phát hiện nhất. User chốt: cả gói đã mã hoá thì chở trọn bộ RAG, đừng bỏ phần nào.
CREATE TABLE IF NOT EXISTS vector_ship_chunk (
  session_id TEXT NOT NULL,
  mkey       TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  embedding  BLOB NOT NULL,
  PRIMARY KEY (session_id, mkey, seq)
) WITHOUT ROWID;
`;

/**
 * Khoá định danh một tin, GIỐNG NHAU trên mọi máy.
 *
 * Bình thường là `uuid`. Nhưng 11.233/239.423 tin (4,7%) có `uuid = NULL` — di sản của các
 * adapter đời đầu — và TẤT CẢ đều có vector. Bản đầu bỏ qua nhóm này với lý lẽ "không định
 * danh được thì thà đừng gắn còn hơn gắn bừa". Lý lẽ đó đúng về an toàn nhưng **sai về mục
 * tiêu**: nó đẩy **~3,9 giờ nhúng lại** sang mỗi máy mới, đúng thứ mà cả lớp chở vector này
 * sinh ra để xoá bỏ.
 *
 * Cách giải: băm thứ ĐI THEO GÓI và không đổi giữa các máy — mốc thời gian + nội dung. Cùng
 * một tin ở hai máy cho cùng một khoá, nên gắn vector không thể lệch hàng.
 */
export function messageKey(uuid: string | null, timestamp: string | null, content: string | null): string {
  if (uuid) return uuid;
  return "h:" + createHash("sha256").update(`${timestamp ?? ""}\n${content ?? ""}`, "utf8").digest("hex").slice(0, 32);
}

function readVecMeta(db: Database.Database): VecMeta | null {
  try {
    const r = db.prepare("SELECT dims, profile, dtype FROM vec_config LIMIT 1").get() as VecMeta | undefined;
    return r && r.dims ? r : null;
  } catch {
    return null; // kho chưa từng nhúng
  }
}

/**
 * Nhét vector của các tin CÓ TRONG snapshot vào chính snapshot đó.
 * Trả số vector đã nhét. Fail-open tuyệt đối: kho nguồn chưa nhúng, thiếu extension, trang
 * hỏng… đều chỉ làm giảm số lượng chở được, KHÔNG được làm hỏng lượt xuất bundle.
 */
export function shipVectorsInto(
  snapshotPath: string,
  sourcePath: string,
  sinceMessageId?: number,
  /**
   * GÓI BÙ VECTOR (`memory vectors-catchup`): id tin CŨ cần chở vector, dù tin đó KHÔNG nằm
   * trong gói. Hợp lệ vì `vector_ship` khoá theo `(session_id, mkey)` và máy nhận tra id CỦA
   * MÌNH — tin đã nằm sẵn bên đó từ gói trước. Nhờ vậy bù được phần thiếu bằng cách NỐI THÊM
   * một khối ~66 MB, không phải ghi đè cả kho chung 1,6 GB (HP điều 16: *ghi là nối thêm*).
   */
  catchUpIds?: number[],
): ShipResult {
  let src: Database.Database | null = null;
  let snap: Database.Database | null = null;
  try {
    src = new Database(sourcePath, { readonly: true });
    sqliteVec.load(src);
    const meta = readVecMeta(src);
    if (!meta) return { shipped: 0, rejected: 0, shippedIds: [] };

    snap = new Database(snapshotPath);
    snap.exec(SHIP_DDL);
    snap.prepare("DELETE FROM vector_ship_meta").run();
    snap.prepare("INSERT INTO vector_ship_meta (dims, profile, dtype) VALUES (?,?,?)").run(meta.dims, meta.profile, meta.dtype);

    // 🔴 ID CỦA SNAPSHOT LÀ ID GIẢ — TUYỆT ĐỐI KHÔNG DÙNG NÓ TRA NGƯỢC VỀ KHO NGUỒN.
    // `buildRowsSnapshot` cố ý KHÔNG chép cột `id` (`INSERT INTO main.messages (session_id,
    // uuid, role, …)`) vì id là số cục bộ, không được đi theo bundle. Hệ quả: tin trong gói
    // được đánh số lại TỪ 1. Bản đầu của hàm này lấy id snapshot đem tra `vec_chunks` của kho
    // nguồn ⇒ chỉ trúng những tin có id nguồn nhỏ hơn số dòng snapshot. Đo hậu quả trên kho
    // thật: chở **51.349/208.612 = 25%**, `rejected=0`, không một dòng log nào — và phép thử
    // độc lập của tôi CHE MẤT lỗi vì fixture tự dựng có giữ id.
    // ⇒ Danh sách tin lấy từ KHO NGUỒN (id thật), rồi lọc theo tập (session_id, uuid) thật sự
    //   có trong snapshot — vừa đúng id để tra vector, vừa không chở dư lane đã bị scope loại.
    const inSnapshot = new Set<string>();
    for (const r of snap.prepare("SELECT session_id, uuid, timestamp, content FROM messages").iterate() as Iterable<{
      session_id: string;
      uuid: string | null;
      timestamp: string | null;
      content: string | null;
    }>) {
      inSnapshot.add(`${r.session_id}\u0000${messageKey(r.uuid, r.timestamp, r.content)}`);
    }
    const catchUp = new Set<number>(catchUpIds ?? []);
    if (!inSnapshot.size && !catchUp.size) return { shipped: 0, rejected: 0, shippedIds: [] };

    const targets = (
      src
        .prepare(
          `SELECT id, session_id, uuid, timestamp, content FROM messages
            WHERE 1=1${sinceMessageId && !catchUp.size ? " AND id > " + Number(sinceMessageId) : ""}
            ORDER BY id`,
        )
        .all() as { id: number; session_id: string; uuid: string | null; timestamp: string | null; content: string | null }[]
    )
      .map((t) => ({ id: t.id, session_id: t.session_id, mkey: messageKey(t.uuid, t.timestamp, t.content) }))
      // Tin CÓ trong gói ⇒ chở như thường. Tin trong danh sách BÙ ⇒ chở dù KHÔNG có trong gói
      // (máy nhận đã có tin đó từ khối trước, chỉ thiếu vector).
      .filter((t) => catchUp.has(t.id) || inSnapshot.has(`${t.session_id}\u0000${t.mkey}`));
    if (!targets.length) return { shipped: 0, rejected: 0, shippedIds: [] };
    const shippedIds: number[] = [];

    src.defaultSafeIntegers(true);
    const ins = snap.prepare("INSERT OR REPLACE INTO vector_ship (session_id, mkey, embedding) VALUES (?,?,?)");
    // MỘT HÀNG HỎNG KHÔNG ĐƯỢC GIẾT CẢ LÔ.
    // Bản đầu bọc cả lô 500 trong một giao dịch rồi nuốt lỗi ở vòng ngoài ⇒ đúng một tin lỗi
    // là mất 500 vector, âm thầm. Đo hậu quả trên kho thật: chở được 45.837/227.226 = **20%**,
    // và không có dòng log nào cho biết. Nay mỗi hàng tự chịu trách nhiệm; lỗi được ĐẾM.
    let rejected = 0;
    const put = snap.transaction((rows: { session_id: string; mkey: string; embedding: unknown }[]) => {
      for (const r of rows) {
        try {
          ins.run(r.session_id, r.mkey, r.embedding);
        } catch {
          rejected++;
        }
      }
    });

    let shipped = 0;
    const BATCH = 500;
    for (let i = 0; i < targets.length; i += BATCH) {
      const slice = targets.slice(i, i + BATCH);
      const byId = new Map(slice.map((t) => [String(t.id), t]));
      try {
        // Đọc theo lô bằng `IN (…)`: vec0 KHÔNG nhận `WHERE rowid > ? ORDER BY rowid`
        // (bẫy đã trả giá ở `salvageVectors`, giữ nguyên lối đó ở đây).
        const rows = src
          .prepare(`SELECT rowid, embedding FROM vec_chunks WHERE rowid IN (${slice.map((t) => t.id).join(",")})`)
          .all() as { rowid: bigint; embedding: unknown }[];
        const out = rows
          .map((r) => {
            const t = byId.get(String(r.rowid));
            return t ? { session_id: t.session_id, mkey: t.mkey, embedding: r.embedding } : null;
          })
          .filter((x): x is { session_id: string; mkey: string; embedding: unknown } => x !== null);
        put(out);
        shipped += out.length;
        const got = new Set(rows.map((r) => String(r.rowid)));
        for (const t of slice) if (got.has(String(t.id))) shippedIds.push(t.id);
      } catch {
        // Lô nằm trên trang hỏng hoặc tin chưa có vector ⇒ bỏ lô, đi tiếp.
      }
    }
    // ── CỬA SỔ PHỤ của tin dài ────────────────────────────────────────────────
    // Đi sau vòng chính vì nó tra `vec_map` chứ không tra thẳng id tin.
    try {
      const keyById = new Map(targets.map((t) => [t.id, t]));
      const insC = snap.prepare("INSERT OR REPLACE INTO vector_ship_chunk (session_id, mkey, seq, embedding) VALUES (?,?,?,?)");
      const putC = snap.transaction((rows: { session_id: string; mkey: string; seq: number; embedding: unknown }[]) => {
        for (const r of rows) {
          try {
            insC.run(r.session_id, r.mkey, r.seq, r.embedding);
          } catch {
            rejected++;
          }
        }
      });
      const maps = src.prepare("SELECT rowid, message_id, seq FROM vec_map ORDER BY rowid").all() as {
        rowid: bigint;
        message_id: bigint;
        seq: bigint;
      }[];
      const wanted = maps.filter((m) => keyById.has(Number(m.message_id)));
      for (let i = 0; i < wanted.length; i += BATCH) {
        const slice = wanted.slice(i, i + BATCH);
        const byRow = new Map(slice.map((m) => [String(m.rowid), m]));
        try {
          const rows = src
            .prepare(`SELECT rowid, embedding FROM vec_chunks WHERE rowid IN (${slice.map((m) => m.rowid).join(",")})`)
            .all() as { rowid: bigint; embedding: unknown }[];
          const out = rows
            .map((r) => {
              const m = byRow.get(String(r.rowid));
              const t = m ? keyById.get(Number(m.message_id)) : undefined;
              return t && m ? { session_id: t.session_id, mkey: t.mkey, seq: Number(m.seq), embedding: r.embedding } : null;
            })
            .filter((x): x is { session_id: string; mkey: string; seq: number; embedding: unknown } => x !== null);
          putC(out);
          shipped += out.length;
        } catch {
          /* lô hỏng → bỏ, phần còn lại vẫn đi */
        }
      }
    } catch {
      /* không có vec_map (kho chưa từng chunk) → bỏ qua, fail-open */
    }
    return { shipped, rejected, shippedIds };
  } catch {
    return { shipped: 0, rejected: 0, shippedIds: [] };
  } finally {
    src?.close();
    snap?.close();
  }
}

/**
 * Nhận vector từ một bundle đã giải mã vào kho local.
 *
 * TỪ CHỐI khi cấu hình nhúng KHÁC — q8 và fp32, hay 256 và 768 chiều, cho vector GẦN nhau
 * nhưng KHÔNG trùng; trộn hai không gian lại là hỏng recall một cách im lặng, kiểu hỏng tệ
 * nhất vì không ai thấy. Thà không nhận rồi tự nhúng lại còn hơn nhận bậy.
 */
export function receiveVectorsFrom(
  incomingPath: string,
  targetPath: string,
): { applied: number; skipped: number; reason?: string } {
  let inc: Database.Database | null = null;
  let dst: Database.Database | null = null;
  try {
    inc = new Database(incomingPath, { readonly: true });
    const has = inc.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vector_ship'").get();
    if (!has) return { applied: 0, skipped: 0 }; // bundle đời cũ / máy gửi chưa nhúng

    const meta = inc.prepare("SELECT dims, profile, dtype FROM vector_ship_meta LIMIT 1").get() as VecMeta | undefined;
    const total = (inc.prepare("SELECT COUNT(*) c FROM vector_ship").get() as { c: number }).c;
    if (!meta || !total) return { applied: 0, skipped: 0 };

    dst = new Database(targetPath);
    sqliteVec.load(dst);
    const mine = readVecMeta(dst);
    // Kho đích chưa từng nhúng ⇒ nhận và ĐÓNG DẤU cấu hình của bên gửi: từ đó máy này nhúng
    // tiếp bằng đúng cấu hình ấy, không đẻ ra kho lai hai không gian.
    if (!mine) {
      dst.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[${meta.dims}])`);
      dst.exec("CREATE TABLE IF NOT EXISTS vec_config (dims INTEGER, profile TEXT, dtype TEXT)");
      dst.prepare("INSERT INTO vec_config (dims, profile, dtype) VALUES (?,?,?)").run(meta.dims, meta.profile, meta.dtype);
    } else if (mine.dims !== meta.dims || mine.profile !== meta.profile || mine.dtype !== meta.dtype) {
      return {
        applied: 0,
        skipped: total,
        reason: `cấu hình nhúng khác (gửi ${meta.dims}d/${meta.profile}/${meta.dtype} · máy này ${mine.dims}d/${mine.profile}/${mine.dtype})`,
      };
    }

    dst.defaultSafeIntegers(true);
    const find = dst.prepare("SELECT id FROM messages WHERE session_id = ? AND uuid = ?");
    // Tra theo KHOÁ BỀN: uuid nếu có, còn tin uuid=NULL thì băm (mốc thời gian + nội dung).
    // Bảng tra chỉ dựng cho nhóm NULL (đo: 11.233/239.423 = 4,7%) nên rẻ — không băm cả kho.
    const byHash = new Map<string, bigint>();
    for (const m of dst
      .prepare("SELECT id, session_id, timestamp, content FROM messages WHERE uuid IS NULL")
      .iterate() as Iterable<{ id: bigint; session_id: string; timestamp: string | null; content: string | null }>) {
      byHash.set(`${m.session_id}\u0000${messageKey(null, m.timestamp, m.content)}`, m.id);
    }
    const ins = dst.prepare("INSERT OR REPLACE INTO vec_chunks(rowid, embedding) VALUES (?, ?)");
    const rows = inc.prepare("SELECT session_id, mkey, embedding FROM vector_ship").all() as {
      session_id: string;
      mkey: string;
      embedding: unknown;
    }[];

    let applied = 0;
    let skipped = 0;
    const apply = dst.transaction(() => {
      for (const r of rows) {
        const hit = (r.mkey.startsWith("h:")
          ? ((id) => (id === undefined ? undefined : { id }))(byHash.get(`${r.session_id}\u0000${r.mkey}`))
          : (find.get(r.session_id, r.mkey) as { id: bigint } | undefined));
        if (!hit) {
          skipped++; // tin bị lọc theo scope, hoặc chưa merge — không phải lỗi
          continue;
        }
        ins.run(hit.id, r.embedding);
        applied++;
      }
    });
    apply();

    // ── CỬA SỔ PHỤ: cấp rowid tổng hợp CỦA MÁY NÀY ────────────────────────────
    // Gốc 2^40 để không bao giờ đụng dải id tin; `vec_map` trỏ ngược về id tin local.
    // Bỏ qua cửa sổ đã có (cùng message_id + seq) để merge lại nhiều lần vẫn idempotent.
    try {
      const hasChunkTable = inc.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vector_ship_chunk'").get();
      if (hasChunkTable) {
        dst.exec("CREATE TABLE IF NOT EXISTS vec_map (rowid INTEGER PRIMARY KEY, message_id INTEGER NOT NULL, seq INTEGER NOT NULL)");
        dst.exec("CREATE INDEX IF NOT EXISTS idx_vec_map_message ON vec_map(message_id)");
        const SYNTH_BASE = 1099511627776n; // 2^40
        let next =
          ((dst.prepare("SELECT COALESCE(MAX(rowid), 0) m FROM vec_map").get() as { m: bigint }).m || SYNTH_BASE - 1n) + 1n;
        if (next < SYNTH_BASE) next = SYNTH_BASE;
        const seen = dst.prepare("SELECT rowid FROM vec_map WHERE message_id = ? AND seq = ?");
        const mapPut = dst.prepare("INSERT OR REPLACE INTO vec_map(rowid, message_id, seq) VALUES (?, ?, ?)");
        const chunkRows = inc.prepare("SELECT session_id, mkey, seq, embedding FROM vector_ship_chunk").all() as {
          session_id: string;
          mkey: string;
          seq: number;
          embedding: unknown;
        }[];
        const applyChunks = dst.transaction(() => {
          for (const r of chunkRows) {
            const hit = r.mkey.startsWith("h:")
              ? ((id) => (id === undefined ? undefined : { id }))(byHash.get(`${r.session_id} ${r.mkey}`))
              : (find.get(r.session_id, r.mkey) as { id: bigint } | undefined);
            if (!hit) {
              skipped++;
              continue;
            }
            if (seen.get(hit.id, BigInt(r.seq))) continue; // đã có cửa sổ này
            const rid = next++;
            ins.run(rid, r.embedding);
            mapPut.run(rid, hit.id, BigInt(r.seq));
            applied++;
          }
        });
        applyChunks();
      }
    } catch {
      /* fail-open: mất phần đuôi tin dài, tin và vector chính vẫn nguyên */
    }
    return { applied, skipped };
  } catch (error) {
    return { applied: 0, skipped: 0, reason: error instanceof Error ? error.message : "receive failed" };
  } finally {
    inc?.close();
    dst?.close();
  }
}
