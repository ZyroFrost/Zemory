// Edge id (plan 13 §4) — để một khẳng định DẪN ĐƯỢC NGUỒN: "A gọi B — edge:9f2c…".
//
// Từ 07-27 mới chỉ có phía PHÁT, và phát cũng chỉ ở payload UI: `graph export` — tức chính
// CONTRACT mà consumer đọc — KHÔNG hề đóng dấu eid. Nên trích dẫn cạnh là việc không ai làm
// nổi từ bên ngoài, và cũng không ai kiểm lại được. Test khoá hai tính chất bắt buộc:
// id phải DUY NHẤT (id trùng thì không định danh được gì) và phải TRA NGƯỢC được.

import assert from "node:assert/strict";
import test from "node:test";
import { stampEdgeIds } from "../../dist/memory/graph/graph.js";

test("a FUNCTION-LEVEL edge needs its own id - dropping the symbol makes ids collide en masse", () => {
  // Ca thật đo trên repo này 2026-08-06: 2.526 cạnh `calls` co còn 949 id, có id gánh
  // **157 cạnh khác nhau** (mọi lời gọi từ `go` sang cùng một file trùng id).
  const calls = [
    { from: "a.ts", to: "b.ts", type: "calls", kind: "inferred", fromSymbol: "go", toSymbol: "stdEsc" },
    { from: "a.ts", to: "b.ts", type: "calls", kind: "inferred", fromSymbol: "go", toSymbol: "showProjList" },
    { from: "a.ts", to: "b.ts", type: "calls", kind: "inferred", fromSymbol: "go", toSymbol: "ensureScreen" },
  ];
  const ids = stampEdgeIds(calls).map((e) => e.eid);
  assert.equal(new Set(ids).size, 3, "ba lời gọi khác nhau PHẢI ra ba id khác nhau");
});

test("the id of an `imports` edge does NOT change when the symbol dimension is added (published ids stay compatible)", () => {
  const e = { from: "backend/src/checks.ts", to: "backend/src/core/config.ts", type: "imports", kind: "declared" };
  // Giá trị này đo trên repo thật TRƯỚC khi vá; đổi nó = làm chết mọi trích dẫn đã phát ra.
  assert.equal(stampEdgeIds([e])[0].eid, "06dc5f274206");
});

test("the edge CLASS is part of the hash - a declared and an inferred pair are two facts of different class", () => {
  const a = stampEdgeIds([{ from: "x.ts", to: "y.ts", type: "imports", kind: "declared" }])[0].eid;
  const b = stampEdgeIds([{ from: "x.ts", to: "y.ts", type: "imports", kind: "inferred" }])[0].eid;
  assert.notEqual(a, b, "điều 13 cấm trộn hai hạng ⇒ chúng phải khác id");
});

test("deterministic: the same input always yields the same id, regardless of build order", () => {
  const mk = () => [
    { from: "b.ts", to: "c.ts", type: "imports", kind: "declared" },
    { from: "a.ts", to: "b.ts", type: "imports", kind: "declared" },
  ];
  const one = stampEdgeIds(mk());
  const two = stampEdgeIds(mk().reverse());
  const idOf = (list, from) => list.find((e) => e.from === from).eid;
  assert.equal(idOf(one, "a.ts"), idOf(two, "a.ts"));
  assert.equal(idOf(one, "b.ts"), idOf(two, "b.ts"));
});

test("a MODULE-level call (fromSymbol null) still hashes without throwing", () => {
  const e = { from: "a.ts", to: "b.ts", type: "calls", kind: "inferred", fromSymbol: null, toSymbol: "init" };
  const [stamped] = stampEdgeIds([e]);
  assert.match(stamped.eid, /^[0-9a-f]{12}$/);
});
