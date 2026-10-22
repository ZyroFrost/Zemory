// The cockpit's "harness behind the standard" rows: which linked repo is behind HS (missing files, a stale guard, outdated
// text, parts not current). Read-only. Run in a worker thread by the daemon (/harness-updates): it reads every linked
// repo's harness, which through a Docker mount of a Windows drive is minutes of 9p round trips, and on the event loop
// that froze the cockpit (measured 2026-10-22).

import { existsSync } from "node:fs";
import { getRepoStdCheck } from "../config/settings.js";
import { listKnownProjects } from "../projects.js";
import { syncCheck } from "./adopt.js";
import { repoKit } from "./kit-apply.js";
import { kitBehind } from "./kit-sync.js";
import { applyStandard, isStandardSource, skillDiff, standardDiff } from "./standard.js";

export interface HarnessStaleRow {
  root: string;
  name: string;
  missing: number;
  guardStale: number;
  drift: number;
  manual: number;
  locked: boolean;
}

export function harnessStaleRows(): HarnessStaleRow[] {
  const stale: HarnessStaleRow[] = [];
  try {
    // the "check other repos" switch off ⇒ no repo round, the chip speaks for zemory alone
    for (const proj of getRepoStdCheck() ? listKnownProjects() : []) {
      if (!existsSync(proj.local)) continue;
      // A kit repo (folder harness) is measured the way `zemory sync --check` measures it: the parts whose copy is not
      // current, plus a stale guard. The file-harness diff below compares it with the OLD single files and reported the
      // same 21 missing / 15 drift for every folder repo, synced or not.
      const kb = kitBehind(proj.local);
      if (kb) {
        const { missing, drift, manual } = kb, guardStale = kb.guardStale.length;
        if (missing || drift || manual || guardStale) {
          stale.push({ root: proj.root, name: proj.name, missing, guardStale, drift, manual, locked: !missing && !drift && !guardStale && manual > 0 });
        }
        continue;
      }
      if (repoKit(proj.local)) continue; // a kit repo whose dry assembly failed: the file-harness diff would report it falsely
      const r = syncCheck(proj.local);
      if (!r.connected) continue;
      // outdated TEXT (plan/26 step ④): a file present but at an old standard; the zemory repo itself carries nothing
      const v = isStandardSource(proj.local) ? [] : standardDiff(proj.local).files;
      // a shared skill that is old (replaceable / missing) is drift too; a hand-edited one is not - apply never writes it
      const skillDrift = isStandardSource(proj.local) ? 0 : skillDiff(proj.local).filter((s) => s.verdict === "clean" || s.verdict === "absent").length;
      // Ask the SAME merge the apply button runs (dry-run): a `local` file whose hunks overlap is refused there, so
      // counting it as "appliable" made the box invite a click that never wrote anything (2026-10-08, 3 repos).
      const dry = v.some((f) => f.verdict === "clean" || f.verdict === "local") ? applyStandard(proj.local, { apply: false }) : [];
      const drift = dry.filter((f) => f.action === "would-write").length + skillDrift;
      const manual = dry.filter((f) => f.action === "skipped").length + v.filter((f) => f.verdict === "unknown").length;
      if (r.missing.length || r.guardStale.length || drift || manual) {
        // `locked`: the only thing left is what the tool refuses to write (no stamp · overlapping hunks) ⇒ a click
        // writes nothing. The tick is locked — a button that writes nothing is a button that lies.
        const locked = !r.missing.length && !r.guardStale.length && !drift && manual > 0;
        stale.push({ root: proj.root, name: proj.name, missing: r.missing.length, guardStale: r.guardStale.length, drift, manual, locked });
      }
    }
  } catch {
    /* fail-open — a reminder surface must not die */
  }
  return stale;
}
