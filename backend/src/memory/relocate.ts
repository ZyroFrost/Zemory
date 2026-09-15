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
import { writeFileAtomic, writeJsonAtomic } from "../util/fs-atomic.js";
import { cloudSyncReport } from "./cloudguard.js";
import { isAbsolute, join, resolve } from "node:path";
import {
  MEMORY_DB_PINNED_BY_ENV,
  HOME_ZEMORY_DIR,
  LOCATION_POINTER,
  currentMemoryDb,
  currentMemoryDir,
  currentStoreRoot,
  pathsOverlap,
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
  /** Gốc KHO (plan/25 §1). Vắng ⇒ trùng `dir` = bố cục một-thư-mục cũ. Test tiêm đường
   *  này để không bao giờ đụng con trỏ thật ở home. */
  storeRoot?: string;
  db: string;
  pointer: string;
  home: string;
  pinned: boolean;
}

function livePaths(): StoragePaths {
  // Resolve FRESH (not the module-load consts) so a `where`/dashboard call right
  // after a relocate in the same process already reports the new location.
  return { dir: currentMemoryDir(), storeRoot: currentStoreRoot(), db: currentMemoryDb(), pointer: LOCATION_POINTER, home: HOME_ZEMORY_DIR, pinned: MEMORY_DB_PINNED_BY_ENV };
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
function setStoragePointer(dataDir: string | null, paths: StoragePaths = livePaths()): void {
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
  // GIỮ `memoryRoot` đang có: file này mang HAI đường (plan/25 §1a-1), ghi đè cả object
  // là âm thầm kéo gốc kho về lại thư mục máy — và kéo theo cả kho đi sang máy khác.
  const keep = readPointerAt(paths.pointer).memoryRoot;
  writeJsonAtomic(paths.pointer, keep ? { dataDir, memoryRoot: keep } : { dataDir });
}

/** Đọc con trỏ TẠI ĐƯỜNG ĐƯỢC TRUYỀN. Cố ý KHÔNG dùng `readStoragePointer()`: hàm đó
 *  luôn đọc con trỏ ở home, nên một lời gọi có `paths` tiêm vào sẽ đọc nhầm file của máy
 *  — vừa sai trong test, vừa sai ở mọi đường gọi có tiêm đường. */
function readPointerAt(file: string): { dataDir?: string; memoryRoot?: string } {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const out: { dataDir?: string; memoryRoot?: string } = {};
    for (const k of ["dataDir", "memoryRoot"] as const) {
      const v = parsed[k];
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// GỐC KHO (plan/25 §1a) — dời ĐÚNG hai mục: `global_memory.db` và `channel/`.
// KHÁC `relocateMemory` ở trên, vốn dời CẢ CỤM của máy. Ở đây cụm PHẢI ở lại:
// `share.key` · `secrets/` · `browser/` (phiên đăng nhập) · `models/` · `backups/`
// không bao giờ được đi sang máy khác (HP điều 14).
// ─────────────────────────────────────────────────────────────────────────────

/** Tên được phép sang gốc kho. Danh sách TƯỜNG MINH, không phải "mọi thứ trừ X":
 *  bài học của `copyCluster` là cái không được gọi tên sẽ đi theo nhánh mặc định,
 *  và ở đây nhánh mặc định sai nghĩa là mang bí mật đi. */
const STORE_MEMBERS = [DB_NAME, `${DB_NAME}-wal`, `${DB_NAME}-shm`, "channel", "files"] as const;

export interface RelocateStoreResult {
  from: string;
  to: string;
  dbPath: string;
  /** Tên đã sang. */
  moved: string[];
  /** Cách dời: đổi tên (cùng ổ, gần như tức thì) hay chép (khác ổ). */
  mode: "rename" | "copy";
  messages: number;
  /** Bản lùi của DB ở chỗ cũ; null khi không có DB để dời. */
  backup: string | null;
  pointerOnly: boolean;
}

/**
 * Dời GỐC KHO sang `targetDir` và ghi `memoryRoot` vào con trỏ.
 *
 * An toàn theo đúng khuôn `relocateMemory`: gập WAL → khoá ghi → đếm → chuyển →
 * verify (integrity + số dòng) → mới lật con trỏ → giữ bản cũ thành `.bak`.
 */
export function relocateStore(
  targetDir: string,
  opts: { force?: boolean; paths?: StoragePaths } = {},
): RelocateStoreResult {
  const P = opts.paths ?? livePaths();
  if (P.pinned) {
    throw new Error("GLOBAL_MEMORY_DB is set — it pins the store location. Unset it before relocating.");
  }
  const to = resolve(targetDir.trim());
  if (!to || !isAbsolute(to)) throw new Error(`Invalid target folder: ${targetDir}`);
  const machineDir = P.dir;
  const from = P.storeRoot ?? P.dir;
  const oldDb = join(from, DB_NAME);
  const newDb = join(to, DB_NAME);

  if (to === from) {
    return { from, to, dbPath: oldDb, moved: [], mode: "rename", messages: 0, backup: null, pointerOnly: true };
  }
  // Lồng nhau ⇒ "cái gì đi" thành mơ hồ: gốc kho nằm trong thư mục máy sẽ kéo theo
  // `browser/` và `models/`; ngược lại thì đỗ bí mật vào đúng thứ đi sang máy khác.
  if (pathsOverlap(to, machineDir)) {
    throw new Error(
      `Refusing: the store root (${to}) overlaps this machine's folder (${machineDir}). ` +
        `Pick a folder OUTSIDE it — the store travels to other machines, the machine folder must not.`,
    );
  }
  if (looksLikeCloudSync(to) && !opts.force) {
    throw new Error(
      `Refusing: "${to}" looks like a cloud-synced folder. A live WAL database there WILL corrupt. ` +
        `Sync through the peer channel instead, or pass --force if you are sure.`,
    );
  }
  if (existsSync(newDb) && !opts.force) {
    throw new Error(`A memory DB already exists at ${newDb}. Move/rename it first, or pass --force.`);
  }
  mkdirSync(to, { recursive: true });

  // Cùng ổ đĩa ⇒ đổi tên (gần như tức thì, không ghi lại vài GB). Khác ổ thì `rename`
  // ném EXDEV — chính cái bẫy đã phá kênh thật 03/09 (plan/08 §8e) — nên rơi về chép.
  // Dò bằng một file NHÁP, KHÔNG bằng chính file kho: bản đầu đổi tên `global_memory.db`
  // sang đích rồi đổi về, tức có một khoảnh khắc kho mang tên tạm ở thư mục khác — sập
  // đúng lúc đó là người dùng đi tìm kho không thấy. Phép dò không được phép đặt cược
  // vào thứ nó đang bảo vệ.
  const sameVolume = (() => {
    const a = join(from, `.zemory-vol-probe-${process.pid}`);
    const b = join(to, `.zemory-vol-probe-${process.pid}`);
    try {
      // Dùng helper nguyên tử dù đây chỉ là file NHÁP: cổng `fs-atomic` soi CHỮ trong cả file
      // và không phân biệt được "ghi nháp" với "ghi nguồn". Nới cổng cho một ca vặt là cách
      // cổng mất giá — rẻ hơn nhiều là đi qua đúng cửa.
      writeFileAtomic(a, "probe");
      renameSync(a, b);
      rmSync(b, { force: true });
      return true;
    } catch {
      rmSync(a, { force: true });
      rmSync(b, { force: true });
      return false;
    }
  })();
  const mode: "rename" | "copy" = sameVolume ? "rename" : "copy";

  rescueChannelIdentity(from, machineDir);

  if (!existsSync(oldDb)) {
    const moved = moveStoreMembers(from, to, mode, new Set([DB_NAME, `${DB_NAME}-wal`, `${DB_NAME}-shm`]));
    setStoreRootPointer(to, P);
    return { from, to, dbPath: newDb, moved, mode, messages: 0, backup: null, pointerOnly: true };
  }

  let beforeCount!: number;
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
      chk.exec("ROLLBACK");
    }
    if (!locked) throw new Error("Memory DB is being written to right now — close other zemory processes and retry.");
    beforeCount = (chk.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;
    copyFileSync(oldDb, newDb);
    chk.exec("ROLLBACK");
  } finally {
    chk.close();
  }

  // VERIFY trước khi lật con trỏ — bản cũ còn nguyên cho tới khi bản mới chứng minh được.
  const check = new Database(newDb, { readonly: true });
  try {
    const integrity = (check.pragma("integrity_check") as Array<{ integrity_check: string }>)[0]?.integrity_check;
    const after = (check.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c;
    if (integrity !== "ok" || after !== beforeCount) {
      check.close();
      rmSync(newDb, { force: true });
      throw new Error(`Move verification failed (integrity=${integrity}, messages ${beforeCount} → ${after}). Nothing was changed.`);
    }
  } finally {
    check.close();
  }

  const moved = moveStoreMembers(from, to, mode, new Set([DB_NAME]));
  moved.unshift(DB_NAME);
  setStoreRootPointer(to, P);

  // Nguồn chỉ đổi tên thành .bak SAU khi đích đã nghiệm thu — không xoá, để lùi được.
  const backup = `${oldDb}.relocated-${timestamp()}.bak`;
  try {
    renameSync(oldDb, backup);
  } catch {
    return { from, to, dbPath: newDb, moved, mode, messages: beforeCount, backup: null, pointerOnly: false };
  }
  return { from, to, dbPath: newDb, moved, mode, messages: beforeCount, backup, pointerOnly: false };
}

/**
 * Gỡ DANH TÍNH KÊNH ra khỏi `channel/` trước khi cụm đó sang gốc kho.
 *
 * Bản trước của lớp kênh để `device.key` ở `<dir>/channel/identity`, và bản di cư chỉ
 * CHÉP sang `secrets/` chứ không dọn bản cũ ⇒ một lượt dời kho bê nguyên khoá riêng vào
 * đúng thư mục đi sang máy khác. Đo được trên máy thật 2026-09-14, và nó là lỗ hạng
 * GIẢ DANH: ai có khoá đó dựng được một máy tự xưng là máy này.
 *
 * DỜI, không xoá (`02_RULES §Hành xử`): đã có bản ở `secrets/channel` thì bản thừa lùi về
 * `secrets/channel-legacy-<mốc>` để người xem rồi tự quyết.
 */
function rescueChannelIdentity(storeDirFrom: string, machineDir: string): void {
  const legacy = join(storeDirFrom, "channel", "identity");
  if (!existsSync(legacy)) return;
  const home = join(machineDir, "secrets", "channel");
  const target = existsSync(join(home, "device.key")) ? join(machineDir, "secrets", `channel-legacy-${timestamp()}`) : home;
  try {
    mkdirSync(join(target, ".."), { recursive: true });
    renameSync(legacy, target);
  } catch {
    try {
      cpSync(legacy, target, { recursive: true });
      rmSync(legacy, { recursive: true, force: true });
    } catch {
      /* không gỡ được ⇒ phía gọi sẽ thấy nó còn trong gốc kho; thà để lộ ra còn hơn im */
    }
  }
}

/** Chuyển các thành viên còn lại của gốc kho (bỏ qua `skip`, thường là chính file DB
 *  vì nó đã đi đường verify riêng). Trả về tên đã chuyển được. */
function moveStoreMembers(from: string, to: string, mode: "rename" | "copy", skip: Set<string>): string[] {
  const moved: string[] = [];
  for (const name of STORE_MEMBERS) {
    if (skip.has(name)) continue;
    const src = join(from, name);
    if (!existsSync(src)) continue;
    const dst = join(to, name);
    if (existsSync(dst)) continue; // không đè thứ đã có ở đích
    try {
      if (mode === "rename") renameSync(src, dst);
      else {
        cpSync(src, dst, { recursive: true });
        rmSync(src, { recursive: true, force: true });
      }
      moved.push(name);
    } catch {
      /* một mục không sang được KHÔNG được làm hỏng cuộc dời: DB đã verify xong */
    }
  }
  return moved;
}

/** Ghi `memoryRoot`, GIỮ NGUYÊN `dataDir` đang có (con trỏ mang hai đường). */
function setStoreRootPointer(memoryRoot: string | null, paths: StoragePaths = livePaths()): void {
  mkdirSync(paths.home, { recursive: true });
  const cur = readPointerAt(paths.pointer);
  const next: { dataDir?: string; memoryRoot?: string } = {};
  if (cur.dataDir) next.dataDir = cur.dataDir;
  else next.dataDir = paths.dir;
  if (memoryRoot) next.memoryRoot = memoryRoot;
  writeJsonAtomic(paths.pointer, next);
}
