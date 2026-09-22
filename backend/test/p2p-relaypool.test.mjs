// RELAY qua cụm CÔNG KHAI của Syncthing — tầng 4 của plan/24 §1c.
//
// 🔴 Vì sao tầng này phải có: đục lỗ chỉ ăn khi ít nhất một đầu gọi vào được, mà `§6d` đã đo **cả
// hai** đầu kín NAT. Lúc đó BẮT BUỘC có máy thứ ba — sự thật vật lý, không code nào thay được.
// ⛔ Nhưng máy thứ ba KHÔNG phải máy của user: bản 21/09 dựng relay TỰ HOST rồi phải gỡ vì trượt
// `§1a-0`. Cụm công khai giải đúng ca đó — ~100 relay, miễn phí, không tài khoản; ta là CLIENT.
//
// ⚠ Cụm này soi KHUÔN TIN + GIAO THỨC bằng relay GIẢ cục bộ (tất định, không chạm mạng thật).
// Nó KHÔNG chứng minh hai máy khác mạng nối được — phép đó chỉ hai máy thật trả lời (`§11.4` điều
// 3). Lượt đo với cụm THẬT ngày 23/09 ghi ở `§1c-d`.
import assert from "node:assert/strict";
import test from "node:test";
import tls from "node:tls";
import net from "node:net";
import {
  parseRelayUrl,
  frameMessage,
  bytesField,
  readFrames,
  parseInvitation,
  joinRelay,
  connectViaRelay,
  openRelaySession,
  fetchRelayPool,
  RELAY_MAGIC,
  RELAY_MSG,
} from "../../dist/memory/channel/relaypool.js";
import { loadOrCreateIdentity } from "../../dist/memory/channel/identity.js";
import { tempDir } from "./helpers.mjs";
import { readFileSync as readSrc } from "node:fs";

const identityFor = (t) => loadOrCreateIdentity(tempDir(t, "zemory-relay-id-"));

/** Dựng thân `SessionInvitation` đúng khuôn của họ — dùng để soi phép giải mã. */
function invitationBody({ from, key, addr = Buffer.alloc(0), port = 22067, serverSocket = true }) {
  const parts = [bytesField(from), bytesField(key), bytesField(addr)];
  const tail = Buffer.alloc(8);
  tail.writeUInt32BE(port, 0);
  tail.writeUInt32BE(serverSocket ? 1 : 0, 4);
  return Buffer.concat([...parts, tail]);
}

/** Thân `Response`: `<mã i32><độ dài i32><thông điệp>`. */
function responseBody(code, msg = "") {
  const b = Buffer.from(msg, "utf8");
  const h = Buffer.alloc(8);
  h.writeInt32BE(code, 0);
  h.writeInt32BE(b.length, 4);
  return Buffer.concat([h, b]);
}

test("địa chỉ relay: bóc `relay://host:port`, và TỪ CHỐI thứ không phải relay", () => {
  const e = parseRelayUrl("relay://203.0.113.9:22067/?id=ABC&pingInterval=1m0s");
  assert.equal(e.host, "203.0.113.9");
  assert.equal(e.port, 22067);

  // Thiếu cổng ⇒ cổng mặc định của giao thức, không phải `null`: cụm có thật sự trả dạng đó.
  assert.equal(parseRelayUrl("relay://198.51.100.2/").port, 22067);

  // CA ÂM — sai lược đồ hoặc cổng vô nghĩa ⇒ `null`, KHÔNG đoán. Một địa chỉ relay sai làm cả lane
  // treo tới hết trần trong khi các đường khác đã xong từ lâu.
  for (const bad of ["", "tcp://203.0.113.9:22067", "relay://", "relay://203.0.113.9:0", "relay://203.0.113.9:99999", "rác"]) {
    assert.equal(parseRelayUrl(bad), null, `phải bỏ: ${bad}`);
  }
});

test("khung tin: đúng magic, và trường byte có ĐỆM cho tròn 4", () => {
  const f = frameMessage(RELAY_MSG.joinRelay);
  assert.equal(f.length, 12, "tin rỗng vẫn có đủ 12 byte đầu");
  assert.equal(f.readUInt32BE(0), RELAY_MAGIC);
  assert.equal(f.readInt32BE(4), RELAY_MSG.joinRelay);
  assert.equal(f.readInt32BE(8), 0);

  // 🔴 ĐỆM là chỗ dễ quên nhất và nó hỏng CÂM: thiếu đệm thì trường kế đọc lệch vài byte, relay chỉ
  // thấy một tin vô nghĩa rồi lặng lẽ bỏ qua — không có lỗi nào để lần.
  assert.equal(bytesField(Buffer.alloc(32)).length, 36, "32 byte: 4 + 32, đã tròn");
  assert.equal(bytesField(Buffer.alloc(1)).length, 8, "1 byte: 4 + 1 + 3 đệm");
  assert.equal(bytesField(Buffer.alloc(2)).length, 8, "2 byte: 4 + 2 + 2 đệm");
  assert.equal(bytesField(Buffer.alloc(3)).length, 8, "3 byte: 4 + 3 + 1 đệm");
  assert.equal(bytesField(Buffer.alloc(0)).length, 4, "rỗng: chỉ còn độ dài");
});

test("đọc khung: HAI tin trong một gói, và một tin tới làm NHIỀU mảnh", () => {
  // Vòng đọc tự viết thường chỉ xử đúng ca một-tin-một-gói rồi hỏng ở ca kia — mà ca kia chỉ xảy
  // ra lúc mạng bận, tức đúng lúc khó lần nhất.
  const a = frameMessage(RELAY_MSG.ping);
  const b = frameMessage(RELAY_MSG.response, responseBody(0, "success"));

  const two = readFrames(Buffer.concat([a, b]));
  assert.equal(two.frames.length, 2, "hai tin trong MỘT gói phải ra đủ hai");
  assert.equal(two.frames[0].type, RELAY_MSG.ping);
  assert.equal(two.frames[1].type, RELAY_MSG.response);
  assert.equal(two.rest.length, 0);

  // Mảnh: cắt giữa thân tin thứ hai ⇒ chỉ ra tin đầu, phần thừa giữ nguyên chờ mảnh sau.
  const joined = Buffer.concat([a, b]);
  const cut = readFrames(joined.subarray(0, a.length + 14));
  assert.equal(cut.frames.length, 1, "tin chưa đủ thì CHƯA được trả");
  assert.equal(cut.bad, false, "thiếu byte KHÔNG phải luồng hỏng — chỉ là chưa tới");
  const rest = readFrames(Buffer.concat([cut.rest, joined.subarray(a.length + 14)]));
  assert.equal(rest.frames.length, 1, "nối mảnh sau vào là đọc được");

  // CA ÂM: magic sai ⇒ `bad`, để lớp gọi ĐÓNG. Đọc tiếp một luồng lạ là tự dựng một chỗ hỏng mới.
  assert.equal(readFrames(Buffer.from("không phải relay đâu nhé!!")).bad, true);
  // 🔴 Ca âm trên MỘT MÌNH chưa đủ, và đột biến chứng minh điều đó: bỏ hẳn phép kiểm magic mà cổng
  // vẫn xanh, vì chuỗi kia có "độ dài" khổng lồ nên chốt TRẦN bắt thay. Nên cần một luồng lạ mà độ
  // dài trông HỢP LỆ — chỉ phép kiểm magic mới chặn được nó.
  const sane = Buffer.alloc(16);
  sane.writeUInt32BE(0x12345678, 0); // magic sai
  sane.writeInt32BE(RELAY_MSG.ping, 4);
  sane.writeInt32BE(4, 8); // độ dài nhỏ, hợp lệ
  assert.equal(readFrames(sane).bad, true, "magic sai vẫn phải chặn, kể cả khi độ dài trông hợp lệ");
  // CA ÂM: độ dài khổng lồ ⇒ `bad`, không cấp phát theo lời một máy lạ.
  const huge = Buffer.alloc(12);
  huge.writeUInt32BE(RELAY_MAGIC, 0);
  huge.writeInt32BE(RELAY_MSG.ping, 4);
  huge.writeInt32BE(1 << 30, 8);
  assert.equal(readFrames(huge).bad, true);
});

test("lời mời phiên: giải mã đúng, và ĐỊA CHỈ RỖNG là ca thường chứ không phải lỗi", () => {
  const from = Buffer.alloc(32, 7);
  const key = Buffer.alloc(32, 9);

  // Đo 23/09 với cụm THẬT: cả hai lời mời đều trả `address` 0 byte, nghĩa là *nối về chính relay
  // này*. Coi rỗng là hỏng thì lane chết ở đúng ca phổ biến nhất.
  const empty = parseInvitation(invitationBody({ from, key }));
  assert.equal(empty.host, null, "rỗng ⇒ null để người gọi điền host của relay");
  assert.equal(empty.port, 22067);
  assert.equal(empty.serverSocket, true);
  assert.deepEqual(empty.from, from);
  assert.deepEqual(empty.key, key);

  // Có địa chỉ 4 byte ⇒ IPv4.
  const withAddr = parseInvitation(invitationBody({ from, key, addr: Buffer.from([203, 0, 113, 9]) }));
  assert.equal(withAddr.host, "203.0.113.9");

  // 🔴 RELAY PHÂN VAI — đây là món quà của giao thức này. Lớp đục lỗ không có nó: ở đó vai do cú
  // bắt tay nào ăn trước quyết định, tức TUNG ĐỒNG XU, và đó đúng là họ lỗi đã đốt nhiều ngày.
  assert.equal(parseInvitation(invitationBody({ from, key, serverSocket: false })).serverSocket, false);

  // CA ÂM: thân cụt · thiếu trường · khoá rỗng ⇒ `null`, không đoán.
  assert.equal(parseInvitation(Buffer.alloc(0)), null);
  assert.equal(parseInvitation(Buffer.alloc(8)), null);
  assert.equal(parseInvitation(invitationBody({ from, key, port: 0 })), null, "cổng 0 không phải cổng");
  assert.equal(parseInvitation(invitationBody({ from: Buffer.alloc(0), key })), null, "thiếu ID người gửi");
  assert.equal(parseInvitation(invitationBody({ from, key: Buffer.alloc(0) })), null, "thiếu khoá phiên");
});

/**
 * Relay GIẢ. `plan` quyết nó trả gì cho từng tin nhận được.
 *
 * Phải là TLS thật vì lớp gọi xuất trình chứng chỉ client — chạy trên TCP trần thì cổng xanh mà
 * đường thật vẫn hỏng.
 */
async function fakeRelay(t, handle) {
  const id = identityFor(t);
  const srv = tls.createServer({ key: id.keyPem, cert: id.certPem, requestCert: true, rejectUnauthorized: false }, (sock) => {
    let buf = Buffer.alloc(0);
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      const r = readFrames(buf);
      buf = r.rest;
      for (const f of r.frames) handle(sock, f);
    });
    sock.on("error", () => {});
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  return { host: "127.0.0.1", port: srv.address().port, url: `relay://127.0.0.1:${srv.address().port}`, srv };
}

test("tham gia cụm: nhận lời mời, và TRẢ LỜI PING — thiếu pong là chết lặng", async (t) => {
  let sawPong = false;
  const from = Buffer.alloc(32, 3);
  const key = Buffer.alloc(32, 4);
  const ep = await fakeRelay(t, (sock, f) => {
    if (f.type === RELAY_MSG.joinRelay) {
      sock.write(frameMessage(RELAY_MSG.response, responseBody(0, "success")));
      sock.write(frameMessage(RELAY_MSG.ping));
      setTimeout(() => sock.write(frameMessage(RELAY_MSG.invite, invitationBody({ from, key }))), 60);
    } else if (f.type === RELAY_MSG.pong) {
      sawPong = true;
    }
  });

  // ⚠ Phải ĐÓNG chỗ tham gia: nó giữ một kết nối THƯỜNG TRỰC (đúng bản chất của vai nghe), nên bỏ
  // quên là tiến trình test không bao giờ thoát — bắt được đúng như vậy khi lượt đầu treo.
  let join;
  t.after(() => join?.stop());
  const got = await new Promise((resolve, reject) => {
    joinRelay({
      endpoint: ep,
      identity: identityFor(t),
      onInvite: (inv) => resolve(inv),
      timeoutMs: 6000,
    }).then((h) => (join = h), reject);
    setTimeout(() => reject(new Error("không nhận được lời mời")), 6000);
  });
  assert.deepEqual(got.from, from, "lời mời phải tới tay lớp gọi");

  // 🔴 Relay đá ra client nào im. Bỏ nhánh pong thì lane chạy vài phút rồi chết lặng — không lỗi,
  // không log, chỉ là một hôm nào đó không ai gọi vào được nữa. Kiểu hỏng khó lần nhất.
  assert.equal(sawPong, true, "phải trả lời PING bằng PONG, nếu không relay sẽ đá ra");
});

test("tham gia cụm: relay TỪ CHỐI hoặc ĐẦY ⇒ ném, không treo", async (t) => {
  const busy = await fakeRelay(t, (sock, f) => {
    if (f.type === RELAY_MSG.joinRelay) sock.write(frameMessage(RELAY_MSG.relayFull));
  });
  await assert.rejects(
    joinRelay({ endpoint: busy, identity: identityFor(t), onInvite: () => {}, timeoutMs: 4000 }),
    /đầy/,
    "relay đầy phải báo ra, để lớp trên thử relay khác",
  );

  const no = await fakeRelay(t, (sock, f) => {
    if (f.type === RELAY_MSG.joinRelay) sock.write(frameMessage(RELAY_MSG.response, responseBody(9, "nope")));
  });
  await assert.rejects(
    joinRelay({ endpoint: no, identity: identityFor(t), onInvite: () => {}, timeoutMs: 4000 }),
    /từ chối/,
  );
});

test("xin phiên: gửi ĐÚNG ID máy kia, và ID méo ⇒ 0 lời gọi mạng", async (t) => {
  let sawId = null;
  let hits = 0;
  const ep = await fakeRelay(t, (sock, f) => {
    hits += 1;
    if (f.type === RELAY_MSG.connect) {
      const n = f.body.readUInt32BE(0);
      sawId = f.body.subarray(4, 4 + n);
      sock.write(frameMessage(RELAY_MSG.invite, invitationBody({ from: sawId, key: Buffer.alloc(32, 1), serverSocket: false })));
    }
  });

  const peer = identityFor(t);
  const inv = await connectViaRelay({ endpoint: ep, identity: identityFor(t), peerDeviceId: peer.deviceId, timeoutMs: 5000 });
  assert.ok(inv, "phải nhận được lời mời");
  assert.equal(sawId.length, 32, "ID trên dây là 32 byte THÔ, không phải chuỗi hiển thị");
  assert.equal(inv.serverSocket, false, "bên GỌI nhận vai client — relay phân, ta không đoán");

  // CA ÂM: ID méo ⇒ đừng chạm mạng. Một lời gọi cho ID ta BIẾT là méo chỉ tổ ăn ngân sách của lượt.
  const before = hits;
  assert.equal(await connectViaRelay({ endpoint: ep, identity: identityFor(t), peerDeviceId: "ABC", timeoutMs: 3000 }), null);
  assert.equal(hits, before, "ID méo ⇒ 0 lời gọi");
});

test("xin phiên: máy kia KHÔNG có trên relay này ⇒ null, không ném", async (t) => {
  const ep = await fakeRelay(t, (sock, f) => {
    if (f.type === RELAY_MSG.connect) sock.write(frameMessage(RELAY_MSG.response, responseBody(3, "not found")));
  });
  const peer = identityFor(t);
  const r = await connectViaRelay({ endpoint: ep, identity: identityFor(t), peerDeviceId: peer.deviceId, timeoutMs: 4000 });
  assert.equal(r, null, "đây là đường CUỐI — im lặng nhường, không ném lên lớp trên (điều 9)");
});

test("mở ống byte: vào phiên xong phải TRẢ LẠI byte thừa cho TLS", async (t) => {
  // 🔴 Ca này soi đúng một lỗi câm dễ mắc: nếu lớp đọc khung còn gắn sau khi `Response` về, nó ăn
  // mất byte đầu của cú bắt tay TLS, và TLS chỉ thấy luồng thiếu đầu rồi báo một lỗi vô nghĩa.
  const AFTER = Buffer.from("XIN-CHAO-TLS");
  const srv = net.createServer((sock) => {
    sock.once("data", () => {
      sock.write(frameMessage(RELAY_MSG.response, responseBody(0, "success")));
      // Byte của lớp TRÊN đi ngay sau, trong cùng một nhịp — đúng như relay thật làm.
      sock.write(AFTER);
    });
    sock.on("error", () => {});
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  const port = srv.address().port;

  const sock = await openRelaySession(
    { host: "127.0.0.1", port, url: `relay://127.0.0.1:${port}` },
    { from: Buffer.alloc(32, 1), key: Buffer.alloc(32, 2), host: "127.0.0.1", port, serverSocket: false },
    5000,
  );
  assert.ok(sock, "phải vào được phiên");
  const echoed = await new Promise((resolve) => {
    let b = Buffer.alloc(0);
    sock.on("data", (d) => {
      b = Buffer.concat([b, d]);
      if (b.length >= AFTER.length) resolve(b.subarray(0, AFTER.length));
    });
    setTimeout(() => resolve(b), 2000);
  });
  assert.deepEqual(echoed, AFTER, "byte sau Response phải về nguyên vẹn cho lớp TLS");
  sock.destroy();
});

test("mở ống byte: relay từ chối khoá phiên ⇒ null", async (t) => {
  const srv = net.createServer((sock) => {
    sock.once("data", () => sock.write(frameMessage(RELAY_MSG.response, responseBody(4, "bad key"))));
    sock.on("error", () => {});
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  const port = srv.address().port;
  const r = await openRelaySession(
    { host: "127.0.0.1", port, url: `relay://127.0.0.1:${port}` },
    { from: Buffer.alloc(32, 1), key: Buffer.alloc(32, 2), host: "127.0.0.1", port, serverSocket: false },
    4000,
  );
  assert.equal(r, null);
});

test("danh sách cụm: server im hoặc trả rác ⇒ RỖNG, không ném", async () => {
  // Fail-open: lane này là đường cuối. Không lấy được danh sách KHÔNG phải lỗi cần báo.
  assert.deepEqual(await fetchRelayPool({ poolUrl: "https://127.0.0.1:1/endpoint", timeoutMs: 1500 }), []);
});

test("tầng 4 được MÓC thật vào app — tham gia, đăng địa chỉ, và gọi qua relay", () => {
  // 🔴 Cổng soi CHỮ vì đây là chỗ hỏng câm: cả lớp giao thức có thể đúng và xanh hết, mà tính năng
  // vẫn không tồn tại vì không ai gọi nó. Cùng họ với lỗi "job không hỏng, nó chỉ không bao giờ
  // được gọi" — và chính lượt này đã suýt mắc: `lookupGlobal` âm thầm vứt mọi `relay://`.
  const CH = readSrc(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  const UI = readSrc(new URL("../src/ui.ts", import.meta.url), "utf8");
  const GD = readSrc(new URL("../src/memory/channel/globaldisco.ts", import.meta.url), "utf8");

  // ① Bật kênh ⇒ tham gia cụm relay, và thử NHIỀU relay: một cụm tình nguyện thì relay đầy hoặc
  //    đang chết là chuyện thường; dừng ở cái đầu là để cả tầng 4 treo vào một máy của người lạ.
  assert.match(CH, /const pool = await fetchRelayPool\(\);/, "bật kênh phải lấy danh sách cụm");
  assert.match(CH, /for \(const ep of pool\.slice\(0, \d+\)\)/, "phải thử nhiều relay, không chỉ một");
  assert.match(CH, /await joinRelay\(\{/, "phải THAM GIA thật, không chỉ nhắc tên hàm");

  // ② Địa chỉ relay phải ĐI VÀO lượt đăng ký — thiếu bước này thì tầng 4 dựng xong vẫn vô dụng:
  //    hai máy cùng trong pool mà không bên nào biết tìm bên nào.
  assert.match(CH, /relays: relayAt \? \[relayAt\.url\] : \[\]/, "lượt đăng phải mang địa chỉ relay");
  assert.match(GD, /\.\.\.\(o\.relays \?\? \[\]\)\.filter\(\(r\) => r\.startsWith\("relay:\/\/"\)\)/,
    "announceGlobal phải đăng kèm địa chỉ relay");

  // ③ Tra phải GIỮ LẠI `relay://`. Bản đầu gọi `parseWireAddress` ngay trong vòng tra nên nó vứt
  //    sạch địa chỉ relay — không lỗi nào nổ, tầng 4 chỉ đơn giản không bao giờ thấy máy kia.
  assert.match(GD, /relays: \[\.\.\.new Set\(raw\.filter\(\(a\) => a\.trim\(\)\.startsWith\("relay:\/\/"\)\)\)\]/,
    "lookupGlobalAddresses phải trả cả địa chỉ relay");

  // ④ Nhận phiên gọi tới, và vai TLS lấy từ RELAY chứ không tự đoán.
  assert.match(CH, /async function acceptRelayInvite\(/, "phải có đường NHẬN phiên qua relay");
  assert.match(CH, /secureSocket\(raw, opts, inv\.serverSocket, [\d_]+\)/, "vai TLS do relay phân");
  assert.match(CH, /runSessionOn\(sock, opts, !inv\.serverSocket\)/, "hai vai phải NGƯỢC nhau");

  // ⑤ Chiều GỌI được cắm vào cú bấm, và xếp TRƯỚC chỗ chờ đục lỗ: relay là lượt nối THẬT, còn chỗ
  //    chờ chỉ là lời hẹn — trả `waiting` trong khi relay đã nối được là bỏ phí một đường ngon.
  // Neo KHÔNG chứa xuống dòng: file dùng CRLF, nên một neo có `\n` bên trong trượt sạch.
  const relayAt = UI.indexOf(".syncViaRelay({");
  const punchAt = UI.indexOf("ch.armPunchWait({");
  assert.ok(relayAt > 0, "cú bấm phải thử relay");
  assert.ok(punchAt > relayAt, "relay phải đứng TRƯỚC chỗ chờ đục lỗ");

  // ⑥ Tắt kênh = RỜI relay. Một chỗ chờ sống sót sau khi tắt là mời máy kia mở phiên tới kênh đã
  //    tắt — và trong tiến trình test, kết nối thường trực đó giữ event loop sống mãi (§F15).
  const off = CH.slice(CH.indexOf("export function stopChannelServer"));
  assert.match(off, /running\?\.relay\?\.stop\(\);/, "tắt kênh phải rời relay");
});
