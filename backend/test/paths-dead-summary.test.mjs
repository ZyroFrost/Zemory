// Per-repo newly-dead paths on the "Repos on standard" surface (plan/21 §2.3 · user 2026-09-10).
// Guards: the pure summary (only repos with a sticky newly-dead set; root match is canonical; sorted), and the
// three FE files actually consume it (chip + dialog · Projects card · both i18n dictionaries).
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deadPathsSummary } from "../../dist/docs/paths.js";

const FE = (f) => readFileSync(new URL(`../../frontend/scripts/${f}`, import.meta.url), "utf8");
const win = process.platform === "win32";
const canon = (p) => (win ? resolve(p).toLowerCase() : resolve(p));

test("deadPathsSummary: only repos with a firstSeen; root matching by canon (Windows is case-insensitive); sample of 3 or fewer; sorted descending", () => {
  const A = win ? "D:\\X\\Dept_OPS" : "/x/Dept_OPS";
  const B = win ? "D:\\X\\Quiet" : "/x/Quiet";
  const C = win ? "D:\\X\\Loud" : "/x/Loud";
  const entry = (firstSeen) => ({ baselineAt: "2026-09-09T15:32:00.000Z", baseline: [], lastAt: "2026-09-10T00:00:00.000Z", lastDead: Object.keys(firstSeen), firstSeen });
  const state = { version: 1, projects: {
    [canon(A)]: entry({ "assets/theme/duanbi.json": "2026-09-09T16:58:00.000Z" }),
    [canon(B)]: entry({}),
    [canon(C)]: entry({ "a/1.md": "2026-09-10T01:00:00.000Z", "a/2.md": "2026-09-10T00:30:00.000Z", "a/3.md": "2026-09-10T02:00:00.000Z", "a/4.md": "2026-09-10T03:00:00.000Z" }),
  } };
  const projects = [{ root: B, name: "Quiet" }, { root: win ? A.toUpperCase() : A, name: "Dept_OPS" }, { root: C, name: "Loud" }, { root: win ? "D:\\X\\NotInState" : "/x/NotInState", name: "Nope" }];
  const r = deadPathsSummary(state, projects);
  assert.deepEqual(r.map((x) => [x.name, x.newlyDead]), [["Loud", 4], ["Dept_OPS", 1]], "repo không có mới chết và repo không có trong state KHÔNG được liệt kê");
  assert.equal(r[0].sample.length, 3, "sample cắt ở 3");
  assert.equal(r[0].since, "2026-09-10T00:30:00.000Z", "since = mốc firstSeen sớm nhất");
  assert.equal(r[1].sample[0], "assets/theme/duanbi.json");
});

test("the FE consumes all three places: chip and dialog (system.js), the Projects card (sources.js), i18n in both dictionaries (chrome.js)", () => {
  const sys = FE("system.js"), src = FE("sources.js"), chrome = FE("chrome.js");
  assert.match(sys, /r\.deadPaths/, "system.js phải đọc deadPaths từ /harness-updates");
  assert.match(sys, /Z\.updDead=/, "system.js phải lưu Z.updDead cho hộp thoại + thẻ");
  assert.match(sys, /'upd\.deadHdr'/, "hộp thoại phải có khối đường dẫn mới chết");
  assert.match(src, /Z\.updDead/, "sources.js phải gắn badge từ cùng nguồn Z.updDead");
  assert.match(src, /t\('proj\.deadOld'\)/, "thẻ Dự án phải có badge ⚠ N đường chết");
  assert.match(src, /\+deadB\+/, "badge phải được NỐI vào markup thẻ — khai biến rồi bỏ quên là vỏ rỗng (đột biến m3 bắt được)");
  const cut = chrome.indexOf("},en:{");
  assert.ok(cut > 0, "neo hai dict");
  const vi = chrome.slice(0, cut), en = chrome.slice(cut);
  assert.match(sys, /'upd\.stdHdr'/, "mục ① phải có tiêu đề riêng — hai mục, hai tiêu đề (user 2026-09-10)");
  assert.match(sys, /t\('upd\.deadRow'\)/, "hàng repo phải nói con số là gì, không để số trơ");
  for (const k of ["rail.deadOld", "rail.deadSub", "upd.stdHdr", "upd.stdOff", "upd.deadHdr", "upd.deadStatus", "upd.deadRow", "upd.deadSince", "upd.deadNone", "upd.deadHint", "proj.deadOld", "proj.deadOldTip"]) {
    assert.ok(vi.includes(`'${k}':`), `vi thiếu ${k}`);
    assert.ok(en.includes(`'${k}':`), `en thiếu ${k}`);
  }
});
