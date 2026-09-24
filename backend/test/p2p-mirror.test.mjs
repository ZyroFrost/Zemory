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
import { connectToPeer, serveChannel } from "../../dist/memory/channel/peer.js";
import { excludeReason, mirrorRoots, resolveMirrorPath, scanMirror } from "../../dist/memory/channel/mirror.js";
import { classify, listQueue, applyQueued, mirrorHooks } from "../../dist/memory/channel/mirrorstate.js";
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

const sideOpts = (m, peers, peerSync) => ({
  channelDir: m.channelDir,
  identity: m.identity,
  shareKey: m.shareKey,
  allowedPeers: peers,
  appVersion: APP_VERSION,
  timeoutMs: 20_000,
  mirror: mirrorHooks({ repoRoot: m.repoRoot, storeRoot: m.storeRoot, db: m.db, peerSync }),
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
