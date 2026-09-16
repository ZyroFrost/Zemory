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
import { SLOT_ROLES, buildFolderTree, declaredSlots } from "../../dist/docs/structure-tree.js";
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
test("the folder tree and the code graph cover the SAME file set - extended languages included", (t) => {
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
test("a pure ts/py store: the tree does NOT take a non-source file as a leaf", (t) => {
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

// ── NON-APP: graph phải đọc từ điển slot CỦA CHÍNH REPO, không phải bảng cứng của chuẩn APP.
//
// Điều 13 đòi ba lăng kính (03_STRUCTURE · cây thư mục · graph) nói CÙNG một chuyện. Tới
// 2026-09-16 graph chỉ đọc `SLOT_ROLES` (72 slot của chuẩn APP) nên mọi slot mà một repo
// non-app tự khai ở §3 đều rơi vào "(ngoài chuẩn)". Hai lỗ, cả hai im lặng:
//   ① `declaredSlots` tìm section theo SỐ (`## 3.`) — mà chuẩn non-app đặt cây ở `## 2.`
//      (nó không có mục "hai cách sắp xếp code") ⇒ đọc nhầm sang mục Routing ⇒ TẬP RỖNG;
//   ② slot tính theo thư mục cha TRỰC TIẾP — nhưng `tasks/<case>/pipeline/x.py` có cha là
//      `pipeline`, trong khi chuẩn non-app cho phép đặt tên tự do BÊN TRONG `tasks/`.
// Đo trên `Dept_IT` trước khi vá: 8/10 file "(ngoài chuẩn)", `declaredSlots` = 0, concern = 0.
// Cổng cũ chỉ canh 03 của zemory (một repo APP, nơi hai tập trùng nhau) nên không thể bắt được.
test("NON-APP: slot khai ở §3 của chính repo phải được graph nhận, kể cả khi cây đánh số khác", (t) => {
  const root = mkdtempSync(join(tmpdir(), "zemory-nonapp-slot-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  // Đánh số KIỂU NON-APP: cây ở §2, Routing ở §3 (chuẩn app là §3 và §4).
  writeFileSync(
    join(root, "docs", "agent", "03_STRUCTURE.md"),
    [
      "# chuan non-app (fixture)",
      "## 1. Nguyên tắc",
      "## 2. Cây thư mục — ghi chú TỪNG DÒNG",
      "```text",
      "├── tasks/          [opt]  1 CASE = 1 FOLDER",
      "├── sources/        [opt]  định nghĩa nguồn",
      "```",
      "## 3. Routing — cần gì / có gì → vào đâu",
      "| Có gì | vào đâu |",
      "|---|---|",
      "| một case mới | `tasks/<case>/` |",
    ].join("\n"),
  );
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  mkdirSync(join(root, "tasks", "IT_Daily_Check", "pipeline"), { recursive: true });
  writeFileSync(join(root, "tasks", "IT_Daily_Check", "pipeline", "01_check.py"), "x = 1\n");
  mkdirSync(join(root, "sources"), { recursive: true });
  writeFileSync(join(root, "sources", "load.py"), "y = 2\n");

  const slots = declaredSlots(root);
  assert.ok(slots.has("tasks") && slots.has("sources"), `§3 đánh số non-app phải đọc được: ${[...slots]}`);

  const g = buildCodeGraph(root);
  const bySlot = Object.fromEntries(g.nodes.map((n) => [n.id, n.slot ?? "(ngoài chuẩn)"]));
  assert.equal(bySlot["sources/load.py"], "sources", "slot khai riêng phải được nhận");
  assert.equal(
    bySlot["tasks/IT_Daily_Check/pipeline/01_check.py"],
    "tasks",
    "con TỰ DO bên trong `tasks/` vẫn thuộc slot `tasks` (chuẩn non-app cho phép đặt tên tự do ở đó)",
  );
});

// Ca ÂM: miễn trừ "cha tự do" KHÔNG được lan sang chuẩn APP — ở đó luật ngược lại
// ("trong một domain chỉ dùng slot của từ điển"), nên một thư mục con lạ vẫn phải là ngoài chuẩn.
test("APP: con lạ bên trong một slot KHÔNG được ăn theo cha — miễn trừ chỉ dành cho non-app", (t) => {
  const root = mkdtempSync(join(tmpdir(), "zemory-app-strict-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "backend", "src", "services", "helpers_tam"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  writeFileSync(join(root, "backend", "src", "services", "helpers_tam", "x.ts"), "export const a = 1\n");

  const g = buildCodeGraph(root);
  const n = g.nodes.find((x) => x.id === "backend/src/services/helpers_tam/x.ts");
  assert.ok(n, "file phải có node");
  assert.equal(n.slot, undefined, "`services` KHÔNG nằm trong NONAPP_FREEFORM_PARENTS ⇒ con lạ vẫn ngoài chuẩn");
});
