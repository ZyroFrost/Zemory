// Bất biến an toàn đường dẫn dùng CHUNG cho `resolveDocPath` (docs/plan.ts) và `readDoc`
// (ui.ts). Trước đây là hai bản logic rời — audit 2026-07-27 gắn cờ "trùng", nhưng gộp
// thẳng hai HÀM thì sai vì chúng resolve khác nhau. Cái được gộp là đúng phép kiểm này.

import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { isWithinBase } from "../../dist/util/safe-path.js";
import { resolveDocPath } from "../../dist/docs/plan.js";

test("isWithinBase: chặn thoát thư mục, và KHÔNG khớp nhầm thư mục trùng tiền tố", () => {
  const base = resolve("/srv/proj/docs");
  assert.equal(isWithinBase(base, resolve("/srv/proj/docs/agent/02_RULES.md")), true);
  assert.equal(isWithinBase(base, base), true, "chính nó tính là nằm trong");

  assert.equal(isWithinBase(base, resolve("/srv/proj/docs/../secrets/share.key")), false, "..  phải bị chặn");
  assert.equal(isWithinBase(base, resolve("/srv/proj/secret.md")), false);
  // Đây là ca `startsWith` làm sai mà `relative()` làm đúng: "docs-backup" bắt đầu bằng "docs".
  assert.equal(isWithinBase(base, resolve("/srv/proj/docs-backup/x.md")), false, "trùng tiền tố KHÔNG phải nằm trong");
});

test("resolveDocPath vẫn ném khi bị ép ra ngoài docs/ (hành vi không đổi sau khi gộp guard)", () => {
  const root = resolve("/srv/proj");
  assert.equal(resolveDocPath(root, "docs/plan/00_overview.md"), resolve(root, "docs/plan/00_overview.md"));
  assert.throws(() => resolveDocPath(root, "../ngoai.md"), /Unsafe docs path/);
  assert.throws(() => resolveDocPath(root, "docs/../../etc/passwd"), /Unsafe docs path/);
  assert.throws(() => resolveDocPath(root, "package.json"), /Unsafe docs path/, "ngoài docs/ là chặn, dù vẫn trong repo");
});
