#!/usr/bin/env node
// PreToolUse guard - lop 1 (bat kha dao) - CHAN TRUOC khi hanh dong cham dia/mang.
// Sinh boi `zemory hook guard` (ADAPT v2 4b). Luat o policy.json CANH FILE NAY - sua
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

function deny(msg) { process.stderr.write(String(msg).trim() + "\n"); process.exit(2); }

function consumeFlag(name) {
  const p = path.join(ROOT, POLICY.flags_dir, POLICY.flags[name]);
  if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} return true; }
  return false;
}

function relToRoot(p) {
  const s = String(p).replace(/\\/g, "/");
  const root = ROOT.replace(/\\/g, "/");
  const rel = path.relative(root, s).replace(/\\/g, "/");
  if (rel && !rel.startsWith("..")) return rel;
  const base = root.replace(/\/+$/, "").split("/").pop();
  const marker = "/" + base + "/";
  if (s.includes(marker)) return s.split(marker).slice(1).join(marker);
  return s.replace(/^\/+/, "");
}

function globToRe(pat) {
  return new RegExp("^" + pat.replace(/[.+^$(){}|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
}
function nameMatches(rel, patterns) {
  const name = rel.split("/").pop() || "";
  return patterns.some((p) => globToRe(p).test(name));
}

function checkWrite(rel) {
  if (nameMatches(rel, POLICY.secret_allow || [])) return;
  for (const prefix of POLICY.protected_write || []) {
    const pre = prefix.replace(/\/+$/, "");
    if (rel === pre || rel.startsWith(pre + "/")) {
      if (consumeFlag("docs_write")) return;
      deny("CHAN (guard lop 1): ghi vao `" + prefix + "` - " + POLICY.protected_write_reason +
        "\nUser da duyet trong phien? -> tao flag `" + POLICY.flags_dir + "/" + POLICY.flags.docs_write + "` roi lam lai (flag dung MOT lan).");
    }
  }
}

function checkRead(rel) {
  if (nameMatches(rel, POLICY.key_read_block || [])) {
    deny("CHAN (guard lop 1): doc file key `" + rel + "` - " + POLICY.key_read_reason);
  }
}

// Bo DUNG payload cua -m/--message va heredoc (noi sinh chan oan), giu nguyen phan con lai.
// Bo MOI chuoi trong nhay la lo hong da do: lenh boc trong bash -c "..." bi xoa sach =>
// guard khong thay gi => moi luat lop 1 tat cam.
function stripMessages(cmd) {
  let out = cmd.replace(/(?:-m|--message=?)\s*(['"])[\s\S]*?\1/g, " -m MSG ");
  out = out.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\2/gm, " HEREDOC ");
  return out;
}

function checkBash(cmd) {
  const bare = stripMessages(cmd);

  if (/\bgit\b[^\n;|&]*\bpush\b/.test(bare)) {
    if (!consumeFlag("push")) {
      deny("CHAN (guard lop 1): `git push` - user bao push moi push (02_RULES Git)." +
        "\nUser vua bao? -> tao flag `" + POLICY.flags_dir + "/" + POLICY.flags.push + "` roi chay lai (mot lan).");
    }
  }

  if (/\bgit\b[^\n;|&]*\bcommit\b[^\n;|&]*(--no-verify|\s-n\b)/.test(bare)) {
    deny("CHAN (guard lop 1): `git commit --no-verify` lach pre-commit - khong co duong vuot.");
  }

  if (/\bgit\b[^\n;|&]*\badd\b[^\n;|&]*(\s-A\b|\s--all\b|\s\.\s*($|;|&|\|))/.test(bare)) {
    if (!consumeFlag("git_add_all")) {
      deny("CHAN (guard lop 1): `git add -A/.` - chinh lenh nay da dua secret len GitHub (2026-08-04)." +
        "\nLiet ke file tuong minh; that su can ca cay thi xin user tao flag `" +
        POLICY.flags_dir + "/" + POLICY.flags.git_add_all + "` (mot lan).");
    }
  }

  // Secret vao staging/commit - soi `bare` (da bo payload -m) de ten file NHAC TRONG
  // message khong bi chan oan, nhung `git add "app/x.env"` van bi bat (nhay chi la phan cach).
  if (/\bgit\b[^\n;|&]*\b(add|commit|mv)\b/.test(bare)) {
    for (const tok of bare.split(/[\s'";|&]+/)) {
      const name = tok.replace(/\\/g, "/").split("/").pop();
      if (!name) continue;
      if (nameMatches(name, POLICY.secret_allow || [])) continue;
      if (nameMatches(name, POLICY.secret_names || [])) {
        deny("CHAN (guard lop 1): `" + name + "` khop mau secret trong lenh git - " + POLICY.secret_reason);
      }
    }
  }

  // XOA - nhanh HEP CO CHU DICH (them 2026-08-10).
  //
  // Vi sao truoc do khong co: guard 1.2.0 sinh 5 nhanh, khong nhanh nao ve xoa. Thu that
  // tren ban do: `rm -rf docs/agent`, `Remove-Item -Recurse -Force data`, `del /S /Q`
  // deu rc=0, LOT sach. Trong khi 02_RULES Hanh xu noi ro xoa la BAT KHA DAO va phai
  // hoi user truoc - luat co chu, khong co chot may.
  //
  // Vi sao HEP chu khong chan moi lenh xoa: agent xoa file tam suot ngay; chan tat thi
  // moi lenh deu phai xin flag, va "gate nhieu = gate bi bo qua" (02_RULES). Nen chi
  // chan hai thu that su khong dao duoc:
  //   (a) xoa DE QUY / hang loat - mot lenh quet ca cay
  //   (b) xoa trung duong da khai `protected` hoac khop mau secret - du khong de quy
  const RECURSIVE_DEL =
    /\brm\b[^\n;|&]*\s-[a-z]*r[a-z]*\b|\bRemove-Item\b[^\n;|&]*-Recurse\b|\brmdir\b[^\n;|&]*\/[sS]\b|\bdel\b[^\n;|&]*\/[sS]\b/;
  const ANY_DEL = /\brm\b|\bRemove-Item\b|\brmdir\b|\bdel\b|\bUnlink\b/;
  if (ANY_DEL.test(bare)) {
    const recursive = RECURSIVE_DEL.test(bare);
    for (const tok of bare.split(/[\s'";|&]+/)) {
      if (!tok || tok.startsWith("-") || tok.startsWith("/")) continue;
      const rel = tok.replace(/\\/g, "/").replace(/^\.\//, "");
      const name = rel.split("/").pop();
      if (name && !nameMatches(name, POLICY.secret_allow || []) && nameMatches(name, POLICY.secret_names || [])) {
        deny("CHAN (guard lop 1): lenh xoa cham file secret `" + name + "` - " + POLICY.secret_reason);
      }
      for (const prefix of POLICY.protected_write || []) {
        if (rel === prefix || rel.startsWith(prefix.replace(/\/$/, "") + "/")) {
          deny("CHAN (guard lop 1): xoa trong duong da khai protected `" + prefix + "` - " +
            POLICY.protected_write_reason);
        }
      }
    }
    if (recursive && !consumeFlag("delete")) {
      deny("CHAN (guard lop 1): xoa DE QUY - thao tac bat kha dao, 02_RULES bat hoi user truoc." +
        "\nUser da dong y? -> tao flag `" + POLICY.flags_dir + "/" + POLICY.flags.delete + "` roi chay lai (mot lan).");
    }
  }

  // Doc noi dung file key bang shell - cung luat voi checkRead.
  if (/\b(cat|less|more|head|tail|type|base64|xxd|od|strings|cp|scp)\b/.test(bare)) {
    for (const tok of cmd.split(/[\s'";|&]+/)) {
      const name = tok.replace(/\\/g, "/").split("/").pop();
      if (name && nameMatches(name, POLICY.key_read_block || [])) {
        deny("CHAN (guard lop 1): lenh shell cham noi dung file key `" + name + "` - " + POLICY.key_read_reason);
      }
    }
  }
}

function main() {
  let payload;
  try {
    // Lot BOM truoc khi parse: pipe PowerShell 5.1 chen U+FEFF vao dau stdin (do that
    // 2026-08-07 — cung ho loi voi marker BOM), khong lot la moi luat tat cam (fail-open).
    payload = JSON.parse(fs.readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
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
