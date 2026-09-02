// Đa ngôn ngữ THEO KHO — detect-then-load (user chốt 2026-08-21: zemory phục vụ user ngôn ngữ
// khác, nhưng kho nào chỉ nạp đúng thứ kho đó có). Bốn bất biến, đứt cái nào cũng hỏng lặng:
//  ① file ngôn ngữ mở rộng phải THÀNH NODE (trước: .go/.java vô hình hoàn toàn);
//  ② grammar nạp được ⇒ symbol AST đúng TÊN; grammar hỏng (ruby, đo LOAD FAIL) ⇒ fail-open,
//     không crash, node vẫn đứng;
//  ③ fitness KHÔNG phạt oan: node chưa có lớp cạnh import phải nằm NGOÀI isolated_pct
//     (đo trước khi mở: 29,4/30% — thiếu guard là mở ngôn ngữ nào đỏ ngôn ngữ nấy);
//  ④ kho ts/js/py thuần không đổi hành vi (không nạp grammar thừa).

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { buildCodeGraph, graphFitness, EXTRA_LANG_EXT } from "../../dist/memory/graph/graph.js";
import { enrichGraphSymbols } from "../../dist/memory/graph/graph-symbols.js";
import { tempDir } from "./helpers.mjs";

function polyglotRepo(t) {
  const root = tempDir(t, "zemory-langs-");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "main.ts"), 'import { helper } from "./helper.js";\nexport function run(): void { helper(); }\n');
  writeFileSync(join(root, "src", "helper.ts"), "export function helper(): void {}\n");
  writeFileSync(join(root, "src", "pull.sh"), 'do_pull() {\n  curl -s "$1" > out.json\n}\ndo_pull "http://x"\n');
  writeFileSync(join(root, "src", "Loader.java"), "class Loader {\n  void pull(String url) { fetch(url); }\n}\n");
  writeFileSync(join(root, "src", "pull.go"), "package main\nfunc Pull(url string) { fetch(url) }\n");
  writeFileSync(join(root, "src", "pull.rs"), "fn pull(url: &str) { fetch(url); }\n");
  writeFileSync(join(root, "src", "svc.cs"), "class Svc {\n  void Pull(string url) { Fetch(url); }\n}\n");
  writeFileSync(join(root, "src", "pull.rb"), "def pull(url)\n  fetch(url)\nend\n"); // grammar FAIL → ca âm sống
  return root;
}

test("① file ngôn ngữ mở rộng thành NODE, mang cờ noImportLayer; ts thì KHÔNG mang", (t) => {
  const g = buildCodeGraph(polyglotRepo(t));
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  for (const f of ["src/pull.sh", "src/Loader.java", "src/pull.go", "src/pull.rs", "src/svc.cs", "src/pull.rb"]) {
    assert.ok(byId.has(f), `${f} phải thành node`);
    assert.equal(byId.get(f).noImportLayer, true, `${f} phải mang cờ noImportLayer`);
  }
  assert.ok(byId.has("src/main.ts"));
  assert.ok(!byId.get("src/main.ts").noImportLayer, "ts có lớp import — không được gắn cờ");
  assert.ok(byId.get("src/main.ts").fanOut >= 1, "cạnh import ts phải còn nguyên (hành vi cũ)");
});

test("② grammar nạp được ⇒ symbol AST đúng tên; ruby hỏng ⇒ fail-open không crash", async (t) => {
  const g = buildCodeGraph(polyglotRepo(t));
  await enrichGraphSymbols(g); // ruby LOAD FAIL nằm trong đây — không được ném
  const sym = (id) => (g.nodes.find((n) => n.id === id)?.symbolsDetail ?? []).map((s) => s.name);
  assert.ok(sym("src/pull.sh").includes("do_pull"), `bash: ${JSON.stringify(sym("src/pull.sh"))}`);
  assert.ok(sym("src/Loader.java").some((s) => s.includes("pull")), `java: ${JSON.stringify(sym("src/Loader.java"))}`);
  assert.ok(sym("src/pull.go").includes("Pull"), `go: ${JSON.stringify(sym("src/pull.go"))}`);
  assert.ok(sym("src/pull.rs").includes("pull"), `rust: ${JSON.stringify(sym("src/pull.rs"))}`);
  assert.ok(sym("src/svc.cs").some((s) => s.includes("Pull")), `c_sharp: ${JSON.stringify(sym("src/svc.cs"))}`);
  assert.deepEqual(sym("src/pull.rb"), [], "ruby grammar fail — symbol rỗng là ĐÚNG, miễn đừng crash");
});

test("③ fitness: node noImportLayer nằm NGOÀI isolated_pct — không phạt thứ chưa đo được", (t) => {
  const g = buildCodeGraph(polyglotRepo(t));
  const iso = graphFitness(g).metrics.find((m) => m.metric === "isolated_pct");
  // 2 file ts nối nhau ⇒ 0 isolated trên 2 node đủ điều kiện; 6 file ngôn ngữ mở rộng
  // (0 cạnh cả 6) mà bị tính thì isolated_pct = 75% ⇒ FAIL. Guard đứng thì = 0%.
  assert.equal(iso.value, 0, `isolated phải 0% (chỉ tính node có lớp import), nhận ${iso.value}% — ${iso.detail}`);
  assert.ok(iso.passed, "gate phải xanh");
});

test("④ bảng EXTRA_LANG_EXT và bảng wasm phải KHỚP nhau — thêm ext mà quên grammar là symbol câm lặng", () => {
  // Parity kiểu structure-sync: hai bảng ở hai file là hai lăng kính của cùng một danh sách.
  const wanted = new Set(Object.values(EXTRA_LANG_EXT));
  for (const lang of wanted) {
    assert.ok(["bash", "java", "go", "rust", "c_sharp", "ruby"].includes(lang), `lang lạ chưa khai gate: ${lang}`);
  }
});

test("⑤ orphans và isolated_pct phải nói MỘT câu — node chưa có lớp import không bị gọi là mồ côi", (t) => {
  // Audit 2026-08-21 bắt được: fitness đã loại node noImportLayer nhưng `orphans` thì chưa ⇒
  // hai bề mặt của CÙNG một sự thật nói khác nhau, và consumer đọc `graph export` sẽ thấy
  // node .go nằm trong orphans (nói dối: "mồ côi" ≠ "chưa đo được cạnh").
  const g = buildCodeGraph(polyglotRepo(t));
  const extra = ["src/pull.sh", "src/Loader.java", "src/pull.go", "src/pull.rs", "src/svc.cs", "src/pull.rb"];
  for (const f of extra) assert.ok(!g.orphans.includes(f), `${f} không được nằm trong orphans`);
  const iso = graphFitness(g).metrics.find((m) => m.metric === "isolated_pct");
  assert.equal(iso.value, 0, "hai bề mặt phải khớp: orphans rỗng thì isolated cũng 0%");

});

// ⚠ TÁI DIỄN 2026-09-02, hạng KHÁC: phép loại LỚP ĐIỂM VÀO (test/script/hook/template/config) được
// thêm vào `graphFitness` mà QUÊN `orphans` ⇒ cùng một file test vừa bị loại khỏi `isolated_pct`
// vừa nằm trong `orphans`, mà `orphans` hiện lên UI THẬT (bộ lọc "chỉ orphan" + số đếm ở
// `graph-render.js`). Nay cả hai đi qua MỘT phép `countsForImportHealth`.
//
// 🔴 Bản ĐẦU của ca này là TRANG TRÍ: nó dựng graph GIẢ bằng cách chèn node vào `g.nodes`, mà
// `orphans` được tính TRONG `buildCodeGraph` ⇒ assertion không bao giờ soi tới `orphans`. Đột biến
// *"trả `orphans` về lọc cũ"* vẫn XANH. Phải dựng REPO THẬT trên đĩa mới đo được cả hai bề mặt.
test("⑤b lớp ĐIỂM VÀO cũng phải bị loại ở CẢ HAI bề mặt — đo trên repo THẬT, không graph giả", (t) => {
  const root = tempDir(t, "zemory-entryclass-");
  mkdirSync(join(root, "backend", "src"), { recursive: true });
  mkdirSync(join(root, "backend", "test"), { recursive: true });
  mkdirSync(join(root, "backend", "scripts"), { recursive: true });
  // Cặp có cạnh import thật (để repo không rỗng cạnh).
  writeFileSync(join(root, "backend", "src", "a.ts"), 'import { b } from "./b.js";\nexport const a = b;\n');
  writeFileSync(join(root, "backend", "src", "b.ts"), "export const b = 1;\n");
  // Lớp ĐIỂM VÀO, 0 cạnh — theo cấu trúc không thể có cạnh import.
  writeFileSync(join(root, "backend", "test", "x.test.mjs"), "// khong import gi trong project\n");
  writeFileSync(join(root, "backend", "scripts", "y.mjs"), "// script doc lap\n");
  writeFileSync(join(root, "eslint.config.js"), "export default [];\n");
  // Module NGUỒN chết thật — ca ÂM giữ sức cho cổng.
  writeFileSync(join(root, "backend", "src", "dead.ts"), "export const dead = 1;\n");

  const g2 = buildCodeGraph(root);
  for (const f of ["backend/test/x.test.mjs", "backend/scripts/y.mjs", "eslint.config.js"]) {
    assert.ok(g2.nodes.some((n) => n.id === f), `${f} phải là node (nếu không thì ca này không đo gì)`);
    assert.ok(!g2.orphans.includes(f), `${f} là lớp ĐIỂM VÀO — không được nằm trong orphans (UI đọc số này)`);
  }
  assert.ok(g2.orphans.includes("backend/src/dead.ts"), "module nguồn chết PHẢI nằm trong orphans");

  const iso = graphFitness(g2).metrics.find((m) => m.metric === "isolated_pct");
  assert.match(iso.detail, /backend\/src\/dead\.ts/, "và fitness phải nêu TÊN nó — hai bề mặt nói MỘT câu");
  assert.equal(iso.detail.includes("x.test.mjs"), false, "fitness không được đếm file test");
});
