/**
 * MỐC `base`, PHÉP PHÂN LOẠI và HÀNG ĐỢI DUYỆT của lớp mirror (plan/24 §9.3–§9.5).
 *
 * ── VÌ SAO PHẢI CÓ MỐC ────────────────────────────────────────────────────────────────
 *
 * Với mỗi (máy, mục, đường) ta giữ ba giá trị: băm bản CỦA MÌNH · băm bản BÊN KIA khai ·
 * `base` = băm **lần gặp gần nhất hai bên đã khớp**. Không có `base` thì *"bên kia sửa"*
 * và *"mình xoá"* đọc ra giống hệt nhau — đó là lý do mọi hệ đồng bộ nghiêm túc đều lưu
 * mốc, không phải một tối ưu.
 *
 * ── HAI ĐIỀU CỐ Ý KHÔNG LÀM, và cả hai là quyết định chứ không phải thiếu sót ──────────
 *
 * ① **MIRROR KHÔNG BAO GIỜ XOÁ FILE.** Xoá là thao tác duy nhất không đảo được ở đây
 *    (`§9.2` chốt ②, `§9.7` ca 4). Nên: bên kia thiếu một file ⇒ ta ĐỀ NGHỊ thêm, không
 *    bao giờ ta tự xoá của mình; ta đã xoá một file sau lần gặp cuối (`base` còn, bản ta
 *    mất, bản họ đúng bằng `base`) ⇒ ta **KHÔNG hồi sinh** nó. Xoá vì thế không lan sang
 *    máy kia, mà cũng không bị máy kia đảo ngược. Hệ quả nói thẳng: muốn xoá ở cả hai máy
 *    thì phải xoá ở cả hai — máy không đoán hộ.
 * ② **Không tự áp bất cứ thay đổi nào của mục CHỮ.** User chốt: *"bên đây phải confirm
 *    chấp nhận sửa đó thì sẽ tự động lên"*. Chỗ KHÁC Syncthing (nó áp thẳng) và giống git.
 *    Ngoại lệ đúng hai ca, cả hai đã chốt: mục `files/` (địa chỉ theo nội dung ⇒ không thể
 *    xung đột, `§9.1` mục 4) và cặp `one-way` ở phía máy ĐÍCH (`§9.2`).
 *
 * ── DÙNG LẠI BỘ HỢP NHẤT ĐÃ CÓ, KHÔNG VIẾT BẢN THỨ HAI ────────────────────────────────
 *
 * `merge3`/`hunks` của `docs/standard.ts` (plan/26) **chính là** luật `§9.4`: chú thích
 * của nó nói thẳng *"plan/24 §9.4 đã chốt luật này cho lớp file và ở đây dùng lại nguyên
 * văn"*. Viết một bản thứ hai ở đây là dựng hai cài đặt cho cùng một việc (HP điều 1 và
 * điều 17) — và hai bản trộn ba chiều trôi lệch nhau thì lệch đúng ở chỗ quyết định mất
 * hay giữ việc của người ta.
 */
import { readFileSync } from "node:fs";
import { currentMemoryDb, openMemory, type MemoryDB } from "../db.js";
import { getPeerSync } from "../../config/settings.js";
import { writeFileAtomic } from "../../util/fs-atomic.js";
import { merge3 } from "../../docs/standard.js";
import {
  hashBytes,
  isContentAddressed,
  MAX_TEXT_MERGE_BYTES,
  mirrorRootFor,
  resolveMirrorPath,
  scanMirror,
  type MirrorArea,
  type MirrorEntry,
} from "./mirror.js";

/**
 * Kết luận cho MỘT đường dẫn, nhìn từ máy NHẬN.
 *
 * `push` là kết luận của phía GỬI trong cùng một tình huống (`§9.3` hàng 2) — giữ trong
 * cùng một kiểu để hai chiều đọc bằng một bảng, thay vì hai bảng phải nhớ là đối xứng.
 */
export type MirrorVerdict =
  | "same" // hai bên giống nhau ⇒ không làm gì
  | "none" // không có việc (bên kia không có file, hoặc ta đã cố ý xoá)
  | "take" // chỉ bên kia sửa (hoặc file mới) ⇒ vào hàng đợi
  | "push" // chỉ mình sửa ⇒ đẩy đi, không hỏi
  | "merge" // hai bên cùng sửa, KHÔNG chồng đoạn ⇒ gộp rồi vẫn hỏi
  | "block"; // hai bên cùng sửa và CHỒNG đoạn, hoặc không có mốc ⇒ chặn, hỏi chọn bên

/**
 * Phân loại bằng BĂM — hàm THUẦN, và đó là chủ đích.
 *
 * Phép ở đây quyết định *có mất việc của ai không*, nên nó phải soi được bằng cổng mà
 * không cần hai máy, không cần đĩa, không cần mạng (bài học `plan/24 §6f`: cổng đầu-cuối
 * chứng minh "chạy được", nó không chứng minh "chạy vì lý do này").
 *
 * Trả `merge` nghĩa là *"đáng thử gộp"*; chồng đoạn hay không thì chỉ `merge3` biết, và
 * đó là bước sau — ở đây chưa có nội dung trong tay.
 */
export function classify(baseHash: string | null, mineHash: string | null, theirHash: string | null): MirrorVerdict {
  if (!theirHash) return "none"; // bên kia không có ⇒ không có gì để nhận (ta KHÔNG xoá theo)
  if (!mineHash) {
    if (!baseHash) return "take"; // chưa từng gặp, ta chưa có ⇒ file mới
    if (baseHash === theirHash) return "none"; // ta đã xoá sau lần gặp cuối ⇒ KHÔNG hồi sinh
    return "block"; // ta xoá, họ sửa — xoá không đảo được, không để bên nào thắng lặng
  }
  if (mineHash === theirHash) return "same";
  if (!baseHash) return "block"; // §9.4 mục 4: không mốc ⇒ coi như trùng ⇒ chặn và hỏi
  if (baseHash === mineHash) return "take";
  if (baseHash === theirHash) return "push";
  return "merge";
}

// ── Mốc `base` ────────────────────────────────────────────────────────────────────────

export interface BaseRow {
  hash: string | null;
  body: Buffer | null;
}

export function readBase(db: MemoryDB, peerId: string, area: MirrorArea, rel: string): BaseRow | null {
  const r = db
    .prepare("SELECT base_hash AS hash, base_body AS body FROM peer_file_state WHERE peer_id=? AND area=? AND rel=?")
    .get(peerId, area, rel) as { hash: string | null; body: Buffer | null } | undefined;
  return r ? { hash: r.hash ?? null, body: r.body ?? null } : null;
}

/**
 * Ghi mốc. `body` chỉ giữ cho file CHỮ dưới ngưỡng (`§9.3`) — nhị phân hoặc quá ngưỡng
 * thì mốc chỉ có BĂM, và ca đó rơi về chọn-cả-file (`§9.5`) thay vì hợp nhất theo đoạn.
 */
export function writeBase(db: MemoryDB, peerId: string, area: MirrorArea, rel: string, hash: string, body: Buffer | null): void {
  db.prepare(
    "INSERT INTO peer_file_state (peer_id, area, rel, base_hash, base_body, updated_at) VALUES (?,?,?,?,?,?) " +
      "ON CONFLICT(peer_id, area, rel) DO UPDATE SET base_hash=excluded.base_hash, base_body=excluded.base_body, updated_at=excluded.updated_at",
  ).run(peerId, area, rel, hash, body, new Date().toISOString());
}

/** Nội dung có phải CHỮ hợp nhất theo đoạn được không. Byte 0 là dấu nhị phân đủ chắc và rẻ. */
export function isMergeableText(body: Buffer): boolean {
  if (body.length > MAX_TEXT_MERGE_BYTES) return false;
  return !body.includes(0);
}

// ── Hàng đợi duyệt ────────────────────────────────────────────────────────────────────

export interface QueueRow {
  id: number;
  peerId: string;
  area: MirrorArea;
  rel: string;
  verdict: "take" | "merge" | "block";
  theirHash: string | null;
  mineHash: string | null;
  size: number;
  createdAt: string;
}

/**
 * Đặt một mục vào hàng đợi. MỘT dòng cho mỗi (máy, mục, đường) — lượt sau ghi đè.
 *
 * Vì sao ghi đè chứ không xếp chồng: thứ đáng duyệt luôn là bản MỚI NHẤT bên kia đang có.
 * Giữ lịch sử thì người dùng phải duyệt một chuỗi bản đã chết để tới bản đang sống, và
 * mỗi dòng duyệt nhầm là một lần ghi đè bằng nội dung cũ.
 */
export function enqueue(
  db: MemoryDB,
  row: {
    peerId: string;
    area: MirrorArea;
    rel: string;
    verdict: "take" | "merge" | "block";
    theirBody: Buffer;
    theirHash: string;
    mineHash: string | null;
    mergedBody: Buffer | null;
  },
): void {
  db.prepare(
    "INSERT INTO peer_file_queue (peer_id, area, rel, verdict, their_hash, their_body, mine_hash, merged_body, created_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?) " +
      "ON CONFLICT(peer_id, area, rel) DO UPDATE SET verdict=excluded.verdict, their_hash=excluded.their_hash, " +
      "their_body=excluded.their_body, mine_hash=excluded.mine_hash, merged_body=excluded.merged_body, created_at=excluded.created_at",
  ).run(
    row.peerId,
    row.area,
    row.rel,
    row.verdict,
    row.theirHash,
    row.theirBody,
    row.mineHash,
    row.mergedBody,
    new Date().toISOString(),
  );
}

export function listQueue(db: MemoryDB, peerId?: string): QueueRow[] {
  const sql =
    "SELECT id, peer_id, area, rel, verdict, their_hash, mine_hash, LENGTH(their_body) AS size, created_at FROM peer_file_queue" +
    (peerId ? " WHERE peer_id=?" : "") +
    " ORDER BY area, rel";
  const rows = (peerId ? db.prepare(sql).all(peerId) : db.prepare(sql).all()) as Array<{
    id: number;
    peer_id: string;
    area: string;
    rel: string;
    verdict: string;
    their_hash: string | null;
    mine_hash: string | null;
    size: number | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    peerId: r.peer_id,
    area: r.area as MirrorArea,
    rel: r.rel,
    verdict: r.verdict as QueueRow["verdict"],
    theirHash: r.their_hash,
    mineHash: r.mine_hash,
    size: r.size ?? 0,
    createdAt: r.created_at,
  }));
}

export function queueCount(db: MemoryDB): number {
  const r = db.prepare("SELECT COUNT(*) AS n FROM peer_file_queue").get() as { n: number };
  return r.n;
}

/** Nội dung hai bản của một dòng chờ — để bề mặt xem khác biệt trước khi duyệt (`§9.6`). */
export function queueBodies(db: MemoryDB, id: number): { theirs: Buffer | null; merged: Buffer | null; row: QueueRow | null } {
  const r = db
    .prepare(
      "SELECT id, peer_id, area, rel, verdict, their_hash, mine_hash, their_body, merged_body, LENGTH(their_body) AS size, created_at " +
        "FROM peer_file_queue WHERE id=?",
    )
    .get(id) as
    | {
        id: number;
        peer_id: string;
        area: string;
        rel: string;
        verdict: string;
        their_hash: string | null;
        mine_hash: string | null;
        their_body: Buffer | null;
        merged_body: Buffer | null;
        size: number | null;
        created_at: string;
      }
    | undefined;
  if (!r) return { theirs: null, merged: null, row: null };
  return {
    theirs: r.their_body ?? null,
    merged: r.merged_body ?? null,
    row: {
      id: r.id,
      peerId: r.peer_id,
      area: r.area as MirrorArea,
      rel: r.rel,
      verdict: r.verdict as QueueRow["verdict"],
      theirHash: r.their_hash,
      mineHash: r.mine_hash,
      size: r.size ?? 0,
      createdAt: r.created_at,
    },
  };
}

export type ApplyChoice = "theirs" | "merged" | "mine";

/**
 * Duyệt MỘT dòng. `mine` = giữ bản của mình ⇒ không ghi byte nào, chỉ **đóng mốc**.
 *
 * 🔴 Đóng mốc ngay cả khi chọn `mine` là phần dễ bỏ sót nhất và thiếu nó thì hàng đợi
 * thành vòng lặp: không có mốc mới, lượt sau lại thấy *"hai bên khác nhau, không có
 * base"* ⇒ CHẶN lại đúng file vừa quyết. Người dùng đọc thành *"bấm mà không ăn"*.
 * Chọn `mine` nghĩa là **đã nhìn cả hai bản và chốt** — đó đúng là một lần hai máy gặp
 * nhau, chỉ khác là kết luận nghiêng về bản của mình.
 */
export function applyQueued(db: MemoryDB, id: number, choice: ApplyChoice, opts: { repoRoot?: string; storeRoot?: string } = {}):
  | { ok: true; wrote: boolean; path?: string }
  | { ok: false; error: string } {
  const { theirs, merged, row } = queueBodies(db, id);
  if (!row) return { ok: false, error: "dòng chờ không còn" };
  // GHI ⇒ gốc "SẼ nằm đâu", không phải gốc "đang có". Duyệt một mục của máy trắng phải tạo
  // được thư mục; dùng `mirrorRoots()` ở đây là tái tạo đúng vòng luẩn quẩn đã trả giá.
  const root = mirrorRootFor(row.area, opts);
  if (!root) return { ok: false, error: `không xác định được chỗ đặt mục ${row.area} trên máy này` };
  const abs = resolveMirrorPath(root, row.rel);
  if (!abs) return { ok: false, error: "đường dẫn bị từ chối" };

  let body: Buffer | null = null;
  if (choice === "theirs") body = theirs;
  else if (choice === "merged") body = merged ?? theirs;
  if (choice !== "mine" && !body) return { ok: false, error: "không còn nội dung để áp" };

  try {
    if (body) writeFileAtomic(abs, body);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ghi file thất bại" };
  }
  // Mốc mới = nội dung HAI MÁY vừa thống nhất. Chọn `mine` ⇒ mốc là bản của mình.
  const finalBody = body ?? safeRead(abs);
  if (finalBody) {
    writeBase(db, row.peerId, row.area, row.rel, hashBytes(finalBody), isMergeableText(finalBody) ? finalBody : null);
  }
  db.prepare("DELETE FROM peer_file_queue WHERE id=?").run(id);
  return { ok: true, wrote: Boolean(body), path: abs };
}

/** Bỏ một dòng chờ mà KHÔNG đóng mốc — lượt sau sẽ hỏi lại. Đó là điều người bấm "để sau" muốn. */
export function dismissQueued(db: MemoryDB, id: number): boolean {
  return db.prepare("DELETE FROM peer_file_queue WHERE id=?").run(id).changes > 0;
}

function safeRead(abs: string): Buffer | null {
  try {
    return readFileSync(abs);
  } catch {
    return null;
  }
}

// ── Nhận một file từ máy kia ──────────────────────────────────────────────────────────

export interface IncomingResult {
  verdict: MirrorVerdict;
  /** Đã ghi thẳng ra đĩa (mục địa chỉ-theo-nội-dung, hoặc cặp một chiều ở phía đích). */
  applied: boolean;
  /** Đã đặt vào hàng đợi chờ người duyệt. */
  queued: boolean;
  error?: string;
}

/**
 * Xử một file vừa nhận. Đây là CỬA DUY NHẤT của chiều nhận — mọi quyết định áp-hay-hỏi
 * sống ở đây, để không có đường nào lách qua hàng đợi.
 *
 * `autoApply` bật cho đúng hai ca đã chốt: mục `files/` và phía ĐÍCH của cặp một chiều.
 */
export function receiveFile(
  db: MemoryDB,
  peerId: string,
  area: MirrorArea,
  rel: string,
  body: Buffer,
  opts: { autoApply?: boolean; repoRoot?: string; storeRoot?: string } = {},
): IncomingResult {
  // NHẬN ⇒ gốc "SẼ nằm đâu". Đây CHÍNH LÀ chỗ đã hỏng: máy chưa có `docs_visual/` thì mọi
  // file của mục đó bị từ chối, nên thư mục vĩnh viễn không ra đời (xem `mirrorRootFor`).
  const root = mirrorRootFor(area, opts);
  if (!root) return { verdict: "none", applied: false, queued: false, error: `không xác định được chỗ đặt mục ${area} trên máy này` };
  const abs = resolveMirrorPath(root, rel);
  if (!abs) return { verdict: "none", applied: false, queued: false, error: "đường dẫn bị từ chối" };

  const theirHash = hashBytes(body);
  const mine = safeRead(abs);
  const mineHash = mine ? hashBytes(mine) : null;

  // Mục địa chỉ theo NỘI DUNG: trùng tên = trùng nội dung ⇒ có rồi thì thôi, chưa có thì ghi.
  // Không mốc, không hàng đợi, không phân loại — `§9.1` mục 4.
  if (isContentAddressed(area)) {
    if (mineHash) return { verdict: "same", applied: false, queued: false };
    try {
      writeFileAtomic(abs, body);
    } catch (e) {
      return { verdict: "take", applied: false, queued: false, error: e instanceof Error ? e.message : "ghi thất bại" };
    }
    return { verdict: "take", applied: true, queued: false };
  }

  const base = readBase(db, peerId, area, rel);
  const verdict = classify(base?.hash ?? null, mineHash, theirHash);
  if (verdict === "same") {
    // Hai bên khớp ⇒ đây LÀ một lần gặp nhau. Đóng mốc, nếu không thì lượt sau lại "không có base".
    writeBase(db, peerId, area, rel, theirHash, isMergeableText(body) ? body : null);
    return { verdict, applied: false, queued: false };
  }
  if (verdict === "none" || verdict === "push") return { verdict, applied: false, queued: false };

  if (opts.autoApply) {
    // Cặp MỘT CHIỀU, phía đích: nguồn thắng, không hỏi. `§9.7` ca 5 đòi UI nói TRƯỚC là sẽ bị đè —
    // đó là việc của bề mặt lúc đặt chiều, không phải chỗ này im lặng không ghi gì.
    try {
      writeFileAtomic(abs, body);
    } catch (e) {
      return { verdict, applied: false, queued: false, error: e instanceof Error ? e.message : "ghi thất bại" };
    }
    writeBase(db, peerId, area, rel, theirHash, isMergeableText(body) ? body : null);
    return { verdict, applied: true, queued: false };
  }

  let finalVerdict: "take" | "merge" | "block" = verdict === "take" ? "take" : "block";
  let mergedBody: Buffer | null = null;
  if (verdict === "merge" && base?.body && mine && isMergeableText(body) && isMergeableText(mine)) {
    const r = merge3(splitLines(base.body), splitLines(mine), splitLines(body));
    if (r.ok) {
      finalVerdict = "merge";
      mergedBody = Buffer.from(r.lines.join(eolOf(mine)) + eolOf(mine), "utf8");
    }
  }
  enqueue(db, { peerId, area, rel, verdict: finalVerdict, theirBody: body, theirHash, mineHash, mergedBody });
  return { verdict: finalVerdict, applied: false, queued: true };
}

/**
 * Cắt dòng cho phép hợp nhất. `\r` bị bóc ra khỏi từng dòng — nếu không thì một file CRLF
 * và một file LF không có DÒNG NÀO khớp nhau, `merge3` đọc thành "sửa trọn file" và mọi
 * lượt gặp đều thành CHẶN (`02_RULES §EOL` nói về cùng một bệnh ở chiều ghi).
 */
function splitLines(b: Buffer): string[] {
  return b.toString("utf8").split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
}

/** Kiểu xuống dòng của BẢN MÌNH — bản gộp ghi đè lên file của mình nên phải theo nó (`§EOL`). */
function eolOf(b: Buffer): string {
  const s = b.toString("utf8");
  return s.includes("\r\n") ? "\r\n" : "\n";
}

// ── Cửa cho bề mặt ────────────────────────────────────────────────────────────────────

/**
 * Kết nối DÙNG LẠI cho lớp mirror.
 *
 * 🔴 Vì sao không mở-rồi-đóng mỗi lượt: `openMemory()` chạy trọn `SCHEMA` + `FTS` + kiểm
 * migration ở MỖI lần mở. Lượt mirror đầu tiên xử **5.446 tệp** (đo 2026-09-23), nên mở
 * theo từng file là trả cái giá đó năm nghìn lượt cho một việc chỉ cần một lần.
 *
 * Khoá theo ĐƯỜNG KHO, không phải một cờ bật/tắt: `memory relocate` đổi đường giữa lúc
 * daemon sống, và một handle ướp cứng sẽ ghi tiếp vào kho CŨ — đúng họ lỗi hằng `MEMORY_DB`
 * đóng băng lúc nạp module đã trả giá ngày 2026-09-15.
 */
let mirrorDbCache: { path: string; db: MemoryDB } | null = null;
export function mirrorDb(): MemoryDB {
  const path = currentMemoryDb();
  if (mirrorDbCache && mirrorDbCache.path === path) return mirrorDbCache.db;
  try {
    mirrorDbCache?.db.close();
  } catch {
    /* đóng được thì tốt */
  }
  mirrorDbCache = { path, db: openMemory(path) };
  return mirrorDbCache.db;
}

/** Đếm nhanh cho huy hiệu trên tab đồng bộ (`§9.6`). Kho không mở được ⇒ 0, không ném. */
export function mirrorQueueCount(): number {
  try {
    return queueCount(mirrorDb());
  } catch {
    return 0;
  }
}

/**
 * Bộ hook cho lớp phiên (`peer.ts`) — CỬA DUY NHẤT nối dây với trạng thái.
 *
 * Bốn chỗ trong `index.ts` dựng phiên (nghe · gọi thẳng · qua relay · qua đục lỗ) đều lấy
 * từ đây. Dựng riêng ở từng chỗ là cách bốn bản lệch nhau, mà lệch ở lớp này nghĩa là một
 * đường nào đó **áp thẳng thay vì hỏi** — đúng thứ hàng đợi duyệt sinh ra để chặn.
 *
 * Fail-open ở mọi nhánh (điều 9): quét hỏng ⇒ kiểm kê rỗng; kho không mở được ⇒ coi như
 * không nhận gì. Lớp mirror hỏng KHÔNG bao giờ được kéo lớp khối theo.
 */
export function mirrorHooks(opts: { repoRoot?: string; storeRoot?: string; db?: MemoryDB; peerSync?: PeerSyncLookup } = {}): {
  inventory: () => MirrorEntry[];
  read: (area: MirrorArea, rel: string) => Buffer | null;
  receive: (peerId: string, area: MirrorArea, rel: string, body: Buffer) => { applied: boolean; queued: boolean; error?: string };
  mayPush: (peerId: string) => boolean;
  pending: (peerId: string) => Array<{ area: string; rel: string; hash: string }>;
} {
  // Tra chiều đồng bộ. Tiêm được vì cổng dựng HAI "máy" trong MỘT tiến trình, mà cấu hình
  // thì chỉ có một — không tiêm thì cả hai máy giả đọc chung một chiều và ca `one-way`
  // không dựng lại được. Mặc định vẫn là cấu hình thật, nên đường production không đổi.
  const lookup: PeerSyncLookup = opts.peerSync ?? getPeerSync;
  return {
    inventory: () => {
      try {
        return scanMirror(opts).entries;
      } catch {
        return [];
      }
    },
    // CÙNG `opts` với `inventory` — đó là cả điểm của việc phép đọc sống ở đây chứ không ở
    // lớp dây: một gốc, một câu trả lời cho *"file này nằm đâu"*.
    read: (area, rel) => {
      // ĐỌC: gốc chưa có thì `safeRead` trả `null` — cùng kết cục, một đường.
      const root = mirrorRootFor(area, opts);
      if (!root) return null;
      const abs = resolveMirrorPath(root, rel);
      return abs ? safeRead(abs) : null;
    },
    receive: (peerId, area, rel, body) => {
      try {
        // Cặp MỘT CHIỀU mà NGUỒN là máy kia ⇒ ta là đích ⇒ áp thẳng, không hàng đợi (§9.2).
        const cfg = lookup(peerId);
        const autoApply = cfg.direction === "one-way" && isSourcePeer(cfg.source, peerId);
        const r = receiveFile(opts.db ?? mirrorDb(), peerId, area, rel, body, { ...opts, autoApply });
        return { applied: r.applied, queued: r.queued, error: r.error };
      } catch (e) {
        return { applied: false, queued: false, error: e instanceof Error ? e.message : "lỗi khi nhận file" };
      }
    },
    /**
     * Những gì ta ĐÃ CẦM của máy đó mà còn chờ người duyệt — khai ra để nó thôi gửi lại.
     *
     * 🔴 Không có phần khai này thì một mục trong hàng đợi bị chở lại MỖI LƯỢT, mãi mãi: file chờ
     * duyệt không bao giờ nằm trên đĩa nên kiểm kê không thấy nó, và bên kia đọc ra *"máy này còn
     * thiếu"*. Với liên kết thường trực (lượt cách nhau 30 giây) thì một hàng đợi 114 mục là 114
     * file chạy lại suốt ngày — đo thật 24/09 ngay khi liên kết vừa thành thường trực.
     *
     * Fail-open: kho hỏng ⇒ khai rỗng ⇒ cùng lắm chở thừa, không được làm chết pha mirror.
     */
    pending: (peerId) => {
      try {
        return listQueue(opts.db ?? mirrorDb(), peerId)
          .filter((r) => r.theirHash)
          .map((r) => ({ area: r.area, rel: r.rel, hash: r.theirHash as string }));
      } catch {
        return [];
      }
    },
    mayPush: (peerId) => {
      try {
        const cfg = lookup(peerId);
        // Một chiều: chỉ máy NGUỒN được đẩy. Nguồn chưa khai ⇒ KHÔNG đẩy — thà không đồng bộ
        // còn hơn đoán ai là chủ rồi đè lên bản của người ta.
        if (cfg.direction === "one-way") return !isSourcePeer(cfg.source, peerId);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type PeerSyncLookup = (peerId: string) => { direction: "two-way" | "one-way"; source?: string };

/** Máy kia có phải NGUỒN của cặp một chiều không. So bỏ gạch nối, không phân biệt hoa thường. */
function isSourcePeer(source: string | undefined, peerId: string): boolean {
  if (!source) return false;
  const n = (s: string): string => s.replace(/-/g, "").toUpperCase();
  return n(source) === n(peerId);
}

/** Dọn mọi dòng chờ của một máy — dùng khi gỡ ghép đôi, để hàng đợi không trỏ vào máy đã đi. */
export function clearPeerQueue(db: MemoryDB, peerId: string): number {
  return db.prepare("DELETE FROM peer_file_queue WHERE peer_id=?").run(peerId).changes;
}

/**
 * Hai bên đã HỘI TỤ chưa — chốt ① của `§9.2`, điều kiện để được LẬT CHỦ.
 *
 * Trả về số file còn lệch. Lật khi chưa hội tụ thì lượt đẩy đầu tiên của chủ mới mang bản
 * THIẾU sang đè bản đủ, và không lỗi nào nổ.
 */
export function divergentCount(mine: MirrorEntry[], theirs: MirrorEntry[]): number {
  const key = (e: MirrorEntry): string => `${e.area}/${e.rel}`;
  const t = new Map(theirs.filter((e) => !isContentAddressed(e.area)).map((e) => [key(e), e.hash ?? ""]));
  const m = new Map(mine.filter((e) => !isContentAddressed(e.area)).map((e) => [key(e), e.hash ?? ""]));
  let n = 0;
  for (const [k, h] of m) if (t.get(k) !== h) n++;
  for (const k of t.keys()) if (!m.has(k)) n++;
  return n;
}
