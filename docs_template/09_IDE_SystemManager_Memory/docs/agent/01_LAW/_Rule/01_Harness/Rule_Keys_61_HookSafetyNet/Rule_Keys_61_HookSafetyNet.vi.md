---
version: 8
lang: vi
---
# Rule_Keys_61_HookSafetyNet — A hook is a safety net, not the one who decides

## Luật là gì
Chữ của luật là tầng quyết định; hook chỉ đỡ những gì lọt. Hook cho qua không có nghĩa là được phép, và hook chặn không phải câu
đố để tìm đường vòng.

## Khi nào áp
- Một hook cho qua hoặc chặn một thao tác.
- Sắp tạo một cờ dùng một lần `.allow-*`.

## Phải làm gì
1. Hook cho qua ≠ được phép: thao tác không đảo được vẫn phải được người dùng cho phép trước.
2. Bị chặn ⇒ hỏi người dùng; không tìm cách khác mà hook không thấy.
3. Một cờ `.allow-*` cho qua đúng một việc đã duyệt: chỉ tạo sau khi người dùng cho phép rõ trong phiên này, và không dùng lại cho
   việc khác. Nhóm bí mật không có cờ.

## Ví dụ
- Tình huống: agent muốn xoá một bảng tạm; lệnh xoá đầu tiên bị chặn, một cách khác thì không.
- ✗ Sai: đổi sang cách không bị chặn rồi xoá, hoặc tự tạo cờ cho qua.
- ✓ Đúng: hỏi người dùng trước, dù hook có chặn hay không; được đồng ý mới tạo cờ cho đúng lệnh đó.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu nói tới vòng qua hook hay tạo cờ thì hiện luật này. Máy không đọc được ý định; phần còn lại agent
  tự giữ.
