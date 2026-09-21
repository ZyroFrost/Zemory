// ĐỤC LỖ NAT (plan/24 §7 ⑩) — cổng cho hình dạng "BẮN rồi NGHE, so le pha".
//
// Vì sao đo được mà không cần hai máy: phần NAT thì cần, nhưng **máy trạng thái** thì
// không. Hai "máy" = hai danh tính + hai cổng trên loopback, chạy `punchToPeer` CÙNG LÚC
// về phía nhau — đúng khuôn phép ①③④⑤ của `§6b` (giao thức đo được bằng hai tiến trình
// logic trong một tiến trình test).
//
// 🔴 Bất biến đắt nhất, và là lý do cụm test này tồn tại: **SO LE PHA**. Hai máy cùng pha
// thì hai nửa *bắn* trùng nhau, hai nửa *nghe* trùng nhau, và một cú gọi KHÔNG BAO GIỜ gặp
// một lớp nghe. Cơ chế chết mà không có lỗi nào nổ — triệu chứng chỉ là *"đục lỗ không ăn"*.
// Ca `pha` dưới đây ghim đúng điều đó, và ca `gap-nhau` chứng minh nó chạy đầu-cuối.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import net from "node:net";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { openMemory } from "../../dist/memory/db.js";
import {
  exportMemoryBundle,
  writeMemoryShareKey,
  appendChunkVerified,
  listContainerChunks,
  chunkBlockId,
  isContainer,
} from "../../dist/memory/share.js";
import { loadOrCreateIdentity, normalizeDeviceId } from "../../dist/memory/channel/identity.js";
import { punchToPeer, dialsFirst } from "../../dist/memory/channel/punch.js";
import { tempDir } from "./helpers.mjs";

const APP_VERSION = "test";

function seedDb(dbPath, tag) {
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, host, started_at) VALUES (?,?,?,?)").run(`s-${tag}`, "test", "h", new Date().toISOString());
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
    `s-${tag}`, `u-${tag}`, "user", `noi dung ${tag}`, new Date().toISOString(),
  );
  db.close();
}

/** Nối một khối THẬT (bundle đã mã hoá) vào khúc đang mở của một thư mục kênh. */
async function addBlock(t, channelDir, keyPath, tag) {
  const work = tempDir(t, "zemory-pblk-");
  const dbPath = join(work, `${tag}.db`);
  const bundlePath = join(work, `${tag}.enc`);
  seedDb(dbPath, tag);
  await exportMemoryBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });
  const target = join(channelDir, "global_memory.enc");
  const before = existsSync(target) && isContainer(target) ? listContainerChunks(target).length : 0;
  appendChunkVerified(target, bundlePath, before + 1);
}

function blockIdsOf(channelDir) {
  const target = join(channelDir, "global_memory.enc");
  if (!existsSync(target) || !isContainer(target)) return [];
  return listContainerChunks(target).map((c) => chunkBlockId(target, c)).filter(Boolean).sort();
}

function makeSide(t, name, shareSecret) {
  const root = tempDir(t, `zemory-punch-${name}-`);
  const channelDir = join(root, "channel");
  mkdirSync(channelDir, { recursive: true });
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  if (shareSecret) writeFileSync(keyPath, `${shareSecret}\n`);
  return {
    root,
    channelDir,
    keyPath,
    shareKey: readFileSync(keyPath, "utf8").trim(),
    identity: loadOrCreateIdentity(join(root, "id"), `zemory-${name}`),
  };
}

const opts = (side, peers, localPort, extra = {}) => ({
  channelDir: side.channelDir,
  identity: side.identity,
  shareKey: side.shareKey,
  allowedPeers: peers,
  appVersion: APP_VERSION,
  timeoutMs: 20_000,
  localPort,
  rounds: 6,
  roundMs: 700,
  ...extra,
});

// ── SO LE PHA — luật thuần, và nó phải ĐỐI XỨNG NGƯỢC ──────────────────────────────────
test("pha: hai máy PHẢI ra hai pha NGƯỢC nhau, và luật không phụ thuộc cách viết ID", () => {
  const A = "AAAAAAA-BBBBBBB";
  const B = "ZZZZZZZ-BBBBBBB";

  // Đây là bất biến: nếu cả hai cùng ra `true` (hay cùng `false`) thì cơ chế chết lặng.
  assert.notEqual(dialsFirst(A, B), dialsFirst(B, A), "hai đầu phải ra pha NGƯỢC nhau");
  assert.equal(dialsFirst(A, B), true, "ID nhỏ hơn thì bắn ở nửa ĐẦU");
  assert.equal(dialsFirst(B, A), false);

  // Chuẩn hoá: dấu nối và hoa/thường không được đổi phán quyết — nếu đổi, hai máy chép ID
  // theo hai cách khác nhau sẽ tính ra CÙNG pha rồi không bao giờ gặp nhau.
  assert.equal(dialsFirst(A, B), dialsFirst(A.toLowerCase(), B.replace(/-/g, "")));
  assert.equal(normalizeDeviceId(A.toLowerCase()), normalizeDeviceId(A));

  // Chưa biết máy kia ⇒ BẮN, không nghe. Cả hai cùng nghe là bế tắc chắc chắn.
  assert.equal(dialsFirst(A, ""), true, "không biết ID máy kia thì phải bắn, không được nằm chờ");
});

// ── ĐẦU-CUỐI: hai máy gặp nhau và khối đi được hai chiều ───────────────────────────────
test("gặp-nhau: hai máy cùng đục lỗ về phía nhau ⇒ nối được và HỘI TỤ cùng tập khối", async (t) => {
  const secret = "chia-chung-cua-hai-may";
  const A = makeSide(t, "a", secret);
  const B = makeSide(t, "b", secret);
  await addBlock(t, A.channelDir, A.keyPath, "cua-A");
  await addBlock(t, B.channelDir, B.keyPath, "cua-B");

  // Trên loopback không có NAT, nhưng MÁY TRẠNG THÁI y hệt: mỗi bên giữ cổng của mình,
  // bắn sang cổng của bên kia. Pha so le là thứ làm một cú bắn gặp được một lớp nghe.
  const [pa, pb] = [21181, 21182];
  const [ra, rb] = await Promise.all([
    punchToPeer({ host: "127.0.0.1", port: pb, deviceId: B.identity.deviceId }, opts(A, [B.identity.deviceId], pa)),
    punchToPeer({ host: "127.0.0.1", port: pa, deviceId: A.identity.deviceId }, opts(B, [A.identity.deviceId], pb)),
  ]);

  assert.ok(!ra.error, `bên A lỗi: ${ra.error}`);
  assert.ok(ra.won, "phải có một cửa ăn");
  // Một bên GỌI được thì bên kia NHẬN được — hai vai không bao giờ trùng.
  const wons = [ra.won, rb.won].filter(Boolean);
  if (wons.length === 2) assert.notEqual(ra.won, rb.won, "không thể cả hai cùng là bên gọi");

  // HP điều 16: bất biến là TẬP KHỐI. Cả hai phải thấy cả khối của A lẫn của B.
  assert.deepEqual(blockIdsOf(A.channelDir), blockIdsOf(B.channelDir), "hai máy phải hội tụ cùng TẬP khối");
  assert.equal(blockIdsOf(A.channelDir).length, 2, "phải có đủ hai khối, không mất khối nào");
});

// ── CA ÂM: chìa khác nhau ⇒ NGẮT TRƯỚC khi chở byte nào ────────────────────────────────
test("CA ÂM: hai máy KHÁC chìa share ⇒ không khối nào đi qua", async (t) => {
  const A = makeSide(t, "ka", "chia-cua-A");
  const B = makeSide(t, "kb", "chia-KHAC-cua-B");
  await addBlock(t, A.channelDir, A.keyPath, "chi-cua-A");
  await addBlock(t, B.channelDir, B.keyPath, "chi-cua-B");
  const before = { a: blockIdsOf(A.channelDir).length, b: blockIdsOf(B.channelDir).length };

  const [pa, pb] = [21183, 21184];
  await Promise.all([
    punchToPeer({ host: "127.0.0.1", port: pb, deviceId: B.identity.deviceId }, opts(A, [B.identity.deviceId], pa)),
    punchToPeer({ host: "127.0.0.1", port: pa, deviceId: A.identity.deviceId }, opts(B, [A.identity.deviceId], pb)),
  ]);

  assert.equal(blockIdsOf(A.channelDir).length, before.a, "chìa lệch mà A vẫn nhận khối = kho lai");
  assert.equal(blockIdsOf(B.channelDir).length, before.b, "chìa lệch mà B vẫn nhận khối = kho lai");
});

// ── CA ÂM: máy KHÔNG có trong sổ ⇒ không được nhận khối ────────────────────────────────
test("CA ÂM: máy lạ (không trong sổ đã ghép) ⇒ không khối nào đi qua", async (t) => {
  const secret = "cung-chia-nhung-la-mat";
  const A = makeSide(t, "la", secret);
  const B = makeSide(t, "lb", secret);
  await addBlock(t, A.channelDir, A.keyPath, "cua-A-la");
  await addBlock(t, B.channelDir, B.keyPath, "cua-B-la");
  const before = { a: blockIdsOf(A.channelDir).length, b: blockIdsOf(B.channelDir).length };

  const [pa, pb] = [21185, 21186];
  // Sổ RỖNG hai bên ⇒ `allowedPeers: []` ⇒ TỪ CHỐI tất (không bao giờ mặc định mở).
  await Promise.all([
    punchToPeer({ host: "127.0.0.1", port: pb, deviceId: B.identity.deviceId }, opts(A, [], pa)),
    punchToPeer({ host: "127.0.0.1", port: pa, deviceId: A.identity.deviceId }, opts(B, [], pb)),
  ]);

  assert.equal(blockIdsOf(A.channelDir).length, before.a, "sổ rỗng mà vẫn nhận khối = cửa mở sẵn");
  assert.equal(blockIdsOf(B.channelDir).length, before.b, "sổ rỗng mà vẫn nhận khối = cửa mở sẵn");
});

// ── CA ÂM: bên kia nhận TCP mà KHÔNG nói TLS ⇒ phải TRẢ VỀ, tuyệt đối không treo ───────
test("CA ÂM: đầu kia nhận TCP rồi im ⇒ trả về trong mốc, KHÔNG treo", async (t) => {
  const A = makeSide(t, "mute", "chia");
  // Đây là ca THẬT đã làm cổng treo hơn 7 phút lúc dựng: cú gọi nối được nhưng bên kia
  // không còn ai nói TLS, nên bắt tay chờ một `ServerHello` không bao giờ tới.
  const mute = net.createServer(() => {
    /* nhận rồi IM — không một byte TLS nào */
  });
  await new Promise((r) => mute.listen(21188, "127.0.0.1", r));
  t.after(() => mute.close());

  const rounds = 2;
  const roundMs = 600;
  // Viết dạng ĐUA VỚI MỐC có chủ đích: nếu trần bắt tay bị gỡ thì ca này ra ĐỎ, không ra
  // treo — một cổng treo thì không ai đọc được nó đang báo gì.
  const bound = rounds * roundMs * 3 + 2000;
  const r = await Promise.race([
    punchToPeer({ host: "127.0.0.1", port: 21188, deviceId: "ZZZZZZZ-ZZZZZZZ" }, opts(A, ["ZZZZZZZ-ZZZZZZZ"], 21189, { rounds, roundMs })),
    new Promise((res) => setTimeout(() => res("TREO"), bound)),
  ]);
  assert.notEqual(r, "TREO", `lượt đục lỗ phải kết thúc trong ${bound} ms, không được treo`);
  assert.equal(r.won, null, "bên kia không nói TLS thì không cửa nào được tính là ăn");
  assert.ok(r.error, "phải nói lý do");
});

// ── CA ÂM: cổng nội bị CHIẾM ⇒ fail-open, không ném ────────────────────────────────────
test("CA ÂM: cổng nội đã bị chiếm ⇒ báo lý do rõ, KHÔNG ném, không treo mãi", async (t) => {
  const A = makeSide(t, "busy", "chia");
  const port = 21187;
  // Giả lập đúng ca thường gặp nhất: daemon của CHÍNH máy này đang giữ cổng đó.
  //
  // 🔴 Phải bind `0.0.0.0`, KHÔNG phải `127.0.0.1`. Bản đầu của ca này bind loopback trong
  // khi `listenHalf` bind `0.0.0.0` — trên máy này hai cái KHÔNG đụng nhau, nên `EADDRINUSE`
  // chưa bao giờ xảy ra và ca vẫn xanh vì một lý do khác hẳn thứ nó khai. Đột biến hoá bắt
  // được (gỡ bộ bắt lỗi của `listenHalf` mà cổng vẫn xanh) — đúng nghĩa cổng TRANG TRÍ.
  const squatter = net.createServer();
  await new Promise((r) => squatter.listen(port, "0.0.0.0", r));
  t.after(() => squatter.close());

  const r = await punchToPeer(
    // Địa chỉ tài liệu RFC 5737 — không có ai ở đó, nên nửa BẮN cũng không ăn.
    { host: "203.0.113.1", port: 9, deviceId: "ZZZZZZZ-ZZZZZZZ" },
    opts(A, ["ZZZZZZZ-ZZZZZZZ"], port, { rounds: 2, roundMs: 500 }),
  );
  assert.equal(r.won, null, "không cửa nào được phép ăn");
  assert.ok(r.error, "phải NÓI lý do, không im lặng trả về rỗng");
  assert.match(r.error, /đục lỗ không ăn/, `lý do phải nêu điều kiện, đang là: ${r.error}`);
  assert.equal(r.sentBlocks, 0);
});
