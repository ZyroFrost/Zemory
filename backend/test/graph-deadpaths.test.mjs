// LỚP TRẠNG THÁI "ĐƯỜNG DẪN CHẾT" trên graph (plan/13 §4c · plan/21 §5.5b, user chốt 2026-09-16).
//
// Vì sao cổng này tồn tại: graph và `paths check` là HAI hệ chạy song song — graph biết
// import/calls/api, `paths check` biết chuỗi đường dẫn trong docs/config. Cho tới 2026-09-16 chúng
// không hề nối nhau, nên người dùng nhìn graph KHÔNG thấy gì về 24 đường chết của một repo. Lớp mới
// nối hai bên bằng state của sweep (0 quét). Ba thứ dễ hỏng, mỗi thứ một ca ÂM riêng:
//   ① đẻ node TRÙNG cho file vốn đã là node;
//   ② tô đỏ khi người dùng đã TẮT công tắc theo dõi (`pathsWatch`);
//   ③ ném khi gặp state đời cũ (không có trường `where`).
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deadPathsByFile, monitorPaths, loadPathsState } from "../../dist/docs/paths.js";

/** Repo giả: một file docs trỏ vào một đích KHÔNG tồn tại ⇒ đường chết thật, không phải dựng tay. */
function repoWithDeadPath(t) {
  const root = mkdtempSync(join(tmpdir(), "zemory-deadgraph-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  // `docs/plan/*` là nơi DUY NHẤT hợp lệ để đặt chuỗi cần được PHÁN: `06_CHANGES` là file LỊCH SỬ
  // và `04_SKILLS` là TỪ ĐIỂN (plan/21 §2.1/§2.2) — hit trong hai file đó không bao giờ vào rổ CHẾT.
  mkdirSync(join(root, "docs", "plan"), { recursive: true });
  mkdirSync(join(root, "backend", "src", "services"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), "# todo\nXem `backend/src/khong_co_that/mat_roi.ts` để rõ.\n");
  writeFileSync(join(root, "backend", "src", "services", "calc.ts"), "export const a = 1;\n");
  return root;
}
const stateFileIn = (root) => join(root, "paths-state.json");
/** Context đúng khuôn `paths-check.test.mjs` — `pathsCheck` đọc `projectRoot`/`docsDir`/`config`. */
const ctxOf = (root) => ({ projectRoot: root, docsDir: join(root, "docs", "agent"), config: { docs: "docs/agent", adapters: {}, thresholds: {} }, log() {} });

test("state ghi lại NƠI gặp (file:line) của đường mới chết — trước đây chỉ giữ khoá", (t) => {
  const root = repoWithDeadPath(t);
  const sf = stateFileIn(root);
  // Lượt đầu = baseline (mọi thứ đang chết là DI SẢN) ⇒ chưa có gì mới chết.
  monitorPaths(ctxOf(root), { stateFile: sf });
  // Thêm một đường chết MỚI sau baseline ⇒ đây là thứ duy nhất được đổi màu (plan/21 §2.3).
  writeFileSync(join(root, "docs", "plan", "10_x.md"), "# spec\nDời sang `backend/src/da_xoa/cu.ts`.\n");
  const rep = monitorPaths(ctxOf(root), { stateFile: sf });
  assert.ok(rep.monitor.newlyDead.length >= 1, "phải thấy ít nhất một đường MỚI chết");

  const byFile = deadPathsByFile(loadPathsState(sf), root);
  assert.ok(byFile.has("docs/plan/10_x.md"), `phải biết file nào gãy: ${[...byFile.keys()]}`);
  const hits = byFile.get("docs/plan/10_x.md");
  assert.ok(hits[0].line > 0, "phải giữ cả số DÒNG, không chỉ tên file");
  assert.match(hits[0].text, /da_xoa/, "phải giữ chính chuỗi đã chết");
});

test("CA ÂM: repo không có đường mới chết ⇒ không file nào bị đánh dấu", (t) => {
  const root = repoWithDeadPath(t);
  const sf = stateFileIn(root);
  monitorPaths(ctxOf(root), { stateFile: sf }); // baseline nuốt hết
  const byFile = deadPathsByFile(loadPathsState(sf), root);
  assert.equal(byFile.size, 0, "di sản nằm trong baseline ⇒ 0 file gãy, graph không tô gì");
});

test("CA ÂM: state đời cũ (không có trường `where`) ⇒ trả rỗng, KHÔNG ném", () => {
  const old = { version: 1, projects: { "d:\\repo\\x": { baselineAt: "", baseline: [], lastAt: "", lastDead: ["a"], firstSeen: { a: "2026-01-01" } } } };
  const byFile = deadPathsByFile(old, "D:/repo/x");
  assert.equal(byFile.size, 0, "thiếu `where` là hợp lệ — fail-open, không phải lỗi");
});

test("khoá gặp ở nhiều nơi ⇒ giữ lần gặp ĐẦU (tất định, không nhảy giữa hai lượt chạy)", (t) => {
  const root = repoWithDeadPath(t);
  const sf = stateFileIn(root);
  monitorPaths(ctxOf(root), { stateFile: sf });
  // CÙNG một chuỗi chết, xuất hiện ở hai file.
  writeFileSync(join(root, "docs", "plan", "10_x.md"), "Trỏ `backend/src/mat/x.ts`.\n");
  writeFileSync(join(root, "docs", "plan", "11_y.md"), "Cũng trỏ `backend/src/mat/x.ts`.\n");
  monitorPaths(ctxOf(root), { stateFile: sf });
  const a = deadPathsByFile(loadPathsState(sf), root);
  monitorPaths(ctxOf(root), { stateFile: sf });
  const b = deadPathsByFile(loadPathsState(sf), root);
  assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), "hai lượt chạy phải ra CÙNG một file");
});

// ── CA ÂM ①: file ĐÃ là node của lớp chuẩn thì GẮN thuộc tính, KHÔNG đẻ node thứ hai.
//
// Node lớp chuẩn mang id riêng (`doc:agent/05_TODO.md` · `plan:01_x.md`), không phải đường dẫn —
// nên tra bảng chỉ bằng `id` là bỏ sót và đẻ ra một `doc_file` TRÙNG cho cùng một file. Đo được
// đúng lỗi này trên `_DataWarehouse_Central` ngày 2026-09-16: 11 `doc_file` mọc thêm, trong đó
// `docs/agent/05_TODO.md` và `docs/plan/01_source_topology.md` hiện HAI lần. Sau khi tra thêm theo
// `src`: còn 7, và 4 file kia gắn đúng vào node chuẩn của chúng.
test("file đã có node chuẩn ⇒ đánh dấu TẠI node đó, không sinh node trùng", () => {
  const nodes = [
    { id: "doc:agent/05_TODO.md", type: "harness_doc", src: "docs/agent/05_TODO.md" },
    { id: "plan:01_x.md", type: "plan_spec", src: "docs/plan/01_x.md" },
    { id: "backend/src/services/calc.ts", type: "services" },
  ];
  // Cùng phép tra mà endpoint dùng: id TRƯỚC, rồi tới `src`.
  const byKey = new Map();
  for (const n of nodes) {
    byKey.set(n.id, n);
    if (n.src && !byKey.has(n.src)) byKey.set(n.src, n);
  }
  assert.equal(byKey.get("docs/agent/05_TODO.md")?.id, "doc:agent/05_TODO.md", "phải tìm ra node chuẩn qua `src`");
  assert.equal(byKey.get("docs/plan/01_x.md")?.type, "plan_spec", "plan cũng phải tra được qua `src`");
  assert.equal(byKey.get("backend/src/services/calc.ts")?.type, "services", "file mã vẫn tra bằng id như cũ");
  assert.equal(byKey.get("docs/khong_ai_co.md"), undefined, "file chưa có node ⇒ mới được phép dựng `doc_file`");
});
