---
version: 5
lang: vi
---
# Struc_Repo_AppData

Chuẩn cấu trúc của repo dữ liệu app: mọi slot của `Struc_Repo_NonApp` (khai `extends`). Slot riêng đo khi ráp repo đầu tiên.
Mặc định một cơ sở dữ liệu chung cho cả hệ app ⇒ `models/` phẳng (`Models_112_Models`); `Models_142_Database` là slot tuỳ chọn,
chỉ khi repo quản từ hai cơ sở dữ liệu trở lên.

## Vai

- Thuộc quyền: repo theo `Struc_Repo_SystemManager` (`owner` bắt buộc).
- Cung cấp: `app-data` cho các app của hệ.

## Python

- `config/runtime.json` khai ĐÚNG MỘT bản Python repo chạy (`{"python": "3.12.10"}`); `bin/_python.cmd` tìm
  `<gốc dữ liệu>\Software\Dev\Python\<bản>\App\python.exe` trên ổ chứa `_ConfigVault` (slot `Software_149_Program`). Cả hai do
  khuôn này cài, giống từng byte với bản mọi khuôn repo khác cài.
- Mọi launcher và script chạy Python qua nó — `call "%~dp0_python.cmd" || exit /b 3` rồi `"%PY%"`, hoặc
  `bin\_python.cmd scripts\x.py` — không bao giờ gọi `python` trơn trên PATH, không `py`, không `.venv\Scripts\python.exe`.
- `.venv/` (slot `Venv_108_Venv`) là slot dự phòng của repo bị tách khỏi hệ thống, repo chạy trong hệ thống không dùng.
- Repo cần bản khác thì đổi số trong `runtime.json` của chính nó; sync giữ chỗ sửa đó và báo lại.
