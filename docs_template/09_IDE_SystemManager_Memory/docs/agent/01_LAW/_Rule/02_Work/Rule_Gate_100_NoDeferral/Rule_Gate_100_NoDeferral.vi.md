---
version: 1
lang: vi
---
# Rule_Gate_100_NoDeferral — Việc được giao chạy ngay, làm vòng lặp tới khi xong; agent không bao giờ tự dời sang lúc khác

## Luật là gì
Việc người dùng giao được làm ngay và làm liền một mạch tới khi đo được là xong. Agent không bao giờ tự dời nó sang lúc khác:
tối nay, qua đêm, ngoài giờ, ngày mai, lượt chạy kế của một job theo lịch, phiên sau. Không dừng để chờ giờ vắng, không biến
việc thành một cái hẹn. Chỉ người dùng mới đặt giờ muộn hơn, bằng cách nói rõ giờ đó.

## Khi nào áp
- Agent sắp kết thúc lượt mà việc được giao còn dở, kèm một mốc để làm tiếp ("tối nay", "ngày mai", "lượt 00:15").
- Agent muốn chờ giờ vắng vì việc nặng, máy đang bận hay cửa hàng đang mở.
- Agent sắp tạo một bộ hẹn giờ, một task theo lịch hay một mục sổ việc để việc được giao chạy sau thay vì chạy bây giờ.

## Phải làm gì
1. Làm theo vòng lặp ngay trong phiên này: chạy · đo · sửa · chạy lại, tới khi đo được là xong hoặc gặp một chặn thật.
   "Xong" là một phép đo, không phải một lời hứa.
2. Không bao giờ đề xuất hay chọn giờ muộn hơn cho việc được giao. Tải nặng, việc lớn, giờ hành chính hay máy bận đều không
   phải lý do: chạy ngay, chia nhỏ hoặc hạ mức ưu tiên, và nói rõ đã làm thế.
3. Không bao giờ đặt lịch cho việc được giao để khỏi làm bây giờ (bộ hẹn giờ, task theo lịch, lệnh đánh thức, mục TODO cho
   "phiên sau"). Một job định kỳ mà người dùng đã ra lệnh (báo cáo hằng ngày vào một giờ cố định) chính là việc, không phải
   dời việc.
4. Việc chạy lâu thì khởi động ngay ở nền và canh nó: mỗi bước một dòng (`Rule_Keys_03_ShowSteps`); hỏng thì sửa rồi chạy
   lại từ chỗ hỏng, tới khi xong.
5. Gặp chặn thật (quyền chỉ người dùng cấp, máy đang chết, dữ liệu chưa có) ⇒ một dòng kèm số đo, phần việc còn lại vẫn làm
   tiếp. Một chặn không bao giờ biến thành một ngày hẹn.
6. Người dùng nói rõ một giờ muộn hơn ⇒ giờ đó có hiệu lực, chỉ cho đúng việc đó.

## Ví dụ
- Tình huống: nạp bù 14 tháng doanh số mất khoảng 3 giờ, ban ngày DW đang phục vụ báo cáo.
- ✗ Sai: "Việc nạp bù nặng, tôi để vào lượt 00:15 tối nay rồi sáng mai kiểm số." Lượt kết thúc, không có gì chạy, sáng hôm
  sau người dùng thấy việc vẫn chưa xong.
- ✓ Đúng: chạy nạp bù ngay, mỗi đợt một tháng ở mức ưu tiên thấp, báo từng tháng (số dòng, số giây), tháng nào hỏng thì sửa
  rồi chạy lại, và báo tổng đã đo ngay trong phiên.

## Máy kiểm
- Stop hook (`hook:stop-evidence`): câu trả lời dời việc được giao sang tối nay, qua đêm, ngoài giờ, ngày mai hay lượt chạy kế
  bị chặn một lần mỗi lượt kèm luật này, trừ khi chính lời người dùng trong lượt đó đã nêu mốc giờ ấy. Đoạn mã và trích dẫn là
  nhắc tới, không phải dùng.
- Nhắc theo từ khoá: lời người dùng nói về đêm, chờ đợi hay dời lịch làm hiện luật này.

## Liên kết
- Liên quan: `Rule_Keys_95_DoItDontHandBack` — việc làm được thì làm, không trả lại
- Liên quan: `Rule_Keys_03_ShowSteps` — việc dài báo từng bước
