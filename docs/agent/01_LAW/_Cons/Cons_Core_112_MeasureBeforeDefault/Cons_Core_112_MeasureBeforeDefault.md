---
id: Cons_112
aka: 01-12
name: measure-before-default
version: 1
kind: judgment
---
# Cons_Core_112_MeasureBeforeDefault Đo trung thực + gate trước khi bật mặc định.

**Đo trung thực + gate trước khi bật mặc định.** TUYỆT ĐỐI không trưng số counterfactual/ảo ("tiết kiệm N token" khi không đo được). Mọi lớp mới (hybrid, rerank, dims, migration…) chỉ bật mặc định SAU khi qua gate: benchmark thắng net trên corpus có nhãn + test + migration an toàn + health check + fallback rõ. *(gốc: build plan §2.1, plan 04 §9, plan 05 §2 §6, plan 10, plan 12 §2)*

- **Chưa có chốt máy:** `surface-truth.test` (một phần); review số khi đổi mặc định
