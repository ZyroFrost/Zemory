// Chốt MẶC ĐỊNH của các công tắc tốn kém — thứ mà "sửa giá trị trong config" không giữ nổi.
//
// Bối cảnh: rerank từng được vá về OFF hồi 2026-07-26, nhưng bản vá chỉ ghi giá trị vào
// `config.json`. Hàm đọc vẫn `?? true`, nên khi file config rỗng/bị dựng lại thì rerank
// BẬT LẠI và recall rơi từ ~4,6 s xuống 23–29 s mà không ai hay. Test này khoá MẶC ĐỊNH,
// không khoá giá trị — đúng chỗ lỗi thật.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

/** Chạy trong tiến trình con với HOME riêng ⇒ không đụng config thật của người dùng. */
async function withEmptyConfig(fn) {
  const dir = mkdtempSync(join(tmpdir(), "zemory-cfg-"));
  const prev = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, ZEMORY_RERANK: process.env.ZEMORY_RERANK };
  process.env.HOME = dir;
  process.env.USERPROFILE = dir;
  delete process.env.ZEMORY_RERANK;
  try {
    return await fn(dir);
  } finally {
    Object.assign(process.env, prev);
    if (prev.ZEMORY_RERANK === undefined) delete process.env.ZEMORY_RERANK;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("config RỖNG ⇒ rerank TẮT (plan/05 §4.E opt-in; điều 12 cấm bật mặc định thứ chưa qua gate)", async () => {
  await withEmptyConfig(async (dir) => {
    writeFileSync(join(dir, ".zemory-config-probe"), "");
    const { getRerankSetting } = await import(`../../dist/config/settings.js?cfg=${Date.now()}`);
    assert.equal(getRerankSetting(), false, "mặc định phải TẮT — bật mặc định làm recall chậm 6,3× (đo 2026-07-28)");
  });
});

test("mặc định các công tắc nặng khác: sync 'lean', KHÔNG kèm ảnh", async () => {
  await withEmptyConfig(async () => {
    const { getSyncLevel, getSyncAttachments } = await import(`../../dist/config/settings.js?cfg=${Date.now()}b`);
    assert.equal(getSyncLevel(), "lean", "bundle mặc định phải là bản gọn (−74%)");
    assert.equal(getSyncAttachments(), false, "L3 kèm ảnh phải là opt-in — nó phá cân đối bundle lean");
  });
});

// Ngưỡng cảnh báo context — trước là hằng chôn trong `capture-hook.ts` (05_TODO §🧷).
// Mặc định phải GIỮ NGUYÊN 95, và giá trị vô lý phải bị KẸP chứ không được ghi thẳng: một
// ngưỡng 0 hay 150 lọt vào config sẽ làm hook hoặc spam mỗi prompt, hoặc câm vĩnh viễn.
test("context warn threshold: mặc định 95, kẹp trong [50,99], rác không phá được config", async () => {
  await withEmptyConfig(async () => {
    const { getContextWarnPercent, setContextWarnPercent } = await import(`../../dist/config/settings.js?cfg=${Date.now()}c`);
    assert.equal(getContextWarnPercent(), 95, "mặc định KHÔNG được đổi lặng lẽ khi phơi ra config");

    setContextWarnPercent(80);
    assert.equal(getContextWarnPercent(), 80);

    setContextWarnPercent(5);
    assert.equal(getContextWarnPercent(), 50, "quá thấp ⇒ kẹp, không thì nhắc suốt ngày rồi bị bỏ qua");

    setContextWarnPercent(140);
    assert.equal(getContextWarnPercent(), 99, "≥100 là không bao giờ kịp nhắc");

    setContextWarnPercent(92.4);
    assert.equal(getContextWarnPercent(), 92, "làm tròn, không để số lẻ trôi vào so sánh");
  });
});
