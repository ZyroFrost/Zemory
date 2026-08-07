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
import { findMarker, isConnected, loadContext, MARKER_CANDIDATES } from "../../dist/core/config.js";
import { tempDir } from "./helpers.mjs";

const rel = (root, p) => p.slice(root.length + 1).replace(/\\/g, "/");

test("thứ tự thang đúng như đã khai: harness/ → docs/ → gốc", () => {
  assert.deepEqual(
    MARKER_CANDIDATES.map((p) => p.replace(/\\/g, "/")),
    ["harness/.harness.json", "docs/.harness.json", ".harness.json"],
    "đổi thứ tự thang = đổi hành vi mọi lệnh; nếu cố ý đổi thì phải sửa test này CÙNG lúc",
  );
});

test("CÓ CẢ HAI marker (repo đang chuyển nếp) ⇒ harness/ THẮNG docs/", (t) => {
  const root = tempDir(t, "zemory-ladder-both-");
  mkdirSync(join(root, "harness"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));
  writeFileSync(join(root, "harness", ".harness.json"), JSON.stringify({ docs: "harness/agent", adapters: {}, thresholds: {} }));

  assert.equal(rel(root, findMarker(root)), "harness/.harness.json");
  assert.equal(loadContext(root).config.docs, "harness/agent", "phải đọc marker của bậc CAO hơn, không phải nếp cũ");
});

test("CHỈ có nếp cũ docs/ ⇒ vẫn nhận (bậc ②, repo 1.1.0 không phải sửa gì)", (t) => {
  const root = tempDir(t, "zemory-ladder-legacy-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", adapters: {}, thresholds: {} }));

  assert.equal(rel(root, findMarker(root)), "docs/.harness.json");
  assert.equal(loadContext(root).config.docs, "docs/agent");
});

test("bậc ③: marker ở GỐC dạng con trỏ {home} ⇒ đi theo con trỏ đúng một bước", (t) => {
  // Ca N4: tên `harness/` bị repo chiếm nên harness phải đổi tên, con trỏ ở gốc chỉ đường.
  const root = tempDir(t, "zemory-ladder-pointer-");
  mkdirSync(join(root, "zemory"), { recursive: true });
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "zemory" }));
  writeFileSync(join(root, "zemory", ".harness.json"), JSON.stringify({ docs: "zemory/agent", adapters: {}, thresholds: {} }));

  assert.equal(isConnected(root), true, "marker ở gốc phải tính là đã nối");
  assert.equal(loadContext(root).config.docs, "zemory/agent", "phải đi theo con trỏ tới marker thật");
});

test("con trỏ trỏ vào chỗ KHÔNG có marker ⇒ không im lặng nhận sai, và không ném vỡ lệnh", (t) => {
  const root = tempDir(t, "zemory-ladder-badptr-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "khong-ton-tai", docs: "docs/agent", adapters: {}, thresholds: {} }));
  // Con trỏ chết ⇒ rơi về chính nội dung file gốc (nó có `docs`), KHÔNG được ném.
  assert.doesNotThrow(() => loadContext(root));
  assert.equal(loadContext(root).config.docs, "docs/agent");
});

test("con trỏ trỏ RA NGOÀI cây repo ⇒ PHẢI chặn (không cho harness thoát ra ngoài)", (t) => {
  const root = tempDir(t, "zemory-ladder-escape-");
  writeFileSync(join(root, ".harness.json"), JSON.stringify({ home: "../../ngoai-repo" }));
  assert.throws(() => loadContext(root), /phải nằm trong cây project/i);
});
