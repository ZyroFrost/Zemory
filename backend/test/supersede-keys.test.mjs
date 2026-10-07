// Two false reds of `validate` reported by Dept_FA (2026-10-07) — both in the READER, so the repo could not fix them
// without editing old entries: ① the template's how-to line at the top of 06_CHANGES (`> 🔄 **Supersede:** ...` in
// inline code) read as a real clause with "no key" · ② headings written `## [2026-09-18 (c)]` were not matched to the
// key `2026-09-18c` that the clause correctly names.
import assert from "node:assert/strict";
import test from "node:test";
import { danglingSupersedes } from "../../dist/docs/validate.js";

test("the intro's how-to line (before the first entry, or in inline code) is not a supersede clause", () => {
  const log = [
    "# Change Log",
    "> Mới nhất ở trên cùng. Entry đảo/thay quyết định cũ → mở đầu bằng `> 🔄 **Supersede:** ...`.",
    "> 🔄 **Supersede** stray line in the intro",
    "## [2026-10-07] — a",
    "- mention of `> 🔄 **Supersede:**` in prose is not a clause either",
    "> 🔄 **Supersede** a real clause without a key",
  ].join("\n");
  assert.deepEqual(danglingSupersedes([log]), ["no key"], "only the real clause inside an entry counts");
});

test("`## [YYYY-MM-DD (x)]` is the key `YYYY-MM-DDx`", () => {
  const log = [
    "## [2026-09-18 (c)] — c",
    "> 🔄 **Supersede:** 2026-09-18b — replaced",
    "## [2026-09-18 (b)] — b",
    "## [2026-09-17] — plain",
    "> 🔄 **Supersede:** 2026-09-17 · 2026-09-18c",
    "> 🔄 **Supersede:** 2026-09-18d — no such entry",
  ].join("\n");
  assert.deepEqual(danglingSupersedes([log]), ["2026-09-18d"]);
});
