// gate-cage.ps1 chạy dưới PowerShell 5.1, vốn đọc .ps1 KHÔNG BOM theo bảng mã ANSI ⇒ chuỗi không-ASCII
// nó IN ra thành rác (đo 25/09: "đỉnh RAM" in thành "Ä‘á»‰nh RAM" ở cuối mọi lượt gate).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("gate-cage.ps1: mọi chuỗi được IN ra là ASCII (chú thích thì được tiếng Việt)", () => {
  const src = readFileSync(new URL("../scripts/gate-cage.ps1", import.meta.url), "utf8");
  const printed = src
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .filter((l) => /Write-(Host|Error|Output|Warning)|throw new Exception/.test(l));
  assert.ok(printed.length >= 4, `phải thấy các dòng in ra — thấy ${printed.length}`);
  const bad = printed.filter((l) => /[\u0080-￿]/.test(l.replace(/#.*$/, "")));
  assert.deepEqual(bad, [], "dòng in ra có ký tự không-ASCII");
});
