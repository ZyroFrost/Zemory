---
id: Cons_109
aka: 01-9
name: fail-open
version: 1
kind: judgment
---
# Cons_Core_109_FailOpen Fail-open ở mọi lớp phụ.

**Fail-open ở mọi lớp phụ.** Vector/rerank/digest/model lỗi hay thiếu → recall RƠI VỀ FTS/heuristic, không bao giờ chết theo. FTS5 là baseline LUÔN CÓ; lớp semantic chỉ THÊM, không thay. *(gốc: plan 05 §2, plan 06 §7, plan 12)*

- **Chưa có chốt máy:** rải trong test từng lớp; review khi thêm lớp
