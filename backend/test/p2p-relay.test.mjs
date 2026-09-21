// RELAY CỦA ZEMORY — tầng 4 của chồng kết nối (plan/24 §7 ⑧). Ba cổng, mỗi cổng một câu:
//   ① hai máy KHÔNG thấy nhau vẫn hội tụ về CÙNG MỘT TẬP khối khi đi qua relay;
//   ② ca ÂM: relay không bao giờ nhìn thấy plaintext của phiên (mọi byte sau khi ghép là TLS);
//   ③ ca ÂM: gọi tới máy KHÔNG đang chờ ở relay ⇒ báo lỗi rõ, không phiên nào mở.
// Cả ba chạy trên loopback với ba tiến trình logic (relay · nghe · gọi) trong một tiến trình test —
// đúng khuôn phép ①③④⑤ của §6b: giao thức đo được mà không cần hai máy thật.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  exportMemoryBundle,
  writeMemoryShareKey,
  appendChunkVerified,
  listContainerChunks,
  chunkBlockId,
  isContainer,
} from "../../dist/memory/share.js";
import { openMemory } from "../../dist/memory/db.js";
import { loadOrCreateIdentity } from "../../dist/memory/channel/identity.js";
import { serveRelay, joinRelay, connectViaRelay } from "../../dist/memory/channel/relay.js";
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
async function addBlock(t, channelDir, keyPath, tag) {
  const work = tempDir(t, "zemory-rblk-");
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
  const root = tempDir(t, `zemory-relay-${name}-`);
  const channelDir = join(root, "channel");
  mkdirSync(channelDir, { recursive: true });
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  if (shareSecret) writeFileSync(keyPath, `${shareSecret}\n`);
  const shareKey = readFileSync(keyPath, "utf8").trim();
  const identity = loadOrCreateIdentity(join(root, "id"), `zemory-${name}`);
  return { root, channelDir, keyPath, shareKey, identity };
}
const opts = (side, peers, extra = {}) => ({
  channelDir: side.channelDir,
  identity: side.identity,
  shareKey: side.shareKey,
  allowedPeers: peers,
  appVersion: APP_VERSION,
  timeoutMs: 20_000,
  ...extra,
});
const waitFor = async (pred, ms = 5000) => {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
};

test("p2p-relay: hai máy KHÔNG gọi thẳng được nhau vẫn hội tụ về cùng một tập khối qua relay", async (t) => {
  const secret = "cung-mot-chia-share-relay";
  const A = makeSide(t, "a", secret);
  const B = makeSide(t, "b", secret);
  await addBlock(t, A.channelDir, A.keyPath, "chi-A-co");
  await addBlock(t, B.channelDir, B.keyPath, "chi-B-co");
  assert.notDeepEqual(blockIdsOf(A.channelDir), blockIdsOf(B.channelDir), "đầu vào phải khác nhau mới đo được gì");

  const relay = await serveRelay({ port: 0, host: "127.0.0.1" });
  const ra = { host: "127.0.0.1", port: relay.port };
  let serverOutcome = null;
  // B là máy sau NAT: nó KHÔNG mở cổng nào, chỉ giữ hộp thư ở relay.
  const join = joinRelay(ra, opts(B, [A.identity.deviceId]), { onSession: (r) => { serverOutcome = r; } });
  try {
    assert.ok(await waitFor(() => join.connected()), "B phải giữ được hộp thư ở relay");
    assert.equal(relay.waiting(), 1);
    const client = await connectViaRelay(ra, B.identity.deviceId, opts(A, [B.identity.deviceId]));
    assert.equal(client.error, undefined, `gọi qua relay hỏng: ${client.error}`);
    assert.equal(client.peerDeviceId, B.identity.deviceId);
    assert.ok(await waitFor(() => serverOutcome !== null, 10_000), "bên nghe phải đóng sổ phiên");
    assert.equal(serverOutcome.error, undefined);
    assert.deepEqual(blockIdsOf(A.channelDir), blockIdsOf(B.channelDir), "TẬP khối hai máy phải BẰNG NHAU (HP điều 16)");
    assert.equal(blockIdsOf(A.channelDir).length, 2, "mỗi bên nhận đúng một khối của bên kia");
  } finally {
    join.stop();
    relay.close();
  }
});

test("p2p-relay: ca ÂM — relay KHÔNG nhìn thấy một byte plaintext nào của phiên", async (t) => {
  const secret = "cung-chia";
  const A = makeSide(t, "a2", secret);
  const B = makeSide(t, "b2", secret);
  await addBlock(t, A.channelDir, A.keyPath, "khoi-cua-A");
  const seen = [];
  const relay = await serveRelay({ port: 0, host: "127.0.0.1", observe: (b) => seen.push(Buffer.from(b)) });
  const ra = { host: "127.0.0.1", port: relay.port };
  const join = joinRelay(ra, opts(B, [A.identity.deviceId]));
  try {
    assert.ok(await waitFor(() => join.connected()));
    const r = await connectViaRelay(ra, B.identity.deviceId, opts(A, [B.identity.deviceId]));
    assert.equal(r.error, undefined);
    const piped = Buffer.concat(seen).toString("latin1");
    assert.ok(seen.length > 0, "relay phải có chuyển byte — không thì phép này chưa đo gì");
    // Ba dấu plaintext của giao thức phiên: tin `hello`, tin `have`, và chính device ID trong `hello`.
    for (const marker of ['"t":"hello"', '"t":"have"', A.identity.deviceId]) {
      assert.ok(!piped.includes(marker), `relay đọc được plaintext: ${marker.slice(0, 20)}`);
    }
  } finally {
    join.stop();
    relay.close();
  }
});

test("p2p-relay: ca ÂM — gọi tới máy KHÔNG đang chờ ⇒ lỗi rõ, không phiên nào mở", async (t) => {
  const A = makeSide(t, "a3", "chia-x");
  const relay = await serveRelay({ port: 0, host: "127.0.0.1" });
  try {
    const r = await connectViaRelay({ host: "127.0.0.1", port: relay.port }, "KHONG-CO-AI-DANG-CHO", opts(A, []));
    assert.ok(r.error, "phải có lỗi");
    assert.match(r.error, /không đang chờ/, "lý do phải nói ĐÚNG: máy kia không ở relay này");
    assert.equal(r.sentBlocks, 0);
    assert.equal(r.receivedBlocks, 0);
  } finally {
    relay.close();
  }
});

// ── MÃ MÁY: một chuỗi mang vân tay + relay, và nó phải NGẮN ─────────────────────────────────────
test("p2p-code: mã máy đi vòng tròn nguyên vẹn, và KHÔNG mang địa chỉ LAN (chúng hết hạn)", async (t) => {
  const { encodeMachineCode, parseMachineCode } = await import("../../dist/memory/channel/index.js");
  const A = makeSide(t, "code", "chia");
  const id = A.identity.deviceId;

  const bare = encodeMachineCode({ fingerprint: id });
  assert.equal(parseMachineCode(bare)?.fingerprint, id, "vân tay phải về nguyên vẹn");
  assert.equal(parseMachineCode(bare)?.relay, undefined);

  const withRelay = encodeMachineCode({ fingerprint: id, relay: "203.0.113.7:21039" });
  assert.equal(parseMachineCode(withRelay)?.fingerprint, id);
  assert.equal(parseMachineCode(withRelay)?.relay, "203.0.113.7:21039", "relay phải về nguyên vẹn");

  // Tên miền (không phải IPv4) đi nhánh chữ — vẫn phải về đúng.
  const named = encodeMachineCode({ fingerprint: id, relay: "relay.example.com:21039" });
  assert.equal(parseMachineCode(named)?.relay, "relay.example.com:21039");

  // 🔴 NGẮN là một yêu cầu, không phải mong muốn: bản JSON+base64 trước đó dài 164 ký tự và tràn
  // cả hàng trên bề mặt. Trần đặt rộng rãi so với mức đo được (~48 / ~58).
  assert.ok(bare.length <= 60, `mã không relay phải ngắn, đang ${bare.length} ký tự`);
  assert.ok(withRelay.length <= 70, `mã có relay phải ngắn, đang ${withRelay.length} ký tự`);

  // ca ÂM — mã KHÔNG được mang địa chỉ LAN: chúng đổi (đo .90 → .81 → .6 trong một ngày) nên dán
  // lại sau là gọi vào chỗ không còn ai.
  for (const s of [bare, withRelay]) assert.ok(!/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:21038/.test(s), "mã không được chứa địa chỉ LAN");

  // ca ÂM — rác không bao giờ được đọc thành mã.
  for (const junk of ["", "khong-phai-ma", "ZM1.", "ZM1.@@@@", id, "10.0.0.1:21038"]) {
    assert.equal(parseMachineCode(junk), null, `phải từ chối: ${junk.slice(0, 20)}`);
  }
});
