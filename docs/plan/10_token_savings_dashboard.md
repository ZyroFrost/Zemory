<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Token savings — dashboard TRUNG THỰC per-feature (%)
> Lịch sử: ledger cũ (fake, caller rỗng, luôn in 0) đã BỎ → `attic/` (2026-07-07). **SAU ĐÓ đã build lại 1 dashboard TRUNG THỰC** (2026-07-08).
> **Hiện tại: dialog "📊 Saved" — bảng per-FEATURE, ô = % token tiết kiệm (avoided/baseline), cột cuối = TỔNG %.** Chỉ feature phát sinh event ĐO ĐƯỢC mới có cột (**Recall**, **Digest**); index/capture/scoped = **n/a** (counterfactual/quality/enabler — KHÔNG phịa). Doc này giữ lý do + thiết kế + điều kiện có metric thật.
## 1. Đã bỏ ledger — bằng chứng
- `logSavings()` **không có caller** → bảng `ledger` **luôn RỖNG** → `brain savings` luôn in 0.
- `compress` (before/after THẬT duy nhất) đã **out-of-scope** (`attic/src/compress/`).
- `recall` = **counterfactual** → "% saved" là số **PHỊA**.
- zemory **không đọc được** usage/cost từ provider → không có số thật để trưng.
→ Dead surface. Đã gỡ khỏi live (`db.ts`/`cli.ts`/`search.ts`/`ui`), giữ ở `attic/` (`attic/savings-removed.md`).

## 2. Vì sao đo token tiết kiệm là KHÓ (giữ lại phân tích)
| Tầng | Ví dụ | Đo được |
|---|---|---|
| **Đo thật** (before/after thật) | compress/digest | ✅ — nhưng compress đã out-of-scope |
| **Ước tính** (counterfactual, giả định) | recall, structure-index, on-demand | ⚠ số + giả định = dễ phịa |
| **Không quy được** | tổng token end-to-end 1 phiên | ❌ quá nhiều biến |
→ Phần lớn "savings" là counterfactual → một dashboard sẽ **trưng số giả**. KHÔNG làm.

## 3. Framing TRUNG THỰC thay thế
- Capture = **"0 token phụ trội"** (hooks đọc transcript, KHÔNG gọi model) → *free capture*, KHÔNG phải "measured bill reduction".
- **Panel "Global memory"**: tile `~N tokens captured` (≈chars/4) + row `Capture cost: 0 extra tokens · free`.
- **ĐÃ BUILD — dialog "📊 Saved" (per-FEATURE, cập nhật 2026-07-08):** mỗi feature = 1 **CỘT**, ô = **% token tiết kiệm** = avoided/baseline (hover xem token thô), cột cuối = **TỔNG %**. Feature đo được: **Recall** (brain_search — trả slice vs cả session) + **Digest** (lane digest — đọc digest vs full session). Bảng dưới liệt kê **ĐỦ 11 tính năng**: đo được → có %; scoped(chất lượng)/index/harness/capture/sync/UI/rerank = **n/a** (counterfactual/enabler — KHÔNG phịa). Log **per-message** vào `recall_savings(feature)` (schema v9), forward-only. `/savings` = `savingsByDay()` (trả `baseByFeature`+`baseline` để UI tính %); module `backend/src/brain/savings.ts`.
- Nhãn khắp nơi: **ước tính hiệu suất** (cận trên), KHÔNG phải "saved $" / hoá đơn thật.
## 4. Điều kiện để CÓ metric thật (nếu sau này muốn)
- Phải có **caller THẬT** ghi before/after đo được (vd compress sống lại + log thật), HOẶC đọc được **usage/cost thật** từ provider.
- TUYỆT ĐỐI không trưng số counterfactual như "đã tiết kiệm N token".
