import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Module } from "../core/types.js";

export const healthCore: Module = {
  name: "core",
  provides: "health",
  check(ctx) {
    const ok = existsSync(join(ctx.projectRoot, "docs", ".harness.json"));
    return { ok, detail: ok ? "harness config readable" : "missing docs/.harness.json" };
  },
};
