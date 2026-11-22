---
id: Cons_108
aka: 01-8
name: recall-on-demand-progressive-disclosure
version: 1
kind: content
---
# Cons_Core_108_RecallOnDemandProgressiveDisclosure Recall on-demand + progressive disclosure — KHÔNG auto-inject.

**Recall on-demand + progressive disclosure — KHÔNG auto-inject.** Agent tự gọi khi cần; search trả snippet/ID trước, mở message/section/digest cụ thể khi cần. Không nhét broad memory vào mỗi prompt. *(gốc: build plan §2.6 §5, plan 04 §4, plan 06 §6)*

- **Chốt máy:** `realtime-capture.test` (SessionStart chỉ nói khi `source=compact`)
