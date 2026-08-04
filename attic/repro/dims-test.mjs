// 256 chiều có phải nút thắt không — phép thử CÓ KIỂM SOÁT.
//
// Vì sao dựng kiểu này: nếu embed 768 chiều trên một tập NHỎ rồi so với 256 chiều trên kho
// 202k tin thì tập nhỏ ít mồi nhiễu hơn nên đương nhiên thắng — thắng vì ít đối thủ, không
// phải vì nhiều chiều. Số đó vô nghĩa.
//
// EmbeddingGemma huấn luyện kiểu Matryoshka: **256 chiều CHÍNH LÀ 256 số đầu của 768**. Nên
// embed MỘT lần ở 768 rồi so hai cách đọc trên CÙNG một dãy số ⇒ khác biệt duy nhất là số
// chiều, mọi thứ khác giữ nguyên tuyệt đối. Không cần hai lượt embed.
//
// Chạy trên BẢN SAO (D:/zemory-lab/lab.db), không đụng kho thật.
process.env.GLOBAL_MEMORY_DB = "D:/zemory-lab/lab.db";

const { openMemory } = await import("file:///d:/Zyro/Tool/Zemory/dist/memory/db.js");
const { embedDocBatch, embedQuery, sliceNormalize } = await import("file:///d:/Zyro/Tool/Zemory/dist/memory/embed.js");
const { loadCorpus } = await import("file:///d:/Zyro/Tool/Zemory/dist/evals/recallbench.js");

const DISTRACTORS = Number(process.argv[2] || 3000);
const PROFILE = "gemma-prompt-v1";

const db = openMemory("D:/zemory-lab/lab.db");
const corpus = loadCorpus();

// ① Tin ĐÍCH của 34 truy vấn có nhãn.
const gold = [];
for (const q of corpus) {
  const r = db.prepare("SELECT id, content FROM messages WHERE session_id = ? AND uuid = ?").get(q.session, q.uuid);
  if (r?.content) gold.push({ id: r.id, content: r.content, q: q.q });
}
const goldIds = new Set(gold.map((g) => g.id));

// ② MỒI NHIỄU: lấy ngẫu nhiên nhưng CÙNG PHÂN BỐ (tin thật, không phải tool call) — đúng loại
//    tin sẽ cạnh tranh trong kho thật.
const noise = db
  .prepare(
    `SELECT id, content FROM messages
      WHERE content IS NOT NULL AND length(content) BETWEEN 200 AND 4000 AND tool_name IS NULL
      ORDER BY id LIMIT ? OFFSET (SELECT COUNT(*)/4 FROM messages)`,
  )
  .all(DISTRACTORS + goldIds.size)
  .filter((r) => !goldIds.has(r.id))
  .slice(0, DISTRACTORS);

const docs = [...gold.map((g) => ({ id: g.id, content: g.content })), ...noise];
console.log(`tập thử: ${gold.length} tin đích + ${noise.length} mồi nhiễu = ${docs.length} tin`);
db.close();

// ③ Embed MỘT LẦN ở 768.
const t0 = Date.now();
const vecs = [];
const B = 32;
for (let i = 0; i < docs.length; i += B) {
  const batch = docs.slice(i, i + B);
  const out = await embedDocBatch(
    batch.map((d) => d.content.slice(0, 6000)),
    PROFILE,
  );
  for (let j = 0; j < batch.length; j++) if (out[j]) vecs.push({ id: batch[j].id, v: out[j] });
  if (i % 640 === 0) process.stdout.write(`\r  embed ${i}/${docs.length} · ${Math.round((Date.now() - t0) / 1000)}s   `);
}
console.log(`\n  embed xong ${vecs.length} tin · ${Math.round((Date.now() - t0) / 1000)}s · ${vecs[0].v.length} chiều`);

const cos = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// ④ Với mỗi số chiều: cắt + chuẩn hoá lại (đúng như `sliceNormalize` của đường thật), rồi xếp hạng.
async function evalDims(dims) {
  const idx = vecs.map((r) => ({ id: r.id, v: sliceNormalize(r.v, dims) }));
  const ranks = [];
  for (const g of gold) {
    const qv = sliceNormalize(await embedQuery(g.q, PROFILE), dims);
    const scored = idx.map((r) => ({ id: r.id, s: cos(qv, r.v) })).sort((a, b) => b.s - a.s);
    ranks.push(scored.findIndex((r) => r.id === g.id) + 1); // 0 = không thấy
  }
  const at = (k) => ranks.filter((r) => r > 0 && r <= k).length;
  const mrr = ranks.reduce((s, r) => s + (r > 0 ? 1 / r : 0), 0) / ranks.length;
  return { dims, at1: at(1), at3: at(3), at10: at(10), at40: at(40), mrr, ranks };
}

const rows = [];
for (const d of [128, 256, 512, 768]) rows.push(await evalDims(d));

const N = gold.length;
const pct = (n) => `${Math.round((100 * n) / N)}%`;
console.log(`\nKẾT QUẢ — cùng ${docs.length} tin, cùng vector, KHÁC MỖI SỐ CHIỀU:`);
console.log(`  chiều   @1     @3     @10    @40    MRR`);
for (const r of rows) {
  console.log(
    `  ${String(r.dims).padStart(4)}   ${pct(r.at1).padStart(4)}  ${pct(r.at3).padStart(5)}  ${pct(r.at10).padStart(5)}  ${pct(r.at40).padStart(5)}  ${r.mrr.toFixed(3)}`,
  );
}
const a = rows.find((r) => r.dims === 256);
const b = rows.find((r) => r.dims === 768);
console.log(
  `\n⇒ 256 → 768: recall@10 ${pct(a.at10)} → ${pct(b.at10)} · MRR ${a.mrr.toFixed(3)} → ${b.mrr.toFixed(3)}` +
    `  (${b.at10 > a.at10 ? "CẮT CHIỀU LÀ NÚT THẮT — dựng lại 768 có lý" : "cắt chiều KHÔNG phải nút thắt — đừng dựng lại, tốn công vô ích"})`,
);
