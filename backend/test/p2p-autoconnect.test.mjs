// LIÊN KẾT THƯỜNG TRỰC — ghép một lần là nối mãi, tự nối lại khi đổi mạng, chỉ `unpair` mới cắt.
//
// 🔴 User chốt 2026-09-24, nguyên văn: *"nó phải luôn kết nối và tự động kết nối dù đổi mạng, ko
// được hết phiên, trừ khi t bấm unpair"* — tức liên kết cư xử như cặp ghép điện thoại.
//
// 🔄 **Supersede vòng TỰ NỐI (2026-09-22).** Vòng cũ hỏi *"tới nhịp thử lại chưa"* và giãn tới 30
// PHÚT. Nó đúng cho một mô hình KHÁC: mỗi lượt là một phiên mở–đồng bộ–đóng, nên hỏi thưa là tiết
// kiệm. Mô hình đó không còn. Giữa hai lượt, hai máy KHÔNG có liên kết nào — bề mặt không có gì để
// gọi là *"đang nối"*, và đổi Wi-Fi rồi ngồi chờ 30 phút thì không ai gọi là *"luôn kết nối"*.
// `autoConnectDue` và `relayFingerprint` đã GỠ HẲN, không để lại bản song song (`§Một đường`).
//
// ⚠ Cụm này soi PHÉP QUYẾT + chỗ MÓC, không soi một lượt nối thật. Phép nghiệm thu vẫn là
// `plan/24 §11.4` điều 3 — hai máy KHÁC MẠNG nối được. Cổng xanh không thay được phép đó.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { reconnectDelayMs } from "../../dist/ui.js";

const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

test("nối lại: rụng lần đầu ⇒ thử NGAY, rồi nhân đôi, rồi chạm trần", () => {
  // Vế *"tự động kết nối"* nằm ở đây. Bắt chờ ngay lần rụng đầu là biến một cú chớp mạng thành
  // vài giây mù không lý do.
  assert.equal(reconnectDelayMs(0), 0, "vừa rụng ⇒ thử lại ngay, đừng bắt chờ");
  assert.equal(reconnectDelayMs(1), 2_000);
  assert.equal(reconnectDelayMs(2), 4_000);
  assert.equal(reconnectDelayMs(3), 8_000);

  // TRẦN — vẫn phải có: máy kia tắt cả tuần mà cứ 2 giây gọi một lần là đốt pin và đốt relay công
  // khai cho một việc chắc chắn hỏng.
  assert.equal(reconnectDelayMs(20), 60_000, "phải chạm trần, không giãn vô hạn");
  // 🔴 Và trần phải ĐỦ NHỎ để lời hứa *"luôn kết nối"* là thật. Trần cũ 30 phút chính là chỗ user
  // bắt lỗi: mở máy kia lên rồi ngồi chờ nửa tiếng.
  assert.ok(reconnectDelayMs(999) <= 60_000, "mở máy kia lên thì trong vòng MỘT PHÚT phải thấy nối");

  // CA ÂM: số âm (sổ hỏng, bộ đếm bị ghi đè) không được thành khoảng chờ âm rồi quay vòng.
  assert.equal(reconnectDelayMs(-1), 0);
  assert.equal(reconnectDelayMs(-999), 0);
});

test("lớp giữ-liên-kết được MÓC thật vào daemon, và chạy NGAY chứ không đợi nhịp đầu", () => {
  // 🔴 Cổng soi CHỮ vì đây là chỗ hỏng câm: một hàm đúng mà không ai gọi thì gate vẫn xanh còn
  // tính năng thì không tồn tại.
  assert.match(UI, /setInterval\(\(\) => void linkTick\(root\(\)\), 30_000\)\.unref\(\)/,
    "nhịp canh sổ phải được móc vào daemon bằng một đồng hồ có unref");
  assert.match(UI, /void linkTick\(root\(\)\);/,
    "phải chạy NGAY một lượt — đợi hết nhịp đầu là người dùng mở app, thấy 'chưa nối', không hiểu vì sao");
});

test("🔴 phiên THƯỜNG TRỰC được bật, và bật ở CẢ HAI đường nối", () => {
  assert.match(UI, /persistent: true/, "lớp giữ-liên-kết phải xin phiên thường trực");

  // ⛔ Hai đường, không một. Gọi thẳng chạy ở ca cùng mạng; RELAY là đường DUY NHẤT ở ca hai máy
  // khác mạng kín NAT — chính ca user đang dùng. Luồn cờ vào một đường rồi quên đường kia là để
  // nguyên con bug ở đúng chỗ nó đang cắn.
  const spread = UI.match(/\.\.\.\(o\.link/g) ?? [];
  assert.ok(spread.length >= 2, `tuỳ chọn liên kết phải đi vào CẢ gọi thẳng lẫn relay (mới thấy ${spread.length})`);
  assert.match(UI, /\.\.\.\(o\.link \? \{ link: o\.link \} : \{\}\)/, "đường relay phải nhận `link`");
});

test("🔴 `unpair` phải CẮT ỐNG, không chỉ xoá cái tên trong sổ", () => {
  // Vế THỨ HAI của yêu cầu, ngang hàng với vế "không hết phiên". Một liên kết không bao giờ tự hết
  // hạn mà KHÔNG có đường cắt thì gỡ cặp chỉ là đổi nhãn: ống vẫn mở, hai máy vẫn chở dữ liệu cho
  // nhau, còn người dùng tin là đã cắt.
  assert.match(UI, /export function dropLink\(/, "phải có MỘT cửa ngắt");
  const drop = UI.slice(UI.indexOf('if (p === "/channel-pair")'));
  assert.match(drop.slice(0, 2500), /dropLink\(/, "nhánh gỡ cặp phải gọi đúng cửa ngắt đó");
  // Nhịp canh sổ cũng dọn theo sổ — hai đường tới CÙNG một cửa, không hai cửa.
  assert.match(UI, /if \(!want\.has\(id\)\) dropLink\(id\);/, "máy ra khỏi sổ (hoặc kênh tắt) ⇒ cắt ống");
});

test("MỘT bản luật địa chỉ, không hai — mọi cửa gọi CÙNG một hàm", () => {
  // Thứ tự thử địa chỉ (dò LAN → bảng chung → cụm dò toàn cầu → địa chỉ trong mã → đã nhớ) là một
  // LUẬT đã sai hai lần rồi mới đúng. Chép ra bản thứ hai là dựng sẵn chỗ để hai bản lệch nhau.
  //
  // Nó cũng CHÍNH LÀ thứ làm *"tự nối lại dù đổi mạng"* thành thật: mỗi lần vào vòng, hàm này dò
  // LẠI từ đầu — đổi Wi-Fi, đổi IP, máy kia khởi động lại đều không cần nhớ gì.
  const defs = UI.match(/^async function channelSyncOnce\(/gm) ?? [];
  assert.equal(defs.length, 1, "chỉ được có MỘT định nghĩa channelSyncOnce");
  const calls = UI.match(/channelSyncOnce\(/g) ?? [];
  assert.equal(calls.length, 4, "một định nghĩa + đúng ba cửa gọi (giữ-liên-kết · bấm có gõ · bấm không gõ)");

  const cand = UI.match(/const candidates = \[/g) ?? [];
  assert.equal(cand.length, 1, "danh sách ứng viên địa chỉ chỉ dựng ở một chỗ");

  // Cú BẤM vẫn ĐƯỢC mở chỗ chờ đục lỗ và giữ trần 25 giây — có người đang ngồi đợi.
  assert.match(UI, /channelSyncOnce\(syncTargets\(typed, \[\]\)\[0\], \{ budgetMs: 25_000, armWait: true/,
    "cú bấm giữ trần 25 giây và vẫn mở được chỗ chờ");
  // ⛔ Lớp giữ-liên-kết thì KHÔNG: `startChannelServer` đã giữ một chỗ chờ vĩnh viễn, mở thêm là
  // chồng lỗ NAT lên nhau.
  assert.match(UI, /armWait: false,/, "lớp giữ-liên-kết KHÔNG được mở chỗ chờ đục lỗ");
});

test("🔄 cơ chế CŨ đã gỡ HẲN — không để lại hai đường cùng gọi một máy", () => {
  // `02_RULES §Một đường, không nửa cách`: chọn MỘT cách chạy được rồi gỡ hẳn phần còn lại — mã,
  // chữ, test. Để `autoConnectDue` nằm cạnh lớp liên kết là hai vòng cùng dial một máy, tức hai
  // phiên chồng lên nhau ghi vào cùng một kho (HP điều 11).
  for (const dead of ["autoConnectDue", "autoConnectTick", "relayFingerprint", "AUTO_CONNECT_MIN_MS", "AUTO_CONNECT_MAX_MS", "autoWait", "autoNextAt"]) {
    assert.equal(UI.includes(dead), false, `\`${dead}\` là vết của vòng cũ — phải gỡ hẳn, không để song song`);
  }
});

test("kênh BẬT mà SỔ RỖNG vẫn phải nói ra MỘT lần", () => {
  // Trạng thái CHẾT và hoàn toàn im lặng: không có ai để nối nên không vòng nào chạy, máy trông
  // như đang chạy bình thường. Gặp thật 23/09, phải đo bằng tay mới thấy.
  assert.match(UI, /SỔ MÁY RỖNG/, "phải nói ra khi kênh bật mà sổ rỗng");
  assert.match(UI, /if \(autoLastEmpty !== true\)/, "chỉ nói khi trạng thái ĐỔI — kêu mỗi nhịp là cổng sắp bị bỏ qua");
});

test("vào relay mới phải báo NGAY, không đợi nhịp sau", () => {
  // 🔴 `publishPresence` chạy TRƯỚC `keepRelay` trong cùng một nhịp, nên một relay vừa vào chỉ lên
  // bảng chung ở nhịp KẾ — chậm trọn 60 giây. Mạng ổn định thì vô hình (vào relay một lần lúc bật);
  // mạng 4G xoay IP thì mỗi lần xoay là một lỗ 60 giây, và máy kia tra đúng lúc đó thấy relay CŨ.
  const CH = readFileSync(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  const beat = CH.slice(CH.indexOf("const beat = async ()"), CH.indexOf("void beat()"));
  assert.ok(beat.length > 0, "không thấy nhịp beat — neo đã chết");

  assert.match(beat, /const relayBefore = relayAt\?\.url \?\? null;/, "phải chụp relay TRƯỚC khi gọi keepRelay");
  assert.match(beat, /if \(\(relayAt\?\.url \?\? null\) !== relayBefore\) \{/, "đổi relay trong nhịp ⇒ báo lại");
  // Cả HAI kênh rendezvous đều bị bỏ lỡ vì cùng lý do, nên cả hai phải được gọi lại.
  const after = beat.slice(beat.indexOf("!== relayBefore"));
  assert.match(after, /publish\(\);/, "bảng chung phải được đăng lại");
  assert.match(after, /await announceBeat\(/, "cụm dò toàn cầu cũng phải được đăng lại");
});

test("🔴 LỚP NGHE cũng phải thường trực — một liên kết là thoả thuận của HAI máy", async () => {
  // 🔴 Lỗ THẬT, lọt ra sản phẩm ngày 2026-09-24 dù cổng đã bắt đúng nó: cụm `p2p-mirror` phát hiện
  // "chỉ bật cờ ở bên GỌI thì bên NGHE vẫn đóng ống sau lượt một", tôi vá TRONG PHÉP THỬ rồi quên
  // vá ở `startChannelServer`. Hai máy cùng lên bản mới vẫn vĩnh viễn "đang nối lại", trong khi
  // nhật ký có `đã nhận 122 khối` — dữ liệu chảy thật, còn dòng đó là lúc phiên KẾT THÚC.
  //
  // Bài học được đóng thành cổng: phép thử bắt được một lỗ thì phải hỏi *"chỗ THẬT đã vá chưa"*,
  // không chỉ *"phép thử xanh chưa"*.
  const CH = readFileSync(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  // Neo cuối phải là một chuỗi chỉ xuất hiện SAU chỗ dựng — `startDiscovery` trượt vì nó còn nằm
  // ở dòng `import` trên đầu file, và lát cắt ra rỗng thì mọi `assert.match` bên dưới xanh giả.
  const serve = CH.slice(CH.indexOf("const server = await serveChannel("), CH.indexOf("TẦNG 1 — DÒ LAN"));
  assert.ok(serve.length > 0, "không thấy chỗ dựng lớp nghe — neo đã chết");
  assert.match(serve, /persistent: true/, "lớp NGHE phải thường trực, nếu không nó giết liên kết của đầu kia");

  // Từng LƯỢT phải báo ra: `onDone` nay chỉ nổ lúc liên kết CHẾT, nên một liên kết khoẻ sẽ im
  // lặng ở mọi hố báo và thẻ lại hiện "chưa nối" — cùng con bug, đổi nguyên nhân.
  assert.match(serve, /onSyncRound:/, "phải báo từng lượt, không chỉ báo lúc chết");
  assert.match(CH, /onLinkRound\?: \(peerDeviceId: string, r: SyncOutcome\) => void;/, "phải có hố cho bề mặt");

  // Và bề mặt phải DÙNG hố đó: NAT một chiều ⇒ máy kia gọi được ta còn ta gọi không được nó, liên
  // kết CÓ THẬT mà lớp giữ-liên-kết bên này không biết gì.
  assert.match(UI, /onLinkRound: \(peerId: string\) => noteInboundLink\(peerId\)/, "thẻ phải thấy liên kết ĐẾN");
  assert.match(UI, /function noteInboundLink\(/);

  // Gỡ cặp phải cắt CẢ HAI chiều — cắt một nửa thì nửa còn lại vẫn chở dữ liệu.
  const drop = UI.slice(UI.indexOf('if (p === "/channel-pair")'));
  assert.match(drop.slice(0, 3000), /void refreshChannelServer\(\);/, "gỡ cặp phải dựng lại lớp nghe để cắt ống ĐẾN");
});

test("gọi thẳng phải NÓI RA từng ứng viên đã trượt — thẻ máy chỉ giữ lỗi của ứng viên CUỐI", () => {
  // Đo 2026-09-25: thẻ ghi `ECONNREFUSED` của một địa chỉ CŨ, trong khi cú gọi LAN — ứng viên đầu,
  // và là đường duy nhất đáng quan tâm khi hai máy cùng Wi-Fi — trượt vì lý do khác mà không ai
  // thấy. Mất hơn một giờ soi nhầm vì đúng chỗ mù này.
  assert.match(UI, /const tried: string\[\] = \[\];/, "phải gom từng ứng viên trượt");
  assert.match(UI, /if \(r\.error\) tried\.push\(/, "mỗi ứng viên trượt phải vào sổ");
  assert.match(UI, /\[channel\] gọi thẳng tới \$\{/, "phải nói ra MỘT dòng cho cả lượt");
});
