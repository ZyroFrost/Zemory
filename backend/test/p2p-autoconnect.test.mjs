// VÒNG TỰ NỐI — nối một lần rồi máy tự nối lại, không cần ai bấm.
//
// 🔴 Vì sao có: nối một lần là máy kia đã vào sổ, nhưng trước bản này **không có gì tự chạy lại**
// — máy kia bật lên hay đổi IP thì máy này mù cho tới lúc có người bấm. Mà cả hai chuyện đó xảy ra
// liên tục (địa chỉ ngoài máy này đổi BỐN lần trong chưa tới hai ngày). User chốt 2026-09-22:
// *"kết nối 1 lần, để nó ghi nhớ trong list tự nối luôn"*.
//
// ⚠ Cụm này soi PHÉP QUYẾT (`autoConnectDue`) + chỗ MÓC của vòng, không soi một lượt nối thật.
// Phép nghiệm thu vẫn là `plan/24 §11.4` điều 3 — hai máy KHÁC MẠNG nối được. Cổng xanh không
// thay được phép đó.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { autoConnectDue, relayFingerprint } from "../../dist/ui.js";

const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

/** Ca nền: mọi cửa đều mở, đã tới nhịp. */
const OK = { enabled: true, peers: 2, busy: false, nextAt: 1000, now: 1000 };

test("tự nối: đủ bốn cửa + tới nhịp ⇒ chạy", () => {
  assert.equal(autoConnectDue(OK), true);
  assert.equal(autoConnectDue({ ...OK, now: 999_999 }), true, "quá hạn vẫn chạy, không bỏ suất");
});

test("tự nối: KÊNH TẮT ⇒ không bao giờ gọi ra ngoài", () => {
  // Tắt kênh là một lời TỪ CHỐI, không phải một trục trặc. Một vòng nền vẫn gọi ra ngoài sau khi
  // người dùng tắt công tắc là bề mặt nói dối về thứ máy đang làm.
  assert.equal(autoConnectDue({ ...OK, enabled: false }), false);
});

test("tự nối: SỔ RỖNG ⇒ im — vòng này KHÔNG đi tìm máy lạ", () => {
  // Ranh giới có chủ đích: tự nối chỉ gọi lại máy ĐÃ từng nối được. Tìm máy mới vẫn là việc của
  // cú dán mã — một vòng nền tự đi bắt tay với máy chưa ai duyệt là chuyện khác hẳn.
  assert.equal(autoConnectDue({ ...OK, peers: 0 }), false);
  assert.equal(autoConnectDue({ ...OK, peers: -1 }), false, "số âm cũng là rỗng, đừng để lọt");
});

test("tự nối: ĐANG BẬN ⇒ nhường, không chồng hai lượt lên cùng một kho", () => {
  // Hai lượt cùng ghi một kho là đúng thứ HP điều 11 cấm. `busy` gộp cả *lượt tự nối trước chưa
  // xong* lẫn *một job nền khác đang ghi* — hai nguồn, cùng một hậu quả.
  assert.equal(autoConnectDue({ ...OK, busy: true }), false);
});

test("tự nối: CHƯA TỚI NHỊP ⇒ chờ (đây là chỗ thụt lùi ăn)", () => {
  assert.equal(autoConnectDue({ ...OK, nextAt: 2000, now: 1999 }), false);
  assert.equal(autoConnectDue({ ...OK, nextAt: 2000, now: 2000 }), true, "đúng mốc là tới hạn");
});

test("vòng tự nối được MÓC thật vào daemon, và KHÔNG mở chỗ chờ đục lỗ", () => {
  // 🔴 Cổng soi CHỮ vì đây là chỗ hỏng câm: một hàm đúng mà không ai gọi thì gate vẫn xanh còn
  // tính năng thì không tồn tại. Cùng họ với lỗi "job không hỏng, nó chỉ không bao giờ được gọi".
  assert.match(UI, /setInterval\(\(\) => void autoConnectTick\(root\(\)\), 60_000\)\.unref\(\)/,
    "vòng tự nối phải được móc vào daemon bằng một đồng hồ có unref");

  // ⛔ `armWait: false` là ràng buộc, không phải tuỳ chọn: `startChannelServer` đã giữ một chỗ chờ
  // đục lỗ VĨNH VIỄN, nên mở thêm mỗi nhịp là chồng lỗ NAT lên nhau — mỗi chỗ chờ sống 10 phút,
  // nhịp 5 phút ⇒ luôn có hai cái cùng bắn.
  assert.match(UI, /channelSyncOnce\(id, \{ budgetMs: AUTO_CONNECT_BUDGET_MS, armWait: false, projectRoot \}\)/,
    "vòng tự nối KHÔNG được mở chỗ chờ đục lỗ");

  // Cú BẤM thì ngược lại — nó ĐƯỢC mở chỗ chờ, và trần rộng hơn vì có người đang ngồi đợi.
  // Đối số đầu đi qua `syncTargets` từ 3.5.4: chuỗi gõ tay phải được nắn về cùng một dạng mục tiêu
  // với vòng nền, nếu không thì cú bấm bỏ qua cụm dò toàn cầu và relay (xem `syncTargets`).
  assert.match(UI, /channelSyncOnce\(syncTargets\(typed, \[\]\)\[0\], \{ budgetMs: 25_000, armWait: true/,
    "cú bấm giữ trần 25 giây và vẫn mở được chỗ chờ");
});

test("MỘT bản luật địa chỉ, không hai — cú bấm và vòng tự nối gọi CÙNG một hàm", () => {
  // Thứ tự thử địa chỉ (dò LAN → bảng chung → cụm dò toàn cầu → địa chỉ trong mã → đã nhớ) là một
  // LUẬT đã sai hai lần rồi mới đúng. Chép ra bản thứ hai cho vòng tự chạy là dựng sẵn chỗ để hai
  // bản lệch nhau — cổng này chặn đúng chuyện đó.
  const defs = UI.match(/^async function channelSyncOnce\(/gm) ?? [];
  assert.equal(defs.length, 1, "chỉ được có MỘT định nghĩa channelSyncOnce");
  const calls = UI.match(/channelSyncOnce\(/g) ?? [];
  // Một định nghĩa + BA cửa gọi: vòng tự nối · cú bấm CÓ gõ máy · cú bấm KHÔNG gõ gì (lặp từng máy
  // đã ghép — thêm ở 3.5.4). Cửa thứ ba là cửa gọi, KHÔNG phải bản cài đặt thứ hai: nó dựng đúng
  // thứ tự thử địa chỉ bằng cách gọi lại hàm này, chứ không chép luật ra chỗ khác.
  assert.equal(calls.length, 4, "một định nghĩa + đúng ba cửa gọi (vòng tự nối · bấm có gõ · bấm không gõ)");

  // Danh sách ứng viên chỉ được dựng ở MỘT chỗ.
  const cand = UI.match(/const candidates = \[/g) ?? [];
  assert.equal(cand.length, 1, "danh sách ứng viên địa chỉ chỉ dựng ở một chỗ");
});

test("thụt lùi: nhân đôi khi trượt, có TRẦN, về đáy khi nối được", () => {
  // Máy kia tắt cả tuần mà cứ 5 phút gọi một lần là đốt ngân sách cho việc chắc chắn hỏng; nhưng
  // vừa nối được thì phải nhạy lại ngay. Soi chữ vì đây là logic trong thân vòng, không tách được
  // thành hàm thuần mà không đẻ thêm một khái niệm chỉ để test.
  assert.match(UI, /autoWait = ok \? AUTO_CONNECT_MIN_MS : Math\.min\(autoWait \* 2, AUTO_CONNECT_MAX_MS\)/,
    "trượt ⇒ nhân đôi có trần; nối được ⇒ về nhịp đáy");
  assert.match(UI, /const AUTO_CONNECT_MIN_MS = 5 \* 60_000;/);
  assert.match(UI, /const AUTO_CONNECT_MAX_MS = 30 \* 60_000;/);

  // Log CHỈ khi đổi trạng thái — ghi mỗi nhịp là mỗi ngày mấy trăm dòng "không nối được", và một
  // cổng kêu suốt là cổng sắp bị bỏ qua.
  assert.match(UI, /if \(ok !== autoLastOk\) \{/, "chỉ ghi log khi trạng thái ĐỔI");
});

test("`waiting` KHÔNG được tính là nối được", () => {
  // `ok:true, waiting:true` nghĩa là *đã mở chỗ chờ* — một việc CHƯA xảy ra. Tính nó là thành công
  // thì thụt lùi về đáy và log báo "đã đồng bộ" cho một lượt chưa chở một khối nào; đúng kiểu bề
  // mặt nói dối mà `§F3` cấm, chỉ khác là lần này nó nói dối với chính vòng nền.
  assert.match(UI, /if \(r\.ok === true && r\.waiting !== true\) ok = true;/);
});

test("vân tay relay: máy kia ĐỔI RELAY là tín hiệu thử lại ngay", () => {
  // 🔴 Vì sao cần: thụt lùi giãn tới 30 phút cho một máy im. Nhưng máy trên mạng 4G KHÔNG im — nó
  // đổi IP, rớt relay, vào relay KHÁC rồi chờ ở đó. Với thụt lùi dài thì ta ngồi im nửa tiếng
  // trong khi bên kia đã sẵn sàng ở địa chỉ mới. Đo 23/09: IP máy này đổi BA lần trong ~10 phút.
  const A = { fp: "AAA", relay: "relay://203.0.113.9:22067/?id=X" };
  const B = { fp: "BBB", relay: "relay://198.51.100.2:443/?id=Y" };

  assert.equal(relayFingerprint([A, B]), relayFingerprint([B, A]), "thứ tự đọc thư mục KHÔNG được đổi vân tay");
  assert.notEqual(relayFingerprint([A]), relayFingerprint([{ ...A, relay: "relay://203.0.113.9:443/?id=X" }]),
    "đổi relay ⇒ đổi vân tay");
  assert.notEqual(relayFingerprint([A]), relayFingerprint([A, B]), "thêm một máy có relay ⇒ đổi vân tay");

  // CA ÂM: mục KHÔNG có relay không được ảnh hưởng vân tay — nếu không thì mỗi lần một máy làm tươi
  // địa chỉ gọi thẳng lại kích một lượt thử, tức rút timer bằng cửa sau.
  assert.equal(relayFingerprint([A, { fp: "CCC" }]), relayFingerprint([A]));
  assert.equal(relayFingerprint([]), "");
  assert.equal(relayFingerprint([{ fp: "CCC" }]), "", "không máy nào có relay ⇒ vân tay rỗng, không kích gì");
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
