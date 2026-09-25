/**
 * MIRROR THƯ MỤC — lớp FILE của kênh máy-tới-máy (plan/24 §9).
 *
 * Kênh vốn chỉ chở **KHỐI** của kho bộ nhớ. Mục này chở thứ còn lại: bốn thư mục mà
 * `§9.1` chốt, và chúng là những thứ **KHÔNG đi qua git** (`.gitignore` neo `/docs/` ·
 * `/docs_visual/` · `/attic/` · `/global-memory/`) nên trước nay không có đường nào
 * sang máy khác. Đó là nguyên văn chỗ user chỉ 2026-09-23: *"bên kia xem được nhưng
 * không nhận được mirror thư mục từ bên đây"*.
 *
 * ── HAI HẠNG, HAI BÀI TOÁN (§9.0 · §9.1) ──────────────────────────────────────────────
 *
 * | | `files/` | `docs/` · `docs_visual/` · `attic/` |
 * |---|---|---|
 * | định danh | **TÊN LÀ sha256** ⇒ trùng tên = trùng nội dung | đường dẫn; nội dung đổi được |
 * | hai máy cùng đụng | **không thể** | **có thật** |
 * | cách hội tụ | chở thẳng, chỉ THÊM | luật `§9.4`, có hàng đợi duyệt |
 *
 * Vì thế `files/` **không băm lại** — `plan/25 §2` chốt tệp trong đó BẤT BIẾN và tên
 * mang sẵn chữ ký, nên băm lại 832 MB mỗi lượt là trả tiền cho một câu hỏi đã có đáp
 * án. Ba thư mục kia chỉ ~2 MB tổng (đo bên dưới) nên băm trọn là rẻ.
 *
 * ── 🔴 KHÔNG BAO GIỜ CHỞ FILE DATABASE — luật cứng, không phải bộ lọc tiện tay ─────────
 *
 * HP điều 11 cấm đặt kho sống trong vùng đồng bộ, và repo này đã hỏng kho **hai lần**
 * (03/08 · 04/08) đúng vì vế đó. `§9.7` điều 8 đòi cổng phải ĐỎ nếu `global_memory.db`
 * lọt vào danh sách chở — luật ở đây là **cùng một bất biến, mở rộng cho mọi file
 * database**, không phải một luật mới:
 *
 * · một file `.db` đang mở WAL thì bản chép được là bản RÁCH — nội dung nằm một nửa
 *   trong `-wal`, và chở cả cặp cũng không cứu được vì hai file chụp ở hai thời điểm;
 * · nó lớn và nó **không hợp nhất được** — hai máy cùng sửa thì không có "đoạn" nào để
 *   trộn, chỉ có chọn cả file, tức mất trọn việc của một bên.
 *
 * **Đo 2026-09-23, và đây là lý do luật này phải có ngay từ lượt đầu:** `attic/` cân
 * **1.181 MB**, trong đó **1.237 MB là MỘT file** — `attic/zemory-lab/lab.db`, bản sao
 * kho của lượt thí nghiệm `plan/19` đã chốt KHÔNG tráo. Không có luật này thì lượt
 * mirror đầu tiên chở 1,2 GB một kho chết qua dây. Trừ nó ra: `attic` còn **~2 MB**.
 *
 * ── TRẦN MỘT FILE ────────────────────────────────────────────────────────────────────
 *
 * Khối đi trong MỘT khung (`wire.ts`), nên file cũng vậy. Trần đặt ở 64 MB chứ không
 * phải `MAX_FRAME_BYTES` (512 MB): một khung 512 MB là 512 MB Buffer nằm trong RAM ở
 * CẢ HAI đầu cùng lúc. File lớn nhất trong phạm vi thật là 6,5 MB (ảnh), nên 64 MB đã
 * là rất rộng.
 *
 * Và cùng doctrine `blocks.ts`: **thứ mình không chở nổi thì KHÔNG KHAI**. Khai rồi
 * không gửi là nói với máy kia *"tôi có"* cho một thứ nó sẽ không bao giờ nhận được,
 * mà nó đọc lời khai đó rồi thôi không hỏi nữa ⇒ hai máy lệch vĩnh viễn trong im lặng.
 * Bỏ qua thì phải NÓI RA.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { currentStoreRoot } from "../db.js";
import { filesRoot } from "../filestore.js";
import { selfRepoRoot } from "../../projects.js";

/** Bốn mục của `§9.1`. `files` tách hạng riêng vì nó địa chỉ theo NỘI DUNG. */
export type MirrorArea = "docs" | "docs_visual" | "attic" | "files";

export const MIRROR_AREAS: readonly MirrorArea[] = ["docs", "docs_visual", "attic", "files"] as const;

/** Mục địa chỉ-theo-nội-dung: trùng tên là trùng nội dung ⇒ không xung đột, không hàng đợi. */
export function isContentAddressed(area: MirrorArea): boolean {
  return area === "files";
}

/** Trần một file. Xem khối chú thích đầu file: đây là trần RAM, không phải trần giao thức. */
export const MAX_MIRROR_FILE_BYTES = 64 * 1024 * 1024;

/**
 * Ngưỡng giữ NỘI DUNG bản `base` để hợp nhất theo đoạn (`§9.3`).
 * Trên ngưỡng, hoặc nhị phân ⇒ rơi về chọn-cả-file (`§9.5`).
 */
export const MAX_TEXT_MERGE_BYTES = 1024 * 1024;

export interface MirrorRoot {
  area: MirrorArea;
  /** Đường tuyệt đối TRÊN MÁY NÀY. Máy kia có đường của nó — đường không bao giờ đi qua dây. */
  path: string;
}

export interface MirrorEntry {
  area: MirrorArea;
  /** Đường tương đối trong mục, luôn dùng `/` — đây là thứ DUY NHẤT đi trên dây. */
  rel: string;
  size: number;
  mtimeMs: number;
  /** sha256 hex. Vắng ở mục địa chỉ-theo-nội-dung (tên đã là chữ ký). */
  hash?: string;
}

export interface ScanResult {
  entries: MirrorEntry[];
  /** File bị bỏ qua kèm lý do — để bề mặt nói ra thay vì lệch trong im lặng. */
  skipped: Array<{ rel: string; reason: string; size: number }>;
}

/**
 * Tên file KHÔNG BAO GIỜ được chở. Kiểm theo ĐUÔI, hạ chữ thường.
 *
 * `-wal`/`-shm` nằm trong danh sách dù chúng vô nghĩa nếu thiếu `.db`: bỏ sót chúng là
 * để lại đúng hai file làm người đọc tưởng kho đã đi qua.
 */
const DB_SUFFIXES = [".db", ".db-wal", ".db-shm", ".sqlite", ".sqlite3", ".sqlite-wal", ".sqlite-shm"];

/** Thư mục không bao giờ đi vào: máy móc của git/npm, và thư mục nháp theo `02_RULES §FILE TẠM`. */
const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "__pycache__", "scratchpad", "dist"]);

function isDatabaseFile(name: string): boolean {
  const low = name.toLowerCase();
  return DB_SUFFIXES.some((s) => low.endsWith(s));
}

/** File nháp theo chính luật của repo — thứ *phải* chết, chở đi là chở rác. */
function isScratchFile(name: string): boolean {
  return name.startsWith("_scratch_") || name.startsWith(".tmp_") || name.endsWith(".md.bak");
}

/**
 * CỜ ĐỒNG Ý của guard (`docs/hooks/.allow-*`) — không bao giờ rời máy đã sinh ra nó.
 *
 * 🔴 Bắt tại trận 2026-09-24: `docs/hooks/.allow-push` nằm trong hàng đợi duyệt của máy này, chở
 * sang từ máy kia. Tệp đó KHÔNG phải tài liệu — nó là **mã uỷ quyền một-lần** cho đúng một việc
 * người dùng vừa cho phép trên MỘT máy (`guard.cjs §consumeFlag`). Bay sang máy thứ hai thì guard
 * bên đó mở cửa cho một lệnh mà chủ máy chưa hề đồng ý, và tệ hơn: nó vượt cửa **im lặng**, đúng
 * kiểu hỏng mà cả lớp guard sinh ra để chặn.
 *
 * Cùng hạng với `data/` trong `§9.8` (khoá chia sẻ · bí mật · phiên đăng nhập): **thẩm quyền là
 * thuộc tính của MÁY, không phải của repo**. Chặn theo HẠNG (`.allow-*` dưới `hooks/`) chứ không
 * theo một cái tên, vì thêm một cờ mới — `.allow-delete`, `.allow-docs-write` — là lỗ mở lại.
 */
function isConsentFlag(rel: string, name: string): boolean {
  return name.startsWith(".allow-") && rel.split("/").includes("hooks");
}

/**
 * Lý do một đường dẫn bị loại, hoặc `null` nếu nó được chở.
 *
 * Tách thành hàm THUẦN để cổng soi thẳng được — cổng đầu-cuối không chứng minh nổi
 * *"vì sao"* một file không có mặt (bài học `plan/24 §6f`: đo đầu-cuối không canh nổi luật pha).
 */
export function excludeReason(rel: string, name: string, size: number): string | null {
  if (rel.split("/").some((seg) => SKIP_DIRS.has(seg))) return "thư mục kỹ thuật";
  if (isDatabaseFile(name)) return "file database — không bao giờ đi dạng file (HP điều 11)";
  if (isConsentFlag(rel, name)) return "cờ đồng ý của guard — thẩm quyền thuộc về MÁY (HP điều 14)";
  if (isScratchFile(name)) return "file nháp";
  if (size > MAX_MIRROR_FILE_BYTES) return `vượt trần ${Math.round(MAX_MIRROR_FILE_BYTES / 1024 / 1024)} MB`;
  return null;
}

/**
 * Bốn gốc trên MÁY NÀY. Gốc không tồn tại thì vắng mặt — fail-open (điều 9): một máy
 * chưa có `docs_visual/` vẫn đồng bộ được ba mục còn lại.
 *
 * `docs`/`docs_visual`/`attic` treo ở repo của CHÍNH zemory (`selfRepoRoot`), không
 * phải ở kho: chúng là hồ sơ của bản cài, nằm trong cây repo. `files` treo ở gốc KHO
 * (`filesRoot`) vì nó đi cùng kho (plan/25 §1).
 */
export function mirrorRoots(opts: { repoRoot?: string; storeRoot?: string } = {}): MirrorRoot[] {
  return MIRROR_AREAS.map((area) => mirrorRootFor(area, opts)).filter((r): r is MirrorRoot => Boolean(r) && existsSync((r as MirrorRoot).path));
}

/**
 * Chỗ một mục SẼ nằm trên máy này — **tồn tại hay chưa cũng trả về**.
 *
 * 🔴 Đây là nửa còn lại của `mirrorRoots()`, và thiếu nó là một lỗi ĐÃ TRẢ GIÁ THẬT
 * (đo trên hai máy 2026-09-24). Chiều NHẬN từng gọi chính `mirrorRoots()`, tức nó chỉ nhận
 * được mục mà máy này **đã có thư mục**. Nhưng thư mục đó chỉ sinh ra khi có file đầu tiên
 * được ghi vào — mà phép ghi lại bị chặn vì thư mục chưa có. Vòng luẩn quẩn khép kín:
 * **một máy mới không bao giờ nhận được gì**, và không lỗi nào nổ ở đầu gửi.
 *
 * Triệu chứng đo được: đầu gửi log `đã gửi "xong" (5560 file)` **lặp lại nguyên con số đó**
 * qua tám lượt liên tiếp — giữ được dù một file thì lượt sau phải tụt. Đúng ca "máy mới nhận
 * bàn giao" mà HP điều 16 đặt làm mục đích của cả hệ.
 *
 * Hai hàm, hai câu hỏi, đừng gộp lại: *"quét cái gì"* chỉ hỏi thứ CÓ THẬT · *"ghi vào đâu"*
 * phải trả lời được cả khi chưa có gì. `writeFileAtomic` tự tạo thư mục cha, nên chỗ ghi
 * đầu tiên là chỗ thư mục ra đời.
 */
export function mirrorRootFor(area: MirrorArea, opts: { repoRoot?: string; storeRoot?: string } = {}): MirrorRoot | null {
  if (area === "files") return { area, path: filesRoot(opts.storeRoot ?? currentStoreRoot()) };
  const repo = opts.repoRoot ?? selfRepoRoot();
  // Không biết repo nằm đâu thì TỪ CHỐI — đoán một chỗ để ghi vào là tệ hơn không ghi.
  return repo ? { area, path: join(repo, area) } : null;
}

/** Quét một gốc. Mục địa chỉ-theo-nội-dung KHÔNG băm (xem khối chú thích đầu file). */
/**
 * ĐỆM của lượt quét — quét chạy ĐỒNG BỘ trên event loop, mỗi lượt kênh gọi hai lần.
 *
 * 🔴 Đo 2026-09-25: 5.559 tệp ⇒ 0,6–0,9 s mỗi lần, gần hết là `statSync` trên 5.446 tệp của `files/`.
 * · Mục ĐỊA CHỈ THEO NỘI DUNG (`files/`): tệp một khi ghi thì không đổi (tên = băm). Thư mục mà
 *   `mtime` không đổi thì danh sách tệp TRỰC TIẾP của nó không đổi ⇒ dùng lại, khỏi stat từng tệp.
 *   Thư mục con vẫn được soi riêng (mtime của nó độc lập).
 * · Mục CÓ BĂM (`docs`…): nội dung đổi được mà mtime thư mục không đổi ⇒ vẫn stat từng tệp, nhưng
 *   băm chỉ tính lại khi (kích thước, mtime) đổi.
 */
const dirCache = new Map<string, { mtimeMs: number; entries: MirrorEntry[]; skipped: ScanResult["skipped"]; subdirs: string[] }>();
const hashCache = new Map<string, { size: number; mtimeMs: number; hash: string }>();

export function scanArea(root: MirrorRoot): ScanResult {
  const entries: MirrorEntry[] = [];
  const skipped: ScanResult["skipped"] = [];
  const wantHash = !isContentAddressed(root.area);

  const walk = (dir: string): void => {
    // Thư mục bất biến-theo-mtime (chỉ mục địa chỉ theo nội dung): dùng lại khi mtime không đổi.
    let dirMtime = -1;
    if (!wantHash) {
      try {
        dirMtime = statSync(dir).mtimeMs;
      } catch {
        return;
      }
      const c = dirCache.get(dir);
      if (c && c.mtimeMs === dirMtime) {
        entries.push(...c.entries);
        skipped.push(...c.skipped);
        for (const s of c.subdirs) walk(s);
        return;
      }
    }
    const here = { entries: [] as MirrorEntry[], skipped: [] as ScanResult["skipped"], subdirs: [] as string[] };
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return; // thư mục đọc không được ⇒ bỏ qua, không làm chết cả lượt (điều 9)
    }
    for (const name of names) {
      const abs = join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      const rel = relative(root.path, abs).split(sep).join("/");
      if (st.isDirectory()) {
        if (SKIP_DIRS.has(name)) continue;
        here.subdirs.push(abs);
        walk(abs);
        continue;
      }
      if (!st.isFile()) continue;
      const reason = excludeReason(rel, name, st.size);
      if (reason) {
        here.skipped.push({ rel, reason, size: st.size });
        continue;
      }
      const e: MirrorEntry = { area: root.area, rel, size: st.size, mtimeMs: Math.round(st.mtimeMs) };
      if (wantHash) {
        const hc = hashCache.get(abs);
        const h = hc && hc.size === st.size && hc.mtimeMs === st.mtimeMs ? hc.hash : hashFile(abs);
        if (!h) {
          here.skipped.push({ rel, reason: "đọc không được", size: st.size });
          continue;
        }
        hashCache.set(abs, { size: st.size, mtimeMs: st.mtimeMs, hash: h });
        e.hash = h;
      }
      here.entries.push(e);
    }
    entries.push(...here.entries);
    skipped.push(...here.skipped);
    if (!wantHash) dirCache.set(dir, { mtimeMs: dirMtime, ...here });
  };
  walk(root.path);
  entries.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { entries, skipped };
}

/** Quét cả bốn mục. */
export function scanMirror(opts: { repoRoot?: string; storeRoot?: string } = {}): ScanResult {
  const entries: MirrorEntry[] = [];
  const skipped: ScanResult["skipped"] = [];
  for (const root of mirrorRoots(opts)) {
    const r = scanArea(root);
    entries.push(...r.entries);
    for (const s of r.skipped) skipped.push({ ...s, rel: `${root.area}/${s.rel}` });
  }
  return { entries, skipped };
}

export function hashFile(abs: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

export function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Đường tuyệt đối của một mục trên máy này — và là CỬA DUY NHẤT dịch `rel` thành đường.
 *
 * 🔴 Trả `null` cho mọi đường thoát ra ngoài gốc. `rel` tới TỪ MÁY KIA, nên nó là dữ
 * liệu không tin được: `../` hay một đường tuyệt đối trong đó là lệnh ghi ra ngoài vùng
 * mirror — tức một máy đã ghép đôi ghi được vào bất cứ đâu trên đĩa của ta. Kiểm bằng
 * cách dựng đường rồi so tiền tố, KHÔNG bằng cách soi chuỗi tìm `..` (soi chuỗi trượt
 * trên `%2e%2e`, trên `...`, và trên mọi kiểu viết lạ).
 */
export function resolveMirrorPath(root: MirrorRoot, rel: string): string | null {
  if (!rel || rel.startsWith("/") || rel.startsWith("\\") || /^[A-Za-z]:/.test(rel)) return null;
  const abs = join(root.path, rel);
  const base = root.path.endsWith(sep) ? root.path : root.path + sep;
  if (!abs.startsWith(base)) return null;
  if (isDatabaseFile(basename(abs))) return null; // luật cứng áp cả chiều NHẬN
  // Cờ đồng ý cũng áp HAI ĐẦU: chặn bên gửi mới chỉ vá máy đã cập nhật, mà thứ nguy hiểm đến từ
  // máy KIA. Một máy đời cũ vẫn chở `.allow-push` sang, nên bên nhận phải tự từ chối — cùng lý do
  // `resolveMirrorPath` đã tự kiểm `../` thay vì tin tiêu đề của đối phương.
  if (isConsentFlag(rel.replace(/\\/g, "/"), basename(abs))) return null;
  return abs;
}
