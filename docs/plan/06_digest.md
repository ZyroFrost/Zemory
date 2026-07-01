<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Plan 06: Session digest — lớp tóm tắt dẫn xuất cho recall rẻ token

> Chốt 2026-07-02 (grill với owner). Thêm lớp **digest cấp phiên**: bản tóm tắt NGẮN, ĐÃ LỌC của mỗi session để recall đọc trước (ít token), chỉ đào xuống `messages` thật khi cần. KHÔNG tạo nguồn thứ hai — digest là **lăng kính DẪN XUẤT**, rebuild được, luôn trỏ về message gốc bằng anchor.

## 1. Mục tiêu / vấn đề
- Recall hiện đọc snippet `messages` qua FTS/vector — tốt cho "tìm câu", nhưng để nắm "phiên X đã làm gì" phải đọc nhiều tin lẻ → tốn token.
- Digest = "lớp 1 đã lọc": đọc rẻ, nắm nhanh cả phiên; deep (messages) chỉ khi cần. Tinh thần giống memory của bigtech (ChatGPT/Claude) NHƯNG có kỷ luật chống bịa/lộn phiên.
- Là bản cụ thể hoá mục "memory promotion" (Phase 2) dưới dạng lăng kính dẫn xuất, không phải promote lên curated.

## 2. Bất biến (chống lặp lỗi cũ)
1. **Dẫn xuất, KHÔNG phải nguồn.** Rules/specs curated + `messages` gốc luôn thắng. Xoá/dựng lại bất cứ lúc nào; không bao giờ ghi đè hay "thay lời" phiên thật.
2. **1 digest ↔ đúng 1 `session_id`.** Bộ sinh chỉ đọc `messages WHERE session_id = X` → cấu trúc chặn trộn phiên. Digest mang luôn `host` + `project_root` (provenance) → luôn biết phiên nào / máy nào.
3. **Mỗi mục digest kèm ANCHOR (message id)** → drill xuống tin thật verbatim để kiểm.
4. **Tầng lưu KHÔNG gọi LLM** (giữ luật + không tốn quota). Nền extractive không sinh chữ nên không cần model "đủ thông minh".
5. **Không phụ thuộc "biết lúc phiên kết thúc".** Regen theo nhịp `brain scan`, guard bằng content-hash — phiên mọc thêm tin thì digest tự cập nhật, không cần ai bấm/nhắc.

## 3. Nội dung một digest
- `tasks[]` — DANH SÁCH việc đã làm (nhiều, không gò 1), mỗi việc kèm anchor. Trích từ mỗi yêu cầu user + mỗi nhánh chốt.
- `paths_touched[]` — tập folder/repo phiên THỰC đụng (từ cwd + đường dẫn file trong tool calls), tách khỏi `project_root` (xử ca "phiên này trỏ folder khác").
- `decisions[]` — dòng có dấu hiệu chốt.
- `errors[]` — tool lỗi / exit ≠ 0.
- `outcome` — vài tin cuối phiên.
- `meta` — source, host, project_root, #msg, khoảng thời gian.
- `source_sig` — hash (message count + last id/timestamp) để phát hiện lệch → regen đúng phiên đó.
- `kind` — `extractive` | `agent`.

## 4. Sinh digest
### A. Extractive — nền BẮT BUỘC, không LLM (build v1)
- Regen trong luồng `brain scan`/ingest cho mỗi session có tin mới (guard hash: tin không đổi → bỏ qua). + `zemory brain digest --all` backfill phiên cũ (incremental, idempotent, resumable — như `brain embed`).
- Chọn câu "đắt" CÓ THỂ dùng vector index sẵn có để rank (embed-assisted selection) — vector *chọn*, KHÔNG *sinh*. Fail-open: thiếu vector thì rank bằng heuristic.
- Deterministic, ~0 token, không bịa, không lộn phiên.
### B. Agent-authored — PHỦ lên, tuỳ chọn, LƯỜI (tầm nhìn, không bắt buộc v1)
- Khi recall chạm 1 phiên cần bản mượt hơn: **agent hiện tại** đọc transcript viết đè (`kind=agent`, có anchor). Không có B thì vẫn còn A đầy đủ.
- **Bỏ B1** ("agent tự viết lúc kết thúc") vì không ai biết trước phiên đóng / owner có thể quên.
- **KHÔNG** để zemory tự gọi LLM API (giữ luật "không proxy model API", tránh tốn quota — đúng lý do compression bị bỏ).

## 5. Lưu trữ
- Bảng dẫn xuất `session_digest` (`session_id` PK; `tasks`/`paths_touched`/`decisions`/`errors` JSON; `outcome`; `meta`; `source_sig`; `kind`; `updated_at`). Migration versioned (v5). Rebuild được như `vec_chunks`.
- FTS riêng cho text digest (word + trigram, Vietnamese) — lane search cấp phiên.

## 6. Recall (chốt R3)
- `brain search`: thêm **lane digest** — trả cả hit CẤP PHIÊN (đọc digest gọn) song song hit tin lẻ; theo anchor `show` xuống messages.
- `brain digest <session_id>`: mở full digest một phiên.
- Progressive disclosure: digest (mỏng) → anchor → `messages` (đầy). Đọc lớp mỏng trước, đào sâu khi cần.

## 7. Gate nghiệm thu
- Backfill toàn corpus; mỗi digest trỏ đúng `session_id`; anchors mở được tin thật.
- Regen idempotent (scan lại: tin không đổi → digest không đổi; tin mọc → cập nhật).
- Recall trả digest đúng phiên, KHÔNG lẫn; token đọc digest ≪ đọc full session.
- Fail-open: embed/model lỗi → extractive vẫn chạy (chỉ mất phần rank); recall vẫn FTS.
