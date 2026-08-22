// `zemory archive` trims BOTH per-session logs. 06_CHANGES is date-ordered so it
// splits by oldest ENTRY; 05_TODO is not — done and open work are interleaved inside
// the same sections, so it splits by closed ITEM instead.
//
// Measured on the real backlog (2026-07-28) before choosing: only 3 of 19 sections
// were fully closed = 18/442 lines (4%), while the closed ITEMS were 107 of them =
// 49.6 KB = 46% of the file. Section-level archiving would have moved almost nothing.
//
// Closed items move UNCONDITIONALLY — no size threshold. The backlog's own header has
// always said "xong → ghi sang 06_CHANGES.md và xoá khỏi đây", so a done item is
// misplaced the moment it closes; a size gate is the wrong instrument for a correctness
// rule, and it is what let those 107 accumulate.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveTodo } from "../../dist/docs/archive.js";

function scratch(todo) {
  const root = mkdtempSync(join(tmpdir(), "ztodo-"));
  const docsDir = join(root, "docs", "agent");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "05_TODO.md"), todo);
  return {
    dbPath: join(root, "t.db"),
    ctx: { projectRoot: root, docsDir, config: { thresholds: {} } },
    read: (rel) => readFileSync(join(docsDir, rel), "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const BACKLOG = `# TODO

## Nhóm A
- [x] việc đã xong
  - chi tiết của việc đã xong
- [ ] việc chưa làm
- [~] việc đang làm

## Nhóm B
> ghi chú phiên — không phải mục, phải giữ nguyên
- [x] việc xong thứ hai
- [ ] việc mở thứ hai
`;

test("archive moves closed items out and leaves open work, headings and prose in place", () => {
  const s = scratch(BACKLOG);
  try {
    const r = archiveTodo(s.ctx, s.dbPath);
    assert.equal(r.moved, 2, "both [x] items should move");

    const active = s.read("05_TODO.md");
    assert.doesNotMatch(active, /việc đã xong/, "closed item must leave the active backlog");
    assert.doesNotMatch(active, /chi tiết của việc đã xong/, "its continuation line must go with it");
    assert.match(active, /việc chưa làm/, "open item stays");
    assert.match(active, /việc đang làm/, "in-progress item stays");
    assert.match(active, /## Nhóm A/, "headings stay even when a section loses items");
    assert.match(active, /ghi chú phiên/, "narrative prose is not an item and must stay");

    const archived = s.read(join("archive", "05_TODO.md"));
    assert.match(archived, /việc đã xong/);
    assert.match(archived, /chi tiết của việc đã xong/);
    assert.match(archived, /việc xong thứ hai/);
    assert.doesNotMatch(archived, /việc chưa làm/, "open work must never be archived");
  } finally {
    s.cleanup();
  }
});

// A closed item is misplaced the moment it closes, so size must not gate the move.
// Gating it on a threshold is what let 107 of them reach 46% of the real file.
test("a tiny file with one closed item is still trimmed — there is no threshold", () => {
  const s = scratch("# TODO\n\n- [x] xong rồi\n- [ ] còn mở\n");
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1, "no size gate may stand between a done item and the archive");
    assert.doesNotMatch(s.read("05_TODO.md"), /xong rồi/);
    assert.match(s.read("05_TODO.md"), /còn mở/);
  } finally {
    s.cleanup();
  }
});

test("a backlog with no closed items is left byte-identical", () => {
  const openOnly = "# TODO\n\n- [ ] còn mở\n- [~] đang làm\n";
  const s = scratch(openOnly);
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 0);
    assert.equal(s.read("05_TODO.md"), openOnly, "nothing to move means nothing is rewritten");
  } finally {
    s.cleanup();
  }
});

// ── XEM TRƯỚC + CỜ LẠ ─────────────────────────────────────────────────────────
// Sinh từ sự cố 2026-08-22: `cmdArchive` **không nhận đối số nào**, nên cờ rơi vào hư không và
// lệnh CHẠY THẬT — dính đúng hai lần trong một phiên: `archive --help` dời 5 entry + 6 mục
// (người gõ tưởng đang đọc trợ giúp), rồi `archive --dry-run` in *"moved 2 closed item(s)"* và
// **dời thật** (người gõ tưởng đang xem trước). Lệnh DỜI NỘI DUNG giữa hai file thì phải
// fail-closed: không hiểu cờ ⇒ không làm gì.
test("--dry-run ĐẾM ĐÚNG mà KHÔNG ghi một byte nào", () => {
  const todo = "# TODO\n\n- [ ] còn mở\n- ✅ **xong rồi**\n  dòng con của mục đã xong\n";
  const s = scratch(todo);
  try {
    const r = archiveTodo(s.ctx, s.dbPath, { dryRun: true });
    assert.equal(r.moved, 1, "xem trước vẫn phải ĐẾM đúng số mục sẽ dời");
    assert.equal(s.read("05_TODO.md"), todo, "xem trước KHÔNG được ghi vào file sổ");
    assert.throws(() => s.read("../archive/05_TODO.md"), "xem trước KHÔNG được tạo file archive");
    // …và lượt THẬT sau đó vẫn dời được (xem trước không được ăn mất việc).
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1, "lượt thật sau xem trước vẫn phải dời");
    assert.ok(!s.read("05_TODO.md").includes("xong rồi"), "lượt thật mới là lượt ghi");
  } finally {
    s.cleanup();
  }
});

test("CA ÂM — không truyền cờ thì hành vi giữ NGUYÊN như trước (xem trước không được rò sang lượt thật)", () => {
  const todo = "# TODO\n\n- [ ] còn mở\n- ✅ **xong rồi**\n";
  const s = scratch(todo);
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1);
    assert.ok(!s.read("05_TODO.md").includes("xong rồi"), "mặc định vẫn DỜI THẬT, không thành dry-run ngầm");
    assert.ok(s.read("05_TODO.md").includes("còn mở"), "việc đang mở phải còn nguyên");
  } finally {
    s.cleanup();
  }
});

test("a closed item inside a fenced block is text, not an item (no false archiving)", () => {
  const fenced = `# TODO\n\n\`\`\`\n- [x] đây là ví dụ trong khối code\n\`\`\`\n\n- [ ] việc thật\n`;
  const s = scratch(fenced);
  try {
    const r = archiveTodo(s.ctx, s.dbPath);
    assert.equal(r.moved, 0, "an item-looking line inside a fence must not be archived");
    assert.match(s.read("05_TODO.md"), /ví dụ trong khối code/);
  } finally {
    s.cleanup();
  }
});

// Mutation testing caught this gap: "archive twice" below never reaches the append
// path, because the second run has nothing to move and returns early. Replacing the
// append with a plain overwrite therefore stayed green — silently discarding every
// previously archived item. This test closes that hole by archiving a SECOND batch.
test("a later archive run APPENDS — it must not discard what was archived before", () => {
  const s = scratch(BACKLOG);
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 2);
    const first = s.read(join("archive", "05_TODO.md"));
    assert.match(first, /việc đã xong/);

    // New work happens, gets done, and the backlog is archived again.
    writeFileSync(
      join(s.ctx.docsDir, "05_TODO.md"),
      s.read("05_TODO.md") + "\n## Nhóm C\n- [x] việc xong ở đợt sau\n",
    );
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1);

    const second = s.read(join("archive", "05_TODO.md"));
    assert.match(second, /việc xong ở đợt sau/, "the new batch is archived");
    assert.match(second, /việc đã xong/, "the FIRST batch must survive the second run");
    assert.match(second, /việc xong thứ hai/, "…all of it, not just the newest entry");
  } finally {
    s.cleanup();
  }
});

test("archiving twice is safe: the second run finds nothing left to move", () => {
  const s = scratch(BACKLOG);
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 2);
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 0, "no closed items remain, so nothing moves");
    assert.match(s.read(join("archive", "05_TODO.md")), /việc xong thứ hai/, "archive is not clobbered");
  } finally {
    s.cleanup();
  }
});

// Immediate indexing: a moved item must be searchable straight away, not only after
// someone next remembers to run `reindex`.
test("both tiers are indexed by the archive itself", async () => {
  const { openMemory } = await import("../../dist/memory/db.js");
  const s = scratch(BACKLOG);
  try {
    archiveTodo(s.ctx, s.dbPath);
    const db = openMemory(s.dbPath);
    try {
      const kinds = db
        .prepare("SELECT kind, COUNT(*) n FROM doc WHERE project_root=? GROUP BY kind")
        .all(s.ctx.projectRoot)
        .map((r) => r.kind)
        .sort();
      assert.deepEqual(kinds, ["agent", "agent-archive"], "the active backlog AND its archive both land in the index");
      const hit = db
        .prepare(
          "SELECT d.kind FROM section s JOIN doc d ON d.id=s.doc_id WHERE d.project_root=? AND s.body LIKE '%việc đã xong%'",
        )
        .get(s.ctx.projectRoot);
      assert.equal(hit?.kind, "agent-archive", "the archived item is reachable through the archive tier");
    } finally {
      db.close();
    }
  } finally {
    s.cleanup();
  }
});

// Tầng CLI — nơi sự cố THẬT xảy ra: người gõ `--help` và mất 5 entry + 6 mục. Ca này chạy
// `dist/cli.js` thật trên một repo TẠM (không đụng repo này), rồi đòi hai điều: exit ≠ 0 và
// **file không đổi một byte**. Thiếu vế thứ hai thì một bản vá chỉ-in-lỗi-rồi-vẫn-ghi vẫn xanh.
test("CLI: cờ lạ ⇒ TỪ CHỐI (exit≠0) và KHÔNG ghi gì; `--dry-run` cũng không ghi", async () => {
  const { execFileSync } = await import("node:child_process");
  const root = mkdtempSync(join(tmpdir(), "zarch-cli-"));
  const docsDir = join(root, "docs", "agent");
  mkdirSync(docsDir, { recursive: true });
  const todo = "# TODO\n\n- [ ] còn mở\n- ✅ **xong rồi**\n";
  writeFileSync(join(docsDir, "05_TODO.md"), todo);
  writeFileSync(join(docsDir, "06_CHANGES.md"), "# Change Log\n");
  writeFileSync(join(root, "docs", ".harness.json"), JSON.stringify({ docs: "docs/agent" }));
  writeFileSync(join(root, "AGENTS.md"), "# fixture\n");
  const cli = new URL("../../dist/cli.js", import.meta.url).pathname.replace(/^\//, "");
  const run = (args) => {
    try {
      execFileSync(process.execPath, [cli, "archive", ...args], {
        cwd: root,
        stdio: "pipe",
        env: { ...process.env, GLOBAL_MEMORY_DB: join(root, "t.db") },
      });
      return 0;
    } catch (e) {
      return e.status ?? -1;
    }
  };

  try {
    assert.notEqual(run(["--help"]), 0, "cờ lạ phải làm lệnh THẤT BẠI, không phải im lặng chạy");
    assert.equal(readFileSync(join(docsDir, "05_TODO.md"), "utf8"), todo, "cờ lạ ⇒ KHÔNG được ghi một byte");

    assert.equal(run(["--dry-run"]), 0, "xem trước là đường hợp lệ");
    assert.equal(readFileSync(join(docsDir, "05_TODO.md"), "utf8"), todo, "xem trước ⇒ KHÔNG được ghi");

    assert.equal(run([]), 0, "CA ÂM: không cờ thì vẫn chạy như cũ");
    assert.ok(
      !readFileSync(join(docsDir, "05_TODO.md"), "utf8").includes("xong rồi"),
      "không cờ ⇒ dời thật (nếu ca này xanh cả khi bản vá chặn hết thì cổng vô nghĩa)",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("`✅` is a CLOSED marker too — the repo's real writing convention (2026-08-21)", () => {
  // Measured at session close 21/08 on the live backlog: **0 items written `[x]`, 59 written
  // `✅`**. So this whole mechanism — built to stop closed items piling up — had never moved a
  // single one, and 05_TODO had grown to 2,327 lines. The rule was right; it was watching a
  // spelling nobody uses. Open work must NOT ride along: swallowing it loses the work.
  const s = scratch(`# TODO

## Nhóm
- ✅ **xong kiểu tick** — dòng chi tiết đi kèm.
- [x] **xong kiểu ngoặc**
- [ ] **CHƯA làm** — phải ở lại
- [~] **đang làm** — phải ở lại
`);
  try {
    const r = archiveTodo(s.ctx, s.dbPath);
    assert.equal(r.moved, 2, `both spellings must move, got ${r.moved}`);
    const left = s.read("05_TODO.md");
    assert.match(left, /CHƯA làm/, "open item stays");
    assert.match(left, /đang làm/, "in-progress item stays");
    assert.ok(!left.includes("xong kiểu tick"), "the ✅ item must leave");
    const moved = s.read(join("archive", "05_TODO.md"));
    assert.match(moved, /xong kiểu tick/, "archive must hold the ✅ item");
    assert.match(moved, /dòng chi tiết đi kèm/, "its continuation line comes along");
    assert.ok(!moved.includes("CHƯA làm"), "open work must never be swallowed into the archive");
  } finally {
    s.cleanup();
  }
});
