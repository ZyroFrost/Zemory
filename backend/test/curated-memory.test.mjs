// Adapter bộ nhớ CURATED của Claude Code (#13, user gật 2026-08-24) — ingest
// ~/.claude/projects/<enc>/memory/*.md thành lane riêng `claude-code-memory`.
//
// Bốn bất biến phải giữ (05_TODO đặt ra): ① read-only — không ghi ngược file ·
// ② provenance lane riêng, scope lọc được · ③ redact lúc nạp (điều 7) · ④ file đổi
// là whole-replace, không đổi là no-op (idempotent).

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, utimesSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { hostname } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { scan } from "../../dist/memory/ingest.js";
import { claudeMemoryAdapter, encodeProjectDir, decodeProjectDir, memoryTitle } from "../../dist/memory/adapters/claudemem.js";

/** Dựng: home giả (memory files) + project root thật (để registry nhận) + DB tạm. */
function rig() {
  const root = mkdtempSync(join(tmpdir(), "zcuram-"));
  const home = join(root, "home");
  const proj = join(root, "MyProj");
  // Project "connected" thật — listKnownProjects lọc isConnected (đòi docs/.harness.json).
  mkdirSync(join(proj, "docs"), { recursive: true });
  writeFileSync(join(proj, "docs", ".harness.json"), JSON.stringify({ providers: {} }));
  const enc = encodeProjectDir(proj);
  const memDir = join(home, ".claude", "projects", enc, "memory");
  mkdirSync(memDir, { recursive: true });
  const dbPath = join(root, "mem.db");
  const registry = join(root, "projects.json");
  writeFileSync(registry, JSON.stringify({ version: 2, projects: [{ root: proj }] }));
  const prevReg = process.env.ZEMORY_REGISTRY_FILE;
  process.env.ZEMORY_REGISTRY_FILE = registry;
  return {
    home, proj, enc, memDir, dbPath,
    write(name, text, ageMs = 0) {
      const p = join(memDir, name);
      writeFileSync(p, text);
      if (ageMs) {
        const t = (Date.now() - ageMs) / 1000;
        utimesSync(p, t, t);
      }
      return p;
    },
    scan(opts = {}) {
      return scan({ dbPath, home, adapters: [claudeMemoryAdapter], excludeLanes: [], ...opts });
    },
    db() {
      return new Database(dbPath, { readonly: true });
    },
    cleanup() {
      if (prevReg === undefined) delete process.env.ZEMORY_REGISTRY_FILE;
      else process.env.ZEMORY_REGISTRY_FILE = prevReg;
      rmSync(root, { recursive: true, force: true });
    },
  };
}

const FACT = `---
name: gate-needs-daemon-off
description: turn the daemon off before npm run check
metadata:
  type: feedback
---

Turn the daemon off before running the gate, otherwise embed tests OOM.
`;

test("ingest: 1 file = 1 session, lane claude-code-memory, title từ frontmatter, project map qua registry", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  r.write("gate-needs-daemon-off.md", FACT);
  r.write("MEMORY.md", "# Memory Index\n\n- [x](x.md) — hook\n");
  const rep = r.scan();
  assert.equal(rep.sessions.length, 2);
  const db = r.db();
  try {
    const s = db
      .prepare("SELECT id, source, origin, project_root, title, host, message_count FROM sessions ORDER BY id")
      .all();
    assert.equal(s.length, 2);
    for (const row of s) {
      assert.equal(row.source, "claude-code-memory", "lane riêng — scope-tree lọc được");
      assert.equal(row.origin, "local");
      assert.equal(row.project_root, r.proj, "enc dir phải map về đúng project root qua registry");
      assert.equal(row.message_count, 1, "một fact = một tin");
      assert.ok(row.id.includes(hostname()), "session id mang hostname — hai máy không lẫn phiên (điều 11)");
    }
    const fact = s.find((x) => x.id.endsWith("gate-needs-daemon-off"));
    assert.equal(fact.title, "turn the daemon off before npm run check", "title = description frontmatter");
    const m = db.prepare("SELECT role, tool_name, content FROM messages WHERE session_id = ?").get(fact.id);
    assert.equal(m.role, "memory");
    assert.equal(m.tool_name, null, "tool_name NULL — không dính hình phạt tool, vào đủ 3 lane tìm");
    assert.ok(m.content.includes("OOM"));
  } finally {
    db.close();
  }
});

test("idempotent: quét lại không đổi gì · file ĐỔI ⇒ whole-replace đúng nội dung mới", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  const p = r.write("fact.md", FACT, 60_000);
  const r1 = r.scan();
  assert.equal(r1.totals.newMessages, 1);
  const r2 = r.scan();
  assert.equal(r2.totals.newMessages, 0, "không đổi ⇒ ingest_state short-circuit, 0 tin mới");

  writeFileSync(p, FACT.replace("OOM", "OOM (đo 2026-08-24)"));
  r.scan();
  const db = r.db();
  try {
    const rows = db.prepare("SELECT content FROM messages").all();
    assert.equal(rows.length, 1, "whole-replace: vẫn đúng MỘT tin, không nhân đôi");
    assert.ok(rows[0].content.includes("đo 2026-08-24"), "nội dung phải là bản MỚI");
  } finally {
    db.close();
  }
  // ① read-only: file nguồn không bị ghi ngược (mtime đứng yên qua hai lượt quét).
  const before = statSync(p).mtimeMs;
  r.scan();
  assert.equal(statSync(p).mtimeMs, before, "adapter không được chạm file nguồn (điều 3/10)");
});

test("redact lúc nạp: secret trong file memory KHÔNG vào kho dạng trần (điều 7)", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  const secret = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ00-abcdefgAA";
  r.write("leaky.md", `---\nname: leaky\ndescription: leaked key\n---\n\ntoken: ${secret}\n`);
  r.scan();
  const db = r.db();
  try {
    const m = db.prepare("SELECT content FROM messages").get();
    assert.ok(!m.content.includes(secret), "chìa dạng trần không được nằm trong kho");
    // File NGUỒN thì giữ nguyên — redact là chuyện của kho, không phải của file người ta.
    assert.ok(readFileSync(join(r.memDir, "leaky.md"), "utf8").includes(secret));
  } finally {
    db.close();
  }
});

test("scope exclude chặn từ CỬA NẠP: lane bị loại ⇒ 0 session + được BÁO, không cắt âm thầm", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  r.write("fact.md", FACT);
  const rep = r.scan({ excludeLanes: [{ origin: "local", source: "claude-code-memory" }] });
  assert.equal(rep.sessions.length, 0);
  assert.ok(
    rep.skippedLanes.some((l) => l.lane.includes("claude-code-memory") && l.files >= 1),
    "lane bị loại phải hiện trong skippedLanes",
  );
});

test("enc dir KHÔNG có trong registry ⇒ project_root NULL, không đoán bừa", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  const strangeDir = join(r.home, ".claude", "projects", "x--stranger-Repo", "memory");
  mkdirSync(strangeDir, { recursive: true });
  writeFileSync(join(strangeDir, "note.md"), "# A note\n\nbody\n");
  r.scan();
  const db = r.db();
  try {
    const s = db.prepare("SELECT project_root FROM sessions WHERE id LIKE '%stranger%'").get();
    assert.equal(s.project_root, null, "mã hoá là lossy — không match thì để (unknown), cấm suy diễn");
  } finally {
    db.close();
  }
});

test("enumerate chỉ nhặt memory/*.md — transcript .jsonl và file ngoài memory/ không bị đụng", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  const projDir = join(r.home, ".claude", "projects", r.enc);
  writeFileSync(join(projDir, "abc123.jsonl"), '{"type":"user"}\n');
  writeFileSync(join(projDir, "stray.md"), "# stray\n");
  r.write("fact.md", FACT);
  const files = claudeMemoryAdapter.enumerate(join(r.home, ".claude", "projects"));
  assert.equal(files.length, 1);
  assert.ok(files[0].path.endsWith("fact.md"));
});

test("phụ tùng: encode/decode + memoryTitle fallback theo đúng bậc thang", (t) => {
  const r = rig();
  t.after(() => r.cleanup());
  assert.equal(encodeProjectDir("d:\\huy.nguyen\\Tool\\Zemory"), "d--huy-nguyen-Tool-Zemory");
  assert.equal(decodeProjectDir(r.enc), r.proj);
  assert.equal(decodeProjectDir("z--khong-ai-biet"), null);
  assert.equal(memoryTitle("---\nname: n1\n---\nbody", "stem"), "n1", "thiếu description thì lấy name");
  assert.equal(memoryTitle("# Heading here\nbody", "stem"), "Heading here");
  assert.equal(memoryTitle("plain body", "stem"), "stem");
});
