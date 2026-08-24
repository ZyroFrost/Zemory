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

// Sua 2026-08-24 (user gat 21/08): nhanh xoa quet token theo DUNG SEGMENT chua lenh xoa,
// cung khuon nhanh git. Truoc do `rm build.log && echo "check prod.env"` bi CHAN OAN — ten
// secret nhac trong echo cua CUNG cau lenh. Ca duong (xoa secret that) giu nguyen o tren.
test("CA AM (segment): ten secret o segment KHAC segment xoa KHONG bi va lay", () => {
  for (const cmd of [
    'rm build.log && echo "check prod' + '.env"',
    "type prod" + ".env && rm build.log",
    "rm out.txt; cat ." + "env.example",
  ]) {
    const r = ask(bash(cmd));
    assert.equal(r.blocked, false, cmd + " — secret o segment khac phai duoc CHO QUA (chan oan = nguoi ta thoi viet lenh tu-kiem): " + r.say);
  }
  // va ca DUONG ngay canh de dot bien khong lach: secret o DUNG segment xoa van CHAN
  const bad = ask(bash("echo ok && rm ." + "env"));
  assert.equal(bad.blocked, true, "xoa secret o segment xoa van phai CHAN");
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

// GLOB phai an o CA HAI nhanh (ghi + xoa) - lo do thuc dia bao 2026-08-24.
//
// Truoc do: nhanh GHI co glob, nhanh XOA chi so TIEN TO. Nen mot repo khai
// `protected: ["data/*/01_raw"]` thi chan duoc GHI ma KHONG chan duoc XOA - dung loai lo
// im lang: nguoi khai tuong da rao, thuc te cua sau van mo. He qua o estate that: moi repo
// phai liet ke TAY tung duong `data/<case>/01_raw`, them case moi la phai nho sua - ma
// "chot phai nho tay" thi se muc.
//
// Ca AM o day quan trong ngang ca duong (luat 7 skill audit): glob khong duoc phinh ra chan
// ca nhung duong LANG GIENG (`02_processing` la cho agent ghi suot).
function guardWithPolicy(protectedWrite) {
  const dir = mkdtempSync(join(tmpdir(), "zemory-guard-glob-"));
  const hooks = join(dir, "docs", "hooks");
  mkdirSync(hooks, { recursive: true });
  cpSync(GUARD, join(hooks, "guard.cjs"));
  writeFileSync(
    join(hooks, "policy.json"),
    JSON.stringify({
      protected_write: protectedWrite,
      protected_write_reason: "test",
      secret_names: [],
      secret_allow: [],
      flags_dir: "docs/hooks",
      flags: { push: ".allow-push", delete: ".allow-delete", docs_write: ".allow-docs-write" },
    }),
  );
  return { guard: join(hooks, "guard.cjs"), root: dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("glob trong protected chan CA nhanh XOA, khong chi nhanh GHI", () => {
  const g = guardWithPolicy(["data/*/01_raw"]);
  try {
    // DUONG: xoa trong duong glob -> phai CHAN (truoc ban va: LOT)
    for (const cmd of ["rm data/case_x/01_raw/f.csv", "del data/mot_case_khac/01_raw/f.csv"]) {
      const r = ask(bash(cmd), g.guard);
      assert.equal(r.blocked, true, `glob phai chan XOA: ${cmd}
${r.say}`);
    }
    // Nhanh GHI van chan nhu truoc (khong lam hong thu dang chay)
    const w = ask({ tool_name: "Write", tool_input: { file_path: join(g.root, "data", "case_x", "01_raw", "f.csv") } }, g.guard);
    assert.equal(w.blocked, true, `glob phai chan GHI:
${w.say}`);

    // AM: hang xom cua duong glob KHONG duoc chan - day la cho agent ghi/xoa hang ngay
    for (const cmd of ["rm data/case_x/02_processing/tmp.csv", "rm build.log", "rm docs/note.md"]) {
      const r = ask(bash(cmd), g.guard);
      assert.equal(r.blocked, false, `KHONG duoc chan oan: ${cmd}
${r.say}`);
    }
  } finally {
    g.cleanup();
  }
});

test("tien to thuong van chay y nhu cu sau khi gop mot ham khop", () => {
  const g = guardWithPolicy(["data"]);
  try {
    assert.equal(ask(bash("rm data/x/y.csv"), g.guard).blocked, true, "tien to phai chan duong con");
    assert.equal(ask(bash("rm database.md"), g.guard).blocked, false, "khong duoc chan `database.md` chi vi bat dau bang `data`");
  } finally {
    g.cleanup();
  }
});
