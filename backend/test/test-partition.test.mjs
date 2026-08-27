// CỔNG PHÂN NHÓM TEST (2026-08-27): file test nào NẠP MODEL phải nằm trong `HEAVY` của
// `backend/scripts/run-tests.mjs`, và ngược lại. Thiếu một chiều là phân nhóm thối âm thầm:
// file nặng lọt vào nhóm 4-worker ⇒ đỉnh RAM quay về mức đã làm sập máy; file nhẹ nằm nhầm nhóm
// nặng ⇒ gate chậm vô ích. Phép đo: import/gọi lớp embed–rerank trong chính file test.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { HEAVY, HEAVY_CONCURRENCY, HEAVY_ENV, LIGHT_DESPITE_MATCH } from "../scripts/test-groups.mjs";

const DIR = "backend/test";
// Hai lớp runtime NẶNG: model ONNX (embed/rerank) và grammar tree-sitter WASM (graph). Đo 2026-08-27:
// file graph nạp grammar đỉnh 0,8–1,9 GB mỗi file — hai file trùng lượt ở nhóm nhẹ là chạm trần 4 GB
// dù mọi ca xanh; bản đầu của regex này chỉ soi model nên bỏ sót cả năm file graph.
const LOADS_MODEL =
  /embedQuery|embedDocBatch|embedPending|loadEmbedder|rerank\(|memory\/embed\.js|memory\/rerank\.js|memory\/graph\/|buildCodeGraph|getCodeGraph|graph_impact|graph_neighbors/u;

function measured() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".test.mjs") && f !== "test-partition.test.mjs")
    .filter((f) => LOADS_MODEL.test(readFileSync(join(DIR, f), "utf8")))
    .sort();
}

test("mọi file khớp regex nặng phải được PHÂN LOẠI tường minh: HEAVY, hoặc miễn kèm số đo ≤ 500 MB", () => {
  const matched = measured();
  assert.ok(matched.length >= 3, `phép đo tự kiểm: chỉ thấy ${matched.length} file khớp — regex hỏng?`);
  const exempt = Object.keys(LIGHT_DESPITE_MATCH);
  const declared = [...HEAVY].sort();
  // Chiều 1: khớp regex mà chưa ở đâu ⇒ phải quyết (đo rồi đưa vào HEAVY hoặc miễn kèm số).
  const unclassified = matched.filter((f) => !declared.includes(f) && !exempt.includes(f));
  assert.deepEqual(unclassified, [], `file khớp regex nặng CHƯA phân loại — đo bằng gate-cage rồi khai HEAVY hoặc LIGHT_DESPITE_MATCH: ${unclassified.join(", ")}`);
  // Chiều 2: HEAVY không được chứa file nhẹ (model group chỉ để cho file thật sự nặng).
  const extra = declared.filter((f) => !matched.includes(f));
  assert.deepEqual(extra, [], `HEAVY khai file KHÔNG khớp regex nặng (chạy cô lập vô ích): ${extra.join(", ")}`);
  // Chiều 3: danh sách miễn không được thối — phải còn khớp regex, không trùng HEAVY, và số đo ≤ 500 MB.
  for (const [f, mb] of Object.entries(LIGHT_DESPITE_MATCH)) {
    assert.ok(matched.includes(f), `miễn "${f}" nhưng file không còn khớp regex — xoá khỏi LIGHT_DESPITE_MATCH`);
    assert.ok(!declared.includes(f), `"${f}" vừa HEAVY vừa miễn — hai sự thật cho một file`);
    assert.ok(Number.isFinite(mb) && mb <= 500, `"${f}" miễn với số đo ${mb} MB — quá 500 MB thì phải vào HEAVY`);
  }
});

test("nhóm nặng chạy ĐÚNG 1 worker — đây là toàn bộ lý do tách nhóm", () => {
  assert.equal(HEAVY_CONCURRENCY, 1, "đỉnh RAM chỉ ghim được khi nhóm nạp model chạy tuần tự");
  const runner = readFileSync("backend/scripts/run-tests.mjs", "utf8");
  assert.match(runner, /HEAVY_CONCURRENCY/u, "runner phải DÙNG hằng số này, không hardcode số riêng");
});

// User chốt 2026-08-27: gate phải NHƯỜNG máy — ưu tiên thấp, arena ONNX tắt cho nhóm model, và trên
// Windows chạy trong lồng Job Object 4 GB. Ba vế đó nằm ở ba file; cổng này giữ chúng không rơi lẻ.
test("gate nhường máy: runner hạ ưu tiên + truyền HEAVY_ENV; cửa vào đi qua lồng RAM trên Windows", () => {
  const runner = readFileSync("backend/scripts/run-tests.mjs", "utf8");
  assert.match(runner, /setPriority\(process\.pid, os\.constants\.priority\.PRIORITY_BELOW_NORMAL\)/u, "runner phải tự hạ ưu tiên để con kế thừa");
  assert.match(runner, /runHeavyIsolated\(heavy, HEAVY_ENV\)/u, "nhóm nạp model phải nhận HEAVY_ENV — thiếu là ONNX ăn hết lõi");
  // Đo 2026-08-27: cả file `vectors.test` 6,1 GB (q8 vẫn vượt 4 GB), ca nặng nhất chạy riêng 3,3 GB —
  // ranh giới TIẾN TRÌNH là ranh giới RAM. Bỏ cô lập là trần 4 GB đổ ngay ở file đó.
  assert.match(runner, /--test-name-pattern=\^\$\{escapeRe\(name\)\}\$/u, "mỗi ca file nặng phải chạy trong tiến trình riêng, khớp tên CHÍNH XÁC");
  assert.ok(Number(HEAVY_ENV.ZEMORY_ONNX_THREADS) >= 1, "nhóm model phải giới hạn luồng ONNX");
  // Đo 2026-08-27: tắt arena làm RAM phình NHANH HƠN (12 GB/125 s vs 6,1 GB/18 phút) — cấm đặt lại.
  assert.notEqual(HEAVY_ENV.ZEMORY_ONNX_MEM_ARENA, "0", "KHÔNG tắt arena ONNX ở nhóm model — đo được là tệ hơn");
  const gate = readFileSync("backend/scripts/gate.mjs", "utf8");
  assert.match(gate, /gate-cage\.ps1/u, "cửa vào phải đi qua lồng Job Object trên Windows");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts.test, /backend\/scripts\/gate\.mjs/u, "`npm test` phải đi qua gate.mjs — gọi thẳng node --test là mất cả lồng lẫn cô lập");
  const cage = readFileSync("backend/scripts/gate-cage.ps1", "utf8");
  assert.match(cage, /JOB_OBJECT_LIMIT_JOB_MEMORY/u, "lồng phải ghim RAM CẢ CÂY, không chỉ một tiến trình");
  assert.match(cage, /4096/u, "trần mặc định 4 GB — con số user chốt");
});
