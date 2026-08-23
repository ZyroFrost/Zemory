// Mặt ⑦ audit — quét LỊCH SỬ git, không chỉ cây HEAD (nợ cổng cuối của plan/18, user gật 24/08).
//
// Vì sao HEAD không đủ: xoá file ở HEAD không gỡ được thứ ĐÃ PUSH — chìa `share/share.key` lộ
// đúng kiểu đó (04/08): commit rồi push, gỡ khỏi cây, nhưng blob nằm trong lịch sử vĩnh viễn và
// bất kỳ ai clone đều đọc được. Suốt từ đó audit chỉ soi cây hiện tại — một secret MỚI lọt vào
// một commit rồi bị "dọn" ở commit sau sẽ không cổng nào thấy.
//
// Hai phép, cả hai chạy trên TOÀN lịch sử:
//   ① tên file khớp mẫu secret ⇒ phải nằm trong ALLOWLIST tường minh kèm lý do;
//   ② blob vượt 50 MB ⇒ đỏ (vế "canh file lớn trước khi push" — weight 294,6 MB từng nghẽn push).
// Đo lúc dựng cổng: lịch sử 6.099 object, đúng 1 hit secret (vết đã biết), blob max 1,8 MB.

import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Vết LỊCH SỬ đã biết — allowlist TƯỜNG MINH kèm lý do (khuôn `standard-parity`).
 *  Thêm dòng mới vào đây nghĩa là một secret NỮA đã lọt vĩnh viễn: phải xoay khoá trước,
 *  ghi `06_CHANGES`, rồi mới allow. */
const KNOWN_HISTORY = new Map([
  ["share/share.key", "chìa lộ 2026-08-04 (commit đã push, không gỡ được); ĐÃ XOAY — dấu tay nay e6fb0eff ≠ 41d88e4d bản lộ"],
]);

/** Mẫu tên secret — cùng họ với guard/policy (đuôi tên file, không đường dẫn). */
const SECRET_RE = /(^|\/)(\.env(\..+)?|[^/]*\.env|[^/]*\.pem|[^/]*\.ppk|id_rsa[^/]*|id_ed25519[^/]*|[^/]*\.key|[^/]*\.enc|global_memory[^/]*\.db)$/;
/** Tên mẫu vô hại — cùng allow của guard. */
const ALLOW_NAME = /(^|\/)(\.env\.example|example\.env|sample\.env)$/;

const MAX_BLOB = 50 * 1024 * 1024; // GitHub chặn 100 MB; 50 là mức "phải hỏi trước khi push"

test("LỊCH SỬ git: tên khớp mẫu secret chỉ được là vết ĐÃ BIẾT trong allowlist", () => {
  const lines = git("rev-list", "--objects", "--all").split("\n").filter(Boolean);
  // TỰ KIỂM: lệnh trả quá ít object = phép đo hỏng, "0 hit" sẽ đọc thành "sạch" oan.
  assert.ok(lines.length > 1000, `rev-list chỉ trả ${lines.length} object — phép đo đang mù`);

  const bad = [];
  for (const line of lines) {
    const sp = line.indexOf(" ");
    if (sp < 0) continue; // object không tên (commit/tree)
    const path = line.slice(sp + 1);
    if (!SECRET_RE.test(path) || ALLOW_NAME.test(path)) continue;
    if (KNOWN_HISTORY.has(path)) continue;
    bad.push(path);
  }
  assert.deepEqual(
    [...new Set(bad)],
    [],
    "secret MỚI trong lịch sử git — đã push là vĩnh viễn: XOAY KHOÁ NGAY, ghi 06_CHANGES, rồi mới bàn tới allowlist",
  );
});

test("LỊCH SỬ git: không blob nào vượt 50 MB (weight 294,6 MB từng nghẽn cả push)", () => {
  const out = git("cat-file", "--batch-all-objects", "--batch-check=%(objecttype) %(objectsize) %(objectname)");
  const rows = out.split("\n").filter((l) => l.startsWith("blob "));
  assert.ok(rows.length > 500, `chỉ thấy ${rows.length} blob — phép đo đang mù`);
  const big = rows.map((l) => l.split(" ")).filter(([, size]) => Number(size) > MAX_BLOB);
  assert.deepEqual(
    big.map(([, size, sha]) => `${sha.slice(0, 8)} ${(Number(size) / 1048576).toFixed(1)}MB`),
    [],
    "blob lớn trong lịch sử — thứ này đi theo MỌI lần clone; cân nhắc trước khi push, đã push thì chỉ filter-repo mới gỡ",
  );
});
