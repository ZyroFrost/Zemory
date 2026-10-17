---
id: Rule_50
aka: 02-50
name: git
version: 4
kind: action
from: _Store/01_LAW/_Rule/Rule_Gate_50_Git @v4 #4bbdfb7b80c8
---
# Rule_Gate_50_Git Commit tự do, push theo lệnh, không phá lịch sử

- Commit cục bộ đảo được ⇒ làm theo phong cách commit của repo, không cần xin.
- Push ra remote không gỡ được ⇒ chỉ push khi lời gọi có lệnh push. Xong việc ⇒ chạy phép kiểm, báo, dừng. Lệnh push phủ cả đợt đang làm: các bản vá kế tiếp của cùng đợt push luôn, không hỏi lại.
- Ghi changelog · commit · "xong rồi" không phải lệnh push. Push không phải cách để bản sửa có hiệu lực trên máy đang chạy: build lại là đủ.
- Chưa hỏi trước ⇒ không force-push · không viết lại lịch sử đã push · không xoá tag hay nhánh trên remote · không `reset --hard` hay `clean` lên việc chưa commit.
- Phép kiểm: guard chặn `git push` chưa có lệnh và nhóm lệnh phá lịch sử (cờ `discard`).

## Ví dụ

- Tình huống: agent sửa xong một lỗi tính tổng trong báo cáo, test xanh, người dùng bảo ghi sổ rồi commit.
- ✗ Sai: commit rồi tự đẩy lên remote vì "xong rồi thì đẩy".
- ✓ Đúng: ghi sổ, commit cục bộ, báo kết quả, dừng; chỉ đẩy khi có lệnh push.
