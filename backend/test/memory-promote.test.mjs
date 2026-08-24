// #12 memory promotion — bộ lọc marker + gom cụm tất định + fail-open không vector.
//
// Luật thiết kế phải giữ: ① 0 LLM — marker regex + cosine trên vector ĐÃ CÓ ·
// ② chỉ ĐỀ XUẤT, không ghi gì · ③ "lặp" nghĩa là lặp qua ≥2 PHIÊN (nhắc 3 lần trong
// một cuộc là một sự vụ, không phải một pattern) · ④ thiếu lớp vector ⇒ nói ra,
// không trả rỗng giả dạng "sạch".

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import {
  CORRECTION_RE,
  buildCandidates,
  clusterByCosine,
  correctionCandidates,
  promotionReport,
} from "../../dist/memory/promote.js";

function unit(x, y, z) {
  const n = Math.sqrt(x * x + y * y + z * z) || 1;
  return new Float32Array([x / n, y / n, z / n]);
}

test("marker: bắt câu chỉnh/chốt VN + EN, bỏ qua câu trung tính (ca ÂM)", () => {
  const yes = [
    "đừng tự push code lên git nữa",
    "tuyệt đối không ghi vào project khác",
    "từ nay mọi số liệu phải kèm nguồn đo",
    "never push without asking me first",
    "remember to close the daemon before the gate",
    "user chốt: light mode chỉ trắng đen",
  ];
  const no = [
    "hôm nay chạy bench xong rồi báo nhé",
    "the build finished in 25 minutes",
    "cài thêm package này giúp mình",
  ];
  for (const s of yes) assert.ok(CORRECTION_RE.test(s), `phải bắt: ${s}`);
  for (const s of no) assert.ok(!CORRECTION_RE.test(s), `không được bắt: ${s}`);
});

test("gom cụm cosine: hai nhóm diễn đạt + một nhiễu ⇒ 3 cụm, và TẤT ĐỊNH (chạy 2 lần y nhau)", () => {
  const items = [
    { key: 1, vec: unit(1, 0, 0) },
    { key: 2, vec: unit(0.95, 0.05, 0) },
    { key: 3, vec: unit(0.9, 0.1, 0) },
    { key: 4, vec: unit(0, 1, 0) },
    { key: 5, vec: unit(0.05, 0.95, 0) },
    { key: 6, vec: unit(0, 0.9, 0.1) },
    { key: 7, vec: unit(0, 0, 1) }, // nhiễu
  ];
  const a = clusterByCosine(items, 0.8);
  const b = clusterByCosine(items, 0.8);
  assert.equal(a.length, 3);
  const sizes = a.map((c) => c.members.length).sort((x, y) => y - x);
  assert.deepEqual(sizes, [3, 3, 1]);
  assert.deepEqual(
    a.map((c) => c.members),
    b.map((c) => c.members),
    "cùng đầu vào phải ra cùng cụm — không thì báo cáo mỗi lần một khác, user hết tin",
  );
});

/** DB tạm với vài phiên + tin user. */
function rigDb() {
  const root = mkdtempSync(join(tmpdir(), "zpromote-"));
  const dbPath = join(root, "mem.db");
  const db = openMemory(dbPath);
  const addSession = db.prepare(
    "INSERT INTO sessions (id, source, origin, project_root, host, message_count) VALUES (?, 'claude-code', 'local', ?, 'T', 1)",
  );
  const addMsg = db.prepare(
    "INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES (?, ?, 'user', ?, NULL, '2026-08-24T00:00:00Z')",
  );
  return {
    dbPath,
    add(sess, proj, content, uuid) {
      try {
        addSession.run(sess, proj);
      } catch {
        /* session exists */
      }
      addMsg.run(sess, uuid ?? Math.random().toString(36).slice(2), content);
    },
    close: () => db.close(),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("correctionCandidates: lấy đúng giọng NGƯỜI sửa sai, loại tool_result và lane curated", (t) => {
  const r = rigDb();
  t.after(() => r.cleanup());
  r.add("s1", "P1", "đừng tự push code lên git khi chưa hỏi");
  r.add("s1", "P1", "[tool_result] đừng tự push — nhưng đây là dump tool, không phải người");
  r.add("s2", "P2", "hôm nay trời đẹp quá nhỉ, chạy tiếp đi");
  r.add("s2", "P2", "x"); // dưới sàn độ dài
  // Text do HOST bơm vào role=user — đo sống 24/08: 252 bản `<local-command-caveat>`
  // mang "DO NOT…" gom thành cụm to thứ nhì của báo cáo. Người thật không mở đầu bằng tag.
  r.add("s2", "P2", "<local-command-caveat>Caveat: do not respond to these messages</local-command-caveat>");
  r.add("s2", "P2", "# AGENTS.md instructions for D:\\x <INSTRUCTIONS> never do things </INSTRUCTIONS>");
  const db = openMemory(r.dbPath);
  db.prepare("INSERT INTO sessions (id, source, origin, host, message_count) VALUES ('cm1','claude-code-memory','local','T',1)").run();
  db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name) VALUES ('cm1','f1','memory','đừng tự push — fact đã chưng cất rồi', NULL)").run();
  db.close();
  r.close();
  const cands = correctionCandidates(r.dbPath);
  assert.equal(cands.length, 1, "chỉ đúng MỘT câu người thật sửa sai");
  assert.ok(cands[0].content.includes("push"));
  assert.equal(cands[0].project, "P1");
});

test("fail-open: kho KHÔNG có lớp vector ⇒ notes nói thẳng, không trả rỗng giả dạng sạch", (t) => {
  const r = rigDb();
  t.after(() => r.cleanup());
  r.add("s1", "P1", "đừng tự push code lên git khi chưa hỏi");
  r.add("s2", "P1", "đừng có push git khi chưa được phép nhé");
  r.close();
  const rep = promotionReport({ dbPath: r.dbPath });
  assert.ok(rep.scanned >= 2, "candidates phải được đếm dù không cluster nổi");
  assert.equal(rep.candidates.length, 0);
  assert.ok(rep.notes.length >= 1, "không đo được thì phải NÓI (điều 9), không im lặng");
});

test("buildCandidates: 3 tin MỘT phiên bị chặn (ca ÂM cốt lõi) · 3 tin HAI phiên thì đề xuất, kèm covered", () => {
  const msg = (id, sess) => [id, { id, content: `đừng tự push (${id})`, sessionId: sess, project: "P", ts: `2026-08-0${id}T00:00:00Z` }];
  const cfg = { coveredSim: 0.8, minRepeat: 3, minSessions: 2 };
  const vA = unit(1, 0, 0);

  // Cụm 3 tin nhưng cùng MỘT phiên — user nhắc lại trong một cuộc, không phải pattern.
  const one = buildCandidates(
    [{ members: [1, 2, 3], centroid: vA }],
    new Map([msg(1, "s1"), msg(2, "s1"), msg(3, "s1")]),
    new Map([[1, vA], [2, vA], [3, vA]]),
    [],
    cfg,
  );
  assert.equal(one.length, 0, "3 tin một phiên KHÔNG được thành đề xuất");

  // Cùng cụm nhưng trải HAI phiên ⇒ đề xuất; và centroid khớp fact curated ⇒ covered.
  const two = buildCandidates(
    [{ members: [1, 2, 3], centroid: vA }],
    new Map([msg(1, "s1"), msg(2, "s1"), msg(3, "s2")]),
    new Map([[1, vA], [2, vA], [3, vA]]),
    [{ title: "cross project write forbidden", vec: unit(0.95, 0.05, 0) }],
    cfg,
  );
  assert.equal(two.length, 1);
  assert.equal(two[0].sessions, 2);
  assert.equal(two[0].covered?.title, "cross project write forbidden");
  assert.ok(two[0].covered.sim >= 0.8);
});
