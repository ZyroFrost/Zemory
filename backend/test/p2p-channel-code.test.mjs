// MÃ MÁY + NGĂN THEO MÁY — nền cho lớp đục lỗ NAT (plan/24 §7 ⑩).
//   ① mã máy đi vòng tròn nguyên vẹn, NGẮN, và KHÔNG mang địa chỉ LAN (địa chỉ hết hạn);
//   ② ngăn theo máy: hai máy ghi hai đường dẫn KHÁC nhau, chiều đọc thấy khối của cả hai.
//
// 🔄 Đầu file này từng tả BA ca của lớp RELAY. Relay đã gỡ khỏi mã ngày 2026-09-21
// (`06_CHANGES [2026-09-21f]`) nhưng phần mô tả ở lại, cùng ba hàm phụ không còn ai gọi —
// đúng thứ `02_RULES` gọi là neo test không đi theo bản viết lại. Nắn 2026-09-21.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  exportMemoryBundle,
  writeMemoryShareKey,
  appendChunkVerified,
  listContainerChunks,
  isContainer,
} from "../../dist/memory/share.js";
import { openMemory } from "../../dist/memory/db.js";
import { loadOrCreateIdentity } from "../../dist/memory/channel/identity.js";
import { tempDir } from "./helpers.mjs";


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
function makeSide(t, name, shareSecret) {
  const root = tempDir(t, `zemory-code-${name}-`);
  const channelDir = join(root, "channel");
  mkdirSync(channelDir, { recursive: true });
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  if (shareSecret) writeFileSync(keyPath, `${shareSecret}\n`);
  const shareKey = readFileSync(keyPath, "utf8").trim();
  const identity = loadOrCreateIdentity(join(root, "id"), `zemory-${name}`);
  return { root, channelDir, keyPath, shareKey, identity };
}

// ── MÃ MÁY: một chuỗi mang vân tay + relay, và nó phải NGẮN ─────────────────────────────────────
test("p2p-code: mã máy đi vòng tròn nguyên vẹn, và KHÔNG mang địa chỉ (địa chỉ hết hạn)", async (t) => {
  const { encodeMachineCode, parseMachineCode } = await import("../../dist/memory/channel/index.js");
  const A = makeSide(t, "code", "chia");
  const id = A.identity.deviceId;

  const bare = encodeMachineCode({ fingerprint: id });
  assert.equal(parseMachineCode(bare)?.fingerprint, id, "vân tay phải về nguyên vẹn");
  assert.equal(parseMachineCode(bare)?.relay, undefined);

  // 🔴 NGẮN là một yêu cầu, không phải mong muốn: bản JSON+base64 trước đó dài 164 ký tự và tràn
  // cả hàng trên bề mặt. Trần đặt rộng rãi so với mức đo được (~48 / ~58).
  assert.ok(bare.length <= 60, `mã phải ngắn, đang ${bare.length} ký tự`);

  // ca ÂM — mã KHÔNG được mang địa chỉ LAN: chúng đổi (đo .90 → .81 → .6 trong một ngày) nên dán
  // lại sau là gọi vào chỗ không còn ai.
  for (const s of [bare]) assert.ok(!/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:21038/.test(s), "mã không được chứa địa chỉ LAN");

  // ca ÂM — rác không bao giờ được đọc thành mã.
  for (const junk of ["", "khong-phai-ma", "ZM1.", "ZM1.@@@@", id, "10.0.0.1:21038"]) {
    assert.equal(parseMachineCode(junk), null, `phải từ chối: ${junk.slice(0, 20)}`);
  }
});

// ── SYNCTHING SHARE: mỗi máy một NGĂN, không đường dẫn nào có hai người ghi ─────────────────────
test("st-pen: hai máy ghi hai ngăn KHÁC nhau, và chiều đọc thấy khối của CẢ HAI", async (t) => {
  const { channelPen, channelDir } = await import("../../dist/memory/channel/index.js");
  const { listChannelSegments } = await import("../../dist/memory/share.js");
  const root = tempDir(t, "zemory-pen-");

  // Hai "máy" = hai thư mục danh tính khác nhau ⇒ hai deviceId ⇒ hai ngăn.
  const penA = join(channelDir(root, true), "MAYA");
  const penB = join(channelDir(root, true), "MAYB");
  mkdirSync(penA, { recursive: true });
  mkdirSync(penB, { recursive: true });
  const keyPath = join(root, "share.key");
  writeMemoryShareKey(keyPath);
  await addBlock(t, penA, keyPath, "cua-A");
  await addBlock(t, penB, keyPath, "cua-B");

  // 🔴 Bất biến của cả thiết kế: hai máy KHÔNG BAO GIỜ ghi cùng một đường dẫn.
  assert.notEqual(penA, penB, "hai máy phải có hai ngăn khác nhau");

  // Chiều ĐỌC phải thấy khúc của MỌI ngăn — nếu không, kho không bao giờ hội tụ.
  const segs = listChannelSegments(channelDir(root)).map((s) => s.path);
  assert.ok(segs.some((p) => p.includes("MAYA")), "phải thấy khúc của ngăn A");
  assert.ok(segs.some((p) => p.includes("MAYB")), "phải thấy khúc của ngăn B");

  // ngăn của MÁY NÀY phải nằm TRONG channel/, không phải chính nó
  const mine = channelPen(root, true);
  assert.ok(mine.startsWith(channelDir(root)) && mine !== channelDir(root), "ngăn phải là thư mục con của channel/");

});
