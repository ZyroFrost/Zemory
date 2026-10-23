---
version: 21
lang: vi
---
# Rule_Gate_27_HarnessLanguage — Cách viết docs harness, và chữ dùng trong đó

## Luật là gì
Mỗi phần của harness (luật, khung hiến pháp, slot, structure, skill) có MỘT file gốc `<phần>.md` viết tiếng Anh: file duy nhất
agent đọc, và là nguồn sự thật. Bản dịch cho từng ngôn ngữ người đọc nằm cạnh nó, mỗi ngôn ngữ một file
`<phần>.<mã ISO 639-1>.md` (`Rule_Gate_27_HarnessLanguage.vi.md`). Docs harness viết giọng đặc tả rõ ràng, mỗi thứ một chữ cố
định, không trích lời ai, không ghi ngày chốt.

## Khi nào áp
- Viết hoặc sửa bất kỳ docs harness nào.
- Gọi tên một thứ của harness trong bất kỳ văn bản nào agent đọc.

## Phải làm gì
1. Viết file gốc chỉ bằng tiếng Anh. Ngôn ngữ của người đọc nằm ở các file dịch bên cạnh, mỗi ngôn ngữ một file; thêm một
   ngôn ngữ bằng cách chép file gốc thành `<phần>.<mã>.md` rồi dịch. Phần không có bản dịch vẫn đủ.
2. Bản dịch có cùng các mục, cùng số bước với file gốc, và `version:` bằng version của file gốc nó dịch từ. Sửa file gốc trước,
   rồi đưa từng bản dịch lên version đó.
3. Viết luật theo năm phần: Luật là gì · Khi nào áp · Phải làm gì · Ví dụ (✗ sai / ✓ đúng, dùng tên thật, số thật) · Máy kiểm
   (máy chặn gì, hoặc "không có máy, agent tự giữ"). Câu ngắn; thuật ngữ nội bộ giải thích ở lần đầu.
4. Trước khi chốt một luật, đọc lại như người mới và tự giải ví dụ; hiểu sai ⇒ viết lại.
5. Không trích lời ai, không ghi ngày chốt, không tên người hay email, không đường dẫn mang tên người. Lời gốc, ngày và sự cố ghi
   ở `05_CHANGES` và Global Memory.
6. Dùng đúng chữ trong bảng dưới; không bao giờ viết "kho" trơn — viết DW hoặc HS.
7. Thứ đã có tên trong hệ thống (vai, lệnh, phần, khoá) gọi bằng định danh tiếng Anh của nó, ở mọi ngôn ngữ: `workspace-manager`,
   `dept`, `zemory sync`. Một tên viết trọn một ngôn ngữ: không đặt nhãn nửa Anh nửa Việt cho thứ đã có tên ("repo con"). Văn
   quanh nó viết rõ ràng, chuyên nghiệp.

| Chữ | Nghĩa |
|---|---|
| HS (harness store) | `docs_template/_Store` trong zemory — nơi duy nhất làm luật, khung, slot, structure, skill |
| DW | kho dữ liệu của vùng |
| bộ mẫu | thư mục `docs_template/0N_*` ráp từ HS |
| phần | một thư mục trên HS: luật, khung, slot, structure hoặc skill |
| luật | phần trong `01_LAW/_Rule`, dùng chung cho mọi repo của bộ mẫu |
| khung | phần trong `01_LAW/_Cons`, bắt repo khai một loại bất biến trong `Cons.md` |
| bộ luật · chương | thư mục chia luật (`01_Harness` …) · chia khung (`01_Scope` …) theo chủ đề |
| sổ | `04_TODO.md` · `05_CHANGES.md` — trí nhớ của repo, không phải harness |
| tổng quản | repo quyết khung và chuẩn của repo khác (`Struc_Region_Workspace`) |
| `workspace-manager` · `dept` | vai của repo tổng quản một cụm và của các repo phòng ban nó quản (`role.name` trong structure của chúng) |
| bộ câu truy vấn · thư viện icon · bảng thuật ngữ | các câu truy vấn có tên · icon của vùng · bảng thuật ngữ nghiệp vụ của vùng |
| tồn kho · nhập kho · kho hàng | hàng hoá trong kho hàng thật — từ nghiệp vụ, không phải DW |

## Ví dụ
- Tình huống: thêm một luật mới sau một sự cố mất dữ liệu.
- ✗ Sai: luật kể lại sự cố, trích lời người nói kèm ngày, và gọi DW bằng một chữ cũng có thể hiểu là HS.
- ✓ Đúng: file gốc tiếng Anh của luật ghi Khi nào áp · Phải làm gì · Máy kiểm và ghi "sửa bảng trên DW", còn `.vi.md` nói đúng
  điều đó bằng tiếng Việt, cùng version; câu chuyện, lời gốc và ngày để ở changelog.
- Tình huống: cần harness bằng tiếng Nhật.
- ✗ Sai: thêm chữ tiếng Nhật ngay dưới tiếng Anh trong file gốc, nên mỗi lần agent đọc phải trả tiền cho cả hai.
- ✓ Đúng: viết `Rule_Gate_27_HarnessLanguage.ja.md` cạnh file gốc, đủ năm mục và bảy bước `Phải làm gì`, `version:` bằng file gốc.

## Máy kiểm
- Guard chặn agent Read một bản dịch (`<phần>.<mã>.md` trong HS hoặc trong bất kỳ `docs/agent` nào) và chỉ sang file gốc tiếng
  Anh; mở bản dịch để sửa cần cờ dùng một lần `.allow-translation`.
- Kiểm tra của HS báo đỏ file gốc còn mang mục của ngôn ngữ khác, và bản dịch thiếu một mục hoặc lệch số bước `Phải làm gì` so
  với file gốc. Bản dịch có `version:` thấp hơn file gốc được nêu tên (chỉ nhắc).
- Hook chặn, trong các dòng mới của docs harness: lời trích của một người, ngày chốt, email, đường dẫn mang tên người.
- Cùng hook đó chặn chữ "kho" đứng trơn trong dòng mới của MỌI file văn xuôi repo viết — docs harness, plan, hai sổ, spec của
  case, README (trừ archive và attic): viết DW hoặc HS. Cho qua "kho dữ liệu" và các từ kho hàng "tồn kho" · "nhập kho" ·
  "xuất kho" · "kiểm kho" · "kho hàng".
- Cùng hook đó chặn nhãn ghép "repo con" · "repo cha" trong dòng mới của cùng các file: gọi bằng vai (`dept`), hoặc nói repo đó
  là gì bằng một ngôn ngữ. Cổng HS đếm cùng các chữ đó: một file HS không được tệ hơn HEAD.
- Tiếng Việt mất dấu do `Rule_Gate_31_NoBrokenVietnamese` chặn.
- Giọng văn là phán đoán.
