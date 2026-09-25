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
  /** "Để sau" — vẫn trong hàng đợi (máy kia thôi gửi lại), chỉ ẩn khỏi mặt trước. */
  dismissedAt: string | null;
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
      // Nội dung MỚI từ máy kia ⇒ quyết định "để sau" cũ hết hiệu lực ⇒ hỏi lại. Đúng nghĩa "để sau".
      "their_body=excluded.their_body, mine_hash=excluded.mine_hash, merged_body=excluded.merged_body, created_at=excluded.created_at, dismissed_at=NULL",
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

export function listQueue(
  db: MemoryDB,
  peerId?: string,
  opts: { freshen?: boolean; repoRoot?: string; storeRoot?: string } = {},
): QueueRow[] {
  const sql =
    "SELECT id, peer_id, area, rel, verdict, their_hash, mine_hash, LENGTH(their_body) AS size, created_at, dismissed_at FROM peer_file_queue" +
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
    dismissed_at: string | null;
  }>;
  const out = rows.map((r) => ({
    id: r.id,
    peerId: r.peer_id,
    area: r.area as MirrorArea,
    rel: r.rel,
    verdict: r.verdict as QueueRow["verdict"],
    theirHash: r.their_hash,
    mineHash: r.mine_hash,
    size: r.size ?? 0,
    createdAt: r.created_at,
    dismissedAt: r.dismissed_at,
  }));
  if (!opts.freshen) return out;
  return out.map((r) => freshenRow(db, r, opts)).filter((r): r is QueueRow => r !== null);
}

/**
 * Tính LẠI verdict của một dòng chờ theo tệp ĐANG có trên đĩa. Trả `null` nếu dòng đã hết lý do.
 *
 * 🔴 Verdict được tính lúc NHẬN rồi đóng băng, mà tệp trên đĩa thì không đứng yên — agent sửa
 * docs suốt ngày. Đo tại trận 2026-09-25: dòng `plan/24` nhận lúc 13:06 với verdict `take` (*"họ
 * đổi, tôi không đổi"*); tới 14:00 máy này đã thêm §9.10, verdict đúng phải là `block`. Nút *Nhận*
 * vẫn hiện, bấm là §9.10 **bay im lặng** — đúng cách mục 3.5.10 của `06_CHANGES` đã mất thật.
 *
 * Nên verdict chỉ là bộ đệm; sự thật là `classify(base, đĩa-bây-giờ, họ)`. Mọi cửa ĐỌC (mặt trước)
 * và mọi cửa GHI (`applyQueued`) đều đi qua đây trước — hai cửa, một luật.
 */
export function freshenRow(db: MemoryDB, row: QueueRow, opts: { repoRoot?: string; storeRoot?: string } = {}): QueueRow | null {
  if (isContentAddressed(row.area) || !row.theirHash) return row;
  const root = mirrorRootFor(row.area, opts);
  if (!root) return row;
  const abs = resolveMirrorPath(root, row.rel);
  if (!abs) return row;
  const mine = safeRead(abs);
  const mineHash = mine ? hashBytes(mine) : null;
  if (mineHash === row.mineHash) return row; // đĩa không đổi ⇒ verdict cũ còn đúng, đừng tính lại vô ích

  const { theirs } = queueBodies(db, row.id);
  const base = readBase(db, row.peerId, row.area, row.rel);
  const v = classify(base?.hash ?? null, mineHash, row.theirHash);
  if (v === "same") {
    // Người dùng tự tay chép cho khớp ⇒ hai bên gặp nhau ⇒ đóng mốc, dòng hết lý do.
    writeBase(db, row.peerId, row.area, row.rel, row.theirHash, theirs && isMergeableText(theirs) ? theirs : null);
    db.prepare("DELETE FROM peer_file_queue WHERE id=?").run(row.id);
    return null;
  }
  if (v === "push" || v === "none") {
    // Bản máy này mới hơn (họ chưa đổi kể từ mốc) ⇒ lượt sau ta ĐẨY, không có gì để nhận.
    db.prepare("DELETE FROM peer_file_queue WHERE id=?").run(row.id);
    return null;
  }
  let final: QueueRow["verdict"] = v === "take" ? "take" : "block";
  let merged: Buffer | null = null;
  if (v === "merge" && base?.body && mine && theirs && isMergeableText(theirs) && isMergeableText(mine)) {
    const r = merge3(splitLines(base.body), splitLines(mine), splitLines(theirs));
    if (r.ok) {
      final = "merge";
      merged = Buffer.from(r.lines.join(eolOf(mine)) + eolOf(mine), "utf8");
    }
  }
  db.prepare("UPDATE peer_file_queue SET verdict=?, mine_hash=?, merged_body=? WHERE id=?").run(final, mineHash, merged, row.id);
  return { ...row, verdict: final, mineHash };
}

/** Nội dung hai bản của một dòng chờ — để bề mặt xem khác biệt trước khi duyệt (`§9.6`). */
export function queueBodies(db: MemoryDB, id: number): { theirs: Buffer | null; merged: Buffer | null; row: QueueRow | null } {
  const r = db
    .prepare(
      "SELECT id, peer_id, area, rel, verdict, their_hash, mine_hash, their_body, merged_body, LENGTH(their_body) AS size, created_at, dismissed_at " +
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
        dismissed_at: string | null;
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
      dismissedAt: r.dismissed_at,
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
export function applyQueued(
  db: MemoryDB,
  id: number,
  choice: ApplyChoice,
  opts: { repoRoot?: string; storeRoot?: string } = {},
  /** Verdict người bấm ĐÃ THẤY trên màn hình — lệch với đĩa bây giờ thì từ chối. Vắng ⇒ so với verdict đã lưu. */
  seen?: string,
):
  | { ok: true; wrote: boolean; path?: string }
  | { ok: false; error: string; verdict?: string } {
  let { theirs, merged, row } = queueBodies(db, id);
  if (!row) return { ok: false, error: "dòng chờ không còn" };
  // 🔴 GHI ĐÈ thì phải hỏi đĩa TRƯỚC: verdict trong dòng là ảnh chụp lúc nhận, còn tệp thì không
  // đứng yên. Bấm *Nhận* trên một `take` đã cũ là đè lên phần máy này vừa sửa — mất im lặng, và
  // đã mất thật một lần (xem `freshenRow`). Chọn `mine` không ghi byte nào nên không cần kiểm.
  if (choice !== "mine") {
    const fresh = freshenRow(db, row, opts);
    if (!fresh) return { ok: false, error: "tệp đã hội tụ hoặc bản máy này mới hơn — không còn gì để nhận", verdict: "gone" };
    // So với verdict người bấm ĐÃ THẤY (`seen`), không chỉ với verdict đã lưu: cửa ĐỌC vừa làm tươi
    // dòng thì "đã lưu" đã bằng "đĩa", còn màn hình của người bấm có thể vẫn là ảnh chụp trước đó.
    // Cổng bắt đúng ca này: sau một lượt đọc, cửa ghi không còn gì để so và vẫn đè. Không có `seen`
    // (CLI, script) thì so với verdict đã lưu — vẫn chặn được ca đĩa đổi sau khi dòng được đọc.
    const expect = seen ?? row.verdict;
    if (fresh.verdict !== expect) {
      return { ok: false, error: `tệp đã đổi từ lúc nhận — giờ là "${fresh.verdict}", xem lại khác biệt trước khi chọn`, verdict: fresh.verdict };
    }
    if (fresh !== row) ({ theirs, merged, row } = queueBodies(db, id));
    if (!row) return { ok: false, error: "dòng chờ không còn" };
  }
  // GHI ⇒ gốc "SẼ nằm đâu", không phải gốc "đang có". Duyệt một mục của máy trắng phải tạo
  // được thư mục; dùng `mirrorRoots()` ở đây là tái tạo đúng vòng luẩn quẩn đã trả giá.
  const root = mirrorRootFor(row.area, opts);
  if (!root) return { ok: false, error: `không xác định được chỗ đặt mục ${row.area} trên máy này` };
  const abs = resolveMirrorPath(root, row.rel);
  if (!abs) return { ok: false, error: "đường dẫn bị từ chối" };

  let body: Buffer | null = null;
  if (choice === "theirs") body = theirs;
  // `merged` KHÔNG rơi về `theirs`: người bấm "lấy bản đã gộp" mà nhận trọn bản máy kia là mất
  // phần của mình đúng chỗ họ tưởng đã được giữ. Không có bản gộp ⇒ từ chối, nói rõ.
  else if (choice === "merged") body = merged;
  if (choice !== "mine" && !body) {
    return { ok: false, error: choice === "merged" ? "không có bản gộp — tệp đã đổi, xem lại khác biệt" : "không còn nội dung để áp" };
  }

  try {
    if (body) writeFileAtomic(abs, body);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ghi file thất bại" };
  }
  if (choice === "mine") {
    // 🔴 Giữ bản mình ⇒ mốc là bản CỦA HỌ, không phải của mình.
    //
    // Bản trước đặt mốc = bản của mình. Lượt sau: họ vẫn khác mốc, mình bằng mốc ⇒ `classify` ra
    // `take` ⇒ hỏi lại y nguyên — mỗi 30 giây, mãi mãi. User: *"t bấm xong 1 hồi nó hiện lại"*.
    // Mốc = bản của họ nghĩa là *"tôi đã thấy bản này và từ chối"*: lượt sau họ bằng mốc, mình khác
    // ⇒ `push` ⇒ bản của mình SANG họ. Đó mới là nghĩa của "giữ bản máy này".
    if (row.theirHash) writeBase(db, row.peerId, row.area, row.rel, row.theirHash, theirs && isMergeableText(theirs) ? theirs : null);
  } else if (body) {
    // Mốc mới = nội dung HAI MÁY vừa thống nhất.
    writeBase(db, row.peerId, row.area, row.rel, hashBytes(body), isMergeableText(body) ? body : null);
  }
  db.prepare("DELETE FROM peer_file_queue WHERE id=?").run(id);
  return { ok: true, wrote: Boolean(body), path: abs };
}

/**
 * "Để sau" GIỮ dòng, không xoá.
 *
 * 🔄 Supersede bản trước (*xoá dòng, lượt sau hỏi lại*). Phần khai `pending` của `mfiles` đọc từ
 * chính bảng này để máy kia thôi gửi lại; xoá dòng là máy kia thấy ta "còn thiếu" và chở lại ngay
 * lượt sau — với liên kết thường trực là **30 giây**. User: *"t bấm xong 1 hồi nó hiện lại"*.
 * "Để sau" phải nghĩa là *hỏi lại khi có cái MỚI*: máy kia đổi nội dung ⇒ `enqueue` upsert xoá
 * dấu này ⇒ dòng hiện lại. Không đổi ⇒ im.
 */
export function dismissQueued(db: MemoryDB, id: number): boolean {
  return db.prepare("UPDATE peer_file_queue SET dismissed_at=? WHERE id=?").run(new Date().toISOString(), id).changes > 0;
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
/**
 * Bản của máy kia mà ta ĐÃ XÉT và CỐ Ý không nhận — theo máy · đường dẫn · băm CỦA HỌ.
 *
 * 🔴 Đo 2026-09-25: máy kia chở lại đúng 4 file docs MỖI LƯỢT (527 lượt liên tiếp). Ta đã sửa chúng
 * sau lần gặp cuối ⇒ phân loại ra `push` (bản mình mới hơn) ⇒ không ghi, không xếp hàng, và KHÔNG
 * KHAI gì — nên bên gửi vẫn thấy băm lệch và chở lại mãi. Cùng bệnh với hàng đợi trước khi có `pending`.
 * Khai kèm `pending` ⇒ bên gửi bỏ qua đúng bản đó; bản đó đổi băm thì lại được chở và XÉT LẠI.
 * Giữ trong bộ nhớ tiến trình: khởi động lại thì tốn đúng một lượt chở lại rồi tự khai tiếp.
 */
const declined = new Map<string, Map<string, string>>();

/**
 * Hai trí nhớ chống "hỏi lại bản của chính mình" (user 25/09 — máy kia duyệt xong thì máy này lại
 * bị hỏi về đúng nội dung nó đã gửi đi):
 *   · `knownBase` — mốc đã ghi, để lượt khớp không phải hỏi kho cho từng file mỗi lượt;
 *   · `sentHashes` — băm máy này đã CHỞ đi, theo máy · đường dẫn (giữ vài bản gần nhất).
 * Giữ trong bộ nhớ tiến trình; khởi động lại thì lượt khớp đầu tiên tự dựng lại `knownBase`.
 */
const knownBase = new Map<string, string>();
const sentHashes = new Map<string, string[]>();
const SENT_KEEP = 8;
const memKey = (peerId: string, area: string, rel: string): string => `${peerId}\u0000${area}/${rel}`;
function noteDeclined(peerId: string, area: string, rel: string, theirHash: string | null): void {
  const k = `${area}/${rel}`;
  let m = declined.get(peerId);
  if (!theirHash) {
    m?.delete(k);
    return;
  }
  if (!m) declined.set(peerId, (m = new Map()));
  m.set(k, theirHash);
}

export function mirrorHooks(opts: { repoRoot?: string; storeRoot?: string; db?: MemoryDB; peerSync?: PeerSyncLookup } = {}): {
  inventory: () => MirrorEntry[];
  read: (area: MirrorArea, rel: string) => Buffer | null;
  receive: (peerId: string, area: MirrorArea, rel: string, body: Buffer) => { applied: boolean; queued: boolean; error?: string; verdict?: string };
  mayPush: (peerId: string) => boolean;
  pending: (peerId: string) => Array<{ area: string; rel: string; hash: string }>;
  converged: (peerId: string, area: MirrorArea, rel: string, hash: string) => void;
  sent: (peerId: string, area: MirrorArea, rel: string, hash: string) => void;
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
        // Bản quay về đúng là thứ máy này đã chở đi ⇒ hai bên từng khớp ở đó: dời mốc TRƯỚC khi phân
        // loại, để nó ra "push" (bản mình mới hơn) thay vì "hai bên cùng sửa" — không hỏi lại.
        const incoming = hashBytes(body);
        if (!isContentAddressed(area) && (sentHashes.get(memKey(peerId, area, rel)) ?? []).includes(incoming)) {
          writeBase(opts.db ?? mirrorDb(), peerId, area, rel, incoming, isMergeableText(body) ? body : null);
          knownBase.set(memKey(peerId, area, rel), incoming);
        }
        const r = receiveFile(opts.db ?? mirrorDb(), peerId, area, rel, body, { ...opts, autoApply });
        // Cố ý không nhận (bản mình mới hơn · mình đã xoá) ⇒ nhớ để khai; mọi kết cục khác ⇒ quên.
        const skip = !r.applied && !r.queued && !r.error && (r.verdict === "push" || r.verdict === "none");
        noteDeclined(peerId, area, rel, skip ? hashBytes(body) : null);
        return { applied: r.applied, queued: r.queued, error: r.error, verdict: r.verdict };
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
        const queued = listQueue(opts.db ?? mirrorDb(), peerId)
          .filter((r) => r.theirHash)
          .map((r) => ({ area: r.area, rel: r.rel, hash: r.theirHash as string }));
        const skipped = [...(declined.get(peerId) ?? new Map<string, string>())].map(([k, hash]) => {
          const i = k.indexOf("/");
          return { area: k.slice(0, i), rel: k.slice(i + 1), hash };
        });
        return [...queued, ...skipped];
      } catch {
        return [];
      }
    },
    converged: (peerId, area, rel, hash) => {
      try {
        const k = memKey(peerId, area, rel);
        if (knownBase.get(k) === hash) return;
        const db = opts.db ?? mirrorDb();
        if (readBase(db, peerId, area, rel)?.hash !== hash) {
          const root = mirrorRootFor(area, opts);
          const abs = root ? resolveMirrorPath(root, rel) : null;
          const body = abs ? safeRead(abs) : null;
          // Chỉ ghi khi byte trên đĩa ĐÚNG là băm đó — kiểm kê có thể đã cũ một nhịp.
          if (!body || hashBytes(body) !== hash) return;
          writeBase(db, peerId, area, rel, hash, isMergeableText(body) ? body : null);
        }
        knownBase.set(k, hash);
      } catch {
        /* fail-open: thiếu mốc thì cùng lắm hỏi thừa một lần, không làm chết pha mirror */
      }
    },
    sent: (peerId, area, rel, hash) => {
      const k = memKey(peerId, area, rel);
      const list = (sentHashes.get(k) ?? []).filter((h) => h !== hash);
      list.push(hash);
      sentHashes.set(k, list.slice(-SENT_KEEP));
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

/**
 * GỠ MÁY ⇒ quên trọn trạng thái mirror của máy đó: hàng đợi duyệt · mốc `base` · phần đã từ chối.
 *
 * 🔴 Hàm tiền thân (`clearPeerQueue`) có từ lúc dựng mirror nhưng KHÔNG AI GỌI (audit 25/09): gỡ máy
 * xong, các file chờ duyệt của nó vẫn nằm trong *Cụm máy* và nút Nhận vẫn ghi được chúng ra đĩa. Mốc
 * `base` cũ còn lại thì lần ghép lại sau sẽ phân loại theo một lần gặp đã hết nghĩa.
 * So vân tay theo dạng CHUẨN HOÁ (bỏ gạch, không phân biệt hoa thường) — sổ và phiên có thể ghi khác nhau.
 */
export function forgetPeerMirror(db: MemoryDB, peerId: string): { queue: number; bases: number } {
  const norm = (s: string): string => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const want = norm(peerId);
  const ids = new Set<string>();
  for (const tbl of ["peer_file_queue", "peer_file_state"]) {
    for (const id of db.prepare(`SELECT DISTINCT peer_id FROM ${tbl}`).pluck().all() as string[]) if (norm(id) === want) ids.add(id);
  }
  let queue = 0;
  let bases = 0;
  for (const id of ids) {
    queue += db.prepare("DELETE FROM peer_file_queue WHERE peer_id=?").run(id).changes;
    bases += db.prepare("DELETE FROM peer_file_state WHERE peer_id=?").run(id).changes;
    declined.delete(id);
  }
  for (const k of [...declined.keys()]) if (norm(k) === want) declined.delete(k);
  for (const m of [knownBase, sentHashes]) for (const k of [...m.keys()]) if (norm(k.split("\u0000")[0]) === want) m.delete(k);
  return { queue, bases };
}

/**
 * Hai bên đã HỘI TỤ chưa — chốt ① của `§9.2`, điều kiện để được LẬT CHỦ.
 *
 * ⚠ CHƯA NỐI (audit 25/09 thấy không ai gọi) — CỐ Ý GIỮ: đây là "phép đủ" của chốt ① mà `05_TODO`
 * còn ghi nợ (hiện chỉ có phép XẤP XỈ theo hàng đợi). Nó cần kiểm kê của máy kia, chỉ có trong một
 * phiên đang chạy. Nối nó thì xoá dòng này; bỏ hẳn chốt ① thì xoá cả hàm.
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
