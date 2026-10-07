// `paths check`: an arithmetic formula is not a path. Dept_FA 2026-10-07: `GrossAmount/1.08` · `(GrossAmount+Discount)/1.08`
// · `=EX/4.42` were 6 of its 19 "dead" — `.08` reads like an extension. The NEGATIVE side keeps real paths judged.
import assert from "node:assert/strict";
import test from "node:test";
import { isFormula } from "../../dist/docs/paths.js";

test("formulas are recognised", () => {
  for (const s of ["GrossAmount/1.08", "(GrossAmount+Discount)/1.08", "=EX/4.42", "Amount/3", "=SUM(A1/B1)"]) assert.ok(isFormula(s), s);
});

test("NEGATIVE: real paths — including version-numbered folders and dotted files — are not formulas", () => {
  for (const s of ["docs/plan/10_pbi.md", "models/mapping/SASIN_DW_mapping.xlsx", "tools/v1.08/", "node/1.08/bin/x.js", "data/2026/report.v2.xlsx", "pipeline/04_push_target.py"]) assert.ok(!isFormula(s), s);
});
