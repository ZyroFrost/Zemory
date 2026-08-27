// Chạy bộ test THÀNH HAI NHÓM để ghim đỉnh RAM — thay cho một lệnh `node --test --test-concurrency=4`.
//
// Vì sao (đo 2026-08-27): mỗi file test NẠP MODEL ONNX là một worker riêng giữ ~0,8–1,7 GB
// (hai file song song đo được đỉnh 1.677 MB). Với 4 worker và 6 file nạp model, chúng có thể
// trùng lượt ⇒ 4–6 GB; cộng daemon + con embed ~4 GB và IDE ~4 GB là máy 16 GB TRÀN — gate đã
// làm sập phiên agent HAI lần trong một ngày, kéo theo các phiên ở repo khác trên cùng máy.
//
// Cách làm: nhóm NHẸ (mọi file còn lại) chạy 4 worker như cũ; nhóm NẶNG (danh sách HEAVY dưới)
// chạy 1 worker ⇒ đỉnh nhóm nặng ≤ một model. Danh sách là TƯỜNG MINH và có cổng canh
// (`test-partition.test.mjs`): file nào import lớp embed/rerank mà không nằm trong HEAVY ⇒ đỏ,
// để phân nhóm không âm thầm lệch khi ai thêm test mới.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
// Danh sách + số worker + env nhóm nặng nằm ở module RIÊNG (không side effect) để cổng partition import được.
import { HEAVY, HEAVY_CONCURRENCY, LIGHT_CONCURRENCY, HEAVY_ENV } from "./test-groups.mjs";

const DIR = "backend/test";

// ƯU TIÊN THẤP cho CHÍNH mình trước khi sinh con — con `node --test` kế thừa, khỏi đuổi theo từng pid.
// User chốt 2026-08-27: gate phải nhường CPU cho người dùng và phiên agent khác cùng máy, chậm cũng được.
// TRẦN RAM cứng cho cả cây nằm ở `gate-cage.ps1` (Job Object, Windows) — script này không tự lồng mình.
try {
  os.setPriority(process.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
} catch {
  /* thiếu quyền đổi ưu tiên — vẫn chạy, chỉ là không nhường */
}

function run(label, files, concurrency, extraEnv = {}) {
  if (!files.length) return Promise.resolve(0);
  const envNote = Object.keys(extraEnv).length ? " · env " + Object.entries(extraEnv).map(([k, v]) => `${k}=${v}`).join(" ") : "";
  console.log(`\n[test] ${label}: ${files.length} file · concurrency ${concurrency}${envNote}`);
  return new Promise((resolve) => {
    const c = spawn(
      process.execPath,
      ["--test", `--test-concurrency=${concurrency}`, ...files.map((f) => join(DIR, f))],
      { stdio: "inherit", env: { ...process.env, ...extraEnv } },
    );
    c.on("exit", (code) => resolve(code ?? 1));
    c.on("error", (e) => {
      console.error(`[test] ${label}: không phóng được — ${e instanceof Error ? e.message : e}`);
      resolve(1);
    });
  });
}

/**
 * Tên các `test("…")` cấp cao trong một file — để chạy TỪNG CA MỘT TIẾN TRÌNH.
 * Vì sao (đo 2026-08-27): RAM của nhóm nạp model tích luỹ QUA các ca trong cùng tiến trình —
 * `vectors.test` cả file 6,1 GB (q8 vẫn vượt 4 GB, tắt arena còn tệ hơn: 12 GB), nhưng ca nặng
 * nhất chạy riêng chỉ 3,3 GB. Ranh giới tiến trình là ranh giới RAM. Giá: nạp model lại mỗi ca
 * (~8 s) — đúng đánh đổi "chậm lại" user chốt.
 */
function testNames(file) {
  const src = readFileSync(join(DIR, file), "utf8");
  return [...src.matchAll(/^test\(\s*"((?:[^"\\]|\\.)*)"/gmu)].map((m) => m[1].replace(/\\"/g, '"'));
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function runHeavyIsolated(files, extraEnv) {
  let bad = 0;
  for (const f of files) {
    const names = testNames(f);
    // TỰ KIỂM phép tách: số tên phải bằng số `test(` cấp cao và không trùng — thiếu một tên là một
    // ca bị bỏ LẶNG (gate vẫn xanh mà không soi). Lệch ⇒ chạy cả file trong MỘT tiến trình và NÓI RA.
    const declared = (readFileSync(join(DIR, f), "utf8").match(/^test\(/gmu) ?? []).length;
    const unique = new Set(names).size;
    if (!names.length || names.length !== declared || unique !== names.length) {
      console.log(`\n[test] ${f}: tách được ${unique}/${declared} tên ca — chạy cả file trong MỘT tiến trình (không cô lập RAM)`);
      bad |= await run(f, [f], 1, extraEnv);
      continue;
    }
    console.log(`\n[test] ${f}: ${names.length} ca, mỗi ca một tiến trình`);
    for (const name of names) {
      const code = await new Promise((resolve) => {
        const c = spawn(
          process.execPath,
          ["--test", `--test-name-pattern=^${escapeRe(name)}$`, join(DIR, f)],
          { stdio: "inherit", env: { ...process.env, ...extraEnv } },
        );
        c.on("exit", (code) => resolve(code ?? 1));
        c.on("error", () => resolve(1));
      });
      bad |= code;
    }
  }
  return bad ? 1 : 0;
}

const all = readdirSync(DIR).filter((f) => f.endsWith(".test.mjs")).sort();
const heavySet = new Set(HEAVY);
const missing = HEAVY.filter((f) => !all.includes(f));
if (missing.length) {
  console.error(`[test] danh sách HEAVY trỏ file không tồn tại: ${missing.join(", ")}`);
  process.exit(1);
}
const light = all.filter((f) => !heavySet.has(f));
const heavy = all.filter((f) => heavySet.has(f));

// Nhóm nhẹ trước (nhanh, đỏ sớm), nhóm nặng sau. Mã thoát là OR của hai nhóm — không nuốt lỗi.
const a = await run("nhóm nhẹ", light, LIGHT_CONCURRENCY);
// Nhóm nạp model: TUẦN TỰ (HEAVY_CONCURRENCY = 1) và từng ca một tiến trình — xem `runHeavyIsolated`.
const b = HEAVY_CONCURRENCY === 1 ? await runHeavyIsolated(heavy, HEAVY_ENV) : await run("nhóm nạp model", heavy, HEAVY_CONCURRENCY, HEAVY_ENV);
process.exit(a || b ? 1 : 0);
