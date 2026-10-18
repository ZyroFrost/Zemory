---
id: Cons_15
name: data-lifecycle
version: 2
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_15_DataLifecycle Vòng đời dữ liệu

- Repo phải khai trong `Cons.md` của khung này: dữ liệu nào được xoá · dữ liệu nào chỉ được lưu trữ (archive), không xoá · bảng nào chỉ ghi thêm · được cache gì, hết hạn khi nào · giữ bao lâu.
- Không giữ dữ liệu nào ⇒ `status: n/a` kèm lý do.
- Lối đúng: viết `Cons.md` theo mẫu, hoặc ghi `status: n/a` kèm lý do.
- Phép kiểm: `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Ví dụ

- Tình huống: một kho dữ liệu nạp từ nhiều hệ nguồn viết `Cons.md` cho khung này.
- ✗ Sai: không khai gì về xoá; agent dọn một bảng cũ "không ai dùng" bằng lệnh xoá, mất lịch sử ba năm.
- ✓ Đúng: "Không bao giờ xoá dữ liệu, chỉ archive. Bảng nhật ký chỉ ghi thêm. Chỉ cache dữ liệu thô của kỳ đã chốt; không bao giờ cache kết quả đã diễn giải."
