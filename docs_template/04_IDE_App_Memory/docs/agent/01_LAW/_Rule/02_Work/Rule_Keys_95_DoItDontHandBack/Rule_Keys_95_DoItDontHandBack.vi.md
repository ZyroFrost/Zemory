---
version: 2
lang: vi
---
# Rule_Keys_95_DoItDontHandBack — Việc agent làm được thì tự làm; không đẩy về cho người dùng

## Luật là gì
Việc agent tự làm được — dọn dẹp trong tầm tay, file do app quản lý, lệnh của app, sửa thứ chính nó làm sai — thì agent làm, không
đẩy lại cho người dùng dưới dạng lời hướng dẫn. Plan hay danh sách đã giao thì thực hiện, không biến thành các lựa chọn.

## Khi nào áp
- Lượt sắp kết thúc bằng "bạn làm X ở màn Y", "làm A hay B?" cho việc đã quyết, hoặc một danh sách bước cho người dùng.
- Một repo khác báo về thứ agent đã viết hoặc làm sót.

## Phải làm gì
1. Việc trong tầm tay ⇒ làm: qua endpoint của app khi app quản lý file đó, không thì dừng thứ đang giữ file, sửa, bật lại. Làm được
   thì không phải lý do để hỏi. Chỉ dừng đúng tiến trình đang giữ handle (tìm theo handle); không bao giờ bảo người dùng đóng trình
   soạn thảo.
2. Trước khi bảo người dùng "bấm X ở màn Y", kiểm X có thật và làm được; không bao giờ khuyên một thao tác không tồn tại.
3. Danh sách hay plan đã giao ⇒ làm trọn. Quyết định thật sự thuộc người dùng ⇒ một đoạn: số đo, đề xuất, một câu hỏi — không bao
   giờ một bộ lựa chọn.
4. "Làm tiếp" là xây trọn mục kế tiếp; "xác minh" là đo rồi dừng (`Rule_Keys_07_ScopeOnly`). Đọc đúng động từ người dùng dùng.
5. Lỗi của chính agent bị repo khác báo ⇒ sửa, báo lại, đo lại tới khi repo đó sạch; không trình phương án rồi chờ.
6. Việc chung theo plan ⇒ các phiên tự quyết ai làm phần nào, kể cả việc trên chính máy.
7. Bước tay chỉ người dùng làm được ⇒ một dòng nêu sự thật; không viết hướng dẫn từng bước trong câu trả lời. Tài liệu được phát
   hành (README và tương tự) vẫn viết đầy đủ.

## Ví dụ
- Tình huống: một mục cũ trong danh sách do app quản lý; màn hình của app ẩn nó đi.
- ✗ Sai: "bạn gỡ nó ở màn Dự án" — màn đó không hiện được mục ấy, lời khuyên không tồn tại.
- ✓ Đúng: gỡ qua endpoint của app rồi báo đã xong.

## Máy kiểm
- Cửa nhắc (hook prompt): lời người dùng chỉ ra việc bị đẩy về thì nhắc luật một lần mỗi phiên.
- Đo: câu trả lời của phiên kết thúc bằng việc đã làm, hoặc một câu hỏi về quyết định thuộc người dùng.

## Liên kết
- Liên quan: `Rule_Keys_07_ScopeOnly` — làm đúng việc được giao; xác minh là dừng
- Liên quan: `Rule_Keys_08_ClarifyFirst` — chỉ hỏi khi đầu vào chưa đủ
- Liên quan: `Rule_Gate_89_MessageOnlyWithWork` — việc chung giữa các repo
