// Gate cho UI ĐANG CHẠY (frontend/pages/app.html + styles/app.css + scripts/app.js).
//
// Vì sao có file này: cả bộ 22 test UI trước đó (cockpit.test.mjs) neo vào bản
// cockpit cũ — khi UI được viết lại thành 5 màn (plan 15), test cũ vẫn XANH vì nó
// soi file đã chết, còn UI thật thì KHÔNG có một test nào. Xanh giả suốt nhiều vòng
// sửa. Phát hiện 2026-07-27 khi rà P2/P3.
//
// `npm run build` chỉ type-check TS; nó KHÔNG nhìn được vào HTML/CSS/JS tĩnh. Ba họ
// lỗi đã lọt qua build trong phiên này đều thuộc loại đó: backtick trong comment cắt
// đứt template literal, `//` trong hàm một dòng nuốt mất dấu `}`, và key i18n chỉ có
// một thứ tiếng. Các test dưới đây đọc đúng thứ trình duyệt nhận.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const HTML = rd("../../frontend/pages/app.html");
const CSS = rd("../../frontend/styles/app.css");
const JS = rd("../../frontend/scripts/app.js");
// Bản cũ phải ghép 18 file lại thành một trang để soi. UI mới đã là 3 file phẳng
// (no-build static, 03_STRUCTURE §5) nên soi thẳng từng file — rõ hơn và thông báo
// lỗi chỉ đúng file cần sửa.

// ---- Hai từ điển i18n (02_RULES §16: 2 dict vi/en, mặc định VI) ----
function dicts() {
  const start = JS.indexOf("var I18N={vi:{");
  assert.ok(start >= 0, "neo từ điển 'var I18N={vi:{' phải tồn tại");
  const rest = JS.slice(start);
  const cut = rest.indexOf("\n  },en:{");
  assert.ok(cut > 0, "dict EN phải nối ngay sau dict VI");
  const end = rest.indexOf("\n  }};");
  assert.ok(end > cut, "khối I18N phải đóng bằng '}};'");
  return { vi: rest.slice(0, cut), en: rest.slice(cut, end) };
}
const keysIn = (d) => new Set([...d.matchAll(/'([a-zA-Z0-9_.]+)':/g)].map((m) => m[1]));

// ============================ CÚ PHÁP · thứ build không thấy ============================

test("app.js phân tích cú pháp được (bắt backtick/comment làm vỡ literal)", () => {
  // new Function biên dịch mà không chạy — lỗi cú pháp ném ra ở đây.
  assert.doesNotThrow(() => new Function(JS), "app.js phải hợp lệ về cú pháp");
});

test("app.css cân ngoặc — một ngoặc lẻ nuốt cả stylesheet", () => {
  const noComments = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const opens = (noComments.match(/\(/g) || []).length;
  const closes = (noComments.match(/\)/g) || []).length;
  assert.equal(opens, closes, `CSS lệch ngoặc (${opens} mở / ${closes} đóng) — một giá trị hàm bị vỡ`);
  const bad = noComments.split("\n")
    .filter((ln) => (ln.match(/\(/g) || []).length !== (ln.match(/\)/g) || []).length)
    .map((l) => l.trim().slice(0, 60));
  assert.deepEqual(bad, [], "một dòng CSS lệch ngoặc");
});

test("không token nào tự định nghĩa bằng chính nó (vòng tròn → hỏng im lặng)", () => {
  const selfRefs = [];
  for (const m of CSS.matchAll(/(--[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/g)) {
    if (m[1] === m[2]) selfRefs.push(m[1]);
  }
  assert.deepEqual(selfRefs, [], "các token này định nghĩa bằng chính nó → vô hiệu");
});

// ============================ i18n · hai thứ tiếng phải ngang nhau ============================

test("mọi key data-i18n trong HTML có mặt ở CẢ HAI từ điển", () => {
  const used = new Set();
  for (const m of HTML.matchAll(/data-i18n(?:-ph|-title)?="([^"]+)"/g)) used.add(m[1]);
  assert.ok(used.size > 50, `kỳ vọng nhiều key data-i18n, chỉ thấy ${used.size}`);
  const { vi, en } = dicts();
  const missVi = [...used].filter((k) => !vi.includes("'" + k + "':")).sort();
  const missEn = [...used].filter((k) => !en.includes("'" + k + "':")).sort();
  assert.deepEqual(missVi, [], "key data-i18n thiếu bản VI");
  assert.deepEqual(missEn, [], "key data-i18n thiếu bản EN (đổi sang EN sẽ hiện key trần)");
});

test("mọi t('key') trong JS có mặt ở CẢ HAI từ điển", () => {
  const used = new Set();
  for (const m of JS.matchAll(/\bt\((['"])([a-zA-Z0-9_.]+)\1\)/g)) used.add(m[2]);
  assert.ok(used.size > 20, `kỳ vọng nhiều key t(), chỉ thấy ${used.size}`);
  const { vi, en } = dicts();
  const missVi = [...used].filter((k) => !vi.includes("'" + k + "':")).sort();
  const missEn = [...used].filter((k) => !en.includes("'" + k + "':")).sort();
  assert.deepEqual(missVi, [], "key t() thiếu bản VI");
  assert.deepEqual(missEn, [], "key t() thiếu bản EN");
});

test("hai từ điển có CÙNG tập key (không bên nào dư key chết)", () => {
  const { vi, en } = dicts();
  const kv = keysIn(vi);
  const ke = keysIn(en);
  const onlyVi = [...kv].filter((k) => !ke.has(k)).sort();
  const onlyEn = [...ke].filter((k) => !kv.has(k)).sort();
  assert.deepEqual(onlyEn, [], "key chỉ có ở EN — VI sẽ rơi về key trần");
  assert.deepEqual(onlyVi, [], "key chỉ có ở VI — EN sẽ rơi về tiếng Việt giữa giao diện Anh");
});

// ============================ Theme · light mode phải đảo đủ ============================

test("light theme đủ: mọi màu đi qua token, không literal nào sót", () => {
  const offenders = [];
  CSS.split("\n").forEach((ln, i) => {
    if (/^\s*--[a-z0-9-]+:/.test(ln)) return; // dòng ĐỊNH NGHĨA token
    const probe = ln
      .replace(/(box-shadow|drop-shadow|text-shadow)[^;]*;?/gi, "") // bóng tối ở cả 2 theme
      .replace(/mask-image[^;]*;?/gi, ""); // mask chỉ dùng alpha
    if (probe.match(/#[0-9a-fA-F]{3,8}\b|rgba\([0-9]/g)) offenders.push(i + 1 + ": " + ln.trim().slice(0, 80));
  });
  assert.deepEqual(offenders, [], "các màu này không qua token → không đảo được sang light");
});

test("mọi token MÀU được khai báo ở CẢ :root lẫn khối light", () => {
  const used = new Set([...CSS.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  const rootDefs = new Set([...CSS.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  const li = CSS.indexOf(':root[data-theme="light"]');
  assert.ok(li > 0, "phải có khối theme light");
  const lightBlock = CSS.slice(li, CSS.indexOf("}", CSS.indexOf("{", li)));
  const lightDefs = new Set([...lightBlock.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
  const COLOUR = /(bg|panel|line|text|muted|faint|green|amber|red|blue|wash|grid|scrim|inset|shadow|on-)/;
  assert.deepEqual([...used].filter((t) => !rootDefs.has(t)), [], "token được dùng nhưng chưa khai ở :root");
  assert.deepEqual(
    [...used].filter((t) => COLOUR.test(t) && !lightDefs.has(t)),
    [],
    "token màu không khai lại cho light theme (sẽ giữ nguyên giá trị tối)",
  );
});

// ============================ Cấu trúc 5 màn · không màn mồ côi ============================

test("nav đúng 6 màn, và mỗi mục nav có đúng một <section class=screen>", () => {
  const nav = HTML.slice(HTML.indexOf('<nav class="nav"'), HTML.indexOf("</nav>"));
  const navKeys = [...nav.matchAll(/data-s="([a-z]+)"/g)].map((m) => m[1]);
  // 9 màn (nhiều chỗ trùng) → 5, rồi tách "Tính năng & Kiểm tra" ra lại thành mục nav
  // riêng (user 2026-07-27): Home vốn đã là chỗ tổng hợp nhiều bảng, một tab nhỏ bên
  // trong thì không ai nhận ra nó tồn tại — và nó khác việc (chẩn đoán ≠ liếc nhanh).
  // Lý do gộp ban đầu là hai danh sách check trùng nhau, cái đó đã xử bằng cách xoá bản
  // trùng; việc đó KHÔNG đòi phải gộp luôn màn.
  assert.deepEqual(navKeys, ["home", "recall", "projects", "gmem", "harness", "system"], "IA 6 màn");
  // `class="screen on"` cho màn đang mở — khớp cả hai dạng, đừng neo cứng "screen".
  const screens = [...HTML.matchAll(/<section class="screen[^"]*"[^>]*data-s="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...navKeys].sort(), [...screens].sort(), "mỗi mục nav phải có đúng một màn, và ngược lại");
});

test("mỗi nút sub-tab có đúng một khối .sub tương ứng (không nút chết, không khối mồ côi)", () => {
  // "hm" đã biến mất cùng lúc Home hết sub-tab — nhóm rỗng phải bị loại khỏi danh sách,
  // nếu không test sẽ đòi ≥2 nút cho một nhóm không còn tồn tại.
  for (const group of ["rc", "gm", "ht", "pt"]) {
    const re = new RegExp(`<(button|div)([^>]*?)data-${group}="([a-z]+)"`, "g");
    const btns = new Set();
    const subs = new Set();
    for (const m of HTML.matchAll(re)) {
      if (m[1] === "button") btns.add(m[3]);
      else if (/class="sub\b/.test(m[2])) subs.add(m[3]);
    }
    assert.ok(btns.size >= 2, `nhóm sub-tab ${group} phải có ≥2 nút`);
    assert.deepEqual([...btns].sort(), [...subs].sort(), `nhóm ${group}: nút và khối .sub phải khớp nhau`);
  }
});

test("không id nào bị khai hai lần (khối bị chuyển chỗ mà quên xoá chỗ cũ)", () => {
  const seen = new Map();
  for (const m of HTML.matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  assert.deepEqual(dupes, [], "id trùng — el(id) sẽ bắt nhầm phần tử và nửa UI ngừng phản hồi");
});

test("mọi data-seam có biến CSS tương ứng điều khiển layout (§5 kéo là đổi thật)", () => {
  const seams = [...HTML.matchAll(/data-seam="([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(seams.length >= 6, `kỳ vọng nhiều đường kéo, chỉ thấy ${seams.length}`);
  const dead = seams.filter((k) => !HTML.includes(`var(--${k}`) && !CSS.includes(`var(--${k}`));
  assert.deepEqual(dead, [], "đường kéo trang trí — kéo không đổi gì vì không biến nào nhận giá trị");
  // MỘT engine duy nhất, dữ liệu hoá qua data-seam — không phải nhánh-theo-loại.
  assert.ok(/function initSeams\(\)/.test(JS), "mọi seam đi qua một initSeams() duy nhất");
});

// ============================ Hành vi đã trả giá để học ============================

test("không onclick nội tuyến — markup dựng bằng data-act + listener uỷ quyền", () => {
  const offenders = JS.split("\n").filter((line) => /['"][^'"]*onclick=/.test(line));
  assert.deepEqual(offenders.map((l) => l.trim().slice(0, 60)), [], "dùng data-act + delegated listener");
});

test("không dùng prompt()/confirm() của trình duyệt — mọi hộp thoại là dialog trong app", () => {
  const code = JS.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\bwindow\.(prompt|confirm)\s*\(/.test(code), "window.prompt/confirm bị cấm");
  assert.ok(!/(^|[^.\w])(prompt|confirm)\s*\(/m.test(code.replace(/\bzConfirm\s*\(/g, "")), "prompt()/confirm() trần bị cấm");
  assert.ok(/function zDialog\(/.test(JS) && /function zConfirm\(/.test(JS), "phải có dialog thay thế trong app");
});

test("ESC đóng hộp thoại qua một keydown toàn cục", () => {
  assert.ok(/addEventListener\('keydown'[\s\S]{0,200}Escape/.test(JS), "phải có handler Escape toàn cục");
  assert.ok(/\.dlg-back\.on/.test(JS), "ESC đóng theo lớp .dlg-back.on — một sổ đăng ký duy nhất");
});

test("không polling tổng hợp toàn DB theo nhịp ngắn", () => {
  // Bản cũ poll một aggregate ~4s bằng interval 2.5s. UI mới KHÔNG poll gì cả;
  // nếu sau này thêm lại, interval phải ≥ 15s.
  for (const m of JS.matchAll(/setInterval\([\s\S]{0,120}?,\s*(\d+)\s*\)/g)) {
    assert.ok(Number(m[1]) >= 15000, `interval ${m[1]}ms quá ngắn cho một truy vấn tổng hợp`);
  }
});

// HP điều 12: cấm hiện con số phản-thực "tiết kiệm N token" — không đo được (không
// biết agent LẼ RA đã tốn bao nhiêu). Chỉ được hiện đại lượng đo thật.
test("không chỗ nào khẳng định 'tiết kiệm token' (điều 12 — số phản-thực)", () => {
  const { vi, en } = dicts();
  const offenders = [];
  for (const m of (vi + en).matchAll(/'[^']*(?:tiết kiệm|saved|save)[^']*'/gi)) {
    const s = m[0];
    if (!/token/i.test(s)) continue; // "saved sessions" / "lưu vào config" không phải khẳng định token
    if (/KHÔNG|không|no |not |never|deliberately/i.test(s)) continue; // câu từ chối hiện số là đúng ý
    offenders.push(s.slice(0, 90));
  }
  assert.deepEqual(offenders, [], "các chuỗi này khẳng định mức tiết kiệm token mà zemory không đo được");
});

// ============================ Graph · các tính năng vừa dựng ============================

test("graph: cuộn để zoom, kéo nền để pan, kéo node, nháy đúp để reset", () => {
  assert.ok(/addEventListener\('wheel'/.test(JS), "phải có handler wheel");
  assert.ok(/pointerdown/.test(JS) && /pointermove/.test(JS), "phải có handler kéo");
  assert.ok(/gMoveNode/.test(JS), "kéo node dời cả vòng tròn, nhãn và cạnh chạm nó");
  assert.ok(/gSuppressClick/.test(JS), "kéo xong không được kích hoạt click chọn node");
  assert.ok(/dblclick/.test(JS), "nháy đúp reset khung nhìn");
});

// Bấm node PHẢI nhảy tới đúng dòng trong cây thư mục (user báo 2026-07-25). Lần sửa
// đầu tôi suy luận mà không đo nên sửa trượt: thủ phạm là setPointerCapture đổi đích
// của sự kiện `click`, nên việc chọn node phải nằm ở `pointerup`, không phải `click`.
test("bấm node graph nhảy tới đúng dòng trên cây, và chọn ở pointerup", () => {
  assert.ok(/function gRevealTreeFile\(/.test(JS), "phải có gRevealTreeFile để cuộn cây tới file");
  const at = JS.indexOf("function gRevealTreeFile(");
  // Lột comment: lời bàn VỀ lỗi không được đọc thành chính lỗi (chính hàm này có một
  // comment giải thích vì sao KHÔNG dùng scrollIntoView).
  const fn = JS.slice(at, at + 1800).replace(/\/\/[^\n]*/g, "");
  assert.ok(/scrollTop/.test(fn), "cuộn BÊN TRONG khung cây bằng scrollTop — scrollIntoView sẽ cuộn cả trang");
  assert.ok(!/scrollIntoView/.test(fn), "không dùng scrollIntoView (kéo lệch cả trang)");
  assert.ok(/pointerup[\s\S]{0,400}gSelectNode/.test(JS), "chọn node phải xảy ra ở pointerup (setPointerCapture đổi đích của click)");
});

test("graph: bôi chọn khung + kéo cả nhóm + hoàn tác được", () => {
  assert.ok(/function gSelectInRect\(/.test(JS), "bôi chọn theo khung (marquee)");
  assert.ok(/gSelIds/.test(JS) && /function gPaintSel\(/.test(JS), "một nguồn sự thật cho tập đang chọn + hàm tô lại");
  assert.ok(/function gDeselectAll\(/.test(JS), "bỏ chọn tất cả");
  assert.ok(/moves\s*:/.test(JS), "kéo nhóm ghi một mục hoàn tác gộp {moves:[…]}");
});

// ============================ Chart · yêu cầu chốt của user ============================

test("Global Memory: đúng 4 bảng chart, không hơn không kém", () => {
  const grid = HTML.slice(HTML.indexOf('class="grid g2 grow chart-grid"'));
  const block = grid.slice(0, grid.indexOf("</div>\n\n        </div>"));
  const ids = [...block.matchAll(/id="(ins[A-Za-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["insProjects", "insAgents", "insDaily", "insGrowth"], "lưới 2×2 đúng 4 bảng (user chốt 2026-07-26)");
});

test("chart theo thời gian PHẢI có trục thời gian", () => {
  // "chart mà ko có cột time thì ý nghĩa mẹ gì" (user 2026-07-26). Nhãn trục render
  // bằng HTML dưới SVG — KHÔNG nhét <text> vào SVG vì preserveAspectRatio="none" bóp méo chữ.
  assert.ok(/function xAxis\(/.test(JS), "phải có hàm dựng trục thời gian");
  const calls = [...JS.matchAll(/xAxis\(/g)].length;
  assert.ok(calls >= 3, `trục phải được dùng cho cả hai chart thời gian (thấy ${calls - 1} lần gọi)`);
  const daily = JS.slice(JS.indexOf("insDaily"), JS.indexOf("insDaily") + 1200);
  assert.ok(/xAxis\(/.test(daily), "chart Hoạt động theo ngày phải có trục thời gian");
  const growth = JS.slice(JS.indexOf("insGrowth"), JS.indexOf("insGrowth") + 1200);
  assert.ok(/xAxis\(/.test(growth), "chart Tăng trưởng bộ nhớ phải có trục thời gian");
});

// ============================ Trình xem phiên · lớp full ============================

// Logic gốc: DB giữ HAI lớp — một lớp phiên FULL đầy đủ, một lớp digest cắt bớt.
// Trình xem phải cho thấy lớp FULL (văn xuôi nguyên vẹn), chỉ GẤP phần cồng kềnh lại.
test("trình xem phiên hiện văn bản đầy đủ, chỉ gấp khối cồng kềnh", () => {
  assert.ok(/function msgHtml\(/.test(JS), "phải có bộ dựng nội dung tin");
  const at = JS.indexOf("function msgHtml(");
  const fn = JS.slice(at, at + 2000);
  // msgHtml gọi fold(nhãn, thân); chính fold() mới phát ra thẻ <details>.
  assert.ok(/\bfold\(/.test(fn), "khối cồng kềnh phải đi qua fold(), không bị cắt mất");
  assert.ok(
    /function fold\(label,\s*body\)\{[\s\S]{0,200}<details class="fold">/.test(JS),
    "fold() phải phát ra <details class=\"fold\"> chứa TOÀN BỘ thân, không cắt cụt",
  );
  for (const marker of ["tool_use", "tool_result", "file:"]) {
    assert.ok(fn.includes(marker), `phải nhận diện và gấp khối ${marker}`);
  }
  assert.ok(!/\.slice\(0,\s*\d{2,4}\)\s*\+\s*['"]…/.test(fn), "không được cắt cụt văn xuôi bằng slice+…");
});

test("tin có tiền tố [tool_result] hiện vai TOOL, không phải USER", () => {
  // role='user' trong transcript gồm cả kết quả tool do runtime chèn vào. Hiện chúng
  // như lời người dùng làm màn hình phiên đầy nội dung docs không ai gõ (user báo).
  assert.ok(/function msgRole\(/.test(JS), "phải có hàm quy đổi vai hiển thị");
  const fn = JS.slice(JS.indexOf("function msgRole("), JS.indexOf("function msgRole(") + 400);
  assert.ok(/tool_result/.test(fn) && /tool/.test(fn), "user + [tool_result] phải đổi nhãn thành tool");
});

// ============================ Phục vụ file tĩnh ============================

// Xin một file KHÔNG tồn tại dưới /scripts/ hay /styles/ từng làm daemon TREO HẲN —
// không phản hồi, không timeout, không lỗi (đo 2026-07-27 ngay sau khi cho cockpit cũ
// nghỉ hưu: mọi bookmark/cache còn trỏ tới 18 file cũ đều treo tab). Nguyên nhân:
// writeHead(200) gọi TRƯỚC readFileSync, nên khi đọc hỏng thì header đã gửi mất rồi
// và writeHead(404) trong catch ném ERR_HTTP_HEADERS_SENT ⇒ res.end() không chạy.
// Bất biến: ĐỌC XONG mới cam kết header.
test("serveFrontend/serveBinary đọc file TRƯỚC khi ghi header 200 (không thì treo, không phải 404)", () => {
  const src = rd("../src/ui.ts");
  for (const fn of ["serveFrontend", "serveBinary"]) {
    const at = src.indexOf(`function ${fn}(`);
    assert.ok(at > 0, `${fn} phải tồn tại`);
    const body = src.slice(at, src.indexOf("\n}", at)).replace(/\/\/[^\n]*/g, "");
    const read = body.indexOf("readFileSync");
    const ok200 = body.indexOf("writeHead(200");
    assert.ok(read > 0 && ok200 > 0, `${fn} phải vừa đọc file vừa ghi header 200`);
    assert.ok(read < ok200, `${fn}: readFileSync phải chạy TRƯỚC writeHead(200) — ngược lại là bẫy treo`);
  }
});

// ============================ Song ngữ · phần gate CŨ không thấy ============================

// Gate i18n phía trên chỉ soi key ĐÃ nằm trong từ điển. Nó mù với chuỗi tiếng Việt viết
// THẲNG vào code — thứ không bao giờ dịch được, đổi sang EN vẫn hiện tiếng Việt. Đo
// 2026-07-27: **137** chuỗ như vậy (user hỏi "còn chỗ nào thiếu song ngữ không").
// RATCHET, không phải giấy chứng nhận sạch: con số chỉ được ĐI XUỐNG. Phần lớn còn lại
// là mô tả slot của bản chuẩn (nội dung, không phải chrome UI) — hạ dần theo đợt.
// Trần chỉ được ĐI XUỐNG. 137 → 127 → 100: đợt cuối chuyển 14 khối tài liệu tính năng
// sang key i18n. 61 chuỗi còn lại nằm trong STRUCT/ROUTE — hai bảng nay chỉ là BẢN DỰ
// PHÒNG khi /standard-spec hỏng, không phải nguồn hiển thị, nên không cần dịch.
const VI_HARDCODE_BASELINE = 100;

test(`chuỗi tiếng Việt hardcode (ngoài từ điển) không được tăng — trần ${VI_HARDCODE_BASELINE}`, () => {
  const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  const lines = JS.split("\n");
  let inDict = false;
  const hits = [];
  lines.forEach((ln, i) => {
    if (/var I18N=\{vi:\{/.test(ln)) inDict = true;
    if (inDict && /^ {2}\}\};/.test(ln)) { inDict = false; return; }
    if (inDict || /^\s*\/\//.test(ln)) return;
    for (const m of ln.matchAll(/'([^']{3,})'|"([^"]{3,})"/g)) {
      const v = m[1] ?? m[2];
      if (VI.test(v)) hits.push(`${i + 1}: ${v.slice(0, 50)}`);
    }
  });
  assert.ok(
    hits.length <= VI_HARDCODE_BASELINE,
    `chuỗi VI hardcode tăng lên ${hits.length} (trần ${VI_HARDCODE_BASELINE}). Chuỗi mới PHẢI đi qua t() + có key ở CẢ hai từ điển.\n` +
      hits.slice(-8).join("\n"),
  );
});

// Ba panel Máy này · Sources · Drive đứng cạnh nhau vì LIÊN QUAN NHAU (user 2026-07-27):
// "+20 tin mới" ở panel quét phải bằng tổng +N hiện trên cây Sources, và bằng số Drive
// đang thiếu. Nếu chỉ hiện TỔNG mới thì không đối chiếu được gì — nên delta là chức năng,
// không phải trang trí. Test chạy THẲNG logic của file đang ship, không kiểm bằng chuỗi.
test("Sources hiện +N của lần quét gần nhất, và giữ lại qua các lần render không đổi", () => {
  const pick = (name) => {
    const i = JS.indexOf(`function ${name}(`);
    assert.ok(i > 0, `${name} phải tồn tại`);
    let depth = 0;
    for (let k = JS.indexOf("{", i); k < JS.length; k++) {
      if (JS[k] === "{") depth++;
      else if (JS[k] === "}" && --depth === 0) return JS.slice(i, k + 1);
    }
    throw new Error(`${name}: không tìm được dấu đóng`);
  };
  const run = new Function(
    `var zScopeCount={},zScopeDelta={};${pick("scopeKey")}${pick("scopeSnapshot")}${pick("scopeDiff")}return scopeDiff;`,
  )();
  const tree = (root, ss) => [
    {
      label: "Local", lane: { origin: "local" }, messages: root,
      children: [{ label: "SS01", lane: { origin: "local", host: "SS01" }, messages: ss, children: [] }],
    },
  ];
  assert.deepEqual(run(tree(100, 60)), {}, "lần đầu chưa có mốc ⇒ không được bịa delta");
  assert.deepEqual(run(tree(120, 80)), { "local||": 20, "local|SS01|": 20 }, "+20 phải lan lên cả nhánh cha");
  assert.deepEqual(run(tree(120, 80)), { "local||": 20, "local|SS01|": 20 }, "render lại mà không đổi thì GIỮ delta (user còn đang nhìn)");
  assert.deepEqual(run(tree(125, 80)), { "local||": 5 }, "lượt quét mới thay delta cũ");
});
