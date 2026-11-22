---
version: 13
lang: vi
---
# Rule_Gate_38_TodoDoor — The TODO ledger: the way in and the way out

## Luật là gì
`04_TODO` chỉ chứa việc chưa làm liền được. Agent không bao giờ tự thêm mục: phải hỏi trước. Mục xong rời sổ ngay trong lượt.
Đây là luật duy nhất về sổ việc; file khác dẫn chiếu về đây.

## Khi nào áp
- Agent sắp thêm một mục vào `04_TODO`.
- Một mục trong `04_TODO` đã xong.

## Phải làm gì
1. Việc trong tầm tay ⇒ làm ngay và ghi `05_CHANGES`; không đậu vào `04_TODO`.
2. Muốn thêm mục mới? Hỏi một câu kèm đề xuất; chỉ ghi khi được chấp thuận (khi đó tạo cờ `.allow-todo`). Đề xuất không bao giờ
   nằm chờ trong sổ.
3. Một mục xong ⇒ trong cùng lượt: đo lại (`Rule_Keys_11_VerifyClaims`), ghi `05_CHANGES`, xoá khỏi `04_TODO` hoặc đánh dấu xong
   để `zemory archive` dời.
4. Dấu xong máy dời được: `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (dời cả khối khi bên trong không còn `[ ]` / `[~]`).
   Viết "xong" kiểu khác thì máy không thấy.
5. `zemory archive` lúc chốt phiên là lưới vét cuối, không phải chỗ để dồn mục đã xong.
6. Khối giữa `<!-- zemory:standard-todo:start` và `<!-- zemory:standard-todo:end -->` do `zemory sync` ghi từ `zemory conform`:
   những gì còn làm repo lệch chuẩn. Máy viết lại khối mỗi lượt và xoá khi repo hết lệch. Agent không sửa khối: sửa repo, rồi
   chạy `zemory sync`.

## Ví dụ
- Tình huống: quản lý vừa chốt một quy định mới; đưa vào file luật chỉ mất vài phút.
- ✗ Sai: ghi vào sổ việc "chờ đưa vào luật" rồi báo xong; sổ dài thêm, quy định chưa có hiệu lực.
- ✓ Đúng: làm ngay (với sự cho phép mà `Rule_Gate_79_HarnessEdit` đòi), ghi changelog; sổ chỉ giữ việc thật sự chưa làm kịp.

## Máy kiểm
- Guard chặn mục mở mới trong `04_TODO` khi chưa có cờ `.allow-todo`.
