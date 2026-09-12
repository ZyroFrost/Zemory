// CACHE PHẢI ĐÓNG DẤU LÚC XONG, KHÔNG PHẢI LÚC BẮT ĐẦU.
//
// Đo trên kho thật 2026-09-02 (2.732 MB · 331.059 tin): `/memory-status` lượt LẠNH **74 s**, mà
// `DASH_TTL_MS` chỉ **60 s**. Vì hàng cache được đóng dấu bằng mốc REQUEST VÀO, nó sinh ra đã quá
// hạn ⇒ lượt kế tính lại từ đầu ⇒ cả chuỗi tối ưu ở `dashboardMemory` (hai tầng TTL, tách
// `/sync-pulse`, coverage 38 s → 0,58 s) bị vô hiệu bởi đúng một chữ. Lượt NGAY SAU đo được
// **9,5 s** thay vì ~40 ms như chú thích trong code hứa.
//
// Hệ quả không chỉ là chậm: 74 s đó chạy ĐỒNG BỘ trên event loop của daemon, nên `/connections`
// gọi ngay sau khi khởi động **timeout hai lần** (45 s rồi 240 s) trong chính phiên phát hiện ra.
//
// Cổng này canh HAI thứ: ① số học của luật (một lượt tính lâu hơn TTL thì mốc-vào là chết, mốc-xong
// là sống) · ② mã sản xuất thật sự dùng mốc-xong ở CẢ HAI đường đồng bộ.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

/** Đúng phép so mà `dashboardMemory` dùng để quyết định còn tươi hay không. */
const fresh = (stampedAt, now, ttl) => now - stampedAt < ttl;

test("số học: lượt tính LÂU HƠN TTL ⇒ mốc-VÀO cho cache chết, mốc-XONG cho cache sống", () => {
  const TTL = 60_000; // DASH_TTL_MS
  const started = 1_000_000;
  const computeMs = 74_000; // đo thật
  const finished = started + computeMs;
  const nextCall = finished + 500; // lượt kế, nửa giây sau

  assert.equal(fresh(started, nextCall, TTL), false, "đóng dấu lúc VÀO ⇒ hàng cache quá hạn NGAY khi sinh");
  assert.equal(fresh(finished, nextCall, TTL), true, "đóng dấu lúc XONG ⇒ lượt kế mới được cache phục vụ");

  // Và vế ngược phải giữ: cache vẫn phải HẾT HẠN đúng lúc, không được thành vĩnh viễn.
  assert.equal(fresh(finished, finished + TTL + 1, TTL), false, "quá TTL kể từ lúc xong thì phải tính lại");
});

test("mã sản xuất: mọi đường TÍNH đều đóng dấu bằng Date.now() lúc hoàn tất", () => {
  for (const name of ["dashCache", "heavyCache"]) {
    const assigns = [...UI.matchAll(new RegExp(`${name}\\s*=\\s*\\{\\s*at:\\s*([^,]+),`, "g"))].map((m) => m[1].trim());
    assert.ok(assigns.length > 0, `${name} phải có chỗ ghi cache`);
    for (const stamp of assigns) {
      // NGOẠI LỆ DUY NHẤT, và nó KHÔNG nới lỏng bất biến: `raw.at` là lúc-XONG của LẦN CHẠY TRƯỚC,
      // đọc lên từ bản ướp `dash-stats.json` (2026-09-10). Ép nó thành `Date.now()` mới là sai —
      // đó là bịa cho một con số cũ cái tuổi của bây giờ, đúng thứ điều 12 cấm. Bất biến vẫn là
      // *"mốc phải là lúc phép tính HOÀN TẤT"*; chỗ này chỉ mang theo mốc đó qua lần khởi động.
      if (stamp === "raw.at") continue;
      assert.equal(
        stamp,
        "Date.now()",
        `${name} đóng dấu bằng '${stamp}' — mốc lấy TRƯỚC khi làm việc là cache tự sát (đo: lạnh 74 s > TTL 60 s)`,
      );
    }
  }
  // Và ngoại lệ phải bị KHOANH VÙNG: đúng một chỗ, nằm trong hàm nạp lại. Rải nó ra chỗ khác là
  // mở lại đúng cánh cửa mà cả ca test này sinh ra để đóng.
  const restores = [...UI.matchAll(/heavyCache\s*=\s*\{\s*at:\s*raw\.at,/g)].length;
  assert.equal(restores, 1, "chỉ đường NẠP LẠI TỪ ĐĨA được mang mốc cũ");
  const load = /function loadHeavyCache\(\): void \{([\s\S]*?)\n\}/.exec(UI);
  assert.ok(load && /heavyCache = \{ at: raw\.at,/.test(load[1]), "và nó phải nằm trong loadHeavyCache()");
});

test("TTL vẫn phải LỚN HƠN nhịp poll của client, không thì mỗi lượt poll đều tính lại", () => {
  // Chú thích trong `ui.ts` nêu rõ ràng buộc này (poll 30 s) — giữ nó thành phép đo, không phải lời hứa.
  const ttl = Number(/const DASH_TTL_MS = ([\d_]+)/.exec(UI)?.[1]?.replace(/_/g, ""));
  assert.ok(Number.isFinite(ttl), "phải đọc được DASH_TTL_MS");
  assert.ok(ttl > 30_000, `DASH_TTL_MS=${ttl} phải lớn hơn nhịp poll 30 s của client`);
});

test("làm tươi CÂY NGUỒN không được đi qua gói nặng, và TUYỆT ĐỐI không được `fresh=1`", () => {
  // 🔴 Đo 2026-09-11 sau khi user hỏi *"đăng nhập xong reload lại trang để nó nhận đúng được không"*:
  // `renderConn` gọi `/memory-status?fresh=1` — ba cái sai chồng nhau.
  //   · giá: `/sync-pulse` 7,9–12,5 s · `/connections` 3,3 s · `/memory-status?fresh=1` ~60 s;
  //   · `fresh=1` XOÁ cache ⇒ mỗi lượt làm tươi cây giết luôn bảng số vừa tính;
  //   · `connPoll` gọi nó **mỗi 5 giây** suốt 15 phút canh đăng nhập.
  // Cộng lại: mở app là hai lượt tính đầy đủ (zboot một, `loadConn` một), lượt sau xoá cache lượt
  // trước — và người dùng đọc thành "app không nhận, phải F5".
  const fe = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const body = /function renderConn\(\)\{([\s\S]*?)\n {2}\}/.exec(fe);
  assert.ok(body, "phải tìm được renderConn");
  assert.match(body[1], /zGet\('\/sync-pulse'\)/, "cây phải làm tươi qua đường RẺ");
  assert.doesNotMatch(body[1], /memory-status/, "không được kéo cả bảng số về chỉ để vẽ lại cây");
  assert.doesNotMatch(body[1], /fresh=1/, "và tuyệt đối không cache-bust trong một vòng poll 5 giây");
  // Vòng canh đăng nhập vẫn phải nhả nhịp 5 s — đây là thứ làm cái giá ở trên nhân lên, nên nếu
  // ai đổi nhịp thì phải đọc lại cả khối này.
  const poll = /function connPoll\(left\)\{([\s\S]*?)\n {2}\}/.exec(fe);
  assert.ok(poll, "phải tìm được connPoll");
  assert.match(poll[1], /\},5000\);/, "nhịp canh đăng nhập là 5 s — đổi thì phải cân lại giá mỗi lượt ở trên");
});
