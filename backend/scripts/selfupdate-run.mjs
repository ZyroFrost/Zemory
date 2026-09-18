// Người thợ dựng lại bản cài — CHẠY NGOÀI daemon, và đó là toàn bộ lý do nó tồn tại.
//
// Vì sao không dựng ngay trong daemon (cách cũ, hỏng từ bản 2.15.0): daemon chạy dưới
// `dist/zemory.exe`, mà Windows KHOÁ ảnh đang nạp ⇒ `npm run build` gọi `clean` gọi
// `rmSync(dist)` và chết ngay bằng **EPERM**. Đo 2026-09-18: xoá đúng tệp exe 89 MB đang chạy
// trả về `EPERM, Permission denied … dist\zemory.exe`. Không có cờ nào lách được: tiến trình
// không thể dựng lại chính cái thư mục nó đang chạy từ đó.
//
// Nên trình tự bắt buộc là: **daemon thoát TRƯỚC → mới dựng → rồi phóng daemon mới**. Tệp này
// nằm ở `backend/scripts/` (mã NGUỒN, git chở) chứ không phải `dist/` — nếu nó nằm trong `dist/`
// thì bước `clean` sẽ xoá mất chính nó giữa chừng.
//
// Nó CỐ TÌNH ngu: cách gọi npm do bên gọi tính sẵn rồi truyền xuống (`--npm-*`). Một bản sao
// logic đó ở đây sẽ là NGUỒN TRÙNG thứ ba, mà chính nguồn trùng là thứ đã làm hai chỗ cùng hỏng.
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const opt = (name, dflt = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
};
const ROOT = opt("--root");
const PID = Number(opt("--pid", "0")) || 0;
const KILL = opt("--kill", "0") === "1";
const RELAUNCH = opt("--relaunch", "0") === "1";
const NPM_CMD = opt("--npm-cmd");
const NPM_PREFIX = JSON.parse(opt("--npm-prefix", "[]"));
const NPM_SHELL = opt("--npm-shell", "0") === "1";
if (!ROOT || !NPM_CMD) { console.error("selfupdate-run: thieu --root hoac --npm-cmd"); process.exit(2); }

const LOG_DIR = join(ROOT, "data", "logs");
const LOG = join(LOG_DIR, "selfupdate.log");
function say(line) {
  const stamp = `${new Date().toISOString()} ${line}`;
  console.log(stamp);
  // Nhật ký là thứ DUY NHẤT còn lại khi việc này hỏng: daemon đã thoát, cửa sổ app đã mất kết
  // nối, nên không còn bề mặt nào báo lỗi. Hỏng ở tầng nào cũng phải để lại vết.
  try { mkdirSync(LOG_DIR, { recursive: true }); appendFileSync(LOG, stamp + "\n"); } catch { /* không có nhật ký thì vẫn phải chạy tiếp */ }
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

async function waitForExit(pid, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!alive(pid)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return !alive(pid);
}

function step(label, cmd, args, shell = false) {
  say(`· ${label} …`);
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: "pipe", shell, timeout: 15 * 60_000 });
    const tail = String(out).trim().split(/\r?\n/).slice(-3).join(" | ");
    say(`  ✓ ${label}${tail ? " — " + tail.slice(0, 200) : ""}`);
    return true;
  } catch (e) {
    const both = (String(e.stdout ?? "") + String(e.stderr ?? "")).trim() || e.message || "failed";
    say(`  ✗ ${label} HONG: ${both.split(/\r?\n/).slice(-6).join(" | ").slice(0, 500)}`);
    return false;
  }
}

const npm = (args) => step(`npm ${args.join(" ")}`, NPM_CMD, [...NPM_PREFIX, ...args], NPM_SHELL);

(async () => {
  say(`=== selfupdate bat dau · root=${ROOT} · pid cho=${PID || "(khong)"} · kill=${KILL} · relaunch=${RELAUNCH}`);

  if (PID) {
    if (KILL && alive(PID)) { say(`· yeu cau daemon pid ${PID} thoat`); try { process.kill(PID); } catch { /* thoat truoc roi */ } }
    say(`· cho daemon pid ${PID} thoat han (khoa tren dist/ chi nha khi tien trinh chet)`);
    const gone = await waitForExit(PID, 60_000);
    if (!gone) { say(`  ✗ pid ${PID} VAN SONG sau 60s — dung lai, KHONG dung de tranh EPERM nua chung`); process.exit(3); }
    // Windows nhả handle trễ hơn lúc tiến trình biến mất một nhịp ngắn.
    await new Promise((r) => setTimeout(r, 1200));
    say("  ✓ daemon da thoat");
  }

  if (!step("git pull --ff-only", "git", ["pull", "--ff-only"])) process.exit(4);
  if (!npm(["install"])) process.exit(5);
  if (!npm(["run", "build"])) process.exit(6);

  if (RELAUNCH) {
    const cli = join(ROOT, "dist", "cli.js");
    if (!existsSync(cli)) { say(`  ✗ dung xong ma khong thay ${cli} — KHONG phong lai`); process.exit(7); }
    // Phóng bằng nhị phân VỪA DỰNG trong dist/, KHÔNG bằng `process.execPath`: tiến trình này
    // đang chạy từ một BẢN CHÉP TẠM ngoài dist (phải thế, nếu không nó tự khoá thư mục nó sắp
    // xoá). Phóng bằng bản chép tạm thì daemon mới sống trong thư mục tạm — sai chỗ, và lượt
    // cập nhật sau lại không xoá nổi bản tạm đó. Đây đúng là dòng mà `zemory.vbs` chạy.
    const exe = join(ROOT, "dist", "zemory.exe");
    const launcher = existsSync(exe) ? exe : process.execPath;
    say(`· phong daemon moi bang ${launcher}`);
    spawn(launcher, [cli, "ui"], { detached: true, stdio: "ignore", cwd: ROOT, windowsHide: true }).unref();
  }
  say("=== selfupdate XONG");
  cleanupSelf();
  process.exit(0);
})().catch((e) => { say(`=== selfupdate NO: ${e && e.stack ? e.stack : e}`); cleanupSelf(); process.exit(1); });

/**
 * Dọn bản chép tạm đã phóng ra tiến trình này. Không xoá được chính mình lúc đang chạy (Windows
 * khoá ảnh đang nạp — đúng cái luật đã sinh ra cả tệp này), nên nhờ một tiến trình rời xoá hộ
 * sau một nhịp. Hỏng cũng không sao: đây là thư mục tạm của hệ điều hành.
 */
function cleanupSelf() {
  const self = process.execPath;
  if (!/zemory-updater-\d+\.exe$/i.test(self)) return;   // chạy bằng node thường ⇒ không có gì để dọn
  try {
    spawn(process.platform === "win32" ? "cmd.exe" : "sh",
      process.platform === "win32" ? ["/c", "ping", "127.0.0.1", "-n", "4", ">nul", "&", "del", "/f", "/q", self] : ["-c", `sleep 3; rm -f '${self}'`],
      { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch { /* để lại một tệp tạm còn hơn làm hỏng lượt cập nhật */ }
}
