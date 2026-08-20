// DỌN NHÁP PHẢI TỰ ĐỘNG — nhưng tuyệt đối không được dọn dưới chân người đang làm việc.
//
// Vì sao có job này: thư mục nháp mỗi phiên phình theo giờ và KHÔNG ai dọn — đo 2026-08-20 trên
// đúng một phiên làm việc nặng: **3,97 GB** (model ONNX tải để đo, cache HuggingFace, profile
// trình duyệt). Người dùng chỉ phát hiện khi đĩa đầy, mà theo chính lời họ: *"đợi t kiểm thì t ko
// nhớ và cũng lâu mới làm"*.
//
// Vì sao file test này khắt khe hơn bình thường: đây là job TỰ XOÁ FILE. Sai một ràng buộc là
// mất việc đang làm dở của một phiên khác — bất khả đảo. Nên nửa dưới toàn ca ÂM: những thứ
// job KHÔNG ĐƯỢC PHÉP đụng tới.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, writeFileSync, existsSync, utimesSync } from "node:fs";
import { join } from "node:path";

import { sweepScratchpads } from "../../dist/jobs/scratchpad.js";
import { tempDir } from "./helpers.mjs";

const DAY = 86_400_000;

/** Dựng `<root>/<project>/<session>/scratchpad` với dung lượng + tuổi định trước. */
function pad(root, project, session, { bytes = 1024, ageDays = 0 } = {}) {
  const dir = join(root, project, session, "scratchpad");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "blob.bin");
  writeFileSync(f, Buffer.alloc(bytes));
  const t = new Date(Date.now() - ageDays * DAY);
  utimesSync(f, t, t);
  utimesSync(dir, t, t);
  return dir;
}

test("quá hạn thì dọn, phiên mới thì để yên (dù cùng thư mục gốc)", (t) => {
  const root = tempDir(t, "zemory-pad-");
  const old = pad(root, "proj-a", "sess-old", { ageDays: 30 });
  const fresh = pad(root, "proj-a", "sess-new", { ageDays: 0 });

  const r = sweepScratchpads({ root, budgetBytes: 10 * 1024 * 1024 * 1024 }); // trần rộng ⇒ chỉ luật hạn nổ
  assert.equal(r.removed.length, 1, "đúng một phiên bị dọn");
  assert.equal(r.removed[0].why, "quá hạn");
  assert.ok(!existsSync(old), "phiên 30 ngày phải bị dọn");
  assert.ok(existsSync(fresh), "phiên vừa dùng KHÔNG được đụng");
});

test("vượt trần thì dọn CŨ NHẤT trước, và chỉ tới khi về dưới trần", (t) => {
  const root = tempDir(t, "zemory-pad-");
  const oldest = pad(root, "p", "s1", { bytes: 4096, ageDays: 5 });
  const mid = pad(root, "p", "s2", { bytes: 4096, ageDays: 3 });
  const newer = pad(root, "p", "s3", { bytes: 4096, ageDays: 2 });

  // trần đủ chứa hai phiên ⇒ chỉ phiên cũ nhất phải đi
  const r = sweepScratchpads({ root, budgetBytes: 9000 });
  assert.deepEqual(r.removed.map((x) => x.why), ["vượt trần"], "chỉ dọn tới khi đủ, không dọn sạch");
  assert.ok(!existsSync(oldest), "cũ nhất đi trước");
  assert.ok(existsSync(mid) && existsSync(newer), "phần còn lại giữ nguyên");
});

test("CA ÂM: KHÔNG đụng phiên đang chạy, dù nó cũ và đang vượt trần", (t) => {
  const root = tempDir(t, "zemory-pad-");
  const current = pad(root, "p", "sess-dang-chay", { bytes: 8192, ageDays: 40 });
  const r = sweepScratchpads({ root, budgetBytes: 1, keepSession: "sess-dang-chay" });
  assert.deepEqual(r.removed, [], "phiên đang chạy là bất khả xâm phạm");
  assert.ok(existsSync(current));
});

test("CA ÂM: KHÔNG đụng thư mục vừa được ghi (phiên có thể đang làm việc mà chưa khai id)", (t) => {
  const root = tempDir(t, "zemory-pad-");
  const justNow = pad(root, "p", "s-moi", { bytes: 8192, ageDays: 0 });
  const r = sweepScratchpads({ root, budgetBytes: 1 }); // trần = 1 byte ⇒ ép dọn tối đa
  assert.deepEqual(r.removed, [], "mới ghi trong vài giờ ⇒ không đụng, dù trần đã vỡ");
  assert.ok(existsSync(justNow));
});

test("CA ÂM: chỉ nhận ĐÚNG khuôn <project>/<session>/scratchpad — thư mục lạ không bị xoá", (t) => {
  const root = tempDir(t, "zemory-pad-");
  // thứ trông giống nhưng KHÔNG phải: thiếu tầng session, và một thư mục người dùng đặt nhầm chỗ
  const shallow = join(root, "proj-b", "scratchpad");
  mkdirSync(shallow, { recursive: true });
  writeFileSync(join(shallow, "x.bin"), Buffer.alloc(4096));
  const stranger = join(root, "proj-b", "sess", "du-lieu-cua-toi");
  mkdirSync(stranger, { recursive: true });
  writeFileSync(join(stranger, "quan-trong.txt"), "khong duoc xoa");

  const r = sweepScratchpads({ root, budgetBytes: 1, now: Date.now() + 400 * DAY }); // ép mọi thứ "quá hạn"
  assert.deepEqual(r.removed, [], "không khớp khuôn ⇒ không đụng");
  assert.ok(existsSync(join(shallow, "x.bin")));
  assert.ok(existsSync(join(stranger, "quan-trong.txt")), "dữ liệu người dùng đặt cạnh đó phải còn nguyên");
});

test("dryRun chỉ báo cáo, không xoá gì", (t) => {
  const root = tempDir(t, "zemory-pad-");
  const old = pad(root, "p", "s", { ageDays: 30 });
  const r = sweepScratchpads({ root, dryRun: true, budgetBytes: 10 ** 12 });
  assert.equal(r.removed.length, 1, "vẫn phải BÁO là sẽ dọn");
  assert.ok(existsSync(old), "nhưng KHÔNG được xoá");
});

test("không có thư mục nháp ⇒ im lặng, không ném (fail-open)", () => {
  const r = sweepScratchpads({ root: null });
  assert.equal(r.root, null);
  assert.deepEqual(r.removed, []);
});
