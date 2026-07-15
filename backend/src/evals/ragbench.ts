// RAG benchmark (docs/plan/05_rag.md, Giai đoạn D — the gate). Question: does
// hybrid (FTS + vector) beat FTS-only? Uses a small LABELED corpus — paraphrase
// queries with KNOWN answers, deliberately worded WITHOUT keyword overlap — so
// the gate is reproducible without the (unlabeled) real corpus. Vocabulary
// mismatch is exactly where keyword FTS fails and semantic vector should lift.
//
// Gate rule: turn hybrid on by default only if hybrid recall ≥ FTS recall here
// AND on a real-corpus spot check; otherwise keep FTS-only.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openBrain } from "../brain/db.js";
import { search, searchHybrid } from "../brain/search.js";
import { embedPending } from "../brain/vectors.js";

// doc id = insertion order (1-based)
const DOCS: string[] = [
  "to reset your database password run the migration and update the connection string", // 1
  "preheat the oven to 180 degrees and bake the chocolate cake for forty minutes", // 2
  "the cat curled up on the warm windowsill enjoying the afternoon sun", // 3
  "configure the nginx reverse proxy to forward requests to the upstream node server", // 4
  "the quarterly revenue grew twelve percent driven by enterprise subscriptions", // 5
  "git rebase interactive lets you squash and reorder commits before pushing", // 6
  "the hiking trail climbs steeply through pine forest to a granite summit", // 7
  "use react useEffect to fetch data after the component mounts and clean up on unmount", // 8
];

interface Query {
  q: string;
  expect: number;
}
const QUERIES: Query[] = [
  { q: "rotate the postgres login secret and apply schema changes", expect: 1 },
  { q: "how long to cook a sponge dessert in a hot oven", expect: 2 },
  { q: "a kitten relaxing in the sunshine beside the glass pane", expect: 3 },
  { q: "set up a load balancer routing traffic to the backend service", expect: 4 },
  { q: "company earnings rose thanks to large business customer plans", expect: 5 },
  { q: "combine several version-control checkpoints into one before publishing", expect: 6 },
  { q: "a steep walk up a mountain through evergreen woodland", expect: 7 },
  { q: "trigger a side effect in a functional UI component on render", expect: 8 },
];

const K = 3;

export interface QueryResult {
  q: string;
  expect: number;
  ftsTop: number | null;
  hybridTop: number | null;
  ftsFound: boolean;
  hybridFound: boolean;
  rerankTop: number | null;
  rerankFound: boolean;
}
export interface BenchResult {
  n: number;
  ftsHit: number;
  hybridHit: number;
  ftsRecall: number;
  hybridRecall: number;
  ftsMsAvg: number;
  hybridMsAvg: number;
  embedded: number;
  /** Whether the rerank lane was measured (opts.rerank). */
  rerankRan: boolean;
  rerankHit: number;
  rerankRecall: number;
  rerankMsAvg: number;
  perQuery: QueryResult[];
}

/**
 * Run the labeled RAG benchmark on a fresh temp brain (or a given dbPath).
 * `rerank: true` adds a third lane (hybrid + cross-encoder) — off by default so
 * `npm test` never downloads the reranker model.
 */
export async function runRagBench(opts: { dbPath?: string; rerank?: boolean } = {}): Promise<BenchResult> {
  const dbPath = opts.dbPath ?? join(mkdtempSync(join(tmpdir(), "zemory-bench-")), "bench.db");
  const db = openBrain(dbPath);
  db.prepare("INSERT OR IGNORE INTO sessions(id, source, project_root, message_count) VALUES (?,?,?,?)").run(
    "bench", "bench", "C:\\bench", DOCS.length,
  );
  if ((db.prepare("SELECT count(*) c FROM messages").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO messages(session_id, uuid, role, content, timestamp) VALUES (?,?,?,?,?)");
    DOCS.forEach((t, i) => ins.run("bench", `d${i + 1}`, "user", t, `2026-06-26T00:0${i}:00Z`));
  }
  db.close();

  const { embedded } = await embedPending({ dbPath });

  const inTopK = (hits: { id: number }[], expect: number): boolean =>
    hits.slice(0, K).some((h) => h.id === expect);

  const wantRerank = opts.rerank === true;
  let ftsHit = 0;
  let hybridHit = 0;
  let rerankHit = 0;
  let ftsMs = 0;
  let hybridMs = 0;
  let rerankMs = 0;
  const perQuery: QueryResult[] = [];
  for (const { q, expect } of QUERIES) {
    let t = Date.now();
    const fts = search(q, { dbPath, all: true, limit: K });
    ftsMs += Date.now() - t;
    t = Date.now();
    const hyb = await searchHybrid(q, { dbPath, all: true, limit: K });
    hybridMs += Date.now() - t;
    let rer = hyb;
    if (wantRerank) {
      t = Date.now();
      rer = await searchHybrid(q, { dbPath, all: true, limit: K, rerank: true });
      rerankMs += Date.now() - t;
    }
    const ftsFound = inTopK(fts, expect);
    const hybridFound = inTopK(hyb, expect);
    const rerankFound = inTopK(rer, expect);
    if (ftsFound) ftsHit++;
    if (hybridFound) hybridHit++;
    if (rerankFound) rerankHit++;
    perQuery.push({
      q,
      expect,
      ftsTop: fts[0]?.id ?? null,
      hybridTop: hyb[0]?.id ?? null,
      ftsFound,
      hybridFound,
      rerankTop: rer[0]?.id ?? null,
      rerankFound,
    });
  }
  const n = QUERIES.length;
  return {
    n,
    ftsHit,
    hybridHit,
    ftsRecall: ftsHit / n,
    hybridRecall: hybridHit / n,
    ftsMsAvg: ftsMs / n,
    hybridMsAvg: hybridMs / n,
    embedded,
    rerankRan: wantRerank,
    rerankHit,
    rerankRecall: rerankHit / n,
    rerankMsAvg: wantRerank ? rerankMs / n : 0,
    perQuery,
  };
}
