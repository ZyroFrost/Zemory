// `zemory selfupdate` — kéo bản mới của CHÍNH công cụ về rồi dựng lại, bằng MỘT lệnh.
//
// Vì sao có lệnh này (user chốt 2026-08-23): chip vàng + hook đã biết nói *"có bản mới"*
// (tem kênh chung, `share.ts §TEM PHIÊN BẢN`), nhưng người/agent bên repo khác vẫn phải nhớ
// bốn lệnh — mà sổ ghi thẳng: *"Repo CÙNG máy làm được NGAY; máy kia chờ push."* Một lệnh
// copy-paste là đủ để agent bên đó tự áp, không cần đợi ai nhắc.
//
// Vì sao KHÔNG tự chạy (user chốt cùng lượt): tự `git pull` vào một cây có thể đang có phiên
// agent khác làm việc là ghi đè việc của người ta — đụng thẳng `02_RULES §Phạm vi project`.
// Lệnh này chỉ chạy khi CÓ NGƯỜI GÕ.

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appVersion } from "../core/config.js";
import { cmpSemver } from "../util/semver.js";
import { npmInvocation } from "../platform/npm.js";
import { uiPort } from "../ui.js";
import { refreshRemoteVersion } from "../update/remote-version.js";

/** Gốc repo của chính công cụ (dist/commands/… → lên hai bậc). */
function toolRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function run(cmd: string, args: string[], cwd: string, shell = false): { ok: boolean; out: string } {
  try {
    const out = execFileSync(cmd, args, { windowsHide: true, cwd, encoding: "utf8", stdio: "pipe", shell, timeout: 15 * 60_000 });
    return { ok: true, out: String(out).trim() };
  } catch (e) {
    const err = e as { stdout?: unknown; stderr?: unknown; message?: string };
    return { ok: false, out: (String(err.stdout ?? "") + String(err.stderr ?? "")).trim() || (err.message ?? "failed") };
  }
}

/**
 * Pull đỏ thì nói RÕ VÌ SAO — nhất là ca "lịch sử đã bị viết lại".
 *
 * Ca này không phải giả định: 15/09/2026 repo bị `git filter-repo` gỡ hồ sơ riêng khỏi bản
 * public ⇒ MỌI sha đổi, và mọi bản clone cũ không còn tổ tiên chung với origin. `git pull
 * --ff-only` khi đó đỏ với câu "Not possible to fast-forward" — đúng nghĩa đen nhưng vô dụng:
 * người đọc sẽ đi tìm xem mình lỡ commit cái gì, trong khi thứ phải làm là CLONE LẠI. Một lệnh
 * `merge-base` phân biệt được ba ca đó, nên không có lý do bắt người dùng đoán.
 */
/**
 * Daemon đang chạy dưới `dist/zemory.exe` KHOÁ chính tệp đó (Windows khoá ảnh đang nạp), nên
 * `npm run build` → `clean` → `rmSync(dist)` chết bằng EPERM. Đo 2026-09-18: xoá tệp exe 89 MB
 * đang chạy trả về `EPERM, Permission denied`. Bản thân tiến trình CLI không giữ khoá nào —
 * chỉ cần tiễn daemon đi là dựng được, rồi phóng lại bản mới.
 *
 * Trả về pid vừa tiễn (để biết có phải phóng lại không), hoặc null nếu không có daemon nào.
 */
async function stopDaemonForBuild(): Promise<number | null> {
  const port = uiPort();
  let pid = 0;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(600) });
    const b = (await r.json()) as { app?: string; pid?: number };
    if (b?.app !== "zemory" || !b.pid) return null;
    pid = b.pid;
  } catch {
    return null; // không có daemon ⇒ không có khoá ⇒ dựng thẳng
  }
  const alive = (): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };
  console.log(`  · stopping daemon pid ${pid} to release the lock on dist/ …`);
  try { process.kill(pid); } catch { /* vừa tự thoát */ }
  for (let i = 0; i < 100 && alive(); i++) await new Promise((r) => setTimeout(r, 200));
  if (alive()) { console.log(`    ✗ pid ${pid} refuses to exit — stopping, because building now is certain to hit EPERM`); return -1; }
  await new Promise((r) => setTimeout(r, 1200)); // Windows nhả handle trễ một nhịp
  console.log("    ok");
  return pid;
}

function diagnosePull(root: string): string | null {
  const head = run("git", ["rev-parse", "HEAD"], root);
  const remote = run("git", ["rev-parse", "FETCH_HEAD"], root);
  if (!head.ok || !remote.ok) return null;
  const base = run("git", ["merge-base", head.out, remote.out], root);
  if (!base.ok || !base.out) {
    return "HISTORY WAS REWRITTEN on origin — this clone no longer shares an ancestor, no pull can bridge it. CLONE AGAIN, then carry this machine's `data/` over to the new copy.";
  }
  if (base.out === remote.out) return "This machine is AHEAD of origin (has unpushed commits) — nothing to pull.";
  if (base.out !== head.out) return "The branch has DIVERGED (this machine has its own commits origin does not have) — a human must resolve it by hand, this command does not merge for you.";
  return null;
}

export async function cmdSelfUpdate(args: string[] = []): Promise<void> {
  const bad = args.filter((a) => a.startsWith("--") && a !== "--dry-run" && a !== "--check");
  if (bad.length) {
    console.log(`zemory selfupdate: unknown flag ${bad.join(" ")}`);
    console.log("  usage: zemory selfupdate [--check] [--dry-run]");
    process.exitCode = 1;
    return;
  }
  const dryRun = args.includes("--dry-run");
  const root = toolRoot();

  // ── `--check`: CHỈ ĐO, không đụng gì ──────────────────────────────────────
  // Đây là lượt đo THẬT (có mạng) đứng sau mọi bề mặt nhắc: daemon phóng đúng lệnh này ở tiến
  // trình con khi cache hết hạn, và người gõ tay cũng chạy được để biết ngay. Tách khỏi lượt
  // CẬP NHẬT vì hai việc khác cấp: đo là đọc, cập nhật là ghi đè cây mã.
  if (args.includes("--check")) {
    const have = appVersion();
    const c = refreshRemoteVersion(root, undefined, appVersion());
    if (!c.ok) {
      console.log(`zemory selfupdate --check — could not measure the latest version: ${c.error ?? "?"}`);
      process.exitCode = 1;
      return;
    }
    const newer = cmpSemver(c.latest ?? "", have) > 0;
    console.log(`zemory selfupdate --check — running ${have || "?"} · git origin ${c.latest} (${c.commit ?? "?"})`);
    console.log(newer ? "  ⚠ NEW VERSION AVAILABLE — apply with: `zemory selfupdate`" : "  ✓ already the latest version.");
    return;
  }

  const before = appVersion();
  console.log(`zemory selfupdate — ${root} (running ${before || "?"})`);

  if (!existsSync(join(root, ".git"))) {
    console.log("  ✗ this is not a source install (no .git found) — cannot update itself.");
    process.exitCode = 1;
    return;
  }

  // ── CHỐT 1: CÂY PHẢI SẠCH ───────────────────────────────────────────────────
  // Đây là chốt quan trọng nhất của cả lệnh. `git pull` lên một cây có sửa chưa commit
  // là cách mất việc của người khác — và repo công cụ THƯỜNG có phiên agent đang mở.
  // Thà dừng và bảo người ta tự xử còn hơn "cố cho xong".
  const status = run("git", ["status", "--porcelain"], root);
  if (!status.ok) {
    console.log(`  ✗ could not run git status: ${status.out}`);
    process.exitCode = 1;
    return;
  }
  if (status.out) {
    const n = status.out.split(/\r?\n/).filter(Boolean).length;
    console.log(`  ✗ STOP — the working tree still has ${n} uncommitted change(s). Updating would overwrite them.`);
    for (const l of status.out.split(/\r?\n/).filter(Boolean).slice(0, 10)) console.log(`      ${l}`);
    console.log("    → commit or stash first, then run again.");
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log("  (--dry-run) tree is clean ⇒ would run: git pull --ff-only · npm install · npm run build · npm link");
    return;
  }

  // ── CHỐT 2: CHỈ FAST-FORWARD ────────────────────────────────────────────────
  // `--ff-only` để không bao giờ đẻ merge commit tự động trên máy người khác. Nhánh đã
  // rẽ ⇒ dừng, người thật xử — đúng doctrine "bị chặn thì đi HỎI, không tìm đường vòng".
  // Tiễn daemon TRƯỚC bước dựng — nó là kẻ duy nhất giữ khoá trên `dist/zemory.exe`.
  const stoppedPid = await stopDaemonForBuild();
  if (stoppedPid === -1) { process.exitCode = 1; return; }

  // npm KHÔNG gọi thẳng `npm.cmd` nữa: từ Node 20.12 (vá CVE-2024-27980) spawn một `.cmd` mà
  // thiếu `shell: true` bị từ chối bằng EINVAL — đúng thứ đã làm lệnh này chết câm trên Windows.
  // Cách gọi đúng nằm ở MỘT chỗ (`platform/npm.ts`), dùng chung với endpoint `/selfupdate`.
  const npmInv = npmInvocation([]);
  const steps: Array<[string, string, string[], boolean]> = [
    ["git pull --ff-only", "git", ["pull", "--ff-only"], false],
    ["npm install", npmInv.cmd, [...npmInv.args, "install"], npmInv.shell],
    ["npm run build", npmInv.cmd, [...npmInv.args, "run", "build"], npmInv.shell],
    ["npm link", npmInv.cmd, [...npmInv.args, "link"], npmInv.shell],
  ];
  for (const [label, cmd, a, sh] of steps) {
    process.stdout.write(`  · ${label} … `);
    const r = run(cmd, a, root, sh);
    if (!r.ok) {
      console.log("FAILED");
      console.log(r.out.split(/\r?\n/).slice(-12).join("\n"));
      const why = cmd === "git" ? diagnosePull(root) : null;
      if (why) console.log(`    🔴 ${why}`);
      console.log(`    → stopped at step "${label}". The installed copy is NOT left half-updated if the failure is in pull;`);
      console.log("      if the failure is in build, run `npm run build` again once the cause is fixed.");
      process.exitCode = 1;
      return;
    }
    console.log("ok");
  }

  const after = appVersion();
  // Đo lại NGAY: cache còn giữ số của lượt trước thì chip vẫn kêu "có bản mới" sau khi vừa cập
  // nhật xong — người dùng đọc thành "cập nhật không ăn". Rẻ: sha vừa pull đã nằm dưới máy.
  refreshRemoteVersion(root, undefined, appVersion());
  console.log(`  ✓ done: ${before || "?"} → ${after || "?"}`);
  // Trước đây chỗ này chỉ DẶN người ta tự tắt tự mở, nên ai làm theo cũng vẫn ngồi với mã cũ cho
  // tới lúc nhớ ra. Đã tiễn daemon ở trên thì phải trả nó lại — tự dọn cái mình đã dọn đi.
  if (stoppedPid !== null) {
    const cli = join(root, "dist", "cli.js");
    if (existsSync(cli)) {
      // Runtime MANG TÊN APP (`dist/zemory.exe`) nếu có — cùng luật với `selfupdate-run.mjs`. Phóng bằng
      // `process.execPath` (= node.exe khi gõ từ CLI) thì daemon chạy dưới tên node (app-design §B1): đo
      // 2026-10-04, daemon node.exe giữ cổng kênh, lệnh tắt theo tên zemory.exe không chạm tới nó.
      const exe = join(root, "dist", "zemory.exe");
      const launcher = existsSync(exe) ? exe : process.execPath;
      spawn(launcher, [cli, "ui"], { detached: true, stdio: "ignore", cwd: root, windowsHide: true }).unref();
      console.log("  ✓ daemon relaunched on the new code");
    } else {
      console.log(`  ⚠ ${cli} not found — daemon NOT relaunched, run \`zemory ui\` once this is fixed`);
    }
  }
}
