<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Token savings — vì sao KHÔNG có dashboard (đã bỏ ledger)

> Quyết định (2026-07-07): **KHÔNG làm dashboard "token tiết kiệm".** Ledger đã bị BỎ (đẩy `attic/`) vì đo như-không. Doc này giữ **lý do** + **điều kiện để có metric thật** nếu sau này cần.
> 🔄 **Supersede:** thay hướng "dashboard tái dùng ledger" (bàn 2026-07-06) — sau khi đối chiếu với session kia: ledger rỗng/fake, đã gỡ (xem `attic/savings-removed.md`).

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
- Capture = **"0 token phụ trội"** (hooks đọc file transcript, KHÔNG gọi model) → *free capture*, KHÔNG phải "measured bill reduction".
- **Panel "Global memory" (UI) hiện SỐ THẬT** (2026-07-07): tile `~N tokens captured` (≈chars/4 — đo brain giữ bao nhiêu context) + row `Capture cost: 0 extra tokens · free` + tooltip nói rõ KHÔNG có metric "saved" phịa. Nguồn: `dashboardBrain().tokensEst = SUM(len(content))/4`.
- Giá trị zemory = recall đúng lúc · index điều hướng (structure) · docs gọn → **định tính** (đỡ mò code, đỡ lặp), KHÔNG bán bằng con số token giả.
- (Tùy chọn sau) retrieval ratio per-recall: "kéo X / tổng Y token" — số thật nếu ghi rõ nhãn *retrieved*, KHÔNG phải *saved*.
## 4. Điều kiện để CÓ metric thật (nếu sau này muốn)
- Phải có **caller THẬT** ghi before/after đo được (vd compress sống lại + log thật), HOẶC đọc được **usage/cost thật** từ provider.
- TUYỆT ĐỐI không trưng số counterfactual như "đã tiết kiệm N token".
