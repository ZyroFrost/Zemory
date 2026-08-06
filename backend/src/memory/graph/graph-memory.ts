// Graph ↔ MEMORY edges (plan 13 §4 "touches") — the layer a code-only tool can
// never build: which past SESSIONS touched a given file.
//
// Source: `session_digest.paths` (derived, 0 LLM) — the extractive digest already
// records the paths each session worked on. We normalize those to repo-relative
// ids so they line up with code-graph node ids, then invert into file → sessions.
//
// Deterministic + fail-open (HP điều 9): no memory / no digests → empty map, the
// code graph still stands on its own.

import { currentMemoryDb, openMemory } from "../db.js";

/** Windows/JSON-escaped paths arrive in many shapes — flatten to one form.
 *
 *  CỐ Ý KHÁC `core/config::projectKey` (đợt gom F4 2026-08-02 đã soi và giữ lại bản này):
 *  đây là id NODE của graph — phải là đường TƯƠNG ĐỐI, dấu `/`, để khớp id do code-graph
 *  sinh ra; còn `projectKey` là khoá so THƯ MỤC GỐC — tuyệt đối, dấu `\`. Hai concern khác
 *  nhau, gộp lại thì id node và khoá project sẽ đá nhau. */
const norm = (p: string): string =>
  p.replace(/\\+/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "").trim().toLowerCase();

export interface FileTouch {
  /** session ids that touched this file, newest-known first (dedup) */
  sessions: string[];
  /** how many distinct sessions touched it */
  count: number;
  /** Khớp bằng đường nào — `moved` là SUY LUẬN, không được vẽ như cạnh khai báo (điều 13). */
  match?: "exact" | "moved" | "none";
}

export interface TouchIndex {
  /** repo-relative file id (lowercase) → sessions that touched it */
  byFile: Map<string, FileTouch>;
  /** digests scanned for this project (0 = memory empty or project never seen) */
  digests: number;
}

/**
 * Build file → sessions index for ONE project root.
 *
 * Only digests whose meta.project_root matches the root are considered, so a
 * file path that coincidentally exists in another repo can't cross-link.
 */
export function buildTouchIndex(root: string, dbPath?: string): TouchIndex {
  const empty: TouchIndex = { byFile: new Map(), digests: 0 };
  const wantRoot = norm(root);
  let rows: { session_id: string; paths: string | null; meta: string | null }[];
  try {
    const db = openMemory(dbPath ?? currentMemoryDb());
    try {
      rows = db
        .prepare("SELECT session_id, paths, meta FROM session_digest WHERE paths IS NOT NULL AND paths != '[]'")
        .all() as typeof rows;
    } finally {
      db.close();
    }
  } catch {
    return empty; // memory optional — fail open
  }

  const byFile = new Map<string, FileTouch>();
  let digests = 0;
  for (const r of rows) {
    // Scope to this project: the digest's own project_root must match.
    let metaRoot = "";
    try {
      metaRoot = norm(String((JSON.parse(r.meta ?? "{}") as { project_root?: string }).project_root ?? ""));
    } catch {
      /* unparsable meta → treat as unscoped, skip */
    }
    if (!metaRoot) continue;
    // Same repo on ANOTHER machine lives at a different absolute path
    // (D:/zyro/tool/zemory vs d:/work_study/.../zemory), so an exact-root match
    // alone would drop every cross-machine session. Fall back to the project
    // FOLDER NAME, which is what actually identifies the repo across hosts.
    const sameProject = metaRoot === wantRoot || metaRoot.split("/").pop() === wantRoot.split("/").pop();
    if (!sameProject) continue;

    let paths: unknown;
    try {
      paths = JSON.parse(r.paths ?? "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(paths)) continue;
    digests++;

    for (const raw of paths) {
      if (typeof raw !== "string" || !raw) continue;
      const p = norm(raw);
      // Strip THAT session's own root (may differ from ours across machines).
      if (!p.startsWith(metaRoot + "/")) continue;
      const rel = p.slice(metaRoot.length + 1);
      if (!rel || rel.indexOf(".") < 0) continue; // folders/binaries without an ext carry little signal
      const cur = byFile.get(rel) ?? { sessions: [], count: 0 };
      if (!cur.sessions.includes(r.session_id)) {
        cur.sessions.push(r.session_id);
        cur.count = cur.sessions.length;
      }
      byFile.set(rel, cur);
    }
  }
  return { byFile, digests };
}

/**
 * Sessions that touched one file id (graph node id). Case-insensitive.
 *
 * HAI TẦNG khớp, và tầng hai PHẢI gắn nhãn (HP điều 13 — suy luận không được giả dạng
 * khai báo):
 *  ① `exact` — đường trong digest trùng đúng id node.
 *  ② `moved` — đường trong digest là ĐUÔI của id node (`src/cli.ts` ⊂ `backend/src/cli.ts`).
 *
 * Vì sao cần tầng ②, đo thật trên repo này 2026-08-06: touch index có 65 file, node graph
 * có 174, **giao nhau = 0**. Không phải index hỏng — mà digest ghi đường của BỐ CỤC CŨ
 * (`src/` trước khi dời sang `backend/src/` ngày 08/07; `docs/agent/01_rules.md` trước lần
 * đánh số lại). Lịch sử phiên là thứ KHÔNG viết lại được (điều 3: digest là dẫn xuất của
 * transcript gốc), nên hoặc chấp nhận 0% mãi mãi, hoặc khớp lại lúc ĐỌC. Chọn cách hai.
 *
 * Khớp theo ĐUÔI chứ không theo tên file trần: `db.ts` trần sẽ đụng mọi `db.ts` trong repo,
 * còn `src/memory/db.ts` thì gần như chỉ có một đường ra. Vẫn là suy luận — nên có nhãn, và
 * người gọi được quyền bỏ nếu chỉ muốn cạnh chắc chắn.
 */
export function touchesFor(idx: TouchIndex, fileId: string, opts: { includeMoved?: boolean } = {}): FileTouch {
  const id = fileId.toLowerCase();
  const exact = idx.byFile.get(id);
  if (exact) return { ...exact, match: "exact" };
  if (opts.includeMoved === false) return { sessions: [], count: 0, match: "none" };

  const sessions: string[] = [];
  for (const [key, t] of idx.byFile) {
    // Đuôi phải cắt đúng ranh giới thư mục: `rc/cli.ts` không được coi là đuôi của
    // `src/cli.ts`, nếu không thì mọi thứ trùng vài ký tự cuối đều khớp.
    if (!id.endsWith(`/${key}`)) continue;
    for (const s of t.sessions) if (!sessions.includes(s)) sessions.push(s);
  }
  return sessions.length ? { sessions, count: sessions.length, match: "moved" } : { sessions: [], count: 0, match: "none" };
}
