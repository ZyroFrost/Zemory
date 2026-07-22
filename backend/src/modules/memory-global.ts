import { memoryInfo, memorySummary, scan } from "../memory/ingest.js";
import { getMessage, recall, search } from "../memory/search.js";
import type { Module } from "../core/types.js";

interface SearchPayload {
  query: string;
  all?: boolean;
  limit?: number;
}

// The `memory` capability: the global memory — cross-agent session capture and
// recall, backed by ~/.zemory/global_memory.db.
export const memoryGlobal: Module = {
  name: "global",
  provides: "memory",
  hooks: ["session_start"],
  run(ctx, op, payload) {
    if (op === "scan") return scan((payload ?? {}) as Parameters<typeof scan>[0]);
    if (op === "search") {
      const input = payload as SearchPayload;
      return recall(input.query, {
        project: ctx.projectRoot,
        all: input.all,
        limit: input.limit,
      });
    }
    if (op === "show") return getMessage(Number(payload));
    if (op === "info") return memoryInfo();
    throw new Error(`Unsupported memory operation: ${op}`);
  },
  check() {
    const totals = memorySummary().totals;
    // Exercise the FTS path even when the probe has no hits.
    search("the", { all: true, limit: 1 });
    return {
      ok: true,
      detail: `${totals.sessions} sessions · ${totals.messages.toLocaleString()} msg · FTS ready`,
    };
  },
};
