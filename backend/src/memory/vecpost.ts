// Post-transform of a vector index: "all-but-the-top" (Mu & Viswanath 2018) - subtract the corpus mean and project out
// the top-k principal directions, then re-normalize. One transform, applied to EVERY vector of an index: the stored
// documents (rewritten once by `applyPostToIndex`), every document embedded afterwards, and every query.
//
// Why it exists (measured 2026-11-19 on the live store, 844,070 Gemma 2 vectors, 108 labeled queries, exhaustive
// search): EmbeddingGemma 2 puts every message in a narrow cone - two random messages score cos 0.70 on median, p5..p95
// spans only 0.15 (Gemma 1: 0.29). Removing the mean and the top 2 directions lifted vector-only MRR 0.222 -> 0.274
// (@10 39 -> 50, @200 70 -> 83); on Gemma 1 the same step changed nothing (0.318 -> 0.323).
//
// Contract: the parameters live in the index's own db (table vec_post) and are identified by a hash. Two indexes mix
// vectors only when their hashes match (vecship checks it) - a transformed vector next to a raw one is the silent
// wrong-space failure every other field of vec_config exists to stop.
import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { Q } from "./store/queries.js";

type Conn = Database.Database;

export interface VecPost {
  method: string;
  k: number;
  dims: number;
  mu: Float32Array;
  pcs: Float32Array[];
  hash: string;
  fittedAt: string;
  appliedUpto: number | null;
  appliedAt: string | null;
}

interface PostRow {
  method: string;
  k: number;
  dims: number;
  mu: Buffer;
  pcs: Buffer;
  hash: string;
  fitted_at: string;
  applied_upto: number | bigint | null;
  applied_at: string | null;
}

const f32 = (b: Buffer): Float32Array => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

/** The index's post-transform row, whether or not it is applied yet; null when the index has none. */
export function readVecPost(db: Conn): VecPost | null {
  try {
    const r = db.prepare(Q.vecPostGet).get() as PostRow | undefined;
    if (!r) return null;
    const all = f32(r.pcs);
    const pcs: Float32Array[] = [];
    for (let c = 0; c < r.k; c++) pcs.push(all.slice(c * r.dims, (c + 1) * r.dims));
    return {
      method: r.method,
      k: r.k,
      dims: r.dims,
      mu: f32(r.mu),
      pcs,
      hash: r.hash,
      fittedAt: r.fitted_at,
      appliedUpto: r.applied_upto == null ? null : Number(r.applied_upto),
      appliedAt: r.applied_at,
    };
  } catch {
    return null; // no vec_post table: a raw index
  }
}

/** The post-transform every vector of this index lives under - only once the rewrite finished. */
export function activePost(db: Conn): VecPost | null {
  const p = readVecPost(db);
  return p && p.appliedAt ? p : null;
}

/** The identity two indexes compare before mixing vectors: '' for a raw index. */
export function postSignature(db: Conn): string {
  const p = activePost(db);
  return p ? `${p.method}${p.k}:${p.hash}` : "";
}

/** x -> normalize(x - mu - sum_c (u_c . (x - mu)) u_c). Input must have the index's dims. */
export function applyPost(v: ArrayLike<number>, p: VecPost): number[] {
  const D = p.dims;
  const x = new Float64Array(D);
  for (let j = 0; j < D; j++) x[j] = v[j] - p.mu[j];
  for (const u of p.pcs) {
    let a = 0;
    for (let j = 0; j < D; j++) a += u[j] * x[j];
    for (let j = 0; j < D; j++) x[j] -= a * u[j];
  }
  let n = 0;
  for (let j = 0; j < D; j++) n += x[j] * x[j];
  n = Math.sqrt(n);
  const out = new Array<number>(D);
  for (let j = 0; j < D; j++) out[j] = n > 0 ? x[j] / n : 0;
  return out;
}

/**
 * Mean + top-k principal directions of `rows` (row-major, `dims` wide), by power iteration with deflation. The start
 * vector is fixed, not random, so the same vectors always give the same parameters (and the same hash).
 */
export function fitAbtt(rows: Float32Array, dims: number, k: number, iterations = 40): { mu: Float32Array; pcs: Float32Array[] } {
  const n = Math.floor(rows.length / dims);
  const mu = new Float64Array(dims);
  for (let i = 0; i < n; i++) for (let j = 0; j < dims; j++) mu[j] += rows[i * dims + j];
  for (let j = 0; j < dims; j++) mu[j] /= n;
  const pcs: Float64Array[] = [];
  for (let c = 0; c < k; c++) {
    let u: Float64Array = new Float64Array(dims).map((_, j) => Math.sin((j + 1) * (c + 1) * 0.618));
    for (let it = 0; it < iterations; it++) {
      const next = new Float64Array(dims);
      for (let i = 0; i < n; i++) {
        let p = 0;
        const o = i * dims;
        for (let j = 0; j < dims; j++) p += (rows[o + j] - mu[j]) * u[j];
        for (let j = 0; j < dims; j++) next[j] += p * (rows[o + j] - mu[j]);
      }
      for (const v of pcs) {
        let p = 0;
        for (let j = 0; j < dims; j++) p += next[j] * v[j];
        for (let j = 0; j < dims; j++) next[j] -= p * v[j];
      }
      const norm = Math.sqrt(next.reduce((s, x) => s + x * x, 0)) || 1;
      u = next.map((x) => x / norm);
    }
    pcs.push(u);
  }
  return { mu: Float32Array.from(mu), pcs: pcs.map((u) => Float32Array.from(u)) };
}

function hashOf(method: string, k: number, dims: number, mu: Float32Array, pcs: Float32Array[]): string {
  const h = createHash("sha1").update(`${method}|${k}|${dims}|`);
  h.update(Buffer.from(mu.buffer, mu.byteOffset, mu.byteLength));
  for (const u of pcs) h.update(Buffer.from(u.buffer, u.byteOffset, u.byteLength));
  return h.digest("hex").slice(0, 12);
}

export interface ApplyResult {
  vectors: number;
  hash: string;
  ms: number;
}

/**
 * Fit the transform on this index's own vectors and rewrite every stored vector with it. Refuses an index that already
 * has one (applied or half-applied): the transform is a projection, so it cannot be undone - a second pass would stack
 * on the first, and the way back is the backup taken before. Run it while nothing else writes this index (daemon
 * stopped, or on a copy): a vector embedded mid-rewrite could land on the wrong side of `applied_upto`.
 */
export function applyPostToIndex(
  db: Conn,
  opts: { k?: number; sample?: number; batch?: number; onProgress?: (done: number, total: number) => void } = {},
): ApplyResult {
  const t0 = Date.now();
  const k = opts.k ?? 2;
  const existing = readVecPost(db);
  if (existing) {
    throw new Error(
      existing.appliedAt
        ? `this index is already transformed (${existing.method}${existing.k}:${existing.hash}, ${existing.appliedAt})`
        : `a previous rewrite stopped at rowid ${existing.appliedUpto ?? 0} - restore the backup taken before it`,
    );
  }
  const dims = (db.prepare(Q.vecDims).get() as { dims: number } | undefined)?.dims;
  if (!dims) throw new Error("this db has no vector index");

  // One pass reads every vector; the rows stay in memory for the rewrite (fp32 768d: ~3 KB each, 2.6 GB for 844k).
  const ids: number[] = [];
  const chunks: Float32Array[] = [];
  for (const r of db.prepare(Q.vecAllEmbeddings).iterate() as Iterable<{ rowid: number | bigint; embedding: Buffer }>) {
    ids.push(Number(r.rowid));
    chunks.push(f32(r.embedding).slice(0, dims));
  }
  const total = ids.length;
  if (!total) throw new Error("the vector index is empty");

  const want = Math.min(total, opts.sample ?? 60000);
  const step = Math.max(1, Math.floor(total / want));
  const sample = new Float32Array(Math.ceil(total / step) * dims);
  let s = 0;
  for (let i = 0; i < total; i += step) sample.set(chunks[i], (s++) * dims);
  const { mu, pcs } = fitAbtt(sample.subarray(0, s * dims), dims, k);
  const method = "abtt";
  const hash = hashOf(method, k, dims, mu, pcs);
  const pcsBlob = new Float32Array(k * dims);
  pcs.forEach((u, c) => pcsBlob.set(u, c * dims));

  db.exec(Q.vecPostDdl);
  db.prepare(Q.vecPostPut).run(
    method,
    k,
    dims,
    Buffer.from(mu.buffer, mu.byteOffset, mu.byteLength),
    Buffer.from(pcsBlob.buffer),
    hash,
    new Date().toISOString(),
  );
  const post = readVecPost(db) as VecPost;

  const order = ids.map((_, i) => i).sort((a, b) => ids[a] - ids[b]);
  const upd = db.prepare(Q.vecUpdateEmbedding);
  const progress = db.prepare(Q.vecPostProgress);
  const batch = Math.max(1, opts.batch ?? 4000);
  const write = db.transaction((part: number[]) => {
    for (const i of part) upd.run(Buffer.from(new Float32Array(applyPost(chunks[i], post)).buffer), BigInt(ids[i]));
    progress.run(ids[part[part.length - 1]]);
  });
  for (let b = 0; b < order.length; b += batch) {
    write(order.slice(b, b + batch));
    opts.onProgress?.(Math.min(b + batch, total), total);
  }
  db.prepare(Q.vecPostDone).run(new Date().toISOString());
  return { vectors: total, hash, ms: Date.now() - t0 };
}
