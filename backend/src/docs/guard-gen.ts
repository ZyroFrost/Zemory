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

/** Mẫu secret MẶC ĐỊNH — đúng bộ của bản mẫu, trừ các tên riêng của repo đó.
 *  `*.env` thêm 2026-08-20: bộ cũ chỉ có `.env`/`.env.*` nên `git add ipos_loader.env` /
 *  `prod.env` LỌT SẠCH trên mọi repo dùng mặc định (đo tái lập từ báo cáo repo PBI) —
 *  trong khi comment nhánh secret lại tự nhận "app/x.env vẫn bị bắt". File `<tên>.env`
 *  là hình dạng secret phổ biến nhất; tên mẫu (example/sample) đi qua secret_allow. */
const SECRET_DEFAULTS = [".env", ".env.*", "*.env", "*.pem", "*.ppk", "id_rsa*", "id_ed25519*", "*.key"];
const SECRET_ALLOW_DEFAULTS = [".env.example", "example.env", "sample.env"];

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
    },
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
const crypto = require("node:crypto");
const path = require("node:path");

const HERE = __dirname;
const POLICY = JSON.parse(fs.readFileSync(path.join(HERE, "policy.json"), "utf8"));
// hooks dir nam o <root>/<flags_dir> => root = di nguoc tu HERE theo do sau cua flags_dir.
const ROOT = path.resolve(HERE, ...POLICY.flags_dir.split("/").map(() => ".."));

function deny(msg) { process.stderr.write(String(msg).trim() + "\\n"); process.exit(2); }

// Cua so cho phep MOT viec duoc thu lai sau khi flag da duoc tieu thu (ms).
//
// Vi sao can: hook PreToolUse chi noi CHO QUA - no khong biet lenh co thuc su chay hay khong.
// Do that 2026-08-20 luc push 2.0.0: guard cho qua (an flag), roi mot tang khac cua host chan
// lenh lai => lenh KHONG chay ma flag DA MAT, phai xin user tao lai. Huong sai o day la
// 'phai xin lai' chu khong phai 'lot qua' - an toan, nhung la ma sat that, va no danh dung vao
// luc user vua dong y xong.
//
// 90 giay: du cho mot lan thu lai ngay lap tuc, ngan hon nhieu so voi khoang cach giua hai
// quyet dinh that cua user. Het cua so la flag chet han.
const FLAG_RETRY_MS = 90 * 1000;

function consumeFlag(name, subject) {
  // Ten flag THIEU trong policy = policy CU di cung guard MOI (bo cowork duoc mang tay sang
  // may khac nen hai file chac chan co luc lech phien ban). Thieu ten thi coi nhu KHONG co
  // flag - van CHAN, chi la khong co duong vuot. Chan nham con hon thung im lang.
  const file = (POLICY.flags || {})[name];
  if (!file) return false;
  const p = path.join(ROOT, POLICY.flags_dir, file);
  if (!fs.existsSync(p)) return false;

  // Dau van tay cua VIEC dang xin phep: flag chi mo cho DUNG viec do, khong phai mo cua trong
  // 90 giay cho bat cu gi. Doi lenh (push branch khac, xoa thu muc khac) => dau khac => thu hoi.
  const mark = crypto.createHash("sha1").update(String(subject || name)).digest("hex").slice(0, 16);
  let prev = "";
  try { prev = fs.readFileSync(p, "utf8"); } catch {}
  const m = /ZEMORY-USED ([0-9a-f]+) ([0-9]+)/.exec(prev);
  if (m) {
    if (m[1] === mark && Date.now() - Number(m[2]) < FLAG_RETRY_MS) return true; // thu lai dung viec
    try { fs.unlinkSync(p); } catch {} // khac viec hoac qua han => thu hoi, phai xin lai
    return false;
  }
  // Lan dau: KHONG xoa ngay, chi dong dau da-dung. Flag chet khi het cua so hoac khi co ai
  // xin mot viec khac - nen no van la 'mot lan cho mot viec', chi thoi phat vi mot lan thu lai.
  try {
    fs.writeFileSync(p, "ZEMORY-USED " + mark + " " + Date.now() + "\\n");
  } catch {
    try { fs.unlinkSync(p); } catch {} // ghi khong duoc => ve hanh vi cu: dung mot lan roi thoi
  }
  return true;
}

// Cau chi duong vuot. Policy CU khong khai ten flag => truoc day in ra
// \`docs/hooks/undefined\`, tuc bao nguoi ta tao mot file ten "undefined" - loi huong dan
// im lang, chi lo ra khi co nguoi lam theo. Nay noi thang la policy thieu, va chi cach sinh lai.
function flagTip(name) {
  const file = (POLICY.flags || {})[name];
  if (!file) return "\\n(Policy ban nay chua khai flag \`" + name + "\` => KHONG co duong vuot. Chay \`zemory hook guard\` de sinh lai policy.)";
  return "\\nUser da dong y? -> tao flag \`" + POLICY.flags_dir + "/" + file + "\` roi lam lai (mot lan).";
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
    // Khop TIEN TO (duong co dinh) HOAC GLOB (co \`*\`) - glob de dien dat duoc thu ma tien
    // to khong noi noi: \`data/*/01_raw\` (dau vao goc cua MOI case, ten case khong biet
    // truoc). Thieu no thi hoac phai liet ke tay tung case (khong ai bao tri noi), hoac
    // chan ca \`data\` (chan luon 02_processing ma agent ghi suot => gate bi bo qua).
    const hit = pre.includes("*")
      ? globToRe(pre).test(rel) || globToRe(pre + "/*").test(rel)
      : rel === pre || rel.startsWith(pre + "/");
    if (hit) {
      if (consumeFlag("docs_write", rel)) return;
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

// Nhan dien \`git\` nhu MOT LENH, khong phai mot manh duong dan (vá 2026-08-20, do tu bao
// cao repo PBI + tu tai lap: \`cat .git/hooks/pre-push\` bi doc thanh "git push" => CHAN OAN
// dung luc nguoi ta lam theo huong dan cua \`hook guard\`):
//   (?<!\\.)  — \`git\` di sau dau cham la duong dan/ten (\`.git/hooks\` · \`repo.git\`), khong phai lenh
//   (?![\\\\/]) — \`git\` dinh lien \`/\` hay \`\\\` la duong dan dang di tiep (\`.git/hooks/...\`)
// Van bat du 8 ca do 2026-08-20: \`git push\` · \`cd x && git push\` · \`/usr/bin/git push\` ·
// \`sudo git push\` · \`env A=1 git push\`. KHONG dung "token dau cau" — ba ca cuoi se lot.
const GIT_CMD = "(?<!\\\\.)\\\\bgit\\\\b(?![\\\\\\\\/])";
// \`push\` phai la MOT DOI SO, khong phai mot manh cua ten dai hon (va 2026-08-22, do tu chinh
// phien nay): \`\\\\bpush\\\\b\` khop ca token nam TRONG ten file vi \`-\`/\`.\` la ky tu khong-phai-tu, nen
// \`git check-ignore -v docs/hooks/.allow-push\` bi chan nhu mot lenh push that — tuc chinh cai
// lenh de SOI CO cung khong chay duoc. Them (?<![\\w.-]) de chi bat \`push\` dung nghia.
const PUSH_ARG = "(?<![\\\\w.-])push\\\\b";

function checkBash(cmd) {
  const bare = stripMessages(cmd);

  if (new RegExp(GIT_CMD + "[^\\\\n;|&]*" + PUSH_ARG).test(bare)) {
    if (!consumeFlag("push", bare)) {
      deny("CHAN (guard lop 1): \`git push\` - user bao push moi push (02_RULES Git)." +
        "\\nUser vua bao? -> tao flag \`" + POLICY.flags_dir + "/" + POLICY.flags.push + "\` roi chay lai (mot lan).");
    }
  }

  if (new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\bcommit\\\\b[^\\\\n;|&]*(--no-verify|\\\\s-n\\\\b)").test(bare)) {
    deny("CHAN (guard lop 1): \`git commit --no-verify\` lach pre-commit - khong co duong vuot.");
  }

  if (new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\badd\\\\b[^\\\\n;|&]*(\\\\s-A\\\\b|\\\\s--all\\\\b|\\\\s\\\\.\\\\s*($|;|&|\\\\|))").test(bare)) {
    if (!consumeFlag("git_add_all", bare)) {
      deny("CHAN (guard lop 1): \`git add -A/.\` - chinh lenh nay da dua secret len GitHub (2026-08-04)." +
        "\\nLiet ke file tuong minh; that su can ca cay thi xin user tao flag \`" +
        POLICY.flags_dir + "/" + POLICY.flags.git_add_all + "\` (mot lan).");
    }
  }

  // Secret vao staging/commit. Hai ranh gioi co chu dich (sua 2026-08-20):
  //   · CHI quet token cua DUNG SEGMENT chua lenh git (tach theo ;|&) — ten secret nhac
  //     trong \`echo "example.env staged"\` cung cau lenh KHONG bi chan oan nua (truoc quet
  //     ca dong; nguoi ta se hoc cach thoi viet lenh tu-kiem, do moi la thiet hai).
  //   · \`git add "app/x.env"\` VAN bi bat (nhay chi la phan cach trong segment do).
  //     ⚠ Khang dinh nay tung SAI vi mau thieu \`*.env\` — nay da do lai voi bo mau moi.
  const GIT_STAGE = new RegExp(GIT_CMD + "[^\\\\n;|&]*\\\\b(add|commit|mv)\\\\b");
  if (GIT_STAGE.test(bare)) {
    for (const seg of bare.split(/[\\n;|&]+/)) {
      if (!GIT_STAGE.test(seg)) continue;
      for (const tok of seg.split(/[\\s'"]+/)) {
        const name = tok.replace(/\\\\/g, "/").split("/").pop();
        if (!name) continue;
        if (nameMatches(name, POLICY.secret_allow || [])) continue;
        if (nameMatches(name, POLICY.secret_names || [])) {
          deny("CHAN (guard lop 1): \`" + name + "\` khop mau secret trong lenh git - " + POLICY.secret_reason);
        }
      }
    }
  }

  // XOA - nhanh HEP CO CHU DICH (them 2026-08-10).
  //
  // Vi sao truoc do khong co: guard 1.2.0 sinh 5 nhanh, khong nhanh nao ve xoa. Thu that
  // tren ban do: \`rm -rf docs/agent\`, \`Remove-Item -Recurse -Force data\`, \`del /S /Q\`
  // deu rc=0, LOT sach. Trong khi 02_RULES Hanh xu noi ro xoa la BAT KHA DAO va phai
  // hoi user truoc - luat co chu, khong co chot may.
  //
  // Vi sao HEP chu khong chan moi lenh xoa: agent xoa file tam suot ngay; chan tat thi
  // moi lenh deu phai xin flag, va "gate nhieu = gate bi bo qua" (02_RULES). Nen chi
  // chan hai thu that su khong dao duoc:
  //   (a) xoa DE QUY / hang loat - mot lenh quet ca cay
  //   (b) xoa trung duong da khai \`protected\` hoac khop mau secret - du khong de quy
  const RECURSIVE_DEL =
    /\\brm\\b[^\\n;|&]*\\s-[a-z]*r[a-z]*\\b|\\bRemove-Item\\b[^\\n;|&]*-Recurse\\b|\\brmdir\\b[^\\n;|&]*\\/[sS]\\b|\\bdel\\b[^\\n;|&]*\\/[sS]\\b/;
  const ANY_DEL = /\\brm\\b|\\bRemove-Item\\b|\\brmdir\\b|\\bdel\\b|\\bUnlink\\b/;
  // XOA HANG LOAT KHONG DUNG TU KHOA TREN (them 2026-08-11 sau khi do ma tran 28 ca).
  // Nhanh cu chi nhin \`rm -r\` va ho hang; do that thi 8 duong quet ca cay LOT sach:
  // \`find -delete\` · \`find -exec rm\` · \`git clean -fdx\` · \`robocopy /MIR\` (mirror =
  // xoa thu khong co o nguon) · \`fs.rmSync(recursive)\` trong \`node -e\` · \`shutil.rmtree\`
  // trong \`python -c\` · \`xargs rm\` · \`Get-ChildItem -Recurse | Remove-Item\` (duong ong,
  // khong co duong dan de khop). Chung deu bat kha dao ngang \`rm -rf\`.
  const MASS_DEL =
    /\\bfind\\b[^\\n]*-delete\\b|\\bfind\\b[^\\n]*-exec[^\\n]*\\brm\\b|\\bgit\\s+clean\\b[^\\n]*-[a-z]*[fdx]|\\brobocopy\\b[^\\n]*\\/(MIR|PURGE)\\b|\\brmSync\\s*\\([^)]*recursive|\\brmtree\\s*\\(|\\bxargs\\b[^\\n]*\\brm\\b|\\bGet-ChildItem\\b[^\\n]*\\|[^\\n]*\\bRemove-Item\\b/i;
  if (MASS_DEL.test(bare) && !consumeFlag("delete", bare)) {
    deny("CHAN (guard lop 1): xoa HANG LOAT (quet ca cay) - bat kha dao, 02_RULES bat hoi user truoc." +
      flagTip("delete"));
  }

  // HUY VIEC CHUA COMMIT - luat da co CHU o 02_RULES §Git ("KHONG reset --hard/clean len
  // viec chua commit cua user neu chua hoi") nhung do 2026-08-11 thi KHONG co chot: ca
  // \`git reset --hard\` lan \`git checkout -- .\` deu di qua em. Mat viec chua commit la
  // mat han - git khong cuu duoc thu chua bao gio vao git.
  const DISCARD =
    /\\bgit\\s+reset\\b[^\\n]*--hard\\b|\\bgit\\s+checkout\\b[^\\n]*--\\s|\\bgit\\s+checkout\\s+\\.|\\bgit\\s+restore\\b[^\\n]*(\\.|--staged)|\\bgit\\s+stash\\s+(drop|clear)\\b/;
  if (DISCARD.test(bare) && !consumeFlag("discard", bare)) {
    deny("CHAN (guard lop 1): lenh HUY viec chua commit - 02_RULES §Git bat hoi user truoc." +
      flagTip("discard"));
  }

  // XOA TRANG NOI DUNG ma khong "xoa" file. Xet theo tieu chi BAT KHA DAO thi bang mot lan
  // xoa: file con do nhung ruot mat han. Chi lay hai lenh KHONG co cong dung nao khac ngoai
  // xoa trang - de gate khoi thanh nhieu.
  //   Con LOT co chu dich (bao cao, chua chan): \`> file\` va \`echo '' > file\` (chuyen huong
  //   dau ra la thao tac hang ngay, chan la nhieu ngay) va \`mv\` (doi ten/dep repo la viec
  //   thuong). Muon chan thi phai phan biet "ghi de file DANG CO trong repo" voi "tao file
  //   moi", va do la viec rieng - dung nhet vao day cho du.
  if (/\\btruncate\\b[^\\n]*-s\\s*0\\b|\\bClear-Content\\b/.test(bare) && !consumeFlag("overwrite", bare)) {
    deny("CANH BAO (guard lop 1): lenh XOA TRANG noi dung file - noi dung cu mat han." +
      "\\nHOI USER truoc." + flagTip("overwrite"));
  }

  if (ANY_DEL.test(bare)) {
    const recursive = RECURSIVE_DEL.test(bare);
    for (const tok of bare.split(/[\\s'";|&]+/)) {
      if (!tok || tok.startsWith("-") || tok.startsWith("/")) continue;
      const rel = tok.replace(/\\\\/g, "/").replace(/^\\.\\//, "");
      const name = rel.split("/").pop();
      if (name && !nameMatches(name, POLICY.secret_allow || []) && nameMatches(name, POLICY.secret_names || [])) {
        deny("CHAN (guard lop 1): lenh xoa cham file secret \`" + name + "\` - " + POLICY.secret_reason);
      }
      for (const prefix of POLICY.protected_write || []) {
        if (rel === prefix || rel.startsWith(prefix.replace(/\\/$/, "") + "/")) {
          deny("CHAN (guard lop 1): xoa trong duong da khai protected \`" + prefix + "\` - " +
            POLICY.protected_write_reason);
        }
      }
    }
    if (recursive && !consumeFlag("delete", bare)) {
      deny("CHAN (guard lop 1): xoa DE QUY - thao tac bat kha dao, 02_RULES bat hoi user truoc." +
        flagTip("delete"));
    }
  }

  // Doc noi dung file key bang shell - cung luat voi checkRead.
  //
  // CHI soi token TRONG NHU MOT TEP DANG BI DOC, khong soi moi token trong cau lenh.
  // Ban cu soi tat: he cau lenh CHUA \`head\`/\`cat\`/... la moi token deu bi doi chieu, nen
  // \`grep -rln "id_rsa" src/ | head\` bi chan - ten khoa nam trong MAU TIM KIEM chu khong
  // phai la tep bi doc. Do chinh la ca chan-nham do duoc 2026-08-11 (no chan dung lenh
  // audit di do lich su git), va luat 7 sinh ra de bat kieu nay: mot gate chan nham thi
  // nguoi ta tim duong vong, roi ca gate thanh vo nghia.
  //
  // Ba dau hieu duoc coi la "tep dang bi doc" - deu chan lai duoc ca that:
  //   1. token co dau phan cach duong dan  ->  cat /etc/ssh/id_rsa
  //   2. token dung NGAY SAU mot lenh doc (bo qua cac co -x)  ->  cat id_rsa | grep x
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
        deny("CHAN (guard lop 1): lenh shell cham noi dung file key \`" + name + "\` - " + POLICY.key_read_reason);
      }
    });
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
  // Nhan dien theo HINH DANG lenh goi, khong theo mot danh sach TEN cung.
  // Do that 2026-08-20: guard chi biet ten \`Bash\` nen MOI nhanh gac lenh (git push chua xin,
  // git add -A, secret vao git, xoa de quy) vuot duoc sach chi bang cach doi sang tool
  // \`PowerShell\` - tool terminal CHINH tren Windows, co san trong CUNG mot phien. Regex nhan
  // dien van dung (nhanh Bash bat ca cu phap PowerShell); chi cai cong TEN la chan sai.
  // Vi vay: co \`command\` thi soi nhu mot lenh shell, bat ke tool ten gi - con dung duoc voi
  // tool tuong lai ma khong phai bump zemory.
  const isCommandTool = typeof ti.command === "string" && ti.command !== "";
  const isWriteTool = tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit";
  if (isWriteTool) {
    const p = ti.file_path || ti.notebook_path || "";
    if (p) checkWrite(relToRoot(p));
    // GHI DE = mat noi dung cu, ngang mot lan xoa. \`Write\` thay TRON file; \`Edit\` thi
    // khong (no sua mot doan) nen CHI \`Write\` bi hoi.
    //
    // Vi sao HOI chu khong CAM (user chot 2026-08-11): ghi de la thao tac binh thuong
    // hang ngay, cam thang thi gate thanh nhieu roi bi bo qua. Nhung no bat kha dao, nen
    // phai co canh bao TRUOC - dung tinh than "luat bat kha dao phai co chot may".
    //
    // Chi ap TRONG cay repo: file o thu muc tam / scratchpad bi ghi de suot, chan o do
    // chi tao nhieu ma khong bao ve gi.
    if (tool === "Write" && p) {
      const rel = relToRoot(p);
      const inside = !rel.startsWith("..") && !path.isAbsolute(rel);
      let sizeNow = 0;
      try {
        sizeNow = fs.existsSync(p) ? fs.statSync(p).size : 0;
      } catch {
        sizeNow = 0; // khong stat duoc thi khong phan (fail-open)
      }
      if (inside && sizeNow > 0 && !consumeFlag("overwrite", rel)) {
        deny("CANH BAO (guard lop 1): GHI DE \`" + rel + "\` (" + sizeNow + " byte dang co) - " +
          "noi dung cu mat han, khong dao duoc.\\nHOI USER truoc." + flagTip("overwrite") +
          "\\nSua mot doan thoi thi dung Edit - Edit KHONG bi hoi.");
      }
    }
  } else if (tool === "Read") {
    if (ti.file_path) checkRead(relToRoot(ti.file_path));
  } else if (isCommandTool) {
    checkBash(String(ti.command));
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
/**
 * Matcher PreToolUse phai khai DU cac tool guard can soi.
 *
 * Guard chi duoc host goi cho tool co ten trong matcher — thieu mot ten la ho mot cua, va cua
 * do im lang: khong loi, khong canh bao, chi la lenh di thang. Do 2026-08-20 tren mot repo
 * that: matcher thieu `PowerShell` (tool terminal chinh tren Windows) nen `git push` va xoa
 * de quy qua tool do khong bao gio cham toi guard.
 *
 * Giu o DAY, canh bo sinh, de danh sach nay va nhanh dispatch trong guard.cjs khong troi lech nhau.
 */
export const GUARD_MATCHER = "Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell";

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
  put("precommit-guard.cjs", PRECOMMIT_SOURCE, oursJs);
  // Flag không bao giờ được theo commit — .gitignore cục bộ trong chính thư mục hooks.
  put(".gitignore", ".allow-*\n", () => true);

  return { hooksDir, added, kept, protectedWrite: policy.protected_write as string[] };
}
