import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { probe, resetLeanCtx } from "../dist/compress/engines/leanctx.js";
import { readCode } from "../dist/modules/compress-leanctx.js";
import { createRuntime } from "../dist/core/runtime.js";

const tmpFile = (name, body) => {
  const f = join(mkdtempSync(join(tmpdir(), "zemory-lc-")), name);
  writeFileSync(f, body);
  return f;
};

test("readCode fails open to verbatim when the lean-ctx binary is unavailable", () => {
  process.env.LEANCTX_BIN = "/nonexistent/lean-ctx.js"; // forces resolution to a dead entry
  resetLeanCtx();
  try {
    const body = "export function a() {}\nexport function b() {}\nexport function c() {}\n";
    const r = readCode({ file: tmpFile("sample.ts", body) });
    assert.equal(r.text, body, "verbatim content preserved");
    assert.equal(r.before, r.after, "no line change on fallback");
    assert.equal(r.savedPct, 0, "no claimed savings on fallback");
  } finally {
    delete process.env.LEANCTX_BIN;
    resetLeanCtx();
  }
});

test("probe reports unavailable (not throwing) when the binary is missing", () => {
  process.env.LEANCTX_BIN = "/nonexistent/lean-ctx.js";
  resetLeanCtx();
  try {
    const p = probe();
    assert.equal(p.available, false);
    assert.equal(p.version, null);
  } finally {
    delete process.env.LEANCTX_BIN;
    resetLeanCtx();
  }
});

test("leanctx provider is a superset of lite: text still compresses via the slot", async () => {
  const ctx = {
    projectRoot: "C:\\demo",
    docsDir: "C:\\demo\\docs\\agent",
    config: { docs: "docs/agent", adapters: { compress: "leanctx" }, thresholds: {} },
    log: () => {},
  };
  const runtime = createRuntime(ctx);
  assert.equal(
    runtime.registry.resolve("compress").name,
    "leanctx",
    "leanctx is selectable for the compress slot",
  );
  const r = await runtime.router.call("compress", "text", "same\n".repeat(80));
  assert.ok(r.after < r.before, "text op delegates to lite and still shrinks");
});
