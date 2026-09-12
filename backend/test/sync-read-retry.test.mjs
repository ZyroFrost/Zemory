// Chiều ĐỌC kênh chung phải chịu được cú CHẬP của ổ đám mây.
//
// Đo 2026-08-26, ba dữ kiện cùng buổi:
//  · `vectors-catchup --dry-run` chết ở phút 5:42 với `UNKNOWN: unknown error, read`;
//  · chạy lại Y NGUYÊN lệnh đó ⇒ XONG, ra `missing: 2767`;
//  · đọc tuần tự trọn 1.832,4 MB cùng file mất 42,9 s, 42,74 MB/s, KHÔNG một lỗi.
// Ba cái đó loại hẳn giả thuyết "kênh hỏng/chậm": nó CHẬP. Mà một cú chập giết cả lượt sync đã
// chạy vài phút thì đó là lỗi của mình, không phải của Drive.
//
// `UNKNOWN` là mã libuv trả về khi Windows đưa mã lỗi nó không map nổi — đúng thứ Drive File
// Stream sinh ra. Đây là chiều ĐỌC, đối xứng với `sync-append-retry.test.mjs` ở chiều GHI.

import assert from "node:assert/strict";
import test from "node:test";

import { isTransientFsError, withDriveRetry } from "../../dist/memory/share.js";

/** Dựng lỗi hệ thống giống thật: cái quyết định là `code`, không phải chữ trong message. */
function fsError(code, syscall = "read") {
  const e = new Error(`${code}: ${code.toLowerCase()} error, ${syscall}`);
  e.code = code;
  e.syscall = syscall;
  return e;
}

test("it recognises exactly the FLAKY error family of a cloud drive", () => {
  assert.equal(isTransientFsError(fsError("UNKNOWN")), true, "UNKNOWN là mã của chính ca 26/08");
  assert.equal(isTransientFsError(fsError("EBUSY")), true);
  assert.equal(isTransientFsError(fsError("EIO")), true);
});

test("it does NOT treat a permanent error as flaky - retrying would only mask a real configuration fault", () => {
  assert.equal(isTransientFsError(fsError("ENOENT")), false, "file không có là sự thật bền");
  assert.equal(isTransientFsError(fsError("EACCES")), false, "thiếu quyền là sự thật bền");
  assert.equal(isTransientFsError(new Error("lỗi thường không có code")), false);
  assert.equal(isTransientFsError(null), false);
});

test("one flake then success means the read STILL completes (the real 26/08 case)", async () => {
  let calls = 0;
  const got = await withDriveRetry("đọc khối #7", async () => {
    calls++;
    if (calls === 1) throw fsError("UNKNOWN");
    return "đọc được";
  });
  assert.equal(got, "đọc được");
  assert.equal(calls, 2, "phải thử lại đúng một lần, không nhiều hơn");
});

test("continuous flakes give up after 3 attempts rather than retrying forever", async () => {
  let calls = 0;
  await assert.rejects(
    () => withDriveRetry("đọc khối #7", async () => { calls++; throw fsError("UNKNOWN"); }),
    /UNKNOWN/,
  );
  assert.equal(calls, 3, "trần 3 lần — thử vô hạn thì lượt sync treo thay vì báo lỗi");
});

test("a PERMANENT error throws AT ONCE, wasting no attempt", async () => {
  let calls = 0;
  await assert.rejects(
    () => withDriveRetry("đọc khối #7", async () => { calls++; throw fsError("ENOENT"); }),
    /ENOENT/,
  );
  assert.equal(calls, 1, "ENOENT mà thử lại là làm chậm rồi cũng báo đúng lỗi đó");
});
