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

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appVersion } from "../core/config.js";

/** Gốc repo của chính công cụ (dist/commands/… → lên hai bậc). */
function toolRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function run(cmd: string, args: string[], cwd: string): { ok: boolean; out: string } {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe", timeout: 15 * 60_000 });
    return { ok: true, out: String(out).trim() };
  } catch (e) {
    const err = e as { stdout?: unknown; stderr?: unknown; message?: string };
    return { ok: false, out: (String(err.stdout ?? "") + String(err.stderr ?? "")).trim() || (err.message ?? "failed") };
  }
}

export function cmdSelfUpdate(args: string[] = []): void {
  const bad = args.filter((a) => a.startsWith("--") && a !== "--dry-run");
  if (bad.length) {
    console.log(`zemory selfupdate: unknown flag ${bad.join(" ")}`);
    console.log("  usage: zemory selfupdate [--dry-run]");
    process.exitCode = 1;
    return;
  }
  const dryRun = args.includes("--dry-run");
  const root = toolRoot();
  const before = appVersion();
  console.log(`zemory selfupdate — ${root} (đang chạy ${before || "?"})`);

  if (!existsSync(join(root, ".git"))) {
    console.log("  ✗ đây không phải bản cài từ mã nguồn (không thấy .git) — không tự cập nhật được.");
    process.exitCode = 1;
    return;
  }

  // ── CHỐT 1: CÂY PHẢI SẠCH ───────────────────────────────────────────────────
  // Đây là chốt quan trọng nhất của cả lệnh. `git pull` lên một cây có sửa chưa commit
  // là cách mất việc của người khác — và repo công cụ THƯỜNG có phiên agent đang mở.
  // Thà dừng và bảo người ta tự xử còn hơn "cố cho xong".
  const status = run("git", ["status", "--porcelain"], root);
  if (!status.ok) {
    console.log(`  ✗ không chạy được git status: ${status.out}`);
    process.exitCode = 1;
    return;
  }
  if (status.out) {
    const n = status.out.split(/\r?\n/).filter(Boolean).length;
    console.log(`  ✗ DỪNG — cây làm việc còn ${n} thay đổi chưa commit. Cập nhật sẽ đè lên chúng.`);
    for (const l of status.out.split(/\r?\n/).filter(Boolean).slice(0, 10)) console.log(`      ${l}`);
    console.log("    → commit hoặc stash trước, rồi chạy lại.");
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log("  (--dry-run) cây sạch ⇒ sẽ chạy: git pull --ff-only · npm install · npm run build · npm link");
    return;
  }

  // ── CHỐT 2: CHỈ FAST-FORWARD ────────────────────────────────────────────────
  // `--ff-only` để không bao giờ đẻ merge commit tự động trên máy người khác. Nhánh đã
  // rẽ ⇒ dừng, người thật xử — đúng doctrine "bị chặn thì đi HỎI, không tìm đường vòng".
  const steps: Array<[string, string, string[]]> = [
    ["git pull --ff-only", "git", ["pull", "--ff-only"]],
    ["npm install", process.platform === "win32" ? "npm.cmd" : "npm", ["install"]],
    ["npm run build", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]],
    ["npm link", process.platform === "win32" ? "npm.cmd" : "npm", ["link"]],
  ];
  for (const [label, cmd, a] of steps) {
    process.stdout.write(`  · ${label} … `);
    const r = run(cmd, a, root);
    if (!r.ok) {
      console.log("LỖI");
      console.log(r.out.split(/\r?\n/).slice(-12).join("\n"));
      console.log(`    → dừng ở bước "${label}". Bản đang cài KHÔNG bị nửa vời nếu lỗi ở pull;`);
      console.log("      lỗi ở build thì chạy lại `npm run build` sau khi xử xong nguyên nhân.");
      process.exitCode = 1;
      return;
    }
    console.log("ok");
  }

  const after = appVersion();
  console.log(`  ✓ xong: ${before || "?"} → ${after || "?"}`);
  console.log("  ⚠ daemon 4444 vẫn chạy MÃ CŨ — nó nạp code lúc bind cổng. Khởi động lại để bản mới sống:");
  console.log("      tắt cửa sổ zemory rồi `zemory ui`");
}
