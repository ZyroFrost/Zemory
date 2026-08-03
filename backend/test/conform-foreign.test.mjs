// Hệ ADAPT — nhận repo CÓ SẴN cấu trúc riêng mà không nắn repo.
//
// Rủi ro lớn nhất của cả hệ, và là lý do file test này tồn tại: nếu chuẩn **uốn theo bất cứ thứ
// gì nó nhìn thấy**, `conform` thành lời nói vòng — "repo tuân thủ đúng cái repo đang là" —
// luôn xanh, gác con số không. Một cổng không thể đỏ thì không phải cổng.
//
// Nên bất biến phải giữ:
//   ① repo cấu trúc lạ + đã KHAI đủ ⇒ KHÔNG còn báo "không khớp slot chuẩn" (đó là điểm của hệ);
//   ② mọc thêm folder cấp 1 mà chưa khai ⇒ **ĐỎ** (cấu trúc gốc đã đổi, phải cập nhật có ý thức);
//   ③ khai một đường không tồn tại ⇒ **ĐỎ** (bảng đã lỗi thời);
//   ④ `.harness.json` thiếu/gõ sai/khai rỗng ⇒ **rơi về cổng chuẩn**, KHÔNG im lặng bỏ qua.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { conform, foreignLayout } from "../../dist/docs/conform.js";
import { tempDir } from "./helpers.mjs";

/** Repo giả có cấu trúc RIÊNG (không phải backend/frontend) + đủ file harness. */
function repo(t, harness) {
  const root = tempDir(t, "zemory-foreign-");
  // `vendor_stuff` CỐ Ý không phải slot nào trong từ điển — cần nó để chứng minh cổng chuẩn
  // THẬT SỰ đỏ được. (`pipelines`/`notebooks` hoá ra LÀ slot hợp lệ, nên chỉ dùng chúng thì
  // cổng chuẩn không bao giờ nổ và phép kiểm ④ thành vô nghĩa — đã dính đúng bẫy này.)
  for (const d of ["src", "pipelines", "notebooks", "vendor_stuff", "docs/agent", "docs/plan"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "src", "run.py"), "x = 1\n");
  writeFileSync(join(root, "pipelines", "flow.py"), "y = 2\n");
  writeFileSync(join(root, "notebooks", "eda.py"), "z = 3\n");
  writeFileSync(join(root, "vendor_stuff", "blob.py"), "w = 4\n"); // PHẢI có file: thư mục RỖNG không có code để chấm
  writeFileSync(join(root, "AGENTS.md"), "# x\n");
  for (const f of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS", "05_TODO", "06_CHANGES"]) {
    writeFileSync(join(root, "docs", "agent", `${f}.md`), "# x\n");
  }
  writeFileSync(join(root, "docs", "plan", "00_overview.md"), "# x\n");
  if (harness !== undefined) writeFileSync(join(root, "docs", ".harness.json"), typeof harness === "string" ? harness : JSON.stringify(harness));
  return root;
}

const checks = (root) => new Set(conform(root).items.map((i) => i.check));

test("khai đủ ⇒ KHÔNG còn đòi slot chuẩn (đây là điểm của hệ ADAPT)", (t) => {
  const root = repo(t, { layout: "foreign", slots: { backend: "src" }, extra: ["pipelines", "notebooks", "vendor_stuff", "docs"] });
  const c = checks(root);
  assert.ok(!c.has("off-standard-dir"), "vẫn đòi slot chuẩn ⇒ chế độ foreign không có tác dụng");
  assert.ok(!c.has("foreign-undeclared-dir"), "khai đủ mà vẫn báo thiếu khai");
  assert.ok(!c.has("foreign-missing-dir"), "khai đúng đường có thật mà vẫn báo thiếu");
});

test("mọc thêm folder cấp 1 chưa khai ⇒ ĐỎ", (t) => {
  const root = repo(t, { layout: "foreign", slots: { backend: "src" }, extra: ["docs"] });
  // `pipelines` và `notebooks` có thật nhưng KHÔNG được khai
  const items = conform(root).items.filter((i) => i.check === "foreign-undeclared-dir");
  assert.equal(items.length, 1, "phải báo có thư mục chưa khai");
  assert.equal(items[0].level, "blocking", "chưa khai phải là lỗi CHẶN, không phải nhắc nhở");
  assert.ok(items[0].samples.includes("pipelines"), `phải nêu đích danh, thấy ${JSON.stringify(items[0].samples)}`);
});

test("khai một đường KHÔNG tồn tại ⇒ ĐỎ (bảng lỗi thời)", (t) => {
  const root = repo(t, { layout: "foreign", slots: { backend: "src", frontend: "webapp" }, extra: ["pipelines", "notebooks", "vendor_stuff", "docs"] });
  const items = conform(root).items.filter((i) => i.check === "foreign-missing-dir");
  assert.equal(items.length, 1);
  assert.ok(items[0].samples.includes("webapp"), "phải chỉ đúng đường đã biến mất");
});

test("`.harness.json` thiếu / gõ sai / khai RỖNG ⇒ rơi về cổng chuẩn, KHÔNG im lặng bỏ qua", (t) => {
  for (const [nhan, h] of [
    ["không có file", undefined],
    ["JSON hỏng", "{ layout: foreign"],
    ["thiếu layout", { slots: { backend: "src" } }],
    ["khai rỗng", { layout: "foreign", slots: {}, extra: [] }],
  ]) {
    const root = repo(t, h);
    assert.equal(foreignLayout(root), null, `${nhan}: phải coi như KHÔNG ở hệ foreign`);
    const c = checks(root);
    assert.ok(!c.has("foreign-undeclared-dir"), `${nhan}: không được chạy cổng foreign`);
    assert.ok(c.has("off-standard-dir"), `${nhan}: phải rơi về cổng chuẩn — im lặng bỏ qua là xanh giả`);
  }
});

test("đường khai chấp nhận khác biệt hình thức (dấu / thừa, \\ của Windows)", (t) => {
  const root = repo(t, { layout: "foreign", slots: { backend: "src/" }, extra: ["pipelines\\", "./notebooks", "vendor_stuff", "docs"] });
  const c = checks(root);
  assert.ok(!c.has("foreign-undeclared-dir"), "khác dấu gạch mà báo chưa khai = bắt bẻ hình thức");
  assert.ok(!c.has("foreign-missing-dir"), "khác dấu gạch mà báo không tồn tại");
});
