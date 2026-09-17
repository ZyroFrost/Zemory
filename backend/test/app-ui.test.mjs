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
import { readFileSync, readdirSync } from "node:fs";
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

test("app.js parses (catches a backtick or comment that breaks a literal)", () => {
  // new Function biên dịch mà không chạy — lỗi cú pháp ném ra ở đây.
  assert.doesNotThrow(() => new Function(JS), "app.js phải hợp lệ về cú pháp");
});

test("app.css brackets balance - one stray bracket swallows the whole stylesheet", () => {
  const noComments = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const opens = (noComments.match(/\(/g) || []).length;
  const closes = (noComments.match(/\)/g) || []).length;
  assert.equal(opens, closes, `CSS lệch ngoặc (${opens} mở / ${closes} đóng) — một giá trị hàm bị vỡ`);
  const bad = noComments.split("\n")
    .filter((ln) => (ln.match(/\(/g) || []).length !== (ln.match(/\)/g) || []).length)
    .map((l) => l.trim().slice(0, 60));
  assert.deepEqual(bad, [], "một dòng CSS lệch ngoặc");
});

test("no token defines itself (a cycle fails silently)", () => {
  const selfRefs = [];
  for (const m of CSS.matchAll(/(--[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/g)) {
    if (m[1] === m[2]) selfRefs.push(m[1]);
  }
  assert.deepEqual(selfRefs, [], "các token này định nghĩa bằng chính nó → vô hiệu");
});

// ============================ i18n · hai thứ tiếng phải ngang nhau ============================

test("every data-i18n key in the HTML exists in BOTH dictionaries", () => {
  const used = new Set();
  for (const m of HTML.matchAll(/data-i18n(?:-ph|-title)?="([^"]+)"/g)) used.add(m[1]);
  assert.ok(used.size > 50, `kỳ vọng nhiều key data-i18n, chỉ thấy ${used.size}`);
  const { vi, en } = dicts();
  const missVi = [...used].filter((k) => !vi.includes("'" + k + "':")).sort();
  const missEn = [...used].filter((k) => !en.includes("'" + k + "':")).sort();
  assert.deepEqual(missVi, [], "key data-i18n thiếu bản VI");
  assert.deepEqual(missEn, [], "key data-i18n thiếu bản EN (đổi sang EN sẽ hiện key trần)");
});

test("every t('key') in the JS exists in BOTH dictionaries", () => {
  const used = new Set();
  for (const m of JS.matchAll(/\bt\((['"])([a-zA-Z0-9_.]+)\1\)/g)) used.add(m[2]);
  assert.ok(used.size > 20, `kỳ vọng nhiều key t(), chỉ thấy ${used.size}`);
  const { vi, en } = dicts();
  const missVi = [...used].filter((k) => !vi.includes("'" + k + "':")).sort();
  const missEn = [...used].filter((k) => !en.includes("'" + k + "':")).sort();
  assert.deepEqual(missVi, [], "key t() thiếu bản VI");
  assert.deepEqual(missEn, [], "key t() thiếu bản EN");
});

test("both dictionaries hold the SAME key set (neither side carries dead keys)", () => {
  const { vi, en } = dicts();
  const kv = keysIn(vi);
  const ke = keysIn(en);
  const onlyVi = [...kv].filter((k) => !ke.has(k)).sort();
  const onlyEn = [...ke].filter((k) => !kv.has(k)).sort();
  assert.deepEqual(onlyEn, [], "key chỉ có ở EN — VI sẽ rơi về key trần");
  assert.deepEqual(onlyVi, [], "key chỉ có ở VI — EN sẽ rơi về tiếng Việt giữa giao diện Anh");
});

test("UI copy must not be written in a chatty voice", () => {
  // User chốt 2026-09-11 sau khi thấy nút `＋ tài khoản nữa`: *"t đã ghi luật là ko có văn nói
  // trong app rồi"*. Đối chiếu thì luật `02_RULES:36` chỉ phủ **harness docs** ("Hiến pháp, rules,
  // structure và plan"), KHÔNG phủ UI — chữ của app lọt qua đúng khe đó. Quét 633 khoá ×2 dict:
  // 5 chuỗi dính (`＋ tài khoản nữa` · `cho nó tự đẩy` · `BỎ luôn bước sweep` · `kiểu mục ruỗng` ·
  // `mỗi repo một kiểu`).
  //
  // 🔴 Danh sách CỐ Ý HẸP, và đó là phần khó. `luôn`(=always) · `nữa`(=anymore) là tiếng Việt
  // VIẾT hoàn toàn đúng — đo được 3 chuỗi hợp lệ dùng chúng. Bắt theo từ đơn là báo oan, mà một
  // cổng báo oan thì sớm muộn bị tắt. Nên chỉ bắt CỤM không có cách đọc trang trọng nào.
  const BANNED = [
    ["＋ tài khoản nữa", "nhãn nút phải là mệnh lệnh ngắn: '＋ Thêm tài khoản'"],
    ["cho nó tự", "đại từ phiếm — gọi thẳng tên chủ thể (zemory · daemon)"],
    ["BỎ luôn", "'luôn' ở đây là trợ từ nhấn giọng nói, bỏ đi không mất nghĩa"],
    ["— kiểu ", "'kiểu' nghĩa 'đại loại như' — dùng 'loại' hoặc 'tức là'"],
    ["một kiểu.", "'mỗi nơi một kiểu' là khẩu ngữ — dùng 'một cách'"],
    [" nhé", ""], [" nha.", ""], [" nhỉ", ""], ["mấy cái ", ""], ["cứ thế ", ""],
  ];
  const { vi } = dicts();
  const hit = BANNED.filter(([p]) => vi.includes(p)).map(([p, why]) => `"${p}"${why ? " — " + why : ""}`);
  assert.deepEqual(hit, [], `từ điển VI còn giọng nói:\n  ${hit.join("\n  ")}`);
  // Vế NGƯỢC: ba chuỗi dùng `luôn`/`nữa` ĐÚNG phải còn nguyên. Không có neo này thì một lượt
  // "dọn cho sạch" sau sẽ cắt chúng và làm hỏng tiếng Việt đúng — cổng phải chặn cả hai chiều.
  for (const keep of ["Một lượt luôn là", "danh sách chọn nữa", "tất định, luôn đúng"]) {
    assert.ok(vi.includes(keep), `chuỗi tiếng Việt ĐÚNG bị cắt oan: "${keep}"`);
  }
});

test("Add source dialog: full platform names - no platform listed twice - identity read from the CHILD row", () => {
  // Ba lỗi đo trên app thật 2026-09-11, đều sinh từ đợt thêm Gemini/Copilot hôm 10/09:
  // hàng hiện khoá thô `gemini`/`copilot` · một dòng hardcode "Gemini — chưa hỗ trợ" còn sót nên
  // Gemini bày HAI lần với hai câu ngược nhau · và "chưa nối" in cho ba nền đang nối tốt.
  const src = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const name = /var NAME=\{([^}]*)\}/.exec(src);
  assert.ok(name, "phải có bảng tên nền");
  for (const p of ["chatgpt", "claude", "gemini", "copilot"]) {
    assert.match(name[1], new RegExp(`${p}:`), `thiếu tên bày ra cho '${p}' ⇒ hàng hiện khoá thô`);
  }
  assert.doesNotMatch(src, /addSoon/, "dòng 'chưa hỗ trợ' phải chết cùng lúc thứ nó hứa ra đời");
  assert.equal((JS.match(/'src\.addSoon':/g) ?? []).length, 0, "khoá i18n mồ côi phải gỡ khỏi CẢ HAI dict");
  // `who` không sống qua `aggregateConn` ⇒ phải lấy từ hàng con, nếu không "chưa nối" in đè lên
  // một tài khoản đang nối — ngay cạnh nút mời thêm tài khoản.
  assert.match(src, /\(n\.children\|\|\[\]\)\.forEach\(function\(kid\)/, "danh tính phải đọc từ hàng TÀI KHOẢN, không từ hàng nguồn đã gộp");
});

test("the 9 removed i18n keys must NOT come back (orphans from the nav merge)", () => {
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

test("the 7 removed UI blocks must NOT be reborn (nav 9 to 6, duplicates killed)", () => {
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

test("light theme is complete: every colour goes through a token, no literal left", () => {
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

test("every COLOUR token is declared in BOTH :root and the light block", () => {
  // Biến BỐ CỤC của thanh kéo (`--<khoá data-seam>`) KHÔNG phải token màu: nó mang một số px do
  // người dùng kéo ra, mặc định nằm ngay trong `var(--x, mặc-định)`, và khai nó ở `:root` là đóng
  // băng đúng thứ phải kéo được. Loại theo chính `data-seam` đã khai nên danh sách tự đúng khi
  // thêm seam mới — không phải một danh sách trắng gõ tay rồi quên (2026-09-17).
  const seamVars = new Set([...HTML.matchAll(/data-seam="([a-z0-9]+)"/g)].map((m) => "--" + m[1]));
  const used = new Set([...CSS.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]).filter((v) => !seamVars.has(v)));
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

test("the nav holds exactly 7 screens, and each nav item has exactly one <section class=screen>", () => {
  const nav = HTML.slice(HTML.indexOf('<nav class="nav"'), HTML.indexOf("</nav>"));
  const navKeys = [...nav.matchAll(/data-s="([a-z]+)"/g)].map((m) => m[1]);
  // 9 màn (nhiều chỗ trùng) → 5, rồi tách "Tính năng & Kiểm tra" ra lại thành mục nav
  // riêng (user 2026-07-27): Home vốn đã là chỗ tổng hợp nhiều bảng, một tab nhỏ bên
  // trong thì không ai nhận ra nó tồn tại — và nó khác việc (chẩn đoán ≠ liếc nhanh).
  // Lý do gộp ban đầu là hai danh sách check trùng nhau, cái đó đã xử bằng cách xoá bản
  // trùng; việc đó KHÔNG đòi phải gộp luôn màn.
  // +`sync` 2026-09-16 (user chốt: *"chức năng sync này giờ lớn quá, t nghĩ nên phân thành 1 trang
  // chính thức ko để trong setting nữa"*). Nó đứng TRƯỚC `system` vì là chỗ làm việc, còn `system`
  // là màn chẩn đoán thỉnh thoảng mới vào.
  assert.deepEqual(navKeys, ["home", "recall", "projects", "gmem", "sync", "harness", "system"], "IA 7 màn");
  // `class="screen on"` cho màn đang mở — khớp cả hai dạng, đừng neo cứng "screen".
  const screens = [...HTML.matchAll(/<section class="screen[^"]*"[^>]*data-s="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...navKeys].sort(), [...screens].sort(), "mỗi mục nav phải có đúng một màn, và ngược lại");
});

test("each sub-tab button has exactly one matching .sub block (no dead button, no orphan block)", () => {
  // "hm" đã biến mất cùng lúc Home hết sub-tab — nhóm rỗng phải bị loại khỏi danh sách,
  // nếu không test sẽ đòi ≥2 nút cho một nhóm không còn tồn tại.
  // "pt" gỡ 2026-09-16 cùng lý do: khối "Tài liệu dự án" bỏ hẳn ⇒ chi tiết dự án chỉ còn Graph
  // ⇒ không còn nhóm sub-tab nào ở đó. Cổng này ĐÃ BẮT đúng lúc cắt (1 nút < 2), giữ nguyên luật.
  for (const group of ["rc", "gm", "ht"]) {
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

test("no id is declared twice (a block was moved and the old copy was left behind)", () => {
  const seen = new Map();
  for (const m of HTML.matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  assert.deepEqual(dupes, [], "id trùng — el(id) sẽ bắt nhầm phần tử và nửa UI ngừng phản hồi");
});

test("every data-seam has a matching CSS variable driving layout (S5: dragging really changes it)", () => {
  const seams = [...HTML.matchAll(/data-seam="([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(seams.length >= 6, `kỳ vọng nhiều đường kéo, chỉ thấy ${seams.length}`);
  const dead = seams.filter((k) => !HTML.includes(`var(--${k}`) && !CSS.includes(`var(--${k}`));
  assert.deepEqual(dead, [], "đường kéo trang trí — kéo không đổi gì vì không biến nào nhận giá trị");
  // MỘT engine duy nhất, dữ liệu hoá qua data-seam — không phải nhánh-theo-loại.
  assert.ok(/function initSeams\(\)/.test(JS), "mọi seam đi qua một initSeams() duy nhất");
});

// ============================ Hành vi đã trả giá để học ============================

test("no inline onclick - markup is built from data-act plus a delegated listener", () => {
  const offenders = JS.split("\n").filter((line) => /['"][^'"]*onclick=/.test(line));
  assert.deepEqual(offenders.map((l) => l.trim().slice(0, 60)), [], "dùng data-act + delegated listener");
});

test("no browser prompt()/confirm() - every dialog is an in-app dialog", () => {
  const code = JS.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\bwindow\.(prompt|confirm)\s*\(/.test(code), "window.prompt/confirm bị cấm");
  assert.ok(!/(^|[^.\w])(prompt|confirm)\s*\(/m.test(code.replace(/\bzConfirm\s*\(/g, "")), "prompt()/confirm() trần bị cấm");
  assert.ok(/function zDialog\(/.test(JS) && /function zConfirm\(/.test(JS), "phải có dialog thay thế trong app");
});

test("ESC closes the dialog through one global keydown", () => {
  assert.ok(/addEventListener\('keydown'[\s\S]{0,200}Escape/.test(JS), "phải có handler Escape toàn cục");
  assert.ok(/\.dlg-back\.on/.test(JS), "ESC đóng theo lớp .dlg-back.on — một sổ đăng ký duy nhất");
});

test("no short-interval polling that aggregates the whole DB", () => {
  // Bản cũ poll một aggregate ~4s bằng interval 2.5s. UI mới KHÔNG poll gì cả;
  // nếu sau này thêm lại, interval phải ≥ 15s.
  for (const m of JS.matchAll(/setInterval\([\s\S]{0,120}?,\s*(\d+)\s*\)/g)) {
    assert.ok(Number(m[1]) >= 15000, `interval ${m[1]}ms quá ngắn cho một truy vấn tổng hợp`);
  }
});

// HP điều 12: cấm hiện con số phản-thực "tiết kiệm N token" — không đo được (không
// biết agent LẼ RA đã tốn bao nhiêu). Chỉ được hiện đại lượng đo thật.
test("nowhere claims 'token savings' (constitution 12 - counterfactual numbers)", () => {
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

test("graph: scroll to zoom, drag the background to pan, drag a node, double-click to reset", () => {
  assert.ok(/addEventListener\('wheel'/.test(JS), "phải có handler wheel");
  assert.ok(/pointerdown/.test(JS) && /pointermove/.test(JS), "phải có handler kéo");
  assert.ok(/gMoveNode/.test(JS), "kéo node dời cả vòng tròn, nhãn và cạnh chạm nó");
  assert.ok(/gSuppressClick/.test(JS), "kéo xong không được kích hoạt click chọn node");
  assert.ok(/dblclick/.test(JS), "nháy đúp reset khung nhìn");
});

// Bấm node PHẢI nhảy tới đúng dòng trong cây thư mục (user báo 2026-07-25). Lần sửa
// đầu tôi suy luận mà không đo nên sửa trượt: thủ phạm là setPointerCapture đổi đích
// của sự kiện `click`, nên việc chọn node phải nằm ở `pointerup`, không phải `click`.
test("clicking a graph node jumps to the right line in the tree, and selection happens on pointerup", () => {
  assert.ok(/function gRevealTreeFile\(/.test(JS), "phải có gRevealTreeFile để cuộn cây tới file");
  const at = JS.indexOf("function gRevealTreeFile(");
  // Lột comment: lời bàn VỀ lỗi không được đọc thành chính lỗi (chính hàm này có một
  // comment giải thích vì sao KHÔNG dùng scrollIntoView).
  const fn = JS.slice(at, at + 1800).replace(/\/\/[^\n]*/g, "");
  assert.ok(/scrollTop/.test(fn), "cuộn BÊN TRONG khung cây bằng scrollTop — scrollIntoView sẽ cuộn cả trang");
  assert.ok(!/scrollIntoView/.test(fn), "không dùng scrollIntoView (kéo lệch cả trang)");
  assert.ok(/pointerup[\s\S]{0,400}gSelectNode/.test(JS), "chọn node phải xảy ra ở pointerup (setPointerCapture đổi đích của click)");
});

test("graph: marquee select + drag the group + undo", () => {
  assert.ok(/function gSelectInRect\(/.test(JS), "bôi chọn theo khung (marquee)");
  assert.ok(/gSelIds/.test(JS) && /function gPaintSel\(/.test(JS), "một nguồn sự thật cho tập đang chọn + hàm tô lại");
  assert.ok(/function gDeselectAll\(/.test(JS), "bỏ chọn tất cả");
  assert.ok(/moves\s*:/.test(JS), "kéo nhóm ghi một mục hoàn tác gộp {moves:[…]}");
});

// ============================ Chart · yêu cầu chốt của user ============================

test("Global Memory: exactly 4 charts, no more and no fewer", () => {
  const grid = HTML.slice(HTML.indexOf('class="grid g2 grow chart-grid"'));
  const block = grid.slice(0, grid.indexOf("</div>\n\n        </div>"));
  const ids = [...block.matchAll(/id="(ins[A-Za-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["insProjects", "insAgents", "insDaily", "insGrowth"], "lưới 2×2 đúng 4 bảng (user chốt 2026-07-26)");
  // ĐẾM CỘT, không chỉ đếm thẻ. Ca này từng xanh suốt trong khi lưới đã thành 1×4: `auto-fit` bỏ
  // trần cột nên khung rộng nhét cả bốn vào một hàng (user 2026-09-17). Đếm thẻ không thấy được
  // hình dạng — phải soi đúng thứ quyết định hình dạng.
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  const g2 = /\n\.g2\{grid-template-columns:([^}]*)\}/.exec(css);
  assert.ok(g2, "không tìm thấy luật .g2");
  assert.doesNotMatch(g2[1], /auto-fit|auto-fill/, "auto-fit không chặn trên ⇒ 2×2 thành 1×4 khi khung rộng");
  assert.match(g2[1], /repeat\(2,/, "phải là ĐÚNG hai cột");
  // …và vẫn phải co được, nếu không thì trần cột đổi lại thành thanh cuộn ngang (§F12).
  assert.match(g2[1], /minmax\(0,\s*1fr\)/, "ô phải co dưới nội dung tối thiểu, nếu không lưới rộng hơn khung");
  assert.match(css, /@media \(max-width:820px\)\{\.g2\{grid-template-columns:minmax\(0,1fr\)\}\}/, "hẹp quá phải xuống một cột");
});

test("a time-series chart MUST have a time axis", () => {
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
test("the session viewer shows full text and only folds bulky blocks", () => {
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

test("a message prefixed [tool_result] shows the TOOL role, not USER", () => {
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
test("serveFrontend/serveBinary read the file BEFORE writing the 200 header (otherwise it hangs, not 404s)", () => {
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
test("Sources shows +N from the latest scan and keeps it across unchanged renders", () => {
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
test("state-changing endpoints require POST and block cross-site calls", () => {
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
test("search on the daemon must be CHEAP by default - the expensive layer only on request", () => {
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

test("every FULL-TABLE scan of the dashboard must sit behind a long TTL, not be spread across the payload", () => {
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
  // 2026-08-23: bốn phép quét này DỜI HẲN sang tiến trình con (`statsjob.heavyStatsChild`) — đo
  // được lượt LẠNH **16,7 giây** mà better-sqlite3 chạy đồng bộ, tức 16,7 giây daemon đứng hình.
  // Bất biến KHÔNG đổi (quét toàn bảng không được nằm trên đường payload), chỉ đổi CHỖ ĐÚNG của
  // chúng: trước là `heavyStats()`, nay là tiến trình con. Neo test phải đi theo bản viết lại —
  // để nguyên neo cũ thì cổng soi một cái tên đã chết.
  assert.match(src, /heavyStatsChild\(/, "phép quét nặng phải đi qua TIẾN TRÌNH CON, không chạy trên event loop");
  assert.match(
    src,
    /const heavy = await heavyStatsAsync\(\)/,
    "dashboardMemory phải LẤY số qua lớp bất đồng bộ; gọi bản đồng bộ là khoá lại event loop",
  );
  // Bản đồng bộ GIỮ LẠI có chủ đích làm đường lui khi con hỏng (fail-open, HP điều 9) — nhưng
  // nó chỉ được dùng ở nhánh lui đó, không được quay lại đường chính.
  const asyncFn = src.slice(src.indexOf("async function heavyStatsAsync("));
  assert.match(asyncFn.slice(0, asyncFn.indexOf("\n}")), /heavyStatsSync\(\)/, "phải có đường lui khi tiến trình con hỏng");
});

test("the health chip on the rail must be CLICKABLE and must NAME what it is warning about", () => {
  // User báo 2026-08-15: *"nó đâu có hiện đủ thông tin, bấm cũng ko trỏ vào đúng trang"*. Đo lại:
  // `.status-chip` là `<div>` thuần, và grep toàn frontend chỉ thấy MỘT chỗ chạm tới nó —
  // `setHealthChip()` ghi text. Không một handler click nào ⇒ bấm không đi đâu cả. Dòng phụ thì
  // luôn là câu chung "needs attention", không nói tính năng nào vàng, nên vẫn phải vào Features
  // dò 14 dòng.
  //
  // Một chip báo động mà không nói động ở đâu và không dẫn tới đó thì chỉ tạo lo lắng. Hai vế
  // dưới đây là thứ làm nó có ích; cả hai đều hỏng IM LẶNG (không lỗi, không đỏ) nên phải có cổng.
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const chip = /<div class="status-chip"[^>]*>/.exec(html);
  assert.ok(chip, "không tìm thấy .status-chip");
  assert.match(
    chip[0],
    /data-nav="system"/u,
    "chip phải mang data-nav='system' — dùng lại cơ chế nav sẵn có, bấm là sang Features",
  );

  const src = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.match(src, /warnNames\.push\(/u, "phải thu TÊN tính năng cảnh báo, không chỉ đếm số");
  assert.match(src, /setHealthChip\(okN,warnN,tot,warnNames\)/u, "tên phải được truyền xuống chip");
  assert.match(src, /names\[0\]/u, "dòng phụ của chip phải hiện tên, không phải câu chung");
});

test("an unknown path must 404 - it must not fall into the app shell and return 200", () => {
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

test("UI: there is a Deep search button, and it is a PER-RUN choice rather than a machine setting", () => {
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

test("/init-fresh is no longer an HTTP endpoint", () => {
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

test("display strings use the product's standard wording, not chatty phrasing", () => {
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
test("display strings carry no internal developer notes", () => {
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
test("the voice rule set can really go RED, and does not fire falsely", () => {
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

test("both the Sessions tab and the Preview pane call msgBlock (one renderer, not two)", () => {
  // `return msgBlock(…)` = chỗ GỌI; loại trừ dòng `function msgBlock(m,cap){` (định nghĩa).
  const calls = JS.match(/return msgBlock\(m,/g) ?? [];
  assert.equal(calls.length, 2, "phải đúng hai chỗ gọi: thread phiên + ô Xem trước");
  assert.equal((JS.match(/function msgBlock\(/g) ?? []).length, 1, "chỉ được có MỘT định nghĩa");
  assert.ok(!/stdEsc\(String\(m\.content\|\|''\)\.slice/.test(JS), "ô Xem trước không được dán text thô nữa");
});

test("msgBlock drops the [image:...] label line and draws a thumbnail - identical on both surfaces", () => {
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

test("msgBlock labels tool output as 'tool' on BOTH surfaces (never as 'user')", () => {
  const { msgBlock } = renderer();
  const m = { id: 1, role: "user", timestamp: "2026-07-22T23:25:00Z", content: "[tool_result]\nx".repeat(1) };
  assert.ok(msgBlock(m, 0).includes('data-role="tool"'));
  assert.ok(msgBlock(m, 390).includes('data-role="tool"'));
});

test("an image with no bytes (kind='ref') says so instead of drawing a broken image frame", () => {
  const { msgBlock } = renderer();
  const m = { id: 2, role: "user", content: "x", atts: [{ sha256: "a".repeat(64), mime: "image/*", bytes: 2048, kind: "ref" }] };
  const html = msgBlock(m, 0);
  assert.ok(html.includes("att noimg"), "phải rơi vào nhánh 'chỉ ghi nhận'");
  assert.ok(!html.includes("<img"), "không được dựng thẻ ảnh cho thứ không có nội dung");
});

// ---- Tab Phiên: thanh lọc đối xứng với tab Tìm kiếm (user chốt 2026-07-28, bản B) ----

test("the Sessions tab has the full filter bar: Has image chip + 4 selects + the count box", () => {
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

test("the Sessions tab selects carry class .ssel - changing a session filter must NOT fire recall", () => {
  assert.equal((HTML.match(/class="rsel ssel"/g) ?? []).length, 4, "cả 4 select phiên phải có .ssel");
  assert.ok(/classList\.contains\('ssel'\)\)loadSessions\(\)/.test(JS.replace(/\s+/g, "")) ||
    /contains\('ssel'\)/.test(JS), "handler change phải tách nhánh .ssel trước .rsel");
});

test("session filters go down to the SERVER (not filtering the 120 already-loaded sessions)", () => {
  assert.ok(/function sessParams\(\)/.test(JS), "phải có sessParams()");
  for (const key of ["&q=", "&days=", "&origin=", "&agent=", "&host=", "&withAtt=1"]) {
    assert.ok(JS.includes(key), `sessParams thiếu tham số ${key}`);
  }
  assert.ok(/\/sessions\?limit=120&fresh=1'\+sessParams\(\)/.test(JS), "loadSessions phải gửi kèm bộ lọc");
  // Bản cũ lọc bằng Array.filter trên svList — nếu quay lại thì con số hiện ra là số dối.
  assert.ok(!/svList\.filter\(function\(s\)\{return !q/.test(JS), "không được quay lại lọc phía client");
});

test("the [image:...] label is stripped in EXACTLY ONE place, and stripped BEFORE truncation (no half label leaks)", () => {
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

test("the Healthy pill must light up BY ITSELF on open - the user must not be made to click Recheck (2026-08-21)", () => {
  // Bệnh đo được: zboot xếp refreshChecks() SAU /status → /memory-status, mà lượt LẠNH của
  // memory-status đo >30s khi máy bận ⇒ 3 pill check treo "…" nhìn như TẮT, user đi bấm
  // Recheck tay. Ba bất biến dưới hỏng cái nào cũng IM LẶNG (không lỗi, không đỏ) nên phải neo.
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  // ① refreshChecks() phải được gọi TRƯỚC chuỗi /status→/memory-status (song song, không xếp hàng)
  const iChecks = chrome.indexOf("refreshChecks();");
  const iStatus = chrome.indexOf("zGet('/status').then(renderStatus)");
  assert.ok(iChecks > 0 && iStatus > 0, "thiếu neo trong zboot");
  assert.ok(iChecks < iStatus, "refreshChecks() phải đứng TRƯỚC chuỗi status — xếp sau là pill treo theo lượt lạnh");
  // ② daemon phải CACHE /check + mồi sẵn lúc lên — cửa sổ mở là có kết quả liền
  const ui = readFileSync(new URL("../../backend/src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /checkCache\.get\(/, "/check phải đọc cache — mỗi cửa sổ đo lại từ đầu là bệnh cũ");
  assert.match(ui, /\[\s*"memory",\s*"validate",\s*"grill"\s*\]/, "daemon phải MỒI 3 check rẻ lúc khởi động");
  // ③ nút ↻ Recheck ép ĐO THẬT — cache là cho đường tự động, không được nuốt nghĩa của nút
  const sys = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  // NEO ĐỔI 2026-09-09 — cùng ý nghĩa, khác cách đo. Bản cũ ĐẾM chuỗi `&fresh=1` và đòi ≥2 vì hồi
  // đó hai nút tự ghép URL riêng. Nay "Kiểm lại tất cả" đi qua `refreshChecks(true)` (gộp hai bản
  // sao của danh sách phép kiểm về một chỗ), nên đếm-chuỗi ra 1 và neo đỏ dù hành vi KHÔNG đổi.
  // Đếm cách viết là neo giòn; ba neo dưới kiểm ĐÚNG hai đường phải ép đo thật + chỗ dịch cờ ra URL.
  const freshCalls = (sys.match(/\/check\?feature='\+f\+'&fresh=1/g) || []).length;
  assert.ok(freshCalls >= 1, `nút ↻ của TỪNG feature phải mang fresh=1 — thấy ${freshCalls}`);
  assert.match(sys, /refreshChecks\(true\)/, "nút 'Kiểm lại tất cả' phải ép đo thật qua refreshChecks(true)");
  assert.match(sys, /fresh\?'&fresh=1':''/, "refreshChecks phải dịch cờ fresh thành &fresh=1 — thiếu là nút mất nghĩa");
});

test("a toggle must not 'flip itself': a STALE memory-status payload must not paint over a fresh click (2026-08-21)", () => {
  // Cuộc đua đo được: lượt LẠNH /memory-status >30s; user bấm toggle giữa chừng; payload cũ
  // (bắn TRƯỚC cú bấm) về SAU và vẽ đè ⇒ nút nhìn như tự tắt rồi tự bật. Hai neo, đứt một là
  // bệnh quay lại IM LẶNG (không lỗi, không đỏ — chỉ có user thấy nút nhảy).
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  assert.match(gm, /Z\.flagsAt/u, "renderMem phải đối chiếu mốc cú bấm (Z.flagsAt)");
  assert.match(gm, /m\[k\]=Z\.mem\[k\]/u, "trong cửa sổ sau cú bấm, giá trị LOCAL phải thắng payload già");
  const sys = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  // Neo theo BẢNG ÁNH XẠ, không theo tên khoá lẻ: 2026-09-10 ba bản chép của cùng chuỗi if/else
  // (lật · đóng dấu · hoàn nguyên) được gom thành một `mk`. Bất biến y nguyên — cú bấm phải được
  // đóng dấu — nên neo đi theo bản viết lại thay vì đỏ vì nó. Soi cả hai vế để không nới hụt:
  // bảng phải phủ đủ bốn cờ, VÀ con dấu phải dùng chính bảng đó (dùng khoá khác là guard mù).
  assert.match(sys, /Z\.flagsAt\[mk\]=Date\.now\(\)/u, "toggle phải ĐÓNG DẤU cú bấm — thiếu dấu là guard mù");
  const mk = /var mk=([^;]+);/u.exec(sys);
  assert.ok(mk, "phải có bảng ánh xạ khoá của công tắc");
  for (const k of ["hybrid", "rerank", "scope", "pathsWatch"]) assert.match(mk[1], new RegExp(`'${k}'`), `bảng phải phủ '${k}'`);
});

test("dialog xem tệp: mỗi ô phải mang CHỈ SỐ, và render phải NẠP danh sách cho dialog (plan/25 §5)", () => {
  // Lỗi thật 2026-09-15, bắt được bằng cách dò trang SỐNG chứ không bằng cổng: `render()`
  // thiếu hai dòng nạp `state.items`/`f.idx`, nên `data-fopen` mang giá trị `undefined` và
  // `open()` nhận danh sách RỖNG rồi thoát. Ô vẫn vẽ ra, vẫn bấm được, chỉ là KHÔNG MỞ GÌ —
  // đúng kiểu hỏng im lặng: không lỗi, không đỏ, chỉ có người dùng thấy bấm vào không ăn.
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");

  assert.match(gm, /state\.items\s*=\s*data\.items/, "render phải giữ danh sách đang hiện cho dialog");
  assert.match(gm, /f\.idx\s*=\s*i/, "mỗi mục phải được đánh chỉ số — data-fopen trỏ vào nó");
  assert.match(gm, /sessItems\s*=\s*d\.items/, "panel Tệp-của-phiên cũng phải nạp danh sách của nó");
  // Dialog phải là size L và có đủ ba nút điều hướng/hành động.
  assert.match(html, /id="fileDlg"/, "dialog xem tệp phải có trong DOM");
  assert.match(html, /<div class="dlg lg"[^>]*aria-labelledby="fileDlgTitle"/, "phải là size L (90%, 16:9)");
  for (const id of ["fileDlgPrev", "fileDlgNext", "fileDlgDl", "fileDlgX"]) {
    assert.ok(html.includes(`id="${id}"`), `thiếu nút ${id}`);
  }
});

test("tệp CHỮ phải tự vẽ, KHÔNG nhúng iframe (iframe không ăn token ⇒ chữ chìm vào nền tối)", () => {
  // Lỗi thật 2026-09-15, user báo "file đen thui không thấy gì": iframe dùng bảng màu MẶC
  // ĐỊNH của trình duyệt, mà token của app không với tới bên trong nó.
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  assert.match(gm, /isText[\s\S]{0,400}?<pre class="fpre">/, "tệp chữ phải vẽ bằng <pre>, không iframe");
  assert.match(gm, /textContent = txt/, "đổ bằng textContent — không diễn giải HTML nằm trong tệp");
  assert.match(css, /\.fpre\{[^}]*color:var\(--text\)/, ".fpre phải lấy màu chữ từ token");
  assert.match(css, /\.fpre\{[^}]*background:var\(--surface-2\)/, ".fpre phải lấy màu nền từ token");
  // iframe CHỈ còn cho pdf — trình duyệt tự dựng bộ đọc riêng cho nó.
  const iframes = gm.match(/<iframe/g) || [];
  assert.equal(iframes.length, 1, "chỉ còn đúng một iframe (pdf)");
});

test("làn `picked` trên UI: nút + kéo-thả + endpoint + i18n đủ HAI từ điển", () => {
  // Một chức năng ở repo này là BA bề mặt; thiếu một thì nó mồ côi (bài học `WEB_LABEL`).
  // Ở đây: nút/vùng thả (HTML+JS) · endpoint ghi (ui.ts) · nhãn (cả hai từ điển).
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../backend/src/ui.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");

  assert.match(html, /data-act="files-add"/, "màn Tệp phải có nút Thêm tệp…");
  assert.match(html, /id="filesAddMsg"/, "phải có chỗ báo kết quả — ghi xong mà im lặng là bề mặt nói dối");
  assert.match(gm, /files-add[\s\S]{0,200}?pickAndAdd/, "nút phải nối vào hành động");
  assert.match(gm, /addEventListener\('drop'/, "lưới phải nhận kéo-thả");
  assert.match(gm, /\/attachments-add\?path=/, "đường CHỌN gửi đường dẫn (hộp thoại của hệ biết đường thật)");
  assert.match(gm, /\/attachments-add\?name=/, "đường THẢ gửi byte (trình duyệt không cho biết đường dẫn)");
  assert.match(css, /#filesGrid\.fdrop/, "vùng thả phải có dấu hiệu nhìn thấy được");

  assert.match(ui, /p === "\/attachments-add"/, "endpoint ghi phải tồn tại");
  assert.match(ui, /addPickedFiles/, "và phải đi qua đúng cửa ghi của làn picked");
  assert.match(ui, /64 \* 1024 \* 1024/, "phải có trần kích thước — một cú thả nhầm không được nuốt RAM daemon");

  for (const k of ["files.add", "files.adding", "files.added", "files.dupe", "files.addErr", "files.picking"]) {
    const n = chrome.split(`'${k}'`).length - 1;
    assert.equal(n, 2, `khoá ${k} phải có ở CẢ HAI từ điển (đang thấy ${n})`);
  }
});

// ── MỌI CLASS TRONG MARKUP PHẢI CÓ LUẬT CSS ─────────────────────────────────
//
// Ca thật 2026-09-16, user báo: *"lỗi UI, nút đang ko có js"* — bộ lọc panel Tệp hiện ra dạng
// `<button>` trần của trình duyệt (nền trắng trên nền tối) và bấm vào thì "không thấy gì xảy ra".
// JS KHÔNG hỏng: handler lọc theo `[data-fkind]` và bật class `.on` đúng như thiết kế. Hỏng ở chỗ
// markup khai `class="chip"` mà **CSS chưa từng có `.chip`** — lớp thật tên `.fchip`. Không có kiểu
// thì trạng thái `.on` vô hình, nên một lỗi CSS thuần đọc thành "JS chết".
//
// Vì sao phải là CỔNG chứ không phải một lần sửa: không thứ gì nổ khi gõ sai tên class — không
// lint, không tsc, không test. Nó chỉ hiện ra trước mặt người dùng, và người dùng đoán nhầm nguyên
// nhân. Đo lúc dựng cổng: 107 class trong markup, đúng 1 ngoại lệ có lý do dưới đây.
test("mọi class trong app.html phải có luật trong app.css — trừ nhãn dành cho JS", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  // Class KHÔNG để tạo kiểu, chỉ để JS nhận diện phần tử. Thêm vào đây phải kèm lý do —
  // danh sách này là chỗ dễ biến thành nơi nhét cho cổng khỏi đỏ nhất.
  const JS_MARKER = new Set([
    // `recall.js` đọc `classList.contains('ssel')` để biết select nào thuộc tab Phiên; kiểu đến từ `.rsel`.
    "ssel",
  ]);
  const hasRule = (c) => {
    const needle = "." + c;
    for (let i = css.indexOf(needle); i >= 0; i = css.indexOf(needle, i + 1)) {
      const nx = css[i + needle.length] || " ";
      if (!/[A-Za-z0-9_-]/.test(nx)) return true; // ".fchip" khớp; ".fchipx" thì không
    }
    return false;
  };
  const used = new Set();
  for (const m of html.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (c) used.add(c);
  const orphan = [...used].filter((c) => !JS_MARKER.has(c) && !hasRule(c));
  assert.deepEqual(orphan, [], `class không có luật CSS nào (gõ sai tên?): ${orphan.join(" · ")}`);
});

// ── KHÔNG MỘT CỬA SỔ ĐEN NÀO (`plan/24 §10.1`) ──────────────────────────────
//
// User chốt 2026-09-16: *"là cmd ko hiện lên nữa, phải đưa vào ui luôn"*. Không phải chuyện thẩm mỹ:
// cửa sổ console của daemon **đóng nhầm là GIẾT daemon**, và chuyện đó đã xảy ra thật trong phiên
// đó — cửa sổ app thành vỏ rỗng, mọi nút bấm rơi vào chỗ trống, user tưởng JS hỏng.
//
// `windowsHide: true` là thứ duy nhất chặn Node mở console cho tiến trình con trên Windows. Đo lúc
// dựng cổng: 3 chỗ trong `ui.ts` thiếu cờ này (gồm cả lượt daemon TỰ KHỞI ĐỘNG LẠI sau `selfupdate`,
// và lượt `selfupdate --check` chạy mỗi 6 giờ), cộng 2 chỗ `taskkill` và 1 chỗ phóng trình duyệt.
test("mọi `spawn` phải đặt windowsHide — một cửa sổ đen là một cách giết daemon", () => {
  const files = ["backend/src/ui.ts", "backend/src/platform/window.ts", "backend/src/memory/scanweb.ts",
    "backend/src/jobs/scheduler.ts", "backend/src/jobs/searchjob.ts", "backend/src/jobs/statsjob.ts",
    "backend/src/jobs/syncjob.ts", "backend/src/tools/index.ts"];
  const bad = [];
  for (const f of files) {
    const src = readFileSync(new URL("../../" + f, import.meta.url), "utf8");
    for (const m of src.matchAll(/spawn\(/g)) {
      // Cửa sổ = TỪ `spawn(` TỚI NGOẶC ĐÓNG CÂN BẰNG, không phải tới dấu `;` đầu tiên: bản đầu cắt
      // theo `;` và một dấu chấm phẩy trong CHÚ THÍCH bên trong lời gọi đã cắt hụt đúng dòng cần soi
      // ⇒ cổng báo oan. Cổng soi chữ sai vùng soi thì vô dụng theo cả hai chiều.
      let depth = 0, end = m.index;
      for (let k = m.index + "spawn".length; k < src.length; k++) {
        if (src[k] === "(") depth++;
        else if (src[k] === ")") { depth--; if (depth === 0) { end = k; break; } }
      }
      const win = src.slice(m.index, end + 1);
      if (!/windowsHide:\s*true/.test(win)) bad.push(`${f}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(bad, [], `spawn thiếu windowsHide: ${bad.join(" · ")}`);
});

// ── BỀ MẶT ĐỒNG BỘ: ĐỊA CHỈ + NHẬT KÝ (`plan/24 §10.2`) ─────────────────────
//
// Hai thứ này là ĐIỀU KIỆN của việc giấu cửa sổ console, không phải trang trí:
//  · nhật ký — giấu console mà không mở đường xem log là bịt luôn phép chẩn đoán *"vì sao
//    không nối được"*;
//  · địa chỉ — user phải hỏi IP cho máy kia, và agent đã phải chạy PowerShell để lấy. Máy này
//    đo được HAI card (Wi-Fi và LAN dây, hai dải khác nhau), nên khai MỘT cái là đưa
//    địa chỉ có thể không bao giờ tới được.
test("tab máy-tới-máy phải có ĐỊA CHỈ của máy này và KHUNG NHẬT KÝ, cả hai nối vào endpoint thật", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const js = readAppJs();
  for (const id of ["p2pAddrs", "p2pSeenList", "p2pLog", "p2pLogOnly", "p2pLogHold", "p2pLogPath"]) {
    assert.ok(html.includes(`id="${id}"`), `thiếu ô ${id} trên bề mặt`);
  }
  assert.match(js, /\/daemon-log\?tail=/, "khung nhật ký phải gọi /daemon-log");
  assert.match(js, /c\.addrs/, "phải đổ DANH SÁCH địa chỉ, không phải một cái đoán được");
  assert.match(js, /data-seenfill/, "bấm một máy đã thấy phải điền sẵn ID + địa chỉ");
  // Rỗng phải NÓI RA: vùng trắng trông y như đang tải, người đọc sẽ ngồi chờ một thứ đã xong.
  assert.match(js, /p2p\.logEmpty/, "log rỗng phải nói 'chưa có dòng nào'");

  // ── BA VÙNG (user chốt 2026-09-17: *"phân panel lại làm 3 khu vực, trái phải 2 bên và 1 cái log
  // ở cuối"*). Trước đó tab này là 13 khối rời xếp dọc: mỗi khối chiếm trọn bề ngang dù chỉ chứa
  // ba con số. Khoá bằng máy vì đây đúng loại lỗi "dựng panel mới thì quên khuôn panel cũ" (§F9).
  const pane = html.slice(html.indexOf('<div class="sub" data-sy="p2p">'),
    html.indexOf("</section>", html.indexOf('<div class="sub" data-sy="p2p">')));
  assert.equal((pane.match(/<div class="card">/g) || []).length, 3, "phải đúng BA panel: máy này · máy kia · nhật ký");
  // Hai chiều kéo, và cả hai phải là biến THẬT (§F1①: seam trang trí = kéo không đổi gì).
  assert.match(pane, /<div class="seam" data-seam="p2p1"><\/div>/, "thiếu thanh kéo DỌC giữa hai panel trên");
  assert.match(pane, /data-seam="p2ptop" data-seam-dir="row"/, "thiếu thanh kéo NGANG trên nhật ký");
  assert.match(pane, /grid-template-columns:var\(--p2p1/, "bề rộng panel trái phải do biến điều khiển");
  const css4 = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  assert.match(css4, /\.p2pwrap\{[^}]*var\(--p2ptop/, "chiều cao vùng trên phải do biến điều khiển");
  // Số rãnh = 2 × số thanh kéo + 1, đúng phép của §F5 — thiếu rãnh là còn thanh kéo mồ côi.
  assert.equal((pane.match(/class="seam"/g) || []).length, 2, "hai vùng kề nhau ⇒ hai thanh kéo");
  // Engine seam phải BIẾT chiều dọc, nếu không thanh kéo ngang chỉ là một vạch không bấm được.
  const sysjs = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  assert.match(sysjs, /seamDir==='row'/, "engine seam chưa nhận chiều dọc");
  assert.match(sysjs, /row\?ev\.clientY:ev\.clientX/, "kéo dọc phải đo theo clientY, không thì nó vô hiệu");
  // Đúng panel, đúng thứ: đo bằng LÁT CẮT theo thanh kéo chứ không tìm cả pane.
  const cut = pane.indexOf('data-seam="p2p1"'), cutLog = pane.indexOf('data-seam="p2ptop"');
  const left = pane.slice(0, cut), right = pane.slice(cut, cutLog), bottom = pane.slice(cutLog);
  for (const id of ['id="p2pBlocks"', 'id="p2pAddrs"', 'id="p2pMyId"', 'id="p2pDir"'])
    assert.ok(left.includes(id), `${id} phải ở panel TRÁI (máy này)`);
  for (const id of ['id="p2pCluster"', 'id="p2pHost"', 'data-act="p2p-add-open"', 'p2p.foldersH'])
    assert.ok(right.includes(id), `${id} phải ở panel PHẢI (máy kia)`);
  for (const id of ['id="p2pLog"', 'id="p2pMsg"'])
    assert.ok(bottom.includes(id), `${id} phải ở panel DƯỚI (nhật ký)`);
  // Mỗi panel chia mục bằng `.section-t` — F9 đòi vạch ngăn + khoảng thở, không phải một khối chữ.
  assert.ok((left.match(/class="section-t"/g) || []).length >= 3, "panel trái phải chia mục");
  assert.ok((right.match(/class="section-t"/g) || []).length >= 2, "panel phải phải chia mục");
  // Hàng trên KHÔNG được khoá chiều cao: ảnh 2026-09-17 cho thấy `1fr` cắt cụt nút *Kiểm router*
  // và cả khối *Thứ sẽ đồng bộ* — cổng không thấy vì markup vẫn đủ, chỉ pixel là mất.
  assert.match(css4, /\.p2pwrap\{[^}]*var\(--p2ptop,auto\)/, "mặc định phải là auto, nếu không panel cắt cụt nội dung");
  assert.match(css4, /\.p2pwrap \.card-b\{[^}]*overflow-y:auto/, "kéo hẹp thì panel phải CUỘN, không cắt");
});

test("chuỗi của bề mặt đồng bộ mới phải đủ CẢ HAI từ điển", () => {
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["p2p.addrH", "p2p.addrNone", "p2p.addrCopy", "p2p.copiedAddr", "p2p.seenFill",
    "p2p.filled", "p2p.logH", "p2p.logOnly", "p2p.logHold", "p2p.logEmpty", "p2p.logErr"]) {
    const n = chrome.split(`'${k}':`).length - 1;
    assert.equal(n, 2, `khoá ${k} phải có ở ĐÚNG hai từ điển, đếm được ${n}`);
  }
});

// ── HỘP LỚP HAI: Dữ liệu & Đồng bộ ──────────────────────────────────────────
//
// User chốt 2026-09-16: *"cái nơi lưu data và sync nó là 1 nút setting chung trong đây, khi bấm vào
// mới mở ra dialog box lớn"*. Hai thứ đó nói về CÙNG một chuyện — kho nằm đâu và nó đi đâu — nên
// tách làm hai khối rời trong ⚙ là bắt người dùng ghép lại trong đầu.
//
// Hai bất biến của việc CHỒNG dialog, cả hai đều đã sai ở bản đầu:
//  · ESC phải đóng ĐÚNG lớp trên cùng — bản cũ đóng SẠCH mọi `.dlg-back.on`, tức một phím ESC
//    thổi bay cả hộp con LẪN ⚙ bên dưới (`02_RULES §Dialog` cấm);
//  · z-index phải > 100 (nấc của `.dlg-back`) — bản đầu đặt 70, tức hộp mở ra NẰM DƯỚI ⚙.
test("hộp chồng phải nằm TRÊN ⚙, và ESC chỉ đóng lớp trên cùng", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../../frontend/scripts/shell.js", import.meta.url), "utf8");
  // `addPeerDlg` mở TỪ TRONG màn Đồng bộ và có thể chồng lên ⚙ — cùng bài toán z-index/ESC.
  const m = /id="addPeerDlg"[^>]*z-index:(\d+)/.exec(html);
  assert.ok(m, "hộp chồng phải khai z-index tường minh");
  assert.ok(Number(m[1]) > 100, `z-index ${m[1]} không nằm trên .dlg-back (100) — hộp sẽ mở ra dưới ⚙`);
  assert.ok(Number(m[1]) < 120, `z-index ${m[1]} đè lên lớp toast (120)`);
  // ESC: phải CHỌN một lớp rồi đóng đúng lớp đó, không quét cả danh sách.
  assert.ok(!/open\.forEach\(function\(d\)\{d\.classList\.remove\('on'\);\}\)/.test(shell),
    "ESC không được đóng SẠCH mọi dialog đang mở");
  assert.match(shell, /zIndex/, "phải chọn lớp trên cùng theo z-index");
});

test("đồng bộ là MÀN riêng trên thanh điều hướng — ⚙ không giữ cửa vào trùng", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  // Mục điều hướng là cửa vào DUY NHẤT. Một hàng "Mở màn Đồng bộ" trong ⚙ chỉ là cú bấm thừa,
  // và là chỗ để hai bề mặt lệch nhau (user 2026-09-16: *"cái này ko xài nữa thì xóa đi chứ"*).
  assert.match(html, /<a data-s="sync">/, "thanh điều hướng phải có mục Đồng bộ");
  assert.ok(!html.includes('id="openDataSync"'), "⚙ không được giữ nút mở trùng");
  assert.ok(!html.includes('id="dataSyncDlg"'), "hộp lớp hai phải đi hẳn — nội dung nay ở màn riêng");
  // Hai tab cũ trong ⚙ đã đi hẳn — còn sót là hai nơi cùng nói một chuyện, và JS sẽ trỏ vào hư không.
  for (const dead of ["syncTabDrive", "syncTabP2p", "syncPaneDrive", "syncPaneP2p"]) {
    assert.ok(!html.includes(`id="${dead}"`), `${dead} còn sót trong markup sau khi dời`);
  }
  // Ruột p2p + nhật ký + nơi lưu kho phải NẰM TRONG hộp mới, không rơi lại ⚙.
  // Cắt theo thẻ <section>, KHÔNG theo `data-s="sync"` trần: chuỗi đó khớp MỤC NAV trước,
  // và mục nav của harness đứng trước nó ⇒ lát cắt rỗng, cổng báo oan (đã dính 2026-09-16).
  const i = html.indexOf('<section class="screen" data-s="sync"');
  const box = html.slice(i, html.indexOf('<section class="screen" data-s="harness"'));
  // `relocInput` bỏ 2026-09-16 (chỗ lưu kho thành CỐ ĐỊNH), rồi `storePath` bỏ nốt 2026-09-17:
  // một đường dẫn chỉ đáng hiện khi có thể ĐỔI. Drive đổi được thì đã có ô riêng (`driveInput`);
  // kênh máy-tới-máy thì bám theo kho, không chọn. Còn lại đây là các ô ĐIỀU KHIỂN thật.
  for (const id of ["driveInput", "p2pToggle", "p2pMyId", "p2pAddrs", "p2pLog"]) {
    assert.ok(box.includes(`id="${id}"`), `${id} phải nằm trong hộp Dữ liệu & Đồng bộ`);
  }
  // Và nút dời phải đi hẳn, không chỉ ẩn: còn nút là còn đường bấm nhầm vào một thao tác
  // mà thiết kế vừa tuyên là không còn.
  assert.ok(!html.includes('data-act="browse-reloc"'), "nút Dời… phải đi hẳn khỏi markup");
});

// ── THẺ `<div>` PHẢI CÂN — và mỗi chế độ đồng bộ phải có KHUNG RIÊNG ─────────
//
// Hai lỗi thật của cùng một lượt sửa 2026-09-16:
//  · dời khối p2p sang hộp mới bằng cách CẮT CHUỖI làm sót lại thẻ `</div>` của cái vỏ đã gỡ ⇒
//    lệch một thẻ. Không lint, không tsc, không test nào kêu — trình duyệt tự "sửa" bằng cách
//    đóng thẻ ở chỗ nó đoán, và bố cục lặng lẽ sai;
//  · ba phần xếp liền nhau chỉ bằng một dòng chữ `.section-t` (không vạch, không khung) ⇒ user:
//    *"để 1 nùi dính chùm vậy sao nhìn ra được là có 2 chế độ? phải phân line chứ"*.
test("app.html: thẻ <div> phải cân, và hộp Dữ liệu & Đồng bộ phải chia KHUNG cho từng phần", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const open = (html.match(/<div\b/g) || []).length;
  const close = (html.match(/<\/div>/g) || []).length;
  assert.equal(open, close, `lệch thẻ div: ${open} mở vs ${close} đóng`);
  const box = html.slice(html.indexOf('<section class="screen" data-s="sync"'), html.indexOf('<section class="screen" data-s="harness"'));
  // ĐÚNG HAI panel = đúng HAI chức năng (user chốt 2026-09-16: "có 2 chức năng, 1 là drive, lưu lên
  // drive, 2 là share qua máy khác"). Nơi lưu kho trên máy KHÔNG phải chế độ thứ ba — nó là cái mà
  // cả hai kênh cùng dựa vào, nên nó là dòng đầu hộp, không phải một panel ngang hàng.
  // ĐÚNG HAI KÊNH, và mỗi kênh là một TAB (user chốt 2026-09-16: *"phân ra làm 2 tab, mỗi tab là
  // 1 kênh, vẫn bật tắt được"*). Đếm `.dsec` là sai phép vì cụm máy cũng đóng khung — neo vào ID
  // của hai panel kênh mới đúng thứ cần canh.
  // Dùng ĐÚNG component tab của app (`.tabs > button[data-sy]` + `.sub[data-sy]`), không tự chế
  // chip riêng: user chốt 2026-09-16 *"tab ko đúng mẫu, mấy trang kia tab trên đầu mà"*. Tự chế còn
  // kéo theo mất luôn phần nhớ tab đang mở mà `subSet`/`PERSIST` vốn lo sẵn.
  assert.match(box, /<div class="tabs">[\s\S]{0,600}data-sy="drive"[\s\S]{0,600}data-sy="p2p"/, "hai tab chuẩn");
  assert.equal((box.match(/class="sub[^"]*" data-sy=/g) || []).length, 2, "hai tab: Drive · máy-tới-máy");
  // Gỡ một tab là gỡ HẾT bốn đầu: markup · handler · khoá i18n · endpoint. Bỏ sót đầu nào cũng là
  // bề mặt chết (§F7) — endpoint không ai gọi, hoặc khoá dịch không ai đọc.
  assert.ok(!html.includes('data-sy="backup"'), "markup tab đã gỡ không được sót");
  const src = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  for (const a of ["mbackup", "mrestore", "mforget", "mredact"]) assert.ok(!src.includes("act==='" + a + "'"), "handler " + a + " phải đi theo tab");
  const ui = readFileSync(new URL("../../backend/src/ui.ts", import.meta.url), "utf8");
  for (const ep of ["/memory-backup", "/memory-restore", "/memory-forget", "/memory-redact"]) assert.ok(!ui.includes('p === "' + ep + '"'), "endpoint " + ep + " không còn ai gọi ⇒ phải gỡ");
  const chr = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["drv.privH", "rs.title", "fg.title", "rd.title", "bk.done"]) assert.ok(!chr.includes("'" + k + "'"), "khoá " + k + " không ai đọc ⇒ phải gỡ");
  // Tab phải là thứ ĐẦU TIÊN trong màn — đúng chỗ mọi màn khác đặt nó.
  assert.match(box, /data-s="sync">[\s\S]{0,40}<div class="tabs">/, "tabs phải nằm trên đầu màn");
  const shell = readFileSync(new URL("../../frontend/scripts/shell.js", import.meta.url), "utf8");
  assert.match(shell, /subtabs\('data-sy'\)/, "phải đăng ký data-sy vào cơ chế sub-tab dùng chung");
  assert.match(shell, /sync:'data-sy'/, "thiếu SUBATTR thì vào màn không nạp đúng tab đang mở");
  // 2026-09-17: cụm máy nay LÀ một panel (card bên phải của bố cục ba vùng), nên khung `.dsec`
  // lồng thêm đã gỡ — vẽ hai lần ranh giới cho cùng một nhóm. Cùng lý lẽ đã dùng khi bỏ khung
  // panel chung lúc chia tab: thứ nào đã là ranh giới rồi thì đừng kẻ lại.
  assert.equal((box.match(/class="dsec"/g) || []).length, 0, "cụm máy đã là panel riêng, không đóng khung hai lần");
  // Nội dung màn phải CO ĐƯỢC: chuỗi ID 52 ký tự và các ô nhập từng đẩy cả panel tràn ngang.
  // Neo đổi 2026-09-17: lớp `.syncwrap` đi theo panel "Kho cục bộ" vừa gỡ, nên phép co nay do
  // `.sub[data-sy]` gánh — đó là thứ bọc CẢ BA tab, tức phủ rộng hơn cái neo cũ chứ không lỏng hơn.
  assert.ok(!html.includes("syncwrap"), "lớp của panel đã gỡ không được để lại trong markup");
  const css2 = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  assert.match(css2, /\.sub\[data-sy\][^{]*\{[^}]*min-width:0/, "thiếu min-width:0 thì flex/grid item không co, panel tràn ra ngoài");
  // Và chiều DỌC: `.sub` là cột flex, con của nó co được ⇒ nội dung dài bị bóp cho chữ chồng nhau.
  assert.match(css2, /\.sub\[data-sy\]>\*\{[^}]*flex:0 0 auto/, "khối trong tab phải KHÔNG co, pane cuộn thay vì bóp");
  // Ranh giới phải VẼ RA THẬT: viền suông chưa đủ nổi, phải có cả thanh đầu panel có vạch đáy.
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  assert.match(css, /\.dsec\{[^}]*border:/, ".dsec phải có viền");
  assert.match(css, /\.dsec-h\{[^}]*border-bottom:/, ".dsec-h phải có vạch đáy — đây là 'line nổi lên' user đòi");
  // Mỗi kênh phải nêu CHỖ LƯU của nó (user: "mỗi thằng đều có setup chỗ lưu").
  assert.ok(box.includes('id="driveInput"'), "kênh Drive phải có ô thư mục của nó");
  assert.ok(box.includes('id="p2pDir"'), "kênh máy-tới-máy phải nêu thư mục của nó");
  assert.ok(box.includes('id="p2pCluster"'), "phải có CỤM MÁY dạng thẻ");
});

// ── CHỮ TRÊN UI LÀ VĂN KỸ THUẬT, KHÔNG PHẢI VĂN NÓI ────────────────────────
//
// User chốt 2026-09-16: *"đừng có chú thích thừa thãi nhiều quá, và ko có được ghi văn nói vào,
// t đã nói là ui phải ghi văn kỹ thuật chuẩn thiết kế ui mà"*. Ba thứ đã lọt ra giao diện và phải
// chặn bằng máy, vì không cổng nào khác nhìn tới chữ:
//  · **ngày đo / ghi chú nội bộ** — một nhãn từng ghi *"đo 15/09 trên hai mạng thật"*: đó là ghi
//    chú cho người phát triển, người dùng không có việc gì với nó;
//  · **viết hoa để nhấn giọng** (`KHÔNG` · `CÙNG MẠNG` · `TUYỆT ĐỐI`) — giọng nói, không phải
//    nhãn giao diện;
//  · **câu dài kể lể** — nhãn mô tả là một câu ngắn nêu hành vi, không phải một đoạn giải thích.
test("nhãn UI: không ngày tháng, không viết-hoa-nhấn-giọng, không câu lê thê", () => {
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  // Chỉ soi nhóm nhãn của màn Đồng bộ (`p2p.*` · `ds.*` · `sync.*`) — phần còn lại của app là
  // đợt dọn khác, và một cổng ôm quá rộng sẽ đỏ vì thứ không thuộc lượt này.
  const bad = [];
  for (const m of chrome.matchAll(new RegExp("'((?:p2p|ds|sync)\\.[A-Za-z0-9]+)':'([^']*)'", "g"))) {
    const [, key, raw] = m;
    const text = raw.replace(/\u2019/g, "'");
    if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(text)) bad.push(`${key}: có ngày tháng`);
    if (/(đo|measured)\s+\d/i.test(text)) bad.push(`${key}: có ghi chú đo đạc`);
    // Từ viết hoa toàn bộ ≥3 ký tự, bỏ qua tên riêng/thuật ngữ hợp lệ.
    const SHOUT_OK = new Set(["ID", "LAN", "NAT", "DB", "RAG", "FTS5", "WAL", "REAL", "UDP", "TCP"]);
    for (const w of text.match(/\b[A-ZÀ-Ỹ]{3,}\b/g) || []) if (!SHOUT_OK.has(w)) bad.push(`${key}: viết hoa nhấn giọng "${w}"`);
    if (text.length > 120) bad.push(`${key}: dài ${text.length} ký tự (>120)`);
  }
  assert.deepEqual(bad, [], `nhãn UI sai giọng:${String.fromCharCode(10)}  ${bad.join(String.fromCharCode(10) + "  ")}`);
});

// ── DỜI MỘT KHỐI LÀ PHẢI DỌN CẢ HAI ĐẦU ────────────────────────────────────
//
// User chốt 2026-09-16: *"dời thì phải phân lại cho đúng 2 bên chứ"*. Dời card Drive + Sao lưu ra
// khỏi lưới 3 cột của Global Memory mà không sửa lưới thì **bên cho** còn một cột rỗng và một
// thanh kéo mồ côi; còn **bên nhận** mất công tắc bật/tắt vốn nằm ở khối rút gọn bị thay thế.
test("dời card sang tab: lưới GM phải khớp số cột, và kênh Drive phải còn công tắc", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const gm = html.slice(html.indexOf('data-gm="sync"'), html.indexOf('<section class="screen" data-s="sync"'));
  // Số RÃNH của grid phải khớp số con: mỗi thanh kéo là một rãnh `8px`.
  const tpl = /grid-template-columns:([^"]+)"/.exec(gm);
  assert.ok(tpl, "lưới GM phải khai template");
  // N cột ⇒ N-1 thanh kéo ⇒ 2N-1 rãnh. Neo vào quan hệ này chứ không đếm `.card`: trong khối còn
  // có card LỒNG bên trong, đếm thô sẽ báo oan (đã dính khi viết cổng này).
  const tracks = tpl[1].trim().split(/\s+/).length;
  const seams = (gm.match(/class="seam"/g) || []).length;
  assert.equal(tracks, 2 * seams + 1, `lưới khai ${tracks} rãnh cho ${seams} thanh kéo — phải là ${2 * seams + 1}`);
  // Bên nhận: kênh Drive phải bật/tắt được, không chỉ có ô thư mục.
  const sync = html.slice(html.indexOf('<section class="screen" data-s="sync"'));
  assert.ok(sync.includes('id="driveToggle"'), "kênh Drive mất công tắc sau khi dời");
});

// ── CARD DRIVE TRÊN MÀN RỘNG: BẢNG ĐO TRÁI · NÚT PHẢI ─────────────────────
//
// User chốt 2026-09-16: *"tách cho t hẳn 2 phần, phần bên trái là dashboard... còn bên phải là các
// nút chức năng, tách các nút ra 2-3 hàng, mỗi hàng là 1 nhóm nút chức năng riêng"*.
//
// Card này sinh ra cho một CỘT HẸP của lưới Global Memory. Bê nguyên sang tab chiếm trọn bề ngang
// thì `flex:1` trên nút kéo nút dài hết trang, và mắt phải nhảy qua lại giữa biểu đồ và con số của
// chính nó. Đây là lần thứ tư trong cùng một phiên một bề mặt dời sang khung rộng hơn mà không soát
// lại thứ từng dựa vào bề rộng cũ — nên nó thành cổng.
test("tab Drive: HAI panel riêng trong một lưới kéo được, bảng đo trái · thao tác phải", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const pane = html.slice(html.indexOf('<div class="sub on" data-sy="drive">'), html.indexOf('<div class="sub" data-sy="p2p">'));
  // HAI `.card` RIÊNG trong lưới — không phải một card bị chia đôi (user chốt 2026-09-16:
  // *"người ta là 2 panel tách biệt bạn đi nhét vào 1 panel chia làm 2"*). Đây là khuôn mà mọi
  // màn khác dùng: lưới chứa các card, seam nằm GIỮA hai card.
  assert.match(pane, /class="grid[^"]*rzgrid[^"]*drv2col"/, "phải là lưới kéo được VÀ có class `grid` (display:grid đến từ .grid)");
  assert.equal((pane.match(/<div class="card">/g) || []).length, 2, "phải có ĐÚNG hai panel riêng");
  assert.match(pane, /<div class="seam" data-seam="drv1"><\/div>/, "thiếu thanh kéo giữa hai panel");
  assert.match(pane, /grid-template-columns:var\(--drv1/, "bề rộng cột trái phải là biến THẬT, kéo là đổi");
  const l = pane.indexOf('<div class="card">');
  const seam = pane.indexOf('data-seam="drv1"');
  const left = pane.slice(l, seam), right = pane.slice(seam);
  for (const id of ['id="driveArc"', 'id="drvMix"', 'class="drv-facts"']) {
    assert.ok(left.includes(id), `${id} phải nằm ở panel TRÁI (bảng đo)`);
  }
  for (const id of ['data-act="drivelink"', 'data-act="drivesync"', 'id="lvLean"', 'id="lvAtt"']) {
    assert.ok(right.includes(id), `${id} phải nằm ở panel PHẢI (thao tác)`);
  }
  assert.ok(pane.includes("donut-lg"), "biểu đồ tròn phải dùng cỡ lớn của màn rộng");
  assert.ok((right.match(/class="section-t"/g) || []).length >= 2, "nút phải chia nhóm, mỗi nhóm một tiêu đề");
  // …và nhóm phải NHÌN RA: có vạch ngăn + khoảng thở (`app-design` §F9). Lỗi lặp lại nhiều lần —
  // panel cũ làm đúng, panel mới dựng lại quên, nên khoá bằng máy.
  const css3 = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  // Luật áp cho MỌI khung chứa mục (`.card-b` · `.sub` · `.dlg-b`), không riêng panel Drive: quét
  // 2026-09-16 thấy 4 khung khác cũng có ≥2 mục mà không vạch nào. Bó hẹp luật vào một chỗ là cách
  // lỗi này cứ quay lại ở panel kế tiếp.
  assert.match(css3, /\.card-b>\.section-t,[^{]*\{[^}]*border-top:1px/, "mục phải có vạch ngăn (mọi khung)");
  assert.match(css3, /\.card-b>\.section-t:first-child,[^{]*\{[^}]*border-top:0/, "mục ĐẦU không kẻ vạch — sát tiêu đề thành hai vạch dính nhau");
  // `flex:1` trên nút = nút nuốt hết chỗ trống của hàng. Chỉ ô nhập được phép giãn.
  assert.ok(!/<button[^>]*style="[^"]*flex:1/.test(pane), "nút không được flex:1 trên màn rộng");
});

// ── MỖI CÔNG TẮC VỀ ĐÚNG NHÀ CỦA NÓ ────────────────────────────────────────
//
// User chốt 2026-09-16: *"tính năng chọn tự sync là của drive, còn mở cùng pc có lẽ ở setting mới
// đúng"*. Khối "Tự động" của Global Memory là nơi khai **daemon làm gì với việc NẠP** — một công
// tắc đồng bộ và một công tắc khởi động cùng máy nằm trong đó là hai việc khác hẳn bị xếp nhờ.
test("tự-sync thuộc màn Đồng bộ, mở-cùng-PC thuộc ⚙ — không nằm nhờ ở Global Memory", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const syncAt = html.indexOf('<section class="screen" data-s="sync"');
  const gmAt = html.indexOf('data-gm="sync"');
  const setAt = html.indexOf('id="settingsDlg"');
  const autosync = html.indexOf('data-i18n="mem.autosync"');
  const autostart = html.indexOf('data-i18n="mem.autostart"');
  assert.ok(autosync > syncAt && autosync < setAt, "công tắc tự-sync phải nằm trong màn Đồng bộ");
  assert.ok(autostart > setAt, "công tắc mở-cùng-PC phải nằm trong ⚙ Cài đặt");
  assert.ok(autosync > gmAt ? true : false);
  // Và lời mô tả phải theo kịp hành vi: từ 2026-09-16 lượt sync ghi vào MỌI kênh đang bật, nên câu
  // cũ "chỉ đi qua Drive, không thêm kênh nào" là một lời khai SAI trên giao diện.
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  assert.ok(!/mem\.autosyncD':'[^']*không thêm kênh nào/.test(chrome), "mô tả tự-sync còn nói chỉ đi qua Drive");
});

// ── SỔ TIẾN TRÌNH PHẢI KHỚP MÃ (`app-design` §B1) ──────────────────────────
//
// User chốt 2026-09-16: *"mọi tiến trình của chính app phải dc gộp lại làm 1 và sổ ra ko dc sót
// cái nào ở ngoài nhóm"*. Sổ viết tay trôi khỏi thực tế ngay lượt ai đó thêm một `spawn` mà quên
// ghi — nên sổ là DỮ LIỆU và cổng này là dây nối giữa sổ với mã.
test("sổ tiến trình phủ đúng số nơi spawn trong backend/src", async () => {
  const { APP_PROCESSES, spawnSites } = await import("../../dist/platform/processes.js");
  assert.ok(APP_PROCESSES.length >= 5, "sổ quá ngắn — app này sinh nhiều hơn thế");
  const dir = new URL("../src/", import.meta.url);
  let real = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const u = new URL(e.name + (e.isDirectory() ? "/" : ""), d);
      if (e.isDirectory()) walk(u);
      else if (e.name.endsWith(".ts") && e.name !== "processes.ts") {
        real += (readFileSync(u, "utf8").match(/[^.\w]spawn\(/g) || []).length;
      }
    }
  };
  walk(dir);
  assert.equal(real, spawnSites,
    `mã có ${real} nơi spawn, sổ khai ${spawnSites} — thêm tiến trình thì phải khai vào platform/processes.ts`);
  // Mỗi dòng phải nói ĐỦ: hiện ra tên gì · ai phóng · sống bao lâu · có ẩn console không.
  for (const p of APP_PROCESSES) {
    for (const k of ["shownAs", "spawnedBy", "lifetime", "note"]) {
      assert.ok(p[k] && String(p[k]).length > 2, `dòng sổ thiếu trường ${k}: ${JSON.stringify(p)}`);
    }
    assert.equal(typeof p.hidden, "boolean", "phải khai rõ có ẩn console không (§B2)");
  }
});

// ── BẤM THẺ DỰ ÁN = CHỌN, KHÔNG MỞ ─────────────────────────────────────────
//
// User chốt 2026-09-16 sau ba lượt báo *"bấm vào project toàn nhảy qua harness"*. Đo ra app KHÔNG
// hề đổi màn — không dòng nào gọi `go('harness')`; nó mở khung chi tiết NẰM TRONG màn Projects, và
// khung đó trông giống màn Harness nên đọc thành "bị nhảy". Bài học: khi người dùng nói "nhảy sai",
// thứ phải sửa có thể là HÀNH VI chứ không phải cái tên — tôi đã sửa chữ ba lượt mà không đụng gốc.
test("thẻ dự án: bấm là CHỌN; mở chi tiết phải qua nút riêng", () => {
  const shell = readFileSync(new URL("../../frontend/scripts/shell.js", import.meta.url), "utf8");
  const src = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  // Bấm thẻ KHÔNG được gọi showProjDetail nữa.
  const i = shell.indexOf("var pc=e.target.closest('.proj-card')");
  const block = shell.slice(i, i + 700);
  assert.ok(!/showProjDetail\([^)]*pc\./.test(block), "bấm thẻ không được mở chi tiết");
  assert.match(block, /classList\.add\('sel'\)/, "bấm thẻ phải ĐÁNH DẤU đang chọn");
  assert.match(shell, /data-open-detail/, "phải có đường mở chi tiết tường minh");
  assert.match(src, /data-open-detail/, "thẻ phải mang nút mở");
  assert.match(css, /\.proj-card\.sel\{/, "trạng thái đang chọn phải NHÌN RA được");
});

// ── HỘP "CHUẨN REPO" PHẢI LẤY SỐ TƯƠI KHI MỞ ────────────────────────────────────
//
// User 2026-09-17: *"fix rồi, app phải tự cập nhật lại mới đúng"*. Bản cũ vẽ hộp từ `Z.updDead` của lượt
// poll trước (nhịp 10′) ⇒ sửa đường chết bằng CLI xong mở hộp vẫn thấy số cũ. `/harness-updates` đọc
// `deadPaths` thẳng từ state (không cache) nên một lượt gọi trước khi vẽ là đủ.
test("hộp Chuẩn repo: gọi /harness-updates TRƯỚC khi vẽ, và trượt mạng vẫn vẽ (fail-open)", () => {
  const js = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  const at = js.indexOf("function updDialogStd(");
  assert.ok(at > 0, "phải có updDialogStd");
  const body = js.slice(at, js.indexOf("\n  }", at) + 4);
  const refreshAt = body.indexOf("refreshHarnessUpdates()");
  const drawAt = body.indexOf("zDialog(");
  assert.ok(refreshAt > 0, "phải lấy số tươi từ /harness-updates");
  assert.ok(drawAt > 0, "…rồi mới vẽ hộp");
  // Vẽ nằm trong hàm được gọi SAU refresh — tức refresh phải đứng ở đuôi hàm (sau định nghĩa draw), không đứng trước.
  assert.ok(refreshAt > drawAt, "refresh phải ở sau khối vẽ (vẽ được gọi từ .then), không phải vẽ trước rồi mới hỏi");
  assert.match(body, /\.then\(draw,\s*draw\)/, "trượt mạng vẫn phải vẽ bằng số đang có — không để hộp trống");
});

// ── HAI KHỐI ĐƯỜNG CHẾT TÁCH RIÊNG, và prompt cho khối "không kết luận được" ─────────
//
// User 2026-09-17: *"có 2 cái bị mà vẫn báo không cái nào bị là không đúng… phải tách ra: 0 đường dẫn nào dò
// được mà bị dead, phần dưới là có dead path nhưng không dò được nguyên nhân, rồi cho prompt hỏi"*.
test("hộp Chuẩn repo: câu '0' chỉ nói về phần XÁC MINH được; phần không kết luận có khối riêng + prompt gửi chính repo", () => {
  const js = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  assert.ok(!js.includes("t('upd.deadNone')"), "câu 'không repo nào có đường dẫn mới chết' là SAI khi vẫn có đường chết chưa kết luận — phải đi");
  assert.match(js, /t\('upd\.deadNoneVerified'\)/, "câu 0 phải nói đúng phạm vi: 0 đường XÁC MINH được");
  assert.match(js, /upd\.unprovenHdr/, "khối không-kết-luận phải có tiêu đề riêng");
  // MỘT prompt duy nhất, mang cả hai mục, hiện khi mục nào có cũng được — hai bản chép là hai chỗ để lệch (§F6).
  assert.equal((js.match(/deadPrompt\(dd,uu\)/g) || []).length, 1, "đúng MỘT prompt, dựng từ cả hai danh sách");
  assert.match(js, /if\(dd\.length\|\|uu\.length\)repos\+=/, "khối trên rỗng thì prompt vẫn phải hiện cho khối dưới");
  // Mỗi MỤC một vạch ngăn, và vạch đó do chính `hdr` kẻ — tiêu đề tự chế thì dính vào mục trên (§F9).
  assert.match(js, /if\(uu\.length\)repos\+=hdr\('upd\.unprovenHdr'/, "mục không-kết-luận phải đi qua hdr để có vạch ngăn");
  // …và prompt KHÔNG được có vạch của riêng nó: nó là đuôi của mục cuối, không phải mục thứ ba.
  const promptOpen = /if\(dd\.length\|\|uu\.length\)repos\+='<div style="([^"]*)"/.exec(js);
  assert.ok(promptOpen, "không tìm thấy khối prompt");
  assert.ok(!/border-top/.test(promptOpen[1]), "prompt liền mạch với mục trên — không kẻ vạch riêng");
  assert.match(js, /fix\.promptUnprovenSteps/, "prompt phải dạy ba nhánh xếp loại, không cho đoán đích");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["upd.deadNoneVerified", "upd.unprovenHdr", "upd.unprovenRow", "upd.unprovenHint", "fix.promptUnproven", "fix.promptUnprovenSteps"]) {
    assert.equal(chrome.split(`'${k}':`).length - 1, 2, `khoá ${k} phải có ở ĐÚNG hai từ điển`);
  }
});

// ── HÀNG "LỐI TẮT" Ở ĐÁY TRANG CHỦ ĐÃ GỠ ────────────────────────────────────────
//
// User 2026-09-17: *"3 cái card ở dưới cùng của home thấy không cần thiết, nó vốn dĩ là page liên kết rồi"*.
// Cả ba chỉ ĐIỀU HƯỚNG tới đúng ba mục đã nằm sẵn ở thanh bên (Recall · Đồng bộ · Harness) — một nội dung
// hai nhà (§F6). Riêng "Đồng bộ ngay" còn nói dối: nhãn hứa chạy sync, mà `data-nav` chỉ chuyển màn.
test("trang chủ không còn hàng lối tắt .qa — và gỡ đủ cả ba lớp (markup · CSS · i18n)", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  assert.ok(!html.includes('class="qa"'), "ba thẻ lối tắt phải đi hết");
  assert.ok(!/^\.qa[{:\s]/m.test(css), "luật CSS không còn ai mặc ⇒ phải gỡ theo");
  for (const k of ["qa.recallD", "qa.syncD", "qa.harnessD", "home.openHarness"]) {
    assert.ok(!chrome.includes(`'${k}'`), `khoá ${k} không ai đọc ⇒ phải gỡ`);
  }
  // Ba đích vẫn phải tới được — gỡ lối tắt, KHÔNG gỡ đường.
  for (const nav of ["recall", "sync", "harness"]) {
    assert.match(html, new RegExp(`data-s="${nav}"`), `màn ${nav} vẫn phải còn`);
  }
});

// ── NHÀ CỦA CHÍNH ZEMORY ĐỨNG ĐẦU TUYỆT ĐỐI ────────────────────────────────────
//
// User 2026-09-17: *"đã nói zemory luôn tag ở đầu, nhưng khi ghim 1 project khác bấm lại thì nó bị nhảy
// đổi thứ tự"*. Backend đã xếp đúng (`listKnownProjects`: locked → pinned → lastSeen), nhưng BỀ MẶT SẮP LẠI
// và bản cũ chỉ so `pinned` ⇒ ghim thêm một dự án là zemory rơi xuống theo tiêu chí đang chọn. Hai nơi cùng
// quyết một thứ tự thì cả hai phải giữ CÙNG bất biến.
test("danh sách dự án: `locked` xếp trước `pinned`, và trước mọi tiêu chí sắp xếp", () => {
  const src = readFileSync(new URL("../../frontend/scripts/sources.js", import.meta.url), "utf8");
  const cmp = /ps\.sort\(function\(a,b\)\{[\s\S]*?\n\s*if\(so==='name'\)/.exec(src);
  assert.ok(cmp, "không tìm thấy hàm so sánh của danh sách dự án");
  const iLocked = cmp[0].indexOf("la!==lb");
  const iPinned = cmp[0].indexOf("pa!==pb");
  assert.ok(iLocked >= 0, "phải so `locked` — nếu không, ghim thêm dự án là zemory bị đẩy đi");
  assert.ok(iPinned >= 0, "vẫn phải so `pinned`");
  assert.ok(iLocked < iPinned, "`locked` là hạng RIÊNG, phải xét trước `pinned`");
  // …và trước cả bốn tiêu chí, nếu không thì đổi tiêu chí là đổi luôn chỗ của zemory.
  for (const k of ["so==='name'", "so==='sessions'", "so==='recent'", "oi(a)-oi(b)"]) {
    assert.ok(iLocked < cmp[0].indexOf(k) || cmp[0].indexOf(k) < 0, `\`locked\` phải xét trước ${k}`);
  }
});

// ── CHIP THANH BÊN PHẢI ĐỌC SỐ ĐÃ CÓ ───────────────────────────────────────────
//
// Chip "Chuẩn repo khớp · {n} repo đã liên kết" đọc Z.status.knownProjects, thứ chỉ có sau /status.
// Bản cũ vẽ chip NGAY sau /ping ⇒ ghi "0 repo đã liên kết" trong khi đã liên kết 17, và nhịp vẽ lại
// là 10 PHÚT nên con số sai nằm đó rất lâu (đo 2026-09-17: t=60s vẫn "0", Z.status.knownProjects=17).
// Một con số sai không tự sửa là kiểu hỏng tệ nhất — nó không báo lỗi, nó NÓI DỐI (§F3).
test("rail: lượt vẽ chip nằm SAU /status, vì chip đọc số chỉ /status mới có", () => {
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  const boot = chrome.slice(chrome.indexOf("refreshChecks();"), chrome.indexOf("loadRecentSessions();"));
  const iStatus = boot.indexOf("zGet('/status')");
  const iRail = boot.indexOf("refreshHarnessUpdates()");
  assert.ok(iStatus >= 0 && iRail >= 0, "không tìm thấy hai mắt xích trong chuỗi khởi động");
  assert.ok(iRail > iStatus, "vẽ chip trước /status ⇒ chip ghi 0 repo trong khi đã liên kết N");
  // …và phải nằm TRONG nhánh then của /status, không phải một dòng rời chạy song song.
  const chain = boot.slice(iStatus);
  assert.match(chain, /zGet\('\/status'\)\.then\(renderStatus\)[^\n]*\n\s*refreshHarnessUpdates\(\);/,
    "phải gọi trong then của /status — song song thì vẫn là đua, chỉ khó thấy hơn");
  const sys = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  assert.match(sys, /rail\.stdOkSub'\)\.replace\('\{n\}',\(\(Z\.status&&Z\.status\.knownProjects\)\|\|\[\]\)\.length\)/,
    "chip vẫn phải lấy số từ Z.status.knownProjects — đổi nguồn thì ca này phải được soạn lại");
});

// ── DẢI SỐ LIỆU GIÃN ĐẦY BỀ NGANG ──────────────────────────────────────────────
//
// User 2026-09-17: *"tất cả card này tự sắp xếp giãn theo chiều ngang của app, tự động cân chỉnh"*.
// Bản cũ dựng bằng lưới `repeat(auto-fill,minmax(150px,1fr))` nhét thẳng vào chuỗi HTML: `auto-fill`
// GIỮ LẠI ô trống, nên hàng cuối để hở một mảng và thẻ lẻ đứng hụt 150px. Dải flex chia lại phần
// thừa theo TỪNG HÀNG ⇒ hàng nào cũng khít mép (đo: hở cuối hàng 0px ở 1500·1300·1230·1100·900·800).
test("dải số liệu là .tile-strip co giãn, không phải lưới nhét style thẳng vào HTML", () => {
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  assert.ok(!/grid-template-columns:repeat\(auto-fill/.test(gm), "auto-fill giữ ô trống ⇒ hàng cuối hở");
  assert.match(gm, /zid\('gmStats'\)\.innerHTML='<div class="tile-strip">'/, "dải phải dùng lớp chung");
  assert.match(gm, /return '<div class="tile">/, "thẻ phải dùng lớp chung, không style rời trong chuỗi");
  const css = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  assert.match(css, /\.tile-strip\{[^}]*display:flex[^}]*flex-wrap:wrap/, "phải là dải flex thì mỗi hàng mới tự chia lại phần thừa");
  const tile = /\.tile-strip>\.tile\{([^}]*)\}/.exec(css);
  assert.ok(tile, "thiếu luật cho thẻ trong dải");
  assert.match(tile[1], /flex:1 1 150px/, "thẻ phải GIÃN để lấp hết bề ngang, 150px chỉ là bề rộng mong muốn");
  assert.match(tile[1], /min-width:0/, "không có min-width:0 thì thẻ không co được ⇒ cuộn ngang (§F12)");
});

// ── HAI BẢNG MỚI CỦA TAB KÊNH DRIVE ────────────────────────────────────────────
//
// User 2026-09-17: *"trang trống chỗ nhiều, thêm vài dashboard … cột phải thêm chart phần trống của
// drive đang kết nối, bên trái thêm dashboard tỉ trọng project"*.
test("tab Drive: bảng tỉ trọng theo dự án và bảng sức chứa ổ — số thật, tên gọi đúng thứ đo được", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  assert.match(html, /id="drvMixProj"/, "thiếu ô cho bảng tỉ trọng dự án");
  assert.match(html, /id="drvSpace"/, "thiếu ô cho bảng sức chứa");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  // MỘT lượt /insights nuôi CẢ HAI thanh tỉ trọng — hai lượt gọi là hai câu trả lời có thể lệch (§F6).
  // Đếm TRONG renderDriveMix thôi: màn Global Memory có lượt gọi riêng của nó, đó là chuyện khác.
  const mixFn = gm.slice(gm.indexOf("function renderDriveMix()"), gm.indexOf("function renderDriveSpace()"));
  assert.ok(mixFn.length > 200, "không khoanh được hàm renderDriveMix");
  assert.equal((mixFn.match(/zGet\('\/insights\?days=30'\)/g) || []).length, 1, "đúng một lượt gọi cho cả hai biểu đồ");
  assert.match(gm, /function mixBars\(/, "hai biểu đồ phải dùng chung một hàm vẽ");
  // Tên dự án lấy từ `project` — đọc nhầm sang `path` thì mọi thanh mang nhãn rỗng mà không ai đỏ.
  assert.match(gm, /String\(r\.project\|\|''\)/, "tên dự án nằm ở trường `project` của /insights");
  assert.doesNotMatch(gm, /mixBars\(boxP,pr,function\(r\)\{return String\(r\.path/, "`path` là trường KHÔNG có trong hàng /insights");
  // Sức chứa: probe chạy ở tiến trình con nên vài lượt đầu chưa có số ⇒ phải tự đo lại, có TRẦN.
  assert.match(gm, /spaceTimer=setTimeout\(renderDriveSpace,5000\)/, "chưa có số thì phải hẹn đo lại, không đứng im ở 'chưa đo được' (§F3)");
  assert.match(gm, /spaceTries<8/, "hẹn lại phải có trần, không thành vòng hỏi vô tận");
  assert.match(gm, /if\(onP2pTab\)stopDriveSpace\(\)/, "rời tab thì phải thôi hỏi");
  // zBytes nhận KILOBYTE; probe trả BYTE. Lẫn là sai đúng 1024 lần mà nhìn vẫn hợp lý.
  assert.doesNotMatch(gm, /zBytes\((?:dv\.storeBytes|v\.free|v\.total)/, "không được đưa BYTE vào zBytes (nó nhận KB)");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["drv.mixProjH", "drv.spaceH", "drv.spaceStore", "drv.spaceOther", "drv.spaceFree", "drv.spaceNote", "drv.spaceNone", "drv.spaceProbing"]) {
    assert.equal(chrome.split(`'${k}':`).length - 1, 2, `khoá ${k} phải có ở ĐÚNG hai từ điển`);
  }
  // Nhãn phải GỌI ĐÚNG TÊN thứ đo được: Google Drive Desktop báo thông số ĐĨA LOCAL (đo 2026-09-17:
  // G: và C: trùng Size tới từng byte), nên không được viết thành "dung lượng Drive còn lại".
  assert.match(chrome, /'drv\.spaceH':'Sức chứa ổ chứa thư mục Drive'/, "tiêu đề phải nói rõ là ổ chứa thư mục, không phải quota đám mây");
  assert.match(chrome, /'drv\.spaceNote':'Google Drive Desktop báo thông số của ĐĨA LOCAL/, "phải có câu nói rõ nguồn số");
  const probe = readFileSync(new URL("../../backend/src/jobs/driveprobe.ts", import.meta.url), "utf8");
  assert.match(probe, /volume: \{ total: number; free: number; root: string \} \| null;/, "probe phải mang sức chứa ổ");
  assert.match(probe, /storeBytes: number;/, "probe phải mang dung lượng kho chung");
  // Ổ treo là ca THẬT ở đây (chính vì vậy probe mới chạy ở tiến trình con) — không đo được thì để
  // null cho bề mặt nói "chưa đo được", tuyệt đối không bịa 0.
  assert.match(probe, /catch \{\s*\n\s*\/\* ổ không trả lời thông số/, "đo hỏng phải để null, không rơi về 0");
});

// ── EMOJI PHẢI Ở DẠNG EMOJI, KHÔNG PHẢI DẠNG CHỮ ───────────────────────────────
//
// User 2026-09-17: *"list session sao lại bị có ký tự lạ"* — badge đính kèm hiện ra một ô vuông.
// Gốc: U+1F5BC và U+1F5DC mặc định là TEXT presentation; Windows không có glyph chữ cho chúng
// trong font UI nên vẽ ô trống. Đo trong chính trình duyệt của app (bề rộng canvas, đối chiếu với
// U+FFFF = tofu và U+1F600 = emoji thật): `🖼` trần = 14,0px (dạng chữ) · `🖼️` (kèm U+FE0F) = 19,2px
// = đúng emoji. ⚠ Và phép đo đã cứu một bản vá sai: `📎` — thứ tôi định thay vào — ĐO RA ĐÚNG BẰNG
// TOFU, tức là đổi sang nó thì còn tệ hơn. Đoán glyph nào "chắc có" là cách hỏng lặng lẽ.
test("mọi emoji dạng-chữ trên UI phải kèm dấu chọn biến thể U+FE0F", () => {
  const TEXT_DEFAULT = [["\u{1F5BC}", "khung ảnh"], ["\u{1F5DC}", "nén"]];
  for (const f of ["frontend/scripts/session.js", "frontend/scripts/recall.js", "frontend/scripts/chrome.js", "frontend/pages/app.html"]) {
    const s = readFileSync(new URL("../../" + f, import.meta.url), "utf8");
    for (const [ch, name] of TEXT_DEFAULT) {
      const bare = [...s.matchAll(new RegExp(ch + "(?!\uFE0F)", "gu"))].length;
      assert.equal(bare, 0, `${f}: ${name} (${ch}) thiếu U+FE0F ⇒ Windows vẽ thành ô vuông`);
    }
  }
});

// ── TIÊU ĐỀ PHIÊN LÀ CHỮ GỐC ───────────────────────────────────────────────────
//
// User 2026-09-17: *"mắc gì có cái ảnh trong title session? title người ta chữ gốc thôi chứ"*.
// Số tệp đính kèm vẫn đáng hiện (bộ lọc "Có ảnh" dựa vào đúng thứ đó) nhưng nó là MỘT DỮ KIỆN của
// phiên, cùng hạng với nguồn và số tin ⇒ thuộc hàng dữ kiện, không chen vào tên người ta đặt.
test("danh sách phiên: tiêu đề không đính badge — số tệp nằm ở hàng dữ kiện", () => {
  const js = readFileSync(new URL("../../frontend/scripts/session.js", import.meta.url), "utf8");
  const row = js.slice(js.indexOf("class=\"sys-li"), js.indexOf("</div>';}).join('')"));
  assert.ok(row.length > 100, "không khoanh được hàng phiên");
  const iTitle = row.indexOf("String(ti).slice(0,64)");
  const iMeta = row.indexOf("zProjName(s.project)");
  const iAtts = row.indexOf("s.atts?");
  assert.ok(iTitle >= 0 && iMeta > iTitle, "hàng phiên phải có tiêu đề rồi tới hàng dữ kiện");
  assert.ok(iAtts > iMeta, "số tệp phải nằm SAU hàng dữ kiện, không dính vào tiêu đề");
  assert.ok(!row.includes("att-n"), "badge trên tiêu đề phải đi");
  assert.match(row, /zN\(s\.atts\)\+' '\+stdEsc\(t\('files\.unit'\)\)/, "số tệp phải có đơn vị, và đơn vị lấy từ từ điển");
});

// ── KHUNG CỬA SỔ PHẢI ĐƯỢC NHỚ ─────────────────────────────────────────────────
//
// User 2026-09-17: *"app lần đầu mở full màn hình thì mở lại phải mở full màn, còn màn nhỏ để ở đâu
// thì lần sau mở đúng vị trí đó"*. Bản cũ truyền CỨNG `--window-size=1320,920` mỗi lần mở, nên dù
// trình duyệt có tự nhớ cũng bị đè, và trạng thái PHÓNG TO thì kích thước không diễn tả được.
test("khung cửa sổ được lưu và khôi phục — vị trí, kích thước, và trạng thái phóng to", () => {
  const ui = readFileSync(new URL("../../backend/src/ui.ts", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /"--no-default-browser-check",\s*\n\s*"--window-size=1320,920"/, "không được gắn cứng kích thước — có nhớ cũng bị đè");
  assert.match(ui, /\.\.\.windowArgs\(\),/, "launcher phải lấy cờ khung từ bản đã lưu");
  assert.match(ui, /if \(b\.max\) return \["--start-maximized"\];/, "phóng to là TRẠNG THÁI riêng, không diễn tả bằng kích thước");
  assert.match(ui, /--window-position=\$\{b\.x\},\$\{b\.y\}/, "phải khôi phục cả VỊ TRÍ, không chỉ kích thước");
  assert.match(ui, /p === "\/window-box"/, "thiếu endpoint nhận khung");
  assert.match(ui, /box\.w < 320 \|\| box\.h < 240/, "số rác phải bị bỏ — một lần ghi hỏng là lần sau cửa sổ nằm ngoài màn hình");
  const st = readFileSync(new URL("../../backend/src/config/settings.ts", import.meta.url), "utf8");
  assert.match(st, /windowBox\?: \{ x: number; y: number; w: number; h: number; max: boolean \}/, "khung phải nằm trong config (localStorage mất khi đổi cổng)");
  assert.match(st, /if \(b\.w < 320 \|\| b\.h < 240\) return null;/, "khung vô lý thì coi như chưa có, mở mặc định");
  // Cửa sổ native là NƠI GHI DUY NHẤT: nó tự đo vị trí/kích thước trong đúng hệ toạ độ mà hàm dựng
  // nhận. Trang chỉ khai một BOOLEAN "đang phóng to" — thứ cửa sổ không biết vì không biết màn hình
  // rộng bao nhiêu. Lấy toạ độ từ trang là bẫy: `screenX` là gốc NỘI DUNG, nên mở lại thì cửa sổ tụt
  // xuống thêm một thanh tiêu đề, lần nào cũng thế.
  const win = readFileSync(new URL("../../backend/src/platform/window.ts", import.meta.url), "utf8");
  assert.match(win, /const saved = getWindowBox\(\);/, "cửa sổ phải dựng theo khung đã lưu");
  assert.match(win, /if \(saved\?\.max\) \{/, "phóng to phải khôi phục bằng maximize, không bằng kích thước");
  assert.match(win, /win\.onMove\(/, "phải nghe cú KÉO — resize không nổ khi chỉ đổi vị trí");
  assert.match(win, /if \(box\.max\) return;/, "đang phóng to thì KHÔNG ghi đè vị trí người dùng từng chọn");
  // Nhận ra "cỡ phóng to" bằng VÙNG LÀM VIỆC, không bằng thứ tự sự kiện. Bản đầu hoàn nguyên một
  // bước khi nghe tin phóng to — đo ra là KHÔNG ĂN vì một cú phóng to sinh nhiều hơn một onResize.
  assert.match(win, /const isMaxSize = \(w: number, h: number\): boolean =>/, "phải tự nhận ra cỡ phóng to, đừng dựa vào thứ tự sự kiện");
  assert.match(win, /if \(!area\) return;/, "chưa biết màn hình thì KHÔNG kết luận — ghi bừa là bê cỡ phóng to đè lên cỡ người dùng");
  assert.doesNotMatch(win, /\{ \.\.\.prev, max: true \}/, "phép hoàn nguyên một bước đã đo là không ăn — không được quay lại");
  const shell = readFileSync(new URL("../../frontend/scripts/shell.js", import.meta.url), "utf8");
  assert.match(shell, /t:'winmax'/, "trang phải khai trạng thái phóng to qua kênh webview");
  assert.match(shell, /aw:screen\.availWidth,ah:screen\.availHeight/, "phải gửi kèm vùng làm việc để cửa sổ tự phán");
  assert.doesNotMatch(shell, /screenX/, "trang KHÔNG được khai toạ độ — đó là gốc nội dung, không phải gốc cửa sổ");
});

// ── "ĐI TỚI" PHẢI TỚI ĐƯỢC ─────────────────────────────────────────────────────
//
// User 2026-09-17: *"đi tới thì trỏ trang trống không đúng chỗ setting"* — hàng Kênh Drive mang
// `to:'memory'`, một tên màn KHÔNG TỒN TẠI (các màn: home · system · recall · projects · gmem ·
// harness · sync). `go()` với tên lạ gỡ hết class `.on` ⇒ TRANG TRẮNG, và không lỗi nào nổ.
// Cùng lượt, user chốt: *"mỗi 1 tính năng đều có đi tới và trỏ vào đúng trang setting hoặc thông
// tin của tính năng đó"*.
test("Tính năng: mọi đích 'Đi tới' phải là màn/tab CÓ THẬT trong markup", () => {
  const js = readFileSync(new URL("../../frontend/scripts/system.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const SUBATTR = { recall: "data-rc", gmem: "data-gm", harness: "data-ht", projects: "data-pj", sync: "data-sy" };
  // Khoanh đúng BẢNG FEATURES: quét cả file thì trúng luôn chú thích kể về ca hỏng cũ.
  // Và cần biên trước `to:` — thiếu nó thì `auto:'scheduler'` cũng khớp (nó chứa đúng chuỗi `to:'`).
  const table = js.slice(js.indexOf("var FEATURES=["), js.indexOf("\n  ];"));
  assert.ok(table.length > 500, "không khoanh được bảng FEATURES");
  const dests = [...table.matchAll(/(?<![a-zA-Z])to:'([^']+)'/g)].map((m) => m[1]);
  assert.ok(dests.length >= 8, `phải có nhiều hàng mang đích (thấy ${dests.length})`);
  for (const d of dests) {
    if (d.startsWith("__")) { assert.match(js, new RegExp(`dest==='${d}'`), `đích đặc biệt ${d} phải có nhánh xử lý`); continue; }
    const [screen, tab] = d.split(":");
    assert.ok(html.includes(`data-s="${screen}"`), `đích '${d}': màn '${screen}' không tồn tại ⇒ bấm Đi tới ra trang trắng`);
    if (tab) assert.ok(html.includes(`${SUBATTR[screen]}="${tab}"`), `đích '${d}': tab '${tab}' không tồn tại trong màn '${screen}'`);
  }
  assert.ok(!table.includes("to:'memory'"), "'memory' không phải tên màn — đó là ca đã làm trang trắng");
  // "Nơi lưu DB" là TÊN CŨ của chỗ lưu kho chung; thứ quyết định chỗ lưu nay là "Thư mục dùng chung"
  // ở Đồng bộ › Kênh Drive (user 2026-09-17: *"nơi lưu DB là cái cũ, nó giờ là cái lưu drive đó, bỏ
  // luôn trong setting, bấm vào trỏ vào đồng bộ"*). Hai cái tên cho một thứ là chỗ để người đọc lệch.
  assert.ok(!html.includes("set.dbPath"), "dòng Nơi lưu DB phải rời hộp Cài đặt");
  assert.match(table, /{k:'storage'[^}]*to:'sync:drive'/, "hàng Nơi lưu DB phải trỏ về Đồng bộ › Kênh Drive");
  // Hàng có công tắc NGAY TRÊN HÀNG, hoặc chỉ hiện một con số, thì KHÔNG có đích: mở hộp Cài đặt
  // chỉ để xem lại đúng thứ vừa thấy là một cú bấm nói dối (user 2026-09-17: *"nơi lưu db và auto
  // start mà còn mở ra setting là sai"*). Riêng autostart, hộp Cài đặt còn giữ một BẢN SAO của cùng
  // công tắc — trỏ sang đó là trỏ vào bản sao.
  for (const k of ["autostart"]) {
    const row = new RegExp("[{]k:'" + k + "'[^}]*[}]").exec(table);
    assert.ok(row, `không thấy hàng ${k}`);
    assert.ok(!/(?<![a-zA-Z])to:/.test(row[0]), `hàng ${k} không được có đích — nó đã tự hiện đủ trên hàng`);
  }
  // Nút vẽ theo `to`, không theo `kind` — nếu không thì hàng có nhà mà vẫn không có đường tới.
  assert.match(js, /function sysGoto\(f\)\{\s*\n\s*return f\.to \?/, "nút Đi tới phải bám vào `to`, không bám vào kind");
  assert.match(js, /sysGoto\(f\)\+sysAction\(f\)/, "nút phải thật sự được vẽ ra");
  // Và đích lạ thì KHÔNG đi đâu cả — thà đứng yên còn hơn để lại trang trắng.
  assert.match(js, /if\(!document\.querySelector\('\.screen\[data-s="'\+pr\[0\]\+'"\]'\)\)return;/, "đích không có thật thì phải đứng yên");
});

// ── DONUT SỨC CHỨA, ĐỐI XỨNG VỚI DONUT ĐỒNG BỘ ─────────────────────────────────
//
// User 2026-09-17: *"thêm 1 chart để check có bao nhiêu store trống còn lại trên drive"* …
// *"nó là cái nằm ngay thao tác panel phải đối xứng với chart donut đó"*. Bản đầu tôi vẽ một thanh
// ngang mảnh — đúng số nhưng KHÔNG phải thứ được yêu cầu, và phá thế đối xứng hai panel.
test("tab Drive: panel phải có donut sức chứa, cùng khuôn với donut đồng bộ bên trái", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  // Cùng KHUÔN, không phải hình tự chế: cùng class, cùng viewBox, cùng bán kính.
  for (const id of ["driveArc", "capArc"]) {
    assert.match(html, new RegExp(`<circle class="darc" id="${id}" cx="20" cy="20" r="16"`), `donut ${id} phải dùng đúng khuôn chung`);
  }
  assert.match(html, /<div class="drv-progress">[\s\S]{0,400}id="capArc"[\s\S]{0,400}id="capTxt"/, "donut sức chứa phải nằm trong khuôn .drv-progress như bên trái");
  // Vòng đo phần CÒN TRỐNG — đó là câu người dùng hỏi ("còn bao nhiêu chỗ").
  assert.match(gm, /var freePct=Math\.round\(pc\(v\.free\)\);/, "vòng phải đo phần còn trống, không phải phần đã dùng");
  assert.match(gm, /cArc\.setAttribute\('stroke-dasharray',\(freePct\/100\*DONUT_C\)/, "phải vẽ cung theo cùng chu vi DONUT_C của donut kia");
  assert.match(gm, /cArc\.style\.stroke=freePct<10\?'var\(--danger\)'/, "sắp hết chỗ phải đổi màu");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["drv.spaceFreeN", "drv.spaceUsedOf"]) {
    assert.equal(chrome.split(`'${k}':`).length - 1, 2, `khoá ${k} phải có ở ĐÚNG hai từ điển`);
  }
});

// ── PANEL "MÁY NÀY": Ổ ĐĨA + NƠI NGUỒN QUÉT ĐƯỢC NẰM ───────────────────────────
//
// User 2026-09-17: *"bên chỗ máy này bên chart panel phải mấy dòng bar chart hiển thị dung lượng ổ
// đĩa đang có, và hiển thị luôn chỗ quét được từ máy là nằm ở đâu link nào"*.
test("panel Máy này: bar dung lượng ổ và danh sách nơi quét được, đọc từ nguồn thật", () => {
  const html = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8");
  assert.match(html, /id="mDisks"/, "thiếu ô cho danh sách ổ đĩa");
  assert.match(html, /id="mStores"/, "thiếu ô cho danh sách nơi quét được");
  const gm = readFileSync(new URL("../../frontend/scripts/gm.js", import.meta.url), "utf8");
  assert.match(gm, /zGet\('\/machine-info'\)/, "phải đọc từ endpoint thật");
  // Dùng lại đúng thanh của biểu đồ tỉ trọng — cùng một ý "phần trên tổng" thì phải cùng một hình.
  assert.match(gm, /drvmix-bar[\s\S]{0,200}drvmix-fill/, "bar ổ đĩa phải dùng lại thanh có sẵn, không đẻ kiểu thứ hai");
  // Lượt dò ĐẦU sau khi daemon lên có thể trượt (đo thật) ⇒ phải hỏi lại, có trần.
  assert.match(gm, /mInfoTries<6/, "chưa có số thì phải hỏi lại, và phải có trần");
  assert.match(gm, /data-copypath=/, "đường dẫn phải bấm chép được — dài thế không ai gõ lại");
  const ui = readFileSync(new URL("../../backend/src/ui.ts", import.meta.url), "utf8");
  assert.match(ui, /p === "\/machine-info"/, "thiếu endpoint");
  assert.match(ui, /SELECT store_root AS root, source FROM known_stores/, "nơi quét được phải đọc thẳng sổ known_stores, không đếm lại một bản thứ hai");
  // ⚠ known_stores ĐI THEO ĐỒNG BỘ ⇒ chứa cả gốc store của MÁY KHÁC. Panel tên là "Máy này" thì chỉ
  // được nói về máy này (đo 2026-09-17: sổ 27 hàng, chỉ 8 có thật ở đây).
  assert.ok(ui.includes("const here = rows.filter((r) => { try { return existsSync(r.root)"), "phải lọc bỏ đường của máy khác");
  // Nguồn WEB đổ chung MỘT thư mục imports ⇒ gộp một dòng, không liệt kê từng nền.
  assert.ok(ui.includes("const impRoots = new Map<string, Set<string>>();"), "phải gom cụm web theo gốc imports");
  assert.ok(ui.includes('kind: "import" as const, platforms: srcs.size'), "dòng gộp phải mang số nền, nếu không mất thông tin");
  // Dò ổ chạy trong TIẾN TRÌNH CON: `statfs` trên ổ mây treo thì nằm im, gọi thẳng là đóng băng daemon.
  const probe = readFileSync(new URL("../../backend/src/jobs/diskprobe.ts", import.meta.url), "utf8");
  assert.match(probe, /endsWith\("jobs\/diskprobe\.js"\)/, "phải có điểm vào cho tiến trình con");
  assert.match(ui, /execFile\(process\.execPath, \[diskprobeEntry\(\)\]/, "daemon phải gọi qua con, không statfs thẳng");
  assert.match(ui, /if \(err\) return;/, "con chết thì GIỮ bản cũ, đừng thay bằng danh sách rỗng");
  const shell = readFileSync(new URL("../../frontend/scripts/shell.js", import.meta.url), "utf8");
  assert.match(shell, /v==='sync'&&typeof renderMachineInfo==='function'/, "phải nạp đúng lúc vào tab, không hỏi sẵn");
  const chrome = readFileSync(new URL("../../frontend/scripts/chrome.js", import.meta.url), "utf8");
  for (const k of ["mem.disksH", "mem.storesH", "mem.disksNone", "mem.storesNone", "mem.diskFree", "mem.storeCopy", "mem.copied"]) {
    assert.equal(chrome.split(`'${k}':`).length - 1, 2, `khoá ${k} phải có ở ĐÚNG hai từ điển`);
  }
});
