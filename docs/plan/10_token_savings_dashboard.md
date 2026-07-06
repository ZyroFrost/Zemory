<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory plan set` -->
# Dashboard đo token tiết kiệm — tổng hợp savings per cơ chế / feature

> Spec: panel UI hiển thị **token tiết kiệm nhờ zemory**, tổng hợp từ các cơ chế + quy theo feature.
> Trạng thái (2026-07-07): **Ý TƯỞNG**. Hạ tầng `ledger` ĐÃ CÓ (compress + recall) — chỉ mở rộng + đưa lên UI.

## 1. Bài toán & sự thật (đo chính xác là KHÓ)
- Đo token tiết kiệm **chính xác tuyệt đối là không thể** — phần lớn là **counterfactual** ("nếu KHÔNG có zemory thì tốn bao nhiêu" = giả định).
- Token luôn là **ước lượng** (`≈ chars/4`). Có **3 tầng độ tin**:

| Tầng | Ví dụ cơ chế | Đo được? |
|---|---|---|
| **Đo thật** (before/after đều thật) | compress/digest, archive changelog | ✅ số thật |
| **Ước tính** (baseline = giả định counterfactual, nêu rõ) | recall (vs đọc cả section), **structure-index** (vs grep cả repo), on-demand (vs nạp hết history) | ⚠ số + giả định |
| **Không quy được** | tổng end-to-end 1 phiên thật | ❌ quá nhiều biến |

- **Nguyên tắc dashboard:** mỗi số GẮN NHÃN *"đo"* vs *"ước tính (giả định X)"*. **KHÔNG phịa 1 con số giả-chính-xác** gộp tất cả.

## 2. Đã có sẵn (tái dùng, đừng viết lại — RULES §1)
- Bảng `ledger`: `baseline_tokens` (không zemory) vs `actual_tokens` (có zemory), theo `kind`. — `src/brain/ledger.ts`
- `logSavings(kind, baselineChars, actualChars, detail)` + `ledgerSummary()` (gom theo kind + total + % + 12 recent).
- CLI đã in bảng baseline/actual/saved. **Kind hiện có: `compress`, `recall`.**
- `compression_event` = audit per-decision.

## 3. Thiết kế
### 3.1 P1 — surface lên UI (nhanh, data đã có)
- Panel dashboard trong cockpit đọc `ledgerSummary()`: tổng `saved` + `%`, breakdown per kind, danh sách recent.
- Endpoint UI mới (vd `/ledger`) trả `ledgerSummary()` JSON.

### 3.2 P2 — instrument thêm per-feature (baseline TRUNG THỰC)
Mỗi cơ chế gọi `logSavings(kind, baseline, actual, detail)` với baseline nêu rõ giả định:
- `index` (structure routing): baseline ≈ chi phí grep/đọc toàn repo để dò; actual ≈ đọc thẳng 1 folder. → nhãn *ước tính*.
- `scoped` (loại lane recall): baseline = full candidate corpus; actual = sau loại lane. → *đo* (từ DB).
- `digest` (nén session): baseline = full transcript; actual = digest. → *đo thật*.
- Thêm nhãn/cột `feature` (hoặc dùng `kind`) để **quy savings theo từng feature đã thêm**.

### 3.3 Trình bày trung thực
- Mỗi dòng: `kind/feature · saved · % · [đo thật | ước tính: <giả định>] · #events`.
- **Tổng chia 2 khối**: "đo thật" và "ước tính" — KHÔNG cộng gộp thành 1 số mập mờ.
- Token luôn kèm chú *"ước lượng ≈ chars/4"*.

## 4. Không làm (ranh giới)
- KHÔNG cố đo tổng token end-to-end của 1 phiên (quá nhiều biến ngoài zemory).
- KHÔNG trình bày 1 con số "tiết kiệm N token" như thể chính xác tuyệt đối.

## 5. Việc (chuyển sang 02_TODO khi bắt tay)
- [ ] P1: endpoint `/ledger` + panel dashboard UI đọc `ledgerSummary()`.
- [ ] P2: instrument `logSavings` cho `index` / `scoped` / `digest` + nhãn `feature`.
- [ ] Trình bày tách khối "đo thật" vs "ước tính (giả định)".
