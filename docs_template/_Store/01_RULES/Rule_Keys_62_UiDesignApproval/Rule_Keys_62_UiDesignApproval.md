---
id: Rule_62
aka: 02-62
name: ui-design-approval
version: 8
kind: judgment
applies: [App]
---
# Rule_Keys_62_UiDesignApproval Quyết định thiết kế giao diện phải trình duyệt trước

- Quyết định thiết kế giao diện gồm: layout · kích thước · khung · màu · theme · hình dạng component · thêm/bớt phần tử · đổi style · cách sắp xếp.
- Trước khi làm: nêu đề xuất cụ thể (hoặc bản nháp/ảnh), chờ chấp thuận rồi mới làm.
- Sửa lỗi kỹ thuật (lệch · tràn · hỏng) ⇒ cứ sửa, không cần trình.
- Hướng được giao còn hở chi tiết thiết kế ⇒ trình phương án cho phần hở.
- Convention thiết kế cụ thể: slot `Root_136_Principles` (quy ước) · `Frontend_137_UiDictionary` (từ điển UI) và `.claude/skills/dev-app-design/SKILL.md`.

## Ví dụ

- Tình huống: được giao thêm ô lọc theo tháng cho màn báo cáo doanh thu.
- ✗ Sai: tự chọn vị trí, kích thước, màu, dời luôn các nút khác cho cân rồi báo đã xong.
- ✓ Đúng: trình đề xuất cụ thể (vị trí, kiểu control, ảnh nháp) và chờ duyệt; nếu chỉ là lỗi tràn chữ hay lệch hàng thì sửa luôn.
