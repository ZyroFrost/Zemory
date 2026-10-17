---
id: Rule_11
aka: 02-11
name: verify-claims
version: 6
kind: judgment
---
# Rule_Keys_11_VerifyClaims Chưa xác minh thì chưa phải sự thật

- Mọi khẳng định (con số · trạng thái · nguyên nhân · đã làm hay chưa) truy được về nguồn kiểm được: đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài.
- Tra không ra ⇒ nói "chưa xác minh được" kèm các đường đã thử; không lấp bằng suy đoán.
- Trước khi báo một con số, một kết luận, hoặc xoá thứ gì ⇒ đo lại bằng đường thứ hai khác cơ chế (đổi công cụ · đổi hướng đếm · gọi bề mặt thật).
- Bốn dạng sai phải soát: công cụ hỏng lặng trả rỗng · phép so lỏng báo oan · tiêu chí nghe hợp lý mà sai bản chất · sổ nói khác thực tế.
- Thước đo: phép đo tự dựng chép đủ tham số của thước chính thức; nhiều phép thử cùng hỏng một hướng ⇒ nghi thước trước; số đo phải khớp chi phí vật lý của việc đó, nhanh bất thường là xanh giả cho tới khi chứng minh được điều ngược lại.
- Việc · lỗi · quyết định ở phiên khác ⇒ tra lịch sử quyết định trước khi khẳng định: có CLI `zemory` ⇒ `zemory memory search "<q>" --all`; không có ⇒ `docs/archive/`. Tra đúng câu đang cần trả lời. Không ghi hay khẳng định theo bản tóm tắt hoặc kết quả subagent chưa kiểm.
- Mục trong sổ (`04_TODO` · plan · changelog) là một khẳng định trạng thái. Trước khi liệt kê · báo cáo · hỏi về một mục ⇒ đo lại bằng đủ ba nguồn: mã/file · lịch sử quyết định · chạy thật. Áp mọi lúc, không chờ chốt phiên. Ba nguồn khớp mới kết luận; lệch ⇒ cái mới hơn thắng; không chạm được một nguồn ⇒ ghi "chưa xác minh được", không mặc định "chưa làm". Mục quá 7 ngày không ai đụng ⇒ nghi ngờ. Hỏi lại một việc đã chốt là lỗi.
- Cách đo, bẫy báo oan: `.claude/skills/harness-audit/SKILL.md`. Máy đo sổ (khi có CLI): `zemory todo verify`.

## Ví dụ

- Tình huống: agent soát bảng khách hàng và báo "có 120 khách trùng, đề nghị xoá".
- ✗ Sai: con số lấy từ một phép so tên không phân biệt hoa thường; phần lớn là khách khác nhau trùng tên, xoá đi là mất dữ liệu thật.
- ✓ Đúng: đếm lại bằng đường khác (mã khách, số điện thoại); hai cách khớp mới báo số; chưa chắc thì nói rõ là chưa xác minh được.
