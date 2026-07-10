<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Plan 05: RAG semantic — hybrid local trên global_memory.db

> Chốt 2026-06-25. Mục tiêu: thêm tầng **semantic (vector)** cho recall, hợp nhất với FTS sẵn có thành **hybrid RAG** — local, 1 SQLite, agentic on-demand. KHÔNG tạo DB/"não" thứ hai; RAG chỉ là **thêm một index** lên cùng store.

## 1. Quyết định đã chốt
- **Model embed:** EmbeddingGemma-300M (Google) — nhẹ (~300M, quant <200MB RAM), đa ngữ 100+ (tiếng Việt tốt), Matryoshka (cắt 768→256/128 để DB nhỏ + tìm nhanh).
- **Runtime:** Transformers.js (`@huggingface/transformers`, ONNX) — chạy thẳng trong Node/TS, KHÔNG Python/GPU; fallback fastembed-js nếu cần.
- **Vector store:** sqlite-vec (extension) trong CHÍNH `global_memory.db` — giữ "1 file, index là lăng kính dẫn xuất". better-sqlite3 `loadExtension`.
- **Fusion:** RRF (ĐÃ CÓ cho 2 luồng FTS) — chỉ thêm luồng vector. Hybrid = BM25 (chính xác từ khóa) + vector (ngữ nghĩa).
- **Slot:** vector là *engine nội bộ* của capability `search` hợp nhất, KHÔNG slot riêng (giữ 1 capability = 1 provider).

## 2. Bất biến
- Embed model nhỏ ≠ LLM → vẫn đúng luật "tầng lưu KHÔNG gọi LLM" (nó *đo nghĩa*, không *sinh chữ*).
- Local-only; vector là index dẫn xuất, dựng lại được từ content.
- FTS5 là baseline LUÔN CÓ; vector chỉ THÊM, không thay. Embed lỗi/thiếu → fallback FTS.
- Recall vẫn agentic on-demand, KHÔNG auto-inject.
- Vector chỉ bật mặc định SAU benchmark chứng minh net thắng FTS.
- Model tải/cache lúc runtime, KHÔNG commit weight vào repo (package sạch).

**Chống trùng khi nối vào A.I Center (thiết kế từ đầu — bắt buộc):**
- **1 embed service duy nhất.** `embed(text)→vector` là MỘT module dùng-chung (config model + dtype + cache-path), KHÔNG nhúng chết vào search. A.I Center bê nguyên module này làm provider embedding L2 — mọi thứ (session-search, knowledge-RAG, code-map sau) gọi CHUNG, không ai đẻ embedder thứ hai.
- **1 vector store generic.** Bảng sqlite-vec keyed theo `chunk_id` + `kind` (session | knowledge | doc | code) trong CHÍNH `global_memory.db`. Knowledge-RAG của A.I Center insert vào CÙNG bảng với `kind=knowledge` — KHÔNG tạo `rag.db` riêng.
- **Cache model 1 chỗ, chỉnh được.** Đường dẫn weight qua env/config (sau trỏ về model dir chung của A.I Center / `ai_library`) → tải 1 lần, dùng chung, không tải trùng.
- **1 inference brick.** Transformers.js là gạch inference duy nhất; A.I Center tái dùng, không thêm runtime thứ hai.
## 3. Kiến trúc (ghép vào cái đã có)

```text
content rows (messages + doc sections — ĐÃ CÓ)
        |  embed lúc ingest (incremental — đã có cơ chế)
        v
sqlite-vec table (id <-> vector)   <-- THÊM
query:
   BM25 (FTS5, có) ---+
   vector ANN --------+-- RRF (có) --> top-N --> agent gọi
   scope filter SQL --+
```

## 4. Phân kỳ
- **A. Embed pipeline — XONG 2026-06-29:** EmbeddingGemma ONNX chạy qua Transformers.js trong Node/TS; test xác nhận vector unit-normalized; lỗi model fail-open về `null`.
- **B. Vector store — XONG 2026-06-29:** `sqlite-vec` table `vec_chunks` nằm trong chính `global_memory.db`; `zemory brain embed` chạy incremental theo batch; CLI có progress theo batch để DB lớn không nhìn như treo.
- **C. Hybrid retrieve — XONG 2026-06-29:** vector stream đã vào RRF cùng FTS; `brain search` chạy hybrid khi enabled, vẫn giữ scope project/session và fallback FTS khi vector thiếu/lỗi.
- **D. Benchmark gate — PASS 2026-06-29:** `brain bench` và test suite xác nhận hybrid recall@3 >= FTS trên paraphrase corpus; benchmark local mới nhất: hybrid 100%, FTS 0% trên corpus gate.
- **D2. Full corpus backfill — XONG 2026-06-30:** `zemory brain embed --all` đã chạy xong trên corpus lịch sử của `global_memory.db`; mốc nghiệm thu xác nhận `vec_chunks` khớp `messages` 1:1. Backfill writer đã chống duplicate row và batch theo nhóm độ dài để chạy thực tế ổn hơn trên transcript dài. Vì brain ingest transcript sống, message mới sau mốc này xử lý bằng `zemory brain embed` incremental.
- **E. Rerank cross-encoder — XONG (opt-in) 2026-06-30:** `backend/src/brain/rerank.ts` chạy cross-encoder (mặc định `Xenova/bge-reranker-base` ONNX qua Transformers.js, **dùng chung weight cache + inference brick** với embedder — đúng plan §2) rescore top-40 ứng viên RRF rồi reorder; **fail-open** giữ nguyên thứ tự RRF khi model lỗi/thiếu. Mặc định **OFF (opt-in)** qua UI toggle / `ZEMORY_RERANK=1` / `brain search --rerank`, theo bất biến "chỉ bật mặc định sau khi thắng net". `brain bench --rerank` thêm lane đo riêng (hybrid+rerank); spot check brain thật xác nhận reorder top-K đúng chủ đề hơn hybrid thuần. Giá trị thật ở corpus lớn/nhiễu — trên corpus gate 8-doc hybrid đã chạm trần 100% nên rerank chưa tăng recall ở đó.
- **F. (TẦM NHÌN — sau core) Mở RAG sang DATA CHÍNH (ý tưởng user 2026-06-26):** hiện RAG chỉ trên *memory agent* (session transcript); sau này áp lên **toàn bộ data/knowledge chính**, không chỉ memory. **CHUNG 1 hệ thống RAG** — chung model embed + embed service + retriever + RRF. DB **có thể tách** (memory DB vs data-chính DB) nhưng **dùng chung 1 model**. Cách build để KHÔNG phá khi mở rộng: retriever **query nhiều store rồi fuse** + cột `kind` (session | knowledge | doc | code) → thêm store data-chính sau mà không viết lại core. (Quyết tách-hay-chung-DB theo quy mô / vòng đời / privacy — xem §5.)
## 5. Quyết định còn mở (chốt khi làm)
- **Đã chốt trong core 2026-06-29:**
- Vector store = `sqlite-vec` trong `global_memory.db`, không tạo DB thứ hai.
- Vector mặc định = 768d đầy đủ; Matryoshka 256/128 để sau nếu cần tối ưu dung lượng/tốc độ.
- Message transcript = chunk tự nhiên cho memory agent; nội dung dài được cap khi embed để tránh tool output quá khổ.
- Hybrid mặc định bật khi config/env cho phép; vector fail-open về FTS.

- **Đã chốt sau full backfill 2026-06-30:**
- Backfill toàn bộ corpus memory chạy thủ công có kiểm soát bằng `zemory brain embed --all`.
- `vec_chunks` là index dẫn xuất trong chính `global_memory.db`; nếu cần có thể dựng lại bằng cùng lệnh.
- Batch backfill nhóm message theo độ dài để giảm padding waste trên transcript dài.

- **Đã chốt 2026-06-30 (rerank — Giai đoạn E):**
- Rerank cross-encoder là **engine opt-in** trong slot `search` hợp nhất (giống vector), KHÔNG slot riêng — giữ 1 capability = 1 provider.
- Mặc định **OFF**; chỉ rescore top-N ứng viên (không quét corpus); fail-open về thứ tự RRF.
- Dùng chung model cache + Transformers.js với embedder; model swap được qua `ZEMORY_RERANK_MODEL`.

- **Còn mở khi mở rộng RAG:**
- Chunk doc dài / knowledge / code thế nào.
- Khi nào BẬT rerank mặc định (cơ chế đã có ở §4.E) — chốt khi corpus đủ lớn/nhiễu để benchmark thắng net, hoặc khi mở sang data chính.
- Khi mở sang data chính: dùng chung `global_memory.db` với `kind`, hay store tách rồi retriever query nhiều store và fuse.
## 6. Gate nghiệm thu
- **PASS core 2026-06-29:**
- Hybrid recall KHÔNG tệ hơn FTS trên corpus gate (`brain bench`: hybrid recall@3 100%, FTS 0% ở lần nghiệm thu local).
- Embed lỗi → fallback FTS, recall không vỡ.
- Package không nhồi model nặng; weight tải/cache runtime.
- Backfill incremental không hỏng FTS/brain; `brain scan`, `brain search`, `brain info`, `doctor` vẫn xanh sau khi embed thêm batch thật.

- **PASS full backfill 2026-06-30:**
- `zemory brain embed --all` chạy xong trên corpus lịch sử; mốc nghiệm thu xác nhận `vec_chunks` khớp `messages` 1:1, không còn pending ở thời điểm đó.
- Backfill duplicate-row regression có test khóa lại; `npm run check` PASS sau thay đổi.
- Corpus memory là live ingest; message mới sau nghiệm thu được dọn bằng incremental `zemory brain embed`.

- **Chưa coi là SLA cuối:**
- Latency hybrid trên corpus thật cần theo dõi thêm sau khi vector index đã đầy đủ; gate local hiện chấp nhận được nhưng chưa phải SLA cuối.
