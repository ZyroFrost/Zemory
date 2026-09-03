// BỀ MẶT KHÔNG ĐƯỢC NÓI DỐI — hai con số/dòng mà audit 2026-09-03 bắt được đang im.
//
// ① `remaining 0 · coverage 100%` một mình là con số NÓI DỐI: `vectorRemaining()` đếm bằng CHÍNH
//    bộ lọc dùng để chọn tin, nên tin nằm NGOÀI phạm vi nhúng không lọt vào con số nào. Đo trên
//    kho thật: **23.221 tin** không có vector (7,0% kho) trong khi bề mặt trưng đủ 100%.
//    `vectorOutOfScope()` được viết đúng để chữa việc đó từ 12/08 — và có test riêng assert
//    *"phải NHÌN THẤY được"* — nhưng nó **chưa từng có người gọi ngoài test**, nên số đó chưa bao
//    giờ lên bề mặt nào. Cổng này canh đúng chỗ đã hở: ĐƯỜNG RA, không phải cái hàm.
//    Đo qua `memory stats` vì đó chính là tiến trình con mà `statsjob.heavyStatsChild()` phóng.
//
// ② Lỗi merge kho chung bị hấp thụ: entry `error` chỉ nằm trong `merged[]` rồi lượt sync vẫn trả
//    `ok:true` và log in `auto-sync: OK`. Nên một file trên kênh KHÔNG GIẢI MÃ ĐƯỢC ở MỌI lượt,
//    suốt 20 giờ, mà không dòng nào kêu. `§8d luật ⑤`: *một dòng log không phân biệt được
//    thành/bại là tiếng ồn*. Fail-open giữ nguyên (một file lạ không được chặn đường đồng bộ) —
//    ràng buộc duy nhất là phải NÓI RA.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { openMemory } from "../../dist/memory/db.js";
import { writeMemoryShareKey } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

test("① tin CỐ Ý ngoài phạm vi nhúng phải hiện ra trên bề mặt, không núp sau `remaining 0`", (t) => {
  const root = tempDir(t, "zemory-oos-");
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES (?,?,?,?,?,?)");
  // `Read` KHÔNG nằm trong EMBED_TOOLS_DEFAULT ⇒ cố ý không nhúng: đây là hạng tin bị đếm hụt.
  ins.run("s1", "m1", "user", "duong dan mot", "Read", "2026-01-01T00:00:00Z");
  ins.run("s1", "m2", "user", "duong dan hai", "Grep", "2026-01-01T00:01:00Z");
  // Một tin prose để chứng minh cổng không chỉ đơn giản đếm mọi thứ.
  ins.run("s1", "m3", "user", "van xuoi", null, "2026-01-01T00:02:00Z");
  db.close();

  const out = execFileSync(process.execPath, ["dist/cli.js", "memory", "stats"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, GLOBAL_MEMORY_DB: dbPath, ZEMORY_DAEMON_CHILD: "1" },
  });
  const line = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"))
    .pop();
  assert.ok(line, `\`memory stats\` phải in một dòng JSON — đó là hợp đồng statsjob đọc. Thấy:\n${out}`);
  const v = JSON.parse(line);

  assert.ok("outOfScope" in v, "thiếu `outOfScope` ⇒ daemon không có gì để trưng, và bề mặt lại nói dối như cũ");
  assert.equal(v.outOfScope, 2, `hai tin Read/Grep phải được đếm là 'cố ý bỏ' (thấy ${v.outOfScope})`);
  // Đây là cả điểm của bản vá — HAI THƯỚC KHÁC NHAU, không thay được nhau:
  // `remaining` chỉ thấy tin TRONG phạm vi còn chờ nhúng (đúng 1: tin prose `m3`);
  // `outOfScope` thấy tin NGOÀI phạm vi (đúng 2: Read + Grep) — hạng mà `remaining` mù tuyệt đối.
  assert.equal(v.remaining, 1, `chỉ tin prose là còn chờ nhúng (thấy ${v.remaining})`);
  assert.notEqual(v.outOfScope, v.remaining, "hai con số đo hai thứ khác nhau; gộp lại là xoá mất ranh giới");
});

test("① `memory info` cũng phải nói ra, không chỉ đường JSON của daemon", (t) => {
  const root = tempDir(t, "zemory-oos-info-");
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES (?,?,?,?,?,?)").run("s1", "m1", "user", "duong dan", "Read", "2026-01-01T00:00:00Z");
  db.close();

  const out = execFileSync(process.execPath, ["dist/cli.js", "memory", "info"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, GLOBAL_MEMORY_DB: dbPath, ZEMORY_DAEMON_CHILD: "1" },
  });
  assert.match(out, /ngoài phạm vi nhúng/, `dòng vec_chunks phải nêu số cố-ý-bỏ. Thấy:\n${out}`);
});

test("② file không giải mã được trên kho chung phải LÊN LOG, không núp trong merged[]", async (t) => {
  const { syncDrive } = await import("../../dist/memory/share.js");
  const home = tempDir(t, "zemory-mergelog-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  delete process.env.GLOBAL_MEMORY_DB;
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });

  const root = tempDir(t, "zemory-mergelog-");
  const dbPath = join(root, "memory.db");
  const driveDir = join(root, "drive");
  const keyPath = join(root, "share.key");
  mkdirSync(driveDir, { recursive: true });
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run("s1", "m1", "user", "tin mot", "2026-01-01T00:00:00Z");
  db.close();
  writeMemoryShareKey(keyPath);
  process.env.ZEMORY_SHARE_KEY = readFileSync(keyPath, "utf8").trim();
  t.after(() => delete process.env.ZEMORY_SHARE_KEY);

  // Một gói `.enc` ĐỜI CŨ còn sót, nội dung không giải mã được — `mergeAll` cố ý quét MỌI `.enc`
  // nên nó phải đi qua file này. Cố ý KHÔNG dùng chính `global_memory.enc` 0 byte: file đó là
  // KHÚC 1, nên nó cũng thành ĐÍCH GHI và lượt push trượt trước khi ta kịp đo phần log —
  // trộn hai lỗi vào một ca thì ca đó không còn canh được gì.
  // (Ghi lại vì nó là dữ kiện thật: trên kênh đang chạy, cái cứu lượt push là `.002.enc` tình cờ
  //  đang là khúc CUỐI; nếu khúc 1 rỗng mà không có khúc 2 thì MỌI lượt push cũng trượt.)
  writeFileSync(join(driveDir, "old-machine.enc"), "khong phai bundle");

  const said = [];
  const real = console.error;
  console.error = (...a) => said.push(a.join(" "));
  let r;
  try {
    r = await syncDrive({ driveDir, keyFile: keyPath, dbPath, embed: false });
  } finally {
    console.error = real;
  }

  const bad = r.merged.filter((e) => e.error);
  assert.ok(bad.length > 0, "file 0 byte phải sinh entry lỗi trong merged[] (nếu không, ca thử này vô nghĩa)");
  assert.ok(
    said.some((l) => l.includes("[sync]") && l.includes("old-machine.enc")),
    `lỗi merge phải LÊN LOG kèm dấu [sync] và tên file. Đã in:\n${said.join("\n") || "(không in gì)"}`,
  );
  // CA ÂM của chính bản vá: nói ra KHÔNG được biến thành chặn đường đồng bộ (fail-open, điều 9).
  // `syncDrive` không mang cờ `ok` (cờ đó do lớp job bọc ngoài đặt) ⇒ bằng chứng "không chặn" là:
  // lời gọi KHÔNG ném, và lượt push vẫn đi. Đây đúng vế dễ vá quá tay: biến một file lạ thành lỗi
  // cứng là tự tay chặn đường đồng bộ của chính mình.
  assert.ok(r.push && r.push.kind !== "none", `tin mới vẫn phải được đẩy lên như thường (thấy ${r.push && r.push.kind})`);
  // (Không assert "gói lành vẫn merge được": ở fixture này kênh còn TRỐNG nên file lạ là gói .enc
  //  DUY NHẤT — không có gói lành nào để mà so. Nói ra thay vì để lại một assertion luôn đúng/luôn sai.)
});

// ③ KÊNH MẤT KHÚC — vế "có HỤT không", thứ con số "thiếu vector" KHÔNG BAO GIỜ nhìn ra.
//
//    Trả giá thật 2026-09-03: kênh mất hẳn khúc 1 (2,22 GB / 48 khối) mà `vectors-catchup` vẫn
//    báo "thiếu 6.551" — nghe như lành. Cơ chế: nó chỉ soi *"trong những tin ĐANG CÓ trên kênh,
//    tin nào thiếu vector"*, nên kênh càng CỤT thì kho tạm càng ít tin ⇒ con số đó càng NHỎ.
//    Một cái thước tụt về phía "yên tâm" đúng lúc hệ hỏng nặng nhất còn tệ hơn không có thước.
//    Ca này tái hiện đúng hình dạng đó: dựng kênh đủ, mở khúc 2, rồi BỎ khúc 1.
test("③ mất khúc 1 ⇒ phép đo phải thấy kênh HỤT TIN, không chỉ đếm vector", async (t) => {
  const { syncDrive, vectorCatchUp } = await import("../../dist/memory/share.js");
  const home = tempDir(t, "zemory-short-home-");
  const save = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    APPDATA: process.env.APPDATA,
    GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB,
    ZEMORY_SEGMENT_MAX: process.env.ZEMORY_SEGMENT_MAX,
  };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  delete process.env.GLOBAL_MEMORY_DB;
  // Trần khúc bé để lượt sync thứ hai NIÊM PHONG khúc 1 và mở `.002.enc` — đúng hình dạng
  // production. Không có khúc 2 thì `listSegments` rỗng và lệnh từ chối chạy, ca mất ý nghĩa.
  process.env.ZEMORY_SEGMENT_MAX = "2048";
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });

  const root = tempDir(t, "zemory-short-");
  const dbPath = join(root, "memory.db");
  const driveDir = join(root, "drive");
  const keyPath = join(root, "share.key");
  mkdirSync(driveDir, { recursive: true });
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  // ≥1000 tin: sàn ĐẾM của phép dò (tỉ lệ trên mẫu bé là nhiễu — cùng doctrine ISOLATED_MIN_COUNT).
  db.transaction(() => {
    for (let i = 0; i < 1200; i++) ins.run("s1", "m" + i, "user", "noi dung so " + i, "2026-01-01T00:00:00Z");
  })();
  db.close();
  writeMemoryShareKey(keyPath);
  process.env.ZEMORY_SHARE_KEY = readFileSync(keyPath, "utf8").trim();
  t.after(() => delete process.env.ZEMORY_SHARE_KEY);

  await syncDrive({ driveDir, keyFile: keyPath, dbPath, embed: false });
  const db2 = openMemory(dbPath);
  db2.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run("s1", "mZ", "user", "tin cuoi", "2026-01-02T00:00:00Z");
  db2.close();
  await syncDrive({ driveDir, keyFile: keyPath, dbPath, embed: false }); // mở khúc 2
  assert.ok(existsSync(join(driveDir, "global_memory.002.enc")), "ca này cần khúc 2 tồn tại mới có nghĩa");

  // CA ÂM trước: kênh còn LÀNH thì tuyệt đối không được báo hụt.
  const ok = await vectorCatchUp({ driveDir, keyFile: keyPath, dbPath, dryRun: true });
  assert.ok(ok.localMessages >= 1000, "phải vượt sàn đếm, không thì phép dò tự tắt và ca này vô nghĩa");
  assert.ok(ok.probeMessages >= ok.localMessages, `kênh lành phải chở đủ tin (kênh ${ok.probeMessages} / kho ${ok.localMessages})`);

  assert.deepEqual(ok.unreadable, [], "CA ÂM: kênh lành thì không được vu cho khúc nào là hỏng");

  // CA HỎNG: bỏ khúc 1 — đúng thứ một lượt gộp trượt để lại.
  rmSync(join(driveDir, "global_memory.enc"));
  const bad = await vectorCatchUp({ driveDir, keyFile: keyPath, dbPath, dryRun: true });
  assert.ok(
    bad.localMessages - bad.probeMessages > bad.localMessages * 0.05,
    `mất khúc 1 phải lộ ra là HỤT TIN (kênh ${bad.probeMessages} / kho ${bad.localMessages}) — ca này xanh nghĩa là phép đo lại đang tụt về phía yên tâm đúng lúc kênh hỏng`,
  );
});

// ④ KHÚC KHÔNG ĐỌC ĐƯỢC — hạng nặng hơn "hụt", và là ca đã làm chính bản vá ③ trở nên vô dụng.
//
//    Chạy ③ trên kênh THẬT ngày 2026-09-03 thì lệnh NÉM `Invalid zemory memory bundle header`
//    ngay ở vòng dựng kho tạm, tức chết TRƯỚC cả phép đếm mà ③ vừa thêm: khúc 1 lúc đó là một
//    file 0 byte do một lượt gộp trượt để lại. Công cụ chẩn đoán câm đúng lúc cần nó nhất.
//    Bài học: một khúc hỏng KHÔNG được giết cả phép đo — phải ghi tên nó rồi đi tiếp.
test("④ khúc 0 byte trên kênh: phải GHI TÊN và đi tiếp, không được ném vỡ cả phép đo", async (t) => {
  const { syncDrive, vectorCatchUp } = await import("../../dist/memory/share.js");
  const home = tempDir(t, "zemory-unread-home-");
  const save = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, GLOBAL_MEMORY_DB: process.env.GLOBAL_MEMORY_DB, ZEMORY_SEGMENT_MAX: process.env.ZEMORY_SEGMENT_MAX };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  delete process.env.GLOBAL_MEMORY_DB;
  process.env.ZEMORY_SEGMENT_MAX = "2048";
  t.after(() => {
    for (const k of Object.keys(save)) {
      if (save[k] === undefined) delete process.env[k];
      else process.env[k] = save[k];
    }
  });

  const root = tempDir(t, "zemory-unread-");
  const dbPath = join(root, "memory.db");
  const driveDir = join(root, "drive");
  const keyPath = join(root, "share.key");
  mkdirSync(driveDir, { recursive: true });
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?,?,?,?,?,0)").run("s1", "claude-code", "local", "C:/p", "PC");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  db.transaction(() => {
    for (let i = 0; i < 1200; i++) ins.run("s1", "m" + i, "user", "noi dung so " + i, "2026-01-01T00:00:00Z");
  })();
  db.close();
  writeMemoryShareKey(keyPath);
  process.env.ZEMORY_SHARE_KEY = readFileSync(keyPath, "utf8").trim();
  t.after(() => delete process.env.ZEMORY_SHARE_KEY);

  await syncDrive({ driveDir, keyFile: keyPath, dbPath, embed: false });
  const db2 = openMemory(dbPath);
  db2.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run("s1", "mZ", "user", "tin cuoi", "2026-01-02T00:00:00Z");
  db2.close();
  await syncDrive({ driveDir, keyFile: keyPath, dbPath, embed: false }); // mở khúc 2

  // Đúng hiện trạng đo được: khúc 1 thành file RỖNG (không phải biến mất).
  writeFileSync(join(driveDir, "global_memory.enc"), "");

  const r = await vectorCatchUp({ driveDir, keyFile: keyPath, dbPath, dryRun: true });
  assert.equal(r.unreadable.length, 1, "phải ghi ĐÚNG một khúc hỏng, không nuốt và cũng không vu oan khúc lành");
  assert.equal(r.unreadable[0].file, "global_memory.enc", "phải nêu TÊN khúc hỏng — không có tên thì người đọc không biết soi đâu");
  assert.ok(r.probeMessages > 0, "phần đọc được vẫn phải dựng và đếm — một khúc hỏng không được xoá sạch phép đo");
});
