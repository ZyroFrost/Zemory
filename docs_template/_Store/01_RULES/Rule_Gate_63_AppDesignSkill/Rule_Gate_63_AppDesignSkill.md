---
id: Rule_63
aka: 02-63
name: app-design-skill
version: 4
kind: action
applies: [App]
---
# Rule_Gate_63_AppDesignSkill Chuẩn thiết kế UI nằm ở skill `app-design`

- Chuẩn thiết kế FE + BE của app nằm ở `.claude/skills/dev-app-design/SKILL.md`: panel resize · dialog · chữ người dùng cuối đọc · gom tiến trình.
- Đây là CHUẨN THIẾT KẾ, không phải điều khoản: đụng bề mặt app hay thêm tiến trình nền ⇒ MỞ skill đó trước, rồi làm theo.
- Phép kiểm: cổng `read-first`.

## Ví dụ

- Tình huống: agent sắp thêm một hộp thoại xác nhận vào app nội bộ.
- ✗ Sai: tự đặt kích thước hộp thoại và cách đóng theo ý mình, không mở chuẩn thiết kế.
- ✓ Đúng: mở skill thiết kế app trước, làm theo khuôn hộp thoại, cách đóng, chữ hiển thị đã quy định; chưa mở thì lần ghi vào thư mục giao diện bị chặn.
