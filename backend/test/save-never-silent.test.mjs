// GẠT MỘT CÔNG TẮC LÀ MỘT LỜI HỨA "ĐÃ LƯU" — không lưu được thì phải RÚT LỜI, không im.
//
// User báo 2026-09-10: *"tui tắt rồi bạn mở lại nó vẫn y như cũ, setting tính năng ko bao giờ dc
// lưu"*. Tầng lưu KHÔNG hỏng (tắt → restart → vẫn tắt, đo được). Hỏng ở bề mặt: mọi công tắc lật
// nút TRƯỚC rồi mới gửi, và mọi đường gạt đều kết bằng `.catch(function(){})` — nuốt sạch. Nền
// đang tắt/bận ⇒ nút sáng, không gì được ghi, không ai báo; mở lại thì về như cũ.
//
// `02_RULES §Bề mặt CHẾT THEO nền` gọi tên đúng kiểu hỏng này: *"vỏ rỗng là kiểu hỏng TỆ NHẤT —
// nó không báo lỗi, nó NÓI DỐI"*. Cổng này canh để không ai bọc lại `catch` rỗng lần nữa.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const FE = (f) => readFileSync(new URL(`../../frontend/scripts/${f}`, import.meta.url), "utf8");
const CORE = FE("core.js");

test("zSave bắt ĐỦ BA kiểu 'không lưu được' — thiếu kiểu nào là còn một đường nói dối", () => {
  const body = /function zSave\(url,revert\)\{([\s\S]*?)\n {2}\}/.exec(CORE);
  assert.ok(body, "phải có zSave trong core.js");
  assert.match(body[1], /if\(!r\.ok\)throw/, "② HTTP ngoài 2xx phải tính là hỏng");
  // ③ là kiểu êm nhất: nền NHẬN request nhưng TỪ CHỐI ghi (vd /set-realtime không cắm nổi hook).
  // `zPost` cũ coi nó là thành công — đó là cách một 'ok:false' trở thành một nút sáng.
  assert.match(body[1], /if\(j&&j\.ok===false\)throw/, "③ nền trả {ok:false} phải tính là hỏng");
  assert.match(body[1], /\.catch\(function\(e\)\{/, "① gọi hỏng / không parse được cũng phải vào cùng một cửa");
  assert.match(body[1], /revert\(\)/, "hỏng thì phải HOÀN NGUYÊN nút");
  assert.match(body[1], /zToast\(t\('save\.failed'\)/, "và phải NÓI RA — im lặng chính là bug");
  assert.match(body[1], /return null;/, "luôn resolve (null = không lưu được) — không ném, để chỗ gọi khỏi bọc catch rỗng");
});

test("khoá i18n 'save.failed' có ở CẢ HAI từ điển", () => {
  const chrome = FE("chrome.js");
  assert.equal((chrome.match(/'save\.failed':/g) || []).length, 2, "thiếu một đầu = đổi ngôn ngữ xong vẫn thấy tiếng cũ");
});

test("MỌI công tắc lưu-thiết-lập đều đi qua zSave — không còn đường nào tự gửi rồi nuốt", () => {
  const sites = [
    ["system.js", /zSave\(ep\+'\?on='\+tg\.dataset\.on,undo\)/, "công tắc Hybrid · Dead paths ở màn Tính năng"],
    ["system.js", /zSave\('\/set-'\+nm\+'\?on='\+au\.dataset\.on,/, "công tắc Scheduler · Autostart · Auto-sync"],
    ["system.js", /zSave\('\/set-repo-std-check\?on='/, "ô tick kiểm chuẩn repo"],
    ["sources.js", /zSave\(url\+'\?on='\+\(on\?1:0\),function\(\)\{setTog\(name,!on\);\}\)/, "công tắc trong hộp Cài đặt"],
    ["sources.js", /zSave\('\/set-sync-attachments\?on='/, "công tắc Kèm ảnh"],
    ["sources.js", /zSave\('\/set-sync-level\?level='/, "chip mức đồng bộ"],
    ["recall.js", /zSave\('\/set-hybrid\?on='/, "chip Hybrid ở màn Recall (ghi CÙNG khoá với màn Tính năng)"],
    ["recall.js", /zSave\('\/set-rerank\?on='/, "chip Rerank ở màn Recall"],
  ];
  for (const [file, re, what] of sites) assert.match(FE(file), re, `${what} phải lưu qua zSave`);
});

test("KHÔNG công tắc nào còn tự gọi zPost tới /set-* rồi tự lo lấy", () => {
  // Ô nhập giá trị (lịch tự sync · chu kỳ tự kiểm · ngôn ngữ · đường Drive · bỏ qua project) là hình
  // dạng khác, chưa thuộc đợt này — liệt kê tên ra đây để lần sau đụng thì biết đã cố ý chừa cái nào.
  const ALLOWED = ["/set-autosync-schedule", "/set-checks-auto", "/set-lang", "/set-drive", "/set-project-ignore"];
  for (const f of ["core.js", "system.js", "sources.js", "recall.js", "chrome.js", "gm.js"]) {
    for (const m of FE(f).matchAll(/zPost\('(\/set-[a-z-]+)/g)) {
      assert.ok(ALLOWED.includes(m[1]), `${f}: ${m[1]} là thiết lập được LƯU mà vẫn dùng zPost — phải qua zSave`);
    }
  }
});

test("ô ngưỡng context không được báo 'Đã lưu' cho một lượt server TỪ CHỐI", () => {
  const src = FE("sources.js");
  const h = /if\(!e\.target\|\|e\.target\.id!=='ctxWarnPct'\)return;([\s\S]*?)\n {2}\}\);/.exec(src);
  assert.ok(h, "phải tìm được handler ctxWarnPct");
  assert.match(h[1], /zSave\('\/set-context-warn\?percent='/, "phải đi qua zSave để phân biệt ok:false");
  assert.match(h[1], /if\(!r\)return;/, "không lưu được thì KHÔNG toast 'Đã lưu'");
});
