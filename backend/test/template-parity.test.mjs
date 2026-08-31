// The harness ships TWO complete, standalone-readable template trees —
// docs_template/05_app/ (runnable code) and docs_template/03_nonapp/ (BI/data/docs/
// design deliverables). Most files legitimately differ (02_RULES drops UI,
// 03_STRUCTURE is a different standard, 04_SKILLS adds pull/fill/upload). But the
// SHARED SHELLS must stay byte-identical so the common harness never drifts
// between profiles — locked here by CODE, the same "sync by gate, not memory"
// doctrine as structure-sync (constitution điều 13).

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const PROFILES = ["05_app", "03_nonapp"];
const STANDARD = [
  "AGENTS.md",
  "CLAUDE.md",
  "agent/01_CONSTITUTION.md",
  "agent/02_RULES.md",
  "agent/03_STRUCTURE.md",
  "agent/04_SKILLS.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];
// Files that MUST be identical across the two profiles (the profile-neutral shells).
// AGENTS.md is NOT in this list since Phase 3 (2026-07-31): its trigger table names
// the skills each profile actually ships, and non-app ships three more (pull · fill ·
// upload). Byte-identity there would force the app tree to advertise skills it does
// not have — a pointer to a missing file is worse than an admitted difference. The
// part that still must not drift (the router that asks app-vs-non-app) is compared
// separately below, prefix-wise.
const SHARED = [
  // CLAUDE.md is a pure `@AGENTS.md` import — profile-neutral by construction, so
  // any drift between the two trees would be an accident, not a design choice.
  "CLAUDE.md",
  "agent/01_CONSTITUTION.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];

const read = (profile, rel) =>
  readFileSync(new URL(`../../docs_template/${profile}/${rel}`, import.meta.url), "utf8");

test("bo cowork mang DUNG ban guard da sinh (chep tay se troi, dem dong khong bat duoc)", () => {
  // Bo cowork la bo DUY NHAT ship san `hooks/guard.cjs` (khong co CLI de sinh tai cho), nen
  // ban do phai la BAN CHEP cua ban `zemory hook guard` sinh ra. Hom nay chep TAY — va cong
  // duy nhat canh no la so dong trong MANIFEST cua BOOTSTRAP, tuc hai ban lech noi dung ma
  // trung so dong thi LOT. Gate nay so tung byte.
  const gen = readFileSync(new URL("../../docs/hooks/guard.cjs", import.meta.url), "utf8");
  const shipped = readFileSync(new URL("../../docs_template/01_cowork_basic/nonapp/hooks/guard.cjs", import.meta.url), "utf8");
  assert.equal(
    shipped.replace(/\r\n/g, "\n"),
    gen.replace(/\r\n/g, "\n"),
    "docs_template/01_cowork_basic/nonapp/hooks/guard.cjs da troi khoi ban sinh — chay `zemory hook guard` roi chep lai",
  );
});

// #12 (user gat 2026-08-21, lam 2026-08-24): policy.json ship cowork co cong NOI DUNG.
// Guard.cjs da co gate so BYTE o tren; policy.json thi chi duoc dem DONG trong manifest —
// chieu 20/08 no vua bi sua TAY ma khong cong nao thay (dung khuon su co guard.cjs 11/08).
// So DUNG HAI KHOA voi bo sinh — KHONG so ca file: cowork khac `protected_write`/`flags_dir`
// CO CHU DICH (protected_write cua no la data/*/01_raw · docs/agent).
test("policy.json ship cowork: secret_names + secret_allow phai KHOP bo sinh", async () => {
  const { SECRET_DEFAULTS, SECRET_ALLOW_DEFAULTS } = await import("../../dist/docs/guard-gen.js");
  const shipped = JSON.parse(
    readFileSync(new URL("../../docs_template/01_cowork_basic/nonapp/hooks/policy.json", import.meta.url), "utf8"),
  );
  for (const [key, gen] of [
    ["secret_names", SECRET_DEFAULTS],
    ["secret_allow", SECRET_ALLOW_DEFAULTS],
  ]) {
    const have = shipped[key] || [];
    for (const pat of gen) {
      assert.ok(have.includes(pat), `policy.json cowork thieu mau "${pat}" o ${key} — bo sinh da co, ban ship troi`);
    }
  }
  // TU KIEM phep do: bo sinh phai khac RONG — rong thi vong for tren la vong rong, test vo nghia.
  assert.ok(SECRET_DEFAULTS.length >= 5 && SECRET_ALLOW_DEFAULTS.length >= 2, "bo mau sinh rong — phep do dang mu");
});

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
      read("05_app", rel),
      read("03_nonapp", rel),
      `${rel} must be byte-identical between docs_template/05_app/ and docs_template/03_nonapp/`,
    );
  }
});

test("AGENTS.md: the router half stays byte-identical, only the trigger table differs", () => {
  // Everything before the trigger table is the profile-NEUTRAL router (stop-and-ask,
  // app-vs-non-app explainer, load contract). That half must not drift; the table
  // below it is per-profile by design because the two trees ship different skills.
  const MARK = "## Mở khi trúng trigger";
  const halves = PROFILES.map((p) => {
    const t = read(p, "AGENTS.md");
    assert.ok(t.includes(MARK), `${p}/AGENTS.md has no trigger section — the skills have no way in`);
    return t.slice(0, t.indexOf(MARK));
  });
  assert.equal(halves[0], halves[1], "the router half of AGENTS.md must be byte-identical across profiles");
  assert.ok(halves[0].includes("01_CONSTITUTION"), "sanity: the router half must contain the load contract");
});

test("AGENTS.md makes every agent ASK app-vs-non-app before applying the standard", () => {
  // User 2026-07-23: any agent opening a fresh repo must ask the user which
  // profile, then explain both — so it never guesses the wrong structure.
  const agents = read("05_app", "AGENTS.md"); // shared → same in both
  assert.match(agents, /HỎI USER TRƯỚC[\s\S]*APP hay NON-APP/, "must instruct the agent to ask app/non-app");
  assert.match(agents, /zemory init --non-app/, "must show the non-app init path");
  assert.match(agents, /LÀM & BẢO TRÌ một app/, "must explain what APP means");
  assert.match(agents, /đọc · dò · kéo · điền · xuất/, "must explain what NON-APP means");
});

test("non-app standard drops UI rules and adds the file-automation model", () => {
  // Non-app = 0 UI rules: reading/filling a .pbix is not app development.
  const appRules = read("05_app", "agent/02_RULES.md");
  const nonappRules = read("03_nonapp", "agent/02_RULES.md");
  assert.match(appRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "app rules keep the UI-design-approval rule");
  assert.doesNotMatch(nonappRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "non-app rules must NOT carry the app UI rule");
  // The non-app structure standard documents pull/fill/upload + tasks/adhoc.
  const nonappStruct = read("03_nonapp", "agent/03_STRUCTURE.md");
  assert.match(nonappStruct, /KÉO \/ ĐIỀN \/ UPLOAD/, "non-app structure must document pull/fill/upload");
  assert.match(nonappStruct, /adhoc ≠ task/, "non-app structure must state the adhoc-vs-task rule");
  // The non-app tree carries the automation playbooks — as skill FILES since Phase 3,
  // and named in the registry, because a playbook nobody registered never gets opened.
  const nonappRegistry = read("03_nonapp", "agent/04_SKILLS.md");
  const appRegistry = read("05_app", "agent/04_SKILLS.md");
  for (const s of ["pull", "fill", "upload"]) {
    assert.doesNotThrow(
      () => read("03_nonapp", `.claude/skills/${s}/SKILL.md`),
      `non-app must ship .claude/skills/${s}/SKILL.md`,
    );
    assert.ok(nonappRegistry.includes(`\`${s}/\``), `non-app registry must list the ${s} skill`);
    assert.ok(!appRegistry.includes(`\`${s}/\``), `the app registry must NOT list ${s} (no file automation there)`);
  }
});

test("the app structure standard no longer inlines the non-app §7 (it moved out)", () => {
  const appStruct = read("05_app", "agent/03_STRUCTURE.md");
  assert.match(appStruct, /## 7\. Chuẩn NON-APP — đã TÁCH/, "app §7 is now a pointer stub");
  assert.doesNotMatch(appStruct, /## 7\. Chuẩn phụ NON-APP/, "the full §7 body must be gone from the app tree");
});
