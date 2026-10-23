---
version: 10
lang: vi
---
# Rule_Gate_35_OneHome — One thing, one home

## Luật là gì
Mỗi thứ chỉ tồn tại một lần: một bản cho một nội dung, một tên cho một khái niệm, một màn cho một chức năng, một câu truy vấn có
tên cho một cách tính. Mọi chỗ khác trỏ về đó.

## Khi nào áp
- Thêm bất cứ thứ gì: file, tên, màn hình, câu truy vấn, đoạn văn.
- Thấy cùng một thứ ở hai nơi.

## Phải làm gì
1. Tìm cái đã có trước; có thì dùng lại. Không có ⇒ thêm một bản ở đúng nhà. Thấy bản trùng ⇒ đề xuất dọn.
2. Tên: một khái niệm một tên, xuyên suốt mã, dữ liệu, tài liệu, bản giao. Tên nghiệp vụ ánh xạ sang định danh ở chỗ riêng của
   repo cho việc đó (khung hiến pháp `Cons_Gate_12_SourceOfTruth`). Đổi tên ⇒ đổi một lượt cả mã lẫn dữ liệu đã lưu, rồi tìm tên cũ.
3. Một mã chỉ duy nhất trong một đơn vị (số chứng từ mỗi cửa hàng tự đánh) không phải khoá của cả hệ: join theo riêng nó là nhân
   dòng chéo đơn vị. Thêm đơn vị vào khoá, hoặc đặt tên cho khoá đã ghép.
4. Tên do hệ khác đặt (bảng, cột, file nguồn của họ) giữ nguyên; luật này áp cho thứ repo tự đặt tên: measure, cột của bản giao,
   tên case, tên slot.
5. Nội dung: mỗi nội dung sống ở một file đúng vai; chỗ khác dẫn link kèm số hiệu, không chép lại.
6. Màn hình: một chức năng một màn (hoặc trang báo cáo) cộng bộ lọc. Bộ lọc chỉ chọn dòng, không đổi cách tính; cách tính mới ⇒
   màn riêng.
7. Truy vấn (SQL · DAX · M): mỗi câu có tên, nằm trong bộ câu truy vấn của repo (một slot cấu trúc), gọi theo tên, không viết tại
   chỗ. Repo có câu viết tại chỗ từ trước thì chỉ được giảm số đó.

## Ví dụ
- Tình huống: app đối soát có màn "Chi tiết hóa đơn"; cần thêm màn xem hóa đơn theo giờ.
- ✗ Sai: vẽ bảng mới với truy vấn riêng; vài tuần sau hai bảng đếm "hóa đơn chưa ký" ra hai số khác nhau cho cùng cửa hàng, cùng
  ngày.
- ✓ Đúng: dùng lại bảng cũ, thêm bộ lọc theo giờ; cách tính giữ nguyên, truy vấn gọi theo tên từ bộ câu truy vấn.

## Máy kiểm
- Hook chặn câu SQL mới viết tại chỗ khi repo khai bộ câu truy vấn; các ý khác là phán đoán.
