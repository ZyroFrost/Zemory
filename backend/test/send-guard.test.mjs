// CHỐT NHẮN TIN GIỮA CÁC SESSION (user chốt 2026-10-07): nhắn vào session có TIÊU ĐỀ chuẩn
// `<Repo>_Claude_<d-m-yyyy>` NGÀY MỚI NHẤT của repo đích; session chưa có tiêu đề (Untitled = chưa dùng) ⇒ cấm;
// trả lời qua `from` (`uds:…`) luôn qua.
//
// 🔴 Bản đầu (cùng ngày) chặn theo HÌNH DẠNG tên nhắn tin (`<thư mục>-<2 hex>`) — sai gốc: tên nhắn tin và tiêu đề là
// HAI thứ, đặt tiêu đề không đổi tên nhắn tin, nên bản đó chặn đúng các session user ĐÃ đặt tiêu đề. Phép thử giờ dựng một
// `~/.claude` GIẢ (registry `sessions/<pid>.json` + jsonl có dòng `custom-title`) đúng hình dạng đo được trên máy thật.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  judgeSendTarget,
  listPeers,
  listStoredSessions,
  projectDirName,
  standardTitle,
  suggestTitle,
  titleDate,
  titleProblem,
} from "../../dist/memory/send-guard.js";
import { installHooks, uninstallHooks } from "../../dist/memory/capture-hook.js";
import { tempDir } from "./helpers.mjs";

// Một máy giả: mỗi phiên dùng pid của CHÍNH tiến trình test (đang sống) để qua phép kiểm "còn chạy".
function fakeHome(t) {
  const home = tempDir(t, "zemory-peers-");
  mkdirSync(join(home, "sessions"), { recursive: true });
  let n = 0;
  const add = ({ name, cwd, title, titles, nameSource = "derived", jsonl = true, pid = process.pid }) => {
    const sid = `sid-${++n}`;
    const proj = join(home, "projects", cwd.replace(/[:\\/]/g, "-"));
    mkdirSync(proj, { recursive: true });
    writeFileSync(join(home, "sessions", `${pid}-${n}.json`), JSON.stringify({ pid, sessionId: sid, cwd, name, nameSource, status: "idle" }));
    if (jsonl) {
      // a real jsonl names its cwd on the first lines — the stored-session scan reads the repo from it
      const lines = [JSON.stringify({ type: "user", message: "x", cwd })];
      for (const tt of titles ?? (title ? [title] : [])) lines.push(JSON.stringify({ type: "custom-title", customTitle: tt, sessionId: sid }));
      writeFileSync(join(proj, `${sid}.jsonl`), lines.join("\n") + "\n");
    }
    return { sid, file: join(proj, `${sid}.jsonl`) };
  };
  return { home, add };
}

function withHome(home, fn) {
  const prev = [process.env.ZEMORY_CLAUDE_HOME, process.env.ZEMORY_PEER_TITLE_CACHE];
  process.env.ZEMORY_CLAUDE_HOME = home;
  process.env.ZEMORY_PEER_TITLE_CACHE = join(home, "title-cache.json");
  try {
    return fn();
  } finally {
    [process.env.ZEMORY_CLAUDE_HOME, process.env.ZEMORY_PEER_TITLE_CACHE] = prev;
    if (prev[0] === undefined) delete process.env.ZEMORY_CLAUDE_HOME;
    if (prev[1] === undefined) delete process.env.ZEMORY_PEER_TITLE_CACHE;
  }
}

test("titleDate reads d-m-yyyy, also off-pattern titles; no date ⇒ null", () => {
  assert.equal(titleDate("Dept_BIZ_Claude_6-10-2026"), Date.UTC(2026, 9, 6));
  assert.equal(titleDate("Dept_FA-6-10-2026"), Date.UTC(2026, 9, 6), "lệch khuôn (thiếu _Claude_) vẫn đọc được ngày");
  assert.equal(titleDate("SasinFlow_Claude_FixApp_10-5-2026"), Date.UTC(2026, 4, 10));
  assert.equal(titleDate("kho chính"), null);
  assert.equal(titleDate(null), null);
});

// LUẬT TIÊU ĐỀ PHIÊN (user chốt 2026-10-07): `<Repo>_<Model>_<d-m-yyyy>` — `<Model>` không cố định là Claude
// ("Claude là Model, vì nhiều khi t đổi model khác như Codex"); chủ đề chèn trước ngày; ngày không đệm số 0.
test("standardTitle: the model slot takes any model, topic before the date, exact repo case, no zero padding", () => {
  const ok = ["Dept_BIZ_Claude_6-10-2026", "Dept_BIZ_Codex_6-10-2026", "SasinFlow_Claude_FixApp_5-10-2026", "_DB_DataWarehouse_Claude_6-10-2026"];
  const repoOf = (t) => (t.startsWith("_DB") ? "_DB_DataWarehouse" : t.split("_")[0] === "Dept" ? "Dept_BIZ" : t.split("_")[0]);
  assert.deepEqual(ok.filter((t) => !standardTitle(t, repoOf(t))), [], "khuôn đúng phải qua");
  const bad = [
    ["Dept_FA-6-10-2026", "Dept_FA"], // thiếu model (ca thật)
    ["dept_biz_Claude_6-10-2026", "Dept_BIZ"], // sai hoa thường của repo
    ["Dept_BIZ_Claude_06-10-2026", "Dept_BIZ"], // đệm số 0
    ["Dept_BIZ_Claude", "Dept_BIZ"], // thiếu ngày
    ["Dept_BIZ_Claude_6-10-2026_FixApp", "Dept_BIZ"], // chủ đề SAU ngày
    ["Dept_OPS_Claude_6-10-2026", "Dept_BIZ"], // tên repo khác
  ];
  assert.deepEqual(bad.filter(([t, r]) => standardTitle(t, r)).map(([t]) => t), [], "khuôn sai phải bị bắt");
});

test("standardTitle: a `_<n>` day counter after the date is allowed (user 2026-10-07), a topic after it is not", () => {
  assert.ok(standardTitle("Zemory_Claude_21-7-2026_2", "Zemory"), "_2 sau ngày ⇒ hợp lệ");
  assert.ok(standardTitle("_DB_DataWarehouse_Claude_15-9-2026_3", "_DB_DataWarehouse"));
  assert.ok(!standardTitle("Zemory_Claude_21-7-2026_0", "Zemory"), "_0 không phải số thứ tự");
  assert.ok(!standardTitle("Zemory_Claude_28-7-2026_CoworkCEO", "Zemory"), "chủ đề phải đứng TRƯỚC ngày");
});

test("suggestTitle: fills the model, fixes case/padding/swap, keeps topic + counter; refuses what it cannot derive", () => {
  const day = (d, m) => Date.UTC(2026, m - 1, d);
  const cases = [
    ["Dept_FA-1-10-2026", "Dept_FA", day(1, 10), "Dept_FA_Claude_1-10-2026"], // ca thật: thiếu model
    ["Sasinflow_Claude_4-7-2026_2", "SasinFlow", day(4, 7), "SasinFlow_Claude_4-7-2026_2"], // hoa thường + giữ đuôi
    ["SasinFlow_Claude_FixApp_10-1-2026", "SasinFlow", day(1, 10), "SasinFlow_Claude_FixApp_1-10-2026"], // đảo ngày-tháng
    ["Dept_OPS_Claude_15-07-2026", "Dept_OPS", day(15, 7), "Dept_OPS_Claude_15-7-2026"], // đệm số 0
    ["Dept_BIZ_Codex_6-10-2026", "Dept_BIZ", day(6, 10), "Dept_BIZ_Codex_6-10-2026"], // model khác giữ nguyên
  ];
  for (const [t, r, s, want] of cases) assert.equal(suggestTitle(t, r, s), want, t);
  assert.equal(suggestTitle("Dept_FA-2-9-2026", "Dept_FA", day(7, 9)), null, "ngày lệch xa ngày mở (ca thật) ⇒ KHÔNG đoán");
  assert.equal(suggestTitle("Bộ khung làm việc và kho nhớ", "test2", day(1, 10)), null, "tên tự do ⇒ KHÔNG đoán");
  assert.equal(suggestTitle("Kiểm tra dữ liệu 5-10-2026", "huy.nguyen", day(5, 10)), null, "chữ có dấu ⇒ không vứt chữ của user");
});

test("stored sessions: the repo comes from the PROJECT FOLDER (renamed repos), not the old cwd", (t) => {
  const { home } = fakeHome(t);
  const root = "D:\\huy.nguyen\\WorkSpace\\_DB_DataWarehouse";
  const proj = join(home, "projects", projectDirName(root));
  mkdirSync(proj, { recursive: true });
  // phiên cũ: cwd vẫn là tên thư mục CŨ, tiêu đề theo tên MỚI (ca thật 07/10)
  writeFileSync(
    join(proj, "old.jsonl"),
    [
      JSON.stringify({ type: "user", cwd: "D:\\huy.nguyen\\WorkSpace\\_DataWarehouse_Central", timestamp: "2026-09-20T03:00:00Z" }),
      JSON.stringify({ type: "custom-title", customTitle: "_DB_DataWarehouse_Claude_20-9-2026", sessionId: "old" }),
    ].join("\n") + "\n",
  );
  withHome(home, () => {
    assert.equal(projectDirName(root), "d--huy-nguyen-workspace--db-datawarehouse");
    const [withRoot] = listStoredSessions([root]);
    assert.equal(withRoot.repo, "_DB_DataWarehouse", "thư mục project ⇒ tên repo HIỆN TẠI");
    assert.equal(withRoot.problem, null, "tiêu đề theo tên mới ⇒ đúng");
    const [noRoot] = listStoredSessions([]);
    assert.equal(noRoot.repo, "_DataWarehouse_Central", "không biết repo nào ⇒ lùi về cwd");
  });
});

test("stored sessions: no root and no cwd ⇒ repo unknown, and NO retitle is suggested (never the encoded folder)", (t) => {
  const { home } = fakeHome(t);
  const proj = join(home, "projects", "d--w-Dept-FA");
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, "x.jsonl"), JSON.stringify({ type: "custom-title", customTitle: "Dept_FA-1-9-2026", sessionId: "x" }) + "\n");
  withHome(home, () => {
    const [s] = listStoredSessions([]);
    assert.equal(s.repo, "", "không suy ra được repo ⇒ để trống");
    assert.equal(suggestTitle(s.title, s.repo, s.startDay), null, "repo rỗng ⇒ không đề xuất (bản đầu ghi tiêu đề rác)");
  });
});

test("CLI: `peers --all --check` covers CLOSED sessions; `--fix` plans, `--fix --apply` writes the last title", (t) => {
  const { home, add } = fakeHome(t);
  // một phiên ĐÃ ĐÓNG (pid không sống) — đúng loại phiên bản đầu của --check bỏ sót
  const closed = add({ name: "dept-fa-xx", cwd: "D:/w/Dept_FA", title: "Dept_FA-1-9-2026", pid: 999999 });
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const env = { ...process.env, ZEMORY_CLAUDE_HOME: home, ZEMORY_PEER_TITLE_CACHE: join(home, "c.json") };
  const run = (...a) => spawnSync(process.execPath, [cli, "peers", ...a], { encoding: "utf8", env, timeout: 60_000 });
  assert.equal(run("--check").status, 0, "chỉ xét phiên SỐNG ⇒ không thấy phiên đã đóng");
  const all = run("--all", "--check");
  assert.equal(all.status, 1, "--all xét cả phiên đã đóng ⇒ đỏ");
  assert.match(all.stdout, /Dept_FA-1-9-2026/);
  const plan = run("--fix");
  assert.match(plan.stdout, /→ .*"Dept_FA-1-9-2026"\s+→\s+"Dept_FA_Claude_1-9-2026"/);
  assert.ok(!readFileSync(closed.file, "utf8").includes("Dept_FA_Claude_1-9-2026"), "--fix KHÔNG ghi");
  assert.equal(run("--apply").status, 1, "--apply không có --fix ⇒ từ chối");
  assert.equal(run("--fix", "--apply").status, 0);
  assert.equal(run("--all", "--check").status, 0, "sau --apply ⇒ xanh (dòng custom-title CUỐI thắng)");
});

// User 2026-10-07: "chênh lệch thường 1-2 ngày là cao nhất" — up to 2 days is fine, 3+ is a wrong date.
test("titleProblem: up to TWO days off the start is tolerated; three is flagged (ca thật 2-9 vs 7-9 ⇒ flagged)", () => {
  const day = (d, m) => Date.UTC(2026, m - 1, d);
  assert.equal(titleProblem("Dept_FA_Claude_5-9-2026", "Dept_FA", day(7, 9)), null, "lệch 2 ngày ⇒ chấp nhận");
  assert.match(titleProblem("Dept_FA_Claude_4-9-2026", "Dept_FA", day(7, 9)) ?? "", /date ≠ start day/, "lệch 3 ngày ⇒ báo");
  assert.match(titleProblem("Dept_FA_Claude_2-9-2026", "Dept_FA", day(7, 9)) ?? "", /date ≠ start day \(7-9-2026\)/, "ca thật: lệch 5 ngày");
});

test("titleProblem: day/month swap is caught; one day off the start is tolerated", () => {
  const day = (d, m) => Date.UTC(2026, m - 1, d);
  assert.match(titleProblem("SasinFlow_Claude_FixApp_10-5-2026", "SasinFlow", day(5, 10)) ?? "", /date ≠ start day \(5-10-2026\)/, "ca thật: đảo ngày-tháng");
  assert.equal(titleProblem("_DB_DataWarehouse_Claude_5-10-2026", "_DB_DataWarehouse", day(6, 10)), null, "lệch 1 ngày (ca thật) ⇒ chấp nhận");
  assert.match(titleProblem("Dept_FA-6-10-2026", "Dept_FA", day(6, 10)) ?? "", /not Dept_FA_<Model>_<d-m-yyyy>/);
  assert.equal(titleProblem(null, "Dept_FA", null), null, "chưa có tiêu đề là ca KHÁC (chưa dùng), không phải vi phạm");
  assert.equal(titleProblem("Dept_FA_Claude_6-10-2026", "Dept_FA", null), null, "không đo được ngày mở ⇒ chỉ xét khuôn");
});

test("CLI: `zemory peers --check` exits 1 on a broken title, 0 when every titled session follows the rule", (t) => {
  const { home, add } = fakeHome(t);
  const s = add({ name: "dept-fa-09", cwd: "D:/w/Dept_FA", title: "Dept_FA-6-10-2026" });
  add({ name: "dept-fa-6f", cwd: "D:/w/Dept_FA", jsonl: false }); // chưa dùng: không tính là vi phạm
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const env = { ...process.env, ZEMORY_CLAUDE_HOME: home, ZEMORY_PEER_TITLE_CACHE: join(home, "c.json") };
  const check = () => spawnSync(process.execPath, [cli, "peers", "--check"], { encoding: "utf8", env, timeout: 60_000 });
  const bad = check();
  assert.equal(bad.status, 1, "tiêu đề sai khuôn ⇒ exit 1");
  assert.match(bad.stdout, /✗ Dept_FA\s+dept-fa-09/);
  appendFileSync(s.file, JSON.stringify({ type: "custom-title", customTitle: "Dept_FA_Claude_6-10-2026", sessionId: s.sid }) + "\n");
  const good = check();
  assert.equal(good.status, 0, "đặt lại đúng khuôn (dòng custom-title CUỐI) ⇒ exit 0: " + good.stdout);
  assert.match(good.stdout, /1 untitled = unused/);
});

test("the measured machine: Untitled blocked with the right address; the newest titled session passes", (t) => {
  const { home, add } = fakeHome(t);
  add({ name: "dept-biz-b2", cwd: "D:/w/Dept_BIZ", title: "Dept_BIZ_Claude_6-10-2026" });
  add({ name: "dept-biz-d1", cwd: "D:/w/Dept_BIZ", jsonl: false }); // mở lại máy, chưa dùng
  add({ name: "db-datawarehouse-fa", cwd: "D:/w/_DB_DataWarehouse", title: "_DB_DataWarehouse_Claude_5-10-2026" });
  add({ name: "_DB_DataWarehouse_Claude_6-10-2026", cwd: "D:/w/_DB_DataWarehouse", nameSource: "user", jsonl: false });
  add({ name: "dept-fa-09", cwd: "D:/w/Dept_FA", title: "Dept_FA-6-10-2026" });
  withHome(home, () => {
    const peers = listPeers();
    assert.equal(judgeSendTarget("dept-biz-b2", peers), null, "tiêu đề chuẩn, mới nhất ⇒ qua");
    assert.equal(judgeSendTarget("dept-biz-b2 [beb897]", peers), null, "kèm [ref] vẫn nhận ra");
    const untitled = judgeSendTarget("dept-biz-d1", peers);
    assert.match(untitled ?? "", /NO session title/, "Untitled ⇒ chặn");
    assert.match(untitled ?? "", /Send to `dept-biz-b2`/, "phải chỉ ĐÚNG địa chỉ gửi");
    assert.equal(judgeSendTarget("_DB_DataWarehouse_Claude_6-10-2026", peers), null, "/rename = tiêu đề; 6-10 > 5-10 ⇒ qua");
    assert.match(judgeSendTarget("db-datawarehouse-fa", peers) ?? "", /not the newest/, "phiên cũ hơn của cùng repo ⇒ chặn");
    assert.equal(judgeSendTarget("dept-fa-09", peers), null, "lệch khuôn nhưng có ngày, duy nhất ⇒ qua");
  });
});

test("NEGATIVE: replies, subagents, main, unknown names and empty pass", (t) => {
  const { home, add } = fakeHome(t);
  add({ name: "dept-biz-d1", cwd: "D:/w/Dept_BIZ", jsonl: false });
  withHome(home, () => {
    const peers = listPeers();
    const wrong = ["uds:\\\\.\\pipe\\LOCAL\\cc-msg-8ea5", "main", "a68a00cdae74fb9cb", "researcher", ""].filter(
      (to) => judgeSendTarget(to, peers) !== null,
    );
    assert.deepEqual(wrong, [], "chặn nhầm: " + wrong.join(" | "));
  });
});

test("a repo with no titled session: block and say to ask the user (no wrong suggestion)", (t) => {
  const { home, add } = fakeHome(t);
  add({ name: "zemory-5f", cwd: "D:/p/Zemory", jsonl: false });
  add({ name: "zemory-ab", cwd: "D:/p/Zemory", title: "notes" }); // có tiêu đề nhưng không có ngày
  withHome(home, () => {
    const peers = listPeers();
    assert.match(judgeSendTarget("zemory-5f", peers) ?? "", /NO session with a standard title/);
    assert.match(judgeSendTarget("zemory-ab", peers) ?? "", /not a standard title/);
  });
});

test("tie on the title date ⇒ the most recently active session wins; a later rename is read (last title)", (t) => {
  const { home, add } = fakeHome(t);
  // z-2 tạo TRƯỚC: không có tiêu chí phụ thì thứ tự đọc thư mục tự chọn z-2 ⇒ phép thử mới đo được tiêu chí phụ.
  add({ name: "z-2", cwd: "D:/p/Zemory", titles: ["Zemory_Claude_1-10-2026", "Zemory_Claude_6-10-2026"] });
  const a = add({ name: "z-1", cwd: "D:/p/Zemory", title: "Zemory_Claude_6-10-2026" });
  // z-1 hoạt động sau cùng: jsonl của nó được ghi muộn hơn
  appendFileSync(a.file, JSON.stringify({ type: "assistant", message: "y" }) + "\n");
  const later = new Date(Date.now() + 120_000);
  utimesSync(a.file, later, later);
  withHome(home, () => {
    const peers = listPeers();
    assert.equal(peers.find((p) => p.name === "z-2").title, "Zemory_Claude_6-10-2026", "đổi tên nhiều lần ⇒ lấy dòng CUỐI");
    assert.equal(judgeSendTarget("z-1", peers), null, "cùng ngày ⇒ phiên hoạt động gần nhất được chọn");
    assert.match(judgeSendTarget("z-2", peers) ?? "", /Send to `z-1`/);
  });
});

test("the title cache: a title written AFTER the first read is still seen (incremental read)", (t) => {
  const { home, add } = fakeHome(t);
  const s = add({ name: "dept-ops-d2", cwd: "D:/w/Dept_OPS" }); // jsonl có, chưa có tiêu đề
  withHome(home, () => {
    assert.equal(listPeers()[0].title, null, "chưa đặt tiêu đề");
    appendFileSync(s.file, JSON.stringify({ type: "custom-title", customTitle: "Dept_OPS_Claude_7-10-2026", sessionId: s.sid }) + "\n");
    assert.equal(listPeers()[0].title, "Dept_OPS_Claude_7-10-2026", "đọc tiếp từ offset đã nhớ ⇒ thấy tiêu đề mới");
  });
});

test("CLI: `zemory hook send-guard` exits 2 with the address to use; 0 for a reply", (t) => {
  const { home, add } = fakeHome(t);
  add({ name: "dept-biz-b2", cwd: "D:/w/Dept_BIZ", title: "Dept_BIZ_Claude_6-10-2026" });
  add({ name: "dept-biz-d1", cwd: "D:/w/Dept_BIZ", jsonl: false });
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const env = { ...process.env, ZEMORY_CLAUDE_HOME: home, ZEMORY_PEER_TITLE_CACHE: join(home, "c.json") };
  const run = (to) =>
    spawnSync(process.execPath, [cli, "hook", "send-guard"], {
      input: JSON.stringify({ tool_name: "SendMessage", tool_input: { to, message: "x" } }),
      encoding: "utf8",
      env,
      timeout: 60_000,
    });
  // registry giả mang pid của tiến trình TEST — CLI là tiến trình con, pid cha vẫn sống ⇒ registry hợp lệ
  const bad = run("dept-biz-d1");
  assert.equal(bad.status, 2, "Untitled ⇒ exit 2 (PreToolUse chặn)");
  assert.match(bad.stderr, /Send to `dept-biz-b2`/, "lý do + địa chỉ đúng phải ra stderr");
  assert.equal(run("dept-biz-b2").status, 0, "đúng session ⇒ qua");
  assert.equal(run("uds:\\\\.\\pipe\\LOCAL\\cc-msg-x").status, 0, "trả lời qua from ⇒ qua");
  const list = spawnSync(process.execPath, [cli, "peers"], { encoding: "utf8", env, timeout: 60_000 });
  assert.match(list.stdout, /★ Dept_BIZ\s+dept-biz-b2/, "`zemory peers` đánh dấu ★ đúng phiên");
});

test("installer wires PreToolUse/SendMessage once, and uninstall removes it", (t) => {
  const dir = tempDir(t, "zemory-sendguard-");
  const p = join(dir, "settings.json");
  writeFileSync(p, JSON.stringify({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node x.cjs" }] }] } }));
  installHooks(p);
  installHooks(p); // lần hai không được nhân đôi
  const pre = JSON.parse(readFileSync(p, "utf8")).hooks.PreToolUse;
  const ours = pre.filter((g) => g.hooks.some((h) => h.command === "zemory hook send-guard"));
  assert.equal(ours.length, 1, "đúng MỘT móc send-guard");
  assert.equal(ours[0].matcher, "SendMessage", "matcher phải là SendMessage — thiếu matcher là móc vào MỌI công cụ");
  assert.ok(pre.some((g) => g.matcher === "Bash"), "móc sẵn có của user phải còn nguyên");
  uninstallHooks(p);
  const after = JSON.parse(readFileSync(p, "utf8")).hooks.PreToolUse;
  assert.ok(!after.some((g) => g.hooks.some((h) => h.command === "zemory hook send-guard")), "gỡ ⇒ hết móc");
  assert.ok(after.some((g) => g.matcher === "Bash"), "gỡ không được đụng móc của user");
});
