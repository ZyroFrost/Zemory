// Idle background scheduler (plan 14 §6.B) — runs INSIDE the `zemory ui` daemon
// so the memory keeps itself current without the user asking:
//   • maintain chain — scan → embed → digest (opt-OUT: `scheduler`, default ON)
//   • auto-sync      — when data drifts, push/pull the encrypted Drive bundle (opt-in: autosync)
//
// BUG 2026-07-30: this file only had embed + sync, while the UI has always
// promised "daemon tự chạy scan → embed → digest". So NOTHING ingested new
// transcripts automatically — a machine sat at +2.722 unscanned messages with the
// daemon running and healthy, and `memory digest <session>` answered "no digest"
// because digest never ran either. The user read that as "web scan is broken";
// the real hole was the missing scan/digest steps here. Gate:
// backend/test/scheduler-contract.test.mjs now fails if the UI promises a step
// this file does not run.
//
// CRITICAL (bug 2026-07-21): the heavy work — ONNX embedding, Drive sync — must
// NOT run on the daemon's event loop. A synchronous embed pass froze /ping for
// ~28s (Node is single-threaded; native ONNX inference cannot yield). So each
// heavy pass runs in a SEPARATE PROCESS: embed via `zemory memory embed --all`,
// sync via the shared sync job (jobs/syncjob.ts — same child the UI button uses).
// The daemon only COUNTS the backlog (cheap-ish SQLite) and spawns. Exclusive
// access is coordinated through the write-gate's daemon-job token, so the
// scheduler, the UI sync button and a CLI writer never overlap.

import { spawn, type ChildProcess } from "node:child_process";

/** Đuôi stdout/stderr giữ lại của mỗi con maintain — cùng cỡ với `syncjob.ts`. */
const CHILD_TAIL = 8192;
import { constants, setPriority } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAutosync, getDriveDir, getScheduler } from "../config/settings.js";
import { backupAgeMs, backupStale, rotateBackup } from "../memory/backup-rotate.js";
import { currentMemoryDb } from "../memory/db.js";
import { daemonLog } from "../logging/daemon-log.js";
import { sweepScratchpads } from "./scratchpad.js";
import { verifyMemory } from "../memory/salvage.js";
import { vectorRemaining } from "../memory/vectors.js";
import { claimDaemonJob, cliHoldsWrite, cliHoldsWriteOn, cliWriteHolder, releaseDaemonJob } from "./writegate.js";
import { startSyncJob, syncJobRunning } from "./syncjob.js";

// 2026-08-02 — VAI ĐỔI: nạp GM giờ là việc của Stop hook (per-message, <1s, đúng lúc có tin
// thật). Vòng này TEO thành LƯỚI BÙ cho ba thứ per-message không làm được:
//   ① embed — mỗi lần nạp model ONNX mất vài giây, không thể chạy mỗi tin;
//   ② digest sweep + scan vét — nguồn không có hook (web, máy khác), hoặc hook trượt vì
//      write-gate đang bận (đo: chờ = ~125s/lượt nên hook bỏ qua, để lưới bù lượm);
//   ③ chiều IMPORT của Drive — bundle máy khác rơi xuống không phát sự kiện gì, phải poll.
// Vì vậy nhịp giãn 10' → 30': trả tiền theo thời gian ít lại, phần tươi đã có hook lo.
const MAINTAIN_EVERY_MS = 30 * 60_000; // lưới bù: scan vét → embed → digest
const SYNC_EVERY_MS = 30 * 60_000; // check Drive drift every 30 min
// The backlog count is a full anti-join (messages NOT IN vec_chunks) run
// synchronously on the event loop — hundreds of ms on a 595MB memory. When the
// backlog was last seen EMPTY, back off to the sync cadence instead of paying
// that scan every 5 minutes (audit 2026-07-21).
const IDLE_BACKOFF_MS = 30 * 60_000;
/** Backup tự kiểm hạn (1 bản/ngày) nên nhịp này chỉ là "có cơ hội để hỏi", rẻ như một readdir. */
const BACKUP_EVERY_MS = 30 * 60_000;
// Rác nháp lớn dần theo GIỜ chứ không theo phút — 6 tiếng một lượt là đủ dày mà gần như
// không tốn gì (một lượt `readdir` + `stat`).
const SCRATCH_EVERY_MS = 6 * 60 * 60_000;

let maintainTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let backupTimer: ReturnType<typeof setInterval> | null = null;
let scratchTimer: ReturnType<typeof setInterval> | null = null;
let child: ChildProcess | null = null;
let chainRunning = false; // a maintain chain is between claim and release
let lastEmptyAt = 0; // when vectorRemaining() last returned 0

function log(msg: string): void {
  // 🔴 GHI RA ĐĨA, không chỉ stderr (2026-08-12).
  // Bản cũ chỉ `console.error`, mà daemon được phóng TÁCH KHỎI console (autostart `.vbs`,
  // `WshShell.Run(cmd,0,False)`) nên stderr không đi đâu cả — **không một dòng nào tới đĩa**.
  // Cái giá đo được: lỗi bỏ đói autosync sống im lặng **2 giờ 34 phút**; nó CÓ in
  // "auto-sync — starting background sync job", chỉ là không ai đọc được. Một lớp nền không
  // để lại dấu vết thì mọi lỗi của nó đều là lỗi câm — đúng thứ `02_RULES §Bề mặt CHẾT THEO
  // nền` cấm. `daemonLog` ghi `<thư mục kho>/logs/daemon.log` và vẫn mirror ra stderr.
  daemonLog(`[scheduler] ${msg}`);
}

/** dist/jobs/scheduler.js → its sibling dist/cli.js. */
function cliEntry(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "cli.js");
}

/** True while THIS module's maintain child is alive. */
export function schedulerChildRunning(): boolean {
  return child !== null;
}

/**
 * Run ONE maintenance command in a separate process and wait for it.
 * Heavy work must never touch the daemon's event loop (see header), and the
 * chain must be sequential — scan feeds embed, embed feeds digest.
 */
function runStep(label: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    let c: ChildProcess;
    try {
      // ZEMORY_DAEMON_CHILD: the child skips the CLI write-gate — THIS daemon
      // already holds the job token for it (gating made it wait on itself).
      // stdout/stderr là "pipe", KHÔNG "ignore". Đo 2026-08-27: con `embed --all` chạy 20 phút
      // (730 s CPU) không ghi một hàng nào, và từ ngoài KHÔNG CÁCH NÀO biết nó đang khởi động
      // chậm hay kẹt — mọi lời nó in đều rơi vào hư không, `daemon.log` chỉ có "running embed".
      // Sync đã được vá đúng lỗ này ngày 26/08 (`syncjob.ts`), scan/embed/digest thì chưa.
      // Chỉ giữ ĐUÔI (8 KB) — phần đáng đọc là chỗ ném hoặc dòng tiến độ cuối.
      c = spawn(process.execPath, [cliEntry(), ...args], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        // ZEMORY_DAEMON_PID: để con phân biệt khoá CỦA MÌNH (daemon giữ hộ) với khoá của
        // một CLI NGOÀI đang ghi. Thiếu nó thì con không có cách nào biết, và sẽ ghi đè —
        // đúng ca 2026-08-08 (hai `embed --all` cùng kho).
        env: { ...process.env, ZEMORY_DAEMON_CHILD: "1", ZEMORY_DAEMON_PID: String(process.pid) },
      });
    } catch (e) {
      log(`${label}: could not spawn (${e instanceof Error ? e.message : e})`);
      resolve(-1);
      return;
    }
    child = c;
    // NHƯỜNG CPU CHO NGƯỜI DÙNG. Việc nền (embed ONNX · scan · digest) chạy ở ưu tiên THẤP HƠN
    // bình thường: máy rảnh thì nó vẫn ăn trọn 12 core, còn lúc người dùng đang gõ / chạy test
    // thì hệ điều hành cắt nhịp cho việc trước mặt. Tốt hơn ghim cứng số core — ghim cứng thì
    // lúc máy rảnh cũng chỉ dùng được phần đã ghim.
    //
    // Vì sao cần (đo 2026-08-13): hook capture ghi ~23 tin/phút trong lúc làm việc, nên backlog
    // embed gần như LUÔN dương và job nền gần như LUÔN chạy — ở ưu tiên Normal, nó tranh CPU
    // ngang hàng với chính việc người dùng đang làm.
    // Fail-open: thiếu quyền đổi ưu tiên thì chạy tiếp như cũ, không được giết job vì chuyện này.
    try {
      if (c.pid) setPriority(c.pid, constants.priority.PRIORITY_BELOW_NORMAL);
    } catch {
      /* không đổi được ưu tiên — vẫn chạy, chỉ là không nhường */
    }
    // PHẢI hút cả hai ống, không chỉ mở: ống không ai đọc thì đầy 64 KB là con TREO ở `write` —
    // biến một lớp chẩn đoán thành một kiểu hỏng mới.
    let out = "";
    let err = "";
    c.stdout?.on("data", (d: Buffer) => {
      out += String(d);
      if (out.length > CHILD_TAIL) out = out.slice(-CHILD_TAIL);
    });
    c.stderr?.on("data", (d: Buffer) => {
      err += String(d);
      if (err.length > CHILD_TAIL) err = err.slice(-CHILD_TAIL);
    });
    const done = (code: number): void => {
      if (child === c) child = null;
      resolve(code);
    };
    c.on("exit", (code) => {
      // Dòng tiến độ cuối của con (CLI in `\r` để ghi đè tại chỗ ⇒ tách cả `\r`).
      const last = out.split(/[\r\n]+/u).map((l) => l.trim()).filter(Boolean).pop();
      log(`${label}: finished (exit ${code ?? "?"})${last ? " · " + last : ""}`);
      // Lỗi thì nói RA lỗi gì — không để lại bốn chữ "exit 1" như ca sync 26/08.
      if ((code ?? -1) !== 0 && err.trim()) {
        for (const line of err.trim().split(/\r?\n/u).slice(-20)) log(`${label}: stderr · ${line}`);
      }
      done(code ?? -1);
    });
    c.on("error", (e) => {
      log(`${label}: child error ${e instanceof Error ? e.message : e}`);
      done(-1);
    });
  });
}

/**
 * The chain the UI promises: scan → embed → digest.
 * ONE job token for the whole chain so a CLI writer never lands mid-sequence.
 */
async function maintainTick(): Promise<void> {
  if (chainRunning || child || syncJobRunning() || cliHoldsWrite() || !getScheduler()) return; // yield to any other writer
  if (!claimDaemonJob("maintain")) return;
  chainRunning = true;
  try {
    // 0. KHO CÓ LÀNH KHÔNG — hỏi TRƯỚC khi ghi thêm gì.
    //    Sự cố 2026-08-03: kho hỏng lúc nào không ai biết, chỉ lộ ra vì tình cờ chạy bench.
    //    Mỗi ngày chậm phát hiện là bản sao lưu gần nhất càng cũ. Hỏng thì DỪNG cả chuỗi:
    //    ghi tiếp vào một file đã hỏng chỉ làm hỏng thêm và đè lên bản sao lưu còn tốt.
    const health = verifyMemory(currentMemoryDb());
    if (!health.ok) {
      log(`⛔ KHO HỎNG (${health.detail}) — dừng chuỗi bảo trì. Chạy \`zemory memory salvage\` rồi \`memory reopen\` + \`memory scan\`.`);
      return;
    }
    // 1. scan — ingest new/changed transcripts. Incremental (dedup by uuid), and
    //    it is the ONLY step that brings new messages in, so it never backs off.
    await runStep("scan", ["memory", "scan"]);

    // 2. embed — only when there is a vector backlog. Counting is a full
    //    anti-join (hundreds of ms on a 595MB memory), so when the backlog was
    //    last seen EMPTY, skip the count for a while (audit 2026-07-21).
    const skipCount = lastEmptyAt !== 0 && Date.now() - lastEmptyAt < IDLE_BACKOFF_MS;
    if (!skipCount) {
      let remaining = 0;
      try {
        remaining = vectorRemaining();
      } catch {
        remaining = 0; // vector lane unavailable → fail-open, try next tick
      }
      if (remaining > 0) {
        lastEmptyAt = 0;
        log(`embed backlog ${remaining} — running embed (--all)`);
        await runStep("embed", ["memory", "embed", "--all"]);
      } else {
        lastEmptyAt = Date.now();
      }
    }

    // 3. digest — cheap when nothing changed (content-hash guard skips sessions
    //    already summarised), so it can run every chain.
    await runStep("digest", ["memory", "digest", "--all"]);

    // 4. backup — đã DỜI sang `backupTick()` (nhịp riêng). Xem chú thích ở đó: gọi từ trong
    //    chuỗi này làm backup chết theo công tắc `scheduler`.
    await backupTick("sau chuỗi bảo trì");
  } finally {
    chainRunning = false;
    releaseDaemonJob();
  }
}

/**
 * 🔴 BACKUP KHÔNG ĐƯỢC TREO VÀO CÔNG TẮC CỦA MỘT TÍNH NĂNG KHÁC.
 *
 * Bản cũ đặt `rotateBackup()` làm bước 4 của `maintainTick`, và `maintainTick` return ngay ở
 * dòng đầu khi `getScheduler()` tắt ⇒ **tắt scheduler là tắt luôn backup**, không một dòng log,
 * không cổng nào thấy. Đó là lý do THẬT của "4 ngày không có bản sao lưu" (08/08 → 12/08) —
 * job không hỏng, nó chỉ không bao giờ được gọi. Cùng họ với lỗi bỏ đói autosync: **một công
 * tắc gánh ba việc**, người bật tưởng mình chỉ đang đổi một thứ.
 *
 * Backup là LƯỚI ĐỠ CUỐI CÙNG của kho (nó đã cứu kho thật ngày 04/08), nên nó phải sống độc
 * lập với mọi tính năng khác. Nhưng vẫn giữ hai ràng buộc cũ, vì cả hai đều có lý do:
 *  · nằm TRONG token job — chép 1,1 GB trong lúc scan/embed đang ghi đúng là kiểu tranh chấp
 *    mà sự cố 2026-08-03 nghi là nguyên nhân;
 *  · fail-open — backup hỏng không được giết thứ đang gọi nó (HP điều 9).
 * `rotateBackup` tự kiểm hạn (một bản/ngày, giữ 5) nên gọi mỗi 30 phút vẫn rẻ: một `readdir`.
 */
/**
 * Đếm số nhịp backup bị nhường LIÊN TIẾP. Tồn tại vì audit 2026-08-21 đo được: nhánh nhường
 * nằm TRƯỚC `try` nên nó **không nói gì** — 54 nhịp im lặng trong 27 giờ nhìn y như "mọi thứ ổn".
 * Một lần nhường là bình thường; nhường mãi là một kiểu HỎNG, và kiểu hỏng đó phải thấy được.
 */
let backupYields = 0;
const BACKUP_YIELD_LOG_EVERY = 8; // ~4 giờ ở nhịp 30 phút — thấy được mà không thành nhiễu

async function backupTick(why: string): Promise<void> {
  const holdsToken = chainRunning; // gọi từ trong chuỗi ⇒ token đã ở trong tay
  if (!holdsToken) {
    // Nhường theo ĐÚNG KHO mình sắp chép, không phải "có ai đang ghi trong thư mục này".
    // Trước 2026-08-21 chỗ này gọi `cliHoldsWrite()` — mà khoá là MỘT file cho cả `data/` nên
    // job re-embed kho SONG SONG (plan 19) giữ khoá 44 giờ đã bỏ đói backup của kho THẬT: hai
    // file khác nhau, không hề tranh nhau. Xem `writegate.cliHoldsWriteOn`.
    const target = currentMemoryDb();
    const blocker = child ? "daemon child" : syncJobRunning() ? "sync job" : cliHoldsWriteOn(target) ? (cliWriteHolder()?.label ?? "CLI") : null;
    if (blocker) {
      backupYields++;
      // Nói ở lượt ĐẦU (để biết vì sao im) rồi định kỳ (để biết nó vẫn đang im).
      if (backupYields === 1 || backupYields % BACKUP_YIELD_LOG_EVERY === 0) {
        const age = backupAgeMs(target);
        log(
          `backup nhường ${blocker} — lượt thứ ${backupYields} liên tiếp` +
            (age === null ? " · CHƯA có bản nào" : ` · bản mới nhất ${(age / 3_600_000).toFixed(1)} giờ tuổi`) +
            (backupStale(target).stale ? " · ⚠ QUÁ HẠN (doctor sẽ báo đỏ)" : ""),
        );
      }
      return;
    }
    if (!claimDaemonJob("backup")) return;
  }
  try {
    const b = await rotateBackup();
    if (b.wrote) {
      log(`backup (${why}) → ${b.outPath} (${b.bytes} byte)${b.pruned.length ? ` · dọn ${b.pruned.length} bản cũ` : ""}`);
      backupYields = 0;
    }
  } catch (e) {
    log(`backup bỏ qua: ${(e as Error).message}`); // điều 9: hỏng backup KHÔNG được giết ai
  } finally {
    if (!holdsToken) releaseDaemonJob();
  }
}

/**
 * Dọn thư mục nháp của host (`<temp>/claude/<project>/<session>/scratchpad`).
 *
 * Vì sao là JOB chứ không phải một dòng luật: đo 2026-08-20 trên đúng MỘT phiên làm việc nặng —
 * **3,97 GB** nằm im ở đó (model ONNX tải để đo, cache HuggingFace, profile trình duyệt). Không
 * ai dọn, không cổng nào kêu, và người dùng chỉ biết khi đĩa đầy. Nguyên văn user: *"đợi t kiểm
 * thì t ko nhớ và cũng lâu mới làm"*.
 *
 * KHÔNG nằm trong token job và KHÔNG hỏi công tắc nào: nó không đụng kho, không tranh ghi với ai
 * (chỉ đọc/xoá trong thư mục tạm của host), nên treo nó vào công tắc tính năng khác là tái diễn
 * đúng lỗi đã làm backup chết lặng 4 ngày. Fail-open như mọi lớp phụ (HP điều 9).
 */
function scratchTick(): void {
  try {
    const r = sweepScratchpads({ keepSession: process.env.CLAUDE_SESSION_ID });
    if (r.removed.length) {
      const mb = (n: number): string => (n / 1024 / 1024).toFixed(0);
      log(
        `dọn nháp: bỏ ${r.removed.length} phiên (${mb(r.removed.reduce((a, x) => a + x.bytes, 0))} MB) — ` +
          r.removed.map((x) => `${x.why} ${x.ageDays}d`).join(" · ") +
          ` · còn ${mb(r.keptBytes)} MB`,
      );
    }
  } catch (e) {
    log(`dọn nháp bỏ qua: ${(e as Error).message}`);
  }
}

/**
 * 🔴 NHƯỜNG THÌ PHẢI QUAY LẠI — nếu không, nhường một lần là nhường mãi mãi.
 *
 * Bản cũ: bị chặn ⇒ `return`, đợi hết chu kỳ 30 phút. Nghe vô hại, nhưng ghép với việc hai
 * đồng hồ CÙNG chu kỳ và được tạo CÙNG một khoảnh khắc thì thành **bỏ đói vĩnh viễn**:
 * `maintainTick` đăng ký TRƯỚC nên tới hạn nó chạy trước, và nó chạy đồng bộ tới tận lúc
 * `spawn` (gán `child`) rồi mới nhả event loop — `syncTick` chạy ngay sau, thấy `child` ⇒ bỏ
 * lượt. Cứ thế mỗi 30 phút.
 *
 * Đo được 2026-08-12: bật scheduler lúc trưa ⇒ **2,5 giờ không một lượt sync nào**, Drive
 * trống trơn, không lỗi, không log. Trước đó autosync chạy đều **chỉ vì scheduler đang TẮT**
 * (maintainTick return sớm ⇒ không có `child` ⇒ sync thông đường). Tức bật một công tắc làm
 * chết một công tắc khác, và không cổng nào thấy.
 */
const SYNC_RETRY_MS = 3 * 60_000;
let syncRetry: ReturnType<typeof setTimeout> | null = null;

/**
 * Một dòng tóm tắt lượt sync THÀNH CÔNG, đọc từ JSON con in ra.
 *
 * Cần vì "OK" trơ trọi không phân biệt được *"đẩy 3.812 tin"* với *"không có gì để đẩy"* — và
 * chính ca 26/08 là một chuỗi lượt tưởng-như-xong. Đọc mềm (`unknown` → thu hẹp) vì đây là JSON
 * qua ống giữa hai tiến trình, không phải giá trị trong cùng process.
 */
export function describePush(result: unknown): string {
  const r = result as { push?: { kind?: string; messages?: number; bytes?: number }; embedded?: number } | undefined;
  if (!r?.push) return "";
  const { kind, messages = 0, bytes = 0 } = r.push;
  if (kind === "none") return " · không có gì để đẩy";
  return ` · ${kind} ${messages} tin / ${bytes} byte${r.embedded ? ` · nhúng thêm ${r.embedded}` : ""}`;
}

function syncTick(): void {
  if (!getAutosync()) return;
  if (!getDriveDir()) return; // no Drive folder linked → nothing to sync
  if (child || syncJobRunning() || cliHoldsWrite()) {
    // Nhường kẻ đang ghi, nhưng HẸN QUAY LẠI sớm thay vì đợi hết chu kỳ.
    if (!syncRetry) {
      syncRetry = setTimeout(() => {
        syncRetry = null;
        syncTick();
      }, SYNC_RETRY_MS);
      syncRetry.unref?.();
    }
    return;
  }
  log("auto-sync — starting background sync job");
  // lowPriority: lượt này do MÁY tự chạy. Nút "Đồng bộ ngay" gọi cùng hàm nhưng KHÔNG truyền cờ
  // — lúc đó người dùng đang ngồi chờ.
  // 🔴 LOG KẾT CỤC, không log "đã chạy xong" (2026-08-26). Câu cũ `auto-sync: job finished` in
  // ra Y HỆT nhau cho lượt đẩy được và lượt hỏng — nên khi lượt 26/08 chết với `UNKNOWN: unknown
  // error, write`, `daemon.log` vẫn chỉ nói "finished" và không ai biết có gì sai suốt 20 giờ
  // (watermark đứng, kênh chung phình bằng khối trùng). Một dòng log không phân biệt được
  // thành/bại thì nó không phải lớp quan sát, nó là tiếng ồn.
  startSyncJob(
    (s) => {
      if (s.ok) log(`auto-sync: OK${describePush(s.result)}`);
      else log(`🔴 auto-sync THẤT BẠI: ${s.error ?? "không rõ lý do"}`);
      // In ở CẢ HAI kết cục. Lượt THÀNH CÔNG cũng có thể mang cảnh báo đáng đọc — ví dụ
      // "Drive ném lỗi giả nhưng đếm lại thấy khối vẫn đủ"; nếu chỉ in khi hỏng thì đúng sự kiện
      // hiếm và đáng giá nhất lại là sự kiện bị nuốt.
      if (s.stderr) log(`auto-sync — chi tiết:\n${s.stderr}`);
    },
    { lowPriority: true },
  );
}

/** Start the background loops. Idempotent — a second call is a no-op. */
export function startScheduler(): void {
  if (maintainTimer || syncTimer || backupTimer) return;
  maintainTimer = setInterval(() => void maintainTick(), MAINTAIN_EVERY_MS);
  // Backup có ĐỒNG HỒ RIÊNG, KHÔNG hỏi `getScheduler()` — xem chú thích ở `backupTick()`.
  // Lệch pha 1/4 chu kỳ để không tới hạn cùng lúc với hai đồng hồ kia (cùng bài học bỏ đói).
  backupTimer = setInterval(() => void backupTick("nhịp riêng"), BACKUP_EVERY_MS);
  scratchTimer = setInterval(scratchTick, SCRATCH_EVERY_MS);
  setTimeout(scratchTick, 90_000).unref?.(); // mồi một lượt sau khi daemon ổn định
  // LỆCH PHA nửa chu kỳ: hai đồng hồ cùng chu kỳ mà tạo cùng lúc thì tới hạn CÙNG một khoảnh
  // khắc, và cái đăng ký trước luôn giành được lượt (xem chú thích ở syncTick). Đặt sync vào
  // giữa hai nhịp bảo trì để lúc nó tới hạn thì chuỗi kia đã xong từ lâu.
  syncTimer = setInterval(syncTick, SYNC_EVERY_MS);
  const stagger = setTimeout(syncTick, SYNC_EVERY_MS / 2);
  stagger.unref?.();
  const backupStagger = setTimeout(() => void backupTick("nhịp riêng"), BACKUP_EVERY_MS / 4);
  backupStagger.unref?.();
  // The HTTP server keeps the process alive; don't let these timers do it.
  maintainTimer.unref?.();
  syncTimer.unref?.();
  backupTimer.unref?.();
  scratchTimer?.unref?.();
  // Kick the chain shortly after boot, then on the interval.
  setTimeout(() => void maintainTick(), 15_000).unref?.();
  // Backup được mồi RIÊNG — chuỗi trên có thể không bao giờ chạy (scheduler tắt), mà một máy
  // vừa khởi động lại sau nhiều ngày thì đó đúng là lúc cần hỏi "bản gần nhất cũ chưa?".
  setTimeout(() => void backupTick("mồi sau khởi động"), 60_000).unref?.();
  log(`started (maintain ${getScheduler() ? "on" : "off"}, auto-sync ${getAutosync() ? "on" : "off"}, backup luôn bật)`);
}

/** Stop the loops and any running child (tests / shutdown). */
export function stopScheduler(): void {
  if (maintainTimer) clearInterval(maintainTimer);
  if (syncTimer) clearInterval(syncTimer);
  if (backupTimer) clearInterval(backupTimer);
  if (scratchTimer) clearInterval(scratchTimer);
  maintainTimer = syncTimer = backupTimer = scratchTimer = null;
  chainRunning = false;
  if (child) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    child = null;
    releaseDaemonJob();
  }
}
