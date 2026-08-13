// CHUỖI NGƯỜI-DÙNG-THẤY PHẢI ĐI QUA i18n — cổng KHÔNG-LÙI.
//
// `02_RULES §Ngôn ngữ` đòi "0 chuỗi hardcode, mọi chuỗi người-dùng-thấy đi qua i18n, có cả 2
// bản". Đo 2026-08-13 thì thực tế là **90 chuỗi tiếng Việt** còn nằm thẳng trong 8 file
// `frontend/scripts/` (ngoài `chrome.js` — nơi chứa chính hai cuốn từ điển). Triệu chứng người
// dùng thấy: bật `lang=en` mà ô Last Sync vẫn hiện `chưa sync`, `7 giờ trước`, `đã link`…
//
// VÌ SAO LÀ CỔNG KHÔNG-LÙI, KHÔNG PHẢI CỔNG "=0":
// đặt ngưỡng 0 hôm nay là gate ĐỎ TRIỀN MIÊN, mà một gate luôn đỏ thì người ta bỏ qua nó —
// đúng cái luật 7 vừa phải sửa cho `guard` (chặn nhầm ⇒ đi đường vòng ⇒ gate hết tồn tại).
// Ngưỡng chốt bằng SỐ ĐO THẬT: thêm chuỗi hardcode mới là đỏ NGAY, còn gỡ dần thì luôn xanh.
// Gỡ được chuỗi nào thì HẠ ngưỡng xuống — đó là cách con số này đi về 0 mà không ai phải nhớ.
//
// Phạm vi cố ý HẸP: chỉ soi literal trong `frontend/scripts/*.js` sau khi bỏ chú thích. Chú
// thích tiếng Việt là ĐÚNG chuẩn ở repo này; thứ vi phạm là chuỗi CHẠY RA MÀN HÌNH.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../../frontend/scripts/", import.meta.url).pathname.replace(/^\//, "");
// `chrome.js` GIỮ hai cuốn từ điển vi/en — chuỗi tiếng Việt ở đó là dữ liệu, không phải hardcode.
const DICT_FILE = "chrome.js";

// Ngưỡng đo 2026-08-13. HẠ xuống mỗi khi gỡ được chuỗi; KHÔNG được nâng lên.
// `system.js` 11 → 0 cùng ngày: 10 chuỗi vốn đã có key sẵn trong dict (code chỉ quên gọi `t()`),
// chuỗi cuối thêm key mới `sys.goto`. Đây là loại dọn RẺ — không phải dịch gì.
const BUDGET = {
  // ⛔ ĐỪNG dịch 45 chuỗi này — dịch xong UI VẪN hiện tiếng Việt (đo 2026-08-13).
  // Chúng là bảng `STRUCT`/`ROUTE`, và `shell.js` ghi rõ: *"NGUỒN của hai bảng dưới =
  // `/standard-spec`, đọc thẳng từ `03_STRUCTURE.md`. FAIL-OPEN: fetch/parse hỏng ⇒ rơi về
  // STRUCT/ROUTE cũ"*. Tức đây chỉ là LƯỚI ĐỠ khi fetch hỏng. Đo trên daemon thật:
  // `/standard-spec` trả **91 dòng** tiếng Việt từ file `.md`, còn bảng dự phòng có **25 dòng**.
  // Muốn màn này ra tiếng Anh thì phải có bản `03_STRUCTURE` tiếng Anh (hoặc backend trả song
  // ngữ) — đó là việc ở TẦNG TÀI LIỆU, không phải i18n frontend. Hạ trần này mà không làm tầng
  // đó là tự thưởng cho mình một con số đẹp trong khi người dùng không thấy khác gì.
  "shell.js": 45,
  "system.js": 0,
  "graph-panel.js": 0,
  "sources.js": 0,
  // 1 chuỗi còn lại là KHOÁ dữ liệu do backend sinh (`ui.ts`: `type: n.slot ?? "(ngoài chuẩn)"`),
  // KHÔNG phải nhãn — nhãn đã đi qua `gSlotLabel()`. Dịch khoá là làm lệch trạng thái lọc slot.
  "graph-render.js": 1,
  "harness.js": 0,
  "gm.js": 0,
  "recall.js": 0,
};

const VIETNAMESE =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

/** Đếm literal chứa chữ Việt có dấu, sau khi bỏ chú thích (chú thích tiếng Việt là hợp lệ). */
function countHardcoded(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const literals = code.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
  return literals.filter((s) => VIETNAMESE.test(s)).length;
}

test("chuỗi tiếng Việt hardcode trong frontend KHÔNG được tăng (cổng không-lùi)", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".js") && f !== DICT_FILE);
  const over = [];
  for (const f of files) {
    const n = countHardcoded(readFileSync(join(DIR, f), "utf8"));
    const budget = BUDGET[f] ?? 0;
    if (n > budget) over.push(`${f}: ${n} chuỗi (trần ${budget})`);
  }
  assert.deepEqual(
    over,
    [],
    "Chuỗi người-dùng-thấy phải đi qua i18n (02_RULES §Ngôn ngữ) — thêm key vào CẢ HAI dict\n" +
      "trong chrome.js rồi gọi t('key'). Vượt trần:\n  " + over.join("\n  "),
  );
});

test("gỡ được thì phải HẠ trần — trần treo cao hơn thực tế là trần chết", () => {
  // Không có vế này thì ngưỡng chỉ đi một chiều: ai đó gỡ 20 chuỗi, trần vẫn 45, và 20 chỗ vừa
  // dọn có thể lặng lẽ quay lại mà gate không kêu. Đây là thứ giữ cho con số thật sự tiến về 0.
  const stale = [];
  for (const [f, budget] of Object.entries(BUDGET)) {
    const n = countHardcoded(readFileSync(join(DIR, f), "utf8"));
    if (n < budget) stale.push(`${f}: còn ${n} nhưng trần vẫn ${budget} — hạ trần xuống ${n}`);
  }
  assert.deepEqual(stale, [], stale.join("\n"));
});

test("mọi key i18n phải có ở CẢ HAI dict — thiếu một bản là rơi ngược về tiếng Việt", () => {
  // `t()` fallback sang dict vi khi thiếu key, nên một key chỉ có bản vi sẽ KHÔNG báo lỗi:
  // nó lặng lẽ hiện tiếng Việt giữa giao diện tiếng Anh. Đúng dạng hỏng câm.
  const src = readFileSync(join(DIR, DICT_FILE), "utf8");
  const viStart = src.indexOf("var I18N={vi:{");
  const enStart = src.indexOf("en:{", viStart);
  assert.ok(viStart > 0 && enStart > viStart, "không tìm thấy hai dict vi/en");
  const keysOf = (chunk) => new Set([...chunk.matchAll(/'([\w.]+)'\s*:/g)].map((m) => m[1]));
  const vi = keysOf(src.slice(viStart, enStart));
  const en = keysOf(src.slice(enStart));
  const missing = [...vi].filter((k) => !en.has(k));
  assert.deepEqual(missing.slice(0, 20), [], `${missing.length} key thiếu bản EN: ${missing.slice(0, 20).join(", ")}`);
});
