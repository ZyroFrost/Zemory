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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";
import { READ_FIRST_SOURCE } from "./read-first-src.js";

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
    protectedWrite = strs(j.protected);
    secretExtra = strs(j.secretNames);
    secretAllowExtra = strs(j.secretAllow);
    // Ngoài-project (2026-10-06): chỗ ghi ngoài repo user đã cho phép sẵn + máy chủ SQL được nhắm tới.
    allowedRoots = strs(j.allowedRoots);
    allowedSqlServers = strs(j.allowedSqlServers);
    // The repo's own gates for its constitution (Dept_FA 2026-10-07: they hand-edited .git/hooks/pre-commit to add one).
    repoGates = strs(j.repoGates);
  }
  // READ BEFORE WRITE (user 2026-10-08) — the set every session must have read in full before it acts, plus the files the
  // action itself needs (a case's spec · the AGENTS.md triggers a machine can recognise). Paths are repo-relative, posix.
  const hp = harnessPathsAt(root);
  const relp = (p: string): string => relative(root, p).replace(/\\/g, "/");
  const agentRel = relp(hp.agent);
  const skillsRel = relp(hp.skills);
  const readFirstExtra = marker ? (Array.isArray((marker.data as { readFirst?: unknown }).readFirst) ? ((marker.data as { readFirst: unknown[] }).readFirst.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim().replace(/\\/g, "/"))) : []) : [];
  const isApp = ((marker?.data as { profile?: unknown } | undefined)?.profile ?? "app") === "app";
  const readFirst = {
    required: [
      ...["01_CONSTITUTION.md", "02_RULES.md", "05_TODO.md", "06_CHANGES.md"].map((f) => `${agentRel}/${f}`),
      `${relp(hp.plan)}/*.md`,
      ...readFirstExtra,
    ],
    case_root: "tasks",
    case_files: ["spec.md", "mail_form.md"],
    triggers: [
      { when: "new_dir", read: `${agentRel}/03_STRUCTURE.md` },
      ...(isApp ? [{ when: "path_prefix", prefix: "frontend", read: `${skillsRel}/app-design/SKILL.md` }] : []),
      { when: "cmd_re", re: "(mail|smtp|email)[\\w.-]*\\.(py|ps1|js|mjs|cjs|cmd|bat)\\b", read: `${skillsRel}/write-style/SKILL.md` },
      // A sender named anything ("03_send.py"): read the script — and one hop into what a launcher calls (Dept_FA 2026-10-08).
      { when: "script_re", re: "smtplib|send-mailmessage|smtpclient|sendmail\\(|send_message\\(|graph_mail|smtp_mail|/sendMail\\b", read: `${skillsRel}/write-style/SKILL.md` },
    ],
  };
  return {
    generator: "zemory",
    comment:
      "ONE source for the layer-1 rules (irreversible actions the machine can check). guard.cjs (PreToolUse) and precommit-guard.cjs both read this file. " +
      "Generated from the marker (.harness.json keys `protected`/`secretNames`/`secretAllow`/`allowedRoots`/`allowedSqlServers`/`repoGates`) — edit the marker, then run `zemory hook guard` to regenerate.",
    protected_write: protectedWrite,
    protected_write_reason: "a path declared `protected` in .harness.json — it belongs to the repo, the harness agent may not write into it",
    secret_names: [...new Set([...SECRET_DEFAULTS, ...secretExtra])],
    secret_allow: [...new Set([...SECRET_ALLOW_DEFAULTS, ...secretAllowExtra])],
    secret_reason: "a secret must never enter a commit — there is NO flag to get past this (price already paid: a secret reached GitHub 2026-08-04)",
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
    // read-first.cjs: what must be read IN FULL (per the session transcript) before writing / running in the repo. No flag.
    read_first: readFirst,
    outside_reason:
      "work stays INSIDE the project folder (02_RULES §Phạm vi project) — writing outside it, or making a SQL server write files or change its configuration, needs the user's word first",
    flags_dir: hooksRel,
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
// exit 2 = BLOCK, and stderr is handed back to the agent to read.
"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const os = require("node:os");

const HERE = __dirname;
const POLICY = JSON.parse(fs.readFileSync(path.join(HERE, "policy.json"), "utf8"));
// the hooks dir sits at <root>/<flags_dir> => root = walk back from HERE by the depth of flags_dir.
const ROOT = path.resolve(HERE, ...POLICY.flags_dir.split("/").map(() => ".."));

function deny(msg) { process.stderr.write(String(msg).trim() + "\\n"); process.exit(2); }

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
  const m = /ZEMORY-USED ([0-9a-f]+) ([0-9]+)/.exec(prev);
  if (m) {
    if (m[1] === mark && Date.now() - Number(m[2]) < FLAG_RETRY_MS) return true; // retry of the same job
    try { fs.unlinkSync(p); } catch {} // a different job or past the window => revoked, ask again
    return false;
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

function checkWrite(rel) {
  if (nameMatches(rel, POLICY.secret_allow || [])) return;
  for (const prefix of POLICY.protected_write || []) {
    const hit = underProtected(rel, prefix);
    if (hit) {
      if (consumeFlag("docs_write", rel)) return;
      deny("BLOCKED (guard layer 1): writing into \`" + prefix + "\` - " + POLICY.protected_write_reason +
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

function isOutside(tok, strict) {
  const t = String(tok).replace(/^["']|["']$/g, "").trim();
  if (!t || DEVICE_OK.test(t) || /^\\/tmp\\//i.test(t)) return false;
  if (!isAbsTok(t, strict)) return false;
  const c = canonPath(t);
  return !outsideRoots().some((r) => c === r || c.startsWith(r + "/"));
}

// String literals that are only ARGUMENTS of a text operation are data, not a place being written. False block
// reported 2026-10-07 (session db-datawarehouse-fa): \`python -c "...s.replace('E:\\\\_retired','E:\\\\Legacy')..."\` edited
// two .md files INSIDE the repo and was blocked as "writing into E:\\_retired". \`os.path.join\` is NOT dropped - it
// builds write paths. The write call's own argument (\`open('C:/x','w')\`) is untouched, so a real outside write still blocks.
function dropTextOps(s) {
  return String(s)
    .replace(/\\.(replace|replaceAll|startswith|endswith|startsWith|endsWith|split|rsplit|find|rfind|index|count|includes|strip|lstrip|rstrip)\\s*\\([^()]*\\)/g, ".$1()")
    .replace(/\\b(re\\.sub|re\\.search|re\\.match|re\\.findall|print|console\\.log)\\s*\\([^()]*\\)/g, "$1()");
}

function denyOutside(what, subject) {
  if (consumeFlag("outside", subject)) return;
  deny("BLOCKED (guard layer 1): " + what + " - " +
    (POLICY.outside_reason || "work stays inside the project folder (02_RULES Pham vi project)") + flagTip("outside"));
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
// even the command that INSPECTS THE FLAG could not run. Added (?<![\\w.-]) so it catches only \`push\` in its real sense.
const PUSH_ARG = "(?<![\\\\w.-])push\\\\b";

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

// The region a rule MUST SCAN. An interpreter means the whole line. Otherwise only the segments with that name.
function zonesFor(cmd, nameRe) {
  const segs = splitSegments(cmd);
  if (segs.some((s) => SEG_INTERP.test(cmdWordOf(s)))) return [cmd];
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

  if (hitsIn(bare, /^git$/, new RegExp(GIT_CMD + "[^\\\\n;|&]*" + PUSH_ARG))) {
    const clash = versionClash();
    if (clash) {
      deny("BLOCKED (guard layer 1): \`git push\` carries code but package.json still says " + clash.version +
        ", the same version as " + clash.upstream + " (" + clash.files + " code file(s) in the push) - bump the version first (02_RULES Git: every push of code carries a NEW version; docs-only pushes are exempt). There is no flag for this.");
    }
    if (!consumeFlag("push", bare)) {
      deny("BLOCKED (guard layer 1): \`git push\` - push only when the user says so (02_RULES Git)." +
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
    /\\bfind\\b[^\\n]*-delete\\b|\\bfind\\b[^\\n]*-exec[^\\n]*\\brm\\b|\\bgit\\s+clean\\b[^\\n]*-[a-z]*[fdx]|\\brobocopy\\b[^\\n]*\\/(MIR|PURGE)\\b|\\brmSync\\s*\\([^)]*recursive|\\brmtree\\s*\\(|\\bxargs\\b[^\\n]*\\brm\\b|\\bGet-ChildItem\\b[^\\n]*\\|[^\\n]*\\bRemove-Item\\b/i;
  const MASS_CMDS = /^(find|git|robocopy|xargs|get-childitem|gci|ls|dir|remove-item|ri|rm)$/;
  if ((anyCmdIs(bare, MASS_CMDS) || SEG_INTERP.test(cmdWordOf(bare))) && MASS_DEL.test(bare) && !consumeFlag("delete", bare)) {
    deny("BLOCKED (guard layer 1): MASS deletion (a whole-tree sweep) - irreversible, and 02_RULES requires asking the user first." +
      flagTip("delete"));
  }

  // DISCARDING UNCOMMITTED WORK - the rule already had WORDS in 02_RULES S Git ("no reset --hard/clean on
  // the user's uncommitted work without asking") but measured 2026-08-11 there was NO latch: both
  // \`git reset --hard\` and \`git checkout -- .\` sailed through. Losing uncommitted work is losing it
  // for good - git cannot rescue what never entered git.
  const DISCARD =
    /\\bgit\\s+reset\\b[^\\n]*--hard\\b|\\bgit\\s+checkout\\b[^\\n]*--\\s|\\bgit\\s+checkout\\s+\\.|\\bgit\\s+restore\\b[^\\n]*(\\.|--staged)|\\bgit\\s+stash\\s+(drop|clear)\\b/;
  if (hitsIn(bare, /^git$/, DISCARD) && !consumeFlag("discard", bare)) {
    deny("BLOCKED (guard layer 1): a command DISCARDING uncommitted work - 02_RULES S Git requires asking the user first." +
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
            deny("BLOCKED (guard layer 1): deleting inside the declared protected path \`" + prefix + "\` - " +
              POLICY.protected_write_reason + flagTip("delete"));
          }
        }
      }
      }
    }
    if (recursive && !delFlagOk()) {
      deny("BLOCKED (guard layer 1): a RECURSIVE delete - an irreversible operation, and 02_RULES requires asking the user first." +
        flagTip("delete"));
    }
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
  const WRITE_VERB = /\\b(open\\s*\\(|write|writeFile|appendFile|writeFileSync|appendFileSync|Set-Content|Add-Content|Out-File|dump|save)\\b/i;

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
  const flagWritePath = (raw, how) => {
    const tok = String(raw).replace(/^["']|["']$/g, "");
    if (!tok || tok.startsWith("-")) return;
    const rel = relToRoot(tok.replace(/\\\\/g, "/").replace(/^\\.\\//, ""));
    for (const prefix of POLICY.protected_write || []) {
      if (!underProtected(rel, prefix)) continue;
      if (consumeFlag("docs_write", bare)) return;
      deny("BLOCKED (guard layer 1): " + how + " \`" + rel + "\` which sits inside the protected path \`" + prefix +
        "\` - " + POLICY.protected_write_reason +
        "\\nDid the user approve it this session? -> create the flag \`" + POLICY.flags_dir + "/" + POLICY.flags.docs_write +
        "\` and try again (the flag is good for ONE use).");
    }
  };

  for (const seg of splitSegments(bare)) {
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
  }

  // ── OUTSIDE THE PROJECT 1: absolute write targets (see WORKING OUTSIDE THE PROJECT above) ──
  // One flag for the whole command line (\`bare\`), the same shape as every branch above.
  const WRITERS = /^(mkdir|md|new-item|ni|set-content|sc|add-content|ac|out-file|tee|tee-object|touch)$/;
  // PowerShell cmdlets: the path is \`-Path\`/\`-FilePath\`/\`-LiteralPath\` or the FIRST positional argument -
  // NOT \`-Value\` (\`Set-Content a.txt -Value /usr/bin\` writes a.txt, it does not write /usr/bin).
  const PS_WRITERS = /^(new-item|ni|set-content|sc|add-content|ac|out-file|tee-object)$/;
  const PS_PATH_PARAM = /^-(path|filepath|literalpath|pspath)$/i;
  const PS_SWITCH = /^-(force|nonewline|append|noclobber|passthru|whatif|confirm|asbytestream|verbose)$/i;
  const outsideHit = (tok, how, strict) => {
    if (isOutside(tok, strict)) denyOutside(how + " \`" + String(tok) + "\` - that is OUTSIDE the project", bare);
  };
  for (const seg of splitSegments(bare)) {
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
    if (tool === "Write" && p) {
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
  // READ BEFORE WRITE (read-first.cjs, policy.read_first) - LAST, so the more specific blocks above keep their message.
  // A failure of the latch itself lets the action through: a broken guard must not block blindly.
  let rfMsg = null;
  try { rfMsg = require(path.join(HERE, "read-first.cjs")).readFirst(payload, ROOT, POLICY); } catch { rfMsg = null; }
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
const staged = cp.execSync("git diff --cached --name-only", { encoding: "utf8", windowsHide: true }).split(/\\r?\\n/).filter(Boolean);
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
  const hp = harnessPathsAt(projectRoot);
  const hooksDir = join(hp.agent, "..", "hooks");
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
  check("read-first.cjs", READ_FIRST_SOURCE, oursJs);
  // Generated by an OLD build: the latch file is missing altogether, so read-before-write never runs there.
  if (existsSync(join(hooksDir, "guard.cjs")) && !existsSync(join(hooksDir, "read-first.cjs"))) stale.push("read-first.cjs (missing)");
  check("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  return stale;
}

export function generateGuards(projectRoot: string): GuardGenResult {
  const hp = harnessPathsAt(projectRoot);
  // hooks/ đặt cạnh agent-dir: `docs/agent` → `docs/hooks` · `harness/agent` → `harness/hooks`
  // (đúng chỗ bản mẫu chọn). relative() để policy tự biết đường về gốc repo.
  const hooksDir = join(hp.agent, "..", "hooks");
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
  put("read-first.cjs", READ_FIRST_SOURCE, oursJs);
  put("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  // Flag không bao giờ được theo commit — .gitignore cục bộ trong chính thư mục hooks.
  put(".gitignore", ".allow-*\n", () => true);

  const wired = wireGuard(projectRoot, `${hooksRel}/guard.cjs`);
  if (wired) added.push(wired);
  const pc = wirePrecommit(projectRoot, `${hooksRel}/precommit-guard.cjs`);
  if (pc === "wired") added.push("pre-commit (precommit-guard wired)");
  else if (pc === "other") kept.push("pre-commit (the repo's own hook — add `node <hooks>/precommit-guard.cjs` to it by hand)");
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

/** Is the commit-boundary guard actually run by git? "guard" = a pre-commit that calls precommit-guard.cjs · "other" = a
 *  pre-commit of the repo's own that does not · "none" = no pre-commit · "no-git" = not a git repo. */
export function precommitState(projectRoot: string): "guard" | "other" | "none" | "no-git" {
  const dir = gitHooksDir(projectRoot);
  if (!dir) return "no-git";
  const p = join(dir, "pre-commit");
  if (!existsSync(p)) return "none";
  try {
    return readFileSync(p, "utf8").includes("precommit-guard") ? "guard" : "other";
  } catch {
    return "other";
  }
}

/**
 * CẮM chốt commit vào git: tạo `pre-commit` gọi `precommit-guard.cjs` khi repo CHƯA có pre-commit nào.
 * Đo 2026-10-07: 6/18 repo sinh `precommit-guard.cjs` mà git không bao giờ gọi — secret vào staging lọt qua đúng cái chốt
 * "phủ cả người". Cùng lý lẽ với `wireGuard`: chốt sinh ra mà không cắm là luật bằng chữ. pre-commit CỦA REPO (không gọi
 * guard) thì để yên — ghép vào script của người khác là đoán; trả "other" để lệnh nói ra.
 */
export function wirePrecommit(projectRoot: string, guardRel: string): "wired" | "guard" | "other" | "none" | "no-git" {
  const state = precommitState(projectRoot);
  if (state !== "none") return state;
  const dir = gitHooksDir(projectRoot);
  if (!dir) return "no-git";
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pre-commit"), `#!/bin/sh\nexec node "$(git rev-parse --show-toplevel)/${guardRel}"\n`, { mode: 0o755 });
  return "wired";
}

/**
 * CẮM guard vào runtime của repo: `.claude/settings.json` › PreToolUse, matcher `GUARD_MATCHER` → `node <guard>`.
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
  const gaps = guardMatcherGaps(raw || null);
  if (gaps !== null && gaps.length === 0) return null; // already wired in full
  doc.hooks ??= {};
  const pre = (doc.hooks.PreToolUse ??= []);
  const runsGuard = (h: { command?: string; args?: unknown[] }): boolean =>
    /(^|[\\/\s"'])guard\.cjs/.test([h.command ?? "", ...(Array.isArray(h.args) ? h.args : [])].map(String).join(" "));
  const group = pre.find((g) => (g.hooks ?? []).some(runsGuard));
  if (group) group.matcher = GUARD_MATCHER;
  else pre.unshift({ matcher: GUARD_MATCHER, hooks: [{ type: "command", command: `node ${guardRel}` }] });
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  mkdirSync(join(projectRoot, ".claude"), { recursive: true });
  writeFileSync(p, JSON.stringify(doc, null, 2).split("\n").join(eol) + eol);
  return group ? ".claude/settings.json (guard matcher widened)" : ".claude/settings.json (guard wired)";
}
