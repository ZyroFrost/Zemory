// Tiến trình sync hiện BƯỚC đang chạy (2026-08-30): `[phase] <mã>` in ra stderr của con
// (`syncrun.ts`), daemon trích ra bằng `extractPhase` (`syncjob.ts`) để UI vẽ ĐÚNG bước thay vì
// một "đang sync…" mờ mờ suốt cả lượt. Đo hàm THUẦN — không cần spawn tiến trình thật.
import assert from "node:assert/strict";
import test from "node:test";
import { extractPhase } from "../../dist/jobs/syncjob.js";

test("một dòng phase trọn vẹn trong một khối", () => {
  const r = extractPhase("", "[phase] write\n", "");
  assert.equal(r.phase, "write");
  assert.equal(r.buf, "");
});

test("khối cắt ngang giữa dòng — phải ghép lại đúng ở lượt kế", () => {
  const a = extractPhase("", "[phase] wr", "");
  assert.equal(a.phase, "", "chưa có \n thì chưa được tính là một dòng");
  assert.equal(a.buf, "[phase] wr");
  const b = extractPhase(a.buf, "ite\n", a.phase);
  assert.equal(b.phase, "write");
});

test("nhiều dòng phase trong CÙNG một khối ⇒ lấy dòng CUỐI (mới nhất)", () => {
  const r = extractPhase("", "[phase] export\n[phase] write\n[phase] verify\n", "");
  assert.equal(r.phase, "verify");
});

test("dòng KHÔNG phải phase (log thường) không được ghi đè phase đang có", () => {
  const r = extractPhase("", "  ⏳ đang chờ máy X (30s)…\n[sync] nối khối trượt\n", "write");
  assert.equal(r.phase, "write", "phase phải GIỮ NGUYÊN, không bị dòng log khác đè thành rỗng");
});

test("dòng dở cuối khối được giữ lại nguyên vẹn cho lượt sau, không bị nuốt hay nhân đôi", () => {
  const r = extractPhase("", "[phase] scan\n[phase] mer", "");
  assert.equal(r.phase, "scan");
  assert.equal(r.buf, "[phase] mer");
});
