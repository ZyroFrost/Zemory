// TÁI HIỆN sự cố hỏng DB 2026-08-03.
//
// Chữ ký phải dựng lại được (từ vật chứng): cây bóng FTS5 chứa con trỏ tới trang VƯỢT
// `page_count` — tức trang được tham chiếu nhưng chưa bao giờ ghi xuống. Bảng nguồn còn lành.
//
// Giả thuyết đang thử: ngày 02/08 là ngày ĐẦU chạy ghi per-message ⇒ FTS5 bị chèn + tự trộn
// liên tục, cộng 8 lần daemon bị `Stop-Process -Force`. Nếu giết cứng một tiến trình đang
// trộn FTS5 mà làm hỏng được, thì đó là nguyên nhân.
//
// LƯU Ý QUAN TRỌNG: theo tài liệu SQLite, giết một TIẾN TRÌNH (khác với sập HĐH / mất điện)
// KHÔNG được phép làm hỏng DB — WAL tự phục hồi lúc mở lại. Nên nếu phép thử này KHÔNG tái
// hiện được, đó cũng là kết quả có giá trị: nó LOẠI giả thuyết kill, và đẩy nghi ngờ về phía
// mất-ghi ở tầng HĐH/đĩa (ngủ vì hết pin, ghi đệm chưa xuống đĩa).
import { fork } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const CHILD = new URL("./repro-child.mjs", import.meta.url).pathname.replace(/^\//, "");
const ROUNDS = Number(process.argv[2] ?? 12);
const MODE = process.argv[3] ?? "normal";

/** Đọc trạng thái sức khoẻ + tìm ĐÚNG chữ ký "trỏ vượt cuối file". */
function inspect(p) {
  const db = new Database(p, { readonly: true });
  try {
    const pages = db.pragma("page_count", { simple: true });
    const rows = db.prepare("PRAGMA quick_check(50)").all().map((r) => r.quick_check);
    const ok = rows.length === 1 && rows[0] === "ok";
    const dangling = rows.filter((r) => /invalid page number (\d+)/.test(r)).map((r) => Number(/invalid page number (\d+)/.exec(r)[1]));
    return { ok, pages, rows, beyondEof: dangling.filter((n) => n > pages).length, sample: rows.slice(0, 3) };
  } catch (e) {
    return { ok: false, pages: -1, rows: [String(e.message)], beyondEof: 0, sample: [e.message] };
  } finally {
    db.close();
  }
}

const dir = mkdtempSync(join(tmpdir(), "zemory-repro-"));
let corrupted = 0;
let signature = 0;
console.log(`tái hiện: ${ROUNDS} lượt · synchronous=${MODE.toUpperCase()}`);

for (let r = 1; r <= ROUNDS; r++) {
  const p = join(dir, `r${r}.db`);
  const child = fork(CHILD, [p, MODE], { stdio: "ignore", silent: true });
  // Chờ cây FTS đủ lớn để có trộn thật, rồi GIẾT CỨNG giữa lúc đang ghi.
  const grow = 1500 + r * 400; // mỗi lượt để nó lớn hơn một chút — bắt nhiều pha trộn khác nhau
  await new Promise((res) => setTimeout(res, grow));
  child.kill("SIGKILL");
  await new Promise((res) => child.on("exit", res));

  let size = 0;
  try {
    size = statSync(p).size;
  } catch {
    /* chưa kịp tạo */
  }
  if (size < 100_000) {
    console.log(`  lượt ${r}: DB quá nhỏ (${size}B) — bỏ, tăng thời gian chạy`);
    continue;
  }
  const s = inspect(p);
  if (!s.ok) {
    corrupted++;
    if (s.beyondEof > 0) signature++;
    console.log(`  lượt ${r}: HỎNG (${(size / 1048576).toFixed(0)}MB, ${s.pages} trang) · trỏ-vượt-cuối=${s.beyondEof}`);
    for (const l of s.sample) console.log(`      ${l}`);
  } else {
    console.log(`  lượt ${r}: lành (${(size / 1048576).toFixed(0)}MB, ${s.pages} trang)`);
  }
  rmSync(p, { force: true });
  rmSync(`${p}-wal`, { force: true });
  rmSync(`${p}-shm`, { force: true });
}
console.log(`\nKẾT QUẢ: ${corrupted}/${ROUNDS} lượt hỏng · ${signature} lượt ĐÚNG chữ ký (trỏ vượt cuối file)`);
rmSync(dir, { recursive: true, force: true });
