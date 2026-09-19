// ADAPT v2 · N5 — THANG TÌM MARKER: `harness/` → `docs/` → gốc (kèm con trỏ `{home}`).
//
// Vì sao phải có test riêng (lỗ audit lần 3, 2026-08-07): thứ tự ba bậc là CONTRACT — nó
// quyết định repo nào đọc marker nào — nhưng chưa test nào dựng CẢ HAI marker cùng lúc, mà
// đó đúng là trạng thái của một repo đang CHUYỂN từ nếp cũ (`docs/`) sang `harness/`: hai file
// cùng tồn tại một thời gian. Đổi thứ tự trong `MARKER_CANDIDATES` là đổi hành vi của mọi lệnh
// mà không có gì kêu — kiểu drift mà doctrine `structure-sync` nói phải chặn bằng code.
//
// Bậc ③ (`.harness.json` ở gốc, dạng con trỏ) cũng chưa từng được kiểm end-to-end.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { findMarker, findProjectRoot, isConnected, loadContext, MARKER_CANDIDATES, normalizeRoot } from "../../dist/core/config.js";
import { tempDir } from "./helpers.mjs";

const rel = (root, p) => p.slice(root.length + 1).replace(/\\/g, "/");

test("the ladder order is exactly as declared: harness/ then docs/ then the root", () => {
  assert.deepEqual(
    MARKER_CANDIDATES.map((p) => p.replace(/\\/g, "/")),
    ["harness/.harness.json", "docs/.harness.json", ".harness.json"],
    "đổi thứ tự thang = đổi hành vi mọi lệnh; nếu cố ý đổi thì phải sửa test này CÙNG lúc",
  );
});

test("with BOTH markers present (a repo mid-migration) harness/ BEATS docs/", (t) => {
  const root = tempDir(t, "zemory-ladder-both-");
  mkdirSync(join(root, "harness"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  writeFileSync(join(root, "harness", ".harness.json"), JSON.stringify({ docs: "harness/agent", adapters: {}, thresholds: {} }));

  assert.equal(rel(root, findMarker(root)), "harness/.harness.json");
  assert.equal(loadContext(root).config.docs, "harness/agent", "phải đọc marker của bậc CAO hơn, không phải nếp cũ");
});

test("with ONLY the old docs/ layout it is still accepted (rung 2, a 1.1.0 repo needs no change)", (t) => {
  const root = tempDir(t, "zemory-ladder-legacy-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));

  assert.equal(rel(root, findMarker(root)), "docs/.harness.json");
  assert.equal(loadContext(root).config.docs, "docs/agent");
});

test("rung 3: a root marker in the {home} pointer form is followed for exactly one hop", (t) => {
  // Ca N4: tên `harness/` bị repo chiếm nên harness phải đổi tên, con trỏ ở gốc chỉ đường.
  const root = tempDir(t, "zemory-ladder-pointer-");
  mkdirSync(join(root, "zemory"), { recursive: true });
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "zemory" }));
  writeFileSync(join(root, "zemory", ".harness.json"), JSON.stringify({ docs: "zemory/agent", adapters: {}, thresholds: {} }));

  assert.equal(isConnected(root), true, "marker ở gốc phải tính là đã nối");
  assert.equal(loadContext(root).config.docs, "zemory/agent", "phải đi theo con trỏ tới marker thật");
});

test("a pointer aimed where there is NO marker must not silently accept the wrong home, and must not throw", (t) => {
  const root = tempDir(t, "zemory-ladder-badptr-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "khong-ton-tai", docs: "docs/agent", adapters: {}, thresholds: {} }));
  // Con trỏ chết ⇒ rơi về chính nội dung file gốc (nó có `docs`), KHÔNG được ném.
  assert.doesNotThrow(() => loadContext(root));
  assert.equal(loadContext(root).config.docs, "docs/agent");
});

test("a pointer aimed OUTSIDE the repo tree MUST be blocked (the harness may not escape the tree)", (t) => {
  const root = tempDir(t, "zemory-ladder-escape-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "../../ngoai-repo" }));
  assert.throws(() => loadContext(root), /phải nằm trong cây project/i);
});

// findProjectRoot walk-up DỪNG ở ranh giới `.git` — một repo (có `.git`) mà THIẾU marker KHÔNG
// được nhận marker của thư mục CHA. Đo 2026-09-19: zemory mất marker (gitignored) sau reset ⇒
// mọi lệnh + check lúc daemon start resolve nhầm sang marker của `…/Tools/` cha rồi quét 10k file
// mọi project anh em (validate 123 s → CPU-spin daemon → app trắng). Ca ÂM: bỏ chốt `.git` ⇒ leo cha.
test("findProjectRoot STOPS at a .git boundary: a git repo without a marker does NOT adopt the parent's marker", (t) => {
  const root = tempDir(t, "zemory-gitboundary-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} })); // cha CÓ marker
  const repo = join(root, "child-repo");
  mkdirSync(join(repo, ".git"), { recursive: true }); // con là repo (.git) NHƯNG không marker
  assert.equal(findProjectRoot(repo), null, "repo có .git mà thiếu marker phải trả null, KHÔNG leo sang marker của cha");
});

test("findProjectRoot still walks up through NON-repo folders to a marker (normal case preserved)", (t) => {
  const root = tempDir(t, "zemory-walkup-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  const sub = join(root, "a", "b");
  mkdirSync(sub, { recursive: true }); // không .git ở giữa ⇒ walk-up bình thường tới marker cha
  assert.equal(findProjectRoot(sub), normalizeRoot(root));
});

test("a marker AT the .git root is still found (marker beats the boundary check)", (t) => {
  const root = tempDir(t, "zemory-gitmarker-");
  mkdirSync(join(root, ".git"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  assert.equal(findProjectRoot(root), normalizeRoot(root), "marker cùng cấp .git vẫn phải nhận, không bị chốt boundary nuốt");
});
