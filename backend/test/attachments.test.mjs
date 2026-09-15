// Lớp đính kèm — từ block trong transcript tới thumbnail trên màn Recall.
//
// Trọng tâm KHÔNG phải "chạy được không" (dễ), mà là ba chỗ đã trả giá thật:
//  ① `attachment.message_id` KHÔNG phải ánh xạ đầy đủ — dedup theo sha256 nên nó chỉ giữ
//     tin ĐẦU TIÊN. Đo trên DB thật 2026-07-28: 566 tin vs 724 tin qua `attachment_link`
//     ⇒ đọc nhầm cột là mất 22% số tin có ảnh.
//  ② Base64 KHÔNG được lọt vào `messages.content` (thổi FTS5 mà không tìm được gì).
//  ③ Block ảnh bị bỏ IM LẶNG — chính là lỗi đã làm mất 93 MB ở lớp Claude Code; giờ cả
//     5 adapter phải cùng nhận ra, nên test chạy VÒNG QUA TỪNG adapter, không chỉ một cái.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { imageAttachment, fileAttachment, imageLabel, MAX_BLOB_BYTES } from "../../dist/memory/adapters/_shared.js";
import { attachmentBlob, attachmentsFor, attachmentStats } from "../../dist/memory/attachments.js";
import { openMemory } from "../../dist/memory/db.js";
import { tempDir } from "./helpers.mjs";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"); // 16 byte đầu của một PNG
const PNG_B64 = PNG.toString("base64");
const PNG_SHA = createHash("sha256").update(PNG).digest("hex");

// ── ① Bộ đọc block dùng chung ────────────────────────────────────────────────

test("the three DECLARED shapes are read, and only those three", () => {
  const anthropic = imageAttachment({ type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } });
  assert.equal(anthropic.kind, "blob");
  assert.equal(anthropic.mime, "image/png");
  assert.equal(anthropic.sha256, PNG_SHA);
  assert.ok(anthropic.blob.equals(PNG), "bytes phải nguyên vẹn, không qua chuyển đổi nào");

  const openai = imageAttachment({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${PNG_B64}` } });
  assert.equal(openai.kind, "blob");
  assert.equal(openai.mime, "image/jpeg");
  assert.equal(openai.sha256, PNG_SHA, "cùng bytes ⇒ cùng sha ⇒ dedup về một hàng dù đến từ nền khác");

  // ChatGPT export chỉ có CON TRỎ, không có bytes ⇒ ghi nhận, không giả vờ có nội dung.
  const ptr = imageAttachment({ content_type: "image_asset_pointer", asset_pointer: "file-service://file-abc", size_bytes: 4096 });
  assert.equal(ptr.kind, "ref");
  assert.equal(ptr.srcPath, "file-service://file-abc");
  assert.equal(ptr.bytes, 4096);
  assert.equal(ptr.blob, undefined, "kind=ref thì TUYỆT ĐỐI không kèm bytes");

  // Hình dạng lạ ⇒ null, KHÔNG đoán bừa (đoán sai còn tệ hơn bỏ qua).
  assert.equal(imageAttachment({ type: "text", text: "chỉ là chữ" }), null);
  assert.equal(imageAttachment({ type: "image", source: { type: "url", url: "https://x/y.png" } }), null);
  assert.equal(imageAttachment(null), null);
  assert.equal(imageAttachment("chuỗi"), null);
});

test("over the cap it is demoted to 'ref', never dropped silently", () => {
  const big = Buffer.alloc(MAX_BLOB_BYTES + 1, 7);
  const a = imageAttachment({ type: "image", source: { type: "base64", media_type: "image/png", data: big.toString("base64") } });
  assert.equal(a.kind, "ref");
  assert.equal(a.bytes, big.length, "vẫn phải ghi đúng kích thước thật");
  assert.equal(a.blob, undefined);
});

test("the label left in content carries mime - KB - sha12 (the FE matches label to blob by sha prefix)", () => {
  const a = imageAttachment({ type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } });
  const label = imageLabel(a);
  assert.match(label, /^\[image:image\/png \d+KB [0-9a-f]{12}\]$/);
  assert.ok(label.includes(PNG_SHA.slice(0, 12)));
  assert.ok(!label.includes(PNG_B64), "nhãn KHÔNG được mang base64");
});

// ── ② Cả 5 adapter phải cùng nhận ra ảnh ─────────────────────────────────────

/** Mỗi adapter: [tên, dựng file transcript, đọc ra danh sách message]. */
const CASES = [
  {
    name: "claude-code",
    async build() {
      const { claudeAdapter } = await import("../../dist/memory/adapters/claude.js");
      const line = {
        type: "user", uuid: "u1", timestamp: "2026-07-28T01:00:00Z",
        message: { role: "user", content: [{ type: "text", text: "xem ảnh này" }, { type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } }] },
      };
      const r = claudeAdapter.parseLine(JSON.stringify(line));
      return r?.kind === "message" ? [r.msg] : [];
    },
  },
  {
    name: "codex",
    async build() {
      const { codexAdapter } = await import("../../dist/memory/adapters/codex.js");
      const line = {
        type: "response_item", timestamp: "2026-07-28T01:00:00Z",
        payload: { type: "message", role: "user", id: "c1", content: [{ type: "input_text", text: "ảnh:" }, { type: "image_url", image_url: { url: `data:image/png;base64,${PNG_B64}` } }] },
      };
      const r = codexAdapter.parseLine(JSON.stringify(line));
      return r?.kind === "message" ? [r.msg] : [];
    },
  },
  {
    name: "chatgpt-web",
    async build(t) {
      const { chatgptAdapter } = await import("../../dist/memory/adapters/chatgpt.js");
      const dir = tempDir(t, "zemory-att-gpt-");
      const f = join(dir, "conversations.json");
      writeFileSync(f, JSON.stringify([{
        conversation_id: "g1", title: "có ảnh", current_node: "n1",
        mapping: { n1: { message: { author: { role: "user" }, create_time: 1782985802, content: { parts: ["nhìn đi", { content_type: "image_asset_pointer", asset_pointer: "file-service://file-xyz", size_bytes: 2048 }] } }, parent: null, children: [] } },
      }]));
      const sessions = chatgptAdapter.parseFileMulti(f);
      return sessions?.[0]?.messages ?? [];
    },
  },
  {
    name: "claude-web",
    async build(t) {
      const { claudeWebAdapter } = await import("../../dist/memory/adapters/claudeweb.js");
      const dir = tempDir(t, "zemory-att-cweb-");
      const f = join(dir, "claude.json");
      writeFileSync(f, JSON.stringify([{
        uuid: "cw1", name: "có ảnh", created_at: "2026-07-28T01:00:00Z",
        chat_messages: [{ uuid: "m1", sender: "human", created_at: "2026-07-28T01:00:00Z", content: [{ type: "text", text: "ảnh nè" }, { type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } }] }],
      }]));
      const sessions = claudeWebAdapter.parseFileMulti(f);
      return sessions?.[0]?.messages ?? [];
    },
  },
  {
    name: "continue",
    async build(t) {
      const { continueAdapter } = await import("../../dist/memory/adapters/continue.js");
      const dir = tempDir(t, "zemory-att-cont-");
      const f = join(dir, "s.json");
      writeFileSync(f, JSON.stringify({
        sessionId: "s1", title: "có ảnh",
        history: [{ message: { id: "m1", role: "user", content: [{ type: "text", text: "ảnh" }, { type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } }] } }],
      }));
      return continueAdapter.parseFile(f)?.messages ?? [];
    },
  },
  {
    name: "lmstudio",
    async build(t) {
      const { lmstudioAdapter } = await import("../../dist/memory/adapters/lmstudio.js");
      const dir = tempDir(t, "zemory-att-lms-");
      const f = join(dir, "c.conversation.json");
      writeFileSync(f, JSON.stringify({
        name: "có ảnh", createdAt: 1782985802000,
        messages: [{ currentlySelected: 0, versions: [{ role: "user", content: [{ type: "text", text: "ảnh" }, { type: "image", source: { type: "base64", media_type: "image/png", data: PNG_B64 } }] }] }],
      }));
      return lmstudioAdapter.parseFile(f)?.messages ?? [];
    },
  },
];

for (const c of CASES) {
  test(`adapter ${c.name}: block ảnh ra ĐÍNH KÈM, base64 KHÔNG lọt vào content`, async (t) => {
    const msgs = await c.build(t);
    assert.ok(msgs.length, `${c.name}: phải parse ra ít nhất một message`);
    const withAtt = msgs.filter((m) => m.attachments?.length);
    assert.equal(withAtt.length, 1, `${c.name}: đúng một message mang đính kèm`);
    const [m] = withAtt;
    assert.ok(!m.content.includes(PNG_B64), `${c.name}: base64 KHÔNG được nằm trong content (thổi FTS5)`);
    assert.match(m.content, /\[image:/, `${c.name}: phải để lại nhãn để FTS còn tìm được`);
    const a = m.attachments[0];
    // chatgpt export không có bytes ⇒ 'ref'; các nền còn lại có base64 ⇒ 'blob'.
    if (c.name === "chatgpt-web") assert.equal(a.kind, "ref");
    else {
      assert.equal(a.kind, "blob");
      assert.equal(a.sha256, PNG_SHA, `${c.name}: cùng ảnh ⇒ cùng sha256 ⇒ dedup xuyên nền`);
    }
  });
}

// ── ③ Đọc ra khỏi DB: ánh xạ phải đi qua attachment_link ─────────────────────

/** DB tối thiểu: 1 phiên, 2 tin, MỘT nội dung ảnh dùng chung cho cả hai tin. */
function seed(t) {
  const dir = tempDir(t, "zemory-attdb-");
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "m.db");
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, host, project_root, title) VALUES (?,?,?,?,?)")
    .run("s1", "claude-code", "h", "/p", "t");
  const ins = db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
  const m1 = ins.run("s1", "u1", "user", `nhìn ${imageLabel({ mime: "image/png", bytes: PNG.length, sha256: PNG_SHA })}`, "2026-07-28T01:00:00Z").lastInsertRowid;
  const m2 = ins.run("s1", "u2", "user", "cũng ảnh đó", "2026-07-28T01:01:00Z").lastInsertRowid;
  // Dedup: MỘT hàng nội dung (message_id = tin đầu tiên) + HAI liên kết.
  const aid = db.prepare("INSERT INTO attachment (message_id, session_id, mime, bytes, sha256, kind, blob) VALUES (?,?,?,?,?,?,?)")
    .run(m1, "s1", "image/png", PNG.length, PNG_SHA, "blob", PNG).lastInsertRowid;
  const link = db.prepare("INSERT INTO attachment_link (message_id, attachment_id) VALUES (?,?)");
  link.run(m1, aid);
  link.run(m2, aid);
  db.close();
  return { dbPath, m1: Number(m1), m2: Number(m2) };
}

test("attachmentsFor goes through attachment_link - the SECOND message must see the image too", (t) => {
  const { dbPath, m1, m2 } = seed(t);
  const map = attachmentsFor([m1, m2], dbPath);
  assert.equal(map[m1]?.length, 1);
  assert.equal(map[m2]?.length, 1, "đọc theo attachment.message_id sẽ TRƯỢT tin này — chính là chỗ mất 22%");
  assert.equal(map[m1][0].sha256, PNG_SHA);
  assert.equal(map[m1][0].blob, undefined, "payload chỉ mang metadata, KHÔNG kèm bytes");
});

test("attachmentsFor: an empty list or a non-existent id yields empty, it does not throw", (t) => {
  const { dbPath } = seed(t);
  assert.deepEqual(attachmentsFor([], dbPath), {});
  assert.deepEqual(attachmentsFor([999999], dbPath), {});
});

test("attachmentBlob returns the right bytes; a malformed sha is blocked BEFORE touching SQL", (t) => {
  const { dbPath } = seed(t);
  const got = attachmentBlob(PNG_SHA, dbPath);
  assert.ok(got.bytes.equals(PNG), "phải byte-for-byte, không mất mát");
  assert.equal(got.mime, "image/png");
  for (const bad of ["", "deadbeef", "../../etc/passwd", "'; DROP TABLE attachment;--", PNG_SHA.toUpperCase()]) {
    assert.equal(attachmentBlob(bad, dbPath), null, `sha không hợp lệ phải trả null: ${bad}`);
  }
});

test("attachmentStats counts ORPHAN rows (whole-replace deleted the message, the attachment row stayed)", (t) => {
  const { dbPath, m2 } = seed(t);
  let s = attachmentStats(dbPath);
  assert.equal(s.live, 1);
  assert.equal(s.orphanRows, 0);
  assert.equal(s.orphanLinks, 0);

  // Mô phỏng đúng cái đã xảy ra trên DB thật: xoá tin, hàng đính kèm không ai dọn.
  const db = openMemory(dbPath);
  db.prepare("DELETE FROM messages WHERE id = ?").run(m2);
  db.close();
  s = attachmentStats(dbPath);
  assert.equal(s.orphanLinks, 1, "link trỏ tin đã xoá phải ĐẾM ĐƯỢC, không im lặng");
  assert.equal(s.live, 1, "nội dung vẫn sống vì tin còn lại vẫn trỏ tới nó");
});

// ── ④ TÊN FILE ───────────────────────────────────────────────────────────────
//
// Đo 2026-07-28 trên 378 transcript thật: 889 block ảnh, KHÔNG block nào mang tên —
// Claude Code không ghi tên cho ảnh dán/chụp màn hình. Chỗ DUY NHẤT có tên thật là ảnh
// do tool `Read` đọc từ file trên đĩa, và tên nằm ở LỜI GỌI tool (`input.file_path`),
// không nằm cùng chỗ với ảnh ⇒ phải ghép ngược qua `tool_use_id` (đo: 166/166 ghép trúng).

test("an image from the Read tool: joining back on tool_use_id recovers the ORIGINAL NAME", async () => {
  const { claudeAdapter } = await import("../../dist/memory/adapters/claude.js");
  // Lượt assistant gọi Read — chỉ ở đây mới có đường dẫn.
  claudeAdapter.parseLine(JSON.stringify({
    type: "assistant", uuid: "a1", timestamp: "2026-07-28T02:00:00Z",
    message: { role: "assistant", content: [{ type: "tool_use", id: "toolu_01", name: "Read", input: { file_path: String.raw`D:\anh\layout_white.png` } }] },
  }));
  // Kết quả tool: ảnh nằm ở toolUseResult, NGOÀI message.content.
  const r = claudeAdapter.parseLine(JSON.stringify({
    type: "user", uuid: "u9", timestamp: "2026-07-28T02:00:01Z", tool_use_id: "toolu_01",
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_01", content: "ảnh đây" }] },
    toolUseResult: { type: "image", file: { base64: PNG_B64, type: "image/png", originalSize: PNG.length } },
  }));
  assert.equal(r.kind, "message");
  const a = r.msg.attachments?.[0];
  assert.ok(a, "ảnh ở toolUseResult phải được nạp — trước đây flatten() không bao giờ thấy nó");
  assert.equal(a.name, "layout_white.png");
  assert.equal(a.srcPath, String.raw`D:\anh\layout_white.png`);
  assert.equal(a.kind, "blob");
  assert.match(r.msg.content, /\[image:/, "vẫn để lại nhãn cho FTS");
  assert.ok(!r.msg.content.includes(PNG_B64), "base64 KHÔNG lọt vào content");
});

test("when tool_use_id cannot be joined the image still loads, just without a name (convenience lost, data kept)", async () => {
  const { claudeAdapter } = await import("../../dist/memory/adapters/claude.js");
  const r = claudeAdapter.parseLine(JSON.stringify({
    type: "user", uuid: "u10", timestamp: "2026-07-28T02:00:02Z", tool_use_id: "toolu_khong_ton_tai",
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_khong_ton_tai", content: "x" }] },
    toolUseResult: { type: "image", file: { base64: PNG_B64, type: "image/png" } },
  }));
  assert.equal(r.kind, "message");
  assert.equal(r.msg.attachments?.length, 1);
  assert.equal(r.msg.attachments[0].name, undefined);
});

test("download name: use the original when there is one; otherwise emit OUR OWN name with date + sha, never a fabricated 'original'", (t) => {
  const { dbPath } = seed(t);
  const got = attachmentBlob(PNG_SHA, dbPath);
  // Hàng trong seed() không có `name` ⇒ phải rơi về tên dự phòng, KHÔNG phải "attachment".
  assert.match(got.name, /^zemory-2026-07-28-[0-9a-f]{8}\.png$/, `tên dự phòng sai: ${got.name}`);
  assert.ok(!got.name.includes("attachment"), "đúng cái tên vô nghĩa mà trình duyệt tự đặt");

  // Có tên gốc ⇒ dùng nguyên, nhưng ký tự đường dẫn phải bị lọc (header + tên file an toàn).
  const db = openMemory(dbPath);
  db.prepare("UPDATE attachment SET name = ? WHERE sha256 = ?").run(String.raw`a/b\c:"d"|e?.png`, PNG_SHA);
  db.close();
  const named = attachmentBlob(PNG_SHA, dbPath);
  const banned = ['"', "*", ":", "<", ">", "?", "|", "/", String.fromCharCode(92)];
  for (const ch of banned) {
    assert.ok(!named.name.includes(ch), `tên còn ký tự cấm ${ch}: ${named.name}`);
  }
  assert.match(named.name, /\.png$/);
});

// ── ⑤ L3: chở đính kèm qua bundle sync (plan 08 §7 bước ③) ───────────────────
//
// Điểm dễ sai nhất: `messages.id` là AUTOINCREMENT CỤC BỘ và cố ý KHÔNG đi theo bundle
// (merge khoá trên UNIQUE(session_id,uuid)). Chở thẳng `message_id` sang máy khác là trỏ
// vào tin của người ta. Nên bundle mang `session_id` + `msg_uuid`, bên nhận tra id của mình.

test("with the switch on, images travel to another machine and attach to the RIGHT message; off, the bundle carries nothing", async (t) => {
  const { exportMemoryBundle, mergeMemoryBundle } = await import("../../dist/memory/share.js");
  const { setSyncAttachments } = await import("../../dist/config/settings.js");
  const { dbPath: src } = seed(t);
  const dir = tempDir(t, "zemory-l3-");
  const env = { ZEMORY_SHARE_KEY: "khoa-test-l3" };

  /** Máy nhận: cùng phiên + cùng uuid tin, nhưng id CỤC BỘ lệch hẳn. */
  const makeDest = (name) => {
    const p = join(dir, name);
    const d = openMemory(p);
    d.prepare("INSERT INTO sessions (id, source, host, project_root, title) VALUES (?,?,?,?,?)")
      .run("s1", "claude-code", "may-khac", "/p", "t");
    // Đẩy id lệch để lộ ngay nếu ai đó chở message_id qua bundle.
    d.prepare("INSERT INTO messages (id, session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?,?)")
      .run(9001, "s1", "u1", "user", "nhìn ảnh", "2026-07-28T01:00:00Z");
    d.close();
    return p;
  };

  // ── BẬT ──
  setSyncAttachments(true);
  const onBundle = join(dir, "on.enc");
  await exportMemoryBundle({ dbPath: src, outPath: onBundle, env });
  const destOn = makeDest("dest-on.db");
  await mergeMemoryBundle({ bundlePath: onBundle, dbPath: destOn, env });
  const d1 = openMemory(destOn);
  const got = d1.prepare(
    `SELECT a.sha256, a.bytes, al.message_id FROM attachment_link al JOIN attachment a ON a.id = al.attachment_id`,
  ).all();
  d1.close();
  assert.equal(got.length >= 1, true, "bật công tắc thì ảnh phải sang được");
  assert.equal(got[0].sha256, PNG_SHA);
  assert.equal(got[0].message_id, 9001, "phải nối vào id CỦA MÁY NHẬN, không phải id trong bundle");

  // ── TẮT (mặc định) ──
  setSyncAttachments(false);
  const offBundle = join(dir, "off.enc");
  await exportMemoryBundle({ dbPath: src, outPath: offBundle, env });
  const destOff = makeDest("dest-off.db");
  await mergeMemoryBundle({ bundlePath: offBundle, dbPath: destOff, env });
  const d2 = openMemory(destOff);
  const n = d2.prepare("SELECT count(*) c FROM attachment").get().c;
  d2.close();
  assert.equal(n, 0, "tắt công tắc thì bundle KHÔNG được chở blob — đó là lý do bundle lean còn lean");
});

// ── ⑥ Dọn mồ côi: chỉ link chết, TUYỆT ĐỐI không đụng ảnh còn sống ───────────

test("pruneOrphanAttachments deletes dead links but KEEPS images still referenced by another message", async (t) => {
  const { pruneOrphanAttachments } = await import("../../dist/memory/attachments.js");
  const { dbPath, m1 } = seed(t);
  // Xoá tin ĐẦU TIÊN — chính là tin mà `attachment.message_id` đang trỏ. Ảnh vẫn còn tin
  // thứ hai trỏ tới, nên TUYỆT ĐỐI không được xoá nội dung. Đây đúng ca đã suýt xoá nhầm
  // 87 tấm ảnh sống trên DB thật (2026-07-28).
  const db = openMemory(dbPath);
  db.prepare("DELETE FROM messages WHERE id = ?").run(m1);
  db.close();

  const r = pruneOrphanAttachments(dbPath);
  assert.equal(r.links, 1, "đúng một liên kết chết bị dọn");
  assert.equal(r.rows, 0, "mặc định KHÔNG xoá nội dung");

  const after = attachmentStats(dbPath);
  assert.equal(after.orphanLinks, 0, "hết link chết");
  assert.equal(after.live, 1, "ảnh vẫn sống vì tin thứ hai còn trỏ tới");
  assert.equal(after.orphanRows, 0, "và nó KHÔNG bị tính là mồ côi");
});

test("with EVERY link dead the content STILL REMAINS (no delete by default); only `dropUnlinked` deletes", async (t) => {
  const { pruneOrphanAttachments } = await import("../../dist/memory/attachments.js");
  const { dbPath } = seed(t);
  // Ca NGUY HIỂM THẬT: xoá HẾT tin trỏ tới ảnh. Test cũ chỉ xoá một tin nên ảnh vẫn còn
  // liên kết khác — nhánh xoá-nội-dung không bao giờ chạy, và đột biến "xoá luôn nội dung"
  // SỐNG SÓT qua gate (đo 2026-07-28). Đây là ca bịt lỗ đó.
  const db = openMemory(dbPath);
  db.prepare("DELETE FROM messages").run();
  db.close();

  const r1 = pruneOrphanAttachments(dbPath);
  assert.equal(r1.links, 2, "cả hai liên kết đều chết");
  assert.equal(r1.rows, 0, "mặc định TUYỆT ĐỐI không xoá nội dung — huỷ dữ liệu phải do user quyết");
  const still = openMemory(dbPath);
  assert.equal(still.prepare("SELECT count(*) c FROM attachment").get().c, 1, "ảnh phải còn nguyên trong DB");
  still.close();

  // Chỉ khi người dùng CHỦ ĐỘNG bật mới được xoá.
  const r2 = pruneOrphanAttachments(dbPath, { dropUnlinked: true });
  assert.equal(r2.rows, 1, "bật dropUnlinked thì mới dọn nội dung không còn ai trỏ tới");
});

test("khối `document` (pdf) được nhận như đính kèm, KHÔNG rơi vào nhánh mặc định", () => {
  // Đo transcript thật 2026-09-15: khối tài liệu của Anthropic dùng CÙNG hình dạng với ảnh,
  // chỉ khác `type`. Trước bản này adapter rẽ theo `case "image"` nên pdf/xlsx gửi cho agent
  // mất im lặng ngay lúc nạp — cùng họ lỗi đã làm mất 93 MB ảnh (07-28).
  const pdf = Buffer.from("%PDF-1.4 noi dung gia").toString("base64");
  const a = fileAttachment({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
  assert.ok(a, "phải nhận ra khối tài liệu");
  assert.equal(a.mime, "application/pdf");
  assert.equal(a.kind, "blob");
  assert.ok(a.bytes > 0);
});

test("CA ÂM — nhãn để lại trong tin phải phân biệt ảnh với tài liệu", () => {
  // Nhãn ảnh giữ nguyên chữ `image:` vì viewer, ô Xem trước và bộ lọc "Có ảnh" đều cắt
  // đúng chuỗi đó; đổi nó là làm chết ba bề mặt cùng lúc.
  const img = fileAttachment({ type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } });
  const doc = fileAttachment({ type: "document", source: { type: "base64", media_type: "application/pdf", data: "AAAA" } });
  assert.match(imageLabel(img), /^\[image:/, "ảnh GIỮ nhãn image:");
  assert.match(imageLabel(doc), /^\[file:/, "tài liệu mang nhãn khác — nó không hiện được như ảnh");
});

test("ĐƯỜNG NẠP THẬT — adapter Claude Code phải nhận khối `document`, không chỉ hàm dùng chung", async () => {
  // Ca trước chỉ gọi thẳng `fileAttachment` nên KHÔNG ghim được nhánh rẽ của adapter:
  // gỡ `case "document"` ra thì test vẫn xanh (đo bằng đột biến 2026-09-15). Ca này đi qua
  // đúng `parseLine` — cùng đường mà `memory scan` chạy.
  const { claudeAdapter } = await import("../../dist/memory/adapters/claude.js");
  const pdf = Buffer.from("%PDF-1.4 bao cao quy 3").toString("base64");
  const line = {
    type: "user", uuid: "u-doc", timestamp: "2026-09-15T01:00:00Z",
    message: {
      role: "user",
      content: [
        { type: "text", text: "đọc file này giúp" },
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
      ],
    },
  };

  const r = claudeAdapter.parseLine(JSON.stringify(line));

  assert.equal(r?.kind, "message");
  const atts = r.msg.attachments ?? [];
  assert.equal(atts.length, 1, "tài liệu phải thành MỘT đính kèm, không bị bỏ im lặng");
  assert.equal(atts[0].mime, "application/pdf");
  assert.match(r.msg.content, /\[file:application\/pdf/, "chữ của tin giữ MỘT dòng nhãn, không nhét base64");
  assert.ok(!r.msg.content.includes(pdf.slice(0, 40)), "base64 KHÔNG được lọt vào nội dung (thổi FTS)");
});
