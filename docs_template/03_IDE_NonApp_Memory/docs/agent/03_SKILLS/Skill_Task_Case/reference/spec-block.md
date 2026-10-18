# Khối khai báo máy đọc được ở đầu `spec.md`

> Phần của `Skill_Task_Case`. Mỗi `tasks/<case>/spec.md` mở đầu bằng YAML front-matter, đặt trước mọi thứ khác. Thân spec giải thích
> cho người; khối này là chỗ DUY NHẤT máy đọc. Người tiêu thụ (app canh lịch của cụm, agent) đọc xuyên mỗi lượt, không giữ bản sao —
> repo không phải khai gì thêm cho app.

```yaml
---
status: open                  # open · blocked · done · closed
updated: 2026-01-31           # ngày sửa khối này — đổi trong cùng lượt với việc
evidence: "GM #123456"        # phép đo / URL / số trên DB chứng minh status — bắt buộc khi done|closed
cadence: Monthly              # đúng bộ nhịp của tên case (reference/naming.md §1)
run_at: "monthly:3 07:00"     # giờ chạy cụ thể; null = chưa chốt giờ
run_at_since: 2026-01-31      # ngày lịch trên bắt đầu có hiệu lực
sla_hours: 48                 # ngưỡng "cũ" của case; null = chưa chốt
delivered_by: null            # repo thật sự giao hàng; null = chính repo này
deliveries_per_period: 1      # mỗi ĐÍCH, mỗi KỲ, đúng mấy bản giao
destinations: 1               # case giao tới mấy đích (mail · mỗi file SharePoint là một đích)
delivers_to: mail             # mail · sharepoint · bi · dw · none
direction: out                # in · out — task định kỳ (skill task-vm-automation)
input_url: null               # thư mục gốc người nộp số (task-vm-automation)
output_url: null              # thư mục kết quả (task-vm-automation)
---
```

## Luật của khối

1. `updated` đổi cùng lượt với việc, không đợi chốt phiên — trạng thái chỉ đổi khi có người nhớ sửa thì sổ báo "còn treo" việc đã xong.
2. `evidence` phải tra được (phép đo, URL, `GM #id`, số trên DB). `status: done` mà `evidence` rỗng = chưa đóng.
3. `cadence` dùng đúng bộ token của tên case ⇒ tên thư mục và khai báo so được với nhau. Lệch ⇒ báo, không tự chọn bên nào.
4. Khối thắng văn xuôi: hai chỗ khác nhau thì khối là nguồn.
5. `run_at: null` không được suy thành giờ nào; người đọc hiện "chưa có giờ cụ thể". Đoán giờ từ văn xuôi dẫn tới chạy lại một kỳ
   đã có người giao.
6. Trước khi coi một case là "tới hạn", đọc `delivered_by`: case định kỳ có thể là bản chép chạy độc lập, người giao nằm ở repo khác.
7. `run_at_since` là mốc chấm trễ hạn: chỉ chấm trễ cho chu kỳ tới hạn từ mốc đó trở đi. Đổi `run_at` ⇒ đổi `run_at_since` cùng lượt.
   Thiếu ⇒ người tiêu thụ rơi về mtime của `spec.md` và nói rõ là đang dùng đường thô.
8. Không khai bảng hay nguồn trong khối — nhà của chúng là bản đồ nguồn của repo.
9. `deliveries_per_period` và `destinations` cho máy phân biệt "chạy lại" với "sản phẩm khác" bằng phép trừ: số file mong đợi mỗi kỳ
   = `destinations` × `deliveries_per_period`; thừa ra cho cùng một đích trong cùng kỳ là chạy lại hoặc sửa, bản mới nhất là bản hiện
   hành. `delivers_to: dw` — case ghi thẳng vào DW cũng là giao hàng (không có file giao, không mail, nhưng đích là DW).

- Thiếu hai trường ở mục 9 ⇒ người tiêu thụ gộp thô cả case và nói rõ là suy đoán; KHÔNG mặc định `1`. Case CÓ file giao ra trong
  `03_output/` và có đường giao đọc được trong code ⇒ khai hết một lượt, mỗi giá trị tra ra từ pipeline của chính case (chỗ gọi gửi /
  đẩy, hằng đường dẫn đích). Case lẻ không có đường giao trong code ⇒ để `null` — trạng thái đúng, không phải nợ.
- Các trường khác bù dần: case chưa có khối ⇒ người tiêu thụ suy từ TÊN và nói rõ là suy từ tên; chạm case nào thì thêm khối cho
  case đó, không mở chiến dịch sửa một lượt.

## Đóng case = đồng bộ spec, không phải đổi một chữ

Trong cùng lượt:
1. Đọc lại TOÀN BỘ spec, không chỉ dòng trạng thái.
2. Đối chiếu từng khẳng định ở §Trạng thái với thân spec. Thân có bằng chứng, trạng thái chỉ là tóm tắt ⇒ lệch thì sửa tóm tắt theo
   thân.
3. Mọi `[ ]` phải đúng: xong thì gạch; chưa xong mà ngoài phạm vi thì ghi "KHÔNG đóng theo" kèm chỗ nó đi tiếp.
4. Con trỏ sang file khác (sổ việc, mục khác, case khác) mở ra kiểm; trỏ hụt thì nắn.
5. Việc còn nợ ⇒ đề xuất treo kèm điều kiện lôi ra lại.

- Đóng khi hết việc. "Sợ tái phát" không phải lý do giữ mở — dấu hiệu cần canh ghi ở §Mở lại case khi nào; tái phát thì mở lại.
- Kiểm: case đã đóng mà `grep -c '^- \[ \]' spec.md` > 0 ⇒ chưa đồng bộ xong.
