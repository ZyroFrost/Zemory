---
id: Rule_36
aka: 02-36
name: plan-spec-only
version: 3
kind: content
---
# Rule_Gate_36_PlanSpecOnly Plan chỉ chứa spec

- `docs/plan/` chỉ chứa spec.
- Không todo: việc ⇒ `05_TODO`, qua cửa vào `Rule_Gate_38_TodoDoor`.
- Không luật: bất biến hay luật riêng ⇒ hỏi trước; được chấp thuận thì ghi vào đúng file theo `Rule_Gate_38_TodoDoor`, plan chỉ dẫn chiếu.
- Đặt tên `NN_tên.md`; `00` = tổng quan (theo `03_STRUCTURE`).
- Phép kiểm: cổng `validate`.

## Ví dụ

- Tình huống: trong lúc viết spec cho tính năng xuất báo cáo, phát sinh ba việc cần làm.
- ✗ Sai: thêm danh sách `[ ]` việc cần làm ở cuối file spec, kèm một "luật" mới tự đặt.
- ✓ Đúng: spec chỉ mô tả thiết kế; ba việc hỏi rồi ghi vào `05_TODO` có link `→ plan/NN §mục`; luật mới phải hỏi trước, được duyệt thì ghi vào file luật, plan chỉ dẫn chiếu.
