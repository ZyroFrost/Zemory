---
id: Rule_85
name: propose-checked
version: 3
kind: action
code: 01_Harness
checked: [Rule_Gate_83_HarnessFromStore, Rule_Core_80_SharedChangeImpact, Rule_Keys_62_DesignChangeApproval]
from: _Store/01_LAW/_Rule/01_Harness/Rule_Gate_85_ProposeChecked @v3 #16b69b3bac78
---
# Rule_Gate_85_ProposeChecked Đề xuất thêm luật / phần harness: dò kho trước, gộp được thì gộp

- Đề xuất thêm một phần harness (luật · điều hiến pháp · slot · skill), của chung hay của riêng một repo, đi theo ba bước, theo
  đúng thứ tự:
  1. Dò kho: phần nào đã nói cùng điều đó ⇒ không thêm gì.
  2. Bổ sung được vào một phần có sẵn (thêm một ý, một ca, một phép kiểm) ⇒ đề xuất sửa phần đó.
  3. Chỉ khi không gộp được vào phần nào mới đề xuất một phần mới.
- Đề xuất nêu rõ đã dò những phần nào và vì sao không gộp được; phần mới khai các phần đã cân nhắc ở dòng header
  `checked: [<phần có sẵn>, …]`.
- Luật 83 vẫn áp dụng: đề xuất gửi phiên zemory; người dùng duyệt; zemory ghi.
- Phép kiểm: guard chặn lệnh Write tạo thư mục phần mới trong kho khi header chưa có `checked:` hoặc nêu một phần không có trong
  kho; lời chặn liệt kê các phần gần nhất. Lời nhắc theo từ khoá khi yêu cầu nói tới thêm / đề xuất luật, điều, skill, slot.

## Ví dụ

- Tình huống: một repo phòng ban muốn thêm luật "không sửa proc trong DB nguồn".
- ✗ Sai: tạo ngay một điều hiến pháp mới riêng cho repo.
- ✓ Đúng: dò HS, thấy `Cons_Gate_11_WriteBoundary` đã giữ ranh giới ghi ⇒ đề xuất bổ sung một ca vào khung đó; không cần
  điều mới.
