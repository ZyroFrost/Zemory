---
version: 9
lang: vi
---
# Struc_Repo_App

Chuẩn cấu trúc của một repo hệ APP: repo làm và bảo trì một app có code chạy (UI · server · CLI). Cấu trúc này là cách
ghép các slot trong `structure.json`; slot nằm ở `_Slot/` và không mang hệ nào.

## Python

- `config/runtime.json` khai ĐÚNG MỘT bản Python repo chạy (`{"python": "3.12.10"}`); `bin/_python.cmd` tìm
  `<gốc dữ liệu>\Software\Dev\Python\<bản>\App\python.exe` trên ổ chứa `_ConfigVault` (slot `Software_149_Program`). Cả hai do
  khuôn này cài, giống từng byte với bản mọi khuôn repo khác cài.
- Mọi launcher và script chạy Python qua nó — `call "%~dp0_python.cmd" || exit /b 3` rồi `"%PY%"`, hoặc
  `bin\_python.cmd scripts\x.py` — không bao giờ gọi `python` trơn trên PATH, không `py`, không `.venv\Scripts\python.exe`.
- Backend của app chạy trên cùng bản dùng chung: launcher đặt `PYTHONPATH` về thư mục backend rồi chạy `"%PY%" -m <gói>`; app
  không bao giờ được cài vào bản dùng chung (`pip install -e`), thư viện của nó nằm trong danh sách ghim của bản đó. Trên server
  Linux cùng cây đó nằm dưới `/opt`: `/opt/Software/Dev/Python/<bản>/App/bin/python3`.
- `.venv/` (slot `Venv_108_Venv`) là slot dự phòng của repo bị tách khỏi hệ thống, repo chạy trong hệ thống không dùng.
- Repo cần bản khác thì đổi số trong `runtime.json` của chính nó; sync giữ chỗ sửa đó và báo lại.
