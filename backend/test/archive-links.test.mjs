// ARCHIVE DỜI FILE XUỐNG SÂU MỘT TẦNG — ĐƯỜNG DẪN TƯƠNG ĐỐI PHẢI ĐI THEO.
//
// `zemory archive` cắt entry cũ từ `docs/agent/06_CHANGES.md` xuống `docs/agent/archive/`. Bản cũ
// chép NGUYÊN VĂN, nên mọi link tương đối trong đó tụt một tầng: `../../backend/src/…` (đúng khi
// đứng ở `docs/agent/`) hoá thành trỏ vào `docs/backend/…`, không tồn tại.
//
// Đo 2026-08-13: **26/26** link nội bộ trong `docs/agent/archive/06_CHANGES.md` gãy — KHÔNG một
// link nào còn đúng. Và nó KHÔNG BAO GIỜ tự lộ ra: file vẫn render, link vẫn xanh, không lệnh nào
// kêu. Một entry changelog dẫn tới code chính là để người đọc sau đi kiểm chứng lời khẳng định —
// link chết biến việc kiểm chứng đó thành ngõ cụt, mà vẫn trông như có bằng chứng.
//
// Cổng canh hai vế: hàm biến đổi làm ĐÚNG, và file archive THẬT trên đĩa không còn link gãy.

import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { deepenRelativeLinks } from "../../dist/docs/archive.js";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\//, "");

test("thêm đúng một tầng cho link tương đối, chừa link tuyệt đối/ngoài/placeholder", () => {
  assert.equal(deepenRelativeLinks("[a](../../backend/src/ui.ts)"), "[a](../../../backend/src/ui.ts)");
  assert.equal(deepenRelativeLinks("[a](03_STRUCTURE.md)"), "[a](../03_STRUCTURE.md)");
  assert.equal(deepenRelativeLinks("[a](./x.md)"), "[a](../x.md)");
  // KHÔNG được đụng: URL ngoài, neo trong trang, đường tuyệt đối, và placeholder của bản mẫu
  // (`docs_template/` cố ý chứa `<tên>`/`{n}` — biến đổi chúng là làm hỏng bản mẫu).
  for (const keep of ["[a](https://x.dev/y)", "[a](#muc)", "[a](/abs/path)", "[a](<repo>/data)", "[a]({n}.md)"]) {
    assert.equal(deepenRelativeLinks(keep), keep, `không được đổi: ${keep}`);
  }
});

test("file archive THẬT trên đĩa: 0 link nội bộ gãy", () => {
  // Vế này canh dữ liệu, không canh hàm: hàm đúng mà file cũ vẫn hỏng thì người đọc vẫn lạc.
  for (const rel of ["docs/agent/archive/06_CHANGES.md", "docs/agent/archive/05_TODO.md"]) {
    const file = resolve(REPO, rel);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    const broken = [];
    for (const m of src.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      if (target.includes("<") || target.includes("{")) continue;
      const clean = target.split("#")[0];
      if (!clean) continue;
      if (!existsSync(resolve(dirname(file), clean))) broken.push(target);
    }
    assert.deepEqual(broken, [], `${rel}: ${broken.length} link gãy — ${broken.slice(0, 5).join(" · ")}`);
  }
});
