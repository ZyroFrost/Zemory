---
version: 9
lang: vi
---
# Rule_Gate_10_DestructiveOps — Destroying anything needs approval; original inputs are read-only

## Luật là gì
Xoá hay ghi đè đều coi là không đảo được: agent nêu đối tượng và lý do, chờ chấp thuận rồi mới làm. Đầu vào gốc nhận từ bên ngoài
chỉ được đọc, không bao giờ bị sửa.

## Khi nào áp
- Sắp xoá file · code · hàm · lệnh · chức năng · sản phẩm giao đi (deliverable · measure) · script · nội dung docs · thư mục.
- Sắp ghi đè một thứ đang có.
- Làm việc với đầu vào gốc (file được gửi tới · bản kéo từ nguồn).
- Bãi bỏ một luật.

## Phải làm gì
1. Ghi đè cũng là xoá: thêm chức năng ⇒ mở rộng cái cũ, không thay cái cũ; chỉ thay khi yêu cầu nói rõ.
2. Trước khi xoá hoặc ghi đè ⇒ nêu đối tượng và lý do, chờ chấp thuận rồi mới làm; không làm rồi báo sau.
3. Thứ dư thừa hoặc không còn dùng ⇒ đề xuất; không tự xoá. Bổ sung · mở rộng không cần xác nhận; xoá · thu hẹp luôn cần.
   File agent tạo ra để làm việc (nháp, `Rule_Gate_04_ScratchFiles`) không thuộc loại này: agent tự xoá.
4. Đầu vào gốc ⇒ chỉ đọc: không sửa, không ghi đè, không xoá; làm sạch trên bản chép. Mất đầu vào là mất hẳn, phải xin lại bên
   gửi. Chỗ đặt đầu vào gốc và bản trung gian: các slot của `02_STRUCTURE`.
5. Bãi bỏ một luật ⇒ giữ số, ghi *bãi bỏ*.

## Ví dụ
- Tình huống: bên kinh doanh gửi file Excel doanh số tháng có vài cột sai định dạng; trong thư mục còn ba file cũ có vẻ không ai
  dùng.
- ✗ Sai: sửa thẳng file gốc rồi lưu đè, xoá luôn ba file cũ và ghi "đã dọn file thừa"; một file là bản phòng khác vẫn mở hằng tuần.
- ✓ Đúng: chép file gốc sang chỗ xử lý để làm sạch, giữ nguyên bản gốc; liệt kê ba file cũ kèm lý do, chờ đồng ý từng file rồi mới
  xoá.

## Máy kiểm
- Guard chặn lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và lần sửa làm mất số luật, khi
  chưa có cờ `.allow-delete`. Miễn, không cần cờ: nháp của chính agent — thư mục nháp của phiên và mọi đường có một đoạn
  `_scratch_*`, kể cả xoá đệ quy và mẫu `*` — cùng đích khác nằm trong thư mục tạm. Đích được đọc như shell đọc: `cd` đứng trước,
  dấu nháy dính vào chữ, `$TEMP` / `$env:TEMP`, biến gán trong cùng lệnh, `Get-ChildItem -Filter` nối sang `Remove-Item $_`. Một
  đích không phải nháp trên cùng dòng vẫn phải hỏi.
- Đầu vào gốc: khoá `protected` của marker (glob, ví dụ `data/*/01_raw`).
