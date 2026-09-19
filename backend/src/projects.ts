// Known-projects registry — a global list of projects zemory has seen, so the
// UI can offer a picker (instead of only the launch directory). Stored at
// ~/.zemory/projects.json. Visiting or setting up a project registers it.
//
// Entries carry `pinned` (user keeps it on the tab bar) and `lastSeen` (recency)
// so the UI can show a few projects and tuck the rest behind a "…" menu.
// Temp/scratch directories are NOT registered — test runs used to pollute the
// real registry with hundreds of throwaway roots (see 06_CHANGES 2026-07-20).

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isConnected, projectKey, readMarker } from "./core/config.js";
import { currentMemoryDir } from "./memory/db.js";

/** The pre-2026-08-05 location, kept ONLY so an existing registry still loads. */
function legacyRegistryFile(): string {
  return join(homedir(), ".zemory", "projects.json");
}

/**
 * Where the registry lives: BESIDE THE DATA DIR (`<data>/projects.json`), not in the
 * home folder — user rule 2026-08-05, `02_RULES §Luật khi VIẾT` (Secret Ở ĐÂU): the DB,
 * its key, its config and this registry are ONE cluster that must move together, so
 * `memory relocate` can't leave half of it on the system drive. Only `location.json`
 * stays in home (it is the pointer that says where the data dir IS).
 *
 * Resolved per call (not frozen at import) so tests — and anyone isolating a run — can
 * point it elsewhere via ZEMORY_REGISTRY_FILE instead of writing the real one.
 */
function registryFile(): string {
  const override = process.env.ZEMORY_REGISTRY_FILE;
  if (override && override.trim()) return override.trim();
  return join(currentMemoryDir(), "projects.json");
}

/** Read path: the new location, falling back to the legacy one until it is migrated. */
function registryReadFile(): string {
  const f = registryFile();
  if (existsSync(f) || process.env.ZEMORY_REGISTRY_FILE) return f;
  return existsSync(legacyRegistryFile()) ? legacyRegistryFile() : f;
}

/**
 * The repo zemory itself lives in. It is the tool's OWN home, so it is pinned for good and its
 * pin button is LOCKED — user rule 2026-09-17 ("zemory phải luôn nằm ở đầu và nút ghim nó khóa").
 * Walk up from this compiled module (`<repo>/dist/projects.js`) to the folder whose package.json
 * says `name: "zemory"` — works both when run from the repo and through the global junction,
 * and does NOT depend on cwd (the daemon's cwd is wherever the user launched it).
 * Fail-open to "" (HP điều 9): unknown self ⇒ nothing is locked, the picker still works.
 */
let selfRootCache: string | null = null;
export function selfRepoRoot(): string {
  if (selfRootCache !== null) return selfRootCache;
  selfRootCache = "";
  try {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 5 && dir; i++) {
      const pkg = join(dir, "package.json");
      if (existsSync(pkg)) {
        const name = (JSON.parse(readFileSync(pkg, "utf8")) as { name?: string }).name;
        if (name === "zemory") { selfRootCache = realpathSync(dir); break; }
      }
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  } catch { /* fail-open */ }
  return selfRootCache;
}

/** Is this the repo zemory itself lives in? Compared by the same key as the registry. */
export function isSelfRoot(root: string): boolean {
  const self = selfRepoRoot();
  return !!self && !!root && projectKey(self) === projectKey(root);
}

export interface ProjectEntry {
  root: string;
  /** User pinned it — always visible on the tab bar. */
  pinned?: boolean;
  /** ISO timestamp of the last visit — drives "recent" ordering. */
  lastSeen?: string;
}

export interface KnownProject extends ProjectEntry {
  name: string;
  /** Structure standard the project declares in docs/.harness.json (default "app"). */
  profile: "app" | "non-app";
  /** zemory's OWN repo — pinned for good, and the pin button is locked (user rule 2026-09-17). */
  locked?: boolean;
}

/**
 * Read the structure profile from a project's docs/.harness.json. Fail-open to
 * "app" (the default when no key is written) so a missing/garbled config never
 * throws — the UI badge just shows APP. Mirrors config.ts assertConfig's rule.
 */
export function projectProfile(root: string): "app" | "non-app" {
  try {
    const marker = readMarker(root);
    return marker?.data.profile === "non-app" ? "non-app" : "app";
  } catch {
    return "app";
  }
}

/**
 * Repo có theo hệ ADAPT không (`layout: adapt|foreign` trong `.harness.json`).
 *
 * Trường RIÊNG, KHÔNG nhồi vào `projectProfile`: hệ ADAPT là một trục KHÁC — `04_adapt/AGENTS.md`
 * §2 vẫn bắt hỏi *"repo này APP hay NON-APP"*, nó chỉ bỏ phần ÉP tên folder. Gộp hai trục vào một
 * ô là mất hẳn thông tin profile của repo đó.
 *
 * Nhận cả hai tên vì `conform.ts` nhận cả hai: `adapt` là tên v2, `foreign` là marker đời trước.
 * Fail-open về `false` — đọc hỏng thì thẻ chỉ hiện hạng thường, không ném.
 */
export function projectIsAdapt(root: string): boolean {
  try {
    const layout = (readMarker(root)?.data as { layout?: unknown } | undefined)?.layout;
    return layout === "adapt" || layout === "foreign";
  } catch {
    return false;
  }
}

/**
 * Comparison key for a project root. Windows paths are case-insensitive and the
 * same repo shows up as both `D:\…` and `d:\…` depending on how the shell spelled
 * it — without folding, one project renders as two tabs.
 *
 * Bản chép riêng ở đây đã gộp về `core/config::projectKey` ngày 2026-08-02 (F4).
 */
const key = projectKey;

/** Resolve 8.3 short names (`HUY~1.NGU`) to their long form so prefix checks match. */
function longPath(p: string): string {
  try {
    return realpathSync.native(p);
  } catch {
    return p;
  }
}

/**
 * True for scratch/throwaway roots (system temp). The test suite scaffolds dozens
 * of harnesses per run; registering them made the UI tab bar unusable and there is
 * no case where a temp dir is a project worth remembering. Escape hatch: set
 * ZEMORY_REGISTRY_ALLOW_TMP=1.
 */
export function isScratchRoot(root: string): boolean {
  if (process.env.ZEMORY_REGISTRY_ALLOW_TMP === "1") return false;
  const tmp = key(longPath(tmpdir()));
  const target = key(longPath(root));
  return target === tmp || target.startsWith(tmp + (process.platform === "win32" ? "\\" : "/"));
}

function read(): ProjectEntry[] {
  const FILE = registryReadFile();
  if (!existsSync(FILE)) return [];
  try {
    const v = JSON.parse(readFileSync(FILE, "utf8"));
    // v1 was a bare string[]; keep reading it so an upgrade loses nothing.
    const raw: unknown[] = Array.isArray(v) ? v : Array.isArray(v?.projects) ? v.projects : [];
    const out: ProjectEntry[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      const entry: ProjectEntry | null =
        typeof item === "string"
          ? { root: item }
          : item && typeof item === "object" && typeof (item as ProjectEntry).root === "string"
            ? (item as ProjectEntry)
            : null;
      if (!entry) continue;
      const k = key(entry.root);
      const prev = out.find((e) => key(e.root) === k);
      if (prev) {
        // Same project spelled two ways — merge rather than list it twice.
        prev.pinned = prev.pinned || entry.pinned;
        if (entry.lastSeen && (!prev.lastSeen || entry.lastSeen > prev.lastSeen)) prev.lastSeen = entry.lastSeen;
        continue;
      }
      seen.add(k);
      out.push({ ...entry });
    }
    return out;
  } catch {
    return [];
  }
}

function write(list: ProjectEntry[]): void {
  const FILE = registryFile();
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify({ version: 2, projects: list }, null, 2) + "\n");
}

/** Record a project root (idempotent). Refreshes `lastSeen` on every visit. */
export function rememberProject(root: string): void {
  if (isScratchRoot(root)) return;
  const list = read();
  const k = key(root);
  const now = new Date().toISOString();
  const hit = list.find((e) => key(e.root) === k);
  if (hit) {
    hit.lastSeen = now;
  } else {
    list.push({ root, lastSeen: now });
  }
  write(list);
}

/**
 * Known projects that still exist + are still set up, most recent first.
 * zemory's own repo is FIRST, always, and comes back marked `locked` so the UI can
 * show its pin button disabled instead of pretending the click will do something.
 */
export function listKnownProjects(): KnownProject[] {
  return read()
    .filter((e) => isConnected(e.root))
    .map((e) => {
      const self = isSelfRoot(e.root);
      // Ghim CỨNG, không đọc cờ trong registry: kể cả file bị sửa tay thành `pinned:false`
      // thì nhà của chính công cụ vẫn đứng đầu — một nguồn sự thật, không hai đường rẽ.
      return { ...e, name: basename(e.root), profile: projectProfile(e.root), pinned: self || e.pinned, locked: self || undefined };
    })
    .sort((a, b) => {
      if (!!a.locked !== !!b.locked) return a.locked ? -1 : 1;
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "");
    });
}

/**
 * Pin/unpin a project so the UI always shows it. Returns false if unknown — or if this is
 * zemory's OWN repo, whose pin is locked (user rule 2026-09-17). Khoá phải nằm Ở ĐÂY chứ không
 * chỉ ở nút bấm: bề mặt nào cũng gọi được endpoint này, nút disabled chỉ là lời nhắc.
 */
export function pinProject(root: string, pinned: boolean): boolean {
  if (isSelfRoot(root)) return false;
  const list = read();
  const hit = list.find((e) => key(e.root) === key(root));
  if (!hit) return false;
  hit.pinned = pinned;
  write(list);
  return true;
}

/**
 * Drop a project from the picker. This only edits zemory's own list — the project
 * folder, its docs and its memory data are left untouched.
 */
export function forgetProject(root: string): boolean {
  const list = read();
  const k = key(root);
  const next = list.filter((e) => key(e.root) !== k);
  if (next.length === list.length) return false;
  write(next);
  return true;
}

/**
 * Drop entries whose folder is gone, is no longer set up, or is a scratch dir.
 * Returns how many were removed. Advisory cleanup — never touches the folders.
 */
export function pruneDeadProjects(): number {
  const list = read();
  const next = list.filter((e) => !isDeadEntry(e.root));
  if (next.length === list.length) return 0;
  write(next);
  return list.length - next.length;
}

/** Một mục sổ là CHẾT khi folder mất, không còn harness, hoặc là thư mục nháp. */
function isDeadEntry(root: string): boolean {
  return !isConnected(root) || isScratchRoot(root);
}

/**
 * Các mục `pruneDeadProjects` SẼ gỡ — đọc sổ THÔ, cùng một phép thử với lượt chạy thật.
 *
 * 🔴 Bản nháp của nút "Dọn dự án đã mất" từng đếm trên `listKnownProjects()`, mà hàm đó ĐÃ lọc bỏ
 * mục có folder mất ⇒ luôn ra 0, trong khi lượt chạy thật đọc sổ thô và có xoá. Bản nháp nói
 * "không có gì", nút bấm thì làm việc. Bắt được 2026-09-19 với `SasinAuto`: repo đổi tên, folder
 * cũ mất, mục sổ nằm lại — và vô hình với cả màn Dự án lẫn hộp xác nhận.
 */
export function deadProjectEntries(): string[] {
  return read()
    .filter((e) => isDeadEntry(e.root))
    .map((e) => e.root);
}
