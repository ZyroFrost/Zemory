// Lịch tự sync (2026-08-29): hai kiểu — sau mỗi N phút · theo mốc giờ trong ngày — và mốc chỉ bắn MỘT lần/ngày.
// Đo hàm THUẦN `autosyncDue` (không đồng hồ thật, không daemon) để cổng chạy nhanh và đỏ được.
//
// BỔ SUNG 2026-08-30 — ba lỗ "auto-sync lùi trong im lặng" (đo trên `daemon.log` thật: 11 lượt kể từ
// lúc có log kết cục ⇒ OK 3 · FAIL 1 · **CÂM 7**):
//   ① nhánh NHƯỜNG không in gì   → `syncBlockedBy` phải gọi ĐÚNG TÊN kẻ chặn
//   ② mốc tiêu TRƯỚC khi biết lượt có chạy được không → `syncGate` bị chặn thì KHÔNG được đụng mốc
//   ③ daemon bị cắt giữa lượt ⇒ không kết cục nào được ghi → `interruptedRunNote` nói ra ở lần lên sau
//
// ⚠ PHẢI CÔ LẬP khỏi kho THẬT: `syncGate` đọc/ghi `config.json` cạnh DB và hỏi khoá ghi CLI. Trỏ
// `GLOBAL_MEMORY_DB` sang thư mục tạm TRƯỚC rồi mới `import` động (settings/db đọc env một lần lúc
// nạp module, `import` tĩnh bị kéo lên đầu nên chạy trước khi kịp đặt biến — cùng bẫy `writegate.test`).
// Thư mục tạm KHÔNG có Drive dir ⇒ nhánh chạy thật không bao giờ được chạm tới, cổng không bao giờ
// phóng một lượt sync thật.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-autosync-")), "global_memory.db");
const { autosyncDue, interruptedRunNote, syncBlockedBy, syncGate } = await import("../../dist/jobs/scheduler.js");
const { getAutosyncLastAt, setAutosyncSetting, setAutosyncLastAt, setAutosyncSchedule, setDriveDir } = await import("../../dist/config/settings.js");
const { acquireCliWrite, releaseCliWrite } = await import("../../dist/jobs/writegate.js");

const at = (h, m) => new Date(2026, 7, 29, h, m, 0).getTime();

test("interval: chưa có lượt nào ⇒ tới hạn ngay; sau đó phải đủ N phút", () => {
  const s = { mode: "interval", everyMin: 30, times: [] };
  assert.equal(autosyncDue(s, null, at(9, 0), new Set()), "interval");
  assert.equal(autosyncDue(s, at(9, 0), at(9, 29), new Set()), null, "29 phút — chưa tới");
  assert.equal(autosyncDue(s, at(9, 0), at(9, 30), new Set()), "interval");
});

test("times: chỉ bắn khi HH:MM trùng mốc, và mỗi mốc một lần/ngày", () => {
  const s = { mode: "times", everyMin: 30, times: ["12:00", "18:00"] };
  const fired = new Set();
  assert.equal(autosyncDue(s, null, at(11, 59), fired), null);
  const k = autosyncDue(s, null, at(12, 0), fired);
  assert.equal(k, "2026-08-29 12:00");
  fired.add(k);
  assert.equal(autosyncDue(s, at(12, 0), at(12, 0) + 30_000, fired), null, "cùng phút, đã bắn ⇒ không bắn lại");
  assert.equal(autosyncDue(s, at(12, 0), at(18, 0), fired), "2026-08-29 18:00");
  assert.equal(autosyncDue({ ...s, times: [] }, null, at(12, 0), fired), null, "không có mốc ⇒ không bao giờ tự sync");
});

// ── ① NHƯỜNG PHẢI GỌI TÊN KẺ CHẶN ───────────────────────────────────────────────────────────
test("syncBlockedBy: rảnh ⇒ null; bận ⇒ nêu ĐÚNG kẻ chặn, theo đúng thứ tự ưu tiên", () => {
  const free = { maintainChain: false, syncRunning: false, cliHolder: null };
  assert.equal(syncBlockedBy(free), null, "không ai giữ kho ⇒ không có gì để chờ");

  assert.match(syncBlockedBy({ ...free, maintainChain: true }), /bảo trì/);
  assert.match(syncBlockedBy({ ...free, syncRunning: true }), /sync/);
  assert.match(syncBlockedBy({ ...free, cliHolder: "memory embed" }), /memory embed/, "phải nêu TÊN lệnh, không nói trống");
  assert.match(syncBlockedBy({ ...free, cliHolder: "?" }), /không rõ tên/, "biết có kẻ giữ mà không biết tên ⇒ nói thật, không bịa tên");

  // Thứ tự: chuỗi bảo trì là kẻ chặn hay gặp nhất (embed chạy hàng giờ) nên nó phải được gọi tên
  // trước — báo nhầm sang "một lượt sync đang chạy" chỉ làm người đọc đi soi sai chỗ.
  assert.match(
    syncBlockedBy({ maintainChain: true, syncRunning: true, cliHolder: "memory embed" }),
    /bảo trì/,
    "chặn chồng nhau ⇒ nêu kẻ ưu tiên cao nhất",
  );
});

// ── ①b KẺ GIỮ TOKEN JOB MÀ BA CHIỀU CŨ KHÔNG THẤY (bug đo 2026-08-31) ───────────────────────
// Ca ĐÃ HỎNG THẬT: `web-pull` cũng `claimDaemonJob`, nhưng nó không phải `child` của chuỗi bảo trì,
// không phải sync, không phải CLI ⇒ cổng trả `null` = "rảnh" trong khi token ĐÃ bị giữ. Log thật:
// 08:24:56 "kẻ chặn đã xong, vào lượt" → tiêu mốc, mở sổ, in "starting" → rồi `claimDaemonJob("sync")`
// mới trượt. Hai lượt "starting" mà không lượt nào chạy, sổ kẹt mở ⇒ card báo đỏ "bị cắt giữa lượt"
// cho một lượt CHƯA TỪNG khởi động.
test("syncBlockedBy: job daemon khác giữ kho (web-pull) ⇒ PHẢI nhận ra, không được báo rảnh", () => {
  const free = { maintainChain: false, syncRunning: false, cliHolder: null };
  assert.equal(syncBlockedBy({ ...free, jobHolder: null }), null, "token rảnh ⇒ vẫn phải là null");
  const note = syncBlockedBy({ ...free, jobHolder: "web-pull" });
  assert.ok(note, "web-pull giữ token ⇒ KHÔNG được trả null (đây chính là bug)");
  assert.match(note, /web-pull/, "phải nêu ĐÚNG TÊN kẻ giữ, để người đọc soi đúng chỗ");

  // `sync` tự giữ token đã được chiều `syncRunning` gọi tên cụ thể hơn; nhãn thô không được lấn.
  assert.equal(syncBlockedBy({ ...free, jobHolder: "sync" }), null, "nhãn 'sync' không tự sinh kẻ chặn ma");
  assert.match(syncBlockedBy({ ...free, syncRunning: true, jobHolder: "sync" }), /một lượt sync đang chạy/);

  // Xét CUỐI: ba chiều cũ nói câu cụ thể hơn cho cùng một kẻ giữ.
  assert.match(syncBlockedBy({ ...free, maintainChain: true, jobHolder: "maintain" }), /bảo trì/);
  assert.match(syncBlockedBy({ ...free, cliHolder: "memory embed", jobHolder: "web-pull" }), /memory embed/);

  // Thiếu hẳn khoá (người gọi cũ chưa truyền) KHÔNG được nổ — cổng này chắn đường đồng bộ (điều 9).
  assert.equal(syncBlockedBy(free), null, "vắng jobHolder ⇒ fail-open như trước");
});

// ── ② BỊ CHẶN THÌ KHÔNG ĐƯỢC TIÊU SUẤT ──────────────────────────────────────────────────────
// Ca ĐÃ HỎNG THẬT: `syncGate` cũ ghi mốc rồi mới gọi `syncTick`, nên một lượt bị chặn cũng ăn mất
// suất 30′. Cái cứu là hẹn-lại-3-phút, mà nó là biến TRONG TIẾN TRÌNH ⇒ restart là mất hẹn, trong
// khi mốc thì đã bền hoá. Bằng chứng thực địa: `autosyncLastAt` nhích tới 06:00:50Z mà `daemon.log`
// không có dòng `starting` nào ở mốc đó.
test("syncGate: TỚI HẠN mà đang bị chặn ⇒ mốc GIỮ NGUYÊN (không mất lượt)", () => {
  setAutosyncSetting(true);
  setAutosyncSchedule({ mode: "interval", everyMin: 30, times: [] });
  const before = at(9, 0); // đủ cũ để chắc chắn tới hạn
  setAutosyncLastAt(before);

  // Phải CÓ Drive dir, nếu không lượt rơi vào nhánh "off" (tiêu mốc) và ca này đo nhầm thứ khác.
  // An toàn vì khoá CLI dưới đây chặn TRƯỚC khi tới chỗ phóng job — không lượt sync thật nào chạy.
  acquireCliWrite(); // giả lập một lệnh CLI đang giữ kho ⇒ syncTick phải NHƯỜNG
  try {
    setDriveDir(join(tmpdir(), "zemory-autosync-drive-khong-ton-tai"));
    syncGate();
    assert.equal(getAutosyncLastAt(), before, "bị chặn mà mốc vẫn nhích = lượt bị nuốt");
  } finally {
    releaseCliWrite();
    setDriveDir(""); // trả kho tạm về trạng thái "chưa nối" cho ca sau
  }
});

// Ca ÂM của chính bất biến trên — bắt buộc, vì "không bao giờ tiêu mốc" là một cách vá SAI khác:
// nó làm cổng 60 s quay vòng vô hạn khi không có gì để làm.
test("syncGate: TỚI HẠN mà KHÔNG có gì để làm (chưa nối Drive) ⇒ mốc PHẢI tiêu", () => {
  setAutosyncSetting(true);
  setAutosyncSchedule({ mode: "interval", everyMin: 30, times: [] });
  const before = at(9, 0);
  setAutosyncLastAt(before);

  // Kho tạm không có Drive dir ⇒ `syncTick` trả "off", không phóng gì.
  syncGate();
  assert.notEqual(getAutosyncLastAt(), before, "sự thật BỀN mà không tiêu mốc ⇒ hỏi lại mỗi 60 s vô ích");
});

// ── ③ LƯỢT CHẾT KHÔNG KỊP BÁO ───────────────────────────────────────────────────────────────
test("interruptedRunNote: không có sổ ⇒ im; có sổ ⇒ nói rõ lượt nào, cách đây bao lâu", () => {
  assert.equal(interruptedRunNote(null, at(10, 0)), null, "không có lượt treo ⇒ KHÔNG được báo oan");

  const note = interruptedRunNote(at(9, 30), at(10, 0));
  assert.ok(note, "có sổ treo ⇒ phải nói ra");
  assert.match(note, /30′/, "phải nêu lượt đó cách đây bao lâu");
  assert.match(note, new RegExp(new Date(at(9, 30)).toISOString()), "phải nêu ĐÚNG lượt nào, để đối chiếu với log");

  // Đồng hồ máy nhảy lùi (chỉnh giờ / lệch NTP) không được đẻ ra số phút ÂM đọc như rác.
  // ⚠ Neo phải KÍN: `/0′/` (bản đầu) khớp luôn cả `-60′` nên đột biến bỏ kẹp vẫn xanh — assert
  // lỏng là ca trang trí, bắt được đúng bằng lượt đột biến.
  const backwards = interruptedRunNote(at(10, 0), at(9, 0));
  assert.match(backwards, /\(0′ trước\)/, "now < runAt ⇒ kẹp về 0");
  assert.doesNotMatch(backwards, /-\d+′/, "không bao giờ in số phút ÂM");
});
