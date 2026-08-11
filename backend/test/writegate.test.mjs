// Write gate (plan 14 §C) — the daemon-side advisory hold that makes the idle
// scheduler yield while a CLI writes the memory, so they don't collide on SQLite.

// ⚠ PHẢI CÔ LẬP khỏi kho THẬT. `cliHoldsWrite()` cố ý nhìn CẢ HAI nguồn — cờ trong bộ nhớ
// daemon VÀ khoá file `<kho>/cli-write.lock` — nên khi trên máy có một job ghi thật đang chạy
// (vd `memory embed --all`), test này ĐỎ dù code không hề sai. Bắt được đúng ca đó 2026-08-11.
//
// Đó là lỗi CỦA TEST, không phải của code: một cổng chỉ xanh khi không ai làm việc là cổng
// đánh lừa — nó im lặng ở CI rồi đỏ đúng lúc người ta đang bận. Trỏ kho sang thư mục tạm để
// khoá file phân giải ra chỗ khác.
//
// Phải đặt env TRƯỚC rồi mới `import` động: `db.ts` đọc `GLOBAL_MEMORY_DB` MỘT LẦN lúc nạp
// module, nên `import` tĩnh (được kéo lên đầu) sẽ chạy trước khi kịp đặt biến.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GLOBAL_MEMORY_DB = join(mkdtempSync(join(tmpdir(), "zemory-wgate-")), "global_memory.db");
const { acquireCliWrite, cliHoldsWrite, releaseCliWrite } = await import("../../dist/jobs/writegate.js");

test("acquire holds the gate; release frees it", () => {
  releaseCliWrite();
  assert.equal(cliHoldsWrite(), false, "starts free");
  acquireCliWrite();
  assert.equal(cliHoldsWrite(), true, "held after acquire");
  releaseCliWrite();
  assert.equal(cliHoldsWrite(), false, "free after release");
});

test("a hold is idempotent (re-acquire just extends it)", () => {
  acquireCliWrite();
  acquireCliWrite();
  assert.equal(cliHoldsWrite(), true);
  releaseCliWrite();
});
