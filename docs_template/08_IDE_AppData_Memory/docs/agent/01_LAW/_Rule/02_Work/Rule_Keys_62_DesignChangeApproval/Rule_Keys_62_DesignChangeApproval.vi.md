---
version: 15
lang: vi
---
# Rule_Keys_62_DesignChangeApproval — Changing the look of something others use: show it first

## Luật là gì
Đổi hình hài thứ người khác đang dùng thì trình và được duyệt trước khi dựng. Bố cục đã chốt không tự dời. Sửa lỗi kỹ thuật không
cần duyệt.

## Khi nào áp
- Đổi hình hài của: giao diện (layout · kích thước · khung · màu · theme · hình dạng component · thêm/bớt phần tử · style · thứ
  tự) · bố cục báo cáo hay dashboard, chọn biểu đồ, theme trình bày · mẫu giao đi.
- Một gợi ý thiết kế đến từ skill `type: design`.

## Phải làm gì
1. Trình đề xuất cụ thể, hoặc bản nháp / ảnh, rồi chờ duyệt.
2. Bố cục đã chốt không đổi: không tự dời vị trí hay thứ tự.
3. Không cần trình: sửa lỗi kỹ thuật (lệch · tràn · hỏng) · điền số theo mẫu có sẵn.
4. Hướng được giao còn hở chi tiết thiết kế ⇒ trình phương án cho phần hở. Gợi ý từ skill thiết kế thì trình, không tự áp.
5. Quy ước cụ thể: `Skill_Dev_AppDesign` · `Skill_PBI_Base` (skill repo mang theo) · slot quy ước và từ điển tên UI.

## Ví dụ
- Tình huống: agent được giao cập nhật số tháng mới vào một dashboard bán hàng.
- ✗ Sai: tiện thể đổi biểu đồ cột thành biểu đồ tròn và sắp lại các ô vì thấy đẹp hơn; người xem quen bố cục cũ không tìm ra số.
- ✓ Đúng: điền số theo mẫu; có ý tưởng đổi bố cục thì trình phương án, được duyệt mới đổi.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu nói tới giao diện, bố cục, màu, dialog, biểu đồ… thì hiện luật này; phần còn lại là phán đoán.
