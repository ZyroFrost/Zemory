// Ghi file nguyên tử — bảo vệ những file mà hỏng là MẤT THẬT.
//
// Bối cảnh (audit 2026-07-27, đối chiếu `atomic_replace` của Hermes): repo từng ghi
// thẳng bằng `writeFileSync` vào `06_CHANGES.md` (điều 3: .md LÀ NGUỒN), vào
// `location.json` (con trỏ tới DB), vào `config.json`, và vào file settings của CHÍNH
// agent. `writeFileSync` truncate trước rồi mới ghi ⇒ chết giữa chừng để lại file cụt.
//
// Bất biến phải giữ: **gọi thất bại thì đích còn NGUYÊN VẸN**, và không để lại rác.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { writeFileAtomic, writeJsonAtomic } from "../../dist/util/fs-atomic.js";
import { tempDir } from "./helpers.mjs";

const ORIGINAL = "NỘI DUNG GỐC — không được mất\n";

test("ghi bình thường thay được nội dung, và backupDir giữ bản cũ", (t) => {
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "06_CHANGES.md");
  const bak = join(dir, "attic", "harness-bak");
  writeFileSync(f, ORIGINAL);
  writeFileAtomic(f, "nội dung mới\n", { backupDir: bak });
  assert.equal(readFileSync(f, "utf8"), "nội dung mới\n");
  assert.equal(readFileSync(join(bak, "06_CHANGES.md.bak"), "utf8"), ORIGINAL, ".bak phải giữ nội dung CŨ — đường lùi duy nhất");
});

test("bản lùi KHÔNG được đọng cạnh file nguồn", (t) => {
  // Đây là lý do đổi từ cờ `backup: true` sang `backupDir`: `docs/agent/` là thư mục luật
  // bắt agent ĐỌC HẾT, nên một `.bak` nằm đó vừa tốn ngữ cảnh vừa trông như rác lọt.
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "05_TODO.md");
  writeFileSync(f, ORIGINAL);
  writeFileAtomic(f, "mới\n", { backupDir: join(dir, "attic", "harness-bak") });
  assert.equal(existsSync(`${f}.bak`), false, "không được đẻ .bak cạnh đích");
  assert.equal(existsSync(join(dir, "attic", "harness-bak", "05_TODO.md.bak")), true);
});

test("không truyền backupDir thì KHÔNG đẻ bản lùi nào", (t) => {
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "a.md");
  writeFileSync(f, ORIGINAL);
  writeFileAtomic(f, "mới\n");
  assert.equal(existsSync(`${f}.bak`), false);
  assert.equal(readFileSync(f, "utf8"), "mới\n");
});

// Đây là lý do tồn tại của cả module. Nếu test này đỏ thì mọi thứ khác vô nghĩa.
test("lỗi giữa chừng: đích còn NGUYÊN VẸN và không sót file tạm", (t) => {
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "06_CHANGES.md");
  writeFileSync(f, ORIGINAL);
  // Dữ liệu không ghi được → ném ở giai đoạn GHI, trước rename.
  assert.throws(() =>
    writeFileAtomic(f, {
      toString() {
        throw new Error("vỡ giữa chừng");
      },
    }),
  );
  assert.equal(readFileSync(f, "utf8"), ORIGINAL, "thất bại KHÔNG được đụng tới bản gốc");
  // Bản đầu của helper tách ghi/rename thành hai khối try ⇒ lỗi ở khối ghi thoát ra mà
  // không ai dọn, để lại một file .tmp. Chính test này bắt được.
  assert.deepEqual(
    readdirSync(dir).filter((x) => x.includes(".tmp")),
    [],
    "không được để lại file tạm",
  );
});

test("file tạm nằm CÙNG thư mục đích (rename chỉ nguyên tử trong cùng volume)", (t) => {
  // Repo ở D:, %TEMP% ở C: — để file tạm ở %TEMP% là dính EXDEV. Kiểm bằng cách ghi vào
  // một thư mục con và xác nhận thao tác thành công + không có rác ở đâu khác.
  const dir = tempDir(t, "zemory-atomic-");
  const sub = join(dir, "docs", "agent");
  const f = join(sub, "05_TODO.md");
  writeFileAtomic(f, "tạo mới cả cây thư mục\n"); // mkdir -p luôn
  assert.equal(readFileSync(f, "utf8"), "tạo mới cả cây thư mục\n");
  assert.deepEqual(readdirSync(sub).filter((x) => x.includes(".tmp")), []);
});

test("writeJsonAtomic ra JSON hợp lệ, có newline cuối (giữ đúng dạng cũ)", (t) => {
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "config.json");
  writeJsonAtomic(f, { dataDir: "D:\\Zyro\\Tool\\Zemory\\data", lang: "vi" });
  const raw = readFileSync(f, "utf8");
  assert.ok(raw.endsWith("\n"), "phải kết thúc bằng newline như code cũ");
  assert.deepEqual(JSON.parse(raw), { dataDir: "D:\\Zyro\\Tool\\Zemory\\data", lang: "vi" });
});

test("không backup thì KHÔNG đẻ ra .bak (đừng rác hoá thư mục người dùng)", (t) => {
  const dir = tempDir(t, "zemory-atomic-");
  const f = join(dir, "config.json");
  writeFileSync(f, "cũ");
  writeFileAtomic(f, "mới");
  assert.equal(existsSync(`${f}.bak`), false);
});

// RATCHET: những chỗ ghi vào file NGUỒN / cấu hình phải đi qua helper này. Thêm một
// `writeFileSync` trần vào các file dưới đây là mở lại đúng lỗ hổng vừa vá.
test("các chỗ ghi file nguồn/cấu hình không được dùng writeFileSync trần", () => {
  const guarded = [
    "../src/docs/archive.ts",
    "../src/config/settings.ts",
    "../src/memory/relocate.ts",
    "../src/memory/capture-hook.ts",
  ];
  for (const rel of guarded) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
    assert.ok(!/\bwriteFileSync\s*\(/.test(src), `${rel}: phải dùng writeFileAtomic/writeJsonAtomic`);
  }
});
