---
id: Cons_1
aka: 01-1
name: secrets-in-tree
version: 4
kind: judgment
applies: [App, NonApp]
from: _Store/02_CONSTITUTION/Cons_Core_01_SecretsInTree @v4 #cb0e99ff0cf5
---
# Cons_Core_01_SecretsInTree Bí mật: ngoài git không phải ngoài repo

- File bí mật thật (két, `.env`, khoá, connection string) không bao giờ lên git; được nằm TRONG cây repo khi `.gitignore` chặn. Slot chuẩn: `data/secrets/`.
- Cấm tạo thư mục bí mật NGOÀI cây repo — đó là làm rác cấu trúc, không phải bảo mật thêm.
- Thứ quyết định an toàn là `.gitignore` (và phạm vi đồng bộ), không phải vị trí thư mục. Hiểu "để ngoài git" thành "để ngoài repo" sinh ra thư mục bí mật lạc bên ngoài, và để chìa trong thư mục đang đồng bộ đám mây.
- Ngoại lệ buộc phải nằm ngoài (vd một con trỏ nói dữ liệu ở đâu — để cạnh dữ liệu thì thành vòng luẩn quẩn) ⇒ ghi rõ ngoại lệ ở điều này; ngoại lệ đó KHÔNG được chứa bí mật.

> Điều GỢI Ý: đưa ra một lần lúc dựng repo. Giữ thì nó là điều của hiến pháp repo; không cần thì xoá folder này — `sync` không thêm lại và không sửa điều hiến pháp.
