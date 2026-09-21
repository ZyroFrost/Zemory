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
import { readFileSync as readSrc } from "node:fs";
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

// ── BỀ MẶT PHẢI THẤY LỚP NÀY — xây rồi mà nút không gọi thì vẫn là 0% dùng được ─────────
test("bề mặt: nút Đồng bộ (/channel-sync) phải GỌI lớp đục lỗ, và thôi khai 'chưa dựng'", () => {
  const UI = readSrc(new URL("../src/ui.ts", import.meta.url), "utf8");

  // Cắt ĐÚNG thân nhánh `/channel-sync` theo MỐC CODE, không theo số ký tự (bẫy "cửa sổ N ký
  // tự" repo đã trả giá nhiều lần: hàm dài thêm một chú thích là phép kiểm rơi ra ngoài).
  const from = UI.indexOf('p === "/channel-sync"');
  assert.ok(from > 0, "không thấy nhánh /channel-sync");
  const to = UI.indexOf('p === "/channel-probe"', from);
  assert.ok(to > from, "không thấy mốc kết thúc nhánh");
  const body = UI.slice(from, to);
  // Soi CHỮ thì phải bỏ CHÚ THÍCH trước. Bản đầu của ca ÂM dưới đây đỏ oan vì chính chú thích
  // trong mã có nhắc lại cụm sai để giải thích vì sao nó bị bỏ — đúng bẫy "cổng quét cả chú
  // thích" repo đã trả giá (cổng light-theme đỏ vì một mã hex nằm trong comment CSS).
  const code = body
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  // Neo vào chỗ GỌI, không vào tên — tên trần vẫn khớp một chú thích hay một định nghĩa, nên
  // vứt hẳn lời gọi đi mà cổng vẫn xanh (bài học `p2pWhy`).
  //
  // 🔄 Neo ĐI THEO bản viết lại: cửa vào nay là `armPunchWait` (MỞ CHỖ CHỜ) chứ không phải
  // `punchToPeer` (chạy một lượt). Bản đầu neo vào `punchToPeer` và đỏ ngay khi hành vi được
  // sửa cho ĐÚNG — đúng thứ `02_RULES` gọi là neo test không theo bản viết lại.
  assert.match(code, /ch\.armPunchWait\(/, "nhánh /channel-sync phải MỞ CHỖ CHỜ, không chỉ nhắc tên nó");

  // 🔴 CA ÂM QUAN TRỌNG NHẤT của cả ca này: endpoint KHÔNG được `await` một lượt đục lỗ.
  // Đó chính là hình dạng bắt HAI MÁY BẤM CÙNG LÚC — user bác thẳng: *"ai lại canh đi bấm
  // cùng lúc"*. Quay lại hình dạng đó là quay lại đúng cái lỗi đã được chỉ ra.
  assert.ok(
    !/await ch\.punchToPeer\(/.test(code),
    "endpoint await một lượt đục lỗ ⇒ lại bắt hai máy bấm cùng lúc",
  );

  // Cổng đục lỗ KHÔNG được là cổng daemon đang nghe — nửa NGHE sẽ trượt sạch.
  // Neo ĐI THEO bản viết lại: số `+1` gõ tay đã thành `punchPortOf`, để hai máy không bao giờ
  // suy ra hai số khác nhau.
  assert.match(code, /localPort:\s*ch\.punchPortOf\(st\.port\)/, "phải lệch khỏi cổng daemon, qua hàm suy chung");
  assert.match(code, /ch\.punchPortOf\(target\.port\)/, "phải nhắm CỔNG ĐỤC LỖ của máy kia, không nhắm cổng nghe của nó");

  // Chỗ chờ sống tới hàng PHÚT trong daemon ⇒ bề mặt phải đọc được nó ở trạng thái, không chỉ
  // trong câu trả lời của cú bấm: đóng hộp thoại rồi mở lại vẫn phải thấy đang chờ ai.
  const status = UI.slice(UI.indexOf('p === "/channel-status"'), UI.indexOf('p === "/channel-sync"'));
  assert.match(status, /punchWait: ch\.punchWaitState\(\)/, "/channel-status phải phơi chỗ chờ, nếu không trạng thái nền là vô hình");

  // Bấm rồi phải biết NÓ ĐANG CHỜ. Trả `ok:true` với 0 khối mà không có cờ này thì bề mặt in
  // "✓ gửi 0 · nhận 0" cho một việc chưa xảy ra.
  assert.match(code, /waiting: true/, "phải có cờ waiting, không để bề mặt đọc thành đã xong");

  // Một chỗ chờ KHÔNG rút lại được là một cái bẫy — nó giữ lỗ và bắn đều trong nhiều phút.
  // Cửa huỷ phải nằm trên CÙNG endpoint, không đẻ verb thứ hai (HP điều 17).
  assert.match(code, /cancelPunchWait\(\)/, "phải có cửa HUỶ chỗ chờ");
  assert.match(code, /cancel"\) === "1"/, "huỷ phải đi qua CÙNG endpoint, không đẻ cửa thứ hai");

  // Bất biến: tắt kênh = tắt MỌI thứ của kênh. Chỗ chờ sống sau khi gạt tắt là giữ lỗ NAT mở
  // cho một kênh người dùng vừa tắt — công tắc không tắt thật (§F15).
  const CH = readSrc(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  const off = CH.slice(CH.indexOf("export async function startChannelServer"), CH.indexOf("export function stopChannelServer"));
  assert.match(off, /cancelPunchWait\(\);/, "tắt kênh phải đóng luôn chỗ chờ");

  // CA ÂM: câu "đục lỗ NAT chưa dựng" nay là một lời khai SAI — bề mặt không được nói nó nữa.
  assert.ok(
    !/đục lỗ NAT chưa dựng"/.test(code),
    "bề mặt còn khai 'đục lỗ NAT chưa dựng' trong khi lớp đó đã dựng — bề mặt nói dối",
  );
  // ...và phải nói đúng thứ ĐANG thiếu: địa chỉ ngoài.
  assert.match(code, /ĐỊA CHỈ NGOÀI/, "phải nêu đúng thứ còn thiếu là địa chỉ, không phải lớp đục lỗ");

  // 🔴 CA ÂM: bề mặt KHÔNG được dặn "bấm cùng lúc" nữa. Câu đó đúng với bản một-lượt-20-giây và
  // SAI từ khi có chỗ chờ — user thấy đúng nó trên màn hình rồi hỏi *"sao kì vậy?"*. Một câu
  // hướng dẫn đã hết đúng thì tệ hơn không có câu nào.
  assert.ok(!/CÙNG LÚC/.test(code), "bề mặt còn dặn bấm CÙNG LÚC trong khi đã có chỗ chờ");
  assert.match(code, /chỗ chờ/, "phải nói ra cơ chế thật: bên dán trước mở chỗ chờ");
});

// ── MÃ MANG ĐỊA CHỈ NGOÀI — mảnh mở ca KHÁC MẠNG bằng một chuỗi ────────────────────────
test("mã: chở được ĐỊA CHỈ NGOÀI, và mã KHÔNG có địa chỉ vẫn đọc được (tương thích ngược)", async () => {
  const { encodeMachineCode, parseMachineCode, punchPortOf } = await import("../../dist/memory/channel/index.js");
  const id = "HMVEQRS7-IJADAN5J-JLKQQUD2-Q32CWNBK-S6N4WZF5-B3JBFHCI-EV4WLIQ5-XXA2";

  // Địa chỉ tài liệu RFC 5737 — công khai về mặt dải, không phải của ai.
  const withAddr = encodeMachineCode({ fingerprint: id, external: { host: "203.0.113.7", port: 21038 } });
  const back = parseMachineCode(withAddr);
  assert.equal(back?.fingerprint, id, "vân tay phải về nguyên vẹn");
  assert.deepEqual(back?.external, { host: "203.0.113.7", port: 21038 }, "địa chỉ ngoài phải về nguyên vẹn");

  // Vẫn phải NGẮN. Bản JSON+base64 từng dài 164 ký tự và tràn cả hàng trên bề mặt.
  assert.ok(withAddr.length <= 80, `mã có địa chỉ phải ngắn, đang ${withAddr.length} ký tự`);

  // Mã KHÔNG địa chỉ vẫn hợp lệ — đó là mã của máy chưa đo được địa chỉ ngoài.
  const bare = encodeMachineCode({ fingerprint: id });
  assert.equal(parseMachineCode(bare)?.fingerprint, id);
  assert.equal(parseMachineCode(bare)?.external, undefined, "không có địa chỉ thì phải là undefined, không bịa");
  assert.ok(bare.length <= 60, `mã trần phải ngắn, đang ${bare.length} ký tự`);

  // Cổng đục lỗ suy TẤT ĐỊNH — hai máy phải ra cùng số, không ai gõ.
  assert.equal(punchPortOf(21038), 21039);
  assert.equal(punchPortOf(back.external.port), 21039, "máy kia suy ra đúng cổng đục lỗ từ cổng trong mã");
});

test("CA ÂM: mã KHÔNG được chở địa chỉ dải RIÊNG — đúng cái bẫy đã gỡ 21/09c", async () => {
  const { encodeMachineCode, parseMachineCode, publicIpv4Bytes } = await import(
    "../../dist/memory/channel/index.js"
  );
  const id = "HMVEQRS7-IJADAN5J-JLKQQUD2-Q32CWNBK-S6N4WZF5-B3JBFHCI-EV4WLIQ5-XXA2";

  // Một địa chỉ LAN trong mã là vô dụng ở mạng khác, mà lại làm người dùng tin là dùng được —
  // bề mặt nói dối bằng DỮ LIỆU. Đây chính là vế bị gỡ ngày 2026-09-21c.
  // 🔴 Dựng địa chỉ từ SỐ RỜI, không viết thành chuỗi. Bản đầu của ca này dán thẳng sáu dotted-quad
  // — trong đó có **địa chỉ LAN THẬT của máy đang chạy** — vào một file ĐƯỢC TRACK, và cổng
  // `no-data-in-git` đỏ đúng chỗ nó tồn tại để chặn. Cổng chỉ bắt `192.168.*` và `172.16–31.*`
  // (cố ý tha `10.x` để khỏi báo oan số version), nhưng một địa chỉ nội bộ thật thì không được
  // commit dù cổng có bắt hay không.
  const privateRanges = [
    [192, 168, 1, 39],
    [10, 101, 1, 2],
    [172, 16, 0, 5],
    [127, 0, 0, 1],
    [169, 254, 1, 1],
    [100, 64, 0, 1],
  ].map((o) => o.join("."));
  for (const bad of privateRanges) {
    assert.equal(publicIpv4Bytes(bad), null, `${bad} là dải riêng/loopback, phải bị loại`);
    const s = encodeMachineCode({ fingerprint: id, external: { host: bad, port: 21038 } });
    assert.equal(parseMachineCode(s)?.external, undefined, `mã không được chở ${bad}`);
    assert.ok(s.length <= 60, `địa chỉ bị loại thì mã phải về dạng TRẦN, đang ${s.length} ký tự`);
  }

  // Rác cũng không được thành địa chỉ.
  for (const junk of ["", "abc", "1.2.3", "1.2.3.4.5", "999.1.1.1", "224.0.0.1"]) {
    assert.equal(publicIpv4Bytes(junk), null, `phải loại: ${junk}`);
  }
  // ...và một địa chỉ công khai thật thì phải ĐI QUA (ca dương, để phép lọc không chặn mù).
  assert.ok(publicIpv4Bytes("203.0.113.7"), "địa chỉ công khai phải đi qua");
});

// ── GIỮ LỖ MỞ — đường MỘT BÊN DÁN ──────────────────────────────────────────────────────
test("giữ lỗ: bật kênh phải tự mở một chỗ chờ KHÔNG nhắm máy nào", () => {
  const CH = readSrc(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  const start = CH.slice(CH.indexOf("export async function startChannelServer"), CH.indexOf("export function stopChannelServer"));

  // Không có dòng này thì máy chỉ NGHE trên cổng kênh — mà nó không thể tự mở lỗ trên chính cổng
  // đó (`EADDRINUSE`), nên máy kia dán mã cũng không vào được. Đây là mảnh của đường một-bên.
  assert.match(start, /armPunchWait\(\{\s*\n?\s*target: null/, "bật kênh phải tự giữ một lỗ mở");
  assert.match(start, /localPort: punchPortOf\(server\.port\)/, "lỗ phải mở ở cổng ĐỤC LỖ, không phải cổng nghe");

  // CA ÂM: không được đè một chỗ chờ đang nhắm một máy CỤ THỂ — cái đó đang làm việc cụ thể hơn.
  assert.match(start, /punchWaitState\(\)/, "phải xem có chỗ chờ nào đang nhắm máy cụ thể không");

  // Địa chỉ ngoài phải được đo ở NỀN lúc bật, để mã mang được nó từ lượt vẽ đầu.
  assert.match(start, /refreshExternalAddress\(server\.port\)/, "bật kênh phải đo địa chỉ ngoài ở nền");

  // 🔴 ĐÓNG là đóng MỌI thứ của kênh. Thiếu vế này thì một lượt bật-rồi-tắt để lại một vòng đục
  // lỗ chạy 10 phút: trong daemon là giữ lỗ NAT cho một kênh ĐÃ TẮT, và trong một tiến trình test
  // thì bộ hẹn giờ của nó giữ event loop sống ⇒ **cổng treo**. Đã xảy ra thật: lượt quét đầy đủ
  // đứng im ở nhóm `p2p-channel` đúng vì lý do này.
  const stop = CH.slice(CH.indexOf("export function stopChannelServer"), CH.indexOf("export function stopChannelServer") + 700);
  assert.match(stop, /cancelPunchWait\(\);/, "đóng kênh phải đóng luôn chỗ chờ, nếu không nó chạy tiếp 10 phút");
});
