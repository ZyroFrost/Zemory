// XOA = BAT KHA DAO, nen no phai co CHOT MAY chu khong chi co chu trong 02_RULES.
//
// Do 2026-08-11 tren ban truoc do (ma tran 28 ca): guard chi nhin \`rm -r\` va ho hang, nen
// TAM duong quet ca cay LOT sach — \`find -delete\` · \`find -exec rm\` · \`git clean -fdx\` ·
// \`robocopy /MIR\` · \`fs.rmSync(recursive)\` · \`shutil.rmtree\` · \`xargs rm\` ·
// \`Get-ChildItem -Recurse | Remove-Item\`. Cong them \`git reset --hard\` va
// \`git checkout -- .\`: 02_RULES §Git cam bang CHU tu lau ma khong he co chot.
//
// Test goi guard THAT qua stdin (dung giao thuc hook: exit 2 = chan) chu khong doc regex —
// thu bi soi la HANH VI, khong phai cach viet.
//
// Bat bien THU HAI, quan trong ngang: gate KHONG duoc nhieu. Xoa mot file thuong phai
// CHO QUA; chan tat thi moi lenh deu phai xin flag va "gate nhieu = gate bi bo qua".

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GUARD = new URL("../../docs/hooks/guard.cjs", import.meta.url).pathname.replace(/^\//, "");

function ask(payload, guard = GUARD) {
  const r = spawnSync(process.execPath, [guard], { input: JSON.stringify(payload), encoding: "utf8" });
  return { blocked: r.status === 2, say: `${r.stdout}${r.stderr}`, status: r.status };
}
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("xoa HANG LOAT khong dung tu khoa rm -r: tam duong deu bi chan", () => {
  const forms = [
    "find . -name '*.ts' -delete",
    "find . -name '*.ts' -exec rm {} \\;",
    `node -e "require('fs').rmSync('backend/src',{recursive:true,force:true})"`,
    `python -c "import shutil; shutil.rmtree('backend')"`,
    "git clean -fdx",
    "robocopy C:/empty backend /MIR",
    "ls | xargs rm",
    "Get-ChildItem -Recurse | Remove-Item -Force",
  ];
  for (const cmd of forms) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("HUY viec chua commit bi chan (02_RULES §Git da cam bang chu, nay co chot)", () => {
  for (const cmd of ["git reset --hard", "git reset --hard HEAD~1", "git checkout -- .", "git stash clear"]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("ten khoa trong MAU TIM KIEM khong phai la doc khoa - gate khong duoc chan nham", () => {
  // Do 2026-08-11: guard chan dung lenh AUDIT di do lich su git, vi cau lenh vua chua \`head\`
  // vua chua chuoi \`id_rsa\` trong MAU TIM KIEM. Ban cu he thay mot lenh doc la soi MOI token,
  // nen ten khoa nam o bat ky dau cung bi doi chieu.
  //
  // Vi sao dang mot cong rieng, khong phai "phien nhe": luat 7 noi thang - gate chan nham thi
  // nguoi ta di duong vong, va mot gate bi di vong la gate KHONG con ton tai. Chinh phien
  // 2026-08-13 dinh lai ca nay khi go lenh grep de di SUA no.
  for (const cmd of [
    `grep -rln "id_rsa" backend/src/ | head`,
    `grep -rn id_rsa docs/ | tail -5`,
    `rg "id_rsa|id_ed25519" --files-with-matches | head -20`,
  ]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, false, `CHAN NHAM: ${cmd}\n${r.say}`);
  }
});

test("doc THAT noi dung file khoa van bi chan - ban va khong duoc noi long", () => {
  // Doi trong cua ca tren. Ba dau hieu "tep dang bi doc" phai chan lai duoc het:
  for (const cmd of [
    "cat /etc/ssh/id_rsa", //        1. co dau phan cach duong dan
    "cat id_rsa | grep BEGIN", //    2. dung ngay sau mot lenh doc
    "head id_rsa", //                3. token cuoi cau
    "base64 ~/.ssh/id_rsa",
  ]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, true, `LOT: ${cmd}\n${r.say}`);
  }
});

test("xoa trang noi dung file bi chan", () => {
  for (const cmd of ["truncate -s 0 backend/src/ui.ts", "Clear-Content backend/src/ui.ts"]) {
    assert.equal(ask(bash(cmd)).blocked, true, `LOT: ${cmd}`);
  }
});

test("GHI DE file dang co thi HOI; Edit thi KHONG hoi", () => {
  const target = new URL("../../package.json", import.meta.url).pathname.replace(/^\//, "");
  const w = ask({ tool_name: "Write", tool_input: { file_path: target } });
  assert.equal(w.blocked, true, `Write de len file dang co phai hoi:\n${w.say}`);
  assert.match(w.say, /HOI USER/, "phai noi ro la hoi user, khong phai cam han");

  const e = ask({ tool_name: "Edit", tool_input: { file_path: target } });
  assert.equal(e.blocked, false, `Edit sua mot doan thi KHONG duoc hoi:\n${e.say}`);
});

test("KHONG NHIEU: xoa mot file thuong van cho qua", () => {
  for (const cmd of ["rm backend/src/ui.ts", "Remove-Item backend/src/ui.ts", "rm /tmp/x.txt"]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, false, `chan nham (gate se bi bo qua): ${cmd}\n${r.say}`);
  }
});

test("policy CU + guard MOI: van chan, KHONG duoc nem loi", () => {
  // Bo cowork duoc mang tay sang may khac nen hai file chac chan co luc lech phien ban.
  // Truoc khi va, `POLICY.flags[name]` thieu => path.join(..., undefined) => guard CHET
  // giua chung, ma guard chet thi khong con ai gac.
  const dir = mkdtempSync(join(tmpdir(), "zemory-guard-old-"));
  try {
    const hooks = join(dir, "docs", "hooks");
    mkdirSync(hooks, { recursive: true });
    cpSync(GUARD, join(hooks, "guard.cjs"));
    writeFileSync(
      join(hooks, "policy.json"),
      JSON.stringify({
        protected_write: [],
        secret_names: [],
        flags_dir: "docs/hooks",
        flags: { push: ".allow-push" }, // policy DOI CU: khong co delete/discard/overwrite
      }),
    );
    const r = ask(bash("git clean -fdx"), join(hooks, "guard.cjs"));
    assert.equal(r.blocked, true, `policy cu phai van CHAN, thuc te status=${r.status}:\n${r.say}`);
    assert.doesNotMatch(r.say, /TypeError|Cannot read|undefined/, `guard nem loi thay vi chan:\n${r.say}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
