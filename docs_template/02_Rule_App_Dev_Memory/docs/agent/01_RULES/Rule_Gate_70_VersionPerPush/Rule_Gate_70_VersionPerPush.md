---
id: Rule_70
aka: 02-70
name: version-per-push
version: 4
kind: action
applies: [App]
from: _Store/01_RULES/Rule_Gate_70_VersionPerPush @v4 #2624deb51046
---
# Rule_Gate_70_VersionPerPush Mỗi lần push = một lần lên version

- Push là mốc phát hành. Trước khi đẩy:
  1. kiểm file sạch: chạy gate/lint chạy được; `git status` không lọt data hay secret; rà `05_TODO` còn gì phải đóng;
  2. chọn số theo bảng ba cột dưới đây — agent tự quyết số;
  3. bump `package.json` + commit + push trong cùng một mốc.
- Chọn cột theo việc được yêu cầu (sửa lỗi · thêm tính năng · đổi cấu trúc), không theo lượng mã đã đổi:

  | cột | khi nào |
  |---|---|
  | **1** (major) | đụng CẤU TRÚC, hoặc thêm một tính năng RẤT LỚN |
  | **2** (minor) | THÊM hoặc bổ sung một tính năng |
  | **3** (patch) | SỬA LỖI của tính năng đang có |

- Số mới lớn hơn số đang chạy ở nơi phát hành thật: đọc số đó trước khi đặt; không đọc được ⇒ hỏi, không cộng theo trí nhớ.
- KHÔNG push với số cũ. Mỗi lần đẩy một bản vá là một số mới, không bao giờ trùng: hai bản vá đẩy trong cùng một ngày là hai số. Lý do: số version là thứ máy khác dùng để quyết định có cập nhật hay không; hai commit khác nhau cùng một số ⇒ máy đã ở số đó không thấy bản mới, trong khi bản nó chạy còn lỗi.
- Ngoại lệ: đợt CHỈ đụng docs ⇒ đẩy thẳng, KHÔNG bump. Luật mỗi lần push = một lần lên version viết cho đợt có BẢN BUILD đi kèm; docs không sinh artifact, bản build y hệt, và semver chỉ định nghĩa `minor` = tính năng · `patch` = fix deploy, docs không rơi vào ô nào; bump lúc đó báo cho máy kia là có bản mới trong khi không có, làm nhiễu đúng tín hiệu cập nhật. Đụng tới `backend/` · `frontend/` · `package.json` ⇒ quay về bảng ba cột.
- Vẫn phải HỎI trước: force-push · xoá tag hoặc nhánh trên remote.
- Phép kiểm: cổng `guard`.
