// index ↔ structure ↔ graph must stay in sync (user 2026-07-22). The graph's
// SLOT_ROLES (backend/src/docs/structure-tree.ts) is a hand-authored dictionary
// that MUST cover every slot 03_STRUCTURE routes to — otherwise the folder-tree
// conformance view mislabels a standard, present folder as "non-standard" (this is
// exactly how `platform/` silently drifted). This test parses the routing paths in
// 03_STRUCTURE and fails if any routed slot has no role in the graph.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { SLOT_ROLES, buildFolderTree } from "../../dist/docs/structure-tree.js";
import { buildCodeGraph } from "../../dist/memory/graph/graph.js";

const md = readFileSync(new URL("../../docs/agent/03_STRUCTURE.md", import.meta.url), "utf8");

// Every first-level slot the standard routes to, under backend/src/ and frontend/.
// (Sub-paths like backend/src/store/queries collapse to their slot; `<domain>`
// placeholders don't match [a-z].)
function routedSlots() {
  const slots = new Set();
  for (const m of md.matchAll(/backend\/src\/([a-z][a-z0-9_]*)/g)) slots.add(m[1]);
  for (const m of md.matchAll(/(?:^|[^a-z])frontend\/([a-z][a-z0-9_]*)/g)) slots.add(m[1]);
  return slots;
}

test("every slot 03_STRUCTURE routes to has a role in the graph's SLOT_ROLES (no silent drift)", () => {
  const missing = [...routedSlots()].filter((s) => !(s in SLOT_ROLES)).sort();
  assert.deepEqual(
    missing,
    [],
    "03_STRUCTURE routes to these slots but backend/src/docs/structure-tree.ts SLOT_ROLES has no role — " +
      "add them so the folder-tree stops flagging a standard folder as non-standard",
  );
});

// ── Cây folder ↔ code graph phải đi ĐÚNG CÙNG MỘT TẬP FILE ────────────────────
// Bất biến này do chính hai file tự khai (comment ở `graph.ts` §SRC_EXT và ở
// `structure-tree.ts` §lá-mã-nguồn) nhưng TRƯỚC 2026-08-21 không có cổng nào canh — nên đợt mở
// đa ngôn ngữ thêm `EXTRA_LANG_EXT` cho graph mà quên cây, và audit đo được trên repo giả:
// graph 5 node · cây 2 dòng ⇒ 3 node `.go/.java/.sh` KHÔNG có dòng nào trong cây. Zemory không
// lộ vì file `.sh` duy nhất của nó nằm trong `external/` (bị IGNORE) — tức bệnh chỉ hiện ở kho
// của user khác, đúng loại lỗi không ai thấy cho tới khi có người báo.
//
// Ca chạy trên REPO GIẢ (không phải repo thật): repo thật có thể tình cờ không chứa đuôi nào
// trong `EXTRA_LANG_EXT`, và một cổng chỉ xanh vì "không có dữ liệu để sai" thì không soi gì.
test("cây folder và code graph đi CÙNG một tập file — kể cả ngôn ngữ mở rộng", (t) => {
  const root = mkdtempSync(join(tmpdir(), "zemory-parity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (rel, body) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  put("AGENTS.md", "# fixture\n");
  put("backend/src/services/calc.ts", "export function calc(){return 1}\n");
  put("backend/src/services/tool.py", "def run():\n    pass\n");
  put("backend/src/services/worker.go", "package main\nfunc Work() {}\n");
  put("backend/src/services/Tool.java", "class Tool { void run(){} }\n");
  put("devops/deploy.sh", "#!/bin/sh\ndeploy() { echo hi; }\n");
  put("docs/agent/05_TODO.md", "# todo\n");

  const graphFiles = new Set(buildCodeGraph(root).nodes.map((n) => n.id));
  const treeFiles = new Set();
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n.isFile) treeFiles.add(n.path);
      if (n.children) walk(n.children);
    }
  })(buildFolderTree(root).tree);

  // Cả hai phải THẤY thứ gì đó — nếu một bên rỗng thì phép so bên dưới xanh giả.
  assert.ok(graphFiles.size >= 5, `graph phải thấy ≥5 file, đang thấy ${graphFiles.size}`);
  assert.ok(treeFiles.size >= 5, `cây phải thấy ≥5 file, đang thấy ${treeFiles.size}`);

  const onlyGraph = [...graphFiles].filter((f) => !treeFiles.has(f)).sort();
  const onlyTree = [...treeFiles].filter((f) => !graphFiles.has(f)).sort();
  assert.deepEqual(
    onlyGraph,
    [],
    "graph có node mà cây folder KHÔNG có dòng — dùng `isSourceLeaf` ở CẢ HAI chỗ (bug 2026-08-21)",
  );
  assert.deepEqual(onlyTree, [], "cây có dòng mà graph không có node — cây đang nhận đuôi graph không đi");
});

// Ca ÂM của chính cổng trên: kho THUẦN ts/js/py không được đổi hành vi vì đợt vá này (nếu bản vá
// vô tình nhận thêm `.md`/`.json` vào lá mã nguồn thì đây là chỗ nó lộ ra).
test("kho thuần ts/py: cây KHÔNG nhận file phi-mã-nguồn thành lá", (t) => {
  const root = mkdtempSync(join(tmpdir(), "zemory-parity2-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "backend", "src", "services"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  writeFileSync(join(root, "backend", "src", "services", "calc.ts"), "export const a = 1\n");
  writeFileSync(join(root, "backend", "src", "services", "notes.md"), "khong phai ma nguon\n");
  writeFileSync(join(root, "backend", "src", "services", "data.json"), "{}\n");

  const treeFiles = [];
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n.isFile) treeFiles.push(n.path);
      if (n.children) walk(n.children);
    }
  })(buildFolderTree(root).tree);

  assert.deepEqual(treeFiles, ["backend/src/services/calc.ts"], "chỉ file mã nguồn mới là lá");
});
