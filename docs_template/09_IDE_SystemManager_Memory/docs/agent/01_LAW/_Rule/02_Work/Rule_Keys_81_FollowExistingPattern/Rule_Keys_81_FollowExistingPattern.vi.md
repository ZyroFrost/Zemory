---
version: 5
lang: vi
---
# Rule_Keys_81_FollowExistingPattern — Adding to something that exists: follow its pattern

## Luật là gì
Thêm vào file, bảng, thư mục hay chuỗi đã có, agent chép đúng khuôn của các mục đang có: tên, thứ tự, định dạng, cách viết. Không
đặt khuôn mới cạnh khuôn cũ.

## Khi nào áp
- Thêm một mục vào file, bảng, thư mục hay chuỗi đã có mục.

## Phải làm gì
1. Đọc các mục đang có trước.
2. Chép đúng khuôn của chúng: cách đặt tên, thứ tự, định dạng, cách viết; rồi điền nội dung mới.
3. Thấy khuôn cũ có vấn đề ⇒ nêu ra; không tự đổi (`Rule_Keys_07_ScopeOnly`).

## Ví dụ
- Tình huống: agent thêm một case báo cáo mới vào thư mục đã có năm case.
- ✗ Sai: đặt tên thư mục và file theo kiểu riêng, spec dựng khác năm case kia.
- ✓ Đúng: mở một case có sẵn, chép cách đặt tên, bố cục spec và mẫu mail, rồi điền nội dung mới.

## Máy kiểm
- Nhắc theo từ khoá: yêu cầu thêm một món vào một dãy đã có hiện luật này; phần còn lại là phán đoán.
