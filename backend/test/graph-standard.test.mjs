// Taxonomy lấy TỪ BẢN CHUẨN — parser line-anchored trên chính docs harness.
// Mọi assert là HARD equality: chính parser này đã ra 0 node hai lần (bẫy §Mục đích và
// bẫy split[0]) mà code vẫn "chạy được" — test kiểu `if (n === 0) return` sẽ xanh giả.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { buildStandardGraph } from "../../dist/memory/graph/graph-standard.js";
import { tempDir } from "./helpers.mjs";

/**
 * Harness tối thiểu nhưng CÓ ĐỦ BẪY:
 * - `01_CONSTITUTION` có HAI danh sách đánh số: §Mục đích (2 mục) và §Điều khoản (3 điều).
 *   Chỉ §Điều khoản mới được thành node.
 * - `03_STRUCTURE` có bảng §4 kèm hàng header + separator (không được thành concern).
 * - `04_SKILLS` có 1 section KHÔNG phải skill ("Cách dùng skill (LUẬT chung)").
 */
function scaffold(t) {
  const root = tempDir(t, "zemory-gstd-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# App\n");

  writeFileSync(
    join(root, "docs", "agent", "01_CONSTITUTION.md"),
    [
      "# Hiến pháp",
      "## Mục đích",
      "1. **Một Global Memory chung** — mô tả.", // BẪY: list đánh số nhưng KHÔNG phải điều khoản
      "2. **Một harness chuẩn** — mô tả.",
      "## Điều khoản",
      "1. **Tiết kiệm token.** thân điều 1.",
      "2. **Ranh giới của mình.** thân điều 2.",
      "3. **Một nguồn sự thật.** thân điều 3.",
      "## Sửa đổi hiến pháp",
      "- chỉ user chốt.",
    ].join("\n"),
  );

  writeFileSync(
    join(root, "docs", "agent", "02_RULES.md"),
    ["# Rules", "Bám điều 3 và điều 2 khi làm việc.", "Nhắc lại điều 3 lần nữa (không được đếm 2 lần)."].join("\n"),
  );

  writeFileSync(
    join(root, "docs", "agent", "03_STRUCTURE.md"),
    [
      "# Structure",
      "## 3. Cây thư mục",
      "| bảng khác | không phải routing |",
      "## 4. Routing — sửa gì vào đâu",
      "| Có gì / cần làm | → Slot |",
      "|---|---|",
      "| endpoint app mình mở | `backend/src/api/` |",
      "| business logic | `backend/src/services/` |",
      "| nối database | `backend/src/store/` + profile `config/` |",
      "## 5. Convention",
      "| hàng này ngoài §4 | `backend/src/jobs/` |",
    ].join("\n"),
  );

  writeFileSync(
    join(root, "docs", "agent", "04_SKILLS.md"),
    [
      "# Kho skill",
      "## Cách dùng skill (LUẬT chung — vendored)", // BẪY: `##` nhưng KHÔNG phải skill
      "prose.",
      "**Skill inline hiện có:** `grill` · `soi chuẩn`.",
      "## grill",
      "thân grill.",
      "## soi chuẩn (kiểm độ bám chuẩn)",
      "thân soi chuẩn.",
    ].join("\n"),
  );

  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# TODO\n");
  writeFileSync(join(root, "docs", "agent", "06_CHANGES.md"), "# Changes\n");
  writeFileSync(join(root, "docs", "plan", "00_overview.md"), "# Tổng quan\nthân.");
  writeFileSync(join(root, "docs", "plan", "13_graph.md"), "# Plan 13 — Graph\nDẫn chiếu điều 13.");
  writeFileSync(join(root, "docs", "plan", "notes.md"), "# Không đánh số — KHÔNG được thành plan_spec");
  return root;
}

const FILES = [
  { id: "backend/src/api/routes.ts", slot: "api" },
  { id: "backend/src/api/health.ts", slot: "api" },
  { id: "backend/src/services/calc.ts", slot: "services" },
  { id: "backend/src/weird/x.ts", slot: undefined }, // ngoài chuẩn
];

const byType = (g, type) => g.nodes.filter((n) => n.type === type);
const edgesOf = (g, kind) => g.edges.filter((e) => e.kind === kind);

test("hp_dieu CHỈ lấy từ §Điều khoản — list đánh số ở §Mục đích không được thành điều", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const hp = byType(g, "hp_dieu");
  assert.equal(hp.length, 3, "phải đúng 3 điều, không dính 2 mục của §Mục đích");
  assert.deepEqual(
    hp.map((n) => n.id),
    ["hp:1", "hp:2", "hp:3"],
  );
  // Nếu quét cả file thì "Một Global Memory chung" sẽ lọt vào nhãn — chặn hẳn.
  assert.ok(!hp.some((n) => /Global Memory/.test(n.label)), "không được lấy mục của §Mục đích");
});

test("section bị cắt đúng: parser KHÔNG trả rỗng (bẫy split(/^##/)[0])", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  // Cả hai lane này từng ra 0 vì phần tử [0] của split luôn rỗng.
  assert.ok(byType(g, "hp_dieu").length > 0, "hp_dieu không được rỗng");
  assert.ok(byType(g, "concern").length > 0, "concern không được rỗng");
});

test("concern + routing chỉ lấy trong §4, bỏ header/separator và bảng ở section khác", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const concerns = byType(g, "concern");
  assert.equal(concerns.length, 3, "3 hàng dữ liệu của §4");
  assert.ok(!concerns.some((c) => /Có gì|cần làm/.test(c.label)), "không lấy hàng header");
  assert.ok(!concerns.some((c) => /ngoài §4/.test(c.label)), "không lấy bảng ở §5");
  // hàng "nối database" trỏ 2 slot → 2 cạnh routing
  const routing = edgesOf(g, "routing");
  assert.equal(routing.length, 4, "3 hàng: 1+1+2 slot");
  assert.ok(routing.some((e) => e.to === "slot:api"));
  assert.ok(routing.some((e) => e.to === "slot:config"));
});

test("slot vs slot_unused: chỉ slot CÓ file mới là `slot`", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const used = byType(g, "slot").map((n) => n.id).sort();
  const unused = byType(g, "slot_unused").map((n) => n.id).sort();
  assert.deepEqual(used, ["slot:api", "slot:services"], "api/services có file thật");
  assert.deepEqual(unused, ["slot:config", "slot:store"], "khai trong routing mà repo chưa dùng");
});

test("contains: slot → đúng những file nằm trong slot đó", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const api = edgesOf(g, "contains").filter((e) => e.from === "slot:api");
  assert.equal(api.length, 2);
  assert.deepEqual(api.map((e) => e.to).sort(), ["backend/src/api/health.ts", "backend/src/api/routes.ts"]);
  // file không có slot thì không được nối vào slot nào
  assert.ok(!g.edges.some((e) => e.to === "backend/src/weird/x.ts"));
});

test("skill lấy theo dòng tự khai của file, bỏ section LUẬT chung", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const sk = byType(g, "skill");
  assert.equal(sk.length, 2, "roster khai đúng 2 skill");
  assert.ok(!sk.some((n) => /LUẬT chung/i.test(n.label)), "section LUẬT không phải skill");
  assert.deepEqual(sk.map((n) => n.id).sort(), ["skill:grill", "skill:soi-chuan"]);
});

test("plan_spec chỉ nhận NN_tên.md; references điều N khử trùng lặp", (t) => {
  const g = buildStandardGraph(scaffold(t), FILES);
  const plans = byType(g, "plan_spec").map((n) => n.id).sort();
  assert.deepEqual(plans, ["plan:00_overview.md", "plan:13_graph.md"], "notes.md không đánh số → loại");

  const refs = edgesOf(g, "references");
  const fromRules = refs.filter((e) => e.from === "doc:agent/02_RULES.md");
  assert.equal(fromRules.length, 2, "02_RULES nhắc điều 3 hai lần nhưng chỉ ra 1 cạnh");
  assert.deepEqual(fromRules.map((e) => e.to).sort(), ["hp:2", "hp:3"]);
  // chính 01_CONSTITUTION không tự trỏ vào điều của nó bằng cạnh references
  assert.ok(!refs.some((e) => e.from === "doc:agent/01_CONSTITUTION.md"), "hiến pháp không tự references");
  // điều 13 không tồn tại trong fixture → plan/13 nhắc "điều 13" không được đẻ cạnh treo
  assert.ok(!refs.some((e) => e.to === "hp:13"), "không tạo cạnh tới điều không tồn tại");
});

test("thiếu file harness thì fail-open, không ném", (t) => {
  const root = tempDir(t, "zemory-gstd-empty-");
  const g = buildStandardGraph(root, []);
  assert.equal(g.nodes.length, 0);
  assert.equal(g.edges.length, 0);
  assert.equal(g.stats.hpDieu, 0);
});

// ── Phân loại đích của bảng Routing §4: SLOT (từ điển §3) vs TẦNG (§2) ───────────
// Bản trước lấy MÙ đoạn cuối đường dẫn nên gọi mọi thứ là "slot" ⇒ `attic/` `data/`
// `dist/` `external/` `frontend/`… đẻ ra 13 node `slot:*` sai hạng và thổi phồng
// `slot_unused`. Lộ ra khi một check conform dựa trên phép phân loại này báo oan đúng
// 13 mục đó. Sửa xong lại tự dính thêm hai bẫy — cả hai bị khoá ở đây.
test("routing §4 tách đúng SLOT với TẦNG (không gọi tầng là slot)", (t) => {
  const root = tempDir(t, "zemory-route-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# App\n");
  writeFileSync(
    join(root, "docs", "agent", "03_STRUCTURE.md"),
    [
      "# Chuẩn",
      "## 4. Routing",
      "| Concern | Ở đâu |",
      "| --- | --- |",
      "| endpoint | `backend/src/api/` |",   // slot thật (api ∈ từ điển)
      "| gỡ ra | `attic/` |",                 // TẦNG — không phải slot
      "| chỗ ghi | `data/logs/` |",           // thư mục con của tầng
      "| dịch | `backend/src/i18n/` |",       // BẪY 1: slot CÓ CHỮ SỐ
      "| cấu hình | `config/servers.yaml` |", // BẪY 2: đích là FILE
      "## 5. Hết",
    ].join("\n"),
  );
  const g = buildStandardGraph(root, []);
  const byType = (ty) => g.nodes.filter((n) => n.type === ty).map((n) => n.label).sort();
  const slotish = [...byType("slot"), ...byType("slot_unused")].sort();

  assert.ok(slotish.includes("api/"), "backend/src/api/ phải là slot");
  assert.ok(slotish.includes("i18n/"), "i18n là slot CÓ THẬT trong từ điển — chữ số không được loại nó ra");
  assert.ok(slotish.includes("config/"), "đích trỏ vào FILE phải quy về THƯ MỤC CHỨA nó");
  for (const fake of ["attic/", "data/", "data/logs/"]) {
    assert.ok(!slotish.includes(fake), `${fake} là TẦNG (§2), không được xếp thành slot`);
  }
  assert.deepEqual(byType("layer"), ["attic/", "data/logs/"], "tầng có hạng node riêng");
  // Không node nào được là một FILE gắn thêm dấu "/" (thư mục ma).
  const ghosts = g.nodes.filter((n) => /\.[a-z0-9]+\/$/i.test(n.label)).map((n) => n.label);
  assert.deepEqual(ghosts, [], "file bị gắn dấu / thành thư mục ma");
});
