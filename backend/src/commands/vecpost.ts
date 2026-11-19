// `zemory vecpost status|fit|drop` - the search-time transform of a vector index (memory/vecpost.ts).
//
//   status [--db <path>]            the fitted transform (method, k, hash, when), or none; and whether this shell has it on
//   fit [--db <path>] [--k <n>]     fit "all-but-the-top" on a sample of the index's own vectors and store the parameters
//                                   (one small row - the stored vectors are only read). On trial: used only with
//                                   ZEMORY_VECPOST=1.
//   drop [--db <path>]              remove the parameters: search goes back to the raw vectors
import { currentMemoryDb } from "../memory/db.js";
import { vecConnect } from "../memory/vectors.js";
import { dropPost, fitPost, readVecPost } from "../memory/vecpost.js";

const USAGE = [
  "usage: zemory vecpost status [--db <path>]",
  "       zemory vecpost fit [--db <path>] [--k <n>]",
  "       zemory vecpost drop [--db <path>]",
];

const flag = (args: string[], name: string): string | null => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : null;
};

export function cmdVecPost(args: string[]): void {
  const [sub, ...rest] = args;
  const dbArg = flag(rest, "--db");
  const dbPath = dbArg || currentMemoryDb();
  if (sub === "status") {
    const db = vecConnect(dbPath);
    try {
      const p = readVecPost(db);
      const on = /^(1|on|true)$/i.test(process.env.ZEMORY_VECPOST?.trim() ?? "");
      if (!p) console.log("zemory vecpost: none - search uses the raw vectors");
      else console.log(`zemory vecpost: ${p.method}${p.k}:${p.hash} · ${p.dims}d · fitted ${p.fittedAt} · ${on ? "ON in this shell" : "fitted but OFF (on trial: set ZEMORY_VECPOST=1)"}`);
    } finally {
      db.close();
    }
    return;
  }
  if (sub === "fit") {
    const k = Number(flag(rest, "--k") ?? 2);
    if (!Number.isInteger(k) || k < 0 || k > 16) {
      console.log("zemory vecpost fit: --k takes 0..16");
      process.exitCode = 1;
      return;
    }
    const db = vecConnect(dbPath);
    try {
      const r = fitPost(db, { k });
      console.log(`zemory vecpost fit: abtt${r.k}:${r.hash} from ${r.sampled} sampled vectors in ${(r.ms / 1000).toFixed(0)} s - used by searches run with ZEMORY_VECPOST=1`);
    } finally {
      db.close();
    }
    return;
  }
  if (sub === "drop") {
    const db = vecConnect(dbPath);
    try {
      dropPost(db);
      console.log("zemory vecpost drop: removed - search uses the raw vectors");
    } finally {
      db.close();
    }
    return;
  }
  for (const l of USAGE) console.log(l);
  process.exitCode = sub ? 1 : 0;
}
