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

## Trợ lý sẽ làm gì, theo thứ tự

| | bước | bạn phải quyết |
|---|---|---|
| §0 | dò xem máy ảo có chạy được không — không được thì tự quay về bộ cũ | — |
| **§1** | **hỏi bạn: kho nhớ đặt ở thư mục nào** | ✅ **bạn chốt** |
| §2 | cài công cụ, trỏ kho về đúng chỗ đó, kiểm kho lành | — |
| §3 | hỏi loại dự án rồi dựng bộ chuẩn | ✅ **bạn chốt** |
| §4 | quét dữ liệu từ các nguồn vào kho | — |
| §5 | mở giao diện (nếu môi trường cho phép) | — |
| §6 | đồng bộ nhiều máy — **để sau**, chỉ ghi vào sổ việc | — |

## Hai điều quan trọng nhất về chỗ đặt kho

Đây là quyết định khó sửa nhất, nên trợ lý **phải hỏi bạn trước khi cài gì**.

**1. Không đặt trong thư mục đồng bộ đám mây** (Google Drive · OneDrive · Dropbox · iCloud).
Kho nhớ là một cơ sở dữ liệu đang mở, gồm ba tệp phải khớp nhau; phần mềm đồng bộ chép từng tệp
một trong lúc chúng đang đổi ⇒ **hỏng kho**. Đã xảy ra thật: một kho gần **1,2 GB hỏng đúng vì
lý do này**, mất gần một ngày để cứu lại.

**2. Đây là kho RIÊNG, không dùng chung với máy thật.**
Nếu máy bạn đã dùng công cụ này, nó có kho riêng và **đang mở kho đó**. Trỏ chung vào một tệp là
hai bên cùng ghi mà không thấy nhau — cùng một kiểu làm hỏng. Muốn gộp dữ liệu về sau thì dùng
đường xuất/nhập gói đã mã hoá, **không phải** dùng chung tệp.

## Dùng thế nào

Mở một phiên Cowork, gắn thư mục dự án, rồi dán câu lệnh ở đầu `BOOTSTRAP.md`. Không cần cài gì
trước, không cần biết dòng lệnh.

Xong, trợ lý phải in một **bảng báo cáo cuối**: kho nhớ ở đâu và có lành không, quét được bao
nhiêu dữ liệu (**không có thì phải nói thẳng là không có**), giao diện mở được hay không, đã ghi
những gì, và việc nào còn treo.
