---
version: 8
lang: vi
---
# Rule_Gate_50_Git — Commit freely, push on command, never break history

## Luật là gì
Commit cục bộ đảo được nên agent commit không cần xin. Push không gỡ được nên chỉ làm khi người dùng ra lệnh. Lịch sử không bao giờ
bị viết lại hay phá khi chưa hỏi trước.

## Khi nào áp
- Việc xong, sẵn sàng commit.
- Sắp push, force-push, viết lại lịch sử, xoá tag hay nhánh trên remote, hoặc bỏ việc chưa commit.

## Phải làm gì
1. Commit cục bộ theo phong cách commit của repo; không cần xin. Việc chưa commit của phiên vượt 300 dòng thì hook cuối lượt tự
   commit cục bộ (chỉ các file phiên đã ghi, đi qua phép kiểm pre-commit, không bao giờ push).
2. Chỉ push khi lời yêu cầu có lệnh push. Xong việc ⇒ chạy phép kiểm, báo, dừng. Một lệnh push phủ cả đợt đang làm: các bản vá kế
   tiếp của cùng đợt push luôn, không hỏi lại.
3. Ghi changelog · commit · "xong rồi" không phải lệnh push. Push không phải cách để bản sửa có hiệu lực trên máy đang chạy: build
   lại là đủ.
4. Chưa hỏi trước ⇒ không force-push · không viết lại lịch sử đã push · không xoá tag hay nhánh trên remote · không `reset --hard`
   hay `clean` lên việc chưa commit.

## Ví dụ
- Tình huống: agent sửa xong một lỗi tính tổng trong báo cáo, test xanh, người dùng bảo ghi sổ rồi commit.
- ✗ Sai: commit rồi tự đẩy lên remote vì "xong rồi thì đẩy".
- ✓ Đúng: ghi sổ, commit cục bộ, báo kết quả, dừng; chỉ đẩy khi có lệnh push.

## Máy kiểm
- Guard chặn `git push` chưa có lệnh và nhóm lệnh phá lịch sử (cờ `discard`).
- Hook cuối lượt tự commit cục bộ các file của phiên khi số dòng chưa commit vượt 300, và báo một dòng.
