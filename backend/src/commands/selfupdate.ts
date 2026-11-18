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
import { localChangePlan, restoreKept, setAsideClashes } from "../update/local-changes.js";
import { createInterface } from "node:readline/promises";

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

/** One question per clashing file on a terminal; Enter = keep yours (the answer that loses nothing). */
async function askEach(paths: string[]): Promise<string[]> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const keep: string[] = [];
  try {
    for (const p of paths) {
      const a = (await rl.question(`    ${p} — [k]eep yours / [t]ake the new one? (k) `)).trim().toLowerCase();
      if (a !== "t") keep.push(p);
    }
  } finally {
    rl.close();
  }
  return keep;
}

export async function cmdSelfUpdate(args: string[] = []): Promise<void> {
  const known = ["--dry-run", "--check", "--keep-local", "--take-new"];
  const bad = args.filter((a) => a.startsWith("--") && !known.includes(a));
  if (bad.length || (args.includes("--keep-local") && args.includes("--take-new"))) {
    console.log(`zemory selfupdate: ${bad.length ? `unknown flag ${bad.join(" ")}` : "--keep-local and --take-new are opposite answers"}`);
    console.log("  usage: zemory selfupdate [--check] [--dry-run] [--keep-local | --take-new]");
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

  // ── LATCH 1: LOCAL EDITS — ASK, NEVER OVERWRITE (plan/27 §2f) ──────────────
  // A pull over uncommitted edits is how someone else's work gets lost — the tool's repo often has an agent session
  // open. Only the files the update ALSO changes need an answer; an edit the update does not touch rides through intact.
  const plan = localChangePlan(root);
  if (!plan.ok) {
    console.log(`  ✗ could not compare local edits with the update: ${plan.error}`);
    process.exitCode = 1;
    return;
  }
  let keep: string[] = [];
  if (plan.dirty.length) {
    console.log(`  · ${plan.dirty.length} uncommitted change(s); ${plan.clash.length} of them also changed by the update${plan.same.length ? ` (${plan.same.length} more already equal to the update: taken as they are)` : ""}.`);
    if (plan.clash.length) {
      const all = plan.clash.map((c) => c.path);
      if (args.includes("--keep-local")) keep = all;
      else if (args.includes("--take-new")) keep = [];
      else if (process.stdin.isTTY && !dryRun) keep = await askEach(all);
      else {
        for (const p of all) console.log(`      ${p}`);
        console.log("    ? keep your version of these files, or take the new one? Run again with one of:");
        console.log("        zemory selfupdate --keep-local   your version stays on top of the update");
        console.log("        zemory selfupdate --take-new     the new version; yours is kept in data/selfupdate-keep/");
        process.exitCode = 1;
        return;
      }
    }
  }

  if (dryRun) {
    console.log(`  (--dry-run) would run: git pull --ff-only · npm install · npm run build · npm link${plan.clash.length ? ` · keep ${keep.length}, take ${plan.clash.length - keep.length}` : ""}`);
    return;
  }

  // ── LATCH 2: FAST-FORWARD ONLY ──────────────────────────────────────────────
  // `--ff-only` never creates a merge commit on someone else's machine. A diverged branch stops here for a human to resolve.
  // The daemon is stopped AFTER the pull and BEFORE the first npm step: it is the only holder of the lock on
  // `dist/zemory.exe`, and the pull never touches `dist/`. The old order stopped it before the pull and returned on a red
  // pull, leaving it dead - measured 2026-11-18 04:11 UTC: the pull failed on a diverged branch and this PC lost its p2p
  // link for 20 minutes until someone relaunched the daemon by hand. Once stopped, every exit path brings it back (finally).
  let stoppedPid: number | null = null;

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
  const sideline = [...plan.clash, ...plan.same]; // an identical file is taken, never kept: no question, still restorable
  const aside = sideline.length ? setAsideClashes(root, sideline, keep) : null;
  if (aside) console.log(`  · local versions of ${sideline.length} file(s) copied to ${aside}`);
  try {
    for (const [label, cmd, a, sh] of steps) {
      if (cmd !== "git" && stoppedPid === null) {
        stoppedPid = await stopDaemonForBuild();
        if (stoppedPid === -1) { stoppedPid = null; process.exitCode = 1; return; }
      }
      process.stdout.write(`  · ${label} … `);
      const r = run(cmd, a, root, sh);
      const back = aside && cmd === "git" ? restoreKept(root, aside, !r.ok) : [];
      const backLine = (what: string): void => {
        if (back.length) console.log(`    ${what} ${back.length} file(s): ${back.slice(0, 5).join(" · ")}${back.length > 5 ? " …" : ""}`);
      };
      if (!r.ok) {
        console.log("FAILED");
        backLine("the pull failed — put back your version of");
        console.log(r.out.split(/\r?\n/).slice(-12).join("\n"));
        const why = cmd === "git" ? diagnosePull(root) : null;
        if (why) console.log(`    🔴 ${why}`);
        console.log(`    → stopped at step "${label}". The installed copy is NOT left half-updated if the failure is in pull;`);
        console.log("      if the failure is in build, run `npm run build` again once the cause is fixed.");
        process.exitCode = 1;
        return;
      }
      console.log("ok");
      backLine("kept your version of");
    }

    const after = appVersion();
    // Measure again now: a cache holding the previous round's number keeps the chip saying "new version" right after an
    // update, which reads as "the update did not take". Cheap: the sha just pulled is already on disk.
    refreshRemoteVersion(root, undefined, appVersion());
    console.log(`  ✓ done: ${before || "?"} → ${after || "?"}`);
  } finally {
    // A daemon this command stopped is always brought back, also when an npm step failed (if dist/ survived, the daemon
    // runs the build that is there).
    if (stoppedPid !== null) relaunchDaemon(root);
  }
}

/** Relaunch the daemon from `dist/` when the build is there; otherwise say what to do. Returns whether it launched. */
export function relaunchDaemon(root: string, launch: (cmd: string, args: string[]) => void = defaultLaunch): boolean {
  const cli = join(root, "dist", "cli.js");
  if (!existsSync(cli)) {
    console.log(`  ⚠ ${cli} not found — daemon NOT relaunched, run \`zemory ui\` once the build is fixed`);
    return false;
  }
  // The runtime carrying the app's name (`dist/zemory.exe`) when present - same rule as `selfupdate-run.mjs`. Launched
  // via `process.execPath` (node.exe from the CLI) the daemon runs under the name node (app-design §B1): measured
  // 2026-10-04, a node.exe daemon held the channel port and a stop by the name zemory.exe never reached it.
  const exe = join(root, "dist", "zemory.exe");
  launch(existsSync(exe) ? exe : process.execPath, [cli, "ui"]);
  console.log("  ✓ daemon relaunched");
  return true;
}

function defaultLaunch(cmd: string, args: string[]): void {
  spawn(cmd, args, { detached: true, stdio: "ignore", cwd: dirname(dirname(args[0])), windowsHide: true }).unref();
}
