// DÒ TOÀN CẦU — cụm server công khai của Syncthing (plan/24 §1c tầng 3).
//
// 🔴 Đây là lane KHÁC MẠNG **không cần gì của user**: không tài khoản, không máy chủ phải nuôi,
// không thư mục chung, và không cần STUN — ta khai `0.0.0.0`, server thay bằng IP NGUỒN của gói.
// Nó là thứ mang nhãn "đã lấy" từ 13/09 mà tới 22/09 vẫn `0 dòng`; thứ chặn là một dòng do agent
// tự viết ở `§1c-a`, không phải user chốt.
//
// ⚠ Cụm này soi phần TÍNH TOÁN + GIAO THỨC, chạy với server GIẢ cục bộ (tất định, không chạm
// mạng thật). Nó KHÔNG chứng minh hai máy khác mạng nối được — phép đó chỉ hai máy thật trả lời
// (`§11.4` điều 3), và cổng xanh không thay được. Lượt đo với cụm THẬT ngày 22/09 ghi ở `§1c-c`.
import assert from "node:assert/strict";
import test from "node:test";
import https from "node:https";
import {
  toSyncthingId,
  parseWireAddress,
  announceGlobal,
  lookupGlobal,
  DEFAULT_REANNOUNCE_S,
  shouldAnnounceNow,
} from "../../dist/memory/channel/globaldisco.js";
import { loadOrCreateIdentity } from "../../dist/memory/channel/identity.js";
import { tempDir } from "./helpers.mjs";

/**
 * Device ID Syncthing THẬT (ví dụ chính thức trong tài liệu của họ).
 *
 * Đây là cái neo mạnh nhất của cụm: nếu phép của ta dựng lại được ĐÚNG chuỗi này thì danh tính của
 * zemory không chỉ "giống" scheme Syncthing — nó LÀ scheme đó, nên cụm server công khai coi ta như
 * một máy hợp lệ. Không có neo này thì mọi phép đổi ID chỉ tự so với chính nó.
 */
const REAL_ID = "P56IOI7-MZJNU2Y-IQGDREY-DM2MGTI-MGL3BXN-PQ6W5BM-TBBZ4TJ-XZWICQ2";
/** 52 ký tự thô của ID trên — bóc chữ số kiểm ở cuối mỗi khúc 14 của chuỗi 56. */
const REAL_RAW = REAL_ID.replace(/-/g, "")
  .match(/.{14}/g)
  .map((c) => c.slice(0, 13))
  .join("");

function identityFor(t) {
  return loadOrCreateIdentity(tempDir(t, "zemory-gdisco-id-"));
}

/**
 * Một server dò GIẢ. `plan` là danh sách phản hồi theo thứ tự lời gọi tới nó.
 *
 * Phải là HTTPS thật (không phải HTTP) vì lớp gọi dùng `https` + chứng chỉ client — chạy trên HTTP
 * thì cổng xanh mà đường thật vẫn hỏng.
 */
async function fakeServer(t, handler) {
  const id = identityFor(t);
  const srv = https.createServer(
    { key: id.keyPem, cert: id.certPem, requestCert: true, rejectUnauthorized: false },
    handler,
  );
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  t.after(() => srv.close());
  return { url: `https://127.0.0.1:${srv.address().port}/v2/`, srv };
}

test("ID: dựng lại ĐÚNG một device ID Syncthing thật", () => {
  // Phép đúng là HAI bước chồng lên nhau: chữ số kiểm tính theo khúc 13 (nối LIỀN thành 56), rồi
  // MỚI cắt gạch mỗi 7. Gộp thành "4 cụm 14" vẫn ra 56 ký tự dữ liệu nên TRA VẪN TRÚNG (server bóc
  // gạch trước khi so) — chỉ chuỗi in ra là sai. Mạng không nói cho ta biết chuyện đó, nên cổng
  // phải soi HÌNH DẠNG chuỗi. Đúng chỗ tôi làm sai lần đầu, 22/09.
  assert.equal(toSyncthingId(REAL_RAW), REAL_ID);
  assert.equal(toSyncthingId(REAL_RAW).length, 63, "56 ký tự dữ liệu + 7 gạch");
  assert.equal(toSyncthingId(REAL_RAW).split("-").length, 8, "8 cụm, KHÔNG phải 4");
  for (const g of toSyncthingId(REAL_RAW).split("-")) assert.equal(g.length, 7, "mỗi cụm 7 ký tự");
});

test("ID: nhận cả dạng hiển thị của ta, và từ chối thứ không phải ID", (t) => {
  // Dạng của ta (chữ số kiểm mỗi 7) phải quy về cùng 52 ký tự thô rồi ra cùng ID Syncthing —
  // nếu không thì máy A đăng bằng một ID, máy B tra bằng một ID khác, và lane im mà không ai biết.
  const me = identityFor(t);
  const fromOurs = toSyncthingId(me.deviceId);
  assert.ok(fromOurs, "ID của chính ta phải đổi được");
  assert.equal(fromOurs.split("-").length, 8);
  assert.equal(toSyncthingId(me.deviceId.replace(/-/g, "")), fromOurs, "có gạch hay không phải ra như nhau");

  // CA ÂM: không đủ 52 ký tự thô ⇒ `null`, KHÔNG đoán. Đăng bừa một ID méo lên cụm công khai là
  // đi chiếm chỗ của một máy khác.
  assert.equal(toSyncthingId(""), null);
  assert.equal(toSyncthingId("ABC"), null);
  assert.equal(toSyncthingId("2".repeat(51)), null);
  assert.equal(toSyncthingId("2".repeat(53)), null);
});

test("địa chỉ trên dây: bóc `tcp://`, và BỎ mọi dải riêng", () => {
  assert.equal(parseWireAddress("tcp://203.0.113.9:21038"), "203.0.113.9:21038");
  assert.equal(parseWireAddress("tcp4://198.51.100.2:22000"), "198.51.100.2:22000");
  assert.equal(parseWireAddress("quic://203.0.113.9:21038"), "203.0.113.9:21038");

  // CA ÂM — dải riêng. Máy kia ĐƯỢC PHÉP đăng cả địa chỉ LAN của nó (giao thức cho phép), mà một
  // địa chỉ LAN của máy khác mạng vừa vô dụng vừa làm ta gọi vào một máy LẠ cùng dải ở mạng mình.
  for (const bad of [
    "tcp://10.0.0.5:21038",
    "tcp://192.168.1.7:21038",
    "tcp://172.16.0.1:21038",
    "tcp://172.31.255.254:21038",
    "tcp://127.0.0.1:21038",
    "tcp://169.254.1.1:21038",
    "tcp://100.64.0.1:21038", // CGNAT — gọi vào không tới
    "tcp://224.0.0.1:21038",
    "tcp://0.0.0.0:21038",
  ]) {
    assert.equal(parseWireAddress(bad), null, `phải bỏ: ${bad}`);
  }
  // CA ÂM — rác / cổng sai. `0` và `>65535` không phải cổng.
  for (const bad of ["", "tcp://203.0.113.9", "tcp://203.0.113.9:0", "tcp://203.0.113.9:70000", "tcp://999.1.1.1:21038", "rác"]) {
    assert.equal(parseWireAddress(bad), null, `phải bỏ: ${bad}`);
  }
  // CA ÂM — dải 172 NGOÀI 16..31 là địa chỉ công khai thật, KHÔNG được bỏ nhầm.
  assert.equal(parseWireAddress("tcp://172.15.0.1:21038"), "172.15.0.1:21038");
  assert.equal(parseWireAddress("tcp://172.32.0.1:21038"), "172.32.0.1:21038");
});

test("đăng ký: 403 của server chỉ-đọc KHÔNG được coi là hỏng — thử tiếp server kế", async (t) => {
  // Đo với cụm THẬT 22/09: `discovery.syncthing.net` trả **403** khi ĐĂNG (nó chỉ-đọc) nhưng
  // **200** khi TRA; `discovery-v4` mới nhận đăng. Dừng ở server đầu là lane chết trong khi cụm
  // vẫn đang chạy tốt.
  const ro = await fakeServer(t, (req, res) => {
    res.writeHead(403);
    res.end("Forbidden");
  });
  let gotBody = "";
  const rw = await fakeServer(t, (req, res) => {
    req.on("data", (c) => (gotBody += c));
    req.on("end", () => {
      res.writeHead(204, { "reannounce-after": "3774" });
      res.end();
    });
  });

  const r = await announceGlobal({ identity: identityFor(t), port: 21038, servers: [ro.url, rw.url], timeoutMs: 4000 });
  assert.equal(r.ok, true, "server thứ hai nhận ⇒ lượt đăng THÀNH CÔNG");
  assert.equal(r.server, rw.url, "phải báo đúng server đã nhận");
  assert.equal(r.reannounceAfterS, 3774, "nhịp do SERVER nói, không phải số ta chọn");
  assert.deepEqual(r.tried.map((x) => x.status), [403, 204], "phải ghi lại cả lượt trượt, cho chẩn đoán");

  // Thân phải khai `0.0.0.0` — đó là chỗ server thay bằng IP NGUỒN, tức ta không cần STUN.
  // Khai một IP cụ thể là tự chốt vào địa chỉ mình ĐOÁN, đúng bệnh của mã-chở-địa-chỉ.
  assert.deepEqual(JSON.parse(gotBody), { addresses: ["tcp://0.0.0.0:21038"] });
});

test("đăng ký: cả cụm im ⇒ ok:false + nhịp mặc định, KHÔNG ném", async (t) => {
  const dead = await fakeServer(t, (req, res) => {
    res.writeHead(500);
    res.end();
  });
  // Địa chỉ không ai nghe: lỗi tầng socket phải thành `status: 0`, không phải một exception bay lên
  // `startChannelServer` và giết cả lượt bật kênh (điều 9 — lane này chỉ THÊM một đường).
  const r = await announceGlobal({
    identity: identityFor(t),
    port: 21038,
    servers: [dead.url, "https://127.0.0.1:1/v2/"],
    timeoutMs: 2000,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reannounceAfterS, DEFAULT_REANNOUNCE_S);
  assert.equal(r.server, undefined);
  assert.deepEqual(r.tried.map((x) => x.status), [500, 0]);
});

test("tra: một server 404 không giết lane — gộp câu trả lời của cả cụm, bỏ trùng", async (t) => {
  const none = await fakeServer(t, (req, res) => {
    res.writeHead(404);
    res.end("{}");
  });
  const one = await fakeServer(t, (req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    // Cùng một địa chỉ công khai + một địa chỉ LAN: LAN phải bị bỏ, địa chỉ kia giữ.
    res.end(JSON.stringify({ addresses: ["tcp://203.0.113.9:21038", "tcp://192.168.1.5:21038"] }));
  });
  const dup = await fakeServer(t, (req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ addresses: ["tcp://203.0.113.9:21038", "tcp://198.51.100.7:21038"] }));
  });

  const got = await lookupGlobal(REAL_RAW, {
    identity: identityFor(t),
    servers: [none.url, one.url, dup.url],
    timeoutMs: 4000,
  });
  assert.deepEqual(got, ["203.0.113.9:21038", "198.51.100.7:21038"], "bỏ trùng, bỏ LAN, giữ thứ tự server");
});

test("tra: ID méo ⇒ rỗng và KHÔNG chạm mạng", async (t) => {
  let hits = 0;
  const s = await fakeServer(t, (req, res) => {
    hits += 1;
    res.writeHead(200);
    res.end(JSON.stringify({ addresses: ["tcp://203.0.113.9:21038"] }));
  });
  // Không đổi được sang ID Syncthing thì đừng đi hỏi: một lời gọi mạng cho một ID ta BIẾT là méo
  // chỉ tổ ăn ngân sách 25 giây của `/channel-sync`.
  assert.deepEqual(await lookupGlobal("ABC", { servers: [s.url], timeoutMs: 2000 }), []);
  assert.equal(hits, 0, "ID méo ⇒ 0 lời gọi");

  // CA ÂM: server trả RÁC (không phải JSON) ⇒ coi như im, không ném.
  const junk = await fakeServer(t, (req, res) => {
    res.writeHead(200);
    res.end("<html>không phải json</html>");
  });
  assert.deepEqual(await lookupGlobal(REAL_RAW, { servers: [junk.url], timeoutMs: 2000 }), []);
});

test("tra: bắn SONG SONG — cả cụm nằm trong MỘT trần, không cộng dồn", async (t) => {
  // 🔴 Đây là ràng buộc THỜI GIAN, không phải tối ưu cho vui. `/channel-sync` có trần 25 giây cho
  // CẢ lượt (kể cả bắt tay với mọi ứng viên). Tra tuần tự 3 server × trần mỗi cái ăn hết ngân sách
  // trước khi kịp gọi tới máy nào — endpoint trả về "hết trần" mà chưa thử một địa chỉ.
  const slow = (ms) =>
    fakeServer(t, (req, res) => {
      setTimeout(() => {
        res.writeHead(404);
        res.end("{}");
      }, ms);
    });
  const a = await slow(1200);
  const b = await slow(1200);
  const c = await slow(1200);

  const t0 = Date.now();
  const got = await lookupGlobal(REAL_RAW, { servers: [a.url, b.url, c.url], timeoutMs: 4000 });
  const took = Date.now() - t0;

  assert.deepEqual(got, []);
  // Tuần tự là ~3600ms; song song là ~1200ms. Trần 2500ms tách được hai ca đó mà vẫn còn chỗ thở
  // cho lượt quét đầy đủ (chạy trong lồng 4 GB, ưu tiên thấp).
  assert.ok(took < 2500, `song song phải xong sớm hơn tổng tuần tự — đo ${took}ms`);
});

test("nhịp đăng lại: ĐỔI ĐỊA CHỈ thì đăng NGAY, không đợi hết nhịp", () => {
  // 🔴 Vế quyết định lane này sống hay chết. Nhịp server nói là ~63 phút (đo 22/09: 3774 giây), mà
  // địa chỉ ngoài của máy này đổi BỐN lần trong chưa tới hai ngày. Đi đúng nhịp thôi thì có những
  // quãng cả tiếng cụm dò trả về một địa chỉ đã đổi chủ — tái diễn đúng bệnh của mã-chở-địa-chỉ.
  const now = 1_000_000;
  const mark = { ok: true, nextAt: now + 3_774_000, host: "203.0.113.9" };

  assert.equal(shouldAnnounceNow(mark, "203.0.113.9", now), false, "chưa tới nhịp, địa chỉ y nguyên ⇒ ĐỪNG nện cụm công khai");
  assert.equal(shouldAnnounceNow(mark, "198.51.100.2", now), true, "ĐỔI địa chỉ ⇒ đăng NGAY dù còn cả tiếng nữa mới tới nhịp");
  assert.equal(shouldAnnounceNow(mark, "203.0.113.9", mark.nextAt), true, "tới nhịp ⇒ đăng lại");
  assert.equal(shouldAnnounceNow(null, null, now), true, "chưa đăng lần nào ⇒ đăng");

  // CA ÂM — `null` là *chưa đo được*, KHÔNG phải *đã đổi*. Coi nó là đổi thì mỗi nhịp 60 giây lại
  // nện cụm công khai một lần và ăn `429` (giới hạn nhịp có thật, đã bị dính với STUN 21/09).
  assert.equal(shouldAnnounceNow(mark, null, now), false);
  assert.equal(shouldAnnounceNow({ ok: true, nextAt: now + 3_774_000, host: null }, "203.0.113.9", now), false);

  // CA ÂM — lượt trước TRƯỢT thì không xét chuyện đổi: `nextAt` của nó vốn đã ngắn (1 phút), và
  // một địa chỉ ghi kèm lượt trượt không chứng minh được gì.
  assert.equal(shouldAnnounceNow({ ok: false, nextAt: now + 60_000, host: "203.0.113.9" }, "198.51.100.2", now), false);
});
