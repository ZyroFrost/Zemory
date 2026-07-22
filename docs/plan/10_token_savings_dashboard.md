<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Token savings dashboard — ĐÃ GỠ HẲN (schema v11)
> Lịch sử: ledger fake cũ → `attic/` (2026-07-07) → rebuild dashboard % per-feature (2026-07-08) → **GỠ HẲN 2026-07-11 (schema v11).**
> **Đã gỡ:** module `savings.ts`, bảng `recall_savings`, dialog "📊 Saved", endpoint `/savings`, mọi call `logRecall`/`logDigestRecall` (cli/mcp/ui).
> **Lý do:** con số "% token tiết kiệm" là **counterfactual** — baseline = nạp CẢ session nguồn, thứ không ai làm → luôn dính ~99.99%, KHÔNG phản ánh tiết kiệm thật. Feature đo được thật duy nhất (`compress`) đã out-of-scope từ trước. Recall/Digest (feature THẬT, có ích) **giữ nguyên** — chỉ bỏ lớp đo ngụy tạo bám lên trên.
> **Giữ lại (trung thực):** tile `~N token đã thu` (≈ chars/4) + `Capture cost: 0 · free` trong panel Global memory. §2 giữ lại phân tích "vì sao đo token tiết kiệm là KHÓ".
## 1. Đã gỡ ledger + dashboard — bằng chứng
**GỠ HẲN (2026-07-11, schema v11).** Bằng chứng vì sao nó vô nghĩa:
- `recall` = **counterfactual**: baseline = tổng token của TẤT CẢ session mà hit chạm tới; actual = mấy dòng snippet trả về → "% saved" luôn ~99.99% (test thật: 1,953,137 → 241 token). Không ai nạp cả chục session đầy đủ thay cho 1 search → số này là **NGỤY TẠO**.
- `compress` — feature DUY NHẤT có before/after đo được thật — đã out-of-scope (`attic/src/compress/`).
- zemory **không đọc được** usage/cost từ provider → không có số thật để trưng.
→ Dead surface. Đã gỡ khỏi live (`savings.ts`, bảng `recall_savings`, `/savings`, dialog, mọi caller). **Giá trị lõi = Global memory (recall) + docs harness** — không cần meter ngụy tạo bám lên.
## 2. Vì sao đo token tiết kiệm là KHÓ (giữ lại phân tích)
| Tầng | Ví dụ | Đo được |
|---|---|---|
| **Đo thật** (before/after thật) | compress/digest | ✅ — nhưng compress đã out-of-scope |
| **Ước tính** (counterfactual, giả định) | recall, structure-index, on-demand | ⚠ số + giả định = dễ ngụy tạo |
| **Không quy được** | tổng token end-to-end 1 phiên | ❌ quá nhiều biến |
→ Phần lớn "savings" là counterfactual → một dashboard sẽ **trưng số giả**. KHÔNG làm.

## 3. Framing TRUNG THỰC thay thế
- Capture = **"0 token phụ trội"** (hooks đọc transcript, KHÔNG gọi model) → *free capture*, KHÔNG phải "measured bill reduction".
- **Panel "Global memory"**: tile `~N tokens captured` (≈chars/4) + row `Capture cost: 0 extra tokens · free`.
- **ĐÃ BUILD — dialog "📊 Saved" (per-FEATURE, cập nhật 2026-07-08):** mỗi feature = 1 **CỘT**, ô = **% token tiết kiệm** = avoided/baseline (hover xem token thô), cột cuối = **TỔNG %**. Feature đo được: **Recall** (memory_search — trả slice vs cả session) + **Digest** (lane digest — đọc digest vs full session). Bảng dưới liệt kê **ĐỦ 11 tính năng**: đo được → có %; scoped(chất lượng)/index/harness/capture/sync/UI/rerank = **n/a** (counterfactual/enabler — KHÔNG ngụy tạo). Log **per-message** vào `recall_savings(feature)` (schema v9), forward-only. `/savings` = `savingsByDay()` (trả `baseByFeature`+`baseline` để UI tính %); module `backend/src/memory/savings.ts`.
- Nhãn khắp nơi: **ước tính hiệu suất** (cận trên), KHÔNG phải "saved $" / hoá đơn thật.
## 4. Điều kiện để CÓ metric thật (nếu sau này muốn)
- Phải có **caller THẬT** ghi before/after đo được (vd compress sống lại + log thật), HOẶC đọc được **usage/cost thật** từ provider.
- TUYỆT ĐỐI không trưng số counterfactual như "đã tiết kiệm N token".
