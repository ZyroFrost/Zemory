// Runtime language switch (user 2026-09-10: "bật qua lại 2 ngôn ngữ nó cứ bị kẹt… bấm qua VN mà nó vẫn dính EN").
// The dictionaries were gated (parity), the SWITCH PATH was not. Three guards, each one a real defect found:
//  ① the click must NOT force /memory-status?fresh=1 (7–74 s cold; nothing in that payload is server-localized)
//  ② renderMem must keep the just-clicked `lang` for 90 s against in-flight payloads (same net as hybrid/rerank)
//  ③ the VI/EN buttons light from applyI18n (fed by /ping at ~100 ms), not only from renderMem.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const FE = (f) => readFileSync(new URL(`../../frontend/scripts/${f}`, import.meta.url), "utf8");

test("① click ngôn ngữ không kéo /memory-status?fresh=1; refetch đúng thứ server dịch (/status + checks fresh)", () => {
  const src = FE("sources.js");
  const i = src.indexOf("closest('[data-lang]')");
  assert.ok(i > 0, "handler [data-lang] phải tồn tại");
  // Bỏ dòng chú thích trước khi soi — chú thích giải thích VÌ SAO không gọi endpoint đó nên chứa đúng chuỗi bị cấm
  // (bẫy "cổng soi chữ bắt oan comment", 05_TODO 2026-09-02, dẫm lại ngay lượt đầu của test này).
  const handler = src.slice(i, src.indexOf("return;}", i) + 8).split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.doesNotMatch(handler, /memory-status\?fresh=1/, "đổi ngôn ngữ KHÔNG được ép tính lại toàn bộ số liệu");
  assert.match(handler, /zPost\('\/set-lang\?lang='\+L\)/);
  assert.match(handler, /zGet\('\/status'\)\.then\(renderStatus\)/, "/status có chữ dịch phía server ⇒ phải nạp lại");
  assert.match(handler, /refreshChecks\(true\)/, "detail của /check là tr() phía server và có cache 10′ theo ngôn ngữ cũ ⇒ fresh");
  assert.match(handler, /renderSystem\(\);refreshHarnessUpdates\(\)/, "widget vẽ bằng t() phải vẽ lại từ dữ liệu đang có");
});

test("② lang nằm trong lưới flagsAt của renderMem và được đóng dấu lúc bấm", () => {
  assert.match(FE("gm.js"), /\['hybrid','rerank','scope','pathsWatch','lang'\]/, "payload cũ không được đè lang vừa chọn trong 90 s");
  assert.match(FE("sources.js"), /Z\.mem\.lang=L;Z\.flagsAt=Z\.flagsAt\|\|\{\};Z\.flagsAt\.lang=Date\.now\(\)/, "cú bấm phải đóng dấu + ghi giá trị local");
});

test("③ nút VI/EN sáng trong applyI18n (được /ping nuôi sớm), không chờ renderMem", () => {
  const chrome = FE("chrome.js");
  const i = chrome.indexOf("function applyI18n(");
  const body = chrome.slice(i, chrome.indexOf("\n  }", i));
  assert.match(body, /zid\('langVi'\)[\s\S]*classList\.toggle\('on',LANG==='vi'\)/, "applyI18n phải tô nút theo LANG");
  assert.doesNotMatch(FE("gm.js"), /zid\('langVi'\),le=zid\('langEn'\);if\(lv\)lv\.classList\.toggle/, "renderMem không còn tô nút riêng — một chỗ tô, không hai");
  assert.match(chrome, /if\(p&&p\.lang\)applyI18n\(p\.lang\);/, "zboot áp lang từ /ping (đã có từ 2026-09-07) — nay kéo luôn nút sáng theo");
});
