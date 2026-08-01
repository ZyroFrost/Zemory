// Changelog INDEX — the .md (06_CHANGES.md) is the SOURCE (FILE WINS); the DB
// changelog rows are a DERIVED, read-only search index rebuilt from the .md by
// `reindex`. Nothing here writes the .md — entries are added by editing the file
// directly; `import` (reindex) reseeds the search index from it.

import { readFileSync } from "node:fs";
import { normalizeRoot } from "../core/config.js";
import { currentMemoryDb, openMemory } from "../memory/db.js";

const FENCE = /^[ \t]*(```|~~~)/;
const H2 = /^## (.*?)[ \t]*$/;
const DATE = /^\[([^\]]+)\][ \t]*[—-]*[ \t]*(.*)$/;

/** Ngày viết KHÔNG ngoặc: `## 2026-07-28 — tiêu đề`.
 *
 *  Vì sao cần (đo 2026-07-29): `PBI_SasinFlow_Maintain` viết changelog theo dạng này —
 *  **16 head `##`, 0 head dạng `[ngày]`** — nên `DATE` trượt sạch, cả file rơi vào nhánh
 *  legacy "nhận mọi `##`", và các heading NẰM TRONG THÂN entry cũng bị đếm thành entry với
 *  `date=NULL`. Hậu tố chữ (`2026-07-28m`) là quy ước của zemory khi một ngày có nhiều
 *  entry, nên cho phép. Bắt buộc có dấu phân cách hoặc hết dòng sau ngày, để `## 2026 kế
 *  hoạch` không bị nhận là entry. */
const DATE_BARE = /^(\d{4}-\d{2}-\d{2}[a-z]?)(?:[ \t]*[—–-]+[ \t]*(.*)|[ \t]*)$/;

/** Dấu hiệu "file này LÀ changelog": H1 có chữ Change Log.
 *
 *  Đo trên 5 repo thật + 2 template: **100%** changelog có H1 chứa `Change Log`
 *  (`# Change Log` · `# <PROJECT> — Change Log`), còn plan/TODO thì không. Cổng này chặn
 *  đúng ca đã xảy ra: trỏ `importChangelog` vào `plan/01_legacy_topology.md` khiến mỗi
 *  `##` (bảng SQL, "Chưa dò được"…) thành một entry. */
const H1_CHANGELOG = /^#[ \t]+.*change[ \t]*log/im;

export interface ChEntry {
  date: string | null;
  title: string;
  body: string;
}

/** Split a changelog markdown into dated entries (one per `## ` heading).
 *  CRLF-safe: see the normEol guard in markdown.ts — a Windows-written file
 *  used to parse as ZERO entries here. */
export function parseChangelog(input: string): ChEntry[] {
  const text = input.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const offsets: number[] = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1;
  }
  let inFence = false;
  const all: { idx: number; h: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = H2.exec(lines[i]);
    if (m) all.push({ idx: i, h: m[1] });
  }
  // Head của entry = `## [<ngày>] — tiêu đề` HOẶC `## <ngày> — tiêu đề`. Một `## Foo`
  // trần nằm trong thân entry là BODY, không phải entry mới.
  //
  // Nhánh legacy (nhận mọi `##`) giữ lại cho changelog cũ chưa đánh ngày, nhưng nay CÓ
  // CỔNG: chỉ chạy khi file thật sự là changelog (H1 có "Change Log"). Không cổng thì bất
  // kỳ file .md nào bị trỏ vào `importChangelog` cũng sinh ra entry rác — đúng chuyện đã
  // xảy ra với `plan/01_legacy_topology.md` (6 entry `date=NULL` mang thân là bảng SQL).
  const dated = all.filter((x) => DATE.test(x.h) || DATE_BARE.test(x.h));
  const heads = dated.length > 0 ? dated : H1_CHANGELOG.test(text) ? all : [];
  const entries: ChEntry[] = [];
  for (let k = 0; k < heads.length; k++) {
    const start = offsets[heads[k].idx];
    const end = k + 1 < heads.length ? offsets[heads[k + 1].idx] : text.length;
    const block = text.slice(start, end);
    const nl = block.indexOf("\n");
    const body = (nl < 0 ? "" : block.slice(nl + 1)).replace(/\s+$/, "");
    const dm = DATE.exec(heads[k].h) ?? DATE_BARE.exec(heads[k].h);
    entries.push({ date: dm ? dm[1] : null, title: (dm ? dm[2] : heads[k].h) ?? "", body });
  }
  return entries;
}

/** Reindex a changelog .md into the DB search index (read-only; never writes the
 *  file). Default MERGE (add entries the index lacks, by date+title); `replace`
 *  wipes this project's changelog rows and reseeds — used by `reindex` so the
 *  index mirrors the file exactly (FILE WINS).
 *
 *  `archived` stamps the rows as cold storage. The archive file
 *  (docs/agent/archive/06_CHANGES.md) is a SOURCE file like any other — git-tracked,
 *  rebuildable-from — it just sits outside the per-session read. Indexing it is
 *  ordinary derived-index behaviour (điều 3), and it is what plan/02 §3 has always
 *  described: "changelog search giữ cả active lẫn archived để quyết định cũ vẫn
 *  recall được". Measured 2026-07-28: that promise was not being kept — the index
 *  held 12 rows, all archived=0, while 56 archived entries were unreachable. */
export function importChangelog(
  absPath: string,
  projectRoot: string,
  dbPath = currentMemoryDb(),
  opts: { replace?: boolean; archived?: boolean } = {},
): number {
  projectRoot = normalizeRoot(projectRoot); // canonical index key — see normalizeRoot
  const entries = parseChangelog(readFileSync(absPath, "utf8"));
  const db = openMemory(dbPath);
  const flag = opts.archived ? 1 : 0;
  try {
    const tx = db.transaction(() => {
      // `replace` only ever clears rows of the SAME tier, so reseeding the active
      // file can never wipe the archived rows (and vice-versa) — that cross-tier
      // wipe is exactly how the archived history disappeared before.
      if (opts.replace)
        db.prepare("DELETE FROM changelog WHERE project_root=? AND archived=?").run(projectRoot, flag);
      const exists = db.prepare(
        "SELECT 1 AS ok FROM changelog WHERE project_root=? AND date IS ? AND title=?",
      );
      const ins = db.prepare(
        "INSERT INTO changelog (project_root, date, title, body, archived, created_at) VALUES (?,?,?,?,?,?)",
      );
      const now = new Date().toISOString();
      let added = 0;
      for (const e of entries) {
        if (!opts.replace && exists.get(projectRoot, e.date, e.title)) continue;
        ins.run(projectRoot, e.date, e.title, e.body, flag, now);
        added++;
      }
      return added;
    });
    const added = tx();
    linkSupersedes(db, projectRoot);
    return added;
  } finally {
    db.close();
  }
}

/** Fill `supersedes_id` for entries that reverse an older decision.
 *
 *  The column and its renderer shipped long ago; the PARSER never did. Measured
 *  2026-08-02 on this repo: 41 entries carry a `🔄 Supersede:` clause and **0 of 204
 *  rows had the link set** — so the relation existed only in prose, and a search that
 *  surfaced the OLD decision gave no hint it had been reversed. That is the worst
 *  shape of wrong: the reader gets a real, confidently-worded ruling that is dead.
 *
 *  Linking is DETERMINISTIC and DELIBERATELY LOW-YIELD — no guessing (điều 6, "chưa xác
 *  minh thì chưa phải sự thật"). Measured on this repo's 42 supersede clauses: only 11
 *  name a date at all (31 are pure prose), and quoting the old TITLE resolves just 2 —
 *  authors quote the decision's wording, not the heading. So most clauses are simply not
 *  machine-resolvable, and the honest result is 4 solid links, not 42 plausible ones.
 *  Two guards earned by real wrong answers during this build: a bare `2026-07-29` is
 *  rejected when suffixed siblings exist (it linked Phase 3 to the wrong 29/07 entry),
 *  and a target must be OLDER than the entry citing it (29e ↔ 29f formed a cycle).
 *
 *  To get a link, the clause must name the target's exact dated key (`2026-07-29l`);
 *  `session-close` now requires that form. Runs across BOTH tiers: the reversal usually
 *  lives in the active file while the ruling it kills has already been archived. */
function linkSupersedes(db: ReturnType<typeof openMemory>, projectRoot: string): void {
  const rows = db
    .prepare("SELECT id, date, body FROM changelog WHERE project_root=? AND body LIKE '%Supersede%'")
    .all(projectRoot) as { id: number; date: string | null; body: string }[];
  if (!rows.length) return;
  const byDate = new Map<string, number[]>();
  for (const r of db
    .prepare("SELECT id, date FROM changelog WHERE project_root=? AND date IS NOT NULL")
    .all(projectRoot) as { id: number; date: string }[]) {
    const list = byDate.get(r.date) ?? [];
    list.push(r.id);
    byDate.set(r.date, list);
  }
  const upd = db.prepare("UPDATE changelog SET supersedes_id=? WHERE id=?");
  const tx = db.transaction(() => {
    for (const r of rows) {
      // Only the supersede CLAUSE, not the whole entry: a body mentions other dates in
      // passing, and those must not be mistaken for the thing being reversed.
      const m = /Supersede:?\*{0,2}([\s\S]{0,400})/.exec(r.body);
      if (!m) continue;
      const clause = m[1];
      // The key is the entry's DATED HEADING (`2026-07-29l`), never a `#id`: ids are
      // assigned by the index and change on every `reindex`, so writing one into the .md
      // would put an unstable reference in the SOURCE (điều 3 — the file is the truth).
      //
      // ① a date that resolves to EXACTLY ONE entry. A bare `2026-07-29` is REJECTED when
      //    suffixed siblings exist (…29e, …29f): measured 2026-08-02, that bare form matched
      //    the one unsuffixed row and produced a confidently WRONG link (Phase 3 → "Hạ ngưỡng
      //    archive" instead of the cowork-only ruling it actually reversed). Near-miss keys
      //    are worse than no key: the reader trusts them.
      const dates = [...new Set((clause.match(/\d{4}-\d{2}-\d{2}[a-z]?/g) ?? []).filter((d) => d !== r.date))];
      const resolved = dates.filter((d) => {
        const exact = byDate.get(d) ?? [];
        if (exact.length !== 1) return false;
        if (/[a-z]$/.test(d)) return true; // suffixed ⇒ already unique by construction
        const siblings = [...byDate.keys()].filter((k) => k !== d && k.startsWith(d));
        return siblings.length === 0; // bare date + suffixed siblings ⇒ ambiguous, skip
      });
      // ② direction guard: a supersede points BACKWARD. Without it the linker produced a
      //    CYCLE on this repo (29e ↔ 29f each "superseding" the other) — a body that merely
      //    mentions a neighbouring entry's date was read as reversing it.
      const older = resolved.filter((d) => (r.date ? d < r.date : true));
      const targets = [...new Set(older.flatMap((d) => byDate.get(d) ?? []))].filter((id) => id !== r.id);
      if (targets.length === 1) upd.run(targets[0], r.id);
    }
  });
  tx();
}

export interface ChRow {
  id: number;
  date: string | null;
  title: string;
  archived: number;
  supersedes_id: number | null;
}

export function listEntries(projectRoot: string, dbPath = currentMemoryDb()): ChRow[] {
  const db = openMemory(dbPath);
  try {
    return db
      .prepare(
        "SELECT id, date, title, archived, supersedes_id FROM changelog WHERE project_root=? ORDER BY date DESC, id DESC",
      )
      .all(projectRoot) as ChRow[];
  } finally {
    db.close();
  }
}

export function searchChangelog(query: string, opts: { project?: string; limit?: number; dbPath?: string } = {}): { id: number; date: string | null; title: string; snippet: string; supersededBy?: number; supersededDate?: string | null }[] {
  const q = query.trim();
  if (!q) return [];
  const db = openMemory(opts.dbPath ?? currentMemoryDb());
  try {
    const terms = q.toLowerCase().split(/\s+/).map((t) => t.replace(/["()*:^]/g, "")).filter(Boolean);
    if (!terms.length) return [];
    const match = terms.map((t) => `"${t}"`).join(" ");
    try {
      return db
        .prepare(
          `SELECT c.id, c.date, c.title, snippet(changelog_fts, 1, '[', ']', '…', 12) AS snippet
           FROM changelog_fts f JOIN changelog c ON c.id=f.rowid
           ${opts.project ? "WHERE c.project_root=@proj AND" : "WHERE"} changelog_fts MATCH @m
           ORDER BY bm25(changelog_fts, 5.0, 1.0) LIMIT @lim`,
        )
        .all({ proj: opts.project, m: match, lim: opts.limit ?? 10 })
        .map((r: any) => {
          // A hit that a LATER entry reversed must say so. Without this the reader gets a
          // dead ruling worded as confidently as a live one — the exact failure measured
          // on 2026-08-02 (search returned the 29/07 "cowork-only" ruling with no sign
          // that 31/07 had overturned it).
          const rev = db
            .prepare("SELECT id, date FROM changelog WHERE supersedes_id=? ORDER BY date DESC LIMIT 1")
            .get(r.id) as { id: number; date: string | null } | undefined;
          return rev ? { ...r, supersededBy: rev.id, supersededDate: rev.date } : r;
        }) as any;
    } catch {
      return [];
    }
  } finally {
    db.close();
  }
}
