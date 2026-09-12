// CÔNG TẮC PHẢI SÁNG ĐÚNG NGAY LƯỢT VẼ ĐẦU — và không bao giờ bị một gói CŨ vẽ đè.
//
// Sinh từ báo cáo thật của user 2026-09-10: *"setting chọn tính năng bật tắt … khi mở lại phải nhớ đã
// bật tắt cái nào, t thấy nó vẫn bị ko lưu"*. Đo ra thì tầng LƯU không hỏng — `data/config.json` ghi
// `hybrid:true` đúng, và `/memory-status` cũng trả `hybrid:true`. Hỏng ở tầng ĐỌC LẠI, hai chỗ:
//
//  ① Bốn cờ (`hybrid` · `rerank` · `scope` · `pathsWatch`) chỉ tới từ `/memory-status` — gói NẶNG NHẤT
//    của app. Đo trên kho thật: lượt lạnh **152.253 ms**, lượt kế **181.230 ms** (cache không đỡ nổi).
//    Suốt chừng ấy thời gian `Z.mem` rỗng ⇒ `!!undefined` = Off ⇒ hàng Hybrid vẽ TẮT dù config ghi BẬT.
//    Đúng bệnh đã vá cho nút VI/EN ở `[2026-09-10e]`, lần đó chỉ cứu `lang`.
//  ② `dashCache` (TTL 60 s) đóng băng cả cờ trong gói, mà `/set-hybrid` KHÔNG xoá cache ⇒ gói đúc
//    trước cú bấm mang trạng thái cũ và vẽ đè lên nút vừa gạt.
//
// Cả hai được trị bằng MỘT hàm `liveFlags()`: cờ đọc tươi, trải lên MỌI đường trả về, và đi kèm `/ping`
// (lời gọi rẻ nhất, ~100 ms, cũng là lượt đầu FE phát ra).
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInMemoryChild, tempDir } from "./helpers.mjs";

const SRC = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
const FLAGS = ["hybrid", "rerank", "pathsWatch", "scope"];

test("liveFlags() là NGUỒN DUY NHẤT của bốn công tắc + lang, và nó đọc thẳng settings (không qua cache)", () => {
  const ui = SRC("backend/src/ui.ts");
  const body = /function liveFlags\(\): Record<string, unknown> \{([\s\S]*?)\n\}/.exec(ui);
  assert.ok(body, "phải có hàm liveFlags()");
  for (const [key, getter] of [["hybrid", "getHybridSetting"], ["rerank", "getRerankSetting"], ["pathsWatch", "getPathsWatch"], ["scope", "getScopeSetting"], ["lang", "getLang"]]) {
    assert.match(body[1], new RegExp(`${key}: ${getter}\\(\\),`), `liveFlags phải đọc ${key} bằng ${getter}()`);
  }
});

test("ĐƯỜNG CACHE: liveFlags() trải SAU dashCache.value — trước là vô nghĩa, gói cũ vẫn thắng", () => {
  const ui = SRC("backend/src/ui.ts");
  assert.match(
    ui,
    /return \{ \.\.\.dashCache\.value, \.\.\.liveFlags\(\), cached: true/,
    "thứ tự trải quyết định ai thắng: cờ tươi phải nằm SAU hàng cache",
  );
});

test("ĐƯỜNG TÍNH MỚI: payload dùng chung liveFlags(), KHÔNG khai lại cờ lần thứ hai", () => {
  const ui = SRC("backend/src/ui.ts");
  const payload = /const payload = \{([\s\S]*?)\n {2}\};/.exec(ui);
  assert.ok(payload, "phải tìm được khối payload của /memory-status");
  assert.match(payload[1], /\.\.\.liveFlags\(\),/, "payload phải trải liveFlags()");
  // Khai lại một cờ ở đây là dựng nguồn thứ hai cho cùng một sự thật — sớm muộn hai chỗ lệch nhau.
  for (const k of [...FLAGS, "lang"]) {
    assert.doesNotMatch(payload[1], new RegExp(`^\\s*${k}: get`, "m"), `payload không được khai lại '${k}' — liveFlags() đã sở hữu nó`);
  }
});

test("/ping mang cờ: đây là lượt gọi ĐẦU của FE, nên nó quyết định lần vẽ đầu đúng hay sai", () => {
  const ui = SRC("backend/src/ui.ts");
  const ping = /if \(p === "\/ping"\) return json\(res, \{([^}]*)\}\);/.exec(ui);
  assert.ok(ping, "phải tìm được handler /ping");
  assert.match(ping[1], /\.\.\.liveFlags\(\)/, "/ping phải mang cờ — không thì FE vẫn phải chờ gói 152 s");
});

test("FE gieo cờ từ /ping vào CHÍNH Z.mem rồi vẽ lại — không đẻ nguồn thứ hai", () => {
  const chrome = SRC("frontend/scripts/chrome.js");
  const seed = /Z\.mem=Z\.mem\|\|\{\};\[([^\]]*)\]\.forEach\(function\(k\)\{if\(p\[k\]!==undefined\)Z\.mem\[k\]=p\[k\];\}\)/.exec(chrome);
  assert.ok(seed, "zboot phải gieo cờ của /ping vào Z.mem");
  for (const k of FLAGS) assert.match(seed[1], new RegExp(`'${k}'`), `phải gieo cờ '${k}'`);
  // Gieo mà không vẽ lại thì đúng dữ liệu, sai màn hình.
  assert.match(chrome, /if\(typeof renderSystem==='function'\)renderSystem\(\);/, "gieo xong phải vẽ lại màn Tính năng");
  assert.match(chrome, /rh\.classList\.toggle\('on',!!Z\.mem\.hybrid\)/, "chip Hybrid ở màn Recall cũng phải sáng theo");
});

test("BỀN QUA TIẾN TRÌNH: giá trị gạt xong đọc lại được ở một tiến trình MỚI (đây là vế user nghi ngờ)", (t) => {
  const root = tempDir(t, "zemory-tog-");
  mkdirSync(join(root, "data"), { recursive: true });
  const steps = runInMemoryChild(root, `
    out.push({ step: "default", hybrid: S.getHybridSetting(), rerank: S.getRerankSetting(), scope: S.getScopeSetting(), pathsWatch: S.getPathsWatch() });
    S.setHybridSetting(false); S.setRerankSetting(true);
  `);
  const d = steps[0];
  assert.equal(d.hybrid, true, "mặc định Hybrid BẬT");
  assert.equal(d.rerank, false, "mặc định Rerank TẮT (plan/05 §4.E — opt-in)");
  assert.equal(d.scope, true);
  assert.equal(d.pathsWatch, true);
  // Tiến trình THỨ HAI, cùng kho: đây mới là phép đo "mở lại có nhớ không".
  const again = runInMemoryChild(root, `out.push({ hybrid: S.getHybridSetting(), rerank: S.getRerankSetting() });`);
  assert.equal(again[0].hybrid, false, "tắt Hybrid rồi mở tiến trình mới ⇒ vẫn TẮT");
  assert.equal(again[0].rerank, true, "bật Rerank rồi mở tiến trình mới ⇒ vẫn BẬT");
  const saved = JSON.parse(readFileSync(join(root, "data", "config.json"), "utf8"));
  assert.deepEqual({ hybrid: saved.hybrid, rerank: saved.rerank }, { hybrid: false, rerank: true }, "và nó nằm trong config.json, đọc bằng mắt được");
});
