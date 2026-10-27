---
version: 1
lang: vi
---
# Cons_Gate_17_LessonsLedger — Sổ kinh nghiệm của repo

Vì sao là một phần riêng: `Cons_Gate_13_Architecture` nói hệ thống dựng thế nào, không giữ điều các lỗi đã dạy ·
`Rule_Gate_01_DoneMeansRun` và `Rule_Keys_11_VerifyClaims` phán một việc, không giữ gì cho việc sau. Lỗi đã sửa một lần sẽ quay lại
khi code mới hay tác vụ mới được viết theo cách cũ; chỉ một câu luật có ghi kèm phép kiểm mới chặn được.

## Luật là gì
Mỗi repo giữ trong `Cons.md` của khung này những bài học mà chính các lỗi đã sửa của nó để lại: mỗi bài học một mục `L-<số>`, mỗi mục
là một câu luật mà code mới và vận hành phải theo, kèm cách máy hoặc người đọc kiểm. Sổ thuộc về repo và lớn lên cùng repo; đọc nó
trước khi viết code mới trong vùng mà một bài học đã phủ.

## Khi nào áp
- Một lỗi được sửa có gốc ở cách viết code hay cách vận hành (không phải một bản ghi dữ liệu sai một lần).
- Thêm code mới, tác vụ mới hay nguồn dữ liệu mới vào vùng mà một bài học đã phủ.

## Phải làm gì
1. Mỗi bài học một mục, đánh số tăng dần, không dùng lại số: `## L-<số> — <tên ngắn>`.
2. Mỗi mục có sáu dòng: ngày · sự cố đã đo (có số) · kiểu sai · luật cho code mới (điều kiện → hành vi) · cách kiểm · nơi đã sửa.
3. Cách kiểm chọn loại mạnh nhất làm được: `static` — mẫu dò ra lỗi trong code, chạy trong cổng của repo trước khi deploy ·
   `runtime` — test đỏ khi lỗi xảy ra · `judgment` — từ khoá nhắc người đọc. Ghi rõ mẫu, tên test hoặc từ khoá.
4. Bài học bị thay bởi bài tốt hơn vẫn giữ, ghi `superseded by L-<số>`; không bao giờ xoá một mục.
5. Repo chưa có bài học nào vẫn giữ khung, ghi dòng `No lesson yet.` dưới `## Lessons`.

## Ví dụ
- Tình huống: cơ chế thử lại khi gặp lỗi tạm thời được vá ở hai chỗ; chỗ thứ ba, bước dò nguồn, bị deadlock làm hỏng job đêm.
- ✗ Sai: sửa chỗ thứ ba rồi ghi changelog "đã sửa retry ở bước dò nguồn"; tuần sau chỗ thứ tư hỏng đúng kiểu đó.
- ✓ Đúng: `L-7 — mọi lời gọi tới nguồn đi qua lớp bọc retry`, kiểm `static`: một mẫu dò ra lời gọi nguồn trực tiếp nằm ngoài lớp bọc và
  làm cổng đỏ; mục changelog của lần sửa ghi `L-7`.

## Máy kiểm
- `conform` đỏ khi thiếu `Cons.md`, chưa viết, hoặc còn dấu mẫu `<…>`.
- `Rule_Gate_91_LessonsFirst` chặn một mục changelog mới báo sửa lỗi mà không nêu bài học.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_91_LessonsFirst` — a fix is done only with its lesson · sửa xong phải có bài học
- Related · Liên quan: `Cons_Gate_13_Architecture` — the rules of how the system is built · luật dựng hệ thống
