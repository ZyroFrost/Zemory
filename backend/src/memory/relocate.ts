// Move the memory data dir OFF the system drive (it grows without bound) to any
// local folder — e.g. inside the app repo under data/ (gitignored). The DB
// location is a FIXED pointer at ~/.zemory/location.json; relocating rewrites it
// and physically moves the DB. SAFE by construction: checkpoint the WAL, copy to
// the new dir, VERIFY (integrity + row count), only THEN flip the pointer, and
// keep the old DB renamed as a .bak (never deleted) so a bad move is reversible.

import Database from "better-sqlite3";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  MEMORY_DB_PINNED_BY_ENV,
  HOME_ZEMORY_DIR,
  LOCATION_POINTER,
  currentMemoryDb,
  currentMemoryDir,
} from "./db.js";

const DB_NAME = "global_memory.db";
const CONFIG_NAME = "config.json";

/** The live locations (from db.ts). Tests pass an override so they never touch the
 *  real ~/.zemory. `pinned` mirrors the GLOBAL_MEMORY_DB env override. */
export interface StoragePaths {
  dir: string;
  db: string;
  pointer: string;
  home: string;
  pinned: boolean;
}

function livePaths(): StoragePaths {
  // Resolve FRESH (not the module-load consts) so a `where`/dashboard call right
  // after a relocate in the same process already reports the new location.
  return { dir: currentMemoryDir(), db: currentMemoryDb(), pointer: LOCATION_POINTER, home: HOME_ZEMORY_DIR, pinned: MEMORY_DB_PINNED_BY_ENV };
}

export interface StorageInfo {
  /** Directory the memory data cluster currently lives in. */
  dir: string;
  dbPath: string;
  exists: boolean;
  sizeKB: number;
  /** How the location was resolved. */
  source: "env" | "pointer" | "default";
  /** Where the fixed bootstrap pointer lives (always in the home dir). */
  pointer: string;
  /** True if `dir` looks like a cloud-synced folder (unsafe for a live WAL DB). */
  onCloud: boolean;
  /** True while GLOBAL_MEMORY_DB pins the location (relocate is disabled). */
  pinnedByEnv: boolean;
}

/** Heuristic: a folder a desktop cloud client keeps in sync — a live WAL DB there corrupts. */
export function looksLikeCloudSync(dir: string): boolean {
  return /(google drive|[\\/]my drive|onedrive|dropbox|icloud|creative cloud)/i.test(dir);
}

function dirSource(P: StoragePaths): StorageInfo["source"] {
  if (P.pinned) return "env";
  try {
    const p = JSON.parse(readFileSync(P.pointer, "utf8")) as { dataDir?: unknown };
    if (typeof p.dataDir === "string" && p.dataDir.trim()) return "pointer";
  } catch {
    /* none */
  }
  return "default";
}

export function storageInfo(paths: StoragePaths = livePaths()): StorageInfo {
  let sizeKB = 0;
  let exists = false;
  try {
    sizeKB = Math.round(statSync(paths.db).size / 1024);
    exists = true;
  } catch {
    /* no DB yet */
  }
  return {
    dir: paths.dir,
    dbPath: paths.db,
    exists,
    sizeKB,
    source: dirSource(paths),
    pointer: paths.pointer,
    onCloud: looksLikeCloudSync(paths.dir),
    pinnedByEnv: paths.pinned,
  };
}

/** Write (or clear) the bootstrap pointer. Pass null to reset to the home default. */
export function setStoragePointer(dataDir: string | null, paths: StoragePaths = livePaths()): void {
  mkdirSync(paths.home, { recursive: true });
  if (!dataDir) {
    try {
      rmSync(paths.pointer, { force: true }); // reset to default = remove the pointer
    } catch {
      /* already gone */
    }
    return;
  }
  writeFileSync(paths.pointer, `${JSON.stringify({ dataDir }, null, 2)}\n`);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export interface RelocateResult {
  from: string;
  to: string;
  dbPath: string;
  movedBytes: number;
  messages: number;
  configMoved: boolean;
  /** True if the (expensive to re-download) model cache was carried along. */
  modelsMoved: boolean;
  backup: string | null;
  /** True when there was no DB to move — only the pointer was set. */
  pointerOnly: boolean;
}

/**
 * Move the memory data dir to `targetDir`. Non-destructive: the old DB is kept as
 * a timestamped `.bak` (delete it yourself once you've confirmed the move). Throws
 * (leaving everything untouched) if the target is unsafe or verification fails.
 */
export function relocateMemory(targetDir: string, opts: { force?: boolean; paths?: StoragePaths } = {}): RelocateResult {
  const P = opts.paths ?? livePaths();
  if (P.pinned) {
    throw new Error("GLOBAL_MEMORY_DB is set — it pins the DB location. Unset it before relocating.");
  }
  const to = resolve(targetDir.trim());
  if (!to || !isAbsolute(to)) throw new Error(`Invalid target folder: ${targetDir}`);
  const from = P.dir;
  const oldDb = P.db;
  const newDb = join(to, DB_NAME);

  if (to === from) {
    return { from, to, dbPath: oldDb, movedBytes: 0, messages: 0, configMoved: false, modelsMoved: false, backup: null, pointerOnly: true };
  }
  if (looksLikeCloudSync(to) && !opts.force) {
    throw new Error(
      `Refusing: "${to}" looks like a cloud-synced folder. A live WAL database there WILL corrupt. ` +
        `Sync the encrypted bundle via \`memory sync\` instead, or pass --force if you are sure.`,
    );
  }
  mkdirSync(to, { recursive: true });

  // No DB yet → nothing to move; just remember the new home for next time.
  if (!existsSync(oldDb)) {
    setStoragePointer(to, P);
    return { from, to, dbPath: newDb, movedBytes: 0, messages: 0, configMoved: false, modelsMoved: false, backup: null, pointerOnly: true };
  }
  if (existsSync(newDb) && !opts.force) {
    throw new Error(`A memory DB already exists at ${newDb}. Move/rename it first, or pass --force.`);
  }

  // 1+2. Fold the WAL into the .db, take a WRITE LOCK (BEGIN IMMEDIATE blocks
  //    every other writer), and only then count + copy — so no writer can slip
  //    rows into the WAL between the checkpoint and the file copy. If one did
  //    get in before we locked (non-empty WAL), unlock, re-checkpoint, retry.
  //    Copy-then-verify-then-swap: the old file stays intact until proven good.
  // Definite-assignment: set inside the locked block below, or the throw exits.
  let beforeCount!: number;
  let movedBytes!: number;
  const chk = new Database(oldDb);
  try {
    let locked = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      chk.pragma("wal_checkpoint(TRUNCATE)");
      chk.exec("BEGIN IMMEDIATE");
      let walBytes = 0;
      try {
        walBytes = statSync(`${oldDb}-wal`).size;
      } catch {
        /* no WAL file = fully folded */
      }
      if (walBytes <= 32) {
        locked = true;
        break;
      }
      chk.exec("ROLLBACK"); // a writer landed between checkpoint and lock — retry
    }
    if (!locked) throw new Error("Memory DB is being written to right now — close other zemory processes and retry.");
    try {
      beforeCount = (chk.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;
      movedBytes = statSync(oldDb).size;
      copyFileSync(oldDb, newDb);
    } finally {
      chk.exec("ROLLBACK"); // release the write lock; nothing was modified
    }
  } finally {
    chk.close();
  }
  let configMoved = false;
  const oldConfig = join(from, CONFIG_NAME);
  if (existsSync(oldConfig)) {
    try {
      copyFileSync(oldConfig, join(to, CONFIG_NAME));
      configMoved = true;
    } catch {
      /* settings are non-critical; they fall back to defaults if missing */
    }
  }

  // 3. VERIFY the copy before committing to it.
  try {
    const check = new Database(newDb, { readonly: true, fileMustExist: true });
    let ok: string;
    let afterCount: number;
    try {
      ok = (check.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
      afterCount = (check.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;
    } finally {
      check.close();
    }
    if (ok !== "ok" || afterCount !== beforeCount) {
      throw new Error(`Verify failed (integrity=${ok}, messages ${afterCount}/${beforeCount})`);
    }
  } catch (error) {
    rmSync(newDb, { force: true }); // roll back the partial copy; old DB untouched
    throw error instanceof Error ? error : new Error("Verify failed");
  }

  // 4. Commit: flip the pointer, then retire the old DB as a .bak (kept, not deleted).
  setStoragePointer(to, P);

  // Best-effort: carry the embed model cache too — it's large (~600MB) and slow to
  // re-download, but non-critical (re-caches on demand), so failure is not fatal.
  let modelsMoved = false;
  const oldModels = join(from, "models");
  if (existsSync(oldModels) && !existsSync(join(to, "models"))) {
    try {
      cpSync(oldModels, join(to, "models"), { recursive: true });
      rmSync(oldModels, { recursive: true, force: true });
      modelsMoved = true;
    } catch {
      /* model stays put; it will re-cache under the new dir on next embed */
    }
  }

  const backup = `${oldDb}.relocated-${timestamp()}.bak`;
  try {
    renameSync(oldDb, backup);
  } catch {
    return { from, to, dbPath: newDb, movedBytes, messages: beforeCount, configMoved, modelsMoved, backup: null, pointerOnly: false };
  }
  return { from, to, dbPath: newDb, movedBytes, messages: beforeCount, configMoved, modelsMoved, backup, pointerOnly: false };
}
