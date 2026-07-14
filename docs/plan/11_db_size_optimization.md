<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Giảm dung lượng DB ~50% — đề xuất CHỜ DUYỆT (trả lời "giảm cái gì mà nhiều vậy")
> **Trạng thái: HOÀN TẤT (2026-07-14) — xem docs/plan/12_vector_rebuild_256.md.** User đã duyệt (2026-07-12, không backup — DB là lớp dẫn xuất). Bước 2 (cắt 768d→256d tại chỗ) được thay bằng rebuild thẳng ở 256d trong plan 12, vì đằng nào cũng phải re-embed toàn bộ để đổi sang asymmetric Gemma prompts. Kết quả thật: DB 1141.4MB → 595.1MB (giải phóng 546.3MB, ~48%), 94384 vector, gate npm run check 82/82 + brain bench hybrid/rerank 100% (8/8), 0 mất dữ liệu.

## 1. Vì sao giảm được tới 50% — DB to KHÔNG phải vì dữ liệu, mà vì INDEX
Đo thật bằng `dbstat` trên `global_memory.db` 938MB (2026-07-12):

| Thành phần | MB | % | Bản chất |
|---|---|---|---|
| Index FTS (word + trigram + **2 bản COPY content**) | ~534 | 51% | index keyword — trong đó 246MB là 2 bản sao nguyên văn text |
| Vector 768d (`vec_chunks`, 115k vector) | 327 | 31% | index semantic |
| **Message text gốc** | **133** | **13%** | dữ liệu thật |
| Digest + section + khác | ~50 | 5% | dẫn xuất |

→ Text gốc chỉ chiếm 13%. **87% còn lại là index dẫn xuất** — nên giảm index là giảm được rất nhiều mà không mất dữ liệu. Đây là câu trả lời cho "giảm cái gì mà nhiều vậy".
## 1. Vì sao giảm được tới 50% — DB to KHÔNG phải vì dữ liệu, mà vì INDEX
Đo thật bằng `dbstat` trên `global_memory.db` 938MB (2026-07-12):

| Thành phần | MB | % | Bản chất |
|---|---|---|---|
| Index FTS (word + trigram + **2 bản COPY content**) | ~534 | 51% | index keyword — trong đó 246MB là 2 bản sao nguyên văn text |
| Vector 768d (`vec_chunks`, 115k vector) | 327 | 31% | index semantic |
| **Message text gốc** | **133** | **13%** | dữ liệu thật |
| Digest + section + khác | ~50 | 5% | dẫn xuất |

→ Text gốc chỉ chiếm 13%. **87% còn lại là index dẫn xuất** — nên giảm index là giảm được rất nhiều mà không mất dữ liệu. Đây là câu trả lời cho "giảm cái gì mà nhiều vậy".

## 2. Ba bước (theo thứ tự, có backup + bench gate)
1. **FTS external-content (−~246MB, 0% mất):** `messages_fts` + `messages_fts_tri` hiện tạo kiểu standalone nên FTS5 tự lưu MỘT BẢN COPY nguyên văn content (123MB × 2). Migration v12: tạo lại 2 bảng với `content='messages', content_rowid='id'` (FTS đọc thẳng bảng gốc) + rebuild + sửa trigger theo cú pháp external-content (`INSERT INTO fts(fts, rowid, …) VALUES('delete', …)`). Search y hệt, snippet() vẫn chạy.
2. **Vector 768d → 256d Matryoshka (−~218MB, mất ≈0):** EmbeddingGemma huấn luyện MRL — vector 768d CẮT 256d đầu + renormalize là dùng được, KHÔNG cần re-embed (vài phút thay vì ~28h). Làm: đọc từng vector → slice 256 → chuẩn hóa → ghi bảng vec0 mới 256d → swap. `vec_config.dims` cập nhật; query embed cũng slice 256.
3. **VACUUM** thu hồi trang trống (sau các bước trên + các lần DROP trước đó).

**Kỳ vọng: 938MB → ~450–500MB**; tốc độ tăng DB/ngày giảm ~nửa; KNN 256d còn NHANH hơn (ít byte đọc).

## 3. An toàn / kiểm chứng / rollback
- TRƯỚC khi mổ: `brain backup` (bản .db nguyên) — bắt buộc.
- SAU mỗi bước: `npm run check` + `zemory brain bench` (gate: hybrid recall@3 ≥ FTS; mốc hiện tại 100% 8/8) + spot-check search thật.
- Bench tụt → restore backup, dừng, báo user.
- Thứ KHÔNG làm (đã phân tích, ROI xấu): xóa message trùng ở bảng gốc — chỉ được ~100MB nhưng thủng transcript + message tự sống lại khi re-scan/merge (cần tombstone) + trái luật preserve-source.

## 4. Bối cảnh đã xong trước đề xuất này (2026-07-11/12)
- Embed pipeline đã tối ưu 3 nấc: skip tool-call (−32% khối lượng) · dedup nội dung trùng qua `vec_hash` copy vector (−21% phần còn lại, 0% mất chất lượng — test bit-for-bit) · batch 16. Backlog 42k đã hoàn tất: 115.047 vector, remaining 0, bench 100%.
- Drive sync xong: bundle `global_memory.SS01-IT-10.zemory.enc` 1.1GB đã xuất (2026-07-12 08:01), merge desktop +0.
- Còn đo dở: tốc độ embed hằng ngày thực tế (mẫu 5.813 msg mới) — session trước đang chạy nền, có thể bị ngắt khi đổi session → **session sau chạy `zemory brain embed --all` (vô hại, incremental) + bấm giờ để ra số phút/ngày thật.**
