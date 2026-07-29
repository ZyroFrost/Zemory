// The per-session read set is a CONTRACT, and it drifts silently.
//
// 2026-07-29: `03_STRUCTURE` left the every-session read set. It is a slot dictionary +
// app index — the agent looks up the part it needs when adding/renaming a slot, and
// `zemory conform` (now wired into `npm run check`) mechanically catches structural drift,
// so nothing is left unguarded. That saved 41,7 KB per session out of ~96 KB of rule layer.
//
// Two things can quietly undo it, so both are pinned here:
//   1. someone re-adds 03_STRUCTURE to the "ĐỌC HẾT" list in AGENTS.md;
//   2. the ~10 rules that fire WHILE WRITING CODE (which conform CANNOT check) drift back
//      into 03, where nobody reads them any more.
// Applies to the repo and to BOTH templates — a template that ships the old contract puts
// every new project back where this started.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const AGENTS = ["AGENTS.md", "docs_template/app/AGENTS.md", "docs_template/nonapp/AGENTS.md"];

// Rules that fire while WRITING, not while creating folders. conform is blind to all of
// them (its checks are off-standard-dir · empty-slot-dir · harness-missing · hp-uncited ·
// skill-roster-drift · dangling-ref), so they must sit in the always-loaded 02_RULES.
const WRITE_TIME = {
  app: ["SQL — 1 CÁCH", "Panel resize", "Dialog / modal", "Backup deploy", "2 KIỂU version-up", "Sync bundle qua git"],
  nonapp: ["Secret/connection", "SQL/DAX/M", "Nhị phân nặng", "Data thật vs mẫu"],
};

test("AGENTS.md không liệt kê 03_STRUCTURE trong danh sách ĐỌC HẾT", () => {
  for (const f of AGENTS) {
    const line = read(f)
      .split(/\r?\n/)
      .find((l) => l.includes("ĐỌC HẾT"));
    assert.ok(line, `${f}: không tìm thấy dòng "ĐỌC HẾT"`);
    assert.ok(
      !/03_STRUCTURE/.test(line),
      `${f}: 03_STRUCTURE bị đưa trở lại danh sách đọc mỗi phiên — nó là từ điển để TRA`,
    );
  }
});

test("AGENTS.md nêu RÕ trigger phải mở 03_STRUCTURE", () => {
  // Bỏ khỏi bộ đọc mà không nói khi nào mở = agent không bao giờ mở, và chuẩn thành
  // giấy lộn. Trigger phải nằm ngay trong file điều hướng.
  for (const f of AGENTS) {
    const t = read(f);
    assert.match(t, /03_STRUCTURE[^\n]*TRA|TỪ ĐIỂN SLOT/u, `${f}: thiếu lời khai 03 là từ điển để tra`);
    assert.match(t, /tạo\/đổi tên\/dời folder|thêm hoặc sửa slot/u, `${f}: thiếu trigger "khi nào mở 03"`);
    assert.match(t, /conform/u, `${f}: không nhắc conform — máy canh chuẩn thay việc đọc`);
  }
});

test("conform được nối vào gate, không phải chạy tay", () => {
  // Trước 2026-07-29 conform không nằm trong gate lẫn hook nào: chuẩn chỉ được kiểm khi
  // có người nhớ gõ. Bỏ 03 khỏi bộ đọc trong lúc đó = không còn ai canh.
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts.check, /conform/, "`npm run check` phải gọi conform");
  assert.match(pkg.scripts.conform ?? "", /--gate/, "script conform phải dùng --gate (exit 1 khi lệch)");
});

test("luật khi VIẾT nằm ở 02_RULES, KHÔNG còn ở 03_STRUCTURE", () => {
  for (const [profile, names] of Object.entries(WRITE_TIME)) {
    const base = `docs_template/${profile}/agent`;
    const rules = read(`${base}/02_RULES.md`);
    const structure = read(`${base}/03_STRUCTURE.md`);
    for (const n of names) {
      assert.ok(rules.includes(n), `${profile}/02_RULES thiếu luật "${n}" — nó sẽ không được đọc ở đâu cả`);
      assert.ok(
        !structure.split(/\r?\n/).some((l) => l.startsWith(n)),
        `${profile}/03_STRUCTURE còn giữ "${n}" — hai nguồn sự thật (điều 3)`,
      );
    }
  }
});

test("repo zemory cũng theo đúng hợp đồng đó", () => {
  const rules = read("docs/agent/02_RULES.md");
  const structure = read("docs/agent/03_STRUCTURE.md");
  for (const n of WRITE_TIME.app) {
    assert.ok(rules.includes(n), `02_RULES thiếu luật "${n}"`);
    assert.ok(!structure.split(/\r?\n/).some((l) => l.startsWith(n)), `03_STRUCTURE còn giữ "${n}"`);
  }
  assert.match(rules, /## Luật khi VIẾT/u, "02_RULES phải có mục §Luật khi VIẾT");
});

test("03_STRUCTURE để lại con trỏ tới nơi luật đã dời đến", () => {
  // Người đọc 03 tìm luật SQL/dialog phải được chỉ đường, không gặp khoảng trống.
  for (const p of ["docs/agent/03_STRUCTURE.md", "docs_template/app/agent/03_STRUCTURE.md", "docs_template/nonapp/agent/03_STRUCTURE.md"]) {
    if (!existsSync(join(ROOT, p))) continue;
    assert.match(read(p), /Luật khi VIẾT[^\n]*02_RULES/u, `${p}: thiếu con trỏ tới 02_RULES §Luật khi VIẾT`);
  }
});

test("template KHÔNG trích số điều hiến pháp (hiến pháp là per-project)", () => {
  // Bản mẫu 01_CONSTITUTION chỉ có 1 điều placeholder, nên mọi câu "điều 13" trong
  // template làm `conform` của project VỪA INIT đỏ ngay — lỗi do bản mẫu, không do user.
  for (const p of ["app", "nonapp"]) {
    for (const f of ["02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md"]) {
      const path = `docs_template/${p}/agent/${f}`;
      if (!existsSync(join(ROOT, path))) continue;
      const hits = read(path).match(/(?:HP )?điều \d+/gu) ?? [];
      assert.deepEqual(hits, [], `${path} trích số điều: ${hits.join(", ")} — nêu nguyên tắc bằng chữ`);
    }
  }
});
