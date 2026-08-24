// Cổng "bundle ĐÃ RỜI KHỎI MÁY chưa" — đọc SỔ HÀNG ĐỢI của Google DriveFS, chỉ-đọc.
//
// Vì sao module này tồn tại: sự cố 2026-08-11 — client Drive kẹt hàng đợi, hai gói 317 MB
// và bản bàn giao 1,63 GB nằm im **3 ngày** trong thư mục Drive, trong khi `memory sync`
// lượt nào cũng báo "đã xuất" thành công. "Đã ghi file vào thư mục Drive" và "file đã LÊN
// MÂY" là hai sự thật khác nhau, và khoảng giữa chúng hỏng im lặng — không cổng nào đỏ
// (plan/18 mặt ⑨: canh "bundle đã rời khỏi máy chưa"). Máy kia không nhận được gì suốt
// thời gian đó. Chữ trong log của client ("Syncing is paused") đã lừa được một lần; thứ
// đáng tin là HÀNG ĐỢI + ĐỊNH DANH, và cả hai nằm trong sổ SQLite của client.
//
// Cách đo — schema ĐO THẬT 2026-08-24 trên `metadata_sqlite_db` (không đoán):
//   items(stable_id, id, local_title, file_size, is_tombstone, trashed, is_folder, …)
//   stable_parents(item_stable_id, parent_stable_id)
// Mục CHƯA lên mây mang định danh CỤC BỘ `local-<n>` ở cột `id`; lên xong thì client thay
// bằng cloud id. Thế hệ cũ của cùng một tên file nằm lại với `trashed=1` (đo: 5/6 hàng
// `global_memory.enc` là hàng cũ đã trash) ⇒ lọc `trashed=0 AND is_tombstone=0`; còn trùng
// thì lấy `stable_id` LỚN NHẤT — id tăng đơn điệu, hàng mới nhất là hàng đang sống.
//
// BA RÀNG BUỘC user đặt (05_TODO 2026-08-24):
// ① CHỈ ĐỌC sổ của client — mở readonly, tuyệt đối không sửa/xoá trạng thái của nó.
// ② Fail-open (điều 9): không thấy sổ / đọc lỗi ⇒ nói "chưa kiểm được", KHÔNG đoán và
//    KHÔNG đỏ oan — đường dẫn/định dạng sổ của client có thể đổi bất cứ lúc nào.
// ③ Đối chiếu với file CÒN TRÊN ĐĨA. Sổ giữ cả hàng `local-` của file ĐÃ XOÁ (đo: 17 hàng
//    `.zemory-write-probe`, toàn bộ đã rời đĩa từ lâu) — chỉ đọc sổ mà không soi đĩa là
//    báo oan ngay ca đầu tiên, và cảnh báo kêu nhầm thì lần sau không ai đọc (cloudguard
//    đã trả giá đúng bài này 2026-08-06).

import Database from "better-sqlite3";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

export interface UplinkFile {
  file: string;
  /** Tuổi tính từ mtime trên ĐĨA — thời gian file đã ngồi chờ. */
  ageMs: number;
  sizeBytes: number;
}

export interface UplinkReport {
  dir: string;
  /** Có mở được ít nhất một sổ DriveFS không — false ⇒ mọi kết luận khác đều "chưa kiểm được". */
  journalFound: boolean;
  /** Số file trên đĩa mà sổ xác nhận ĐÃ mang cloud id (đã rời máy). */
  departed: number;
  /** Định danh còn `local-` nhưng trẻ hơn ngưỡng — nhiều khả năng đang lên, chưa đáng báo. */
  pending: UplinkFile[];
  /** Định danh còn `local-` và GIÀ hơn ngưỡng — đúng hình dạng sự cố 3-ngày. Đây là ca đỏ. */
  stuck: UplinkFile[];
  /** Phép đo không chạy được ở đâu thì nói ở đó — không nuốt thành "sạch" (điều 9). */
  inconclusive: string[];
}

/**
 * Ngưỡng "ngồi quá lâu": mặc định 60 phút. Lớn hơn một nhịp autosync (30′) và đủ cho một
 * gói vài GB đi hết trên đường truyền văn phòng — sự cố thật là 3 NGÀY, không phải 3 phút,
 * nên ngưỡng rộng không làm mù cổng mà chặn được báo oan lúc đang tải thật.
 */
export function uplinkStaleMs(): number {
  const raw = Number(process.env.ZEMORY_UPLINK_STALE_MIN);
  return (Number.isFinite(raw) && raw > 0 ? raw : 60) * 60_000;
}

function defaultDriveFsBase(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local");
  return join(localAppData, "Google", "DriveFS");
}

/** Mọi sổ tài khoản tìm được (mỗi account một thư mục toàn chữ số chứa `metadata_sqlite_db`). */
export function driveFsJournals(base = defaultDriveFsBase()): string[] {
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
      .map((d) => join(base, d.name, "metadata_sqlite_db"))
      .filter((p) => existsSync(p));
  } catch {
    return [];
  }
}

interface JournalRow {
  id: string | null;
  file_size: number | null;
}

/**
 * Tra MỘT file trong MỘT sổ: hàng sống mới nhất của đúng tên file, nằm trong thư mục có
 * đúng tên `folderTitle`. Trả `undefined` khi sổ không biết file này (khác với "biết và
 * còn local-"), và ném lỗi cho caller gom vào `inconclusive` khi sổ không đọc được.
 */
function lookupInJournal(db: Database.Database, folderTitle: string, fileName: string): JournalRow | undefined {
  const row = db
    .prepare(
      `SELECT i.id, i.file_size
       FROM items i
       JOIN stable_parents p ON p.item_stable_id = i.stable_id
       JOIN items f ON f.stable_id = p.parent_stable_id
       WHERE f.is_folder = 1 AND f.local_title = ? AND f.trashed = 0 AND f.is_tombstone = 0
         AND i.local_title = ? AND i.trashed = 0 AND i.is_tombstone = 0
       ORDER BY i.stable_id DESC
       LIMIT 1`,
    )
    .get(folderTitle, fileName) as JournalRow | undefined;
  return row;
}

/** Định danh cục bộ = chưa từng rời máy. */
export function isLocalOnlyId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("local-");
}

export function uplinkReport(
  driveDir: string,
  opts: { driveFsBase?: string; staleMs?: number; now?: number } = {},
): UplinkReport {
  const report: UplinkReport = {
    dir: driveDir,
    journalFound: false,
    departed: 0,
    pending: [],
    stuck: [],
    inconclusive: [],
  };
  const now = opts.now ?? Date.now();
  const staleMs = opts.staleMs ?? uplinkStaleMs();

  let diskFiles: { name: string; ageMs: number; sizeBytes: number }[];
  try {
    diskFiles = readdirSync(driveDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => {
        const st = statSync(join(driveDir, d.name));
        return { name: d.name, ageMs: Math.max(0, now - st.mtimeMs), sizeBytes: st.size };
      });
  } catch {
    report.inconclusive.push(`không đọc được thư mục Drive: ${driveDir}`);
    return report;
  }
  if (diskFiles.length === 0) return report;

  const journals = driveFsJournals(opts.driveFsBase);
  if (journals.length === 0) {
    report.inconclusive.push("không thấy sổ DriveFS nào (client chưa cài, hoặc đường sổ đã đổi)");
    return report;
  }

  const folderTitle = basename(driveDir);
  // Mở từng sổ MỘT LẦN cho cả loạt file, không mở lại theo từng file.
  const opened: { path: string; db: Database.Database }[] = [];
  for (const j of journals) {
    try {
      opened.push({ path: j, db: new Database(j, { readonly: true, fileMustExist: true }) });
    } catch (error) {
      report.inconclusive.push(`sổ không mở được: ${j} (${error instanceof Error ? error.message : "lỗi đọc"})`);
    }
  }
  if (opened.length === 0) return report;
  report.journalFound = true;

  try {
    for (const f of diskFiles) {
      let row: JournalRow | undefined;
      for (const o of opened) {
        try {
          row = lookupInJournal(o.db, folderTitle, f.name);
        } catch (error) {
          report.inconclusive.push(`tra ${f.name} lỗi ở ${o.path}: ${error instanceof Error ? error.message : "query failed"}`);
          continue;
        }
        if (row) break;
      }
      if (!row) {
        // File có trên đĩa mà sổ chưa có hàng: hoặc vừa ghi xong (sổ trễ vài giây), hoặc
        // thư mục này không thuộc phạm vi client. Cả hai đều KHÔNG phải bằng chứng kẹt.
        report.inconclusive.push(`sổ chưa có hàng cho ${f.name}`);
        continue;
      }
      if (!isLocalOnlyId(row.id)) {
        report.departed++;
        continue;
      }
      const entry: UplinkFile = { file: f.name, ageMs: f.ageMs, sizeBytes: f.sizeBytes };
      if (f.ageMs > staleMs) report.stuck.push(entry);
      else report.pending.push(entry);
    }
  } finally {
    for (const o of opened) {
      try {
        o.db.close();
      } catch {
        /* đóng lỗi thì thôi — sổ là của client, không phải của mình */
      }
    }
  }
  // Cũ nhất lên đầu — dòng báo chỉ đủ chỗ nêu một cái tên, phải là cái tệ nhất.
  report.stuck.sort((a, b) => b.ageMs - a.ageMs);
  return report;
}
