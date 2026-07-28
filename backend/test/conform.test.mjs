// `zemory conform` — máy chấm độ bám chuẩn.
//
// Trọng tâm test KHÔNG phải "có bắt được lệch không" (dễ), mà là **KHÔNG BÁO OAN**.
// Một checker kêu oan thì lần sau không ai đọc nữa — và trong phiên dựng nó (2026-07-26)
// đã tự đẻ ĐÚNG 4 ca báo oan, chỉ lộ ra khi chạy thử trên repo thật:
//   ① `(root)` — chuẩn nói "tool ép root = ĐỂ YÊN"
//   ② `backend`/`frontend`/`docs` — là 4 VAI TRÒ bắt buộc, không phải slot
//   ③ `pipelines/01_weekly` — `NN_<tên>` là convention ĐÃ KHAI của hệ non-app
//   ④ báo 48 mục "slot khai mà repo chưa dùng" — đó là TRẠNG THÁI ĐÚNG
// Mỗi ca có một ratchet dưới đây. Sửa conform mà làm tái sinh ca nào ⇒ gate ĐỎ.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { conform } from "../../dist/docs/conform.js";
import { readStandardSpec } from "../../dist/docs/standard-spec.js";
import { tempDir } from "./helpers.mjs";

const HARNESS = [
  "AGENTS.md",
  "docs/agent/01_CONSTITUTION.md",
  "docs/agent/02_RULES.md",
  "docs/agent/03_STRUCTURE.md",
  "docs/agent/04_SKILLS.md",
  "docs/agent/05_TODO.md",
  "docs/agent/06_CHANGES.md",
  "docs/plan/00_overview.md",
];

function write(root, rel, body) {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

/** Repo hợp lệ: harness đủ, code nằm đúng slot, có file ở gốc + `NN_` (2 ca báo oan). */
function goodRepo(t, extra = () => {}) {
  const root = tempDir(t, "zemory-conform-");
  for (const f of HARNESS) write(root, f, `# ${f}\n`);
  write(root, "docs/agent/04_SKILLS.md", ["# Kho skill", "**Skill inline hiện có:** `grill`.", "## grill", "thân."].join("\n"));
  write(root, "docs/agent/01_CONSTITUTION.md", ["# HP", "## Điều khoản", "1. **Điều một.** thân.", "2. **Điều hai.** thân."].join("\n"));
  write(root, "docs/agent/02_RULES.md", "# Rules\nBám điều 1 và điều 2.\n");
  // code đúng slot
  write(root, "backend/src/api/routes.ts", "export const a = 1;\n");
  write(root, "backend/src/services/calc.ts", "export const b = 2;\n");
  // ① file ở GỐC repo (tool ép root) — KHÔNG được coi là lệch
  write(root, "eslint.config.js", "export default [];\n");
  // ② entry ngay dưới `backend/` — `backend` là VAI TRÒ, không phải slot
  write(root, "backend/run.js", "console.log(1);\n");
  extra(root);
  return root;
}

const find = (rep, check) => rep.items.find((i) => i.check === check);

test("repo bám chuẩn ⇒ không có mục blocking nào", (t) => {
  const rep = conform(goodRepo(t));
  const blocking = rep.items.filter((i) => i.level === "blocking");
  assert.deepEqual(blocking.map((i) => i.check), [], "repo sạch mà vẫn báo = báo oan");
  assert.equal(rep.ok, true);
});

test("BÁO OAN ①: file ở gốc repo (tool ép root) không bị tính là lệch slot", (t) => {
  const rep = conform(goodRepo(t));
  const off = find(rep, "off-standard-dir");
  assert.equal(off, undefined, `gốc repo phải được miễn trừ, nhận được: ${JSON.stringify(off?.samples)}`);
});

test("BÁO OAN ②: `backend`/`frontend`/`docs` là VAI TRÒ, không phải slot", (t) => {
  const root = goodRepo(t, (r) => write(r, "frontend/main.js", "1;\n"));
  const rep = conform(root);
  const off = find(rep, "off-standard-dir");
  assert.ok(!off || !off.samples.some((s) => ["backend", "frontend", "docs"].includes(s)), "4 vai trò bắt buộc không được báo");
});

test("BÁO OAN ③: thư mục `NN_<tên>` (convention hệ non-app) không bị tính là lệch", (t) => {
  const root = goodRepo(t, (r) => {
    write(r, "backend/src/pipelines/01_weekly/run.py", "x = 1\n");
    write(r, "backend/src/pipelines/02_daily/run.py", "x = 2\n");
  });
  const rep = conform(root);
  const off = find(rep, "off-standard-dir");
  assert.ok(!off || !off.samples.some((s) => /\/\d{2}_/.test(s)), `NN_ phải được miễn trừ, nhận: ${JSON.stringify(off?.samples)}`);
});

test("BÁO OAN ④: slot chuẩn khai mà repo chưa dùng KHÔNG phải phát hiện", (t) => {
  const rep = conform(goodRepo(t));
  // Không được có mục nào liệt kê slot-chưa-dùng (bản đầu đẻ ra 48 mục như vậy).
  assert.equal(find(rep, "concern-no-home"), undefined, "trạng thái đúng chuẩn, không được báo");
  for (const it of rep.items) {
    assert.ok(!/chưa có slot nào hiện diện/i.test(it.title), `vẫn còn lane báo slot-chưa-dùng: ${it.check}`);
  }
});

test("BẮT THẬT: thư mục chứa code mà không khớp slot nào ⇒ blocking", (t) => {
  const root = goodRepo(t, (r) => write(r, "backend/src/weirdname/x.ts", "export const c = 3;\n"));
  const rep = conform(root);
  const off = find(rep, "off-standard-dir");
  assert.ok(off, "phải bắt được thư mục ngoài chuẩn");
  assert.equal(off.level, "blocking");
  assert.ok(off.samples.includes("backend/src/weirdname"), JSON.stringify(off.samples));
  assert.equal(rep.ok, false, "có blocking ⇒ gate phải đỏ");
});

test("BẮT THẬT: thiếu file harness bắt buộc ⇒ blocking", (t) => {
  const root = tempDir(t, "zemory-conform-bare-");
  write(root, "backend/src/api/x.ts", "export const a = 1;\n");
  const rep = conform(root);
  const miss = find(rep, "harness-missing");
  assert.ok(miss, "phải bắt thiếu harness");
  assert.equal(miss.level, "blocking");
  assert.ok(miss.count >= 8, `thiếu cả bộ, nhận count=${miss.count}`);
});

test("BẮT THẬT: skill khai trong roster mà không có section `##`", (t) => {
  const root = goodRepo(t, (r) =>
    write(r, "docs/agent/04_SKILLS.md", ["# Kho skill", "**Skill inline hiện có:** `grill` · `mất tích`.", "## grill", "thân."].join("\n")),
  );
  const rep = conform(root);
  const drift = find(rep, "skill-roster-drift");
  assert.ok(drift, "phải bắt lệch roster");
  assert.deepEqual(drift.samples, ["mất tích"]);
});

test("empty-slot-dir đo trên ĐĨA: folder chỉ có .md KHÔNG phải folder rỗng", (t) => {
  const root = goodRepo(t, (r) => {
    write(r, "backend/resources/prompts/hello.md", "# prompt\n"); // có file, không rỗng
    mkdirSync(join(r, "backend", "src", "jobs"), { recursive: true }); // slot RỖNG thật
  });
  const rep = conform(root);
  const empty = find(rep, "empty-slot-dir");
  assert.ok(empty, "phải bắt được folder slot rỗng");
  assert.ok(empty.samples.includes("backend/src/jobs/"), JSON.stringify(empty.samples));
  assert.ok(!empty.samples.some((s) => /prompts/.test(s)), "folder có .md không được coi là rỗng");
  assert.equal(empty.level, "advisory", "rỗng là advisory, không chặn gate");
});

test("hp-uncited: điều không doc nào trích dẫn ⇒ advisory (không chặn)", (t) => {
  const root = goodRepo(t, (r) => write(r, "docs/agent/02_RULES.md", "# Rules\nChỉ nhắc điều 1.\n"));
  const rep = conform(root);
  const un = find(rep, "hp-uncited");
  assert.ok(un, "điều 2 không ai nhắc → phải báo");
  assert.equal(un.level, "advisory");
  assert.equal(un.count, 1);
  assert.equal(rep.ok, true, "advisory không được làm đỏ gate");
});

// ── ⑥ dangling-ref: dò mâu thuẫn tất định (0 LLM) ────────────────────────────
// Bản đầu của check này soi CẠNH của graph-standard — mà graph-standard `continue`
// bỏ mọi tham chiếu không resolve được TRƯỚC khi tạo cạnh, nên nó vĩnh viễn ra 0.
// Một check không thể nổ còn tệ hơn không có: nó phát ra lời bảo đảm "không mâu
// thuẫn" trong khi chưa hề nhìn. Ba test dưới đây tồn tại để BUỘC nó nổ được thật.

test("dangling-ref bắt được `điều N` trỏ tới số điều không tồn tại", (t) => {
  const root = goodRepo(t, (r) =>
    write(r, "docs/plan/00_overview.md", "# Tổng quan\nTheo điều 2 và điều 9.\n"),
  );
  const d = find(conform(root), "dangling-ref");
  assert.ok(d, "hiến pháp chỉ có điều 1..2 mà doc nhắc điều 9 → phải bắt");
  assert.equal(d.level, "blocking");
  assert.ok(d.samples.some((s) => /điều 9/.test(s)), JSON.stringify(d.samples));
  assert.ok(!d.samples.some((s) => /điều 2\b/.test(s)), "điều 2 CÓ thật, không được báo");
});

test("dangling-ref bắt được link .md trỏ tới file đã mất", (t) => {
  const root = goodRepo(t, (r) =>
    write(r, "docs/agent/05_TODO.md", "# TODO\nXem [kế hoạch](../plan/07_ghost.md) và [chuẩn](03_STRUCTURE.md).\n"),
  );
  const d = find(conform(root), "dangling-ref");
  assert.ok(d, "link tới 07_ghost.md không tồn tại → phải bắt");
  assert.ok(d.samples.some((s) => /07_ghost\.md/.test(s)), JSON.stringify(d.samples));
  assert.ok(!d.samples.some((s) => /03_STRUCTURE/.test(s)), "link resolve được thì không báo");
});

// Ratchet chống tái sinh ca báo oan: routing §4 trỏ tới TẦNG (`data/` `attic/`
// `external/`…) là ĐÚNG CHUẨN — chúng khai ở §2, không phải slot §3. Thử kiểm điều
// này ra 13 mục oan trên chính zemory nên đã cố ý bỏ nhánh đó.
test("dangling-ref KHÔNG báo oan: routing tới tầng, link ngoài, và điều có thật", (t) => {
  const root = goodRepo(t, (r) => {
    write(
      r,
      "docs/agent/03_STRUCTURE.md",
      ["# Chuẩn", "## 4. Routing", "| Concern | Ở đâu |", "| --- | --- |", "| lưu trữ | `data/` |", "| gỡ ra | `attic/` |"].join("\n"),
    );
    write(r, "docs/agent/05_TODO.md", "# TODO\nTheo điều 1. Xem [trang ngoài](https://example.com/a.md).\n");
  });
  const rep = conform(root);
  assert.equal(find(rep, "dangling-ref"), undefined, "không được báo gì: " + JSON.stringify(rep.items.map((i) => i.samples)));
  assert.equal(rep.ok, true);
});

// ── Bản chuẩn: FE phải đọc từ NGUỒN, không hardcode ────────────────────────────
// Audit 2026-07-27 (F1): `03_STRUCTURE.md` là nguồn (điều 3) nhưng `app.js` từng chép
// tay lại thành `STRUCT`/`ROUTE` — và đã lệch nặng: cây 35/90 hàng, routing 26/66 dòng.
// Màn Harness là màn TRA CỨU: hiện thiếu 60% mà không báo gì là kiểu hỏng tệ nhất.
test("readStandardSpec parse ĐỦ cây + routing từ chính file .md", (t) => {
  const root = tempDir(t, "zemory-spec-");
  write(root, "docs/agent/03_STRUCTURE.md", [
    "# Chuẩn",
    "## 3. Cây thư mục — ghi chú TỪNG DÒNG",
    "```",
    "App/                    # gốc",
    "├── backend/            ★ server-side",
    "│   ├── src/            ★ nơi chứa code",
    "│   │  ├── api/   [opt]  endpoint mở ra",
    "│   │  │                 dòng chú thích nối tiếp",
    "├── data/          .gitignore  runtime",
    "```",
    "## 4. Routing — sửa gì → vào đâu",
    "| Có gì / cần làm | Vào đâu |",
    "| --- | --- |",
    "| endpoint mở ra | `backend/src/api/` |",
    "| nối DATABASE | `backend/src/store/` |",
    "## 5. Hết",
  ].join("\n"));
  const spec = readStandardSpec(root);
  assert.equal(spec.tree.length, 4, "4 hàng có nhánh: " + JSON.stringify(spec.tree.map((r) => r.name)));
  assert.deepEqual(spec.tree.map((r) => r.marker), ["req", "req", "opt", "gi"]);
  assert.deepEqual(spec.tree.map((r) => r.depth), [0, 1, 2, 0]);
  assert.ok(spec.tree[2].note.includes("dòng chú thích nối tiếp"), "chú thích xuống dòng phải được nối, không mất chữ");
  assert.deepEqual(spec.routing.map((r) => r.concern), ["endpoint mở ra", "nối DATABASE"], "bỏ header + gạch ngang");
});

// Non-app đánh số section KHÁC app (§2 cây / §3 routing). Ghim số là một profile trả
// rỗng mà không ai biết — bắt được lúc đo thật, khoá lại ở đây.
test("tìm section theo TÊN, không theo số — non-app đánh số khác vẫn parse được", (t) => {
  const root = tempDir(t, "zemory-spec2-");
  write(root, "docs/agent/03_STRUCTURE.md", [
    "## 2. Cây thư mục — ghi chú TỪNG DÒNG",
    "```",
    "├── reports/            ★ sản phẩm giao",
    "```",
    "## 3. Routing — cần gì → vào đâu",
    "| Có gì | Vào đâu |",
    "| --- | --- |",
    "| sản phẩm giao | `reports/` |",
    "## 4. Hết",
  ].join("\n"));
  const spec = readStandardSpec(root);
  assert.equal(spec.tree.length, 1, "cây phải parse được dù đánh số §2");
  assert.equal(spec.routing.length, 1, "routing phải parse được dù đánh số §3");
});

test("file thiếu / hỏng ⇒ trả rỗng, KHÔNG ném (fail-open, điều 9)", (t) => {
  const root = tempDir(t, "zemory-spec3-");
  const spec = readStandardSpec(root); // không có docs/agent/03_STRUCTURE.md
  assert.deepEqual(spec, { tree: [], routing: [] });
});

// ---- ⑦ control-char: check này phải NỔ ĐƯỢC, và không nổ oan ----
//
// Bối cảnh (2026-07-28): một byte NUL gõ thẳng vào template literal làm `ingest.ts`
// (777 dòng) và `ui.ts` bị ripgrep xếp vào loại NHỊ PHÂN rồi bỏ qua — nên MỌI đợt audit
// bằng grep trước đó chưa từng nhìn hai file lớn nhất của bề mặt. `tsc` xanh, test xanh,
// không một dấu hiệu nào. Check chỉ có giá trị nếu nó thật sự đỏ được.

test("control-char NỔ khi file nguồn có byte NUL", (t) => {
  const root = goodRepo(t, (r) => {
    // NUL thật giữa một template literal — đúng hình dạng đã gặp ngoài đời.
    write(r, "backend/src/services/key.ts", "export const k = `a" + String.fromCharCode(0) + "b`;\n");
  });
  const hit = find(conform(root), "control-char");
  assert.ok(hit, "phải bắt được byte NUL");
  assert.equal(hit.level, "blocking");
  assert.ok(hit.samples.some((s) => s.includes("key.ts") && s.includes("0x00")), `mẫu phải chỉ đúng file + mã: ${hit.samples}`);
});

test("control-char NỔ khi docs .md nuốt mất chuỗi escape (0x08)", (t) => {
  const root = goodRepo(t, (r) => {
    write(r, "docs/plan/01_note.md", "# Ghi chú\nDùng " + String.fromCharCode(8) + " của JS là sai với tiếng Việt.\n");
  });
  const hit = find(conform(root), "control-char");
  assert.ok(hit, "docs cũng phải được soi, không chỉ code");
  assert.ok(hit.samples.some((s) => s.includes("01_note.md") && s.includes("0x08")));
});

test("control-char KHÔNG nổ oan với tab / xuống dòng / CRLF / ký tự có dấu", (t) => {
  const root = goodRepo(t, (r) => {
    write(r, "backend/src/services/ok.ts", "export const s = {\r\n\ta: 1,\r\n};\t// chú thích có dấu: ăn, ước, đường\n");
    write(r, "docs/plan/02_ok.md", "# Tiêu đề\n\n\t- mục có tab\r\n- tiếng Việt: nguồn · ưu tiên\n");
  });
  assert.equal(find(conform(root), "control-char"), undefined, "tab/CRLF/dấu tiếng Việt là hợp lệ — báo là báo oan");
});
