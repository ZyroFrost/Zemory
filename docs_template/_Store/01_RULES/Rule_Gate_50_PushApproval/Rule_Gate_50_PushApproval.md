---
id: Rule_50
aka: 02-50
name: push-approval
version: 3
kind: action
---
# Rule_Gate_50_PushApproval Không `git push` khi chưa được cho phép

- Git remote là nguồn backup cuối cùng của dự án. Đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá).
- Chưa có cho phép push trong phiên ⇒ không `git push`.
- Xong việc ⇒ chạy các phép kiểm của repo (build + test khi repo có) · báo cáo · dừng. Chỉ đẩy khi lời gọi chứa lệnh push, ví dụ "push" hoặc "lên git".
- Lệnh push phủ cả đợt đang làm: đã có lệnh push trong đợt này thì các bản vá kế tiếp của cùng đợt được push luôn, không hỏi lại từng lần: hỏi lại giữa một đợt cần push liên tục là bắt trả lời cùng một câu nhiều lần.
- Phép kiểm: cổng `guard`.

## Ví dụ

- Tình huống: agent sửa xong một lỗi tính tổng trong báo cáo, test xanh.
- ✗ Sai: commit rồi tự đẩy lên remote vì "xong rồi thì đẩy".
- ✓ Đúng: chạy kiểm tra, báo kết quả, dừng; chỉ đẩy khi có lệnh push. Đã có lệnh push cho đợt này thì các bản vá kế tiếp trong cùng đợt đẩy luôn, không hỏi lại.
