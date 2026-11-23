---
frame: Cons_Gate_10_ReadOnlySources
status: written
---
# Nguồn ngoài chỉ đọc

## Nguồn

| Nguồn | Loại | Server | Cách đọc được phép |
|---|---|---|---|
| Transcript của host (Claude Code · Codex · Continue · LM Studio · Copilot · Gemini) | thư mục | — | chỉ đọc file, đọc nối dần (điều 10); không sửa, không xoá file của host |
| Web chat (ChatGPT · Claude web · Copilot) | API | — | chỉ GET bằng phiên người dùng đã đăng nhập trong cửa sổ trình duyệt riêng; không nhập mật khẩu (điều 7) |
| Docs và mã của các repo đã đăng ký | thư mục | — | chỉ đọc để dựng chỉ mục và graph (điều 3, điều 13) |
| Thư mục kênh chung trên Drive | thư mục | — | đọc khối của máy khác để nối vào GM (điều 16) |
| Máy chủ dò toàn cầu (giao thức Syncthing) | API | — | chỉ đăng và tra địa chỉ máy; không gửi byte dữ liệu nào (điều 7) |

## Ngoại lệ ghi
- Thư mục kênh chung trên Drive: chỉ NỐI THÊM khối đã mã hoá của chính máy này vào khúc cuối (điều 16). Chủ: người dùng.
- Repo đã đăng ký: `zemory init` · `zemory sync --standard` ghi harness (`docs/agent/`, `AGENTS.md`, hook trong `.claude/settings.json`)
  chỉ khi người dùng ra lệnh cho đúng repo đó. Chủ: người dùng của repo.
