/**
 * KHO TỆP trên đĩa (plan/25 §1–§2) — byte của đính kèm sống thành FILE THẬT, không nằm
 * trong `global_memory.db`.
 *
 * Vì sao tách: byte đính kèm **không bao giờ đổi**, mà nằm trong kho thì mỗi vòng sao lưu
 * chép lại toàn bộ, còn `verify`/`vacuum` đọc hết file. Đo 2026-09-14: 2.099 ảnh = 222 MB
 * trong một kho 3,3 GB, và còn 3.223 mục `ref` (~611 MB) chưa tải. Tách ra thì ba việc bảo
 * trì kho đứng yên bất kể kho ảnh lớn cỡ nào — và quan trọng hơn, người dùng MỞ được thư
 * mục ảnh như một app chat, thứ không làm được khi byte nằm trong cột BLOB.
 *
 * Ranh giới với điều 3 (một nguồn cho mỗi lớp): **DB giữ CHỈ MỤC** (`name` · `mime` ·
 * `bytes` · `sha256` · `attachment_link`), **thư mục giữ BYTE**. Không có lớp nào bị nhân đôi.
 *
 * THỨ TỰ GHI là một phần của thiết kế, không phải chi tiết cài đặt: ghi file → đối chiếu
 * `sha256` → mới cập nhật hàng DB. Nhờ vậy ca hỏng rơi vào phía VÔ HẠI (file thừa, `gc` dọn)
 * thay vì phía tệ (hàng trỏ vào file không có ⇒ ảnh vỡ mà không ai báo).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { currentStoreRoot, openMemory, type MemoryDB } from "./db.js";

/** Nhà của kho tệp — trong GỐC KHO, nên nó đi sang máy khác cùng bộ nhớ (plan/25 §3). */
/** Một đính kèm như lớp recall nhìn thấy: đủ để MỞ, không kèm byte. */
export interface RecallAttachment {
  sha: string;
  name: string | null;
  mime: string | null;
  bytes: number | null;
  /** Đường TUYỆT ĐỐI trên đĩa; `null` khi chưa có byte để mở. */
  path: string | null;
  /** `on-disk` mở được · `not-fetched` chưa tải byte · `in-db` còn nằm trong kho · `text` là chữ. */
  state: "on-disk" | "not-fetched" | "in-db" | "text";
}

export function filesRoot(storeRoot: string = currentStoreRoot()): string {
  return join(storeRoot, "files");
}

/**
 * Hạng thư mục, suy từ `mime` chứ KHÔNG từ đuôi tên.
 *
 * Tên file do người khác đặt (nền web, người gửi) nên đuôi có thể sai hoặc thiếu; `mime` là
 * thứ chính adapter đã đọc được lúc nạp. Năm hạng cố định, khớp chip lọc trên UI (§5).
 */
export function categoryOf(mime: string | null): string {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "images";
  if (m.startsWith("video/") || m.startsWith("audio/")) return "media";
  if (/zip|compress|tar|rar|7z/.test(m)) return "archives";
  if (
    m.startsWith("text/") ||
    /pdf|word|excel|powerpoint|spreadsheet|presentation|document|officedocument|json|xml|csv/.test(m)
  ) {
    return "documents";
  }
  return "other";
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/json": "json",
  "text/csv": "csv",
  "application/zip": "zip",
};

/** Đuôi: ưu tiên tên gốc (người đặt biết rõ nhất), rơi về bảng `mime`, cuối cùng là `bin`. */
function extensionFor(name: string | null, mime: string | null): string {
  const fromName = /\.([A-Za-z0-9]{1,8})$/.exec(name ?? "")?.[1];
  if (fromName) return fromName.toLowerCase();
  const m = (mime ?? "").toLowerCase().split(";")[0].trim();
  if (EXT_BY_MIME[m]) return EXT_BY_MIME[m];
  const tail = m.split("/")[1];
  return tail && /^[a-z0-9]{1,8}$/.test(tail) ? tail : "bin";
}

/** Ký tự hệ tệp cấm. Duyệt theo MÃ chứ không viết dải điều khiển vào class regex —
 *  cách viết đó từng đẻ byte 0x00 THẬT vào mã nguồn (cùng bài học `attachments.ts`). */
const FORBIDDEN = new Set([...String.raw`<>:"/\|?*`]);

/** Bỏ mọi ký tự hệ tệp cấm + cắt ngắn. Tên GỐC vẫn nằm nguyên trong `attachment.name`. */
function safeStem(name: string | null): string {
  const stem = (name ?? "").replace(/\.[A-Za-z0-9]{1,8}$/, "");
  let cleaned = "";
  for (const ch of stem) {
    const code = ch.codePointAt(0) ?? 0;
    cleaned += code < 32 || code === 127 || FORBIDDEN.has(ch) ? "-" : ch;
  }
  cleaned = cleaned.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return cleaned.slice(0, 60);
}

function monthOf(createdAt: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(createdAt ?? "");
  return m ? `${m[1]}-${m[2]}` : "unknown";
}

export interface FilePlacement {
  sha256: string;
  mime: string | null;
  name: string | null;
  createdAt: string | null;
}

/**
 * Đường TƯƠNG ĐỐI trong kho tệp: `<hạng>/<YYYY-MM>/<8 ký tự sha>_<tên>.<đuôi>`.
 *
 * Tám ký tự đầu của `sha256` đứng trước tên để hai tệp trùng tên không đè nhau, mà vẫn đọc
 * được bằng mắt trong trình quản lý tệp — đó là yêu cầu gốc của người dùng (*"phân ra từng
 * loại file"*), không phải trang trí.
 */
export function relPathFor(a: FilePlacement): string {
  const stem = safeStem(a.name);
  const tail = stem ? `${a.sha256.slice(0, 8)}_${stem}` : a.sha256.slice(0, 8);
  return [categoryOf(a.mime), monthOf(a.createdAt), `${tail}.${extensionFor(a.name, a.mime)}`].join("/");
}

/** Đường tương đối ghi trong DB luôn dùng `/`, nhưng đọc đĩa phải theo separator của OS. */
function absOf(root: string, rel: string): string {
  return join(root, ...rel.split("/"));
}

export interface ExtractResult {
  /** Số hàng đã rút byte ra file. */
  moved: number;
  /** Byte đã rời khỏi DB. */
  bytes: number;
  /** Hàng bỏ qua vì đã có file đúng `sha256` (chạy lại KHÔNG đẻ bản sao). */
  skipped: number;
  /** Hàng không rút được, kèm lý do — nói ra chứ không nuốt. */
  failed: Array<{ id: number; reason: string }>;
  dryRun: boolean;
}

/**
 * Rút byte của các hàng `kind='blob'` ra kho tệp.
 *
 * Idempotent: hàng đã có `src_path` trỏ tới file đúng `sha256` thì bỏ qua. Chạy lại lần hai
 * không chép thêm gì — đó là ca ÂM của cổng, vì một lệnh di trú chạy hai lần là chuyện
 * thường (bị ngắt, người gõ lại).
 */
export function extractBlobs(
  opts: { db?: MemoryDB; dbPath?: string; root?: string; limit?: number; dryRun?: boolean } = {},
): ExtractResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  const out: ExtractResult = { moved: 0, bytes: 0, skipped: 0, failed: [], dryRun: Boolean(opts.dryRun) };
  const rows = db
    .prepare(
      `SELECT id, sha256, mime, name, bytes, src_path, created_at
         FROM attachment
        WHERE kind = 'blob' AND blob IS NOT NULL
        ORDER BY id${opts.limit ? " LIMIT " + Math.max(1, Math.floor(opts.limit)) : ""}`,
    )
    .all() as Array<{
    id: number;
    sha256: string;
    mime: string | null;
    name: string | null;
    bytes: number | null;
    src_path: string | null;
    created_at: string | null;
  }>;

  const getBlob = db.prepare("SELECT blob FROM attachment WHERE id = ?");
  const clear = db.prepare("UPDATE attachment SET blob = NULL, src_path = ? WHERE id = ?");

  for (const r of rows) {
    const rel = relPathFor({ sha256: r.sha256, mime: r.mime, name: r.name, createdAt: r.created_at });
    const abs = absOf(root, rel);
    try {
      if (existsSync(abs) && sha256Of(abs) === r.sha256) {
        // Đã có bản đúng nội dung ⇒ chỉ cần hàng DB trỏ đúng chỗ rồi thôi byte.
        if (!opts.dryRun) clear.run(rel, r.id);
        out.skipped++;
        continue;
      }
      const blob = (getBlob.get(r.id) as { blob: Buffer | null }).blob;
      if (!blob) {
        out.failed.push({ id: r.id, reason: "blob rỗng" });
        continue;
      }
      const digest = createHash("sha256").update(blob).digest("hex");
      if (digest !== r.sha256) {
        // KHÔNG ghi thứ mình không chứng minh được. Hàng lệch sha là dấu hiệu hỏng dữ liệu,
        // rút nó ra file là đóng dấu cái sai lên đĩa.
        out.failed.push({ id: r.id, reason: `sha lệch (${digest.slice(0, 8)} ≠ ${r.sha256.slice(0, 8)})` });
        continue;
      }
      if (!opts.dryRun) {
        mkdirSync(dirname(abs), { recursive: true });
        // Ghi qua tên tạm rồi đổi tên: một lượt ghi bị cắt giữa chừng không được để lại
        // file CỤT mang đúng tên thật — lần chạy sau sẽ tưởng nó lành rồi bỏ qua.
        const tmp = `${abs}.part-${process.pid}`;
        writeFileSync(tmp, blob);
        renameSync(tmp, abs);
        if (sha256Of(abs) !== r.sha256) {
          rmSync(abs, { force: true });
          out.failed.push({ id: r.id, reason: "đọc lại từ đĩa không khớp sha" });
          continue;
        }
        clear.run(rel, r.id);
      }
      out.moved++;
      out.bytes += r.bytes ?? blob.length;
    } catch (error) {
      out.failed.push({ id: r.id, reason: error instanceof Error ? error.message : "lỗi không rõ" });
    }
  }
  if (!opts.db) db.close();
  return out;
}

function sha256Of(abs: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

export interface VerifyResult {
  checked: number;
  ok: number;
  /** Hàng DB trỏ tới file KHÔNG có trên đĩa — ảnh vỡ, hạng nặng nhất. */
  missing: Array<{ id: number; rel: string }>;
  /** File có mặt nhưng nội dung không khớp `sha256` đã ghi. */
  corrupt: Array<{ id: number; rel: string }>;
}

/** Soi từng hàng đã rút: file còn không, nội dung có đúng `sha256` không. Thuần ĐỌC. */
export function verifyFiles(opts: { db?: MemoryDB; dbPath?: string; root?: string } = {}): VerifyResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  const out: VerifyResult = { checked: 0, ok: 0, missing: [], corrupt: [] };
  const rows = db
    .prepare("SELECT id, sha256, src_path FROM attachment WHERE blob IS NULL AND src_path IS NOT NULL AND kind = 'blob'")
    .all() as Array<{ id: number; sha256: string; src_path: string }>;
  for (const r of rows) {
    out.checked++;
    const abs = absOf(root, r.src_path);
    if (!existsSync(abs)) {
      out.missing.push({ id: r.id, rel: r.src_path });
      continue;
    }
    if (sha256Of(abs) !== r.sha256) out.corrupt.push({ id: r.id, rel: r.src_path });
    else out.ok++;
  }
  if (!opts.db) db.close();
  return out;
}

export interface GcResult {
  /** File trong kho tệp mà KHÔNG hàng nào trỏ tới. */
  orphans: string[];
  bytes: number;
  removed: string[];
  dryRun: boolean;
}

/**
 * Tìm file không còn hàng DB nào trỏ tới.
 *
 * Mặc định **chỉ ĐO** — xoá là huỷ dữ liệu, phải do người quyết (`02_RULES §Hành xử`), và
 * bài học `attachment_link` 2026-07 còn nguyên: một tiêu chí mồ côi nghe hợp lý từng suýt
 * xoá 87 ảnh đang sống.
 */
export function gcFiles(opts: { db?: MemoryDB; dbPath?: string; root?: string; remove?: boolean } = {}): GcResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  const out: GcResult = { orphans: [], bytes: 0, removed: [], dryRun: !opts.remove };
  const known = new Set(
    (db.prepare("SELECT src_path FROM attachment WHERE src_path IS NOT NULL").all() as Array<{ src_path: string }>).map(
      (r) => r.src_path,
    ),
  );
  const walk = (dir: string): void => {
    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        walk(abs);
        continue;
      }
      const rel = relative(root, abs).split(sep).join("/");
      if (known.has(rel)) continue;
      out.orphans.push(rel);
      try {
        out.bytes += statSync(abs).size;
      } catch {
        /* biến mất giữa chừng */
      }
      if (opts.remove) {
        try {
          rmSync(abs, { force: true });
          out.removed.push(rel);
        } catch {
          /* không xoá được ⇒ vẫn nằm trong `orphans`, người xem tự quyết */
        }
      }
    }
  };
  if (existsSync(root)) walk(root);
  if (!opts.db) db.close();
  return out;
}

export interface FileListItem {
  id: number;
  sha256: string;
  name: string | null;
  mime: string | null;
  bytes: number;
  kind: string;
  /**
   * Đường TƯƠNG ĐỐI trong kho tệp — CHỈ có khi byte đã nằm trên đĩa.
   *
   * ⚠ KHÔNG trả thẳng `attachment.src_path`: cột đó mang HAI nghĩa — với `blob` đã rút thì
   * là đường file, còn với `ref` thì là URL nguồn (`sediment://…`). Một trường hai nghĩa là
   * cách bề mặt render ảnh 404: giao diện thấy "có đường" nên vẽ thẻ ảnh. Ở đây tách hẳn:
   * `rel` chỉ là đường file, `fetched` nói byte có thật hay không.
   */
  rel: string | null;
  /** Byte có sẵn để hiển thị không (`blob` trong DB, hoặc đã rút ra file, hoặc `text`). */
  fetched: boolean;
  /** Mốc của tin SỚM NHẤT mang tệp này — mốc có nghĩa với người dùng, không phải lúc nạp. */
  at: string | null;
  category: string;
  /** Tin để nhảy về; `null` ⇒ tệp không tới từ hội thoại nào (làn `picked`). */
  messageId: number | null;
  sessionId: string | null;
  source: string | null;
  projectRoot: string | null;
}

export interface FileListResult {
  items: FileListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Danh sách tệp cho bề mặt — MỘT truy vấn dùng chung cho cả màn tổng hợp lẫn panel theo
 * phiên (plan/25 §5: *một nguồn, hai lăng kính*). Không con số nào sống hai chỗ.
 *
 * Đi qua `attachment_link → messages → sessions`, KHÔNG dùng `attachment.session_id`: cột
 * đó chỉ ghi tin ĐẦU TIÊN mang nội dung ấy (dedup theo sha256), lấy nhầm là mất ~22% số tin.
 */
/**
 * Đính kèm của một TẬP tin, cho lớp recall — để agent MỞ ĐƯỢC ẢNH, không phải để tìm bằng ảnh.
 *
 * Vì sao cần: recall xưa nay chỉ trả CHỮ; nó lọc được "tin có ảnh" nhưng không bao giờ nói ảnh
 * nằm đâu, nên khi người dùng hỏi *"xem lại ảnh lý do vì sao"* thì agent tới đúng tin mà không
 * có gì để nhìn. Byte đã nằm sẵn trên đĩa với tên đọc được (`plan/25 §2`), agent lại mở file
 * ảnh được — thứ thiếu chỉ là CON TRỎ.
 *
 * Đúng bậc ② của HP điều 6: máy chỉ đường bằng phép tất định, **agent liên kết** nhìn ảnh bằng
 * token của chính phiên đang chạy. KHÔNG OCR, KHÔNG model trong lõi (`plan/23 §7`).
 *
 * Trả `path=null` kèm `state` nói VÌ SAO thay vì đưa một đường dẫn không tồn tại — cùng luật
 * "chưa xác minh thì đừng khẳng định" của `02_RULES`.
 */
export function attachmentsForMessages(
  ids: number[],
  opts: { db?: MemoryDB; dbPath?: string; root?: string } = {},
): Map<number, RecallAttachment[]> {
  const out = new Map<number, RecallAttachment[]>();
  if (!ids.length) return out;
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  // Một lượt truy vấn cho CẢ danh sách: hỏi từng tin là N+1 trên đường nóng của recall.
  const marks = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT al.message_id AS mid, a.sha256, a.name, a.mime, a.bytes, a.kind, a.src_path AS rel
         FROM attachment_link al JOIN attachment a ON a.id = al.attachment_id
        WHERE al.message_id IN (${marks})`,
    )
    .all(...ids) as Array<{ mid: number; sha256: string; name: string | null; mime: string | null; bytes: number | null; kind: string; rel: string | null }>;
  for (const r of rows) {
    // CÙNG một phép phân hạng với `listFiles` — hai bề mặt nói khác nhau về cùng một tệp là
    // lỗi đã trả giá ở `src_path` mang hai nghĩa (`plan/25` bước ⑤).
    const onDisk = r.kind === "blob" && typeof r.rel === "string" && !/^[a-z][a-z0-9+.-]*:\/\//i.test(r.rel);
    const state: RecallAttachment["state"] =
      r.kind === "text" ? "text" : onDisk ? "on-disk" : r.kind === "ref" ? "not-fetched" : "in-db";
    const list = out.get(r.mid) ?? [];
    list.push({
      sha: r.sha256,
      name: r.name,
      mime: r.mime,
      bytes: r.bytes,
      path: onDisk ? join(root, ...(r.rel as string).split("/")) : null,
      state,
    });
    out.set(r.mid, list);
  }
  // ĐÓNG THỨ MÌNH MỞ (khuôn chung của module): `openMemory` dựng một kết nối MỚI mỗi lượt, nên
  // quên đóng là rò một handle mỗi lần recall — trên Windows nó giữ khoá file và lượt dọn thư mục
  // tạm của cổng test ném EPERM. Bắt được đúng bằng cách đó (cổng `mcp` đỏ ngay lượt đầu).
  if (!opts.db) db.close();
  return out;
}

export function listFiles(
  opts: {
    db?: MemoryDB;
    dbPath?: string;
    session?: string;
    project?: string;
    category?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {},
): FileListResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  try {
    const where: string[] = [];
    const args: unknown[] = [];
    if (opts.session) {
      where.push("s.id = ?");
      args.push(opts.session);
    }
    if (opts.project) {
      where.push("s.project_root = ?");
      args.push(opts.project);
    }
    if (opts.query) {
      where.push("LOWER(COALESCE(a.name, '')) LIKE ?");
      args.push(`%${opts.query.toLowerCase()}%`);
    }
    const cond = where.length ? `WHERE ${where.join(" AND ")}` : "";
    // Một tệp có thể nối vào nhiều tin (dedup) ⇒ gom về MỘT hàng, lấy tin sớm nhất.
    const base = `
      FROM attachment a
      LEFT JOIN attachment_link al ON al.attachment_id = a.id
      LEFT JOIN messages m ON m.id = al.message_id
      LEFT JOIN sessions s ON s.id = m.session_id
      ${cond}
      GROUP BY a.id`;
    const rows = db
      .prepare(
        `SELECT a.id, a.sha256, a.name, a.mime, a.bytes, a.kind, a.src_path AS rel,
                MIN(m.timestamp) AS at, MIN(m.id) AS messageId,
                MIN(s.id) AS sessionId, MIN(s.source) AS source, MIN(s.project_root) AS projectRoot
         ${base}`,
      )
      .all(...args) as FileListItem[];
    const enriched = rows.map((r) => {
      const onDisk = r.kind === "blob" && typeof r.rel === "string" && !/^[a-z][a-z0-9+.-]*:\/\//i.test(r.rel);
      return {
        ...r,
        rel: onDisk ? r.rel : null,
        fetched: r.kind === "text" || onDisk || (r.kind === "blob" && !r.rel),
        category: categoryOf(r.mime),
      };
    });
    const filtered = opts.category && opts.category !== "all"
      ? enriched.filter((r) => r.category === opts.category)
      : enriched;
    // Mới trước — đúng nếp một album ảnh; tệp không có mốc xếp cuối chứ không bị bỏ.
    filtered.sort((x, y) => String(y.at ?? "").localeCompare(String(x.at ?? "")));
    const pageSize = Math.min(500, Math.max(1, opts.pageSize ?? 60));
    const page = Math.max(1, opts.page ?? 1);
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  } finally {
    if (!opts.db) db.close();
  }
}

/** Đuôi → `mime`, đảo của `EXT_BY_MIME` cộng vài đuôi mã nguồn hay gặp trong làn `created`. */
const MIME_BY_EXT: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
  sql: "application/sql",
  py: "text/x-python",
  ts: "text/x-typescript",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ps1: "text/x-powershell",
  sh: "text/x-shellscript",
  html: "text/html",
  css: "text/css",
  yml: "text/yaml",
  yaml: "text/yaml",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
};

/**
 * Vùng KHÔNG nhận vào kho tệp. Đây là ranh giới giữa *tài sản* và *nhật ký hoạt động của
 * đĩa*: agent ghi rất nhiều file dò/tạm/sinh-lại-được, và hút hết vào kho thì kho mất nghĩa.
 * Đo 2026-09-15 trên kho thật: 6.050 đường rút ra được, **4.044 rơi vào đây**.
 */
const NOT_AN_ASSET = new RegExp(
  String.raw`[\\/](data|dist|node_modules|\.venv|\.git|scratchpad|AppData|Temp|attic|coverage)[\\/]`,
  "i",
);

/** Đường file trong một lời gọi tool `Write` — tham số `file_path` của chính lệnh đó. */
const WRITE_PATH = new RegExp(String.raw`"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"`);

/**
 * Đường này có phải vùng nháp không (⇒ KHÔNG vào kho tệp).
 *
 * Tách thành hàm RIÊNG để cổng soi được thẳng: bẫy đã dính khi viết là regex mất một tầng
 * `\` thành `[/]`, tức trên Windows bộ lọc trượt sạch và 4.048 tệp nháp tràn vào kho — im
 * lặng, không cổng nào kêu nếu chỉ kiểm qua fixture.
 */
export function isScratchPath(p: string): boolean {
  return NOT_AN_ASSET.test(p);
}

export interface CollectResult {
  /** Lời gọi `Write` đã soi. */
  calls: number;
  /** Đường file rút ra được (đã khử trùng). */
  paths: number;
  /** Bị loại vì nằm vùng nháp. */
  excluded: number;
  /** Không còn trên đĩa (đã xoá/đổi tên). */
  gone: number;
  /** Đã nhận vào kho lần này. */
  added: number;
  /** Đã có sẵn trong kho (dedup theo sha256). */
  already: number;
  bytes: number;
  dryRun: boolean;
}

/**
 * Làn `created` (plan/25 §1b): nhận TỆP DO AGENT TẠO vào kho tệp.
 *
 * Nội dung lấy từ **file trên đĩa**, không phải từ chữ trong transcript: thứ người dùng coi
 * là tài sản là file HIỆN CÓ, còn nội dung lúc ghi chỉ là một phiên bản giữa chừng (một file
 * thường bị `Write` rồi `Edit` nhiều lượt). Vì vậy điều kiện nhận là **file còn tồn tại**.
 *
 * Không thêm cơ chế thu mới: đường file nằm sẵn trong tham số của chính lời gọi `Write`, nên
 * đây là phép dựng lại TẤT ĐỊNH, 0 token (điều 6①).
 */
export function collectCreated(
  opts: {
    db?: MemoryDB;
    dbPath?: string;
    root?: string;
    limit?: number;
    dryRun?: boolean;
    /** Phép lọc vùng nháp. Tiêm được vì thư mục tạm của HỆ nằm ngay trong vùng bị loại
     *  (`AppData/Temp`), nên fixture không thể dùng luật thật mà vẫn dựng được ca dương. */
    isScratch?: (p: string) => boolean;
  } = {},
): CollectResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  const out: CollectResult = {
    calls: 0, paths: 0, excluded: 0, gone: 0, added: 0, already: 0, bytes: 0, dryRun: Boolean(opts.dryRun),
  };
  const rows = db
    .prepare("SELECT id, session_id, content, timestamp FROM messages WHERE tool_name = 'Write' ORDER BY id")
    .all() as Array<{ id: number; session_id: string; content: string | null; timestamp: string | null }>;
  out.calls = rows.length;

  // Một file bị ghi nhiều lượt ⇒ giữ lời gọi CUỐI (tin mới nhất) làm chỗ nối.
  const latest = new Map<string, { mid: number; at: string | null }>();
  for (const r of rows) {
    const m = WRITE_PATH.exec(r.content ?? "");
    if (!m) continue;
    let p: string;
    try {
      p = JSON.parse('"' + m[1] + '"');
    } catch {
      continue; // chuỗi không giải mã được ⇒ bỏ, KHÔNG đoán
    }
    latest.set(p, { mid: r.id, at: r.timestamp });
  }
  out.paths = latest.size;

  const findSha = db.prepare("SELECT id FROM attachment WHERE sha256 = ?");
  const insAtt = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
     VALUES (?, (SELECT session_id FROM messages WHERE id = ?), ?, ?, ?, ?, 'blob', ?, ?)`,
  );
  const insLink = db.prepare("INSERT OR IGNORE INTO attachment_link (message_id, attachment_id) VALUES (?, ?)");

  let done = 0;
  for (const [p, info] of latest) {
    if (opts.limit && done >= opts.limit) break;
    if ((opts.isScratch ?? isScratchPath)(p)) {
      out.excluded++;
      continue;
    }
    let bytes: Buffer;
    try {
      if (!statSync(p).isFile()) continue;
      bytes = readFileSync(p);
    } catch {
      out.gone++;
      continue;
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    // `basename` của Node thay vì tự cắt bằng regex: bản tự cắt mất một tầng chéo ngược
    // nên trên Windows nó trả về NGUYÊN đường dẫn làm tên tệp (bắt được lúc test).
    const name = basename(p) || "file";
    const ext = (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? "").toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const existing = findSha.get(digest) as { id: number } | undefined;
    if (existing) {
      // Cùng nội dung đã nằm trong kho ⇒ chỉ nối thêm liên kết, KHÔNG chép file lần nữa.
      if (!opts.dryRun) insLink.run(info.mid, existing.id);
      out.already++;
      done++;
      continue;
    }
    const rel = relPathFor({ sha256: digest, mime, name, createdAt: info.at });
    if (!opts.dryRun) {
      const abs = absOf(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      const tmp = `${abs}.part-${process.pid}`;
      writeFileSync(tmp, bytes);
      renameSync(tmp, abs);
      if (sha256Of(abs) !== digest) {
        rmSync(abs, { force: true });
        continue; // đọc lại không khớp ⇒ KHÔNG ghi hàng DB trỏ vào thứ chưa chứng minh được
      }
      const id = Number(insAtt.run(info.mid, info.mid, name, mime, bytes.length, digest, rel, info.at).lastInsertRowid);
      insLink.run(info.mid, id);
    }
    out.added++;
    out.bytes += bytes.length;
    done++;
  }
  if (!opts.db) db.close();
  return out;
}

/**
 * NHÃN của làn `picked` trên cột `session_id`.
 *
 * Vì sao là một nhãn chứ không phải `NULL`: schema khai `message_id` và `session_id` là
 * **NOT NULL** (`db.ts` v19), và đổi hai ràng buộc đó trong SQLite phải dựng lại cả bảng —
 * một migration cho một tính năng không cần tới nó. `message_id = 0` KHÔNG trỏ vào tin nào
 * (khoá tự tăng bắt đầu từ 1), nên không có chuyện tệp của người dùng bám nhầm tin của ai.
 *
 * Nhãn này **load-bearing**, không phải trang trí: phép dọn mồ côi định nghĩa *"không có
 * trong `attachment_link`"* là mồ côi, mà làn `picked` theo thiết kế KHÔNG có liên kết nào —
 * thiếu nhãn thì một cú `dropUnlinked` xoá sạch tệp người dùng tự thêm. Xem
 * `pruneOrphanAttachments`, và bài học 2026-07: *một tiêu chí mồ côi nghe hợp lý từng suýt
 * xoá 87 ảnh đang sống*.
 */
export const PICKED_SESSION = "(picked)";

export interface PickedResult {
  /** Tệp đã nhận vào kho lần này. */
  added: number;
  /** Đã có sẵn (dedup theo `sha256`) — không chép lần hai. */
  already: number;
  bytes: number;
  /** Không nhận được, kèm lý do — nói ra chứ không nuốt. */
  failed: Array<{ path: string; reason: string }>;
  /** Đường tương đối trong kho tệp của những cái vừa nhận. */
  rels: string[];
}

export interface PickedInput {
  /** Tên hiển thị; thiếu thì lấy `basename` của đường dẫn. */
  name?: string;
  /** Đường dẫn trên đĩa — đọc byte từ đây. Bỏ trống nếu đã có `bytes`. */
  path?: string;
  /** Byte sẵn có (đường kéo-thả của trình duyệt gửi thẳng nội dung lên). */
  bytes?: Buffer;
}

/**
 * LÀN `picked` (plan/25 §1b) — tệp NGƯỜI DÙNG tự chọn đưa vào kho.
 *
 * Khác hai làn kia ở đúng một điểm và điểm đó quyết định cả hình dạng dữ liệu: tệp này **không
 * đến từ hội thoại nào**, nên hàng của nó có `message_id` NULL và KHÔNG có `attachment_link`.
 * Bề mặt đọc (`listFiles`) vốn đã `LEFT JOIN` nên hiện được ngay; `plan/25 §5` chốt là nút *nhảy
 * về tin gốc* phải ẨN cho hạng này — trưng một nút không đi tới đâu là bề mặt nói dối.
 *
 * **Một cú bấm = một lời cho phép** (cùng doctrine `/paths-fix-apply`): hàm này KHÔNG quét thư
 * mục, không tự tìm tệp, không có chế độ hàng loạt ngầm. Nó nhận đúng danh sách người đưa.
 *
 * Thứ tự ghi giữ nguyên như `extractBlobs`/`collectCreated`: ghi tệp → đọc lại kiểm `sha256` →
 * mới chèn hàng. Hỏng giữa chừng thì thừa một tệp (`files gc` dọn), không phải thiếu byte.
 */
export function addPickedFiles(
  items: PickedInput[],
  opts: { db?: MemoryDB; dbPath?: string; root?: string; maxBytes?: number } = {},
): PickedResult {
  const db = opts.db ?? openMemory(opts.dbPath);
  const root = opts.root ?? filesRoot();
  const out: PickedResult = { added: 0, already: 0, bytes: 0, failed: [], rels: [] };
  const findSha = db.prepare("SELECT id FROM attachment WHERE sha256 = ?");
  const insAtt = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
     VALUES (0, '${PICKED_SESSION}', ?, ?, ?, ?, 'blob', ?, ?)`,
  );

  for (const it of items) {
    const label = it.path ?? it.name ?? "(không tên)";
    try {
      let bytes: Buffer;
      if (it.bytes) {
        bytes = it.bytes;
      } else if (it.path) {
        if (!statSync(it.path).isFile()) {
          out.failed.push({ path: label, reason: "không phải tệp" });
          continue;
        }
        bytes = readFileSync(it.path);
      } else {
        out.failed.push({ path: label, reason: "thiếu cả đường dẫn lẫn nội dung" });
        continue;
      }
      if (!bytes.length) {
        out.failed.push({ path: label, reason: "tệp rỗng" });
        continue;
      }
      if (opts.maxBytes && bytes.length > opts.maxBytes) {
        out.failed.push({ path: label, reason: `${(bytes.length / 1048576).toFixed(1)} MB — vượt trần` });
        continue;
      }
      const digest = createHash("sha256").update(bytes).digest("hex");
      const existing = findSha.get(digest) as { id: number } | undefined;
      if (existing) {
        // Cùng nội dung đã nằm trong kho ⇒ KHÔNG chép lần hai và KHÔNG đẻ hàng thứ hai.
        // Không có tin nào để nối liên kết (đây là làn `picked`), nên chỉ đếm rồi thôi.
        out.already++;
        continue;
      }
      const name = it.name ?? (it.path ? basename(it.path) : null) ?? "file";
      const ext = (/\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1] ?? "").toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
      const at = new Date().toISOString();
      const rel = relPathFor({ sha256: digest, mime, name, createdAt: at });
      const abs = absOf(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      const tmp = `${abs}.part-${process.pid}`;
      writeFileSync(tmp, bytes);
      renameSync(tmp, abs);
      if (sha256Of(abs) !== digest) {
        rmSync(abs, { force: true });
        out.failed.push({ path: label, reason: "đọc lại từ đĩa không khớp sha" });
        continue;
      }
      insAtt.run(name, mime, bytes.length, digest, rel, at);
      out.added++;
      out.bytes += bytes.length;
      out.rels.push(rel);
    } catch (error) {
      out.failed.push({ path: label, reason: error instanceof Error ? error.message.slice(0, 160) : "lỗi không rõ" });
    }
  }
  if (!opts.db) db.close();
  return out;
}
