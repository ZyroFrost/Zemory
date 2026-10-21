// ADAPT v2 · §4b — thang cưỡng chế: SINH bộ chốt chặn lớp ① từ marker.
//
// Vì sao phải là MÁY CHẶN chứ không phải chữ trong docs: ba sự cố đã đo bên repo tham
// chiếu (secret lên GitHub 2026-08-04 dù hiến pháp ĐÃ có chữ cấm · bản vá mất vì sống ở
// working tree · push thẳng nhánh chung) — tầng "agent đọc luật rồi tuân" sụp đúng chỗ
// đắt nhất, vì nó là quan sát-phát-hiện-sau, không ngăn được lúc xảy ra.
//
// Kiến trúc (bám bản mẫu chạy thật `harness/hooks/` của repo tham chiếu):
//   · `policy.json`        — MỘT nguồn luật lớp ①; mọi chốt cùng đọc, sửa luật một chỗ.
//   · `guard.cjs`          — PreToolUse: exit 2 = CHẶN trước khi hành động chạm đĩa/mạng,
//                            stderr trả về cho agent đọc. GENERIC — mọi thứ riêng-repo
//                            nằm trong policy.json, nên guard không cần sinh lại khi đổi luật.
//   · `precommit-guard.cjs`— chốt biên commit (chặn secret trong staging), phủ CẢ NGƯỜI.
// Bản mẫu viết guard bằng Python vì repo đó là dự án Python; ở đây sinh bằng Node —
// runtime DUY NHẤT chắc chắn có mặt trên repo đã cài zemory, khỏi đoán python/python3.
//
// Luật flag (một-lần): guard thấy flag ⇒ cho qua ⇒ XOÁ ngay — lần sau phải xin lại.
// Riêng nhóm secret KHÔNG có flag. Agent chỉ được tạo flag SAU khi user nói rõ trong phiên.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { LEGACY_READ_FIRST_FILE, READ_FIRST_FILE, READ_FIRST_SOURCE } from "./read-first-src.js";
import { SQL_GATE_FILE, SQL_GATE_SOURCE } from "./sql-gate-src.js";
import { RULE_HOOKS, SECRET_VALUES } from "./rule-hooks-src.js";
import { folderCoreFiles, isFolderHarness, isRetired, listParts, shelfDir, skillReadTriggers } from "./store.js";
import { CONS_REPO_FILE, SHELF } from "./harness-names.js";
import { consColumn } from "./cons-read.js";
import { repoRole } from "./region-links.js";

/**
 * Where the guard lives. File harness: `<agent>/../hooks`. Folder harness (plan/28 §0d · §0q): the folder of the read-first
 * rule (Rule_59) — the latch is part of the guard. A repo assembled before keeps the folder of the retired hook-guard rule
 * (Rule_55) while it still has it, so the hook command wired into its settings keeps pointing at a real file.
 */
export function hooksDirOf(root: string): string {
  const agent = harnessPathsAt(root).agent;
  if (!isFolderHarness(agent)) return join(agent, "..", "hooks");
  const parts = listParts(agent, SHELF.rules);
  const p = parts.find((x) => x.key === LEGACY_GUARD_RULE_KEY) ?? parts.find((x) => x.key === GUARD_RULE_KEY);
  return p ? p.dir : join(shelfDir(agent, SHELF.rules), "Rule_Gate_59_ReadFirst");
}

/** The rule whose folder holds the guard (by key, so a renamed folder is still found). */
const GUARD_RULE_KEY = "Rule_59";
const LEGACY_GUARD_RULE_KEY = "Rule_55";

/** Where one-use flags and the once-per-session memory live. File harness: the hooks folder. Folder harness: a git-ignored
 *  `.harness-state/` beside the agent folder — runtime state is not part of any rule. */
export function stateDirOf(root: string): string {
  const agent = harnessPathsAt(root).agent;
  return isFolderHarness(agent) ? join(agent, "..", ".harness-state") : hooksDirOf(root);
}

/** The hook files of one rule folder (`hook.cjs`, and one more per rule it took in: `hook-names.cjs` …), sorted. */
export function ruleHookFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => /^hook[\w-]*\.cjs$/.test(f)).sort();
  } catch {
    return [];
  }
}

/** Rule folders of a folder harness that carry hooks, repo-relative — guard.cjs calls every hook*.cjs in each. */
function ruleHookDirs(root: string): string[] {
  const agent = harnessPathsAt(root).agent;
  if (!isFolderHarness(agent)) return [];
  const out: string[] = [];
  for (const shelf of [SHELF.rules, SHELF.constitution] as const) {
    for (const p of listParts(agent, shelf)) {
      if (p.key === GUARD_RULE_KEY || p.key === LEGACY_GUARD_RULE_KEY || isRetired(p)) continue; // the dispatcher itself · a rule the repo declined
      if (ruleHookFiles(p.dir).length) out.push(relative(root, p.dir).replace(/\\/g, "/"));
    }
  }
  return out;
}

export interface GuardGenResult {
  /** Thư mục hooks (nhà của policy + guard + flags). */
  hooksDir: string;
  /** File vừa ghi mới. */
  added: string[];
  /** File đã có, giữ nguyên (không phải của zemory hoặc nội dung đã khớp). */
  kept: string[];
  /** Đường cấm ghi đang có hiệu lực (từ marker `protected`). */
  protectedWrite: string[];
}

/** Mẫu secret MẶC ĐỊNH — đúng bộ của bản mẫu, trừ các tên riêng của repo đó.
 *  `*.env` thêm 2026-08-20: bộ cũ chỉ có `.env`/`.env.*` nên `git add ipos_loader.env` /
 *  `prod.env` LỌT SẠCH trên mọi repo dùng mặc định (đo tái lập từ báo cáo repo PBI) —
 *  trong khi comment nhánh secret lại tự nhận "app/x.env vẫn bị bắt". File `<tên>.env`
 *  là hình dạng secret phổ biến nhất; tên mẫu (example/sample) đi qua secret_allow. */
// EXPORT để cổng nội dung của `template-parity` so bản ship cowork với đúng bộ mẫu này —
// policy.json ship từng bị sửa TAY (20/08) mà không cổng nào thấy (#12, user gật 21/08).
export const SECRET_DEFAULTS = [".env", ".env.*", "*.env", "*.pem", "*.ppk", "id_rsa*", "id_ed25519*", "*.key"];
export const SECRET_ALLOW_DEFAULTS = [".env.example", "example.env", "sample.env"];

const STORE_FILE_RE = /^queries\.(ts|js|mjs|cjs)$/;
const STORE_SKIP = new Set(["node_modules", "dist", ".git", "attic", "external", "docs_template", "data", "global-memory", "generated"]);
/** Named-SQL files (`<…>/store/queries.*`) of the repo, repo-relative posix — what rule 02-25's hook compares against.
 *  Bounded walk (depth 7, build/vendor/runtime trees skipped): this runs at `zemory hook guard` time, not per tool call. */
export function findSqlStores(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 7) return;
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const n of names) {
      if (STORE_SKIP.has(n) || n.startsWith(".")) continue;
      const p = join(dir, n);
      let isDir: boolean;
      try {
        isDir = statSync(p).isDirectory();
      } catch {
        continue;
      }
      if (isDir) walk(p, depth + 1);
      else if (STORE_FILE_RE.test(n) && /[\\/]store$/.test(dir)) out.push(relative(root, p).replace(/\\/g, "/"));
    }
  };
  walk(root, 0);
  return out.sort();
}

/** policy.json sinh từ marker — marker là nguồn, file này là DẪN XUẤT sinh lại được. */
function buildPolicy(root: string, hooksRel: string): Record<string, unknown> {
  let protectedWrite: string[] = [];
  let secretExtra: string[] = [];
  let secretAllowExtra: string[] = [];
  let allowedRoots: string[] = [];
  let allowedSqlServers: string[] = [];
  let repoGates: string[] = [];
  // readMarker: MỘT người đọc marker (đã lột BOM). Bản đầu tự parse ở đây và nuốt lỗi
  // im lặng — fixture Windows (Set-Content ghi BOM) đã chứng minh policy sinh ra MẤT
  // `protected` mà không ai hay. Marker hỏng ⇒ policy chỉ còn bộ mặc định (secret vẫn gác).
  const marker = readMarker(root);
  if (marker) {
    const j = marker.data as {
      protected?: unknown;
      secretNames?: unknown;
      secretAllow?: unknown;
      allowedRoots?: unknown;
      allowedSqlServers?: unknown;
      repoGates?: unknown;
    };
    const strs = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim()) : [];
    // A marker written for the file harness names `docs/agent/01_CONSTITUTION.md`; after the move to the folder harness
    // that file is gone and the prefix guarded nothing — measured 2026-10-15 on all 9 moved repos: every file under
    // `01_CONSTITUTION/` was writable. A protected `X.md` that no longer exists while `X/` does ⇒ protect the folder.
    protectedWrite = strs(j.protected).map((p) => {
      const folder = p.replace(/\.md$/i, "");
      if (folder === p || existsSync(join(root, p))) return p;
      try {
        return statSync(join(root, folder)).isDirectory() ? folder : p;
      } catch {
        return p;
      }
    });
    secretExtra = strs(j.secretNames);
    secretAllowExtra = strs(j.secretAllow);
    // Ngoài-project (2026-10-06): chỗ ghi ngoài repo user đã cho phép sẵn + máy chủ SQL được nhắm tới.
    allowedRoots = strs(j.allowedRoots);
    allowedSqlServers = strs(j.allowedSqlServers);
    // The repo's own gates for its constitution (Dept_FA 2026-10-07: they hand-edited .git/hooks/pre-commit to add one).
    repoGates = strs(j.repoGates);
  }
  // plan/29 §15: the constitution the repo wrote is the source — frame 10's `Server` column (servers SQL may reach) and
  // frame 14's `File` column (secret file names). The marker keys still count while repos move their values over.
  {
    const agent = harnessPathsAt(root).agent;
    allowedSqlServers = [...new Set([...allowedSqlServers, ...consColumn(agent, "Cons_Gate_10_ReadOnlySources", "Server")])];
    secretExtra = [...new Set([...secretExtra, ...consColumn(agent, "Cons_Gate_14_Access", "File")])];
  }
  // READ BEFORE WRITE (user 2026-10-08) — the set every session must have read in full before it acts, plus the files the
  // action itself needs (a case's spec · the AGENTS.md triggers a machine can recognise). Paths are repo-relative, posix.
  // docs/plan/* is NOT in the set any more (user 2026-10-14, plan/27 §5): plan invariants get gates, the rest is looked up
  // with `zemory plan search`. A repo that still wants its plan forced lists it under the marker key `readFirst`.
  const hp = harnessPathsAt(root);
  const relp = (p: string): string => relative(root, p).replace(/\\/g, "/");
  const agentRel = relp(hp.agent);
  const skillsRel = relp(hp.skills);
  const readFirstExtra = marker ? (Array.isArray((marker.data as { readFirst?: unknown }).readFirst) ? ((marker.data as { readFirst: unknown[] }).readFirst.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim().replace(/\\/g, "/"))) : []) : [];
  const isApp = ((marker?.data as { profile?: unknown } | undefined)?.profile ?? "app") === "app";
  // Only the sections that hold rules with no machine gate are forced (plan/27 §3): the 02 core, and in 01 the
  // read-carefully block, the articles it lists and "## Mục đích". A file without those markers is due in full.
  // 06_CHANGES left the set the same day — looked up with `zemory changelog search`.
  // Folder harness (plan/28 §0e): the core is not read by the agent — it is injected at session start — so only 05_TODO is
  // forced; the structure trigger points at the repo's INDEX.md.
  const folder = isFolderHarness(hp.agent);
  // The hooks are not listed: in the folder harness each hook lives in its rule folder, inside the harness folder
  // (plan/28 §0d), so protecting the harness folder protects them.
  const harnessWrite = [
    agentRel,
    relp(hp.plan),
    ...hp.entries.map(relp),
    ...(existsSync(join(root, "docs_template", "_Store")) ? ["docs_template/_Store"] : []),
  ].filter((p) => p && !p.startsWith(".."));
  const readFirst = {
    // + the laws no hook holds (folderCoreFiles, user 2026-10-18): judgment rules, the written constitution, own articles
    // without a full gate. A law with a hook is not forced: its block message carries the law.
    required: [relp(hp.todo), ...(folder ? folderCoreFiles(hp.agent).map(relp) : []), ...readFirstExtra],
    sections: folder
      ? []
      : [
          { file: `${agentRel}/02_RULES.md`, parts: ["core"] },
          { file: `${agentRel}/01_CONSTITUTION.md`, parts: ["no-gate", "no-gate-articles", "heading:Mục đích"] },
        ],
    case_root: "tasks",
    case_files: ["spec.md", "mail_form.md"],
    triggers: [
      { when: "new_dir", read: folder ? relp(join(shelfDir(hp.agent, SHELF.structure), "INDEX.md")) : `${agentRel}/03_STRUCTURE.md` },
      // Folder harness (plan/28 §0n): the doors are declared by the skills the repo really carries (gate.json › read) — a
      // repo without app-design has no frontend door. File harness: the built-in doors, until the repo moves.
      ...(folder
        ? skillReadTriggers(hp.skills, hp.agent).map(({ skill, source, ...t }) => ({
            ...t,
            // Any copy of the same skill counts (plan/28 §0o): the host build the agent is pointed at, the source in the
            // harness, the build kept inside the source — and the host loading the skill by name (`skill`).
            read: `${skillsRel}/${skill}/SKILL.md`,
            alt: source
              ? [relp(join(source, `${basename(source)}.md`)), relp(join(source, "SKILL.md")), relp(join(source, "Claude", skill, "SKILL.md"))]
              : [],
            skill,
          }))
        : [
            ...(isApp ? [{ when: "path_prefix", prefix: "frontend", read: `${skillsRel}/app-design/SKILL.md` }] : []),
            { when: "cmd_re", re: "(mail|smtp|email)[\\w.-]*\\.(py|ps1|js|mjs|cjs|cmd|bat)\\b", read: `${skillsRel}/write-style/SKILL.md` },
            // A sender named anything ("03_send.py"): read the script — and one hop into what a launcher calls (Dept_FA 2026-10-08).
            { when: "script_re", re: "smtplib|send-mailmessage|smtpclient|sendmail\\(|send_message\\(|graph_mail|smtp_mail|/sendMail\\b", read: `${skillsRel}/write-style/SKILL.md` },
          ]),
    ],
  };
  return {
    generator: "zemory",
    comment:
      "ONE source for the layer-1 rules (irreversible actions the machine can check). guard.cjs (PreToolUse) and precommit-guard.cjs both read this file. " +
      "Generated from the marker (.harness.json keys `protected`/`secretNames`/`secretAllow`/`allowedRoots`/`allowedSqlServers`/`repoGates`) — edit the marker, then run `zemory hook guard` to regenerate.",
    // Rule_Gate_79: the harness docs themselves are protected in every repo, declared or not — rules, constitution,
    // structure, skills, the rest of the harness folder, plan, hooks, the entry files, and the parts store of the repo that
    // carries it. The one-use flags in flags_dir are exempt (writing a flag is how the user's approval is recorded).
    protected_write: [...new Set([...protectedWrite, ...harnessWrite])],
    harness_write: harnessWrite,
    // the template's role says git is this repo's local backup (Struc_Repo_Dept: no remote, never pushed)
    git_local: repoRole(root)?.git === "local",
    // the repo's own fills inside the harness folder (plan/29 §13b): written freely; hook 02-83 keeps their shape
    fill_write: folder
      ? [relp(hp.todo), relp(hp.changes), `${agentRel}/${SHELF.constitution}/*/${CONS_REPO_FILE}`, `${agentRel}/${SHELF.skills}/Skill_Own_*`]
      : [relp(hp.todo), relp(hp.changes)],
    protected_write_reason: "a path declared `protected` in .harness.json — it belongs to the repo, the harness agent may not write into it",
    harness_write_reason:
      "the harness docs (Rule_Gate_79_HarnessEdit) — creating, editing, deleting or moving anything in them needs the user's approval in this session; the agent never creates a rule, article, slot, skill or layer on its own",
    secret_names: [...new Set([...SECRET_DEFAULTS, ...secretExtra])],
    secret_allow: [...new Set([...SECRET_ALLOW_DEFAULTS, ...secretAllowExtra])],
    secret_reason: "a secret must never enter a commit — there is NO flag to get past this (price already paid: a secret reached GitHub 2026-08-04)",
    // literal secret VALUES (not only secret file names) — one source for the 02-21 write hook and the pre-commit latch
    secret_values: SECRET_VALUES,
    // `*.key` CÓ MẶT ở đây dù bản mẫu gốc không có: nhất quán với secret_names — đã cấm
    // COMMIT thì cũng cấm ĐỌC vào transcript (phiên agent bị ingest vào DB rồi theo bundle
    // đi xa; chìa lọt vào transcript là kịch bản plan/16 §4 cấm). Đo thật trên zemory:
    // Read data/share.key từng đi qua êm vì thiếu đúng mẫu này.
    key_read_block: ["*.pem", "*.ppk", "id_rsa*", "id_ed25519*", "*.key"],
    key_read_reason: "the contents of a key file must never be read, returned or logged; the key PATH is only a path",
    // Ngoài-project (2026-10-06, sự cố `db-datawarehouse-15`: agent tạo DB + linked server, đổi
    // `max server memory` trên SQL local, ghi file ra ổ ngoài repo). Đường tương đối giải theo gốc repo.
    allowed_roots: allowedRoots,
    allowed_sql_servers: allowedSqlServers,
    // Commands precommit-guard.cjs runs after the secret check; non-zero exit blocks the commit.
    repo_gates: repoGates,
    // 02-59_read-first.cjs: what must be read IN FULL (per the session transcript) before writing / running in the repo. No flag.
    read_first: readFirst,
    // plan/27 §3: hooks for common rules a machine can see at the tool call (rule-hooks-src.ts) — each file named after its
    // rule, called by guard.cjs in this order. The block message quotes the rule from rules_file.
    rules_file: folder ? relative(root, shelfDir(hp.agent, SHELF.rules)).replace(/\\/g, "/") : `${agentRel}/02_RULES.md`,
    todo_file: relp(hp.todo),
    // File harness: the embedded rule hooks, written next to guard.cjs. Folder harness: none here — each rule folder carries
    // its own hook.cjs, listed in rule_dirs (plan/28 §0d).
    rule_hooks: folder ? [] : RULE_HOOKS.filter((h) => !h.folderOnly).map((h) => ({ file: h.file, rule: h.file.slice(0, h.file.indexOf("_")) })),
    rule_dirs: ruleHookDirs(root),
    // 02-25 (plan/27 §2g): the hook that blocks NEW inline SQL. Written only when the repo has a named-SQL store file —
    // a repo that has not adopted the rule is never blocked by surprise. No flag: the way through is adding the named query.
    ...(() => {
      const stores = findSqlStores(root);
      return stores.length
        ? { sql: { rule: "02-25", rules_file: `${agentRel}/02_RULES.md`, stores, code_ext: [".ts", ".tsx", ".js", ".mjs", ".cjs"],
            exclude: ["backend/test/", "backend/scripts/", "test/", "tests/", "scripts/", "attic/", "external/", "docs_template/"] } }
        : {};
    })(),
    outside_reason:
      "work stays INSIDE the project folder (Rule_Gate_44_RepoScope) — writing outside it, or making a SQL server write files or change its configuration, needs the user's word first",
    // hooks_dir = where guard.cjs sits (it walks back from there to the repo root); flags_dir = where .allow-* and .seen.json
    // live — the same folder in a file harness, `.harness-state/` in a folder harness.
    hooks_dir: hooksRel,
    flags_dir: folder ? relp(stateDirOf(root)) : hooksRel,
    flags: {
      push: ".allow-push",
      docs_write: ".allow-docs-write",
      git_add_all: ".allow-git-add-all",
      delete: ".allow-delete",
      // Huỷ việc CHƯA COMMIT (`git reset --hard` · `git checkout -- .`): `02_RULES §Git` đã
      // cấm bằng chữ từ lâu mà không có chốt — đo 2026-08-11 thì cả hai lệnh LỌT sạch.
      discard: ".allow-discard",
      // Ghi ĐÈ lên file đang có nội dung. User chốt 2026-08-11: *"cái 3 thì khi làm hỏi xác
      // nhận từ user trước khi làm thôi… vẫn hook để bảo đảm sẽ cảnh báo trước"* — nên đây
      // là cổng HỎI, không phải cổng cấm.
      overwrite: ".allow-overwrite",
      // Làm việc NGOÀI project: ghi ra đường tuyệt đối ngoài repo · SQL bắt máy chủ ghi file ·
      // SQL đổi cấu hình máy chủ / nhắm máy chủ ngoài `allowedSqlServers`. Một cờ cho cả ba nhánh.
      outside: ".allow-outside",
      // 02-38: a NEW open item in 05_TODO after the user said yes in the session.
      todo: ".allow-todo",
      // 02-82: ONE mail send the person allowed in the session.
      mail: ".allow-mail",
    },
    flags_comment:
      "A flag = the user approving ONE job. The guard lets it through, then STAMPS `ZEMORY-USED <command fingerprint> <timestamp>` " +
      "into the flag file itself — it is NOT deleted at once. Within 90 seconds THAT SAME command may be retried (a PreToolUse hook " +
      "cannot know whether the command really ran; another host layer blocking it would cost the flag for nothing). " +
      "Asking for a DIFFERENT job, or going past 90 seconds, REVOKES the flag and it must be requested again. An agent may only create a flag after " +
      "the user has said so explicitly in the session.",
  };
}

// ── guard.cjs — nguồn nhúng (như db.ts nhúng SQL). CHỈ stdlib, chạy mọi nơi có node. ──
const GUARD_SOURCE = `#!/usr/bin/env node
// PreToolUse guard - layer 1 (irreversible actions) - BLOCKS BEFORE anything touches disk or network.
// Generated by \`zemory hook guard\` (ADAPT v2 4b). The rules live in policy.json, which GUARDS THIS FILE -
// change a rule by changing the policy (or the marker, then regenerate), NOT this file.
// Claude Code hook protocol: stdin = JSON {tool_name, tool_input}; exit 0 = let through;
// BLOCK = JSON permissionDecision "deny" on stdout + exit 2 (stderr is handed back to the agent to read).
"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const os = require("node:os");

const HERE = __dirname;
const POLICY = JSON.parse(fs.readFileSync(path.join(HERE, "policy.json"), "utf8"));
// guard.cjs sits at <root>/<hooks_dir> => root = walk back from HERE by its depth (an older policy has only flags_dir,
// which was the same folder).
const ROOT = path.resolve(HERE, ...(POLICY.hooks_dir || POLICY.flags_dir).split("/").map(() => ".."));

// Block on BOTH channels. Measured 2026-10-14 (plan/28 §0m): on a machine without Git the host drops the exit
// code, so exit 2 alone lets the call through; the JSON decision on stdout blocks with or without Git.
// Why a flag that was on disk opened nothing (set by consumeFlag when it revokes one): said in the block, so nobody has to guess
// why a flag created a moment ago did not work (Dept_PUR 2026-10-19: "the flag works one time and not the next").
let FLAG_NOTE = "";
function deny(msg) {
  const why = String(msg).trim() + (FLAG_NOTE ? "\\n(" + FLAG_NOTE + ")" : "");
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } }));
  process.stderr.write(why + "\\n");
  process.exit(2);
}

// Window that lets ONE job be retried after its flag has been consumed (ms).
//
// Why it is needed: a PreToolUse hook only says LET THROUGH - it cannot know whether the command really ran.
// Measured 2026-08-20 while pushing 2.0.0: the guard let it through (eating the flag), then another host
// layer blocked the command => the command did NOT run and the flag was GONE, so the user had to
// create it again. The wrong direction here is 'ask again' rather than 'slip through' - safe, but real
// luc user vua dong y xong.
//
// 90 seconds: enough for one immediate retry, far shorter than the gap between two
// real decisions by the user. Once the window closes the flag is dead for good.
const FLAG_RETRY_MS = 90 * 1000;
// An approval belongs to the moment it was given: a flag created and never used within this window is stale (a session
// that stopped, a job dropped) and opens nothing. Measured 2026-10-19: a flag left unused by an earlier session let two
// writes into the store through in a later session that never asked.
const FLAG_FRESH_MS = 15 * 60 * 1000;

function consumeFlag(name, subject) {
  // A flag name MISSING from the policy means an OLD policy paired with a NEW guard (the cowork set is
  // carried by hand to other machines, so the two files are bound to be out of step at times). A missing
  // name counts as NO flag - it still BLOCKS, there is simply no way around. Blocking wrongly beats a silent hole.
  const file = (POLICY.flags || {})[name];
  if (!file) return false;
  const p = path.join(ROOT, POLICY.flags_dir, file);
  if (!fs.existsSync(p)) return false;

  // Fingerprint of the JOB being asked for: a flag opens only for THAT job, it does not open the door for
  // 90 seconds for anything at all. Change the command (push another branch, delete another folder) => a different fingerprint => revoked.
  const mark = crypto.createHash("sha1").update(String(subject || name)).digest("hex").slice(0, 16);
  let prev = "";
  try { prev = fs.readFileSync(p, "utf8"); } catch {}
  let m = /ZEMORY-USED ([0-9a-f]+) ([0-9]+)/.exec(prev);
  // A stamped flag created again (\`touch\` keeps the old text, only the mtime moves) is a NEW approval, not a leftover:
  // revoking it sent people round in circles - they had made the flag, the guard still said none (2026-10-17).
  if (m) {
    let mtime = 0;
    try { mtime = fs.statSync(p).mtimeMs; } catch {}
    if (mtime > Number(m[2]) + 2000) m = null;
  }
  if (m) {
    if (m[1] === mark && Date.now() - Number(m[2]) < FLAG_RETRY_MS) return true; // retry of the same job
    try { fs.unlinkSync(p); } catch {} // a different job or past the window => revoked, ask again
    FLAG_NOTE = "the flag " + file + " was there but already used " + Math.round((Date.now() - Number(m[2])) / 1000) + " s ago " +
      (m[1] === mark ? "(its retry window is 90 s)" : "for another job — a call blocked after taking it counts as that job") +
      "; it is revoked: create it anew for THIS job";
    return false;
  }
  if (!m) {
    let mtime = 0;
    try { mtime = fs.statSync(p).mtimeMs; } catch {}
    if (Date.now() - mtime > FLAG_FRESH_MS) {
      try { fs.unlinkSync(p); } catch {} // stale: never used while the approval was fresh => ask again
      FLAG_NOTE = "the flag " + file + " was there but created " + Math.round((Date.now() - mtime) / 60000) + " min ago and never used " +
        "(an approval holds 15 min); it is removed: create it anew";
      return false;
    }
  }
  // First time: do NOT delete at once, only stamp it used. The flag dies when the window closes or when
  // someone asks for a different job - so it is still 'one flag for one job', it merely forgives one retry.
  try {
    fs.writeFileSync(p, "ZEMORY-USED " + mark + " " + Date.now() + "\\n");
  } catch {
    try { fs.unlinkSync(p); } catch {} // cannot write => old behaviour: one use and done
  }
  return true;
}

// The sentence that points the way around. An OLD policy declaring no flag name used to print
// \`docs/hooks/undefined\`, telling people to create a file literally named "undefined" - a silent
// instruction bug that only surfaces when someone follows it. Now it says the policy is missing the name, and how to regenerate.
function flagTip(name) {
  const file = (POLICY.flags || {})[name];
  if (!file) return "\\n(This policy build does not declare the flag \`" + name + "\` => there is NO way around. Run \`zemory hook guard\` to regenerate the policy.)";
  return "\\nHas the user agreed? -> create the flag \`" + POLICY.flags_dir + "/" + file + "\` and try again (one use).";
}

function relToRoot(p) {
  const s = String(p).replace(/\\\\/g, "/");
  const root = ROOT.replace(/\\\\/g, "/");
  const rel = path.relative(root, s).replace(/\\\\/g, "/");
  if (rel && !rel.startsWith("..")) return rel;
  const base = root.replace(/\\/+$/, "").split("/").pop();
  const marker = "/" + base + "/";
  if (s.includes(marker)) return s.split(marker).slice(1).join(marker);
  return s.replace(/^\\/+/, "");
}

function globToRe(pat) {
  return new RegExp("^" + pat.replace(/[.+^$(){}|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*").replace(/\\?/g, ".") + "$", "i");
}
function nameMatches(rel, patterns) {
  const name = rel.split("/").pop() || "";
  return patterns.some((p) => globToRe(p).test(name));
}

// MOT hàm khop duy nhat cho CA HAI nhanh (ghi + xoa).
// Match a PREFIX (a fixed path) OR a GLOB (with \`*\`) - a glob can express what a prefix
// cannot: \`data/*/01_raw\` (the raw input of EVERY case, whose names are not known in advance).
// Without globs you would either list every case by hand (nobody can maintain that) or block all of \`data\`
// (which blocks 02_processing where the agent writes constantly => the gate gets ignored).
//
// WHY IT MUST BE SHARED: before 2026-08-24 the WRITE branch had globs while the DELETE branch had only prefixes, so
// declaring \`data/*/01_raw\` blocked writes but NOT deletes - exactly the silent-hole class. Two copies
// of the same matcher are certain to drift apart; now there is only one source.
function underProtected(rel, prefix) {
  const pre = String(prefix).replace(/\\/+$/, "");
  if (pre.includes("*")) return globToRe(pre).test(rel) || globToRe(pre + "/*").test(rel);
  return rel === pre || rel.startsWith(pre + "/");
}

// A one-use flag (or the once-per-session memory) in flags_dir: writing it is how an approval is recorded, so it is never
// a write into the harness docs (Rule_Gate_79), even when flags_dir sits inside them.
function isFlagFile(rel) {
  const d = String(POLICY.flags_dir || "").replace(/\\/+$/, "");
  return Boolean(d) && rel.startsWith(d + "/.");
}

// The reason a protected prefix is protected: the harness docs (Rule_Gate_79) or a path the marker declared.
function writeReason(prefix) {
  return (POLICY.harness_write || []).includes(prefix) ? POLICY.harness_write_reason : POLICY.protected_write_reason;
}

function checkWrite(rel) {
  if (nameMatches(rel, POLICY.secret_allow || [])) return;
  if (isFlagFile(rel)) return;
  for (const prefix of POLICY.protected_write || []) {
    const hit = underProtected(rel, prefix);
    // plan/29 §13b: what the repo fills in the harness (its ledgers, the Cons.md of each frame, its own skills) is the
    // repo's to write; the shape of those files is held by hook 02-83, not by this door
    if (hit && (POLICY.harness_write || []).includes(prefix) && (POLICY.fill_write || []).some((f) => underProtected(rel, f))) continue;
    if (hit) {
      if (consumeFlag("docs_write", rel)) return;
      deny("BLOCKED (guard layer 1): writing into \`" + prefix + "\` - " + writeReason(prefix) +
        "\\nDid the user approve it this session? -> create the flag \`" + POLICY.flags_dir + "/" + POLICY.flags.docs_write + "\` and try again (the flag is good for ONE use).");
    }
  }
}

function checkRead(rel) {
  if (nameMatches(rel, POLICY.key_read_block || [])) {
    deny("BLOCKED (guard layer 1): reading the key file \`" + rel + "\` - " + POLICY.key_read_reason);
  }
}

// ── WORKING OUTSIDE THE PROJECT (added 2026-10-06) ─────────────────────────────────────
//
// Incident (session db-datawarehouse-15): an agent in a data-warehouse repo created a database and a
// linked server, changed \`max server memory\` on the local SQL Server, and wrote files to a drive outside
// the repo. 02_RULES "Pham vi project" forbade all of it in WORDS; there was no latch. Three branches, ONE flag (\`outside\`):
//   1 writing to an ABSOLUTE path outside the repo (Write/Edit tools, redirection, move/copy, writer
//     commands such as mkdir/Set-Content/tee, interpreter payloads that write)
//   2 SQL that makes the SERVER write files (BACKUP ... TO DISK, RESTORE ... FROM DISK / WITH MOVE,
//     CREATE DATABASE ... FILENAME)
//   3 SQL that changes the server configuration (sp_configure, RECONFIGURE, linked servers,
//     CREATE/DROP/ALTER DATABASE), and - when the marker declares \`allowedSqlServers\` - any target server not on that list.
// Allowed without a flag: the repo itself, the OS temp folders (scratchpads live there), ~/.claude,
// /dev/null, /tmp, NUL, and every \`allowedRoots\` entry of the marker.
//
// 🔴 LIMIT - this is the easiest road closed, not a wall: only paths and SQL WRITTEN OUT in the command are
// seen. A path or SQL text built at runtime, read from a variable or a file, or sitting inside a script FILE
// (\`sqlcmd -i job.sql\`, \`python job.py\`) is invisible to a hook that reads a command string. Relative paths are
// not judged at all (cwd is the repo), so \`cd\` elsewhere and a relative write slips too.
const DEVICE_OK = /^(\\/dev\\/(null|stdout|stderr|tty)|nul|\\/tmp)$/i;

// Is the token an ABSOLUTE path? \`strict\` is for interpreter payloads, where a bare \`/x\` is far more often
// a regex or a comment than a path: there a POSIX path must have two clean segments.
function isAbsTok(t, strict) {
  if (/^[A-Za-z]:[\\\\/]/.test(t)) return true;
  if (/^(\\\\\\\\|\\/\\/)[^\\\\/\\s]+[\\\\/][^\\\\/\\s]+/.test(t)) return true;
  if (/^~([\\\\/]|$)/.test(t)) return true;
  if (!t.startsWith("/")) return false;
  return strict ? /^\\/[\\w.~-]+\\/[\\w.~\\/ -]*$/.test(t) : true;
}

// One spelling per place: Git Bash \`/d/x\` -> \`D:/x\`, \`~\` -> home, then the deepest EXISTING ancestor goes
// through realpathSync.native - that turns a Windows 8.3 short name (\`C:/Users/HUY~1.NGU/...\`) into the long
// one (\`C:/Users/huy.nguyen/...\`). Without it the same temp folder has two spellings and one of them is "outside".
// A UNC path skips realpath: an unreachable share can stall for seconds, and it is outside either way.
function canonPath(p) {
  let s = String(p);
  if (process.platform === "win32") {
    const m = /^\\/([A-Za-z])(\\/|$)/.exec(s);
    if (m) s = m[1] + ":/" + s.slice(3);
  }
  if (/^~([\\\\/]|$)/.test(s)) s = os.homedir() + s.slice(1);
  s = path.resolve(s);
  const norm = (x) => x.replace(/\\\\/g, "/").replace(/\\/+$/, "").toLowerCase();
  if (/^[\\\\/]{2}/.test(s)) return norm(s);
  const tail = [];
  let head = s;
  for (;;) {
    try { head = fs.realpathSync.native(head); break; } catch {}
    const up = path.dirname(head);
    if (up === head) break;
    tail.unshift(path.basename(head));
    head = up;
  }
  return norm(path.join(head, ...tail));
}

let OUTSIDE_OK = null;
function outsideRoots() {
  if (OUTSIDE_OK) return OUTSIDE_OK;
  const list = [ROOT, os.tmpdir(), process.env.TEMP, process.env.TMP, path.join(os.homedir(), ".claude")];
  for (const r of POLICY.allowed_roots || []) {
    const s = String(r);
    list.push(/^~/.test(s) || path.isAbsolute(s) ? s : path.resolve(ROOT, s));
  }
  OUTSIDE_OK = [...new Set(list.filter(Boolean).map(canonPath))];
  return OUTSIDE_OK;
}

// A variable set to a literal in the same command (\`$sp = "C:\\…"\` · \`S="/c/…"\` · \`S=/c/…\`, 2026-10-19) is replaced by its value;
// a value naming another variable is no literal and stays as written. $env:TEMP / %TEMP% at the start become the temp folder.
function literalExpander(bare) {
  const vars = {};
  for (const m of bare.matchAll(/(?:^|[\\s;&|(])\\$([A-Za-z_]\\w*)\\s*=\\s*(["'])([^"'\\n]+)\\2/g)) vars[m[1].toLowerCase()] = m[3];
  for (const m of bare.matchAll(/(?:^|[\\s;&|(])([A-Za-z_]\\w*)=(["'])([^"'\\n]+)\\2/g)) vars[m[1].toLowerCase()] = m[3];
  for (const m of bare.matchAll(/(?:^|[\\s;&|(])([A-Za-z_]\\w*)=([^\\s;&|"'$=]+)(?=[\\s;&|]|$)/g)) if (!(m[1].toLowerCase() in vars)) vars[m[1].toLowerCase()] = m[2];
  return (t) => String(t).replace(/\\$\\{?([A-Za-z_]\\w*)\\}?/g, (all, n) => (n.toLowerCase() in vars ? vars[n.toLowerCase()] : all))
    .replace(/^\\$env:(TEMP|TMP)/i, process.env.TEMP || "").replace(/^%(TEMP|TMP)%/i, process.env.TEMP || "");
}

// The folder a segment runs in: a \`cd\` / \`Set-Location\` / \`pushd\` segment moves it for the segments after it (2026-10-19:
// \`cd <scratch> && mkdir x\` was judged against the session's folder and blocked as a write into a protected path).
function segmentFolders(bare, expand) {
  let base = process.cwd();
  const out = new Map();
  for (const seg of splitSegments(bare)) {
    out.set(seg, base);
    const m = /^\\s*(?:cd|set-location|sl|pushd|chdir)\\s+(?:-path\\s+|-literalpath\\s+)?("[^"]+"|'[^']+'|\\S+)/i.exec(seg);
    if (m) {
      let d = expand(m[1].replace(/^["']|["']$/g, ""));
      if (process.platform === "win32") { const w = /^\\/([A-Za-z])(\\/|$)/.exec(d); if (w) d = w[1] + ":/" + d.slice(3); }
      if (/^~([\\\\/]|$)/.test(d)) d = os.homedir() + d.slice(1);
      if (d && d !== "-") base = path.resolve(base, d);
    }
  }
  return out;
}

// SCRATCH (plan/27 §2h c): what the agent made to work and may delete without asking - anything in the session's scratch folder
// (<tmp>/claude/<project>/<session>/scratchpad) and any path with a segment named _scratch_* (the one name for a temp file or
// folder the agent has to put elsewhere, a mkdtemp prefix included). Anything else still asks.
const SCRATCH_DIR = /\\/claude\\/[^/]+\\/[^/]+\\/scratchpad(\\/|$)/;
function isScratchPath(p) {
  const c = canonPath(p);
  if (/(^|\\/)_scratch_[^/]*(\\/|$)/.test(c)) return true;
  if (!SCRATCH_DIR.test(c)) return false;
  return [os.tmpdir(), process.env.TEMP, process.env.TMP].filter(Boolean).map(canonPath).some((r) => c.startsWith(r + "/"));
}
// The targets of the delete commands on a line, resolved to absolute paths: a quote glued to a word is dropped ("$S"/x -> $S/x),
// a variable set in the command and $TEMP / $TMP / $env:TEMP are expanded, a relative target is taken from the folder its
// segment runs in (cd), a Get-ChildItem -Filter is joined to its path, and the items of a pipeline ($_) are its source's.
const DEL_VALUE_PARAMS = /^-(erroraction|warningaction|informationaction|progressaction|errorvariable|warningvariable|outvariable|pipelinevariable|exclude|credential|stream|depth)$/i;
function deleteTargets(bare, cmds) {
  const expand0 = literalExpander(bare);
  const expand = (t) => expand0(t).replace(/\\$\\{?(?:env:)?(TEMP|TMP)\\}?/gi, (all, v) => process.env[v.toUpperCase()] || all);
  const folders = segmentFolders(bare, expand);
  const out = [];
  for (const seg of splitSegments(bare)) {
    const glued = seg.replace(/(["'])([^"'\\s]*)\\1(?=[^\\s;&|])/g, "$2").replace(/([^\\s"'])(["'])([^"'\\s]*)\\2/g, "$1$3");
    // a PowerShell block brace ({ Remove-Item … }) is no target, a \${VAR} is kept whole
    const toks = glued.split(/[\\s'"()]+/).map((t) => (/\\$\\{/.test(t) ? t : t.replace(/^\\{+|\\}+$/g, ""))).filter(Boolean);
    const at = toks.findIndex((t) => cmds.test(t.toLowerCase()));
    if (at < 0) continue;
    const here = folders.get(seg) || process.cwd();
    const rest = toks.slice(at + 1);
    let last = -1;
    for (let i = 0; i < rest.length; i++) {
      const t = rest[i];
      if (/^-(filter|include)$/i.test(t) && rest[i + 1]) {
        if (last >= 0) out[last] = path.join(out[last], expand(rest[i + 1]));
        i++;
        continue;
      }
      if (DEL_VALUE_PARAMS.test(t)) { i++; continue; }
      if (t.startsWith("-") || /^\\/[A-Za-z]$/.test(t) || /^\\$(_|psitem)\\b/i.test(t)) continue;
      if (cmds.test(t.toLowerCase()) || /^(foreach-object|%|where-object|\\?)$/i.test(t)) continue;
      let x = expand(t);
      if (process.platform === "win32") { const w = /^\\/([A-Za-z])(\\/|$)/.exec(x); if (w) x = w[1] + ":/" + x.slice(3); }
      out.push(isAbsTok(x, false) ? x : path.resolve(here, x));
      last = out.length - 1;
    }
  }
  return out;
}
const scratchOnly = (targets) => targets.length > 0 && targets.every(isScratchPath);

// A path token of a segment as an absolute path: variables expanded, a relative path joined to the segment's folder.
function inFolder(tok, base, expand) {
  let t = expand(String(tok).replace(/^["']|["']$/g, ""));
  if (process.platform === "win32") { const w = /^\\/([A-Za-z])(\\/|$)/.exec(t); if (w) t = w[1] + ":/" + t.slice(3); }
  if (!t || path.isAbsolute(t) || /^[A-Za-z]:/.test(t) || /^~/.test(t)) return t;
  return base === process.cwd() ? t : path.join(base, t);
}

function isOutside(tok, strict) {
  const t = String(tok).replace(/^["']|["']$/g, "").trim();
  if (!t || DEVICE_OK.test(t) || /^\\/tmp\\//i.test(t)) return false;
  // Inside an interpreter payload, \`/x/\` (one segment, slash-closed, optional flags) is a regex literal, not a folder at
  // the root of the disk.
  if (strict && /^\\/[^\\/\\s]+\\/[gimsuy]*$/.test(t)) return false;
  if (!isAbsTok(t, strict)) return false;
  const c = canonPath(t);
  return !outsideRoots().some((r) => c === r || c.startsWith(r + "/"));
}

// String literals that are only ARGUMENTS of a text operation are data, not a place being written. False block
// reported 2026-10-07 (session db-datawarehouse-fa): \`python -c "...s.replace('E:\\\\_retired','E:\\\\Legacy')..."\` edited
// two .md files INSIDE the repo and was blocked as "writing into E:\\_retired". \`os.path.join\` is NOT dropped - it
// builds write paths. The write call's own argument (\`open('C:/x','w')\`) is untouched, so a real outside write still blocks.
// An argument list may hold string literals WITH parentheses in them (\`.split("assert.match(r.say, /x/,")\`) — measured
// 2026-10-16: \`[^()]*\` stopped at the first "(" inside the string and the regex literal \`/02-10/\` reached the path check.
const TEXT_ARGS = String.raw\`\\((?:"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|[^()"'])*\\)\`;
function dropTextOps(s) {
  return String(s)
    // (?<!path): os.path.join / path.join build the write path and keep their arguments (2026-10-19, a write slipped through)
    .replace(new RegExp("(?<!path)\\\\.(replace|replaceAll|startswith|endswith|startsWith|endsWith|split|join|rsplit|find|rfind|index|count|includes|strip|lstrip|rstrip)\\\\s*" + TEXT_ARGS, "g"), ".$1()")
    .replace(new RegExp("\\\\b(re\\\\.sub|re\\\\.search|re\\\\.match|re\\\\.findall|print|console\\\\.log)\\\\s*" + TEXT_ARGS, "g"), "$1()");
}

function denyOutside(what, subject) {
  if (consumeFlag("outside", subject)) return;
  deny("BLOCKED (guard layer 1): " + what + " - " +
    (POLICY.outside_reason || "work stays inside the project folder (Rule_Gate_44_RepoScope)") + flagTip("outside"));
}

// Split a segment into words the way a shell would for quoting (quotes removed, spaces inside them kept),
// so \`"C:/Program Files/x"\` stays ONE path.
function shellWords(seg) {
  const out = [];
  let cur = "";
  let q = null;
  let had = false;
  for (const c of seg) {
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; had = true; continue; }
    if (/\\s/.test(c)) { if (cur || had) out.push(cur); cur = ""; had = false; continue; }
    cur += c;
  }
  if (cur || had) out.push(cur);
  return out;
}

// \`.\` / \`(local)\` / \`127.0.0.1\` / \`localhost\` are one machine; \`tcp:\` and \`,1433\` are transport, not identity.
function normServer(raw) {
  let s = String(raw || "").trim().replace(/^["']|["']$/g, "").replace(/\\\\+/g, "\\\\").toLowerCase();
  s = s.replace(/^(tcp|np|lpc):/, "").replace(/,\\s*\\d+$/, "");
  const cut = s.indexOf("\\\\");
  const host = cut < 0 ? s : s.slice(0, cut);
  const inst = cut < 0 ? "" : s.slice(cut);
  return (/^(\\.|\\(local\\)|localhost|127\\.0\\.0\\.1)$/.test(host) ? "localhost" : host) + inst;
}

// Target servers written out in the command: \`sqlcmd -S x\` / \`-Sx\` (case-sensitive: \`-s\` is sqlcmd's column
// separator), \`Invoke-Sqlcmd -ServerInstance x\`, and \`Server=x\` / \`Data Source=x\` in a connection string.
function sqlTargets(cmd, segs) {
  const out = [];
  const interp = segs.some((s) => SEG_INTERP.test(cmdWordOf(s)));
  const zones = interp && /\\b(sqlcmd|osql|bcp)\\b/i.test(cmd) ? [cmd] : segs.filter((s) => /^(sqlcmd|osql|bcp)$/.test(cmdWordOf(s)));
  let m;
  for (const z of zones) {
    const re = /(?:^|\\s)-S(?![A-Za-z]*Instance)\\s*("[^"]*"|'[^']*'|[^\\s"';|&]+)/g;
    while ((m = re.exec(z))) out.push(m[1]);
  }
  const re2 = /-ServerInstance\\s+("[^"]*"|'[^']*'|[^\\s"';|&]+)/gi;
  while ((m = re2.exec(cmd))) out.push(m[1]);
  const re3 = /\\b(?:Server|Data\\s+Source)\\s*=\\s*["']?([^;"'\\s]+)/gi;
  while ((m = re3.exec(cmd))) out.push(m[1]);
  return out.map(normServer).filter(Boolean);
}

// Drop ONLY the payload of -m/--message and heredocs (where false positives are born), keeping the rest intact.
// Dropping EVERY quoted string was a measured hole: a command wrapped in bash -c "..." was wiped clean =>
// the guard saw nothing => every layer-1 rule went silent.
function stripMessages(cmd) {
  let out = cmd.replace(/(?:-m|--message=?)\\s*(['"])[\\s\\S]*?\\1/g, " -m MSG ");
  out = out.replace(/<<-?\\s*(['"]?)(\\w+)\\1[\\s\\S]*?^\\2/gm, " HEREDOC ");
  return out;
}

// Read \`git\` as A COMMAND, not as a fragment of a path (fixed 2026-08-20, prompted by
// the PBI repo report plus a reproduction: \`cat .git/hooks/pre-push\` was read as "git push" => BLOCKED WRONGLY
// right when someone follows the \`hook guard\` instructions):
//   (?<!\\.)  — \`git\` after a dot is a path or a name (\`.git/hooks\` · \`repo.git\`), not the command
//   (?![\\\\/]) — \`git\` glued to \`/\` or \`\\\` is a path carrying on (\`.git/hooks/...\`)
// Van bat du 8 ca do 2026-08-20: \`git push\` · \`cd x && git push\` · \`/usr/bin/git push\` ·
// \`sudo git push\` · \`env A=1 git push\`. Do NOT use "first token of the line" — the last three cases would slip.
const GIT_CMD = "(?<!\\\\.)\\\\bgit\\\\b(?![\\\\\\\\/])";
// \`push\` must be ONE ARGUMENT, not a fragment of a longer name (and, measured 2026-08-22 by this very
// session): \`\\\\bpush\\\\b\` also matches a token INSIDE a file name because \`-\` and \`.\` are non-word characters, so
// \`git check-ignore -v docs/hooks/.allow-push\` was blocked as a real push command — that is, the very
// even the command that INSPECTS THE FLAG could not run. Requiring whitespace right before \`push\` catches only \`push\` in its real sense.
// \`push\` must also be git's SUBCOMMAND: only global options may stand between (\`git -C dir push\` · \`git --no-pager push\`).
// \`git stash push\` is a stash, not a push - it was blocked as one (2026-10-17).
const PUSH_ARG = "(?:\\\\s+(?:-[Cc]\\\\s+\\\\S+|--?[\\\\w-]+(?:=\\\\S+)?))*\\\\s+push\\\\b";

// ── COMMAND POSITION: match a TOKEN where a command belongs, not a string anywhere ─────
//
// Hole measured 2026-08-26 (hit three times in ONE real working session): the guard only scanned STRINGS, so a
// command name sitting inside a piece of PROSE was blocked too:
//     echo "=== git remote (not pushed) ==="   -> blocked by the git push rule
//     echo "trying rm -rf"                     -> blocked by the recursive delete rule
// Blocking wrongly leads straight to "a noisy gate is an ignored gate" (rule 7, .claude/skills/audit).
//
// The fix: split the line into SEGMENTS (outside quotes), read each segment's FIRST WORD as its
// command name, then scan only the segments where that name really IS the command. \`echo\` is never \`git\`.
//
// 🔴 MANDATORY EXCEPTION - INTERPRETERS: \`bash -c "…"\` · \`node -e "…"\` · \`python -c "…"\` carry
// the quoted content IS the real command. On meeting an interpreter (in ANY segment, including the last one in
// a pipe such as \`echo x | bash\`) we go back to scanning the WHOLE line as before - blocking wrongly beats a hole.
const SEG_WRAPPER = /^(sudo|doas|env|command|nohup|time|nice|exec)$/i;
const SEG_INTERP = /^(bash|sh|zsh|dash|ksh|pwsh|powershell|cmd|node|nodejs|python|python3|py|perl|ruby|deno|bun)$/i;

// Split on ; | & and newlines, BUT ignore a separator that sits inside quotes.
function splitSegments(cmd) {
  const out = [];
  let cur = "";
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      cur += c;
      if (c === q && cmd[i - 1] !== "\\\\") q = null;
      continue;
    }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === ";" || c === "\\n" || c === "&" || c === "|") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.filter((s) => s.trim());
}

// The command name of a segment: drop environment assignments (A=1), drop wrappers (sudo/env/…), take
// basename va bo nhay. \`/usr/bin/git\` -> \`git\`; \`env A=1 sudo git\` -> \`git\`.
function cmdWordOf(seg) {
  for (const raw of seg.trim().split(/\\s+/)) {
    const tok = raw.replace(/^["']|["']$/g, "");
    if (!tok) continue;
    if (/^[A-Za-z_][\\w]*=/.test(tok)) continue;
    const name = tok.replace(/\\\\/g, "/").split("/").pop() || "";
    if (SEG_WRAPPER.test(name)) continue;
    return name.toLowerCase();
  }
  return "";
}

// An interpreter segment CARRIES CODE when it takes code inline (\`-c\` · \`-e\` · \`--eval\` · \`-Command\` · \`/c\` · \`-\`) or names
// no script and so reads its code from stdin (\`echo … | bash\`). One that runs a script file or a module hands the rest
// of the line to that program as DATA: \`node tool.js '{"cmd":"rm build.log"}'\` deletes nothing (2026-10-19, a JSON
// payload was blocked as a delete). Flags inside quotes are data too; a quoted script name stays "carries code".
function interpCarriesCode(seg) {
  const toks = seg.replace(/'[^']*'|"(?:[^"\\\\]|\\\\.)*"/g, " Q ").trim().split(/\\s+/);
  const at = toks.findIndex((t) => SEG_INTERP.test(t.replace(/\\\\/g, "/").split("/").pop() || ""));
  if (at < 0) return true;
  const rest = toks.slice(at + 1);
  if (rest.some((t) => /^(-c|-e|--eval|-p|--print|-command|-encodedcommand|-ec|\\/c|\\/k|-)$/i.test(t) || /^--eval=/i.test(t))) return true;
  if (rest.some((t) => /\\.(c?js|mjs|ts|py|sh|ps1|pl|rb)$/i.test(t) || /^(-m|-file)$/i.test(t))) return false;
  return true;
}

// The region a rule MUST SCAN. An interpreter that carries code means the whole line. Otherwise only the segments with
// that name.
function zonesFor(cmd, nameRe) {
  const segs = splitSegments(cmd);
  if (segs.some((s) => SEG_INTERP.test(cmdWordOf(s)) && interpCarriesCode(s))) return [cmd];
  return segs.filter((s) => nameRe.test(cmdWordOf(s)));
}
const hitsIn = (cmd, nameRe, re) => zonesFor(cmd, nameRe).some((z) => re.test(z));

// Does any segment put that command name in COMMAND POSITION. Used by rules whose pattern SPANS a pipe
// (\`Get-ChildItem -Recurse | Remove-Item\`): cutting the segment at \`|\` leaves neither half matching —
// a regression measured on the day of the 2026-08-26 fix. So: command position decides WHETHER to
// scan, and once it scans, it scans THE WHOLE LINE.
const anyCmdIs = (cmd, nameRe) => splitSegments(cmd).some((s) => nameRe.test(cmdWordOf(s)));

// ── PUSH WITH A VERSION ALREADY ON UPSTREAM (added 2026-10-07, rule audit) ───────────────────
// 02_RULES §Git: every push that carries CODE carries a NEW version. Measured 2026-09-24: three commits all declared
// 3.5.0, so the other machine's \`selfupdate\` compared numbers, saw "same", and never pulled the fix. Docs-only pushes are
// exempt (the rule says so). No flag: the fix is to bump the number, not to ask permission. Fail-open on any git error.
function versionClash() {
  try {
    const pkgPath = path.join(ROOT, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const mine = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
    if (!mine) return null;
    const { execFileSync } = require("node:child_process");
    const git = (...a) => String(execFileSync("git", ["-C", ROOT, ...a], { windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 })).trim();
    const up = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
    if (!up) return null;
    let theirs = null;
    try { theirs = JSON.parse(git("show", up + ":package.json")).version; } catch { return null; }
    if (theirs !== mine) return null;
    const touched = git("diff", "--name-only", up + "..HEAD").split(/\\r?\\n/).filter(Boolean);
    const code = touched.filter((f) => !/^(docs\\/|docs_visual\\/|README|CHANGELOG|.*\\.md$)/i.test(f));
    return code.length ? { version: mine, upstream: up, files: code.length } : null;
  } catch {
    return null;
  }
}

function checkBash(cmd) {
  const bare = stripMessages(cmd);

  // A repo whose git is its local backup (template role git: local — the department repos): it has no remote and is never
  // pushed; copies to other machines go through zemory's backup and Syncthing. No flag: the user settled it for the role.
  if (POLICY.git_local && hitsIn(bare, /^git$/, /\\bgit\\s+(?:-[A-Za-z]\\s+\\S+\\s+)*(push\\b|remote\\s+(add|set-url)\\b)/)) {
    deny("BLOCKED (guard layer 1): this repo's git is its LOCAL BACKUP - no remote, never pushed (its template's role: git local). " +
      "Commit as often as you like; another machine gets the repo through zemory's backup and Syncthing, not git. There is no flag for this.");
  }

  if (hitsIn(bare, /^git$/, new RegExp(GIT_CMD + PUSH_ARG))) {
    const clash = versionClash();
    if (clash) {
      deny("BLOCKED (guard layer 1): \`git push\` carries code but package.json still says " + clash.version +
        ", the same version as " + clash.upstream + " (" + clash.files + " code file(s) in the push) - bump the version first (Skill_Dev_Release: every push of code carries a NEW version; docs-only pushes are exempt). There is no flag for this.");
    }
    if (!consumeFlag("push", bare)) {
      deny("BLOCKED (guard layer 1): \`git push\` - push only when the user says so (Rule_Gate_50_Git)." +
        "\\nDid the user just say so? -> create the flag \`" + POLICY.flags_dir + "/" + POLICY.flags.push + "\` and run again (one use).");
    }
  }

  if (hitsIn(bare, /^git$/, new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\bcommit\\\\b[^\\\\n;|&]*(--no-verify|\\\\s-n\\\\b)"))) {
    deny("BLOCKED (guard layer 1): \`git commit --no-verify\` bypasses pre-commit - there is no way around.");
  }

  if (hitsIn(bare, /^git$/, new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\badd\\\\b[^\\\\n;|&]*(\\\\s-A\\\\b|\\\\s--all\\\\b|\\\\s\\\\.\\\\s*($|;|&|\\\\|))"))) {
    if (!consumeFlag("git_add_all", bare)) {
      deny("BLOCKED (guard layer 1): \`git add -A/.\` - this very command put a secret on GitHub (2026-08-04)." +
        "\\nList the files explicitly; if you truly need the whole tree, ask the user to create the flag \`" +
        POLICY.flags_dir + "/" + POLICY.flags.git_add_all + "\` (one use).");
    }
  }

  // Secrets entering staging or a commit. Two deliberate boundaries (fixed 2026-08-20):
  //   · scan ONLY the tokens of the EXACT SEGMENT holding the git command (split on ;|&) — a secret name mentioned
  //     inside \`echo "example.env staged"\` on the same command line is no longer blocked wrongly (it used to scan
  //     the whole line; people then learn to stop writing self-checking commands, and that is the real damage).
  //   · \`git add "app/x.env"\` is STILL caught (quotes are only separators within that segment).
  //     ⚠ This claim was once WRONG because the pattern set lacked \`*.env\` — now re-measured with the new set.
  const GIT_STAGE = new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\b(add|commit|mv)\\\\b");
  if (GIT_STAGE.test(bare)) {
    for (const seg of bare.split(/[\\n;|&]+/)) {
      if (!GIT_STAGE.test(seg)) continue;
      for (const tok of seg.split(/[\\s'"]+/)) {
        const name = tok.replace(/\\\\/g, "/").split("/").pop();
        if (!name) continue;
        if (nameMatches(name, POLICY.secret_allow || [])) continue;
        if (nameMatches(name, POLICY.secret_names || [])) {
          deny("BLOCKED (guard layer 1): \`" + name + "\` matches a secret pattern inside a git command - " + POLICY.secret_reason);
        }
      }
    }
  }

  // XOA - nhanh HEP CO CHU DICH (them 2026-08-10).
  //
  // Why it did not exist before: guard 1.2.0 generated 5 branches, none about deletion. A real test
  // tren ban do: \`rm -rf docs/agent\`, \`Remove-Item -Recurse -Force data\`, \`del /S /Q\`
  // all returned rc=0 and slipped clean through. Meanwhile 02_RULES Behaviour states plainly that deletion is
  // IRREVERSIBLE and the user must be asked first - the rule had words but no machine latch.
  //
  // Why NARROW rather than blocking every delete: an agent deletes temp files all day; blocking them all
  // means every command needs a flag, and "a noisy gate is an ignored gate" (02_RULES). So it blocks
  // only the two things that truly cannot be undone:
  //   (a) a RECURSIVE or mass delete - one command sweeping the whole tree
  //   (b) deleting exactly a declared \`protected\` path, or one matching a secret pattern - even without recursion
  const RECURSIVE_DEL =
    /\\brm\\b[^\\n;|&]*\\s-[a-z]*r[a-z]*\\b|\\bRemove-Item\\b[^\\n;|&]*-Recurse\\b|\\brmdir\\b[^\\n;|&]*\\/[sS]\\b|\\bdel\\b[^\\n;|&]*\\/[sS]\\b/;
  const ANY_DEL = /\\brm\\b|\\bRemove-Item\\b|\\brmdir\\b|\\bdel\\b|\\bUnlink\\b/;
  // MASS DELETION THAT USES NONE OF THE KEYWORDS ABOVE (added 2026-08-11 after measuring a 28-case matrix).
  // The old branch only looked at \`rm -r\` and friends; in practice 8 whole-tree paths slipped clean through:
  // \`find -delete\` · \`find -exec rm\` · \`git clean -fdx\` · \`robocopy /MIR\` (mirror =
  // deletes what the source does not have) · \`fs.rmSync(recursive)\` inside \`node -e\` · \`shutil.rmtree\`
  // inside \`python -c\` · \`xargs rm\` · \`Get-ChildItem -Recurse | Remove-Item\` (a pipe, with
  // no path to match against). All are as irreversible as \`rm -rf\`.
  const MASS_DEL =
    /\\bfind\\b[^\\n]*\\s-delete\\b|\\bfind\\b[^\\n]*\\s-exec[^\\n]*\\brm\\b|\\bgit\\s+clean\\b[^\\n]*-[a-z]*[fdx]|\\brobocopy\\b[^\\n]*\\/(MIR|PURGE)\\b|\\brmSync\\s*\\([^)]*recursive|\\brmtree\\s*\\(|\\bxargs\\b[^\\n]*\\brm\\b|\\bGet-ChildItem\\b[^\\n]*\\|[^\\n]*\\bRemove-Item\\b/i;
  const MASS_CMDS = /^(find|git|robocopy|xargs|get-childitem|gci|ls|dir|remove-item|ri|rm)$/;
  // a sweep of the agent's own scratch (the session's folder, a _scratch_* path) is no user data: no flag (plan/27 §2h c)
  const MASS_TARGET_CMDS = /^(find|get-childitem|gci|ls|dir|remove-item|ri|rm|rmdir|rd|del|erase|xargs)$/;
  if ((anyCmdIs(bare, MASS_CMDS) || SEG_INTERP.test(cmdWordOf(bare))) && MASS_DEL.test(bare) &&
      !scratchOnly(deleteTargets(bare, MASS_TARGET_CMDS)) && !consumeFlag("delete", bare)) {
    deny("BLOCKED (guard layer 1): MASS deletion (a whole-tree sweep) - irreversible, and Rule_Gate_10_DestructiveOps requires asking the user first." +
      flagTip("delete"));
  }

  // DISCARDING UNCOMMITTED WORK - the rule already had WORDS in 02_RULES S Git ("no reset --hard/clean on
  // the user's uncommitted work without asking") but measured 2026-08-11 there was NO latch: both
  // \`git reset --hard\` and \`git checkout -- .\` sailed through. Losing uncommitted work is losing it
  // for good - git cannot rescue what never entered git.
  const DISCARD =
    // \`git restore --staged <path>\` only unstages (the index); it discards work when it also touches the working tree
    // (--worktree / -W, or no --staged at all) — 2026-10-19, an unstage was blocked as a discard
    /\\bgit\\s+reset\\b[^\\n]*--hard\\b|\\bgit\\s+checkout\\b[^\\n]*--\\s|\\bgit\\s+checkout\\s+\\.|\\bgit\\s+restore\\b(?=[^\\n;&|]*(?:--worktree|\\s-W\\b))|\\bgit\\s+restore\\b(?![^\\n;&|]*(?:--staged|\\s-S\\b))|\\bgit\\s+stash\\s+(drop|clear)\\b/;
  if (hitsIn(bare, /^git$/, DISCARD) && !consumeFlag("discard", bare)) {
    deny("BLOCKED (guard layer 1): a command DISCARDING uncommitted work - Rule_Gate_50_Git requires asking the user first." +
      flagTip("discard"));
  }

  // EMPTYING CONTENT without "deleting" the file. By the irreversibility test it equals a
  // deletion: the file is still there but its insides are gone. Only two commands are taken, ones with no
  // purpose other than emptying - so the gate does not become noise.
  //   Deliberately LEFT THROUGH (reported, not blocked): \`> file\` and \`echo '' > file\` (output redirection
  //   is an everyday operation, blocking it is daily noise) and \`mv\` (renaming and tidying a repo is
  //   ordinary work). Blocking those would require telling "overwrite an EXISTING repo file" apart from "create a
  //   new file", and that is its own job - do not stuff it in here for completeness.
  if (hitsIn(bare, /^(truncate|clear-content)$/, /\\btruncate\\b[^\\n]*-s\\s*0\\b|\\bClear-Content\\b/) && !consumeFlag("overwrite", bare)) {
    deny("WARNING (guard layer 1): a command EMPTYING a file - the old content is gone for good." +
      "\\nASK THE USER first." + flagTip("overwrite"));
  }

  // Names of REAL delete commands (not \`echo\`/\`grep\` merely mentioning the letters "rm"). \`unlink\` has both forms.
  const DEL_CMDS = /^(rm|remove-item|ri|rmdir|rd|del|erase|unlink)$/;
  if (hitsIn(bare, DEL_CMDS, ANY_DEL)) {
    const recursive = hitsIn(bare, DEL_CMDS, RECURSIVE_DEL);
    // Ask for the ONE-USE flag for the whole command line, then remember it: \`consumeFlag\` has side effects (stamping
    // and revoking), so calling it per token wastes I/O and reads badly. One flag serves
    // BOTH the protected branch AND the recursive-delete branch - the user does not ask twice for one command.
    let delFlagMemo = null;
    const delFlagOk = () => (delFlagMemo === null ? (delFlagMemo = consumeFlag("delete", bare)) : delFlagMemo);
    // Scan ONLY the tokens of the EXACT SEGMENT holding the delete command (split on ;|&) — same shape and same reason
    // the same as the git branch above (fixed 2026-08-24, user approved 21/08): rm build.log && echo check-prod.env
    // was once BLOCKED WRONGLY because an .env name was mentioned in an echo. Scanning the whole line teaches people
    // to stop writing self-checking commands — that is the real damage. RECURSIVE_DEL still examines the WHOLE command.
    for (const seg of bare.split(/[\\n;|&]+/)) {
      if (!ANY_DEL.test(seg)) continue;
      for (const tok of seg.split(/[\\s'"]+/)) {
      if (!tok || tok.startsWith("-") || tok.startsWith("/")) continue;
      const rel = tok.replace(/\\\\/g, "/").replace(/^\\.\\//, "");
      const name = rel.split("/").pop();
      if (name && !nameMatches(name, POLICY.secret_allow || []) && nameMatches(name, POLICY.secret_names || [])) {
        deny("BLOCKED (guard layer 1): a delete command touching the secret file \`" + name + "\` - " + POLICY.secret_reason);
      }
      for (const prefix of POLICY.protected_write || []) {
        // The SAME function as the write branch - see \`underProtected\`. This spot used to compare prefixes only.
        if (underProtected(rel, prefix)) {
          // 🔴 BLOCK, THEN ASKING IS ALLOWED (user ruling 2026-09-04). This spot used to \`deny()\`
          // ABSOLUTELY, with no way around at all - not even \`.allow-delete\`. That was wrong on two counts:
          //   1 INCONSISTENT with the branch right below: \`mv <protected>/x /tmp\` has
          //      EXACTLY the same consequence as deleting (that branch's own comment says so) and it DOES have a way around.
          //      Two paths, one consequence, two different gates => people learn to take the \`mv\` road.
          //   ② Trai doctrine \`02_RULES §Guardrail\`: *chu la tang QUYET DINH, may la tang DO
          //      SHORT*. A gate with no path for the user to approve is the machine acting as THE DECIDER.
          // Use the \`delete\` flag and NOT \`docs_write\`: a round where the user approved WRITING to a
          // protected path must not turn into approval to DELETE. The fingerprint follows the COMMAND, so one flag covers
          // tron lenh xoa do (cung khuon vua vá cho nhanh doi ten).
          // ⚠ Do NOT \`return\` here: it would exit the WHOLE guard function, skipping the secret check
          // on the remaining tokens, the RECURSIVE delete check, and the \`mv\`/redirection branch
          // below - meaning one delete flag would open the door for everything else on the same command line.
          if (!delFlagOk()) {
            deny("BLOCKED (guard layer 1): deleting inside the protected path \`" + prefix + "\` - " +
              writeReason(prefix) + flagTip("delete"));
          }
        }
      }
      }
    }
    const targets = deleteTargets(bare, DEL_CMDS);
    if (recursive && !scratchOnly(targets) && !delFlagOk()) {
      deny("BLOCKED (guard layer 1): a RECURSIVE delete - an irreversible operation, and Rule_Gate_10_DestructiveOps requires asking the user first." +
        flagTip("delete"));
    }
    // 02-10 (plan/27 §2h, 2026-10-14): EVERY delete of a file in the repo needs the user's word first. This withdraws the
    // 2026-08-11 exception ("one ordinary file is let through to keep the gate quiet"). Exempt: the OS temp folder, where
    // the session scratchpad lives. A target the guard cannot resolve (a variable) counts as IN the repo - closed, not
    // open, because a delete cannot be undone.
    if (!recursive) {
      const tempRoots = [os.tmpdir(), process.env.TEMP, process.env.TMP].filter(Boolean).map(canonPath);
      // The targets come from deleteTargets: a variable set to a literal in the same command, $TEMP / $env:TEMP, the folder
      // a \`cd\` moved to, a quote glued to a word - all resolved, so a target is judged by its real path (2026-10-19 · 10-21:
      // repos blocked from emptying their own scratch folder). A variable with no literal value stays unresolved => blocked.
      const inRepo = targets.filter((t) => {
        if (/^\\/tmp\\//i.test(t)) return false;
        if (isScratchPath(t)) return false;
        // a one-use flag in the flags folder: deleting it only takes a permission away (2026-10-19 — asking for a delete
        // flag to remove a dead flag left a new dead flag behind, round after round)
        if (isFlagFile(path.relative(ROOT, path.resolve(ROOT, t)).replace(/\\\\/g, "/"))) return false;
        // a file of the repo stays a file of the repo even when the repo itself sits in the temp folder: the temp exemption
        // is for things outside the repo (a resolved relative target used to land under tempRoots and pass - 2026-10-21)
        const inRoot = canonPath(path.resolve(ROOT, t));
        const rootC = canonPath(ROOT);
        if (inRoot === rootC || inRoot.startsWith(rootC + "/")) return true;
        if (!isAbsTok(t, false)) return true;
        const c = canonPath(t);
        return !tempRoots.some((r) => c === r || c.startsWith(r + "/"));
      });
      if (inRepo.length && !delFlagOk()) {
        deny("BLOCKED (guard layer 1): Rule_Gate_10_DestructiveOps - deleting \`" + inRepo[0] + "\` - a delete cannot be undone, ask the user first." +
          flagTip("delete"));
      }
    }
  }
  // 02-10 by other doors: \`git rm\` (except \`--cached\`, which only untracks) and a single-file delete inside an interpreter.
  if (hitsIn(bare, /^git$/, /\\bgit\\s+rm\\b/) && !/\\bgit\\s+rm\\b[^\\n;|&]*--cached\\b/.test(bare) && !consumeFlag("delete", bare)) {
    deny("BLOCKED (guard layer 1): Rule_Gate_10_DestructiveOps - \`git rm\` deletes the file, ask the user first." + flagTip("delete"));
  }
  if (SEG_INTERP.test(cmdWordOf(bare)) && /\\b(unlinkSync|rmSync|unlink)\\s*\\(|\\bos\\.(remove|unlink)\\s*\\(|\\.unlink\\s*\\(\\s*\\)/.test(bare) &&
      !consumeFlag("delete", bare)) {
    deny("BLOCKED (guard layer 1): Rule_Gate_10_DestructiveOps - a script deleting a file, ask the user first." + flagTip("delete"));
  }

  // ── PLAN INVARIANTS (plan/27 §0b, 2026-10-14) ─────────
  // HP 3: the source rows of the memory store (\`sessions\` / \`messages\`) are never removed or rewritten by a hand-typed
  // statement; optimising touches only the derived layers. Caught: sqlite3 or an interpreter, a \`global_memory*.db\` on the
  // line, and DELETE / UPDATE / DROP aimed at one of those two tables.
  const SRC_ROWS = /\\b(delete\\s+from|update|drop\\s+table(\\s+if\\s+exists)?)\\s+["\x60\\[]?(sessions|messages)\\b/i;
  if (/global_memory[\\w.-]*\\.db/i.test(bare) && SRC_ROWS.test(bare) &&
      (anyCmdIs(bare, /^sqlite3(\\.exe)?$/) || SEG_INTERP.test(cmdWordOf(bare))) && !consumeFlag("delete", bare)) {
    deny("BLOCKED (guard layer 1): HP 3 - a hand-typed DELETE / UPDATE / DROP on the source rows (sessions / messages) of the " +
      "memory store; source rows are never removed or rewritten, optimising touches only derived layers." + flagTip("delete"));
  }
  // HP 2 / 7: the memory store, the share key and runtime data never land in a cloud-synced folder - the DB travels only
  // through the app's own channel, never as a file.
  const CLOUD_DIR = /(onedrive|google\\s*drive|my\\s*drive|dropbox|icloud\\s*drive|iclouddrive)/i;
  const CLOUD_SRC = /(\\.db(-wal|-shm)?|\\.sqlite3?|share\\.key)$|(^|[\\\\/])(data|global-memory)([\\\\/]|$)/i;
  for (const seg of splitSegments(bare)) {
    const word = cmdWordOf(seg);
    if (!/^(mv|move|move-item|mi|cp|copy|copy-item|robocopy|rsync|xcopy)$/.test(word)) continue;
    // Quote-aware: a cloud folder name usually holds spaces (\x60OneDrive - Company\x60).
    const args = (seg.trim().match(/"[^"]*"|'[^']*'|\\S+/g) || []).slice(1).map((t) => t.replace(/^["']|["']$/g, ""))
      .filter((t) => t && !t.startsWith("-") && !/^\\/[A-Za-z]+$/.test(t));
    if (args.length < 2) continue;
    // robocopy puts the source first and the destination second; every other mover puts the destination last.
    const dest = word === "robocopy" ? args[1] : args[args.length - 1];
    const srcs = word === "robocopy" ? [args[0], ...args.slice(2)] : args.slice(0, -1);
    if (CLOUD_DIR.test(dest) && srcs.some((a) => CLOUD_SRC.test(a.replace(/[\\\\/]+$/, ""))) &&
        !consumeFlag("outside", bare)) {
      deny("BLOCKED (guard layer 1): HP 2, 7 - copying the memory store / the share key / runtime data into a cloud folder (\x60" +
        dest + "\x60); it travels only through the app's own channel, never as a file." + flagTip("outside"));
    }
  }
  // The machine's REAL Syncthing (REST on 8384) belongs to the user; tests use their own instance. Reads (GET) pass.
  if (/(127\\.0\\.0\\.1|localhost|\\[::1\\]):8384\\b/i.test(bare) &&
      /(-X\\s*|--request\\s+|-Method\\s+)["']?(POST|PUT|PATCH|DELETE)\\b|\\s(-d|--data[\\w-]*|-Body)\\s/i.test(bare) &&
      !consumeFlag("outside", bare)) {
    deny("BLOCKED (guard layer 1): a write to this machine's real Syncthing (REST on 8384) - it is the user's own " +
      "instance; tests start their own on another port." + flagTip("outside"));
  }

  // ── WRITING / MOVING through a COMMAND (not only through the Write/Edit tools) ─────────
  //
  // Hole measured 2026-08-26: \`checkWrite\` only runs for the Write/Edit/MultiEdit tools, so writing to a
  // protected path through the SHELL went uninspected. Measured for real: it wrote into \`01_CONSTITUTION\` and
  // OUTSIDE the repo, though both sit inside protected.
  //     echo x >> docs/agent/05_TODO.md        (redirection)
  //     python -c "open('data/x','w').write()" (script)
  // And hole 3 gapes just as wide: \`mv <protected>/x /tmp\` has EXACTLY the consequence of a delete yet slipped clean through — the file leaves
  // the protected path, only the name of the operation differs.
  //
  // 🔴 LIMIT — do NOT read this as "the guard covers everything":
  // This layer only sees paths WRITTEN OUT LITERALLY in the command. A path built at runtime (string
  // concatenation, read from a variable, a file or stdin) is NOT seen, and cannot be - a hook reading
  // a command string cannot know where the script will write. Real blocking belongs at the operating-system layer
  // (file permissions / ACL), not here. This branch only closes the EASIEST road.
  const REDIRECT = /(?:^|[\\s;&|])>{1,2}\\s*(["']?)([^\\s"'|;&]+)\\1/g;
  const MOVERS = /^(mv|move|move-item|mi|rename|ren|cp|copy|copy-item|robocopy|rsync)$/;
  // \`open(\` writes only with a write mode (2026-10-19: \`ast.parse(open(p).read())\` was blocked as a write); write_text /
  // write_bytes were missed by \`\\bwrite\\b\` (the next character is a word character)
  const WRITE_VERB = /\\bopen\\s*\\((?:[^()\\n]|\\([^()\\n]*\\))*,\\s*(?:mode\\s*=\\s*)?[rbuU]?["'][rbt]*[wax+][rbt+]*["']|\\b(write|write_text|write_bytes|writeFile|appendFile|writeFileSync|appendFileSync|Set-Content|Add-Content|Out-File|dump|save)\\b/i;

  // 🔴 FINGERPRINT PER COMMAND, NOT PER PATH (fixed 2026-09-04, reported from the Dept_OPS repo).
  // This spot used to call \`consumeFlag("docs_write", rel)\` — the fingerprint was computed over ONE path.
  // But \`mv A B\` touches TWO paths, and if both sit inside protected then every run:
  //   1 examines the SOURCE A -> the flag is unstamped -> stamp sha1(A) -> LET THROUGH
  //   2 examines the TARGET B -> finds the stamp sha1(A) != sha1(B) -> DELETES THE FLAG -> BLOCKS
  // The next round with a fresh flag has the SOURCE consume it first, leaving the target empty-handed => AN
  // INESCAPABLE LOOP, however many flags the user grants. The \`FLAG_RETRY_MS\` window cannot
  // save it: it allows a retry of the SAME consumed subject, whereas here the source consumes a
  // NEW flag every round, so it never reaches that state.
  // This is a BUG, not a policy: the message below invites the user to create a flag, meaning the design
  // DELIBERATELY lets an approving user through — yet with a rename that invitation can never be
  // fulfilled. And a gate that promises a way through but cannot deliver pushes people to drop the path from
  // \`protected\` altogether — costing more than it gains.
  // Now: one flag covers the WHOLE COMMAND (\`bare\`), the same shape every other branch in this file already
  // uses (\`push\`/\`delete\`/\`discard\`/\`git_add_all\` all fingerprint the command). It is still "one use
  // for one job": change the command => a different fingerprint => revoked.
  const EXPAND = literalExpander(bare);
  const FOLDERS = segmentFolders(bare, EXPAND);
  let CUR_BASE = process.cwd();
  const flagWritePath = (raw, how) => {
    const tok0 = String(raw).replace(/^["']|["']$/g, "");
    if (!tok0 || tok0.startsWith("-")) return;
    const tok = inFolder(tok0, CUR_BASE, EXPAND);
    const rel = relToRoot(tok.replace(/\\\\/g, "/").replace(/^\\.\\//, ""));
    if (isFlagFile(rel)) return;
    for (const prefix of POLICY.protected_write || []) {
      if (!underProtected(rel, prefix)) continue;
      if (consumeFlag("docs_write", bare)) return;
      deny("BLOCKED (guard layer 1): " + how + " \`" + rel + "\` which sits inside the protected path \`" + prefix +
        "\` - " + writeReason(prefix) +
        "\\nDid the user approve it this session? -> create the flag \`" + POLICY.flags_dir + "/" + POLICY.flags.docs_write +
        "\` and try again (the flag is good for ONE use).");
    }
  };

  for (const seg of splitSegments(bare)) {
    CUR_BASE = FOLDERS.get(seg) || process.cwd();
    const word = cmdWordOf(seg);
    // 1 redirection \`>\`/\`>>\` — the target is a file being overwritten or appended to, whatever command stands in front.
    let m;
    REDIRECT.lastIndex = 0;
    while ((m = REDIRECT.exec(seg))) flagWritePath(m[2], "writing (redirection) into");
    // 2 MOVE / COPY commands: a SOURCE inside protected means it leaves the protected area (hole 3);
    //    a TARGET inside protected means writing into that area.
    if (MOVERS.test(word)) {
      const args = seg.trim().split(/\\s+/).slice(1).filter((t) => t && !t.startsWith("-"));
      const removes = /^(mv|move|move-item|mi|rename|ren)$/.test(word);
      args.forEach((a, i) => {
        const last = i === args.length - 1;
        if (last) flagWritePath(a, "writing (target of " + word + ") into");
        else if (removes) flagWritePath(a, "MOVING OUT OF (source of " + word + ")");
      });
    }
    // 3 interpreters: judge only when the payload holds both a protected path AND a writing verb — to
    //    avoid wrongly blocking \`python -c "print(open('data/x').read())"\` (reading, not writing).
    // 2b commands that create or edit in place (Rule_Gate_79 counts every write): \`touch\` · \`mkdir\` · the PowerShell
    //    writers · \`sed -i\` / \`perl -i\` · \`git mv\` — every path argument is judged.
    const tokens = seg.trim().split(/\\s+/);
    const inPlace = /^(sed|perl)$/.test(word) && tokens.some((t) => /^-[a-zA-Z]*i/.test(t));
    const gitMv = word === "git" && tokens[1] === "mv";
    if (/^(touch|mkdir|md|new-item|ni|set-content|sc|add-content|ac|out-file|tee|tee-object)$/.test(word) || inPlace || gitMv) {
      for (const a of tokens.slice(gitMv ? 2 : 1)) if (a && !a.startsWith("-") && /[\\/.]/.test(a)) flagWritePath(a, "writing (" + word + ") into");
    }
    if (SEG_INTERP.test(word) && WRITE_VERB.test(seg)) {
      for (const tok of dropTextOps(seg).split(/[\\s'"(),]+/)) {
        // Do NOT require the token to contain a \`/\`: a protected path is often a BARE NAME at the repo root
        // (\`.vault\` · \`attic\` · \`data\`) — measured 2026-08-26 across 7 of 9 PBI repos, and at first they slipped clean through
        // by the "must contain /" condition. \`underProtected\` is the real decider; a meaningless token
        // (\`w\` · \`1\`) matches no path, so it produces no false positive.
        if (!tok || tok.startsWith("-")) continue;
        flagWritePath(tok, "writing (through " + word + ") into");
      }
    }
    // 3b a script FILE run by an interpreter (\`node x.mjs\`): the command line names no path, the file does (measured
    //    2026-10-16: a scratch script wrote into the parts store with \`join(root, "docs_template", "_Store", ...)\` and
    //    the guard never saw it). Read the file (up to 256 KB) and judge it like a payload: it writes AND names a
    //    protected path, as one quoted literal or, for a nested path, every segment as its own quoted literal. A path that
    //    only arrives at run time (argv, a value read from disk) is still not seen. Only an ad hoc script is judged: one
    //    outside the repo (a scratch folder) or inside it but neither tracked nor ignored — committed code and build output
    //    (the repo's own CLI, its scripts, this guard) are reviewed code and name protected paths on purpose.
    const adHoc = (abs) => {
      const rel = relToRoot(abs);
      if (rel.startsWith("..") || path.isAbsolute(rel)) return true;
      try {
        const out = require("node:child_process").execFileSync("git", ["-C", ROOT, "ls-files", "--others", "--exclude-standard", "--", rel],
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true, timeout: 5000 });
        return out.trim() !== "";
      } catch { return false; }
    };
    if (SEG_INTERP.test(word)) {
      const scriptTok = (tokens.slice(1).find((t) => t && !t.startsWith("-")) || "").replace(/^["']|["']$/g, "");
      const file = /\\.(m?js|cjs|ts|py|ps1|sh)$/i.test(scriptTok) ? path.resolve(ROOT, scriptTok) : "";
      let body = "";
      try { if (file && fs.statSync(file).size < 262144 && adHoc(file)) body = fs.readFileSync(file, "utf8"); } catch { body = ""; }
      if (body && WRITE_VERB.test(body)) {
        const Q = "[" + String.fromCharCode(34, 39, 96) + "]";
        const SEP = "[/" + String.fromCharCode(92, 92) + "]";
        const esc = (s) => String(s).split(".").join("[.]");
        for (const prefix of POLICY.protected_write || []) {
          const parts = String(prefix).split("/").filter(Boolean);
          const tail = parts.length > 1 || prefix.includes(".") ? "(?:" + Q + "|" + SEP + ")" : SEP;
          const literal = new RegExp(Q + esc(prefix) + tail).test(body);
          const pieces = parts.length > 1 && parts.every((s) => new RegExp(Q + esc(s) + Q).test(body));
          if (!literal && !pieces) continue;
          if (consumeFlag("docs_write", bare)) break;
          deny("BLOCKED (guard layer 1): the script \`" + scriptTok + "\` writes and names the protected path \`" + prefix +
            "\` - " + writeReason(prefix) +
            "\\nDid the user approve it this session? -> create the flag \`" + POLICY.flags_dir + "/" + POLICY.flags.docs_write +
            "\` and try again (the flag is good for ONE use).");
        }
      }
    }
  }

  // ── OUTSIDE THE PROJECT 1: absolute write targets (see WORKING OUTSIDE THE PROJECT above) ──
  // One flag for the whole command line (\`bare\`), the same shape as every branch above.
  const WRITERS = /^(mkdir|md|new-item|ni|set-content|sc|add-content|ac|out-file|tee|tee-object|touch)$/;
  // PowerShell cmdlets: the path is \`-Path\`/\`-FilePath\`/\`-LiteralPath\` or the FIRST positional argument -
  // NOT \`-Value\` (\`Set-Content a.txt -Value /usr/bin\` writes a.txt, it does not write /usr/bin).
  const PS_WRITERS = /^(new-item|ni|set-content|sc|add-content|ac|out-file|tee-object)$/;
  const PS_PATH_PARAM = /^-(path|filepath|literalpath|pspath)$/i;
  const PS_SWITCH = /^-(force|nonewline|append|noclobber|passthru|whatif|confirm|asbytestream|verbose)$/i;
  // a plain path argument is judged where the segment runs (after a \`cd\`) and with literal variables expanded; a payload
  // token (strict) is judged as written
  const outsideHit = (tok, how, strict) => {
    const t = strict ? tok : inFolder(tok, CUR_BASE, EXPAND);
    if (isOutside(t, strict)) denyOutside(how + " \`" + String(tok) + "\` - that is OUTSIDE the project", bare);
  };
  for (const seg of splitSegments(bare)) {
    CUR_BASE = FOLDERS.get(seg) || process.cwd();
    const word = cmdWordOf(seg);
    let m;
    REDIRECT.lastIndex = 0;
    while ((m = REDIRECT.exec(seg))) outsideHit(m[2], "writing (redirection) into", false);
    const toks = shellWords(seg);
    const at = toks.findIndex((t) => (t.replace(/\\\\/g, "/").split("/").pop() || "").toLowerCase() === word);
    const args = at < 0 ? [] : toks.slice(at + 1);
    if (MOVERS.test(word)) {
      // cmd-native commands take \`/Y\` \`/E\` \`/MIR\` switches - not paths.
      const native = /^(robocopy|copy|move|ren|rename)$/.test(word);
      const plain = args.filter((t) => t && !t.startsWith("-") && !(native && /^\\/[A-Za-z0-9]+(:\\S*)?$/.test(t)));
      const removes = /^(mv|move|move-item|mi|rename|ren)$/.test(word);
      plain.forEach((a, i) => {
        const target = word === "robocopy" ? i === 1 : i === plain.length - 1;
        if (target) outsideHit(a, "writing (target of " + word + ") into", false);
        else if (removes) outsideHit(a, "MOVING AWAY (source of " + word + ")", false);
      });
    }
    if (WRITERS.test(word)) {
      if (PS_WRITERS.test(word)) {
        let positional = false;
        for (let i = 0; i < args.length; i++) {
          const a = args[i];
          const named = /^(-[A-Za-z]+):(.+)$/.exec(a);
          if (named) {
            if (PS_PATH_PARAM.test(named[1])) outsideHit(named[2], "writing (" + word + ") into", false);
            continue;
          }
          if (a.startsWith("-")) {
            if (PS_SWITCH.test(a)) continue;
            if (PS_PATH_PARAM.test(a)) outsideHit(args[i + 1] || "", "writing (" + word + ") into", false);
            i++;
            continue;
          }
          if (!positional) { positional = true; outsideHit(a, "writing (" + word + ") into", false); }
        }
      } else {
        for (const a of args) if (!a.startsWith("-")) outsideHit(a, "writing (" + word + ") into", false);
      }
    }
    // Interpreter payloads that write. The first plain argument is the SCRIPT being run (read, not written) - skip it.
    if (SEG_INTERP.test(word) && WRITE_VERB.test(seg)) {
      const script = args.find((t) => !t.startsWith("-"));
      for (const tok of dropTextOps(seg).split(/[\\s'"(),]+/)) {
        if (!tok || tok.startsWith("-") || tok === script) continue;
        outsideHit(tok, "writing (through " + word + ") into", true);
      }
    }
  }
  // \`bare\` drops heredocs (false positives in commit messages are born there), but \`python - <<EOF\` IS the
  // script: when an interpreter is on the line, judge the heredoc bodies that write.
  if (anyCmdIs(cmd, SEG_INTERP)) {
    const HEREDOC = /<<-?\\s*(['"]?)(\\w+)\\1[^\\n]*\\n([\\s\\S]*?)^\\2\\b/gm;
    let h;
    while ((h = HEREDOC.exec(cmd))) {
      if (!WRITE_VERB.test(h[3])) continue;
      for (const tok of dropTextOps(h[3]).split(/[\\s'"(),]+/)) {
        if (tok && !tok.startsWith("-")) outsideHit(tok, "writing (through a heredoc script) into", true);
      }
    }
  }

  // ── OUTSIDE THE PROJECT 4: work on ANOTHER MACHINE (added 2026-10-07) ─────────────────
  //
  // Incident (session db-datawarehouse-fa, 2026-10-07): \`ssh <vm> "New-Item -ItemType Directory E:\\_retired\\...;
  // Export-ScheduledTask ... | Out-File ...; Unregister-ScheduledTask ..."\`, and before that two \`Register-ScheduledTask\`
  // - a new folder and Scheduler tasks created/deleted on a VM, unblocked: \`ssh\` was an ordinary command
  // whose quoted payload nobody judged. Now a remote runner works like an interpreter: once one is in command
  // position the WHOLE line is the payload (a PowerShell script block \`{ a; b }\` is split by \`;\` like any
  // line, so a single segment would miss half of it), and anything that CHANGES the other machine needs the
  // \`outside\` flag - the same flag as the branches above, because it is the same question: work outside the project.
  // Reading (Get-*, ls, cat, Test-Path, sqlcmd SELECT) passes.
  //
  // 🔴 LIMIT: a script FILE that lives on the other machine (\`ssh host "powershell -File C:\\job.ps1"\`) is invisible
  // (a LOCAL script piped in through stdin IS read - see \`fed\` below). A local command that merely shares the line with \`ssh\` is judged as remote too
  // - blocking wrongly beats a hole, and remote commands are rare enough for that to stay quiet.
  const REMOTE_RUNNERS = /^(ssh|plink|psexec|psexec64|paexec|winrs)(\\.exe)?$/;
  const REMOTE_PS = /\\b(Invoke-Command|icm)\\b[^\\n]*\\s-(ComputerName|cn|Session|HostName|VMName|ContainerId)\\b|\\bEnter-PSSession\\b|\\betsn\\b|\\bCopy-Item\\b[^\\n]*\\s-ToSession\\b/i;
  const remoteLine = anyCmdIs(cmd, REMOTE_RUNNERS) || REMOTE_PS.test(bare);
  if (remoteLine) {
    const REMOTE_MUTATE = new RegExp([
      // PowerShell verbs that change state; the excluded nouns only build objects or steer the local session.
      "\\\\b(New|Set|Add|Remove|Register|Unregister|Install|Uninstall|Rename|Move|Copy|Clear|Enable|Disable|Start|Stop|Restart|Suspend|Resume|Grant|Revoke|Mount|Dismount|Initialize|Reset|Update|Publish|Expand|Compress)-(?!(Object|TimeSpan|Guid|Variable|PSSession|PSSessionOption|CimSession|CimSessionOption|Location|StrictMode|PSDebug|Sleep|Type|Member|Transcript|Host)\\\\b)[A-Za-z]\\\\w*",
      "\\\\bOut-File\\\\b", "\\\\bTee-Object\\\\b", "\\\\bExport-(Csv|Clixml|PfxCertificate|Certificate)\\\\b", "\\\\bFormat-Volume\\\\b", "-OutFile\\\\b",
      // native commands
      "\\\\b(mkdir|md|rmdir|rd|del|erase|rm|mv|cp|move|copy|xcopy|robocopy|touch|tee|chmod|chown|chgrp|ln|truncate|shutdown|reboot|useradd|userdel|usermod)\\\\b",
      "\\\\bschtasks(\\\\.exe)?\\\\b[^\\\\n]*\\\\/(create|delete|change|run|end)\\\\b",
      "\\\\bsc(\\\\.exe)?\\\\s+(\\\\\\\\\\\\\\\\\\\\S+\\\\s+)?(create|delete|config|start|stop|pause|failure|sdset)\\\\b",
      "\\\\breg(\\\\.exe)?\\\\s+(add|delete|import|restore|load|unload|copy)\\\\b",
      "\\\\bnet(\\\\.exe)?\\\\s+(user|localgroup|group|share|use)\\\\b[^\\\\n]*\\\\/(add|delete)\\\\b",
      "\\\\bnet(\\\\.exe)?\\\\s+(start|stop)\\\\s+\\\\S",
      "\\\\bsystemctl\\\\s+(enable|disable|mask|unmask|start|stop|restart|reload|daemon-reload|kill)\\\\b",
      "\\\\bservice\\\\s+\\\\S+\\\\s+(start|stop|restart)\\\\b",
      "\\\\bcrontab\\\\s+(-[rei]\\\\b|[^-\\\\s|;&])",
      "\\\\b(apt|apt-get|yum|dnf|zypper|apk|pip|pip3|npm|choco|winget|brew)\\\\s+(install|remove|uninstall|purge|upgrade|add|i)\\\\b",
      "\\\\bsed\\\\s+(-\\\\w*i\\\\b|--in-place)",
      // redirection into a file (not 2>&1, not > $null / /dev/null / nul, not -> or =>)
      "(?:^|[^\\\\d&<>=-])>{1,2}\\\\s*(?![&]|\\\\$null\\\\b|\\\\/dev\\\\/null\\\\b|nul\\\\b)[^\\\\s&|;>]",
    ].join("|"), "i");
    // A LOCAL script fed to the remote shell through stdin (reported 2026-10-07:
    // \`Get-Content x.ps1 | ssh host "powershell -Command -"\` · \`ssh host bash < x.sh\`): the line shows only \`ssh\`,
    // the payload is the FILE - and that file is local, so read it and judge its text too.
    let fed = "";
    for (const s of splitSegments(cmd)) {
      const files = [];
      if (/^(get-content|gc|cat|type)$/.test(cmdWordOf(s))) files.push(...shellWords(s).slice(1).filter((t) => t && !t.startsWith("-")));
      const lt = /(?<!<)<(?!<)\\s*(["']?)([^\\s"'|;&<>]+)\\1/.exec(s);
      if (lt) files.push(lt[2]);
      for (const f of files) {
        try {
          const p = path.resolve(process.cwd(), f);
          if (fs.statSync(p).size <= 2 * 1024 * 1024) fed += "\\n" + fs.readFileSync(p, "utf8");
        } catch {}
      }
    }
    if (REMOTE_MUTATE.test(cmd) || (fed && REMOTE_MUTATE.test(fed))) {
      denyOutside("a command that CHANGES ANOTHER MACHINE (ssh / Invoke-Command / psexec / winrs payload that creates, deletes or reconfigures - files, folders, scheduled tasks, services, registry, packages)", bare);
    }
  }
  // Copying ONTO another machine: \`scp a.txt host:/x\` · \`rsync -a dir user@host:dir\` (a drive letter \`C:\` is not a host).
  for (const s of splitSegments(bare)) {
    if (!/^(scp|pscp|rsync)(\\.exe)?$/.test(cmdWordOf(s))) continue;
    const args = shellWords(s).slice(1).filter((t) => t && !t.startsWith("-"));
    const dest = args[args.length - 1] || "";
    if (/^([^@\\s:\\/\\\\]+@)?[A-Za-z0-9][\\w.-]+:/.test(dest)) {
      denyOutside("copying ONTO another machine (\`" + dest + "\`)", bare);
    }
  }

  // ── OUTSIDE THE PROJECT 5: a WRITING \`zemory\` command aimed at ANOTHER repo (added 2026-10-07, rule audit) ──
  // 02_RULES §Phạm vi project, "vế ngược": \`zemory\` writes by its target (\`--root\`, or the cwd after \`cd\`) — run against a
  // repo you only came to READ, it writes into that repo and its DB. Read-only verbs (doctor · validate · conform · peers ·
  // paths check · plan/changelog/memory search · \`sync --check\`) pass. Same \`outside\` flag as the branches above.
  const ZEMORY_WRITE =
    /\\bzemory(\\.cmd|\\.ps1)?\\s+(init|reindex|archive|migrate|hook\\s+(guard|install|uninstall)|sync(?![^\\n;|&]*--check)|memory\\s+(scan|sync|import|embed|digest|relocate|forget|vectors-catchup|keygen))\\b/i;
  if (ZEMORY_WRITE.test(bare)) {
    const rootArg = /--root\\s+("[^"]+"|'[^']+'|[^\\s;|&]+)/.exec(bare);
    const cdArg = /(?:^|[;&|]\\s*)(?:cd|Set-Location|sl|pushd)\\s+(?:-Path\\s+)?("[^"]+"|'[^']+'|[^\\s;|&]+)/i.exec(bare);
    const target = (rootArg && rootArg[1]) || (cdArg && cdArg[1]);
    if (target && isOutside(target, false)) {
      denyOutside("a zemory command that WRITES, aimed at another repo \`" + target.replace(/^["']|["']$/g, "") + "\` - it writes into that repo and its DB", bare);
    }
  }

  // ── OUTSIDE THE PROJECT 2 + 3: SQL that reaches past the repo ─────────────────────────
  // Judged ONLY when a SQL client or an interpreter is in command position - \`grep sp_configure\`,
  // \`git log\`, \`cat x.sql\` merely MENTION the words. Matched against the ORIGINAL command, not \`bare\`:
  // SQL is very often a heredoc fed to python/sqlcmd, and \`bare\` has dropped exactly that.
  const rawSegs = splitSegments(cmd);
  const sqlCtx = rawSegs.some((s) => /^(sqlcmd|osql|bcp|invoke-sqlcmd)$/.test(cmdWordOf(s)) || SEG_INTERP.test(cmdWordOf(s))) || remoteLine;
  if (sqlCtx) {
    const SQL_FILE_WRITE =
      /\\bBACKUP\\s+(DATABASE|LOG)\\b[\\s\\S]*?\\bTO\\s+DISK\\b|\\bRESTORE\\b[\\s\\S]*?\\bFROM\\s+DISK\\b|\\bWITH\\b[\\s\\S]*?\\bMOVE\\s+\\S+\\s+TO\\b|\\bCREATE\\s+DATABASE\\b[\\s\\S]*?\\bFILENAME\\b/i;
    const SQL_SERVER_CFG =
      /\\bsp_configure\\b|\\bRECONFIGURE\\b|\\bsp_addlinkedserver\\b|\\bsp_addlinkedsrvlogin\\b|\\bsp_dropserver\\b|\\b(CREATE|DROP|ALTER)\\s+DATABASE\\b/i;
    if (SQL_FILE_WRITE.test(cmd)) {
      denyOutside("SQL that makes the SERVER write files on its own disk (BACKUP/RESTORE ... DISK, WITH MOVE, CREATE DATABASE ... FILENAME)", bare);
    }
    if (SQL_SERVER_CFG.test(cmd)) {
      denyOutside("SQL that changes the SERVER configuration (sp_configure/RECONFIGURE, linked servers, CREATE/DROP/ALTER DATABASE)", bare);
    }
    const allowSrv = (POLICY.allowed_sql_servers || []).map(normServer).filter(Boolean);
    if (allowSrv.length) {
      for (const s of sqlTargets(cmd, rawSegs)) {
        if (!allowSrv.includes(s)) {
          denyOutside("SQL aimed at the server \`" + s + "\`, which is not in the marker's allowedSqlServers (" + allowSrv.join(", ") + ")", bare);
        }
      }
    }
  }

  // Reading the contents of a key file through the shell - the same rule as checkRead.
  //
  // Scan ONLY tokens that LOOK LIKE A FILE BEING READ, not every token in the command line.
  // The old build scanned everything: if the command line CONTAINED \`head\`/\`cat\`/... then every token was compared, so
  // \`grep -rln "id_rsa" src/ | head\` was blocked - the key name was in the SEARCH PATTERN, not
  // a file being read. That is exactly the wrong-block measured 2026-08-11 (it blocked the very
  // audit command sent to inspect git history), and rule 7 exists to catch this class: a gate that blocks wrongly makes
  // people find a way around, and then the whole gate means nothing.
  //
  // Three signs count as "a file being read" - all of them caught real cases:
  //   1. the token holds a path separator  ->  cat /etc/ssh/id_rsa
  //   2. a token standing RIGHT AFTER a reading command (skipping -x flags)  ->  cat id_rsa | grep x
  //   3. token cuoi cau  ->  head id_rsa
  const READER = /^(cat|less|more|head|tail|type|base64|xxd|od|strings|cp|scp)$/;
  if (/\\b(cat|less|more|head|tail|type|base64|xxd|od|strings|cp|scp)\\b/.test(bare)) {
    const toks = cmd.split(/[\\s'";|&]+/).filter(Boolean);
    let afterReader = false;
    toks.forEach((tok, i) => {
      const bareTok = tok.replace(/^["']|["']$/g, "");
      const looksLikePath = /[\\/\\\\]/.test(bareTok);
      const isLast = i === toks.length - 1;
      const suspect = looksLikePath || afterReader || isLast;
      if (READER.test(bareTok.replace(/\\\\/g, "/").split("/").pop() || "")) {
        afterReader = true;
      } else if (!bareTok.startsWith("-")) {
        afterReader = false;
      }
      if (!suspect) return;
      const name = bareTok.replace(/\\\\/g, "/").split("/").pop();
      if (name && nameMatches(name, POLICY.key_read_block || [])) {
        deny("BLOCKED (guard layer 1): a shell command touching the contents of the key file \`" + name + "\` - " + POLICY.key_read_reason);
      }
    });
  }
}

function main() {
  let payload;
  try {
    // Strip the BOM before parsing: a PowerShell 5.1 pipe inserts U+FEFF at the head of stdin (measured
    // 2026-08-07 — the same family as the BOM marker bug), and without stripping it every rule goes silent (fail-open).
    payload = JSON.parse(fs.readFileSync(0, "utf8").replace(/^\\uFEFF/, ""));
  } catch {
    process.exit(0); // input unreadable means no verdict - a broken guard must not block blindly
  }
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  // Recognise by the SHAPE of the call, not by a fixed list of NAMES.
  // Measured 2026-08-20: the guard only knew the name \`Bash\`, so EVERY command-guarding branch (an unrequested git push,
  // git add -A, secrets into git, recursive deletes) could be bypassed entirely by switching to the
  // \`PowerShell\` tool - the MAIN terminal tool on Windows, available in the SAME session. The recognising regex
  // still worked (the Bash branch catches PowerShell syntax too); only the NAME gate judged wrongly.
  // Hence: anything carrying \`command\` is inspected as a shell command whatever the tool is called - and it keeps working with
  // future tools without bumping zemory.
  const isCommandTool = typeof ti.command === "string" && ti.command !== "";
  const isWriteTool = tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit";
  if (isWriteTool) {
    const p = ti.file_path || ti.notebook_path || "";
    if (p) checkWrite(relToRoot(p));
    // 02-10 (b) (plan/27 §2h, 2026-10-14): a rule never disappears from a rule set without the user's word. An edit of
    // 01_CONSTITUTION / 02_RULES (templates included) that drops a rule number is blocked; retiring a rule keeps its
    // number and marks it abolished, so it is not a loss.
    if (p && /(^|\\/)(01_CONSTITUTION|02_RULES)\\.md$/i.test(relToRoot(p).replace(/\\\\/g, "/"))) {
      const isHp = /01_CONSTITUTION\\.md$/i.test(p);
      const ids = (s) => {
        const out = new Set();
        const re = isHp ? /^(\\d{1,2})\\.\\s/gm : /(?:^|\\s)\`?(0[12]-\\d{1,3})\`?(?=\\s)/gm;
        for (const m of String(s || "").matchAll(re)) out.add(m[1]);
        return out;
      };
      let before = "", after = "";
      if (tool === "Write") {
        try { before = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""; } catch { before = ""; }
        after = ti.content || "";
      } else if (tool === "Edit" || tool === "MultiEdit") {
        // A rule MOVED within the file is not lost: apply the replacements to the whole file and compare the results. When a
        // replacement cannot land (file unreadable, old text absent) the snippets are compared instead.
        const edits = tool === "MultiEdit" ? ti.edits || [] : [ti];
        let whole = null;
        try { whole = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; } catch { whole = null; }
        if (whole !== null && edits.length && edits.every((e) => e.old_string && whole.includes(e.old_string))) {
          before = whole; after = whole;
          for (const e of edits) after = e.replace_all ? after.split(e.old_string).join(e.new_string || "") : after.replace(e.old_string, () => e.new_string || "");
        } else {
          for (const e of edits) { before += "\\n" + (e.old_string || ""); after += "\\n" + (e.new_string || ""); }
        }
      }
      const kept = ids(after);
      const lost = [...ids(before)].filter((x) => !kept.has(x));
      if (lost.length && !consumeFlag("delete", relToRoot(p))) {
        deny("BLOCKED (guard layer 1): Rule_Gate_10_DestructiveOps - this edit removes rule " + lost.join(", ") + " from " + relToRoot(p) +
          " - a rule is never deleted without the user's word; to retire one, keep its number and mark it abolished." + flagTip("delete"));
      }
    }
    // The folder harness twin (2026-10-15): one rule = one folder, its number on the \`id:\` line of the part's main file.
    // Deleting the folder is a recursive delete (blocked above); rewriting or dropping the \`id:\` line is the other way
    // a number leaves, and the .md regex above never saw these files.
    // The header file is named after its folder (plan/28 §0p); an older copy still has RULE.md.
    // a law may sit one folder deeper, in its code of law / chapter (01_LAW/_Rule/01_Harness/<rule>/, plan/29)
    if (p && /(^|\\/)(01_LAW\\/_Rule|01_LAW\\/_Cons|01_RULES|02_CONSTITUTION|01_CONSTITUTION|02_RULES)\\/(?:\\d{2}_[A-Za-z]+\\/)?([^/]+)\\/(RULE|\\3)\\.md$/i.test(relToRoot(p).replace(/\\\\/g, "/"))) {
      const idOf = (s) => { const m = String(s || "").match(/^id:\\s*(\\S+)/m); return m ? m[1] : null; };
      let before = "", after = "";
      if (tool === "Write") {
        try { before = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""; } catch { before = ""; }
        after = ti.content || "";
      } else {
        // Edit / MultiEdit: apply the replacements to the file as it is, then read the id of the result.
        try { before = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""; } catch { before = ""; }
        after = before;
        const edits = tool === "MultiEdit" ? ti.edits || [] : [ti];
        for (const e of edits) after = e.replace_all ? after.split(e.old_string || "").join(e.new_string || "") : after.replace(e.old_string || "", () => e.new_string || "");
      }
      const was = idOf(before), now = idOf(after);
      const lost = was && was !== now ? [was] : [];
      if (lost.length && !consumeFlag("delete", relToRoot(p))) {
        deny("BLOCKED (guard layer 1): Rule_Gate_10_DestructiveOps - this edit removes rule " + lost.join(", ") + " from " + relToRoot(p) +
          " - a rule is never deleted without the user's word; to retire one, keep its number and mark it abolished." + flagTip("delete"));
      }
    }
    // An internal network address never enters a tracked file (plan/27 §0b) - the write-time twin of the
    // no-data-in-git ratchet: the same full-4-octet private ranges (10.x left out, it collides with version numbers)
    // plus every address bound to THIS machine's cards. Only NEW addresses count; git-ignored files and tests pass.
    if (p) {
      const relP = relToRoot(p).replace(/\\\\/g, "/");
      const inside = !relP.startsWith("..") && !path.isAbsolute(relP);
      const text = (s) => String(s || "");
      let before = "", after = "";
      if (tool === "Write") { try { before = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""; } catch { before = ""; } after = text(ti.content); }
      else if (tool === "Edit") { before = text(ti.old_string); after = text(ti.new_string); }
      else if (tool === "MultiEdit") { for (const e of ti.edits || []) { before += "\\n" + text(e.old_string); after += "\\n" + text(e.new_string); } }
      else after = text(ti.new_source);
      if (inside && !/^backend\\/test\\//.test(relP) && after) {
        const own = [];
        try {
          for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
            if (a.family === "IPv4" && !a.internal) own.push(a.address);
          }
        } catch { /* no interfaces readable - the range check still runs */ }
        const found = new Set();
        for (const m of after.matchAll(/\\b(?:192\\.168|172\\.(?:1[6-9]|2\\d|3[01]))\\.\\d{1,3}\\.\\d{1,3}\\b/g)) found.add(m[0]);
        for (const ip of own) if (new RegExp("\\\\b" + ip.replace(/\\./g, "\\\\.") + "\\\\b").test(after)) found.add(ip);
        const fresh = [...found].filter((ip) => !before.includes(ip));
        let ignored = false;
        if (fresh.length) {
          try { require("node:child_process").execFileSync("git", ["-C", ROOT, "check-ignore", "-q", "--", relP], { stdio: "ignore", windowsHide: true, timeout: 5000 }); ignored = true; }
          catch { ignored = false; }
        }
        if (fresh.length && !ignored && !consumeFlag("docs_write", relP)) {
          deny("BLOCKED (guard layer 1): an internal network address (" + fresh[0] + ") in the tracked file " + relP +
            " - it maps the private network; use a documentation range (192.0.2.x · 198.51.100.x) instead." + flagTip("docs_write"));
        }
      }
    }
    // OUTSIDE THE PROJECT 1 through the file tools - fingerprint = the path.
    if (p && isOutside(p, false)) denyOutside("writing \`" + p + "\` - that is OUTSIDE the project", p);
    // OVERWRITING = losing the old content, as good as a delete. \`Write\` replaces the WHOLE file; \`Edit\`
    // does not (it edits a region), so ONLY \`Write\` is asked about.
    //
    // Why ASK rather than FORBID (user ruling 2026-08-11): overwriting is an ordinary everyday
    // operation, and forbidding it outright turns the gate into noise that gets ignored. But it is irreversible, so
    // there must be a warning FIRST - in the spirit of "an irreversible rule needs a machine latch".
    //
    // Applied ONLY inside the repo tree: files in a temp or scratchpad folder are overwritten constantly, and blocking there
    // creates noise while protecting nothing.
    // A one-use flag is not content: rewriting a used one is how a new approval is recorded, never a loss.
    if (tool === "Write" && p && !isFlagFile(relToRoot(p).replace(/\\\\/g, "/"))) {
      const rel = relToRoot(p);
      const inside = !rel.startsWith("..") && !path.isAbsolute(rel);
      let sizeNow = 0;
      try {
        sizeNow = fs.existsSync(p) ? fs.statSync(p).size : 0;
      } catch {
        sizeNow = 0; // cannot stat means no verdict (fail-open)
      }
      if (inside && sizeNow > 0 && !consumeFlag("overwrite", rel)) {
        deny("WARNING (guard layer 1): OVERWRITING \`" + rel + "\` (" + sizeNow + " bytes present) - " +
          "the old content is gone for good and cannot be undone.\\nASK THE USER first." + flagTip("overwrite") +
          "\\nTo change only a region use Edit - Edit is NOT asked about.");
      }
    }
  } else if (tool === "Read") {
    if (ti.file_path) checkRead(relToRoot(ti.file_path));
  } else if (isCommandTool) {
    checkBash(String(ti.command));
  }
  // 02-25 SQL ONE WAY (02-25_sql-one-way.cjs, policy.sql) - new inline SQL in code is blocked; the message carries the rule.
  // Present only when the repo has a named-SQL store file. A failure of the hook itself lets the action through.
  if (isWriteTool && POLICY.sql) {
    let sqlMsg = null;
    try { sqlMsg = require(path.join(HERE, "02-25_sql-one-way.cjs")).check(payload, ROOT, POLICY); } catch { sqlMsg = null; }
    if (sqlMsg) deny(sqlMsg);
  }
  // RULE HOOKS (policy.rule_hooks, plan/27 §3): each returns null, a block message, or { msg, flag, subject } = blocked
  // unless the one-use flag is granted. A failing hook lets the action through (HP article 9).
  const verdict = (r, label) => {
    if (!r) return;
    if (typeof r === "object") {
      if (r.flag && consumeFlag(r.flag, r.subject || label)) return;
      deny(r.msg + (r.flag ? flagTip(r.flag) : ""));
    }
    deny(String(r));
  };
  for (const h of POLICY.rule_hooks || []) {
    let r = null;
    try { r = require(path.join(HERE, h.file)).check(payload, ROOT, POLICY); } catch { r = null; }
    verdict(r, h.file);
  }
  // FOLDER HARNESS (plan/28 §0d): every rule folder that carries hooks, same contract as above. A rule that took in another
  // rule (plan/28 §0q) carries one hook*.cjs per check (hook.cjs · hook-names.cjs …); each is called.
  for (const d of POLICY.rule_dirs || []) {
    let files = [];
    try { files = fs.readdirSync(path.join(ROOT, d)).filter((f) => /^hook[\\w-]*\\.cjs$/.test(f)).sort(); } catch { files = []; }
    for (const f of files) {
      let r = null;
      try { r = require(path.join(ROOT, d, f)).check(payload, ROOT, POLICY); } catch { r = null; }
      verdict(r, d + "/" + f);
    }
  }
  // READ BEFORE WRITE (02-59_read-first.cjs, policy.read_first) - LAST, so the more specific blocks above keep their message.
  // A failure of the latch itself lets the action through: a broken guard must not block blindly.
  let rfMsg = null;
  try { rfMsg = require(path.join(HERE, "02-59_read-first.cjs")).readFirst(payload, ROOT, POLICY); } catch { rfMsg = null; }
  if (rfMsg) deny(rfMsg);
  process.exit(0);
}
main();
`;

const PRECOMMIT_SOURCE = `#!/usr/bin/env node
// The pre-commit latch - it blocks secrets entering staging, covering BOTH people and agents.
// Generated by \`zemory hook guard\`; the rules live in policy.json next to this file.
// How to wire it: .pre-commit-config.yaml (the repo declares it) -> entry \`node <this path>\`,
// hoac .git/hooks/pre-commit goi truc tiep.
"use strict";
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const POLICY = JSON.parse(fs.readFileSync(path.join(__dirname, "policy.json"), "utf8"));
function globToRe(pat) {
  return new RegExp("^" + pat.replace(/[.+^$(){}|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*").replace(/\\?/g, ".") + "$", "i");
}
// maxBuffer: the 1 MB default died with ENOBUFS once ~7,000 paths were staged (Dept_OPS 2026-10-19, a 9,323-file rename)
const staged = cp.execSync("git diff --cached --name-only", { encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 }).split(/\\r?\\n/).filter(Boolean);
const bad = [];
for (const f of staged) {
  const name = f.replace(/\\\\/g, "/").split("/").pop() || "";
  if ((POLICY.secret_allow || []).some((p) => globToRe(p).test(name))) continue;
  if ((POLICY.secret_names || []).some((p) => globToRe(p).test(name))) bad.push(f);
}
if (bad.length) {
  process.stderr.write("BLOCKED (pre-commit): a file matching a secret pattern is in staging - " + POLICY.secret_reason + "\\n");
  for (const f of bad) process.stderr.write("  - " + f + "\\n");
  process.exit(1);
}
// 02-21 (plan/28 §0q): a secret VALUE in a staged change - a literal password, a connection string with its password, a
// private key, a cloud key - blocks the commit, whoever makes it. Test files are not scanned here: fake logins live there
// (the write hook reminds once). The patterns come from policy.json › secret_values, the same ones the write hook uses.
const SV = POLICY.secret_values;
if (SV && Array.isArray(SV.patterns)) {
  const env = new RegExp(SV.env, "i"), ph = new RegExp(SV.placeholder, "i"), nm = new RegExp(SV.name || "(?!)");
  const TEST = /(^|\\/)(test|tests|__tests__)\\/|\\.test\\.[cm]?[jt]sx?$|_test\\.(py|go)$|(^|\\/)test_[^\\/]+\\.py$/i;
  const CODE = /\\.(py|js|jsx|ts|tsx|mjs|cjs|json|ya?ml|toml|ini|cfg|conf|ps1|sh|bat|cmd|sql|xml|config|cs|java|go|php|rb)$/i;
  const diff = cp.execSync("git diff --cached -U0 --diff-filter=ACMR", { encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  const hits = [];
  let file = "";
  for (const l of diff.split(/\\r?\\n/)) {
    const m = /^\\+\\+\\+ b\\/(.+)$/.exec(l);
    if (m) { file = m[1]; continue; }
    if (!l.startsWith("+") || l.startsWith("+++") || !file || !CODE.test(file) || TEST.test(file)) continue;
    if (/(^|\\/)\\.env(\\.[^\\/]*)?$|(^|\\/)data\\/secrets\\/|(^|\\/)gate\\.json$/i.test(file) || env.test(l)) continue;
    if (SV.skipPath && new RegExp(SV.skipPath, "i").test(file)) continue;
    for (const p of SV.patterns) {
      const v = new RegExp(p.re, p.flags).exec(l);
      if (!v) continue;
      const val = v.length > 1 ? v[v.length - 1] || "" : "";
      if (val && (ph.test(val) || nm.test(val))) continue;
      hits.push(file + " (" + p.kind + ")");
      break;
    }
  }
  if (hits.length) {
    process.stderr.write("BLOCKED (pre-commit): rule 02-21 - a secret value in staging; put it in .env or data/secrets/ and name the environment variable in the file:\\n  " +
      [...new Set(hits)].join("\\n  ") + "\\n");
    process.exit(1);
  }
}
// HP 2 / 7 (plan/27 §0b, 2026-10-14): runtime data, the memory store and model weights never enter git, even under a
// name that is not a secret. Only files ADDED or CHANGED count - removing such a file from git must stay possible.
const DATA_RE = /^(data\\/|global-memory\\/)|\\.(db|db-wal|db-shm|sqlite|sqlite3|onnx|safetensors|gguf|ckpt)$/i;
const addedOrChanged = cp.execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 }).split(/\\r?\\n/).filter(Boolean);
const dataBad = addedOrChanged.filter((f) => DATA_RE.test(f.replace(/\\\\/g, "/")));
if (dataBad.length) {
  process.stderr.write("BLOCKED (pre-commit): runtime data / the memory store / model weights in staging - they never enter git (HP 2, 7):\\n  " +
    dataBad.join("\\n  ") + "\\n");
  process.exit(1);
}
// 02-5 (plan/27 §3): a scratch file the agent had to put in the repo dies in the same turn - it never reaches a commit.
const scratchBad = addedOrChanged.filter((f) => /(^|\\/)(_scratch_[^\\/]*|\\.tmp_[^\\/]*)$/.test(f.replace(/\\\\/g, "/")));
if (scratchBad.length) {
  process.stderr.write("BLOCKED (pre-commit): rule 02-5 - scratch file(s) in staging; a scratch file in the repo is deleted in the same turn:\\n  " +
    scratchBad.join("\\n  ") + "\\n");
  process.exit(1);
}
// The repo's OWN gates (marker key \`repoGates\`), run from the repo root after the secret check - the standard hook
// point for a repo that builds gates for its own constitution. Any non-zero exit blocks the commit.
const top = cp.execSync("git rev-parse --show-toplevel", { encoding: "utf8", windowsHide: true }).trim();
for (const cmd of POLICY.repo_gates || []) {
  const r = cp.spawnSync(cmd, { cwd: top, shell: true, stdio: "inherit", windowsHide: true });
  if (r.status !== 0) {
    process.stderr.write("BLOCKED (pre-commit): repo gate failed - " + cmd + " (exit " + (r.status === null ? "signal" : r.status) + ")\\n");
    process.exit(r.status || 1);
  }
}
process.exit(0);
`;

/**
 * Sinh bộ chốt vào `<nhà harness>/hooks/` (cạnh agent-dir — cùng nhà với đồ của tool).
 * KHÔNG ghi đè file không mang dấu zemory (N1); file của mình thì làm tươi khi lệch
 * (cùng khuôn refresh ROOT_ENTRIES). KHÔNG tự cắm con trỏ runtime — việc nối vào
 * `.claude/settings.json` / `.pre-commit-config.yaml` in ra cho user quyết (4.2).
 */
/**
 * Matcher PreToolUse phai khai DU cac tool guard can soi.
 *
 * The guard is only invoked by the host for tools named in the matcher — a missing name is an open door, and that
 * door is silent: no error, no warning, the command simply goes straight through. Measured 2026-08-20 on a repo
 * measured: the matcher was missing `PowerShell` (the main terminal tool on Windows), so `git push` and
 * recursive deletes through that tool never reached the guard at all.
 *
 * Kept HERE, next to the generator, so this list and the dispatch branch in guard.cjs cannot drift apart.
 */
export const GUARD_MATCHER = "Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell";

/**
 * Tools of `GUARD_MATCHER` that the repo's `.claude/settings.json` does NOT route through `guard.cjs` — or `null` when the
 * guard is not wired at all. Pure: settings text in. Measured 2026-10-07 on zemory itself: the wiring said
 * `Write|Edit|NotebookEdit|Read|Bash` — no `PowerShell`, no `MultiEdit` — so `git push` or a recursive delete through the
 * PowerShell tool never reached the guard (the same hole recorded above on 2026-08-20). `guardDrift` compares only the
 * generated FILES; the wiring lives in the host's settings, which `hook guard` deliberately does not write.
 */
export function guardMatcherGaps(settingsText: string | null): string[] | null {
  if (!settingsText) return null;
  let j: { hooks?: { PreToolUse?: { matcher?: string; hooks?: { command?: string; args?: unknown[] }[] }[] } };
  try {
    j = JSON.parse(settingsText.replace(new RegExp("^" + String.fromCharCode(0xfeff)), "")) as typeof j;
  } catch {
    return null;
  }
  // `command` alone, or `command` + `args` (Dept_OPS writes `"command": "node", "args": ["docs/hooks/guard.cjs"]`).
  const runsGuard = (h: { command?: string; args?: unknown[] }): boolean =>
    /(^|[\\/\s"'])guard\.cjs/.test([h.command ?? "", ...(Array.isArray(h.args) ? h.args : [])].map(String).join(" "));
  const groups = (j.hooks?.PreToolUse ?? []).filter((g) => (g.hooks ?? []).some(runsGuard));
  if (!groups.length) return null;
  const covered = new Set(groups.flatMap((g) => String(g.matcher ?? "").split("|").map((t) => t.trim())));
  if (covered.has("*") || groups.some((g) => !g.matcher)) return []; // no matcher = every tool
  return GUARD_MATCHER.split("|").filter((t) => !covered.has(t));
}

/** Doctor: file chốt ĐÃ SINH nhưng đã TRÔI khỏi bản `hook guard` sẽ sinh hôm nay.
 *
 *  Vì sao phải có máy nhắc (đề xuất từ 05_TODO, nóng lên sau NGÀY CÓ HAI vòng vá guard
 *  2026-08-20 — PowerShell sáng · `.git/`-path + `*.env` chiều): guard KHÔNG tự làm mới,
 *  `generateGuards` chỉ chạy khi gõ `zemory hook guard`, nên mỗi lần zemory vá guard là mọi
 *  repo đã cắm giữ bản HỞ cho tới khi có người NHỚ đi sinh lại — mà "nhớ" chính là thứ luật
 *  guardrail nói không đáng tin. CHỈ soi file mang dấu của zemory (bản user tự sửa: để yên,
 *  nhắc là nhiễu); thiếu hẳn file thì nhánh doctor sẵn có lo. Fail-open: đọc lỗi ⇒ bỏ qua. */
export function guardDrift(projectRoot: string): string[] {
  const folder = isFolderHarness(harnessPathsAt(projectRoot).agent);
  const hooksDir = hooksDirOf(projectRoot);
  const hooksRel = relative(projectRoot, hooksDir).replace(/\\/g, "/");
  const stale: string[] = [];
  const check = (name: string, expected: string, isOurs: (cur: string) => boolean): void => {
    const p = join(hooksDir, name);
    if (!existsSync(p)) return;
    try {
      const cur = readFileSync(p, "utf8");
      if (isOurs(cur) && cur !== expected) stale.push(name);
    } catch {
      /* fail-open */
    }
  };
  const oursJs = (c: string): boolean => c.includes("zemory hook guard");
  check("policy.json", JSON.stringify(buildPolicy(projectRoot, hooksRel), null, 2) + "\n", (c) => {
    try {
      return (JSON.parse(c) as { generator?: unknown }).generator === "zemory";
    } catch {
      return false;
    }
  });
  check("guard.cjs", GUARD_SOURCE, oursJs);
  check(READ_FIRST_FILE, READ_FIRST_SOURCE, oursJs);
  if (!folder) {
    check(SQL_GATE_FILE, SQL_GATE_SOURCE, oursJs);
    for (const h of RULE_HOOKS.filter((x) => !x.folderOnly)) {
      check(h.file, h.source, oursJs);
      if (existsSync(join(hooksDir, "guard.cjs")) && !existsSync(join(hooksDir, h.file))) stale.push(`${h.file} (missing)`);
    }
    if (findSqlStores(projectRoot).length && !existsSync(join(hooksDir, SQL_GATE_FILE))) stale.push(`${SQL_GATE_FILE} (missing)`);
  }
  // Generated by an OLD build: the latch file is missing altogether, so read-before-write never runs there.
  if (existsSync(join(hooksDir, "guard.cjs")) && !existsSync(join(hooksDir, READ_FIRST_FILE))) stale.push(`${READ_FIRST_FILE} (missing)`);
  // Renamed 2026-10-14 (a rule hook is named after its rule, plan/27 §2d): an old-name copy left behind is stale too.
  if (existsSync(join(hooksDir, LEGACY_READ_FIRST_FILE))) stale.push(`${LEGACY_READ_FIRST_FILE} (old name — regenerate)`);
  check("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  return stale;
}

export function generateGuards(projectRoot: string): GuardGenResult {
  // File harness: hooks/ beside the agent folder (`docs/agent` → `docs/hooks`). Folder harness: the folder of rule 02-55
  // (plan/28 §0d). relative() lets the policy find its way back to the repo root.
  const folder = isFolderHarness(harnessPathsAt(projectRoot).agent);
  const hooksDir = hooksDirOf(projectRoot);
  const hooksRel = relative(projectRoot, hooksDir).replace(/\\/g, "/");
  mkdirSync(hooksDir, { recursive: true });

  const policy = buildPolicy(projectRoot, hooksRel);
  const added: string[] = [];
  const kept: string[] = [];

  const put = (name: string, content: string, isOurs: (cur: string) => boolean): void => {
    const p = join(hooksDir, name);
    if (!existsSync(p)) {
      writeFileSync(p, content);
      added.push(name);
      return;
    }
    const cur = readFileSync(p, "utf8");
    if (isOurs(cur) && cur !== content) {
      writeFileSync(p, content);
      added.push(`${name} (refreshed)`);
    } else {
      kept.push(name);
    }
  };

  put("policy.json", JSON.stringify(policy, null, 2) + "\n", (c) => {
    try {
      return (JSON.parse(c) as { generator?: unknown }).generator === "zemory";
    } catch {
      return false;
    }
  });
  const oursJs = (c: string): boolean => c.includes("zemory hook guard");
  put("guard.cjs", GUARD_SOURCE, oursJs);
  put(READ_FIRST_FILE, READ_FIRST_SOURCE, oursJs);
  // The old name (before rule numbering, 2026-10-14): remove OUR copy so a stale latch never runs beside the new one.
  // A file without our mark is the repo's own — left alone.
  const legacy = join(hooksDir, LEGACY_READ_FIRST_FILE);
  if (existsSync(legacy)) {
    try {
      if (oursJs(readFileSync(legacy, "utf8"))) {
        unlinkSync(legacy);
        added.push(`${LEGACY_READ_FIRST_FILE} → ${READ_FIRST_FILE} (renamed)`);
      }
    } catch {
      /* fail-open: the new file is in place either way */
    }
  }
  // 02-25 hook only where the repo has a named-SQL store (policy.sql) — no dead file in a repo that has not adopted the rule.
  // A folder harness carries rule hooks in their own folders (assembled from the store), never next to the guard.
  if (!folder) {
    if (policy.sql) put(SQL_GATE_FILE, SQL_GATE_SOURCE, oursJs);
    for (const h of RULE_HOOKS.filter((x) => !x.folderOnly)) put(h.file, h.source, oursJs);
  }
  put("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  // Flag không bao giờ được theo commit — .gitignore cục bộ trong chính thư mục hooks.
  // + the once-per-session reminder memory of the door hooks (rule-hooks-src.ts `remindOnce`) — runtime state, never committed.
  if (folder) {
    const state = stateDirOf(projectRoot);
    mkdirSync(state, { recursive: true });
    const gi = join(state, ".gitignore");
    if (!existsSync(gi)) {
      writeFileSync(gi, "*\n");
      added.push(`${relative(projectRoot, gi).replace(/\\/g, "/")}`);
    }
  } else {
    put(".gitignore", ".allow-*\n.seen.json\n", () => true);
  }

  const wired = wireGuard(projectRoot, `${hooksRel}/guard.cjs`);
  if (wired) added.push(wired);
  const pc = wirePrecommit(projectRoot, `${hooksRel}/precommit-guard.cjs`);
  if (pc === "wired") added.push("pre-commit (precommit-guard wired)");
  else if (pc === "other") kept.push("pre-commit (the repo's own hook — add `node <hooks>/precommit-guard.cjs` to it by hand)");
  else if (pc === "dead") kept.push(`pre-commit (the repo's own hook calls a precommit-guard.cjs that is gone — every commit fails; point it at ${hooksRel}/precommit-guard.cjs by hand)`);
  return { hooksDir, added, kept, protectedWrite: policy.protected_write as string[] };
}

/** The repo's git hooks folder (`core.hooksPath` honoured, a `.git` FILE of a worktree followed), or null outside git.
 *  Read from disk — no `git` child process: the daemon calls this for every registered repo. */
export function gitHooksDir(projectRoot: string): string | null {
  let gitDir = join(projectRoot, ".git");
  if (!existsSync(gitDir)) return null;
  try {
    const st = readFileSync(gitDir, "utf8");
    const m = /^gitdir:\s*(.+)$/m.exec(st);
    if (m) gitDir = resolve(projectRoot, m[1].trim());
  } catch {
    /* a directory — the normal case */
  }
  try {
    const cfg = readFileSync(join(gitDir, "config"), "utf8");
    const hp = /^\s*hooksPath\s*=\s*(.+?)\s*$/im.exec(cfg);
    if (hp) return resolve(projectRoot, hp[1].replace(/^"|"$/g, ""));
  } catch {
    /* no config — default hooks dir */
  }
  return join(gitDir, "hooks");
}

/** The repo-relative precommit-guard.cjs a pre-commit script runs (`node docs/hooks/precommit-guard.cjs` ·
 *  `exec node "$(git rev-parse --show-toplevel)/docs/…/precommit-guard.cjs"`), or "" when it names none. */
export function precommitTarget(script: string): string {
  const m = /(?:show-toplevel\)\/)?((?:\.\/)?[\w./\\-]*precommit-guard\.cjs)/.exec(script);
  return m ? m[1].replace(/\\/g, "/").replace(/^\.\//, "") : "";
}

/** Is the commit-boundary guard actually run by git? "guard" = a pre-commit that calls precommit-guard.cjs · "dead" = it
 *  calls one that is not there (the latch moved): node fails and EVERY commit is refused (nine repos, 2026-10-18) · "other"
 *  = a pre-commit of the repo's own that does not call it · "none" = no pre-commit · "no-git" = not a git repo. */
export function precommitState(projectRoot: string): "guard" | "dead" | "other" | "none" | "no-git" {
  const dir = gitHooksDir(projectRoot);
  if (!dir) return "no-git";
  const p = join(dir, "pre-commit");
  if (!existsSync(p)) return "none";
  try {
    const t = readFileSync(p, "utf8");
    if (!t.includes("precommit-guard")) return "other";
    const target = precommitTarget(t);
    return target && !existsSync(resolve(projectRoot, target)) ? "dead" : "guard";
  } catch {
    return "other";
  }
}

/** A pre-commit the tool wrote, in any of its past forms: every command line only runs a precommit-guard.cjs (with or
 *  without `exec`, quotes, the rev-parse anchor, `|| exit 1`); comments and the shebang aside. */
function toolPrecommit(script: string): boolean {
  const cmds = script.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  return cmds.length > 0 && cmds.every((l) =>
    /^(?:exec\s+)?node\s+"?(?:\$\(git rev-parse --show-toplevel\)\/)?[\w./\\-]*precommit-guard\.cjs"?(?:\s*\|\|\s*exit\s+1)?$/.test(l));
}

/**
 * CẮM chốt commit vào git: tạo `pre-commit` gọi `precommit-guard.cjs` khi repo CHƯA có pre-commit nào.
 * Đo 2026-10-07: 6/18 repo sinh `precommit-guard.cjs` mà git không bao giờ gọi — secret vào staging lọt qua đúng cái chốt
 * "phủ cả người". Cùng lý lẽ với `wireGuard`: chốt sinh ra mà không cắm là luật bằng chữ. pre-commit CỦA REPO (không gọi
 * guard) thì để yên — ghép vào script của người khác là đoán; trả "other" để lệnh nói ra.
 */
export function wirePrecommit(projectRoot: string, guardRel: string): "wired" | "guard" | "dead" | "other" | "none" | "no-git" {
  const state = precommitState(projectRoot);
  const dir = gitHooksDir(projectRoot);
  const ours = `#!/bin/sh\nexec node "$(git rev-parse --show-toplevel)/${guardRel}"\n`;
  if ((state === "guard" || state === "dead") && dir) {
    // OUR pre-commit - any form the tool ever wrote (`node docs/hooks/precommit-guard.cjs` before the anchored one) -
    // pointing at an old guard path is rewritten: left alone it ran a file the move had taken away and refused every
    // commit (2026-10-18). A repo's own script that calls the guard among other things is left alone.
    const p = join(dir, "pre-commit");
    const cur = readFileSync(p, "utf8");
    if (toolPrecommit(cur) && cur.replace(/\r\n/g, "\n") !== ours) {
      writeFileSync(p, ours, { mode: 0o755 });
      return "wired";
    }
  }
  if (state !== "none") return state;
  if (!dir) return "no-git";
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pre-commit"), ours, { mode: 0o755 });
  return "wired";
}

/**
 * The command that runs the guard, anchored at the project root rather than the session's working folder. Measured
 * 2026-10-16: with `node docs/hooks/guard.cjs`, a session whose working folder had moved into a subfolder ran node on a
 * path that did not exist there — exit 1, which the host treats as a non-blocking error, so the write went through
 * unguarded. Node reads CLAUDE_PROJECT_DIR itself, so the command is the same in Git Bash, PowerShell and cmd; without
 * the variable (another host) it falls back to the working folder as before.
 */
export function guardCommand(guardRel: string): string {
  return `node -e "require((process.env.CLAUDE_PROJECT_DIR||'.')+'/${guardRel}')"`;
}

/**
 * Wires the guard into the repo's runtime: `.claude/settings.json` › PreToolUse, matcher `GUARD_MATCHER` → `guardCommand`.
 *
 * 🔄 Supersede the old line "the tool does not wire it for you — the user reviews and adds it" (user 2026-10-07: *"phải
 * theo chuẩn toàn bộ chứ, đây là luật mà… bộ kiểm của zemory quản có đồng bộ ko"*). Measured that day: 6 of 17 repos had a
 * generated guard that NOTHING called (no settings file), and zemory itself ran it without `PowerShell`/`MultiEdit`.
 * A guard that is generated but not wired is a rule in words only. Merge, never overwrite: other hooks of the repo stay;
 * an existing guard group is WIDENED to the full matcher, never narrowed. Returns what changed, or null.
 */
export function wireGuard(projectRoot: string, guardRel: string): string | null {
  const p = join(projectRoot, ".claude", "settings.json");
  let raw = "";
  let doc: { hooks?: { PreToolUse?: { matcher?: string; hooks?: { type?: string; command?: string; args?: unknown[] }[] }[] } } & Record<string, unknown> = {};
  if (existsSync(p)) {
    raw = readFileSync(p, "utf8");
    try {
      doc = JSON.parse(raw.replace(new RegExp("^" + String.fromCharCode(0xfeff)), "")) as typeof doc;
    } catch {
      return null; // a settings file we cannot read is left alone — doctor reports it
    }
  }
  const runsGuard = (h: { command?: string; args?: unknown[] }): boolean =>
    /(^|[\\/\s"'])guard\.cjs/.test([h.command ?? "", ...(Array.isArray(h.args) ? h.args : [])].map(String).join(" "));
  const want = guardCommand(guardRel);
  // Any other guard command is repointed to `want`, like a narrow matcher widened: one pointing at another path (the guard
  // moved: file harness → folder harness, plan/28 §0d) calls a file that is no longer there, and a bare relative path
  // (`node docs/hooks/guard.cjs`, with or without `args`) dies the moment the session's working folder moves below the
  // repo root — in both cases the host lets every call through.
  const stale = (h: { command?: string; args?: unknown[] }): boolean =>
    runsGuard(h) && !(h.command === want && !(Array.isArray(h.args) && h.args.length));
  const repoint = (h: { command?: string; args?: unknown[] }): void => {
    h.command = want;
    delete h.args;
  };
  const gaps = guardMatcherGaps(raw || null);
  const anyStale = (doc.hooks?.PreToolUse ?? []).some((g) => (g.hooks ?? []).some(stale));
  if (gaps !== null && gaps.length === 0 && !anyStale) return null; // already wired in full, at the right path
  doc.hooks ??= {};
  const pre = (doc.hooks.PreToolUse ??= []);
  const group = pre.find((g) => (g.hooks ?? []).some(runsGuard));
  if (group) {
    group.matcher = GUARD_MATCHER;
    for (const h of group.hooks ?? []) if (stale(h)) repoint(h);
  } else pre.unshift({ matcher: GUARD_MATCHER, hooks: [{ type: "command", command: want }] });
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  mkdirSync(join(projectRoot, ".claude"), { recursive: true });
  writeFileSync(p, JSON.stringify(doc, null, 2).split("\n").join(eol) + eol);
  if (!group) return ".claude/settings.json (guard wired)";
  return anyStale ? ".claude/settings.json (guard path updated)" : ".claude/settings.json (guard matcher widened)";
}
