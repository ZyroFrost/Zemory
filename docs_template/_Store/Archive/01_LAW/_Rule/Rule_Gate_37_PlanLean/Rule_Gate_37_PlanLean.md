---
id: Rule_37
aka: 02-37
name: plan-lean
version: 3
kind: content
---
# Rule_Gate_37_PlanLean Plan phải gọn

- Phạm vi: mọi file trong `docs/plan`. Spec được tra theo vùng và đọc trọn mỗi lần sửa, nên phải đủ gọn để đọc trọn.
- Plan chỉ giữ hướng đã chốt hiện tại và các điểm còn mở. Lịch sử (làm ngày nào, trước đây là gì) ghi ở `06_CHANGES`.
- Đổi hướng ⇒ sửa tại chỗ thành hướng mới; lý do ghi ở `06_CHANGES`.
- Plan là văn bản viết tay để bàn và chốt thiết kế. Không máy sinh nào ghi vào `docs/plan`, kể cả một khối trong file: mục lục · catalog · bảng tra do build sinh ⇒ ghi ra file cạnh nguồn sinh ra nó; plan chỉ trỏ link.
- Sơ đồ cây thư mục · bảng cấu trúc · khối mũi tên kiến trúc · `mermaid` do agent hoặc người viết thẳng khi bàn thiết kế là phần chính của plan: giữ, vẽ tay, không cần script. Luật này chỉ cấm đầu ra của script build nằm trong plan; không bao giờ là lý do xoá sơ đồ hay né không vẽ.
- Mỗi mục `05_TODO` gắn `→ plan/NN §mục` để dẫn đường.
- Trần: một spec ~1.000 dòng · cả `docs/plan` ~5.000 dòng (khoá `thresholds.plan_spec_lines` / `plan_total_lines`).
- Phép kiểm: `zemory validate` báo LỖI khi gặp dấu khối máy sinh (`<!-- AUTOGEN` · `AUTOGEN:` · tiêu đề "SINH TỰ ĐỘNG" · "MÁY SINH … ĐỪNG SỬA TAY"); cảnh báo khi một spec hoặc cả `docs/plan` vượt trần.

## Ví dụ

- Tình huống: spec của luồng nạp dữ liệu đã đổi hướng ba lần.
- ✗ Sai: giữ cả ba hướng cũ kèm "ngày nào làm gì", dán thêm bảng catalog do script build sinh — file vượt nghìn dòng, phiên sau đọc không xuể.
- ✓ Đúng: sửa tại chỗ thành hướng hiện tại + điểm còn mở, lý do đổi ghi ở changelog; bảng máy sinh ghi ra file cạnh script, plan chỉ trỏ link; sơ đồ vẽ tay thì giữ.
