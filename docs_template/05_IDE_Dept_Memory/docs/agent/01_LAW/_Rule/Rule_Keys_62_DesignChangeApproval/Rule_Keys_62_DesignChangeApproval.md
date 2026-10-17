---
id: Rule_62
aka: 02-62
name: design-change-approval
version: 10
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Keys_62_DesignChangeApproval @v10 #21f8616446e0
---
# Rule_Keys_62_DesignChangeApproval Đổi hình hài thứ người khác đang dùng thì trình trước

- Đổi hình hài thứ người khác đang dùng ⇒ trình trước, chờ chấp thuận: giao diện (layout · kích thước · khung · màu · theme · hình dạng component · thêm/bớt phần tử · style · sắp xếp) · bố cục báo cáo, dashboard, chọn biểu đồ, theme trình bày · mẫu giao đi.
- Trình = đề xuất cụ thể, hoặc bản nháp/ảnh.
- Bố cục đã chốt là bất biến: không tự đổi vị trí hay thứ tự.
- Không cần trình: sửa lỗi kỹ thuật (lệch · tràn · hỏng) · điền số theo mẫu có sẵn.
- Hướng được giao còn hở chi tiết thiết kế ⇒ trình phương án cho phần hở. Gợi ý lấy từ skill thiết kế ⇒ trình, không tự áp.
- Quy ước cụ thể: `.claude/skills/dev-app-design/SKILL.md` · `.claude/skills/pbi-base/SKILL.md` · slot quy ước và từ điển UI.

## Ví dụ

- Tình huống: agent được giao cập nhật số tháng mới vào một dashboard bán hàng.
- ✗ Sai: tiện thể đổi biểu đồ cột thành biểu đồ tròn và sắp lại các ô vì thấy đẹp hơn; người xem quen bố cục cũ không tìm ra số.
- ✓ Đúng: điền số theo mẫu; có ý tưởng đổi bố cục thì trình phương án, được duyệt mới đổi.
