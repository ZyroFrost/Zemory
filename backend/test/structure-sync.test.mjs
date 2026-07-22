// index ↔ structure ↔ graph must stay in sync (user 2026-07-22). The graph's
// SLOT_ROLES (backend/src/docs/structure-tree.ts) is a hand-authored dictionary
// that MUST cover every slot 03_STRUCTURE routes to — otherwise the folder-tree
// conformance view mislabels a standard, present folder as "non-standard" (this is
// exactly how `platform/` silently drifted). This test parses the routing paths in
// 03_STRUCTURE and fails if any routed slot has no role in the graph.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SLOT_ROLES } from "../../dist/docs/structure-tree.js";

const md = readFileSync(new URL("../../docs/agent/03_STRUCTURE.md", import.meta.url), "utf8");

// Every first-level slot the standard routes to, under backend/src/ and frontend/.
// (Sub-paths like backend/src/store/queries collapse to their slot; `<domain>`
// placeholders don't match [a-z].)
function routedSlots() {
  const slots = new Set();
  for (const m of md.matchAll(/backend\/src\/([a-z][a-z0-9_]*)/g)) slots.add(m[1]);
  for (const m of md.matchAll(/(?:^|[^a-z])frontend\/([a-z][a-z0-9_]*)/g)) slots.add(m[1]);
  return slots;
}

test("every slot 03_STRUCTURE routes to has a role in the graph's SLOT_ROLES (no silent drift)", () => {
  const missing = [...routedSlots()].filter((s) => !(s in SLOT_ROLES)).sort();
  assert.deepEqual(
    missing,
    [],
    "03_STRUCTURE routes to these slots but backend/src/docs/structure-tree.ts SLOT_ROLES has no role — " +
      "add them so the folder-tree stops flagging a standard folder as non-standard",
  );
});
