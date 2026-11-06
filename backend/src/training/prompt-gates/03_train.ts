// Step 03 of the prompt-gates model (plan/38 §4 ②③, HS slot Backend_174_Training): train and compare, per door, three
// ways of deciding "this message should fire the door": the door's regex (the baseline the hook runs today), a kNN over the
// door's labelled messages, a logistic regression over the same vectors, and a linear SVM over the centred vectors. Each
// is measured by stratified k-fold cross-validation on the reviewed labels; thresholds are picked on the training folds
// only. Nothing here touches the hook or HS: the report decides, the person approves, step 04 exports.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentEmbedProfile, embedQuery } from "../../memory/embed.js";
import { trainingDir } from "./01_pull.js";
import { doorsOf, regexLabels } from "./02_label.js";

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
  const vecs = new Map<string, number[]>();
  for (const t of new Set(rows.map((r) => r.text))) {
    const v = await embedQuery(t, profile);
    if (v) vecs.set(t, v);
  }
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
