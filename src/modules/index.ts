import type { Module } from "../core/types.js";
import { harnessDocs } from "./harness-docs.js";
import { healthCore } from "./health-core.js";
import { memoryGlobal } from "./memory-global.js";
import { searchKeyword } from "./search-keyword.js";

// Multiple providers may exist for a slot; the runtime registers exactly the one
// named in `.harness.json` (or the built-in default per capability).
export const builtinModules: Module[] = [
  memoryGlobal,
  searchKeyword,
  harnessDocs,
  healthCore,
];
