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
import { loadOrCreateIdentity, deviceIdFromDer, certIsParsable, sameDeviceId, normalizeDeviceId, deviceIdLooksTyped, luhn32 } from "../../dist/memory/channel/identity.js";
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
test("p2p-identity: chứng chỉ tự dựng đọc lại được, ID bền và mang CHỮ SỐ KIỂM", (t) => {
  const dir = tempDir(t, "zemory-id-");
  const id = loadOrCreateIdentity(dir, "zemory-a");
  assert.equal(certIsParsable(id.certDer), true, "chứng chỉ phải parse lại được");
  // 52 ký tự thô, chia nhóm 7 + 1 chữ số kiểm mỗi nhóm ⇒ 8 nhóm (7 nhóm đủ + 1 nhóm lẻ 3).
  assert.equal(normalizeDeviceId(id.deviceId).length, 52, "phần THÔ vẫn là 52 — chữ số kiểm không phải danh tính");
  assert.equal(deviceIdLooksTyped(id.deviceId), true, "ID sinh ra phải tự kiểm được");
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
test("channel-serve: TẮT hoặc chưa có chìa ⇒ KHÔNG nghe; chưa quen ai thì VẪN nghe", (t) => {
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
  // 🔄 ĐẢO ca này (2026-09-20): cửa "chưa ghép đôi máy nào" đã bỏ cùng mã kết nối. Máy nào chứng
  // minh được cùng chìa là vào được, nên CHƯA quen ai vẫn phải NGHE — nếu không thì máy đầu tiên
  // gõ địa chỉ sang sẽ không có ai nhấc máy, đúng ca hỏng mà cửa đó từng tự sinh ra.
  assert.equal(noPeer.listening, true, "0 máy đã biết vẫn phải NGHE — chìa chung là thứ gác cửa");
  assert.equal(noKey.listening, false, "không chìa ⇒ không có phép chứng minh cùng kho");
  assert.match(noKey.reason, /chìa/);
});

test("channel-serve: đủ hai điều kiện ⇒ NGHE THẬT, và đóng rồi thì thôi khoe đang nghe", (t) => {
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
  // 🔄 Neo đi theo bề mặt (2026-09-21): đích ghi nay là NGĂN CỦA MÁY NÀY — `channel/<device-id>/`,
  // không còn là `channel/` trần. Đó là thứ làm Syncthing chở được thư mục này mà không đẻ
  // `.sync-conflict`: hai máy ghi hai đường dẫn khác nhau, không ai đụng ai.
  assert.match(onP2p, /[\\/]channel[\\/][A-Z0-9]+$/, "đích ghi phải là NGĂN riêng bên trong channel/");
});

test("p2p-identity: CHỮ SỐ KIỂM bắt lỗi chép — sai một ký tự là biết NGAY, không đợi bắt tay", (t) => {
  const id = loadOrCreateIdentity(tempDir(t, "zemory-id-chk-"), "zemory-chk").deviceId;
  assert.equal(deviceIdLooksTyped(id), true);

  // Đổi ĐÚNG MỘT ký tự trong nhóm đầu ⇒ chữ số kiểm của nhóm đó sai ⇒ bắt được tại chỗ.
  const flat = id.replace(/-/g, "");
  const ch = flat[0] === "A" ? "B" : "A";
  const typo = ch + flat.slice(1);
  assert.equal(deviceIdLooksTyped(typo), false, "chép sai một ký tự PHẢI bị bắt");

  // CA ÂM — tương thích ngược: ID đời CŨ (không chữ số kiểm) vẫn khớp với chính máy đó.
  // Thiếu vế này thì bản nâng cấp cắt mọi cặp đã ghép đôi, tức tự dựng lại đúng sự cố
  // mà chữ số kiểm sinh ra để tránh.
  const raw = normalizeDeviceId(id); // 52 ký tự thô, đúng dạng ID đời cũ
  assert.equal(sameDeviceId(raw, id), true, "ID cũ và ID mới của CÙNG máy phải khớp");
  assert.equal(deviceIdLooksTyped(raw), false, "nhưng nó KHÔNG tự kiểm được — đó là cách phân biệt hai đời");

  // Luhn mod 32: cùng đầu vào luôn ra cùng chữ số, và ký tự lạ thì NÉM chứ không đoán.
  assert.equal(luhn32("ABCDEFG"), luhn32("ABCDEFG"));
  assert.throws(() => luhn32("ABC0189"), /ngoài base32/);
});

// ── GHI CẢ HAI KÊNH — và vì sao nó CHỈ an toàn khi mốc tách đôi ─────────────
//
// User chốt 2026-09-16: *"ko có vụ chọn bên nào hết, vì nó có đụng nhau đâu, xài nhiều cái dc mà"*.
// User đúng: Drive và kênh máy-tới-máy là HAI ĐÍCH khác nhau — điều 11 cấm hai kẻ ghi cùng MỘT
// kho, không cấm một kẻ ghi vào hai kho.
//
// 🔴 Thứ thật sự chặn không phải xung đột mà là CUỐN SỔ: bản cũ luôn dùng khoá `drive:<host>` bất
// kể đích. Đẩy Drive xong là mốc nhảy lên ⇒ kênh kia KHÔNG BAO GIỜ còn thấy đám tin đó, im lặng và
// vĩnh viễn — đúng họ với lỗi gieo `vec_shipped` đã giấu mất 6.310 vector (`plan/08 §8b`).
// Cổng này canh đúng vế đó: hai kênh phải cho ra HAI khoá khác nhau.
test("mỗi kênh giữ MỐC RIÊNG — dùng chung một khoá là bịt mắt kênh còn lại", async () => {
  const { wmKeyFor } = await import("../../dist/memory/share.js");
  assert.notEqual(wmKeyFor("drive", "MAY-A"), wmKeyFor("p2p", "MAY-A"), "hai kênh KHÔNG được chung mốc");
  // Tương thích ngược: kênh drive phải giữ NGUYÊN khoá cũ, nếu không mọi bản cài đang chạy sẽ
  // coi như chưa đẩy gì và xuất lại từ đầu.
  assert.equal(wmKeyFor("drive", "MAY-A"), "drive:MAY-A", "đổi khoá của drive = mọi máy đẩy lại từ đầu");
  assert.equal(wmKeyFor("p2p", "MAY-A"), "p2p:MAY-A");
});

test("mọi kênh đang BẬT đều là một đích ghi — không còn chọn một", (t) => {
  const root = tempDir(t, "zemory-targets-");
  const out = runInMemoryChild(root, [
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    'S.setDriveDir(""); S.setP2pEnabled(false); out.push(ch.syncTargets().map(x => x.channel));',
    'S.setDriveDir(process.env.Z_ROOT); out.push(ch.syncTargets().map(x => x.channel));',
    'S.setP2pEnabled(true); out.push(ch.syncTargets().map(x => x.channel));',
    'S.setDriveDir(""); out.push(ch.syncTargets().map(x => x.channel));',
  ].join(String.fromCharCode(10)));
  assert.deepEqual(out[0], [], "không kênh nào bật ⇒ không đích nào");
  assert.deepEqual(out[1], ["drive"]);
  assert.deepEqual(out[2], ["drive", "p2p"], "bật cả hai ⇒ GHI cả hai, đây là cả điểm của thay đổi");
  assert.deepEqual(out[3], ["p2p"], "chỉ p2p cũng chạy được, không bắt phải có Drive");
});

// ── WIRING CHẠY THẬT: bật kênh ⇒ máy LẠ có cùng chìa phải đục lỗ vào được ──────────────
//
// 🔴 Đây là cổng của bug người dùng gặp 2026-09-21: B dán mã của A, B báo "đang chờ", A không
// nhận gì. Gốc là `startChannelServer` truyền `onPaired` thay cho `acceptPeer` vào chỗ chờ tự
// giữ — mà `onPaired` chỉ bắn ở bên GỌI, nên nửa NGHE thấy sổ rỗng rồi trả *"máy lạ"*.
//
// Cổng cũ (`giữ lỗ`, trong `p2p-punch`) chỉ SOI CHỮ nên nó XANH với đúng cái bug đó — đã đo
// bằng đột biến. Ca này GỌI hàm thật: dựng chỗ chờ qua `startChannelServer`, rồi cho một máy
// thứ hai đục lỗ vào cổng của nó.
test("wiring: bật kênh ⇒ chỗ chờ tự giữ NHẬN máy lạ chứng minh cùng chìa", (t) => {
  const root = tempDir(t, "zemory-hold-wire-");
  // Cổng riêng mỗi lượt: cổng cố định còn kẹt TIME_WAIT từ lượt chạy trước (xem `p2p-punch`).
  const port = 23000 + Math.floor(Math.random() * 1200) * 2;
  const out = runInMemoryChild(root, [
    'const { join } = await import("node:path");',
    'const fs = await import("node:fs");',
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    'const ID = await import("file://" + process.env.Z_DIST + "/memory/channel/identity.js");',
    'const P = await import("file://" + process.env.Z_DIST + "/memory/channel/punch.js");',
    'const KEY = "chia-chung-cua-hai-may-that";',
    'S.setP2pEnabled(true); S.setP2pPeers([]); S.setP2pPort(' + port + ");",
    // Sổ máy RỖNG — đúng trạng thái máy người dùng sau khi cơ chế ghép đổi 20/09.
    "let accepted = null;",
    // Callback làm ĐÚNG việc `ui.ts` làm (ghi vân tay vào sổ) — `startChannelServer` chỉ HỎI,
    // việc ghi thuộc người gọi. Đặt callback rỗng thì ca này chỉ kiểm chính nó.
    'const r = await ch.startChannelServer({ shareKey: KEY, appVersion: "test", acceptPeer: (id) => { accepted = id; S.setP2pPeers([...S.getP2pPeers(), id]); return true; } });',
    // Máy thứ hai: danh tính riêng, kho riêng, và nó KHÔNG có trong sổ của máy một.
    'const broot = join(process.env.Z_ROOT, "bee"); fs.mkdirSync(join(broot, "channel"), { recursive: true });',
    'const bid = ID.loadOrCreateIdentity(join(broot, "id"), "zemory-bee");',
    "const me = ch.channelStatus().deviceId;",
    "const res = await P.punchToPeer(",
    '  { host: "127.0.0.1", port: ch.punchPortOf(' + port + "), deviceId: me },",
    "  {",
    '    channelDir: join(broot, "channel"), identity: bid, shareKey: KEY, allowedPeers: [me],',
    '    appVersion: "test", timeoutMs: 20000, localPort: ' + (port + 3) + ", rounds: 8, roundMs: 1200,",
    "  },",
    ");",
    "ch.stopChannelServer();",
    "out.push({ listening: r.listening, accepted, err: res.error ?? null, won: res.won, peers: S.getP2pPeers() });",
  ].join("\n"));

  const [g] = out;
  assert.equal(g.listening, true, "bật kênh phải nghe");
  assert.equal(g.err, null, `máy lạ cùng chìa phải vào được, lỗi: ${g.err}`);
  // Bằng chứng thật: chỗ chờ đã HỎI `acceptPeer`, và vân tay máy kia đã vào sổ.
  assert.ok(g.accepted, "chỗ chờ phải hỏi `acceptPeer` — thiếu nó là cả đường một-bên-dán chết");
  assert.equal(g.peers.length, 1, "máy vừa nhận phải được ghi vào sổ để lần sau khỏi làm quen lại");
});

// ── CHỖ CHỜ TỰ GIỮ PHẢI SỐNG CÙNG KÊNH, không chết sau một trần ───────────────────────
//
// 🔴 Bug thật 2026-09-21, đọc được thẳng trong `daemon.log`: chỗ chờ mở lúc `14:42:20Z`, đóng
// lúc `14:52:57Z` sau 300 vòng, rồi **im tới hết ngày**. Từ phút thứ 11 trở đi máy này không
// còn ai nghe cổng đục lỗ, trong khi bề mặt vẫn khai *"máy nào có mã của máy này đều gọi vào
// được"*. Một lời hứa hết hạn sau 10 phút mà không ai nói là hỏng nặng hơn không hứa.
test("chỗ chờ tự giữ: hết trần thì MỞ LẠI; người bấm thì KHÔNG; tắt kênh thì THÔI", (t) => {
  const root = tempDir(t, "zemory-renew-");
  const p1 = 23600 + Math.floor(Math.random() * 100) * 3;
  const out = runInMemoryChild(root, [
    'const ch = await import("file://" + process.env.Z_DIST + "/memory/channel/index.js");',
    "const nap = (ms) => new Promise((r) => setTimeout(r, ms));",
    // 🔴 CHỜ THEO ĐIỀU KIỆN, KHÔNG THEO ĐỒNG HỒ. Bản đầu lấy mẫu ở những mốc cố định và nó đỏ
    // trong lượt quét đầy đủ: gate chạy trong lồng Job Object ưu tiên thấp nên cùng một ca mất
    // 18,6 s thay vì 13,8 s, và mọi mốc đều trượt. Một cổng đỏ vì máy đang bận là cổng dạy người
    // đọc bỏ qua chính nó.
    "const doi = async (dieuKien, tranMs) => {",
    "  const het = Date.now() + tranMs;",
    "  while (Date.now() < het) { if (dieuKien()) return true; await nap(200); }",
    "  return false;",
    "};",
    'const base = { shareKey: "chia-test", appVersion: "test", allowedPeers: [], waitMs: 3000, roundMs: 300 };',
    "S.setP2pEnabled(true);",
    // ① renew BẬT (chỗ chờ tự giữ): lượt cũ xong ⇒ phải có lượt MỚI.
    "const a1 = ch.armPunchWait({ ...base, target: null, localPort: " + p1 + ", renew: true });",
    "const moi = await doi(() => { const s = ch.punchWaitState(); return s && s.since !== a1.since; }, 60000);",
    "ch.cancelPunchWait();",
    "out.push({ moi });",
    // ② renew TẮT (đúng hình dạng cú bấm của người dùng): xong là xong, không tự mở lại.
    'const b1 = ch.armPunchWait({ ...base, target: { host: "203.0.113.1", port: 9 }, localPort: ' + (p1 + 1) + " });",
    "const bXong = await doi(() => { const s = ch.punchWaitState(); return s && s.outcome; }, 60000);",
    // Đã có kết cục rồi thì chờ thêm QUÁ sàn mở lại để chắc chắn nó không tự mở.
    "await nap(5000);",
    "const b2 = ch.punchWaitState();",
    "ch.cancelPunchWait();",
    "out.push({ bXong, doiSlot: b2 ? b2.since !== b1.since : null });",
    // ③ TẮT KÊNH giữa chừng ⇒ không được mở lại (giữ lỗ NAT cho một kênh đã tắt là §F15 cấm).
    "const c1 = ch.armPunchWait({ ...base, target: null, localPort: " + (p1 + 2) + ", renew: true });",
    "await nap(600); S.setP2pEnabled(false);",
    "const cXong = await doi(() => { const s = ch.punchWaitState(); return s && s.outcome; }, 60000);",
    "await nap(5000);",
    "const c2 = ch.punchWaitState();",
    "ch.cancelPunchWait();",
    "out.push({ cXong, doiSlot: c2 ? c2.since !== c1.since : null });",
  ].join("\n"));

  const [renewOn, renewOff, afterOff] = out;
  // ① Lượt MỚI phải xuất hiện — đó là toàn bộ bất biến: hết trần mà không mở lại thì máy thôi
  // nghe cổng đục lỗ, im lặng, trong khi bề mặt vẫn hứa "máy nào có mã đều gọi vào được".
  assert.equal(renewOn.moi, true, "hết trần mà không mở lại ⇒ máy thôi nghe cổng đục lỗ, im lặng");
  // ② CA ÂM: chỗ chờ của một cú bấm là việc có hạn — tự mở lại mãi là giữ lỗ cho việc người dùng
  // tưởng đã xong.
  assert.equal(renewOff.bXong, true, "chỗ chờ phải đóng lại và mang kết cục");
  assert.equal(renewOff.doiSlot, false, "chỗ chờ của một cú bấm KHÔNG được tự mở lại");
  // ③ CA ÂM: tắt kênh = tắt mọi thứ của kênh.
  assert.equal(afterOff.cXong, true, "tắt kênh rồi thì lượt đang giữ phải đóng lại, không treo lơ lửng");
  assert.equal(afterOff.doiSlot, false, "tắt kênh rồi mà vẫn mở lượt MỚI ⇒ giữ lỗ NAT cho một kênh đã tắt (§F15)");
});
