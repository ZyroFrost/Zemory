// CỔNG cho đợt 2026-09-09: màn Tính năng báo về ĐÚNG project, và công tắc tự kiểm lại.
//
// Sự cố sinh ra file này (đo trên máy thật, không phải giả thuyết): daemon do Startup phóng nên cwd
// là `C:\WINDOWS\System32`; `/status` trả `project.root = C:\WINDOWS\System32` với `connected:false`,
// nên màn Tính năng hiện "Harness files 0/6" (nhánh KHÔNG-kết-nối của status.ts, KHÔNG phải thiếu
// file) và "Docs harness (validate)" Off. Bấm "Kiểm lại tất cả" bao nhiêu lần cũng vô ích: mỗi lượt
// chạy lại đúng phép kiểm đó trên đúng root sai đó. Một bề mặt NÓI DỐI mà không cổng nào thấy.
//
// Ba lớp được canh ở đây, mỗi lớp một lý do tồn tại RIÊNG:
//  ① `daemonProjectRoot` — quyết định root của daemon (lưới đỡ, áp cho mọi cách khởi động);
//  ② `launcherStale` với tham số cwd — nếu KHÔNG canh, bản vá launcher ship ra mà không tới được
//     máy đã cài, vì phép so cũ chỉ nhìn tên exe nên launcher cũ mãi mãi "còn tươi";
//  ③ `getChecksAuto`/`setChecksAuto` — mặc định + kẹp + tính độc lập của hai tham số.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { daemonProjectRoot } from "../../dist/core/config.js";
import { launcherStale } from "../../dist/platform/autostart.js";

// ── ① root của daemon ────────────────────────────────────────────────────────
const HERE = "C:\\WINDOWS\\System32";
const OWN = "D:\\repo\\Zemory";
const only = (...ok) => (p) => ok.includes(p);

test("daemon root: a cwd that is NOT a project falls back to the build's own repo", () => {
  assert.equal(daemonProjectRoot(HERE, OWN, only(OWN)), OWN);
});

test("daemon root: when the cwd IS a project the cwd WINS - `ui` opened from another repo still reports on that repo", () => {
  // Ca này là thứ ngăn bản vá đi quá tay: một fallback "luôn dùng repo của mình" sẽ làm mọi
  // người dùng khác của zemory nhìn thấy harness của ZEMORY thay vì của họ.
  assert.equal(daemonProjectRoot("D:\\repo\\DuAnA", OWN, only("D:\\repo\\DuAnA", OWN)), "D:\\repo\\DuAnA");
});

test("daemon root: with NEITHER side a project it keeps the cwd and invents no root", () => {
  assert.equal(daemonProjectRoot(HERE, OWN, () => false), HERE);
});

// ── ② launcher đã cài phải được ghi lại khi thiếu thư mục làm việc ───────────
const EXE = "D:\\repo\\Zemory\\dist\\zemory.exe";
const CWD = "D:\\repo\\Zemory";
const LINE = `sh.CurrentDirectory = "${CWD}"`;
const vbs = (body) => `Set sh = CreateObject("WScript.Shell")\r\n${body}`;

test("launcher stale: the right exe but MISSING the working-directory line must be rewritten", () => {
  // Đây chính là ca làm bản vá thành vô nghĩa nếu quên: launcher cũ nêu đúng exe của hôm nay,
  // nên phép so chỉ-nhìn-exe kết luận "còn tươi" và không bao giờ nhận dòng cwd mới.
  const old = vbs(`sh.Run """${EXE}"" ""D:\\repo\\Zemory\\dist\\cli.js"" ui", 0, False\r\n`);
  assert.equal(launcherStale(old, EXE), false, "phép so CŨ không thấy gì sai — đó là vấn đề");
  assert.equal(launcherStale(old, EXE, LINE), true, "phép so MỚI phải thấy");
});

test("launcher stale: it compares the WHOLE LINE, not the bare path", () => {
  // Bản vá đầu của chính đợt này so `content.includes(cwd)` và ca trên ĐỎ: exe nằm TRONG repo
  // (`<repo>\dist\zemory.exe`) nên đường dẫn repo đã có mặt sẵn trong launcher cũ. So đường dẫn
  // trần ⇒ không launcher cũ nào bị coi là cũ ⇒ bản vá ship ra mà không tới được máy nào.
  const old = vbs(`sh.Run """${EXE}"" ""x"" ui", 0, False\r\n`);
  assert.ok(old.includes(CWD), "tiền đề: đường dẫn repo VỐN có trong launcher cũ");
  assert.equal(launcherStale(old, EXE, LINE), true);
});

test("launcher stale: exe and working directory both present means NO rewrite (negative case)", () => {
  // Không có ca âm thì một hàm `return true` cũng qua được ca dương ở trên, và launcher sẽ bị
  // ghi lại ở MỌI lượt daemon khởi động.
  const fresh = vbs(`${LINE}\r\nsh.Run """${EXE}"" ""x"" ui", 0, False\r\n`);
  assert.equal(launcherStale(fresh, EXE, LINE), false);
});

test("launcher stale: with no file there is nothing to refresh", () => {
  assert.equal(launcherStale(null, EXE, LINE), false);
});

// ── ③ công tắc tự kiểm lại ───────────────────────────────────────────────────
async function withSettings(fn) {
  // `settings.ts` đọc theo thư mục kho ⇒ trỏ kho sang thư mục tạm để KHÔNG đụng settings thật.
  const dir = mkdtempSync(join(tmpdir(), "zchecks-"));
  const prev = process.env.GLOBAL_MEMORY_DB;
  process.env.GLOBAL_MEMORY_DB = join(dir, "global_memory.db");
  try {
    const m = await import(`../../dist/config/settings.js?t=${Date.now()}`);
    await fn(m, dir);
  } finally {
    if (prev === undefined) delete process.env.GLOBAL_MEMORY_DB;
    else process.env.GLOBAL_MEMORY_DB = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("self-check: OFF by default, 30-minute cycle", async () => {
  await withSettings(async ({ getChecksAuto }) => {
    assert.deepEqual(getChecksAuto(), { on: false, everyMin: 30 });
  });
});

test("self-check: the cycle is CLAMPED to [5,1440] - 1 minute is pointless knocking, 3 days is no longer periodic", async () => {
  await withSettings(async ({ getChecksAuto, setChecksAuto }) => {
    setChecksAuto({ everyMin: 1 });
    assert.equal(getChecksAuto().everyMin, 5);
    setChecksAuto({ everyMin: 99999 });
    assert.equal(getChecksAuto().everyMin, 1440);
  });
});

test("self-check: toggling must NOT reset the cycle, and changing the cycle must NOT switch it on", async () => {
  // Hai tham số độc lập là điều kiện để cái ⚙ dùng được: người ta chọn chu kỳ trước rồi mới bật,
  // và bật/tắt không được nuốt con số vừa chọn.
  await withSettings(async ({ getChecksAuto, setChecksAuto }) => {
    setChecksAuto({ everyMin: 180 });
    assert.equal(getChecksAuto().on, false, "đổi chu kỳ không được tự bật");
    setChecksAuto({ on: true });
    assert.deepEqual(getChecksAuto(), { on: true, everyMin: 180 }, "bật không được đặt lại chu kỳ");
    setChecksAuto({ on: false });
    assert.equal(getChecksAuto().everyMin, 180, "tắt cũng phải nhớ chu kỳ cho lần bật sau");
  });
});

// ── ④ bề mặt: nút bấm và nhịp tự động phải dùng CHUNG một đường ──────────────
test("FE: exactly ONE place reruns the whole check set (button and timer call the same path)", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  // Chuỗi endpoint kiểm chỉ được xuất hiện MỘT lần: hai bản sao thì sớm muộn cũng lệch nhau
  // (một bên thêm nguồn mới, bên kia quên) và không ai biết bảng nào tươi hơn.
  // Bản cũ đếm chuỗi `'memory','validate','grill'` — mảng gõ tay đó đã bị gỡ 2026-09-17, nên
  // phép đếm luôn ra 0 và cổng đứng đỏ. Ý ĐỊNH của nó giữ nguyên và nay mạnh hơn: danh sách chỉ
  // được có MỘT nguồn, và nguồn đó là `FEATURES`.
  assert.match(src, /var SYS_CHECKS=FEATURES\.filter\(/, "danh sách phép kiểm phải dẫn xuất từ MỘT nguồn (FEATURES)");
  assert.equal((src.match(/var SYS_CHECKS=/g) || []).length, 1, "danh sách phép kiểm bị chép ở nhiều nơi");
  assert.match(src, /function sysRecheckAll\(\)/, "phải có một đường dùng chung");
  assert.match(src, /refreshChecks\(true\)/, "nút/nhịp phải đi qua refreshChecks, không tự gọi /check");
  assert.match(src, /document\.hidden\|\|ckBusy/, "nhịp tự động phải bỏ qua khi cửa sổ khuất / đang chạy");
});

test("FE: 'a new zemory build' and 'an old repo on the standard' are TWO chips - neither hides the other", async () => {
  // Bug thật (user gặp trên máy PC 2026-09-09): một chip xử ba trạng thái bằng `return` sớm —
  // có bản zemory mới thì vẽ xong RỒI THOÁT, nên vế "N repo cũ chuẩn" biến mất đúng lúc cả hai
  // cùng đúng. Hai sự thật khác CẤP (công cụ trên máy ↔ chuẩn của các repo) mà chung một đèn thì
  // người đọc không biết mình đang phải cập nhật cái gì. Backend vốn đã trả hai trường riêng.
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const sys = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  assert.ok(html.includes('id="railApp"') && html.includes('id="railStd"'), "phải có ĐỦ hai chip");
  assert.ok(!html.includes('id="railUpd"'), "chip gộp cũ phải biến mất, không để hai đường song song");
  // Neo CỐT LÕI: giữa hai lượt vẽ KHÔNG được có `return` — đó chính là hình dạng của bug cũ.
  const iApp = sys.indexOf("paint(appChip");
  const iStd = sys.indexOf("paint(stdChip");
  assert.ok(iApp > 0 && iStd > iApp, "cả hai chip phải được vẽ, chip app trước chip chuẩn");
  assert.ok(!/\breturn\b/.test(sys.slice(iApp, iStd)), "có `return` chen giữa hai chip = vế sau bị giấu");
  // HAI HỘP THOẠI RIÊNG (user 2026-09-09: *"cái thông báo repo đã theo chuẩn là khác mà"*). Gộp
  // chung thì nút "Cập nhật ngay" đứng cạnh danh sách repo, và không ai biết nó cập nhật CÁI GÌ.
  assert.match(sys, /function updDialogApp\(\)/, "hộp riêng cho bản zemory");
  assert.match(sys, /function updDialogStd\(\)/, "hộp riêng cho chuẩn repo");
  assert.match(sys, /closest\('#railApp'\)\)\{updDialogApp\(\)/, "chip app mở hộp app");
  assert.match(sys, /closest\('#railStd'\)\)\{updDialogStd\(\)/, "chip chuẩn mở hộp chuẩn");
  // Hộp chuẩn repo KHÔNG được nhắc số hiệu bản zemory — đó là nội dung của hộp kia.
  const std = sys.slice(sys.indexOf("function buildRepoBlock"));
  assert.ok(!/upd\.appHave|upd\.appOk|selfupdate/.test(std.slice(0, std.indexOf("return repos"))),
    "thân hộp chuẩn repo còn lẫn nội dung bản zemory");
});

test("FE: each status chip carries ONE identifying icon, and the icon survives on the collapsed rail", async () => {
  // Rail thu gọn ẩn toàn bộ chữ (`.railcoll .status-chip>div{display:none}`), nên nếu chỉ có chấm
  // thì ba chip là ba chấm giống hệt — đúng thứ user chụp lại. Icon là thứ DUY NHẤT phân biệt được
  // ở chế độ đó, nên nó phải khác nhau từng chip VÀ phải được giữ lại khi thu gọn.
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  const slots = [...html.matchAll(/<span class="cic" data-icon="([a-z]+)"><\/span>/g)].map((m) => m[1]);
  assert.equal(slots.length, 3, "ba chip trạng thái, ba khe icon");
  assert.deepEqual([...slots].sort(), ["app", "health", "std"], `khe icon sai — thấy ${slots.join(" ")}`);
  // ICON PHẢI LÀ SVG, KHÔNG emoji. Bản đầu dùng ⬆ 📘 ✔ và user gọi thẳng là "không chuyên nghiệp":
  // emoji mỗi nền vẽ một kiểu, ở cỡ nhỏ thì nhoè, và 📘 có màu CỐ ĐỊNH nên không tô theo trạng thái
  // được. SVG nét đơn sắc ăn theo `currentColor` ⇒ sắc ở mọi cỡ và tô được.
  const core = readFileSync(new URL("../../frontend/scripts/core.js", import.meta.url), "utf8");
  const zicon = core.slice(core.indexOf("var ZICON="), core.indexOf("function zDialog"));
  for (const k of ["app", "std", "health"]) assert.ok(new RegExp(`${k}:'<svg`).test(zicon), `ZICON.${k} phải là SVG`);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(zicon), "bộ icon không được lẫn emoji");
  assert.match(css, /\.status-chip \.cic svg\{/, "icon phải có kích thước xác định");
  assert.match(css, /\.railcoll \.status-chip \.cic svg\{/, "rail thu gọn phải GIỮ icon (chỗ duy nhất phân biệt được)");
  assert.match(css, /\.railcoll \.status-chip \.dot\{display:none\}/, "thu gọn thì bỏ chấm — chật, viền + icon đã đủ");
  assert.match(css, /\.railcoll \.status-chip\{border-color:var\(--success\)\}/, "thu gọn: viền xanh khi lành");
  assert.match(css, /\.railcoll \.status-chip\.warn\{border-color:var\(--warn\)\}/, "thu gọn: viền cam khi có việc");
});

test("FE: both Search and Sessions have an OPEN FULL button in the panel corner, sharing one path", async () => {
  // User 2026-09-09: panel Phiên không có nút mở full, còn bên Tìm kiếm nút lại nằm TRONG thân
  // panel nên trôi theo nội dung. Nay cả hai là icon ở GÓC thanh tiêu đề, đi qua CÙNG một hàm.
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const core = readFileSync(new URL("../../frontend/scripts/core.js", import.meta.url), "utf8");
  const targets = [...html.matchAll(/data-expand="([a-zA-Z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...targets].sort(), ["rPreview", "sessVBody"], `thiếu/dư nút mở full: ${targets.join(" ")}`);
  // Mỗi nút phải mang icon + nhãn máy đọc được (`02_RULES §Ngôn ngữ ②`: nút icon trơn là THIẾU nhãn).
  for (const m of html.matchAll(/<button[^>]*data-expand="[^"]+"[^>]*>/g)) {
    assert.match(m[0], /data-icon="expand"/, "nút mở full phải có icon khai qua data-icon");
    assert.match(m[0], /data-i18n-aria="panel\.expand"/, "nút icon trơn phải có nhãn cho trình đọc màn hình");
  }
  // KHÔNG dựng viewer thứ hai: hộp lấy CHÍNH innerHTML đã render, không gọi lại API.
  assert.match(core, /function zExpandPanel\(/, "phải có một đường mở-full dùng chung");
  const fn = core.slice(core.indexOf("function zExpandPanel("), core.indexOf("document.addEventListener('click',function(e){\n    var b="));
  assert.ok(!/zGet\(|fetch\(/.test(fn), "mở full KHÔNG được gọi lại API — đó là cách đẻ ra viewer thứ hai");
  assert.match(fn, /size:'lg'/, "nội dung dài phải mở ở nấc L, không kéo méo khung S");
});

test("FE: the self-check toggle lives in the gear menu, NOT in the 'what the daemon does on its own' block", async () => {
  // Đặt sai chỗ có hai cái giá, cả hai đã trả trong cùng một phiên: user mở ⚙ tìm không thấy, và
  // khối kia tự khai "daemon tự làm gì khi BẬT" trong khi nhịp này chạy TRONG CỬA SỔ — nhãn nói
  // một đằng, việc làm một nẻo. Neo theo VỊ TRÍ vì không lỗi nào nổ khi ai đó dời nó về chỗ cũ.
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const iAuto = html.indexOf('data-i18n="mem.autoH"'); // đầu khối "Tự động" của Global Memory
  const iDlg = html.indexOf('id="settingsClose"'); // đầu hộp ⚙
  const iCk = html.indexOf('data-auto="checks"');
  assert.ok(iAuto > 0 && iDlg > 0 && iCk > 0, "thiếu neo: khối Tự động · hộp ⚙ · công tắc");
  assert.ok(iCk > iDlg, "công tắc phải nằm TRONG hộp ⚙ (sau tiêu đề hộp)");
  assert.ok(iAuto < iDlg, "tiền đề: khối Tự động đứng trước hộp ⚙ trong app.html");
  // Ô chọn chu kỳ phải mang ĐÚNG tên chuẩn của select trong app (`03_STRUCTURE`: 1 tên/concern).
  // Bản đầu tôi gõ `class="inp sm"` — class KHÔNG TỒN TẠI trong app.css ⇒ trình duyệt vẽ select mặc
  // định (nền trắng, viền đen) giữa giao diện tối. Không lỗi nào nổ; chỉ nhìn mới thấy.
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  const sel = html.match(/<select id="ckEvery"[^>]*>/)?.[0] ?? "";
  assert.match(sel, /class="rsel"/, "select phải dùng class chuẩn `rsel`, không đẻ tên mới");
  for (const c of (sel.match(/class="([^"]+)"/)?.[1] ?? "").split(/\s+/).filter(Boolean)) {
    assert.ok(new RegExp(`\\.${c}[\\s,{:]`).test(css), `class .${c} không có trong app.css`);
  }
});
