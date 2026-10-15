// Shared embedding service — the SINGLE source of vectors for the whole system
// (recall now; knowledge-RAG / code-map later — see docs/plan/05_rag.md). Runs a
// small LOCAL embedding model via Transformers.js (ONNX, no Python/GPU).
//
// FAIL-OPEN by contract: any failure (missing model, no network, bad config)
// returns null so callers fall back to FTS-only — embedding is never required.
//
// Config-driven so swapping the model is config, not a rewrite:
//   ZEMORY_EMBED_MODEL  (a NEW index defaults to EmbeddingGemma 2; an existing index keeps its stored profile)
//   ZEMORY_EMBED_DTYPE  (default fp32 — see DEFAULT_DTYPE)
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
const GEMMA1_MODEL = "onnx-community/embeddinggemma-300m-ONNX";

// EmbeddingGemma 2 (Google, Apache 2.0): 270M text model (+ vision/audio encoders this app never loads), 768d,
// Matryoshka, 8K context. Model card: multilingual text level with v1 (MTEB multilingual v2 61.36 vs 61.15),
// code clearly ahead (78.68 vs 68.76). Measured here 2026-10-15: 245 vs 249 ms per short prompt on this CPU.
// Needs transformers >= 4.3 (EmbeddingGemma2Model).
const GEMMA2_MODEL = "onnx-community/embeddinggemma-2-ONNX";

/** The model a NEW index is built with. An existing index never follows this: its stored profile pins its model. */
const DEFAULT_MODEL = GEMMA2_MODEL;

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
export type EmbedProfile = "raw" | "gemma-prompt-v1" | "gemma2-prompt-v1" | "bge-m3-v1";

// BGE-M3 (BAAI, MIT): multilingual 100+ incl. Vietnamese, 1024d, CLS-pooled, NO prompt prefix.
// Chosen over EmbeddingGemma on measured retrieval quality on this corpus — the one comparison
// in the whole matrix whose 95% CI excluded zero (ΔMRR −0.086 [−0.168 … −0.005] for Gemma).
// See docs/plan/19_bge_swap.md for the full measurement record.
const BGE_MODEL = "onnx-community/bge-m3-ONNX";

/**
 * A profile is the FULL encoding contract of an index, not just its prompt: model, pooling,
 * native width and dtype all have to match the vectors already stored, or queries land in a
 * different space and ranking silently rots. Grouping them here means one stored string
 * (vec_config.profile) pins every one of them — the same doctrine already proven for dims and
 * dtype (stored-config-authoritative).
 *
 * Every profile pins its model. `raw` and `gemma-prompt-v1` once said `null` ("whatever the default model is"),
 * which was harmless only while the default never changed: the moment a new index defaulted to EmbeddingGemma 2,
 * every existing Gemma-300M index would have started embedding its queries with the new model — vectors from two
 * models share nothing (measured 2026-10-15: same text, cos −0.001; a new-model query finds its own text among
 * old-model vectors 1/1,200 times).
 */
interface ProfileSpec {
  model: string;
  /**
   * How the model is loaded. `pipeline` = the feature-extraction pipeline (pooling + normalize inside it).
   * `text-only` = EmbeddingGemma 2: the pipeline would load every encoder (vision + audio too, ~1.8 GB extra),
   * so the vision/audio configs are dropped and the text model's own pooled `sentence_embedding` is used.
   */
  loader?: "pipeline" | "text-only";
  pooling: "mean" | "cls";
  prompted: boolean;
  /** Native output width — the dims a NEW index of this profile gets by default. */
  dims: number;
  /** Default dtype for a NEW index of this profile (stored dtype still wins afterwards). */
  dtype: Dtype;
  /**
   * Encode documents ONE AT A TIME instead of in one batched model call.
   *
   * Measured 2026-08-19 (16 real messages, this CPU): batching is a LOSS on both counts —
   * 1792 vs 318 ms/message for BGE (5.6x SLOWER, padding the short texts up to the longest
   * one) AND it moves the vector: batched-vs-single cosine 0.982 mean. Sequential encoding
   * reproduces the vectors the whole model comparison was measured on, bit for bit (cos
   * 1.000000), so what ships is what was benchmarked.
   *
   * ON for gemma too since 2026-09-07. It was left off because the live index was built with
   * batched calls and the 2026-08-19 note claimed batching MOVES gemma's vectors (cos 0.962),
   * so switching would mix two variants. Re-measured on the same stack (transformers 4.2.0,
   * ort 1.24.3 — unchanged since 2026-07-01), 32 real texts, one process, ruler checked with a
   * negative anchor (two different texts: cos 0.51): batch-16 vs single differ by 3e-13 —
   * float noise. There are no two variants; the old number did not reproduce. What batching
   * DID cost, measured on 326 real windows: RSS peak 4,256 MB vs 966 MB (4.4x — every text in
   * the batch is padded to the longest one, and the ORT arena never shrinks) and it was 19%
   * SLOWER (4,158 vs 3,495 ms/window). That 4 GB child, spawned every 30 minutes by the sync
   * round, is what pushed a 16 GB machine into paging.
   */
  sequential?: boolean;
}

const PROFILE_SPECS: Record<EmbedProfile, ProfileSpec> = {
  raw: { model: GEMMA1_MODEL, pooling: "mean", prompted: false, dims: 768, dtype: "fp32", sequential: true },
  "gemma-prompt-v1": { model: GEMMA1_MODEL, pooling: "mean", prompted: true, dims: 768, dtype: "fp32", sequential: true },
  // Same prompt contract as v1 (the model card lists the same `task: … | query:` / `title: none | text:` strings).
  "gemma2-prompt-v1": { model: GEMMA2_MODEL, loader: "text-only", pooling: "mean", prompted: true, dims: 768, dtype: "fp32", sequential: true },
  // int8, not fp32: measured 637 vs 1388 ms/message on this CPU while the quality difference
  // stayed INSIDE the noise band (bootstrap 2000x, ΔMRR −0.026 [−0.060 … +0.007]) — i.e. fp32
  // buys ~50 extra hours of machine time for something the corpus cannot even resolve.
  "bge-m3-v1": { model: BGE_MODEL, pooling: "cls", prompted: false, dims: 1024, dtype: "int8", sequential: true },
};

const specOf = (p: EmbedProfile): ProfileSpec => PROFILE_SPECS[p] ?? PROFILE_SPECS.raw;

/**
 * The encoding contract, readable from outside — so a gate can pin it.
 *
 * Why this is exported at all: pooling is the one field whose corruption produces NO symptom a
 * config test can see. Mutation-tested 2026-08-19 — flipping BGE to mean-pooling left every
 * behavioral assertion green while the real vectors moved to cos 0.71–0.78 against the
 * benchmarked ones. A silent 25% move in the vector space is exactly the class of bug that must
 * not depend on someone re-running a manual probe.
 */
export function embedProfileSpec(p: EmbedProfile): Readonly<ProfileSpec> {
  return specOf(p);
}

/**
 * Which profile the ACTIVE pipeline is encoding under. Same mechanism as `dtypeOverride`:
 * vectors.ts reads the profile out of vec_config and every embed call routes through
 * embedQuery/embedDocBatch, which pin it here first. Changing it drops the pipeline, because a
 * different profile can mean a different model file entirely.
 */
let activeProfile: EmbedProfile | null = null;

export function useEmbedProfile(p: EmbedProfile | null | undefined): void {
  const next = p && p in PROFILE_SPECS ? p : null;
  if (next !== activeProfile) {
    activeProfile = next;
    resetEmbed();
  }
}

export function currentEmbedProfile(): EmbedProfile {
  const v = process.env.ZEMORY_EMBED_PROMPTS?.trim();
  if (v === "0") return "raw";
  if (v === "1") return "gemma-prompt-v1";
  const model = process.env.ZEMORY_EMBED_MODEL?.trim() || DEFAULT_MODEL;
  if (/bge-m3/i.test(model)) return "bge-m3-v1";
  if (/embeddinggemma-?2/i.test(model)) return "gemma2-prompt-v1";
  return /embeddinggemma/i.test(model) ? "gemma-prompt-v1" : "raw";
}

const promptFor = (kind: "query" | "document", text: string, profile: EmbedProfile): string =>
  specOf(profile).prompted ? (kind === "query" ? `task: search result | query: ${text}` : `title: none | text: ${text}`) : text;

// ---------------------------------------------------------------------------
// Matryoshka dims. EmbeddingGemma is MRL-trained: the FIRST N dims of the 768d
// output are themselves a valid (slightly coarser) embedding — slice + renorm,
// no re-embed. Like the prompt profile, the dims an index was BUILT with live
// in vec_config and are authoritative afterwards; ZEMORY_EMBED_DIMS only
// applies when a NEW index is created (default 768 = unchanged behavior).
// ---------------------------------------------------------------------------
const VALID_DIMS = [128, 256, 512, 768, 1024];

/**
 * Native width of a NEW index. Defaults to the ACTIVE profile's width (Gemma 768, BGE 1024) —
 * hardcoding 768 here would have quietly truncated every BGE index to a Gemma-shaped table.
 * ZEMORY_EMBED_DIMS still overrides, but only downward: slicing is only valid for MRL-trained
 * models, and asking for MORE dims than the model emits is a config error, not a resize.
 */
export function targetEmbedDims(profile: EmbedProfile = effectiveProfile()): number {
  const native = specOf(profile).dims;
  const n = Number(process.env.ZEMORY_EMBED_DIMS?.trim());
  return VALID_DIMS.includes(n) && n <= native ? n : native;
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
  useEmbedProfile(profile); // pins model + pooling too, not just the prompt
  return embed(promptFor("query", text, profile));
}

/** Embed DOCUMENTS under the given profile (must match the index's stored profile). */
export async function embedDocBatch(texts: string[], profile: EmbedProfile): Promise<(number[] | null)[]> {
  useEmbedProfile(profile);
  const prompted = texts.map((t) => promptFor("document", t, profile));
  if (!specOf(profile).sequential) return embedBatch(prompted);
  const out: (number[] | null)[] = [];
  for (const t of prompted) out.push(await embed(t));
  return out;
}

/**
 * fp32, not a quantized build. Measured on this corpus (i5-13420H, 48 real chunks,
 * one process per dtype, 2026-08-05): fp32 **1.61 s/chunk** · fp16 1.66 · q8 3.09 ·
 * q4f16 5.23 · q4 5.45. Quantization LOSES here — the 4-bit paths dequantize weights
 * back to float before every matmul and parallelize worse (fp32 used 7.5 cores, q4
 * only 3.5). So q8 was paying twice: ~2x slower AND lossier than the full model, and
 * all it bought was disk (295 MB vs 1178 MB). Disk is the cheap resource.
 */
const DEFAULT_DTYPE: Dtype = "fp32";

/**
 * Stored-dtype-authoritative — the same doctrine as profile and dims. An index built
 * with one dtype must keep being fed by that dtype, on BOTH the document and the query
 * side: q8 and fp32 vectors of the same model are CLOSE but not identical, so mixing
 * them degrades ranking with nothing to show for it. vectors.ts sets this from
 * vec_config before embedding; null = no index yet, adopt the current config.
 */
let dtypeOverride: Dtype | null = null;

export function useEmbedDtype(d: string | null | undefined): void {
  const next = d && (DTYPES as readonly string[]).includes(d) ? (d as Dtype) : null;
  if (next !== dtypeOverride) {
    dtypeOverride = next;
    resetEmbed(); // a different dtype is a different model file — reload the pipeline
  }
}

/** The profile actually in force: what vectors.ts pinned, else what the env implies. */
const effectiveProfile = (): EmbedProfile => activeProfile ?? currentEmbedProfile();

export function embedConfig(): EmbedConfig {
  const d = process.env.ZEMORY_EMBED_DTYPE?.trim() as Dtype | undefined;
  const spec = specOf(effectiveProfile());
  return {
    // An explicit env model still wins (experiments, local exports); otherwise the profile
    // decides, and only profiles that ARE a model choice pin one.
    model: process.env.ZEMORY_EMBED_MODEL?.trim() || spec.model,
    dtype: dtypeOverride ?? (d && DTYPES.includes(d) ? d : spec.dtype ?? DEFAULT_DTYPE),
    cacheDir: process.env.ZEMORY_MODEL_DIR?.trim() || join(currentMemoryDir(), "models"),
  };
}

/**
 * Tuỳ chọn phiên ONNX dùng chung cho embed + rerank, đọc từ env — mặc định KHÔNG đặt gì (giữ
 * hành vi production). Vì sao có (2026-08-27): gate tràn 16 GB làm sập phiên hai lần; gate nay chạy
 * nhóm nạp model với `ZEMORY_ONNX_THREADS=4` để nhường CPU cho người dùng và phiên khác cùng máy.
 * ⚠ `ZEMORY_ONNX_MEM_ARENA=0` có ở đây để THÍ NGHIỆM, KHÔNG dùng cho gate: đo trên `vectors.test`,
 * tắt arena làm RAM phình NHANH HƠN (12 GB trong 125 s) so với arena bật (6,1 GB / 18 phút) — thứ
 * ăn RAM không phải arena. Không đặt env ⇒ `undefined` ⇒ runtime tự chọn như trước.
 */
export function ortSessionOptions(): { enableCpuMemArena?: boolean; intraOpNumThreads?: number } | undefined {
  const arena = process.env.ZEMORY_ONNX_MEM_ARENA?.trim();
  const threads = Number(process.env.ZEMORY_ONNX_THREADS?.trim());
  const o: { enableCpuMemArena?: boolean; intraOpNumThreads?: number } = {};
  if (arena === "0") o.enableCpuMemArena = false;
  if (Number.isInteger(threads) && threads > 0) o.intraOpNumThreads = threads;
  return Object.keys(o).length ? o : undefined;
}

/** One loaded model, whatever the loader: text(s) in, unit-normalized vectors out. */
interface Encoder {
  one(text: string): Promise<number[]>;
  many(texts: string[]): Promise<number[][]>;
  /** Release the ONNX sessions. Garbage collection never does: the library releases them only on dispose(). */
  dispose(): Promise<void>;
}

let pipePromise: Promise<Encoder> | null = null;
let lastDims: number | null = null;

const unit = (v: number[]): number[] => {
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return n > 0 ? v.map((x) => x / n) : v;
};

function tensorToVectors(rows: unknown[]): number[][] {
  if (!rows.length) return [];
  if (Array.isArray(rows[0])) return rows.map((row) => (row as number[]).map((n) => Number(n)));
  return [rows.map((n) => Number(n))];
}

async function getPipe(): Promise<Encoder> {
  if (!pipePromise) {
    pipePromise = (async (): Promise<Encoder> => {
      const T = await import("@huggingface/transformers");
      const cfg = embedConfig();
      T.env.cacheDir = cfg.cacheDir; // weights live here, not in the repo
      const session_options = ortSessionOptions();
      const opts = { dtype: cfg.dtype, ...(session_options ? { session_options } : {}) };
      if (specOf(effectiveProfile()).loader === "text-only") {
        const config = await T.AutoConfig.from_pretrained(cfg.model);
        const c = config as unknown as { vision_config?: unknown; audio_config?: unknown };
        c.vision_config = c.audio_config = null; // text only: never download or load the vision/audio encoders
        const model = (await T.AutoModel.from_pretrained(cfg.model, { config, ...opts })) as unknown as ((
          inputs: unknown,
        ) => Promise<{ sentence_embedding: { tolist: () => unknown } }>) & { dispose: () => Promise<unknown> };
        const tok = (await T.AutoTokenizer.from_pretrained(cfg.model)) as unknown as (
          text: string[],
          o: Record<string, unknown>,
        ) => Promise<unknown>;
        const many = async (texts: string[]): Promise<number[][]> => {
          const out = await model(await tok(texts, { padding: true, truncation: true }));
          return tensorToVectors(out.sentence_embedding.tolist() as unknown[]).map(unit);
        };
        return { one: async (t) => (await many([t]))[0], many, dispose: async () => void (await model.dispose()) };
      }
      const pipe = (await T.pipeline("feature-extraction", cfg.model, opts)) as FeatureExtractionPipeline;
      return {
        one: async (t) => Array.from((await pipe(t, { pooling: poolingNow(), normalize: true })).data as ArrayLike<number>),
        many: async (texts) => tensorToVectors((await pipe(texts, { pooling: poolingNow(), normalize: true })).tolist() as unknown[]),
        dispose: async () => void (await pipe.dispose()),
      };
    })();
  }
  return pipePromise;
}

/**
 * Drop the memoized model (profile/dtype change, tests) AND release its ONNX sessions. Only dropping the
 * reference leaked the whole model until process exit — Transformers.js frees sessions on dispose() only.
 * Measured 2026-10-15 in the 4 GB gate cage: vectors.test, which switches profiles, hit the 4,096 MB ceiling
 * once one process held both Gemma-300M and EmbeddingGemma 2. Fail-open: a failed release is ignored.
 */
export function resetEmbed(): void {
  const old = pipePromise;
  pipePromise = null;
  if (old) void old.then((e) => e.dispose()).catch(() => {});
}

/** Dimensions of the last successful embedding (null until one runs). */
export function embedDims(): number | null {
  return lastDims;
}

/**
 * Pooling is part of the profile, not a constant: Gemma is mean-pooled, BGE-M3 is CLS-pooled.
 * Mean-pooling a CLS model produces a plausible-looking vector in the WRONG space — no error,
 * no warning, just silently worse ranking. That is exactly the failure mode this repo keeps
 * paying for, so it is pinned by the same stored profile as everything else.
 */
const poolingNow = (): "mean" | "cls" => specOf(effectiveProfile()).pooling;

/** Embed one text → unit-normalized vector, or null on failure (fail-open). */
export async function embed(text: string): Promise<number[] | null> {
  try {
    const vec = await (await getPipe()).one(text);
    lastDims = vec.length;
    return vec;
  } catch {
    return null;
  }
}

/** Embed many texts; try one batched model call, then fail-open per item. */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!texts.length) return [];
  try {
    const vectors = await (await getPipe()).many(texts);
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
