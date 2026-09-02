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

test("mã sản xuất: CẢ HAI đường đồng bộ đóng dấu bằng Date.now() lúc hoàn tất", () => {
  for (const name of ["dashCache", "heavyCache"]) {
    const assigns = [...UI.matchAll(new RegExp(`${name}\\s*=\\s*\\{\\s*at:\\s*([^,]+),`, "g"))].map((m) => m[1].trim());
    assert.ok(assigns.length > 0, `${name} phải có chỗ ghi cache`);
    for (const stamp of assigns) {
      assert.equal(
        stamp,
        "Date.now()",
        `${name} đóng dấu bằng '${stamp}' — mốc lấy TRƯỚC khi làm việc là cache tự sát (đo: lạnh 74 s > TTL 60 s)`,
      );
    }
  }
});

test("TTL vẫn phải LỚN HƠN nhịp poll của client, không thì mỗi lượt poll đều tính lại", () => {
  // Chú thích trong `ui.ts` nêu rõ ràng buộc này (poll 30 s) — giữ nó thành phép đo, không phải lời hứa.
  const ttl = Number(/const DASH_TTL_MS = ([\d_]+)/.exec(UI)?.[1]?.replace(/_/g, ""));
  assert.ok(Number.isFinite(ttl), "phải đọc được DASH_TTL_MS");
  assert.ok(ttl > 30_000, `DASH_TTL_MS=${ttl} phải lớn hơn nhịp poll 30 s của client`);
});
