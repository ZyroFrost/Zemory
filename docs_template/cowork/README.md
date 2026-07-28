<!-- zemory template · BẢN CHO NGƯỜI ĐỌC. Cặp với BOOTSTRAP.md (bản cho trợ lý thi hành).
     Bản mẫu TRẮNG: không nêu tên dự án, công ty hay cá nhân cụ thể.
     Văn phong: MÔ TẢ — không ví dụ ẩn dụ, không kể chuyện. Hạn chế viết tắt và thuật ngữ. -->
# Bộ chuẩn làm việc — mô tả

> Tài liệu này mô tả bộ chuẩn cho **người** đọc: gồm những gì, mỗi phần giữ vai trò nào,
> và nó thay đổi cách làm việc ra sao.
> Bản dành cho trợ lý thi hành là [`BOOTSTRAP.md`](BOOTSTRAP.md) — người dùng không cần mở.

## 1. Định nghĩa

Bộ chuẩn là **tập tài liệu quy định cách làm việc của một dự án, lưu thành file ngay trong
thư mục làm việc**. Trợ lý đọc lại toàn bộ tập này ở đầu mỗi phiên, rồi làm theo.

Ba hệ quả trực tiếp:

| Không có bộ chuẩn | Có bộ chuẩn |
|---|---|
| Mỗi phiên phải mô tả lại bối cảnh | Bối cảnh nằm trong file, trợ lý tự đọc |
| Cùng một yêu cầu cho kết quả khác nhau giữa các lần | Quy ước cố định, kết quả nhất quán |
| Không còn dấu vết việc đã làm và lý do | Việc xong ghi nhật ký, việc dở ghi lại tình trạng |

Bộ chuẩn là file văn bản thường: đọc được, sửa được, và thấy được nó thay đổi lúc nào.

## 2. Các từ cần biết

Bốn từ; phần còn lại của tài liệu dùng ngôn ngữ thông thường.

| Từ | Nghĩa trong tài liệu này |
|---|---|
| **Bộ chuẩn** | Tập tài liệu quy định cách làm việc, đặt trong thư mục `docs/` |
| **Sản phẩm giao đi** | Kết quả cuối cùng của dự án: báo cáo, mô hình dữ liệu, nội dung, hoặc bản thiết kế |
| **Phiên** | Một lần mở trợ lý ra làm việc |
| **Nguồn** | Dữ liệu hoặc file đầu vào, dùng để tạo ra sản phẩm giao đi |

## 3. Cây thư mục

Ký hiệu: `★` bắt buộc · `◆` phải có ít nhất một · `[tuỳ]` chỉ tạo khi đã có nội dung thật.

```
<thư mục làm việc>/
│
├── AGENTS.md                    ★  trang chỉ đường: dự án này là gì, phải đọc gì trước
├── CLAUDE.md                    ★  cửa vào thứ hai, chỉ nạp lại AGENTS.md (một số công cụ chỉ đọc file này)
├── docs/                        ★  toàn bộ bộ chuẩn nằm trong đây
│   ├── .harness.json            ★  dấu hiệu "thư mục này đã có bộ chuẩn"
│   ├── agent/                   ★
│   │   ├── 01_CONSTITUTION.md      mục đích dự án + những việc cố tình không làm
│   │   ├── 02_RULES.md             luật làm việc: khi nào phải hỏi lại, khi nào cấm tự quyết
│   │   ├── 03_STRUCTURE.md         quy định thư mục + bảng tra "cần gì thì để ở đâu"
│   │   ├── 04_SKILLS.md            các quy trình thao tác dùng lại nhiều lần
│   │   ├── 05_TODO.md              việc chưa xong và đang dở, kèm đã tới bước nào
│   │   └── 06_CHANGES.md           nhật ký việc đã xong
│   ├── plan/                    ★
│   │   └── 00_overview.md          mô tả dự án: làm gì, cho ai, gồm những phần nào
│   └── dictionary.md         [tuỳ]  định nghĩa các chỉ số và cột dữ liệu dùng chung
│
│   ────────── phần dưới chỉ tạo khi đã có nội dung thật ──────────
│
├── reports/                     ◆  báo cáo giao đi
├── models/                      ◆  mô hình dữ liệu giao đi
├── content/                     ◆  nội dung viết giao đi
├── design/                      ◆  bản thiết kế giao đi
├── sources/                  [tuỳ]  dữ liệu và mô tả nguồn đầu vào
├── templates/                [tuỳ]  file mẫu trống, chờ điền số liệu
├── tasks/                    [tuỳ]  mô tả từng công việc lặp theo kỳ (tuần, tháng)
├── pipelines/                [tuỳ]  các bước xử lý chạy theo thứ tự
├── queries/                  [tuỳ]  câu truy vấn dữ liệu, đặt tên và gọi theo tên
├── measures/                 [tuỳ]  công thức tính, đặt tên và ghi chú
├── notebooks/                [tuỳ]  phân tích thăm dò
├── fixtures/                 [tuỳ]  dữ liệu mẫu nhỏ, đủ để mở sản phẩm ra xem
├── assets/                   [tuỳ]  logo, bảng màu, biểu tượng
├── scripts/                  [tuỳ]  đoạn tự động: lấy dữ liệu về, điền, xuất bản
├── config/                   [tuỳ]  thông số kết nối theo từng máy
├── attic/                    [tuỳ]  bản cũ giữ lại để quay về khi cần
├── docs_visual/              [tuỳ]  sơ đồ và hình minh hoạ để người xem
├── README.md                       giới thiệu dự án (đã có sẵn thì giữ nguyên)
│
│   ────────── không đưa lên kho lưu trữ chung ──────────
│
├── data/                     [tuỳ]  file dữ liệu thật: nặng, hoặc riêng tư
├── exports/                  [tuỳ]  bản xuất ra (tài liệu, ảnh) — tạo lại được
└── .env                      [tuỳ]  chuỗi kết nối và mã truy cập
```

**Không tạo thư mục rỗng.** Danh sách trên là bảng tên có sẵn để tra, không phải danh sách phải
tạo cho đủ. Một dự án thông thường chỉ dùng đến 4–10 thư mục trong số đó.

## 4. Vai trò từng file

| File | Nội dung | Ai được sửa | Tần suất đổi |
|---|---|---|---|
| `AGENTS.md` | Tên dự án, mô tả ngắn, chỉ dẫn đọc gì trước | Trợ lý, sau khi người dùng duyệt | Hiếm |
| `01_CONSTITUTION.md` | Dự án tồn tại để làm gì, phục vụ ai; và những việc **cố tình không làm** | **Chỉ người dùng.** Trợ lý chỉ được đề xuất, ghi vào `05_TODO.md` chờ duyệt | Hiếm |
| `02_RULES.md` | Luật làm việc: ngôn ngữ, cách ghi sổ, điều kiện phải hỏi lại, giới hạn phạm vi, quy định về xoá và sửa | Đi kèm bộ chuẩn, ít khi đổi | Hiếm |
| `03_STRUCTURE.md` | Quy định thư mục và bảng tra "cần gì thì để ở đâu" | Khi cách tổ chức dự án đổi | Thỉnh thoảng |
| `04_SKILLS.md` | Các quy trình lặp lại: hỏi lại cho rõ, kết sổ cuối phiên, sắp xếp lại thư mục, lấy dữ liệu, điền, xuất bản | Khi có việc lặp mới | Thỉnh thoảng |
| `05_TODO.md` | Việc chưa xong, việc đang dở, đã tới bước nào, bước kế tiếp là gì | Trợ lý cập nhật trong lúc làm | Mỗi phiên |
| `06_CHANGES.md` | Nhật ký việc đã xong, xếp theo ngày, mới nhất ở trên | Trợ lý, **chỉ sau khi người dùng xác nhận** | Mỗi phiên |
| `plan/00_overview.md` | Mô tả dự án: làm gì, cho ai, gồm những phần nào, các phần ghép lại ra sao | Trợ lý soạn, người dùng duyệt | Thỉnh thoảng |

### Ba nhóm theo mức độ ổn định

| Nhóm | File | Quyết định điều gì |
|---|---|---|
| **Luật** | `01`, `02` | Dự án được phép và không được phép làm gì. Gần như không đổi |
| **Chuẩn** | `03`, `04` | File để ở đâu; việc lặp làm theo trình tự nào. Đổi khi cách làm đổi |
| **Sổ** | `05`, `06` | Trạng thái công việc. Đổi mỗi phiên, nối các phiên lại với nhau |

Hai file đáng chú ý:

- `01_CONSTITUTION.md` là file duy nhất **chỉ người dùng được chốt**. Nó ghi mục đích và giới hạn
  của dự án, và là căn cứ để từ chối một đề xuất lệch hướng.
- `05_TODO.md` và `06_CHANGES.md` là phần nối giữa các phiên. Mở hai file này là biết công việc
  đang ở đâu, không phải hỏi lại.

## 5. Trình tự một phiên làm việc

1. Trợ lý đọc `AGENTS.md`, toàn bộ `docs/agent/`, và `docs/plan/00_overview.md`.
2. Người dùng mô tả việc cần làm.
3. Yêu cầu chưa đủ rõ → trợ lý **hỏi lại, mỗi lần một câu, kèm phương án đề xuất**; đủ rõ mới bắt đầu.
4. Trợ lý làm việc, đặt file mới vào đúng thư mục theo `03_STRUCTURE.md`.
5. Cần sửa hoặc di chuyển file sẵn có → trình bảng đề xuất, chờ người dùng duyệt từng mục.
6. Kết thúc phiên: việc còn dở ghi vào `05_TODO.md`; việc đã xong, **sau khi người dùng xác nhận**,
   ghi vào `06_CHANGES.md`.

## 6. Ràng buộc

**Người dùng làm ba việc:**
1. Trả lời câu hỏi lúc dựng: dự án làm gì, phục vụ ai, sản phẩm giao đi là loại file nào.
2. Duyệt các bảng đề xuất: sắp xếp file, mô tả dự án, quy trình mới.
3. Xác nhận khi một việc đã xong, để nó được ghi vào nhật ký.

Không cần học câu lệnh, không cần cài phần mềm, không cần nhớ tên file.

**Trợ lý bị cấm ba việc** — quy định trong `02_RULES.md`:
1. Xoá hoặc di chuyển file của người dùng khi chưa được duyệt.
2. Tự sửa `01_CONSTITUTION.md`.
3. Ghi vào `06_CHANGES.md` khi người dùng chưa xác nhận.

## 7. Dựng bộ chuẩn

1. Chuẩn bị thư mục làm việc (mới, hoặc đã có sẵn nội dung).
2. Tạo một dự án trong ứng dụng, trỏ vào thư mục đó.
3. Mở phiên và dán một dòng:

   > Tải `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork/BOOTSTRAP.md`
   > rồi làm theo đúng những gì trong đó.

Trợ lý tạo bộ chuẩn, đọc toàn bộ thư mục để nắm hiện trạng, trình bảng đề xuất sắp xếp,
rồi hỏi những phần nó không tự xác định được.

## 8. Giới hạn

- Bộ chuẩn quy định **cấu trúc và cách làm việc**, không quy định **nội dung chuyên môn** của dự án.
- Bộ chuẩn không tự chạy: nó chỉ có tác dụng khi trợ lý được yêu cầu đọc ở đầu phiên.
- Phần nào chưa đủ dữ kiện sẽ được ghi thẳng là *chưa rõ*, không suy đoán cho đầy.
- Dự án trong ứng dụng lưu **trên máy người dùng**; bộ chuẩn là các file trong chính thư mục làm việc.
