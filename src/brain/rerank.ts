// Cross-encoder reranker — an OPTIONAL final-stage rescorer for recall
// (docs/plan/05_rag.md, Giai đoạn E). The vector lane is a BI-encoder: it scores
// query and document SEPARATELY, then compares vectors — fast, but it never lets
// the two texts "see" each other. A CROSS-encoder reads the (query, doc) PAIR
// together in one forward pass and yields a sharper relevance score. We only
// rescore the small top-N candidate pool the hybrid fuser already produced —
// never the whole corpus (a cross-encoder over the corpus would be far too slow).
//
// FAIL-OPEN by contract (same as embed.ts): any failure (missing model, no
// network, bad config) returns null so callers keep the existing RRF order.
// Reranking is ADDITIVE and OFF by default until a benchmark proves a net win.
//
// Shares the SINGLE inference brick (Transformers.js) and the SAME weight cache
// as the embedder (docs/plan/05_rag.md §2 — no second runtime, no second cache).
// Config-driven so swapping the model is config, not a rewrite:
//   ZEMORY_RERANK_MODEL  (default bge-reranker-base, multilingual cross-encoder)
//   ZEMORY_RERANK_DTYPE  (default q8 — quantized, ~light)
//   ZEMORY_MODEL_DIR     (weight cache; shared with the embedder)

import { homedir } from "node:os";
import { join } from "node:path";

const DTYPES = ["fp32", "fp16", "q8", "int8", "uint8", "q4", "q4f16", "bnb4"] as const;
type Dtype = (typeof DTYPES)[number];

export interface RerankConfig {
  model: string;
  dtype: Dtype;
  cacheDir: string;
}

// BAAI bge-reranker-base via Xenova: a compact multilingual cross-encoder with
// ONNX weights for Transformers.js. Swappable to a stronger/heavier reranker
// (e.g. a bge-reranker-v2-m3 ONNX build) purely through ZEMORY_RERANK_MODEL.
const DEFAULT_MODEL = "Xenova/bge-reranker-base";

export function rerankConfig(): RerankConfig {
  const d = process.env.ZEMORY_RERANK_DTYPE?.trim() as Dtype | undefined;
  return {
    model: process.env.ZEMORY_RERANK_MODEL?.trim() || DEFAULT_MODEL,
    dtype: d && DTYPES.includes(d) ? d : "q8",
    cacheDir: process.env.ZEMORY_MODEL_DIR?.trim() || join(homedir(), ".zemory", "models"),
  };
}

interface CrossEncoder {
  tokenizer: (text: string[], opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
  model: (inputs: Record<string, unknown>) => Promise<{ logits: { tolist: () => unknown } }>;
}

let pipePromise: Promise<CrossEncoder> | null = null;

async function getCrossEncoder(): Promise<CrossEncoder> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import("@huggingface/transformers");
      const cfg = rerankConfig();
      env.cacheDir = cfg.cacheDir; // weights live here, not in the repo
      // Cast to callables: the Transformers.js instances ARE callable at runtime
      // (tokenizer(text, opts) / model(inputs)); the cast keeps the call sites typed.
      const tokenizer = (await AutoTokenizer.from_pretrained(cfg.model)) as unknown as (
        text: string[],
        opts: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
      const model = (await AutoModelForSequenceClassification.from_pretrained(cfg.model, {
        dtype: cfg.dtype,
      })) as unknown as (inputs: Record<string, unknown>) => Promise<{ logits: { tolist: () => unknown } }>;
      return { tokenizer, model };
    })();
  }
  return pipePromise;
}

/** Drop the memoized cross-encoder (tests / after changing env). */
export function resetRerank(): void {
  pipePromise = null;
}

/** Pull one relevance score per (query, doc) pair out of the model logits. */
function logitsToScores(raw: unknown, n: number): number[] | null {
  if (!Array.isArray(raw) || raw.length !== n) return null;
  const scores = raw.map((row) => (Array.isArray(row) ? Number(row[row.length - 1]) : Number(row)));
  return scores.every((s) => Number.isFinite(s)) ? scores : null;
}

const MAX_DOC_CHARS = 2000; // cross-encoders truncate ~512 tokens anyway; cap input.

/**
 * Rescore `docs` against `query` with the cross-encoder → one score each
 * (higher = more relevant), aligned to input order. Returns null on ANY failure
 * (model missing, no network, bad config) so callers keep the RRF order.
 */
export async function rerank(query: string, docs: string[]): Promise<number[] | null> {
  if (!docs.length) return [];
  try {
    const { tokenizer, model } = await getCrossEncoder();
    const pairs = new Array<string>(docs.length).fill(query);
    const text_pair = docs.map((d) => d.slice(0, MAX_DOC_CHARS));
    const inputs = await tokenizer(pairs, { text_pair, padding: true, truncation: true });
    const out = await model(inputs);
    return logitsToScores(out.logits.tolist(), docs.length);
  } catch {
    return null;
  }
}

export interface RerankProbe {
  ok: boolean;
  model: string;
  detail: string;
}

/** Health probe: is the reranker model available? (Used by bench / diagnostics.) */
export async function rerankProbe(): Promise<RerankProbe> {
  const cfg = rerankConfig();
  const scores = await rerank("zemory rerank probe", ["a relevant probe document", "an unrelated document"]);
  return scores
    ? { ok: true, model: cfg.model, detail: `${cfg.model} (${cfg.dtype})` }
    : { ok: false, model: cfg.model, detail: `rerank unavailable (${cfg.model}) — recall keeps RRF order` };
}
