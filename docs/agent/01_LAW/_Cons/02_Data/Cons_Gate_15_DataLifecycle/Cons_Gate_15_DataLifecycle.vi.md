---
version: 4
lang: vi
---
# Cons_Gate_15_DataLifecycle — The life of data

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: dữ liệu nào được xoá, dữ liệu nào chỉ được lưu trữ (archive) và không bao giờ xoá,
bảng nào chỉ ghi thêm, được cache gì và hết hạn khi nào, mỗi loại dữ liệu giữ bao lâu.

## Khi nào áp
- Sản phẩm giữ dữ liệu.
- Agent sắp xoá, dọn hay cache dữ liệu.

## Phải làm gì
1. Điền bốn mục của `Cons.md`: không bao giờ xoá · chỉ ghi thêm · cache · thời hạn giữ.
2. Không giữ dữ liệu nào ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một kho dữ liệu nạp từ nhiều hệ nguồn điền `Cons.md` của khung này.
- ✗ Sai: không khai gì về xoá; agent dọn một bảng cũ "không ai dùng" bằng lệnh xoá, mất lịch sử ba năm.
- ✓ Đúng: "Không bao giờ xoá dữ liệu, chỉ archive. Bảng nhật ký chỉ ghi thêm. Chỉ cache dữ liệu thô của kỳ đã chốt; không bao giờ
  cache kết quả đã diễn giải."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.
