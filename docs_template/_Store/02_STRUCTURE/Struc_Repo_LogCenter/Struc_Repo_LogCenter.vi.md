---
version: 3
lang: vi
---
# Struc_Repo_LogCenter

Chuẩn cấu trúc của repo nhật ký chung: mọi slot của `Struc_Repo_NonApp` (khai `extends`). Slot riêng đo khi ráp repo đầu tiên.

## Vai

- Cung cấp: `log` cho mọi repo của cụm; trong mảng log (khuôn, nơi ghi) repo này quyết.
- Không quản và không thuộc quyền repo nào.

## Python

- `config/runtime.json` khai ĐÚNG MỘT bản Python repo chạy (`{"python": "3.12.10"}`); `bin/_python.cmd` tìm
  `<gốc dữ liệu>\Software\Dev\Python\<bản>\App\python.exe` trên ổ chứa `_ConfigVault` (slot `Software_149_Program`). Cả hai do
  khuôn này cài, giống từng byte với bản mọi khuôn repo khác cài.
- Mọi launcher và script chạy Python qua nó — `call "%~dp0_python.cmd" || exit /b 3` rồi `"%PY%"`, hoặc
  `bin\_python.cmd scripts\x.py` — không bao giờ gọi `python` trơn trên PATH, không `py`, không `.venv\Scripts\python.exe`.
- `.venv/` (slot `Venv_108_Venv`) là slot dự phòng của repo bị tách khỏi hệ thống, repo chạy trong hệ thống không dùng.
- Repo cần bản khác thì đổi số trong `runtime.json` của chính nó; sync giữ chỗ sửa đó và báo lại.
