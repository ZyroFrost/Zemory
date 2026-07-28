<!-- zemory template · BẢN CHO NGƯỜI ĐỌC. Cặp với BOOTSTRAP.md (bản cho agent thi hành).
     Bản mẫu TRẮNG: không nêu tên dự án, công ty hay cá nhân cụ thể. -->
# Bộ chuẩn làm việc (harness) — giải thích cho người dùng

> Tài liệu này để **người** đọc, mất khoảng 5 phút. Không cần biết lập trình.
> Bản dành cho AI thi hành là [`BOOTSTRAP.md`](BOOTSTRAP.md) — bạn không cần mở nó.

## 1. Vấn đề nó giải

Khi giao việc cho một trợ lý AI, ba chuyện lặp lại đến mức mệt mỏi:

- **Phải giải thích lại từ đầu mỗi lần.** Phiên hôm nay không biết hôm qua đã chốt gì.
- **Mỗi lần làm ra một kiểu.** Cùng một yêu cầu, hai lần cho hai định dạng khác nhau.
- **Không biết nó đã làm gì.** Kết quả hiện ra, nhưng quyết định ở giữa thì không ai ghi lại.

Gốc của cả ba là cùng một thứ: **trợ lý không có chỗ nào để đọc luật chơi.**

## 2. Harness là gì

Harness là **bộ quy tắc thành văn của công việc, viết ra thành file, đặt ngay trong thư mục làm việc.**

Cách hình dung gần nhất: bộ tài liệu bàn giao cho một nhân sự mới. Người mới đọc xong là biết
công ty làm gì, quy trình ra sao, việc đang tới đâu, đã quyết những gì — thay vì hỏi lại từng người.
Khác biệt duy nhất: người mới ở đây là trợ lý AI, và **nó đọc lại toàn bộ tập tài liệu đó ở đầu
mỗi phiên làm việc**, không quên, không cần bạn nhắc.

Đó cũng là lý do harness là **file nằm trong thư mục** chứ không phải một thiết lập bấm chọn:
file thì bạn đọc được, sửa được, và thấy được nó đổi lúc nào.

## 3. Từng lớp làm gì

Tám file, chia ba tầng theo mức độ bền: **luật** (gần như không đổi) → **chuẩn** (đổi khi cách làm
đổi) → **sổ** (đổi mỗi phiên).

| Lớp | File | Vai trò | Ai được sửa |
|---|---|---|---|
| Cửa vào | `AGENTS.md` | Chỉ đường: dự án này là gì, đọc gì trước | Trợ lý, khi bạn duyệt |
| **Luật** | `docs/agent/01_CONSTITUTION.md` | **Hiến pháp**: dự án tồn tại để làm gì, và những thứ **cố tình không làm** | **Chỉ bạn.** Trợ lý chỉ được đề xuất |
| **Luật** | `docs/agent/02_RULES.md` | Luật làm việc chung: ngôn ngữ, cách ghi sổ, khi nào phải hỏi lại, khi nào cấm tự quyết | Ít khi đổi |
| **Chuẩn** | `docs/agent/03_STRUCTURE.md` | Cấu trúc thư mục + bảng tra **"cần gì → để ở đâu"**. Thứ chấm dứt cảnh mỗi file một chỗ | Đổi khi cách tổ chức đổi |
| **Chuẩn** | `docs/agent/04_SKILLS.md` | Kho quy trình thao tác: hỏi lại cho rõ · kết sổ phiên · nắn lại thư mục · kéo/điền/xuất file | Thêm khi có việc lặp mới |
| **Sổ** | `docs/agent/05_TODO.md` | Việc **chưa xong** và việc **đang dở**, kèm đã tới đâu | Trợ lý cập nhật liên tục |
| **Sổ** | `docs/agent/06_CHANGES.md` | Nhật ký việc **đã xong** — chỉ được ghi **sau khi bạn xác nhận** | Trợ lý, sau khi bạn OK |
| Bối cảnh | `docs/plan/00_overview.md` | Mô tả dự án: làm gì, cho ai, gồm những phần nào | Trợ lý soạn, bạn duyệt |

*(Kèm một file kỹ thuật nhỏ `docs/.harness.json` — chỉ là dấu hiệu "thư mục này đã có bộ chuẩn". Bỏ qua được.)*

**Hai lớp đáng để ý nhất:**

- **Hiến pháp (`01`)** là thứ duy nhất **chỉ bạn được chốt**. Nó giữ mục đích và ranh giới của dự án.
  Có nó, khi trợ lý đề xuất một hướng "nghe hay nhưng lệch việc", chính nó là căn cứ để từ chối.
- **Sổ (`05` + `06`)** là trí nhớ nối giữa các phiên. Đây là chỗ bạn liếc vào để biết
  *"hôm qua tới đâu rồi"* mà không phải hỏi.

## 4. Nó đổi công việc hằng ngày thế nào

| | Trước | Sau khi có harness |
|---|---|---|
| Mở phiên mới | Kể lại bối cảnh từ đầu | Nói thẳng việc cần làm |
| Định dạng kết quả | Mỗi lần một kiểu | Theo đúng chuẩn đã ghi |
| File mới sinh ra | Nằm rải, tìm lại mất công | Vào đúng chỗ đã quy định |
| Kết thúc phiên | Không còn dấu vết | Việc xong vào `06_CHANGES`, việc dở vào `05_TODO` |
| Yêu cầu chưa rõ | Trợ lý đoán rồi làm | Trợ lý **hỏi lại, mỗi lần một câu**, kèm đề xuất |

## 5. Bạn cần làm gì — và không cần làm gì

**Cần (ba việc, đều ngắn):**
1. **Trả lời vài câu lúc dựng** — dự án làm gì, cho ai, đầu ra là loại file nào. Trợ lý hỏi từng câu một.
2. **Duyệt đề xuất.** Trợ lý trình bảng "file này nên chuyển sang đâu" và bản tóm tắt dự án; bạn gật hoặc sửa.
3. **Xác nhận khi xong việc**, để nó được ghi vào nhật ký.

**Không cần:** học câu lệnh · cài phần mềm · nhớ tên file · tự sắp xếp thư mục.

**Ba điều trợ lý bị cấm** (đã ghi thành luật trong `02_RULES`, không phải lời hứa suông):
- Không tự xoá, không tự di chuyển file của bạn — chỉ được đề xuất rồi chờ duyệt.
- Không tự sửa hiến pháp.
- Không ghi vào nhật ký khi bạn chưa xác nhận.

## 6. Bắt đầu

1. Tạo một thư mục cho công việc (hoặc dùng thư mục đang có).
2. Trong ứng dụng, tạo một dự án trỏ vào thư mục đó.
3. Mở phiên và dán một dòng:

   > Tải `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork/BOOTSTRAP.md`
   > rồi làm theo đúng những gì trong đó.

Trợ lý sẽ tự dựng bộ chuẩn, tự đọc thư mục để hiểu bạn đang làm gì, rồi hỏi bạn phần nó không tự biết được.

## 7. Hỏi nhanh

**Dữ liệu của tôi đi đâu?** Bộ chuẩn là các file `.md` nằm trong chính thư mục của bạn. Dự án
trong ứng dụng lưu **trên máy bạn**, không đồng bộ lên đám mây và không chia sẻ cho ai.

**Nó có sửa file công việc của tôi không?** Không, trừ khi bạn đồng ý. Bước sắp xếp lại thư mục
được trình ra dưới dạng bảng đề xuất để bạn duyệt từng mục.

**Tôi sửa tay các file `.md` được không?** Được — chúng là văn bản thường. File là bản gốc; sửa gì
trợ lý đọc nấy ở phiên sau.

**Nếu tôi bỏ ngang giữa chừng?** Phần đã dựng vẫn dùng được. Bộ chuẩn không đòi phải điền hết
mới chạy; chỗ nào chưa rõ sẽ được ghi thẳng là *chưa rõ* thay vì bịa cho đầy.
