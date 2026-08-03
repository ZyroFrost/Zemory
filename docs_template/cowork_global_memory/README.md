<!-- zemory template · giới thiệu cho NGƯỜI đọc (agent đọc BOOTSTRAP.md).
     Bản mẫu TRẮNG: không nêu tên dự án, công ty hay cá nhân cụ thể. -->
# Bộ chuẩn cho Claude Cowork — bản nối thẳng bộ nhớ

Dựng **bộ chuẩn làm việc** cho dự án, **và** nối trợ lý vào **kho nhớ** — nơi giữ lại mọi phiên
làm việc trước để lần sau tra lại được, thay vì phải kể lại từ đầu.

---

# BẮT ĐẦU — làm đúng ba bước

**Bước 1.** Mở Claude Cowork → ô chat bấm **Project or folder** → chọn **Add a folder** (gắn
thẳng thư mục dự án) hoặc **Create new project**. Ảnh minh hoạ trong `img/`.

**Bước 2.** Đổi **Auto → Skip all approvals** cho khỏi bấm duyệt từng lệnh.
*Chỉ bật khi đã gắn ĐÚNG thư mục dự án* (đừng gắn cả ổ đĩa hay thư mục cha), và thư mục đó đã
có bản sao hoặc đã commit git.

**Bước 3.** Dán **một** trong hai câu dưới đây — chọn theo việc máy đã cài `zemory` hay chưa.
Không biết đã cài chưa thì cứ dùng câu ①: nó tự kiểm, có sẵn thì không cài lại.

## ① Máy CHƯA cài zemory (hoặc không chắc) — dùng câu này

```
Dựng bộ khung làm việc và kho nhớ cho dự án trong thư mục tôi đã gắn.
Đọc hướng dẫn ở đây rồi làm theo đúng những gì trong đó, không bỏ bước:
https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork_global_memory/BOOTSTRAP.md
Nhớ: hỏi tôi kho nhớ đặt ở thư mục nào TRƯỚC khi cài gì, và hỏi tôi dự án
này thuộc loại nào trước khi dựng bộ chuẩn.
```

Trợ lý sẽ: dò xem máy chạy được không → **hỏi bạn kho nhớ đặt ở đâu** → cài công cụ → dựng bộ
chuẩn → quét dữ liệu → báo cáo. Dò không đạt thì nó tự chuyển sang bộ `cowork/` (bản không cần
cài gì) và nói cho bạn biết.

## ② Máy ĐÃ cài zemory và đã có kho nhớ — dùng câu này

```
Dự án trong thư mục tôi đã gắn cần dựng bộ khung làm việc. Máy này ĐÃ cài
zemory và ĐÃ có kho nhớ rồi.
Đọc hướng dẫn ở đây rồi làm theo, nhưng BỎ QUA phần cài đặt và TUYỆT ĐỐI
KHÔNG dời kho nhớ đang có:
https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork_global_memory/BOOTSTRAP.md
Chạy `zemory memory verify` trước để chắc kho còn lành, rồi hỏi tôi dự án
này thuộc loại nào, rồi mới dựng bộ chuẩn.
```

Trợ lý sẽ: kiểm kho còn lành → **hỏi bạn loại dự án** → dựng bộ chuẩn → quét dữ liệu → báo cáo.
**Không** cài lại, **không** dời kho.

> ⚠ Câu ② quan trọng ở chỗ **cấm dời kho**. Dời kho là thao tác nặng và dễ bỏ sót vài thứ; máy
> đã chạy ổn thì đừng đụng vào.

## Xong rồi thì làm việc bằng lời thường

Không cần câu lệnh, không cần nhớ tên quy trình:

```
đọc docs và chuẩn bị          → mở phiên mới, trợ lý tự đọc sổ sách rồi báo đang làm dở gì
note lại đi                   → ghi việc đã làm + việc còn dở trước khi nghỉ
tìm lại hôm trước mình chốt gì về <chủ đề>   → tra kho nhớ
```

---

# Những điều nên biết

## Có hai bộ cho Cowork

| | `cowork/` (bản đời đầu) | `cowork_global_memory/` (bộ này) |
|---|---|---|
| Cách dựng | **chép từng file** bộ chuẩn về | **cài hẳn công cụ** rồi dùng thẳng |
| Cần gì ở máy | gần như không cần gì | chạy được `node` + tải được gói |
| Bộ chuẩn nhận được | **bản đã cắt gọn** (bảng tra thư mục còn 36/143 dòng) | **bản đầy đủ, y như máy thường** |
| Chấm độ bám chuẩn | script chép kèm | **lệnh thật của công cụ** |
| Kho nhớ | **không có** | **có** |

**Không phải chọn tay** — câu ① tự dò, không đạt thì tự chuyển về bản đời đầu.

## Kho nhớ đặt ở đâu — hai luật, đọc trước khi trả lời trợ lý

Trợ lý sẽ hỏi bạn câu này. Đây là quyết định khó sửa nhất, nên biết trước:

**1. Không đặt trong thư mục đồng bộ đám mây** (Google Drive · OneDrive · Dropbox · iCloud).
Kho nhớ là một cơ sở dữ liệu đang mở gồm ba tệp phải khớp nhau; phần mềm đồng bộ chép từng tệp
một trong lúc chúng đang đổi ⇒ **hỏng kho**. Đã xảy ra thật: một kho gần **1,2 GB hỏng đúng vì
lý do này**, mất gần một ngày để cứu lại.

**2. Kho này là kho RIÊNG, không dùng chung với kho của máy thật.**
Hai bên cùng ghi mà không thấy nhau là cùng một kiểu làm hỏng. Muốn gộp dữ liệu về sau thì dùng
đường xuất/nhập gói đã mã hoá, **không phải** dùng chung tệp.

## Đọc thoải mái — nhưng GHI thì trợ lý phải hỏi bạn

Tra cứu kho nhớ thì tự do. Còn những lệnh **ghi** vào kho (quét thêm dữ liệu, dựng lại chỉ mục,
đồng bộ) thì trợ lý bắt buộc hỏi trước, và phải **liệt kê ở báo cáo cuối** đã ghi những gì.

## Trợ lý phải báo cáo lại những gì

Kho nhớ ở đâu và có lành không · quét được bao nhiêu dữ liệu (**không có thì phải nói thẳng là
không có**) · giao diện mở được hay không · đã ghi những gì · việc nào còn treo.

Tài liệu đầy đủ hơn: `GUIDE.docx` (mở xong bấm `F9` để mục lục tự tính lại số trang).
