// Adopt — idempotent, NON-DESTRUCTIVE harness setup. Used by `init`, `sync`,
// and the UI "Sync docs" button. It ensures .harness.json exists and gap-fills
// MISSING template docs only. It NEVER overwrites an existing file.
//
// Section-level reconciliation (a file exists but is missing parts) needs
// judgment, so it is NOT done here — that is the agent-assisted `migrate` path.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { openMemory } from "../memory/db.js";
import { CONFIG_FILE, findMarker, harnessPathsAt, loadContext, readMarker } from "../core/config.js";
import { guardDrift } from "./guard-gen.js";
import type { HarnessConfig, StructureProfile } from "../core/types.js";
import { rememberProject } from "../projects.js";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The shared harness STANDARD, shipped with zemory (separate from any project's
 *  docs/). Split by profile: docs_template/app/ (code apps) and docs_template/
 *  nonapp/ (BI/data/docs/design deliverables). Each tree is complete + read
 *  standalone; the files that MUST match are locked byte-identical by a parity
 *  test (template-parity.test.mjs) so the shared shells never drift. */
export const TEMPLATE_DIR = join(HERE, "..", "..", "docs_template");

/** The template subtree for a profile (defaults to app). `init`/`sync` scaffold
 *  from here and the UI loads it for reference. The profile value "non-app" (with
 *  the hyphen the type uses) maps to the folder `nonapp` (slot names carry no
 *  hyphen — 03_STRUCTURE convention). */
export function templateDir(profile: StructureProfile = "app"): string {
  return join(TEMPLATE_DIR, profile === "non-app" ? "nonapp" : "app");
}

export interface AdoptResult {
  createdConfig: boolean;
  added: string[];
  present: string[];
  docsRel: string;
  /** Existing docs don't match the standard → an agent must reconcile them. */
  needsReconcile: boolean;
  /** Thư mục plan/planning CÓ SẴN của repo mà harness KHÔNG đụng vào (ADAPT v2 · N1).
   *  Trước đây chúng bị `renameSync` vào `docs/plan` âm thầm; nay chỉ báo để người
   *  quyết. Rỗng là trường hợp thường. Đường tương đối so với gốc project. */
  untouchedLegacyPlan: string[];
  /** ADAPT v2 · 4.2 — entry gốc (AGENTS.md/CLAUDE.md) là BẢN RIÊNG của repo và KHÔNG
   *  nhắc gì tới harness. Trạng thái thứ ba, phải nhìn thấy được: "chưa nối" khác hẳn
   *  "đã có" — harness không nạp được thì mọi luật phía trong thành vô hình. Mỗi mục
   *  kèm dòng con trỏ đề xuất để user (hoặc agent, sau khi user duyệt) tự thêm. */
  entriesUnlinked: Array<{ file: string; pointer: string }>;
}

// The canonical agent docs (.md is source; DB = derived index). Anything else in docs/agent =
// non-standard → flag for agent reconciliation rather than gap-filling (which
// would create duplicates). 01_CONSTITUTION (2026-07-14) is the per-app
// supreme layer — each app's own architectural invariants (like Spec Kit's
// constitution.md), read BEFORE the generic working rules.
const STANDARD_AGENT = ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md"];

/** Files scaffolded at the project ROOT (everything else lives under docs/).
 *  Two doors into the same harness: AGENTS.md is the cross-vendor standard,
 *  CLAUDE.md exists because Claude Code reads only CLAUDE.md — it imports
 *  AGENTS.md rather than repeating it. */
const ROOT_ENTRIES = ["AGENTS.md", "CLAUDE.md"];

// Projects adopted the harness under older numberings:
//   gen-1 (pre 2026-07-09): 01_RULES / 02_TODO / 03_CHANGES (no STRUCTURE doc)
//   gen-2 (pre 2026-07-14): 01_RULES / 02_STRUCTURE / 03_TODO / 04_CHANGES
//   gen-3 (pre 2026-07-18): 01_CONSTITUTION / 02_RULES / 03_STRUCTURE / 04_TODO / 05_CHANGES
// The 04_SKILLS insert (2026-07-18) shifted the tail: TODO→05, CHANGES→06
// (STRUCTURE stays 03; 04_SKILLS is brand new → gap-filled from template, not
// renamed). A rename is purely mechanical (same content, same role) — do it
// automatically so old projects still gap-fill cleanly instead of being
// permanently flagged non-standard. Every target name is brand-new (never used
// by any earlier generation), so the renames can run in any order without
// collisions; the exists-guard below still protects the odd folder that carries
// two generations of the same doc.
const LEGACY_RENAME: Record<string, string> = {
  "05_CHANGES.md": "06_CHANGES.md",
  "04_CHANGES.md": "06_CHANGES.md", // gen-2
  "03_CHANGES.md": "06_CHANGES.md", // gen-1
  "04_TODO.md": "05_TODO.md",
  "03_TODO.md": "05_TODO.md", // gen-2
  "02_TODO.md": "05_TODO.md", // gen-1
  "02_STRUCTURE.md": "03_STRUCTURE.md",
  "01_RULES.md": "02_RULES.md",
};

/** ADAPT v2 · 4.2 — trạng thái MỘT cửa vào, ba mức. "linked" tính cả nối GIÁN TIẾP:
 *  CLAUDE.md chỉ chứa `@AGENTS.md` mà AGENTS.md đã trỏ harness thì CLAUDE.md cũng nối —
 *  đó chính là khuôn "một nguồn, hai cửa" mà template của chính zemory ship, nên báo
 *  "chưa nối" cho ca đó là tự báo oan lên thiết kế của mình (đã dính trên repo tham chiếu).
 *  Fixpoint trên danh sách entry (nhỏ, thường là 2) — không giới hạn một bậc để khỏi
 *  phải nhớ thứ tự file. MỘT hàm cho cả adopt lẫn doctor: hai bản tự chế sẽ lệch nhau. */
export function entryStates(
  projectRoot: string,
  agentDirAbs: string,
  entriesAbs: string[],
): Array<{ file: string; state: "missing" | "linked" | "unlinked" }> {
  const agentRel = relative(projectRoot, agentDirAbs).replace(/\\/g, "/");
  const items = entriesAbs.map((abs) => {
    const file = relative(projectRoot, abs).replace(/\\/g, "/");
    if (!existsSync(abs)) return { file, content: null };
    return { file, content: readFileSync(abs, "utf8") };
  });
  const linked = new Set<string>();
  for (const it of items) {
    if (it.content === null) continue;
    if (it.content.startsWith("<!-- zemory") || it.content.includes(agentRel) || it.content.includes(agentRel.replace(/\//g, "\\"))) {
      linked.add(it.file);
    }
  }
  for (let grew = true; grew; ) {
    grew = false;
    for (const it of items) {
      if (it.content === null || linked.has(it.file)) continue;
      if ([...linked].some((l) => it.content!.includes(basename(l)))) {
        linked.add(it.file);
        grew = true;
      }
    }
  }
  return items.map((it) => ({
    file: it.file,
    state: it.content === null ? "missing" : linked.has(it.file) ? "linked" : "unlinked",
  }));
}

const DEFAULT_CONFIG: HarnessConfig = {
  docs: "docs/agent",
  adapters: { memory: "global", search: "keyword" },
  thresholds: { changes_lines: 300, changes_keep: 180 },
};

/**
 * Ensure the project has a harness: create .harness.json if absent, then add
 * any template docs that are missing. Existing files are kept untouched.
 */
export function ensureHarness(projectRoot: string, profile?: StructureProfile): AdoptResult {
  const projectName = basename(projectRoot);
  // ADAPT v2 · N5 — dùng marker ĐANG CÓ (bất kể bậc nào của thang); chỉ khi repo chưa
  // nối mới tạo mới ở đường mặc định. Ghép cứng `docs/.harness.json` như bản trước sẽ
  // đẻ marker THỨ HAI cho repo đã đặt harness ở `harness/` — hai nguồn sự thật.
  const configPath = findMarker(projectRoot) ?? join(projectRoot, CONFIG_FILE);
  let createdConfig = false;
  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    // Persist the profile ONLY for non-app; app stays the implicit default so
    // existing configs (and validate's non-app hint) behave exactly as before.
    const cfg = profile === "non-app" ? { ...DEFAULT_CONFIG, profile } : DEFAULT_CONFIG;
    writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
    createdConfig = true;
  }
  const config = loadContext(projectRoot).config;
  // Effective profile: an explicit --non-app wins, else what the config records,
  // else app. It decides which template TREE we scaffold from.
  const effectiveProfile: StructureProfile =
    profile ?? (config.profile === "non-app" ? "non-app" : "app");
  // Applying --non-app to a config that predates it (or an app scaffold) records
  // the profile so validate/scaffold agree from now on.
  if (effectiveProfile === "non-app" && config.profile !== "non-app") {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      raw.profile = "non-app";
      writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n");
    } catch {
      /* leave as-is — validate still hints toward non-app */
    }
  }
  const tplBase = templateDir(effectiveProfile);
  const docsRel = config.docs ?? DEFAULT_CONFIG.docs;
  const docsDir = join(projectRoot, docsRel);
  const planDir = join(dirname(docsDir), "plan");

  mkdirSync(docsDir, { recursive: true });
  mkdirSync(planDir, { recursive: true });

  // ADAPT v2 · N1 (chủ quyền) — KHÔNG dời bất cứ thứ gì của repo.
  //
  // Bản trước gom `docs/planning` + `<root>/plan` + `<root>/planning` vào `docs/plan`
  // bằng `renameSync`. Với repo của CHÍNH mình thì tiện; với repo NGOÀI thì đó là tool
  // tự ý DỜI thư mục của người ta ngay trong `init`/`sync` — mất dữ liệu, và mâu thuẫn
  // thẳng với luật ADAPT mà chính bản này ship (*"Trùng tên với thứ có sẵn → đổi đường
  // HARNESS, không đổi thứ của repo"*). Đo trên 23 repo lớn (plan 08 §2): `plan/`·
  // `planning/` cấp 1 = 0/23, tức hành vi này gần như không giúp ai, nhưng khi nổ thì
  // nổ vào dữ liệu không dựng lại được.
  //
  // Nay: chỉ ĐỌC và BÁO. Thư mục cũ giữ nguyên tại chỗ; người/agent tự quyết có gộp hay
  // không. Đây là quyết định một chiều — không thêm cờ để bật lại hành vi dời.
  const legacyPlanDirs = [
    join(dirname(docsDir), "planning"), // docs/planning (nếp cũ của chính zemory)
    join(projectRoot, "plan"),
    join(projectRoot, "planning"),
  ].filter((d) => d !== planDir && existsSync(d));

  const added: string[] = [];
  const present: string[] = [];
  const entriesUnlinked: Array<{ file: string; pointer: string }> = [];
  const fill = (srcDir: string, destDir: string, prefix: string) => {
    if (!existsSync(srcDir)) return;
    for (const file of readdirSync(srcDir)) {
      const target = join(destDir, file);
      if (existsSync(target)) {
        present.push(prefix + file); // NEVER overwrite
        continue;
      }
      const content = readFileSync(join(srcDir, file), "utf8").replace(/<PROJECT>/g, projectName);
      writeFileSync(target, content);
      added.push(prefix + file);
    }
  };

  // Normalize legacy filenames first (mechanical rename, same content) so an
  // old-numbered project doesn't get permanently flagged non-standard below.
  // These docs: .md is the source; the DB index is rebuilt by project_root +
  // path) — renaming the file alone would leave the DB row pointing at a path
  // that no longer exists, so the doc.path row moves too, in the same step.
  if (existsSync(docsDir)) {
    const renamed: Array<[string, string]> = [];
    for (const [oldName, newName] of Object.entries(LEGACY_RENAME)) {
      const oldPath = join(docsDir, oldName);
      const newPath = join(docsDir, newName);
      if (existsSync(oldPath) && !existsSync(newPath)) {
        renameSync(oldPath, newPath);
        renamed.push([oldName, newName]);
      }
    }
    if (renamed.length > 0) {
      const db = openMemory();
      for (const [oldName, newName] of renamed) {
        db.prepare(
          `UPDATE doc SET path=? WHERE project_root=? AND path=?
             AND NOT EXISTS (SELECT 1 FROM doc WHERE project_root=? AND path=?)`,
        ).run(join(docsRel, newName), projectRoot, join(docsRel, oldName), projectRoot, join(docsRel, newName));
      }
      db.close();
    }
  }

  // App = mechanical only. Decide scaffold vs flag-for-agent:
  //   • empty docs           → scaffold the standard template (fresh).
  //   • only standard files  → gap-fill any missing standard ones (safe).
  //   • non-standard present → DON'T touch — flag needsReconcile; the agent
  //     reads docs/agent/03_STRUCTURE.md §8 and reconciles to standard
  //     (docs ls → rm dupes → render). Avoids the duplicate mess.
  const agentMd = existsSync(docsDir) ? readdirSync(docsDir).filter((f) => f.endsWith(".md")) : [];
  const nonStandard = agentMd.filter((f) => !STANDARD_AGENT.includes(f));
  let needsReconcile = false;
  if (agentMd.length === 0) {
    fill(join(tplBase, "agent"), docsDir, ""); // fresh scaffold (profile tree)
    fill(join(tplBase, "plan"), planDir, "plan/");
  } else if (nonStandard.length === 0) {
    fill(join(tplBase, "agent"), docsDir, ""); // all-standard → gap-fill missing only
  } else {
    needsReconcile = true; // existing non-standard docs → agent must reconcile
    for (const f of agentMd) present.push(f);
  }

  // Root entries — thin pointers only; the whole harness stays inside docs/.
  //   AGENTS.md  the cross-vendor standard (agents.md): read by Codex, Cursor,
  //              Copilot, Gemini CLI, Aider, Windsurf and ~60 others.
  //   CLAUDE.md  Claude Code reads CLAUDE.md and NOT AGENTS.md (its docs say so
  //              outright), so without this file the harness entry never
  //              auto-loads in Claude Code. It only imports AGENTS.md — one
  //              source, two doors, no duplicated content.
  for (const entry of ROOT_ENTRIES) {
    const src = join(tplBase, entry);
    const dst = join(projectRoot, entry);
    if (!existsSync(src)) continue;
    const fresh = readFileSync(src, "utf8").replace(/<PROJECT>/g, projectName);
    if (!existsSync(dst)) {
      writeFileSync(dst, fresh);
      added.push(entry);
    } else {
      const cur = readFileSync(dst, "utf8");
      // Refresh ONLY our own generated file (marker comment); never a user-authored one.
      if (cur.startsWith("<!-- zemory") && cur !== fresh) {
        writeFileSync(dst, fresh);
        added.push(`${entry} (refreshed)`);
      } else {
        present.push(entry);
      }
    }
  }
  // ADAPT v2 · 4.2 — bản RIÊNG của repo (43% repo lớn đã có AGENTS.md sẵn): KHÔNG ghi
  // đè (N1), nhưng cũng KHÔNG được lặn mất tăm như trước — entry không trỏ tới harness
  // thì mọi thứ bên trong không bao giờ được nạp, và không ai biết. Tính SAU vòng scaffold
  // để nối GIÁN TIẾP (CLAUDE.md → @AGENTS.md → harness) được nhìn thấy.
  {
    const agentRel = relative(projectRoot, docsDir).replace(/\\/g, "/");
    for (const st of entryStates(projectRoot, docsDir, ROOT_ENTRIES.map((e) => join(projectRoot, e)))) {
      if (st.state !== "unlinked") continue;
      entriesUnlinked.push({
        file: st.file,
        pointer: `> Harness của repo: đọc \`${agentRel}/\` (bắt đầu từ \`01_CONSTITUTION.md\`) trước khi làm việc.`,
      });
    }
  }

  // Skills — one folder per playbook under .claude/skills/ (Phase 3, 2026-07-31).
  // They live OUTSIDE docs/ because that is where Claude Code looks for them, and
  // they must be scaffolded here: 04_SKILLS is only a registry now, so skipping this
  // step would scaffold a harness whose registry names playbooks that do not exist.
  // Same never-overwrite rule as everything else, and `reference/`+`scripts/`
  // subfolders come along because a skill that lost its resources is a broken skill.
  const skillSrcRoot = join(tplBase, ".claude", "skills");
  if (existsSync(skillSrcRoot)) {
    const copyTree = (srcDir: string, dstDir: string, prefix: string) => {
      mkdirSync(dstDir, { recursive: true });
      for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
        const src = join(srcDir, entry.name);
        const dst = join(dstDir, entry.name);
        const rel = prefix + entry.name;
        if (entry.isDirectory()) {
          copyTree(src, dst, rel + "/");
          continue;
        }
        if (existsSync(dst)) {
          present.push(rel);
          continue;
        }
        writeFileSync(dst, readFileSync(src, "utf8").replace(/<PROJECT>/g, projectName));
        added.push(rel);
      }
    };
    copyTree(skillSrcRoot, join(projectRoot, ".claude", "skills"), ".claude/skills/");
  }

  rememberProject(projectRoot);
  return {
    createdConfig,
    added,
    present,
    docsRel,
    needsReconcile,
    untouchedLegacyPlan: legacyPlanDirs.map((d) => relative(projectRoot, d).replace(/\\/g, "/")),
    entriesUnlinked,
  };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export interface FreshResult extends AdoptResult {
  renamedTo: string | null;
  renamedPlanTo: string | null;
}

/**
 * Fresh adopt (option C): if the docs dir already has content, RENAME it aside
 * to `<docs>.old-<timestamp>` (nothing lost), then scaffold a clean standard set.
 * Use when you want a clean standard start but keep the originals around.
 */
export function freshHarness(projectRoot: string): FreshResult {
  let docsRel = DEFAULT_CONFIG.docs;
  const configPath = join(projectRoot, CONFIG_FILE);
  if (existsSync(configPath)) {
    docsRel = loadContext(projectRoot).config.docs ?? docsRel;
  }
  const docsDir = join(projectRoot, docsRel);
  const planDir = join(dirname(docsDir), "plan");

  let renamedTo: string | null = null;
  let renamedPlanTo: string | null = null;
  const suffix = stamp();
  if (existsSync(docsDir) && readdirSync(docsDir).length > 0) {
    renamedTo = `${docsDir}.old-${suffix}`;
    renameSync(docsDir, renamedTo);
  }
  if (existsSync(planDir) && readdirSync(planDir).length > 0) {
    renamedPlanTo = `${planDir}.old-${suffix}`;
    renameSync(planDir, renamedPlanTo);
  }
  const r = ensureHarness(projectRoot);
  return { ...r, renamedTo, renamedPlanTo };
}

// ── "Chấm than update" — phép đo DRY-RUN dùng chung cho doctor · daemon · hook (2026-08-21).
//
// Vì sao tồn tại (user chốt): repo mỗi lúc một nhiều, "gọi từng con áp update" không scale —
// cần mỗi repo TỰ THẤY mình cũ (pull-based, kiểu chấm than VSCode). Hàm này CHỈ ĐO, không ghi
// gì — hành động áp vẫn là `zemory sync` + `hook guard` do agent/user BÊN repo đó chạy
// (02_RULES §Phạm vi project: cấm ghi chéo; hook là lưới đỡ, không phải người quyết).
// Tiêu chí "thiếu" bám ĐÚNG ngữ nghĩa gap-fill của ensureHarness: file template mà repo chưa
// có (agent-standard · root entries · skills); file ĐÃ có thì file-wins, không tính.

export interface SyncCheckResult {
  /** false = repo không có marker — không phải repo harness, đừng nhắc gì. */
  connected: boolean;
  /** File của bộ chuẩn hiện hành mà repo này CHƯA có (sync sẽ gap-fill đúng các file này). */
  missing: string[];
  /** File chốt lớp ① đã sinh nhưng trôi khỏi bản `hook guard` hôm nay (guardDrift). */
  guardStale: string[];
}

export function syncCheck(projectRoot: string): SyncCheckResult {
  const out: SyncCheckResult = { connected: false, missing: [], guardStale: [] };
  try {
    const marker = readMarker(projectRoot);
    if (!marker) return out;
    out.connected = true;
    const profile = (marker.data as { profile?: unknown }).profile === "non-app" ? "non-app" : "app";
    const tplBase = templateDir(profile);
    const hp = harnessPathsAt(projectRoot);
    const agentSrc = join(tplBase, "agent");
    if (existsSync(agentSrc)) {
      for (const f of readdirSync(agentSrc)) {
        if (!existsSync(join(hp.agent, f))) out.missing.push(`agent/${f}`);
      }
    }
    for (const entry of ROOT_ENTRIES) {
      if (existsSync(join(tplBase, entry)) && !existsSync(join(projectRoot, entry))) out.missing.push(entry);
    }
    const walk = (srcDir: string, dstDir: string, prefix: string): void => {
      if (!existsSync(srcDir)) return;
      for (const e of readdirSync(srcDir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(srcDir, e.name), join(dstDir, e.name), `${prefix}${e.name}/`);
        else if (!existsSync(join(dstDir, e.name))) out.missing.push(prefix + e.name);
      }
    };
    walk(join(tplBase, ".claude", "skills"), join(projectRoot, ".claude", "skills"), ".claude/skills/");
    out.guardStale = guardDrift(projectRoot);
  } catch {
    /* fail-open — phép NHẮC không bao giờ được làm chết đường chính */
  }
  return out;
}
