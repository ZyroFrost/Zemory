---
version: 1
lang: vi
---
# Rule_Gate_75_ScopedExport — Dữ liệu chỉ rời app thành tệp khi có phạm vi, cột đã chọn, định dạng đã chọn và một dòng nhật ký

## Luật là gì
Xuất dữ liệu không bao giờ là một cú bấm ra hết. Mọi lần xuất của một app mở một hộp thoại, nơi người dùng đặt phạm vi, thời
gian, cột, định dạng và chỗ lưu tệp; backend kiểm lại tất cả và ghi dòng nhật ký trước khi tệp rời máy chủ. Luật riêng vì:
`Rule_Keys_90_AppFamilyContract` nêu mã log của họ app chứ không nói thứ gì được rời app, `Skill_App_Base` nói cách dựng bề mặt,
`Rule_Keys_87_NoSilentBlankPage` nói trang hiện gì khi không có gì; không phần nào giữ nghĩa vụ của một lần xuất.

## Khi nào áp
- Sắp dựng hay đổi một chỗ xuất, tải danh sách, nút "CSV", "Excel" hay "tệp báo cáo" của một app.
- Sắp viết một câu trả lời backend gửi tệp (`Content-Disposition: attachment`).

## Phải làm gì
1. Nút mở hộp thoại, không bao giờ ra tệp ngay. Hộp thoại có:
   - phạm vi: bộ lọc của trang hoặc của một nhóm đã lưu - ít nhất một bộ lọc, một khoảng thời gian tính là một;
   - khoảng thời gian của dữ liệu;
   - cột, chọn từ MỘT danh sách cố định của app, cột dữ liệu cá nhân có đánh dấu; mở ra không tick sẵn cột cá nhân nào;
   - định dạng: CSV (UTF-8 có BOM) hoặc Excel (.xlsx);
   - chỗ lưu: hộp "Lưu thành" của trình duyệt nếu có, không thì vào thư mục tải xuống;
   - số dòng trước khi dựng tệp;
   - mục đích, bắt buộc khi chọn cột dữ liệu cá nhân.
2. Backend từ chối, đóng khi lỗi: không có phạm vi · cột không có trong danh sách (tên cột từ yêu cầu không bao giờ vào câu SQL) ·
   cột cá nhân không có mục đích · định dạng không có · vai dưới bậc của chức năng xuất.
3. Dòng nhật ký - số dòng · phạm vi · cột · mục đích · định dạng, mã xuất của app, mức warn - ghi TRƯỚC khi tệp rời máy chủ;
   không ghi được thì không có tệp.
4. Tệp dựng trong bộ nhớ, không lưu trên máy chủ, gửi kèm `Cache-Control: no-store`, tên
   `<app>-<thực thể>-<yyyymmdd-hhmm>.<đuôi>`.
5. Test: bậc vai · không phạm vi · cột lạ · thiếu mục đích · nhật ký ghi trước · nhật ký hỏng thì không có tệp · thứ tự cột;
   phá từng điều kiện thì một test đỏ. Bài kiểm trình duyệt mở hộp thoại từ nút xuất.

## Cách làm đúng
Khi luật này chặn một câu trả lời gửi tệp: đặt chức năng xuất sau hộp thoại và các phép kiểm của nó, ghi dòng nhật ký (mã xuất
của app) trong cùng route trước câu trả lời - skill `app-export` có các route, hộp thoại và test.

## Ví dụ
- Tình huống: một app thành viên cần nút "Xuất CSV" cho đội marketing.
- ✗ Sai: nút tải ngay mọi thành viên trang đang hiện, kèm số điện thoại đầy đủ, kể cả khi không lọc gì; không có gì ghi tệp dùng
  để làm gì.
- ✓ Đúng: nút mở hộp thoại; người dùng chọn hạng và khoảng thời gian, tick mã thẻ, hạng, điện thoại, ghi "quà sinh nhật VIP",
  chọn Excel, chọn thư mục; tệp có 141 dòng và dòng nhật ký ghi phạm vi, ba cột và mục đích.

## Máy kiểm
- Hook: ghi vào một file nguồn backend mà thêm một câu trả lời gửi tệp (`Content-Disposition: attachment`) vào file không có lời
  gọi ghi nhật ký thì bị chặn; cùng câu trả lời đặt cạnh lời gọi ghi nhật ký thì qua.
- Nhắc theo từ khoá: câu yêu cầu xuất, tải danh sách, làm tệp CSV hay Excel hiện luật này.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_Export` — the routes, the dialog and the tests · các route, hộp thoại và test
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — the family's log codes · mã log của họ app
