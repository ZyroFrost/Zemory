// The harness ships TWO complete, standalone-readable template trees —
// docs_template/05_app/ (runnable code) and docs_template/03_nonapp/ (BI/data/docs/
// design deliverables). Most files legitimately differ (02_RULES drops UI,
// 03_STRUCTURE is a different standard, 04_SKILLS adds pull/fill/upload). But the
// SHARED SHELLS must stay byte-identical so the common harness never drifts
// between profiles — locked here by CODE, the same "sync by gate, not memory"
// doctrine as structure-sync (constitution điều 13).

import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const PROFILES = ["05_app", "03_nonapp"];
const STANDARD = [
  "AGENTS.md",
  "CLAUDE.md",
  "agent/01_CONSTITUTION.md",
  "agent/02_RULES.md",
  "agent/03_STRUCTURE.md",
  "agent/04_SKILLS.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];
// Files that MUST be identical across the two profiles (the profile-neutral shells).
// AGENTS.md is NOT in this list since Phase 3 (2026-07-31): its trigger table names
// the skills each profile actually ships, and non-app ships three more (pull · fill ·
// upload). Byte-identity there would force the app tree to advertise skills it does
// not have — a pointer to a missing file is worse than an admitted difference. The
// part that still must not drift (the router that asks app-vs-non-app) is compared
// separately below, prefix-wise.
const SHARED = [
  // CLAUDE.md is a pure `@AGENTS.md` import — profile-neutral by construction, so
  // any drift between the two trees would be an accident, not a design choice.
  "CLAUDE.md",
  "agent/01_CONSTITUTION.md",
  "agent/05_TODO.md",
  "agent/06_CHANGES.md",
  "plan/00_overview.md",
];

const read = (profile, rel) =>
  readFileSync(new URL(`../../docs_template/${profile}/${rel}`, import.meta.url), "utf8");

test("the cowork set carries EXACTLY the generated guard (a hand copy drifts, and a line count cannot catch it)", () => {
  // The cowork set is the ONLY one that ships `hooks/guard.cjs` ready-made (there is no CLI to generate it on site), so
  // that copy must be a BYTE COPY of what `zemory hook guard` produces. Today it is copied BY HAND — and the only
  // gate watching it was the line count in the BOOTSTRAP MANIFEST, meaning two files differing in content but
  // matching in line count would SLIP THROUGH. This gate compares every byte.
  const gen = readFileSync(new URL("../../docs/hooks/guard.cjs", import.meta.url), "utf8");
  const shipped = readFileSync(new URL("../../docs_template/01_cowork_basic/nonapp/hooks/guard.cjs", import.meta.url), "utf8");
  assert.equal(
    shipped.replace(/\r\n/g, "\n"),
    gen.replace(/\r\n/g, "\n"),
    "docs_template/01_cowork_basic/nonapp/hooks/guard.cjs has drifted from the generated build — run `zemory hook guard` and copy it again",
  );
});

// #12 (user approved 2026-08-21, done 2026-08-24): the cowork policy.json gets a CONTENT gate.
// guard.cjs already has the BYTE gate above; policy.json only had its LINES counted in the manifest —
// and on the afternoon of 20/08 it was edited BY HAND with no gate noticing (the same shape as the guard.cjs incident on 11/08).
// Compare EXACTLY TWO KEYS against the generated set — NOT the whole file: cowork differs in `protected_write`/`flags_dir`
// CO CHU DICH (protected_write cua no la data/*/01_raw · docs/agent).
test("the cowork policy.json: secret_names + secret_allow must MATCH the generated set", async () => {
  const { SECRET_DEFAULTS, SECRET_ALLOW_DEFAULTS } = await import("../../dist/docs/guard-gen.js");
  const shipped = JSON.parse(
    readFileSync(new URL("../../docs_template/01_cowork_basic/nonapp/hooks/policy.json", import.meta.url), "utf8"),
  );
  for (const [key, gen] of [
    ["secret_names", SECRET_DEFAULTS],
    ["secret_allow", SECRET_ALLOW_DEFAULTS],
  ]) {
    const have = shipped[key] || [];
    for (const pat of gen) {
      assert.ok(have.includes(pat), `policy.json cowork thieu mau "${pat}" o ${key} — bo sinh da co, ban ship troi`);
    }
  }
  // SELF-CHECK of the measurement: the generated set must be non-empty — an empty one makes the loop above a no-op and the test meaningless.
  assert.ok(SECRET_DEFAULTS.length >= 5 && SECRET_ALLOW_DEFAULTS.length >= 2, "bo mau sinh rong — phep do dang mu");
});

test("both template trees carry the full standard set (agent 01–06 + AGENTS + plan overview)", () => {
  for (const profile of PROFILES) {
    for (const rel of STANDARD) {
      assert.doesNotThrow(() => read(profile, rel), `${profile}/${rel} must exist`);
    }
  }
});

test("shared harness shells are byte-identical across app and non-app (no drift)", () => {
  for (const rel of SHARED) {
    assert.equal(
      read("05_app", rel),
      read("03_nonapp", rel),
      `${rel} must be byte-identical between docs_template/05_app/ and docs_template/03_nonapp/`,
    );
  }
});

test("AGENTS.md: the router half stays byte-identical, only the trigger table differs", () => {
  // Everything before the trigger table is the profile-NEUTRAL router (stop-and-ask,
  // app-vs-non-app explainer, load contract). That half must not drift; the table
  // below it is per-profile by design because the two trees ship different skills.
  const MARK = "## Mở khi trúng trigger";
  const halves = PROFILES.map((p) => {
    const t = read(p, "AGENTS.md");
    assert.ok(t.includes(MARK), `${p}/AGENTS.md has no trigger section — the skills have no way in`);
    return t.slice(0, t.indexOf(MARK));
  });
  assert.equal(halves[0], halves[1], "the router half of AGENTS.md must be byte-identical across profiles");
  assert.ok(halves[0].includes("01_CONSTITUTION"), "sanity: the router half must contain the load contract");
});

test("AGENTS.md makes every agent ASK app-vs-non-app before applying the standard", () => {
  // User 2026-07-23: any agent opening a fresh repo must ask the user which
  // profile, then explain both — so it never guesses the wrong structure.
  const agents = read("05_app", "AGENTS.md"); // shared → same in both
  assert.match(agents, /HỎI USER TRƯỚC[\s\S]*APP hay NON-APP/, "must instruct the agent to ask app/non-app");
  assert.match(agents, /zemory init --non-app/, "must show the non-app init path");
  assert.match(agents, /LÀM & BẢO TRÌ một app/, "must explain what APP means");
  assert.match(agents, /đọc · dò · kéo · điền · xuất/, "must explain what NON-APP means");
});

test("non-app standard drops UI rules and adds the file-automation model", () => {
  // Non-app = 0 UI rules: reading/filling a .pbix is not app development.
  const appRules = read("05_app", "agent/02_RULES.md");
  const nonappRules = read("03_nonapp", "agent/02_RULES.md");
  assert.match(appRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "app rules keep the UI-design-approval rule");
  assert.doesNotMatch(nonappRules, /thiết kế UI\/UX phải TRÌNH DUYỆT/, "non-app rules must NOT carry the app UI rule");
  // The non-app structure standard documents pull/fill/upload + tasks/adhoc.
  const nonappStruct = read("03_nonapp", "agent/03_STRUCTURE.md");
  assert.match(nonappStruct, /KÉO \/ ĐIỀN \/ UPLOAD/, "non-app structure must document pull/fill/upload");
  assert.match(nonappStruct, /adhoc ≠ task/, "non-app structure must state the adhoc-vs-task rule");
  // The non-app tree carries the automation playbooks — as skill FILES since Phase 3,
  // and named in the registry, because a playbook nobody registered never gets opened.
  const nonappRegistry = read("03_nonapp", "agent/04_SKILLS.md");
  const appRegistry = read("05_app", "agent/04_SKILLS.md");
  for (const s of ["pull", "fill", "upload"]) {
    assert.doesNotThrow(
      () => read("03_nonapp", `.claude/skills/${s}/SKILL.md`),
      `non-app must ship .claude/skills/${s}/SKILL.md`,
    );
    assert.ok(nonappRegistry.includes(`\`${s}/\``), `non-app registry must list the ${s} skill`);
    assert.ok(!appRegistry.includes(`\`${s}/\``), `the app registry must NOT list ${s} (no file automation there)`);
  }
});

test("the app structure standard no longer inlines the non-app §7 (it moved out)", () => {
  const appStruct = read("05_app", "agent/03_STRUCTURE.md");
  assert.match(appStruct, /## 7\. Chuẩn NON-APP — đã TÁCH/, "app §7 is now a pointer stub");
  assert.doesNotMatch(appStruct, /## 7\. Chuẩn phụ NON-APP/, "the full §7 body must be gone from the app tree");
});

// ── CHUẨN THIẾT KẾ APP PHẢI TỚI ĐƯỢC REPO KHÁC ─────────────────────────────
//
// User chốt 2026-09-16: luật thiết kế UI rời `02_RULES` sang skill `app-design/`, **rồi áp lại cho
// mọi repo dùng chuẩn này**. Một chuẩn chỉ sống trong repo zemory là chuẩn của riêng zemory.
//
// Ba vế phải khớp nhau, thiếu một là chuẩn tới nơi mà không ai biết để mở:
//  ① bản mẫu APP/ADAPT phải MANG skill · ② `02_RULES` của chúng phải TRỎ sang nó ·
//  ③ `AGENTS.md` phải có dòng trigger (đó là đường DUY NHẤT agent biết lúc nào mở).
test("app-design tới được bản mẫu: skill có mặt, 02_RULES trỏ sang, AGENTS có trigger", () => {
  for (const prof of ["05_app", "04_adapt"]) {
    const skill = new URL(`../../docs_template/${prof}/.claude/skills/app-design/SKILL.md`, import.meta.url);
    const body = readFileSync(skill, "utf8");
    assert.match(body, /## FE/, `${prof}: skill thiếu mục FE`);
    assert.match(body, /## BE/, `${prof}: skill thiếu mục BE`);
    // BE phải mang đúng luật gom tiến trình — đây là thứ user yêu cầu thêm.
    assert.match(body, /gom về MỘT nhóm/, `${prof}: thiếu chuẩn gom tiến trình`);
    for (const need of [/### F8\./, /### B4\./, /### B5\./]) {
      assert.match(body, need, `${prof}: skill thiếu mục vừa dời từ 02_RULES (${need})`);
    }
    const rules = readFileSync(new URL(`../../docs_template/${prof}/agent/02_RULES.md`, import.meta.url), "utf8");
    assert.match(rules, /app-design\/SKILL\.md/, `${prof}: 02_RULES không trỏ sang skill`);
    // Và KHÔNG được giữ bản sao — hai nhà cho một nội dung là cách chúng lệch nhau.
    // LUẬT = thứ áp cho MỌI profile (kể cả NON-APP không có app). CHUẨN THIẾT KẾ = riêng của app.
    // User chốt 2026-09-16: *"luật là 1 bộ chung ship đi repo có thể có người khác xài, nên ko thể áp
    // dụng chung dc thiết kế vào luật"*. Nên `02_RULES` của profile app KHÔNG được giữ bản sao nào
    // của chuẩn thiết kế — có bản sao là hai nhà cho một nội dung, và chúng sẽ lệch.
    for (const dup of [/^Panel resize/m, /^Dialog \/ modal/m, /^Setting UI kéo-thả/m,
                       /^2 KIỂU version-up/m, /^Backup deploy 2 CHIỀU/m, /Nhãn ĐỦ/, /UI phải KHỚP CODE/]) {
      assert.ok(!dup.test(rules), `${prof}: 02_RULES còn giữ bản sao chuẩn thiết kế (${dup})`);
    }
    const agents = readFileSync(new URL(`../../docs_template/${prof}/AGENTS.md`, import.meta.url), "utf8");
    assert.match(agents, /app-design\/SKILL\.md/, `${prof}: AGENTS.md thiếu dòng trigger`);
  }
});

// ── NGUYÊN TẮC → LUẬT · QUY TRÌNH → SKILL ──────────────────────────────────
//
// User chốt 2026-09-16: *"luật chung là 1 thứ gì đó phải áp chung dc cho toàn hệ thống và mọi
// template"*. Phép chia KHÔNG phải "skill hay luật" mà là **nguyên tắc → luật · quy trình → skill**:
// một skill được phép có cả hai, miễn nguyên tắc của nó có mặt trong `02_RULES` của MỌI profile.
//
// Đo 2026-09-16 khi soi 10 skill theo phép này: `grill` đã đúng sẵn (nguyên tắc nằm trong luật từ
// trước, skill chỉ giữ playbook); hai skill THIẾU nguyên tắc là `sync-path` và `write-style`.
test("nguyên tắc của sync-path và write-style phải có trong 02_RULES của MỌI profile", () => {
  const roots = ["01_cowork_basic/nonapp", "03_nonapp", "04_adapt", "05_app"];
  for (const r of roots) {
    const rules = readFileSync(new URL(`../../docs_template/${r}/agent/02_RULES.md`, import.meta.url), "utf8");
    assert.match(rules, /CHƯA CÓ ĐƯỜNG SANG MÁY THỨ HAI/, `${r}: thiếu nguyên tắc của sync-path`);
    assert.match(rules, /VĂN BẢN ĐƯA NGƯỜI ĐỌC/, `${r}: thiếu nguyên tắc của write-style`);
    // Nguyên tắc chỉ MỘT dòng + trỏ sang skill; playbook không được bò ngược vào luật.
    assert.match(rules, /skills\/sync-path\/SKILL\.md/, `${r}: nguyên tắc không trỏ sang playbook`);
  }
});

// ── LUẬT TRỎ SANG SKILL THÌ SKILL PHẢI CÓ THẬT ─────────────────────────────
//
// Thêm một dòng luật trỏ sang playbook là dễ; ship playbook sang ĐÚNG những bộ nhận dòng luật đó
// thì hay quên. Đo 2026-09-16 ngay sau khi thêm hai nguyên tắc: `01_cowork_basic` nhận dòng trỏ
// sang `sync-path` trong khi bộ đó KHÔNG mang skill ấy — một con trỏ chết ngay lúc sinh ra.
test("mọi `.claude/skills/<x>/SKILL.md` mà 02_RULES trỏ sang đều phải có trong CÙNG bộ", () => {
  for (const prof of ["01_cowork_basic/nonapp", "03_nonapp", "04_adapt", "05_app"]) {
    const rules = readFileSync(new URL(`../../docs_template/${prof}/agent/02_RULES.md`, import.meta.url), "utf8");
    const want = [...new Set([...rules.matchAll(/\.claude\/skills\/([a-z-]+)\/SKILL\.md/g)].map((m) => m[1]))];
    assert.ok(want.length > 0, `${prof}: 02_RULES không trỏ sang skill nào — nguyên tắc đã rơi?`);
    for (const name of want) {
      const f = new URL(`../../docs_template/${prof}/.claude/skills/${name}/SKILL.md`, import.meta.url);
      assert.ok(existsSync(f), `${prof}: luật trỏ sang skill \`${name}\` mà bộ này không mang nó`);
    }
  }
});

// ── MỌI CÂY HARNESS ĐỀU PHẢI ĐƯỢC CANH — TỰ TÌM, KHÔNG GÕ TAY ─────────────────
//
// User 2026-09-17: *"bộ harness giờ đã 5 template rồi mà vẫn có 2 cái không đúng, nên có cơ chế nhắc
// nhở hoặc tự động thêm template khi code thêm mới… phải tự động đọc được khu vực template"*.
//
// Ca cũ ở trên so ĐÚNG MỘT CẶP tên gõ tay (`05_app` ↔ `03_nonapp`). Đo 2026-09-17: đĩa có 5 bộ, và
// `04_adapt` cũng là một cây harness đầy đủ (có `agent/` + `plan/`) mà KHÔNG cổng nào so nó với hai
// cây kia — nó chưa lệch, nhưng không có gì giữ nó khỏi lệch. Thêm một bộ mẫu mới cũng sẽ vô hình y
// như vậy. Ca này TỰ ĐỌC thư mục, nên bộ mới được phủ ngay từ lúc nó ra đời.
test("mọi cây harness trong docs_template đều byte-identical ở phần vỏ dùng chung (tự tìm, không gõ tay)", () => {
  const dir = new URL("../../docs_template/", import.meta.url);
  const bundles = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => existsSync(new URL(`../../docs_template/${n}/agent/`, import.meta.url)))
    .sort();
  assert.ok(bundles.length >= 3, `phải tìm thấy ít nhất ba cây harness, thấy ${bundles.length}: ${bundles.join(", ")}`);
  assert.ok(bundles.includes("05_app") && bundles.includes("03_nonapp"), "hai cây gốc phải nằm trong danh sách tự tìm");
  const base = "05_app";
  for (const rel of SHARED) {
    const want = read(base, rel);
    for (const b of bundles) {
      if (b === base) continue;
      assert.equal(read(b, rel), want, `${rel} phải byte-identical giữa docs_template/${base}/ và docs_template/${b}/`);
    }
  }
});
