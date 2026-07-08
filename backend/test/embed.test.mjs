import assert from "node:assert/strict";
import test from "node:test";
import { embed, embedConfig, resetEmbed } from "../../dist/brain/embed.js";

test("embedConfig defaults to EmbeddingGemma · q8 · ~/.zemory/models", () => {
  const c = embedConfig();
  assert.match(c.model, /embeddinggemma/i);
  assert.equal(c.dtype, "q8");
  assert.match(c.cacheDir, /[\\/]\.zemory[\\/]models/);
});

test("embed returns a unit-normalized vector when model available, else null (never throws)", async () => {
  const v = await embed("xin chào, đây là zemory recall test — hello world");
  if (v === null) {
    console.log("  embed: model unavailable — fail-open path (ok)");
    return;
  }
  assert.ok(Array.isArray(v) && v.length >= 256, `vector dims = ${v.length}`);
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 0.05, `unit-normalized (norm=${norm.toFixed(4)})`);
});

test("a bad model id fails open to null (no throw)", async () => {
  process.env.ZEMORY_EMBED_MODEL = "zzz/not-a-real-model-xyz";
  resetEmbed();
  try {
    assert.equal(await embed("test"), null);
  } finally {
    delete process.env.ZEMORY_EMBED_MODEL;
    resetEmbed();
  }
});
