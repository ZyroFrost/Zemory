// Check `vector` / `rerank`: trước đây hai mục này chỉ hiện trạng thái theo CÔNG TẮC trong
// config — nói "on" kể cả khi model không tải nổi. `embedProbe`/`rerankProbe`/`embedDims`
// viết ra đúng để kiểm thật nhưng bị bỏ MỒ CÔI (audit 2026-07-28: mỗi hàm xuất hiện đúng
// 1 lần = chỉ có định nghĩa). Nay nối vào; test này canh hai điều dễ sai:
//   ① dims phải lấy từ INDEX ĐÃ BUILD, không phải dims thô của model (bản đầu in 768d
//      trong khi index thật 256d — bề mặt chỉ-đọc nói sai còn nguy hơn báo lỗi);
//   ② rerank TẮT là trạng thái ĐÚNG (opt-in), không được coi là lỗi.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../src/checks.ts", import.meta.url), "utf8");

test("check `vector` + `rerank` tồn tại và đi qua PROBE thật, không đọc công tắc", () => {
  assert.match(SRC, /feature === "vector"/, "phải có nhánh check vector");
  assert.match(SRC, /feature === "rerank"/, "phải có nhánh check rerank");
  assert.match(SRC, /await embedProbe\(\)/, "vector phải gọi embedProbe (kiểm model THẬT)");
  assert.match(SRC, /await rerankProbe\(\)/, "rerank phải gọi rerankProbe");
});

test("dims lấy từ vec_config (stored-dims-authoritative), KHÔNG phải dims model", () => {
  assert.match(SRC, /vectorIndexInfo\(\)\.dims/, "phải đọc dims đã build; in dims model là nói sai với người dùng");
  const branch = SRC.slice(SRC.indexOf('feature === "vector"'), SRC.indexOf('feature === "rerank"'));
  const storedAt = branch.indexOf("vectorIndexInfo");
  const nativeAt = branch.indexOf("embedDims()");
  assert.ok(storedAt >= 0 && nativeAt > storedAt, "dims đã build phải được ưu tiên TRƯỚC dims model");
});

test("rerank TẮT vẫn ok=true — opt-in là trạng thái đúng, không phải lỗi (plan/05 §4.E)", () => {
  const branch = SRC.slice(SRC.indexOf('feature === "rerank"'));
  assert.match(branch, /getRerankSetting\(\)/, "phải đọc công tắc để phân biệt tắt-có-chủ-đích với hỏng");
  assert.match(branch, /ok: true,\s*state: "off"/, "tắt ⇒ ok=true state=off, KHÔNG được báo đỏ");
});

test("`/automation` phơi cờ job nền (thứ đã làm mọi endpoint chậm 2–9× mà UI im lặng)", () => {
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  assert.match(UI, /embedRunning: schedulerChildRunning\(\)/, "payload automation phải có embedRunning");
});

test("`doctor` cảnh báo khi tồn tại HAI file config.json", () => {
  const H = readFileSync(new URL("../src/commands/harness.ts", import.meta.url), "utf8");
  assert.match(H, /function warnStrayConfig\(\)/, "phải có hàm cảnh báo");
  assert.match(H, /warnStrayConfig\(\);/, "và doctor phải GỌI nó — định nghĩa suông thì vô dụng");
  assert.match(H, /currentMemoryDir\(\)/, "so bản cạnh DB (bản THẬT) với bản ở home");
  assert.ok(!/unlinkSync|rmSync/.test(H.slice(H.indexOf("warnStrayConfig"), H.indexOf("cmdDoctor"))),
    "CHỈ báo, không được tự xoá file của người dùng");
});

test("CSS `.bell` đã gỡ và không phần tử nào dùng", () => {
  const CSS = readFileSync(new URL("../../frontend/styles/app.css", import.meta.url), "utf8");
  const MK = readFileSync(new URL("../../frontend/pages/app.html", import.meta.url), "utf8")
    + readFileSync(new URL("../../frontend/scripts/app.js", import.meta.url), "utf8");
  assert.equal((CSS.match(/\.bell\b/g) ?? []).length, 0, "rule chết phải gỡ");
  assert.equal((MK.match(/class="[^"]*\bbell\b/g) ?? []).length, 0, "và không nơi nào dùng lại");
});

// ---- Nối đủ đường: backend có probe thì UI phải BẤM ĐƯỢC và THẤY kết quả ----
//
// Tự bắt 2026-07-28: nối probe vào `runCheck` xong tôi tưởng là xong, nhưng nút "Kiểm" chỉ
// render cho `kind==='check'` — mà vector là 'stat', rerank là 'toggle' ⇒ hai check mới chỉ
// gọi được bằng curl, tức vẫn mồ côi, chỉ đổi chỗ. Rồi vá tiếp vẫn còn nửa vời: kết quả nằm
// im trong `Z.checks` vì `sysStatus` chỉ đọc nó cho kind='check'. Test này canh CẢ BA khâu.

import { readFileSync as rf } from "node:fs";
const APPJS = rf(new URL("../../frontend/scripts/app.js", import.meta.url), "utf8");

test("vector + rerank khai `probe` ⇒ có nút Kiểm trong UI", () => {
  // KHÔNG dùng [^}]* — entry rerank có hàm lồng `get:function(m){…}` nên nó dừng sớm
  // (test đỏ oan lần đầu). Cắt theo mốc entry kế tiếp mới đúng.
  const entry = (k) => {
    const at = APPJS.indexOf(`{k:'${k}'`);
    assert.ok(at > 0, `không thấy entry ${k}`);
    return APPJS.slice(at, APPJS.indexOf("{k:'", at + 5));
  };
  assert.match(entry("vector"), /probe:'vector'/, "vector phải khai probe");
  assert.match(entry("rerank"), /probe:'rerank'/, "rerank phải khai probe");
  assert.match(APPJS, /if\(f\.probe\)return '<button class="btn sm" data-sys-check/, "phải render nút cho feature có probe");
});

test("kết quả probe được HIỂN THỊ, không nằm im trong Z.checks", () => {
  assert.match(APPJS, /function probeLine\(f\)/, "phải có hàm vẽ kết quả probe");
  assert.match(APPJS, /\+probeLine\(f\)/, "và renderSysDetail phải GỌI nó — định nghĩa suông thì vẫn vô hình");
  assert.match(APPJS, /probeLine[\s\S]{0,400}Z\.checks/, "probeLine phải đọc kết quả từ Z.checks");
});
