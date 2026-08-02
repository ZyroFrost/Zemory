// Hai finding của audit 2026-08-02, mỗi cái một cách hỏng ÂM THẦM:
//
// F1 — `memory_doctor` HỨA probe vector/rerank ("engines are loaded, not just read off a
//      config flag") nhưng lặp theo `listFeatures()` vốn chỉ có 3 key, nên hai engine đắt
//      nhất KHÔNG hề được thử. Mô tả nói một đằng, code làm một nẻo: agent đọc kết quả
//      "sạch" rồi kết luận sai.
//
// F4 — 5 bản tự chế "so đường dẫn" đã lệch nhau: hai bản không cắt gạch cuối, một bản đổi
//      ngược dấu phân cách. `D:\X\` khớp ở chỗ này, trượt ở chỗ kia — CÙNG một thư mục,
//      hai câu trả lời. Gom về `core/config::projectKey`.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLS, callMcpTool, doctorFeatureKeys } from "../../dist/tools/index.js";
import { projectKey } from "../../dist/core/config.js";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

test("F1 — memory_doctor probe ĐÚNG những engine mà mô tả của nó hứa", async () => {
  const doc = TOOLS.find((t) => t.name === "memory_doctor");
  assert.ok(doc, "thiếu memory_doctor");
  const promised = [];
  if (/vector/i.test(doc.description)) promised.push("vector");
  if (/rerank/i.test(doc.description)) promised.push("rerank");
  assert.ok(promised.length >= 2, "mô tả phải nêu đích danh engine được probe, không nói chung chung");

  // Lời hứa kiểm trên HÀNH VI, không soi chữ trong source: bản đầu của test này chỉ đọc
  // `tools/index.ts` tìm chuỗi "vector"/"rerank" — đột biến gỡ hẳn hai key khỏi vòng
  // runCheck mà test vẫn XANH (đo 2026-08-02). Nhưng gọi thật với `deep` mất **48 giây**
  // (nạp model ONNX), nên phần đắt kiểm qua hàm THUẦN, phần rẻ gọi thật.
  for (const key of promised) {
    assert.ok(
      doctorFeatureKeys(["memory"], true).includes(key),
      `mô tả hứa probe ${key} nhưng deep pass không đưa key đó vào runCheck`,
    );
    assert.ok(!doctorFeatureKeys(["memory"], false).includes(key), `${key} là engine đắt — không được probe ở lượt nhanh`);
  }
  assert.match(doc.description, /deep=true/u, "mô tả phải chỉ rõ đường bật probe engine, không thì không ai biết");

  // Lượt NHANH: gọi thật, và phải NÓI RÕ nó chưa thử gì (im lặng về phần bỏ qua = nói dối).
  const r = await callMcpTool("memory_doctor", {}, { dbPath: ":memory:", projectRoot: null });
  const payload = JSON.parse(r.content[0].text);
  assert.deepEqual([...payload.notProbed].sort(), [...promised].sort(), "lượt nhanh phải khai đúng phần chưa probe");
  for (const f of payload.features) {
    assert.ok(["on", "off", "planned", "warn"].includes(f.state), `${f.key}: state lạ ${f.state}`);
    assert.ok(typeof f.detail === "string" && f.detail.length > 0, `${f.key}: probe phải kèm chi tiết đo được`);
  }
});

test("F4 — chỉ còn MỘT bản so đường dẫn, và nó nắn đủ ba thứ hay vấp", () => {
  // Ba thứ: dấu phân cách, gạch cuối, hoa/thường (Windows).
  const a = projectKey("D:\\Zyro\\Tool\\Zemory");
  assert.equal(projectKey("d:\\Zyro\\Tool\\Zemory"), a, "hoa/thường ổ đĩa phải cùng khoá");
  assert.equal(projectKey("D:\\Zyro\\Tool\\Zemory\\"), a, "gạch cuối phải cùng khoá — đây là ca hai bản norm cũ TRƯỢT");
  assert.equal(projectKey("D:/Zyro/Tool/Zemory"), a, "dấu / và \\ phải cùng khoá");
  assert.notEqual(projectKey("D:\\Zyro\\Tool\\Zemory2"), a, "thư mục KHÁC thì phải khác khoá");

  // Không còn bản chép tay nào trong 4 file đã gom (graph-memory CỐ Ý khác — id node dùng '/').
  for (const f of [
    "backend/src/projects.ts",
    "backend/src/memory/mergeprojects.ts",
    "backend/src/memory/search.ts",
    "backend/src/memory/recall.ts",
  ]) {
    const src = read(f);
    assert.match(src, /projectKey/u, `${f}: phải dùng khoá dùng chung projectKey`);
    assert.ok(
      !/replace\(\/\\\\\/\/g,\s*"\\\\\\\\"\)\.toLowerCase\(\)/u.test(src),
      `${f}: còn bản so đường dẫn tự chế — đó là chỗ lệch nhau lần trước`,
    );
  }
  const graph = read("backend/src/memory/graph/graph-memory.ts");
  assert.match(graph, /CỐ Ý KHÁC/u, "graph-memory giữ bản riêng thì phải GHI RÕ vì sao, không audit sau lại gộp nhầm");
});
