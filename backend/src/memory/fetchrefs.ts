/**
 * TẢI BYTE cho các hàng `kind='ref'` (plan/23 §2 · plan/25 ④).
 *
 * `ref` là một lời hứa chưa trả: lúc nạp, nền chỉ đưa CON TRỎ (`sediment://file_…`) chứ không
 * đưa nội dung, nên kho ghi nhận "từng có tệp ở đây" rồi thôi. Đo 2026-09-15: **3.223 hàng**,
 * 100% từ `chatgpt-web`. User chốt cùng ngày rằng byte tải từ nền web là **NGUỒN CẤP HAI**
 * (`plan/23 §1`) — nền xoá hội thoại thì bản trong kho là bản duy nhất ⇒ mỗi hàng chưa tải là
 * một khoản NỢ, không phải một trạng thái ổn.
 *
 * BỐN DỮ KIỆN ĐO ĐƯỢC ngày 2026-09-15, mỗi cái ràng buộc một chỗ trong file này:
 *  ① `GET /backend-api/files/<id>/download` (kèm `Bearer`) trả `{download_url}` có chữ ký `sig`;
 *     thiếu token ⇒ **403**.
 *  ② Node **KHÔNG** tải thẳng `download_url` được — 403 cả ba mẫu, dù URL đã ký. Byte buộc phải
 *     đi qua TRANG đã đăng nhập (đúng `plan/07 §5(c)`: fetch từ Node thuần bị chặn). Vì vậy
 *     đường lấy byte nằm sau một hàm TIÊM ĐƯỢC chứ không gọi `fetch` thẳng ở đây.
 *  ③ Cửa sổ chở được **4,76 MB** qua một lời gọi `Runtime.evaluate` (base64) trong 3,17 s, byte
 *     nguyên vẹn — trang tự băm và Node băm lại, khớp. Chưa chạm trần ở mức đó.
 *  ④ `bytes` đang lưu **không đáng tin**: hàng lớn nhất khai 7.900.654 B, nền trả 4.758.216 B.
 *     Nên mọi con số kích thước ở đây lấy từ BYTE THẬT, và hàng DB được sửa lại theo.
 *
 * THỨ TỰ GHI giống `extractBlobs` và vì cùng một lý do: ghi tệp → đọc lại kiểm `sha256` → mới
 * sửa hàng DB. Hỏng giữa chừng thì rơi về phía VÔ HẠI (một tệp thừa, `files gc` dọn) thay vì
 * phía tệ (hàng khai có byte mà tệp không có ⇒ bề mặt render 404).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDb, openMemory, type MemoryDB } from "./db.js";
import { filesRoot, relPathFor } from "./filestore.js";

/** Con trỏ của ChatGPT. Hai lược đồ đo được: `sediment://` 3.208 · `file-service://` 15. */
const POINTER_RE = /^(?:sediment|file-service):\/\/(.+)$/;

/** Byte một tệp lấy về được, kèm thứ nền biết mà kho chưa có (tên gốc · mime thật). */
export interface FetchedFile {
  bytes: Buffer;
  /** Tên gốc nền trả về; kho đang giữ `null` cho cả 3.223 hàng nên đây là phần được thêm. */
  name: string | null;
  /** Mime thật (`image/png`); kho đang giữ `image/*` — nhãn hạng, không phải mime. */
  mime: string | null;
}

/**
 * Cách lấy byte của MỘT tệp. Tiêm được có chủ đích: đường thật cần một cửa sổ trình duyệt đã
 * đăng nhập (dữ kiện ②), thứ không dựng được trong cổng test. Cổng tiêm hàm giả và vẫn soi
 * đúng phần đáng soi — ghi tệp, kiểm sha, sửa hàng, nhịp, tiếp tục sau khi đứt.
 */
export type RefFetcher = (fileId: string, row: RefRow) => Promise<FetchedFile>;

export interface RefRow {
  id: number;
  sha256: string;
  mime: string | null;
  name: string | null;
  bytes: number | null;
  src_path: string;
  created_at: string | null;
  /** Phiên mang tệp này — `chatgpt-<conversation id>`. Cần cho nhóm gizmo (xem `chatgptRefFetcher`). */
  session_id: string | null;
}

export interface FetchRefsResult {
  /** Hàng nay đã có byte trên đĩa. */
  fetched: number;
  /** Byte THẬT đã ghi (không phải số `bytes` khai trong kho — xem dữ kiện ④). */
  bytes: number;
  /** Hàng bỏ qua vì tệp đúng nội dung đã nằm sẵn trong kho tệp (chạy lại không tải lại). */
  skipped: number;
  /** Hàng không lấy được, kèm lý do — nói ra chứ không nuốt. */
  failed: Array<{ id: number; reason: string }>;
  /** Còn bao nhiêu hàng `ref` sau lượt này (0 = hết nợ). */
  remaining: number;
  dryRun: boolean;
}

export interface FetchRefsOptions {
  db?: MemoryDB;
  dbPath?: string;
  root?: string;
  /** Lấy byte về. Thiếu ⇒ hàm chỉ ĐẾM (dry-run ép buộc), không bịa đường tải. */
  fetcher?: RefFetcher;
  limit?: number;
  /** Nhịp giữa hai tệp. Mặc định 1,5 s theo `plan/07 §11` (tường 429 ở ~200 request liên tục). */
  delayMs?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
  /** Cho cổng test bấm giờ giả; mặc định là `setTimeout` thật. */
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms).unref?.());

/** Tách `file_…` khỏi con trỏ. Không khớp lược đồ đã biết ⇒ `null`, KHÔNG đoán. */
export function fileIdOf(srcPath: string | null): string | null {
  if (!srcPath) return null;
  const m = POINTER_RE.exec(srcPath.trim());
  return m ? m[1] : null;
}

function sha256Of(abs: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Kéo byte về cho các hàng `ref`.
 *
 * Nhịp và cách tiếp tục sau khi đứt đều theo `plan/07 §11`: chậm đều, và **hàng đã tải xong
 * không còn là `ref`** nên lượt sau tự bỏ qua — không cần một cuốn sổ thứ hai để nhớ đã tới đâu
 * (một sổ riêng là thứ có thể lệch với sự thật; trạng thái nằm ngay trên hàng thì không).
 */
export async function fetchRefs(opts: FetchRefsOptions = {}): Promise<FetchRefsResult> {
  const db = opts.db ?? openMemory(opts.dbPath ?? currentMemoryDb());
  const root = opts.root ?? filesRoot();
  const log = opts.log ?? (() => {});
  const sleep = opts.sleep ?? wait;
  const delayMs = opts.delayMs ?? 1500;
  const dryRun = Boolean(opts.dryRun) || !opts.fetcher;
  const out: FetchRefsResult = { fetched: 0, bytes: 0, skipped: 0, failed: [], remaining: 0, dryRun };

  const countRefs = (): number =>
    (db.prepare("SELECT COUNT(*) n FROM attachment WHERE kind = 'ref'").get() as { n: number }).n;

  // Phiên lấy qua `attachment_link` chứ KHÔNG qua `attachment.session_id`: cột đó chỉ giữ tin
  // ĐẦU TIÊN mang nội dung ấy (dedup theo sha256), đo 2026-07-28 là hụt 22% số tin. Ở đây nó
  // load-bearing thật — sai phiên nghĩa là sai `gizmo_id`, tức tệp nhóm gizmo không tải được.
  const rows = db
    .prepare(
      `SELECT a.id, a.sha256, a.mime, a.name, a.bytes, a.src_path, a.created_at,
              COALESCE(MIN(m.session_id), a.session_id) AS session_id
         FROM attachment a
         LEFT JOIN attachment_link l ON l.attachment_id = a.id
         LEFT JOIN messages m ON m.id = l.message_id
        WHERE a.kind = 'ref' AND a.src_path IS NOT NULL
        GROUP BY a.id
        ORDER BY a.id${opts.limit ? " LIMIT " + Math.max(1, Math.floor(opts.limit)) : ""}`,
    )
    .all() as RefRow[];

  // Một hàng blob khác đã giữ CÙNG nội dung ⇒ `sha256` là UNIQUE nên không sửa hàng này được.
  // Kiểm TRƯỚC khi ghi tệp: ghi rồi mới phát hiện là để lại một tệp mồ côi cho `files gc`.
  const dupe = db.prepare("SELECT id FROM attachment WHERE sha256 = ? AND id <> ?");
  const upd = db.prepare(
    `UPDATE attachment
        SET kind = 'blob', blob = NULL, src_path = ?, sha256 = ?, bytes = ?,
            mime = COALESCE(?, mime), name = COALESCE(?, name)
      WHERE id = ?`,
  );

  if (dryRun) {
    out.remaining = countRefs();
    const n = rows.length;
    const est = rows.reduce((s, r) => s + (r.bytes ?? 0), 0);
    log(
      `dry-run: ${n} hàng sẽ được tải · ~${(est / 1048576).toFixed(1)} MB theo số KHAI BÁO ` +
        `(số thật lệch được — đo 15/09: một hàng khai 7,9 MB, nền trả 4,76 MB)`,
    );
    if (!opts.fetcher) log("  (chưa có đường lấy byte ⇒ chỉ đếm; mở cửa sổ khe rồi chạy lại để tải thật)");
    if (!opts.db) db.close();
    return out;
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fileId = fileIdOf(r.src_path);
    if (!fileId) {
      out.failed.push({ id: r.id, reason: `lược đồ con trỏ lạ: ${String(r.src_path).slice(0, 40)}` });
      continue;
    }
    try {
      const got = await opts.fetcher!(fileId, r);
      if (!got?.bytes?.length) {
        out.failed.push({ id: r.id, reason: "nền trả 0 byte" });
        continue;
      }
      const sha = createHash("sha256").update(got.bytes).digest("hex");
      const clash = dupe.get(sha, r.id) as { id: number } | undefined;
      if (clash) {
        // KHÔNG tự gộp và KHÔNG tự xoá: gộp hai hàng là đụng `attachment_link` của người khác,
        // xoá là bất khả đảo (`02_RULES §Hành xử`). Nói ra để người quyết.
        out.failed.push({ id: r.id, reason: `nội dung trùng hàng #${clash.id} — chưa có chính sách gộp` });
        continue;
      }
      const mime = got.mime ?? r.mime;
      const name = got.name ?? r.name;
      const rel = relPathFor({ sha256: sha, mime, name, createdAt: r.created_at });
      const abs = join(root, ...rel.split("/"));
      if (existsSync(abs) && sha256Of(abs) === sha) {
        upd.run(rel, sha, got.bytes.length, mime, name, r.id);
        out.skipped++;
      } else {
        mkdirSync(dirname(abs), { recursive: true });
        // Tên tạm rồi đổi tên: một lượt bị cắt không được để lại tệp CỤT mang đúng tên thật,
        // vì lượt sau sẽ tưởng nó lành rồi bỏ qua (cùng bài học `extractBlobs`).
        const tmp = `${abs}.part-${process.pid}`;
        writeFileSync(tmp, got.bytes);
        renameSync(tmp, abs);
        if (sha256Of(abs) !== sha) {
          rmSync(abs, { force: true });
          out.failed.push({ id: r.id, reason: "đọc lại từ đĩa không khớp sha" });
          continue;
        }
        upd.run(rel, sha, got.bytes.length, mime, name, r.id);
        out.fetched++;
        out.bytes += got.bytes.length;
      }
    } catch (error) {
      out.failed.push({ id: r.id, reason: error instanceof Error ? error.message.slice(0, 160) : "lỗi không rõ" });
    }
    if (i % 50 === 49) log(`  … ${i + 1}/${rows.length} · tải ${out.fetched} · bỏ qua ${out.skipped} · lỗi ${out.failed.length}`);
    if (delayMs > 0 && i < rows.length - 1) await sleep(delayMs);
  }

  out.remaining = countRefs();
  if (!opts.db) db.close();
  return out;
}

/**
 * Bề mặt tối thiểu của một trang đã đăng nhập: chạy được một biểu thức và trả giá trị.
 *
 * Khai hẹp có chủ đích — module này KHÔNG import `scanweb.ts` (nơi giữ cả luồng mở cửa sổ,
 * xác thực, dò tab). Người gọi nối CDP rồi đưa vào; ở đây chỉ cần đúng một phép.
 */
export interface PageEvaluator {
  evaluate<T = unknown>(expression: string, timeoutMs?: number): Promise<T>;
}

/** Trang trả về gì sau một lượt tải — hai đầu cùng băm để phát hiện hỏng đường truyền. */
interface InPageResult {
  b64: string;
  sha: string;
  bytes: number;
  name: string | null;
  mime: string | null;
  err?: string;
  /** Mã HTTP khi hỏng — 403 là tín hiệu ĐỔI ĐƯỜNG (nhóm gizmo), không phải lỗi cuối. */
  status?: number;
}

/** Hội thoại của một phiên `chatgpt-<uuid>`; hình dạng khác ⇒ `null` (không đoán). */
export function conversationIdOf(sessionId: string | null): string | null {
  if (!sessionId) return null;
  const m = /^chatgpt-([0-9a-f-]{16,})$/i.exec(sessionId.trim());
  return m ? m[1] : null;
}

/**
 * Lấy byte QUA TRANG ChatGPT đã đăng nhập (dữ kiện ① ② ③ ở đầu file).
 *
 * 🔴 **HAI NHÓM TỆP, HAI ĐƯỜNG — đo 2026-09-15 sau khi lượt thật hỏng 27/50 (54%).**
 * Tệp của hội thoại thường (`use_case:"multimodal"`) lấy được ở `/files/<id>/download`. Tệp nằm
 * trong một **Project/GPT** (`use_case:"gizmo"`, `direct_get_only:true`) trả **403 ở đúng endpoint
 * đó** dù `/files/<id>` vẫn trả 200 `state:"ready"` — tức tệp còn nguyên, chỉ là đường kia không
 * cấp URL cho nó. Tám biến thể endpoint đoán bằng tay đều trượt; đường thật tìm ra bằng cách **mở
 * hội thoại rồi nhìn chính trang gọi gì**: nó thêm đúng một tham số `gizmo_id`.
 *
 * `gizmo_id` KHÔNG có trong kho (`sessions.project_root` giữ TÊN project — "RAG" — chứ không giữ
 * id), nên phải hỏi lại nền một lần cho mỗi hội thoại rồi **nhớ trong phiên chạy**: đo được 3.106
 * /3.152 hàng `ref` thuộc hội thoại có project, mà một hội thoại thường mang nhiều ảnh.
 *
 * Thứ tự: thử đường THƯỜNG trước (rẻ, phủ nhóm lớn), 403 mới đi hỏi `gizmo_id`. Ngược lại là bắt
 * mọi tệp trả tiền cho một lời gọi mà phần lớn không cần.
 *
 * Trang tự băm `sha256` của byte nó vừa tải rồi gửi kèm base64; Node băm lại và so. Hai phép băm
 * độc lập nên lệch = chuyển đổi làm hỏng, khớp = đường ống sạch (`02_RULES §Hành xử` — kiểm bằng
 * đường thứ hai khác cơ chế). So độ dài KHÔNG đủ: base64 hỏng một ký tự vẫn ra đúng số byte.
 */
export function chatgptRefFetcher(page: PageEvaluator, timeoutMs = 180_000): RefFetcher {
  // Hội thoại → gizmo_id, nhớ trong một lượt chạy. `null` = đã hỏi và hội thoại KHÔNG thuộc
  // project nào (nhớ cả câu trả lời âm, để không hỏi lại 100 lần cho cùng một hội thoại).
  const gizmoOf = new Map<string, string | null>();

  return async (fileId: string, row: RefRow): Promise<FetchedFile> => {
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(fileId)) throw new Error(`file id lạ: ${fileId.slice(0, 40)}`);
    const conv = conversationIdOf(row?.session_id ?? null);

    const run = async (gizmoId: string | null): Promise<InPageResult> => {
      const url = gizmoId
        ? `'/backend-api/files/download/${fileId}?gizmo_id=${gizmoId}&post_id=&inline=false&download_intent=false'`
        : `'/backend-api/files/${fileId}/download'`;
      const expr = `
(async () => {
  try {
    const t = (await (await fetch('/api/auth/session')).json()).accessToken;
    if (!t) return { err: 'chưa đăng nhập' };
    const h = { Authorization: 'Bearer ' + t };
    const res = await fetch(${url}, { headers: h });
    if (!res.ok) return { err: 'HTTP ' + res.status, status: res.status };
    const d = await res.json();
    if (!d || !d.download_url) return { err: 'không có download_url' };
    const r = await fetch(d.download_url);
    if (!r.ok) return { err: 'HTTP ' + r.status + ' khi tải byte', status: r.status };
    const buf = new Uint8Array(await r.arrayBuffer());
    const dig = await crypto.subtle.digest('SHA-256', buf);
    const sha = [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('');
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { b64: btoa(s), sha, bytes: buf.length, name: (d.file_name || null), mime: (d.mime_type || r.headers.get('content-type') || null) };
  } catch (e) { return { err: String(e).slice(0, 160) }; }
})()`;
      return page.evaluate<InPageResult>(expr, timeoutMs);
    };

    /** Hỏi nền hội thoại này thuộc project nào. Hỏi đúng MỘT lần cho mỗi hội thoại. */
    const askGizmo = async (convId: string): Promise<string | null> => {
      if (gizmoOf.has(convId)) return gizmoOf.get(convId) ?? null;
      const expr = `
(async () => {
  try {
    const t = (await (await fetch('/api/auth/session')).json()).accessToken;
    const c = await (await fetch('/backend-api/conversation/${convId}', { headers: { Authorization: 'Bearer ' + t } })).json();
    return { gizmo: c.gizmo_id || c.conversation_template_id || null };
  } catch (e) { return { gizmo: null }; }
})()`;
      let gid: string | null = null;
      try {
        const r = await page.evaluate<{ gizmo: string | null }>(expr, timeoutMs);
        gid = typeof r?.gizmo === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(r.gizmo) ? r.gizmo : null;
      } catch {
        gid = null; // hỏi không được ⇒ coi như không có; lượt sau vẫn thử lại được
      }
      gizmoOf.set(convId, gid);
      return gid;
    };

    let got = await run(null);
    if (got?.err && got.status === 403 && conv) {
      const gid = await askGizmo(conv);
      if (gid) got = await run(gid);
    }
    if (!got || got.err) throw new Error(got?.err ?? "trang không trả gì");
    const bytes = Buffer.from(got.b64, "base64");
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== got.bytes || sha !== got.sha) {
      throw new Error(`byte hỏng trên đường về (${bytes.length}B/${sha.slice(0, 8)} ≠ ${got.bytes}B/${String(got.sha).slice(0, 8)})`);
    }
    return { bytes, name: got.name ?? null, mime: got.mime ?? null };
  };
}
