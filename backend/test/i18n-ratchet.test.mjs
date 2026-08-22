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

// ── CHỮ NẰM THẲNG TRONG HTML — vùng cổng này TRƯỚC ĐÂY KHÔNG SOI ────────────────
// Đo 2026-08-21 (audit mặt ⑪): cổng trên chỉ quét `frontend/scripts/*.js`, nên **16 chỗ** chữ
// Việt nằm ngay trong `pages/app.html` chưa bao giờ bị đếm — người dùng đổi `lang=en` vẫn thấy
// «Quét sâu» · «Cả máy» · tooltip «Cài đặt». Không lỗi nào nổ: markup không đi qua `t()`.
//
// Chữ Việt trong HTML là ĐÚNG khi phần tử có MÓC i18n — `chrome.js` đè nội dung lúc chạy qua
// `data-i18n` (text) · `data-i18n-title` · `data-i18n-ph` (placeholder) · `data-i18n-hint`.
// Chỉ chỗ THIẾU móc mới là lỗi. (Bản dò đầu tiên không biết luật này nên báo oan 156 ca.)
const HTML_BUDGET = 0; // ⛔ chỉ được HẠ. 16 chỗ ban đầu đã vá cùng ngày ⇒ trần về 0.
const HTML_FILE = new URL("../../frontend/pages/app.html", import.meta.url);

const VOID_TAGS = new Set(["input", "img", "br", "hr", "meta", "link", "source", "use", "path", "circle", "rect", "col"]);

function htmlGaps(html) {
  const noComment = html.replace(/<!--[\s\S]*?-->/g, " ");
  const out = [];
  // Giữ NGĂN XẾP thẻ mở để biết TỔ TIÊN có móc `data-i18n` chưa: `chrome.js` đặt `innerHTML`
  // của phần tử mang móc ⇒ mọi thẻ con bị ghi đè theo. Bản dò đầu không biết điều này nên báo
  // oan `<b>Quét nguồn đã biết</b>` nằm trong `<div data-i18n="mem.scanHint">` — và tôi suýt
  // "sửa" một chỗ vốn đã đúng.
  const stack = [];
  const covered = () => stack.some((f) => f);
  for (const m of noComment.matchAll(/<\/([a-z][\w-]*)\s*>|<([a-z][\w-]*)\b([^>]*?)(\/?)>([^<]*)/gi)) {
    if (m[1]) {
      stack.pop();
      continue;
    }
    const [, , tag, attrs, selfClose, text] = m;
    const has = (a) => new RegExp(a + "\\s*=", "i").test(attrs);
    const inherited = covered();
    if (!selfClose && !VOID_TAGS.has(tag.toLowerCase())) stack.push(has("data-i18n") || inherited);
    if (VIETNAMESE.test(text) && text.trim().length > 1 && !has("data-i18n") && !inherited) {
      out.push(`text <${tag}>: ${text.trim().slice(0, 40)}`);
    }
    for (const [attr, hook] of [
      ["title", "data-i18n-title"],
      ["placeholder", "data-i18n-ph"],
      ["data-hint", "data-i18n-hint"],
      // `aria-label` cũng là chữ NGƯỜI DÙNG (trình đọc màn hình đọc nó) nên cũng phải song ngữ.
      // Móc `data-i18n-aria` thêm 2026-08-21 cùng đợt — trước đó 7 nhãn aria nằm cứng tiếng Việt.
      ["aria-label", "data-i18n-aria"],
    ]) {
      const m = attrs.match(new RegExp(attr + '\\s*=\\s*"([^"]*)"', "i"));
      if (m && VIETNAMESE.test(m[1]) && !has(hook)) out.push(`${attr} <${tag}>: ${m[1].slice(0, 40)}`);
    }
  }
  return out;
}

test("chữ Việt nằm thẳng trong HTML phải có MÓC i18n (cổng không-lùi)", () => {
  const gaps = htmlGaps(readFileSync(HTML_FILE, "utf8"));
  assert.ok(
    gaps.length <= HTML_BUDGET,
    `${gaps.length} chỗ chữ Việt trong app.html thiếu móc i18n (trần ${HTML_BUDGET}) — ` +
      `thêm data-i18n / -title / -ph / -hint + key ở CẢ HAI dict:\n  ` + gaps.slice(0, 20).join("\n  "),
  );
});

test("phép dò HTML phải THẤY được lỗi — ca ÂM + ca DƯƠNG dựng tại chỗ", () => {
  // Luật 4 của skill audit: hỏi "cái gì làm nó ĐỎ?". Nếu không có ca này thì một hàm dò trả
  // rỗng vĩnh viễn vẫn cho gate màu xanh — đúng kiểu hỏng câm đã dính nhiều lần.
  assert.equal(htmlGaps('<div title="Cài đặt"></div>').length, 1, "thiếu móc title phải bị bắt");
  assert.equal(htmlGaps('<div data-i18n-title="x" title="Cài đặt"></div>').length, 0, "có móc thì KHÔNG được báo");
  assert.equal(htmlGaps("<b>Quét sâu</b>").length, 1, "text chữ Việt trần phải bị bắt");
  assert.equal(htmlGaps('<b data-i18n="x">Quét sâu</b>').length, 0, "text có móc thì KHÔNG được báo");
  assert.equal(htmlGaps("<!-- Quét sâu trong comment --><b>Deep scan</b>").length, 0, "comment KHÔNG tính");
  // TỔ TIÊN có móc ⇒ con được phủ (chrome.js ghi đè innerHTML của phần tử mang móc).
  assert.equal(htmlGaps('<div data-i18n="k"><b>Quét sâu</b></div>').length, 0, "con của phần tử có móc KHÔNG được báo");
  // …nhưng ra khỏi phần tử đó thì hết phủ — nếu không, một móc ở đầu file sẽ che cả trang.
  assert.equal(htmlGaps('<div data-i18n="k"><b>Quét sâu</b></div><b>Cả máy</b>').length, 1, "hết thẻ cha là hết phủ");
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
