// `zemory todo verify` — máy ĐO lại sổ TODO (user chốt 2026-08-06).
//
// Phép thử có nghĩa duy nhất: nó có bắt được ĐÚNG HAI CA ĐÃ TRẢ GIÁ THẬT không —
//   ① §🚨 ② ghi "write-gate chưa sửa" trong khi `acquireCliWriteLock` tồn tại kèm test;
//   ② plan 14 §7 ghi "chưa chốt tray bằng gì" trong khi `platform/tray.ts` nặng 24 KB.
// Cả hai lọt lưới suốt một tháng vì agent ĐỌC sổ rồi chép lại. Nếu công cụ này không đỏ
// trên hai ca đó thì nó vô dụng, dù có xanh đẹp trên repo hiện tại.

import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { markdownSentences, parseTodoItems, verifyTodo } from "../../dist/docs/todo-verify.js";
import { tempDir } from "./helpers.mjs";

/** Repo giả: vài file nguồn thật + một `05_TODO.md` do test soạn. */
function fakeRepo(t, todoBody, files = {}) {
  const root = tempDir(t, "ztodo-");
  mkdirSync(join(root, "docs", "agent"), { recursive: true });
  writeFileSync(join(root, "docs", "agent", "05_TODO.md"), todoBody);
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, text);
  }
  return root;
}

/** Chạy git trong `cwd` với ngày commit ép cứng (test phải tất định, không theo giờ máy). */
function git(cwd, args, date) {
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };
  if (date) {
    env.GIT_AUTHOR_DATE = date;
    env.GIT_COMMITTER_DATE = date;
  }
  execFileSync("git", args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
}

test("it CATCHES the real write-gate case - through the TIME axis, the only thing that can catch it", (t) => {
  // Ca thật KHÔNG bắt được bằng chữ nghĩa: sổ ghi "chưa sửa" và nêu tên hàm CŨ
  // (`acquireCliWrite`), còn bản vá landing dưới tên MỚI (`acquireCliWriteLock`) mà sổ
  // không hề nhắc — không có mâu thuẫn nào giữa chữ trong sổ và chữ trong code. Nhưng git
  // thì biết: file đó bị sửa SAU khi dòng sổ được viết.
  const root = fakeRepo(
    t,
    "- [ ] **② Write-gate KHÔNG BAO GIỜ TỪ CHỐI ai (chưa sửa).** Xem `jobs/writegate.ts`.",
    { "backend/src/jobs/writegate.ts": "export function acquireCliWrite(){ /* chỉ đặt mốc */ }" },
  );
  git(root, ["init", "-q"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "so ghi chua sua"], "2026-08-01T10:00:00+07:00");

  // Nhiều ngày sau, code được vá — nhưng KHÔNG ai đụng vào dòng sổ.
  writeFileSync(
    join(root, "backend/src/jobs/writegate.ts"),
    "export function acquireCliWriteLock(){ return { ok: false }; }",
  );
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "va khoa that"], "2026-08-05T10:00:00+07:00");

  const f = verifyTodo(root).findings.filter((x) => x.kind === "code-moi-hon-so");
  assert.equal(f.length, 1, "phải kêu — đây đúng ca lọt lưới suốt một tháng");
  assert.match(f[0].detail, /writegate\.ts/);
  assert.match(f[0].detail, /2026-08-05/, "phải nói RÕ code đổi ngày nào để người đọc tự đo lại");
});

test("the time axis stays quiet when the ledger is updated in the same batch as the code", (t) => {
  const root = fakeRepo(t, "- [ ] Sửa `jobs/writegate.ts` cho đúng.", {
    "backend/src/jobs/writegate.ts": "export const x = 1;",
  });
  git(root, ["init", "-q"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "cung mot dot"], "2026-08-05T10:00:00+07:00");
  assert.deepEqual(
    verifyTodo(root).findings.filter((x) => x.kind === "code-moi-hon-so"),
    [],
    "sửa code và ghi sổ cùng lúc là quy trình ĐÚNG — kêu ở đây là báo oan",
  );
});

test("it CATCHES the tray case: the ledger says 'not decided' while the file already exists", (t) => {
  const root = fakeRepo(
    t,
    "- [ ] **(plan 14 §7) Chưa chốt:** ① tray bằng gì trên Node — xem `platform/tray.ts`, chưa có bản nào.",
    { "backend/src/platform/tray.ts": "// systray2\nexport function startTray(){}" },
  );
  const f = verifyTodo(root).findings.filter((x) => x.kind === "nghi-da-xong");
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /tray\.ts/);
});

test("it RE-MEASURES a '0 match' measurement instead of merely asking whether the file exists", (t) => {
  const root = fakeRepo(
    t,
    "- [ ] **MCP mirror** — CHƯA wire (`mcp.ts` 0 match `graph`).",
    { "backend/src/mcp.ts": "import { buildCodeGraph } from './graph.js'; // graph tools" },
  );
  const f = verifyTodo(root).findings.filter((x) => x.kind === "nghi-da-xong");
  assert.equal(f.length, 1, "code đã mọc thêm `graph` ⇒ phép đo trong sổ đã thối");
  assert.match(f[0].detail, /ĐO LẠI/);

  // Ngược lại: phép đo còn ĐÚNG thì phải IM.
  const ok = fakeRepo(t, "- [ ] CHƯA wire (`mcp.ts` 0 match `graph`).", { "backend/src/mcp.ts": "export const x = 1;" });
  assert.equal(verifyTodo(ok).findings.length, 0, "phép đo còn đúng mà kêu là báo oan");
});

test("NO false positive: an item saying 'X is NOT done' while X really is absent means the ledger is RIGHT and must stay quiet", (t) => {
  // Bản đầu gắn nhãn ngược hẳn ý người viết: `/session-raw` bị gọi là "sổ khẳng định có,
  // repo không có" trong khi sổ ghi rõ CHƯA làm. Luật phải bất đối xứng theo GIỌNG của câu.
  const root = fakeRepo(t, "- [ ] **`/session-raw` (đọc transcript gốc) — CHƯA làm, chờ user quyết**.", {
    "backend/src/ui.ts": "// không có endpoint đó",
  });
  assert.deepEqual(verifyTodo(root).findings, [], "sổ nói chưa có, code cũng chưa có ⇒ khớp, không phải lệch");
});

test("it CATCHES a dead reference: an item citing a path as existing that the repo does not have", (t) => {
  const root = fakeRepo(t, "- [ ] Sửa lại `commands/khong-ton-tai.ts` cho đúng.", {
    "backend/src/commands/memory.ts": "export const x = 1;",
  });
  const f = verifyTodo(root).findings.filter((x) => x.kind === "ref-chet");
  assert.equal(f.length, 1);
  assert.match(f[0].detail, /khong-ton-tai\.ts/);
});

test("an item the user DEFERRED is not inspected", (t) => {
  const root = fakeRepo(t, "- [ ] ⏸ **Codex** — `platform/tray.ts` chưa có gì.", {
    "backend/src/platform/tray.ts": "export function startTray(){}",
  });
  assert.deepEqual(verifyTodo(root).findings, [], "user chốt gác lại thì không phải nợ");
});

test("sentence splitting must strip markdown emphasis, otherwise a negation bleeds into the next sentence", () => {
  const s = markdownSentences("**Edge id chưa ai TIÊU THỤ.** Mới có phía phát (payload `/code-graph`).");
  assert.equal(s.length, 2, "`**` chen giữa dấu chấm từng làm hai câu dính làm một");
  assert.match(s[0], /chưa ai TIÊU THỤ/);
  assert.ok(!/chưa/.test(s[1]), "câu sau KHÔNG được mang phủ định của câu trước");
});

test("parseTodoItems reads the state correctly and joins continuation lines", () => {
  const items = parseTodoItems(["- [ ] mở", "  nối tiếp", "- [~] đang làm", "- [x] xong", "- ✅ xong kiểu khác"].join("\n"));
  assert.deepEqual(items.map((i) => i.status), ["open", "doing", "done", "done"]);
  assert.match(items[0].body, /nối tiếp/);
});
