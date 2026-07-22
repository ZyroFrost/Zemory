import { search } from "../memory/search.js";
import type { Module } from "../core/types.js";
import { searchChangelog } from "../docs/changelog.js";
import { searchSections } from "../docs/plan.js";

interface SearchPayload {
  query: string;
  all?: boolean;
  limit?: number;
}

export const searchKeyword: Module = {
  name: "keyword",
  provides: "search",
  run(ctx, op, payload) {
    const input = payload as SearchPayload;
    if (!input?.query) throw new Error("Search requires a query.");
    const project = input.all ? undefined : ctx.projectRoot;
    if (op === "memory") return search(input.query, { project, all: input.all, limit: input.limit });
    if (op === "plan") return searchSections(input.query, { project, limit: input.limit });
    if (op === "changelog") return searchChangelog(input.query, { project, limit: input.limit });
    throw new Error(`Unsupported search operation: ${op}`);
  },
  check(ctx) {
    searchSections("the", { project: ctx.projectRoot, limit: 1 });
    return { ok: true, detail: "FTS5 word + trigram provider ready" };
  },
};
