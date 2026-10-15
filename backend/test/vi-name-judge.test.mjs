// Rule 30 — a name in Vietnamese without its marks is caught by syllable shape; English names are never caught. The false
// alarm rate is measured on every real part name of the store (all English) and must be zero.
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { viName } from "../../dist/docs/vi-name-judge.js";
import { STORE_DIR } from "../../dist/docs/store.js";

test("Vietnamese names without marks are caught, in CamelCase, kebab, snake and with an extension", () => {
  for (const n of ["DieuMotBatBien", "bao-cao-thang", "tong_hop_doanh_thu", "ChiLamDungViecDuocGiao", "nhanVien.ts", "KhongDuocXoa"]) {
    assert.ok(viName(n), `must be caught: ${n}`);
  }
});

test("English names pass, including short words that are also Vietnamese syllables", () => {
  for (const n of ["OneNameDictionary", "TodoDoor", "ChallengeDesign", "ReadRunningVersion", "SecretsInTree", "RunTest",
    "hook-guard", "UiDesignApproval", "Main", "Backend", "01Raw", "TopNav", "SetMap", "HotFix", "NoTechnicalNamesUi"]) {
    assert.equal(viName(n), null, `must pass: ${n}`);
  }
});

test("false alarms on the store's real part names: zero", () => {
  const hits = [];
  for (const shelf of ["01_CONSTITUTION", "02_RULES", "03_STRUCTURE", "04_SKILLS"]) {
    let names;
    try { names = readdirSync(join(STORE_DIR, shelf)); } catch { continue; }
    for (const f of names) {
      const name = f.split("_").slice(-1)[0];
      if (viName(name)) hits.push(`${shelf}/${f}`);
    }
  }
  assert.deepEqual(hits, []);
});
