// `isolated_pct` phải đo CODE CHẾT, không đo SỐ FILE TEST.
//
// Đo 2026-09-02: cổng đỏ **88/272 = 32,4%** (trần 30%) nhưng soi tay đủ 88 file thì **0 code chết**
// — 65 test · 17 script · 2 hook `guard.cjs` (host gọi lúc chạy) · 2 tài sản template ·
// `eslint.config.js` · `platform/window.ts` (daemon SPAWN nó bằng đường dẫn). Hệ quả tệ hơn con số
// sai: mẫu số bị chi phối bởi số file test ⇒ cổng **đỏ thêm mỗi lần thêm một test**, tức phạt đúng
// việc tốt. Một cổng không bao giờ xanh được thì sớm muộn bị bỏ qua (`02_RULES`).
//
// Sau khi loại lớp điểm-vào: **1/116 = 0,9%** (đúng `platform/window.ts`, được NÊU TÊN để người
// đọc tự phán), 158 file bị loại, trần 4% ⇒ đỏ khi có 5 module chết, dư địa 4.
import assert from "node:assert/strict";
import test from "node:test";

const { isEntryClassFile, graphFitness, FITNESS_GATES, ISOLATED_MIN_COUNT } = await import(
  "../../dist/memory/graph/graph.js"
);

test("isEntryClassFile: nhận đúng thứ KHÔNG THỂ có cạnh import", () => {
  for (const p of [
    "backend/test/web-autopull.test.mjs",
    "backend/test/helpers.mjs",
    "backend/scripts/gate.mjs",
    "frontend/scripts/sources.js",
    "docs/hooks/guard.cjs",
    "docs/hooks/precommit-guard.cjs",
    "docs_template/01_cowork_basic/check_install.py",
    "eslint.config.js",
  ]) {
    assert.equal(isEntryClassFile(p), true, `${p} phải bị loại khỏi phép đo code-chết`);
  }
  // Windows separator cũng phải nhận (chỉ mục docs của repo này lưu đường theo separator của OS).
  assert.equal(isEntryClassFile("backend\\test\\x.test.mjs"), true);
});

test("isEntryClassFile: CA ÂM — module nguồn thật KHÔNG được loại (không thì cổng thành trang trí)", () => {
  for (const p of [
    "backend/src/memory/db.ts",
    "backend/src/ui.ts",
    "backend/src/core/config.ts",
    "backend/src/memory/borrowcookies.ts",
    // Cố ý KHÔNG đặc cách: nó là entry được SPAWN, nhưng loại nó bằng đường dẫn sẽ loại luôn
    // `platform/tray.ts` vốn được import thật ⇒ để nó bị đếm, và cổng NÊU TÊN cho người phán.
    "backend/src/platform/window.ts",
  ]) {
    assert.equal(isEntryClassFile(p), false, `${p} là module nguồn — phải nằm TRONG phép đo`);
  }
  // "scripts" là một PHẦN của tên thư mục khác thì không được khớp.
  assert.equal(isEntryClassFile("backend/src/transcripts/parse.ts"), false, "'transcripts/' không phải 'scripts/'");
  assert.equal(isEntryClassFile("backend/src/latest.ts"), false);
});

/** Graph tối thiểu đủ cho `graphFitness`. */
const mk = (nodes) => ({
  root: "/x",
  nodes: nodes.map((n) => ({ fanIn: 0, fanOut: 0, loc: 1, bytes: 1, symbols: [], ...n })),
  edges: [],
  orphans: [],
  stats: { files: nodes.length, edges: 0, slots: 0, bytes: 0 },
});

test("fitness: test/script mồ côi KHÔNG làm đỏ; module nguồn mồ côi thì CÓ", () => {
  // 10 test mồ côi + 1 module nguồn được import ⇒ 0 cô lập trong diện đo.
  const onlyTests = mk([
    ...Array.from({ length: 10 }, (_, i) => ({ id: `backend/test/t${i}.test.mjs` })),
    { id: "backend/src/a.ts", fanIn: 1 },
  ]);
  const f1 = graphFitness(onlyTests);
  const m1 = f1.metrics.find((m) => m.metric === "isolated_pct");
  assert.equal(m1.value, 0, "10 test mồ côi không phải bệnh của repo");
  assert.equal(m1.passed, true);
  assert.match(m1.detail, /10 excluded as entry-class/, "phải NÓI RA đã loại bao nhiêu, không loại âm thầm");

  // Cùng số file, nhưng phần mồ côi là MODULE NGUỒN ⇒ phải đỏ.
  const deadSource = mk([
    ...Array.from({ length: 10 }, (_, i) => ({ id: `backend/src/dead${i}.ts` })),
    { id: "backend/src/a.ts", fanIn: 1 },
  ]);
  const m2 = graphFitness(deadSource).metrics.find((m) => m.metric === "isolated_pct");
  assert.equal(m2.value, 90.9, "10/11 module nguồn không ai import = bệnh thật");
  assert.equal(m2.passed, false, "và cổng PHẢI đỏ — đây là thứ nó tồn tại để bắt");
  assert.match(m2.detail, /backend\/src\/dead0\.ts/, "phải nêu TÊN để người đọc phán được, không chỉ con số");
});

// SÀN ĐẾM — sinh ra từ một fixture ĐỎ OAN, nên phải có cổng để đừng mất lại.
// Siết trần 30%→4% làm đỏ luôn fixture "repo nhỏ lành mạnh" của `graph.test.mjs`: 1 file cô lập
// trên 3 file = 33%. Tỉ lệ trên mẫu bé là nhiễu (cùng doctrine `ABSTAIN_MIN_VECTORS`, `plan/17`).
test("sàn đếm: repo BÉ có 1–2 file cô lập KHÔNG bị phán, nhưng đủ SỐ thì phán ngay", () => {
  const tiny = (dead) =>
    mk([
      ...Array.from({ length: dead }, (_, i) => ({ id: `backend/src/dead${i}.ts` })),
      { id: "backend/src/a.ts", fanIn: 1 },
    ]);

  for (const n of [1, 2]) {
    const m = graphFitness(tiny(n)).metrics.find((x) => x.metric === "isolated_pct");
    assert.ok(m.value > FITNESS_GATES.isolatedPct, `${n}/${n + 1} file phải VƯỢT tỉ lệ (đó là bản chất mẫu bé)`);
    assert.equal(m.passed, true, `nhưng ${n} < sàn ${ISOLATED_MIN_COUNT} ⇒ KHÔNG phán — tỉ lệ trên mẫu bé là nhiễu`);
    assert.match(m.detail, /under the floor of/i, "và phải NÓI RA là đã bỏ qua vì dưới sàn, không im lặng");
  }

  // Chạm sàn + vượt tỉ lệ ⇒ đỏ. Đây là vế phải giữ, không thì sàn thành cửa hậu tha mọi thứ.
  const at = graphFitness(tiny(ISOLATED_MIN_COUNT)).metrics.find((x) => x.metric === "isolated_pct");
  assert.equal(at.passed, false, `${ISOLATED_MIN_COUNT} file cô lập là chạm sàn ⇒ phải phán`);
  assert.ok(!/under the floor of/i.test(at.detail), "chạm sàn rồi thì không được nói là dưới sàn");
});

test("ngưỡng còn ĐỎ ĐƯỢC: 5 module chết trên nền 116 file là vượt trần", () => {
  assert.ok(FITNESS_GATES.isolatedPct <= 5, `trần ${FITNESS_GATES.isolatedPct}% phải đủ chặt để bắt vài module chết`);
  // Nền đo được là 1/116 = 0,9%; 5/116 = 4,3% phải vượt trần.
  assert.ok((5 / 116) * 100 > FITNESS_GATES.isolatedPct, "5 module chết phải làm đỏ");
  assert.ok((1 / 116) * 100 <= FITNESS_GATES.isolatedPct, "nền hiện tại (1 entry spawn) không được đỏ oan");
});
