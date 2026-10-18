---
id: Rule_81
name: follow-existing-pattern
version: 3
kind: judgment
code: 02_Work
---
# Rule_Core_81_FollowExistingPattern — Adding to something that exists: follow its pattern

## What
Adding to a file, table, folder or series that already exists, the agent copies the shape of the items already there: names,
order, format, way of writing. No new shape beside the old one.

## When
- Adding an item to a file, table, folder or series that already has items.

## Do
1. Read the existing items first.
2. Copy their shape exactly: naming, order, format, way of writing; then fill in the new content.
3. The old shape looks wrong ⇒ say so; do not change it on your own (`Rule_Keys_07_ScopeOnly`).

## Example
- Situation: the agent adds a new report case to a folder that already holds five cases.
- ✗ Wrong: name the folder and files its own way, with a spec built differently from the other five.
- ✓ Right: open an existing case, copy its naming, spec layout and mail template, then fill in the new content.

## Check
- Judgment; no machine check.

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
- Phán đoán; không có máy kiểm.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_07_ScopeOnly` — raise a problem, do not fix it out of scope · nêu vấn đề, không sửa ngoài phạm vi
