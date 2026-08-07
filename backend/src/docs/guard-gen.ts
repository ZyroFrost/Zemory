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
import { join, relative } from "node:path";
import { harnessPathsAt, readMarker } from "../core/config.js";

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

/** Mẫu secret MẶC ĐỊNH — đúng bộ của bản mẫu, trừ các tên riêng của repo đó. */
const SECRET_DEFAULTS = [".env", ".env.*", "*.pem", "*.ppk", "id_rsa*", "id_ed25519*", "*.key"];
const SECRET_ALLOW_DEFAULTS = [".env.example"];

/** policy.json sinh từ marker — marker là nguồn, file này là DẪN XUẤT sinh lại được. */
function buildPolicy(root: string, hooksRel: string): Record<string, unknown> {
  let protectedWrite: string[] = [];
  let secretExtra: string[] = [];
  let secretAllowExtra: string[] = [];
  // readMarker: MỘT người đọc marker (đã lột BOM). Bản đầu tự parse ở đây và nuốt lỗi
  // im lặng — fixture Windows (Set-Content ghi BOM) đã chứng minh policy sinh ra MẤT
  // `protected` mà không ai hay. Marker hỏng ⇒ policy chỉ còn bộ mặc định (secret vẫn gác).
  const marker = readMarker(root);
  if (marker) {
    const j = marker.data as { protected?: unknown; secretNames?: unknown; secretAllow?: unknown };
    const strs = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim()) : [];
    protectedWrite = strs(j.protected);
    secretExtra = strs(j.secretNames);
    secretAllowExtra = strs(j.secretAllow);
  }
  return {
    generator: "zemory",
    comment:
      "MOT nguon luat lop 1 (bat kha dao + may kiem duoc). guard.cjs (PreToolUse) va precommit-guard.cjs cung doc file nay. " +
      "Sinh tu marker (.harness.json khoa `protected`/`secretNames`/`secretAllow`) — sua marker roi chay `zemory hook guard` de sinh lai.",
    protected_write: protectedWrite,
    protected_write_reason: "duong da khai `protected` trong .harness.json — do cua repo, harness/agent khong duoc ghi vao",
    secret_names: [...new Set([...SECRET_DEFAULTS, ...secretExtra])],
    secret_allow: [...new Set([...SECRET_ALLOW_DEFAULTS, ...secretAllowExtra])],
    secret_reason: "secret khong bao gio vao commit — KHONG co flag vuot (gia da tra: secret len GitHub 2026-08-04)",
    // `*.key` CÓ MẶT ở đây dù bản mẫu gốc không có: nhất quán với secret_names — đã cấm
    // COMMIT thì cũng cấm ĐỌC vào transcript (phiên agent bị ingest vào DB rồi theo bundle
    // đi xa; chìa lọt vào transcript là kịch bản plan/16 §4 cấm). Đo thật trên zemory:
    // Read data/share.key từng đi qua êm vì thiếu đúng mẫu này.
    key_read_block: ["*.pem", "*.ppk", "id_rsa*", "id_ed25519*", "*.key"],
    key_read_reason: "noi dung file key khong bao gio duoc doc/tra/ghi log; duong dan key chi la DUONG DAN",
    flags_dir: hooksRel,
    flags: { push: ".allow-push", docs_write: ".allow-docs-write", git_add_all: ".allow-git-add-all" },
    flags_comment: "Flag = user duyet MOT lan: guard cho qua roi TU XOA. Agent chi duoc tao flag sau khi user noi ro trong phien.",
  };
}

// ── guard.cjs — nguồn nhúng (như db.ts nhúng SQL). CHỈ stdlib, chạy mọi nơi có node. ──
const GUARD_SOURCE = `#!/usr/bin/env node
// PreToolUse guard - lop 1 (bat kha dao) - CHAN TRUOC khi hanh dong cham dia/mang.
// Sinh boi \`zemory hook guard\` (ADAPT v2 4b). Luat o policy.json CANH FILE NAY - sua
// luat thi sua policy (hoac marker roi sinh lai), KHONG sua file nay.
// Giao thuc hook Claude Code: stdin = JSON {tool_name, tool_input}; exit 0 = cho qua;
// exit 2 = CHAN, stderr duoc dua lai cho agent doc.
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const HERE = __dirname;
const POLICY = JSON.parse(fs.readFileSync(path.join(HERE, "policy.json"), "utf8"));
// hooks dir nam o <root>/<flags_dir> => root = di nguoc tu HERE theo do sau cua flags_dir.
const ROOT = path.resolve(HERE, ...POLICY.flags_dir.split("/").map(() => ".."));

function deny(msg) { process.stderr.write(String(msg).trim() + "\\n"); process.exit(2); }

function consumeFlag(name) {
  const p = path.join(ROOT, POLICY.flags_dir, POLICY.flags[name]);
  if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} return true; }
  return false;
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

function checkWrite(rel) {
  if (nameMatches(rel, POLICY.secret_allow || [])) return;
  for (const prefix of POLICY.protected_write || []) {
    const pre = prefix.replace(/\\/+$/, "");
    if (rel === pre || rel.startsWith(pre + "/")) {
      if (consumeFlag("docs_write")) return;
      deny("CHAN (guard lop 1): ghi vao \`" + prefix + "\` - " + POLICY.protected_write_reason +
        "\\nUser da duyet trong phien? -> tao flag \`" + POLICY.flags_dir + "/" + POLICY.flags.docs_write + "\` roi lam lai (flag dung MOT lan).");
    }
  }
}

function checkRead(rel) {
  if (nameMatches(rel, POLICY.key_read_block || [])) {
    deny("CHAN (guard lop 1): doc file key \`" + rel + "\` - " + POLICY.key_read_reason);
  }
}

// Bo DUNG payload cua -m/--message va heredoc (noi sinh chan oan), giu nguyen phan con lai.
// Bo MOI chuoi trong nhay la lo hong da do: lenh boc trong bash -c "..." bi xoa sach =>
// guard khong thay gi => moi luat lop 1 tat cam.
function stripMessages(cmd) {
  let out = cmd.replace(/(?:-m|--message=?)\\s*(['"])[\\s\\S]*?\\1/g, " -m MSG ");
  out = out.replace(/<<-?\\s*(['"]?)(\\w+)\\1[\\s\\S]*?^\\2/gm, " HEREDOC ");
  return out;
}

function checkBash(cmd) {
  const bare = stripMessages(cmd);

  if (/\\bgit\\b[^\\n;|&]*\\bpush\\b/.test(bare)) {
    if (!consumeFlag("push")) {
      deny("CHAN (guard lop 1): \`git push\` - user bao push moi push (02_RULES Git)." +
        "\\nUser vua bao? -> tao flag \`" + POLICY.flags_dir + "/" + POLICY.flags.push + "\` roi chay lai (mot lan).");
    }
  }

  if (/\\bgit\\b[^\\n;|&]*\\bcommit\\b[^\\n;|&]*(--no-verify|\\s-n\\b)/.test(bare)) {
    deny("CHAN (guard lop 1): \`git commit --no-verify\` lach pre-commit - khong co duong vuot.");
  }

  if (/\\bgit\\b[^\\n;|&]*\\badd\\b[^\\n;|&]*(\\s-A\\b|\\s--all\\b|\\s\\.\\s*($|;|&|\\|))/.test(bare)) {
    if (!consumeFlag("git_add_all")) {
      deny("CHAN (guard lop 1): \`git add -A/.\` - chinh lenh nay da dua secret len GitHub (2026-08-04)." +
        "\\nLiet ke file tuong minh; that su can ca cay thi xin user tao flag \`" +
        POLICY.flags_dir + "/" + POLICY.flags.git_add_all + "\` (mot lan).");
    }
  }

  // Secret vao staging/commit - soi \`bare\` (da bo payload -m) de ten file NHAC TRONG
  // message khong bi chan oan, nhung \`git add "app/x.env"\` van bi bat (nhay chi la phan cach).
  if (/\\bgit\\b[^\\n;|&]*\\b(add|commit|mv)\\b/.test(bare)) {
    for (const tok of bare.split(/[\\s'";|&]+/)) {
      const name = tok.replace(/\\\\/g, "/").split("/").pop();
      if (!name) continue;
      if (nameMatches(name, POLICY.secret_allow || [])) continue;
      if (nameMatches(name, POLICY.secret_names || [])) {
        deny("CHAN (guard lop 1): \`" + name + "\` khop mau secret trong lenh git - " + POLICY.secret_reason);
      }
    }
  }

  // Doc noi dung file key bang shell - cung luat voi checkRead.
  if (/\\b(cat|less|more|head|tail|type|base64|xxd|od|strings|cp|scp)\\b/.test(bare)) {
    for (const tok of cmd.split(/[\\s'";|&]+/)) {
      const name = tok.replace(/\\\\/g, "/").split("/").pop();
      if (name && nameMatches(name, POLICY.key_read_block || [])) {
        deny("CHAN (guard lop 1): lenh shell cham noi dung file key \`" + name + "\` - " + POLICY.key_read_reason);
      }
    }
  }
}

function main() {
  let payload;
  try {
    // Lot BOM truoc khi parse: pipe PowerShell 5.1 chen U+FEFF vao dau stdin (do that
    // 2026-08-07 — cung ho loi voi marker BOM), khong lot la moi luat tat cam (fail-open).
    payload = JSON.parse(fs.readFileSync(0, "utf8").replace(/^\\uFEFF/, ""));
  } catch {
    process.exit(0); // khong doc duoc input thi khong phan - guard hong khong duoc chan bua
  }
  const tool = payload.tool_name || "";
  const ti = payload.tool_input || {};
  if (tool === "Write" || tool === "Edit" || tool === "NotebookEdit") {
    const p = ti.file_path || ti.notebook_path || "";
    if (p) checkWrite(relToRoot(p));
  } else if (tool === "Read") {
    if (ti.file_path) checkRead(relToRoot(ti.file_path));
  } else if (tool === "Bash") {
    if (ti.command) checkBash(String(ti.command));
  }
  process.exit(0);
}
main();
`;

const PRECOMMIT_SOURCE = `#!/usr/bin/env node
// Chot pre-commit - chan secret vao staging, phu CA NGUOI lan agent.
// Sinh boi \`zemory hook guard\`; luat o policy.json canh file nay.
// Cach noi: .pre-commit-config.yaml (repo tu khai) -> entry \`node <duong nay>\`,
// hoac .git/hooks/pre-commit goi truc tiep.
"use strict";
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const POLICY = JSON.parse(fs.readFileSync(path.join(__dirname, "policy.json"), "utf8"));
function globToRe(pat) {
  return new RegExp("^" + pat.replace(/[.+^$(){}|[\\]\\\\]/g, "\\\\$&").replace(/\\*/g, ".*").replace(/\\?/g, ".") + "$", "i");
}
const staged = cp.execSync("git diff --cached --name-only", { encoding: "utf8" }).split(/\\r?\\n/).filter(Boolean);
const bad = [];
for (const f of staged) {
  const name = f.replace(/\\\\/g, "/").split("/").pop() || "";
  if ((POLICY.secret_allow || []).some((p) => globToRe(p).test(name))) continue;
  if ((POLICY.secret_names || []).some((p) => globToRe(p).test(name))) bad.push(f);
}
if (bad.length) {
  process.stderr.write("CHAN (pre-commit): file khop mau secret trong staging - " + POLICY.secret_reason + "\\n");
  for (const f of bad) process.stderr.write("  - " + f + "\\n");
  process.exit(1);
}
process.exit(0);
`;

/**
 * Sinh bộ chốt vào `<nhà harness>/hooks/` (cạnh agent-dir — cùng nhà với đồ của tool).
 * KHÔNG ghi đè file không mang dấu zemory (N1); file của mình thì làm tươi khi lệch
 * (cùng khuôn refresh ROOT_ENTRIES). KHÔNG tự cắm con trỏ runtime — việc nối vào
 * `.claude/settings.json` / `.pre-commit-config.yaml` in ra cho user quyết (4.2).
 */
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
  put("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  // Flag không bao giờ được theo commit — .gitignore cục bộ trong chính thư mục hooks.
  put(".gitignore", ".allow-*\n", () => true);

  return { hooksDir, added, kept, protectedWrite: policy.protected_write as string[] };
}
