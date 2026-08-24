import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { openMemory } from "../../dist/memory/db.js";
import { abstainEnabled, collapseEnabled, recallChecked, search, searchMulti, shouldAbstain, vecMixEnabled } from "../../dist/memory/search.js";
import { tempDir } from "./helpers.mjs";

test("project search applies scope before the global candidate limit", (t) => {
  const root = tempDir(t, "zemory-search-");
  const dbPath = join(root, "memory.db");
  const db = openMemory(dbPath);
  try {
    const addSession = db.prepare(
      "INSERT INTO sessions (id, source, project_root, message_count) VALUES (?, 'test', ?, 1)",
    );
    const addMessage = db.prepare(
      "INSERT INTO messages (session_id, uuid, role, content, timestamp) VALUES (?, ?, 'user', ?, ?)",
    );
    for (let i = 0; i < 70; i++) {
      addSession.run(`other-${i}`, "C:\\other");
      addMessage.run(`other-${i}`, `other-message-${i}`, "shared needle", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`);
    }
    addSession.run("target", "C:\\target");
    addMessage.run("target", "target-message", "shared needle target", "2026-01-02T00:00:00Z");
  } finally {
    db.close();
  }

  const hits = search("shared needle", { project: "C:/target", dbPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].sessionId, "target");
});

// ── Hạ điểm đầu ra của tool (chống "recall blindness") ──────────────────────────
// Đo 2026-07-27 trên DB thật: 20 kết quả đầu có 8 tin TOOL — 40% ngân sách recall đổ
// vào nội dung máy sinh (dump file, output lệnh) vì chúng dài và đầy mã định danh nên
// khớp từ khoá rất tốt, đẩy câu trả lời của con người xuống dưới.
// HẠ ĐIỂM chứ KHÔNG loại — hai test cuối khoá đúng ranh giới đó.
function seed(t, rows) {
  const root = tempDir(t, "zemory-demote-");
  const p = join(root, "memory.db");
  const db = openMemory(p);
  try {
    db.prepare("INSERT INTO sessions (id, source, project_root, message_count) VALUES ('s','claude-code','C:\\p',0)").run();
    const add = db.prepare("INSERT INTO messages (session_id, uuid, role, content, tool_name, timestamp) VALUES ('s',?,?,?,?,?)");
    rows.forEach((r, i) => add.run(`u${i}`, r.role, r.content, r.tool ?? null, `2026-07-01T00:0${i}:00Z`));
  } finally {
    db.close();
  }
  return p;
}

test("tin tool bị hạ xuống dưới văn xuôi, nhưng KHÔNG bị loại khỏi kết quả", (t) => {
  const p = seed(t, [
    { role: "user", content: "[tool_result] fitness fitness fitness dump fitness" },
    { role: "user", content: "[tool_result] fitness fitness fitness khác fitness" },
    { role: "assistant", content: "bàn về fitness của graph" },
  ]);
  const isTool = (h) => /^\s*\[tool_result/i.test(h.snippet ?? "");
  const on = search("fitness", { dbPath: p, all: true, limit: 10, perSession: 10 });
  const off = search("fitness", { dbPath: p, all: true, limit: 10, perSession: 10, includeTools: true });
  assert.ok(on.length >= 2, "phải trả về cả hai loại");
  assert.ok(!isTool(on[0]), "văn xuôi phải đứng trước tin tool sau khi hạ điểm");
  assert.ok(on.some(isTool), "tin tool vẫn PHẢI có mặt — hạ điểm, không phải loại bỏ");
  assert.equal(on.length, off.length, "hạ điểm không được làm MẤT kết quả nào");
});

// Trường hợp xấu nhất: câu trả lời CHỈ nằm trong tool output. Hạ điểm không được nuốt nó.
test("khi tool là nguồn DUY NHẤT, kết quả vẫn ra", (t) => {
  const p = seed(t, [{ role: "user", content: "[tool_result] mã lỗi hiếm zqx9910 chỉ có ở đây" }]);
  assert.equal(search("zqx9910", { dbPath: p, all: true }).length, 1, "không có văn xuôi cạnh tranh ⇒ tin tool vẫn phải ra");
});

test("hỏi thẳng role=tool thì không bị phạt", (t) => {
  const p = seed(t, [{ role: "user", content: "[tool_result] enoentxyz trong output công cụ" }]);
  assert.equal(search("enoentxyz", { dbPath: p, all: true, role: "tool" }).length, 1);
});

// ── ĐA-TRUY-VẤN RRF (plan 17 §1.1) ──────────────────────────────────────────────
// Đo trên corpus 56 nhãn: ba cách diễn đạt nâng `@10` 39% → 50%, `prose@40` 68% → 94%.
// Ở đây không có model nên vector rỗng và mọi thứ chạy bằng FTS — đủ để khoá HỢP ĐỒNG:
// một truy vấn phải y như cũ, và một tin CHỈ tìm được bằng lối nói thứ hai phải nổi lên.
test("searchMulti: một truy vấn cho kết quả y hệt đường cũ (tương thích ngược)", async (t) => {
  const p = seed(t, [
    { role: "user", content: "khoá ngoại ngày của bảng dữ kiện không thiếu dòng" },
    { role: "assistant", content: "chuyện khác hẳn về hộp thoại" },
  ]);
  const one = await searchMulti(["khoá ngoại"], { dbPath: p, all: true });
  const plain = search("khoá ngoại", { dbPath: p, all: true });
  assert.deepEqual(
    one.map((h) => h.id),
    plain.map((h) => h.id),
    "một truy vấn KHÔNG được đổi thứ tự so với đường cũ",
  );
});

test("searchMulti: tin chỉ khớp lối nói THỨ HAI vẫn được lấy về", async (t) => {
  const p = seed(t, [
    { role: "user", content: "bản ghi nói về khoá ngoại ngày" },
    { role: "assistant", content: "bản ghi nói về foreign key của bảng fact" },
  ]);
  const only1 = await searchMulti(["khoá ngoại"], { dbPath: p, all: true });
  const both = await searchMulti(["khoá ngoại", "foreign key fact"], { dbPath: p, all: true });
  assert.equal(only1.length, 1, "một lối nói chỉ thấy một tin");
  assert.equal(both.length, 2, "gộp hai lối nói phải thấy CẢ HAI tin");
});

test("searchMulti: truy vấn rỗng/toàn khoảng trắng bị bỏ, không nổ", async (t) => {
  const p = seed(t, [{ role: "user", content: "một tin có chữ needle" }]);
  assert.equal((await searchMulti(["needle", "   ", ""], { dbPath: p, all: true })).length, 1);
  assert.equal((await searchMulti([], { dbPath: p, all: true })).length, 0, "không có truy vấn nào ⇒ rỗng, không throw");
});

// ── GỘP NEAR-DUPLICATE (plan 17 §1.2) ───────────────────────────────────────────
// Ở đây KHÔNG có sqlite-vec/model, nên `vectorsByRowid` trả Map rỗng. Đó chính là ca
// FAIL-OPEN cần khoá: thiếu vector thì mọi tin phải ĐỨNG RIÊNG. Nếu code suy "không đo
// được ⇒ coi như giống nhau" thì nó sẽ âm thầm nuốt kết quả, và test này bắt đúng chỗ đó.
test("gộp near-dup: thiếu vector ⇒ mọi tin đứng riêng, KHÔNG mất kết quả (fail-open)", (t) => {
  const p = seed(t, [
    { role: "user", content: "needle bản một" },
    { role: "assistant", content: "needle bản hai" },
    { role: "user", content: "needle bản ba" },
  ]);
  const on = search("needle", { dbPath: p, all: true, perSession: 10, collapse: true });
  const off = search("needle", { dbPath: p, all: true, perSession: 10, collapse: false });
  assert.equal(on.length, 3, "không có vector để so ⇒ không được gộp gì");
  assert.equal(on.length, off.length, "bật/tắt gộp phải cho cùng số kết quả khi thiếu vector");
  assert.ok(on.every((h) => !h.similar), "không có cụm nào ⇒ không hit nào mang cờ similar");
});

// Mặc định phải TẮT: gộp TRƯỢT cổng recall trên corpus có nhãn (`@10` 39% → 32%), và điều 12
// cấm bật mặc định một lớp chưa thắng net. Khoá lại vì đây đúng loại mặc-định-sai đã trả giá
// một lần với rerank: đợt 07-26 chỉ vá GIÁ TRỊ trong config, mặc định vẫn bật nên nó quay lại.
// MẶC ĐỊNH BẬT (user chốt 2026-08-09) sau khi thước TƯƠNG ĐƯƠNG đảo phán quyết: gộp thua trên
// thước nghiêm (MRR 0,319→0,288) nhưng THẮNG trên thước tương đương (0,407→0,413, @10 49→54%).
test("gộp near-dup: MẶC ĐỊNH BẬT, tắt được qua env/opts", () => {
  const prev = process.env.ZEMORY_COLLAPSE;
  try {
    delete process.env.ZEMORY_COLLAPSE;
    assert.equal(collapseEnabled(), true, "không khai gì ⇒ phải BẬT");
    process.env.ZEMORY_COLLAPSE = "0";
    assert.equal(collapseEnabled(), false, "ZEMORY_COLLAPSE=0 tắt được");
    assert.equal(collapseEnabled(true), true, "tham số mỗi lời gọi thắng env");
  } finally {
    if (prev === undefined) delete process.env.ZEMORY_COLLAPSE;
    else process.env.ZEMORY_COLLAPSE = prev;
  }
});

// Cổng "không biết" (plan 17 §1.3b): hiệu chỉnh lại 2026-08-24 trên corpus 108 nhãn + 20 ca âm
// GIỮ RIÊNG ⇒ QUA cổng nghiệm thu (7/8 âm cũ · 17/20 giữ riêng · mất 0 kết quả top-10), user
// chốt BẬT MẶC ĐỊNH. Khoá cả hai chiều: mặc định đúng chiều, VÀ đường tắt phải còn sống —
// repo đã trả giá đúng lỗi mặc-định-sai với rerank một lần (recall chậm 6,3× suốt hai tháng),
// nên thứ cứu được ca đó là một biến môi trường tắt được ngay, không phải một bản vá.
test("cổng không-biết: MẶC ĐỊNH BẬT (user chốt 24/08), tắt được qua env/opts", () => {
  const prev = process.env.ZEMORY_ABSTAIN;
  try {
    delete process.env.ZEMORY_ABSTAIN;
    assert.equal(abstainEnabled(), true, "không khai gì ⇒ phải BẬT");
    process.env.ZEMORY_ABSTAIN = "0";
    assert.equal(abstainEnabled(), false, "ZEMORY_ABSTAIN=0 tắt được — đây là đường lùi");
    process.env.ZEMORY_ABSTAIN = "off";
    assert.equal(abstainEnabled(), false, "ZEMORY_ABSTAIN=off tắt được");
    process.env.ZEMORY_ABSTAIN = "on";
    assert.equal(abstainEnabled(), true, "ZEMORY_ABSTAIN=on bật được");
    assert.equal(abstainEnabled(false), false, "tham số mỗi lời gọi thắng env");
  } finally {
    if (prev === undefined) delete process.env.ZEMORY_ABSTAIN;
    else process.env.ZEMORY_ABSTAIN = prev;
  }
});

// HÌNH DẠNG LUẬT — khoá cả hai vế đã bị BÁC bằng đo 2026-08-24, để không ai lặng lẽ gắn lại:
//   · `margin` từng là tín hiệu duy nhất sống sót vòng 09/08, nhưng trên corpus lớn nó KÉO TỤT
//     chặn (7/8 → 5/8 âm cũ) mà không cứu câu dương nào ⇒ đã gỡ khỏi luật.
//   · độ ĐỒNG THUẬN giữa lane (ov10) cộng thêm đúng số không (phép ablation: bộ số trùng khít).
// Ngưỡng θ=0,84 chọn theo trần THẬT của câu dương đo theo lớp: prose 0,812 · tool_result 0,778 ·
// tool_use 0,764; chỉ `keyword` chạm 0,864 và 3 câu chạm đó ĐANG trượt sẵn (hạng 0 · 0 · 33).
test("cổng không-biết: luật là KHOẢNG CÁCH THUẦN — margin không còn được tính", () => {
  // Hai bên ngưỡng mặc định 0,84.
  assert.equal(shouldAbstain(0.85, 0.001, true), true, "xa hơn ngưỡng ⇒ chặn");
  assert.equal(shouldAbstain(0.83, 0.001, true), false, "gần hơn ngưỡng ⇒ KHÔNG chặn");
  // Cùng một khoảng cách, margin trải từ cực nhỏ tới cực lớn ⇒ phán quyết KHÔNG được đổi.
  for (const m of [0, 0.01, 0.05, 0.2, 1, undefined]) {
    assert.equal(shouldAbstain(0.9, m, true), true, `margin=${m} không được đổi phán quyết (xa)`);
    assert.equal(shouldAbstain(0.7, m, true), false, `margin=${m} không được đổi phán quyết (gần)`);
  }
  // Trần đo được của ba lớp KHÔNG phải keyword đều dưới ngưỡng ⇒ không lớp nào bị bóp oan.
  for (const d of [0.812, 0.778, 0.764]) {
    assert.equal(shouldAbstain(d, 0.03, true), false, `trần lớp ${d} phải nằm dưới ngưỡng`);
  }
  assert.equal(shouldAbstain(undefined, 0.01, true), false, "không có số đo ⇒ không chặn (điều 9)");
  assert.equal(shouldAbstain(0.99, 0.001, false), false, "cổng tắt ⇒ không bao giờ chặn");
});

// SÀN KÍCH THƯỚC — ca này do AUDIT 2026-08-24 bắt được, và nó là ca ÂM quan trọng nhất của cổng:
// ngưỡng tuyệt đối 0,84 hiệu chỉnh trên kho 278k vector, nhưng đo trên kho nhỏ dựng từ nội dung
// THẬT thì topDist gần như luôn vượt ngưỡng (N=3 → 0,9925 · N=20 → 0,9681 · N=60 → 0,9215 ·
// N=150 → 0,9162). Thiếu sàn thì MÁY VỪA CÀI XONG sẽ câm với mọi câu hỏi — đo được: kho 3 tin trả
// 0 kết quả trong khi FTS tìm ra 2 hit và đáp án nằm ngay trong kho.
test("cổng không-biết: kho MỎNG thì KHÔNG BAO GIỜ chặn, dù khoảng cách xa tới đâu", () => {
  const FAR = 0.99; // xa hơn mọi ngưỡng
  assert.equal(shouldAbstain(FAR, 0.01, true, 3), false, "kho 3 vector: chặn là giết recall của máy mới cài");
  assert.equal(shouldAbstain(FAR, 0.01, true, 150), false, "kho 150 vector vẫn dưới sàn — vùng này đo được là topDist luôn ~0,92");
  assert.equal(shouldAbstain(FAR, 0.01, true, 9_999), false, "ngay dưới sàn ⇒ vẫn không chặn");
  // Kho đủ dày thì cổng phải làm việc, nếu không thì cả tính năng thành đồ trang trí.
  assert.equal(shouldAbstain(FAR, 0.01, true, 10_000), true, "đủ sàn ⇒ chặn được");
  assert.equal(shouldAbstain(0.7, 0.01, true, 300_000), false, "kho dày nhưng hit GẦN ⇒ không chặn");
  // Không truyền kích thước = người gọi chưa đo ⇒ giữ hành vi cũ (chỉ xét khoảng cách).
  assert.equal(shouldAbstain(FAR, 0.01, true), true, "thiếu số đo kích thước ⇒ tầng khoảng cách tự quyết");
});

// Fail-open (điều 9): không có chỉ mục vector ⇒ không có khoảng cách để phán ⇒ TUYỆT ĐỐI không
// được chặn. Bật cổng trên DB không vector mà mất kết quả là biến fail-open thành fail-closed.
test("cổng không-biết: thiếu vector ⇒ không bao giờ chặn (fail-open)", async (t) => {
  const p = seed(t, [{ role: "user", content: "một tin có chữ needle" }]);
  const r = await recallChecked("needle", { dbPath: p, all: true, abstain: true });
  assert.equal(r.hits.length, 1, "không đo được thì phải TRẢ kết quả");
  assert.ok(!r.abstained, "không có số đo ⇒ không được đánh dấu abstained");
});

// Trộn cosine (rerank rẻ, plan 17 §3.1 đường ③) — MẶC ĐỊNH BẬT vì nó thắng net (MRR 0,258 →
// 0,282 ở 119 ms). Hai bất biến phải khoá: mặc định đúng chiều, và thiếu vector thì KHÔNG được
// mất kết quả — không có vector là ca thường ngày (lớp `tool_use` không có vector nào cả).
test("trộn cosine: MẶC ĐỊNH BẬT, tắt được qua env/opts", () => {
  const prev = process.env.ZEMORY_VECMIX;
  try {
    delete process.env.ZEMORY_VECMIX;
    assert.equal(vecMixEnabled(), true, "không khai gì ⇒ phải BẬT");
    process.env.ZEMORY_VECMIX = "0";
    assert.equal(vecMixEnabled(), false, "ZEMORY_VECMIX=0 tắt được");
    assert.equal(vecMixEnabled(true), true, "tham số mỗi lời gọi thắng env");
  } finally {
    if (prev === undefined) delete process.env.ZEMORY_VECMIX;
    else process.env.ZEMORY_VECMIX = prev;
  }
});

test("trộn cosine: thiếu vector ⇒ giữ nguyên thứ tự, không mất kết quả", (t) => {
  const p = seed(t, [
    { role: "user", content: "needle một" },
    { role: "assistant", content: "needle hai" },
    { role: "user", content: "needle ba" },
  ]);
  const on = search("needle", { dbPath: p, all: true, perSession: 10, vecMix: true });
  const off = search("needle", { dbPath: p, all: true, perSession: 10, vecMix: false });
  assert.equal(on.length, 3, "không có vector ⇒ vẫn trả đủ");
  assert.deepEqual(on.map((h) => h.id), off.map((h) => h.id), "không đo được thì KHÔNG được đổi thứ tự");
});

test("gộp near-dup: tôn trọng limit và tắt được qua opts", (t) => {
  const p = seed(t, Array.from({ length: 8 }, (_, i) => ({ role: "user", content: `needle số ${i}` })));
  assert.equal(search("needle", { dbPath: p, all: true, perSession: 10, limit: 3 }).length, 3, "gộp không được vượt limit");
  assert.equal(
    search("needle", { dbPath: p, all: true, perSession: 10, limit: 3, collapse: false }).length,
    3,
    "đường không gộp cũng đúng limit",
  );
});
