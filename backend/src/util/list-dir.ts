// List a folder with each entry's kind, without one stat per entry. A tree walk that stats every entry pays one round
// trip per file; through a Docker mount of a Windows drive (9p) that is the whole cost: walking 2,119 entries of one repo
// took 66.6 s with a stat each and 4.8 s with the kinds readdir already returns (natively 110 ms -> 32 ms).
// Same answers as the stat walk: a symlink is followed, and an entry whose kind the file system does not report is
// stat'ed; an entry that cannot be stat'ed (a broken link) is left out.

import { type Dirent, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface DirEntry {
  name: string;
  abs: string;
  isDir: boolean;
}

/** The entries of `dir` with their kind; null when the folder cannot be read. */
export function listDir(dir: string): DirEntry[] | null {
  let ents: Dirent[];
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const out: DirEntry[] = [];
  for (const e of ents) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push({ name: e.name, abs, isDir: true });
    else if (e.isFile()) out.push({ name: e.name, abs, isDir: false });
    else {
      try {
        out.push({ name: e.name, abs, isDir: statSync(abs).isDirectory() });
      } catch {
        /* a broken link: left out, as the stat walk did */
      }
    }
  }
  return out;
}
