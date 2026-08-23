// Cờ lạ trên lệnh HEAVY-WRITE phải bị TỪ CHỐI, không "bỏ qua âm thầm rồi chạy thật".
//
// Sự cố thật (2026-08-22, dính hai lần trong một phiên): `zemory memory embed --help` KHÔNG in
// trợ giúp mà khởi động job nhúng thật — job hàng giờ, giữ `cli-write.lock`, bỏ đói `backupTick`;
// `zemory memory scan --help` thì quét + nạp tin thật vào kho. Cùng bề mặt còn có `--rebuild`
// (XOÁ nguyên chỉ mục véc-tơ), nên "cờ lạ được cho qua" nghĩa là không còn đường xem-thử an toàn.
//
// Hai vế phải cùng đúng, thiếu vế nào cổng cũng vô nghĩa:
//   ① cờ lạ ⇒ exit ≠ 0 VÀ kho không đổi một byte (bản vá chỉ-in-lỗi-rồi-vẫn-chạy phải ĐỎ);
//   ② CA ÂM — không cờ / cờ hợp lệ ⇒ vẫn chạy thật (bản vá chặn hết cũng phải ĐỎ).

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rejectUnknownFlags } from "../../dist/commands/memory.js";

/** Nuốt stdout của lượt gọi — phép đo quan tâm GIÁ TRỊ TRẢ VỀ, không phải chữ in ra. */
function quiet(fn) {
  const log = console.log;
  const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  const prevExit = process.exitCode;
  try {
    return { out: fn(), lines, exit: process.exitCode };
  } finally {
    console.log = log;
    process.exitCode = prevExit;
  }
}

test("tầng hàm: cờ lạ trên embed/scan/digest bị TỪ CHỐI, kèm usage và exit≠0", () => {
  for (const [sub, bad] of [
    ["embed", "--help"],
    ["scan", "--help"],
    ["digest", "--help"],
    ["embed", "--dry-run"],
    ["scan", "--force"],
  ]) {
    const r = quiet(() => rejectUnknownFlags(sub, [sub, bad]));
    assert.equal(r.out, true, `${sub} ${bad}: phải bị từ chối`);
    assert.notEqual(r.exit, 0, `${sub} ${bad}: phải đặt exit code khác 0`);
    assert.ok(
      r.lines.join("\n").includes("usage:"),
      `${sub} ${bad}: phải IN USAGE — từ chối mà không chỉ đường thì người dùng vẫn phải đoán cờ`,
    );
  }
});

test("CA ÂM: cờ hợp lệ và lệnh không cờ phải ĐI TIẾP (chặn nhầm = gate nhiễu = gate bị bỏ qua)", () => {
  for (const args of [
    ["embed"],
    ["embed", "--all"],
    ["embed", "--rebuild"],
    ["embed", "--limit", "4000"], // giá trị của --limit KHÔNG được đọc thành cờ lạ
    ["scan"],
    ["scan", "--deep"],
    ["digest"],
    ["digest", "--all"],
    ["digest", "claude-abc123"], // session id là đối số thường, không phải cờ
  ]) {
    const r = quiet(() => rejectUnknownFlags(args[0], args));
    assert.equal(r.out, false, `${args.join(" ")}: KHÔNG được chặn`);
  }
});

test("lệnh KHÔNG thuộc nhóm heavy-write không bị bộ chốt này đụng tới", () => {
  // Chốt cố ý hẹp: chỉ ba lệnh GHI nặng. Mở rộng sang mọi lệnh là đổi hành vi của cả CLI
  // trong một bản vá không ai xin — và `search`/`show` vốn nhận nhiều cờ tự do.
  for (const args of [["search", "--all"], ["info", "--gì-đó"], ["show", "--context"]]) {
    const r = quiet(() => rejectUnknownFlags(args[0], args));
    assert.equal(r.out, false, `${args.join(" ")}: ngoài phạm vi chốt`);
  }
});

// Tầng CLI — nơi sự cố THẬT xảy ra. Chạy `dist/cli.js` trên một KHO TẠM (không đụng kho thật).
//
// ⚠ Bản ĐẦU của ca này XANH GIẢ, và chính lượt đột biến bắt được: nó dùng một file `.db` RỖNG,
// nên lệnh thất bại vì "file is not a database" chứ không phải vì cờ bị từ chối — đột biến trả
// bản vá về hành vi cũ mà ca vẫn xanh. Nay kho được DỰNG THẬT trước (`memory info` tạo schema),
// và phép đo bắt buộc phải thấy ĐÚNG CÂU TỪ CHỐI, không chỉ nhìn exit code.
test("CLI: `memory embed --help` từ chối bằng usage, không ghi byte, không giữ khoá", async () => {
  const { execFileSync } = await import("node:child_process");
  const root = mkdtempSync(join(tmpdir(), "zflag-cli-"));
  const dataDir = join(root, "data");
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "t.db");
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const run = (args) => {
    try {
      const out = execFileSync(process.execPath, [cli, "memory", ...args], {
        cwd: root,
        stdio: "pipe",
        timeout: 120_000,
        env: { ...process.env, GLOBAL_MEMORY_DB: dbPath, ZEMORY_UI_PORT: "0" },
      });
      return { code: 0, out: String(out) };
    } catch (e) {
      return { code: e.status ?? -1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
    }
  };

  try {
    // Dựng kho THẬT trước — nếu không, mọi lệnh sau đều chết vì kho hỏng và ca này xanh giả.
    assert.equal(run(["info"]).code, 0, "tiền đề: kho tạm phải dựng được");
    assert.ok(statSync(dbPath).size > 0, "tiền đề: kho tạm phải có schema thật");

    const before = statSync(dbPath).size;
    const bad = run(["embed", "--help"]);
    assert.notEqual(bad.code, 0, "cờ lạ phải làm lệnh THẤT BẠI, không im lặng chạy");
    assert.match(bad.out, /unknown flag/, "phải từ chối vì CỜ LẠ — không phải chết vì lý do khác");
    assert.match(bad.out, /usage:/, "phải chỉ đường, vì lệnh này không có `--help` thật");
    assert.equal(statSync(dbPath).size, before, "cờ lạ ⇒ KHÔNG được ghi một byte vào kho");
    assert.ok(!existsSync(join(dataDir, "cli-write.lock")), "cờ lạ ⇒ KHÔNG được giữ khoá ghi");

    // CA ÂM ở tầng CLI: cờ hợp lệ vẫn phải chạy qua (bản vá chặn hết cũng phải bị bắt).
    assert.equal(run(["embed", "--limit", "1"]).code, 0, "cờ hợp lệ ⇒ lệnh vẫn chạy bình thường");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
