// LICENSE CỦA CẢ CÂY DEPENDENCY PHẢI TƯƠNG THÍCH Apache-2.0 — cổng máy cho mặt audit ⑧.
//
// HP điều 2 bắt "dependency/model mới phải rà license trước khi thêm", nhưng tới 2026-08-15 chưa
// có cổng nào KIỂM — mặt ⑧ là mặt audit duy nhất 0 máy canh (plan/18 §4). Lượt rà tay gần nhất
// (2026-08-13, đủ 190 gói cả tầng sâu) tốn một lượt agent và sẽ không ai lặp lại đúng hạn; cổng
// này làm cùng phép đo đó MỖI lần `npm run check`, và đỏ NGAY khi một gói mới mang license lạ.
//
// Quét CẢ CÂY (nested node_modules), không chỉ dependency trực tiếp — license xấu ở tầng sâu vẫn
// đi kèm sản phẩm. Đo 2026-08-15: 190 gói, phân bố MIT 127 · Apache-2.0 20 · BSD-3 15 · ISC 13 ·
// BSD-2 6 · còn lại là biểu thức OR/đơn lẻ hợp lệ; đúng HAI ca cần ngoại lệ (ghi ở EXCEPTIONS).
//
// BẪY ĐÃ TRẢ GIÁ, cổng này sinh ra để chốt nó: bản rà đầu 2026-08-13 tách `OR` và `AND` bằng
// CÙNG một regex nên `Apache-2.0 AND LGPL-3.0-or-later` LỌT QUA. Ngữ nghĩa đúng: OR = chọn được
// MỘT vế hợp lệ là đủ · AND = phải hợp lệ MỌI vế. Ở đây parse biểu thức SPDX thật (OR/AND/ngoặc)
// thay vì regex, và ca AND-trap nằm trong bộ tự-kiểm bên dưới — gỡ parser là test ĐỎ.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const NM = new URL("../../node_modules/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

// Giấy phép cho phép đứng MỘT MÌNH (SPDX id). Giữ HẸP có chủ đích: thứ chỉ xuất hiện trong vế OR
// (WTFPL, "Apache" trần của sqlite-vec…) KHÔNG cần vào đây — vế MIT của chúng đã đủ cho qua.
const ALLOWED = new Set([
  "MIT",
  "Apache-2.0",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "BlueOak-1.0.0",
  "Unlicense",
  "CC0-1.0",
]);

// Ngoại lệ ĐÍCH DANH — mỗi ca phải ghi license ĐÚNG NHƯ ĐANG THẤY + lý do chấp nhận.
// Test "ngoại lệ phải còn đúng sự thật" bên dưới canh cho danh sách này không thành trần chết:
// gói biến mất hay đổi license là đỏ, phải mở lại hồ sơ chứ không được để ngoại lệ cũ che ca mới.
const EXCEPTIONS = {
  // Nhị phân đóng kèm libvips (LGPL). Là optional dep của @huggingface/transformers; zemory
  // KHÔNG import `sharp` ở đâu (đo 2026-08-13). Nếu ĐÓNG GÓI PHÂN PHỐI thì loại nó hoặc kèm
  // notice LGPL — hồ sơ: 05_TODO audit ⑧ 2026-08-13.
  "@img/sharp-win32-x64": "Apache-2.0 AND LGPL-3.0-or-later",
  // Thiếu field license ở gói nhị phân theo nền tảng; gói cha @nativewindow/webview khai MIT,
  // cùng repo cùng version (đo 2026-08-13) — chỉ là thiếu metadata, không phải license lạ.
  "@nativewindow/webview-win32-x64-msvc": "(none)",
};

// ---- Parser biểu thức SPDX: expr := term (OR term)* · term := factor (AND factor)* ·
// ---- factor := '(' expr ')' | ID [WITH ID]. OR = một vế đủ · AND = mọi vế.
function tokenize(s) {
  return s.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/);
}
function licenseAllowed(expr, allowed = ALLOWED) {
  if (!expr || expr === "(none)") return false;
  const toks = tokenize(expr);
  let i = 0;
  const peek = () => toks[i];
  const eat = () => toks[i++];
  function factor() {
    if (peek() === "(") {
      eat();
      const v = orExpr();
      if (peek() === ")") eat();
      return v;
    }
    let id = eat();
    if (peek() === "WITH") { eat(); id += " WITH " + eat(); }
    return allowed.has(id);
  }
  function andExpr() {
    let v = factor();
    while (peek() === "AND") { eat(); v = factor() && v; }
    return v;
  }
  function orExpr() {
    let v = andExpr();
    while (peek() === "OR") { eat(); v = andExpr() || v; }
    return v;
  }
  const ok = orExpr();
  return i >= toks.length ? ok : false; // token thừa = biểu thức lạ ⇒ không cho qua bừa
}

// ---- Quét cả cây: mọi package.json dưới node_modules, kể cả nested.
function licenseOf(pkgJson) {
  let lic = pkgJson.license;
  if (lic && typeof lic === "object") lic = lic.type; // dạng cổ {type,url}
  if (!lic && Array.isArray(pkgJson.licenses)) lic = pkgJson.licenses.map((l) => l.type || l).join(" OR ");
  return lic || "(none)";
}
function scanTree(root) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.name.startsWith("@")) { walk(p); continue; }
      const pj = join(p, "package.json");
      if (existsSync(pj)) {
        try {
          const j = JSON.parse(readFileSync(pj, "utf8"));
          out.push({ name: j.name || e.name, version: j.version, license: licenseOf(j) });
        } catch { out.push({ name: e.name, version: "?", license: "(unreadable)" }); }
        const nested = join(p, "node_modules");
        if (existsSync(nested)) walk(nested);
      } else walk(p);
    }
  })(root);
  return out;
}

test("bộ tự-kiểm của parser SPDX — gồm đúng ca AND-trap đã lọt lượt rà tay", () => {
  // Ca PHẢI CHẶN (thiếu nhóm này thì cổng không thể nổ — luật 4 của audit):
  assert.equal(licenseAllowed("GPL-3.0-only"), false, "copyleft mạnh đứng một mình phải bị chặn");
  assert.equal(licenseAllowed("Apache-2.0 AND LGPL-3.0-or-later"), false,
    "AND-trap: một vế không hợp lệ là CẢ biểu thức không hợp lệ — chính ca đã lọt regex 2026-08-13");
  assert.equal(licenseAllowed("(none)"), false, "thiếu license không được cho qua im lặng");
  assert.equal(licenseAllowed("MIT AND SEE LICENSE IN LICENSE"), false, "token lạ không cho qua bừa");
  // Ca PHẢI CHO QUA (luật 7 — thiếu nhóm này thì không biết cổng có chặn nhầm không):
  assert.equal(licenseAllowed("MIT"), true);
  assert.equal(licenseAllowed("(MIT OR WTFPL)"), true, "OR: vế MIT hợp lệ là đủ");
  assert.equal(licenseAllowed("(BSD-2-Clause OR MIT OR Apache-2.0)"), true);
  assert.equal(licenseAllowed("MIT AND (Apache-2.0 OR GPL-2.0-only)"), true, "AND của hai vế đều thoả");
});

test("cả cây node_modules: mọi gói phải hợp lệ Apache-2.0 hoặc nằm trong ngoại lệ đích danh", () => {
  const pkgs = scanTree(NM);
  assert.ok(pkgs.length >= 150, `quét ra ${pkgs.length} gói — quá ít, nghi walker hỏng lặng (mốc thật 190)`);
  const bad = pkgs.filter((p) => !licenseAllowed(p.license) && !(p.name in EXCEPTIONS));
  assert.deepEqual(
    bad.map((p) => `${p.name}@${p.version} → ${p.license}`),
    [],
    "Gói mang license ngoài allowlist (HP điều 2: rà license TRƯỚC khi thêm dependency).\n" +
      "Hợp lệ thật thì thêm SPDX id vào ALLOWED; ca đặc thù thì thêm EXCEPTIONS kèm lý do + hồ sơ.",
  );
});

test("ngoại lệ phải còn ĐÚNG SỰ THẬT — gói đổi license hay biến mất là phải mở lại hồ sơ", () => {
  const pkgs = scanTree(NM);
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const stale = [];
  for (const [name, expected] of Object.entries(EXCEPTIONS)) {
    const p = byName.get(name);
    if (!p) stale.push(`${name}: không còn trong cây — xoá ngoại lệ này đi`);
    else if (p.license !== expected)
      stale.push(`${name}: license nay là "${p.license}" (hồ sơ ghi "${expected}") — rà lại rồi cập nhật`);
  }
  assert.deepEqual(stale, [], stale.join("\n"));
});
