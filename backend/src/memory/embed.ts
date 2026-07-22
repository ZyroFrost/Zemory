// Shared embedding service — the SINGLE source of vectors for the whole system
// (recall now; knowledge-RAG / code-map later — see docs/plan/05_rag.md). Runs a
// small LOCAL embedding model via Transformers.js (ONNX, no Python/GPU).
//
// FAIL-OPEN by contract: any failure (missing model, no network, bad config)
// returns null so callers fall back to FTS-only — embedding is never required.
//
// Config-driven so swapping the model is config, not a rewrite:
//   ZEMORY_EMBED_MODEL  (default EmbeddingGemma-300M, multilingual incl Vietnamese)
//   ZEMORY_EMBED_DTYPE  (default q8 — quantized, ~light)
//   ZEMORY_MODEL_DIR    (weight cache; default <memory-dir>/models — never committed)

import { join } from "node:path";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { currentMemoryDir } from "./db.js";

const DTYPES = ["fp32", "fp16", "q8", "int8", "uint8", "q4", "q4f16", "bnb4"] as const;
type Dtype = (typeof DTYPES)[number];

export interface EmbedConfig {
  model: string;
  dtype: Dtype;
  cacheDir: string;
}

// EmbeddingGemma-300M (Google): ~300M, multilingual (100+ incl Vietnamese),
// Matryoshka. Hosted ungated by onnx-community for Transformers.js.
const DEFAULT_MODEL = "onnx-community/embeddinggemma-300m-ONNX";

// ---------------------------------------------------------------------------
// Prompt profiles (asymmetric query/document encoding).
//
// EmbeddingGemma is PROMPT-TRAINED: its model card requires a task prefix —
// queries as `task: search result | query: {text}`, documents as
// `title: none | text: {text}`. Embedding bare text (the pre-profile behavior)
// leaves accuracy on the table. Prefixed and bare vectors live in DIFFERENT
// spaces, so the profile an index was BUILT with is recorded in vec_config and
// is authoritative for both sides (vectors.ts passes it in); switching profiles
// requires `zemory memory embed --rebuild`. New indexes use currentEmbedProfile().
// ZEMORY_EMBED_PROMPTS=0 forces raw; =1 forces prompts for a non-Gemma model.
// ---------------------------------------------------------------------------
export type EmbedProfile = "raw" | "gemma-prompt-v1";

export function currentEmbedProfile(): EmbedProfile {
  const v = process.env.ZEMORY_EMBED_PROMPTS?.trim();
  if (v === "0") return "raw";
  if (v === "1") return "gemma-prompt-v1";
  return /embeddinggemma/i.test(embedConfig().model) ? "gemma-prompt-v1" : "raw";
}

const promptFor = (kind: "query" | "document", text: string, profile: EmbedProfile): string =>
  profile === "gemma-prompt-v1" ? (kind === "query" ? `task: search result | query: ${text}` : `title: none | text: ${text}`) : text;

// ---------------------------------------------------------------------------
// Matryoshka dims. EmbeddingGemma is MRL-trained: the FIRST N dims of the 768d
// output are themselves a valid (slightly coarser) embedding — slice + renorm,
// no re-embed. Like the prompt profile, the dims an index was BUILT with live
// in vec_config and are authoritative afterwards; ZEMORY_EMBED_DIMS only
// applies when a NEW index is created (default 768 = unchanged behavior).
// ---------------------------------------------------------------------------
const VALID_DIMS = [128, 256, 512, 768];

export function targetEmbedDims(): number {
  const n = Number(process.env.ZEMORY_EMBED_DIMS?.trim());
  return VALID_DIMS.includes(n) ? n : 768;
}

/** First `dims` components, re-normalized to unit length. Longer→shorter only. */
export function sliceNormalize(v: number[], dims: number): number[] {
  if (v.length <= dims) return v;
  const s = v.slice(0, dims);
  const norm = Math.sqrt(s.reduce((a, x) => a + x * x, 0));
  return norm > 0 ? s.map((x) => x / norm) : s;
}

/** Embed a SEARCH QUERY under the given profile (must match the index's stored profile). */
export async function embedQuery(text: string, profile: EmbedProfile): Promise<number[] | null> {
  return embed(promptFor("query", text, profile));
}

/** Embed DOCUMENTS under the given profile (must match the index's stored profile). */
export async function embedDocBatch(texts: string[], profile: EmbedProfile): Promise<(number[] | null)[]> {
  return embedBatch(texts.map((t) => promptFor("document", t, profile)));
}

export function embedConfig(): EmbedConfig {
  const d = process.env.ZEMORY_EMBED_DTYPE?.trim() as Dtype | undefined;
  return {
    model: process.env.ZEMORY_EMBED_MODEL?.trim() || DEFAULT_MODEL,
    dtype: d && DTYPES.includes(d) ? d : "q8",
    cacheDir: process.env.ZEMORY_MODEL_DIR?.trim() || join(currentMemoryDir(), "models"),
  };
}

let pipePromise: Promise<FeatureExtractionPipeline> | null = null;
let lastDims: number | null = null;

async function getPipe(): Promise<FeatureExtractionPipeline> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      const cfg = embedConfig();
      env.cacheDir = cfg.cacheDir; // weights live here, not in the repo
      return pipeline("feature-extraction", cfg.model, { dtype: cfg.dtype });
    })();
  }
  return pipePromise;
}

/** Drop the memoized pipeline (tests / after changing env). */
export function resetEmbed(): void {
  pipePromise = null;
}

/** Dimensions of the last successful embedding (null until one runs). */
export function embedDims(): number | null {
  return lastDims;
}

/** Embed one text → unit-normalized vector, or null on failure (fail-open). */
export async function embed(text: string): Promise<number[] | null> {
  try {
    const pipe = await getPipe();
    const out = await pipe(text, { pooling: "mean", normalize: true });
    const vec = Array.from(out.data as ArrayLike<number>);
    lastDims = vec.length;
    return vec;
  } catch {
    return null;
  }
}

function tensorToVectors(rows: unknown[]): number[][] {
  if (!rows.length) return [];
  if (Array.isArray(rows[0])) return rows.map((row) => (row as number[]).map((n) => Number(n)));
  return [rows.map((n) => Number(n))];
}

/** Embed many texts; try one batched model call, then fail-open per item. */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!texts.length) return [];
  try {
    const pipe = await getPipe();
    const out = await pipe(texts, { pooling: "mean", normalize: true });
    const vectors = tensorToVectors(out.tolist() as unknown[]);
    if (vectors.length !== texts.length) throw new Error("batch embedding shape mismatch");
    if (vectors[0]?.length) lastDims = vectors[0].length;
    return vectors;
  } catch {
    const out: (number[] | null)[] = [];
    for (const t of texts) out.push(await embed(t));
    return out;
  }
}

export interface EmbedProbe {
  ok: boolean;
  model: string;
  dims: number | null;
  detail: string;
}

/** Health probe (for doctor): is the embed model available + what dims? */
export async function embedProbe(): Promise<EmbedProbe> {
  const cfg = embedConfig();
  const v = await embed("zemory embed probe");
  return v
    ? { ok: true, model: cfg.model, dims: v.length, detail: `${cfg.model} (${cfg.dtype}) · ${v.length}d` }
    : { ok: false, model: cfg.model, dims: null, detail: `embed unavailable (${cfg.model}) — recall falls back to FTS` };
}
