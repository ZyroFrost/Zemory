// Bảng số KHÔNG được khoá event loop của daemon (đo 2026-09-25).
//
// Ping xen kẽ trong lúc tính lại bảng số: một lượt chặn /ping 6,3 s. Hai phần đồng bộ nặng nhất:
// tiến độ đẩy Drive (ba phép quét toàn bảng `messages`, 0,9–6,3 s trong daemon) và dò kết nối nguồn
// local (`listConnections`, 2,5 s lạnh). Sau vá: ping chờ lâu nhất 19–20 ms. Cổng này canh HAI thứ:
// worker ra ĐÚNG số (không đổi chậm lấy sai), và các đường gọi không quay về bản đồng bộ.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { openMemory } from "../../dist/memory/db.js";
import { driveCountsInWorker } from "../../dist/jobs/driveprogress.js";
import { tempDir } from "./helpers.mjs";

test("driveCountsInWorker: đếm ở worker ra ĐÚNG số của kho (tổng · đã đẩy · mốc · tin mới nhất)", async (t) => {
  const dir = tempDir(t, "zemory-drvprog-");
  const p = join(dir, "gm.db");
  const db = openMemory(p);
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 1; i <= 10; i++) ins.run("s1", `u${i}`, "user", `m${i}`, `2026-09-25T00:00:${String(i).padStart(2, "0")}.000Z`);
  const wm = db.prepare("SELECT id FROM messages WHERE uuid='u6'").pluck().get();
  db.prepare("INSERT INTO sync_state (bundle, last_message_id, updated_at) VALUES (?,?,?)").run("drive:TESTHOST", wm, "2026-09-25T01:00:00.000Z");
  db.close();
  const c = await driveCountsInWorker(p, "drive:TESTHOST");
  assert.ok(c, "worker phải trả số, không null");
  assert.equal(c.total, 10);
  assert.equal(c.synced, 6, "đã đẩy = số tin có id ≤ mốc");
  assert.equal(c.lastPushAt, "2026-09-25T01:00:00.000Z");
  assert.equal(c.newestAt, "2026-09-25T00:00:10.000Z");
  // Bundle chưa từng đẩy ⇒ mốc 0 ⇒ đã đẩy 0, không ném.
  const none = await driveCountsInWorker(p, "drive:NEVER");
  assert.equal(none?.synced, 0);
  // Kho không tồn tại ⇒ null (fail-open), không treo, không ném.
  assert.equal(await driveCountsInWorker(join(dir, "missing.db"), "drive:X"), null);
});

test("🔴 bảng số và /sync-pulse đếm Drive qua WORKER; cây nguồn đọc kết nối từ ĐỆM làm tươi ở worker", () => {
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.match(UI, /async function driveSummary\(\): Promise<DriveSummary> \{\n\s*const prog = await driveSyncProgressAsync\(\);/, "driveSummary phải đi đường worker");
  assert.match(UI, /const prog = await driveSyncProgressAsync\(\);\n\s*\/\/ Kèm cờ BẬT\/TẮT kênh/, "/sync-pulse phải đi đường worker");
  assert.doesNotMatch(UI, /= driveSyncProgress\(\);/, "ca ÂM: không đường nào còn gán thẳng từ bản đồng bộ");
  assert.equal((UI.match(/: driveSyncProgress\(\);/g) ?? []).length, 1, "bản đồng bộ chỉ còn là đường LÙI khi worker hỏng");
  const SC = readFileSync(new URL("../src/memory/scope.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const safe = SC.slice(SC.indexOf("function safeConnections("), SC.indexOf("function localHealth("));
  assert.match(safe, /if \(Date\.now\(\) - connCache\.at > CONN_TTL_MS\) refreshConnections\(dbPath\);\n\s*return connCache\.rows;/, "hết hạn ⇒ trả bản cũ NGAY, làm tươi phía sau");
  assert.match(SC, /export function markConnectionsStale\(\): void \{\n\s*if \(connCache\) connCache\.at = 0;/, "xoá đệm = đánh dấu cũ, KHÔNG xoá (xoá là ép lượt sau tính đồng bộ)");
  assert.match(UI, /function invalidateDashboard\(\): void \{\n\s*dashCache = null;\n\s*heavyCache = null;\n\s*markConnectionsStale\(\);/, "quét/đồng bộ xong thì kết nối cũng phải được làm tươi");
  // Chẩn đoán: lượt tính lại quá 1 s phải in từng phần — lần sau nghẽn là có số ngay, khỏi đoán.
  assert.match(UI, /if \(total > 1000\) daemonLog\(`\[dashboard\] tính lại mất/, "lượt tính lại chậm phải tự khai phần nào chậm");
});

test("vectorRemainingInWorker: đếm ở worker ra ĐÚNG số của lời gọi trực tiếp; bộ lập lịch không còn đếm đồng bộ", async (t) => {
  // Đo 25/09: anti-join này đứng daemon 3,85 s ngay sau "scan: finished".
  const { vectorRemainingInWorker } = await import("../../dist/jobs/vecworker.js");
  const { vectorRemaining } = await import("../../dist/memory/vectors.js");
  const dir = tempDir(t, "zemory-vecw-");
  const p = join(dir, "gm.db");
  const db = openMemory(p);
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  for (let i = 1; i <= 7; i++) ins.run("s1", `u${i}`, "user", `noi dung ${i}`, "2026-09-25T00:00:00.000Z");
  db.close();
  const direct = vectorRemaining(p);
  assert.ok(direct > 0, "tiền đề: có tin chờ nhúng");
  assert.equal(await vectorRemainingInWorker(p), direct, "worker phải ra đúng số");
  const SCH = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const code = SCH.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n"); // bỏ chú thích — nó nhắc tên hàm để giải thích
  assert.doesNotMatch(code, /\bvectorRemaining\(\)/, "ca ÂM: bộ lập lịch không được đếm đồng bộ trên event loop nữa");
  assert.match(SCH, /const counted = await vectorRemainingInWorker\(currentMemoryDb\(\)\);/, "đếm qua worker");
  assert.match(SCH, /if \(counted === null\) \{[\s\S]{0,120}skipped this tick/, "worker hỏng ⇒ bỏ lượt, không ghi mốc 'trống'");
});

test("runInWorker: chạy đúng hàm ở worker, trả dữ liệu thuần; hàm hỏng ⇒ {ok:false}, không ném", async () => {
  const { runInWorker } = await import("../../dist/jobs/fnworker.js");
  const ok = await runInWorker("memory/channel/presence.js", "readPresence", [null, { selfDeviceId: "X", allowedPeers: [] }]);
  assert.deepEqual(ok, { ok: true, value: [] }, "không có thư mục chung ⇒ bảng rỗng, qua worker");
  const bad = await runInWorker("memory/channel/presence.js", "khongCoHamNay", []);
  assert.equal(bad.ok, false, "hàm không tồn tại ⇒ báo lỗi, không ném");
});

test("🔴 daemon gọi việc dọn dẹp · bảng presence · IP cố định KHÔNG đồng bộ (CPU profiler 25/09: 18,5 s chặn / 180 s)", () => {
  const SCH = readFileSync(new URL("../src/jobs/scheduler.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const tick = SCH.slice(SCH.indexOf("async function scratchTick"), SCH.indexOf("\n}\n", SCH.indexOf("async function scratchTick")));
  for (const fn of ["sweepScratchpads", "sweepBrowserProfiles", "sweepOrphanBrowsers", "sweepOrphanTempProfiles"]) {
    assert.match(tick, new RegExp(String.raw`runInWorker<[^>]+>\("[^"]+", "` + fn + `"`), `${fn} phải chạy ở worker`);
    assert.doesNotMatch(tick, new RegExp(String.raw`(?<![".])\b` + fn + String.raw`\(`), `ca ÂM: ${fn} không được gọi thẳng trong daemon`);
  }
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.match(UI, /runInWorker<ReturnType<typeof ch\.readPresence>>\("memory\/channel\/presence\.js", "readPresence"/, "bảng presence (trên ổ Drive) đọc ở worker");
  assert.doesNotMatch(UI, /ch\.readPresence\(getDriveDir\(\)/, "ca ÂM: không đọc presence đồng bộ nữa");
  const fx = UI.slice(UI.indexOf("function fixedAddresses("), UI.indexOf("function lanAddresses("));
  assert.doesNotMatch(fx, /execFileSync/, "ca ÂM: IP cố định không được hỏi PowerShell đồng bộ");
  assert.match(fx, /execFile\(/, "hỏi PowerShell bất đồng bộ");
});

test("bộ kiểm sức khoẻ chạy ở worker (endpoint /check và lượt mồi lúc khởi động)", () => {
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const ep = UI.slice(UI.indexOf('if (p === "/check") {'), UI.indexOf('if (p === "/status")'));
  assert.match(ep, /await runCheckOffLoop\(feat, target\)/, "/check qua worker");
  assert.doesNotMatch(ep, /await runCheck\(/, "ca ÂM: /check không chạy tại chỗ");
  assert.match(UI, /void runCheckOffLoop\(f\)\.then/, "lượt mồi lúc khởi động qua worker");
  assert.match(UI, /runInWorker<unknown>\("checks\.js", "runCheck"/, "đúng module + hàm");
});
