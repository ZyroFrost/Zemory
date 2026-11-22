---
version: 12
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
1. Commit cục bộ theo phong cách commit của repo; không cần xin, và không để việc xong nằm chờ một câu hỏi: chỉ xoá mới hỏi.
   Cuối mỗi lượt hook tự commit cục bộ các file chưa commit của phiên, nhỏ mấy cũng commit (chỉ các file phiên đã ghi, cộng bản
   sao trong các bộ của linh kiện kho mà phiên đã ghi, đi qua phép kiểm pre-commit, không bao giờ push).
2. Chỉ push khi lời yêu cầu có lệnh push. Xong việc ⇒ chạy phép kiểm, báo, dừng. Một lệnh push phủ cả đợt đang làm: các bản vá kế
   tiếp của cùng đợt push luôn, không hỏi lại.
3. Ghi changelog · commit · "xong rồi" không phải lệnh push. Push không phải cách để bản sửa có hiệu lực trên máy đang chạy: build
   lại là đủ.
4. Chưa hỏi trước ⇒ không force-push · không viết lại lịch sử đã push · không xoá tag hay nhánh trên remote · không `reset --hard`
   hay `clean` lên việc chưa commit.
5. Ở repo khác, chỉ commit đúng đường phiên này đã ghi (`git commit --only <đường>`); phần phiên của repo đó đang sửa để cho nó.
6. Một đợt việc = một số version, push một lần khi đợt đã kiểm xong; bản vá giữa đợt không phải một lần phát hành riêng.

## Ví dụ
- Tình huống: agent sửa xong một lỗi tính tổng trong báo cáo, test xanh, người dùng bảo ghi sổ rồi commit.
- ✗ Sai: commit rồi tự đẩy lên remote vì "xong rồi thì đẩy".
- ✓ Đúng: ghi sổ, commit cục bộ, báo kết quả, dừng; chỉ đẩy khi có lệnh push.

## Máy kiểm
- Guard chặn `git push` chưa có lệnh và nhóm lệnh phá lịch sử (cờ `discard`).
- Bộ Basic (không có guard): quyền gốc của host lấy từ `gate.json › native` — `git push` thì hỏi, force-push thì chặn.
- Hook cuối lượt tự commit cục bộ các file của phiên hễ khác HEAD, và báo một dòng. Linh kiện kho HS phiên đã ghi kéo theo bản
  sao của nó trong mọi bộ (`docs/agent/…` · `.claude/skills/<name>` · các file `installs`): lệnh ráp ghi chúng qua shell nên
  transcript không nêu tên (11/11: một linh kiện được commit mà sót bản sao bộ 09).
