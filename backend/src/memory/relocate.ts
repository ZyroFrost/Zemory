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
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import { cloudSyncReport } from "./cloudguard.js";
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

// ── Cả CỤM kho, không chỉ mỗi file .db ───────────────────────────────────────
// Vì sao viết theo lối "chở HẾT, chừa theo danh sách" chứ không "chở theo danh sách":
// bản cũ liệt kê đích danh (db + config + models) nên MỌI thư mục sinh ra sau đó —
// `secrets/` · `share.key` · `projects.json` · `browser/` · `imports/` · `logs/` ·
// `cockpit/` · `context-guard/` · `backups/` — đều bị bỏ lại **âm thầm**. Đó không phải
// bất tiện: chìa danh tính ở lại trong thư mục đang bị đồng bộ đám mây là lỗ HP điều 7,
// và đã xảy ra thật (05/08). Danh sách trắng luôn thiếu thứ chưa ai nghĩ ra; danh sách
// ĐEN thì thứ mới mặc định được chở — sai về phía an toàn.

/** Bí mật. Không tới nơi ⇒ HUỶ cả cuộc dời, không để chìa nằm lại chỗ cũ (HP điều 7/14). */
const CRITICAL = new Set(["share.key", "secrets"]);

/**
 * Những gì CỐ Ý ở lại. Ba nhóm, đều là vật-của-chỗ-cũ chứ không phải kho đang sống:
 * bản sao lưu của chính lệnh này, vật chứng hỏng hóc (cồng kềnh, gắn với sự cố cũ),
 * và khoá runtime (đã ôi ngay khi tiến trình đổi chỗ).
 */
function staysBehind(name: string): boolean {
  if (name === DB_NAME || name.startsWith(`${DB_NAME}-`)) return true; // .db + -wal/-shm: đi đường riêng
  if (name.endsWith(".bak")) return true;
  if (name.startsWith("corrupt-")) return true;
  if (/^global_memory\..+\.db$/.test(name)) return true; // bản hỏng đặt tên kiểu HONG-...
  if (name.endsWith(".lock")) return true;
  return false;
}

export interface ClusterMove {
  /** Tên đã sang được thư mục mới. */
  moved: string[];
  /** Tên cố ý để lại (xem `staysBehind`) — in ra để người dùng biết còn gì ở chỗ cũ. */
  left: string[];
  /** Đích đã có sẵn tên này ⇒ KHÔNG đè, nguồn Ở LẠI. Dính `CRITICAL` thì huỷ cả cuộc dời. */
  conflict: string[];
  /** Chép hỏng. Dính `CRITICAL` thì huỷ cả cuộc dời. */
  failed: string[];
}

/** Chép (CHƯA xoá nguồn) mọi thứ thuộc cụm kho sang thư mục mới. */
function copyCluster(from: string, to: string): ClusterMove {
  const out: ClusterMove = { moved: [], left: [], conflict: [], failed: [] };
  let entries: string[];
  try {
    entries = readdirSync(from);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (staysBehind(name)) {
      out.left.push(name);
      continue;
    }
    const dst = join(to, name);
    if (existsSync(dst)) {
      // Đích đã có sẵn: KHÔNG đè (có thể là kho cũ hợp lệ của máy này). Nhưng nguồn
      // Ở LẠI — với bí mật thì chính đó là mối nguy, nên phía gọi sẽ huỷ, không im.
      out.conflict.push(name);
      continue;
    }
    try {
      cpSync(join(from, name), dst, { recursive: true });
      out.moved.push(name);
    } catch {
      out.failed.push(name);
    }
  }
  return out;
}

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

/**
 * A folder a desktop cloud client keeps in sync — a live WAL DB there corrupts.
 *
 * Không còn chỉ soi TÊN thư mục: tên là thứ yếu nhất. Hai lần hỏng kho thật (03/08 và
 * 04/08) đường dẫn đều KHÔNG mang chữ "Drive" nào, thứ cuốn nó đi là kênh backup máy
 * khai trong sổ của DriveFS. `cloudSyncReport` đọc đúng những nguồn khai đó; tên thư mục
 * giờ chỉ là một trong năm bằng chứng.
 */
export function looksLikeCloudSync(dir: string): boolean {
  return cloudSyncReport(dir).atRisk;
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
  // Con trỏ này quyết định zemory tìm DB ở đâu. Ghi hỏng nửa chừng ⇒ JSON cụt ⇒
  // resolveMemoryDir() rơi về thư mục home và MỞ RA MỘT BỘ NHỚ RỖNG bên cạnh DB thật.
  writeJsonAtomic(paths.pointer, { dataDir });
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
  /** Cả cụm kho đi kèm: cái gì sang, cái gì cố ý ở lại, cái gì chép hỏng. */
  cluster: ClusterMove;
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
    return { from, to, dbPath: oldDb, movedBytes: 0, messages: 0, configMoved: false, modelsMoved: false, backup: null, pointerOnly: true, cluster: { moved: [], left: [], conflict: [], failed: [] } };
  }
  if (looksLikeCloudSync(to) && !opts.force) {
    throw new Error(
      `Refusing: "${to}" looks like a cloud-synced folder. A live WAL database there WILL corrupt. ` +
        `Sync the encrypted bundle via \`memory sync\` instead, or pass --force if you are sure.`,
    );
  }
  mkdirSync(to, { recursive: true });

  // Chưa có DB → không có gì để verify, NHƯNG cụm vẫn có thể tồn tại (chìa/két/settings
  // sinh ra trước lần ingest đầu). Bỏ qua chúng ở nhánh này là để lại đúng thứ nguy hiểm nhất.
  if (!existsSync(oldDb)) {
    const only = copyCluster(from, to);
    setStoragePointer(to, P);
    for (const name of only.moved) {
      try {
        rmSync(join(from, name), { recursive: true, force: true });
      } catch {
        /* bản mới đã sống; đây chỉ là rác ở chỗ cũ */
      }
    }
    return {
      from,
      to,
      dbPath: newDb,
      movedBytes: 0,
      messages: 0,
      configMoved: only.moved.includes(CONFIG_NAME),
      modelsMoved: only.moved.includes("models"),
      backup: null,
      pointerOnly: true,
      cluster: only,
    };
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
  // 2b. CHÉP cả cụm (chưa xoá nguồn): settings · registry · chìa · két · model cache ·
  //     profile trình duyệt · kho import · log · cockpit · context-guard · backups…
  const cluster = copyCluster(from, to);

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

  // 3b. BÍ MẬT không tới nơi được ⇒ HUỶ khi con trỏ CHƯA lật, nên chưa có gì đổi. Hai ca
  //     đều tính: chép HỎNG, và đích ĐÃ CÓ tên đó (khi ấy nguồn ở lại — chính là cái lỗ).
  //     Dời nửa vời mà chìa nằm lại thư mục đang đồng bộ đám mây là sự cố thật 05/08;
  //     thà không dời còn hơn dời hở.
  const criticalStuck = [...cluster.failed, ...cluster.conflict].filter((n) => CRITICAL.has(n));
  if (criticalStuck.length) {
    rmSync(newDb, { force: true });
    for (const n of cluster.moved) rmSync(join(to, n), { recursive: true, force: true });
    throw new Error(
      `Refusing: cannot carry ${criticalStuck.join(", ")} to ${to} (already present there, or copy failed). ` +
        `Leaving a secret behind in the old folder is exactly the leak this move is meant to close. ` +
        `Nothing was changed — clear those names at the target (or move them by hand) and retry.`,
    );
  }

  // 4. Commit: flip the pointer, THEN vacate the old copies (source removed only after the
  //    new home is the official one, so a crash in between leaves a readable duplicate,
  //    never a hole).
  setStoragePointer(to, P);
  for (const name of cluster.moved) {
    try {
      rmSync(join(from, name), { recursive: true, force: true });
    } catch {
      /* nguồn không xoá được: bản mới đã sống, đây chỉ là rác ở chỗ cũ */
    }
  }

  const backup = `${oldDb}.relocated-${timestamp()}.bak`;
  const base = {
    from,
    to,
    dbPath: newDb,
    movedBytes,
    messages: beforeCount,
    configMoved: cluster.moved.includes(CONFIG_NAME),
    modelsMoved: cluster.moved.includes("models"),
    pointerOnly: false,
    cluster,
  };
  try {
    renameSync(oldDb, backup);
  } catch {
    return { ...base, backup: null };
  }
  return { ...base, backup };
}
