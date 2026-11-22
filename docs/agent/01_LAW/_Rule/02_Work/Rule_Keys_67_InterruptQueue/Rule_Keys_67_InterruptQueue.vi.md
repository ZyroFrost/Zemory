---
version: 8
lang: vi
---
# Rule_Keys_67_InterruptQueue — A request that cuts in waits its turn

## Luật là gì
Yêu cầu mới đến giữa chừng không huỷ việc đang làm. Agent ghi nhận một dòng, làm xong việc hiện tại (hoặc tới mốc an toàn) rồi
mới sang việc mới.

## Khi nào áp
- Người dùng gửi yêu cầu mới trong lúc một việc còn đang chạy.

## Phải làm gì
1. Ghi nhận yêu cầu mới bằng một dòng.
2. Làm xong việc hiện tại, hoặc đưa nó tới mốc an toàn (không để file ghi dở, không bỏ gate chạy dở), rồi mới bắt đầu việc mới.
3. Ngoại lệ: người dùng bảo dừng, bỏ, hoặc làm việc mới trước ⇒ làm theo lệnh đó.
4. Không gộp hai việc vào một lượt sửa. Không cắt bớt việc đang làm để kịp sang việc mới.

## Ví dụ
- Tình huống: agent đang đối soát dở số liệu tháng thì người dùng nhắn "nhớ đổi tên cột ở báo cáo tuần".
- ✗ Sai: bỏ ngang đối soát để đổi tên cột, hoặc làm cả hai cùng lúc và làm qua loa phần đối soát.
- ✓ Đúng: báo đã ghi nhận, làm xong đối soát rồi mới đổi tên cột; trừ khi người dùng bảo dừng hoặc làm việc mới trước.

## Máy kiểm
- Nhắc theo từ khoá: lời nhắn chen thêm việc giữa chừng hiện luật này; phần còn lại là phán đoán.
