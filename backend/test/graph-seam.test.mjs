// Cạnh BE↔FE "api seam" (plan 13 §4, user chốt 2026-08-07 — hấp thụ từ khảo sát Grapuco).
//
// FE nói chuyện với BE qua HTTP, không qua import ⇒ import-graph có ĐÚNG 0 cạnh giữa hai
// bờ. Seam v1 = khớp CHUỖI route (FE `zGet('/x')` ↔ BE chứa nguyên văn `"/x"`), nhãn
// inferred/textual — điều 13 cấm nó giả dạng chắc chắn. Tầng `resolved` chỉ có khi repo
// có typed contract (chưa repo nào có — để sau).

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeamEdges } from "../../dist/memory/graph/graph-seam.js";
import { buildCodeGraph } from "../../dist/memory/graph/graph.js";
import { tempDir } from "./helpers.mjs";

function repo(t, files) {
  const root = tempDir(t, "zseam-");
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const NODES = (...ids) => ids.map((id) => ({ id }));

test("seam: FE gọi route → BE chứa nguyên văn route ⇒ một cạnh api·inferred, gộp mức file", (t) => {
  const root = repo(t, {
    "frontend/scripts/a.js": "zGet('/foo?x='+v).then();\nfetch('/bar');\nzPost('/foo');",
    "backend/src/y.ts": 'if (p === "/foo") return; // handler',
  });
  const edges = buildSeamEdges(root, NODES("frontend/scripts/a.js", "backend/src/y.ts"));
  assert.equal(edges.length, 1, "hai route nhưng /bar không có handler ⇒ đúng 1 cạnh /foo");
  const e = edges[0];
  assert.equal(e.from, "frontend/scripts/a.js");
  assert.equal(e.to, "backend/src/y.ts");
  assert.equal(e.kind, "api");
  assert.equal(e.rel, "inferred", "khớp chuỗi là SUY LUẬN — điều 13 cấm giả dạng khai báo");
  assert.equal(e.confidence, "textual");
  assert.deepEqual(e.routes, ["/foo"]);
  assert.equal(e.count, 2, "zGet + zPost cùng /foo = 2 chỗ gọi");
});

test("seam: route cắt đúng ở ? và ở chỗ ghép biến — không nuốt query/template", (t) => {
  const root = repo(t, {
    "frontend/scripts/a.js": "zGet('/memory-scan?web=1');\nzGet('/check?feature='+f);\nfetch(`/doc${q}`);",
    "backend/src/y.ts": '"/memory-scan" · "/check" · "/doc"',
  });
  const edges = buildSeamEdges(root, NODES("frontend/scripts/a.js", "backend/src/y.ts"));
  assert.deepEqual(edges[0].routes, ["/check", "/doc", "/memory-scan"], "route TRẦN, không dính ?query hay ${var}");
});

test("seam: KHÔNG vớ chuỗi bừa — chỉ nhận fetch/zGet/zPost, bỏ đuôi file tĩnh", (t) => {
  const root = repo(t, {
    // '/etc/passwd' nằm trong chuỗi thường, '/logo.png' là asset — cả hai không phải API
    "frontend/scripts/a.js": "var p='/etc/passwd'; fetch('/logo.png'); zGet('/real');",
    "backend/src/y.ts": '"/etc/passwd" "/logo.png" "/real"',
  });
  const edges = buildSeamEdges(root, NODES("frontend/scripts/a.js", "backend/src/y.ts"));
  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0].routes, ["/real"]);
});

test("seam: repo không có frontend/ (non-app, CLI thuần) ⇒ trả [] êm, không ném", (t) => {
  const root = repo(t, { "backend/src/y.ts": '"/x"' });
  assert.deepEqual(buildSeamEdges(root, NODES("backend/src/y.ts")), []);
});

test("seam trên CHÍNH repo này: nối được frontend/scripts → backend/src/ui.ts", () => {
  const root = process.cwd();
  const g = buildCodeGraph(root);
  const edges = buildSeamEdges(root, g.nodes);
  assert.ok(edges.length >= 5, `repo này FE gọi BE khắp nơi — chỉ thấy ${edges.length} cạnh là sai`);
  for (const e of edges) {
    assert.ok(e.from.startsWith("frontend/"), `from phải là FE: ${e.from}`);
    assert.ok(e.to.startsWith("backend/"), `to phải là BE: ${e.to}`);
    assert.equal(e.rel, "inferred");
  }
  // ca cụ thể kiểm được: sources.js gọi /automation, handler nằm trong ui.ts
  const hit = edges.find((e) => e.from === "frontend/scripts/sources.js" && e.to === "backend/src/ui.ts");
  assert.ok(hit, "sources.js → ui.ts phải tồn tại");
  assert.ok(hit.routes.includes("/automation"), `routes phải chứa /automation, có: ${hit.routes.slice(0, 8)}`);
});
