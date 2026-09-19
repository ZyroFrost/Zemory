// plan/26 step ② — the read-only "how far behind is this repo" verdict.
//
// The regression pinned here is the one that made the whole thing useless: stripping the stamp
// swallowed the file's own final newline, so a file byte-identical to its base read as 321 lines
// against 322 and every stamped file came back "the repo edited this". `clean` — the only class
// safe to replace wholesale — could never occur, and the tool would have proposed a merge for
// files that needed none.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { selfRepoRoot } from "../../dist/projects.js";
import { CARRIED, applyStandard, contentLines, isStandardSource, pickBase, stampOf, stampRepo, standardDiff, templateAt, templateHistory } from "../../dist/docs/standard.js";

const STAMP = "<!-- zemory-standard: 2026-09-16 -->";

test("stampOf reads the date, and only from the end of the file", () => {
  assert.equal(stampOf(`body\n\n${STAMP}\n`), "2026-09-16");
  assert.equal(stampOf("body with no stamp\n"), null);
  // A stamp quoted mid-document (a doc ABOUT the marker) must not be mistaken for the file's own.
  assert.equal(stampOf(`${STAMP}\nbody continues after it\n`), null);
});

test("a stamped file and its unstamped base have the SAME content lines (the 321-vs-322 bug)", () => {
  const base = "line one\nline two\n";
  const stamped = `line one\nline two\n\n${STAMP}\n`;
  assert.deepEqual(contentLines(stamped), contentLines(base));
  assert.deepEqual(contentLines(stamped), ["line one", "line two"]);
});

test("CRLF and LF of the same content compare equal", () => {
  assert.deepEqual(contentLines("a\r\nb\r\n"), contentLines("a\nb\n"));
});

test("a repo with no stamp is UNKNOWN — never guessed into a writable class", () => {
  const root = mkdtempSync(join(tmpdir(), "zem-std-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    writeFileSync(join(root, "AGENTS.md"), "# repo\n");
    for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"])
      writeFileSync(join(root, "docs", "agent", f), "no stamp here\n");

    const rep = standardDiff(root);
    // Neo vào CARRIED, không gõ cứng con số: danh sách file được chở là một QUYẾT ĐỊNH THIẾT KẾ
    // (01_CONSTITUTION và 04_SKILLS đã bị rút ra vì là nội dung riêng của repo), và một con số gõ
    // tay sẽ đỏ mỗi lần quyết định đó đổi mà không nói được vì sao.
    assert.equal(rep.files.length, CARRIED.length);
    assert.ok(!CARRIED.includes("01_CONSTITUTION.md"), "hiến pháp là của riêng từng app — không được chở");
    for (const f of rep.files) {
      assert.equal(f.verdict, "unknown", `${f.file} must not be classified without a stamp`);
      assert.equal(f.repoStamp, null);
      // A verdict that cannot be acted on must say WHY, or the report is just a shrug.
      assert.ok(f.reason && f.reason.length > 0, `${f.file} must carry a reason`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing file is ABSENT, not unknown — that is sync's job, not this one", () => {
  const root = mkdtempSync(join(tmpdir(), "zem-std-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    // AGENTS.md deliberately not written.
    for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"])
      writeFileSync(join(root, "docs", "agent", f), "x\n");

    const agents = standardDiff(root).files.find((f) => f.file === "AGENTS.md");
    assert.equal(agents.verdict, "absent");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── đường GHI (plan/26 bước ③) ──────────────────────────────────────────────────────────────────
// Ca âm ở đây quan trọng hơn ca dương: mã này là thứ duy nhất trong plan được ghi vào repo KHÁC.

function repoNoStamp() {
  const root = mkdtempSync(join(tmpdir(), "zem-apply-"));
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
  writeFileSync(join(root, "AGENTS.md"), "# repo\r\nCRLF o day\r\n");
  for (const f of ["01_CONSTITUTION.md", "02_RULES.md", "03_STRUCTURE.md", "04_SKILLS.md"])
    writeFileSync(join(root, "docs", "agent", f), "khong co dau\n");
  return root;
}

test("CA ÂM: không có dấu ⇒ dù bật --apply vẫn KHÔNG ghi một byte nào", () => {
  const root = repoNoStamp();
  try {
    const before = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"));
    const rep = applyStandard(root, { apply: true });
    assert.ok(rep.length > 0, "phải báo cáo, không im lặng");
    for (const r of rep) assert.equal(r.action, "skipped", `${r.file} không được ghi khi chưa có gốc`);
    assert.deepEqual(readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md")), before, "file phải nguyên vẹn");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CA ÂM: mọi mục bỏ qua đều phải NÊU LÝ DO — báo cáo không được là cái nhún vai", () => {
  const root = repoNoStamp();
  try {
    for (const r of applyStandard(root, { apply: false }))
      assert.ok(r.reason && r.reason.length > 3, `${r.file} bỏ qua mà không nói vì sao`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("`only` lọc đúng file được nêu, không đụng file khác", () => {
  const root = repoNoStamp();
  try {
    const rep = applyStandard(root, { apply: false, only: ["02_RULES.md"] });
    assert.deepEqual(rep.map((r) => r.file), ["02_RULES.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Repo GIỐNG THẬT cho các ca mồi: chữ lấy từ template hiện tại (đã thay `<PROJECT>` như `adopt.ts`
// làm lúc chép) cộng một dòng tự viết. Fixture chữ rác không dùng được nữa — lượt mồi nay TỪ CHỐI
// đóng dấu một file không mọc ra từ bản chuẩn nào, và đó đúng là hành vi phải giữ.
const TPL = (rel) => readFileSync(new URL("../../docs_template/05_app/" + rel, import.meta.url), "utf8");
function repoFromTemplate() {
  const root = mkdtempSync(join(tmpdir(), "zem-stamp-"));
  const sub = (t) => contentLines(t.replace(/<PROJECT>/g, basename(root)));
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
  writeFileSync(join(root, "AGENTS.md"), [...sub(TPL("AGENTS.md")), "dòng repo tự viết"].join("\r\n") + "\r\n");
  for (const f of ["02_RULES.md", "03_STRUCTURE.md"])
    writeFileSync(join(root, "docs", "agent", f), sub(TPL("agent/" + f)).join("\n") + "\n");
  return root;
}

test("CA ÂM MỒI: file không mọc ra từ bản chuẩn nào ⇒ KHÔNG đóng dấu, nói phải xử tay", () => {
  const root = repoNoStamp();
  try {
    const before = readFileSync(join(root, "AGENTS.md"));
    const r = stampRepo(root, { apply: true }).find((x) => x.file === "AGENTS.md");
    assert.match(r.action, /xử tay/);
    assert.deepEqual(readFileSync(join(root, "AGENTS.md")), before, "không được ghi một byte");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MỒI đo ra ĐÚNG dấu của template khi chữ lấy từ bản hiện tại ⇒ sync --check đọc ra `current`", () => {
  const root = repoFromTemplate();
  try {
    stampRepo(root, { apply: true });
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.equal(stampOf(agents), stampOf(TPL("AGENTS.md")), "dấu đo được phải trùng dấu template");
    const v = standardDiff(root).files.find((f) => f.file === "AGENTS.md");
    assert.equal(v.verdict, "current");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── MỒI: đóng dấu bản chuẩn cho repo đang có harness mà chưa có dấu (plan/26 bước ⑤) ────────────
// Đây là đường ghi chạy vào 16 repo NGOÀI repo này trong một lượt, nên thứ phải neo không phải "nó
// có chạy không" mà "nó có chỉ thêm ĐÚNG một dòng chú thích không". Một ký tự nội dung bị đổi ở đây
// là 51 file hỏng mà không ai mở lại từng file để thấy.

test("MỒI dry-run: nói trước sẽ làm gì mà KHÔNG ghi một byte nào", () => {
  const root = repoFromTemplate();
  try {
    const before = readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"));
    const rep = stampRepo(root, { apply: false });
    assert.ok(rep.some((r) => r.action === "sẽ đóng dấu"), "phải nói trước sẽ đóng dấu file nào");
    assert.deepEqual(readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MỒI chỉ THÊM dòng chú thích — không một dòng nội dung nào bị đổi", () => {
  const root = repoFromTemplate();
  try {
    const paths = [join(root, "AGENTS.md"), join(root, "docs", "agent", "03_STRUCTURE.md")];
    const before = paths.map((f) => contentLines(readFileSync(f, "utf8")));
    stampRepo(root, { apply: true });
    paths.forEach((f, i) => {
      const after = readFileSync(f, "utf8");
      assert.deepEqual(contentLines(after), before[i], f + ": nội dung bị đổi");
      assert.ok(stampOf(after), f + ": thiếu dấu");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MỒI giữ nguyên kiểu xuống dòng của file (CRLF không bị nắn thành LF)", () => {
  const root = repoFromTemplate();
  try {
    stampRepo(root, { apply: true });
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8"); // file này viết bằng CRLF
    assert.ok(agents.endsWith("-->\r\n"), "đuôi phải là CRLF như file gốc");
    assert.ok(!/[^\r]\n/.test(agents), "không được lẫn LF trần vào file CRLF");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MỒI chạy lần hai KHÔNG đóng dấu chồng — file đứng yên", () => {
  const root = repoFromTemplate();
  try {
    stampRepo(root, { apply: true });
    const after1 = readFileSync(join(root, "AGENTS.md"), "utf8");
    const rep2 = stampRepo(root, { apply: true });
    assert.ok(rep2.every((r) => r.action !== "đã đóng dấu"), "không được đóng dấu lại");
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), after1, "lần hai phải là no-op");
    assert.equal(after1.match(/zemory-standard:/g).length, 1, "chỉ được có MỘT dấu");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("MỒI không đẻ file: repo thiếu file thì báo, không tạo mới", () => {
  const root = repoFromTemplate();
  try {
    rmSync(join(root, "AGENTS.md"));
    const rep = stampRepo(root, { apply: true });
    assert.equal(rep.find((r) => r.file === "AGENTS.md").action, "không có file");
    assert.ok(!existsSync(join(root, "AGENTS.md")), "sync mới được bù file thiếu, mồi thì không");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── ĐO GỐC (plan/26 bước ⑤): dấu mang ngày của bản template mà file BÁM SÁT NHẤT ─────────────────
// Bản mồi đầu tiên đóng ngày template HIỆN TẠI ⇒ 51 file tự khai "đang ở bản mới nhất" và phần lệch
// cũ biến mất khỏi mọi báo cáo. Các ca dưới neo từng vế của luật chọn gốc.

const R = (date, ...lines) => ({ date, lines });

test("ĐO GỐC: repo = bản cũ + dòng tự viết ⇒ chọn đúng bản cũ đó, không chọn bản mới nhất", () => {
  const revs = [R("2026-09-18", "a", "b", "MỚI", "c"), R("2026-08-01", "a", "b", "c")];
  const got = pickBase(revs, ["a", "b", "c", "của repo"]);
  assert.equal(got.date, "2026-08-01");
  assert.equal(got.own, 1, "đúng một dòng tự viết");
  assert.equal(got.miss, 0, "không thiếu dòng nào của gốc");
});

test("ĐO GỐC: cùng NỘI DUNG ở nhiều commit ⇒ lấy ngày CŨ NHẤT của nội dung đó (ngày nó ra đời)", () => {
  // commit 09-18 chỉ thêm dấu, chữ không đổi — nó KHÔNG được làm repo lệch dấu với template
  const revs = [R("2026-09-18", "a", "b"), R("2026-09-16", "a", "b"), R("2026-08-01", "a")];
  assert.equal(pickBase(revs, ["a", "b"]).date, "2026-09-16");
});

test("ĐO GỐC: hai nội dung khác nhau mà HOÀ khoảng cách ⇒ bản MỚI hơn thắng", () => {
  const revs = [R("2026-09-01", "a", "b", "x"), R("2026-08-01", "a", "b", "y")];
  assert.equal(pickBase(revs, ["a", "b"]).date, "2026-09-01");
});

test("CA ÂM ĐO GỐC: file không mọc ra từ bản nào (chung chưa tới nửa) ⇒ null, KHÔNG đoán một gốc", () => {
  const revs = [R("2026-09-01", "a", "b", "c", "d"), R("2026-08-01", "a", "b", "c", "e")];
  assert.equal(pickBase(revs, ["a", "khác hẳn", "khác nữa"]), null);
});

test("LỊCH SỬ THẬT theo cả ĐỔI TÊN — thiếu `--follow` thì gốc của repo nhận harness sớm tra ra rỗng", () => {
  // 02_RULES bản app đã đi qua nhiều đường dẫn (có thời tên là 01_RULES.md). Neo vào việc lịch sử
  // có HƠN MỘT đường dẫn, không vào số bản — số bản tăng mỗi lần chuẩn đổi.
  const h = templateHistory("app", "02_RULES.md");
  assert.ok(h.length > 1, "phải đọc được lịch sử git của bộ mẫu");
  assert.ok(new Set(h.map((r) => r.path)).size > 1, "lịch sử phải đi qua được lần đổi tên");
});

test("MỒI trên repo đứng ở bản CŨ ⇒ dấu mang ngày CŨ, và `--standard` thấy có việc để chở (lỗi của bản mồi đầu)", () => {
  // Bản mồi đầu đóng ngày template HÔM NAY cho mọi file ⇒ repo tháng 7 tự khai "đang ở bản mới nhất",
  // `sync --check` báo xanh và `--standard` nói "không có gì để áp". Ca này dựng đúng repo tháng 7 đó.
  const hist = templateHistory("app", "03_STRUCTURE.md");
  const oldest = hist[hist.length - 1];
  const root = mkdtempSync(join(tmpdir(), "zem-old-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    const oldText = templateAt("app", "03_STRUCTURE.md", oldest.date);
    assert.ok(oldText, "phải đọc được bản cũ nhất — kể cả khi nó nằm trước lần đổi tên");
    writeFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), oldText.replace(/<PROJECT>/g, basename(root)));
    stampRepo(root, { apply: true });
    const got = stampOf(readFileSync(join(root, "docs", "agent", "03_STRUCTURE.md"), "utf8"));
    assert.notEqual(got, stampOf(TPL("agent/03_STRUCTURE.md")), "dấu KHÔNG được là ngày của template hiện tại");
    const v = standardDiff(root).files.find((f) => f.file === "03_STRUCTURE.md");
    assert.notEqual(v.verdict, "current", "repo đứng ở bản cũ thì không được đọc ra là đang ở bản mới nhất");
    assert.ok(v.standardLines > 0, "phải thấy phần chuẩn đã đổi kể từ gốc");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ĐO GỐC: nội dung trùng BẢN HIỆN TẠI ⇒ dấu là dấu TEMPLATE, không phải ngày cũ nhất của chữ đó", () => {
  // Template đóng dấu theo lần cuối git CHẠM file (kể cả sửa khoảng trắng phép so bỏ qua). Đo thật:
  // AGENTS.md non-app trùng chữ từ 23/08 mà dấu 31/08 ⇒ thiếu vế này thì repo ĐÚNG bản mới nhất
  // bị đọc ra là cũ.
  const revs = [R("2026-08-31", "a", "b"), R("2026-08-23", "a", "b"), R("2026-08-01", "a")];
  assert.equal(pickBase(revs, ["a", "b"], R("2026-08-31", "a", "b")).date, "2026-08-31");
  // còn nội dung CŨ thì vế ngoại lệ không được chạm tới
  assert.equal(pickBase(revs, ["a"], R("2026-08-31", "a", "b")).date, "2026-08-01");
});

test("ÁP THẬT: repo ở bản cũ + dòng tự viết ⇒ chuẩn mới TỚI NƠI và dòng tự viết CÒN NGUYÊN", () => {
  // Ca này là neo cho LƯỚI CUỐI của `applyStandard` (không dòng repo tự viết nào được biến mất): phá
  // `merge3` cho nó bỏ phần của repo thì lưới phải chặn — file đứng yên, dòng tự viết còn.
  const OWN = "- dòng repo tự viết, không bản template nào có";
  const cur = contentLines(TPL("agent/02_RULES.md")).join("\n");
  let old = null;
  for (const r of templateHistory("app", "02_RULES.md")) {
    const t = templateAt("app", "02_RULES.md", r.date);
    if (t && contentLines(t).join("\n") !== cur) { old = t; break; }
  }
  assert.ok(old, "phải có một bản cũ khác bản hiện tại");
  const root = mkdtempSync(join(tmpdir(), "zem-apply-real-"));
  try {
    mkdirSync(join(root, "docs", "agent"), { recursive: true });
    writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent", profile: "app" }));
    const lines = contentLines(old.replace(/<PROJECT>/g, basename(root)));
    const at = Math.floor(lines.length / 2);
    const fp = join(root, "docs", "agent", "02_RULES.md");
    writeFileSync(fp, [...lines.slice(0, at), OWN, ...lines.slice(at)].join("\n") + "\n");
    stampRepo(root, { apply: true });
    const r = applyStandard(root, { apply: true }).find((x) => x.file === "02_RULES.md");
    const after = readFileSync(fp, "utf8");
    assert.ok(after.includes(OWN), "dòng tự viết KHÔNG được mất, dù hợp nhất hay từ chối");
    assert.equal(r.action, "written", "ca này phải hợp nhất được — lý do nếu không: " + (r.reason ?? ""));
    assert.equal(stampOf(after), stampOf(TPL("agent/02_RULES.md")), "ghi xong thì đứng ở bản chuẩn hiện tại");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REPO NGUỒN (chính zemory) không nhận chở ngược: không phán quyết, không đóng dấu", () => {
  // Bộ mẫu là bản RÚT GỌN dẫn xuất từ docs của zemory. Chở nó ngược vào là xoá chữ gốc để thay bằng
  // bản rút gọn của chính nó — đo 2026-09-18 trên 6 chỗ chồng của `02_RULES` zemory.
  const self = selfRepoRoot();
  assert.ok(self, "phải tìm được repo nguồn");
  assert.equal(isStandardSource(self), true);
  assert.equal(standardDiff(self).files.length, 0, "repo nguồn không có gì để 'chở tới'");
  assert.deepEqual(stampRepo(self, { apply: false }), [], "repo nguồn không cần dấu");
  const other = mkdtempSync(join(tmpdir(), "zem-notsrc-"));
  try {
    assert.equal(isStandardSource(other), false, "repo thường thì KHÔNG được bị loại");
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});
