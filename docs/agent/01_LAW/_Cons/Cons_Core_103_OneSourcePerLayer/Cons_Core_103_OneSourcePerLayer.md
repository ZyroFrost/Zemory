---
id: Cons_103
aka: 01-3
name: one-source-per-layer
version: 1
kind: content
---
# Cons_Core_103_OneSourcePerLayer Mỗi lớp dữ liệu có ĐÚNG MỘT nguồn; mọi index là lăng kính DẪN XUẤT.

**Mỗi lớp dữ liệu có ĐÚNG MỘT nguồn; mọi index là lăng kính DẪN XUẤT.** Curated docs (rules/plan/TODO/changelog): **FILE `.md` là NGUỒN** — agent viết/sửa tự do BÁM CHUẨN harness; DB doc/section/changelog chỉ là **INDEX dẫn xuất** cho search, dựng lại được từ file (**file wins**). Episodic: transcript gốc của host là nguồn, `sessions/messages` + FTS + vector + digest là dẫn xuất — **vứt/dựng lại được bất cứ lúc nào**. Hệ quả bất di bất dịch: **tối ưu/can thiệp CHỈ vào lớp dẫn xuất — KHÔNG BAO GIỜ xóa/sửa `sessions`/`messages` gốc**; không tạo kho thứ hai, không auto-summary thành nguồn thứ hai. *(SỬA ĐỔI 2026-07-16, user quyết — bãi bỏ vế cũ "DB là nguồn curated docs, .md là mirror": zemory chưa đủ ổn định để làm nguồn NỘI DUNG docs; nó chỉ cố định CẤU TRÚC folder + RULE chung + BỘ HARNESS, agent viết docs bám theo chuẩn là được. Gốc: build plan §2.3 §5, plan 02 §0 — phần curated đã supersede; xem changelog.)*

- **Chốt máy:** `rule-gates ①` (ratchet chỗ DELETE/UPDATE messages/sessions)
