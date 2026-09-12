// `zemory setup mcp <agent>` GHI vào file cấu hình NGOÀI project — cấu hình của chính user,
// nơi họ có thể đã khai tay nhiều server khác. Hỏng ở đây không phải là gate đỏ, mà là mất
// cấu hình của người dùng. Bốn thứ phải luôn đúng:
//   · giữ nguyên mọi server khác (và mọi khoá lạ ở mọi tầng)
//   · đã khai rồi thì KHÔNG ghi lại, trừ --force
//   · file JSON hỏng thì DỪNG, tuyệt đối không ghi đè
//   · thiếu thư mục cấu hình (agent chưa cài) thì KHÔNG tự dựng cây thư mục cho nó

import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  MEMORY_PROTOCOL,
  PROTOCOL_BEGIN,
  PROTOCOL_END,
  UNSUPPORTED,
  agentTargets,
  inspectAgent,
  inspectProtocol,
  mergeProtocol,
  mergeServerConfig,
  protocolBlock,
  wireAgent,
  writeProtocol,
} from "../../dist/mcpsetup.js";
import { TOOLS } from "../../dist/tools/index.js";

const scratch = () => mkdtempSync(join(tmpdir(), "zmcp-"));
const target = (path, scope = "user") => ({ id: "t", label: "T", path, candidates: [path], key: "mcpServers", scope });

test("merge preserves other servers and the user's unknown keys", () => {
  const before = {
    mcpServers: { other: { command: "other-bin", args: ["x"] } },
    theme: "dark",
    experimental: { nested: true },
  };
  const { next, changed, reason } = mergeServerConfig(before, "mcpServers");
  assert.equal(changed, true);
  assert.equal(reason, "added");
  assert.deepEqual(next.mcpServers.other, { command: "other-bin", args: ["x"] }, "server khác phải còn nguyên");
  assert.equal(next.theme, "dark", "khoá lạ ngoài mcpServers phải còn");
  assert.deepEqual(next.experimental, { nested: true });
  assert.equal(next.mcpServers.zemory.command, "zemory");
});

test("an entry already declared is NOT rewritten - unless --force", () => {
  const before = { mcpServers: { zemory: { command: "zemory", args: ["mcp"], custom: "user sửa tay" } } };
  const keep = mergeServerConfig(before, "mcpServers");
  assert.equal(keep.changed, false, "không được đụng vào bản user đã tự sửa");
  assert.equal(keep.reason, "already");
  assert.equal(keep.next.mcpServers.zemory.custom, "user sửa tay");
  const forced = mergeServerConfig(before, "mcpServers", "zemory", true);
  assert.equal(forced.changed, true);
  assert.equal(forced.reason, "replaced");
});

test("a broken JSON file means STOP, never overwrite", () => {
  const dir = scratch();
  const f = join(dir, "cfg.json");
  writeFileSync(f, "{ this is not json");
  const r = wireAgent(target(f));
  assert.equal(r.wrote, false);
  assert.equal(r.reason, "bad-json");
  assert.equal(readFileSync(f, "utf8"), "{ this is not json", "nội dung phải còn NGUYÊN");
});

test("a missing config folder (the agent is not installed) means no directory tree is created", () => {
  const dir = scratch();
  const f = join(dir, "khong-ton-tai", "cfg.json");
  const r = wireAgent(target(f));
  assert.equal(r.wrote, false);
  assert.equal(r.reason, "no-parent-dir");
  assert.equal(existsSync(join(dir, "khong-ton-tai")), false, "không được để lại thư mục rác trên máy user");
});

test("a real write: it creates the file, backs up to .bak, and inspect sees the declaration", () => {
  const dir = scratch();
  const f = join(dir, "cfg.json");
  writeFileSync(f, JSON.stringify({ mcpServers: { other: { command: "o" } } }, null, 2));
  const r = wireAgent(target(f));
  assert.equal(r.wrote, true);
  assert.ok(r.backup && existsSync(r.backup), "phải sao lưu trước khi ghi");
  const after = JSON.parse(readFileSync(f, "utf8"));
  assert.equal(after.mcpServers.other.command, "o");
  assert.equal(after.mcpServers.zemory.args[0], "mcp");
  assert.equal(inspectAgent(target(f)), "wired");
});

test("the target table covers every MCP-speaking agent, each with its own path", () => {
  const targets = agentTargets("D:\\proj");
  const ids = targets.map((t) => t.id);
  for (const want of ["claude-code", "claude-desktop", "cursor", "windsurf", "gemini", "qwen", "kiro", "antigravity"]) {
    assert.ok(ids.includes(want), `thiếu đích ${want}`);
  }
  const firsts = targets.map((t) => t.candidates[0]);
  assert.equal(new Set(firsts).size, firsts.length, "hai agent không được trỏ cùng một file");
  const cc = targets.find((t) => t.id === "claude-code");
  assert.equal(cc.scope, "project", "Claude Code khai theo PROJECT — nằm trong repo, không phải máy");
});

test("an agent that is not installed gets NO guessed path to write into", () => {
  // Đo 2026-08-02: 0/10 đường cấu hình của các agent này tồn tại trên máy dev, nên đường dẫn
  // lấy từ tài liệu bên thứ ba là chỗ ĐOÁN. Quy tắc "chỉ chọn khi file hoặc thư mục cha có
  // thật" biến nó thành tự-xác-minh: sai đường thì không ghi gì, thay vì đẻ file cấu hình ma.
  for (const t of agentTargets("D:\\proj").filter((x) => x.scope === "user")) {
    if (t.path === null) continue;
    assert.ok(
      existsSync(t.path) || existsSync(dirname(t.path)),
      `${t.id}: chọn đường mà cả file lẫn thư mục cha đều không có — đó là đoán`,
    );
  }
});

// ─── Lời dặn (memory protocol) ────────────────────────────────────────────────
// Khai server chỉ cho agent CÓ tool; lời dặn mới làm nó BIẾT LÚC NÀO gọi. Khối này ghi vào
// file chỉ dẫn của user — nơi họ tự viết luật của mình — nên phải: chèn/thay ĐÚNG khối của
// mình, không bao giờ đẻ bản thứ hai, và không đụng một chữ nào bên ngoài marker.

const memoTarget = (memo, memoScope = "user") => ({
  ...target(join(dirname(memo), "cfg.json")),
  memo,
  memoCandidates: [memo],
  memoScope,
});

test("inserting the instructions: the user's text is preserved and a rerun does NOT create a second block", () => {
  const mine = "# Luật của tôi\n\n- luôn dùng tiếng Việt\n";
  const one = mergeProtocol(mine);
  assert.equal(one.reason, "added");
  assert.ok(one.next.startsWith(mine), "phần user viết phải còn NGUYÊN ở đầu file");
  assert.ok(one.next.includes(PROTOCOL_BEGIN) && one.next.includes(PROTOCOL_END));

  const two = mergeProtocol(one.next);
  assert.equal(two.changed, false, "chạy lần hai không được ghi gì");
  assert.equal(two.reason, "already");
  const count = one.next.split(PROTOCOL_BEGIN).length - 1;
  assert.equal(count, 1, "chỉ được có ĐÚNG MỘT khối, không nối thêm bản mới vào cuối");
});

test("an old block is REPLACED in place, with the user's text on BOTH sides intact", () => {
  const before = "# Đầu file\n\n";
  const after = "\n## Ghi chú riêng\n\n- giữ nguyên dòng này\n";
  const stale = `${before}${PROTOCOL_BEGIN}\nnội dung bản CŨ\n${PROTOCOL_END}${after}`;
  const r = mergeProtocol(stale);
  assert.equal(r.reason, "updated");
  assert.ok(r.next.startsWith(before), "chữ trước khối phải còn");
  assert.ok(r.next.endsWith(after), "chữ sau khối phải còn");
  assert.ok(!r.next.includes("nội dung bản CŨ"), "bản cũ phải bị thay, không được để lại");
  assert.ok(r.next.includes(protocolBlock()));
});

test("a marker opened but never closed means STOP, never guess where it ends", () => {
  const broken = `# File\n\n${PROTOCOL_BEGIN}\nai đó cắt mất đuôi\n`;
  const r = mergeProtocol(broken);
  assert.equal(r.changed, false);
  assert.equal(r.reason, "broken-marker");
  assert.equal(r.next, broken, "không được sửa một ký tự nào");
});

test("a real write: it backs up to .bak, inspect sees it installed, and an old copy is reported stale", () => {
  const dir = scratch();
  const memo = join(dir, "global_rules.md");
  writeFileSync(memo, `# Của tôi\n\n${PROTOCOL_BEGIN}\ncũ\n${PROTOCOL_END}\n`);
  const t = memoTarget(memo);
  assert.equal(inspectProtocol(t), "stale", "khối có nhưng khác bản hiện hành ⇒ stale");
  const r = writeProtocol(t);
  assert.equal(r.wrote, true);
  assert.equal(r.reason, "updated");
  assert.ok(r.backup && existsSync(r.backup), "phải sao lưu trước khi ghi");
  assert.equal(inspectProtocol(t), "installed");
  assert.ok(readFileSync(memo, "utf8").startsWith("# Của tôi"), "chữ user phải còn");
});

test("an agent that is not installed gets no directory tree built just to hold the instructions", () => {
  const dir = scratch();
  const memo = join(dir, "chua-cai", "GEMINI.md");
  const r = writeProtocol(memoTarget(memo));
  assert.equal(r.wrote, false);
  assert.equal(r.reason, "no-parent-dir");
  assert.equal(existsSync(join(dir, "chua-cai")), false, "không để lại thư mục rác");
});

test("a new .mdc file must declare alwaysApply itself - without it nobody reads what was written", () => {
  const dir = scratch();
  const memo = join(dir, "rules", "zemory-memory.mdc");
  const r = writeProtocol(memoTarget(memo, "project"));
  assert.equal(r.wrote, true);
  const text = readFileSync(memo, "utf8");
  assert.match(text, /^---\r?\nalwaysApply: true\r?\n---/, "Cursor chỉ nạp rule tự khai alwaysApply");
  assert.ok(text.includes(protocolBlock()));
});

test("the instructions may only mention tools that REALLY EXIST (parity with tools/list)", () => {
  const known = new Set(TOOLS.map((t) => t.name));
  const named = [...MEMORY_PROTOCOL.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).filter((n) => n.includes("_"));
  assert.ok(named.length >= 5, "lời dặn phải nêu đích danh tool, không nói chung chung");
  for (const n of named) assert.ok(known.has(n), `lời dặn nhắc tool không tồn tại: ${n}`);
  // Ba tool này là xương sống của luồng dùng — thiếu một cái là lời dặn hụt một nhánh.
  for (const must of ["memory_context", "memory_search", "changelog_search"]) {
    assert.ok(MEMORY_PROTOCOL.includes(must), `lời dặn phải dạy khi nào gọi ${must}`);
  }
});

test("an agent that cannot take instructions must say WHY, never leave a silent blank", () => {
  for (const t of agentTargets("D:\\proj")) {
    if (t.memoCandidates.length) continue;
    assert.ok(t.memoWhy && t.memoWhy.length > 20, `${t.id}: bỏ trống lời dặn mà không nêu lý do`);
  }
});

test("an agent that cannot be declared through JSON must be NAMED, never silently skipped", () => {
  const ids = UNSUPPORTED.map((u) => u.id);
  for (const want of ["codex", "opencode", "pi"]) assert.ok(ids.includes(want), `thiếu ghi chú cho ${want}`);
  for (const u of UNSUPPORTED) assert.ok(u.why.length > 20, `${u.id}: phải nói RÕ vì sao, để user biết đường khai tay`);
});
