---
version: 10
lang: vi
---
# Rule_Keys_11_VerifyClaims — Not verified is not a fact

## Luật là gì
Mọi khẳng định (con số · trạng thái · nguyên nhân · đã làm hay chưa) truy được về một nguồn kiểm được: đọc file · chạy lệnh · gọi
bề mặt thật · tra tài liệu ngoài. Thứ không truy được thì nói là chưa xác minh, không lấp bằng suy đoán.

## Khi nào áp
- Sắp nêu một con số, một kết luận, một nguyên nhân, hay rằng một việc đã làm.
- Sắp xoá một thứ gì.
- Sắp liệt kê, báo cáo hay hỏi về một mục trong sổ (`04_TODO` · plan · changelog).

## Phải làm gì
1. Truy mỗi khẳng định về một nguồn kiểm được. Không ra ⇒ nói "chưa xác minh được" kèm các đường đã thử.
2. Trước khi báo một con số, một kết luận, hay xoá ⇒ đo lại bằng đường thứ hai khác cơ chế (đổi công cụ · đổi hướng đếm · gọi bề
   mặt thật).
3. Soát bốn dạng sai: công cụ hỏng lặng lẽ trả rỗng · phép so lỏng báo oan · tiêu chí nghe hợp lý mà sai bản chất · sổ nói khác
   thực tế.
4. Thước đo: phép đo tự dựng chép đủ tham số của thước chính thức; nhiều phép thử cùng hỏng một hướng ⇒ nghi thước trước; số đo
   phải khớp chi phí vật lý của việc đó — nhanh bất thường là xanh giả cho tới khi chứng minh được điều ngược lại.
5. Việc · lỗi · quyết định ở phiên khác ⇒ tra lịch sử quyết định trước khi khẳng định: có CLI `zemory` ⇒
   `zemory memory search "<q>" --all`; không có ⇒ `docs/archive/`. Tra đúng câu đang cần trả lời. Không ghi hay khẳng định theo
   bản tóm tắt hoặc kết quả subagent chưa kiểm.
6. Mục trong sổ là một khẳng định trạng thái. Trước khi liệt kê, báo cáo hay hỏi về một mục ⇒ đo lại bằng đủ ba nguồn: mã/file ·
   lịch sử quyết định · chạy thật. Áp mọi lúc, không chờ chốt phiên. Ba nguồn khớp ⇒ kết luận; lệch ⇒ cái mới hơn thắng; không
   chạm được một nguồn ⇒ ghi "chưa xác minh được", không mặc định "chưa làm". Mục quá 7 ngày không ai đụng ⇒ nghi ngờ. Hỏi lại
   một việc đã chốt là lỗi.
7. Kiểm một file, một bản giao hay một bảng ⇒ máy đọc MỌI ô, dòng, cột của vùng liên quan (cả vùng đang dùng, ngay từ lượt đầu),
   không chọn mẫu. Câu gửi ra khỏi repo (mail, báo cáo) chép từ kết quả quét và nêu đúng cột, dòng; câu nào không truy về được một
   dòng của kết quả đó thì không viết.

Cách đo, bẫy báo oan: `.claude/skills/harness-audit/SKILL.md`. Máy đo sổ (khi có CLI): `zemory todo verify`.

## Ví dụ
- Tình huống: agent soát bảng khách hàng và báo "có 120 khách trùng, đề nghị xoá".
- ✗ Sai: con số lấy từ một phép so tên không phân biệt hoa thường; phần lớn là khách khác nhau trùng tên, xoá đi là mất dữ liệu
  thật.
- ✓ Đúng: đếm lại bằng đường khác (mã khách, số điện thoại); hai cách khớp mới báo số; chưa chắc thì nói là chưa xác minh được.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu hỏi còn gì, phiên trước, báo cáo hay audit thì hiện luật này. Máy đo sổ: `zemory todo verify`.
