// Nối khối lên kho chung: NGOẠI LỆ KHÔNG PHẢI TRỌNG TÀI — số khối đếm được mới là.
//
// Sự cố (đo 2026-08-26): auto-sync ném `UNKNOWN: unknown error, write` — libuv không map nổi mã
// lỗi Windows mà Google Drive File Stream trả về — nhưng đo lại kênh chung thì khối ĐÃ NẰM ĐỦ:
// 40 khối, 0 byte rác, khối cuối đúng độ dài. Bản cũ tin lời ngoại lệ ⇒ coi như hỏng ⇒ watermark
// không nhích ⇒ lượt sau xuất lại ĐÚNG dải cũ và nối thêm một khối TRÙNG. Bằng chứng đọc thẳng từ
// header: khối #37 (05:31:33Z) và #39 (05:46:26Z) khớp từng byte — 22.270.367 byte / 3.812 tin.
// Kênh chung phình bằng bản sao chứ không phải dữ liệu mới, suốt 20 giờ, không một dòng log nào kêu.
//
// `plan/08 §8c` ④ đã đặc tả "nối lại, tối đa 3 lần rồi báo lỗi rõ ràng" từ 25/08 — nhưng chỉ vế
// KIỂM được build, vế THỬ LẠI thì chưa. File này canh cả hai.

import assert from "node:assert/strict";
import test from "node:test";
import { appendFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { appendChunkVerified, appendVerdict } from "../../dist/memory/share.js";
import { tempDir } from "./helpers.mjs";

const MAGIC = "ZEMORY-MEMORY-CHUNKS v1\n";
const PREFIX = "ZCHUNK ";

/** Dựng một container hợp lệ gồm `n` khối giả (nội dung không cần giải mã được — phép nối và
 *  phép đếm chỉ đọc KHUNG: tiền tố độ dài + thân). */
function container(dir, name, n) {
  const p = join(dir, name);
  writeFileSync(p, MAGIC);
  for (let i = 0; i < n; i++) {
    const body = Buffer.from(`khoi-${i}-${"z".repeat(64)}`);
    appendFileSync(p, Buffer.concat([Buffer.from(`${PREFIX}${body.length}\n`), body]));
  }
  return p;
}

// ── Phần 1: phép PHÁN QUYẾT (hàm thuần — chỗ logic bị đảo ngược) ────────────────────────────

test("ném nhưng ĐẾM ĐỦ ⇒ coi là ĐÃ NỐI (đúng ca 26/08)", () => {
  assert.equal(appendVerdict(true, 40, 40), "ok-despite-error");
});

test("ĐẾM THIẾU ⇒ thử lại, kể cả khi KHÔNG ném (lỗi câm còn nguy hơn lỗi ném)", () => {
  assert.equal(appendVerdict(false, 39, 40), "retry");
  assert.equal(appendVerdict(true, 39, 40), "retry");
});

test("đường bình thường: không ném, đếm đủ ⇒ ok", () => {
  assert.equal(appendVerdict(false, 40, 40), "ok");
});

// ── Phần 2: HÀNH VI thật trên container ─────────────────────────────────────────────────────

test("nối được thì container DÀI RA đúng một khối", (t) => {
  const dir = tempDir(t, "zemory-append-ok-");
  const c = container(dir, "main.enc", 2);
  const before = statSync(c).size;
  const part = join(dir, "part.enc");
  writeFileSync(part, Buffer.from("khoi-moi-" + "q".repeat(100)));

  const written = appendChunkVerified(c, part, 3);

  assert.equal(written, statSync(part).size, "trả về đúng số byte của khối vừa nối");
  assert.ok(statSync(c).size > before, "container phải dài ra");
  // Đọc lại bằng chính khung: khối cuối phải là khối vừa nối.
  assert.match(readFileSync(c, "latin1"), /khoi-moi-q+$/);
});

test("container có ĐUÔI RÁC ⇒ BÁO LỖI, tuyệt đối không âm thầm chôn khối mới", (t) => {
  const dir = tempDir(t, "zemory-append-torn-");
  const c = container(dir, "main.enc", 1);
  // Một lượt nối dở của ai đó để lại byte thừa. `listChunks` gặp nó là DỪNG ⇒ mọi thứ nối tiếp
  // lên sau đều VÔ HÌNH với mọi máy. Đây là kiểu hỏng tệ hơn hẳn "sync trượt một lượt".
  appendFileSync(c, Buffer.from("RAC-KHONG-PHAI-KHUNG-HOP-LE"));
  const sizeWithGarbage = statSync(c).size;

  const part = join(dir, "part.enc");
  writeFileSync(part, Buffer.from("khoi-moi"));

  assert.throws(
    () => appendChunkVerified(c, part, 2),
    /Nối khối lên kho chung trượt sau 3 lần|KHÔNG cắt lại được/,
    "phải báo lỗi rõ chứ không trả về như thể đã nối xong",
  );
  // Và phải CẮT lại phần mình vừa ghi — không để container phình thêm sau ba lần thử.
  assert.equal(statSync(c).size, sizeWithGarbage, "ba lần thử không được để lại byte nào");
});
