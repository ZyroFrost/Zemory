// KÊNH MÁY-TỚI-MÁY — năm cổng của plan/24 §7c ④.
//
// Bất biến đắt nhất ở đây, và là thứ cả cụm test tồn tại để canh:
// HP điều 16 (sửa đổi 2026-09-13) nói bất biến là **TẬP KHỐI**, không phải thứ tự byte.
// Đo trước khi build (plan/24 §6b phép ⑤) cho thấy nếu kiểm kê khai bằng `khúc#chỉ số`
// thay vì DANH TÍNH khối thì hai máy **mất khối im lặng** — mỗi bên tưởng bên kia đã có
// khối của mình nên không bao giờ gửi. Ca `blockid` dưới đây dựng đúng kịch bản đó.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import { openMemory } from "../../dist/memory/db.js";
import {
  exportMemoryBundle,
  writeMemoryShareKey,
  appendChunkVerified,
  listContainerChunks,
  chunkBlockId,
  isContainer,
} from "../../dist/memory/share.js";
import { loadOrCreateIdentity, deviceIdFromDer, certIsParsable, sameDeviceId } from "../../dist/memory/channel/identity.js";
import { inventoryIds, missingOnPeer } from "../../dist/memory/channel/blocks.js";
import { connectToPeer, serveChannel } from "../../dist/memory/channel/peer.js";
import { computeProof, createFrameReader, encodeBlock, encodeJson, newNonce, proofMatches } from "../../dist/memory/channel/wire.js";
import { tempDir, runInMemoryChild } from "./helpers.mjs";

const APP_VERSION = "test";

/** Kho bé nhất đủ để `exportMemoryBundle` sinh một bundle THẬT (có header + kdf.salt). */
function seedDb(dbPath, tag, bulkBytes = 0) {
  const db = openMemory(dbPath);
  db.prepare("INSERT INTO sessions (id, source, host, started_at) VALUES (?,?,?,?)").run(`s-${tag}`, "test", "h", new Date().toISOString());
  const body = bulkBytes > 0 ? `noi dung ${tag} ` + "x".repeat(bulkBytes) : `noi dung ${tag}`;
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)").run(
    `s-${tag}`, `u-${tag}`, "user", body, new Date().toISOString(),
  );
  db.close();
}

/** Nối một khối THẬT (bundle đã mã hoá) vào khúc đang mở của một thư mục kênh. */
async function addBlock(t, channelDir, keyPath, tag, bulkBytes = 0) {
  const work = tempDir(t, "zemory-blk-");
  const dbPath = join(work, `${tag}.db`);
  const bundlePath = join(work, `${tag}.enc`);
  seedDb(dbPath, tag, bulkBytes);
  await exportMemoryBundle({ dbPath, outPath: bundlePath, keyFile: keyPath });
  const target = join(channelDir, "global_memory.enc");
  const before = existsSync(target) && isContainer(target) ? listContainerChunks(target).length : 0;
  appendChunkVerified(target, bundlePath, before + 1);
  return target;
}

function blockIdsOf(channelDir) {
  const target = join(channelDir, "global_memory.enc");
  if (!existsSync(target) || !isContainer(target)) return [];
  return listContainerChunks(target).map((c) => chunkBlockId(target, c)).filter(Boolean).sort();
}

/** Một lượt đồng bộ hai chiều giữa hai thư mục kênh. */
async function syncPair(a, b) {
  // Phải chờ CẢ HAI đầu đóng sổ. Đóng server ngay khi bên gọi trả về là cắt ngang
  // lượt nối khối của bên nghe — thứ đã làm cổng đỏ lúc dựng.
  let resolveServer;
  const serverDone = new Promise((r) => { resolveServer = r; });
  const server = await serveChannel(
    { ...b, port: 0, host: "127.0.0.1", appVersion: APP_VERSION, timeoutMs: 20_000 },
    (r) => resolveServer(r),
  );
  try {
    const client = await connectToPeer(
      { host: "127.0.0.1", port: server.port },
      { ...a, appVersion: APP_VERSION, timeoutMs: 20_000 },
    );
    const srv = await Promise.race([serverDone, new Promise((r) => setTimeout(() => r(null), 15_000))]);
    return { ...client, server: srv };
  } finally {
    server.close();
  }
}

function makeSide(t, name, shareSecret) {
  const root = tempDir(t, `zemory-p2p-${name}-`);
  const channelDir = join(root, "channel");
  mkdirSync(channelDir, { recursive: true });
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  if (shareSecret) writeFileSync(keyPath, `${shareSecret}\n`);
  const shareKey = readFileSync(keyPath, "utf8").trim();
  const identity = loadOrCreateIdentity(join(root, "id"), `zemory-${name}`);
  return { root, channelDir, keyPath, shareKey, identity };
}
const opts = (side, peers) => ({
  channelDir: side.channelDir,
  identity: side.identity,
  shareKey: side.shareKey,
  allowedPeers: peers,
});

// ── ① danh tính ──────────────────────────────────────────────────────────────
test("p2p-identity: chứng chỉ tự dựng đọc lại được, ID bền và dài đúng 52 ký tự", (t) => {
  const dir = tempDir(t, "zemory-id-");
  const id = loadOrCreateIdentity(dir, "zemory-a");
  assert.equal(certIsParsable(id.certDer), true, "chứng chỉ phải parse lại được");
  assert.equal(id.deviceId.replace(/-/g, "").length, 52);
  assert.equal(loadOrCreateIdentity(dir, "zemory-a").deviceId, id.deviceId, "đọc lại phải ra cùng ID");
  assert.equal(deviceIdFromDer(id.certDer), id.deviceId);
  // So ID phải chịu được người chép tay (bỏ gạch, đổi hoa thường).
  assert.equal(sameDeviceId(id.deviceId, id.deviceId.replace(/-/g, "").toLowerCase()), true);
  // CA ÂM: hai máy khác nhau KHÔNG được trùng ID.
  const other = loadOrCreateIdentity(tempDir(t, "zemory-id2-"), "zemory-b");
  assert.notEqual(other.deviceId, id.deviceId);
  assert.equal(sameDeviceId(other.deviceId, id.deviceId), false);
});

test("p2p-identity: chứng chỉ KHÔNG được hết hạn ngay khi vừa sinh", (t) => {
  // Bẫy đã trả giá lúc build: UTCTime chỉ mang HAI chữ số năm nên hạn 100 năm
  // thành 2126 % 100 = 26 ⇒ mọi bộ đọc hiểu là 2026 và cert sinh ra ĐÃ hết hạn.
  const id = loadOrCreateIdentity(tempDir(t, "zemory-id3-"), "zemory-c");
  const x = new X509Certificate(id.certDer);
  assert.ok(new Date(x.validTo).getTime() > Date.now() + 10 * 365 * 24 * 3600 * 1000, `validTo quá gần: ${x.validTo}`);
  assert.ok(new Date(x.validFrom).getTime() <= Date.now());
  assert.equal(x.verify(x.publicKey), true, "chữ ký tự ký phải kiểm được");
});

// ── ② bằng chứng cùng chìa ───────────────────────────────────────────────────
test("p2p-keyproof: cùng chìa thì khớp, khác chìa thì KHÔNG, và phát lại vô dụng", () => {
  const nA = newNonce();
  const nB = newNonce();
  assert.equal(proofMatches(computeProof("k1", nA, nB), computeProof("k1", nA, nB)), true);
  // CA ÂM: khác chìa.
  assert.equal(proofMatches(computeProof("k1", nA, nB), computeProof("k2", nA, nB)), false);
  // CA ÂM: phát lại bằng chứng của phiên trước — nonce tươi nên vô dụng.
  assert.equal(proofMatches(computeProof("k1", nA, nB), computeProof("k1", nA, newNonce())), false);
  // Thứ tự ghép nonce phải cố định, nếu không hai đầu tính ra hai giá trị.
  assert.notEqual(computeProof("k1", nA, nB), computeProof("k1", nB, nA));
});

test("p2p-keyproof: khác chìa ⇒ NGẮT, không khối nào được chở", async (t) => {
  const a = makeSide(t, "a", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  const b = makeSide(t, "b", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=");
  await addBlock(t, a.channelDir, a.keyPath, "a1");
  const r = await syncPair(opts(a, [b.identity.deviceId]), opts(b, [a.identity.deviceId]));
  assert.equal(r.sentBlocks, 0, "khác chìa mà vẫn chở khối là sai");
  assert.match(String(r.error), /chìa share KHÁC nhau/);
  assert.equal(blockIdsOf(b.channelDir).length, 0);
});

test("p2p-identity: máy LẠ chưa ghép đôi bị từ chối", async (t) => {
  const a = makeSide(t, "a", "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS=");
  const b = makeSide(t, "b", "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS=");
  await addBlock(t, a.channelDir, a.keyPath, "x1");
  // b KHÔNG khai a là bạn ⇒ phải từ chối dù cùng chìa.
  const r = await syncPair(opts(a, [b.identity.deviceId]), opts(b, []));
  assert.equal(r.receivedBlocks, 0);
  assert.equal(blockIdsOf(b.channelDir).length, 0);
});

// ── ③ danh tính khối — bất biến HP điều 16 ───────────────────────────────────
test("p2p-blockid: thứ tự PHÂN KỲ vẫn hội tụ về CÙNG MỘT TẬP khối", async (t) => {
  const secret = "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK=";
  const a = makeSide(t, "a", secret);
  const b = makeSide(t, "b", secret);
  // Nền chung: cùng nội dung nhưng mỗi máy tự sinh khối của mình.
  await addBlock(t, a.channelDir, a.keyPath, "base-a");
  await addBlock(t, b.channelDir, b.keyPath, "base-b");
  // Mỗi máy nối thêm một khối nữa — cả hai rơi vào VỊ TRÍ THỨ 1 của máy mình.
  await addBlock(t, a.channelDir, a.keyPath, "only-a");
  await addBlock(t, b.channelDir, b.keyPath, "only-b");

  const idsA0 = blockIdsOf(a.channelDir);
  const idsB0 = blockIdsOf(b.channelDir);
  assert.equal(idsA0.length, 2);
  assert.equal(idsB0.length, 2);

  const r = await syncPair(opts(a, [b.identity.deviceId]), opts(b, [a.identity.deviceId]));
  assert.equal(r.error, undefined, `phiên phải sạch lỗi: ${r.error}`);

  const idsA = blockIdsOf(a.channelDir);
  const idsB = blockIdsOf(b.channelDir);
  assert.deepEqual(idsA, idsB, "TẬP khối hai máy phải BẰNG NHAU — đây là bất biến HP điều 16");
  assert.equal(idsA.length, 4, "phải có đủ 4 khối, không khối nào bị nuốt");
  // Ghim luôn con số BÁO CÁO: phiên phải đếm đúng phần mình đã nối, không được
  // đóng sổ giữa lúc còn khối đang chờ ghi (nếu không thì bề mặt nói dối dù đĩa đúng).
  assert.equal(r.receivedBlocks, 2, "bên gọi phải nối đúng 2 khối của bên kia");
  assert.equal(r.server?.receivedBlocks, 2, "bên nghe phải nối đúng 2 khối của bên gọi");
  for (const id of [...idsA0, ...idsB0]) {
    assert.ok(idsA.includes(id), `khối ${id} biến mất khỏi A`);
    assert.ok(idsB.includes(id), `khối ${id} biến mất khỏi B`);
  }
});

test("p2p-blockid: kiểm kê khai bằng DANH TÍNH, và phép trừ theo tập là đúng", async (t) => {
  const secret = "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM=";
  const a = makeSide(t, "a", secret);
  await addBlock(t, a.channelDir, a.keyPath, "m1");
  await addBlock(t, a.channelDir, a.keyPath, "m2");
  const ids = inventoryIds(a.channelDir);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2, "hai khối khác nhau phải có hai danh tính khác nhau");
  // CA ÂM: bên kia đã có hết ⇒ không còn gì để chở.
  assert.equal(missingOnPeer(a.channelDir, ids).length, 0);
  // Bên kia chưa có gì ⇒ chở cả hai.
  assert.equal(missingOnPeer(a.channelDir, []).length, 2);
});

// ── ④ đứt dây ───────────────────────────────────────────────────────────────
test("p2p-resume: khung CHƯA TRỌN không bao giờ chạm đĩa", () => {
  const read = createFrameReader();
  const full = encodeJson({ t: "done", sent: 3 });
  // Cắt đôi: nửa đầu KHÔNG được sinh tin nào.
  assert.equal(read(full.subarray(0, 4)).length, 0);
  assert.equal(read(full.subarray(4, full.length - 1)).length, 0);
  const frames = read(full.subarray(full.length - 1));
  assert.equal(frames.length, 1);
  assert.equal(JSON.parse(frames[0].body.toString("utf8")).t, "done");
  // Byte thô của khối đi nguyên si, không qua base64.
  // NUL + 0xFF viết bằng ESCAPE: giá trị runtime y hệt, nhưng file vẫn đọc/grep được
  // (byte 0x00 thật làm grep coi cả file là nhị phân rồi BỎ QUA — cổng control-char bắt đúng).
  const payload = Buffer.from(["khoi-nhi-phan-", String.fromCharCode(0), String.fromCharCode(255)].join(""), "binary");
  const r2 = createFrameReader()(encodeBlock(payload));
  assert.equal(r2.length, 1);
  assert.equal(Buffer.compare(r2[0].body, payload), 0);
});

// ── ⑤ chạy lại không đẻ việc ─────────────────────────────────────────────────
test("p2p-idempotent: lượt thứ hai chở 0 khối và không đổi tập khối", async (t) => {
  const secret = "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII=";
  const a = makeSide(t, "a", secret);
  const b = makeSide(t, "b", secret);
  await addBlock(t, a.channelDir, a.keyPath, "i1");
  await addBlock(t, a.channelDir, a.keyPath, "i2");

  const first = await syncPair(opts(a, [b.identity.deviceId]), opts(b, [a.identity.deviceId]));
  assert.equal(first.error, undefined, `lượt đầu phải sạch: ${first.error}`);
  assert.equal(first.sentBlocks, 2);
  assert.equal(first.server?.receivedBlocks, 2, "bên nghe phải BÁO đúng số khối đã nối");
  const after1 = blockIdsOf(b.channelDir);
  assert.equal(after1.length, 2);

  const second = await syncPair(opts(a, [b.identity.deviceId]), opts(b, [a.identity.deviceId]));
  assert.equal(second.sentBlocks, 0, "chạy lại mà còn chở khối là mất tính bình-phương-bằng-chính-nó");
  assert.deepEqual(blockIdsOf(b.channelDir), after1, "tập khối không được đổi ở lượt rỗng");
});

// ── ④b khối LỚN: đóng socket phải ĐẨY NỐT, không được cắt phũ ───────────────
test("p2p-resume: khối LỚN phải tới nơi nguyên vẹn (đóng socket không được nuốt byte)", async (t) => {
  // Ca này ghim đúng bug đã trả giá lúc build: `end()` rồi `destroy()` NGAY dòng sau
  // huỷ phần ghi chưa kịp đẩy. Khối nhỏ lọt qua vì vừa bộ đệm; phải đủ lớn mới lộ.
  const secret = "LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL=";
  const a = makeSide(t, "a", secret);
  const b = makeSide(t, "b", secret);
  await addBlock(t, a.channelDir, a.keyPath, "big", 6 * 1024 * 1024);
  const idsA = blockIdsOf(a.channelDir);
  assert.equal(idsA.length, 1);

  const r = await syncPair(opts(a, [b.identity.deviceId]), opts(b, [a.identity.deviceId]));
  assert.equal(r.error, undefined, `phiên phải sạch: ${r.error}`);
  assert.equal(r.sentBlocks, 1);
  assert.deepEqual(blockIdsOf(b.channelDir), idsA, "khối lớn phải tới nơi NGUYÊN VẸN, cùng danh tính");
  assert.equal(r.server?.receivedBlocks, 1, "bên nghe phải báo đúng 1 khối đã nối");
});

// ── ⑥ CỬA VÀO: khi nào daemon NGHE, và đích GHI đi đâu (plan/24 §7 bước ④) ────
//
// Lớp giao thức đã được năm cổng trên canh. Cụm này canh thứ khác hẳn và là thứ đã THIẾU tới
// 2026-09-15: `serveChannel` viết xong từ 13/09 nhưng KHÔNG NƠI NÀO GỌI — cả lớp kênh là một
// cánh cửa không ai mở, còn bề mặt vẫn khoe "đã sẵn sàng".
//
// 🔴 Chạy trong TIẾN TRÌNH CON, không gọi thẳng: mấy hàm này GHI vào `config.json`, mà đường
// của nó suy từ kho ⇒ gọi trong tiến trình test là ghi vào config THẬT của máy. Đúng lỗi
// `helpers.mjs` đã ghi (2026-09-10), và đúng hình dạng sự cố "cờ p2p tự bật" ngày 14/09 mà
// sổ còn ghi là chưa giải thích được — một ca test chết giữa chừng là đủ để lại cờ bật.
test("channel-serve: TẮT · chưa ghép đôi · chưa có chìa ⇒ KHÔNG nghe, và nói rõ lý do", (t) => {
  const root = tempDir(t, "zemory-serve-off-");
  const out = runInMemoryChild(root, [
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    'S.setP2pEnabled(false); S.setP2pPeers(["ZZZ-TEST"]); S.setP2pPort(0);',
    'out.push(await ch.startChannelServer({ shareKey: "khoa-gia", appVersion: "test" }));',
    'out.push(ch.channelServingPort());',
    'S.setP2pEnabled(true); S.setP2pPeers([]);',
    'out.push(await ch.startChannelServer({ shareKey: "khoa-gia", appVersion: "test" }));',
    'S.setP2pPeers(["ZZZ-TEST"]);',
    'out.push(await ch.startChannelServer({ shareKey: "", appVersion: "test" }));',
    'ch.stopChannelServer();',
  ].join("\n"));

  const [off, port0, noPeer, noKey] = out;
  assert.equal(off.listening, false, "TẮT thì không được mở cổng nào");
  assert.match(off.reason, /TẮT/);
  assert.equal(port0, null, "bề mặt phải nói đúng: không nghe");
  assert.equal(noPeer.listening, false, "chưa ghép đôi ⇒ mở cổng là mở vô ích");
  assert.match(noPeer.reason, /ghép đôi/);
  assert.equal(noKey.listening, false, "không chìa ⇒ không có phép chứng minh cùng kho");
  assert.match(noKey.reason, /chìa/);
});

test("channel-serve: đủ ba điều kiện ⇒ NGHE THẬT, và đóng rồi thì thôi khoe đang nghe", (t) => {
  const root = tempDir(t, "zemory-serve-on-");
  const out = runInMemoryChild(root, [
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    // cổng 0 ⇒ hệ tự chọn cổng rảnh: cổng thật của máy không bị giành trong lúc test chạy.
    'S.setP2pEnabled(true); S.setP2pPeers(["ZZZ-TEST"]); S.setP2pPort(0);',
    'const r = await ch.startChannelServer({ shareKey: "khoa-gia", appVersion: "test" });',
    'out.push(r); out.push(ch.channelServingPort());',
    'const again = await ch.startChannelServer({ shareKey: "khoa-gia", appVersion: "test" });',
    'out.push(again.listening);',
    'ch.stopChannelServer(); out.push(ch.channelServingPort());',
  ].join("\n"));

  const [r, portWhileOn, againListening, portAfterStop] = out;
  assert.equal(r.listening, true, "đủ điều kiện thì PHẢI nghe — thiếu bước này thì máy kia không nối vào được");
  assert.ok(r.port > 0);
  assert.equal(portWhileOn, r.port, "cổng báo ra phải là cổng THẬT đang nghe");
  assert.equal(againListening, true, "gọi lại ⇒ mở lại theo cấu hình mới, không đẻ cổng thứ hai");
  assert.equal(portAfterStop, null, "đóng rồi thì bề mặt phải thôi khoe đang nghe");
});

test("channel-serve: đích GHI đúng MỘT — drive không bao giờ trả thư mục kênh (HP điều 11)", (t) => {
  const root = tempDir(t, "zemory-serve-dir-");
  const out = runInMemoryChild(root, [
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    'S.setSyncTransport("drive"); out.push(ch.syncWriteDir());',
    'S.setSyncTransport("p2p");   out.push(ch.syncWriteDir());',
  ].join("\n"));

  const [onDrive, onP2p] = out;
  assert.equal(onDrive, null, "đích Drive ⇒ người gọi giữ NGUYÊN đường cũ, không nhánh nào đổi hành vi");
  assert.ok(typeof onP2p === "string" && onP2p.length > 0, "đích p2p ⇒ phải trả thư mục kênh");
  assert.match(onP2p, /channel$/);
});
