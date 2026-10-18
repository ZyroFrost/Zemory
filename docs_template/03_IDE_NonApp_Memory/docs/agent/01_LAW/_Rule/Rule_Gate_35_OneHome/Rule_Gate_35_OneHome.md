---
id: Rule_35
aka: 02-35
name: one-home
version: 7
kind: judgment
from: _Store/01_LAW/_Rule/Rule_Gate_35_OneHome @v7 #641e890cd064
---
# Rule_Gate_35_OneHome Một thứ một nhà

- Không nhân bản. Cần thêm một thứ ⇒ tra cái đã có trước; có thì dùng lại, chưa có thì thêm một bản ở đúng nhà; bản thừa có sẵn ⇒ đề xuất dọn.
- Tên: một khái niệm một tên, xuyên suốt mã · dữ liệu · tài liệu · bản giao. Bảng tên nghiệp vụ → định danh chốt ở từ điển của repo (slot từ điển). Đổi tên ⇒ đổi một lượt cả mã lẫn dữ liệu đã lưu, rồi chạy kiểm và tìm tên cũ còn sót.
- Một mã chỉ duy nhất trong một phạm vi (số chứng từ đánh riêng theo từng đơn vị) không phải khoá của cả hệ: join theo riêng
  nó là nhân bản chéo đơn vị. Ghép thêm khoá phạm vi, hoặc đặt tên mới cho khoá đã ghép.
- Tên của hệ khác (bảng, cột, file gốc) giữ nguyên; luật tên áp cho thứ repo tự đặt: số đo, cột của bản giao, tên case, tên slot.
- Nội dung: mỗi nội dung sống ở một file đúng vai (vai theo `02_STRUCTURE`); nơi khác dẫn chiếu link + số hiệu, không chép lại.
- Bề mặt: cùng chức năng dùng chung một bề mặt (màn hình · bảng · trang báo cáo) + bộ lọc. Bộ lọc chỉ chọn dòng nào hiện, không đổi cách tính; chế độ mới đổi cách tính ⇒ tách riêng.
- Truy vấn (SQL · DAX · M): mỗi câu có tên, gom ở kho câu (slot của `02_STRUCTURE`), gọi theo tên; không viết rải tại chỗ. Repo có nợ cũ ⇒ số câu viết tại chỗ chỉ được giảm.
- Lối đúng (vế truy vấn): tra kho câu; có thì gọi theo tên; chưa có thì thêm một câu có tên vào kho rồi gọi.
- Phép kiểm: hook chặn câu SQL mới viết tại chỗ khi repo khai kho câu; các vế khác là phán đoán.

## Ví dụ

- Tình huống: một app đối soát có màn "Chi tiết hóa đơn"; cần thêm màn xem hóa đơn theo khung giờ.
- ✗ Sai: vẽ bảng mới với truy vấn riêng; vài tuần sau hai bảng đếm "hóa đơn chưa ký" ra hai số khác nhau cho cùng cửa hàng, cùng ngày.
- ✓ Đúng: dùng lại bảng cũ, thêm chế độ lọc theo giờ; cách tính giữ nguyên, truy vấn gọi theo tên từ kho câu.
