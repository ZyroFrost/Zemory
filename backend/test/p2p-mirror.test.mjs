// MIRROR THƯ MỤC qua kênh máy-tới-máy — cổng nghiệm thu của plan/24 §9.7.
//
// Thứ cụm này canh, xếp theo mức đắt của lỗi nếu nó thủng:
//   ① một file DATABASE lọt vào danh sách chở  ⇒ 1,2 GB kho chết bò qua dây, và HP điều 11
//      đã trả giá HAI LẦN vì đúng hạng file này (§9.7 điều 8);
//   ② một đường dẫn `../` từ máy kia được ghi  ⇒ máy đã ghép đôi ghi ra ngoài bốn gốc (§9.7 điều 9);
//   ③ thay đổi của bên kia bị ÁP THẲNG          ⇒ mất việc người dùng chưa duyệt (§9.3);
//   ④ hai bên cùng sửa trùng đoạn mà tự trộn    ⇒ mất im lặng, kiểu hỏng đắt nhất (§9.4).
//
// Hai "máy" = hai gốc repo + hai kho + hai danh tính, chạy trên loopback trong MỘT tiến
// trình — đúng khuôn `p2p-punch` đã dùng: phần NAT thì cần hai máy thật, phần máy trạng
// thái thì không.
import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { openMemory } from "../../dist/memory/db.js";
import { writeMemoryShareKey } from "../../dist/memory/share.js";
import { loadOrCreateIdentity } from "../../dist/memory/channel/identity.js";
import {
  connectToPeer,
  serveChannel,
  mirrorBudgetMs,
  writeFlow,
  keepaliveDue,
  linkDead,
  PING_IDLE_MS,
  LINK_DEAD_MS,
} from "../../dist/memory/channel/peer.js";
import { excludeReason, mirrorRoots, resolveMirrorPath, scanMirror } from "../../dist/memory/channel/mirror.js";
import { classify, listQueue, applyQueued, dismissQueued, freshenRow, readBase, mirrorHooks, forgetPeerMirror } from "../../dist/memory/channel/mirrorstate.js";
import { tempDir } from "./helpers.mjs";

const APP_VERSION = "test";

/** Một "máy": gốc repo (docs/ · docs_visual/ · attic/), gốc kho (files/), kho riêng, danh tính. */
function makeMachine(t, name, shareSecret) {
  const base = tempDir(t, `zemory-mir-${name}-`);
  const repoRoot = join(base, "repo");
  const storeRoot = join(base, "store");
  for (const d of ["docs", "docs_visual", "attic"]) mkdirSync(join(repoRoot, d), { recursive: true });
  mkdirSync(join(storeRoot, "files", "images", "2026-09"), { recursive: true });
  const channelDir = join(base, "channel");
  mkdirSync(channelDir, { recursive: true });
  const keyPath = join(base, "share.key");
  writeMemoryShareKey(keyPath);
  if (shareSecret) writeFileSync(keyPath, `${shareSecret}\n`);
  // 🔴 Kho nằm ở thư mục RIÊNG, không nằm trong `base`. Hook dọn của `tempDir` đăng ký TRƯỚC
  // nên nó chạy TRƯỚC `db.close()`, và Windows không cho xoá thư mục còn file đang mở ⇒ mọi ca
  // đỏ bằng `EPERM` ở bước dọn, che mất kết quả thật. Tách thư mục là hết phụ thuộc thứ tự hook.
  const dbDir = mkdtempSync(join(tmpdir(), `zemory-mirdb-${name}-`));
  const db = openMemory(join(dbDir, "gm.db"));
  t.after(() => {
    try {
      db.close();
    } catch {
      /* đóng được thì tốt */
    }
    rmSync(dbDir, { recursive: true, force: true });
  });
  return {
    base,
    repoRoot,
    storeRoot,
    channelDir,
    db,
    shareKey: readFileSync(keyPath, "utf8").trim(),
    identity: loadOrCreateIdentity(join(base, "id"), `zemory-${name}`),
  };
}

const write = (m, area, rel, body) => {
  const root = area === "files" ? join(m.storeRoot, "files") : join(m.repoRoot, area);
  const abs = join(root, rel);
  mkdirSync(join(abs, "..").replace(/[\\/]\.\.$/, ""), { recursive: true });
  writeFileSync(abs, body);
  return abs;
};
const readAt = (m, area, rel) => {
  const root = area === "files" ? join(m.storeRoot, "files") : join(m.repoRoot, area);
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
};

const sideOpts = (m, peers, peerSync, extra = {}) => ({
  channelDir: m.channelDir,
  identity: m.identity,
  shareKey: m.shareKey,
  allowedPeers: peers,
  appVersion: APP_VERSION,
  timeoutMs: 20_000,
  mirror: mirrorHooks({ repoRoot: m.repoRoot, storeRoot: m.storeRoot, db: m.db, peerSync }),
  ...extra,
});

/** Một lượt đồng bộ hai chiều. Chờ CẢ HAI đầu đóng sổ — cắt sớm là mất phần bên nghe. */
async function syncPair(a, b, opts = {}) {
  let resolveServer;
  const serverDone = new Promise((r) => {
    resolveServer = r;
  });
  const server = await serveChannel({ ...sideOpts(b, [a.identity.deviceId], opts.peerSyncB), port: 0, host: "127.0.0.1" }, (r) =>
    resolveServer(r),
  );
  try {
    const client = await connectToPeer(
      { host: "127.0.0.1", port: server.port },
      sideOpts(a, [b.identity.deviceId], opts.peerSyncA),
    );
    const srv = await Promise.race([serverDone, new Promise((r) => setTimeout(() => r(null), 15_000))]);
    return { client, server: srv };
  } finally {
    server.close();
  }
}

// ── ① Luật loại trừ — hàm THUẦN, soi được mà không cần mạng ───────────────────────────
test("mirror-exclude: file DATABASE bị loại ở mọi mục, và lý do nói ra được", () => {
  // Ca THẬT đẻ ra luật này: `attic/zemory-lab/lab.db` cân 1,237 MB — tức 99,9% khối lượng
  // của cả `attic/`. Không có luật, lượt mirror đầu chở một kho chết qua dây.
  for (const name of ["lab.db", "global_memory.db", "x.db-wal", "y.db-shm", "z.sqlite", "w.sqlite3"]) {
    const why = excludeReason(`zemory-lab/${name}`, name, 10);
    assert.ok(why, `${name} phải bị loại`);
    assert.match(why, /database/i, `${name}: lý do phải nói rõ là file database, không phải một câu chung chung`);
  }
  // CA ÂM — thứ trông giống mà KHÔNG phải: đuôi nằm giữa tên, và file chữ bình thường.
  assert.equal(excludeReason("a/note.db.md", "note.db.md", 10), null, "đuôi .md thì không phải database");
  assert.equal(excludeReason("agent/05_TODO.md", "05_TODO.md", 10), null);
  assert.equal(excludeReason("ui/x.png", "x.png", 10), null);
});

test("mirror-exclude: CỜ ĐỒNG Ý của guard không bao giờ rời máy đã sinh ra nó", (t) => {
  // 🔴 Bắt tại trận 2026-09-24: `docs/hooks/.allow-push` nằm trong hàng đợi duyệt của máy này,
  // chở sang từ máy kia. Tệp đó KHÔNG phải tài liệu — nó là mã uỷ quyền MỘT LẦN cho đúng một việc
  // người dùng vừa cho phép trên MỘT máy. Bay sang máy thứ hai thì guard bên đó mở cửa cho một
  // lệnh mà chủ máy chưa hề đồng ý, và vượt cửa IM LẶNG.
  for (const name of [".allow-push", ".allow-delete", ".allow-docs-write"]) {
    const why = excludeReason(`hooks/${name}`, name, 40);
    assert.ok(why, `${name} phải bị loại`);
    assert.match(why, /cờ đồng ý/i, `${name}: lý do phải nói rõ đây là thẩm quyền, không phải "file nháp"`);
  }
  // HAI ĐẦU: chặn bên gửi mới chỉ vá máy đã cập nhật — thứ nguy hiểm đến từ máy KIA, vốn có thể
  // còn chạy bản cũ. Bên nhận phải tự từ chối.
  const root = mirrorRoots({ repoRoot: tempDir(t, "zemory-flag-"), storeRoot: tempDir(t, "zemory-flag-s-") })[0]
    ?? { area: "docs", path: tempDir(t, "zemory-flag-r-") };
  assert.equal(resolveMirrorPath(root, "hooks/.allow-push"), null, "chiều NHẬN cũng phải từ chối");
  assert.equal(resolveMirrorPath(root, "hooks\\.allow-push"), null, "gạch ngược của Windows không được thành đường vòng");

  // CA ÂM — mã guard thì VẪN đi: nó là tài liệu/luật dùng chung, chỉ có THẨM QUYỀN mới ở lại máy.
  assert.equal(excludeReason("hooks/guard.cjs", "guard.cjs", 40), null, "mã guard là tài liệu, phải chở");
  assert.equal(excludeReason("hooks/policy.json", "policy.json", 40), null);
  // CA ÂM — tên na ná nhưng KHÔNG ở trong `hooks/`, và tên không mở bằng `.allow-`.
  assert.equal(excludeReason("agent/.allow-push.md", ".allow-push.md", 40), null, "ngoài hooks/ thì không phải cờ");
  assert.equal(excludeReason("hooks/allow-push", "allow-push", 40), null, "thiếu dấu chấm đầu ⇒ không phải cờ");
});

test("mirror-exclude: thư mục kỹ thuật, file nháp và file quá trần đều bị loại", () => {
  assert.ok(excludeReason("node_modules/a/b.js", "b.js", 10));
  assert.ok(excludeReason(".git/config", "config", 10));
  assert.ok(excludeReason("scratchpad/do.mjs", "do.mjs", 10));
  assert.ok(excludeReason("a/_scratch_x.md", "_scratch_x.md", 10));
  assert.ok(excludeReason("a/06_CHANGES.md.bak", "06_CHANGES.md.bak", 10));
  const over = excludeReason("a/huge.bin", "huge.bin", 65 * 1024 * 1024);
  assert.ok(over && /trần/.test(over), "vượt trần phải nói ra là vượt trần");
  // CA ÂM: đúng dưới trần thì đi được — trần không được phép chặn nhầm.
  assert.equal(excludeReason("a/ok.bin", "ok.bin", 64 * 1024 * 1024), null);
});

test("mirror-scan: kho quét ra KHÔNG chứa file database, và có báo đã loại", (t) => {
  const m = makeMachine(t, "scan");
  write(m, "docs", "a.md", "xin chao");
  write(m, "attic", "lab.db", "GIA VO LA MOT KHO");
  const r = scanMirror({ repoRoot: m.repoRoot, storeRoot: m.storeRoot });
  assert.equal(r.entries.some((e) => e.rel.endsWith(".db")), false, "§9.7 điều 8: không .db nào được vào danh sách chở");
  assert.ok(r.skipped.some((s) => s.rel.endsWith("lab.db")), "loại trong im lặng thì không phân biệt được với quét sót");
  // Mục CHỮ phải có băm; mục địa chỉ-theo-nội-dung thì KHÔNG (tên đã là chữ ký).
  const doc = r.entries.find((e) => e.area === "docs");
  assert.ok(doc?.hash, "file docs phải có băm");
  write(m, "files", "images/2026-09/aa_x.png", "PNG");
  const r2 = scanMirror({ repoRoot: m.repoRoot, storeRoot: m.storeRoot });
  assert.equal(r2.entries.find((e) => e.area === "files")?.hash, undefined, "files/ không băm lại — tên LÀ chữ ký");
});

// ── ② Đường dẫn từ máy kia là dữ liệu KHÔNG TIN ĐƯỢC ─────────────────────────────────
test("mirror-path: đường thoát ra ngoài gốc bị TỪ CHỐI", (t) => {
  const m = makeMachine(t, "path");
  const root = mirrorRoots({ repoRoot: m.repoRoot, storeRoot: m.storeRoot }).find((r) => r.area === "docs");
  assert.ok(root, "gốc docs phải có");
  assert.ok(resolveMirrorPath(root, "agent/02_RULES.md"), "đường hợp lệ phải đi được");
  for (const bad of ["../ngoai.md", "a/../../ngoai.md", "/etc/passwd", "C:\\Windows\\x.ini", "", "a/../../../x"]) {
    assert.equal(resolveMirrorPath(root, bad), null, `phải từ chối: ${JSON.stringify(bad)}`);
  }
  // Luật database áp CẢ chiều nhận — không chỉ lúc khai kiểm kê.
  assert.equal(resolveMirrorPath(root, "sub/kho.db"), null, "nhận một .db cũng phải bị chặn");
});

// ── ③ Phân loại — hàm THUẦN, đây là chỗ quyết định có mất việc của ai không ───────────
test("mirror-classify: bảng §9.3 chạy đúng từng hàng, kể cả hai ca XOÁ", () => {
  assert.equal(classify("A", "A", "A"), "same");
  assert.equal(classify("A", "A", "B"), "take", "chỉ bên kia sửa ⇒ hàng đợi");
  assert.equal(classify("A", "B", "A"), "push", "chỉ mình sửa ⇒ đẩy đi, không hỏi");
  assert.equal(classify("A", "B", "C"), "merge", "hai bên cùng sửa ⇒ thử gộp");
  assert.equal(classify(null, "B", "C"), "block", "§9.4 mục 4: không mốc ⇒ chặn, không đoán");
  assert.equal(classify(null, null, "C"), "take", "file mới bên kia có ⇒ nhận (không có gì của mình để mất)");
  // XOÁ — hai ca, và cả hai là luật chứ không phải chi tiết.
  assert.equal(classify("A", null, "A"), "none", "ta đã xoá, họ không đổi ⇒ KHÔNG hồi sinh");
  assert.equal(classify("A", null, "B"), "block", "ta xoá, họ sửa ⇒ chặn (xoá không đảo được)");
  assert.equal(classify("A", "A", null), "none", "họ không có ⇒ ta không bao giờ tự xoá theo");
});

test("mirror-budget: một phiên chỉ chở PHẦN vừa sức, không cố chở hết rồi bị chém", () => {
  // 🔴 Ca thật đo 2026-09-24 trên hai máy qua relay công khai: lượt mirror đầu ~820 MB, phiên có
  // trần 120 giây. Bên gửi xếp trọn 5.117 file vào ống rồi phiên chết ở ĐÚNG giây 120 — `mdone`
  // không bao giờ đi qua, hai bên không đóng sổ, log chỉ nói "hết giờ phiên". Lượt nào cũng nhích
  // được vài trăm file rồi chết.
  //
  // Nới trần phiên là SAI HƯỚNG — trần đó đang gác bệnh phiên-treo. Thứ đúng là chở theo LƯỢT.
  assert.equal(mirrorBudgetMs(120_000), 60_000, "một nửa trần phiên; nửa kia để `mdone` và lớp khối đi nốt");
  assert.equal(mirrorBudgetMs(20_000), 10_000);
  // CA ÂM — SÀN: trần phiên bé bất thường không được biến ngân sách thành 0, vì 0 nghĩa là
  // KHÔNG BAO GIỜ chở được file nào và lớp mirror chết câm.
  assert.equal(mirrorBudgetMs(1_000), 5_000, "phải có sàn — ngân sách 0 là lớp mirror chết câm");
  assert.equal(mirrorBudgetMs(0), 5_000);
  // Và không bao giờ được bằng/vượt trần phiên: chở tới sát trần là dựng lại đúng cái chết đang vá.
  for (const ms of [20_000, 60_000, 120_000, 600_000]) {
    assert.ok(mirrorBudgetMs(ms) < ms, `ngân sách phải NHỎ HƠN trần phiên (${ms})`);
  }
});

/**
 * Chờ một lời hứa, nhưng CÓ HẠN — quá hạn thì NÉM, không ngồi đó.
 *
 * 🔴 Vì sao bắt buộc ở cụm này: bản đầu của cổng `mirror-flow` `await` thẳng. Đột biến "chỉ nghe
 * `drain`, quên `close`/`error`" làm lời hứa không bao giờ được gọi ⇒ phép thử **TREO** thay vì đỏ,
 * và `node --test` mặc định không có hạn giờ nên nó treo mãi. Cổng treo tệ hơn cổng lọt: cổng lọt
 * còn báo xanh cho người đọc biết mà nghi, cổng treo thì chỉ làm cả cụm đứng im.
 */
function withinMs(p, ms, what) {
  let timer;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error(`treo quá ${ms}ms: ${what}`)), ms);
    }),
  ]);
}

/** Ống giả: `write` trả `false` đúng số lần được dặn, rồi mới cho đi. Đủ để soi PHẢN ÁP. */
function fakePipe(fullTimes) {
  const waiters = new Map();
  let left = fullTimes;
  return {
    written: 0,
    write(b) {
      this.written += b.length;
      return left-- <= 0;
    },
    once(e, f) {
      waiters.set(e, [...(waiters.get(e) ?? []), f]);
    },
    off(e, f) {
      waiters.set(e, (waiters.get(e) ?? []).filter((x) => x !== f));
    },
    /** Số tay đang chờ ở một sự kiện — dùng để chứng minh KHÔNG rò listener. */
    waiting(e) {
      return (waiters.get(e) ?? []).length;
    },
    fire(e) {
      for (const f of [...(waiters.get(e) ?? [])]) f();
    },
  };
}

// ── ⑤ LIÊN KẾT THƯỜNG TRỰC — user chốt 2026-09-24 ────────────────────────────────────
//
// 🔴 Nguyên văn: *"nó phải luôn kết nối và tự động kết nối dù đổi mạng, ko được hết phiên, trừ khi
// t bấm unpair"*. Tức liên kết phải cư xử như cặp ghép điện thoại, không phải như một cuộc gọi.
//
// Trước bản này "xong một lượt" = "đóng ống", nên giữa hai lượt hai máy KHÔNG có liên kết nào —
// bề mặt không có gì để gọi là *"đang nối"*, và mọi đồng hồ đều buộc phải chọn giữa chém nhầm
// liên kết còn sống hay ôm mãi một ống đã đứt.

test("link: hai luật đồng hồ — im thì bắn nhịp tim, MẤT TÍN HIỆU mới là chết", () => {
  // Hai câu hỏi KHÁC NHAU, và gộp chúng làm một chính là con bug cũ: trần "hết giờ phiên" đếm từ
  // lúc bắt tay nên nó trả lời câu *"phiên chạy bao lâu rồi"* — một câu không ai cần biết.
  assert.equal(keepaliveDue(10_000, 10_000, 1_000), false, "vừa có byte thì chưa cần nhịp tim");
  assert.equal(keepaliveDue(11_000, 10_000, 1_000), true, "đúng mốc là tới hạn");
  assert.equal(keepaliveDue(11_500, 10_000, 1_000), true);

  assert.equal(linkDead(10_000, 10_000, 3_000), false);
  assert.equal(linkDead(13_000, 10_000, 3_000), false, "ĐÚNG mốc chưa phải chết — chết là VƯỢT mốc");
  assert.equal(linkDead(13_001, 10_000, 3_000), true);

  // 🔴 CA ÂM QUAN TRỌNG NHẤT: trần chết phải là BỘI của nhịp tim. Đặt sát nhau thì một nhịp rớt vì
  // mạng chập là cắt nhầm một liên kết còn sống — đúng thứ user cấm.
  assert.ok(LINK_DEAD_MS >= PING_IDLE_MS * 3, "phải chịu được ÍT NHẤT hai nhịp tim rớt liên tiếp");
  // Và lượt chở dài không bao giờ được chạm trần chết, vì mỗi khung đi qua đều dời mốc.
  assert.equal(linkDead(1_000_000, 999_999, LINK_DEAD_MS), false, "liên kết đang bận thì không bao giờ chết");
});

test("link: liên kết THƯỜNG TRỰC sống qua nhiều lượt, không đóng sau lượt đầu", async (t) => {
  const a = makeMachine(t, "lka", "chia-chung-link");
  const b = makeMachine(t, "lkb", "chia-chung-link");
  write(a, "docs", "agent/05_TODO.md", "viec cua A\n");

  const rounds = [];
  let opened = 0;
  let openedBeforeRound = false;
  let openedFor = "";
  const cut = new AbortController();
  t.after(() => cut.abort()); // ca đỏ cũng phải buông ống, nếu không cả cụm treo
  // 🔴 CẢ HAI ĐẦU phải thường trực. Phép thử này bắt được ngay một lỗ thật: bản đầu chỉ bật cờ ở
  // bên GỌI, nên bên NGHE vẫn đóng ống sau lượt một và liên kết chết từ đầu kia — bên gọi thì
  // tưởng mình đang giữ một liên kết sống. Một liên kết là thoả thuận của HAI máy, không phải
  // thiết lập của một máy.
  const server = await serveChannel(
    {
      ...sideOpts(b, [a.identity.deviceId], undefined, { persistent: true, roundGapMs: 120, pingIdleMs: 60, linkDeadMs: 8_000 }),
      port: 0,
      host: "127.0.0.1",
    },
    () => {},
  );
  t.after(() => server.close());

  // Trần chết rộng hơn hẳn khoảng cách lượt: đây là phép thử liên kết, không phải phép thử đồng hồ.
  const linkClosed = connectToPeer(
    { host: "127.0.0.1", port: server.port },
    sideOpts(a, [b.identity.deviceId], undefined, {
      persistent: true,
      roundGapMs: 120,
      pingIdleMs: 60,
      linkDeadMs: 8_000,
      stop: cut.signal,
      // `onOpen` phải nổ TRƯỚC lượt đầu — thẻ lên "đang nối" lúc bắt tay xong, không đợi hội tụ.
      onOpen: (id) => {
        opened++;
        openedFor = id;
        openedBeforeRound = rounds.length === 0;
      },
      onSyncRound: (r) => rounds.push(r),
    }),
  );

  // Chờ tới khi có ÍT NHẤT ba lượt — một lượt là chưa chứng minh được gì, hai lượt còn có thể do
  // trùng hợp; ba lượt nghĩa là vòng đang tự quay.
  const t0 = Date.now();
  while (rounds.length < 3 && Date.now() - t0 < 10_000) {
    await new Promise((r) => setTimeout(r, 40));
  }
  assert.ok(rounds.length >= 3, `liên kết phải tự mở lượt kế (mới thấy ${rounds.length} lượt)`);
  // 🔴 "Đang nối" phải có từ lúc BẮT TAY, không phải từ lúc hội tụ: lượt đầu có thể chở 800 MB
  // qua relay, và suốt lúc đó thẻ nói "đang nối lại" là thẻ nói dối (đo 25/09).
  assert.equal(opened, 1, "onOpen phải nổ đúng MỘT lần cho một liên kết");
  assert.equal(openedBeforeRound, true, "onOpen phải nổ TRƯỚC lượt đầu đóng sổ");
  // Mang DANH TÍNH máy kia: cửa NGHE không biết trước ai sẽ gọi tới, nên không có id thì cửa đó
  // không đánh dấu được liên kết ĐẾN — đúng ca "máy kia xanh, máy này không" đo 25/09.
  assert.equal(openedFor, b.identity.deviceId, "onOpen phải mang vân tay máy kia");
  // Ống vẫn PHẢI còn mở: lời hứa chỉ tan khi dây đứt.
  assert.equal(
    await Promise.race([linkClosed.then(() => "ĐÃ ĐÓNG"), new Promise((r) => setTimeout(() => r("còn mở"), 150))]),
    "còn mở",
    "liên kết thường trực không được tự đóng sau khi đồng bộ xong",
  );

  // Lượt ĐẦU chở file, các lượt SAU đã hội tụ nên chở 0 — bộ đếm phải về 0, không cộng dồn.
  assert.equal(rounds[0].sentFiles, 1, "lượt đầu phải chở đúng 1 file");
  assert.equal(rounds[rounds.length - 1].sentFiles, 0, "hội tụ rồi thì lượt sau chở 0 — cộng dồn là nói dối bề mặt");
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), null, "file mới vẫn phải vào HÀNG ĐỢI, không tự ghi");

  // 🔴 CẮT = `unpair`, và đây là vế THỨ HAI của yêu cầu, ngang hàng với vế "không hết phiên".
  // Một liên kết không bao giờ tự hết hạn mà KHÔNG có đường cắt thì `unpair` chỉ xoá được cái tên
  // trong sổ — ống vẫn chạy, hai máy vẫn đồng bộ, người dùng bấm gỡ mà không có gì xảy ra.
  cut.abort();
  const end = await Promise.race([linkClosed, new Promise((r) => setTimeout(() => r(null), 5_000))]);
  assert.ok(end, "bấm gỡ mà ống không tan = gỡ cặp chỉ là đổi nhãn");
  assert.match(end.error ?? "", /ngắt/, `phải nói rõ là NGƯỜI DÙNG ngắt, không phải lỗi mạng: ${end.error}`);
});

test("link: liên kết RẢNH sống nhờ NHỊP TIM — im không phải là chết", async (t) => {
  // 🔴 Đây là vế *"ko được hết phiên"* của yêu cầu, và là ca mà mọi trần thời gian đời cũ đều
  // trượt: hai máy đã hội tụ thì KHÔNG có gì để chở, nên ống im hoàn toàn. Không có nhịp tim thì
  // liên kết rảnh trông y hệt liên kết chết, và bất kỳ đồng hồ nào cũng buộc phải chém nhầm.
  //
  // Dựng đúng ca đó: KHÔNG lượt nào (roundGap khổng lồ), và trần chết chỉ bằng 4 nhịp tim — nên
  // nếu nhịp tim không bắn, liên kết PHẢI chết trong vòng một giây.
  const a = makeMachine(t, "lke", "chia-chung-idle");
  const b = makeMachine(t, "lkf", "chia-chung-idle");
  const cut = new AbortController();
  t.after(() => cut.abort());

  const idle = { persistent: true, roundGapMs: 3_600_000, pingIdleMs: 60, linkDeadMs: 240 };
  const server = await serveChannel(
    { ...sideOpts(b, [a.identity.deviceId], undefined, idle), port: 0, host: "127.0.0.1" },
    () => {},
  );
  t.after(() => server.close());

  const linkClosed = connectToPeer(
    { host: "127.0.0.1", port: server.port },
    sideOpts(a, [b.identity.deviceId], undefined, { ...idle, stop: cut.signal }),
  );

  // Chờ QUÁ NĂM LẦN trần chết. Không nhịp tim thì nó đã phải chết từ lần thứ nhất.
  const verdict = await Promise.race([
    linkClosed.then((r) => `CHẾT: ${r.error ?? "không rõ"}`),
    new Promise((r) => setTimeout(() => r("còn sống"), 240 * 5)),
  ]);
  assert.equal(verdict, "còn sống", "liên kết RẢNH bị chém = đúng thứ user cấm (*ko được hết phiên*)");
});

test("link: máy kia MẤT TÍN HIỆU thì liên kết phải chết, không ôm mãi", async (t) => {
  const a = makeMachine(t, "lkc", "chia-chung-link2");
  const b = makeMachine(t, "lkd", "chia-chung-link2");

  // Máy kia GIỮ ỐNG nhưng CÂM — ca khó nhất, và là ca duy nhất mà "dây đứt" không cứu được ta.
  const server = await serveChannel(
    {
      ...sideOpts(b, [a.identity.deviceId], undefined, {
        persistent: true,
        roundGapMs: 3_600_000,
        pingIdleMs: 3_600_000,
        linkDeadMs: 3_600_000,
      }),
      port: 0,
      host: "127.0.0.1",
    },
    () => {},
  );
  t.after(() => server.close());

  // 🔴 CA ÂM của cả tính năng: "không bao giờ hết phiên" KHÔNG được biến thành "không bao giờ buông".
  // Nhịp tim tắt (pingIdleMs khổng lồ) ⇒ không ai dời mốc ⇒ trần chết phải ăn.
  const t0 = Date.now();
  const r = await connectToPeer(
    { host: "127.0.0.1", port: server.port },
    sideOpts(a, [b.identity.deviceId], undefined, {
      persistent: true,
      roundGapMs: 3_600_000,
      pingIdleMs: 3_600_000,
      linkDeadMs: 600,
    }),
  );
  const took = Date.now() - t0;
  assert.ok(r.error, "mất tín hiệu phải báo lỗi, không im lặng trả về 'ok'");
  assert.match(r.error, /mất tín hiệu/, `lý do phải nói rõ là mất tín hiệu, không phải "hết giờ": ${r.error}`);
  assert.ok(took < 8_000, `phải buông NGAY sau trần chết, không đợi trần phiên đời cũ (mất ${took}ms)`);
});

test("mirror-flow: vòng chở phải ĐỢI ỐNG THOÁT, không xếp cả kho vào bộ đệm rồi bảo 'xong'", async () => {
  // 🔴 Ca thật đo 2026-09-24, và nó là bệnh CÒN LẠI sau khi đã có ngân sách ở trên: vòng chở xếp
  // trọn 4.586 file / ~800 MB vào ống trong SÁU GIÂY rồi tuyên bố "đã gửi xong". Dây thật chảy vài
  // MB/giây, nên máy kia còn đang nuốt thân file thứ vài trăm lúc ta hết 120 giây — chưa đọc tới
  // `mdone` thì không thể đóng sổ. Ngân sách vẫn đúng, nó chỉ bấm NHẦM ĐỒNG HỒ: đo thời gian liệt
  // kê chứ không đo thời gian trên dây. Đợi ống thoát làm hai đồng hồ đó thành một.
  const ok = fakePipe(0);
  await writeFlow(ok, Buffer.from("xong ngay"));
  assert.equal(ok.written, 9, "ống rỗng thì ghi thẳng, không chờ ai");

  // CA CHÍNH — ống ĐẦY: lời hứa KHÔNG được xong trước khi `drain` nổ.
  const full = fakePipe(1);
  let done = false;
  const p = writeFlow(full, Buffer.from("cho ong thoat")).then(() => {
    done = true;
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(done, false, "ống đầy mà đã xong = đúng con bug: 800 MB dồn vào bộ đệm trong 6 giây");
  assert.equal(full.waiting("drain"), 1, "phải đang chờ ở `drain`");
  full.fire("drain");
  await withinMs(p, 2_000, "`drain` nổ rồi mà vòng chở vẫn không đi tiếp");
  assert.equal(done, true);
  for (const e of ["drain", "close", "error"]) {
    assert.equal(full.waiting(e), 0, `phải gỡ tay chờ ở \`${e}\` — 4.586 file là 4.586 lần rò`);
  }

  // CA ÂM — DÂY ĐỨT giữa lúc chờ: chỉ nghe `drain` là treo một lời hứa không ai gọi, vòng chở
  // đứng đó tới hết đời phiên. `close` và `error` phải mở khoá y như `drain`.
  for (const ev of ["close", "error"]) {
    const dead = fakePipe(1);
    let freed = false;
    const q = writeFlow(dead, Buffer.from("day dut")).then(() => {
      freed = true;
    });
    await new Promise((r) => setImmediate(r));
    assert.equal(freed, false);
    dead.fire(ev);
    await withinMs(q, 2_000, `\`${ev}\` KHÔNG mở khoá — vòng chở treo vĩnh viễn ở một lời hứa không ai gọi`);
    assert.equal(freed, true, `\`${ev}\` phải mở khoá — nếu không, vòng chở treo vĩnh viễn`);
  }
});

// ── ④ Đầu-cuối: hai máy thật trên loopback ───────────────────────────────────────────
test("mirror-e2e: file MỚI của máy kia vào HÀNG ĐỢI, không tự ghi ra đĩa", async (t) => {
  const a = makeMachine(t, "a", "chia-chung-mirror");
  const b = makeMachine(t, "b", "chia-chung-mirror");
  write(a, "docs", "agent/05_TODO.md", "viec cua A\n");
  const r = await syncPair(a, b);
  assert.equal(r.client.error, undefined, `phiên phải sạch: ${r.client.error ?? ""}`);
  assert.equal(r.client.sentFiles, 1, "A phải chở đúng 1 file");
  // 🔴 Bất biến ĐẮT NHẤT của §9.3: chưa confirm thì file bên nhận KHÔNG đổi một byte.
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), null, "chưa duyệt mà đã ghi ra đĩa là phá chính luật user chốt");
  const q = listQueue(b.db);
  assert.equal(q.length, 1, "phải có đúng một mục chờ");
  assert.equal(q[0].verdict, "take");
  assert.equal(q[0].rel, "agent/05_TODO.md");
  // Duyệt xong mới ghi.
  const ap = applyQueued(b.db, q[0].id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  assert.equal(ap.ok, true, `duyệt phải ăn: ${ap.ok ? "" : ap.error}`);
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), "viec cua A\n");
  assert.equal(listQueue(b.db).length, 0, "duyệt xong phải rời hàng đợi");
});

test("mirror-e2e: mục files/ chở THẲNG — không hàng đợi, vì không thể xung đột", async (t) => {
  const a = makeMachine(t, "fa", "chia-chung-files");
  const b = makeMachine(t, "fb", "chia-chung-files");
  write(a, "files", "images/2026-09/ab12_anh.png", "BYTE-ANH");
  const r = await syncPair(a, b);
  assert.equal(r.client.error, undefined);
  assert.equal(readAt(b, "files", "images/2026-09/ab12_anh.png"), "BYTE-ANH", "§9.1 mục 4: tên LÀ sha256 ⇒ chở thẳng");
  assert.equal(listQueue(b.db).length, 0, "files/ không bao giờ vào hàng đợi");
  assert.equal(r.client.appliedFiles + (r.server?.appliedFiles ?? 0) >= 1, true);
});

test("mirror-e2e: MÁY MỚI chưa có thư mục nào vẫn phải NHẬN được — thư mục tự sinh", async (t) => {
  // 🔴 Ca THẬT, đo trên hai máy 2026-09-24: đầu này log `đã gửi "xong" (5560 file)` **lặp lại
  // nguyên con số đó** ở tám lượt liên tiếp. Giữ được dù một file thì lượt sau phải tụt; nó không
  // tụt lần nào ⇒ đầu kia không giữ lại gì. Gốc: `mirrorRoots()` chặn mọi mục bằng `existsSync`,
  // mà chiều NHẬN cũng gọi đúng hàm đó ⇒ máy chưa có `docs_visual/` thì vĩnh viễn không nhận
  // được nó, và thư mục đó không bao giờ sinh ra vì chính phép nhận mới là thứ tạo nó.
  //
  // Đây đúng ca "máy mới nhận bàn giao" của HP điều 16 — thứ cả lớp này tồn tại để phục vụ.
  const a = makeMachine(t, "na", "chia-chung-newbox");
  const b = makeMachine(t, "nb", "chia-chung-newbox");
  // B là máy TRẮNG: xoá sạch ba thư mục mirror, giữ đúng gốc repo/kho như một bản clone mới.
  for (const d of ["docs", "docs_visual", "attic"]) rmSync(join(b.repoRoot, d), { recursive: true, force: true });
  rmSync(join(b.storeRoot, "files"), { recursive: true, force: true });

  write(a, "docs", "agent/02_RULES.md", "luat\n");
  write(a, "docs_visual", "design/so-do.txt", "so do\n");
  write(a, "attic", "cu/ghi-chu.md", "ghi chu\n");
  write(a, "files", "images/2026-09/ab12_anh.png", "BYTE-ANH");

  const r = await syncPair(a, b);
  assert.equal(r.client.error, undefined, `phiên phải sạch: ${r.client.error ?? ""}`);
  assert.equal(r.client.sentFiles, 4, "A phải chở đủ bốn mục");

  // `files/` địa chỉ theo nội dung ⇒ ghi THẲNG, kể cả khi thư mục chưa từng tồn tại.
  assert.equal(readAt(b, "files", "images/2026-09/ab12_anh.png"), "BYTE-ANH", "máy trắng vẫn phải nhận được files/");
  // Ba mục chữ vào hàng đợi (chưa duyệt thì chưa ghi) — nhưng phải VÀO ĐƯỢC, không bị từ chối.
  const q = listQueue(b.db);
  assert.equal(q.length, 3, `ba mục chữ phải vào hàng đợi, đang có ${q.length}`);
  assert.equal(r.client.receivedFiles, 0, "A không nhận gì (B trắng)");
  assert.equal(r.server?.receivedFiles ?? 0, 4, "B phải ĐẾM đủ 4 file nhận về");
  assert.equal((r.server?.appliedFiles ?? 0) + (r.server?.queuedFiles ?? 0), 4, "không file nào được phép rơi im lặng");

  // Duyệt cả nhóm ⇒ thư mục tự sinh ra trên đĩa.
  for (const row of q) {
    const ap = applyQueued(b.db, row.id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
    assert.equal(ap.ok, true, `duyệt ${row.area}/${row.rel} phải ăn: ${ap.ok ? "" : ap.error}`);
  }
  assert.equal(readAt(b, "docs", "agent/02_RULES.md"), "luat\n");
  assert.equal(readAt(b, "docs_visual", "design/so-do.txt"), "so do\n");
  assert.equal(readAt(b, "attic", "cu/ghi-chu.md"), "ghi chu\n");
});

test("mirror-e2e: hội tụ rồi thì lượt sau KHÔNG chở lại gì", async (t) => {
  const a = makeMachine(t, "ia", "chia-chung-idem");
  const b = makeMachine(t, "ib", "chia-chung-idem");
  write(a, "files", "documents/2026-09/cd34_bao-cao.txt", "noi dung");
  await syncPair(a, b);
  const second = await syncPair(a, b);
  assert.equal(second.client.sentFiles, 0, "lượt hai không được chở lại thứ bên kia đã có");
  assert.equal(second.server?.sentFiles ?? 0, 0);
});

test("mirror-e2e: hai bên cùng sửa TRÙNG đoạn ⇒ CHẶN, không bên nào bị ghi đè", async (t) => {
  const a = makeMachine(t, "ca", "chia-chung-conf");
  const b = makeMachine(t, "cb", "chia-chung-conf");
  // Lần gặp đầu: hai bên có hai bản KHÁC nhau và chưa có mốc ⇒ §9.4 mục 4 buộc phải chặn.
  write(a, "docs", "agent/06_CHANGES.md", "dong mot A\n");
  write(b, "docs", "agent/06_CHANGES.md", "dong mot B\n");
  await syncPair(a, b);
  assert.equal(readAt(b, "docs", "agent/06_CHANGES.md"), "dong mot B\n", "bản của B phải còn NGUYÊN");
  assert.equal(readAt(a, "docs", "agent/06_CHANGES.md"), "dong mot A\n", "bản của A phải còn NGUYÊN");
  const qb = listQueue(b.db);
  assert.equal(qb.length, 1);
  assert.equal(qb[0].verdict, "block", "không có mốc ⇒ chặn và hỏi, tuyệt đối không tự trộn");
});

test("mirror-e2e: bản cũ KHÔNG biết mirror thì phiên vẫn xong, không treo", async (t) => {
  const a = makeMachine(t, "oa", "chia-chung-old");
  const b = makeMachine(t, "ob", "chia-chung-old");
  write(a, "docs", "a.md", "co gi do\n");
  // Giả lập máy CŨ: không có hook mirror ⇒ `hello` không khai `mirror` ⇒ pha mirror phải TẮT.
  // Thiếu cờ đó thì bên mới ngồi chờ `mdone` tới hết trần — mỗi lượt sync hai phút, câm.
  let resolveServer;
  const serverDone = new Promise((r) => {
    resolveServer = r;
  });
  const oldSide = { ...sideOpts(b, [a.identity.deviceId]), port: 0, host: "127.0.0.1" };
  delete oldSide.mirror;
  const server = await serveChannel(oldSide, (r) => resolveServer(r));
  // 🔴 Thước THẬT của ca này là **số lần bộ kiểm kê được gọi**, không phải thời gian.
  //
  // Đo bằng đồng hồ thì ca này XANH GIẢ: nếu ta lỡ khai kiểm kê cho một máy không biết mirror,
  // máy đó bỏ qua tin lạ rồi đóng sổ và ĐÓNG socket, còn ta kết thúc nhờ nhánh `close` chứ
  // không phải nhờ luật — nhanh y hệt, và cái sai đi ra dây mà không ai thấy. Đột biến hoá
  // chứng minh đúng điều đó: bỏ cờ `hello.mirror` mà cổng vẫn xanh. Đếm lời gọi thì bắt được:
  // khai năng lực ĐÚNG ⇒ ta không quét, không khai, không gửi một byte kiểm kê nào.
  let scans = 0;
  const newSide = sideOpts(a, [b.identity.deviceId]);
  const realInventory = newSide.mirror.inventory;
  newSide.mirror = {
    ...newSide.mirror,
    inventory: () => {
      scans++;
      return realInventory();
    },
  };
  const started = Date.now();
  try {
    const client = await connectToPeer({ host: "127.0.0.1", port: server.port }, newSide);
    await Promise.race([serverDone, new Promise((r) => setTimeout(() => r(null), 15_000))]);
    assert.equal(client.error, undefined, `phiên với bản cũ phải sạch: ${client.error ?? ""}`);
    assert.equal(client.sentFiles, 0, "bản cũ không nhận file — và ta KHÔNG được gửi mù");
    assert.equal(scans, 0, "máy kia không khai biết mirror ⇒ ta KHÔNG được quét, khai hay gửi kiểm kê");
    // Thước phụ: treo-rồi-hết-giờ mất 20 giây; đường đúng xong trong vài trăm ms.
    assert.ok(Date.now() - started < 10_000, "phiên với bản cũ KHÔNG được chờ tới hết trần");
  } finally {
    server.close();
  }
});

test("mirror-e2e: cặp MỘT CHIỀU — đích áp thẳng, và KHÔNG bao giờ đẩy ngược", async (t) => {
  const a = makeMachine(t, "sa", "chia-chung-oneway");
  const b = makeMachine(t, "sb", "chia-chung-oneway");
  write(a, "docs", "chuan.md", "ban cua NGUON\n");
  write(b, "docs", "rieng-cua-dich.md", "dich tu viet\n");
  // A là NGUỒN. Ở phía B, `source` trỏ vào A ⇒ B là đích: nhận thì áp thẳng, đẩy thì không.
  const r = await syncPair(a, b, {
    peerSyncA: () => ({ direction: "one-way", source: a.identity.deviceId }),
    peerSyncB: () => ({ direction: "one-way", source: a.identity.deviceId }),
  });
  assert.equal(r.client.error, undefined);
  assert.equal(readAt(b, "docs", "chuan.md"), "ban cua NGUON\n", "đích phải áp thẳng, không hỏi");
  assert.equal(listQueue(b.db).length, 0, "một chiều thì không có gì để tranh ⇒ không hàng đợi");
  // CA ÂM: đích KHÔNG được đẩy bản riêng của nó ngược về nguồn.
  assert.equal(r.server?.sentFiles ?? 0, 0, "đích của cặp một chiều không bao giờ đẩy");
  assert.equal(readAt(a, "docs", "rieng-cua-dich.md"), null, "nguồn không được nhận gì từ đích");
});

// ── ⑥ HÀNG ĐỢI KHÔNG ĐƯỢC NÓI DỐI — ba lỗi đo thật 2026-09-25, cùng một triệu chứng ──────
//
// User: *"nó cứ hiện chờ duyệt, t bấm xong 1 hồi nó hiện lại"*. Ba cơ chế, ba lỗi:
//   ① "Để sau" XOÁ dòng ⇒ phần khai `pending` mất nó ⇒ máy kia gửi lại sau 30 giây;
//   ② "Giữ bản máy này" đặt mốc = bản MÌNH ⇒ lượt sau vẫn `take` ⇒ hỏi lại y nguyên;
//   ③ verdict đóng băng lúc NHẬN ⇒ nút *Nhận* trên ảnh chụp cũ đè lên thứ vừa sửa — `06_CHANGES`
//      đã mất một mục thật vì đúng chỗ này.

test("queue-later: 'để sau' GIỮ dòng, máy kia thôi gửi lại, và chỉ hỏi lại khi có nội dung MỚI", async (t) => {
  const a = makeMachine(t, "qla", "chia-chung-later");
  const b = makeMachine(t, "qlb", "chia-chung-later");
  write(a, "docs", "agent/05_TODO.md", "viec cua A\n");
  await syncPair(a, b);
  const q1 = listQueue(b.db);
  assert.equal(q1.length, 1, "lượt đầu: một dòng chờ");
  assert.equal(q1[0].dismissedAt, null);

  assert.ok(dismissQueued(b.db, q1[0].id));
  const q2 = listQueue(b.db);
  assert.equal(q2.length, 1, "để sau KHÔNG xoá dòng — xoá là máy kia gửi lại ngay lượt sau");
  assert.ok(q2[0].dismissedAt, "phải có dấu 'để sau'");

  // Lượt sau: A KHÔNG được gửi lại (B đã khai đang cầm), và B không đẻ dòng mới.
  const r2 = await syncPair(a, b);
  assert.equal(r2.client.sentFiles, 0, "máy kia thôi gửi lại thứ ta đang cầm — kể cả khi đã 'để sau'");
  const q3 = listQueue(b.db);
  assert.equal(q3.length, 1);
  assert.equal(q3[0].id, q1[0].id, "vẫn là dòng cũ, không đẻ dòng mới");
  assert.ok(q3[0].dismissedAt, "dấu 'để sau' phải còn — không được tự bật lại");

  // A đổi NỘI DUNG ⇒ đây mới là lúc hỏi lại: dòng được thay bằng bản mới và dấu 'để sau' hết hiệu lực.
  write(a, "docs", "agent/05_TODO.md", "viec cua A — da sua\n");
  const r3 = await syncPair(a, b);
  assert.equal(r3.client.sentFiles, 1, "nội dung mới thì phải đi");
  const q4 = listQueue(b.db);
  assert.equal(q4.length, 1);
  assert.equal(q4[0].dismissedAt, null, "có cái MỚI ⇒ hỏi lại — đúng nghĩa 'để sau'");
  assert.notEqual(q4[0].theirHash, q1[0].theirHash);
});

test("queue-mine: 'giữ bản máy này' ⇒ mốc = bản CỦA HỌ ⇒ lượt sau ĐẨY bản mình sang, không hỏi lại", async (t) => {
  const a = makeMachine(t, "qma", "chia-chung-mine");
  const b = makeMachine(t, "qmb", "chia-chung-mine");
  write(a, "docs", "agent/05_TODO.md", "ban cua A\n");
  write(b, "docs", "agent/05_TODO.md", "ban cua B\n");
  await syncPair(a, b);
  const qb = listQueue(b.db);
  assert.equal(qb.length, 1);
  const row = qb[0];

  const ap = applyQueued(b.db, row.id, "mine", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  assert.equal(ap.ok, true, `giữ bản mình phải xong: ${ap.ok ? "" : ap.error}`);
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), "ban cua B\n", "không ghi byte nào");
  // 🔴 Mốc phải là bản CỦA HỌ — "tôi đã thấy bản này và từ chối". Mốc = bản mình là hỏi lại mãi.
  const base = readBase(b.db, a.identity.deviceId, "docs", "agent/05_TODO.md");
  assert.equal(base?.hash, row.theirHash, "mốc sau 'giữ bản mình' phải bằng băm của HỌ");
  assert.equal(classify(base.hash, row.mineHash, row.theirHash), "push", "lượt sau phải là ĐẨY, không phải hỏi lại");

  // Lượt sau, hai chiều: B KHÔNG bị hỏi lại; A nhận được bản của B vào hàng đợi (bản B đã sang).
  await syncPair(a, b);
  assert.equal(listQueue(b.db).length, 0, "giữ bản mình rồi thì KHÔNG được hỏi lại");
  const qa = listQueue(a.db);
  assert.equal(qa.length, 1, "bản của B phải SANG A");
  assert.equal(qa[0].theirHash, row.mineHash, "thứ A nhận được là đúng bản B đã giữ");
});

test("🔴 queue-stale: verdict phải tính LẠI theo đĩa — nút Nhận trên ảnh chụp cũ không được đè lên thứ vừa sửa", async (t) => {
  const a = makeMachine(t, "qsa", "chia-chung-stale");
  const b = makeMachine(t, "qsb", "chia-chung-stale");
  write(a, "docs", "agent/05_TODO.md", "ban cua A\n");
  await syncPair(a, b);
  const q = listQueue(b.db);
  assert.equal(q.length, 1);
  assert.equal(q[0].verdict, "take", "B chưa có tệp ⇒ 'họ đổi, tôi không đổi' — lúc NHẬN thì đúng");

  // B sửa tệp SAU khi nhận — đúng ca thật: agent thêm §9.10 sau 13:06.
  write(b, "docs", "agent/05_TODO.md", "B vua viet them\n");

  // ĐỌC: mặt trước phải thấy verdict mới, không phải ảnh chụp.
  const fresh = listQueue(b.db, undefined, { freshen: true, repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].verdict, "block", "hai bên cùng có bản riêng, chưa có mốc ⇒ CHẶN (§9.4 mục 4)");
  // CA ÂM — đĩa không đổi thêm thì verdict vừa tính vẫn dùng được, không tính lại vô ích.
  assert.equal(freshenRow(b.db, fresh[0], { repoRoot: b.repoRoot, storeRoot: b.storeRoot }), fresh[0], "đĩa không đổi ⇒ trả đúng dòng cũ");

  // GHI: người bấm ĐÃ THẤY `take` (màn hình vẽ trước khi đĩa đổi) ⇒ phải bị TỪ CHỐI, tệp còn nguyên.
  // 🔴 `seen` là bắt buộc ở đây: cửa ĐỌC ngay trên vừa làm tươi dòng, nên "verdict đã lưu" đã bằng
  // đĩa — so với nó thì không còn gì lệch và cửa ghi vẫn đè. Cổng đã bắt đúng lỗ đó ở bản đầu.
  const ap = applyQueued(b.db, q[0].id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot }, "take");
  assert.equal(ap.ok, false, "đè lên thứ vừa sửa vì một ảnh chụp cũ = đúng cách 06_CHANGES đã mất một mục");
  assert.equal(ap.verdict, "block", "phải trả verdict MỚI để mặt trước vẽ lại");
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), "B vua viet them\n", "tệp KHÔNG được đụng");
  // CA ÂM: đã thấy đúng verdict hiện tại (`block`) và chọn "dùng bản máy kia" thì ĐƯỢC — đó là quyết định có ý thức.
  const ok2 = applyQueued(b.db, q[0].id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot }, "block");
  assert.equal(ok2.ok, true, `thấy đúng verdict thì phải cho: ${ok2.ok ? "" : ok2.error}`);
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), "ban cua A\n");
});

test("queue-merged: chọn 'bản đã gộp' mà KHÔNG có bản gộp ⇒ từ chối, không rơi về bản máy kia", async (t) => {
  const a = makeMachine(t, "qga", "chia-chung-merged");
  const b = makeMachine(t, "qgb", "chia-chung-merged");
  write(a, "docs", "agent/05_TODO.md", "ban cua A\n");
  write(b, "docs", "agent/05_TODO.md", "ban cua B\n");
  await syncPair(a, b);
  const q = listQueue(b.db);
  assert.equal(q[0].verdict, "block", "chưa có mốc ⇒ chặn ⇒ không có bản gộp");
  const ap = applyQueued(b.db, q[0].id, "merged", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  assert.equal(ap.ok, false, "rơi về bản máy kia là mất phần của mình đúng chỗ người bấm tưởng đã được giữ");
  assert.equal(readAt(b, "docs", "agent/05_TODO.md"), "ban cua B\n");
});

test("link: TAY ĐÁ mở lượt kế NGAY trên liên kết đang có — không chờ roundGap", async (t) => {
  // Đo 2026-09-25: *Đồng bộ ngay* dựng phiên mới từ đầu, không trả lời sau 90 s. Liên kết đang sống
  // thì đúng là một khung `have` trên chính ống đó. Dựng đúng ca: lượt kế hẹn 1 GIỜ — không đá thì
  // chỉ có một lượt; đá thì phải có lượt thứ hai trong vài giây.
  const a = makeMachine(t, "kka", "chia-chung-kick");
  const b = makeMachine(t, "kkb", "chia-chung-kick");
  const cut = new AbortController();
  t.after(() => cut.abort());
  const slow = { persistent: true, roundGapMs: 3_600_000, pingIdleMs: 200, linkDeadMs: 8_000 };
  const server = await serveChannel({ ...sideOpts(b, [a.identity.deviceId], undefined, slow), port: 0, host: "127.0.0.1" }, () => {});
  t.after(() => server.close());
  const rounds = [];
  let kick = null;
  void connectToPeer(
    { host: "127.0.0.1", port: server.port },
    sideOpts(a, [b.identity.deviceId], undefined, { ...slow, stop: cut.signal, onKick: (k) => (kick = k), onSyncRound: (r) => rounds.push(r) }),
  );
  const until = (ok, ms) => new Promise((res) => { const t0 = Date.now(); (function s() { if (ok() || Date.now() - t0 > ms) return res(); setTimeout(s, 30); })(); });
  await until(() => rounds.length >= 1 && kick, 8_000);
  assert.equal(rounds.length, 1, "lượt đầu xong, lượt kế hẹn 1 giờ");
  assert.equal(typeof kick, "function", "phiên thường trực phải trao tay đá");

  write(a, "docs", "agent/05_TODO.md", "moi sua\n");
  assert.equal(kick(), true, "ống còn sống ⇒ đá được");
  await until(() => rounds.length >= 2, 5_000);
  assert.ok(rounds.length >= 2, "đá xong phải có lượt thứ hai NGAY, không chờ 1 giờ");
  assert.equal(rounds[1].sentFiles, 1, "lượt được đá phải chở thay đổi vừa ghi");

  cut.abort();
  await until(() => false, 200);
  assert.equal(kick(), false, "ống đã chết ⇒ tay đá phải nói không, không giả vờ");
});

test("🔴 gọi một máy ĐÃ QUEN với wantPair bật vẫn phải KHAI KHO — lượt phải đóng sổ", async (t) => {
  // Đo 2026-09-25 bằng số phiên: bên gọi không bao giờ gửi `have` ⇒ bên nghe không bao giờ gửi
  // `done` ⇒ lượt không bao giờ đóng sổ (liên kết thường trực) / "hết giờ phiên" ở giây 120 (phiên
  // một-lượt, suốt 24/09). Vì lớp giữ-liên-kết truyền vân tay làm địa chỉ ⇒ `wantPair` luôn bật, và
  // phiên xin ghép THAY cho khai kho kể cả với máy đã quen.
  const a = makeMachine(t, "wpa", "chia-chung-wp");
  const b = makeMachine(t, "wpb", "chia-chung-wp");
  write(a, "docs", "agent/05_TODO.md", "viec cua A\n");
  let resolveServer;
  const serverDone = new Promise((r) => { resolveServer = r; });
  const server = await serveChannel({ ...sideOpts(b, [a.identity.deviceId]), port: 0, host: "127.0.0.1" }, (r) => resolveServer(r));
  t.after(() => server.close());
  const t0 = Date.now();
  const client = await connectToPeer(
    { host: "127.0.0.1", port: server.port },
    sideOpts(a, [b.identity.deviceId], undefined, { wantPair: true, timeoutMs: 6_000 }),
  );
  assert.equal(client.error, undefined, `phiên phải đóng sổ sạch, không chờ tới trần: ${client.error ?? ""}`);
  assert.ok(Date.now() - t0 < 5_000, "không được chờ tới trần im lặng");
  assert.equal(client.sentFiles, 1, "bên gọi phải khai kho và chở tệp");
  const srv = await Promise.race([serverDone, new Promise((r) => setTimeout(() => r(null), 5_000))]);
  assert.ok(srv && !srv.error, "bên nghe cũng phải đóng sổ sạch");
});

test("🔴 declined: bản cũ của máy kia mà ta đã từ chối (bản mình mới hơn) KHÔNG được chở lại mỗi lượt", async (t) => {
  // Đo 25/09: máy kia chở lại 4 file docs mỗi lượt, 527 lượt liên tiếp — bên nhận xét ra 'push' rồi im.
  const a = makeMachine(t, "dca", "chia-chung-declined");
  const b = makeMachine(t, "dcb", "chia-chung-declined");
  write(a, "docs", "agent/05_TODO.md", "ban cua A\n");
  write(b, "docs", "agent/05_TODO.md", "ban cua B\n");
  await syncPair(a, b);
  const row = listQueue(b.db)[0];
  assert.ok(row, "lượt đầu: bản A vào hàng đợi của B");
  applyQueued(b.db, row.id, "mine", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  // Lượt 2: B đẩy bản mình sang A (A giữ trong hàng đợi); A vẫn chở bản cũ của nó ⇒ B xét ra 'push'.
  await syncPair(a, b);
  assert.equal(listQueue(a.db).length, 1, "bản của B phải nằm trong hàng đợi của A");
  // Lượt 3: B đã khai 'đã xét bản đó của A' ⇒ A KHÔNG chở lại.
  const r3 = await syncPair(a, b);
  assert.equal(r3.client.sentFiles, 0, `A không được chở lại bản B đã từ chối — chở ${r3.client.sentFiles}`);
  assert.equal(r3.server?.sentFiles ?? 0, 0, "B cũng không chở lại thứ A đang giữ trong hàng đợi");
  // A SỬA lại file ⇒ băm đổi ⇒ phải được chở và xét lại (không bị khai cũ nuốt mất).
  write(a, "docs", "agent/05_TODO.md", "ban cua A lan hai\n");
  const r4 = await syncPair(a, b);
  assert.equal(r4.client.sentFiles, 1, "bản MỚI của A phải đi");
});

test("nhận mà không áp phải NÓI ra đường dẫn, và cửa nghe thẳng phải có log (từng câm cả phiên)", () => {
  const PEER = readFileSync(new URL("../src/memory/channel/peer.ts", import.meta.url), "utf8");
  assert.match(PEER, /else if \(!r\.applied && !r\.queued && r\.verdict && idleShown\+\+ < RECV_ERR_SHOWN\) \{\s*o\.log\?\.\(`\[channel\] #\$\{sid\} mirror: \$\{head\.area\}\/\$\{head\.rel\} — nhận nhưng không áp/, "file nhận mà không áp phải in đường dẫn + lý do");
  const CH = readFileSync(new URL("../src/memory/channel/index.ts", import.meta.url), "utf8");
  const serve = CH.slice(CH.indexOf("const server = await serveChannel("), CH.indexOf("persistent: true,", CH.indexOf("const server = await serveChannel(")));
  assert.match(serve, /\n\s*log,\s*\n/, "cửa nghe thẳng phải truyền log vào phiên");
});

test("🔴 gỡ máy ⇒ quên hàng đợi + mốc của ĐÚNG máy đó (vân tay viết khác dạng vẫn trúng), máy khác nguyên", async (t) => {
  // Audit 25/09: hàm dọn có sẵn mà không ai gọi ⇒ gỡ máy xong file chờ duyệt của nó vẫn nằm đó.
  const a = makeMachine(t, "fga", "chia-chung-forget");
  const b = makeMachine(t, "fgb", "chia-chung-forget");
  write(a, "docs", "agent/05_TODO.md", "ban cua A\n");
  write(b, "docs", "agent/05_TODO.md", "ban cua B\n");
  await syncPair(a, b);
  assert.equal(listQueue(b.db).length, 1, "tiền đề: B có một dòng chờ từ A");
  // File giống hệt nhau không bao giờ được chở ⇒ không lượt nào ghi mốc cho nó; chèn thẳng một mốc.
  b.db.prepare("INSERT INTO peer_file_state (peer_id, area, rel, base_hash, base_body, updated_at) VALUES (?,?,?,?,?,?)").run(a.identity.deviceId, "docs", "plan/x.md", "h", null, new Date().toISOString());
  assert.ok(readBase(b.db, a.identity.deviceId, "docs", "plan/x.md"), "tiền đề: B có mốc với A");
  // Một dòng của MÁY KHÁC, để chứng minh không xoá nhầm.
  b.db.prepare("INSERT INTO peer_file_state (peer_id, area, rel, base_hash, base_body, updated_at) VALUES (?,?,?,?,?,?)").run("OTHER-PEER-1", "docs", "k.md", "h", null, new Date().toISOString());
  const messy = a.identity.deviceId.replace(/-/g, "").toLowerCase();
  const f = forgetPeerMirror(b.db, messy);
  assert.equal(f.queue, 1);
  assert.ok(f.bases >= 1);
  assert.equal(listQueue(b.db).length, 0, "hàng đợi của máy đã gỡ phải sạch");
  assert.equal(readBase(b.db, a.identity.deviceId, "docs", "plan/x.md"), null, "mốc của máy đã gỡ phải sạch");
  assert.ok(readBase(b.db, "OTHER-PEER-1", "docs", "k.md"), "máy khác không được đụng tới");
  // Cả HAI đường gỡ máy phải gọi nó.
  const UI = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");
  const pair = UI.slice(UI.indexOf('if (p === "/channel-pair") {'), UI.indexOf('if (p === "/channel-sync") {'));
  assert.match(pair, /if \(drop\) \{[\s\S]*forgetPeerMirror\(ms\.mirrorDb\(\), want\)/, "nút gỡ trên app phải dọn trạng thái mirror");
  const CLI = readFileSync(new URL("../src/commands/memory.ts", import.meta.url), "utf8");
  assert.match(CLI, /if \(action === "unpair"\) \{[\s\S]{0,200}forgetPeerMirror\(ms\.mirrorDb\(\), want\)/, "lệnh CLI unpair cũng phải dọn");
});

test("🔴 echo: bản CỦA CHÍNH MÌNH quay về từ máy kia KHÔNG được hỏi lại (user 25/09)", async (t) => {
  // A gửi V1 → B nhận → A sửa tiếp V2 → B chở V1 về A. V1 là của A, A không được hỏi "máy kia sửa".
  const a = makeMachine(t, "eca", "chia-chung-echo");
  const b = makeMachine(t, "ecb", "chia-chung-echo");
  write(a, "docs", "agent/x.md", "goc\n");
  write(b, "docs", "agent/x.md", "goc\n");
  await syncPair(a, b); // hai bên giống nhau
  write(a, "docs", "agent/x.md", "goc\nA sua lan 1\n");
  await syncPair(a, b);
  const rowB = listQueue(b.db)[0];
  assert.ok(rowB, "B phải được hỏi bản V1 của A");
  const ap = applyQueued(b.db, rowB.id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  assert.equal(ap.ok, true);
  await syncPair(a, b); // lượt hai bên đã khớp ở V1
  write(a, "docs", "agent/x.md", "goc\nA sua lan 1\nA sua lan 2\n");
  await syncPair(a, b);
  assert.equal(listQueue(a.db).length, 0, "A KHÔNG được hỏi lại chính bản V1 của nó");
  assert.equal(listQueue(b.db).length, 1, "B vẫn được hỏi bản V2 mới của A");
});

test("🔴 echo (tranh nhau): A sửa tiếp TRƯỚC lượt khớp — bản A đã chở đi quay về vẫn không bị hỏi", async (t) => {
  const a = makeMachine(t, "era", "chia-chung-echo-race");
  const b = makeMachine(t, "erb", "chia-chung-echo-race");
  write(a, "docs", "agent/y.md", "goc\n");
  write(b, "docs", "agent/y.md", "goc\n");
  await syncPair(a, b);
  write(a, "docs", "agent/y.md", "goc\nA1\n");
  await syncPair(a, b);
  const row = listQueue(b.db)[0];
  applyQueued(b.db, row.id, "theirs", { repoRoot: b.repoRoot, storeRoot: b.storeRoot });
  // KHÔNG có lượt nào ở giữa để A thấy hai bên khớp — A sửa tiếp ngay.
  write(a, "docs", "agent/y.md", "goc\nA1\nA2\n");
  await syncPair(a, b);
  assert.equal(listQueue(a.db).length, 0, "bản A1 là của A — quay về không được hỏi lại");
});

test("scan-cache: đệm quét KHÔNG được trả số cũ — thêm tệp files/, sửa docs, xoá tệp đều thấy ngay", async (t) => {
  // Đệm vào 3.5.31: quét là ĐỒNG BỘ trên event loop (đo 0,6–0,9 s × 2 mỗi lượt) ⇒ nay ~7 ms khi ấm.
  const m = makeMachine(t, "scc", "chia-chung-scan");
  const opts = { repoRoot: m.repoRoot, storeRoot: m.storeRoot };
  write(m, "docs", "agent/a.md", "mot\n");
  write(m, "files", "images/2026-09/aaa.png", "x");
  const s1 = scanMirror(opts).entries;
  assert.ok(s1.some((e) => e.rel === "images/2026-09/aaa.png"));
  // Thêm tệp vào thư mục files/ ĐÃ quét (đệm theo mtime thư mục phải vỡ).
  await new Promise((r) => setTimeout(r, 20));
  write(m, "files", "images/2026-09/bbb.png", "y");
  // Sửa nội dung docs (băm phải tính lại theo size/mtime).
  write(m, "docs", "agent/a.md", "hai dong\nkhac\n");
  const s2 = scanMirror(opts).entries;
  assert.ok(s2.some((e) => e.rel === "images/2026-09/bbb.png"), "tệp files/ mới phải hiện");
  const a1 = s1.find((e) => e.rel === "agent/a.md"), a2 = s2.find((e) => e.rel === "agent/a.md");
  assert.notEqual(a2.hash, a1.hash, "docs sửa rồi thì băm phải đổi");
  // Xoá một tệp files/.
  const { rmSync: rm } = await import("node:fs");
  await new Promise((r) => setTimeout(r, 20));
  rm(join(m.storeRoot, "files", "images", "2026-09", "aaa.png"));
  const s3 = scanMirror(opts).entries;
  assert.ok(!s3.some((e) => e.rel === "images/2026-09/aaa.png"), "tệp đã xoá không được còn trong kiểm kê");
});
