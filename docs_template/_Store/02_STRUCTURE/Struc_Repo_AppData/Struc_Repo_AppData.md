---
id: Struc_Repo_AppData
name: repo-app-data
version: 7
profile: non-app
label: APP-DATA
intro: : repo giữ cơ sở dữ liệu dùng chung của các app trong một hệ — mô hình, script đổi cấu trúc; không chứa app
ask: ; repo chỉ giữ cơ sở dữ liệu cho các app khác dùng là APP-DATA
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
installs: [bin/_python.cmd, config/runtime.json]
---
# Struc_Repo_AppData

The structure standard of an app-data repo: every slot of `Struc_Repo_NonApp` (declares `extends`). Its own slots are measured when the first repo is assembled.
By default one database is shared by the whole app system ⇒ a flat `models/` (`Models_112_Models`); `Models_142_Database` is an optional slot,
only when the repo manages two databases or more.

## Role

- Belongs to: a repo following `Struc_Repo_SystemManager` (`owner` required).
- Provides: `app-data` for the apps of the system.

## Python

- `config/runtime.json` declares the ONE Python version the repo runs (`{"python": "3.12.10"}`); `bin/_python.cmd` resolves
  `<data root>\Software\Dev\Python\<version>\App\python.exe` on the drive holding `_ConfigVault` (slot `Software_149_Program`).
  Both are installed by this template, byte-equal to the copy every other repo template installs.
- Every launcher and script runs Python through it — `call "%~dp0_python.cmd" || exit /b 3` then `"%PY%"`, or
  `bin\_python.cmd scripts\x.py` — never a bare `python` from PATH, never `py`, never `.venv\Scripts\python.exe`.
- `.venv/` (slot `Venv_108_Venv`) is the reserve of a repo cut off from the system, never used by a repo that runs inside it.
- A repo that needs another version changes the number in its own `runtime.json`; sync keeps that edit and reports it.
