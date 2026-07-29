// Ghi file NGUYÊN TỬ — ghi tạm cùng thư mục rồi rename đè.
//
// Vì sao cần (audit 2026-07-27, học từ `atomic_replace` của Hermes): repo đang ghi
// thẳng bằng `writeFileSync` vào những file mà hỏng là mất thật:
//   · `docs/agent/06_CHANGES.md` — `archive` CẮT NGẮN nó; điều 3 tuyên bố .md LÀ NGUỒN
//   · `~/.zemory/location.json` — con trỏ tới nơi đặt DB; hỏng ⇒ zemory đi tìm DB rỗng
//   · `config.json` — toàn bộ thiết lập người dùng
//   · settings của CHÍNH agent (capture-hook ghi vào file cấu hình Claude Code)
// Cả bốn đều là JSON/markdown: chết giữa lúc ghi để lại file cụt, parse là lỗi.
//
// `writeFileSync` KHÔNG nguyên tử: nó truncate rồi mới ghi. Mất điện / kill -9 / ổ đầy
// đúng khoảnh khắc đó là mất nội dung cũ mà chưa có nội dung mới.
//
// Cách này an toàn hơn NGHIÊM NGẶT: bản gốc không hề bị đụng tới cho đến lúc rename.
// Rename hỏng ⇒ ném lỗi, bản gốc CÒN NGUYÊN — thà báo lỗi to còn hơn hỏng lặng lẽ.

import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, renameSync, unlinkSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** Ngủ đồng bộ thật (không busy-wait) — dùng cho retry rename trên Windows. */
function sleepSync(ms: number): void {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

// Windows: trình quét virus / indexer / editor có thể giữ handle file trong vài ms và
// làm rename ném EPERM/EBUSY. Thử lại vài nhịp ngắn rồi mới chịu thua.
const RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

export interface AtomicWriteOptions {
  /** Giữ một bản `.bak` của nội dung CŨ trước khi đè, ĐẶT VÀO thư mục này. Bật cho thao
   *  tác phá huỷ (vd `archive` cắt ngắn changelog) — rẻ, và là đường lùi duy nhất khi ghi nhầm.
   *
   *  Vì sao là THƯ MỤC chứ không phải cờ bật/tắt: bản đầu ghi `<file>.bak` ngay cạnh đích,
   *  nên `archive` để lại `05_TODO.md.bak` + `06_CHANGES.md.bak` đọng trong `docs/agent/` —
   *  đúng nơi luật bắt agent "ĐỌC HẾT", nên nó trông y như rác lọt và chủ repo đã hiểu nhầm
   *  là rác đúng hai lần. Lưới lùi thì giữ, nhưng phải nằm NGOÀI vùng docs. */
  backupDir?: string;
}

/**
 * Ghi `data` vào `target` một cách nguyên tử.
 *
 * File tạm PHẢI nằm CÙNG THƯ MỤC với đích: rename chỉ nguyên tử trong cùng volume,
 * để ở %TEMP% là dính EXDEV khi đích nằm ổ khác (repo ở D:, temp ở C: — đúng máy này).
 */
export function writeFileAtomic(target: string, data: string, opts: AtomicWriteOptions = {}): void {
  const dir = dirname(target);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${process.pid}.${Date.now().toString(36)}.tmp`);

  // MỘT khối try duy nhất bao cả GHI lẫn RENAME. Bản đầu tôi tách hai khối: lỗi ở giai
  // đoạn ghi (data không phải chuỗi, ổ đầy…) thoát ra ngoài mà không ai dọn file tạm —
  // chính test mô phỏng crash bắt được, để lại 1 file rác.
  try {
    // fsync trước khi rename: không có nó thì rename có thể "xong" trong khi dữ liệu vẫn
    // nằm ở cache của OS ⇒ mất điện là được một file rỗng đã đổi tên xong.
    const fd = openSync(tmp, "w");
    try {
      writeSync(fd, data);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (opts.backupDir && existsSync(target)) {
      mkdirSync(opts.backupDir, { recursive: true });
      copyFileSync(target, join(opts.backupDir, `${basename(target)}.bak`));
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        renameSync(tmp, target);
        return;
      } catch (error) {
        lastError = error;
        const code = (error as NodeJS.ErrnoException).code ?? "";
        if (!RETRY_CODES.has(code)) throw error;
        sleepSync(20 * (attempt + 1));
      }
    }
    throw lastError;
  } catch (error) {
    // Dọn file tạm, KHÔNG đụng bản gốc. Gọi hàm này thất bại = đích còn nguyên vẹn.
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      /* dọn dẹp là best-effort */
    }
    throw error;
  }
}

/** Tiện ích cho JSON — cùng bảo đảm nguyên tử, thêm newline cuối như code hiện tại. */
export function writeJsonAtomic(target: string, value: unknown, opts: AtomicWriteOptions = {}): void {
  writeFileAtomic(target, `${JSON.stringify(value, null, 2)}\n`, opts);
}
