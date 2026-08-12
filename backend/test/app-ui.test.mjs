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
import { readAppJs } from "./helpers.mjs";

const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const HTML = rd("../../frontend/pages/app.html");
const CSS = rd("../../frontend/styles/app.css");
const JS = readAppJs();
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

test("9 key i18n đã gỡ KHÔNG được quay lại (mồ côi từ đợt gộp nav)", () => {
  // Đo 2026-07-29: 9 key này còn trong CẢ HAI từ điển nhưng 0 chỗ dùng — sót từ đợt gộp nav
  // 9→6 màn, khi các card `homeChecks`/`insHealth`/`graph.checks` bị gỡ. Test parity ở trên
  // KHÔNG bắt được, vì hai dict vẫn cân: key chết nằm đều ở cả hai bên.
  const GONE = [
    "home.memEngine",
    "home.docsHarness",
    "graph.brokenDocs",
    "graph.brokenDocsHint",
    "graph.orphanFiles",
    "graph.neverModified",
    "graph.neverModifiedHint",
    "graph.harnessOk",
    "graph.validateOk",
  ];
  const declared = (k) => (JS.match(new RegExp(`'${k.replace(/\./g, "\\.")}'\\s*:`, "g")) ?? []).length;
  const back = GONE.filter((k) => declared(k) > 0);
  assert.deepEqual(back, [], `key đã gỡ bị khai lại trong từ điển: ${back.join(", ")}`);
  // Đối chứng cho CHÍNH phép đo: một key còn sống phải đếm ra đúng 2. Bộ dò đầu tiên của
  // tôi báo 212/360 key "mồ côi" vì trượt `data-i18n-ph`/`-title` — xanh giả kiểu đó là thứ
  // phải chặn ngay trong test.
  assert.equal(declared("nav.home"), 2, "đối chứng: nav.home phải được khai đúng 2 lần (vi+en)");
});

test("7 khối UI đã gỡ KHÔNG được tái sinh (nav 9→6, diệt trùng lặp)", () => {
  // Đợt gộp nav đã gỡ: dialog `#sessDlg` (viewer thứ hai render y hệt màn Phiên) · card
  // `homeChecks` + `renderHomeChecks` (list sức khoẻ hardcode song song với FEATURES — 2
  // nguồn sự thật, tất yếu lệch) · `gmSources` (Top Sources vẽ 2 lần) · `insHealth` (4 tile
  // trùng 7 ô gmStats) · `gmHealth`/`gmVector` (donut + card riêng, gộp vào bảng số).
  // Không có ratchet thì lần refactor sau rất dễ dựng lại một trong số đó.
  // Tên vẫn được phép xuất hiện trong COMMENT — ba file đều có ghi chú giải thích vì sao
  // khối đó bị gỡ, và giữ ghi chú đó có ích hơn là xoá sạch dấu vết. Nên bóc comment trước
  // khi kiểm, thay vì so cả file. (Phép grep tay của tôi lúc đầu báo "sạch" là do trỏ sai
  // đường `frontend/app.html` — file thật ở `frontend/pages/app.html` — nên đếm ra 0.)
  const noHtmlComments = HTML.replace(/<!--[\s\S]*?-->/g, "");
  const noCssComments = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const noJsComments = JS.split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  for (const id of ["sessDlg", "homeChecks", "renderHomeChecks", "gmSources", "insHealth", "gmHealth", "gmVector"]) {
    assert.ok(!noHtmlComments.includes(id), `${id} quay lại trong app.html (ngoài comment)`);
    assert.ok(!noCssComments.includes(id), `${id} quay lại trong app.css (ngoài comment)`);
    assert.ok(!noJsComments.includes(id), `${id} quay lại trong app.js (ngoài comment)`);
  }
  // Đối chứng: một id CÒN SỐNG phải bị phát hiện, nếu không thì phép bóc comment đã ăn quá
  // nhiều và test thành xanh giả.
  // Neo CHÍNH XÁC `id="gmStats"`, không phải chuỗi con "gmStats": đột biến đổi tên thành
  // `gmStatsX` vẫn chứa "gmStats" nên phép `includes` lỏng đã cho đột biến sống sót.
  assert.ok(noHtmlComments.includes('id="gmStats"'), 'đối chứng: id="gmStats" (còn sống) phải còn sau khi bóc comment');
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

// ============================ Cổng chặn CSRF của daemon ============================
// Guard cũ đã chặn Host lạ (DNS rebinding) và `Origin` lạ. Lỗ còn lại HẸP nhưng thật:
// trình duyệt KHÔNG gửi `Origin` cho GET subresource, nên `<img src="http://127.0.0.1:
// 4444/set-drive?path=…">` trên một trang bất kỳ vẫn chạy (ảnh hỏng, nhưng REQUEST đã
// gửi — CORS chặn ĐỌC kết quả chứ không chặn GỬI). Cổng 4444 cố định, có ghi trong README.
// Đo 2026-07-27: 24 endpoint đổi trạng thái, 14 trong đó đang nhận GET.
test("endpoint đổi trạng thái bắt buộc POST + chặn cross-site", () => {
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  assert.ok(/const MUTATING\s*=/.test(src), "phải có danh sách endpoint đổi trạng thái");
  assert.ok(/MUTATING\.test\([\s\S]{0,40}req\.method !== "POST"/.test(src), "không-POST vào endpoint đổi trạng thái phải bị chặn");
  // Guard loopback/cross-site dời sang `util/loopback.ts` (2026-08-02) để MCP-over-HTTP
  // dùng CHUNG một bản. Neo test đi theo code: kiểm luật ở nhà mới, VÀ kiểm ui.ts thật sự
  // gọi nó — thiếu vế sau thì gỡ guard khỏi ui.ts vẫn xanh.
  const guardSrc = readFileSync(new URL("../src/util/loopback.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  assert.ok(/sec-fetch-site/.test(guardSrc), "phải chặn cross-site bằng Sec-Fetch-Site (trình duyệt gửi cả cho <img>)");
  assert.ok(/LOOPBACK\s*=/.test(guardSrc), "phải có luật chỉ-loopback (chống DNS-rebinding)");
  assert.ok(/checkLoopback\(req\)/.test(src), "ui.ts phải THỰC SỰ gọi guard dùng chung, không chỉ import cho có");
  assert.ok(/405/.test(src), "sai method thì trả 405, không phải lặng lẽ bỏ qua");

  // Regex quá tay còn nguy hơn không có: bản đầu tôi viết `sync|migrate` trần và nó bắt
  // nhầm /sync-pulse + /sync-status — hai endpoint CHỈ ĐỌC mà UI gọi bằng GET liên tục.
  const m = src.match(/const MUTATING\s*=\s*([\s\S]*?);/);
  assert.ok(m, "đọc được biểu thức MUTATING");
  const re = new RegExp(m[1].trim().replace(/^\/|\/$/g, ""));
  for (const readOnly of ["/sync-pulse", "/sync-status", "/memory-status", "/code-graph", "/standard-spec"]) {
    assert.ok(!re.test(readOnly), `${readOnly} CHỈ ĐỌC — không được ép POST`);
  }
  for (const mut of ["/set-drive", "/memory-forget", "/drive-sync", "/relocate", "/prune-projects"]) {
    assert.ok(re.test(mut), `${mut} đổi trạng thái — phải ép POST`);
  }
});

// /init-fresh gỡ 2026-07-27 (audit F2): 0 người gọi, mà là thao tác DỜI docs cũ đi.
// Năng lực không mất — `zemory init --fresh` gọi thẳng freshHarness().
test("tìm kiếm trên daemon phải RẺ theo mặc định — lớp đắt chỉ khi được XIN", () => {
  // Đo 2026-08-02 trên kho thật: FTS 360ms · hybrid 20,5s · hybrid+rerank 63,6s. Cả ba từng
  // chạy ngay trên event loop của daemon, nên mỗi lần gõ Tìm là toàn bộ UI đứng hình
  // (`/memory-status` 4ms → 48s). Hai bất biến canh đúng chỗ đó:
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  //   ① daemon KHÔNG được cầm lối vào đắt tiền nữa — hybrid/rerank chạy ở tiến trình con.
  assert.ok(!/\brecall\s*\(/.test(src), "ui.ts gọi recall() = hybrid+rerank ngay trên event loop — đúng lỗi đã sửa");
  assert.ok(!/searchHybrid/.test(src), "ui.ts không được gọi thẳng searchHybrid");
  assert.match(src, /deepSearchChild\(/, "lớp sâu phải đi qua tiến trình con");
  //   ② mặc định phải do NGƯỜI GỌI quyết, không phải hằng số bật sẵn.
  assert.match(
    src,
    /const deep = u\.searchParams\.get\("deep"\) === "1"/,
    "cờ deep phải đọc từ request; ghim cứng là quay lại chạy lớp đắt cho mọi lần tìm",
  );
});

test("mọi phép QUÉT TOÀN BẢNG của dashboard phải nằm sau TTL dài, không rải trong payload", () => {
  // Đo 2026-08-13: `vectorCoverage()` ~1,4s · `vectorRemaining()` ~1,0s · `SUM(LENGTH(content))`
  // ~1,6s — cùng bậc, cùng kiểu "quét cả kho, số đổi rất chậm". Nhưng hai cái sau nằm trong
  // `heavyStats()` (TTL 300s) còn `vectorCoverage()` bị gọi THẲNG trong `dashboardMemory()`, tức
  // trả giá lại mỗi khi `dashCache` (60s) hết hạn. Một phép quét không được che, đứng lẫn giữa
  // những phép quét đã che — nhìn thì giống nhau, giá thì gấp năm lần số lượt.
  //
  // Vì sao là cổng chứ không phải lời dặn: thêm một aggregate mới vào payload là việc TỰ NHIÊN
  // và trông vô hại; không có gì trong mã nhắc rằng chỗ đúng của nó là `heavyStats()`. Lỗi này
  // đã xảy ra một lần đúng theo cách đó. Nó cũng KHÔNG bao giờ đỏ trong test thường: kết quả
  // vẫn đúng, chỉ chậm — đúng loại hỏng câm mà `02_RULES §Hành xử` bắt phải soi bằng máy.
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  const start = src.indexOf("function dashboardMemory(");
  assert.ok(start > 0, "không tìm thấy dashboardMemory()");
  const body = src.slice(start, src.indexOf("\n}", start));
  for (const scan of ["vectorCoverage(", "vectorCount(", "vectorRemaining("]) {
    assert.ok(
      !body.includes(scan),
      `dashboardMemory() gọi thẳng ${scan} — phép quét toàn bảng phải đi qua heavyStats() (TTL dài)`,
    );
  }
  const heavy = src.slice(src.indexOf("function heavyStats("));
  assert.match(heavy, /vectorCoverage\(/, "heavyStats() phải là nơi tính coverage");
});

test("đường LẠ phải 404 — không được rơi vào vỏ app rồi trả 200", () => {
  // Audit 2026-08-02 bắt được bằng chính phép quét của mình: gọi `/scope-tree` (KHÔNG tồn
  // tại — dữ liệu đó nằm trong `/memory-status`) và nhận **200 + HTML**, nên bảng kết quả
  // báo "TẤT CẢ 200" trong khi một mục là hư không. Với client thì tệ hơn: gõ sai tên
  // endpoint ⇒ nhận HTML ⇒ vỡ ở JSON.parse với thông báo chẳng liên quan.
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  const i = src.lastIndexOf('res.end(readFileSync(join(FRONTEND_DIR, "pages", "app.html")');
  assert.ok(i > 0, "không tìm thấy chỗ phục vụ vỏ app");
  const before = src.slice(Math.max(0, i - 700), i);
  assert.match(before, /p !== "\/" && p !== "\/app"/u, "phải chặn mọi path lạ TRƯỚC khi trả vỏ app");
  assert.match(before, /writeHead\(404/u, "đường lạ phải trả 404");
});

test("UI: có nút Tìm sâu, và nó là lựa chọn TỪNG LƯỢT chứ không lấy từ setting máy", () => {
  // Không có nút thì lớp ngữ nghĩa chỉ gọi được bằng URL — tính năng có mà người dùng không
  // với tới. Và nếu nó đọc setting máy (`hybrid` đang bật sẵn ở nhiều máy) thì mọi lượt tìm
  // lại rơi vào đường 20–60s — đúng thứ vừa sửa xong.
  assert.match(HTML, /id="rDeep"[^>]*data-rf="deep"/u, "màn Recall phải có chip Tìm sâu");
  const js = readAppJs();
  assert.match(js, /if\(deepOn\(\)\)p\+='&deep=1'/u, "chỉ gửi deep=1 khi người dùng bật chip");
  assert.match(js, /function deepOn\(\)\{var d=zid\('rDeep'\)/u, "trạng thái deep đọc từ CHIP, không từ Z.mem");
  assert.ok(
    !/deepOn[\s\S]{0,120}Z\.mem/u.test(js),
    "deep không được lấy từ setting máy — mặc định mỗi lần mở phải là lớp rẻ",
  );
  // Lượt sâu chậm ⇒ phải có nhãn chờ riêng, và lỗi phải nói ra chứ không hiện '0 kết quả'.
  // Đếm trong ĐÚNG hai khối từ điển: bản đầu của test này đếm cả file và ra 3 — vì chuỗi
  // trong biểu thức ba ngôi `deepOn()?'q.searchingDeep':'q.searching'` cũng khớp. Một phép
  // đếm bắt nhầm chỗ thì con số nó đưa ra vô nghĩa.
  const d = dicts();
  const vi = keysIn(d.vi);
  const en = keysIn(d.en);
  for (const key of ["q.searchingDeep", "q.deepErr", "f.deep", "f.deepTip"]) {
    assert.ok(vi.has(key), `${key}: thiếu bản VI`);
    assert.ok(en.has(key), `${key}: thiếu bản EN (đổi sang EN sẽ hiện key trần)`);
  }
});

test("/init-fresh không còn là endpoint HTTP", () => {
  const src = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/p === "\/init-fresh"/.test(src), "thao tác phá huỷ không nên mở trên HTTP khi không ai dùng");
});

// ============================ Giọng văn · chuẩn sản phẩm ============================
// User chốt 2026-07-28: UI là sản phẩm giao cho người dùng — KHÔNG dùng văn nói, dùng
// thuật ngữ chuẩn. Đo trên 861 chuỗi hiển thị hiện tại: **0 vi phạm**, nên đây là
// RATCHET chống tái phát chứ không phải bộ sửa.
//
// Tập luật đã lọc qua HAI vòng đo để báo oan bằng 0:
//   · Vòng 1 dùng `\b` của JS → `ngu` khớp trong "ngu·ồn" (27 ca oan), `ui` khớp trong
//     "UI language". JS coi ký tự có dấu là ranh giới từ ⇒ KHÔNG dùng `\b` cho tiếng Việt.
//   · Đã BỎ khỏi danh sách: `vs` (viết tắt kỹ thuật hợp lệ: "khai báo vs suy luận"),
//     `ok` (nhãn trạng thái chuẩn: "3/3 OK"), `ui` (acronym UI).
// Ranh giới từ dựng bằng TAY. KHÔNG dùng `\b`: JS coi ký tự có dấu là ranh giới nên
// `ngu` khớp trong "nguồn" (đo vòng 1: 27 ca oan). Cũng KHÔNG dùng cờ `/u` — nó bắt
// escape mọi `[` trong lớp ký tự và không đổi lại được gì ở đây.
const EDGE = "(?:^|[\\s,.;:!?()\\[\\]\"'…·—-])";
const EDGE_AHEAD = "(?=$|[\\s,.;:!?()\\[\\]\"'…·—-])";
const word = (...words) => new RegExp(EDGE + "(" + words.join("|") + ")" + EDGE_AHEAD, "i");

const TONE_RULES = [
  ["tiểu từ cuối câu (nhé/nha/ạ/đấy)", /(nhé|nha|nhá|ạ|đấy|hén|hen)\s*[.!?]?$/i],
  ["viết tắt kiểu chat (ko/dc/cx)", word("ko", "dc", "đc", "cx", "hok", "bik", "wa")],
  ["đại từ suồng sã (tui/tớ/mày/tao)", word("tui", "tớ", "mày", "tao", "má")],
  ["đánh giá cảm tính", /(vớ vẩn|tùm lum|bậy bạ|dở hơi|kinh khủng|thảm hoạ)/i],
  ["thán từ", word("ồ", "ê", "trời ơi", "ối", "chà")],
  ["diễn đạt mơ hồ", /(hình như|chắc là|có lẽ là|kiểu như|đại khái)/i],
];

/** Mọi chuỗi NGƯỜI DÙNG THẤY: cả hai từ điển + text mặc định của data-i18n trong HTML. */
function displayStrings() {
  const out = [];
  const at = JS.indexOf("var I18N={vi:{");
  const block = JS.slice(at, JS.indexOf("\n  }};", at));
  for (const m of block.matchAll(/'([a-zA-Z0-9_.]+)':'((?:[^'\\]|\\.)*)'/g)) out.push([m[1], m[2]]);
  for (const m of HTML.matchAll(/data-i18n(?:-ph|-title)?="([^"]+)"[^>]*>([^<]+)/g)) out.push(["html:" + m[1], m[2]]);
  return out;
}

test("chuỗi hiển thị dùng từ ngữ chuẩn sản phẩm, không văn nói", () => {
  const strings = displayStrings();
  assert.ok(strings.length > 300, `kỳ vọng nhiều chuỗi hiển thị, chỉ thấy ${strings.length}`);
  const bad = [];
  for (const [name, re] of TONE_RULES) {
    for (const [key, val] of strings) {
      if (re.test(val)) bad.push(`${name}  ·  ${key} → ${val.slice(0, 70)}`);
    }
  }
  assert.deepEqual(bad, [], "văn nói lọt vào giao diện — UI là sản phẩm giao, không phải ghi chú nội bộ");
});

// Ghi chú/lời bàn của dev KHÔNG được lọt ra giao diện. Đây là họ lỗi riêng: chuỗi có
// thể rất "chuẩn" về giọng nhưng vẫn là ghi chú nội bộ (TODO/FIXME/tên commit/số dòng).
test("chuỗi hiển thị không chứa ghi chú nội bộ của dev", () => {
  const bad = [];
  for (const [key, val] of displayStrings()) {
    // Biên ở CẢ HAI đầu. Chỉ đặt biên cuối thì `05_TODO.md` — tên file trong bản chuẩn —
    // bị báo oan (`_` là ký tự từ nên không có biên giữa `_` và `T`).
    if (/(?<![\w])(TODO|FIXME|HACK|XXX|WIP)(?![\w])/.test(val)) bad.push(`${key} → ${val.slice(0, 70)}`);
    if (/\b(mock|dummy|placeholder|lorem)\b/i.test(val)) bad.push(`${key} → ${val.slice(0, 70)}`);
  }
  assert.deepEqual(bad, [], "ghi chú dev lọt ra giao diện");
});

// Luật 4 của skill `audit toàn diện`: hỏi ngược mỗi check *"cái gì làm nó ĐỎ?"* — trả
// lời không được thì check đó không thể nổ, và một check không nổ được còn tệ hơn không
// có. Đây là câu trả lời, viết thành test.
test("bộ luật giọng văn NỔ được thật, và không nổ oan", () => {
  const fire = (s) => TONE_RULES.filter(([, re]) => re.test(s)).map(([n]) => n);

  // PHẢI bắt
  for (const bad of [
    "Đồng bộ xong nhé.",
    "Chưa dc đồng bộ",
    "tui đã quét xong",
    "Cái này vớ vẩn",
    "Hình như thiếu dữ liệu",
  ]) {
    assert.ok(fire(bad).length > 0, `phải bắt được văn nói: ${JSON.stringify(bad)}`);
  }

  // KHÔNG được bắt — đều là chữ hợp lệ đã gây báo oan ở vòng đo trước.
  for (const ok of [
    "Đồng bộ hoàn tất",
    "Sức khoẻ 3/3 OK",
    "khai báo vs suy luận", // `vs` là viết tắt kỹ thuật
    "UI language", // `ui` là acronym, không phải thán từ
    "Nguồn dữ liệu", // `ngu` nằm trong "nguồn"
    "05_TODO.md", // tên file trong bản chuẩn
    "Máy này", // `má` nằm trong "máy"
  ]) {
    assert.deepEqual(fire(ok), [], `báo oan trên chữ hợp lệ: ${JSON.stringify(ok)}`);
  }
});

// ---- Ảnh đính kèm: MỘT bộ vẽ message cho cả hai bề mặt ----
//
// user 2026-07-28: "giao diện của phiên nó khác bên tìm". Gốc: ô Xem trước dán thẳng
// text đã escape nên còn nguyên dòng nhãn `[image:…]` cạnh thumbnail và gọi output tool
// là "user", trong khi tab Phiên đi qua msgHtml() nên sạch. Hai bộ vẽ thì chắc chắn lệch.
// Test dưới đây CHẠY THẬT hàm trích từ file đang ship (không chép lại logic — đó đúng là
// cái bẫy "test neo vào file chết" đã dính một lần).

/** Trích các hàm thuần từ app.js rồi dựng lại trong sandbox với stub tối thiểu. */
function renderer() {
  const grab = (name) => {
    const at = JS.indexOf(`function ${name}(`);
    assert.ok(at >= 0, `không tìm thấy hàm ${name} trong app.js`);
    let i = JS.indexOf("{", at), depth = 0;
    for (let j = i; j < JS.length; j++) {
      if (JS[j] === "{") depth++;
      else if (JS[j] === "}") { depth--; if (!depth) return JS.slice(at, j + 1); }
    }
    throw new Error(`ngoặc không cân ở ${name}`);
  };
  const src = [
    "var IMG_LABEL=" + JS.slice(JS.indexOf("var IMG_LABEL=") + 14, JS.indexOf("\n", JS.indexOf("var IMG_LABEL="))),
    grab("stdEsc"), grab("attSize"), grab("attHtml"), grab("foldSize"), grab("fold"),
    grab("msgHtml"), grab("msgRole"), grab("msgBlock"),
    "return { msgBlock: msgBlock, msgHtml: msgHtml };",
  ].join("\n");
  return new Function("t", src)((k) => k);
}

test("cả tab Phiên lẫn ô Xem trước cùng gọi msgBlock (một bộ vẽ, không hai)", () => {
  // `return msgBlock(…)` = chỗ GỌI; loại trừ dòng `function msgBlock(m,cap){` (định nghĩa).
  const calls = JS.match(/return msgBlock\(m,/g) ?? [];
  assert.equal(calls.length, 2, "phải đúng hai chỗ gọi: thread phiên + ô Xem trước");
  assert.equal((JS.match(/function msgBlock\(/g) ?? []).length, 1, "chỉ được có MỘT định nghĩa");
  assert.ok(!/stdEsc\(String\(m\.content\|\|''\)\.slice/.test(JS), "ô Xem trước không được dán text thô nữa");
});

test("msgBlock bỏ dòng nhãn [image:…] và vẽ thumbnail — giống nhau ở cả hai bề mặt", () => {
  const { msgBlock } = renderer();
  const sha = "d3c228ec003af0c2572c15db36bf52132131d679b5ef0b73cb575345539e1b65";
  const msg = {
    id: 1839800, role: "user", timestamp: "2026-07-22T23:25:00Z",
    content: `[image:image/png 73KB ${sha.slice(0, 12)}]\ngateway này để làm gì`,
    atts: [{ id: 50, sha256: sha, mime: "image/png", bytes: 74670, kind: "blob", name: null }],
  };
  const full = msgBlock(msg, 0);          // tab Phiên
  const capped = msgBlock(msg, 390);      // ô Xem trước
  for (const [label, html] of [["phiên", full], ["xem trước", capped]]) {
    assert.ok(!html.includes("[image:"), `${label}: nhãn phải bị bỏ, không hiện cùng thumbnail`);
    assert.ok(html.includes(`/attachment?sha=${sha}`), `${label}: phải có thumbnail`);
    assert.ok(html.includes("gateway này để làm gì"), `${label}: phần chữ phải còn`);
  }
});

test("msgBlock gọi output tool là 'tool' ở CẢ hai bề mặt (không dán nhãn 'user')", () => {
  const { msgBlock } = renderer();
  const m = { id: 1, role: "user", timestamp: "2026-07-22T23:25:00Z", content: "[tool_result]\nx".repeat(1) };
  assert.ok(msgBlock(m, 0).includes('data-role="tool"'));
  assert.ok(msgBlock(m, 390).includes('data-role="tool"'));
});

test("ảnh không có bytes (kind='ref') thì nói rõ, KHÔNG dựng khung ảnh vỡ", () => {
  const { msgBlock } = renderer();
  const m = { id: 2, role: "user", content: "x", atts: [{ sha256: "a".repeat(64), mime: "image/*", bytes: 2048, kind: "ref" }] };
  const html = msgBlock(m, 0);
  assert.ok(html.includes("att noimg"), "phải rơi vào nhánh 'chỉ ghi nhận'");
  assert.ok(!html.includes("<img"), "không được dựng thẻ ảnh cho thứ không có nội dung");
});

// ---- Tab Phiên: thanh lọc đối xứng với tab Tìm kiếm (user chốt 2026-07-28, bản B) ----

test("tab Phiên có đủ thanh lọc: chip Có ảnh + 4 select + ô đếm", () => {
  const at = HTML.indexOf('<div class="sub" data-rc="sess">');
  assert.ok(at > 0, "phải tìm được sub-tab Phiên");
  const block = HTML.slice(at, HTML.indexOf("</section>", at));
  for (const id of ["sImg", "fSTime", "fSOrigin", "fSAgent", "fSHost", "sCount", "sessSearch"]) {
    assert.ok(block.includes(`id="${id}"`), `thiếu ${id} trong tab Phiên`);
  }
  // Hybrid/Rerank là công tắc của BỘ MÁY TÌM — không được lẻn sang danh sách phiên.
  assert.ok(!block.includes('data-rf="hybrid"') && !block.includes('data-rf="rerank"'),
    "Hybrid/Rerank vô nghĩa với danh sách phiên, không được sao chép sang");
});

test("select của tab Phiên mang class .ssel — đổi bộ lọc phiên KHÔNG được bắn recall", () => {
  assert.equal((HTML.match(/class="rsel ssel"/g) ?? []).length, 4, "cả 4 select phiên phải có .ssel");
  assert.ok(/classList\.contains\('ssel'\)\)loadSessions\(\)/.test(JS.replace(/\s+/g, "")) ||
    /contains\('ssel'\)/.test(JS), "handler change phải tách nhánh .ssel trước .rsel");
});

test("bộ lọc phiên đi xuống SERVER (không lọc trên 120 phiên đã tải)", () => {
  assert.ok(/function sessParams\(\)/.test(JS), "phải có sessParams()");
  for (const key of ["&q=", "&days=", "&origin=", "&agent=", "&host=", "&withAtt=1"]) {
    assert.ok(JS.includes(key), `sessParams thiếu tham số ${key}`);
  }
  assert.ok(/\/sessions\?limit=120&fresh=1'\+sessParams\(\)/.test(JS), "loadSessions phải gửi kèm bộ lọc");
  // Bản cũ lọc bằng Array.filter trên svList — nếu quay lại thì con số hiện ra là số dối.
  assert.ok(!/svList\.filter\(function\(s\)\{return !q/.test(JS), "không được quay lại lọc phía client");
});

test("nhãn [image:…] bị bỏ ĐÚNG MỘT chỗ, và bỏ TRƯỚC khi cắt (không để lọt nhãn đứt nửa)", () => {
  // Đột biến 2026-07-28: gỡ việc bỏ nhãn khỏi msgBlock mà gate VẪN XANH, vì msgHtml có
  // một bản sao gánh thay. Hai bản sao không chỉ thừa — chúng che mất lỗi, và bản ở
  // msgHtml chạy SAU khi chuỗi đã bị cắt nên không cứu được nhãn đứt nửa.
  assert.equal((JS.match(/IMG_LABEL\.test/g) ?? []).length, 1, "chỉ được có MỘT chỗ bỏ nhãn");

  const { msgBlock } = renderer();
  const sha = "a".repeat(64);
  const label = `[image:image/png 73KB ${sha.slice(0, 12)}]`;
  const m = {
    id: 7, role: "user", timestamp: "2026-07-28T02:00:00Z",
    content: `${label}\nphần chữ đứng sau nhãn`,
    atts: [{ id: 1, sha256: sha, mime: "image/png", bytes: 74670, kind: "blob", name: null }],
  };
  // cap NGẮN hơn độ dài nhãn: nếu bỏ nhãn sau khi cắt thì mảnh "[image:image/p" sẽ lọt ra.
  const html = msgBlock(m, 12);
  assert.ok(!html.includes("[image:"), `nhãn (kể cả mảnh) không được lọt ra: ${html.slice(0, 120)}`);
});
