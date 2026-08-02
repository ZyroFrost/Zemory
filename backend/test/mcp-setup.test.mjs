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
import { join } from "node:path";

import { agentTargets, inspectAgent, mergeServerConfig, wireAgent } from "../../dist/mcpsetup.js";

const scratch = () => mkdtempSync(join(tmpdir(), "zmcp-"));
const target = (path, scope = "user") => ({ id: "t", label: "T", path, key: "mcpServers", scope });

test("merge giữ nguyên server khác và khoá lạ của user", () => {
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

test("đã khai rồi thì KHÔNG ghi lại — trừ khi --force", () => {
  const before = { mcpServers: { zemory: { command: "zemory", args: ["mcp"], custom: "user sửa tay" } } };
  const keep = mergeServerConfig(before, "mcpServers");
  assert.equal(keep.changed, false, "không được đụng vào bản user đã tự sửa");
  assert.equal(keep.reason, "already");
  assert.equal(keep.next.mcpServers.zemory.custom, "user sửa tay");
  const forced = mergeServerConfig(before, "mcpServers", "zemory", true);
  assert.equal(forced.changed, true);
  assert.equal(forced.reason, "replaced");
});

test("file JSON hỏng ⇒ DỪNG, không ghi đè", () => {
  const dir = scratch();
  const f = join(dir, "cfg.json");
  writeFileSync(f, "{ this is not json");
  const r = wireAgent(target(f));
  assert.equal(r.wrote, false);
  assert.equal(r.reason, "bad-json");
  assert.equal(readFileSync(f, "utf8"), "{ this is not json", "nội dung phải còn NGUYÊN");
});

test("thiếu thư mục cấu hình (agent chưa cài) ⇒ không tự dựng cây thư mục", () => {
  const dir = scratch();
  const f = join(dir, "khong-ton-tai", "cfg.json");
  const r = wireAgent(target(f));
  assert.equal(r.wrote, false);
  assert.equal(r.reason, "no-parent-dir");
  assert.equal(existsSync(join(dir, "khong-ton-tai")), false, "không được để lại thư mục rác trên máy user");
});

test("ghi thật: tạo file, sao lưu .bak, và inspect thấy đã khai", () => {
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

test("bảng đích phủ đủ các agent nói MCP, mỗi cái một đường dẫn", () => {
  const targets = agentTargets("D:\\proj");
  const ids = targets.map((t) => t.id);
  for (const want of ["claude-code", "claude-desktop", "cursor", "windsurf", "gemini"]) {
    assert.ok(ids.includes(want), `thiếu đích ${want}`);
  }
  assert.equal(new Set(targets.map((t) => t.path)).size, targets.length, "hai agent không được trỏ cùng một file");
  const cc = targets.find((t) => t.id === "claude-code");
  assert.equal(cc.scope, "project", "Claude Code khai theo PROJECT — nằm trong repo, không phải máy");
});
