// Corpus chia lớp: ĐỘ PHỦ NHÃN phải hiện ra, không được im lặng.
//
// Lỗ này audit 2026-08-07 để lọt một lượt: `missing` là số đếm GỘP, còn bảng theo lớp chỉ
// tính trên nhãn giải được. Nên trên một kho khác (máy khác, kho đã forget bớt), một lớp còn
// 2/14 nhãn vẫn in ra tỉ lệ recall trông y như lớp đủ 14/14 — và lớp mất SẠCH nhãn thì biến
// mất khỏi bảng, không ai biết là nó chưa hề được đo. Số liệu sai mà không báo lỗi.
//
// Test đi thẳng vào `formatRecallBench` với kết quả dựng tay: không cần kho thật, không chạy
// mô hình, nên nó soi đúng phần trình bày — chỗ lỗ nằm.

import assert from "node:assert/strict";
import test from "node:test";
import { formatRecallBench } from "../../dist/evals/recallbench.js";
import { corpusByKind, RECALL_CORPUS } from "../../dist/evals/recall-corpus.js";

const laneStat = (n) => ({ n, hit1: n, hit3: n, hit10: n, hit40: n, mrr: 1 });

/** Kết quả giả: lane hybrid có `byKind`, kèm `coverage` mô tả nhãn giải được / tổng. */
function fakeResult({ byKind, coverage, resolved }) {
  return {
    corpus: 56,
    resolved,
    missing: 56 - resolved,
    coverage,
    lanes: [{ lane: "hybrid", hit1: resolved, hit3: resolved, hit10: resolved, hit40: resolved, mrr: 1, msAvg: 10, ranks: [], byKind }],
  };
}

test("lớp thiếu nhãn ⇒ cột n in dạng giải-được/tổng (không giả vờ đầy đủ)", () => {
  const out = formatRecallBench(
    fakeResult({
      byKind: { prose: laneStat(34), tool_use: laneStat(2) },
      coverage: { prose: { have: 34, total: 34 }, tool_use: { have: 2, total: 14 }, tool_result: { have: 0, total: 8 } },
      resolved: 36,
    }),
  ).join("\n");

  assert.match(out, /tool_use\s+2\/14/, `lớp thiếu nhãn phải in 2/14, nhận:\n${out}`);
  assert.match(out, /prose\s+34\s/, "lớp đủ nhãn thì in số trần, không thêm mẫu số thừa");
});

test("lớp MẤT SẠCH nhãn vẫn phải xuất hiện, kèm câu nói rõ CHƯA được đo", () => {
  const out = formatRecallBench(
    fakeResult({
      byKind: { prose: laneStat(34) },
      coverage: { prose: { have: 34, total: 34 }, tool_result: { have: 0, total: 8 } },
      resolved: 34,
    }),
  ).join("\n");

  assert.match(out, /tool_result/, "lớp mất sạch nhãn KHÔNG được biến mất khỏi bảng");
  assert.match(out, /CHƯA được đo/, "phải nói thẳng là lớp đó chưa được đo, đừng để người đọc tự suy");
});

test("corpusByKind phủ đúng toàn bộ corpus (không sót, không đếm trùng)", () => {
  const m = corpusByKind();
  const sum = [...m.values()].reduce((s, l) => s + l.length, 0);
  assert.equal(sum, RECALL_CORPUS.length, "tổng các lớp phải bằng corpus");
  assert.ok(m.get("prose")?.length >= 34, "34 nhãn viết trước khi phân lớp phải rơi vào prose");
  for (const k of ["tool_use", "tool_result"]) {
    assert.ok((m.get(k)?.length ?? 0) > 0, `phải có nhãn cho lớp ${k} — nếu không thì việc chia lớp là vô nghĩa`);
  }
});
