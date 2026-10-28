// `zemory tidy [--session <id>] [--apply] [--json]` (plan/36): the 12 rows of Skill_Harness_SessionClose step 3b, measured
// from the session's transcript. Without --apply it only reports; --apply removes the session's scratch folder, approval
// flags, stale locks and the litter the session made inside the repo - nothing else. Exit 1 while a row still has items.
import { tidySession } from "../docs/session-tidy.js";

const MARKS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];

export function cmdTidy(args: string[]): void {
  const known = new Set(["--apply", "--json", "--session"]);
  const unknown = args.filter((a, i) => a.startsWith("-") && !known.has(a) && args[i - 1] !== "--session");
  const at = args.indexOf("--session");
  const session = at >= 0 ? args[at + 1] : null;
  if (unknown.length || (at >= 0 && (!session || session.startsWith("-")))) {
    console.log(`zemory tidy: ${unknown.length ? `unknown flag ${unknown.join(" ")}` : "--session needs a session id"} — nothing was run.`);
    console.log("  usage: zemory tidy [--session <id>] [--apply] [--json]");
    process.exitCode = 1;
    return;
  }
  const apply = args.includes("--apply");
  const r = tidySession({ repo: process.cwd(), session, apply });
  if (args.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`zemory tidy${apply ? " --apply" : ""} — session ${r.session ?? "(none found)"}${r.transcript ? "" : " · no transcript: rows ② ③ ④ ⑥ ⑩ cannot be measured"}`);
    r.rows.forEach((row, i) => {
      const gone = row.removed.length ? ` · removed ${row.removed.length}` : "";
      console.log(`  ${MARKS[i]} ${row.what}: ${row.n}${gone}${row.note ? `   (${row.note})` : ""}`);
      for (const it of row.items.filter((x) => !row.removed.includes(x)).slice(0, 12)) console.log(`      ${it}`);
      const more = row.items.length - row.removed.length - 12;
      if (more > 0) console.log(`      … and ${more} more`);
    });
  }
  if (r.rows.some((row) => row.n > 0)) process.exitCode = 1;
}
