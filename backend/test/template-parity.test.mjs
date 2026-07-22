// The harness ships TWO complete, standalone-readable template trees —
// docs_template/app/ (runnable code) and docs_template/nonapp/ (BI/data/docs/
// design deliverables). Most files legitimately differ (02_RULES drops UI,
// 03_STRUCTURE is a different standard, 04_SKILLS adds pull/fill/upload). But the
// SHARED SHELLS must stay byte-identical so the common harness never drifts
// between profiles — locked here by CODE, the same "sync by gate, not memory"
// doctrine as structure-sync (constitution điều 13).

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const PROFILES = ["app", "nonapp"];
const STANDARD = [
  "AGENTS.md",
  "agent/01_CONSTITUTION.md",
  "agent/02_RULES.md",
  "agent/03_STRUCTURE.md",
  "agent/04_SKILLS.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];
// Files that MUST be identical across the two profiles (the profile-neutral shells).
const SHARED = [
  "AGENTS.md",
  "agent/01_CONSTITUTION.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];

const read = (profile, rel) =>
  readFileSync(new URL(`../../docs_template/${profile}/${rel}`, import.meta.url), "utf8");

test("both template trees carry the full standard set (agent 01–06 + AGENTS + plan overview)", () => {
  for (const profile of PROFILES) {
    for (const rel of STANDARD) {
      assert.doesNotThrow(() => read(profile, rel), `${profile}/${rel} must exist`);
    }
  }
});

test("shared harness shells are byte-identical across app and non-app (no drift)", () => {
  for (const rel of SHARED) {
    assert.equal(
      read("app", rel),
      read("nonapp", rel),
      `${rel} must be byte-identical between docs_template/app/ and docs_template/nonapp/`,
    );
  }
});

test("AGENTS.md makes every agent ASK app-vs-non-app before applying the standard", () => {
  // User 2026-07-23: any agent opening a fresh repo must ask the user which
  // profile, then explain both — so it never guesses the wrong structure.
  const agents = read("app", "AGENTS.md"); // shared → same in both
  assert.match(agents, /HỎI USER TRƯỚC[\s\S]*APP hay NON-APP/, "must instruct the agent to ask app/non-app");
  assert.match(agents, /zemory init --non-app/, "must show the non-app init path");
  assert.match(agents, /LÀM & BẢO TRÌ một app/, "must explain what APP means");
  assert.match(agents, /đọc · dò · kéo · điền · xuất/, "must explain what NON-APP means");
});

test("non-app standard drops UI rules and adds the file-automation model", () => {
  // Non-app = 0 UI rules: reading/filling a .pbix is not app development.
  const appRules = read("app", "agent/02_RULES.md");
  const nonappRules = read("nonapp", "agent/02_RULES.md");
  assert.match(appRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "app rules keep the UI-design-approval rule");
  assert.doesNotMatch(nonappRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "non-app rules must NOT carry the app UI rule");
  // The non-app structure standard documents pull/fill/upload + tasks/adhoc.
  const nonappStruct = read("nonapp", "agent/03_STRUCTURE.md");
  assert.match(nonappStruct, /KÉO \/ ĐIỀN \/ UPLOAD/, "non-app structure must document pull/fill/upload");
  assert.match(nonappStruct, /adhoc ≠ task/, "non-app structure must state the adhoc-vs-task rule");
  // The non-app skills carry the automation playbooks.
  const nonappSkills = read("nonapp", "agent/04_SKILLS.md");
  for (const s of ["## pull", "## fill", "## upload"]) {
    assert.ok(nonappSkills.includes(s), `non-app skills must include the ${s} playbook`);
  }
});

test("the app structure standard no longer inlines the non-app §7 (it moved out)", () => {
  const appStruct = read("app", "agent/03_STRUCTURE.md");
  assert.match(appStruct, /## 7\. Chuẩn NON-APP — đã TÁCH/, "app §7 is now a pointer stub");
  assert.doesNotMatch(appStruct, /## 7\. Chuẩn phụ NON-APP/, "the full §7 body must be gone from the app tree");
});
