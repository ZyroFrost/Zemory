// Ba tool ĐIỀU KHIỂN qua MCP (plan 14) — `memory_jobs` · `memory_scan` · `memory_embed`.
//
// Chúng KHÔNG đẻ chức năng (user chốt 2026-08-27: *"mọi chức năng đã có sẵn trên zemory hết
// rồi, MCP chỉ là điều khiển và quản lý"*), nên cổng này không soi việc nạp/nhúng — nó soi
// đúng ba lời hứa mà lớp điều khiển tự đặt ra, và cả ba đều là chỗ hỏng-mà-không-ai-biết:
//
//   ① Daemon chết ⇒ nói "unknown", TUYỆT ĐỐI không nói `false`. Trả `false` cho "có đang
//      nhúng không" khi thật ra mình không biết chính là "vỏ rỗng trông như đang sống" mà
//      `02_RULES §Bề mặt CHẾT THEO nền` cấm — và nó là kiểu hỏng KHÔNG báo lỗi.
//   ② Có kẻ khác đang ghi ⇒ TỪ CHỐI, không tranh khoá. Hai kẻ ghi cùng kho đã hỏng kho
//      HAI LẦN (03+04/08, sinh ra HP điều 11).
//   ③ Không có việc ⇒ KHÔNG phóng job. Một job nhúng chạy hàng giờ và giữ khoá ghi suốt
//      thời gian đó; phóng nó "cho chắc" là chặn mọi lượt quét mà chẳng được gì.
//
// ⚠ PHẢI CÔ LẬP khỏi kho THẬT — cùng lý do `writegate.test.mjs` đã ghi: khoá là FILE nằm
// cạnh kho, nên chạy trên kho thật thì test ĐỎ mỗi khi máy đang có job ghi. Và `db.ts` đọc
// `GLOBAL_MEMORY_DB` MỘT LẦN lúc nạp module ⇒ đặt env TRƯỚC, `import` động SAU.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOME = mkdtempSync(join(tmpdir(), "zemory-mcpctl-"));
process.env.GLOBAL_MEMORY_DB = join(HOME, "global_memory.db");
// Cổng daemon trỏ vào chỗ KHÔNG AI nghe (cổng 1 cần quyền root) ⇒ nhánh "daemon chết" chạy
// tất định, không phụ thuộc máy chạy test có đang bật daemon thật hay không.
process.env.ZEMORY_UI_PORT = "1";
// `scan()` đi từ `homedir()`. Trỏ home sang thư mục tạm rỗng để nó không quét transcript
// THẬT vào kho tạm — vừa chậm vừa bẩn, và làm số đo của ca ÂM mất ý nghĩa.
process.env.USERPROFILE = HOME;
process.env.HOME = HOME;

const { openMemory } = await import("../../dist/memory/db.js");
const { callMcpTool } = await import("../../dist/tools/index.js");

const LOCK = join(HOME, "cli-write.lock");
const payload = (r) => JSON.parse(r.content[0].text);

function seed(messages) {
  const db = openMemory(process.env.GLOBAL_MEMORY_DB);
  try {
    db.prepare("INSERT OR IGNORE INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run(
      "ctl-session",
      "codex",
      HOME,
      messages,
    );
    for (let i = 0; i < messages; i++) {
      db.prepare("INSERT OR IGNORE INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
        "ctl-session",
        `ctl-msg-${i}`,
        "user",
        `control surface probe number ${i}`,
        "2026-08-28T00:00:00Z",
      );
    }
  } finally {
    db.close();
  }
}

/** Giả một tiến trình ĐANG GIỮ khoá ghi. Dùng pid của chính test = pid chắc chắn còn sống,
 *  nên `cliWriteHolder()` không loại nó vì "chủ khoá đã chết". */
function holdLock(label = "someone else") {
  writeFileSync(LOCK, JSON.stringify({ pid: process.pid, label, at: Date.now(), db: process.env.GLOBAL_MEMORY_DB }));
}
const freeLock = () => rmSync(LOCK, { force: true });

const UNKNOWN = "unknown — daemon not responding";

// ── ① Trung thực khi daemon chết ────────────────────────────────────────────

test("memory_jobs: daemon chết ⇒ trả 'unknown', KHÔNG trả false", async () => {
  freeLock();
  const j = payload(await callMcpTool("memory_jobs", {}));

  assert.equal(j.daemon.alive, false, "daemon phải được báo là không sống");

  // Vế QUAN TRỌNG NHẤT của cả file: ba sự thật này CHỈ daemon biết. Không hỏi được thì
  // phải nói không biết. `false` ở đây đọc ra là "chắc chắn không có gì chạy" — một lời
  // khẳng định mà tiến trình MCP không có cơ sở nào để đưa ra.
  for (const k of ["embedRunning", "scheduler", "autosync"]) {
    assert.equal(j[k], UNKNOWN, `${k} phải là "unknown" khi daemon không trả lời`);
    assert.notEqual(j[k], false, `${k} KHÔNG được bịa thành false`);
  }
  assert.equal(j.sync, UNKNOWN);

  // Ngược lại: hai thứ đọc từ FILE thì daemon chết vẫn đúng — phải giữ được, không rơi
  // theo. Đây là ranh giới "cái gì còn tin được khi nền chết".
  assert.equal(j.writeLock, null, "khoá đọc từ file, daemon chết vẫn đọc được");
  assert.equal(j.daemonJobRunning, false);
  assert.equal(j.canWriteNow, true);
  assert.match(j.note, /not answering/, "phải nói rõ vì sao có chữ unknown");
});

test("memory_jobs: im lặng + marker job còn tươi ⇒ 'unknown', KHÔNG kết luận đã chết", async () => {
  // Đo lúc nghiệm thu 2026-08-28: bản đầu in ra `daemon.alive:false` NGAY CẠNH
  // `daemonJobRunning:true` — hai câu đá nhau, và câu sai là câu đầu (daemon vẫn sống,
  // pid 9448, chỉ đang bận). Không trả lời ≠ đã chết.
  freeLock();
  const marker = join(HOME, "daemon-job.lock");
  writeFileSync(marker, JSON.stringify({ label: "embed", at: Date.now(), pid: process.pid }));
  try {
    const j = payload(await callMcpTool("memory_jobs", {}));
    assert.equal(j.daemonJobRunning, true);
    assert.notEqual(j.daemon.alive, false, "có job đang chạy thì KHÔNG được phán daemon đã chết");
    assert.match(String(j.daemon.alive), /unknown/);
    assert.match(String(j.daemon.alive), /busy, not dead/);
  } finally {
    rmSync(marker, { force: true });
  }
});

test("memory_jobs: đường RẺ không đếm được thì NÓI không đếm — không bịa 0", async () => {
  // Đo 2026-08-28: đếm thẳng là anti-join toàn bảng, **15,7 s** trên kho thật, trong khi
  // daemon cache đúng số đó và trả trong 107 ms. Nên đường mặc định là hỏi daemon. Daemon
  // không trả lời ⇒ phải nói "chưa đếm", vì `0` ở đây đọc ra là "đã nhúng xong hết" — một
  // câu khẳng định ngược hẳn sự thật (kho đang có 7 tin chờ).
  seed(7);
  freeLock();
  const j = payload(await callMcpTool("memory_jobs", {}));
  assert.equal(j.embedBacklogSource, "skipped");
  assert.equal(typeof j.embedBacklog, "string", "không đếm được thì trả CÂU giải thích, không trả số");
  assert.notEqual(j.embedBacklog, 0, "TUYỆT ĐỐI không bịa 0 khi chưa đếm");
  assert.match(j.embedBacklog, /not counted/);
});

test("memory_jobs: deep=true ⇒ đếm THẬT, và thấy khoá của kẻ khác", async () => {
  seed(7);
  freeLock();
  let j = payload(await callMcpTool("memory_jobs", { deep: true }));
  assert.equal(j.embedBacklog, 7, "7 tin chưa có vector ⇒ backlog 7");
  assert.match(j.embedBacklogSource, /direct/, "phải nói rõ số này đếm thẳng, không phải cache");

  holdLock("mcp memory_embed");
  j = payload(await callMcpTool("memory_jobs", { deep: true }));
  assert.equal(j.writeLock.holder, "mcp memory_embed");
  assert.equal(j.writeLock.pid, process.pid);
  assert.equal(j.canWriteNow, false, "đang có kẻ ghi ⇒ phải nói là KHÔNG ghi được");
  freeLock();
});

// ── ② Từ chối khi có kẻ khác đang ghi ───────────────────────────────────────

test("memory_scan: có kẻ đang ghi ⇒ TỪ CHỐI, không tranh khoá", async () => {
  seed(3);
  holdLock("memory embed --all");
  const r = payload(await callMcpTool("memory_scan", {}));
  assert.equal(r.ok, false);
  assert.equal(r.busy, true);
  assert.match(r.heldBy, /memory embed --all/, "phải nói RÕ ai đang giữ, không chỉ 'bận'");
  assert.equal(r.totals, undefined, "từ chối thì KHÔNG được kèm kết quả quét");
  freeLock();
});

test("memory_embed: có kẻ đang ghi ⇒ TỪ CHỐI, KHÔNG phóng job thứ hai", async () => {
  seed(5);
  holdLock("mcp memory_scan");
  const r = payload(await callMcpTool("memory_embed", {}));
  assert.equal(r.ok, false);
  assert.equal(r.busy, true);
  assert.equal(r.started, undefined, "hai lượt embed cùng kho là đường hỏng kho — không được phóng");
  assert.equal(r.pid, undefined);
  freeLock();
});

// ── Ca ÂM: rảnh thì phải CHẠY THẬT, không phải lúc nào cũng báo bận ──────────

test("CA ÂM — memory_scan: khoá rảnh ⇒ chạy thật và NHẢ khoá sau khi xong", async () => {
  seed(2);
  freeLock();
  const r = payload(await callMcpTool("memory_scan", {}));
  assert.equal(r.ok, true, "rảnh mà vẫn báo bận thì cổng bận thành cổng chặn");
  assert.equal(r.busy, undefined);
  assert.ok(r.totals, "phải trả báo cáo quét thật");
  assert.equal(typeof r.scannedFiles, "number");
  assert.equal(r.web, undefined, "không xin web ⇒ không được tự mở trình duyệt");

  // Khoá bị rò là kẹt kho 15 phút cho MỌI tiến trình khác — `finally` phải nhả thật.
  const j = payload(await callMcpTool("memory_jobs", {}));
  assert.equal(j.writeLock, null, "quét xong phải nhả khoá");
  assert.equal(j.canWriteNow, true);
});

// ── ③ Không có việc thì không phóng job ─────────────────────────────────────

test("CA ÂM — memory_embed: backlog 0 ⇒ started:false, không phóng gì", async () => {
  // Kho rỗng ⇒ không tin nào đáng nhúng. Job nhúng giữ khoá ghi hàng giờ, nên phóng nó khi
  // không có việc là chặn mọi lượt quét để đổi lấy đúng con số không.
  const empty = join(mkdtempSync(join(tmpdir(), "zemory-mcpctl-empty-")), "global_memory.db");
  openMemory(empty).close();
  const r = payload(await callMcpTool("memory_embed", {}, { dbPath: empty }));
  assert.equal(r.ok, true);
  assert.equal(r.started, false);
  assert.equal(r.remaining, 0);
  assert.equal(r.pid, undefined);
});
