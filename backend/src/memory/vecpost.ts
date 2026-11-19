// Search-time transform of a vector index: "all-but-the-top" (Mu & Viswanath 2018) - subtract the corpus mean and
// project out the top-k principal directions, then re-normalize - applied when SEARCHING, never written to the index.
//
// Why it exists (measured 2026-11-19 on the live store, 847,650 Gemma 2 vectors, 108 labeled queries, exhaustive
// search): EmbeddingGemma 2 puts every message in a narrow cone - two random messages score cos 0.70 on median, p5..p95
// spans only 0.15 (Gemma 1: 0.29). Scoring with the mean and the top 2 directions removed lifted vector-only MRR
// 0.222 -> 0.269 (@10 39 -> 50, @200 70 -> 83); on Gemma 1 the same step changed nothing (0.318 -> 0.323).
//
// How it runs without touching the stored vectors: the transformed query is used for the plain KNN, which ranks by
// (q' . d) - right direction, but without each document's own re-normalization (that alone gave MRR 0.226, @200 82). The
// top candidates of that KNN are then rescored with the full transform. Measured: rescoring the top 200 gives exactly the
// full-transform result (MRR 0.269, @10 50), at ~0.3 s for fetching 200 vectors next to a ~3.7 s KNN.
//
// Each machine fits its own parameters on its own index (`zemory vecpost fit`); vectors still travel between machines
// raw, so two machines can never mix spaces. On trial it is opt-in: only ZEMORY_VECPOST=1 makes search use it.
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
}

interface PostRow {
  method: string;
  k: number;
  dims: number;
  mu: Buffer;
  pcs: Buffer;
  hash: string;
  fitted_at: string;
}

const f32 = (b: Buffer): Float32Array => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

/** The fitted transform regardless of the switch (status reporting). */
export function readVecPost(db: Conn): VecPost | null {
  try {
    const r = db.prepare(Q.vecPostGet).get() as PostRow | undefined;
    if (!r) return null;
    const all = f32(r.pcs);
    const pcs: Float32Array[] = [];
    for (let c = 0; c < r.k; c++) pcs.push(all.slice(c * r.dims, (c + 1) * r.dims));
    return { method: r.method, k: r.k, dims: r.dims, mu: f32(r.mu), pcs, hash: r.hash, fittedAt: r.fitted_at };
  } catch {
    return null; // no vec_post table: a raw index
  }
}

/**
 * The index's fitted transform when search should use it, else null. OPT-IN while it is on trial (user 2026-11-19:
 * "thử thôi có sửa gì đâu" - a trial must not change what every agent's recall returns): only ZEMORY_VECPOST=1 turns it
 * on, so fitting the parameters alone changes nothing for the daemon.
 */
export function activePost(db: Conn): VecPost | null {
  const on = process.env.ZEMORY_VECPOST?.trim().toLowerCase();
  if (on !== "1" && on !== "on" && on !== "true") return null;
  return readVecPost(db);
}

/** How many KNN rows a transformed search pulls before rescoring (measured: 200 messages = full-transform result). */
export const POST_CANDIDATES = 400;

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

/**
 * Fit the transform on a sample of the index's own vectors and store its parameters (one small row; the vectors are
 * read in one streamed pass, never written). Fitting again replaces the previous parameters.
 */
export function fitPost(db: Conn, opts: { k?: number; sample?: number } = {}): { hash: string; k: number; sampled: number; ms: number } {
  const t0 = Date.now();
  const k = opts.k ?? 2;
  const dims = (db.prepare(Q.vecDims).get() as { dims: number } | undefined)?.dims;
  if (!dims) throw new Error("this db has no vector index");
  const total = (db.prepare(Q.vecRowCount).get() as { c: number }).c;
  // Every Nth vector of one streamed pass: the sample spreads over the whole index without holding it in memory.
  const step = Math.max(1, Math.floor(total / (opts.sample ?? 60000)));
  const buf = new Float32Array((Math.floor(total / step) + 1) * dims);
  let i = 0;
  let s = 0;
  for (const r of db.prepare(Q.vecAllEmbeddings).iterate() as Iterable<{ embedding: Buffer }>) {
    if (i++ % step === 0 && (s + 1) * dims <= buf.length) buf.set(f32(r.embedding).subarray(0, dims), (s++) * dims);
  }
  if (!s) throw new Error("the vector index is empty");
  const { mu, pcs } = fitAbtt(buf.subarray(0, s * dims), dims, k);
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
  return { hash, k, sampled: s, ms: Date.now() - t0 };
}

/** Remove the fitted transform: search goes back to the raw vectors. */
export function dropPost(db: Conn): void {
  db.exec(Q.vecPostDrop);
}
