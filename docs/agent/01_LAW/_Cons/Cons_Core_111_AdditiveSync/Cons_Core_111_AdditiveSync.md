---
id: Cons_111
aka: 01-11
name: additive-sync
version: 1
kind: content
---
# Cons_Core_111_AdditiveSync Sync xuyên máy = ADDITIVE, provenance KHÔNG LẪN.

**Sync xuyên máy = ADDITIVE, provenance KHÔNG LẪN.** Merge chỉ thêm, không ghi đè; mỗi session giữ nguyên `host`/`origin`/`source` gốc — bộ chọn scope chỉ *lọc*, KHÔNG đổi/gộp nguồn, KHÔNG xóa (muốn xóa phải qua `forget` tường minh có dry-run + backup). DB sống không bao giờ đặt trong folder cloud-sync (WAL corrupt). *(gốc: plan 08 §1 §5, plan 02 §0, relocate design)*

- **Chốt máy:** `cloudguard.test` · bộ `sync-*`/`vector-ship`
