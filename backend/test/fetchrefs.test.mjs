// Tải byte cho hàng `ref` (plan/23 §2 · plan/25 ④) — trả khoản nợ 3.223 hàng của `chatgpt-web`.
//
// Đường THẬT cần một cửa sổ trình duyệt đã đăng nhập (đo 2026-09-15: Node tải thẳng URL đã ký
// vẫn nhận 403), thứ không dựng được trong cổng. Nên cách lấy byte là một hàm TIÊM ĐƯỢC, và
// cổng soi đúng phần đáng soi — thứ tự ghi, phép kiểm, và những ca mà hỏng thì IM LẶNG:
//  ① byte về phải khớp sha256 ĐỌC LẠI TỪ ĐĨA trước khi hàng DB được sửa;
//  ② chạy lại KHÔNG tải lại thứ đã có (lượt 3.223 tệp sẽ bị ngắt giữa chừng, đó là chuyện thường);
//  ③ ca ÂM: dry-run KHÔNG được ghi một byte nào;
//  ④ ca ÂM: nội dung trùng một hàng sẵn có ⇒ DỪNG, không tự gộp, không tự xoá (`sha256` UNIQUE);
//  ⑤ ca ÂM: con trỏ lược đồ lạ ⇒ báo lý do, KHÔNG đoán và KHÔNG ném.
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { fetchRefs, fileIdOf, chatgptRefFetcher } from "../../dist/memory/fetchrefs.js";
import { tempDir } from "./helpers.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");
const ptrSha = (ptr) => sha(Buffer.from("asset:" + ptr)); // đúng công thức `_shared.fileAttachment`

/** Kho có N hàng `ref` (con trỏ, chưa có byte) + tuỳ chọn vài hàng `blob` đã có sẵn. */
function seed(t, refs, blobs = []) {
  const dir = tempDir(t, "zfr-db-");
  const root = tempDir(t, "zfr-files-");
  const db = openMemory(join(dir, "global_memory.db"));
  db.prepare("INSERT INTO sessions (id, source, origin) VALUES ('s1','chatgpt-web','web')").run();
  const insMsg = db.prepare("INSERT INTO messages (session_id, uuid, role, content) VALUES ('s1',?,?,?)");
  const insRef = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
     VALUES (?,?,NULL,'image/*',?,?,'ref',?,?)`,
  );
  const insBlob = db.prepare(
    `INSERT INTO attachment (message_id, session_id, name, mime, bytes, sha256, kind, src_path, created_at)
     VALUES (?,?,?,?,?,?,'blob',?,?)`,
  );
  const insLink = db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)");
  const made = [];
  refs.forEach((r, i) => {
    const mid = Number(insMsg.run("u" + i, "user", `[image] tin ${i}`).lastInsertRowid);
    const aid = Number(
      insRef.run(mid, "s1", r.declaredBytes ?? 999, ptrSha(r.ptr), r.ptr, "2026-09-14T10:00:00Z").lastInsertRowid,
    );
    insLink.run(mid, aid);
    made.push({ aid, mid, ptr: r.ptr });
  });
  blobs.forEach((b, i) => {
    const mid = Number(insMsg.run("b" + i, "user", "[image] san co").lastInsertRowid);
    insBlob.run(mid, "s1", b.name ?? "cu.png", "image/png", b.body.length, sha(b.body), b.rel, "2026-09-14T10:00:00Z");
  });
  return { db, root, made };
}

/** Đường lấy byte GIẢ: trả đúng nội dung đã hẹn, đếm số lượt gọi để đo "có tải lại không". */
function fakeFetcher(map, calls = []) {
  return async (fileId) => {
    calls.push(fileId);
    const hit = map[fileId];
    if (!hit) throw new Error("nền không có tệp này");
    return { bytes: hit.bytes, name: hit.name ?? null, mime: hit.mime ?? null };
  };
}

test("bóc file id: nhận hai lược đồ đã ĐO, mọi thứ khác trả null thay vì đoán", () => {
  assert.equal(fileIdOf("sediment://file_abc123"), "file_abc123");
  assert.equal(fileIdOf("file-service://file_xyz"), "file_xyz");
  assert.equal(fileIdOf("https://example.com/a.png"), null);
  assert.equal(fileIdOf(null), null);
});

test("tải về: byte ra đĩa đúng sha, hàng thành blob và NHẬN tên gốc + mime thật của nền", async (t) => {
  const body = Buffer.from("PNG-noi-dung-that");
  const { db, root, made } = seed(t, [{ ptr: "sediment://file_a", declaredBytes: 7900654 }]);
  const r = await fetchRefs({
    db,
    root,
    delayMs: 0,
    fetcher: fakeFetcher({ file_a: { bytes: body, name: "anh-goc.png", mime: "image/png" } }),
  });

  assert.equal(r.fetched, 1, "phải tải đúng một tệp");
  assert.equal(r.bytes, body.length, "đếm BYTE THẬT, không phải số khai trong kho");
  assert.equal(r.failed.length, 0);
  assert.equal(r.remaining, 0, "hết hàng ref");

  const row = db.prepare("SELECT kind, sha256, bytes, mime, name, src_path FROM attachment WHERE id = ?").get(made[0].aid);
  assert.equal(row.kind, "blob");
  assert.equal(row.sha256, sha(body), "sha256 phải là hash NỘI DUNG, không còn là hash con trỏ");
  assert.equal(row.bytes, body.length, "kho khai 7,9 MB nhưng nền trả ít hơn — hàng phải theo số thật");
  assert.equal(row.mime, "image/png", "mime thật thay cho nhãn hạng image/*");
  assert.equal(row.name, "anh-goc.png", "tên gốc của nền phải được ghi lại (kho đang giữ null)");
  assert.ok(!/^[a-z][a-z0-9+.-]*:\/\//i.test(row.src_path), "src_path nay là ĐƯỜNG TỆP, không còn là URL");
  assert.equal(readFileSync(join(root, ...row.src_path.split("/"))).toString(), body.toString());
  db.close();
});

test("chạy lại lượt bị ngắt: tệp đã có thì KHÔNG tải lại (ca ÂM đo bằng số lượt gọi nền)", async (t) => {
  const body = Buffer.from("noi-dung-lap-lai");
  const calls = [];
  const { db, root, made } = seed(t, [{ ptr: "sediment://file_a" }]);
  const map = { file_a: { bytes: body, name: "x.png", mime: "image/png" } };

  const first = await fetchRefs({ db, root, delayMs: 0, fetcher: fakeFetcher(map, calls) });
  assert.equal(first.fetched, 1);
  assert.equal(calls.length, 1);

  // Hàng đã thành `blob` nên lượt sau không chọn nó nữa — trạng thái nằm TRÊN HÀNG, không cần sổ riêng.
  const second = await fetchRefs({ db, root, delayMs: 0, fetcher: fakeFetcher(map, calls) });
  assert.equal(second.fetched, 0, "không tải lại");
  assert.equal(calls.length, 1, "KHÔNG gọi nền thêm lần nào");

  // Và ca thật hay gặp hơn: hàng vẫn là `ref` (lượt trước chết SAU khi ghi tệp, TRƯỚC khi sửa DB).
  db.prepare("UPDATE attachment SET kind='ref', sha256=?, src_path=? WHERE id=?")
    .run(ptrSha("sediment://file_a"), "sediment://file_a", made[0].aid);
  const third = await fetchRefs({ db, root, delayMs: 0, fetcher: fakeFetcher(map, calls) });
  assert.equal(third.skipped, 1, "tệp đúng nội dung đã nằm sẵn ⇒ bỏ qua, chỉ sửa lại hàng");
  assert.equal(third.fetched, 0);
  const row = db.prepare("SELECT kind FROM attachment WHERE id = ?").get(made[0].aid);
  assert.equal(row.kind, "blob", "hàng được chữa lại cho khớp đĩa");
  db.close();
});

test("ca ÂM — dry-run: không ghi một byte nào, không đụng hàng nào", async (t) => {
  const { db, root, made } = seed(t, [{ ptr: "sediment://file_a" }]);
  const calls = [];
  const r = await fetchRefs({
    db,
    root,
    delayMs: 0,
    dryRun: true,
    fetcher: fakeFetcher({ file_a: { bytes: Buffer.from("x") } }, calls),
  });
  assert.equal(r.dryRun, true);
  assert.equal(r.fetched, 0);
  assert.equal(calls.length, 0, "dry-run KHÔNG được gọi nền");
  assert.equal(readdirSync(root).length, 0, "không tệp nào được ghi");
  assert.equal(db.prepare("SELECT kind FROM attachment WHERE id=?").get(made[0].aid).kind, "ref");

  // Thiếu đường lấy byte ⇒ TỰ ĐỘNG thành dry-run, không bịa một đường tải nào.
  const noFetcher = await fetchRefs({ db, root, delayMs: 0 });
  assert.equal(noFetcher.dryRun, true);
  assert.equal(noFetcher.remaining, 1);
  db.close();
});

test("ca ÂM — nội dung trùng hàng sẵn có: DỪNG, không ghi tệp, không tự gộp/xoá", async (t) => {
  const body = Buffer.from("anh-nay-da-co-trong-kho");
  const { db, root, made } = seed(t, [{ ptr: "sediment://file_a" }], [{ body, rel: "images/2026-09/cu.png" }]);
  const before = db.prepare("SELECT COUNT(*) n FROM attachment").get().n;

  const r = await fetchRefs({ db, root, delayMs: 0, fetcher: fakeFetcher({ file_a: { bytes: body } }) });

  assert.equal(r.fetched, 0);
  assert.equal(r.failed.length, 1);
  assert.match(r.failed[0].reason, /trùng hàng #\d+/);
  assert.equal(readdirSync(root).length, 0, "không được ghi tệp mồ côi ra đĩa");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM attachment").get().n, before, "không xoá hàng nào");
  assert.equal(db.prepare("SELECT kind FROM attachment WHERE id=?").get(made[0].aid).kind, "ref", "hàng giữ nguyên");
  db.close();
});

test("ca ÂM — con trỏ lạ và nền trả rỗng: báo lý do, không ném, lượt vẫn chạy tiếp", async (t) => {
  const body = Buffer.from("ok");
  const { db, root } = seed(t, [
    { ptr: "https://example.com/a.png" },
    { ptr: "sediment://file_rong" },
    { ptr: "sediment://file_ok" },
  ]);
  const r = await fetchRefs({
    db,
    root,
    delayMs: 0,
    fetcher: fakeFetcher({ file_rong: { bytes: Buffer.alloc(0) }, file_ok: { bytes: body } }),
  });
  assert.equal(r.fetched, 1, "hàng lành vẫn xong dù hai hàng trước hỏng");
  assert.equal(r.failed.length, 2);
  assert.match(r.failed[0].reason, /lược đồ con trỏ lạ/);
  assert.match(r.failed[1].reason, /0 byte/);
  assert.equal(r.remaining, 2, "hai hàng hỏng vẫn là nợ, không bị đánh dấu xong");
  db.close();
});

test("nhóm gizmo: 403 ở đường thường ⇒ ĐỔI ĐƯỜNG kèm gizmo_id, và chỉ hỏi id MỘT lần mỗi hội thoại", async () => {
  const body = Buffer.from("anh-trong-project");
  const b64 = body.toString("base64");
  const seen = [];
  const page = {
    evaluate: async (expr) => {
      seen.push(expr);
      if (expr.includes("/backend-api/conversation/")) return { gizmo: "g-p-abc123" };
      // Đường THƯỜNG: nền từ chối đúng nhóm này (đo thật: use_case=gizmo · direct_get_only=true).
      if (expr.includes("/download'") && !expr.includes("gizmo_id")) return { err: "HTTP 403", status: 403 };
      if (expr.includes("gizmo_id=g-p-abc123")) return { b64, sha: sha(body), bytes: body.length, name: "p.png", mime: "image/png" };
      return { err: "đường lạ" };
    },
  };
  const fetcher = chatgptRefFetcher(page);
  const row = { session_id: "chatgpt-6a686d38-8274-83ec-a52e-29f5aff8bf19" };

  const a = await fetcher("file_x", row);
  assert.equal(a.bytes.toString(), body.toString(), "phải lấy được qua đường gizmo");
  const b = await fetcher("file_y", row);
  assert.equal(b.bytes.toString(), body.toString());

  const asked = seen.filter((e) => e.includes("/backend-api/conversation/")).length;
  assert.equal(asked, 1, "gizmo_id của cùng một hội thoại chỉ được hỏi MỘT lần");

  // Ca ÂM: không biết hội thoại ⇒ không có gì để đổi đường ⇒ báo đúng lỗi gốc, KHÔNG đoán id.
  await assert.rejects(() => fetcher("file_z", { session_id: null }), /HTTP 403/);
});

test("đường hỏng giữa chừng: DỪNG SỚM và nói lý do, thay vì đập đầu qua phần còn lại", async (t) => {
  // Sự cố thật 2026-09-15: lượt chạy chết ở tệp 1.100/3.119 (mã thoát 13). Lỗi RẢI RÁC là
  // bình thường; lỗi LIÊN TIẾP nghĩa là ĐƯỜNG hỏng — cửa sổ bị đóng, phiên hết hạn.
  const refs = [];
  for (let i = 0; i < 40; i++) refs.push({ ptr: "sediment://file_" + i });
  const { db, root } = seed(t, refs);
  let calls = 0;
  const dead = async () => {
    calls++;
    throw new Error("CDP socket dead");
  };
  const r = await fetchRefs({ db, root, delayMs: 0, fetcher: dead });
  assert.ok(r.stoppedEarly, "phải NÓI là đã dừng sớm, không im lặng trả về như đã đi hết");
  assert.match(r.stoppedEarly, /liên tiếp/);
  assert.ok(calls <= 21, `dừng sau ~20 lỗi liên tiếp, không gọi hết 40 (đã gọi ${calls})`);
  assert.equal(r.remaining, 40, "không hàng nào bị đánh dấu xong — chạy lại là tiếp");
  db.close();
});

test("ca ÂM — chuỗi lỗi NỘI DUNG (trùng/404) KHÔNG được làm dừng lượt", async (t) => {
  // Sự cố thật 2026-09-15, ngay lượt sau khi thêm chốt: hàng lỗi TÍCH TỤ Ở ĐẦU danh sách
  // (tải được thì rời danh sách, hỏng thì ở lại), nên một cụm "nội dung trùng" làm mọi lượt
  // sau dừng ngay khi vừa bắt đầu. Chốt phải phân biệt ĐƯỜNG hỏng với TỆP hỏng.
  const refs = [];
  for (let i = 0; i < 40; i++) refs.push({ ptr: "sediment://file_" + i });
  const { db, root } = seed(t, refs);
  let n = 0;
  const contentErrors = async () => {
    n++;
    if (n <= 25) throw new Error("HTTP 404"); // 25 lỗi LIÊN TIẾP, nhưng là lỗi của TỆP
    return { bytes: Buffer.from("ok-" + n), name: null, mime: "image/png" };
  };
  const r = await fetchRefs({ db, root, delayMs: 0, fetcher: contentErrors });
  assert.equal(r.stoppedEarly, undefined, "404 liên tiếp KHÔNG phải đường hỏng ⇒ không được dừng");
  assert.equal(r.fetched, 15, "phần lành phía sau vẫn phải tải được");
  db.close();
});

test("ca ÂM — lỗi RẢI RÁC không được làm dừng lượt", async (t) => {
  const body = Buffer.from("ok");
  const refs = [];
  for (let i = 0; i < 40; i++) refs.push({ ptr: "sediment://file_" + i });
  const { db, root } = seed(t, refs);
  // Cứ 3 tệp hỏng 1 — chuỗi lỗi không bao giờ đạt ngưỡng, nên lượt phải đi hết.
  let n = 0;
  const flaky = async () => {
    if (n++ % 3 === 0) throw new Error("HTTP 404");
    return { bytes: Buffer.concat([body, Buffer.from(String(n))]), name: null, mime: "image/png" };
  };
  const r = await fetchRefs({ db, root, delayMs: 0, fetcher: flaky });
  assert.equal(r.stoppedEarly, undefined, "lỗi rải rác KHÔNG được dừng lượt");
  assert.ok(r.fetched > 20, `phải tải được phần lành (đã tải ${r.fetched})`);
  db.close();
});

test("đường lấy byte thật: trang tự băm — lệch một bên là NÉM, không âm thầm ghi", async () => {
  const body = Buffer.from("noi-dung");
  const b64 = body.toString("base64");
  const good = chatgptRefFetcher({ evaluate: async () => ({ b64, sha: sha(body), bytes: body.length, name: "a.png", mime: "image/png" }) });
  const got = await good("file_abc");
  assert.equal(got.bytes.toString(), body.toString());

  // Cùng số byte, sai nội dung: so ĐỘ DÀI không bắt được, phải so sha (luật kiểm chéo).
  const bad = chatgptRefFetcher({ evaluate: async () => ({ b64, sha: sha(Buffer.from("khac")), bytes: body.length }) });
  await assert.rejects(() => bad("file_abc"), /byte hỏng trên đường về/);

  const erred = chatgptRefFetcher({ evaluate: async () => ({ err: "chưa đăng nhập" }) });
  await assert.rejects(() => erred("file_abc"), /chưa đăng nhập/);

  // Id lạ không bao giờ được ghép vào biểu thức chạy trong trang.
  const never = chatgptRefFetcher({ evaluate: async () => assert.fail("không được chạy gì") });
  await assert.rejects(() => never("file_abc'); alert(1); ('"), /file id lạ/);
});
