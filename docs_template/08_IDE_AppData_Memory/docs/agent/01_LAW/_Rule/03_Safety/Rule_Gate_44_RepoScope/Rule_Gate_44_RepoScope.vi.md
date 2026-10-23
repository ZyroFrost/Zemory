---
version: 8
lang: vi
---
# Rule_Gate_44_RepoScope — Write only inside the open project

## Luật là gì
Ghi, sửa và chạy lệnh có ghi chỉ đụng thư mục của dự án đang mở. Dự án khác đọc được; ghi vào thì cấm, trừ khi người dùng cho phép
trong phiên này.

## Khi nào áp
- Sắp ghi, sửa hay chạy lệnh có ghi.
- Đang đứng trong một repo chỉ để tham khảo.
- Sắp làm việc giùm một repo khác.

## Phải làm gì
1. Chỉ ở trong thư mục của dự án đang mở.
2. Dự án khác: đọc tham khảo được; mọi thao tác ghi cấm mặc định. Cần đụng ⇒ dừng, hỏi trước, nêu làm gì · ở đâu · vì sao; chỉ làm
   khi được chấp thuận trong phiên. Nơi khác có thể đang có phiên khác làm việc.
3. Cấm cả khi ý định là giúp, cứu dữ liệu, hay tiện tay sửa luôn.
4. Đứng trong repo tham khảo ⇒ không chạy lệnh ghi theo thư mục làm việc (`zemory init` · `sync` · `reindex` · `archive` ·
   `memory scan`). Muốn lấy chuẩn ⇒ đọc `docs_template/`, rồi chạy lệnh ở repo của mình.
5. Làm việc giùm repo khác (sửa mã, chạy việc), khi đã được cho phép, không đụng harness của repo đó
   (`Rule_Gate_83_HarnessFromStore`).
6. Ra ngoài dự án còn gồm: ghi ra đường tuyệt đối ngoài repo · SQL bắt máy chủ ghi file hay đổi cấu hình máy chủ · lệnh tạo · xoá
   · đổi chạy trên máy khác. Lệnh chỉ đọc cho qua.

## Ví dụ
- Tình huống: đang làm ở một repo, agent thấy repo bên cạnh có sổ sách lệch chuẩn.
- ✗ Sai: chạy lệnh đồng bộ chuẩn hoặc sửa file ở repo bên cạnh "cho tiện".
- ✓ Đúng: chỉ thao tác trong dự án đang mở; điều thấy ở repo kia thì báo lại; chưa được cho phép thì không ghi gì sang đó.

## Máy kiểm
- Guard chặn bốn nhóm trên (cờ `.allow-outside`) và lệnh `zemory` có ghi chạy từ thư mục làm việc khác.
- Guard không thấy đường dựng lúc chạy hay nằm trong script ⇒ chữ của luật là tầng quyết định. Cơ chế và danh sách miễn: ghi chú
  guard ở `02_STRUCTURE/_Host/IDE`.
