---
id: Rule_36
aka: 02-36
name: plan-spec-only
version: 2
kind: content
---
# Rule_Gate_36_PlanSpecOnly Plan chỉ chứa spec

- `docs/plan/` chỉ chứa spec.
- Không todo: việc ⇒ `05_TODO`, qua cửa vào `Rule_Gate_38_TodoDoor`.
- Không luật: bất biến hay luật riêng ⇒ hỏi trước; được chấp thuận thì ghi vào đúng file theo `Rule_Gate_38_TodoDoor`, plan chỉ dẫn chiếu.
- Đặt tên `NN_tên.md`; `00` = tổng quan (theo `03_STRUCTURE`).
- Phép kiểm: cổng `validate`.
