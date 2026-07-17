import { archiveChanges } from "../archive.js";
import type { Module } from "../core/types.js";
import { validate } from "../validate.js";

// The `harness` capability: owns the project docs harness — its structure
// (rules/TODO/changelog/plan), validation, and FILE-WINS (.md source / DB index) discipline.
export const harnessDocs: Module = {
  name: "docs",
  provides: "harness",
  run(ctx, op) {
    if (op === "validate") return validate(ctx);
    if (op === "archive") return archiveChanges(ctx);
    throw new Error(`Unsupported harness operation: ${op}`);
  },
  check(ctx) {
    const report = validate(ctx);
    const actionable = report.issues.filter((issue) => issue.level !== "info").length;
    return {
      ok: report.ok,
      detail: actionable ? `${actionable} docs issue(s)` : "docs harness ready",
    };
  },
};
