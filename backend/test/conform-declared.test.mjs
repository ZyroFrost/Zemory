// off-standard-dir đọc SLOT KHAI trong `03_STRUCTURE §3` của chính project (HP điều 3 file-wins,
// điều 13 khai-vào-chuẩn) + hai quy ước chuẩn (python `backend/<pkg>/` · `api/vN`).
//
// Bất biến phải giữ — hệt tinh thần conform-foreign: nới để hết BÁO OAN, KHÔNG nới thành xanh-giả.
//   ① concern ĐÃ KHAI trong §3 (leaf `schemas/` · freeform parent `workspaces/`) ⇒ KHÔNG off-standard;
//   ② `backend/<pkg>/` có __init__.py (src-equivalent) + `api/vN` ⇒ KHÔNG off-standard;
//   ③ thư mục code tên VÔ NGHĨA, KHÔNG khai, KHÔNG phải pkg-root/api-version ⇒ **VẪN ĐỎ**
//      (nếu ca này xanh là đã nới luật — cổng không đỏ được là cổng giả).

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { conform } from "../../dist/docs/conform.js";
import { declaredSlots, extraDirOk } from "../../dist/docs/structure-tree.js";
import { tempDir } from "./helpers.mjs";

// §3 tối thiểu — chỉ cần các DÒNG CÂY `├── name/` để parser bắt được slot khai.
const STRUCTURE_MD = `# Cấu trúc repo chuẩn — hệ APP

## 3. Cây thư mục — ghi chú TỪNG DÒNG
\`\`\`
App/
├── backend/                     ★ server-side
│   ├── app/                     ★ (repo NÀY) Python package = src/ — FastAPI
│   │  ├── api/            [opt]  endpoint app mình mở
│   │  │   └── v1/          [opt]  version hoá API
│   │  ├── schemas/        [opt]  DTO pydantic
│   │  └── services/      [opt]  business logic
├── workspaces/              ★ (repo NÀY) mỗi con = 1 project pipeline; tên con tuỳ project — không phải slot chuẩn con
\`\`\`

## 4. Routing
(bỏ qua)
`;

/** Repo APP THẬT (không phải foreign) + khai slot riêng trong §3. */
function repo(t) {
  const root = tempDir(t, "zemory-declared-");
  const dirs = [
    "backend/app/api/v1",
    "backend/app/schemas",
    "backend/app/services",
    "backend/app/junkzone", // ← tên vô nghĩa, KHÔNG khai: PHẢI đỏ
    "workspaces/frost_wing_symphony/src",
    "workspaces/demo_audio_flow/nodes",
    "docs/agent",
    "docs/plan",
  ];
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });
  // Python package: __init__.py ở gốc package + code trong từng slot
  writeFileSync(join(root, "backend/app/__init__.py"), "\n");
  writeFileSync(join(root, "backend/app/api/v1/routes.py"), "r = 1\n");
  writeFileSync(join(root, "backend/app/schemas/dto.py"), "s = 1\n");
  writeFileSync(join(root, "backend/app/services/logic.py"), "l = 1\n");
  writeFileSync(join(root, "backend/app/junkzone/blob.py"), "j = 1\n");
  writeFileSync(join(root, "workspaces/frost_wing_symphony/src/pipe.py"), "p = 1\n");
  writeFileSync(join(root, "workspaces/demo_audio_flow/nodes/node.py"), "n = 1\n");
  writeFileSync(join(root, "AGENTS.md"), "# x\n");
  for (const f of ["01_CONSTITUTION", "02_RULES", "04_SKILLS", "05_TODO", "06_CHANGES"]) {
    writeFileSync(join(root, "docs", "agent", `${f}.md`), "# x\n");
  }
  writeFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), STRUCTURE_MD);
  writeFileSync(join(root, "docs", "plan", "00_overview.md"), "# x\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ profile: "app" }));
  return root;
}

test("declaredSlots đọc đúng slot khai trong §3 (chỉ tree entry, không nuốt prose)", (t) => {
  const root = repo(t);
  const d = declaredSlots(root);
  for (const s of ["backend", "app", "api", "v1", "schemas", "services", "workspaces"]) {
    assert.ok(d.has(s), `phải bắt được slot khai "${s}"`);
  }
  assert.ok(!d.has("junkzone"), "junkzone KHÔNG khai trong §3 ⇒ không được có trong declaredSlots");
});

test("extraDirOk: khai/quy ước ⇒ true; bừa ⇒ false (không nới)", (t) => {
  const root = repo(t);
  const d = declaredSlots(root);
  // ① leaf khai
  assert.ok(extraDirOk("backend/app/schemas", root, d), "schemas đã khai");
  // ② python pkg root + declared app
  assert.ok(extraDirOk("backend/app", root, d), "backend/app = pkg root (__init__.py) / khai");
  // ③ api/vN
  assert.ok(extraDirOk("backend/app/api/v1", root, d), "api/v1 = versioning");
  // ① freeform parent
  assert.ok(extraDirOk("workspaces/frost_wing_symphony", root, d), "workspaces/* = con của freeform parent đã khai");
  assert.ok(extraDirOk("workspaces/demo_audio_flow/nodes", root, d), "cả cháu của freeform parent");
  // ③ bừa — KHÔNG khai, KHÔNG phải pkg-root/api-version
  assert.ok(!extraDirOk("backend/app/junkzone", root, d), "junkzone bừa ⇒ KHÔNG được exempt");
});

test("conform: concern đã khai HẾT đỏ; dir bừa VẪN ĐỎ (cổng còn nổ được)", (t) => {
  const root = repo(t);
  const off = conform(root).items.find((i) => i.check === "off-standard-dir");
  const samples = off ? off.samples : [];
  // các concern đã khai / theo quy ước: KHÔNG được nằm trong off-standard
  for (const ok of ["backend/app", "backend/app/api/v1", "backend/app/schemas", "workspaces/frost_wing_symphony", "workspaces/demo_audio_flow/nodes"]) {
    assert.ok(!samples.includes(ok), `báo oan concern đã khai: ${ok}`);
  }
  // chiều ngược — dir code bừa CHƯA khai PHẢI còn đỏ, nếu không thì đã nới luật
  assert.ok(off, "phải còn báo off-standard cho dir bừa — cổng không đỏ được là cổng giả");
  assert.ok(off.samples.includes("backend/app/junkzone"), `phải nêu đúng dir bừa, thấy ${JSON.stringify(off.samples)}`);
  assert.equal(off.level, "blocking", "off-standard là lỗi CHẶN");
});
