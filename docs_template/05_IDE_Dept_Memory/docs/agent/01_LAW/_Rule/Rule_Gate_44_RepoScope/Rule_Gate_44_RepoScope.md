---
id: Rule_44
aka: 02-44
name: repo-scope
version: 5
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_44_RepoScope @v5 #0f6f986fe907
---
# Rule_Gate_44_RepoScope Chỉ ghi trong dự án đang mở

- Ghi · sửa · chạy lệnh có ghi chỉ đụng thư mục dự án đang mở.
- Dự án khác: đọc tham khảo được; mọi thao tác ghi cấm mặc định.
- Cần đụng dự án khác ⇒ dừng, hỏi trước, nêu làm gì · ở đâu · vì sao; chỉ làm khi được chấp thuận trong phiên. Nơi khác có thể đang có phiên khác làm việc.
- Cấm áp cả khi ý định là giúp · cứu dữ liệu · tiện tay sửa luôn.
- Đứng trong repo tham khảo ⇒ không chạy lệnh ghi theo cwd (`zemory init` · `sync` · `reindex` · `archive` · `memory scan`). Lấy chuẩn ⇒ đọc `docs_template/`, rồi chạy lệnh ở repo của mình.
- Ra ngoài dự án còn gồm: ghi ra đường tuyệt đối ngoài repo · SQL bắt máy chủ ghi file hoặc đổi cấu hình máy chủ · lệnh tạo · xoá · đổi chạy trên máy khác. Lệnh chỉ đọc cho qua.
- Phép kiểm: guard chặn bốn nhóm trên (cờ `.allow-outside`) và lệnh `zemory` có ghi ở cwd khác. Guard không thấy đường dựng lúc chạy hay nằm trong script ⇒ luật chữ là tầng quyết định. Cơ chế và danh sách miễn: tài liệu guard ở `02_STRUCTURE/_Host/IDE`.

## Ví dụ

- Tình huống: đang làm ở một repo, agent thấy repo bên cạnh có sổ sách lệch chuẩn.
- ✗ Sai: chạy lệnh đồng bộ chuẩn hoặc sửa file ở repo bên cạnh "cho tiện".
- ✓ Đúng: chỉ thao tác trong dự án đang mở; điều thấy ở repo kia thì báo lại, chưa được cho phép thì không ghi gì sang đó.
