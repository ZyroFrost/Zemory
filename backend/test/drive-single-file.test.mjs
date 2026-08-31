// MỘT KHO CHÍNH TRÊN DRIVE, ghi bằng cách NỐI THÊM (user chốt 2026-08-12).
//
// Lối cũ (series theo máy) khiến mỗi máy đẻ một baseline riêng của cùng một kho đã hội tụ —
// đo trên Drive thật: 13 file / 2,9 GB, trong đó hai baseline 331 MB + 336 MB gần như trùng
// nội dung. Lối mới: đúng MỘT file, mỗi lượt sync nối thêm một khối nhỏ vào cuối.
//
// 🔄 2026-08-30 (user chốt, HP điều 16 sửa đổi — `plan/08 §8e`): kho chính = MỘT DÃY KHÚC tuần
// tự. Bất biến ① nới thành "một DÃY khúc chung mọi máy" — vẫn cấm series-theo-máy/rải rác. Trần
// khúc mặc định 256 MB nên các ca dưới (bundle vài KB) không bao giờ tràn ⇒ hành vi một-file cũ
// GIỮ NGUYÊN; nhóm ca KHO CHIA KHÚC ở cuối file ép trần nhỏ bằng `ZEMORY_SEGMENT_MAX` để đo roll.
//
// Bốn bất biến khoá ở đây, và cái thứ ba là cái đắt nhất nếu sai:
//   ① thư mục Drive luôn chỉ có MỘT file kho chính;
//   ② hai máy ghi xen kẽ thì KHÔNG bên nào mất tin;
//   ③ ghi thêm là GHI THÊM THẬT — byte của khối cũ không đổi (nếu viết lại cả file thì mỗi
//      lượt sync tốn nguyên 336 MB đường truyền, đúng thứ lối này sinh ra để tránh);
//   ④ không có gì mới ⇒ KHÔNG chạm file.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { openMemory } from "../../dist/memory/db.js";
import { syncDrive, writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

function sandboxHome(t) {
  const home = tempDir(t, "zemory-single-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  for (const k of ["HOME", "USERPROFILE", "APPDATA", "XDG_CONFIG_HOME"]) process.env[k] = home;
  delete process.env.GLOBAL_MEMORY_DB;
  t.after(() => { for (const k of Object.keys(save)) { if (save[k] === undefined) delete process.env[k]; else process.env[k] = save[k]; } });
}

let seq = 0;
function addMessages(dbPath, n, tag) {
  const db = openMemory(dbPath);
  try {
    const sid = `s${++seq}`;
    db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run(sid, "claude-code", "local", "C:\\proj", "PC");
    const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
    for (let i = 0; i < n; i++) ins.run(sid, `${sid}-${tag}-${i}`, "user", `tin ${tag} ${i} ${"x".repeat(40)}`, "2026-01-01T00:00:00Z");
  } finally {
    db.close();
  }
}
const msgCount = (dbPath) => { const db = openMemory(dbPath); try { return db.prepare("SELECT COUNT(*) c FROM messages").get().c; } finally { db.close(); } };
const encFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".enc"));

function setup(t) {
  sandboxHome(t);
  const root = tempDir(t, "zemory-single-");
  const dir = join(root, "drive");
  mkdirSync(dir);
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  return { dir, keyPath, dbA: join(root, "a.db"), dbB: join(root, "b.db") };
}

test("hai máy ghi xen kẽ vào ĐÚNG MỘT file, không bên nào mất tin", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);

  addMessages(dbA, 5, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "sau lượt sync đầu chỉ được có MỘT file");

  // Máy B: chưa biết gì, phải nhận đủ 5 tin của A rồi mới đẩy phần của mình.
  addMessages(dbB, 3, "B1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbB), 8, "B phải có cả tin của A lẫn của mình");
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "B ghi vào CÙNG file, không đẻ file mới");

  // A sync lại: nhận phần của B.
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.equal(msgCount(dbA), 8, "A phải nhận được tin của B từ chính file đó");

  // Vòng thứ hai — chỗ mà lối cũ đẻ thêm file cho mỗi máy.
  addMessages(dbA, 2, "A2");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbB), 10);
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "vẫn đúng một file sau 5 lượt sync");
});

test("NỐI THÊM thật: byte của khối cũ không đổi, file chỉ dài ra", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  const main = join(dir, "global_memory.enc");

  addMessages(dbA, 5, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  const before = readFileSync(main);

  addMessages(dbB, 3, "B1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  const after = readFileSync(main);

  assert.ok(after.length > before.length, "file phải DÀI RA");
  assert.deepEqual(
    after.subarray(0, before.length),
    before,
    "phần đầu phải NGUYÊN VẸN từng byte — viết lại cả file là mất trọn ý nghĩa của nối thêm",
  );
});

test("không có gì mới ⇒ KHÔNG chạm file", async (t) => {
  const { dir, keyPath, dbA } = setup(t);
  const main = join(dir, "global_memory.enc");

  addMessages(dbA, 4, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  const size = statSync(main).size;

  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.equal(r.push.kind, "none", "không có tin mới thì không được ghi gì");
  assert.equal(statSync(main).size, size, "kích thước phải y nguyên");
});

// 🔄 HỢP ĐỒNG ĐỔI 2026-08-25 (`plan/08 §8c`, user chốt): gặp máy khác đang ghi thì **ĐỢI TỚI
// LƯỢT**, không còn "từ chối rồi bắt người dùng tự bấm lại". Nguyên văn: *"thấy máy kia đang ghi
// thì máy mình phải đợi, chạy sau, sync sau"*.
//
// Ca ÂM ở đây quan trọng ngang ca dương: khoá CÒN SỐNG (nhịp tim đều) **tuyệt đối không được
// cướp**. Đó đúng là lỗi đã nổ 2026-08-25 — lượt merge chậm giữ khoá 1 giờ, máy kia coi là mồ côi
// rồi nối khối vào giữa lúc đang đọc, hỏng cả lượt sync lẫn lượt bù vector.
test("CA ÂM: khoá CÒN SỐNG (có nhịp tim) thì KHÔNG được cướp — phải xếp hàng đợi", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  addMessages(dbA, 2, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });

  const { writeFileSync } = await import("node:fs");
  const lockPath = join(dir, "global_memory.sync.lock");
  // Máy khác đang giữ khoá và ĐANG ĐẬP NHỊP (at mới tinh, beat:true).
  writeFileSync(lockPath, JSON.stringify({ host: "MAY-KHAC", pid: 1, at: new Date().toISOString(), beat: true }));
  const containerBefore = statSync(join(dir, "global_memory.enc")).size;

  addMessages(dbB, 2, "B1");
  const ac = { aborted: false };
  const run = syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B", lockSignal: ac });
  // Cho nó vài vòng chờ rồi cắt: điều phải chứng minh là nó KHÔNG vào, chứ không phải nó xong.
  await new Promise((r) => setTimeout(r, 1_500));
  assert.equal(
    JSON.parse(readFileSync(lockPath, "utf8")).host,
    "MAY-KHAC",
    "khoá còn sống mà bị đổi chủ = đã cướp — đúng lỗi đang đi vá",
  );
  assert.equal(statSync(join(dir, "global_memory.enc")).size, containerBefore, "chưa tới lượt thì KHÔNG được ghi gì");
  ac.aborted = true;
  await assert.rejects(() => run, /huỷ khi đang chờ/, "huỷ thì phải nói rõ là đang xếp hàng, không im lặng");
});

// `timeout` KHÔNG phải trang trí: nếu ngưỡng chết hỏng theo chiều "không bao giờ coi là chết" thì
// hàng đợi chờ VÔ HẠN, và test sẽ TREO thay vì đỏ. Đo 2026-08-25: đúng kiểu treo đó đã ngốn 15
// phút im lặng của một lượt gate mà không ai biết đang chờ gì. Treo là kiểu hỏng tệ hơn đỏ.
test("khoá CHẾT THẬT (lỡ nhịp) ⇒ máy sau vào được — không để một máy tắt làm kẹt cả hệ", { timeout: 60_000 }, async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  addMessages(dbA, 2, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });

  const { writeFileSync } = await import("node:fs");
  // Khoá có nhịp tim nhưng đã lỡ quá 3 nhịp (>90s) ⇒ chủ coi như chết.
  writeFileSync(
    join(dir, "global_memory.sync.lock"),
    JSON.stringify({ host: "MAY-CHET", pid: 1, at: new Date(Date.now() - 5 * 60_000).toISOString(), beat: true }),
  );

  addMessages(dbB, 2, "B1");
  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(r.push.kind, "delta", "chủ khoá chết thì máy sau phải vào được, không chờ vô hạn");
});

// VÙNG TỚI HẠN TỐI THIỂU + CỬA CHẶN RẺ (`plan/08 §8c` ①) — hai cải tiến đo được, không phải gu.
//
// Bệnh đo 2026-08-25: `mergeContainer` giải nén MỌI khối ra file tạm rồi mới hỏi "đã merge chưa"
// ⇒ mỗi lượt sync chép lại nguyên container. Trên kênh 0,55 MB/s: đọc 2,4 GB, ~1 giờ, chỉ để kết
// luận KHÔNG có gì mới. Và vì merge nằm TRONG khoá nên máy kia phải chờ đúng ngần ấy.
test("lượt sync KHÔNG có gì mới không được chép lại container (cửa chặn rẻ)", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  addMessages(dbA, 40, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  addMessages(dbB, 3, "B1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });

  // Lượt thứ hai của B: mọi khối đã biết ⇒ phải bỏ qua HẾT, và bỏ qua BẰNG CHỮ KÝ ĐỌC TẠI CHỖ.
  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  const chunks = r.merged.filter((m) => m.file.includes("#"));
  assert.ok(chunks.length >= 2, "phép thử chỉ có nghĩa khi container đã có nhiều khối");
  assert.deepEqual(
    chunks.filter((m) => !m.skipped),
    [],
    "khối đã merge thì không được merge lại",
  );
  // ĐÂY mới là thứ cần đo. Không có cờ `cheap` thì "bỏ qua" và "chép ra rồi mới bỏ qua" nhìn y
  // hệt nhau — bản đầu của cổng này vì thế là TRANG TRÍ: gỡ cửa chặn rẻ mà test vẫn xanh.
  assert.deepEqual(
    chunks.filter((m) => !m.cheap).map((m) => m.file),
    [],
    "mọi khối đã biết phải được bỏ qua bằng chữ ký đọc TẠI CHỖ — chép lại container là 2,4 GB mỗi lượt sync",
  );
});

test("merge chạy NGOÀI khoá: khoá chỉ được giữ quanh phần GHI", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  const lockPath = join(dir, "global_memory.sync.lock");
  addMessages(dbA, 30, "A1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });

  // B chưa có gì của A ⇒ lượt sync này PHẢI merge thật. Trong lúc nó merge, khoá phải còn TRỐNG.
  addMessages(dbB, 2, "B1");
  let lockedDuringMerge = false;
  const watch = setInterval(() => {
    if (existsSync(lockPath)) lockedDuringMerge = true;
  }, 5);
  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  clearInterval(watch);

  assert.ok(r.merged.some((m) => !m.skipped), "phép thử chỉ có nghĩa nếu lượt này THẬT SỰ merge");
  assert.equal(msgCount(dbB), 32, "và merge phải đủ tin");
  // Ghi chú: khoá VẪN xuất hiện ở đoạn ghi cuối, nên không khẳng định "chưa bao giờ khoá" — điều
  // khoá được ở đây là merge KHÔNG nằm trong vùng khoá, kiểm bằng ca đột biến (đảo lại thứ tự).
  assert.ok(lockedDuringMerge, "đoạn GHI vẫn phải có khoá — nếu không thì hai máy ghi chồng");
});

test("NHÚNG TRƯỚC XUẤT SAU (2026-08-30): dòng phase phải có 'embed' đứng TRƯỚC 'export'", async (t) => {
  // Vì sao khoá thứ tự này: export bị `embedFrontierId` cắt ở tin đầu tiên CHƯA nhúng (điều 16 —
  // tin và vector cùng chuyến). Embed nằm SAU export (bản cũ) thì mỗi lượt chỉ chở phần lượt
  // TRƯỚC đã nhúng — đo trên kho thật 30/08: lượt auto chở 0 tin, watermark đứng yên ở 6504552
  // trong khi 5.926 tin xếp hàng. Đảo lại thì hết trễ-một-nhịp. Test này đỏ nếu ai dời embed về cuối.
  const { dir, keyPath, dbA } = setup(t);
  addMessages(dbA, 2, "PH");
  const phases = [];
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A", onProgress: (p) => phases.push(p) });
  const iEmbed = phases.indexOf("embed");
  const iExport = phases.indexOf("export");
  assert.ok(iEmbed >= 0 && iExport >= 0, `phải có cả hai phase, đo được: ${phases.join(" → ")}`);
  assert.ok(iEmbed < iExport, `embed phải TRƯỚC export (frontier tiến rồi mới cắt gói), đo được: ${phases.join(" → ")}`);
});

// ── KHO CHIA KHÚC (user chốt 2026-08-30 — HP điều 16 sửa đổi, `plan/08 §8e`) ─────────────────
// Gốc bệnh: Drive không upload delta ⇒ nối 0,3 MB vào file 2 GB là re-upload CẢ 2 GB, DriveFS
// treo cứng 2 lần/giờ (đo cùng ngày). Khúc đầy thì NIÊM PHONG (bất biến — Drive không bao giờ
// upload lại), lượt sau mở khúc kế. Ép trần bằng ZEMORY_SEGMENT_MAX để đo roll với bundle bé.

function tinySegments(t, bytes) {
  process.env.ZEMORY_SEGMENT_MAX = String(bytes);
  t.after(() => {
    delete process.env.ZEMORY_SEGMENT_MAX;
  });
}

test("KHÚC ĐẦY thì NIÊM PHONG, mở khúc kế — byte khúc cũ không đổi một ly", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  tinySegments(t, 1); // mọi khúc ĐÃ TỒN TẠI coi như đầy ⇒ mỗi lượt ghi mở khúc mới

  addMessages(dbA, 4, "S1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "khúc 1 giữ TÊN CŨ — tương thích ngược");
  const seg1 = readFileSync(join(dir, "global_memory.enc"));

  addMessages(dbA, 3, "S2");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.deepEqual(encFiles(dir), ["global_memory.002.enc", "global_memory.enc"], "khúc 1 đầy ⇒ lượt sau phải mở khúc .002");
  assert.deepEqual(readFileSync(join(dir, "global_memory.enc")), seg1, "khúc NIÊM PHONG phải bất biến từng byte — Drive không bao giờ upload lại nó");

  // Máy B mới toanh: merge phải quét ĐỦ MỌI khúc, không riêng khúc 1.
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbB), 7, "máy mới phải nhận đủ tin nằm rải trên CẢ HAI khúc");
});

test("hai máy ghi xen kẽ QUA RANH GIỚI khúc — không bên nào mất tin", async (t) => {
  const { dir, keyPath, dbA, dbB } = setup(t);
  tinySegments(t, 1);

  addMessages(dbA, 2, "XA");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  addMessages(dbB, 2, "XB");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" }); // mở .002
  addMessages(dbA, 2, "XA2");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" }); // mở .003
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbB, host: "MAY-B" });
  assert.equal(msgCount(dbA), 6, "A đủ 6 tin");
  assert.equal(msgCount(dbB), 6, "B đủ 6 tin — dãy khúc là THỨ TỰ TOÀN CỤC chung, không phải file riêng của máy nào");
});

test("--compact gộp MỌI khúc về MỘT khúc 1 tươi + bak; khúc thừa bị xoá", async (t) => {
  const { dir, keyPath, dbA } = setup(t);
  tinySegments(t, 1);

  addMessages(dbA, 3, "C1");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  addMessages(dbA, 3, "C2");
  await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  assert.ok(encFiles(dir).length >= 2, "tiền đề: đã mọc ≥2 khúc");

  addMessages(dbA, 1, "C3");
  const r = await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A", compact: true });
  assert.equal(r.push.kind, "compact");
  assert.deepEqual(
    encFiles(dir).sort(),
    ["global_memory.bak.enc", "global_memory.enc"],
    "sau gộp: đúng khúc 1 tươi + MỘT bản lùi — khúc .002+ phải biến mất",
  );
});

test("CA ÂM — trần mặc định 256 MB: bundle bé KHÔNG bao giờ mở khúc mới (hành vi cũ nguyên vẹn)", async (t) => {
  const { dir, keyPath, dbA } = setup(t);
  // KHÔNG đặt ZEMORY_SEGMENT_MAX — đây chính là điều kiện chạy thật hôm nay.
  for (const tag of ["N1", "N2", "N3"]) {
    addMessages(dbA, 2, tag);
    await syncDrive({ driveDir: dir, keyFile: keyPath, embed: false, dbPath: dbA, host: "MAY-A" });
  }
  assert.deepEqual(encFiles(dir), ["global_memory.enc"], "3 lượt sync bé vẫn một file — roll chỉ xảy ra khi khúc THẬT SỰ đầy");
});
