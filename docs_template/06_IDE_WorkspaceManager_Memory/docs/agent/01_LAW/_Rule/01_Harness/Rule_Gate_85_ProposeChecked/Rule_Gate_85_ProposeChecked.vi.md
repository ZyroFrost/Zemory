---
version: 8
lang: vi
---
# Rule_Gate_85_ProposeChecked — Search HS before proposing a new part; amend an existing part when it fits

## Luật là gì
Trước khi đề xuất một luật, điều hiến pháp, slot, khung hay skill mới, phải dò HS tìm phần đã nói điều đó hoặc chứa được nó.
Chỉ đề xuất phần mới khi không phần nào có sẵn nhận được. Thêm luật vào một phần đang có cũng phải dò như vậy.

## Khi nào áp
- Một repo hay một phiên muốn có luật, điều hiến pháp, slot, khung hoặc skill mới — chung hay chỉ cho một repo.
- Lời yêu cầu nói tới "thêm luật", "skill mới", "đề xuất luật" hoặc tương tự.
- Sửa một luật, khung hay skill đang có làm nó có thêm luật: một dòng 🔴, một khoá mới trong `gate.json`, một phép kiểm
  mang nhãn mới trong script của nó.

## Phải làm gì
1. Dò HS tìm phần đã nói cùng điều đó ⇒ có thì không thêm gì.
2. Có phần nhận được (thêm một ý, một ca, một phép kiểm) ⇒ đề xuất sửa phần đó.
3. Chỉ khi không phần nào nhận được ⇒ đề xuất phần mới.
4. Đề xuất nêu tên các phần đã cân nhắc và vì sao từng phần không nhận được. Phần mới ghi chúng ở header:
   `checked: [<phần có sẵn>, …]`.
5. `Rule_Gate_83_HarnessFromStore` vẫn áp: đề xuất gửi phiên zemory, người dùng duyệt, zemory ghi.
6. Slot hay template cấu trúc mới ⇒ cân các slot có sẵn theo ĐƯỜNG DẪN và theo LOẠI FILE, không theo tên, làm đúng
   `Skill_Harness_Structure` §5. Slot mới ghi trong thân bài luật riêng nào làm nó khác từng slot nó chồng lên.
7. Thêm luật vào một phần đang có ⇒ dò như trên trước, trên các luật và các skill nối với phần đó. Rồi trong phần đó:
   `checked:` nêu những phần đã cân · `version` tăng · skill nêu ở `## Implements` luật hay khung mà nó thi hành (không luật
   nào giữ nghĩa vụ mới ⇒ đề xuất thêm vào luật, `Rule_Gate_86_LawLayersAgree`) · mọi phép kiểm mang nhãn trong script của
   skill đều được chữ của một skill nêu tên.

## Ví dụ
- Tình huống: một repo phòng ban muốn có luật "không bao giờ sửa stored procedure trong cơ sở dữ liệu nguồn".
- ✗ Sai: tạo ngay một điều hiến pháp mới cho repo đó.
- ✓ Đúng: dò HS; `Cons_Gate_11_WriteBoundary` đã giữ chuyện được ghi gì, ghi ở đâu ⇒ đề xuất thêm một ca vào khung đó; không cần
  điều mới.
- Tình huống: template tổng quản cần `requirements.txt` và bộ chuẩn chung trong một thư mục nội dung của repo.
- ✗ Sai: đẻ slot `Root_142_Requirements` và `Content_141_WorkspaceStandard`.
- ✓ Đúng: `requirements.txt` là file khai phụ thuộc ⇒ mở rộng đường dẫn của `Root_059_PackageJson`; chuẩn chung thuộc về
  các phần HS (luật, skill, khung) ⇒ rã thư mục đó vào chúng.
- Tình huống: mọi ô lọc của một báo cáo phải có dòng Select all.
- ✗ Sai: viết một dòng 🔴 vào `Skill_PBI_White` và một phép kiểm vào script cổng của nó, không cân phần nào.
- ✓ Đúng: dò các luật và các skill PBI xem đã có nghĩa vụ này chưa; nêu chúng ở `checked:`, tăng `version`, nêu luật mà skill
  thi hành ở `## Implements`, và nêu tên phép kiểm `select-all` trong chữ của skill.

## Máy kiểm
- Guard chặn lệnh Write tạo thư mục phần mới trên HS khi header chưa có `checked:` hoặc nêu một phần không có trên HS; lời chặn
  liệt kê các phần gần nhất.
- Lời nhắc theo từ khoá bật khi lời yêu cầu nói tới thêm hay đề xuất luật, điều, skill, slot.
- Gate (`npm run check`) báo đỏ slot mới so với HEAD mà chồng lên slot có sẵn theo đường dẫn hay loại file, trừ khi
  `checked:` nêu slot đó và thân bài nói nó khác thế nào. Gate thấy cả phần do script ghi.
- Guard chặn lần sửa thêm luật vào một phần đang có (dòng 🔴 trong file đầu, khoá cổng mới trong `gate.json`) tới khi
  `checked:` nêu phần có thật, `version` lớn hơn bản ở commit gần nhất và, với skill, `## Implements` không rỗng. Guard nhận ra
  HS từ đường tuyệt đối, nên repo ghi lên HS cũng bị guard của chính nó soi.
- Gate (`npm run check`) báo đỏ phép kiểm mang nhãn trong script của skill mà không chữ skill nào nêu tên (các nhãn cũ có
  danh sách, chỉ được giảm).
