/**
 * Named SQL for the docs (harness) domain — the doc/section index. Same contract as `memory/store/queries.ts`
 * (02_RULES §Luật khi VIẾT "SQL — 1 CÁCH", plan/27 §2g): look here first, add ONE named entry, call it by name.
 */
export const Q = {
  docIdByPath: "SELECT id FROM doc WHERE project_root=? AND path=?",
  deleteDocSections: "DELETE FROM section WHERE doc_id=?",
} as const;
