---
version: 3
lang: vi
---
# Cons_Gate_17_LessonsLedger — Sổ kinh nghiệm của repo

Vì sao là một phần riêng: `Cons_Gate_13_Architecture` nói hệ thống dựng thế nào, không giữ điều các lỗi đã dạy ·
`Rule_Gate_01_DoneMeansRun` và `Rule_Keys_11_VerifyClaims` phán một việc, không giữ gì cho việc sau. Lỗi đã sửa một lần sẽ quay lại
khi code mới hay tác vụ mới được viết theo cách cũ; chỉ một câu luật có ghi kèm phép kiểm mới chặn được.

## Luật là gì
Mỗi repo giữ trong `Cons.md` của khung này những bài học mà chính các lỗi đã sửa của nó để lại: mỗi bài học một mục `L-<số>`, mỗi mục
là một câu luật mà code mới và vận hành phải theo, kèm cách máy hoặc người đọc kiểm. Sổ thuộc về repo và lớn lên cùng repo; đọc nó
trước khi viết code mới trong vùng mà một bài học đã phủ. Sổ có một cú pháp cố định, để script cổng của repo đọc được mà không đoán.

Header ghi `core: false`: sổ KHÔNG nằm trong danh sách luật bị bắt đọc trước hành động đầu tiên của mỗi phiên và được chèn lại sau
khi nén context. Sổ lớn thêm sau mỗi lỗi được sửa, nên bắt đọc cả sổ ở mọi phiên đã đẩy phần lõi vượt trần (đo 28/10 ở
một repo workspace-manager: 13 bài học). Thay vào đó sổ được đọc khi cần: trước khi viết code mới, tác vụ mới hay nguồn mới, đọc các mục có
`Vùng` nêu đúng vùng đó (`Rule_Gate_91_LessonsFirst` bước 5); cổng của repo đọc cả sổ bằng máy.

## Khi nào áp
- Một lỗi được sửa có gốc ở cách viết code hay cách vận hành (không phải một bản ghi dữ liệu sai một lần).
- Thêm code mới, tác vụ mới hay nguồn dữ liệu mới vào vùng mà một bài học đã phủ.

## Phải làm gì
1. Các mục nằm dưới `## Lessons`, mỗi mục một tiêu đề cấp ba: `### L-<số> — <tên ngắn>`. Các mục của chính khung là tiêu đề `##` và
   không bao giờ đổi; bài học là `###`, nên sổ lớn lên mà hình của khung không đổi (guard của `Rule_Gate_83_HarnessFromStore` chỉ so
   tiêu đề `##`). Đánh số tăng dần, không dùng lại số; số được đệm (`L-001`), cùng độ dài trong cả sổ.
2. Dưới tiêu đề, mỗi mục gồm các dòng `- <khoá>: <giá trị>`, khoá viết đúng như template, theo thứ tự:
   - bắt buộc: `Ngày` (YYYY-MM-DD) · `Sự cố đã đo` (điều đã xảy ra, có số) · `Kiểu sai` (vì sao sai) ·
     `Luật cho code mới` (điều kiện → hành vi) · `Kiểm` · `Đã sửa ở` (tệp · commit);
   - không bắt buộc, đặt sau: `Vùng` — các vùng code bài học phủ, ngăn bằng ` · `, đọc trước khi viết code mới ở đó · `Tham số` —
     một object JSON trên một dòng mà phép kiểm static đọc (danh sách tên được miễn, một khoá phải có).
   Dòng viết khác dạng này thì máy không đọc; không bao giờ đổi tên khoá.
3. Dòng `Kiểm` là `<loại>: <nội dung>`, chọn loại mạnh nhất làm được: `static` — mẫu dò ra lỗi trong code, chạy trong cổng của repo
   trước khi deploy · `static-todo` — phép kiểm static đã định mà chưa dựng (nợ mà cổng liệt kê) · `runtime` — test đỏ khi lỗi xảy
   ra · `judgment` — từ khoá nhắc người đọc. Ghi rõ mẫu, tên test hoặc từ khoá.
4. Bài học bị thay bởi bài tốt hơn vẫn giữ, thêm dòng `- Thay bằng: L-<số>`; không bao giờ xoá một mục.
5. Repo chưa có bài học nào vẫn giữ khung, ghi dòng `No lesson yet.` dưới `## Lessons`.
6. Giá trị viết bằng ngôn ngữ của các sổ trong repo; khoá giữ đúng như trên.

## Ví dụ
- Tình huống: cơ chế thử lại khi gặp lỗi tạm thời được vá ở hai chỗ; chỗ thứ ba, bước dò nguồn, bị deadlock làm hỏng job đêm.
- ✗ Sai: sửa chỗ thứ ba rồi ghi changelog "đã sửa retry ở bước dò nguồn"; tuần sau chỗ thứ tư hỏng đúng kiểu đó.
- ✓ Đúng: dưới `## Lessons`, `### L-007 — mọi lời gọi tới nguồn đi qua lớp bọc retry`, có `- Kiểm: static: lời gọi nguồn trực tiếp
  nằm ngoài lớp bọc` và `- Vùng: nguồn · job đêm`; cổng đỏ khi mẫu khớp, và mục changelog của lần sửa ghi `L-007`.

## Máy kiểm
- `conform` đỏ khi thiếu `Cons.md`, chưa viết, hoặc còn dấu mẫu `<…>`.
- `Rule_Gate_91_LessonsFirst` chặn một mục changelog mới báo sửa lỗi mà không nêu bài học.
- Guard của `Rule_Gate_83_HarnessFromStore` cho thêm và bớt mục `### L-<số>` (cả `## L-<số>` của template đầu tiên); mọi thay đổi
  khác ở các mục `##` đều bị chặn.
