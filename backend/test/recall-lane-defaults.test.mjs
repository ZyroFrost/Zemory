// Khoá MẶC ĐỊNH của hai lane recall thêm 2026-08-10 — và khoá luôn phép ĐẾM BUNDLE.
//
// Vì sao cần: cả `rm3` lẫn `rare` đều TRƯỢT CỔNG trên corpus 68 nhãn (bench --recall
// --no-rerank): RM3 làm tụt chính `@40` (47% → 44%) — thứ nó sinh ra để cứu — và phá lane
// FTS-thuần (MRR 0,191 → 0,154), tức đường nhanh của app lẫn đường fail-open; lane từ-hiếm
// cũng thua (MRR 0,288 → 0,277). Điều 12 cấm bật mặc định thứ chưa thắng net, nên mặc định
// phải là TẮT — và đây đúng loại mặc định "trôi im lặng" mà repo đã trả giá một lần với
// rerank (vá GIÁ TRỊ trong config nhưng để nguyên `?? true` ở hàm đọc). Xem
// `settings-defaults.test.mjs` — test này là bản mở rộng cùng doctrine cho hai cờ mới.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { rareEnabled, rm3Enabled } from "../../dist/memory/search.js";

/** Xoá sạch cờ env để đo đúng MẶC ĐỊNH, không đo giá trị máy này tình cờ đang đặt. */
function withoutFlags(fn) {
  const keys = ["ZEMORY_RM3", "ZEMORY_RARE"];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  try {
    return fn();
  } finally {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test("KHÔNG có cờ env ⇒ RM3 TẮT (trượt cổng: @40 47%→44%, FTS-thuần MRR 0,191→0,154)", () => {
  withoutFlags(() => assert.equal(rm3Enabled(), false));
});

test("KHÔNG có cờ env ⇒ lane từ-hiếm TẮT (trượt cổng: MRR 0,288→0,277)", () => {
  withoutFlags(() => assert.equal(rareEnabled(), false));
});

test("bật được bằng env khi cần đo lại — cả hai cờ", () => {
  const prev = { r: process.env.ZEMORY_RM3, k: process.env.ZEMORY_RARE };
  try {
    process.env.ZEMORY_RM3 = "1";
    process.env.ZEMORY_RARE = "1";
    assert.equal(rm3Enabled(), true);
    assert.equal(rareEnabled(), true);
  } finally {
    if (prev.r === undefined) delete process.env.ZEMORY_RM3;
    else process.env.ZEMORY_RM3 = prev.r;
    if (prev.k === undefined) delete process.env.ZEMORY_RARE;
    else process.env.ZEMORY_RARE = prev.k;
  }
});

test("tham số ép (force) thắng env — để bench đo được cả hai chiều trong một tiến trình", () => {
  process.env.ZEMORY_RM3 = "1";
  try {
    assert.equal(rm3Enabled(false), false);
    assert.equal(rm3Enabled(true), true);
  } finally {
    delete process.env.ZEMORY_RM3;
  }
});

// ── Đếm bundle Drive ────────────────────────────────────────────────────────────────────
//
// Bug thật 2026-08-09: ô "N bundle" trên UI hiện **0** trong khi Drive có 3 file (634 MB).
// Phép đếm khớp hậu tố ĐỜI CŨ `.zemory.enc` — thứ mà `share.ts` tự gọi là `legacyName` —
// còn bộ ghi/đọc series hiện tại sinh `global_memory.<host>.<seq>.enc`. Máy nào đã lên
// định dạng series thì ô đếm vĩnh viễn ra 0: sai lệch IM LẶNG, không cổng nào đỏ, và người
// dùng đọc thành "chưa từng sync". Test canh đúng ca đó.
test("đếm bundle phải thấy CẢ định dạng series lẫn tên đời cũ", async () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-drive-"));
  try {
    writeFileSync(join(dir, "global_memory.SS01-IT-12.000012.enc"), "x");
    writeFileSync(join(dir, "global_memory.SS01-IT-12.000013.enc"), "x");
    writeFileSync(join(dir, "global_memory.OLDHOST.zemory.enc"), "x"); // tên đời cũ
    writeFileSync(join(dir, "readme.txt"), "x"); // không phải bundle
    writeFileSync(join(dir, "notes.md"), "x");

    // Gọi ĐÚNG hàm production (`probeDrive`), không viết lại phép lọc trong test —
    // test soi bản sao logic là test soi file chết, xanh mà chẳng canh gì.
    const { probeDriveForTest } = await import("../../dist/ui.js");
    const r = probeDriveForTest(dir);

    assert.equal(r.bundles, 3, "2 bundle series + 1 bundle đời cũ, KHÔNG đếm .txt/.md");
    assert.equal(r.linked, true);
    assert.equal(r.exists, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
