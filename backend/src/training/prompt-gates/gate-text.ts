// The self-trained prompt gate's model (plan/38 §8): hashed character and word n-grams of the prompt, TF-IDF weighted and
// unit length, one logistic weight vector per door, optionally stacked with the door's regex. No embedding model: the
// embedding MLP needed ~1 GB resident (EmbeddingGemma 2) and a worker to stay off the daemon's loop; this scores a prompt in
// ~0.2 ms with a few MB, and on the owner's labels it beat the embedding MLP on 8 of 11 doors (measured 2026-11-09).
// The text is read twice, as typed and with its diacritics removed, so a prompt typed without accents meets the same grams.
// Shared by training (03_train) and the hook (04_export); it imports nothing heavy.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TEXT_BITS = 16;

/** How a door decides at run time: its regex (as before), the text model alone, or the text score stacked with the regex. */
export type GateMode = "regex" | "text" | "stack";

/** Logistic regression on [standardised model score, regex hit]. */
export interface Stack { w0: number; w1: number; b: number; mean: number; sd: number }
export const stackScore = (k: Stack, s: number, r: number): number => k.w0 * ((s - k.mean) / k.sd) + k.w1 * r + k.b;

export interface GateDoor {
  part: string;
  mode: GateMode;
  threshold: number;
  stack?: Stack;
  /** sha1 of the rule text + regex the labels were made against: a changed rule falls back to the regex at run time. */
  ruleHash: string;
  positives: { train: number; test: number };
  f1: { regex: number; text: number; stack: number };
  /** the door's weights (base64 Float32, 2^bits) and bias; only for a door whose mode is not "regex" */
  w?: string;
  b?: number;
}

export interface GateModel {
  version: 2;
  kind: "text-ngram";
  bits: number;
  trainedAt: string;
  labels: number;
  /** inverse document frequency per hashed gram (base64 Float32, 2^bits), from the fit rows */
  idf: string;
  doors: GateDoor[];
}

export const MODEL_FILE = "model-text.json";

export const b64 = (a: Float32Array): string => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
export const f32 = (s: string): Float32Array => {
  const b = Buffer.from(s, "base64");
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

const strip = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function hashOf(s: string, mask: number): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) & mask;
}

/** Hashed gram counts of a text: characters 2-5 and words 1-2, as typed and without diacritics. */
export function gramCounts(text: string, bits = TEXT_BITS): Map<number, number> {
  const mask = (1 << bits) - 1;
  const m = new Map<number, number>();
  const add = (g: string): void => {
    const k = hashOf(g, mask);
    m.set(k, (m.get(k) ?? 0) + 1);
  };
  const low = text.toLowerCase();
  for (const v of [low, strip(low)]) {
    const s = ` ${v.replace(/\s+/g, " ").trim()} `;
    for (let n = 2; n <= 5; n++) for (let i = 0; i + n <= s.length; i++) add("c" + s.slice(i, i + n));
    const w = v.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    for (let i = 0; i < w.length; i++) {
      add("w" + w[i]);
      if (i + 1 < w.length) add("b" + w[i] + " " + w[i + 1]);
    }
  }
  return m;
}

export interface Sparse { idx: Int32Array; val: Float32Array }

/** Sublinear TF × IDF, unit length. */
export function tfidf(counts: Map<number, number>, idf: ArrayLike<number>): Sparse {
  const idx = new Int32Array(counts.size), val = new Float32Array(counts.size);
  let i = 0, s = 0;
  for (const [k, c] of counts) {
    const x = (1 + Math.log(c)) * idf[k];
    idx[i] = k;
    val[i++] = x;
    s += x * x;
  }
  s = Math.sqrt(s) || 1;
  for (let j = 0; j < val.length; j++) val[j] /= s;
  return { idx, val };
}

export function dot(w: ArrayLike<number>, x: Sparse): number {
  let s = 0;
  for (let i = 0; i < x.idx.length; i++) s += w[x.idx[i]] * x.val[i];
  return s;
}

/** sha1 (12 hex) of a door's rule body (frontmatter removed) and its regex: the text its labels were judged against. */
export function ruleHashOf(dirOfPart: string | undefined, part: string, re: string): string {
  const f = dirOfPart ? join(dirOfPart, `${part}.md`) : "";
  const body = f && existsSync(f) ? readFileSync(f, "utf8").replace(/^---[\s\S]*?\n---\r?\n/, "") : "";
  return createHash("sha1").update(body).update("\n").update(re).digest("hex").slice(0, 12);
}
