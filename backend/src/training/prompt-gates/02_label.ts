// Step 02 of the prompt-gates model (plan/38 §4 ①, HS slot Backend_174_Training): draft labels for a person to review. Two
// sources, joined so the corpus does not lean to the regex: the regex of every reminder door (the matcher the hook runs) and a
// kNN over the doors' own example sentences, embedded on the SAME path the hook will use (embedQuery, current profile). The
// draft never becomes a label by itself: 01_raw keeps only reviewed labels. Output: 02_processing/draft-<pull hash>.jsonl and a
// review sheet (every message with a draft label + a random sample of the rest).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promptMatches } from "../../docs/harness-names.js";
import { STORE_DIR } from "../../docs/store.js";
import { currentEmbedProfile, embedQuery } from "../../memory/embed.js";
import { trainingDir, type PulledMessage } from "./01_pull.js";

export interface Door {
  /** The part that owns the door (its folder name), e.g. Rule_Keys_08_ClarifyFirst. */
  part: string;
  /** The part's folder in HS (its rule or skill file sits there as `<part>.md`). */
  dir?: string;
  re: string;
  block: string[];
  pass: string[];
}

/** Every reminder door of HS: the laws and the skills whose gate.json carries a `prompt`. */
export function doorsOf(storeDir = STORE_DIR): Door[] {
  const out: Door[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      // only the laws and the skills are walked, so the retired parts (Archive/, at the root of HS) never become doors
      if (!e.isDirectory()) continue;
      const d = join(dir, e.name);
      const g = join(d, "gate.json");
      if (/^(Rule|Cons|Skill)_/.test(e.name) && existsSync(g)) {
        try {
          const j = JSON.parse(readFileSync(g, "utf8"));
          const said = (xs: unknown): string[] => (Array.isArray(xs) ? xs : []).map((x) => String((x as { prompt?: unknown })?.prompt ?? "")).filter(Boolean);
          if (j?.prompt?.re) out.push({ part: e.name, dir: d, re: String(j.prompt.re), block: said(j.block), pass: said(j.pass) });
        } catch {
          /* a gate.json that does not parse is the store gate's to report */
        }
        continue;
      }
      walk(d, depth + 1);
    }
  };
  walk(join(storeDir, "01_LAW"), 0);
  walk(join(storeDir, "03_SKILLS"), 0);
  return out.sort((a, b) => a.part.localeCompare(b.part));
}

/** The doors whose regex the text trips (the hook's own matcher). */
export function regexLabels(text: string, doors: Door[]): string[] {
  return doors.filter((d) => promptMatches(d.re, text)).map((d) => d.part);
}

const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);

export interface KnnScore {
  part: string;
  /** Highest cosine to the door's block sentences. */
  block: number;
  /** block minus the highest cosine to its pass sentences (0 when it has none). */
  margin: number;
}

/** Score a message vector against every door; the vectors are unit length, so the dot product is the cosine. */
export function knnScores(v: number[], protos: Map<string, { block: number[][]; pass: number[][] }>): KnnScore[] {
  const out: KnnScore[] = [];
  for (const [part, p] of protos) {
    if (!p.block.length) continue;
    const b = Math.max(...p.block.map((x) => dot(v, x)));
    const n = p.pass.length ? Math.max(...p.pass.map((x) => dot(v, x))) : 0;
    out.push({ part, block: Number(b.toFixed(4)), margin: Number((b - n).toFixed(4)) });
  }
  return out.sort((a, b) => b.margin - a.margin);
}

/** A kNN draft label: close enough to the door's examples, and closer to them than to its counter-examples. */
export const KNN_MIN_BLOCK = 0.6;
export const KNN_MIN_MARGIN = 0.02;
export function knnLabels(scores: KnnScore[]): string[] {
  return scores.filter((s) => s.block >= KNN_MIN_BLOCK && s.margin >= KNN_MIN_MARGIN).map((s) => s.part);
}

export interface DraftRow {
  id: number | string;
  project: string;
  text: string;
  regex: string[];
  knn: KnnScore[];
  /** The doors the kNN drafts (over every door, not only the three kept in `knn`). */
  knnDraft: string[];
  draft: string[];
  /** Labels already confirmed (the cases moved out of the agent memory); empty for a pulled message. */
  labels?: string[];
}

/** The newest pull file of 01_raw (the file name carries its time). */
export function latestPull(dir = trainingDir()): string | null {
  const raw = join(dir, "01_raw");
  if (!existsSync(raw)) return null;
  const f = readdirSync(raw).filter((n) => /^pull-.*\.jsonl$/.test(n)).sort().pop();
  return f ? join(raw, f) : null;
}

const readJsonl = <T>(f: string): T[] => readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as T);

export interface LabelResult {
  pull: string;
  messages: number;
  doors: number;
  profile: string;
  withRegex: number;
  withKnn: number;
  withDraft: number;
  confirmed: number;
  draftFile: string;
  reviewFile: string;
  ms: number;
}

/** Draft-label the newest pull (and the confirmed memory cases); write the draft and the review sheet into 02_processing. */
export async function label(opts: { dir?: string; sample?: number; onProgress?: (done: number, total: number) => void } = {}): Promise<LabelResult> {
  const t0 = Date.now();
  const dir = opts.dir ?? trainingDir();
  const pull = latestPull(dir);
  if (!pull) throw new Error("no pull in 01_raw: run step 01 first");
  const pulled = readJsonl<PulledMessage>(pull);
  const cases = existsSync(join(dir, "01_raw"))
    ? readdirSync(join(dir, "01_raw")).filter((n) => /^memory-cases-.*\.jsonl$/.test(n)).flatMap((n) => readJsonl<{ text: string; labels: string[]; source: string }>(join(dir, "01_raw", n)))
    : [];
  const doors = doorsOf();
  const profile = currentEmbedProfile();
  const vec = async (t: string): Promise<number[] | null> => embedQuery(t, profile);

  const protos = new Map<string, { block: number[][]; pass: number[][] }>();
  for (const d of doors) {
    const block = (await Promise.all(d.block.map(vec))).filter((v): v is number[] => Boolean(v));
    const pass = (await Promise.all(d.pass.map(vec))).filter((v): v is number[] => Boolean(v));
    protos.set(d.part, { block, pass });
  }

  const items: { id: number | string; project: string; text: string; labels?: string[] }[] = [
    ...pulled.map((m) => ({ id: m.id, project: m.project, text: m.text })),
    ...cases.map((c, i) => ({ id: `case-${i + 1}`, project: c.source, text: c.text, labels: c.labels })),
  ];
  const rows: DraftRow[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const v = await vec(it.text);
    const knn = v ? knnScores(v, protos) : [];
    const rx = regexLabels(it.text, doors);
    const kn = knnLabels(knn);
    rows.push({ ...it, regex: rx, knn: knn.slice(0, 3), knnDraft: kn, draft: [...new Set([...rx, ...kn])].sort() });
    if (opts.onProgress && (i + 1) % 200 === 0) opts.onProgress(i + 1, items.length);
  }

  const proc = join(dir, "02_processing");
  mkdirSync(proc, { recursive: true });
  const tag = (pull.match(/-([0-9a-f]{12})\.jsonl$/) ?? [])[1] ?? "pull";
  const draftFile = join(proc, `draft-${tag}.jsonl`);
  writeFileSync(draftFile, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

  // review sheet: every row with a draft label or a confirmed label, plus a seeded random sample of the rest
  const flagged = rows.filter((r) => r.draft.length || r.labels?.length);
  const rest = rows.filter((r) => !r.draft.length && !r.labels?.length);
  let seed = 7;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sample = [...rest].sort(() => rnd() - 0.5).slice(0, opts.sample ?? 300);
  const cell = (s: string): string => s.replace(/\s+/g, " ").replace(/\t/g, " ");
  const sheet = ["id\ttext\tregex\tknn_top\tdraft\tconfirmed\treviewed (edit: the doors this message SHOULD remind; empty = none)"];
  for (const r of [...flagged, ...sample]) {
    sheet.push([r.id, cell(r.text), r.regex.join(","), r.knn.map((k) => `${k.part}:${k.block}/${k.margin}`).join(","), r.draft.join(","), (r.labels ?? []).join(","), (r.labels ?? r.draft).join(",")].join("\t"));
  }
  const reviewFile = join(proc, `review-${tag}.tsv`);
  writeFileSync(reviewFile, sheet.join("\n") + "\n", "utf8");

  return {
    pull,
    messages: pulled.length,
    doors: doors.length,
    profile,
    withRegex: rows.filter((r) => r.regex.length).length,
    withKnn: rows.filter((r) => r.knnDraft.length).length,
    withDraft: flagged.length,
    confirmed: cases.length,
    draftFile,
    reviewFile,
    ms: Date.now() - t0,
  };
}
