// BACKEND KHÔNG ĐƯỢC GHÉP SẴN CÂU TIẾNG VIỆT RỒI BẮT UI HIỂN THỊ NGUYÊN VĂN.
//
// `02_RULES §Ngôn ngữ` đòi mọi chuỗi người-dùng-thấy đi qua i18n, có cả hai bản. Bảng Liên kết
// vi phạm ở tầng sâu hơn frontend: `connections.ts` ghép thẳng `kiểm lần cuối 7 giờ trước`,
// `store đã biết nhưng không còn trên đĩa: …` rồi gửi lên. UI nhận về một CÂU, không có cách nào
// dịch — bật `lang=en` thì bảng vẫn ra tiếng Việt, và không lỗi nào nổ.
//
// Cách chữa (2026-08-13): gửi kèm `detailCode` + `detailArgs` BÊN CẠNH `detail` — thêm chứ không
// thay, nên thứ gì đang đọc `detail` vẫn chạy y nguyên. UI ghép câu theo ngôn ngữ của nó.
//
// Cổng canh HAI ĐẦU, vì hỏng một đầu là im lặng: backend quên gửi mã ⇒ UI lặng lẽ rơi về câu
// tiếng Việt; UI quên đọc mã ⇒ mã gửi lên chẳng ai dùng. Cả hai đều không ném lỗi.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { listConnections } from "../../dist/memory/connections.js";

const CODES = new Set(["lastChecked", "neverChecked", "storePath", "storeGone", "noStore"]);

test("mọi dòng Liên kết đều mang detailCode hợp lệ", () => {
  const rows = listConnections();
  assert.ok(rows.length > 0, "không có dòng nào để kiểm — kho rỗng?");
  const bad = rows.filter((r) => !CODES.has(r.detailCode));
  assert.deepEqual(
    bad.map((r) => `${r.source}: ${r.detailCode}`),
    [],
    "dòng thiếu mã ⇒ UI rơi về câu tiếng Việt ghép sẵn ở server",
  );
});

test("tham số đi kèm mã — không có tham số thì UI ghép ra câu cụt", () => {
  for (const r of listConnections()) {
    if (r.detailCode === "lastChecked") {
      assert.ok(r.detailArgs?.at, `${r.source}: lastChecked mà thiếu 'at' ⇒ UI hiện "kiểm lần cuối " rỗng`);
    }
    if (r.detailCode === "storePath" || r.detailCode === "storeGone") {
      assert.ok(r.detailArgs?.path, `${r.source}: ${r.detailCode} mà thiếu 'path'`);
    }
  }
});

test("UI phải ĐỌC mã, không in thẳng detail của server", () => {
  const src = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.match(src, /function connDetail\(/u, "thiếu hàm ghép câu theo ngôn ngữ");
  assert.match(src, /connDetail\(r\)/u, "bảng Liên kết phải render qua connDetail()");
  assert.ok(
    !/\+r\.detail\b/u.test(src),
    "còn in thẳng r.detail — câu đó do server ghép bằng tiếng Việt, UI không dịch được",
  );
});

test("cả hai dict có đủ key của bảng Liên kết", () => {
  const dict = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  const en = dict.indexOf("en:{");
  for (const k of ["conn.lastChecked", "conn.storeGone", "conn.noStore", "conn.unknown"]) {
    assert.ok(dict.slice(0, en).includes(`'${k}'`), `dict vi thiếu ${k}`);
    assert.ok(dict.slice(en).includes(`'${k}'`), `dict en thiếu ${k}`);
  }
});
