// ── CẬP NHẬT MỘT-NÚT PHẢI CHẠY ĐƯỢC TRÊN WINDOWS ──────────────────────────────
//
// Báo từ máy khác 2026-09-18: nút "Cập nhật ngay" và `zemory selfupdate` chết câm trên Windows +
// Node ≥20.12. Phần DÒ bản mới vẫn tốt; phần ÁP chết. Hai lỗi ĐỘC LẬP, nên hai cổng riêng — gộp
// lại thì sửa được một cái là cổng xanh trong khi tính năng vẫn hỏng.
//
// Cả hai lỗi đều đã ĐO trên máy này, không suy từ mã:
//   ① execFileSync("npm.cmd", ["--version"])  -> EINVAL  (Node v24.19.0, win32)
//   ② rmSync("dist/zemory.exe") khi daemon chạy -> EPERM, Permission denied
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { npmInvocation, npmInvocationFor, npmCliScript } from "../../dist/platform/npm.js";

const src = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

// ── LỖI ① — gọi npm không được ném EINVAL ────────────────────────────────────
//
// Gốc: từ Node 20.12 (vá CVE-2024-27980) `execFile`/`spawn` một tệp `.cmd` mà KHÔNG `shell: true`
// bị từ chối thẳng. Luật hợp đồng ở đây: **không bao giờ trả về một `.cmd` mà thiếu shell**.
test("gọi npm: không bao giờ spawn một .cmd mà thiếu shell — đó chính là EINVAL", () => {
  const inv = npmInvocation(["install"]);
  assert.ok(inv.cmd, "phải nói rõ chạy lệnh gì");
  // ĐÂY là mệnh đề cốt lõi. Nó đúng trên MỌI nền, nên cổng không phụ thuộc máy chạy test.
  assert.ok(!(/\.cmd$/i.test(inv.cmd) && inv.shell !== true), `spawn ${inv.cmd} mà shell=${inv.shell} ⇒ EINVAL trên Node ≥20.12`);
  // Tham số người gọi đưa vào phải tới được npm, đừng nuốt mất.
  assert.ok(inv.args.includes("install"), "tham số của người gọi phải được chuyển tiếp");

  // Máy chạy test LUÔN có npm-cli.js, nên nếu chỉ đo `npmInvocation()` thì nhánh dự phòng `.cmd`
  // không bao giờ được đi qua — và một nhánh không đi qua được là một nhánh không ai canh. Đã đo
  // đúng ca đó: đột biến bỏ `shell` khỏi nhánh ấy SỐNG SÓT. Nên ba nhánh đo bằng hàm thuần.
  const NODE = "C:\\node\\node.exe";

  const win = npmInvocationFor("win32", "C:\\node\\npm-cli.js", ["install"], NODE);
  assert.equal(win.via, "node-cli", "có npm-cli.js thì đi đường node, đừng đụng .cmd");
  assert.equal(win.shell, false, "đường node-cli KHÔNG cần shell");
  assert.equal(win.cmd, NODE, "phải chạy bằng đúng node đang chạy");

  // ⚠ NHÁNH QUAN TRỌNG NHẤT: không tìm thấy npm-cli.js thì buộc dùng .cmd — và .cmd mà thiếu
  // shell CHÍNH LÀ EINVAL, đúng lỗi đã làm nút "Cập nhật ngay" chết câm.
  const fallback = npmInvocationFor("win32", null, ["install"], NODE);
  assert.equal(fallback.cmd, "npm.cmd", "không có npm-cli.js thì chỉ còn đường .cmd");
  assert.equal(fallback.shell, true, "dùng .cmd thì BẮT BUỘC kèm shell — thiếu là EINVAL trên Node ≥20.12");

  // ── CA PHẢI CHO QUA (luật 7): cổng không được siết nhầm POSIX, nơi chẳng có .cmd nào.
  const posix = npmInvocationFor("linux", null, ["install"], "/usr/bin/node");
  assert.equal(posix.cmd, "npm", "trên POSIX cứ gọi npm thẳng");
  assert.equal(posix.shell, false, "trên POSIX KHÔNG được bật shell — bật là tự chuốc chuyện nối chuỗi");

  // Và trên chính máy này, đường đang dùng phải khớp với việc có hay không có npm-cli.js.
  assert.equal(inv.via, process.platform !== "win32" ? "posix" : npmCliScript() ? "node-cli" : "shell-cmd", "đường đang chọn không khớp với thực tế máy");
});

test("gọi npm: mọi chỗ đi qua MỘT nguồn, không nơi nào tự gõ npm.cmd nữa", () => {
  // Trước đây câu trả lời "gọi npm thế nào" bị chép ở hai chỗ và cả hai cùng sai y hệt.
  for (const f of ["backend/src/ui.ts", "backend/src/commands/selfupdate.ts"]) {
    const s = src(f);
    const bare = s.match(/["']npm\.cmd["']/g) || [];
    assert.equal(bare.length, 0, `${f} còn gõ thẳng "npm.cmd" — phải đi qua platform/npm.ts`);
    assert.match(s, /npmInvocation/, `${f} phải lấy cách gọi npm từ nguồn chung`);
  }
});

// ── LỖI ② — không được dựng lại dist/ từ bên trong tiến trình đang chạy nó ────
//
// Gốc: daemon chạy dưới `dist/zemory.exe`; Windows khoá ảnh đang nạp ⇒ `npm run build` gọi `clean`
// gọi `rmSync(dist)` và chết EPERM. Không cờ nào lách được — phải để daemon THOÁT trước.
test("selfupdate: daemon bàn giao việc dựng ra ngoài, không tự dựng cái dist nó đang chạy", () => {
  const ui = src("backend/src/ui.ts");
  const i = ui.indexOf('p === "/selfupdate"');
  assert.ok(i > 0, "không tìm thấy endpoint /selfupdate");
  const block = ui.slice(i, ui.indexOf('p === "/prune-projects"', i));
  assert.ok(block.length > 200, "không khoanh được thân endpoint");

  // Không được chạy bước dựng NGAY TRONG daemon dưới bất kỳ hình thức nào.
  assert.doesNotMatch(block, /"run",\s*"build"/, "daemon KHÔNG được tự chạy npm run build — dist/ đang bị chính nó khoá");
  assert.doesNotMatch(block, /["']install["']\s*\]/, "daemon KHÔNG được tự chạy npm install trong lượt này");

  // Phải bàn giao cho người thợ, và người thợ phải biết chờ đúng tiến trình này chết.
  assert.match(block, /selfupdate-run\.mjs/, "phải bàn giao cho tiến trình dựng nằm ngoài");
  assert.match(block, /"--pid",\s*String\(process\.pid\)/, "phải nói cho người thợ biết chờ ai thoát");
  assert.match(block, /shutdown\("selfupdate"\)/, "phải thoát, vì khoá trên dist/ chỉ nhả khi tiến trình chết");
});

test("người thợ dựng nằm NGOÀI dist/ — để trong đó thì chính bước clean xoá mất nó", () => {
  const rel = "backend/scripts/selfupdate-run.mjs";
  assert.ok(existsSync(new URL("../../" + rel, import.meta.url)), `thiếu ${rel}`);
  assert.ok(!rel.startsWith("dist/"), "người thợ mà nằm trong dist/ thì tự xoá mình giữa chừng");
  const h = src(rel);
  // Thứ tự là cả tính năng: chờ thoát TRƯỚC, dựng SAU. Đảo lại là EPERM y như cũ.
  // Neo vào LỜI GỌI `await waitForExit(`, KHÔNG vào tên hàm: tên còn nằm ở định nghĩa, nên đột
  // biến vứt lời gọi đi mà cổng vẫn xanh (đã đo — ca này sống sót ở lượt đầu).
  const iWait = h.indexOf("await waitForExit(");
  const iBuild = h.indexOf('"run", "build"');
  assert.ok(iWait > 0, "người thợ phải THỰC SỰ gọi waitForExit, không chỉ khai nó");
  assert.ok(iBuild > 0, "người thợ phải có bước dựng");
  assert.ok(iWait < iBuild, "phải CHỜ daemon thoát rồi mới dựng — ngược lại là EPERM");
  assert.ok(!/const gone = true/.test(h), "không được bỏ qua phép chờ bằng một hằng");
  assert.match(h, /selfupdate\.log/, "hỏng ở đây thì không còn bề mặt nào báo — bắt buộc để lại nhật ký");
  // Phóng lại phải dùng nhị phân VỪA DỰNG trong dist/, không phải bản chép tạm đang chạy người thợ.
  assert.match(h, /join\(ROOT, "dist", "zemory\.exe"\)/, "phải phóng daemon bằng exe trong dist/, không bằng bản tạm");
  assert.doesNotMatch(h, /spawn\(process\.execPath, \[cli, "ui"\]/, "phóng bằng process.execPath là phóng bản TẠM — daemon sẽ sống sai chỗ");
});

// Bẫy này suýt lọt vào chính lượt sửa: daemon chạy dưới `dist/zemory.exe`, nên nếu nó phóng người
// thợ bằng `process.execPath` thì người thợ nằm TRONG `dist/` và tự khoá đúng thư mục nó sắp xoá —
// lặp lại y hệt EPERM mà cả lượt sửa sinh ra để diệt. Đã đo: execPath của daemon đang chạy đúng là
// `…\dist\zemory.exe`.
test("người thợ phải chạy từ NGOÀI dist/ — nếu không nó tự khoá thư mục nó sắp xoá", () => {
  const ui = src("backend/src/ui.ts");
  const i = ui.indexOf('p === "/selfupdate"');
  const block = ui.slice(i, ui.indexOf('p === "/prune-projects"', i));
  assert.match(block, /copyFileSync\(process\.execPath,/, "phải chép nhị phân ra ngoài dist/ trước khi phóng người thợ");
  assert.match(block, /tmpdir\(\)/, "bản chép phải nằm ở thư mục tạm của hệ điều hành");
  assert.doesNotMatch(block, /spawn\(process\.execPath,\s*\[\s*helper/, "phóng người thợ bằng process.execPath = chạy nó TRONG dist/, lại EPERM");
  assert.match(block, /spawn\(updaterExe,/, "phải phóng bằng đúng bản chép ngoài dist/");
});

test("CLI selfupdate: tiễn daemon trước khi dựng, rồi trả lại daemon", () => {
  const s = src("backend/src/commands/selfupdate.ts");
  // Lại là chỗ GỌI, không phải tên: định nghĩa hàm cũng mang tên đó.
  const iStop = s.indexOf("await stopDaemonForBuild()");
  const iSteps = s.indexOf("const steps:");
  assert.ok(iStop > 0, "CLI phải THỰC SỰ gọi stopDaemonForBuild — nó là kẻ duy nhất giữ khoá dist/");
  assert.ok(iStop < iSteps, "phải tiễn daemon TRƯỚC khi dựng");
  assert.match(s, /spawn\(process\.execPath, \[cli, "ui"\]/, "tiễn đi thì phải phóng lại — không bỏ người dùng không có daemon");
});

test("clean: gặp tệp đang bị khoá thì nói RÕ vì sao, không ném lỗi rm trần", () => {
  const s = src("backend/scripts/clean.mjs");
  // Chú thích của chính tệp này có nhắc EPERM, nên `/EPERM/` trên cả tệp là cổng rỗng — đột biến
  // vô hiệu hoá nhánh thật đã SỐNG SÓT qua nó. Phải neo vào ĐIỀU KIỆN trong mã.
  assert.match(s, /e\.code === "EPERM"/, "phải nhận ra EPERM bằng mã, không phải bằng chú thích");
  assert.match(s, /e\.code === "EBUSY"/, "EBUSY cũng là tệp đang bị giữ");
  assert.match(s, /console\.error\([^)]*daemon/i, "thông báo phải chỉ đúng thủ phạm — lỗi rm trần khiến người ta đi ngờ quyền thư mục");
  assert.match(s, /throw e/, "lỗi KHÁC thì vẫn phải ném lên, đừng nuốt");
});
