// The labeled corpus for `memory bench --recall`: paraphrases of real messages of ONE store, anchored by (session, uuid),
// plus questions that store cannot answer. It describes that store's content, so it lives on the development machine only
// (`backend/test/recall-corpus.json`, kept out of the public repo like the gate's tests). A machine without it has no
// labeled corpus: the bench says so instead of pretending to have a result.
//
// Adding a query: read a real message, write the idea again in OTHER words (a `keyword` query keeps the exact words on
// purpose), then add one entry to the JSON file.

import { readFileSync } from "node:fs";

/** The query's class - recall is measured per class, because each is found by a different path (FTS word · trigram ·
 *  vector): a single recall number over a mix says nothing about the class that is failing. */
export type QueryKind = "prose" | "tool_use" | "tool_result" | "keyword";

export interface LabeledQuery {
  q: string;
  lang: string;
  /** The positive label: the target message. */
  session: string;
  uuid: string;
  /** Missing ⇒ `prose`. */
  kind?: QueryKind;
}

/** A question the store has NO answer to: a good recall returns nothing, or a clearly low score - never a confident list. */
export interface NegativeQuery {
  q: string;
  lang: string;
  /** Why the store surely has no answer - so nobody later takes it for a missing label. */
  why: string;
}

const FILE = new URL("../../backend/test/recall-corpus.json", import.meta.url);

function load(): { recall: LabeledQuery[]; negative: NegativeQuery[]; negativeHoldout: NegativeQuery[] } {
  try {
    const j = JSON.parse(readFileSync(FILE, "utf8")) as Partial<{ recall: LabeledQuery[]; negative: NegativeQuery[]; negativeHoldout: NegativeQuery[] }>;
    return { recall: j.recall ?? [], negative: j.negative ?? [], negativeHoldout: j.negativeHoldout ?? [] };
  } catch {
    return { recall: [], negative: [], negativeHoldout: [] };
  }
}

const corpus = load();
export const RECALL_CORPUS: LabeledQuery[] = corpus.recall;
export const NEGATIVE_CORPUS: NegativeQuery[] = corpus.negative;
/** A second set of negatives held out from tuning, so a threshold fitted on `NEGATIVE_CORPUS` is checked on unseen ones. */
export const NEGATIVE_HOLDOUT: NegativeQuery[] = corpus.negativeHoldout;

/** Is there a labeled corpus on this machine at all. */
export function corpusAvailable(): boolean {
  return RECALL_CORPUS.length > 0;
}

/** Queries by class - a missing `kind` means `prose`. */
export function corpusByKind(): Map<QueryKind, LabeledQuery[]> {
  const m = new Map<QueryKind, LabeledQuery[]>();
  for (const q of RECALL_CORPUS) {
    const k = q.kind ?? "prose";
    const list = m.get(k);
    if (list) list.push(q);
    else m.set(k, [q]);
  }
  return m;
}
