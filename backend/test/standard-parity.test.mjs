// CỔNG PARITY CHUẨN — zemory (bản gốc) ↔ docs_template/* (bản ship cho mọi repo).
//
// Vì sao cổng này tồn tại: chuẩn sống ở NHIỀU bản sao (zemory + app + nonapp + adapt + cowork),
// và cho tới 2026-08-22 KHÔNG cơ chế nào giữ chúng khớp. Đo hôm đó ra bốn lỗ trôi im lặng:
//   · skill `audit` — zemory 11 mặt / template 7 mặt: thiếu ĐÚNG 4 mặt của `plan/18`, tức mọi repo
//     khác đang audit bằng bộ mặt CHỨNG MINH ĐƯỢC là không nhìn thấy các kiểu hỏng nặng nhất;
//   · `audit` thiếu 3 luật (đo hai đường · đột biến hoá · ca âm);
//   · skill `sync-path` chỉ tồn tại trong zemory, không bộ nào ship lẫn liệt kê;
//   · luật cứng `Bề mặt CHẾT THEO nền` không có trong bất kỳ bộ nào.
// Bằng chứng nó phụ thuộc TRÍ NHỚ: mặt ⑪ thêm 22/08 thì ship đủ (lượt đó cố ý làm), còn cụm 4 mặt
// thêm 11/08 thì chưa bao giờ đi. `template-parity` cũ chỉ canh byte `guard.cjs` + thành viên
// pull/fill/upload ⇒ mọi thứ còn lại trôi mà không cổng nào kêu.
//
// Nguyên tắc của cổng: MIỄN phải là DANH SÁCH TƯỜNG MINH, không phải "khác thì bỏ qua". Mỗi mục
// miễn kèm lý do; danh sách phình lên là thấy ngay trong diff — cùng doctrine `i18n-ratchet`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SETS = ["app", "nonapp", "adapt"]; // cowork CỐ Ý ngoài phạm vi: bộ rút gọn cho môi trường
//                                          không có CLI + ngữ cảnh ngắn (user chốt 2026-08-22)

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const zSkillDir = join(ROOT, ".claude/skills");
const tSkillDir = (s) => join(ROOT, "docs_template", s, ".claude/skills");

/** Skill của zemory KHÔNG phải ship cho mọi repo — phải ghi lý do, không để trống cho tiện. */
const ZEMORY_ONLY_SKILLS = {
  // (rỗng) — mọi skill hiện tại đều generic. Thêm mục vào đây là một QUYẾT ĐỊNH: nói rõ vì sao
  // repo khác không cần nó, đừng dùng nó làm chỗ nhét skill mình quên ship.
};

/** Skill mà MỘT bộ cố ý không mang, vì luật của chính bộ đó cấm việc skill ấy làm. */
const SET_DROPS = {
  adapt: {
    reconcile:
      "hệ adapt CẤM dời/đổi tên/xoá folder của repo (`03_STRUCTURE §0.1`) — nắn repo là việc bị cấm ở đó; " +
      "nó có `adopt/` thay thế: ánh xạ cấu trúc SẴN CÓ sang slot, không đụng cây thư mục",
  },
};

/** Luật `02_RULES §Luật khi VIẾT` mà bộ NON-APP cố ý KHÔNG mang — non-app không phát triển app. */
const NONAPP_DROPS = {
  "SQL — 1 CÁCH": "non-app có luật riêng `SQL/DAX/M` (gom queries/ hoặc measures/)",
  "Sync bundle qua git": "non-app có luật riêng `Nhị phân nặng` cho LFS",
  "Setting UI kéo-thả": "0 luật UI (non-app không phát triển app)",
  "Panel resize (LUẬT)": "0 luật UI",
  "Dialog / modal": "0 luật UI",
  Test: "non-app không có bộ test code",
  Version: "non-app không phát hành build",
  "2 KIỂU version-up": "non-app không phát hành build",
  "Backup deploy 2 CHIỀU": "non-app không deploy lên máy đích",
};

/** Luật CÓ MẶT nhưng mang TÊN KHÁC ở bộ non-app — bí danh, KHÔNG phải thiếu.
 *  Ghi tường minh vì đây là chỗ dễ nới lỏng phép so cho "hết đỏ": thêm bí danh là khẳng định
 *  *"luật đó có thật, chỉ khác tên"* — sai thì thành cổng bịt miệng chính nó. */
const NONAPP_ALIAS = {
  Secret: "Secret/connection", // cùng nội dung: config trỏ TÊN env, giá trị thật ra .env/vault
};

function ruleLabels(path) {
  const L = read(path).split(/\r?\n/);
  const h = L.findIndex((l) => l.startsWith("## Luật khi VIẾT"));
  assert.ok(h >= 0, `${path}: không tìm thấy §Luật khi VIẾT`);
  const s = L.indexOf("```", h);
  const e = L.indexOf("```", s + 1);
  assert.ok(s > 0 && e > s, `${path}: khối luật không đóng đúng`);
  return L.slice(s + 1, e)
    .filter((l) => l.trim() && !/^\s/.test(l))
    .map((l) => l.slice(0, 21).trim());
}

const faceCount = (txt) => (txt.match(/^\d+\. \*\*/gm) ?? []).length;
const lawCount = (txt) => (txt.match(/^\*\*Luật \d+ /gm) ?? []).length;

test("mọi skill generic của zemory đều được SHIP sang cả 3 bộ template", () => {
  const zSkills = readdirSync(zSkillDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !(n in ZEMORY_ONLY_SKILLS));
  assert.ok(zSkills.length >= 8, `đếm được ${zSkills.length} skill — quá ít, phép đo có thể hỏng`);
  for (const s of SETS) {
    for (const skill of zSkills) {
      if (SET_DROPS[s]?.[skill]) continue; // miễn tường minh, có lý do ghi cạnh
      assert.ok(
        existsSync(join(tSkillDir(s), skill, "SKILL.md")),
        `bộ ${s} THIẾU skill \`${skill}\` — zemory có mà template không ship (đúng lỗ đã đo 2026-08-22)`,
      );
    }
  }
});

test("skill đã ship thì phải được ĐĂNG KÝ ở 04_SKILLS + bảng trigger AGENTS (ship mà không khai = không ai mở)", () => {
  for (const s of SETS) {
    const reg = read(`docs_template/${s}/agent/04_SKILLS.md`);
    const agents = read(`docs_template/${s}/AGENTS.md`);
    for (const skill of readdirSync(tSkillDir(s), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
      assert.ok(reg.includes(`\`${skill}/\``), `bộ ${s}: skill \`${skill}\` có file mà 04_SKILLS không liệt kê`);
      assert.ok(agents.includes(`skills/${skill}/SKILL.md`), `bộ ${s}: skill \`${skill}\` không có hàng trigger trong AGENTS.md`);
    }
  }
});

test("skill audit: số MẶT và số LUẬT của template phải KHỚP bản zemory", () => {
  const z = read(".claude/skills/audit/SKILL.md");
  const zf = faceCount(z), zl = lawCount(z);
  assert.equal(zf, 11, `bản zemory đang có ${zf} mặt — nếu đổi có chủ đích thì sửa cả cổng này`);
  assert.ok(zl >= 7, `bản zemory chỉ có ${zl} luật — phép đo nghi hỏng`);
  for (const s of SETS) {
    const t = read(`docs_template/${s}/.claude/skills/audit/SKILL.md`);
    assert.equal(faceCount(t), zf, `bộ ${s}: audit ${faceCount(t)} mặt vs zemory ${zf} — đúng lỗ 7-vs-11 đã đo`);
    assert.equal(lawCount(t), zl, `bộ ${s}: audit ${lawCount(t)} luật vs zemory ${zl}`);
  }
});

test("skill audit: câu dẫn phải nói ĐÚNG số mặt của tiêu đề (đã dính 3 lần: 6-vs-11, 7-vs-11, ba-vs-bốn)", () => {
  const files = [".claude/skills/audit/SKILL.md", ...SETS.map((s) => `docs_template/${s}/.claude/skills/audit/SKILL.md`)];
  for (const f of files) {
    const txt = read(f);
    const head = /### (\d+) mặt — chạy đủ/.exec(txt);
    const intro = /chạy đủ \*\*(\d+) mặt\*\*/.exec(txt);
    assert.ok(head, `${f}: không tìm thấy tiêu đề "### N mặt — chạy đủ"`);
    assert.ok(intro, `${f}: câu dẫn không nói số mặt`);
    assert.equal(intro[1], head[1], `${f}: câu dẫn nói ${intro[1]} mặt nhưng tiêu đề nói ${head[1]} — file tự mâu thuẫn`);
  }
});

test("luật cứng §Luật khi VIẾT: app + adapt mang ĐỦ, nonapp chỉ được thiếu đúng danh sách miễn", () => {
  const z = ruleLabels("docs/agent/02_RULES.md");
  assert.ok(z.length >= 10, `zemory chỉ đọc ra ${z.length} luật — phép đo nghi hỏng`);
  for (const s of SETS) {
    const t = ruleLabels(`docs_template/${s}/agent/02_RULES.md`);
    const has = (r) => t.includes(r) || (s === "nonapp" && NONAPP_ALIAS[r] && t.includes(NONAPP_ALIAS[r]));
    const missing = z.filter((r) => !has(r));
    if (s === "nonapp") {
      const unjustified = missing.filter((r) => !(r in NONAPP_DROPS));
      assert.deepEqual(unjustified, [], `bộ nonapp thiếu luật KHÔNG có lý do miễn: ${unjustified.join(" | ")}`);
    } else {
      assert.deepEqual(missing, [], `bộ ${s} thiếu luật cứng: ${missing.join(" | ")}`);
    }
  }
});

test("TỰ KIỂM phép đo — đếm mặt/luật/nhãn phải khác 0 (0 hit đọc thành 'khớp' là bẫy)", () => {
  // Luật 5 của chính skill audit: công cụ hỏng lặng trả rỗng ⇒ mọi so sánh đều "bằng nhau".
  assert.ok(faceCount(read(".claude/skills/audit/SKILL.md")) > 0, "đếm mặt trả 0 — regex hỏng");
  assert.ok(lawCount(read(".claude/skills/audit/SKILL.md")) > 0, "đếm luật trả 0 — regex hỏng");
  assert.ok(ruleLabels("docs/agent/02_RULES.md").length > 0, "đọc nhãn luật trả rỗng — bộ tách hỏng");
  assert.ok(faceCount("1. **x**\n2. **y**") === 2, "đếm mặt sai trên chuỗi dựng tại chỗ");
  assert.ok(lawCount("**Luật 1 — a**\n**Luật 2 — b**") === 2, "đếm luật sai trên chuỗi dựng tại chỗ");
});
