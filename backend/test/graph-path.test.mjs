// `graph path` + god-nodes — hấp thụ từ khảo sát Graphify 2026-08-21 (user chốt "mượn cái
// nó thắng"). BFS thuần trên cạnh ĐÃ CÓ, tất định, 0 LLM (điều 6/13). Test hàm thuần —
// graph fixture dựng tay để không phụ thuộc đĩa/CPU (chạy được cả lúc job embed bận).

import assert from "node:assert/strict";
import test from "node:test";
import { matchFileId, shortestPathEdges, topHubs } from "../../dist/memory/graph/graph.js";

const E = (from, to, type, kind = "declared") => ({ from, to, type, kind });

test("đường NGẮN NHẤT: chọn đường 2 bước thay vì 3, giữ nguyên loại + hạng từng cạnh", () => {
  const edges = [
    E("a", "b", "imports"), E("b", "c", "imports"), E("c", "d", "imports"), // đường dài 3
    E("a", "x", "imports"), E("x", "d", "calls", "inferred"),               // đường ngắn 2
  ];
  const p = shortestPathEdges(edges, "a", "d");
  assert.ok(p, "phải nối được");
  assert.equal(p.length, 2, `phải là đường ngắn nhất, nhận ${p.length} bước`);
  assert.equal(p[1].type, "calls");
  assert.equal(p[1].kind, "inferred", "hạng cạnh phải đi theo từng bước — suy luận không được giả dạng (điều 13)");
});

test("BFS đi HAI CHIỀU nhưng phải nói thật chiều gốc của cạnh (forward=false)", () => {
  // b imports a; hỏi đường a→b vẫn phải ra (liên quan không có hướng) nhưng bước phải khai ngược.
  const p = shortestPathEdges([E("b", "a", "imports")], "a", "b");
  assert.ok(p && p.length === 1);
  assert.equal(p[0].forward, false, "cạnh gốc trỏ b→a — in xuôi là nói dối chiều");
});

test("không nối được ⇒ null (đừng bịa đường); cùng node ⇒ đường rỗng", () => {
  assert.equal(shortestPathEdges([E("a", "b", "imports")], "a", "z"), null);
  assert.deepEqual(shortestPathEdges([], "a", "a"), []);
});

test("matchFileId: exact → suffix → basename, nhiều ứng viên thì TRẢ DANH SÁCH chứ không đoán", () => {
  const g = { nodes: [{ id: "backend/src/ui.ts" }, { id: "frontend/scripts/ui.ts" }, { id: "backend/src/cli.ts" }] };
  assert.equal(matchFileId(g, "backend/src/cli.ts").id, "backend/src/cli.ts");
  assert.equal(matchFileId(g, "cli.ts").id, "backend/src/cli.ts");
  const amb = matchFileId(g, "ui.ts");
  assert.equal(amb.id, null, "hai file cùng tên — tự chọn một là đoán hộ");
  assert.equal(amb.candidates.length, 2);
  assert.equal(matchFileId(g, "khong-ton-tai.ts").id, null);
});

test("topHubs xếp theo TỔNG BẬC — node fan-out cao không được vô hình như bảng chỉ-fan-in", () => {
  // Ca thật đo trên repo 2026-08-21: ui.ts (fanIn 1, fanOut 42) đứng #2 tổng bậc mà bảng
  // hubs cũ (fan-in) không hề liệt kê. Fixture tái tạo đúng hình dạng đó.
  const g = { nodes: [
    { id: "db.ts", fanIn: 40, fanOut: 0 },
    { id: "ui.ts", fanIn: 1, fanOut: 42 },
    { id: "leaf.ts", fanIn: 2, fanOut: 1 },
  ] };
  const top = topHubs(g, 2);
  assert.deepEqual(top.map((h) => h.id), ["ui.ts", "db.ts"], "tổng bậc: ui.ts (43) phải đứng trên db.ts (40)");
});
