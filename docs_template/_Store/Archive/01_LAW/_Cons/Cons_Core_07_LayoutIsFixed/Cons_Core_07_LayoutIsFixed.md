---
id: Cons_7
aka: 01-7
name: layout-is-fixed
version: 5
kind: judgment
applies: [App]
---
# Cons_Core_07_LayoutIsFixed Bố cục đã chốt là bất biến

- Agent không tự đổi vị trí / thứ tự của bố cục đã chốt; muốn đổi thì HỎI.
- Quy ước đi kèm: mọi dòng / panel TỔNG nằm DƯỚI nội dung (chuẩn bảng tính).

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.

## Ví dụ

- Tình huống: Một màn hình hóa đơn đã được chốt bố cục: bảng chi tiết ở trên, panel tổng ở dưới. Agent đang sửa phần nạp dữ liệu của màn này.
- ✗ Sai: Tiện tay dời panel tổng lên đầu cho "dễ thấy", hoặc thêm một cột mới chưa ai yêu cầu. Người dùng mở ra thấy bố cục quen thuộc bị đổi mà không được báo.
- ✓ Đúng: Chỉ sửa phần nạp dữ liệu, giữ nguyên bố cục. Nếu thấy nên đổi vị trí thì hỏi trước. Dòng và panel tổng luôn nằm dưới nội dung.
