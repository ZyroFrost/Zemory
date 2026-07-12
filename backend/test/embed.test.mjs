import assert from "node:assert/strict";
import test from "node:test";
import { currentEmbedProfile, embed, embedConfig, resetEmbed, sliceNormalize, targetEmbedDims } from "../../dist/brain/embed.js";

test("targetEmbedDims: default 768; ZEMORY_EMBED_DIMS picks a valid Matryoshka size; junk ignored", () => {
  delete process.env.ZEMORY_EMBED_DIMS;
  assert.equal(targetEmbedDims(), 768);
  process.env.ZEMORY_EMBED_DIMS = "256";
  assert.equal(targetEmbedDims(), 256);
  process.env.ZEMORY_EMBED_DIMS = "300"; // not an MRL size
  assert.equal(targetEmbedDims(), 768);
  delete process.env.ZEMORY_EMBED_DIMS;
});

test("sliceNormalize: keeps the first N dims, unit norm, preserves component ratios", () => {
  const v = [3, 4, 100, -100]; // slicing to 2 must ignore the tail entirely
  const s = sliceNormalize(v, 2);
  assert.equal(s.length, 2);
  const norm = Math.sqrt(s.reduce((a, x) => a + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9, `unit norm (got ${norm})`);
  assert.ok(Math.abs(s[0] / s[1] - 3 / 4) < 1e-9, "ratios preserved");
  // already short enough → untouched
  assert.deepEqual(sliceNormalize([0.6, 0.8], 4), [0.6, 0.8]);
});

test("embed profile: Gemma model → asymmetric prompts; ZEMORY_EMBED_PROMPTS overrides both ways", () => {
  delete process.env.ZEMORY_EMBED_PROMPTS;
  delete process.env.ZEMORY_EMBED_MODEL;
  assert.equal(currentEmbedProfile(), "gemma-prompt-v1", "default model is EmbeddingGemma → prompts on");
  process.env.ZEMORY_EMBED_PROMPTS = "0";
  assert.equal(currentEmbedProfile(), "raw", "=0 forces raw");
  process.env.ZEMORY_EMBED_PROMPTS = "1";
  assert.equal(currentEmbedProfile(), "gemma-prompt-v1", "=1 forces prompts");
  delete process.env.ZEMORY_EMBED_PROMPTS;
  process.env.ZEMORY_EMBED_MODEL = "vendor/some-other-model";
  assert.equal(currentEmbedProfile(), "raw", "non-Gemma model defaults to raw");
  delete process.env.ZEMORY_EMBED_MODEL;
});

test("embedConfig defaults to EmbeddingGemma · q8 · <brain-dir>/models", () => {
  const c = embedConfig();
  assert.match(c.model, /embeddinggemma/i);
  assert.equal(c.dtype, "q8");
  // cacheDir follows the brain data dir (so it relocates off C:\ with the DB),
  // not a fixed home path — just assert it lives in a `models` folder.
  assert.match(c.cacheDir, /[\\/]models$/);
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
