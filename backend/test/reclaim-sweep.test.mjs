// Cổng cho HAI vòng thu hồi rác nằm dưới `data/` — chỗ mà `.gitignore` GIẤU nên không cổng nào
// thấy nó lớn lên (`02_RULES`: *".gitignore là GIẤU, không phải DỌN"*).
//
// Hai lỗ ĐÃ ĐO trên máy thật 2026-08-31, tổng ~5,9 GB:
//   ① `data/backups/global_memory-premigrate.db` **2.527 MB** — rotation `keep:5` chạy đúng suốt
//      từ 28/08, nhưng khuôn tên `/^global_memory-[\dTZ:.-]+\.db$/` KHÔNG khớp chữ `premigrate`,
//      nên vòng dọn chưa bao giờ NHÌN THẤY file này. Một chính sách dọn chỉ đúng với file nó nhận ra.
//   ② `data/browser/*bak-*` · `*.trong-*` — **14 thư mục · 3.367 MB**, cũ nhất 27 ngày, trong khi
//      4 khe đang sống chỉ 579 MB. `borrowCookies` dời profile sang bên (cố ý, để lùi được) nhưng
//      KHÔNG có cửa nào thu hồi lại.
//
// Cả hai vòng đều XOÁ, tức phá huỷ và không đảo được — nên phép quyết định phải là hàm THUẦN và
// phải đo được cả chiều ÂM (không được xoá thứ đang sống / còn trong cửa sổ lùi).

import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { isSetAsideProfile, setAsideToReclaim, sweepBrowserProfiles, DEFAULT_BROWSER_KEEP_MS } = await import(
  "../../dist/memory/browser-rotate.js"
);

const DAY = 24 * 60 * 60_000;
const NOW = Date.parse("2026-08-31T09:00:00Z");

// ── ② PROFILE TRÌNH DUYỆT ────────────────────────────────────────────────────────────────────
test("isSetAsideProfile: nhận CẢ BA thế hệ đặt tên, và KHÔNG bắt khe đang sống", () => {
  // Ba dạng thật đọc từ đĩa 2026-08-31.
  assert.ok(isSetAsideProfile("claude.msedge-bak-1787906707220"), "dạng hiện nay");
  assert.ok(isSetAsideProfile("claude.trong-1787902837"), "profile bị làm trống");
  assert.ok(isSetAsideProfile("claude-2chrome-bak-1786354307845"), "dạng MẤT dấu chấm đời cũ");

  // Bốn khe ĐANG SỐNG trên máy thật — xoá một cái là mất phiên đăng nhập của user.
  for (const live of ["chatgpt", "chatgpt-2", "claude", "claude-2"]) {
    assert.equal(isSetAsideProfile(live), false, `khe sống '${live}' KHÔNG được coi là rác`);
  }
  // Khe do người dùng đặt tên tự do vẫn phải an toàn miễn không chứa `bak-`/`.trong-`.
  assert.equal(isSetAsideProfile("claude-cong_viec"), false);
  assert.equal(isSetAsideProfile("chatgpt-3"), false);
});

test("setAsideToReclaim: CỬA SỔ LÙI được tôn trọng — bản mới KHÔNG bị đụng", () => {
  const entries = [
    { name: "claude.msedge-bak-1", path: "/x/a", mtimeMs: NOW - 27 * DAY }, // cũ nhất thật
    { name: "claude.trong-2", path: "/x/b", mtimeMs: NOW - 8 * DAY },
    { name: "claude.msedge-bak-3", path: "/x/c", mtimeMs: NOW - 6 * DAY }, // TRONG cửa sổ 7 ngày
    { name: "claude-2", path: "/x/live", mtimeMs: NOW - 99 * DAY }, // khe SỐNG, cũ mà không phải rác
  ];
  const doomed = setAsideToReclaim(entries, NOW, DEFAULT_BROWSER_KEEP_MS);
  const names = doomed.map((d) => d.name).sort();
  assert.deepEqual(names, ["claude.msedge-bak-1", "claude.trong-2"], "chỉ bản quá 7 ngày");
  assert.ok(!names.includes("claude.msedge-bak-3"), "6 ngày ⇒ CÒN trong cửa sổ lùi, phải giữ");
  assert.ok(!names.includes("claude-2"), "khe SỐNG không bao giờ bị chọn, dù mtime cũ 99 ngày");
});

test("setAsideToReclaim: cửa sổ lùi 0 vẫn KHÔNG được cuốn khe sống theo", () => {
  const entries = [
    { name: "claude.trong-1", path: "/x/a", mtimeMs: NOW - 1 },
    { name: "claude", path: "/x/live", mtimeMs: NOW - 1 },
  ];
  const doomed = setAsideToReclaim(entries, NOW, 0);
  assert.deepEqual(doomed.map((d) => d.name), ["claude.trong-1"], "khe sống miễn nhiễm với mọi ngưỡng");
});

test("sweepBrowserProfiles: chạy trên ĐĨA THẬT (thư mục tạm) — xoá đúng, giữ đúng", () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-browser-"));
  const mk = (name, ageDays) => {
    const p = join(dir, name);
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, "Cookies"), "x");
    const t = (NOW - ageDays * DAY) / 1000;
    utimesSync(p, t, t);
    return p;
  };
  const oldBak = mk("claude.msedge-bak-old", 20);
  const freshBak = mk("claude.msedge-bak-fresh", 2);
  const live = mk("claude-2", 60);

  const r = sweepBrowserProfiles({ dir, now: NOW });
  assert.equal(r.reclaimed.length, 1, "đúng MỘT bản bị thu hồi");
  assert.ok(!existsSync(oldBak), "bản 20 ngày đã bị xoá");
  assert.ok(existsSync(freshBak), "bản 2 ngày còn nguyên (cửa sổ lùi)");
  assert.ok(existsSync(live), "KHE SỐNG còn nguyên — đây là ca không được phép sai");
  assert.equal(r.kept, 1, "còn giữ 1 bản trong cửa sổ");
  assert.deepEqual(readdirSync(dir).sort(), ["claude-2", "claude.msedge-bak-fresh"]);
});

test("sweepBrowserProfiles: thư mục không tồn tại ⇒ im lặng, không ném (fail-open, điều 9)", () => {
  const r = sweepBrowserProfiles({ dir: join(tmpdir(), "zemory-khong-ton-tai-" + Date.now()), now: NOW });
  assert.deepEqual(r.reclaimed, []);
  assert.equal(r.kept, 0);
});

// ── ① BẢN CHỤP DB MỒ CÔI ─────────────────────────────────────────────────────────────────────
const { listReclaimable } = await import("../../dist/memory/backup-rotate.js");

test("listReclaimable: THẤY bản premigrate mà khuôn cũ bỏ sót, và không đụng file lạ", () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-backups-"));
  const touch = (name, ageDays) => {
    const p = join(dir, name);
    writeFileSync(p, "x");
    const t = (NOW - ageDays * DAY) / 1000;
    utimesSync(p, t, t);
    return p;
  };
  touch("global_memory-2026-08-31T03-23-48-693Z.db", 0);
  touch("global_memory-2026-08-28T02-02-48-096Z.db", 3);
  touch("global_memory-premigrate.db", 3); // ← 2.527 MB trên máy thật, ngoài mọi vòng dọn
  touch("ghi-chu-cua-user.txt", 1); // file lạ: KHÔNG bao giờ được đụng
  touch("global_memory-cua-toi.db", 1); // tên tự do: cũng KHÔNG khớp (chỉ kể tên tường minh)

  const names = listReclaimable(dir).map((e) => e.path.split(/[\\/]/).pop()).sort();
  assert.deepEqual(names, [
    "global_memory-2026-08-28T02-02-48-096Z.db",
    "global_memory-2026-08-31T03-23-48-693Z.db",
    "global_memory-premigrate.db",
  ]);
  assert.ok(!names.includes("ghi-chu-cua-user.txt"), "file lạ của người dùng bất khả xâm phạm");
  assert.ok(
    !names.includes("global_memory-cua-toi.db"),
    "tên tự do KHÔNG khớp — nới khuôn thành `global_memory-*.db` là mở cửa xoá file người ta cố ý đỗ vào",
  );
});

test("listReclaimable: MỚI trước — thứ tự quyết định ai bị dọn khi vượt keep", () => {
  const dir = mkdtempSync(join(tmpdir(), "zemory-backups-order-"));
  const touch = (name, ageDays) => {
    writeFileSync(join(dir, name), "x");
    const t = (NOW - ageDays * DAY) / 1000;
    utimesSync(join(dir, name), t, t);
  };
  touch("global_memory-premigrate.db", 10);
  touch("global_memory-2026-08-31T03-23-48-693Z.db", 0);
  const order = listReclaimable(dir).map((e) => e.path.split(/[\\/]/).pop());
  assert.match(order[0], /2026-08-31/, "bản mới nhất phải đứng đầu (nó là bản KHÔNG được dọn)");
  assert.match(order[1], /premigrate/, "leftover cũ xuống cuối ⇒ bị dọn trước khi cắt vào bản thật");
});
