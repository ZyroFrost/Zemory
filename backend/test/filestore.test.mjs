// Kho tệp trên đĩa (plan/25 §2) — byte rời DB ra file thật.
//
// Bất biến được canh ở đây, theo thứ tự quan trọng:
//  ① Không mất byte: rút ra rồi đọc lại phải KHỚP sha256.
//  ② Chạy lại KHÔNG đẻ bản sao (lệnh di trú hay bị ngắt rồi gõ lại).
//  ③ Hàng lệch sha thì KHÔNG được ghi ra đĩa — đóng dấu cái sai lên file là làm hỏng thật.
//  ④ Đường phục vụ ảnh đọc được từ file sau khi byte đã rời DB.
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { extractBlobs, verifyFiles, gcFiles, relPathFor, categoryOf, listFiles, collectCreated, isScratchPath, addPickedFiles, PICKED_SESSION } from "../../dist/memory/filestore.js";
import { tempDir } from "./helpers.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** Kho có N đính kèm `blob` thật, mỗi cái nối vào một tin. */
function seed(t, items) {
  const dir = tempDir(t, "zfs-db-");
  const root = tempDir(t, "zfs-files-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const insMsg = db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  const insAtt = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, blob, created_at)
     VALUES (?,?,?,?,?,?,'blob',?,?)`,
  );
  const insLink = db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)");
  const made = [];
  items.forEach((it, i) => {
    const body = Buffer.from(it.body);
    const mid = Number(insMsg.run("u" + i, "user", `[image] tin ${i}`).lastInsertRowid);
    const digest = it.sha ?? sha(body);
    const aid = Number(
      insAtt.run(mid, "s1", it.name ?? null, it.mime, body.length, digest, body, it.createdAt ?? "2026-09-14T10:00:00Z")
        .lastInsertRowid,
    );
    insLink.run(mid, aid);
    made.push({ aid, mid, digest, body });
  });
  return { db, root, made };
}

test("đường đặt tệp: phân theo LOẠI rồi tới tháng, sha đứng trước tên", () => {
  const rel = relPathFor({
    sha256: "abcdef0123456789".padEnd(64, "0"),
    mime: "image/png",
    name: "Ảnh màn hình.png",
    createdAt: "2026-09-14T10:00:00Z",
  });
  assert.equal(rel, "images/2026-09/abcdef01_Ảnh-màn-hình.png");
  assert.equal(categoryOf("application/pdf"), "documents");
  assert.equal(categoryOf("application/zip"), "archives");
  assert.equal(categoryOf("video/mp4"), "media");
  assert.equal(categoryOf(null), "other");
});

test("rút byte ra đĩa: file khớp sha256, DB thôi giữ byte nhưng vẫn giữ chỉ mục", (t) => {
  const { db, root } = seed(t, [
    { body: "anh-mot", mime: "image/png", name: "a.png" },
    { body: "tai-lieu", mime: "application/pdf", name: "b.pdf" },
  ]);

  const r = extractBlobs({ db, root });

  assert.equal(r.moved, 2);
  assert.equal(r.failed.length, 0);
  const rows = db.prepare("SELECT id, blob, src_path, sha256, name, bytes FROM attachment ORDER BY id").all();
  for (const row of rows) {
    assert.equal(row.blob, null, "byte phải rời khỏi DB");
    assert.ok(row.src_path, "hàng phải trỏ tới tệp");
    assert.ok(row.name && row.bytes > 0, "chỉ mục Ở LẠI DB — tên, cỡ, sha không đi đâu");
    const abs = join(root, ...row.src_path.split("/"));
    assert.equal(sha(readFileSync(abs)), row.sha256, "nội dung trên đĩa khớp sha đã ghi");
  }
  assert.ok(existsSync(join(root, "images", "2026-09")), "ảnh vào thư mục images");
  assert.ok(existsSync(join(root, "documents", "2026-09")), "pdf vào thư mục documents");
  db.close();
});

test("CA ÂM — chạy lại lần hai KHÔNG chép thêm gì", (t) => {
  const { db, root } = seed(t, [{ body: "x", mime: "image/png", name: "a.png" }]);
  const first = extractBlobs({ db, root });
  const second = extractBlobs({ db, root });
  assert.equal(first.moved, 1);
  assert.equal(second.moved, 0, "lượt hai không rút gì nữa");
  assert.equal(second.failed.length, 0, "và cũng không báo lỗi — nó là ca bình thường");
  db.close();
});

test("CA ÂM — lượt trước bị CẮT GIỮA CHỪNG: file đã có, byte chưa xoá ⇒ không ghi đè", (t) => {
  // Đây mới là ca thật của tính idempotent. Lượt chạy lại "bình thường" không chứng minh
  // được gì: mệnh đề `blob IS NOT NULL` đã lọc hết hàng rồi, nên nhánh bỏ-qua không bao giờ
  // chạy tới. Đột biến gỡ nhánh đó vẫn XANH — cổng trang trí, phải dựng đúng ca mới ghim được.
  const { db, root } = seed(t, [{ body: "noi-dung", mime: "image/png", name: "a.png" }]);
  const row = db.prepare("SELECT id, sha256, src_path FROM attachment").get();
  // Dựng đúng trạng thái giữa chừng: ghi file ra trước, DB vẫn còn byte và chưa có src_path.
  const rel = relPathFor({ sha256: row.sha256, mime: "image/png", name: "a.png", createdAt: "2026-09-14T10:00:00Z" });
  const abs = join(root, ...rel.split("/"));
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, "noi-dung");
  const before = readFileSync(abs);

  const r = extractBlobs({ db, root });

  assert.equal(r.skipped, 1, "phải nhận ra file đã có đúng nội dung");
  assert.equal(r.moved, 0, "và KHÔNG ghi lại");
  assert.deepEqual(readFileSync(abs), before, "byte trên đĩa không bị đụng");
  assert.equal(db.prepare("SELECT blob FROM attachment").get().blob, null, "hàng DB vẫn được nối đúng chỗ");
  assert.equal(db.prepare("SELECT src_path FROM attachment").get().src_path, rel);
  db.close();
});

test("CA ÂM — hàng LỆCH sha256 KHÔNG được ghi ra đĩa", (t) => {
  const { db, root } = seed(t, [{ body: "noi-dung-that", mime: "image/png", name: "a.png", sha: "0".repeat(64) }]);

  const r = extractBlobs({ db, root });

  assert.equal(r.moved, 0);
  assert.equal(r.failed.length, 1);
  assert.match(r.failed[0].reason, /sha lệch/);
  const row = db.prepare("SELECT blob, src_path FROM attachment").get();
  assert.ok(row.blob, "byte phải Ở LẠI DB — không vứt thứ chưa chứng minh được");
  assert.equal(row.src_path, null);
  db.close();
});

test("CA ÂM — dry-run không đụng đĩa lẫn DB", (t) => {
  const { db, root } = seed(t, [{ body: "y", mime: "image/png", name: "a.png" }]);
  const r = extractBlobs({ db, root, dryRun: true });
  assert.equal(r.moved, 1, "vẫn ĐẾM được việc sẽ làm");
  assert.ok(!existsSync(join(root, "images")), "nhưng KHÔNG ghi file nào");
  assert.ok(db.prepare("SELECT blob FROM attachment").get().blob, "và KHÔNG đụng DB");
  db.close();
});

test("verify bắt được MẤT FILE và LỆCH NỘI DUNG", (t) => {
  const { db, root } = seed(t, [
    { body: "con-nguyen", mime: "image/png", name: "a.png" },
    { body: "bi-sua", mime: "image/png", name: "b.png" },
    { body: "bi-xoa", mime: "image/png", name: "c.png" },
  ]);
  extractBlobs({ db, root });
  const rows = db.prepare("SELECT id, src_path FROM attachment ORDER BY id").all();
  writeFileSync(join(root, ...rows[1].src_path.split("/")), "noi-dung-khac", "utf8");
  rmSync(join(root, ...rows[2].src_path.split("/")), { force: true });

  const v = verifyFiles({ db, root });

  assert.equal(v.checked, 3);
  assert.equal(v.ok, 1);
  assert.equal(v.corrupt.length, 1, "bản bị sửa phải bị bắt");
  assert.equal(v.missing.length, 1, "bản bị xoá phải bị bắt");
  db.close();
});

test("gc chỉ ĐO, và không đụng tệp đang có hàng trỏ tới", (t) => {
  const { db, root } = seed(t, [{ body: "dang-dung", mime: "image/png", name: "a.png" }]);
  extractBlobs({ db, root });
  mkdirSync(join(root, "images", "2026-01"), { recursive: true });
  writeFileSync(join(root, "images", "2026-01", "rac.png"), "khong-ai-tro-toi", "utf8");

  const g = gcFiles({ db, root });

  assert.equal(g.dryRun, true, "mặc định KHÔNG xoá");
  assert.deepEqual(g.orphans, ["images/2026-01/rac.png"]);
  assert.ok(existsSync(join(root, "images", "2026-01", "rac.png")), "đo xong vẫn còn nguyên");
  const kept = db.prepare("SELECT src_path FROM attachment").get().src_path;
  assert.ok(existsSync(join(root, ...kept.split("/"))), "tệp đang dùng KHÔNG bị nêu");
  db.close();
});

test("CA ÂM — hàng `ref` mang URL nguồn trong src_path KHÔNG được coi là đã có byte", (t) => {
  // Lỗi thật bắt được 2026-09-14 khi nhìn dữ liệu: `attachment.src_path` mang HAI nghĩa —
  // với `blob` đã rút là đường file, với `ref` là URL nguồn (`sediment://…`). Bề mặt lấy
  // "có đường" làm dấu hiệu "có ảnh" ⇒ vẽ thẻ ảnh rồi 404 trên màn người dùng.
  const dir = tempDir(t, "zfs-ref-");
  const root = tempDir(t, "zfs-refroot-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','test','local')").run();
  const mid = Number(
    db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1','u1','user','x')").run().lastInsertRowid,
  );
  const aid = Number(
    db
      .prepare(
        `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
         VALUES (?,?,?,?,?,?,'ref',?,?)`,
      )
      .run(mid, "s1", null, "image/png", 444078, "a".repeat(64), "sediment://file_0000000011", "2026-09-14T10:00:00Z")
      .lastInsertRowid,
  );
  db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)").run(mid, aid);

  const r = listFiles({ db, root });

  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].fetched, false, "chưa tải byte ⇒ fetched = false");
  assert.equal(r.items[0].rel, null, "URL nguồn KHÔNG được lộ ra như đường file");
  db.close();
});

test("làn `created`: nhận tệp agent GHI, loại vùng nháp và tệp đã biến mất", (t) => {
  const dir = tempDir(t, "zfs-cr-");
  const root = tempDir(t, "zfs-crroot-");
  const work = tempDir(t, "zfs-work-");
  // Ba ca: một tệp THẬT còn trên đĩa · một nằm trong vùng nháp · một đã bị xoá.
  const keep = join(work, "bao-cao.md");
  writeFileSync(keep, "# noi dung that", "utf8");
  mkdirSync(join(work, "dist"), { recursive: true });
  const junk = join(work, "dist", "bundle.js");
  writeFileSync(junk, "rac build", "utf8");
  const gone = join(work, "da-xoa.py");

  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','claude-code','local')").run();
  const ins = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s1',?,'assistant',?,'Write','2026-09-15T01:00:00Z')",
  );
  [keep, junk, gone].forEach((p, i) => ins.run("w" + i, JSON.stringify({ file_path: p, content: "x" })));

  // Dựng bằng String.raw: viết chéo ngược thẳng vào regex literal qua công cụ/shell là chỗ
  // mất escape đã dính ba lần trong phiên này.
  const sepClass = String.raw`[\\/]`;
  const onlyBuild = (x) => new RegExp(`${sepClass}(dist|node_modules)${sepClass}`, "i").test(x);
  const r = collectCreated({ db, root, isScratch: onlyBuild });

  assert.equal(r.added, 1, "chỉ tệp thật được nhận");
  assert.equal(r.excluded, 1, "tệp dưới dist/ bị loại");
  assert.equal(r.gone, 1, "tệp đã xoá không được nhận");
  const row = db.prepare("SELECT name, mime, src_path, bytes FROM attachment").get();
  assert.equal(row.name, "bao-cao.md");
  assert.equal(row.mime, "text/markdown");
  assert.ok(existsSync(join(root, ...row.src_path.split("/"))), "byte nằm trong kho tệp");
  assert.equal(readFileSync(join(root, ...row.src_path.split("/")), "utf8"), "# noi dung that");
  db.close();
});

test("CA ÂM — làn `created` chạy lại KHÔNG đẻ hàng trùng", (t) => {
  const dir = tempDir(t, "zfs-cr2-");
  const root = tempDir(t, "zfs-cr2root-");
  const work = tempDir(t, "zfs-work2-");
  const f = join(work, "ghi-chu.md");
  writeFileSync(f, "noi dung", "utf8");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','claude-code','local')").run();
  db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s1','w0','assistant',?,'Write','2026-09-15T01:00:00Z')",
  ).run(JSON.stringify({ file_path: f }));

  const noScratch = () => false;
  const first = collectCreated({ db, root, isScratch: noScratch });
  const second = collectCreated({ db, root, isScratch: noScratch });

  assert.equal(first.added, 1);
  assert.equal(second.added, 0, "lượt hai không thêm gì");
  assert.equal(second.already, 1, "nhận ra nội dung đã có trong kho");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM attachment").get().c, 1, "đúng MỘT hàng, không nhân đôi");
  db.close();
});

test("CA ÂM — luật vùng nháp phải bắt CẢ đường Windows (dấu chéo ngược)", () => {
  // Bẫy đã dính khi viết: heredoc ăn mất một tầng chéo ngược làm class ký tự chỉ còn khớp
  // chéo xuôi ⇒ trên Windows bộ lọc TRƯỢT SẠCH và 4.048 tệp nháp tràn vào kho, im lặng.
  // Soi THẲNG luật thật, không qua fixture — fixture nằm trong thư mục tạm của hệ, vốn đã
  // thuộc vùng bị loại, nên nó không bao giờ chứng minh được điều này.
  const win = ["D:", "repo", "node_modules", "pkg", "index.js"].join(String.fromCharCode(92));
  const posix = "/home/u/repo/dist/bundle.js";
  assert.equal(isScratchPath(win), true, "đường Windows phải bị bắt");
  assert.equal(isScratchPath(posix), true, "đường POSIX cũng phải bị bắt");
  assert.equal(isScratchPath(["D:", "repo", "src", "app.ts"].join(String.fromCharCode(92))), false, "mã nguồn thật KHÔNG bị loại");
});

test("làn `picked`: người tự đưa tệp vào kho — hàng KHÔNG có tin gốc, dedup theo sha256", (t) => {
  const dir = tempDir(t, "zpick-db-");
  const root = tempDir(t, "zpick-files-");
  const src = tempDir(t, "zpick-src-");
  const db = openMemory(join(dir, "global_memory.db"));
  const body = Buffer.from("noi-dung-nguoi-dung-tu-them");
  const p1 = join(src, "bao-cao.pdf");
  writeFileSync(p1, body);

  const r = addPickedFiles([{ path: p1 }], { db, root });
  assert.equal(r.added, 1);
  assert.equal(r.bytes, body.length);
  assert.equal(r.failed.length, 0);
  assert.equal(r.rels[0].split("/")[0], "documents", "phân hạng theo mime, không theo chỗ lấy");

  const row = db.prepare("SELECT message_id, session_id, kind, name, mime, sha256, src_path FROM attachment").get();
  // Schema khai hai cột này NOT NULL, nên làn picked mang NHÃN thay vì NULL. `message_id = 0`
  // không trỏ vào tin nào (khoá tự tăng bắt đầu từ 1) — tệp người dùng không bám nhầm tin ai.
  assert.equal(row.message_id, 0, "làn picked KHÔNG đến từ tin nào");
  assert.equal(row.session_id, PICKED_SESSION);
  assert.equal(row.kind, "blob");
  assert.equal(row.name, "bao-cao.pdf");
  assert.equal(row.mime, "application/pdf");
  assert.equal(row.sha256, sha(body));
  assert.equal(readFileSync(join(root, ...row.src_path.split("/"))).toString(), body.toString());
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment_link").get().n, 0, "không có liên kết nào để tạo");

  // Bề mặt đọc phải hiện nó, và phải nói rõ là KHÔNG có tin để nhảy về.
  const listed = listFiles({ db });
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0].messageId, null);
  assert.equal(listed.items[0].fetched, true);

  // Cùng nội dung đưa lần hai (đổi cả tên) ⇒ KHÔNG đẻ hàng thứ hai, KHÔNG chép tệp lần nữa.
  const p2 = join(src, "ban-sao.pdf");
  writeFileSync(p2, body);
  const again = addPickedFiles([{ path: p2 }], { db, root });
  assert.equal(again.added, 0);
  assert.equal(again.already, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment").get().n, 1);

  // Ca ÂM: không có cú đưa nào ⇒ không ghi gì (hàm KHÔNG tự quét thư mục).
  const none = addPickedFiles([], { db, root });
  assert.equal(none.added, 0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment").get().n, 1);

  // Ca ÂM: đường dẫn không tồn tại / tệp rỗng ⇒ báo lý do, không ném, không ghi hàng.
  writeFileSync(join(src, "rong.txt"), "");
  const bad = addPickedFiles([{ path: join(src, "khong-co.png") }, { path: join(src, "rong.txt") }], { db, root });
  assert.equal(bad.added, 0);
  assert.equal(bad.failed.length, 2);
  assert.match(bad.failed[1].reason, /rỗng/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment").get().n, 1);
  db.close();
});

test("ca ÂM — dọn mồ côi KHÔNG được xoá làn `picked` (nó vĩnh viễn không có liên kết)", async (t) => {
  const { pruneOrphanAttachments } = await import("../../dist/memory/attachments.js");
  const dir = tempDir(t, "zpick2-db-");
  const root = tempDir(t, "zpick2-files-");
  const src = tempDir(t, "zpick2-src-");
  const dbPath = join(dir, "global_memory.db");
  const db = openMemory(dbPath);
  // Một hàng picked (không liên kết, theo thiết kế) + một hàng mồ côi THẬT (link trỏ tin đã chết).
  const p = join(src, "cua-toi.png");
  writeFileSync(p, Buffer.from("anh-nguoi-dung-tu-them"));
  addPickedFiles([{ path: p }], { db, root });
  db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, blob, created_at)
     VALUES (999, 's-chet', 'mo-coi.png', 'image/png', 3, 'f'||substr(hex(randomblob(32)),1,63), 'blob', x'000102', '2026-09-15T00:00:00Z')`,
  ).run();
  db.close();

  const r = pruneOrphanAttachments(dbPath, { dropUnlinked: true });
  const db2 = openMemory(dbPath);
  const left = db2.prepare("SELECT session_id FROM attachment").all().map((x) => x.session_id);
  assert.equal(r.rows, 1, "chỉ hàng mồ côi thật bị dọn");
  assert.deepEqual(left, [PICKED_SESSION], "tệp người dùng tự thêm PHẢI còn nguyên");
  db2.close();
});
