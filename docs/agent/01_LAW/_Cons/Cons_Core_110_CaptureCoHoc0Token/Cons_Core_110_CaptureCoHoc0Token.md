---
id: Cons_110
aka: 01-10
name: capture-co-hoc-0-token
version: 1
kind: content
---
# Cons_Core_110_CaptureCoHoc0Token Capture cơ học, 0 token, không vượt quyền host.

**Capture cơ học, 0 token, không vượt quyền host.** Hook chỉ đọc transcript file incremental — không gọi model, không rewrite command, không bypass permission của host. App cơ học, agent phán đoán; quyết định curated do user/agent duyệt. *(gốc: build plan §2.7, plan 04 §7)*

- **Chốt máy:** `rule-gates ⑪` (đường ghi nhận không import model/nhúng, không gọi mạng)
