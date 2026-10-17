---
id: Rule_81
name: follow-existing-pattern
version: 1
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Core_81_FollowExistingPattern @v1 #039670be3d0b
---
# Rule_Core_81_FollowExistingPattern Thêm vào thứ có sẵn thì theo mẫu có sẵn

- Thêm vào file, bảng, thư mục hay chuỗi có sẵn ⇒ đọc các mục đang có trước, chép theo đúng khuôn của chúng (tên · thứ tự · định dạng · cách viết).
- Không tự chế khuôn mới cạnh khuôn cũ. Thấy khuôn cũ có vấn đề ⇒ nêu ra, không tự đổi (`Rule_Keys_07_ScopeOnly`).
- Phép kiểm: phán đoán.

## Ví dụ

- Tình huống: agent thêm một case báo cáo mới vào thư mục đã có năm case.
- ✗ Sai: đặt tên thư mục và file theo kiểu mình thích, cấu trúc spec khác năm case kia.
- ✓ Đúng: mở một case có sẵn, chép đúng cách đặt tên, cấu trúc spec và mẫu mail rồi điền nội dung mới.
