<!-- zemory template · giới thiệu cho NGƯỜI đọc (agent đọc BOOTSTRAP.md).
     Bản mẫu TRẮNG: không nêu tên dự án, công ty hay cá nhân cụ thể. -->
# Bộ chuẩn cho Claude Cowork — bản nối thẳng bộ nhớ

Bộ này dựng **bộ chuẩn làm việc** cho một dự án, **và** nối trợ lý vào **bộ nhớ chung** — kho
hội thoại của mọi phiên làm việc trước, trên mọi máy.

## Có hai bộ cho Cowork — chọn bộ nào

| | `cowork/` (bộ cũ) | `cowork_global_memory/` (bộ này) |
|---|---|---|
| Cách dựng | **chép từng file** bộ chuẩn về | **cài hẳn công cụ** rồi dùng thẳng |
| Cần gì ở máy ảo | gần như không cần gì | cần chạy được `node` + tải được gói |
| Bộ chuẩn nhận được | bản đã cắt gọn cho vừa | **bản đầy đủ** |
| Bộ nhớ chung | **không có** | **có** — tra lại được việc đã làm tháng trước |
| Rủi ro | thấp | phải cẩn thận khi **ghi** vào bộ nhớ (xem dưới) |

**Không phải chọn tay.** `BOOTSTRAP.md` của bộ này mở đầu bằng ba lệnh dò; dò không đạt thì nó
tự bảo trợ lý quay về bộ cũ.

## Vì sao bộ nhớ chung đáng giá

Không có nó, mỗi phiên Cowork bắt đầu từ số không: bạn phải kể lại bối cảnh, nhắc lại quyết định
cũ, giải thích lại vì sao lần trước làm thế. Có nó, trợ lý **tự tra**: việc này đã làm chưa, hôm
đó chốt ra sao, ai đã nói gì.

Đây là thứ mà cách chép file **không bao giờ có được** — bộ chuẩn chép về chỉ là mấy tài liệu quy
định cách làm việc, còn bộ nhớ là toàn bộ lịch sử thật.

## Điều quan trọng nhất phải biết trước khi dùng

**Đọc bộ nhớ thì thoải mái. GHI vào thì trợ lý phải hỏi bạn trước.**

Bộ nhớ là **một tệp dùng chung**. Máy thật của bạn rất có thể đang mở nó ngay lúc đó (có tiến
trình chạy nền ghi vào sau mỗi lượt trò chuyện). Hai bên cùng ghi mà không thấy nhau là cách
làm **hỏng tệp** — đã xảy ra thật: một kho gần 1,2 GB hỏng chỉ vì một phần mềm đồng bộ đám mây
đụng vào tệp trong lúc nó đang được ghi, mất gần một ngày để cứu lại.

Vì vậy `BOOTSTRAP.md` bắt trợ lý:
- kiểm sức khoẻ kho **trước** khi đụng vào;
- kiểm kho có nằm trong thư mục đồng bộ đám mây không (**không được nằm trong đó**);
- **hỏi bạn** trước mọi lệnh ghi, và **liệt kê ra ở báo cáo cuối** đã ghi những gì.

## Dùng thế nào

Mở một phiên Cowork, gắn thư mục dự án, rồi dán câu lệnh ở đầu `BOOTSTRAP.md`. Không cần cài gì
trước, không cần biết dòng lệnh.

Xong, trợ lý phải in một **bảng báo cáo cuối**: đã dựng được gì, kho nhớ ở đâu và có lành không,
đã ghi những gì vào kho (hoặc "không ghi gì"), và việc nào còn treo.
