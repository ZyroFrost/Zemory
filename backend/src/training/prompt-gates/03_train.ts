// Step 03 of the prompt-gates model (plan/38 §4 ②③, HS slot Backend_174_Training): train and compare, per door, three
// ways of deciding "this message should fire the door": the door's regex (the baseline the hook runs today), a kNN over the
// door's labelled messages, a logistic regression over the same vectors, and a linear SVM over the centred vectors. Each
// is measured by stratified k-fold cross-validation on the reviewed labels; thresholds are picked on the training folds
// only. Nothing here touches the hook or HS: the report decides, the person approves, step 04 exports.

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentEmbedProfile, embedQuery, type EmbedProfile } from "../../memory/embed.js";
import { trainingDir } from "./01_pull.js";
import { promptMatches } from "../../docs/harness-names.js";
import {
  b64, dot as sdot, gramCounts, MODEL_FILE, ruleHashOf, stackScore, TEXT_BITS, tfidf, type GateDoor, type GateMode, type GateModel, type Sparse, type Stack,
} from "./gate-text.js";
export { ruleHashOf, stackScore, type GateDoor, type GateMode, type GateModel, type Stack } from "./gate-text.js";
import { doorsOf, regexLabels } from "./02_label.js";

/** The key of a text in the vector cache: its exact bytes, not a normalised form (the hook embeds the exact text). */
export const textKey = (t: string): string => createHash("sha1").update(t, "utf8").digest("hex").slice(0, 16);

/**
 * Vectors of the texts under one embed profile, each text embedded once: 02_processing/vectors-<profile>.jsonl holds one
 * line per text ({ k, v } with v the float32 vector in base64), appended as each vector is made, so a run that stops resumes
 * where it stopped. A torn last line (the process died mid-write) is skipped and that text embedded again. The path is the
 * one the hook takes (`embedQuery`, query prompt) — a vector made any other way would train a model the hook cannot feed.
 */
export async function embedCached(
  texts: string[],
  opts: {
    dir?: string;
    profile?: EmbedProfile;
    embed?: (t: string) => Promise<number[] | null>;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<Map<string, number[]>> {
  const profile = opts.profile ?? currentEmbedProfile();
  const embed = opts.embed ?? ((t: string) => embedQuery(t, profile));
  const proc = join(opts.dir ?? trainingDir(), "02_processing");
  mkdirSync(proc, { recursive: true });
  const file = join(proc, `vectors-${profile}.jsonl`);
  const have = new Map<string, number[]>();
  if (existsSync(file)) {
    const body = readFileSync(file, "utf8");
    for (const line of body.split("\n")) {
      if (!line) continue;
      try {
        const { k, v } = JSON.parse(line) as { k: string; v: string };
        const b = Buffer.from(v, "base64");
        have.set(k, Array.from(new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4)));
      } catch {
        /* a torn line: its text is embedded again below */
      }
    }
    if (body.length && !body.endsWith("\n")) appendFileSync(file, "\n");
  }
  const out = new Map<string, number[]>();
  const todo: string[] = [];
  for (const t of new Set(texts)) {
    const v = have.get(textKey(t));
    if (v) out.set(t, v);
    else todo.push(t);
  }
  let done = 0;
  for (const t of todo) {
    const v = await embed(t);
    done++;
    if (!v) continue;
    out.set(t, v);
    const b = Buffer.from(new Float32Array(v).buffer);
    appendFileSync(file, JSON.stringify({ k: textKey(t), v: b.toString("base64") }) + "\n");
    opts.onProgress?.(done, todo.length);
  }
  return out;
}

export interface Labelled {
  id: string | number;
  text: string;
  door: string;
  label: 0 | 1;
}

export interface Score {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
}

export function score(pred: boolean[], gold: (0 | 1)[]): Score {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  pred.forEach((p, i) => {
    if (p && gold[i]) tp++;
    else if (p) fp++;
    else if (gold[i]) fn++;
    else tn++;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const r = (x: number): number => Number(x.toFixed(3));
  return { tp, fp, fn, tn, precision: r(precision), recall: r(recall), f1: r(f1) };
}

const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * b[i], 0);

/** kNN score: closest positive minus closest negative (unit vectors: dot = cosine). */
export function knnScore(v: number[], pos: number[][], neg: number[][]): number {
  const p = pos.length ? Math.max(...pos.map((x) => dot(v, x))) : -1;
  const n = neg.length ? Math.max(...neg.map((x) => dot(v, x))) : -1;
  return p - n;
}

/** L2-regularised logistic regression, batch gradient descent; returns weights with the bias last. */
export function fitLogistic(xs: number[][], ys: (0 | 1)[], opts: { iters?: number; rate?: number; l2?: number } = {}): number[] {
  const d = xs[0]?.length ?? 0;
  const w = new Array(d + 1).fill(0);
  const iters = opts.iters ?? 400, rate = opts.rate ?? 0.5, l2 = opts.l2 ?? 0.01;
  // class weights: a door has few positives; without weighting the model learns "never fire"
  const pos = ys.filter((y) => y).length || 1, neg = ys.length - pos || 1;
  const cw = (y: number): number => (y ? ys.length / (2 * pos) : ys.length / (2 * neg));
  for (let it = 0; it < iters; it++) {
    const g = new Array(d + 1).fill(0);
    xs.forEach((x, i) => {
      const z = dot(w.slice(0, d), x) + w[d];
      const err = (1 / (1 + Math.exp(-z)) - ys[i]) * cw(ys[i]);
      for (let j = 0; j < d; j++) g[j] += err * x[j];
      g[d] += err;
    });
    for (let j = 0; j < d; j++) w[j] -= rate * (g[j] / xs.length + l2 * w[j]);
    w[d] -= rate * (g[d] / xs.length);
  }
  return w;
}
export const logistic = (w: number[], x: number[]): number => 1 / (1 + Math.exp(-(dot(w.slice(0, x.length), x) + w[x.length])));

/** A linear SVM and the centring it was trained with: the scores of new vectors go through the same centring. */
export interface SvmModel {
  w: number[];
  b: number;
  mean: number[];
}

/**
 * Subtract the training mean, then scale back to unit length. Any two sentences already sit near cosine 0.7 under
 * EmbeddingGemma (plan/38 §6), so the raw vectors share one large direction that a linear model cannot separate on;
 * removing it leaves the part that differs between messages.
 */
export function centre(x: number[], mean: number[]): number[] {
  const c = x.map((v, i) => v - mean[i]);
  const n = Math.sqrt(dot(c, c)) || 1;
  return c.map((v) => v / n);
}

/**
 * Linear SVM: class-weighted hinge loss with L2, full-batch subgradient descent (deterministic, a step of rate/√t), on
 * centred vectors. The weights make a door with few positives still learn instead of settling on "never fire".
 */
export function fitSvm(xs: number[][], ys: (0 | 1)[], opts: { iters?: number; rate?: number; lambda?: number } = {}): SvmModel {
  const d = xs[0]?.length ?? 0;
  const mean = new Array(d).fill(0);
  for (const x of xs) for (let j = 0; j < d; j++) mean[j] += x[j] / xs.length;
  const cx = xs.map((x) => centre(x, mean));
  const iters = opts.iters ?? 500, rate = opts.rate ?? 1, lambda = opts.lambda ?? 0.01;
  const pos = ys.filter((y) => y).length || 1, neg = ys.length - pos || 1;
  const cw = (y: number): number => (y ? ys.length / (2 * pos) : ys.length / (2 * neg));
  const w = new Array(d).fill(0);
  let b = 0;
  for (let t = 1; t <= iters; t++) {
    const g = w.map((v) => lambda * v);
    let gb = 0;
    cx.forEach((x, i) => {
      const y = ys[i] ? 1 : -1;
      if (y * (dot(w, x) + b) < 1) {
        const k = (cw(ys[i]) * y) / cx.length;
        for (let j = 0; j < d; j++) g[j] -= k * x[j];
        gb -= k;
      }
    });
    const step = rate / Math.sqrt(t);
    for (let j = 0; j < d; j++) w[j] -= step * g[j];
    b -= step * gb;
  }
  return { w, b, mean };
}
export const svmScore = (m: SvmModel, x: number[]): number => dot(m.w, centre(x, m.mean)) + m.b;

/** The regex as a pre-filter: the model decides only the messages the regex fired on; the rest are never reminded. */
export const behindRegex = (model: boolean[], regex: boolean[]): boolean[] => model.map((p, i) => p && regex[i]);

/** The threshold over `scores` that gives the best F1 against `gold` (ties: the higher threshold, fewer reminders). */
export function bestThreshold(scores: number[], gold: (0 | 1)[]): number {
  const cands = [...new Set(scores)].sort((a, b) => a - b);
  let best = Infinity, bestF = -1;
  for (const t of cands) {
    const f = score(scores.map((s) => s >= t), gold).f1;
    if (f >= bestF) { bestF = f; best = t; }
  }
  return best;
}

/** Stratified folds, seeded: the same split every run. */
export function folds(gold: (0 | 1)[], k: number, seed = 7): number[] {
  let s = seed;
  const rnd = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
  const idx = gold.map((g, i) => ({ g, i, r: rnd() })).sort((a, b) => a.r - b.r);
  const out = new Array(gold.length).fill(0);
  let p = 0, n = 0;
  for (const x of idx) out[x.i] = x.g ? p++ % k : n++ % k;
  return out;
}

export interface DoorReport {
  door: string;
  n: number;
  positives: number;
  regex: Score;
  knn: Score;
  logistic: Score;
  svm: Score;
  best: "regex" | "knn" | "logistic" | "svm";
  /**
   * The same models behind the regex as a pre-filter: a message reaches the model only when the regex fired, so what the
   * regex misses is never reminded. Compared with the plain columns it shows what the filter costs and what it saves.
   */
  cascade: { knn: Score; logistic: Score; svm: Score };
}

export interface TrainReport {
  profile: string;
  labels: string[];
  folds: number;
  doors: DoorReport[];
  file: string;
  ms: number;
}

/** Cross-validate the three ways for every labelled door; write the report into 03_output/run-<time>/. */
export async function train(opts: { dir?: string; k?: number } = {}): Promise<TrainReport> {
  const t0 = Date.now();
  const dir = opts.dir ?? trainingDir();
  const raw = join(dir, "01_raw");
  const files = existsSync(raw) ? readdirSync(raw).filter((n) => /^labels-.*\.jsonl$/.test(n)) : [];
  const read = (f: string): Labelled[] => readFileSync(join(raw, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const rows: Labelled[] = files.flatMap(read);
  // the cases moved out of the agent memory are positives of the door they name
  for (const n of existsSync(raw) ? readdirSync(raw).filter((x) => /^memory-cases-.*\.jsonl$/.test(x)) : []) {
    for (const c of readFileSync(join(raw, n), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as { text: string; labels: string[] })) {
      for (const d of c.labels) {
        const full = rows.find((r) => r.door === d || r.door.startsWith(d + "_"))?.door;
        if (full) rows.push({ id: `case:${c.text.slice(0, 20)}`, text: c.text, door: full, label: 1 });
      }
    }
  }
  const profile = currentEmbedProfile();
  const vecs = await embedCached([...new Set(rows.map((r) => r.text))], { dir, profile });
  const doors = doorsOf();
  const k = opts.k ?? 5;
  const reports: DoorReport[] = [];
  for (const door of [...new Set(rows.map((r) => r.door))].sort()) {
    const data = rows.filter((r) => r.door === door && vecs.has(r.text));
    const gold = data.map((r) => r.label);
    const X = data.map((r) => vecs.get(r.text)!);
    const rx = data.map((r) => regexLabels(r.text, doors).includes(door));
    const f = folds(gold, k);
    const knnPred = new Array(data.length).fill(false);
    const lrPred = new Array(data.length).fill(false);
    const svmPred = new Array(data.length).fill(false);
    for (let fold = 0; fold < k; fold++) {
      const tr = data.map((_, i) => i).filter((i) => f[i] !== fold);
      const te = data.map((_, i) => i).filter((i) => f[i] === fold);
      if (!te.length) continue;
      const pos = tr.filter((i) => gold[i]).map((i) => X[i]);
      const neg = tr.filter((i) => !gold[i]).map((i) => X[i]);
      // kNN threshold from the training fold, each training item scored without itself
      const trS = tr.map((i) => knnScore(X[i], pos.filter((p) => p !== X[i]), neg.filter((p) => p !== X[i])));
      const tk = bestThreshold(trS, tr.map((i) => gold[i]));
      for (const i of te) knnPred[i] = knnScore(X[i], pos, neg) >= tk;
      const w = fitLogistic(tr.map((i) => X[i]), tr.map((i) => gold[i]));
      const tl = bestThreshold(tr.map((i) => logistic(w, X[i])), tr.map((i) => gold[i]));
      for (const i of te) lrPred[i] = logistic(w, X[i]) >= tl;
      // the SVM decides at its own margin (score ≥ 0): its hinge loss already placed the boundary, a threshold re-picked on
      // the training fold it fits almost perfectly would only move it towards "never fire"
      const m = fitSvm(tr.map((i) => X[i]), tr.map((i) => gold[i]));
      for (const i of te) svmPred[i] = svmScore(m, X[i]) >= 0;
    }
    const r: DoorReport = {
      door,
      n: data.length,
      positives: gold.filter((g) => g).length,
      regex: score(rx, gold),
      knn: score(knnPred, gold),
      logistic: score(lrPred, gold),
      svm: score(svmPred, gold),
      best: "regex",
      cascade: {
        knn: score(behindRegex(knnPred, rx), gold),
        logistic: score(behindRegex(lrPred, rx), gold),
        svm: score(behindRegex(svmPred, rx), gold),
      },
    };
    r.best = (["regex", "knn", "logistic", "svm"] as const).reduce((a, b) => (r[b].f1 > r[a].f1 ? b : a));
    reports.push(r);
  }
  const out = join(dir, "03_output", `run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(out, { recursive: true });
  const file = join(out, "report.json");
  const rep = { profile, labels: files, folds: k, doors: reports, file, ms: Date.now() - t0 };
  writeFileSync(file, JSON.stringify(rep, null, 1) + "\n", "utf8");
  return rep;
}

// ---------------------------------------------------------------------------------------------------------------------
// Self-trained gates (plan/38 §8): one MLP for all judgement doors over the full labels of a person's own messages, a
// 2-feature stacker per door on [MLP score, regex hit], and per door the way that beat the regex on the held-out part.
// Typed arrays throughout: the number[][] code above is O(n²) in places and does not finish on 21k rows. Measured on the
// owner's GM (plan/38 §6, round seven): MLP + stacker won or tied the regex on every door with enough positives.
// ---------------------------------------------------------------------------------------------------------------------

export interface FullLabel {
  text: string;
  doors: string[];
}

/** A seeded order of `a` (Park–Miller): the same split on every run and every machine. */
export function seededShuffle<T>(a: T[], seed: number): T[] {
  let s = seed;
  const r = (): number => (s = (s * 48271) % 2147483647) / 2147483647;
  return a.map((x) => [r(), x] as const).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
}

/** The best-F1 threshold in one sweep over the sorted scores (ties: the higher threshold, fewer reminders). */
export function sweepThreshold(s: ArrayLike<number>, y: ArrayLike<number>): { t: number; f1: number } {
  const n = s.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => s[b] - s[a]);
  let P = 0;
  for (let i = 0; i < n; i++) P += y[i] ? 1 : 0;
  let tp = 0, fp = 0, best = Infinity, bestF = -1;
  for (let k = 0; k < n; k++) {
    if (y[idx[k]]) tp++; else fp++;
    if (k + 1 < n && s[idx[k + 1]] === s[idx[k]]) continue;
    const f = tp ? (2 * tp) / (2 * tp + fp + (P - tp)) : 0;
    if (f > bestF) { bestF = f; best = s[idx[k]]; }
  }
  return { t: best, f1: bestF < 0 ? 0 : bestF };
}

export interface Mlp {
  dim: number;
  hidden: number;
  out: number;
  /** dim × hidden, row-major by input */
  w1: Float32Array;
  b1: Float32Array;
  /** hidden × out */
  w2: Float32Array;
  b2: Float32Array;
}

/** Logits of one input row (length dim, starting at `off`) → out. */
export function mlpForward(m: Mlp, x: ArrayLike<number>, off = 0, h = new Float32Array(m.hidden), o = new Float32Array(m.out)): Float32Array {
  h.set(m.b1);
  for (let j = 0; j < m.dim; j++) {
    const v = x[off + j];
    if (v === 0) continue;
    const r = j * m.hidden;
    for (let k = 0; k < m.hidden; k++) h[k] += v * m.w1[r + k];
  }
  o.set(m.b2);
  for (let k = 0; k < m.hidden; k++) {
    const v = h[k] > 0 ? h[k] : 0;
    h[k] = v;
    if (v === 0) continue;
    const r = k * m.out;
    for (let c = 0; c < m.out; c++) o[c] += v * m.w2[r + c];
  }
  return o;
}

/** Logits of n rows, row-major n × out. */
export function mlpScores(m: Mlp, X: Float32Array, n: number): Float32Array {
  const out = new Float32Array(n * m.out), h = new Float32Array(m.hidden), o = new Float32Array(m.out);
  for (let i = 0; i < n; i++) out.set(mlpForward(m, X, i * m.dim, h, o), i * m.out);
  return out;
}

/** Column c of a row-major n × out matrix. */
export function column(s: ArrayLike<number>, n: number, out: number, c: number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = s[i * out + c];
  return v;
}

/**
 * One hidden ReLU layer shared by all outputs, sigmoid outputs, BCE with a positive weight √(neg/pos) per output, Adam,
 * batch 64. The epoch kept is the one with the best mean best-F1 on the validation rows (outputs with ≥ 5 positives there).
 */
export function fitMlp(
  X: Float32Array, Y: Uint8Array, n: number, dim: number, out: number,
  val: { X: Float32Array; Y: Uint8Array; n: number },
  opts: { hidden?: number; epochs?: number; rate?: number; seed?: number; onEpoch?: (ep: number, f: number) => void } = {},
): Mlp {
  const H = opts.hidden ?? 256, EPOCHS = opts.epochs ?? 20, LR = opts.rate ?? 1e-3, B1 = 0.9, B2 = 0.999, WD = 1e-4, BATCH = 64;
  let s = opts.seed ?? 12345;
  const rnd = (): number => (s = (s * 48271) % 2147483647) / 2147483647;
  const gauss = (): number => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const m: Mlp = {
    dim, hidden: H, out,
    w1: new Float32Array(dim * H).map(() => gauss() * Math.sqrt(2 / dim)), b1: new Float32Array(H),
    w2: new Float32Array(H * out).map(() => gauss() * Math.sqrt(1 / H)), b2: new Float32Array(out),
  };
  const P = [m.w1, m.b1, m.w2, m.b2];
  const G = P.map((p) => new Float32Array(p.length)), M1 = P.map((p) => new Float32Array(p.length)), M2 = P.map((p) => new Float32Array(p.length));
  const posW = new Float32Array(out);
  for (let c = 0; c < out; c++) {
    let p = 0;
    for (let i = 0; i < n; i++) p += Y[i * out + c];
    posW[c] = Math.sqrt((n - p) / Math.max(1, p));
  }
  const h = new Float32Array(H), o = new Float32Array(out), dz = new Float32Array(out), dh = new Float32Array(H);
  let step = 0, best = -1, keep = P.map((p) => Float32Array.from(p));
  for (let ep = 1; ep <= EPOCHS; ep++) {
    const order = seededShuffle(Array.from({ length: n }, (_, i) => i), 1000 + ep);
    for (let b = 0; b < n; b += BATCH) {
      for (const g of G) g.fill(0);
      const bs = Math.min(BATCH, n - b);
      for (let q = 0; q < bs; q++) {
        const i = order[b + q];
        mlpForward(m, X, i * dim, h, o);
        for (let c = 0; c < out; c++) {
          const y = Y[i * out + c], p = 1 / (1 + Math.exp(-o[c]));
          dz[c] = ((p - y) * (y ? posW[c] : 1)) / bs;
        }
        dh.fill(0);
        for (let k = 0; k < H; k++) {
          if (h[k] === 0) continue;
          const r = k * out;
          for (let c = 0; c < out; c++) { G[2][r + c] += h[k] * dz[c]; dh[k] += m.w2[r + c] * dz[c]; }
        }
        for (let c = 0; c < out; c++) G[3][c] += dz[c];
        const off = i * dim;
        for (let j = 0; j < dim; j++) {
          const v = X[off + j];
          if (v === 0) continue;
          const r = j * H;
          for (let k = 0; k < H; k++) G[0][r + k] += v * dh[k];
        }
        for (let k = 0; k < H; k++) G[1][k] += dh[k];
      }
      step++;
      const c1 = 1 - B1 ** step, c2 = 1 - B2 ** step;
      for (let p = 0; p < 4; p++) {
        const W = P[p], g0 = G[p], a = M1[p], v = M2[p], wd = p % 2 === 0 ? WD : 0;
        for (let z = 0; z < W.length; z++) {
          const g = g0[z] + wd * W[z];
          a[z] = B1 * a[z] + (1 - B1) * g;
          v[z] = B2 * v[z] + (1 - B2) * g * g;
          W[z] -= (LR * (a[z] / c1)) / (Math.sqrt(v[z] / c2) + 1e-8);
        }
      }
    }
    const sv = mlpScores(m, val.X, val.n);
    let sum = 0, cnt = 0;
    for (let c = 0; c < out; c++) {
      const ys = column(val.Y, val.n, out, c);
      if (ys.reduce((a, b) => a + b, 0) < 5) continue;
      sum += sweepThreshold(column(sv, val.n, out, c), ys).f1;
      cnt++;
    }
    const f = cnt ? sum / cnt : 0;
    opts.onEpoch?.(ep, f);
    if (f > best) { best = f; keep = P.map((p) => Float32Array.from(p)); }
  }
  keep.forEach((w, p) => P[p].set(w));
  return m;
}


/** Logistic regression on [standardised model score, regex hit], class-weighted, fit on the validation rows. */
export function fitStack(s: ArrayLike<number>, r: ArrayLike<number>, y: ArrayLike<number>, iters = 2000): Stack {
  const n = s.length;
  let pos = 0, mean = 0;
  for (let i = 0; i < n; i++) { pos += y[i] ? 1 : 0; mean += s[i] / n; }
  let v = 0;
  for (let i = 0; i < n; i++) v += (s[i] - mean) ** 2 / n;
  const sd = Math.sqrt(v) || 1, cwP = n / (2 * Math.max(1, pos)), cwN = n / (2 * Math.max(1, n - pos));
  let w0 = 0, w1 = 0, b = 0;
  for (let it = 0; it < iters; it++) {
    let g0 = 0, g1 = 0, gb = 0;
    for (let i = 0; i < n; i++) {
      const x0 = (s[i] - mean) / sd;
      const e = (1 / (1 + Math.exp(-(w0 * x0 + w1 * r[i] + b))) - (y[i] ? 1 : 0)) * (y[i] ? cwP : cwN);
      g0 += e * x0; g1 += e * r[i]; gb += e;
    }
    w0 -= (0.5 * g0) / n; w1 -= (0.5 * g1) / n; b -= (0.5 * gb) / n;
  }
  return { w0, w1, b, mean, sd };
}

/** A door uses the model only when it beat the regex on the held-out part by ≥ MIN_GAIN, with ≥ MIN_TEST_POSITIVES there. */
export const MIN_TEST_POSITIVES = 10;
export const MIN_GAIN = 0.05;
export function chooseMode(f1: { regex: number; text: number; stack: number }, testPositives: number): GateMode {
  if (testPositives < MIN_TEST_POSITIVES) return "regex";
  const m: GateMode = f1.stack >= f1.text ? "stack" : "text";
  return f1[m] - f1.regex >= MIN_GAIN ? m : "regex";
}

/**
 * Class-weighted logistic regression on sparse rows by SGD (positives weighted √(neg/pos), learning rate decaying per
 * epoch, a deterministic shuffle per epoch): the weights of one door over 2^bits hashed grams.
 */
export function fitTextDoor(
  X: Sparse[], y: ArrayLike<number>, bits = TEXT_BITS, opts: { epochs?: number; rate?: number; l2?: number } = {},
): { w: Float32Array; b: number } {
  const epochs = opts.epochs ?? 12, rate = opts.rate ?? 0.5, l2 = opts.l2 ?? 1e-6;
  const w = new Float32Array(1 << bits);
  let b = 0, pos = 0;
  for (let i = 0; i < y.length; i++) pos += y[i] ? 1 : 0;
  const wp = Math.sqrt((y.length - pos) / Math.max(1, pos));
  const order = Array.from(X.keys());
  for (let ep = 0; ep < epochs; ep++) {
    for (let i = order.length - 1; i > 0; i--) { const j = (i * 2654435761 + ep) % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const lr = rate / (1 + ep);
    for (const i of order) {
      const x = X[i], p = 1 / (1 + Math.exp(-(sdot(w, x) + b))), g = (p - (y[i] ? 1 : 0)) * (y[i] ? wp : 1);
      for (let k = 0; k < x.idx.length; k++) w[x.idx[k]] -= lr * (g * x.val[k] + l2 * w[x.idx[k]]);
      b -= lr * g;
    }
  }
  return { w, b };
}

export interface GateFitReport {
  labels: number;
  split: { fit: number; val: number; test: number };
  doors: GateDoor[];
  modelFile: string;
  reportFile: string;
  ms: number;
}

/**
 * Train the self-trained gates on every 01_raw/full-labels-*.jsonl: split 64 / 16 / 20 (fit / thresholds + stacker / test),
 * one text model per judgement door, per door the threshold and stacker on the validation rows, the three ways scored on
 * the test rows, the mode chosen by `chooseMode`. Writes 03_output/model-text.json (weights only for the doors that use
 * them) and the run's report.json.
 */
export function fitGates(opts: {
  dir?: string; bits?: number; epochs?: number;
  doors?: { part: string; dir?: string; re: string }[];
  onProgress?: (what: string) => void;
} = {}): GateFitReport {
  const t0 = Date.now();
  const dir = opts.dir ?? trainingDir();
  const bits = opts.bits ?? TEXT_BITS;
  const raw = join(dir, "01_raw");
  const files = existsSync(raw) ? readdirSync(raw).filter((n) => /^full-labels-.*\.jsonl$/.test(n)).sort() : [];
  if (!files.length) throw new Error("no full labels in 01_raw: run --prepare, --annotate --yes and --merge first");
  const seen = new Set<string>();
  const rows: FullLabel[] = [];
  for (const f of files) {
    for (const r of readFileSync(join(raw, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as FullLabel)) {
      if (seen.has(r.text)) continue;
      seen.add(r.text);
      rows.push(r);
    }
  }
  const doors = (opts.doors ?? doorsOf()).filter((d) => /^Rule_Keys_/.test(d.part));
  if (!doors.length) throw new Error("no judgement-rule door (Rule_Keys_* with a gate.json prompt) in HS");
  const data = seededShuffle(rows, 7);
  if (data.length < 50) throw new Error(`only ${data.length} labelled message(s): too few to train`);
  const nTest = Math.floor(data.length * 0.2), rest = data.slice(nTest), nFit = Math.floor(rest.length * 0.8);
  const test = data.slice(0, nTest), fit = rest.slice(0, nFit), val = rest.slice(nFit);
  // document frequency from the fit rows only: nothing of the held-out text reaches the model
  const cF = fit.map((r) => gramCounts(r.text, bits));
  const df = new Float32Array(1 << bits);
  for (const m of cF) for (const k of m.keys()) df[k]++;
  const idf = new Float32Array(1 << bits);
  for (let k = 0; k < idf.length; k++) idf[k] = Math.log((1 + fit.length) / (1 + df[k])) + 1;
  const XF = cF.map((m) => tfidf(m, idf));
  const XV = val.map((r) => tfidf(gramCounts(r.text, bits), idf)), XT = test.map((r) => tfidf(gramCounts(r.text, bits), idf));
  opts.onProgress?.(`training: fit ${fit.length} · val ${val.length} · test ${test.length} · ${doors.length} door(s)`);
  const rx = (rs: FullLabel[], re: string): Uint8Array => Uint8Array.from(rs.map((r) => (promptMatches(re, r.text) ? 1 : 0)));
  const ys = (rs: FullLabel[], part: string): Uint8Array => Uint8Array.from(rs.map((r) => (r.doors.includes(part) ? 1 : 0)));
  const sum = (a: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const out: GateDoor[] = doors.map((d) => {
    const yf = ys(fit, d.part), yv = ys(val, d.part), yt = ys(test, d.part);
    const m = fitTextDoor(XF, yf, bits, { epochs: opts.epochs });
    const sv = Float32Array.from(XV, (x) => sdot(m.w, x) + m.b), st = Float32Array.from(XT, (x) => sdot(m.w, x) + m.b);
    const rv = rx(val, d.re), rt = rx(test, d.re);
    const gold = Array.from(yt, (y) => (y ? 1 : 0) as 0 | 1);
    const f1 = (pred: (i: number) => boolean): number => score(gold.map((_, i) => pred(i)), gold).f1;
    const t = sweepThreshold(sv, yv).t;
    const k = fitStack(sv, rv, yv);
    const t2 = sweepThreshold(Array.from(sv, (s, i) => stackScore(k, s, rv[i])), yv).t;
    const f = { regex: f1((i) => rt[i] === 1), text: f1((i) => st[i] >= t), stack: f1((i) => stackScore(k, st[i], rt[i]) >= t2) };
    const posTest = sum(yt);
    const mode = chooseMode(f, posTest);
    opts.onProgress?.(`  ${d.part}: regex ${f.regex.toFixed(2)} · text ${f.text.toFixed(2)} · text+regex ${f.stack.toFixed(2)} -> ${mode}`);
    return {
      part: d.part, mode, threshold: mode === "stack" ? t2 : t, ...(mode === "stack" ? { stack: k } : {}),
      ruleHash: ruleHashOf(d.dir, d.part, d.re), positives: { train: sum(yf) + sum(yv), test: posTest }, f1: f,
      ...(mode === "regex" ? {} : { w: b64(m.w), b: m.b }),
    };
  });
  const model: GateModel = { version: 2, kind: "text-ngram", bits, trainedAt: new Date().toISOString(), labels: rows.length, idf: b64(idf), doors: out };
  const o3 = join(dir, "03_output");
  const run = join(o3, `run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(run, { recursive: true });
  const modelFile = join(o3, MODEL_FILE);
  writeFileSync(modelFile, JSON.stringify(model) + "\n", "utf8");
  const reportFile = join(run, "report.json");
  const brief = out.map((d) => ({ ...d, w: undefined }));
  const rep: GateFitReport = { labels: rows.length, split: { fit: fit.length, val: val.length, test: test.length }, doors: brief, modelFile, reportFile, ms: Date.now() - t0 };
  writeFileSync(reportFile, JSON.stringify({ ...rep, labelFiles: files }, null, 1) + "\n", "utf8");
  return rep;
}
