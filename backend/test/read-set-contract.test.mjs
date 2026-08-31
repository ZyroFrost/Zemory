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

const AGENTS = ["AGENTS.md", "docs_template/05_app/AGENTS.md", "docs_template/03_nonapp/AGENTS.md"];

// Rules that fire while WRITING, not while creating folders. conform is blind to all of
// them (its checks are off-standard-dir · empty-slot-dir · harness-missing · hp-uncited ·
// skill-roster-drift · dangling-ref), so they must sit in the always-loaded 02_RULES.
const WRITE_TIME = {
  "05_app": ["SQL — 1 CÁCH", "Panel resize", "Dialog / modal", "Backup deploy", "2 KIỂU version-up", "Sync bundle qua git"],
  "03_nonapp": ["Secret/connection", "SQL/DAX/M", "Nhị phân nặng", "Data thật vs mẫu"],
};

test("AGENTS.md không liệt kê 03_STRUCTURE trong danh sách ĐỌC HẾT", () => {
  for (const f of AGENTS) {
    const line = read(f)
      .split(/\r?\n/)
      .find((l) => l.includes("ĐỌC HẾT"));
    assert.ok(line, `${f}: không tìm thấy dòng "ĐỌC HẾT"`);
    // Chỉ soi phần LIỆT KÊ. Từ Phase 3 (2026-07-31) chính dòng này cũng là chỗ khai
    // loại trừ ("`03_STRUCTURE` và `04_SKILLS` KHÔNG nằm trong bộ này"), nên khớp thô
    // `/03_STRUCTURE/` là bắt đúng câu tuyên bố loại trừ — báo oan.
    // Chỉ soi phần LIỆT KÊ. Chính dòng này cũng là chỗ khai loại trừ ("`03_STRUCTURE` và
    // `04_SKILLS` KHÔNG nằm trong bộ này"), nên khớp thô là bắt đúng câu tuyên bố loại trừ.
    // KHÔNG cắt ở "KHÔNG" đầu tiên: dòng mở đầu bằng "KHÔNG bỏ sót", cắt ở đó là còn chuỗi
    // rỗng — một phép kiểm không bao giờ đỏ được.
    const listed = line.split("`03_STRUCTURE` và")[0];
    assert.ok(listed.includes("01_CONSTITUTION"), `${f}: không đọc được danh sách để kiểm`);
    for (const doc of ["03_STRUCTURE", "04_SKILLS"]) {
      assert.ok(
        !listed.includes(doc),
        `${f}: ${doc} bị đưa trở lại danh sách đọc mỗi phiên — nó là thứ để TRA, mở khi trúng trigger`,
      );
    }
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

test("luật KHÔNG BỊA có ở mọi bản 02_RULES, và chỉ MỘT bản (không đẻ luật trùng)", () => {
  // 2026-07-30: luật cũ chỉ phủ CON SỐ ("một phép đo chưa kiểm chéo"), nên các khẳng định
  // phi-số vẫn lọt — agent đoán trạng thái cửa sổ, đoán click đã ăn, đoán chỗ hỏng của
  // parser, cả ba đều sai. Nới đúng bullet đã có thay vì thêm bullet mới; gate này khoá cả
  // hai đầu: phải CÓ luật, và KHÔNG được có bản thứ hai cùng nghĩa.
  const FILES = [
    "docs/agent/02_RULES.md",
    "docs_template/05_app/agent/02_RULES.md",
    "docs_template/03_nonapp/agent/02_RULES.md",
    "docs_template/01_cowork_basic/nonapp/agent/02_RULES.md",
  ];
  for (const f of FILES) {
    const t = read(f);
    const n = (t.match(/CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT/gu) ?? []).length;
    assert.equal(n, 1, `${f}: phải có ĐÚNG 1 bản luật (đang có ${n})`);
    assert.equal(
      (t.match(/MỘT PHÉP ĐO CHƯA/gu) ?? []).length,
      0,
      `${f}: bản CŨ hẹp hơn còn sót — hai bản cùng nghĩa là luật trùng`,
    );
    // Ba vế bắt buộc: phủ mọi khẳng định · đòi nguồn kiểm được · cho phép nói KHÔNG BIẾT.
    assert.match(t, /mọi khẳng định/u, `${f}: luật phải nói rõ phủ MỌI khẳng định, không riêng con số`);
    assert.match(t, /nguồn kiểm được/u, `${f}: luật phải đòi nguồn kiểm được`);
    assert.match(t, /không biết \/ chưa xác minh được/u, `${f}: thiếu vế "tra không ra thì nói KHÔNG BIẾT"`);
  }
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
  for (const n of WRITE_TIME["05_app"]) {
    assert.ok(rules.includes(n), `02_RULES thiếu luật "${n}"`);
    assert.ok(!structure.split(/\r?\n/).some((l) => l.startsWith(n)), `03_STRUCTURE còn giữ "${n}"`);
  }
  assert.match(rules, /## Luật khi VIẾT/u, "02_RULES phải có mục §Luật khi VIẾT");
});

test("03_STRUCTURE để lại con trỏ tới nơi luật đã dời đến", () => {
  // Người đọc 03 tìm luật SQL/dialog phải được chỉ đường, không gặp khoảng trống.
  for (const p of ["docs/agent/03_STRUCTURE.md", "docs_template/05_app/agent/03_STRUCTURE.md", "docs_template/03_nonapp/agent/03_STRUCTURE.md"]) {
    if (!existsSync(join(ROOT, p))) continue;
    assert.match(read(p), /Luật khi VIẾT[^\n]*02_RULES/u, `${p}: thiếu con trỏ tới 02_RULES §Luật khi VIẾT`);
  }
});

test("template KHÔNG trích số điều hiến pháp (hiến pháp là per-project)", () => {
  // Bản mẫu 01_CONSTITUTION chỉ có 1 điều placeholder, nên mọi câu "điều 13" trong
  // template làm `conform` của project VỪA INIT đỏ ngay — lỗi do bản mẫu, không do user.
  for (const p of ["05_app", "03_nonapp"]) {
    for (const f of ["02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md"]) {
      const path = `docs_template/${p}/agent/${f}`;
      if (!existsSync(join(ROOT, path))) continue;
      const hits = read(path).match(/(?:HP )?điều \d+/gu) ?? [];
      assert.deepEqual(hits, [], `${path} trích số điều: ${hits.join(", ")} — nêu nguyên tắc bằng chữ`);
    }
  }
});
