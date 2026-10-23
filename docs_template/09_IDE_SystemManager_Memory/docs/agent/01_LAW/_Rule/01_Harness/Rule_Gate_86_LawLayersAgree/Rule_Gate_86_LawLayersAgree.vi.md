---
version: 2
lang: vi
---
# Rule_Gate_86_LawLayersAgree — The layers of law never contradict each other, and stay linked

## Luật là gì
Một quy định sống ở ba tầng: luật hay khung hiến pháp (HS) nêu nghĩa vụ · `Cons.md` của repo nêu quyết định riêng của repo · skill
dạy cách thi hành. Tầng dưới không bao giờ nói ngược tầng trên, và mỗi tầng nêu tên các tầng nó gắn với.

## Khi nào áp
- Viết hay sửa một luật, một khung, một `Cons.md` hay một skill.
- Thấy hai tầng nói khác nhau.

## Phải làm gì
1. Thứ bậc: khung hiến pháp và luật > `Cons.md` của repo > skill. `Cons.md` không nới nghĩa vụ của khung; skill không dạy trái luật
   nó thi hành.
2. Thấy mâu thuẫn ⇒ sửa tầng dưới theo tầng trên, hoặc đề xuất sửa tầng trên qua HS (`Rule_Gate_83_HarnessFromStore`).
3. Liên kết viết trong thân: luật hay khung kết thúc bằng `## Links · Liên kết` (`Implements` · `Repo declares` · `Related`); skill
   nêu các luật nó thi hành ở `## Implements`. Hai chiều khớp nhau.
4. Sửa một tầng ⇒ soát mọi tầng nối với nó (`zemory impact <phần>` liệt kê).

## Ví dụ
- Tình huống: luật về bí mật nói giá trị không bao giờ vào git; skill của một phòng ghi "để mật khẩu trong `config.json` cho job
  định kỳ".
- ✗ Sai: làm theo skill vì nó cụ thể hơn; mật khẩu lọt vào git.
- ✓ Đúng: luật thắng; skill được sửa để đọc giá trị từ `data/secrets/`, và việc sửa đi qua HS.

## Máy kiểm
- `conform` và test của HS: mọi tên trong `## Links` và `## Implements` là phần còn sống, và hai chiều khớp nhau.
- `conform`: mục của khung mà `Cons.md` của repo bỏ đi hoặc còn dấu mẫu `<…>` thì đỏ.
- App hiện cùng các phát hiện đó (dùng chung engine conform).
