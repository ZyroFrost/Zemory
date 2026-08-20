<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 19: Đổi embedder Gemma-768 → BGE-M3 int8-1024 — qua KHO SONG SONG

> Chốt 2026-08-19 (user quyết sau ma trận đo 15–19/08: 6 embedder · 12 lane · cùng 68 nhãn ·
> bootstrap 2.000 lượt). Ràng buộc user đặt: **kho mới chạy SONG SONG, kho đang xài KHÔNG đụng**
> cho tới khi bench thắng và user ký tráo. Khung kỷ luật: HP điều 15 (chất lượng > dung lượng,
> mọi bước qua phép thử) · điều 12 (gate trước khi đổi mặc định) · điều 3 (chỉ mục là lớp dẫn
> xuất — vứt/dựng lại được) · điều 9 (fail-open) · điều 16 (đồng bộ chở trọn RAG).

## 0. Căn cứ — vì sao đổi, vì sao là BGE-M3, vì sao int8

- **Gemma-768 thua rõ có cơ sở thống kê** — so sánh DUY NHẤT trong cả ma trận mà KTC 95% không
  chứa 0: Δ MRR −0,086 [−0,168 … −0,005] so với bge-fp32 (bootstrap 2.000 lượt, PRNG tất định).
- **BGE-M3 (BAAI, MIT)** thắng CẢ HAI VAI trên kho này: retriever (pool proxy) MRR 0,326 → 0,411
  fp32 / 0,385 int8; @40 pool 85% → 93%; rerank-trộn MRR 0,303 → 0,378/0,364. Tokenizer đọc
  tiếng Việt nguyên chữ có dấu (rào đã giết mọi ứng viên trước).
- **int8, không fp32**: hiệu int8-vs-fp32 nằm TRONG SAI SỐ [−0,060 … +0,007] mà tốc độ gấp đôi
  (637 vs 1.388 ms/tin) ⇒ ~44 giờ máy thay vì ~100.
- **Đã loại có số đo, đừng mở lại**: Qwen3-Embedding (thua cả Gemma) · Qwen3-Reranker (29 s/truy
  vấn) · gte (nhanh nhất — 324 ms — nhưng chất lượng chỉ nhỉnh Gemma) · arctic (nhì, thua bge) ·
  **lai hai model** (mọi cặp trong sai số — gấp đôi chỉ mục đổi lấy nhiễu) · ColBERT index đợt
  này (dense-mix mua được ~hết giá trị với 1/300 đĩa). Số liệu: `05_TODO §ma trận 15–19/08`.
- ⚠ **Trần phép đo**: corpus 68 nhãn chỉ phân biệt được Δ≥~0,05 MRR. Mọi quyết định trong plan
  này đều dựa trên khoảng cách LỚN HƠN trần đó; lựa chọn sát nhau hơn cần mở rộng corpus trước.

## 1. Kiến trúc song song — MỘT code, HAI kho

`vec_config` (model-profile · dims · dtype) nằm TRONG từng file DB (stored-config-authoritative,
plan 05 §5) ⇒ một binary phục vụ cả hai kho, kho nào hành xử theo cấu hình kho nấy:

```
data/global_memory.db          ← KHO THẬT (gemma-768) — daemon 4444, hook, sync: Y NGUYÊN
data/global_memory.bgem3.db    ← KHO SONG SONG (bge-m3-v1 · 1024 · int8) — file "chết",
                                  chỉ thức khi trỏ GLOBAL_MEMORY_DB; KHÔNG hook · KHÔNG
                                  scheduler · KHÔNG daemon ghi; kẻ ghi DUY NHẤT = job re-embed
```

Kỷ luật thí nghiệm song song (chống loạn):
1. mỗi kho tự khai mình là ai (`vec_config` — `memory info` in ra);
2. đúng MỘT kẻ ghi mỗi kho (daemon ↔ kho thật · job embed ↔ kho song song);
3. mọi bảng số in kèm ĐƯỜNG KHO đã đo;
4. có ngày hết hạn: bench + user ký ⇒ tráo hoặc xoá — kết cục nào repo cũng về MỘT kho.

## 2. Bước ① — CODE: dạy lớp embed profile `bge-m3-v1` (việc build, NHỎ, cộng thêm)

> ✅ **ĐÃ LÀM 2026-08-19.** Thực thi đúng thiết kế dưới, **cộng một phát hiện làm đổi thiết kế**:
> profile phải mang thêm cờ **`sequential`** — đo được gọi-theo-lô vừa CHẬM HƠN (bge 5,6× ·
> gemma 2,3×) vừa DỊCH vector (cos 0,982 · gemma 0,962). Chi tiết + hệ quả cho kho đang chạy:
> `05_TODO` mục 🔴 GỌI THEO LÔ. Nghiệm thu: vector production khớp **cos 1,000000** với phép đo.

- `embed.ts`: nhánh theo `vec_config.profile` — profile mới `bge-m3-v1`:
  · model `onnx-community/bge-m3-ONNX` · dtype `int8` · dims **1024** · pooling **CLS** +
  normalize · **KHÔNG prompt prefix** (khác hẳn gemma vốn cần `task:…|query:` / `title:…|text:`
  — gửi prompt gemma vào bge là sai nghĩa lặng) · **encode TUẦN TỰ** (xem ghi chú trên).
  · Đường tải/cache model dùng chung `data/models` (plan 05 §2 — một lớp inference, một cache).
- Chunking GIỮ NGUYÊN (6000/500 — bge nhận 8192 token, cap hiện tại vẫn hợp lệ); `vec_map`,
  `vec_chunks`, mọi cấu trúc lưu GIỮ NGUYÊN — chỉ dims đổi khi `dropVectorIndex` dựng lại.
- **Gate của bước này** (test, đột biến chứng minh đỏ được):
  · kho gemma mở bằng binary mới vẫn embed/query bằng gemma (song song là đây);
  · kho đóng dấu `bge-m3-v1` embed ra vector 1024 chuẩn hoá, query KHÔNG prefix;
  · `settings/env` không rò profile giữa hai kho (đọc từ vec_config, không từ env).
- Việc con của scheduler/`runStep` giữ `PRIORITY_BELOW_NORMAL` — job 44 giờ không giành CPU.

## 3. Bước ② — DỰNG KHO SONG SONG + RE-EMBED (~44 giờ nền)

1. Chụp kho thật bằng `db.backup()` (nhất quán, kho thật không khoá) → `global_memory.bgem3.db`.
2. Trên BẢN SAO: `dropVectorIndex` → đóng dấu `vec_config = {dims:1024, profile:"bge-m3-v1",
   dtype:"int8"}` → `GLOBAL_MEMORY_DB=<bản sao> memory embed --all`.
3. **Phóng qua `.vbs`** (`WshShell.Run(cmd,0,False)`) — job mồ côi, sống qua phiên agent (bài
   học hai job chết theo console 10/08). Output chuyển hướng ra file log.
4. Tiến độ đo bằng SQL trên bản sao (`vec_chunks` đếm), KHÔNG tin log (bài học 11/08). Ước
   ~44 giờ (637 ms/tin × ~245k tin + cửa sổ phụ) — con số thật lấy sau 1 giờ đầu rồi ngoại suy.
5. Phạm vi embed = ĐÚNG phạm vi hiện hành (config `ZEMORY_EMBED_TOOLS` hiện tại) — đổi model,
   KHÔNG đổi phạm vi trong cùng một phép thử (một biến mỗi lần).
6. Kho thật tiếp tục nhận tin trong 44 giờ ⇒ bản sao sẽ THIẾU vài ngày tin — chấp nhận cho
   bench (68 nhãn đều là tin cũ); phần thiếu được bù SAU TRÁO (bước ⑤).

## 4. Bước ③ — CỔNG NGHIỆM THU (điều 12) + giai đoạn song song

- `GLOBAL_MEMORY_DB=<bản sao> memory bench --recall` vs cùng lệnh trên kho thật — 68 nhãn +
  18 ca âm, CẢ HAI thước, bảng THEO LỚP. Chạy lúc máy rảnh, scheduler tắt (bài học đỏ giả).
- **Cổng ĐẠT khi**: không LỚP nào tụt ở cả hai thước · tổng MRR/@10 tăng cùng hướng ma trận ·
  ca âm không tệ đi (số kết quả rác/điểm đầu không tăng đáng kể).
- User tự gõ so hai kho bao lâu tuỳ ý:
  `zemory memory search "<q>"` (kho thật) vs `GLOBAL_MEMORY_DB=… zemory memory search "<q>"`.
- Muốn nhìn bằng mắt: daemon thứ hai CHỈ-ĐỌC `ZEMORY_UI_PORT=4445` + `GLOBAL_MEMORY_DB=<bản
  sao>` (tắt capture/scheduler ở instance này — không hai-kẻ-ghi).

## 5. Bước ④ — TRÁO (CHỈ sau khi user ký) — tái dùng kịch bản đợt 768

Một script MỘT lần chạy (không để hook chen giữa lúc thay file; chốt "file còn bị giữ sau 30 s
⇒ DỪNG"): `git tag pre-bgem3-swap` → tắt daemon → kho thật đổi tên
`global_memory.768d-backup-<ngày>.db` *(án tử theo luật bản-lùi-có-hạn-dùng: xoá khi hệ mới qua
bench trên kho thật + backup ngày xoay đủ vòng, ~5 ngày)* → bản sao vào vị trí → `quick_check`
→ `memory scan` bù tin mới → `memory embed` bù (nay chạy bge theo vec_config) → daemon bật lại.
**Đường lùi = tráo file ngược** — stored-config làm code tự theo, không sửa code.

## 6. Bước ⑤ — ĐỒNG BỘ 2 MÁY (điều 16) — KẾ HOẠCH CÓ ĐIỀU KIỆN

- `vec_config` đổi ⇒ merge bundle **từ chối vector lệch config** (đúng thiết kế chống kho lai):
  sau tráo, máy khác merge kho chung sẽ nhận TIN nhưng KHÔNG nhận vector 1024 chừng nào kho nó
  còn gemma-768.
- Đường đi: sau tráo, xuất **FULL thế hệ 1024** lên Drive (compact kho chính); máy kia làm như
  "máy mới nhận bàn giao" — backup kho cũ của nó rồi nhận bản 1024 (điều 16: máy nhận không
  nhúng lại gì). Việc này cần USER điều phối (máy kia phải có mặt); chưa có máy thứ hai hoạt
  động thì bước này NGỦ, không chặn gì.

## 7. Phi-mục-tiêu (đợt này)

- KHÔNG dựng chỉ mục ColBERT/sparse (hồ sơ + điều kiện mở lại: `05_TODO`); KHÔNG lai hai model;
  KHÔNG đổi RRF/FTS/trigram/UI/chunking; KHÔNG đổi phạm vi embed; KHÔNG đụng `sessions/messages`
  (điều 3 — chỉ lớp dẫn xuất).
- KHÔNG xoá kho gemma/model gemma trước khi hệ mới qua đủ cổng — gemma weight vẫn cần cho kho
  cũ nếu lùi.

## 8. Thứ tự thi hành + trạng thái

| bước | việc | loại | trạng thái |
|---|---|---|---|
| ① | profile `bge-m3-v1` trong `embed.ts` + gate | build (phiên build) | CHƯA |
| ② | copy kho + re-embed nền ~44 h | chạy máy | chờ ① |
| ③ | bench A/B + user so tay | đo | chờ ② |
| ④ | tráo + bản lùi có án tử | thao tác một-lần | chờ user KÝ sau ③ |
| ⑤ | thế hệ 1024 lên Drive + máy kia | điều phối user | chờ ④, ngủ tới khi có máy kia |
