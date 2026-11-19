// `zemory vecpost status|apply` - the post-transform of a vector index (memory/vecpost.ts).
//
//   status [--db <path>]                          the index's transform: none, applied (method, k, hash), or half-done
//   apply --db <path> [--k <n>] [--yes]           fit "all-but-the-top" on the index's own vectors and rewrite every stored
//                                                 vector with it. --db is required and the default store is refused without
//                                                 --yes: the rewrite cannot be undone, so it runs on a copy first and on the
//                                                 live store only with the daemon stopped and a backup taken.
import { resolve } from "node:path";
import { currentMemoryDb } from "../memory/db.js";
import { vecConnect } from "../memory/vectors.js";
import { applyPostToIndex, readVecPost } from "../memory/vecpost.js";

const USAGE = [
  "usage: zemory vecpost status [--db <path>]",
  "       zemory vecpost apply --db <path> [--k <n>] [--yes]",
];

const flag = (args: string[], name: string): string | null => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : null;
};

export function cmdVecPost(args: string[]): void {
  const [sub, ...rest] = args;
  const dbArg = flag(rest, "--db");
  if (sub === "status") {
    const db = vecConnect(dbArg || currentMemoryDb());
    try {
      const p = readVecPost(db);
      if (!p) console.log("zemory vecpost: raw index (no post-transform)");
      else if (p.appliedAt) console.log(`zemory vecpost: ${p.method}${p.k}:${p.hash} · ${p.dims}d · fitted ${p.fittedAt} · applied ${p.appliedAt}`);
      else console.log(`zemory vecpost: HALF-APPLIED ${p.method}${p.k}:${p.hash} - rewrite stopped at rowid ${p.appliedUpto ?? 0}; restore the backup`);
    } finally {
      db.close();
    }
    return;
  }
  if (sub === "apply") {
    if (!dbArg) {
      console.log("zemory vecpost apply: --db <path> is required");
      process.exitCode = 1;
      return;
    }
    if (resolve(dbArg) === resolve(currentMemoryDb()) && !rest.includes("--yes")) {
      console.log("zemory vecpost apply: this is the live store - stop the daemon, back it up, then add --yes");
      process.exitCode = 1;
      return;
    }
    const k = Number(flag(rest, "--k") ?? 2);
    if (!Number.isInteger(k) || k < 0 || k > 16) {
      console.log("zemory vecpost apply: --k takes 0..16");
      process.exitCode = 1;
      return;
    }
    const db = vecConnect(dbArg);
    try {
      let last = 0;
      const r = applyPostToIndex(db, {
        k,
        onProgress: (done, total) => {
          const pct = Math.floor((100 * done) / total);
          if (pct >= last + 10 || done === total) {
            last = pct;
            console.log(`  rewritten ${done}/${total} (${pct}%)`);
          }
        },
      });
      console.log(`zemory vecpost apply: ${r.vectors} vectors rewritten under abtt${k}:${r.hash} in ${(r.ms / 1000).toFixed(0)} s`);
    } finally {
      db.close();
    }
    return;
  }
  for (const l of USAGE) console.log(l);
  process.exitCode = sub ? 1 : 0;
}
