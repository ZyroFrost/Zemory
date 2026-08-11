// MỘT ĐƯỜNG ĐỒNG BỘ, MỌI CỬA VÀO PHẢI DÒ CHÌA GIỐNG NHAU.
//
// Bệnh đã trả giá 2026-08-11: `memory sync` gọi `resolveShareKey` (tự dò `<kho>/share.key`)
// nhưng `memory export` và `memory import` thì KHÔNG — chúng chỉ đọc `--key-file`/env. Nên
// lệnh xuất bundle bàn giao máy mới báo "Chưa có chìa share" trong khi chìa nằm NGAY CẠNH kho.
//
// Vì sao đáng một cổng riêng: hậu quả không phải bất tiện mà là ĐỨT đường bàn giao — người
// làm theo đúng tài liệu vẫn thất bại, rồi đi tìm đường vòng, và mỗi máy lại vòng một kiểu.
// Đó chính là thứ luật "một đường sync CỐ ĐỊNH" sinh ra để chặn.
//
// Test chạy lệnh THẬT qua `dist/cli.js` (không gọi hàm trong tiến trình) vì lỗi nằm ở TẦNG
// LỆNH — hàm `exportMemoryBundle` vốn luôn đúng khi được truyền chìa.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
const KEY = "ngua-troi-banh-mi-ca-phe-sua-da-7";

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "zemory-syncpath-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Kho tạm + chìa đặt ĐÚNG chỗ chuẩn (cạnh kho), KHÔNG truyền --key-file. */
function seed(dir) {
  const db = join(dir, "global_memory.db");
  const r = spawnSync(process.execPath, [CLI, "memory", "info"], {
    cwd: dir,
    env: { ...process.env, GLOBAL_MEMORY_DB: db },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `dựng kho tạm thất bại: ${r.stderr || r.stdout}`);
  writeFileSync(join(dir, "share.key"), `${KEY}\n`, { mode: 0o600 });
  return db;
}

test("export TỰ DÒ chìa cạnh kho — không cần --key-file", () => {
  const s = scratch();
  try {
    const db = seed(s.dir);
    const out = join(s.dir, "bundle.enc");
    const r = spawnSync(process.execPath, [CLI, "memory", "export", out], {
      cwd: s.dir,
      env: { ...process.env, GLOBAL_MEMORY_DB: db, ZEMORY_SHARE_KEY: "" },
      encoding: "utf8",
    });
    const say = `${r.stdout}${r.stderr}`;
    assert.doesNotMatch(say, /Chưa có chìa/, `export không dò được chìa cạnh kho:\n${say}`);
    assert.equal(r.status, 0, say);
    assert.ok(existsSync(out), "không ghi ra bundle");
  } finally {
    s.cleanup();
  }
});

test("import TỰ DÒ chìa cạnh kho — vòng xuất→nhập khép kín, không cần --key-file", () => {
  const s = scratch();
  try {
    const db = seed(s.dir);
    const out = join(s.dir, "bundle.enc");
    const env = { ...process.env, GLOBAL_MEMORY_DB: db, ZEMORY_SHARE_KEY: "" };
    spawnSync(process.execPath, [CLI, "memory", "export", out], { cwd: s.dir, env, encoding: "utf8" });

    const target = join(s.dir, "nhan.db");
    const r = spawnSync(process.execPath, [CLI, "memory", "import", out, "--db", target, "--force"], {
      cwd: s.dir,
      env,
      encoding: "utf8",
    });
    const say = `${r.stdout}${r.stderr}`;
    assert.doesNotMatch(say, /Chưa có chìa/, `import không dò được chìa cạnh kho:\n${say}`);
    assert.equal(r.status, 0, say);
    assert.ok(existsSync(target), "không dựng ra kho đích");
  } finally {
    s.cleanup();
  }
});

test("--key-file vẫn THẮNG đường tự dò (không phá lối đang dùng)", () => {
  const s = scratch();
  try {
    const db = seed(s.dir);
    // Chìa khác đặt nơi khác: nếu tự-dò lấn quyền thì bundle sẽ mã hoá bằng chìa CẠNH KHO
    // và bước nhập dưới đây (dùng đúng file này) sẽ hỏng.
    const other = join(s.dir, "khac.key");
    writeFileSync(other, "mot-chia-hoan-toan-khac-de-doi-chieu-9\n", { mode: 0o600 });
    const out = join(s.dir, "b2.enc");
    const env = { ...process.env, GLOBAL_MEMORY_DB: db, ZEMORY_SHARE_KEY: "" };
    const e = spawnSync(process.execPath, [CLI, "memory", "export", out, "--key-file", other], {
      cwd: s.dir,
      env,
      encoding: "utf8",
    });
    assert.equal(e.status, 0, `${e.stdout}${e.stderr}`);

    const target = join(s.dir, "nhan2.db");
    const i = spawnSync(
      process.execPath,
      [CLI, "memory", "import", out, "--db", target, "--force", "--key-file", other],
      { cwd: s.dir, env, encoding: "utf8" },
    );
    assert.equal(i.status, 0, `--key-file phải thắng đường tự dò:\n${i.stdout}${i.stderr}`);
  } finally {
    s.cleanup();
  }
});
