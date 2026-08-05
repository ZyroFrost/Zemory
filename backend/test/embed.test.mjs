import assert from "node:assert/strict";
import test from "node:test";
import {
  currentEmbedProfile,
  embed,
  embedConfig,
  resetEmbed,
  sliceNormalize,
  targetEmbedDims,
  useEmbedDtype,
} from "../../dist/memory/embed.js";

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

test("embedConfig defaults to EmbeddingGemma · fp32 · <memory-dir>/models", () => {
  // fp32, not q8 — measured 2026-08-05 on real corpus chunks: fp32 1.61 s/chunk vs
  // q8 3.09 (and q4 5.45). Quantizing this 300M model LOSES on CPU: the 4-bit paths
  // dequantize before every matmul and parallelize worse. q8 bought only disk.
  const c = embedConfig();
  assert.match(c.model, /embeddinggemma/i);
  assert.equal(c.dtype, "fp32");
  // cacheDir follows the memory data dir (so it relocates off C:\ with the DB),
  // not a fixed home path — just assert it lives in a `models` folder.
  assert.match(c.cacheDir, /[\\/]models$/);
});

test("stored dtype WINS over the default and over env — an index keeps the dtype it was built with", () => {
  // Why this matters: an index built with q8 must keep receiving q8 vectors on BOTH
  // the document and the query side. Without this, flipping the default to fp32 would
  // start feeding fp32 vectors into every EXISTING q8 index — silent quality rot with
  // nothing in the logs. Same doctrine as stored-profile / stored-dims.
  delete process.env.ZEMORY_EMBED_DTYPE;
  try {
    useEmbedDtype("q8");
    assert.equal(embedConfig().dtype, "q8", "stored q8 index keeps q8");

    process.env.ZEMORY_EMBED_DTYPE = "fp16";
    assert.equal(embedConfig().dtype, "q8", "stored value beats env too");

    delete process.env.ZEMORY_EMBED_DTYPE;
    useEmbedDtype("not-a-dtype");
    assert.equal(embedConfig().dtype, "fp32", "junk is ignored → back to the default");

    useEmbedDtype("q4");
    assert.equal(embedConfig().dtype, "q4");
    useEmbedDtype(null); // no index yet → adopt the current config
    assert.equal(embedConfig().dtype, "fp32");
  } finally {
    delete process.env.ZEMORY_EMBED_DTYPE;
    useEmbedDtype(null);
    resetEmbed();
  }
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
