// `zemory sweep` — dọn TIẾN TRÌNH thừa do zemory để lại (user chốt 2026-09-12:
// *"thêm chức năng dọn tiến trình thừa đi"*).
//
// Vì sao có bản CLI khi vòng nền đã chạy mỗi 6 giờ và UI đã có nút: hai đường kia đều cần daemon
// sống. Đúng lúc cần dọn nhất — daemon vừa chết hoặc vừa bị giết cứng, để lại cả cây trình duyệt —
// thì không có daemon nào cả. Lệnh này chạy độc lập, không cần cổng 4444.
//
// Mặc định LÀM THẬT: người dùng gõ lệnh dọn là đã nói rõ ý (khác `paths fix` — cái đó GHI VÀO
// file nguồn nên mới phải dry-run mặc định). `--dry-run` để xem trước khi đóng.

import { join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";
import { UI_SWEEP_MIN_AGE_MS, sweepOrphanBrowsers, sweepOrphanTempProfiles } from "../platform/browsersweep.js";
import { cliHoldsWrite } from "../jobs/writegate.js";

export function cmdSweep(args: string[]): void {
  const dry = args.includes("--dry-run");
  const all = args.includes("--all"); // bỏ ngưỡng tuổi 30 phút — dùng sau khi vừa giết daemon bằng tay
  const json = args.includes("--json");

  // `busy`: lệnh này chạy NGOÀI daemon nên không đọc được biến trong bộ nhớ của nó; thứ xuyên tiến
  // trình duy nhất là khoá FILE (`plan/14 §8` bẫy ①). Đang có ai giữ khoá ghi ⇒ nhường, đừng cắt
  // ngang một lượt quét web (nó cũng mở trình duyệt, và ta không phân biệt được từ ngoài).
  const busy = cliHoldsWrite();
  // NGƯỠNG = ngưỡng của NGƯỜI BẤM, không phải của vòng nền. Đo 2026-09-12 lúc thử: CLI dùng mặc
  // định 30 phút trong khi hàng trên app dùng 5 phút ⇒ app báo "2 tiến trình thừa" còn `zemory
  // sweep` nói "không có gì". Hai bề mặt của CÙNG một chức năng nói hai con số là lỗi tự nó, bất kể
  // mỗi bên đều "đúng theo tham số của mình" — cùng họ với bài học `/connections` vs `scope.ts`.
  const r = sweepOrphanBrowsers({
    profileRoot: join(currentMemoryDir(), "browser"),
    busy,
    dryRun: dry,
    minAgeMs: all ? 0 : UI_SWEEP_MIN_AGE_MS,
  });
  const dirs = dry || r.skipped ? [] : sweepOrphanTempProfiles();

  if (json) {
    console.log(JSON.stringify({ dryRun: dry, killed: r.killed, candidates: r.candidates, dirs, skipped: r.skipped ?? null }, null, 1));
    return;
  }
  console.log("zemory sweep — clean leftover processes");
  if (r.skipped) {
    console.log(`  · skipped: ${r.skipped}`);
    return;
  }
  if (dry) {
    console.log(
      r.candidates.length
        ? `  · would close ${r.candidates.length} process(es): ${r.candidates.join(", ")}`
        : "  · no leftover processes",
    );
    console.log("  (dry-run — nothing closed; drop the flag to do it)");
    return;
  }
  console.log(
    r.killed.length
      ? `  ✓ closed ${r.killed.length} process(es)`
      : "  · no leftover processes",
  );
  if (dirs.length || r.dirs.length) {
    console.log(`  ✓ removed ${dirs.length + r.dirs.length} temp profile dir(s)`);
  }
  // Thư mục vừa bị bỏ lại thường chưa xoá được ngay (cây trình duyệt còn giữ khoá) — nói ra để
  // người dùng khỏi tưởng lệnh làm thiếu.
  if (r.killed.length && !dirs.length && !r.dirs.length) {
    console.log("  · temp dirs will be cleaned next run (file locks not released yet)");
  }
}
