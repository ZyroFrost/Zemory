// ADAPTER COPILOT CHAT (VS Code) — hai thứ được canh: ĐỌC ĐÚNG và NẰM ĐÚNG CHỖ.
//
// Bối cảnh: user chat một câu trong panel Copilot Chat rồi hỏi vì sao zemory không thấy
// (2026-09-12). Đo ra 47 file `chatSessions/*.jsonl`, đúng 1 file có `requests[]`, và KHÔNG
// adapter nào khai `signature` cho thư mục đó ⇒ vòng quét đi ngang qua. Hình dạng đo được ở
// `plan/07 §17.6`; fixture dưới là bản ẩn danh của chính phiên đó.
//
// Bẫy chính của định dạng: jsonl KHÔNG phải một-dòng-một-tin mà là PATCH. Câu trả lời của bot
// tới ở một dòng `kind:2` (nối vào mảng), nên một parser chỉ đọc dòng đầu sẽ lưu CÂU HỎI và mất
// CÂU TRẢ LỜI — hỏng im lặng, kho vẫn có phiên, vẫn có tin, chỉ thiếu một nửa. Ca ② canh đúng đó.
//
// Yêu cầu user, 2026-09-12: *"local là phải lưu chỗ local khi quét… bảo đảm nó nằm đúng chỗ trước"*
// ⇒ ca ⑥ chạy `scan` THẬT trong tiến trình con và đọc thẳng cột `origin`/`source`/`project_root`,
// không suy từ code.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copilotChatAdapter as A } from "../../dist/memory/adapters/copilotchat.js";
import { allAdapters } from "../../dist/memory/adapters/index.js";
import { WEB_PLATFORMS } from "../../dist/memory/webslots.js";
import { runInMemoryChild, tempDir } from "./helpers.mjs";

const TURN = {
  requestId: "request_9ece5ebc",
  timestamp: 1789152848547,
  responseId: "resp_1",
  responseTimestamp: 1789152854848,
  hiddenFromTranscript: false,
  modelId: "copilot/auto",
  message: { text: "alo", parts: [{ text: "alo", kind: "text" }] },
  // Đúng như nền ghi: hai phần KHÔNG mang chữ nằm sẵn ở dòng đầu; chữ thật tới sau bằng kind 2.
  response: [{ kind: "mcpServersStarting" }, { kind: "autoModeResolution" }],
};

/** Ba dòng patch của một lượt chat thật. */
function transcript(turn = TURN, extra = {}) {
  return [
    JSON.stringify({ kind: 0, v: { version: 3, creationDate: 1789152837604, requests: [turn], ...extra } }),
    JSON.stringify({ kind: 1, k: ["requests", 0, "result"], v: { timings: { totalElapsed: 5807 } } }),
    JSON.stringify({ kind: 2, k: ["requests", 0, "response"], v: [{ value: "Alo! Bạn cần mình hỗ trợ gì trong repo này?" }] }),
  ].join("\n");
}

/**
 * Dựng cây y như VS Code THẬT: `<home>/AppData/Roaming/Code/User/...`.
 *
 * 🔴 Bố cục này KHÔNG phải chi tiết trang trí. Bản đầu của file test đặt `Code/User` thẳng dưới
 * home giả — cổng xanh 7/7 trong khi `memory scan` trên máy thật KHÔNG thấy gì, vì fast scan chỉ
 * lấy home làm root (xem `discovery.defaultRoots`). Đúng bẫy "fixture lệch production đúng chiều
 * có ý nghĩa" mà `plan/08 §8c` đã ghi. Fixture phải nằm dưới `%APPDATA%` thì ca ⑥ mới đo thật.
 */
function store(root, { body = transcript(), folder = "file:///d%3A/huy.nguyen/Project/Personal/Zemory", empty = null } = {}) {
  const appdata = join(root, "AppData", "Roaming");
  const userDir = join(appdata, "Code", "User");
  const ws = join(userDir, "workspaceStorage", "17d9f018", "chatSessions");
  mkdirSync(ws, { recursive: true });
  const main = join(ws, "a265c76b-1718-418b-9e36-789972a148a3.jsonl");
  writeFileSync(main, body, "utf8");
  if (folder) writeFileSync(join(userDir, "workspaceStorage", "17d9f018", "workspace.json"), JSON.stringify({ folder }), "utf8");

  const ew = join(userDir, "globalStorage", "emptyWindowChatSessions");
  mkdirSync(ew, { recursive: true });
  const noFolder = join(ew, "13eef43e-7dc1-4c38-ab76-c56db8f7939f.jsonl");
  writeFileSync(noFolder, empty ?? JSON.stringify({ kind: 0, v: { version: 3, requests: [] } }), "utf8");
  return { appdata, userDir, main, noFolder };
}

test("1 one real exchange is read: question and answer, right roles, right timestamps, uuid is the platform's id", (t) => {
  const { main } = store(tempDir(t, "zm-cpc1-"));
  const s = A.parseFile(main);
  assert.deepEqual(s.messages.map((m) => m.role), ["user", "assistant"]);
  assert.equal(s.messages[0].content, "alo");
  assert.deepEqual(s.messages.map((m) => m.uuid), ["request_9ece5ebc", "resp_1"], "uuid = id của nền, khoá dedup");
  assert.equal(s.messages[0].timestamp, new Date(1789152848547).toISOString());
  assert.equal(s.messages[1].timestamp, new Date(1789152854848).toISOString());
});

test("2 the ANSWER arrives as a `kind:2` patch - dropping the replay layer loses half the conversation", (t) => {
  const { main } = store(tempDir(t, "zm-cpc2-"));
  const s = A.parseFile(main);
  assert.match(s.messages[1].content, /^Alo! Bạn cần mình/u);
  // Đột biến chứng minh ca này đỏ được: bỏ nhánh `kind === 2` trong `applyPatch` ⇒ chỉ còn 1 tin.
  assert.equal(s.messages.length, 2, "mất tin assistant = parser chỉ đọc dòng đầu");
});

test("3 a response part with no text is DROPPED - no empty message, no shape guessing", (t) => {
  const { main } = store(tempDir(t, "zm-cpc3-"), {
    body: [
      JSON.stringify({ kind: 0, v: { requests: [{ ...TURN, response: [{ kind: "toolInvocationSerialized", toolId: "readFile" }] }] } }),
    ].join("\n"),
  });
  const s = A.parseFile(main);
  // Tool call CHƯA ĐO được hình dạng (`plan/07 §17.6`) ⇒ chỉ giữ câu hỏi, KHÔNG bịa chữ cho bot.
  assert.deepEqual(s.messages.map((m) => m.role), ["user"]);
});

test("4 nothing to store yields null and no empty session (two different entry paths)", (t) => {
  const root = tempDir(t, "zm-cpc4-");
  const { noFolder } = store(root);
  // (a) chưa từng chat: `requests: []`. 46/47 file trên máy thật là loại này — chúng phải im lặng
  // biến mất, không thành 46 phiên trống trên cây Nguồn.
  assert.equal(A.parseFile(noFolder), null);

  // (b) CÓ lượt nhưng không rút được tin nào (lượt bị nền đánh dấu ẩn khỏi transcript). Đây là
  // chốt THỨ HAI, và nó cần ca riêng: ca (a) dừng ở chốt thứ nhất nên không bao giờ chạm tới nó —
  // đột biến 2026-09-12 chứng minh đúng chỗ hở này (fail 0 trước khi thêm dòng dưới).
  const hidden = join(root, "AppData", "Roaming", "Code", "User", "workspaceStorage", "17d9f018", "chatSessions", "hidden.jsonl");
  writeFileSync(hidden, JSON.stringify({ kind: 0, v: { requests: [{ ...TURN, hiddenFromTranscript: true }] } }), "utf8");
  assert.equal(A.parseFile(hidden), null, "phiên 0 tin vẫn là phiên rỗng trên UI");
});

test("5 enumerate covers exactly the two folders; sessionId carries the prefix; cwd is read from workspace.json", (t) => {
  const root = tempDir(t, "zm-cpc5-");
  const { userDir, main, noFolder } = store(root);
  const paths = A.enumerate(userDir).map((f) => f.path).sort();
  assert.deepEqual(paths, [main, noFolder].sort(), "thiếu nhánh nào là mất cả một loại chat");

  assert.equal(A.sessionId(main), "copilot-chat-a265c76b-1718-418b-9e36-789972a148a3");
  assert.ok(A.sessionId(main).startsWith("copilot-chat-"), "bare uuid sẽ đụng session id của claude-code");

  assert.equal(A.parseFile(main).cwd, "d:\\huy.nguyen\\Project\\Personal\\Zemory");

  // Chat không mở folder thì KHÔNG có workspace.json ⇒ không được bịa một project_root.
  const ew = join(userDir, "globalStorage", "emptyWindowChatSessions", "with-turn.jsonl");
  writeFileSync(ew, transcript(), "utf8");
  assert.equal(A.parseFile(ew).cwd, undefined, "không có workspace.json thì để trống, không đoán");
});

test("6 IN THE RIGHT PLACE: a real scan yields origin=local - source=copilot-chat - project_root from workspace.json", (t) => {
  const root = tempDir(t, "zm-cpc6-");
  const { appdata } = store(root);
  const [row, tree] = runInMemoryChild(
    root,
    [
      // `defaultRoots()` đọc env LÚC GỌI, nên dựng nguyên một "máy giả" ở đây: home giả là
      // `USERPROFILE` (thứ `homedir()` đọc trên Windows) và `%APPDATA%` giả nằm TRONG nó — đúng bố
      // cục thật. Hai điều kiện này là thứ ca ⑥ đo: kho trong `%APPDATA%` phải được quét, và chỉ
      // được quét khi đang ở home THẬT của lượt đó (xem `discovery.defaultRoots`, vá cùng ngày).
      'process.env.USERPROFILE = process.env.Z_ROOT; process.env.HOME = process.env.Z_ROOT;',
      'process.env.APPDATA = ' + JSON.stringify(appdata) + '; process.env.LOCALAPPDATA = ' + JSON.stringify(appdata) + ';',
      'const { scan } = await import("file://" + process.env.Z_DIST + "/memory/ingest.js");',
      'const { openMemory } = await import("file://" + process.env.Z_DIST + "/memory/db.js");',
      'const { scopeTree } = await import("file://" + process.env.Z_DIST + "/memory/scope.js");',
      'scan({ home: process.env.Z_ROOT });',
      'const db = openMemory();',
      'out.push(db.prepare("SELECT origin, source, project_root, message_count FROM sessions").all());',
      'out.push(scopeTree().map((c) => ({ label: c.label, kids: (c.children ?? []).flatMap((h) => (h.children ?? []).map((s) => s.label)) })));',
    ].join("\n"),
  );

  assert.equal(row.length, 1, "đúng một phiên: file rỗng không được thành phiên");
  assert.equal(row[0].origin, "local", "adapter KHÔNG khai origin ⇒ ingest đóng dấu local");
  assert.equal(row[0].source, "copilot-chat");
  assert.equal(row[0].message_count, 2);
  assert.match(String(row[0].project_root).toLowerCase(), /zemory$/u, "project_root lấy từ workspace.json");

  const local = tree.find((n) => n.label === "Local");
  const web = tree.find((n) => n.label === "Web chat");
  assert.ok(local?.kids.includes("copilot-chat"), "phải mọc dưới nhánh Local của cây Nguồn");
  assert.ok(!web || !web.kids.includes("copilot-chat"), "KHÔNG được mọc dưới Web chat");
});

test("7 NEGATIVE case: a local source must never touch the web lane", () => {
  // Nó không có khe, không cookie, không cửa sổ đăng nhập. Khai nhầm vào đây là đẻ một hàng
  // "mất kết nối" vĩnh viễn trên màn Nguồn cho một thứ chẳng bao giờ phải đăng nhập.
  assert.ok(!WEB_PLATFORMS.includes("copilot-chat"), "copilot-chat không phải nền web");
  assert.equal(A.origin, undefined, "khai origin:'web' là làm hỏng ca ⑥");
  const sources = allAdapters().map((a) => a.source);
  assert.ok(sources.includes("copilot-chat"), "đã đăng ký trong allAdapters");
  assert.equal(new Set(sources).size, sources.length, "không trùng source với adapter nào khác");
});
