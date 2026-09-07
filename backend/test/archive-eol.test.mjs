// `archive` ghép file archive từ BA mảnh có EOL khác nhau: phần cắt ra (join(eol) — đúng),
// hằng số INTRO (nhúng LF cứng), và dấu nối "\n" + prevBody. Trên một repo CRLF, cái ra là
// file EOL LẪN — vài dòng LF nằm giữa một file CRLF.
//
// Vì sao đáng một test riêng: EOL lẫn/đảo không sai một chữ nào, nên không cổng nào kêu — nhưng
// `git diff` thì kêu MỌI DÒNG đều đổi. Đo 2026-09-04 trên `KhoDuLieuTrungTam`: một lượt ghi
// đảo EOL cả file làm diff báo 255/251 dòng trong khi thay đổi thật là 3 dòng, và blame theo dòng
// mất sạch. Test này canh bản nhỏ của chính lỗi đó.
//
// Chuẩn là EOL của file NGUỒN (05_TODO / 06_CHANGES), không phải của file archive: một họ hai
// file thì đi cùng một kiểu, và nguồn là thứ người ta đọc mỗi phiên.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveTodo, archiveChanges } from "../../dist/docs/archive.js";

function scratch(name, body) {
  const root = mkdtempSync(join(tmpdir(), "zeol-"));
  const docsDir = join(root, "docs", "agent");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, name), body);
  return {
    dbPath: join(root, "t.db"),
    ctx: { projectRoot: root, docsDir, config: { thresholds: { changes_lines: 4, changes_keep: 2 } } },
    read: (rel) => readFileSync(join(docsDir, rel), "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** Số dòng LF ĐƠN ĐỘC (không có CR đứng trước) — trên file CRLF thì phải là 0. */
function loneLf(text) {
  return (text.match(/(^|[^\r])\n/g) || []).length;
}

const TODO_LINES = ["# TODO", "", "- [x] xong rồi", "  chi tiết của nó", "- [ ] còn mở", ""];
const CHANGES_LINES = [
  "# Change Log", "", "## [2026-09-03] — moi nhat", "noi dung 3", "",
  "## [2026-09-02] — cu hon", "noi dung 2", "", "## [2026-09-01] — cu nhat", "noi dung 1", "",
];

test("05_TODO CRLF: file archive KHÔNG được có LF đơn độc", () => {
  const s = scratch("05_TODO.md", TODO_LINES.join("\r\n"));
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1);
    const archived = s.read(join("archive", "05_TODO.md"));
    assert.equal(loneLf(archived), 0, "archive phải theo CRLF của file nguồn, kể cả dòng INTRO");
    assert.equal(loneLf(s.read("05_TODO.md")), 0, "file sổ chính cũng phải giữ CRLF");
  } finally {
    s.cleanup();
  }
});

test("06_CHANGES CRLF: file archive KHÔNG được có LF đơn độc", () => {
  const s = scratch("06_CHANGES.md", CHANGES_LINES.join("\r\n"));
  try {
    assert.ok(archiveChanges(s.ctx, s.dbPath).moved > 0, "phải cắt được ít nhất một entry");
    const archived = s.read(join("archive", "06_CHANGES.md"));
    assert.equal(loneLf(archived), 0, "archive phải theo CRLF của file nguồn");
    assert.equal(loneLf(s.read("06_CHANGES.md")), 0, "file sổ chính cũng phải giữ CRLF");
  } finally {
    s.cleanup();
  }
});

test("repo LF thì KHÔNG được lẫn CR vào", () => {
  const s = scratch("05_TODO.md", TODO_LINES.join("\n"));
  try {
    assert.equal(archiveTodo(s.ctx, s.dbPath).moved, 1);
    assert.doesNotMatch(s.read(join("archive", "05_TODO.md")), /\r/, "repo LF phải ra LF");
    assert.doesNotMatch(s.read("05_TODO.md"), /\r/, "repo LF phải ra LF");
  } finally {
    s.cleanup();
  }
});
