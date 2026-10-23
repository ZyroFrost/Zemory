---
version: 2
lang: vi
---
# Rule_Gate_89_MessageOnlyWithWork — A message to another repo's session carries work for it, or answers it

## Luật là gì
Agent của repo khác đang làm dở việc của nó. Một tin nhắn từ phiên này cắt ngang việc đó, nên chỉ nhắn khi bên nhận có
việc phải làm với tin, hoặc khi tin trả lời đúng điều bên nhận đã hỏi. Tin báo tình hình mà bên nhận không có phần thì
không gửi.

## Khi nào áp
- Gửi tin cho phiên của một repo khác (`SendMessage` tới một phiên ngang hàng trên máy).

## Phải làm gì
1. Bên nhận phải làm gì đó ⇒ dòng ĐẦU nêu việc: `Cần <repo>: <việc>` (hoặc `Need <repo>: <task>`), chi tiết ở dưới.
2. Bên nhận đã nhờ phiên này ⇒ trả lời nó (qua địa chỉ `from` của tin nó gửi, hoặc theo tên); chỉ nói điều nó cần: đã
   xong, bị chặn và vì sao, hoặc nó phải làm gì tiếp.
3. Tin chỉ liên quan gián tiếp tới bên nhận (việc của repo khác, tiến độ của phiên này, một trạng thái nó không làm gì
   được) ⇒ không gửi; báo trong phiên này.
4. Nhiều repo cùng dính ⇒ mỗi repo chỉ được nhắn về đúng phần của nó.

## Ví dụ
- Tình huống: HS đỏ test vì một phần do một phòng viết; hai phòng khác đang chờ phần của mình được sync.
- ✗ Sai: nhắn hai phòng đang chờ rằng HS đỏ vì phòng thứ ba — họ không làm gì được, và cả hai bị cắt ngang giữa việc.
- ✓ Đúng: báo trong phiên này; nhắn phòng đã viết phần đó `Cần <repo>: <việc phải sửa>`; chỉ báo hai phòng kia khi phần của chính
  họ đã sync.

## Máy kiểm
- Chốt gửi tin (`zemory hook send-guard`, PreToolUse trên `SendMessage`, cài theo máy bằng `zemory hook install`) chặn tin
  tới một phiên ngang hàng trên máy, trừ khi: trả lời qua địa chỉ `uds:` · bên nhận đã từng nhắn phiên này (tên nó hiện là
  người gửi một tin chéo phiên trong transcript của phiên này) · dòng đầu khớp `Cần <repo>: <việc>` / `Need <repo>:
  <task>` · tin không có chữ (chỉ đăng ký báo rảnh).
