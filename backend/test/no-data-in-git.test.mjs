// Git chứa SOURCE, không chứa DATA. Đây là luật của chủ repo, và nó phải được kiểm bằng
// máy vì chỗ hỏng là một dòng `!ngoại-lệ` trong .gitignore — thứ không ai đọc lại.
//
// Bối cảnh 2026-07-29: repo là PUBLIC (`ZyroFrost/Zemory`), và .gitignore có
// `!share/global_memory.zemory.enc` — một whitelist mở đường cho bundle TOÀN BỘ
// global_memory.db vào git, với LFS đã cắm sẵn trong .gitattributes. Cùng lúc
// `share/share.key` (chìa giải mã) đang được commit ngay cạnh. Chưa từng có .enc nào vào
// git, nhưng chỉ cần một lần export nhầm vào share/ rồi `git add -A` là toàn bộ bộ nhớ
// lên public kèm chìa. Whitelist đã bị gỡ; test này khoá lại.
//
// Kiểm bằng `git check-ignore` — tức kiểm ĐÚNG thứ git thật sự làm, không đoán từ text.

import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const ignored = (p) => {
  try {
    execSync(`git check-ignore -q "${p}"`, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

// Mọi dạng file DATA mà repo này có thể sinh ra. Không cần tồn tại trên đĩa —
// check-ignore trả lời theo LUẬT, nên test này bắt được cả file chưa từng có.
const MUST_BE_IGNORED = [
  "data/global_memory.db",
  "data/global_memory.db-wal",
  "data/global_memory.db-shm",
  "global_memory.db",
  "backend/global_memory.db",
  "share/global_memory.zemory.enc",
  "share/global_memory.host1.3.enc",
  "data/anything.sqlite3",
  "attic/index-rescue-2026-07-29/x.md",
  "docs/agent/05_TODO.md.bak",
];

test("mọi file DATA đều bị git bỏ qua (kiểm bằng git check-ignore)", () => {
  const leaks = MUST_BE_IGNORED.filter((p) => !ignored(p));
  assert.deepEqual(leaks, [], `git KHÔNG chặn: ${leaks.join(" · ")}`);
});

test(".gitignore KHÔNG có ngoại lệ nào cho .db / .enc / bundle", () => {
  // Một dòng `!...` là cách duy nhất data lọt qua các luật ở trên. Chặn ngay ở nguồn.
  const bad = readFileSync(join(ROOT, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trimStart().startsWith("!"))
    .filter((l) => /\.(db|enc|sqlite3?)\b/i.test(l));
  assert.deepEqual(bad, [], `ngoại lệ mở đường cho data: ${bad.join(" · ")}`);
});

test("không có file DATA nào đang được git theo dõi", () => {
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 }).split(/\r?\n/);
  const bad = tracked.filter((f) => /\.(db|db-wal|db-shm|sqlite3?|enc|pbix)$/i.test(f));
  assert.deepEqual(bad, [], `data đang trong git: ${bad.join(" · ")}`);
});

test("KHÔNG có docs của project khác trong cây git", () => {
  // Bản cứu index dump doc row của MỌI project trên máy ra .md; commit nó vào repo PUBLIC
  // là công bố hạ tầng nội bộ của người ta (IP server, tên DB, tên biến *_PASSWORD).
  // Bắt được lúc soi diff trước khi push, 2026-07-29.
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 }).split(/\r?\n/);
  const bad = tracked.filter((f) => /index-rescue|stale-live-roots/i.test(f));
  assert.deepEqual(bad, [], `dump của project khác đang trong git: ${bad.join(" · ")}`);
});

test("không có IP nội bộ (dải riêng) trong bất kỳ file được track", () => {
  // Ratchet cuối: dù đường nào đưa nội dung vào, mẫu này vẫn bắt. Chỉ soi file text.
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 })
    .split(/\r?\n/)
    .filter((f) => /\.(md|ts|mjs|json|js|css|html|ya?ml|cmd|ps1|sh)$/i.test(f));
  // Chỉ bắt **IP nội bộ dạng đủ 4 octet** trong dải riêng — tín hiệu KHÔNG nhập nhằng của
  // "địa chỉ máy trong mạng công ty". Hai lần siết trước khi ra mẫu này:
  //   · bản đầu hardcode đúng tên biến lấy từ docs bị rò ⇒ lại chép dữ kiện vào một file
  //     chắc chắn được commit;
  //   · bản thứ hai bắt cả HÌNH DẠNG `*_PASSWORD`/`*_TOKEN` + dải `10.x` ⇒ báo oan 17 chỗ:
  //     `GITHUB_TOKEN`/`GEMINI_API_KEY` là tên biến CÔNG KHAI chuẩn (không phải bí mật), và
  //     `10.x` khớp luôn số version `10.0.1` trong package.json.
  // Checker kêu oan = lần sau không ai đọc. Tên biến không phải bí mật; thứ tố giác hạ tầng
  // nội bộ là ĐỊA CHỈ, nên chỉ giữ đúng phép kiểm đó.
  const RE = /\b(?:192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/;
  const bad = [];
  for (const f of tracked) {
    let t;
    try {
      t = readFileSync(join(ROOT, f), "utf8");
    } catch {
      continue;
    }
    // .gitignore/test này tự nhắc tên biến để giải thích — miễn cho chính chúng.
    if (f === ".gitignore" || f.endsWith("no-data-in-git.test.mjs")) continue;
    const m = RE.exec(t);
    if (m) bad.push(`${f} → ${m[0]}`);
  }
  assert.deepEqual(bad, [], `hạ tầng nội bộ trong file được track:\n  ${bad.join("\n  ")}`);
});
