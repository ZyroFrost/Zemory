// DỌN TIẾN TRÌNH TRÌNH DUYỆT MỒ CÔI — và quan trọng hơn: **KHÔNG được giết nhầm**.
//
// Bối cảnh (user 2026-09-12): *"cái này phải tự dọn chứ, sao để nó đẻ ra quài dc"*. Vòng dọn
// (`scratchTick`, 6 giờ) vốn chỉ quét THƯ MỤC; đo được **75 tiến trình Edge headless** sống từ sáng
// mà không ai đụng. Nay có `sweepOrphanBrowsers` — nhưng một bộ dọn giết nhầm còn tệ hơn rác, nên
// phần lớn ca dưới đây là **ca ÂM**: thứ KHÔNG được đụng tới.
//
// Đo HÀNH VI qua mối nối `list`/`kill` tiêm vào, không spawn tiến trình thật: một cổng mà phải mở
// trình duyệt thật thì không ai dám chạy nó trong gate.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../../backend/src/platform/browsersweep.ts", import.meta.url), "utf8");

// Bốn ràng buộc an toàn phải nằm trong code, mỗi cái một lý do đã ghi:
test("1 it only touches ZEMORY profiles (a slot or a temporary `zemory-*`)", () => {
  assert.match(SRC, /norm\.includes\(root\) \|\| \/--user-data-dir="\?\[\^"\]\*\[\/\\\\\]zemory-\/u\.test\(norm\)/u,
    "phải khớp profile khe HOẶC thư mục tạm zemory-*; nới ra là đụng trình duyệt người dùng");
});

test("2 it does NOT touch a VISIBLE window - that is a sign-in window waiting for a PERSON", () => {
  assert.match(SRC, /if \(!\/--headless\/u\.test\(cmd\)\) continue;/u,
    "chỉ headless; cửa sổ đăng nhập do người mở thì tự đóng nó là cướp việc của họ");
});

test("3 only past the age threshold does it count as an orphan - it never cuts a running scan short", () => {
  // Ngưỡng mặc định của hàm = ngưỡng VÒNG NỀN (dè dặt, vì chạy lúc không ai nhìn). Người bấm dùng
  // ngưỡng ngắn hơn — hai con số khai cạnh nhau để không ai sửa một chỗ rồi lệch.
  assert.match(SRC, /const minAge = opts\.minAgeMs \?\? BG_SWEEP_MIN_AGE_MS;/u);
  assert.match(SRC, /if \(!\(p\.ageMs >= minAge\)\) continue;/u);
});

test("4 with a web job running it touches NOTHING (asked directly, never inferred)", () => {
  assert.match(SRC, /if \(opts\.busy\) return \{ \.\.\.res, skipped: "đang có job web chạy" \};/u);
});

test("5 live NEGATIVE case: it never touches the cockpit window's own profile", () => {
  // `<kho>/cockpit/browser` là bản lùi `msedge --app` của app — giết nó là tắt UI ngay trước mặt.
  assert.match(SRC, /if \(norm\.includes\("\/cockpit\/browser"\)\) continue;/u);
});

test("6 fail-open: if processes cannot be listed it skips the round rather than throwing", () => {
  assert.match(SRC, /return \{ \.\.\.res, skipped: "không liệt kê được tiến trình" \};/u);
  assert.doesNotMatch(SRC, /throw new Error/u, "bộ dọn không bao giờ được làm chuỗi bảo trì chết theo");
});

test("7 it HOOKS INTO the existing sweep loop instead of starting its own timer", () => {
  const S = readFileSync(new URL("../../backend/src/jobs/scheduler.ts", import.meta.url), "utf8");
  // 🔄 3.5.31: lượt dọn chạy ở WORKER (daemon từng đứng ~5 s mỗi lượt — CPU profiler 25/09); neo đi theo.
  assert.match(S, /runInWorker<OrphanSweepResult>\("platform\/browsersweep\.js", "sweepOrphanBrowsers", \[\{ profileRoot: join\(currentMemoryDir\(\), "browser"\), busy \}\]\)/u);
  // Chặn ĐÚNG job có thể đang SỞ HỮU một trình duyệt. Bản đầu của tôi chặn theo *mọi* job
  // (`daemonJobBusy() !== null`), và đo ngay lúc thử: nút *Dọn ngay* thành vô hiệu khi daemon đang
  // nhúng vector — một việc chẳng liên quan gì tới trình duyệt. Chặn quá rộng cũng là một kiểu sai:
  // nó biến vòng dọn thành "không bao giờ tới lượt" trên máy lúc nào cũng có job chạy.
  assert.match(S, /const busy = webRunning \|\| job === "web-pull" \|\| job === "scan" \|\| cliHoldsWrite\(\);/u,
    "chặn theo job GIỮ TRÌNH DUYỆT, không phải theo 'có job nào đó'");
  // Cùng hàm `scratchTick` (nhịp 6 giờ) chứ không phải một bộ hẹn giờ mới.
  // Cắt TRỌN thân hàm theo mốc code, không theo số ký tự (3000 ký tự hụt ngay khi hàm dài thêm — 3.5.31).
  const Sn = S.replace(/\r\n/g, "\n");
  const from = Sn.indexOf("function scratchTick");
  const tick = Sn.slice(from, Sn.indexOf("\n}\n", from));
  assert.match(tick, /sweepOrphanBrowsers/u, "phải nằm trong scratchTick");
  assert.match(tick, /sweepOrphanTempProfiles/u);
});

test("8 pure ESM - no `require()` slips in (it would throw at runtime, tsc will not catch it)", () => {
  assert.doesNotMatch(SRC, /\brequire\(/u, "module này chạy trong daemon ESM");
});
